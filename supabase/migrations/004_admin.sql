-- ==============================================================================
-- LOVE — Backend do Painel Administrativo (admin.love.com.br)
--
-- Rode este arquivo inteiro no SQL Editor do Supabase, DEPOIS do
-- 003_checkout_publico.sql. É idempotente: pode rodar mais de uma vez.
--
-- O que ele faz:
--   1. Cria o papel de administrador (tabela `admins` + função `is_admin()`).
--   2. Completa o cadastro do fornecedor com CNPJ, telefone e endereço
--      (hoje esses campos só existem no localStorage do navegador dele).
--   3. Cria as tabelas do lado dos noivos (eventos, convidados, presentes,
--      carteira) — hoje tudo isso é mock em js/data.js.
--   4. Cria o canal de atendimento (tickets) aberto ao site público.
--   5. Dá ao administrador acesso de leitura e escrita em TODAS as tabelas.
-- ==============================================================================


-- ------------------------------------------------------------------
-- 1. Papel de administrador
-- ------------------------------------------------------------------

create table if not exists admins (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null default '',
  email text not null,
  role text not null default 'admin' check (role in ('admin', 'superadmin')),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- SECURITY DEFINER: roda com os privilégios do dono da função, ignorando o RLS
-- da própria tabela `admins`. Sem isso, a policy de `admins` chamaria a função
-- que consulta `admins` de novo — recursão infinita.
create or replace function is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from admins a where a.id = auth.uid() and a.active
  );
$$;

alter table admins enable row level security;

drop policy if exists "admins_select_self_or_admin" on admins;
create policy "admins_select_self_or_admin" on admins
  for select to authenticated using (id = auth.uid() or is_admin());

drop policy if exists "admins_write_admin" on admins;
create policy "admins_write_admin" on admins
  for all to authenticated using (is_admin()) with check (is_admin());


-- ------------------------------------------------------------------
-- 2. Cadastro completo do fornecedor
--    (campos que o B2B coleta em Configurações mas nunca salva no banco)
-- ------------------------------------------------------------------

alter table fornecedores add column if not exists razao_social text;
alter table fornecedores add column if not exists document_type text default 'cnpj';
alter table fornecedores add column if not exists cnpj text;
alter table fornecedores add column if not exists phone text;
alter table fornecedores add column if not exists address text;
alter table fornecedores add column if not exists city text;
alter table fornecedores add column if not exists state text;
alter table fornecedores add column if not exists description text;
alter table fornecedores add column if not exists status text not null default 'ativo';
alter table fornecedores add column if not exists contact_name text;

alter table clientes add column if not exists phone text;
alter table clientes add column if not exists cpf text;
alter table clientes add column if not exists city text;
alter table clientes add column if not exists status text not null default 'ativo';


-- ------------------------------------------------------------------
-- 3. Plataforma dos noivos: eventos, convidados, presentes e carteira
-- ------------------------------------------------------------------

create table if not exists eventos (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references clientes(id) on delete cascade,
  tipo text not null default 'wedding'
    check (tipo in ('wedding', 'baby', 'birthday', 'corporate', 'other')),
  titulo text not null,
  host_name text,
  data_evento date,
  slug text unique,
  theme text,
  cover_image_url text,
  status text not null default 'ativo'
    check (status in ('rascunho', 'ativo', 'encerrado')),
  created_at timestamptz not null default now()
);

create table if not exists convidados (
  id uuid primary key default gen_random_uuid(),
  evento_id uuid not null references eventos(id) on delete cascade,
  cliente_id uuid not null references clientes(id) on delete cascade,
  nome text not null,
  email text,
  telefone text,
  tipo text not null default 'adulto' check (tipo in ('adulto', 'crianca')),
  status text not null default 'pendente'
    check (status in ('pendente', 'confirmado', 'recusado')),
  mesa text,
  created_at timestamptz not null default now()
);

create table if not exists presentes (
  id uuid primary key default gen_random_uuid(),
  evento_id uuid not null references eventos(id) on delete cascade,
  cliente_id uuid not null references clientes(id) on delete cascade,
  nome text not null,
  categoria text,
  valor numeric not null default 0,
  imagem_url text,
  status text not null default 'disponivel'
    check (status in ('disponivel', 'recebido')),
  comprador_nome text,
  comprador_email text,
  mensagem text,
  recebido_em timestamptz,
  created_at timestamptz not null default now()
);

-- Carteira do cliente/casal (saldo em conta). Espelha wallet_transactions,
-- que é a carteira do fornecedor — são coisas diferentes, tabelas diferentes.
create table if not exists cliente_wallet_transactions (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references clientes(id) on delete cascade,
  evento_id uuid references eventos(id) on delete set null,
  presente_id uuid references presentes(id) on delete set null,
  type text not null check (type in ('credit', 'debit')),
  amount numeric not null,
  description text,
  created_at timestamptz not null default now()
);

create index if not exists eventos_cliente_idx on eventos (cliente_id);
create index if not exists convidados_evento_idx on convidados (evento_id);
create index if not exists presentes_evento_idx on presentes (evento_id);
create index if not exists cliente_wallet_cliente_idx on cliente_wallet_transactions (cliente_id);


-- ------------------------------------------------------------------
-- 4. Canal de atendimento (tickets)
--    Recebe tanto do site público (visitante sem login) quanto de
--    clientes e fornecedores logados.
-- ------------------------------------------------------------------

create sequence if not exists ticket_protocolo_seq;

create table if not exists tickets (
  id uuid primary key default gen_random_uuid(),
  protocolo text unique not null
    default ('LV' || lpad(nextval('ticket_protocolo_seq')::text, 6, '0')),
  origem text not null default 'site'
    check (origem in ('site', 'cliente', 'fornecedor')),
  user_id uuid references auth.users(id) on delete set null,
  nome text not null,
  email text not null,
  telefone text,
  assunto text not null,
  categoria text,
  mensagem text,
  status text not null default 'aberto'
    check (status in ('aberto', 'em_andamento', 'resolvido', 'fechado')),
  prioridade text not null default 'normal'
    check (prioridade in ('baixa', 'normal', 'alta')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Respostas trocadas depois da abertura. A mensagem inicial fica em
-- tickets.mensagem, para que quem abre o chamado sem login precise de
-- permissão de escrita em uma tabela só.
create table if not exists ticket_messages (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references tickets(id) on delete cascade,
  author_role text not null check (author_role in ('admin', 'usuario')),
  author_id uuid references auth.users(id) on delete set null,
  author_name text,
  body text not null,
  created_at timestamptz not null default now()
);

create index if not exists tickets_status_idx on tickets (status, created_at desc);
create index if not exists ticket_messages_ticket_idx on ticket_messages (ticket_id, created_at);

alter table tickets enable row level security;
alter table ticket_messages enable row level security;

-- Qualquer visitante do site público pode abrir um chamado (sem login)...
drop policy if exists "tickets_public_insert" on tickets;
create policy "tickets_public_insert" on tickets
  for insert to anon, authenticated with check (true);

-- Observação: não existe policy de SELECT para `anon` — de propósito. Isso
-- significa que o formulário público NÃO pode usar .select() depois do
-- insert (o RETURNING do Postgres exige permissão de leitura). Abrir leitura
-- para anon exporia os chamados de todo mundo.

-- ...mas só o próprio autor logado (ou o admin) consegue ler de volta.
drop policy if exists "tickets_select_owner_or_admin" on tickets;
create policy "tickets_select_owner_or_admin" on tickets
  for select to authenticated using (user_id = auth.uid() or is_admin());

drop policy if exists "tickets_update_admin" on tickets;
create policy "tickets_update_admin" on tickets
  for update to authenticated using (is_admin()) with check (is_admin());

drop policy if exists "tickets_delete_admin" on tickets;
create policy "tickets_delete_admin" on tickets
  for delete to authenticated using (is_admin());

drop policy if exists "ticket_messages_select_owner_or_admin" on ticket_messages;
create policy "ticket_messages_select_owner_or_admin" on ticket_messages
  for select to authenticated using (
    is_admin() or exists (
      select 1 from tickets t
      where t.id = ticket_messages.ticket_id and t.user_id = auth.uid()
    )
  );

drop policy if exists "ticket_messages_insert_owner_or_admin" on ticket_messages;
create policy "ticket_messages_insert_owner_or_admin" on ticket_messages
  for insert to authenticated with check (
    is_admin() or exists (
      select 1 from tickets t
      where t.id = ticket_messages.ticket_id and t.user_id = auth.uid()
    )
  );


-- ------------------------------------------------------------------
-- 5. RLS das tabelas dos noivos: dono da linha OU administrador
-- ------------------------------------------------------------------

do $$
declare t text;
begin
  foreach t in array array['eventos', 'convidados', 'presentes', 'cliente_wallet_transactions']
  loop
    execute format('alter table %I enable row level security;', t);
    execute format('drop policy if exists "%1$s_owner_or_admin" on %1$I;', t);
    execute format(
      'create policy "%1$s_owner_or_admin" on %1$I for all to authenticated '
      'using (cliente_id = auth.uid() or is_admin()) '
      'with check (cliente_id = auth.uid() or is_admin());',
      t
    );
  end loop;
end $$;


-- ------------------------------------------------------------------
-- 6. Acesso total do administrador a TODAS as demais tabelas
--    (policies permissivas — somam-se às policies de dono já existentes,
--     sem substituí-las: o fornecedor continua vendo só o que é dele)
-- ------------------------------------------------------------------

do $$
declare t text;
begin
  foreach t in array array[
    'fornecedores', 'clientes',
    'conversations', 'messages',
    'leads', 'products', 'contracts', 'contract_guests',
    'payment_links', 'notas_fiscais', 'wallet_transactions',
    'agenda_lists', 'agenda_tasks', 'agenda_task_activity', 'agenda_events'
  ]
  loop
    execute format('drop policy if exists "%1$s_admin_all" on %1$I;', t);
    execute format(
      'create policy "%1$s_admin_all" on %1$I for all to authenticated '
      'using (is_admin()) with check (is_admin());',
      t
    );
  end loop;
end $$;


-- ==============================================================================
-- 7. COMO CRIAR O PRIMEIRO ADMINISTRADOR
--
--   a) Supabase → Authentication → Users → "Add user" → crie o usuário com
--      e-mail e senha (marque "Auto Confirm User").
--   b) Copie o UUID do usuário criado e rode:
--
--        insert into admins (id, name, email, role)
--        values ('COLE-O-UUID-AQUI', 'Seu Nome', 'seu@email.com', 'superadmin');
--
--   A senha é definida por você no painel do Supabase — o código do Admin
--   nunca armazena nem manipula senha.
-- ==============================================================================
