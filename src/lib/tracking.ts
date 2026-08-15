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

function guessOrigin(utmSource: string | null, referrer: string | null): string | null {
  if (utmSource) return utmSource;
  if (!referrer) return "direto";
  try {
    const host = new URL(referrer).hostname.replace("www.", "");
    if (host.includes("instagram")) return "instagram";
    if (host.includes("google")) return "google";
    if (host.includes("tiktok")) return "tiktok";
    return host;
  } catch {
    return null;
  }
}

// Só captura na PRIMEIRA visita — não sobrescreve a origem original do
// visitante em navegações internas subsequentes.
export function captureAcquisition() {
  if (typeof window === "undefined") return;
  try {
    if (window.localStorage.getItem(ACQUISITION_KEY)) return;

    const params = new URLSearchParams(window.location.search);
    const utmSource = params.get("utm_source");
    const utmMedium = params.get("utm_medium");
    const utmCampaign = params.get("utm_campaign");
    const utmContent = params.get("utm_content");
    const referrer = document.referrer || null;

    const data: AcquisitionData = {
      origin: guessOrigin(utmSource, referrer),
      referrer,
      landingPage: window.location.pathname,
      utmSource,
      utmMedium,
      utmCampaign,
      utmContent,
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
