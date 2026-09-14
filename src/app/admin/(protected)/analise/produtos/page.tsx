import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getHomeProductOrderSettings } from "@/lib/home-merchandising";
import { HomeFeaturedPicker } from "@/components/admin/HomeFeaturedPicker";

export const dynamic = "force-dynamic";

type Period = "7d" | "30d" | "month";

const PERIODS: { value: Period; label: string }[] = [
  { value: "7d", label: "7 dias" },
  { value: "30d", label: "30 dias" },
  { value: "month", label: "Este mês" },
];

function getSaoPauloDateParts() {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "numeric",
    day: "numeric",
  }).formatToParts(new Date());
  const get = (type: string) => Number(parts.find((part) => part.type === type)?.value);
  return { year: get("year"), month: get("month"), day: get("day") };
}

function saoPauloMidnightUtc(year: number, month: number, day: number) {
  return new Date(Date.UTC(year, month - 1, day, 3, 0, 0, 0));
}

function getPeriodRange(period: Period) {
  const { year, month, day } = getSaoPauloDateParts();
  const today = saoPauloMidnightUtc(year, month, day);
  const tomorrow = new Date(today);
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);

  if (period === "month") {
    return { gte: saoPauloMidnightUtc(year, month, 1), lt: tomorrow };
  }

  const start = new Date(today);
  start.setUTCDate(start.getUTCDate() - (period === "7d" ? 6 : 29));
  return { gte: start, lt: tomorrow };
}

type ProductStats = {
  views: number;
  carts: number;
  orders: number;
};

export default async function ProductPerformancePage({
  searchParams,
}: {
  searchParams?: Promise<{ period?: string }>;
}) {
  const params = searchParams ? await searchParams : undefined;
  const requested = params?.period;
  const period: Period = PERIODS.some((item) => item.value === requested)
    ? (requested as Period)
    : "30d";
  const range = getPeriodRange(period);

  const [behaviorGroups, finalizedOrders, products, merchandising] = await Promise.all([
    prisma.analyticsEvent.groupBy({
      by: ["productId", "event"],
      where: {
        createdAt: range,
        productId: { not: null },
        event: { in: ["product_view", "add_to_cart"] },
      },
      _count: { _all: true },
    }),
    prisma.order.findMany({
      where: {
        updatedAt: range,
        status: "FINALIZADO",
      },
      select: {
        items: { select: { productId: true } },
      },
    }),
    prisma.product.findMany({
      where: { active: true },
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        name: true,
        brand: true,
        featured: true,
        stockQty: true,
        variants: {
          where: { active: true },
          select: { stockQty: true },
        },
      },
    }),
    getHomeProductOrderSettings(),
  ]);

  const stats = new Map<string, ProductStats>();
  function ensure(productId: string) {
    const current = stats.get(productId);
    if (current) return current;
    const fresh = { views: 0, carts: 0, orders: 0 };
    stats.set(productId, fresh);
    return fresh;
  }

  for (const group of behaviorGroups) {
    if (!group.productId) continue;
    const current = ensure(group.productId);
    if (group.event === "product_view") current.views = group._count._all;
    if (group.event === "add_to_cart") current.carts = group._count._all;
  }

  for (const order of finalizedOrders) {
    const productIds = new Set(order.items.map((item) => item.productId));
    for (const productId of productIds) ensure(productId).orders += 1;
  }

  const options = products
    .map((product) => {
      const stockQty = product.variants.length > 0
        ? product.variants.reduce((sum, variant) => sum + variant.stockQty, 0)
        : product.stockQty;
      const productStats = stats.get(product.id) ?? { views: 0, carts: 0, orders: 0 };
      const score = productStats.orders * 100 + productStats.carts * 15 + productStats.views;
      return {
        id: product.id,
        name: product.name,
        brand: product.brand,
        featured: product.featured,
        stockQty,
        views: productStats.views,
        carts: productStats.carts,
        orders: productStats.orders,
        score,
      };
    })
    .filter((product) => product.stockQty > 0)
    .sort((a, b) => b.score - a.score || b.stockQty - a.stockQty || a.name.localeCompare(b.name, "pt-BR"));

  const featuredSet = new Set(options.filter((product) => product.featured).map((product) => product.id));
  const orderedFeatured = merchandising.homeFeaturedOrder.filter((id) => featuredSet.has(id));
  const remainingFeatured = options
    .filter((product) => product.featured && !orderedFeatured.includes(product.id))
    .map((product) => product.id);
  const selectedIds = [...orderedFeatured, ...remainingFeatured].slice(0, 5);

  const totalViews = options.reduce((sum, product) => sum + product.views, 0);
  const totalCarts = options.reduce((sum, product) => sum + product.carts, 0);
  const totalOrders = options.reduce((sum, product) => sum + product.orders, 0);

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-rosa-profundo">Desempenho</p>
          <h1 className="font-serif text-2xl font-bold text-texto">Escolher destaques da Home</h1>
          <p className="mt-1 max-w-2xl text-sm text-cinza">
            Veja os sinais mais úteis e escolha 5 produtos. Sem tabela e sem excesso de filtros.
          </p>
        </div>
        <Link
          href="/admin/analise"
          className="rounded-xl border border-rosa/20 bg-white px-4 py-2.5 text-xs font-bold text-rosa-profundo"
        >
          Voltar para Análise
        </Link>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {PERIODS.map((item) => {
          const active = item.value === period;
          return (
            <Link
              key={item.value}
              href={item.value === "30d" ? "/admin/analise/produtos" : `/admin/analise/produtos?period=${item.value}`}
              className={`rounded-xl border px-3 py-2 text-xs font-bold ${
                active
                  ? "border-rosa-profundo bg-rosa-profundo text-white"
                  : "border-rosa/15 bg-white text-cinza"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </div>

      <div className="mb-4 rounded-2xl border border-rosa/10 bg-creme/45 px-4 py-3 text-xs text-cinza">
        Período usado nas sugestões: <strong className="text-texto">{totalViews} vistas</strong> · {totalCarts} carrinhos · {totalOrders} pedidos finalizados.
      </div>

      <HomeFeaturedPicker
        products={options.map(({ id, name, brand, stockQty, views, carts, orders }) => ({
          id,
          name,
          brand,
          stockQty,
          views,
          carts,
          orders,
        }))}
        selectedIds={selectedIds}
      />
    </div>
  );
}
