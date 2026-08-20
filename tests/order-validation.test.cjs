const test = require("node:test");
const assert = require("node:assert/strict");

const {
  resolveOrderUnitPrice,
  orderItemRequiresVariant,
  hasEnoughStock,
  orderLineKey,
} = require("../.tmp-tests/order-validation.js");

test("preço promocional da variante tem prioridade", () => {
  assert.equal(
    resolveOrderUnitPrice({
      productPrice: 30,
      productPromoPrice: 25,
      variantPrice: 35,
      variantPromoPrice: 20,
    }),
    20
  );
});

test("preço da variante tem prioridade sobre o preço do produto", () => {
  assert.equal(
    resolveOrderUnitPrice({
      productPrice: 30,
      productPromoPrice: 25,
      variantPrice: 35,
      variantPromoPrice: null,
    }),
    35
  );
});

test("promoção do produto é usada quando variante não define preço", () => {
  assert.equal(
    resolveOrderUnitPrice({
      productPrice: 30,
      productPromoPrice: 25,
      variantPrice: null,
      variantPromoPrice: null,
    }),
    25
  );
});

test("produto com variantes ativas exige escolha de opção", () => {
  assert.equal(orderItemRequiresVariant(2, null), true);
  assert.equal(orderItemRequiresVariant(2, "variante-1"), false);
  assert.equal(orderItemRequiresVariant(0, null), false);
});

test("estoque precisa cobrir toda a quantidade solicitada", () => {
  assert.equal(hasEnoughStock(5, 5), true);
  assert.equal(hasEnoughStock(5, 6), false);
  assert.equal(hasEnoughStock(0, 1), false);
  assert.equal(hasEnoughStock(10, 0), false);
  assert.equal(hasEnoughStock(10, 1.5), false);
});

test("chave de linha separa produto base de cada variante", () => {
  assert.equal(orderLineKey("produto", null), "produto:base");
  assert.equal(orderLineKey("produto", "v1"), "produto:v1");
  assert.notEqual(orderLineKey("produto", "v1"), orderLineKey("produto", "v2"));
});
