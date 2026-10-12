-- ==========================================================================
-- LOVE B2B — remove accepts_boleto (coluna adicionada em 032_empresa_config.sql).
-- Pedido do cliente: o checkbox "Aceita boleto bancário" saiu da tela de
-- Configurações > Minha Empresa antes mesmo de entrar em uso real.
-- ==========================================================================

alter table fornecedores drop column if exists accepts_boleto;
