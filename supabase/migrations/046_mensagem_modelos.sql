-- ==============================================================================
-- LOVE B2B — Modelos de mensagem do chat (comandos "/orcamento", "/bem-vindo")
--
-- Rode este arquivo inteiro no SQL Editor do Supabase. É idempotente.
--
-- No chat do Hub, o fornecedor salva uma mensagem que já mandou como modelo,
-- com um comando (nome curto). Depois, ao digitar "/" na caixa de mensagem,
-- aparecem os comandos; clicar em um manda o texto salvo. Cada fornecedor
-- só vê e mexe nos próprios modelos. Sem esta tabela, o Hub guarda os
-- modelos só no navegador (fallback) — com ela, valem em qualquer aparelho.
-- ==============================================================================

create table if not exists mensagem_modelos (
  id uuid primary key default gen_random_uuid(),
  fornecedor_id uuid not null references fornecedores(id) on delete cascade,
  comando text not null check (comando ~ '^[a-z0-9][a-z0-9-]{0,39}$'),
  texto text not null check (char_length(texto) between 1 and 4000),
  created_at timestamptz not null default now(),
  unique (fornecedor_id, comando)
);

alter table mensagem_modelos enable row level security;

drop policy if exists "mensagem_modelos_owner_select" on mensagem_modelos;
create policy "mensagem_modelos_owner_select" on mensagem_modelos
  for select to authenticated using (auth.uid() = fornecedor_id);

drop policy if exists "mensagem_modelos_owner_insert" on mensagem_modelos;
create policy "mensagem_modelos_owner_insert" on mensagem_modelos
  for insert to authenticated with check (auth.uid() = fornecedor_id);

drop policy if exists "mensagem_modelos_owner_update" on mensagem_modelos;
create policy "mensagem_modelos_owner_update" on mensagem_modelos
  for update to authenticated using (auth.uid() = fornecedor_id) with check (auth.uid() = fornecedor_id);

drop policy if exists "mensagem_modelos_owner_delete" on mensagem_modelos;
create policy "mensagem_modelos_owner_delete" on mensagem_modelos
  for delete to authenticated using (auth.uid() = fornecedor_id);
