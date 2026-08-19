import { getMessaging, getToken, isSupported } from "firebase/messaging";
import { firebaseApp } from "@/lib/firebase";
import { getOrCreateSessionId } from "@/lib/tracking";

export type PushOptInResult =
  | "enabled"
  | "unsupported"
  | "denied"
  | "unavailable"
  | "failed";

function getOrCreateDeviceId() {
  const key = "sramake_device_id";
  let deviceId = window.localStorage.getItem(key);

  if (!deviceId) {
    deviceId =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `device-${getOrCreateSessionId()}`;

    window.localStorage.setItem(key, deviceId);
  }

  return deviceId;
}

export async function subscribeToOrderNotifications(
  phone: string
): Promise<PushOptInResult> {
  try {
    if (
      typeof window === "undefined" ||
      !("Notification" in window) ||
      !("serviceWorker" in navigator)
    ) {
      return "unsupported";
    }

    // O pedido dispara esta função diretamente a partir do clique do cliente.
    // Pedimos a permissão antes de qualquer operação assíncrona longa para
    // preservar o gesto do usuário em navegadores mais restritivos.
    const permission = await Notification.requestPermission();

    if (permission !== "granted") {
      return "denied";
    }

    if (!(await isSupported())) {
      return "unsupported";
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
      return "unavailable";
    }

    const response = await fetch("/api/push/subscribe", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        deviceId: getOrCreateDeviceId(),
        token,
        sessionId: getOrCreateSessionId(),
        phone: phone.trim() || null,
      }),
    });

    return response.ok ? "enabled" : "failed";
  } catch (error) {
    console.error("Erro ao ativar notificações do pedido:", error);
    return "failed";
  }
}
