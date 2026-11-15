-- ==============================================================================
-- LOVE — Listas salvas de convidados (Lista de convidados › Listas salvas)
--
-- Rode no SQL Editor. É idempotente.
--
-- A lista salva é da CONTA, não do evento: o anfitrião salva os convidados de
-- um evento com um nome e usa essa lista de novo em qualquer outro evento
-- (aniversário, casamento, chá de bebê…), sem cadastrar todo mundo de novo.
-- "convidados" guarda só o que vale para outro evento: nome, contato,
-- acompanhantes e relação (sem mesa, status de RSVP nem presente).
-- Cada conta só vê e mexe nas próprias listas.
-- ==============================================================================

create table if not exists listas_convidados (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references clientes(id) on delete cascade,
  nome text not null,
  convidados jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists listas_convidados_cliente_idx on listas_convidados (cliente_id, created_at desc);

alter table listas_convidados enable row level security;

drop policy if exists "listas_convidados_select" on listas_convidados;
create policy "listas_convidados_select" on listas_convidados
  for select to authenticated using (cliente_id = auth.uid());

drop policy if exists "listas_convidados_insert" on listas_convidados;
create policy "listas_convidados_insert" on listas_convidados
  for insert to authenticated with check (cliente_id = auth.uid());

drop policy if exists "listas_convidados_update" on listas_convidados;
create policy "listas_convidados_update" on listas_convidados
  for update to authenticated using (cliente_id = auth.uid()) with check (cliente_id = auth.uid());

drop policy if exists "listas_convidados_delete" on listas_convidados;
create policy "listas_convidados_delete" on listas_convidados
  for delete to authenticated using (cliente_id = auth.uid());

notify pgrst, 'reload schema';
