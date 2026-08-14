# Sra Make Catálogo — Plano Técnico Mestre (v3)

Catálogo digital + carrinho + geração de pedido + WhatsApp + painel administrativo, mobile-first, com a lógica de um cardápio digital: **Entrar → Encontrar → Escolher → Adicionar → Revisar → Enviar pedido**. Sem checkout de pagamento online na v1 — a confirmação é humana, pelo WhatsApp.

Esta versão incorpora a revisão técnica: papéis de admin, estratégia única de estoque, confirmação transacional, taxa de entrega, pagamento como enum, snapshot mais completo no pedido, tracking com sessão, configurações editáveis, regra explícita Prisma × Supabase/RLS, e a implementação dividida em fases obrigatórias.

---

## 1. Marca

- **Nome:** Sra Make Prudente
- **Endereço:** Av. Brasil, 373 — Box 202, Centro, Presidente Prudente/SP
- **WhatsApp:** 5518991248713 (`https://wa.me/5518991248713`)
- **Instagram:** @sramakeprudente
- **Marcas trabalhadas:** Ruby Rose, Max Love, Fenzza
- **Categorias:** Make, Lash, Nail, Acessórios
- **Posicionamento:** confiança, orientação, segurança, praticidade, variedade, atendimento humano — nunca comunicação baseada só em preço baixo.
- **Domínio de produção:** `sramakeprudente.com.br`, com `/admin` no mesmo projeto Next.js (não separar em subdomínio — simplifica deploy e sessão).

---

## 2. Stack definitiva

| Camada | Tecnologia |
|---|---|
| Frontend + backend | Next.js 14+ (App Router, TypeScript, Server Components onde fizer sentido, Route Handlers) |
| Estilo | Tailwind CSS |
| Banco | Supabase PostgreSQL |
| ORM | Prisma — **somente em contexto server-side administrativo**, ver regra explícita na seção 3 |
| Autenticação admin | Supabase Auth |
| Storage de imagens | Supabase Storage |
| Hospedagem | Vercel |
| Código | GitHub |
| Pedido | link `wa.me` |

---

## 3. Regra explícita: Prisma × Supabase/RLS

O Prisma se conecta direto ao Postgres e **não passa pelas políticas de RLS do Supabase** da mesma forma que o client Supabase autenticado. Para não abrir brecha de segurança, o projeto segue esta separação sem exceção:

| Tipo de acesso | Camada usada | Onde roda |
|---|---|---|
| Leitura pública (catálogo, categorias) | Supabase client (anon key) **ou** Route Handler server-side com Prisma, sempre filtrando `active = true` explicitamente no código | Server |
| Operações administrativas (CRUD de produto/categoria/pedido) | Prisma, dentro de Route Handlers que já validaram a sessão do Supabase Auth | Server, nunca client |
| Operações críticas (confirmar pedido, mexer em estoque) | Prisma + transação no banco, dentro de Route Handler autenticado e autorizado por role | Server |

Regras fixas:
- `SUPABASE_SERVICE_ROLE_KEY` nunca é usada em componente client, nunca é enviada ao browser — só em Route Handlers server-side.
- Toda rota `/api/admin/*` valida a sessão do Supabase Auth **de novo no servidor**, mesmo já passando pelo middleware.
- RLS fica ativo nas tabelas do Supabase como camada de defesa adicional, mesmo quando o acesso principal é via Prisma com service role — evita que uma chave anon mal configurada exponha dados administrativos.

---

## 4. Papéis de administrador

```prisma
enum AdminRole {
  ADMIN
  EDITOR
}

model AdminProfile {
  id        String    @id            // igual ao id do auth.users no Supabase
  email     String    @unique
  name      String?
  role      AdminRole @default(EDITOR)
  active    Boolean   @default(true)
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt
}
```

- **ADMIN**: produtos, categorias, pedidos, configurações da loja (`StoreSettings`), usuários administrativos.
- **EDITOR**: produtos, categorias, imagens — sem acesso a configurações da loja nem gestão de usuários.
- Toda rota administrativa verifica `role` além de `active`, não só a existência de sessão.

---

## 5. Estoque — estratégia única

Decisão: **estoque numérico é a fonte da verdade**; `StockStatus` é sempre **calculado**, nunca digitado manualmente pelo admin. Isso evita divergência entre "o admin marcou disponível" e "a quantidade real".

```
stockQty > 5   → DISPONIVEL
stockQty 1–5   → ULTIMAS
stockQty = 0   → INDISPONIVEL
```

- **Produto sem variantes**: `stockQty` fica no próprio `Product`.
- **Produto com variantes**: `stockQty` fica em cada `ProductVariant`; o status exibido no card do produto é o mais favorável entre as variantes ativas (ex.: se uma variante tem estoque e outra não, o produto aparece como disponível, e a variante esgotada aparece desabilitada dentro do modal).
- O painel admin mostra e edita **quantidade**, nunca o rótulo diretamente. O rótulo (`Disponível` / `Últimas unidades` / `Indisponível`) é um campo derivado, exibido mas não editável.

---

## 6. Modelo de dados (Prisma → Supabase Postgres)

```prisma
model Category {
  id            String        @id @default(cuid())
  name          String
  slug          String        @unique
  imageUrl      String?
  description   String?
  order         Int           @default(0)
  active        Boolean       @default(true)
  subcategories Subcategory[]
  products      Product[]
  createdAt     DateTime      @default(now())
  updatedAt     DateTime      @updatedAt
}

model Subcategory {
  id         String    @id @default(cuid())
  name       String
  slug       String
  categoryId String
  category   Category  @relation(fields: [categoryId], references: [id])
  products   Product[]
  createdAt  DateTime  @default(now())
  updatedAt  DateTime  @updatedAt
  @@unique([categoryId, slug])
}

model Product {
  id            String           @id @default(cuid())
  name          String
  brand         String
  sku           String?
  description   String?
  price         Decimal          @db.Decimal(10, 2)
  promoPrice    Decimal?         @db.Decimal(10, 2)
  stockQty      Int              @default(0)   // usado quando o produto não tem variantes
  featured      Boolean          @default(false)
  isNew         Boolean          @default(false)
  bestSeller    Boolean          @default(false)
  active        Boolean          @default(true)
  categoryId    String
  category      Category         @relation(fields: [categoryId], references: [id])
  subcategoryId String?
  subcategory   Subcategory?     @relation(fields: [subcategoryId], references: [id])
  images        ProductImage[]
  variants      ProductVariant[]
  createdAt     DateTime         @default(now())
  updatedAt     DateTime         @updatedAt
}

model ProductImage {
  id          String   @id @default(cuid())
  url         String
  storagePath String?
  alt         String?
  order       Int      @default(0)
  productId   String
  product     Product  @relation(fields: [productId], references: [id], onDelete: Cascade)
  createdAt   DateTime @default(now())
}

model ProductVariant {
  id         String   @id @default(cuid())
  name       String   // ex: "Bege Médio"
  sku        String?
  price      Decimal? @db.Decimal(10, 2)
  promoPrice Decimal? @db.Decimal(10, 2)
  stockQty   Int      @default(0)
  active     Boolean  @default(true)
  productId  String
  product    Product  @relation(fields: [productId], references: [id], onDelete: Cascade)
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt
}

enum PaymentMethod { PIX DINHEIRO CARTAO CONFIRMAR_WHATSAPP }
enum DeliveryType { RETIRADA ENTREGA }

model Order {
  id            String        @id @default(cuid())
  number        Int           @unique @default(autoincrement())
  customerName  String
  customerPhone String

  subtotal      Decimal       @db.Decimal(10, 2)
  deliveryFee   Decimal       @default(0) @db.Decimal(10, 2)
  total         Decimal       @db.Decimal(10, 2)   // subtotal + deliveryFee

  deliveryType  DeliveryType
  address       String?
  payment       PaymentMethod
  notes         String?

  origin        String?
  referrer      String?
  landingPage   String?
  utmSource     String?
  utmMedium     String?
  utmCampaign   String?
  utmContent    String?
  sessionId     String?       // id anônimo de visita, ver seção 8

  status        OrderStatus   @default(NOVO)
  items         OrderItem[]
  createdAt     DateTime      @default(now())
  updatedAt     DateTime      @updatedAt
}

model OrderItem {
  id          String  @id @default(cuid())
  orderId     String
  order       Order   @relation(fields: [orderId], references: [id], onDelete: Cascade)
  productId   String
  variantId   String?

  // snapshot completo — o pedido continua legível mesmo se o produto mudar ou for desativado depois
  name        String
  brand       String?
  sku         String?
  variantName String?

  qty         Int
  unitPrice   Decimal @db.Decimal(10, 2)
  subtotal    Decimal @db.Decimal(10, 2)
}

enum OrderStatus {
  NOVO EM_CONFIRMACAO CONFIRMADO SEPARANDO
  PRONTO_RETIRADA SAIU_ENTREGA FINALIZADO CANCELADO
}

model StoreSettings {
  id              String   @id @default(cuid())
  storeName       String
  whatsapp        String
  instagram       String?
  address         String?
  deliveryEnabled Boolean  @default(true)
  pickupEnabled   Boolean  @default(true)
  updatedAt       DateTime @updatedAt
}
```

---

## 7. Pedido e confirmação — regra transacional de estoque

**Criar pedido (`POST /api/orders`, público):**
1. Recebe carrinho (produtos/variantes/quantidades) + dados do cliente + `deliveryType`/endereço + pagamento + observação + UTM + `sessionId`.
2. Servidor busca cada produto/variante no banco — nunca confia em preço ou nome vindos do navegador.
3. Confirma que produto/variante está `active`. **Não bloqueia por estoque baixo aqui** — só valida que não está zerado quando o front já mostrou indisponível.
4. Calcula `subtotal`, aplica `deliveryFee` (0 por enquanto, mas já persistido) e grava `total`.
5. Cria `Order` (`status = NOVO`) + `OrderItem`s com snapshot (nome, marca, sku, variante, preço).
6. **Não desconta estoque neste momento** — pedido criado não é venda garantida.
7. Retorna número do pedido para montar a mensagem do WhatsApp.

**Confirmar pedido (`PATCH /api/admin/orders/[id]/confirm`, admin, role ADMIN):**
Executa em uma única transação de banco (`prisma.$transaction`) para evitar vender a mesma última unidade duas vezes:
```
INÍCIO DA TRANSAÇÃO
  para cada item do pedido:
    ler stockQty atual do produto/variante (lock de linha)
    se stockQty < qty pedida → aborta a transação, retorna erro "estoque insuficiente"
    stockQty -= qty
  status do pedido → CONFIRMADO
COMMIT
```
Se a transação falhar por concorrência (dois pedidos confirmando ao mesmo tempo), o segundo admin recebe um erro claro e pode ajustar o pedido manualmente com a cliente — nunca os dois pedidos são confirmados com estoque insuficiente.

Mudança de status posterior (`SEPARANDO` → `FINALIZADO` etc.) não mexe mais em estoque, já foi descontado na confirmação. `CANCELADO` após `CONFIRMADO` devolve a quantidade ao estoque (também transacional).

---

## 8. Tracking — com sessão anônima

Além do UTM já previsto, gerar um **`sessionId`** anônimo (UUID em cookie/localStorage, sem dado pessoal) na primeira visita, permitindo reconstruir o caminho:

```
visitante → Instagram → categoria Make → produto → carrinho → checkout → pedido #1042
```

- `sessionId` viaja junto com os eventos e é salvo no `Order.sessionId` ao finalizar.
- Eventos a instrumentar quando houver ferramenta de analytics conectada: `page_view`, `category_view`, `product_view`, `search`, `add_to_cart`, `remove_from_cart`, `begin_checkout`, `order_created`, `whatsapp_click`, `store_location_click`. Nenhuma métrica é inventada sem ferramenta configurada.

---

## 9. Regras de API (resumo)

| Rota | Método | Acesso | Regra |
|---|---|---|---|
| `/api/products` | GET | Público | Só `active = true`; filtros por categoria, subcategoria, marca, busca, destaque, novidade, mais vendido, disponibilidade (calculada) |
| `/api/admin/products` | POST | ADMIN/EDITOR | Cria produto |
| `/api/admin/products/[id]` | PUT/PATCH | ADMIN/EDITOR | Atualiza produto (inclui `stockQty`, nunca `stockStatus` diretamente) |
| `/api/admin/products/[id]` | DELETE | ADMIN/EDITOR | Soft delete (`active = false`) |
| `/api/categories` | GET | Público | Só categorias ativas |
| `/api/admin/categories` | POST/PUT/PATCH | ADMIN/EDITOR | Criar/editar/ativar/desativar/ordenar |
| `/api/admin/upload` | POST | ADMIN/EDITOR | Valida tipo (JPG/JPEG/PNG/WebP), tamanho, extensão; envia ao Supabase Storage; retorna URL |
| `/api/orders` | POST | Público | Cria pedido, ver fluxo seção 7 |
| `/api/admin/orders/[id]/confirm` | PATCH | ADMIN | Confirmação transacional, ver seção 7 |
| `/api/admin/orders/[id]/status` | PATCH | ADMIN | Demais transições de status |
| `/api/admin/settings` | GET/PUT | ADMIN | `StoreSettings` |

---

## 10. Painel administrativo

- **Login** (`/admin/login`) via Supabase Auth.
- **Dashboard**: produtos ativos, pedidos novos, pedidos em confirmação, produtos com `ULTIMAS`/`INDISPONIVEL` (calculado), pedidos recentes.
- **Produtos**: tabela com busca/filtro; formulário com quantidade em estoque (não rótulo), variantes com estoque próprio, upload múltiplo de imagens (ordenar, principal, excluir, substituir), destaque/novidade/mais vendido. Visível para ADMIN e EDITOR.
- **Categorias**: criar/editar/ativar/desativar/ordenar. Visível para ADMIN e EDITOR.
- **Pedidos**: lista filtrável por status/data/cliente/número; detalhe completo com origem/UTM/sessão; botão "Confirmar pedido" (dispara a transação da seção 7); demais transições de status; atalho para abrir WhatsApp do cliente. Visível para ADMIN.
- **Configurações** (`StoreSettings`): WhatsApp, endereço, Instagram, entrega/retirada habilitadas. Visível apenas para ADMIN.

---

## 11. Catálogo como cardápio digital (não e-commerce genérico)

Fluxo de navegação a proteger em toda decisão de UI:

```
ABRIU → "O que você procura?" → MAKE | LASH | NAIL | ACESSÓRIOS
→ subcategorias → produtos → produto → Adicionar → Carrinho → Enviar pedido → WhatsApp
```

Home com merchandising, não landing page:

```
Header + busca ("Encontre o que você precisa")
Categorias (Make / Lash / Nail / Acessórios)
Destaques
Novidades
Mais procurados
Reposição ("Precisa repor material?" → buscar produto)
A loja (Box 202, Presidente Prudente)
Bottom nav: Início | Categorias | Buscar | Carrinho | Loja
```

Manter a identidade visual da landing page (rosa, roxo, navy, dourado, creme, linguagem humana de orientação e praticidade) — mas **reduzir bastante o texto institucional** dentro do catálogo. A cliente entrou para encontrar e comprar, não para ler sobre a marca.

---

## 12. Design e identidade

```
Rosa       #E4127B     Navy    #131B33
Rosa Deep  #A6157A     Dourado #C9972E
Roxo       #6E1E8C     Creme   #FFF6FA
Vermelho   #E11D2E     Texto   #23142A
                        Cinza   #7A6C7F
```

---

## 13. Mobile-first, PWA, performance, SEO

- Navegação inferior fixa: Início | Categorias | Buscar | Carrinho | Loja (com contador).
- PWA: manifest, ícone, nome, theme color, instalável — nunca obrigatória para usar o catálogo.
- Performance: Server Components onde fizer sentido, lazy loading, imagens otimizadas, cache, paginação quando necessário.
- SEO: title "Sra Make Prudente | Maquiagem, Lash, Nail e Cosméticos", description institucional, Open Graph, favicon, sitemap, robots.txt.

---

## 14. Regras de conteúdo

Nunca inventar produtos, preços, avaliações, estoque, horários, promoções ou depoimentos. Enquanto não houver dados reais, usar dados de demonstração claramente identificados como tal.

---

## 15. Implementação em fases obrigatórias (para o Claude Code)

Não enviar o plano inteiro como "construa tudo" — dividir a execução, uma fase de cada vez, validando antes de seguir para a próxima.

**Fase 1 — Fundação**
Next.js + TypeScript + Tailwind, projeto Supabase (Postgres + Auth + Storage), Prisma configurado, estrutura de pastas, variáveis de ambiente, regra Prisma × RLS aplicada desde o início.

**Fase 2 — Catálogo**
Categorias, subcategorias, produtos, variantes, imagens, busca — somente leitura pública.

**Fase 3 — Carrinho**
Adicionar/remover/alterar quantidade, persistência em `localStorage`, sem exigir login.

**Fase 4 — Pedido**
Checkout, validação server-side de preços, criação de `Order`/`OrderItem` com snapshot completo, `deliveryFee`/`total`, geração da mensagem e link do WhatsApp.

**Fase 5 — Admin**
Login (Supabase Auth + roles), dashboard, CRUD de produtos e categorias, upload de imagens, lista e detalhe de pedidos.

**Fase 6 — Estoque**
`stockQty` como fonte da verdade, status calculado, confirmação transacional de pedido (seção 7), reversão de estoque em cancelamento.

**Fase 7 — Tracking**
Captura de UTM + `sessionId`, persistência no pedido, eventos preparados para analytics.

**Fase 8 — PWA + SEO + produção**
Manifest, metadata, sitemap, robots.txt, revisão de performance, domínio `sramakeprudente.com.br`, deploy final na Vercel.

---

## 16. Variáveis de ambiente

```
DATABASE_URL=
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=      # somente no servidor, nunca exposta ao client
```

---

## 17. Correções desta revisão (rastreabilidade)

1. `AdminProfile` ganhou `role` (`ADMIN` / `EDITOR`).
2. Estoque unificado: `stockQty` numérico é a fonte da verdade; `StockStatus` é sempre calculado.
3. Confirmação de pedido passa a ser transacional (`prisma.$transaction`), evitando vender a mesma unidade duas vezes.
4. `Order` ganhou `deliveryFee` e `total`.
5. `payment` virou enum `PaymentMethod`.
6. `OrderItem` ganhou `brand` e `sku` no snapshot.
7. Tracking ganhou `sessionId` anônimo por visita.
8. Novo model `StoreSettings`, editável pelo admin sem depender do desenvolvedor.
9. Regra explícita de separação Prisma × Supabase client/RLS (seção 3).
10. Execução dividida em 8 fases obrigatórias, uma de cada vez.
