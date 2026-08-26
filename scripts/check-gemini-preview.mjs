const apiKey = process.env.GEMINI_API_KEY?.trim();
const model = process.env.GEMINI_MODEL?.trim() || "gemini-3.5-flash-lite";
const endpoint = process.env.GEMINI_API_ENDPOINT?.trim() || "https://generativelanguage.googleapis.com/v1beta/interactions";

if (!apiKey) {
  console.error("Gemini build check: GEMINI_API_KEY ausente.");
  process.exit(1);
}

const controller = new AbortController();
const timeout = setTimeout(() => controller.abort(), 15000);

try {
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": apiKey,
    },
    body: JSON.stringify({
      model,
      store: false,
      system_instruction: "Responda somente em português do Brasil e siga o formato solicitado.",
      input: "Retorne um objeto JSON confirmando a conectividade da API.",
      response_format: [
        {
          type: "text",
          mime_type: "application/json",
          schema: {
            type: "object",
            properties: { ok: { type: "boolean" } },
            required: ["ok"],
            additionalProperties: false,
          },
        },
      ],
      generation_config: { temperature: 0 },
    }),
    signal: controller.signal,
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    console.error(`Gemini build check falhou: HTTP ${response.status} ${payload?.error?.message || "sem mensagem"}`);
    process.exit(1);
  }

  const output = [...(payload.steps || [])]
    .reverse()
    .find((step) => step?.type === "model_output")?.content
    ?.filter((item) => item?.type === "text" && typeof item?.text === "string")
    .map((item) => item.text)
    .join("")
    .trim();

  if (!output) {
    console.error("Gemini build check falhou: resposta sem model_output utilizável.");
    process.exit(1);
  }

  JSON.parse(output);
  console.log(`Gemini build check OK — modelo ${model}`);
} catch (error) {
  console.error(`Gemini build check falhou: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
} finally {
  clearTimeout(timeout);
}
