"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const STATUSES: { value: string; label: string }[] = [
  { value: "NOVO", label: "Novo" },
  { value: "EM_CONFIRMACAO", label: "Em confirmação" },
  { value: "CONFIRMADO", label: "Confirmado" },
  { value: "SEPARANDO", label: "Separando" },
  { value: "PRONTO_RETIRADA", label: "Pronto para retirada" },
  { value: "SAIU_ENTREGA", label: "Saiu para entrega" },
  { value: "FINALIZADO", label: "Finalizado" },
  { value: "CANCELADO", label: "Cancelado" },
];

export function OrderStatusControl({ orderId, status }: { orderId: string; status: string }) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [value, setValue] = useState(status);
  const [error, setError] = useState<string | null>(null);

  async function handleChange(newStatus: string) {
    setError(null);

    if (newStatus === "CONFIRMADO") {
      const ok = window.confirm(
        "Confirmar este pedido vai descontar o estoque dos produtos agora. Continuar?"
      );
      if (!ok) return;
    }
    if (newStatus === "CANCELADO" && (status === "CONFIRMADO" || status === "SEPARANDO" || status === "PRONTO_RETIRADA" || status === "SAIU_ENTREGA")) {
      const ok = window.confirm(
        "Cancelar este pedido vai devolver o estoque descontado na confirmação. Continuar?"
      );
      if (!ok) return;
    }

    setSaving(true);
    const res = await fetch(`/api/admin/orders/${orderId}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    const data = await res.json();

    if (!res.ok) {
      setError(data.error ?? "Não foi possível atualizar o pedido.");
      setSaving(false);
      return;
    }

    setValue(newStatus);
    setSaving(false);
    router.refresh();
  }

  return (
    <div>
      <p className="text-xs font-bold text-texto mb-2">Status do pedido</p>
      <select
        value={value}
        disabled={saving}
        onChange={(e) => handleChange(e.target.value)}
        className="w-full rounded-xl border border-rosa/20 px-3 py-2 text-sm"
      >
        {STATUSES.map((s) => (
          <option key={s.value} value={s.value}>
            {s.label}
          </option>
        ))}
      </select>
      {error && <p className="text-xs text-vermelho mt-2">{error}</p>}
      {value === "CONFIRMADO" && (
        <p className="text-[11px] text-cinza mt-2">
          Estoque já descontado na confirmação deste pedido.
        </p>
      )}
    </div>
  );
}
