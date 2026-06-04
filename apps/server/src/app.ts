import Fastify from "fastify";
import { env } from "./lib/env.js";
import { logger } from "./lib/logger.js";
import { AppError } from "./lib/errors.js";
import { fail } from "./lib/response.js";
import { ErrorCode } from "@spur-chat/shared";
import { chatRoutes } from "./routes/chat.route.js";

export function buildApp() {
  const app = Fastify({
    logger: false,
    ajv: { customOptions: { strict: false } },
  });

  // ── CORS ──────────────────────────────────────────────────────────────────
  // Manual hook instead of @fastify/cors so OPTIONS preflight is guaranteed
  // to be handled regardless of plugin registration order or version quirks.
  app.addHook("onRequest", async (request, reply) => {
    const origin = request.headers.origin;

    // Reflect the allowed origin; requests without Origin pass through freely.
    if (origin === env.CORS_ORIGIN || origin === env.CORS_ORIGIN.replace(/\/$/, "")) {
      reply.header("Access-Control-Allow-Origin", origin);
    } else if (!origin) {
      // Server-to-server / healthcheck — no CORS header needed.
    }

    reply.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    reply.header("Access-Control-Allow-Headers", "Content-Type");
    reply.header("Access-Control-Max-Age", "86400");
    reply.header("Vary", "Origin");

    // Answer the preflight immediately — never let it fall through to routes.
    if (request.method === "OPTIONS") {
      await reply.code(204).send();
    }
  });

  // ── Health check ─────────────────────────────────────────────────────────
  app.get("/health", async (_req, reply) => {
    return reply.send({ ok: true, data: { status: "ok", ts: new Date().toISOString() } });
  });

  // ── API routes ────────────────────────────────────────────────────────────
  app.register(chatRoutes, { prefix: "/api/v1/chat" });

  // ── Centralized error handler ─────────────────────────────────────────────
  app.setErrorHandler((error, _req, reply) => {
    if (error instanceof AppError) {
      logger.warn({ err: error.message, code: error.code }, "AppError");
      return reply
        .status(error.statusCode)
        .send(fail(error.code, error.message));
    }

    if (error.validation) {
      logger.debug({ err: error.message }, "Fastify validation error");
      return reply
        .status(400)
        .send(fail(ErrorCode.VALIDATION_ERROR, error.message));
    }

    if (typeof error.statusCode === "number" && error.statusCode < 500) {
      logger.debug({ err: error.message }, "Fastify client error");
      return reply
        .status(error.statusCode)
        .send(fail(ErrorCode.VALIDATION_ERROR, "Invalid request"));
    }

    logger.error({ err: error }, "Unhandled error");
    return reply
      .status(500)
      .send(fail(ErrorCode.INTERNAL, "An unexpected error occurred"));
  });

  // ── 404 handler ──────────────────────────────────────────────────────────
  app.setNotFoundHandler((_req, reply) => {
    return reply
      .status(404)
      .send(fail(ErrorCode.NOT_FOUND, "Route not found"));
  });

  return app;
}
