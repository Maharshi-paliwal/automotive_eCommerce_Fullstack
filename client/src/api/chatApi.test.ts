import { beforeEach, describe, expect, it, vi } from "vitest";
import { http } from "./http";
import { sendChatMessage } from "./chatApi";

vi.mock("./http", () => ({
  http: { post: vi.fn() },
}));

describe("sendChatMessage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("preserves every valid product from the API response", async () => {
    vi.mocked(http.post).mockResolvedValueOnce({
      data: {
        reply: "Here are some options.",
        products: [
          { id: "oil-1", name: "Engine oil", price: 650, image: null },
          { id: "oil-2", name: "Motorcycle oil", price: 850, image: "/oil.png" },
          { id: "oil-3", name: "Synthetic oil", price: 950, image: null },
        ],
      },
    });

    const response = await sendChatMessage([{ role: "user", content: "Find oil" }]);

    expect(response.products.map(({ id }) => id)).toEqual(["oil-1", "oil-2", "oil-3"]);
  });
});
