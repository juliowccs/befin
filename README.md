<p align="center">
  <img src="app/icon.svg" alt="befin logo" width="84" height="84" />
</p>

# befin

Aplicação web mobile-first de **envelope budgeting** (_orçamento por envelopes_) projetada para dividir dinheiro concentrado em "Caixinhas" de diferentes bancos e realizar conciliação bancária periódica com precisão em centavos.

---

## Principais Funcionalidades

- **Saldo Livre ("Sala de Espera"):** Toda receita entra primeiro no Saldo Livre e pode ser distribuída para as caixinhas por valor fixo (`R$`) ou percentual (`%`), sem perda de centavos.
- **Caixinhas Acumulativas:** O saldo das caixinhas nunca reseta na virada do mês. Transferências entre caixinhas preservam o patrimônio total.
- **Cartão de Crédito (`PENDING` vs `PAID`):** Compras no crédito abatem o saldo virtual da caixinha imediatamente, mas mantêm o dinheiro físico nos bancos até a quitação da fatura (individual ou em lote).
- **Compras de Terceiros:** Despesas feitas para terceiros (`third_parties`) não abatem nenhuma caixinha virtual e ficam isoladas como _A Receber_ agrupado por pessoa.
- **Conciliação Bancária (Equação da Verdade):** Compara os saldos físicos informados nos bancos com o saldo esperado pelo sistema, sugerindo envio de sobras compatíveis com rendimentos para a _Reserva de Emergência_ e listando lançamentos para auditoria manual em caso de falta.

---

## Arquitetura

O **befin** segue uma arquitetura **Local-First**:

1. **Leitura e escrita instantâneas no cliente:** Toda operação da interface acontece primeiro no **IndexedDB** via **Dexie.js**, garantindo resposta imediata mesmo offline.
2. **Sincronização na nuvem (Turso / libSQL):** Um ledger _append-only_ baseado em `UUIDv7`, `updated_at` (Unix ms para _Last-Write-Wins_) e `deleted_at` (_soft delete_) sincroniza alterações incrementais via `POST /api/sync` com **Drizzle ORM**.
3. **Precisão Matemática:** Todos os valores monetários são armazenados e operados exclusivamente como inteiros em centavos (`INTEGER`), sendo formatados para `BRL` (`pt-BR`) apenas na camada de exibição.

### Estrutura de Pastas

```text
├── app/
│   ├── api/
│   │   ├── account/       # Portabilidade (GET JSON) e exclusão LGPD (DELETE)
│   │   ├── auth/[...all]/ # Rotas do Better Auth (Google OAuth + E-mail/Senha)
│   │   └── sync/          # Endpoint transacional de sincronização (Push LWW + Pull)
│   ├── cadastro/          # Criação de conta com aceite LGPD
│   ├── caixinhas/         # Gestão de caixinhas, distribuição e transferências
│   ├── conciliar/         # Calculadora da Equação da Verdade e auditoria
│   ├── configuracoes/     # Configurações, bancos, terceiros e dados LGPD
│   ├── extrato/           # Histórico, filtros e quitação em lote
│   ├── inicio/            # Painel principal (Visão geral)
│   ├── login/             # Login com Google ou E-mail/Senha
│   ├── privacidade/       # Política de Privacidade (LGPD)
│   ├── relatorios/        # KPIs e 6 gráficos interativos
│   ├── termos/            # Termos de Uso
│   └── page.tsx           # Landing Page pública
├── drizzle/               # Migrations SQL versionadas
└── src/
    ├── components/        # Componentes de UI (shadcn/ui), Charts e domínio
    ├── db/                # Cliente Turso e schema Drizzle ORM
    ├── hooks/             # Hooks reativos com Dexie
    └── lib/               # Banco local (Dexie), domínio (ledger/money/analytics) e testes
```

---

## Stack & Créditos

- **[Next.js](https://nextjs.org/)** (App Router) & **[React](https://react.dev/)** — Framework e renderização
- **[TypeScript](https://www.typescriptlang.org/)** — Tipagem estática (`strict`)
- **[Tailwind CSS](https://tailwindcss.com/)** & **[shadcn/ui](https://ui.shadcn.com/)** — Design system (_Warm Editorial_) e componentes acessíveis
- **[Phosphor Icons](https://phosphoricons.com/)** — Ícones da interface
- **[Motion](https://motion.dev/)** — Transições e micro-interações (`LazyMotion`)
- **[Recharts](https://recharts.org/)** — Gráficos interativos integrados ao shadcn/ui Charts
- **[Better Auth](https://www.better-auth.com/)** — Autenticação (Google OAuth + E-mail/Senha)
- **[Dexie.js](https://dexie.org/)** — Persistência local-first no IndexedDB
- **[Drizzle ORM](https://orm.drizzle.team/)** & **[Turso (libSQL)](https://turso.tech/)** — Schema tipado, migrations versionadas e banco na nuvem
- **[Vitest](https://vitest.dev/)** — Suíte de testes unitários

---

## Como Rodar Localmente

### Pré-requisitos

- **Node.js** 20+
- **pnpm** 10+
- Conta no [Turso](https://turso.tech/) (para sincronização na nuvem)

### 1. Instalar dependências

```bash
pnpm install
```

### 2. Configurar variáveis de ambiente

Crie/preencha o arquivo `.env.local` na raiz do projeto:

```env
TURSO_DATABASE_URL=libsql://seu-banco.turso.io
TURSO_AUTH_TOKEN=seu-token-aqui
BETTER_AUTH_SECRET=seu-segredo-32-chars
BETTER_AUTH_URL=http://localhost:3000
GOOGLE_CLIENT_ID=seu-google-client-id
GOOGLE_CLIENT_SECRET=seu-google-client-secret
```

### 3. Aplicar migrations no Turso

```bash
pnpm db:migrate
```

### 4. Iniciar o servidor de desenvolvimento

```bash
pnpm dev
```

Acesse [http://localhost:3000](http://localhost:3000).

---

## Scripts Disponíveis

| Comando            | Descrição                                            |
| :----------------- | :--------------------------------------------------- |
| `pnpm dev`         | Inicia o servidor de desenvolvimento                 |
| `pnpm build`       | Gera o build de produção                             |
| `pnpm lint`        | Executa a verificação do ESLint                      |
| `pnpm test`        | Roda os testes unitários com Vitest                  |
| `pnpm db:generate` | Gera novas migrations SQL a partir do schema Drizzle |
| `pnpm db:migrate`  | Aplica migrations pendentes no Turso                 |
| `pnpm db:studio`   | Abre o Drizzle Studio para inspecionar o banco       |
