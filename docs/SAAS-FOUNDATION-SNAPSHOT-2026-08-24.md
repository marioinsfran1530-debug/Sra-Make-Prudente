# Snapshot de fundação — futura SaaS

Data: 2026-08-24
Commit congelado: `cb81b0d287ae2e9b1504b34ae3b30bf12414efcb`
Origem: branch `master`

## Objetivo

Preservar uma referência imutável do catálogo Sra Make no estágio em que a operação de produção, feed do Google Merchant Center e mensuração GA4 já estavam funcionais. Esta branch não deve ser usada para desenvolvimento diário.

## Estado funcional preservado

- Next.js + React
- PostgreSQL/Supabase + Prisma
- Painel administrativo
- Produtos, categorias, múltiplas categorias, imagens e variantes
- Estoque e regras de pedidos
- Carrinho e checkout
- Finalização/contato por WhatsApp
- Configurações da loja
- Tracking de origem/UTM
- GA4 e eventos de e-commerce
- Meta Pixel mantido em paralelo
- SEO/PWA, sitemap e robots
- Feed Google Merchant Center
- CI, lint, typecheck e testes existentes

## Regra para evolução SaaS

Não transformar esta branch em produção SaaS diretamente. Criar uma branch de trabalho a partir deste snapshot e implementar a camada multi-tenant antes de cadastrar empresas externas.

Prioridades arquiteturais:

1. Criar entidade `Tenant`/`Store` com identificador único.
2. Relacionar dados comerciais e administrativos ao tenant.
3. Garantir isolamento em banco, APIs, autenticação e autorização.
4. Transformar marca, domínio, WhatsApp, GA4, Meta Pixel, Merchant Center, SEO e regras comerciais em configurações por tenant.
5. Criar onboarding sem alteração de código.
6. Adicionar testes automáticos de isolamento entre tenants.
7. Implementar observabilidade, auditoria, backup/restauração e limites de uso.
8. Validar primeiro com poucas empresas antes de ampliar a escala.

## Segurança

Este snapshot contém somente código versionado. Segredos e credenciais de Vercel, Supabase, Google, Meta ou outros serviços não devem ser copiados para o repositório. Backups do banco e dos arquivos do Storage devem permanecer em mecanismos próprios e protegidos.

## Critério de prontidão para empresas externas

A futura versão SaaS só deve ser considerada pronta quando for possível criar e operar uma nova empresa sem editar o código e quando testes comprovarem que um tenant não consegue ler ou modificar dados de outro tenant.
