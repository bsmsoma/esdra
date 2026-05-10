# Atualização de Prontidão E-commerce (Base MCP Mercado Pago)

Projeto analisado: `ESDRA`  
Data: 2026-05-07  
Base comparativa: `docs/ecommerce-readiness-update-2026-04-22.md`  
Commits analisados: 33 commits desde 2026-04-22 (HEAD: `2da4f00`)

## Objetivo desta atualização

Medir avanço real em relação ao relatório anterior, identificando quais blocos saíram de `PARCIAL`
para `ATINGIDO` e quais bloqueadores de go-live foram eliminados.

Regra de decisão mantida: se o usuário não consegue pagar de forma real e confirmar status por
webhook, o sistema ainda não está pronto para venda em produção.

## Resumo executivo

- 33 commits em 15 dias, com avanço expressivo em UI, admin, métricas e estabilidade backend.
- **Métricas saiu de PARCIAL para ATINGIDO**: GA4 + GTM inicializados em `main.jsx` com variáveis
  de ambiente; `analytics.js` dedicado; todos os 4 eventos críticos (`view_item`, `add_to_cart`,
  `begin_checkout`, `purchase`) corretamente disparados.
- Admin de pedidos ficou muito mais operacional: busca por texto, filtro por status, código de
  rastreio, impressão de pedido e logo nos emails.
- Inventário e reservas de estoque receberam fix de atomicidade relevante.
- Cancelamento de pedido pelo cliente implementado end-to-end.
- Home redesenhada como vitrine editorial com Swiper, carrinho mobile e auth popup fix no mobile.
- Os **3 bloqueadores de go-live remanescentes** (homologação MP real, webhook em produção
  auditável, E2E de receita) continuam em aberto — nenhum foi fechado neste ciclo.

Decisão atual: **Pronto para venda = NAO**, mas com score geral subindo de 21% para ~29%.

## O que mudou desde o relatório anterior

### 1) Métricas (PARCIAL → ATINGIDO — maior avanço do ciclo)

- `src/main.jsx` inicializa GA4 (`VITE_GA_MEASUREMENT_ID`) e GTM (`VITE_GTM_ID`) dinamicamente
  via JavaScript na montagem do app.
- `src/utils/analytics.js` centraliza `trackEvent`, com fallback gracioso quando `gtag`/`dataLayer`
  não estão disponíveis.
- Eventos ativos e com contexto correto:
  - `view_item` em `ProductDetails.jsx`
  - `add_to_cart` em `ProductDetails.jsx`
  - `begin_checkout` em `Checkout.jsx`
  - `purchase` em `CheckoutSuccess.jsx`
- Bloqueio anterior ("possível inicialização por outro ponto; validar em runtime") resolvido.

### 2) Admin de pedidos (ATINGIDO — reforçado)

- Busca por texto normalizado em `DashboardOrders.jsx` (`gap 3` fechado).
- Código de rastreio editável diretamente no painel com save via `updateOrderStatusByAdmin`
  (`gap 4` fechado).
- Impressão de pedido com layout dedicado via `window.print()` e slice `printSlip`.
- Logo PNG nos emails transacionais.

Impacto: operação consegue acompanhar pedidos, atualizar rastreio e imprimir ficha de separação
sem intervenção direta no banco.

### 3) Backend de produto (PARCIAL — melhora)

- `createProduct` exposto como `onCall`, saindo do padrão anterior que dependia de chamada direta
  ao Firestore pelo frontend.
- Media pipeline maduro: `createUploadSession`, `commitMedia`, `deleteMedia` com sessões e
  validação de MIME.
- CORS corrigido no contexto de chamadas de produto.

### 4) Inventário e reservas (PARCIAL — fix crítico)

- Cálculo de `reservedByOthers` corrigido: a reserva do próprio carrinho do usuário é subtraída
  antes de comparar disponibilidade, evitando bloqueio legítimo em checkouts simultâneos.
- Atomicidade da transação de inventário garantida via Firestore transaction.

### 5) Checkout (PARCIAL — refinamentos)

- Loading no botão de confirmação de pedido (UX melhorada, evita double-submit).
- Ícone Mercado Pago exibido no método de pagamento.
- `auto_return` removido da preferência MP (evitava redirect correto pós-pagamento).
- Frete ainda fixo via `VITE_CHECKOUT_SHIPPING_FIXED` — não há cálculo dinâmico por endereço.

### 6) Pedido — cancelamento pelo cliente (PARCIAL — melhora)

- `cancelOrderByCustomer` callable implementada no backend com validação de ownership e status.
- `OrderDetails.jsx` consome a callable corretamente.
- Email de cancelamento ainda não implementado.

### 7) Mobile e UI (PARCIAL — melhora expressiva)

- Carrinho mobile com acesso rápido no Header.
- Home redesenhada: imagem editorial estática, `scramble word`, hero com Swiper de vídeo,
  carrossel de lançamentos.
- `HydrateFallback` com contador animado 0→100 durante carregamento inicial.
- Fix de popup OAuth no mobile (Chrome): `same-origin-allow-popups` via `netlify.toml` e fallback
  `signInWithRedirect`.
- `ProductCard` com altura fixa e scroll contextual na descrição.

### 8) Performance (PARCIAL — melhora marginal)

- `vite.config.js` com `manualChunks`: bundle `vendor` (react, react-router) separado do bundle
  `firebase`.
- `@vitejs/plugin-react-swc` para build mais rápido.
- Sem lazy loading de rotas (`React.lazy`) — todas as páginas no bundle principal.
- Sem PWA/service worker.

### 9) Comunicação / email (PARCIAL — mantido)

- Dois tipos ativos: `order_confirmation` e `payment_approved`.
- Logo PNG nos emails (novo).
- Fila `emailQueue` via Firestore trigger `processEmailQueue` com Resend.
- **Ainda ausente**: email de atualização de rastreio/shipping (`shipping_update`).

### 10) E2E testes (PARCIAL — sem avanço)

- `tests/e2e/critical-flow.spec.js` mantém apenas 2 testes smoke:
  1. Rota `/checkout/success` renderiza sem `orderId`.
  2. Links legais acessíveis a partir do rodapé.
- Zero cobertura de: criação de pedido, pagamento, webhook, transição de status.

## Situação atual por requisito (baseline de 14 blocos)

- Estrutura: `ATINGIDO`
- Produto: `PARCIAL` (melhora — callable, media pipeline)
- Carrinho: `PARCIAL` (melhora — mobile, cleanup scheduler)
- Checkout: `PARCIAL` (melhora — loading, fix MP)
- Pedido: `PARCIAL` (melhora — cancelamento, inventário atômico)
- Frete: `PARCIAL` (fixo por env var, sem cálculo dinâmico)
- Comunicação: `PARCIAL` (melhora — logo, falta shipping email)
- Admin: `ATINGIDO` (reforçado — busca, rastreio, impressão)
- Métricas: `ATINGIDO` ← **subiu de PARCIAL**
- Performance: `PARCIAL` (melhora marginal — manualChunks)
- Mobile: `PARCIAL` (melhora — cart mobile, swiper, auth fix)
- Legal: `ATINGIDO`
- Infra: `PARCIAL` (melhora — funções deployadas, netlify.toml)
- Teste final: `PARCIAL` (sem avanço)

## Status geral atualizado

- Pronto para venda? (SIM/NAO): **NAO**
- Score geral estimado: **~29%** (4 de 14 em `ATINGIDO`, ante 3/14 = 21%)
- Score caminho crítico estimado: **~15%** (maturidade subiu, mas nenhum dos 5 bloqueadores
  de receita foi fechado neste ciclo)

## Gaps críticos remanescentes (go-live blockers — sem alteração de status)

### 1) Homologação real de pagamento Mercado Pago

- Status: `PARCIAL` (código maduro, sem evidência de ciclo real aprovado)
- Impacto: sem prova de aprovação/rejeição em sandbox homologado, risco financeiro permanece.
- Ação mínima:
  1. Confirmar `application_id` ativo via MCP `application_list`.
  2. Rodar ciclo completo com pagador de teste MP.
  3. Confirmar `payment_id` aprovado e pedido atualizado para `pago`.

### 2) Webhook confiável e auditável em produção

- Status: `PARCIAL` (código maduro, URL pública e segredo não confirmados em prod)
- Impacto: perda de notificação gera divergência entre pagamento e pedido.
- Ação mínima:
  1. Configurar `PAYMENT_WEBHOOK_URL` com URL pública do Firebase Function.
  2. Registrar webhook via MCP `save_webhook` com `topics: ["payment"]`.
  3. Auditar histórico com MCP `notifications_history`.

### 3) Frete dinâmico ou pelo menos transparente antes do checkout

- Status: `PARCIAL` (valor fixo por `VITE_CHECKOUT_SHIPPING_FIXED`, sem lógica por endereço)
- Impacto: valor de frete surprise no final do checkout aumenta abandono e gera disputas.
- Ação mínima para go-live simples:
  - Exibir o frete fixo configurado na página de produto e no carrinho antes do checkout.
  - Documentar a política de frete nas páginas legais.

### 4) Teste E2E de receita completo

- Status: `PARCIAL` (2 testes smoke sem cobertura de pagamento)
- Impacto: regressão silenciosa no fluxo de compra.
- Ação mínima:
  1. Adicionar teste: `produto → carrinho → checkout → mock de pagamento → pedido criado`.
  2. Adicionar teste: `webhook payload → status pedido atualizado`.
  3. Adicionar teste: `email transacional disparado em transição crítica`.

### 5) Email de atualização de rastreio

- Status: `PENDENTE` (não existe — novo gap identificado neste ciclo)
- Impacto: cliente não é notificado quando código de rastreio é adicionado pelo admin.
- Ação mínima:
  1. Criar template `shipping_update` em `email-templates.js`.
  2. Disparar `emailQueue` ao salvar `trackingCode` em `updateOrderStatusByAdmin`.

## O que não bloqueia go-live mas merece atenção

- **Lazy loading de rotas**: todas as páginas no bundle principal. Com o catálogo crescendo,
  dividir com `React.lazy` reduz TTI inicial.
- **SEO dinâmico por produto**: `<title>` e `<meta description>` são estáticos em `index.html`.
  Sem SSR ou SSG, crawlers não indexam conteúdo de produto.
- **Cupom/desconto**: `// TODO: Apply coupons` em `Checkout.jsx` — não é bloqueador mas sinaliza
  feature incompleta visível no código.
- **Sem email de cancelamento de pedido**: `cancelOrderByCustomer` não dispara email ao cliente.

## Plano de uso dos MCPs do Mercado Pago para fechar Fase 1

Ordem de execução:

1. `application_list` → identificar `application_id` da integração ativa.
2. `save_webhook` → registrar URL pública com `topics: ["payment"]`.
3. Rodar pagamento de teste via interface sandbox.
4. `notifications_history` → confirmar entrega da notificação.
5. `quality_checklist` → checklist oficial antes de declarar ready.
6. `quality_evaluation` → avaliar com `payment_id` do teste.

## Checkpoint de progresso (atualizar semanalmente)

| Indicador | Anterior (2026-04-22) | Atual (2026-05-07) |
|---|---|---|
| Score geral | 21% (3/14) | 29% (4/14) |
| Blocos ATINGIDO | Estrutura, Admin, Legal | + Métricas |
| Homologação MP | não iniciada | não iniciada |
| Webhook em prod | não configurado | não configurado |
| E2E de receita | 0% | 0% |
| Email de rastreio | n/a | gap identificado |
| Cancelamento cliente | ausente | implementado |
| Tracking admin | ausente | implementado |

## Conclusão

O ciclo 2026-04-22 → 2026-05-07 foi produtivo em **estabilidade, UX e operação**: métricas
atingiram status completo, o painel admin ficou operacional de verdade, o inventário ganhou
atomicidade correta e a experiência mobile avançou. A codebase está substancialmente mais madura.

O que **não avançou** foram exatamente os 3 bloqueadores de receita — homologação MP, webhook em
produção e E2E de pagamento. Esses 3 itens podem ser fechados em 1 a 2 sessões focadas usando
as ferramentas MCP disponíveis.

Decisão atual: **Pronto para venda = NAO**, com potencial de virar **SIM** após fechamento dos
bloqueadores 1, 2 e 4 da lista acima (Homologação MP + Webhook + E2E mínimo de receita).
