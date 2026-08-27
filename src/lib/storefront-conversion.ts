export const STOREFRONT_CONVERSION_DEFAULTS = {
  heroEyebrow: "Catálogo da",
  heroTitle: "Maquiagem, lash e nail em Presidente Prudente",
  heroSubtitle:
    "Veja preços e disponibilidade. Escolha seus produtos e finalize pelo WhatsApp.",
  primaryCtaLabel: "Ver produtos e preços",
  primaryCtaUrl: "/categoria",
  secondaryCtaLabel: "Precisa de ajuda? Fale no WhatsApp",
  secondaryCtaUrl: "",
  highlight1: "Retirada no Centro",
  highlight2: "Entrega em Presidente Prudente",
  highlight3: "",
} as const;

type StorefrontCopySource = Partial<{
  heroEyebrow: string | null;
  heroTitle: string | null;
  heroSubtitle: string | null;
  primaryCtaLabel: string | null;
  primaryCtaUrl: string | null;
  secondaryCtaLabel: string | null;
  secondaryCtaUrl: string | null;
  highlight1: string | null;
  highlight2: string | null;
  highlight3: string | null;
}> | null;

const LEGACY_VALUES = {
  heroEyebrow: new Set([
    "Catálogo Sra Make",
    "Catálogo da Sra Make",
    "Loja física + catálogo online",
  ]),
  heroTitle: new Set([
    "Encontre o que você precisa na Sra Make.",
    "Você linda todos os dias.",
  ]),
  heroSubtitle: new Set([
    "Maquiagem, lash, nail e acessórios. Escolha pelo catálogo e confirme pelo WhatsApp.",
    "Maquiagem, lash, nail e acessórios. Escolha seus produtos e finalize pelo WhatsApp.",
  ]),
  primaryCtaLabel: new Set(["Ver produtos"]),
  secondaryCtaLabel: new Set(["Preciso de ajuda"]),
  highlight1: new Set([
    "Compra fácil e segura",
    "Compra simples e segura",
  ]),
  highlight2: new Set(["Atendimento personalizado"]),
  highlight3: new Set(["Retirada ou entrega"]),
};

function resolveText(
  value: string | null | undefined,
  fallback: string,
  legacy?: Set<string>,
) {
  const normalized = value?.trim();
  if (!normalized || legacy?.has(normalized)) return fallback;
  return normalized;
}

export function resolveStorefrontConversion(source: StorefrontCopySource) {
  return {
    heroEyebrow: resolveText(
      source?.heroEyebrow,
      STOREFRONT_CONVERSION_DEFAULTS.heroEyebrow,
      LEGACY_VALUES.heroEyebrow,
    ),
    heroTitle: resolveText(
      source?.heroTitle,
      STOREFRONT_CONVERSION_DEFAULTS.heroTitle,
      LEGACY_VALUES.heroTitle,
    ),
    heroSubtitle: resolveText(
      source?.heroSubtitle,
      STOREFRONT_CONVERSION_DEFAULTS.heroSubtitle,
      LEGACY_VALUES.heroSubtitle,
    ),
    primaryCtaLabel: resolveText(
      source?.primaryCtaLabel,
      STOREFRONT_CONVERSION_DEFAULTS.primaryCtaLabel,
      LEGACY_VALUES.primaryCtaLabel,
    ),
    primaryCtaUrl:
      source?.primaryCtaUrl?.trim() || STOREFRONT_CONVERSION_DEFAULTS.primaryCtaUrl,
    secondaryCtaLabel: resolveText(
      source?.secondaryCtaLabel,
      STOREFRONT_CONVERSION_DEFAULTS.secondaryCtaLabel,
      LEGACY_VALUES.secondaryCtaLabel,
    ),
    secondaryCtaUrl:
      source?.secondaryCtaUrl?.trim() || STOREFRONT_CONVERSION_DEFAULTS.secondaryCtaUrl,
    highlight1: resolveText(
      source?.highlight1,
      STOREFRONT_CONVERSION_DEFAULTS.highlight1,
      LEGACY_VALUES.highlight1,
    ),
    highlight2: resolveText(
      source?.highlight2,
      STOREFRONT_CONVERSION_DEFAULTS.highlight2,
      LEGACY_VALUES.highlight2,
    ),
    highlight3: resolveText(
      source?.highlight3,
      STOREFRONT_CONVERSION_DEFAULTS.highlight3,
      LEGACY_VALUES.highlight3,
    ),
  };
}
