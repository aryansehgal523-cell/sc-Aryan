// ── Sender enum ─────────────────────────────────────────────────────────────
// Extensibility seam: AGENT can be added later for human-handoff flows.
export const Sender = {
  USER: "USER",
  AI: "AI",
} as const;
export type Sender = (typeof Sender)[keyof typeof Sender];

// ── Channel enum ─────────────────────────────────────────────────────────────
// Extensibility seam: additional channels (whatsapp, instagram) slot in here.
export const Channel = {
  WEB_CHAT: "web_chat",
} as const;
export type Channel = (typeof Channel)[keyof typeof Channel];

// ── Domain types ─────────────────────────────────────────────────────────────
export interface MessageDTO {
  id: string;
  sender: Sender;
  text: string;
  createdAt: string; // ISO-8601
}

export interface ConversationDTO {
  sessionId: string;
  channel: Channel;
  createdAt: string;
}

// ── API request/response contracts ───────────────────────────────────────────
export interface SendMessageRequest {
  message: string;
  sessionId?: string;
}

export interface SendMessageResponse {
  sessionId: string;
  userMessage: MessageDTO;
  aiMessage: MessageDTO;
}

export interface GetHistoryResponse {
  sessionId: string;
  messages: MessageDTO[];
}

// ── Envelope ─────────────────────────────────────────────────────────────────
export type ApiSuccess<T> = { ok: true; data: T };
export type ApiError = {
  ok: false;
  error: { code: ErrorCode; message: string };
};
export type ApiResponse<T> = ApiSuccess<T> | ApiError;

// ── Error codes ───────────────────────────────────────────────────────────────
export const ErrorCode = {
  VALIDATION_ERROR: "VALIDATION_ERROR",
  NOT_FOUND: "NOT_FOUND",
  LLM_UNAVAILABLE: "LLM_UNAVAILABLE",
  INTERNAL: "INTERNAL",
} as const;
export type ErrorCode = (typeof ErrorCode)[keyof typeof ErrorCode];
