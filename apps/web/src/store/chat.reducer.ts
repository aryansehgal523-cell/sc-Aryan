import type { MessageDTO } from "@spur-chat/shared";

export type SendStatus = "idle" | "loading" | "sending" | "error";

export interface ChatState {
  sessionId: string | null;
  messages: MessageDTO[];
  status: SendStatus;
  errorMessage: string | null;
}

export const initialState: ChatState = {
  sessionId: null,
  messages: [],
  status: "idle",
  errorMessage: null,
};

export type ChatAction =
  | { type: "HISTORY_LOADING" }
  | { type: "HISTORY_LOADED"; sessionId: string; messages: MessageDTO[] }
  | { type: "SEND_START"; optimisticMessage: MessageDTO }
  | {
      type: "SEND_SUCCESS";
      userMessage: MessageDTO;
      aiMessage: MessageDTO;
      sessionId: string;
    }
  | { type: "SEND_ERROR"; message: string }
  | { type: "CLEAR_ERROR" };

export function chatReducer(state: ChatState, action: ChatAction): ChatState {
  switch (action.type) {
    case "HISTORY_LOADING":
      return { ...state, status: "loading" };

    case "HISTORY_LOADED":
      return {
        ...state,
        status: "idle",
        sessionId: action.sessionId,
        messages: action.messages,
      };

    case "SEND_START":
      return {
        ...state,
        status: "sending",
        errorMessage: null,
        messages: [...state.messages, action.optimisticMessage],
      };

    case "SEND_SUCCESS":
      return {
        ...state,
        status: "idle",
        sessionId: action.sessionId,
        // Replace the optimistic message with the server-confirmed version,
        // then append the AI reply.
        messages: [
          ...state.messages.slice(0, -1),
          action.userMessage,
          action.aiMessage,
        ],
      };

    case "SEND_ERROR":
      return {
        ...state,
        status: "error",
        errorMessage: action.message,
        // Retract the optimistic message so the user can try again.
        messages: state.messages.slice(0, -1),
      };

    case "CLEAR_ERROR":
      return { ...state, status: "idle", errorMessage: null };
  }
}
