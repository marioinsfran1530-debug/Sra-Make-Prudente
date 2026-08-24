import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  hasEnoughStock,
  orderItemRequiresVariant,
  orderLineKey,
  resolveOrderUnitPrice,
} from "@/lib/order-validation";
import {
  buildOrderRequestKey,
  normalizeBrazilPhone,
  sameOrderItems,
} from "@/lib/order-request-safety";

type CartItemInput = {
  productId: string;
  variantId: string | null;
  qty: number;
};

type OrderBody = {
  items: CartItemInput[];
  customerName: string;
  customerPhone: string;
  deliveryType: "RETIRADA" | "ENTREGA";
  address?: string;
  payment: "PIX" | "DINHEIRO" | "CARTAO" | "CONFIRMAR_WHATSAPP";
  notes?: string;
  origin?: string;
  referrer?: string;
  landingPage?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmContent?: string;
  sessionId?: string;
};

const ALLOWED_PAYMENTS = new Set([
  "PIX",
  "DINHEIRO",
  "CARTAO",
  "CONFIRMAR_WHATSAPP",
]);

const MAX_ITEMS = 50;
const MAX_QTY_PER_ITEM = 99;
const DUPLICATE_WINDOW_MS = 45_000;

function text(value: unknown, maxLength: number) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

export async function POST(request: NextRequest) {
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > 64 * 1024) {
    return NextResponse.json({ error: "Pedido muito grande." }, { status: 413 });
  }

  let body: OrderBody;
  try {
    body = (await request.json()) as OrderBody;
  } catch {
    return NextResponse.json({ error: "Dados do pedido inválidos." }, { status: 400 });
  }

  if (!Array.isArray(body.items) || body.items.length === 0) {
    return NextResponse.json({ error: "Carrinho vazio." }, { status: 400 });
  }
  if (body.items.length > MAX_ITEMS) {
    return NextResponse.json({ error: "Quantidade de itens acima do permitido." }, { status: 400 });
  }

  const customerName = text(body.customerName, 120);
  const customerPhone = normalizeBrazilPhone(text(body.customerPhone, 30));
  const address = text(body.address, 250);
  const notes = text(body.notes, 500);
  const sessionId = text(body.sessionId, 200);

  if (!customerName || !customerPhone) {
    return NextResponse.json(
      { error: "Informe um nome e um WhatsApp válido com DDD." },
      { status: 400 }
    );
  }
  if (body.deliveryType !== "RETIRADA" && body.deliveryType !== "ENTREGA") {
    return NextResponse.json({ error: "Forma de recebimento inválida." }, { status: 400 });
  }
  if (body.deliveryType === "ENTREGA" && !address) {
    return NextResponse.json({ error: "Endereço é obrigatório para entrega." }, { status: 400 });
  }
  if (!ALLOWED_PAYMENTS.has(body.payment)) {
    return NextResponse.json({ error: "Forma de pagamento inválida." }, { status: 400 });
  }

  const orderItems: {
    productId: string;
    variantId: string | null;
    name: string;
    brand: string;
    sku: string | null;
    variantName: string | null;
    qty: number;
    unitPrice: number;
    subtotal: number;
  }[] = [];

  const requestedByLine = new Map<string, number>();

  for (const item of body.items) {
    const productId = text(item?.productId, 100);
    const variantId = item?.variantId ? text(item.variantId, 100) : null;
    const rawQty = Number(item?.qty);

    if (!productId || !Number.isFinite(rawQty)) {
      return NextResponse.json({ error: "Item do pedido inválido." }, { status: 400 });
    }

    const qty = Math.floor(rawQty);
    if (qty < 1 || qty > MAX_QTY_PER_ITEM) {
      return NextResponse.json({ error: "Quantidade de produto inválida." }, { status: 400 });
    }

    const product = await prisma.product.findFirst({
      where: { id: productId, active: true },
      include: { variants: true },
    });

    if (!product) {
      return NextResponse.json(
        { error: "Produto não encontrado ou indisponível." },
        { status: 400 }
      );
    }

    const activeVariants = product.variants.filter((variant) => variant.active);

    if (orderItemRequiresVariant(activeVariants.length, variantId)) {
      return NextResponse.json(
        { error: `Escolha uma opção para ${product.name}.` },
        { status: 400 }
      );
    }

    let variantName: string | null = null;
    let availableStock = product.stockQty;
    let variantPrice: number | null = null;
    let variantPromoPrice: number | null = null;

    if (variantId) {
      const variant = activeVariants.find((candidate) => candidate.id === variantId);
      if (!variant) {
        return NextResponse.json(
          { error: `Opção indisponível para ${product.name}.` },
          { status: 400 }
        );
      }

      variantName = variant.name;
      availableStock = variant.stockQty;
      variantPrice = variant.price === null ? null : Number(variant.price);
      variantPromoPrice =
        variant.promoPrice === null ? null : Number(variant.promoPrice);
    }

    const lineKey = orderLineKey(product.id, variantId);
    const requestedQty = (requestedByLine.get(lineKey) ?? 0) + qty;

    if (!hasEnoughStock(availableStock, requestedQty)) {
      return NextResponse.json(
        {
          error: `Quantidade indisponível para ${product.name}${
            variantName ? ` (${variantName})` : ""
          }. Disponível: ${availableStock}.`,
        },
        { status: 409 }
      );
    }

    requestedByLine.set(lineKey, requestedQty);

    const unitPrice = resolveOrderUnitPrice({
      productPrice: Number(product.price),
      productPromoPrice:
        product.promoPrice === null ? null : Number(product.promoPrice),
      variantPrice,
      variantPromoPrice,
    });

    if (!Number.isFinite(unitPrice) || unitPrice < 0) {
      return NextResponse.json(
        { error: `Preço inválido para ${product.name}.` },
        { status: 409 }
      );
    }

    orderItems.push({
      productId: product.id,
      variantId,
      name: product.name,
      brand: product.brand,
      sku: product.sku,
      variantName,
      qty,
      unitPrice,
      subtotal: unitPrice * qty,
    });
  }

  const subtotal = orderItems.reduce((sum, item) => sum + item.subtotal, 0);
  const deliveryFee = 0;
  const total = subtotal + deliveryFee;
  const normalizedAddress = body.deliveryType === "ENTREGA" ? address : "";

  const requestKey = buildOrderRequestKey({
    customerPhone,
    sessionId,
    deliveryType: body.deliveryType,
    payment: body.payment,
    address: normalizedAddress,
    items: orderItems.map((item) => ({
      productId: item.productId,
      variantId: item.variantId,
      qty: item.qty,
    })),
  });

  const result = await prisma.$transaction(async (tx) => {
    // Serializa somente pedidos com a mesma assinatura. Assim, dois envios
    // simultâneos do mesmo checkout não conseguem criar duas vendas antes da
    // verificação de duplicidade terminar. A subconsulta impede que o Prisma
    // tente desserializar o retorno `void` de pg_advisory_xact_lock().
    await tx.$queryRaw<Array<{ locked: number }>>`
      SELECT 1::int AS locked
      FROM (
        SELECT pg_advisory_xact_lock(hashtext(${requestKey}))
      ) AS advisory_lock
    `;

    const recentOrders = await tx.order.findMany({
      where: {
        customerPhone,
        status: "NOVO",
        deliveryType: body.deliveryType,
        payment: body.payment,
        createdAt: { gte: new Date(Date.now() - DUPLICATE_WINDOW_MS) },
        ...(sessionId ? { sessionId } : {}),
      },
      include: { items: true },
      orderBy: { createdAt: "desc" },
      take: 3,
    });

    const duplicateOrder = recentOrders.find((candidate) => {
      if ((candidate.address ?? "") !== normalizedAddress) {
        return false;
      }

      return sameOrderItems(
        candidate.items.map((item) => ({
          productId: item.productId,
          variantId: item.variantId,
          qty: item.qty,
        })),
        orderItems.map((item) => ({
          productId: item.productId,
          variantId: item.variantId,
          qty: item.qty,
        }))
      );
    });

    if (duplicateOrder) {
      return {
        duplicate: true as const,
        orderNumber: duplicateOrder.number,
        subtotal: Number(duplicateOrder.subtotal),
        deliveryFee: Number(duplicateOrder.deliveryFee),
        total: Number(duplicateOrder.total),
        items: duplicateOrder.items.map((item) => ({
          name: item.name,
          variantName: item.variantName,
          qty: item.qty,
          subtotal: Number(item.subtotal),
        })),
      };
    }

    const order = await tx.order.create({
      data: {
        customerName,
        customerPhone,
        subtotal,
        deliveryFee,
        total,
        deliveryType: body.deliveryType,
        address: normalizedAddress || null,
        payment: body.payment,
        notes: notes || null,
        origin: text(body.origin, 500) || null,
        referrer: text(body.referrer, 1000) || null,
        landingPage: text(body.landingPage, 1000) || null,
        utmSource: text(body.utmSource, 200) || null,
        utmMedium: text(body.utmMedium, 200) || null,
        utmCampaign: text(body.utmCampaign, 200) || null,
        utmContent: text(body.utmContent, 200) || null,
        sessionId: sessionId || null,
        status: "NOVO",
        items: {
          create: orderItems,
        },
      },
    });

    return {
      duplicate: false as const,
      orderNumber: order.number,
      subtotal,
      deliveryFee,
      total,
      items: orderItems.map((item) => ({
        name: item.name,
        variantName: item.variantName,
        qty: item.qty,
        subtotal: item.subtotal,
      })),
    };
  });

  if (sessionId) {
    await prisma.pushSubscription.updateMany({
      where: {
        sessionId,
        active: true,
      },
      data: {
        phone: customerPhone,
        lastSeenAt: new Date(),
      },
    });
  }

  return NextResponse.json(result);
}
