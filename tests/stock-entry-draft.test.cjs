const test = require("node:test");
const assert = require("node:assert/strict");

const { DRAFT_MAX_AGE_MS, isFreshDraft, parseDraft, serializeDraft } = require("../.tmp-tests/stock-entry-draft.js");

const TODAY = "2026-11-10";
const KEYS = new Set(["p1:base", "p2:v1", "p2:v2"]);

function draft(extra = {}) {
  return {
    savedAt: 1_000_000,
    idempotencyKey: "chave-123456",
    entryDate: "2026-11-09",
    origin: "fornecedor",
    supplier: "Loja X",
    freight: "12,50",
    notes: "pedido 1",
    lines: [
      { key: "p1:base", qty: "10", cost: "5,5" },
      { key: "p2:v1", qty: "3", cost: "8" },
    ],
    prices: { p1: "31,90" },
    ...extra,
  };
}

test("o que foi salvo volta igual", () => {
  const back = parseDraft(serializeDraft(draft()), KEYS, TODAY);
  assert.deepEqual(back, { v: 1, ...draft() });
});

test("itens que não existem mais são descartados", () => {
  const raw = serializeDraft(draft({ lines: [{ key: "p1:base", qty: "1", cost: "2" }, { key: "sumiu:base", qty: "1", cost: "2" }] }));
  const back = parseDraft(raw, KEYS, TODAY);
  assert.deepEqual(back.lines.map((line) => line.key), ["p1:base"]);
});

test("item repetido entra uma vez só", () => {
  const raw = serializeDraft(draft({ lines: [{ key: "p1:base", qty: "1", cost: "2" }, { key: "p1:base", qty: "9", cost: "9" }] }));
  assert.equal(parseDraft(raw, KEYS, TODAY).lines.length, 1);
});

test("rascunho sem nada para restaurar vira nulo", () => {
  const raw = serializeDraft(draft({ lines: [{ key: "sumiu:base", qty: "1", cost: "1" }], supplier: "", freight: "", notes: "" }));
  assert.equal(parseDraft(raw, KEYS, TODAY), null);
});

test("lixo, JSON quebrado e versão errada não quebram", () => {
  assert.equal(parseDraft(null, KEYS, TODAY), null);
  assert.equal(parseDraft("", KEYS, TODAY), null);
  assert.equal(parseDraft("{não é json", KEYS, TODAY), null);
  assert.equal(parseDraft("[1,2]", KEYS, TODAY), null);
  assert.equal(parseDraft(JSON.stringify({ v: 2, savedAt: 1 }), KEYS, TODAY), null);
  assert.equal(parseDraft(serializeDraft(draft({ idempotencyKey: "curta" })), KEYS, TODAY), null);
});

test("campos são higienizados", () => {
  const raw = serializeDraft(draft({
    entryDate: "2027-01-01",
    origin: "lua",
    lines: [{ key: "p1:base", qty: "1a2b", cost: "R$ 5,5x" }],
  }));
  const back = parseDraft(raw, KEYS, TODAY);
  assert.equal(back.entryDate, TODAY); // data futura volta para hoje
  assert.equal(back.origin, "shopee");
  assert.deepEqual(back.lines, [{ key: "p1:base", qty: "12", cost: "5,5" }]);
});

test("rascunho velho demais não volta", () => {
  const raw = serializeDraft(draft({ savedAt: 1000 }));
  assert.equal(isFreshDraft(raw, 1000 + DRAFT_MAX_AGE_MS), true);
  assert.equal(isFreshDraft(raw, 1000 + DRAFT_MAX_AGE_MS + 1), false);
  assert.equal(isFreshDraft("lixo", 1000), false);
  assert.equal(isFreshDraft(null, 1000), false);
});

test("preços digitados voltam só para produtos que continuam na entrada", () => {
  const raw = serializeDraft(draft({ prices: { p1: "31,90", p2: "R$ 12,5x", sumiu: "9", p9: "" } }));
  const back = parseDraft(raw, KEYS, TODAY);
  assert.deepEqual(back.prices, { p1: "31,90", p2: "12,5" });
});

test("rascunho antigo, sem preços, continua valendo", () => {
  const old = JSON.parse(serializeDraft(draft()));
  delete old.prices;
  const back = parseDraft(JSON.stringify(old), KEYS, TODAY);
  assert.deepEqual(back.prices, {});
});
