# DESIGN_GUIDELINES.md — Identidade Visual & UI Direction (Befin)

## 1. Essência & Personalidade da Marca

- **Nome:** **Befin** (sempre grafado em caixa baixa na logomarca: `befin`)
- **Propósito:** Devolver clareza e paz mental para quem concentrou o dinheiro em poucos bancos ("Caixinhas Turbo") e precisa dividir virtualmente o orçamento em caixinhas, controlar gastos no cartão (próprios e de terceiros) e conferir se as contas batem.

- **Personalidade (Tone & Vibe):**
- **Editorial Acolhedor (_Warm Editorial_):** Foge da frieza de planilhas contábeis ou bancos corporativos. O visual deve parecer um caderno financeiro moderno, tátil e calmo, reduzindo a ansiedade ao lidar com dinheiro.
- **Claro e Sem Ruído:** Hierarquia visual óbvia, respiro generoso entre blocos e foco total na legibilidade dos valores monetários.
- **Orgânico e Humano:** Cantos bem arredondados (`16px` a `24px`), superfícies suaves em tons pastel e micro-detalhes que remetem a crescimento constante (como o broto na logo reduzida).

---

## 2. Sistema de Cores (Paleta "Marfim & Névoa Lavanda")

### 2.1 Superfícies & Marca

- **Fundo Principal (Canvas):** Marfim Quente (`#F8F7FA`) — substitui o branco clínico puro para dar conforto visual.
- **Superfície de Cards Elevados:** Branco Puro (`#FFFFFF`) com bordas sutis (`#ECE9F5`) ou sombras muito difusas.
- **Superfície Secundária / Destaque Suave:** Névoa Lavanda (`#EFEBF9` e `#E6E0F8`) — usada para áreas de resumo, pills inativas ou o card de _Saldo Livre_.
- **Cor Primária da Marca (Ações Principais, Textos Fortes, FAB `+`):** Índigo Profundo (`#2E294E`) — alto contraste e elegância.
- **Acento da Marca (Detalhes, Pingo-Moeda, Estados Ativos):** Lavanda Vibrante / Pervinca (`#9D8DF1` / `#C7C2EC`).
- **Texto Secundário / Rótulos:** Ardósia Suave (`#6B6682`).

### 2.2 Cores Semânticas (Estados do Sistema)

- **Conciliação Batida / Rendimento Positivo (Reserva):** Verde-Sálvia Suave (`#DDF3E4` fundo / `#1E6B3B` texto) — transmite crescimento e tranquilidade.
- **Crédito `A Pagar` (`PENDING`):** Âmbar Pastel (`#FEF3C7` fundo / `#92400E` texto) — indica de forma discreta que o dinheiro ainda está rendendo no banco até o fechamento da fatura.

- **Tag `Mãe` (Compras de Terceiros / A Receber):** Malva / Lilás Destaque (`#F3E8FF` fundo / `#6B21A8` texto) — diferencia visualmente de imediato o que não pertence ao orçamento dela.

- **Discrepância Negativa (Faltou dinheiro na conciliação):** Coral Suave (`#FEE2E2` fundo / `#991B1B` texto) — alerta claro sem ser agressivo.

### 2.3 Paleta Categórica das Caixinhas Virtuais

Conjunto pastel harmônico para identificação visual rápida nos cards e na barra de distribuição:

- Lavanda (`#E6E0F8`), Menta (`#DCFCE7`), Pêssego (`#FFEDD5`), Azul-Pó (`#E0F2FE`), Amarelo-Manteiga (`#FEF9C3`), Rosa-Blush (`#FCE7F3`).

---

## 3. Tipografia & Regras Numéricas

- **Fonte de Títulos & UI:** _Plus Jakarta Sans_ ou _Outfit_ (geométrica, amigável e com curvas suaves que conversam com a logo `befin`).
- **Fonte de Corpo & Valores:** _Inter_ ou _Plus Jakarta Sans_.
- **Regra Obrigatória para Finanças:** Aplicar `font-variant-numeric: tabular-nums` em **todos** os valores monetários, saldos, percentuais e inputs da calculadora, garantindo alinhamento vertical perfeito e evitando que os números "pulem" durante digitação ou atualizações.

---

## 4. Identidade de Logo (Responsive Brand System)

- **Logo Completa (`befin`):** Wordmark em caixa baixa com tipografia arredondada em Índigo Profundo (`#2E294E`), tendo o pingo da letra **"i"** substituído por um círculo/moeda em Lavanda (`#C7C2EC` / `#9D8DF1`). Usada em splash screens, cabeçalhos amplos e telas de boas-vindas.
- **Ícone Reduzido (`B` + Broto):** Monograma **B** geométrico arredondado acompanhado de uma folha/broto em lavanda no canto superior direito (simbolizando o rendimento das caixinhas e da Reserva de Emergência). Usado como ícone do PWA na tela inicial, favicon e cabeçalhos compactos mobile.

---

## 5. Diretrizes de Layout & Componentes Principais

_Foco em ergonomia mobile-first (uso confortável com uma mão / polegar), adaptando-se fluidamente para tablet e desktop (PWA)._

### 5.1 Componentes-Chave

- **Ícones (`@phosphor-icons/react`):** Biblioteca oficial de ícones da interface. Utilizar peso `regular` para navegação inativa e ações secundárias, `duotone` para badges categóricos, caixinhas e estados vazios acolhedores, e `fill` para estados ativos na navegação inferior, indicadores de favorito/reserva de emergência e seleções confirmadas.

1. **Barra de Distribuição Segmentada:** Barra horizontal arredondada que mostra visualmente a proporção de cada caixinha dentro do patrimônio total.
2. **Card de Caixinha (Envelope Card):** Exibe ícone circular colorido (`@phosphor-icons/react` em `duotone`), nome da caixinha, saldo atual em destaque e atalhos rápidos (gastar ou transferir).
3. **Item de Extrato / Transação:** Ícone de categoria, descrição, data, valor alinhado à direita e _badges/pills_ compactas indicando: `[Nome da Caixinha]`, `[Crédito: A Pagar]` e `[Terceiro: Nome]` (quando aplicável).

4. **Botão Flutuante (FAB `+`) / Barra de Navegação Inferior:** Acesso imediato com o polegar para registrar movimentações.

### 5.2 Telas & Fluxos do MVP

1. **Dashboard (Home):**

- Cabeçalho discreto com logo reduzida + indicador sutil de status de sincronização (Online/Offline/Syncing com Turso).

- Resumo superior: **Total nas Caixinhas**, card destaque de **Saldo Livre ("Sala de Espera" para distribuir)** e resumo rápido da **Fatura Aberta (Ela vs. Mãe)**.

- Barra segmentada + Grid/Lista de Caixinhas Virtuais.

- Lista de transações recentes.

2. **Fluxo de Lançamento Rápido (Bottom Sheet / Modal via `+`):**

- Seletor rápido de modo: **Gasto**, **Receita**, **Distribuir Saldo Livre** (com alternância `R$` / `%`) e **Transferir entre Caixinhas**.

- No modo Gasto: toggle tátil entre `Pix/Débito` e `Crédito (A Pagar)` + chip de seleção rápida para **`Tag: Mãe`**.

3. **Calculadora de Conciliação Bancária:**

- Blocos de entrada para 2 a 3 bancos (cada um com campos lado a lado para `Saldo Principal` e `Rendimento Acumulado`).

- Card de resultado dinâmico comparando o saldo real com o esperado pelo app:

- _Bateu exato:_ Feedback positivo em Verde-Sálvia.

- _Sobrou (Rendimento):_ Exibe a sobra e oferece o botão de ação direta: **"Enviar R$ X para Reserva de Emergência"**.

- _Faltou:_ Alerta em Coral com o valor exato não registrado e atalho para revisar lançamentos recentes.

4. **Gestão de Fatura Aberta (`PENDING`):**

- Visão dividida claramente entre **Meus Gastos no Crédito** e **Gastos da Mãe (A Cobrar)**.

- Ação em lote: **"Marcar fatura como paga"**.
