"use client";

import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, Eye, EyeOff, RotateCcw } from "lucide-react";
import { AdminNotice } from "@/components/admin/AdminUx";

type HomeCategory = {
  id: string;
  name: string;
  order: number;
  showOnHome: boolean;
};

type HomeBrand = {
  name: string;
  count: number;
};

type Notice = { tone: "success" | "error"; message: string } | null;

function buildInitialBrands(brands: HomeBrand[], configuredOrder: string[]) {
  const byName = new Map(brands.map((brand) => [brand.name, brand]));
  const configured = configuredOrder
    .map((name) => byName.get(name))
    .filter((brand): brand is HomeBrand => Boolean(brand));
  const configuredNames = new Set(configured.map((brand) => brand.name));
  const automatic = brands
    .filter((brand) => !configuredNames.has(brand.name))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, "pt-BR"));
  return [...configured, ...automatic];
}

export function HomeMerchandisingManager({
  categories,
  brands,
  brandOrder,
  hiddenBrands,
}: {
  categories: HomeCategory[];
  brands: HomeBrand[];
  brandOrder: string[];
  hiddenBrands: string[];
}) {
  const [categoryItems, setCategoryItems] = useState(
    [...categories].sort((a, b) => a.order - b.order || a.name.localeCompare(b.name, "pt-BR"))
  );
  const [brandItems, setBrandItems] = useState(() => buildInitialBrands(brands, brandOrder));
  const [hidden, setHidden] = useState(() => new Set(hiddenBrands));
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [notice, setNotice] = useState<Notice>(null);

  const visibleBrandCount = useMemo(
    () => brandItems.filter((brand) => !hidden.has(brand.name)).length,
    [brandItems, hidden]
  );

  async function save(payload: Record<string, unknown>) {
    const response = await fetch("/api/admin/home-merchandising", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error ?? "Não foi possível salvar a vitrine.");
  }

  async function moveCategory(index: number, direction: -1 | 1) {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= categoryItems.length || savingKey) return;

    const previous = categoryItems;
    const next = [...categoryItems];
    [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
    setCategoryItems(next);
    setSavingKey("categories");
    setNotice(null);

    try {
      await save({ categoryOrder: next.map((category) => category.id) });
      setNotice({ tone: "success", message: "Ordem das categorias atualizada na vitrine." });
    } catch (reason) {
      setCategoryItems(previous);
      setNotice({
        tone: "error",
        message: reason instanceof Error ? reason.message : "Não foi possível reordenar as categorias.",
      });
    } finally {
      setSavingKey(null);
    }
  }

  async function toggleCategory(category: HomeCategory) {
    if (savingKey) return;
    const previous = categoryItems;
    const nextValue = !category.showOnHome;
    setCategoryItems((current) =>
      current.map((item) => (item.id === category.id ? { ...item, showOnHome: nextValue } : item))
    );
    setSavingKey(`category-${category.id}`);
    setNotice(null);

    try {
      await save({ categoryVisibility: { id: category.id, showOnHome: nextValue } });
      setNotice({
        tone: "success",
        message: `Categoria “${category.name}” ${nextValue ? "voltou para" : "foi retirada da"} Home.`,
      });
    } catch (reason) {
      setCategoryItems(previous);
      setNotice({
        tone: "error",
        message: reason instanceof Error ? reason.message : "Não foi possível alterar a categoria.",
      });
    } finally {
      setSavingKey(null);
    }
  }

  async function persistBrands(nextBrands: HomeBrand[], nextHidden: Set<string>, successMessage: string) {
    await save({
      brandOrder: nextBrands.map((brand) => brand.name),
      hiddenBrands: [...nextHidden],
    });
    setNotice({ tone: "success", message: successMessage });
  }

  async function moveBrand(index: number, direction: -1 | 1) {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= brandItems.length || savingKey) return;

    const previous = brandItems;
    const next = [...brandItems];
    [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
    setBrandItems(next);
    setSavingKey("brands");
    setNotice(null);

    try {
      await persistBrands(next, hidden, "Ordem das marcas atualizada na Home.");
    } catch (reason) {
      setBrandItems(previous);
      setNotice({
        tone: "error",
        message: reason instanceof Error ? reason.message : "Não foi possível reordenar as marcas.",
      });
    } finally {
      setSavingKey(null);
    }
  }

  async function toggleBrand(brand: HomeBrand) {
    if (savingKey) return;
    const nextHidden = new Set(hidden);
    const willHide = !nextHidden.has(brand.name);
    if (willHide) nextHidden.add(brand.name);
    else nextHidden.delete(brand.name);

    const previous = hidden;
    setHidden(nextHidden);
    setSavingKey(`brand-${brand.name}`);
    setNotice(null);

    try {
      await persistBrands(
        brandItems,
        nextHidden,
        `Marca “${brand.name}” ${willHide ? "foi retirada da" : "voltou para a"} Home.`
      );
    } catch (reason) {
      setHidden(previous);
      setNotice({
        tone: "error",
        message: reason instanceof Error ? reason.message : "Não foi possível alterar a marca.",
      });
    } finally {
      setSavingKey(null);
    }
  }

  async function resetBrandOrder() {
    if (savingKey) return;
    const previous = brandItems;
    const automatic = [...brands].sort(
      (a, b) => b.count - a.count || a.name.localeCompare(b.name, "pt-BR")
    );
    setBrandItems(automatic);
    setSavingKey("brands");
    setNotice(null);

    try {
      await save({ brandOrder: [], hiddenBrands: [...hidden] });
      setNotice({
        tone: "success",
        message: "Ordem manual removida. As marcas voltaram ao ranking automático por quantidade de produtos.",
      });
    } catch (reason) {
      setBrandItems(previous);
      setNotice({
        tone: "error",
        message: reason instanceof Error ? reason.message : "Não foi possível restaurar a ordem automática.",
      });
    } finally {
      setSavingKey(null);
    }
  }

  return (
    <section className="mb-6 rounded-2xl border border-rosa/10 bg-white p-4 shadow-sm">
      <div className="mb-4">
        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-rosa-profundo">
          Vitrine da Home
        </p>
        <h2 className="mt-1 font-serif text-lg font-bold text-texto">Prioridade comercial</h2>
        <p className="mt-1 max-w-3xl text-xs leading-5 text-cinza">
          Defina o que aparece primeiro na Home sem desativar itens do catálogo. Use isso para tendências,
          campanhas, margem, estoque ou marcas que estejam em alta.
        </p>
      </div>

      {notice && (
        <AdminNotice tone={notice.tone} className="mb-4">
          {notice.message}
        </AdminNotice>
      )}

      <div className="grid gap-5 xl:grid-cols-2">
        <div>
          <div className="mb-2 flex items-end justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-texto">Categorias na Home</h3>
              <p className="text-[10px] leading-4 text-cinza">Suba, desça ou retire apenas da primeira página.</p>
            </div>
            <span className="rounded-full bg-creme px-2.5 py-1 text-[10px] font-bold text-rosa-profundo">
              {categoryItems.filter((item) => item.showOnHome).length} visíveis
            </span>
          </div>

          <div className="divide-y divide-rosa/10 overflow-hidden rounded-xl border border-rosa/10">
            {categoryItems.map((category, index) => (
              <div key={category.id} className={`flex items-center gap-2 p-2.5 ${category.showOnHome ? "bg-white" : "bg-slate-50 opacity-65"}`}>
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-creme text-[10px] font-bold text-rosa-profundo">
                  {index + 1}
                </span>
                <span className="min-w-0 flex-1 truncate text-xs font-bold text-texto">{category.name}</span>
                <button
                  type="button"
                  onClick={() => void moveCategory(index, -1)}
                  disabled={index === 0 || Boolean(savingKey)}
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-rosa/15 text-cinza disabled:opacity-30"
                  aria-label={`Subir ${category.name}`}
                >
                  <ArrowUp size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => void moveCategory(index, 1)}
                  disabled={index === categoryItems.length - 1 || Boolean(savingKey)}
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-rosa/15 text-cinza disabled:opacity-30"
                  aria-label={`Descer ${category.name}`}
                >
                  <ArrowDown size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => void toggleCategory(category)}
                  disabled={Boolean(savingKey)}
                  className={`inline-flex h-8 items-center gap-1 rounded-lg px-2 text-[10px] font-bold disabled:opacity-40 ${
                    category.showOnHome ? "bg-green-50 text-green-700" : "bg-slate-200 text-slate-600"
                  }`}
                >
                  {category.showOnHome ? <Eye size={13} /> : <EyeOff size={13} />}
                  {category.showOnHome ? "Na Home" : "Oculta"}
                </button>
              </div>
            ))}
          </div>
        </div>

        <div>
          <div className="mb-2 flex items-end justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-texto">Marcas na Home</h3>
              <p className="text-[10px] leading-4 text-cinza">A ordem manual vence o ranking automático da vitrine.</p>
            </div>
            <button
              type="button"
              onClick={() => void resetBrandOrder()}
              disabled={Boolean(savingKey)}
              className="inline-flex items-center gap-1 rounded-lg border border-rosa/15 px-2 py-1.5 text-[10px] font-bold text-rosa-profundo disabled:opacity-40"
            >
              <RotateCcw size={12} /> Automática
            </button>
          </div>

          <div className="mb-2 flex items-center justify-between text-[10px] text-cinza">
            <span>{visibleBrandCount} marcas habilitadas</span>
            <span>As primeiras aparecem no carrossel</span>
          </div>

          <div className="max-h-[430px] divide-y divide-rosa/10 overflow-y-auto rounded-xl border border-rosa/10">
            {brandItems.map((brand, index) => {
              const isHidden = hidden.has(brand.name);
              return (
                <div key={brand.name} className={`flex items-center gap-2 p-2.5 ${isHidden ? "bg-slate-50 opacity-65" : "bg-white"}`}>
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-creme text-[10px] font-bold text-rosa-profundo">
                    {index + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-bold text-texto">{brand.name}</p>
                    <p className="text-[9px] text-cinza">{brand.count} produto{brand.count === 1 ? "" : "s"}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => void moveBrand(index, -1)}
                    disabled={index === 0 || Boolean(savingKey)}
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-rosa/15 text-cinza disabled:opacity-30"
                    aria-label={`Subir ${brand.name}`}
                  >
                    <ArrowUp size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => void moveBrand(index, 1)}
                    disabled={index === brandItems.length - 1 || Boolean(savingKey)}
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-rosa/15 text-cinza disabled:opacity-30"
                    aria-label={`Descer ${brand.name}`}
                  >
                    <ArrowDown size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => void toggleBrand(brand)}
                    disabled={Boolean(savingKey)}
                    className={`inline-flex h-8 items-center gap-1 rounded-lg px-2 text-[10px] font-bold disabled:opacity-40 ${
                      isHidden ? "bg-slate-200 text-slate-600" : "bg-green-50 text-green-700"
                    }`}
                  >
                    {isHidden ? <EyeOff size={13} /> : <Eye size={13} />}
                    {isHidden ? "Oculta" : "Na Home"}
                  </button>
                </div>
              );
            })}
            {brandItems.length === 0 && (
              <p className="p-4 text-xs text-cinza">Ainda não há marcas cadastradas nos produtos.</p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
