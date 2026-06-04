import { ErrorCode } from "@spur-chat/shared";

export class AppError extends Error {
  constructor(
    public readonly code: ErrorCode,
    message: string,
    public readonly statusCode: number,
  ) {
    super(message);
    this.name = "AppError";
    // Maintains proper prototype chain in transpiled ES5
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super(ErrorCode.VALIDATION_ERROR, message, 400);
    this.name = "ValidationError";
  }
}

export class NotFoundError extends AppError {
  constructor(message: string) {
    super(ErrorCode.NOT_FOUND, message, 404);
    this.name = "NotFoundError";
  }
}

export class LLMUnavailableError extends AppError {
  constructor(message = "I'm having trouble right now — please try again in a moment.") {
    super(ErrorCode.LLM_UNAVAILABLE, message, 502);
    this.name = "LLMUnavailableError";
  }
}

export class InternalError extends AppError {
  constructor(message = "An unexpected error occurred") {
    super(ErrorCode.INTERNAL, message, 500);
    this.name = "InternalError";
  }
}
