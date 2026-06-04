import {
  createContext,
  useContext,
  useReducer,
  useCallback,
  useEffect,
  type ReactNode,
} from "react";
import { Sender, ErrorCode } from "@spur-chat/shared";
import { chatReducer, initialState, type ChatState } from "./chat.reducer.js";
import { chatApi, ApiError } from "../api/client.js";

const USER_FACING_ERRORS: Partial<Record<string, string>> = {
  [ErrorCode.LLM_UNAVAILABLE]:
    "I'm having trouble right now — please try again in a moment.",
  [ErrorCode.INTERNAL]: "Something went wrong on our end. Please try again.",
  NETWORK_ERROR: "Could not reach the server. Check your connection.",
};

const SESSION_KEY = "nw_session_id";

interface ChatContextValue {
  state: ChatState;
  sendMessage: (text: string) => Promise<void>;
  clearError: () => void;
}

const ChatContext = createContext<ChatContextValue | null>(null);

export function ChatProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(chatReducer, initialState);

  // On mount: rehydrate session from localStorage.
  useEffect(() => {
    const savedId = localStorage.getItem(SESSION_KEY);
    if (!savedId) return;

    dispatch({ type: "HISTORY_LOADING" });

    chatApi
      .getHistory(savedId)
      .then((data) => {
        dispatch({
          type: "HISTORY_LOADED",
          sessionId: data.sessionId,
          messages: data.messages,
        });
      })
      .catch(() => {
        // Session not found on server — start fresh.
        localStorage.removeItem(SESSION_KEY);
        dispatch({ type: "CLEAR_ERROR" }); // resets status to idle, shows empty state
      });
  }, []);

  const sendMessage = useCallback(
    async (text: string) => {
      // Show the user's message immediately while the request is in flight.
      dispatch({
        type: "SEND_START",
        optimisticMessage: {
          id: `optimistic-${Date.now()}`,
          sender: Sender.USER,
          text,
          createdAt: new Date().toISOString(),
        },
      });

      try {
        const data = await chatApi.sendMessage({
          message: text,
          sessionId: state.sessionId ?? undefined,
        });

        localStorage.setItem(SESSION_KEY, data.sessionId);
        dispatch({
          type: "SEND_SUCCESS",
          userMessage: data.userMessage,
          aiMessage: data.aiMessage,
          sessionId: data.sessionId,
        });
      } catch (err) {
        const message =
          err instanceof ApiError
            ? (USER_FACING_ERRORS[err.code] ?? err.message)
            : "Something went wrong. Please try again.";
        dispatch({ type: "SEND_ERROR", message });
      }
    },
    [state.sessionId],
  );

  const clearError = useCallback(
    () => dispatch({ type: "CLEAR_ERROR" }),
    [],
  );

  return (
    <ChatContext.Provider value={{ state, sendMessage, clearError }}>
      {children}
    </ChatContext.Provider>
  );
}

export function useChatStore(): ChatContextValue {
  const ctx = useContext(ChatContext);
  if (!ctx) throw new Error("useChatStore must be used inside <ChatProvider>");
  return ctx;
}
