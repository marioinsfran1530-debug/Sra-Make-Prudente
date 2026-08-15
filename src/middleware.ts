import { NextResponse, type NextRequest } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";

// Protege /admin/* no nível de rede. A verificação de sessão é repetida
// depois no layout server-side e em cada rota /api/admin/* — o middleware
// nunca é a única camada de proteção (ver seção 3 do plano).
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // /admin/login e /admin/reset-password ficam fora da checagem: o link de
  // recuperação de senha do Supabase chega com o token no #hash da URL, que
  // o servidor NUNCA vê (só o navegador) — bloquear aqui criaria um loop de
  // redirecionamento antes do supabase-js conseguir ler o token no client.
  const PUBLIC_ADMIN_PATHS = ["/admin/login", "/admin/reset-password"];
  if (!pathname.startsWith("/admin") || PUBLIC_ADMIN_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  let response = NextResponse.next({ request: { headers: request.headers } });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          response.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          response.cookies.set({ name, value: "", ...options });
        },
      },
    }
  );

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    const loginUrl = new URL("/admin/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  return response;
}

export const config = {
  matcher: ["/admin/:path*"],
};
