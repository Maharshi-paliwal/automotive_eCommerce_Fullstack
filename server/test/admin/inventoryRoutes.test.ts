import { afterEach, describe, expect, it, jest } from "@jest/globals";
import jwt from "jsonwebtoken";
import request from "supertest";

const mockPrisma = {
  user: { findUnique: jest.fn<(...args: any[]) => Promise<any>>() },
  product: {
    count: jest.fn<(...args: any[]) => Promise<number>>(), aggregate: jest.fn<(...args: any[]) => Promise<any>>(),
    findMany: jest.fn<(...args: any[]) => Promise<any[]>>(), findUnique: jest.fn<(...args: any[]) => Promise<any>>(), updateMany: jest.fn<(...args: any[]) => Promise<any>>(),
  },
  inventoryMovement: { create: jest.fn<(...args: any[]) => Promise<any>>(), findMany: jest.fn<(...args: any[]) => Promise<any[]>>(), count: jest.fn<(...args: any[]) => Promise<number>>() },
  $queryRaw: jest.fn<(...args: any[]) => Promise<any>>(),
  $transaction: jest.fn<(...args: any[]) => Promise<any>>(),
};
jest.mock("../../config/prisma.js", () => ({ prisma: mockPrisma }));
jest.mock("../../config/redis.js", () => ({ redisConnection: {} }));
jest.mock("bullmq", () => ({ Queue: jest.fn().mockImplementation(() => ({ add: jest.fn() })), Worker: jest.fn().mockImplementation(() => ({ on: jest.fn() })) }));
const { default: app } = require("../../app.js") as typeof import("../../app.js");
const token = jwt.sign({ id: "admin-1" }, "jest-only-secret-with-more-than-thirty-two-characters");
const productId = "55555555-5555-4555-8555-555555555555";

describe("admin inventory routes", () => {
  afterEach(() => jest.clearAllMocks());
  const authorize = () => mockPrisma.user.findUnique.mockResolvedValue({ id: "admin-1", email: "admin@example.test" });

  it("allows an admin to retrieve the inventory list", async () => {
    authorize();
    const products = [{ id: productId, name: "Brake pads", stock: 8 }];
    mockPrisma.product.count.mockResolvedValueOnce(4).mockResolvedValueOnce(1).mockResolvedValueOnce(1).mockResolvedValueOnce(1).mockResolvedValueOnce(4);
    mockPrisma.product.aggregate.mockResolvedValue({ _sum: { stock: 18 } });
    mockPrisma.product.findMany.mockResolvedValue(products);

    const response = await request(app).get("/api/admin/inventory").set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body.products).toEqual(products);
    expect(response.body.pagination).toMatchObject({ page: 1, limit: 25, total: 4 });
    expect(response.body.overview.totalUnitsInStock).toBe(18);
  });

  it("denies non-admin users on all inventory endpoints", async () => {
    mockPrisma.user.findUnique.mockResolvedValue({ id: "user-1", email: "customer@example.test" });
    const auth = { Authorization: `Bearer ${token}` };

    const list = await request(app).get("/api/admin/inventory").set(auth);
    const adjust = await request(app).post(`/api/admin/inventory/${productId}/adjust`).set(auth).send({ quantity: 1, reason: "Restock" });
    const history = await request(app).get(`/api/admin/inventory/${productId}/history`).set(auth);

    expect([list.status, adjust.status, history.status]).toEqual([403, 403, 403]);
    expect(mockPrisma.product.findMany).not.toHaveBeenCalled();
    expect(mockPrisma.product.updateMany).not.toHaveBeenCalled();
    expect(mockPrisma.inventoryMovement.findMany).not.toHaveBeenCalled();
  });

  it("lists stock with low, out, and unknown counts and applies the low filter", async () => {
    authorize();
    const lowStockProducts = [{ id: productId, stock: 2 }];
    mockPrisma.product.count.mockResolvedValueOnce(4).mockResolvedValueOnce(1).mockResolvedValueOnce(1).mockResolvedValueOnce(1).mockResolvedValueOnce(4);
    mockPrisma.product.aggregate.mockResolvedValue({ _sum: { stock: 12 } });
    mockPrisma.product.findMany.mockResolvedValue(lowStockProducts);
    const response = await request(app).get("/api/admin/inventory?filter=low&threshold=3").set("Authorization", `Bearer ${token}`);
    expect(response.status).toBe(200);
    expect(response.body.products).toEqual(lowStockProducts);
    expect(response.body.overview).toMatchObject({ totalProducts: 4, totalUnitsInStock: 12, lowStockProducts: 1, outOfStockProducts: 1, unknownStockProducts: 1 });
    expect(mockPrisma.product.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { stock: { gt: 0, lte: 3 } } }));
  });

  it.each([
    { label: "increase", quantity: 3, before: 8, after: 11 },
    { label: "decrease", quantity: -3, before: 8, after: 5 },
  ])("allows an admin to $label stock and records the manual adjustment", async ({ quantity, before, after }) => {
    authorize();
    mockPrisma.product.findUnique.mockResolvedValue({ id: productId, stock: before });
    mockPrisma.product.updateMany.mockResolvedValue({ count: 1 });
    const movement = {
      id: "movement-1", productId, movementType: "MANUAL_ADJUSTMENT", quantityChange: quantity,
      stockBefore: before, stockAfter: after, reason: "Stock count correction", adminActorId: "admin-1",
    };
    mockPrisma.inventoryMovement.create.mockResolvedValue(movement);
    mockPrisma.$transaction.mockImplementation(async (operation: any) => operation(mockPrisma));

    const response = await request(app).post(`/api/admin/inventory/${productId}/adjust`).set("Authorization", `Bearer ${token}`)
      .send({ quantity, reason: " Stock count correction " });

    expect(response.status).toBe(201);
    expect(response.body.movement).toEqual(movement);
    expect(mockPrisma.product.updateMany).toHaveBeenCalledWith({
      where: { id: productId, stock: before }, data: { stock: after },
    });
    expect(mockPrisma.inventoryMovement.create).toHaveBeenCalledWith({ data: {
      productId, movementType: "MANUAL_ADJUSTMENT", quantityChange: quantity,
      stockBefore: before, stockAfter: after, reason: "Stock count correction", adminActorId: "admin-1",
    } });
  });

  it("rejects zero quantity or a missing reason and does not write movement history", async () => {
    authorize();
    const zero = await request(app).post(`/api/admin/inventory/${productId}/adjust`).set("Authorization", `Bearer ${token}`).send({ quantity: 0, reason: "Bad" });
    const noReason = await request(app).post(`/api/admin/inventory/${productId}/adjust`).set("Authorization", `Bearer ${token}`).send({ quantity: 2 });
    expect(zero.status).toBe(400);
    expect(noReason.status).toBe(400);
    expect(mockPrisma.inventoryMovement.create).not.toHaveBeenCalled();
  });

  it("prevents a negative result and returns 404 for unknown products", async () => {
    authorize();
    mockPrisma.product.findUnique.mockResolvedValue({ id: productId, stock: 2 });
    mockPrisma.$transaction.mockImplementation(async (operation: any) => operation(mockPrisma));
    const insufficient = await request(app).post(`/api/admin/inventory/${productId}/adjust`).set("Authorization", `Bearer ${token}`).send({ quantity: -3, reason: "Correction" });
    expect(insufficient.status).toBe(409);
    expect(mockPrisma.product.updateMany).not.toHaveBeenCalled();
    expect(mockPrisma.inventoryMovement.create).not.toHaveBeenCalled();

    mockPrisma.product.findUnique.mockResolvedValue(null);
    const missing = await request(app).post(`/api/admin/inventory/${productId}/adjust`).set("Authorization", `Bearer ${token}`).send({ quantity: 1, reason: "Restock" });
    expect(missing.status).toBe(404);
  });

  it("returns manual adjustment details in inventory history", async () => {
    authorize();
    const movements = [{
      id: "movement-1", productId, movementType: "MANUAL_ADJUSTMENT", quantityChange: -2,
      stockBefore: 8, stockAfter: 6, reason: "Damaged stock", adminActorId: "admin-1",
      adminActor: { id: "admin-1", name: "Admin", email: "admin@example.test" },
    }];
    mockPrisma.product.findUnique.mockResolvedValue({ id: productId });
    mockPrisma.inventoryMovement.findMany.mockResolvedValue(movements);
    mockPrisma.inventoryMovement.count.mockResolvedValue(2);
    const response = await request(app).get(`/api/admin/inventory/${productId}/history`).set("Authorization", `Bearer ${token}`);
    expect(response.status).toBe(200);
    expect(response.body.history).toEqual(movements);
    expect(response.body.history[0]).toMatchObject({
      movementType: "MANUAL_ADJUSTMENT", quantityChange: -2, stockBefore: 8, stockAfter: 6,
      reason: "Damaged stock", adminActor: { id: "admin-1", email: "admin@example.test" },
    });
    expect(mockPrisma.inventoryMovement.findMany).toHaveBeenCalledWith(expect.objectContaining({ orderBy: [{ createdAt: "desc" }, { id: "desc" }] }));
  });
});
