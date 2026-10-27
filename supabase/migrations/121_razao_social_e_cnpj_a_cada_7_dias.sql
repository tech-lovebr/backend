-- 121: Razão social e CNPJ/CPF voltam a poder ser alterados pelo próprio
-- fornecedor — agora de 7 em 7 dias, sem precisar pedir pro Admin.
-- Substitui a regra da 077 (travado pra sempre, só Admin libera), mas
-- reaproveita as mesmas colunas de data da 064 (company_alterado_em,
-- documento_alterado_em) — só troca o campo monitorado por company_name
-- pra razao_social (que é o campo fixo de verdade hoje; company_name é o
-- nome fantasia, que já muda à vontade) e o intervalo de 2 pra 7 dias.
-- Rode no SQL Editor. Idempotente.

comment on column public.fornecedores.company_alterado_em is 'Última alteração da razão social pelo fornecedor (regra: 1 a cada 7 dias).';
comment on column public.fornecedores.documento_alterado_em is 'Última alteração do CNPJ/CPF pelo fornecedor (regra: 1 a cada 7 dias).';

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

  if btrim(coalesce(old.razao_social, '')) <> ''
     and btrim(coalesce(new.razao_social, '')) is distinct from btrim(coalesce(old.razao_social, '')) then
    if old.company_alterado_em is not null and old.company_alterado_em > now() - interval '7 days' then
      raise exception 'ALTERACAO_BLOQUEADA: razão social só pode ser alterada a cada 7 dias';
    end if;
    new.company_alterado_em := now();
  end if;

  -- Compara só os dígitos (com ou sem máscara é o mesmo documento).
  if regexp_replace(coalesce(old.cnpj, ''), '\D', '', 'g') <> ''
     and (regexp_replace(coalesce(new.cnpj, ''), '\D', '', 'g') <> regexp_replace(coalesce(old.cnpj, ''), '\D', '', 'g')
          or coalesce(new.document_type, 'cnpj') <> coalesce(old.document_type, 'cnpj')) then
    if old.documento_alterado_em is not null and old.documento_alterado_em > now() - interval '7 days' then
      raise exception 'ALTERACAO_BLOQUEADA: CNPJ/CPF só pode ser alterado a cada 7 dias';
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
