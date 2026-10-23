-- 095 — Criar solicitação: ambiente do evento (ao lado de Convidados).
-- fechado, ar_livre, misto ou a_definir. Opcional. Sem esta migration a
-- plataforma publica sem o ambiente. Idempotente.
alter table pedidos_orcamento add column if not exists ambiente text;
