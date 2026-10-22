-- 077: Razão social e CNPJ/CPF fixos depois de preenchidos.
-- Substitui a regra da 064 ("alterar a cada 2 dias"):
--   * razão social e CNPJ/CPF: o primeiro preenchimento vale; depois o
--     fornecedor não consegue mais trocar (só o Admin);
--   * nome fantasia (company_name): muda à vontade, sem prazo.
-- Rode no SQL Editor. Idempotente.

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

  new.company_alterado_em := old.company_alterado_em;
  new.documento_alterado_em := old.documento_alterado_em;

  if btrim(coalesce(old.razao_social, '')) <> ''
     and btrim(coalesce(new.razao_social, '')) is distinct from btrim(coalesce(old.razao_social, '')) then
    raise exception 'ALTERACAO_BLOQUEADA: a razão social não pode ser alterada';
  end if;

  -- Compara só os dígitos (com ou sem máscara é o mesmo documento).
  if regexp_replace(coalesce(old.cnpj, ''), '\D', '', 'g') <> ''
     and (regexp_replace(coalesce(new.cnpj, ''), '\D', '', 'g') <> regexp_replace(coalesce(old.cnpj, ''), '\D', '', 'g')
          or coalesce(new.document_type, 'cnpj') <> coalesce(old.document_type, 'cnpj')) then
    raise exception 'ALTERACAO_BLOQUEADA: o CNPJ/CPF não pode ser alterado';
  end if;

  if btrim(coalesce(new.company_name, '')) is distinct from btrim(coalesce(old.company_name, '')) then
    new.company_alterado_em := now();
  end if;

  return new;
end;
$$;

drop trigger if exists fornecedores_regra_alteracao on public.fornecedores;
create trigger fornecedores_regra_alteracao
  before update on public.fornecedores
  for each row execute function public.fornecedores_regra_alteracao();
