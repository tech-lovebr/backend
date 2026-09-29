-- ==============================================================================
-- LOVE — Benefício passa a pertencer a um serviço
--
-- Rode no SQL Editor do Supabase DEPOIS do 010_conteudo_plataforma.sql.
-- É idempotente.
--
-- No dashboard de conteúdo, a aba "Serviços" lista os serviços e, dentro de
-- cada um, os benefícios associados àquele serviço. Para isso o bloco de
-- conteúdo ganha um pai opcional dentro da própria tabela.
-- ==============================================================================

alter table conteudo_plataforma
  add column if not exists parent_id uuid
  references conteudo_plataforma(id) on delete cascade;

create index if not exists conteudo_plataforma_parent_idx
  on conteudo_plataforma (parent_id, posicao);

-- Apagar um serviço leva junto os benefícios dele (on delete cascade acima),
-- que é o comportamento esperado: benefício sem serviço não aparece em lugar
-- nenhum da plataforma.

comment on column conteudo_plataforma.parent_id is
  'Serviço ao qual este bloco pertence. Usado pelos benefícios (secao = ''beneficio''), que sempre pendem de um serviço. Nulo nas demais seções.';
