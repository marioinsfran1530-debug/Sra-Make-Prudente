"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, CheckCircle2, RotateCcw, XCircle } from "lucide-react";
import { AdminNotice, ConfirmDialog } from "@/components/admin/AdminUx";
import {
  ORDER_CANCEL_REASONS,
  cancelReasonLabel,
  refundStatusLabel,
  type OrderCancelReasonCode,
  type RefundStatus,
} from "@/lib/order-cancellation";

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
  return null;
}

type Props = {
  orderId: string;
  status: string;
  deliveryType: string;
  paymentMethods: string[];
  cancelReasonCode?: string | null;
  cancelReasonText?: string | null;
  cancelledAt?: string | null;
  cancelledBy?: string | null;
  refundStatus?: string | null;
};

export function OrderStatusControl({
  orderId,
  status,
  deliveryType,
  paymentMethods,
  cancelReasonCode,
  cancelReasonText,
  cancelledAt,
  cancelledBy,
  refundStatus,
}: Props) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [value, setValue] = useState(status);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [pendingStatus, setPendingStatus] = useState<string | null>(null);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [reasonCode, setReasonCode] = useState<OrderCancelReasonCode | "">("");
  const [reasonText, setReasonText] = useState("");
  const [refund, setRefund] = useState<RefundStatus>(status === "FINALIZADO" ? "PENDING" : "NOT_REQUIRED");
  const [currentRefundStatus, setCurrentRefundStatus] = useState(refundStatus ?? null);

  const visibleStatuses = getAllowedStatuses(value, deliveryType);
  const pendingConfirmation = pendingStatus ? confirmationFor(pendingStatus) : null;
  const hasCardPayment = paymentMethods.some((method) => ["DEBITO", "CREDITO", "CARTAO"].includes(method));

  async function applyStatus(newStatus: string) {
    setError(null);
    setSuccess(null);
    if (newStatus === value || value === "CANCELADO") return;

    setSaving(true);
    try {
      const res = await fetch(`/api/admin/orders/${orderId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Não foi possível atualizar o pedido.");

      setValue(newStatus);
      setPendingStatus(null);
      setSuccess(`Status atualizado para ${STATUS_LABEL[newStatus] ?? newStatus}.`);
      router.refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Não foi possível atualizar o pedido.");
    } finally {
      setSaving(false);
    }
  }

  async function submitCancellation() {
    setError(null);
    setSuccess(null);
    if (!reasonCode) {
      setError("Escolha o motivo do cancelamento.");
      return;
    }
    if (reasonCode === "OTHER" && reasonText.trim().length < 3) {
      setError("Descreva o motivo do cancelamento.");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`/api/admin/orders/${orderId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "CANCELADO",
          cancelReasonCode: reasonCode,
          cancelReasonText: reasonText.trim(),
          refundStatus: value === "FINALIZADO" ? refund : "NOT_REQUIRED",
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Não foi possível cancelar a venda.");

      setValue("CANCELADO");
      setCurrentRefundStatus(data.order?.refundStatus ?? (value === "FINALIZADO" ? refund : "NOT_REQUIRED"));
      setCancelOpen(false);
      setSuccess("Venda cancelada. O estoque foi ajustado e o histórico foi preservado.");
      router.refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Não foi possível cancelar a venda.");
    } finally {
      setSaving(false);
    }
  }

  async function markRefunded() {
    setError(null);
    setSuccess(null);
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/orders/${orderId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "refund", refundStatus: "REFUNDED" }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Não foi possível atualizar o estorno.");
      setCurrentRefundStatus("REFUNDED");
      setSuccess("Estorno/devolução marcado como concluído.");
      router.refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Não foi possível atualizar o estorno.");
    } finally {
      setSaving(false);
    }
  }

  function requestStatus(newStatus: string) {
    if (!newStatus || newStatus === value || saving) return;
    if (newStatus === "CANCELADO") {
      setRefund(value === "FINALIZADO" ? "PENDING" : "NOT_REQUIRED");
      setCancelOpen(true);
      return;
    }
    if (confirmationFor(newStatus)) {
      setPendingStatus(newStatus);
      return;
    }
    void applyStatus(newStatus);
  }

  const cancellationPanel = cancelOpen ? (
    <div className="mt-3 rounded-xl border border-red-200 bg-red-50 p-4">
      <div className="mb-3 flex items-start gap-2">
        <AlertTriangle size={18} className="mt-0.5 shrink-0 text-red-700" />
        <div>
          <p className="text-sm font-extrabold text-red-800">Cancelar {value === "FINALIZADO" ? "venda" : "pedido"}</p>
          <p className="mt-1 text-[11px] leading-5 text-red-700">
            O registro será preservado. Se o estoque já foi baixado, as quantidades serão devolvidas automaticamente.
          </p>
        </div>
      </div>

      <label className="block text-[11px] font-bold text-texto">Motivo *</label>
      <select
        value={reasonCode}
        onChange={(event) => setReasonCode(event.target.value as OrderCancelReasonCode | "")}
        disabled={saving}
        className="mt-1 w-full rounded-xl border border-red-200 bg-white px-3 py-2.5 text-sm"
      >
        <option value="">Selecione o motivo</option>
        {ORDER_CANCEL_REASONS.map((reason) => (
          <option key={reason.value} value={reason.value}>{reason.label}</option>
        ))}
      </select>

      <label className="mt-3 block text-[11px] font-bold text-texto">
        Observação {reasonCode === "OTHER" ? "*" : "(opcional)"}
      </label>
      <textarea
        value={reasonText}
        onChange={(event) => setReasonText(event.target.value)}
        maxLength={500}
        rows={3}
        placeholder="Ex.: cliente escolheu o produto errado e a venda será refeita."
        disabled={saving}
        className="mt-1 w-full resize-none rounded-xl border border-red-200 bg-white px-3 py-2.5 text-sm"
      />

      {value === "FINALIZADO" && (
        <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3">
          <p className="text-[11px] font-extrabold text-amber-900">Pagamento / devolução</p>
          <p className="mt-1 text-[10px] leading-4 text-amber-800">
            Cancelar no sistema não devolve dinheiro automaticamente. Faça o estorno na operadora/banco quando necessário.
          </p>
          {hasCardPayment && (
            <p className="mt-1 text-[10px] font-bold text-amber-900">
              Esta venda possui pagamento por cartão. Confirme o estorno também na maquininha/operadora.
            </p>
          )}
          <select
            value={refund}
            onChange={(event) => setRefund(event.target.value as RefundStatus)}
            disabled={saving}
            className="mt-2 w-full rounded-lg border border-amber-200 bg-white px-3 py-2 text-xs"
          >
            <option value="PENDING">Estorno/devolução pendente</option>
            <option value="REFUNDED">Já estornado/devolvido</option>
            <option value="NOT_REQUIRED">Não é necessário</option>
          </select>
        </div>
      )}

      <div className="mt-4 grid grid-cols-2 gap-2">
        <button
          type="button"
          disabled={saving}
          onClick={() => setCancelOpen(false)}
          className="rounded-xl border border-red-200 bg-white px-3 py-2.5 text-xs font-bold text-red-800 disabled:opacity-50"
        >
          Voltar
        </button>
        <button
          type="button"
          disabled={saving}
          onClick={() => void submitCancellation()}
          className="rounded-xl bg-red-700 px-3 py-2.5 text-xs font-extrabold text-white disabled:opacity-50"
        >
          {saving ? "Cancelando..." : "Confirmar cancelamento"}
        </button>
      </div>
    </div>
  ) : null;

  if (value === "CANCELADO") {
    const effectiveReason = cancelReasonCode ? cancelReasonLabel(cancelReasonCode) : reasonCode ? cancelReasonLabel(reasonCode) : "Motivo registrado no cancelamento";
    const effectiveText = cancelReasonText || reasonText;
    const effectiveRefund = currentRefundStatus || "NOT_REQUIRED";
    return (
      <div>
        <div className="rounded-xl border border-red-200 bg-red-50 p-4">
          <div className="flex items-start gap-2">
            <XCircle size={19} className="mt-0.5 shrink-0 text-red-700" />
            <div className="min-w-0">
              <p className="text-sm font-bold text-red-700">Venda cancelada</p>
              <p className="mt-1 text-[11px] font-semibold text-red-900">Motivo: {effectiveReason}</p>
              {effectiveText && <p className="mt-1 text-[11px] leading-5 text-red-800">{effectiveText}</p>}
              {(cancelledBy || cancelledAt) && (
                <p className="mt-2 text-[10px] text-red-700">
                  {cancelledBy ? `Cancelado por ${cancelledBy}` : ""}
                  {cancelledBy && cancelledAt ? " · " : ""}
                  {cancelledAt ? new Date(cancelledAt).toLocaleString("pt-BR") : ""}
                </p>
              )}
            </div>
          </div>
        </div>

        <div className={`mt-3 rounded-xl border p-3 ${effectiveRefund === "PENDING" ? "border-amber-200 bg-amber-50" : "border-green-200 bg-green-50"}`}>
          <p className="text-[10px] font-bold uppercase tracking-wide text-cinza">Pagamento</p>
          <p className="mt-1 text-xs font-extrabold text-texto">{refundStatusLabel(effectiveRefund)}</p>
          {effectiveRefund === "PENDING" && (
            <>
              <p className="mt-1 text-[10px] leading-4 text-amber-800">Confirme a devolução na operadora/banco e depois marque como concluída aqui.</p>
              <button
                type="button"
                disabled={saving}
                onClick={() => void markRefunded()}
                className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-amber-300 bg-white px-3 py-2 text-[11px] font-bold text-amber-900 disabled:opacity-50"
              >
                <RotateCcw size={13} /> {saving ? "Atualizando..." : "Marcar como estornado/devolvido"}
              </button>
            </>
          )}
        </div>

        {success && <AdminNotice tone="success" className="mt-3">{success}</AdminNotice>}
        {error && <AdminNotice tone="error" className="mt-3">{error}</AdminNotice>}
      </div>
    );
  }

  if (value === "FINALIZADO") {
    return (
      <div>
        <div className="rounded-xl border border-green-200 bg-green-50 p-4">
          <div className="flex items-start gap-2">
            <CheckCircle2 size={19} className="mt-0.5 shrink-0 text-green-700" />
            <div className="flex-1">
              <p className="text-sm font-bold text-green-700">Venda finalizada</p>
              <p className="mt-0.5 text-[11px] text-cinza">Venda concluída e registrada nos indicadores.</p>
            </div>
          </div>
          <button
            type="button"
            disabled={saving}
            onClick={() => {
              setRefund("PENDING");
              setCancelOpen((current) => !current);
            }}
            className="mt-3 w-full rounded-xl border border-red-200 bg-white px-3 py-2.5 text-xs font-bold text-red-700 disabled:opacity-50"
          >
            Cancelar venda
          </button>
        </div>
        {cancellationPanel}
        {success && <AdminNotice tone="success" className="mt-3">{success}</AdminNotice>}
        {error && <AdminNotice tone="error" className="mt-3">{error}</AdminNotice>}
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
        <option value="" disabled>{saving ? "Atualizando..." : "Escolher próximo status"}</option>
        {visibleStatuses.map((statusOption) => (
          <option key={statusOption} value={statusOption}>{STATUS_LABEL[statusOption] ?? statusOption}</option>
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

      {cancellationPanel}
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
        onConfirm={() => {
          if (pendingStatus) return applyStatus(pendingStatus);
        }}
      />
    </div>
  );
}
