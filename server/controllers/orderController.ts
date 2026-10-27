import { randomUUID } from "node:crypto";
import type { Request, Response } from "express";
import { prisma } from "../config/prisma.js";
import { emailQueue } from "../bullmq/emailQueue.js";
import { scheduleRiderAssignment } from "../bullmq/riderAssignment.js";

const db = prisma as any;

export const createOrder = async (req: Request, res: Response) => {
  const { items, shippingAddress, paymentMethod } = req.body ?? {};
  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ message: "no order items" });
  }
  if (!items.every((item) => typeof item?.product === "string" && Number.isInteger(item.quantity) && item.quantity > 0)) {
    return res.status(400).json({ message: "invalid order items" });
  }
  if (!shippingAddress || typeof shippingAddress !== "object" || typeof paymentMethod !== "string" || !paymentMethod.trim()) {
    return res.status(400).json({ message: "shipping address and payment method are required" });
  }

  const quantities = new Map<string, number>();
  for (const item of items) quantities.set(item.product, (quantities.get(item.product) ?? 0) + item.quantity);

  const orderResult = await db.$transaction(async (tx: any) => {
    const products = await tx.product.findMany({ where: { id: { in: [...quantities.keys()] } } });
    const productById = new Map(products.map((product: any) => [product.id, product]));
    for (const [productId, quantity] of quantities) {
      const product = productById.get(productId) as any;
      if (!product || (product.stock ?? 0) < quantity) return null;
    }

    const orderItems = [...quantities].map(([productId, quantity]) => {
      const product = productById.get(productId) as any;
      return { product: product.id, name: product.name, image: product.image, price: product.price, quantity, unit: product.unit };
    });
    const subtotal = orderItems.reduce((sum, item) => sum + (item.price ?? 0) * item.quantity, 0);
    const deliveryFee = subtotal > 2000 ? 0 : 49;
    const tax = Math.round(subtotal * 0.08 * 100) / 100;
    const total = Math.round((subtotal + deliveryFee + tax) * 100) / 100;

    const stockUpdates: { productId: string; productName: string; stockQuantity: number }[] = [];
    for (const [productId, quantity] of quantities) {
      const product = productById.get(productId) as any;
      const result = await tx.product.updateMany({
        where: { id: productId, stock: { gte: quantity } },
        data: { stock: { decrement: quantity } },
      });
      if (result.count !== 1) throw new Error("Product stock changed while placing the order");
      stockUpdates.push({
        productId,
        productName: product.name ?? productId,
        stockQuantity: (product.stock ?? 0) - quantity,
      });
    }

    const createdOrder = await tx.order.create({
      data: {
        id: randomUUID(),
        userId: req.user!.id,
        items: orderItems,
        shippingAddress,
        paymentMethod,
        subtotal,
        deliveryFee,
        tax,
        total,
        statusHistory: [{ status: "Placed", note: "Order placed successfully", timestamp: new Date().toISOString() }],
      },
    });
    return { order: createdOrder, stockUpdates };
  });

  if (!orderResult) return res.status(404).json({ message: "Product out of stock" });

  // Start the delayed assignment only after the order transaction commits.
  await scheduleRiderAssignment(orderResult.order.id).catch((error) => {
    console.error(`Could not schedule rider assignment for order ${orderResult.order.id}:`, error);
    return null;
  });

  const configuredThreshold = Number(process.env.LOW_STOCK_THRESHOLD);
  const lowStockThreshold = Number.isFinite(configuredThreshold) && configuredThreshold >= 0 ? configuredThreshold : 5;
  await Promise.allSettled(orderResult.stockUpdates
    .filter((update: { stockQuantity: number }) => update.stockQuantity <= lowStockThreshold)
    .map((update: { productId: string; productName: string; stockQuantity: number }) =>
      emailQueue.add("low-stock-email", {
        productName: update.productName,
        sku: update.productId,
        stockQuantity: update.stockQuantity,
      }, { jobId: `low-stock-${orderResult.order.id}-${update.productId}` }),
    ));

  return res.status(201).json({ order: orderResult.order });
};

export const getUserOrder = async (req: Request, res: Response) => {
  const where: Record<string, unknown> = { userId: req.user!.id, NOT: [{ paymentMethod: "card", isPaid: false }] };
  if (req.query.status && req.query.status !== "all") where.status = req.query.status;
  const orders = await db.order.findMany({
    where,
    include: { deliveryPartner: { select: { name: true, phone: true } } },
    orderBy: { createdAt: "desc" },
  });
  return res.json(orders);
};

export const getOrder = async (req: Request, res: Response) => {
  const order = await db.order.findFirst({
    where: { id: req.params.id, userId: req.user!.id },
    include: { deliveryPartner: { select: { name: true, phone: true, avatar: true, vehicleType: true } } },
  });
  if (!order) return res.status(404).json({ message: "Order not found" });
  return res.json({ order });
};

export const updateOrderStuatus = async (req: Request, res: Response) => {
  const { status, note } = req.body ?? {};
  if (typeof status !== "string" || !status.trim()) return res.status(400).json({ message: "status is required" });
  const order = await db.order.findUnique({ where: { id: req.params.id } });
  if (!order) return res.status(404).json({ message: "Order not found" });
  const history = Array.isArray(order.statusHistory) ? order.statusHistory : [];
  const updatedOrder = await db.order.update({
    where: { id: req.params.id },
    data: { status, statusHistory: [...history, { status, note: note || `Order ${status.toLowerCase()}`, timestamp: new Date().toISOString() }] },
  });
  return res.json({ order: updatedOrder });
};

export const getAllOrders = async (_req: Request, res: Response) => {
  const orders = await db.order.findMany({
    where: { NOT: [{ paymentMethod: "card", isPaid: false }] },
    include: { user: { select: { name: true, email: true } }, deliveryPartner: { select: { name: true, phone: true, email: true } } },
    orderBy: { createdAt: "desc" },
  });
  return res.json({ orders });
};

export const getOrderLocation = async (req: Request, res: Response) => {
  const order = await db.order.findFirst({
    where: { id: req.params.id, userId: req.user!.id },
    select: { liveLocation: true, status: true },
  });
  if (!order) return res.status(404).json({ message: "Order not found" });
  return res.json({ liveLocation: order.liveLocation, status: order.status });
};
