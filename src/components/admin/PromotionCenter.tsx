"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Check,
  Clock3,
  Copy,
  Download,
  ExternalLink,
  ImageIcon,
  Link2,
  RefreshCw,
  Search,
  Share2,
  Sparkles,
} from "lucide-react";

type Product = {
  id: string;
  name: string;
  brand: string;
  price: number;
  promoPrice: number | null;
  stockQty: number;
  active: boolean;
  featured: boolean;
  isNew: boolean;
  bestSeller: boolean;
  createdAt: string;
  imageUrl: string | null;
  category: { name: string };
};

type CampaignKind = "destaque" | "oferta" | "novidade";
type ArtworkFormat = "status" | "quadrado";
type QueueItem = { time: string; productId: string; kind: CampaignKind; done: boolean };
type StoredQueue = { date: string; items: QueueItem[] };
type StoreBranding = { storeName: string; logoUrl: string | null };
type MessageProfile = { heading: string; hook: string; cta: string };
type AiCopyVariation = { hook: string; cta: string };
type AiCopyResult = {
  suggestionId: string | null;
  variations: AiCopyVariation[];
  model: string;
  promptVersion: string;
};
type ActiveAiCopy = {
  suggestionId: string | null;
  selectedIndex: number;
  original: string;
};

const QUEUE_KEY = "sra-make-divulgacao-queue-v3";
const HISTORY_KEY = "sra-make-divulgacao-history-v3";
const TIMES = ["10:00", "15:00", "19:00"];
const SUGGESTION_POOL_MIN = 15;
const NON_DESCRIPTIVE_VALUES = new Set([
  "variado",
  "variada",
  "varios",
  "varias",
  "sem variacao",
  "nao se aplica",
  "n/a",
  "na",
  "-",
  "--",
]);

function money(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function localDateKey() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function compactDate() {
  return localDateKey().replace(/-/g, "");
}

function hasRealPromotion(product: Product) {
  return product.promoPrice !== null && product.promoPrice < product.price;
}

function isPriorityProduct(product: Product) {
  return hasRealPromotion(product) || product.featured || product.isNew || product.bestSeller;
}

function pickCampaignKind(product: Product): CampaignKind {
  if (hasRealPromotion(product)) return "oferta";
  if (product.bestSeller) return "destaque";
  if (product.isNew) return "novidade";
  return "destaque";
}

function campaignLabel(kind: CampaignKind) {
  if (kind === "novidade") return "Novidade";
  if (kind === "oferta") return "Oferta";
  return "Destaque";
}

function kindCode(kind: CampaignKind) {
  if (kind === "novidade") return "n";
  if (kind === "oferta") return "o";
  return "d";
}

function formatCode(format: ArtworkFormat) {
  return format === "quadrado" ? "q" : "s";
}

function buildShortUrl(siteUrl: string, product: Product, kind: CampaignKind, format: ArtworkFormat) {
  const baseUrl = siteUrl.replace(/\/$/, "");
  const code = product.id.slice(-7);
  return `${baseUrl}/r/${code}?d=${compactDate()}&k=${kindCode(kind)}&f=${formatCode(format)}`;
}

function normalizeDescriptor(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLocaleLowerCase("pt-BR");
}

function usefulDescriptor(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "";
  return NON_DESCRIPTIVE_VALUES.has(normalizeDescriptor(trimmed)) ? "" : trimmed;
}

function getMessageProfile(product: Product): MessageProfile {
  if (hasRealPromotion(product)) {
    return {
      heading: "💗 OFERTA SRA MAKE",
      hook: "Por tempo limitado, com desconto especial.",
      cta: "Aproveite antes que acabe:",
    };
  }

  if (product.bestSeller) {
    return {
      heading: "✨ MAIS PEDIDOS SRA MAKE",
      hook: "Um dos mais pedidos pelas nossas clientes.",
      cta: "Peça o seu:",
    };
  }

  if (product.isNew) {
    return {
      heading: "✨ NOVIDADE SRA MAKE",
      hook: "Acabou de chegar na Sra Make.",
      cta: "Seja das primeiras a garantir:",
    };
  }

  if (product.featured) {
    return {
      heading: "✨ DESTAQUE SRA MAKE",
      hook: "Selecionado especialmente pra você.",
      cta: "Confira e peça:",
    };
  }

  return {
    heading: "✨ DESTAQUE SRA MAKE",
    hook: "Uma escolha que vale conferir.",
    cta: "Veja detalhes e faça seu pedido:",
  };
}

function buildMessage(
  product: Product,
  url: string,
  profileOverride?: MessageProfile
) {
  const profile = profileOverride ?? getMessageProfile(product);
  const price = hasRealPromotion(product)
    ? `De ~${money(product.price)}~\nPor *${money(product.promoPrice!)}*`
    : `*${money(product.price)}*`;
  const descriptor = usefulDescriptor(product.brand);

  return [
    profile.heading,
    "",
    `*${product.name}*`,
    descriptor,
    "",
    price,
    "",
    profile.hook,
    "",
    profile.cta,
    url,
    "",
    "Retirada ou entrega em Presidente Prudente.",
  ]
    .filter(Boolean)
    .join("\n");
}

function scoreProduct(product: Product, recent: Set<string>) {
  let score = 0;
  if (product.imageUrl) score += 8;
  if (hasRealPromotion(product)) score += 7;
  if (product.isNew) score += 6;
  if (product.featured) score += 4;
  if (product.bestSeller) score += 3;
  if (product.stockQty >= 5) score += 2;
  if (product.stockQty <= 2) score -= 4;
  if (recent.has(product.id)) score -= 30;
  return score;
}

function buildSuggestionPool(products: Product[]) {
  const available = products.filter((product) => product.active && product.stockQty > 0);
  const withImage = available.filter((product) => Boolean(product.imageUrl));
  const source = withImage.length >= TIMES.length ? withImage : available;
  const priority = source.filter(isPriorityProduct);

  if (priority.length >= SUGGESTION_POOL_MIN) return priority;

  const priorityIds = new Set(priority.map((product) => product.id));
  const fallback = source
    .filter((product) => !priorityIds.has(product.id))
    .sort((a, b) => b.stockQty - a.stockQty || b.createdAt.localeCompare(a.createdAt));

  return [...priority, ...fallback.slice(0, Math.max(0, SUGGESTION_POOL_MIN - priority.length))];
}

function buildQueue(products: Product[], historyIds: string[], previousIds: string[] = []) {
  const recent = new Set(historyIds.slice(-12));
  const pool = buildSuggestionPool(products);
  const previous = new Set(previousIds);
  const withoutPrevious = pool.filter((product) => !previous.has(product.id));
  const candidates = withoutPrevious.length >= TIMES.length ? withoutPrevious : pool;
  const randomized = candidates
    .map((product) => ({
      product,
      score: scoreProduct(product, recent) + Math.random() * 10,
    }))
    .sort((a, b) => b.score - a.score)
    .map(({ product }) => product);
  const chosen: Product[] = [];
  const categories = new Set<string>();

  for (const product of randomized) {
    if (chosen.length >= TIMES.length) break;
    if (categories.has(product.category.name)) continue;
    chosen.push(product);
    categories.add(product.category.name);
  }

  for (const product of randomized) {
    if (chosen.length >= TIMES.length) break;
    if (!chosen.some((item) => item.id === product.id)) chosen.push(product);
  }

  return chosen.map((product, index) => ({
    time: TIMES[index],
    productId: product.id,
    kind: pickCampaignKind(product),
    done: false,
  }));
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = src;
  });
}

async function drawArtwork(
  canvas: HTMLCanvasElement,
  product: Product,
  kind: CampaignKind,
  format: ArtworkFormat,
  branding: StoreBranding
) {
  const width = 1080;
  const height = format === "status" ? 1920 : 1080;
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const margin = 72;
  const footer = format === "status" ? 140 : 110;
  const imageTop = format === "status" ? 170 : 145;
  const imageHeight = height - imageTop - footer - 70;
  const imageWidth = width - margin * 2;

  ctx.fillStyle = "#FFF9FB";
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = "#8D4F5F";
  ctx.textAlign = "left";
  ctx.font = `700 ${format === "status" ? 40 : 34}px Georgia`;
  ctx.fillText(branding.storeName || "Sra Make Prudente", margin, 100);

  ctx.textAlign = "right";
  ctx.font = `700 ${format === "status" ? 27 : 23}px Arial`;
  ctx.fillText(campaignLabel(kind).toUpperCase(), width - margin, 100);

  ctx.fillStyle = "#FFFFFF";
  ctx.fillRect(margin, imageTop, imageWidth, imageHeight);
  ctx.strokeStyle = "#E0C0C0";
  ctx.lineWidth = 3;
  ctx.strokeRect(margin, imageTop, imageWidth, imageHeight);

  if (product.imageUrl) {
    try {
      const image = await loadImage(product.imageUrl);
      const pad = 24;
      const usableW = imageWidth - pad * 2;
      const usableH = imageHeight - pad * 2;
      const scale = Math.min(usableW / image.width, usableH / image.height);
      const drawW = image.width * scale;
      const drawH = image.height * scale;
      ctx.drawImage(
        image,
        margin + (imageWidth - drawW) / 2,
        imageTop + (imageHeight - drawH) / 2,
        drawW,
        drawH
      );
    } catch {
      ctx.fillStyle = "#766D72";
      ctx.textAlign = "center";
      ctx.font = "500 30px Arial";
      ctx.fillText("Foto indisponível", width / 2, imageTop + imageHeight / 2);
    }
  }

  ctx.fillStyle = "#8D4F5F";
  ctx.fillRect(0, height - footer, width, footer);
  ctx.fillStyle = "#FFFFFF";
  ctx.textAlign = "center";
  ctx.font = `700 ${format === "status" ? 30 : 24}px Arial`;
  ctx.fillText("Veja no catálogo • Retirada ou entrega", width / 2, height - footer / 2 + 10);
}

function createArtworkBlob(canvas: HTMLCanvasElement | null) {
  return new Promise<Blob | null>((resolve) => {
    if (!canvas) return resolve(null);
    canvas.toBlob(resolve, "image/png", 0.95);
  });
}

export function PromotionCenter({
  products,
  branding,
  siteUrl = "https://sramakeprudente.com.br",
}: {
  products: Product[];
  branding: StoreBranding;
  siteUrl?: string;
}) {
  const available = useMemo(
    () => products.filter((product) => product.active && product.stockQty > 0),
    [products]
  );
  const [productId, setProductId] = useState(available[0]?.id ?? "");
  const [productQuery, setProductQuery] = useState("");
  const [format, setFormat] = useState<ArtworkFormat>("status");
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [history, setHistory] = useState<string[]>([]);
  const [ready, setReady] = useState(false);
  const [copied, setCopied] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [shareNote, setShareNote] = useState("");
  const [messageDraft, setMessageDraft] = useState("");
  const [aiCopyLoading, setAiCopyLoading] = useState(false);
  const [aiCopyError, setAiCopyError] = useState("");
  const [aiCopyResult, setAiCopyResult] = useState<AiCopyResult | null>(null);
  const [activeAiCopy, setActiveAiCopy] = useState<ActiveAiCopy | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const product = available.find((item) => item.id === productId) ?? available[0];
  const normalizedProductQuery = normalizeDescriptor(productQuery);
  const filteredAvailable = useMemo(() => {
    if (!normalizedProductQuery) return available;
    return available.filter((item) =>
      normalizeDescriptor(`${item.name} ${item.brand}`).includes(normalizedProductQuery)
    );
  }, [available, normalizedProductQuery]);
  const selectedProductIsVisible = product
    ? filteredAvailable.some((item) => item.id === product.id)
    : false;
  const kind = product ? pickCampaignKind(product) : "destaque";
  const productUrl = product ? buildShortUrl(siteUrl, product, kind, format) : "";
  const templateMessage = product ? buildMessage(product, productUrl) : "";

  useEffect(() => {
    try {
      const storedHistory = JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]") as string[];
      const storedQueue = JSON.parse(localStorage.getItem(QUEUE_KEY) || "null") as StoredQueue | null;
      const nextQueue = storedQueue?.date === localDateKey() && Array.isArray(storedQueue.items)
        ? storedQueue.items
        : buildQueue(products, storedHistory);
      setHistory(storedHistory);
      setQueue(nextQueue);
    } catch {
      setQueue(buildQueue(products, []));
    }
  }, [products]);

  useEffect(() => {
    if (queue.length) localStorage.setItem(QUEUE_KEY, JSON.stringify({ date: localDateKey(), items: queue }));
  }, [queue]);

  useEffect(() => {
    if (!canvasRef.current || !product) return;
    setReady(false);
    drawArtwork(canvasRef.current, product, kind, format, branding)
      .then(() => setReady(true))
      .catch(() => setReady(false));
  }, [product, kind, format, branding]);

  useEffect(() => {
    setMessageDraft(templateMessage);
    setAiCopyResult(null);
    setAiCopyError("");
    setActiveAiCopy(null);
    setShareNote("");
  }, [product?.id, format, templateMessage]);

  function markActiveAiCopyUsed() {
    if (!activeAiCopy?.suggestionId || !product) return;
    const edited = messageDraft.trim() !== activeAiCopy.original.trim();
    void fetch(`/api/admin/ai/suggestions/${activeAiCopy.suggestionId}/use`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        productId: product.id,
        selectedIndex: activeAiCopy.selectedIndex,
        edited,
      }),
      keepalive: true,
    }).catch(() => {
      // Telemetria nunca bloqueia o compartilhamento.
    });
  }

  async function copyMessage() {
    if (!messageDraft) return;
    await navigator.clipboard.writeText(messageDraft);
    markActiveAiCopyUsed();
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  async function copyLink() {
    if (!productUrl) return;
    await navigator.clipboard.writeText(productUrl);
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 1500);
  }

  function downloadBlob(blob: Blob) {
    if (!product) return;
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `sra-make-${product.id.slice(-7)}-${format}.png`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  async function downloadArtwork() {
    const blob = await createArtworkBlob(canvasRef.current);
    if (blob) downloadBlob(blob);
  }

  async function shareCampaign() {
    if (!product || !ready || !messageDraft) return;
    setShareNote("");
    const blob = await createArtworkBlob(canvasRef.current);
    if (!blob) return;
    const file = new File([blob], `sra-make-${product.id.slice(-7)}.png`, { type: "image/png" });

    if (navigator.share && navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: product.name, text: messageDraft });
        markActiveAiCopyUsed();
        return;
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
      }
    }

    downloadBlob(blob);
    await navigator.clipboard.writeText(messageDraft);
    markActiveAiCopyUsed();
    setShareNote("Arte baixada e mensagem copiada.");
  }

  function openWhatsApp() {
    if (!messageDraft) return;
    markActiveAiCopyUsed();
    window.open(
      `https://wa.me/?text=${encodeURIComponent(messageDraft)}`,
      "_blank",
      "noopener,noreferrer"
    );
  }

  function togglePublished(index: number) {
    const item = queue[index];
    if (!item) return;
    setQueue((current) => current.map((entry, i) => i === index ? { ...entry, done: !entry.done } : entry));
    if (!item.done) {
      const nextHistory = [...history, item.productId].slice(-30);
      setHistory(nextHistory);
      localStorage.setItem(HISTORY_KEY, JSON.stringify(nextHistory));
    }
  }

  function generateNewSuggestions() {
    setQueue((current) => buildQueue(products, history, current.map((item) => item.productId)));
  }

  async function generateAiCopyVariations() {
    if (!product) return;
    setAiCopyError("");
    setAiCopyLoading(true);

    try {
      const response = await fetch("/api/admin/ai/promotion-copy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId: product.id }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !Array.isArray(data.variations)) {
        throw new Error(data.error ?? "Não foi possível gerar variações agora.");
      }

      const variations = (data.variations as unknown[])
        .map((entry) => {
          if (!entry || typeof entry !== "object") return null;
          const variation = entry as { hook?: unknown; cta?: unknown };
          if (typeof variation.hook !== "string" || typeof variation.cta !== "string") {
            return null;
          }
          return { hook: variation.hook.trim(), cta: variation.cta.trim() };
        })
        .filter((entry): entry is AiCopyVariation => Boolean(entry));

      if (!variations.length) {
        throw new Error("A IA não retornou variações utilizáveis.");
      }

      setAiCopyResult({
        suggestionId:
          typeof data.suggestionId === "string" ? data.suggestionId : null,
        variations,
        model: typeof data.model === "string" ? data.model : "Gemini",
        promptVersion:
          typeof data.promptVersion === "string" ? data.promptVersion : "v1",
      });
    } catch (error) {
      setAiCopyError(
        error instanceof Error ? error.message : "Não foi possível gerar variações agora."
      );
    } finally {
      setAiCopyLoading(false);
    }
  }

  function useAiVariation(variation: AiCopyVariation, index: number) {
    if (!product) return;
    const base = getMessageProfile(product);
    const nextMessage = buildMessage(product, productUrl, {
      heading: base.heading,
      hook: variation.hook,
      cta: variation.cta,
    });

    setMessageDraft(nextMessage);
    setActiveAiCopy({
      suggestionId: aiCopyResult?.suggestionId ?? null,
      selectedIndex: index,
      original: nextMessage,
    });
    setShareNote("");
  }

  function useTemplateMessage() {
    setMessageDraft(templateMessage);
    setActiveAiCopy(null);
    setShareNote("");
  }

  if (!product) {
    return <div className="rounded-2xl border border-rosa/15 bg-white p-5 text-sm text-cinza">Cadastre pelo menos um produto ativo e com estoque para criar campanhas.</div>;
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-rosa/15 bg-white p-5 shadow-sm">
        <div className="flex items-start gap-3">
          <Sparkles className="mt-0.5 text-rosa-profundo" size={20} />
          <div>
            <h2 className="font-serif text-xl font-bold text-texto">Campanha completa em um clique</h2>
            <p className="mt-1 text-sm text-cinza">Produto, arte, texto e link curto rastreável prontos para compartilhar.</p>
          </div>
        </div>
        <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_auto] lg:items-end">
          <label className="block">
            <span className="mb-2 block text-xs font-bold uppercase tracking-wide text-cinza">Produto</span>
            <div className="relative mb-2">
              <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-cinza" size={16} />
              <input
                type="search"
                value={productQuery}
                onChange={(event) => setProductQuery(event.target.value)}
                placeholder="Buscar por nome ou marca..."
                className="w-full rounded-xl border border-rosa/20 bg-white py-3 pl-9 pr-3 text-sm text-texto outline-none focus:border-rosa-profundo"
              />
            </div>
            <select
              value={selectedProductIsVisible ? product.id : ""}
              onChange={(event) => { setProductId(event.target.value); setShareNote(""); }}
              className="w-full rounded-xl border border-rosa/20 bg-white px-3 py-3 text-sm text-texto"
            >
              {!selectedProductIsVisible ? (
                <option value="" disabled>
                  {filteredAvailable.length ? "Selecione um produto" : "Nenhum produto encontrado"}
                </option>
              ) : null}
              {filteredAvailable.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}{usefulDescriptor(item.brand) ? ` — ${item.brand}` : ""}
                </option>
              ))}
            </select>
            <span className="mt-1 block text-xs text-cinza">
              {filteredAvailable.length} de {available.length} produtos disponíveis
            </span>
          </label>
          <div>
            <span className="mb-2 block text-xs font-bold uppercase tracking-wide text-cinza">Modelo automático</span>
            <div className="rounded-xl bg-creme px-4 py-3 text-sm font-bold text-texto">{campaignLabel(kind)}</div>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-rosa/15 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <ImageIcon className="text-rosa-profundo" size={20} />
            <div><h2 className="font-serif text-lg font-bold text-texto">Campanha pronta</h2><p className="text-sm text-cinza">O link curto mantém os UTMs e mede cliques sem depender de serviços externos.</p></div>
          </div>
          <div className="flex gap-2">
            {(["status", "quadrado"] as const).map((value) => (
              <button key={value} type="button" onClick={() => setFormat(value)} className={`rounded-xl border px-3 py-2 text-xs font-bold ${format === value ? "border-rosa-profundo bg-rosa-profundo text-white" : "border-rosa/20 text-cinza"}`}>
                {value === "status" ? "Status 9:16" : "Quadrado 1:1"}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(260px,420px)_1fr]">
          <div className="rounded-2xl bg-creme p-3"><canvas ref={canvasRef} className="h-auto w-full rounded-xl bg-white" /></div>
          <div className="flex min-w-0 flex-col gap-3">
            <div className="rounded-xl bg-creme p-4">
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-bold uppercase tracking-wide text-cinza">
                  Texto da campanha
                </span>
                {activeAiCopy ? (
                  <span className="rounded-full bg-white px-2 py-1 text-[10px] font-bold text-rosa-profundo">
                    Variação IA · editável
                  </span>
                ) : (
                  <span className="text-[10px] font-medium text-cinza">Modelo fixo · editável</span>
                )}
              </div>
              <textarea
                value={messageDraft}
                onChange={(event) => {
                  setMessageDraft(event.target.value);
                  setShareNote("");
                }}
                rows={13}
                className="w-full resize-y rounded-lg border border-rosa/10 bg-white p-3 text-sm leading-6 text-texto outline-none focus:border-rosa-profundo"
              />
              <p className="mt-1 text-[10px] leading-4 text-cinza">
                Revise antes de compartilhar. Preço, link e classificação da campanha continuam vindo do sistema.
              </p>
            </div>

            <div className="rounded-xl border border-rosa/15 bg-white p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="flex items-center gap-1.5 text-xs font-bold text-texto">
                    <Sparkles size={14} /> Variações com IA
                  </p>
                  <p className="mt-1 text-[10px] leading-4 text-cinza">
                    A IA só cria gancho e CTA. Não decide oferta, novidade, destaque ou mais vendido.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => void generateAiCopyVariations()}
                  disabled={aiCopyLoading}
                  className="rounded-lg border border-rosa-profundo/25 px-3 py-2 text-xs font-bold text-rosa-profundo disabled:opacity-40"
                >
                  {aiCopyLoading ? "Gerando..." : aiCopyResult ? "Gerar outras" : "Gerar 3 variações"}
                </button>
              </div>

              {aiCopyError ? (
                <p className="mt-2 text-xs text-vermelho">{aiCopyError}</p>
              ) : null}

              {aiCopyResult ? (
                <div className="mt-3 space-y-2">
                  {aiCopyResult.variations.map((variation, index) => {
                    const selected = activeAiCopy?.selectedIndex === index;
                    return (
                      <button
                        key={`${variation.hook}-${index}`}
                        type="button"
                        onClick={() => useAiVariation(variation, index)}
                        className={`block w-full rounded-xl border p-3 text-left transition ${
                          selected
                            ? "border-rosa-profundo bg-rosa/5"
                            : "border-rosa/15 bg-creme/40 hover:border-rosa-profundo/40"
                        }`}
                      >
                        <span className="text-[10px] font-bold uppercase tracking-wide text-rosa-profundo">
                          Variação {index + 1}
                        </span>
                        <p className="mt-1 text-xs font-semibold text-texto">{variation.hook}</p>
                        <p className="mt-1 text-xs text-cinza">{variation.cta}</p>
                      </button>
                    );
                  })}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                    <button
                      type="button"
                      onClick={useTemplateMessage}
                      className="text-[11px] font-bold text-rosa-profundo underline underline-offset-2"
                    >
                      Voltar ao modelo fixo
                    </button>
                    <span className="text-[9px] text-cinza">
                      {aiCopyResult.model} · {aiCopyResult.promptVersion}
                    </span>
                  </div>
                </div>
              ) : null}
            </div>

            <div className="rounded-xl border border-rosa/15 bg-white p-3">
              <div className="mb-1 flex items-center gap-2 text-xs font-bold text-texto"><Link2 size={14} /> Link curto da campanha</div>
              <div className="flex gap-2">
                <div className="min-w-0 flex-1 truncate rounded-lg bg-creme px-3 py-2 text-xs text-cinza">{productUrl}</div>
                <button type="button" onClick={copyLink} className="rounded-lg border border-rosa/20 px-3 text-xs font-bold text-texto">{linkCopied ? "Copiado" : "Copiar"}</button>
              </div>
            </div>

            <button type="button" onClick={shareCampaign} disabled={!ready || !messageDraft.trim()} className="flex items-center justify-center gap-2 rounded-xl bg-rosa-profundo px-4 py-3 text-sm font-bold text-white disabled:opacity-40"><Share2 size={17} /> Compartilhar campanha</button>

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              <button type="button" onClick={copyMessage} disabled={!messageDraft.trim()} className="flex items-center justify-center gap-1.5 rounded-xl border border-rosa/20 px-3 py-3 text-xs font-bold text-texto disabled:opacity-40"><Copy size={15} />{copied ? "Copiado" : "Copiar texto"}</button>
              <button type="button" onClick={downloadArtwork} disabled={!ready} className="flex items-center justify-center gap-1.5 rounded-xl border border-rosa/20 px-3 py-3 text-xs font-bold text-texto disabled:opacity-40"><Download size={15} />Baixar arte</button>
              <button type="button" onClick={openWhatsApp} disabled={!messageDraft.trim()} className="col-span-2 flex items-center justify-center gap-1.5 rounded-xl border border-rosa/20 px-3 py-3 text-xs font-bold text-texto disabled:opacity-40 sm:col-span-1"><ExternalLink size={15} />WhatsApp</button>
            </div>
            {shareNote ? <p className="text-xs font-medium text-cinza">{shareNote}</p> : null}
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-rosa/15 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div><h2 className="font-serif text-lg font-bold text-texto">Sugestões de hoje</h2><p className="text-sm text-cinza">Três produtos variados, priorizando imagem, estoque, novidade, destaque, mais vendidos e promoção real.</p></div>
          <button type="button" onClick={generateNewSuggestions} className="flex items-center gap-2 rounded-xl border border-rosa/20 px-3 py-2 text-xs font-bold text-texto"><RefreshCw size={15} />Gerar novas sugestões</button>
        </div>
        <div className="mt-4 space-y-2">
          {queue.map((item, index) => {
            const queueProduct = products.find((current) => current.id === item.productId);
            if (!queueProduct) return null;
            return (
              <div key={`${item.time}-${item.productId}`} className="flex flex-col gap-3 rounded-xl border border-rosa/10 p-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0"><p className="truncate text-sm font-bold text-texto">{queueProduct.name}</p><p className="mt-1 text-xs text-cinza"><Clock3 size={12} className="mr-1 inline" />{item.time} · {queueProduct.category.name} · {campaignLabel(item.kind)}</p></div>
                <div className="flex gap-2">
                  <button type="button" onClick={() => { setProductId(item.productId); setProductQuery(""); setFormat("status"); window.scrollTo({ top: 0, behavior: "smooth" }); }} className="rounded-lg border border-rosa/20 px-3 py-2 text-xs font-bold text-texto">Abrir</button>
                  <button type="button" onClick={() => togglePublished(index)} className={`flex items-center justify-center gap-1 rounded-lg px-3 py-2 text-xs font-bold ${item.done ? "border border-rosa/20 text-cinza" : "bg-rosa-profundo text-white"}`}>{item.done ? <><Check size={14} /> Publicado</> : "Marcar publicado"}</button>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
