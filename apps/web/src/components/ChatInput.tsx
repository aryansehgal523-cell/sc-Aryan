import {
  useState,
  useRef,
  useEffect,
  type KeyboardEvent,
  type ChangeEvent,
} from "react";

const MAX_CHARS = 4000;
const COUNTER_THRESHOLD = 3800;

interface Props {
  onSend: (text: string) => void;
  disabled: boolean;
  errorMessage: string | null;
  onClearError: () => void;
  autoFocus?: boolean;
}

export function ChatInput({
  onSend,
  disabled,
  errorMessage,
  onClearError,
  autoFocus = false,
}: Props) {
  const [value, setValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize the textarea to fit its content, up to a max-height set in CSS.
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = `${ta.scrollHeight}px`;
  }, [value]);

  const handleSend = () => {
    const trimmed = value.trim();
    if (!trimmed || disabled || value.length > MAX_CHARS) return;
    onSend(trimmed);
    setValue("");
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    setValue(e.target.value);
    if (errorMessage) onClearError();
  };

  const charCount = value.length;
  const overLimit = charCount > MAX_CHARS;
  const showCounter = charCount >= COUNTER_THRESHOLD;
  const canSend = value.trim().length > 0 && !disabled && !overLimit;

  return (
    <div className="border-t border-gray-100 bg-white flex-shrink-0">
      {errorMessage && (
        <div className="px-4 pt-3">
          <div
            role="alert"
            className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2 flex items-start gap-2"
          >
            <svg
              className="w-3.5 h-3.5 flex-shrink-0 mt-0.5"
              fill="currentColor"
              viewBox="0 0 20 20"
              aria-hidden="true"
            >
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
            <span>{errorMessage}</span>
          </div>
        </div>
      )}

      <div className="flex items-end gap-2 px-4 pt-3 pb-2">
        <textarea
          ref={textareaRef}
          rows={1}
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          placeholder="Type your message…"
          aria-label="Message input"
          autoFocus={autoFocus}
          className={`flex-1 resize-none rounded-xl border px-3 py-2 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-1 transition-colors max-h-32 overflow-y-auto disabled:bg-gray-50 disabled:text-gray-400 ${
            overLimit
              ? "border-red-400 focus:border-red-400 focus:ring-red-400"
              : "border-gray-200 focus:border-indigo-400 focus:ring-indigo-400"
          }`}
        />
        <button
          onClick={handleSend}
          disabled={!canSend}
          aria-label="Send message"
          className="w-9 h-9 flex-shrink-0 rounded-xl bg-indigo-600 text-white flex items-center justify-center hover:bg-indigo-700 active:bg-indigo-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <svg
            className="w-4 h-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="m22 2-7 20-4-9-9-4 20-7z" />
            <path d="M22 2 11 13" />
          </svg>
        </button>
      </div>

      <div className="flex items-center justify-between px-4 pb-2">
        <p className="text-xs text-gray-400">
          Enter to send · Shift+Enter for new line
        </p>
        {showCounter && (
          <p
            className={`text-xs tabular-nums ${overLimit ? "text-red-500 font-medium" : "text-gray-400"}`}
          >
            {charCount}/{MAX_CHARS}
          </p>
        )}
      </div>
    </div>
  );
}
