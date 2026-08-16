"use client";

import { useEffect, useState } from "react";
import {
  getMessaging,
  getToken,
  isSupported,
  onMessage,
} from "firebase/messaging";
import { Bell, CheckCircle2 } from "lucide-react";
import { firebaseApp } from "@/lib/firebase";
import { getOrCreateSessionId } from "@/lib/tracking";

export function PushNotificationButton() {
  const [loading, setLoading] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [testing, setTesting] = useState(false);
  const [testSuccess, setTestSuccess] = useState(false);
  const [received, setReceived] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;

    async function listen() {
      if (!(await isSupported())) return;

      const messaging = getMessaging(firebaseApp);

      unsubscribe = onMessage(messaging, (payload) => {
        console.log("FCM mensagem recebida em primeiro plano:", payload);

        setReceived(true);

        const title =
          payload.notification?.title ?? "Sra Make Prudente";

        const body =
          payload.notification?.body ?? "Você recebeu uma atualização.";

        if (
          Notification.permission === "granted" &&
          "serviceWorker" in navigator
        ) {
          navigator.serviceWorker.ready.then((registration) => {
            registration.showNotification(title, {
              body,
              icon: "/icon-192.png",
            });
          });
        }
      });
    }

    listen();

    return () => {
      unsubscribe?.();
    };
  }, []);

  async function enableNotifications() {
    setLoading(true);
    setError(null);

    try {
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

      const generatedToken = await getToken(messaging, {
        vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
        serviceWorkerRegistration: registration,
      });

      if (!generatedToken) {
        setError("Não foi possível gerar o identificador deste dispositivo.");
        return;
      }

      console.log("FCM TOKEN:", generatedToken);

      let deviceId = localStorage.getItem("sramake_device_id");

      if (!deviceId) {
        deviceId = crypto.randomUUID();
        localStorage.setItem("sramake_device_id", deviceId);
      }

      const saveResponse = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          deviceId,
          token: generatedToken,
          sessionId: getOrCreateSessionId(),
        }),
      });

      if (!saveResponse.ok) {
        throw new Error("Não foi possível registrar o aparelho.");
      }

      setToken(generatedToken);
      setEnabled(true);
    } catch (err) {
      console.error("Erro ao ativar notificações:", err);
      setError("Não foi possível ativar as notificações.");
    } finally {
      setLoading(false);
    }
  }

  async function sendTestNotification() {
    if (!token) return;

    setTesting(true);
    setTestSuccess(false);
    setReceived(false);
    setError(null);

    try {
      const response = await fetch("/api/admin/push/test", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ token }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "Erro ao enviar notificação.");
      }

      setTestSuccess(true);
    } catch (err) {
      console.error(err);
      setError("Não foi possível enviar a notificação de teste.");
    } finally {
      setTesting(false);
    }
  }

  if (enabled) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-xs font-bold text-green-700">
          <CheckCircle2 size={16} />
          Notificações ativadas neste aparelho
        </div>

        <button
          type="button"
          onClick={sendTestNotification}
          disabled={testing}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-rosa-profundo px-4 py-2.5 text-xs font-bold text-white disabled:opacity-60"
        >
          <Bell size={15} />
          {testing ? "Enviando..." : "Enviar notificação de teste"}
        </button>

        {testSuccess && (
          <p className="text-xs font-bold text-green-700">
            Notificação enviada pelo servidor.
          </p>
        )}

        {received && (
          <p className="text-xs font-bold text-green-700">
            Notificação recebida neste aparelho.
          </p>
        )}

        {error && (
          <p className="text-xs text-vermelho">
            {error}
          </p>
        )}
      </div>
    );
  }

  return (
    <div>
      <button
        type="button"
        onClick={enableNotifications}
        disabled={loading}
        className="inline-flex items-center justify-center gap-2 rounded-xl bg-rosa-profundo px-4 py-2.5 text-xs font-bold text-white disabled:opacity-60"
      >
        <Bell size={15} />
        {loading ? "Ativando..." : "Ativar notificações"}
      </button>

      {error && (
        <p className="mt-2 text-xs text-vermelho">
          {error}
        </p>
      )}
    </div>
  );
}
