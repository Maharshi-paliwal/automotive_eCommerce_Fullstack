import type { Request, Response } from "express";
import { answerChat, ChatUnavailableError, type ChatMessage } from "../services/chatService.js";

const MAX_MESSAGES = 20;
const MAX_CONTENT_LENGTH = 500;
const HISTORY_SENT_TO_MODEL = 6;

const parseMessages = (value: unknown): ChatMessage[] | null => {
  if (!Array.isArray(value) || value.length === 0 || value.length > MAX_MESSAGES) return null;
  const messages: ChatMessage[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object") return null;
    const { role, content } = item as { role?: unknown; content?: unknown };
    if (role !== "user" && role !== "assistant") return null;
    if (typeof content !== "string") return null;
    const trimmed = content.trim();
    if (!trimmed || trimmed.length > MAX_CONTENT_LENGTH) return null;
    messages.push({ role, content: trimmed });
  }
  if (messages[messages.length - 1]?.role !== "user") return null;
  return messages.slice(-HISTORY_SENT_TO_MODEL);
};

export const chat = async (req: Request, res: Response) => {
  const messages = parseMessages(req.body?.messages);
  if (!messages) return res.status(400).json({ message: "Invalid chat request" });

  try {
    return res.json(await answerChat(messages));
  } catch (error) {
    if (error instanceof ChatUnavailableError) {
      console.error(error.message);
      return res.status(503).json({ message: "The assistant is busy right now. Please try again later." });
    }
    throw error;
  }
};
