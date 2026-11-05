-- 122 — Tags da empresa (onboarding do Hub)
-- Quem cria a conta no Hub pelo Google chega sem categoria. Na Home, o
-- onboarding (B2B/js/onboarding-empresa.js) pede a categoria e as tags do
-- que a empresa oferece (as mesmas sugestões das tags de produto). A
-- categoria já tem coluna (fornecedores.category); as tags ficam aqui.
-- Antes desta migration, o Hub guarda as tags em user_metadata.tags_empresa.
alter table fornecedores add column if not exists tags jsonb not null default '[]';
