"use client";

import { useEffect, useState } from "react";
import { AdminNotice, ConfirmDialog } from "@/components/admin/AdminUx";

type User = {
  id: string;
  email: string;
  name: string | null;
  role: "ADMIN" | "EDITOR";
  active: boolean;
  createdAt: string;
};

export default function UsersManager() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"ADMIN" | "EDITOR">("EDITOR");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editRole, setEditRole] = useState<"ADMIN" | "EDITOR">("EDITOR");
  const [editActive, setEditActive] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<User | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function loadUsers() {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/usuarios");
      if (!response.ok) throw new Error("Não foi possível carregar os usuários.");
      const data = await response.json();
      setUsers(data);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Não foi possível carregar os usuários.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadUsers();
  }, []);

  async function createUser(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setMessage(null);

    try {
      const response = await fetch("/api/admin/usuarios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, role }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error ?? "Erro ao criar usuário.");

      setName("");
      setEmail("");
      setRole("EDITOR");
      setMessage("Usuário criado. Ele poderá definir a senha pelo fluxo de recuperação.");
      await loadUsers();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Erro ao criar usuário.");
    } finally {
      setSaving(false);
    }
  }

  function startEdit(user: User) {
    setEditingId(user.id);
    setEditName(user.name ?? "");
    setEditEmail(user.email);
    setEditRole(user.role);
    setEditActive(user.active);
    setError(null);
    setMessage(null);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditName("");
    setEditEmail("");
    setEditRole("EDITOR");
    setEditActive(true);
  }

  async function saveUser(userId: string) {
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const response = await fetch(`/api/admin/usuarios/${userId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editName,
          email: editEmail,
          role: editRole,
          active: editActive,
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error ?? "Não foi possível editar o usuário.");

      cancelEdit();
      setMessage("Usuário atualizado com sucesso.");
      await loadUsers();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Não foi possível editar o usuário.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteUser() {
    if (!pendingDelete) return;
    const user = pendingDelete;
    setDeletingId(user.id);
    setError(null);
    setMessage(null);

    try {
      const response = await fetch(`/api/admin/usuarios/${user.id}`, { method: "DELETE" });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error ?? "Não foi possível excluir o usuário.");

      setPendingDelete(null);
      setMessage(`Usuário “${user.name || user.email}” excluído com sucesso.`);
      await loadUsers();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Não foi possível excluir o usuário.");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="max-w-5xl">
      <div className="mb-6">
        <h1 className="font-serif text-xl font-bold text-texto">Usuários</h1>
        <p className="mt-1 text-xs text-cinza">Gerencie quem possui acesso ao painel administrativo.</p>
      </div>

      <div className="mb-6 rounded-2xl bg-white p-5" style={{ boxShadow: "0 2px 10px rgba(35,20,42,0.06)" }}>
        <p className="mb-4 text-sm font-bold text-texto">Adicionar novo usuário</p>
        <form onSubmit={createUser} className="grid gap-3">
          <Field label="Nome">
            <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Nome do usuário" className="w-full rounded-xl border border-rosa/20 px-3 py-2 text-sm outline-none" />
          </Field>
          <Field label="E-mail">
            <input type="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="usuario@email.com" className="w-full rounded-xl border border-rosa/20 px-3 py-2 text-sm outline-none" />
          </Field>
          <Field label="Permissão">
            <select value={role} onChange={(event) => setRole(event.target.value as "ADMIN" | "EDITOR")} className="w-full rounded-xl border border-rosa/20 bg-white px-3 py-2 text-sm outline-none">
              <option value="EDITOR">EDITOR — gerenciamento operacional</option>
              <option value="ADMIN">ADMIN — acesso completo</option>
            </select>
          </Field>
          <button type="submit" disabled={saving} className="w-full rounded-full bg-rosa py-3 px-5 text-sm font-bold text-white disabled:opacity-50 sm:w-auto sm:self-start">
            {saving ? "Criando..." : "Adicionar usuário"}
          </button>
        </form>
      </div>

      {error && <AdminNotice tone="error" className="mb-4">{error}</AdminNotice>}
      {message && <AdminNotice tone="success" className="mb-4">{message}</AdminNotice>}

      <div className="overflow-hidden rounded-2xl bg-white" style={{ boxShadow: "0 2px 10px rgba(35,20,42,0.06)" }}>
        <div className="border-b border-rosa/10 p-5">
          <p className="text-sm font-bold text-texto">Usuários cadastrados</p>
        </div>

        {loading ? (
          <div className="p-5 text-xs text-cinza">Carregando usuários...</div>
        ) : (
          <div className="divide-y divide-rosa/10">
            {users.map((user) => (
              <div key={user.id} className="p-5">
                {editingId === user.id ? (
                  <div className="grid gap-3">
                    <input value={editName} onChange={(event) => setEditName(event.target.value)} placeholder="Nome" className="rounded-xl border border-rosa/20 px-3 py-2 text-sm outline-none" />
                    <input type="email" value={editEmail} onChange={(event) => setEditEmail(event.target.value)} className="rounded-xl border border-rosa/20 px-3 py-2 text-sm outline-none" />
                    <select value={editRole} onChange={(event) => setEditRole(event.target.value as "ADMIN" | "EDITOR")} className="rounded-xl border border-rosa/20 bg-white px-3 py-2 text-sm">
                      <option value="EDITOR">EDITOR</option>
                      <option value="ADMIN">ADMIN</option>
                    </select>
                    <label className="flex items-center gap-2 text-xs font-semibold text-texto">
                      <input type="checkbox" checked={editActive} onChange={(event) => setEditActive(event.target.checked)} />
                      Usuário ativo
                    </label>
                    <div className="flex gap-2">
                      <button type="button" onClick={() => void saveUser(user.id)} disabled={saving} className="rounded-xl px-4 py-2 text-xs font-bold text-white disabled:opacity-50" style={{ backgroundColor: "#E4127B" }}>Salvar</button>
                      <button type="button" onClick={cancelEdit} className="rounded-xl border border-rosa/20 px-4 py-2 text-xs font-bold text-texto">Cancelar</button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-texto">{user.name || "Sem nome"}</p>
                      <p className="break-all text-xs text-cinza">{user.email}</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`rounded-full px-3 py-1 text-[10px] font-bold ${user.role === "ADMIN" ? "bg-rosa/10 text-rosa-profundo" : "bg-creme text-cinza"}`}>{user.role}</span>
                      <span className={`rounded-full px-3 py-1 text-[10px] font-bold ${user.active ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>{user.active ? "ATIVO" : "INATIVO"}</span>
                      <button type="button" onClick={() => startEdit(user)} className="rounded-xl border border-rosa/20 px-3 py-1.5 text-xs font-bold text-texto">Editar</button>
                      <button type="button" onClick={() => setPendingDelete(user)} disabled={deletingId === user.id} className="rounded-xl border border-red-200 px-3 py-1.5 text-xs font-bold text-red-600 disabled:opacity-50">{deletingId === user.id ? "Excluindo..." : "Excluir"}</button>
                    </div>
                  </div>
                )}
              </div>
            ))}
            {users.length === 0 && <div className="p-5 text-xs text-cinza">Nenhum usuário cadastrado.</div>}
          </div>
        )}
      </div>

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title="Excluir usuário?"
        message={pendingDelete ? `Excluir o acesso de “${pendingDelete.name || pendingDelete.email}”?\n\nEssa ação remove o acesso ao painel e não pode ser desfeita.` : ""}
        confirmLabel="Excluir usuário"
        danger
        busy={Boolean(deletingId)}
        onCancel={() => { if (!deletingId) setPendingDelete(null); }}
        onConfirm={deleteUser}
      />
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="grid gap-1">
      <span className="text-xs font-bold text-texto">{label}</span>
      {children}
    </label>
  );
}
