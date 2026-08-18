"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  XCircle,
} from "lucide-react";

const STATUS_LABEL: Record<string, string> = {
  NOVO: "Novo",
  EM_CONFIRMACAO: "Em confirmação",
  CONFIRMADO: "Confirmado",
  SEPARANDO: "Separando",
  PRONTO_RETIRADA: "Pronto para retirada",
  SAIU_ENTREGA: "Saiu para entrega",
  FINALIZADO: "Finalizado",
  CANCELADO: "Cancelado",
};

function getAllowedStatuses(
  status: string
): string[] {
  switch (status) {
    case "NOVO":
      return [
        "CONFIRMADO",
        "CANCELADO",
      ];

    case "CONFIRMADO":
      return [
        "FINALIZADO",
        "CANCELADO",
      ];

    // Compatibilidade com pedidos antigos
    case "EM_CONFIRMACAO":
      return [
        "CONFIRMADO",
        "CANCELADO",
      ];

    case "SEPARANDO":
    case "PRONTO_RETIRADA":
    case "SAIU_ENTREGA":
      return [
        "FINALIZADO",
        "CANCELADO",
      ];

    default:
      return [];
  }
}

export function OrderStatusControl({
  orderId,
  status,
}: {
  orderId: string;
  status: string;
}) {
  const router = useRouter();

  const [saving, setSaving] =
    useState(false);

  const [value, setValue] =
    useState(status);

  const [error, setError] =
    useState<string | null>(null);

  const closed =
    value === "FINALIZADO" ||
    value === "CANCELADO";

  const visibleStatuses =
    getAllowedStatuses(value);

  async function handleChange(
    newStatus: string
  ) {
    setError(null);

    if (closed) return;

    if (newStatus === value) return;

    if (newStatus === "CONFIRMADO") {
      const ok = window.confirm(
        "Confirmar este pedido vai baixar o estoque dos produtos. Deseja continuar?"
      );

      if (!ok) return;
    }

    if (newStatus === "FINALIZADO") {
      const ok = window.confirm(
        "Finalizar este pedido confirma a venda e lança o valor no Dashboard. Deseja continuar?"
      );

      if (!ok) return;
    }

    if (newStatus === "CANCELADO") {
      const ok = window.confirm(
        "Cancelar este pedido encerrará a operação. Se o estoque já tiver sido baixado, ele será devolvido. Deseja continuar?"
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
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            status: newStatus,
          }),
        }
      );

      const data =
        await res.json();

      if (!res.ok) {
        setError(
          data.error ??
            "Não foi possível atualizar o pedido."
        );
        return;
      }

      setValue(newStatus);

      router.refresh();
    } catch {
      setError(
        "Não foi possível atualizar o pedido."
      );
    } finally {
      setSaving(false);
    }
  }

  if (closed) {
    const finalized =
      value === "FINALIZADO";

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
              {finalized
                ? "Venda concluída e registrada no Dashboard."
                : "Este pedido foi encerrado."}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-3">
        <p className="text-xs font-bold text-texto">
          Status do pedido
        </p>

        <p className="text-[11px] text-cinza mt-0.5">
          Confirme após validar o pedido com a cliente pelo WhatsApp.
        </p>
      </div>

      <select
        value=""
        disabled={saving}
        onChange={(e) => {
          if (e.target.value) {
            handleChange(e.target.value);
          }
        }}
        className="w-full rounded-xl border border-rosa/20 px-3 py-2.5 text-sm bg-white disabled:opacity-50"
      >
        <option value="" disabled>
          Status atual: {STATUS_LABEL[value] ?? value}
        </option>

        {visibleStatuses.map(
          (statusOption) => (
            <option
              key={statusOption}
              value={statusOption}
            >
              {STATUS_LABEL[
                statusOption
              ] ?? statusOption}
            </option>
          )
        )}
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
