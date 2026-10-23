-- 096 — Contratos do anfitrião (Fornecedores › Contratos).
--
-- Proposta aceita = contrato. O contrato é a própria linha de
-- propostas_pedido (status 'aceita'); estas tabelas guardam o que vem depois:
--   - contrato_parcelas: quanto pagar e quando (pago / falta pagar).
--   - contrato_entregas: datas em que o fornecedor entrega cada coisa.
--   - contrato_atualizacoes: novidades do fornecedor (texto + fotos) de como
--     está ficando a preparação.
-- Ao aceitar uma proposta nasce uma parcela com o valor total (vencimento na
-- data do evento) e uma entrega "Serviço no dia do evento". O fornecedor pode
-- dividir em mais parcelas e entregas pelo Hub. Idempotente.

-- ------------------------------------------------------------------
-- Quem participa do contrato (anfitrião dono do pedido ou empresa)
-- ------------------------------------------------------------------
create or replace function public.eh_anfitriao_do_contrato(p_proposta uuid)
returns boolean language sql stable security definer set search_path = public as $fn$
  select exists (
    select 1 from propostas_pedido pp
    join pedidos_orcamento po on po.id = pp.pedido_id
    where pp.id = p_proposta and po.cliente_id = auth.uid()
  );
$fn$;

create or replace function public.eh_empresa_do_contrato(p_proposta uuid)
returns boolean language sql stable security definer set search_path = public as $fn$
  select exists (
    select 1 from propostas_pedido pp
    join fornecedores f on f.id = pp.fornecedor_id
    where pp.id = p_proposta and (f.dono_id = auth.uid() or f.id = auth.uid())
  );
$fn$;

-- ------------------------------------------------------------------
-- Parcelas (pagamentos)
-- ------------------------------------------------------------------
create table if not exists contrato_parcelas (
  id uuid primary key default gen_random_uuid(),
  proposta_id uuid not null references propostas_pedido(id) on delete cascade,
  titulo text not null default 'Pagamento',
  valor numeric not null default 0 check (valor >= 0),
  vencimento date,
  status text not null default 'pendente' check (status in ('pendente', 'paga')),
  pago_em timestamptz,
  ordem int not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists contrato_parcelas_proposta_idx on contrato_parcelas (proposta_id, ordem);
alter table contrato_parcelas enable row level security;

drop policy if exists "contrato_parcelas_le" on contrato_parcelas;
create policy "contrato_parcelas_le" on contrato_parcelas for select to authenticated
  using (public.eh_anfitriao_do_contrato(proposta_id) or public.eh_empresa_do_contrato(proposta_id) or is_admin());

-- Anfitrião marca a parcela como paga (ou desfaz).
drop policy if exists "contrato_parcelas_anfitriao_paga" on contrato_parcelas;
create policy "contrato_parcelas_anfitriao_paga" on contrato_parcelas for update to authenticated
  using (public.eh_anfitriao_do_contrato(proposta_id))
  with check (public.eh_anfitriao_do_contrato(proposta_id));

-- Empresa monta as parcelas (cria, edita e apaga).
drop policy if exists "contrato_parcelas_empresa" on contrato_parcelas;
create policy "contrato_parcelas_empresa" on contrato_parcelas for all to authenticated
  using (public.eh_empresa_do_contrato(proposta_id))
  with check (public.eh_empresa_do_contrato(proposta_id));

-- O anfitrião só mexe no status (e na data em que pagou).
create or replace function contrato_parcelas_proteger()
returns trigger language plpgsql as $$
begin
  if public.eh_anfitriao_do_contrato(old.proposta_id) and not public.eh_empresa_do_contrato(old.proposta_id) then
    if new.proposta_id is distinct from old.proposta_id or new.titulo is distinct from old.titulo
       or new.valor is distinct from old.valor or new.vencimento is distinct from old.vencimento
       or new.ordem is distinct from old.ordem then
      raise exception 'Só dá para marcar a parcela como paga.';
    end if;
  end if;
  if new.status = 'paga' and old.status <> 'paga' then new.pago_em := coalesce(new.pago_em, now()); end if;
  if new.status = 'pendente' then new.pago_em := null; end if;
  return new;
end;
$$;
drop trigger if exists contrato_parcelas_proteger on contrato_parcelas;
create trigger contrato_parcelas_proteger before update on contrato_parcelas
  for each row execute function contrato_parcelas_proteger();

-- ------------------------------------------------------------------
-- Entregas (datas)
-- ------------------------------------------------------------------
create table if not exists contrato_entregas (
  id uuid primary key default gen_random_uuid(),
  proposta_id uuid not null references propostas_pedido(id) on delete cascade,
  titulo text not null,
  data date,
  concluida boolean not null default false,
  ordem int not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists contrato_entregas_proposta_idx on contrato_entregas (proposta_id, ordem);
alter table contrato_entregas enable row level security;

drop policy if exists "contrato_entregas_le" on contrato_entregas;
create policy "contrato_entregas_le" on contrato_entregas for select to authenticated
  using (public.eh_anfitriao_do_contrato(proposta_id) or public.eh_empresa_do_contrato(proposta_id) or is_admin());

drop policy if exists "contrato_entregas_empresa" on contrato_entregas;
create policy "contrato_entregas_empresa" on contrato_entregas for all to authenticated
  using (public.eh_empresa_do_contrato(proposta_id))
  with check (public.eh_empresa_do_contrato(proposta_id));

-- ------------------------------------------------------------------
-- Atualizações do fornecedor (texto + fotos)
-- ------------------------------------------------------------------
create table if not exists contrato_atualizacoes (
  id uuid primary key default gen_random_uuid(),
  proposta_id uuid not null references propostas_pedido(id) on delete cascade,
  texto text check (texto is null or char_length(texto) <= 2000),
  fotos jsonb not null default '[]',
  created_at timestamptz not null default now()
);
create index if not exists contrato_atualizacoes_proposta_idx on contrato_atualizacoes (proposta_id, created_at desc);
alter table contrato_atualizacoes enable row level security;

drop policy if exists "contrato_atualizacoes_le" on contrato_atualizacoes;
create policy "contrato_atualizacoes_le" on contrato_atualizacoes for select to authenticated
  using (public.eh_anfitriao_do_contrato(proposta_id) or public.eh_empresa_do_contrato(proposta_id) or is_admin());

drop policy if exists "contrato_atualizacoes_empresa" on contrato_atualizacoes;
create policy "contrato_atualizacoes_empresa" on contrato_atualizacoes for all to authenticated
  using (public.eh_empresa_do_contrato(proposta_id))
  with check (public.eh_empresa_do_contrato(proposta_id));

-- ------------------------------------------------------------------
-- Proposta aceita → parcela com o valor total e a entrega do dia do evento
-- ------------------------------------------------------------------
create or replace function contrato_ao_aceitar()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_data date;
begin
  if new.status = 'aceita' and (tg_op = 'INSERT' or old.status is distinct from 'aceita') then
    select data_evento into v_data from pedidos_orcamento where id = new.pedido_id;
    if not exists (select 1 from contrato_parcelas where proposta_id = new.id) then
      insert into contrato_parcelas (proposta_id, titulo, valor, vencimento, ordem)
      values (new.id, 'Pagamento total', new.valor, v_data, 0);
    end if;
    if not exists (select 1 from contrato_entregas where proposta_id = new.id) then
      insert into contrato_entregas (proposta_id, titulo, data, ordem)
      values (new.id, 'Serviço no dia do evento', v_data, 0);
    end if;
  end if;
  return new;
end;
$$;
drop trigger if exists contrato_ao_aceitar on propostas_pedido;
create trigger contrato_ao_aceitar after insert or update of status on propostas_pedido
  for each row execute function contrato_ao_aceitar();

-- Propostas já aceitas antes desta migration.
insert into contrato_parcelas (proposta_id, titulo, valor, vencimento, ordem)
select pp.id, 'Pagamento total', pp.valor, po.data_evento, 0
from propostas_pedido pp join pedidos_orcamento po on po.id = pp.pedido_id
where pp.status = 'aceita' and not exists (select 1 from contrato_parcelas c where c.proposta_id = pp.id);

insert into contrato_entregas (proposta_id, titulo, data, ordem)
select pp.id, 'Serviço no dia do evento', po.data_evento, 0
from propostas_pedido pp join pedidos_orcamento po on po.id = pp.pedido_id
where pp.status = 'aceita' and not exists (select 1 from contrato_entregas c where c.proposta_id = pp.id);
