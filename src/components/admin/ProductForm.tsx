"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ProductImageEditor } from "@/components/admin/ProductImageEditor";

type Category = {
  id: string;
  name: string;
  subcategories: { id: string; name: string }[];
};

type VariantRow = {
  id?: string;
  name: string;
  stockQty: number;
};

type ProductImage = {
  id: string;
  url: string;
  storagePath?: string | null;
  order: number;
};

type ProductLookup = {
  gtin: string;
  name: string | null;
  brand: string | null;
  description: string | null;
  imageUrl: string | null;
  ncm: string | null;
  ncmDescription: string | null;
  category: string | null;
  avgPrice: number | null;
  minPrice: number | null;
  maxPrice: number | null;
  source: "cosmos" | "open_beauty_facts" | "open_food_facts";
};

type ImageEditorTarget =
  | {
      kind: "existing";
      image: ProductImage;
      source: string;
      fileName: string;
    }
  | {
      kind: "new";
      index: number;
      source: string;
      fileName: string;
    };

const MAX_IMAGES = 5;
const MAX_FILE_SIZE = 5 * 1024 * 1024;

const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

function onlyDigits(value: string) {
  return value.replace(/\D/g, "");
}

function isValidGtin(value: string) {
  const digits = onlyDigits(value);
  if (![8, 12, 13, 14].includes(digits.length)) return false;

  const numbers = digits.split("").map(Number);
  const checkDigit = numbers.pop();
  if (checkDigit === undefined) return false;

  let sum = 0;
  for (let i = numbers.length - 1, position = 0; i >= 0; i--, position++) {
    sum += numbers[i] * (position % 2 === 0 ? 3 : 1);
  }

  return (10 - (sum % 10)) % 10 === checkDigit;
}

function sourceLabel(source: ProductLookup["source"]) {
  if (source === "cosmos") return "Bluesoft Cosmos";
  if (source === "open_food_facts") return "Open Food Facts";
  return "Open Beauty Facts";
}

function moneyOrNull(value: number | null) {
  if (value === null) return null;
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

export function ProductForm({
  categories,
  initial,
}: {
  categories: Category[];
  initial?: {
    id: string;
    name: string;
    brand: string;
    sku: string | null;
    description: string | null;
    price: number;
    promoPrice: number | null;
    stockQty: number;
    featured: boolean;
    isNew: boolean;
    bestSeller: boolean;
    active: boolean;
    categoryId: string;
    categoryIds?: string[];
    subcategoryId: string | null;
    variants: VariantRow[];
    images?: ProductImage[];
  };
}) {
  const router = useRouter();
  const isEdit = !!initial;

  const initialPrimaryCategoryId = initial?.categoryId ?? categories[0]?.id ?? "";
  const initialCategoryIds = Array.from(
    new Set([initialPrimaryCategoryId, ...(initial?.categoryIds ?? [])].filter(Boolean))
  );

  const [name, setName] = useState(initial?.name ?? "");
  const [brand, setBrand] = useState(initial?.brand ?? "");
  const [sku, setSku] = useState(initial?.sku ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [price, setPrice] = useState(initial?.price?.toString() ?? "");
  const [promoPrice, setPromoPrice] = useState(initial?.promoPrice?.toString() ?? "");
  const [stockQty, setStockQty] = useState(initial?.stockQty?.toString() ?? "0");
  const [featured, setFeatured] = useState(initial?.featured ?? false);
  const [isNew, setIsNew] = useState(initial?.isNew ?? false);
  const [bestSeller, setBestSeller] = useState(initial?.bestSeller ?? false);
  const [active, setActive] = useState(initial?.active ?? true);
  const [categoryId, setCategoryId] = useState(initialPrimaryCategoryId);
  const [categoryIds, setCategoryIds] = useState<string[]>(initialCategoryIds);
  const [subcategoryId, setSubcategoryId] = useState(initial?.subcategoryId ?? "");
  const [variants, setVariants] = useState<VariantRow[]>(initial?.variants ?? []);

  const [existingImages, setExistingImages] = useState<ProductImage[]>(
    [...(initial?.images ?? [])].sort((a, b) => a.order - b.order)
  );
  const [newImages, setNewImages] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [editorTarget, setEditorTarget] = useState<ImageEditorTarget | null>(null);
  const [editorSaving, setEditorSaving] = useState(false);
  const [imageActionId, setImageActionId] = useState<string | null>(null);

  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupResult, setLookupResult] = useState<ProductLookup | null>(null);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [importingLookupImage, setImportingLookupImage] = useState(false);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);

  const selectedCategory = categories.find((c) => c.id === categoryId);
  const gtinValid = isValidGtin(sku);

  useEffect(() => {
    const urls = newImages.map((file) => URL.createObjectURL(file));
    setPreviews(urls);
    return () => urls.forEach((url) => URL.revokeObjectURL(url));
  }, [newImages]);

  function handleImagesChange(e: React.ChangeEvent<HTMLInputElement>) {
    setImageError(null);
    const selected = Array.from(e.target.files ?? []);
    if (!selected.length) return;

    const totalImages = existingImages.length + newImages.length + selected.length;
    if (totalImages > MAX_IMAGES) {
      setImageError(`Você pode cadastrar no máximo ${MAX_IMAGES} imagens por produto.`);
      e.target.value = "";
      return;
    }

    const invalidType = selected.find((file) => !ALLOWED_TYPES.has(file.type));
    if (invalidType) {
      setImageError("Formato inválido. Use apenas JPG, PNG ou WebP.");
      e.target.value = "";
      return;
    }

    const oversized = selected.find((file) => file.size > MAX_FILE_SIZE);
    if (oversized) {
      setImageError("Cada imagem deve ter no máximo 5 MB.");
      e.target.value = "";
      return;
    }

    setNewImages((current) => [...current, ...selected]);
    e.target.value = "";
  }

  function removeNewImage(index: number) {
    setNewImages((current) => current.filter((_, i) => i !== index));
  }

  function applyLookup(result: ProductLookup, overwrite = false) {
    if (result.name && (overwrite || !name.trim())) setName(result.name);
    if (result.brand && (overwrite || !brand.trim())) setBrand(result.brand);
    if (result.description && (overwrite || !description.trim())) setDescription(result.description);
  }

  async function importLookupImage(result: ProductLookup) {
    if (!result.imageUrl) return;
    setImageError(null);

    if (existingImages.length + newImages.length >= MAX_IMAGES) {
      setImageError(`Você já atingiu o limite de ${MAX_IMAGES} imagens.`);
      return;
    }

    const fileName = `ean-${result.gtin}-fonte`;
    if (newImages.some((file) => file.name.startsWith(fileName))) {
      setImageError("Essa foto sugerida já foi adicionada ao produto.");
      return;
    }

    setImportingLookupImage(true);
    try {
      const response = await fetch(
        `/api/admin/products/lookup/image?url=${encodeURIComponent(result.imageUrl)}`,
        { headers: { Accept: "image/*" } }
      );

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error ?? "Não foi possível importar a foto sugerida.");
      }

      const blob = await response.blob();
      if (!ALLOWED_TYPES.has(blob.type)) throw new Error("A foto sugerida está em um formato não suportado.");
      if (blob.size > MAX_FILE_SIZE) throw new Error("A foto sugerida deve ter no máximo 5 MB.");

      const extension = blob.type === "image/png" ? "png" : blob.type === "image/webp" ? "webp" : "jpg";
      const file = new File([blob], `${fileName}.${extension}`, { type: blob.type });
      setNewImages((current) => [...current, file]);
    } catch (err) {
      setImageError(err instanceof Error ? err.message : "Não foi possível importar a foto sugerida.");
    } finally {
      setImportingLookupImage(false);
    }
  }

  async function lookupByGtin() {
    const gtin = onlyDigits(sku);
    setLookupError(null);
    setLookupResult(null);

    if (!isValidGtin(gtin)) {
      setLookupError("Digite um EAN/GTIN válido com 8, 12, 13 ou 14 dígitos.");
      return;
    }

    setLookupLoading(true);
    try {
      const response = await fetch(`/api/admin/products/lookup/${gtin}`, {
        method: "GET",
        headers: { Accept: "application/json" },
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.product) throw new Error(data.error ?? "Produto não encontrado.");

      const result = data.product as ProductLookup;
      setSku(result.gtin || gtin);
      setLookupResult(result);
      applyLookup(result, false);
    } catch (err) {
      setLookupError(err instanceof Error ? err.message : "Não foi possível consultar o produto.");
    } finally {
      setLookupLoading(false);
    }
  }

  async function applyImageEdit(file: File) {
    if (!editorTarget) return;
    setImageError(null);

    if (editorTarget.kind === "new") {
      setNewImages((current) => current.map((currentFile, index) => index === editorTarget.index ? file : currentFile));
      setEditorTarget(null);
      return;
    }

    if (!initial?.id) return;
    setEditorSaving(true);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("productId", initial.id);
      formData.append("imageId", editorTarget.image.id);

      const response = await fetch("/api/admin/products/upload", { method: "POST", body: formData });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.image) throw new Error(data.error ?? "Não foi possível atualizar a imagem.");

      setExistingImages((current) => current.map((image) => image.id === editorTarget.image.id ? data.image : image));
      setEditorTarget(null);
      router.refresh();
    } catch (err) {
      setImageError(err instanceof Error ? err.message : "Não foi possível atualizar a imagem.");
    } finally {
      setEditorSaving(false);
    }
  }

  async function makePrimaryImage(image: ProductImage) {
    if (existingImages[0]?.id === image.id) return;
    setImageError(null);
    setImageActionId(image.id);

    try {
      const response = await fetch(`/api/admin/products/images/${image.id}`, { method: "PATCH" });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !Array.isArray(data.images)) {
        throw new Error(data.error ?? "Não foi possível definir a imagem principal.");
      }
      setExistingImages(data.images as ProductImage[]);
      router.refresh();
    } catch (err) {
      setImageError(err instanceof Error ? err.message : "Não foi possível definir a imagem principal.");
    } finally {
      setImageActionId(null);
    }
  }

  async function deleteExistingImage(image: ProductImage) {
    const confirmed = window.confirm(
      existingImages[0]?.id === image.id
        ? "Excluir a foto principal? A próxima foto será definida como principal automaticamente."
        : "Excluir esta foto do produto?"
    );
    if (!confirmed) return;

    setImageError(null);
    setImageActionId(image.id);

    try {
      const response = await fetch(`/api/admin/products/images/${image.id}`, { method: "DELETE" });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !Array.isArray(data.images)) {
        throw new Error(data.error ?? "Não foi possível excluir a imagem.");
      }
      setExistingImages(data.images as ProductImage[]);
      router.refresh();
    } catch (err) {
      setImageError(err instanceof Error ? err.message : "Não foi possível excluir a imagem.");
    } finally {
      setImageActionId(null);
    }
  }

  function changePrimaryCategory(nextCategoryId: string) {
    setCategoryId(nextCategoryId);
    setSubcategoryId("");
    setCategoryIds((current) => Array.from(new Set([nextCategoryId, ...current].filter(Boolean))));
  }

  function toggleAdditionalCategory(id: string, checked: boolean) {
    if (id === categoryId) return;
    setCategoryIds((current) => {
      if (checked) return Array.from(new Set([...current, id, categoryId]));
      return current.filter((category) => category !== id || category === categoryId);
    });
  }

  async function uploadImages(productId: string) {
    for (const file of newImages) {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("productId", productId);

      const res = await fetch("/api/admin/products/upload", { method: "POST", body: formData });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? `Não foi possível enviar a imagem "${file.name}".`);
      }
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setImageError(null);

    try {
      const payload = {
        name,
        brand,
        sku: sku || null,
        description: description || null,
        price: Number(price),
        promoPrice: promoPrice ? Number(promoPrice) : null,
        stockQty: Number(stockQty),
        featured,
        isNew,
        bestSeller,
        active,
        categoryId,
        categoryIds: Array.from(new Set([categoryId, ...categoryIds].filter(Boolean))),
        subcategoryId: subcategoryId || null,
        variants,
      };

      const url = isEdit ? `/api/admin/products/${initial!.id}` : "/api/admin/products";
      const method = isEdit ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Não foi possível salvar o produto.");

      const productId = initial?.id ?? data.product?.id;
      if (!productId) throw new Error("Produto salvo, mas não foi possível identificar o ID.");
      if (newImages.length > 0) await uploadImages(productId);

      router.push("/admin/produtos");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível salvar o produto.");
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 max-w-lg">
      <Field label="Nome">
        <input value={name} onChange={(e) => setName(e.target.value)} required className="input" />
      </Field>

      <Field label="Marca">
        <input value={brand} onChange={(e) => setBrand(e.target.value)} required className="input" />
      </Field>

      <Field label="Código de barras / SKU (opcional)">
        <div className="flex gap-2">
          <input
            value={sku}
            onChange={(e) => {
              setSku(e.target.value);
              setLookupError(null);
              setLookupResult(null);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && gtinValid && !lookupLoading) {
                e.preventDefault();
                void lookupByGtin();
              }
            }}
            inputMode="numeric"
            placeholder="EAN/GTIN ou SKU interno"
            className="input"
          />
          <button
            type="button"
            onClick={lookupByGtin}
            disabled={!gtinValid || lookupLoading}
            className="flex w-12 shrink-0 items-center justify-center rounded-xl border border-rosa/20 bg-white text-lg text-rosa-profundo transition hover:bg-rosa/5 disabled:cursor-not-allowed disabled:opacity-40"
            title={gtinValid ? "Buscar produto pelo código de barras" : "Digite um EAN/GTIN válido"}
            aria-label="Buscar produto pelo código de barras"
          >
            {lookupLoading ? "…" : "🔍"}
          </button>
        </div>
      </Field>

      <p className="-mt-2 text-[11px] leading-5 text-cinza">
        O código é opcional. Se for um EAN/GTIN válido, use a lupa para buscar nome, marca, descrição, foto e dados fiscais. SKU interno continua funcionando normalmente.
      </p>

      {lookupError && <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{lookupError}</div>}

      {lookupResult && (
        <div className="rounded-2xl border border-rosa/20 bg-creme/50 p-4">
          <div className="flex gap-3">
            {lookupResult.imageUrl ? (
              <img src={lookupResult.imageUrl} alt={lookupResult.name || "Produto encontrado"} className="h-20 w-20 shrink-0 rounded-xl border border-rosa/15 bg-white object-contain p-1" />
            ) : (
              <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-xl border border-rosa/15 bg-white text-[10px] text-cinza">Sem foto</div>
            )}
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-bold uppercase tracking-wide text-rosa-profundo">Produto encontrado · {sourceLabel(lookupResult.source)}</p>
              <p className="mt-1 text-sm font-bold text-texto">{lookupResult.name || "Nome não informado"}</p>
              {lookupResult.brand && <p className="mt-0.5 text-xs text-cinza">Marca: {lookupResult.brand}</p>}
              <p className="mt-0.5 text-[11px] text-cinza">EAN/GTIN: {lookupResult.gtin}</p>
            </div>
          </div>

          <div className="mt-3 grid gap-2 text-[11px] text-cinza sm:grid-cols-2">
            {lookupResult.ncm && <p><span className="font-bold text-texto">NCM:</span> {lookupResult.ncm}</p>}
            {lookupResult.category && <p><span className="font-bold text-texto">Categoria da fonte:</span> {lookupResult.category}</p>}
            {lookupResult.avgPrice !== null && <p><span className="font-bold text-texto">Preço médio de referência:</span> {moneyOrNull(lookupResult.avgPrice)}</p>}
            {lookupResult.minPrice !== null && lookupResult.maxPrice !== null && <p><span className="font-bold text-texto">Faixa encontrada:</span> {moneyOrNull(lookupResult.minPrice)} a {moneyOrNull(lookupResult.maxPrice)}</p>}
          </div>

          {lookupResult.ncmDescription && <p className="mt-2 text-[10px] leading-4 text-cinza">{lookupResult.ncmDescription}</p>}

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button type="button" onClick={() => applyLookup(lookupResult, true)} className="rounded-lg bg-rosa-profundo px-3 py-2 text-xs font-bold text-white">Aplicar dados ao cadastro</button>
            {lookupResult.imageUrl && (
              <button
                type="button"
                onClick={() => void importLookupImage(lookupResult)}
                disabled={importingLookupImage || existingImages.length + newImages.length >= MAX_IMAGES}
                className="rounded-lg border border-rosa-profundo/25 bg-white px-3 py-2 text-xs font-bold text-rosa-profundo disabled:cursor-not-allowed disabled:opacity-50"
              >
                {importingLookupImage ? "Importando foto..." : "Usar esta foto"}
              </button>
            )}
            <span className="text-[10px] leading-4 text-cinza">O preço não é alterado. A foto só entra se você escolher “Usar esta foto”.</span>
          </div>
        </div>
      )}

      <Field label="Descrição">
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className="input resize-none" />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Preço (R$)">
          <input type="number" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} required className="input" />
        </Field>
        <Field label="Preço promocional (opcional)">
          <input type="number" step="0.01" value={promoPrice} onChange={(e) => setPromoPrice(e.target.value)} className="input" />
        </Field>
      </div>

      <Field label="Quantidade em estoque">
        <input type="number" value={stockQty} onChange={(e) => setStockQty(e.target.value)} className="input" />
      </Field>

      <p className="text-[11px] text-cinza -mt-2">O rótulo (Disponível / Últimas unidades / Indisponível) é calculado automaticamente a partir dessa quantidade — não é editado diretamente.</p>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Categoria principal">
          <select value={categoryId} onChange={(e) => changePrimaryCategory(e.target.value)} className="input">
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </Field>
        <Field label="Subcategoria da principal">
          <select value={subcategoryId} onChange={(e) => setSubcategoryId(e.target.value)} className="input">
            <option value="">—</option>
            {selectedCategory?.subcategories.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </Field>
      </div>

      <div className="rounded-2xl border border-rosa/15 bg-white p-4">
        <p className="text-xs font-bold text-texto">Também exibir em</p>
        <p className="mt-1 text-[11px] text-cinza">Marque outras categorias onde este produto deve aparecer. A categoria principal fica sempre selecionada.</p>
        <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
          {categories.map((category) => {
            const isPrimary = category.id === categoryId;
            const checked = isPrimary || categoryIds.includes(category.id);
            return (
              <label key={category.id} className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-semibold ${isPrimary ? "border-rosa-profundo/25 bg-rosa/5 text-rosa-profundo" : "border-rosa/15 bg-creme/40 text-texto"}`}>
                <input type="checkbox" checked={checked} disabled={isPrimary} onChange={(e) => toggleAdditionalCategory(category.id, e.target.checked)} />
                <span>{category.name}</span>
                {isPrimary && <span className="ml-auto text-[9px] font-bold uppercase tracking-wide">Principal</span>}
              </label>
            );
          })}
        </div>
      </div>

      <div className="border border-rosa/15 rounded-2xl p-4 bg-white">
        <div className="mb-3">
          <p className="text-xs font-bold text-texto">Imagens do produto</p>
          <p className="text-[11px] text-cinza mt-1">Até {MAX_IMAGES} imagens. JPG, PNG ou WebP, máximo de 5 MB cada.</p>
          <p className="mt-1 text-[11px] text-cinza">A primeira foto é a principal do catálogo. Em produtos já salvos, você pode trocar a principal ou excluir uma foto sem apagar o produto.</p>
        </div>

        {existingImages.length > 0 && (
          <div className="grid grid-cols-2 gap-2 mb-3 sm:grid-cols-3">
            {existingImages.map((image, index) => {
              const busy = imageActionId === image.id;
              return (
                <div key={image.id} className="overflow-hidden rounded-xl border border-rosa/10 bg-creme">
                  <div className="relative aspect-square overflow-hidden">
                    <img src={image.url} alt={`Imagem ${index + 1}`} className="w-full h-full object-cover" />
                    {index === 0 && <span className="absolute left-1.5 top-1.5 rounded-full bg-white/95 px-2 py-1 text-[9px] font-bold text-texto shadow">Principal</span>}
                  </div>
                  <div className="grid gap-1.5 p-2">
                    {index !== 0 && (
                      <button type="button" onClick={() => void makePrimaryImage(image)} disabled={busy} className="rounded-lg border border-rosa-profundo/25 bg-white px-2 py-1.5 text-[10px] font-bold text-rosa-profundo disabled:opacity-50">
                        {busy ? "Salvando..." : "Tornar principal"}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setEditorTarget({ kind: "existing", image, source: image.url, fileName: `${name || "produto"}.jpg` })}
                      disabled={busy}
                      className="rounded-lg border border-rosa/20 bg-white px-2 py-1.5 text-[10px] font-bold text-texto disabled:opacity-50"
                    >
                      Ajustar
                    </button>
                    <button type="button" onClick={() => void deleteExistingImage(image)} disabled={busy} className="rounded-lg border border-red-200 bg-red-50 px-2 py-1.5 text-[10px] font-bold text-red-700 disabled:opacity-50">
                      {busy ? "Processando..." : "Excluir foto"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {previews.length > 0 && (
          <div className="grid grid-cols-2 gap-2 mb-3 sm:grid-cols-3">
            {previews.map((preview, index) => (
              <div key={preview} className="relative aspect-square overflow-hidden rounded-xl border border-rosa/20 bg-creme">
                <img src={preview} alt={`Nova imagem ${index + 1}`} className="w-full h-full object-cover" />
                <span className="absolute left-1.5 top-1.5 rounded-full bg-white/90 px-2 py-1 text-[9px] font-bold text-texto">Nova</span>
                <button type="button" onClick={() => removeNewImage(index)} className="absolute top-1 right-1 w-6 h-6 rounded-full bg-white text-vermelho text-xs font-bold shadow" aria-label={`Remover imagem ${index + 1}`}>×</button>
                <button
                  type="button"
                  onClick={() => setEditorTarget({ kind: "new", index, source: preview, fileName: newImages[index]?.name || `${name || "produto"}.jpg` })}
                  className="absolute bottom-1.5 right-1.5 rounded-lg bg-white/95 px-2 py-1 text-[10px] font-bold text-rosa-profundo shadow"
                >
                  Ajustar
                </button>
              </div>
            ))}
          </div>
        )}

        {existingImages.length + newImages.length < MAX_IMAGES && (
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <label className="flex min-h-24 cursor-pointer items-center justify-center rounded-xl border-2 border-dashed border-rosa/25 bg-creme px-3 transition hover:border-rosa/50">
              <div className="text-center"><p className="text-sm font-bold text-rosa-profundo">Tirar foto</p><p className="mt-1 text-[10px] text-cinza">Abre a câmera traseira do celular</p></div>
              <input type="file" accept="image/*" capture="environment" onChange={handleImagesChange} className="hidden" />
            </label>
            <label className="flex min-h-24 cursor-pointer items-center justify-center rounded-xl border-2 border-dashed border-rosa/20 bg-creme px-3 transition hover:border-rosa/40">
              <div className="text-center"><p className="text-sm font-bold text-rosa-profundo">Escolher da galeria</p><p className="mt-1 text-[10px] text-cinza">Você pode selecionar várias imagens</p></div>
              <input type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={handleImagesChange} className="hidden" />
            </label>
          </div>
        )}

        {imageError && <p className="text-xs text-vermelho mt-2">{imageError}</p>}
      </div>

      <div className="flex flex-wrap gap-4 py-2">
        <Checkbox label="Destaque" checked={featured} onChange={setFeatured} />
        <Checkbox label="Novidade" checked={isNew} onChange={setIsNew} />
        <Checkbox label="Mais vendido" checked={bestSeller} onChange={setBestSeller} />
        <Checkbox label="Ativo" checked={active} onChange={setActive} />
      </div>

      <div>
        <p className="text-xs font-bold text-texto mb-2">Variantes (ex: tonalidades, cores) — opcional</p>
        {variants.length > 0 && (
          <div className="grid grid-cols-[minmax(0,1fr)_110px_auto] gap-2 mb-2 px-1">
            <span className="text-[10px] font-bold uppercase tracking-wide text-cinza">Nome</span>
            <span className="text-[10px] font-bold uppercase tracking-wide text-cinza">Estoque</span>
            <span />
          </div>
        )}
        {variants.map((v, idx) => (
          <div key={v.id ?? `new-${idx}`} className="grid grid-cols-[minmax(0,1fr)_110px_auto] gap-2 mb-2 items-center">
            <input value={v.name} onChange={(e) => { const next = [...variants]; next[idx] = { ...next[idx], name: e.target.value }; setVariants(next); }} placeholder="Ex: Bege claro" className="input min-w-0" />
            <input type="number" min="0" value={v.stockQty} onChange={(e) => { const next = [...variants]; next[idx] = { ...next[idx], stockQty: Number(e.target.value) }; setVariants(next); }} placeholder="0" className="input min-w-0" />
            <button type="button" onClick={() => setVariants(variants.filter((_, i) => i !== idx))} className="text-xs font-bold text-vermelho px-2 whitespace-nowrap">Remover</button>
          </div>
        ))}
        <button type="button" onClick={() => setVariants([...variants, { name: "", stockQty: 0 }])} className="text-xs font-bold text-rosa-profundo">+ Adicionar variante</button>
      </div>

      {error && <p className="text-xs text-vermelho">{error}</p>}

      <button
        type="submit"
        disabled={saving || importingLookupImage || imageActionId !== null}
        className="mt-2 py-3 rounded-full font-bold text-sm text-white disabled:opacity-50"
        style={{ backgroundColor: "#E4127B" }}
      >
        {saving ? (newImages.length > 0 ? "Salvando e enviando imagens..." : "Salvando...") : isEdit ? "Salvar alterações" : "Criar produto"}
      </button>

      {editorTarget && (
        <ProductImageEditor
          source={editorTarget.source}
          fileName={editorTarget.fileName}
          saving={editorSaving}
          onCancel={() => { if (!editorSaving) setEditorTarget(null); }}
          onApply={applyImageEdit}
        />
      )}

      <style jsx>{`
        .input {
          border: 1px solid #e9d9e4;
          border-radius: 12px;
          padding: 10px 12px;
          font-size: 14px;
          color: #23142a;
          width: 100%;
        }
      `}</style>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[11px] font-bold text-cinza uppercase tracking-wide">{label}</span>
      {children}
    </label>
  );
}

function Checkbox({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center gap-1.5 text-xs font-semibold text-texto">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      {label}
    </label>
  );
}
