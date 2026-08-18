import { getMessaging } from "firebase-admin/messaging";
import { firebaseAdminApp } from "@/lib/firebase-admin";
import { prisma } from "@/lib/prisma";

type OrderPushData = {
  number: number;
  customerName: string;
  customerPhone: string;
  sessionId: string | null;
  status: string;
};

const STATUS_MESSAGES: Record<string, string> = {
  NOVO:
    "Recebemos o seu pedido. Em breve falaremos com você pelo WhatsApp.",

  CONFIRMADO:
    "Seu pedido foi confirmado com sucesso.",

  FINALIZADO:
    "Pedido finalizado. Obrigado por comprar com a Sra Make Prudente!",

  CANCELADO:
    "Seu pedido foi cancelado. Se precisar, fale com a gente pelo WhatsApp.",

  // Compatibilidade com pedidos antigos
  EM_CONFIRMACAO:
    "Seu pedido está em confirmação.",

  SEPARANDO:
    "Seu pedido está sendo preparado.",

  PRONTO_RETIRADA:
    "Seu pedido está pronto para retirada.",

  SAIU_ENTREGA:
    "Seu pedido está em processo de entrega.",
};

export async function notifyOrderStatus(order: OrderPushData) {
  try {
    const message = STATUS_MESSAGES[order.status];

    if (!message) return;

    // Prioridade: aparelho/sessão que fez o pedido.
    // Caso o pedido não tenha sessionId, usa o telefone como fallback.
    const where = order.sessionId
      ? {
          active: true,
          sessionId: order.sessionId,
        }
      : {
          active: true,
          phone: order.customerPhone,
        };

    const subscriptions = await prisma.pushSubscription.findMany({
      where,
      select: {
        id: true,
        token: true,
      },
    });

    if (subscriptions.length === 0) {
      console.log(
        `[push] Nenhum dispositivo encontrado para o pedido #${order.number}.`
      );
      return;
    }

    const messaging = getMessaging(firebaseAdminApp);

    const results = await Promise.allSettled(
      subscriptions.map((subscription) =>
        messaging.send({
          token: subscription.token,
          notification: {
            title: `Pedido #${order.number} • Sra Make Prudente`,
            body: message,
          },
          data: {
            orderNumber: String(order.number),
            status: order.status,
          },
          webpush: {
            fcmOptions: {
              link: "/loja",
            },
          },
        })
      )
    );

    const enviados = results.filter(
      (result) => result.status === "fulfilled"
    ).length;

    console.log(
      `[push] Pedido #${order.number}: ${enviados}/${subscriptions.length} notificação(ões) enviada(s).`
    );
  } catch (error) {
    // Push nunca deve impedir a atualização do pedido.
    console.error(
      `[push] Erro ao notificar pedido #${order.number}:`,
      error
    );
  }
}
