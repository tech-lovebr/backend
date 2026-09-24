-- ==============================================================================
-- Evolui o CRM: contato vinculado a um cliente real (por e-mail), interesse
-- em um produto/serviço cadastrado, histórico de comentários, e status do
-- lead passa a ser automático (não editável na mão):
--   novo -> conversa (existe uma conversa aberta com o cliente vinculado)
--        -> proposta (um orçamento foi criado pra esse contato)
--        -> fechado  (o cliente pagou o orçamento pelo link de checkout)
-- Rode este arquivo inteiro no SQL Editor do Supabase, depois do 005.
-- ==============================================================================

alter table leads add column if not exists email text;
alter table leads add column if not exists cliente_id uuid references clientes(id) on delete set null;
alter table leads add column if not exists product_id uuid references products(id) on delete set null;
alter table leads add column if not exists comentarios jsonb not null default '[]';

-- ------------------------------------------------------------------
-- Orçamentos (propostas comerciais), agora persistidos de verdade.
-- ------------------------------------------------------------------

create table if not exists orcamentos (
  id uuid primary key default gen_random_uuid(),
  fornecedor_id uuid not null references fornecedores(id) on delete cascade,
  lead_id uuid references leads(id) on delete set null,
  cliente_nome text not null,
  valor_total numeric not null default 0,
  itens jsonb not null default '[]',
  status text not null default 'enviado' check (status in ('enviado', 'pago')),
  created_at timestamptz not null default now()
);

alter table payment_links add column if not exists orcamento_id uuid references orcamentos(id) on delete set null;

alter table orcamentos enable row level security;

drop policy if exists "orcamentos_owner_select" on orcamentos;
create policy "orcamentos_owner_select" on orcamentos
  for select to authenticated using (auth.uid() = fornecedor_id);

drop policy if exists "orcamentos_owner_insert" on orcamentos;
create policy "orcamentos_owner_insert" on orcamentos
  for insert to authenticated with check (auth.uid() = fornecedor_id);

drop policy if exists "orcamentos_owner_update" on orcamentos;
create policy "orcamentos_owner_update" on orcamentos
  for update to authenticated using (auth.uid() = fornecedor_id);

drop policy if exists "orcamentos_owner_delete" on orcamentos;
create policy "orcamentos_owner_delete" on orcamentos
  for delete to authenticated using (auth.uid() = fornecedor_id);
