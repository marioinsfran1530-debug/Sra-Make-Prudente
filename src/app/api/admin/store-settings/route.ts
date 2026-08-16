import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-auth";

export async function GET() {
  const { error, status } = await requireAdmin("EDITOR");

  if (error) {
    return NextResponse.json({ error }, { status });
  }

  const settings = await prisma.storeSettings.findFirst();

  return NextResponse.json({ settings });
}

export async function PUT(request: NextRequest) {
  const { error, status } = await requireAdmin("EDITOR");

  if (error) {
    return NextResponse.json({ error }, { status });
  }

  try {
    const body = await request.json();

    const current = await prisma.storeSettings.findFirst();

    const data = {
      storeName: String(body.storeName ?? "Sra Make Prudente").trim(),
      whatsapp: String(body.whatsapp ?? "").trim(),
      instagram: String(body.instagram ?? "").trim() || null,
      facebook: String(body.facebook ?? "").trim() || null,
      address: String(body.address ?? "").trim() || null,
      googleMapsUrl: String(body.googleMapsUrl ?? "").trim() || null,
      businessHours: String(body.businessHours ?? "").trim() || null,
    };

    if (!data.storeName) {
      return NextResponse.json(
        { error: "O nome da loja é obrigatório." },
        { status: 400 }
      );
    }

    if (!data.whatsapp) {
      return NextResponse.json(
        { error: "O WhatsApp é obrigatório." },
        { status: 400 }
      );
    }

    const settings = current
      ? await prisma.storeSettings.update({
          where: { id: current.id },
          data,
        })
      : await prisma.storeSettings.create({
          data,
        });

    return NextResponse.json({ settings });
  } catch (error) {
    console.error("ERRO AO SALVAR CONFIGURAÇÕES DA LOJA:", error);

    return NextResponse.json(
      { error: "Não foi possível salvar as informações da loja." },
      { status: 500 }
    );
  }
}
