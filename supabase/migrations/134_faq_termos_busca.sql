-- 134 — Termos de pesquisa de cada pergunta da Central de Ajuda.
--
-- Sinônimos, palavras-chave e frases que levam até a pergunta ("como sacar"
-- para "Como transfiro meu saldo para o banco?"). Vale para o anfitrião e
-- para o Hub, e é preenchido à mão no Admin. Idempotente.

alter table faq
  add column if not exists termos_busca text[] not null default '{}';

comment on column faq.termos_busca is
  'Formas como as pessoas procuram esta pergunta. Até 30 termos de 60 caracteres, validados no Admin.';

-- A API do Supabase passa a enxergar a coluna nova na hora.
notify pgrst, 'reload schema';
