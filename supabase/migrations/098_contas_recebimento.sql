-- 098 — Conta de recebimento do anfitrião (Asaas, BaaS).
--
-- Presentes › "Ativar recebimento": a Love cria por trás uma subconta no
-- Asaas para o anfitrião (api/asaas-conta.js). Os presentes pagos pelos
-- convidados caem nela e o anfitrião saca pela Love, sem entrar no Asaas.
--
--   contas_recebimento          situação da conta (o anfitrião só lê).
--   contas_recebimento_segredos chave da subconta, cifrada (ninguém lê pelo
--                               navegador: sem policies, só o servidor).
--   asaas_eventos               webhooks recebidos (o id evita repetir).
-- Idempotente.

create table if not exists contas_recebimento (
  cliente_id uuid primary key references clientes(id) on delete cascade,
  asaas_id text unique,
  wallet_id text,
  status text not null default 'criando'
    check (status in ('criando', 'documentos', 'em_analise', 'aprovada', 'recusada', 'erro')),
  status_detalhe jsonb not null default '{}'::jsonb,
  onboarding_url text,
  onboarding_expira timestamptz,
  cpf_final text,
  erro text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table contas_recebimento enable row level security;

drop policy if exists "contas_recebimento_dono_le" on contas_recebimento;
create policy "contas_recebimento_dono_le" on contas_recebimento
  for select to authenticated using (cliente_id = auth.uid() or is_admin());

create table if not exists contas_recebimento_segredos (
  cliente_id uuid primary key references clientes(id) on delete cascade,
  api_key_cifrada text not null,
  created_at timestamptz not null default now()
);
alter table contas_recebimento_segredos enable row level security;
-- Sem policies de propósito: só a service role (servidor) lê e grava.

create table if not exists asaas_eventos (
  id text primary key,
  tipo text not null,
  conta text,
  payload jsonb not null default '{}'::jsonb,
  processado boolean not null default false,
  recebido_em timestamptz not null default now()
);
create index if not exists asaas_eventos_tipo_idx on asaas_eventos (tipo, recebido_em desc);
alter table asaas_eventos enable row level security;

drop policy if exists "asaas_eventos_admin" on asaas_eventos;
create policy "asaas_eventos_admin" on asaas_eventos
  for select to authenticated using (is_admin());
