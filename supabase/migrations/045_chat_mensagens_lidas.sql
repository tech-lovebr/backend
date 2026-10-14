-- ==============================================================================
-- LOVE — Chat: mensagens lidas / não lidas (anfitrião ⇄ fornecedor)
--
-- Rode no SQL Editor DEPOIS do 044_convite_musica_autoplay.sql. É idempotente.
--
-- A tabela messages (001_auth_chat.sql) já tem read_at, mas ninguém marcava
-- nada como lido — e não há policy de UPDATE em messages (de propósito: quem
-- recebe não pode reescrever o texto do outro). Esta função marca como lidas
-- só as mensagens que a pessoa logada RECEBEU numa conversa da qual participa.
--
-- Uso (nos dois apps):
--   anfitrião (index):  supabaseClient.rpc('marcar_conversa_lida', { p_conversation_id })
--   fornecedor (B2B):   o mesmo — a função descobre o lado pelo auth.uid().
--
-- Não lidas de uma conversa = mensagens com read_at nulo e sender_id diferente
-- do usuário logado.
-- ==============================================================================

create or replace function marcar_conversa_lida(p_conversation_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_qtd integer;
begin
  if auth.uid() is null then
    return 0;
  end if;

  -- Só quem participa da conversa (fornecedor ou cliente da linha).
  if not exists (
    select 1 from conversations c
     where c.id = p_conversation_id
       and (c.fornecedor_id = auth.uid() or c.cliente_id = auth.uid())
  ) then
    return 0;
  end if;

  update messages
     set read_at = now()
   where conversation_id = p_conversation_id
     and sender_id <> auth.uid()
     and read_at is null;

  get diagnostics v_qtd = row_count;
  return v_qtd;
end;
$$;

revoke all on function marcar_conversa_lida(uuid) from public;
grant execute on function marcar_conversa_lida(uuid) to authenticated;

-- Índice para contar não lidas rápido.
create index if not exists messages_nao_lidas_idx
  on messages (conversation_id)
  where read_at is null;
