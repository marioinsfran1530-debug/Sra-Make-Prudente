import { prisma } from "@/lib/prisma";

export type HomeBrandSettings = {
  homeBrandOrder: string[];
  homeHiddenBrands: string[];
};

export async function getHomeCategoryVisibility() {
  const rows = await prisma.$queryRaw<Array<{ id: string; showOnHome: boolean }>>`
    SELECT "id", "showOnHome"
    FROM "Category"
  `;

  return new Map(rows.map((row) => [row.id, row.showOnHome]));
}

export async function getHomeBrandSettings(): Promise<HomeBrandSettings> {
  const rows = await prisma.$queryRaw<
    Array<{ homeBrandOrder: string[] | null; homeHiddenBrands: string[] | null }>
  >`
    SELECT "homeBrandOrder", "homeHiddenBrands"
    FROM "StoreSettings"
    ORDER BY "updatedAt" DESC
    LIMIT 1
  `;

  return {
    homeBrandOrder: rows[0]?.homeBrandOrder ?? [],
    homeHiddenBrands: rows[0]?.homeHiddenBrands ?? [],
  };
}

export function orderBrandsForHome(
  brandCounts: Map<string, number>,
  settings: HomeBrandSettings,
  limit = 10
) {
  const hidden = new Set(settings.homeHiddenBrands.map((brand) => brand.trim()).filter(Boolean));
  const configuredIndex = new Map(
    settings.homeBrandOrder
      .map((brand) => brand.trim())
      .filter(Boolean)
      .map((brand, index) => [brand, index] as const)
  );

  return [...brandCounts.entries()]
    .filter(([brand]) => !hidden.has(brand))
    .sort((a, b) => {
      const aIndex = configuredIndex.get(a[0]);
      const bIndex = configuredIndex.get(b[0]);
      const aConfigured = aIndex !== undefined;
      const bConfigured = bIndex !== undefined;

      if (aConfigured && bConfigured) return aIndex - bIndex;
      if (aConfigured) return -1;
      if (bConfigured) return 1;
      return b[1] - a[1] || a[0].localeCompare(b[0], "pt-BR");
    })
    .slice(0, limit)
    .map(([brand]) => brand);
}
