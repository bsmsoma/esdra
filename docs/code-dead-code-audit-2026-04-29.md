# Auditoria de Código Morto e Lógica Não Usada

**Data:** 2026-04-29  
**Escopo:** `src/**/*.{js,jsx,ts,tsx}`

---

## Resumo Executivo

O codebase está **relativamente limpo**. Não há arquivos inteiros abandonados, hooks com dependências erradas graves, ou componentes importados e nunca renderizados. Os problemas encontrados são pontuais e de baixa severidade, concentrados principalmente no fluxo de Apple Sign-In (desabilitado/incompleto).

---

## Problemas Encontrados

### Severidade: Média

| # | Arquivo | Linha(s) | Problema |
|---|---------|----------|---------|
| 1 | `src/components/Login.jsx` | 11, 256–276, 602–613 | Apple Sign-In desabilitado — **mantido intencionalmente** como lembrete de que requer conta paga Apple Developer |
| 4 | `src/pages/Checkout.jsx` | 367–372 | Bloco `if (discount > 0)` nunca executa pois `discount` está hardcoded em `0` |

### Severidade: Baixa (TODOs sem issue vinculada)

| # | Arquivo | Linha | Comentário |
|---|---------|-------|-----------|
| 5 | `src/components/Header.jsx` | 133 | `// TODO: implement a toast when the user is logged out` |
| 6 | `src/components/ProductsCardsLayout.jsx` | 120–121 | TODOs de filtro/sort que já existem implementados em `ProductsLayout.jsx` |
| 7 | `src/pages/Checkout.jsx` | 183 | `const discount = 0; // TODO: Apply coupons` — variável nunca muda |

---

## Detalhamento

### 1. Apple Sign-In (`Login.jsx`) — Intencional

O import `FaApple`, a função `handleAppleLogin` e o botão comentado estão mantidos **intencionalmente** como lembrete de que o Apple Sign-In requer assinatura ativa no Apple Developer Program (pago). Ativar quando a conta estiver disponível.

---

### 4. Bloco de desconto morto (`Checkout.jsx:367–372`)

```jsx
const discount = 0; // linha 183 — nunca muda

// linha 367–372 — nunca renderiza
{discount > 0 && (
    <div className={styles.summaryRow}>
        <span>Desconto:</span>
        <span>- R$ {formatPrice(discount)}</span>
    </div>
)}
```

**Ação recomendada:** Se cupons não estão no roadmap imediato, remover `discount` e o bloco condicional. Se estão, conectar a variável a um estado real.

---

### 5. Toast de logout (`Header.jsx:133`)

```jsx
// TODO: implement a toast when the user is logged out
```

O logout acontece mas o usuário não recebe feedback visual. Criar issue ou implementar.

---

### 6. TODOs de filtro/sort (`ProductsCardsLayout.jsx:120–121`)

```jsx
// TODO: a function to handle the filter of the products cards.
// TODO: a function to handle the sort of the products cards.
```

A lógica de filtro/sort já existe em `ProductsLayout.jsx`. Esses comentários são obsoletos.

**Ação recomendada:** Remover os dois comentários.

---

### 7. `discount = 0` (`Checkout.jsx:183`)

Já coberto no item 4. A variável em si é o problema, não só o bloco JSX.

---

## O que foi verificado e está OK

- Todos os imports de componentes em `App.jsx`, `Home.jsx`, `ProductDetails.jsx`, `ProductsLayout.jsx` estão sendo usados
- Hooks (`useState`, `useEffect`, `useMemo`, `useCallback`) com arrays de dependências corretos
- `CartContext.jsx` — todas as funções exportadas são consumidas
- `AuthContext.jsx` — sem lógica morta
- `utils/` — `logger.js`, `priceUtils.js`, `productMedia.js`, `productSizes.js`, `colors.js` todos importados em pelo menos um lugar
- `ErrorBoundary.jsx` — `console.error` dentro de `componentDidCatch` é intencional
- PropTypes: todos os props definidos com `propTypes` são passados pelos componentes pai

---

## Plano de Ação

### Remover agora (< 5 min, zero risco)
- [x] `ProductsCardsLayout.jsx:120–121` — TODOs obsoletos removidos (2026-04-29)

### Mantido intencionalmente
- `Login.jsx:11,256–276,602–613` — Apple Sign-In aguardando conta Apple Developer paga

### Decidir no próximo planning
- [ ] `Checkout.jsx:183,367–372` — implementar cupons ou remover variável + bloco
- [x] `Header.jsx:133` — toast de logout implementado com `toast.success("Até logo!")` (2026-04-29)

---

## Saúde Geral

| Categoria | Status |
|-----------|--------|
| Apple Sign-In desabilitado | Intencional — aguarda Apple Developer pago |
| Imports não usados | Nenhum (Apple Sign-In é intencional) |
| Funções mortas | Nenhuma (idem) |
| Código comentado | 1 bloco (idem) |
| Dead branches | 1 encontrado |
| Arquivos abandonados | Nenhum |
| Estados sem uso | Nenhum |
| Console.log de debug | Nenhum (todos são error handling legítimo) |
