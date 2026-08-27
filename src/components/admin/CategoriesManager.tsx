"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Grid2X2, List } from "lucide-react";
import { AdminNotice, ConfirmDialog } from "@/components/admin/AdminUx";

type Subcategory = { id: string; name: string };
type Category = {
  id: string;
  name: string;
  active: boolean;
  order: number;
  subcategories: Subcategory[];
};
type Notice = { tone: "success" | "error"; message: string } | null;

export function CategoriesManager({ categories }: { categories: Category[] }) {
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
  const [editingSubcategoryId, setEditingSubcategoryId] = useState<string | null>(null);
  const [editingSubcategoryName, setEditingSubcategoryName] = useState("");
  const [pendingDelete, setPendingDelete] = useState<Subcategory | null>(null);
  const [notice, setNotice] = useState<Notice>(null);

  const filteredCategories = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase("pt-BR");
    return categories.filter((category) => {
      const matchesQuery =
        !normalizedQuery ||
        category.name.toLocaleLowerCase("pt-BR").includes(normalizedQuery) ||
        category.subcategories.some((subcategory) =>
          subcategory.name.toLocaleLowerCase("pt-BR").includes(normalizedQuery)
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
    if (!res.ok) throw new Error(data.error ?? "Não foi possível concluir a operação.");
    return data;
  }

  function showError(reason: unknown, fallback: string) {
    setNotice({ tone: "error", message: reason instanceof Error ? reason.message : fallback });
  }

  async function handleCreate(event: React.FormEvent) {
    event.preventDefault();
    const nextName = name.trim();
    if (!nextName) return;
    setSaving(true);
    setNotice(null);
    try {
      await apiRequest("/api/admin/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: nextName, order: categories.length }),
      });
      setName("");
      setNotice({ tone: "success", message: `Categoria “${nextName}” criada.` });
      router.refresh();
    } catch (reason) {
      showError(reason, "Não foi possível criar a categoria.");
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(category: Category) {
    setNotice(null);
    try {
      await apiRequest(`/api/admin/categories/${category.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: !category.active }),
      });
      setNotice({
        tone: "success",
        message: `Categoria “${category.name}” ${category.active ? "desativada" : "ativada"}.`,
      });
      router.refresh();
    } catch (reason) {
      showError(reason, "Não foi possível alterar a categoria.");
    }
  }

  function startEditCategory(category: Category) {
    setEditingCategoryId(category.id);
    setEditingCategoryName(category.name);
    setNotice(null);
  }

  async function saveCategory(category: Category) {
    const nextName = editingCategoryName.trim();
    if (!nextName) return;
    setSaving(true);
    setNotice(null);
    try {
      await apiRequest(`/api/admin/categories/${category.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: nextName }),
      });
      setEditingCategoryId(null);
      setEditingCategoryName("");
      setNotice({ tone: "success", message: `Categoria atualizada para “${nextName}”.` });
      router.refresh();
    } catch (reason) {
      showError(reason, "Não foi possível editar a categoria.");
    } finally {
      setSaving(false);
    }
  }

  function toggleSubcategories(categoryId: string) {
    setExpandedCategoryId((current) => (current === categoryId ? null : categoryId));
    setNewSubcategoryName("");
    setEditingSubcategoryId(null);
    setEditingSubcategoryName("");
    setNotice(null);
  }

  async function createSubcategory(categoryId: string) {
    const subName = newSubcategoryName.trim();
    if (!subName) return;
    setSaving(true);
    setNotice(null);
    try {
      await apiRequest("/api/admin/subcategories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: subName, categoryId }),
      });
      setNewSubcategoryName("");
      setNotice({ tone: "success", message: `Subcategoria “${subName}” criada.` });
      router.refresh();
    } catch (reason) {
      showError(reason, "Não foi possível criar a subcategoria.");
    } finally {
      setSaving(false);
    }
  }

  function startEditSubcategory(subcategory: Subcategory) {
    setEditingSubcategoryId(subcategory.id);
    setEditingSubcategoryName(subcategory.name);
    setNotice(null);
  }

  async function saveSubcategory(subcategory: Subcategory) {
    const subName = editingSubcategoryName.trim();
    if (!subName) return;
    setSaving(true);
    setNotice(null);
    try {
      await apiRequest(`/api/admin/subcategories/${subcategory.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: subName }),
      });
      setEditingSubcategoryId(null);
      setEditingSubcategoryName("");
      setNotice({ tone: "success", message: `Subcategoria atualizada para “${subName}”.` });
      router.refresh();
    } catch (reason) {
      showError(reason, "Não foi possível editar a subcategoria.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteSubcategory() {
    if (!pendingDelete) return;
    const subcategory = pendingDelete;
    setSaving(true);
    setNotice(null);
    try {
      const data = await apiRequest(`/api/admin/subcategories/${subcategory.id}`, {
        method: "DELETE",
      });
      setEditingSubcategoryId(null);
      setEditingSubcategoryName("");
      setPendingDelete(null);
      const detached = Number(data.detachedProducts) || 0;
      setNotice({
        tone: "success",
        message:
          detached > 0
            ? `Subcategoria “${subcategory.name}” excluída. ${detached} produto${detached === 1 ? " foi mantido" : "s foram mantidos"} sem essa subcategoria.`
            : `Subcategoria “${subcategory.name}” excluída.`,
      });
      router.refresh();
    } catch (reason) {
      showError(reason, "Não foi possível excluir a subcategoria.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <form onSubmit={handleCreate} className="mb-4 flex gap-2">
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Nome da nova categoria"
          className="flex-1 rounded-full border border-rosa/20 px-4 py-2 text-sm outline-none"
        />
        <button type="submit" disabled={saving} className="rounded-full px-4 py-2 text-xs font-bold text-white disabled:opacity-50" style={{ backgroundColor: "#E4127B" }}>
          Adicionar
        </button>
      </form>

      {notice && <AdminNotice tone={notice.tone} className="mb-3">{notice.message}</AdminNotice>}

      <div className="mb-4 flex flex-col gap-3">
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            value={query}
            onChange={(event) => { setQuery(event.target.value); setPage(1); }}
            placeholder="Buscar categoria ou subcategoria..."
            className="flex-1 rounded-xl border border-rosa/20 bg-white px-4 py-2.5 text-sm outline-none"
          />
          <select
            value={statusFilter}
            onChange={(event) => { setStatusFilter(event.target.value); setPage(1); }}
            className="rounded-xl border border-rosa/20 bg-white px-3 py-2.5 text-xs"
          >
            <option value="">Ativas e inativas</option>
            <option value="active">Ativas</option>
            <option value="inactive">Inativas</option>
          </select>
        </div>

        <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
          <div className="flex items-center gap-2">
            <select value={perPage} onChange={(event) => { setPerPage(Number(event.target.value)); setPage(1); }} className="rounded-xl border border-rosa/20 bg-white px-3 py-2 text-xs">
              <option value={10}>10 por página</option>
              <option value={30}>30 por página</option>
              <option value={50}>50 por página</option>
            </select>
            <ViewButton active={viewMode === "list"} onClick={() => setViewMode("list")} title="Visualização em lista"><List size={16} /></ViewButton>
            <ViewButton active={viewMode === "grid"} onClick={() => setViewMode("grid")} title="Visualização em grade"><Grid2X2 size={16} /></ViewButton>
          </div>

          <div className="flex items-center gap-3">
            <p className="text-[11px] text-cinza">{filteredCategories.length} categoria{filteredCategories.length === 1 ? "" : "s"} encontrada{filteredCategories.length === 1 ? "" : "s"}</p>
            {(query || statusFilter) && (
              <button type="button" onClick={() => { setQuery(""); setStatusFilter(""); setPage(1); }} className="text-[11px] font-bold text-rosa-profundo">Limpar filtros</button>
            )}
          </div>
        </div>
      </div>

      <div className={viewMode === "grid" ? "grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3" : "flex flex-col gap-3"}>
        {visibleCategories.map((category) => {
          const expanded = expandedCategoryId === category.id;
          return (
            <div key={category.id} className="overflow-hidden rounded-xl bg-white" style={{ boxShadow: "0 2px 10px rgba(35,20,42,0.06)", opacity: category.active ? 1 : 0.6 }}>
              <div className="p-3">
                {editingCategoryId === category.id ? (
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <input value={editingCategoryName} onChange={(event) => setEditingCategoryName(event.target.value)} autoFocus className="flex-1 rounded-xl border border-rosa/20 px-3 py-2 text-sm outline-none" />
                    <button type="button" onClick={() => void saveCategory(category)} disabled={saving} className="rounded-xl px-3 py-2 text-xs font-bold text-white disabled:opacity-50" style={{ backgroundColor: "#E4127B" }}>Salvar</button>
                    <button type="button" onClick={() => { setEditingCategoryId(null); setEditingCategoryName(""); }} className="rounded-xl border border-rosa/20 px-3 py-2 text-xs font-bold text-texto">Cancelar</button>
                  </div>
                ) : (
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                    <div className="flex-1">
                      <p className="text-sm font-bold text-texto">{category.name}</p>
                      <p className="text-xs text-cinza">{category.subcategories.length} {category.subcategories.length === 1 ? "subcategoria" : "subcategorias"}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button type="button" onClick={() => startEditCategory(category)} className="rounded-full border border-rosa/20 px-3 py-1.5 text-xs font-bold text-texto">Editar</button>
                      <button type="button" onClick={() => toggleSubcategories(category.id)} className="rounded-full border border-rosa/20 px-3 py-1.5 text-xs font-bold text-rosa-profundo">{expanded ? "Fechar" : "Subcategorias"}</button>
                      <button type="button" onClick={() => void toggleActive(category)} className="rounded-full border border-rosa/20 px-3 py-1.5 text-xs font-bold text-texto">{category.active ? "Desativar" : "Ativar"}</button>
                    </div>
                  </div>
                )}
              </div>

              {expanded && (
                <div className="border-t border-rosa/10 bg-creme/40 p-3">
                  <p className="mb-3 text-xs font-bold text-texto">Subcategorias de {category.name}</p>
                  <div className="mb-3 flex flex-col gap-2">
                    {category.subcategories.map((subcategory) => (
                      <div key={subcategory.id} className="rounded-xl border border-rosa/10 bg-white p-3">
                        {editingSubcategoryId === subcategory.id ? (
                          <div className="flex flex-col gap-2 sm:flex-row">
                            <input value={editingSubcategoryName} onChange={(event) => setEditingSubcategoryName(event.target.value)} autoFocus className="flex-1 rounded-xl border border-rosa/20 px-3 py-2 text-sm outline-none" />
                            <button type="button" onClick={() => void saveSubcategory(subcategory)} disabled={saving} className="rounded-xl px-3 py-2 text-xs font-bold text-white disabled:opacity-50" style={{ backgroundColor: "#E4127B" }}>Salvar</button>
                            <button type="button" onClick={() => { setEditingSubcategoryId(null); setEditingSubcategoryName(""); }} className="rounded-xl border border-rosa/20 px-3 py-2 text-xs font-bold text-texto">Cancelar</button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between gap-3">
                            <span className="text-sm font-semibold text-texto">{subcategory.name}</span>
                            <div className="flex items-center gap-3">
                              <button type="button" onClick={() => startEditSubcategory(subcategory)} className="text-xs font-bold text-rosa-profundo">Editar</button>
                              <button type="button" onClick={() => setPendingDelete(subcategory)} disabled={saving} className="text-xs font-bold text-vermelho disabled:opacity-50">Excluir</button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                    {category.subcategories.length === 0 && <p className="text-xs text-cinza">Nenhuma subcategoria cadastrada.</p>}
                  </div>

                  <div className="flex flex-col gap-2 sm:flex-row">
                    <input value={newSubcategoryName} onChange={(event) => setNewSubcategoryName(event.target.value)} placeholder="Nome da nova subcategoria" className="flex-1 rounded-xl border border-rosa/20 bg-white px-3 py-2 text-sm outline-none" />
                    <button type="button" onClick={() => void createSubcategory(category.id)} disabled={saving} className="rounded-xl px-4 py-2 text-xs font-bold text-white disabled:opacity-50" style={{ backgroundColor: "#131B33" }}>+ Adicionar subcategoria</button>
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {visibleCategories.length === 0 && <div className="rounded-xl bg-white p-6"><p className="text-xs text-cinza">Nenhuma categoria encontrada com esses filtros.</p></div>}
      </div>

      {filteredCategories.length > 0 && (
        <div className="mt-5 flex flex-col items-center justify-between gap-3 sm:flex-row">
          <p className="text-[11px] text-cinza">Página {safePage} de {totalPages}</p>
          <div className="flex items-center gap-2">
            <button type="button" disabled={safePage <= 1} onClick={() => setPage((current) => Math.max(1, current - 1))} className="rounded-xl border border-rosa/20 px-3 py-2 text-xs font-bold disabled:opacity-40">Anterior</button>
            <span className="px-2 text-xs font-bold text-texto">{safePage}</span>
            <button type="button" disabled={safePage >= totalPages} onClick={() => setPage((current) => Math.min(totalPages, current + 1))} className="rounded-xl border border-rosa/20 px-3 py-2 text-xs font-bold disabled:opacity-40">Próxima</button>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title="Excluir subcategoria?"
        message={pendingDelete ? `Excluir “${pendingDelete.name}”?\n\nOs produtos não serão apagados. Eles apenas ficarão sem esta subcategoria.` : ""}
        confirmLabel="Excluir subcategoria"
        danger
        busy={saving}
        onCancel={() => { if (!saving) setPendingDelete(null); }}
        onConfirm={deleteSubcategory}
      />
    </div>
  );
}

function ViewButton({ active, title, onClick, children }: { active: boolean; title: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} className={`flex h-9 w-10 items-center justify-center rounded-xl border ${active ? "border-rosa-profundo bg-rosa/5 text-rosa-profundo" : "border-rosa/20 bg-white text-cinza"}`} title={title}>
      {children}
    </button>
  );
}
