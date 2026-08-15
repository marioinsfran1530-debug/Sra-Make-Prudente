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

  async function handleChange(newStatus: string) {
    if (newStatus === "CONFIRMADO") {
      const ok = window.confirm(
        "A confirmação com desconto automático de estoque será ativada na Fase 6. Por enquanto isso só marca o status. Continuar?"
      );
      if (!ok) return;
    }
    setSaving(true);
    setValue(newStatus);
    await fetch(`/api/admin/orders/${orderId}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
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
    </div>
  );
}
