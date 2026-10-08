-- ==============================================================================
-- LOVE — Evento excluído guarda quando foi excluído
--
-- Rode no SQL Editor DEPOIS do 019_sessoes_conta.sql. É idempotente.
--
-- "Deletar evento" na plataforma só tirava o evento do estado da página: a
-- linha continuava no banco, e o Admin seguia mostrando o evento como ativo
-- para sempre. Em vez de apagar de verdade — o que levaria junto convidados,
-- presentes e o histórico financeiro por cascade — o evento passa a ser
-- marcado. O anfitrião deixa de vê-lo; o Admin vê, com a data.
-- ==============================================================================

alter table eventos add column if not exists deleted_at timestamptz;

comment on column eventos.deleted_at is
  'Quando o anfitrião excluiu o evento. Nulo = ativo. O evento some para o anfitrião mas continua no banco, com convidados, presentes e carteira intactos, visível no Admin.';

create index if not exists eventos_deleted_at_idx on eventos (deleted_at)
  where deleted_at is null;
