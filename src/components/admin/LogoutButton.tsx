"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";

export function LogoutButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleLogout() {
    setLoading(true);

    const supabase = createSupabaseBrowserClient();

    await supabase.auth.signOut();

    router.replace("/admin/login");
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      disabled={loading}
      className="rounded-full border border-rosa/20 px-4 py-2 text-xs font-bold text-rosa-profundo hover:bg-rosa/5 disabled:opacity-50"
    >
      {loading ? "Saindo..." : "Sair"}
    </button>
  );
}
