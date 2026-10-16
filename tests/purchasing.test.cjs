const test = require("node:test");
const assert = require("node:assert/strict");

const {
  suggestPurchase,
  stockValue,
  parseHorizon,
  parseSupplyOrigin,
} = require("../.tmp-tests/purchasing.js");

const base = { stockQty: 2, unitsSold: 30, price: 25, costPrice: null };

test("sugere compra cobrindo o prazo de chegada mais o horizonte", () => {
  // 1 un/dia; chegada em 7 dias + 30 dias = 37; tem 2 em estoque => 35.
  const result = suggestPurchase(base, { horizonDays: 30, leadDays: 7 });
  assert.equal(result.dailySales, 1);
  assert.equal(result.coverageDays, 2);
  assert.equal(result.suggestedQty, 35);
});

test("marca como urgente quando o estoque acaba antes de a compra chegar", () => {
  assert.equal(suggestPurchase(base, { horizonDays: 15, leadDays: 7 }).urgent, true);
  assert.equal(suggestPurchase(base, { horizonDays: 15, leadDays: 1 }).urgent, false);
});

test("não sugere compra quando o estoque já cobre o período", () => {
  const result = suggestPurchase({ ...base, stockQty: 100 }, { horizonDays: 30, leadDays: 7 });
  assert.equal(result.suggestedQty, 0);
  assert.equal(result.lineTotal, 0);
  assert.equal(result.urgent, false);
});

test("sem venda no período não há cobertura nem compra", () => {
  const result = suggestPurchase({ ...base, unitsSold: 0 }, { horizonDays: 30, leadDays: 7 });
  assert.equal(result.dailySales, 0);
  assert.equal(result.coverageDays, null);
  assert.equal(result.suggestedQty, 0);
  assert.equal(result.urgent, false);
});

test("arredonda a quantidade para cima sem criar unidade por ruído de ponto flutuante", () => {
  // 0,1 un/dia * 30 dias = 3 exatos; com 3 em estoque não falta nada.
  const exact = suggestPurchase({ ...base, unitsSold: 3, stockQty: 3 }, { horizonDays: 30, leadDays: 0 });
  assert.equal(exact.suggestedQty, 0);
  // 0,1 un/dia * 15 dias = 1,5 => compra 2.
  const partial = suggestPurchase({ ...base, unitsSold: 3, stockQty: 0 }, { horizonDays: 15, leadDays: 0 });
  assert.equal(partial.suggestedQty, 2);
});

test("usa o custo real quando existe e a estimativa de 44% quando não", () => {
  const estimated = suggestPurchase(base, { horizonDays: 30, leadDays: 7 });
  assert.equal(estimated.costIsEstimated, true);
  assert.equal(estimated.unitCost, 11);
  assert.equal(estimated.lineTotal, 385);

  const real = suggestPurchase({ ...base, costPrice: 10 }, { horizonDays: 30, leadDays: 7 });
  assert.equal(real.costIsEstimated, false);
  assert.equal(real.unitCost, 10);
  assert.equal(real.lineTotal, 350);
});

test("estoque negativo é tratado como zero", () => {
  const result = suggestPurchase({ ...base, stockQty: -4 }, { horizonDays: 30, leadDays: 7 });
  assert.equal(result.coverageDays, 0);
  assert.equal(result.suggestedQty, 37);
});

test("valor parado em estoque usa custo real ou estimado", () => {
  assert.deepEqual(stockValue({ stockQty: 10, price: 25, costPrice: null }), {
    unitCost: 11,
    costIsEstimated: true,
    value: 110,
  });
  assert.deepEqual(stockValue({ stockQty: 10, price: 25, costPrice: 8 }), {
    unitCost: 8,
    costIsEstimated: false,
    value: 80,
  });
  assert.equal(stockValue({ stockQty: -3, price: 25, costPrice: 8 }).value, 0);
});

test("parâmetros inválidos voltam aos padrões", () => {
  assert.equal(parseHorizon("15"), 15);
  assert.equal(parseHorizon("7"), 30);
  assert.equal(parseHorizon(undefined), 30);
  assert.equal(parseSupplyOrigin("cidade").leadDays, 1);
  assert.equal(parseSupplyOrigin("xyz").value, "shopee");
});
