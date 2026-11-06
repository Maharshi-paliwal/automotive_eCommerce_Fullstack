import { http } from "./http";

export interface ChatApiMessage {
  role: "user" | "assistant";
  content: string;
}

export interface ChatProduct {
  id: string;
  name: string;
  price: number;
  image: string | null;
}

export interface ChatResponse {
  reply: string;
  products: ChatProduct[];
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

export async function sendChatMessage(messages: ChatApiMessage[]): Promise<ChatResponse> {
  const { data } = await http.post<unknown>(
    "/chat",
    { messages },
    { timeout: 35_000 },
  );

  if (!isRecord(data) || typeof data.reply !== "string" || !data.reply.trim()) {
    throw new Error("The assistant returned an empty response.");
  }

  const products = Array.isArray(data.products)
    ? data.products.flatMap((item): ChatProduct[] => {
        if (
          !isRecord(item)
          || typeof item.id !== "string"
          || typeof item.name !== "string"
          || typeof item.price !== "number"
          || !Number.isFinite(item.price)
        ) {
          return [];
        }

        return [{
          id: item.id,
          name: item.name,
          price: item.price,
          image: typeof item.image === "string" ? item.image : null,
        }];
      })
    : [];

  return { reply: data.reply.trim(), products };
}
