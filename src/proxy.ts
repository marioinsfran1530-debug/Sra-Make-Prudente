import { NextResponse, type NextRequest } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";

const PUBLIC_ADMIN_PATHS = ["/admin/login", "/admin/reset-password"];
const MUTATING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);
const TRUSTED_ADMIN_DEVICE_COOKIE = "sra_admin_trusted_device";

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

async function sha256Hex(value: string) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

async function isTrustedAdminDevice(request: NextRequest, adminId: string) {
  const token = request.cookies.get(TRUSTED_ADMIN_DEVICE_COOKIE)?.value;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!token || token.length < 32 || !supabaseUrl || !serviceRoleKey) {
    return false;
  }

  try {
    const tokenHash = await sha256Hex(token);
    const url = new URL("/rest/v1/AdminTrustedDevice", supabaseUrl);
    url.searchParams.set("select", "id");
    url.searchParams.set("adminId", `eq.${adminId}`);
    url.searchParams.set("tokenHash", `eq.${tokenHash}`);
    url.searchParams.set("revokedAt", "is.null");
    url.searchParams.set("expiresAt", `gt.${new Date().toISOString()}`);
    url.searchParams.set("limit", "1");

    const response = await fetch(url, {
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
      },
      cache: "no-store",
    });

    if (!response.ok) return false;
    const devices = (await response.json()) as Array<{ id: string }>;
    return devices.length > 0;
  } catch {
    return false;
  }
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

  const isMfaSetupPage = pathname === "/admin/seguranca";
  const isMfaChallengePage = pathname === "/admin/mfa";
  const isMfaFlowPage = isMfaSetupPage || isMfaChallengePage;

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

    if (!isMfaSetupPage) {
      return redirectTo(request, "/admin/seguranca");
    }

    return response;
  }

  const trustedDevice = isMfaVerified
    ? true
    : await isTrustedAdminDevice(request, user.id);

  if (!trustedDevice) {
    if (isAdminApi) {
      return NextResponse.json(
        {
          error: "Confirme o código da autenticação em duas etapas.",
          code: "MFA_REQUIRED",
        },
        { status: 403 }
      );
    }

    if (!isMfaChallengePage) {
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
