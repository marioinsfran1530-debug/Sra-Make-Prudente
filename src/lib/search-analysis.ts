// Análise das buscas da loja (lógica pura, sem banco), para ser testada.
//
// Cada evento de busca gravado vem de um momento em que a pessoa parou de
// digitar. Quem vai digitando e corrigindo ("Pincel de sere", "Pincel de
// sereia") gera vários eventos em poucos segundos. Aqui juntamos esses eventos
// de um mesmo visitante em UMA busca (a última, que é o que a pessoa queria) e
// contamos pessoas, não eventos.

import { normalizeSearchText } from "./product-search";

// Quanto tempo entre dois eventos do mesmo visitante ainda conta como a mesma
// busca. Nos dados reais, as correções acontecem em até ~10 segundos.
export const BURST_GAP_SECONDS = 15;

export type SearchEvent = {
  sessionId: string;
  query: string | null;
  itemCount: number | null;
  createdAt: Date;
  origin: string | null;
};

export type SearchBurst = {
  sessionId: string;
  // Termo final da busca, como a pessoa digitou, e sua forma normalizada.
  query: string;
  key: string;
  // Resultados do termo final; null quando o evento não trouxe a contagem.
  resultCount: number | null;
  // Quantos eventos (pausas na digitação) viraram esta busca.
  attempts: number;
  startedAt: Date;
  origin: string;
};

export function consolidateSearches(
  events: SearchEvent[],
  gapSeconds = BURST_GAP_SECONDS
): SearchBurst[] {
  const valid = events
    .map((event) => ({ ...event, query: event.query?.trim() ?? "" }))
    .filter((event) => event.query.length > 0)
    .sort(
      (a, b) =>
        a.sessionId.localeCompare(b.sessionId) ||
        a.createdAt.getTime() - b.createdAt.getTime()
    );

  const bursts: SearchBurst[] = [];
  let lastTime = 0;

  for (const event of valid) {
    const time = event.createdAt.getTime();
    const current = bursts[bursts.length - 1];
    const sameBurst =
      current !== undefined &&
      current.sessionId === event.sessionId &&
      time - lastTime <= gapSeconds * 1000;

    if (sameBurst) {
      current.query = event.query;
      current.key = normalizeSearchText(event.query);
      current.resultCount = event.itemCount;
      current.attempts += 1;
    } else {
      bursts.push({
        sessionId: event.sessionId,
        query: event.query,
        key: normalizeSearchText(event.query),
        resultCount: event.itemCount,
        attempts: 1,
        startedAt: event.createdAt,
        origin: event.origin?.trim() || "desconhecida",
      });
    }
    lastTime = time;
  }

  return bursts.filter((burst) => burst.key.length > 0);
}

export function isZeroResult(burst: SearchBurst) {
  return burst.resultCount === 0;
}

export type SearchSummary = {
  people: number;
  searches: number;
  zeroSearches: number;
  zeroPeople: number;
  zeroRate: number;
};

export function summarizeSearches(bursts: SearchBurst[]): SearchSummary {
  const zero = bursts.filter(isZeroResult);
  return {
    people: new Set(bursts.map((burst) => burst.sessionId)).size,
    searches: bursts.length,
    zeroSearches: zero.length,
    zeroPeople: new Set(zero.map((burst) => burst.sessionId)).size,
    zeroRate: bursts.length > 0 ? (zero.length / bursts.length) * 100 : 0,
  };
}

export type TermRow = {
  key: string;
  label: string;
  people: number;
  searches: number;
};

// Ranking de termos por número de PESSOAS diferentes que buscaram.
export function rankTerms(bursts: SearchBurst[], limit = 20): TermRow[] {
  const groups = new Map<
    string,
    { people: Set<string>; searches: number; spellings: Map<string, number> }
  >();

  for (const burst of bursts) {
    const group = groups.get(burst.key) ?? {
      people: new Set<string>(),
      searches: 0,
      spellings: new Map<string, number>(),
    };
    group.people.add(burst.sessionId);
    group.searches += 1;
    group.spellings.set(burst.query, (group.spellings.get(burst.query) ?? 0) + 1);
    groups.set(burst.key, group);
  }

  return Array.from(groups.entries())
    .map(([key, group]) => ({
      key,
      label:
        Array.from(group.spellings.entries()).sort(
          (a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "pt-BR")
        )[0]?.[0] ?? key,
      people: group.people.size,
      searches: group.searches,
    }))
    .sort(
      (a, b) =>
        b.people - a.people ||
        b.searches - a.searches ||
        a.label.localeCompare(b.label, "pt-BR")
    )
    .slice(0, limit);
}

// ---------- Origem de quem busca ----------

const ORIGIN_LABELS: Record<string, string> = {
  google: "Google (busca orgânica)",
  google_ads: "Google Ads",
  direto: "Acesso direto",
  ig: "Instagram",
  instagram: "Instagram",
  facebook: "Facebook",
  "l.facebook.com": "Facebook",
  "m.facebook.com": "Facebook",
  "chatgpt.com": "ChatGPT",
  whatsapp: "WhatsApp",
  tiktok: "TikTok",
  desconhecida: "Origem não identificada",
};

export function originLabel(origin: string) {
  return ORIGIN_LABELS[origin.toLowerCase()] ?? origin;
}

export type OriginRow = { label: string; people: number; zeroPeople: number };

export function originBreakdown(bursts: SearchBurst[]): OriginRow[] {
  const groups = new Map<string, { people: Set<string>; zeroPeople: Set<string> }>();
  const sessionOrigin = new Map<string, string>();

  // Um visitante tem uma origem só: a da primeira busca dele.
  for (const burst of bursts) {
    if (!sessionOrigin.has(burst.sessionId)) {
      sessionOrigin.set(burst.sessionId, originLabel(burst.origin));
    }
  }

  for (const burst of bursts) {
    const label = sessionOrigin.get(burst.sessionId) ?? "Origem não identificada";
    const group = groups.get(label) ?? {
      people: new Set<string>(),
      zeroPeople: new Set<string>(),
    };
    group.people.add(burst.sessionId);
    if (isZeroResult(burst)) group.zeroPeople.add(burst.sessionId);
    groups.set(label, group);
  }

  return Array.from(groups.entries())
    .map(([label, group]) => ({
      label,
      people: group.people.size,
      zeroPeople: group.zeroPeople.size,
    }))
    .sort((a, b) => b.people - a.people || a.label.localeCompare(b.label, "pt-BR"));
}
