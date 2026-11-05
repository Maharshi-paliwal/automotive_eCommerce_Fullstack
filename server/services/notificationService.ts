import { getAdminEmails } from "../config/adminEmails.js";
import { prisma } from "../config/prisma.js";
import type { Prisma } from "../generated/prisma/client.js";
import type { NotificationType } from "../generated/prisma/enums.js";

type NotificationDb = Pick<Prisma.TransactionClient, "notification" | "user" | "pushSubscription" | "outboxEvent">;

export type CreateNotificationInput = {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  idempotencyKey: string;
  referenceType?: string;
  referenceId?: string;
};

export type CreateAdminNotificationsInput = Omit<CreateNotificationInput, "userId">;

export type NotificationListOptions = {
  page?: number;
  limit?: number;
  unreadOnly?: boolean;
};

export class AdminNotificationsUnavailableError extends Error {
  readonly status = 503;

  constructor(message: string) {
    super(message);
    this.name = "AdminNotificationsUnavailableError";
  }
}

const database: NotificationDb = prisma;
const notificationView = {
  id: true,
  type: true,
  title: true,
  message: true,
  referenceType: true,
  referenceId: true,
  readAt: true,
  createdAt: true,
} as const;

const persistNotification = async (
  input: CreateNotificationInput,
  tx: NotificationDb,
) => {
  const recipient = await tx.user.findUnique({
    where: { id: input.userId },
    select: { email: true },
  });
  const adminEmails = getAdminEmails();
  if (!recipient?.email || !adminEmails.includes(recipient.email.trim().toLowerCase())) {
    throw new Error("Notification recipient is not an administrator");
  }

  const where = {
    userId_idempotencyKey: {
      userId: input.userId,
      idempotencyKey: input.idempotencyKey,
    },
  };
  const created = await tx.notification.createMany({
    data: [{
      userId: input.userId,
      type: input.type,
      title: input.title,
      message: input.message,
      idempotencyKey: input.idempotencyKey,
      ...(input.referenceType !== undefined ? { referenceType: input.referenceType } : {}),
      ...(input.referenceId !== undefined ? { referenceId: input.referenceId } : {}),
    }],
    skipDuplicates: true,
  });
  const notification = await tx.notification.findUnique({ where });
  if (!notification) throw new Error("Notification was not persisted");
  if (created.count === 1) {
    const subscriptions = await tx.pushSubscription.findMany({
      where: { userId: input.userId },
      select: { id: true },
    });
    if (subscriptions.length > 0) {
      await tx.outboxEvent.createMany({
        data: subscriptions.map(({ id }) => ({
          dedupeKey: `notification:${notification.id}:push:${id}`,
          queue: "order-processing",
          jobName: "deliver-notification-push",
          payload: { notificationId: notification.id, subscriptionId: id },
        })),
        skipDuplicates: true,
      });
    }
  }
  return notification;
};

export const createNotification = async (
  input: CreateNotificationInput,
  tx?: NotificationDb,
) => tx
  ? persistNotification(input, tx)
  : prisma.$transaction((transaction) => persistNotification(input, transaction));

const createAdminNotificationsInTransaction = async (
  input: CreateAdminNotificationsInput,
  tx: NotificationDb = database,
) => {
  const adminEmails = getAdminEmails();
  if (adminEmails.length === 0) {
    throw new AdminNotificationsUnavailableError("No administrator emails are configured");
  }

  const admins = await tx.user.findMany({
    where: {
      OR: adminEmails.map((email) => ({
        email: { equals: email, mode: "insensitive" as const },
      })),
    },
    select: { id: true },
  });
  if (admins.length === 0) {
    throw new AdminNotificationsUnavailableError("No configured administrator accounts were found");
  }
  const notifications: Awaited<ReturnType<typeof createNotification>>[] = [];
  for (const adminUser of admins) {
    notifications.push(await persistNotification({ ...input, userId: adminUser.id }, tx));
  }
  return notifications;
};

export const createAdminNotifications = async (
  input: CreateAdminNotificationsInput,
  tx?: NotificationDb,
) => tx
  ? createAdminNotificationsInTransaction(input, tx)
  : prisma.$transaction((transaction) => createAdminNotificationsInTransaction(input, transaction));

export const getNotifications = async (
  userId: string,
  options: NotificationListOptions = {},
) => {
  const page = options.page ?? 1;
  const limit = options.limit ?? 25;
  const where = {
    userId,
    ...(options.unreadOnly ? { readAt: null } : {}),
  };
  const [notifications, total] = await Promise.all([
    prisma.notification.findMany({
      where,
      select: notificationView,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.notification.count({ where }),
  ]);
  return { notifications, pagination: { page, limit, total } };
};

export const getUnreadNotificationCount = (userId: string) =>
  prisma.notification.count({ where: { userId, readAt: null } });

export const markNotificationAsRead = async (userId: string, notificationId: string) => {
  await prisma.notification.updateMany({
    where: { id: notificationId, userId, readAt: null },
    data: { readAt: new Date() },
  });
  return prisma.notification.findFirst({
    where: { id: notificationId, userId },
    select: notificationView,
  });
};

export const markAllNotificationsAsRead = async (userId: string) => {
  const result = await prisma.notification.updateMany({
    where: { userId, readAt: null },
    data: { readAt: new Date() },
  });
  return { updatedCount: result.count };
};
