import { afterEach, describe, expect, it, jest } from "@jest/globals";
import jwt from "jsonwebtoken";
import request from "supertest";

const mockUserFindUnique = jest.fn<(...args: any[]) => Promise<any>>();
const mockNotification = {
  findMany: jest.fn<(...args: any[]) => Promise<any[]>>(),
  count: jest.fn<(...args: any[]) => Promise<number>>(),
  updateMany: jest.fn<(...args: any[]) => Promise<{ count: number }>>(),
  findFirst: jest.fn<(...args: any[]) => Promise<any>>(),
};

jest.mock("../../config/prisma.js", () => ({
  prisma: {
    user: { findUnique: mockUserFindUnique },
    notification: mockNotification,
  },
}));
jest.mock("../../config/redis.js", () => ({ redisConnection: {} }));
jest.mock("../../config/s3.js", () => ({ s3Client: { send: jest.fn() }, bucketName: "test-bucket" }));
jest.mock("bullmq", () => ({
  Queue: jest.fn().mockImplementation(() => ({ add: jest.fn().mockResolvedValue({ id: "job" }) })),
  Worker: jest.fn().mockImplementation(() => ({ on: jest.fn() })),
}));

const { default: app } = require("../../app.js") as typeof import("../../app.js");
const adminId = "11111111-1111-4111-8111-111111111111";
const notificationId = "33333333-3333-4333-8333-333333333333";
const adminToken = jwt.sign({ id: adminId }, "jest-only-secret-with-more-than-thirty-two-characters");
const adminAuthorization = { Authorization: `Bearer ${adminToken}` };

describe("admin notification routes", () => {
  afterEach(() => jest.clearAllMocks());

  it("requires authentication and administrator authorization", async () => {
    const unauthenticated = await request(app).get("/api/admin/notifications");
    expect(unauthenticated.status).toBe(401);

    mockUserFindUnique.mockResolvedValue({ id: adminId, email: "customer@example.test" });
    const nonAdmin = await request(app).get("/api/admin/notifications").set(adminAuthorization);

    expect(nonAdmin.status).toBe(403);
    expect(mockNotification.findMany).not.toHaveBeenCalled();
  });

  it("scopes notification history to the authenticated administrator", async () => {
    mockUserFindUnique.mockResolvedValue({ id: adminId, email: "admin@example.test" });
    mockNotification.findMany.mockResolvedValue([]);
    mockNotification.count.mockResolvedValue(0);

    const response = await request(app)
      .get("/api/admin/notifications?recipientId=22222222-2222-4222-8222-222222222222")
      .set(adminAuthorization);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ notifications: [], pagination: { page: 1, limit: 25, total: 0 } });
    expect(mockNotification.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { userId: adminId },
    }));
    expect(mockNotification.count).toHaveBeenCalledWith({ where: { userId: adminId } });
  });

  it("does not allow a notification read request to cross recipient boundaries", async () => {
    mockUserFindUnique.mockResolvedValue({ id: adminId, email: "admin@example.test" });
    mockNotification.updateMany.mockResolvedValue({ count: 0 });
    mockNotification.findFirst.mockResolvedValue(null);

    const response = await request(app)
      .patch(`/api/admin/notifications/${notificationId}/read`)
      .set(adminAuthorization);

    expect(response.status).toBe(404);
    expect(mockNotification.updateMany).toHaveBeenCalledWith({
      where: { id: notificationId, userId: adminId, readAt: null },
      data: { readAt: expect.any(Date) },
    });
    expect(mockNotification.findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: notificationId, userId: adminId },
    }));
  });
});
