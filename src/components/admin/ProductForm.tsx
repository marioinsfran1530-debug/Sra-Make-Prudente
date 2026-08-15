"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Category = { id: string; name: string; subcategories: { id: string; name: string }[] };

type VariantRow = { id?: string; name: string; stockQty: number };

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
    subcategoryId: string | null;
    variants: VariantRow[];
  };
}) {
  const router = useRouter();
  const isEdit = !!initial;

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
  const [categoryId, setCategoryId] = useState(initial?.categoryId ?? categories[0]?.id ?? "");
  const [subcategoryId, setSubcategoryId] = useState(initial?.subcategoryId ?? "");
  const [variants, setVariants] = useState<VariantRow[]>(initial?.variants ?? []);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedCategory = categories.find((c) => c.id === categoryId);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

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

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Não foi possível salvar o produto.");
      setSaving(false);
      return;
    }

    router.push("/admin/produtos");
    router.refresh();
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
        O rótulo (Disponível / Últimas unidades / Indisponível) é calculado automaticamente a
        partir dessa quantidade — não é editado diretamente.
      </p>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Categoria">
          <select
            value={categoryId}
            onChange={(e) => {
              setCategoryId(e.target.value);
              setSubcategoryId("");
            }}
            className="input"
          >
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Subcategoria">
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

      <div className="flex gap-4 py-2">
        <Checkbox label="Destaque" checked={featured} onChange={setFeatured} />
        <Checkbox label="Novidade" checked={isNew} onChange={setIsNew} />
        <Checkbox label="Mais vendido" checked={bestSeller} onChange={setBestSeller} />
        <Checkbox label="Ativo" checked={active} onChange={setActive} />
      </div>

      <div>
        <p className="text-xs font-bold text-texto mb-2">
          Variantes (ex: tonalidades, cores) — opcional
        </p>
        {variants.map((v, idx) => (
          <div key={idx} className="flex gap-2 mb-2">
            <input
              value={v.name}
              onChange={(e) => {
                const next = [...variants];
                next[idx] = { ...next[idx], name: e.target.value };
                setVariants(next);
              }}
              placeholder="Nome da variante"
              className="input flex-1"
            />
            <input
              type="number"
              value={v.stockQty}
              onChange={(e) => {
                const next = [...variants];
                next[idx] = { ...next[idx], stockQty: Number(e.target.value) };
                setVariants(next);
              }}
              placeholder="Estoque"
              className="input w-24"
            />
            <button
              type="button"
              onClick={() => setVariants(variants.filter((_, i) => i !== idx))}
              className="text-xs font-bold text-vermelho px-2"
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
        {saving ? "Salvando..." : isEdit ? "Salvar alterações" : "Criar produto"}
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

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[11px] font-bold text-cinza uppercase tracking-wide">{label}</span>
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
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      {label}
    </label>
  );
}
