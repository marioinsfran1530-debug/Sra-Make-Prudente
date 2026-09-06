"use server";

import { randomUUID } from "crypto";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-auth";
import { whatsappUrl } from "@/lib/crm";
import { normalizeCrmPhone, normalizeCrmSource } from "@/lib/crm-order-sync";
import { crmDateAtHourInDays } from "@/lib/crm-time";

function cleanPhone(value: FormDataEntryValue | null) {
  return normalizeCrmPhone(String(value ?? ""));
}

function text(value: FormDataEntryValue | null) {
  const result = String(value ?? "").trim();
  return result || null;
}

export async function sendProductWhatsAppAction(formData: FormData) {
  const { error } = await requireAdmin("EDITOR");
  if (error) throw new Error(error);

  const selectedCustomerId = text(formData.get("customerId"));
  const productId = String(formData.get("productId") ?? "").trim();
  const source = normalizeCrmSource(text(formData.get("source")), "whatsapp");
  const notes = text(formData.get("notes"));
  const followUpDays = Math.max(0, Math.min(30, Number(formData.get("followUpDays") ?? 1) || 0));

  if (!productId) throw new Error("Selecione um produto.");

  const product = await prisma.product.findFirst({
    where: { id: productId, active: true },
    select: { id: true, name: true, price: true, promoPrice: true, stockQty: true },
  });
  if (!product) throw new Error("Produto não encontrado ou inativo.");

  let customer = selectedCustomerId
    ? await prisma.customer.findUnique({ where: { id: selectedCustomerId } })
    : null;

  if (!customer) {
    const name = String(formData.get("name") ?? "").trim();
    const phone = cleanPhone(formData.get("phone"));
    if (!name || phone.length < 10) throw new Error("Selecione uma cliente ou informe nome e WhatsApp válidos.");

    customer = await prisma.customer.upsert({
      where: { phone },
      create: { name, phone, source, lastContactAt: new Date() },
      update: { name, source, lastContactAt: new Date() },
    });
  } else {
    await prisma.customer.update({
      where: { id: customer.id },
      data: { lastContactAt: new Date(), source: customer.source || source },
    });
  }

  const activeStages = ["NOVO", "ATENDIMENTO", "PRODUTO_INDICADO", "AGUARDANDO_PAGAMENTO", "RECOMPRA"] as const;
  const existingLead = await prisma.crmLead.findFirst({
    where: {
      customerId: customer.id,
      stage: { in: [...activeStages] },
      OR: [{ productId: product.id }, { productId: null }],
    },
    orderBy: { updatedAt: "desc" },
  });

  const effectivePrice = product.promoPrice ?? product.price;
  const lead = existingLead
    ? await prisma.crmLead.update({
        where: { id: existingLead.id },
        data: {
          stage: "PRODUTO_INDICADO",
          productId: product.id,
          estimatedValue: effectivePrice,
          source: existingLead.source || source,
          notes: notes || existingLead.notes,
          lastContactAt: new Date(),
          closedAt: null,
          lostReason: null,
        },
      })
    : await prisma.crmLead.create({
        data: {
          id: `lead_${randomUUID()}`,
          customerId: customer.id,
          stage: "PRODUTO_INDICADO",
          productId: product.id,
          estimatedValue: effectivePrice,
          source,
          notes,
          lastContactAt: new Date(),
        },
      });

  if (followUpDays > 0) {
    const dueAt = crmDateAtHourInDays(followUpDays, 10);
    const existingFollowUp = await prisma.crmFollowUp.findFirst({
      where: { customerId: customer.id, leadId: lead.id, status: "PENDENTE" },
      orderBy: { dueAt: "asc" },
    });
    if (!existingFollowUp) {
      await prisma.crmFollowUp.create({
        data: {
          id: `fu_${randomUUID()}`,
          customerId: customer.id,
          leadId: lead.id,
          dueAt,
          reason: `Retornar sobre ${product.name}`,
        },
      });
    }
  }

  const firstName = customer.name.split(" ")[0];
  const price = Number(effectivePrice).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  const productLink = `https://www.sramakeprudente.com.br/produto/${product.id}`;
  const stockNote = product.stockQty > 0 ? "Temos disponível no momento." : "Posso confirmar a disponibilidade para você.";
  const message = `Olá, ${firstName}! Aqui é da Sra Make Prudente. Separei este produto para você:\n\n*${product.name}*\n${price}\n${stockNote}\n\nVeja os detalhes: ${productLink}\n\nSe quiser, te ajudo a finalizar por aqui.`;

  redirect(whatsappUrl(customer.phone, message));
}
