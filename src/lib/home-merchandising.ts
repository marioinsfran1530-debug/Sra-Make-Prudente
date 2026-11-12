import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { createTtlCache } from "@/lib/ttl-cache";
import {
  buildPopularitySignals,
  POPULARITY_WEIGHTS,
  type HomePopularitySignals,
  type PopularityRow,
} from "@/lib/home-popularity";

export type { HomePopularitySignals };

export type HomeBrandSettings = {
  homeBrandOrder: string[];
  homeHiddenBrands: string[];
};

export type HomeProductMerchandisingSettings = {
  homeOfferOrder: string[];
  homeFeaturedOrder: string[];
  homeNewOrder: string[];
  homeHiddenOffers: string[];
  homeHiddenFeatured: string[];
  homeHiddenPopular: string[];
  homeHiddenNew: string[];
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

export async function getHomeProductOrderSettings(): Promise<HomeProductMerchandisingSettings> {
  const rows = await prisma.$queryRaw<
    Array<{
      homeOfferOrder: string[] | null;
      homeFeaturedOrder: string[] | null;
      homeNewOrder: string[] | null;
      homeHiddenOffers: string[] | null;
      homeHiddenFeatured: string[] | null;
      homeHiddenPopular: string[] | null;
      homeHiddenNew: string[] | null;
    }>
  >`
    SELECT
      "homeOfferOrder",
      "homeFeaturedOrder",
      "homeNewOrder",
      "homeHiddenOffers",
      "homeHiddenFeatured",
      "homeHiddenPopular",
      "homeHiddenNew"
    FROM "StoreSettings"
    ORDER BY "updatedAt" DESC
    LIMIT 1
  `;

  return {
    homeOfferOrder: rows[0]?.homeOfferOrder ?? [],
    homeFeaturedOrder: rows[0]?.homeFeaturedOrder ?? [],
    homeNewOrder: rows[0]?.homeNewOrder ?? [],
    homeHiddenOffers: rows[0]?.homeHiddenOffers ?? [],
    homeHiddenFeatured: rows[0]?.homeHiddenFeatured ?? [],
    homeHiddenPopular: rows[0]?.homeHiddenPopular ?? [],
    homeHiddenNew: rows[0]?.homeHiddenNew ?? [],
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

export function orderProductsByConfiguredIds<T extends { id: string }>(
  products: T[],
  configuredIds: string[]
) {
  const configuredIndex = new Map(
    configuredIds.map((id, index) => [id, index] as const)
  );

  return [...products].sort((a, b) => {
    const aIndex = configuredIndex.get(a.id);
    const bIndex = configuredIndex.get(b.id);
    const aConfigured = aIndex !== undefined;
    const bConfigured = bIndex !== undefined;

    if (aConfigured && bConfigured) return aIndex - bIndex;
    if (aConfigured) return -1;
    if (bConfigured) return 1;
    return 0;
  });
}

export function excludeHiddenProducts<T extends { id: string }>(
  products: T[],
  hiddenIds: string[]
) {
  if (hiddenIds.length === 0) return products;
  const hidden = new Set(hiddenIds);
  return products.filter((product) => !hidden.has(product.id));
}

async function loadHomePopularitySignals(days: number): Promise<HomePopularitySignals> {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const events = Object.keys(POPULARITY_WEIGHTS);
  // O banco devolve só uma linha por produto e tipo de evento (e um total de sessões),
  // não os milhares de eventos individuais. Mesmo critério de antes: eventos de
  // produto dos últimos `days` dias, sem os vindos de vercel.com.
  const where = Prisma.sql`
    "createdAt" >= ${since}
    AND "productId" IS NOT NULL
    AND "event" IN (${Prisma.join(events)})
    AND ("origin" IS NULL OR "origin" <> 'vercel.com')
  `;

  const [rows, totals] = await Promise.all([
    prisma.$queryRaw<PopularityRow[]>(Prisma.sql`
      SELECT "productId", "event", COUNT(DISTINCT "sessionId") AS "sessions"
      FROM "AnalyticsEvent"
      WHERE ${where}
      GROUP BY "productId", "event"
    `),
    prisma.$queryRaw<Array<{ sessions: bigint | number }>>(Prisma.sql`
      SELECT COUNT(DISTINCT "sessionId") AS "sessions"
      FROM "AnalyticsEvent"
      WHERE ${where}
    `),
  ]);

  return buildPopularitySignals(rows, totals[0]?.sessions ?? 0);
}

const DEFAULT_POPULARITY_DAYS = 30;

// A popularidade muda devagar: um minuto de atraso não aparece para o cliente e evita
// refazer a conta a cada visita à home.
const popularityCache = createTtlCache(
  () => loadHomePopularitySignals(DEFAULT_POPULARITY_DAYS),
  60_000
);

export function getHomePopularitySignals(
  days = DEFAULT_POPULARITY_DAYS
): Promise<HomePopularitySignals> {
  return days === DEFAULT_POPULARITY_DAYS
    ? popularityCache.get()
    : loadHomePopularitySignals(days);
}

export function rankPopularProducts<T extends { id: string; bestSeller: boolean }>(
  products: T[],
  signals: HomePopularitySignals
) {
  const tagged = products.filter((product) => product.bestSeller);
  if (!signals.enoughData) return tagged;

  return [...tagged].sort((a, b) => {
    const scoreDiff = (signals.scores.get(b.id) ?? 0) - (signals.scores.get(a.id) ?? 0);
    return scoreDiff;
  });
}
