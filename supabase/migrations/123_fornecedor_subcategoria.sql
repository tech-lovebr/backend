-- 123 — Tipo do espaço (subcategoria da empresa)
-- No fim do cadastro pelo Google (B2B/signup.html?completar=1), quem escolhe
-- "Espaços para Locação" informa o CEP do local (business_cep, que já existe)
-- e o tipo do espaço (Salão de Festas, Sítio/Chácara, ...), as mesmas
-- subcategorias de Meus produtos. Sem esta coluna, o Hub guarda o tipo nos
-- dados da conta (user_metadata.subcategoria).
alter table fornecedores add column if not exists subcategoria text;
