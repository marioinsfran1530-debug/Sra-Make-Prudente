import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { ProductForm } from "@/components/admin/ProductForm";

const mobileFormDensity = `
  max-sm:[&_form]:!gap-1.5
  max-sm:[&_form_label]:!gap-0.5
  max-sm:[&_form_label>span]:!text-[10px]
  max-sm:[&_form_label>span]:!leading-4
  max-sm:[&_form_.input]:!min-h-[42px]
  max-sm:[&_form_.input]:!rounded-lg
  max-sm:[&_form_.input]:!px-2.5
  max-sm:[&_form_input.input.tabular-nums]:!pl-[42px]
  max-sm:[&_form_.input]:!py-1.5
  max-sm:[&_form_.input]:!text-[13px]
  max-sm:[&_form_textarea.input]:!h-[64px]
  max-sm:[&_form_textarea.input]:!min-h-[64px]
  max-sm:[&_form_p]:!leading-4
  max-sm:[&_form>p]:!text-[9px]
  max-sm:[&_form_summary]:!py-2
  max-sm:[&_form_summary]:!text-[11px]
`;

export default async function EditarProdutoPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ buscar?: string }>;
}) {
  const { id } = await params;
  const queryParams = searchParams ? await searchParams : undefined;
  const search = queryParams?.buscar?.trim() ?? "";

  const [product, categories, searchResults] = await Promise.all([
    prisma.product.findUnique({
      where: { id },
      include: {
        categories: true,
        variants: true,
        images: { orderBy: { order: "asc" } },
      },
    }),
    prisma.category.findMany({
      include: { subcategories: true },
      orderBy: { order: "asc" },
    }),
    search
      ? prisma.product.findMany({
          where: {
            id: { not: id },
            OR: [
              { name: { contains: search, mode: "insensitive" } },
              { brand: { contains: search, mode: "insensitive" } },
              { sku: { contains: search, mode: "insensitive" } },
            ],
          },
          select: {
            id: true,
            name: true,
            brand: true,
            sku: true,
            active: true,
          },
          orderBy: { name: "asc" },
          take: 8,
        })
      : Promise.resolve([]),
  ]);

  if (!product) notFound();

  const categoryIds = Array.from(
    new Set([product.categoryId, ...product.categories.map((item) => item.categoryId)])
  );

  return (
    <div>
      <h1 className="mb-3 font-serif text-xl font-bold text-texto sm:mb-4">Editar produto</h1>

      <section className="mb-4 max-w-lg rounded-2xl border border-rosa/10 bg-white p-3 shadow-sm sm:p-4">
        <div className="mb-2">
          <h2 className="text-sm font-bold text-texto">Buscar outro produto</h2>
          <p className="mt-0.5 text-[10px] leading-4 text-cinza">
            Procure por nome, marca ou código e abra o próximo produto sem voltar para a lista.
          </p>
        </div>

        <form action={`/admin/produtos/${product.id}`} method="get" className="flex gap-2">
          <input
            type="search"
            name="buscar"
            defaultValue={search}
            placeholder="Ex.: batom, Ruby Rose ou EAN/SKU"
            className="input min-w-0 flex-1"
            autoComplete="off"
          />
          <button
            type="submit"
            className="shrink-0 rounded-xl bg-rosa-profundo px-4 py-2 text-xs font-bold text-white transition hover:opacity-90"
          >
            Buscar
          </button>
        </form>

        {search && (
          <div className="mt-3">
            {searchResults.length > 0 ? (
              <div className="overflow-hidden rounded-xl border border-rosa/10">
                {searchResults.map((item) => (
                  <Link
                    key={item.id}
                    href={`/admin/produtos/${item.id}`}
                    className="flex items-center justify-between gap-3 border-b border-rosa/10 bg-white px-3 py-2.5 text-left last:border-b-0 hover:bg-creme/60"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-xs font-bold text-texto">{item.name}</span>
                      <span className="mt-0.5 block truncate text-[10px] text-cinza">
                        {item.brand}
                        {item.sku ? ` · ${item.sku}` : ""}
                      </span>
                    </span>
                    <span className="shrink-0 text-[10px] font-bold text-rosa-profundo">
                      {item.active ? "Editar →" : "Inativo · Editar →"}
                    </span>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="rounded-xl bg-creme px-3 py-2 text-[11px] text-cinza">
                Nenhum outro produto encontrado para “{search}”.
              </p>
            )}
          </div>
        )}
      </section>

      <div className={mobileFormDensity}>
        <ProductForm
          categories={categories}
          initial={{
            id: product.id,
            name: product.name,
            brand: product.brand,
            sku: product.sku,
            description: product.description,
            price: Number(product.price),
            promoPrice: product.promoPrice ? Number(product.promoPrice) : null,
            costPrice: product.costPrice === null ? null : Number(product.costPrice),
            stockQty: product.stockQty,
            featured: product.featured,
            isNew: product.isNew,
            bestSeller: product.bestSeller,
            active: product.active,
            categoryId: product.categoryId,
            categoryIds,
            subcategoryId: product.subcategoryId,
            variants: product.variants.map((v) => ({ id: v.id, name: v.name, stockQty: v.stockQty })),
            images: product.images.map((image) => ({
              id: image.id,
              url: image.url,
              storagePath: image.storagePath,
              order: image.order,
            })),
          }}
        />
      </div>
    </div>
  );
}
