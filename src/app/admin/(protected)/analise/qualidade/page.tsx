import Link from "next/link";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function onlyDigits(value: string) {
  return value.replace(/\D/g, "");
}

function isValidGtin(value: string) {
  const digits = onlyDigits(value);
  if (![8, 12, 13, 14].includes(digits.length)) return false;
  const numbers = digits.split("").map(Number);
  const checkDigit = numbers.pop();
  if (checkDigit === undefined) return false;
  let sum = 0;
  for (let i = numbers.length - 1, position = 0; i >= 0; i--, position++) {
    sum += numbers[i] * (position % 2 === 0 ? 3 : 1);
  }
  return (10 - (sum % 10)) % 10 === checkDigit;
}

type Issue = { label: string; weight: number; critical?: boolean };

function evaluateProduct(product: {
  name: string;
  brand: string;
  sku: string | null;
  description: string | null;
  price: { toString(): string };
  promoPrice: { toString(): string } | null;
  stockQty: number;
  active: boolean;
  images: { id: string }[];
  variants: { stockQty: number }[];
}) {
  const issues: Issue[] = [];
  const name = product.name.trim();
  const brand = product.brand.trim();
  const description = product.description?.trim() ?? "";
  const price = Number(product.price);
  const promo = product.promoPrice ? Number(product.promoPrice) : null;
  const effectiveStock = product.variants.length
    ? product.variants.reduce((sum, variant) => sum + variant.stockQty, 0)
    : product.stockQty;

  if (name.length < 8) issues.push({ label: "Nome muito curto", weight: 12 });
  if (!brand || /^(sem marca|n\/a|nao informado|não informado)$/i.test(brand)) {
    issues.push({ label: "Marca ausente ou genérica", weight: 12 });
  }
  if (!description) issues.push({ label: "Sem descrição", weight: 15 });
  else if (description.length < 50) issues.push({ label: "Descrição curta", weight: 7 });
  if (!product.images.length) issues.push({ label: "Sem imagem", weight: 22, critical: true });
  if (!product.sku) issues.push({ label: "Sem EAN/GTIN ou SKU", weight: 7 });
  else {
    const digits = onlyDigits(product.sku);
    if ([8, 12, 13, 14].includes(digits.length) && digits.length === product.sku.replace(/\s/g, "").length && !isValidGtin(product.sku)) {
      issues.push({ label: "EAN/GTIN inválido", weight: 14, critical: true });
    }
  }
  if (!Number.isFinite(price) || price <= 0) issues.push({ label: "Preço inválido", weight: 25, critical: true });
  if (promo !== null && (promo <= 0 || promo >= price)) {
    issues.push({ label: "Preço promocional inconsistente", weight: 12, critical: true });
  }
  if (product.active && effectiveStock <= 0) {
    issues.push({ label: "Ativo sem estoque", weight: 8 });
  }

  const penalty = Math.min(100, issues.reduce((sum, issue) => sum + issue.weight, 0));
  return { issues, score: 100 - penalty };
}

export default async function ProductQualityPage() {
  const products = await prisma.product.findMany({
    include: {
      category: { select: { name: true } },
      images: { select: { id: true } },
      variants: { where: { active: true }, select: { stockQty: true } },
    },
    orderBy: { updatedAt: "desc" },
  });

  const audited = products.map((product) => ({
    product,
    ...evaluateProduct(product),
  }));

  const excellent = audited.filter((item) => item.score >= 90).length;
  const attention = audited.filter((item) => item.score >= 70 && item.score < 90).length;
  const priority = audited.filter((item) => item.score < 70).length;
  const critical = audited.filter((item) => item.issues.some((issue) => issue.critical)).length;
  const sorted = [...audited].sort((a, b) => a.score - b.score || a.product.name.localeCompare(b.product.name));

  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-rosa-profundo">Análise · Qualidade de dados</p>
          <h1 className="font-serif text-2xl font-bold text-texto">Auditoria dos produtos</h1>
          <p className="mt-1 max-w-3xl text-sm text-cinza">
            Área de análise para priorizar cadastros que podem prejudicar Google, Merchant Center, busca interna e conversão. Nada é alterado automaticamente.
          </p>
        </div>
        <Link href="/admin/analise" className="rounded-xl border border-rosa/20 bg-white px-4 py-2.5 text-xs font-bold text-rosa-profundo">Voltar para Análise</Link>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Card label="Cadastro excelente" value={excellent} detail="90 a 100 pontos" />
        <Card label="Pode melhorar" value={attention} detail="70 a 89 pontos" />
        <Card label="Prioridade" value={priority} detail="abaixo de 70 pontos" />
        <Card label="Erro crítico" value={critical} detail="imagem, preço, promoção ou GTIN" danger={critical > 0} />
      </div>

      <div className="mb-5 rounded-2xl border border-rosa/10 bg-white p-4 shadow-sm">
        <p className="text-sm font-bold text-texto">Critérios usados pela auditoria</p>
        <div className="mt-3 grid gap-2 text-xs text-cinza md:grid-cols-2 xl:grid-cols-4">
          <p>• Nome claro e suficientemente descritivo.</p>
          <p>• Marca real e EAN/GTIN quando existir.</p>
          <p>• Descrição útil com pelo menos 50 caracteres.</p>
          <p>• Foto, preço, promoção e estoque consistentes.</p>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-rosa/10 bg-white shadow-sm">
        <div className="grid grid-cols-[minmax(220px,1.6fr)_110px_minmax(220px,1.4fr)_100px] gap-3 border-b border-rosa/10 bg-creme/60 px-4 py-3 text-[10px] font-bold uppercase tracking-wide text-cinza">
          <span>Produto</span><span>Qualidade</span><span>Pontos a corrigir</span><span />
        </div>
        <div className="divide-y divide-rosa/10">
          {sorted.map(({ product, score, issues }) => (
            <div key={product.id} className="grid grid-cols-1 gap-3 px-4 py-4 md:grid-cols-[minmax(220px,1.6fr)_110px_minmax(220px,1.4fr)_100px] md:items-center">
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-texto">{product.name}</p>
                <p className="mt-0.5 text-[11px] text-cinza">{product.brand} · {product.category.name}</p>
              </div>
              <div>
                <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-extrabold ${score >= 90 ? "bg-green-50 text-green-700" : score >= 70 ? "bg-amber-50 text-amber-700" : "bg-red-50 text-red-700"}`}>
                  {score}/100
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {issues.length === 0 ? (
                  <span className="text-xs font-semibold text-green-700">Cadastro completo</span>
                ) : issues.map((issue) => (
                  <span key={issue.label} className={`rounded-full px-2 py-1 text-[10px] font-bold ${issue.critical ? "bg-red-50 text-red-700" : "bg-amber-50 text-amber-700"}`}>
                    {issue.label}
                  </span>
                ))}
              </div>
              <Link href={`/admin/produtos/${product.id}`} className="text-xs font-bold text-rosa-profundo hover:underline">Corrigir →</Link>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Card({ label, value, detail, danger = false }: { label: string; value: number; detail: string; danger?: boolean }) {
  return <div className={`rounded-2xl p-4 shadow-sm ${danger ? "bg-red-50" : "bg-white"}`}><p className={`text-2xl font-extrabold ${danger ? "text-red-700" : "text-texto"}`}>{value}</p><p className="mt-1 text-xs font-bold text-texto">{label}</p><p className="mt-1 text-[10px] text-cinza">{detail}</p></div>;
}
