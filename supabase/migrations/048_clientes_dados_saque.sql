-- ==============================================================================
-- LOVE — Dados de saque do anfitrião (Carteira digital)
--
-- Rode no SQL Editor. É idempotente.
--
-- Carteira › "Dados de saque" guarda como o anfitrião quer receber:
--   { "metodo": "pix", "pix": { "tipo": "cpf|email|telefone|aleatoria", "chave": "..." } }
--   { "metodo": "ted", "ted": { "banco": "...", "agencia": "...", "conta": "...",
--                               "titular": "...", "cpf": "..." } }
-- A policy clientes_update_own (001_auth_chat.sql) já deixa o próprio
-- anfitrião atualizar a linha dele; o trigger de status (035) não é afetado.
-- ==============================================================================

alter table clientes add column if not exists dados_saque jsonb not null default '{}';

comment on column clientes.dados_saque is
  'Dados de saque do anfitrião (Carteira): método pix (tipo + chave) ou ted (banco, agência, conta, titular, CPF).';
