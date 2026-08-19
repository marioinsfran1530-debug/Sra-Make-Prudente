"use client";

import { useRef, useState } from "react";
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
  logoUrl: string | null;
  logoStoragePath: string | null;
  bannerDesktopUrl: string | null;
  bannerDesktopStoragePath: string | null;
  bannerMobileUrl: string | null;
  bannerMobileStoragePath: string | null;
  heroEyebrow: string | null;
  heroTitle: string | null;
  heroSubtitle: string | null;
  primaryCtaLabel: string | null;
  primaryCtaUrl: string | null;
  secondaryCtaLabel: string | null;
  secondaryCtaUrl: string | null;
  highlight1: string | null;
  highlight2: string | null;
  highlight3: string | null;
};

type ImageKind = "logo" | "bannerDesktop" | "bannerMobile";
type AssetUrlField = "logoUrl" | "bannerDesktopUrl" | "bannerMobileUrl";
type AssetPathField = "logoStoragePath" | "bannerDesktopStoragePath" | "bannerMobileStoragePath";

function isAllowedCtaUrl(value: string) {
  if (!value) return true;
  if (value.startsWith("/") && !value.startsWith("//") && !value.includes("\\")) return true;
  try { return new URL(value).protocol === "https:"; } catch { return false; }
}

export function StoreSettingsForm({ initial }: { initial: StoreSettings | null }) {
  const router = useRouter();
  const defaults = {
    storeName: initial?.storeName ?? "Sra Make Prudente",
    whatsapp: initial?.whatsapp ?? "",
    instagram: initial?.instagram ?? "",
    facebook: initial?.facebook ?? "",
    address: initial?.address ?? "",
    googleMapsUrl: initial?.googleMapsUrl ?? "",
    businessHours: initial?.businessHours ?? "",
    logoUrl: initial?.logoUrl ?? "",
    logoStoragePath: initial?.logoStoragePath ?? "",
    bannerDesktopUrl: initial?.bannerDesktopUrl ?? "",
    bannerDesktopStoragePath: initial?.bannerDesktopStoragePath ?? "",
    bannerMobileUrl: initial?.bannerMobileUrl ?? "",
    bannerMobileStoragePath: initial?.bannerMobileStoragePath ?? "",
    heroEyebrow: initial?.heroEyebrow ?? "Catálogo Sra Make",
    heroTitle: initial?.heroTitle ?? "Encontre o que você precisa na Sra Make.",
    heroSubtitle: initial?.heroSubtitle ?? "Maquiagem, lash, nail e acessórios. Escolha pelo catálogo e confirme pelo WhatsApp.",
    primaryCtaLabel: initial?.primaryCtaLabel ?? "Ver produtos",
    primaryCtaUrl: initial?.primaryCtaUrl ?? "/categoria",
    secondaryCtaLabel: initial?.secondaryCtaLabel ?? "Preciso de ajuda",
    secondaryCtaUrl: initial?.secondaryCtaUrl ?? "",
    highlight1: initial?.highlight1 ?? "Compra fácil e segura",
    highlight2: initial?.highlight2 ?? "Atendimento personalizado",
    highlight3: initial?.highlight3 ?? "Retirada ou entrega",
  };
  const [values, setValues] = useState(defaults);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<ImageKind | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const persistedAssets = useRef({
    logoUrl: defaults.logoUrl,
    logoStoragePath: defaults.logoStoragePath,
    bannerDesktopUrl: defaults.bannerDesktopUrl,
    bannerDesktopStoragePath: defaults.bannerDesktopStoragePath,
    bannerMobileUrl: defaults.bannerMobileUrl,
    bannerMobileStoragePath: defaults.bannerMobileStoragePath,
  });
  const set = (field: keyof typeof values, value: string) => setValues((current) => ({ ...current, [field]: value }));

  async function removeUploadedAsset(storagePath: string) {
    await fetch("/api/admin/store-settings/upload", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ storagePath }),
    });
  }

  async function upload(file: File, kind: ImageKind, urlField: AssetUrlField, pathField: AssetPathField) {
    setUploading(kind); setError(null); setMessage(null);
    try {
      const form = new FormData(); form.append("file", file); form.append("kind", kind);
      const response = await fetch("/api/admin/store-settings/upload", { method: "POST", body: form });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error ?? "Não foi possível enviar a imagem.");
      const previousPath = values[pathField];
      setValues((current) => ({
        ...current,
        [urlField]: data.image.url,
        [pathField]: data.image.storagePath,
      }));
      if (previousPath && previousPath !== persistedAssets.current[pathField]) {
        await removeUploadedAsset(previousPath);
      }
      setMessage("Imagem convertida para WebP. Salve as alterações para publicá-la.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Não foi possível enviar a imagem.");
    } finally { setUploading(null); }
  }

  async function removeAsset(urlField: AssetUrlField, pathField: AssetPathField) {
    const path = values[pathField];
    if (path && path !== persistedAssets.current[pathField]) {
      try { await removeUploadedAsset(path); } catch { /* o salvamento no servidor fará nova tentativa quando aplicável */ }
    }
    setValues((current) => ({ ...current, [urlField]: "", [pathField]: "" }));
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault(); setSaving(true); setMessage(null); setError(null);
    try {
      if (!isAllowedCtaUrl(values.primaryCtaUrl)) {
        throw new Error("O link do CTA principal deve ser um caminho interno ou uma URL HTTPS.");
      }
      const persistedAssetsBeforePut = { ...persistedAssets.current };
      const response = await fetch("/api/admin/store-settings", {
        method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(values),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setValues((current) => ({ ...current, ...persistedAssetsBeforePut }));
        throw new Error(data.error ?? "Não foi possível salvar as informações da loja.");
      }
      persistedAssets.current = {
        logoUrl: data.settings.logoUrl ?? "",
        logoStoragePath: data.settings.logoStoragePath ?? "",
        bannerDesktopUrl: data.settings.bannerDesktopUrl ?? "",
        bannerDesktopStoragePath: data.settings.bannerDesktopStoragePath ?? "",
        bannerMobileUrl: data.settings.bannerMobileUrl ?? "",
        bannerMobileStoragePath: data.settings.bannerMobileStoragePath ?? "",
      };
      setMessage("Vitrine e informações da loja salvas com sucesso."); router.refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Não foi possível salvar as informações da loja.");
    } finally { setSaving(false); }
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-4xl flex flex-col gap-4">
      <Card title="Identidade visual" description="JPG, PNG ou WebP de até 10 MB. O upload é convertido automaticamente para WebP.">
        <div className="grid gap-4 md:grid-cols-3">
          <ImageUpload label="Logo" value={values.logoUrl} busy={uploading === "logo"} onUpload={(file) => upload(file, "logo", "logoUrl", "logoStoragePath")} onRemove={() => removeAsset("logoUrl", "logoStoragePath")} />
          <ImageUpload label="Banner desktop" value={values.bannerDesktopUrl} busy={uploading === "bannerDesktop"} onUpload={(file) => upload(file, "bannerDesktop", "bannerDesktopUrl", "bannerDesktopStoragePath")} onRemove={() => removeAsset("bannerDesktopUrl", "bannerDesktopStoragePath")} />
          <ImageUpload label="Banner mobile" value={values.bannerMobileUrl} busy={uploading === "bannerMobile"} onUpload={(file) => upload(file, "bannerMobile", "bannerMobileUrl", "bannerMobileStoragePath")} onRemove={() => removeAsset("bannerMobileUrl", "bannerMobileStoragePath")} />
        </div>
      </Card>

      <Card title="Hero da vitrine" description="Personalize a mensagem principal, o botão e os destaques exibidos sobre o banner.">
        <Field label="Chamada superior"><input value={values.heroEyebrow} onChange={(e) => set("heroEyebrow", e.target.value)} className="input" /></Field>
        <Field label="Título"><input value={values.heroTitle} onChange={(e) => set("heroTitle", e.target.value)} className="input" maxLength={100} /></Field>
        <Field label="Texto de apoio"><textarea value={values.heroSubtitle} onChange={(e) => set("heroSubtitle", e.target.value)} className="input resize-none" rows={3} /></Field>
        <div className="grid md:grid-cols-2 gap-4">
          <Field label="Texto do CTA principal"><input value={values.primaryCtaLabel} onChange={(e) => set("primaryCtaLabel", e.target.value)} className="input" /></Field>
          <Field label="Link do CTA principal"><input value={values.primaryCtaUrl} onChange={(e) => set("primaryCtaUrl", e.target.value)} className="input" placeholder="/categoria" /></Field>
        </div>
        <div className="grid md:grid-cols-3 gap-4">
          {(["highlight1", "highlight2", "highlight3"] as const).map((field, index) => <Field key={field} label={`Destaque ${index + 1}`}><input value={values[field]} onChange={(e) => set(field, e.target.value)} className="input" /></Field>)}
        </div>
      </Card>

      <Card title="Informações da loja">
        <Field label="Nome da loja"><input value={values.storeName} onChange={(e) => set("storeName", e.target.value)} className="input" required /></Field>
        <div className="grid md:grid-cols-2 gap-4">
          <Field label="WhatsApp"><input value={values.whatsapp} onChange={(e) => set("whatsapp", e.target.value)} className="input" placeholder="5518999999999" required /></Field>
          <Field label="Instagram"><input value={values.instagram} onChange={(e) => set("instagram", e.target.value)} className="input" /></Field>
          <Field label="Facebook"><input value={values.facebook} onChange={(e) => set("facebook", e.target.value)} className="input" /></Field>
          <Field label="Link do Google Maps"><input value={values.googleMapsUrl} onChange={(e) => set("googleMapsUrl", e.target.value)} className="input" type="url" /></Field>
        </div>
        <Field label="Endereço"><textarea value={values.address} onChange={(e) => set("address", e.target.value)} className="input resize-none" rows={3} /></Field>
        <Field label="Horário de funcionamento"><textarea value={values.businessHours} onChange={(e) => set("businessHours", e.target.value)} className="input resize-none" rows={4} /></Field>
      </Card>

      {message && <p className="rounded-xl bg-green-50 border border-green-200 px-4 py-3 text-xs font-semibold text-green-700">{message}</p>}
      {error && <p className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-xs font-semibold text-red-700">{error}</p>}
      <button type="submit" disabled={saving || !!uploading} className="py-3 rounded-xl bg-[#E4127B] text-white text-sm font-bold disabled:opacity-50">{saving ? "Salvando..." : "Salvar vitrine"}</button>
      <style jsx>{`.input{width:100%;border:1px solid #e9d9e4;border-radius:12px;padding:10px 12px;font-size:14px;color:#23142a;outline:none}.input:focus{border-color:#e4127b;box-shadow:0 0 0 3px rgba(228,18,123,.08)}`}</style>
    </form>
  );
}

function ImageUpload({ label, value, busy, onUpload, onRemove }: { label: string; value: string; busy: boolean; onUpload: (file: File) => void; onRemove: () => void | Promise<void> }) {
  return <div><p className="mb-1 text-[11px] font-bold uppercase tracking-wide text-cinza">{label}</p><div className="relative aspect-[4/3] overflow-hidden rounded-xl border border-dashed border-rosa/30 bg-creme">{value ? <img src={value} alt={`Preview de ${label}`} className="h-full w-full object-contain" /> : <div className="flex h-full items-center justify-center px-4 text-center text-xs text-cinza">Nenhuma imagem</div>}</div><div className="mt-2 flex gap-2"><label className="cursor-pointer rounded-lg bg-rosa-profundo px-3 py-2 text-xs font-bold text-white">{busy ? "Enviando..." : "Selecionar"}<input className="hidden" type="file" accept="image/jpeg,image/png,image/webp" disabled={busy} onChange={(e) => { const file = e.target.files?.[0]; if (file) onUpload(file); e.target.value = ""; }} /></label>{value && <button type="button" onClick={onRemove} className="rounded-lg border border-rosa/20 px-3 py-2 text-xs font-bold text-rosa-profundo">Remover</button>}</div></div>;
}
function Card({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) { return <section className="flex flex-col gap-4 rounded-2xl bg-white p-4 shadow-sm"><div><h2 className="text-sm font-bold text-texto">{title}</h2>{description && <p className="mt-1 text-xs text-cinza">{description}</p>}</div>{children}</section>; }
function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="flex flex-col gap-1"><span className="text-[11px] font-bold uppercase tracking-wide text-cinza">{label}</span>{children}</label>; }
