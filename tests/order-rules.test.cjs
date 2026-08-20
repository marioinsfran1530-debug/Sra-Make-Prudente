const test = require("node:test");
const assert = require("node:assert/strict");

const {
  isValidOrderStatus,
  isClosedOrderStatus,
  stockWasDecremented,
  getAllowedOrderTransitions,
  canTransitionOrder,
} = require("../.tmp-tests/order-rules.js");

test("reconhece apenas status válidos", () => {
  assert.equal(isValidOrderStatus("NOVO"), true);
  assert.equal(isValidOrderStatus("CONFIRMADO"), true);
  assert.equal(isValidOrderStatus("CANCELADO"), true);
  assert.equal(isValidOrderStatus("QUALQUER"), false);
  assert.equal(isValidOrderStatus(null), false);
});

test("pedido finalizado ou cancelado é considerado encerrado", () => {
  assert.equal(isClosedOrderStatus("FINALIZADO"), true);
  assert.equal(isClosedOrderStatus("CANCELADO"), true);
  assert.equal(isClosedOrderStatus("CONFIRMADO"), false);
});

test("estoque só é considerado baixado a partir da confirmação", () => {
  assert.equal(stockWasDecremented("NOVO"), false);
  assert.equal(stockWasDecremented("EM_CONFIRMACAO"), false);
  assert.equal(stockWasDecremented("CONFIRMADO"), true);
  assert.equal(stockWasDecremented("SEPARANDO"), true);
  assert.equal(stockWasDecremented("PRONTO_RETIRADA"), true);
  assert.equal(stockWasDecremented("SAIU_ENTREGA"), true);
  assert.equal(stockWasDecremented("FINALIZADO"), true);
  assert.equal(stockWasDecremented("CANCELADO"), false);
});

test("pedido novo só pode confirmar ou cancelar", () => {
  assert.deepEqual(getAllowedOrderTransitions("NOVO"), ["CONFIRMADO", "CANCELADO"]);
  assert.equal(canTransitionOrder("NOVO", "CONFIRMADO"), true);
  assert.equal(canTransitionOrder("NOVO", "CANCELADO"), true);
  assert.equal(canTransitionOrder("NOVO", "FINALIZADO"), false);
});

test("pedido confirmado pode finalizar ou cancelar, sem confirmar novamente", () => {
  assert.equal(canTransitionOrder("CONFIRMADO", "FINALIZADO"), true);
  assert.equal(canTransitionOrder("CONFIRMADO", "CANCELADO"), true);
  assert.equal(canTransitionOrder("CONFIRMADO", "CONFIRMADO"), false);
});

test("status intermediários antigos preservam compatibilidade", () => {
  for (const status of ["SEPARANDO", "PRONTO_RETIRADA", "SAIU_ENTREGA"]) {
    assert.equal(canTransitionOrder(status, "FINALIZADO"), true);
    assert.equal(canTransitionOrder(status, "CANCELADO"), true);
  }
});

test("pedido encerrado não aceita nova transição", () => {
  assert.deepEqual(getAllowedOrderTransitions("FINALIZADO"), []);
  assert.deepEqual(getAllowedOrderTransitions("CANCELADO"), []);
  assert.equal(canTransitionOrder("FINALIZADO", "CANCELADO"), false);
  assert.equal(canTransitionOrder("CANCELADO", "CONFIRMADO"), false);
});

test("transição para status inválido é sempre rejeitada", () => {
  assert.equal(canTransitionOrder("NOVO", "PAGO"), false);
  assert.equal(canTransitionOrder("CONFIRMADO", "DESCONHECIDO"), false);
});
