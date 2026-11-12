"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { ImageIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { matchesCounterSaleQuery } from "@/lib/counter-sale-search";
import { money } from "@/lib/money";
import { parseMoneyText } from "@/lib/money-text";
import {
  DRAFT_STORAGE_KEY,
  isFreshDraft,
  parseDraft,
  serializeDraft,
  type EntryDraft,
} from "@/lib/stock-entry-draft";
import { MIN_MARGIN_PCT, priceAdvice } from "@/lib/pricing";
import { groupByProduct, insertAfterProduct } from "@/lib/stock-entry-pick";
import {
  ENTRY_ORIGINS,
  costDeviation,
  entryTotals,
  finalCosts,
  parseEntryInput,
  simulateEntry,
  type EntryOrigin,
  type SimLineResult,
} from "@/lib/stock-entry";
import { QuickProductSheet, type CreatedProduct, type QuickCategory } from "@/components/admin/QuickProductSheet";

export type EntryProduct = {
  id: string;
  name: string;
  brand: string;
  sku: string | null;
  active: boolean;
  price: number;
  promoPrice: number | null;
  stockQty: number;
  costPrice: number | null;
  image: string | null;
  variants: { id: string; name: string; sku: string | null; stockQty: number; price: number | null }[];
};

// Cada produto sem variação, ou cada variação, vira um item que dá para escolher.
type Pickable = {
  key: string;
  productId: string;
  variantId: string | null;
  name: string;
  variantName: string | null;
  brand: string;
  sku: string | null;
  active: boolean;
  image: string | null;
  variantPrice: number | null; // preço próprio da variação, quando tem
  price: number; // preço de venda atual do produto
  promoPrice: number | null;
  stockItem: number; // estoque do item escolhido
  stockProduct: number; // estoque total do produto (base da média de custo)
  costBefore: number | null;
};

type Line = Pickable & { qtyText: string; costText: string };

const MAX_PRODUCTS = 6;

const num = parseMoneyText;

function newKey() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `entry-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
}

function toPickables(product: EntryProduct): Pickable[] {
  if (product.variants.length === 0) {
    return [
      {
        key: `${product.id}:base`,
        productId: product.id,
        variantId: null,
        name: product.name,
        variantName: null,
        brand: product.brand,
        sku: product.sku,
        active: product.active,
        image: product.image,
        variantPrice: null,
        price: product.price,
        promoPrice: product.promoPrice,
        stockItem: product.stockQty,
        stockProduct: product.stockQty,
        costBefore: product.costPrice,
      },
    ];
  }
  const stockProduct = product.variants.reduce((sum, variant) => sum + Math.max(0, variant.stockQty), 0);
  return product.variants.map((variant) => ({
    key: `${product.id}:${variant.id}`,
    productId: product.id,
    variantId: variant.id,
    name: product.name,
    variantName: variant.name,
    brand: product.brand,
    sku: variant.sku ?? product.sku,
    active: product.active,
    image: product.image,
    variantPrice: variant.price,
    price: product.price,
    promoPrice: product.promoPrice,
    stockItem: variant.stockQty,
    stockProduct,
    costBefore: product.costPrice,
  }));
}

function costToText(cost: number | null) {
  return cost !== null ? String(cost).replace(".", ",") : "";
}

function priceToText(price: number) {
  return price.toFixed(2).replace(".", ",");
}

// Lê o rascunho guardado no aparelho (só no navegador). Rascunho velho é ignorado.
function readStoredDraft(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(DRAFT_STORAGE_KEY);
    return raw && isFreshDraft(raw, Date.now()) ? raw : null;
  } catch {
    return null;
  }
}

function writeStoredDraft(raw: string | null) {
  try {
    if (raw === null) window.localStorage.removeItem(DRAFT_STORAGE_KEY);
    else window.localStorage.setItem(DRAFT_STORAGE_KEY, raw);
  } catch {
    // Sem armazenamento (aba anônima, bloqueado): a tela funciona igual, só sem rascunho.
  }
}

const noopSubscribe = () => () => {};

// Foto do produto (a primeira da galeria) para reconhecer o item certo.
function Thumb({ src, size = "h-12 w-12" }: { src: string | null; size?: string }) {
  return (
    <div
      className={`${size} flex shrink-0 items-center justify-center overflow-hidden rounded-xl border border-rosa/10 bg-creme`}
      aria-hidden="true"
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" loading="lazy" className="h-full w-full object-cover" />
      ) : (
        <ImageIcon size={16} className="text-cinza/60" />
      )}
    </div>
  );
}

export function StockEntryForm({
  products,
  categories,
  today,
}: {
  products: EntryProduct[];
  categories: QuickCategory[];
  today: string;
}) {
  const router = useRouter();
  // Falso no servidor e na hidratação; verdadeiro depois. Evita diferença de HTML
  // por causa do rascunho, que só existe no navegador.
  const mounted = useSyncExternalStore(noopSubscribe, () => true, () => false);

  const [created, setCreated] = useState<EntryProduct[]>([]);
  const [quickOpen, setQuickOpen] = useState(false);
  const [notice, setNotice] = useState("");

  const [query, setQuery] = useState("");
  const [lines, setLines] = useState<Line[]>([]);
  const [entryDate, setEntryDate] = useState(today);
  const [origin, setOrigin] = useState<EntryOrigin>("shopee");
  const [supplier, setSupplier] = useState("");
  const [freightText, setFreightText] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saleKey, setSaleKey] = useState(() => newKey());
  const [focusKey, setFocusKey] = useState<string | null>(null);
  // Preço de venda digitado por produto (id do produto). Sem entrada aqui = preço atual.
  const [priceTexts, setPriceTexts] = useState<Record<string, string>>({});

  const [storedDraft] = useState<string | null>(readStoredDraft);
  const [draftHandled, setDraftHandled] = useState(false);

  const errorRef = useRef<HTMLParagraphElement>(null);
  const draftRef = useRef<HTMLElement>(null);

  const allProducts = useMemo(() => [...products, ...created], [products, created]);

  const pickables = useMemo<Pickable[]>(() => allProducts.flatMap(toPickables), [allProducts]);

  const brands = useMemo(
    () => Array.from(new Set(allProducts.map((product) => product.brand.trim()).filter(Boolean))).sort((a, b) => a.localeCompare(b, "pt-BR")),
    [allProducts]
  );

  const draft = useMemo<EntryDraft | null>(
    () => parseDraft(storedDraft, new Set(pickables.map((item) => item.key)), today),
    [storedDraft, pickables, today]
  );
  const draftPending = mounted && !draftHandled && draft !== null;

  // O navegador restaura a rolagem ao recarregar; garante que a pergunta apareça.
  useEffect(() => {
    if (draftPending) draftRef.current?.scrollIntoView({ block: "start" });
  }, [draftPending]);

  const allMatches = useMemo(() => {
    if (!query.trim()) return [];
    const taken = new Set(lines.map((line) => line.key));
    return pickables
      .filter((item) => !taken.has(item.key))
      .filter((item) => matchesCounterSaleQuery([item.name, item.variantName, item.brand, item.sku], query))
      .sort((a, b) => Number(b.active) - Number(a.active));
  }, [pickables, lines, query]);
  const { groups, totalProducts } = useMemo(() => groupByProduct(allMatches, MAX_PRODUCTS), [allMatches]);

  const toLine = (item: Pickable): Line => ({ ...item, qtyText: "", costText: costToText(item.costBefore) });

  // As variações de um produto ficam juntas na lista da entrada.
  function addLines(items: Pickable[]) {
    if (items.length === 0) return;
    setLines((current) => insertAfterProduct(current, items.map(toLine)));
    setQuery("");
    setError("");
    setNotice("");
    setFocusKey(items[0].key);
  }

  function addLine(item: Pickable) {
    addLines([item]);
  }

  function patchLine(key: string, patch: Partial<Pick<Line, "qtyText" | "costText">>) {
    setLines((current) => current.map((line) => (line.key === key ? { ...line, ...patch } : line)));
  }

  const closeQuick = useCallback(() => setQuickOpen(false), []);

  function handleCreated(product: CreatedProduct) {
    const entryProduct: EntryProduct = {
      id: product.id,
      name: product.name,
      brand: product.brand,
      sku: product.sku,
      active: false,
      price: Number(product.price),
      promoPrice: null,
      stockQty: 0,
      costPrice: null,
      image: null,
      variants: product.variants.map((variant) => ({ ...variant, price: null })),
    };
    setCreated((current) => [...current, entryProduct]);
    setQuickOpen(false);

    const items = toPickables(entryProduct);
    if (product.variants.length === 0) {
      addLine(items[0]);
      setNotice(`“${product.name}” foi cadastrado como rascunho e já está na entrada.`);
    } else {
      // Com variações, quem escolhe o que chegou é você: elas aparecem na busca.
      setQuery(product.name);
      setNotice(`“${product.name}” foi cadastrado como rascunho. Escolha abaixo as variações que chegaram.`);
    }
  }

  // ---- Rascunho automático ----

  function resumeDraft() {
    if (!draft) return;
    const byKey = new Map(pickables.map((item) => [item.key, item]));
    setLines(
      draft.lines.flatMap((saved) => {
        const item = byKey.get(saved.key);
        return item ? [{ ...item, qtyText: saved.qty, costText: saved.cost }] : [];
      })
    );
    setEntryDate(draft.entryDate);
    setOrigin(draft.origin);
    setSupplier(draft.supplier);
    setFreightText(draft.freight);
    setNotes(draft.notes);
    setSaleKey(draft.idempotencyKey);
    setPriceTexts(draft.prices);
    setDraftHandled(true);
  }

  function discardDraft() {
    writeStoredDraft(null);
    setDraftHandled(true);
  }

  useEffect(() => {
    if (!mounted || draftPending || saving) return;
    const empty = lines.length === 0 && !supplier.trim() && !freightText.trim() && !notes.trim();
    if (empty) {
      writeStoredDraft(null);
      return;
    }
    writeStoredDraft(
      serializeDraft({
        savedAt: Date.now(),
        idempotencyKey: saleKey,
        entryDate,
        origin,
        supplier,
        freight: freightText,
        notes,
        lines: lines.map((line) => ({ key: line.key, qty: line.qtyText, cost: line.costText })),
        prices: priceTexts,
      })
    );
  }, [mounted, draftPending, saving, lines, supplier, freightText, notes, entryDate, origin, saleKey, priceTexts]);

  // ---- Cálculos ----

  const parsedLines = useMemo(
    () => lines.map((line) => ({ qty: num(line.qtyText), unitCost: num(line.costText) })),
    [lines]
  );
  const lineValid = useMemo(
    () => parsedLines.map((line) => Number.isInteger(line.qty) && line.qty > 0 && line.unitCost > 0),
    [parsedLines]
  );
  const incomplete = lineValid.filter((ok) => !ok).length;
  const freightValue = Math.max(0, num(freightText) || 0);

  // Prévia: mesma conta do servidor (frete rateado, custo médio e, quando um produto
  // tem várias variações, cada linha parte do que a anterior deixou).
  const simulated = useMemo<(SimLineResult | null)[]>(() => {
    const validIndexes = lines.map((_, index) => index).filter((index) => lineValid[index]);
    const results = simulateEntry(
      validIndexes.map((index) => ({
        productId: lines[index].productId,
        variantId: lines[index].variantId,
        qty: parsedLines[index].qty,
        unitCost: parsedLines[index].unitCost,
        stockProduct: lines[index].stockProduct,
        costBefore: lines[index].costBefore,
      })),
      freightValue
    );
    const byIndex = new Map(validIndexes.map((index, position) => [index, results[position]]));
    return lines.map((_, index) => byIndex.get(index) ?? null);
  }, [lines, parsedLines, lineValid, freightValue]);

  const preview = useMemo(
    () =>
      lines.map((line, index) => {
        const result = simulated[index];
        if (!result) return null;
        return {
          landed: result.landed,
          average: result.costAfter,
          deviation: costDeviation(line.costBefore, result.landed),
        };
      }),
    [lines, simulated]
  );

  // Custo do produto depois da entrada, para a margem do preço de venda.
  const finalCostByProduct = useMemo(() => finalCosts(lines, simulated), [lines, simulated]);

  // Preço de venda por produto: o que está digitado (ou o atual) e se vai mudar.
  const priceInfo = useMemo(() => {
    const info = new Map<
      string,
      { typed: number; current: number; promoPrice: number | null; changed: boolean; belowPromo: boolean }
    >();
    for (const line of lines) {
      if (info.has(line.productId)) continue;
      const text = priceTexts[line.productId];
      const parsed = text === undefined ? Number.NaN : num(text);
      const typed = parsed > 0 ? Math.round(parsed * 100) / 100 : line.price;
      const changed = Math.abs(typed - line.price) >= 0.005;
      info.set(line.productId, {
        typed,
        current: line.price,
        promoPrice: line.promoPrice,
        changed,
        belowPromo: changed && line.promoPrice !== null && typed <= line.promoPrice,
      });
    }
    return info;
  }, [lines, priceTexts]);

  const totals = useMemo(
    () => entryTotals(parsedLines.filter((_, index) => lineValid[index]), freightValue),
    [parsedLines, lineValid, freightValue]
  );

  // ---- Salvar ----

  function fail(message: string, focusId?: string) {
    setError(message);
    window.setTimeout(() => {
      if (focusId) {
        const field = document.getElementById(focusId);
        if (field) {
          field.scrollIntoView({ block: "center", behavior: "smooth" });
          field.focus({ preventScroll: true });
          return;
        }
      }
      errorRef.current?.scrollIntoView({ block: "center", behavior: "smooth" });
    }, 0);
  }

  async function save() {
    if (saving) return;
    setSubmitted(true);

    const firstBad = lines.findIndex((_, index) => !lineValid[index]);
    if (firstBad >= 0) {
      const line = lines[firstBad];
      const qtyBad = !(Number.isInteger(parsedLines[firstBad].qty) && parsedLines[firstBad].qty > 0);
      const label = line.variantName ? `${line.name} (${line.variantName})` : line.name;
      fail(
        qtyBad
          ? `Informe a quantidade de “${label}”.`
          : `Informe o custo unitário de “${label}” (maior que zero).`,
        `${qtyBad ? "qty" : "cost"}-${line.key}`
      );
      return;
    }

    for (const line of lines) {
      const info = priceInfo.get(line.productId);
      if (info?.belowPromo) {
        fail(
          `O preço de “${line.name}” precisa ficar acima do preço promocional (${money(info.promoPrice ?? 0)}).`,
          `price-${line.productId}`
        );
        return;
      }
    }

    const payload = {
      idempotencyKey: saleKey,
      entryDate,
      origin,
      supplier,
      freight: freightText.trim() === "" ? 0 : num(freightText),
      notes,
      lines: lines.map((line, index) => ({
        productId: line.productId,
        variantId: line.variantId,
        qty: parsedLines[index].qty,
        unitCost: parsedLines[index].unitCost,
        newPrice: priceInfo.get(line.productId)?.changed ? priceInfo.get(line.productId)?.typed : null,
      })),
    };

    const checked = parseEntryInput(payload, today);
    if ("error" in checked) {
      fail(checked.error);
      return;
    }

    setSaving(true);
    setError("");
    try {
      const response = await fetch("/api/admin/stock-entries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(checked.value),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Não foi possível registrar a entrada.");
      writeStoredDraft(null);
      router.push("/admin/produtos/entradas?ok=1");
      router.refresh();
    } catch (err) {
      fail(err instanceof Error ? err.message : "Não foi possível registrar a entrada.");
      setSaving(false);
    }
  }

  const inputClass =
    "w-full rounded-xl border border-rosa/20 bg-white px-3 py-2.5 text-sm outline-none focus:border-rosa-profundo";
  const badInputClass = "border-red-400 bg-red-50/40";

  // O preço de venda é do produto: aparece uma vez, no primeiro item dele na entrada.
  function showPrice(line: Line, index: number) {
    return lines.findIndex((item) => item.productId === line.productId) === index;
  }

  function renderPriceBlock(line: Line) {
    const info = priceInfo.get(line.productId);
    if (!info) return null;
    const finalCost = finalCostByProduct.get(line.productId) ?? null;
    const advice = finalCost !== null ? priceAdvice(info.typed, finalCost) : null;
    const text = priceTexts[line.productId] ?? priceToText(info.current);
    const suggested = advice?.suggested ?? null;
    const showSuggestion =
      advice !== null &&
      advice.low &&
      suggested !== null &&
      Math.abs(suggested - info.typed) >= 0.005 &&
      (info.promoPrice === null || suggested > info.promoPrice);

    return (
      <div className="mt-2 rounded-lg border border-rosa/10 p-2.5">
        <div className="flex items-end gap-3">
          <label className="block w-32 shrink-0">
            <span className="text-[10px] font-bold uppercase text-cinza">Preço de venda</span>
            <input
              id={`price-${line.productId}`}
              value={text}
              onChange={(event) =>
                setPriceTexts((current) => ({
                  ...current,
                  [line.productId]: event.target.value.replace(/[^\d.,]/g, "").slice(0, 12),
                }))
              }
              inputMode="decimal"
              aria-label={`Preço de venda de ${line.name}`}
              aria-invalid={info.belowPromo}
              className={`${inputClass} mt-1 font-bold ${info.belowPromo ? badInputClass : ""}`}
            />
          </label>
          <p className="min-w-0 pb-2 text-[11px] leading-4 text-cinza">
            {advice ? (
              <>
                margem{" "}
                <strong className={advice.low ? "text-amber-700" : "text-green-700"}>{Math.round(advice.margin)}%</strong>
                {info.changed ? ` (preço hoje ${money(info.current)})` : ""}
              </>
            ) : (
              "Informe quantidade e custo para ver a margem."
            )}
          </p>
        </div>

        {showSuggestion && advice && suggested !== null && advice.suggestedMargin !== null && (
          <button
            type="button"
            onClick={() => setPriceTexts((current) => ({ ...current, [line.productId]: priceToText(suggested) }))}
            className="mt-2 w-full rounded-lg bg-amber-50 px-3 py-2.5 text-left text-[11px] font-bold leading-4 text-amber-900"
          >
            Margem abaixo de {MIN_MARGIN_PCT}%. Usar {money(suggested)} (margem {Math.round(advice.suggestedMargin)}%)
          </button>
        )}
        {info.promoPrice !== null && (
          <p className="mt-2 text-[10px] leading-4 text-cinza">
            Em promoção por {money(info.promoPrice)}: o preço promocional não muda.
          </p>
        )}
        {info.belowPromo && info.promoPrice !== null && (
          <p role="alert" className="mt-1 text-[11px] font-semibold text-red-700">
            O preço precisa ficar acima do promocional ({money(info.promoPrice)}).
          </p>
        )}
        {info.changed && !info.belowPromo && (
          <p className="mt-2 text-[10px] leading-4 text-cinza">O preço de venda será atualizado ao registrar a entrada.</p>
        )}
      </div>
    );
  }

  function onSearchKey(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") {
      event.preventDefault();
      if (allMatches.length === 1) addLine(allMatches[0]);
    }
  }

  return (
    <div className="grid gap-4 pb-28 lg:pb-0">
      {draftPending && draft && (
        <section
          ref={draftRef}
          role="status"
          className="scroll-mt-4 rounded-2xl border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900"
        >
          <p className="font-bold">Você tem uma entrada que não foi registrada</p>
          <p className="mt-0.5 leading-4">
            Salva em{" "}
            {new Date(draft.savedAt).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}{" "}
            · {draft.lines.length} item(ns). Quer continuar de onde parou?
          </p>
          <div className="mt-2 flex gap-2">
            <button type="button" onClick={resumeDraft} className="rounded-lg bg-rosa-profundo px-3 py-2 text-[11px] font-bold text-white">
              Continuar
            </button>
            <button type="button" onClick={discardDraft} className="rounded-lg border border-amber-300 bg-white px-3 py-2 text-[11px] font-bold text-amber-900">
              Descartar
            </button>
          </div>
        </section>
      )}

      <section className="rounded-2xl bg-white p-4 shadow-sm">
        <h2 className="text-sm font-bold text-texto">Dados da compra</h2>

        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="text-[10px] font-bold uppercase text-cinza">Data em que chegou</span>
            <input
              type="date"
              value={entryDate}
              max={today}
              onChange={(event) => setEntryDate(event.target.value)}
              className={`${inputClass} mt-1`}
            />
          </label>
          <label className="block">
            <span className="text-[10px] font-bold uppercase text-cinza">Fornecedor / loja (opcional)</span>
            <input
              value={supplier}
              maxLength={80}
              onChange={(event) => setSupplier(event.target.value)}
              placeholder="Ex.: Loja X na Shopee"
              autoComplete="off"
              className={`${inputClass} mt-1`}
            />
          </label>
        </div>

        <div className="mt-3">
          <p className="text-[10px] font-bold uppercase text-cinza">De onde veio</p>
          <div className="mt-1.5 flex flex-wrap gap-2">
            {ENTRY_ORIGINS.map((item) => (
              <button
                key={item.value}
                type="button"
                aria-pressed={origin === item.value}
                onClick={() => setOrigin(item.value)}
                className={`rounded-xl border px-3 py-2 text-xs font-bold ${
                  origin === item.value
                    ? "border-rosa-profundo bg-rosa-profundo text-white"
                    : "border-rosa/15 bg-white text-cinza"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        <label className="mt-3 block sm:max-w-xs">
          <span className="text-[10px] font-bold uppercase text-cinza">Frete pago (opcional)</span>
          <input
            value={freightText}
            onChange={(event) => setFreightText(event.target.value.replace(/[^\d.,]/g, ""))}
            inputMode="decimal"
            placeholder="R$ 0,00"
            className={`${inputClass} mt-1`}
          />
          <span className="mt-1 block text-[10px] leading-4 text-cinza">
            O frete é dividido entre os itens e entra no custo de cada um.
          </span>
        </label>
      </section>

      <section className="rounded-2xl bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-bold text-texto">O que chegou</h2>
          <button
            type="button"
            onClick={() => setQuickOpen(true)}
            className="rounded-lg border border-rosa/20 px-3 py-1.5 text-[11px] font-bold text-rosa-profundo"
          >
            + Produto novo
          </button>
        </div>

        <div className="relative mt-3">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={onSearchKey}
            placeholder="Buscar produto, marca ou SKU"
            aria-label="Buscar produto para adicionar à entrada"
            autoComplete="off"
            enterKeyHint="search"
            className={inputClass}
          />
        </div>

        {notice && (
          <p role="status" className="mt-2 rounded-xl bg-green-50 px-3 py-2 text-xs font-semibold text-green-800">
            {notice}
          </p>
        )}

        {query.trim() && (
          <div className="mt-2 overflow-hidden rounded-xl border border-rosa/15">
            {groups.length === 0 ? (
              <div className="px-3 py-4 text-center">
                <p className="text-xs text-cinza">Nenhum produto encontrado.</p>
                <button
                  type="button"
                  onClick={() => setQuickOpen(true)}
                  className="mt-2 rounded-xl bg-rosa-profundo px-4 py-2.5 text-xs font-extrabold text-white"
                >
                  + Cadastrar “{query.trim().slice(0, 40)}” como produto novo
                </button>
              </div>
            ) : (
              <>
                <div className="divide-y divide-rosa/10">
                  {groups.map((group) => {
                    const first = group.items[0];
                    if (first.variantId === null) {
                      return (
                        <button
                          key={group.productId}
                          type="button"
                          onClick={() => addLine(first)}
                          className="flex w-full items-center gap-3 px-3 py-3 text-left hover:bg-creme"
                        >
                          <Thumb src={first.image} />
                          <span className="min-w-0 flex-1">
                            <span className="line-clamp-2 block text-xs font-bold text-texto">{first.name}</span>
                            <span className="block truncate text-[10px] text-cinza">
                              {first.brand} · estoque {first.stockItem}
                              {!first.active ? " · rascunho/inativo" : ""}
                            </span>
                          </span>
                          <span className="shrink-0 rounded-full bg-rosa-profundo px-3 py-1.5 text-[11px] font-bold text-white">
                            Adicionar
                          </span>
                        </button>
                      );
                    }
                    return (
                      <div key={group.productId} className="px-3 py-3">
                        <div className="flex items-start gap-3">
                          <Thumb src={first.image} />
                          <div className="min-w-0 flex-1">
                            <p className="line-clamp-2 text-xs font-bold text-texto">{first.name}</p>
                            <p className="truncate text-[10px] text-cinza">
                              {first.brand} · {group.items.length} {group.items.length === 1 ? "variação" : "variações"}
                              {!first.active ? " · rascunho/inativo" : ""}
                            </p>
                          </div>
                          {group.items.length > 1 && (
                            <button
                              type="button"
                              onClick={() => addLines(group.items)}
                              className="shrink-0 rounded-full border border-rosa-profundo px-3 py-1.5 text-[11px] font-bold text-rosa-profundo"
                            >
                              Todas ({group.items.length})
                            </button>
                          )}
                        </div>
                        <div className="mt-2 grid gap-1.5">
                          {group.items.map((item) => (
                            <button
                              key={item.key}
                              type="button"
                              onClick={() => addLine(item)}
                              className="flex w-full items-center justify-between gap-3 rounded-lg border border-rosa/15 bg-white px-3 py-2.5 text-left hover:bg-creme"
                            >
                              <span className="min-w-0">
                                <span className="block truncate text-xs font-bold text-texto">{item.variantName}</span>
                                <span className="block text-[10px] text-cinza">estoque {item.stockItem}</span>
                              </span>
                              <span className="shrink-0 text-[11px] font-bold text-rosa-profundo">+ Adicionar</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="flex items-center justify-between gap-2 border-t border-rosa/10 bg-creme/50 px-3 py-2 text-[10px] text-cinza">
                  <span>
                    {totalProducts > MAX_PRODUCTS
                      ? `Mostrando ${MAX_PRODUCTS} de ${totalProducts} produtos. Refine a busca.`
                      : "Não é nenhum destes?"}
                  </span>
                  <button type="button" onClick={() => setQuickOpen(true)} className="shrink-0 font-bold text-rosa-profundo">
                    + Produto novo
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {lines.length === 0 ? (
          <p className="mt-4 rounded-xl border border-dashed border-rosa/20 p-6 text-center text-xs text-cinza">
            Busque um produto acima para lançar o que chegou. Se for novo, use “+ Produto novo”.
          </p>
        ) : (
          <div className="mt-4 divide-y divide-rosa/10">
            {lines.map((line, index) => {
              const info = preview[index];
              const badQty = submitted && !(Number.isInteger(parsedLines[index].qty) && parsedLines[index].qty > 0);
              const badCost = submitted && !(parsedLines[index].unitCost > 0);
              return (
                <div key={line.key} className="py-3">
                  <div className="flex items-start gap-3">
                    <Thumb src={line.image} size="h-11 w-11" />
                    <div className="min-w-0 flex-1">
                      <p className="line-clamp-2 text-xs font-bold text-texto">{line.name}</p>
                      {line.variantName && (
                        <p className="mt-1 inline-block max-w-full truncate rounded-full bg-rosa-profundo/10 px-2.5 py-0.5 text-[11px] font-bold text-rosa-profundo">
                          {line.variantName}
                        </p>
                      )}
                      <p className="mt-0.5 text-[10px] text-cinza">
                        {line.brand} · estoque {line.stockItem} · custo hoje{" "}
                        {line.costBefore !== null ? money(line.costBefore) : "não cadastrado"}
                        {!line.active ? " · rascunho/inativo" : ""}
                      </p>
                      {line.variantPrice !== null && Math.abs(line.variantPrice - line.price) >= 0.005 && (
                        <p className="mt-0.5 text-[10px] font-semibold text-amber-800">
                          Esta variação vende por {money(line.variantPrice)} (preço próprio). O preço de venda desta tela não muda esse valor.
                        </p>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => setLines((current) => current.filter((item) => item.key !== line.key))}
                      className="-my-1 shrink-0 px-2 py-2 text-[11px] font-bold text-red-600"
                    >
                      Remover
                    </button>
                  </div>

                  <div className="mt-2 grid grid-cols-2 gap-2">
                    <label className="block">
                      <span className="text-[10px] font-bold uppercase text-cinza">Quantidade</span>
                      <input
                        id={`qty-${line.key}`}
                        value={line.qtyText}
                        onChange={(event) => patchLine(line.key, { qtyText: event.target.value.replace(/\D/g, "").slice(0, 4) })}
                        inputMode="numeric"
                        placeholder="0"
                        autoFocus={line.key === focusKey}
                        aria-label={`Quantidade de ${line.name}`}
                        aria-invalid={badQty}
                        className={`${inputClass} mt-1 font-bold ${badQty ? badInputClass : ""}`}
                      />
                    </label>
                    <label className="block">
                      <span className="text-[10px] font-bold uppercase text-cinza">Custo unitário</span>
                      <input
                        id={`cost-${line.key}`}
                        value={line.costText}
                        onChange={(event) => patchLine(line.key, { costText: event.target.value.replace(/[^\d.,]/g, "").slice(0, 12) })}
                        inputMode="decimal"
                        placeholder="R$ 0,00"
                        aria-label={`Custo unitário de ${line.name}`}
                        aria-invalid={badCost}
                        className={`${inputClass} mt-1 font-bold ${badCost ? badInputClass : ""}`}
                      />
                    </label>
                  </div>

                  {info && (
                    <p className="mt-2 rounded-lg bg-creme/70 px-3 py-2 text-[11px] leading-4 text-cinza">
                      Custo com frete <strong className="text-texto">{money(info.landed)}</strong> · novo custo do produto{" "}
                      <strong className="text-rosa-profundo">{money(info.average)}</strong>
                      {line.costBefore !== null && line.stockProduct > 0 ? " (média com o estoque atual)" : ""}
                    </p>
                  )}
                  {showPrice(line, index) && renderPriceBlock(line)}
                  {info?.deviation && line.costBefore !== null && (
                    <p role="status" className="mt-1.5 rounded-lg bg-amber-50 px-3 py-2 text-[11px] font-semibold leading-4 text-amber-900">
                      O custo está {info.deviation === "alto" ? "bem acima" : "bem abaixo"} do atual ({money(line.costBefore)}).
                      Confira a vírgula e a quantidade.
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section className="rounded-2xl bg-white p-4 shadow-sm">
        <label className="block">
          <span className="text-[10px] font-bold uppercase text-cinza">Observações (opcional)</span>
          <textarea
            value={notes}
            maxLength={300}
            rows={2}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="Ex.: pedido #123 da Shopee, nota fiscal…"
            className={`${inputClass} mt-1`}
          />
        </label>
      </section>

      {error && (
        <p ref={errorRef} role="alert" className="rounded-xl bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">
          {error}
        </p>
      )}

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-rosa/15 bg-white px-3 pb-[calc(0.65rem+env(safe-area-inset-bottom))] pt-2.5 shadow-[0_-8px_24px_rgba(35,20,42,0.08)] lg:static lg:rounded-2xl lg:border lg:px-4 lg:py-3 lg:shadow-sm">
        <div className="mx-auto flex max-w-lg items-center gap-3 lg:max-w-none">
          <div className="min-w-0 flex-1 text-xs text-cinza">
            <p>
              {totals.items} item(ns) · {totals.units} un.
              {totals.freight > 0 ? ` · frete ${money(totals.freight)}` : ""}
              {incomplete > 0 && <span className="font-bold text-amber-700"> · faltam dados em {incomplete}</span>}
            </p>
            <p className="truncate text-sm font-extrabold text-rosa-profundo">Total {money(totals.total)}</p>
          </div>
          <button
            type="button"
            onClick={save}
            disabled={saving || lines.length === 0}
            className="shrink-0 rounded-xl bg-rosa-profundo px-5 py-3 text-xs font-extrabold text-white disabled:opacity-50"
          >
            {saving ? "Registrando..." : "Registrar entrada"}
          </button>
        </div>
      </div>

      {quickOpen && (
        <QuickProductSheet
          initialName={query}
          categories={categories}
          brands={brands}
          onClose={closeQuick}
          onCreated={handleCreated}
        />
      )}
    </div>
  );
}
