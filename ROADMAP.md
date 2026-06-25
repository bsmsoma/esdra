# Roadmap de produção — ESDRA Aromas

**Última atualização:** 2026-06-19
**Stack real:** React 18 + Firebase (Firestore + Auth) + Cloud Functions (Node 20 ESM) + Mercado Pago Checkout Pro + Resend + Netlify

> Este documento é uma adaptação de um template de roadmap escrito originalmente para um projeto em Supabase. Aqui todas as referências foram mapeadas para os equivalentes reais em Firestore/Cloud Functions. Documento vivo — atualizar a cada checagem do `/loop`.

---

## Visão geral

| Fase | Foco | Status |
|------|------|--------|
| **A — Fundação** | Segurança de dados + modelo de pedido/pagamento | ✅ Concluída |
| **B — Pagamentos** | Mercado Pago (Cloud Function + webhook + estados) | ✅ Concluída |
| **C — Estabilização** | Testes, frete, deploy do front, operação | 🔄 Testes E2E ✅ · gaps abaixo |
| **D — Go-live** | Legal, credenciais prod, monitoramento, corte | 🔄 LGPD ✅ · resto pendente/a verificar |

---

## Arquitetura atual (Firebase)

| Camada | Onde | Detalhe |
|--------|------|---------|
| Produtos/Pedidos/Carrinho | Firestore | `orders/{orderId}`, `products/{id}/inventory/{size}` |
| Criação de pedido | Cloud Function callable `createOrder` (`functions/index.js:520-767`) | Transação: reserva estoque + cria order + payment intent + enfileira emails |
| Cancelamento | Cloud Function `cancelOrderByCustomer` (`functions/index.js:971-1020`) | Só `status=pendente`; libera estoque reservado |
| Webhook MP | Cloud Function HTTP `paymentWebhook` (`functions/index.js:842-908`) | Região `southamerica-east1`, suporta IPN e webhook |
| Status do pedido | `orders/{id}.status` (`pendente/pago/enviado/entregue/cancelado`) + `orders/{id}.paymentStatus` (`pending/paid/failed/refunded`) | Mapeado por `mapPaymentStatusToOrderStatus()` (`functions/src/payment-utils.js:11-15`) |
| Emails transacionais | Resend via fila `emailQueue` + trigger `processEmailQueue` (`functions/index.js:1364-1465`) | Templates em `functions/src/email-templates.js` |
| Auth | Firebase Auth | Custom claims para role admin |
| Deploy frontend | Netlify (`netlify.toml`) | Domínio `esdraaromas.com.br` |
| Deploy backend | `firebase deploy --only functions` | Node 20 ESM, 256MiB, timeout 60s |

---

## Fase A — Fundação ✅

- [x] Pedidos escritos exclusivamente via Cloud Function callable (`createOrder`) — sem escrita direta do cliente no Firestore
- [x] Checkout Pro escolhido como método de pagamento
- [x] Secrets nas env vars das Cloud Functions (`functions/.env`, nunca no browser)
- [x] Webhook URL configurada (`PAYMENT_WEBHOOK_URL`) e registrada no painel do MercadoPago
- [x] Idempotência na criação de pedido via `idempotency/{uid}_{idempotencyKey}` (`functions/index.js:542-555`)

---

## Fase B — Pagamentos ✅

- [x] Preference MP criada no servidor (`createMercadoPagoPaymentIntent`, `functions/index.js:270-340`)
- [x] Webhook HTTPS deployado em `southamerica-east1` e registrado no MP
- [x] Estados do pedido: `pendente` → `pago` / `enviado` / `entregue` / `cancelado` (Firestore, não Supabase)
- [x] Pedido só marcado como `pago` após confirmação do webhook MP (`handleMercadoPagoNotification`, `functions/index.js:809`)
- [x] Cloud Functions deployadas (Node 20 ESM, 2nd Gen)
- [x] Emails transacionais via Resend: `order_confirmation`, `payment_approved`, `new_order_admin`

### Gap conhecido

- [x] **[MELHORIA] Early-skip no webhook** — Corrigido em `updateOrderFromPayment` (`functions/index.js:770-792`): agora retorna early sem escrever no Firestore quando `providerPaymentId` e `paymentStatus` já são idênticos aos gravados no pedido, evitando UPDATE redundante.
  - ⚠️ Limitação restante: o round-trip à API do MP em `handleMercadoPagoNotification` (`functions/index.js:809-840`) ainda acontece a cada notificação, pois o `orderId` só é conhecido após buscar o payment via `Payment.get()` (o `external_reference` não vem no payload do IPN/webhook). Evitar essa chamada exigiria um cache separado por `mpPaymentId` — fora do escopo de correção pontual.

---

## Fase C — Estabilização 🔄

### Testes

- [x] Suite E2E Playwright: `tests/e2e/checkout.spec.js` (11 testes, fluxo autenticado/sandbox/mocking de `createOrder`) + `tests/e2e/critical-flow.spec.js` (smoke: checkout success, links legais)
- [ ] **Sem testes de integração do webhook `paymentWebhook`** — nenhum teste simula notificação IPN/webhook do MP. Adicionar teste que dispara `paymentWebhook` com payload mockado e valida transição de `paymentStatus`.
- [ ] Sem testes automatizados para: idempotência de `createOrder`, cancelamento, conflito de estoque, purge jobs (LGPD)

### Frete

- [x] **Estratégia definida e implementada:** frete fixo via `VITE_CHECKOUT_SHIPPING_FIXED` (`src/pages/Checkout.jsx:120-123`), exibido na UI do checkout (`shipping`/`finalTotal`, linhas 184-186, 387-388).

### Deploy do frontend

- [x] Deploy Netlify configurado (`netlify.toml`, SPA redirect, header COOP para `signInWithPopup`)
- [x] Domínio `esdraaromas.com.br` configurado (`SITE_URL`/`APP_URL`)
- [ ] 🔍 **A verificar (não confirmável via CLI/API local)** — site Netlify está vinculado (`siteId` em `.netlify/state.json`) e o remote do repo (`github.com/bsmsoma/esdra`) confere com `origin`. Porém a API do GitHub não retorna nenhum commit status do Netlify para o commit mais recente (`GET /commits/main/status` → `total_count: 0`), o que é inconclusivo — pode ser que a integração não publique commit status. **Precisa confirmar diretamente no dashboard da Netlify** se o deploy mais recente corresponde ao commit `7ac7cb8` e se HTTPS está ativo em produção.

---

## Fase D — Go-live 🔄

### LGPD ✅

- [x] Score atual: **74/100** (meta 70/100) — `docs/lgpd-compliance.md`, revisão 22/05/2026
- [x] Páginas `/privacidade`, `/termos`, `/data-rights` implementadas e linkadas
- [x] Banner de cookies bloqueando GA/GTM até consentimento
- [x] Purge automático `emailQueue` (30 dias) e `orders.payment.rawPayload` (90 dias)
- [x] CPF/telefone sanitizados em logs; CNPJ e razão social na Política
- [ ] Pendentes (não bloqueantes para go-live): MFA admin, anonimização de clientes inativos, ROPA, timestamp de aceite legal

### Correções obrigatórias (bloqueantes)

- [ ] **[MELHORIA] Early-skip no webhook** (ver Fase B)

### Checklist de go-live

- [x] Nenhum pedido criável pelo cliente sem passar pela Cloud Function
- [x] Pagamento aprovado só após confirmação do MercadoPago (webhook)
- [x] CheckoutSuccess/feedback de status implementado (ver `tests/e2e/critical-flow.spec.js`)
- [x] Páginas legais mínimas publicadas
- [x] Deploy de frontend com domínio configurado
- [ ] 🔍 **Credenciais MP produção** — `functions/.env` local não contém a chave `MP_SANDBOX` nem `PAYMENT_WEBHOOK_SECRET`/`ADMIN_EMAIL` (só tem `PAYMENT_PROVIDER`, `MERCADOPAGO_ACCESS_TOKEN`, `PAYMENT_WEBHOOK_URL`, `APP_URL`, `DEFAULT_STORE_ID`, `RESEND_API_KEY`, `EMAIL_FROM`) — possivelmente as demais estão só no Secret Manager/produção. O prefixo do `MERCADOPAGO_ACCESS_TOKEN` local não é conclusivo por si só (contas de teste do MP também emitem credenciais no formato `APP_USR-`). **Precisa confirmar manualmente no painel do Mercado Pago** a qual aplicação/conta essa credencial pertence antes do go-live — não decidir só pelo formato do token.
- [ ] **Monitoramento** — não encontrado: nenhuma Alerting Policy (Firebase/Cloud Monitoring) para erros de function ou falhas de webhook. Logging estruturado existe (`logInfo`/`logError`), mas sem alertas configurados.
- [ ] Smoke test com valor mínimo real antes de abrir para clientes
  - ⚠️ Confirmado: não existe pipeline de CI (`.github/workflows` ausente) — testes E2E/Playwright não rodam automaticamente em push/PR, só localmente. Deploy de frontend e functions é manual/via integração direta da Netlify. Considerar workflow de CI antes do go-live para rodar a suite `tests/e2e` automaticamente.
- [ ] Plano de rollback documentado (reverter deploy Netlify, desativar checkout via env var)
- [ ] Congelamento de merges não-críticos na véspera do go-live

---

## Env vars das Cloud Functions (referência real, `functions/.env`)

| Variável | Descrição |
|---|---|
| `PAYMENT_PROVIDER` | `mercadopago` |
| `MERCADOPAGO_ACCESS_TOKEN` | Token MP (verificar se ainda é de teste) |
| `MP_SANDBOX` | `true` em teste; remover em produção |
| `PAYMENT_WEBHOOK_URL` | URL pública da function `paymentWebhook` |
| `PAYMENT_WEBHOOK_SECRET` | Secret para validação de webhooks manuais |
| `APP_URL` / `SITE_URL` | URL base do frontend (`esdraaromas.com.br`) |
| `DEFAULT_STORE_ID` | Loja padrão (multi-tenant) |
| `RESEND_API_KEY` | Chave do Resend para emails |
| `EMAIL_FROM` | Remetente dos emails |
| `ADMIN_EMAIL` | Email do admin para notificação de novos pedidos |
| `MERCADOPAGO_SANDBOX_PAYER_*` | Dados de teste sandbox |

---

## Histórico de checagens do `/loop`

- 2026-06-19 — Criação do documento, levantamento inicial via agente Explore (estado real do código).
- 2026-06-19 — 1ª auditoria: (1) corrigido early-skip de idempotência em `updateOrderFromPayment` (`functions/index.js`); (2) confirmado que frete fixo já está implementado (`Checkout.jsx`) — item movido para concluído; (3) confirmado que `functions/.env` local não tem `MP_SANDBOX`/`PAYMENT_WEBHOOK_SECRET`/`ADMIN_EMAIL` — marcado para verificação manual no painel MP antes do go-live, sem supor produção vs. teste pelo formato do token.
- 2026-06-19 — 2ª auditoria: sem código novo desde a última checagem (nenhum commit após `7ac7cb8`). Verificado link Netlify (`siteId` presente) e remote GitHub, mas API do GitHub não confirma commit status do deploy — marcado como pendência externa (checar dashboard Netlify diretamente). Sem novos gaps de código corrigíveis nesta passada; itens restantes (testes de webhook, monitoramento/alertas, ROPA/MFA admin) continuam exigindo trabalho maior, fora do escopo de correção pontual.
- 2026-06-19 — Commit `a03f9a6` (early-skip de idempotência + este roadmap) feito e enviado para `origin/main`.
- 2026-06-19 — 3ª auditoria: nenhum commit novo desde `a03f9a6`. Confirmado que não existe `.github/workflows` no repo — sem pipeline de CI rodando a suite `tests/e2e` automaticamente; deploy é manual/integração direta Netlify. Adicionado ao item "Smoke test" do checklist de go-live. Sem outros gaps pequenos corrigíveis encontrados.

*Documento vivo — atualizado pelo `/loop` a cada checagem.*
