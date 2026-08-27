"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { ADMIN_RESUME_KEY } from "@/hooks/useNewProductDraft";

const RESUME_TTL_MS = 24 * 60 * 60 * 1000;

type LaunchQueueLike = {
  setConsumer: (consumer: (params: unknown) => void) => void;
};

function isStandaloneApp() {
  const displayStandalone = window.matchMedia?.("(display-mode: standalone)").matches ?? false;
  const iosStandalone = Boolean((window.navigator as Navigator & { standalone?: boolean }).standalone);
  return displayStandalone || iosStandalone;
}

export function PwaLaunchPreserver() {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    const launchQueue = (window as Window & { launchQueue?: LaunchQueueLike }).launchQueue;
    if (!launchQueue) return;

    // Com client_mode=focus-existing, consumir o lançamento sem navegar
    // mantém a rota e o estado da janela que já estava aberta.
    launchQueue.setConsumer(() => {});
  }, []);

  useEffect(() => {
    if (pathname !== "/" || !isStandaloneApp()) return;

    try {
      const raw = localStorage.getItem(ADMIN_RESUME_KEY);
      if (!raw) return;
      const resume = JSON.parse(raw) as { path?: unknown; updatedAt?: unknown };
      const path = typeof resume.path === "string" ? resume.path : "";
      const updatedAt = typeof resume.updatedAt === "number" ? resume.updatedAt : 0;
      const fresh = updatedAt > 0 && Date.now() - updatedAt <= RESUME_TTL_MS;
      const safeAdminPath = path === "/admin/produtos/novo";

      if (!fresh || !safeAdminPath) {
        localStorage.removeItem(ADMIN_RESUME_KEY);
        return;
      }

      router.replace(path);
    } catch {
      localStorage.removeItem(ADMIN_RESUME_KEY);
    }
  }, [pathname, router]);

  return null;
}
