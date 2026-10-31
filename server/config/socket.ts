import type { Server as HttpServer } from "node:http";
import jwt from "jsonwebtoken";
import { Server as SocketServer, type Socket } from "socket.io";
import { prisma } from "./prisma.js";
import { parseClientOrigins, validateJwtSecret } from "./runtimeConfig.js";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
type SocketIdentity = { id: string; role?: string };
let io: SocketServer | null = null;
const lastLocationByPartner = new Map<string, number>();

const validCoordinates = (lat: unknown, lng: unknown): boolean =>
  typeof lat === "number" && Number.isFinite(lat) && lat >= -90 && lat <= 90 &&
  typeof lng === "number" && Number.isFinite(lng) && lng >= -180 && lng <= 180;

const tokenFromHandshake = (socket: Socket): string | null => {
  const authToken = socket.handshake.auth?.token;
  if (typeof authToken === "string" && authToken.trim()) return authToken;
  const header = socket.handshake.headers.authorization;
  if (typeof header === "string" && header.startsWith("Bearer ")) return header.slice(7);
  return null;
};

export const authenticateSocketToken = (token: string | null, secret: string): SocketIdentity => {
  if (!token) throw new Error("Authentication required");
  const identity = jwt.verify(token, secret, { algorithms: ["HS256"] }) as SocketIdentity;
  if (typeof identity.id !== "string" || !UUID_PATTERN.test(identity.id)) throw new Error("Invalid authentication token");
  return identity;
};

export const joinOwnedOrderRoom = async (socket: Pick<Socket, "join">, identity: SocketIdentity, orderId: unknown): Promise<boolean> => {
  if (identity.role === "delivery" || typeof orderId !== "string" || !UUID_PATTERN.test(orderId)) return false;
  const ownedOrder = await prisma.order.findFirst({
    where: { id: orderId, userId: identity.id },
    select: { id: true },
  });
  if (!ownedOrder) return false;
  await socket.join(`order:${orderId}`);
  return true;
};

export const acceptRiderLocation = async (identity: SocketIdentity, payload: unknown): Promise<boolean> => {
  if (identity.role !== "delivery" || !payload || typeof payload !== "object") return false;
  const location = payload as { orderId?: unknown; lat?: unknown; lng?: unknown };
  if (typeof location.orderId !== "string" || !UUID_PATTERN.test(location.orderId) || !validCoordinates(location.lat, location.lng)) return false;
  return updateAssignedRiderLocation(location.orderId, identity.id, location.lat as number, location.lng as number);
};

export const updateAssignedRiderLocation = async (
  orderId: string,
  partnerId: string,
  lat: number,
  lng: number,
): Promise<boolean> => {
  if (!UUID_PATTERN.test(orderId) || !validCoordinates(lat, lng)) return false;
  const activePartner = await prisma.deliveryPartner.findFirst({
    where: { id: partnerId, isActive: true },
    select: { id: true },
  });
  if (!activePartner) return false;
  const updated = await prisma.order.updateMany({
    where: {
      id: orderId,
      deliveryPartnerId: partnerId,
      status: { in: ["Assigned", "Packed", "Out for Delivery"] },
    },
    data: { liveLocation: { lat, lng, updatedAt: new Date() } },
  });
  if (updated.count !== 1) return false;
  io?.to(`order:${orderId}`).emit("rider:location", { lng, lat });
  return true;
};

export const attachSocketServer = (httpServer: HttpServer): SocketServer => {
  if (io) throw new Error("Socket.IO has already been attached to an HTTP server");
  const allowedOrigins = parseClientOrigins(process.env.CLIENT_URL);
  const secret = validateJwtSecret(process.env.JWT_SECRET);
  const nextIo = new SocketServer(httpServer, {
    cors: {
      origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
        return callback(new Error("Origin is not allowed"));
      },
      credentials: true,
    },
  });
  io = nextIo;

  nextIo.use((socket, next) => {
    const token = tokenFromHandshake(socket);
    try {
      const identity = authenticateSocketToken(token, secret);
      socket.data.identity = identity;
      return next();
    } catch {
      return next(new Error(token ? "Invalid authentication token" : "Authentication required"));
    }
  });

  nextIo.on("connection", (socket) => {
    const identity = socket.data.identity as SocketIdentity;

    socket.on("order:join", async (orderId: unknown, acknowledge?: (result: { joined: boolean }) => void) => {
      try {
        const joined = await joinOwnedOrderRoom(socket, identity, orderId);
        acknowledge?.({ joined });
      } catch {
        acknowledge?.({ joined: false });
      }
    });

    socket.on("rider:location", async (payload: unknown, acknowledge?: (result: { updated: boolean }) => void) => {
      const now = Date.now();
      if (now - (lastLocationByPartner.get(identity.id) ?? 0) < 1000) {
        acknowledge?.({ updated: false });
        return;
      }
      try {
        const updated = await acceptRiderLocation(identity, payload);
        if (updated) lastLocationByPartner.set(identity.id, now);
        acknowledge?.({ updated });
      } catch {
        acknowledge?.({ updated: false });
      }
    });
  });

  return nextIo;
};

export const closeSocketServer = async (): Promise<void> => {
  if (!io) return;
  const current = io;
  io = null;
  lastLocationByPartner.clear();
  await new Promise<void>((resolve) => current.close(() => resolve()));
};
