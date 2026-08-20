const test = require("node:test");
const assert = require("node:assert/strict");

const {
  normalizeBrazilPhone,
  orderItemsFingerprint,
  sameOrderItems,
  buildOrderRequestKey,
} = require("../.tmp-tests/order-request-safety.js");

test("normaliza celular brasileiro com máscara", () => {
  assert.equal(normalizeBrazilPhone("(18) 99999-9999"), "+5518999999999");
});

test("normaliza telefone brasileiro com código do país", () => {
  assert.equal(normalizeBrazilPhone("+55 18 3222-3344"), "+551832223344");
});

test("rejeita telefone curto ou sequência artificial", () => {
  assert.equal(normalizeBrazilPhone("9999"), null);
  assert.equal(normalizeBrazilPhone("11111111111"), null);
});

test("fingerprint de itens não depende da ordem das linhas", () => {
  const first = [
    { productId: "p2", variantId: null, qty: 1 },
    { productId: "p1", variantId: "v1", qty: 2 },
  ];
  const second = [
    { productId: "p1", variantId: "v1", qty: 2 },
    { productId: "p2", variantId: null, qty: 1 },
  ];

  assert.equal(orderItemsFingerprint(first), orderItemsFingerprint(second));
  assert.equal(sameOrderItems(first, second), true);
});

test("pedidos com quantidade ou variante diferente não são duplicados", () => {
  assert.equal(
    sameOrderItems(
      [{ productId: "p1", variantId: "v1", qty: 1 }],
      [{ productId: "p1", variantId: "v1", qty: 2 }]
    ),
    false
  );

  assert.equal(
    sameOrderItems(
      [{ productId: "p1", variantId: "v1", qty: 1 }],
      [{ productId: "p1", variantId: "v2", qty: 1 }]
    ),
    false
  );
});

test("chave de idempotencia é estável mesmo com itens em outra ordem", () => {
  const base = {
    customerPhone: "+5518999999999",
    sessionId: "sessao-1",
    deliveryType: "RETIRADA",
    payment: "PIX",
    address: "",
  };

  const first = buildOrderRequestKey({
    ...base,
    items: [
      { productId: "p2", variantId: null, qty: 1 },
      { productId: "p1", variantId: "v1", qty: 2 },
    ],
  });

  const second = buildOrderRequestKey({
    ...base,
    items: [
      { productId: "p1", variantId: "v1", qty: 2 },
      { productId: "p2", variantId: null, qty: 1 },
    ],
  });

  assert.equal(first, second);
});

test("chave muda quando dados relevantes do pedido mudam", () => {
  const base = {
    customerPhone: "+5518999999999",
    sessionId: "sessao-1",
    deliveryType: "ENTREGA",
    payment: "PIX",
    address: "Rua A, 10",
    items: [{ productId: "p1", variantId: null, qty: 1 }],
  };

  assert.notEqual(
    buildOrderRequestKey(base),
    buildOrderRequestKey({ ...base, address: "Rua A, 11" })
  );
});
