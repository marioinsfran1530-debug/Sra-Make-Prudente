const test = require("node:test");
const assert = require("node:assert/strict");

const {
  shouldRetryOrderRequest,
  ORDER_REQUEST_MAX_ATTEMPTS,
  ORDER_REQUEST_TIMEOUT_MS,
} = require("../.tmp-tests/order-client-resilience.js");

test("retry ocorre em falhas de rede e servidor", () => {
  assert.equal(shouldRetryOrderRequest(null), true);
  assert.equal(shouldRetryOrderRequest(408), true);
  assert.equal(shouldRetryOrderRequest(425), true);
  assert.equal(shouldRetryOrderRequest(429), true);
  assert.equal(shouldRetryOrderRequest(500), true);
  assert.equal(shouldRetryOrderRequest(503), true);
});

test("erros definitivos do cliente não são repetidos", () => {
  assert.equal(shouldRetryOrderRequest(400), false);
  assert.equal(shouldRetryOrderRequest(401), false);
  assert.equal(shouldRetryOrderRequest(404), false);
  assert.equal(shouldRetryOrderRequest(409), false);
  assert.equal(shouldRetryOrderRequest(422), false);
});

test("retry permanece curto e limitado", () => {
  assert.equal(ORDER_REQUEST_MAX_ATTEMPTS, 2);
  assert.equal(ORDER_REQUEST_TIMEOUT_MS, 12000);
});
