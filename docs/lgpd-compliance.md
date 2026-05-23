# LGPD Compliance — Esdra Aromas

**Última revisão:** 22/05/2026  
**Score atual:** 74/100  
**Meta:** ≥ 70/100 (operação com risco residual baixo)

---

## Score por Dimensão

| Dimensão | Atual | Meta | Status |
|----------|------:|-----:|--------|
| Coleta e base legal | 17/20 | 16/20 | 🟢 |
| Segurança técnica | 18/20 | 17/20 | 🟢 |
| Transparência e direitos do titular | 17/20 | 16/20 | 🟢 |
| Governança e documentação | 12/20 | 12/20 | 🟢 |
| Gestão de incidentes e rastreabilidade | 10/20 | 9/20 | 🟢 |
| **TOTAL** | **74/100** | **70/100** | **🟢** |

---

## Itens por Prioridade

### 🔴 Crítico — risco imediato de sanção

| ID | Item | Arquivo/Local | Métrica de conclusão | Status |
|----|------|--------------|----------------------|--------|
| C1 | Banner de consentimento de cookies bloqueia GTM/GA até aceite explícito | `src/main.jsx` | GA/GTM só dispara após `localStorage["esdra_analytics_consent"] === "true"` | ✅ Concluído (22/05/2026) |
| C2 | Política de Privacidade completa com todos os campos do art. 9º LGPD | `src/pages/PrivacyPolicy.jsx` | Contém: controlador, DPO/contato, lista de dados, retenção, operadores, canal de direitos, cookies | ✅ Concluído (22/05/2026) — ⚠️ preencher endereço e nome do DPO |
| C3 | Canal de exercício de direitos do titular (art. 18) acessível na conta | Novo componente/e-mail | Link ou formulário funcional acessível em `/account` e na Política | ✅ Concluído (22/05/2026) |

---

### 🟠 Alto — resolver em 1 semana

| ID | Item | Arquivo/Local | Métrica de conclusão | Status |
|----|------|--------------|----------------------|--------|
| A1 | Remover e-mail hardcoded do código-fonte | `functions/index.js:553` | Zero ocorrências de e-mail literal no repo (`grep -r "@gmail"`) | ✅ Concluído (22/05/2026) |
| A2 | TTL e purge automático da coleção `emailQueue` após envio confirmado | `functions/index.js` | Job/trigger apaga docs com `status=sent` após 30 dias | ✅ Concluído (22/05/2026) |
| A3 | Política de retenção para `orders.payment.rawPayload` | `functions/index.js` | Campo removido ou nulificado após 90 dias por job agendado | ✅ Concluído (22/05/2026) |
| A4 | MFA obrigatório para contas admin | Firebase Console + Docs | Accounts com `admin: true` bloqueadas sem segundo fator | ⬜ Pendente |
| A5 | Sanitizar CPF, e-mail e telefone nos logs do servidor | `functions/index.js` | `grep customerDocument\|customerPhone` nos Cloud Logs retorna zero em texto claro | ✅ Concluído (22/05/2026) |

---

### 🟡 Médio — resolver em 30 dias

| ID | Item | Arquivo/Local | Métrica de conclusão | Status |
|----|------|--------------|----------------------|--------|
| M1 | Política de retenção de clientes inativos (exclusão/anonimização) | Firestore + Functions | Job agendado + campo `deletedAt` com rotina documentada | ⬜ Pendente |
| M2 | Checkbox de aceite aos Termos + Política com versão e timestamp gravado | `src/components/Login.jsx` + Firestore | Campo `customers.legalConsent.acceptedAt` preenchido no cadastro | ⬜ Pendente |
| M3 | ROPA — Registro de Operações de Tratamento | `docs/ropa.md` | Documento com: finalidade, base legal, dados, operadores, retenção, de cada tratamento | ⬜ Pendente |
| M4 | `ViaCEP` documentado como suboperador na Política | `PrivacyPolicy.jsx` | Mencionado na seção "Compartilhamento" com finalidade | ✅ Concluído (22/05/2026) |
| M5 | Regra explícita deny-all para `emailQueue` e `idempotency` no Firestore Rules | `firestore.rules` | Regras explícitas presentes no arquivo | ✅ Concluído (22/05/2026) |
| M6 | CNPJ e razão social preenchidos na Política de Privacidade | `src/pages/PrivacyPolicy.jsx` | Campo controlador exibe CNPJ 66.664.303/0001-17 | ✅ Concluído (22/05/2026) |
| M7 | E-mail de contato LGPD corrigido em todos os arquivos | `PrivacyPolicy.jsx`, `DataRights.jsx`, `Footer.jsx` | `esdrasaromas` → `esdraaromas` corrigido; e-mails agora chegam ao destino correto | ✅ Concluído (22/05/2026) |
| M8 | Purge automático de `dataRightsRequests` após 5 anos | `functions/index.js` | Job agendado apaga solicitações com mais de 5 anos | ⬜ Pendente |

---

### 🟢 Baixo — melhoria contínua

| ID | Item | Arquivo/Local | Métrica de conclusão | Status |
|----|------|--------------|----------------------|--------|
| B1 | `console.error` em produção guardados por `isDev` ou substituídos por logger | `src/firebase.js`, `CartContext.jsx`, `AuthContext.jsx` | Zero `console.` diretos fora do `logger.js` em arquivos de produção | ⬜ Pendente |
| B2 | CPF pseudonimizado/mascarado em ambientes de dev/staging | Fixtures de teste | Nenhum CPF real em `tests/`, `scripts/` ou seeds | ⬜ Pendente |
| B3 | DPO/Encarregado designado e divulgado na Política | Fora do código | Nome ou canal do Encarregado publicado na Política de Privacidade | ⬜ Pendente |
| B4 | Rate limiting nas Cloud Functions públicas (`socialRender`, `dataRightsRequests`) | `functions/index.js` | Máximo de requisições por IP por hora configurado | ⬜ Pendente |

---

## Histórico de Iterações

| Data | Score | Itens concluídos | Observações |
|------|------:|-----------------|-------------|
| 22/05/2026 | 38/100 | — | Análise inicial |
| 22/05/2026 | 43/100 | C1 | Banner de cookies + bloqueio de GA/GTM implementados |
| 22/05/2026 | 54/100 | C2, M4 | Política de Privacidade reescrita (art. 9º completo); ViaCEP declarado como operador |
| 22/05/2026 | 62/100 | C3 | Canal LGPD: formulário `/privacidade/direitos`, trigger admin via Resend, Firestore rules, links em footer/account/política |
| 22/05/2026 | 70/100 | A1, A5, M5 | E-mail hardcoded removido; e-mail mascarado nos logs; deny-all explícito em emailQueue/idempotency/meta |
| 22/05/2026 | 71/100 | A3 | Job diário `purgeOrderRawPayload` limpa `payment.rawPayload` em pedidos com mais de 90 dias |
| 22/05/2026 | 72/100 | A2 | Job diário `purgeEmailQueue` deleta documentos com mais de 30 dias |
| 22/05/2026 | 74/100 | M6, M7 | CNPJ preenchido; e-mail de contato LGPD corrigido (`esdrasaromas` → `esdraaromas`) em 3 arquivos; novos itens M8/B4 identificados |

---

## Como Atualizar Este Documento

Ao concluir um item:
1. Troque `⬜ Pendente` por `✅ Concluído (DD/MM/AAAA)`
2. Atualize o score estimado na tabela de dimensões
3. Adicione uma linha no Histórico de Iterações com a data, score recalculado e itens concluídos

**Estimativa de ganho por grupo:**

| Grupo | Pontos ganhos ao concluir todos os pendentes |
|-------|---------------------------------------------:|
| Altos (A4) | +2 pts |
| Médios (M1, M2, M3, M8) | +7 pts |
| Baixos (B1, B2, B3, B4) | +4 pts |
| **Potencial restante** | **+13 pts → 87/100** |
