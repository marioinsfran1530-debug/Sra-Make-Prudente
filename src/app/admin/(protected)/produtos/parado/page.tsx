import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { money } from "@/lib/money";
import { stockValue } from "@/lib/purchasing";

export const dynamic = "force-dynamic";

const WINDOW_OPTIONS = [30, 60] as const;
const MAX_LISTED = 60;

function parseWindow(value: unknown): (typeof WINDOW_OPTIONS)[number] {
  const parsed = Number(value);
  return (WINDOW_OPTIONS as readonly number[]).includes(parsed) ? (parsed as (typeof WINDOW_OPTIONS)[number]) : 30;
}

export default async function AdminEstoqueParadoPage({
  searchParams,
}: {
  searchParams?: Promise<{ dias?: string }>;
}) {
  const params = searchParams ? await searchParams : undefined;
  const windowDays = parseWindow(params?.dias);
  const since = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000);

  const [products, recentSales, allSales, firstSale] = await Promise.all([
    prisma.product.findMany({
      where: { active: true },
      select: {
        id: true,
        name: true,
        brand: true,
        price: true,
        costPrice: true,
        stockQty: true,
        variants: { where: { active: true }, select: { stockQty: true } },
      },
    }),
    prisma.orderItem.groupBy({
      by: ["productId"],
      where: { order: { status: "FINALIZADO", updatedAt: { gte: since } } },
      _sum: { qty: true },
    }),
    prisma.orderItem.groupBy({
      by: ["productId"],
      where: { order: { status: "FINALIZADO" } },
      _sum: { qty: true },
    }),
    prisma.order.aggregate({ where: { status: "FINALIZADO" }, _min: { createdAt: true } }),
  ]);

  const soldRecently = new Set(recentSales.map((row) => row.productId));
  const soldEver = new Map(allSales.map((row) => [row.productId, row._sum.qty ?? 0]));

  const stocked = products
    .map((product) => {
      const stockQty = product.variants.length
        ? product.variants.reduce((sum, variant) => sum + variant.stockQty, 0)
        : product.stockQty;
      const valuation = stockValue({
        stockQty,
        price: Number(product.price),
        costPrice: product.costPrice === null ? null : Number(product.costPrice),
      });
      return { product, stockQty, valuation };
    })
    .filter((item) => item.stockQty > 0);

  const totalStockValue = stocked.reduce((sum, item) => sum + item.valuation.value, 0);
  const parked = stocked
    .filter((item) => !soldRecently.has(item.product.id))
    .sort((a, b) => b.valuation.value - a.valuation.value);

  const parkedValue = parked.reduce((sum, item) => sum + item.valuation.value, 0);
  const parkedShare = totalStockValue > 0 ? (parkedValue / totalStockValue) * 100 : 0;
  const listed = parked.slice(0, MAX_LISTED);
  const listedValue = listed.reduce((sum, item) => sum + item.valuation.value, 0);
  const estimatedCount = parked.filter((item) => item.valuation.costIsEstimated).length;

  const historyStart = firstSale._min.createdAt
    ? firstSale._min.createdAt.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" })
    : null;

  const chip = (active: boolean) =>
    `rounded-xl border px-3 py-2 text-xs font-bold ${
      active ? "border-rosa-profundo bg-rosa-profundo text-white" : "border-rosa/15 bg-white text-cinza"
    }`;

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-4">
        <p className="text-xs font-bold uppercase tracking-wider text-rosa-profundo">Margem e compras</p>
        <h1 className="font-serif text-xl font-bold text-texto">Estoque parado</h1>
        <p className="mt-1 text-xs text-cinza">
          Produtos com estoque que não venderam no período. É dinheiro já gasto que pode virar caixa para repor o que
          vende.
        </p>
      </div>

      <div className="mb-4">
        <p className="mb-2 text-[11px] font-bold text-texto">Sem venda nos últimos</p>
        <div className="flex flex-wrap gap-2">
          {WINDOW_OPTIONS.map((option) => (
            <Link key={option} href={`/admin/produtos/parado?dias=${option}`} className={chip(option === windowDays)}>
              {option} dias
            </Link>
          ))}
        </div>
      </div>

      <section className="mb-2 grid grid-cols-3 gap-2 sm:gap-3">
        <div className="rounded-2xl bg-white p-3 shadow-sm sm:p-4">
          <p className="text-[10px] font-bold uppercase tracking-wide text-cinza">Parado a custo</p>
          <p className="mt-1 text-base font-extrabold text-texto sm:text-xl">{money(parkedValue)}</p>
        </div>
        <div className="rounded-2xl bg-white p-3 shadow-sm sm:p-4">
          <p className="text-[10px] font-bold uppercase tracking-wide text-cinza">Do estoque total</p>
          <p className="mt-1 text-base font-extrabold text-texto sm:text-xl">
            {parkedShare.toFixed(0).replace(".", ",")}%
          </p>
        </div>
        <div className="rounded-2xl bg-white p-3 shadow-sm sm:p-4">
          <p className="text-[10px] font-bold uppercase tracking-wide text-cinza">Produtos</p>
          <p className="mt-1 text-base font-extrabold text-texto sm:text-xl">{parked.length}</p>
        </div>
      </section>
      <p className="mb-5 text-[10px] leading-4 text-cinza">
        Estoque total a custo: {money(totalStockValue)}
        {estimatedCount > 0 ? ` · ${estimatedCount} dos produtos parados estão com custo estimado (regra da loja)` : ""}
        {historyStart ? ` · o histórico de vendas do sistema começa em ${historyStart}` : ""}.{" "}
        <Link href="/admin/produtos/custos" className="font-bold text-rosa-profundo underline">
          Informar custos reais
        </Link>
      </p>

      {parked.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-rosa/20 bg-creme/40 p-5 text-sm text-cinza">
          Todos os produtos com estoque tiveram venda nos últimos {windowDays} dias.
        </div>
      ) : (
        <>
          <p className="mb-2 text-[11px] text-cinza">
            Os {listed.length} de maior valor somam {money(listedValue)} (
            {parkedValue > 0 ? ((listedValue / parkedValue) * 100).toFixed(0) : "0"}% do valor parado).
          </p>
          <ul className="grid gap-2">
            {listed.map(({ product, stockQty, valuation }) => {
              const soldBefore = soldEver.get(product.id) ?? 0;
              return (
                <li key={product.id} className="rounded-2xl border border-rosa/10 bg-white p-3 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <Link
                        href={`/admin/produtos/${product.id}`}
                        className="block text-sm font-bold text-texto hover:text-rosa-profundo hover:underline"
                      >
                        {product.name}
                      </Link>
                      <p className="mt-0.5 text-[10px] text-cinza">
                        {product.brand} · estoque {stockQty} · {money(valuation.unitCost)} cada
                        {valuation.costIsEstimated ? " (estimado)" : ""} ·{" "}
                        {soldBefore > 0 ? `já vendeu ${soldBefore} no histórico` : "nunca vendeu no histórico"}
                      </p>
                    </div>
                    <p className="shrink-0 text-sm font-extrabold text-texto">{money(valuation.value)}</p>
                  </div>
                </li>
              );
            })}
          </ul>
          {parked.length > listed.length && (
            <p className="mt-3 text-[11px] text-cinza">
              Mais {parked.length - listed.length} produtos de menor valor não estão listados (
              {money(parkedValue - listedValue)}).
            </p>
          )}
        </>
      )}

      <p className="mt-4 text-[10px] leading-4 text-cinza">
        Valor parado = estoque × custo (real quando cadastrado, senão a regra de 44% do preço). Um produto sem venda não
        significa produto ruim: pode ser lançamento, item sazonal ou falta de exposição. Antes de liquidar, confira se ele
        aparece bem no catálogo.
      </p>
    </div>
  );
}
