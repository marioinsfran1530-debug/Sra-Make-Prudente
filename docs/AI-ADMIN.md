# Assistente de IA do Admin

## Objetivo

A IA é um assistente de escrita. Ela nunca publica, nunca salva produto automaticamente e nunca decide preço, estoque, flags comerciais ou métricas de negócio.

Fluxo adotado:

1. dados reais do catálogo determinam o contexto;
2. regras da aplicação determinam a classificação;
3. Gemini sugere texto;
4. o usuário revisa/edita;
5. somente uma ação normal de salvar/compartilhar usa a sugestão;
6. métricas anônimas de qualidade registram uso e edição, sem armazenar o texto gerado.

## Recursos

### Descrição de produto

Entrada enviada à IA:

- nome;
- marca;
- categoria;
- subcategoria, quando houver.

Saída: uma sugestão curta de descrição em português do Brasil.

O texto entra no mesmo campo editável do cadastro e só é persistido quando o usuário salva o produto.

### Central de Divulgação

A aplicação decide o contexto seguindo esta prioridade:

1. preço promocional real (`promoPrice < price`);
2. mais vendido (`bestSeller`);
3. novidade (`isNew`);
4. destaque (`featured`);
5. catálogo normal.

A IA recebe a classificação pronta e gera somente:

- gancho;
- CTA.

A aplicação continua montando título, nome, marca, preço, link e informação de retirada/entrega com dados reais.

## Configuração

Variáveis server-side:

```env
GEMINI_API_KEY=
GEMINI_MODEL=gemini-3.5-flash-lite
GEMINI_API_ENDPOINT=https://generativelanguage.googleapis.com/v1beta/interactions
```

Nunca use prefixo `NEXT_PUBLIC_` na chave Gemini.

`GEMINI_MODEL` existe justamente para evitar dependência de um nome de modelo espalhado pelo código. A troca de modelo deve ser feita pela variável de ambiente. O default fica centralizado em `src/lib/gemini.ts`.

O endpoint também é configurável para reduzir impacto de futuras mudanças da API.

## Prompt e tom de voz

O guia fixo de voz está centralizado em `src/lib/gemini.ts`.

Princípios atuais:

- português do Brasil natural e acessível;
- linguagem comercial, mas sem pressão artificial;
- sem superlativos não comprovados;
- sem inventar benefícios, composição, duração ou indicação técnica;
- sem inventar estoque, vendas, desconto, prazo ou escassez;
- sem afirmações como “o melhor do mercado”, “resultado garantido”, “últimas unidades” ou “vai acabar” quando os dados reais não sustentarem isso.

Os prompts têm versões próprias:

- `product-description-v1`;
- `promotion-copy-v1`.

Modelo e versão do prompt são registrados separadamente para permitir comparar qualidade após mudanças.

## Privacidade

A integração foi desenhada para a camada gratuita da Gemini Developer API, que pode usar conteúdo enviado para melhorar produtos do Google conforme os termos vigentes do Free Tier.

Por isso, a aplicação deve enviar somente informações comerciais públicas do produto.

Não enviar:

- nome, telefone ou endereço de cliente;
- conteúdo de pedido;
- dados de pagamento;
- custos, margem ou informações financeiras internas;
- tokens, chaves ou credenciais;
- dados pessoais ou confidenciais.

A chamada usa `store: false` na Interactions API.

## Métricas de qualidade

A tabela `AiSuggestionMetric` não guarda prompt nem resposta gerada.

Ela registra apenas:

- recurso (`product_description` ou `promotion_copy`);
- administrador que gerou;
- produto, quando aplicável;
- modelo;
- versão do prompt;
- quantidade de sugestões;
- se alguma sugestão foi usada;
- se foi editada antes do uso;
- índice selecionado nas variações;
- datas de geração/uso.

Isso permite medir:

- taxa de uso;
- taxa de aceitação sem edição;
- taxa de edição;
- descarte;
- regressões por modelo;
- regressões ou melhorias por versão de prompt.

O painel fica em `/admin/ia`.

## Segurança

- endpoints de IA exigem sessão administrativa (`requireAdmin`);
- chave existe somente no servidor;
- tabela de métricas tem RLS habilitado;
- `anon` e `authenticated` não possuem privilégios diretos na tabela;
- falha de telemetria nunca bloqueia cadastro/compartilhamento;
- falha ou rate limit do Gemini nunca derruba os templates fixos da Central de Divulgação;
- timeout da chamada externa evita prender a interface indefinidamente.

## Troca de modelo

Quando o Google aposentar ou recomendar outro modelo:

1. conferir a documentação e o preço atual;
2. validar suporte a saída estruturada;
3. alterar `GEMINI_MODEL` no ambiente de Preview;
4. testar descrição e copy em produtos reais;
5. observar a taxa de edição no painel de IA;
6. somente depois alterar o ambiente de Production.

Não é necessário alterar a lógica de negócio para trocar o modelo.
