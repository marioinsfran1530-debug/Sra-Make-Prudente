const test = require("node:test");
const assert = require("node:assert/strict");

const {
  computeStockStatus,
  productStockStatus,
  STOCK_LABEL,
} = require("../.tmp-tests/stock.js");

test("computeStockStatus marca zero e negativo como indisponível", () => {
  assert.equal(computeStockStatus(0), "INDISPONIVEL");
  assert.equal(computeStockStatus(-1), "INDISPONIVEL");
});

test("computeStockStatus marca de 1 a 5 como últimas unidades", () => {
  assert.equal(computeStockStatus(1), "ULTIMAS");
  assert.equal(computeStockStatus(5), "ULTIMAS");
});

test("computeStockStatus marca acima de 5 como disponível", () => {
  assert.equal(computeStockStatus(6), "DISPONIVEL");
  assert.equal(computeStockStatus(100), "DISPONIVEL");
});

test("produto sem variantes usa o estoque principal", () => {
  assert.equal(productStockStatus({ stockQty: 0 }), "INDISPONIVEL");
  assert.equal(productStockStatus({ stockQty: 3 }), "ULTIMAS");
  assert.equal(productStockStatus({ stockQty: 9 }), "DISPONIVEL");
});

test("produto com variantes considera somente variantes ativas", () => {
  assert.equal(
    productStockStatus({
      stockQty: 99,
      variants: [
        { stockQty: 20, active: false },
        { stockQty: 4, active: true },
      ],
    }),
    "ULTIMAS"
  );
});

test("produto com variantes ativas usa a melhor disponibilidade", () => {
  assert.equal(
    productStockStatus({
      stockQty: 0,
      variants: [
        { stockQty: 0, active: true },
        { stockQty: 2, active: true },
        { stockQty: 8, active: true },
      ],
    }),
    "DISPONIVEL"
  );
});

test("produto sem variantes ativas fica indisponível", () => {
  assert.equal(
    productStockStatus({
      stockQty: 10,
      variants: [
        { stockQty: 10, active: false },
        { stockQty: 3, active: false },
      ],
    }),
    "INDISPONIVEL"
  );
});

test("rótulos públicos permanecem coerentes com os status", () => {
  assert.equal(STOCK_LABEL.DISPONIVEL, "Disponível");
  assert.equal(STOCK_LABEL.ULTIMAS, "Últimas unidades");
  assert.equal(STOCK_LABEL.INDISPONIVEL, "Indisponível");
});
