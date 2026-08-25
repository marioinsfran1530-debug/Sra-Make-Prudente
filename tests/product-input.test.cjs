const test = require('node:test');
const assert = require('node:assert/strict');
const { isValidGtin, validateProductInput } = require('../.tmp-tests/product-input.js');

const usefulDescription = 'Descrição útil do produto com características e uso principal para o cliente.';

test('aceita um cadastro de produto consistente', () => {
  const result = validateProductInput({
    name: 'Gloss Labial Rosa',
    brand: 'Ruby Rose',
    sku: '7891000315507',
    description: 'Gloss labial com acabamento brilhante para uso diário e aplicação prática.',
    price: 19.9,
    promoPrice: 14.9,
    stockQty: 10,
  });
  assert.equal(result.ok, true);
  assert.equal(result.data.name, 'Gloss Labial Rosa');
});

test('rejeita novo produto sem descrição útil', () => {
  const missing = validateProductInput({
    name: 'Produto Teste',
    brand: 'Marca',
    description: '',
    price: 10,
    stockQty: 1,
  });
  assert.equal(missing.ok, false);
  assert.match(missing.errors.join(' '), /descrição útil/i);

  const short = validateProductInput({
    name: 'Produto Teste',
    brand: 'Marca',
    description: 'Descrição curta.',
    price: 10,
    stockQty: 1,
  });
  assert.equal(short.ok, false);
  assert.match(short.errors.join(' '), /50 caracteres/i);
});

test('rejeita preço, promoção e estoque inconsistentes', () => {
  const result = validateProductInput({
    name: 'Produto Teste',
    brand: 'Marca',
    description: usefulDescription,
    price: 10,
    promoPrice: 12,
    stockQty: -1,
  });
  assert.equal(result.ok, false);
  assert.match(result.errors.join(' '), /promocional/i);
  assert.match(result.errors.join(' '), /estoque/i);
});

test('mantém SKU interno livre, mas valida EAN/GTIN numérico', () => {
  const internal = validateProductInput({
    name: 'Produto Interno',
    brand: 'Marca',
    sku: 'SKU-ABC-10',
    description: usefulDescription,
    price: 10,
    stockQty: 1,
  });
  assert.equal(internal.ok, true);
  assert.equal(isValidGtin('7891000315507'), true);

  const invalid = validateProductInput({
    name: 'Produto EAN',
    brand: 'Marca',
    sku: '7891000315508',
    description: usefulDescription,
    price: 10,
    stockQty: 1,
  });
  assert.equal(invalid.ok, false);
  assert.match(invalid.errors.join(' '), /GTIN/i);
});
