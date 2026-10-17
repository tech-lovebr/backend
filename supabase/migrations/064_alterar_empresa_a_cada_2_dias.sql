-- 064: Nome da empresa e CNPJ/CPF — "Alterar" direto no Hub, sem pedir ao Admin.
-- Regra: depois de uma alteração, o mesmo campo só pode mudar de novo 2 dias
-- depois. O trigger garante isso no banco (o Admin não tem limite).
-- O primeiro preenchimento (campo vazio) não conta como alteração. Idempotente.

alter table public.fornecedores add column if not exists company_alterado_em timestamptz;
alter table public.fornecedores add column if not exists documento_alterado_em timestamptz;

comment on column public.fornecedores.company_alterado_em is 'Última alteração do nome da empresa pelo fornecedor (regra: 1 a cada 2 dias).';
comment on column public.fornecedores.documento_alterado_em is 'Última alteração do CNPJ/CPF pelo fornecedor (regra: 1 a cada 2 dias).';

create or replace function public.fornecedores_regra_alteracao()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  -- Admin e processos do servidor (sem usuário logado) não têm limite.
  if auth.uid() is null or is_admin() then
    return new;
  end if;

  -- As datas só mudam por aqui (o fornecedor não consegue zerá-las).
  new.company_alterado_em := old.company_alterado_em;
  new.documento_alterado_em := old.documento_alterado_em;

  if btrim(coalesce(old.company_name, '')) <> ''
     and btrim(coalesce(new.company_name, '')) is distinct from btrim(coalesce(old.company_name, '')) then
    if old.company_alterado_em is not null and old.company_alterado_em > now() - interval '2 days' then
      raise exception 'ALTERACAO_BLOQUEADA: nome da empresa só pode ser alterado a cada 2 dias';
    end if;
    new.company_alterado_em := now();
  end if;

  -- Compara só os dígitos (com ou sem máscara é o mesmo documento).
  if regexp_replace(coalesce(old.cnpj, ''), '\D', '', 'g') <> ''
     and (regexp_replace(coalesce(new.cnpj, ''), '\D', '', 'g') <> regexp_replace(coalesce(old.cnpj, ''), '\D', '', 'g')
          or coalesce(new.document_type, 'cnpj') <> coalesce(old.document_type, 'cnpj')) then
    if old.documento_alterado_em is not null and old.documento_alterado_em > now() - interval '2 days' then
      raise exception 'ALTERACAO_BLOQUEADA: CNPJ/CPF só pode ser alterado a cada 2 dias';
    end if;
    new.documento_alterado_em := now();
  end if;

  return new;
end;
$$;

drop trigger if exists fornecedores_regra_alteracao on public.fornecedores;
create trigger fornecedores_regra_alteracao
  before update on public.fornecedores
  for each row execute function public.fornecedores_regra_alteracao();
