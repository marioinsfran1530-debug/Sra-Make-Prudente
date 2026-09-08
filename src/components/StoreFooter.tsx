import Link from "next/link";
import { LocationLink } from "@/components/TrackedLink";

export function StoreFooter({
  storeName,
  cnpj,
  address,
  mapsUrl,
}: {
  storeName: string;
  cnpj: string;
  address: string;
  mapsUrl: string;
}) {
  return (
    <footer className="mx-4 mt-8 border-t border-rosa/10 px-1 py-6 text-center text-[11px] leading-5 text-cinza">
      <p className="font-semibold text-texto">{storeName}</p>
      <p>CNPJ {cnpj}</p>
      <p>{address}</p>
      <nav
        className="mt-3 flex flex-wrap justify-center gap-x-4 gap-y-1"
        aria-label="Informações e políticas da loja"
      >
        <LocationLink
          href={mapsUrl}
          className="font-semibold text-rosa-profundo underline underline-offset-2 transition-colors hover:text-texto"
        >
          Como chegar
        </LocationLink>
        <Link
          href="/loja"
          className="underline underline-offset-2 transition-colors hover:text-texto"
        >
          Endereço e horários
        </Link>
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
