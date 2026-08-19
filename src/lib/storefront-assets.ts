import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export const STOREFRONT_BUCKET = "store-assets";
export type StorefrontAssetKind = "logo" | "bannerDesktop" | "bannerMobile";

export function createStorefrontStorageClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export function isAllowedCtaUrl(value: string) {
  if (value.startsWith("/") && !value.startsWith("//") && !value.includes("\\")) return true;
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}

export function validateStorefrontAsset(
  supabase: SupabaseClient,
  kind: StorefrontAssetKind,
  urlValue: unknown,
  pathValue: unknown
) {
  const url = String(urlValue ?? "").trim();
  const storagePath = String(pathValue ?? "").trim();
  if (!url && !storagePath) return { url: null, storagePath: null };
  const expectedPath = new RegExp(`^storefront/${kind}/[0-9a-f-]+\\.webp$`);
  if (!url || !storagePath || !expectedPath.test(storagePath)) {
    throw new Error("Referência de imagem inválida.");
  }

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error("URL de imagem inválida.");
  }
  const expectedUrl = supabase.storage.from(STOREFRONT_BUCKET).getPublicUrl(storagePath).data.publicUrl;
  if (parsed.protocol !== "https:" || url !== expectedUrl) {
    throw new Error("A imagem deve pertencer ao Storage oficial.");
  }
  return { url, storagePath };
}

export async function removeStorefrontAssets(supabase: SupabaseClient, paths: string[]) {
  const uniquePaths = [...new Set(paths.filter(Boolean))];
  if (!uniquePaths.length) return;
  const { error } = await supabase.storage.from(STOREFRONT_BUCKET).remove(uniquePaths);
  if (error) throw error;
}
