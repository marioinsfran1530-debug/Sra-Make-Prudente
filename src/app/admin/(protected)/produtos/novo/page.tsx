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
  max-sm:[&_form_.input]:!py-1.5
  max-sm:[&_form_.input]:!text-[13px]
  max-sm:[&_form_textarea.input]:!h-[64px]
  max-sm:[&_form_textarea.input]:!min-h-[64px]
  max-sm:[&_form_p]:!leading-4
  max-sm:[&_form>p]:!text-[9px]
  max-sm:[&_form_summary]:!py-2
  max-sm:[&_form_summary]:!text-[11px]
`;

export default async function NovoProdutoPage() {
  const categories = await prisma.category.findMany({
    include: { subcategories: true },
    orderBy: { order: "asc" },
  });

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-3 sm:mb-4">
        <h1 className="font-serif text-xl font-bold text-texto">Novo produto</h1>
        <p className="mt-1 text-[11px] leading-4 text-cinza sm:text-xs sm:leading-5">
          Preencha os dados principais. Informações opcionais podem ser completadas depois sem impedir o cadastro.
        </p>
      </div>

      <div className={mobileFormDensity}>
        <ProductForm categories={categories} />
      </div>
    </div>
  );
}
