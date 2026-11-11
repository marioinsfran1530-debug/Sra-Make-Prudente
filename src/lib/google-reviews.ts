// Avaliações reais do Perfil da Empresa no Google, copiadas como estão (sem editar
// o texto). O site não tem acesso à API do Google, então este arquivo é uma foto
// de uma data: para atualizar, é só buscar de novo e trocar a lista e o resumo.
//
// Não gerar JSON-LD de AggregateRating/Review a partir disto: o Google ignora
// avaliações da própria loja marcadas no próprio site. Aqui é só prova social visual.

export type GoogleReview = {
  author: string;
  date: string; // AAAA-MM-DD
  stars: 5;
  text: string;
};

export const GOOGLE_REVIEWS_SNAPSHOT = {
  snapshotDate: "2026-11-11",
  rating: 5,
  total: 18,
  mapsUrl: "https://maps.google.com/maps?cid=7900202243123754206",
  writeReviewUrl: "https://search.google.com/local/writereview?placeid=ChIJ2S8nAaX1k5QR3rQiQxUoo20",
} as const;

// Só as avaliações que têm texto, da mais recente para a mais antiga.
export const GOOGLE_REVIEWS: readonly GoogleReview[] = [
  {
    author: "Gilmara Salgueiro",
    date: "2026-10-31",
    stars: 5,
    text: "Maravilhoso atendimento entrega rápida nota 1000 obrigado Deus abençoe 🙏🏻👏🏻👏🏻👏🏻👏🏻👏🏻💜",
  },
  {
    author: "Thaynara Oliveira Pereira",
    date: "2026-10-26",
    stars: 5,
    text: "Excelente atendimento, bem atenciosa, ótimos produtos ❤️❤️",
  },
  {
    author: "Samara Zalobnicki",
    date: "2026-10-15",
    stars: 5,
    text: "Produto de qualidade, maravilhoso atendimento",
  },
  {
    author: "Jennifer Camilly",
    date: "2026-10-07",
    stars: 5,
    text: "Bom atendimento",
  },
  {
    author: "Franciele Spolador",
    date: "2026-10-03",
    stars: 5,
    text: "Atenciosa.\nProdutos ótimos",
  },
  {
    author: "Cintia Pacheco",
    date: "2026-09-25",
    stars: 5,
    text: "Loja maravilhosa,ótimo atendimento e diversos produtos❤️❤️",
  },
  {
    author: "Aline Luz",
    date: "2026-09-19",
    stars: 5,
    text: "Loja maravilhosa e atendimento espetacular 🥰",
  },
  {
    author: "Juliane Mendes",
    date: "2026-09-18",
    stars: 5,
    text: "Vendedora simpática de mais, atendimento rápido, amei tudo. Parabéns pela simpatia e atendimento",
  },
  {
    author: "Emely Lorente",
    date: "2026-09-11",
    stars: 5,
    text: "Super atenciosa, amei os produtos da loja e os preços são bem acessíveis",
  },
  {
    author: "Fatima Lozzi",
    date: "2026-09-11",
    stars: 5,
    text: "Atendimento nota 1000\nSuper simpática e prestativa\nPreços ótimos\nMuito capricho",
  },
  {
    author: "Weslley Malícia",
    date: "2026-08-30",
    stars: 5,
    text: "Produtos de ótima qualidade 👏🏻👏🏻👏🏻👏🏻👏🏻\nEu recomendo",
  },
];

export function formatRating(rating: number): string {
  return rating.toFixed(1).replace(".", ",");
}

// "31 out 2026" — formato curto, sem depender de Intl no servidor.
const MONTHS = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
export function formatReviewDate(isoDate: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate);
  if (!match) return "";
  const month = Number(match[2]);
  if (month < 1 || month > 12) return "";
  return `${Number(match[3])} ${MONTHS[month - 1]} ${match[1]}`;
}

export function pluralReviews(total: number): string {
  return `${total} ${total === 1 ? "avaliação" : "avaliações"}`;
}
