import { prisma } from "@/lib/prisma";
import { logCrmInteraction } from "@/lib/crm-activity";

export function normalizeCrmPhone(value: string) {
  let digits = value.replace(/\D/g, "");
  if (digits.startsWith("55") && digits.length >= 12) digits = digits.slice(2);
  return digits;
}

export function normalizeCrmSource(value: string | null | undefined, fallback = "outro") {
  const raw = String(value ?? "").trim().toLowerCase();
  if (!raw) return fallback;

  if (raw.includes("instagram") || raw === "ig") return "instagram";
  if (raw.includes("facebook") || raw === "fb" || raw === "meta") return "facebook";
  if (raw.includes("google")) return "google";
  if (raw.includes("whatsapp") || raw.includes("wa.me")) return "whatsapp";
  if (raw.includes("tiktok")) return "tiktok";
  if (raw.includes("indic")) return "indicacao";
  if (raw.includes("loja_fisica") || raw.includes("loja física") || raw === "loja") return "loja_fisica";
  if (
    raw.includes("catalog") ||
    raw.includes("sramakeprudente") ||
    raw.includes("vercel.app") ||
    raw.includes("github.dev") ||
    raw === "site"
  ) return "catalogo";
  if (raw === "manual") return "manual";
  if (raw === "outro") return "outro";

  return raw.slice(0, 100);
}

function sourceFromOrder(order: { origin: string | null; utmSource: string | null; channel: string }) {
  const fallback = normalizeCrmSource(order.channel.toLowerCase(), "catalogo");
  return normalizeCrmSource(order.utmSource || order.origin, fallback);
}

export async function syncOrderToCrm(orderId: string) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      number: true,
      customerId: true,
      customerName: true,
      customerPhone: true,
      total: true,
      status: true,
      channel: true,
      origin: true,
      utmSource: true,
      utmCampaign: true,
      utmContent: true,
      createdAt: true,
      items: { select: { productId: true } },
    },
  });

  if (!order) return null;
  const phone = normalizeCrmPhone(order.customerPhone);
  if (phone.length < 10) return null;

  const source = sourceFromOrder(order);
  const customer = await prisma.customer.upsert({
    where: { phone },
    create: {
      name: order.customerName,
      phone,
      source,
      lastContactAt: order.createdAt,
    },
    update: {
      name: order.customerName,
      lastContactAt: new Date(),
    },
  });

  await prisma.$executeRaw`
    UPDATE "Customer"
    SET "source" = COALESCE("source", ${source}), "updatedAt" = NOW()
    WHERE "id" = ${customer.id}
  `;

  if (order.customerId !== customer.id) {
    await prisma.order.update({ where: { id: order.id }, data: { customerId: customer.id } });
  }

  const productIds = Array.from(new Set(order.items.map((item) => item.productId).filter(Boolean)));
  const openStages = ["NOVO", "ATENDIMENTO", "PRODUTO_INDICADO", "AGUARDANDO_PAGAMENTO", "RECOMPRA"] as const;
  const finalStage = order.status === "FINALIZADO" ? "VENDIDO" : order.status === "CANCELADO" ? "PERDIDO" : "AGUARDANDO_PAGAMENTO";

  let lead = productIds.length
    ? await prisma.crmLead.findFirst({
        where: { customerId: customer.id, stage: { in: [...openStages] }, productId: { in: productIds } },
        orderBy: { updatedAt: "desc" },
      })
    : null;

  if (!lead) {
    lead = await prisma.crmLead.findFirst({
      where: { customerId: customer.id, stage: { in: [...openStages] }, productId: null },
      orderBy: { updatedAt: "desc" },
    });
  }

  if (!lead) {
    lead = await prisma.crmLead.create({
      data: {
        customerId: customer.id,
        stage: finalStage,
        productId: productIds.length === 1 ? productIds[0] : null,
        estimatedValue: order.total,
        source,
        lastContactAt: order.createdAt,
        closedAt: finalStage === "VENDIDO" || finalStage === "PERDIDO" ? new Date() : null,
        lostReason: finalStage === "PERDIDO" ? "Pedido cancelado" : null,
      },
    });
  } else {
    lead = await prisma.crmLead.update({
      where: { id: lead.id },
      data: {
        stage: finalStage,
        estimatedValue: order.total,
        source: lead.source || source,
        productId: lead.productId || (productIds.length === 1 ? productIds[0] : null),
        lastContactAt: new Date(),
        closedAt: finalStage === "VENDIDO" || finalStage === "PERDIDO" ? new Date() : null,
        lostReason: finalStage === "PERDIDO" ? "Pedido cancelado" : null,
      },
    });
  }

  if (order.utmCampaign || order.utmContent) {
    await prisma.$executeRaw`
      UPDATE "CrmLead"
      SET "campaign" = COALESCE("campaign", ${order.utmCampaign}),
          "campaignContent" = COALESCE("campaignContent", ${order.utmContent}),
          "updatedAt" = NOW()
      WHERE "id" = ${lead.id}
    `;
  }

  if (finalStage === "VENDIDO") {
    await prisma.crmFollowUp.updateMany({
      where: { customerId: customer.id, leadId: lead.id, status: "PENDENTE" },
      data: { status: "CONCLUIDO", completedAt: new Date() },
    });
  }

  const body = `Pedido #${order.number} · ${order.status} · ${Number(order.total).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}`;
  const alreadyLogged = await prisma.$queryRaw<Array<{ id: string }>>`
    SELECT "id" FROM "CrmInteraction"
    WHERE "orderId" = ${order.id} AND "body" = ${body}
    LIMIT 1
  `;

  if (!alreadyLogged[0]) {
    const anyOrderEvent = await prisma.$queryRaw<Array<{ id: string }>>`
      SELECT "id" FROM "CrmInteraction" WHERE "orderId" = ${order.id} LIMIT 1
    `;
    const kind = finalStage === "VENDIDO"
      ? "ORDER_FINALIZED"
      : anyOrderEvent[0]
        ? "ORDER_STATUS_CHANGED"
        : "ORDER_CREATED";
    await logCrmInteraction({
      customerId: customer.id,
      leadId: lead.id,
      productId: lead.productId,
      orderId: order.id,
      kind,
      channel: order.channel.toLowerCase(),
      body,
      metadata: { source, utmCampaign: order.utmCampaign, utmContent: order.utmContent },
    });
  }

  return { customerId: customer.id, leadId: lead.id, stage: finalStage };
}

export async function syncCrmFromOrderStatus(orderId: string) {
  return syncOrderToCrm(orderId);
}
