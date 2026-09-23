-- ==============================================================================
-- Autenticação real + chat sincronizado entre B2B (fornecedores) e app
-- principal (clientes/casais) — rode este arquivo inteiro no SQL Editor do
-- Supabase (Project → SQL Editor → New query → colar tudo → Run).
-- ==============================================================================

-- ------------------------------------------------------------------
-- 1. Perfis (separados por tipo de conta, ligados 1:1 a auth.users)
-- ------------------------------------------------------------------

create table if not exists fornecedores (
  id uuid primary key references auth.users(id) on delete cascade,
  company_name text not null,
  email text not null,
  avatar_url text,
  category text,
  plan text not null default 'Gratuito',
  created_at timestamptz not null default now()
);

create table if not exists clientes (
  id uuid primary key references auth.users(id) on delete cascade,
  couple_name text not null,
  email text not null,
  avatar_url text,
  created_at timestamptz not null default now()
);

-- ------------------------------------------------------------------
-- 2. Trigger: ao criar um usuário em auth.users, cria automaticamente
--    a linha de perfil correspondente (fornecedor ou cliente), lendo
--    o "role" enviado em options.data no signUp() de cada app.
-- ------------------------------------------------------------------

create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.raw_user_meta_data ->> 'role' = 'fornecedor' then
    insert into fornecedores (id, company_name, email)
    values (new.id, coalesce(new.raw_user_meta_data ->> 'company_name', ''), new.email);
  elsif new.raw_user_meta_data ->> 'role' = 'cliente' then
    insert into clientes (id, couple_name, email)
    values (new.id, coalesce(new.raw_user_meta_data ->> 'couple_name', ''), new.email);
  end if;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ------------------------------------------------------------------
-- 3. Conversas e mensagens
-- ------------------------------------------------------------------

create table if not exists conversations (
  id uuid primary key default gen_random_uuid(),
  fornecedor_id uuid not null references fornecedores(id) on delete cascade,
  cliente_id uuid not null references clientes(id) on delete cascade,
  created_at timestamptz not null default now(),
  last_message_at timestamptz not null default now(),
  unique (fornecedor_id, cliente_id)
);

create table if not exists messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references conversations(id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete cascade,
  sender_role text not null check (sender_role in ('fornecedor', 'cliente')),
  text text,
  attachment_url text,
  attachment_type text,
  created_at timestamptz not null default now(),
  read_at timestamptz
);

create index if not exists messages_conversation_id_idx on messages (conversation_id, created_at);

-- ------------------------------------------------------------------
-- 4. Row Level Security
-- ------------------------------------------------------------------

alter table fornecedores enable row level security;
alter table clientes enable row level security;
alter table conversations enable row level security;
alter table messages enable row level security;

-- Perfis: leitura liberada pra qualquer autenticado (é um diretório —
-- precisa aparecer nome/foto/categoria pro outro lado da conversa);
-- escrita só do próprio dono.
create policy "fornecedores_select_authenticated" on fornecedores
  for select to authenticated using (true);
create policy "fornecedores_update_own" on fornecedores
  for update to authenticated using (auth.uid() = id);

create policy "clientes_select_authenticated" on clientes
  for select to authenticated using (true);
create policy "clientes_update_own" on clientes
  for update to authenticated using (auth.uid() = id);

-- Conversas: só quem participa (fornecedor ou cliente da linha) enxerga/edita.
create policy "conversations_select_participant" on conversations
  for select to authenticated
  using (auth.uid() = fornecedor_id or auth.uid() = cliente_id);
create policy "conversations_insert_participant" on conversations
  for insert to authenticated
  with check (auth.uid() = fornecedor_id or auth.uid() = cliente_id);
create policy "conversations_update_participant" on conversations
  for update to authenticated
  using (auth.uid() = fornecedor_id or auth.uid() = cliente_id);

-- Mensagens: só quem participa da conversa pai enxerga; só o próprio
-- remetente pode inserir mensagem em seu nome.
create policy "messages_select_participant" on messages
  for select to authenticated
  using (
    exists (
      select 1 from conversations c
      where c.id = messages.conversation_id
        and (auth.uid() = c.fornecedor_id or auth.uid() = c.cliente_id)
    )
  );
create policy "messages_insert_participant" on messages
  for insert to authenticated
  with check (
    sender_id = auth.uid()
    and exists (
      select 1 from conversations c
      where c.id = messages.conversation_id
        and (auth.uid() = c.fornecedor_id or auth.uid() = c.cliente_id)
    )
  );

-- ------------------------------------------------------------------
-- 5. Realtime (pra mensagens novas chegarem ao vivo nos dois apps)
-- ------------------------------------------------------------------

alter publication supabase_realtime add table messages;
