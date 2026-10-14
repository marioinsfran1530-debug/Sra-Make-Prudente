import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-auth";

function text(value: unknown, maxLength: number) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

export async function POST(request: Request) {
  const { session, error, status } = await requireAdmin("EDITOR");
  if (error || !session) {
    return NextResponse.json({ error }, { status });
  }

  try {
    const body = await request.json();

    const deviceId = text(body.deviceId, 200);
    const token = text(body.token, 4096);

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
        isAdmin: true,
        adminId: session.id,
        active: true,
        lastSeenAt: new Date(),
      },
      create: {
        deviceId,
        token,
        isAdmin: true,
        adminId: session.id,
        active: true,
        lastSeenAt: new Date(),
      },
    });

    return NextResponse.json({ ok: true, id: subscription.id });
  } catch (error) {
    console.error("Erro ao registrar PushSubscription do admin:", error);

    return NextResponse.json(
      { error: "Não foi possível registrar este aparelho." },
      { status: 400 }
    );
  }
}

export async function DELETE(request: Request) {
  const { session, error, status } = await requireAdmin("EDITOR");
  if (error || !session) {
    return NextResponse.json({ error }, { status });
  }

  try {
    const body = await request.json();
    const deviceId = text(body.deviceId, 200);

    if (!deviceId) {
      return NextResponse.json({ error: "Dispositivo não informado." }, { status: 400 });
    }

    await prisma.pushSubscription.updateMany({
      where: { deviceId, adminId: session.id },
      data: { active: false },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Erro ao desativar PushSubscription do admin:", error);
    return NextResponse.json({ error: "Não foi possível desativar." }, { status: 400 });
  }
}
