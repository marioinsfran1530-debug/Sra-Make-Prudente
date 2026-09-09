"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";

function validateStrongPassword(password: string) {
  if (password.length < 12) return "Use pelo menos 12 caracteres.";
  if (!/[a-z]/.test(password)) return "Inclua pelo menos uma letra minúscula.";
  if (!/[A-Z]/.test(password)) return "Inclua pelo menos uma letra maiúscula.";
  if (!/\d/.test(password)) return "Inclua pelo menos um número.";
  if (!/[^A-Za-z0-9]/.test(password)) return "Inclua pelo menos um caractere especial.";
  return null;
}

export default function ResetPasswordPage() {
  const router = useRouter();

  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();

    async function prepareRecovery() {
      const hash = window.location.hash;

      if (hash) {
        const params = new URLSearchParams(hash.substring(1));
        const accessToken = params.get("access_token");
        const refreshToken = params.get("refresh_token");

        if (accessToken && refreshToken) {
          const { error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });

          if (sessionError) {
            setError("O link de recuperação é inválido ou expirou.");
            return;
          }

          setReady(true);
          return;
        }
      }

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session) {
        setReady(true);
        return;
      }

      setError(
        "Não foi possível validar o link de recuperação. Solicite um novo link."
      );
    }

    prepareRecovery();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN" || session) {
        setReady(true);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const strengthError = validateStrongPassword(password);
    if (strengthError) {
      setError(strengthError);
      return;
    }

    if (password !== confirm) {
      setError("As senhas não coincidem.");
      return;
    }

    setSaving(true);
    const supabase = createSupabaseBrowserClient();
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setSaving(false);

    if (updateError) {
      setError("Não foi possível salvar a nova senha.");
      return;
    }

    await supabase.auth.signOut();
    setSuccess(true);

    setTimeout(() => {
      router.push("/admin/login");
    }, 1200);
  }

  if (error && !ready) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-creme px-6 text-center">
        <div className="w-full max-w-sm bg-white rounded-2xl p-6 shadow-sm">
          <p className="font-serif font-bold text-lg text-texto mb-2">Link de recuperação</p>
          <p className="text-xs text-vermelho mb-5">{error}</p>
          <button
            onClick={() => router.push("/admin/login")}
            className="w-full py-3 rounded-full font-bold text-sm text-white bg-rosa"
          >
            Voltar para o login
          </button>
        </div>
      </main>
    );
  }

  if (!ready) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-creme px-6 text-center">
        <div>
          <p className="font-serif font-bold text-texto mb-2">Verificando o link...</p>
          <p className="text-xs text-cinza">Aguarde enquanto validamos seu link de recuperação.</p>
        </div>
      </main>
    );
  }

  if (success) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-creme px-6 text-center">
        <p className="font-serif font-bold text-texto">Senha atualizada. Faça login novamente.</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-creme px-6">
      <form onSubmit={handleSubmit} className="w-full max-w-sm bg-white rounded-2xl p-6 shadow-sm">
        <p className="font-serif font-bold text-lg text-texto mb-1">Definir nova senha</p>
        <p className="text-xs text-cinza mb-5">Use uma senha exclusiva para o painel administrativo.</p>

        <div className="rounded-xl bg-creme/70 px-3 py-2 mb-5 text-xs text-cinza">
          Mínimo de 12 caracteres, com maiúscula, minúscula, número e caractere especial.
        </div>

        <label className="text-xs font-bold text-texto">Nova senha</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value.slice(0, 200))}
          minLength={12}
          maxLength={200}
          autoComplete="new-password"
          required
          className="w-full mt-1 mb-4 rounded-xl border border-rosa/20 px-3 py-2 text-sm outline-none"
        />

        <label className="text-xs font-bold text-texto">Confirmar nova senha</label>
        <input
          type="password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value.slice(0, 200))}
          minLength={12}
          maxLength={200}
          autoComplete="new-password"
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
