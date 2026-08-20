const test = require("node:test");
const assert = require("node:assert/strict");

const {
  normalizeBrazilPhone,
  orderItemsFingerprint,
  sameOrderItems,
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
