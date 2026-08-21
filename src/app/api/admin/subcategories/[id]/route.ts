import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-auth";

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

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
    const name = String(body.name ?? "").trim();

    if (!name) {
      return NextResponse.json(
        { error: "Informe o nome da subcategoria." },
        { status: 400 }
      );
    }

    const current = await prisma.subcategory.findUnique({ where: { id } });

    if (!current) {
      return NextResponse.json(
        { error: "Subcategoria não encontrada." },
        { status: 404 }
      );
    }

    const slug = slugify(name);

    const duplicate = await prisma.subcategory.findFirst({
      where: {
        categoryId: current.categoryId,
        slug,
        NOT: { id: current.id },
      },
    });

    if (duplicate) {
      return NextResponse.json(
        { error: "Essa subcategoria já existe nesta categoria." },
        { status: 409 }
      );
    }

    const subcategory = await prisma.subcategory.update({
      where: { id },
      data: { name, slug },
    });

    return NextResponse.json({ subcategory });
  } catch (error) {
    console.error("ERRO AO EDITAR SUBCATEGORIA:", error);
    return NextResponse.json(
      { error: "Não foi possível editar a subcategoria." },
      { status: 500 }
    );
  }
}
