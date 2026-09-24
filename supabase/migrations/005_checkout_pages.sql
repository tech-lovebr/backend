-- ==============================================================================
-- Publica o template de "Meu Checkout" no banco, pra quem abre um link de
-- pagamento (cliente final, sem login) ver o checkout de verdade — hoje ele
-- só existe no localStorage do navegador do fornecedor, então ninguém mais
-- consegue ver o template publicado.
-- Rode este arquivo inteiro no SQL Editor do Supabase.
-- ==============================================================================

create table if not exists checkout_pages (
  fornecedor_id uuid primary key references fornecedores(id) on delete cascade,
  state jsonb not null,
  updated_at timestamptz not null default now()
);

alter table checkout_pages enable row level security;

-- O próprio fornecedor gerencia o seu checkout (editor em "Páginas do Site").
drop policy if exists "checkout_pages_owner_select" on checkout_pages;
create policy "checkout_pages_owner_select" on checkout_pages
  for select to authenticated using (auth.uid() = fornecedor_id);

drop policy if exists "checkout_pages_owner_upsert" on checkout_pages;
create policy "checkout_pages_owner_insert" on checkout_pages
  for insert to authenticated with check (auth.uid() = fornecedor_id);

drop policy if exists "checkout_pages_owner_update" on checkout_pages;
create policy "checkout_pages_owner_update" on checkout_pages
  for update to authenticated using (auth.uid() = fornecedor_id);

-- Leitura pública: quem abre um link de pagamento não está logado, mas
-- precisa ver o template publicado do checkout.
drop policy if exists "checkout_pages_public_select" on checkout_pages;
create policy "checkout_pages_public_select" on checkout_pages
  for select to anon using (true);
