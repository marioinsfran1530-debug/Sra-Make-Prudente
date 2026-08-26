const test = require('node:test');
const assert = require('node:assert/strict');
const { validatePromotionCopyCandidates } = require('../.tmp-tests/ai-copy-rules.js');

const context = {
  campaignReason: 'catalogo',
  productIdentity: 'Lápis para Sobrancelhas 2 em 1 Mood Ponta Fina Ruby Rose HB521',
  factualText: 'Lápis para Sobrancelhas 2 em 1 Mood Ponta Fina Ruby Rose HB521 com escovinha para pentear e esfumar.',
};

function goodCandidates() {
  return [
    {
      strategy: 'beneficio',
      hook: 'SOBRANCELHAS MAIS DEFINIDAS COMEÇAM NA PRECISÃO',
      support: 'A ponta fina do lápis ajuda a desenhar e preencher os fios com mais controle.',
    },
    {
      strategy: 'dor_solucao',
      hook: 'QUER PREENCHER A SOBRANCELHA SEM PESAR?',
      support: 'O lápis de ponta fina favorece pequenos traços e um acabamento mais natural.',
    },
    {
      strategy: 'curiosidade',
      hook: 'UM LÁPIS 2 EM 1 PARA DESCOBRIR',
      support: 'Ponta fina e escovinha reúnem definição e acabamento em um só produto.',
    },
  ];
}

test('aceita três estratégias persuasivas conectadas aos dados do produto', () => {
  const result = validatePromotionCopyCandidates(goodCandidates(), context);
  assert.equal(result.ok, true, result.errors.join('\n'));
});

test('rejeita os ganchos artificiais observados no uso real', () => {
  const candidates = goodCandidates();
  candidates[0] = {
    strategy: 'beneficio',
    hook: 'NOVIDADE EM MAQUIAGEM CHEGANDO',
    support: 'Veja este lápis para sobrancelhas disponível no catálogo da loja.',
  };
  candidates[1] = {
    strategy: 'dor_solucao',
    hook: 'ITEM MUITO PROCURADO HOJE?',
    support: 'O lápis para sobrancelhas está entre os produtos apresentados no catálogo.',
  };
  candidates[2] = {
    strategy: 'curiosidade',
    hook: 'MAIS UM PEDIDO CONFIRMADO AGORA',
    support: 'O lápis para sobrancelhas pode ser encontrado no catálogo da loja.',
  };

  const result = validatePromotionCopyCandidates(candidates, context);
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((error) => error.includes('genérico') || error.includes('artificial')));
});

test('bloqueia prova social quando o sistema não confirmou mais vendido', () => {
  const candidates = goodCandidates();
  candidates[0] = {
    strategy: 'beneficio',
    hook: 'O LÁPIS MAIS PEDIDO PARA SOBRANCELHAS',
    support: 'Este lápis de ponta fina é o queridinho das clientes para preencher os fios.',
  };

  const result = validatePromotionCopyCandidates(candidates, context);
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((error) => error.includes('prova social')));
});

test('bloqueia novidade e oferta quando as flags reais não existem', () => {
  const candidates = goodCandidates();
  candidates[0] = {
    strategy: 'beneficio',
    hook: 'NOVIDADE PARA DEFINIR SUA SOBRANCELHA',
    support: 'O lápis para sobrancelhas chegou com preço especial para você aproveitar.',
  };

  const result = validatePromotionCopyCandidates(candidates, context);
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((error) => error.includes('novidade')));
  assert.ok(result.errors.some((error) => error.includes('oferta')));
});

test('exige pergunta natural na estratégia de dor e solução', () => {
  const candidates = goodCandidates();
  candidates[1].hook = 'PREENCHA A SOBRANCELHA COM MAIS PRECISÃO';

  const result = validatePromotionCopyCandidates(candidates, context);
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((error) => error.includes('Dor/Solução')));
});
