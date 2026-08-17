"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, XCircle } from "lucide-react";

const STATUSES: { value: string; label: string }[] = [
  { value: "NOVO", label: "Novo" },
  { value: "CONFIRMADO", label: "Confirmado" },
  { value: "SEPARANDO", label: "Separando" },
  { value: "PRONTO_RETIRADA", label: "Pronto para retirada" },
  { value: "SAIU_ENTREGA", label: "Saiu para entrega" },
  { value: "FINALIZADO", label: "Finalizado" },
  { value: "CANCELADO", label: "Cancelado" },
];

export function OrderStatusControl({
  orderId,
  status,
}: {
  orderId: string;
  status: string;
}) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [value, setValue] = useState(status);
  const [error, setError] = useState<string | null>(null);

  const closed =
    value === "FINALIZADO" ||
    value === "CANCELADO";

  async function handleChange(newStatus: string) {
    setError(null);

    if (closed) return;

    if (newStatus === value) return;

    if (newStatus === "CONFIRMADO") {
      const ok = window.confirm(
        "Confirmar este pedido vai descontar o estoque dos produtos. Continuar?"
      );

      if (!ok) return;
    }

    if (newStatus === "FINALIZADO") {
      const ok = window.confirm(
        "Finalizar este pedido encerra definitivamente a venda e lança o valor como vendido no Dashboard. Deseja finalizar?"
      );

      if (!ok) return;
    }

    if (newStatus === "CANCELADO") {
      const ok = window.confirm(
        "Cancelar este pedido encerra definitivamente o pedido. Se o estoque já foi descontado, ele será devolvido. Deseja cancelar?"
      );

      if (!ok) return;
    }

    setSaving(true);

    try {
      const res = await fetch(
        `/api/admin/orders/${orderId}/status`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            status: newStatus,
          }),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        setError(
          data.error ??
            "Não foi possível atualizar o pedido."
        );
        return;
      }

      setValue(newStatus);
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  if (closed) {
    const finalized = value === "FINALIZADO";

    return (
      <div
        className={`rounded-xl p-4 ${
          finalized
            ? "bg-green-50 border border-green-200"
            : "bg-red-50 border border-red-200"
        }`}
      >
        <div className="flex items-center gap-2">
          {finalized ? (
            <CheckCircle2
              size={19}
              className="text-green-700"
            />
          ) : (
            <XCircle
              size={19}
              className="text-red-700"
            />
          )}

          <div>
            <p
              className={`text-sm font-bold ${
                finalized
                  ? "text-green-700"
                  : "text-red-700"
              }`}
            >
              {finalized
                ? "Venda finalizada"
                : "Pedido cancelado"}
            </p>

            <p className="text-[11px] text-cinza mt-0.5">
              Este pedido foi encerrado e não pode mais ser alterado.
            </p>
          </div>
        </div>

        {error && (
          <p className="text-xs text-red-600 mt-2">
            {error}
          </p>
        )}
      </div>
    );
  }

  return (
    <div>
      <p className="text-xs font-bold text-texto mb-2">
        Status do pedido
      </p>

      <select
        value={value}
        disabled={saving}
        onChange={(e) =>
          handleChange(e.target.value)
        }
        className="w-full rounded-xl border border-rosa/20 px-3 py-2 text-sm bg-white disabled:opacity-50"
      >
        {STATUSES.map((statusOption) => (
          <option
            key={statusOption.value}
            value={statusOption.value}
          >
            {statusOption.label}
          </option>
        ))}
      </select>

      {saving && (
        <p className="text-[11px] text-cinza mt-2">
          Atualizando pedido...
        </p>
      )}

      {error && (
        <p className="text-xs text-red-600 mt-2">
          {error}
        </p>
      )}
    </div>
  );
}
