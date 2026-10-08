-- ==============================================================================
-- LOVE — Nota interna do fornecedor
--
-- Rode no SQL Editor DEPOIS do 025_product_wizard_pricing.sql. É idempotente.
--
-- Avaliação de 1 a 10 dada pela equipe, para ordenar e comparar fornecedores
-- no Admin. É interna: só quem é administrador lê e escreve, e ela não
-- aparece para o fornecedor nem no site.
-- ==============================================================================

alter table fornecedores add column if not exists score int;

do $$
begin
  if not exists (
    select 1 from pg_constraint
     where conrelid = 'fornecedores'::regclass
       and conname = 'fornecedores_score_check'
  ) then
    alter table fornecedores
      add constraint fornecedores_score_check
      check (score is null or score between 1 and 10);
  end if;
end $$;

comment on column fornecedores.score is
  'Nota interna de 1 a 10 dada pela equipe no Admin. Nula = ainda não avaliado. Não é exposta ao fornecedor.';
