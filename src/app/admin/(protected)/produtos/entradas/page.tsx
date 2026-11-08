import Link from "next/link";
import { money } from "@/lib/money";
import { entryOriginLabel, entryTotals } from "@/lib/stock-entry";
import { listStockEntries } from "@/lib/stock-entry-data";
import { ReverseEntryButton } from "@/components/admin/ReverseEntryButton";

export const dynamic = "force-dynamic";

function brDate(iso: string) {
  const [year, month, day] = iso.split("-");
  return `${day}/${month}/${year}`;
}

export default async function StockEntriesPage({
  searchParams,
}: {
  searchParams?: Promise<{ ok?: string }>;
}) {
  const params = searchParams ? await searchParams : undefined;
  const entries = await listStockEntries();

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-rosa-profundo">Estoque</p>
          <h1 className="font-serif text-2xl font-bold text-texto">Entradas de estoque</h1>
          <p className="mt-1 max-w-2xl text-sm text-cinza">
            Registre aqui o que chegou de cada compra. O estoque sobe, o custo do produto é atualizado (média com o que já
            havia) e fica o histórico de quando, de onde e por quanto entrou.
          </p>
        </div>
        <Link
          href="/admin/produtos/entradas/nova"
          className="shrink-0 rounded-xl bg-rosa-profundo px-4 py-3 text-center text-sm font-extrabold text-white"
        >
          + Nova entrada
        </Link>
      </div>

      {params?.ok === "1" && (
        <p role="status" className="mb-4 rounded-xl bg-green-50 px-4 py-3 text-xs font-bold text-green-800">
          Entrada registrada. O estoque e o custo dos produtos já foram atualizados.
        </p>
      )}

      {entries.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-rosa/20 bg-white p-8 text-center">
          <p className="text-sm font-bold text-texto">Nenhuma entrada registrada ainda.</p>
          <p className="mt-1 text-xs text-cinza">Toque em “Nova entrada” quando chegar a próxima compra.</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {entries.map((entry) => {
            const totals = entryTotals(entry.lines, entry.freight);
            const reversed = entry.status === "ESTORNADA";
            return (
              <article
                key={entry.id}
                className={`rounded-2xl bg-white p-4 shadow-sm ${reversed ? "opacity-70" : ""}`}
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-texto">
                      {brDate(entry.entryDate)} · {entryOriginLabel(entry.origin)}
                      {entry.supplier ? ` · ${entry.supplier}` : ""}
                    </p>
                    <p className="mt-0.5 text-[11px] text-cinza">
                      {totals.items} item(ns) · {totals.units} un.
                      {entry.freight > 0 ? ` · frete ${money(entry.freight)}` : ""}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-base font-extrabold text-rosa-profundo">{money(totals.total)}</p>
                    {reversed && (
                      <span className="mt-1 inline-block rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-bold text-red-700">
                        Estornada
                      </span>
                    )}
                  </div>
                </div>

                <ul className="mt-3 divide-y divide-rosa/10 text-xs">
                  {entry.lines.map((line, index) => (
                    <li key={index} className="flex items-baseline justify-between gap-3 py-1.5">
                      <span className="min-w-0 truncate text-texto">
                        {line.qty}× {line.productName}
                        {line.variantName ? ` · ${line.variantName}` : ""}
                      </span>
                      <span className="shrink-0 text-cinza">
                        {money(line.unitCost)}
                        {line.landedUnitCost !== line.unitCost ? ` (com frete ${money(line.landedUnitCost)})` : ""}
                      </span>
                    </li>
                  ))}
                </ul>

                {entry.notes && <p className="mt-2 text-[11px] text-cinza">Obs.: {entry.notes}</p>}
                {reversed && entry.reversalNote && (
                  <p className="mt-2 text-[11px] text-red-700">Motivo do estorno: {entry.reversalNote}</p>
                )}

                {!reversed && (
                  <div className="mt-3 flex flex-wrap justify-end">
                    <ReverseEntryButton entryId={entry.id} />
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
