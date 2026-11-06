import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useParams } from "react-router-dom";
import { describe, expect, it } from "vitest";
import type { ChatMessage } from "../../zustand/chatStore";
import MessageBubble from "./MessageBubble";

const ProductRoute = () => {
  const { id } = useParams();
  return <p>Product route: {id}</p>;
};

describe("MessageBubble product recommendations", () => {
  it("renders assistant unordered and numbered Markdown lists, bold text and line breaks safely", () => {
    const message: ChatMessage = {
      id: "assistant-markdown",
      role: "assistant",
      content: "Yes, we have:\n\n- **Castrol Engine Oil** – ₹650 per litre\n- __MOTUL Motorcycle Engine Oil__ – ₹850 per litre\n\n1. **First numbered product** – ₹500\n2. \nPlease check compatibility.\nAsk us if you need help.",
      createdAt: Date.now(),
    };

    const { container } = render(
      <MemoryRouter>
        <MessageBubble message={message} />
      </MemoryRouter>,
    );

    expect(container.querySelectorAll("ul > li")).toHaveLength(2);
    expect(container.querySelectorAll("ol > li")).toHaveLength(1);
    expect(screen.getByText("Castrol Engine Oil").tagName).toBe("STRONG");
    expect(screen.getByText("MOTUL Motorcycle Engine Oil").tagName).toBe("STRONG");
    expect(screen.getByText("First numbered product").tagName).toBe("STRONG");
    expect(container.textContent).not.toContain("2.");
    expect(container.querySelectorAll("br")).toHaveLength(1);

    const htmlMessage = { ...message, id: "assistant-html", content: "<img src=x onerror=alert(1)>" };
    const { container: htmlContainer } = render(
      <MemoryRouter>
        <MessageBubble message={htmlMessage} />
      </MemoryRouter>,
    );
    expect(htmlContainer.querySelector("img")).toBeNull();
    expect(htmlContainer.textContent).toContain("<img src=x onerror=alert(1)>");
  });

  it("renders every returned product with one timestamp and links by product ID", () => {
    const message: ChatMessage = {
      id: "assistant-1",
      role: "assistant",
      content: "Here are two options.",
      createdAt: Date.now(),
      products: [
        { id: "oil-123", name: "Motorcycle engine oil", price: 650, image: null },
        { id: "brakes-456", name: "Brake pads", price: 850, image: "/broken-image.png" },
      ],
    };

    const { container } = render(
      <MemoryRouter initialEntries={["/chat"]}>
        <Routes>
          <Route path="/chat" element={<MessageBubble message={message} />} />
          <Route path="/products/:id" element={<ProductRoute />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText("Here are two options.")).toBeTruthy();
    expect(screen.getByText("Motorcycle engine oil")).toBeTruthy();
    expect(screen.getByText("Brake pads")).toBeTruthy();
    expect(screen.getAllByRole("link", { name: "View product" })).toHaveLength(2);
    expect(container.querySelectorAll("time")).toHaveLength(1);

    fireEvent.click(screen.getAllByRole("link", { name: "View product" })[0]);
    expect(screen.getByText("Product route: oil-123")).toBeTruthy();
  });

  it("replaces a broken product image with a fallback", () => {
    const message: ChatMessage = {
      id: "assistant-2",
      role: "assistant",
      content: "A recommendation.",
      createdAt: Date.now(),
      products: [{ id: "filter-1", name: "Air filter", price: 345, image: "/broken.png" }],
    };

    render(
      <MemoryRouter>
        <MessageBubble message={message} />
      </MemoryRouter>,
    );
    fireEvent.error(screen.getByAltText("Air filter"));

    expect(screen.queryByAltText("Air filter")).toBeNull();
    expect(screen.getByText("Air filter")).toBeTruthy();
  });
});
