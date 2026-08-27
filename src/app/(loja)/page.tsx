import { SearchBar } from "@/components/SearchBar";
import { CategoryGrid } from "@/components/CategoryGrid";
import { ProductCarousel } from "@/components/ProductCarousel";
import { StoreAccountButton } from "@/components/StoreAccountButton";
import { getCategories, getProducts, getStoreSettings } from "@/lib/data";
import {
  MessageCircle,
  Camera,
  Package,
  Truck,
  Search,
  MapPin,
  Clock,
  Instagram,
  Facebook,
} from "lucide-react";
import { waLink } from "@/lib/whatsapp";
import { resolveStorefrontConversion } from "@/lib/storefront-conversion";
import { WhatsAppLink, LocationLink } from "@/components/TrackedLink";
import Link from "next/link";

export const revalidate = 60;

export default async function HomePage() {
  const [categories, products, settings] = await Promise.all([
    getCategories(),
    getProducts(),
    getStoreSettings(),
  ]);

  // A primeira vitrine privilegia intenção de compra real: oferta válida,
  // depois procura comprovada e, por fim, curadoria manual. Produtos sem estoque
  // não ocupam esse espaço comercial de maior valor.
  const sellableProducts = products.filter((product) => product.stock !== "INDISPONIVEL");
  const offers = sellableProducts.filter(
    (product) => product.promoPrice !== null && product.promoPrice < product.price
  );
  const bestSellers = sellableProducts.filter((product) => product.bestSeller);
  const featured = sellableProducts.filter((product) => product.featured);
  const news = sellableProducts.filter((product) => product.isNew);

  const firstSectionProducts =
    offers.length >= 2
      ? offers.slice(0, 6)
      : bestSellers.length > 0
        ? bestSellers.slice(0, 6)
        : featured.slice(0, 6);
  const firstSectionTitle =
    offers.length >= 2 ? "Ofertas" : bestSellers.length > 0 ? "Mais procurados" : "Destaques";

  const firstSectionIds = new Set(firstSectionProducts.map((product) => product.id));
  const bestSellersHome = bestSellers
    .filter((product) => !firstSectionIds.has(product.id))
    .slice(0, 8);
  const usedIds = new Set([
    ...firstSectionIds,
    ...bestSellersHome.map((product) => product.id),
  ]);
  const newsHome = news
    .filter((product) => !usedIds.has(product.id))
    .slice(0, 8);

  const whatsappNumber = settings?.whatsapp ?? "5518991248713";
  const instagramHandle = settings?.instagram
    ? settings.instagram.replace("@", "")
    : null;
  const facebookHref = settings?.facebook
    ? settings.facebook.startsWith("http")
      ? settings.facebook
      : `https://facebook.com/${settings.facebook.replace("@", "")}`
    : null;

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
                  settings?.bannerDesktopUrl ||
                  settings?.bannerMobileUrl ||
                  ""
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
                context="home_help"
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

      {firstSectionProducts.length > 0 && (
        <Section title={firstSectionTitle} products={firstSectionProducts} compactTop />
      )}

      <div className="mt-5 px-4">
        <p className="mb-3 font-serif text-lg font-bold text-texto">
          O que você procura hoje?
        </p>
        <CategoryGrid categories={categories} />
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3 px-4">
        <Link
          href="/categoria/maquiagem"
          className="group rounded-2xl border border-rosa/10 bg-creme p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
        >
          <p className="text-[10px] font-bold uppercase tracking-wider text-rosa-profundo">
            Para você
          </p>
          <p className="mt-1 font-serif text-sm font-bold text-texto">
            Maquiagem para o dia a dia
          </p>
          <p className="mt-1 text-xs text-cinza">
            Encontre bases, batons, máscaras, pós e muito mais.
          </p>
          <p className="mt-3 text-[11px] font-bold text-rosa-profundo group-hover:underline">
            Ver maquiagem →
          </p>
        </Link>

        <Link
          href="/categoria"
          className="group rounded-2xl border border-roxo/10 p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
          style={{ backgroundColor: "#F1ECF7" }}
        >
          <p className="text-[10px] font-bold uppercase tracking-wider text-roxo">
            Para seu trabalho
          </p>
          <p className="mt-1 font-serif text-sm font-bold text-texto">
            Materiais profissionais
          </p>
          <p className="mt-1 text-xs text-cinza">
            Lash, nail e produtos para facilitar sua reposição.
          </p>
          <p className="mt-3 text-[11px] font-bold text-roxo group-hover:underline">
            Ver materiais →
          </p>
        </Link>
      </div>

      {bestSellersHome.length > 0 && (
        <Section title="Mais procurados" products={bestSellersHome} />
      )}

      {newsHome.length > 0 && (
        <Section title="Novidades" products={newsHome} />
      )}

      <div className="mx-4 mt-8 flex items-center gap-4 rounded-2xl bg-navy p-5">
        <Package
          size={30}
          className="flex-shrink-0"
          style={{ color: "#C9972E" }}
        />
        <div className="flex-1">
          <p className="mb-1 font-serif text-sm font-bold text-white">
            Precisa repor?
          </p>
          <p className="mb-2 text-xs text-white/70">
            Manda o nome ou uma foto do produto e a gente confirma se temos disponível.
          </p>
          <WhatsAppLink
            href={waLink(
              "Oi! Preciso repor um material e queria confirmar disponibilidade. Vim pelo catálogo da Sra Make Prudente.",
              whatsappNumber
            )}
            context="home_reposicao"
            className="inline-flex items-center gap-1 rounded-full border border-white/20 px-3 py-1.5 text-xs font-bold shadow-md transition hover:-translate-y-0.5 hover:shadow-lg"
            style={{ backgroundColor: "#C9972E", color: "#131B33" }}
          >
            <Camera size={13} /> Mandar no WhatsApp
          </WhatsAppLink>
        </div>
      </div>

      <div className="mt-8 px-4">
        <div className="rounded-2xl border border-rosa/10 bg-white p-4 shadow-sm">
          <p className="font-serif text-base font-bold text-texto">
            Comprar ficou mais fácil
          </p>
          <p className="mb-4 mt-1 text-xs text-cinza">
            Escolha no catálogo e finalize do jeito que preferir.
          </p>

          <div className="grid grid-cols-3 gap-2">
            {[
              { icon: Search, title: "Escolha", text: "Encontre o produto" },
              { icon: MessageCircle, title: "Confirme", text: "Fale com a gente" },
              { icon: Truck, title: "Receba", text: "Entrega ou retirada" },
            ].map((step, index) => (
              <div
                key={step.title}
                className="relative rounded-xl bg-creme px-2 py-3 text-center"
              >
                <div className="mx-auto mb-2 flex h-8 w-8 items-center justify-center rounded-full bg-white shadow-sm">
                  <step.icon size={16} className="text-rosa-profundo" />
                </div>
                <p className="text-[11px] font-bold text-texto">
                  {index + 1}. {step.title}
                </p>
                <p className="mt-0.5 text-[10px] leading-tight text-cinza">
                  {step.text}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {settings && (
        <div className="mx-4 mb-6 mt-8 overflow-hidden rounded-3xl border border-rosa/15 bg-white shadow-sm">
          <div className="grid grid-cols-1 lg:grid-cols-2">
            <div className="p-5 lg:p-6">
              <p className="text-[10px] font-bold uppercase tracking-widest text-rosa-profundo">
                Nossa loja
              </p>
              <p className="mt-1 font-serif text-lg font-bold text-texto">
                {settings.storeName}
              </p>

              <div className="mt-5 flex flex-col gap-4">
                {settings.address && (
                  <div className="flex items-start gap-3">
                    <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-creme">
                      <MapPin size={16} className="text-rosa-profundo" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-texto">Endereço</p>
                      <p className="mt-0.5 text-xs leading-relaxed text-cinza">
                        {settings.address}
                      </p>
                    </div>
                  </div>
                )}

                {settings.businessHours && (
                  <div className="flex items-start gap-3">
                    <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-creme">
                      <Clock size={16} className="text-rosa-profundo" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-texto">Horário</p>
                      <p className="mt-0.5 whitespace-pre-line text-xs leading-relaxed text-cinza">
                        {settings.businessHours}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {settings.address && (
                <LocationLink
                  href={
                    settings.googleMapsUrl ||
                    `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                      settings.address
                    )}`
                  }
                  className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl border border-rosa/20 bg-creme py-3 text-center text-xs font-bold text-rosa-profundo shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                >
                  <MapPin size={15} /> Como chegar
                </LocationLink>
              )}
            </div>

            <div className="border-t border-rosa/10 bg-[#FFF9FC] p-5 lg:border-l lg:border-t-0 lg:p-6">
              <p className="text-[10px] font-bold uppercase tracking-widest text-rosa-profundo">
                Fale com a gente
              </p>
              <p className="mt-1 font-serif text-lg font-bold text-texto">
                Precisa de ajuda?
              </p>
              <p className="mb-5 mt-1 text-xs text-cinza">
                Tire dúvidas, consulte disponibilidade ou fale com nossa equipe.
              </p>

              <WhatsAppLink
                href={waLink(
                  "Oi! Vim pelo catálogo da Sra Make Prudente.",
                  whatsappNumber
                )}
                context="home_location"
                className="flex w-full items-center justify-center gap-2 rounded-xl py-3 text-center text-sm font-bold text-white shadow-md transition hover:-translate-y-0.5 hover:shadow-lg"
                style={{ backgroundColor: "#25D366" }}
              >
                <MessageCircle size={17} /> Falar no WhatsApp
              </WhatsAppLink>

              {(instagramHandle || facebookHref) && (
                <div className="mt-5">
                  <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-cinza">
                    Redes sociais
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {instagramHandle && (
                      <a
                        href={`https://instagram.com/${instagramHandle}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center gap-2 rounded-xl border border-rosa/20 bg-white px-3 py-3 text-xs font-bold text-rosa-profundo shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                      >
                        <Instagram size={16} /> Instagram
                      </a>
                    )}
                    {facebookHref && (
                      <a
                        href={facebookHref}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center gap-2 rounded-xl border border-rosa/20 bg-white px-3 py-3 text-xs font-bold text-rosa-profundo shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                      >
                        <Facebook size={16} /> Facebook
                      </a>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

function Section({
  title,
  products,
  compactTop = false,
}: {
  title: string;
  products: Awaited<ReturnType<typeof getProducts>>;
  compactTop?: boolean;
}) {
  return (
    <section className={compactTop ? "mt-2" : "mt-8"}>
      <div className="mb-3 flex items-center justify-between gap-3 px-4">
        <h2 className="font-serif text-lg font-bold text-texto">{title}</h2>
        <Link
          href="/categoria"
          className="rounded-full border border-rosa/15 bg-white px-3 py-1.5 text-xs font-bold text-rosa-profundo shadow-sm transition hover:bg-rosa/5 hover:shadow-md"
        >
          Ver todos →
        </Link>
      </div>
      <ProductCarousel products={products} />
    </section>
  );
}
