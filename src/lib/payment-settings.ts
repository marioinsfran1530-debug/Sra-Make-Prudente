export type PaymentFeeRule = {
  installments: number;
  feeRate: number;
  settlementDays: number;
};

export type PaymentProvider = {
  id: string;
  name: string;
  active: boolean;
  debitFeeRate: number;
  debitSettlementDays: number;
  creditRules: PaymentFeeRule[];
  linkRules: PaymentFeeRule[];
};

export type PaymentSettingsConfig = {
  providers: PaymentProvider[];
};

export const EMPTY_PAYMENT_SETTINGS: PaymentSettingsConfig = { providers: [] };

function clampNumber(value: unknown, min: number, max: number, fallback = 0) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
}

function normalizeRules(value: unknown): PaymentFeeRule[] {
  if (!Array.isArray(value)) return [];
  const byInstallment = new Map<number, PaymentFeeRule>();
  for (const raw of value) {
    if (!raw || typeof raw !== "object") continue;
    const item = raw as Record<string, unknown>;
    const installments = Math.round(clampNumber(item.installments, 1, 24, 1));
    byInstallment.set(installments, {
      installments,
      feeRate: clampNumber(item.feeRate, 0, 100),
      settlementDays: Math.round(clampNumber(item.settlementDays, 0, 3650)),
    });
  }
  return Array.from(byInstallment.values()).sort((a, b) => a.installments - b.installments);
}

export function normalizePaymentSettings(value: unknown): PaymentSettingsConfig {
  if (!value || typeof value !== "object") return EMPTY_PAYMENT_SETTINGS;
  const rawProviders = (value as Record<string, unknown>).providers;
  if (!Array.isArray(rawProviders)) return EMPTY_PAYMENT_SETTINGS;

  const providers: PaymentProvider[] = [];
  for (const raw of rawProviders.slice(0, 12)) {
    if (!raw || typeof raw !== "object") continue;
    const item = raw as Record<string, unknown>;
    const name = typeof item.name === "string" ? item.name.trim().slice(0, 80) : "";
    if (!name) continue;
    const rawId = typeof item.id === "string" ? item.id.trim().slice(0, 80) : "";
    const id = rawId || `provider-${providers.length + 1}`;
    providers.push({
      id,
      name,
      active: item.active !== false,
      debitFeeRate: clampNumber(item.debitFeeRate, 0, 100),
      debitSettlementDays: Math.round(clampNumber(item.debitSettlementDays, 0, 3650)),
      creditRules: normalizeRules(item.creditRules),
      linkRules: normalizeRules(item.linkRules),
    });
  }

  return { providers };
}

export function findPaymentRule(
  provider: PaymentProvider | undefined,
  channel: "DEBIT" | "CREDIT" | "LINK",
  installments = 1
) {
  if (!provider) return { feeRate: 0, settlementDays: 0 };
  if (channel === "DEBIT") {
    return { feeRate: provider.debitFeeRate, settlementDays: provider.debitSettlementDays };
  }
  const rules = channel === "LINK" ? provider.linkRules : provider.creditRules;
  const rule = rules.find((item) => item.installments === installments);
  return rule
    ? { feeRate: rule.feeRate, settlementDays: rule.settlementDays }
    : { feeRate: 0, settlementDays: 0 };
}

export function activePaymentProviders(config: PaymentSettingsConfig) {
  return config.providers.filter((provider) => provider.active);
}
