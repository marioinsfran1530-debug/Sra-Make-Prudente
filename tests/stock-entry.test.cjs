const test = require("node:test");
const assert = require("node:assert/strict");

const {
  allocateFreight,
  canReverseLine,
  costAfterReversal,
  entryTotals,
  landedUnitCost,
  parseEntryInput,
  weightedAverageCost,
} = require("../.tmp-tests/stock-entry.js");

const TODAY = "2026-11-07";

function valid(extra = {}) {
  return {
    idempotencyKey: "entrada-123456",
    entryDate: "2026-11-07",
    origin: "shopee",
    supplier: "Loja X",
    freight: 0,
    notes: "",
    lines: [{ productId: "p1", variantId: null, qty: 10, unitCost: 5 }],
    ...extra,
  };
}

test("aceita uma entrada válida e normaliza os campos", () => {
  const out = parseEntryInput(valid({ supplier: "  Loja X  ", freight: "12,5", lines: [{ productId: " p1 ", qty: "3", unitCost: "4,5" }] }), TODAY);
  assert.ok(out.value, out.error);
  assert.equal(out.value.supplier, "Loja X");
  assert.equal(out.value.freight, 12.5);
  assert.deepEqual(out.value.lines, [{ productId: "p1", variantId: null, qty: 3, unitCost: 4.5 }]);
});

test("rejeita entrada sem itens, sem origem ou sem identificador", () => {
  assert.ok(parseEntryInput(valid({ lines: [] }), TODAY).error);
  assert.ok(parseEntryInput(valid({ origin: "lua" }), TODAY).error);
  assert.ok(parseEntryInput(valid({ idempotencyKey: "abc" }), TODAY).error);
  assert.ok(parseEntryInput(null, TODAY).error);
});

test("data: formato, futuro e inexistente", () => {
  assert.ok(parseEntryInput(valid({ entryDate: "2026-11-08" }), TODAY).error);
  assert.ok(parseEntryInput(valid({ entryDate: "2026-02-30" }), TODAY).error);
  assert.ok(parseEntryInput(valid({ entryDate: "07/11/2026" }), TODAY).error);
  assert.ok(parseEntryInput(valid({ entryDate: "2026-11-07" }), TODAY).value);
  assert.ok(parseEntryInput(valid({ entryDate: "2026-01-15" }), TODAY).value);
});

test("quantidade e custo precisam ser válidos", () => {
  const bad = (line) => parseEntryInput(valid({ lines: [{ productId: "p1", variantId: null, qty: 1, unitCost: 1, ...line }] }), TODAY).error;
  assert.ok(bad({ qty: 0 }));
  assert.ok(bad({ qty: 1.5 }));
  assert.ok(bad({ qty: 10000 }));
  assert.ok(bad({ unitCost: 0 }));
  assert.ok(bad({ unitCost: -3 }));
  assert.ok(bad({ unitCost: "abc" }));
  assert.ok(bad({ productId: "" }));
});

test("frete inválido e item repetido", () => {
  assert.ok(parseEntryInput(valid({ freight: -1 }), TODAY).error);
  assert.ok(parseEntryInput(valid({ freight: "x" }), TODAY).error);
  const repeated = [{ productId: "p1", variantId: null, qty: 1, unitCost: 2 }, { productId: "p1", variantId: null, qty: 2, unitCost: 3 }];
  assert.ok(parseEntryInput(valid({ lines: repeated }), TODAY).error);
  const variants = [{ productId: "p1", variantId: "v1", qty: 1, unitCost: 2 }, { productId: "p1", variantId: "v2", qty: 2, unitCost: 3 }];
  assert.ok(parseEntryInput(valid({ lines: variants }), TODAY).value);
});

test("frete é rateado pelo valor de cada linha e a soma fecha", () => {
  const lines = [{ qty: 10, unitCost: 5 }, { qty: 5, unitCost: 10 }, { qty: 1, unitCost: 100 }]; // 50, 50, 100
  const shares = allocateFreight(lines, 20);
  assert.deepEqual(shares, [5, 5, 10]);
  assert.equal(shares.reduce((a, b) => a + b, 0), 20);
});

test("rateio de frete com centavos quebrados soma exatamente o frete", () => {
  const lines = [{ qty: 1, unitCost: 10 }, { qty: 1, unitCost: 10 }, { qty: 1, unitCost: 10 }];
  const shares = allocateFreight(lines, 10);
  assert.equal(Math.round(shares.reduce((a, b) => a + b, 0) * 100), 1000);
  assert.ok(shares.every((s) => s === 3.33 || s === 3.34));
});

test("sem frete o rateio é zero", () => {
  assert.deepEqual(allocateFreight([{ qty: 1, unitCost: 5 }], 0), [0]);
  assert.deepEqual(allocateFreight([], 10), []);
});

test("custo com frete por unidade", () => {
  assert.equal(landedUnitCost({ qty: 10, unitCost: 5 }, 5), 5.5);
  assert.equal(landedUnitCost({ qty: 3, unitCost: 10 }, 0), 10);
});

test("média ponderada: mistura o estoque que sobrou com a compra nova", () => {
  // 10 un. a R$ 10 + 10 un. a R$ 14 = R$ 12
  assert.equal(weightedAverageCost({ stockBefore: 10, costBefore: 10, qty: 10, landedUnitCost: 14 }), 12);
  // 2 un. a R$ 10 + 8 un. a R$ 15 = (20 + 120) / 10 = 14
  assert.equal(weightedAverageCost({ stockBefore: 2, costBefore: 10, qty: 8, landedUnitCost: 15 }), 14);
});

test("sem custo anterior ou sem estoque, vale o custo da entrada", () => {
  assert.equal(weightedAverageCost({ stockBefore: 10, costBefore: null, qty: 5, landedUnitCost: 7.5 }), 7.5);
  assert.equal(weightedAverageCost({ stockBefore: 0, costBefore: 99, qty: 5, landedUnitCost: 7.5 }), 7.5);
  assert.equal(weightedAverageCost({ stockBefore: -3, costBefore: 99, qty: 5, landedUnitCost: 7.5 }), 7.5);
});

test("totais da entrada", () => {
  const totals = entryTotals([{ qty: 10, unitCost: 5 }, { qty: 2, unitCost: 7.25 }], 6);
  assert.deepEqual(totals, { items: 2, units: 12, subtotal: 64.5, freight: 6, total: 70.5 });
});

test("estorno só se o estoque comporta o que entrou", () => {
  assert.equal(canReverseLine(10, 10), true);
  assert.equal(canReverseLine(9, 10), false);
  assert.equal(canReverseLine(0, 1), false);
});

test("custo anterior só volta se o custo não mudou depois da entrada", () => {
  assert.deepEqual(costAfterReversal({ currentCost: 12, costAfter: 12, costBefore: 10 }), { restore: true, cost: 10 });
  assert.deepEqual(costAfterReversal({ currentCost: 12, costAfter: 12, costBefore: null }), { restore: true, cost: null });
  assert.deepEqual(costAfterReversal({ currentCost: 13, costAfter: 12, costBefore: 10 }), { restore: false, cost: 13 });
  assert.deepEqual(costAfterReversal({ currentCost: null, costAfter: 12, costBefore: 10 }), { restore: false, cost: null });
});

test("valores digitados no jeito brasileiro", () => {
  const { parseMoneyText } = require("../.tmp-tests/money-text.js");
  assert.equal(parseMoneyText("12"), 12);
  assert.equal(parseMoneyText("12,5"), 12.5);
  assert.equal(parseMoneyText("12.5"), 12.5);
  assert.equal(parseMoneyText("R$ 12,50"), 12.5);
  assert.equal(parseMoneyText("1.234,56"), 1234.56);
  assert.equal(parseMoneyText("1.234"), 1234);
  assert.equal(parseMoneyText("1.234.567"), 1234567);
  assert.equal(parseMoneyText("0.500"), 0.5);
  assert.equal(parseMoneyText(",5"), 0.5);
  assert.ok(Number.isNaN(parseMoneyText("")));
  assert.ok(Number.isNaN(parseMoneyText("  ")));
  assert.ok(Number.isNaN(parseMoneyText("abc")));
  assert.ok(Number.isNaN(parseMoneyText("1,2,3")));
  assert.ok(Number.isNaN(parseMoneyText("-5")));
});

test("custo com milhar digitado é aceito na entrada", () => {
  const out = parseEntryInput(valid({ lines: [{ productId: "p1", variantId: null, qty: "2", unitCost: "1.250,90" }] }), TODAY);
  assert.ok(out.value, out.error);
  assert.equal(out.value.lines[0].unitCost, 1250.9);
});

test("avisa quando o custo foge muito do atual", () => {
  const { costDeviation } = require("../.tmp-tests/stock-entry.js");
  assert.equal(costDeviation(15, 150), "alto");
  assert.equal(costDeviation(15, 30), "alto");
  assert.equal(costDeviation(15, 7.5), "baixo");
  assert.equal(costDeviation(15, 18), null);
  assert.equal(costDeviation(15, 12), null);
  assert.equal(costDeviation(null, 999), null);
  assert.equal(costDeviation(0, 10), null);
});
