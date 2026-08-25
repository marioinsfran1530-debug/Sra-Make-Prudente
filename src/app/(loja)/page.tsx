import { SearchBar } from "@/components/SearchBar";
import { CategoryGrid } from "@/components/CategoryGrid";
import { ProductCarousel } from "@/components/ProductCarousel";
import { StoreAccountButton } from "@/components/StoreAccountButton";
import { CartCountBadge } from "@/components/CartCountBadge";
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
  Sparkles,
  ShoppingCart,
} from "lucide-react";
import { waLink } from "@/lib/whatsapp";
import { WhatsAppLink, LocationLink } from "@/components/TrackedLink";
import Link from "next/link";

export const revalidate = 60;

export default async function HomePage() {
  const [categories, featured, bestSellers, news, settings] = await Promise.all([
    getCategories(),
    getProducts({ featured: true }),
    getProducts({ bestSeller: true }),
    getProducts({ isNew: true }),
    getStoreSettings(),
  ]);

  // A primeira vitrine da home é curta de propósito: mostra produtos reais cedo,
  // sem empurrar categorias e conteúdo útil para muito abaixo da dobra.
  const featuredHome = featured.slice(0, 6);
  const featuredIds = new Set(featuredHome.map((product) => product.id));
  const bestSellersHome = bestSellers
    .filter((product) => !featuredIds.has(product.id))
    .slice(0, 8);
  const usedIds = new Set([
    ...featuredIds,
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

  const heroHighlights = [
    settings?.highlight1,
    settings?.highlight2,
    settings?.highlight3,
  ].filter(Boolean) as string[];

  const secondaryHref =
    settings?.secondaryCtaUrl ||
    waLink(
      "Oi! Vim pelo catálogo da Sra Make Prudente e preciso de ajuda para escolher um produto.",
      whatsappNumber
    );

  return (
    <main>
      <div className="px-4 pt-3 md:pt-4">
        <section
          className="relative min-h-[340px] overflow-hidden rounded-3xl text-white md:min-h-[360px]"
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
                className="h-full w-full object-cover"
              />
            </picture>
          )}

          <div className="absolute inset-0 bg-gradient-to-r from-[#241429]/88 via-[#241429]/58 to-[#241429]/15" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/25 via-transparent to-black/10" />

          <div className="absolute right-4 top-4 z-20 flex items-center gap-2 md:right-6 md:top-6">
            <div className="rounded-full bg-white text-rosa-profundo shadow-lg ring-1 ring-white/80">
              <StoreAccountButton />
            </div>
            <Link
              href="/carrinho"
              className="relative flex h-11 w-11 items-center justify-center rounded-full border border-white bg-white text-[#C70A68] shadow-xl ring-2 ring-white/70 transition hover:-translate-y-0.5 hover:scale-105"
              aria-label="Abrir carrinho"
            >
              <ShoppingCart size={21} strokeWidth={2.5} />
              <CartCountBadge />
            </Link>
          </div>

          <div className="relative z-10 grid min-h-[340px] items-end gap-5 p-5 sm:p-7 md:min-h-[360px] md:grid-cols-[minmax(0,1fr)_220px] md:p-8 lg:grid-cols-[minmax(0,1fr)_240px]">
            <div className="max-w-3xl">
              <div className="flex items-center gap-3 md:gap-4">
                <div
                  className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full border-[3px] border-white bg-white font-serif text-xl font-bold text-white shadow-xl md:h-20 md:w-20 md:text-2xl"
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

                <div className="min-w-0 pr-20 md:pr-0">
                  <p className="mb-1 text-[9px] font-semibold uppercase tracking-[0.2em] text-white/75 md:text-[11px]">
                    {settings?.heroEyebrow || "Loja física + catálogo online"}
                  </p>
                  <h1 className="font-serif text-2xl font-bold leading-tight drop-shadow-sm sm:text-3xl md:text-4xl">
                    {settings?.storeName || "Sra Make Prudente"}
                  </h1>
                  <p className="mt-1 inline-flex items-center gap-1.5 text-xs font-semibold text-white/90">
                    <MapPin size={14} /> Presidente Prudente/SP
                  </p>
                </div>
              </div>

              <div className="mt-4 max-w-2xl">
                <h2 className="font-serif text-lg font-bold leading-tight sm:text-xl md:text-2xl">
                  Maquiagem, lash e nail com entrega rápida em Presidente Prudente/SP
                </h2>
                <p className="mt-1.5 max-w-xl text-xs leading-relaxed text-white/88 sm:text-sm md:text-base">
                  Escolha pelo catálogo, veja preços e disponibilidade e finalize com atendimento da Sra Make.
                </p>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-2">
                <div className="inline-flex items-center gap-2 rounded-xl border border-white/25 bg-white/90 px-3 py-2 text-[#23142A] shadow-sm backdrop-blur">
                  <Truck size={15} className="text-rosa-profundo" />
                  <span className="text-[11px] font-bold">Retirada ou entrega</span>
                </div>
                <WhatsAppLink
                  href={secondaryHref}
                  context="home_help"
                  className="inline-flex items-center gap-2 rounded-xl border border-white/55 bg-transparent px-3 py-2 text-[11px] font-semibold text-white transition hover:bg-white/10"
                >
                  <MessageCircle size={14} /> Atendimento no WhatsApp
                </WhatsAppLink>
              </div>

              {heroHighlights.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5">
                  {heroHighlights.map((highlight) => (
                    <span
                      key={highlight}
                      className="inline-flex items-center gap-1.5 text-[10px] font-semibold text-white/90"
                    >
                      <Sparkles size={11} className="text-[#F9D87C]" />
                      {highlight}
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className="flex self-end md:absolute md:bottom-[64px] md:right-8 md:w-[220px] lg:right-8 lg:w-[240px]">
              <Link
                href={settings?.primaryCtaUrl || "/categoria"}
                className="flex min-h-[56px] w-full items-center justify-center rounded-2xl bg-white px-5 py-3 text-center text-sm font-extrabold text-rosa-profundo shadow-xl transition hover:-translate-y-0.5 hover:shadow-2xl md:min-h-[52px]"
              >
                Ver produtos
              </Link>
            </div>
          </div>
        </section>
      </div>

      <div className="mt-3 md:mt-4">
        <SearchBar />
      </div>

      {featuredHome.length > 0 && (
        <Section title="Destaques" products={featuredHome} compactTop />
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
