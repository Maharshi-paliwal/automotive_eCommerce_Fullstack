import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { useChatStore } from "../../zustand/chatStore";
import ChatWidget from "./ChatWidget";

describe("ChatWidget", () => {
  beforeEach(() => {
    useChatStore.setState({
      messages: [],
      isOpen: false,
      isLoading: false,
      error: null,
    });
  });

  it("opens and closes the assistant conversation", () => {
    render(<ChatWidget />);

    fireEvent.click(screen.getByRole("button", { name: "Open TorqueNest Assistant" }));
    expect(screen.getByRole("dialog", { name: "TorqueNest Assistant chat" })).toBeTruthy();
    expect(screen.getByText("Your parts-finding co-pilot")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Close chat" }));
    expect(screen.queryByRole("dialog", { name: "TorqueNest Assistant chat" })).toBeNull();
  });
});
