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
import { AdminNotice } from "@/components/admin/AdminUx";

type ProductImage = { id: string; url: string };
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
  images: ProductImage[];
  category: { name: string };
};

type CampaignKind = "destaque" | "oferta" | "novidade";
type ArtworkFormat = "status" | "quadrado";
type ShareSource = "social" | "whatsapp" | "instagram";
type QueueItem = { time: string; productId: string; kind: CampaignKind; done: boolean };
type StoredQueue = { date: string; items: QueueItem[] };
type StoreBranding = { storeName: string; logoUrl: string | null };
type MessageProfile = { hook: string; support?: string };

type AiCopyStrategy = "beneficio" | "dor_solucao" | "curiosidade";
type AiCopyVariation = { strategy: AiCopyStrategy; hook: string; support: string };
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

const QUEUE_KEY = "sra-make-divulgacao-queue-v4";
const HISTORY_KEY = "sra-make-divulgacao-history-v4";
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
  if (product.isNew) return "novidade";
  return "destaque";
}

function campaignLabel(kind: CampaignKind) {
  if (kind === "novidade") return "Novidade";
  if (kind === "oferta") return "Oferta";
  return "Destaque";
}

function strategyLabel(strategy: AiCopyStrategy) {
  if (strategy === "beneficio") return "Desejo / Benefício";
  if (strategy === "dor_solucao") return "Dor / Solução";
  return "Curiosidade / Praticidade";
}

function isAiCopyStrategy(value: unknown): value is AiCopyStrategy {
  return value === "beneficio" || value === "dor_solucao" || value === "curiosidade";
}

function kindCode(kind: CampaignKind) {
  if (kind === "novidade") return "n";
  if (kind === "oferta") return "o";
  return "d";
}

function formatCode(format: ArtworkFormat) {
  return format === "quadrado" ? "q" : "s";
}

function sourceCode(source: ShareSource) {
  if (source === "whatsapp") return "w";
  if (source === "instagram") return "i";
  return "s";
}

function buildShortUrl(
  siteUrl: string,
  product: Product,
  kind: CampaignKind,
  format: ArtworkFormat,
  source: ShareSource = "social"
) {
  const baseUrl = siteUrl.replace(/\/$/, "");
  const code = product.id.slice(-7);
  return `${baseUrl}/r/${code}?d=${compactDate()}&k=${kindCode(kind)}&f=${formatCode(format)}&s=${sourceCode(source)}`;
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
      hook: "PREÇO ESPECIAL PARA VOCÊ",
      support: "Uma escolha prática para deixar sua rotina ainda mais completa.",
    };
  }
  if (product.bestSeller) {
    return {
      hook: "DESTAQUE DA SRA MAKE",
      support: "Um produto que merece espaço na sua rotina de beleza.",
    };
  }
  if (product.isNew) {
    return {
      hook: "NOVIDADE NA SRA MAKE",
      support: "Chegou uma nova opção para você conhecer e aproveitar.",
    };
  }
  return {
    hook: "ESCOLHA EM DESTAQUE",
    support: "Beleza, praticidade e compra fácil pelo nosso catálogo.",
  };
}

function buildMessage(product: Product, url: string, profileOverride?: MessageProfile) {
  const profile = profileOverride ?? getMessageProfile(product);
  const descriptor = usefulDescriptor(product.brand);
  const brandAlreadyInName = descriptor
    ? normalizeDescriptor(product.name).includes(normalizeDescriptor(descriptor))
    : false;
  const productDetails = [
    `💗 *${product.name}*`,
    brandAlreadyInName ? "" : descriptor,
  ]
    .filter(Boolean)
    .join("\n");
  const price = hasRealPromotion(product)
    ? `✨ ~De ${money(product.price)}~ por *${money(product.promoPrice!)}*`
    : `✨ *${money(product.price)}*`;

  return [
    `✨ *${profile.hook}*`,
    productDetails,
    profile.support?.trim() || "",
    price,
    `🛍️ *Veja no catálogo:*\n${url}`,
    "📍 Retirada ou entrega em Presidente Prudente.",
  ]
    .filter(Boolean)
    .join("\n\n");
}

function scoreProduct(product: Product, recent: Set<string>) {
  let score = 0;
  if (product.images.length || product.imageUrl) score += 8;
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
  const withImage = available.filter(
    (product) => product.images.length > 0 || Boolean(product.imageUrl)
  );
  const source = withImage.length >= TIMES.length ? withImage : available;
  const priority = source.filter(isPriorityProduct);
  if (priority.length >= SUGGESTION_POOL_MIN) return priority;

  const priorityIds = new Set(priority.map((product) => product.id));
  const fallback = source
    .filter((product) => !priorityIds.has(product.id))
    .sort((a, b) => b.stockQty - a.stockQty || b.createdAt.localeCompare(a.createdAt));

  return [
    ...priority,
    ...fallback.slice(0, Math.max(0, SUGGESTION_POOL_MIN - priority.length)),
  ];
}

function buildQueue(products: Product[], historyIds: string[], previousIds: string[] = []) {
  const recent = new Set(historyIds.slice(-12));
  const pool = buildSuggestionPool(products);
  const previous = new Set(previousIds);
  const withoutPrevious = pool.filter((product) => !previous.has(product.id));
  const candidates = withoutPrevious.length >= TIMES.length ? withoutPrevious : pool;
  const randomized = candidates
    .map((product) => ({ product, score: scoreProduct(product, recent) + Math.random() * 10 }))
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

function roundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
) {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + width, y, x + width, y + height, r);
  ctx.arcTo(x + width, y + height, x, y + height, r);
  ctx.arcTo(x, y + height, x, y, r);
  ctx.arcTo(x, y, x + width, y, r);
  ctx.closePath();
}

function coverImage(
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement,
  x: number,
  y: number,
  width: number,
  height: number
) {
  const scale = Math.max(width / image.width, height / image.height);
  const drawWidth = image.width * scale;
  const drawHeight = image.height * scale;
  ctx.drawImage(
    image,
    x + (width - drawWidth) / 2,
    y + (height - drawHeight) / 2,
    drawWidth,
    drawHeight
  );
}

function fitLines(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxLines: number
) {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (ctx.measureText(next).width > maxWidth && current) {
      lines.push(current);
      current = word;
      if (lines.length >= maxLines - 1) break;
    } else {
      current = next;
    }
  }
  if (current && lines.length < maxLines) lines.push(current);
  return lines;
}

function cleanArtText(text: string) {
  return text.replace(/[\*_~#]/g, "").replace(/^[^A-Za-zÀ-ÿ0-9]+/, "").trim();
}

async function drawArtwork(
  canvas: HTMLCanvasElement,
  product: Product,
  imageUrl: string | null,
  kind: CampaignKind,
  format: ArtworkFormat,
  branding: StoreBranding,
  profile: MessageProfile
) {
  const width = 1080;
  const height = format === "status" ? 1920 : 1080;
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const cream = "#FFF8FA";
  const blush = "#F4D9DF";
  const rose = "#B25573";
  const deep = "#8D4F5F";
  const dark = "#372D31";
  const muted = "#756A6F";

  const gradient = ctx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, "#FFF8FA");
  gradient.addColorStop(0.48, "#F8E4E8");
  gradient.addColorStop(1, "#E8BCC6");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  ctx.globalAlpha = 0.28;
  ctx.fillStyle = "#FFFFFF";
  ctx.beginPath();
  ctx.arc(width - 90, 290, 260, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(100, height - 230, 250, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;

  const margin = format === "status" ? 64 : 48;
  const topY = format === "status" ? 70 : 50;

  ctx.fillStyle = deep;
  ctx.textAlign = "left";
  ctx.font = `700 ${format === "status" ? 54 : 42}px Georgia`;
  ctx.fillText(branding.storeName || "Sra Make Prudente", margin, topY + 40);

  const badgeW = format === "status" ? 245 : 205;
  const badgeH = format === "status" ? 88 : 72;
  roundedRect(ctx, width - margin - badgeW, topY - 8, badgeW, badgeH, 28);
  ctx.fillStyle = deep;
  ctx.fill();
  ctx.fillStyle = "#FFFFFF";
  ctx.textAlign = "center";
  ctx.font = `700 ${format === "status" ? 32 : 26}px Arial`;
  ctx.fillText(campaignLabel(kind).toUpperCase(), width - margin - badgeW / 2, topY + 45);

  const artHook = cleanArtText(profile.hook || campaignLabel(kind));
  ctx.textAlign = "left";
  ctx.fillStyle = rose;
  ctx.font = `700 ${format === "status" ? 50 : 38}px Arial`;
  const hookY = format === "status" ? 220 : 150;
  const hookLines = fitLines(ctx, artHook, width - margin * 2, 2);
  hookLines.forEach((line, index) => ctx.fillText(line, margin, hookY + index * (format === "status" ? 58 : 44)));

  const imageX = margin;
  const imageY = format === "status" ? 350 : 235;
  const imageW = format === "status" ? width - margin * 2 : 520;
  const imageH = format === "status" ? 830 : 560;
  roundedRect(ctx, imageX, imageY, imageW, imageH, 40);
  ctx.fillStyle = "#FFFFFF";
  ctx.fill();
  ctx.save();
  roundedRect(ctx, imageX, imageY, imageW, imageH, 40);
  ctx.clip();
  if (imageUrl) {
    try {
      const image = await loadImage(imageUrl);
      coverImage(ctx, image, imageX, imageY, imageW, imageH);
    } catch {
      ctx.fillStyle = blush;
      ctx.fillRect(imageX, imageY, imageW, imageH);
    }
  } else {
    ctx.fillStyle = blush;
    ctx.fillRect(imageX, imageY, imageW, imageH);
  }
  ctx.restore();

  const textX = format === "status" ? margin : 610;
  let textY = format === "status" ? 1240 : 250;
  const textW = format === "status" ? width - margin * 2 : width - textX - margin;

  ctx.fillStyle = dark;
  ctx.textAlign = "left";
  ctx.font = `700 ${format === "status" ? 58 : 40}px Georgia`;
  const nameLines = fitLines(ctx, product.name, textW, format === "status" ? 3 : 4);
  nameLines.forEach((line, index) => ctx.fillText(line, textX, textY + index * (format === "status" ? 66 : 48)));
  textY += nameLines.length * (format === "status" ? 66 : 48) + 18;

  const descriptor = usefulDescriptor(product.brand);
  if (descriptor && !normalizeDescriptor(product.name).includes(normalizeDescriptor(descriptor))) {
    ctx.fillStyle = muted;
    ctx.font = `600 ${format === "status" ? 32 : 25}px Arial`;
    ctx.fillText(descriptor, textX, textY);
    textY += format === "status" ? 56 : 42;
  }

  if (profile.support) {
    ctx.fillStyle = dark;
    ctx.font = `500 ${format === "status" ? 31 : 24}px Arial`;
    const supportLines = fitLines(ctx, cleanArtText(profile.support), textW, 2);
    supportLines.forEach((line, index) =>
      ctx.fillText(line, textX, textY + index * (format === "status" ? 42 : 32))
    );
    textY += supportLines.length * (format === "status" ? 42 : 32) + 24;
  }

  if (hasRealPromotion(product)) {
    ctx.fillStyle = muted;
    ctx.font = `500 ${format === "status" ? 30 : 22}px Arial`;
    ctx.fillText(`De ${money(product.price)}`, textX, textY);
    ctx.strokeStyle = muted;
    const oldWidth = ctx.measureText(`De ${money(product.price)}`).width;
    ctx.beginPath();
    ctx.moveTo(textX, textY - 9);
    ctx.lineTo(textX + oldWidth, textY - 9);
    ctx.stroke();
    textY += format === "status" ? 50 : 36;
  }

  roundedRect(ctx, textX, textY - 8, Math.min(textW, format === "status" ? 500 : 410), format === "status" ? 118 : 94, 24);
  ctx.fillStyle = "#FFFFFF";
  ctx.fill();
  ctx.fillStyle = rose;
  ctx.font = `700 ${format === "status" ? 70 : 48}px Arial`;
  ctx.fillText(money(product.promoPrice ?? product.price), textX + 24, textY + (format === "status" ? 72 : 60));

  const benefitsY = format === "status" ? height - 300 : height - 150;
  const items = ["Compra fácil", "Retirada", "Entrega"];
  const pillGap = 18;
  const pillW = (width - margin * 2 - pillGap * 2) / 3;
  items.forEach((label, index) => {
    const x = margin + index * (pillW + pillGap);
    roundedRect(ctx, x, benefitsY, pillW, format === "status" ? 74 : 58, 22);
    ctx.fillStyle = "rgba(255,255,255,0.72)";
    ctx.fill();
    ctx.fillStyle = deep;
    ctx.textAlign = "center";
    ctx.font = `700 ${format === "status" ? 24 : 19}px Arial`;
    ctx.fillText(label, x + pillW / 2, benefitsY + (format === "status" ? 47 : 38));
  });

  const footerH = format === "status" ? 150 : 92;
  const footerY = height - footerH;
  ctx.fillStyle = deep;
  ctx.fillRect(0, footerY, width, footerH);
  ctx.fillStyle = "#FFFFFF";
  ctx.textAlign = "center";
  ctx.font = `700 ${format === "status" ? 34 : 25}px Arial`;
  ctx.fillText("VEJA NO CATÁLOGO", width / 2, footerY + (format === "status" ? 60 : 38));
  ctx.font = `500 ${format === "status" ? 25 : 18}px Arial`;
  ctx.fillText("Sra Make Prudente • Retirada ou entrega", width / 2, footerY + (format === "status" ? 105 : 68));
}

function createArtworkBlob(canvas: HTMLCanvasElement | null) {
  return new Promise<Blob | null>((resolve) => {
    if (!canvas) return resolve(null);
    canvas.toBlob(resolve, "image/png", 0.95);
  });
}

async function tryCopyText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

function replaceCampaignUrl(message: string, currentUrl: string, nextUrl: string) {
  if (!currentUrl || !nextUrl) return message;
  return message.includes(currentUrl) ? message.replace(currentUrl, nextUrl) : `${message}\n\n${nextUrl}`;
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
  const [selectedImageUrl, setSelectedImageUrl] = useState<string | null>(
    available[0]?.images[0]?.url ?? available[0]?.imageUrl ?? null
  );
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
  const productUrl = product ? buildShortUrl(siteUrl, product, kind, format, "social") : "";
  const whatsappUrl = product ? buildShortUrl(siteUrl, product, kind, format, "whatsapp") : "";
  const instagramUrl = product ? buildShortUrl(siteUrl, product, kind, format, "instagram") : "";
  const baseProfile = product ? getMessageProfile(product) : { hook: "DESTAQUE" };
  const selectedVariation =
    activeAiCopy && aiCopyResult ? aiCopyResult.variations[activeAiCopy.selectedIndex] : null;
  const artworkProfile: MessageProfile = selectedVariation
    ? { hook: selectedVariation.hook, support: selectedVariation.support }
    : baseProfile;
  const templateMessage = product ? buildMessage(product, productUrl) : "";

  useEffect(() => {
    try {
      const storedHistory = JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]") as string[];
      const storedQueue = JSON.parse(localStorage.getItem(QUEUE_KEY) || "null") as StoredQueue | null;
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
    if (queue.length) {
      localStorage.setItem(QUEUE_KEY, JSON.stringify({ date: localDateKey(), items: queue }));
    }
  }, [queue]);

  useEffect(() => {
    if (!product) return;
    setSelectedImageUrl(product.images[0]?.url ?? product.imageUrl ?? null);
  }, [product?.id]);

  useEffect(() => {
    if (!canvasRef.current || !product) return;
    setReady(false);
    drawArtwork(
      canvasRef.current,
      product,
      selectedImageUrl,
      kind,
      format,
      branding,
      artworkProfile
    )
      .then(() => setReady(true))
      .catch(() => setReady(false));
  }, [product, selectedImageUrl, kind, format, branding, artworkProfile.hook, artworkProfile.support]);

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
    }).catch(() => {});
  }

  async function copyMessage() {
    if (!messageDraft.trim()) return;
    setShareNote("");
    const success = await tryCopyText(messageDraft);
    if (!success) {
      setShareNote("Não foi possível copiar automaticamente. Selecione o texto e copie manualmente.");
      return;
    }
    markActiveAiCopyUsed();
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  async function copyLink() {
    if (!productUrl) return;
    const success = await tryCopyText(productUrl);
    if (!success) {
      setShareNote("Não foi possível copiar o link automaticamente.");
      return;
    }
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
    if (!blob) {
      setShareNote("A arte ainda não está pronta para download.");
      return;
    }
    downloadBlob(blob);
    setShareNote("Arte salva no dispositivo.");
  }

  function openWhatsApp() {
    if (!messageDraft.trim()) return;
    markActiveAiCopyUsed();
    setShareNote("");
    const whatsappMessage = replaceCampaignUrl(messageDraft, productUrl, whatsappUrl);
    window.open(
      `https://wa.me/?text=${encodeURIComponent(whatsappMessage)}`,
      "_blank",
      "noopener,noreferrer"
    );
  }

  async function shareArtwork() {
    if (!product || !ready || !messageDraft.trim()) return;
    setShareNote("");
    const blob = await createArtworkBlob(canvasRef.current);
    if (!blob) {
      setShareNote("A arte ainda não está pronta para compartilhar.");
      return;
    }

    const instagramCaption = replaceCampaignUrl(messageDraft, productUrl, instagramUrl);
    const textCopied = await tryCopyText(instagramCaption);
    const file = new File([blob], `sra-make-${product.id.slice(-7)}.png`, {
      type: "image/png",
    });

    if (navigator.share && navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({
          files: [file],
          title: product.name,
          text: instagramCaption,
          url: instagramUrl,
        });
        markActiveAiCopyUsed();
        setShareNote(
          textCopied
            ? "Arte enviada. A legenda e o link também ficaram copiados. No Instagram, cole a legenda; em Stories, adicione o link pelo adesivo de Link."
            : "Arte enviada. O Instagram pode ignorar texto e link recebidos do navegador; use o botão Copiar texto antes de publicar."
        );
        return;
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          if (textCopied) setShareNote("Compartilhamento cancelado. A legenda continua copiada.");
          return;
        }
      }
    }

    downloadBlob(blob);
    markActiveAiCopyUsed();
    setShareNote(
      textCopied
        ? "Arte salva e legenda com link copiada. Abra o Instagram, selecione a imagem e cole a legenda."
        : "Arte salva. Copie o texto da campanha antes de publicar no Instagram."
    );
  }

  function togglePublished(index: number) {
    const item = queue[index];
    if (!item) return;
    setQueue((current) =>
      current.map((entry, currentIndex) =>
        currentIndex === index ? { ...entry, done: !entry.done } : entry
      )
    );
    if (!item.done) {
      const nextHistory = [...history, item.productId].slice(-30);
      setHistory(nextHistory);
      localStorage.setItem(HISTORY_KEY, JSON.stringify(nextHistory));
    }
  }

  function generateNewSuggestions() {
    setQueue((current) =>
      buildQueue(products, history, current.map((item) => item.productId))
    );
  }

  async function generateAiCopyVariations() {
    if (!product) return;
    setMessageDraft(templateMessage);
    setActiveAiCopy(null);
    setAiCopyResult(null);
    setShareNote("");
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
        throw new Error(data.error ?? "Não foi possível gerar abordagens agora.");
      }

      const variations = (data.variations as unknown[])
        .map((entry) => {
          if (!entry || typeof entry !== "object") return null;
          const variation = entry as { strategy?: unknown; hook?: unknown; support?: unknown };
          if (
            !isAiCopyStrategy(variation.strategy) ||
            typeof variation.hook !== "string" ||
            typeof variation.support !== "string"
          ) {
            return null;
          }
          return {
            strategy: variation.strategy,
            hook: variation.hook.trim(),
            support: variation.support.trim(),
          };
        })
        .filter((entry): entry is AiCopyVariation => Boolean(entry));

      if (variations.length !== 3) {
        throw new Error("A IA não retornou as três técnicas de copy esperadas.");
      }

      setAiCopyResult({
        suggestionId: typeof data.suggestionId === "string" ? data.suggestionId : null,
        variations,
        model: typeof data.model === "string" ? data.model : "Gemini",
        promptVersion: typeof data.promptVersion === "string" ? data.promptVersion : "v1",
      });
    } catch (error) {
      setAiCopyError(
        error instanceof Error ? error.message : "Não foi possível gerar abordagens agora."
      );
    } finally {
      setAiCopyLoading(false);
    }
  }

  function selectAiVariation(variation: AiCopyVariation, index: number) {
    if (!product) return;
    const nextMessage = buildMessage(product, productUrl, {
      hook: variation.hook,
      support: variation.support,
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
            <h2 className="font-serif text-xl font-bold text-texto">Campanha completa em um clique</h2>
            <p className="mt-1 text-sm text-cinza">
              A arte e a descrição nascem juntas, com foto, preço, copy e link rastreável.
            </p>
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
              onChange={(event) => {
                setProductId(event.target.value);
                setShareNote("");
              }}
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
              <h2 className="font-serif text-lg font-bold text-texto">Campanha pronta</h2>
              <p className="text-sm text-cinza">A mesma estratégia alimenta a arte e a descrição.</p>
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

        <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(300px,460px)_1fr]">
          <div>
            <div className="rounded-2xl bg-creme p-3">
              <canvas ref={canvasRef} className="h-auto w-full rounded-xl bg-white shadow-sm" />
            </div>

            {product.images.length > 1 ? (
              <div className="mt-3 rounded-xl border border-rosa/15 bg-white p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-bold text-texto">Escolha a foto da arte</p>
                  <span className="text-[10px] text-cinza">{product.images.length} fotos cadastradas</span>
                </div>
                <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
                  {product.images.map((image, index) => {
                    const selected = selectedImageUrl === image.url;
                    return (
                      <button
                        key={image.id}
                        type="button"
                        onClick={() => {
                          setSelectedImageUrl(image.url);
                          setShareNote("");
                        }}
                        aria-label={`Usar foto ${index + 1}`}
                        className={`relative h-20 w-20 shrink-0 overflow-hidden rounded-xl border-2 bg-white bg-contain bg-center bg-no-repeat ${
                          selected ? "border-rosa-profundo" : "border-rosa/15"
                        }`}
                        style={{ backgroundImage: `url(${JSON.stringify(image.url).slice(1, -1)})` }}
                      >
                        <span className={`absolute bottom-1 right-1 rounded-full px-1.5 py-0.5 text-[9px] font-bold ${selected ? "bg-rosa-profundo text-white" : "bg-white/90 text-texto"}`}>
                          {index + 1}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : null}
          </div>

          <div className="flex min-w-0 flex-col gap-3">
            <div className="rounded-xl bg-creme p-4">
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-bold uppercase tracking-wide text-cinza">Texto da campanha</span>
                <span className="text-[10px] font-medium text-cinza">
                  {activeAiCopy ? "Copy IA · arte sincronizada" : "Modelo · arte sincronizada"}
                </span>
              </div>
              <textarea
                value={messageDraft}
                onChange={(event) => {
                  setMessageDraft(event.target.value);
                  setShareNote("");
                }}
                rows={10}
                className="w-full resize-y rounded-lg border border-rosa/10 bg-white p-3 text-sm leading-6 text-texto outline-none focus:border-rosa-profundo"
              />
            </div>

            <div className="rounded-xl border border-rosa/15 bg-white p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="flex items-center gap-1.5 text-xs font-bold text-texto">
                    <Sparkles size={14} /> Copy estratégica com IA
                  </p>
                  <p className="mt-1 text-[10px] leading-4 text-cinza">
                    Escolha uma abordagem e ela também passa a orientar o destaque visual da arte.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => void generateAiCopyVariations()}
                  disabled={aiCopyLoading}
                  className="rounded-lg border border-rosa-profundo/25 px-3 py-2 text-xs font-bold text-rosa-profundo disabled:opacity-40"
                >
                  {aiCopyLoading ? "Criando..." : aiCopyResult ? "Gerar outras" : "Gerar 3 abordagens"}
                </button>
              </div>

              {aiCopyError ? <AdminNotice tone="error" className="mt-2">{aiCopyError}</AdminNotice> : null}

              {aiCopyResult ? (
                <div className="mt-3 space-y-2">
                  {aiCopyResult.variations.map((variation, index) => {
                    const selected = activeAiCopy?.selectedIndex === index;
                    return (
                      <button
                        key={`${variation.strategy}-${index}`}
                        type="button"
                        onClick={() => selectAiVariation(variation, index)}
                        className={`block w-full rounded-xl border p-3 text-left ${selected ? "border-rosa-profundo bg-rosa/5" : "border-rosa/15 bg-creme/40"}`}
                      >
                        <span className="text-[10px] font-bold uppercase tracking-wide text-rosa-profundo">
                          {strategyLabel(variation.strategy)}
                        </span>
                        <p className="mt-1 text-sm font-bold text-texto">{variation.hook}</p>
                        <p className="mt-1 text-[11px] leading-4 text-cinza">{variation.support}</p>
                      </button>
                    );
                  })}
                  <button type="button" onClick={useTemplateMessage} className="text-[11px] font-bold text-rosa-profundo underline">
                    Voltar ao modelo automático
                  </button>
                </div>
              ) : null}
            </div>

            <div className="rounded-xl border border-rosa/15 bg-white p-3">
              <div className="mb-1 flex items-center gap-2 text-xs font-bold text-texto">
                <Link2 size={14} /> Link curto da campanha
              </div>
              <div className="flex gap-2">
                <div className="min-w-0 flex-1 truncate rounded-lg bg-creme px-3 py-2 text-xs text-cinza">{productUrl}</div>
                <button type="button" onClick={copyLink} className="rounded-lg border border-rosa/20 px-3 text-xs font-bold text-texto">
                  {linkCopied ? "Copiado" : "Copiar"}
                </button>
              </div>
            </div>

            <div className="rounded-2xl border border-rosa-profundo/15 bg-rosa/5 p-3">
              <p className="text-xs font-bold text-texto">Instagram: por que a legenda não aparece sozinha?</p>
              <p className="mt-1 text-[10px] leading-4 text-cinza">
                O compartilhamento do navegador entrega a imagem ao Instagram, mas o app pode ignorar texto e link. Agora a Central copia automaticamente a legenda completa antes de abrir o compartilhamento. No Feed/Reels, cole na legenda. Em Stories, use o adesivo “Link” com o link copiado.
              </p>
            </div>

            <button
              type="button"
              onClick={openWhatsApp}
              disabled={!messageDraft.trim()}
              className="flex items-center justify-center gap-2 rounded-xl bg-rosa-profundo px-4 py-3.5 text-sm font-bold text-white disabled:opacity-40"
            >
              <ExternalLink size={17} /> Enviar pelo WhatsApp
            </button>

            <button
              type="button"
              onClick={shareArtwork}
              disabled={!ready || !messageDraft.trim()}
              className="flex items-center justify-center gap-2 rounded-xl border border-rosa-profundo/25 bg-white px-4 py-3 text-xs font-bold text-rosa-profundo disabled:opacity-40"
            >
              <Share2 size={16} /> Instagram / Compartilhar arte + copiar legenda
            </button>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={copyMessage}
                disabled={!messageDraft.trim()}
                className="flex items-center justify-center gap-1.5 rounded-xl border border-rosa/20 px-3 py-3 text-xs font-bold text-texto disabled:opacity-40"
              >
                <Copy size={15} /> {copied ? "Copiado" : "Copiar texto"}
              </button>
              <button
                type="button"
                onClick={downloadArtwork}
                disabled={!ready}
                className="flex items-center justify-center gap-1.5 rounded-xl border border-rosa/20 px-3 py-3 text-xs font-bold text-texto disabled:opacity-40"
              >
                <Download size={15} /> Baixar arte
              </button>
            </div>

            {shareNote ? <AdminNotice tone="info">{shareNote}</AdminNotice> : null}
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-rosa/15 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-serif text-lg font-bold text-texto">Sugestões de hoje</h2>
            <p className="text-sm text-cinza">
              Três produtos variados, priorizando imagem, estoque, novidade, destaque, mais vendidos e promoção real.
            </p>
          </div>
          <button
            type="button"
            onClick={generateNewSuggestions}
            className="flex items-center gap-2 rounded-xl border border-rosa/20 px-3 py-2 text-xs font-bold text-texto"
          >
            <RefreshCw size={15} /> Gerar novas sugestões
          </button>
        </div>

        <div className="mt-4 space-y-2">
          {queue.map((item, index) => {
            const queueProduct = products.find((current) => current.id === item.productId);
            if (!queueProduct) return null;
            return (
              <div key={`${item.time}-${item.productId}`} className="flex flex-col gap-3 rounded-xl border border-rosa/10 p-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-texto">{queueProduct.name}</p>
                  <p className="mt-1 text-xs text-cinza">
                    <Clock3 size={12} className="mr-1 inline" />
                    {item.time} · {queueProduct.category.name} · {campaignLabel(item.kind)}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setProductId(item.productId);
                      setProductQuery("");
                      setFormat("status");
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                    className="rounded-lg border border-rosa/20 px-3 py-2 text-xs font-bold text-texto"
                  >
                    Abrir
                  </button>
                  <button
                    type="button"
                    onClick={() => togglePublished(index)}
                    className={`flex items-center justify-center gap-1 rounded-lg px-3 py-2 text-xs font-bold ${
                      item.done ? "border border-rosa/20 text-cinza" : "bg-rosa-profundo text-white"
                    }`}
                  >
                    {item.done ? <><Check size={14} /> Publicado</> : "Marcar publicado"}
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
