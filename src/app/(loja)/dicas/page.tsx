import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BookOpen, MapPin, Sparkles } from "lucide-react";
import { DICAS } from "@/lib/dicas";

const SITE_URL = "https://www.sramakeprudente.com.br";
const PAGE_URL = `${SITE_URL}/dicas`;

export const metadata: Metadata = {
  title: "Dicas de maquiagem, cílios e beleza | Sra Make Prudente",
  description:
    "Dicas práticas de maquiagem, cílios, lash, cosméticos e compras em Presidente Prudente, com links para produtos da Sra Make.",
  alternates: { canonical: PAGE_URL },
  openGraph: {
    title: "Dicas da Sra Make Prudente",
    description:
      "Conteúdos práticos para escolher produtos de maquiagem, lash e beleza e comprar com mais segurança em Presidente Prudente.",
    url: PAGE_URL,
    type: "website",
  },
};

export default function DicasPage() {
  const collectionJsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "@id": `${PAGE_URL}#collection`,
    url: PAGE_URL,
    name: "Dicas da Sra Make Prudente",
    description:
      "Conteúdos sobre maquiagem, cílios, lash, cosméticos e compras em Presidente Prudente.",
    isPartOf: { "@id": `${SITE_URL}/#website` },
    provider: { "@id": `${SITE_URL}/#store` },
    inLanguage: "pt-BR",
  };

  const itemListJsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Dicas da Sra Make",
    itemListElement: DICAS.map((dica, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: dica.title,
      url: `${PAGE_URL}/${dica.slug}`,
    })),
  };

  return (
    <main className="px-4 pb-8 pt-4">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListJsonLd) }}
      />

      <section
        className="relative overflow-hidden rounded-3xl p-6 text-white shadow-sm"
        style={{ background: "linear-gradient(135deg, #E4127B 0%, #A6157A 58%, #6E1E8C 100%)" }}
      >
        <div className="absolute -right-10 -top-12 h-36 w-36 rounded-full bg-white/10" />
        <div className="relative">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-[11px] font-semibold text-white/90">
            <Sparkles size={14} aria-hidden="true" />
            Conteúdo útil para comprar melhor
          </div>
          <h1 className="mt-4 font-serif text-3xl font-bold">Dicas da Sra Make</h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-white/85">
            Guias curtos sobre maquiagem, cílios, beleza e compras em Presidente Prudente. O objetivo é ajudar você a escolher melhor e chegar mais rápido aos produtos certos.
          </p>
        </div>
      </section>

      <section className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {DICAS.map((dica) => (
          <article
            key={dica.slug}
            className="flex h-full flex-col rounded-3xl border border-rosa/10 bg-white p-5 shadow-sm"
          >
            <div className="flex items-center justify-between gap-3">
              <span className="rounded-full bg-creme px-3 py-1 text-[10px] font-bold uppercase tracking-[0.08em] text-rosa-profundo">
                {dica.category}
              </span>
              <span className="text-[10px] text-cinza">{dica.readTime}</span>
            </div>

            <h2 className="mt-4 font-serif text-xl font-bold leading-snug text-texto">
              {dica.title}
            </h2>
            <p className="mt-2 flex-1 text-sm leading-relaxed text-cinza">{dica.excerpt}</p>

            <Link
              href={`/dicas/${dica.slug}`}
              className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-rosa-profundo"
            >
              Ler dica
              <ArrowRight size={16} aria-hidden="true" />
            </Link>
          </article>
        ))}
      </section>

      <section className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2">
        <Link
          href="/categoria"
          className="flex items-center gap-3 rounded-2xl border border-rosa/10 bg-creme p-4 transition hover:bg-white hover:shadow-sm"
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-rosa-profundo">
            <BookOpen size={19} aria-hidden="true" />
          </span>
          <span>
            <span className="block text-sm font-bold text-texto">Ver produtos</span>
            <span className="mt-0.5 block text-xs text-cinza">Continue do conteúdo para o catálogo</span>
          </span>
        </Link>

        <Link
          href="/loja"
          className="flex items-center gap-3 rounded-2xl border border-rosa/10 bg-creme p-4 transition hover:bg-white hover:shadow-sm"
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-rosa-profundo">
            <MapPin size={19} aria-hidden="true" />
          </span>
          <span>
            <span className="block text-sm font-bold text-texto">Visite a Sra Make</span>
            <span className="mt-0.5 block text-xs text-cinza">Endereço, horário e Como chegar</span>
          </span>
        </Link>
      </section>
    </main>
  );
}
