"use client";

import { useEffect, useState } from "react";

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

  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function loadUsers() {
    setLoading(true);

    const response = await fetch("/api/admin/usuarios");

    if (!response.ok) {
      setError("Não foi possível carregar os usuários.");
      setLoading(false);
      return;
    }

    const data = await response.json();
    setUsers(data);
    setLoading(false);
  }

  useEffect(() => {
    loadUsers();
  }, []);

  async function createUser(e: React.FormEvent) {
    e.preventDefault();

    setSaving(true);
    setError(null);
    setMessage(null);

    const response = await fetch("/api/admin/usuarios", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name,
        email,
        role,
      }),
    });

    const data = await response.json();

    setSaving(false);

    if (!response.ok) {
      setError(data.error ?? "Erro ao criar usuário.");
      return;
    }

    setName("");
    setEmail("");
    setRole("EDITOR");

    setMessage(
      "Usuário criado. Ele poderá definir a senha pelo fluxo de recuperação."
    );

    await loadUsers();
  }

  return (
    <div className="max-w-5xl">
      <div className="mb-6">
        <h1 className="font-serif font-bold text-xl text-texto">
          Usuários
        </h1>

        <p className="text-xs text-cinza mt-1">
          Gerencie quem possui acesso ao painel administrativo.
        </p>
      </div>

      <div
        className="bg-white rounded-2xl p-5 mb-6"
        style={{ boxShadow: "0 2px 10px rgba(35,20,42,0.06)" }}
      >
        <p className="font-bold text-sm text-texto mb-4">
          Adicionar novo usuário
        </p>

        <form onSubmit={createUser} className="grid gap-3">
          <div>
            <label className="text-xs font-bold text-texto">
              Nome
            </label>

            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nome do usuário"
              className="w-full mt-1 rounded-xl border border-rosa/20 px-3 py-2 text-sm outline-none"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-texto">
              E-mail
            </label>

            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="usuario@email.com"
              className="w-full mt-1 rounded-xl border border-rosa/20 px-3 py-2 text-sm outline-none"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-texto">
              Permissão
            </label>

            <select
              value={role}
              onChange={(e) =>
                setRole(e.target.value as "ADMIN" | "EDITOR")
              }
              className="w-full mt-1 rounded-xl border border-rosa/20 px-3 py-2 text-sm outline-none bg-white"
            >
              <option value="EDITOR">
                EDITOR — gerenciamento operacional
              </option>

              <option value="ADMIN">
                ADMIN — acesso completo
              </option>
            </select>
          </div>

          {error && (
            <p className="text-xs text-vermelho">
              {error}
            </p>
          )}

          {message && (
            <p className="text-xs text-rosa-profundo">
              {message}
            </p>
          )}

          <button
            type="submit"
            disabled={saving}
            className="w-full sm:w-auto sm:self-start py-3 px-5 rounded-full font-bold text-sm text-white bg-rosa disabled:opacity-50"
          >
            {saving ? "Criando..." : "Adicionar usuário"}
          </button>
        </form>
      </div>

      <div
        className="bg-white rounded-2xl overflow-hidden"
        style={{ boxShadow: "0 2px 10px rgba(35,20,42,0.06)" }}
      >
        <div className="p-5 border-b border-rosa/10">
          <p className="font-bold text-sm text-texto">
            Usuários cadastrados
          </p>
        </div>

        {loading ? (
          <div className="p-5 text-xs text-cinza">
            Carregando usuários...
          </div>
        ) : (
          <div className="divide-y divide-rosa/10">
            {users.map((user) => (
              <div
                key={user.id}
                className="p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
              >
                <div>
                  <p className="text-sm font-bold text-texto">
                    {user.name || "Sem nome"}
                  </p>

                  <p className="text-xs text-cinza">
                    {user.email}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <span
                    className={`text-[10px] font-bold px-3 py-1 rounded-full ${
                      user.role === "ADMIN"
                        ? "bg-rosa/10 text-rosa-profundo"
                        : "bg-creme text-cinza"
                    }`}
                  >
                    {user.role}
                  </span>

                  <span
                    className={`text-[10px] font-bold px-3 py-1 rounded-full ${
                      user.active
                        ? "bg-green-50 text-green-700"
                        : "bg-red-50 text-red-700"
                    }`}
                  >
                    {user.active ? "ATIVO" : "INATIVO"}
                  </span>
                </div>
              </div>
            ))}

            {users.length === 0 && (
              <div className="p-5 text-xs text-cinza">
                Nenhum usuário cadastrado.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
