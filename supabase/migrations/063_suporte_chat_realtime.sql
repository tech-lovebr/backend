-- 063: Suporte Love no chat (Hub e love.com.br)
-- A conversa fixa "Suporte Love" é um chamado do Atendimento (tickets, canal
-- 'chat'). Para a resposta do admin aparecer na hora no chat de quem abriu o
-- chamado, ticket_messages entra no realtime (o RLS do 004 continua valendo:
-- cada um só recebe as mensagens dos próprios chamados). Idempotente.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
     where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'ticket_messages'
  ) then
    alter publication supabase_realtime add table public.ticket_messages;
  end if;
end $$;
