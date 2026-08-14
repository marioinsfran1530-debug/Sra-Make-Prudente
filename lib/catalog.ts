import { Palette, Eye, Hand, ShoppingBag, type LucideIcon } from "lucide-react"

/* ============================================================
   SRA MAKE CATÁLOGO — design tokens (cores da marca)
   ============================================================ */
export const C = {
  rosa: "#E4127B",
  rosaProfundo: "#A6157A",
  roxo: "#6E1E8C",
  navy: "#131B33",
  dourado: "#C9972E",
  creme: "#FFF6FA",
  vermelho: "#E11D2E",
  texto: "#23142A",
  cinza: "#7A6C7F",
  borda: "#F1E4EC",
  bordaForte: "#E9D9E4",
  verde: "#4E9F6E",
  whatsapp: "#25D366",
} as const

export const GRADIENT_HERO = `linear-gradient(135deg, ${C.rosa} 0%, ${C.rosaProfundo} 55%, ${C.roxo} 100%)`
export const GRADIENT_IMG = `linear-gradient(150deg, ${C.creme} 0%, #FBE4EF 55%, #F3D9EA 100%)`

export const WHATSAPP_NUMBER = "5518991248713"
export const STORE_ADDRESS = "Av. Brasil, 373 — Box 202, Centro, Presidente Prudente/SP"
export const MAPS_URL =
  "https://www.google.com/maps/search/?api=1&query=" +
  encodeURIComponent("Av. Brasil, 373, Centro, Presidente Prudente - SP")
export const INSTAGRAM_URL = "https://instagram.com/sramakeprudente"

export function waLink(message: string) {
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`
}

export const money = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })

/* ============================================================
   TIPOS
   ============================================================ */
export type Stock = "disponivel" | "ultimas" | "indisponivel"

export interface ProductVariants {
  label: string
  options: string[]
}

export interface Product {
  id: string
  name: string
  brand: string
  category: string
  sub: string
  price: number
  promo?: number
  stock: Stock
  featured?: boolean
  bestSeller?: boolean
  isNew?: boolean
  desc: string
  variants?: ProductVariants
}

export interface Category {
  id: string
  name: string
  icon: LucideIcon
  sub: string[]
}

export interface CartItem {
  productId: string
  variant: string | null
  qty: number
}

/* ============================================================
   DEMO DATA — dados de demonstração
   ============================================================ */
export const CATEGORIES: Category[] = [
  {
    id: "make",
    name: "Make",
    icon: Palette,
    sub: [
      "Base", "Corretivo", "Pó", "Blush", "Contorno", "Iluminador",
      "Máscara de cílios", "Batom", "Gloss", "Paletas", "Sombras",
      "Primer", "Fixador", "Skincare",
    ],
  },
  { id: "lash", name: "Lash", icon: Eye, sub: ["Cílios", "Cola", "Pinças", "Acessórios", "Materiais profissionais"] },
  { id: "nail", name: "Nail", icon: Hand, sub: ["Esmaltes", "Preparação", "Alongamento", "Acessórios", "Materiais profissionais"] },
  { id: "acessorios", name: "Acessórios", icon: ShoppingBag, sub: ["Pincéis", "Esponjas", "Necessaires", "Acessórios de beleza"] },
]

export const BRANDS = ["Ruby Rose", "Max Love", "Fenzza"]

const RAW_PRODUCTS: Array<Omit<Product, "stock"> & { stock?: Stock }> = [
  { id: "p1", name: "Base Líquida Matte", brand: "Ruby Rose", category: "make", sub: "Base", price: 39.9, stock: "disponivel", featured: true, bestSeller: true, desc: "Cobertura média a alta, acabamento matte de longa duração.", variants: { label: "Tonalidade", options: ["Bege claro", "Bege médio", "Bege escuro"] } },
  { id: "p2", name: "Corretivo Líquido", brand: "Ruby Rose", category: "make", sub: "Corretivo", price: 24.9, stock: "ultimas", desc: "Alta cobertura para olheiras e imperfeições." },
  { id: "p3", name: "Paleta de Sombras Nude", brand: "Max Love", category: "make", sub: "Paletas", price: 54.9, promo: 44.9, featured: true, isNew: true, desc: "12 cores neutras, alta pigmentação." },
  { id: "p4", name: "Máscara de Cílios Volume", brand: "Fenzza", category: "make", sub: "Máscara de cílios", price: 29.9, bestSeller: true, desc: "Efeito volumoso sem grumos." },
  { id: "p5", name: "Batom Matte Líquido", brand: "Ruby Rose", category: "make", sub: "Batom", price: 19.9, desc: "Longa duração, não resseca.", variants: { label: "Cor", options: ["Nude", "Vermelho", "Rosa", "Marrom"] } },
  { id: "p6", name: "Pó Compacto Translúcido", brand: "Max Love", category: "make", sub: "Pó", price: 27.9, stock: "indisponivel", desc: "Efeito matte, controla brilho." },
  { id: "p7", name: "Primer Facial Hidratante", brand: "Fenzza", category: "make", sub: "Primer", price: 32.9, isNew: true, desc: "Prepara a pele e prolonga a make." },
  { id: "p8", name: "Blush Cremoso", brand: "Ruby Rose", category: "make", sub: "Blush", price: 22.9, desc: "Acabamento natural iluminado." },
  { id: "p9", name: "Cílios Postiços Volume Russo", brand: "Fenzza", category: "lash", sub: "Cílios", price: 18.9, featured: true, desc: "Fio a fio, efeito volumoso profissional." },
  { id: "p10", name: "Cola para Cílios Profissional", brand: "Max Love", category: "lash", sub: "Cola", price: 34.9, bestSeller: true, desc: "Secagem rápida, alta fixação." },
  { id: "p11", name: "Pinça para Extensão de Cílios", brand: "Fenzza", category: "lash", sub: "Pinças", price: 42.9, stock: "ultimas", desc: "Aço inoxidável, ponta curva." },
  { id: "p12", name: "Kit Iniciante Lash", brand: "Fenzza", category: "lash", sub: "Materiais profissionais", price: 89.9, isNew: true, desc: "Kit completo para iniciar no lash design." },
  { id: "p13", name: "Esmalte Cremoso", brand: "Ruby Rose", category: "nail", sub: "Esmaltes", price: 8.9, desc: "Alta cobertura e brilho.", variants: { label: "Cor", options: ["Vermelho", "Nude", "Vinho", "Rosa claro"] } },
  { id: "p14", name: "Base Fortalecedora para Unhas", brand: "Max Love", category: "nail", sub: "Preparação", price: 14.9, desc: "Fortalece e prepara a unha natural." },
  { id: "p15", name: "Gel de Alongamento", brand: "Fenzza", category: "nail", sub: "Alongamento", price: 49.9, featured: true, desc: "Alta aderência, fácil modelagem." },
  { id: "p16", name: "Lixa Profissional 100/180", brand: "Max Love", category: "nail", sub: "Acessórios", price: 6.9, desc: "Dupla granulação para acabamento." },
  { id: "p17", name: "Kit Pincéis para Maquiagem (12 un)", brand: "Ruby Rose", category: "acessorios", sub: "Pincéis", price: 64.9, bestSeller: true, desc: "Cerdas macias, cabo emborrachado." },
  { id: "p18", name: "Esponja de Maquiagem Blender", brand: "Max Love", category: "acessorios", sub: "Esponjas", price: 12.9, isNew: true, desc: "Textura macia, não absorve produto em excesso." },
  { id: "p19", name: "Necessaire de Viagem", brand: "Fenzza", category: "acessorios", sub: "Necessaires", price: 29.9, desc: "Compartimentos organizadores, tecido resistente." },
  { id: "p20", name: "Espelho de Bolsa com LED", brand: "Ruby Rose", category: "acessorios", sub: "Acessórios de beleza", price: 34.9, stock: "ultimas", desc: "Luz ajustável em 3 tons." },
]

export const PRODUCTS: Product[] = RAW_PRODUCTS.map((p) => ({ stock: "disponivel", ...p }) as Product)
