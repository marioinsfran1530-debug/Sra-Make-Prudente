"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";

export default function AdminSecurityPage() {
  const router = useRouter();
  const [factorId, setFactorId] = useState<string | null>(null);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [accountLabel, setAccountLabel] = useState("Sra Make Admin");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();

    async function prepareEnrollment() {
      setLoading(true);
      setError(null);

      const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      const { data: factors, error: factorsError } = await supabase.auth.mfa.listFactors();

      if (factorsError) {
        setError("Não foi possível verificar a segurança da conta. Tente novamente.");
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

      // Tentativas interrompidas podem deixar fatores TOTP pendentes.
      // Quando eles aparecem na listagem, removemos antes de criar um novo.
      const pendingFactors = factors.totp.filter((factor) => factor.status !== "verified");
      for (const factor of pendingFactors) {
        await supabase.auth.mfa.unenroll({ factorId: factor.id });
      }

      const { data: userData } = await supabase.auth.getUser();
      const email = userData.user?.email?.trim();
      if (email) setAccountLabel(email);

      // Não usamos friendlyName fixo aqui. O Supabase exige que esse nome seja único
      // e uma ativação antiga interrompida pode manter o nome reservado mesmo quando
      // o fator pendente não aparece em listFactors().
      const { data: enrollment, error: enrollError } = await supabase.auth.mfa.enroll({
        factorType: "totp",
      });

      if (enrollError || !enrollment) {
        const message = enrollError?.message?.toLowerCase() ?? "";
        if (message.includes("already exists") || message.includes("friendly name")) {
          setError("Existe uma configuração anterior incompleta de autenticação. Saia da conta, entre novamente e tente ativar outra vez.");
        } else {
          setError("Não foi possível preparar a autenticação em duas etapas. Tente novamente.");
        }
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

  const authenticatorUri = useMemo(() => {
    if (!secret) return null;
    const issuer = "Sra Make Admin";
    const label = `${issuer}:${accountLabel}`;
    return `otpauth://totp/${encodeURIComponent(label)}?secret=${encodeURIComponent(secret)}&issuer=${encodeURIComponent(issuer)}`;
  }, [accountLabel, secret]);

  async function copySecret() {
    if (!secret) return;
    try {
      await navigator.clipboard.writeText(secret);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Não foi possível copiar automaticamente. Pressione a chave abaixo para selecioná-la e copie manualmente.");
    }
  }

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
      setError("Não foi possível iniciar a confirmação do autenticador. Tente novamente.");
      return;
    }

    const { error: verifyError } = await supabase.auth.mfa.verify({
      factorId,
      challengeId: challenge.id,
      code: cleanCode,
    });

    if (verifyError) {
      setVerifying(false);
      setError("Código inválido. Confira o horário do celular e tente novamente.");
      return;
    }

    try {
      await fetch("/api/admin/trusted-devices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
    } catch {
      // O MFA permanece ativo mesmo se não for possível salvar este aparelho.
    }

    setVerifying(false);
    router.replace("/admin");
    router.refresh();
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-creme px-4 py-8 sm:px-6 sm:py-10">
      <div className="w-full max-w-md bg-white rounded-2xl p-5 shadow-sm sm:p-6">
        <p className="font-serif font-bold text-lg text-texto mb-1">Proteja sua conta administrativa</p>
        <p className="text-xs text-cinza mb-5">
          A autenticação em duas etapas é obrigatória para acessar dados de clientes, pedidos e CRM. Após esta confirmação, este aparelho ficará confiável por 30 dias.
        </p>

        {loading ? (
          <p className="text-sm text-cinza">Preparando autenticação...</p>
        ) : error && !factorId ? (
          <div>
            <p className="text-sm text-vermelho">{error}</p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="mt-4 w-full rounded-full border border-rosa/25 px-4 py-3 text-sm font-bold text-rosa-profundo"
            >
              Tentar novamente
            </button>
          </div>
        ) : (
          <form onSubmit={handleVerify}>
            <div className="rounded-xl border border-rosa/20 p-4 mb-4">
              <p className="text-sm font-bold text-texto">1. Adicione a conta no autenticador</p>
              <p className="mt-1 text-xs leading-5 text-cinza">
                No celular, use o botão abaixo. Se o aplicativo não abrir, copie a chave de configuração. O QR Code fica como alternativa para outro aparelho.
              </p>

              {authenticatorUri && (
                <a
                  href={authenticatorUri}
                  className="mt-4 flex w-full items-center justify-center rounded-xl bg-rosa-profundo px-4 py-3 text-sm font-bold text-white"
                >
                  Abrir no aplicativo autenticador
                </a>
              )}

              {secret && (
                <div className="mt-3 rounded-xl bg-creme/60 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[10px] font-bold uppercase tracking-wide text-cinza">Chave de configuração</p>
                      <p className="mt-1 break-all font-mono text-xs font-bold text-texto select-all">{secret}</p>
                    </div>
                    <button
                      type="button"
                      onClick={copySecret}
                      className="shrink-0 rounded-lg border border-rosa/20 bg-white px-3 py-2 text-[11px] font-bold text-rosa-profundo"
                    >
                      {copied ? "Copiada" : "Copiar"}
                    </button>
                  </div>
                  <p className="mt-2 text-[10px] leading-4 text-cinza">
                    No Google Authenticator: + → Inserir chave de configuração → cole a chave e escolha “Baseado em tempo”.
                  </p>
                </div>
              )}

              {qrCode && (
                <details className="mt-3">
                  <summary className="cursor-pointer text-xs font-bold text-rosa-profundo">
                    Usar QR Code em outro aparelho
                  </summary>
                  <div className="mt-3 text-center">
                    <img
                      src={qrCode}
                      alt="QR Code para autenticação em duas etapas"
                      className="mx-auto h-48 w-48 sm:h-52 sm:w-52"
                    />
                  </div>
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
              placeholder="000000"
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
