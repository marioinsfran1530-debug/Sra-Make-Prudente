"use client";

import { useCallback, useEffect, useState } from "react";
import { ShieldCheck, Smartphone, Laptop, Trash2 } from "lucide-react";

type TrustedDevice = {
  id: string;
  label: string;
  userAgent: string | null;
  createdAt: string;
  lastUsedAt: string;
  expiresAt: string;
  current: boolean;
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function DeviceIcon({ label }: { label: string }) {
  if (/celular|iphone|ipad|android/i.test(label)) {
    return <Smartphone size={20} />;
  }
  return <Laptop size={20} />;
}

export default function TrustedDevicesPage() {
  const [devices, setDevices] = useState<TrustedDevice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [removing, setRemoving] = useState<string | null>(null);

  const loadDevices = useCallback(async () => {
    setError(null);
    const response = await fetch("/api/admin/trusted-devices", { cache: "no-store" });
    const data = (await response.json()) as {
      devices?: TrustedDevice[];
      error?: string;
    };

    if (!response.ok) {
      throw new Error(data.error || "Não foi possível carregar os aparelhos.");
    }

    setDevices(data.devices ?? []);
  }, []);

  useEffect(() => {
    loadDevices()
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Não foi possível carregar os aparelhos.");
      })
      .finally(() => setLoading(false));
  }, [loadDevices]);

  async function revokeDevice(device: TrustedDevice) {
    const message = device.current
      ? "Remover a confiança deste aparelho? No próximo login o código de segurança será solicitado novamente."
      : `Remover o acesso confiável de ${device.label}?`;

    if (!window.confirm(message)) return;

    setRemoving(device.id);
    setError(null);

    try {
      const response = await fetch("/api/admin/trusted-devices", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: device.id }),
      });
      const data = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(data.error || "Não foi possível remover o aparelho.");
      }

      setDevices((current) => current.filter((item) => item.id !== device.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível remover o aparelho.");
    } finally {
      setRemoving(null);
    }
  }

  return (
    <main className="mx-auto max-w-3xl">
      <div className="mb-6">
        <div className="flex items-center gap-2 text-rosa-profundo">
          <ShieldCheck size={22} />
          <p className="text-xs font-bold uppercase tracking-widest">Segurança</p>
        </div>
        <h1 className="mt-1 font-serif text-2xl font-bold text-texto">Aparelhos confiáveis</h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-cinza">
          Depois de confirmar o código de duas etapas, o navegador pode permanecer confiável por 30 dias. Remova imediatamente um aparelho perdido, trocado ou que não deva mais acessar o painel.
        </p>
      </div>

      {error && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-vermelho">
          {error}
        </div>
      )}

      {loading ? (
        <div className="rounded-2xl border border-rosa/10 bg-white p-5 text-sm text-cinza shadow-sm">
          Carregando aparelhos...
        </div>
      ) : devices.length === 0 ? (
        <div className="rounded-2xl border border-rosa/10 bg-white p-5 shadow-sm">
          <p className="font-bold text-texto">Nenhum aparelho confiável salvo.</p>
          <p className="mt-1 text-sm text-cinza">
            No próximo login, confirme o código e mantenha marcada a opção “Confiar neste aparelho por 30 dias”.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {devices.map((device) => (
            <article
              key={device.id}
              className="rounded-2xl border border-rosa/10 bg-white p-4 shadow-sm sm:p-5"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex min-w-0 gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-creme text-rosa-profundo">
                    <DeviceIcon label={device.label} />
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="font-bold text-texto">{device.label}</h2>
                      {device.current && (
                        <span className="rounded-full bg-green-50 px-2 py-1 text-[10px] font-bold text-green-700">
                          Este aparelho
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-xs text-cinza">
                      Confiável até {formatDate(device.expiresAt)}
                    </p>
                    <p className="mt-1 text-[11px] text-cinza">
                      Adicionado em {formatDate(device.createdAt)}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => revokeDevice(device)}
                  disabled={removing === device.id}
                  className="flex shrink-0 items-center gap-1 rounded-xl border border-red-200 px-3 py-2 text-xs font-bold text-red-600 transition hover:bg-red-50 disabled:opacity-50"
                >
                  <Trash2 size={14} />
                  {removing === device.id ? "Removendo..." : "Remover"}
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </main>
  );
}
