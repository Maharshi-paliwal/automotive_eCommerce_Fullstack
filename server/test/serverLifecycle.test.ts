import { createServer } from "node:http";
import { createRequire } from "node:module";
import { afterEach, describe, expect, it, jest } from "@jest/globals";
import jwt from "jsonwebtoken";

const mockPrisma = {
  order: { findFirst: jest.fn<(...args: any[]) => Promise<any>>() },
  deliveryPartner: { findFirst: jest.fn<(...args: any[]) => Promise<any>>() },
};

jest.mock("../config/prisma.js", () => ({ prisma: mockPrisma }));
jest.mock("../config/redis.js", () => ({ redisConnection: {} }));
jest.mock("../config/s3.js", () => ({ s3Client: { send: jest.fn() }, bucketName: "test-bucket" }));
jest.mock("bullmq", () => ({
  Queue: jest.fn().mockImplementation(() => ({ add: jest.fn().mockResolvedValue({ id: "job" }), close: jest.fn().mockResolvedValue(undefined) })),
  Worker: jest.fn().mockImplementation(() => ({ on: jest.fn() })),
}));

const { default: app } = require("../app.js") as typeof import("../app.js");
const { attachSocketServer, closeSocketServer } = require("../config/socket.js") as typeof import("../config/socket.js");
const connectFromClientWorkspace = createRequire(`${process.cwd()}\\package.json`);
const { io: connectSocket } = connectFromClientWorkspace("../client/node_modules/socket.io-client") as typeof import("socket.io-client");
const customerId = "11111111-1111-4111-8111-111111111111";
const ownedOrderId = "33333333-3333-4333-8333-333333333333";
const otherOrderId = "44444444-4444-4444-8444-444444444444";

describe("HTTP application lifecycle", () => {
  afterEach(async () => closeSocketServer());

  it("imports the app without a listener and serves health through one Socket.IO HTTP server", async () => {
    const httpServer = createServer(app);
    attachSocketServer(httpServer);
    await new Promise<void>((resolve, reject) => {
      httpServer.once("error", reject);
      httpServer.listen(0, "127.0.0.1", resolve);
    });

    const address = httpServer.address();
    if (!address || typeof address === "string") throw new Error("HTTP server did not bind to a TCP port");
    const response = await fetch(`http://127.0.0.1:${address.port}/health`);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: "ok" });
    expect(httpServer.listening).toBe(true);

    await closeSocketServer();
    expect(httpServer.listening).toBe(false);
  });

  it("authenticates a Socket.IO client and only joins its own order room", async () => {
    const httpServer = createServer(app);
    attachSocketServer(httpServer);
    mockPrisma.order.findFirst.mockImplementation(async ({ where }: any) =>
      where.userId === customerId && where.id === ownedOrderId ? { id: ownedOrderId } : null);
    await new Promise<void>((resolve) => httpServer.listen(0, "127.0.0.1", resolve));
    const address = httpServer.address();
    if (!address || typeof address === "string") throw new Error("HTTP server did not bind to a TCP port");
    const url = `http://127.0.0.1:${address.port}`;
    const token = jwt.sign({ id: customerId }, process.env.JWT_SECRET!, { algorithm: "HS256", expiresIn: "1m" });
    const authenticated = connectSocket(url, { auth: { token }, transports: ["websocket"] });
    const unauthorized = connectSocket(url, { transports: ["websocket"], reconnection: false, autoConnect: false });
    try {
      await new Promise<void>((resolve, reject) => {
        authenticated.once("connect", resolve);
        authenticated.once("connect_error", reject);
        setTimeout(() => reject(new Error("Socket.IO connection timed out")), 3000).unref();
      });
      const ownRoom = await new Promise<{ joined: boolean }>((resolve, reject) => {
        authenticated.emit("order:join", ownedOrderId, resolve);
        setTimeout(() => reject(new Error("Own order room acknowledgement timed out")), 3000).unref();
      });
      const foreignRoom = await new Promise<{ joined: boolean }>((resolve, reject) => {
        authenticated.emit("order:join", otherOrderId, resolve);
        setTimeout(() => reject(new Error("Foreign order room acknowledgement timed out")), 3000).unref();
      });
      expect(ownRoom).toEqual({ joined: true });
      expect(foreignRoom).toEqual({ joined: false });

      const authFailure = await new Promise<string>((resolve, reject) => {
        unauthorized.once("connect_error", (error: Error) => resolve(error.message));
        unauthorized.once("connect", () => reject(new Error("Unauthenticated socket connected")));
        setTimeout(() => reject(new Error("Unauthenticated handshake timed out")), 3000).unref();
        unauthorized.connect();
      });
      expect(authFailure).toBe("Authentication required");
    } finally {
      authenticated.disconnect();
      unauthorized.disconnect();
      await closeSocketServer();
    }
  });
});
