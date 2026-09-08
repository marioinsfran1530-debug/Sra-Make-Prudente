import Link from "next/link";
import { Clock3, MapPin, Navigation } from "lucide-react";
import { LocationLink } from "@/components/TrackedLink";

export function StoreLocationBar({
  address,
  businessHours,
  mapsUrl,
}: {
  address: string;
  businessHours: string;
  mapsUrl: string;
}) {
  return (
    <section className="mt-4 px-4" aria-labelledby="store-location-title">
      <div className="rounded-2xl border border-rosa/10 bg-white p-4 shadow-sm sm:flex sm:items-center sm:gap-4">
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-creme">
            <MapPin size={19} className="text-rosa-profundo" aria-hidden="true" />
          </div>

          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-rosa-profundo">
              Loja física no Centro
            </p>
            <h2 id="store-location-title" className="mt-0.5 text-sm font-bold text-texto">
              Sra Make Prudente
            </h2>
            <p className="mt-1 text-xs leading-relaxed text-cinza">{address}</p>
            <p className="mt-1 flex items-start gap-1.5 text-[11px] leading-relaxed text-cinza">
              <Clock3 size={13} className="mt-0.5 shrink-0" aria-hidden="true" />
              <span>{businessHours}</span>
            </p>
          </div>
        </div>

        <div className="mt-3 flex shrink-0 flex-wrap items-center gap-2 sm:mt-0 sm:flex-col sm:items-stretch">
          <LocationLink
            href={mapsUrl}
            className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl bg-rosa-profundo px-4 py-2.5 text-xs font-bold text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
          >
            <Navigation size={14} aria-hidden="true" /> Como chegar
          </LocationLink>
          <Link
            href="/loja"
            className="inline-flex min-h-11 items-center justify-center rounded-xl border border-rosa/15 bg-white px-4 py-2.5 text-xs font-bold text-rosa-profundo transition hover:bg-creme"
          >
            Ver informações da loja
          </Link>
        </div>
      </div>
    </section>
  );
}
