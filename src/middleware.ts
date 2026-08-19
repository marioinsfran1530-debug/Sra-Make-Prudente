import { NextResponse, type NextRequest } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";

// Protege /admin/* no nível de rede. A verificação de usuário é repetida
// depois no layout server-side e em cada rota /api/admin/* — o middleware
// nunca é a única camada de proteção.
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // /admin/login e /admin/reset-password ficam fora da checagem: o link de
  // recuperação de senha do Supabase chega com o token no #hash da URL, que
  // o servidor nunca vê (só o navegador).
  const PUBLIC_ADMIN_PATHS = ["/admin/login", "/admin/reset-password"];
  if (
    !pathname.startsWith("/admin") ||
    PUBLIC_ADMIN_PATHS.some((p) => pathname.startsWith(p))
  ) {
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

  // getUser valida o token junto ao Supabase Auth. Não usamos getSession
  // para autorização porque uma sessão lida diretamente do cookie não deve
  // ser tratada como prova suficiente de identidade no servidor.
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    const loginUrl = new URL("/admin/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return response;
}

export const config = {
  matcher: ["/admin/:path*"],
};
