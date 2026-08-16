import { SearchBar } from "@/components/SearchBar";
import { CategoryGrid } from "@/components/CategoryGrid";
import { ProductCard } from "@/components/ProductCard";
import { getCategories, getProducts, getStoreSettings } from "@/lib/data";
import { MessageCircle, Camera, Package, Truck, Search, MapPin } from "lucide-react";
import { waLink } from "@/lib/whatsapp";
import { WhatsAppLink, LocationLink } from "@/components/TrackedLink";
import Link from "next/link";

export const revalidate = 60;

export default async function HomePage() {
  const [categories, bestSellers, news, settings] = await Promise.all([
    getCategories(),
    getProducts({ bestSeller: true }),
    getProducts({ isNew: true }),
    getStoreSettings(),
  ]);

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
              className="px-4 py-2.5 rounded-full text-sm font-bold bg-white text-rosa-profundo"
            >
              Ver produtos
            </Link>
            <WhatsAppLink
              href={waLink("Oi! Vim pelo catálogo da Sra Make Prudente e preciso de ajuda para escolher um produto.")}
              context="home_help"
              className="px-4 py-2.5 rounded-full text-sm font-bold border border-white/70 text-white"
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

      {bestSellers.length > 0 && (
        <Section title="Mais procurados" products={bestSellers} />
      )}
      {news.length > 0 && <Section title="Novidades" products={news} />}

      <div className="mt-8 mx-4 rounded-2xl p-5 flex items-center gap-4 bg-navy">
        <Package size={30} className="flex-shrink-0" style={{ color: "#C9972E" }} />
        <div className="flex-1">
          <p className="font-serif font-bold text-white text-sm mb-1">Precisa repor?</p>
          <p className="text-white/70 text-xs mb-2">
            Manda o nome ou uma foto do produto e a gente confirma se temos disponível.
          </p>
          <WhatsAppLink
            href={waLink("Oi! Preciso repor um material e queria confirmar disponibilidade. Vim pelo catálogo da Sra Make Prudente.")}
            context="home_reposicao"
            className="inline-flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-full"
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
        <div className="mt-8 mx-4 rounded-2xl p-5 border border-rosa/20">
          <p className="font-serif font-bold text-sm mb-1 text-texto">Prefere retirar?</p>
          <p className="text-xs mb-3 text-cinza">{settings.address}</p>
          <div className="flex gap-2">
            <LocationLink
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(settings.address ?? "")}`}
              className="flex-1 text-center text-xs font-bold py-2.5 rounded-xl flex items-center justify-center gap-1 bg-creme text-rosa-profundo"
            >
              <MapPin size={14} /> Como chegar
            </LocationLink>
            <WhatsAppLink
              href={waLink("Oi! Vim pelo catálogo da Sra Make Prudente.")}
              context="home_location"
              className="flex-1 text-center text-xs font-bold py-2.5 rounded-xl flex items-center justify-center gap-1 text-white"
              style={{ backgroundColor: "#25D366" }}
            >
              <MessageCircle size={14} /> WhatsApp
            </WhatsAppLink>
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
      <div className="flex gap-3 overflow-x-auto px-4 pb-1">
        {products.map((p) => (
          <div key={p.id} className="w-40 flex-shrink-0">
            <ProductCard product={p} />
          </div>
        ))}
      </div>
    </div>
  );
}
