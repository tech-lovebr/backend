-- ==============================================================================
-- LOVE — Editar mensagem no chat (anfitrião ↔ fornecedor)
--
-- Rode no SQL Editor DEPOIS do 056_favoritos_por_servico_e_avaliacoes.sql. É idempotente.
--
-- Quem escreveu uma mensagem pode corrigir o texto dela. A coluna edited_at
-- marca quando foi editada (o chat mostra "(editado)"). Só o autor altera a
-- própria mensagem; conversa, remetente e anexo não mudam por aqui.
-- ==============================================================================

alter table messages add column if not exists edited_at timestamptz;

drop policy if exists "messages_update_own" on messages;
create policy "messages_update_own" on messages
  for update to authenticated
  using (sender_id = auth.uid())
  with check (sender_id = auth.uid());
