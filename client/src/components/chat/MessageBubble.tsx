import { Bot } from "lucide-react";
import type { ChatMessage } from "../../zustand/chatStore";
import ProductRecommendationCard from "./ProductRecommendationCard";

interface MessageBubbleProps {
  message: ChatMessage;
}

const renderInlineMarkdown = (text: string) => {
  const parts = text.split(/(\*\*[^*\n]+\*\*|__[^_\n]+__)/g);

  return parts.map((part, index) => {
    const boldMatch = /^\*\*(.+)\*\*$/.exec(part) ?? /^__(.+)__$/.exec(part);
    if (!boldMatch) return part;
    return <strong key={index} className="font-semibold">{boldMatch[1]}</strong>;
  });
};

const parseListItem = (line: string) => {
  const match = /^\s*(?:([-*+])\s+|(\d+[.)])(?:\s+|$))(.*)$/.exec(line);
  if (!match) return null;
  return { ordered: Boolean(match[2]), content: match[3].trim() };
};

const AssistantMessageContent = ({ content }: { content: string }) => {
  const lines = content.split(/\r?\n/);
  const blocks = [];

  for (let index = 0; index < lines.length;) {
    if (!lines[index].trim()) {
      index += 1;
      continue;
    }

    const firstItem = parseListItem(lines[index]);
    if (firstItem) {
      const items = [];
      while (index < lines.length) {
        const item = parseListItem(lines[index]);
        if (!item || item.ordered !== firstItem.ordered) break;
        if (item.content) items.push(item.content);
        index += 1;
      }
      if (items.length > 0) {
        const List = firstItem.ordered ? "ol" : "ul";
        blocks.push(
          <List
            key={`list-${index}`}
            className={`${firstItem.ordered ? "list-decimal" : "list-disc"} space-y-1 pl-5`}
          >
            {items.map((item, itemIndex) => (
              <li key={itemIndex}>{renderInlineMarkdown(item)}</li>
            ))}
          </List>,
        );
      }
      continue;
    }

    const paragraph = [];
    while (index < lines.length && lines[index].trim() && !parseListItem(lines[index])) {
      paragraph.push(lines[index]);
      index += 1;
    }
    blocks.push(
      <p key={`paragraph-${index}`}>
        {paragraph.map((line, lineIndex) => (
          <span key={lineIndex}>
            {lineIndex > 0 && <br />}
            {renderInlineMarkdown(line)}
          </span>
        ))}
      </p>,
    );
  }

  return <div className="space-y-2">{blocks}</div>;
};

const MessageBubble = ({ message }: MessageBubbleProps) => {
  const isAssistant = message.role === "assistant";
  const timestamp = new Date(message.createdAt).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });

  return (
    <div className={`flex gap-2.5 ${isAssistant ? "items-start" : "justify-end"}`}>
      {isAssistant && (
        <span className="mt-1 flex size-7 shrink-0 items-center justify-center rounded-full bg-app-blue text-white">
          <Bot aria-hidden="true" className="size-4" />
        </span>
      )}
      <div className={`flex max-w-[88%] flex-col ${isAssistant ? "items-start gap-1" : "items-end gap-2"}`}>
        <div
          className={
            isAssistant
              ? "rounded-2xl rounded-tl-md border border-app-border bg-white px-3.5 py-3 text-app-text shadow-sm"
              : "rounded-2xl rounded-tr-md bg-app-blue px-3.5 py-3 text-white shadow-sm"
          }
        >
          <div className="break-words text-sm leading-relaxed">
            {isAssistant
              ? <AssistantMessageContent content={message.content} />
              : <p className="whitespace-pre-wrap">{message.content}</p>}
          </div>
        </div>
        {Boolean(message.products?.length) && (
          <div className="w-full space-y-1">
            {message.products?.map((product) => (
              <ProductRecommendationCard key={product.id} product={product} />
            ))}
          </div>
        )}
        <time
          dateTime={new Date(message.createdAt).toISOString()}
          className="px-1 text-[10px] text-app-text-light"
        >
          {timestamp}
        </time>
      </div>
    </div>
  );
};

export default MessageBubble;
