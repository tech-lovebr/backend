-- ==============================================================================
-- LOVE B2B — Texto do portfólio do fornecedor
--
-- O portfólio da página da empresa (love.com.br › Explorar) é um carrossel
-- com as fotos de Configurações › Minha Empresa › Portfólio e, embaixo, um
-- texto contando sobre os trabalhos realizados. Esta coluna guarda esse
-- texto; é escrita pelo próprio fornecedor no Hub (a policy de update do
-- fornecedor já cobre a tabela inteira).
--
-- Rode este arquivo inteiro no SQL Editor do Supabase. É idempotente.
-- ==============================================================================

alter table fornecedores add column if not exists portfolio_texto text;
