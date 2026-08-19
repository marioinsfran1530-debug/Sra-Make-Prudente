import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function text(value: unknown, maxLength: number) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

export async function POST(request: Request) {
  try {
    const contentLength = Number(request.headers.get("content-length") ?? 0);
    if (contentLength > 16 * 1024) {
      return NextResponse.json({ error: "Dados muito grandes." }, { status: 413 });
    }

    const body = await request.json();

    const deviceId = text(body.deviceId, 200);
    const token = text(body.token, 4096);
    const sessionId = text(body.sessionId, 200) || null;
    const phone = text(body.phone, 30) || null;

    if (!deviceId || !token) {
      return NextResponse.json(
        { error: "Dispositivo ou token não informado." },
        { status: 400 }
      );
    }

    const subscription = await prisma.pushSubscription.upsert({
      where: { deviceId },
      update: {
        token,
        sessionId,
        phone,
        active: true,
        lastSeenAt: new Date(),
      },
      create: {
        deviceId,
        token,
        sessionId,
        phone,
        active: true,
        lastSeenAt: new Date(),
      },
    });

    return NextResponse.json({
      ok: true,
      id: subscription.id,
    });
  } catch (error) {
    console.error("Erro ao registrar PushSubscription:", error);

    return NextResponse.json(
      { error: "Não foi possível registrar este aparelho." },
      { status: 400 }
    );
  }
}
