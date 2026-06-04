import type { ReactNode } from "react";
import type { MessageDTO } from "@spur-chat/shared";

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

// Renders the subset of markdown that the support LLM actually produces:
// **bold** and preserved line breaks. No external dependency needed.
function renderMarkdown(text: string): ReactNode {
  return text.split("\n").map((line, lineIdx) => {
    const parts = line.split(/(\*\*[^*]+\*\*)/g);
    return (
      <span key={lineIdx}>
        {lineIdx > 0 && <br />}
        {parts.map((part, i) =>
          part.startsWith("**") && part.endsWith("**") ? (
            <strong key={i}>{part.slice(2, -2)}</strong>
          ) : (
            part
          ),
        )}
      </span>
    );
  });
}

interface Props {
  message: MessageDTO;
}

export function MessageBubble({ message }: Props) {
  const isUser = message.sender === "USER";

  return (
    <div
      className={`flex mb-3 animate-msg-in ${isUser ? "justify-end" : "justify-start"}`}
    >
      {!isUser && (
        <div className="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center mr-2 flex-shrink-0 mt-0.5">
          <span className="text-indigo-600 text-xs font-bold select-none">
            N
          </span>
        </div>
      )}

      <div
        className={`flex flex-col max-w-[78%] ${isUser ? "items-end" : "items-start"}`}
      >
        <div
          className={`px-4 py-2.5 text-sm leading-relaxed break-words ${
            isUser
              ? "bg-indigo-600 text-white rounded-2xl rounded-tr-sm"
              : "bg-white shadow-sm border border-gray-100 text-gray-800 rounded-2xl rounded-tl-sm"
          }`}
        >
          {isUser ? message.text : renderMarkdown(message.text)}
        </div>
        <p className="text-xs text-gray-400 mt-1 px-1">
          {formatTime(message.createdAt)}
        </p>
      </div>
    </div>
  );
}
