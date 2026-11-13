const test = require("node:test");
const assert = require("node:assert/strict");
const { buildMovements, summarizeMovements, orderStatusLabel } = require("../.tmp-tests/stock-movements.js");

const origin = (value) => ({ shopee: "Shopee", fornecedor: "Fornecedor" })[value] ?? value;
const sale = (over) => ({
  orderId: "o1", number: 1, channelLabel: "Balcão", status: "FINALIZADO",
  createdAt: "2026-11-10T15:00:00.000Z", qty: 1, variantName: null, unitPrice: 12.99, ...over,
});
const entry = (over) => ({
  entryId: "e1", createdAt: "2026-11-01T12:00:00.000Z", status: "ATIVA", reversedAt: null,
  origin: "shopee", supplier: "", qty: 10, variantName: null, ...over,
});

test("vendas que baixaram saem do estoque; ordem do mais novo para o mais antigo", () => {
  const list = buildMovements(
    [entry()],
    [sale({ orderId: "o1", number: 1, createdAt: "2026-11-05T10:00:00.000Z" }), sale({ orderId: "o2", number: 2, qty: 2 })],
    origin
  );
  assert.deepEqual(list.map((m) => m.kind), ["VENDA", "VENDA", "ENTRADA"]);
  assert.deepEqual(list.map((m) => m.delta), [-2, -1, 10]);
  assert.match(list[0].detail, /Pedido #2 · Balcão · Finalizado/);
});

test("pedido pendente e cancelado não mexem no estoque", () => {
  const list = buildMovements(
    [],
    [sale({ orderId: "a", status: "EM_CONFIRMACAO" }), sale({ orderId: "b", status: "CANCELADO" }), sale({ orderId: "c", status: "CONFIRMADO" })],
    origin
  );
  const byKind = Object.fromEntries(list.map((m) => [m.orderId, m]));
  assert.equal(byKind.a.kind, "PENDENTE");
  assert.equal(byKind.a.delta, 0);
  assert.equal(byKind.b.kind, "CANCELADA");
  assert.equal(byKind.b.delta, 0);
  assert.equal(byKind.c.kind, "VENDA");
  assert.equal(byKind.c.delta, -1);
});

test("entrada estornada gera a entrada e o estorno", () => {
  const list = buildMovements(
    [entry({ status: "ESTORNADA", reversedAt: "2026-11-02T09:00:00.000Z", supplier: "Fulana" })],
    [],
    origin
  );
  assert.deepEqual(list.map((m) => m.kind), ["ESTORNO", "ENTRADA"]);
  assert.deepEqual(list.map((m) => m.delta), [-10, 10]);
  assert.equal(list[1].detail, "Shopee · Fulana");
});

test("resumo: entradas já sem estornos, vendas e últimos 30 dias", () => {
  const now = Date.parse("2026-11-13T12:00:00.000Z");
  const list = buildMovements(
    [entry(), entry({ entryId: "e2", status: "ESTORNADA", reversedAt: "2026-11-03T00:00:00.000Z", qty: 4 })],
    [
      sale({ orderId: "o1", createdAt: "2026-10-01T10:00:00.000Z", qty: 3 }),
      sale({ orderId: "o2", createdAt: "2026-11-12T10:00:00.000Z", qty: 2 }),
      sale({ orderId: "o3", status: "CANCELADO", qty: 9 }),
    ],
    origin
  );
  const summary = summarizeMovements(list, now);
  assert.equal(summary.entered, 10);
  assert.equal(summary.sold, 5);
  assert.equal(summary.soldLastDays, 2);
  assert.equal(summary.lastSaleAt, "2026-11-12T10:00:00.000Z");
  assert.equal(summary.lastEntryAt, "2026-11-01T12:00:00.000Z");
});

test("sem movimentos e rótulo de status desconhecido", () => {
  assert.deepEqual(buildMovements([], [], origin), []);
  const summary = summarizeMovements([], Date.now());
  assert.deepEqual(summary, { entered: 0, sold: 0, soldLastDays: 0, lastSaleAt: null, lastEntryAt: null });
  assert.equal(orderStatusLabel("XYZ"), "XYZ");
});
