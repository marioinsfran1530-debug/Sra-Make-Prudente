import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-auth";
import { indexNowPaths, notifyIndexNow } from "@/lib/indexnow";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { error, status } = await requireAdmin("EDITOR");

  if (error) {
    return NextResponse.json({ error }, { status });
  }

  try {
    const body = await request.json();
    const name = typeof body.name === "string" ? body.name.trim() : undefined;

    if (name !== undefined && !name) {
      return NextResponse.json(
        { error: "O nome da categoria é obrigatório." },
        { status: 400 }
      );
    }

    const category = await prisma.category.update({
      where: { id },
      data: {
        name,
        description: body.description === undefined ? undefined : body.description || null,
        order: typeof body.order === "number" ? body.order : undefined,
        active: typeof body.active === "boolean" ? body.active : undefined,
      },
    });

    await notifyIndexNow([
      indexNowPaths.category(category.slug),
      indexNowPaths.catalog,
      indexNowPaths.sitemap,
    ]);

    return NextResponse.json({ category });
  } catch (error) {
    console.error("ERRO AO EDITAR CATEGORIA:", error);
    return NextResponse.json(
      { error: "Não foi possível editar a categoria." },
      { status: 500 }
    );
  }
}
