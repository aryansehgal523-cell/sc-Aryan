import { prisma } from "../db/client.js";
import type { Message, Sender as PrismaSender } from "@prisma/client";
import type { Sender } from "@spur-chat/shared";

export const messageRepo = {
  async create(
    conversationId: string,
    sender: Sender,
    text: string,
  ): Promise<Message> {
    return prisma.message.create({
      data: {
        conversationId,
        // Prisma's Sender enum values are identical strings ("USER" | "AI")
        sender: sender as PrismaSender,
        text,
      },
    });
  },

  // Returns the most recent `limit` messages, oldest-first (correct order for LLM context).
  async getRecent(conversationId: string, limit: number): Promise<Message[]> {
    const rows = await prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: "desc" },
      take: limit,
    });
    return rows.reverse();
  },

  async getAll(conversationId: string): Promise<Message[]> {
    return prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: "asc" },
    });
  },
};
