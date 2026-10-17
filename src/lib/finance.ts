// Regras do fechamento do mês. Tudo aqui é puro (sem banco) para poder ser testado.

export const FINANCE_KINDS = [
  {
    value: "FIXA",
    label: "Despesas fixas",
    hint: "Aluguel, energia, internet, imposto (DAS), vigilância…",
  },
  {
    value: "VARIAVEL",
    label: "Custos variáveis do mês",
    hint: "Anúncios, embalagens, fretes pagos por vocês…",
  },
  {
    value: "RETIRADA",
    label: "Retirada dos sócios",
    hint: "O que vocês tiram do negócio para vocês.",
  },
] as const;

export type FinanceKind = (typeof FINANCE_KINDS)[number]["value"];

export type FinanceEntryRow = {
  id: string;
  month: string;
  kind: FinanceKind;
  label: string;
  amount: number;
};

export function isFinanceKind(value: unknown): value is FinanceKind {
  return FINANCE_KINDS.some((item) => item.value === value);
}

// Despesas fixas da planilha de precificação da loja, usadas como ponto de
// partida. Podem ser editadas ou removidas em cada mês.
export const DEFAULT_FIXED_EXPENSES = [
  { label: "Energia", amount: 90 },
  { label: "Aluguel/armazém", amount: 58.33 },
  { label: "Internet", amount: 120 },
  { label: "Recarga de celular", amount: 30 },
  { label: "Guia DAS", amount: 82 },
  { label: "Vigilantes", amount: 60 },
  { label: "Taxa PagSeguro", amount: 30 },
] as const;

// ---------- Datas (America/Sao_Paulo, sem horário de verão desde 2019) ----------

export function saoPauloToday(now: Date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "numeric",
    day: "numeric",
  }).formatToParts(now);
  const get = (type: string) => Number(parts.find((part) => part.type === type)?.value);
  return { year: get("year"), month: get("month"), day: get("day") };
}

function formatMonth(year: number, month: number) {
  return `${year}-${String(month).padStart(2, "0")}`;
}

export function currentMonth(now: Date = new Date()) {
  const { year, month } = saoPauloToday(now);
  return formatMonth(year, month);
}

export function isValidMonth(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-(0[1-9]|1[0-2])$/.test(value);
}

export function parseMonth(value: unknown, now: Date = new Date()) {
  return isValidMonth(value) ? value : currentMonth(now);
}

function splitMonth(month: string) {
  const [year, monthNumber] = month.split("-").map(Number);
  return { year, month: monthNumber };
}

export function shiftMonth(month: string, delta: number) {
  const { year, month: monthNumber } = splitMonth(month);
  const index = year * 12 + (monthNumber - 1) + delta;
  return formatMonth(Math.floor(index / 12), (index % 12) + 1);
}

// Intervalo [start, end) do mês em horário de Brasília (UTC-3).
export function monthRange(month: string) {
  const { year, month: monthNumber } = splitMonth(month);
  const start = new Date(Date.UTC(year, monthNumber - 1, 1, 3, 0, 0, 0));
  const end = new Date(Date.UTC(year, monthNumber, 1, 3, 0, 0, 0));
  const days = Math.round((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000));
  return { start, end, days };
}

export function monthLabel(month: string) {
  const { year, month: monthNumber } = splitMonth(month);
  const label = new Date(Date.UTC(year, monthNumber - 1, 15)).toLocaleDateString("pt-BR", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

// ---------- Valores digitados ----------

// Aceita "90", "90,5", "1.234,56", "1.500", "R$ 58,33" e "58.33". Retorna null
// se for vazio, inválido ou negativo. Sem vírgula, um ponto seguido de exatamente
// três dígitos é separador de milhar ("1.500" = 1500), como se escreve em reais.
export function parseMoneyInput(value: string): number | null {
  const cleaned = value.trim().replace(/\s/g, "").replace(/^R\$/i, "");
  if (!cleaned) return null;
  const thousandsOnly = /^\d{1,3}(\.\d{3})+$/.test(cleaned);
  const normalized = cleaned.includes(",")
    ? cleaned.replace(/\./g, "").replace(",", ".")
    : thousandsOnly
      ? cleaned.replace(/\./g, "")
      : cleaned;
  if (!/^\d+(\.\d+)?$/.test(normalized)) return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

// Valida nome e valor de um lançamento recebido pela API.
export const MAX_ENTRY_AMOUNT = 1_000_000;

export function validateEntryFields(body: Record<string, unknown>) {
  const label = typeof body.label === "string" ? body.label.trim() : "";
  if (label.length < 1 || label.length > 80) {
    return { error: "Informe um nome de até 80 caracteres." } as const;
  }
  const amount = typeof body.amount === "number" ? body.amount : Number.NaN;
  if (!Number.isFinite(amount) || amount < 0 || amount > MAX_ENTRY_AMOUNT) {
    return { error: "Informe um valor válido, de zero a R$ 1.000.000,00." } as const;
  }
  return { label, amount: Math.round(amount * 100) / 100 } as const;
}

// ---------- Resultado do mês ----------

export type MonthSummaryInput = {
  revenue: number; // vendas finalizadas no mês
  cogs: number; // custo das mercadorias vendidas (o que precisa voltar ao estoque)
  paymentFees: number; // taxas de cartão/link
  fixedExpenses: number;
  variableCosts: number;
  withdrawal: number;
  elapsedDays: number | null; // dias já passados do mês (null em mês encerrado)
  daysInMonth: number;
};

export type MonthSummary = {
  grossProfit: number;
  grossMarginPct: number | null;
  expenses: number;
  operatingResult: number;
  afterWithdrawal: number;
  breakEvenRevenue: number | null;
  breakEvenWithWithdrawal: number | null;
  coveragePct: number | null;
  remainingToBreakEven: number | null;
  projectedRevenue: number | null;
  projectedOperatingResult: number | null;
  per100: { cogs: number; fees: number; grossProfit: number } | null;
};

function round2(value: number) {
  return Math.round(value * 100) / 100;
}

export function summarizeMonth(input: MonthSummaryInput): MonthSummary {
  const { revenue, cogs, paymentFees } = input;
  const grossProfit = round2(revenue - cogs - paymentFees);
  const expenses = round2(input.fixedExpenses + input.variableCosts);
  const operatingResult = round2(grossProfit - expenses);
  const afterWithdrawal = round2(operatingResult - input.withdrawal);

  // Sem vendas não há margem conhecida, então não dá para calcular equilíbrio.
  const margin = revenue > 0 ? grossProfit / revenue : null;
  const marginUsable = margin !== null && margin > 0;

  const breakEvenRevenue = expenses === 0 ? 0 : marginUsable ? round2(expenses / margin) : null;
  const withWithdrawalTotal = round2(expenses + input.withdrawal);
  const breakEvenWithWithdrawal =
    withWithdrawalTotal === 0 ? 0 : marginUsable ? round2(withWithdrawalTotal / margin) : null;

  const coveragePct =
    breakEvenRevenue !== null && breakEvenRevenue > 0 ? (revenue / breakEvenRevenue) * 100 : null;
  const remainingToBreakEven =
    breakEvenRevenue !== null ? round2(Math.max(0, breakEvenRevenue - revenue)) : null;

  const canProject = input.elapsedDays !== null && input.elapsedDays > 0 && revenue > 0;
  const projectedRevenue = canProject
    ? round2((revenue / (input.elapsedDays as number)) * input.daysInMonth)
    : null;
  const projectedOperatingResult =
    projectedRevenue !== null && margin !== null ? round2(projectedRevenue * margin - expenses) : null;

  return {
    grossProfit,
    grossMarginPct: margin === null ? null : round2(margin * 100),
    expenses,
    operatingResult,
    afterWithdrawal,
    breakEvenRevenue,
    breakEvenWithWithdrawal,
    coveragePct,
    remainingToBreakEven,
    projectedRevenue,
    projectedOperatingResult,
    per100:
      revenue > 0
        ? {
            cogs: round2((cogs / revenue) * 100),
            fees: round2((paymentFees / revenue) * 100),
            grossProfit: round2((grossProfit / revenue) * 100),
          }
        : null,
  };
}
