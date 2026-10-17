const test = require("node:test");
const assert = require("node:assert/strict");

const {
  parseMoneyInput,
  parseMonth,
  isValidMonth,
  shiftMonth,
  monthRange,
  monthLabel,
  currentMonth,
  summarizeMonth,
  isFinanceKind,
  DEFAULT_FIXED_EXPENSES,
  validateEntryFields,
} = require("../.tmp-tests/finance.js");

const baseInput = {
  revenue: 2000,
  cogs: 880, // 44%
  paymentFees: 20,
  fixedExpenses: 470.33,
  variableCosts: 100,
  withdrawal: 500,
  elapsedDays: null,
  daysInMonth: 31,
};

test("parseMoneyInput aceita formatos brasileiros e internacionais", () => {
  assert.equal(parseMoneyInput("90"), 90);
  assert.equal(parseMoneyInput("90,5"), 90.5);
  assert.equal(parseMoneyInput("1.234,56"), 1234.56);
  assert.equal(parseMoneyInput("R$ 58,33"), 58.33);
  assert.equal(parseMoneyInput("58.33"), 58.33);
  assert.equal(parseMoneyInput("0"), 0);
});

test("parseMoneyInput lê ponto seguido de três dígitos como milhar", () => {
  assert.equal(parseMoneyInput("1.500"), 1500);
  assert.equal(parseMoneyInput("12.345.678"), 12345678);
  // Duas casas depois do ponto continuam sendo decimais.
  assert.equal(parseMoneyInput("1.50"), 1.5);
});

test("parseMoneyInput rejeita vazio, texto e negativo", () => {
  assert.equal(parseMoneyInput(""), null);
  assert.equal(parseMoneyInput("   "), null);
  assert.equal(parseMoneyInput("abc"), null);
  assert.equal(parseMoneyInput("-10"), null);
  assert.equal(parseMoneyInput("10,5,5"), null);
});

test("mês: validação, navegação e intervalo em horário de Brasília", () => {
  assert.equal(isValidMonth("2026-10"), true);
  assert.equal(isValidMonth("2026-13"), false);
  assert.equal(isValidMonth("2026-1"), false);
  assert.equal(isValidMonth(undefined), false);

  assert.equal(shiftMonth("2026-10", 1), "2026-11");
  assert.equal(shiftMonth("2026-12", 1), "2027-01");
  assert.equal(shiftMonth("2026-01", -1), "2025-12");
  assert.equal(shiftMonth("2026-03", -15), "2024-12");

  const range = monthRange("2026-02");
  assert.equal(range.days, 28);
  assert.equal(range.start.toISOString(), "2026-02-01T03:00:00.000Z");
  assert.equal(range.end.toISOString(), "2026-03-01T03:00:00.000Z");
  assert.equal(monthRange("2028-02").days, 29);

  assert.equal(monthLabel("2026-10"), "Outubro de 2026");
});

test("parseMonth usa o mês atual de Brasília quando o valor é inválido", () => {
  // 02:00 UTC de 1º de novembro ainda é 31 de outubro em Brasília.
  const now = new Date("2026-11-01T02:00:00Z");
  assert.equal(currentMonth(now), "2026-10");
  assert.equal(parseMonth("lixo", now), "2026-10");
  assert.equal(parseMonth("2026-05", now), "2026-05");
});

test("resultado do mês separa lucro bruto, despesas e retirada", () => {
  const summary = summarizeMonth(baseInput);
  assert.equal(summary.grossProfit, 1100); // 2000 - 880 - 20
  assert.equal(summary.grossMarginPct, 55);
  assert.equal(summary.expenses, 570.33);
  assert.equal(summary.operatingResult, 529.67);
  assert.equal(summary.afterWithdrawal, 29.67);
});

test("ponto de equilíbrio usa a margem do próprio mês", () => {
  const summary = summarizeMonth(baseInput);
  // 570,33 / 0,55
  assert.equal(summary.breakEvenRevenue, 1036.96);
  // (570,33 + 500) / 0,55
  assert.equal(summary.breakEvenWithWithdrawal, 1946.05);
  assert.equal(summary.remainingToBreakEven, 0);
  assert.ok(summary.coveragePct > 100);
});

test("faltante para o equilíbrio aparece quando as vendas ainda não cobrem", () => {
  const summary = summarizeMonth({ ...baseInput, revenue: 500, cogs: 220, paymentFees: 5 });
  assert.equal(summary.remainingToBreakEven > 0, true);
  assert.equal(summary.coveragePct < 100, true);
  assert.equal(summary.operatingResult < 0, true);
});

test("sem vendas não há margem nem equilíbrio calculável", () => {
  const summary = summarizeMonth({ ...baseInput, revenue: 0, cogs: 0, paymentFees: 0 });
  assert.equal(summary.grossMarginPct, null);
  assert.equal(summary.breakEvenRevenue, null);
  assert.equal(summary.breakEvenWithWithdrawal, null);
  assert.equal(summary.remainingToBreakEven, null);
  assert.equal(summary.per100, null);
  assert.equal(summary.operatingResult, -570.33);
});

test("margem zero ou negativa não gera equilíbrio absurdo", () => {
  const summary = summarizeMonth({ ...baseInput, cogs: 2000 });
  assert.equal(summary.breakEvenRevenue, null);
  assert.equal(summary.breakEvenWithWithdrawal, null);
});

test("sem despesas o equilíbrio é zero", () => {
  const summary = summarizeMonth({ ...baseInput, fixedExpenses: 0, variableCosts: 0, withdrawal: 0 });
  assert.equal(summary.breakEvenRevenue, 0);
  assert.equal(summary.breakEvenWithWithdrawal, 0);
});

test("projeção só existe no mês corrente e com vendas", () => {
  const open = summarizeMonth({ ...baseInput, elapsedDays: 10 });
  assert.equal(open.projectedRevenue, 6200); // 2000/10*31
  assert.equal(open.projectedOperatingResult, Math.round((6200 * 0.55 - 570.33) * 100) / 100);

  assert.equal(summarizeMonth({ ...baseInput, elapsedDays: null }).projectedRevenue, null);
  assert.equal(summarizeMonth({ ...baseInput, elapsedDays: 0 }).projectedRevenue, null);
  assert.equal(
    summarizeMonth({ ...baseInput, elapsedDays: 10, revenue: 0, cogs: 0, paymentFees: 0 }).projectedRevenue,
    null
  );
});

test("para cada R$ 100 vendidos mostra reposição, taxas e lucro bruto", () => {
  const { per100 } = summarizeMonth(baseInput);
  assert.equal(per100.cogs, 44);
  assert.equal(per100.fees, 1);
  assert.equal(per100.grossProfit, 55);
});

test("tipos de lançamento e despesas padrão da planilha", () => {
  assert.equal(isFinanceKind("FIXA"), true);
  assert.equal(isFinanceKind("VARIAVEL"), true);
  assert.equal(isFinanceKind("RETIRADA"), true);
  assert.equal(isFinanceKind("OUTRO"), false);

  const total = DEFAULT_FIXED_EXPENSES.reduce((sum, item) => sum + item.amount, 0);
  assert.equal(Math.round(total * 100) / 100, 470.33);
});

test("validateEntryFields normaliza nome e arredonda o valor", () => {
  assert.deepEqual(validateEntryFields({ label: "  Energia  ", amount: 90.126 }), { label: "Energia", amount: 90.13 });
  assert.deepEqual(validateEntryFields({ label: "Brinde", amount: 0 }), { label: "Brinde", amount: 0 });
});

test("validateEntryFields recusa nome vazio, longo e valores inválidos", () => {
  assert.ok("error" in validateEntryFields({ label: "   ", amount: 10 }));
  assert.ok("error" in validateEntryFields({ label: "x".repeat(81), amount: 10 }));
  assert.ok("error" in validateEntryFields({ label: "Ok", amount: -1 }));
  assert.ok("error" in validateEntryFields({ label: "Ok", amount: "10" }));
  assert.ok("error" in validateEntryFields({ label: "Ok", amount: Number.NaN }));
  assert.ok("error" in validateEntryFields({ label: "Ok", amount: 1_000_001 }));
  assert.ok("error" in validateEntryFields({ amount: 10 }));
});
