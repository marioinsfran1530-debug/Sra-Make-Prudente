"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Check,
  Clock3,
  Copy,
  Download,
  ExternalLink,
  ImageIcon,
  Megaphone,
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

type Template = "oferta" | "novidade" | "ultimas";
type ArtworkFormat = "status" | "quadrado";

type QueueItem = {
  time: string;
  productId: string;
  template: Template;
  done: boolean;
};

type StoreBranding = {
  storeName: string;
  logoUrl: string | null;
};

const QUEUE_KEY = "sra-make-divulgacao-queue-v1";
const HISTORY_KEY = "sra-make-divulgacao-history-v1";
const TIMES = ["09:00", "12:00", "15:00", "18:00", "20:00"];

function money(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function buildMessage(product: Product, template: Template, productUrl: string) {
  const headline = template === "novidade" ? "✨ NOVIDADE NA SRA MAKE" : template === "ultimas" ? "⚠️ ÚLTIMAS UNIDADES" : "🔥 OFERTA SRA MAKE";
  const priceBlock = product.promoPrice ? `De ${money(product.price)}\nPor *${money(product.promoPrice)}*` : `Por *${money(product.price)}*`;
  const urgency = template === "ultimas" ? `Restam ${product.stockQty} unidade${product.stockQty === 1 ? "" : "s"}.` : template === "novidade" ? "Chegou novidade por aqui." : "Aproveite enquanto temos estoque.";

  return [
    headline,
    "",
    `💄 *${product.name}*`,
    product.brand || "",
    "",
    priceBlock,
    "",
    urgency,
    "",
    `🛒 Veja no catálogo:\n${productUrl}`,
    "",
    "📍 Sra Make Prudente",
    "Retirada ou entrega em Presidente Prudente.",
  ].filter(Boolean).join("\n");
}

function pickTemplate(product: Product): Template {
  if (product.stockQty <= 5) return "ultimas";
  if (product.isNew) return "novidade";
  return "oferta";
}

function scoreProduct(product: Product, recentIds: Set<string>) {
  let score = 0;
  if (product.promoPrice) score += 6;
  if (product.isNew) score += 5;
  if (product.featured) score += 4;
  if (product.bestSeller) score += 3;
  if (product.stockQty >= 10) score += 2;
  if (product.stockQty <= 5) score += 3;
  if (recentIds.has(product.id)) score -= 20;
  return score;
}

function buildQueue(products: Product[], recentIds: string[]): QueueItem[] {
  const recent = new Set(recentIds.slice(-12));
  const sorted = products
    .filter((product) => product.active && product.stockQty > 0)
    .sort((a, b) => scoreProduct(b, recent) - scoreProduct(a, recent));

  const chosen: Product[] = [];
  const usedCategories = new Set<string>();

  for (const product of sorted) {
    if (chosen.length >= TIMES.length) break;
    if (!usedCategories.has(product.category.name) || chosen.length >= 3) {
      chosen.push(product);
      usedCategories.add(product.category.name);
    }
  }

  for (const product of sorted) {
    if (chosen.length >= TIMES.length) break;
    if (!chosen.some((item) => item.id === product.id)) chosen.push(product);
  }

  return chosen.map((product, index) => ({ time: TIMES[index], productId: product.id, template: pickTemplate(product), done: false }));
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

function drawCover(ctx: CanvasRenderingContext2D, image: HTMLImageElement, x: number, y: number, width: number, height: number) {
  const scale = Math.max(width / image.width, height / image.height);
  const drawWidth = image.width * scale;
  const drawHeight = image.height * scale;
  ctx.drawImage(image, x + (width - drawWidth) / 2, y + (height - drawHeight) / 2, drawWidth, drawHeight);
}

function wrappedLines(ctx: CanvasRenderingContext2D, text: string, maxWidth: number) {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (ctx.measureText(next).width > maxWidth && current) {
      lines.push(current);
      current = word;
    } else current = next;
  }
  if (current) lines.push(current);
  return lines;
}

async function drawArtwork(canvas: HTMLCanvasElement, product: Product, template: Template, format: ArtworkFormat, branding: StoreBranding) {
  const width = 1080;
  const height = format === "status" ? 1920 : 1080;
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const pink = "#E0C0C0";
  const dark = "#333333";
  const cream = "#FFF8F5";
  const deep = "#8D4F5F";

  ctx.fillStyle = cream;
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = pink;
  ctx.fillRect(0, 0, width, Math.round(height * 0.19));
  ctx.fillStyle = deep;
  ctx.fillRect(0, height - 150, width, 150);

  const badge = template === "novidade" ? "NOVIDADE" : template === "ultimas" ? "ÚLTIMAS UNIDADES" : "OFERTA";
  ctx.fillStyle = "#FFFFFF";
  ctx.font = "700 46px Arial";
  ctx.textAlign = "center";
  ctx.fillText(badge, width / 2, 105);
  ctx.font = "700 58px Georgia";
  ctx.fillStyle = dark;
  ctx.fillText(branding.storeName || "Sra Make Prudente", width / 2, 180);

  const imageTop = Math.round(height * 0.22);
  const imageHeight = format === "status" ? 740 : 430;
  const imageX = 90;
  const imageWidth = width - 180;
  ctx.fillStyle = "#FFFFFF";
  ctx.fillRect(imageX, imageTop, imageWidth, imageHeight);

  if (product.imageUrl) {
    try {
      const image = await loadImage(product.imageUrl);
      drawCover(ctx, image, imageX, imageTop, imageWidth, imageHeight);
    } catch {
      ctx.fillStyle = "#8D8D8D";
      ctx.font = "500 34px Arial";
      ctx.fillText("Foto do produto", width / 2, imageTop + imageHeight / 2);
    }
  } else {
    ctx.fillStyle = "#8D8D8D";
    ctx.font = "500 34px Arial";
    ctx.fillText("Produto sem foto cadastrada", width / 2, imageTop + imageHeight / 2);
  }

  const textTop = imageTop + imageHeight + 70;
  ctx.textAlign = "left";
  ctx.fillStyle = dark;
  ctx.font = "700 58px Georgia";
  const nameLines = wrappedLines(ctx, product.name, width - 180).slice(0, 3);
  nameLines.forEach((line, index) => ctx.fillText(line, 90, textTop + index * 68));

  let cursor = textTop + nameLines.length * 68 + 18;
  if (product.brand) {
    ctx.font = "500 34px Arial";
    ctx.fillStyle = "#666666";
    ctx.fillText(product.brand, 90, cursor);
    cursor += 70;
  }

  if (product.promoPrice) {
    ctx.font = "500 34px Arial";
    ctx.fillStyle = "#777777";
    ctx.fillText(`De ${money(product.price)}`, 90, cursor);
    cursor += 60;
  }

  ctx.fillStyle = deep;
  ctx.font = "700 82px Arial";
  ctx.fillText(money(product.promoPrice ?? product.price), 90, cursor);
  cursor += 85;

  ctx.font = "700 30px Arial";
  ctx.fillStyle = dark;
  const urgency = template === "ultimas" ? `Só ${product.stockQty} unidade${product.stockQty === 1 ? "" : "s"} em estoque` : template === "novidade" ? "Acabou de chegar na Sra Make" : "Aproveite enquanto temos estoque";
  ctx.fillText(urgency, 90, cursor);

  ctx.fillStyle = "#FFFFFF";
  ctx.font = "700 32px Arial";
  ctx.textAlign = "center";
  ctx.fillText("Peça pelo catálogo • Retirada ou entrega", width / 2, height - 92);
}

export function PromotionCenter({ products, branding }: { products: Product[]; branding: StoreBranding }) {
  const availableProducts = useMemo(() => products.filter((product) => product.active && product.stockQty > 0), [products]);
  const [productId, setProductId] = useState(availableProducts[0]?.id ?? "");
  const [template, setTemplate] = useState<Template>("oferta");
  const [copied, setCopied] = useState(false);
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [history, setHistory] = useState<string[]>([]);
  const [format, setFormat] = useState<ArtworkFormat>("status");
  const [artworkReady, setArtworkReady] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    try {
      const savedHistory = JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]") as string[];
      const savedQueue = JSON.parse(localStorage.getItem(QUEUE_KEY) || "[]") as QueueItem[];
      setHistory(savedHistory);
      setQueue(savedQueue.length ? savedQueue : buildQueue(products, savedHistory));
    } catch {
      setQueue(buildQueue(products, []));
    }
  }, [products]);

  useEffect(() => {
    if (queue.length) localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  }, [queue]);

  const product = availableProducts.find((item) => item.id === productId);
  const origin = typeof window === "undefined" ? "" : window.location.origin;
  const productUrl = product ? `${origin}/produto/${product.id}?utm_source=whatsapp&utm_medium=organic&utm_campaign=central_divulgacao` : "";
  const message = product ? buildMessage(product, template, productUrl) : "";

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !product) return;
    setArtworkReady(false);
    drawArtwork(canvas, product, template, format, branding).then(() => setArtworkReady(true));
  }, [product, template, format, branding]);

  function regenerateQueue() {
    setQueue(buildQueue(products, history));
  }

  function openQueueItem(item: QueueItem) {
    setProductId(item.productId);
    setTemplate(item.template);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function markDone(index: number) {
    const item = queue[index];
    if (!item) return;
    setQueue((current) => current.map((row, rowIndex) => rowIndex === index ? { ...row, done: !row.done } : row));
    if (!item.done) {
      const nextHistory = [...history, item.productId].slice(-30);
      setHistory(nextHistory);
      localStorage.setItem(HISTORY_KEY, JSON.stringify(nextHistory));
    }
  }

  async function copyMessage() {
    if (!message) return;
    await navigator.clipboard.writeText(message);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  async function shareMessage() {
    if (!product || !message) return;
    if (navigator.share) {
      try {
        await navigator.share({ title: product.name, text: message, url: productUrl });
        return;
      } catch {}
    }
    await copyMessage();
  }

  function openWhatsApp() {
    if (!message) return;
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, "_blank", "noopener,noreferrer");
  }

  function canvasBlob() {
    return new Promise<Blob | null>((resolve) => canvasRef.current?.toBlob(resolve, "image/png", 0.95));
  }

  async function downloadArtwork() {
    if (!product || !artworkReady) return;
    const blob = await canvasBlob();
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `sra-make-${product.name.toLowerCase().replace(/[^a-z0-9]+/gi, "-")}-${format}.png`;
    link.click();
    URL.revokeObjectURL(url);
  }

  async function shareArtwork() {
    if (!product || !artworkReady) return;
    const blob = await canvasBlob();
    if (!blob) return;
    const file = new File([blob], `sra-make-${product.id}.png`, { type: "image/png" });
    if (navigator.share && navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: product.name, text: message });
        return;
      } catch {}
    }
    await downloadArtwork();
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(320px,0.85fr)]">
        <section className="rounded-2xl border border-rosa/15 bg-white p-5 shadow-sm">
          <div className="mb-5 flex items-start gap-3">
            <div className="rounded-xl bg-rosa/10 p-2.5 text-rosa-profundo"><Megaphone size={20} /></div>
            <div><h2 className="font-serif text-lg font-bold text-texto">Criar divulgação</h2><p className="mt-1 text-sm text-cinza">Escolha um produto ou abra uma sugestão da fila do dia.</p></div>
          </div>
          {availableProducts.length === 0 ? <div className="rounded-xl border border-dashed border-rosa/25 bg-creme p-5 text-sm text-cinza">Nenhum produto ativo com estoque disponível para divulgar.</div> : (
            <div className="space-y-5">
              <label className="block"><span className="mb-2 block text-xs font-bold uppercase tracking-wide text-cinza">Produto</span><select value={productId} onChange={(event) => setProductId(event.target.value)} className="w-full rounded-xl border border-rosa/20 bg-white px-3 py-3 text-sm text-texto outline-none focus:border-rosa-profundo">{availableProducts.map((item) => <option key={item.id} value={item.id}>{item.name} — {item.category.name} — {item.stockQty} em estoque</option>)}</select></label>
              <div><span className="mb-2 block text-xs font-bold uppercase tracking-wide text-cinza">Modelo</span><div className="grid grid-cols-3 gap-2">{([["oferta", "Oferta"], ["novidade", "Novidade"], ["ultimas", "Últimas unidades"]] as const).map(([value, label]) => <button key={value} type="button" onClick={() => setTemplate(value)} className={`rounded-xl border px-3 py-2.5 text-xs font-bold transition ${template === value ? "border-rosa-profundo bg-rosa-profundo text-white" : "border-rosa/20 bg-white text-cinza hover:bg-creme"}`}>{label}</button>)}</div></div>
              {product && <div className="grid grid-cols-2 gap-3 rounded-xl bg-creme p-4 text-sm"><div><p className="text-xs text-cinza">Preço</p><p className="font-bold text-texto">{money(product.promoPrice ?? product.price)}</p></div><div><p className="text-xs text-cinza">Estoque</p><p className="font-bold text-texto">{product.stockQty} un.</p></div></div>}
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-rosa/15 bg-white p-5 shadow-sm">
          <h2 className="font-serif text-lg font-bold text-texto">Prévia da mensagem</h2><p className="mt-1 text-sm text-cinza">Revise antes de compartilhar.</p>
          <div className="mt-4 min-h-[320px] whitespace-pre-wrap rounded-2xl border border-rosa/15 bg-creme p-4 text-sm leading-6 text-texto">{message || "Selecione um produto para gerar a divulgação."}</div>
          <div className="mt-4 grid gap-2 sm:grid-cols-3">
            <button type="button" disabled={!message} onClick={copyMessage} className="flex items-center justify-center gap-2 rounded-xl border border-rosa/20 px-3 py-3 text-xs font-bold text-rosa-profundo hover:bg-creme disabled:opacity-40">{copied ? <Check size={16} /> : <Copy size={16} />}{copied ? "Copiado" : "Copiar"}</button>
            <button type="button" disabled={!message} onClick={shareMessage} className="flex items-center justify-center gap-2 rounded-xl border border-rosa/20 px-3 py-3 text-xs font-bold text-rosa-profundo hover:bg-creme disabled:opacity-40"><Share2 size={16} /> Compartilhar</button>
            <button type="button" disabled={!message} onClick={openWhatsApp} className="flex items-center justify-center gap-2 rounded-xl bg-rosa-profundo px-3 py-3 text-xs font-bold text-white hover:opacity-90 disabled:opacity-40"><ExternalLink size={16} /> WhatsApp</button>
          </div>
          <p className="mt-3 text-[11px] leading-4 text-cinza">A publicação continua sob confirmação humana. Nenhum robô acessa a conta da loja.</p>
        </section>
      </div>

      <section className="rounded-2xl border border-rosa/15 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-start gap-3"><div className="rounded-xl bg-rosa/10 p-2.5 text-rosa-profundo"><ImageIcon size={20} /></div><div><h2 className="font-serif text-lg font-bold text-texto">Arte automática</h2><p className="mt-1 text-sm text-cinza">O catálogo monta o criativo usando foto, preço e identidade da loja.</p></div></div>
          <div className="flex gap-2">{(["status", "quadrado"] as const).map((value) => <button key={value} type="button" onClick={() => setFormat(value)} className={`rounded-xl border px-3 py-2 text-xs font-bold ${format === value ? "border-rosa-profundo bg-rosa-profundo text-white" : "border-rosa/20 text-rosa-profundo"}`}>{value === "status" ? "Status 9:16" : "Quadrado 1:1"}</button>)}</div>
        </div>
        <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(260px,420px)_1fr]">
          <div className="overflow-hidden rounded-2xl border border-rosa/15 bg-creme p-3"><canvas ref={canvasRef} className="h-auto w-full rounded-xl bg-white" /></div>
          <div className="flex flex-col justify-center gap-3">
            <p className="text-sm text-cinza">A arte é criada no próprio navegador, sem Canva e sem serviço pago. Se a foto externa não permitir uso no canvas, o sistema mantém o card com um espaço reservado em vez de falhar.</p>
            <button type="button" onClick={downloadArtwork} disabled={!product || !artworkReady} className="flex items-center justify-center gap-2 rounded-xl border border-rosa/20 px-4 py-3 text-xs font-bold text-rosa-profundo hover:bg-creme disabled:opacity-40"><Download size={16} /> Baixar PNG</button>
            <button type="button" onClick={shareArtwork} disabled={!product || !artworkReady} className="flex items-center justify-center gap-2 rounded-xl bg-rosa-profundo px-4 py-3 text-xs font-bold text-white hover:opacity-90 disabled:opacity-40"><Share2 size={16} /> Compartilhar arte</button>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-rosa/15 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-start gap-3"><div className="rounded-xl bg-rosa/10 p-2.5 text-rosa-profundo"><Sparkles size={20} /></div><div><h2 className="font-serif text-lg font-bold text-texto">Fila sugerida de hoje</h2><p className="mt-1 text-sm text-cinza">Prioriza promoções, novidades, destaques e estoque, evitando repetir produtos recentes.</p></div></div>
          <button type="button" onClick={regenerateQueue} className="flex items-center gap-2 rounded-xl border border-rosa/20 px-3 py-2.5 text-xs font-bold text-rosa-profundo hover:bg-creme"><RefreshCw size={15} /> Gerar nova fila</button>
        </div>
        <div className="mt-5 grid gap-3">
          {queue.length === 0 ? <div className="rounded-xl border border-dashed border-rosa/25 bg-creme p-5 text-sm text-cinza">Não há produtos suficientes para montar a fila de hoje.</div> : queue.map((item, index) => {
            const queueProduct = products.find((row) => row.id === item.productId);
            if (!queueProduct) return null;
            return <div key={`${item.time}-${item.productId}`} className={`flex flex-col gap-3 rounded-xl border p-4 sm:flex-row sm:items-center sm:justify-between ${item.done ? "border-rosa/10 bg-creme opacity-70" : "border-rosa/15 bg-white"}`}>
              <div className="flex min-w-0 items-start gap-3"><div className="flex shrink-0 items-center gap-1 rounded-lg bg-creme px-2.5 py-2 text-xs font-bold text-texto"><Clock3 size={14} /> {item.time}</div><div className="min-w-0"><p className={`truncate text-sm font-bold text-texto ${item.done ? "line-through" : ""}`}>{queueProduct.name}</p><p className="mt-0.5 text-xs text-cinza">{queueProduct.category.name} · {item.template === "ultimas" ? "Últimas unidades" : item.template === "novidade" ? "Novidade" : "Oferta"} · {queueProduct.stockQty} un.</p></div></div>
              <div className="flex gap-2"><button type="button" onClick={() => openQueueItem(item)} className="rounded-lg border border-rosa/20 px-3 py-2 text-xs font-bold text-rosa-profundo hover:bg-creme">Abrir</button><button type="button" onClick={() => markDone(index)} className={`rounded-lg px-3 py-2 text-xs font-bold ${item.done ? "border border-rosa/20 text-rosa-profundo" : "bg-rosa-profundo text-white"}`}>{item.done ? "Desmarcar" : "Publicado"}</button></div>
            </div>;
          })}
        </div>
      </section>
    </div>
  );
}
