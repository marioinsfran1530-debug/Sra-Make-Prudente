import { PrismaClient } from "@prisma/client";

// Evita múltiplas instâncias do Prisma Client em hot-reload no dev.
// Usado apenas server-side (Route Handlers, Server Components), nunca
// importado por um arquivo "use client".
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
