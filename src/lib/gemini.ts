type JsonSchema = Record<string, unknown>;

type InteractionContent = {
  type?: string;
  text?: string;
};

type InteractionStep = {
  type?: string;
  status?: string;
  content?: InteractionContent[];
};

type InteractionResponse = {
  id?: string;
  status?: string;
  steps?: InteractionStep[];
  error?: { message?: string };
};

export type ProductDescriptionInput = {
  name: string;
  brand: string;
  category: string;
  subcategory?: string | null;
};

export type PromotionCopyInput = {
  name: string;
  brand: string;
  category: string;
  campaignReason: "oferta" | "mais_vendido" | "novidade" | "destaque" | "catalogo";
};

export type PromotionCopyVariation = {
  hook: string;
};

export const PRODUCT_DESCRIPTION_PROMPT_VERSION = "product-description-v1";
export const PROMOTION_COPY_PROMPT_VERSION = "promotion-hook-v2";

const DEFAULT_MODEL = "gemini-3.5-flash-lite";
const DEFAULT_ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/interactions";
const REQUEST_TIMEOUT_MS = 15_000;

const BRAND_VOICE = `
Guia fixo de voz da Sra Make Prudente:
- Escreva sempre em português do Brasil, de forma natural, acolhedora, simples e comercial.
- Seja próxima sem infantilizar a cliente e sem usar linguagem agressiva de venda.
- Nunca use superlativos ou promessas não comprovadas como "o melhor do mercado", "perfeito", "milagroso" ou "resultado garantido".
- Nunca invente benefícios, composição, duração, indicação técnica, certificação, estoque, vendas, popularidade, desconto ou urgência.
- Nunca use falsa escassez como "últimas unidades", "corra", "vai acabar" ou equivalente quando isso não estiver explicitamente nos dados recebidos.
- Prefira frases curtas e específicas. Não repita o nome da loja desnecessariamente.

Exemplo de tom adequado: "Uma opção prática para completar sua rotina de beleza. Confira os detalhes e escolha a sua."
Exemplo de tom inadequado: "O melhor produto do mercado! Corra porque está acabando!"
`.trim();

export class GeminiError extends Error {
  status: number;
  code: "NOT_CONFIGURED" | "RATE_LIMIT" | "UPSTREAM" | "INVALID_RESPONSE";

  constructor(
    message: string,
    status: number,
    code: GeminiError["code"]
  ) {
    super(message);
    this.name = "GeminiError";
    this.status = status;
    this.code = code;
  }
}

export function getGeminiModel() {
  return process.env.GEMINI_MODEL?.trim() || DEFAULT_MODEL;
}

export function isGeminiConfigured() {
  return Boolean(process.env.GEMINI_API_KEY?.trim());
}

function getEndpoint() {
  return process.env.GEMINI_API_ENDPOINT?.trim() || DEFAULT_ENDPOINT;
}

function getOutputText(response: InteractionResponse) {
  const steps = [...(response.steps ?? [])].reverse();
  for (const step of steps) {
    if (step.type !== "model_output") continue;
    const text = (step.content ?? [])
      .filter((content) => content.type === "text" && typeof content.text === "string")
      .map((content) => content.text)
      .join("")
      .trim();
    if (text) return text;
  }
  return "";
}

function cleanString(value: unknown, maxLength: number) {
  if (typeof value !== "string") return "";
  return value.replace(/\s+/g, " ").trim().slice(0, maxLength);
}

async function generateStructured<T>(
  prompt: string,
  schema: JsonSchema
): Promise<{ data: T; model: string }> {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    throw new GeminiError(
      "A IA ainda não está configurada. Adicione GEMINI_API_KEY na Vercel para ativar este recurso.",
      503,
      "NOT_CONFIGURED"
    );
  }

  const model = getGeminiModel();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(getEndpoint(), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify({
        model,
        store: false,
        system_instruction: BRAND_VOICE,
        input: prompt,
        response_format: [
          {
            type: "text",
            mime_type: "application/json",
            schema,
          },
        ],
        generation_config: {
          temperature: 1,
        },
      }),
      signal: controller.signal,
      cache: "no-store",
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new GeminiError(
        "A IA demorou mais que o esperado. Tente novamente.",
        504,
        "UPSTREAM"
      );
    }
    throw new GeminiError(
      "Não foi possível conectar ao serviço de IA agora.",
      502,
      "UPSTREAM"
    );
  } finally {
    clearTimeout(timeout);
  }

  const payload = (await response.json().catch(() => ({}))) as InteractionResponse;

  if (!response.ok) {
    const upstreamMessage = payload.error?.message?.trim();
    if (response.status === 429) {
      throw new GeminiError(
        "O limite gratuito da IA foi atingido temporariamente. Os modelos fixos continuam disponíveis; tente a IA novamente mais tarde.",
        429,
        "RATE_LIMIT"
      );
    }
    console.error("Gemini API error:", response.status, upstreamMessage || "sem mensagem");
    throw new GeminiError(
      "A IA não conseguiu gerar a sugestão agora. Tente novamente.",
      502,
      "UPSTREAM"
    );
  }

  const outputText = getOutputText(payload);
  if (!outputText) {
    throw new GeminiError(
      "A IA respondeu sem um texto utilizável.",
      502,
      "INVALID_RESPONSE"
    );
  }

  try {
    return { data: JSON.parse(outputText) as T, model };
  } catch {
    console.error("Gemini returned invalid structured output.");
    throw new GeminiError(
      "A IA respondeu em um formato inesperado. Tente novamente.",
      502,
      "INVALID_RESPONSE"
    );
  }
}

export async function generateProductDescription(input: ProductDescriptionInput) {
  const prompt = `
Crie uma descrição curta para o catálogo da Sra Make Prudente usando SOMENTE os dados abaixo.

Produto: ${input.name}
Marca: ${input.brand}
Categoria: ${input.category}
Subcategoria: ${input.subcategory || "não informada"}

Regras específicas:
- Retorne 2 a 3 frases, entre 120 e 360 caracteres no total.
- Não use emoji na descrição do catálogo.
- Descreva de forma comercial sem afirmar características que não foram fornecidas.
- Se os dados forem insuficientes para um benefício específico, use linguagem neutra como "opção para sua rotina de beleza".
- Não inclua preço, estoque, entrega, link, hashtags ou chamada de urgência.
`.trim();

  const result = await generateStructured<{ description: string }>(prompt, {
    type: "object",
    properties: {
      description: {
        type: "string",
        description: "Descrição comercial curta, factual e em português do Brasil.",
      },
    },
    required: ["description"],
    additionalProperties: false,
  });

  const description = cleanString(result.data.description, 420);
  if (description.length < 30) {
    throw new GeminiError(
      "A sugestão gerada ficou curta demais. Tente novamente.",
      502,
      "INVALID_RESPONSE"
    );
  }

  return {
    description,
    model: result.model,
    promptVersion: PRODUCT_DESCRIPTION_PROMPT_VERSION,
  };
}

export async function generatePromotionCopy(input: PromotionCopyInput) {
  const reasonInstruction: Record<PromotionCopyInput["campaignReason"], string> = {
    oferta: "O sistema confirmou que existe preço promocional real. O gancho pode comunicar oportunidade ou preço especial, sem criar prazo ou escassez.",
    mais_vendido: "O sistema confirmou a classificação de mais vendido. O gancho pode falar em procura ou pedidos sem acrescentar números.",
    novidade: "O sistema confirmou a flag de novidade. O gancho pode comunicar novidade, sem inventar data de chegada.",
    destaque: "O sistema confirmou a flag de destaque. Trate como uma seleção da loja, sem alegar popularidade.",
    catalogo: "O produto não tem flag promocional. Crie um gancho neutro e convidativo para apresentar o item.",
  };

  const prompt = `
Crie 3 opções de GANCHO CURTO para abrir uma mensagem de WhatsApp da Sra Make Prudente.
A aplicação já monta separadamente: foto, nome do produto, marca, preço real, link e informação de retirada/entrega.
Você deve gerar SOMENTE o gancho. Não gere CTA.

Produto: ${input.name}
Marca: ${input.brand}
Categoria: ${input.category}
Contexto validado pelo sistema: ${reasonInstruction[input.campaignReason]}

Regras específicas:
- Cada gancho deve ter de 3 a 8 palavras e no máximo 55 caracteres.
- Escreva o gancho em CAIXA ALTA para funcionar como manchete visual no WhatsApp.
- Não use emoji, hashtags, preço, percentual, estoque, quantidade, prazo, URL, endereço ou nome da loja.
- Não invente atributos, benefícios ou promessas do produto.
- Evite CTA disfarçado como "clique", "acesse", "compre", "garanta" ou "peça".
- As 3 opções precisam ser realmente diferentes entre si.
- Se os dados não sustentarem um benefício específico, prefira enquadramento neutro ligado à categoria ou ao contexto validado.
`.trim();

  const result = await generateStructured<{ variations: PromotionCopyVariation[] }>(prompt, {
    type: "object",
    properties: {
      variations: {
        type: "array",
        minItems: 3,
        maxItems: 3,
        items: {
          type: "object",
          properties: {
            hook: { type: "string" },
          },
          required: ["hook"],
          additionalProperties: false,
        },
      },
    },
    required: ["variations"],
    additionalProperties: false,
  });

  const variations = (Array.isArray(result.data.variations) ? result.data.variations : [])
    .map((variation) => ({
      hook: cleanString(variation?.hook, 70).toLocaleUpperCase("pt-BR"),
    }))
    .filter((variation) => variation.hook.length >= 8)
    .slice(0, 3);

  if (variations.length < 2) {
    throw new GeminiError(
      "A IA não conseguiu criar ganchos utilizáveis. Tente novamente.",
      502,
      "INVALID_RESPONSE"
    );
  }

  return {
    variations,
    model: result.model,
    promptVersion: PROMOTION_COPY_PROMPT_VERSION,
  };
}
