"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Check,
  Clock3,
  Copy,
  Download,
  ExternalLink,
  ImageIcon,
  RefreshCw,
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
type QueueItem = {
  time: string;
  productId: string;
  kind: CampaignKind;
  done: boolean;
};
type StoredQueue = { date: string; items: QueueItem[] };
type StoreBranding = { storeName: string; logoUrl: string | null };

const QUEUE_KEY = "sra-make-divulgacao-queue-v2";
const HISTORY_KEY = "sra-make-divulgacao-history-v2";
const TIMES = ["10:00", "15:00", "19:00"];

function money(value: number) {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function slug(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
}

function localDateKey() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function hasRealPromotion(product: Product) {
  return product.promoPrice !== null && product.promoPrice < product.price;
}

function pickCampaignKind(product: Product): CampaignKind {
  if (product.isNew) return "novidade";
  if (hasRealPromotion(product)) return "oferta";
  return "destaque";
}

function campaignLabel(kind: CampaignKind) {
  if (kind === "novidade") return "Novidade";
  if (kind === "oferta") return "Oferta";
  return "Destaque";
}

function campaignCode(product: Product, kind: CampaignKind) {
  return `${kind}-${slug(product.name)}-${localDateKey().replace(/-/g, "")}`;
}

function buildMessage(product: Product, kind: CampaignKind, url: string) {
  const heading =
    kind === "novidade"
      ? "✨ NOVIDADE NA SRA MAKE"
      : kind === "oferta"
        ? "💗 OFERTA SRA MAKE"
        : "✨ DESTAQUE SRA MAKE";

  const price = hasRealPromotion(product)
    ? `De ~${money(product.price)}~\nPor *${money(product.promoPrice!)}*`
    : `*${money(product.price)}*`;

  const context =
    kind === "novidade"
      ? "Novidade disponível na Sra Make."
      : kind === "oferta"
        ? "Preço especial disponível no catálogo."
        : "";

  return [
    heading,
    "",
    `*${product.name}*`,
    product.brand || "",
    "",
    price,
    context ? "" : null,
    context || null,
    "",
    "Veja detalhes e faça seu pedido:",
    url,
    "",
    "Retirada ou entrega em Presidente Prudente.",
  ]
    .filter((line): line is string => line !== null)
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

function buildQueue(products: Product[], historyIds: string[]) {
  const recent = new Set(historyIds.slice(-12));
  const available = products.filter(
    (product) => product.active && product.stockQty > 0
  );
  const withImage = available.filter((product) => Boolean(product.imageUrl));
  const source = withImage.length >= TIMES.length ? withImage : available;
  const sorted = [...source].sort(
    (a, b) => scoreProduct(b, recent) - scoreProduct(a, recent)
  );

  const chosen: Product[] = [];
  const categories = new Set<string>();

  for (const product of sorted) {
    if (chosen.length >= TIMES.length) break;
    if (categories.has(product.category.name)) continue;
    chosen.push(product);
    categories.add(product.category.name);
  }

  for (const product of sorted) {
    if (chosen.length >= TIMES.length) break;
    if (chosen.some((item) => item.id === product.id)) continue;
    chosen.push(product);
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

function drawContain(
  context: CanvasRenderingContext2D,
  image: HTMLImageElement,
  x: number,
  y: number,
  width: number,
  height: number,
  padding = 24
) {
  const usableWidth = Math.max(1, width - padding * 2);
  const usableHeight = Math.max(1, height - padding * 2);
  const scale = Math.min(usableWidth / image.width, usableHeight / image.height);
  const drawWidth = image.width * scale;
  const drawHeight = image.height * scale;

  context.drawImage(
    image,
    x + (width - drawWidth) / 2,
    y + (height - drawHeight) / 2,
    drawWidth,
    drawHeight
  );
}

function wrappedLines(
  context: CanvasRenderingContext2D,
  text: string,
  maxWidth: number
) {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (context.measureText(next).width > maxWidth && current) {
      lines.push(current);
      current = word;
    } else {
      current = next;
    }
  }

  if (current) lines.push(current);
  return lines;
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

  const context = canvas.getContext("2d");
  if (!context) return;

  const cream = "#FFF9FB";
  const white = "#FFFFFF";
  const dark = "#333333";
  const muted = "#766D72";
  const pink = "#E0C0C0";
  const deep = "#8D4F5F";
  const margin = 72;

  context.fillStyle = cream;
  context.fillRect(0, 0, width, height);

  context.textAlign = "left";
  context.fillStyle = deep;
  context.font = `700 ${format === "status" ? 40 : 34}px Georgia`;
  context.fillText(branding.storeName || "Sra Make Prudente", margin, 92);

  context.textAlign = "right";
  context.font = `700 ${format === "status" ? 28 : 24}px Arial`;
  context.fillText(campaignLabel(kind).toUpperCase(), width - margin, 92);

  const imageTop = format === "status" ? 160 : 140;
  const imageHeight = format === "status" ? 1040 : 520;
  const imageWidth = width - margin * 2;

  context.fillStyle = white;
  context.fillRect(margin, imageTop, imageWidth, imageHeight);
  context.strokeStyle = pink;
  context.lineWidth = 3;
  context.strokeRect(margin, imageTop, imageWidth, imageHeight);

  if (product.imageUrl) {
    try {
      const image = await loadImage(product.imageUrl);
      drawContain(context, image, margin, imageTop, imageWidth, imageHeight, 30);
    } catch {
      context.textAlign = "center";
      context.fillStyle = muted;
      context.font = "500 30px Arial";
      context.fillText(
        "Foto indisponível",
        width / 2,
        imageTop + imageHeight / 2
      );
    }
  }

  let y = imageTop + imageHeight + (format === "status" ? 72 : 48);
  context.textAlign = "left";

  if (product.brand) {
    context.fillStyle = muted;
    context.font = `700 ${format === "status" ? 30 : 24}px Arial`;
    context.fillText(product.brand.toUpperCase(), margin, y);
    y += format === "status" ? 54 : 42;
  }

  context.fillStyle = dark;
  context.font = `700 ${format === "status" ? 58 : 44}px Georgia`;
  const titleLines = wrappedLines(
    context,
    product.name,
    width - margin * 2
  ).slice(0, format === "status" ? 3 : 2);
  const titleLineHeight = format === "status" ? 70 : 54;

  titleLines.forEach((line, index) => {
    context.fillText(line, margin, y + index * titleLineHeight);
  });
  y += titleLines.length * titleLineHeight + (format === "status" ? 24 : 16);

  if (hasRealPromotion(product)) {
    context.fillStyle = muted;
    context.font = `500 ${format === "status" ? 30 : 24}px Arial`;
    context.fillText(`De ${money(product.price)}`, margin, y);
    y += format === "status" ? 52 : 40;
  }

  context.fillStyle = deep;
  context.font = `700 ${format === "status" ? 82 : 64}px Arial`;
  context.fillText(money(product.promoPrice ?? product.price), margin, y);

  const footerHeight = format === "status" ? 120 : 96;
  context.fillStyle = deep;
  context.fillRect(0, height - footerHeight, width, footerHeight);
  context.fillStyle = white;
  context.textAlign = "center";
  context.font = `700 ${format === "status" ? 30 : 24}px Arial`;
  context.fillText(
    "Veja no catálogo • Retirada ou entrega",
    width / 2,
    height - footerHeight / 2 + 10
  );
}

function createArtworkBlob(canvas: HTMLCanvasElement | null) {
  return new Promise<Blob | null>((resolve) => {
    if (!canvas) {
      resolve(null);
      return;
    }
    canvas.toBlob(resolve, "image/png", 0.95);
  });
}

export function PromotionCenter({
  products,
  branding,
  siteUrl = "https://sramakeprudente.vercel.app",
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
  const [format, setFormat] = useState<ArtworkFormat>("status");
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [history, setHistory] = useState<string[]>([]);
  const [ready, setReady] = useState(false);
  const [copied, setCopied] = useState(false);
  const [shareNote, setShareNote] = useState("");
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const product = available.find((item) => item.id === productId) ?? available[0];
  const kind = product ? pickCampaignKind(product) : "destaque";
  const code = product ? campaignCode(product, kind) : "";
  const baseUrl = siteUrl.replace(/\/$/, "");
  const productUrl = product
    ? `${baseUrl}/produto/${product.id}?utm_source=whatsapp&utm_medium=organic&utm_campaign=${encodeURIComponent(code)}&utm_content=${format}`
    : "";
  const message = product ? buildMessage(product, kind, productUrl) : "";

  useEffect(() => {
    try {
      const storedHistory = JSON.parse(
        localStorage.getItem(HISTORY_KEY) || "[]"
      ) as string[];
      const storedQueue = JSON.parse(
        localStorage.getItem(QUEUE_KEY) || "null"
      ) as StoredQueue | null;

      const nextQueue =
        storedQueue?.date === localDateKey() && Array.isArray(storedQueue.items)
          ? storedQueue.items
          : buildQueue(products, storedHistory);

      setHistory(storedHistory);
      setQueue(nextQueue);
    } catch {
      setQueue(buildQueue(products, []));
    }
  }, [products]);

  useEffect(() => {
    if (!queue.length) return;
    const stored: StoredQueue = { date: localDateKey(), items: queue };
    localStorage.setItem(QUEUE_KEY, JSON.stringify(stored));
  }, [queue]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !product) return;

    setReady(false);
    drawArtwork(canvas, product, kind, format, branding)
      .then(() => setReady(true))
      .catch(() => setReady(false));
  }, [product, kind, format, branding]);

  async function copyMessage() {
    if (!message) return;
    await navigator.clipboard.writeText(message);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  }

  function downloadBlob(blob: Blob) {
    if (!product) return;
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `sra-make-${slug(product.name)}-${format}.png`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  async function downloadArtwork() {
    if (!product || !ready) return;
    const blob = await createArtworkBlob(canvasRef.current);
    if (!blob) return;
    downloadBlob(blob);
  }

  async function shareCampaign() {
    if (!product || !ready || !message) return;
    setShareNote("");

    const blob = await createArtworkBlob(canvasRef.current);
    if (!blob) return;

    const file = new File([blob], `sra-make-${slug(product.name)}.png`, {
      type: "image/png",
    });

    if (navigator.share && navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({
          files: [file],
          title: product.name,
          text: message,
        });
        return;
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
      }
    }

    downloadBlob(blob);
    await navigator.clipboard.writeText(message);
    setShareNote("Arte baixada e mensagem copiada.");
  }

  function openWhatsApp() {
    if (!message) return;
    window.open(
      `https://wa.me/?text=${encodeURIComponent(message)}`,
      "_blank",
      "noopener,noreferrer"
    );
  }

  function createNewQueue() {
    setQueue(buildQueue(products, history));
  }

  function openQueueItem(item: QueueItem) {
    setProductId(item.productId);
    setFormat("status");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function togglePublished(index: number) {
    const item = queue[index];
    if (!item) return;

    const next = queue.map((current, currentIndex) =>
      currentIndex === index ? { ...current, done: !current.done } : current
    );
    setQueue(next);

    if (!item.done) {
      const nextHistory = [...history, item.productId].slice(-30);
      setHistory(nextHistory);
      localStorage.setItem(HISTORY_KEY, JSON.stringify(nextHistory));
    }
  }

  if (!product) {
    return (
      <div className="rounded-2xl border border-rosa/15 bg-white p-5 text-sm text-cinza">
        Cadastre pelo menos um produto ativo e com estoque para criar campanhas.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-rosa/15 bg-white p-5 shadow-sm">
        <div className="flex items-start gap-3">
          <Sparkles className="mt-0.5 text-rosa-profundo" size={20} />
          <div>
            <h2 className="font-serif text-xl font-bold text-texto">
              Campanha completa
            </h2>
            <p className="mt-1 text-sm text-cinza">
              Escolha o produto. A arte e a mensagem são preparadas juntas.
            </p>
          </div>
        </div>

        <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_auto] lg:items-end">
          <label className="block">
            <span className="mb-2 block text-xs font-bold uppercase tracking-wide text-cinza">
              Produto
            </span>
            <select
              value={product.id}
              onChange={(event) => {
                setProductId(event.target.value);
                setShareNote("");
              }}
              className="w-full rounded-xl border border-rosa/20 bg-white px-3 py-3 text-sm text-texto"
            >
              {available.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>

          <div>
            <span className="mb-2 block text-xs font-bold uppercase tracking-wide text-cinza">
              Modelo automático
            </span>
            <div className="rounded-xl bg-creme px-4 py-3 text-sm font-bold text-texto">
              {campaignLabel(kind)}
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-rosa/15 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <ImageIcon className="text-rosa-profundo" size={20} />
            <div>
              <h2 className="font-serif text-lg font-bold text-texto">
                Campanha pronta
              </h2>
              <p className="text-sm text-cinza">
                Arte, descrição e link do catálogo no mesmo lugar.
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            {(["status", "quadrado"] as const).map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setFormat(value)}
                className={`rounded-xl border px-3 py-2 text-xs font-bold ${
                  format === value
                    ? "border-rosa-profundo bg-rosa-profundo text-white"
                    : "border-rosa/20 text-cinza"
                }`}
              >
                {value === "status" ? "Status 9:16" : "Quadrado 1:1"}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(260px,420px)_1fr]">
          <div className="rounded-2xl bg-creme p-3">
            <canvas
              ref={canvasRef}
              className="h-auto w-full rounded-xl bg-white"
            />
          </div>

          <div className="flex min-w-0 flex-col gap-3">
            <div className="whitespace-pre-wrap rounded-xl bg-creme p-4 text-sm leading-6 text-texto">
              {message}
            </div>

            <button
              type="button"
              onClick={shareCampaign}
              disabled={!ready}
              className="flex items-center justify-center gap-2 rounded-xl bg-rosa-profundo px-4 py-3 text-sm font-bold text-white disabled:opacity-40"
            >
              <Share2 size={17} />
              Compartilhar campanha
            </button>
            <p className="text-[11px] leading-5 text-cinza">
              O envio continua sob sua confirmação no celular.
            </p>

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              <button
                type="button"
                onClick={copyMessage}
                className="flex items-center justify-center gap-1.5 rounded-xl border border-rosa/20 px-3 py-3 text-xs font-bold text-texto"
              >
                <Copy size={15} />
                {copied ? "Copiado" : "Copiar texto"}
              </button>
              <button
                type="button"
                onClick={downloadArtwork}
                disabled={!ready}
                className="flex items-center justify-center gap-1.5 rounded-xl border border-rosa/20 px-3 py-3 text-xs font-bold text-texto disabled:opacity-40"
              >
                <Download size={15} />
                Baixar arte
              </button>
              <button
                type="button"
                onClick={openWhatsApp}
                className="col-span-2 flex items-center justify-center gap-1.5 rounded-xl border border-rosa/20 px-3 py-3 text-xs font-bold text-texto sm:col-span-1"
              >
                <ExternalLink size={15} />
                WhatsApp (texto)
              </button>
            </div>

            {shareNote ? (
              <p className="text-xs font-medium text-cinza">{shareNote}</p>
            ) : null}

            <p className="break-all text-[11px] leading-5 text-cinza">
              Link: {productUrl}
            </p>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-rosa/15 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-serif text-lg font-bold text-texto">
              Sugestões de hoje
            </h2>
            <p className="text-sm text-cinza">
              Três produtos para manter a divulgação simples e variada.
            </p>
          </div>
          <button
            type="button"
            onClick={createNewQueue}
            className="flex items-center gap-2 rounded-xl border border-rosa/20 px-3 py-2 text-xs font-bold text-texto"
          >
            <RefreshCw size={15} />
            Gerar novas sugestões
          </button>
        </div>

        <div className="mt-4 space-y-2">
          {queue.map((item, index) => {
            const queueProduct = products.find(
              (current) => current.id === item.productId
            );
            if (!queueProduct) return null;

            return (
              <div
                key={`${item.time}-${item.productId}`}
                className="flex flex-col gap-3 rounded-xl border border-rosa/10 p-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-texto">
                    {queueProduct.name}
                  </p>
                  <p className="mt-1 text-xs text-cinza">
                    <Clock3 size={12} className="mr-1 inline" />
                    {item.time} · {queueProduct.category.name} · {campaignLabel(item.kind)}
                  </p>
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => openQueueItem(item)}
                    className="rounded-lg border border-rosa/20 px-3 py-2 text-xs font-bold text-texto"
                  >
                    Abrir
                  </button>
                  <button
                    type="button"
                    onClick={() => togglePublished(index)}
                    className={`flex items-center justify-center gap-1 rounded-lg px-3 py-2 text-xs font-bold ${
                      item.done
                        ? "border border-rosa/20 text-cinza"
                        : "bg-rosa-profundo text-white"
                    }`}
                  >
                    {item.done ? (
                      <>
                        <Check size={14} /> Publicado
                      </>
                    ) : (
                      "Marcar publicado"
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
