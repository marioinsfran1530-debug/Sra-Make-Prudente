"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type StoreSettings = {
  id?: string;
  storeName: string;
  whatsapp: string;
  instagram: string | null;
  facebook: string | null;
  address: string | null;
  googleMapsUrl: string | null;
  businessHours: string | null;
};

export function StoreSettingsForm({
  initial,
}: {
  initial: StoreSettings | null;
}) {
  const router = useRouter();

  const [storeName, setStoreName] = useState(
    initial?.storeName ?? "Sra Make Prudente"
  );
  const [whatsapp, setWhatsapp] = useState(initial?.whatsapp ?? "");
  const [instagram, setInstagram] = useState(initial?.instagram ?? "");
  const [facebook, setFacebook] = useState(initial?.facebook ?? "");
  const [address, setAddress] = useState(initial?.address ?? "");
  const [googleMapsUrl, setGoogleMapsUrl] = useState(
    initial?.googleMapsUrl ?? ""
  );
  const [businessHours, setBusinessHours] = useState(
    initial?.businessHours ?? ""
  );

  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    setSaving(true);
    setMessage(null);
    setError(null);

    try {
      const res = await fetch("/api/admin/store-settings", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          storeName,
          whatsapp,
          instagram,
          facebook,
          address,
          googleMapsUrl,
          businessHours,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(
          data.error ?? "Não foi possível salvar as informações da loja."
        );
      }

      setMessage("Informações da loja salvas com sucesso.");
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Não foi possível salvar as informações da loja."
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="max-w-2xl flex flex-col gap-4"
    >
      <div className="bg-white rounded-2xl p-4 shadow-sm">
        <p className="text-sm font-bold text-texto mb-4">
          Identificação
        </p>

        <Field label="Nome da loja">
          <input
            value={storeName}
            onChange={(e) => setStoreName(e.target.value)}
            className="input"
            required
          />
        </Field>
      </div>

      <div className="bg-white rounded-2xl p-4 shadow-sm flex flex-col gap-4">
        <p className="text-sm font-bold text-texto">
          Contato e redes sociais
        </p>

        <Field label="WhatsApp">
          <input
            value={whatsapp}
            onChange={(e) => setWhatsapp(e.target.value)}
            placeholder="Ex: 5518999999999"
            className="input"
            required
          />
        </Field>

        <Field label="Instagram">
          <input
            value={instagram}
            onChange={(e) => setInstagram(e.target.value)}
            placeholder="@sramakeprudente"
            className="input"
          />
        </Field>

        <Field label="Facebook">
          <input
            value={facebook}
            onChange={(e) => setFacebook(e.target.value)}
            placeholder="URL ou nome da página"
            className="input"
          />
        </Field>
      </div>

      <div className="bg-white rounded-2xl p-4 shadow-sm flex flex-col gap-4">
        <p className="text-sm font-bold text-texto">
          Loja física
        </p>

        <Field label="Endereço">
          <textarea
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            rows={3}
            placeholder="Endereço completo da loja"
            className="input resize-none"
          />
        </Field>

        <Field label="Link do Google Maps / Perfil da Empresa">
          <input
            type="url"
            value={googleMapsUrl}
            onChange={(e) => setGoogleMapsUrl(e.target.value)}
            placeholder="https://maps.app.goo.gl/..."
            className="input"
          />
        </Field>

        <Field label="Horário de funcionamento">
          <textarea
            value={businessHours}
            onChange={(e) => setBusinessHours(e.target.value)}
            rows={5}
            placeholder={"Segunda a sexta: 09:00 às 18:00\nSábado: 09:00 às 13:00"}
            className="input resize-none"
          />
        </Field>
      </div>

      {message && (
        <p className="rounded-xl bg-green-50 border border-green-200 px-4 py-3 text-xs font-semibold text-green-700">
          {message}
        </p>
      )}

      {error && (
        <p className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-xs font-semibold text-red-700">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={saving}
        className="py-3 rounded-xl text-white text-sm font-bold disabled:opacity-50"
        style={{ backgroundColor: "#E4127B" }}
      >
        {saving ? "Salvando..." : "Salvar informações"}
      </button>

      <style jsx>{`
        .input {
          width: 100%;
          border: 1px solid #e9d9e4;
          border-radius: 12px;
          padding: 10px 12px;
          font-size: 14px;
          color: #23142a;
          outline: none;
        }
      `}</style>
    </form>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[11px] font-bold text-cinza uppercase tracking-wide">
        {label}
      </span>
      {children}
    </label>
  );
}
