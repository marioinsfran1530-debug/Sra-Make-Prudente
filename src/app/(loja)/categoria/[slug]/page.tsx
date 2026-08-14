export default function CategoriaPage({
  params,
}: {
  params: { slug: string };
}) {
  return (
    <main className="p-6">
      <h1 className="font-serif font-bold text-xl text-texto">
        Categoria: {params.slug}
      </h1>
      <p className="text-sm text-cinza mt-2">
        Fase 2 do plano: listar produtos desta categoria/subcategoria a
        partir de <code>GET /api/products?category={params.slug}</code>.
      </p>
    </main>
  );
}
