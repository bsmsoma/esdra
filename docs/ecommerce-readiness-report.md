# Relatório de Prontidão de E-commerce

Projeto analisado: `ESDRA`  
Data: 2026-04-16

## Status geral

- Pronto para venda? (SIM/NAO): **NAO**
- Score geral: **7%** (1 de 14 requisitos em `ATINGIDO`)
- Score caminho crítico: **0%** (0 de 5 itens críticos em `ATINGIDO`)

Regra aplicada: se o usuário não consegue pagar de forma real, o sistema falhou para venda em produção.

## Avaliação por requisito

- Estrutura: `ATINGIDO`
- Produto: `PARCIAL`
- Carrinho: `PARCIAL`
- Checkout: `PARCIAL`
- Pedido: `PARCIAL`
- Frete: `NAO_ATINGIDO`
- Comunicação: `NAO_ATINGIDO`
- Admin: `PARCIAL`
- Métricas: `NAO_ATINGIDO`
- Performance: `PARCIAL`
- Mobile: `PARCIAL`
- Legal: `NAO_ATINGIDO`
- Infra: `PARCIAL`
- Teste final: `NAO_ATINGIDO`

## Evidências principais da codebase

- Estrutura de rotas contemplada em `src/App.jsx` (home, listagem, produto, carrinho, checkout, sucesso, login/cadastro, conta e dashboard).
- Checkout existe em `src/pages/Checkout.jsx`, mas frete está fixado em `0` e exibido como "Calculado após confirmação".
- Criação de pedido existe em `functions/index.js` (`createOrder`), com persistência e idempotência.
- `createOrder` marca pedido como pago/confirmado diretamente (`paymentStatus: "paid"` e `status: "confirmed"`), sem gateway real.
- Não há scripts de GA/GTM em `index.html` e não há eventos de e-commerce (`view_item`, `add_to_cart`, `begin_checkout`, `purchase`) no código de `src/`.
- Admin atual (`src/pages/Dashboard.jsx`) foca em catálogo/estoque, sem operação de pedidos.

## Gaps críticos

- Pagamento real (`PARCIAL`)
  - Impacto: bloqueia venda real e conciliação financeira.
  - Nível: `CRITICO`
  - Ação mínima: integrar gateway (Pix/cartão) com fluxo de autorização/captura e webhook de status.

- Frete operacional (`NAO_ATINGIDO`)
  - Impacto: preço final incorreto e risco de prejuízo por envio.
  - Nível: `CRITICO`
  - Ação mínima: implementar frete fixo configurável ou cálculo por CEP antes de confirmar compra.

- Pedido com ciclo de status mínimo (`PARCIAL`)
  - Impacto: operação e atendimento sem estado real de pagamento/expedição.
  - Nível: `CRITICO`
  - Ação mínima: garantir status mínimos `pendente`, `pago`, `enviado`, `entregue` e transições válidas.

- Teste final ponta a ponta (`NAO_ATINGIDO`)
  - Impacto: risco alto de regressão no fluxo de receita.
  - Nível: `CRITICO`
  - Ação mínima: criar testes E2E cobrindo `produto -> carrinho -> checkout -> pagamento -> pedido`.

## Gaps operacionais e de refinamento

- Produto (`PARCIAL`)
  - Impacto: inconsistência de cadastro e rastreabilidade comercial por ausência de SKU explícito no fluxo.
  - Nível: `MEDIO`
  - Ação mínima: padronizar `SKU` no domínio de produto e refletir no carrinho/pedido/admin.

- Checkout (`PARCIAL`)
  - Impacto: risco de pedido incompleto quando dados críticos não são validados no backend.
  - Nível: `CRITICO`
  - Ação mínima: validar servidor-side `nome`, `email`, `documento`, `telefone` e `endereço completo` antes de criar pedido.

- Comunicação (`NAO_ATINGIDO`)
  - Impacto: cliente sem confirmação formal e operação sem trilha de contato pós-compra.
  - Nível: `MEDIO`
  - Ação mínima: disparar email de confirmação do pedido e email de pagamento aprovado.

- Admin (`PARCIAL`)
  - Impacto: operação não consegue acompanhar fulfillment ponta a ponta.
  - Nível: `MEDIO`
  - Ação mínima: implementar listagem de pedidos e atualização de status operacional.

- Métricas (`NAO_ATINGIDO`)
  - Impacto: sem visibilidade de funil, CAC e abandono de checkout.
  - Nível: `MEDIO`
  - Ação mínima: instalar GA/GTM e rastrear `view_item`, `add_to_cart`, `begin_checkout`, `purchase`.

- Performance (`PARCIAL`)
  - Impacto: degradação de conversão em tráfego frio e mobile.
  - Nível: `BAIXO`
  - Ação mínima: definir orçamento de performance e monitorar LCP/INP/CLS nas páginas críticas.

- Mobile (`PARCIAL`)
  - Impacto: fricção de compra em telas pequenas.
  - Nível: `MEDIO`
  - Ação mínima: endurecer validações e feedback de erro no checkout mobile.

- Legal (`NAO_ATINGIDO`)
  - Impacto: risco jurídico e bloqueio de compliance.
  - Nível: `MEDIO`
  - Ação mínima: publicar política de privacidade e termos de uso versionados.

- Infra (`PARCIAL`)
  - Impacto: risco de indisponibilidade e confiança reduzida sem critérios formais de produção.
  - Nível: `MEDIO`
  - Ação mínima: validar domínio público, SSL e estratégia de rollback documentada.

## Plano de execução

### Fase 1 - Bloqueadores

1. Integrar pagamento real (Pix ou cartão) com confirmação assíncrona por webhook.
2. Corrigir modelo de pedido para não nascer como pago automaticamente.
3. Implementar cálculo de frete no checkout antes da finalização.
4. Garantir campos obrigatórios de checkout em payload validado no backend (nome, email, documento, telefone, endereço completo).
5. Criar suíte E2E do caminho crítico de compra.

Critério de saída da fase: pagamento aprovado com confirmação real, pedido persistido com status inicial correto e fluxo `produto -> carrinho -> checkout -> pagamento -> pedido` estável em teste automatizado.

### Fase 2 - Operacional

1. Implementar envio de email transacional (confirmação de pedido e pagamento aprovado).
2. Criar módulo admin para visualizar pedidos e atualizar status operacional.
3. Padronizar SKU no catálogo (além do `code`) e refletir corretamente em pedido/consulta.
4. Ajustar consistência de itens no pedido para exibir imagem/código no detalhe sem campos nulos.

Critério de saída da fase: operação consegue processar e acompanhar pedidos sem intervenção manual em banco e cliente recebe comunicação mínima obrigatória.

### Fase 3 - Refinamento

1. Instrumentar GA/GTM e eventos de e-commerce.
2. Definir orçamento de performance (LCP, INP, CLS) e monitoramento contínuo.
3. Fortalecer UX mobile do checkout com validações e feedback de erro.
4. Publicar páginas legais (política de privacidade e termos de uso) com versionamento.

Critério de saída da fase: funil mensurável, experiência estável em mobile e base de compliance publicada para operação contínua.

## Progresso por domínio

- Estrutura: 100%
- Carrinho: 80%
- Checkout: 45%
- Pagamento: 0%
- Pedido: 60%

## Métricas de aceite que precisam ser atingidas

### Receita e operação (bloqueadores)

- Taxa de sucesso de pagamento aprovado: **>= 95%** em tentativas válidas.
- Taxa de criação de pedido após pagamento aprovado: **100%**.
- Divergência entre pagamento aprovado e pedido com status pago: **0%**.
- Cálculo de frete no checkout: **100%** dos pedidos com frete definido antes da confirmação.
- Erro no fluxo crítico (`produto -> carrinho -> checkout -> pagamento -> pedido`): **<= 1%**.

### Qualidade de dados e rastreabilidade

- Pedidos com campos obrigatórios completos (cliente, endereço, itens, total, status): **100%**.
- Pedidos com ID único e idempotência efetiva: **100%**.
- Consistência de item exibido no detalhe do pedido (nome, código/SKU, imagem, preço): **>= 99%**.

### Conversão e observabilidade

- GA + GTM ativos em produção: **100%**.
- Cobertura de eventos (`view_item`, `add_to_cart`, `begin_checkout`, `purchase`): **100%** dos fluxos.
- Taxa de perda de evento crítico: **< 2%**.

### Performance e experiência

- Carregamento inicial de páginas críticas: **< 3s** em rede 4G mediana.
- Erros fatais de frontend no checkout (sessão): **< 0.5%**.
- Taxa de sucesso do checkout em mobile: **>= 95%**.

### Conformidade e produção

- Publicação de política de privacidade e termos de uso: **100%**.
- HTTPS/SSL ativo no domínio público: **100%**.
- Deploy funcional com rollback documentado para backend e frontend: **100%**.

## Conclusão executiva

O projeto já possui base sólida de catálogo, conta, carrinho e persistência de pedido, mas ainda não está pronto para venda real. O bloqueio principal é ausência de pagamento de verdade e de frete operacional, seguido por lacunas de operação (email/admin de pedidos), métricas e conformidade legal.

Decisão final: **Pronto para venda = NAO** enquanto não houver pagamento real funcional e fluxo ponta a ponta validado sem quebra.
