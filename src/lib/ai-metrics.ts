import { prisma } from "@/lib/prisma";

export type AiFeature = "product_description" | "promotion_copy";

export async function recordAiGeneration({
  feature,
  adminId,
  productId,
  model,
  promptVersion,
  suggestionCount = 1,
}: {
  feature: AiFeature;
  adminId: string;
  productId?: string | null;
  model: string;
  promptVersion: string;
  suggestionCount?: number;
}) {
  try {
    return await prisma.aiSuggestionMetric.create({
      data: {
        feature,
        adminId,
        productId: productId || null,
        model,
        promptVersion,
        suggestionCount: Math.max(1, Math.min(10, Math.trunc(suggestionCount))),
      },
      select: { id: true },
    });
  } catch (error) {
    // Métrica nunca deve impedir o uso do assistente.
    console.error("Falha ao registrar geração de IA:", error);
    return null;
  }
}

export async function markAiSuggestionUsed({
  suggestionId,
  adminId,
  productId,
  edited,
  selectedIndex,
}: {
  suggestionId: string;
  adminId: string;
  productId?: string | null;
  edited: boolean;
  selectedIndex?: number | null;
}) {
  try {
    await prisma.aiSuggestionMetric.updateMany({
      where: {
        id: suggestionId,
        adminId,
      },
      data: {
        used: true,
        edited,
        productId: productId || undefined,
        selectedIndex:
          typeof selectedIndex === "number" && Number.isInteger(selectedIndex)
            ? selectedIndex
            : undefined,
        resolvedAt: new Date(),
      },
    });
  } catch (error) {
    // Falha de telemetria não pode bloquear cadastro, cópia ou compartilhamento.
    console.error("Falha ao registrar uso de sugestão de IA:", error);
  }
}
