-- ==============================================================================
-- LOVE B2B — Formulários do Editor de Site (Hub)
--
-- Rode este arquivo inteiro no SQL Editor do Supabase. É idempotente.
--
-- Os formulários criados em Editor de Site › Formulários (e anexados no chat
-- ou em blocos do site) ficavam só no navegador de quem criou. Com esta
-- tabela valem em qualquer aparelho. Cada fornecedor só vê e mexe nos
-- próprios.
--
-- id é texto (não uuid) de propósito: blocos do site já salvos apontam pro
-- formulário pelo id gerado no navegador ("form-<timestamp>") — ao subir
-- esses formulários pro banco, o id continua o mesmo e o vínculo não quebra.
-- ==============================================================================

create table if not exists site_formularios (
  id text primary key default gen_random_uuid()::text,
  fornecedor_id uuid not null references fornecedores(id) on delete cascade,
  titulo text not null,
  descricao text,
  campos jsonb not null default '[]',
  bg_color text,
  bg_image text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists site_formularios_fornecedor_idx
  on site_formularios (fornecedor_id, created_at);

alter table site_formularios enable row level security;

drop policy if exists "site_formularios_owner_select" on site_formularios;
create policy "site_formularios_owner_select" on site_formularios
  for select to authenticated using (auth.uid() = fornecedor_id);

drop policy if exists "site_formularios_owner_insert" on site_formularios;
create policy "site_formularios_owner_insert" on site_formularios
  for insert to authenticated with check (auth.uid() = fornecedor_id);

drop policy if exists "site_formularios_owner_update" on site_formularios;
create policy "site_formularios_owner_update" on site_formularios
  for update to authenticated using (auth.uid() = fornecedor_id) with check (auth.uid() = fornecedor_id);

drop policy if exists "site_formularios_owner_delete" on site_formularios;
create policy "site_formularios_owner_delete" on site_formularios
  for delete to authenticated using (auth.uid() = fornecedor_id);
