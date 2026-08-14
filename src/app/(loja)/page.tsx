export default function HomePage() {
  return (
    <main className="p-6">
      <div
        className="rounded-3xl p-6 text-white"
        style={{
          background:
            "linear-gradient(135deg, #E4127B 0%, #A6157A 55%, #6E1E8C 100%)",
        }}
      >
        <p className="text-xs font-semibold uppercase tracking-widest text-white/80 mb-2">
          Catálogo Sra Make
        </p>
        <h1 className="font-serif font-bold text-2xl leading-tight mb-2">
          Encontre o que você precisa na Sra Make.
        </h1>
        <p className="text-white/85 text-sm">
          Maquiagem, lash, nail e acessórios. Escolha pelo catálogo e
          confirme pelo WhatsApp.
        </p>
      </div>

      <div className="mt-6 rounded-2xl border border-dashed border-rosa/40 p-4 text-sm text-cinza">
        Fase 1 (Fundação) concluída — este é um placeholder. A Fase 2 do
        plano implementa categorias, busca, produtos e cards reais
        consumindo <code>/api/products</code> e <code>/api/categories</code>.
      </div>
    </main>
  );
}
