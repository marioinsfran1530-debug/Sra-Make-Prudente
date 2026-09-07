CREATE TABLE IF NOT EXISTS "CrmTag" (
  "id" TEXT PRIMARY KEY,
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL UNIQUE,
  "color" TEXT,
  "active" BOOLEAN NOT NULL DEFAULT TRUE,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "CustomerTag" (
  "customerId" TEXT NOT NULL REFERENCES "Customer"("id") ON DELETE CASCADE,
  "tagId" TEXT NOT NULL REFERENCES "CrmTag"("id") ON DELETE CASCADE,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY ("customerId", "tagId")
);
CREATE INDEX IF NOT EXISTS "CustomerTag_tagId_idx" ON "CustomerTag"("tagId");

CREATE TABLE IF NOT EXISTS "CrmInteraction" (
  "id" TEXT PRIMARY KEY,
  "customerId" TEXT NOT NULL REFERENCES "Customer"("id") ON DELETE CASCADE,
  "leadId" TEXT REFERENCES "CrmLead"("id") ON DELETE SET NULL,
  "productId" TEXT REFERENCES "Product"("id") ON DELETE SET NULL,
  "orderId" TEXT REFERENCES "Order"("id") ON DELETE SET NULL,
  "createdById" TEXT REFERENCES "AdminProfile"("id") ON DELETE SET NULL,
  "kind" TEXT NOT NULL,
  "channel" TEXT,
  "direction" TEXT,
  "body" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS "CrmInteraction_customerId_createdAt_idx" ON "CrmInteraction"("customerId", "createdAt");
CREATE INDEX IF NOT EXISTS "CrmInteraction_leadId_createdAt_idx" ON "CrmInteraction"("leadId", "createdAt");
CREATE INDEX IF NOT EXISTS "CrmInteraction_kind_createdAt_idx" ON "CrmInteraction"("kind", "createdAt");

ALTER TABLE "CrmLead" ADD COLUMN IF NOT EXISTS "campaign" TEXT;
ALTER TABLE "CrmLead" ADD COLUMN IF NOT EXISTS "campaignContent" TEXT;
ALTER TABLE "CrmLead" ADD COLUMN IF NOT EXISTS "campaignCode" TEXT;
CREATE INDEX IF NOT EXISTS "CrmLead_campaign_idx" ON "CrmLead"("campaign");
CREATE INDEX IF NOT EXISTS "CrmLead_campaignCode_idx" ON "CrmLead"("campaignCode");

ALTER TABLE "CrmTag" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CustomerTag" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CrmInteraction" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "CrmTag", "CustomerTag", "CrmInteraction" FROM anon, authenticated;

INSERT INTO "CrmTag" ("id", "name", "slug", "color") VALUES
  ('tag_novo_cliente', 'Novo cliente', 'novo-cliente', 'sky'),
  ('tag_vip', 'VIP', 'vip', 'pink'),
  ('tag_meta_ads', 'Meta Ads', 'meta-ads', 'blue'),
  ('tag_cilios', 'Cílios', 'cilios', 'violet'),
  ('tag_ruby_rose', 'Ruby Rose', 'ruby-rose', 'rose'),
  ('tag_skincare', 'Skincare', 'skincare', 'emerald'),
  ('tag_reativacao', 'Reativação', 'reativacao', 'amber')
ON CONFLICT ("slug") DO NOTHING;
