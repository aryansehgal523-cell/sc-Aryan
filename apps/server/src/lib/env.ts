import "dotenv/config";
import { z } from "zod";

const EnvSchema = z.object({
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  PORT: z.coerce.number().int().min(1).max(65535).default(3001),
  DATABASE_URL: z.string().url("DATABASE_URL must be a valid connection string"),
  ANTHROPIC_API_KEY: z.string().min(1, "ANTHROPIC_API_KEY is required"),
  // Window of messages sent to the LLM — keeps token usage predictable.
  MAX_HISTORY_MESSAGES: z.coerce.number().int().min(1).max(100).default(12),
  // Hard cap on LLM response length.
  LLM_MAX_TOKENS: z.coerce.number().int().min(1).max(4096).default(1024),
  // Milliseconds before we give up on an LLM call.
  LLM_TIMEOUT_MS: z.coerce.number().int().min(1000).default(30_000),
  // Anthropic model ID — haiku is the right default for a support chatbot (fast + cheap).
  LLM_MODEL: z.string().default("claude-haiku-4-5-20251001"),
  CORS_ORIGIN: z.string().default("http://localhost:5173"),
});

// Fail fast at startup if any required var is missing or malformed.
const parsed = EnvSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("❌ Invalid environment variables:");
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
export type Env = typeof env;
