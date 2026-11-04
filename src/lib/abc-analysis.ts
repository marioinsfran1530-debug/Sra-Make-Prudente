// Lógica pura da Curva ABC do painel (sem acesso a banco), para ser testada
// isoladamente. A página em /admin/analise/abc só busca os dados e desenha.

export type Period = "7d" | "30d" | "month" | "all";
export type Metric = "revenue" | "quantity";
export type Curve = "A" | "B" | "C";

export type SignalKey =
  | "ruptura"
  | "reposicao"
  | "conteudo"
  | "vitrine"
  | "conversao";

export const PERIOD_VALUES: readonly Period[] = ["7d", "30d", "month", "all"];
export const CURVES: readonly Curve[] = ["A", "B", "C"];
export const SIGNAL_KEYS: readonly SignalKey[] = [
  "ruptura",
  "reposicao",
  "conteudo",
  "vitrine",
  "conversao",
];

// Quantidade de linhas por "página" da tabela. A última etapa mostra tudo.
export const LIMIT_STEPS = [10, 25, 50, 100] as const;
export const DEFAULT_LIMIT = LIMIT_STEPS[0];
export type Limit = (typeof LIMIT_STEPS)[number] | "all";

// Prazo de chegada mais longo (Shopee). Abaixo disso o estoque acaba antes de
// a compra chegar, então a reposição já é urgente.
export const REPLENISH_LEAD_DAYS = 7;
// Poucas visitas para um produto da curva A: ele vende, mas a vitrine não
// ajuda (ótimo candidato a destaque na home, anúncio e divulgação).
export const LOW_VISIBILITY_VIEWS = 10;
// Muita visita e pouco pedido: algo na página (foto, preço, texto) trava.
export const HIGH_TRAFFIC_VIEWS = 30;
export const LOW_CONVERSION_PCT = 1.5;
export const MAX_SEO_NAME_LENGTH = 70;
export const MIN_DESCRIPTION_LENGTH = 80;

// ---------- Busca ----------

export function normalizeSearch(value: string) {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

// Todas as palavras digitadas precisam aparecer no nome, marca, SKU ou categoria.
export function matchesQuery(
  haystack: { name: string; brand: string; sku?: string | null; categoryName?: string | null },
  query: string
) {
  const tokens = normalizeSearch(query).split(" ").filter(Boolean);
  if (tokens.length === 0) return true;

  const text = normalizeSearch(
    [haystack.name, haystack.brand, haystack.sku ?? "", haystack.categoryName ?? ""].join(" ")
  );
  return tokens.every((token) => text.includes(token));
}

// ---------- SEO do cadastro ----------

export type SeoGap = { key: string; label: string; weight: number };

export type SeoInput = {
  name: string;
  description: string | null;
  sku: string | null;
  images: { alt: string | null }[];
};

// Lacunas que prejudicam a página do produto no Google e a conversão. Quanto
// maior o peso, maior a prioridade de correção.
export function seoGaps(input: SeoInput): SeoGap[] {
  const gaps: SeoGap[] = [];
  const description = input.description?.trim() ?? "";
  const name = input.name.trim();

  if (input.images.length === 0) {
    gaps.push({ key: "sem-imagem", label: "Sem foto", weight: 30 });
  } else if (input.images.some((image) => !image.alt?.trim())) {
    gaps.push({ key: "sem-alt", label: "Foto sem ALT", weight: 5 });
  }

  if (!description) {
    gaps.push({ key: "sem-descricao", label: "Sem descrição", weight: 20 });
  } else if (description.length < MIN_DESCRIPTION_LENGTH) {
    gaps.push({ key: "descricao-curta", label: "Descrição curta", weight: 10 });
  }

  if (name.length < 8) {
    gaps.push({ key: "nome-curto", label: "Nome curto", weight: 8 });
  } else if (name.length > MAX_SEO_NAME_LENGTH) {
    gaps.push({ key: "nome-longo", label: "Nome longo demais", weight: 6 });
  }

  if (!input.sku?.trim()) {
    gaps.push({ key: "sem-sku", label: "Sem SKU/EAN", weight: 3 });
  }

  return gaps;
}

// ---------- Linhas da curva ----------

export type SoldProduct = {
  productId: string;
  name: string;
  brand: string;
  sku: string | null;
  categorySlug: string | null;
  categoryName: string | null;
  units: number;
  revenue: number;
  orders: number;
  stockQty: number;
  views: number;
  carts: number;
  // false quando o produto foi inativado ou removido do catálogo depois da venda.
  inCatalog: boolean;
  // false quando o produto não existe mais no banco (só restou o nome do pedido).
  hasRecord: boolean;
  gaps: SeoGap[];
};

export type AbcRow = SoldProduct & {
  rank: number;
  baseValue: number;
  share: number;
  cumulative: number;
  curve: Curve;
  // Dias que o estoque atual dura no ritmo de venda do período; null sem giro.
  coverageDays: number | null;
  // Pedidos / visitas, em %; null quando não há visita registrada.
  conversion: number | null;
  signals: SignalKey[];
};

// Um produto entra na curva em que o acumulado ANTES dele ainda estava abaixo
// do corte; assim o item que cruza os 80% continua sendo A.
export function classifyCurve(previousCumulative: number): Curve {
  if (previousCumulative < 80) return "A";
  if (previousCumulative < 95) return "B";
  return "C";
}

export function coverageDaysOf(stockQty: number, units: number, periodDays: number) {
  if (units <= 0 || periodDays <= 0) return null;
  const daily = units / periodDays;
  return Math.max(0, stockQty) / daily;
}

export function conversionOf(orders: number, views: number) {
  return views > 0 ? (orders / views) * 100 : null;
}

export function signalsFor(row: Omit<AbcRow, "signals">): SignalKey[] {
  const signals: SignalKey[] = [];
  const carriesSales = row.curve === "A" || row.curve === "B";

  if (carriesSales && row.stockQty <= 0) {
    signals.push("ruptura");
  } else if (
    carriesSales &&
    row.coverageDays !== null &&
    row.coverageDays < REPLENISH_LEAD_DAYS
  ) {
    signals.push("reposicao");
  }

  if (carriesSales && row.gaps.length > 0) signals.push("conteudo");

  if (row.curve === "A" && row.views < LOW_VISIBILITY_VIEWS) signals.push("vitrine");

  if (
    row.views >= HIGH_TRAFFIC_VIEWS &&
    row.conversion !== null &&
    row.conversion < LOW_CONVERSION_PCT
  ) {
    signals.push("conversao");
  }

  return signals;
}

export function buildAbcRows(
  sold: SoldProduct[],
  metric: Metric,
  periodDays: number
): AbcRow[] {
  const valueOf = (product: SoldProduct) =>
    metric === "revenue" ? product.revenue : product.units;

  const sorted = sold
    .filter((product) => product.units > 0 || product.revenue > 0)
    .sort(
      (a, b) =>
        valueOf(b) - valueOf(a) ||
        b.units - a.units ||
        a.name.localeCompare(b.name, "pt-BR")
    );

  const total = sorted.reduce((sum, product) => sum + valueOf(product), 0);

  let cumulative = 0;
  return sorted.map((product, index) => {
    const baseValue = valueOf(product);
    const share = total > 0 ? (baseValue / total) * 100 : 0;
    const previousCumulative = cumulative;
    cumulative += share;

    const base = {
      ...product,
      rank: index + 1,
      baseValue,
      share,
      cumulative,
      curve: classifyCurve(previousCumulative),
      coverageDays: coverageDaysOf(product.stockQty, product.units, periodDays),
      conversion: conversionOf(product.orders, product.views),
    };

    return { ...base, signals: signalsFor(base) };
  });
}

// ---------- Filtros e parâmetros de URL ----------

export type AbcFilters = {
  curve: Curve | null;
  q: string;
  cat: string | null;
  signal: SignalKey | null;
};

export function filterRows(rows: AbcRow[], filters: AbcFilters) {
  return rows.filter((row) => {
    if (filters.curve && row.curve !== filters.curve) return false;
    if (filters.cat && row.categorySlug !== filters.cat) return false;
    if (filters.signal && !row.signals.includes(filters.signal)) return false;
    if (filters.q && !matchesQuery(row, filters.q)) return false;
    return true;
  });
}

export type AbcParams = AbcFilters & {
  period: Period;
  metric: Metric;
  limit: Limit;
};

type RawParams = Partial<Record<"period" | "metric" | "curve" | "q" | "cat" | "signal" | "limit", string | string[]>>;

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export function parseAbcParams(raw: RawParams | undefined): AbcParams {
  const period = first(raw?.period);
  const curve = first(raw?.curve)?.toUpperCase();
  const signal = first(raw?.signal);
  const limit = first(raw?.limit);
  const cat = first(raw?.cat)?.trim();

  return {
    period: PERIOD_VALUES.includes(period as Period) ? (period as Period) : "30d",
    metric: first(raw?.metric) === "quantity" ? "quantity" : "revenue",
    curve: CURVES.includes(curve as Curve) ? (curve as Curve) : null,
    signal: SIGNAL_KEYS.includes(signal as SignalKey) ? (signal as SignalKey) : null,
    cat: cat ? cat : null,
    q: (first(raw?.q) ?? "").trim().slice(0, 80),
    limit:
      limit === "all"
        ? "all"
        : LIMIT_STEPS.find((step) => String(step) === limit) ?? DEFAULT_LIMIT,
  };
}

// Monta o link da tela mantendo os filtros atuais e trocando só o que mudou.
// Valores vazios saem da URL; um filtro novo volta a lista para o início.
export function abcHref(current: AbcParams, changes: Partial<AbcParams>) {
  const next: AbcParams = { ...current, ...changes };
  const filtersChanged = (["curve", "q", "cat", "signal"] as const).some(
    (key) => key in changes
  );
  if (filtersChanged && !("limit" in changes)) next.limit = DEFAULT_LIMIT;

  const query = new URLSearchParams({ period: next.period, metric: next.metric });
  if (next.curve) query.set("curve", next.curve);
  if (next.signal) query.set("signal", next.signal);
  if (next.cat) query.set("cat", next.cat);
  if (next.q) query.set("q", next.q);
  if (next.limit !== DEFAULT_LIMIT) query.set("limit", String(next.limit));

  return `/admin/analise/abc?${query.toString()}`;
}

export function hasActiveFilters(params: AbcFilters) {
  return Boolean(params.curve || params.q || params.cat || params.signal);
}

export function nextLimit(limit: Limit): Limit | null {
  if (limit === "all") return null;
  const index = LIMIT_STEPS.indexOf(limit);
  return index >= 0 && index < LIMIT_STEPS.length - 1 ? LIMIT_STEPS[index + 1] : "all";
}

// Dias do período, para medir o giro. "Todo período" usa a venda mais antiga.
export function periodLengthDays(
  period: Period,
  context: { dayOfMonth: number; oldestSaleAt: Date | null; now: Date }
) {
  if (period === "7d") return 7;
  if (period === "30d") return 30;
  if (period === "month") return Math.max(1, context.dayOfMonth);
  if (!context.oldestSaleAt) return 30;
  const elapsed = (context.now.getTime() - context.oldestSaleAt.getTime()) / 86_400_000;
  return Math.max(1, Math.ceil(elapsed));
}
