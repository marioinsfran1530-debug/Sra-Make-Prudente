import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-auth";

const BUCKET = "product-images";

async function normalizeOrders(productId: string) {
  const images = await prisma.productImage.findMany({
    where: { productId },
    orderBy: [{ order: "asc" }, { createdAt: "asc" }],
    select: { id: true },
  });

  await prisma.$transaction(
    images.map((image, index) =>
      prisma.productImage.update({
        where: { id: image.id },
        data: { order: index },
      })
    )
  );
}

export async function PATCH(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { error, status } = await requireAdmin("EDITOR");
  if (error) return NextResponse.json({ error }, { status });

  try {
    const image = await prisma.productImage.findUnique({ where: { id } });
    if (!image) {
      return NextResponse.json({ error: "Imagem não encontrada." }, { status: 404 });
    }

    const siblings = await prisma.productImage.findMany({
      where: { productId: image.productId },
      orderBy: [{ order: "asc" }, { createdAt: "asc" }],
      select: { id: true },
    });

    const orderedIds = [id, ...siblings.filter((item) => item.id !== id).map((item) => item.id)];

    await prisma.$transaction(
      orderedIds.map((imageId, index) =>
        prisma.productImage.update({
          where: { id: imageId },
          data: { order: index },
        })
      )
    );

    const images = await prisma.productImage.findMany({
      where: { productId: image.productId },
      orderBy: { order: "asc" },
      select: { id: true, url: true, storagePath: true, order: true },
    });

    return NextResponse.json({ images });
  } catch (error) {
    console.error("ERRO AO DEFINIR IMAGEM PRINCIPAL:", error);
    return NextResponse.json(
      { error: "Não foi possível definir a imagem principal." },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { error, status } = await requireAdmin("EDITOR");
  if (error) return NextResponse.json({ error }, { status });

  try {
    const image = await prisma.productImage.findUnique({ where: { id } });
    if (!image) {
      return NextResponse.json({ error: "Imagem não encontrada." }, { status: 404 });
    }

    await prisma.productImage.delete({ where: { id } });
    await normalizeOrders(image.productId);

    if (image.storagePath) {
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );

      const { error: storageError } = await supabase.storage
        .from(BUCKET)
        .remove([image.storagePath]);

      if (storageError) {
        console.warn("Não foi possível remover a imagem do Storage:", storageError);
      }
    }

    const images = await prisma.productImage.findMany({
      where: { productId: image.productId },
      orderBy: { order: "asc" },
      select: { id: true, url: true, storagePath: true, order: true },
    });

    return NextResponse.json({ images });
  } catch (error) {
    console.error("ERRO AO EXCLUIR IMAGEM:", error);
    return NextResponse.json(
      { error: "Não foi possível excluir a imagem." },
      { status: 500 }
    );
  }
}
