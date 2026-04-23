# Atualização de Prontidão E-commerce (Base MCP Mercado Pago)

Projeto analisado: `ESDRA`  
Data: 2026-04-22  
Base comparativa: `docs/ecommerce-readiness-report.md` (2026-04-16)

## Objetivo desta atualização

Atualizar o status real de prontidão para venda considerando:

1. Mudanças recentes na codebase (frontend + functions).
2. Estratégia de entrega orientada ao fluxo de pagamento Mercado Pago.
3. Ferramentas MCP disponíveis hoje no servidor `user-mcp-mercadopago-prod-oauth`.

Regra de decisão mantida: se o usuário não consegue pagar de forma real e confirmar status por webhook, o sistema ainda não está pronto para venda em produção.

## Resumo executivo

- O projeto evoluiu de forma relevante desde o último relatório.
- O backend já não cria pedido como pago automaticamente.
- Já existe intenção de pagamento com Mercado Pago e atualização por webhook.
- Já há operação admin para pedidos, status e trilha mínima de pagamento.
- Páginas legais e eventos de analytics críticos já estão no código.
- Ainda falta concluir validação ponta a ponta em ambiente real/sandbox homologado para considerar go-live.

Decisão atual: **Pronto para venda = NAO (ainda)**, porém com avanço substancial e caminho de conclusão mais curto.

## O que mudou desde o relatório anterior

### 1) Pagamento e pedido (maior evolução)

- `functions/index.js` agora cria pedido com:
  - `paymentStatus: "pending"`
  - `status: "pendente"`
- Após criar pedido, o fluxo chama criação de intenção de pagamento (`createPaymentIntent`), incluindo ramo Mercado Pago.
- Integração Mercado Pago existente com:
  - `MERCADOPAGO_ACCESS_TOKEN`
  - POST em `https://api.mercadopago.com/v1/payments`
  - `X-Idempotency-Key`
  - `external_reference` com `orderId`
  - `notification_url` para webhook.
- Webhook HTTP `paymentWebhook` implementado para:
  - validar método e segredo opcional,
  - normalizar status,
  - atualizar `paymentStatus` + `status` do pedido,
  - disparar email transacional de pagamento aprovado.

Impacto: o bloqueio crítico "pedido nasce pago sem gateway real" foi removido.

### 2) Checkout e dados obrigatórios

- `src/pages/Checkout.jsx` envia:
  - `idempotencyKey`,
  - `shippingAmount`,
  - `customer`,
  - `shippingAddress`,
  - `paymentMethod`.
- Existe bloqueio visual para dados faltantes no checkout.
- No backend (`functions/index.js`) há validação de:
  - cliente (`nome`, `sobrenome`, `telefone`, e `email/documento` conforme modo),
  - endereço completo,
  - frete numérico >= 0,
  - método de pagamento permitido.

Impacto: requisito de validação server-side evoluiu para próximo de completo.

### 3) Operação de pedidos (admin + conta)

- Nova área admin para pedidos em `src/pages/DashboardOrders.jsx`.
- Atualização de status operacional e status de pagamento via callable (`updateOrderStatusByAdmin`).
- Fluxo de cliente com:
  - listagem de pedidos (`src/pages/OrdersList.jsx`),
  - detalhe de pedido (`src/pages/OrderDetails.jsx`).

Impacto: gap de operação/admin foi reduzido de forma concreta.

### 4) Comunicação e legal

- Fila de email transacional no backend (`emailQueue`), incluindo:
  - confirmação de pedido,
  - pagamento aprovado.
- Páginas legais publicadas:
  - `src/pages/PrivacyPolicy.jsx`
  - `src/pages/TermsOfUse.jsx`
- Rotas legais já expostas em `src/App.jsx`.

Impacto: requisitos de comunicação mínima e base legal avançaram.

### 5) Métricas e eventos

- Eventos presentes no frontend:
  - `view_item`
  - `add_to_cart`
  - `begin_checkout`
  - `purchase`
- Ainda sem script explícito de GA/GTM em `index.html` (possível inicialização por outro ponto; validar em runtime).

Impacto: instrumentação funcional melhorou, mas ainda requer validação de coleta real.

### 6) Testes

- Existe teste E2E em `tests/e2e/critical-flow.spec.js`.
- Cobertura atual é parcial (sucesso de checkout sem `orderId` e páginas legais), não cobre pagamento real completo.

Impacto: progresso inicial, mas insuficiente para carimbar readiness de receita.

## Situação atual por requisito (baseline de 14 blocos)

- Estrutura: `ATINGIDO`
- Produto: `PARCIAL`
- Carrinho: `PARCIAL`
- Checkout: `PARCIAL`
- Pedido: `PARCIAL`
- Frete: `PARCIAL`
- Comunicação: `PARCIAL`
- Admin: `ATINGIDO`
- Métricas: `PARCIAL`
- Performance: `PARCIAL`
- Mobile: `PARCIAL`
- Legal: `ATINGIDO`
- Infra: `PARCIAL`
- Teste final: `PARCIAL`

## Status geral atualizado

- Pronto para venda? (SIM/NAO): **NAO**
- Score geral estimado: **21%** (3 de 14 em `ATINGIDO`)
- Score caminho crítico estimado: **40%** (2 de 5 em `ATINGIDO`)

Observação: apesar do score ainda conservador, a remoção dos bloqueios estruturais de pagamento/pedido representa ganho de maturidade relevante.

## Gaps críticos remanescentes (go-live blockers)

### 1) Homologação real de pagamento Mercado Pago

- Status: `PARCIAL`
- Impacto: sem prova real de aprovação/rejeição em ambiente homologado, risco financeiro e operacional permanece.
- Ação mínima:
  1. Confirmar credenciais e app ativo.
  2. Publicar webhook público válido.
  3. Rodar ciclo real de evento de pagamento e confirmação no pedido.

### 2) Webhook confiável e auditável em produção

- Status: `PARCIAL`
- Impacto: perda de notificação gera divergência entre pagamento e pedido.
- Ação mínima:
  1. Configurar `PAYMENT_WEBHOOK_URL` e segredo.
  2. Garantir retry/idempotência operacional.
  3. Monitorar histórico de entrega com ferramentas oficiais.

### 3) Teste final ponta a ponta com pagamento real/sandbox oficial

- Status: `PARCIAL`
- Impacto: sem teste de receita completo, risco de regressão de compra é alto.
- Ação mínima:
  1. Expandir E2E para fluxo completo `produto -> carrinho -> checkout -> pagamento -> pedido`.
  2. Validar transição de status após webhook.
  3. Validar email transacional nas transições críticas.

## Plano estruturado de elaboração para entrega do produto

## Fase 1 - Bloqueadores (execução imediata)

1. **Ativar e validar app Mercado Pago no MCP**
   - Tool: `application_list`
   - Resultado esperado: identificar `application_id` oficial da integração.

2. **Configurar webhook da aplicação via MCP**
   - Tool: `save_webhook`
   - Tópico mínimo: `payment`
   - Resultado esperado: callback de produção/sandbox apontando para `paymentWebhook`.

3. **Fechar segurança e observabilidade do webhook**
   - Backend:
     - manter `x-webhook-secret`,
     - reforçar logs com correlação `orderId`/`providerPaymentId`.
   - Tool: `notifications_history`
   - Resultado esperado: taxa de entrega estável e sem falhas recorrentes.

4. **Rodar homologação de qualidade de integração**
   - Tools:
     - `quality_checklist`
     - `quality_evaluation` (com `payment_id` real de teste)
   - Resultado esperado: checklist atendido e avaliação sem pendências críticas.

5. **Concluir suíte E2E de receita**
   - Cobrir:
     - criação de pedido,
     - geração de intent de pagamento,
     - confirmação por webhook,
     - atualização de status no painel e na conta do cliente.

Critério de saída da Fase 1:
- pagamento aprovado em fluxo real/sandbox oficial,
- webhook processando atualização de status,
- pedido consistente entre backend e UI.

## Fase 2 - Operacional (estabilização)

1. Consolidar ciclo de status com regras explícitas de transição.
2. Endurecer consistência de dados no detalhe de pedido (SKU/código/imagem sempre presentes quando aplicável).
3. Validar de ponta a ponta a fila de email transacional (pedido criado + pagamento aprovado).
4. Garantir frete configurável por ambiente e visível antes da confirmação.

Critério de saída da Fase 2:
- operação consegue acompanhar e tratar pedidos sem intervenção manual de banco.

## Fase 3 - Refinamento (escala e governança)

1. Confirmar coleta real de GA/GTM em ambiente produtivo.
2. Definir SLOs de checkout, webhook e confirmação de pedido.
3. Expandir testes automatizados para cenários de falha (pagamento rejeitado, timeout, webhook atrasado).
4. Formalizar checklist de release com rollback frontend/backend.

Critério de saída da Fase 3:
- funil mensurável, operação monitorável e processo de deploy seguro.

## Plano de uso dos MCPs do Mercado Pago (playbook prático)

Pré-condição: autenticar o servidor MCP no ambiente do Cursor.

1. `application_list`
   - Objetivo: descobrir apps válidas e definir `application_id`.

2. `save_webhook`
   - Objetivo: registrar/atualizar callback de webhook.
   - Campos-chave:
     - `callback`
     - `callback_sandbox`
     - `topics: ["payment"]`
     - `application_id`

3. `notifications_history`
   - Objetivo: auditar falhas de entrega e motivo.
   - Uso: após ativação de webhook e primeiros pagamentos de teste.

4. `quality_checklist`
   - Objetivo: checklist oficial de qualidade da integração.
   - Uso: antes de considerar ready para produção.

5. `quality_evaluation`
   - Objetivo: avaliar qualidade a partir de `payment_id`/`order_id`.
   - Uso: em ciclos de homologação após pagamentos reais/sandbox.

6. `search_documentation`
   - Objetivo: resolver dúvidas de implementação por país/produto.
   - Recomendado: `language: "pt"` e `siteId: "MLB"`.

## Riscos imediatos e mitigação

- Risco: MCP sem autenticação ativa (`Not connected`).
  - Mitigação: concluir `mcp_auth` na sessão e repetir sequência de tools.

- Risco: webhook configurado mas inacessível/publicamente bloqueado.
  - Mitigação: validar endpoint externo + histórico de notificações.

- Risco: divergência entre status de pagamento e status de pedido.
  - Mitigação: monitorar `paymentWebhook`, reforçar idempotência e testes de regressão.

## Checkpoint sugerido para atualização semanal

Atualizar semanalmente estes indicadores:

1. % pagamentos aprovados com webhook recebido.
2. % pedidos sincronizados (pagamento aprovado == pedido pago).
3. Taxa de falha de notificação webhook.
4. Cobertura E2E do caminho crítico.
5. Pendências do `quality_checklist` MCP.

## Conclusão

A codebase evoluiu bastante desde o último report e já possui pilares essenciais que antes estavam ausentes (pedido pendente real, intent de pagamento, webhook, operação de pedidos, legal e eventos de analytics). O próximo salto para readiness de venda é menos de construção estrutural e mais de homologação disciplinada com o ecossistema Mercado Pago via MCP + validação E2E do fluxo de receita.

Decisão atual: **Pronto para venda = NAO**, com potencial de virar **SIM** após fechamento dos bloqueadores da Fase 1.
