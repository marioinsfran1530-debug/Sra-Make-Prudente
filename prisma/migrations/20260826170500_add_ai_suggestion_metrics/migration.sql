CREATE TABLE "AiSuggestionMetric" (
    "id" TEXT NOT NULL,
    "feature" TEXT NOT NULL,
    "adminId" TEXT NOT NULL,
    "productId" TEXT,
    "model" TEXT NOT NULL,
    "promptVersion" TEXT NOT NULL,
    "suggestionCount" INTEGER NOT NULL DEFAULT 1,
    "used" BOOLEAN NOT NULL DEFAULT false,
    "edited" BOOLEAN,
    "selectedIndex" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "AiSuggestionMetric_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AiSuggestionMetric_feature_createdAt_idx"
ON "AiSuggestionMetric"("feature", "createdAt");

CREATE INDEX "AiSuggestionMetric_productId_feature_idx"
ON "AiSuggestionMetric"("productId", "feature");

CREATE INDEX "AiSuggestionMetric_model_promptVersion_createdAt_idx"
ON "AiSuggestionMetric"("model", "promptVersion", "createdAt");
