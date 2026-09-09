"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";

export default function AdminSecurityPage() {
  const router = useRouter();
  const [factorId, setFactorId] = useState<string | null>(null);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();

    async function prepareEnrollment() {
      const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      const { data: factors, error: factorsError } = await supabase.auth.mfa.listFactors();

      if (factorsError) {
        setError("Não foi possível verificar a segurança da conta.");
        setLoading(false);
        return;
      }

      const verifiedFactor = factors.totp.find((factor) => factor.status === "verified");
      if (verifiedFactor) {
        if (aal?.currentLevel === "aal2") {
          router.replace("/admin");
        } else {
          router.replace("/admin/mfa");
        }
        return;
      }

      const { data: enrollment, error: enrollError } = await supabase.auth.mfa.enroll({
        factorType: "totp",
        friendlyName: "Sra Make Admin",
      });

      if (enrollError || !enrollment) {
        setError("Não foi possível ativar a autenticação em duas etapas.");
        setLoading(false);
        return;
      }

      setFactorId(enrollment.id);
      setQrCode(enrollment.totp.qr_code);
      setSecret(enrollment.totp.secret);
      setLoading(false);
    }

    prepareEnrollment();
  }, [router]);

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    if (!factorId) return;

    const cleanCode = code.replace(/\D/g, "").slice(0, 6);
    if (cleanCode.length !== 6) {
      setError("Informe o código de 6 dígitos do aplicativo autenticador.");
      return;
    }

    setVerifying(true);
    setError(null);
    const supabase = createSupabaseBrowserClient();

    const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({
      factorId,
    });

    if (challengeError || !challenge) {
      setVerifying(false);
      setError("Não foi possível iniciar a confirmação do autenticador.");
      return;
    }

    const { error: verifyError } = await supabase.auth.mfa.verify({
      factorId,
      challengeId: challenge.id,
      code: cleanCode,
    });

    setVerifying(false);

    if (verifyError) {
      setError("Código inválido. Confira o horário do celular e tente novamente.");
      return;
    }

    router.replace("/admin");
    router.refresh();
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-creme px-6 py-10">
      <div className="w-full max-w-md bg-white rounded-2xl p-6 shadow-sm">
        <p className="font-serif font-bold text-lg text-texto mb-1">Proteja sua conta administrativa</p>
        <p className="text-xs text-cinza mb-5">
          A autenticação em duas etapas passa a ser obrigatória para acessar dados de clientes, pedidos e CRM.
        </p>

        {loading ? (
          <p className="text-sm text-cinza">Preparando autenticação...</p>
        ) : error && !factorId ? (
          <p className="text-sm text-vermelho">{error}</p>
        ) : (
          <form onSubmit={handleVerify}>
            <div className="rounded-xl border border-rosa/20 p-4 mb-4 text-center">
              <p className="text-sm font-bold text-texto mb-2">1. Escaneie o QR Code</p>
              <p className="text-xs text-cinza mb-4">
                Use Google Authenticator, Microsoft Authenticator, Authy ou outro app compatível com TOTP.
              </p>
              {qrCode && (
                <img
                  src={qrCode}
                  alt="QR Code para autenticação em duas etapas"
                  className="mx-auto w-52 h-52"
                />
              )}
              {secret && (
                <details className="mt-3 text-left">
                  <summary className="text-xs font-bold text-rosa-profundo cursor-pointer">
                    Não consigo escanear o QR Code
                  </summary>
                  <p className="mt-2 text-xs text-cinza break-all">
                    Chave manual: <span className="font-mono text-texto">{secret}</span>
                  </p>
                </details>
              )}
            </div>

            <label className="text-xs font-bold text-texto">2. Informe o código gerado</label>
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
              {verifying ? "Ativando..." : "Ativar proteção em duas etapas"}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
