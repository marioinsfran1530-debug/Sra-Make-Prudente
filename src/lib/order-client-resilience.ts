export const ORDER_REQUEST_TIMEOUT_MS = 12_000;
export const ORDER_REQUEST_MAX_ATTEMPTS = 2;
export const ORDER_RETRY_DELAY_MS = 400;

export type OrderRequestResult = {
  ok: boolean;
  status: number;
  data: Record<string, any>;
};

export function shouldRetryOrderRequest(status: number | null): boolean {
  if (status === null) return true;
  return status === 408 || status === 425 || status === 429 || status >= 500;
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function requestOrderOnce(payload: unknown): Promise<OrderRequestResult> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), ORDER_REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    const data = await response.json().catch(() => ({}));

    return {
      ok: response.ok,
      status: response.status,
      data,
    };
  } finally {
    clearTimeout(timeout);
  }
}

export async function submitOrderWithRetry(
  payload: unknown
): Promise<OrderRequestResult> {
  let lastError: unknown = null;

  for (let attempt = 1; attempt <= ORDER_REQUEST_MAX_ATTEMPTS; attempt += 1) {
    try {
      const result = await requestOrderOnce(payload);

      if (result.ok || !shouldRetryOrderRequest(result.status)) {
        return result;
      }

      if (attempt === ORDER_REQUEST_MAX_ATTEMPTS) {
        return result;
      }
    } catch (error) {
      lastError = error;

      if (attempt === ORDER_REQUEST_MAX_ATTEMPTS) {
        throw error;
      }
    }

    await wait(ORDER_RETRY_DELAY_MS);
  }

  throw lastError ?? new Error("Falha ao enviar pedido.");
}
