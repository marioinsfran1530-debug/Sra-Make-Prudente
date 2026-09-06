"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-auth";
import { normalizeCrmPhone, normalizeCrmSource } from "@/lib/crm-order-sync";
import { crmLocalDateTimeToUtc } from "@/lib/crm-time";

function cleanPhone(value: FormDataEntryValue | null) {
  return normalizeCrmPhone(String(value ?? ""));
}

function text(value: FormDataEntryValue | null) {
  const result = String(value ?? "").trim();
  return result || null;
}

async function assertEditor() {
  const { error } = await requireAdmin("EDITOR");
  if (error) throw new Error(error);
}

export async function createLeadAction(formData: FormData) {
  await assertEditor();

  const name = String(formData.get("name") ?? "").trim();
  const phone = cleanPhone(formData.get("phone"));
  const source = normalizeCrmSource(text(formData.get("source")), "outro");
  const productId = text(formData.get("productId"));
  const notes = text(formData.get("notes"));
  const estimatedRaw = String(formData.get("estimatedValue") ?? "").replace(",", ".").trim();
  const estimatedValue = estimatedRaw ? Number(estimatedRaw) : null;

  if (!name || phone.length < 10) throw new Error("Nome e WhatsApp válido são obrigatórios.");
  if (estimatedValue !== null && (!Number.isFinite(estimatedValue) || estimatedValue < 0)) throw new Error("Valor estimado inválido.");

  if (productId) {
    const product = await prisma.product.findFirst({ where: { id: productId, active: true }, select: { id: true } });
    if (!product) throw new Error("Produto de interesse inválido ou inativo.");
  }

  const existing = await prisma.$queryRaw<Array<{ id: string }>>`
    SELECT "id" FROM "Customer" WHERE "phone" = ${phone} LIMIT 1
  `;

  let customerId = existing[0]?.id;
  if (!customerId) {
    customerId = `cust_${randomUUID()}`;
    await prisma.$executeRaw`
      INSERT INTO "Customer" ("id", "name", "phone", "source", "lastContactAt", "createdAt", "updatedAt")
      VALUES (${customerId}, ${name}, ${phone}, ${source}, NOW(), NOW(), NOW())
    `;
  } else {
    await prisma.$executeRaw`
      UPDATE "Customer"
      SET "name" = ${name}, "source" = COALESCE(${source}, "source"), "lastContactAt" = NOW(), "updatedAt" = NOW()
      WHERE "id" = ${customerId}
    `;
  }

  const leadId = `lead_${randomUUID()}`;
  await prisma.$executeRaw`
    INSERT INTO "CrmLead" ("id", "customerId", "stage", "productId", "estimatedValue", "source", "notes", "lastContactAt", "createdAt", "updatedAt")
    VALUES (${leadId}, ${customerId}, 'NOVO'::"crm_lead_stage", ${productId}, ${estimatedValue}, ${source}, ${notes}, NOW(), NOW(), NOW())
  `;

  revalidatePath("/admin/crm");
  revalidatePath("/admin/crm/funil");
  redirect("/admin/crm/funil");
}

const validStages = new Set([
  "NOVO",
  "ATENDIMENTO",
  "PRODUTO_INDICADO",
  "AGUARDANDO_PAGAMENTO",
  "VENDIDO",
  "PERDIDO",
  "POS_VENDA",
  "RECOMPRA",
]);

export async function moveLeadAction(formData: FormData) {
  await assertEditor();
  const id = String(formData.get("id") ?? "");
  const stage = String(formData.get("stage") ?? "");
  const lostReason = text(formData.get("lostReason"));

  if (!id || !validStages.has(stage)) throw new Error("Etapa inválida.");
  if (stage === "PERDIDO" && !lostReason) throw new Error("Informe o motivo da perda.");

  const closed = stage === "VENDIDO" || stage === "PERDIDO";
  await prisma.$executeRawUnsafe(
    `UPDATE "CrmLead"
     SET "stage" = $1::"crm_lead_stage",
         "closedAt" = CASE WHEN $2 THEN NOW() ELSE NULL END,
         "lostReason" = CASE WHEN $1 = 'PERDIDO' THEN $3 ELSE NULL END,
         "updatedAt" = NOW()
     WHERE "id" = $4`,
    stage,
    closed,
    lostReason,
    id,
  );

  revalidatePath("/admin/crm");
  revalidatePath("/admin/crm/funil");
  revalidatePath("/admin/crm/oportunidades");
}

export async function createFollowUpAction(formData: FormData) {
  await assertEditor();
  const customerId = String(formData.get("customerId") ?? "").trim();
  const leadId = text(formData.get("leadId"));
  const reason = String(formData.get("reason") ?? "").trim();
  const dueAtRaw = String(formData.get("dueAt") ?? "").trim();

  if (!customerId || !reason || !dueAtRaw) throw new Error("Cliente, motivo e data são obrigatórios.");
  const dueAt = crmLocalDateTimeToUtc(dueAtRaw);
  if (!dueAt) throw new Error("Data inválida.");

  const customer = await prisma.customer.findUnique({ where: { id: customerId }, select: { id: true } });
  if (!customer) throw new Error("Cliente não encontrado.");

  if (leadId) {
    const lead = await prisma.crmLead.findFirst({
      where: { id: leadId, customerId, stage: { notIn: ["VENDIDO", "PERDIDO"] } },
      select: { id: true },
    });
    if (!lead) throw new Error("A oportunidade selecionada não pertence a esta cliente ou já foi encerrada.");
  }

  await prisma.crmFollowUp.create({
    data: {
      id: `fu_${randomUUID()}`,
      customerId,
      leadId,
      dueAt,
      reason,
      status: "PENDENTE",
    },
  });

  revalidatePath("/admin/crm");
  revalidatePath("/admin/crm/follow-ups");
  revalidatePath("/admin/crm/oportunidades");
}

export async function completeFollowUpAction(formData: FormData) {
  await assertEditor();
  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("Follow-up inválido.");

  await prisma.$executeRaw`
    UPDATE "CrmFollowUp"
    SET "status" = 'CONCLUIDO'::"crm_follow_up_status", "completedAt" = NOW(), "updatedAt" = NOW()
    WHERE "id" = ${id}
  `;

  revalidatePath("/admin/crm");
  revalidatePath("/admin/crm/follow-ups");
  revalidatePath("/admin/crm/oportunidades");
}
