const test = require("node:test");
const assert = require("node:assert/strict");

const { matchesCounterSaleQuery } = require("../.tmp-tests/counter-sale-search.js");

const cola = ["Cola para cílios", "Vivai", "COLA-01", "Preta 5ml COLA-01-P"];

test("busca vazia não filtra nada", () => {
  assert.equal(matchesCounterSaleQuery(cola, ""), true);
  assert.equal(matchesCounterSaleQuery(cola, "   "), true);
});

test("palavras em qualquer ordem e sem acento", () => {
  assert.equal(matchesCounterSaleQuery(cola, "cola cilios"), true);
  assert.equal(matchesCounterSaleQuery(cola, "cilios cola"), true);
  assert.equal(matchesCounterSaleQuery(cola, "CÍLIOS"), true);
});

test("palavras de ligação são ignoradas", () => {
  assert.equal(matchesCounterSaleQuery(["Pincel sereia", "Marca"], "pincel de sereia"), true);
});

test("todas as palavras precisam aparecer", () => {
  assert.equal(matchesCounterSaleQuery(cola, "cola glitter"), false);
});

test("plural e singular valem igual", () => {
  assert.equal(matchesCounterSaleQuery(cola, "colas"), true);
  assert.equal(matchesCounterSaleQuery(["Cílio fio a fio"], "cilios"), true);
});

test("acha por marca, SKU e variação", () => {
  assert.equal(matchesCounterSaleQuery(cola, "vivai"), true);
  assert.equal(matchesCounterSaleQuery(cola, "cola-01"), true);
  assert.equal(matchesCounterSaleQuery(cola, "preta 5ml"), true);
});

test("campos vazios ou nulos não quebram", () => {
  assert.equal(matchesCounterSaleQuery(["Batom", null, undefined, ""], "batom"), true);
  assert.equal(matchesCounterSaleQuery([], "batom"), false);
});

test("só palavras de ligação ainda procura por elas", () => {
  assert.equal(matchesCounterSaleQuery(["Kit de cílios"], "de"), true);
  assert.equal(matchesCounterSaleQuery(["Batom"], "de"), false);
});
