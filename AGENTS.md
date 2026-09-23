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
- **Abas de Submenu**: Sempre em formato de texto limpo com sublinhado (`border-b-2`) na cor primária (`#183b54`) quando ativa, sem caixas/pills contornados.
- **Tipografia de Títulos & Headlines**: Todos os títulos, subtítulos e headlines da plataforma (h1 a h6, Aparência, Informações, Anfitriões, Fornecedores Contratados, Seguros, Financeiro, etc.) DEVEM utilizar exclusivamente a fonte **Inter** (`font-sans`), sem serifa.
- **Border Radius Padronizado**:
  - `--radius-card: 10px;` — cards, tabelas, modais (presentes, convidados confirmados, guia de primeiros passos, containers).
  - `--radius-control: 12px;` — botões, campos de formulário, itens de menu do sidebar, ícones de métrica.
