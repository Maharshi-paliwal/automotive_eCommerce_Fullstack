import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";
import jwt from "jsonwebtoken";
import request from "supertest";

type ComplaintRecord = {
  id: string;
  userId: string;
  category: string;
  subject: string;
  description: string;
  status: string;
  idempotencyKey: string;
  createdAt: Date;
  updatedAt: Date;
};

const mockComplaints = new Map<string, ComplaintRecord>();
const mockNotifications = new Map<string, Record<string, unknown>>();
const mockUsers = new Map<string, { id: string; email: string; name?: string }>();
let mockFailNotificationPersistence = false;

const mockPrisma = {
  user: {
    findUnique: jest.fn<(...args: any[]) => Promise<any>>(),
    findMany: jest.fn<(...args: any[]) => Promise<any[]>>(),
  },
  complaint: {
    createMany: jest.fn<(...args: any[]) => Promise<{ count: number }>>(),
    findUnique: jest.fn<(...args: any[]) => Promise<any>>(),
    findFirst: jest.fn<(...args: any[]) => Promise<any>>(),
    findMany: jest.fn<(...args: any[]) => Promise<any[]>>(),
    count: jest.fn<(...args: any[]) => Promise<number>>(),
    updateMany: jest.fn<(...args: any[]) => Promise<{ count: number }>>(),
  },
  notification: {
    createMany: jest.fn<(...args: any[]) => Promise<{ count: number }>>(),
    findUnique: jest.fn<(...args: any[]) => Promise<any>>(),
  },
  pushSubscription: {
    findMany: jest.fn<(...args: any[]) => Promise<any[]>>(),
  },
  outboxEvent: {
    createMany: jest.fn<(...args: any[]) => Promise<{ count: number }>>(),
  },
  $transaction: jest.fn<(...args: any[]) => Promise<any>>(),
};

jest.mock("../../config/prisma.js", () => ({ prisma: mockPrisma }));
jest.mock("../../config/redis.js", () => ({ redisConnection: {} }));
jest.mock("../../config/s3.js", () => ({ s3Client: { send: jest.fn() }, bucketName: "test-bucket" }));
jest.mock("bullmq", () => ({
  Queue: jest.fn().mockImplementation(() => ({ add: jest.fn().mockResolvedValue({ id: "job" }) })),
  Worker: jest.fn().mockImplementation(() => ({ on: jest.fn() })),
}));

const { default: app } = require("../../app.js") as typeof import("../../app.js");

const customerId = "11111111-1111-4111-8111-111111111111";
const otherCustomerId = "22222222-2222-4222-8222-222222222222";
const adminId = "33333333-3333-4333-8333-333333333333";
const secondAdminId = "44444444-4444-4444-8444-444444444444";
const complaintId = "55555555-5555-4555-8555-555555555555";
const idempotencyKey = "complaint-key-001";
const body = { category: "ORDER", subject: "Order issue", description: "The order arrived late." };
const customerAuthorization = {
  Authorization: `Bearer ${jwt.sign({ id: customerId }, "jest-only-secret-with-more-than-thirty-two-characters")}`,
};
const adminAuthorization = {
  Authorization: `Bearer ${jwt.sign({ id: adminId }, "jest-only-secret-with-more-than-thirty-two-characters")}`,
};

const complaintKey = (userId: string, key: string) => `${userId}:${key}`;
const notificationKey = (userId: string, key: string) => `${userId}:${key}`;

const createStoredComplaint = (data: Record<string, any>): ComplaintRecord => ({
  ...data,
  status: "OPEN",
  createdAt: new Date("2026-11-04T00:00:00.000Z"),
  updatedAt: new Date("2026-11-04T00:00:00.000Z"),
});

describe("complaint routes (mocked Prisma)", () => {
  beforeEach(() => {
    mockComplaints.clear();
    mockNotifications.clear();
    mockUsers.clear();
    mockUsers.set(adminId, { id: adminId, email: "admin@example.test", name: "Admin" });
    mockUsers.set(secondAdminId, { id: secondAdminId, email: "second-admin@example.test", name: "Second admin" });
    mockFailNotificationPersistence = false;
    process.env.ADMIN_EMAILS = "admin@example.test";

    mockPrisma.user.findUnique.mockImplementation(async ({ where }: any) => mockUsers.get(where.id) ?? null);
    mockPrisma.user.findMany.mockImplementation(async () =>
      (process.env.ADMIN_EMAILS || "")
        .split(",")
        .map((email) => email.trim().toLowerCase())
        .filter(Boolean)
        .flatMap((email) => [...mockUsers.values()].filter((user) => user.email.toLowerCase() === email))
        .map(({ id }) => ({ id })));
    mockPrisma.complaint.createMany.mockImplementation(async ({ data, skipDuplicates }: any) => {
      const complaint = data[0];
      const key = complaintKey(complaint.userId, complaint.idempotencyKey);
      if (mockComplaints.has(key)) {
        if (!skipDuplicates) throw new Error("Unique constraint failed");
        return { count: 0 };
      }
      mockComplaints.set(key, createStoredComplaint(complaint));
      return { count: 1 };
    });
    mockPrisma.complaint.findUnique.mockImplementation(async ({ where }: any) => {
      if (where.userId_idempotencyKey) {
        const { userId, idempotencyKey: key } = where.userId_idempotencyKey;
        return mockComplaints.get(complaintKey(userId, key)) ?? null;
      }
      return [...mockComplaints.values()].find((item) => item.id === where.id) ?? null;
    });
    mockPrisma.complaint.findFirst.mockImplementation(async ({ where }: any) =>
      [...mockComplaints.values()].find((item) => item.id === where.id && item.userId === where.userId) ?? null);
    mockPrisma.complaint.findMany.mockImplementation(async ({ where, skip, take }: any) =>
      [...mockComplaints.values()]
        .filter((item) => (!where.userId || item.userId === where.userId) && (!where.status || item.status === where.status))
        .slice(skip, skip + take));
    mockPrisma.complaint.count.mockImplementation(async ({ where }: any) =>
      [...mockComplaints.values()]
        .filter((item) => (!where.userId || item.userId === where.userId) && (!where.status || item.status === where.status))
        .length);
    mockPrisma.complaint.updateMany.mockImplementation(async ({ where, data }: any) => {
      const complaint = [...mockComplaints.values()].find((item) => item.id === where.id && item.status === where.status);
      if (!complaint) return { count: 0 };
      complaint.status = data.status;
      return { count: 1 };
    });
    mockPrisma.notification.createMany.mockImplementation(async ({ data, skipDuplicates }: any) => {
      if (mockFailNotificationPersistence) throw new Error("Notification persistence failed");
      const notification = data[0];
      const key = notificationKey(notification.userId, notification.idempotencyKey);
      if (mockNotifications.has(key)) {
        if (!skipDuplicates) throw new Error("Unique constraint failed");
        return { count: 0 };
      }
      mockNotifications.set(key, notification);
      return { count: 1 };
    });
    mockPrisma.notification.findUnique.mockImplementation(async ({ where }: any) => {
      const { userId, idempotencyKey: key } = where.userId_idempotencyKey;
      return mockNotifications.get(notificationKey(userId, key)) ?? null;
    });
    mockPrisma.pushSubscription.findMany.mockResolvedValue([]);
    mockPrisma.outboxEvent.createMany.mockResolvedValue({ count: 0 });
    mockPrisma.$transaction.mockImplementation(async (operation: any) => {
      const complaintsBefore = new Map(mockComplaints);
      const notificationsBefore = new Map(mockNotifications);
      try {
        return await operation(mockPrisma);
      } catch (error) {
        mockComplaints.clear();
        for (const [key, value] of complaintsBefore) mockComplaints.set(key, value);
        mockNotifications.clear();
        for (const [key, value] of notificationsBefore) mockNotifications.set(key, value);
        throw error;
      }
    });
  });

  afterEach(() => jest.clearAllMocks());

  const submit = (payload = body, key = idempotencyKey, authorization = customerAuthorization) =>
    request(app).post("/api/complaints").set(authorization).set("Idempotency-Key", key).send(payload);

  it("creates a complaint for the authenticated customer and fans out to configured admins", async () => {
    process.env.ADMIN_EMAILS = "admin@example.test,second-admin@example.test";
    const response = await submit();

    expect(response.status).toBe(201);
    expect(response.body.complaint).toMatchObject(body);
    expect([...mockComplaints.values()]).toHaveLength(1);
    expect([...mockComplaints.values()][0].userId).toBe(customerId);
    expect([...mockNotifications.values()]).toHaveLength(2);
    expect([...mockNotifications.values()].map((item) => item.type)).toEqual([
      "CUSTOMER_COMPLAINT",
      "CUSTOMER_COMPLAINT",
    ]);
  });

  it.each([
    ["missing category", { subject: body.subject, description: body.description }],
    ["invalid category", { ...body, category: "UNKNOWN" }],
    ["missing subject", { ...body, subject: "" }],
    ["subject too long", { ...body, subject: "s".repeat(121) }],
    ["missing description", { ...body, description: " " }],
    ["description too long", { ...body, description: "d".repeat(5001) }],
  ])("rejects %s", async (_label, payload) => {
    const response = await submit(payload as typeof body);
    expect(response.status).toBe(400);
    expect(mockPrisma.$transaction).not.toHaveBeenCalled();
  });

  it("requires a valid Idempotency-Key and does not trust a submitted customer ID", async () => {
    const missingKey = await request(app).post("/api/complaints").set(customerAuthorization).send(body);
    const invalidKey = await submit(body, "short");
    const oversizedKey = await submit(body, "k".repeat(129));
    const suppliedId = await submit({ ...body, userId: otherCustomerId });

    expect([missingKey.status, invalidKey.status, oversizedKey.status, suppliedId.status]).toEqual([400, 400, 400, 400]);
    expect(mockPrisma.complaint.createMany).not.toHaveBeenCalled();
  });

  it("returns the stored complaint on a matching retry without additional notifications", async () => {
    const first = await submit();
    const second = await submit({ ...body, subject: " Order issue " });

    expect(first.status).toBe(201);
    expect(second.status).toBe(200);
    expect(second.body.complaint.id).toBe(first.body.complaint.id);
    expect(mockComplaints.size).toBe(1);
    expect(mockNotifications.size).toBe(1);
  });

  it("allows different customers to reuse the same idempotency key", async () => {
    const otherCustomerAuthorization = {
      Authorization: `Bearer ${jwt.sign({ id: otherCustomerId }, "jest-only-secret-with-more-than-thirty-two-characters")}`,
    };
    const first = await submit();
    const second = await submit(body, idempotencyKey, otherCustomerAuthorization);

    expect(first.status).toBe(201);
    expect(second.status).toBe(201);
    expect(first.body.complaint.id).not.toBe(second.body.complaint.id);
    expect(mockComplaints.size).toBe(2);
    expect(mockNotifications.size).toBe(2);
  });

  it("returns 409 when an idempotency key is reused for a different payload", async () => {
    await submit();
    const response = await submit({ ...body, description: "Different issue." });

    expect(response.status).toBe(409);
    expect(mockComplaints.size).toBe(1);
    expect(mockNotifications.size).toBe(1);
  });

  it("handles concurrent same-key retries without duplicate complaints or notifications", async () => {
    const [first, second] = await Promise.all([submit(), submit()]);

    expect([first.status, second.status].sort()).toEqual([200, 201]);
    expect(mockComplaints.size).toBe(1);
    expect(mockNotifications.size).toBe(1);
  });

  it("does not allow a customer to retrieve another customer's complaint", async () => {
    const response = await request(app)
      .get(`/api/complaints/${complaintId}`)
      .set(customerAuthorization);

    expect(response.status).toBe(404);
    expect(mockPrisma.complaint.findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: complaintId, userId: customerId },
    }));
  });

  it("lists admin complaints with bounded pagination and status filters", async () => {
    const response = await request(app)
      .get("/api/admin/complaints?page=3&limit=10&status=OPEN")
      .set(adminAuthorization);

    expect(response.status).toBe(200);
    expect(response.body.pagination).toEqual({ page: 3, limit: 10, total: 0 });
    expect(mockPrisma.complaint.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { status: "OPEN" },
      skip: 20,
      take: 10,
    }));
  });

  it("applies the same bounded pagination rules to customer complaints", async () => {
    const valid = await request(app)
      .get("/api/complaints?page=2&limit=5")
      .set(customerAuthorization);
    const invalid = await request(app)
      .get("/api/complaints?page=1&limit=101")
      .set(customerAuthorization);

    expect(valid.status).toBe(200);
    expect(valid.body.pagination).toEqual({ page: 2, limit: 5, total: 0 });
    expect(mockPrisma.complaint.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { userId: customerId },
      skip: 5,
      take: 5,
    }));
    expect(invalid.status).toBe(400);
    expect(invalid.body).toEqual({ message: "Invalid complaint pagination" });
  });

  it.each(["-1", "1.5", "1e9", "9007199254740992", "1000000000"])(
    "rejects unsafe or excessively large pagination page %s",
    async (page) => {
      const response = await request(app)
        .get(`/api/admin/complaints?page=${page}`)
        .set(adminAuthorization);
      expect(response.status).toBe(400);
      expect(response.body).toEqual({ message: "Invalid complaint pagination" });
    },
  );

  it("retrieves an individual complaint for an administrator", async () => {
    mockComplaints.set(complaintKey(customerId, idempotencyKey), createStoredComplaint({
      id: complaintId, userId: customerId, idempotencyKey, ...body,
    }));
    const response = await request(app)
      .get(`/api/admin/complaints/${complaintId}`)
      .set(adminAuthorization);

    expect(response.status).toBe(200);
    expect(response.body.complaint.id).toBe(complaintId);
  });

  it("allows valid status transitions and rejects invalid values and transitions", async () => {
    mockComplaints.set(complaintKey(customerId, idempotencyKey), createStoredComplaint({
      id: complaintId, userId: customerId, idempotencyKey, ...body,
    }));
    const invalidTransition = await request(app)
      .patch(`/api/admin/complaints/${complaintId}/status`)
      .set(adminAuthorization)
      .send({ status: "RESOLVED" });
    const valid = await request(app)
      .patch(`/api/admin/complaints/${complaintId}/status`)
      .set(adminAuthorization)
      .send({ status: "IN_PROGRESS" });
    const invalidStatus = await request(app)
      .patch(`/api/admin/complaints/${complaintId}/status`)
      .set(adminAuthorization)
      .send({ status: "CLOSED" });

    expect(invalidTransition.status).toBe(409);
    expect(valid.status).toBe(200);
    expect(valid.body.complaint.status).toBe("IN_PROGRESS");
    expect(invalidStatus.status).toBe(400);
  });

  it("rejects non-admin access to each admin complaint endpoint", async () => {
    mockUsers.set(adminId, { id: adminId, email: "customer@example.test" });
    const list = await request(app).get("/api/admin/complaints").set(adminAuthorization);
    const get = await request(app).get(`/api/admin/complaints/${complaintId}`).set(adminAuthorization);
    const update = await request(app)
      .patch(`/api/admin/complaints/${complaintId}/status`)
      .set(adminAuthorization)
      .send({ status: "IN_PROGRESS" });

    expect([list.status, get.status, update.status]).toEqual([403, 403, 403]);
    expect(mockPrisma.complaint.findMany).not.toHaveBeenCalled();
    expect(mockPrisma.complaint.updateMany).not.toHaveBeenCalled();
  });

  it.each([
    ["no configured administrator emails", ""],
    ["no matching administrator accounts", "missing@example.test"],
  ])("rolls back complaint persistence when there are %s", async (_label, adminEmails) => {
    process.env.ADMIN_EMAILS = adminEmails;
    const consoleError = jest.spyOn(console, "error").mockImplementation(() => {});
    try {
      const response = await submit();
      expect(response.status).toBe(503);
      expect(mockComplaints.size).toBe(0);
      expect(mockNotifications.size).toBe(0);
    } finally {
      consoleError.mockRestore();
    }
  });

  it("rolls back complaint persistence when notification creation fails", async () => {
    mockFailNotificationPersistence = true;
    const consoleError = jest.spyOn(console, "error").mockImplementation(() => {});
    try {
      const response = await submit();
      expect(response.status).toBe(500);
      expect(mockComplaints.size).toBe(0);
      expect(mockNotifications.size).toBe(0);
    } finally {
      consoleError.mockRestore();
    }
  });
});
