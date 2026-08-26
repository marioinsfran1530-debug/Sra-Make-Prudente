import {
  PROMOTION_COPY_STRATEGIES,
  type PromotionCopyCandidate,
  type PromotionCopyStrategy,
  validatePromotionCopyCandidates,
} from "./ai-copy-rules";

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
  subcategory?: string | null;
  description?: string | null;
  campaignReason: "oferta" | "mais_vendido" | "novidade" | "destaque" | "catalogo";
};

export type PromotionCopyVariation = PromotionCopyCandidate;

export const PRODUCT_DESCRIPTION_PROMPT_VERSION = "product-description-v1";
export const PROMOTION_COPY_PROMPT_VERSION = "promotion-copy-strategy-v3";

const DEFAULT_MODEL = "gemini-3.5-flash-lite";
const DEFAULT_ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/interactions";
const REQUEST_TIMEOUT_MS = 15_000;

const BRAND_VOICE = `
Guia fixo de voz da Sra Make Prudente:
- Escreva sempre em português do Brasil, de forma natural, acolhedora, simples e comercial.
- Fale primeiro com o desejo, a necessidade ou a curiosidade da cliente; não comece falando de acontecimentos da loja.
- Seja feminina sem infantilizar e próxima sem parecer um robô ou anúncio genérico.
- Nunca use superlativos ou promessas não comprovadas como "o melhor do mercado", "perfeito", "milagroso" ou "resultado garantido".
- Nunca invente benefícios, composição, duração, indicação técnica, certificação, estoque, vendas, popularidade, desconto ou urgência.
- Nunca use falsa escassez como "últimas unidades", "corra", "vai acabar" ou equivalente quando isso não estiver explicitamente nos dados recebidos.
- Não use prova social como enfeite. Só mencione procura ou vendas quando o sistema disser que o produto é mais vendido.
- Prefira frases curtas, específicas e humanas. Não repita o nome da loja desnecessariamente.
- A persuasão deve vir de uma verdade do produto: característica, uso, benefício explicitamente informado, preço promocional real ou classificação validada pelo sistema.

Tom adequado: "Sobrancelhas mais definidas começam nos detalhes."
Tom inadequado: "Item muito procurado hoje! Corra porque está acabando!"
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

function cleanStrategy(value: unknown): PromotionCopyStrategy | "" {
  return typeof value === "string" &&
    PROMOTION_COPY_STRATEGIES.includes(value as PromotionCopyStrategy)
    ? (value as PromotionCopyStrategy)
    : "";
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
          temperature: 0.9,
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

function promotionReasonInstruction(input: PromotionCopyInput) {
  const instructions: Record<PromotionCopyInput["campaignReason"], string> = {
    oferta:
      "O sistema confirmou preço promocional real. Você pode enquadrar como oportunidade de valor, mas não invente prazo, estoque ou urgência.",
    mais_vendido:
      "O sistema confirmou a classificação de mais vendido. Prova social é permitida, mas não use 'mais pedido' como frase genérica isolada: conecte qualquer menção de procura a uma verdade específica do produto.",
    novidade:
      "O sistema confirmou a flag de novidade. Você pode mencionar novidade, mas não invente data de chegada nem use 'chegando' como gancho genérico.",
    destaque:
      "O sistema confirmou a flag de destaque. Trate como seleção da loja sem alegar popularidade ou vendas.",
    catalogo:
      "O produto não tem flag promocional. A persuasão deve vir exclusivamente de características ou usos sustentados pelos dados públicos do produto.",
  };
  return instructions[input.campaignReason];
}

function buildPromotionPrompt(input: PromotionCopyInput, validationFeedback: string[] = []) {
  const description = cleanString(input.description, 900) || "não informada";
  const feedback = validationFeedback.length
    ? `\nA tentativa anterior foi rejeitada pelo validador interno pelos motivos abaixo:\n- ${validationFeedback.join("\n- ")}\nReescreva do zero corrigindo todos os pontos.\n`
    : "";

  return `
Você é o assistente de copy da Sra Make Prudente. Sua função é transformar dados REAIS do produto em uma abertura curta e persuasiva para WhatsApp.

OBJETIVO PSICOLÓGICO
A primeira frase precisa interromper a leitura e fazer a cliente pensar em um desejo, uma dificuldade prática ou um detalhe interessante do produto. Não escreva como notificação de sistema e não anuncie acontecimentos da loja como ideia principal.

DADOS PÚBLICOS DO PRODUTO
Produto: ${input.name}
Marca: ${input.brand}
Categoria: ${input.category}
Subcategoria: ${input.subcategory || "não informada"}
Descrição cadastrada: ${description}
Contexto comercial validado: ${promotionReasonInstruction(input)}

CRIE EXATAMENTE 3 ABORDAGENS, NESTA ORDEM
1. estrategia = "beneficio"
   - Fale do desejo, resultado percebido ou experiência que os dados do produto sustentam.
   - Faça a cliente se imaginar usando o produto.
   - Não prometa transformação que não esteja nos dados.

2. estrategia = "dor_solucao"
   - Abra com UMA pergunta curta e natural sobre uma dificuldade que o produto realmente pode ajudar a resolver segundo os dados.
   - A frase de apoio apresenta o produto como caminho prático, sem medo, diagnóstico ou exagero.

3. estrategia = "curiosidade"
   - Destaque um detalhe específico: formato, função, característica, modelo, praticidade, 2 em 1 ou outro dado realmente informado.
   - Gere curiosidade sem clickbait e sem esconder a informação principal.

FORMATO DE CADA OPÇÃO
- hook: 4 a 11 palavras, máximo 78 caracteres, forte o suficiente para ser a primeira linha do WhatsApp.
- support: uma frase curta de 28 a 150 caracteres explicando por que aquele gancho faz sentido com base nos dados do produto.
- O hook deve ser em CAIXA ALTA. O support deve usar escrita normal.
- Não use emoji, hashtags, preço, URL, endereço ou CTA em hook/support; o sistema acrescenta isso depois.
- Não use "item muito procurado", "mais um pedido confirmado", "novidade em maquiagem chegando", "imperdível", "você precisa conhecer" ou variações genéricas.
- Não use "clique", "acesse", "compre", "garanta", "peça", "corra" ou "antes que acabe".
- Não invente composição, benefício, duração, certificação, estoque, popularidade, desconto ou promessa.
- Os 3 ganchos devem ser diferentes em mecanismo de persuasão, não apenas trocar palavras.
${feedback}
`.trim();
}

const PROMOTION_COPY_SCHEMA: JsonSchema = {
  type: "object",
  properties: {
    variations: {
      type: "array",
      minItems: 3,
      maxItems: 3,
      items: {
        type: "object",
        properties: {
          strategy: {
            type: "string",
            enum: ["beneficio", "dor_solucao", "curiosidade"],
          },
          hook: { type: "string" },
          support: { type: "string" },
        },
        required: ["strategy", "hook", "support"],
        additionalProperties: false,
      },
    },
  },
  required: ["variations"],
  additionalProperties: false,
};

export async function generatePromotionCopy(input: PromotionCopyInput) {
  let validationFeedback: string[] = [];

  for (let attempt = 0; attempt < 2; attempt += 1) {
    const result = await generateStructured<{ variations: PromotionCopyVariation[] }>(
      buildPromotionPrompt(input, validationFeedback),
      PROMOTION_COPY_SCHEMA
    );

    const variations = (Array.isArray(result.data.variations) ? result.data.variations : [])
      .map((variation) => ({
        strategy: cleanStrategy(variation?.strategy) as PromotionCopyStrategy,
        hook: cleanString(variation?.hook, 90).toLocaleUpperCase("pt-BR"),
        support: cleanString(variation?.support, 170),
      }))
      .slice(0, 3);

    const validation = validatePromotionCopyCandidates(variations, {
      campaignReason: input.campaignReason,
      productIdentity: `${input.name} ${input.brand} ${input.subcategory || ""}`,
      factualText: `${input.name} ${input.brand} ${input.category} ${input.subcategory || ""} ${descriptionForValidation(input.description)}`,
    });

    if (validation.ok) {
      return {
        variations,
        model: result.model,
        promptVersion: PROMOTION_COPY_PROMPT_VERSION,
      };
    }

    validationFeedback = validation.errors.slice(0, 8);
  }

  console.warn("Gemini promotion copy rejected by quality guard:", validationFeedback);
  throw new GeminiError(
    "A IA gerou textos abaixo do nosso padrão de qualidade. Tente gerar novamente.",
    502,
    "INVALID_RESPONSE"
  );
}

function descriptionForValidation(value: string | null | undefined) {
  return cleanString(value, 900);
}