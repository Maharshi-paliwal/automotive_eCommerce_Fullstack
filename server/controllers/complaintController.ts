import { randomUUID } from "node:crypto";
import type { Request, Response } from "express";
import { prisma } from "../config/prisma.js";
import { ComplaintCategory, ComplaintStatus } from "../generated/prisma/enums.js";
import { createAdminNotifications } from "../services/notificationService.js";
import { emitNotificationToUser } from "../config/socket.js";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const IDEMPOTENCY_KEY_PATTERN = /^[a-zA-Z0-9._:-]{8,128}$/;
const MAX_COMPLAINT_OFFSET = 1_000_000;
const categories = new Set<string>(Object.values(ComplaintCategory));
const statuses = new Set<string>(Object.values(ComplaintStatus));
const ALLOWED_TRANSITIONS: Record<ComplaintStatus, ComplaintStatus[]> = {
  OPEN: ["IN_PROGRESS"],
  IN_PROGRESS: ["OPEN", "RESOLVED"],
  RESOLVED: [],
};
const customerComplaintSelect = {
  id: true,
  category: true,
  subject: true,
  description: true,
  status: true,
  createdAt: true,
  updatedAt: true,
} as const;
const adminComplaintSelect = {
  ...customerComplaintSelect,
  user: { select: { name: true } },
} as const;

const parsePagination = (req: Request) => {
  const parsePositiveInteger = (value: unknown, fallback: number) => {
    if (value === undefined) return fallback;
    if (typeof value !== "string" || !/^[0-9]+$/.test(value)) return null;
    const parsed = Number(value);
    return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
  };
  const page = parsePositiveInteger(req.query.page, 1);
  const limit = parsePositiveInteger(req.query.limit, 25);
  if (page === null || limit === null || limit > 100 ||
      (page - 1) * limit > MAX_COMPLAINT_OFFSET) return null;
  return { page, limit };
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === "object" && !Array.isArray(value);

export const createComplaint = async (req: Request, res: Response) => {
  const body = req.body;
  if (!isRecord(body) || Object.keys(body).some((key) => !["category", "subject", "description"].includes(key))) {
    return res.status(400).json({ message: "Invalid complaint fields" });
  }
  if (typeof body.category !== "string" || !categories.has(body.category)) {
    return res.status(400).json({ message: "Invalid complaint category" });
  }
  if (typeof body.subject !== "string" || !body.subject.trim() || body.subject.trim().length > 120) {
    return res.status(400).json({ message: "Subject is required and must be 120 characters or fewer" });
  }
  if (typeof body.description !== "string" || !body.description.trim() || body.description.trim().length > 5000) {
    return res.status(400).json({ message: "Description is required and must be 5000 characters or fewer" });
  }
  const idempotencyKey = req.get("Idempotency-Key");
  if (idempotencyKey === undefined || !IDEMPOTENCY_KEY_PATTERN.test(idempotencyKey)) {
    return res.status(400).json({ message: "Invalid Idempotency-Key header" });
  }

  const category = body.category as typeof ComplaintCategory[keyof typeof ComplaintCategory];
  const subject = body.subject.trim();
  const description = body.description.trim();
  const userId = req.user!.id;
  const complaintId = randomUUID();
  const result = await prisma.$transaction(async (tx) => {
    const created = await tx.complaint.createMany({
      data: [{
        id: complaintId,
        userId,
        category,
        subject,
        description,
        idempotencyKey,
      }],
      skipDuplicates: true,
    });
    const complaint = await tx.complaint.findUnique({
      where: { userId_idempotencyKey: { userId, idempotencyKey } },
      select: customerComplaintSelect,
    });
    if (!complaint) throw new Error("Complaint was not persisted");
    if (complaint.category !== category ||
        complaint.subject !== subject ||
        complaint.description !== description) {
      return { kind: "idempotency-conflict" as const };
    }

    const notifications = await createAdminNotifications({
      type: "CUSTOMER_COMPLAINT",
      title: "New customer complaint",
      message: `A customer submitted a ${complaint.category.toLowerCase()} complaint: ${complaint.subject}`,
      referenceType: "Complaint",
      referenceId: complaint.id,
      idempotencyKey: `customer-complaint:${complaint.id}`,
    }, tx);
    return { kind: "success" as const, complaint, created: created.count === 1, notifications };
  });

  if (result.kind === "idempotency-conflict") {
    return res.status(409).json({ message: "Idempotency-Key was already used with a different complaint" });
  }
  if (result.created) {
    for (const notification of result.notifications) emitNotificationToUser(notification.userId, notification);
  }
  return res.status(result.created ? 201 : 200).json({ complaint: result.complaint });
};

export const listCustomerComplaints = async (req: Request, res: Response) => {
  const pagination = parsePagination(req);
  if (!pagination) return res.status(400).json({ message: "Invalid complaint pagination" });
  const where = { userId: req.user!.id };
  const [complaints, total] = await Promise.all([
    prisma.complaint.findMany({
      where,
      select: customerComplaintSelect,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      skip: (pagination.page - 1) * pagination.limit,
      take: pagination.limit,
    }),
    prisma.complaint.count({ where }),
  ]);
  return res.json({ complaints, pagination: { ...pagination, total } });
};

export const getCustomerComplaint = async (req: Request, res: Response) => {
  const complaintId = String(req.params.complaintId);
  if (!UUID_PATTERN.test(complaintId)) return res.status(404).json({ message: "Complaint not found" });
  const complaint = await prisma.complaint.findFirst({
    where: { id: complaintId, userId: req.user!.id },
    select: customerComplaintSelect,
  });
  if (!complaint) return res.status(404).json({ message: "Complaint not found" });
  return res.json({ complaint });
};

export const listAdminComplaints = async (req: Request, res: Response) => {
  const pagination = parsePagination(req);
  if (!pagination) return res.status(400).json({ message: "Invalid complaint pagination" });
  const status = req.query.status;
  if (status !== undefined && (typeof status !== "string" || !statuses.has(status))) {
    return res.status(400).json({ message: "Invalid complaint status" });
  }
  const where = {
    ...(typeof status === "string" ? { status: status as typeof ComplaintStatus[keyof typeof ComplaintStatus] } : {}),
  };
  const [complaints, total] = await Promise.all([
    prisma.complaint.findMany({
      where,
      select: adminComplaintSelect,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      skip: (pagination.page - 1) * pagination.limit,
      take: pagination.limit,
    }),
    prisma.complaint.count({ where }),
  ]);
  return res.json({ complaints, pagination: { ...pagination, total } });
};

export const getAdminComplaint = async (req: Request, res: Response) => {
  const complaintId = String(req.params.complaintId);
  if (!UUID_PATTERN.test(complaintId)) return res.status(404).json({ message: "Complaint not found" });
  const complaint = await prisma.complaint.findUnique({
    where: { id: complaintId },
    select: adminComplaintSelect,
  });
  if (!complaint) return res.status(404).json({ message: "Complaint not found" });
  return res.json({ complaint });
};

export const updateAdminComplaintStatus = async (req: Request, res: Response) => {
  const complaintId = String(req.params.complaintId);
  if (!UUID_PATTERN.test(complaintId)) return res.status(404).json({ message: "Complaint not found" });
  if (!isRecord(req.body) || Object.keys(req.body).length !== 1 ||
      typeof req.body.status !== "string" || !statuses.has(req.body.status)) {
    return res.status(400).json({ message: "Invalid complaint status" });
  }
  const nextStatus = req.body.status as typeof ComplaintStatus[keyof typeof ComplaintStatus];
  const result = await prisma.$transaction(async (tx) => {
    const current = await tx.complaint.findUnique({
      where: { id: complaintId },
      select: { status: true },
    });
    if (!current) return { kind: "not-found" as const };
    if (current.status !== nextStatus && !ALLOWED_TRANSITIONS[current.status].includes(nextStatus)) {
      return { kind: "invalid-transition" as const };
    }
    if (current.status !== nextStatus) {
      const updated = await tx.complaint.updateMany({
        where: { id: complaintId, status: current.status },
        data: { status: nextStatus },
      });
      if (updated.count !== 1) return { kind: "conflict" as const };
    }
    const complaint = await tx.complaint.findUnique({
      where: { id: complaintId },
      select: adminComplaintSelect,
    });
    if (!complaint) return { kind: "not-found" as const };
    return { kind: "updated" as const, complaint };
  });

  if (result.kind === "not-found") return res.status(404).json({ message: "Complaint not found" });
  if (result.kind === "invalid-transition") return res.status(409).json({ message: "Invalid complaint status transition" });
  if (result.kind === "conflict") return res.status(409).json({ message: "Complaint changed concurrently; please retry" });
  return res.json({ complaint: result.complaint });
};
