-- 098 — Contas bancárias da empresa (Hub › Financeiro › Contas bancárias).
-- Mesmo fluxo da Carteira Digital do anfitrião: antes da primeira conta, a
-- empresa envia os documentos (verificacoes_conta, migration 070); depois
-- cadastra as contas que recebem os saques. As contas ficam aqui, no mesmo
-- formato de clientes.dados_saque: { contas: [{ id, metodo: 'ted', ted: {
-- banco, banco_codigo, agencia, conta, digito, tipo, natureza, titular,
-- documento }, status: 'em_analise' | 'aprovado' | 'recusado', criadaEm }] }.
-- Rode no SQL Editor. Idempotente.

alter table fornecedores add column if not exists dados_saque jsonb not null default '{}';

comment on column fornecedores.dados_saque is
  'Contas bancárias da empresa para os saques (Hub › Financeiro › Contas bancárias). A Love confere e muda o status de cada conta.';

notify pgrst, 'reload schema';
