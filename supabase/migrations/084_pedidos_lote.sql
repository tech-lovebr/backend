-- 084 — Solicitação em massa ("Criar várias"): cada serviço vira uma
-- solicitação própria (aparece no feed do nicho certo no Hub), todas ligadas
-- pelo mesmo lote_id para aparecerem juntas em Minhas solicitações.
alter table pedidos_orcamento add column if not exists lote_id uuid;
create index if not exists pedidos_orcamento_lote_idx on pedidos_orcamento (lote_id);
