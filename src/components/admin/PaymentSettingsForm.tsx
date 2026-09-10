"use client";

import { useMemo, useState } from "react";
import type { PaymentProvider, PaymentSettingsConfig } from "@/lib/payment-settings";

function providerId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `provider-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function emptyRules(defaultDays: number) {
  return Array.from({ length: 12 }, (_, index) => ({
    installments: index + 1,
    feeRate: 0,
    settlementDays: defaultDays,
  }));
}

function hydrateProvider(provider: PaymentProvider): PaymentProvider {
  const creditByInstallment = new Map(provider.creditRules.map((rule) => [rule.installments, rule]));
  const linkByInstallment = new Map(provider.linkRules.map((rule) => [rule.installments, rule]));
  return {
    ...provider,
    creditRules: Array.from({ length: 12 }, (_, index) => {
      const installments = index + 1;
      return creditByInstallment.get(installments) ?? { installments, feeRate: 0, settlementDays: 0 };
    }),
    linkRules: Array.from({ length: 12 }, (_, index) => {
      const installments = index + 1;
      return linkByInstallment.get(installments) ?? { installments, feeRate: 0, settlementDays: 30 };
    }),
  };
}

export function PaymentSettingsForm({
  initial,
  canEdit,
}: {
  initial: PaymentSettingsConfig;
  canEdit: boolean;
}) {
  const [providers, setProviders] = useState<PaymentProvider[]>(() => initial.providers.map(hydrateProvider));
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const activeCount = useMemo(() => providers.filter((provider) => provider.active).length, [providers]);

  function addProvider() {
    setProviders((current) => [
      ...current,
      {
        id: providerId(),
        name: "Nova operadora",
        active: true,
        debitFeeRate: 0,
        debitSettlementDays: 0,
        creditRules: emptyRules(0),
        linkRules: emptyRules(30),
      },
    ]);
    setMessage("");
  }

  function updateProvider(index: number, patch: Partial<PaymentProvider>) {
    setProviders((current) => current.map((provider, i) => (i === index ? { ...provider, ...patch } : provider)));
    setMessage("");
  }

  function updateRule(
    providerIndex: number,
    type: "creditRules" | "linkRules",
    ruleIndex: number,
    field: "feeRate" | "settlementDays",
    value: number
  ) {
    setProviders((current) =>
      current.map((provider, index) => {
        if (index !== providerIndex) return provider;
        const rules = provider[type].map((rule, i) =>
          i === ruleIndex
            ? {
                ...rule,
                [field]: field === "settlementDays" ? Math.max(0, Math.round(value || 0)) : Math.max(0, value || 0),
              }
            : rule
        );
        return { ...provider, [type]: rules };
      })
    );
    setMessage("");
  }

  async function save() {
    if (!canEdit || saving) return;
    setSaving(true);
    setError("");
    setMessage("");
    try {
      if (providers.some((provider) => !provider.name.trim())) {
        throw new Error("Informe o nome de todas as operadoras.");
      }
      const response = await fetch("/api/admin/payment-settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ providers }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error ?? "Não foi possível salvar as taxas.");
      setProviders((data.settings?.providers ?? providers).map(hydrateProvider));
      setMessage("Taxas e prazos de recebimento salvos.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Não foi possível salvar as taxas.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="mt-6 max-w-5xl rounded-2xl border border-rosa/15 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-rosa-profundo">Financeiro</p>
          <h2 className="mt-1 font-serif text-lg font-bold text-texto">Pagamentos e taxas</h2>
          <p className="mt-1 max-w-2xl text-xs leading-5 text-cinza">
            Cadastre a operadora atual e as taxas reais. A venda guarda uma cópia da taxa usada no dia, então mudanças futuras não alteram o histórico.
          </p>
        </div>
        {canEdit && (
          <button type="button" onClick={addProvider} className="rounded-xl border border-rosa/20 px-3 py-2 text-xs font-bold text-rosa-profundo">
            + Adicionar operadora
          </button>
        )}
      </div>

      {!canEdit && (
        <p className="mt-4 rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-800">
          Somente administradores podem alterar taxas de pagamento.
        </p>
      )}

      <p className="mt-3 text-[11px] text-cinza">{activeCount} operadora(s) ativa(s). Débito e crédito da maquininha podem ser recebidos na hora; link de pagamento é registrado como valor a receber.</p>

      <div className="mt-4 grid gap-4">
        {providers.length === 0 && (
          <div className="rounded-xl border border-dashed border-rosa/20 p-5 text-center text-xs text-cinza">
            Nenhuma operadora cadastrada. Adicione a maquininha ou banco usado pela loja.
          </div>
        )}

        {providers.map((provider, providerIndex) => (
          <details key={provider.id} className="rounded-2xl border border-rosa/15 bg-creme/20 p-3" open={providers.length === 1}>
            <summary className="cursor-pointer list-none">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <strong className="block truncate text-sm text-texto">{provider.name}</strong>
                  <span className="text-[10px] text-cinza">{provider.active ? "Ativa" : "Inativa"}</span>
                </div>
                <span className="text-xs font-bold text-rosa-profundo">Configurar ▼</span>
              </div>
            </summary>

            <div className="mt-4 grid gap-4">
              <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
                <label className="text-[10px] font-bold uppercase text-cinza">
                  Operadora / banco
                  <input
                    value={provider.name}
                    disabled={!canEdit}
                    onChange={(event) => updateProvider(providerIndex, { name: event.target.value })}
                    className="mt-1 w-full rounded-xl border border-rosa/15 bg-white px-3 py-2.5 text-sm font-normal normal-case text-texto disabled:bg-gray-50"
                  />
                </label>
                <label className="flex items-center gap-2 self-end rounded-xl border border-rosa/15 bg-white px-3 py-2.5 text-xs font-bold text-texto">
                  <input
                    type="checkbox"
                    checked={provider.active}
                    disabled={!canEdit}
                    onChange={(event) => updateProvider(providerIndex, { active: event.target.checked })}
                  />
                  Ativa
                </label>
              </div>

              <div className="rounded-xl border border-rosa/10 bg-white p-3">
                <h3 className="text-xs font-bold text-texto">Débito na maquininha</h3>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <NumberField label="Taxa %" value={provider.debitFeeRate} disabled={!canEdit} step="0.01" onChange={(value) => updateProvider(providerIndex, { debitFeeRate: value })} />
                  <NumberField label="Recebimento em dias" value={provider.debitSettlementDays} disabled={!canEdit} step="1" onChange={(value) => updateProvider(providerIndex, { debitSettlementDays: Math.max(0, Math.round(value)) })} />
                </div>
              </div>

              <RateTable
                title="Crédito na maquininha"
                description="Informe a taxa e o prazo que valem para cada quantidade de parcelas. Prazo 0 = recebido na hora."
                rules={provider.creditRules}
                disabled={!canEdit}
                onChange={(ruleIndex, field, value) => updateRule(providerIndex, "creditRules", ruleIndex, field, value)}
              />

              <RateTable
                title="Link de pagamento"
                description="O link fica registrado como A receber. Informe a taxa e o prazo previsto de liberação para cada parcelamento."
                rules={provider.linkRules}
                disabled={!canEdit}
                onChange={(ruleIndex, field, value) => updateRule(providerIndex, "linkRules", ruleIndex, field, value)}
              />

              {canEdit && providers.length > 1 && (
                <button
                  type="button"
                  onClick={() => setProviders((current) => current.filter((_, index) => index !== providerIndex))}
                  className="justify-self-start text-xs font-bold text-red-600"
                >
                  Remover operadora
                </button>
              )}
            </div>
          </details>
        ))}
      </div>

      {error && <p className="mt-4 rounded-xl bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">{error}</p>}
      {message && <p className="mt-4 rounded-xl bg-green-50 px-3 py-2 text-xs font-semibold text-green-700">{message}</p>}

      {canEdit && (
        <button type="button" disabled={saving} onClick={save} className="mt-4 w-full rounded-xl bg-rosa-profundo px-4 py-3 text-sm font-bold text-white disabled:opacity-50">
          {saving ? "Salvando taxas..." : "Salvar pagamentos e taxas"}
        </button>
      )}
    </section>
  );
}

function NumberField({ label, value, disabled, step, onChange }: { label: string; value: number; disabled: boolean; step: string; onChange: (value: number) => void }) {
  return (
    <label className="text-[10px] font-bold uppercase text-cinza">
      {label}
      <input
        type="number"
        min="0"
        step={step}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(Number(event.target.value))}
        className="mt-1 w-full rounded-xl border border-rosa/15 px-3 py-2 text-sm font-normal text-texto disabled:bg-gray-50"
      />
    </label>
  );
}

function RateTable({ title, description, rules, disabled, onChange }: { title: string; description: string; rules: PaymentProvider["creditRules"]; disabled: boolean; onChange: (ruleIndex: number, field: "feeRate" | "settlementDays", value: number) => void }) {
  return (
    <div className="rounded-xl border border-rosa/10 bg-white p-3">
      <h3 className="text-xs font-bold text-texto">{title}</h3>
      <p className="mt-1 text-[10px] leading-4 text-cinza">{description}</p>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full min-w-[420px] text-left text-xs">
          <thead className="text-[10px] uppercase text-cinza">
            <tr>
              <th className="pb-2">Parcelas</th>
              <th className="pb-2">Taxa %</th>
              <th className="pb-2">Prazo (dias)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-rosa/10">
            {rules.map((rule, index) => (
              <tr key={rule.installments}>
                <td className="py-2 font-bold text-texto">{rule.installments}x</td>
                <td className="py-2 pr-2">
                  <input type="number" min="0" step="0.01" value={rule.feeRate} disabled={disabled} onChange={(event) => onChange(index, "feeRate", Number(event.target.value))} className="w-24 rounded-lg border border-rosa/15 px-2 py-1.5 disabled:bg-gray-50" />
                </td>
                <td className="py-2">
                  <input type="number" min="0" step="1" value={rule.settlementDays} disabled={disabled} onChange={(event) => onChange(index, "settlementDays", Number(event.target.value))} className="w-24 rounded-lg border border-rosa/15 px-2 py-1.5 disabled:bg-gray-50" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
