import Link from "next/link";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type Severity = "critical" | "attention" | "optimization";
type IssueGroup = "duplicate" | "stock" | "content" | "seo" | "catalog";
type FilterKey = "all" | "critical" | "duplicate" | "stock" | "content" | "seo";

type Issue = {
  label: string;
  detail?: string;
  weight: number;
  severity: Severity;
  group: IssueGroup;
};

type AuditedProduct = {
  product: Awaited<ReturnType<typeof getProducts>>[number];
  issues: Issue[];
  score: number;
  duplicateCount: number;
};

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: "all", label: "Todos" },
  { key: "critical", label: "Críticos" },
  { key: "duplicate", label: "Duplicados" },
  { key: "stock", label: "Estoque" },
  { key: "content", label: "Conteúdo" },
  { key: "seo", label: "SEO e cadastro" },
];

const PROVISIONAL_CONTENT_PATTERNS = [
  /ser[aá] confirmad[oa]/i,
  /ser[aá] revisad[oa]/i,
  /antes da ativa[cç][aã]o/i,
  /revis[aã]o final/i,
  /pre[cç]o final/i,
  /conforme disponibilidade.*revis/i,
];

const SUSPECT_BRANDS = new Set([
  "sem marca",
  "na",
  "n a",
  "nao informado",
  "não informado",
  "variado",
  "variada",
  "kit",
  "mod",
  "produto",
  "rp",
  "cp",
  "ps",
  "dec",
  "pf",
  "tb",
  "p d",
  "cd",
  "kt",
  "ld",
  "ox",
  "ad",
  "cot",
  "paq",
  "pres",
  "bsrb",
]);

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

function normalizeText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9&]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function duplicateKey(product: Awaited<ReturnType<typeof getProducts>>[number]) {
  return [
    normalizeText(product.name),
    normalizeText(product.brand),
    Number(product.price).toFixed(2),
    product.categoryId,
  ].join("|");
}

function effectiveStock(product: Awaited<ReturnType<typeof getProducts>>[number]) {
  if (product.variants.length > 0) {
    return product.variants
      .filter((variant) => variant.active)
      .reduce((sum, variant) => sum + variant.stockQty, 0);
  }
  return product.stockQty;
}

function evaluateProduct(
  product: Awaited<ReturnType<typeof getProducts>>[number],
  duplicateCount: number
) {
  const issues: Issue[] = [];
  const name = product.name.trim();
  const brand = product.brand.trim();
  const normalizedBrand = normalizeText(brand);
  const description = product.description?.trim() ?? "";
  const price = Number(product.price);
  const promo = product.promoPrice ? Number(product.promoPrice) : null;
  const stock = effectiveStock(product);

  if (!Number.isFinite(price) || price <= 0) {
    issues.push({
      label: "Preço inválido",
      detail: "O preço normal precisa ser maior que zero.",
      weight: 30,
      severity: "critical",
      group: "catalog",
    });
  }

  if (promo !== null && (promo <= 0 || promo >= price)) {
    issues.push({
      label: "Promoção inconsistente",
      detail: "O preço promocional precisa ser positivo e menor que o preço normal.",
      weight: 20,
      severity: "critical",
      group: "catalog",
    });
  }

  if (
    product.stockQty < 0 ||
    product.variants.some((variant) => variant.stockQty < 0)
  ) {
    issues.push({
      label: "Estoque negativo",
      detail: "Há quantidade negativa no produto ou em uma variante.",
      weight: 30,
      severity: "critical",
      group: "stock",
    });
  }

  if (product.sku) {
    const compactSku = product.sku.replace(/\s/g, "");
    const looksLikeGtin = /^\d{8}$|^\d{12}$|^\d{13}$|^\d{14}$/.test(compactSku);
    if (looksLikeGtin && !isValidGtin(compactSku)) {
      issues.push({
        label: "EAN/GTIN inválido",
        detail: "O dígito verificador do código não confere.",
        weight: 25,
        severity: "critical",
        group: "catalog",
      });
    }
  }

  if (!product.images.length) {
    issues.push({
      label: "Sem imagem",
      detail: "Produto ativo sem foto para o catálogo.",
      weight: 30,
      severity: "critical",
      group: "content",
    });
  }

  if (duplicateCount > 1) {
    issues.push({
      label: `Possível duplicidade (${duplicateCount})`,
      detail: "Mesmo nome, marca, preço e categoria. Revise antes de excluir ou unificar.",
      weight: 18,
      severity: "attention",
      group: "duplicate",
    });
  }

  if (product.active && stock <= 0) {
    issues.push({
      label: "Ativo sem estoque",
      detail: product.variants.length
        ? "O produto possui variantes, mas nenhuma variante ativa tem saldo disponível."
        : "O item está publicado, mas não possui saldo disponível.",
      weight: 10,
      severity: "attention",
      group: "stock",
    });
  }

  if (!description) {
    issues.push({
      label: "Sem descrição",
      detail: "Cadastro sem texto útil para cliente e mecanismos de busca.",
      weight: 15,
      severity: "attention",
      group: "content",
    });
  } else {
    if (description.length < 50) {
      issues.push({
        label: "Descrição curta",
        detail: "Recomendamos pelo menos 50 caracteres de informação útil.",
        weight: 7,
        severity: "optimization",
        group: "content",
      });
    }
    if (PROVISIONAL_CONTENT_PATTERNS.some((pattern) => pattern.test(description))) {
      issues.push({
        label: "Conteúdo provisório",
        detail: "O texto indica que informações ainda precisam ser confirmadas ou revisadas.",
        weight: 18,
        severity: "attention",
        group: "content",
      });
    }
  }

  if (name.length < 8) {
    issues.push({
      label: "Nome pouco descritivo",
      detail: "O título pode não identificar bem o item em busca, Google e compartilhamentos.",
      weight: 8,
      severity: "optimization",
      group: "seo",
    });
  }

  if (product.name !== name) {
    issues.push({
      label: "Espaço extra no nome",
      detail: "Há espaço sobrando no início ou no fim do nome.",
      weight: 2,
      severity: "optimization",
      group: "seo",
    });
  }

  if (product.brand !== brand) {
    issues.push({
      label: "Espaço extra na marca",
      detail: "Há espaço sobrando no início ou no fim da marca.",
      weight: 2,
      severity: "optimization",
      group: "seo",
    });
  }

  if (!brand || SUSPECT_BRANDS.has(normalizedBrand)) {
    issues.push({
      label: "Marca suspeita ou genérica",
      detail: "Confirme a marca real do fabricante ou assuma explicitamente como genérico.",
      weight: 10,
      severity: "attention",
      group: "catalog",
    });
  }

  if (!product.sku) {
    issues.push({
      label: "Sem SKU/EAN",
      detail: "Não bloqueia a venda, mas dificulta identificação, integração e prevenção de duplicidade.",
      weight: 3,
      severity: "optimization",
      group: "seo",
    });
  }

  if (
    product.images.length > 0 &&
    product.images.some((image) => !image.alt?.trim())
  ) {
    issues.push({
      label: "Imagem sem texto ALT",
      detail: "Melhora acessibilidade e qualidade de indexação das imagens.",
      weight: 2,
      severity: "optimization",
      group: "seo",
    });
  }

  if (product.costPrice === null) {
    issues.push({
      label: "Sem custo cadastrado",
      detail: "O custo é necessário para margem, rentabilidade e decisões comerciais.",
      weight: 3,
      severity: "optimization",
      group: "catalog",
    });
  }

  if (!product.subcategoryId && product.category._count.subcategories > 0) {
    issues.push({
      label: "Sem subcategoria",
      detail: `A categoria possui ${product.category._count.subcategories} subcategoria(s). Revise o enquadramento.`,
      weight: 3,
      severity: "optimization",
      group: "catalog",
    });
  } else if (
    product.subcategory &&
    product.subcategory.categoryId !== product.categoryId
  ) {
    issues.push({
      label: "Subcategoria incompatível",
      detail: "A subcategoria pertence a uma categoria diferente da categoria principal.",
      weight: 25,
      severity: "critical",
      group: "catalog",
    });
  }

  const primaryCategoryMirrored = product.categories.some(
    (item) => item.categoryId === product.categoryId
  );
  if (!primaryCategoryMirrored) {
    issues.push({
      label: "Categoria principal não vinculada",
      detail: "A categoria principal não aparece na relação de múltiplas categorias.",
      weight: 25,
      severity: "critical",
      group: "catalog",
    });
  }

  const penalty = Math.min(
    100,
    issues.reduce((sum, issue) => sum + issue.weight, 0)
  );
  return { issues, score: 100 - penalty };
}

async function getProducts() {
  return prisma.product.findMany({
    include: {
      category: {
        select: {
          name: true,
          _count: { select: { subcategories: true } },
        },
      },
      subcategory: { select: { id: true, name: true, categoryId: true } },
      categories: { select: { categoryId: true } },
      images: { select: { id: true, alt: true } },
      variants: { select: { id: true, name: true, stockQty: true, active: true } },
    },
    orderBy: { updatedAt: "desc" },
  });
}

function matchesFilter(item: AuditedProduct, filter: FilterKey) {
  if (filter === "all") return true;
  if (filter === "critical") {
    return item.issues.some((issue) => issue.severity === "critical");
  }
  if (filter === "duplicate") {
    return item.issues.some((issue) => issue.group === "duplicate");
  }
  if (filter === "stock") {
    return item.issues.some((issue) => issue.group === "stock");
  }
  if (filter === "content") {
    return item.issues.some((issue) => issue.group === "content");
  }
  return item.issues.some((issue) => issue.group === "seo");
}

function severityRank(issue: Issue) {
  if (issue.severity === "critical") return 0;
  if (issue.severity === "attention") return 1;
  return 2;
}

function issueClass(severity: Severity) {
  if (severity === "critical") {
    return "border-red-100 bg-red-50 text-red-700";
  }
  if (severity === "attention") {
    return "border-amber-100 bg-amber-50 text-amber-800";
  }
  return "border-sky-100 bg-sky-50 text-sky-700";
}

export default async function ProductQualityPage({
  searchParams,
}: {
  searchParams: Promise<{ filtro?: string | string[] }>;
}) {
  const params = await searchParams;
  const rawFilter = Array.isArray(params.filtro) ? params.filtro[0] : params.filtro;
  const filter: FilterKey = FILTERS.some((item) => item.key === rawFilter)
    ? (rawFilter as FilterKey)
    : "all";

  const products = await getProducts();
  const duplicateCounts = new Map<string, number>();

  for (const product of products) {
    const key = duplicateKey(product);
    duplicateCounts.set(key, (duplicateCounts.get(key) ?? 0) + 1);
  }

  const audited: AuditedProduct[] = products.map((product) => {
    const duplicateCount = duplicateCounts.get(duplicateKey(product)) ?? 1;
    return {
      product,
      duplicateCount,
      ...evaluateProduct(product, duplicateCount),
    };
  });

  const excellent = audited.filter(
    (item) =>
      item.score >= 90 &&
      item.issues.every((issue) => issue.severity === "optimization")
  ).length;
  const critical = audited.filter((item) =>
    item.issues.some((issue) => issue.severity === "critical")
  ).length;
  const attention = audited.filter(
    (item) =>
      !item.issues.some((issue) => issue.severity === "critical") &&
      item.issues.some((issue) => issue.severity === "attention")
  ).length;
  const optimization = audited.filter(
    (item) =>
      item.issues.length > 0 &&
      item.issues.every((issue) => issue.severity === "optimization")
  ).length;
  const duplicateProducts = audited.filter(
    (item) => item.duplicateCount > 1
  ).length;
  const duplicateGroups = [...duplicateCounts.values()].filter(
    (count) => count > 1
  ).length;
  const descriptionIssues = audited.filter((item) =>
    item.issues.some(
      (issue) => issue.label === "Sem descrição" || issue.label === "Descrição curta"
    )
  ).length;

  const visible = audited
    .filter((item) => matchesFilter(item, filter))
    .sort((a, b) => {
      const aCritical = a.issues.some((issue) => issue.severity === "critical")
        ? 0
        : 1;
      const bCritical = b.issues.some((issue) => issue.severity === "critical")
        ? 0
        : 1;
      const aAttention = a.issues.some((issue) => issue.severity === "attention")
        ? 0
        : 1;
      const bAttention = b.issues.some((issue) => issue.severity === "attention")
        ? 0
        : 1;
      return (
        aCritical - bCritical ||
        aAttention - bAttention ||
        a.score - b.score ||
        a.product.name.localeCompare(b.product.name)
      );
    });

  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-rosa-profundo">
            Análise · Qualidade de dados
          </p>
          <h1 className="font-serif text-2xl font-bold text-texto">
            Auditoria dos produtos
          </h1>
          <p className="mt-1 max-w-3xl text-sm text-cinza">
            Corrija primeiro o que ameaça a confiabilidade do catálogo. Alertas
            não alteram dados automaticamente.
          </p>
        </div>
        <Link
          href="/admin/analise"
          className="rounded-xl border border-rosa/20 bg-white px-4 py-2.5 text-center text-xs font-bold text-rosa-profundo"
        >
          Voltar para Análise
        </Link>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Card
          label="Erro crítico"
          value={critical}
          detail="corrigir primeiro"
          tone="danger"
        />
        <Card
          label="Precisa revisão"
          value={attention}
          detail="inconsistência ou dúvida"
          tone="warning"
        />
        <Card
          label="Só otimização"
          value={optimization}
          detail="SEO e completude"
          tone="info"
        />
        <Card
          label="Cadastro forte"
          value={excellent}
          detail="sem erro ou alerta relevante"
          tone="success"
        />
      </div>

      <div className="mb-5 grid gap-3 md:grid-cols-3">
        <InsightCard
          label="Possíveis duplicidades"
          value={`${duplicateGroups} grupos`}
          detail={`${duplicateProducts} produtos envolvidos. Sempre revise antes de excluir.`}
          href="/admin/analise/qualidade?filtro=duplicate"
        />
        <InsightCard
          label="Descrições para revisar"
          value={String(descriptionIssues)}
          detail="Produtos sem descrição útil ou com texto curto."
          href="/admin/analise/qualidade?filtro=content"
        />
        <InsightCard
          label="Regra de estoque"
          value="Variantes são a fonte"
          detail="Se houver variantes, somente os saldos das variantes ativas entram no estoque efetivo."
          href="/admin/analise/qualidade?filtro=stock"
        />
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {FILTERS.map((item) => {
          const active = filter === item.key;
          return (
            <Link
              key={item.key}
              href={
                item.key === "all"
                  ? "/admin/analise/qualidade"
                  : `/admin/analise/qualidade?filtro=${item.key}`
              }
              className={`rounded-full border px-3 py-2 text-xs font-bold transition ${
                active
                  ? "border-rosa-profundo bg-rosa-profundo text-white"
                  : "border-rosa/15 bg-white text-cinza hover:border-rosa/30 hover:text-texto"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </div>

      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="text-xs text-cinza">
          Exibindo <strong className="text-texto">{visible.length}</strong> de{" "}
          {audited.length} produtos.
        </p>
        <div className="hidden items-center gap-2 text-[10px] font-bold sm:flex">
          <Legend className="bg-red-50 text-red-700" label="Erro" />
          <Legend className="bg-amber-50 text-amber-800" label="Revisar" />
          <Legend className="bg-sky-50 text-sky-700" label="Otimizar" />
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-rosa/10 bg-white shadow-sm">
        <div className="hidden grid-cols-[minmax(220px,1.35fr)_90px_minmax(300px,1.8fr)_90px] gap-3 border-b border-rosa/10 bg-creme/60 px-4 py-3 text-[10px] font-bold uppercase tracking-wide text-cinza md:grid">
          <span>Produto</span>
          <span>Qualidade</span>
          <span>Pontos a corrigir</span>
          <span />
        </div>
        <div className="divide-y divide-rosa/10">
          {visible.length === 0 ? (
            <div className="px-5 py-12 text-center">
              <p className="text-sm font-bold text-texto">
                Nenhum produto neste filtro
              </p>
              <p className="mt-1 text-xs text-cinza">
                A auditoria não encontrou pendências deste tipo.
              </p>
            </div>
          ) : (
            visible.map(({ product, score, issues }) => {
              const orderedIssues = [...issues].sort(
                (a, b) => severityRank(a) - severityRank(b)
              );
              return (
                <div
                  key={product.id}
                  className="grid grid-cols-1 gap-3 px-4 py-4 md:grid-cols-[minmax(220px,1.35fr)_90px_minmax(300px,1.8fr)_90px] md:items-start"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-texto">
                      {product.name.trim()}
                    </p>
                    <p className="mt-0.5 text-[11px] text-cinza">
                      {product.brand.trim()} · {product.category.name}
                    </p>
                    <p className="mt-1 text-[10px] text-cinza">
                      Estoque efetivo: {effectiveStock(product)}
                      {product.subcategory
                        ? ` · ${product.subcategory.name}`
                        : product.category._count.subcategories > 0
                          ? " · sem subcategoria"
                          : " · categoria sem subcategorias"}
                    </p>
                  </div>

                  <div>
                    <span
                      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-extrabold ${
                        score >= 90
                          ? "bg-green-50 text-green-700"
                          : score >= 70
                            ? "bg-amber-50 text-amber-700"
                            : "bg-red-50 text-red-700"
                      }`}
                    >
                      {score}/100
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    {orderedIssues.length === 0 ? (
                      <span className="text-xs font-semibold text-green-700">
                        Cadastro completo
                      </span>
                    ) : (
                      orderedIssues.map((issue) => (
                        <div
                          key={`${issue.label}-${issue.group}`}
                          className={`rounded-xl border px-2.5 py-2 ${issueClass(
                            issue.severity
                          )}`}
                        >
                          <p className="text-[10px] font-extrabold">
                            {issue.label}
                          </p>
                          {issue.detail && (
                            <p className="mt-0.5 text-[10px] opacity-80">
                              {issue.detail}
                            </p>
                          )}
                        </div>
                      ))
                    )}
                  </div>

                  <Link
                    href={`/admin/produtos/${product.id}`}
                    className="rounded-lg border border-rosa/15 px-3 py-2 text-center text-xs font-bold text-rosa-profundo hover:bg-creme"
                  >
                    Corrigir
                  </Link>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

function Card({
  label,
  value,
  detail,
  tone,
}: {
  label: string;
  value: number;
  detail: string;
  tone: "danger" | "warning" | "info" | "success";
}) {
  const toneClass = {
    danger: "bg-red-50 text-red-700",
    warning: "bg-amber-50 text-amber-800",
    info: "bg-sky-50 text-sky-700",
    success: "bg-green-50 text-green-700",
  }[tone];

  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm">
      <p
        className={`inline-flex rounded-lg px-2 py-1 text-2xl font-extrabold ${toneClass}`}
      >
        {value}
      </p>
      <p className="mt-2 text-xs font-bold text-texto">{label}</p>
      <p className="mt-1 text-[10px] text-cinza">{detail}</p>
    </div>
  );
}

function InsightCard({
  label,
  value,
  detail,
  href,
}: {
  label: string;
  value: string;
  detail: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="rounded-2xl border border-rosa/10 bg-white p-4 shadow-sm hover:border-rosa/25"
    >
      <p className="text-[10px] font-bold uppercase tracking-wide text-cinza">
        {label}
      </p>
      <p className="mt-1 text-lg font-extrabold text-texto">{value}</p>
      <p className="mt-1 text-xs text-cinza">{detail}</p>
    </Link>
  );
}

function Legend({ className, label }: { className: string; label: string }) {
  return <span className={`rounded-full px-2 py-1 ${className}`}>{label}</span>;
}
