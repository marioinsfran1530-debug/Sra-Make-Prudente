export const ORDER_REQUEST_TIMEOUT_MS = 12_000;
export const ORDER_REQUEST_MAX_ATTEMPTS = 2;
export const ORDER_RETRY_DELAY_MS = 400;

type OrderSuccessData = {
  orderNumber: number;
  subtotal: number;
  deliveryFee: number;
  total: number;
  duplicate?: boolean;
  items: Array<{
    name: string;
    variantName: string | null;
    qty: number;
    subtotal: number;
  }>;
};

type OrderErrorData = {
  error?: string;
};

export type OrderRequestResult =
  | {
      ok: true;
      status: number;
      data: OrderSuccessData;
    }
  | {
      ok: false;
      status: number;
      data: OrderErrorData;
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

    const data: unknown = await response.json().catch(() => ({}));

    if (response.ok) {
      return {
        ok: true,
        status: response.status,
        data: data as OrderSuccessData,
      };
    }

    return {
      ok: false,
      status: response.status,
      data: data as OrderErrorData,
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
