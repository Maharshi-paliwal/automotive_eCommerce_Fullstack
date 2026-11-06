import { create } from "zustand";
import { sendChatMessage, type ChatProduct } from "../api/chatApi";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: number;
  products?: ChatProduct[];
}

interface ChatStore {
  messages: ChatMessage[];
  isOpen: boolean;
  isLoading: boolean;
  error: string | null;
  toggleChat: () => void;
  sendMessage: (content: string) => Promise<void>;
  clearChat: () => void;
}

let nextMessageId = 0;

const createMessage = (
  role: ChatMessage["role"],
  content: string,
  products?: ChatProduct[],
): ChatMessage => ({
  id: `${Date.now()}-${nextMessageId++}`,
  role,
  content,
  createdAt: Date.now(),
  ...(products ? { products } : {}),
});

export const useChatStore = create<ChatStore>((set, get) => ({
  messages: [],
  isOpen: false,
  isLoading: false,
  error: null,

  toggleChat: () => set((state) => ({ isOpen: !state.isOpen })),

  sendMessage: async (content) => {
    const trimmed = content.trim();
    if (!trimmed || get().isLoading) return;

    const userMessage = createMessage("user", trimmed);
    const recentMessages = [...get().messages, userMessage]
      .slice(-6)
      .map(({ role, content: messageContent }) => ({ role, content: messageContent }));

    set((state) => ({
      messages: [...state.messages, userMessage],
      isLoading: true,
      error: null,
    }));

    try {
      const response = await sendChatMessage(recentMessages);
      set((state) => ({
        messages: [...state.messages, createMessage("assistant", response.reply, response.products)],
        isLoading: false,
        error: null,
      }));
    } catch {
      set({
        isLoading: false,
        error: "I couldn’t reach the assistant just now. Please try again in a moment.",
      });
    }
  },

  clearChat: () => {
    if (get().isLoading) return;
    set({ messages: [], error: null });
  },
}));
