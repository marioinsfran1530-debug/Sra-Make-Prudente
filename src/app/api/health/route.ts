import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Rota simples para validar a Fase 1: confirma que o Next.js está de pé
// e que a conexão com o banco (via Prisma/DATABASE_URL) funciona.
export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({ status: "ok", db: "connected" });
  } catch (err) {
    return NextResponse.json(
      { status: "error", db: "not connected", detail: String(err) },
      { status: 500 }
    );
  }
}
