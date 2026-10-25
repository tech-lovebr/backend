-- 112 — E-mails de contato@love.com.br entram no Atendimento.
--
-- O servidor lê a caixa de entrada (IMAP do Gmail, api/_email-suporte.js).
-- Cada e-mail é guardado com o Message-ID dele, para não entrar duas vezes e
-- para achar a conversa quando a pessoa responde:
--   • e-mail novo  → tickets.email_message_id
--   • resposta     → ticket_messages.email_message_id (coluna da 060)
-- Uma conversa resolvida volta a "aberto" (Pendente) quando a pessoa escreve
-- de novo — isso já é feito pelo trigger atualizar_conversa_do_ticket (064).
-- Idempotente.

alter table tickets add column if not exists email_message_id text;
create index if not exists tickets_email_message_id_idx on tickets (email_message_id) where email_message_id is not null;
create index if not exists ticket_messages_email_message_id_idx on ticket_messages (email_message_id) where email_message_id is not null;
