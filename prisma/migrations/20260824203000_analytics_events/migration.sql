CREATE TABLE "AnalyticsEvent" (
    "id" TEXT NOT NULL,
    "event" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "productId" TEXT,
    "variantId" TEXT,
    "categorySlug" TEXT,
    "query" TEXT,
    "context" TEXT,
    "value" DECIMAL(12,2),
    "quantity" INTEGER,
    "itemCount" INTEGER,
    "pagePath" TEXT,
    "origin" TEXT,
    "landingPage" TEXT,
    "utmSource" TEXT,
    "utmMedium" TEXT,
    "utmCampaign" TEXT,
    "utmContent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AnalyticsEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AnalyticsEvent_createdAt_idx" ON "AnalyticsEvent"("createdAt");
CREATE INDEX "AnalyticsEvent_event_createdAt_idx" ON "AnalyticsEvent"("event", "createdAt");
CREATE INDEX "AnalyticsEvent_sessionId_createdAt_idx" ON "AnalyticsEvent"("sessionId", "createdAt");
CREATE INDEX "AnalyticsEvent_productId_event_idx" ON "AnalyticsEvent"("productId", "event");
CREATE INDEX "AnalyticsEvent_utmCampaign_createdAt_idx" ON "AnalyticsEvent"("utmCampaign", "createdAt");
