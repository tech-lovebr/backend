-- 075 — Nota fiscal ligada ao contrato (Vendas › Meus contratos › ⋯ ›
-- Emitir nota fiscal / Ver nota fiscal / Gerar PDF).
alter table notas_fiscais add column if not exists contract_id uuid references contracts(id) on delete set null;
create index if not exists notas_fiscais_contract_idx on notas_fiscais (contract_id);
