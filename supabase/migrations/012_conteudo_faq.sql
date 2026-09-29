-- ==============================================================================
-- LOVE — Perguntas e respostas dentro de cada guia de início
--
-- Rode no SQL Editor do Supabase DEPOIS do 011_conteudo_hierarquia.sql.
-- É idempotente.
--
-- Cada guia de início ("Guia de mensagens", "Guia de CRM", "Guia financeiro"…)
-- passa a conter várias perguntas e respostas, no mesmo modelo de pai e filho
-- já usado por serviço → benefício: a pergunta pende do guia via parent_id.
-- ==============================================================================

-- A coluna `secao` tinha um CHECK com quatro valores fixos; precisa aceitar
-- 'faq' também. O nome do constraint é descoberto em tempo de execução porque
-- ele foi criado inline (sem nome explícito) no 010.
do $$
declare nome text;
begin
  select conname into nome
    from pg_constraint
   where conrelid = 'conteudo_plataforma'::regclass
     and contype = 'c'
     and pg_get_constraintdef(oid) ilike '%secao%';

  if nome is not null then
    execute format('alter table conteudo_plataforma drop constraint %I', nome);
  end if;
end $$;

alter table conteudo_plataforma
  add constraint conteudo_plataforma_secao_check
  check (secao in ('banner', 'guia', 'beneficio', 'servico', 'faq'));

comment on column conteudo_plataforma.secao is
  'Área da plataforma que este bloco alimenta. banner = carrossel da home; guia = guia de início; faq = pergunta dentro de um guia (parent_id aponta para o guia); servico = serviço; beneficio = vantagem de um serviço (parent_id aponta para o serviço).';

-- Em 'faq', o título guarda a pergunta e a descrição guarda a resposta.
-- Apagar um guia leva junto suas perguntas (on delete cascade, definido no 011).
