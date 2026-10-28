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
  grossMarginRatio,
  computeMonthGoal,
  validateGoalFields,
  isFinanceStatus,
  isValidDate,
  todayIso,
  daysBetween,
  formatDateShort,
  paymentState,
  summarizePayments,
  validatePaymentFields,
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

const goalInput = {
  expenses: 7000,
  withdrawal: 1000,
  desiredProfit: 3000,
  margin: 0.4,
  revenue: 10000,
  goalOverride: null,
  elapsedDays: 10,
  daysInMonth: 31,
};

test("margem bruta em razão: vendas menos reposição e taxas", () => {
  assert.equal(grossMarginRatio({ revenue: 2000, cogs: 880, paymentFees: 20 }), 0.55);
  assert.equal(grossMarginRatio({ revenue: 0, cogs: 0, paymentFees: 0 }), null);
});

test("meta sugerida = (despesas + retirada + lucro desejado) ÷ margem", () => {
  // (7.000 + 1.000 + 3.000) ÷ 0,40 = 27.500
  const goal = computeMonthGoal(goalInput);
  assert.equal(goal.suggestedGoal, 27500);
  assert.equal(goal.goal, 27500);
  assert.equal(goal.usesOverride, false);
  assert.equal(goal.reached, false);
});

test("ritmo diário divide o que falta pelos dias que restam, contando hoje", () => {
  // faltam 17.500 e restam 22 dias (do dia 10 ao 31)
  const goal = computeMonthGoal(goalInput);
  assert.equal(goal.remaining, 17500);
  assert.equal(goal.daysLeft, 22);
  assert.equal(goal.perDayNeeded, 795.45);
  assert.equal(Math.round(goal.progressPct), 36);
});

test("ritmo: verde quando o vendido alcança a fração da meta dos dias que passaram", () => {
  // esperado até o dia 10: 27.500 × 10 ÷ 31 = 8.870,97
  const goal = computeMonthGoal(goalInput);
  assert.equal(goal.expectedByToday, 8870.97);
  assert.equal(goal.onPace, true);
  assert.equal(computeMonthGoal({ ...goalInput, revenue: 8000 }).onPace, false);
});

test("meta digitada vale no lugar da sugerida e a sugerida continua disponível", () => {
  const goal = computeMonthGoal({ ...goalInput, goalOverride: 30000 });
  assert.equal(goal.goal, 30000);
  assert.equal(goal.usesOverride, true);
  assert.equal(goal.suggestedGoal, 27500);
  assert.equal(goal.remaining, 20000);
});

test("meta batida zera o que falta e o ritmo", () => {
  const goal = computeMonthGoal({ ...goalInput, revenue: 30000 });
  assert.equal(goal.reached, true);
  assert.equal(goal.remaining, 0);
  assert.equal(goal.perDayNeeded, 0);
});

test("mês encerrado não tem ritmo diário", () => {
  const goal = computeMonthGoal({ ...goalInput, elapsedDays: null });
  assert.equal(goal.daysLeft, null);
  assert.equal(goal.perDayNeeded, null);
  assert.equal(goal.onPace, null);
  assert.equal(goal.remaining, 17500);
});

test("último dia do mês ainda conta como um dia restante", () => {
  const goal = computeMonthGoal({ ...goalInput, elapsedDays: 31 });
  assert.equal(goal.daysLeft, 1);
  assert.equal(goal.perDayNeeded, 17500);
});

test("sem margem não há meta sugerida, mas a digitada funciona", () => {
  const semMargem = computeMonthGoal({ ...goalInput, margin: null });
  assert.equal(semMargem.suggestedGoal, null);
  assert.equal(semMargem.goal, null);
  assert.equal(semMargem.progressPct, null);
  assert.equal(semMargem.perDayNeeded, null);

  const margemZero = computeMonthGoal({ ...goalInput, margin: 0 });
  assert.equal(margemZero.suggestedGoal, null);

  const digitada = computeMonthGoal({ ...goalInput, margin: null, goalOverride: 25000 });
  assert.equal(digitada.goal, 25000);
  assert.equal(digitada.remaining, 15000);
});

test("sem despesas, retirada nem lucro desejado a meta é zero e fica sem barra", () => {
  const goal = computeMonthGoal({ ...goalInput, expenses: 0, withdrawal: 0, desiredProfit: 0 });
  assert.equal(goal.suggestedGoal, 0);
  assert.equal(goal.goal, null);
  assert.equal(goal.reached, false);
});

test("validateGoalFields aceita lucro desejado e meta opcional", () => {
  assert.deepEqual(validateGoalFields({ desiredProfit: 3000.456, goalOverride: null }), {
    desiredProfit: 3000.46,
    goalOverride: null,
  });
  assert.deepEqual(validateGoalFields({ desiredProfit: 0 }), { desiredProfit: 0, goalOverride: null });
  assert.deepEqual(validateGoalFields({ desiredProfit: 1000, goalOverride: 27500 }), {
    desiredProfit: 1000,
    goalOverride: 27500,
  });
});

test("validateGoalFields recusa lucro e meta inválidos", () => {
  assert.ok("error" in validateGoalFields({}));
  assert.ok("error" in validateGoalFields({ desiredProfit: -1 }));
  assert.ok("error" in validateGoalFields({ desiredProfit: "3000" }));
  assert.ok("error" in validateGoalFields({ desiredProfit: 1_000_001 }));
  assert.ok("error" in validateGoalFields({ desiredProfit: 100, goalOverride: 0 }));
  assert.ok("error" in validateGoalFields({ desiredProfit: 100, goalOverride: -5 }));
  assert.ok("error" in validateGoalFields({ desiredProfit: 100, goalOverride: "27500" }));
  assert.ok("error" in validateGoalFields({ desiredProfit: 100, goalOverride: 10_000_001 }));
});

// ---------- Pagamento das despesas ----------

const TODAY = "2026-10-28";

function entry(overrides) {
  return {
    id: "e",
    month: "2026-10",
    kind: "FIXA",
    label: "Aluguel",
    amount: 100,
    status: "PENDENTE",
    dueDate: null,
    paidAt: null,
    ...overrides,
  };
}

test("situação: só PAGO e PENDENTE", () => {
  assert.equal(isFinanceStatus("PAGO"), true);
  assert.equal(isFinanceStatus("PENDENTE"), true);
  assert.equal(isFinanceStatus("pago"), false);
  assert.equal(isFinanceStatus(undefined), false);
});

test("isValidDate aceita só datas reais de calendário", () => {
  assert.equal(isValidDate("2026-10-28"), true);
  assert.equal(isValidDate("2028-02-29"), true);
  assert.equal(isValidDate("2026-02-29"), false);
  assert.equal(isValidDate("2026-13-01"), false);
  assert.equal(isValidDate("2026-04-31"), false);
  assert.equal(isValidDate("28/10/2026"), false);
  assert.equal(isValidDate("1999-12-31"), false);
  assert.equal(isValidDate(20261028), false);
  assert.equal(isValidDate(null), false);
});

test("todayIso usa o dia de Brasília, não o de UTC", () => {
  // 02:00 UTC de 28/10 ainda é 23:00 de 27/10 em Brasília
  assert.equal(todayIso(new Date("2026-10-28T02:00:00Z")), "2026-10-27");
  assert.equal(todayIso(new Date("2026-10-28T12:00:00Z")), "2026-10-28");
});

test("daysBetween conta dias de calendário, inclusive entre meses e em ano bissexto", () => {
  assert.equal(daysBetween("2026-10-28", "2026-11-05"), 8);
  assert.equal(daysBetween("2026-11-05", "2026-10-28"), -8);
  assert.equal(daysBetween("2028-02-28", "2028-03-01"), 2);
  assert.equal(daysBetween("2026-10-28", "2026-10-28"), 0);
});

test("formatDateShort mostra dia/mês", () => {
  assert.equal(formatDateShort("2026-11-05"), "05/11");
});

test("estado de pagamento: pago, a pagar, vence hoje e vencida", () => {
  assert.deepEqual(paymentState(entry({ status: "PAGO", paidAt: "2026-10-12" }), TODAY), {
    tone: "paid",
    label: "Pago em 12/10",
    daysOverdue: 0,
  });
  assert.equal(paymentState(entry({ status: "PAGO" }), TODAY).label, "Pago");
  assert.deepEqual(paymentState(entry({}), TODAY), { tone: "pending", label: "A pagar", daysOverdue: 0 });
  assert.deepEqual(paymentState(entry({ dueDate: "2026-11-05" }), TODAY), {
    tone: "pending",
    label: "A pagar · vence 05/11",
    daysOverdue: 0,
  });
  assert.deepEqual(paymentState(entry({ dueDate: TODAY }), TODAY), {
    tone: "due-today",
    label: "Vence hoje",
    daysOverdue: 0,
  });
  assert.deepEqual(paymentState(entry({ dueDate: "2026-10-27" }), TODAY), {
    tone: "overdue",
    label: "Vencida há 1 dia",
    daysOverdue: 1,
  });
  assert.equal(paymentState(entry({ dueDate: "2026-10-25" }), TODAY).label, "Vencida há 3 dias");
});

test("pago nunca aparece como vencido, mesmo com vencimento antigo", () => {
  const state = paymentState(entry({ status: "PAGO", dueDate: "2026-09-01", paidAt: "2026-09-01" }), TODAY);
  assert.equal(state.tone, "paid");
});

test("resumo separa pago, a pagar e vencido, e ordena os próximos vencimentos", () => {
  const entries = [
    entry({ id: "1", label: "Energia", amount: 90, status: "PAGO", paidAt: "2026-10-10" }),
    entry({ id: "2", label: "Internet", amount: 120, dueDate: "2026-11-05" }),
    entry({ id: "3", label: "Aluguel", amount: 58.33, dueDate: "2026-10-20" }),
    entry({ id: "4", label: "Vigilantes", amount: 60 }),
    entry({ id: "5", label: "DAS", amount: 82, dueDate: "2026-10-28" }),
  ];
  const summary = summarizePayments(entries, TODAY);
  assert.equal(summary.paid, 90);
  assert.equal(summary.paidCount, 1);
  assert.equal(summary.pending, 320.33);
  assert.equal(summary.pendingCount, 4);
  assert.equal(summary.overdue, 58.33);
  assert.equal(summary.overdueCount, 1);
  // vencida primeiro, depois por data, sem data por último
  assert.deepEqual(
    summary.upcoming.map((item) => item.label),
    ["Aluguel", "DAS", "Internet", "Vigilantes"]
  );
});

test("resumo limita a lista de próximos vencimentos", () => {
  const entries = Array.from({ length: 8 }, (_, index) =>
    entry({ id: String(index), label: `Conta ${index}`, dueDate: `2026-11-0${index + 1}` })
  );
  assert.equal(summarizePayments(entries, TODAY, 3).upcoming.length, 3);
  assert.equal(summarizePayments(entries, TODAY).upcoming.length, 5);
  assert.equal(summarizePayments([], TODAY).pending, 0);
});

test("validatePaymentFields: lançamento novo sem situação vale como pago hoje", () => {
  assert.deepEqual(validatePaymentFields({}, { defaultStatus: "PAGO", today: TODAY }), {
    status: "PAGO",
    dueDate: null,
    paidAt: TODAY,
  });
});

test("validatePaymentFields: pago aceita data informada, vazia ou nula", () => {
  const ok = validatePaymentFields({ status: "PAGO", paidAt: "2026-10-10" }, { defaultStatus: "PAGO", today: TODAY });
  assert.equal(ok.paidAt, "2026-10-10");
  assert.equal(validatePaymentFields({ status: "PAGO", paidAt: null }, { defaultStatus: "PAGO", today: TODAY }).paidAt, null);
  assert.equal(validatePaymentFields({ status: "PAGO", paidAt: "" }, { defaultStatus: "PAGO", today: TODAY }).paidAt, null);
});

test("validatePaymentFields: pendente guarda vencimento e nunca data de pagamento", () => {
  const result = validatePaymentFields(
    { status: "PENDENTE", dueDate: "2026-11-05", paidAt: "2026-10-10" },
    { defaultStatus: "PAGO", today: TODAY }
  );
  assert.deepEqual(result, { status: "PENDENTE", dueDate: "2026-11-05", paidAt: null });
});

test("validatePaymentFields: ao editar, a situação é obrigatória", () => {
  assert.ok("error" in validatePaymentFields({ dueDate: "2026-11-05" }, { defaultStatus: null, today: TODAY }));
  assert.equal(
    validatePaymentFields({ status: "PENDENTE" }, { defaultStatus: null, today: TODAY }).status,
    "PENDENTE"
  );
});

test("validatePaymentFields recusa situação, vencimento e pagamento inválidos", () => {
  const opts = { defaultStatus: "PAGO", today: TODAY };
  assert.ok("error" in validatePaymentFields({ status: "ATRASADO" }, opts));
  assert.ok("error" in validatePaymentFields({ status: "PENDENTE", dueDate: "05/11/2026" }, opts));
  assert.ok("error" in validatePaymentFields({ status: "PENDENTE", dueDate: "2026-02-30" }, opts));
  assert.ok("error" in validatePaymentFields({ status: "PAGO", paidAt: "2026-13-01" }, opts));
  assert.ok("error" in validatePaymentFields({ status: "PAGO", paidAt: "2026-10-29" }, opts));
  assert.ok("error" in validatePaymentFields({ status: "PAGO", paidAt: 20261010 }, opts));
});
