<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## 1. Visão Geral & Stack

- **Produto:** Befin (`befin` em caixa baixa na marca) — app mobile-first (PWA) de _envelope budgeting_ para dividir dinheiro concentrado em "Caixinhas Turbo" de 2 a 3 bancos e realizar conciliação bancária periódica.
- **Stack:** Next.js (App Router), TypeScript (strict), Tailwind CSS, shadcn/ui, @phosphor-icons/react, Dexie.js (IndexedDB local-first), Turso (libSQL na nuvem para sync multi-device) e Serwist/PWA.
- **Idioma da UI e Código:** Interface 100% em Português (PT-BR, moeda `R$` / `pt-BR`); código, variáveis e commits em Inglês.

---

## 2. Guardrails Matemáticos & Regras de Negócio (NUNCA VIOLAR)

1. **Dinheiro sempre em Centavos (`INTEGER`):**
   - Nunca use `float` ou `number` decimal no banco ou em cálculos internos. Armazene e opere sempre em centavos (`amount_cents: number` inteiro) e formate apenas na camada de exibição (`Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })`).
2. **Saldo Livre ("Sala de Espera"):**
   - Receitas (`INCOME`) entram primeiro no `Saldo Livre` (`to_envelope_id = null`). De lá, podem ser distribuídas para as caixinhas por valor fixo (`R$`) ou percentual (`%`), ou gastas diretamente.
3. **Caixinhas Acumulativas:**
   - O saldo das caixinhas **nunca** reseta na virada do mês. Transferências entre caixinhas (`TRANSFER`) movem saldo sem alterar o patrimônio total.
4. **Cartão de Crédito (`PENDING` vs `PAID`):**
   - Gastos no **Pix/Débito** (`PAID`) abatem a caixinha e saem do saldo físico imediatamente.
   - Gastos no **Crédito** (`PENDING`) abatem o saldo disponível da caixinha imediatamente, mas o dinheiro físico continua nos bancos até o pagamento da fatura (`PAID`).
5. **Tag "Mãe" (`is_third_party = true`):**
   - Compras de terceiros no cartão **NÃO abatem** nenhuma caixinha virtual da usuária. Ficam isoladas como _A Receber (Mãe)_ para cobrança antes do fechamento.
6. **Equação da Verdade (Calculadora de Conciliação):**
   $$\text{Saldo Esperado} = \text{Soma das Caixinhas} + \text{Saldo Livre} + \text{Crédito A Pagar (Ela)} - \text{Crédito A Receber (Mãe)}$$
   - **Discrepância > 0 (Sobra):** Se compatível com a soma dos rendimentos informados nos bancos, exibir CTA de 1 clique para enviar a sobra para a caixinha marcada com `is_emergency_fund = 1` (_Reserva de Emergência_).
   - **Discrepância < 0 (Falta):** **PROIBIDO** criar transações automáticas de "ajuste" para zerar a diferença. Apenas exibir o valor faltante e listar os lançamentos recentes para auditoria manual.

---

## 3. Arquitetura Local-First & Sync (Dexie + Turso)

- **Offline-First Obrigatório:** Toda leitura e escrita da UI deve acontecer primeiro no **Dexie.js (IndexedDB)** para resposta instantânea, sincronizando em background com o **Turso** via `/api/sync`.
- **Ledger Append-Only:** Use `UUIDv7` para IDs, `updated_at` (Unix timestamp ms) para _Last-Write-Wins_ e `deleted_at` (_soft delete_) para propagar exclusões entre Celular, Tablet e PC sem conflitos.
- **Schema Core:** `envelopes`, `transactions` e `reconciliations` (ver `SPEC.md`).

---

## 4. Diretrizes de UI/UX & Design System ("Warm Editorial")

DESIGN_GUIDELINES.md
---

5. **Compras de Terceiros (`third_party_id != null`):**
   - Nunca hardcode nomes de pessoas (ex: "Mãe"). Toda compra de terceiro deve referenciar um registro da tabela `third_parties` (gerenciada via CRUD próprio).
   - Transações com `third_party_id` preenchido **NÃO abatem** nenhuma caixinha virtual do usuário e são contabilizadas separadamente como saldo _A Receber_ agrupado por terceiro.

---

## 5. Uso de Skills

As skills instaladas globalmente devem ser consultadas conforme a etapa do desenvolvimento:

### UI, Design & Transições (Prioritárias)
- **`design-taste-frontend`** (`~/.agents/skills/design-taste-frontend`): Usar como referência principal de estética, hierarquia visual e acabamento de interface junto ao `DESIGN_GUIDELINES.md` ("Warm Editorial").
- **`transitions-dev`** (`~/.agents/skills/transitions-dev`): Usar ao implementar transições de página, modais, drawers, listas e micro-interações.
- **`transitions-polish`** (`~/.agents/skills/transitions-polish`): Usar na etapa de refinamento para polir curvas, tempos, fluidez e consistência das animações.
- **`shadcn-ui`** (`~/.agents/skills/shadcn-ui` ou `~/.gemini/skills/shadcn-ui`): Usar ao adicionar ou customizar componentes shadcn/ui.
- **`ui-ux-pro-max`** / **`frontend-design`**: Apoio para decisões de layout mobile-first e fluxos de UX.

### React, Next.js & Arquitetura
- **`vercel-react-best-practices`** e **`vercel-composition-patterns`**: Seguir ao estruturar componentes React/Next.js App Router, hooks e composição de UI.
- **`backend-architect`** (`~/.gemini/config/skills/backend-architect`): Usar ao projetar ou evoluir o schema do Dexie.js / Turso, a rota `/api/sync`, a lógica de conciliação bancária e as regras de negócio de ledger append-only.

### Qualidade, Revisão & Browser
- **`code-reviewer`** (`~/.gemini/config/skills/code-reviewer`): Usar antes de finalizar features ou refatorações críticas (especialmente cálculos em centavos, fluxo `PENDING`/`PAID` e regras de conciliação).
- **`a11y-debugging`** e **`chrome-devtools`**: Usar para validar acessibilidade, contraste, navegação por teclado e comportamento da PWA no navegador.
