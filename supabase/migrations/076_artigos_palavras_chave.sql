-- Keywords (palavras-chave) dos artigos do blog, editadas no Admin
-- (Blog › artigo › caixa "Keywords"). Lista simples de textos.
alter table artigos add column if not exists palavras_chave text[] not null default '{}';
