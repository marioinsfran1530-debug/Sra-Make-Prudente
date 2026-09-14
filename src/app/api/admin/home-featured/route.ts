import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-auth";

function cleanIds(value: unknown) {
  if (!Array.isArray(value)) return null;
  return [
    ...new Set(
      value
        .filter((item): item is string => typeof item === "string")
        .map((item) => item.trim())
        .filter(Boolean)
    ),
  ];
}

export async function PUT(request: NextRequest) {
  const auth = await requireAdmin("EDITOR");
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

  try {
    const body = (await request.json()) as Record<string, unknown>;
    const ids = cleanIds(body.productIds);

    if (ids === null) {
      return NextResponse.json({ error: "Seleção de produtos inválida." }, { status: 400 });
    }
    if (ids.length > 5) {
      return NextResponse.json({ error: "A vitrine aceita no máximo 5 destaques." }, { status: 400 });
    }

    const products = ids.length
      ? await prisma.product.findMany({
          where: { id: { in: ids }, active: true },
          select: { id: true },
        })
      : [];

    if (products.length !== ids.length) {
      return NextResponse.json(
        { error: "Um dos produtos selecionados está inativo ou não existe." },
        { status: 400 }
      );
    }

    const settings = await prisma.storeSettings.findFirst({ select: { id: true } });
    if (!settings) {
      return NextResponse.json(
        { error: "Configure primeiro as informações básicas da loja." },
        { status: 400 }
      );
    }

    await prisma.$transaction(async (tx) => {
      await tx.product.updateMany({
        where: { featured: true },
        data: { featured: false },
      });

      if (ids.length > 0) {
        await tx.product.updateMany({
          where: { id: { in: ids } },
          data: { featured: true },
        });
      }

      await tx.storeSettings.update({
        where: { id: settings.id },
        data: { homeFeaturedOrder: ids },
      });

      await tx.$executeRaw`
        UPDATE "StoreSettings"
        SET "homeHiddenFeatured" = ARRAY[]::TEXT[], "updatedAt" = NOW()
        WHERE "id" = ${settings.id}
      `;
    });

    revalidatePath("/");
    revalidatePath("/previa");

    return NextResponse.json({ ok: true, count: ids.length });
  } catch (error) {
    console.error("ERRO AO SALVAR DESTAQUES DA HOME:", error);
    return NextResponse.json(
      { error: "Não foi possível atualizar os destaques da Home." },
      { status: 500 }
    );
  }
}
