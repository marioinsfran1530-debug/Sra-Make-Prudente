import type { Metadata } from "next";
import Link from "next/link";
import {
  Clock3,
  MapPin,
  MessageCircle,
  Navigation,
  PackageCheck,
  ShoppingBag,
  Sparkles,
  Store,
  Truck,
} from "lucide-react";
import { getStoreSettings } from "@/lib/data";
import { DICAS } from "@/lib/dicas";
import { resolveStoreLocation } from "@/lib/store-location";
import { waLink } from "@/lib/whatsapp";
import { InfoRow } from "@/components/InfoRow";
import { LocationLink, WhatsAppLink } from "@/components/TrackedLink";

export const revalidate = 60;

const SITE_URL = "https://www.sramakeprudente.com.br";
const PAGE_URL = `${SITE_URL}/loja`;
const STORE_NAME = "Sra Make Prudente";
const STORE_PHONE = "+55 18 99124-8713";

const FAQS = [
  {
    question: "Posso comprar pelo site e retirar na loja?",
    answer:
      "Sim. Escolha os produtos no catálogo e finalize o contato pelo WhatsApp. A equipe confirma os itens e combina a retirada na loja física.",
  },
  {
    question: "A Sra Make faz entrega?",
    answer:
      "Sim. As entregas locais são feitas por 99Entrega somente em Presidente Prudente. A equipe confirma o pedido, o endereço e os detalhes antes de solicitar a corrida.",
  },
  {
    question: "Preciso falar no WhatsApp antes de ir até a loja?",
    answer:
      "Não é obrigatório, mas recomendamos confirmar a disponibilidade do produto antes do deslocamento, principalmente quando você procura um item ou tom específico.",
  },
  {
    question: "Onde fica a Sra Make Prudente?",
    answer:
      "A loja fica no Centro de Presidente Prudente. Nesta página você encontra o endereço atualizado e o botão Como chegar para abrir a rota no Google Maps.",
  },
];

export const metadata: Metadata = {
  title: "Nossa loja de maquiagem em Presidente Prudente | Sra Make",
  description:
    "Conheça a Sra Make Prudente no Centro de Presidente Prudente/SP. Veja endereço, horário, mapa, retirada, 99Entrega, WhatsApp e produtos de maquiagem e beleza.",
  alternates: { canonical: PAGE_URL },
  openGraph: {
    title: "Nossa loja | Sra Make Prudente",
    description:
      "Visite a Sra Make Prudente, consulte o catálogo e combine retirada ou 99Entrega em Presidente Prudente pelo WhatsApp.",
    url: PAGE_URL,
    type: "website",
  },
};

function jsonLd(data: Record<string, unknown>) {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

export default async function LojaInfoPage() {
  const settings = await getStoreSettings();
  const location = resolveStoreLocation(settings);
  const { address, businessHours, mapsUrl, whatsapp } = location;
  const instagram = settings?.instagram ?? "@sramakeprudente";
  const storeName = settings?.storeName ?? STORE_NAME;
  const whatsappHref = waLink(
    "Oi! Vim pela página Nossa loja da Sra Make Prudente e gostaria de atendimento.",
    whatsapp,
  );
  const mapEmbedUrl = `https://www.google.com/maps?q=${encodeURIComponent(address)}&output=embed`;

  const aboutStructuredData = {
    "@context": "https://schema.org",
    "@type": "AboutPage",
    "@id": `${PAGE_URL}#about`,
    url: PAGE_URL,
    name: "Nossa loja | Sra Make Prudente",
    description:
      "Informações oficiais da Sra Make Prudente, loja de maquiagem e cosméticos em Presidente Prudente/SP.",
    isPartOf: { "@id": `${SITE_URL}/#website` },
    about: { "@id": `${SITE_URL}/#store` },
    inLanguage: "pt-BR",
  };

  const localBusinessStructuredData = {
    "@context": "https://schema.org",
    "@type": "Store",
    "@id": `${SITE_URL}/#store`,
    name: storeName,
    alternateName: "Sra Make",
    url: SITE_URL,
    telephone: STORE_PHONE,
    description:
      "Loja de maquiagem e cosméticos em Presidente Prudente/SP, com produtos para maquiagem, lash, nail, skincare e acessórios de beleza.",
    priceRange: "R$",
    hasMap: mapsUrl,
    address: {
      "@type": "PostalAddress",
      streetAddress: address,
      addressLocality: "Presidente Prudente",
      addressRegion: "SP",
      postalCode: "19010-031",
      addressCountry: "BR",
    },
    areaServed: {
      "@type": "City",
      name: "Presidente Prudente",
    },
    openingHoursSpecification: [
      {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
        opens: "09:00",
        closes: "17:00",
      },
      {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: "Saturday",
        opens: "09:00",
        closes: "15:00",
      },
    ],
    sameAs: ["https://www.instagram.com/sramakeprudente/"],
  };

  const faqStructuredData = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQS.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  };

  return (
    <main className="px-4 pb-8 pt-4">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLd(aboutStructuredData) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLd(localBusinessStructuredData) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLd(faqStructuredData) }}
      />

      <section
        className="relative mb-4 overflow-hidden rounded-3xl p-6 text-white shadow-sm"
        style={{
          background: "linear-gradient(135deg, #E4127B 0%, #A6157A 55%, #6E1E8C 100%)",
        }}
      >
        <div className="absolute -right-12 -top-12 h-40 w-40 rounded-full bg-white/10" />
        <div className="absolute -bottom-16 -left-10 h-44 w-44 rounded-full bg-white/5" />

        <div className="relative">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-[11px] font-semibold text-white/90 backdrop-blur-sm">
            <Store size={14} aria-hidden="true" />
            Loja física no Centro de Presidente Prudente
          </div>

          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/75">
            {storeName}
          </p>
          <h1 className="mt-1 max-w-2xl font-serif text-3xl font-bold leading-tight">
            Nossa loja
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-white/88">
            Maquiagem, cosméticos, lash, nail, skincare e acessórios de beleza. Veja produtos e preços no catálogo, visite a loja ou fale com a equipe para confirmar estoque, retirada e entrega local.
          </p>

          <div className="mt-5 flex flex-wrap gap-2">
            <Link
              href="/categoria"
              className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-xs font-bold text-rosa-profundo shadow-sm transition hover:-translate-y-0.5"
            >
              <ShoppingBag size={16} aria-hidden="true" />
              Ver produtos
            </Link>
            <WhatsAppLink
              href={whatsappHref}
              context="nossa_loja_hero"
              className="inline-flex items-center gap-2 rounded-xl border border-white/25 bg-white/10 px-4 py-2.5 text-xs font-bold text-white backdrop-blur-sm transition hover:bg-white/15"
            >
              <MessageCircle size={16} aria-hidden="true" />
              Falar no WhatsApp
            </WhatsAppLink>
          </div>
        </div>
      </section>

      <section className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-3" aria-label="Atalhos da loja">
        <LocationLink
          href={mapsUrl}
          className="flex items-center gap-3 rounded-2xl border border-rosa/10 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-creme text-rosa-profundo">
            <Navigation size={19} aria-hidden="true" />
          </span>
          <span>
            <span className="block text-sm font-bold text-texto">Como chegar</span>
            <span className="mt-0.5 block text-[11px] leading-relaxed text-cinza">Abrir rota no Google Maps</span>
          </span>
        </LocationLink>

        <WhatsAppLink
          href={whatsappHref}
          context="nossa_loja_atalho"
          className="flex items-center gap-3 rounded-2xl border border-rosa/10 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-creme text-rosa-profundo">
            <MessageCircle size={19} aria-hidden="true" />
          </span>
          <span>
            <span className="block text-sm font-bold text-texto">WhatsApp</span>
            <span className="mt-0.5 block text-[11px] leading-relaxed text-cinza">Confirme estoque e retirada</span>
          </span>
        </WhatsAppLink>

        <Link
          href="/categoria"
          className="flex items-center gap-3 rounded-2xl border border-rosa/10 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-creme text-rosa-profundo">
            <ShoppingBag size={19} aria-hidden="true" />
          </span>
          <span>
            <span className="block text-sm font-bold text-texto">Ver catálogo</span>
            <span className="mt-0.5 block text-[11px] leading-relaxed text-cinza">Produtos, preços e categorias</span>
          </span>
        </Link>
      </section>

      <section className="mb-5 overflow-hidden rounded-3xl border border-rosa/10 bg-white shadow-sm">
        <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="min-h-[300px] bg-creme lg:min-h-[390px]">
            <iframe
              title="Mapa da Sra Make Prudente"
              src={mapEmbedUrl}
              width="100%"
              height="100%"
              className="min-h-[300px] w-full border-0 lg:min-h-[390px]"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              allowFullScreen
            />
          </div>

          <div className="p-5 sm:p-6">
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-rosa-profundo">
              Visite a Sra Make
            </p>
            <h2 className="mt-1 font-serif text-xl font-bold text-texto">No Centro de Presidente Prudente</h2>
            <p className="mt-3 flex items-start gap-2 text-sm leading-relaxed text-cinza">
              <MapPin size={17} className="mt-0.5 shrink-0 text-rosa-profundo" aria-hidden="true" />
              <span>{address}</span>
            </p>
            <p className="mt-3 flex items-start gap-2 text-sm leading-relaxed text-cinza">
              <Clock3 size={17} className="mt-0.5 shrink-0 text-rosa-profundo" aria-hidden="true" />
              <span>{businessHours}</span>
            </p>

            <LocationLink
              href={mapsUrl}
              className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-rosa-profundo px-4 py-3 text-sm font-bold text-white shadow-sm transition hover:opacity-90"
            >
              <Navigation size={17} aria-hidden="true" />
              Como chegar
            </LocationLink>

            <p className="mt-3 text-[11px] leading-relaxed text-cinza">
              Para evitar deslocamento desnecessário, você pode confirmar a disponibilidade de um produto ou tom pelo WhatsApp antes de sair de casa.
            </p>
          </div>
        </div>
      </section>

      <section className="mb-5 rounded-3xl border border-roxo/10 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-creme text-rosa-profundo">
            <MapPin size={21} aria-hidden="true" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-rosa-profundo">Google</p>
            <h2 className="mt-1 font-serif text-lg font-bold text-texto">Estamos no Google</h2>
            <p className="mt-2 text-sm leading-relaxed text-cinza">
              Confira nossa localização, fotos e avaliações no Google. O perfil ajuda você a reconhecer o ponto e abrir a rota até a loja.
            </p>
            <LocationLink
              href={mapsUrl}
              className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-rosa-profundo underline decoration-rosa/30 underline-offset-4"
            >
              Ver no Google Maps
              <Navigation size={15} aria-hidden="true" />
            </LocationLink>
          </div>
        </div>
      </section>

      <section className="mb-5">
        <div className="mb-3">
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-rosa-profundo">Atendimento</p>
          <h2 className="mt-1 font-serif text-xl font-bold text-texto">Compre do jeito mais fácil para você</h2>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          {[
            {
              icon: Store,
              title: "Visite a loja",
              text: "Venha até o Centro de Presidente Prudente e conte com atendimento para encontrar o produto certo.",
            },
            {
              icon: PackageCheck,
              title: "Retire seu pedido",
              text: "Escolha pelo catálogo, confirme pelo WhatsApp e combine a retirada na loja.",
            },
            {
              icon: Truck,
              title: "99Entrega local",
              text: "Para Presidente Prudente, a equipe pode solicitar a 99Entrega depois de confirmar pedido e endereço.",
            },
          ].map((item) => (
            <article key={item.title} className="rounded-2xl border border-rosa/10 bg-white p-5 shadow-sm">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-creme text-rosa-profundo">
                <item.icon size={19} aria-hidden="true" />
              </div>
              <h3 className="mt-3 text-sm font-bold text-texto">{item.title}</h3>
              <p className="mt-1.5 text-xs leading-relaxed text-cinza">{item.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="mb-5 rounded-3xl border border-rosa/10 bg-creme p-5 sm:p-6">
        <div className="flex items-center gap-2">
          <Sparkles size={18} className="text-rosa-profundo" aria-hidden="true" />
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-rosa-profundo">Dicas da Sra Make</p>
        </div>
        <h2 className="mt-1 font-serif text-xl font-bold text-texto">Conteúdo para ajudar na escolha</h2>
        <p className="mt-2 text-sm leading-relaxed text-cinza">
          Guias rápidos sobre maquiagem, cílios e compras em Presidente Prudente, sempre conectando a informação aos produtos e ao atendimento da loja.
        </p>

        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
          {DICAS.slice(0, 3).map((item) => (
            <Link
              key={item.slug}
              href={`/dicas/${item.slug}`}
              className="rounded-2xl border border-rosa/10 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-rosa-profundo">
                {item.category}
              </p>
              <h3 className="mt-1.5 text-sm font-bold text-texto">{item.title}</h3>
              <p className="mt-1.5 text-xs leading-relaxed text-cinza">{item.excerpt}</p>
              <span className="mt-3 inline-block text-xs font-bold text-rosa-profundo">Ler dica →</span>
            </Link>
          ))}
        </div>

        <Link
          href="/dicas"
          className="mt-4 inline-flex items-center rounded-xl bg-white px-4 py-2.5 text-xs font-bold text-rosa-profundo shadow-sm"
        >
          Ver todas as dicas
        </Link>
      </section>

      <section className="mb-5 rounded-3xl border border-rosa/10 bg-white p-5 shadow-sm sm:p-6">
        <h2 className="font-serif text-xl font-bold text-texto">O que você encontra na Sra Make</h2>
        <p className="mt-2 text-sm leading-relaxed text-cinza">
          O catálogo reúne diferentes categorias de beleza e trabalho profissional. A disponibilidade muda conforme o estoque da loja.
        </p>
        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {[
            ["Maquiagem", "/categoria/maquiagem"],
            ["Lash Design", "/categoria/lash"],
            ["Nail Design", "/categoria/nail"],
            ["Cosméticos", "/categoria/cosmeticos"],
            ["Acessórios", "/categoria/acessorios"],
            ["Ver todas", "/categoria"],
          ].map(([label, href]) => (
            <Link
              key={href}
              href={href}
              className="rounded-xl border border-rosa/10 bg-creme px-3 py-3 text-center text-xs font-bold text-rosa-profundo transition hover:-translate-y-0.5 hover:bg-white hover:shadow-sm"
            >
              {label}
            </Link>
          ))}
        </div>
      </section>

      <section className="mb-5 grid grid-cols-1 gap-3 md:grid-cols-2">
        <InfoRow
          icon="whatsapp"
          title="WhatsApp"
          text={settings?.whatsapp ?? "(18) 99124-8713"}
          action={{ label: "Conversar", href: whatsappHref }}
          whatsapp
          trackKind="whatsapp"
        />

        <InfoRow
          icon="instagram"
          title="Instagram"
          text={instagram}
          action={{
            label: "Seguir",
            href: `https://instagram.com/${instagram.replace("@", "")}`,
          }}
        />

        {settings?.facebook && (
          <InfoRow
            icon="facebook"
            title="Facebook"
            text={settings.facebook}
            action={
              settings.facebook.startsWith("http")
                ? { label: "Acessar", href: settings.facebook }
                : undefined
            }
          />
        )}
      </section>

      <section className="mb-5 rounded-3xl border border-rosa/10 bg-white p-5 shadow-sm sm:p-6">
        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-rosa-profundo">Dúvidas frequentes</p>
        <h2 className="mt-1 font-serif text-xl font-bold text-texto">Antes de comprar ou visitar</h2>

        <div className="mt-4 divide-y divide-rosa/10">
          {FAQS.map((item) => (
            <details key={item.question} className="group py-3 first:pt-0 last:pb-0">
              <summary className="cursor-pointer list-none pr-6 text-sm font-bold text-texto marker:hidden">
                {item.question}
              </summary>
              <p className="mt-2 pr-3 text-xs leading-relaxed text-cinza">{item.answer}</p>
            </details>
          ))}
        </div>
      </section>

      <section
        className="overflow-hidden rounded-3xl p-6 text-white shadow-sm"
        style={{ background: "linear-gradient(135deg, #A6157A 0%, #6E1E8C 100%)" }}
      >
        <h2 className="font-serif text-xl font-bold">Quer comprar agora?</h2>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-white/85">
          Veja os produtos disponíveis ou fale com a Sra Make para confirmar estoque, retirada e entrega local.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link
            href="/categoria"
            className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-xs font-bold text-rosa-profundo"
          >
            <ShoppingBag size={16} aria-hidden="true" />
            Ver produtos
          </Link>
          <WhatsAppLink
            href={whatsappHref}
            context="nossa_loja_final"
            className="inline-flex items-center gap-2 rounded-xl border border-white/25 bg-white/10 px-4 py-2.5 text-xs font-bold text-white"
          >
            <MessageCircle size={16} aria-hidden="true" />
            Falar no WhatsApp
          </WhatsAppLink>
        </div>
      </section>
    </main>
  );
}
