"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

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

const MAX_IMAGES = 5;
const MAX_FILE_SIZE = 5 * 1024 * 1024;

const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

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
  const [promoPrice, setPromoPrice] = useState(
    initial?.promoPrice?.toString() ?? ""
  );
  const [stockQty, setStockQty] = useState(
    initial?.stockQty?.toString() ?? "0"
  );
  const [featured, setFeatured] = useState(initial?.featured ?? false);
  const [isNew, setIsNew] = useState(initial?.isNew ?? false);
  const [bestSeller, setBestSeller] = useState(initial?.bestSeller ?? false);
  const [active, setActive] = useState(initial?.active ?? true);
  const [categoryId, setCategoryId] = useState(initialPrimaryCategoryId);
  const [categoryIds, setCategoryIds] = useState<string[]>(initialCategoryIds);
  const [subcategoryId, setSubcategoryId] = useState(
    initial?.subcategoryId ?? ""
  );
  const [variants, setVariants] = useState<VariantRow[]>(
    initial?.variants ?? []
  );

  const [existingImages] = useState<ProductImage[]>(
    [...(initial?.images ?? [])].sort((a, b) => a.order - b.order)
  );

  const [newImages, setNewImages] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);

  const selectedCategory = categories.find((c) => c.id === categoryId);

  useEffect(() => {
    const urls = newImages.map((file) => URL.createObjectURL(file));
    setPreviews(urls);

    return () => {
      urls.forEach((url) => URL.revokeObjectURL(url));
    };
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

  function changePrimaryCategory(nextCategoryId: string) {
    setCategoryId(nextCategoryId);
    setSubcategoryId("");
    setCategoryIds((current) =>
      Array.from(new Set([nextCategoryId, ...current].filter(Boolean)))
    );
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

      const res = await fetch("/api/admin/products/upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(
          data.error ?? `Não foi possível enviar a imagem "${file.name}".`
        );
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

      const url = isEdit
        ? `/api/admin/products/${initial!.id}`
        : "/api/admin/products";

      const method = isEdit ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.error ?? "Não foi possível salvar o produto.");
      }

      const productId = initial?.id ?? data.product?.id;

      if (!productId) {
        throw new Error("Produto salvo, mas não foi possível identificar o ID.");
      }

      if (newImages.length > 0) {
        await uploadImages(productId);
      }

      router.push("/admin/produtos");
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Não foi possível salvar o produto."
      );
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

      <Field label="SKU (opcional)">
        <input value={sku} onChange={(e) => setSku(e.target.value)} className="input" />
      </Field>

      <Field label="Descrição">
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          className="input resize-none"
        />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Preço (R$)">
          <input
            type="number"
            step="0.01"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            required
            className="input"
          />
        </Field>

        <Field label="Preço promocional (opcional)">
          <input
            type="number"
            step="0.01"
            value={promoPrice}
            onChange={(e) => setPromoPrice(e.target.value)}
            className="input"
          />
        </Field>
      </div>

      <Field label="Quantidade em estoque">
        <input
          type="number"
          value={stockQty}
          onChange={(e) => setStockQty(e.target.value)}
          className="input"
        />
      </Field>

      <p className="text-[11px] text-cinza -mt-2">
        O rótulo (Disponível / Últimas unidades / Indisponível) é calculado
        automaticamente a partir dessa quantidade — não é editado diretamente.
      </p>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Categoria principal">
          <select
            value={categoryId}
            onChange={(e) => changePrimaryCategory(e.target.value)}
            className="input"
          >
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Subcategoria da principal">
          <select
            value={subcategoryId}
            onChange={(e) => setSubcategoryId(e.target.value)}
            className="input"
          >
            <option value="">—</option>
            {selectedCategory?.subcategories.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <div className="rounded-2xl border border-rosa/15 bg-white p-4">
        <p className="text-xs font-bold text-texto">Também exibir em</p>
        <p className="mt-1 text-[11px] text-cinza">
          Marque outras categorias onde este produto deve aparecer. A categoria principal fica sempre selecionada.
        </p>

        <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
          {categories.map((category) => {
            const isPrimary = category.id === categoryId;
            const checked = isPrimary || categoryIds.includes(category.id);

            return (
              <label
                key={category.id}
                className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-semibold ${
                  isPrimary
                    ? "border-rosa-profundo/25 bg-rosa/5 text-rosa-profundo"
                    : "border-rosa/15 bg-creme/40 text-texto"
                }`}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  disabled={isPrimary}
                  onChange={(e) => toggleAdditionalCategory(category.id, e.target.checked)}
                />
                <span>{category.name}</span>
                {isPrimary && (
                  <span className="ml-auto text-[9px] font-bold uppercase tracking-wide">Principal</span>
                )}
              </label>
            );
          })}
        </div>
      </div>

      <div className="border border-rosa/15 rounded-2xl p-4 bg-white">
        <div className="mb-3">
          <p className="text-xs font-bold text-texto">Imagens do produto</p>
          <p className="text-[11px] text-cinza mt-1">
            Até {MAX_IMAGES} imagens. JPG, PNG ou WebP, máximo de 5 MB cada.
          </p>
        </div>

        {existingImages.length > 0 && (
          <div className="grid grid-cols-3 gap-2 mb-3">
            {existingImages.map((image, index) => (
              <div
                key={image.id}
                className="relative aspect-square overflow-hidden rounded-xl border border-rosa/10 bg-creme"
              >
                <img src={image.url} alt={`Imagem ${index + 1}`} className="w-full h-full object-cover" />
                {index === 0 && (
                  <span className="absolute left-1.5 bottom-1.5 rounded-full bg-white/90 px-2 py-1 text-[9px] font-bold text-texto">
                    Principal
                  </span>
                )}
              </div>
            ))}
          </div>
        )}

        {previews.length > 0 && (
          <div className="grid grid-cols-3 gap-2 mb-3">
            {previews.map((preview, index) => (
              <div
                key={preview}
                className="relative aspect-square overflow-hidden rounded-xl border border-rosa/20 bg-creme"
              >
                <img src={preview} alt={`Nova imagem ${index + 1}`} className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => removeNewImage(index)}
                  className="absolute top-1 right-1 w-6 h-6 rounded-full bg-white text-vermelho text-xs font-bold shadow"
                  aria-label={`Remover imagem ${index + 1}`}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}

        {existingImages.length + newImages.length < MAX_IMAGES && (
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <label className="flex min-h-24 cursor-pointer items-center justify-center rounded-xl border-2 border-dashed border-rosa/25 bg-creme px-3 transition hover:border-rosa/50">
              <div className="text-center">
                <p className="text-sm font-bold text-rosa-profundo">Tirar foto</p>
                <p className="mt-1 text-[10px] text-cinza">Abre a câmera traseira do celular</p>
              </div>
              <input
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleImagesChange}
                className="hidden"
              />
            </label>

            <label className="flex min-h-24 cursor-pointer items-center justify-center rounded-xl border-2 border-dashed border-rosa/20 bg-creme px-3 transition hover:border-rosa/40">
              <div className="text-center">
                <p className="text-sm font-bold text-rosa-profundo">Escolher da galeria</p>
                <p className="mt-1 text-[10px] text-cinza">Você pode selecionar várias imagens</p>
              </div>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                onChange={handleImagesChange}
                className="hidden"
              />
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
        <p className="text-xs font-bold text-texto mb-2">
          Variantes (ex: tonalidades, cores) — opcional
        </p>

        {variants.length > 0 && (
          <div className="grid grid-cols-[minmax(0,1fr)_110px_auto] gap-2 mb-2 px-1">
            <span className="text-[10px] font-bold uppercase tracking-wide text-cinza">Nome</span>
            <span className="text-[10px] font-bold uppercase tracking-wide text-cinza">Estoque</span>
            <span />
          </div>
        )}

        {variants.map((v, idx) => (
          <div
            key={v.id ?? `new-${idx}`}
            className="grid grid-cols-[minmax(0,1fr)_110px_auto] gap-2 mb-2 items-center"
          >
            <input
              value={v.name}
              onChange={(e) => {
                const next = [...variants];
                next[idx] = { ...next[idx], name: e.target.value };
                setVariants(next);
              }}
              placeholder="Ex: Bege claro"
              className="input min-w-0"
            />

            <input
              type="number"
              min="0"
              value={v.stockQty}
              onChange={(e) => {
                const next = [...variants];
                next[idx] = { ...next[idx], stockQty: Number(e.target.value) };
                setVariants(next);
              }}
              placeholder="0"
              className="input min-w-0"
            />

            <button
              type="button"
              onClick={() => setVariants(variants.filter((_, i) => i !== idx))}
              className="text-xs font-bold text-vermelho px-2 whitespace-nowrap"
            >
              Remover
            </button>
          </div>
        ))}

        <button
          type="button"
          onClick={() => setVariants([...variants, { name: "", stockQty: 0 }])}
          className="text-xs font-bold text-rosa-profundo"
        >
          + Adicionar variante
        </button>
      </div>

      {error && <p className="text-xs text-vermelho">{error}</p>}

      <button
        type="submit"
        disabled={saving}
        className="mt-2 py-3 rounded-full font-bold text-sm text-white disabled:opacity-50"
        style={{ backgroundColor: "#E4127B" }}
      >
        {saving
          ? newImages.length > 0
            ? "Salvando e enviando imagens..."
            : "Salvando..."
          : isEdit
            ? "Salvar alterações"
            : "Criar produto"}
      </button>

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

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[11px] font-bold text-cinza uppercase tracking-wide">
        {label}
      </span>
      {children}
    </label>
  );
}

function Checkbox({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-1.5 text-xs font-semibold text-texto">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      {label}
    </label>
  );
}
