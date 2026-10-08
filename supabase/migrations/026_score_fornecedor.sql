-- ==============================================================================
-- LOVE — Nota interna do fornecedor
--
-- Rode no SQL Editor DEPOIS do 025_product_wizard_pricing.sql. É idempotente.
--
-- Nota de 1 a 10 para ordenar e comparar fornecedores no Admin. Não é dada à
-- mão: será calculada por regras de negócio (produto com imagem vale X pontos,
-- e assim por diante), que ainda serão definidas. Até lá a coluna fica nula e
-- o Admin mostra "sem nota" — melhor que um zero que ninguém atribuiu.
--
-- É interna: não aparece para o fornecedor nem no site.
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
  'Nota interna de 1 a 10, calculada por regras de negócio (ainda a definir). Nula = ainda não avaliado. Não é exposta ao fornecedor nem editada à mão no Admin.';
