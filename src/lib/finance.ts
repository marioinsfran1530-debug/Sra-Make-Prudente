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

// ---------- Meta do mês ----------

export const MAX_GOAL_AMOUNT = 10_000_000;

// Margem bruta (de 0 a 1) das vendas de um mês; null quando não há vendas.
export function grossMarginRatio(input: { revenue: number; cogs: number; paymentFees: number }) {
  if (!(input.revenue > 0)) return null;
  return (input.revenue - input.cogs - input.paymentFees) / input.revenue;
}

export type MonthGoalInput = {
  expenses: number; // despesas fixas + custos variáveis lançados no mês
  withdrawal: number; // retirada dos sócios (pró-labore)
  desiredProfit: number; // quanto a loja deve sobrar depois de tudo
  margin: number | null; // margem bruta de 0 a 1; null quando desconhecida
  revenue: number; // vendas finalizadas até agora
  goalOverride: number | null; // meta digitada, que vale no lugar da calculada
  elapsedDays: number | null; // dia do mês em andamento (null em mês encerrado)
  daysInMonth: number;
};

export type MonthGoal = {
  suggestedGoal: number | null;
  goal: number | null;
  usesOverride: boolean;
  reached: boolean;
  progressPct: number | null;
  remaining: number | null;
  daysLeft: number | null; // dias que restam contando hoje
  perDayNeeded: number | null;
  expectedByToday: number | null;
  onPace: boolean | null;
};

// Meta sugerida = (despesas + retirada + lucro desejado) ÷ margem bruta.
export function computeMonthGoal(input: MonthGoalInput): MonthGoal {
  const needed = round2(input.expenses + input.withdrawal + input.desiredProfit);
  const marginUsable = input.margin !== null && input.margin > 0;
  const suggestedGoal = needed === 0 ? 0 : marginUsable ? round2(needed / (input.margin as number)) : null;

  const usesOverride = input.goalOverride !== null && input.goalOverride > 0;
  const goal = usesOverride ? (input.goalOverride as number) : suggestedGoal;
  const hasGoal = goal !== null && goal > 0;

  const remaining = hasGoal ? round2(Math.max(0, (goal as number) - input.revenue)) : null;
  const daysLeft =
    input.elapsedDays !== null ? Math.max(1, input.daysInMonth - input.elapsedDays + 1) : null;
  const expectedByToday =
    hasGoal && input.elapsedDays !== null
      ? round2(((goal as number) * input.elapsedDays) / input.daysInMonth)
      : null;

  return {
    suggestedGoal,
    goal: hasGoal ? (goal as number) : null,
    usesOverride,
    reached: hasGoal && input.revenue >= (goal as number),
    progressPct: hasGoal ? (input.revenue / (goal as number)) * 100 : null,
    remaining,
    daysLeft,
    perDayNeeded: remaining !== null && daysLeft !== null ? round2(remaining / daysLeft) : null,
    expectedByToday,
    onPace: expectedByToday !== null ? input.revenue >= expectedByToday : null,
  };
}

// Valida o lucro desejado e a meta digitada recebidos pela API.
// A meta é opcional: null (ou ausente) volta a usar a meta sugerida.
export function validateGoalFields(body: Record<string, unknown>) {
  const desiredProfit = typeof body.desiredProfit === "number" ? body.desiredProfit : Number.NaN;
  if (!Number.isFinite(desiredProfit) || desiredProfit < 0 || desiredProfit > MAX_ENTRY_AMOUNT) {
    return { error: "Informe um lucro desejado válido, de zero a R$ 1.000.000,00." } as const;
  }

  let goalOverride: number | null = null;
  if (body.goalOverride !== null && body.goalOverride !== undefined) {
    const value = typeof body.goalOverride === "number" ? body.goalOverride : Number.NaN;
    if (!Number.isFinite(value) || value <= 0 || value > MAX_GOAL_AMOUNT) {
      return { error: "Informe uma meta de vendas válida, de R$ 0,01 a R$ 10.000.000,00." } as const;
    }
    goalOverride = round2(value);
  }

  return { desiredProfit: round2(desiredProfit), goalOverride } as const;
}
