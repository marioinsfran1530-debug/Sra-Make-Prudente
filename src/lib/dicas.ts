export type DicaLink = {
  label: string;
  href: string;
};

export type DicaSection = {
  heading: string;
  paragraphs?: string[];
  bullets?: string[];
  links?: DicaLink[];
};

export type Dica = {
  slug: string;
  title: string;
  description: string;
  excerpt: string;
  category: string;
  readTime: string;
  publishedAt: string;
  updatedAt: string;
  intro: string;
  sections: DicaSection[];
};

export const DICAS: Dica[] = [
  {
    slug: "como-escolher-o-tom-de-base-e-corretivo",
    title: "Como escolher o tom de base e corretivo",
    description:
      "Veja como comparar subtom, cobertura e acabamento para escolher base e corretivo com mais segurança. Encontre opções na Sra Make Prudente.",
    excerpt:
      "Um guia simples para reduzir a chance de errar no tom e entender o que observar antes de comprar base ou corretivo.",
    category: "Maquiagem",
    readTime: "4 min",
    publishedAt: "2026-09-08",
    updatedAt: "2026-09-08",
    intro:
      "Escolher base e corretivo só pela cor da embalagem costuma gerar dúvida. O ideal é comparar tom, subtom, cobertura e acabamento para chegar a uma opção mais próxima do resultado que você procura.",
    sections: [
      {
        heading: "1. Comece pelo seu tom de pele",
        paragraphs: [
          "Observe se sua pele está mais próxima de tons claros, médios ou escuros. Essa primeira divisão reduz bastante as opções e facilita a comparação entre marcas.",
          "Sempre que possível, compare o produto com a região do rosto e pescoço em luz natural. A iluminação muito amarela ou muito branca pode alterar a percepção da cor.",
        ],
      },
      {
        heading: "2. Preste atenção ao subtom",
        paragraphs: [
          "Além da profundidade da cor, bases e corretivos podem puxar para subtom quente, frio ou neutro. Dois produtos com aparência parecida no frasco podem ficar diferentes na pele por causa disso.",
        ],
        bullets: [
          "Quente: costuma ter fundo mais amarelado ou dourado.",
          "Frio: tende a puxar mais para rosado.",
          "Neutro: fica entre os dois extremos.",
        ],
      },
      {
        heading: "3. Base e corretivo não precisam ter exatamente a mesma função",
        paragraphs: [
          "A base uniformiza a pele. O corretivo pode ser usado para cobrir pontos específicos ou iluminar determinadas áreas. Por isso, o tom do corretivo pode variar conforme o objetivo.",
          "Para cobertura de manchas e olheiras, normalmente vale buscar um corretivo próximo ao tom da pele. Para iluminar, algumas pessoas preferem um tom ligeiramente mais claro.",
        ],
      },
      {
        heading: "4. Compare cobertura e acabamento",
        bullets: [
          "Cobertura leve: resultado mais natural e construção em camadas.",
          "Cobertura média ou alta: maior uniformização com menos produto.",
          "Acabamento matte: aparência mais seca e controle de brilho.",
          "Acabamento luminoso: resultado com mais viço.",
        ],
      },
      {
        heading: "Veja opções disponíveis na Sra Make",
        paragraphs: [
          "O estoque de tons muda conforme a reposição. Antes de se deslocar, você pode consultar o catálogo ou chamar a equipe no WhatsApp para confirmar as opções disponíveis.",
        ],
        links: [
          { label: "Ver produtos de maquiagem", href: "/categoria/maquiagem" },
          { label: "Falar com a Sra Make", href: "/loja" },
        ],
      },
    ],
  },
  {
    slug: "cilios-tufinho-para-iniciantes",
    title: "Cílios tufinho para iniciantes: o que você precisa saber",
    description:
      "Entenda como escolher cílios tufinho, pinça e itens básicos para começar. Veja opções para lash na Sra Make Prudente.",
    excerpt:
      "Os principais pontos para quem está começando com cílios tufinho e quer montar um kit simples sem comprar itens desnecessários.",
    category: "Lash",
    readTime: "4 min",
    publishedAt: "2026-09-08",
    updatedAt: "2026-09-08",
    intro:
      "Cílios tufinho permitem criar efeitos diferentes conforme tamanho, curvatura, quantidade e posição de aplicação. Para quem está começando, o mais importante é entender os itens básicos antes de montar o kit.",
    sections: [
      {
        heading: "1. O que são cílios tufinho",
        paragraphs: [
          "São pequenos grupos de fios que podem ser aplicados em pontos específicos da linha dos cílios. Eles ajudam a construir volume e alongamento de forma gradual.",
        ],
      },
      {
        heading: "2. O que observar na hora de escolher",
        bullets: [
          "Comprimento: tamanhos menores tendem a gerar resultado mais discreto; maiores criam mais destaque.",
          "Espessura e quantidade de fios: influenciam diretamente no volume.",
          "Curvatura: muda a percepção de abertura do olhar.",
          "Conforto: bases muito pesadas podem incomodar mais em usos prolongados.",
        ],
      },
      {
        heading: "3. Itens básicos para começar",
        bullets: [
          "Cílios tufinho em tamanhos adequados ao efeito desejado.",
          "Pinça com boa precisão.",
          "Cola apropriada para o tipo de aplicação que será realizado.",
          "Higienização e organização dos materiais.",
        ],
      },
      {
        heading: "4. Evite comprar tudo de uma vez",
        paragraphs: [
          "Para iniciar, faz mais sentido testar poucos tamanhos e entender qual técnica e efeito você prefere. Depois disso, você consegue ampliar o kit com mais segurança e menos desperdício.",
        ],
      },
      {
        heading: "Encontre produtos para lash em Presidente Prudente",
        paragraphs: [
          "A Sra Make reúne cílios, pinças e outros itens de lash. Consulte o catálogo para ver o que está disponível no momento.",
        ],
        links: [
          { label: "Ver produtos de lash", href: "/categoria/lash" },
          { label: "Ver página de cílios tufinho", href: "/categoria/lash/cilios-tufinho" },
        ],
      },
    ],
  },
  {
    slug: "onde-comprar-maquiagem-no-centro-de-presidente-prudente",
    title: "Onde comprar maquiagem no Centro de Presidente Prudente",
    description:
      "Saiba onde encontrar maquiagem, cosméticos, lash, nail e acessórios no Centro de Presidente Prudente. Conheça a Sra Make Prudente.",
    excerpt:
      "Para quem procura maquiagem no Centro de Presidente Prudente, reunimos localização, tipos de produtos e formas de comprar na Sra Make.",
    category: "Presidente Prudente",
    readTime: "3 min",
    publishedAt: "2026-09-08",
    updatedAt: "2026-09-08",
    intro:
      "Quem procura maquiagem no Centro de Presidente Prudente pode combinar a praticidade da loja física com a consulta antecipada pelo catálogo. Assim, dá para verificar produtos e preços antes de sair de casa.",
    sections: [
      {
        heading: "Sra Make Prudente no Centro",
        paragraphs: [
          "A Sra Make Prudente fica na Av. Brasil, 373 — Box 202, Centro, Presidente Prudente/SP. A página Nossa loja reúne endereço atualizado, horário e acesso ao Google Maps.",
        ],
        links: [{ label: "Ver endereço e Como chegar", href: "/loja" }],
      },
      {
        heading: "O que você encontra na loja",
        bullets: [
          "Maquiagem para pele, olhos e lábios.",
          "Cílios e itens para lash design.",
          "Produtos para nail design.",
          "Cosméticos e skincare.",
          "Acessórios de beleza e opções para presentes.",
        ],
      },
      {
        heading: "Consulte antes de sair de casa",
        paragraphs: [
          "Como o estoque muda com vendas e reposições, o catálogo ajuda a visualizar o mix atual. Para um produto ou tom específico, você também pode confirmar a disponibilidade pelo WhatsApp.",
        ],
        links: [
          { label: "Ver todos os produtos", href: "/categoria" },
          { label: "Ir para Nossa loja", href: "/loja" },
        ],
      },
      {
        heading: "Retirada e entrega local",
        paragraphs: [
          "Além da compra presencial, é possível escolher produtos pelo catálogo e combinar retirada. As entregas locais são feitas por 99Entrega somente em Presidente Prudente, depois da confirmação do pedido e endereço pela equipe.",
        ],
      },
    ],
  },
  {
    slug: "como-funciona-retirada-e-99entrega",
    title: "Como funciona a retirada e a 99Entrega na Sra Make",
    description:
      "Veja como escolher produtos no catálogo, confirmar pelo WhatsApp e combinar retirada ou 99Entrega em Presidente Prudente.",
    excerpt:
      "Entenda o fluxo de compra local da Sra Make: catálogo, confirmação pelo WhatsApp, retirada na loja ou 99Entrega em Presidente Prudente.",
    category: "Como comprar",
    readTime: "3 min",
    publishedAt: "2026-09-08",
    updatedAt: "2026-09-08",
    intro:
      "O catálogo foi pensado para facilitar a escolha dos produtos antes do contato com a loja. Depois, a equipe confirma disponibilidade e combina a forma de recebimento.",
    sections: [
      {
        heading: "1. Escolha os produtos",
        paragraphs: [
          "Navegue pelas categorias, consulte preços e adicione os itens desejados ao carrinho. O catálogo ajuda a organizar o pedido antes do atendimento.",
        ],
        links: [{ label: "Ver produtos", href: "/categoria" }],
      },
      {
        heading: "2. Confirme pelo WhatsApp",
        paragraphs: [
          "A equipe confere os itens, a disponibilidade e os detalhes necessários. Essa confirmação evita problemas com produtos vendidos recentemente ou variações de tom e modelo.",
        ],
      },
      {
        heading: "3. Escolha retirada ou entrega local",
        bullets: [
          "Retirada: o pedido é separado e a equipe combina quando ele estará disponível na loja.",
          "99Entrega: disponível somente em Presidente Prudente. A corrida é solicitada após confirmação do pedido e endereço.",
        ],
      },
      {
        heading: "Onde retirar",
        paragraphs: [
          "A retirada acontece na Sra Make Prudente, no Centro. Consulte a página Nossa loja para ver endereço, horário e rota no Google Maps.",
        ],
        links: [{ label: "Ver Nossa loja", href: "/loja" }],
      },
    ],
  },
];

export function getDica(slug: string) {
  return DICAS.find((dica) => dica.slug === slug);
}
