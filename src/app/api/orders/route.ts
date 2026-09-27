import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

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

const PAYMENT_METHODS = new Set([
  "PIX",
  "DINHEIRO",
  "CARTAO",
  "CONFIRMAR_WHATSAPP",
]);

const DELIVERY_TYPES = new Set(["RETIRADA", "ENTREGA"]);

function clean(value: unknown, maxLength = 500): string | undefined {
  if (typeof value !== "string") return undefined;
  const result = value.trim();
  return result ? result.slice(0, maxLength) : undefined;
}

function normalizePhone(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const digits = value.replace(/\D/g, "");
  return digits.length >= 10 && digits.length <= 11 ? digits : null;
}

export async function POST(request: NextRequest) {
  let body: OrderBody;

  try {
    body = (await request.json()) as OrderBody;
  } catch {
    return NextResponse.json({ error: "Dados do pedido inválidos." }, { status: 400 });
  }

  if (!Array.isArray(body.items) || body.items.length === 0) {
    return NextResponse.json({ error: "Carrinho vazio." }, { status: 400 });
  }

  if (body.items.length > 50) {
    return NextResponse.json({ error: "Quantidade de itens inválida." }, { status: 400 });
  }

  const customerName = clean(body.customerName, 120);
  const customerPhone = normalizePhone(body.customerPhone);
  const deliveryType = body.deliveryType;
  const payment = body.payment;

  if (!customerName || !customerPhone) {
    return NextResponse.json(
      { error: "Informe seu nome e um WhatsApp válido." },
      { status: 400 }
    );
  }

  if (!DELIVERY_TYPES.has(deliveryType)) {
    return NextResponse.json({ error: "Forma de recebimento inválida." }, { status: 400 });
  }

  if (!PAYMENT_METHODS.has(payment)) {
    return NextResponse.json({ error: "Forma de pagamento inválida." }, { status: 400 });
  }

  const address = deliveryType === "ENTREGA" ? clean(body.address, 300) : undefined;
  if (deliveryType === "ENTREGA" && !address) {
    return NextResponse.json(
      { error: "Informe o endereço para a entrega." },
      { status: 400 }
    );
  }

  const sessionId = clean(body.sessionId, 100);
  const notes = clean(body.notes, 500);

  // O navegador envia apenas IDs e quantidades. Preço, nome, estoque e
  // disponibilidade são sempre conferidos no servidor.
  const normalizedItems = new Map<string, CartItemInput>();

  for (const item of body.items) {
    if (
      typeof item?.productId !== "string" ||
      !item.productId ||
      (item.variantId !== null && typeof item.variantId !== "string")
    ) {
      return NextResponse.json({ error: "Item do carrinho inválido." }, { status: 400 });
    }

    if (!Number.isInteger(item.qty) || item.qty < 1 || item.qty > 99) {
      return NextResponse.json(
        { error: "A quantidade de um dos produtos é inválida." },
        { status: 400 }
      );
    }

    const key = item.variantId
      ? `${item.productId}::${item.variantId}`
      : item.productId;

    const previous = normalizedItems.get(key);
    const qty = (previous?.qty ?? 0) + item.qty;

    if (qty > 99) {
      return NextResponse.json(
        { error: "A quantidade solicitada de um produto é muito alta." },
        { status: 400 }
      );
    }

    normalizedItems.set(key, {
      productId: item.productId,
      variantId: item.variantId ?? null,
      qty,
    });
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

  for (const item of normalizedItems.values()) {
    const product = await prisma.product.findFirst({
      where: { id: item.productId, active: true },
      include: { variants: true },
    });

    if (!product) {
      return NextResponse.json(
        { error: "Um dos produtos do carrinho não está mais disponível." },
        { status: 400 }
      );
    }

    let unitPrice = product.promoPrice ? Number(product.promoPrice) : Number(product.price);
    let availableStock = product.stockQty;
    let variantName: string | null = null;

    if (item.variantId) {
      const variant = product.variants.find(
        (v) => v.id === item.variantId && v.active
      );

      if (!variant) {
        return NextResponse.json(
          { error: `A opção selecionada de ${product.name} não está mais disponível.` },
          { status: 400 }
        );
      }

      variantName = variant.name;
      availableStock = variant.stockQty;

      if (variant.price) {
        unitPrice = variant.promoPrice
          ? Number(variant.promoPrice)
          : Number(variant.price);
      }
    }

    if (availableStock < item.qty) {
      return NextResponse.json(
        {
          error: `Estoque insuficiente para ${product.name}${variantName ? ` (${variantName})` : ""}. Disponível: ${availableStock}.`,
        },
        { status: 409 }
      );
    }

    orderItems.push({
      productId: product.id,
      variantId: item.variantId,
      name: product.name,
      brand: product.brand,
      sku: product.sku,
      variantName,
      qty: item.qty,
      unitPrice,
      subtotal: unitPrice * item.qty,
    });
  }

  const subtotal = orderItems.reduce((sum, item) => sum + item.subtotal, 0);
  const deliveryFee = 0;
  const total = subtotal + deliveryFee;

  const order = await prisma.order.create({
    data: {
      customerName,
      customerPhone,
      subtotal,
      deliveryFee,
      total,
      deliveryType,
      address: address ?? null,
      payment,
      notes: notes ?? null,
      origin: clean(body.origin, 100) ?? null,
      referrer: clean(body.referrer, 500) ?? null,
      landingPage: clean(body.landingPage, 500) ?? null,
      utmSource: clean(body.utmSource, 100) ?? null,
      utmMedium: clean(body.utmMedium, 100) ?? null,
      utmCampaign: clean(body.utmCampaign, 150) ?? null,
      utmContent: clean(body.utmContent, 150) ?? null,
      sessionId: sessionId ?? null,
      status: "NOVO",
      items: {
        create: orderItems,
      },
    },
  });

  return NextResponse.json({
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
  });
}
