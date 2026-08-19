import { SearchBar } from "@/components/SearchBar";
import { CategoryGrid } from "@/components/CategoryGrid";
import { ProductCarousel } from "@/components/ProductCarousel";
import { getCategories, getProducts, getStoreSettings } from "@/lib/data";
import { MessageCircle, Camera, Package, Truck, Search, MapPin, Clock, Instagram, Facebook, Sparkles } from "lucide-react";
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

  const heroHighlights = [settings?.highlight1, settings?.highlight2, settings?.highlight3].filter(Boolean) as string[];
  const secondaryHref = settings?.secondaryCtaUrl || waLink(
    "Oi! Vim pelo catálogo da Sra Make Prudente e preciso de ajuda para escolher um produto.",
    whatsappNumber
  );

  return (
    <main>
      <SearchBar />

      <div className="px-4">
        <div
          className="rounded-3xl min-h-[350px] md:min-h-[430px] p-6 md:p-10 text-white relative overflow-hidden flex items-end"
          style={{
            background: "linear-gradient(135deg, #E4127B 0%, #A6157A 55%, #6E1E8C 100%)",
          }}
        >
          {(settings?.bannerDesktopUrl || settings?.bannerMobileUrl) && (
            <picture className="absolute inset-0">
              {settings?.bannerMobileUrl && <source media="(max-width: 767px)" srcSet={settings.bannerMobileUrl} />}
              <img src={settings?.bannerDesktopUrl || settings?.bannerMobileUrl || ""} alt="Banner da vitrine" className="h-full w-full object-cover" />
            </picture>
          )}
          <div className="absolute inset-0 bg-gradient-to-r from-[#23142a]/90 via-[#23142a]/60 to-transparent" />
          <div className="relative z-10 max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-widest text-white/80 mb-2">
              {settings?.heroEyebrow || "Catálogo Sra Make"}
            </p>
            <h1 className="font-serif font-bold text-3xl md:text-5xl leading-tight mb-3">
              {settings?.heroTitle || "Encontre o que você precisa na Sra Make."}
            </h1>
            <p className="text-white/85 text-sm md:text-base mb-5 max-w-xl">
              {settings?.heroSubtitle || "Maquiagem, lash, nail e acessórios. Escolha pelo catálogo e confirme pelo WhatsApp."}
            </p>
            <div className="flex flex-wrap gap-2">
              <Link
                href={settings?.primaryCtaUrl || "/categoria"}
                className="px-4 py-2.5 rounded-full text-sm font-bold bg-white text-rosa-profundo shadow-md border border-white/80 transition hover:-translate-y-0.5 hover:shadow-lg"
              >
                {settings?.primaryCtaLabel || "Ver produtos"}
              </Link>
              <WhatsAppLink
                href={secondaryHref}
                context="home_help"
                className="px-4 py-2.5 rounded-full text-sm font-bold border border-white text-white shadow-md transition hover:-translate-y-0.5 hover:shadow-lg hover:bg-white/10"
              >
                {settings?.secondaryCtaLabel || "Preciso de ajuda"}
              </WhatsAppLink>
            </div>
            {heroHighlights.length > 0 && (
              <div className="mt-5 flex flex-wrap gap-x-4 gap-y-2">
                {heroHighlights.map((highlight) => (
                  <span key={highlight} className="inline-flex items-center gap-1.5 text-xs font-semibold text-white/90">
                    <Sparkles size={13} className="text-[#F9D87C]" />
                    {highlight}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="mt-6 px-4">
        <p className="font-serif font-bold text-lg mb-3 text-texto">O que você procura hoje?</p>
        <CategoryGrid categories={categories} />
      </div>

      <div className="mt-6 px-4 grid grid-cols-2 gap-3">
        <Link href="/categoria/make" className="group rounded-2xl p-4 bg-creme border border-rosa/10 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
          <p className="text-[10px] font-bold uppercase tracking-wider text-rosa-profundo">Para você</p>
          <p className="font-serif font-bold text-sm mt-1 text-texto">Maquiagem para o dia a dia</p>
          <p className="text-xs mt-1 text-cinza">Encontre bases, batons, máscaras, pós e muito mais.</p>
          <p className="text-[11px] font-bold text-rosa-profundo mt-3 group-hover:underline">Ver maquiagem →</p>
        </Link>

        <Link href="/categoria" className="group rounded-2xl p-4 border border-roxo/10 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md" style={{ backgroundColor: "#F1ECF7" }}>
          <p className="text-[10px] font-bold uppercase tracking-wider text-roxo">Para seu trabalho</p>
          <p className="font-serif font-bold text-sm mt-1 text-texto">Materiais profissionais</p>
          <p className="text-xs mt-1 text-cinza">Lash, nail e produtos para facilitar sua reposição.</p>
          <p className="text-[11px] font-bold text-roxo mt-3 group-hover:underline">Ver materiais →</p>
        </Link>
      </div>

      {featuredHome.length > 0 && <Section title="Destaques" products={featuredHome} />}
      {bestSellersHome.length > 0 && <Section title="Mais procurados" products={bestSellersHome} />}
      {newsHome.length > 0 && <Section title="Novidades" products={newsHome} />}

      <div className="mt-8 mx-4 rounded-2xl p-5 flex items-center gap-4 bg-navy">
        <Package size={30} className="flex-shrink-0" style={{ color: "#C9972E" }} />
        <div className="flex-1">
          <p className="font-serif font-bold text-white text-sm mb-1">Precisa repor?</p>
          <p className="text-white/70 text-xs mb-2">Manda o nome ou uma foto do produto e a gente confirma se temos disponível.</p>
          <WhatsAppLink href={waLink("Oi! Preciso repor um material e queria confirmar disponibilidade. Vim pelo catálogo da Sra Make Prudente.", whatsappNumber)} context="home_reposicao" className="inline-flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-full shadow-md border border-white/20 transition hover:-translate-y-0.5 hover:shadow-lg" style={{ backgroundColor: "#C9972E", color: "#131B33" }}>
            <Camera size={13} /> Mandar no WhatsApp
          </WhatsAppLink>
        </div>
      </div>

      <div className="mt-8 px-4">
        <div className="rounded-2xl border border-rosa/10 bg-white shadow-sm p-4">
          <p className="font-serif font-bold text-base text-texto">Comprar ficou mais fácil</p>
          <p className="text-xs text-cinza mt-1 mb-4">Escolha no catálogo e finalize do jeito que preferir.</p>
          <div className="grid grid-cols-3 gap-2">
            {[
              { icon: Search, title: "Escolha", text: "Encontre o produto" },
              { icon: MessageCircle, title: "Confirme", text: "Fale com a gente" },
              { icon: Truck, title: "Receba", text: "Entrega ou retirada" },
            ].map((step, index) => (
              <div key={step.title} className="relative rounded-xl bg-creme px-2 py-3 text-center">
                <div className="w-8 h-8 mx-auto rounded-full bg-white flex items-center justify-center shadow-sm mb-2">
                  <step.icon size={16} className="text-rosa-profundo" />
                </div>
                <p className="text-[11px] font-bold text-texto">{index + 1}. {step.title}</p>
                <p className="text-[10px] text-cinza mt-0.5 leading-tight">{step.text}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {settings && (
        <div className="mt-8 mx-4 mb-6 rounded-3xl border border-rosa/15 bg-white shadow-sm overflow-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-2">
            <div className="p-5 lg:p-6">
              <p className="text-[10px] font-bold uppercase tracking-widest text-rosa-profundo">Nossa loja</p>
              <p className="font-serif font-bold text-lg mt-1 text-texto">{settings.storeName}</p>

              <div className="mt-5 flex flex-col gap-4">
                {settings.address && (
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-full bg-creme flex items-center justify-center flex-shrink-0"><MapPin size={16} className="text-rosa-profundo" /></div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-texto">Endereço</p>
                      <p className="text-xs text-cinza mt-0.5 leading-relaxed">{settings.address}</p>
                    </div>
                  </div>
                )}

                {settings.businessHours && (
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-full bg-creme flex items-center justify-center flex-shrink-0"><Clock size={16} className="text-rosa-profundo" /></div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-texto">Horário</p>
                      <p className="text-xs text-cinza mt-0.5 whitespace-pre-line leading-relaxed">{settings.businessHours}</p>
                    </div>
                  </div>
                )}
              </div>

              {settings.address && (
                <LocationLink href={settings.googleMapsUrl || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(settings.address)}`} className="mt-5 w-full text-center text-xs font-bold py-3 rounded-xl flex items-center justify-center gap-2 bg-creme text-rosa-profundo border border-rosa/20 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
                  <MapPin size={15} /> Como chegar
                </LocationLink>
              )}
            </div>

            <div className="p-5 lg:p-6 border-t lg:border-t-0 lg:border-l border-rosa/10 bg-[#FFF9FC]">
              <p className="text-[10px] font-bold uppercase tracking-widest text-rosa-profundo">Fale com a gente</p>
              <p className="font-serif font-bold text-lg mt-1 text-texto">Precisa de ajuda?</p>
              <p className="text-xs text-cinza mt-1 mb-5">Tire dúvidas, consulte disponibilidade ou fale com nossa equipe.</p>

              <WhatsAppLink href={waLink("Oi! Vim pelo catálogo da Sra Make Prudente.", whatsappNumber)} context="home_location" className="w-full text-center text-sm font-bold py-3 rounded-xl flex items-center justify-center gap-2 text-white shadow-md transition hover:-translate-y-0.5 hover:shadow-lg" style={{ backgroundColor: "#25D366" }}>
                <MessageCircle size={17} /> Falar no WhatsApp
              </WhatsAppLink>

              {(instagramHandle || facebookHref) && (
                <div className="mt-5">
                  <p className="text-[10px] uppercase tracking-wider font-bold text-cinza mb-2">Redes sociais</p>
                  <div className="grid grid-cols-2 gap-2">
                    {instagramHandle && (
                      <a href={`https://instagram.com/${instagramHandle}`} target="_blank" rel="noopener noreferrer" className="text-xs font-bold px-3 py-3 rounded-xl flex items-center justify-center gap-2 bg-white text-rosa-profundo border border-rosa/20 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
                        <Instagram size={16} /> Instagram
                      </a>
                    )}
                    {facebookHref && (
                      <a href={facebookHref} target="_blank" rel="noopener noreferrer" className="text-xs font-bold px-3 py-3 rounded-xl flex items-center justify-center gap-2 bg-white text-rosa-profundo border border-rosa/20 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
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

function Section({ title, products }: { title: string; products: Awaited<ReturnType<typeof getProducts>> }) {
  return (
    <section className="mt-8">
      <div className="px-4 mb-3 flex items-center justify-between gap-3">
        <h2 className="font-serif font-bold text-lg text-texto">{title}</h2>
        <Link href="/categoria" className="text-xs font-bold text-rosa-profundo px-3 py-1.5 rounded-full border border-rosa/15 bg-white shadow-sm transition hover:bg-rosa/5 hover:shadow-md">Ver todos →</Link>
      </div>
      <ProductCarousel products={products} />
    </section>
  );
}
