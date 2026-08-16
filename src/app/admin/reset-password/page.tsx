"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";

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

      console.log("RESET PASSWORD - HASH:", hash);

      if (hash) {
        const params = new URLSearchParams(hash.substring(1));

        const accessToken = params.get("access_token");
        const refreshToken = params.get("refresh_token");
        const type = params.get("type");

        console.log("RESET PASSWORD - TYPE:", type);
        console.log(
          "RESET PASSWORD - ACCESS TOKEN:",
          accessToken ? "presente" : "ausente"
        );

        if (accessToken && refreshToken) {
          const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });

          if (error) {
            console.error("ERRO AO CRIAR SESSÃO:", error);
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
      console.log("SUPABASE AUTH EVENT:", event);

      if (
        event === "PASSWORD_RECOVERY" ||
        event === "SIGNED_IN" ||
        session
      ) {
        setReady(true);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
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

    const { error } = await supabase.auth.updateUser({
      password,
    });

    setSaving(false);

    if (error) {
      console.error("ERRO AO ATUALIZAR SENHA:", error);
      setError("Não foi possível salvar a nova senha.");
      return;
    }

    setSuccess(true);

    setTimeout(() => {
      router.push("/admin/login");
    }, 1500);
  }

  if (error) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-creme px-6 text-center">
        <div className="w-full max-w-sm bg-white rounded-2xl p-6 shadow-sm">
          <p className="font-serif font-bold text-lg text-texto mb-2">
            Link de recuperação
          </p>

          <p className="text-xs text-vermelho mb-5">
            {error}
          </p>

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
          <p className="font-serif font-bold text-texto mb-2">
            Verificando o link...
          </p>

          <p className="text-xs text-cinza">
            Aguarde enquanto validamos seu link de recuperação.
          </p>
        </div>
      </main>
    );
  }

  if (success) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-creme px-6 text-center">
        <p className="font-serif font-bold text-texto">
          Senha atualizada! Redirecionando...
        </p>
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
          Definir nova senha
        </p>

        <p className="text-xs text-cinza mb-6">
          Escolha uma nova senha para o painel administrativo.
        </p>

        <label className="text-xs font-bold text-texto">
          Nova senha
        </label>

        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className="w-full mt-1 mb-4 rounded-xl border border-rosa/20 px-3 py-2 text-sm outline-none"
        />

        <label className="text-xs font-bold text-texto">
          Confirmar nova senha
        </label>

        <input
          type="password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          required
          className="w-full mt-1 mb-4 rounded-xl border border-rosa/20 px-3 py-2 text-sm outline-none"
        />

        {error && (
          <p className="text-xs text-vermelho mb-3">
            {error}
          </p>
        )}

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
