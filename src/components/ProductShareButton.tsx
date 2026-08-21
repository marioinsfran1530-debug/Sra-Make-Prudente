"use client";

import { useState } from "react";
import { Check, Share2 } from "lucide-react";

export function ProductShareButton({
  name,
  url,
}: {
  name: string;
  url: string;
}) {
  const [copied, setCopied] = useState(false);

  async function share() {
    const text = `${name} — Sra Make Prudente`;

    if (navigator.share) {
      try {
        await navigator.share({ title: name, text, url });
        return;
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
      }
    }

    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      window.prompt("Copie o link do produto:", url);
    }
  }

  return (
    <button
      type="button"
      onClick={share}
      className="inline-flex items-center gap-1.5 rounded-full border border-rosa/20 bg-white px-3 py-2 text-xs font-bold text-rosa-profundo transition hover:bg-rosa/5"
      aria-label={`Compartilhar ${name}`}
    >
      {copied ? <Check size={14} /> : <Share2 size={14} />}
      {copied ? "Link copiado" : "Compartilhar"}
    </button>
  );
}
