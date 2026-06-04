import { PrismaClient } from "@prisma/client";
import { logger } from "../lib/logger.js";

// Singleton pattern — one pool shared across the process lifetime.
const prisma = new PrismaClient({
  log:
    process.env["NODE_ENV"] === "production"
      ? ["error"]
      : ["query", "warn", "error"],
});

export async function connectDB(): Promise<void> {
  await prisma.$connect();
  logger.info("Database connected");
}

export async function disconnectDB(): Promise<void> {
  await prisma.$disconnect();
}

export { prisma };
