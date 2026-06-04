import type {
  ApiResponse,
  SendMessageRequest,
  SendMessageResponse,
  GetHistoryResponse,
} from "@spur-chat/shared";

// In dev, Vite proxies /api → localhost:3001. In prod, set VITE_API_URL to the server origin.
const BASE = (import.meta.env["VITE_API_URL"] as string | undefined) ?? "";

export class ApiError extends Error {
  constructor(
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${BASE}${url}`, {
      ...init,
      headers: { "Content-Type": "application/json", ...init?.headers },
    });
  } catch {
    throw new ApiError("NETWORK_ERROR", "Could not reach the server. Check your connection.");
  }

  const json = (await res.json()) as ApiResponse<T>;
  if (!json.ok) throw new ApiError(json.error.code, json.error.message);
  return json.data;
}

export const chatApi = {
  sendMessage: (body: SendMessageRequest): Promise<SendMessageResponse> =>
    request<SendMessageResponse>("/api/v1/chat/message", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  getHistory: (sessionId: string): Promise<GetHistoryResponse> =>
    request<GetHistoryResponse>(`/api/v1/chat/${sessionId}/messages`),
};
