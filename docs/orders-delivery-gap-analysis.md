# Orders System — Gap Analysis & Implementation Guide

**Data:** 2026-04-29  
**Autor:** Auditoria automatizada via Claude Code  
**Escopo:** `/dashboard/orders` e o ciclo completo de pedidos (criação → pagamento → entrega)

---

## Como usar este documento

Este documento foi escrito para que um desenvolvedor (ou o próprio Claude em sessões futuras) possa:
1. Entender o estado atual sem ler todo o código
2. Saber exatamente quais arquivos tocar para cada gap
3. Ter as métricas e assinaturas de dados necessárias para implementar
4. Distinguir o que é entrega mínima do que é manutenção futura (cobrável)

---

## Estado atual — o que funciona

| Recurso | Status | Arquivo(s) |
|---|---|---|
| Criar pedido (transacional, idempotente) | ✅ Funciona | `functions/index.js` → `createOrder` |
| Reserva de estoque no checkout | ✅ Funciona | `functions/index.js` → `resolveOrderItemsTx` |
| Integração MercadoPago Checkout Pro | ✅ Funciona | `functions/index.js` → `createCheckoutProPreference` |
| Webhook de pagamento (IPN + Webhooks) | ✅ Funciona | `functions/index.js` → `paymentWebhook` |
| Admin: lista paginada de pedidos (20/página) | ✅ Funciona | `src/pages/DashboardOrders.jsx` |
| Admin: filtro por status | ✅ Funciona | `src/pages/DashboardOrders.jsx` |
| Admin: expandir detalhes do pedido | ✅ Funciona | `src/pages/DashboardOrders.jsx` |
| Admin: atualizar status + pagamento + notas | ✅ Funciona | `functions/index.js` → `updateOrderStatusByAdmin` |
| Cliente: listar pedidos próprios | ✅ Funciona | `src/pages/OrdersList.jsx` |
| Cliente: detalhes do pedido | ✅ Funciona | `src/pages/OrderDetails.jsx` |
| Cliente: cancelar pedido pendente | ✅ Funciona | `functions/index.js` → `cancelOrderByCustomer` |
| **Enfileirar** email transacional | ✅ Funciona | `functions/index.js` → `queueTransactionalEmail` |
| **Enviar** email transacional | ❌ **NÃO IMPLEMENTADO** | — |

---

## Métricas importantes

### Cloud Functions

```
Region: southamerica-east1
Timeout: 60s (onCall) / 30s (email trigger)
Memory: 256MiB
Runtime: Node.js 22, ESM (type: "module")
SDK: firebase-functions v7.2.5, firebase-admin v12.7.0
```

### Estrutura Firestore — Pedido (`lojas/{lojaId}/orders/{orderId}`)

```json
{
  "orderNumber": "ESD-2025-001",
  "customerId": "uid",
  "customerEmail": "email@example.com",
  "customerName": "Nome Completo",
  "customerPhone": "+55 11 99999-9999",
  "customerDocument": "12345678901",
  "items": [{
    "productId": "...", "sku": "...", "productName": "...",
    "productImage": "url", "size": "G",
    "quantity": 2, "type": "sale",
    "unitPrice": 99.90, "lineTotal": 199.80
  }],
  "subtotal": 199.80, "discount": 0, "shipping": 25.00, "total": 224.80,
  "shippingAddress": { "street": "...", "number": "...", "city": "...", "state": "SP", "zipCode": "..." },
  "paymentMethod": "checkout_pro",
  "paymentStatus": "paid",
  "status": "pago",
  "payment": { "provider": "mercadopago", "preferenceId": "...", "checkoutUrl": "..." },
  "notes": "", "adminNotes": "",
  "createdAt": "Timestamp", "updatedAt": "Timestamp"
}
```

### Estrutura Firestore — Fila de Email (`lojas/{lojaId}/emailQueue/{docId}`)

```json
{
  "orderId": "...",
  "orderNumber": "ESD-2025-001",
  "type": "order_confirmation | payment_approved",
  "to": "email@example.com",
  "customerName": "Nome",
  "payload": { "total": 224.80, "paymentMethod": "checkout_pro" },
  "provider": "pending",
  "status": "queued | processing | sent | failed",
  "createdAt": "Timestamp",
  "updatedAt": "Timestamp"
}
```

### Status de pedido e transições permitidas

```
pendente → pago → enviado → entregue
pendente → cancelado (só pelo cliente, via Cloud Function)
```

### Tipos de email enfileirados

| `type` | Quando é enfileirado |
|---|---|
| `order_confirmation` | Ao criar o pedido (`createOrder`) |
| `payment_approved` | Ao webhook confirmar pagamento OU admin marcar como pago |

---

## Gaps para entrega mínima

### 1. ❌ Email nunca chega — CRÍTICO

**Problema:** `queueTransactionalEmail()` salva corretamente em `emailQueue`, mas nenhuma Cloud Function processa essa fila. Emails são enfileirados e ficam com `status: "queued"` para sempre.

**Impacto:** Cliente finaliza compra e não recebe nenhuma confirmação. Pagamento aprovado → silêncio total.

**Solução:** Cloud Function `processEmailQueue` com trigger `onDocumentCreated` na collection `emailQueue`. Usar **Resend** como provedor de email (REST API, free tier 3.000 emails/mês, 100/dia).

**Arquivos a criar/modificar:**
- `functions/src/email-templates.js` — templates HTML das duas notificações
- `functions/index.js` — adicionar import e export `processEmailQueue`
- `functions/package.json` — adicionar `"resend": "^4.0.0"`

**Variáveis de ambiente necessárias (Firebase Functions config):**
```
RESEND_API_KEY=re_xxxxxxxxxxxx
EMAIL_FROM=ESDRA Aromas <noreply@esdra.com.br>
```
> O domínio `esdra.com.br` precisa ser verificado no painel do Resend (DNS TXT).

**Status:** ✅ Implementado em 2026-04-29

---

### 2. ✅ Impressão de pedido (admin)

**Problema:** Admin não tinha como imprimir o slip do pedido para separação/envio.

**Solução implementada:** Botão "Imprimir pedido" no painel expandido de cada pedido. Ao clicar, `handlePrint` copia os dados persistidos para `printingOrder` (state), aciona `window.print()` e restaura o estado no evento `afterprint`. Um `<div class="printSlip">` oculto na UI normal fica visível durante a impressão via `@media print`, exibindo comprador, endereço, tabela de itens e resumo financeiro em layout limpo preto-e-branco.

**Arquivos modificados:**
- `src/pages/DashboardOrders.jsx`
- `src/pages/DashboardOrders.module.scss`

**Status:** ✅ Implementado em 2026-04-30

---

### 3. ✅ Busca de pedidos no admin

**Problema:** `DashboardOrders` só tinha filtro por status.

**Solução implementada:** Campo de busca por número do pedido, nome ou email do cliente. Filtro client-side no `useMemo` usando `normalizeString` (já existia em `src/firebase.js`) para busca sem acento. Limitação conhecida: só filtra pedidos já carregados na página atual (20/lote) — pedidos históricos ainda não carregados não aparecem nos resultados.

**Arquivos modificados:**
- `src/pages/DashboardOrders.jsx`
- `src/pages/DashboardOrders.module.scss`

**Status:** ✅ Implementado em 2026-04-30

---

### 4. ✅ Campo de código de rastreio

**Problema:** Não havia campo `trackingCode` no modelo de dados nem na UI.

**Solução implementada:**
- `updateOrderStatusByAdmin` aceita e salva `trackingCode` condicionalmente no Firestore (mesmo padrão de `adminNotes`)
- Painel expandido do admin tem input monospace "Código de rastreio" — salvo pelo botão "Salvar" da seção "Gerenciar pedido"
- `OrderDetails.jsx` exibe cartão azul com código e link direto para rastreamento nos Correios quando `trackingCode` existe E `status` é `"enviado"` ou `"entregue"`
- `trackingCode` flui pelo `orderDrafts` existente sem estado extra

**Arquivos modificados:**
- `functions/index.js` → `updateOrderStatusByAdmin`
- `src/pages/DashboardOrders.jsx`
- `src/pages/DashboardOrders.module.scss`
- `src/pages/OrderDetails.jsx`
- `src/pages/OrderDetails.module.scss`

**Status:** ✅ Implementado em 2026-05-06

---

## Implementação posterior — cobrar manutenção

Estes itens não bloqueiam a entrega mínima. Tratar como escopo de manutenção separado.

| Item | Complexidade | Notas |
|---|---|---|
| Templates de email com visual da marca | Média | Resend suporta React Email para templates avançados |
| Filtro por período/data de criação | Baixa | Client-side sobre dados carregados; server-side para histórico |
| Exportar pedidos para CSV | Baixa | `Papa.parse` ou geração manual de blob CSV |
| Gestão de devoluções e reembolsos | Alta | API de refund do MercadoPago + reversão de estoque + email |
| Notificações por SMS | Média | Twilio ou Zenvia — novo provider além do email |
| Integração com transportadoras (Correios/Jadlog) | Alta | API dos Correios para calcular frete e rastrear |
| Relatório de vendas / métricas | Média | Agregações Firestore ou BigQuery export |
| Atualização em massa de status | Baixa | Batch update com checkbox multi-seleção |

---

## Skills necessários para implementar os gaps

### Gap 1 (Email) — já implementado
- Firebase Functions v2 `onDocumentCreated` (Firestore trigger)
- Resend SDK (`import { Resend } from "resend"`)
- HTML para email (tabelas inline, sem CSS externo)
- Firebase Functions env vars (`firebase functions:config:set` ou `.env` no Functions)

### Gap 2 (Print)
- CSS `@media print` com `display:none` nos elementos não-imprimíveis
- `window.print()` via JavaScript
- CSS `page-break` para controle de quebra de página

### Gap 3 (Busca)
- `useMemo` com filtro sobre o array de pedidos carregado
- Normalização de string para busca sem acento (já existe `normalizeString` em `src/firebase.js`)

### Gap 4 (Rastreio)
- Adicionar `trackingCode` na chamada `updateOrderStatusByAdmin` (Cloud Function)
- Input controlado no `DashboardOrders` com estado `orderDrafts` (já existe)
- Condicional de exibição em `OrderDetails` quando `status === "enviado"`

---

## Configuração de ambiente necessária para o email funcionar

```bash
# No diretório functions/, criar .env (para emulador) ou configurar no Firebase Console
RESEND_API_KEY=re_xxxxxxxxxxxx
EMAIL_FROM=ESDRA Aromas <noreply@esdra.com.br>
APP_URL=https://esdra.com.br  # já deve existir
```

> **Importante:** O domínio do remetente (`esdra.com.br`) precisa ser verificado em
> https://resend.com/domains — adicionar registros DNS TXT e MX fornecidos pelo Resend.
> Enquanto não verificado, usar `onboarding@resend.dev` como sender de teste.

---

## Status geral da entrega

| # | Gap | Status |
|---|---|---|
| 1 | Email transacional | ✅ Implementado 2026-04-29 |
| 2 | Impressão de pedido (admin) | ✅ Implementado 2026-04-30 |
| 3 | Busca de pedidos no admin | ✅ Implementado 2026-04-30 |
| 4 | Campo de código de rastreio | ✅ Implementado 2026-05-06 |

**Todos os gaps de entrega mínima estão implementados.**

---

## Próximos passos operacionais (não são código)

1. **Deploy das Cloud Functions** — `processEmailQueue` e `updateOrderStatusByAdmin` (com `trackingCode`) precisam de deploy:
   ```bash
   cd functions && firebase deploy --only functions
   ```

2. **Deploy do frontend** — mudanças em `DashboardOrders` e `OrderDetails` precisam de build e deploy do hosting.

3. **Verificar domínio no Resend** — `esdraaromas.com.br` precisa de registros DNS (SPF/DKIM) verificados em https://resend.com/domains para emails saírem em produção. Sem isso, `processEmailQueue` vai retornar erro 403 do Resend mesmo com API key válida.