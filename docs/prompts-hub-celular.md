# Prompts para levar as melhorias do celular para o Hub (B2B)

Como usar:

1. Abra uma sessão nova no projeto Love para cada prompt (ou faça vários na mesma sessão, um de cada vez).
2. Cole sempre o **Prompt 0** primeiro (contexto e regras) e, logo depois, o prompt do tema.
3. Siga a ordem: os primeiros (base, barra de baixo, cabeçalho, abas) mudam o "esqueleto" que os outros usam.
4. Cada prompt termina com commit + push, então dá para parar e retomar a qualquer momento.

A referência de tudo é a plataforma do anfitrião (raiz do projeto: `index.html`, `css/styles.css`, `js/app.js`, `js/site-builder.js`), que já está pronta no celular. O Hub fica em `B2B/`.

---

## Prompt 0 — Contexto (cole sempre antes dos outros)

```text
Contexto: vamos levar para o Hub (pasta B2B/, a plataforma do fornecedor) as melhorias de celular que já fizemos na plataforma do anfitrião (raiz do projeto: index.html, css/styles.css, js/app.js, js/site-builder.js). A plataforma do anfitrião é a REFERÊNCIA: antes de mudar algo no Hub, abra o mesmo componente no anfitrião, leia o CSS/JS de lá e meça a tela de referência em 375px (preview "dev", porta 8090; no Hub, a porta do Hub). Copie os valores, não invente.

Regras:
- Pode mexer em B2B/ (este pedido autoriza). Não mexa em Admin/. Não mexa na plataforma do anfitrião, a não ser para LER.
- "Celular" = só esta media query, igual à do anfitrião:
  (max-width: 768px), (hover: none) and (pointer: coarse) and (max-height: 500px)
  O desktop do Hub NÃO pode mudar (meça em 1440px antes e depois).
- Siga o AGENTS.md: primária #183b54 (hover #122c3f); bordas finas (1px #E4E4E7 ou rgba(0,0,0,.06)) no lugar de sombra; sombra só em overlay; cantos 8px em botão/campo, 10px em card/caixa, 6px em etiqueta; sem focus ring; sem hover:scale; títulos em Inter/Plus Jakarta como no anfitrião; tudo com variante body[data-theme="dark"].
- Nunca alert/confirm/prompt do navegador; use as janelas da Love. "Cancelar" é só texto. Botão de remover nunca vermelho, exceto o Remover do arrastar no celular (#c7305b).
- Sempre "Pesquisar ...", nunca "Buscar ...".
- Não use screenshots para conferir; meça com JavaScript (getBoundingClientRect / getComputedStyle).
- CSS novo vai no fim de B2B/css/styles.css, com o mesmo padrão de especificidade do anfitrião (html body ... :not(#love-h-a)). Suba o ?v= dos arquivos alterados nos HTML do Hub.
- Não use git stash. Antes do commit: git branch --show-current (tem que ser main), node --check nos JS alterados e npm run checar -- --graves (tem que dar 0). Faça commit só dos arquivos que você mexeu, com o trailer Co-Authored-By de sempre, e dê push.
- Responda em português e, no fim, diga o que mudou, o que conferiu e o que ficou de fora.
```

---

## Prompt 1 — Base de app no celular

```text
No Hub (B2B/), deixe a base do celular igual à da plataforma do anfitrião (commits de referência: 5266c5e8, ffbced8f, c25fad71):
- viewport com viewport-fit=cover e safe areas (env(safe-area-inset-*)) no topo e embaixo;
- alturas em dvh (não 100vh) para não pular com a barra do navegador;
- áreas de toque de no mínimo 44px;
- campos (input, select, textarea) com 16px no celular, para o iPhone não dar zoom;
- fundo das páginas #F4F6F7 (o mesmo do desktop);
- celular deitado continua no layout do celular: use a media query completa do Prompt 0 em todo CSS de celular e, no JS, o mesmo matchMedia (procure MQ_CELULAR no js/app.js do anfitrião);
- nada de rolagem lateral em nenhuma página a 375px.
Passe por todas as páginas do Hub em 375px e em 812x375 (deitado) e me diga quais tinham rolagem lateral ou campo menor que 16px.
```

## Prompt 2 — Barra de baixo (navegação inferior)

```text
No Hub, a barra de baixo do celular (.mobile-bottom-nav em B2B/partials/sidebar.html) deve ficar igual à do anfitrião (referência: commits 5199a4c7, 1eda7a26, e7bcdc98, 91f214c4, 580e6ea6):
- fixa, de ponta a ponta (não pílula flutuante), com o mesmo fundo/vidro, borda de cima e respiro da safe area de baixo do anfitrião;
- 5 itens com ícone e nome embaixo, na mesma letra do anfitrião (meça);
- item ativo com caixinha azul clarinho #EBF4FF (cantos 8px) e ícone + nome em #183b54;
- tocar em qualquer item sempre volta ao topo da página; tocar de novo no item já ativo volta para a primeira aba daquela seção;
- ícones no mesmo traço dos ícones do anfitrião.
Mantenha os itens atuais do Hub (Dashboard, Clientes, Mensagens, Gestão, Contratos), a menos que algum não exista mais; se achar que a ordem deveria mudar, me pergunte antes.
```

## Prompt 3 — Cabeçalho das telas

```text
No celular do Hub, padronize o cabeçalho de todas as telas como no anfitrião (referência: d4d1d908, 57567a06, 3633032b, aaaf40ec, 338fe19d, d9631f21):
- logo, sino e menu só no topo do Dashboard (a "Home"); as outras telas começam direto pelo título;
- cabeçalho branco de ponta a ponta, sem faixa cinza acima dele (o branco vai até o topo da tela);
- título à esquerda, 20px, peso 700, line-height 26px, letter-spacing -0.4px, cor #18181B, na mesma fonte do anfitrião; altura mínima de 44px;
- botões do cabeçalho (adicionar, configurações etc.) só com o ícone escuro, sem caixinha colorida, áreas de 44px, à direita;
- quando houver seta de voltar: ícone de 20px com traço 2, botão de 44px começando em 10px da borda (margin-left -6px) e o título logo depois, começando em 62px;
- o título de TODAS as telas na mesma altura: meça o topo do título em cada página e deixe a diferença em 0px (no anfitrião havia telas 0,4 a 1,6px fora).
Liste a posição do título em cada página antes e depois.
```

## Prompt 4 — Abas do submenu

```text
No celular do Hub, o submenu da lateral vira uma barra de abas no topo do conteúdo, como no anfitrião (referência: a7813a83, 022c42d3, 18f0640d, 4198da0a, 8ca9b1bf; no js/app.js procure 'submenu-celular'):
- a lateral some no celular; as abas aparecem logo abaixo do cabeçalho, grudadas no topo ao rolar (position: sticky);
- abas com a mesma largura (dividem a tela por igual), 14px; a ativa em 600 e as outras em 500;
- a inativa em fundo branco com texto #52525B; a ativa no cinza do fundo (#F4F6F7) com texto #18181B e a linha da cor primária (#183b54) como no anfitrião — meça para copiar a posição e a espessura exatas da linha;
- nada de pílulas ou caixas contornadas;
- a barra das abas só se redesenha quando algo muda (no anfitrião ela redesenhava 60 vezes por segundo e engolia os toques; ver e1e315be).
```

## Prompt 5 — Menu (hambúrguer) e conta

```text
No celular do Hub, o menu do topo do Dashboard deve funcionar como no anfitrião (referência: 41d51176, 41076d6a, d66efb7a):
- o botão de menu abre uma gaveta lateral com todas as seções do Hub (inclusive as que não estão na barra de baixo) e, embaixo, a conta;
- tocar na conta abre as opções da conta (empresas/perfis, itens da conta e Sair);
- sino de notificações à direita, com o mesmo estilo de botão de 44px sem círculo de vidro;
- textos das notificações em linguagem de app, com data curta DD/MM/AA e o horário embaixo.
```

## Prompt 6 — Listas (Clientes, Produtos, Contratos...)

```text
No celular do Hub, as listas devem seguir o padrão de "Meus convidados" do anfitrião (referência: aa36e2db, 6059d076, 4198da0a, 27cb5893, 51cf3967, c5f8004b):
- a contagem fica acima da busca ("N clientes", "N produtos"...), 17px, cor #52525B, como "28 convidados";
- busca com o placeholder "Pesquisar cliente...", "Pesquisar produto..." etc., na mesma altura e estilo da busca do anfitrião;
- linhas só com o essencial: bolinha com as iniciais, nome (primeiro nome leve e sobrenome em negrito, se fizer sentido) e uma informação curta à direita;
- uma rolagem só, sem paginação;
- caixas e tabelas de ponta a ponta no celular, sem a borda da caixa;
- filtros viram uma setinha ao lado do título da coluna (como o RSVP), sem o botão "Filtrar por";
- Importar/Exportar não aparecem no celular.
Faça em Clientes (crm), Produtos, Contratos/Vendas e qualquer outra lista do Hub. Me diga em quais páginas aplicou.
```

## Prompt 7 — Arrastar a linha (swipe) para Editar/Remover

```text
No celular do Hub, arrastar uma linha da lista para a esquerda revela as ações, igual a Meus convidados e Mensagens do anfitrião (referência: 7930f248, c4715905, 10d3234f, cd962845, 0acd4aa8, b6dd0dcc; no js/app.js procure moverLinhaDaConversa e 'acoes-visiveis'):
- dois botões retos, de ponta a ponta na altura da linha: Editar (ou Abrir) em #183b54 e Remover em #c7305b, ícone centralizado;
- só arraste horizontal (touch-action: pan-y); passando da metade, trava aberta; senão volta com mola;
- só uma linha aberta por vez; tocar fora fecha;
- com a linha fechada, as ações ficam escondidas (sem risco escuro ou rosa aparecendo embaixo da linha e sem a faixa passar 1px do card);
- Remover pede confirmação na janela da Love (nunca confirm do navegador).
Aplique em Clientes, Mensagens e nas outras listas onde editar/remover faz sentido.
```

## Prompt 8 — Fichas de adicionar/editar em tela cheia

```text
No celular do Hub, todo "Adicionar..." e "Editar..." (cliente, produto, tarefa, contrato etc.) abre em tela cheia, como a ficha de Adicionar convidado e Criar novo presente do anfitrião (referência: a87454f0, 06babbc8, f10ff3d7, 5994d7fb; no css/styles.css procure .ficha-convidado e #drawer-add-gift):
- cabeçalho branco: seta de voltar de 20px à esquerda (botão de 44px a 10px da borda), título logo depois em 20px/700 à esquerda e o botão Salvar à direita (botão claro de 44px, texto na primária);
- corpo no cinza da plataforma #F4F6F7, SEM caixas brancas em volta das seções;
- só os campos em branco: 1px #E4E4E7, cantos 8px, 46px de altura, 16px de letra, largura toda com 16px de margem lateral;
- títulos de seção (ex.: "Informações de contato") soltos sobre o cinza, 24px entre seções;
- na edição, sem o topo com iniciais/nome/situação (igual ao Adicionar);
- nada de pop-up no celular para esses formulários.
```

## Prompt 9 — Estados vazios

```text
No celular do Hub, toda lista vazia segue o padrão de Meus convidados / Recados recebidos / Meus presentes vazios do anfitrião (referência: 39397dc7, 0f3fdfa8, 5aa1115e, 9335064d):
- uma caixa branca ocupando o espaço todo (min-height 420px, cantos 10px, borda 1px rgba(0,0,0,.06)), com o conteúdo no meio;
- em cima, uma animação Lottie de 140px; embaixo, um título curto e um texto de apoio de 13px #71717A;
- o título é clicável e abre direto o "Adicionar" daquela lista (cor #183b54, sublinha ao passar o mouse);
- com busca/filtro sem resultado, só o texto "Nenhum ... encontrado", sem link.
Animações: use o mesmo player do anfitrião (dotlottie-wc@0.9.28, carregado só quando a tela aparece — ver carregarPlayerLottie no js/app.js). Salve os arquivos .lottie em B2B/assets/lottie/ (não dependa do lottie.host). Para trocar cor ou grossura, edite o JSON de dentro do .lottie (fill 'fl' e stroke 'st'); refaça o zip com caminhos usando "/" (no Windows, use a API .NET ZipFile, não o Compress-Archive). Padrão: traços em #D4D4D8 com 2,5px na tela; ícones de ação (64px) na cor da sidebar #183b54 com 2px.
Me diga quais listas do Hub ganharam estado vazio e quais animações você precisa que eu escolha (posso mandar links do lottie.host).
```

## Prompt 10 — Mensagens (chat)

```text
No celular do Hub, a página Mensagens (B2B/chat.html) deve ficar como Mensagens do anfitrião (referência: 33a60e1a, d9631f21, 7930f248, 0acd4aa8, 5da20c1f):
- de ponta a ponta, com o cabeçalho branco até o topo (sem faixa cinza);
- lista de conversas com bolinha de iniciais, nome e prévia da última mensagem;
- arrastar a conversa para a esquerda revela Abrir (#183b54) e Remover (#c7305b), com as regras do Prompt 7;
- a conversa aberta ocupa a tela toda, com seta de voltar no cabeçalho (padrão do Prompt 3);
- busca "Pesquisar conversa..." com a contagem acima, como nas listas.
```

## Prompt 11 — Dashboard como Home de app

```text
No celular do Hub, o Dashboard deve virar a "Home de app", como a Home do anfitrião (referência: 64a92068, 6022ff3c, a84e0785, 2344de13, 579d3b39, 626dafac, 1328ecf2):
- topo com logo à esquerda, sino e menu à direita (botões de 44px); o topo não gruda ao rolar;
- uma caixa de boas-vindas ("Olá, nome!") com a informação mais importante do dia;
- atalhos em bolinhas (até 6), com ícone no mesmo traço dos ícones do anfitrião (stroke 1.6, pontas arredondadas) e nome embaixo;
- títulos de seção soltos (como "Presentes" e "Lista de convidados" no anfitrião) e caixas de números com o número em cima e o nome embaixo;
- aviso "N clientes te mandaram mensagem!" com "Ver as mensagens" só quando houver conversa não lida;
- sem guias/tutoriais que só fazem sentido no computador.
Antes de mexer, me mande uma lista curta do que o Dashboard do Hub mostra hoje no celular e a ordem que você propõe; espere eu aprovar.
```

## Prompt 12 — Gavetas de baixo para cima no lugar de pop-ups

```text
No celular do Hub, menus de opções e escolhas rápidas abrem como gaveta de baixo para cima, como no anfitrião (referência: 78aa116a, 1e42d1c4, c67613b3):
- ex.: "Adicionar cliente" pergunta antes, numa gaveta: "Adicionar manualmente" / "Importar contatos" (o anfitrião usa o Contact Picker no Android e .vcf no iPhone, com a ajuda passo a passo do Safari — ver 50041f09);
- gaveta com cantos de 10px em cima, alça cinza, itens de 48px, sombra só na gaveta;
- confirmações seguem as janelas da Love; Cancelar só texto.
Liste os pop-ups do Hub que viraram gaveta.
```

## Prompt 13 — Avisos (toast) e confirmações no celular

```text
No celular do Hub:
- os avisos rápidos (toast) aparecem no topo da tela, não embaixo (embaixo ficam escondidos pela barra de baixo) — no anfitrião veja #builder-toast no celular;
- toda ação que salva mostra o resultado no toast ("Salvo", "Não foi possível salvar...");
- quando adicionar algo (ex.: cliente numa etapa), mostre o aviso verde no topo com o nome, como no Mapa do evento do anfitrião (c67613b3);
- nenhum alert/confirm/prompt do navegador em todo o Hub (procure e troque).
```

## Prompt 14 — Fotos que não salvam no celular

```text
No anfitrião havia um bug: no celular, a foto escolhida não salvava, porque a imagem em base64 enchia o localStorage, o setItem dava erro e o salvamento no banco nem rodava (correção no commit d88184ea, em js/site-builder.js: readFileAsDataUrl, reduzirImagem e guardarPaginaNoCache).
Procure o mesmo risco no Hub (fotos de produto, capa, logo, Construtor/site-builder, vitrine):
- reduzir toda imagem escolhida (exceto SVG) para no máximo 1600px, JPEG 0.82 (PNG continua PNG);
- quando o cache do navegador encher, apagar a cópia velha e seguir salvando no banco, sem travar;
- se o banco falhar, avisar "Não foi possível salvar..." e manter "alterações não salvas".
Teste trocando uma foto grande (5 MB+) em 375px e me diga se salvou.
```

## Prompt 15 — Construtor (site do fornecedor) no celular

```text
No celular do Hub, o Construtor (B2B/paginas-site.html, B2B/js/site-builder.js) segue o Convite digital do anfitrião (referência: 0ab24797, 5510fd55, 70a38351, ef0564d8, 685f2f50, 92d89cc2, 7881b691):
- prévia em tela cheia; tocar num elemento abre uma gaveta pequena só com o essencial dele (texto: negrito, itálico, tamanho e o texto; botão: cores e texto);
- sem "Adicionar elementos", sem mover/duplicar/apagar seções no celular (seções fixas);
- seletor de página no cabeçalho, à esquerda, 20px, em azul com a setinha;
- cada edição salva sozinha (sem botão Salvar); se já estiver publicado, a versão no ar acompanha;
- aviso no topo: "Atenção, para usar todos os recursos de edição, acesse o construtor pelo computador (desktop).";
- escolha de modelo em tela cheia ("Escolher novo modelo"), grade de 2 colunas, sem data e sem "Continuar com o atual" (a seta de voltar segue com o atual).
```

## Prompt 16 — Textos e ícones padronizados

```text
No Hub inteiro (celular e desktop):
- troque todo "Buscar ..." por "Pesquisar ..." em placeholders, aria-labels e botões de pesquisa ("Buscar o CEP" pode ficar);
- ícones de ação no mesmo padrão dos do anfitrião: traço 1.6 a 1.8, pontas e cantos arredondados, sem preenchimento, sem caixinha colorida em volta;
- ícones de estado vazio no padrão do Prompt 9.
Liste o que foi trocado, arquivo por arquivo.
```

## Prompt 17 — Conferência final

```text
Faça uma conferência do Hub no celular (375x812 e 812x375), página por página, contra a plataforma do anfitrião, e me entregue uma tabela com:
página | título na mesma altura? | cabeçalho branco até o topo? | abas no padrão? | contagem + "Pesquisar" nas listas? | arrastar Editar/Remover? | fichas em tela cheia no padrão? | estado vazio no padrão? | rolagem lateral? | campos com 16px?
Corrija o que der para corrigir na hora (commit por tema) e liste o que ficou pendente. Confira também que o desktop (1440px) não mudou.
```

---

## Extra (desktop) — tirar pop-ups

```text
No desktop do Hub, comece a tirar os pop-ups, como fizemos no anfitrião com Criar/Editar presente (commit d76dc391; no js/app.js procure abrirPresenteNaPagina e devolverPresenteDaPagina): o formulário abre dentro da própria caixa da página, ocupando a largura toda no lugar da lista (borda fina, cantos 10px, sem sombra e sem fundo escuro), e ao fechar a lista volta. Comece pelo formulário mais usado do Hub e me pergunte antes de passar para os outros.
```
