import { redirect } from "next/navigation";

// A verificação em duas etapas foi desativada: o acesso é só e-mail e senha.
export default function Page() {
  redirect("/admin");
}
