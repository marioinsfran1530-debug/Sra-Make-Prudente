"use client";

import { useEffect, useState } from "react";
import { BellRing, X } from "lucide-react";

const STORAGE_KEY = "sramake_admin_push_enabled";
const DISMISS_KEY = "sramake_admin_push_dismissed";

function getOrCreateDeviceId() {
  const key = "sramake_device_id";
  let deviceId = window.localStorage.getItem(key);

  if (!deviceId) {
    deviceId =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `device-${Date.now()}-${Math.random()}`;
    window.localStorage.setItem(key, deviceId);
  }

  return deviceId;
}

export function AdminOrderPushBanner() {
  const [visible, setVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    try {
      const alreadyEnabled = window.localStorage.getItem(STORAGE_KEY) === "1";
      const dismissed = window.localStorage.getItem(DISMISS_KEY) === "1";
      const supported =
        typeof window !== "undefined" &&
        "Notification" in window &&
        "serviceWorker" in navigator;

      setVisible(supported && !alreadyEnabled && !dismissed);
    } catch {
      setVisible(false);
    }
  }, []);

  async function activate() {
    setLoading(true);
    setError(null);

    try {
      const { getMessaging, getToken, isSupported } = await import("firebase/messaging");
      const { firebaseApp } = await import("@/lib/firebase");

      if (!(await isSupported())) {
        setError("Este navegador não oferece suporte a notificações.");
        return;
      }

      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setError("Permissão para notificações não foi concedida.");
        return;
      }

      const registration = await navigator.serviceWorker.register(
        "/firebase-messaging-sw.js"
      );

      const messaging = getMessaging(firebaseApp);
      const token = await getToken(messaging, {
        vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
        serviceWorkerRegistration: registration,
      });

      if (!token) {
        setError("Não foi possível gerar o identificador deste dispositivo.");
        return;
      }

      const deviceId = getOrCreateDeviceId();

      const response = await fetch("/api/admin/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deviceId, token }),
      });

      if (!response.ok) {
        throw new Error("Não foi possível registrar este aparelho.");
      }

      window.localStorage.setItem(STORAGE_KEY, "1");
      setSuccess(true);
      window.setTimeout(() => setVisible(false), 2500);
    } catch (err) {
      console.error("Erro ao ativar notificações do admin:", err);
      setError("Não foi possível ativar as notificações neste aparelho.");
    } finally {
      setLoading(false);
    }
  }

  function dismiss() {
    try {
      window.localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      // ignora
    }
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div className="mb-4 flex items-start gap-3 rounded-2xl border border-rosa-profundo/20 bg-white p-4 shadow-sm">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-rosa/10 text-rosa-profundo">
        <BellRing size={18} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold text-texto">Ativar aviso de pedido novo neste aparelho</p>
        <p className="mt-1 text-xs leading-5 text-cinza">
          Você recebe uma notificação assim que um pedido novo chega, mesmo com o painel fechado.
        </p>

        {success ? (
          <p className="mt-2 text-xs font-bold text-green-700">Notificações ativadas neste aparelho.</p>
        ) : (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={activate}
              disabled={loading}
              className="rounded-xl bg-rosa-profundo px-4 py-2 text-xs font-bold text-white disabled:opacity-60"
            >
              {loading ? "Ativando..." : "Ativar notificações"}
            </button>
            <button
              type="button"
              onClick={dismiss}
              className="rounded-xl px-3 py-2 text-xs font-bold text-cinza"
            >
              Agora não
            </button>
          </div>
        )}

        {error && <p className="mt-2 text-xs text-vermelho">{error}</p>}
      </div>

      <button
        type="button"
        onClick={dismiss}
        aria-label="Fechar aviso"
        className="shrink-0 rounded-full p-1 text-cinza hover:bg-creme"
      >
        <X size={16} />
      </button>
    </div>
  );
}
