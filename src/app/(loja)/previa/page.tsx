import type { Metadata } from "next";
import Link from "next/link";
import {
  Camera,
  MapPin,
  MessageCircle,
  Package,
  Search,
  Sparkles,
  Truck,
} from "lucide-react";
import { HomeCategoryRail, BrandRail } from "@/components/HomeDiscoveryRails";
import { ProductCarousel } from "@/components/ProductCarousel";
import { SearchBar } from "@/components/SearchBar";
import { StoreAccountButton } from "@/components/StoreAccountButton";
import { WhatsAppLink } from "@/components/TrackedLink";
import { getCategories, getProducts, getStoreSettings } from "@/lib/data";
import {
  excludeHiddenProducts,
  getHomePopularitySignals,
  getHomeProductOrderSettings,
  orderProductsByConfiguredIds,
  rankPopularProducts,
} from "@/lib/home-merchandising";
import { resolveStorefrontConversion } from "@/lib/storefront-conversion";
import { waLink } from "@/lib/whatsapp";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Prévia do catálogo | Sra Make Prudente",
  robots: { index: false, follow: false },
};

export default async function PreviewHomePage() {
  const [categories, products, settings, merchandising, popularity] = await Promise.all([
    getCategories(),
    getProducts(),
    getStoreSettings(),
    getHomeProductOrderSettings(),
    getHomePopularitySignals(),
  ]);

  const sellableProducts = products.filter(
    (product) => product.stock !== "INDISPONIVEL"
  );

  const offers = excludeHiddenProducts(
    sellableProducts.filter(
      (product) => product.promoPrice !== null && product.promoPrice < product.price
    ),
    merchandising.homeHiddenOffers
  );

  const bestSellers = excludeHiddenProducts(
    rankPopularProducts(sellableProducts, popularity),
    merchandising.homeHiddenPopular
  );

  const featured = orderProductsByConfiguredIds(
    excludeHiddenProducts(
      sellableProducts.filter((product) => product.featured),
      merchandising.homeHiddenFeatured
    ),
    merchandising.homeFeaturedOrder
  );

  const news = orderProductsByConfiguredIds(
    excludeHiddenProducts(
      sellableProducts.filter((product) => product.isNew),
      merchandising.homeHiddenNew
    ),
    merchandising.homeNewOrder
  );

  const underTwenty = sellableProducts
    .filter((product) => (product.promoPrice ?? product.price) <= 19.99)
    .slice(0, 8);
  const kits = sellableProducts
    .filter((product) => {
      const searchable = [
        product.name,
        product.category.name,
        ...product.categories.map((category) => category.name),
      ]
        .join(" ")
        .toLowerCase();
      return searchable.includes("kit");
    })
    .slice(0, 8);

  const firstSectionProducts =
    offers.length >= 2
      ? offers.slice(0, 8)
      : bestSellers.length > 0
        ? bestSellers.slice(0, 8)
        : featured.slice(0, 8);
  const firstSectionTitle =
    offers.length >= 2
      ? "Ofertas para aproveitar"
      : bestSellers.length > 0
        ? "Mais procurados"
        : "Destaques";

  const brandCounts = new Map<string, number>();
  sellableProducts.forEach((product) => {
    const brand = product.brand.trim();
    if (!brand) return;
    brandCounts.set(brand, (brandCounts.get(brand) ?? 0) + 1);
  });
  const popularBrands = [...brandCounts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "pt-BR"))
    .slice(0, 10)
    .map(([brand]) => brand);

  const whatsappNumber = settings?.whatsapp ?? "5518991248713";
  const conversion = resolveStorefrontConversion(settings);
  const heroHighlights = [conversion.highlight1, conversion.highlight2].filter(Boolean);
  const secondaryHref =
    conversion.secondaryCtaUrl ||
    waLink(
      "Oi! Vim pelo catálogo da Sra Make Prudente e preciso de ajuda para escolher um produto.",
      whatsappNumber
    );

  return (
    <main>
      {/* A hero foi preservada propositalmente. A prévia muda a descoberta abaixo dela. */}
      <div className="pt-0 md:px-4 md:pt-4">
        <section
          className="relative min-h-[268px] overflow-hidden text-white md:min-h-[340px] md:rounded-3xl"
          style={{
            background:
              "linear-gradient(135deg, #E4127B 0%, #A6157A 55%, #6E1E8C 100%)",
          }}
        >
          {(settings?.bannerDesktopUrl || settings?.bannerMobileUrl) && (
            <picture className="absolute inset-0 block h-full w-full">
              {settings?.bannerMobileUrl && (
                <source
                  media="(max-width: 767px)"
                  srcSet={settings.bannerMobileUrl}
                />
              )}
              <img
                src={
                  settings?.bannerDesktopUrl || settings?.bannerMobileUrl || ""
                }
                alt="Ambiente da Sra Make Prudente"
                fetchPriority="high"
                decoding="async"
                className="h-full w-full object-cover object-[64%_center] md:object-center"
              />
            </picture>
          )}

          <div className="absolute inset-0 bg-gradient-to-r from-[#241429]/90 via-[#241429]/60 to-[#241429]/20" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-black/10" />

          <div className="absolute right-3 top-3 z-20 md:right-6 md:top-6">
            <div className="origin-top-right scale-90 rounded-full bg-white text-rosa-profundo shadow-lg ring-1 ring-white/80 md:scale-100">
              <StoreAccountButton />
            </div>
          </div>

          <div className="relative z-10 grid min-h-[268px] items-end gap-3 p-4 sm:p-5 md:min-h-[340px] md:grid-cols-[minmax(0,1fr)_220px] md:p-7 lg:grid-cols-[minmax(0,1fr)_240px]">
            <div className="max-w-3xl">
              <div className="flex items-center gap-2.5 md:gap-4">
                <div
                  className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-white bg-white font-serif text-lg font-bold text-white shadow-xl md:h-20 md:w-20 md:border-[3px] md:text-2xl"
                  style={{
                    background:
                      "linear-gradient(135deg, #E4127B 0%, #A6157A 55%, #6E1E8C 100%)",
                  }}
                >
                  {settings?.logoUrl ? (
                    <img
                      src={settings.logoUrl}
                      alt={`Logo ${settings.storeName}`}
                      className="h-full w-full bg-white object-contain"
                    />
                  ) : (
                    "SM"
                  )}
                </div>

                <div className="min-w-0 pr-12 md:pr-0">
                  <p className="mb-0.5 text-[8px] font-semibold uppercase tracking-[0.18em] text-white/80 md:text-[11px]">
                    {conversion.heroEyebrow}
                  </p>
                  <h1 className="font-serif text-xl font-bold leading-tight drop-shadow-sm sm:text-2xl md:text-4xl">
                    {settings?.storeName || "Sra Make Prudente"}
                  </h1>
                  <p className="mt-0.5 inline-flex items-center gap-1 text-[10px] font-semibold text-white/90 md:text-xs">
                    <MapPin size={12} /> Presidente Prudente/SP
                  </p>
                </div>
              </div>

              <div className="mt-3 max-w-2xl">
                <h2 className="max-w-[310px] font-serif text-[19px] font-bold leading-[1.08] sm:max-w-xl sm:text-xl md:text-2xl">
                  {conversion.heroTitle}
                </h2>
                <p className="mt-1 max-w-[330px] text-[11px] leading-[1.45] text-white/88 sm:max-w-xl sm:text-sm md:text-base">
                  {conversion.heroSubtitle}
                </p>
              </div>

              {heroHighlights.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[9px] font-semibold text-white/90 sm:text-[10px]">
                  {heroHighlights.map((highlight, index) => (
                    <span key={highlight} className="inline-flex items-center gap-1">
                      {index === 0 ? <MapPin size={10} /> : <Truck size={10} />}
                      {highlight}
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className="flex flex-col gap-1.5 self-end md:absolute md:bottom-7 md:right-7 md:w-[220px] lg:w-[240px]">
              <Link
                href={conversion.primaryCtaUrl}
                className="flex min-h-[48px] w-full items-center justify-center rounded-2xl bg-white px-5 py-2.5 text-center text-sm font-extrabold text-rosa-profundo shadow-xl transition hover:-translate-y-0.5 hover:shadow-2xl"
              >
                {conversion.primaryCtaLabel}
              </Link>
              <WhatsAppLink
                href={secondaryHref}
                context="home_help_preview"
                className="text-center text-[9px] font-semibold text-white/90 underline-offset-2 hover:underline md:text-[10px]"
              >
                {conversion.secondaryCtaLabel}
              </WhatsAppLink>
            </div>
          </div>
        </section>
      </div>

      <div className="mt-2 md:mt-3">
        <SearchBar />
      </div>

      <HomeCategoryRail categories={categories} />

      {firstSectionProducts.length > 0 && (
        <ProductSection
          title={firstSectionTitle}
          eyebrow="Selecionados para você"
          products={firstSectionProducts}
        />
      )}

      {underTwenty.length >= 3 && (
        <ProductSection
          title="Achadinhos até R$ 19,99"
          eyebrow="Preço fácil para escolher"
          products={underTwenty}
        />
      )}

      <BrandRail brands={popularBrands} />

      <section className="mt-8 px-4">
        <div className="grid grid-cols-2 gap-3">
          <Link
            href="/categoria/maquiagem"
            className="group relative min-h-[154px] overflow-hidden rounded-3xl border border-rosa/10 bg-creme p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
          >
            <Sparkles
              size={72}
              className="absolute -bottom-3 -right-2 text-rosa-profundo/10"
            />
            <p className="text-[10px] font-bold uppercase tracking-wider text-rosa-profundo">
              Para você
            </p>
            <p className="mt-1 max-w-[130px] font-serif text-base font-bold leading-tight text-texto">
              Maquiagem para o dia a dia
            </p>
            <p className="mt-2 max-w-[140px] text-[11px] leading-snug text-cinza">
              Bases, batons, máscaras, pós e outros favoritos.
            </p>
            <p className="mt-3 text-[11px] font-bold text-rosa-profundo">
              Ver maquiagem →
            </p>
          </Link>

          <Link
            href="/categoria"
            className="group relative min-h-[154px] overflow-hidden rounded-3xl border border-roxo/10 p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
            style={{ backgroundColor: "#F1ECF7" }}
          >
            <Package
              size={72}
              className="absolute -bottom-3 -right-2 text-roxo/10"
            />
            <p className="text-[10px] font-bold uppercase tracking-wider text-roxo">
              Para seu trabalho
            </p>
            <p className="mt-1 max-w-[130px] font-serif text-base font-bold leading-tight text-texto">
              Materiais profissionais
            </p>
            <p className="mt-2 max-w-[140px] text-[11px] leading-snug text-cinza">
              Lash, nail e itens para facilitar sua reposição.
            </p>
            <p className="mt-3 text-[11px] font-bold text-roxo">
              Ver materiais →
            </p>
          </Link>
        </div>
      </section>

      {bestSellers.length > 0 && (
        <ProductSection
          title="Mais procurados"
          eyebrow="O que as clientes estão buscando"
          products={bestSellers.slice(0, 8)}
        />
      )}

      {news.length > 0 && (
        <ProductSection
          title="Novidades"
          eyebrow="Chegaram por aqui"
          products={news.slice(0, 8)}
        />
      )}

      {kits.length >= 2 && (
        <ProductSection
          title="Kits Sra Make"
          eyebrow="Combinações práticas"
          products={kits}
        />
      )}

      <div className="mx-4 mt-8 flex items-center gap-4 rounded-3xl bg-navy p-5 shadow-sm">
        <Package
          size={30}
          className="flex-shrink-0"
          style={{ color: "#C9972E" }}
        />
        <div className="flex-1">
          <p className="mb-1 font-serif text-sm font-bold text-white">
            Não achou o que procura?
          </p>
          <p className="mb-3 text-xs leading-relaxed text-white/70">
            Mande o nome ou uma foto. A gente confirma disponibilidade e ajuda você a escolher.
          </p>
          <WhatsAppLink
            href={waLink(
              "Oi! Não encontrei um produto no catálogo e queria confirmar disponibilidade.",
              whatsappNumber
            )}
            context="home_preview_reposicao"
            className="inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-xs font-bold shadow-md transition hover:-translate-y-0.5 hover:shadow-lg"
            style={{ backgroundColor: "#C9972E", color: "#131B33" }}
          >
            <Camera size={13} /> Mandar no WhatsApp
          </WhatsAppLink>
        </div>
      </div>

      <section className="mt-8 px-4">
        <div className="rounded-3xl border border-rosa/10 bg-white p-5 shadow-sm">
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-rosa-profundo">
            Simples do começo ao fim
          </p>
          <h2 className="mt-1 font-serif text-lg font-bold text-texto">
            Comprar ficou mais fácil
          </h2>
          <div className="mt-4 grid grid-cols-3 gap-2">
            {[
              { icon: Search, title: "Escolha", text: "Encontre o produto" },
              { icon: MessageCircle, title: "Confirme", text: "Finalize com a loja" },
              { icon: Truck, title: "Receba", text: "Entrega ou retirada" },
            ].map((step, index) => (
              <div key={step.title} className="rounded-2xl bg-creme px-2 py-3 text-center">
                <div className="mx-auto mb-2 flex h-9 w-9 items-center justify-center rounded-full bg-white shadow-sm">
                  <step.icon size={16} className="text-rosa-profundo" />
                </div>
                <p className="text-[11px] font-bold text-texto">
                  {index + 1}. {step.title}
                </p>
                <p className="mt-1 text-[10px] leading-tight text-cinza">
                  {step.text}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="h-8" />
    </main>
  );
}

function ProductSection({
  title,
  eyebrow,
  products,
}: {
  title: string;
  eyebrow: string;
  products: Awaited<ReturnType<typeof getProducts>>;
}) {
  return (
    <section className="mt-8">
      <div className="mb-3 flex items-end justify-between gap-3 px-4">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-rosa-profundo">
            {eyebrow}
          </p>
          <h2 className="mt-0.5 font-serif text-lg font-bold text-texto">{title}</h2>
        </div>
        <Link
          href="/categoria"
          className="shrink-0 rounded-full border border-rosa/15 bg-white px-3 py-1.5 text-xs font-bold text-rosa-profundo shadow-sm transition hover:bg-rosa/5 hover:shadow-md"
        >
          Ver todos →
        </Link>
      </div>
      <ProductCarousel products={products} />
    </section>
  );
}
