import { SearchBar } from "@/components/SearchBar";
import { CategoryGrid } from "@/components/CategoryGrid";
import { ProductCarousel } from "@/components/ProductCarousel";
import { getCategories, getProducts, getStoreSettings } from "@/lib/data";
import { MessageCircle, Camera, Package, Truck, Search, MapPin, Clock, Instagram, Facebook } from "lucide-react";
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

  const whatsappNumber = settings?.whatsapp ?? "5518991248713";

  const instagramHandle = settings?.instagram
    ? settings.instagram.replace("@", "")
    : null;

  const facebookHref = settings?.facebook
    ? settings.facebook.startsWith("http")
      ? settings.facebook
      : `https://facebook.com/${settings.facebook.replace("@", "")}`
    : null;

  return (
    <main>
      <SearchBar />

      <div className="px-4">
        <div
          className="rounded-3xl p-6 text-white relative overflow-hidden"
          style={{
            background: "linear-gradient(135deg, #E4127B 0%, #A6157A 55%, #6E1E8C 100%)",
          }}
        >
          <p className="text-xs font-semibold uppercase tracking-widest text-white/80 mb-2">
            Catálogo Sra Make
          </p>
          <h1 className="font-serif font-bold text-2xl leading-tight mb-2">
            Encontre o que você precisa na Sra Make.
          </h1>
          <p className="text-white/85 text-sm mb-4">
            Maquiagem, lash, nail e acessórios. Escolha pelo catálogo e confirme pelo WhatsApp.
          </p>
          <div className="flex gap-2">
            <Link
              href="/categoria"
              className="px-4 py-2.5 rounded-full text-sm font-bold bg-white text-rosa-profundo shadow-md border border-white/80 transition hover:-translate-y-0.5 hover:shadow-lg"
            >
              Ver produtos
            </Link>
            <WhatsAppLink
              href={waLink(
                "Oi! Vim pelo catálogo da Sra Make Prudente e preciso de ajuda para escolher um produto.",
                whatsappNumber
              )}
              context="home_help"
              className="px-4 py-2.5 rounded-full text-sm font-bold border border-white text-white shadow-md transition hover:-translate-y-0.5 hover:shadow-lg hover:bg-white/10"
            >
              Preciso de ajuda
            </WhatsAppLink>
          </div>
        </div>
      </div>

      <div className="mx-4 mt-3 px-3 py-2 rounded-xl text-[11px] bg-[#FBEFF4] text-rosa-profundo">
        Catálogo de demonstração — produtos ilustrativos para teste do aplicativo.
      </div>

      <div className="mt-6 px-4">
        <p className="font-serif font-bold text-lg mb-3 text-texto">O que você procura hoje?</p>
        <CategoryGrid categories={categories} />
      </div>

      <div className="mt-6 px-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        <div className="rounded-2xl p-4 bg-creme">
          <p className="text-xs font-bold text-rosa-profundo">Para você</p>
          <p className="text-xs mt-1 text-texto">
            Encontre seu próximo produto de beleza sem complicação.
          </p>
        </div>
        <div className="rounded-2xl p-4" style={{ backgroundColor: "#F1ECF7" }}>
          <p className="text-xs font-bold text-roxo">Para seu trabalho</p>
          <p className="text-xs mt-1 text-texto">
            Precisa repor material? Encontre rápido e confirme no WhatsApp.
          </p>
        </div>
      </div>

      {featured.length > 0 && (
        <Section title="Destaques" products={featured} />
      )}

      {bestSellers.length > 0 && (
        <Section title="Mais procurados" products={bestSellers} />
      )}

      {news.length > 0 && (
        <Section title="Novidades" products={news} />
      )}

      <div className="mt-8 mx-4 rounded-2xl p-5 flex items-center gap-4 bg-navy">
        <Package size={30} className="flex-shrink-0" style={{ color: "#C9972E" }} />
        <div className="flex-1">
          <p className="font-serif font-bold text-white text-sm mb-1">Precisa repor?</p>
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
        <p className="font-serif font-bold text-lg mb-3 text-texto">Comprar ficou mais fácil.</p>
        <div className="flex gap-3">
          {[
            { icon: Search, text: "Você escolhe" },
            { icon: MessageCircle, text: "A gente confirma" },
            { icon: Truck, text: "Você recebe ou retira" },
          ].map((s, i) => (
            <div key={i} className="flex-1 rounded-2xl p-3 text-center bg-creme">
              <s.icon size={20} className="text-rosa-profundo mx-auto mb-1" />
              <p className="text-[11px] font-semibold text-texto">{s.text}</p>
            </div>
          ))}
        </div>
      </div>

      {settings && (
        <div className="mt-8 mx-4 rounded-2xl p-5 border border-rosa/20 bg-white">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-10">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-rosa-profundo">
                Nossa loja
              </p>

              <p className="font-serif font-bold text-lg mt-1 mb-5 text-texto">
                {settings.storeName}
              </p>

              <div className="flex flex-col gap-4">
                {settings.address && (
                  <div className="flex items-start gap-2">
                    <MapPin
                      size={17}
                      className="text-rosa-profundo mt-0.5 flex-shrink-0"
                    />

                    <div>
                      <p className="text-xs font-bold text-texto">
                        Endereço
                      </p>

                      <p className="text-xs text-cinza">
                        {settings.address}
                      </p>
                    </div>
                  </div>
                )}

                {settings.businessHours && (
                  <div className="flex items-start gap-2">
                    <Clock
                      size={17}
                      className="text-rosa-profundo mt-0.5 flex-shrink-0"
                    />

                    <div>
                      <p className="text-xs font-bold text-texto">
                        Horário
                      </p>

                      <p className="text-xs text-cinza whitespace-pre-line">
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
                  className="mt-5 w-full lg:max-w-[420px] text-center text-xs font-bold py-2.5 rounded-xl flex items-center justify-center gap-1 bg-creme text-rosa-profundo border border-rosa/20 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                >
                  <MapPin size={14} />
                  Como chegar
                </LocationLink>
              )}
            </div>

            <div className="lg:border-l lg:border-rosa/10 lg:pl-8 flex flex-col">
              <p className="text-[11px] font-bold uppercase tracking-widest text-rosa-profundo">
                Fale com a gente
              </p>

              <p className="text-sm font-bold text-texto mt-1 mb-4">
                Estamos também nas redes sociais
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
                <MessageCircle size={17} />
                Falar no WhatsApp
              </WhatsAppLink>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3">
                {instagramHandle && (
                  <a
                    href={`https://instagram.com/${instagramHandle}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-bold px-3 py-3 rounded-xl flex items-center justify-center gap-2 bg-creme text-rosa-profundo border border-rosa/20 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                  >
                    <Instagram size={16} />
                    Instagram
                  </a>
                )}

                {facebookHref && (
                  <a
                    href={facebookHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-bold px-3 py-3 rounded-xl flex items-center justify-center gap-2 bg-creme text-rosa-profundo border border-rosa/20 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                  >
                    <Facebook size={16} />
                    Facebook
                  </a>
                )}
              </div>
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
    <div className="mt-8">
      <p className="font-serif font-bold text-lg mb-3 px-4 text-texto">{title}</p>
      <ProductCarousel products={products} />
    </div>
  );
}
