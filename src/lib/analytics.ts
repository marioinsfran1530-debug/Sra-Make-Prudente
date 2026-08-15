// Eventos previstos no plano (seção 8): page_view, category_view,
// product_view, search, add_to_cart, remove_from_cart, begin_checkout,
// order_created, whatsapp_click, store_location_click.
//
// Por enquanto não há ferramenta de analytics conectada, então esta função
// não inventa métricas nem envia nada — só padroniza o formato do evento
// para quando uma ferramenta (GA4, Meta Pixel, PostHog etc.) for conectada.
// Nesse momento, basta implementar o envio real aqui, num único lugar.

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
  | "whatsapp_click"
  | "store_location_click";

export function trackEvent(event: AnalyticsEvent, payload: Record<string, unknown> = {}) {
  if (typeof window === "undefined") return;

  const record = {
    event,
    sessionId: getOrCreateSessionId(),
    timestamp: new Date().toISOString(),
    ...payload,
  };

  // Sem ferramenta de analytics configurada ainda — loga só em desenvolvimento.
  if (process.env.NODE_ENV === "development") {
    // eslint-disable-next-line no-console
    console.debug("[analytics]", record);
  }

  // Quando uma ferramenta for conectada, plugar aqui, por exemplo:
  // if (window.gtag) window.gtag("event", event, payload);
}
