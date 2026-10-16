-- ==============================================================================
-- LOVE — Mensagem do chat só pode ser editada uma vez
--
-- Rode no SQL Editor DEPOIS do 057_editar_mensagem_chat.sql. É idempotente.
--
-- A tela já esconde o "Editar" depois da primeira edição (plataforma e Hub);
-- este gatilho garante a regra no banco: se a mensagem já tem edited_at, o
-- texto não muda mais. Marcar como lida (read_at) continua liberado.
-- ==============================================================================

create or replace function bloquear_segunda_edicao_mensagem()
returns trigger language plpgsql as $$
begin
  if old.edited_at is not null and new.text is distinct from old.text then
    raise exception 'Esta mensagem já foi editada uma vez e não pode ser editada de novo.'
      using errcode = 'P0001';
  end if;
  return new;
end;
$$;

drop trigger if exists messages_editar_uma_vez on messages;
create trigger messages_editar_uma_vez before update on messages
  for each row execute function bloquear_segunda_edicao_mensagem();
