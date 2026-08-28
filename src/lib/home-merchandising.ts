import { prisma } from "@/lib/prisma";

export type HomeBrandSettings = {
  homeBrandOrder: string[];
  homeHiddenBrands: string[];
};

export type HomeBrandCount = {
  name: string;
  count: number;
};

const EMPTY_BRAND_KEYS = new Set([
  "",
  "-",
  "n/a",
  "na",
  "sem marca",
  "sem marca definida",
  "nao informado",
  "não informado",
  "generica",
  "genérica",
]);

export function cleanBrandName(value: string | null | undefined) {
  const name = (value ?? "").replace(/\s+/g, " ").trim();
  if (!name) return null;
  if (EMPTY_BRAND_KEYS.has(name.toLocaleLowerCase("pt-BR"))) return null;
  return name;
}

export function brandKey(value: string | null | undefined) {
  const clean = cleanBrandName(value);
  return clean ? clean.toLocaleLowerCase("pt-BR") : "";
}

export function mergeBrandGroups(
  groups: Array<{ brand: string; count: number }>
): HomeBrandCount[] {
  const merged = new Map<string, HomeBrandCount>();

  for (const group of groups) {
    const name = cleanBrandName(group.brand);
    if (!name) continue;
    const key = brandKey(name);
    const current = merged.get(key);

    if (!current) {
      merged.set(key, { name, count: group.count });
      continue;
    }

    const preferIncoming = group.count > current.count;
    merged.set(key, {
      name: preferIncoming ? name : current.name,
      count: current.count + group.count,
    });
  }

  return [...merged.values()].sort(
    (a, b) => b.count - a.count || a.name.localeCompare(b.name, "pt-BR")
  );
}

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
  const hiddenKeys = new Set(settings.homeHiddenBrands.map(brandKey).filter(Boolean));
  const configuredIndex = new Map(
    settings.homeBrandOrder
      .map(brandKey)
      .filter(Boolean)
      .map((key, index) => [key, index] as const)
  );

  return [...brandCounts.entries()]
    .filter(([brand]) => !hiddenKeys.has(brandKey(brand)))
    .sort((a, b) => {
      const aIndex = configuredIndex.get(brandKey(a[0]));
      const bIndex = configuredIndex.get(brandKey(b[0]));
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
