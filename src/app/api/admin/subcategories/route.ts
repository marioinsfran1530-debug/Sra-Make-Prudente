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

export async function POST(request: NextRequest) {
  const { error, status } = await requireAdmin("EDITOR");

  if (error) {
    return NextResponse.json({ error }, { status });
  }

  try {
    const body = await request.json();

    const name = String(body.name ?? "").trim();
    const categoryId = String(body.categoryId ?? "").trim();

    if (!name) {
      return NextResponse.json(
        { error: "Informe o nome da subcategoria." },
        { status: 400 }
      );
    }

    if (!categoryId) {
      return NextResponse.json(
        { error: "Categoria não informada." },
        { status: 400 }
      );
    }

    const category = await prisma.category.findUnique({
      where: { id: categoryId },
      select: { id: true },
    });

    if (!category) {
      return NextResponse.json(
        { error: "Categoria não encontrada." },
        { status: 404 }
      );
    }

    const slug = slugify(name);

    const duplicate = await prisma.subcategory.findFirst({
      where: {
        categoryId,
        slug,
      },
    });

    if (duplicate) {
      return NextResponse.json(
        { error: "Essa subcategoria já existe nesta categoria." },
        { status: 409 }
      );
    }

    const subcategory = await prisma.subcategory.create({
      data: {
        name,
        slug,
        categoryId,
      },
    });

    return NextResponse.json(
      { subcategory },
      { status: 201 }
    );
  } catch (error) {
    console.error("ERRO AO CRIAR SUBCATEGORIA:", error);

    return NextResponse.json(
      { error: "Não foi possível criar a subcategoria." },
      { status: 500 }
    );
  }
}
