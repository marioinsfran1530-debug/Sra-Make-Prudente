"use client";

import { useEffect } from "react";
import { getTrackingPayload } from "@/lib/tracking";

type RecoveryPhase = "CONTACT" | "REVIEW" | "SUBMIT_ATTEMPT";

type StoredCartItem = {
  productId?: string;
  variantId?: string | null;
  qty?: number;
};

const CART_KEY = "sra-make-cart";

function readCart() {
  try {
    const raw = window.localStorage.getItem(CART_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as StoredCartItem[];
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((item) => item && typeof item.productId === "string")
      .slice(0, 50)
      .map((item) => ({
        productId: String(item.productId),
        variantId: item.variantId ? String(item.variantId) : null,
        qty: Math.max(1, Math.min(99, Math.floor(Number(item.qty) || 1))),
      }));
  } catch {
    return [];
  }
}

function fieldKind(input: HTMLInputElement) {
  const wrapper = input.parentElement;
  const label = wrapper?.querySelector("p")?.textContent?.trim().toLowerCase() ?? "";
  if (label === "nome") return "name";
  if (label === "whatsapp") return "phone";
  return null;
}

export default function CheckoutRecoveryObserver() {
  useEffect(() => {
    let name = "";
    let phone = "";
    let timer: ReturnType<typeof setTimeout> | null = null;
    let lastFingerprint = "";

    function syncVisibleFields() {
      document.querySelectorAll<HTMLInputElement>("input").forEach((input) => {
        const kind = fieldKind(input);
        if (kind === "name" && input.value.trim()) name = input.value.trim();
        if (kind === "phone" && input.value.trim()) phone = input.value.trim();
      });
    }

    async function capture(phase: RecoveryPhase) {
      syncVisibleFields();
      const digits = phone.replace(/\D/g, "").replace(/^55(?=\d{10,11}$)/, "");
      const items = readCart();
      if (name.trim().length < 2 || (digits.length !== 10 && digits.length !== 11) || items.length === 0) {
        return;
      }

      const tracking = getTrackingPayload();
      if (!tracking.sessionId) return;

      const fingerprint = JSON.stringify({
        phase,
        name: name.trim(),
        phone: digits,
        items: items.map((item) => [item.productId, item.variantId, item.qty]),
      });
      if (fingerprint === lastFingerprint) return;
      lastFingerprint = fingerprint;

      try {
        await fetch("/api/checkout-recovery", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          keepalive: true,
          body: JSON.stringify({
            customerName: name.trim(),
            customerPhone: phone,
            sessionId: tracking.sessionId,
            items,
            phase,
          }),
        });
      } catch {
        // Recuperação nunca deve atrapalhar o checkout.
      }
    }

    function scheduleContactCapture() {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => void capture("CONTACT"), 900);
    }

    function onInput(event: Event) {
      const input = event.target;
      if (!(input instanceof HTMLInputElement)) return;
      const kind = fieldKind(input);
      if (kind === "name") name = input.value;
      if (kind === "phone") phone = input.value;
      if (kind) scheduleContactCapture();
    }

    function onClick(event: MouseEvent) {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const button = target.closest("button");
      const label = button?.textContent?.replace(/\s+/g, " ").trim().toLowerCase() ?? "";
      if (label.includes("revisar pedido")) void capture("REVIEW");
      if (label.includes("registrar pedido")) void capture("SUBMIT_ATTEMPT");
    }

    document.addEventListener("input", onInput, true);
    document.addEventListener("click", onClick, true);

    const scanTimer = window.setInterval(syncVisibleFields, 1200);
    syncVisibleFields();

    return () => {
      if (timer) clearTimeout(timer);
      window.clearInterval(scanTimer);
      document.removeEventListener("input", onInput, true);
      document.removeEventListener("click", onClick, true);
    };
  }, []);

  return null;
}
