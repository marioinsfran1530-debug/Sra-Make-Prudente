// Rascunho local da entrada de estoque (lógica pura, para ser testada).
//
// No celular é comum sair da tela para olhar o pedido em outro app e o navegador
// recarregar a aba, perdendo tudo o que foi digitado. O rascunho guarda só o que
// foi digitado (produtos por chave, quantidade e custo em texto); os dados do
// produto (nome, estoque, custo atual) vêm sempre frescos do servidor.

import { isEntryOrigin, type EntryOrigin } from "./stock-entry";

export const DRAFT_STORAGE_KEY = "stock-entry-draft:v1";
export const DRAFT_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

export type DraftLine = { key: string; qty: string; cost: string };

export type EntryDraft = {
  v: 1;
  savedAt: number;
  idempotencyKey: string;
  entryDate: string;
  origin: EntryOrigin;
  supplier: string;
  freight: string;
  notes: string;
  lines: DraftLine[];
};

export function serializeDraft(draft: Omit<EntryDraft, "v">): string {
  return JSON.stringify({ v: 1, ...draft });
}

function parseJson(raw: string | null): Record<string, unknown> | null {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw);
    return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

// Rascunho velho demais não volta (o estoque e os custos já mudaram muito).
export function isFreshDraft(raw: string | null, now: number): boolean {
  const data = parseJson(raw);
  if (!data || typeof data.savedAt !== "number") return false;
  return now - data.savedAt <= DRAFT_MAX_AGE_MS;
}

function isIsoDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

const asText = (value: unknown, max: number) => (typeof value === "string" ? value.slice(0, max) : "");

// `validKeys` são os itens que ainda existem; o que sumiu (produto excluído ou
// variação desativada) é descartado em vez de quebrar a tela.
export function parseDraft(raw: string | null, validKeys: ReadonlySet<string>, today: string): EntryDraft | null {
  const data = parseJson(raw);
  if (!data || data.v !== 1 || typeof data.savedAt !== "number") return null;

  const idempotencyKey = typeof data.idempotencyKey === "string" ? data.idempotencyKey.slice(0, 160) : "";
  if (idempotencyKey.length < 8) return null;

  const lines: DraftLine[] = [];
  const seen = new Set<string>();
  if (Array.isArray(data.lines)) {
    for (const rawLine of data.lines.slice(0, 100)) {
      const line = (rawLine ?? {}) as Record<string, unknown>;
      const key = typeof line.key === "string" ? line.key : "";
      if (!validKeys.has(key) || seen.has(key)) continue;
      seen.add(key);
      lines.push({
        key,
        qty: asText(line.qty, 4).replace(/\D/g, ""),
        cost: asText(line.cost, 12).replace(/[^\d.,]/g, ""),
      });
    }
  }

  const supplier = asText(data.supplier, 80);
  const freight = asText(data.freight, 12).replace(/[^\d.,]/g, "");
  const notes = asText(data.notes, 300);
  if (lines.length === 0 && !supplier && !freight && !notes) return null;

  const entryDate = typeof data.entryDate === "string" && isIsoDate(data.entryDate) && data.entryDate <= today
    ? data.entryDate
    : today;

  return {
    v: 1,
    savedAt: data.savedAt,
    idempotencyKey,
    entryDate,
    origin: isEntryOrigin(data.origin) ? data.origin : "shopee",
    supplier,
    freight,
    notes,
    lines,
  };
}
