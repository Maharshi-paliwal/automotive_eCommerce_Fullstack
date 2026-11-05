import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";

const mockSendNotification = jest.fn<(...args: any[]) => Promise<any>>();
const mockSetVapidDetails = jest.fn();
const mockPushSubscription = {
  findUnique: jest.fn<(...args: any[]) => Promise<any>>(),
  deleteMany: jest.fn<(...args: any[]) => Promise<{ count: number }>>(),
};
const mockNotification = {
  findFirst: jest.fn<(...args: any[]) => Promise<any>>(),
};

jest.mock("web-push", () => ({
  __esModule: true,
  default: {
    sendNotification: mockSendNotification,
    setVapidDetails: mockSetVapidDetails,
  },
}));
jest.mock("../../config/prisma.js", () => ({
  prisma: { pushSubscription: mockPushSubscription, notification: mockNotification },
}));

import { buildPushPayload, deliverNotificationPush } from "../../services/pushDeliveryService.js";

const notificationId = "11111111-1111-4111-8111-111111111111";
const subscriptionId = "22222222-2222-4222-8222-222222222222";
const userId = "33333333-3333-4333-8333-333333333333";
const notification = {
  id: notificationId,
  type: "CUSTOMER_COMPLAINT",
  title: "New customer complaint",
  message: "A customer submitted a payment complaint: card details stolen",
  referenceType: "Complaint",
  referenceId: "44444444-4444-4444-8444-444444444444",
};

describe("push delivery service", () => {
  beforeEach(() => {
    process.env.VAPID_PUBLIC_KEY = Buffer.alloc(65, 1).toString("base64url");
    process.env.VAPID_PRIVATE_KEY = Buffer.alloc(32, 2).toString("base64url");
    process.env.VAPID_SUBJECT = "mailto:push@example.test";
    mockSendNotification.mockReset().mockResolvedValue({});
    mockSetVapidDetails.mockReset();
    mockPushSubscription.findUnique.mockReset().mockResolvedValue({
      id: subscriptionId,
      userId,
      endpoint: "https://fcm.googleapis.com/fcm/send/example",
      p256dh: Buffer.alloc(65, 3).toString("base64url"),
      auth: Buffer.alloc(16, 4).toString("base64url"),
    });
    mockPushSubscription.deleteMany.mockReset().mockResolvedValue({ count: 1 });
    mockNotification.findFirst.mockReset().mockResolvedValue(notification);
  });

  afterEach(() => {
    delete process.env.VAPID_PUBLIC_KEY;
    delete process.env.VAPID_PRIVATE_KEY;
    delete process.env.VAPID_SUBJECT;
    jest.clearAllMocks();
  });

  it("sends a minimal payload to the subscription of the notification recipient", async () => {
    await expect(deliverNotificationPush(notificationId, subscriptionId)).resolves.toEqual({ delivered: true });

    expect(mockNotification.findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: notificationId, userId },
    }));
    expect(mockSendNotification).toHaveBeenCalledWith(
      expect.objectContaining({ endpoint: expect.stringContaining("fcm.googleapis.com") }),
      JSON.stringify({
        notificationId,
        type: "CUSTOMER_COMPLAINT",
        title: "New customer complaint",
        message: "A customer complaint needs review.",
        navigationTarget: `/admin/complaints/${notification.referenceId}`,
      }),
      { TTL: 3600 },
    );
    expect(mockSendNotification.mock.calls[0][1]).not.toContain("card details");
    expect(mockSetVapidDetails).toHaveBeenCalledWith(
      "mailto:push@example.test",
      process.env.VAPID_PUBLIC_KEY,
      process.env.VAPID_PRIVATE_KEY,
    );
  });

  it("removes expired 404 and 410 subscriptions", async () => {
    for (const statusCode of [404, 410]) {
      mockSendNotification.mockRejectedValueOnce(Object.assign(new Error("gone"), { statusCode }));
      await expect(deliverNotificationPush(notificationId, subscriptionId)).resolves.toEqual({ removed: true });
    }

    expect(mockPushSubscription.deleteMany).toHaveBeenCalledTimes(2);
    expect(mockPushSubscription.deleteMany).toHaveBeenCalledWith({
      where: { id: subscriptionId, userId },
    });
  });

  it("preserves valid subscriptions and propagates transient delivery errors for retry", async () => {
    const transientError = Object.assign(new Error("temporarily unavailable"), { statusCode: 503 });
    mockSendNotification.mockRejectedValueOnce(transientError);

    await expect(deliverNotificationPush(notificationId, subscriptionId)).rejects.toBe(transientError);
    expect(mockPushSubscription.deleteMany).not.toHaveBeenCalled();
  });

  it("does not send if the subscription owner differs from the notification recipient", async () => {
    mockNotification.findFirst.mockResolvedValue(null);

    await expect(deliverNotificationPush(notificationId, subscriptionId)).resolves.toEqual({ skipped: true });
    expect(mockSendNotification).not.toHaveBeenCalled();
  });

  it("uses a generic push message for customer complaints", () => {
    expect(buildPushPayload(notification)).toMatchObject({
      notificationId,
      type: "CUSTOMER_COMPLAINT",
      message: "A customer complaint needs review.",
      navigationTarget: `/admin/complaints/${notification.referenceId}`,
    });
  });
});
