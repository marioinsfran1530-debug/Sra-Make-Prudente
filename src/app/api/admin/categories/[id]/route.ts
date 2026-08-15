import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-auth";

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  const { error, status } = await requireAdmin("EDITOR");
  if (error) return NextResponse.json({ error }, { status });

  const body = await request.json();

  const category = await prisma.category.update({
    where: { id: params.id },
    data: {
      name: body.name,
      description: body.description || null,
      order: body.order,
      active: body.active,
    },
  });

  return NextResponse.json({ category });
}
