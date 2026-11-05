import { afterEach, describe, expect, it, jest } from "@jest/globals";

const mockOrderFindUnique = jest.fn<(...args: any[]) => Promise<any>>();
const mockOrderUpdateMany = jest.fn<(...args: any[]) => Promise<any>>();
const mockPartnerFindUnique = jest.fn<(...args: any[]) => Promise<any>>();
const mockPrisma = {
  order: { findUnique: mockOrderFindUnique, updateMany: mockOrderUpdateMany },
  deliveryPartner: { findUnique: mockPartnerFindUnique },
};

jest.mock("../config/prisma.js", () => ({ prisma: mockPrisma }));

const { assignDeliverypartner } = require("../controllers/adminControllers.js") as typeof import("../controllers/adminControllers.js");
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

describe("admin delivery assignment concurrency", () => {
  afterEach(() => jest.clearAllMocks());

  it("returns a conflict when the order changed after it was read", async () => {
    mockOrderFindUnique.mockResolvedValue({ id: orderId, status: "Confirmed", deliveryPartnerId: null, statusHistory: [] });
    mockPartnerFindUnique.mockResolvedValue({ id: partnerId, name: "Rider", isActive: true });
    mockOrderUpdateMany.mockResolvedValue({ count: 0 });
    const response = makeResponse();

    await assignDeliverypartner(
      { params: { id: orderId }, body: { partnerId } } as any,
      response,
    );

    expect(response.statusCode).toBe(409);
    expect(mockOrderUpdateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: orderId, status: "Confirmed", deliveryPartnerId: null },
    }));
  });

  it("allows an active partner to be assigned or reassigned while the order is Assigned", async () => {
    mockOrderFindUnique
      .mockResolvedValueOnce({ id: orderId, status: "Assigned", deliveryPartnerId: "11111111-1111-4111-8111-111111111111", statusHistory: [] })
      .mockResolvedValueOnce({ id: orderId, status: "Assigned", deliveryPartnerId: partnerId });
    mockPartnerFindUnique.mockResolvedValue({ id: partnerId, name: "Rider", isActive: true });
    mockOrderUpdateMany.mockResolvedValue({ count: 1 });
    const response = makeResponse();

    await assignDeliverypartner({ params: { id: orderId }, body: { partnerId } } as any, response);

    expect(response.statusCode).toBe(200);
    expect(mockOrderUpdateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: orderId, status: "Assigned", deliveryPartnerId: "11111111-1111-4111-8111-111111111111" },
      data: expect.objectContaining({ deliveryPartnerId: partnerId, status: "Assigned", deliveryOtp: expect.stringMatching(/^\d{6}$/) }),
    }));
  });

  it.each(["Packed", "Out for Delivery"])("rejects reassignment after the order reaches %s", async (status) => {
    mockOrderFindUnique.mockResolvedValue({
      id: orderId, status, deliveryPartnerId: "11111111-1111-4111-8111-111111111111", statusHistory: [],
    });
    mockPartnerFindUnique.mockResolvedValue({ id: partnerId, name: "Rider", isActive: true });
    const response = makeResponse();

    await assignDeliverypartner({ params: { id: orderId }, body: { partnerId } } as any, response);

    expect(response.statusCode).toBe(409);
    expect(mockOrderUpdateMany).not.toHaveBeenCalled();
  });
});
