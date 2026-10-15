-- ==============================================================================
-- LOVE — Cliques nos produtos/serviços dos fornecedores
--
-- Rode no SQL Editor DEPOIS do 053. É idempotente.
--
-- Cada vez que um anfitrião logado abre um serviço na vitrine (Fornecedores ›
-- Explorar), a plataforma grava uma linha aqui. O Admin soma por produto e
-- filtra por período em HUB/B2B › Serviços/Produtos.
--
-- Quem grava é o próprio anfitrião (user_id = auth.uid()); só o Admin lê.
-- ==============================================================================

create table if not exists produto_cliques (
  id bigserial primary key,
  produto_id uuid not null references products(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now()
);

create index if not exists produto_cliques_produto_idx on produto_cliques (produto_id, created_at desc);
create index if not exists produto_cliques_data_idx on produto_cliques (created_at desc);

alter table produto_cliques enable row level security;

drop policy if exists "produto_cliques_registrar" on produto_cliques;
create policy "produto_cliques_registrar" on produto_cliques
  for insert to authenticated with check (user_id = auth.uid());

drop policy if exists "produto_cliques_admin" on produto_cliques;
create policy "produto_cliques_admin" on produto_cliques
  for select to authenticated using (is_admin());
