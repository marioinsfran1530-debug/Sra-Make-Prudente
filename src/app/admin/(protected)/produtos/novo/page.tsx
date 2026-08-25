import { prisma } from "@/lib/prisma";
import { ProductForm } from "@/components/admin/ProductForm";

const mobileFormDensity = `
  max-sm:[&_form]:!gap-2
  max-sm:[&_form_label]:!gap-0.5
  max-sm:[&_form_.input]:!rounded-[10px]
  max-sm:[&_form_.input]:!px-2.5
  max-sm:[&_form_.input]:!py-2
  max-sm:[&_form_.input]:!text-[13px]
  max-sm:[&_form_textarea.input]:!h-[76px]
  max-sm:[&_form_textarea.input]:!min-h-[76px]
  max-sm:[&_form_p]:!leading-4
  max-sm:[&_form>p]:!text-[10px]
  max-sm:[&_form_summary]:!py-2.5
`;

export default async function NovoProdutoPage() {
  const categories = await prisma.category.findMany({
    include: { subcategories: true },
    orderBy: { order: "asc" },
  });

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-4">
        <h1 className="font-serif text-xl font-bold text-texto">Novo produto</h1>
        <p className="mt-1 text-xs leading-5 text-cinza">
          Preencha os dados principais. Informações opcionais podem ser completadas depois sem impedir o cadastro.
        </p>
      </div>

      <div className={mobileFormDensity}>
        <ProductForm categories={categories} />
      </div>
    </div>
  );
}
