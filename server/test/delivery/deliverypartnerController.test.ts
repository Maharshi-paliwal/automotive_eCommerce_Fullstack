import { afterEach, describe, expect, it, jest } from "@jest/globals";

const mockPrisma = {
  order: {
    findFirst: jest.fn<(...args: any[]) => Promise<any>>(),
    findUnique: jest.fn<(...args: any[]) => Promise<any>>(),
    updateMany: jest.fn<(...args: any[]) => Promise<any>>(),
  },
  deliveryPartner: { findFirst: jest.fn<(...args: any[]) => Promise<any>>() },
  $transaction: jest.fn<(...args: any[]) => Promise<any>>(),
};
const mockProductUpdateMany = jest.fn<(...args: any[]) => Promise<any>>();
const mockRefundAttemptCreate = jest.fn<(...args: any[]) => Promise<any>>();
const mockOutboxCreate = jest.fn<(...args: any[]) => Promise<any>>();
const mockTx = {
  order: { updateMany: mockPrisma.order.updateMany, findUnique: mockPrisma.order.findUnique },
  product: { updateMany: mockProductUpdateMany },
  refundAttempt: { create: mockRefundAttemptCreate },
  outboxEvent: { create: mockOutboxCreate },
};
mockPrisma.$transaction.mockImplementation(async (operation: any) => operation(mockTx));

jest.mock("../../config/prisma.js", () => ({ prisma: mockPrisma }));

const { cancelDelivery, completeDelivery, updateDeliveryStatus } = require("../../controllers/deliverypartnerController.js") as typeof import("../../controllers/deliverypartnerController.js");
const orderId = "33333333-3333-4333-8333-333333333333";
const partnerId = "22222222-2222-4222-8222-222222222222";
const makeResponse = () => {
  const response: any = {
    statusCode: 200,
    body: undefined,
    status(code: number) { this.statusCode = code; return this; },
    json(body: unknown) { this.body = body; return this; },
  };
  return response;
};
const requestFor = (body: unknown = {}) => ({ params: { id: orderId }, body, partner: { id: partnerId } });

describe("delivery partner order mutations", () => {
  afterEach(() => jest.clearAllMocks());

  it("persists Cancelled for an assigned active delivery and excludes the customer OTP from the response", async () => {
    mockPrisma.order.findFirst.mockResolvedValue({
      id: orderId, deliveryPartnerId: partnerId, status: "Out for Delivery", statusHistory: [], deliveryOtp: "123456",
    });
    mockPrisma.order.updateMany.mockResolvedValue({ count: 1 });
    mockPrisma.order.findUnique.mockResolvedValue({ id: orderId, status: "Cancelled", deliveryOtp: "" });
    const response = makeResponse();

    await cancelDelivery(requestFor({ reason: "Vehicle issue" }) as any, response);

    expect(response.statusCode).toBe(200);
    expect(mockPrisma.order.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: orderId, deliveryPartnerId: partnerId, status: "Out for Delivery" },
      data: expect.objectContaining({ status: "Cancelled" }),
    }));
    expect(response.body.order).not.toHaveProperty("deliveryOtp");
  });

  it("queues one pending refund and restores stock once for an eligible paid-card cancellation", async () => {
    const paidOrder = {
      id: orderId, deliveryPartnerId: partnerId, status: "Out for Delivery", statusHistory: [],
      deliveryOtp: "123456", items: [{ product: "55555555-5555-4555-8555-555555555555", quantity: 2 }],
      paymentMethod: "card", isPaid: true, razorpayPaymentId: "pay_test", total: 250, refundAttempts: 0,
      refundStatus: null,
    };
    mockPrisma.order.findFirst.mockResolvedValueOnce(paidOrder).mockResolvedValueOnce({ ...paidOrder, status: "Cancelled" });
    mockPrisma.order.updateMany.mockResolvedValueOnce({ count: 1 }).mockResolvedValueOnce({ count: 1 });
    mockPrisma.order.findUnique.mockResolvedValue({ id: orderId, status: "Cancelled", paymentStatus: "refund_pending", refundStatus: "pending" });
    mockProductUpdateMany.mockResolvedValue({ count: 1 });
    mockRefundAttemptCreate.mockResolvedValue({});
    mockOutboxCreate.mockResolvedValue({});

    const first = makeResponse();
    await cancelDelivery(requestFor({ reason: "Vehicle issue" }) as any, first);
    const repeated = makeResponse();
    await cancelDelivery(requestFor({ reason: "Vehicle issue" }) as any, repeated);

    expect(first.statusCode).toBe(200);
    expect(first.body.order).toMatchObject({ paymentStatus: "refund_pending", refundStatus: "pending" });
    expect(repeated.statusCode).toBe(409);
    expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);
    expect(mockProductUpdateMany).toHaveBeenCalledTimes(1);
    expect(mockRefundAttemptCreate).toHaveBeenCalledTimes(1);
    expect(mockOutboxCreate).toHaveBeenCalledTimes(1);
    expect(mockOutboxCreate).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ jobName: "refund-expired-payment", payload: { orderId, attemptNumber: 1 } }),
    }));
  });

  it("returns 404 for a missing assigned order instead of dereferencing it", async () => {
    mockPrisma.order.findFirst.mockResolvedValue(null);
    const response = makeResponse();
    await cancelDelivery(requestFor() as any, response);
    expect(response.statusCode).toBe(404);
    expect(mockPrisma.order.updateMany).not.toHaveBeenCalled();
  });

  it("rejects invalid OTP and out-of-order delivery status transitions", async () => {
    mockPrisma.order.findFirst.mockResolvedValue({
      id: orderId, deliveryPartnerId: partnerId, status: "Assigned", statusHistory: [], deliveryOtp: "123456",
    });
    const otpResponse = makeResponse();
    await completeDelivery(requestFor({ otp: "000000" }) as any, otpResponse);
    expect(otpResponse.statusCode).toBe(400);

    const statusResponse = makeResponse();
    await updateDeliveryStatus(requestFor({ status: "Out for Delivery" }) as any, statusResponse);
    expect(statusResponse.statusCode).toBe(400);
    expect(mockPrisma.order.updateMany).not.toHaveBeenCalled();
  });
});
