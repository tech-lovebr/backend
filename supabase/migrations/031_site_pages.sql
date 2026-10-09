-- ==============================================================================
-- LOVE B2B — Publica o site principal do fornecedor por URL personalizada
-- (slug), pra <slug>.love.com.br mostrar o site de verdade.
--
-- Hoje o editor de site ("Editor de Site" no B2B) só grava o builderState no
-- localStorage de quem está editando — ninguém mais consegue ver. Mesmo
-- padrão já usado em 005_checkout_pages.sql pro Checkout, só que a busca
-- pública aqui é por slug em vez de fornecedor_id.
--
-- Rode este arquivo inteiro no SQL Editor do Supabase. É idempotente.
-- ==============================================================================

create table if not exists site_pages (
  fornecedor_id uuid primary key references fornecedores(id) on delete cascade,
  slug text not null unique,
  state jsonb not null,
  updated_at timestamptz not null default now()
);

alter table site_pages enable row level security;

-- O próprio fornecedor gerencia o seu site (editor em "Editor de Site").
drop policy if exists "site_pages_owner_select" on site_pages;
create policy "site_pages_owner_select" on site_pages
  for select to authenticated using (auth.uid() = fornecedor_id);

drop policy if exists "site_pages_owner_insert" on site_pages;
create policy "site_pages_owner_insert" on site_pages
  for insert to authenticated with check (auth.uid() = fornecedor_id);

drop policy if exists "site_pages_owner_update" on site_pages;
create policy "site_pages_owner_update" on site_pages
  for update to authenticated using (auth.uid() = fornecedor_id);

-- Leitura pública: quem visita <slug>.love.com.br não está logado, mas
-- precisa ver o site publicado.
drop policy if exists "site_pages_public_select" on site_pages;
create policy "site_pages_public_select" on site_pages
  for select to anon using (true);

-- Checar se um slug está disponível: a RLS acima só deixa cada fornecedor
-- enxergar a própria linha, então um `select` comum do cliente não consegue
-- responder "esse slug já está em uso por OUTRO fornecedor?". Esta function
-- ignora a RLS só pra essa pergunta booleana (mesmo padrão de
-- verificar_slug_disponivel em 026_slug_disponivel.sql, pro slug de evento).
create or replace function verificar_site_slug_disponivel(p_slug text, p_fornecedor_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select not exists (
    select 1 from site_pages
    where slug = p_slug
    and fornecedor_id <> p_fornecedor_id
  );
$$;

revoke all on function verificar_site_slug_disponivel(text, uuid) from public, anon;
grant execute on function verificar_site_slug_disponivel(text, uuid) to authenticated;
