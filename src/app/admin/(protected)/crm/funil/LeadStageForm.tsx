"use client";

import { useState } from "react";
import { moveLeadAction } from "../actions";

const stages = [
  ["NOVO", "Novo"],
  ["ATENDIMENTO", "Atendimento"],
  ["PRODUTO_INDICADO", "Produto indicado"],
  ["AGUARDANDO_PAGAMENTO", "Aguardando pagamento"],
  ["VENDIDO", "Vendido"],
  ["PERDIDO", "Perdido"],
  ["POS_VENDA", "Pós-venda"],
  ["RECOMPRA", "Recompra"],
] as const;

const lostReasons = [
  "Preço",
  "Produto indisponível",
  "Não respondeu",
  "Desistiu",
  "Entrega",
  "Comprou com concorrente",
  "Outro",
];

export default function LeadStageForm({
  id,
  initialStage,
  initialLostReason,
}: {
  id: string;
  initialStage: string;
  initialLostReason?: string | null;
}) {
  const [stage, setStage] = useState(initialStage);
  const changed = stage !== initialStage;

  return (
    <form action={moveLeadAction} className="space-y-2">
      <input type="hidden" name="id" value={id} />
      <div className="flex gap-1.5">
        <select
          name="stage"
          value={stage}
          onChange={(event) => setStage(event.target.value)}
          aria-label="Mover oportunidade para"
          className="min-w-0 flex-1 rounded-lg border border-rosa/15 bg-white px-2 py-2.5 text-[10px] font-bold text-cinza outline-none focus:border-rosa-profundo"
        >
          {stages.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
        <button
          disabled={!changed}
          className="rounded-lg bg-rosa-profundo px-3 py-2.5 text-[10px] font-extrabold text-white disabled:cursor-not-allowed disabled:bg-rosa/15 disabled:text-cinza"
        >
          Mover
        </button>
      </div>

      {stage === "PERDIDO" && changed ? (
        <select
          name="lostReason"
          required
          defaultValue={initialLostReason || ""}
          aria-label="Motivo da perda"
          className="w-full rounded-lg border border-amber-200 bg-amber-50 px-2 py-2.5 text-[10px] font-bold text-amber-900 outline-none focus:border-amber-400"
        >
          <option value="" disabled>Selecione o motivo da perda</option>
          {lostReasons.map((reason) => <option key={reason} value={reason}>{reason}</option>)}
        </select>
      ) : null}
    </form>
  );
}
