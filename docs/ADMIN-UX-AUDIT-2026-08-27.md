# Auditoria UX do Admin — 27/08/2026

Este ciclo consolida melhorias em funcionalidades já existentes, sem criar novos módulos.

## Critérios

- Preservar o contexto do usuário.
- Reduzir cliques e decisões desnecessárias.
- Priorizar informação antes de ações no mobile.
- Tornar indicadores acionáveis.
- Padronizar feedback de sucesso, erro e confirmação.
- Proteger trabalho ainda não salvo.
- Manter consequências operacionais explícitas em ações críticas.

## Prioridades tratadas

### P1

- Navegação principal compacta e rolável no mobile.
- Proteção contra saída com alterações não salvas em Produto, Loja e fila de Descrições.
- Lista de Pedidos com busca por pedido/cliente/telefone, filtros de status e período, paginação e prioridade visual para pedidos novos.
- Fluxo coerente de status: Novo → Confirmado → Separando → Pronto para retirada/Saiu para entrega → Finalizado, preservando atalhos operacionais e cancelamento seguro.
- Indicadores do Dashboard levando diretamente ao recorte correspondente de Pedidos ou Produtos.
- Rota de Descrições visível na navegação de Análise.
- Confirmações e feedbacks padronizados nas principais operações de Produtos, Categorias, Pedidos e Usuários.
- Divulgação com uma ação principal clara: Enviar pelo WhatsApp. Compartilhar arte fica como alternativa e copia a descrição para uso como legenda.

### P2 incorporados no mesmo ciclo

- Formulário de Produto organizado em blocos funcionais.
- Variantes reorganizadas para telas pequenas.
- Voltar para Pedidos visível no detalhe.
- Feedback explícito em Categorias, Produtos e Usuários.
- Produtos aceitando filtros por URL para conectar Dashboard → ação.
- Pedidos aceitando filtros por URL para conectar Dashboard → ação.

### P3 incorporados no mesmo ciclo

- Painel de IA prioriza métricas de uso/qualidade e recolhe modelo, prompts e configuração técnica em “Detalhes técnicos da IA”.
- Scrollbars de navegação horizontal são ocultadas no mobile sem retirar a rolagem.

## Regra de produto adotada

Salvar não significa navegar. A interface só muda de tela quando a pessoa decide mudar de tela. Ações irreversíveis ou com consequência financeira/estoque exigem confirmação contextual.

## Resultado esperado

O Admin passa a orientar melhor a operação diária: indicadores levam à ação, pedidos novos ficam fáceis de localizar, formulários protegem trabalho em andamento e ações críticas usam a mesma linguagem visual. A meta deste ciclo não é adicionar recursos, e sim fazer os recursos existentes funcionarem como um único produto coerente.
