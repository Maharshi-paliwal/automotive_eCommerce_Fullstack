import { afterEach, describe, expect, it, jest } from "@jest/globals";

const mockCloseSocket = jest.fn<() => Promise<void>>();
const mockDisconnect = jest.fn<() => Promise<void>>();
const mockRedisQuit = jest.fn<() => Promise<unknown>>();
const mockEmailQueueClose = jest.fn<() => Promise<void>>();
const mockOrderQueueClose = jest.fn<() => Promise<void>>();
const mockRiderQueueClose = jest.fn<() => Promise<void>>();
const mockOutboxQueueClose = jest.fn<() => Promise<void>>();
const mockEmailWorkerClose = jest.fn<() => Promise<void>>();
const mockOrderWorkerClose = jest.fn<() => Promise<void>>();
const mockRiderWorkerClose = jest.fn<() => Promise<void>>();
const mockStopOutbox = jest.fn<() => Promise<void>>();
const mockCreateServer = jest.fn();
const fakeHttpServer = {
  listening: false,
  listen: jest.fn(() => { fakeHttpServer.listening = true; }),
  close: jest.fn((callback?: (error?: Error) => void) => {
    fakeHttpServer.listening = false;
    callback?.();
  }),
  on: jest.fn(),
};
const originalExitCode = process.exitCode;

const replaceSignals = () => {
  const handlers = new Map<string, (...args: any[]) => void>();
  const spy = jest.spyOn(process, "once").mockImplementation(((event: string, listener: (...args: any[]) => void) => {
    handlers.set(event, listener);
    return process;
  }) as any);
  return { handlers, spy };
};

afterEach(() => {
  process.exitCode = originalExitCode;
  jest.restoreAllMocks();
  jest.resetModules();
  jest.dontMock("node:http");
  jest.dontMock("../app.js");
  jest.dontMock("../config/socket.js");
  jest.dontMock("../config/prisma.js");
  jest.dontMock("../config/redis.js");
  jest.dontMock("../bullmq/emailQueue.js");
  jest.dontMock("../bullmq/orderQueue.js");
  jest.dontMock("../bullmq/riderAssignment.js");
  jest.dontMock("../bullmq/outboxDispatcher.js");
  jest.dontMock("../bullmq/emailWorker.js");
  jest.dontMock("../bullmq/orderWorker.js");
  jest.dontMock("../bullmq/riderWorkerAssignment.js");
});

describe("process shutdown cleanup", () => {
  it("attempts every API resource cleanup after a Socket.IO close failure", async () => {
    const { spy } = replaceSignals();
    mockCreateServer.mockReset().mockReturnValue(fakeHttpServer);
    mockCloseSocket.mockReset().mockRejectedValue(new Error("socket close failed"));
    mockEmailQueueClose.mockReset().mockResolvedValue(undefined);
    mockRedisQuit.mockReset().mockResolvedValue("OK");
    mockDisconnect.mockReset().mockResolvedValue(undefined);
    jest.doMock("node:http", () => ({ createServer: mockCreateServer }));
    jest.doMock("../app.js", () => ({ default: {} }));
    jest.doMock("../config/runtimeConfig.js", () => ({ parsePort: () => 5000 }));
    jest.doMock("../config/socket.js", () => ({ attachSocketServer: jest.fn(), closeSocketServer: mockCloseSocket }));
    jest.doMock("../config/prisma.js", () => ({ prisma: { $disconnect: mockDisconnect } }));
    jest.doMock("../config/redis.js", () => ({ redisConnection: { quit: mockRedisQuit } }));
    jest.doMock("../bullmq/emailQueue.js", () => ({ emailQueue: { close: mockEmailQueueClose } }));

    const { shutdown } = require("../server.js") as typeof import("../server.js");
    await shutdown("test");
    await shutdown("repeat");

    expect(mockCloseSocket).toHaveBeenCalledTimes(1);
    expect(fakeHttpServer.close).toHaveBeenCalledTimes(1);
    expect(fakeHttpServer.listening).toBe(false);
    expect(mockEmailQueueClose).toHaveBeenCalledTimes(1);
    expect(mockRedisQuit).toHaveBeenCalledTimes(1);
    expect(mockDisconnect).toHaveBeenCalledTimes(1);
    expect(process.exitCode).toBe(1);
    spy.mockRestore();
  });

  it("stops workers before closing dependencies and still attempts all cleanup after failures", async () => {
    const { spy } = replaceSignals();
    mockStopOutbox.mockReset().mockResolvedValue(undefined);
    mockEmailWorkerClose.mockReset().mockRejectedValue(new Error("worker close failed"));
    mockOrderWorkerClose.mockReset().mockResolvedValue(undefined);
    mockRiderWorkerClose.mockReset().mockResolvedValue(undefined);
    mockEmailQueueClose.mockReset().mockResolvedValue(undefined);
    mockOrderQueueClose.mockReset().mockResolvedValue(undefined);
    mockRiderQueueClose.mockReset().mockResolvedValue(undefined);
    mockOutboxQueueClose.mockReset().mockResolvedValue(undefined);
    mockRedisQuit.mockReset().mockResolvedValue("OK");
    mockDisconnect.mockReset().mockResolvedValue(undefined);
    jest.doMock("../bullmq/emailWorker.js", () => ({ __esModule: true, default: { close: mockEmailWorkerClose } }));
    jest.doMock("../bullmq/orderWorker.js", () => ({ orderWorker: { close: mockOrderWorkerClose } }));
    jest.doMock("../bullmq/riderWorkerAssignment.js", () => ({ riderAssignmentWorker: { close: mockRiderWorkerClose } }));
    jest.doMock("../bullmq/emailQueue.js", () => ({ emailQueue: { close: mockEmailQueueClose } }));
    jest.doMock("../bullmq/orderQueue.js", () => ({ orderQueue: { close: mockOrderQueueClose } }));
    jest.doMock("../bullmq/riderAssignment.js", () => ({ riderAssignmentQueue: { close: mockRiderQueueClose } }));
    jest.doMock("../bullmq/outboxDispatcher.js", () => ({
      riderOutboxQueue: { close: mockOutboxQueueClose },
      startOutboxDispatcher: () => mockStopOutbox,
    }));
    jest.doMock("../config/prisma.js", () => ({ prisma: { $disconnect: mockDisconnect } }));
    jest.doMock("../config/redis.js", () => ({ redisConnection: { quit: mockRedisQuit } }));

    const { shutdown } = require("../worker.js") as typeof import("../worker.js");
    await shutdown("test");
    await shutdown("repeat");

    expect(mockStopOutbox).toHaveBeenCalledTimes(1);
    expect(mockEmailWorkerClose).toHaveBeenCalledTimes(1);
    expect(mockOrderWorkerClose).toHaveBeenCalledTimes(1);
    expect(mockRiderWorkerClose).toHaveBeenCalledTimes(1);
    expect(mockEmailQueueClose).toHaveBeenCalledTimes(1);
    expect(mockOrderQueueClose).toHaveBeenCalledTimes(1);
    expect(mockRiderQueueClose).toHaveBeenCalledTimes(1);
    expect(mockOutboxQueueClose).toHaveBeenCalledTimes(1);
    expect(mockRedisQuit).toHaveBeenCalledTimes(1);
    expect(mockDisconnect).toHaveBeenCalledTimes(1);
    expect(process.exitCode).toBe(1);
    spy.mockRestore();
  });
});
