import type { AiCampaignReason } from "./ai-rules";

export type PromotionCopyStrategy =
  | "beneficio"
  | "dor_solucao"
  | "curiosidade";

export type PromotionCopyCandidate = {
  strategy: PromotionCopyStrategy;
  hook: string;
  support: string;
};

export const PROMOTION_COPY_STRATEGIES: PromotionCopyStrategy[] = [
  "beneficio",
  "dor_solucao",
  "curiosidade",
];

const STOP_WORDS = new Set([
  "PARA",
  "COM",
  "UMA",
  "UM",
  "DAS",
  "DOS",
  "DESTA",
  "DESTE",
  "PRODUTO",
  "MARCA",
  "MAKE",
  "MAQUIAGEM",
  "BELEZA",
  "ROTINA",
]);

const GENERIC_HOOK_PATTERNS = [
  /NOVIDADE EM .*CHEGANDO/,
  /ITEM (MUITO )?PROCURADO/,
  /MAIS UM PEDIDO/,
  /PEDIDO CONFIRMADO/,
  /ESCOLHA EM DESTAQUE/,
  /VALE CONFERIR/,
  /PRODUTO QUE VOCE VAI AMAR/,
  /VOCE PRECISA CONHECER/,
  /IMPERDIVEL/,
  /DESTAQUE DO DIA/,
];

const ALWAYS_FORBIDDEN_PATTERNS = [
  /ULTIMAS? UNIDADES?/,
  /ANTES QUE ACABE/,
  /CORRA/,
  /GARANTA (O|A|SEU|SUA)/,
  /RESULTADO GARANTIDO/,
  /MILAGROSO/,
  /MELHOR DO MERCADO/,
  /100% GARANTIDO/,
  /PERFEITO PARA TOD[AO]S/,
  /TODO MUNDO ESTA/,
];

const SOCIAL_PROOF_PATTERNS = [
  /MAIS PEDID[OA]/,
  /MAIS VENDID[OA]/,
  /MUITO PROCURAD[OA]/,
  /QUERIDINH[OA]/,
  /SUCESSO DE VENDAS/,
  /CLIENTES (ESTAO|AMAM|ADORAM)/,
  /PEDIDO CONFIRMADO/,
];

const NOVELTY_PATTERNS = [
  /NOVIDADE/,
  /LANCAMENTO/,
  /ACABOU DE CHEGAR/,
  /CHEGANDO/,
  /CHEGOU/,
];

const OFFER_PATTERNS = [
  /OFERTA/,
  /PROMOCAO/,
  /DESCONTO/,
  /PRECO ESPECIAL/,
  /ECONOMIZE/,
];

function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleUpperCase("pt-BR")
    .replace(/\s+/g, " ")
    .trim();
}

function words(value: string) {
  return normalize(value).split(/\s+/).filter(Boolean);
}

function hasPattern(value: string, patterns: RegExp[]) {
  const normalized = normalize(value);
  return patterns.some((pattern) => pattern.test(normalized));
}

function factTokens(value: string) {
  return Array.from(
    new Set(
      normalize(value)
        .split(/[^A-Z0-9]+/)
        .filter((token) => token.length >= 4 && !STOP_WORDS.has(token))
    )
  );
}

export type PromotionCopyValidationContext = {
  campaignReason: AiCampaignReason;
  productIdentity: string;
  factualText: string;
};

export function validatePromotionCopyCandidates(
  candidates: PromotionCopyCandidate[],
  context: PromotionCopyValidationContext
) {
  const errors: string[] = [];
  const identityTokens = factTokens(context.productIdentity);
  const uniqueHooks = new Set<string>();

  if (candidates.length !== 3) {
    errors.push("A resposta precisa conter exatamente três opções.");
  }

  PROMOTION_COPY_STRATEGIES.forEach((expectedStrategy, index) => {
    const candidate = candidates[index];
    if (!candidate) {
      errors.push(`Faltou a estratégia ${expectedStrategy}.`);
      return;
    }

    if (candidate.strategy !== expectedStrategy) {
      errors.push(
        `A opção ${index + 1} deveria usar a estratégia ${expectedStrategy}.`
      );
    }

    const hook = candidate.hook.trim();
    const support = candidate.support.trim();
    const combined = `${hook} ${support}`;
    const hookWords = words(hook).length;
    const normalizedHook = normalize(hook);

    if (hook.length < 18 || hook.length > 78 || hookWords < 4 || hookWords > 11) {
      errors.push(`O gancho ${index + 1} precisa ter de 4 a 11 palavras e até 78 caracteres.`);
    }

    if (support.length < 28 || support.length > 150) {
      errors.push(`O apoio ${index + 1} precisa ser uma frase curta e objetiva.`);
    }

    if (uniqueHooks.has(normalizedHook)) {
      errors.push("Os três ganchos precisam ser diferentes entre si.");
    }
    uniqueHooks.add(normalizedHook);

    if (hasPattern(hook, GENERIC_HOOK_PATTERNS)) {
      errors.push(`O gancho ${index + 1} ficou genérico ou artificial.`);
    }

    if (hasPattern(combined, ALWAYS_FORBIDDEN_PATTERNS)) {
      errors.push(`A opção ${index + 1} contém urgência, exagero ou promessa proibida.`);
    }

    if (
      context.campaignReason !== "mais_vendido" &&
      hasPattern(combined, SOCIAL_PROOF_PATTERNS)
    ) {
      errors.push(`A opção ${index + 1} inventa prova social.`);
    }

    if (
      context.campaignReason !== "novidade" &&
      hasPattern(combined, NOVELTY_PATTERNS)
    ) {
      errors.push(`A opção ${index + 1} chama o produto de novidade sem confirmação.`);
    }

    if (
      context.campaignReason !== "oferta" &&
      hasPattern(combined, OFFER_PATTERNS)
    ) {
      errors.push(`A opção ${index + 1} comunica oferta sem preço promocional real.`);
    }

    if (candidate.strategy === "dor_solucao" && !hook.includes("?")) {
      errors.push("A estratégia Dor/Solução deve abrir com uma pergunta natural.");
    }

    if (
      identityTokens.length > 0 &&
      !identityTokens.some((token) => normalize(combined).includes(token))
    ) {
      errors.push(
        `A opção ${index + 1} está genérica demais e não se conecta aos dados específicos do produto.`
      );
    }
  });

  return {
    ok: errors.length === 0,
    errors: Array.from(new Set(errors)),
  };
}
