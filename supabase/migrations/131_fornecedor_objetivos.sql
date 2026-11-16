-- 131 — O que o fornecedor busca na Love
-- Na 2ª etapa do cadastro do Hub (B2B/signup.html?completar=1) a pessoa marca
-- até 3 opções em "O que você busca na Love?" (Gestão de eventos, CRM de
-- clientes, Captação de clientes, ...). O Admin mostra isso em Fornecedores.
-- Sem esta coluna, o Hub guarda a escolha nos dados da conta
-- (user_metadata.objetivos).
alter table fornecedores add column if not exists objetivos text[] not null default '{}';
