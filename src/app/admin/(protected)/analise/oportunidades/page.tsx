import Link from "next/link";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function pct(part: number, total: number) {
  const value = total > 0 ? (part / total) * 100 : 0;
  return `${value.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`;
}

type Row = {
  id: string;
  name: string;
  brand: string;
  description: string | null;
  stockQty: number;
  views: number;
  carts: number;
  finalized: number;
};

function priority(row: Row) {
  if (row.carts > 0 && row.finalized === 0) return 100 + row.carts * 10 + row.views;
  if (row.views >= 5 && row.finalized === 0) return 50 + row.views;
  if (!row.description || row.description.trim().length < 50) return 20;
  return 0;
}

function action(row: Row) {
  if (row.stockQty <= 0) return "Revisar estoque antes de promover";
  if (row.carts > 0 && row.finalized === 0) return "Revisar preço, oferta e fechamento";
  if (row.views >= 5 && row.carts === 0) return "Revisar foto, título, descrição e preço";
  if (!row.description || row.description.trim().length < 50) return "Melhorar descrição para SEO e conversão";
  return "Continuar coletando dados";
}

export default async function OportunidadesPage() {
  const since = new Date();
  since.setDate(since.getDate() - 30);

  const [behavior, finalizedOrders] = await Promise.all([
    prisma.analyticsEvent.groupBy({
      by: ["productId", "event"],
      where: {
        createdAt: { gte: since },
        productId: { not: null },
        event: { in: ["product_view", "add_to_cart"] },
      },
      _count: { _all: true },
    }),
    prisma.order.findMany({
      where: { status: "FINALIZADO", updatedAt: { gte: since } },
      select: { items: { select: { productId: true } } },
    }),
  ]);

  const stats = new Map<string, { views: number; carts: number; finalized: number }>();
  const ensure = (id: string) => {
    const current = stats.get(id);
    if (current) return current;
    const fresh = { views: 0, carts: 0, finalized: 0 };
    stats.set(id, fresh);
    return fresh;
  };

  for (const item of behavior) {
    if (!item.productId) continue;
    const current = ensure(item.productId);
    if (item.event === "product_view") current.views = item._count._all;
    if (item.event === "add_to_cart") current.carts = item._count._all;
  }

  for (const order of finalizedOrders) {
    const ids = new Set(order.items.map((item) => item.productId));
    for (const id of ids) ensure(id).finalized += 1;
  }

  const products = await prisma.product.findMany({
    where: { active: true },
    select: { id: true, name: true, brand: true, description: true, stockQty: true },
  });

  const rows: Row[] = products
    .map((product) => ({ ...product, ...(stats.get(product.id) ?? { views: 0, carts: 0, finalized: 0 }) }))
    .filter((row) => row.carts > 0 || row.views >= 5 || !row.description || row.description.trim().length < 50)
    .sort((a, b) => priority(b) - priority(a))
    .slice(0, 50);

  const highIntent = rows.filter((row) => row.carts > 0 && row.finalized === 0).length;
  const seenNoCart = rows.filter((row) => row.views >= 5 && row.carts === 0).length;
  const weakDescription = rows.filter((row) => !row.description || row.description.trim().length < 50).length;

  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-rosa-profundo">Próximas ações</p>
          <h1 className="font-serif text-2xl font-bold text-texto">Oportunidades dos produtos</h1>
          <p className="mt-1 max-w-3xl text-sm text-cinza">Prioriza os produtos que merecem intervenção com base nos últimos 30 dias de comportamento real e na qualidade do cadastro.</p>
        </div>
        <Link href="/admin/analise/produtos" className="rounded-xl border border-rosa/20 bg-white px-4 py-2.5 text-xs font-bold text-rosa-profundo">Ver desempenho completo</Link>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-3">
        <Metric label="Intenção sem venda" value={highIntent} />
        <Metric label="Vistos sem carrinho" value={seenNoCart} />
        <Metric label="Descrição fraca" value={weakDescription} />
      </div>

      <section className="overflow-hidden rounded-2xl bg-white shadow-sm">
        <div className="border-b border-rosa/10 px-5 py-4">
          <h2 className="font-bold text-texto">Fila de prioridade</h2>
          <p className="mt-1 text-[11px] text-cinza">A ordem privilegia intenção sem venda, depois produtos vistos sem carrinho e, por fim, cadastros fracos.</p>
        </div>

        {rows.length === 0 ? (
          <p className="p-6 text-sm text-cinza">Ainda não há oportunidades com amostra suficiente.</p>
        ) : (
          <div className="divide-y divide-rosa/10">
            {rows.map((row, index) => (
              <div key={row.id} className="grid gap-3 px-5 py-4 lg:grid-cols-[48px_1fr_360px_110px] lg:items-center">
                <div className="text-lg font-extrabold text-rosa-profundo">#{index + 1}</div>
                <div>
                  <p className="font-bold text-texto">{row.name}</p>
                  <p className="mt-0.5 text-[11px] text-cinza">{row.brand} · estoque {row.stockQty} · {row.views} vistas · {row.carts} carrinhos · {row.finalized} vendas</p>
                  <p className="mt-1 text-[11px] font-semibold text-rosa-profundo">Intenção: {pct(row.carts, row.views)}</p>
                </div>
                <div className="rounded-xl bg-creme/60 px-3 py-2 text-xs font-semibold text-texto">{action(row)}</div>
                <Link href={`/admin/produtos/${row.id}`} className="rounded-xl border border-rosa/20 bg-white px-3 py-2 text-center text-xs font-bold text-rosa-profundo hover:bg-creme">Editar produto</Link>
              </div>
            ))}
          </div>
        )}
      </section>

      <p className="mt-5 text-[11px] leading-5 text-cinza">Os sinais são apoio à decisão, não conclusões automáticas. Nos primeiros dias, a amostra de comportamento ainda é pequena; use a fila para priorizar revisão, não para alterar preço ou estoque sem conferência comercial.</p>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return <div className="rounded-2xl bg-white p-4 shadow-sm"><p className="text-2xl font-extrabold text-texto">{value.toLocaleString("pt-BR")}</p><p className="mt-1 text-[11px] text-cinza">{label}</p></div>;
}
