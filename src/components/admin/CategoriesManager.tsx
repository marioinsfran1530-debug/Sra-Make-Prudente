"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Category = {
  id: string;
  name: string;
  active: boolean;
  order: number;
  subcategories: { id: string; name: string }[];
};

export function CategoriesManager({ categories }: { categories: Category[] }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    await fetch("/api/admin/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, order: categories.length }),
    });
    setName("");
    setSaving(false);
    router.refresh();
  }

  async function toggleActive(cat: Category) {
    await fetch(`/api/admin/categories/${cat.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: cat.name, order: cat.order, active: !cat.active }),
    });
    router.refresh();
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

      <div className="flex flex-col gap-2">
        {categories.map((c) => (
          <div
            key={c.id}
            className="flex items-center justify-between bg-white rounded-xl p-3"
            style={{ boxShadow: "0 2px 10px rgba(35,20,42,0.06)", opacity: c.active ? 1 : 0.5 }}
          >
            <div>
              <p className="text-sm font-bold text-texto">{c.name}</p>
              <p className="text-xs text-cinza">{c.subcategories.length} subcategorias</p>
            </div>
            <button
              onClick={() => toggleActive(c)}
              className="text-xs font-bold px-3 py-1.5 rounded-full border border-rosa/20 text-texto"
            >
              {c.active ? "Desativar" : "Ativar"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
