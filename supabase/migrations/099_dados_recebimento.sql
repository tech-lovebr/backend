-- 099 — Dados para receber os presentes (antes de abrir a conta digital).
--
-- O anfitrião preenche ao adicionar o primeiro presente. A conta digital
-- (subconta Asaas, que tem custo) só é aberta na primeira compra de um
-- convidado — ver api/_recebimento.js. Os dados ficam cifrados pelo
-- servidor (ASAAS_CHAVE_CIFRA); sem policies: o navegador não lê nem grava,
-- só a service role (via /api/asaas-conta).
-- Idempotente.

create table if not exists dados_recebimento (
  cliente_id uuid primary key references clientes(id) on delete cascade,
  dados_cifrados text not null,
  cpf_final text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table dados_recebimento enable row level security;
-- Sem policies de propósito.

-- O anfitrião só precisa saber se já preencheu (sem ver os dados cifrados).
create or replace function tenho_dados_de_recebimento()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from dados_recebimento where cliente_id = auth.uid());
$$;
revoke all on function tenho_dados_de_recebimento() from public, anon;
grant execute on function tenho_dados_de_recebimento() to authenticated;
