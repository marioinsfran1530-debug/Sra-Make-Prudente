const test = require("node:test");
const assert = require("node:assert/strict");
const { buildOrderMessage, formatPhoneBR } = require("../.tmp-tests/whatsapp.js");

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

test("formata telefone brasileiro para exibição", () => {
  assert.equal(formatPhoneBR("5518991248713"), "(18) 99124-8713");
  assert.equal(formatPhoneBR("18991248713"), "(18) 99124-8713");
  assert.equal(formatPhoneBR("(18) 99124-8713"), "(18) 99124-8713");
  assert.equal(formatPhoneBR("+55 18 3222-1234"), "(18) 3222-1234");
  assert.equal(formatPhoneBR("1832221234"), "(18) 3222-1234");
});

test("telefone irreconhecível ou vazio não é alterado", () => {
  assert.equal(formatPhoneBR("12345"), "12345");
  assert.equal(formatPhoneBR(""), "");
  assert.equal(formatPhoneBR(null), "");
  assert.equal(formatPhoneBR(undefined), "");
});
