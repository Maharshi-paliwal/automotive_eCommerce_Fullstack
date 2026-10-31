import { afterEach, describe, expect, it, jest } from "@jest/globals";
import jwt from "jsonwebtoken";
import request from "supertest";

const mockPrisma = {
  address: {
    findFirst: jest.fn<(...args: any[]) => Promise<any>>(),
    findMany: jest.fn<(...args: any[]) => Promise<any[]>>(),
    updateMany: jest.fn<(...args: any[]) => Promise<any>>(),
    deleteMany: jest.fn<(...args: any[]) => Promise<any>>(),
  },
  $transaction: jest.fn<(...args: any[]) => Promise<any>>(),
};
const mockAddressTx = {
  address: {
    updateMany: mockPrisma.address.updateMany,
    findMany: mockPrisma.address.findMany,
  },
};
mockPrisma.$transaction.mockImplementation(async (operation: any) => operation(mockAddressTx));

jest.mock("../../config/prisma.js", () => ({ prisma: mockPrisma }));
jest.mock("../../config/redis.js", () => ({ redisConnection: {} }));
jest.mock("../../config/s3.js", () => ({ s3Client: { send: jest.fn() }, bucketName: "test-bucket" }));
jest.mock("bullmq", () => ({
  Queue: jest.fn().mockImplementation(() => ({ add: jest.fn().mockResolvedValue({ id: "job" }) })),
  Worker: jest.fn().mockImplementation(() => ({ on: jest.fn() })),
}));

const { default: app } = require("../../app.js") as typeof import("../../app.js");
const token = jwt.sign({ id: "11111111-1111-4111-8111-111111111111" }, "jest-only-secret-with-more-than-thirty-two-characters");
const foreignAddressId = "22222222-2222-4222-8222-222222222222";

describe("address ownership authorization", () => {
  afterEach(() => jest.clearAllMocks());

  it("does not update an address belonging to another user", async () => {
    mockPrisma.address.findFirst.mockResolvedValue(null);
    const response = await request(app).put(`/api/addresses/${foreignAddressId}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ label: "Changed", address: "Somewhere", lat: 10, lng: 20 });
    expect(response.status).toBe(404);
    expect(mockPrisma.address.findFirst).toHaveBeenCalledWith({
      where: { id: foreignAddressId, userId: "11111111-1111-4111-8111-111111111111" },
      select: { id: true },
    });
    expect(mockPrisma.address.updateMany).not.toHaveBeenCalled();
  });

  it("does not delete an address belonging to another user", async () => {
    mockPrisma.address.deleteMany.mockResolvedValue({ count: 0 });
    const response = await request(app).delete(`/api/addresses/${foreignAddressId}`)
      .set("Authorization", `Bearer ${token}`);
    expect(response.status).toBe(404);
    expect(mockPrisma.address.deleteMany).toHaveBeenCalledWith({
      where: { id: foreignAddressId, userId: "11111111-1111-4111-8111-111111111111" },
    });
  });

  it("accepts partial address changes without replacing stored coordinates", async () => {
    const address = { id: foreignAddressId, userId: "11111111-1111-4111-8111-111111111111", lat: 10, lng: 20 };
    mockPrisma.address.findFirst.mockResolvedValue({ id: foreignAddressId });
    mockPrisma.address.updateMany.mockResolvedValue({ count: 1 });
    mockPrisma.address.findMany.mockResolvedValue([address]);
    const response = await request(app).put(`/api/addresses/${foreignAddressId}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ address: "Updated street" });
    expect(response.status).toBe(200);
    expect(mockPrisma.address.updateMany).toHaveBeenCalledWith({
      where: { id: foreignAddressId, userId: "11111111-1111-4111-8111-111111111111" },
      data: { address: "Updated street" },
    });
  });

  it("rejects invalid or incomplete supplied coordinates", async () => {
    const response = await request(app).put(`/api/addresses/${foreignAddressId}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ lat: 91, lng: 20 });
    expect(response.status).toBe(400);
    expect(mockPrisma.address.updateMany).not.toHaveBeenCalled();
  });
});
