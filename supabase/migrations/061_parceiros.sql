-- ==============================================================================
-- LOVE — Parceiros dos serviços e benefícios
--
-- Rode no SQL Editor DEPOIS do 060_atendimento_inbox.sql. É idempotente.
--
-- Cada serviço/benefício de Admin › Vendas › Serviços passa a ser vinculado a
-- um parceiro cadastrado (empresa, CNPJ, responsável legal, contato, e-mail e
-- o que ela oferece). Suspender a parceria tira do ar os serviços dela.
-- O texto antigo servicos_beneficios.parceiro vira um parceiro de verdade.
-- ==============================================================================

create table if not exists parceiros (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  cnpj text,
  responsavel_legal text,
  contato text,
  email text,
  produtos_oferecidos text,
  status text not null default 'ativo' check (status in ('ativo', 'suspenso')),
  suspenso_em timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists parceiros_nome_idx on parceiros (lower(nome));

alter table parceiros enable row level security;

drop policy if exists "parceiros_admin" on parceiros;
create policy "parceiros_admin" on parceiros
  for all to authenticated using (is_admin()) with check (is_admin());

drop trigger if exists parceiros_touch on parceiros;
create trigger parceiros_touch before update on parceiros
  for each row execute function touch_faq();

alter table servicos_beneficios
  add column if not exists parceiro_id uuid references parceiros(id) on delete set null;

create index if not exists servicos_beneficios_parceiro_idx on servicos_beneficios (parceiro_id);

-- Os parceiros que já estavam escritos nos serviços viram cadastros.
insert into parceiros (nome)
select distinct btrim(s.parceiro)
  from servicos_beneficios s
 where nullif(btrim(s.parceiro), '') is not null
   and not exists (select 1 from parceiros p where lower(p.nome) = lower(btrim(s.parceiro)));

update servicos_beneficios s
   set parceiro_id = p.id
  from parceiros p
 where s.parceiro_id is null
   and lower(p.nome) = lower(btrim(s.parceiro));
