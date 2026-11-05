import { prisma } from "../config/prisma.js";

type PushSubscriptionInput = {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
};

const ENDPOINT_HOSTS = [
  "fcm.googleapis.com",
  "push.services.mozilla.com",
  "push.apple.com",
  "notify.windows.com",
];
const BASE64URL_PATTERN = /^[A-Za-z0-9_-]+$/;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const isValidKey = (value: string, expectedBytes: number) => {
  if (!BASE64URL_PATTERN.test(value)) return false;
  try {
    return Buffer.from(value, "base64url").byteLength === expectedBytes;
  } catch {
    return false;
  }
};

export const parsePushSubscription = (value: unknown): PushSubscriptionInput | null => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const input = value as Record<string, unknown>;
  if (Object.keys(input).some((key) => !["endpoint", "keys"].includes(key))) return null;
  if (typeof input.endpoint !== "string" || input.endpoint.length > 2048) return null;

  let endpoint: URL;
  try {
    endpoint = new URL(input.endpoint);
  } catch {
    return null;
  }
  const allowedHost = ENDPOINT_HOSTS.some((host) =>
    endpoint.hostname === host || endpoint.hostname.endsWith(`.${host}`));
  if (endpoint.protocol !== "https:" || !allowedHost || endpoint.username || endpoint.password || endpoint.hash) return null;

  if (!input.keys || typeof input.keys !== "object" || Array.isArray(input.keys)) return null;
  const keys = input.keys as Record<string, unknown>;
  if (Object.keys(keys).some((key) => !["p256dh", "auth"].includes(key)) ||
      typeof keys.p256dh !== "string" || typeof keys.auth !== "string" ||
      !isValidKey(keys.p256dh, 65) || !isValidKey(keys.auth, 16)) return null;

  return { endpoint: endpoint.toString(), keys: { p256dh: keys.p256dh, auth: keys.auth } };
};

export class PushSubscriptionConflictError extends Error {
  constructor() {
    super("This push endpoint is already registered to another account");
    this.name = "PushSubscriptionConflictError";
  }
}

const updateOwnedEndpoint = async (userId: string, input: PushSubscriptionInput) => {
  const existing = await prisma.pushSubscription.findUnique({
    where: { endpoint: input.endpoint },
    select: { id: true, userId: true },
  });
  if (!existing) return null;
  if (existing.userId !== userId) throw new PushSubscriptionConflictError();

  await prisma.pushSubscription.updateMany({
    where: { id: existing.id, userId },
    data: { p256dh: input.keys.p256dh, auth: input.keys.auth },
  });
  return prisma.pushSubscription.findFirst({
    where: { id: existing.id, userId },
    select: { id: true, createdAt: true },
  });
};

export const registerPushSubscription = async (userId: string, input: PushSubscriptionInput) => {
  const existing = await updateOwnedEndpoint(userId, input);
  if (existing) return existing;

  try {
    const subscription = await prisma.pushSubscription.create({
      data: {
        userId,
        endpoint: input.endpoint,
        p256dh: input.keys.p256dh,
        auth: input.keys.auth,
      },
      select: { id: true, createdAt: true },
    });
    return subscription;
  } catch (error) {
    if (!error || typeof error !== "object" || !("code" in error) || error.code !== "P2002") throw error;
    const raced = await updateOwnedEndpoint(userId, input);
    if (raced) return raced;
    throw new PushSubscriptionConflictError();
  }
};

export const listPushSubscriptions = async (userId: string) =>
  prisma.pushSubscription.findMany({
    where: { userId },
    select: { id: true, createdAt: true },
    orderBy: { createdAt: "desc" },
  });

export const removePushSubscription = async (userId: string, subscriptionId: string) => {
  if (!UUID_PATTERN.test(subscriptionId)) return false;
  const removed = await prisma.pushSubscription.deleteMany({
    where: { id: subscriptionId, userId },
  });
  return removed.count === 1;
};
