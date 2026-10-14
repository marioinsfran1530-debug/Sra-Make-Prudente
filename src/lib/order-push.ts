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

type NewOrderPushData = {
  id: string;
  number: number;
  customerName: string;
  customerPhone: string;
  total: number;
  channel: string;
};

export async function notifyNewOrderToAdmins(order: NewOrderPushData) {
  try {
    const subscriptions = await prisma.pushSubscription.findMany({
      where: { active: true, isAdmin: true },
      select: { id: true, token: true },
    });

    if (subscriptions.length === 0) {
      console.log(
        `[push-admin] Nenhum admin com notificações ativas para o pedido #${order.number}.`
      );
      return;
    }

    const messaging = getMessaging(firebaseAdminApp);

    const formattedTotal = order.total.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });

    const results = await Promise.allSettled(
      subscriptions.map((subscription) =>
        messaging.send({
          token: subscription.token,
          notification: {
            title: `Novo pedido #${order.number} • ${formattedTotal}`,
            body: `${order.customerName} — toque para abrir o pedido.`,
          },
          data: {
            orderId: order.id,
            orderNumber: String(order.number),
            type: "new_order",
          },
          webpush: {
            fcmOptions: {
              link: `/admin/pedidos/${order.id}`,
            },
          },
        })
      )
    );

    const invalidTokenIds: string[] = [];
    results.forEach((result, index) => {
      if (result.status === "rejected") {
        const code = (result.reason as { code?: string } | undefined)?.code;
        if (
          code === "messaging/registration-token-not-registered" ||
          code === "messaging/invalid-registration-token"
        ) {
          invalidTokenIds.push(subscriptions[index].id);
        }
      }
    });

    if (invalidTokenIds.length > 0) {
      await prisma.pushSubscription.updateMany({
        where: { id: { in: invalidTokenIds } },
        data: { active: false },
      });
    }

    const enviados = results.filter((result) => result.status === "fulfilled").length;

    console.log(
      `[push-admin] Pedido #${order.number}: ${enviados}/${subscriptions.length} notificação(ões) enviada(s) para admins.`
    );
  } catch (error) {
    // Push nunca deve impedir a criação do pedido.
    console.error(
      `[push-admin] Erro ao notificar admins sobre o pedido #${order.number}:`,
      error
    );
  }
}

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
