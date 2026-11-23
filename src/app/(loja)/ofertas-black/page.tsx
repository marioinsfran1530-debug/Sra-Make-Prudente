import type { Metadata } from "next";
import Link from "next/link";
import { MessageCircle, Search, Truck } from "lucide-react";
import { BlackFridayCountdown } from "@/components/BlackFridayCountdown";
import { ProductCard } from "@/components/ProductCard";
import { WhatsAppLink } from "@/components/TrackedLink";
import {
  BLACK_FRIDAY_ENDS_AT,
  BLACK_FRIDAY_ENDS_LABEL,
  BLACK_FRIDAY_PATH,
  discountPercent,
  isBlackFridayActive,
  splitBlackOffers,
} from "@/lib/black-friday";
import { getProducts, getStoreSettings, type PublicProduct } from "@/lib/data";
import { resolveStoreLocation } from "@/lib/store-location";
import { waLink } from "@/lib/whatsapp";

const SITE_URL = "https://www.sramakeprudente.com.br";

// A página lê os preços promocionais direto do ADM, então fica sempre atual.
export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Black Friday",
  description:
    "Ofertas de Black Friday da Sra Make Prudente: combos e produtos com preço especial em maquiagem, lash, nail e acessórios. Escolha no catálogo e confirme pelo WhatsApp.",
  alternates: { canonical: `${SITE_URL}${BLACK_FRIDAY_PATH}` },
};

function OfferGrid({ products }: { products: PublicProduct[] }) {
  return (
    <div className="grid grid-cols-2 gap-4 px-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
      {products.map((product) => {
        const percent = discountPercent(product);

        return (
          <div key={product.id} className="relative h-full">
            {percent > 0 && (
              <span
                className="absolute left-2 top-2 z-10 rounded-full px-2 py-0.5 text-[11px] font-extrabold text-white shadow"
                style={{ backgroundColor: "#E11D2E" }}
              >
                -{percent}%
              </span>
            )}
            <ProductCard product={product} />
          </div>
        );
      })}
    </div>
  );
}

export default async function BlackFridayPage() {
  const [products, settings] = await Promise.all([
    getProducts(),
    getStoreSettings(),
  ]);

  const active = isBlackFridayActive();
  const location = resolveStoreLocation(settings);

  const sellable = products.filter((product) => product.stock !== "INDISPONIVEL");
  const { combos, offers } = splitBlackOffers(sellable);
  const hasProducts = combos.length + offers.length > 0;

  const helpHref = waLink(
    "Oi! Vim pela página da Black Friday da Sra Make Prudente e quero ajuda para escolher.",
    location.whatsapp,
  );

  return (
    <main>
      <div className="pt-0 md:px-4 md:pt-4">
        <section
          className="px-4 py-8 text-center text-white md:rounded-3xl md:py-12"
          style={{
            background:
              "linear-gradient(135deg, #131B33 0%, #4A1250 55%, #A6157A 100%)",
          }}
        >
          <p
            className="text-[11px] font-extrabold uppercase tracking-[0.2em]"
            style={{ color: "#C9972E" }}
          >
            Black Friday
          </p>

          <h1 className="mx-auto mt-2 max-w-xl font-serif text-2xl font-bold leading-tight sm:text-3xl">
            {active
              ? "Ofertas Black da Sra Make"
              : "A Black Friday da Sra Make terminou"}
          </h1>

          <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-white/85">
            {active
              ? `Combos e preços especiais até ${BLACK_FRIDAY_ENDS_LABEL}, ou enquanto durar o estoque.`
              : "Obrigada por comprar com a gente. Veja o catálogo completo e fale com a loja pelo WhatsApp."}
          </p>

          {active && (
            <BlackFridayCountdown
              endsAt={BLACK_FRIDAY_ENDS_AT}
              className="mt-4 justify-center"
            />
          )}

          <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
            <Link
              href="/categoria"
              className="rounded-full bg-white px-5 py-2.5 text-sm font-bold text-rosa-profundo"
            >
              Ver todos os produtos
            </Link>
            <WhatsAppLink
              href={helpHref}
              context="black_friday_hero"
              className="inline-flex items-center gap-1.5 rounded-full border border-white/70 px-5 py-2.5 text-sm font-bold text-white"
            >
              <MessageCircle size={15} /> Falar no WhatsApp
            </WhatsAppLink>
          </div>
        </section>
      </div>

      {active && combos.length > 0 && (
        <section className="mt-8">
          <h2 className="px-4 font-serif text-lg font-bold text-texto">
            Combos Black
          </h2>
          <p className="mb-3 px-4 text-xs text-cinza">
            Produtos juntos por um preço melhor.
          </p>
          <OfferGrid products={combos} />
        </section>
      )}

      {active && offers.length > 0 && (
        <section className="mt-8">
          <h2 className="px-4 font-serif text-lg font-bold text-texto">
            Produtos em oferta
          </h2>
          <p className="mb-3 px-4 text-xs text-cinza">
            Do maior desconto para o menor.
          </p>
          <OfferGrid products={offers} />
        </section>
      )}

      {active && !hasProducts && (
        <section className="mx-4 mt-8 rounded-2xl border border-rosa/15 bg-white p-6 text-center">
          <p className="font-serif text-base font-bold text-texto">
            As ofertas estão sendo separadas.
          </p>
          <p className="mx-auto mt-1 max-w-sm text-xs leading-relaxed text-cinza">
            Volte em instantes ou chame a gente no WhatsApp para saber o que
            está com preço especial.
          </p>
          <WhatsAppLink
            href={helpHref}
            context="black_friday_empty"
            className="mt-4 inline-flex items-center gap-1.5 rounded-full px-5 py-2.5 text-sm font-bold text-white"
            style={{ backgroundColor: "#25D366" }}
          >
            <MessageCircle size={15} /> Perguntar no WhatsApp
          </WhatsAppLink>
        </section>
      )}

      <section className="mx-4 mt-8 grid grid-cols-3 gap-3">
        {[
          { icon: Search, text: "Você escolhe no catálogo" },
          { icon: MessageCircle, text: "A gente confirma no WhatsApp" },
          { icon: Truck, text: "Você recebe ou retira" },
        ].map((step) => (
          <div
            key={step.text}
            className="rounded-2xl bg-white p-3 text-center shadow-sm"
          >
            <step.icon size={20} className="mx-auto mb-1 text-rosa-profundo" />
            <p className="text-[11px] font-semibold leading-snug text-texto">
              {step.text}
            </p>
          </div>
        ))}
      </section>
    </main>
  );
}
