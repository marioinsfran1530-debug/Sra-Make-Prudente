import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getHomeBrandSettings, orderBrandsForHome } from "@/lib/home-merchandising";

export const revalidate = 30;

export async function GET() {
  const [categoryRows, brandGroups, brandSettings] = await Promise.all([
    prisma.$queryRaw<Array<{ slug: string; order: number; showOnHome: boolean }>>`
      SELECT "slug", "order", "showOnHome"
      FROM "Category"
      WHERE "active" = true
      ORDER BY "order" ASC, "name" ASC
    `,
    prisma.product.groupBy({
      by: ["brand"],
      where: { active: true },
      _count: { _all: true },
    }),
    getHomeBrandSettings(),
  ]);

  const brandCounts = new Map<string, number>();
  for (const item of brandGroups) {
    const brand = item.brand.trim();
    if (!brand) continue;
    brandCounts.set(brand, (brandCounts.get(brand) ?? 0) + item._count._all);
  }

  return NextResponse.json({
    categories: categoryRows,
    brands: orderBrandsForHome(brandCounts, brandSettings, 10),
  });
}
