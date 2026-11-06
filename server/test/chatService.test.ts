import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";

const mockProductFindMany = jest.fn<(...args: any[]) => Promise<any[]>>();
const mockPrisma = { product: { findMany: mockProductFindMany } };

jest.mock("../config/prisma.js", () => ({ prisma: mockPrisma }));
jest.mock("../config/s3.js", () => ({ toImageUrl: (image: string | null) => image }));

import { answerChat } from "../services/chatService.js";

const products = [
  { id: "oil-1", name: "Castrol Engine Oil", price: 650, image: null },
  { id: "oil-2", name: "MOTUL Motorcycle Oil", price: 850, image: null },
];

describe("answerChat", () => {
  const originalApiKey = process.env.OPENROUTER_API_KEY;
  let fetchSpy: jest.SpiedFunction<typeof fetch>;

  beforeEach(() => {
    process.env.OPENROUTER_API_KEY = "test-api-key";
    fetchSpy = jest.spyOn(global, "fetch");
    mockProductFindMany
      .mockResolvedValueOnce(products)
      .mockResolvedValueOnce([{ category: "Engine Oil" }]);
    fetchSpy.mockResolvedValue(new Response(JSON.stringify({
      choices: [{ message: { content: "Here are two options: **Castrol Engine Oil** and **MOT" } }],
    }), { status: 200 }));
  });

  afterEach(() => {
    jest.clearAllMocks();
    if (originalApiKey === undefined) delete process.env.OPENROUTER_API_KEY;
    else process.env.OPENROUTER_API_KEY = originalApiKey;
  });

  it("returns catalog products even when the generated reply is incomplete", async () => {
    const response = await answerChat([{ role: "user", content: "Find motorcycle oil" }]);

    expect(response.reply).toContain("**MOT");
    expect(response.products.map(({ id }) => id)).toEqual(["oil-1", "oil-2"]);
    expect(JSON.parse(String(fetchSpy.mock.calls[0][1]?.body))).toEqual(
      expect.objectContaining({ max_tokens: 500 }),
    );
  });
});
