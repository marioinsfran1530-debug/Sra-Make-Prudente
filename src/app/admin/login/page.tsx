"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";

export default function AdminLoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "forgot">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
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

  async function handleForgotPassword(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setLoading(true);
    const supabase = createSupabaseBrowserClient();
    // redirectTo explícito garante que o link do e-mail leve para a nossa
    // página de redefinição, e não para a Site URL genérica do Supabase.
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/admin/reset-password`,
    });
    setLoading(false);
    if (error) {
      setError("Não foi possível enviar o link. Confira o e-mail e tente de novo.");
      return;
    }
    setInfo("Se esse e-mail estiver cadastrado, enviamos um link de redefinição de senha.");
  }

  if (mode === "forgot") {
    return (
      <main className="min-h-screen flex items-center justify-center bg-creme px-6">
        <form
          onSubmit={handleForgotPassword}
          className="w-full max-w-sm bg-white rounded-2xl p-6 shadow-sm"
        >
          <p className="font-serif font-bold text-lg text-texto mb-1">Recuperar senha</p>
          <p className="text-xs text-cinza mb-6">
            Informe o e-mail cadastrado para receber o link de redefinição.
          </p>

          <label className="text-xs font-bold text-texto">E-mail</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full mt-1 mb-4 rounded-xl border border-rosa/20 px-3 py-2 text-sm outline-none"
          />

          {error && <p className="text-xs text-vermelho mb-3">{error}</p>}
          {info && <p className="text-xs text-rosa-profundo mb-3">{info}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-full font-bold text-sm text-white bg-rosa disabled:opacity-50"
          >
            {loading ? "Enviando..." : "Enviar link de recuperação"}
          </button>

          <button
            type="button"
            onClick={() => setMode("login")}
            className="w-full mt-3 text-xs font-bold text-cinza"
          >
            Voltar para o login
          </button>
        </form>
      </main>
    );
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

        {error && <p className="text-xs text-vermelho mb-3">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 rounded-full font-bold text-sm text-white bg-rosa disabled:opacity-50"
        >
          {loading ? "Entrando..." : "Entrar"}
        </button>

        <button
          type="button"
          onClick={() => setMode("forgot")}
          className="w-full mt-3 text-xs font-bold text-rosa-profundo"
        >
          Esqueci minha senha
        </button>
      </form>
    </main>
  );
}
