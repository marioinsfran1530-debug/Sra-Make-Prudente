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
- [ ] **Fase 2 — Catálogo**: categorias, produtos, variantes, imagens, busca (leitura pública)
- [ ] **Fase 3 — Carrinho**: adicionar/remover/quantidade, persistência local
- [ ] **Fase 4 — Pedido**: checkout, validação server-side, criação de Order/OrderItem, WhatsApp
- [ ] **Fase 5 — Admin**: dashboard, CRUD produtos/categorias, upload de imagens, pedidos
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
