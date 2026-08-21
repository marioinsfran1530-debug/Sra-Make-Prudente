import { prisma } from "@/lib/prisma";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export type AdminSession = {
  id: string;
  email: string;
  role: "ADMIN" | "EDITOR";
};

export async function getAdminSession(): Promise<AdminSession | null> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) return null;

  const profile = await prisma.adminProfile.findUnique({
    where: { id: user.id },
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
