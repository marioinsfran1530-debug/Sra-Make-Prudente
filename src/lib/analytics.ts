import { getOrCreateSessionId } from "@/lib/tracking";

export type AnalyticsEvent =
  | "page_view"
  | "category_view"
  | "product_view"
  | "search"
  | "add_to_cart"
  | "remove_from_cart"
  | "begin_checkout"
  | "order_created"
  | "order_push_opt_in"
  | "whatsapp_click"
  | "store_location_click";

type Fbq = (...args: unknown[]) => void;

declare global {
  interface Window {
    fbq?: Fbq;
  }
}

function numberValue(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function stringValue(value: unknown) {
  return typeof value === "string" && value.trim() ? value : undefined;
}

function sendMetaPixelEvent(event: AnalyticsEvent, payload: Record<string, unknown>) {
  const fbq = window.fbq;
  if (!fbq) return;

  const productId = stringValue(payload.productId);
  const productName = stringValue(payload.name);
  const variantId = stringValue(payload.variantId);
  const price = numberValue(payload.price);
  const qty = numberValue(payload.qty) ?? 1;

  switch (event) {
    case "page_view":
      fbq("track", "PageView");
      return;

    case "product_view":
      fbq("track", "ViewContent", {
        content_ids: productId ? [productId] : undefined,
        content_name: productName,
        content_type: "product",
      });
      return;

    case "category_view":
      fbq("trackCustom", "CategoryView", {
        category_slug: stringValue(payload.categorySlug),
      });
      return;

    case "search":
      fbq("track", "Search", {
        search_string: stringValue(payload.query),
        result_count: numberValue(payload.resultCount),
      });
      return;

    case "add_to_cart": {
      const value = price !== undefined ? price * qty : undefined;
      fbq("track", "AddToCart", {
        content_ids: productId ? [productId] : undefined,
        content_name: productName,
        content_type: "product",
        contents: productId
          ? [
              {
                id: variantId || productId,
                quantity: qty,
                item_price: price,
              },
            ]
          : undefined,
        value,
        currency: "BRL",
      });
      return;
    }

    case "begin_checkout":
      fbq("track", "InitiateCheckout", {
        num_items: numberValue(payload.itemCount),
        value: numberValue(payload.subtotal),
        currency: "BRL",
      });
      return;

    case "order_created": {
      const total = numberValue(payload.total);
      const orderNumber = stringValue(payload.orderNumber);

      // O catálogo não cobra online. Portanto, pedido criado é tratado como Lead,
      // e não como Purchase, para não inflar compras/pagamentos no Meta Ads.
      fbq("track", "Lead", {
        value: total,
        currency: "BRL",
        order_number: orderNumber,
      });
      fbq("trackCustom", "OrderCreated", {
        value: total,
        currency: "BRL",
        order_number: orderNumber,
        duplicate: payload.duplicate === true,
      });
      return;
    }

    case "whatsapp_click":
      fbq("track", "Contact", {
        content_name: "WhatsApp",
        context: stringValue(payload.context),
        order_number: stringValue(payload.orderNumber),
      });
      return;

    case "remove_from_cart":
      fbq("trackCustom", "RemoveFromCart", {
        product_id: productId,
        variant_id: variantId,
      });
      return;

    case "order_push_opt_in":
      fbq("trackCustom", "OrderPushOptIn", {
        result: payload.result,
      });
      return;

    case "store_location_click":
      fbq("trackCustom", "StoreLocationClick");
      return;
  }
}

export function trackEvent(
  event: AnalyticsEvent,
  payload: Record<string, unknown> = {}
) {
  if (typeof window === "undefined") return;

  const record = {
    event,
    sessionId: getOrCreateSessionId(),
    timestamp: new Date().toISOString(),
    ...payload,
  };

  if (process.env.NODE_ENV === "development") {
    // eslint-disable-next-line no-console
    console.debug("[analytics]", record);
  }

  sendMetaPixelEvent(event, payload);
}
