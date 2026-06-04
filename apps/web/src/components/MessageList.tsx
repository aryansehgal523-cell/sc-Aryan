import { useEffect, useRef } from "react";
import type { MessageDTO } from "@spur-chat/shared";
import { MessageBubble } from "./MessageBubble.js";
import { TypingIndicator } from "./TypingIndicator.js";
import { useChatStore } from "../store/chat.context.js";

// ── Skeleton ──────────────────────────────────────────────────────────────────
function SkeletonBubble({ side }: { side: "left" | "right" }) {
  return (
    <div
      className={`flex mb-3 ${side === "right" ? "justify-end" : "justify-start"}`}
    >
      {side === "left" && (
        <div className="w-7 h-7 rounded-full bg-gray-200 mr-2 flex-shrink-0 animate-pulse" />
      )}
      <div
        className={`h-10 rounded-2xl bg-gray-200 animate-pulse ${side === "right" ? "w-2/5" : "w-3/5"}`}
      />
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="px-4 py-4" aria-label="Loading conversation history…">
      <SkeletonBubble side="left" />
      <SkeletonBubble side="right" />
      <SkeletonBubble side="left" />
      <SkeletonBubble side="right" />
    </div>
  );
}

// ── Empty state ───────────────────────────────────────────────────────────────
const SUGGESTIONS = [
  "What's your return policy?",
  "How long does shipping take?",
  "Can I cancel my order?",
  "My item arrived damaged — what do I do?",
];

function EmptyState() {
  const { sendMessage } = useChatStore();

  return (
    <div className="flex flex-col items-center justify-center h-full px-6 py-8 text-center overflow-y-auto">
      <div className="w-16 h-16 rounded-full bg-indigo-100 flex items-center justify-center mb-4 flex-shrink-0">
        <span className="text-indigo-600 text-2xl font-bold select-none">N</span>
      </div>
      <h2 className="font-semibold text-gray-800 text-lg mb-1">Hi there!</h2>
      <p className="text-gray-500 text-sm max-w-xs mb-6">
        I'm Nora, your Northwind Goods support assistant. How can I help you
        today?
      </p>
      <ul className="w-full max-w-xs flex flex-col gap-2">
        {SUGGESTIONS.map((q) => (
          <li key={q}>
            <button
              onClick={() => void sendMessage(q)}
              className="w-full text-left text-sm text-indigo-700 border border-indigo-200 bg-white rounded-xl px-4 py-2.5 hover:bg-indigo-50 active:bg-indigo-100 transition-colors"
            >
              {q}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ── MessageList ───────────────────────────────────────────────────────────────
interface Props {
  messages: MessageDTO[];
  isTyping: boolean;
  isLoading: boolean;
}

export function MessageList({ messages, isTyping, isLoading }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, isTyping]);

  if (isLoading) {
    return (
      <div className="flex-1 overflow-y-auto bg-gray-50">
        <LoadingSkeleton />
      </div>
    );
  }

  if (messages.length === 0 && !isTyping) {
    return (
      <div className="flex-1 overflow-y-auto bg-gray-50">
        <EmptyState />
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto bg-gray-50 px-4 py-4">
      {messages.map((msg) => (
        <MessageBubble key={msg.id} message={msg} />
      ))}
      {isTyping && <TypingIndicator />}
      <div ref={bottomRef} />
    </div>
  );
}
