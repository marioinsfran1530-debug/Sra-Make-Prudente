// Cadastro rápido de produto novo durante uma entrada de estoque (lógica pura).
//
// O produto nasce como rascunho (inativo, sem estoque e sem custo): o estoque e o
// custo entram pela própria entrada, e foto, descrição e subcategoria ficam para
// depois, na tela de produtos, antes de publicar na loja.

import { validateProductInput } from "./product-input";
import { parseMoneyText } from "./money-text";

export const MAX_QUICK_VARIANTS = 30;
export const MAX_VARIANT_NAME = 60;

export type QuickProductValue = {
  name: string;
  brand: string;
  sku: string | null;
  price: number;
  categoryId: string;
  variants: string[];
};

type Parsed = { error: string } | { value: QuickProductValue };

function foldName(text: string) {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLocaleLowerCase("pt-BR");
}

// "Preto, Marrom; Nude" → ["Preto", "Marrom", "Nude"] (sem repetidos, sem vazios).
export function parseVariantNames(text: string): string[] {
  const seen = new Set<string>();
  const names: string[] = [];
  for (const part of text.split(/[,;\n]/)) {
    const name = part.replace(/\s+/g, " ").trim().slice(0, MAX_VARIANT_NAME);
    const folded = foldName(name);
    if (!name || seen.has(folded)) continue;
    seen.add(folded);
    names.push(name);
  }
  return names.slice(0, MAX_QUICK_VARIANTS);
}

export function parseQuickProduct(raw: unknown): Parsed {
  if (!raw || typeof raw !== "object") return { error: "Dados do produto inválidos." };
  const body = raw as Record<string, unknown>;

  const price = typeof body.price === "number" ? body.price : parseMoneyText(String(body.price ?? ""));
  const validation = validateProductInput({
    name: body.name,
    brand: body.brand,
    sku: body.sku,
    price,
    stockQty: 0,
  });
  if (!validation.ok) return { error: validation.errors[0] };

  const categoryId = typeof body.categoryId === "string" ? body.categoryId.trim() : "";
  if (!categoryId) return { error: "Escolha a categoria." };

  const variants = typeof body.variants === "string" ? parseVariantNames(body.variants) : [];

  return {
    value: {
      name: validation.data.name,
      brand: validation.data.brand,
      sku: validation.data.sku,
      price: Math.round((validation.data.price + Number.EPSILON) * 100) / 100,
      categoryId,
      variants,
    },
  };
}
