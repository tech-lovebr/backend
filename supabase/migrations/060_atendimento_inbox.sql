-- ==============================================================================
-- LOVE — Atendimento, etapa 1: inbox unificado e respostas prontas
--
-- Rode no SQL Editor DEPOIS do 059. É idempotente.
--
-- O chamado (tickets) vira uma conversa de qualquer canal: formulário, e-mail
-- (etapa 2), chat da plataforma (etapa 4) e WhatsApp (etapa 5). A conversa
-- ganha "última mensagem", "não lida" e os status do inbox. As mensagens
-- (ticket_messages) guardam o HTML enviado e se saíram por e-mail.
--
-- respostas_prontas é a biblioteca de "e-mails transacionais": o admin
-- escolhe a que melhor responde, personaliza e envia. Na etapa 3 a IA passa
-- a escolher e preencher sozinha.
-- ==============================================================================


-- ------------------------------------------------------------------
-- 1. Conversa (tickets)
-- ------------------------------------------------------------------

alter table tickets add column if not exists canal text not null default 'formulario';
alter table tickets add column if not exists last_message_at timestamptz;
alter table tickets add column if not exists nao_lido boolean not null default true;
alter table tickets add column if not exists categoria_ia text;
alter table tickets add column if not exists resumo text;

update tickets set last_message_at = coalesce(last_message_at, updated_at, created_at);
alter table tickets alter column last_message_at set default now();

do $$
declare c record;
begin
  -- Troca o check de status (nome gerado pelo Postgres) pelo novo conjunto.
  for c in
    select conname from pg_constraint
     where conrelid = 'tickets'::regclass and contype = 'c'
       and pg_get_constraintdef(oid) ilike '%status%'
  loop
    execute format('alter table tickets drop constraint %I', c.conname);
  end loop;

  alter table tickets add constraint tickets_status_check
    check (status in ('aberto', 'em_andamento', 'aguardando_cliente', 'resolvido', 'fechado', 'spam'));

  if not exists (select 1 from pg_constraint where conrelid = 'tickets'::regclass and conname = 'tickets_canal_check') then
    alter table tickets add constraint tickets_canal_check
      check (canal in ('formulario', 'email', 'chat', 'whatsapp'));
  end if;
end $$;

create index if not exists tickets_inbox_idx on tickets (status, last_message_at desc);

comment on column tickets.canal is 'Por onde a conversa chegou: formulario, email, chat ou whatsapp.';
comment on column tickets.nao_lido is 'Há mensagem do solicitante que o admin ainda não abriu.';
comment on column tickets.categoria_ia is 'Categoria dada pela IA (etapa 3).';
comment on column tickets.resumo is 'O que a pessoa quer, em uma frase (etapa 3).';


-- ------------------------------------------------------------------
-- 2. Mensagens (ticket_messages)
-- ------------------------------------------------------------------

alter table ticket_messages add column if not exists canal text not null default 'formulario';
alter table ticket_messages add column if not exists body_html text;
alter table ticket_messages add column if not exists enviado_por_email boolean not null default false;
alter table ticket_messages add column if not exists email_status text;
alter table ticket_messages add column if not exists email_erro text;
alter table ticket_messages add column if not exists email_message_id text;
alter table ticket_messages add column if not exists resposta_pronta_id uuid;

do $$
declare c record;
begin
  for c in
    select conname from pg_constraint
     where conrelid = 'ticket_messages'::regclass and contype = 'c'
       and pg_get_constraintdef(oid) ilike '%author_role%'
  loop
    execute format('alter table ticket_messages drop constraint %I', c.conname);
  end loop;

  alter table ticket_messages add constraint ticket_messages_author_role_check
    check (author_role in ('admin', 'usuario', 'ia', 'sistema'));
end $$;

-- Nova mensagem atualiza a conversa: data da última, "não lida" quando é do
-- solicitante, e reabre a conversa se ela estava encerrada ou aguardando.
create or replace function atualizar_conversa_do_ticket()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update tickets t
     set last_message_at = new.created_at,
         updated_at = now(),
         nao_lido = case when new.author_role = 'usuario' then true else t.nao_lido end,
         status = case
           when new.author_role = 'usuario' and t.status in ('aguardando_cliente', 'resolvido', 'fechado') then 'aberto'
           else t.status
         end
   where t.id = new.ticket_id;
  return new;
end;
$$;

drop trigger if exists ticket_messages_atualiza_conversa on ticket_messages;
create trigger ticket_messages_atualiza_conversa
  after insert on ticket_messages
  for each row execute function atualizar_conversa_do_ticket();


-- ------------------------------------------------------------------
-- 3. Respostas prontas
-- ------------------------------------------------------------------

create table if not exists respostas_prontas (
  id uuid primary key default gen_random_uuid(),
  titulo text not null,
  categoria text not null default 'Geral',
  publico text not null default 'todos' check (publico in ('todos', 'cliente', 'fornecedor')),
  assunto text,
  corpo_html text not null default '',
  palavras_chave text[] not null default '{}',
  envio_automatico boolean not null default false,
  ativo boolean not null default true,
  usos integer not null default 0,
  criado_por uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table respostas_prontas enable row level security;

drop policy if exists "respostas_prontas_admin" on respostas_prontas;
create policy "respostas_prontas_admin" on respostas_prontas
  for all to authenticated using (is_admin()) with check (is_admin());

drop trigger if exists respostas_prontas_touch on respostas_prontas;
create trigger respostas_prontas_touch before update on respostas_prontas
  for each row execute function touch_faq();

comment on column respostas_prontas.corpo_html is
  'HTML com variáveis: {{nome}}, {{primeiro_nome}}, {{protocolo}}, {{assunto}}.';
comment on column respostas_prontas.palavras_chave is 'Ajudam a IA (etapa 3) a escolher esta resposta.';
comment on column respostas_prontas.envio_automatico is 'Etapa 3: a IA pode enviar sozinha quando esta resposta servir.';

insert into respostas_prontas (titulo, categoria, publico, assunto, corpo_html, palavras_chave)
select * from (values
  ('Recebemos sua mensagem', 'Geral', 'todos', 'Recebemos sua mensagem',
   '<p>Olá, {{primeiro_nome}}!</p><p>Recebemos sua mensagem (protocolo {{protocolo}}) e já estamos olhando. Respondemos por aqui o quanto antes.</p><p>Equipe Love</p>',
   array['recebido','protocolo']),
  ('Como sacar o saldo da carteira', 'Carteira digital', 'cliente', 'Como sacar o saldo da sua carteira',
   '<p>Olá, {{primeiro_nome}}!</p><p>Para sacar, abra a <strong>Carteira</strong> na plataforma, cadastre seus dados de saque (chave Pix ou conta para TED) e toque em <strong>Sacar</strong>. O valor cai na sua conta em até 1 dia útil.</p><p>Qualquer dúvida, é só responder este e-mail.</p><p>Equipe Love</p>',
   array['saque','sacar','carteira','pix','saldo']),
  ('Redefinir senha', 'Acesso e senha', 'todos', 'Como redefinir sua senha',
   '<p>Olá, {{primeiro_nome}}!</p><p>Na tela de entrada, toque em <strong>Esqueci minha senha</strong> e informe o seu e-mail. Você vai receber um link para criar uma senha nova.</p><p>Se o e-mail não chegar em alguns minutos, confira a caixa de spam ou responda esta mensagem.</p><p>Equipe Love</p>',
   array['senha','acesso','entrar','login','esqueci'])
) as v(titulo, categoria, publico, assunto, corpo_html, palavras_chave)
where not exists (select 1 from respostas_prontas);
