import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/admin-auth";
import UsersManager from "@/components/admin/UsersManager";

export default async function UsuariosPage() {
  const session = await getAdminSession();

  if (!session) {
    redirect("/admin/login");
  }

  if (session.role !== "ADMIN") {
    redirect("/admin");
  }

  return <UsersManager />
}