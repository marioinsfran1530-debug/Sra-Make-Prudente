import { Star } from "lucide-react";
import {
  formatRating,
  formatReviewDate,
  GOOGLE_REVIEWS,
  GOOGLE_REVIEWS_SNAPSHOT,
  pluralReviews,
} from "@/lib/google-reviews";

function Stars({ size = 14 }: { size?: number }) {
  return (
    <span className="inline-flex gap-0.5 text-[#E8A317]" aria-hidden="true">
      {[0, 1, 2, 3, 4].map((index) => (
        <Star key={index} size={size} fill="currentColor" strokeWidth={0} />
      ))}
    </span>
  );
}

// Avaliações reais do Google (foto de uma data, ver src/lib/google-reviews.ts).
export function GoogleReviews() {
  const { rating, total, mapsUrl, writeReviewUrl } = GOOGLE_REVIEWS_SNAPSHOT;
  if (GOOGLE_REVIEWS.length === 0) return null;

  return (
    <section className="mt-8" aria-labelledby="google-reviews-title">
      <div className="mb-3 flex items-end justify-between gap-3 px-4">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-rosa-profundo">
            Quem já comprou
          </p>
          <h2 id="google-reviews-title" className="mt-0.5 font-serif text-lg font-bold text-texto">
            O que dizem no Google
          </h2>
          <p className="mt-1 flex items-center gap-1.5 text-xs text-cinza">
            <span className="font-extrabold text-texto">{formatRating(rating)}</span>
            <Stars size={13} />
            <span>
              · {pluralReviews(total)}
              <span className="sr-only"> com nota média {formatRating(rating)} de 5</span>
            </span>
          </p>
        </div>
        <a
          href={mapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 rounded-full border border-rosa/15 bg-white px-3 py-1.5 text-xs font-bold text-rosa-profundo shadow-sm transition hover:bg-rosa/5 hover:shadow-md"
        >
          Ver no Google →
        </a>
      </div>

      <ul className="flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {GOOGLE_REVIEWS.map((review) => (
          <li
            key={`${review.author}-${review.date}`}
            className="flex w-[78%] max-w-[300px] shrink-0 snap-start flex-col rounded-3xl border border-rosa/10 bg-white p-4 shadow-sm sm:w-[280px]"
          >
            <Stars />
            <p className="mt-2 flex-1 whitespace-pre-line text-[13px] leading-relaxed text-texto">
              {review.text}
            </p>
            <p className="mt-3 text-[11px] font-bold text-texto">{review.author}</p>
            <p className="text-[10px] text-cinza">{formatReviewDate(review.date)} · Google</p>
          </li>
        ))}
      </ul>

      <p className="mt-2 px-4 text-[11px] text-cinza">
        Já comprou com a gente?{" "}
        <a
          href={writeReviewUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="font-bold text-rosa-profundo underline-offset-2 hover:underline"
        >
          Deixe sua avaliação
        </a>
        .
      </p>
    </section>
  );
}
