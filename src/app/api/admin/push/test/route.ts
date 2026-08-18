import { NextResponse } from "next/server";
import { getMessaging } from "firebase-admin/messaging";
import { firebaseAdminApp } from "@/lib/firebase-admin";
import { requireAdmin } from "@/lib/admin-auth";

export async function POST(request: Request) {
  const { error, status } = await requireAdmin("EDITOR");

  if (error) {
    return NextResponse.json(
      { error },
      { status }
    );
  }

  try {
    const body = await request.json();
    const token = String(body.token ?? "").trim();

    if (!token) {
      return NextResponse.json(
        { error: "Token do dispositivo não informado." },
        { status: 400 }
      );
    }

    const messageId = await getMessaging(firebaseAdminApp).send({
      token,
      notification: {
        title: "Sra Make Prudente",
        body: "Teste de notificação funcionando!",
      },
      webpush: {
        fcmOptions: {
          link: "/loja",
        },
      },
    });

    return NextResponse.json({
      ok: true,
      messageId,
    });
  } catch (error) {
    console.error("Erro ao enviar push:", error);

    return NextResponse.json(
      { error: "Não foi possível enviar a notificação." },
      { status: 500 }
    );
  }
}
