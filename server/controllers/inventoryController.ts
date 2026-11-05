import type { Request, Response } from "express";
import { prisma } from "../config/prisma.js";
import type { Prisma } from "../generated/prisma/client.js";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const defaultThreshold = () => {
  const value = Number(process.env.LOW_STOCK_THRESHOLD);
  return Number.isInteger(value) && value >= 0 ? value : 5;
};

export const listInventory = async (req: Request, res: Response) => {
  const threshold = req.query.threshold === undefined ? defaultThreshold() : Number(req.query.threshold);
  const page = req.query.page === undefined ? 1 : Number(req.query.page);
  const limit = req.query.limit === undefined ? 25 : Number(req.query.limit);
  const filter = req.query.filter;
  const search = req.query.search;
  if (!Number.isInteger(threshold) || threshold < 0 || threshold > 1_000_000 || !Number.isInteger(page) || page < 1 ||
      !Number.isInteger(limit) || limit < 1 || limit > 100 ||
      (filter !== undefined && !["all", "low", "out"].includes(String(filter))) ||
      (search !== undefined && (typeof search !== "string" || search.length > 200))) {
    return res.status(400).json({ message: "Invalid inventory filters" });
  }
  const where: Prisma.ProductWhereInput = {
    ...(typeof search === "string" && search ? { name: { contains: search, mode: "insensitive" } } : {}),
    ...(filter === "low" ? { stock: { gt: 0, lte: threshold } } : {}),
    ...(filter === "out" ? { stock: 0 } : {}),
  };
  const [totalProducts, totalUnits, lowStockProducts, outOfStockProducts, unknownStockProducts, products, total] = await Promise.all([
    prisma.product.count(), prisma.product.aggregate({ _sum: { stock: true } }),
    prisma.product.count({ where: { stock: { gt: 0, lte: threshold } } }),
    prisma.product.count({ where: { stock: 0 } }), prisma.product.count({ where: { stock: null } }),
    prisma.product.findMany({ where, orderBy: [{ name: "asc" }, { id: "asc" }], skip: (page - 1) * limit, take: limit }),
    prisma.product.count({ where }),
  ]);
  return res.json({ products, pagination: { page, limit, total }, overview: {
    totalProducts, totalUnitsInStock: totalUnits._sum.stock ?? 0, lowStockProducts, outOfStockProducts, unknownStockProducts,
  }, threshold });
};

export const adjustInventory = async (req: Request, res: Response) => {
  const productId = String(req.params.productId);
  const { quantity, reason } = req.body ?? {};
  if (!UUID.test(productId)) return res.status(400).json({ message: "Invalid product ID" });
  if (!Number.isSafeInteger(quantity) || quantity === 0 || Math.abs(quantity) > 1_000_000) return res.status(400).json({ message: "Adjustment quantity must be a non-zero integer" });
  if (typeof reason !== "string" || !reason.trim() || reason.trim().length > 500) return res.status(400).json({ message: "A reason is required" });
  try {
    const movement = await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT "id" FROM "Product" WHERE "id" = ${productId}::uuid FOR UPDATE`;
      const product = await tx.product.findUnique({ where: { id: productId } });
      if (!product) return null;
      if (product.stock === null) throw new Error("UNKNOWN_STOCK");
      const after = product.stock + quantity;
      if (after < 0) throw new Error("NEGATIVE_STOCK");
      const changed = await tx.product.updateMany({ where: { id: productId, stock: product.stock }, data: { stock: after } });
      if (changed.count !== 1) throw new Error("STOCK_CONFLICT");
      return tx.inventoryMovement.create({ data: {
        productId, movementType: "MANUAL_ADJUSTMENT", quantityChange: quantity,
        stockBefore: product.stock, stockAfter: after, reason: reason.trim(), adminActorId: req.user!.id,
      } });
    }, { isolationLevel: "Serializable" });
    if (!movement) return res.status(404).json({ message: "Product not found" });
    return res.status(201).json({ movement });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message === "NEGATIVE_STOCK") return res.status(409).json({ message: "Adjustment would make stock negative" });
    if (message === "UNKNOWN_STOCK") return res.status(409).json({ message: "Stock is unknown; set a known stock value before adjusting" });
    if (message === "STOCK_CONFLICT" || (error && typeof error === "object" && "code" in error && error.code === "P2034")) return res.status(409).json({ message: "Stock changed concurrently; please retry" });
    throw error;
  }
};

export const getInventoryHistory = async (req: Request, res: Response) => {
  const productId = String(req.params.productId);
  const page = req.query.page === undefined ? 1 : Number(req.query.page);
  const limit = req.query.limit === undefined ? 25 : Number(req.query.limit);
  if (!UUID.test(productId) || !Number.isInteger(page) || page < 1 || !Number.isInteger(limit) || limit < 1 || limit > 100) {
    return res.status(400).json({ message: "Invalid product ID or pagination" });
  }
  if (!(await prisma.product.findUnique({ where: { id: productId }, select: { id: true } }))) return res.status(404).json({ message: "Product not found" });
  const [history, total] = await Promise.all([
    prisma.inventoryMovement.findMany({ where: { productId }, include: { adminActor: { select: { id: true, name: true, email: true } } }, orderBy: [{ createdAt: "desc" }, { id: "desc" }], skip: (page - 1) * limit, take: limit }),
    prisma.inventoryMovement.count({ where: { productId } }),
  ]);
  return res.json({ history, pagination: { page, limit, total } });
};
