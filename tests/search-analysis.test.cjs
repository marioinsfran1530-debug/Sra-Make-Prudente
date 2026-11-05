const test = require("node:test");
const assert = require("node:assert/strict");

const {
  consolidateSearches,
  isZeroResult,
  originBreakdown,
  originLabel,
  rankTerms,
  summarizeSearches,
} = require("../.tmp-tests/search-analysis.js");

const BASE = Date.parse("2026-10-20T15:00:00Z");
function ev(session, query, secondsFromStart, itemCount = 0, origin = "google") {
  return {
    sessionId: session,
    query,
    itemCount,
    createdAt: new Date(BASE + secondsFromStart * 1000),
    origin,
  };
}

test("digitar e corrigir em poucos segundos vira uma busca só, com o termo final", () => {
  const bursts = consolidateSearches([
    ev("a", "Higienizqdpr", 0),
    ev("a", "Higienizqd", 2),
    ev("a", "Higienizqdor", 4),
    ev("a", "Higienizdor", 6),
    ev("a", "Higienizador", 8),
  ]);
  assert.equal(bursts.length, 1);
  assert.equal(bursts[0].query, "Higienizador");
  assert.equal(bursts[0].attempts, 5);
  assert.equal(bursts[0].resultCount, 0);
});

test("o resultado considerado é o do termo final", () => {
  const [burst] = consolidateSearches([ev("a", "Pincel de sere", 0, 0), ev("a", "Pincel de sereia", 3, 4)]);
  assert.equal(burst.query, "Pincel de sereia");
  assert.equal(burst.resultCount, 4);
  assert.equal(isZeroResult(burst), false);
});

test("mesmo visitante em momentos distantes são buscas diferentes, mas uma pessoa só", () => {
  const bursts = consolidateSearches([ev("a", "OXE", 0), ev("a", "OXE", 77475)]);
  assert.equal(bursts.length, 2);
  const [row] = rankTerms(bursts);
  assert.equal(row.people, 1);
  assert.equal(row.searches, 2);
});

test("visitantes diferentes nunca se misturam, mesmo buscando ao mesmo tempo", () => {
  const bursts = consolidateSearches([ev("a", "latex", 0), ev("b", "latex", 1), ev("a", "látex", 2)]);
  assert.equal(bursts.length, 2);
  const [row] = rankTerms(bursts);
  assert.equal(row.key, "latex");
  assert.equal(row.people, 2);
});

test("entrada fora de ordem e termos vazios são tratados", () => {
  const bursts = consolidateSearches([
    ev("a", "sereia", 5),
    ev("a", "   ", 3),
    ev("a", null, 4),
    ev("a", "pincel", 0),
  ]);
  assert.equal(bursts.length, 1);
  assert.equal(bursts[0].query, "sereia");
  assert.equal(bursts[0].attempts, 2);
});

test("ranking agrupa grafias (acento e caixa) e escolhe a mais usada para exibir", () => {
  const bursts = consolidateSearches([
    ev("a", "Látex", 0),
    ev("b", "latex", 0),
    ev("c", "latex", 0),
    ev("d", "Gloss", 0),
  ]);
  const rows = rankTerms(bursts);
  assert.deepEqual(rows.map((row) => [row.label, row.people]), [["latex", 3], ["Gloss", 1]]);
});

test("resumo conta pessoas e taxa de busca sem resultado", () => {
  const bursts = consolidateSearches([
    ev("a", "x1", 0, 0),
    ev("a", "y1", 100, 3),
    ev("b", "z1", 0, 2),
    ev("c", "w1", 0, null),
  ]);
  const summary = summarizeSearches(bursts);
  assert.equal(summary.people, 3);
  assert.equal(summary.searches, 4);
  assert.equal(summary.zeroSearches, 1);
  assert.equal(summary.zeroPeople, 1);
  assert.equal(summary.zeroRate, 25);
});

test("busca sem contagem de resultados não é tratada como sem resultado", () => {
  const [burst] = consolidateSearches([ev("a", "tinta", 0, null)]);
  assert.equal(burst.resultCount, null);
  assert.equal(isZeroResult(burst), false);
});

test("origem: junta variações, conta pessoas e quem ficou sem resultado", () => {
  const bursts = consolidateSearches([
    ev("a", "x1", 0, 0, "facebook"),
    ev("b", "y1", 0, 2, "l.facebook.com"),
    ev("c", "z1", 0, 0, "chatgpt.com"),
    ev("d", "w1", 0, 1, null),
    ev("d", "w2", 500, 0, null),
  ]);
  const rows = originBreakdown(bursts);
  const byLabel = Object.fromEntries(rows.map((row) => [row.label, row]));

  assert.deepEqual(byLabel.Facebook, { label: "Facebook", people: 2, zeroPeople: 1 });
  assert.deepEqual(byLabel.ChatGPT, { label: "ChatGPT", people: 1, zeroPeople: 1 });
  assert.deepEqual(byLabel["Origem não identificada"], {
    label: "Origem não identificada",
    people: 1,
    zeroPeople: 1,
  });
  assert.equal(rows[0].label, "Facebook");
  assert.equal(originLabel("ig"), "Instagram");
  assert.equal(originLabel("site-novo.com"), "site-novo.com");
});
