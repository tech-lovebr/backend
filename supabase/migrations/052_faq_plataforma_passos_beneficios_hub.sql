-- ==============================================================================
-- LOVE — FAQ por plataforma, primeiros passos, benefícios da home e conteúdo do Hub
--
-- Rode no SQL Editor DEPOIS do 051_faq_e_excluir_minha_conta.sql. É idempotente.
--
-- 1. faq ganha `plataforma`: a mesma tabela serve a página Dúvidas dos
--    anfitriões ('cliente') e os Guias de início do Hub ('fornecedor'). A
--    resposta passa a aceitar HTML escrito no Admin — negrito, listas, link e
--    vídeo incorporado (YouTube/Vimeo). As perguntas que o Hub tinha fixas na
--    página entram aqui uma vez; depois o Admin cuida.
--
-- 2. primeiros_passos — os passos iniciais mostrados a quem acabou de entrar
--    (até 6 por plataforma), editáveis no Admin.
--
-- 3. servicos_beneficios ganha os campos dos dois lugares onde aparece na
--    plataforma dos anfitriões:
--      tipo 'desconto' → card de "Benefícios & Serviços" na home
--                        (logo, nome, "Até 25% OFF", cupom ou link);
--      tipo 'servico'  → card de "Benefícios Love" (imagem, título,
--                        descrição, "a partir de" ou valor fixo).
--    Os cards que estavam fixos no HTML entram aqui uma vez.
--
-- 4. hub_conteudo — workshops, comunidade, causas, loja e notícias que o
--    Admin publica para o Hub (lista de notícias do dashboard e a futura
--    página /workshop).
-- ==============================================================================


-- ------------------------------------------------------------------
-- 1. FAQ por plataforma
-- ------------------------------------------------------------------

alter table faq add column if not exists plataforma text not null default 'cliente';

do $$
begin
  if not exists (
    select 1 from pg_constraint
     where conrelid = 'faq'::regclass and conname = 'faq_plataforma_check'
  ) then
    alter table faq add constraint faq_plataforma_check
      check (plataforma in ('cliente', 'fornecedor'));
  end if;
end $$;

create index if not exists faq_plataforma_idx on faq (plataforma, categoria, ordem);

-- Nome da categoria igual ao do menu da plataforma.
update faq set categoria = 'Editar meu site' where categoria = 'Edição de site';

comment on column faq.resposta is
  'HTML escrito no Admin (parágrafos, listas, links e <iframe> de vídeo). Texto puro continua valendo.';

insert into faq (plataforma, categoria, pergunta, resposta, ordem)
select * from (values
  ('fornecedor', 'Construtor de site', 'Como acesso o construtor do meu site?', 'Acesse "Editor de Site" no menu lateral. Lá você edita a página principal e a página de checkout com o mesmo editor visual.', 1),
  ('fornecedor', 'Construtor de site', 'Como personalizo as cores e fontes do meu site?', 'No editor, abra a aba "Estilo global" para definir a cor primária, o raio dos cantos e a fonte dos títulos usada em todas as seções.', 2),
  ('fornecedor', 'Construtor de site', 'Posso adicionar novas seções à minha página?', 'Sim. Use o botão "Adicionar seção" dentro do editor e escolha entre os modelos disponíveis (texto, imagem, colunas, banner, etc.).', 3),
  ('fornecedor', 'Construtor de site', 'Como funciona o checkout personalizado?', 'A página "Meu Checkout" já vem com o mesmo cabeçalho do seu site principal. Os campos de nome, e-mail e pagamento têm formatação fixa e só permitem editar a fonte e a cor do texto.', 4),
  ('fornecedor', 'Construtor de site', 'As alterações aparecem no site na hora?', 'Não. Depois de editar, clique em "Publicar" para que as mudanças fiquem visíveis para quem acessa seu link.', 5),
  ('fornecedor', 'Construtor de site', 'Como meus clientes acessam o link de pagamento?', 'Cada link de pagamento criado em Financeiro abre automaticamente a página de checkout publicada, com o valor já preenchido.', 6),
  ('fornecedor', 'Construtor de site', 'Posso usar um domínio próprio?', 'Ainda não. No momento, todo site é publicado em um link love.app/seu-nome.', 7),
  ('fornecedor', 'Construtor de site', 'Como visualizo minha página em diferentes tamanhos de tela?', 'Use o seletor de dispositivo (desktop, tablet, celular) no topo do editor para conferir como cada seção se comporta.', 8),
  ('fornecedor', 'Construtor de site', 'É possível desfazer uma alteração?', 'O editor salva automaticamente a cada mudança; para reverter, edite novamente os elementos ou remova a seção adicionada por engano.', 9),
  ('fornecedor', 'Construtor de site', 'Meu site fica visível mesmo sem eu publicar produtos?', 'Sim, mas a vitrine de produtos só mostra itens depois que você cadastra pelo menos um em "Serviços".', 10),
  ('fornecedor', 'Guia de CRM', 'O que aparece automaticamente em Contatos?', 'Todo novo interesse de um anfitrião pela plataforma vira um lead automaticamente na lista de Contatos.', 1),
  ('fornecedor', 'Guia de CRM', 'Como cadastro um contato manualmente?', 'Clique em "Adicionar contato", preencha nome, e-mail e os demais dados — o restante do formulário é opcional.', 2),
  ('fornecedor', 'Guia de CRM', 'Para que servem os campos de CPF, cidade e estado?', 'Ajudam a qualificar o lead e agilizar a emissão de contratos e notas fiscais mais adiante.', 3),
  ('fornecedor', 'Guia de CRM', 'Como vinculo um contato a um produto do meu catálogo?', 'No campo "Produto/Serviço de interesse", selecione um item já cadastrado em Serviços ou clique em "+ Cadastrar serviço".', 4),
  ('fornecedor', 'Guia de CRM', 'O que significa o selo "Vinculado à conta deste cliente na Love"?', 'Indica que o e-mail informado já pertence a uma conta de cliente ativa na plataforma Love.', 5),
  ('fornecedor', 'Guia de CRM', 'Como funciona o campo Tipo do evento?', 'Escolha entre Casamento, Aniversário, Chá de bebê e outras opções para organizar seus leads por tipo de celebração.', 6),
  ('fornecedor', 'Guia de CRM', 'Posso filtrar contatos por status?', 'Sim, use as abas acima da tabela para alternar entre os status do funil de vendas.', 7),
  ('fornecedor', 'Guia de CRM', 'Como pesquiso um contato específico?', 'Use a barra de busca ao lado do botão "Adicionar contato" para filtrar por nome.', 8),
  ('fornecedor', 'Guia de CRM', 'Dá para adicionar observações sobre uma negociação?', 'Sim, abra o contato e use a seção de comentários para registrar o histórico da conversa.', 9),
  ('fornecedor', 'Guia de CRM', 'Como excluo um contato cadastrado por engano?', 'Abra o contato e use o botão "Excluir" na parte inferior do formulário.', 10),
  ('fornecedor', 'Guia de contratos', 'Onde vejo meu saldo disponível para saque?', 'Na página Financeiro, na aba "Financeiro", o card "Saque disponível" mostra o valor pronto para transferência.', 1),
  ('fornecedor', 'Guia de contratos', 'Como faço para sacar meu saldo?', 'Clique em "Sacar Pix", informe sua chave (ou dados bancários) e confirme — o valor cai na conta em até 1 dia útil.', 2),
  ('fornecedor', 'Guia de contratos', 'Como crio um link de pagamento?', 'Na aba "Receber", preencha o valor e as opções de pagamento (Boleto, Pix, Cartão) e clique em "Criar link de pagamento".', 3),
  ('fornecedor', 'Guia de contratos', 'Posso repassar a taxa da maquininha para o cliente?', 'Sim, use a opção "Repassar a taxa" ao criar o link de pagamento.', 4),
  ('fornecedor', 'Guia de contratos', 'Como acompanho os contratos em aberto?', 'A tabela "Gestão de pagamentos" mostra cliente, valor total, parcelas pagas e a próxima parcela de cada contrato.', 5),
  ('fornecedor', 'Guia de contratos', 'O que significa "Quitação" na tabela de contratos?', 'Indica se o contrato está em dia, atrasado ou já totalmente quitado.', 6),
  ('fornecedor', 'Guia de contratos', 'Como sei se um link de pagamento já foi pago?', 'Na aba "Receber", a lista de "Links gerados" mostra o status de cada link (pendente ou pago).', 7),
  ('fornecedor', 'Guia de contratos', 'O saldo pendente inclui vendas ainda não recebidas?', 'Sim, "Saldo pendente" soma valores de links criados que ainda não foram pagos pelo cliente.', 8),
  ('fornecedor', 'Guia de produtos e serviços', 'Como cadastro um novo produto ou serviço?', 'Acesse Serviços e clique em "Adicionar produto/serviço", preenchendo nome, categoria e preço.', 1),
  ('fornecedor', 'Guia de produtos e serviços', 'Quais categorias estão disponíveis?', 'Buffet, Decoração, Fotografia e mídia, Locação de espaço, Aluguel de equipamentos, entre outras.', 2),
  ('fornecedor', 'Guia de produtos e serviços', 'Posso adicionar mais de uma foto por item?', 'Sim, além da imagem de capa você pode incluir imagens adicionais na galeria do produto.', 3),
  ('fornecedor', 'Guia de produtos e serviços', 'Como funcionam os campos específicos de "Locação de espaço"?', 'Ao escolher essa categoria, aparecem campos extras como endereço, metragem, áreas comuns e planta do espaço.', 4),
  ('fornecedor', 'Guia de produtos e serviços', 'Dá para editar um produto depois de publicado?', 'Sim, clique no card do produto no catálogo e ajuste as informações a qualquer momento.', 5),
  ('fornecedor', 'Guia de produtos e serviços', 'Como meus produtos aparecem para o cliente?', 'Eles aparecem automaticamente na vitrine do seu site e no catálogo mostrado durante propostas no CRM.', 6),
  ('fornecedor', 'Guia de produtos e serviços', 'Posso ocultar um produto sem excluí-lo?', 'No momento não; para remover da vitrine é necessário excluir o item do catálogo.', 7),
  ('fornecedor', 'Guia de produtos e serviços', 'O que acontece se o catálogo estiver vazio?', 'A página de Serviços mostra uma mensagem convidando você a cadastrar seu primeiro produto.', 8),
  ('fornecedor', 'Guia de agenda e tarefas', 'Onde vejo meus compromissos do dia?', 'Acesse Gestão e abra a aba "Agenda" para ver a linha do tempo do dia selecionado no calendário.', 1),
  ('fornecedor', 'Guia de agenda e tarefas', 'Como adiciono um novo evento na agenda?', 'Clique em "Adicionar" no painel da linha do tempo e preencha os dados do compromisso.', 2),
  ('fornecedor', 'Guia de agenda e tarefas', 'Como funciona o quadro de tarefas?', 'Na aba "Tarefas", organize pendências em colunas (como "Começar", "Em andamento", "Concluído") e arraste os cartões entre elas.', 3),
  ('fornecedor', 'Guia de agenda e tarefas', 'Posso definir um prazo para uma tarefa?', 'Sim, abra o cartão da tarefa e defina uma data de vencimento.', 4),
  ('fornecedor', 'Guia de agenda e tarefas', 'Dá para compartilhar minha agenda com a equipe?', 'Sim, use o botão "Compartilhar agenda" no topo da página.', 5),
  ('fornecedor', 'Guia de agenda e tarefas', 'Como sei se uma tarefa está prestes a vencer?', 'Tarefas com vencimento próximo geram um aviso no sino de notificações.', 6),
  ('fornecedor', 'Guia de agenda e tarefas', 'Posso criar novas colunas no quadro de tarefas?', 'Sim, até 4 colunas personalizadas, cada uma com uma cor diferente.', 7),
  ('fornecedor', 'Guia de agenda e tarefas', 'Como acompanho o histórico de uma tarefa?', 'Abra o cartão e veja a lista de atividades registradas, como criação, comentários e mudanças de coluna.', 8),
  ('fornecedor', 'Gestão de compromissos', 'O que é a aba "Meus Contratos" dentro de Gestão?', 'É onde você acompanha cada cliente com contrato fechado, o status do pagamento e os detalhes do evento.', 1),
  ('fornecedor', 'Gestão de compromissos', 'Como filtro contratos por status?', 'Use o filtro "Status" acima da lista para ver apenas contratos em dia, atrasados ou finalizados.', 2),
  ('fornecedor', 'Gestão de compromissos', 'Que informações do evento posso registrar?', 'Nome, local, data, horário, dress code e observações gerais sobre a celebração.', 3),
  ('fornecedor', 'Gestão de compromissos', 'Como adiciono convidados a um contrato?', 'Abra o contrato, acesse a lista de convidados e cadastre nome, status de confirmação e mesa.', 4),
  ('fornecedor', 'Gestão de compromissos', 'Dá para editar os dados de um evento depois de criado?', 'Sim, todos os campos do evento podem ser atualizados a qualquer momento pela tela do contrato.', 5),
  ('fornecedor', 'Gestão de compromissos', 'Como sei quanto falta para o cliente quitar o contrato?', 'O card do contrato mostra o valor total, parcelas pagas e a próxima parcela prevista.', 6),
  ('fornecedor', 'Gestão de compromissos', 'O que acontece quando um contrato é totalmente pago?', 'Ele passa automaticamente para o status "Quitado" na lista de contratos.', 7),
  ('fornecedor', 'Gestão de compromissos', 'Como acesso rapidamente os dados de contato do cliente?', 'Clique no nome do cliente na lista para abrir o resumo com telefone, e-mail e histórico.', 8),
  ('fornecedor', 'Guia financeiro', 'Como crio uma proposta comercial?', 'Acesse Vendas, preencha os dados do cliente e adicione os itens do seu catálogo na tabela de proposta.', 1),
  ('fornecedor', 'Guia financeiro', 'Posso incluir itens que não estão no meu catálogo?', 'Sim, use a seção "Outros itens ou serviços" para descrever produtos avulsos na proposta.', 2),
  ('fornecedor', 'Guia financeiro', 'Como funcionam as notas fiscais?', 'Toda venda paga pelo checkout ou por um link de pagamento gera uma nota fiscal automaticamente na aba "Notas fiscais".', 3),
  ('fornecedor', 'Guia financeiro', 'Dá para exportar minhas notas fiscais?', 'Sim, use os botões "Gerar PDF DANFE" ou "Exportar XML" na barra de ações.', 4),
  ('fornecedor', 'Guia financeiro', 'Como acompanho notas pendentes de envio?', 'Use a ação "Enviar notas pendentes" no painel lateral da aba Notas fiscais.', 5),
  ('fornecedor', 'Guia financeiro', 'Posso pesquisar uma nota por cliente ou número?', 'Sim, use a busca no topo da lista de notas fiscais.', 6),
  ('fornecedor', 'Guia financeiro', 'Como defino a data do próximo contato com o cliente na proposta?', 'Preencha o campo "Data do Próximo Contato" ao montar a proposta comercial.', 7),
  ('fornecedor', 'Guia financeiro', 'O valor total da proposta é calculado automaticamente?', 'Sim, conforme você adiciona itens e ajusta quantidade ou desconto, o preço total é recalculado na hora.', 8)
) as v(plataforma, categoria, pergunta, resposta, ordem)
where not exists (select 1 from faq where plataforma = 'fornecedor');


-- ------------------------------------------------------------------
-- 2. Primeiros passos
-- ------------------------------------------------------------------

create table if not exists primeiros_passos (
  id uuid primary key default gen_random_uuid(),
  plataforma text not null check (plataforma in ('cliente', 'fornecedor')),
  titulo text not null,
  descricao text,
  icone text,
  link_url text,
  link_label text,
  ordem integer not null default 0,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists primeiros_passos_idx on primeiros_passos (plataforma, ordem);

alter table primeiros_passos enable row level security;

drop policy if exists "primeiros_passos_leitura" on primeiros_passos;
create policy "primeiros_passos_leitura" on primeiros_passos
  for select to anon, authenticated using (ativo);

drop policy if exists "primeiros_passos_admin" on primeiros_passos;
create policy "primeiros_passos_admin" on primeiros_passos
  for all to authenticated using (is_admin()) with check (is_admin());

drop trigger if exists primeiros_passos_touch on primeiros_passos;
create trigger primeiros_passos_touch before update on primeiros_passos
  for each row execute function touch_faq();

-- Os três pontos de partida que o Hub mostrava fixos na boas-vindas.
insert into primeiros_passos (plataforma, titulo, descricao, icone, link_url, ordem)
select * from (values
  ('fornecedor', 'Acompanhe seus leads', 'Leads e negociações ficam em Contatos e Serviços.', '💬', 'crm', 1),
  ('fornecedor', 'Envie contratos', 'Envie e acompanhe contratos em Financeiro.', '📄', 'contratos', 2),
  ('fornecedor', 'Organize sua semana', 'Agenda e tarefas ficam em Gestão.', '🗓️', 'agenda', 3)
) as v(plataforma, titulo, descricao, icone, link_url, ordem)
where not exists (select 1 from primeiros_passos where plataforma = 'fornecedor');


-- ------------------------------------------------------------------
-- 3. Benefícios & Serviços (home) e Benefícios Love
-- ------------------------------------------------------------------

alter table servicos_beneficios add column if not exists tipo text not null default 'servico';
alter table servicos_beneficios add column if not exists titulo text;
alter table servicos_beneficios add column if not exists desconto_texto text;
alter table servicos_beneficios add column if not exists cupom text;
alter table servicos_beneficios add column if not exists grupo text;
alter table servicos_beneficios add column if not exists preco_tipo text not null default 'a_partir';
alter table servicos_beneficios add column if not exists preco_sufixo text;

do $$
begin
  if not exists (
    select 1 from pg_constraint
     where conrelid = 'servicos_beneficios'::regclass and conname = 'servicos_beneficios_tipo_check'
  ) then
    alter table servicos_beneficios add constraint servicos_beneficios_tipo_check
      check (tipo in ('desconto', 'servico'));
  end if;
  if not exists (
    select 1 from pg_constraint
     where conrelid = 'servicos_beneficios'::regclass and conname = 'servicos_beneficios_preco_tipo_check'
  ) then
    alter table servicos_beneficios add constraint servicos_beneficios_preco_tipo_check
      check (preco_tipo in ('a_partir', 'fixo'));
  end if;
end $$;

comment on column servicos_beneficios.tipo is
  'desconto = card de Benefícios & Serviços na home; servico = card de Benefícios Love.';
comment on column servicos_beneficios.desconto_texto is 'Texto do desconto no card da home, ex.: "Até 25% OFF".';
comment on column servicos_beneficios.cupom is 'Código copiado ao clicar no card da home. Sem cupom, o clique abre link_url.';
comment on column servicos_beneficios.grupo is 'Seção dentro de Benefícios Love, ex.: "Para os casais".';
comment on column servicos_beneficios.preco_tipo is 'a_partir mostra "A partir de" antes do preço; fixo mostra só o preço.';
comment on column servicos_beneficios.preco_sufixo is 'Depois do preço, ex.: "por mês", "por cobertura".';

-- Cards da home que estavam fixos no index.html.
insert into servicos_beneficios (tipo, nome, parceiro, desconto_texto, cupom, descricao, posicao, ativo)
select * from (values
  ('desconto', 'FotoRegistro', 'FotoRegistro', 'Até 75% OFF', 'LOVE75', 'Até 75% OFF em álbuns e revelações.', 1, true),
  ('desconto', 'Black Tie',    'Black Tie',    '25% OFF',     'LOVE25', '25% OFF em trajes a rigor e noivos.', 2, true),
  ('desconto', 'Consul',       'Consul',       'Até 30% OFF', 'LOVECONSUL', 'Até 30% OFF em eletrodomésticos para o novo lar.', 3, true),
  ('desconto', 'KitchenAid',   'KitchenAid',   'Até 30% OFF', 'LOVEKITCHEN', 'Até 30% OFF em batedeiras e utilitários KitchenAid.', 4, true)
) as v(tipo, nome, parceiro, desconto_texto, cupom, descricao, posicao, ativo)
where not exists (select 1 from servicos_beneficios where tipo = 'desconto');

-- Seguros de Benefícios Love que estavam fixos no index.html.
insert into servicos_beneficios (tipo, nome, parceiro, titulo, descricao, imagem_url, grupo, preco, preco_tipo, preco_sufixo, periodicidade, posicao, ativo)
select * from (values
  ('servico', 'Porto Seguro', 'Porto Seguro', 'Seguro residência',
   'Proteção para o seu lar, com coberturas contra imprevistos e serviços para o dia a dia.',
   'assets/insurance_residence.jpg', 'Para os casais', 19.90, 'a_partir', '12x por mês', 'mensal', 1, true),
  ('servico', 'Hero Seguros', 'Hero Seguros', 'Seguro viagem',
   'Proteção nas suas viagens e lua de mel, com cobertura para imprevistos onde estiver.',
   'assets/insurance_travel.jpg', 'Para os casais', 12.45, 'a_partir', 'por cobertura', 'unico', 2, true),
  ('servico', 'Clubfix', 'Clubfix', 'Seguro para celular',
   'Mais tranquilidade para usar seu celular onde quiser, sem preocupação.',
   'assets/insurance_phone.jpg', 'Para os casais', 99, 'fixo', 'por 15 dias', 'unico', 3, true)
) as v(tipo, nome, parceiro, titulo, descricao, imagem_url, grupo, preco, preco_tipo, preco_sufixo, periodicidade, posicao, ativo)
where not exists (select 1 from servicos_beneficios where tipo = 'servico');


-- ------------------------------------------------------------------
-- 4. Conteúdo do Hub
-- ------------------------------------------------------------------

create table if not exists hub_conteudo (
  id uuid primary key default gen_random_uuid(),
  tipo text not null check (tipo in ('noticia', 'workshop', 'comunidade', 'causa', 'loja')),
  titulo text not null,
  descricao text,
  imagem_url text,
  link_url text,
  data_evento date,
  ordem integer not null default 0,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists hub_conteudo_idx on hub_conteudo (tipo, ordem, created_at desc);

alter table hub_conteudo enable row level security;

drop policy if exists "hub_conteudo_leitura" on hub_conteudo;
create policy "hub_conteudo_leitura" on hub_conteudo
  for select to anon, authenticated using (ativo);

drop policy if exists "hub_conteudo_admin" on hub_conteudo;
create policy "hub_conteudo_admin" on hub_conteudo
  for all to authenticated using (is_admin()) with check (is_admin());

drop trigger if exists hub_conteudo_touch on hub_conteudo;
create trigger hub_conteudo_touch before update on hub_conteudo
  for each row execute function touch_faq();

-- Notícias que o dashboard do Hub mostrava fixas.
insert into hub_conteudo (tipo, titulo, link_url, ordem)
select * from (values
  ('noticia', 'Love lança novo painel de métricas para fornecedores', null, 1),
  ('noticia', '5 dicas para aumentar sua taxa de conversão de leads', null, 2),
  ('workshop', 'Convite: Workshop online sobre precificação de eventos', null, 3),
  ('noticia', 'Pagamentos via PIX chegaram à plataforma Love', null, 4),
  ('noticia', 'Como destacar seu portfólio na vitrine e atrair mais clientes', null, 5)
) as v(tipo, titulo, link_url, ordem)
where not exists (select 1 from hub_conteudo);
