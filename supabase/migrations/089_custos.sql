-- Custos de tecnologia lançados à mão no Admin (Settings → Custos).
-- Vercel, Supabase e Amazon SES não ficam aqui: vêm na hora pela
-- função /api/custos. Recorrente conta todo mês a partir de "data";
-- pagamento único só no mês de "data".

create table if not exists custos (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  valor numeric(12,2) not null check (valor >= 0),
  moeda text not null default 'BRL' check (moeda in ('BRL', 'USD', 'EUR')),
  categoria text not null,
  tipo text not null default 'recorrente' check (tipo in ('recorrente', 'unico')),
  data date not null default current_date,
  created_at timestamptz not null default now()
);

alter table custos enable row level security;

drop policy if exists "custos_admin" on custos;
create policy "custos_admin" on custos
  for all
  using (is_admin())
  with check (is_admin());
