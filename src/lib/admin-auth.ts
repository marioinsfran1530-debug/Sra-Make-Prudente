import { prisma } from "@/lib/prisma";
import { createSupabaseServerClient } from "@/lib/supabase";

export type AdminSession = {
  id: string;
  email: string;
  role: "ADMIN" | "EDITOR";
};

// Repete a validação de sessão no servidor, mesmo já passando pelo
// middleware — regra explícita do plano (seção 3): nunca confiar só na
// proteção visual/rota do frontend.
export async function getAdminSession(): Promise<AdminSession | null> {
  const supabase = createSupabaseServerClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) return null;

  const profile = await prisma.adminProfile.findUnique({
    where: { id: session.user.id },
  });

  if (!profile || !profile.active) return null;

  return { id: profile.id, email: profile.email, role: profile.role };
}

export async function requireAdmin(minRole: "ADMIN" | "EDITOR" = "EDITOR") {
  const session = await getAdminSession();
  if (!session) {
    return { session: null, error: "Não autenticado.", status: 401 as const };
  }
  if (minRole === "ADMIN" && session.role !== "ADMIN") {
    return { session: null, error: "Permissão insuficiente.", status: 403 as const };
  }
  return { session, error: null, status: 200 as const };
}
