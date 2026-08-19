"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { User, LogIn, LayoutDashboard, LogOut } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";

export function StoreAccountButton() {
  const [open, setOpen] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);
  const [loading, setLoading] = useState(true);

  const supabase = createSupabaseBrowserClient();

  useEffect(() => {
    async function checkSession() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      setLoggedIn(!!session);
      setLoading(false);
    }

    checkSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setLoggedIn(!!session);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  async function handleLogout() {
    await supabase.auth.signOut();
    setOpen(false);
    setLoggedIn(false);
    window.location.href = "/";
  }

  if (loading) {
    return <div className="w-9 h-9 rounded-full bg-creme animate-pulse" />;
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="w-9 h-9 rounded-full bg-creme flex items-center justify-center"
        aria-label="Conta"
      >
        <User size={18} className="text-rosa-profundo" />
      </button>

      {open && (
        <>
          <button
            type="button"
            aria-label="Fechar menu"
            className="fixed inset-0 z-40 cursor-default"
            onClick={() => setOpen(false)}
          />

          <div className="absolute right-0 top-11 z-50 w-56 rounded-2xl bg-white border border-rosa/10 shadow-lg p-2">
            {loggedIn ? (
              <>
                <Link
                  href="/admin"
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-bold text-texto hover:bg-creme"
                >
                  <LayoutDashboard size={18} className="text-rosa-profundo" />
                  Painel administrativo
                </Link>

                <button
                  type="button"
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-bold text-vermelho hover:bg-creme"
                >
                  <LogOut size={18} />
                  Sair
                </button>
              </>
            ) : (
              <Link
                href="/admin/login"
                onClick={() => setOpen(false)}
                className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-bold text-texto hover:bg-creme"
              >
                <LogIn size={18} className="text-rosa-profundo" />
                Acesso administrativo
              </Link>
            )}
          </div>
        </>
      )}
    </div>
  );
}
