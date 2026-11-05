import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import request from "supertest";

const mockState: { order: any; stockRestores: number; refundAttempts: any[]; outbox: any[] } = {
  order: null, stockRestores: 0, refundAttempts: [], outbox: [],
};
const mockPrisma: any = {
  user: { findUnique: jest.fn<(...args: any[]) => Promise<any>>() },
  deliveryPartner: {
    findMany: jest.fn<(...args: any[]) => Promise<any[]>>(),
    findUnique: jest.fn<(...args: any[]) => Promise<any>>(),
    create: jest.fn<(...args: any[]) => Promise<any>>(),
    update: jest.fn<(...args: any[]) => Promise<any>>(),
  },
  order: {
    findFirst: jest.fn<(...args: any[]) => Promise<any>>(),
    findUnique: jest.fn<(...args: any[]) => Promise<any>>(),
    update: jest.fn<(...args: any[]) => Promise<any>>(),
    updateMany: jest.fn<(...args: any[]) => Promise<any>>(),
  },
  product: { updateMany: jest.fn<(...args: any[]) => Promise<any>>() },
  inventoryMovement: { create: jest.fn<(...args: any[]) => Promise<any>>() },
  refundAttempt: { create: jest.fn<(...args: any[]) => Promise<any>>() },
  outboxEvent: { create: jest.fn<(...args: any[]) => Promise<any>>() },
};

const mockTx: any = {
  order: {
    findFirst: async ({ where }: any) => mockState.order?.id === where.id &&
      (!where.deliveryPartnerId || where.deliveryPartnerId === mockState.order.deliveryPartnerId) ? { ...mockState.order } : null,
    findUnique: async () => ({ ...mockState.order }),
    updateMany: async ({ where, data }: any) => {
      if (!mockState.order || mockState.order.id !== where.id || mockState.order.status !== where.status) return { count: 0 };
      if (where.refundAttempts !== undefined) {
        if (mockState.order.refundAttempts !== where.refundAttempts) return { count: 0 };
        Object.assign(mockState.order, data);
        return { count: 1 };
      }
      if (where.isPaid !== mockState.order.isPaid || where.paymentMethod !== mockState.order.paymentMethod ||
          (where.deliveryPartnerId && where.deliveryPartnerId !== mockState.order.deliveryPartnerId)) return { count: 0 };
      Object.assign(mockState.order, data);
      return { count: 1 };
    },
  },
  product: { findUnique: async () => ({ stock: 5 }), updateMany: async () => { mockState.stockRestores += 1; return { count: 1 }; } },
  inventoryMovement: { create: async ({ data }: any) => data },
  refundAttempt: { create: async ({ data }: any) => { mockState.refundAttempts.push(data); return data; } },
  outboxEvent: { create: async ({ data }: any) => { mockState.outbox.push(data); return data; } },
};

jest.mock("../../config/prisma.js", () => ({ prisma: mockPrisma }));
jest.mock("../../config/redis.js", () => ({ redisConnection: {} }));
jest.mock("bullmq", () => ({
  Queue: jest.fn().mockImplementation(() => ({ add: jest.fn().mockResolvedValue({ id: "queue-job" }) })),
  Worker: jest.fn().mockImplementation(() => ({ on: jest.fn() })),
}));
mockPrisma.$transaction = async (operation: (tx: any) => Promise<any>) => operation(mockTx);

const { default: app } = require("../../app.js") as typeof import("../../app.js");
const adminToken = jwt.sign({ id: "admin-1" }, "jest-only-secret-with-more-than-thirty-two-characters");
const customerToken = jwt.sign({ id: "customer-1" }, "jest-only-secret-with-more-than-thirty-two-characters");
const adminAuth = { Authorization: `Bearer ${adminToken}` };
const customerAuth = { Authorization: `Bearer ${customerToken}` };

describe("admin partner security and cancellation", () => {
  beforeEach(() => {
    mockState.order = null;
    mockState.stockRestores = 0;
    mockState.refundAttempts = [];
    mockState.outbox = [];
    mockPrisma.user.findUnique.mockImplementation(async ({ where }: any) => ({
      id: where.id,
      email: where.id === "admin-1" ? "admin@example.test" : "customer@example.test",
    }));
    mockPrisma.deliveryPartner.findMany.mockResolvedValue([]);
    mockPrisma.deliveryPartner.findUnique.mockResolvedValue(null);
    mockPrisma.deliveryPartner.create.mockImplementation(async ({ data }: any) => ({ id: "partner-1", ...data }));
    mockPrisma.deliveryPartner.update.mockImplementation(async ({ where, data }: any) => ({ id: where.id, name: "Rider", email: "rider@example.test", password: "stored-hash", ...data }));
  });
  afterEach(() => jest.clearAllMocks());

  it("hashes partner passwords, omits hashes from create/list/update, and keeps login working", async () => {
    const created = await request(app).post("/api/admin/delivery-partners").set(adminAuth).send({
      name: "Rider", email: "rider@example.test", password: "eight888", phone: "123", vehicleType: "bike",
    });
    expect(created.status).toBe(201);
    expect(created.body.partner).not.toHaveProperty("password");
    const stored = mockPrisma.deliveryPartner.create.mock.calls[0][0] as any;
    expect(stored.data.password).not.toBe("eight888");
    expect(await bcrypt.compare("eight888", stored.data.password)).toBe(true);

    mockPrisma.deliveryPartner.findMany.mockResolvedValue([{ id: "partner-1", name: "Rider", password: stored.data.password }]);
    const listed = await request(app).get("/api/admin/delivery-partners").set(adminAuth);
    expect(listed.status).toBe(200);
    expect(listed.body.partners[0]).not.toHaveProperty("password");

    const updated = await request(app).put("/api/admin/delivery-partners/partner-1").set(adminAuth).send({ isActive: true });
    expect(updated.status).toBe(200);
    expect(updated.body.partner).not.toHaveProperty("password");

    mockPrisma.deliveryPartner.findUnique.mockResolvedValue({ id: "partner-1", email: "rider@example.test", password: stored.data.password, isActive: true });
    const login = await request(app).post("/api/delivery/login").send({ email: "rider@example.test", password: "eight888" });
    expect(login.status).toBe(200);
    expect(login.body.token).toEqual(expect.any(String));
    expect(login.body.partner).not.toHaveProperty("password");
  });

  it("rejects six-character passwords, accepts eight-character passwords, and denies non-admin access", async () => {
    const short = await request(app).post("/api/admin/delivery-partners").set(adminAuth).send({
      name: "Rider", email: "rider@example.test", password: "short6", phone: "123", vehicleType: "bike",
    });
    expect(short.status).toBe(400);
    const valid = await request(app).post("/api/admin/delivery-partners").set(adminAuth).send({
      name: "Rider", email: "rider@example.test", password: "eight888", phone: "123", vehicleType: "bike",
    });
    expect(valid.status).toBe(201);
    const forbidden = await request(app).get("/api/admin/delivery-partners").set(customerAuth);
    expect(forbidden.status).toBe(403);
  });

  it("authorizes configured admins from the hyphenated environment key", async () => {
    const previousAdminEmails = process.env.ADMIN_EMAILS;
    const previousHyphenatedAdminEmails = process.env["ADMIN-EMAILS"];
    delete process.env.ADMIN_EMAILS;
    process.env["ADMIN-EMAILS"] = " ADMIN@example.test ";

    try {
      const response = await request(app).get("/api/admin/delivery-partners").set(adminAuth);
      expect(response.status).toBe(200);
    } finally {
      if (previousAdminEmails === undefined) delete process.env.ADMIN_EMAILS;
      else process.env.ADMIN_EMAILS = previousAdminEmails;
      if (previousHyphenatedAdminEmails === undefined) delete process.env["ADMIN-EMAILS"];
      else process.env["ADMIN-EMAILS"] = previousHyphenatedAdminEmails;
    }
  });

  it("does not allow admins to mark an order Delivered directly", async () => {
    const response = await request(app).put("/api/orders/33333333-3333-4333-8333-333333333333/status")
      .set(adminAuth).send({ status: "Delivered" });

    expect(response.status).toBe(409);
    expect(response.body.message).toMatch(/delivery partner.*OTP/i);
    expect(mockPrisma.order.findUnique).not.toHaveBeenCalled();
    expect(mockPrisma.order.update).not.toHaveBeenCalled();
  });

  it.each([
    { label: "unpaid card", paymentMethod: "card", isPaid: false, paymentStatus: "pending", refundStatus: null },
    { label: "cash", paymentMethod: "cash", isPaid: false, paymentStatus: "pending", refundStatus: null },
  ])("admin cancellation safely cancels and restores stock for $label orders", async ({ paymentMethod, isPaid, paymentStatus, refundStatus }) => {
    mockState.order = {
      id: "33333333-3333-4333-8333-333333333333", status: "Placed", statusHistory: [], isPaid,
      paymentMethod, paymentStatus, refundStatus, items: [{ product: "product-1", quantity: 2 }],
      refundAttempts: 0, total: 250, razorpayPaymentId: null,
    };
    const response = await request(app).put(`/api/orders/${mockState.order.id}/status`).set(adminAuth).send({ status: "Cancelled" });
    expect(response.status).toBe(200);
    expect(mockState.order.status).toBe("Cancelled");
    expect(mockState.stockRestores).toBe(1);
    expect(mockState.refundAttempts).toHaveLength(0);
    expect(mockState.outbox).toHaveLength(0);
  });

  it("queues the existing idempotent refund workflow for paid cancellations once", async () => {
    mockState.order = {
      id: "33333333-3333-4333-8333-333333333333", status: "Confirmed", statusHistory: [], isPaid: true,
      paymentMethod: "card", paymentStatus: "paid", refundStatus: null, items: [{ product: "product-1", quantity: 2 }],
      refundAttempts: 0, total: 250, razorpayPaymentId: "pay_test",
    };
    const url = `/api/orders/${mockState.order.id}/status`;
    const first = await request(app).put(url).set(adminAuth).send({ status: "Cancelled", note: "Admin cancellation" });
    const repeated = await request(app).put(url).set(adminAuth).send({ status: "Cancelled" });
    expect(first.status).toBe(200);
    expect(mockState.order).toMatchObject({ status: "Cancelled", paymentStatus: "refund_pending", refundStatus: "pending", refundAttempts: 1 });
    expect(repeated.status).toBe(409);
    expect(mockState.stockRestores).toBe(1);
    expect(mockState.refundAttempts).toHaveLength(1);
    expect(mockState.outbox).toHaveLength(1);
    expect(mockState.outbox[0]).toMatchObject({ jobName: "refund-expired-payment", payload: { orderId: mockState.order.id, attemptNumber: 1 } });
  });
});
