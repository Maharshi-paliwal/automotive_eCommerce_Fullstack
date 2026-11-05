import type { Request, Response } from "express";
import { prisma } from "../config/prisma.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { getJwtSecret } from "../config/runtimeConfig.js";
import { updateAssignedRiderLocation } from "../config/socket.js";
import { cancelOrder as cancelOrderWorkflow } from "../services/cancelOrder.js";

const ACTIVE_STATUSES = ["Assigned", "Packed", "Out for Delivery"];
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const generateToken = (id: string) => jwt.sign({ id, role: "delivery" }, getJwtSecret(), { expiresIn: "15d", algorithm: "HS256" });
const hideDeliveryOtp = <T extends { deliveryOtp?: unknown }>(order: T) => {
  const { deliveryOtp: _deliveryOtp, ...safeOrder } = order;
  return safeOrder;
};

export const loginPartner = async (req: Request, res: Response) => {
  const email = typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "";
  const password = req.body?.password;
  if (!emailPattern.test(email) || email.length > 254 || typeof password !== "string" || password.length === 0 || password.length > 1024) {
    return res.status(400).json({ message: "please provide email and password" });
  }
  const partner = await prisma.deliveryPartner.findUnique({ where: { email } });
  if (!partner || !partner.isActive || !partner.password || !(await bcrypt.compare(password, partner.password))) {
    return res.status(401).json({ message: "Invalid email or password" });
  }
  if (bcrypt.getRounds(partner.password) < 12) {
    const upgradedHash = await bcrypt.hash(password, 12);
    await prisma.deliveryPartner.update({ where: { id: partner.id }, data: { password: upgradedHash } });
  }
  const token = generateToken(partner.id);
  const { password: _password, ...partnerData } = partner;
  return res.json({ partner: partnerData, token });
};

export const getMyDeliveries = async (req: Request, res: Response) => {
  const status = req.query.status;
  const where: Record<string, unknown> = { deliveryPartnerId: req.partner!.id };
  if (status === "active") where.status = { in: ACTIVE_STATUSES };
  else if (status === "completed") where.status = { in: ["Delivered", "Cancelled"] };
  const orders = await prisma.order.findMany({
    where,
    include: { user: { select: { name: true, email: true, phone: true } } },
    orderBy: { createdAt: "desc" },
  });
  return res.json({ orders: orders.map(hideDeliveryOtp) });
};

export const getDeliveryDetail = async (req: Request, res: Response) => {
  const orderId = typeof req.params.id === "string" ? req.params.id : "";
  if (!UUID_PATTERN.test(orderId)) return res.status(404).json({ message: "Delivery not found" });
  const order = await prisma.order.findFirst({
    where: { id: orderId, deliveryPartnerId: req.partner!.id },
    include: { user: { select: { name: true, email: true, phone: true } } },
  });
  if (!order) return res.status(404).json({ message: "Delivery not found" });
  return res.json({ order: hideDeliveryOtp(order) });
};

export const completeDelivery = async (req: Request, res: Response) => {
  const orderId = typeof req.params.id === "string" ? req.params.id : "";
  const otp = req.body?.otp;
  if (!UUID_PATTERN.test(orderId) || typeof otp !== "string" || !/^\d{6}$/.test(otp)) {
    return res.status(400).json({ message: "A valid order ID and six-digit OTP are required" });
  }
  const order = await prisma.order.findFirst({ where: { id: orderId, deliveryPartnerId: req.partner!.id } });
  if (!order) return res.status(404).json({ message: "Delivery not found" });
  if (order.status !== "Out for Delivery") return res.status(409).json({ message: "This delivery cannot be completed" });
  if (order.deliveryOtp !== otp) return res.status(400).json({ message: "Invalid OTP" });

  const history = Array.isArray(order.statusHistory) ? order.statusHistory : [];
  const updated = await prisma.order.updateMany({
    where: { id: orderId, deliveryPartnerId: req.partner!.id, status: order.status, deliveryOtp: otp },
    data: {
      status: "Delivered",
      statusHistory: [...history, { status: "Delivered", note: "Delivered by partner", timestamp: new Date().toISOString() }],
      deliveryOtp: "",
    },
  });
  if (updated.count !== 1) return res.status(409).json({ message: "Delivery changed; refresh and try again" });
  const updatedOrder = await prisma.order.findUnique({ where: { id: orderId } });
  return res.json({ order: updatedOrder ? hideDeliveryOtp(updatedOrder) : null, message: "Delivery completed successfully" });
};

export const cancelDelivery = async (req: Request, res: Response) => {
  const orderId = typeof req.params.id === "string" ? req.params.id : "";
  const reason = req.body?.reason;
  if (!UUID_PATTERN.test(orderId) || (reason !== undefined && (typeof reason !== "string" || reason.length > 500))) {
    return res.status(400).json({ message: "Invalid order ID or cancellation reason" });
  }
  const result = await cancelOrderWorkflow({ orderId, reason, deliveryPartnerId: req.partner!.id });
  if (result.kind === "not-found") return res.status(404).json({ message: "Delivery not found" });
  if (result.kind === "conflict") return res.status(409).json({ message: "This delivery cannot be cancelled in its current state" });
  const updatedOrder = hideDeliveryOtp(result.order as { deliveryOtp?: unknown });
  return res.json({ order: updatedOrder, message: "Delivery cancelled" });
};

export const updateDeliveryStatus = async (req: Request, res: Response) => {
  const orderId = typeof req.params.id === "string" ? req.params.id : "";
  const status = req.body?.status;
  if (!UUID_PATTERN.test(orderId) || typeof status !== "string") return res.status(400).json({ message: "Invalid order ID or status" });
  const order = await prisma.order.findFirst({ where: { id: orderId, deliveryPartnerId: req.partner!.id } });
  if (!order) return res.status(404).json({ message: "Delivery not found" });
  const allowedNextStatus = order.status === "Assigned" ? "Packed" : order.status === "Packed" ? "Out for Delivery" : null;
  if (status !== allowedNextStatus) return res.status(400).json({ message: "Invalid delivery status transition" });

  const history = Array.isArray(order.statusHistory) ? order.statusHistory : [];
  const updated = await prisma.order.updateMany({
    where: { id: orderId, deliveryPartnerId: req.partner!.id, status: order.status },
    data: {
      status,
      statusHistory: [...history, { status, note: `Status updated to ${status}`, timestamp: new Date().toISOString() }],
    },
  });
  if (updated.count !== 1) return res.status(409).json({ message: "Delivery changed; refresh and try again" });
  const updatedOrder = await prisma.order.findUnique({ where: { id: orderId } });
  return res.json({ order: updatedOrder ? hideDeliveryOtp(updatedOrder) : null });
};

export const updateLocation = async (req: Request, res: Response) => {
  const orderId = typeof req.params.id === "string" ? req.params.id : "";
  const { lat, lng } = req.body ?? {};
  if (!UUID_PATTERN.test(orderId) || typeof lat !== "number" || !Number.isFinite(lat) || lat < -90 || lat > 90 ||
    typeof lng !== "number" || !Number.isFinite(lng) || lng < -180 || lng > 180) {
    return res.status(400).json({ message: "Valid latitude and longitude are required" });
  }
  const updated = await updateAssignedRiderLocation(orderId, req.partner!.id, lat, lng);
  if (!updated) return res.status(404).json({ message: "Active delivery not found" });
  return res.json({ success: true });
};
