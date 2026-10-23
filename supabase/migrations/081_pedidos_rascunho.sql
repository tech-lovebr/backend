-- 081 — Rascunhos das solicitações de orçamento.
-- A pessoa começa a preencher (título + categoria e passa da etapa 1) e sai
-- sem publicar: o que ela preencheu fica salvo aqui e aparece em
-- Fornecedores › Contratos › Solicitações como "Rascunho".
create table if not exists pedidos_rascunho (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references clientes(id) on delete cascade,
  dados jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists pedidos_rascunho_cliente_idx on pedidos_rascunho (cliente_id, updated_at desc);

alter table pedidos_rascunho enable row level security;

drop policy if exists "pedidos_rascunho_dono" on pedidos_rascunho;
create policy "pedidos_rascunho_dono" on pedidos_rascunho
  for all to authenticated
  using (cliente_id = auth.uid())
  with check (cliente_id = auth.uid());
