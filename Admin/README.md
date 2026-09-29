# Love Admin — painel administrativo (`admin.love.com.br`)

Painel de gestão da plataforma Love. É **independente** do B2B e da plataforma
logada dos noivos: pasta própria, CSS próprio, login próprio. O que ele
compartilha com o resto é apenas o banco (o mesmo projeto Supabase).

## Modo demonstração (ligado agora)

O painel está rodando com **dados fictícios**, sem depender do Supabase — é o
modo para ajustar interface e navegação antes de ligar o banco.

- Entra com qualquer e-mail e senha na tela de login.
- Todas as telas vêm preenchidas: 5 fornecedores, 4 clientes, 5 eventos, 474
  convidados, 97 presentes, contratos, links de pagamento e 4 chamados.
- **Criar, editar e excluir funcionam de verdade** — as alterações ficam
  guardadas no seu navegador (`localStorage`), sobrevivem a recarregar a página
  e nunca chegam ao Supabase.
- A topbar mostra o selo **Modo demonstração**, com o botão *Reiniciar dados*
  para voltar tudo ao estado original.

### Como desligar

Qualquer uma das duas formas:

- abra uma página com `?demo=0` na URL (vale até fechar a aba); ou
- troque `MODO_DEMO` para `false` no topo de [js/mock.js](js/mock.js) — é assim
  que se liga o Supabase de verdade, para valer.

Com o modo demo desligado, valem as regras normais: sessão no Supabase, linha
ativa na tabela `admins` e as migrations rodadas.

## Stack

HTML + CSS + JavaScript puro, sem build, igual ao B2B. Só duas dependências,
ambas via CDN: a fonte Inter e o SDK do Supabase.

## Estrutura

```
Admin/
├── index.html              # porta de entrada: manda pro painel ou pro login
├── login.html              # login exclusivo do administrador
├── dashboard.html          # visão geral das duas plataformas
├── fornecedores.html       # contas B2B: empresa, CNPJ, categoria, plano, faturamento
│   └── fornecedores-dashboard.html   # o que é publicado na plataforma B2B
├── clientes.html           # contas dos noivos: contato, eventos, saldo
│   └── clientes-dashboard.html       # o que é publicado na plataforma dos noivos
├── eventos.html            # comemorações por categoria, convidados, presentes
├── financeiro.html         # carteira dos fornecedores e dos clientes
├── atendimento.html        # caixa de entrada dos chamados
├── css/admin.css           # design system do painel
├── js/
│   ├── mock.js             # modo demonstração: dados fictícios no navegador
│   ├── supabase-init.js    # escolhe entre o Supabase real e o modo demo
│   ├── utils.js            # formatação, drawer, toast, estados de tabela
│   ├── shell.js            # sidebar, topbar e guarda de autenticação
│   ├── conteudo.js         # gestão de conteúdo (usado pelos dois dashboards)
│   └── <pagina>.js         # um arquivo por tela
├── assets/                 # logotipos (cópia local: o painel não depende da raiz)
└── integracao/
    └── formulario-atendimento.html   # trecho para colar no site/B2B/plataforma
```

## Como o acesso é protegido

Não existe chave secreta no navegador. O painel usa a mesma chave pública
(`anon`) do resto da plataforma — o poder de administrador vem do **papel do
usuário no banco**:

1. o usuário precisa ter sessão válida no Supabase;
2. precisa ter uma linha ativa na tabela `admins`;
3. as policies de RLS (migration `004_admin.sql`) só liberam a leitura ampla
   para quem passa na função `is_admin()`.

Ou seja: mesmo que alguém abra o código-fonte e copie a chave, sem estar na
tabela `admins` o banco não devolve nada. Um fornecedor ou um casal logado que
tente abrir o painel é deslogado na porta.

## Antes de usar: rodar a migration

O painel depende de tabelas que **ainda não existem** no Supabase. No painel do
Supabase → SQL Editor → New query, cole e rode o arquivo inteiro:

```
supabase/migrations/004_admin.sql
supabase/migrations/010_conteudo_plataforma.sql
supabase/migrations/011_conteudo_hierarquia.sql
supabase/migrations/012_conteudo_faq.sql
```

O `004` cria o papel de administrador, completa o cadastro do fornecedor (CNPJ,
telefone, endereço), cria as tabelas de eventos/convidados/presentes/carteira
dos noivos e o canal de atendimento — e libera o acesso do admin a tudo.

O `010` cria a tabela do conteúdo editorial que alimenta os dois dashboards de
conta. O `011` liga cada benefício ao serviço a que ele pertence. O `012`
permite que um guia de início contenha várias perguntas e respostas.

## Criar o primeiro administrador

1. Supabase → **Authentication → Users → Add user**: crie com e-mail e senha
   (marque *Auto Confirm User*). A senha é definida por você ali; o código do
   painel nunca guarda nem manipula senha.
2. Copie o UUID do usuário criado e rode no SQL Editor:

```sql
insert into admins (id, name, email, role)
values ('COLE-O-UUID-AQUI', 'Seu Nome', 'seu@email.com', 'superadmin');
```

## Rodar local

Na raiz do projeto Love:

```bash
npm start
```

O painel fica em <http://localhost:8090/Admin/login.html>.

## Deploy em `admin.love.com.br`

Projeto **separado** na Vercel, apontando para esta pasta — assim o painel não
compartilha rota nem build com o site principal:

1. Vercel → Add New → Project → mesmo repositório.
2. Em **Root Directory**, escolha `Admin`.
3. Framework Preset: *Other* (não há build; o `vercel.json` desta pasta já
   define o deploy estático e os headers de `noindex` e anti-clickjacking).
4. Em **Domains**, adicione `admin.love.com.br` e aponte o CNAME no seu DNS.

A pasta é autossuficiente (os logotipos estão em `Admin/assets/`), então o
deploy com Root Directory `Admin` não puxa nada de fora.

## O que ainda depende de outra etapa

As telas de **Eventos**, **Clientes → convidados/presentes/saldo** e o
**Atendimento** só mostram dados reais depois que as outras partes passarem a
gravar no banco:

| Tela | Origem hoje | Falta |
|---|---|---|
| Eventos, convidados, presentes, saldo | mock em `js/data.js` | migrar a plataforma dos noivos para as tabelas `eventos`, `convidados`, `presentes`, `cliente_wallet_transactions` |
| CNPJ / telefone / endereço do fornecedor | `localStorage` do navegador (`B2B/js/configuracoes.js`) | fazer o B2B salvar no banco; o painel já lê e grava esses campos |
| Atendimento | não existia | colar `integracao/formulario-atendimento.html` no site público, na plataforma e no B2B |
| Banner, guias, benefícios e serviços | fixos no HTML de cada plataforma | fazer o B2B e a plataforma dos noivos lerem a tabela `conteudo_plataforma` em vez do conteúdo fixo |

Enquanto isso, essas telas aparecem **vazias** — não é erro: é a origem do dado
que ainda não existe. Os campos já editados pelo painel são gravados de verdade.


## Dashboards de conta

`Contas → Fornecedores → Dashboard` e `Contas → Clientes → Dashboard` são o
gerenciador do que cada plataforma publica. As duas telas usam o mesmo código
(`js/conteudo.js`), mudando só a plataforma alvo, e cobrem quatro seções:

```
Informações       carrossel da home — até 5 imagens, cada uma com
                  imagem, link, título e texto

Guias de início   um guia por assunto (mensagens, CRM, contratos, produtos
                  e serviços, vitrine, agenda, financeiro) — os mesmos da
                  coluna da esquerda em B2B/guias.html. Clicar no guia abre
                  o acordeão com todas as suas perguntas e respostas, que
                  podem ser editadas, excluídas e acrescentadas

Serviços          cada serviço, com os benefícios associados a ele
```

O carrossel não tem botão "adicionar" solto: os cinco espaços já aparecem na
tela, os preenchidos mostrando a miniatura e os vazios convidando a preencher.
Ao chegar em cinco, os espaços somem e o painel avisa que o limite foi atingido.

Os guias espelham o que o fornecedor vê em `B2B/guias.html` — a diferença é que
lá o conteúdo é fixo no HTML e aqui ele é escrito pelo admin. Quebras de linha
são preservadas do jeito que você digitar.

Dois níveis de aninhamento usam o mesmo mecanismo (`parent_id`):

```
guia    → perguntas e respostas
serviço → benefícios
```

Nos dois casos, excluir o pai apaga os filhos, e o painel avisa quantos antes
de confirmar. Se um filho acabar sem pai, aparece num bloco destacado em vez de
sumir em silêncio.

Benefício não existe solto: ele pertence sempre a um serviço, e é editado
dentro do bloco daquele serviço. Excluir um serviço apaga junto os benefícios
dele (`on delete cascade`) — o painel avisa quantos antes de confirmar. Se
algum benefício acabar sem serviço, ele aparece num bloco destacado
"Benefícios sem serviço" em vez de sumir em silêncio.

Cada item tem posição (ordem de exibição, do menor para o maior) e status:
**publicado** aparece na plataforma, **rascunho** fica só aqui. A leitura da
tabela é pública — é isso que permite as plataformas consumirem o conteúdo —
mas só o administrador escreve, e rascunhos não saem para fora.
