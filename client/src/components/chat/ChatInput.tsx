import { useState } from "react";
import { Send } from "lucide-react";

interface ChatInputProps {
  isLoading: boolean;
  onSend: (content: string) => void;
}

const ChatInput = ({ isLoading, onSend }: ChatInputProps) => {
  const [value, setValue] = useState("");

  const submit = () => {
    const content = value.trim();
    if (!content || isLoading) return;
    setValue("");
    onSend(content);
  };

  return (
    <form
      className="border-t border-app-border bg-white p-3 sm:p-4"
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
    >
      <div className="flex items-end gap-2 rounded-2xl border border-app-border bg-app-background p-2 transition focus-within:border-app-blue-light focus-within:ring-2 focus-within:ring-app-blue/10">
        <textarea
          aria-label="Message the TorqueNest assistant"
          rows={1}
          maxLength={500}
          value={value}
          placeholder="Ask about parts, fitment or availability..."
          disabled={isLoading}
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              submit();
            }
          }}
          className="max-h-28 min-h-10 flex-1 resize-none border-0 bg-transparent px-2 py-2 text-sm leading-5 text-app-text placeholder:text-app-text-light focus:outline-none focus:ring-0 disabled:opacity-60"
        />
        <button
          type="submit"
          aria-label="Send message"
          disabled={isLoading || !value.trim()}
          className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-app-amber text-app-blue-dark shadow-sm transition hover:bg-app-amber-light disabled:cursor-not-allowed disabled:opacity-45"
        >
          <Send aria-hidden="true" className="size-4" />
        </button>
      </div>
      <p className="mt-2 px-1 text-[10px] text-app-text-light">Enter to send · Shift + Enter for a new line</p>
    </form>
  );
};

export default ChatInput;
