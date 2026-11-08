"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function ReverseEntryButton({ entryId }: { entryId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function reverse() {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`/api/admin/stock-entries/${entryId}/reverse`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Não foi possível estornar a entrada.");
      setOpen(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível estornar a entrada.");
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-lg border border-red-200 px-3 py-1.5 text-[11px] font-bold text-red-600"
      >
        Estornar
      </button>
    );
  }

  return (
    <div className="mt-2 w-full rounded-xl border border-red-100 bg-red-50/60 p-3">
      <p className="text-xs font-bold text-red-700">Estornar esta entrada?</p>
      <p className="mt-1 text-[11px] leading-4 text-red-700/80">
        O estoque dos itens volta ao que era antes. O custo do produto também volta, se ninguém o alterou depois.
        Só funciona se as unidades ainda estiverem no estoque.
      </p>
      <input
        value={note}
        maxLength={200}
        onChange={(event) => setNote(event.target.value)}
        placeholder="Motivo (opcional)"
        aria-label="Motivo do estorno"
        className="mt-2 w-full rounded-lg border border-red-200 bg-white px-3 py-2 text-xs"
      />
      {error && (
        <p role="alert" className="mt-2 text-[11px] font-semibold text-red-700">
          {error}
        </p>
      )}
      <div className="mt-2 flex gap-2">
        <button
          type="button"
          onClick={reverse}
          disabled={busy}
          className="rounded-lg bg-red-600 px-3 py-2 text-[11px] font-extrabold text-white disabled:opacity-50"
        >
          {busy ? "Estornando..." : "Confirmar estorno"}
        </button>
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            setError("");
          }}
          className="rounded-lg border border-red-200 bg-white px-3 py-2 text-[11px] font-bold text-red-700"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}
