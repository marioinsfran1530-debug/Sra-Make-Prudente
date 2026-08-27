-- Controles comerciais da vitrine da Home.
-- Categoria continua ativa no catálogo mesmo quando fica oculta apenas na Home.
ALTER TABLE "Category"
ADD COLUMN IF NOT EXISTS "showOnHome" BOOLEAN NOT NULL DEFAULT true;

-- A ordem manual das marcas vem primeiro; marcas não configuradas seguem fallback automático.
ALTER TABLE "StoreSettings"
ADD COLUMN IF NOT EXISTS "homeBrandOrder" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
ADD COLUMN IF NOT EXISTS "homeHiddenBrands" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
