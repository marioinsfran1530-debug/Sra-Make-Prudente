"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Grid2X2, List } from "lucide-react";

type Subcategory = {
  id: string;
  name: string;
};

type Category = {
  id: string;
  name: string;
  active: boolean;
  order: number;
  subcategories: Subcategory[];
};

export function CategoriesManager({
  categories,
}: {
  categories: Category[];
}) {
  const router = useRouter();

  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);

  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");
  const [perPage, setPerPage] = useState(10);
  const [page, setPage] = useState(1);

  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [editingCategoryName, setEditingCategoryName] = useState("");

  const [expandedCategoryId, setExpandedCategoryId] = useState<string | null>(null);
  const [newSubcategoryName, setNewSubcategoryName] = useState("");

  const [editingSubcategoryId, setEditingSubcategoryId] =
    useState<string | null>(null);
  const [editingSubcategoryName, setEditingSubcategoryName] = useState("");

  const [error, setError] = useState<string | null>(null);

  const filteredCategories = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return categories.filter((category) => {
      const matchesQuery =
        !normalizedQuery ||
        category.name.toLowerCase().includes(normalizedQuery) ||
        category.subcategories.some((subcategory) =>
          subcategory.name.toLowerCase().includes(normalizedQuery)
        );

      const matchesStatus =
        !statusFilter ||
        (statusFilter === "active" && category.active) ||
        (statusFilter === "inactive" && !category.active);

      return matchesQuery && matchesStatus;
    });
  }, [categories, query, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredCategories.length / perPage));
  const safePage = Math.min(page, totalPages);
  const visibleCategories = filteredCategories.slice(
    (safePage - 1) * perPage,
    safePage * perPage
  );

  async function apiRequest(url: string, options: RequestInit) {
    const res = await fetch(url, options);
    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      throw new Error(data.error ?? "Não foi possível concluir a operação.");
    }

    return data;
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;

    setSaving(true);
    setError(null);

    try {
      await apiRequest("/api/admin/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), order: categories.length }),
      });
      setName("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível criar a categoria.");
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(cat: Category) {
    setError(null);
    try {
      await apiRequest(`/api/admin/categories/${cat.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: !cat.active }),
      });
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível alterar a categoria.");
    }
  }

  function startEditCategory(cat: Category) {
    setEditingCategoryId(cat.id);
    setEditingCategoryName(cat.name);
    setError(null);
  }

  async function saveCategory(cat: Category) {
    const newName = editingCategoryName.trim();
    if (!newName) return;

    setSaving(true);
    setError(null);

    try {
      await apiRequest(`/api/admin/categories/${cat.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName }),
      });
      setEditingCategoryId(null);
      setEditingCategoryName("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível editar a categoria.");
    } finally {
      setSaving(false);
    }
  }

  function toggleSubcategories(categoryId: string) {
    setExpandedCategoryId((current) => (current === categoryId ? null : categoryId));
    setNewSubcategoryName("");
    setEditingSubcategoryId(null);
    setEditingSubcategoryName("");
    setError(null);
  }

  async function createSubcategory(categoryId: string) {
    const subName = newSubcategoryName.trim();
    if (!subName) return;

    setSaving(true);
    setError(null);

    try {
      await apiRequest("/api/admin/subcategories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: subName, categoryId }),
      });
      setNewSubcategoryName("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível criar a subcategoria.");
    } finally {
      setSaving(false);
    }
  }

  function startEditSubcategory(subcategory: Subcategory) {
    setEditingSubcategoryId(subcategory.id);
    setEditingSubcategoryName(subcategory.name);
    setError(null);
  }

  async function saveSubcategory(subcategory: Subcategory) {
    const subName = editingSubcategoryName.trim();
    if (!subName) return;

    setSaving(true);
    setError(null);

    try {
      await apiRequest(`/api/admin/subcategories/${subcategory.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: subName }),
      });
      setEditingSubcategoryId(null);
      setEditingSubcategoryName("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível editar a subcategoria.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteSubcategory(subcategory: Subcategory) {
    const confirmed = window.confirm(
      `Excluir a subcategoria "${subcategory.name}"?\n\nOs produtos não serão apagados. Eles apenas ficarão sem esta subcategoria.`
    );
    if (!confirmed) return;

    setSaving(true);
    setError(null);

    try {
      const data = await apiRequest(`/api/admin/subcategories/${subcategory.id}`, {
        method: "DELETE",
      });
      setEditingSubcategoryId(null);
      setEditingSubcategoryName("");
      router.refresh();

      if (Number(data.detachedProducts) > 0) {
        window.alert(
          `Subcategoria excluída. ${data.detachedProducts} produto(s) foram mantidos e ficaram sem subcategoria.`
        );
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível excluir a subcategoria.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <form onSubmit={handleCreate} className="flex gap-2 mb-4">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nome da nova categoria"
          className="flex-1 rounded-full border border-rosa/20 px-4 py-2 text-sm outline-none"
        />
        <button
          type="submit"
          disabled={saving}
          className="text-xs font-bold px-4 py-2 rounded-full text-white disabled:opacity-50"
          style={{ backgroundColor: "#E4127B" }}
        >
          Adicionar
        </button>
      </form>

      {error && (
        <p className="mb-3 rounded-xl bg-red-50 border border-red-200 px-3 py-2 text-xs font-semibold text-red-700">
          {error}
        </p>
      )}

      <div className="flex flex-col gap-3 mb-4">
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(1);
            }}
            placeholder="Buscar categoria ou subcategoria..."
            className="flex-1 rounded-xl border border-rosa/20 px-4 py-2.5 text-sm outline-none bg-white"
          />
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="rounded-xl border border-rosa/20 px-3 py-2.5 text-xs bg-white"
          >
            <option value="">Ativas e inativas</option>
            <option value="active">Ativas</option>
            <option value="inactive">Inativas</option>
          </select>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <select
              value={perPage}
              onChange={(e) => {
                setPerPage(Number(e.target.value));
                setPage(1);
              }}
              className="rounded-xl border border-rosa/20 px-3 py-2 text-xs bg-white"
            >
              <option value={10}>10 por página</option>
              <option value={30}>30 por página</option>
              <option value={50}>50 por página</option>
            </select>
            <button
              type="button"
              onClick={() => setViewMode("list")}
              className={`w-10 h-9 rounded-xl border flex items-center justify-center ${
                viewMode === "list"
                  ? "border-rosa-profundo text-rosa-profundo bg-rosa/5"
                  : "border-rosa/20 text-cinza bg-white"
              }`}
              title="Visualização em lista"
            >
              <List size={16} />
            </button>
            <button
              type="button"
              onClick={() => setViewMode("grid")}
              className={`w-10 h-9 rounded-xl border flex items-center justify-center ${
                viewMode === "grid"
                  ? "border-rosa-profundo text-rosa-profundo bg-rosa/5"
                  : "border-rosa/20 text-cinza bg-white"
              }`}
              title="Visualização em grade"
            >
              <Grid2X2 size={16} />
            </button>
          </div>

          <div className="flex items-center gap-3">
            <p className="text-[11px] text-cinza">
              {filteredCategories.length} categoria{filteredCategories.length === 1 ? "" : "s"} encontrada{filteredCategories.length === 1 ? "" : "s"}
            </p>
            {(query || statusFilter) && (
              <button
                type="button"
                onClick={() => {
                  setQuery("");
                  setStatusFilter("");
                  setPage(1);
                }}
                className="text-[11px] font-bold text-rosa-profundo"
              >
                Limpar filtros
              </button>
            )}
          </div>
        </div>
      </div>

      <div className={viewMode === "grid" ? "grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3" : "flex flex-col gap-3"}>
        {visibleCategories.map((cat) => {
          const expanded = expandedCategoryId === cat.id;
          return (
            <div
              key={cat.id}
              className="bg-white rounded-xl overflow-hidden"
              style={{ boxShadow: "0 2px 10px rgba(35,20,42,0.06)", opacity: cat.active ? 1 : 0.6 }}
            >
              <div className="p-3">
                {editingCategoryId === cat.id ? (
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      value={editingCategoryName}
                      onChange={(e) => setEditingCategoryName(e.target.value)}
                      autoFocus
                      className="flex-1 rounded-xl border border-rosa/20 px-3 py-2 text-sm outline-none"
                    />
                    <button type="button" onClick={() => saveCategory(cat)} disabled={saving} className="text-xs font-bold px-3 py-2 rounded-xl text-white disabled:opacity-50" style={{ backgroundColor: "#E4127B" }}>
                      Salvar
                    </button>
                    <button type="button" onClick={() => { setEditingCategoryId(null); setEditingCategoryName(""); }} className="text-xs font-bold px-3 py-2 rounded-xl border border-rosa/20 text-texto">
                      Cancelar
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                    <div className="flex-1">
                      <p className="text-sm font-bold text-texto">{cat.name}</p>
                      <p className="text-xs text-cinza">{cat.subcategories.length} {cat.subcategories.length === 1 ? "subcategoria" : "subcategorias"}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button type="button" onClick={() => startEditCategory(cat)} className="text-xs font-bold px-3 py-1.5 rounded-full border border-rosa/20 text-texto">Editar</button>
                      <button type="button" onClick={() => toggleSubcategories(cat.id)} className="text-xs font-bold px-3 py-1.5 rounded-full border border-rosa/20 text-rosa-profundo">{expanded ? "Fechar" : "Subcategorias"}</button>
                      <button type="button" onClick={() => toggleActive(cat)} className="text-xs font-bold px-3 py-1.5 rounded-full border border-rosa/20 text-texto">{cat.active ? "Desativar" : "Ativar"}</button>
                    </div>
                  </div>
                )}
              </div>

              {expanded && (
                <div className="border-t border-rosa/10 p-3 bg-creme/40">
                  <p className="text-xs font-bold text-texto mb-3">Subcategorias de {cat.name}</p>
                  <div className="flex flex-col gap-2 mb-3">
                    {cat.subcategories.map((subcategory) => (
                      <div key={subcategory.id} className="bg-white rounded-xl border border-rosa/10 p-3">
                        {editingSubcategoryId === subcategory.id ? (
                          <div className="flex flex-col sm:flex-row gap-2">
                            <input
                              value={editingSubcategoryName}
                              onChange={(e) => setEditingSubcategoryName(e.target.value)}
                              autoFocus
                              className="flex-1 rounded-xl border border-rosa/20 px-3 py-2 text-sm outline-none"
                            />
                            <button type="button" onClick={() => saveSubcategory(subcategory)} disabled={saving} className="text-xs font-bold px-3 py-2 rounded-xl text-white disabled:opacity-50" style={{ backgroundColor: "#E4127B" }}>Salvar</button>
                            <button type="button" onClick={() => { setEditingSubcategoryId(null); setEditingSubcategoryName(""); }} className="text-xs font-bold px-3 py-2 rounded-xl border border-rosa/20 text-texto">Cancelar</button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between gap-3">
                            <span className="text-sm font-semibold text-texto">{subcategory.name}</span>
                            <div className="flex items-center gap-3">
                              <button type="button" onClick={() => startEditSubcategory(subcategory)} className="text-xs font-bold text-rosa-profundo">Editar</button>
                              <button type="button" onClick={() => void deleteSubcategory(subcategory)} disabled={saving} className="text-xs font-bold text-vermelho disabled:opacity-50">Excluir</button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                    {cat.subcategories.length === 0 && <p className="text-xs text-cinza">Nenhuma subcategoria cadastrada.</p>}
                  </div>

                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      value={newSubcategoryName}
                      onChange={(e) => setNewSubcategoryName(e.target.value)}
                      placeholder="Nome da nova subcategoria"
                      className="flex-1 rounded-xl border border-rosa/20 px-3 py-2 text-sm outline-none bg-white"
                    />
                    <button type="button" onClick={() => createSubcategory(cat.id)} disabled={saving} className="text-xs font-bold px-4 py-2 rounded-xl text-white disabled:opacity-50" style={{ backgroundColor: "#131B33" }}>
                      + Adicionar subcategoria
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {visibleCategories.length === 0 && (
          <div className="rounded-xl bg-white p-6">
            <p className="text-xs text-cinza">Nenhuma categoria encontrada com esses filtros.</p>
          </div>
        )}
      </div>

      {filteredCategories.length > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mt-5">
          <p className="text-[11px] text-cinza">Página {safePage} de {totalPages}</p>
          <div className="flex items-center gap-2">
            <button type="button" disabled={safePage <= 1} onClick={() => setPage((current) => Math.max(1, current - 1))} className="text-xs font-bold px-3 py-2 rounded-xl border border-rosa/20 disabled:opacity-40">Anterior</button>
            <span className="text-xs font-bold text-texto px-2">{safePage}</span>
            <button type="button" disabled={safePage >= totalPages} onClick={() => setPage((current) => Math.min(totalPages, current + 1))} className="text-xs font-bold px-3 py-2 rounded-xl border border-rosa/20 disabled:opacity-40">Próxima</button>
          </div>
        </div>
      )}
    </div>
  );
}
