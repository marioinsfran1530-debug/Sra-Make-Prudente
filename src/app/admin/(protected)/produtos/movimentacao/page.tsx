import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { matchesCounterSaleQuery } from "@/lib/counter-sale-search";
import { entryOriginLabel } from "@/lib/stock-entry";
import { salesChannelLabel } from "@/lib/sales-channel";
import {
  buildMovements,
  summarizeMovements,
  type EntryMovementInput,
  type MovementKind,
  type SaleMovementInput,
} from "@/lib/stock-movements";

export const dynamic = "force-dynamic";

const MAX_RESULTS = 15;

const KIND_STYLE: Record<MovementKind, { label: string; badge: string }> = {
  ENTRADA: { label: "Entrada", badge: "bg-green-50 text-green-800" },
  ESTORNO: { label: "Estorno", badge: "bg-amber-50 text-amber-800" },
  VENDA: { label: "Saída", badge: "bg-rose-50 text-rose-800" },
  CANCELADA: { label: "Cancelado", badge: "bg-gray-100 text-gray-600" },
  PENDENTE: { label: "Aguardando", badge: "bg-gray-100 text-gray-600" },
};

function brDateTime(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function signed(value: number) {
  if (value > 0) return `+${value}`;
  if (value < 0) return `−${Math.abs(value)}`;
  return "0";
}

type EntryRow = {
  entryId: string;
  createdAt: Date;
  status: string;
  reversedAt: Date | null;
  origin: string;
  supplier: string;
  qty: number;
  variantName: string | null;
};

export default async function StockMovementsPage({
  searchParams,
}: {
  searchParams?: Promise<{ q?: string; id?: string }>;
}) {
  const params = searchParams ? await searchParams : undefined;
  const query = params?.q?.trim() ?? "";
  const productId = params?.id?.trim() ?? "";

  const product = productId
    ? await prisma.product.findUnique({
        where: { id: productId },
        select: {
          id: true,
          name: true,
          brand: true,
          sku: true,
          stockQty: true,
          active: true,
          images: { orderBy: { order: "asc" }, take: 1, select: { url: true } },
          variants: { where: { active: true }, orderBy: { name: "asc" }, select: { name: true, stockQty: true } },
        },
      })
    : null;

  let matches: Array<{
    id: string;
    name: string;
    brand: string;
    sku: string | null;
    stockQty: number;
    active: boolean;
    image: string | null;
  }> = [];
  let totalMatches = 0;

  if (!product && query) {
    const catalog = await prisma.product.findMany({
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        brand: true,
        sku: true,
        stockQty: true,
        active: true,
        images: { orderBy: { order: "asc" }, take: 1, select: { url: true } },
        variants: { select: { name: true, sku: true } },
      },
    });
    const found = catalog.filter((item) =>
      matchesCounterSaleQuery(
        [item.name, item.brand, item.sku, ...item.variants.flatMap((variant) => [variant.name, variant.sku])],
        query
      )
    );
    totalMatches = found.length;
    matches = found.slice(0, MAX_RESULTS).map((item) => ({
      id: item.id,
      name: item.name,
      brand: item.brand,
      sku: item.sku,
      stockQty: item.stockQty,
      active: item.active,
      image: item.images[0]?.url ?? null,
    }));
  }

  let movements: ReturnType<typeof buildMovements> = [];
  if (product) {
    const [entryRows, orderItems] = await Promise.all([
      prisma.$queryRaw<EntryRow[]>`
        SELECT e."id" AS "entryId", e."createdAt", e."status", e."reversedAt", e."origin", e."supplier",
               i."qty", i."variantName"
        FROM app_security."StockEntryItem" i
        JOIN app_security."StockEntry" e ON e."id" = i."entryId"
        WHERE i."productId" = ${product.id}
        ORDER BY e."createdAt" DESC
        LIMIT 500
      `,
      prisma.orderItem.findMany({
        where: { productId: product.id },
        orderBy: { order: { createdAt: "desc" } },
        take: 500,
        select: {
          qty: true,
          variantName: true,
          unitPrice: true,
          order: {
            select: { id: true, number: true, channel: true, origin: true, status: true, createdAt: true },
          },
        },
      }),
    ]);

    const entries: EntryMovementInput[] = entryRows.map((row) => ({
      entryId: row.entryId,
      createdAt: new Date(row.createdAt).toISOString(),
      status: row.status,
      reversedAt: row.reversedAt ? new Date(row.reversedAt).toISOString() : null,
      origin: row.origin,
      supplier: row.supplier,
      qty: Number(row.qty),
      variantName: row.variantName,
    }));
    const sales: SaleMovementInput[] = orderItems.map((item) => ({
      orderId: item.order.id,
      number: item.order.number,
      channelLabel: salesChannelLabel(item.order.channel, item.order.origin),
      status: item.order.status,
      createdAt: item.order.createdAt.toISOString(),
      qty: item.qty,
      variantName: item.variantName,
      unitPrice: Number(item.unitPrice),
    }));
    movements = buildMovements(entries, sales, entryOriginLabel);
  }

  const summary = summarizeMovements(movements, Date.now());
  const variantStock = product?.variants ?? [];

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-4">
        <p className="text-[10px] font-bold uppercase tracking-wider text-rosa-profundo sm:text-xs">Estoque</p>
        <h1 className="font-serif text-xl font-bold leading-tight text-texto sm:text-2xl">Movimentação de estoque</h1>
        <p className="mt-1 text-xs text-cinza sm:text-sm">
          Pesquise um produto e veja quando entrou e quando saiu, com a quantidade de cada movimento.
        </p>
      </div>

      <form method="get" className="mb-4 flex gap-2" role="search">
        <input
          name="q"
          defaultValue={query}
          placeholder="Nome, marca ou código do produto"
          aria-label="Pesquisar produto"
          className="input min-h-[44px] flex-1"
          autoComplete="off"
        />
        <button type="submit" className="shrink-0 rounded-xl bg-rosa-profundo px-4 text-sm font-extrabold text-white">
          Buscar
        </button>
      </form>

      {!product && !query && (
        <div className="rounded-2xl border border-dashed border-rosa/20 bg-white p-8 text-center">
          <p className="text-sm font-bold text-texto">Digite o nome do produto para ver o histórico.</p>
          <p className="mt-1 text-xs text-cinza">Ex.: “alicate de cutícula”.</p>
        </div>
      )}

      {!product && query && matches.length === 0 && (
        <p className="rounded-2xl bg-white p-6 text-center text-sm text-cinza shadow-sm">
          Nenhum produto encontrado para “{query}”.
        </p>
      )}

      {!product && matches.length > 0 && (
        <div>
          <p className="mb-2 text-[11px] text-cinza">
            {totalMatches > MAX_RESULTS
              ? `Mostrando ${MAX_RESULTS} de ${totalMatches} produtos. Digite mais letras para refinar.`
              : `${totalMatches} produto(s) encontrado(s). Toque no certo para ver o histórico.`}
          </p>
          <ul className="grid gap-2">
            {matches.map((item) => (
              <li key={item.id}>
                <Link
                  href={`/admin/produtos/movimentacao?id=${item.id}&q=${encodeURIComponent(query)}`}
                  className="flex items-center gap-3 rounded-2xl bg-white p-3 shadow-sm transition hover:shadow-md"
                >
                  {item.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={item.image}
                      alt=""
                      loading="lazy"
                      className="h-12 w-12 shrink-0 rounded-xl border border-rosa/10 object-cover"
                    />
                  ) : (
                    <span className="h-12 w-12 shrink-0 rounded-xl bg-rosa/10" aria-hidden="true" />
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-bold text-texto">{item.name}</span>
                    <span className="block truncate text-[11px] text-cinza">
                      {item.brand}
                      {item.sku ? ` · ${item.sku}` : ""}
                      {item.active ? "" : " · inativo"}
                    </span>
                  </span>
                  <span className="shrink-0 text-right text-[11px] text-cinza">
                    estoque
                    <span className="block text-sm font-extrabold text-texto">{item.stockQty}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      {productId && !product && (
        <p className="rounded-2xl bg-white p-6 text-center text-sm text-cinza shadow-sm">Produto não encontrado.</p>
      )}

      {product && (
        <section aria-label={`Movimentação de ${product.name}`}>
          <div className="flex items-center gap-3 rounded-2xl bg-white p-3 shadow-sm">
            {product.images[0]?.url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={product.images[0].url}
                alt=""
                className="h-14 w-14 shrink-0 rounded-xl border border-rosa/10 object-cover"
              />
            ) : (
              <span className="h-14 w-14 shrink-0 rounded-xl bg-rosa/10" aria-hidden="true" />
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-extrabold text-texto">{product.name}</p>
              <p className="truncate text-[11px] text-cinza">
                {product.brand}
                {product.sku ? ` · ${product.sku}` : ""}
                {product.active ? "" : " · inativo"}
              </p>
              <Link
                href={`/admin/produtos/movimentacao${query ? `?q=${encodeURIComponent(query)}` : ""}`}
                className="mt-1 inline-block text-[11px] font-bold text-rosa-profundo"
              >
                {query ? "← Voltar à busca" : "← Nova busca"}
              </Link>
            </div>
          </div>

          <dl className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {[
              { label: "Estoque agora", value: product.stockQty },
              { label: "Entradas registradas", value: summary.entered },
              { label: "Vendas registradas", value: summary.sold },
              { label: "Vendas em 30 dias", value: summary.soldLastDays },
            ].map((item) => (
              <div key={item.label} className="rounded-2xl bg-white p-3 text-center shadow-sm">
                <dt className="text-[10px] font-bold uppercase tracking-wide text-cinza">{item.label}</dt>
                <dd className="mt-0.5 text-xl font-extrabold text-texto">{item.value}</dd>
              </div>
            ))}
          </dl>

          {variantStock.length > 0 && (
            <p className="mt-2 text-[11px] text-cinza">
              Estoque por variação: {variantStock.map((variant) => `${variant.name} (${variant.stockQty})`).join(" · ")}
            </p>
          )}

          <h2 className="mb-2 mt-5 text-sm font-extrabold text-texto">Histórico</h2>
          {movements.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-rosa/20 bg-white p-6 text-center text-sm text-cinza">
              Nenhuma entrada ou venda registrada para este produto.
            </p>
          ) : (
            <ul className="grid gap-2">
              {movements.map((movement) => {
                const style = KIND_STYLE[movement.kind];
                const href = movement.orderId
                  ? `/admin/pedidos/${movement.orderId}`
                  : movement.entryId
                    ? "/admin/produtos/entradas"
                    : null;
                const body = (
                  <>
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center gap-1.5">
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${style.badge}`}>
                          {style.label}
                        </span>
                        <span className="text-[11px] text-cinza">{brDateTime(movement.at)}</span>
                      </span>
                      <span className="mt-1 block text-xs font-bold text-texto">
                        {movement.title}
                        {movement.variantName ? ` · ${movement.variantName}` : ""}
                      </span>
                      {movement.detail && <span className="block text-[11px] text-cinza">{movement.detail}</span>}
                    </span>
                    <span
                      className={`shrink-0 text-right text-lg font-extrabold ${
                        movement.delta > 0 ? "text-green-700" : movement.delta < 0 ? "text-rose-700" : "text-gray-400"
                      }`}
                      aria-label={`${movement.qty} unidade(s)`}
                    >
                      {movement.delta === 0 ? `${movement.qty}` : signed(movement.delta)}
                      <span className="block text-[10px] font-normal text-cinza">
                        {movement.delta === 0 ? "sem baixa" : "un."}
                      </span>
                    </span>
                  </>
                );
                return (
                  <li key={movement.key}>
                    {href ? (
                      <Link
                        href={href}
                        className="flex items-center gap-3 rounded-2xl bg-white p-3 shadow-sm transition hover:shadow-md"
                      >
                        {body}
                      </Link>
                    ) : (
                      <div className="flex items-center gap-3 rounded-2xl bg-white p-3 shadow-sm">{body}</div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}

          <p className="mt-4 rounded-xl bg-rosa/5 px-3 py-2 text-[11px] text-cinza">
            Aqui aparecem as entradas de estoque e os pedidos. Se o estoque for alterado direto no cadastro do produto,
            essa mudança não fica registrada neste histórico.
          </p>
        </section>
      )}
    </div>
  );
}
