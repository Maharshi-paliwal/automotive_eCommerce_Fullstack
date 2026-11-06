import { useEffect, useRef } from "react";
import { Bot, CarFront, RotateCcw, X } from "lucide-react";
import { useChatStore } from "../../zustand/chatStore";
import ChatInput from "./ChatInput";
import MessageBubble from "./MessageBubble";

const STARTER_PROMPTS = [
  "Find engine oil for my motorcycle",
  "Show me available Royal Enfield parts",
  "What products are currently in stock?",
];

interface ChatWindowProps {
  onClose: () => void;
}

const ChatWindow = ({ onClose }: ChatWindowProps) => {
  const messages = useChatStore((state) => state.messages);
  const isLoading = useChatStore((state) => state.isLoading);
  const error = useChatStore((state) => state.error);
  const sendMessage = useChatStore((state) => state.sendMessage);
  const clearChat = useChatStore((state) => state.clearChat);
  const messageListRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const list = messageListRef.current;
    if (list) list.scrollTop = list.scrollHeight;
  }, [messages.length, isLoading, error]);

  return (
    <section
      role="dialog"
      aria-label="TorqueNest Assistant chat"
      className="chat-window fixed inset-0 z-[60] flex flex-col overflow-hidden bg-app-background shadow-2xl sm:inset-auto sm:bottom-24 sm:right-6 sm:h-[min(680px,calc(100dvh-7rem))] sm:w-[min(420px,calc(100vw-3rem))] sm:rounded-3xl sm:border sm:border-app-border"
    >
      <header className="flex shrink-0 items-center justify-between gap-3 bg-app-blue px-4 py-4 text-white sm:px-5">
        <div className="flex min-w-0 items-center gap-3">
          <span className={`assistant-mascot ${isLoading ? "assistant-mascot--thinking" : ""}`}>
            <CarFront aria-hidden="true" className="size-6" />
            <span className="assistant-mascot-wheel assistant-mascot-wheel--left" />
            <span className="assistant-mascot-wheel assistant-mascot-wheel--right" />
          </span>
          <div className="min-w-0">
            <h2 className="truncate text-base font-semibold leading-tight">TorqueNest Assistant</h2>
            <p className="mt-1 flex items-center gap-1.5 text-xs text-white/75">
              <span className="size-1.5 rounded-full bg-emerald-300" />
              Here to help you find the right part
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            aria-label="Clear conversation"
            title="Clear conversation"
            disabled={isLoading || messages.length === 0}
            onClick={clearChat}
            className="flex size-9 items-center justify-center rounded-full text-white/80 hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-35"
          >
            <RotateCcw aria-hidden="true" className="size-4" />
          </button>
          <button
            type="button"
            aria-label="Close chat"
            onClick={onClose}
            className="flex size-9 items-center justify-center rounded-full text-white/80 hover:bg-white/10 hover:text-white"
          >
            <X aria-hidden="true" className="size-5" />
          </button>
        </div>
      </header>

      <div
        ref={messageListRef}
        className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-4 sm:px-4"
        aria-live="polite"
        aria-relevant="additions text"
      >
        {messages.length === 0 ? (
          <div className="flex min-h-full flex-col justify-center py-4">
            <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-2xl bg-app-blue text-app-amber shadow-md">
              <Bot aria-hidden="true" className="size-7" />
            </div>
            <h3 className="text-center text-lg font-semibold text-app-blue-dark">Your parts-finding co-pilot</h3>
            <p className="mx-auto mt-1 max-w-xs text-center text-sm leading-relaxed text-app-text-light">
              Ask me about parts, products and what’s available at TorqueNest.
            </p>
            <div className="mt-6 grid gap-2">
              {STARTER_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  disabled={isLoading}
                  onClick={() => void sendMessage(prompt)}
                  className="rounded-xl border border-app-border bg-white px-3.5 py-3 text-left text-sm text-app-blue transition hover:border-app-amber hover:bg-amber-50/60 disabled:opacity-50"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex min-h-full flex-col justify-end">
            <div className="space-y-3">
              {messages.map((message) => <MessageBubble key={message.id} message={message} />)}
              {isLoading && (
                <div className="flex items-center gap-2.5" role="status" aria-label="Assistant is responding">
                  <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-app-blue text-white">
                    <Bot aria-hidden="true" className="size-4" />
                  </span>
                  <span className="flex items-center gap-1 rounded-2xl rounded-tl-md border border-app-border bg-white px-4 py-3 shadow-sm">
                    <span className="chat-typing-dot" />
                    <span className="chat-typing-dot chat-typing-dot--second" />
                    <span className="chat-typing-dot chat-typing-dot--third" />
                    <span className="sr-only">Assistant is typing</span>
                  </span>
                </div>
              )}
              {error && (
                <p role="alert" className="ml-9 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {error}
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      <ChatInput isLoading={isLoading} onSend={(content) => void sendMessage(content)} />
    </section>
  );
};

export default ChatWindow;
