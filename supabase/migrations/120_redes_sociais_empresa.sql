-- 120 — Redes sociais da empresa (Configurações > Dados da empresa)
-- Instagram, LinkedIn, TikTok, Facebook, YouTube — links que a pessoa
-- preenche uma vez e que, no futuro, podem aparecer na página pública
-- da empresa. Guardado como jsonb ({ instagram, linkedin, tiktok,
-- facebook, youtube }, só as chaves preenchidas) em vez de uma coluna
-- por rede, pra adicionar/remover rede sem nova migration.
alter table fornecedores add column if not exists social_links jsonb not null default '{}';
