const test = require('node:test');
const assert = require('node:assert/strict');
const { classifyAiCampaignReason } = require('../.tmp-tests/ai-rules.js');

function product(overrides = {}) {
  return {
    price: 39.99,
    promoPrice: null,
    bestSeller: false,
    isNew: false,
    featured: false,
    ...overrides,
  };
}

test('promoção real tem prioridade sobre todas as flags', () => {
  assert.equal(
    classifyAiCampaignReason(product({
      promoPrice: 29.99,
      bestSeller: true,
      isNew: true,
      featured: true,
    })),
    'oferta'
  );
});

test('mais vendido tem prioridade sobre novidade e destaque', () => {
  assert.equal(
    classifyAiCampaignReason(product({ bestSeller: true, isNew: true, featured: true })),
    'mais_vendido'
  );
});

test('novidade tem prioridade sobre destaque', () => {
  assert.equal(
    classifyAiCampaignReason(product({ isNew: true, featured: true })),
    'novidade'
  );
});

test('destaque só é usado quando não há contexto mais forte', () => {
  assert.equal(classifyAiCampaignReason(product({ featured: true })), 'destaque');
});

test('produto sem flag recebe contexto neutro de catálogo', () => {
  assert.equal(classifyAiCampaignReason(product()), 'catalogo');
});

test('preço promocional inválido não vira oferta', () => {
  assert.equal(classifyAiCampaignReason(product({ promoPrice: 49.99 })), 'catalogo');
  assert.equal(classifyAiCampaignReason(product({ promoPrice: 39.99 })), 'catalogo');
  assert.equal(classifyAiCampaignReason(product({ promoPrice: -1 })), 'catalogo');
});
