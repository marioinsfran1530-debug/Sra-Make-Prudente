# Sra Make Catálogo

Catálogo digital mobile-first + carrinho + geração de pedido via WhatsApp + painel administrativo, para a Sra Make Prudente (Presidente Prudente/SP).

Este repositório contém a **Fase 1 (Fundação)** do [Plano Técnico Mestre](./PLANO-TECNICO.md): projeto Next.js configurado, Tailwind com os tokens da marca, schema Prisma completo, integração inicial com Supabase (Auth + Postgres) e estrutura de pastas para as fases seguintes.

## Stack

- Next.js 14 (App Router, TypeScript)
- Tailwind CSS
- Supabase (Postgres + Auth + Storage)
- Prisma (uso restrito a contexto server-side — ver seção 3 do plano)
- Deploy: Vercel

## Como rodar localmente

Este ambiente de geração de código não tem acesso à internet, então as dependências ainda **não foram instaladas** nem o Supabase foi provisionado. Para colocar o projeto de pé:

```bash
npm install
cp .env.example .env.local
# preencha .env.local com os dados do seu projeto Supabase
npx prisma generate
npx prisma migrate dev --name init
npm run dev
```

Verifique a conexão com o banco em `http://localhost:3000/api/health`.

## Estrutura

```
src/
├─ app/
│  ├─ (loja)/        # catálogo público — home, categoria, busca, carrinho, checkout, loja
│  ├─ admin/
│  │  ├─ login/       # não protegido
│  │  └─ (protected)/ # dashboard e demais telas admin — protegidas por middleware + layout
│  └─ api/            # Route Handlers
├─ components/        # componentes reutilizáveis (Fase 2 em diante)
└─ lib/                # prisma.ts, supabase.ts
```

## Roadmap (fases do plano)

- [x] **Fase 1 — Fundação**: Next.js, Tailwind, Prisma, Supabase Auth wiring, estrutura de pastas
- [x] **Fase 2 — Catálogo**: categorias, produtos, variantes, busca — consumindo o banco via `src/lib/data.ts` e `/api/categories` `/api/products`. Banco já populado com 4 categorias, 20 subcategorias e 20 produtos de demonstração.
- [x] **Fase 3 — Carrinho**: `CartProvider` (Context + `localStorage`), adicionar/remover/quantidade, contador no header e no bottom nav, sem exigir login
- [x] **Fase 4 — Pedido**: checkout (dados, retirada/entrega, pagamento, observação), `POST /api/orders` valida produtos/preços no servidor e grava `Order`/`OrderItem`, mensagem final via `lib/whatsapp.ts` e redirecionamento para o WhatsApp
- [x] **Fase 5 — Admin**: login (Supabase Auth) + `AdminProfile` com roles, dashboard com métricas reais, CRUD de produtos (com variantes), categorias, lista/detalhe de pedidos com troca de status
  - Upload de imagem para o Supabase Storage ainda não incluído (produtos usam o placeholder ilustrado); pode ser adicionado depois como extensão da Fase 5
- [ ] **Fase 6 — Estoque**: `stockQty` como fonte da verdade, confirmação transacional
- [ ] **Fase 7 — Tracking**: UTM + sessionId
- [ ] **Fase 8 — PWA + SEO + produção**: manifest, metadata, sitemap, domínio, deploy

Continue a implementação fase por fase — não pedir "construa tudo" de uma vez (ver seção 15 do plano).

## Enviar para o GitHub

```bash
git remote add origin <URL_DO_SEU_REPOSITORIO>
git branch -M main
git push -u origin main
```

Depois é só conectar o repositório na Vercel para deploy automático a cada push, e configurar as variáveis de `.env.example` no projeto da Vercel.
