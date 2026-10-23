-- 080 — Orçamento da solicitação passa a ser De / Até (opcional).
-- Sem valores, o pedido fica sem faixa; com valores, faixa = 'personalizada'
-- e valor_min / valor_max guardam o "de" e o "até".
alter table pedidos_orcamento alter column faixa drop not null;
