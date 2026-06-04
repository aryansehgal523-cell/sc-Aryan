import Fastify from "fastify";
import cors from "@fastify/cors";
import { env } from "./lib/env.js";
import { logger } from "./lib/logger.js";
import { AppError } from "./lib/errors.js";
import { fail } from "./lib/response.js";
import { ErrorCode } from "@spur-chat/shared";
import { chatRoutes } from "./routes/chat.route.js";

export function buildApp() {
  const app = Fastify({
    logger: false, // We use pino directly so Fastify doesn't double-log
    ajv: { customOptions: { strict: false } },
  });

  // ── CORS ──────────────────────────────────────────────────────────────────
  // Origin validation: allow the configured frontend origin plus any request
  // without an Origin header (healthchecks, curl). For production hardening,
  // replace `true` with an exact origin allowlist.
  app.register(cors, {
    origin: (origin, cb) => {
      // No origin = server-to-server / healthcheck — always allow.
      if (!origin) return cb(null, true);
      // Configured frontend origin — allow.
      if (origin === env.CORS_ORIGIN) return cb(null, true);
      // Same-host variation with or without trailing slash — allow.
      const stripped = origin.replace(/\/$/, "");
      const configured = env.CORS_ORIGIN.replace(/\/$/, "");
      if (stripped === configured) return cb(null, true);
      // Anything else — reject cleanly (no thrown error, just false).
      cb(null, false);
    },
    methods: ["GET", "POST", "OPTIONS"],
  });

  // ── Health check ─────────────────────────────────────────────────────────
  app.get("/health", async (_req, reply) => {
    return reply.send({ ok: true, data: { status: "ok", ts: new Date().toISOString() } });
  });

  // ── API routes ────────────────────────────────────────────────────────────
  app.register(chatRoutes, { prefix: "/api/v1/chat" });

  // ── Centralized error handler ─────────────────────────────────────────────
  // All thrown errors (including from plugins/routes) flow through here.
  // We never let raw error details leak to the client.
  app.setErrorHandler((error, _req, reply) => {
    if (error instanceof AppError) {
      logger.warn({ err: error.message, code: error.code }, "AppError");
      return reply
        .status(error.statusCode)
        .send(fail(error.code, error.message));
    }

    // Fastify schema validation errors
    if (error.validation) {
      logger.debug({ err: error.message }, "Fastify validation error");
      return reply
        .status(400)
        .send(fail(ErrorCode.VALIDATION_ERROR, error.message));
    }

    // Fastify body-parser errors (malformed JSON, wrong Content-Type, etc.)
    // These arrive with a pre-set statusCode < 500 but are not AppErrors.
    // Return them in our envelope so clients always get consistent JSON.
    if (typeof error.statusCode === "number" && error.statusCode < 500) {
      logger.debug({ err: error.message }, "Fastify client error");
      return reply
        .status(error.statusCode)
        .send(fail(ErrorCode.VALIDATION_ERROR, "Invalid request"));
    }

    // Unexpected errors — log the full error, send a safe message
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
