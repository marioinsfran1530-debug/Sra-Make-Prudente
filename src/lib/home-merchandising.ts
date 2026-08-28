import { prisma } from "@/lib/prisma";

export type HomeBrandSettings = {
  homeBrandOrder: string[];
  homeHiddenBrands: string[];
};

export type HomeProductOrderSettings = {
  homeFeaturedOrder: string[];
  homeNewOrder: string[];
};

export type HomeBrandCount = {
  name: string;
  count: number;
};

export type HomePopularitySignals = {
  enoughData: boolean;
  uniqueSessions: number;
  totalSignals: number;
  scores: Map<string, number>;
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

const POPULARITY_WEIGHTS: Record<string, number> = {
  product_view: 1,
  whatsapp_click: 3,
  add_to_cart: 4,
};

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

export async function getHomeProductOrderSettings(): Promise<HomeProductOrderSettings> {
  const settings = await prisma.storeSettings.findFirst({
    orderBy: { updatedAt: "desc" },
    select: {
      homeFeaturedOrder: true,
      homeNewOrder: true,
    },
  });

  return {
    homeFeaturedOrder: settings?.homeFeaturedOrder ?? [],
    homeNewOrder: settings?.homeNewOrder ?? [],
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

export async function getHomePopularitySignals(days = 30): Promise<HomePopularitySignals> {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const rows = await prisma.analyticsEvent.findMany({
    where: {
      createdAt: { gte: since },
      productId: { not: null },
      event: { in: Object.keys(POPULARITY_WEIGHTS) },
      OR: [{ origin: null }, { origin: { not: "vercel.com" } }],
    },
    select: {
      productId: true,
      sessionId: true,
      event: true,
    },
  });

  const commercialSessions = new Set<string>();
  const uniqueSignals = new Set<string>();
  const scores = new Map<string, number>();

  for (const row of rows) {
    if (!row.productId) continue;
    commercialSessions.add(row.sessionId);
    const signalKey = `${row.productId}:${row.sessionId}:${row.event}`;
    if (uniqueSignals.has(signalKey)) continue;
    uniqueSignals.add(signalKey);
    scores.set(
      row.productId,
      (scores.get(row.productId) ?? 0) + (POPULARITY_WEIGHTS[row.event] ?? 0)
    );
  }

  // Com tráfego muito baixo, uma única pessoa pode distorcer a vitrine.
  // A tag bestSeller continua sendo a fonte editorial até termos uma base mínima.
  const enoughData = commercialSessions.size >= 5 && uniqueSignals.size >= 8;

  return {
    enoughData,
    uniqueSessions: commercialSessions.size,
    totalSignals: uniqueSignals.size,
    scores,
  };
}

export function rankPopularProducts<T extends { id: string; bestSeller: boolean }>(
  products: T[],
  signals: HomePopularitySignals
) {
  const tagged = products.filter((product) => product.bestSeller);
  if (!signals.enoughData) return tagged;

  const scored = products
    .filter((product) => (signals.scores.get(product.id) ?? 0) > 0)
    .sort((a, b) => {
      const scoreDiff = (signals.scores.get(b.id) ?? 0) - (signals.scores.get(a.id) ?? 0);
      if (scoreDiff !== 0) return scoreDiff;
      if (a.bestSeller !== b.bestSeller) return a.bestSeller ? -1 : 1;
      return 0;
    });

  const scoredIds = new Set(scored.map((product) => product.id));
  return [...scored, ...tagged.filter((product) => !scoredIds.has(product.id))];
}
