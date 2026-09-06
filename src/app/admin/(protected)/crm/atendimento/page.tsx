import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { sendProductWhatsAppAction } from "./actions";
import ProductPicker from "./ProductPicker";

export default async function AtendimentoRapidoPage({
  searchParams,
}: {
  searchParams?: Promise<{ cq?: string; customerId?: string }>;
}) {
  const params = searchParams ? await searchParams : undefined;
  const cq = (params?.cq || "").trim();

  const [customers, products, selectedCustomer] = await Promise.all([
    cq
      ? prisma.customer.findMany({
          where: {
            OR: [
              { name: { contains: cq, mode: "insensitive" } },
              { phone: { contains: cq.replace(/\D/g, "") } },
            ],
          },
          orderBy: { updatedAt: "desc" },
          take: 20,
          select: { id: true, name: true, phone: true },
        })
      : prisma.customer.findMany({
          orderBy: { updatedAt: "desc" },
          take: 15,
          select: { id: true, name: true, phone: true },
        }),
    prisma.product.findMany({
      where: { active: true },
      orderBy: [
        { stockQty: "desc" },
        { bestSeller: "desc" },
        { featured: "desc" },
        { name: "asc" },
      ],
      take: 1000,
      select: {
        id: true,
        name: true,
        brand: true,
        price: true,
        promoPrice: true,
        stockQty: true,
      },
    }),
    params?.customerId
      ? prisma.customer.findUnique({
          where: { id: params.customerId },
          select: { id: true, name: true, phone: true },
        })
      : Promise.resolve(null),
  ]);

  const productOptions = products.map((product) => ({
    id: product.id,
    name: product.name,
    brand: product.brand,
    price: Number(product.promoPrice ?? product.price),
    stockQty: product.stockQty,
  }));

  return (
    <div className="mx-auto max-w-5xl space-y-4 sm:space-y-5">
      <div>
        <p className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-rosa-profundo">CRM Sra Make</p>
        <h1 className="font-serif text-2xl font-bold text-texto">Atendimento rápido</h1>
        <p className="mt-1 text-xs leading-relaxed text-cinza">Registre a indicação antes de abrir o WhatsApp. Assim o contato entra no funil mesmo que a cliente ainda não compre.</p>
      </div>

      <section className="grid gap-3 lg:grid-cols-2">
        <form method="get" className="rounded-2xl border border-rosa/15 bg-white p-4 shadow-sm">
          <label className="text-xs font-extrabold text-texto">1. Localizar cliente</label>
          <div className="mt-2 flex gap-2">
            <input
              name="cq"
              defaultValue={cq}
              placeholder="Nome ou WhatsApp"
              className="min-w-0 flex-1 rounded-xl border border-rosa/20 px-3 py-3 text-base outline-none focus:border-rosa-profundo sm:text-sm"
            />
            <button className="shrink-0 rounded-xl border border-rosa/20 px-4 py-2.5 text-xs font-bold text-rosa-profundo">Buscar</button>
          </div>
          <div className="mt-3 max-h-52 space-y-1.5 overflow-y-auto overscroll-contain">
            {customers.map((customer) => (
              <Link
                key={customer.id}
                href={`/admin/crm/atendimento?customerId=${encodeURIComponent(customer.id)}${cq ? `&cq=${encodeURIComponent(cq)}` : ""}`}
                className={`block rounded-xl border px-3 py-3 text-xs ${
                  selectedCustomer?.id === customer.id
                    ? "border-rosa-profundo bg-rosa/5 text-rosa-profundo"
                    : "border-rosa/10 text-texto active:bg-creme"
                }`}
              >
                <span className="font-extrabold">{customer.name}</span>
                <span className="ml-2 text-[10px] text-cinza">{customer.phone}</span>
              </Link>
            ))}
            {customers.length === 0 && (
              <p className="py-4 text-center text-xs text-cinza">Nenhuma cliente encontrada. Você pode cadastrar uma nova abaixo.</p>
            )}
          </div>
        </form>

        <div className="rounded-2xl border border-rosa/15 bg-white p-4 shadow-sm">
          <p className="text-xs font-extrabold text-texto">2. Produto</p>
          <p className="mt-2 text-xs leading-relaxed text-cinza">A busca agora acontece direto na tela e não abre a lista nativa do celular.</p>
          <div className="mt-3 flex flex-wrap gap-2 text-[10px] font-bold text-cinza">
            <span className="rounded-full bg-creme px-2.5 py-1.5">{productOptions.length} produtos ativos</span>
            <span className="rounded-full bg-creme px-2.5 py-1.5">Busca por nome ou marca</span>
          </div>
        </div>
      </section>

      <form action={sendProductWhatsAppAction} className="rounded-2xl border border-rosa/15 bg-white p-4 shadow-sm sm:p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-extrabold text-texto">3. Registrar e abrir WhatsApp</h2>
            <p className="mt-1 text-[10px] text-cinza">A indicação ficará salva como oportunidade em “Produto indicado”.</p>
          </div>
          {selectedCustomer && (
            <span className="rounded-full bg-creme px-3 py-1.5 text-[10px] font-extrabold text-rosa-profundo">Cliente: {selectedCustomer.name}</span>
          )}
        </div>

        {selectedCustomer ? (
          <input type="hidden" name="customerId" value={selectedCustomer.id} />
        ) : (
          <div className="mb-4 grid gap-3 sm:grid-cols-2">
            <label className="text-xs font-bold text-texto">
              Nova cliente
              <input
                name="name"
                maxLength={120}
                placeholder="Nome"
                className="mt-1 w-full rounded-xl border border-rosa/20 px-3 py-3 text-base font-normal outline-none focus:border-rosa-profundo sm:text-sm"
              />
            </label>
            <label className="text-xs font-bold text-texto">
              WhatsApp
              <input
                name="phone"
                inputMode="tel"
                maxLength={30}
                placeholder="(18) 99999-9999"
                className="mt-1 w-full rounded-xl border border-rosa/20 px-3 py-3 text-base font-normal outline-none focus:border-rosa-profundo sm:text-sm"
              />
            </label>
          </div>
        )}

        <ProductPicker products={productOptions} />

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="text-xs font-bold text-texto">
            Origem
            <select name="source" defaultValue="whatsapp" className="mt-1 w-full rounded-xl border border-rosa/20 bg-white px-3 py-3 text-base font-normal outline-none sm:text-sm">
              <option value="whatsapp">WhatsApp</option>
              <option value="instagram">Instagram</option>
              <option value="google">Google</option>
              <option value="catalogo">Catálogo</option>
              <option value="indicacao">Indicação</option>
              <option value="loja_fisica">Loja física</option>
              <option value="facebook">Facebook</option>
              <option value="outro">Outro</option>
            </select>
          </label>
          <label className="text-xs font-bold text-texto">
            Lembrar novamente
            <select name="followUpDays" defaultValue="1" className="mt-1 w-full rounded-xl border border-rosa/20 bg-white px-3 py-3 text-base font-normal outline-none sm:text-sm">
              <option value="0">Não agendar</option>
              <option value="1">Amanhã</option>
              <option value="3">Em 3 dias</option>
              <option value="7">Em 7 dias</option>
              <option value="15">Em 15 dias</option>
              <option value="30">Em 30 dias</option>
            </select>
          </label>
        </div>

        <label className="mt-4 block text-xs font-bold text-texto">
          Observação
          <textarea
            name="notes"
            rows={2}
            maxLength={500}
            placeholder="Ex.: procura corretivo para olheira, tom médio..."
            className="mt-1 w-full resize-y rounded-xl border border-rosa/20 px-3 py-3 text-base font-normal outline-none focus:border-rosa-profundo sm:text-sm"
          />
        </label>

        <div className="mt-5 grid gap-2 sm:flex sm:justify-end">
          <Link href="/admin/crm/oportunidades" className="order-2 rounded-xl border border-rosa/20 px-4 py-3 text-center text-xs font-bold text-cinza sm:order-1">Cancelar</Link>
          <button className="order-1 rounded-xl bg-emerald-600 px-5 py-3 text-xs font-extrabold text-white sm:order-2">Registrar e abrir WhatsApp</button>
        </div>
      </form>
    </div>
  );
}
