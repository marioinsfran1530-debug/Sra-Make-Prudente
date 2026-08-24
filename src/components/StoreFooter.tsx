import Link from "next/link";

export function StoreFooter({
  storeName,
  cnpj,
}: {
  storeName: string;
  cnpj: string;
}) {
  return (
    <footer className="mx-4 mt-8 border-t border-rosa/10 px-1 py-6 text-center text-[11px] leading-5 text-cinza">
      <p className="font-semibold text-texto">{storeName}</p>
      <p>CNPJ {cnpj}</p>
      <p>Presidente Prudente/SP</p>
      <nav className="mt-3 flex flex-wrap justify-center gap-x-4 gap-y-1" aria-label="Políticas da loja">
        <Link
          href="/politica-de-trocas-e-devolucoes"
          className="underline underline-offset-2 transition-colors hover:text-texto"
        >
          Trocas e devoluções
        </Link>
      </nav>
    </footer>
  );
}
