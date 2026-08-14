import { createBrowserClient, createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// Client para uso em componentes client ("use client").
// Usa sempre a chave anônima — nunca a service role.
export function createSupabaseBrowserClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

// Client para uso em Server Components / Route Handlers, lendo a sessão
// a partir dos cookies da requisição. Também usa a chave anônima —
// a service role só deve ser usada dentro de lib/supabase-admin.ts
// (arquivo a criar na Fase 5, nunca importado por código client).
export function createSupabaseServerClient() {
  const cookieStore = cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options) {
          cookieStore.set({ name, value, ...options });
        },
        remove(name: string, options) {
          cookieStore.set({ name, value: "", ...options });
        },
      },
    }
  );
}
