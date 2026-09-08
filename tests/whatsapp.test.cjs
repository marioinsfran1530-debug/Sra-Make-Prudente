const test = require("node:test");
const assert = require("node:assert/strict");
const { buildOrderMessage } = require("../.tmp-tests/whatsapp.js");

const BASE_ORDER = {
  orderNumber: 123,
  customerName: "Cliente",
  customerPhone: "18999999999",
  items: [
    {
      name: "Produto teste",
      variantName: null,
      qty: 1,
      subtotal: 10,
    },
  ],
  subtotal: 10,
  deliveryFee: 0,
  total: 10,
  payment: "CONFIRMAR_WHATSAPP",
};

test("explica a 99Entrega sem somar uma taxa ainda não confirmada", () => {
  const message = buildOrderMessage({
    ...BASE_ORDER,
    deliveryType: "ENTREGA",
    address: "Rua de teste, 10",
  });

  assert.match(message, /Entrega por 99Entrega em Presidente Prudente/);
  assert.match(message, /detalhes confirmados no WhatsApp/);
  assert.match(message, /\*Total dos produtos: R\$\s*10,00\*/);
  assert.doesNotMatch(message, /\*Total: R\$\s*10,00\*/);
});

test("mantém retirada separada da comunicação de entrega", () => {
  const message = buildOrderMessage({
    ...BASE_ORDER,
    deliveryType: "RETIRADA",
  });

  assert.match(message, /Tipo: Retirar na loja/);
  assert.match(message, /Combinar no WhatsApp/);
  assert.doesNotMatch(message, /99Entrega/);
});
