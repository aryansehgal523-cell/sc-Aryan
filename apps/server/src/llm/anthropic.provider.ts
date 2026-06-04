import Anthropic from "@anthropic-ai/sdk";
import type { LLMProvider, LLMMessage } from "./provider.interface.js";
import { SYSTEM_PROMPT } from "./prompt.js";
import { LLMUnavailableError } from "../lib/errors.js";
import { env } from "../lib/env.js";
import { logger } from "../lib/logger.js";

export class AnthropicProvider implements LLMProvider {
  private readonly client: Anthropic;

  constructor() {
    this.client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
  }

  async generateReply(
    history: LLMMessage[],
    userMessage: string,
  ): Promise<string> {
    const messages: Anthropic.MessageParam[] = [
      ...history.map((m) => ({
        role: m.role,
        content: m.content,
      })),
      { role: "user" as const, content: userMessage },
    ];

    const attempt = async (): Promise<string> => {
      const controller = new AbortController();
      const timer = setTimeout(
        () => controller.abort(),
        env.LLM_TIMEOUT_MS,
      );

      try {
        const response = await this.client.messages.create(
          {
            model: env.LLM_MODEL,
            max_tokens: env.LLM_MAX_TOKENS,
            system: SYSTEM_PROMPT,
            messages,
          },
          { signal: controller.signal },
        );

        const block = response.content[0];
        if (!block || block.type !== "text") {
          throw new LLMUnavailableError("Unexpected content format from LLM");
        }
        return block.text;
      } finally {
        clearTimeout(timer);
      }
    };

    try {
      return await attempt();
    } catch (err) {
      if (err instanceof LLMUnavailableError) throw err;

      if (!isTransient(err)) {
        logger.error({ err }, "Non-transient LLM error");
        throw new LLMUnavailableError();
      }

      logger.warn({ err }, "Transient LLM error — retrying once");
      try {
        return await attempt();
      } catch (retryErr) {
        logger.error({ err: retryErr }, "LLM retry failed");
        throw new LLMUnavailableError();
      }
    }
  }
}

function isTransient(err: unknown): boolean {
  if (err instanceof Anthropic.APIConnectionError) return true;
  if (err instanceof Anthropic.APIConnectionTimeoutError) return true;
  if (err instanceof Anthropic.RateLimitError) return true;
  if (err instanceof Anthropic.InternalServerError) return true;
  // AbortController timeout fires as a DOMException AbortError
  if (err instanceof DOMException && err.name === "AbortError") return true;
  return false;
}
