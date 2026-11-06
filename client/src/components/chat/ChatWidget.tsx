import { MessageCircle, X } from "lucide-react";
import { useChatStore } from "../../zustand/chatStore";
import ChatWindow from "./ChatWindow";

const ChatWidget = () => {
  const isOpen = useChatStore((state) => state.isOpen);
  const toggleChat = useChatStore((state) => state.toggleChat);
  const hasMessages = useChatStore((state) => state.messages.length > 0);

  return (
    <>
      {isOpen && <ChatWindow onClose={toggleChat} />}
      <button
        type="button"
        aria-label={isOpen ? "Close TorqueNest Assistant" : "Open TorqueNest Assistant"}
        aria-expanded={isOpen}
        onClick={toggleChat}
        className="fixed bottom-5 right-4 z-[55] flex size-14 items-center justify-center rounded-full bg-app-blue text-white shadow-xl shadow-app-blue/25 transition duration-300 hover:-translate-y-1 hover:bg-app-blue-light hover:shadow-2xl sm:bottom-6 sm:right-6 sm:size-16"
      >
        {isOpen ? <X aria-hidden="true" className="size-6" /> : <MessageCircle aria-hidden="true" className="size-6" />}
        {!isOpen && !hasMessages && (
          <span className="absolute -right-0.5 -top-0.5 size-3.5 rounded-full border-2 border-white bg-app-amber" />
        )}
      </button>
    </>
  );
};

export default ChatWidget;
