import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const deviceId = String(body.deviceId ?? "").trim();
    const token = String(body.token ?? "").trim();
    const sessionId = String(body.sessionId ?? "").trim() || null;
    const phone = String(body.phone ?? "").trim() || null;

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
      { status: 500 }
    );
  }
}
