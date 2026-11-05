import type { Request, Response } from "express";
import {
  getNotifications,
  getUnreadNotificationCount,
  markAllNotificationsAsRead,
  markNotificationAsRead,
} from "../services/notificationService.js";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const listNotifications = async (req: Request, res: Response) => {
  const page = req.query.page === undefined ? 1 : Number(req.query.page);
  const limit = req.query.limit === undefined ? 25 : Number(req.query.limit);
  const unreadOnly = req.query.unreadOnly;
  if (!Number.isInteger(page) || page < 1 || !Number.isInteger(limit) || limit < 1 || limit > 100 ||
      (unreadOnly !== undefined && unreadOnly !== "true" && unreadOnly !== "false")) {
    return res.status(400).json({ message: "Invalid notification filters" });
  }
  const result = await getNotifications(req.user!.id, {
    page,
    limit,
    unreadOnly: unreadOnly === "true",
  });
  return res.json(result);
};

export const getNotificationUnreadCount = async (req: Request, res: Response) => {
  const unreadCount = await getUnreadNotificationCount(req.user!.id);
  return res.json({ unreadCount });
};

export const markNotificationRead = async (req: Request, res: Response) => {
  const notificationId = String(req.params.notificationId);
  if (!UUID_PATTERN.test(notificationId)) {
    return res.status(400).json({ message: "Invalid notification ID" });
  }
  const notification = await markNotificationAsRead(req.user!.id, notificationId);
  if (!notification) return res.status(404).json({ message: "Notification not found" });
  return res.json({ notification });
};

export const markAllNotificationsRead = async (req: Request, res: Response) => {
  const result = await markAllNotificationsAsRead(req.user!.id);
  return res.json(result);
};
