-- ==============================================================================
-- LOVE B2B — Leads: número (ID) sequencial por fornecedor
--
-- A tabela de Leads do Hub mostra uma coluna "ID" à esquerda do nome: 1, 2,
-- 3… por fornecedor, na ordem em que os leads entraram, sem repetir. Os
-- leads que já existem são numerados pela data de criação; os novos
-- (adicionados à mão ou importados) recebem o próximo número sozinhos.
--
-- Rode este arquivo inteiro no SQL Editor do Supabase. É idempotente.
-- ==============================================================================

alter table leads add column if not exists numero integer;

-- Numera os que ainda não têm número, continuando depois do maior já usado.
with base as (
  select fornecedor_id, coalesce(max(numero), 0) as ultimo
  from leads group by fornecedor_id
), faltando as (
  select l.id, b.ultimo + row_number() over (partition by l.fornecedor_id order by l.created_at, l.id) as novo
  from leads l join base b on b.fornecedor_id = l.fornecedor_id
  where l.numero is null
)
update leads set numero = f.novo from faltando f where leads.id = f.id;

create unique index if not exists leads_fornecedor_numero on leads (fornecedor_id, numero);

create or replace function leads_definir_numero()
returns trigger
language plpgsql
as $$
begin
  if new.numero is null then
    -- Um lead de cada vez por fornecedor (importação em lote incluída).
    perform pg_advisory_xact_lock(hashtext('leads_numero_' || new.fornecedor_id::text));
    select coalesce(max(numero), 0) + 1 into new.numero
    from leads where fornecedor_id = new.fornecedor_id;
  end if;
  return new;
end;
$$;

drop trigger if exists leads_numero_trg on leads;
create trigger leads_numero_trg
  before insert on leads
  for each row execute function leads_definir_numero();
