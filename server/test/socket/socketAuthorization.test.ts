import { afterEach, describe, expect, it, jest } from "@jest/globals";
import jwt from "jsonwebtoken";

const mockPrisma = {
  deliveryPartner: {
    findFirst: jest.fn<(...args: any[]) => Promise<any>>(),
  },
  order: {
    findFirst: jest.fn<(...args: any[]) => Promise<any>>(),
    updateMany: jest.fn<(...args: any[]) => Promise<any>>(),
  },
};
const mockSocketServerInstance = {
  use: jest.fn(),
  on: jest.fn(),
  to: jest.fn(() => ({ emit: jest.fn() })),
  close: jest.fn((callback: () => void) => callback()),
};

jest.mock("../../config/prisma.js", () => ({ prisma: mockPrisma }));
jest.mock("socket.io", () => ({
  Server: jest.fn(() => mockSocketServerInstance),
}));

const {
  acceptRiderLocation,
  authenticateSocketToken,
  attachSocketServer,
  closeSocketServer,
  emitNotificationToUser,
  joinAuthenticatedUserRoom,
  joinOwnedOrderRoom,
} = require("../../config/socket.js") as typeof import("../../config/socket.js");
const secret = "jest-only-secret-with-more-than-thirty-two-characters";
const customerId = "11111111-1111-4111-8111-111111111111";
const partnerId = "22222222-2222-4222-8222-222222222222";
const orderId = "33333333-3333-4333-8333-333333333333";

describe("Socket.IO authorization helpers", () => {
  afterEach(() => jest.clearAllMocks());

  it("requires a valid HS256 JWT at connection time", () => {
    expect(() => authenticateSocketToken(null, secret)).toThrow("Authentication required");
    expect(() => authenticateSocketToken("invalid", secret)).toThrow();
    expect(authenticateSocketToken(jwt.sign({ id: customerId }, secret, { algorithm: "HS256" }), secret))
      .toMatchObject({ id: customerId });
  });

  it("only joins an order room after confirming that the customer owns the order", async () => {
    const socket = { join: jest.fn<(...args: any[]) => Promise<void>>().mockResolvedValue() };
    mockPrisma.order.findFirst.mockResolvedValue(null);
    expect(await joinOwnedOrderRoom(socket as any, { id: customerId }, orderId)).toBe(false);
    expect(socket.join).not.toHaveBeenCalled();
    expect(mockPrisma.order.findFirst).toHaveBeenCalledWith({
      where: { id: orderId, userId: customerId }, select: { id: true },
    });
    expect(await joinOwnedOrderRoom(socket as any, { id: partnerId, role: "delivery" }, orderId)).toBe(false);
    expect(socket.join).not.toHaveBeenCalled();
  });

  it("joins only the authenticated user's private room and emits to the intended recipient", async () => {
    const firstSocket = { join: jest.fn<(...args: any[]) => Promise<void>>().mockResolvedValue() };
    const secondSocket = { join: jest.fn<(...args: any[]) => Promise<void>>().mockResolvedValue() };
    await joinAuthenticatedUserRoom(firstSocket, { id: customerId });
    await joinAuthenticatedUserRoom(secondSocket, { id: partnerId });
    expect(firstSocket.join).toHaveBeenCalledWith(`user:${customerId}`);
    expect(secondSocket.join).toHaveBeenCalledWith(`user:${partnerId}`);

    attachSocketServer({} as any);
    const notification = {
      id: orderId,
      type: "CUSTOMER_COMPLAINT",
      title: "New complaint",
      message: "A customer submitted a complaint",
      referenceType: "Complaint",
      referenceId: orderId,
      createdAt: new Date(0),
    };
    expect(emitNotificationToUser(customerId, notification)).toBe(true);
    expect(mockSocketServerInstance.to).toHaveBeenCalledWith(`user:${customerId}`);
    expect(mockSocketServerInstance.to).not.toHaveBeenCalledWith(`user:${partnerId}`);
    expect(mockSocketServerInstance.to.mock.results[0].value.emit).toHaveBeenCalledWith(
      "notification:new",
      expect.objectContaining({ notificationId: orderId }),
    );
    await closeSocketServer();
  });

  it("rejects customer location emissions and persists only updates for the assigned rider", async () => {
    expect(await acceptRiderLocation({ id: customerId }, { orderId, lat: 10, lng: 20 })).toBe(false);
    expect(await acceptRiderLocation({ id: partnerId, role: "delivery" }, { orderId, lat: 91, lng: 20 })).toBe(false);
    expect(mockPrisma.order.updateMany).not.toHaveBeenCalled();

    mockPrisma.order.updateMany.mockResolvedValue({ count: 0 });
    mockPrisma.deliveryPartner.findFirst.mockResolvedValue({ id: partnerId });
    expect(await acceptRiderLocation({ id: partnerId, role: "delivery" }, { orderId, lat: 10, lng: 20 })).toBe(false);
    expect(mockPrisma.order.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: orderId, deliveryPartnerId: partnerId, status: { in: ["Assigned", "Packed", "Out for Delivery"] } },
    }));
  });
});
