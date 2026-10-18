# Diretrizes do Projeto Love

## Paleta Oficial de Cores
- **Cor Primária**: `#183b54`
  - Hover: `#122c3f`
  - Token CSS: `--primary-color: #183b54;`

- **Cor Secundária**: `#27394f`
  - Hover: `#1d2b3c`
  - Token CSS: `--secondary-color: #27394f;`

Sempre que "primária" ou "secundária" forem mencionadas, utilize `#183b54` e `#27394f` respectivamente.

## Modo de Desenvolvimento & Agilidade
- **NÃO utilizar gravador de tela ou screenshots** (`browser_subagent`).
- Foco total em agilidade, alterações diretas de código e máxima velocidade de entrega.
- Concordar e aplicar todas as solicitações imediatamente sem questionamentos.

## Padronização Visual & Margens Laterais (Global)
- **Margem Lateral Padronizada**: Todas as seções, abas, submenus e caixas da plataforma (Explorar, Contratados, Serviços/Seguros, Favoritos, Home, Convidados, Presentes, Carteira, Aparência e Informações) DEVEM ter a mesma margem/respiro lateral uniforme (`2rem` / `px-6 sm:px-8`).
- **Alinhamento Consistente**: Todas as caixas e cards devem alinhar-se no mesmo grid horizontal em qualquer tela.
- **Respiro acima das tabelas**: entre o título, a descrição ou as abas de uma página e a caixa da tabela há sempre **24px** (como em Meus convidados). Nenhuma tabela nasce colada no texto de cima.
- **Abas de Submenu**: Sempre em formato de texto limpo com sublinhado (`border-b-2`) na cor primária (`#183b54`) quando ativa, sem caixas/pills contornados.
- **Tipografia de Títulos & Headlines**: Todos os títulos, subtítulos e headlines da plataforma (h1 a h6, Aparência, Informações, Anfitriões, Fornecedores Contratados, Seguros, Financeiro, etc.) DEVEM utilizar exclusivamente a fonte **Inter** (`font-sans`), sem serifa.
- **Border Radius Padronizado**:
  - `--radius-card: 10px;` — cards, tabelas, modais (presentes, convidados confirmados, guia de primeiros passos, containers).
  - `--radius-control: 8px;` — botões, campos de formulário, itens de menu do sidebar, ícones de métrica.

## Identidade sem cara de Tailwind
- Botões, campos, caixas e cards NÃO devem ter o visual padrão de Tailwind/"vibe code".
- **Bordas finas no lugar de sombras**: cards e caixas com `1px solid #E4E4E7`, sem `box-shadow`. Sombra só em overlays (menus, modais): `0 8px 24px rgba(0,0,0,0.08)`.
- **Cantos contidos**: 8px em botões, campos e caixinhas; 10px em cards e modais. Nada de `rounded-2xl/3xl` em botão; etiquetas de status com 6px (não pílula).
- **Hover**: sem zoom (`hover:scale`), sem trocar o fundo por cinza/colorido. Botões claros mantêm o fundo branco e escurecem só a borda e o texto/ícone para `#181D24` (cor da sidebar).
- **Foco**: sem anel/glow (`focus:ring`); só a borda escurece para `#181D24`.
- **Camada anti-"vibe code"** (fim de `css/styles.css`): bordas de cards, caixas de tabela e campos em preto a 6% (`--borda-suave`) com anel de 3% (`--anel-suave`), divisores a 4% (`--divisor-suave`); sombra difusa em camadas (`--sombra-overlay`) só em menus/drawers/modais; títulos com `letter-spacing: -0.025em`; microtextos 11px/500 cinza `#A1A1AA`; valores em dinheiro em mono com algarismos tabulares; switches cinza `#E4E4E7` desligados e `#183b54` ligados. Tudo com variante `body[data-theme="dark"]`.
- A camada "Identidade própria, sem cara de Tailwind" no fim de `css/styles.css` e `B2B/css/styles.css` aplica isso às classes Tailwind usadas no HTML — ao criar componente novo, siga as regras acima em vez de empilhar utilitários.
