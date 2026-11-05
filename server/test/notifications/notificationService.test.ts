import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";

const mockNotification = {
  createMany: jest.fn<(...args: any[]) => Promise<{ count: number }>>(),
  findUnique: jest.fn<(...args: any[]) => Promise<any>>(),
  findMany: jest.fn<(...args: any[]) => Promise<any[]>>(),
  count: jest.fn<(...args: any[]) => Promise<number>>(),
  updateMany: jest.fn<(...args: any[]) => Promise<{ count: number }>>(),
  findFirst: jest.fn<(...args: any[]) => Promise<any>>(),
};
const mockUser = {
  findUnique: jest.fn<(...args: any[]) => Promise<any>>(),
  findMany: jest.fn<(...args: any[]) => Promise<any[]>>(),
};
const mockPushSubscription = {
  findMany: jest.fn<(...args: any[]) => Promise<any[]>>(),
};
const mockOutboxEvent = {
  createMany: jest.fn<(...args: any[]) => Promise<{ count: number }>>(),
};
const mockTransaction = jest.fn<(...args: any[]) => Promise<any>>();

const mockDatabaseTransaction = {
  notification: mockNotification,
  user: mockUser,
  pushSubscription: mockPushSubscription,
  outboxEvent: mockOutboxEvent,
};

jest.mock("../../config/prisma.js", () => ({
  prisma: {
    notification: mockNotification,
    user: mockUser,
    pushSubscription: mockPushSubscription,
    outboxEvent: mockOutboxEvent,
    $transaction: mockTransaction,
  },
}));

import {
  createNotification,
  getNotifications,
  getUnreadNotificationCount,
  markAllNotificationsAsRead,
  markNotificationAsRead,
} from "../../services/notificationService.js";

const recipientId = "11111111-1111-4111-8111-111111111111";
const otherRecipientId = "22222222-2222-4222-8222-222222222222";
const notificationId = "33333333-3333-4333-8333-333333333333";
const notification = {
  id: notificationId,
  userId: recipientId,
  type: "LOW_STOCK",
  title: "Low inventory",
  message: "A product has low stock.",
  referenceType: "Product",
  referenceId: "44444444-4444-4444-8444-444444444444",
  idempotencyKey: "low-stock:product-1",
  readAt: null,
};
const publicNotification = {
  id: notification.id,
  type: notification.type,
  title: notification.title,
  message: notification.message,
  referenceType: notification.referenceType,
  referenceId: notification.referenceId,
  readAt: notification.readAt,
  createdAt: new Date("2026-11-04T00:00:00.000Z"),
};

describe("notification service", () => {
  beforeEach(() => {
    mockUser.findUnique.mockResolvedValue({ email: "admin@example.test" });
    mockUser.findMany.mockResolvedValue([]);
    mockNotification.createMany.mockResolvedValue({ count: 1 });
    mockNotification.findUnique.mockResolvedValue(notification);
    mockNotification.findMany.mockResolvedValue([publicNotification]);
    mockNotification.count.mockResolvedValue(1);
    mockNotification.updateMany.mockResolvedValue({ count: 1 });
    mockNotification.findFirst.mockResolvedValue(publicNotification);
    mockPushSubscription.findMany.mockResolvedValue([]);
    mockOutboxEvent.createMany.mockResolvedValue({ count: 0 });
    mockTransaction.mockImplementation(async (operation: any) => operation(mockDatabaseTransaction));
  });

  afterEach(() => jest.clearAllMocks());

  it("creates an idempotent notification for an authorized administrator", async () => {
    await expect(createNotification({
      userId: recipientId,
      type: "LOW_STOCK",
      title: notification.title,
      message: notification.message,
      idempotencyKey: notification.idempotencyKey,
      referenceType: "Product",
      referenceId: notification.referenceId,
    })).resolves.toBe(notification);

    expect(mockUser.findUnique).toHaveBeenCalledWith({
      where: { id: recipientId },
      select: { email: true },
    });
    expect(mockNotification.createMany).toHaveBeenCalledWith({
      data: [{
        userId: recipientId,
        type: "LOW_STOCK",
        title: notification.title,
        message: notification.message,
        idempotencyKey: notification.idempotencyKey,
        referenceType: "Product",
        referenceId: notification.referenceId,
      }],
      skipDuplicates: true,
    });
    expect(mockNotification.findUnique).toHaveBeenCalledWith({
      where: { userId_idempotencyKey: { userId: recipientId, idempotencyKey: notification.idempotencyKey } },
    });
  });

  it("returns the existing record for repeated and concurrent idempotency keys", async () => {
    mockNotification.createMany
      .mockResolvedValueOnce({ count: 1 })
      .mockResolvedValueOnce({ count: 0 });
    const input = {
      userId: recipientId,
      type: "LOW_STOCK" as const,
      title: notification.title,
      message: notification.message,
      idempotencyKey: notification.idempotencyKey,
    };

    const results = await Promise.all([
      createNotification(input),
      createNotification(input),
    ]);

    expect(results).toEqual([notification, notification]);
    expect(mockNotification.createMany).toHaveBeenCalledTimes(2);
    expect(mockNotification.createMany.mock.calls[0][0]).toEqual(mockNotification.createMany.mock.calls[1][0]);
    expect(mockNotification.findUnique).toHaveBeenCalledTimes(2);
  });

  it("writes deduplicated push outbox events within the notification transaction", async () => {
    mockPushSubscription.findMany.mockResolvedValue([{ id: "subscription-1" }, { id: "subscription-2" }]);
    await createNotification({
      userId: recipientId,
      type: "LOW_STOCK",
      title: notification.title,
      message: notification.message,
      idempotencyKey: notification.idempotencyKey,
    });

    expect(mockOutboxEvent.createMany).toHaveBeenCalledWith({
      data: [
        {
          dedupeKey: `notification:${notificationId}:push:subscription-1`,
          queue: "order-processing",
          jobName: "deliver-notification-push",
          payload: { notificationId, subscriptionId: "subscription-1" },
        },
        {
          dedupeKey: `notification:${notificationId}:push:subscription-2`,
          queue: "order-processing",
          jobName: "deliver-notification-push",
          payload: { notificationId, subscriptionId: "subscription-2" },
        },
      ],
      skipDuplicates: true,
    });
  });

  it("does not enqueue additional delivery when an idempotency key already exists", async () => {
    mockNotification.createMany.mockResolvedValue({ count: 0 });
    mockPushSubscription.findMany.mockResolvedValue([{ id: "subscription-1" }]);

    await createNotification({
      userId: recipientId,
      type: "LOW_STOCK",
      title: notification.title,
      message: notification.message,
      idempotencyKey: notification.idempotencyKey,
    });

    expect(mockOutboxEvent.createMany).not.toHaveBeenCalled();
  });

  it("does not create notifications for non-administrator users", async () => {
    mockUser.findUnique.mockResolvedValue({ email: "customer@example.test" });

    await expect(createNotification({
      userId: recipientId,
      type: "LOW_STOCK",
      title: notification.title,
      message: notification.message,
      idempotencyKey: notification.idempotencyKey,
    })).rejects.toThrow("Notification recipient is not an administrator");
    expect(mockNotification.createMany).not.toHaveBeenCalled();
  });

  it("retrieves only the recipient's notifications with pagination", async () => {
    await expect(getNotifications(recipientId, { page: 2, limit: 10, unreadOnly: true })).resolves.toEqual({
      notifications: [publicNotification],
      pagination: { page: 2, limit: 10, total: 1 },
    });
    expect(mockNotification.findMany).toHaveBeenCalledWith({
      where: { userId: recipientId, readAt: null },
      select: {
        id: true,
        type: true,
        title: true,
        message: true,
        referenceType: true,
        referenceId: true,
        readAt: true,
        createdAt: true,
      },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      skip: 10,
      take: 10,
    });
    expect(mockNotification.count).toHaveBeenCalledWith({ where: { userId: recipientId, readAt: null } });
  });

  it("returns the unread count only for the recipient", async () => {
    await expect(getUnreadNotificationCount(recipientId)).resolves.toBe(1);
    expect(mockNotification.count).toHaveBeenCalledWith({
      where: { userId: recipientId, readAt: null },
    });
  });

  it("marks a notification as read only within the recipient's scope", async () => {
    await expect(markNotificationAsRead(recipientId, notificationId)).resolves.toBe(publicNotification);
    expect(mockNotification.updateMany).toHaveBeenCalledWith({
      where: { id: notificationId, userId: recipientId, readAt: null },
      data: { readAt: expect.any(Date) },
    });
    expect(mockNotification.findFirst).toHaveBeenCalledWith({
      where: { id: notificationId, userId: recipientId },
      select: {
        id: true,
        type: true,
        title: true,
        message: true,
        referenceType: true,
        referenceId: true,
        readAt: true,
        createdAt: true,
      },
    });
  });

  it("does not expose another recipient's notification", async () => {
    mockNotification.updateMany.mockResolvedValue({ count: 0 });
    mockNotification.findFirst.mockResolvedValue(null);

    await expect(markNotificationAsRead(otherRecipientId, notificationId)).resolves.toBeNull();
    expect(mockNotification.updateMany).toHaveBeenCalledWith({
      where: { id: notificationId, userId: otherRecipientId, readAt: null },
      data: { readAt: expect.any(Date) },
    });
    expect(mockNotification.findFirst).toHaveBeenCalledWith({
      where: { id: notificationId, userId: otherRecipientId },
      select: {
        id: true,
        type: true,
        title: true,
        message: true,
        referenceType: true,
        referenceId: true,
        readAt: true,
        createdAt: true,
      },
    });
  });

  it("returns not found for a nonexistent notification ID", async () => {
    mockNotification.updateMany.mockResolvedValue({ count: 0 });
    mockNotification.findFirst.mockResolvedValue(null);

    await expect(markNotificationAsRead(recipientId, notificationId)).resolves.toBeNull();
  });

  it("marks all unread notifications as read only for the recipient", async () => {
    await expect(markAllNotificationsAsRead(recipientId)).resolves.toEqual({ updatedCount: 1 });
    expect(mockNotification.updateMany).toHaveBeenCalledWith({
      where: { userId: recipientId, readAt: null },
      data: { readAt: expect.any(Date) },
    });
  });
});
