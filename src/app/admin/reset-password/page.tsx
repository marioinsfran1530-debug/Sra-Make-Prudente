"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [saving, setSaving] = useState(false);

  // O link de recuperação do Supabase vem com o token no #hash da URL,
  // que o servidor nunca vê — só o supabase-js no navegador consegue ler
  // e transformar isso numa sessão válida. Por isso esperamos o evento
  // PASSWORD_RECOVERY antes de liberar o formulário.
  useEffect(() => {
    const supabase = createSupabaseBrowserClient();

    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || (event === "SIGNED_IN" && session)) {
        setReady(true);
      }
    });

    // fallback: se a sessão já existir quando o componente montar
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < 6) {
      setError("A senha precisa ter pelo menos 6 caracteres.");
      return;
    }
    if (password !== confirm) {
      setError("As senhas não coincidem.");
      return;
    }

    setSaving(true);
    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.auth.updateUser({ password });
    setSaving(false);

    if (error) {
      setError("Não foi possível salvar a nova senha. Tente pedir o link de novo.");
      return;
    }

    setSuccess(true);
    setTimeout(() => router.push("/admin/login"), 1500);
  }

  if (!ready) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-creme px-6 text-center">
        <div>
          <p className="font-serif font-bold text-texto mb-2">Verificando o link...</p>
          <p className="text-xs text-cinza">
            Se esta tela não mudar em alguns segundos, o link pode ter expirado. Peça um novo
            link de recuperação na tela de login.
          </p>
        </div>
      </main>
    );
  }

  if (success) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-creme px-6 text-center">
        <p className="font-serif font-bold text-texto">Senha atualizada! Redirecionando...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-creme px-6">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm bg-white rounded-2xl p-6 shadow-sm"
      >
        <p className="font-serif font-bold text-lg text-texto mb-1">Definir nova senha</p>
        <p className="text-xs text-cinza mb-6">Escolha uma nova senha para o painel administrativo.</p>

        <label className="text-xs font-bold text-texto">Nova senha</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className="w-full mt-1 mb-4 rounded-xl border border-rosa/20 px-3 py-2 text-sm outline-none"
        />

        <label className="text-xs font-bold text-texto">Confirmar nova senha</label>
        <input
          type="password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          required
          className="w-full mt-1 mb-4 rounded-xl border border-rosa/20 px-3 py-2 text-sm outline-none"
        />

        {error && <p className="text-xs text-vermelho mb-3">{error}</p>}

        <button
          type="submit"
          disabled={saving}
          className="w-full py-3 rounded-full font-bold text-sm text-white bg-rosa disabled:opacity-50"
        >
          {saving ? "Salvando..." : "Salvar nova senha"}
        </button>
      </form>
    </main>
  );
}
