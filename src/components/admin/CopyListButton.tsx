"use client";

import { useState } from "react";

// Copia a lista de compras como texto simples, pronta para colar no WhatsApp
// ou em um pedido de fornecedor.
export function CopyListButton({ text, disabled }: { text: string; disabled?: boolean }) {
  const [state, setState] = useState<"idle" | "ok" | "error">("idle");

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setState("ok");
    } catch {
      setState("error");
    }
    window.setTimeout(() => setState("idle"), 2500);
  }

  return (
    <button
      type="button"
      onClick={() => void copy()}
      disabled={disabled}
      className="rounded-xl border border-rosa-profundo bg-white px-4 py-2.5 text-xs font-extrabold text-rosa-profundo disabled:opacity-40"
    >
      {state === "ok" ? "Lista copiada ✓" : state === "error" ? "Não foi possível copiar" : "Copiar lista de compras"}
    </button>
  );
}
