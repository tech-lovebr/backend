-- ==============================================================================
-- LOVE — Padroniza o assunto dos pedidos de alteração cadastral
--
-- Não é migration de estrutura: só renomeia dados já gravados. Rode no SQL
-- Editor do Supabase. É idempotente — rodar de novo não muda nada.
--
-- O B2B já abre chamados novos como "Alteração de dados". Os que foram
-- abertos antes ficaram no singular e apareciam assim na lista do Admin.
-- ==============================================================================

update tickets
   set assunto = 'Alteração de dados',
       updated_at = now()
 where assunto = 'Alteração de dado';
