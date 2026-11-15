-- ==============================================================================
-- LOVE — Tipo de evento "Chá de Bebê / Fraldas"
--
-- Rode no SQL Editor. É idempotente.
--
-- O catálogo de tipos (tabela tipos_evento, migration 088) passa a mostrar
-- "Chá de Bebê / Fraldas" no lugar de "Chá de Bebê". O slug continua
-- cha_de_bebe; quem pesquisar "fraldas" também encontra.
-- ==============================================================================

update tipos_evento
   set nome = 'Chá de Bebê / Fraldas',
       palavras_chave = (select array_agg(distinct p) from unnest(coalesce(palavras_chave, '{}') || array['fraldas', 'cha de fraldas']) as p)
 where slug = 'cha_de_bebe';
