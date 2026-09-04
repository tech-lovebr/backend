# Love - Plataforma de Casamentos & Marketplace de Presentes com IA 💍💙

> Homepage e plataforma completa inspirada no **Casar.com**, com design system e identidade visual baseada no novo logotipo **Love Azul** (`#3B82F6`) e recursos de ponta em Inteligência Artificial.

---

## 📌 1. Visão Geral e Estrutura da Homepage

A homepage foi modularizada seguindo as melhores práticas e seções de alta conversão do portal **Casar.com**, adicionando a inteligência artificial proprietária **Love Match**:

1. **Top Announcement Bar:** Aviso de criação de site gratuita e lista de presentes PIX.
2. **Header Global (Glassmorphism):** Logotipo Love Azul oficial, navegação rápida com dropdowns (*Para o seu Casamento*, *Lista de Presentes PIX*, *Modelos de Sites*, *Presentes com IA*, *Encontre um Casamento*) e CTAs de ação (*Buscar Casamento*, *Entrar*, *Criar site gratuito*).
3. **Hero Section de Alto Impacto:**
   - Imagem de fundo imersiva de celebração de casamento com iluminação natural.
   - Headline com tipografia editorial elegante.
   - Botões duplos de ação (*Criar site gratuito* e *Encontrar um casamento*).
   - Widget de busca rápida de casais cadastrados diretamente no banner.
4. **Trust Stats Bar:** Métricas de confiança (+150.000 casamentos criados, R$ 50M+ em presentes PIX, nota 4.9).
5. **Bento Grid ("Tudo para o grande dia em um só lugar"):**
   - **Card 1 (Azul Royal):** Site de casamento personalizado (dress code, mapas, fotos, contagem regressiva).
   - **Card 2:** Confirmação de presença online (RSVP inteligente com gráficos de status).
   - **Card 3:** Soluções completas de organização (fornecedores, floriculturas e checklist).
   - **Card 4 (Azul Royal):** Lista de casamento em dinheiro com resgate imediato via PIX.
6. **Spotlight Love AI Gift Match:** Seção dedicada à curadoria de presentes em 30 segundos guiada por IA.
7. **Galeria de Temas de Casamento:** Filtros por categoria (*Todos*, *Garden & Floral*, *Black Tie & Clássico*, *Praia & Destination*) com cards interativos de demonstração.
8. **Vantagens Financeiras da Lista:** PIX imediato, parcelamento em até 12x para convidados, entrega de presentes reais e segurança bancária.
9. **Depoimentos Reais de Noivos:** Depoimentos com fotos e avaliações de casais reais.
10. **FAQ Interativo:** Dúvidas frequentes com acordeão dinâmico.
11. **Rodapé Completo Institucional:** Links categorizados, dados de segurança e direitos autorais.

---

## 📂 2. Estrutura Modular dos Arquivos

```
Love/
├── index.html              # Homepage completa, semântica e responsiva (Desktop & Mobile)
├── css/
│   └── styles.css          # Design System Love Blue, Bento Grid, Temas e Modais
├── js/
│   ├── data.js             # Mock de dados: temas, casais para busca, floriculturas e produtos IA
│   ├── animations.js       # Efeitos de confete, pulso neural de IA e transições
│   └── app.js              # Controlador de busca, filtros de tema, wizard IA e modais
├── assets/
│   ├── logo.png            # Logotipo Oficial Love com coração Azul
│   ├── wedding_hero_banner.jpg # Banner hero de casamento em alta resolução
│   ├── theme_garden.jpg    # Mockup do tema Garden & Botanical
│   ├── theme_blacktie.jpg  # Mockup do tema Black Tie & Chic
│   ├── theme_coastal.jpg   # Mockup do tema Coastal & Destination
│   ├── bouquet_roses.jpg   # Buquê de Flores Nobres
│   ├── breakfast_basket.jpg# Cesta de Café da Manhã Gourmet
│   └── orchid_luxury.jpg   # Orquídea Phalaenopsis Imperial
└── README.md               # Documentação técnica
```

---

## 🚀 3. Como Visualizar no Navegador

O servidor local de alta performance está ativo no host:
- **URL Local:** `http://localhost:8090/`

Para iniciar ou reiniciar o servidor:
```bash
npm start
# ou
node server.js
```

---

## 🎨 4. Paleta de Cores e Design Tokens

- **Azul Primário Love:** `#3B82F6` (Tom do coração do logo)
- **Azul Royal & Acento:** `#2563EB` / `#1D4ED8`
- **Azul Pastel (Superfícies):** `#EFF6FF` / `#DBEAFE`
- **Navy & Texto Escuro:** `#0F172A` / `#1E293B`
- **Tipografia:** `Plus Jakarta Sans` e `Playfair Display`
