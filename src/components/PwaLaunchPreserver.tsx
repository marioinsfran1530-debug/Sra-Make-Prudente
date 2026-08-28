"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { ADMIN_RESUME_KEY } from "@/hooks/useNewProductDraft";

const ADMIN_RESUME_TTL_MS = 24 * 60 * 60 * 1000;
const STOREFRONT_RESUME_TTL_MS = 2 * 60 * 60 * 1000;
const STOREFRONT_RESUME_KEY = "sra-make:storefront-resume:v1";

type LaunchQueueLike = {
  setConsumer: (consumer: (params: unknown) => void) => void;
};

type ResumeEntry = {
  path?: unknown;
  updatedAt?: unknown;
};

function isStandaloneApp() {
  const displayStandalone = window.matchMedia?.("(display-mode: standalone)").matches ?? false;
  const iosStandalone = Boolean((window.navigator as Navigator & { standalone?: boolean }).standalone);
  return displayStandalone || iosStandalone;
}

function isSafeStorefrontPath(path: string) {
  const pathname = path.split("?", 1)[0];
  return (
    pathname.startsWith("/produto/") ||
    pathname === "/categoria" ||
    pathname.startsWith("/categoria/") ||
    pathname === "/busca" ||
    pathname === "/loja" ||
    pathname === "/carrinho"
  );
}

function readFreshResume(key: string, ttlMs: number) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const resume = JSON.parse(raw) as ResumeEntry;
    const path = typeof resume.path === "string" ? resume.path : "";
    const updatedAt = typeof resume.updatedAt === "number" ? resume.updatedAt : 0;
    const fresh = updatedAt > 0 && Date.now() - updatedAt <= ttlMs;
    if (!path || !fresh) {
      localStorage.removeItem(key);
      return null;
    }
    return path;
  } catch {
    localStorage.removeItem(key);
    return null;
  }
}

export function PwaLaunchPreserver() {
  const pathname = usePathname();
  const router = useRouter();
  const launchHandledRef = useRef(false);
  const restoringStorefrontRef = useRef(false);

  useEffect(() => {
    const launchQueue = (window as Window & { launchQueue?: LaunchQueueLike }).launchQueue;
    if (!launchQueue) return;

    // Com client_mode=focus-existing, consumir o lançamento sem navegar
    // mantém a rota e o estado da janela que já estava aberta.
    launchQueue.setConsumer(() => {});
  }, []);

  useEffect(() => {
    if (launchHandledRef.current) return;
    launchHandledRef.current = true;
    if (pathname !== "/" || !isStandaloneApp()) return;

    const adminPath = readFreshResume(ADMIN_RESUME_KEY, ADMIN_RESUME_TTL_MS);
    if (adminPath === "/admin/produtos/novo") {
      router.replace(adminPath);
      return;
    }

    const storefrontPath = readFreshResume(STOREFRONT_RESUME_KEY, STOREFRONT_RESUME_TTL_MS);
    if (storefrontPath && isSafeStorefrontPath(storefrontPath)) {
      restoringStorefrontRef.current = true;
      router.replace(storefrontPath);
    }
  }, [pathname, router]);

  useEffect(() => {
    if (!launchHandledRef.current) return;

    if (pathname === "/") {
      if (restoringStorefrontRef.current) return;
      localStorage.removeItem(STOREFRONT_RESUME_KEY);
      return;
    }

    restoringStorefrontRef.current = false;
    const path = `${pathname}${window.location.search}`;
    if (!isSafeStorefrontPath(path)) return;

    localStorage.setItem(
      STOREFRONT_RESUME_KEY,
      JSON.stringify({ path, updatedAt: Date.now() })
    );
  }, [pathname]);

  return null;
}
