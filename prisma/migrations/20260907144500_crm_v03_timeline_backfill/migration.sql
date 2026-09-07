INSERT INTO "CrmInteraction" ("id", "customerId", "leadId", "productId", "kind", "channel", "body", "createdAt")
SELECT
  'int_backfill_lead_' || l."id",
  l."customerId",
  l."id",
  l."productId",
  'LEAD_CREATED',
  l."source",
  'Oportunidade histórica · ' || l."stage"::text,
  l."createdAt"
FROM "CrmLead" l
ON CONFLICT ("id") DO NOTHING;

INSERT INTO "CrmInteraction" ("id", "customerId", "orderId", "kind", "channel", "body", "createdAt")
SELECT
  'int_backfill_order_' || o."id",
  o."customerId",
  o."id",
  CASE WHEN o."status" = 'FINALIZADO'::"order_status" THEN 'ORDER_FINALIZED' ELSE 'ORDER_CREATED' END,
  lower(o."channel"::text),
  'Pedido #' || o."number"::text || ' · ' || o."status"::text,
  CASE WHEN o."status" = 'FINALIZADO'::"order_status" THEN o."updatedAt" ELSE o."createdAt" END
FROM "Order" o
WHERE o."customerId" IS NOT NULL
ON CONFLICT ("id") DO NOTHING;
