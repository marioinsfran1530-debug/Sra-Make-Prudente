"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import LeadStageForm from "./LeadStageForm";

type PipelineView = "open" | "won" | "lost" | "relationship";

type LeadRow = {
  id: string;
  stage: string;
  estimatedValue: number | null;
  source: string | null;
  notes: string | null;
  lostReason: string | null;
  updatedAt: string;
  customerName: string;
  customerPhone: string;
  productName: string | null;
};

const STAGES = [
  { key: "NOVO", label: "Novo", description: "Aguardando primeiro atendimento", tone: "border-sky-200 bg-sky-50/35" },
  { key: "ATENDIMENTO", label: "Atendimento", description: "Conversa iniciada com a cliente", tone: "border-violet-200 bg-violet-50/30" },
  { key: "PRODUTO_INDICADO", label: "Produto indicado", description: "Produto ou solução apresentada", tone: "border-pink-200 bg-pink-50/30" },
  { key: "AGUARDANDO_PAGAMENTO", label: "Aguardando pagamento", description: "Cliente decidiu; falta concluir", tone: "border-amber-200 bg-amber-50/35" },
  { key: "VENDIDO", label: "Vendido", description: "Venda concluída", tone: "border-emerald-200 bg-emerald-50/35" },
  { key: "PERDIDO", label: "Perdido", description: "Venda encerrada sem conversão", tone: "border-zinc-200 bg-zinc-50/60" },
  { key: "POS_VENDA", label: "Pós-venda", description: "Relacionamento após a compra", tone: "border-teal-200 bg-teal-50/30" },
  { key: "RECOMPRA", label: "Recompra", description: "Cliente pronta para nova oferta", tone: "border-fuchsia-200 bg-fuchsia-50/25" },
] as const;

const VIEW_STAGES: Record<PipelineView, string[]> = {
  open: ["NOVO", "ATENDIMENTO", "PRODUTO_INDICADO", "AGUARDANDO_PAGAMENTO"],
  won: ["VENDIDO"],
  lost: ["PERDIDO"],
  relationship: ["POS_VENDA", "RECOMPRA"],
};

function money(value: number | null) {
  if (value == null) return "—";
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

function shortDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function sourceLabel(source: string | null) {
  const value = (source || "").toLowerCase();
  if (value === "catalogo" || value === "catalogo_checkout") return "Catálogo";
  if (value === "whatsapp") return "WhatsApp";
  if (value === "loja_fisica") return "Loja física";
  if (value === "google") return "Google";
  if (value === "meta" || value === "meta_ads" || value === "facebook" || value === "instagram") return "Meta";
  if (value === "direto") return "Direto";
  return source?.replaceAll("_", " ") || "Origem não informada";
}

function totalValue(rows: LeadRow[]) {
  return rows.reduce((sum, row) => sum + (row.estimatedValue ?? 0), 0);
}

export function CrmPipelineBoard({ leads }: { leads: LeadRow[] }) {
  const [view, setView] = useState<PipelineView>("open");
  const [query, setQuery] = useState("");

  const grouped = useMemo(() => {
    const q = query.trim().toLocaleLowerCase("pt-BR");
    const searched = !q
      ? leads
      : leads.filter((lead) =>
          `${lead.customerName} ${lead.customerPhone} ${lead.productName ?? ""} ${lead.source ?? ""}`
            .toLocaleLowerCase("pt-BR")
            .includes(q)
        );
    return new Map(STAGES.map((stage) => [stage.key, searched.filter((lead) => lead.stage === stage.key)] as const));
  }, [leads, query]);

  const openRows = leads.filter((lead) => VIEW_STAGES.open.includes(lead.stage));
  const wonRows = leads.filter((lead) => lead.stage === "VENDIDO");
  const lostRows = leads.filter((lead) => lead.stage === "PERDIDO");
  const relationshipRows = leads.filter((lead) => VIEW_STAGES.relationship.includes(lead.stage));

  const summaries: Array<{ key: PipelineView; label: string; count: number; detail: string }> = [
    { key: "open", label: "Em andamento", count: openRows.length, detail: money(totalValue(openRows)) },
    { key: "won", label: "Vendidas", count: wonRows.length, detail: money(totalValue(wonRows)) },
    { key: "lost", label: "Perdidas", count: lostRows.length, detail: "encerradas" },
    { key: "relationship", label: "Pós-venda", count: relationshipRows.length, detail: "relacionamento" },
  ];

  const activeStages = STAGES.filter((stage) => VIEW_STAGES[view].includes(stage.key));
  const visibleCount = activeStages.reduce((sum, stage) => sum + (grouped.get(stage.key)?.length ?? 0), 0);

  return (
    <div className="space-y-4">
      <section className="grid grid-cols-2 gap-2 lg:grid-cols-4">
        {summaries.map((item) => {
          const active = item.key === view;
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => setView(item.key)}
              aria-pressed={active}
              className={`rounded-2xl border p-3 text-left shadow-sm transition sm:p-4 ${
                active
                  ? "border-rosa-profundo bg-rosa-profundo text-white"
                  : "border-rosa/15 bg-white text-texto hover:border-rosa/30"
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-extrabold">{item.label}</span>
                <span className={`rounded-full px-2 py-1 text-[10px] font-extrabold ${active ? "bg-white/15 text-white" : "bg-creme text-rosa-profundo"}`}>
                  {item.count}
                </span>
              </div>
              <p className={`mt-2 text-[11px] ${active ? "text-white/80" : "text-cinza"}`}>{item.detail}</p>
            </button>
          );
        })}
      </section>

      <section className="rounded-2xl border border-rosa/15 bg-white p-3 shadow-sm sm:p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <label className="relative block w-full sm:max-w-md">
            <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-cinza" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar cliente, produto, telefone ou origem"
              className="w-full rounded-xl border border-rosa/15 bg-creme/30 py-3 pl-10 pr-3 text-sm outline-none focus:border-rosa-profundo"
            />
          </label>
          <p className="text-[11px] font-semibold text-cinza">
            {visibleCount} oportunidade{visibleCount === 1 ? "" : "s"} nesta visão
          </p>
        </div>
      </section>

      {visibleCount === 0 ? (
        <div className="rounded-2xl border border-dashed border-rosa/20 bg-white p-8 text-center">
          <p className="text-sm font-bold text-texto">Nenhuma oportunidade aqui.</p>
          <p className="mt-1 text-xs text-cinza">Altere a visão ou a busca para encontrar outros atendimentos.</p>
        </div>
      ) : (
        <div className={`grid gap-3 ${activeStages.length >= 4 ? "lg:grid-cols-4" : activeStages.length === 2 ? "lg:grid-cols-2" : "lg:grid-cols-1"}`}>
          {activeStages.map((stage) => {
            const rows = grouped.get(stage.key) ?? [];
            return (
              <section key={stage.key} className={`min-w-0 rounded-2xl border p-3 shadow-sm ${stage.tone}`}>
                <div className="mb-3 flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-sm font-extrabold text-texto">{stage.label}</h2>
                    <p className="mt-0.5 text-[10px] leading-relaxed text-cinza">{stage.description}</p>
                  </div>
                  <span className="rounded-full bg-white px-2 py-1 text-[10px] font-extrabold text-rosa-profundo shadow-sm">{rows.length}</span>
                </div>

                <div className="space-y-2.5">
                  {rows.length === 0 ? (
                    <p className="rounded-xl border border-dashed border-rosa/15 bg-white/70 p-5 text-center text-[10px] text-cinza">Nenhuma oportunidade nesta etapa.</p>
                  ) : null}

                  {rows.map((lead) => (
                    <article key={lead.id} className="rounded-xl border border-rosa/10 bg-white p-3 shadow-sm">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-extrabold text-texto">{lead.customerName}</p>
                          <p className="mt-0.5 line-clamp-2 text-[10px] leading-relaxed text-cinza">{lead.productName || "Interesse ainda não definido"}</p>
                        </div>
                        <span className="shrink-0 text-[11px] font-extrabold text-rosa-profundo">{money(lead.estimatedValue)}</span>
                      </div>

                      <div className="mt-2 flex flex-wrap gap-1.5 text-[9px] font-semibold text-cinza">
                        <span className="rounded-full bg-creme px-2 py-1">{sourceLabel(lead.source)}</span>
                        <span className="rounded-full bg-creme px-2 py-1">Atualizado {shortDate(lead.updatedAt)}</span>
                      </div>

                      {lead.notes ? <p className="mt-2 line-clamp-2 rounded-lg bg-creme/50 px-2.5 py-2 text-[10px] leading-relaxed text-cinza">{lead.notes}</p> : null}
                      {lead.lostReason ? <p className="mt-2 rounded-lg bg-zinc-50 px-2.5 py-2 text-[10px] font-bold text-zinc-700">Motivo da perda: {lead.lostReason}</p> : null}

                      <div className="mt-3 space-y-2">
                        <Link
                          href={`/admin/crm/${encodeURIComponent(lead.customerPhone)}`}
                          className="block rounded-lg bg-creme px-2 py-2.5 text-center text-[10px] font-extrabold text-texto"
                        >
                          Abrir cliente
                        </Link>
                        <LeadStageForm id={lead.id} initialStage={lead.stage} initialLostReason={lead.lostReason} />
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
