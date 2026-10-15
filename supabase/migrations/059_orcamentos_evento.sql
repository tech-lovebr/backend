-- ==============================================================================
-- LOVE B2B — Proposta (orçamento) com data do evento e convidados
--
-- A Proposta do Hub (Vendas) ganhou os campos "Data do evento" e
-- "Convidados", que vêm preenchidos quando ela é aberta pelo botão "Criar
-- orçamento" de um pedido de orçamento do chat. Esta migration só cria as
-- duas colunas em `orcamentos`; não mexe em leads, na function
-- solicitar_orcamento nem nas tabelas da plataforma do anfitrião.
--
-- Rode este arquivo inteiro no SQL Editor do Supabase. É idempotente.
-- ==============================================================================

alter table orcamentos add column if not exists data_evento text;
alter table orcamentos add column if not exists convidados integer;
