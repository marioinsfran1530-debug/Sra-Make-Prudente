"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, XCircle } from "lucide-react";
import { AdminNotice, ConfirmDialog } from "@/components/admin/AdminUx";

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

function getAllowedStatuses(status: string, deliveryType: string): string[] {
  switch (status) {
    case "NOVO":
    case "EM_CONFIRMACAO":
      return ["CONFIRMADO", "CANCELADO"];
    case "CONFIRMADO":
      return ["SEPARANDO", "FINALIZADO", "CANCELADO"];
    case "SEPARANDO":
      return [
        deliveryType === "RETIRADA" ? "PRONTO_RETIRADA" : "SAIU_ENTREGA",
        "FINALIZADO",
        "CANCELADO",
      ];
    case "PRONTO_RETIRADA":
    case "SAIU_ENTREGA":
      return ["FINALIZADO", "CANCELADO"];
    default:
      return [];
  }
}

function confirmationFor(status: string) {
  if (status === "CONFIRMADO") {
    return {
      title: "Confirmar pedido?",
      message: "A confirmação baixa o estoque dos produtos deste pedido.",
      confirmLabel: "Confirmar pedido",
      danger: false,
    };
  }
  if (status === "FINALIZADO") {
    return {
      title: "Finalizar venda?",
      message: "A venda será considerada concluída e o valor entrará nos indicadores do Dashboard.",
      confirmLabel: "Finalizar venda",
      danger: false,
    };
  }
  if (status === "CANCELADO") {
    return {
      title: "Cancelar pedido?",
      message:
        "O pedido será encerrado. Se o estoque já tiver sido baixado, as quantidades serão devolvidas automaticamente.",
      confirmLabel: "Cancelar pedido",
      danger: true,
    };
  }
  return null;
}

export function OrderStatusControl({
  orderId,
  status,
  deliveryType,
}: {
  orderId: string;
  status: string;
  deliveryType: string;
}) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [value, setValue] = useState(status);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [pendingStatus, setPendingStatus] = useState<string | null>(null);

  const closed = value === "FINALIZADO" || value === "CANCELADO";
  const visibleStatuses = getAllowedStatuses(value, deliveryType);
  const pendingConfirmation = pendingStatus ? confirmationFor(pendingStatus) : null;

  async function applyStatus(newStatus: string) {
    setError(null);
    setSuccess(null);
    if (closed || newStatus === value) return;

    setSaving(true);
    try {
      const res = await fetch(`/api/admin/orders/${orderId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.error ?? "Não foi possível atualizar o pedido.");
      }

      setValue(newStatus);
      setPendingStatus(null);
      setSuccess(`Status atualizado para ${STATUS_LABEL[newStatus] ?? newStatus}.`);
      router.refresh();
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Não foi possível atualizar o pedido."
      );
    } finally {
      setSaving(false);
    }
  }

  function requestStatus(newStatus: string) {
    if (!newStatus || newStatus === value || saving) return;
    if (confirmationFor(newStatus)) {
      setPendingStatus(newStatus);
      return;
    }
    void applyStatus(newStatus);
  }

  if (closed) {
    const finalized = value === "FINALIZADO";
    return (
      <div
        className={`rounded-xl border p-4 ${
          finalized ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"
        }`}
      >
        <div className="flex items-center gap-2">
          {finalized ? (
            <CheckCircle2 size={19} className="text-green-700" />
          ) : (
            <XCircle size={19} className="text-red-700" />
          )}
          <div>
            <p className={`text-sm font-bold ${finalized ? "text-green-700" : "text-red-700"}`}>
              {finalized ? "Venda finalizada" : "Pedido cancelado"}
            </p>
            <p className="mt-0.5 text-[11px] text-cinza">
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
        <p className="text-xs font-bold text-texto">Status do pedido</p>
        <p className="mt-0.5 text-[11px] leading-5 text-cinza">
          Atualize conforme a operação avança. Confirmar baixa o estoque; finalizar registra a venda.
        </p>
      </div>

      <div className="mb-3 rounded-xl bg-creme px-3 py-2.5">
        <p className="text-[10px] font-bold uppercase tracking-wide text-cinza">Status atual</p>
        <p className="mt-1 text-sm font-bold text-texto">{STATUS_LABEL[value] ?? value}</p>
      </div>

      <select
        value=""
        disabled={saving}
        onChange={(event) => requestStatus(event.target.value)}
        className="w-full rounded-xl border border-rosa/20 bg-white px-3 py-2.5 text-sm disabled:opacity-50"
      >
        <option value="" disabled>
          {saving ? "Atualizando..." : "Escolher próximo status"}
        </option>
        {visibleStatuses.map((statusOption) => (
          <option key={statusOption} value={statusOption}>
            {STATUS_LABEL[statusOption] ?? statusOption}
          </option>
        ))}
      </select>

      {value === "CONFIRMADO" && (
        <p className="mt-2 text-[10px] leading-4 text-cinza">
          Use “Separando” para acompanhar a preparação ou finalize diretamente quando a venda já estiver concluída.
        </p>
      )}
      {value === "SEPARANDO" && (
        <p className="mt-2 text-[10px] leading-4 text-cinza">
          Próxima etapa sugerida: {deliveryType === "RETIRADA" ? "Pronto para retirada" : "Saiu para entrega"}.
        </p>
      )}

      {success && <AdminNotice tone="success" className="mt-3">{success}</AdminNotice>}
      {error && <AdminNotice tone="error" className="mt-3">{error}</AdminNotice>}

      <ConfirmDialog
        open={Boolean(pendingStatus && pendingConfirmation)}
        title={pendingConfirmation?.title ?? "Confirmar alteração?"}
        message={pendingConfirmation?.message ?? "Deseja continuar?"}
        confirmLabel={pendingConfirmation?.confirmLabel ?? "Confirmar"}
        danger={pendingConfirmation?.danger ?? false}
        busy={saving}
        onCancel={() => setPendingStatus(null)}
        onConfirm={() => pendingStatus && applyStatus(pendingStatus)}
      />
    </div>
  );
}
