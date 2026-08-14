"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    setLoading(false);
    if (error) {
      setError("E-mail ou senha inválidos.");
      return;
    }
    router.push("/admin");
    router.refresh();
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-creme px-6">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm bg-white rounded-2xl p-6 shadow-sm"
      >
        <p className="font-serif font-bold text-lg text-texto mb-1">
          Sra Make — Painel administrativo
        </p>
        <p className="text-xs text-cinza mb-6">Acesso restrito à equipe.</p>

        <label className="text-xs font-bold text-texto">E-mail</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="w-full mt-1 mb-4 rounded-xl border border-rosa/20 px-3 py-2 text-sm outline-none"
        />

        <label className="text-xs font-bold text-texto">Senha</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className="w-full mt-1 mb-4 rounded-xl border border-rosa/20 px-3 py-2 text-sm outline-none"
        />

        {error && (
          <p className="text-xs text-vermelho mb-3">{error}</p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 rounded-full font-bold text-sm text-white bg-rosa disabled:opacity-50"
        >
          {loading ? "Entrando..." : "Entrar"}
        </button>
      </form>
    </main>
  );
}
