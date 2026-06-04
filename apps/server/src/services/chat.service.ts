import type {
  SendMessageResponse,
  GetHistoryResponse,
  MessageDTO,
} from "@spur-chat/shared";
import { Sender } from "@spur-chat/shared";
import type { Message } from "@prisma/client";
import { conversationRepo } from "../repositories/conversation.repo.js";
import { messageRepo } from "../repositories/message.repo.js";
import { AnthropicProvider } from "../llm/anthropic.provider.js";
import type { LLMProvider, LLMMessage } from "../llm/provider.interface.js";
import { NotFoundError } from "../lib/errors.js";
import { env } from "../lib/env.js";

function toDTO(msg: Message): MessageDTO {
  return {
    id: msg.id,
    sender: msg.sender as Sender, // Prisma enum values are identical string literals
    text: msg.text,
    createdAt: msg.createdAt.toISOString(),
  };
}

export class ChatService {
  private readonly llm: LLMProvider;

  // LLM provider is injected so tests can swap in a stub without touching the DB.
  constructor(llm: LLMProvider = new AnthropicProvider()) {
    this.llm = llm;
  }

  async sendMessage(
    userText: string,
    sessionId?: string,
  ): Promise<SendMessageResponse> {
    // Resolve or create conversation — unknown sessionId silently creates a new one.
    const conversationId = await this.resolveConversation(sessionId);

    // Persist the user message before calling the LLM so it's never lost even
    // if the LLM call fails.
    const userMsg = await messageRepo.create(conversationId, Sender.USER, userText);

    // Load windowed history (includes the just-saved message as the final entry).
    const recent = await messageRepo.getRecent(
      conversationId,
      env.MAX_HISTORY_MESSAGES,
    );

    // Split: everything except the last entry is prior context; the last is the
    // current turn the LLM sees as its immediate prompt.
    const history: LLMMessage[] = recent.slice(0, -1).map((m) => ({
      role: m.sender === "USER" ? "user" : "assistant",
      content: m.text,
    }));

    // LLMUnavailableError propagates to the centralized error handler untouched.
    const aiText = await this.llm.generateReply(history, userText);

    const aiMsg = await messageRepo.create(conversationId, Sender.AI, aiText);

    return {
      sessionId: conversationId,
      userMessage: toDTO(userMsg),
      aiMessage: toDTO(aiMsg),
    };
  }

  async getHistory(sessionId: string): Promise<GetHistoryResponse> {
    const conversation = await conversationRepo.findById(sessionId);
    if (!conversation) {
      throw new NotFoundError(`Conversation not found`);
    }

    const messages = await messageRepo.getAll(sessionId);
    return {
      sessionId,
      messages: messages.map(toDTO),
    };
  }

  private async resolveConversation(sessionId?: string): Promise<string> {
    if (sessionId) {
      const existing = await conversationRepo.findById(sessionId);
      if (existing) return existing.id;
    }
    const created = await conversationRepo.create();
    return created.id;
  }
}
