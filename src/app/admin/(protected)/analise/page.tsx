import Link from "next/link";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type Period = "today" | "7d" | "30d" | "month" | "all";

const PERIODS: { value: Period; label: string }[] = [
  { value: "today", label: "Hoje" },
  { value: "7d", label: "7 dias" },
  { value: "30d", label: "30 dias" },
  { value: "month", label: "Este mês" },
  { value: "all", label: "Todo período" },
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
  if (period === "all") return undefined;
  const { year, month, day } = getSaoPauloDateParts();
  const today = saoPauloMidnightUtc(year, month, day);
  const tomorrow = new Date(today);
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  if (period === "today") return { gte: today, lt: tomorrow };
  if (period === "month") return { gte: saoPauloMidnightUtc(year, month, 1), lt: tomorrow };
  const start = new Date(today);
  start.setUTCDate(start.getUTCDate() - (period === "7d" ? 6 : 29));
  return { gte: start, lt: tomorrow };
}

function pct(value: number) {
  return `${value.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`;
}

function money(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function conversion(part: number, total: number) {
  return total > 0 ? (part / total) * 100 : 0;
}

export default async function AnalisePage({
  searchParams,
}: {
  searchParams?: Promise<{ period?: string }>;
}) {
  const params = searchParams ? await searchParams : undefined;
  const requested = params?.period;
  const period: Period = PERIODS.some((item) => item.value === requested)
    ? (requested as Period)
    : "7d";
  const range = getPeriodRange(period);
  const where = range ? { createdAt: range } : {};

  const [eventGroups, visitors, originGroups, searchGroups, productGroups, campaignGroups, finalizedAggregate] =
    await Promise.all([
      prisma.analyticsEvent.groupBy({
        by: ["event"],
        where,
        _count: { _all: true },
      }),
      prisma.analyticsEvent.findMany({
        where: { ...where, event: "page_view" },
        select: { sessionId: true },
        distinct: ["sessionId"],
      }),
      prisma.analyticsEvent.groupBy({
        by: ["origin"],
        where: { ...where, origin: { not: null } },
        _count: { _all: true },
        orderBy: { _count: { origin: "desc" } },
        take: 8,
      }),
      prisma.analyticsEvent.groupBy({
        by: ["query"],
        where: { ...where, event: "search", query: { not: null } },
        _count: { _all: true },
        orderBy: { _count: { query: "desc" } },
        take: 10,
      }),
      prisma.analyticsEvent.groupBy({
        by: ["productId"],
        where: { ...where, event: "product_view", productId: { not: null } },
        _count: { _all: true },
        orderBy: { _count: { productId: "desc" } },
        take: 10,
      }),
      prisma.analyticsEvent.groupBy({
        by: ["utmCampaign"],
        where: { ...where, utmCampaign: { not: null } },
        _count: { _all: true },
        orderBy: { _count: { utmCampaign: "desc" } },
        take: 8,
      }),
      prisma.analyticsEvent.aggregate({
        where: { ...where, event: "order_finalized" },
        _count: { _all: true },
        _sum: { value: true },
      }),
    ]);

  const eventCount = new Map(eventGroups.map((item) => [item.event, item._count._all]));
  const visitorCount = visitors.length;
  const productViews = eventCount.get("product_view") ?? 0;
  const addToCart = eventCount.get("add_to_cart") ?? 0;
  const checkout = eventCount.get("begin_checkout") ?? 0;
  const ordersCreated = eventCount.get("order_created") ?? 0;
  const finalizedSales = finalizedAggregate._count._all;
  const finalizedRevenue = Number(finalizedAggregate._sum.value ?? 0);
  const whatsapp = eventCount.get("whatsapp_click") ?? 0;
  const searches = eventCount.get("search") ?? 0;

  const productIds = productGroups
    .map((item) => item.productId)
    .filter((id): id is string => Boolean(id));
  const products = productIds.length
    ? await prisma.product.findMany({
        where: { id: { in: productIds } },
        select: { id: true, name: true, brand: true },
      })
    : [];
  const productMap = new Map(products.map((product) => [product.id, product]));

  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-rosa-profundo">Dados próprios</p>
          <h1 className="font-serif text-2xl font-bold text-texto">Análise do catálogo</h1>
          <p className="mt-1 text-sm text-cinza">
            Eventos anônimos registrados pelo próprio catálogo. GA4 e Meta continuam funcionando em paralelo.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/admin/analise/buscas" className="rounded-xl border border-rosa/20 bg-white px-4 py-2.5 text-xs font-bold text-rosa-profundo">Ver buscas</Link>
          <Link href="/admin/produtos/qualidade" className="rounded-xl border border-rosa/20 bg-white px-4 py-2.5 text-xs font-bold text-rosa-profundo">Qualidade dos cadastros</Link>
        </div>
      </div>

      <div className="mb-5 flex flex-wrap gap-2">
        {PERIODS.map((item) => {
          const active = item.value === period;
          return (
            <Link
              key={item.value}
              href={item.value === "7d" ? "/admin/analise" : `/admin/analise?period=${item.value}`}
              className={`rounded-xl border px-3 py-2 text-xs font-bold ${active ? "border-rosa-profundo bg-rosa-profundo text-white" : "border-rosa/15 bg-white text-cinza"}`}
            >
              {item.label}
            </Link>
          );
        })}
      </div>

      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-8">
        <Metric label="Visitantes identificados" value={visitorCount} />
        <Metric label="Produtos visualizados" value={productViews} />
        <Metric label="Adições ao carrinho" value={addToCart} />
        <Metric label="Checkouts iniciados" value={checkout} />
        <Metric label="Pedidos criados" value={ordersCreated} />
        <Metric label="Vendas finalizadas" value={finalizedSales} />
        <Metric label="Receita finalizada" value={money(finalizedRevenue)} />
        <Metric label="Cliques no WhatsApp" value={whatsapp} />
      </div>

      <section className="mb-6 rounded-2xl bg-white p-5 shadow-sm">
        <div className="mb-4">
          <h2 className="font-bold text-texto">Funil real do catálogo</h2>
          <p className="text-xs text-cinza">Pedido criado não é tratado como venda. A venda só entra após o status FINALIZADO no painel.</p>
        </div>
        <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
          <FunnelStep label="Visitantes" value={visitorCount} rate="100%" />
          <FunnelStep label="Visualizações" value={productViews} rate={pct(conversion(productViews, visitorCount))} />
          <FunnelStep label="Carrinhos" value={addToCart} rate={pct(conversion(addToCart, visitorCount))} />
          <FunnelStep label="Checkout" value={checkout} rate={pct(conversion(checkout, visitorCount))} />
          <FunnelStep label="Pedidos" value={ordersCreated} rate={pct(conversion(ordersCreated, visitorCount))} />
          <FunnelStep label="Vendas" value={finalizedSales} rate={pct(conversion(finalizedSales, visitorCount))} />
        </div>
        <p className="mt-3 text-[11px] text-cinza">Conversão de pedido criado em venda finalizada: <strong className="text-texto">{pct(conversion(finalizedSales, ordersCreated))}</strong>.</p>
      </section>

      <div className="grid gap-5 xl:grid-cols-2">
        <Panel title="Produtos mais visualizados" empty="Ainda não há visualizações de produto neste período.">
          {productGroups.map((item, index) => {
            const product = item.productId ? productMap.get(item.productId) : null;
            return <Row key={item.productId ?? index} label={product ? `${product.name} · ${product.brand}` : "Produto não identificado"} value={item._count._all} />;
          })}
        </Panel>

        <Panel title={`Buscas internas (${searches})`} empty="Ainda não há buscas registradas neste período.">
          {searchGroups.map((item, index) => (
            <Row key={item.query ?? index} label={item.query ?? "Busca sem termo"} value={item._count._all} />
          ))}
        </Panel>

        <Panel title="Origem dos acessos/eventos" empty="Ainda não há origem identificada neste período.">
          {originGroups.map((item, index) => (
            <Row key={item.origin ?? index} label={item.origin ?? "Não identificada"} value={item._count._all} />
          ))}
        </Panel>

        <Panel title="Campanhas UTM" empty="Ainda não há campanhas UTM registradas neste período.">
          {campaignGroups.map((item, index) => (
            <Row key={item.utmCampaign ?? index} label={item.utmCampaign ?? "Sem campanha"} value={item._count._all} />
          ))}
        </Panel>
      </div>

      <p className="mt-5 text-[11px] leading-5 text-cinza">
        Estes números são dados first-party do catálogo e começam a acumular somente após a ativação desta coleta. Eles não recuperam visitas anteriores. Para audiência e atribuição publicitária, compare também com GA4 e Meta.
      </p>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number | string }) {
  return <div className="rounded-2xl bg-white p-4 shadow-sm"><p className="text-2xl font-extrabold text-texto">{typeof value === "number" ? value.toLocaleString("pt-BR") : value}</p><p className="mt-1 text-[11px] text-cinza">{label}</p></div>;
}

function FunnelStep({ label, value, rate }: { label: string; value: number; rate: string }) {
  return <div className="rounded-xl border border-rosa/10 bg-creme/50 p-4"><p className="text-[10px] font-bold uppercase tracking-wide text-cinza">{label}</p><p className="mt-1 text-xl font-extrabold text-texto">{value.toLocaleString("pt-BR")}</p><p className="mt-1 text-xs font-bold text-rosa-profundo">{rate}</p></div>;
}

function Panel({ title, empty, children }: { title: string; empty: string; children: React.ReactNode }) {
  const hasChildren = Array.isArray(children) ? children.length > 0 : Boolean(children);
  return <section className="rounded-2xl bg-white p-5 shadow-sm"><h2 className="mb-3 font-bold text-texto">{title}</h2>{hasChildren ? <div className="divide-y divide-rosa/10">{children}</div> : <p className="text-xs text-cinza">{empty}</p>}</section>;
}

function Row({ label, value }: { label: string; value: number }) {
  return <div className="flex items-center justify-between gap-4 py-2.5"><p className="min-w-0 truncate text-xs font-semibold text-texto">{label}</p><span className="shrink-0 rounded-full bg-creme px-2.5 py-1 text-[11px] font-bold text-rosa-profundo">{value.toLocaleString("pt-BR")}</span></div>;
}
