"use client";

import { useEffect, useRef, useState } from "react";
import { parseQuickProduct, parseVariantNames } from "@/lib/quick-product";

export type QuickCategory = { id: string; name: string };

export type CreatedProduct = {
  id: string;
  name: string;
  brand: string;
  sku: string | null;
  variants: { id: string; name: string; sku: string | null; stockQty: number }[];
};

// Folha de cadastro rápido de produto novo, aberta de dentro da entrada de estoque.
// Pede só o essencial; o produto fica como rascunho até ser completado e ativado.
export function QuickProductSheet({
  initialName,
  categories,
  brands,
  onClose,
  onCreated,
}: {
  initialName: string;
  categories: QuickCategory[];
  brands: string[];
  onClose: () => void;
  onCreated: (product: CreatedProduct) => void;
}) {
  const [name, setName] = useState(initialName.trim());
  const [brand, setBrand] = useState("");
  const [categoryId, setCategoryId] = useState(categories.length === 1 ? categories[0].id : "");
  const [price, setPrice] = useState("");
  const [sku, setSku] = useState("");
  const [variantsText, setVariantsText] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    nameRef.current?.focus();
  }, []);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const variantNames = parseVariantNames(variantsText);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (saving) return;

    const payload = { name, brand, categoryId, price, sku, variants: variantsText };
    const checked = parseQuickProduct(payload);
    if ("error" in checked) {
      setError(checked.error);
      return;
    }

    setSaving(true);
    setError("");
    try {
      const response = await fetch("/api/admin/products/quick", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Não foi possível cadastrar o produto.");
      onCreated(data.product as CreatedProduct);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível cadastrar o produto.");
      setSaving(false);
    }
  }

  const inputClass =
    "w-full rounded-xl border border-rosa/20 bg-white px-3 py-2.5 text-sm outline-none focus:border-rosa-profundo";
  const labelClass = "text-[10px] font-bold uppercase text-cinza";

  return (
    <div
      className="fixed inset-0 z-40 flex items-end justify-center bg-black/40 sm:items-center sm:p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !saving) onClose();
      }}
    >
      <form
        onSubmit={submit}
        role="dialog"
        aria-modal="true"
        aria-labelledby="quick-product-title"
        className="max-h-[92dvh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-white p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] shadow-2xl sm:rounded-3xl"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 id="quick-product-title" className="font-serif text-lg font-bold text-texto">
              Produto novo
            </h2>
            <p className="mt-0.5 text-[11px] leading-4 text-cinza">
              Fica como rascunho (fora da loja) até você completar foto e descrição em Produtos. O estoque e o custo
              entram por esta entrada.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            aria-label="Fechar"
            className="shrink-0 rounded-full px-2.5 py-1 text-lg leading-none text-cinza"
          >
            ×
          </button>
        </div>

        <div className="mt-3 grid gap-3">
          <label className="block">
            <span className={labelClass}>Nome do produto</span>
            <input
              ref={nameRef}
              value={name}
              maxLength={120}
              onChange={(event) => setName(event.target.value)}
              placeholder="Ex.: Aparador de sobrancelha"
              autoComplete="off"
              className={`${inputClass} mt-1`}
            />
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className={labelClass}>Marca</span>
              <input
                value={brand}
                maxLength={60}
                onChange={(event) => setBrand(event.target.value)}
                list="quick-product-brands"
                placeholder="Ex.: Vivai"
                autoComplete="off"
                className={`${inputClass} mt-1`}
              />
              <datalist id="quick-product-brands">
                {brands.map((item) => (
                  <option key={item} value={item} />
                ))}
              </datalist>
            </label>
            <label className="block">
              <span className={labelClass}>Preço de venda</span>
              <input
                value={price}
                onChange={(event) => setPrice(event.target.value.replace(/[^\d.,]/g, ""))}
                inputMode="decimal"
                placeholder="R$ 0,00"
                className={`${inputClass} mt-1`}
              />
            </label>
          </div>

          <label className="block">
            <span className={labelClass}>Categoria</span>
            <select value={categoryId} onChange={(event) => setCategoryId(event.target.value)} className={`${inputClass} mt-1`}>
              <option value="">Escolha…</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className={labelClass}>SKU ou código de barras (opcional)</span>
            <input
              value={sku}
              maxLength={40}
              onChange={(event) => setSku(event.target.value)}
              autoComplete="off"
              className={`${inputClass} mt-1`}
            />
          </label>

          <label className="block">
            <span className={labelClass}>Variações — cor, tamanho… (opcional)</span>
            <input
              value={variantsText}
              onChange={(event) => setVariantsText(event.target.value)}
              placeholder="Ex.: Preto, Marrom, Nude"
              autoComplete="off"
              className={`${inputClass} mt-1`}
            />
            <span className="mt-1 block text-[10px] leading-4 text-cinza">
              {variantNames.length > 0
                ? `${variantNames.length} variaç${variantNames.length === 1 ? "ão" : "ões"}: ${variantNames.join(", ")}. Depois você escolhe quais chegaram.`
                : "Separe por vírgula. Deixe vazio se o produto não tem variações."}
            </span>
          </label>
        </div>

        {error && (
          <p role="alert" className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">
            {error}
          </p>
        )}

        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="rounded-xl border border-rosa/20 px-4 py-3 text-xs font-bold text-cinza disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={saving}
            className="flex-1 rounded-xl bg-rosa-profundo px-4 py-3 text-xs font-extrabold text-white disabled:opacity-50"
          >
            {saving ? "Cadastrando..." : "Cadastrar e adicionar à entrada"}
          </button>
        </div>
      </form>
    </div>
  );
}
