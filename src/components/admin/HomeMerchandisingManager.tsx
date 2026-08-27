"use client";

import { useMemo, useRef, useState } from "react";
import { Eye, EyeOff, GripVertical, Plus, RotateCcw, Search } from "lucide-react";
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

const HOME_BRAND_LIMIT = 10;

function key(value: string) {
  return value.trim().toLocaleLowerCase("pt-BR");
}

function normalizeSearch(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-BR")
    .trim();
}

function canonicalHiddenSet(brands: HomeBrand[], hiddenBrands: string[]) {
  const byKey = new Map(brands.map((brand) => [key(brand.name), brand.name]));
  return new Set(
    hiddenBrands
      .map((name) => byKey.get(key(name)) ?? name.trim())
      .filter(Boolean)
  );
}

function buildHomeBrands(
  brands: HomeBrand[],
  configuredOrder: string[],
  hidden: Set<string>,
  limit = HOME_BRAND_LIMIT
) {
  const byKey = new Map(brands.map((brand) => [key(brand.name), brand]));
  const hiddenKeys = new Set([...hidden].map(key));
  const configured = configuredOrder
    .map((name) => byKey.get(key(name)))
    .filter((brand): brand is HomeBrand => Boolean(brand))
    .filter((brand) => !hiddenKeys.has(key(brand.name)));
  const configuredKeys = new Set(configured.map((brand) => key(brand.name)));
  const automatic = brands
    .filter((brand) => !configuredKeys.has(key(brand.name)))
    .filter((brand) => !hiddenKeys.has(key(brand.name)))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, "pt-BR"));

  return [...configured, ...automatic].slice(0, limit);
}

function moveByKey<T>(items: T[], sourceKey: string, targetKey: string, getKey: (item: T) => string) {
  const from = items.findIndex((item) => getKey(item) === sourceKey);
  const to = items.findIndex((item) => getKey(item) === targetKey);
  if (from < 0 || to < 0 || from === to) return items;

  const next = [...items];
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  return next;
}

function sameOrder<T>(a: T[], b: T[], getKey: (item: T) => string) {
  return a.length === b.length && a.every((item, index) => getKey(item) === getKey(b[index]));
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
  const initialCategories = [...categories].sort(
    (a, b) => a.order - b.order || a.name.localeCompare(b.name, "pt-BR")
  );
  const initialHidden = canonicalHiddenSet(brands, hiddenBrands);
  const initialBrands = buildHomeBrands(brands, brandOrder, initialHidden);

  const [categoryItems, setCategoryItems] = useState(initialCategories);
  const [brandItems, setBrandItems] = useState(initialBrands);
  const [hidden, setHidden] = useState(initialHidden);
  const [brandQuery, setBrandQuery] = useState("");
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [notice, setNotice] = useState<Notice>(null);
  const [draggingCategoryId, setDraggingCategoryId] = useState<string | null>(null);
  const [draggingBrandName, setDraggingBrandName] = useState<string | null>(null);

  const categoryItemsRef = useRef(categoryItems);
  const brandItemsRef = useRef(brandItems);
  const categorySnapshotRef = useRef<HomeCategory[] | null>(null);
  const brandSnapshotRef = useRef<HomeBrand[] | null>(null);

  const brandSuggestions = useMemo(() => {
    const query = normalizeSearch(brandQuery);
    if (!query) return [];
    const selectedKeys = new Set(brandItems.map((brand) => key(brand.name)));

    return brands
      .filter((brand) => !selectedKeys.has(key(brand.name)))
      .filter((brand) => normalizeSearch(brand.name).includes(query))
      .slice(0, 6);
  }, [brandItems, brandQuery, brands]);

  function updateCategories(next: HomeCategory[]) {
    categoryItemsRef.current = next;
    setCategoryItems(next);
  }

  function updateBrands(next: HomeBrand[]) {
    brandItemsRef.current = next;
    setBrandItems(next);
  }

  async function save(payload: Record<string, unknown>) {
    const response = await fetch("/api/admin/home-merchandising", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error ?? "Não foi possível salvar a vitrine.");
  }

  function beginCategoryDrag(id: string) {
    if (savingKey) return;
    if (!categorySnapshotRef.current) categorySnapshotRef.current = [...categoryItemsRef.current];
    setDraggingCategoryId(id);
    setNotice(null);
  }

  function dragCategoryOver(targetId: string) {
    if (!draggingCategoryId || targetId === draggingCategoryId) return;
    const next = moveByKey(categoryItemsRef.current, draggingCategoryId, targetId, (item) => item.id);
    updateCategories(next);
  }

  async function finishCategoryDrag() {
    const previous = categorySnapshotRef.current;
    const next = categoryItemsRef.current;
    categorySnapshotRef.current = null;
    setDraggingCategoryId(null);
    if (!previous || sameOrder(previous, next, (item) => item.id)) return;

    setSavingKey("categories");
    try {
      await save({ categoryOrder: next.map((category) => category.id) });
      setNotice({ tone: "success", message: "Ordem das categorias atualizada na Home." });
    } catch (reason) {
      updateCategories(previous);
      setNotice({
        tone: "error",
        message: reason instanceof Error ? reason.message : "Não foi possível reordenar as categorias.",
      });
    } finally {
      setSavingKey(null);
    }
  }

  function handleCategoryTouchMove(event: React.TouchEvent) {
    if (!draggingCategoryId) return;
    event.preventDefault();
    const touch = event.touches[0];
    const target = document
      .elementFromPoint(touch.clientX, touch.clientY)
      ?.closest<HTMLElement>("[data-category-drag-id]");
    const targetId = target?.dataset.categoryDragId;
    if (targetId) dragCategoryOver(targetId);
  }

  async function toggleCategory(category: HomeCategory) {
    if (savingKey) return;
    const previous = categoryItemsRef.current;
    const nextValue = !category.showOnHome;
    const next = previous.map((item) =>
      item.id === category.id ? { ...item, showOnHome: nextValue } : item
    );
    updateCategories(next);
    setSavingKey(`category-${category.id}`);
    setNotice(null);

    try {
      await save({ categoryVisibility: { id: category.id, showOnHome: nextValue } });
      setNotice({
        tone: "success",
        message: `Categoria “${category.name}” ${nextValue ? "voltou para" : "foi retirada da"} Home.`,
      });
    } catch (reason) {
      updateCategories(previous);
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

  function beginBrandDrag(name: string) {
    if (savingKey) return;
    if (!brandSnapshotRef.current) brandSnapshotRef.current = [...brandItemsRef.current];
    setDraggingBrandName(name);
    setNotice(null);
  }

  function dragBrandOver(targetName: string) {
    if (!draggingBrandName || targetName === draggingBrandName) return;
    const next = moveByKey(brandItemsRef.current, key(draggingBrandName), key(targetName), (item) => key(item.name));
    updateBrands(next);
  }

  async function finishBrandDrag() {
    const previous = brandSnapshotRef.current;
    const next = brandItemsRef.current;
    brandSnapshotRef.current = null;
    setDraggingBrandName(null);
    if (!previous || sameOrder(previous, next, (item) => key(item.name))) return;

    setSavingKey("brands");
    try {
      await persistBrands(next, hidden, "Ordem das marcas atualizada na Home.");
    } catch (reason) {
      updateBrands(previous);
      setNotice({
        tone: "error",
        message: reason instanceof Error ? reason.message : "Não foi possível reordenar as marcas.",
      });
    } finally {
      setSavingKey(null);
    }
  }

  function handleBrandTouchMove(event: React.TouchEvent) {
    if (!draggingBrandName) return;
    event.preventDefault();
    const touch = event.touches[0];
    const target = document
      .elementFromPoint(touch.clientX, touch.clientY)
      ?.closest<HTMLElement>("[data-brand-drag-name]");
    const targetName = target?.dataset.brandDragName;
    if (targetName) dragBrandOver(targetName);
  }

  function fillBrands(current: HomeBrand[], nextHidden: Set<string>) {
    const currentKeys = new Set(current.map((brand) => key(brand.name)));
    const hiddenKeys = new Set([...nextHidden].map(key));
    const automatic = [...brands]
      .filter((brand) => !currentKeys.has(key(brand.name)))
      .filter((brand) => !hiddenKeys.has(key(brand.name)))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, "pt-BR"));
    return [...current, ...automatic].slice(0, HOME_BRAND_LIMIT);
  }

  async function addBrand(brand: HomeBrand) {
    if (savingKey) return;
    const previousBrands = brandItemsRef.current;
    const previousHidden = hidden;
    const nextHidden = new Set([...hidden].filter((name) => key(name) !== key(brand.name)));
    const next = fillBrands(
      [brand, ...previousBrands.filter((item) => key(item.name) !== key(brand.name))],
      nextHidden
    );

    updateBrands(next);
    setHidden(nextHidden);
    setBrandQuery("");
    setSavingKey("brands");
    setNotice(null);

    try {
      await persistBrands(next, nextHidden, `Marca “${brand.name}” colocada no topo da Home.`);
    } catch (reason) {
      updateBrands(previousBrands);
      setHidden(previousHidden);
      setNotice({
        tone: "error",
        message: reason instanceof Error ? reason.message : "Não foi possível destacar a marca.",
      });
    } finally {
      setSavingKey(null);
    }
  }

  async function hideBrand(brand: HomeBrand) {
    if (savingKey) return;
    const previousBrands = brandItemsRef.current;
    const previousHidden = hidden;
    const nextHidden = new Set(hidden);
    nextHidden.add(brand.name);
    const next = fillBrands(
      previousBrands.filter((item) => key(item.name) !== key(brand.name)),
      nextHidden
    );

    updateBrands(next);
    setHidden(nextHidden);
    setSavingKey(`brand-${brand.name}`);
    setNotice(null);

    try {
      await persistBrands(next, nextHidden, `Marca “${brand.name}” retirada da Home.`);
    } catch (reason) {
      updateBrands(previousBrands);
      setHidden(previousHidden);
      setNotice({
        tone: "error",
        message: reason instanceof Error ? reason.message : "Não foi possível retirar a marca.",
      });
    } finally {
      setSavingKey(null);
    }
  }

  async function resetBrandOrder() {
    if (savingKey) return;
    const previous = brandItemsRef.current;
    const automatic = buildHomeBrands(brands, [], hidden);
    updateBrands(automatic);
    setSavingKey("brands");
    setNotice(null);

    try {
      await save({ brandOrder: [], hiddenBrands: [...hidden] });
      setNotice({
        tone: "success",
        message: "Ordem manual removida. As marcas voltaram ao ranking automático por quantidade de produtos.",
      });
    } catch (reason) {
      updateBrands(previous);
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
          Arraste para ordenar o que aparece primeiro na Home. Isso não altera nem exclui o cadastro do catálogo.
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
              <p className="text-[10px] leading-4 text-cinza">Segure no ícone e arraste para mudar a posição.</p>
            </div>
            <span className="rounded-full bg-creme px-2.5 py-1 text-[10px] font-bold text-rosa-profundo">
              {categoryItems.filter((item) => item.showOnHome).length} visíveis
            </span>
          </div>

          <div className="divide-y divide-rosa/10 overflow-hidden rounded-xl border border-rosa/10">
            {categoryItems.map((category, index) => (
              <div
                key={category.id}
                data-category-drag-id={category.id}
                onDragEnter={() => dragCategoryOver(category.id)}
                onDragOver={(event) => event.preventDefault()}
                className={`flex items-center gap-2 p-2.5 transition ${
                  category.showOnHome ? "bg-white" : "bg-slate-50 opacity-65"
                } ${draggingCategoryId === category.id ? "bg-creme/70" : ""}`}
              >
                <button
                  type="button"
                  draggable={!savingKey}
                  onDragStart={() => beginCategoryDrag(category.id)}
                  onDragEnd={() => void finishCategoryDrag()}
                  onTouchStart={() => beginCategoryDrag(category.id)}
                  onTouchMove={handleCategoryTouchMove}
                  onTouchEnd={() => void finishCategoryDrag()}
                  disabled={Boolean(savingKey)}
                  className="flex h-8 w-8 shrink-0 cursor-grab touch-none items-center justify-center rounded-lg border border-rosa/15 text-cinza active:cursor-grabbing disabled:opacity-30"
                  aria-label={`Arrastar ${category.name}`}
                >
                  <GripVertical size={15} />
                </button>
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-creme text-[10px] font-bold text-rosa-profundo">
                  {index + 1}
                </span>
                <span className="min-w-0 flex-1 truncate text-xs font-bold text-texto">{category.name}</span>
                <button
                  type="button"
                  onClick={() => void toggleCategory(category)}
                  disabled={Boolean(savingKey)}
                  className={`inline-flex h-8 shrink-0 items-center gap-1 rounded-lg px-2 text-[10px] font-bold disabled:opacity-40 ${
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
              <p className="text-[10px] leading-4 text-cinza">Mostramos só as marcas que estão na vitrine, não a lista inteira do cadastro.</p>
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

          <p className="mb-2 text-[10px] leading-4 text-cinza">
            As opções vêm diretamente do campo <strong>Marca</strong> dos produtos ativos. Campo vazio ou “sem marca” não entra aqui.
          </p>

          <div className="relative mb-3">
            <div className="flex items-center gap-2 rounded-xl border border-rosa/15 bg-white px-3 py-2">
              <Search size={14} className="shrink-0 text-rosa-profundo" />
              <input
                value={brandQuery}
                onChange={(event) => setBrandQuery(event.target.value)}
                placeholder="Buscar outra marca cadastrada..."
                className="min-w-0 flex-1 bg-transparent text-xs text-texto outline-none"
              />
            </div>
            {brandSuggestions.length > 0 && (
              <div className="absolute left-0 right-0 z-20 mt-1 overflow-hidden rounded-xl border border-rosa/10 bg-white shadow-lg">
                {brandSuggestions.map((brand) => (
                  <button
                    key={brand.name}
                    type="button"
                    onClick={() => void addBrand(brand)}
                    disabled={Boolean(savingKey)}
                    className="flex w-full items-center gap-2 border-b border-rosa/10 px-3 py-2 text-left last:border-0 hover:bg-creme/60 disabled:opacity-40"
                  >
                    <Plus size={13} className="text-rosa-profundo" />
                    <span className="min-w-0 flex-1 truncate text-xs font-bold text-texto">{brand.name}</span>
                    <span className="text-[9px] text-cinza">{brand.count} produto{brand.count === 1 ? "" : "s"}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="mb-2 flex items-center justify-between text-[10px] text-cinza">
            <span>{brandItems.length} marcas na vitrine</span>
            <span>Arraste para priorizar</span>
          </div>

          <div className="divide-y divide-rosa/10 overflow-hidden rounded-xl border border-rosa/10">
            {brandItems.map((brand, index) => (
              <div
                key={brand.name}
                data-brand-drag-name={brand.name}
                onDragEnter={() => dragBrandOver(brand.name)}
                onDragOver={(event) => event.preventDefault()}
                className={`flex items-center gap-2 bg-white p-2.5 transition ${
                  draggingBrandName === brand.name ? "bg-creme/70" : ""
                }`}
              >
                <button
                  type="button"
                  draggable={!savingKey}
                  onDragStart={() => beginBrandDrag(brand.name)}
                  onDragEnd={() => void finishBrandDrag()}
                  onTouchStart={() => beginBrandDrag(brand.name)}
                  onTouchMove={handleBrandTouchMove}
                  onTouchEnd={() => void finishBrandDrag()}
                  disabled={Boolean(savingKey)}
                  className="flex h-8 w-8 shrink-0 cursor-grab touch-none items-center justify-center rounded-lg border border-rosa/15 text-cinza active:cursor-grabbing disabled:opacity-30"
                  aria-label={`Arrastar ${brand.name}`}
                >
                  <GripVertical size={15} />
                </button>
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-creme text-[10px] font-bold text-rosa-profundo">
                  {index + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-bold text-texto">{brand.name}</p>
                  <p className="text-[9px] text-cinza">{brand.count} produto{brand.count === 1 ? "" : "s"}</p>
                </div>
                <button
                  type="button"
                  onClick={() => void hideBrand(brand)}
                  disabled={Boolean(savingKey)}
                  className="inline-flex h-8 shrink-0 items-center gap-1 rounded-lg bg-slate-100 px-2 text-[10px] font-bold text-slate-600 disabled:opacity-40"
                  title="Retirar apenas da Home"
                >
                  <EyeOff size={13} /> Retirar
                </button>
              </div>
            ))}
            {brandItems.length === 0 && (
              <p className="p-4 text-xs text-cinza">Ainda não há marcas válidas preenchidas nos produtos ativos.</p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
