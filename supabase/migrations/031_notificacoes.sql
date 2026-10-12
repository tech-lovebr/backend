-- ==============================================================================
-- LOVE — Notificações enviadas pelo Admin
--
-- Rode no SQL Editor DEPOIS do 030_fornecedor_pelo_admin.sql. É idempotente.
--
-- Uma notificação é escrita uma vez e endereçada a um público: todos, só o
-- Hub, só os anfitriões, ou uma pessoa. Guardar o público em vez de gerar
-- uma linha por destinatário mantém o envio barato e permite corrigir ou
-- apagar a mensagem depois sem caçar cópias.
--
-- Quem leu fica numa tabela à parte, escrita pelo próprio leitor.
-- ==============================================================================


-- ------------------------------------------------------------------
-- 1. Quem é quem
--    SECURITY DEFINER porque a policy de notificacoes precisa olhar
--    fornecedores/clientes, e a policy dessas tabelas não deixaria.
-- ------------------------------------------------------------------

create or replace function eh_fornecedor()
returns boolean language sql stable security definer set search_path = public
as $$ select exists (select 1 from fornecedores f where f.id = auth.uid()) $$;

create or replace function eh_anfitriao()
returns boolean language sql stable security definer set search_path = public
as $$ select exists (select 1 from clientes c where c.id = auth.uid()) $$;

revoke all on function eh_fornecedor() from public, anon;
revoke all on function eh_anfitriao() from public, anon;
grant execute on function eh_fornecedor() to authenticated;
grant execute on function eh_anfitriao() to authenticated;


-- ------------------------------------------------------------------
-- 2. Notificações
-- ------------------------------------------------------------------

create table if not exists notificacoes (
  id uuid primary key default gen_random_uuid(),

  titulo text not null,
  mensagem text not null,

  -- Só texto e link: notificação não carrega imagem.
  link_url text,
  link_label text,

  destino text not null default 'todos'
    check (destino in ('todos', 'b2b', 'anfitriao', 'individual')),

  -- Preenchido só quando destino = 'individual'.
  destinatario_id uuid references auth.users(id) on delete cascade,

  autor_id uuid references auth.users(id) on delete set null,
  autor_nome text,

  created_at timestamptz not null default now(),

  constraint notificacoes_individual_tem_destinatario
    check (destino <> 'individual' or destinatario_id is not null)
);

create index if not exists notificacoes_destino_idx
  on notificacoes (destino, created_at desc);

alter table notificacoes enable row level security;

-- Cada um lê o que foi endereçado a ele; o admin lê tudo.
drop policy if exists "notificacoes_destinatario" on notificacoes;
create policy "notificacoes_destinatario" on notificacoes
  for select to authenticated using (
    is_admin()
    or destino = 'todos'
    or (destino = 'b2b' and eh_fornecedor())
    or (destino = 'anfitriao' and eh_anfitriao())
    or (destino = 'individual' and destinatario_id = auth.uid())
  );

drop policy if exists "notificacoes_admin" on notificacoes;
create policy "notificacoes_admin" on notificacoes
  for all to authenticated using (is_admin()) with check (is_admin());


-- ------------------------------------------------------------------
-- 3. Leituras
--    Uma linha por pessoa que abriu. Quem escreve é o próprio leitor.
-- ------------------------------------------------------------------

create table if not exists notificacao_leituras (
  notificacao_id uuid not null references notificacoes(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  lida_em timestamptz not null default now(),
  primary key (notificacao_id, user_id)
);

alter table notificacao_leituras enable row level security;

drop policy if exists "leituras_proprias" on notificacao_leituras;
create policy "leituras_proprias" on notificacao_leituras
  for select to authenticated using (user_id = auth.uid() or is_admin());

drop policy if exists "leituras_marcar" on notificacao_leituras;
create policy "leituras_marcar" on notificacao_leituras
  for insert to authenticated with check (user_id = auth.uid());

drop policy if exists "leituras_admin" on notificacao_leituras;
create policy "leituras_admin" on notificacao_leituras
  for all to authenticated using (is_admin()) with check (is_admin());
