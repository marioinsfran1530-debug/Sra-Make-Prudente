import { getAcquisitionData, getOrCreateSessionId } from "@/lib/tracking";

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
type Gtag = (...args: unknown[]) => void;

type EcommerceItemPayload = {
  productId?: unknown;
  variantId?: unknown;
  variantName?: unknown;
  name?: unknown;
  brand?: unknown;
  category?: unknown;
  sku?: unknown;
  price?: unknown;
  qty?: unknown;
};

declare global {
  interface Window {
    fbq?: Fbq;
    gtag?: Gtag;
  }
}

function numberValue(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function stringValue(value: unknown) {
  return typeof value === "string" && value.trim() ? value : undefined;
}

function toGA4Item(payload: EcommerceItemPayload) {
  const productId = stringValue(payload.productId);
  const variantId = stringValue(payload.variantId);
  if (!productId) return undefined;

  return {
    item_id: variantId || productId,
    item_name: stringValue(payload.name),
    item_brand: stringValue(payload.brand),
    item_category: stringValue(payload.category),
    item_variant: stringValue(payload.variantName) || variantId,
    item_sku: stringValue(payload.sku),
    price: numberValue(payload.price),
    quantity: numberValue(payload.qty) ?? 1,
  };
}

function ga4ItemsFromPayload(payload: Record<string, unknown>) {
  if (Array.isArray(payload.items)) {
    return payload.items
      .map((item) => (item && typeof item === "object" ? toGA4Item(item as EcommerceItemPayload) : undefined))
      .filter((item): item is NonNullable<ReturnType<typeof toGA4Item>> => Boolean(item));
  }

  const item = toGA4Item(payload as EcommerceItemPayload);
  return item ? [item] : [];
}

function eventValue(event: AnalyticsEvent, payload: Record<string, unknown>) {
  if (event === "begin_checkout") return numberValue(payload.subtotal);
  if (event === "order_created") return numberValue(payload.total);

  if (event === "product_view" || event === "add_to_cart" || event === "remove_from_cart") {
    const price = numberValue(payload.price);
    const qty = numberValue(payload.qty) ?? 1;
    return price !== undefined ? price * qty : undefined;
  }

  return undefined;
}

function sendFirstPartyEvent(event: AnalyticsEvent, payload: Record<string, unknown>) {
  const acquisition = getAcquisitionData();
  const body = {
    event,
    sessionId: getOrCreateSessionId(),
    productId: stringValue(payload.productId),
    variantId: stringValue(payload.variantId),
    categorySlug: stringValue(payload.categorySlug),
    query: stringValue(payload.query),
    context: stringValue(payload.context),
    value: eventValue(event, payload),
    quantity: numberValue(payload.qty),
    itemCount: numberValue(payload.itemCount),
    pagePath: stringValue(payload.path) || window.location.pathname,
    origin: acquisition.origin,
    landingPage: acquisition.landingPage,
    utmSource: acquisition.utmSource,
    utmMedium: acquisition.utmMedium,
    utmCampaign: acquisition.utmCampaign,
    utmContent: acquisition.utmContent,
  };

  void fetch("/api/analytics", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    keepalive: true,
  }).catch(() => {
    // Analytics nunca deve bloquear a experiência da loja.
  });
}

function sendGA4Event(event: AnalyticsEvent, payload: Record<string, unknown>) {
  const gtag = window.gtag;
  if (!gtag) return;

  const items = ga4ItemsFromPayload(payload);
  const price = numberValue(payload.price);
  const qty = numberValue(payload.qty) ?? 1;

  switch (event) {
    case "product_view":
      gtag("event", "view_item", {
        currency: "BRL",
        value: price,
        items,
      });
      return;
    case "add_to_cart":
      gtag("event", "add_to_cart", {
        currency: "BRL",
        value: price !== undefined ? price * qty : undefined,
        items,
      });
      return;
    case "remove_from_cart":
      gtag("event", "remove_from_cart", {
        currency: "BRL",
        value: price !== undefined ? price * qty : undefined,
        items,
      });
      return;
    case "begin_checkout":
      gtag("event", "begin_checkout", {
        currency: "BRL",
        value: numberValue(payload.subtotal),
        items,
      });
      return;
    case "whatsapp_click":
      gtag("event", "whatsapp_click", {
        context: stringValue(payload.context),
        order_number: stringValue(payload.orderNumber),
      });
      return;
    case "order_created":
      gtag("event", "generate_lead", {
        currency: "BRL",
        value: numberValue(payload.total),
        order_number: stringValue(payload.orderNumber),
      });
      return;
    case "search":
      gtag("event", "search", { search_term: stringValue(payload.query) });
      return;
    case "category_view":
      gtag("event", "category_view", { category_slug: stringValue(payload.categorySlug) });
      return;
    case "store_location_click":
      gtag("event", "store_location_click");
      return;
    case "order_push_opt_in":
      gtag("event", "order_push_opt_in", { result: payload.result });
      return;
    case "page_view":
      return;
  }
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
      fbq("track", "ViewContent", { content_ids: productId ? [productId] : undefined, content_name: productName, content_type: "product" });
      return;
    case "category_view":
      fbq("trackCustom", "CategoryView", { category_slug: stringValue(payload.categorySlug) });
      return;
    case "search":
      fbq("track", "Search", { search_string: stringValue(payload.query), result_count: numberValue(payload.resultCount) });
      return;
    case "add_to_cart": {
      const value = price !== undefined ? price * qty : undefined;
      fbq("track", "AddToCart", {
        content_ids: productId ? [productId] : undefined,
        content_name: productName,
        content_type: "product",
        contents: productId ? [{ id: variantId || productId, quantity: qty, item_price: price }] : undefined,
        value,
        currency: "BRL",
      });
      return;
    }
    case "begin_checkout":
      fbq("track", "InitiateCheckout", { num_items: numberValue(payload.itemCount), value: numberValue(payload.subtotal), currency: "BRL" });
      return;
    case "order_created": {
      const total = numberValue(payload.total);
      const orderNumber = stringValue(payload.orderNumber);
      fbq("track", "Lead", { value: total, currency: "BRL", order_number: orderNumber });
      fbq("trackCustom", "OrderCreated", { value: total, currency: "BRL", order_number: orderNumber, duplicate: payload.duplicate === true });
      return;
    }
    case "whatsapp_click":
      fbq("track", "Contact", { content_name: "WhatsApp", context: stringValue(payload.context), order_number: stringValue(payload.orderNumber) });
      return;
    case "remove_from_cart":
      fbq("trackCustom", "RemoveFromCart", { product_id: productId, variant_id: variantId });
      return;
    case "order_push_opt_in":
      fbq("trackCustom", "OrderPushOptIn", { result: payload.result });
      return;
    case "store_location_click":
      fbq("trackCustom", "StoreLocationClick");
      return;
  }
}

export function trackEvent(event: AnalyticsEvent, payload: Record<string, unknown> = {}) {
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

  sendFirstPartyEvent(event, payload);
  sendGA4Event(event, payload);
  sendMetaPixelEvent(event, payload);
}
