import { WHATSAPP_NUMBER } from "./whatsapp";

export const STORE_LOCATION_DEFAULTS = {
  address:
    "Avenida Brasil, 373 — Box 202, Centro, Presidente Prudente/SP, 19010-031",
  businessHours:
    "Segunda a sexta, das 9h às 17h. Sábado, das 9h às 15h. Domingo e feriados: atendimento somente online.",
  whatsapp: WHATSAPP_NUMBER,
} as const;

type StoreLocationSource = Partial<{
  address: string | null;
  googleMapsUrl: string | null;
  businessHours: string | null;
  whatsapp: string | null;
}> | null;

function comparisonText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-BR")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const LEGACY_BUSINESS_HOURS = new Set(
  [
    "Segunda a sexta, 09:00 às 17:00. Sábado, 09:00 às 15:00. Domingo e feriados: atendimento somente online.",
    "Segunda a Sexta das 09:00 as 17:00 Sabado 09:00 as 15:00 Domingo e Feriados sómente online",
  ].map(comparisonText),
);

function safeMapsUrl(value: string | null | undefined) {
  const trimmed = value?.trim();
  if (!trimmed) return null;

  try {
    const url = new URL(trimmed);
    return url.protocol === "https:" ? trimmed : null;
  } catch {
    return null;
  }
}

export function resolveStoreLocation(source: StoreLocationSource) {
  const address = source?.address?.trim() || STORE_LOCATION_DEFAULTS.address;
  const configuredHours = source?.businessHours?.trim();
  const businessHours =
    !configuredHours || LEGACY_BUSINESS_HOURS.has(comparisonText(configuredHours))
      ? STORE_LOCATION_DEFAULTS.businessHours
      : configuredHours;

  return {
    address,
    businessHours,
    whatsapp: source?.whatsapp?.trim() || STORE_LOCATION_DEFAULTS.whatsapp,
    mapsUrl:
      safeMapsUrl(source?.googleMapsUrl) ||
      `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`,
  };
}
