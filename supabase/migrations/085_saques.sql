-- 085 — Saques da Carteira digital.
-- O anfitrião pede o saque (status "solicitado") para uma das contas
-- cadastradas em clientes.dados_saque.contas; a Love processa e muda para
-- "processando", "realizado" ou "recusado". A conta vai copiada no pedido.
create table if not exists saques (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references clientes(id) on delete cascade,
  evento_id uuid references eventos(id) on delete set null,
  valor numeric not null check (valor > 0),
  conta jsonb not null default '{}'::jsonb,
  status text not null default 'solicitado'
    check (status in ('solicitado', 'processando', 'realizado', 'recusado')),
  created_at timestamptz not null default now(),
  realizado_em timestamptz
);

create index if not exists saques_cliente_idx on saques (cliente_id, created_at desc);

alter table saques enable row level security;

-- Anfitrião: vê os próprios saques e só pode pedir (status "solicitado").
drop policy if exists "saques_dono_le" on saques;
create policy "saques_dono_le" on saques
  for select to authenticated
  using (cliente_id = auth.uid());

drop policy if exists "saques_dono_pede" on saques;
create policy "saques_dono_pede" on saques
  for insert to authenticated
  with check (cliente_id = auth.uid() and status = 'solicitado');

-- Admin vê e atualiza todos (processar, concluir ou recusar).
drop policy if exists "saques_admin" on saques;
create policy "saques_admin" on saques
  for all to authenticated
  using (is_admin())
  with check (is_admin());
