import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Clock3, MapPin } from "lucide-react";
import { notFound } from "next/navigation";
import { DICAS, getDica } from "@/lib/dicas";

const SITE_URL = "https://www.sramakeprudente.com.br";

type DicaParams = Promise<{ slug: string }>;

export function generateStaticParams() {
  return DICAS.map((dica) => ({ slug: dica.slug }));
}

export async function generateMetadata({ params }: { params: DicaParams }): Promise<Metadata> {
  const { slug } = await params;
  const dica = getDica(slug);
  if (!dica) return {};

  const canonicalUrl = `${SITE_URL}/dicas/${dica.slug}`;

  return {
    title: dica.title,
    description: dica.description,
    alternates: { canonical: canonicalUrl },
    openGraph: {
      title: dica.title,
      description: dica.description,
      url: canonicalUrl,
      type: "article",
      publishedTime: `${dica.publishedAt}T12:00:00-03:00`,
      modifiedTime: `${dica.updatedAt}T12:00:00-03:00`,
    },
  };
}

export default async function DicaPage({ params }: { params: DicaParams }) {
  const { slug } = await params;
  const dica = getDica(slug);
  if (!dica) notFound();

  const canonicalUrl = `${SITE_URL}/dicas/${dica.slug}`;

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Início", item: SITE_URL },
      { "@type": "ListItem", position: 2, name: "Dicas", item: `${SITE_URL}/dicas` },
      { "@type": "ListItem", position: 3, name: dica.title, item: canonicalUrl },
    ],
  };

  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    "@id": `${canonicalUrl}#article`,
    headline: dica.title,
    description: dica.description,
    datePublished: dica.publishedAt,
    dateModified: dica.updatedAt,
    inLanguage: "pt-BR",
    mainEntityOfPage: canonicalUrl,
    author: { "@id": `${SITE_URL}/#store` },
    publisher: { "@id": `${SITE_URL}/#store` },
    isPartOf: { "@id": `${SITE_URL}/#website` },
  };

  return (
    <main className="px-4 pb-8 pt-4">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }}
      />

      <article className="mx-auto max-w-3xl">
        <Link
          href="/dicas"
          className="inline-flex items-center gap-2 text-xs font-bold text-rosa-profundo"
        >
          <ArrowLeft size={15} aria-hidden="true" />
          Todas as dicas
        </Link>

        <header className="mt-4 rounded-3xl border border-rosa/10 bg-white p-5 shadow-sm sm:p-7">
          <div className="flex flex-wrap items-center gap-2 text-[10px] font-semibold text-cinza">
            <span className="rounded-full bg-creme px-3 py-1 font-bold uppercase tracking-[0.08em] text-rosa-profundo">
              {dica.category}
            </span>
            <span className="inline-flex items-center gap-1">
              <Clock3 size={13} aria-hidden="true" />
              {dica.readTime}
            </span>
          </div>

          <h1 className="mt-4 font-serif text-3xl font-bold leading-tight text-texto sm:text-4xl">
            {dica.title}
          </h1>
          <p className="mt-4 text-base leading-relaxed text-cinza">{dica.intro}</p>
        </header>

        <div className="mt-4 space-y-4">
          {dica.sections.map((section) => (
            <section
              key={section.heading}
              className="rounded-3xl border border-rosa/10 bg-white p-5 shadow-sm sm:p-6"
            >
              <h2 className="font-serif text-xl font-bold text-texto">{section.heading}</h2>

              {section.paragraphs?.map((paragraph) => (
                <p key={paragraph} className="mt-3 text-sm leading-7 text-cinza">
                  {paragraph}
                </p>
              ))}

              {section.bullets && (
                <ul className="mt-3 space-y-2 pl-5 text-sm leading-6 text-cinza">
                  {section.bullets.map((bullet) => (
                    <li key={bullet} className="list-disc pl-1">
                      {bullet}
                    </li>
                  ))}
                </ul>
              )}

              {section.links && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {section.links.map((link) => (
                    <Link
                      key={`${section.heading}-${link.href}`}
                      href={link.href}
                      className="inline-flex items-center gap-2 rounded-xl bg-creme px-4 py-2.5 text-xs font-bold text-rosa-profundo transition hover:bg-white hover:shadow-sm"
                    >
                      {link.label}
                      <ArrowRight size={14} aria-hidden="true" />
                    </Link>
                  ))}
                </div>
              )}
            </section>
          ))}
        </div>

        <section
          className="mt-4 overflow-hidden rounded-3xl p-6 text-white shadow-sm"
          style={{ background: "linear-gradient(135deg, #A6157A 0%, #6E1E8C 100%)" }}
        >
          <div className="flex items-start gap-3">
            <MapPin size={21} className="mt-0.5 shrink-0" aria-hidden="true" />
            <div>
              <h2 className="font-serif text-xl font-bold">Sra Make Prudente</h2>
              <p className="mt-2 text-sm leading-relaxed text-white/85">
                Consulte produtos no catálogo ou veja endereço, horário, retirada e entrega local na página Nossa loja.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Link
                  href="/categoria"
                  className="rounded-xl bg-white px-4 py-2.5 text-xs font-bold text-rosa-profundo"
                >
                  Ver produtos
                </Link>
                <Link
                  href="/loja"
                  className="rounded-xl border border-white/25 bg-white/10 px-4 py-2.5 text-xs font-bold text-white"
                >
                  Nossa loja
                </Link>
              </div>
            </div>
          </div>
        </section>
      </article>
    </main>
  );
}
