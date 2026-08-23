export type CategorySeoContent = {
  title: string;
  description: string;
  intro: string;
  about: string[];
};

const CATEGORY_SEO: Record<string, CategorySeoContent> = {
  make: {
    title: "Maquiagem em Presidente Prudente",
    description:
      "Compre maquiagem em Presidente Prudente na Sra Make Prudente. Encontre bases, corretivos, pós, blushes, batons, gloss, máscaras, paletas e acessórios.",
    intro:
      "Encontre maquiagem em Presidente Prudente para o dia a dia, presentes ou uso profissional. A Sra Make reúne opções de diferentes marcas, faixas de preço e acabamentos, com atendimento para ajudar na escolha.",
    about: ["bases e corretivos", "pós, blushes e iluminadores", "batons e gloss", "máscaras, lápis e paletas"],
  },
  lash: {
    title: "Produtos para Lash e Cílios em Presidente Prudente",
    description:
      "Produtos para lash e cílios em Presidente Prudente. Encontre cílios tufinho, cílios postiços, colas, pinças, kits e acessórios na Sra Make Prudente.",
    intro:
      "Produtos para lash, extensão e aplicação de cílios em Presidente Prudente. Consulte cílios, colas, pinças, kits e acessórios para uso profissional ou pessoal.",
    about: ["cílios tufinho e postiços", "colas para cílios", "pinças e aplicadores", "kits e acessórios para lash"],
  },
  nail: {
    title: "Produtos para Nail Designer em Presidente Prudente",
    description:
      "Produtos para nail designer em Presidente Prudente. Encontre itens para unhas em gel, preparação, acabamento, lixas e acessórios na Sra Make Prudente.",
    intro:
      "Encontre produtos para nail designer em Presidente Prudente, com itens para preparação, alongamento, acabamento e manutenção de unhas, além de ferramentas e acessórios.",
    about: ["produtos para unhas em gel", "preparadores e acabamentos", "lixas e ferramentas", "acessórios para nail designer"],
  },
  "unhas-posticas": {
    title: "Unhas Postiças em Presidente Prudente",
    description:
      "Unhas postiças em Presidente Prudente na Sra Make Prudente. Confira modelos, tamanhos e acessórios para aplicação e acabamento.",
    intro:
      "Veja opções de unhas postiças em Presidente Prudente para diferentes estilos e ocasiões, além de itens que facilitam a aplicação e o acabamento.",
    about: ["unhas postiças", "modelos e tamanhos variados", "itens para aplicação", "acessórios para acabamento"],
  },
  "design-de-sobrancelhas": {
    title: "Produtos para Design de Sobrancelhas em Presidente Prudente",
    description:
      "Produtos para design de sobrancelhas em Presidente Prudente. Encontre pinças, itens de preparação, acabamento e acessórios na Sra Make Prudente.",
    intro:
      "Produtos e acessórios para design de sobrancelhas em Presidente Prudente, com opções para uso profissional e cuidados do dia a dia.",
    about: ["pinças e acessórios", "itens para preparação", "produtos para definição", "acabamento de sobrancelhas"],
  },
  cosmeticos: {
    title: "Cosméticos em Presidente Prudente",
    description:
      "Compre cosméticos em Presidente Prudente na Sra Make Prudente. Encontre cuidados pessoais, skincare e produtos de beleza para sua rotina.",
    intro:
      "Encontre cosméticos em Presidente Prudente para complementar sua rotina de beleza e autocuidado, com opções de skincare e cuidados pessoais.",
    about: ["skincare", "cuidados pessoais", "produtos de beleza", "itens para rotina de autocuidado"],
  },
  acessorios: {
    title: "Acessórios de Beleza em Presidente Prudente",
    description:
      "Acessórios de beleza em Presidente Prudente. Encontre esponjas, pincéis, pinças, necessaires e outros itens na Sra Make Prudente.",
    intro:
      "Acessórios de beleza em Presidente Prudente para facilitar a maquiagem, organização e cuidados pessoais, com itens práticos para uso diário e profissional.",
    about: ["esponjas e aplicadores", "pincéis", "pinças", "necessaires e acessórios"],
  },
  presentes: {
    title: "Presentes de Beleza em Presidente Prudente",
    description:
      "Presentes de beleza em Presidente Prudente. Encontre opções de maquiagem, cosméticos, kits e acessórios na Sra Make Prudente.",
    intro:
      "Escolha presentes de beleza em Presidente Prudente com opções de maquiagem, cosméticos, kits e acessórios para diferentes estilos e faixas de preço.",
    about: ["kits de beleza", "maquiagem para presente", "cosméticos", "acessórios"],
  },
  "kit-promocionais": {
    title: "Kits Promocionais de Beleza em Presidente Prudente",
    description:
      "Kits promocionais de maquiagem e beleza em Presidente Prudente. Consulte combinações de produtos e novidades da Sra Make Prudente.",
    intro:
      "Confira kits promocionais de beleza em Presidente Prudente com combinações de produtos para uso próprio, reposição ou presente.",
    about: ["kits de maquiagem", "combinações promocionais", "kits para presente", "novidades e seleções da loja"],
  },
  "produtos-infantis": {
    title: "Produtos Infantis de Beleza em Presidente Prudente",
    description:
      "Produtos infantis de beleza em Presidente Prudente. Consulte opções disponíveis na Sra Make Prudente para presentes e momentos de diversão.",
    intro:
      "Veja produtos infantis de beleza em Presidente Prudente disponíveis no catálogo da Sra Make, sempre conferindo indicação de uso e informações do fabricante.",
    about: ["itens infantis", "opções para presente", "produtos de beleza", "acessórios"],
  },
  "perfumes-e-bory-splash": {
    title: "Perfumes e Higiene Pessoal em Presidente Prudente",
    description:
      "Perfumes, body splash e higiene pessoal em Presidente Prudente. Consulte fragrâncias e cuidados pessoais disponíveis na Sra Make Prudente.",
    intro:
      "Encontre perfumes, body splash e itens de higiene pessoal em Presidente Prudente, com opções para rotina de cuidados e presentes.",
    about: ["perfumes", "body splash", "higiene pessoal", "cuidados diários"],
  },
};

export function getCategorySeo(slug: string, categoryName: string): CategorySeoContent {
  return (
    CATEGORY_SEO[slug] ?? {
      title: `${categoryName} em Presidente Prudente`,
      description: `${categoryName} na Sra Make Prudente. Encontre produtos no catálogo, consulte disponibilidade e fale com a loja pelo WhatsApp em Presidente Prudente/SP.`,
      intro: `Encontre ${categoryName.toLowerCase()} em Presidente Prudente no catálogo da Sra Make Prudente, com atendimento para tirar dúvidas, retirada na loja e opções de entrega.`,
      about: [categoryName],
    }
  );
}
