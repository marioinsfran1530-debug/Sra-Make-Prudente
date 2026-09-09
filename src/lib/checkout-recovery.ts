import { prisma } from "@/lib/prisma";

type CheckoutItemInput = {
  productId: string;
  variantId: string | null;
  qty: number;
};

export type CheckoutRecoveryPhase =
  | "CONTACT"
  | "REVIEW"
  | "SUBMIT_ATTEMPT";

type CaptureCheckoutInput = {
  customerName: string;
  customerPhone: string;
  sessionId: string;
  items: CheckoutItemInput[];
  deliveryType?: string;
  payment?: string;
  phase?: CheckoutRecoveryPhase;
};

export type CheckoutRecoveryRef = {
  customerId: string;
  leadId: string;
};

const CHECKOUT_SOURCE = "catalogo_checkout";

function safeQty(value: unknown) {
  const qty = Math.floor(Number(value));
  return Number.isFinite(qty) && qty > 0 ? Math.min(qty, 99) : 1;
}

function normalizeCustomerPhone(value: string) {
  let digits = value.replace(/\D/g, "");
  if (digits.startsWith("55") && digits.length > 11) digits = digits.slice(2);
  return digits;
}

function phaseCopy(phase: CheckoutRecoveryPhase) {
  if (phase === "CONTACT") {
    return {
      note: "Cliente iniciou o checkout, informou nome e WhatsApp, mas o pedido ainda não foi concluído.",
      body: "Cliente informou contato durante o checkout do catálogo.",
    };
  }
  if (phase === "REVIEW") {
    return {
      note: "Cliente chegou à revisão do checkout, mas o pedido ainda não foi concluído.",
      body: "Cliente chegou à revisão do pedido no catálogo.",
    };
  }
  return {
    note: "Cliente tentou registrar um pedido pelo catálogo. Verificar se a compra foi concluída.",
    body: "Cliente tentou registrar um pedido pelo catálogo.",
  };
}

export async function captureCheckoutOpportunity(
  input: CaptureCheckoutInput
): Promise<CheckoutRecoveryRef | null> {
  try {
    const normalizedPhone = normalizeCustomerPhone(input.customerPhone);
    if (normalizedPhone.length !== 10 && normalizedPhone.length !== 11) return null;

    const phase = input.phase ?? "SUBMIT_ATTEMPT";
    const copy = phaseCopy(phase);

    const customer = await prisma.customer.upsert({
      where: { phone: normalizedPhone },
      update: {
        name: input.customerName,
      },
      create: {
        name: input.customerName,
        phone: normalizedPhone,
        source: CHECKOUT_SOURCE,
      },
      select: { id: true },
    });

    const latestCheckout = input.sessionId
      ? await prisma.analyticsEvent.findFirst({
          where: {
            sessionId: input.sessionId,
            event: "begin_checkout",
          },
          orderBy: { createdAt: "desc" },
          select: { value: true, itemCount: true, createdAt: true },
        })
      : null;

    const productIds = [
      ...new Set(
        input.items
          .map((item) => (typeof item.productId === "string" ? item.productId : ""))
          .filter(Boolean)
      ),
    ];

    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
      select: {
        id: true,
        name: true,
        brand: true,
        price: true,
        promoPrice: true,
        variants: {
          select: {
            id: true,
            name: true,
            price: true,
            promoPrice: true,
          },
        },
      },
    });

    const productById = new Map(products.map((product) => [product.id, product]));
    const cartSnapshot = input.items.slice(0, 50).map((item) => {
      const product = productById.get(item.productId);
      const variant = item.variantId
        ? product?.variants.find((candidate) => candidate.id === item.variantId)
        : null;
      const unitPrice = variant
        ? Number(variant.promoPrice ?? variant.price ?? product?.promoPrice ?? product?.price ?? 0)
        : Number(product?.promoPrice ?? product?.price ?? 0);

      return {
        productId: item.productId,
        productName: product?.name ?? "Produto não encontrado",
        brand: product?.brand ?? null,
        variantId: item.variantId || null,
        variantName: variant?.name ?? null,
        qty: safeQty(item.qty),
        unitPrice,
      };
    });

    const calculatedValue = cartSnapshot.reduce(
      (total, item) => total + item.unitPrice * item.qty,
      0
    );
    const estimatedValue = Number.isFinite(calculatedValue)
      ? calculatedValue
      : latestCheckout?.value == null
        ? null
        : Number(latestCheckout.value);
    const sessionCode = input.sessionId || null;

    let lead = sessionCode
      ? await prisma.crmLead.findFirst({
          where: {
            customerId: customer.id,
            source: CHECKOUT_SOURCE,
            campaignCode: sessionCode,
            stage: { notIn: ["VENDIDO", "PERDIDO"] },
          },
          orderBy: { updatedAt: "desc" },
          select: { id: true },
        })
      : null;

    if (lead) {
      lead = await prisma.crmLead.update({
        where: { id: lead.id },
        data: {
          estimatedValue,
          notes: copy.note,
        },
        select: { id: true },
      });
    } else {
      lead = await prisma.crmLead.create({
        data: {
          customerId: customer.id,
          stage: "NOVO",
          estimatedValue,
          source: CHECKOUT_SOURCE,
          campaignCode: sessionCode,
          notes: copy.note,
        },
        select: { id: true },
      });
    }

    const recentInteraction = await prisma.crmInteraction.findFirst({
      where: {
        leadId: lead.id,
        kind: "CHECKOUT_CATALOGO",
        createdAt: { gte: new Date(Date.now() - 10 * 60 * 1000) },
      },
      orderBy: { createdAt: "desc" },
      select: { id: true },
    });

    const metadata = {
      sessionId: input.sessionId || null,
      phase,
      deliveryType: input.deliveryType || null,
      payment: input.payment || null,
      itemCount:
        latestCheckout?.itemCount ??
        cartSnapshot.reduce((total, item) => total + item.qty, 0),
      estimatedValue,
      cartSnapshot,
    };

    if (recentInteraction) {
      await prisma.crmInteraction.update({
        where: { id: recentInteraction.id },
        data: {
          body: copy.body,
          metadata,
        },
      });
    } else {
      await prisma.crmInteraction.create({
        data: {
          customerId: customer.id,
          leadId: lead.id,
          kind: "CHECKOUT_CATALOGO",
          channel: "CATALOGO",
          direction: "IN",
          body: copy.body,
          metadata,
        },
      });
    }

    return { customerId: customer.id, leadId: lead.id };
  } catch (error) {
    console.error("[checkout-recovery] Falha ao registrar oportunidade", error);
    return null;
  }
}

export async function markCheckoutOpportunityConverted(
  recovery: CheckoutRecoveryRef | null,
  orderNumber: number,
  total: number
) {
  if (!recovery) return;

  try {
    await prisma.crmLead.update({
      where: { id: recovery.leadId },
      data: {
        stage: "VENDIDO",
        estimatedValue: total,
        notes: `Pedido #${orderNumber} registrado pelo catálogo.`,
        closedAt: new Date(),
      },
    });

    await prisma.crmInteraction.create({
      data: {
        customerId: recovery.customerId,
        leadId: recovery.leadId,
        kind: "CHECKOUT_CONVERTIDO",
        channel: "CATALOGO",
        direction: "IN",
        body: `Pedido #${orderNumber} registrado com sucesso.`,
        metadata: { orderNumber, total },
      },
    });
  } catch (error) {
    console.error("[checkout-recovery] Falha ao concluir oportunidade", error);
  }
}
