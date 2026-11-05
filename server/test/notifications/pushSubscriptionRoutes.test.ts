import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";
import jwt from "jsonwebtoken";
import request from "supertest";

const mockUserFindUnique = jest.fn<(...args: any[]) => Promise<any>>();
const mockPushSubscription = {
  findUnique: jest.fn<(...args: any[]) => Promise<any>>(),
  findFirst: jest.fn<(...args: any[]) => Promise<any>>(),
  findMany: jest.fn<(...args: any[]) => Promise<any[]>>(),
  create: jest.fn<(...args: any[]) => Promise<any>>(),
  updateMany: jest.fn<(...args: any[]) => Promise<{ count: number }>>(),
  deleteMany: jest.fn<(...args: any[]) => Promise<{ count: number }>>(),
};

jest.mock("../../config/prisma.js", () => ({
  prisma: {
    user: { findUnique: mockUserFindUnique },
    pushSubscription: mockPushSubscription,
    notification: {},
    complaint: {},
    outboxEvent: {},
  },
}));
jest.mock("../../config/redis.js", () => ({ redisConnection: {} }));
jest.mock("../../config/s3.js", () => ({ s3Client: { send: jest.fn() }, bucketName: "test-bucket" }));
jest.mock("bullmq", () => ({
  Queue: jest.fn().mockImplementation(() => ({ add: jest.fn().mockResolvedValue({ id: "job" }) })),
  Worker: jest.fn().mockImplementation(() => ({ on: jest.fn() })),
}));

const { default: app } = require("../../app.js") as typeof import("../../app.js");

const ownerId = "11111111-1111-4111-8111-111111111111";
const otherUserId = "22222222-2222-4222-8222-222222222222";
const subscriptionId = "33333333-3333-4333-8333-333333333333";
const authorization = {
  Authorization: `Bearer ${jwt.sign({ id: ownerId }, "jest-only-secret-with-more-than-thirty-two-characters")}`,
};
const validSubscription = {
  endpoint: "https://fcm.googleapis.com/fcm/send/subscription-token",
  keys: {
    p256dh: Buffer.alloc(65, 1).toString("base64url"),
    auth: Buffer.alloc(16, 2).toString("base64url"),
  },
};

describe("push subscription routes (mocked Prisma)", () => {
  beforeEach(() => {
    process.env.VAPID_PUBLIC_KEY = Buffer.alloc(65, 3).toString("base64url");
    process.env.VAPID_PRIVATE_KEY = Buffer.alloc(32, 4).toString("base64url");
    process.env.VAPID_SUBJECT = "mailto:push@example.test";
    mockUserFindUnique.mockReset();
    mockPushSubscription.findUnique.mockReset();
    mockPushSubscription.findFirst.mockReset();
    mockPushSubscription.findMany.mockReset().mockResolvedValue([]);
    mockPushSubscription.create.mockReset().mockResolvedValue({ id: subscriptionId, createdAt: new Date(0) });
    mockPushSubscription.updateMany.mockReset().mockResolvedValue({ count: 1 });
    mockPushSubscription.deleteMany.mockReset().mockResolvedValue({ count: 1 });
  });

  afterEach(() => jest.clearAllMocks());

  it("requires authentication and reports only the current user's subscription status", async () => {
    const unauthenticated = await request(app).get("/api/notifications/push-subscriptions");
    const authorized = await request(app)
      .get("/api/notifications/push-subscriptions")
      .set(authorization);

    expect(unauthenticated.status).toBe(401);
    expect(authorized.status).toBe(200);
    expect(authorized.body).toMatchObject({ enabled: true, vapidPublicKey: process.env.VAPID_PUBLIC_KEY });
    expect(mockPushSubscription.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { userId: ownerId },
      select: { id: true, createdAt: true },
    }));
  });

  it("keeps ordinary APIs available while push is unconfigured and rejects registration clearly", async () => {
    delete process.env.VAPID_PUBLIC_KEY;
    delete process.env.VAPID_PRIVATE_KEY;
    delete process.env.VAPID_SUBJECT;

    const status = await request(app)
      .get("/api/notifications/push-subscriptions")
      .set(authorization);
    const registration = await request(app)
      .post("/api/notifications/push-subscriptions")
      .set(authorization)
      .send(validSubscription);

    expect(status.status).toBe(200);
    expect(status.body).toMatchObject({ enabled: false, vapidPublicKey: null });
    expect(registration.status).toBe(503);
    expect(mockPushSubscription.create).not.toHaveBeenCalled();
  });

  it("registers subscriptions using the authenticated user ID", async () => {
    const response = await request(app)
      .post("/api/notifications/push-subscriptions")
      .set(authorization)
      .send(validSubscription);

    expect(response.status).toBe(201);
    expect(mockPushSubscription.create).toHaveBeenCalledWith({
      data: {
        userId: ownerId,
        endpoint: validSubscription.endpoint,
        p256dh: validSubscription.keys.p256dh,
        auth: validSubscription.keys.auth,
      },
      select: { id: true, createdAt: true },
    });
  });

  it.each([
    ["HTTP endpoint", { ...validSubscription, endpoint: "http://fcm.googleapis.com/subscription" }],
    ["untrusted host", { ...validSubscription, endpoint: "https://localhost/subscription" }],
    ["invalid public key", { ...validSubscription, keys: { ...validSubscription.keys, p256dh: "invalid" } }],
    ["invalid auth key", { ...validSubscription, keys: { ...validSubscription.keys, auth: "invalid" } }],
    ["extra properties", { ...validSubscription, userId: otherUserId }],
  ])("rejects a subscription with %s", async (_label, payload) => {
    const response = await request(app)
      .post("/api/notifications/push-subscriptions")
      .set(authorization)
      .send(payload);

    expect(response.status).toBe(400);
    expect(mockPushSubscription.create).not.toHaveBeenCalled();
  });

  it("updates a duplicate endpoint owned by this user without creating another row", async () => {
    mockPushSubscription.findUnique.mockResolvedValue({ id: subscriptionId, userId: ownerId });
    mockPushSubscription.findFirst.mockResolvedValue({ id: subscriptionId, createdAt: new Date(0) });
    const response = await request(app)
      .post("/api/notifications/push-subscriptions")
      .set(authorization)
      .send(validSubscription);

    expect(response.status).toBe(201);
    expect(mockPushSubscription.updateMany).toHaveBeenCalledWith({
      where: { id: subscriptionId, userId: ownerId },
      data: validSubscription.keys,
    });
    expect(mockPushSubscription.create).not.toHaveBeenCalled();
  });

  it("recovers a concurrent duplicate-endpoint insert for the same owner", async () => {
    mockPushSubscription.findUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: subscriptionId, userId: ownerId });
    mockPushSubscription.create.mockRejectedValueOnce(Object.assign(new Error("Unique constraint"), { code: "P2002" }));
    mockPushSubscription.findFirst.mockResolvedValue({ id: subscriptionId, createdAt: new Date(0) });

    const response = await request(app)
      .post("/api/notifications/push-subscriptions")
      .set(authorization)
      .send(validSubscription);

    expect(response.status).toBe(201);
    expect(mockPushSubscription.create).toHaveBeenCalledTimes(1);
    expect(mockPushSubscription.updateMany).toHaveBeenCalledWith({
      where: { id: subscriptionId, userId: ownerId },
      data: validSubscription.keys,
    });
  });

  it("does not take over an endpoint registered to another user", async () => {
    mockPushSubscription.findUnique.mockResolvedValue({ id: subscriptionId, userId: otherUserId });
    const response = await request(app)
      .post("/api/notifications/push-subscriptions")
      .set(authorization)
      .send(validSubscription);

    expect(response.status).toBe(409);
    expect(mockPushSubscription.updateMany).not.toHaveBeenCalled();
    expect(mockPushSubscription.create).not.toHaveBeenCalled();
  });

  it("deletes only subscriptions owned by the authenticated user", async () => {
    mockPushSubscription.deleteMany.mockResolvedValueOnce({ count: 0 });
    const foreign = await request(app)
      .delete(`/api/notifications/push-subscriptions/${subscriptionId}`)
      .set(authorization);
    const own = await request(app)
      .delete(`/api/notifications/push-subscriptions/${subscriptionId}`)
      .set(authorization);

    expect(foreign.status).toBe(404);
    expect(own.status).toBe(204);
    expect(mockPushSubscription.deleteMany).toHaveBeenNthCalledWith(1, {
      where: { id: subscriptionId, userId: ownerId },
    });
  });
});
