import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  getHomeBrandSettings,
  mergeBrandGroups,
  orderBrandsForHome,
} from "@/lib/home-merchandising";

export const dynamic = "force-dynamic";

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

  const mergedBrands = mergeBrandGroups(
    brandGroups.map((item) => ({ brand: item.brand, count: item._count._all }))
  );
  const brandCounts = new Map(mergedBrands.map((brand) => [brand.name, brand.count]));

  return NextResponse.json(
    {
      categories: categoryRows,
      brands: orderBrandsForHome(brandCounts, brandSettings, 10),
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}
