"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-auth";
import { normalizeCrmPhone, normalizeCrmSource } from "@/lib/crm-order-sync";
import { crmLocalDateTimeToUtc } from "@/lib/crm-time";
import { logCrmInteraction, slugifyCrmTag } from "@/lib/crm-activity";

function cleanPhone(value: FormDataEntryValue | null) {
  return normalizeCrmPhone(String(value ?? ""));
}

function text(value: FormDataEntryValue | null) {
  const result = String(value ?? "").trim();
  return result || null;
}

async function assertEditor() {
  const { session, error } = await requireAdmin("EDITOR");
  if (error || !session) throw new Error(error || "Não autenticado.");
  return session;
}

function refreshCrm(customerId?: string) {
  revalidatePath("/admin/crm");
  revalidatePath("/admin/crm/central");
  revalidatePath("/admin/crm/funil");
  revalidatePath("/admin/crm/follow-ups");
  revalidatePath("/admin/crm/oportunidades");
  if (customerId) revalidatePath(`/admin/crm/cliente/${customerId}`);
}

export async function createLeadAction(formData: FormData) {
  const session = await assertEditor();

  const name = String(formData.get("name") ?? "").trim();
  const phone = cleanPhone(formData.get("phone"));
  const source = normalizeCrmSource(text(formData.get("source")), "outro");
  const productId = text(formData.get("productId"));
  const notes = text(formData.get("notes"));
  const campaign = text(formData.get("campaign"));
  const campaignContent = text(formData.get("campaignContent"));
  const campaignCode = text(formData.get("campaignCode"));
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
      SET "name" = ${name}, "source" = COALESCE("source", ${source}), "lastContactAt" = NOW(), "updatedAt" = NOW()
      WHERE "id" = ${customerId}
    `;
  }

  const leadId = `lead_${randomUUID()}`;
  await prisma.$executeRaw`
    INSERT INTO "CrmLead"
      ("id", "customerId", "stage", "productId", "estimatedValue", "source", "notes", "campaign", "campaignContent", "campaignCode", "lastContactAt", "createdAt", "updatedAt")
    VALUES
      (${leadId}, ${customerId}, 'NOVO'::"crm_lead_stage", ${productId}, ${estimatedValue}, ${source}, ${notes}, ${campaign}, ${campaignContent}, ${campaignCode}, NOW(), NOW(), NOW())
  `;

  await logCrmInteraction({
    customerId,
    leadId,
    productId,
    createdById: session.id,
    kind: "LEAD_CREATED",
    channel: source,
    body: notes || "Novo atendimento registrado.",
    metadata: { campaign, campaignContent, campaignCode },
  });

  refreshCrm(customerId);
  redirect(`/admin/crm/cliente/${encodeURIComponent(customerId)}`);
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
  const session = await assertEditor();
  const id = String(formData.get("id") ?? "");
  const stage = String(formData.get("stage") ?? "");
  const lostReason = text(formData.get("lostReason"));

  if (!id || !validStages.has(stage)) throw new Error("Etapa inválida.");
  if (stage === "PERDIDO" && !lostReason) throw new Error("Informe o motivo da perda.");

  const before = await prisma.crmLead.findUnique({ where: { id }, select: { customerId: true, stage: true, productId: true } });
  if (!before) throw new Error("Oportunidade não encontrada.");

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

  await logCrmInteraction({
    customerId: before.customerId,
    leadId: id,
    productId: before.productId,
    createdById: session.id,
    kind: "STAGE_CHANGED",
    body: `${before.stage} → ${stage}${lostReason ? ` · ${lostReason}` : ""}`,
  });

  refreshCrm(before.customerId);
}

export async function updateLeadDetailsAction(formData: FormData) {
  const session = await assertEditor();
  const id = String(formData.get("id") ?? "").trim();
  if (!id) throw new Error("Oportunidade inválida.");

  const source = normalizeCrmSource(text(formData.get("source")), "outro");
  const productId = text(formData.get("productId"));
  const campaign = text(formData.get("campaign"));
  const campaignContent = text(formData.get("campaignContent"));
  const campaignCode = text(formData.get("campaignCode"));
  const notes = text(formData.get("notes"));
  const estimatedRaw = String(formData.get("estimatedValue") ?? "").replace(",", ".").trim();
  const estimatedValue = estimatedRaw ? Number(estimatedRaw) : null;
  if (estimatedValue !== null && (!Number.isFinite(estimatedValue) || estimatedValue < 0)) throw new Error("Valor estimado inválido.");

  if (productId) {
    const product = await prisma.product.findFirst({ where: { id: productId, active: true }, select: { id: true } });
    if (!product) throw new Error("Produto inválido ou inativo.");
  }

  const lead = await prisma.crmLead.findUnique({ where: { id }, select: { customerId: true } });
  if (!lead) throw new Error("Oportunidade não encontrada.");

  await prisma.$executeRaw`
    UPDATE "CrmLead"
    SET "productId" = ${productId}, "estimatedValue" = ${estimatedValue}, "source" = ${source},
        "campaign" = ${campaign}, "campaignContent" = ${campaignContent}, "campaignCode" = ${campaignCode},
        "notes" = ${notes}, "lastContactAt" = NOW(), "updatedAt" = NOW()
    WHERE "id" = ${id}
  `;

  await logCrmInteraction({
    customerId: lead.customerId,
    leadId: id,
    productId,
    createdById: session.id,
    kind: "LEAD_UPDATED",
    channel: source,
    body: "Dados comerciais da oportunidade atualizados.",
    metadata: { campaign, campaignContent, campaignCode },
  });

  refreshCrm(lead.customerId);
}

export async function createFollowUpAction(formData: FormData) {
  const session = await assertEditor();
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
      createdById: session.id,
    },
  });

  await logCrmInteraction({
    customerId,
    leadId,
    createdById: session.id,
    kind: "FOLLOW_UP_CREATED",
    body: `${reason} · ${dueAt.toISOString()}`,
  });

  refreshCrm(customerId);
}

export async function completeFollowUpAction(formData: FormData) {
  const session = await assertEditor();
  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("Follow-up inválido.");

  const followUp = await prisma.crmFollowUp.findUnique({ where: { id }, select: { customerId: true, leadId: true, reason: true } });
  if (!followUp) throw new Error("Follow-up não encontrado.");

  await prisma.$executeRaw`
    UPDATE "CrmFollowUp"
    SET "status" = 'CONCLUIDO'::"crm_follow_up_status", "completedAt" = NOW(), "updatedAt" = NOW()
    WHERE "id" = ${id}
  `;

  await logCrmInteraction({
    customerId: followUp.customerId,
    leadId: followUp.leadId,
    createdById: session.id,
    kind: "FOLLOW_UP_COMPLETED",
    body: followUp.reason,
  });

  refreshCrm(followUp.customerId);
}

export async function addCustomerNoteAction(formData: FormData) {
  const session = await assertEditor();
  const customerId = String(formData.get("customerId") ?? "").trim();
  const leadId = text(formData.get("leadId"));
  const body = String(formData.get("body") ?? "").trim();
  if (!customerId || !body) throw new Error("Cliente e anotação são obrigatórios.");

  const customer = await prisma.customer.findUnique({ where: { id: customerId }, select: { id: true } });
  if (!customer) throw new Error("Cliente não encontrado.");

  await logCrmInteraction({ customerId, leadId, createdById: session.id, kind: "NOTE", body });
  await prisma.customer.update({ where: { id: customerId }, data: { lastContactAt: new Date() } });
  refreshCrm(customerId);
}

export async function createCrmTagAction(formData: FormData) {
  await assertEditor();
  const name = String(formData.get("name") ?? "").trim();
  const color = text(formData.get("color")) || "pink";
  const slug = slugifyCrmTag(name);
  if (!name || !slug) throw new Error("Nome da etiqueta é obrigatório.");

  await prisma.$executeRaw`
    INSERT INTO "CrmTag" ("id", "name", "slug", "color", "active", "createdAt", "updatedAt")
    VALUES (${`tag_${randomUUID()}`}, ${name.slice(0, 80)}, ${slug}, ${color}, TRUE, NOW(), NOW())
    ON CONFLICT ("slug") DO UPDATE SET "name" = EXCLUDED."name", "color" = EXCLUDED."color", "active" = TRUE, "updatedAt" = NOW()
  `;
  revalidatePath("/admin/crm/etiquetas");
}

export async function addCustomerTagAction(formData: FormData) {
  const session = await assertEditor();
  const customerId = String(formData.get("customerId") ?? "").trim();
  const tagId = String(formData.get("tagId") ?? "").trim();
  if (!customerId || !tagId) throw new Error("Cliente e etiqueta são obrigatórios.");

  const rows = await prisma.$queryRaw<Array<{ name: string }>>`
    SELECT "name" FROM "CrmTag" WHERE "id" = ${tagId} AND "active" = TRUE LIMIT 1
  `;
  if (!rows[0]) throw new Error("Etiqueta não encontrada.");

  await prisma.$executeRaw`
    INSERT INTO "CustomerTag" ("customerId", "tagId", "createdAt") VALUES (${customerId}, ${tagId}, NOW())
    ON CONFLICT ("customerId", "tagId") DO NOTHING
  `;
  await logCrmInteraction({ customerId, createdById: session.id, kind: "TAG_ADDED", body: rows[0].name });
  refreshCrm(customerId);
}

export async function removeCustomerTagAction(formData: FormData) {
  const session = await assertEditor();
  const customerId = String(formData.get("customerId") ?? "").trim();
  const tagId = String(formData.get("tagId") ?? "").trim();
  if (!customerId || !tagId) throw new Error("Cliente e etiqueta são obrigatórios.");

  const rows = await prisma.$queryRaw<Array<{ name: string }>>`
    SELECT "name" FROM "CrmTag" WHERE "id" = ${tagId} LIMIT 1
  `;
  await prisma.$executeRaw`DELETE FROM "CustomerTag" WHERE "customerId" = ${customerId} AND "tagId" = ${tagId}`;
  await logCrmInteraction({ customerId, createdById: session.id, kind: "TAG_REMOVED", body: rows[0]?.name || "Etiqueta removida" });
  refreshCrm(customerId);
}
