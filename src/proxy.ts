import { NextResponse, type NextRequest } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";

const PUBLIC_ADMIN_PATHS = ["/admin/login", "/admin/reset-password"];
const MFA_FLOW_PATHS = ["/admin/mfa", "/admin/seguranca"];
const MUTATING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

function isSameOrigin(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (!origin) return false;

  try {
    return new URL(origin).origin === request.nextUrl.origin;
  } catch {
    return false;
  }
}

function redirectTo(request: NextRequest, pathname: string) {
  return NextResponse.redirect(new URL(pathname, request.url));
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isAdminPage = pathname.startsWith("/admin");
  const isAdminApi = pathname.startsWith("/api/admin");

  if (!isAdminPage && !isAdminApi) {
    return NextResponse.next();
  }

  if (
    isAdminPage &&
    PUBLIC_ADMIN_PATHS.some((path) => pathname.startsWith(path))
  ) {
    return NextResponse.next();
  }

  if (isAdminApi && MUTATING_METHODS.has(request.method) && !isSameOrigin(request)) {
    return NextResponse.json(
      { error: "Origem da requisição não permitida." },
      { status: 403 }
    );
  }

  const response = NextResponse.next({ request: { headers: request.headers } });

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
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    if (isAdminApi) {
      return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
    }

    const loginUrl = new URL("/admin/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  const isMfaFlowPage =
    isAdminPage && MFA_FLOW_PATHS.some((path) => pathname.startsWith(path));

  const { data: aal, error: aalError } =
    await supabase.auth.mfa.getAuthenticatorAssuranceLevel();

  if (aalError || !aal) {
    if (isAdminApi) {
      return NextResponse.json(
        { error: "Não foi possível validar a segurança da sessão." },
        { status: 403 }
      );
    }

    if (!isMfaFlowPage) {
      return redirectTo(request, "/admin/seguranca");
    }

    return response;
  }

  const hasVerifiedMfa = aal.nextLevel === "aal2";
  const isMfaVerified = aal.currentLevel === "aal2";

  if (!hasVerifiedMfa) {
    if (isAdminApi) {
      return NextResponse.json(
        {
          error: "Autenticação em duas etapas obrigatória.",
          code: "MFA_SETUP_REQUIRED",
        },
        { status: 428 }
      );
    }

    if (!pathname.startsWith("/admin/seguranca")) {
      return redirectTo(request, "/admin/seguranca");
    }

    return response;
  }

  if (!isMfaVerified) {
    if (isAdminApi) {
      return NextResponse.json(
        {
          error: "Confirme o código da autenticação em duas etapas.",
          code: "MFA_REQUIRED",
        },
        { status: 403 }
      );
    }

    if (!pathname.startsWith("/admin/mfa")) {
      return redirectTo(request, "/admin/mfa");
    }

    return response;
  }

  if (isMfaFlowPage) {
    return redirectTo(request, "/admin");
  }

  return response;
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};
