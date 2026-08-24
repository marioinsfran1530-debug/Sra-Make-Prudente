import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { MessageCircle } from "lucide-react";
import { getProductById } from "@/lib/data";
import { ProductGallery } from "@/components/ProductGallery";
import { ProductShareButton } from "@/components/ProductShareButton";
import { Badge, StockLabel } from "@/components/Badges";
import { AddToCartBox } from "@/components/AddToCartBox";
import { ProductViewTracker } from "@/components/ViewTrackers";
import { WhatsAppLink } from "@/components/TrackedLink";
import { money } from "@/lib/money";
import { waLink } from "@/lib/whatsapp";

export const revalidate = 60;

const SITE_URL = "https://www.sramakeprudente.com.br";
type ProductParams = Promise<{ id: string }>;

function jsonLd(data: Record<string, unknown>) {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

export async function generateMetadata({ params }: { params: ProductParams }): Promise<Metadata> {
  const { id } = await params;
  const product = await getProductById(id);
  if (!product) return {};

  const description =
    product.description?.trim() ||
    `${product.name} da ${product.brand} na Sra Make Prudente em Presidente Prudente/SP. Consulte disponibilidade e compre pelo catálogo.`;
  const canonical = `${SITE_URL}/produto/${product.id}`;
  const mainImage = product.images[0]?.url;
  const title = `${product.name} — ${product.brand}`;

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      title: product.name,
      description,
      url: canonical,
      type: "website",
      images: mainImage ? [{ url: mainImage, alt: product.name }] : undefined,
    },
    twitter: {
      card: mainImage ? "summary_large_image" : "summary",
      title,
      description,
      ...(mainImage ? { images: [mainImage] } : {}),
    },
  };
}

export default async function ProdutoPage({ params }: { params: ProductParams }) {
  const { id } = await params;
  const product = await getProductById(id);
  if (!product) notFound();

  const productUrl = `${SITE_URL}/produto/${product.id}`;
  const categoryUrl = `${SITE_URL}/categoria/${product.category.slug}`;
  const currentPrice = product.promoPrice ?? product.price;
  const availability = product.stock === "INDISPONIVEL" ? "https://schema.org/OutOfStock" : "https://schema.org/InStock";

  const productStructuredData = {
    "@context": "https://schema.org",
    "@type": "Product",
    "@id": `${productUrl}#product`,
    name: product.name,
    description: product.description?.trim() || `${product.name} da ${product.brand} disponível no catálogo da Sra Make Prudente.`,
    sku: product.sku ?? undefined,
    brand: { "@type": "Brand", name: product.brand },
    image: product.images.map((image) => image.url),
    category: product.category.name,
    url: productUrl,
    offers: {
      "@type": "Offer",
      url: productUrl,
      priceCurrency: "BRL",
      price: currentPrice.toFixed(2),
      availability,
      itemCondition: "https://schema.org/NewCondition",
      seller: { "@id": `${SITE_URL}/#store` },
    },
  };

  const breadcrumbStructuredData = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Início", item: SITE_URL },
      { "@type": "ListItem", position: 2, name: product.category.name, item: categoryUrl },
      { "@type": "ListItem", position: 3, name: product.name, item: productUrl },
    ],
  };

  return (
    <main className="px-4 py-4 lg:px-6 lg:py-4">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(productStructuredData) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(breadcrumbStructuredData) }} />
      <ProductViewTracker
        productId={product.id}
        name={product.name}
        brand={product.brand}
        category={product.category.name}
        sku={product.sku}
        price={currentPrice}
      />
      <div className="mx-auto w-full max-w-6xl">
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[0.9fr_1.1fr] lg:gap-6 lg:items-start">
          <ProductGallery name={product.name} images={product.images} />
          <div className="rounded-3xl border border-rosa/10 bg-white p-5 lg:p-5">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-1">
                {product.isNew && <Badge tone="dourado">Novidade</Badge>}
                {product.bestSeller && <Badge tone="navy">Mais vendido</Badge>}
              </div>
              <ProductShareButton name={product.name} url={productUrl} />
            </div>
            <p className="text-xs font-semibold uppercase tracking-wide text-cinza">{product.brand}</p>
            <h1 className="font-serif font-bold text-2xl lg:text-2xl mt-1 mb-2 text-texto">{product.name}</h1>
            <div className="flex items-baseline gap-2 mb-3">
              {product.promoPrice ? (
                <><span className="text-2xl lg:text-2xl font-extrabold text-rosa-profundo">{money(product.promoPrice)}</span><span className="text-sm line-through text-cinza">{money(product.price)}</span></>
              ) : (
                <span className="text-2xl lg:text-2xl font-extrabold text-rosa-profundo">{money(product.price)}</span>
              )}
            </div>
            <StockLabel stock={product.stock} />
            {product.description && <p className="text-sm mt-3 leading-relaxed text-texto">{product.description}</p>}
            <div className="mt-4 border-t border-rosa/10 pt-4"><AddToCartBox product={product} /></div>
            <div className="mt-4 rounded-2xl p-3 bg-creme">
              <p className="text-xs font-bold mb-1 text-texto">Precisa de ajuda?</p>
              <p className="text-xs mb-3 text-cinza">Ficou em dúvida sobre qual escolher? Fale com a gente.</p>
              <WhatsAppLink
                href={waLink(`Oi! Tenho uma dúvida sobre o produto "${product.name}" do catálogo da Sra Make Prudente.`)}
                context="product_help"
                className="inline-flex items-center gap-1.5 text-xs font-bold px-4 py-2.5 rounded-xl text-white"
                style={{ backgroundColor: "#25D366" }}
              >
                <MessageCircle size={14} />
                Falar com a Sra Make no WhatsApp
              </WhatsAppLink>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
