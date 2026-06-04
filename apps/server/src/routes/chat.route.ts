import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { ChatService } from "../services/chat.service.js";
import { ok } from "../lib/response.js";
import { ValidationError } from "../lib/errors.js";

const SendMessageBody = z.object({
  message: z
    .string()
    .trim()
    .min(1, "Message cannot be empty")
    .max(4000, "Message must be 4000 characters or fewer"),
  sessionId: z.string().optional(),
});

// One service instance shared across requests — stateless, safe to reuse.
const chatService = new ChatService();

export const chatRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.post("/message", async (request, reply) => {
    const result = SendMessageBody.safeParse(request.body);
    if (!result.success) {
      const msg =
        result.error.issues[0]?.message ?? "Invalid request body";
      throw new ValidationError(msg);
    }

    const data = await chatService.sendMessage(
      result.data.message,
      result.data.sessionId,
    );
    return reply.send(ok(data));
  });

  fastify.get<{ Params: { sessionId: string } }>(
    "/:sessionId/messages",
    async (request, reply) => {
      const { sessionId } = request.params;
      const data = await chatService.getHistory(sessionId);
      return reply.send(ok(data));
    },
  );
};
