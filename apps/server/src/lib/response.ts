import type { ApiSuccess, ApiError, ErrorCode } from "@spur-chat/shared";

export function ok<T>(data: T): ApiSuccess<T> {
  return { ok: true, data };
}

export function fail(code: ErrorCode, message: string): ApiError {
  return { ok: false, error: { code, message } };
}
