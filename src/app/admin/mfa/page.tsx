"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";

export default function AdminMfaPage() {
  const router = useRouter();
  const [factorId, setFactorId] = useState<string | null>(null);
  const [challengeId, setChallengeId] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();

    async function prepareChallenge() {
      const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();

      if (aal?.currentLevel === "aal2") {
        router.replace("/admin");
        return;
      }

      const { data: factors, error: factorsError } = await supabase.auth.mfa.listFactors();
      if (factorsError) {
        setError("Não foi possível verificar a autenticação em duas etapas.");
        setLoading(false);
        return;
      }

      const verifiedFactor = factors.totp.find((factor) => factor.status === "verified");
      if (!verifiedFactor) {
        router.replace("/admin/seguranca");
        return;
      }

      const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({
        factorId: verifiedFactor.id,
      });

      if (challengeError || !challenge) {
        setError("Não foi possível iniciar a verificação em duas etapas.");
        setLoading(false);
        return;
      }

      setFactorId(verifiedFactor.id);
      setChallengeId(challenge.id);
      setLoading(false);
    }

    prepareChallenge();
  }, [router]);

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    if (!factorId || !challengeId) return;

    const cleanCode = code.replace(/\D/g, "").slice(0, 6);
    if (cleanCode.length !== 6) {
      setError("Informe o código de 6 dígitos do aplicativo autenticador.");
      return;
    }

    setVerifying(true);
    setError(null);

    const supabase = createSupabaseBrowserClient();
    const { error: verifyError } = await supabase.auth.mfa.verify({
      factorId,
      challengeId,
      code: cleanCode,
    });

    setVerifying(false);

    if (verifyError) {
      setError("Código inválido ou expirado. Gere um novo código no autenticador.");
      return;
    }

    router.replace("/admin");
    router.refresh();
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-creme px-6">
      <div className="w-full max-w-sm bg-white rounded-2xl p-6 shadow-sm">
        <p className="font-serif font-bold text-lg text-texto mb-1">Verificação em duas etapas</p>
        <p className="text-xs text-cinza mb-6">
          Abra seu aplicativo autenticador e informe o código atual para acessar o painel.
        </p>

        {loading ? (
          <p className="text-sm text-cinza">Preparando verificação...</p>
        ) : (
          <form onSubmit={handleVerify}>
            <label className="text-xs font-bold text-texto">Código de 6 dígitos</label>
            <input
              inputMode="numeric"
              autoComplete="one-time-code"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              maxLength={6}
              required
              className="w-full mt-1 mb-4 rounded-xl border border-rosa/20 px-3 py-3 text-center text-xl tracking-[0.3em] outline-none"
            />

            {error && <p className="text-xs text-vermelho mb-3">{error}</p>}

            <button
              type="submit"
              disabled={verifying}
              className="w-full py-3 rounded-full font-bold text-sm text-white bg-rosa disabled:opacity-50"
            >
              {verifying ? "Verificando..." : "Confirmar acesso"}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
