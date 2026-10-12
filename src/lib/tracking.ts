const SESSION_KEY = "sra-make-session-id";
const ACQUISITION_KEY = "sra-make-acquisition";

export type AcquisitionData = {
  origin: string | null;
  referrer: string | null;
  landingPage: string | null;
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  utmContent: string | null;
};

function uuid() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  // fallback simples para navegadores muito antigos
  return `xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx`.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// sessionId anônimo, persistente entre visitas (sem dado pessoal) — permite
// reconstruir o caminho: visitante → categoria → produto → carrinho → pedido.
export function getOrCreateSessionId(): string {
  if (typeof window === "undefined") return "";
  try {
    let id = window.localStorage.getItem(SESSION_KEY);
    if (!id) {
      id = uuid();
      window.localStorage.setItem(SESSION_KEY, id);
    }
    return id;
  } catch {
    return "";
  }
}

function guessOrigin(
  utmSource: string | null,
  referrer: string | null,
  utmMedium: string | null = null
): string | null {
  // Google pago fica separado do Google orgânico no painel de origens.
  if (
    utmSource?.toLowerCase() === "google" &&
    /^(cpc|ppc|paid)/i.test(utmMedium ?? "")
  ) {
    return "google_ads";
  }
  if (utmSource) return utmSource;
  if (!referrer) return "direto";
  try {
    const host = new URL(referrer).hostname.replace("www.", "");
    if (host.includes("instagram")) return "instagram";
    if (host.includes("facebook") || host === "fb.com") return "facebook";
    if (host.includes("whatsapp") || host === "wa.me" || host === "l.wl.co") return "whatsapp";
    if (host.includes("google")) return "google";
    if (host.includes("tiktok")) return "tiktok";
    return host;
  } catch {
    return null;
  }
}

// Atribuição vale por 30 dias; passado isso, uma nova visita reavalia a origem.
const ACQUISITION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

type StoredAcquisition = AcquisitionData & {
  capturedAt?: string;
  adClickId?: string | null;
};

function readStoredAcquisition(): StoredAcquisition | null {
  try {
    const raw = window.localStorage.getItem(ACQUISITION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

// Captura a origem do visitante.
// - Link com UTM ou gclid/gbraid/wbraid (anúncio) SEMPRE grava a origem, mesmo
//   que o visitante já tivesse uma antiga (último clique pago vence).
// - Sem sinal de campanha, mantém a origem já gravada por até 30 dias, para
//   não sobrescrever com navegação interna ou retorno direto.
// - O Google Ads só adiciona ?gclid= ao link; por isso gclid sem UTM é tratado
//   como google / cpc.
export function captureAcquisition() {
  if (typeof window === "undefined") return;
  try {
    const params = new URLSearchParams(window.location.search);
    const adClickId =
      params.get("gclid") || params.get("gbraid") || params.get("wbraid");

    let utmSource = params.get("utm_source");
    let utmMedium = params.get("utm_medium");
    let utmCampaign = params.get("utm_campaign");
    const utmContent = params.get("utm_content");

    if (adClickId && !utmSource) {
      utmSource = "google";
      utmMedium = utmMedium || "cpc";
      utmCampaign = utmCampaign || "google-ads";
    }

    const hasCampaignSignal = Boolean(utmSource || adClickId);
    const stored = readStoredAcquisition();
    const storedIsFresh =
      !!stored?.capturedAt &&
      Date.now() - Date.parse(stored.capturedAt) < ACQUISITION_TTL_MS;

    if (stored && storedIsFresh && !hasCampaignSignal) return;
    // Mesmo clique de anúncio já gravado (a função pode rodar várias vezes
    // enquanto a URL ainda tem o gclid): não reescreve.
    if (stored && adClickId && stored.adClickId === adClickId) return;

    let referrer = document.referrer || null;
    // Navegação interna (referrer do próprio site) não é uma origem.
    try {
      if (referrer && new URL(referrer).hostname === window.location.hostname) {
        referrer = null;
      }
    } catch {
      referrer = null;
    }

    const data: StoredAcquisition = {
      origin: guessOrigin(utmSource, referrer, utmMedium),
      referrer,
      landingPage: window.location.pathname,
      utmSource,
      utmMedium,
      utmCampaign,
      utmContent,
      capturedAt: new Date().toISOString(),
      adClickId,
    };

    window.localStorage.setItem(ACQUISITION_KEY, JSON.stringify(data));
  } catch {
    // localStorage indisponível — segue sem tracking, não bloqueia o app
  }
}

export function getAcquisitionData(): AcquisitionData {
  const empty: AcquisitionData = {
    origin: null,
    referrer: null,
    landingPage: null,
    utmSource: null,
    utmMedium: null,
    utmCampaign: null,
    utmContent: null,
  };
  if (typeof window === "undefined") return empty;
  try {
    const raw = window.localStorage.getItem(ACQUISITION_KEY);
    return raw ? JSON.parse(raw) : empty;
  } catch {
    return empty;
  }
}

// Dados prontos para anexar ao POST /api/orders.
export function getTrackingPayload() {
  return {
    sessionId: getOrCreateSessionId(),
    ...getAcquisitionData(),
  };
}
