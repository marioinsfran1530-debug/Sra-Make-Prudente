"use client";

import { useState } from "react";
import { Check, Share2 } from "lucide-react";

function fileExtension(type: string) {
  if (type.includes("png")) return "png";
  if (type.includes("webp")) return "webp";
  if (type.includes("gif")) return "gif";
  return "jpg";
}

function safeFileName(value: string) {
  const normalized = value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return normalized || "produto-sra-make";
}

export function ProductShareButton({
  name,
  url,
  imageUrl,
}: {
  name: string;
  url: string;
  imageUrl?: string | null;
}) {
  const [copied, setCopied] = useState(false);
  const [sharing, setSharing] = useState(false);

  async function getImageFile() {
    if (!imageUrl) return null;

    const response = await fetch(imageUrl, { cache: "no-store" });
    if (!response.ok) throw new Error("Não foi possível carregar a imagem para compartilhamento.");

    const blob = await response.blob();
    if (!blob.type.startsWith("image/")) return null;

    return new File(
      [blob],
      `${safeFileName(name)}.${fileExtension(blob.type)}`,
      { type: blob.type, lastModified: Date.now() },
    );
  }

  async function share() {
    if (sharing) return;

    const text = `${name} — Sra Make Prudente`;
    setSharing(true);

    try {
      if (navigator.share) {
        if (imageUrl && navigator.canShare) {
          try {
            const imageFile = await getImageFile();

            if (imageFile && navigator.canShare({ files: [imageFile] })) {
              await navigator.share({
                title: name,
                text: `${text}\n${url}`,
                files: [imageFile],
              });
              return;
            }
          } catch (error) {
            if (error instanceof DOMException && error.name === "AbortError") return;
            // Se o navegador/app não aceitar imagem, seguimos para texto + link.
          }
        }

        try {
          await navigator.share({ title: name, text, url });
          return;
        } catch (error) {
          if (error instanceof DOMException && error.name === "AbortError") return;
        }
      }

      try {
        await navigator.clipboard.writeText(`${text}\n${url}`);
        setCopied(true);
        setTimeout(() => setCopied(false), 1600);
      } catch {
        window.prompt("Copie o link do produto:", url);
      }
    } finally {
      setSharing(false);
    }
  }

  return (
    <button
      type="button"
      onClick={share}
      disabled={sharing}
      className="inline-flex items-center gap-1.5 rounded-full border border-rosa/20 bg-white px-3 py-2 text-xs font-bold text-rosa-profundo transition hover:bg-rosa/5 disabled:cursor-wait disabled:opacity-70"
      aria-label={`Compartilhar ${name}`}
    >
      {copied ? <Check size={14} /> : <Share2 size={14} />}
      {sharing ? "Preparando..." : copied ? "Link copiado" : "Compartilhar"}
    </button>
  );
}
