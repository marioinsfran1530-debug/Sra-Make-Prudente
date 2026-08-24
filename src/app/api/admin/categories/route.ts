import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-auth";
import { indexNowPaths, notifyIndexNow } from "@/lib/indexnow";

function slugify(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export async function GET() {
  const { error, status } = await requireAdmin("EDITOR");
  if (error) return NextResponse.json({ error }, { status });

  const categories = await prisma.category.findMany({
    include: { subcategories: true },
    orderBy: { order: "asc" },
  });

  return NextResponse.json({ categories });
}

export async function POST(request: NextRequest) {
  const { error, status } = await requireAdmin("EDITOR");
  if (error) return NextResponse.json({ error }, { status });

  const body = await request.json();

  const category = await prisma.category.create({
    data: {
      name: body.name,
      slug: body.slug || slugify(body.name),
      description: body.description || null,
      order: body.order ?? 0,
      active: body.active ?? true,
    },
  });

  await notifyIndexNow([
    indexNowPaths.category(category.slug),
    indexNowPaths.catalog,
    indexNowPaths.sitemap,
  ]);

  return NextResponse.json({ category });
}
