# Plano de Implementação — Befin (Fase 1: Local-First)

Este plano estrutura o início do desenvolvimento do **Befin**, um PWA mobile-first de *envelope budgeting* para divisão de dinheiro em "Caixinhas Turbo" de 2 a 3 bancos e conciliação bancária periódica.

---

## 1. Decisões Alinhadas

- **Escopo da Fase 1:** Aplicação 100% **Local-First** com **Dexie.js (IndexedDB)** e UI Core completa. Sync com **Turso (libSQL)** e **PWA/Serwist** ficam para a Fase 2, mas o schema local já nasce preparado (UUIDv7, `updated_at`, `deleted_at`).
- **UI & Ícones:** **shadcn/ui** + **@phosphor-icons/react** (em vez de Lucide), seguindo o design system *Warm Editorial* (`DESIGN_GUIDELINES.md`).
- **Documentação:** Atualizar `AGENTS.md` e `DESIGN_GUIDELINES.md` para refletir `@phosphor-icons/react`.
- **Bancos:** Tabela simples `banks` (2–3 bancos) para facilitar a soma dos saldos físicos na conciliação.
- **Crédito (`PENDING` → `PAID`):** Suporte a quitar tudo de uma vez ("Pagar Fatura") ou selecionar múltiplas transações (incluindo atalhos `Ctrl+Click` / `Shift+Click` no desktop e seleção múltipla no mobile).
- **Navegação:** Bottom Navigation Bar (**Início**, **Caixinhas**, **Extrato**, **Conciliar**) + **FAB central** para Nova Transação; **Terceiros** e **Bancos** acessíveis via menu/configurações.

---

## 2. Guardrails Matemáticos & Regras de Negócio

1. **Centavos (`INTEGER`):** Todos os valores monetários armazenados e calculados como inteiros (`amount_cents`). Formatação apenas na UI (`pt-BR` / `R$`).
2. **Saldo Livre ("Sala de Espera"):** Receitas (`INCOME`) entram com `to_envelope_id = null`. Podem ser distribuídas para caixinhas por valor fixo (`R$`) ou percentual (`%`), ou gastas diretamente.
3. **Caixinhas Acumulativas:** Saldos nunca resetam na virada do mês. Transferências (`TRANSFER`) movem saldo entre caixinhas sem alterar o patrimônio total.
4. **Cartão de Crédito (`PENDING` vs `PAID`):**
   - Pix/Débito (`PAID`): abate a caixinha e o saldo físico imediatamente.
   - Crédito (`PENDING`): abate o saldo disponível da caixinha imediatamente, mas mantém o dinheiro físico nos bancos até a quitação (`PAID`).
5. **Compras de Terceiros (`third_party_id != null`):** Referenciam a tabela `third_parties` (nunca hardcoded). **Não** abatem nenhuma caixinha virtual e são contabilizadas como *A Receber* agrupado por terceiro.
6. **Equação da Verdade (Conciliação):**
   $$\text{Saldo Esperado} = \text{Soma das Caixinhas} + \text{Saldo Livre} + \text{Crédito A Pagar (Usuária)} - \text{Crédito A Receber (Terceiros)}$$
   - **Discrepância > 0 (Sobra):** Se compatível com rendimentos informados, exibir CTA de 1 clique para enviar a sobra à caixinha com `is_emergency_fund = true`.
   - **Discrepância < 0 (Falta):** Proibido criar ajuste automático. Exibir valor faltante e lançamentos recentes para auditoria manual.

---

## 3. Etapas de Execução

### Etapa 1 — Setup de Base, Documentação e Design System
- Atualizar `AGENTS.md` e `DESIGN_GUIDELINES.md` substituindo referências a Lucide por `@phosphor-icons/react`.
- Instalar dependências core: `dexie`, `dexie-react-hooks`, `uuid` (ou gerador UUIDv7 leve), `clsx`, `tailwind-merge`.
- Inicializar `shadcn/ui` configurado para Tailwind v4 e adicionar componentes base (`button`, `card`, `dialog`, `drawer`, `input`, `label`, `select`, `badge`, `checkbox`, `tabs`).
- Configurar tokens *Warm Editorial* no `app/globals.css` e tipografia no `app/layout.tsx`.

### Etapa 2 — Camada Local-First (Dexie.js) & Domínio Financeiro
- Criar `src/lib/db.ts` com as tabelas:
  - `banks` (`id`, `name`, `balance_cents`, `updated_at`, `deleted_at`)
  - `envelopes` (`id`, `name`, `color`, `icon`, `is_emergency_fund`, `updated_at`, `deleted_at`)
  - `third_parties` (`id`, `name`, `updated_at`, `deleted_at`)
  - `transactions` (`id`, `type` [`INCOME` | `EXPENSE` | `TRANSFER`], `amount_cents`, `description`, `date`, `payment_method` [`PIX_DEBIT` | `CREDIT`], `status` [`PAID` | `PENDING`], `from_envelope_id`, `to_envelope_id`, `third_party_id`, `bank_id`, `updated_at`, `deleted_at`)
  - `reconciliations` (`id`, `date`, `expected_cents`, `actual_cents`, `yield_cents`, `discrepancy_cents`, `notes`, `updated_at`, `deleted_at`)
- Criar `src/lib/money.ts` (formatação `BRL`, parsing seguro de input para centavos inteiros, cálculo de percentuais sem perda de centavos).
- Criar `src/lib/ledger.ts` com funções puras e testáveis para:
  - Cálculo de Saldo Livre, saldo por Caixinha, Crédito A Pagar, A Receber por Terceiro.
  - Equação da Verdade (Conciliação).
  - Distribuição do Saldo Livre (`R$` ou `%`) e quitação em lote (`PENDING` → `PAID`).

### Etapa 3 — Shell Mobile-First & Navegação
- Implementar layout responsivo com Bottom Navigation Bar (**Início**, **Caixinhas**, **Extrato**, **Conciliar**) + **FAB central** para Nova Transação.
- Implementar Drawer/Modal de **Nova Transação** (Receita, Despesa Pix/Débito, Despesa Crédito, Transferência, com seleção opcional de Terceiro).
- Implementar menu/sheet de **Configurações** dando acesso ao CRUD de **Terceiros** (`third_parties`) e **Bancos** (`banks`).

### Etapa 4 — Telas Core
1. **Início (`/`):** Saldo Livre em destaque, resumo das Caixinhas, alerta de faturas `PENDING` e resumo *A Receber* de terceiros.
2. **Caixinhas (`/caixinhas`):** Lista de caixinhas, criação/edição (incluindo flag *Reserva de Emergência*), modal de distribuição do Saldo Livre (`R$` ou `%`) e transferência entre caixinhas.
3. **Extrato (`/extrato`):** Lista de transações com filtros (tipo, status `PENDING`/`PAID`, terceiro, caixinha). Modo de seleção múltipla com `Ctrl+Click` / `Shift+Click` (desktop) e checkboxes (mobile) + botão "Pagar Selecionadas" / "Pagar Tudo".
4. **Conciliação (`/conciliar`):** Inputs de saldo físico por banco cadastrado + rendimentos, cálculo em tempo real da Equação da Verdade, CTA de 1 clique para sobra → Reserva de Emergência, e lista de auditoria manual se houver falta.

### Etapa 5 — Testes Unitários (Vitest) & Verificação SDD
- Instalar `vitest` e configurar script `"test": "vitest run"` no `package.json`.
- **Suíte de Testes Unitários (`src/lib/__tests__/`):**
  - `money.test.ts`:
    - Parsing de strings PT-BR (`"1.234,56"`, `"0,99"`, `"100"`) para centavos inteiros (`123456`, `99`, `10000`).
    - Formatação `BRL` (`formatCents`).
    - Distribuição percentual sem perda/sobra de centavos (ex: `1000` centavos divididos em 33%/33%/34%).
  - `ledger.test.ts`:
    - **Saldo Livre:** `INCOME` com `to_envelope_id = null` aumenta Saldo Livre; distribuição `R$`/`%` move para caixinhas sem alterar patrimônio total.
    - **Caixinhas Acumulativas & Transferências:** `TRANSFER` move saldo entre caixinhas preservando soma total.
    - **Crédito (`PENDING` vs `PAID`):** `EXPENSE` no crédito (`PENDING`) abate caixinha imediatamente e entra em *Crédito A Pagar*; quitação em lote (`PENDING` → `PAID`) zera *Crédito A Pagar* sem abater caixinha novamente.
    - **Terceiros (`third_party_id != null`):** Compras de terceiros **não** abatem nenhuma caixinha e somam em *A Receber* agrupado por `third_party_id`.
    - **Equação da Verdade (Conciliação):**
      - Discrepância positiva (`actual > expected`) compatível com rendimentos sugere envio para `is_emergency_fund = true`.
      - Discrepância negativa (`actual < expected`) **não** gera transação automática de ajuste.
- **Critérios de Aceite SDD (Definition of Done):**
  - `pnpm test` passa 100% sem mocks que mascarem cálculos.
  - `pnpm lint` e `pnpm build` passam sem erros de TypeScript (`strict`).
  - Todas as telas core (`/`, `/caixinhas`, `/extrato`, `/conciliar`) operam 100% offline via Dexie.js.
