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

export async function POST(request: NextRequest) {
  const body = (await request.json()) as OrderBody;

  if (!body.items || body.items.length === 0) {
    return NextResponse.json({ error: "Carrinho vazio." }, { status: 400 });
  }
  if (!body.customerName?.trim() || !body.customerPhone?.trim()) {
    return NextResponse.json({ error: "Nome e WhatsApp são obrigatórios." }, { status: 400 });
  }
  if (body.deliveryType === "ENTREGA" && !body.address?.trim()) {
    return NextResponse.json({ error: "Endereço é obrigatório para entrega." }, { status: 400 });
  }

  // Regra do plano (seção 7/22): NUNCA confiar em preço/nome vindos do
  // navegador. Buscar cada produto/variante no banco e recalcular tudo.
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

  for (const item of body.items) {
    const product = await prisma.product.findFirst({
      where: { id: item.productId, active: true },
      include: { variants: true },
    });

    if (!product) {
      return NextResponse.json(
        { error: `Produto não encontrado ou indisponível (${item.productId}).` },
        { status: 400 }
      );
    }

    let unitPrice = product.promoPrice ? Number(product.promoPrice) : Number(product.price);
    let variantName: string | null = null;

    if (item.variantId) {
      const variant = product.variants.find((v) => v.id === item.variantId && v.active);
      if (!variant) {
        return NextResponse.json(
          { error: `Variante não encontrada ou indisponível para ${product.name}.` },
          { status: 400 }
        );
      }
      variantName = variant.name;
      if (variant.price) {
        unitPrice = variant.promoPrice ? Number(variant.promoPrice) : Number(variant.price);
      }
    }

    const qty = Math.max(1, Math.floor(item.qty));
    orderItems.push({
      productId: product.id,
      variantId: item.variantId,
      name: product.name,
      brand: product.brand,
      sku: product.sku,
      variantName,
      qty,
      unitPrice,
      subtotal: unitPrice * qty,
    });
  }

  const subtotal = orderItems.reduce((sum, i) => sum + i.subtotal, 0);
  const deliveryFee = 0; // v1: sem taxa de entrega, campo já preparado (plano seção 6)
  const total = subtotal + deliveryFee;

  const order = await prisma.order.create({
    data: {
      customerName: body.customerName.trim(),
      customerPhone: body.customerPhone.trim(),
      subtotal,
      deliveryFee,
      total,
      deliveryType: body.deliveryType,
      address: body.deliveryType === "ENTREGA" ? body.address?.trim() : null,
      payment: body.payment,
      notes: body.notes?.trim() || null,
      origin: body.origin,
      referrer: body.referrer,
      landingPage: body.landingPage,
      utmSource: body.utmSource,
      utmMedium: body.utmMedium,
      utmCampaign: body.utmCampaign,
      utmContent: body.utmContent,
      sessionId: body.sessionId,
      status: "NOVO",
      items: {
        create: orderItems,
      },
    },
  });

  // Não desconta estoque aqui — só na confirmação pelo admin (Fase 6, transacional).

  return NextResponse.json({
    orderNumber: order.number,
    subtotal,
    deliveryFee,
    total,
    items: orderItems.map((i) => ({
      name: i.name,
      variantName: i.variantName,
      qty: i.qty,
      subtotal: i.subtotal,
    })),
  });
}
