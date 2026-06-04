import { prisma } from "../db/client.js";
import type { Conversation } from "@prisma/client";
import { Channel } from "@spur-chat/shared";

export const conversationRepo = {
  async findById(id: string): Promise<Conversation | null> {
    // Prisma throws PrismaClientKnownRequestError (P2023) when the id is not a
    // valid cuid — treat that the same as "not found" so callers don't have to
    // distinguish between a bad format and a missing row.
    try {
      return await prisma.conversation.findUnique({ where: { id } });
    } catch {
      return null;
    }
  },

  async create(channel: string = Channel.WEB_CHAT): Promise<Conversation> {
    return prisma.conversation.create({ data: { channel } });
  },
};
