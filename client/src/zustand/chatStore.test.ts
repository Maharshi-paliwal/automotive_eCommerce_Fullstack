import { beforeEach, describe, expect, it, vi } from "vitest";
import { sendChatMessage, type ChatResponse } from "../api/chatApi";
import { useChatStore } from "./chatStore";

vi.mock("../api/chatApi", () => ({
  sendChatMessage: vi.fn(),
}));

const product = {
  id: "product-1",
  name: "Motorcycle engine oil",
  price: 650,
  image: null,
};

describe("useChatStore", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useChatStore.setState({
      messages: [],
      isOpen: false,
      isLoading: false,
      error: null,
    });
  });

  it("adds the user message immediately and attaches returned recommendations", async () => {
    vi.mocked(sendChatMessage).mockResolvedValueOnce({
      reply: "Here are two options.",
      products: [product, { ...product, id: "product-2", name: "Brake pads" }],
    });

    const request = useChatStore.getState().sendMessage("  Find engine oil  ");
    expect(useChatStore.getState().messages[0]).toMatchObject({
      role: "user",
      content: "Find engine oil",
    });
    expect(useChatStore.getState().isLoading).toBe(true);

    await request;

    expect(sendChatMessage).toHaveBeenCalledWith([
      { role: "user", content: "Find engine oil" },
    ]);
    expect(useChatStore.getState().messages[1]).toMatchObject({
      role: "assistant",
      content: "Here are two options.",
      products: [product, { ...product, id: "product-2", name: "Brake pads" }],
    });
    expect(useChatStore.getState().isLoading).toBe(false);
  });

  it("ignores empty messages", async () => {
    await useChatStore.getState().sendMessage(" \n ");

    expect(sendChatMessage).not.toHaveBeenCalled();
    expect(useChatStore.getState().messages).toEqual([]);
  });

  it("prevents a second request while one is in flight", async () => {
    let resolveRequest: ((response: ChatResponse) => void) | undefined;
    vi.mocked(sendChatMessage).mockReturnValueOnce(
      new Promise((resolve) => {
        resolveRequest = resolve;
      }),
    );

    const firstRequest = useChatStore.getState().sendMessage("oil");
    const secondRequest = useChatStore.getState().sendMessage("brakes");
    resolveRequest?.({ reply: "Done.", products: [] });
    await Promise.all([firstRequest, secondRequest]);

    expect(sendChatMessage).toHaveBeenCalledTimes(1);
    expect(useChatStore.getState().messages.map(({ content }) => content)).toEqual(["oil", "Done."]);
  });

  it("shows a safe error message when the API fails", async () => {
    vi.mocked(sendChatMessage).mockRejectedValueOnce(new Error("Internal server details"));

    await useChatStore.getState().sendMessage("Find parts");

    expect(useChatStore.getState().messages).toHaveLength(1);
    expect(useChatStore.getState().error).toBe(
      "I couldn’t reach the assistant just now. Please try again in a moment.",
    );
    expect(useChatStore.getState().error).not.toContain("Internal server details");
    expect(useChatStore.getState().isLoading).toBe(false);
  });

  it("toggles visibility and clears completed conversations", async () => {
    vi.mocked(sendChatMessage).mockResolvedValueOnce({ reply: "Ready.", products: [] });
    const store = useChatStore.getState();
    store.toggleChat();
    await store.sendMessage("Hello");
    useChatStore.getState().clearChat();

    expect(useChatStore.getState().isOpen).toBe(true);
    expect(useChatStore.getState().messages).toEqual([]);
  });
});
