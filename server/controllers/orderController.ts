import { randomUUID } from "node:crypto";
import type { Request, Response } from "express";
import { prisma } from "../config/prisma.js";
import { emailQueue } from "../bullmq/emailQueue.js";
import { razorpay, razorpayKeyId } from "../config/razorpay.js";
import { verifyAndRecordPayment } from "../services/paymentService.js";
import type { Prisma } from "../generated/prisma/client.js";

const db = prisma;
const ORDER_STATUSES = new Set(["Placed", "Confirmed", "Assigned", "Packed", "Out for Delivery", "Delivered", "Cancelled"]);
const parseShippingAddress = (value: unknown): Prisma.InputJsonObject | null => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const input = value as Record<string, unknown>;
  const allowed = new Set(["_id", "label", "address", "city", "state", "zip", "isDefault", "lat", "lng"]);
  if (Object.keys(input).some((key) => !allowed.has(key))) return null;
  const output: Record<string, unknown> = {};
  for (const key of ["label", "address", "city", "state", "zip"] as const) {
    const field = input[key];
    if (field !== undefined) {
      if (typeof field !== "string" || field.length > (key === "address" ? 300 : 100)) return null;
      output[key] = field.trim();
    }
  }
  if (typeof output.address !== "string" || !output.address) return null;
  if (input.isDefault !== undefined) {
    if (typeof input.isDefault !== "boolean") return null;
    output.isDefault = input.isDefault;
  }
  if (input.lat !== undefined || input.lng !== undefined) {
    if (typeof input.lat !== "number" || !Number.isFinite(input.lat) || input.lat < -90 || input.lat > 90 ||
      typeof input.lng !== "number" || !Number.isFinite(input.lng) || input.lng < -180 || input.lng > 180) return null;
    output.lat = input.lat;
    output.lng = input.lng;
  }
  return output as Prisma.InputJsonObject;
};

export const createOrder = async (req: Request, res: Response) => {
  const { items, shippingAddress, paymentMethod } = req.body ?? {};
  if (!Array.isArray(items) || items.length === 0 || items.length > 100) {
    return res.status(400).json({ message: "no order items" });
  }
  if (!items.every((item) => item && typeof item.product === "string" && item.product.length <= 64 && Number.isInteger(item.quantity) && item.quantity > 0 && item.quantity <= 100)) {
    return res.status(400).json({ message: "invalid order items" });
  }
  const safeShippingAddress = parseShippingAddress(shippingAddress);
  if (!safeShippingAddress || typeof paymentMethod !== "string" || !["cash", "card"].includes(paymentMethod)) {
    return res.status(400).json({ message: "shipping address and payment method are required" });
  }
  if (paymentMethod === "card" && !razorpay) return res.status(503).json({ message: "Online payments are not configured" });

  const quantities = new Map<string, number>();
  for (const item of items) quantities.set(item.product, (quantities.get(item.product) ?? 0) + item.quantity);
  const productIds = [...quantities.keys()];
  const id = randomUUID();
  const initialProducts = await db.product.findMany({ where: { id: { in: productIds } } });
  const initialById = new Map(initialProducts.map((product) => [product.id, product]));
  if (productIds.some((productId) => {
    const product = initialById.get(productId);
    return !product || (product.stock ?? 0) < (quantities.get(productId) ?? 0);
  })) return res.status(404).json({ message: "Product out of stock" });
  const initialItems = productIds.map((productId) => {
    const product = initialById.get(productId)!;
    return { product: product.id, name: product.name, image: product.image, price: product.price, quantity: quantities.get(productId)!, unit: product.unit };
  });
  const subtotal = initialItems.reduce((sum, item) => sum + (item.price ?? 0) * item.quantity, 0);
  const deliveryFee = subtotal > 2000 ? 0 : 49;
  const tax = Math.round(subtotal * 0.08 * 100) / 100;
  const total = Math.round((subtotal + deliveryFee + tax) * 100) / 100;

  // Razorpay is called before opening a database transaction. The transaction
  // below rechecks stock and prices before creating the local order.
  const razorpayOrder = paymentMethod === "card"
    ? await razorpay!.orders.create({ amount: Math.round(total * 100), currency: "INR", receipt: id })
    : null;
  const orderResult = await db.$transaction(async (tx) => {
    const products = await tx.product.findMany({ where: { id: { in: productIds } } });
    const productById = new Map(products.map((product) => [product.id, product]));
    if (productIds.some((productId) => {
      const product = productById.get(productId);
      return !product || (product.stock ?? 0) < (quantities.get(productId) ?? 0);
    })) return null;
    const orderItems = productIds.map((productId) => {
      const product = productById.get(productId)!;
      return { product: product.id, name: product.name, image: product.image, price: product.price, quantity: quantities.get(productId)!, unit: product.unit };
    });
    const currentSubtotal = orderItems.reduce((sum, item) => sum + (item.price ?? 0) * item.quantity, 0);
    const currentDeliveryFee = currentSubtotal > 2000 ? 0 : 49;
    const currentTax = Math.round(currentSubtotal * 0.08 * 100) / 100;
    const currentTotal = Math.round((currentSubtotal + currentDeliveryFee + currentTax) * 100) / 100;
    if (currentTotal !== total) throw new Error("Product prices changed while placing the order; please retry");
    const stockUpdates: { productId: string; productName: string; stockQuantity: number }[] = [];
    for (const productId of productIds) {
      const quantity = quantities.get(productId)!;
      const product = productById.get(productId)!;
      const changed = await tx.product.updateMany({
        where: { id: productId, stock: { gte: quantity } },
        data: { stock: { decrement: quantity } },
      });
      if (changed.count !== 1) throw new Error("Product stock changed while placing the order");
      stockUpdates.push({ productId, productName: product.name ?? productId, stockQuantity: (product.stock ?? 0) - quantity });
    }
    const createdOrder = await tx.order.create({
      data: {
        id, userId: req.user!.id, items: orderItems, shippingAddress: safeShippingAddress, paymentMethod,
        subtotal, deliveryFee, tax, total,
        ...(razorpayOrder ? { razorpayOrderId: razorpayOrder.id } : {}),
        statusHistory: [{ status: "Placed", note: "Order placed successfully", timestamp: new Date().toISOString() }],
      },
    });
    const now = new Date();
    if (paymentMethod === "cash") {
      await tx.outboxEvent.createMany({ data: [
        { dedupeKey: `order:${id}:process`, queue: "order-processing", jobName: "process-order", payload: { orderId: id }, availableAt: now },
        { dedupeKey: `order:${id}:rider`, queue: "rider-assignment", jobName: "auto-assign-rider", payload: { orderId: id }, availableAt: new Date(now.getTime() + 5 * 60 * 1000) },
      ] });
    } else {
      await tx.outboxEvent.create({ data: {
        dedupeKey: `order:${id}:expire`, queue: "order-processing", jobName: "expire-unpaid-order",
        payload: { orderId: id }, availableAt: new Date(now.getTime() + 15 * 60 * 1000),
      } });
    }
    return { order: createdOrder, stockUpdates };
  }, { timeout: 15000 });

  if (!orderResult) return res.status(404).json({ message: "Product out of stock" });

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

  if (paymentMethod === "card") {
    return res.status(201).json({
      order: orderResult.order,
      payment: { id: razorpayOrder!.id, amount: razorpayOrder!.amount, currency: razorpayOrder!.currency, keyId: razorpayKeyId },
    });
  }

  return res.status(201).json({ order: orderResult.order });
};

export const verifyOrderPayment = async (req: Request, res: Response) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body ?? {};
  if (typeof razorpay_order_id !== "string" || typeof razorpay_payment_id !== "string" || typeof razorpay_signature !== "string") {
    return res.status(400).json({ message: "payment details are required" });
  }
  const result = await verifyAndRecordPayment({
    userId: req.user!.id,
    orderId: razorpay_order_id,
    paymentId: razorpay_payment_id,
    signature: razorpay_signature,
  });
  if (result.kind === "not-configured") return res.status(503).json({ message: "Online payments are not configured" });
  if (result.kind === "invalid-signature") return res.status(400).json({ message: "Invalid payment signature" });
  if (result.kind === "gateway-error") return res.status(502).json({ message: "Could not confirm payment with Razorpay; please retry" });
  if (result.kind === "invalid-payment-details") return res.status(400).json({ message: "Razorpay payment details are invalid or payment is not captured" });
  if (result.kind === "not-found") return res.status(404).json({ message: "Order not found" });
  if (result.kind === "wrong-payment-method") return res.status(400).json({ message: "This order does not accept online payment" });
  if (result.kind === "payment-conflict") return res.status(409).json({ message: "Order was already paid with a different payment" });
  if (result.kind === "expired") return res.status(409).json({ message: "Order expired; payment refund is being processed" });
  return res.json({ message: "Payment verified", orderId: result.orderId });
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
    where: { id: String(req.params.id), userId: req.user!.id },
    include: { deliveryPartner: { select: { name: true, phone: true, avatar: true, vehicleType: true } } },
  });
  if (!order) return res.status(404).json({ message: "Order not found" });
  return res.json({ order });
};

export const updateOrderStuatus = async (req: Request, res: Response) => {
  const { status, note } = req.body ?? {};
  if (typeof status !== "string" || !ORDER_STATUSES.has(status) || (note !== undefined && (typeof note !== "string" || note.length > 500))) {
    return res.status(400).json({ message: "Invalid order status or note" });
  }
  const order = await db.order.findUnique({ where: { id: String(req.params.id) } });
  if (!order) return res.status(404).json({ message: "Order not found" });
  const history = Array.isArray(order.statusHistory) ? order.statusHistory : [];
  const updatedOrder = await db.order.update({
    where: { id: String(req.params.id) },
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
    where: { id: String(req.params.id), userId: req.user!.id },
    select: { liveLocation: true, status: true },
  });
  if (!order) return res.status(404).json({ message: "Order not found" });
  return res.json({ liveLocation: order.liveLocation, status: order.status });
};
