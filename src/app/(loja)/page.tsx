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

  const featuredHome = featured.slice(0, 8);
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
          className="relative overflow-hidden rounded-3xl min-h-[390px] md:min-h-[360px] text-white"
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
            <div className="rounded-full bg-white shadow-lg ring-1 ring-white/80 text-rosa-profundo">
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

          <div className="relative z-10 grid min-h-[390px] items-end gap-6 p-5 sm:p-7 md:min-h-[360px] md:grid-cols-[minmax(0,1fr)_220px] md:p-8 lg:grid-cols-[minmax(0,1fr)_240px]">
            <div className="max-w-3xl">
              <div className="flex items-center gap-3 md:gap-4">
                <div
                  className="h-16 w-16 md:h-20 md:w-20 shrink-0 overflow-hidden rounded-full border-[3px] border-white bg-white shadow-xl flex items-center justify-center font-serif text-xl md:text-2xl font-bold text-white"
                  style={{
                    background:
                      "linear-gradient(135deg, #E4127B 0%, #A6157A 55%, #6E1E8C 100%)",
                  }}
                >
                  {settings?.logoUrl ? (
                    <img
                      src={settings.logoUrl}
                      alt={`Logo ${settings.storeName}`}
                      className="h-full w-full object-contain bg-white"
                    />
                  ) : (
                    "SM"
                  )}
                </div>

                <div className="min-w-0 pr-20 md:pr-0">
                  <p className="text-[9px] md:text-[11px] font-semibold uppercase tracking-[0.2em] text-white/75 mb-1">
                    {settings?.heroEyebrow || "Loja física + catálogo online"}
                  </p>
                  <h1 className="font-serif text-2xl sm:text-3xl md:text-4xl font-bold leading-tight drop-shadow-sm">
                    {settings?.storeName || "Sra Make Prudente"}
                  </h1>
                  <p className="mt-1 inline-flex items-center gap-1.5 text-xs font-semibold text-white/90">
                    <MapPin size={14} /> Presidente Prudente/SP
                  </p>
                </div>
              </div>

              <div className="mt-4 max-w-2xl">
                <h2 className="font-serif text-lg sm:text-xl md:text-2xl font-bold leading-tight">
                  {settings?.heroTitle ||
                    "Encontre o que você precisa na Sra Make."}
                </h2>
                <p className="mt-1.5 max-w-xl text-xs sm:text-sm md:text-base leading-relaxed text-white/88">
                  {settings?.heroSubtitle ||
                    "Maquiagem, lash, nail e acessórios. Escolha pelo catálogo e confirme pelo WhatsApp."}
                </p>
              </div>

              <div className="mt-4 grid max-w-2xl grid-cols-1 gap-2 sm:grid-cols-2">
                <div className="flex items-center gap-3 rounded-2xl border border-white/25 bg-white/90 px-3.5 py-2.5 text-[#23142A] shadow-sm backdrop-blur">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#FFF0F7] text-rosa-profundo">
                    <Truck size={16} />
                  </div>
                  <div>
                    <p className="text-xs font-bold">Retirada ou entrega</p>
                    <p className="text-[10px] text-cinza">Escolha como prefere receber</p>
                  </div>
                </div>

                <WhatsAppLink
                  href={secondaryHref}
                  context="home_help"
                  className="flex items-center gap-3 rounded-2xl border border-white/25 bg-white/90 px-3.5 py-2.5 text-[#23142A] shadow-sm backdrop-blur transition hover:bg-white hover:shadow-md"
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#FFF0F7] text-rosa-profundo">
                    <MessageCircle size={16} />
                  </div>
                  <div>
                    <p className="text-xs font-bold">Atendimento no WhatsApp</p>
                    <p className="text-[10px] text-cinza">Tire dúvidas e receba ajuda</p>
                  </div>
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

            <div className="flex self-end md:absolute md:right-8 md:bottom-[64px] md:w-[220px] lg:right-8 lg:w-[240px]">
              <Link
                href={settings?.primaryCtaUrl || "/categoria"}
                className="flex min-h-[56px] w-full items-center justify-center rounded-2xl bg-white px-5 py-3 text-center text-sm font-bold text-rosa-profundo shadow-lg transition hover:-translate-y-0.5 hover:shadow-xl md:min-h-[52px]"
              >
                {settings?.primaryCtaLabel || "Ver produtos"}
              </Link>
            </div>
          </div>
        </section>
      </div>

      <div className="mt-4 md:mt-5">
        <SearchBar />
      </div>

      <div className="mt-5 px-4">
        <p className="font-serif font-bold text-lg mb-3 text-texto">
          O que você procura hoje?
        </p>
        <CategoryGrid categories={categories} />
      </div>

      <div className="mt-6 px-4 grid grid-cols-2 gap-3">
        <Link
          href="/categoria/make"
          className="group rounded-2xl p-4 bg-creme border border-rosa/10 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
        >
          <p className="text-[10px] font-bold uppercase tracking-wider text-rosa-profundo">
            Para você
          </p>
          <p className="font-serif font-bold text-sm mt-1 text-texto">
            Maquiagem para o dia a dia
          </p>
          <p className="text-xs mt-1 text-cinza">
            Encontre bases, batons, máscaras, pós e muito mais.
          </p>
          <p className="text-[11px] font-bold text-rosa-profundo mt-3 group-hover:underline">
            Ver maquiagem →
          </p>
        </Link>

        <Link
          href="/categoria"
          className="group rounded-2xl p-4 border border-roxo/10 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
          style={{ backgroundColor: "#F1ECF7" }}
        >
          <p className="text-[10px] font-bold uppercase tracking-wider text-roxo">
            Para seu trabalho
          </p>
          <p className="font-serif font-bold text-sm mt-1 text-texto">
            Materiais profissionais
          </p>
          <p className="text-xs mt-1 text-cinza">
            Lash, nail e produtos para facilitar sua reposição.
          </p>
          <p className="text-[11px] font-bold text-roxo mt-3 group-hover:underline">
            Ver materiais →
          </p>
        </Link>
      </div>

      {featuredHome.length > 0 && (
        <Section title="Destaques" products={featuredHome} />
      )}

      {bestSellersHome.length > 0 && (
        <Section title="Mais procurados" products={bestSellersHome} />
      )}

      {newsHome.length > 0 && (
        <Section title="Novidades" products={newsHome} />
      )}

      <div className="mt-8 mx-4 rounded-2xl p-5 flex items-center gap-4 bg-navy">
        <Package
          size={30}
          className="flex-shrink-0"
          style={{ color: "#C9972E" }}
        />
        <div className="flex-1">
          <p className="font-serif font-bold text-white text-sm mb-1">
            Precisa repor?
          </p>
          <p className="text-white/70 text-xs mb-2">
            Manda o nome ou uma foto do produto e a gente confirma se temos disponível.
          </p>
          <WhatsAppLink
            href={waLink(
              "Oi! Preciso repor um material e queria confirmar disponibilidade. Vim pelo catálogo da Sra Make Prudente.",
              whatsappNumber
            )}
            context="home_reposicao"
            className="inline-flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-full shadow-md border border-white/20 transition hover:-translate-y-0.5 hover:shadow-lg"
            style={{ backgroundColor: "#C9972E", color: "#131B33" }}
          >
            <Camera size={13} /> Mandar no WhatsApp
          </WhatsAppLink>
        </div>
      </div>

      <div className="mt-8 px-4">
        <div className="rounded-2xl border border-rosa/10 bg-white shadow-sm p-4">
          <p className="font-serif font-bold text-base text-texto">
            Comprar ficou mais fácil
          </p>
          <p className="text-xs text-cinza mt-1 mb-4">
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
                <div className="w-8 h-8 mx-auto rounded-full bg-white flex items-center justify-center shadow-sm mb-2">
                  <step.icon size={16} className="text-rosa-profundo" />
                </div>
                <p className="text-[11px] font-bold text-texto">
                  {index + 1}. {step.title}
                </p>
                <p className="text-[10px] text-cinza mt-0.5 leading-tight">
                  {step.text}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {settings && (
        <div className="mt-8 mx-4 mb-6 rounded-3xl border border-rosa/15 bg-white shadow-sm overflow-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-2">
            <div className="p-5 lg:p-6">
              <p className="text-[10px] font-bold uppercase tracking-widest text-rosa-profundo">
                Nossa loja
              </p>
              <p className="font-serif font-bold text-lg mt-1 text-texto">
                {settings.storeName}
              </p>

              <div className="mt-5 flex flex-col gap-4">
                {settings.address && (
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-full bg-creme flex items-center justify-center flex-shrink-0">
                      <MapPin size={16} className="text-rosa-profundo" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-texto">Endereço</p>
                      <p className="text-xs text-cinza mt-0.5 leading-relaxed">
                        {settings.address}
                      </p>
                    </div>
                  </div>
                )}

                {settings.businessHours && (
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-full bg-creme flex items-center justify-center flex-shrink-0">
                      <Clock size={16} className="text-rosa-profundo" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-texto">Horário</p>
                      <p className="text-xs text-cinza mt-0.5 whitespace-pre-line leading-relaxed">
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
                  className="mt-5 w-full text-center text-xs font-bold py-3 rounded-xl flex items-center justify-center gap-2 bg-creme text-rosa-profundo border border-rosa/20 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                >
                  <MapPin size={15} /> Como chegar
                </LocationLink>
              )}
            </div>

            <div className="p-5 lg:p-6 border-t lg:border-t-0 lg:border-l border-rosa/10 bg-[#FFF9FC]">
              <p className="text-[10px] font-bold uppercase tracking-widest text-rosa-profundo">
                Fale com a gente
              </p>
              <p className="font-serif font-bold text-lg mt-1 text-texto">
                Precisa de ajuda?
              </p>
              <p className="text-xs text-cinza mt-1 mb-5">
                Tire dúvidas, consulte disponibilidade ou fale com nossa equipe.
              </p>

              <WhatsAppLink
                href={waLink(
                  "Oi! Vim pelo catálogo da Sra Make Prudente.",
                  whatsappNumber
                )}
                context="home_location"
                className="w-full text-center text-sm font-bold py-3 rounded-xl flex items-center justify-center gap-2 text-white shadow-md transition hover:-translate-y-0.5 hover:shadow-lg"
                style={{ backgroundColor: "#25D366" }}
              >
                <MessageCircle size={17} /> Falar no WhatsApp
              </WhatsAppLink>

              {(instagramHandle || facebookHref) && (
                <div className="mt-5">
                  <p className="text-[10px] uppercase tracking-wider font-bold text-cinza mb-2">
                    Redes sociais
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {instagramHandle && (
                      <a
                        href={`https://instagram.com/${instagramHandle}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs font-bold px-3 py-3 rounded-xl flex items-center justify-center gap-2 bg-white text-rosa-profundo border border-rosa/20 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                      >
                        <Instagram size={16} /> Instagram
                      </a>
                    )}
                    {facebookHref && (
                      <a
                        href={facebookHref}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs font-bold px-3 py-3 rounded-xl flex items-center justify-center gap-2 bg-white text-rosa-profundo border border-rosa/20 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
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
}: {
  title: string;
  products: Awaited<ReturnType<typeof getProducts>>;
}) {
  return (
    <section className="mt-8">
      <div className="px-4 mb-3 flex items-center justify-between gap-3">
        <h2 className="font-serif font-bold text-lg text-texto">{title}</h2>
        <Link
          href="/categoria"
          className="text-xs font-bold text-rosa-profundo px-3 py-1.5 rounded-full border border-rosa/15 bg-white shadow-sm transition hover:bg-rosa/5 hover:shadow-md"
        >
          Ver todos →
        </Link>
      </div>
      <ProductCarousel products={products} />
    </section>
  );
}