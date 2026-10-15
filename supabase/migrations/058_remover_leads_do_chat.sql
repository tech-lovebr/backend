-- ==============================================================================
-- LOVE B2B — Desliga "quem conversa no chat vira lead" (migration 057)
--
-- Por LGPD: abrir uma conversa com o fornecedor não é consentimento para o
-- cliente entrar na base de leads dele. A partir daqui, lead só entra quando
-- o próprio fornecedor adiciona ou importa.
--
-- Remove o gatilho em conversations e as funções da 057. A coluna
-- leads.tipo_evento fica (é só um campo do lead, como os outros).
-- Os leads que já tinham sido criados automaticamente NÃO são apagados
-- aqui: o fornecedor pode excluí-los pela tabela de Leads (seleção + lixeira).
--
-- Rode este arquivo inteiro no SQL Editor do Supabase. É idempotente.
-- ==============================================================================

drop trigger if exists conversations_criar_lead_trg on conversations;
drop function if exists conversations_criar_lead();
drop function if exists sincronizar_leads_do_chat();
drop function if exists garantir_lead_do_chat(uuid, uuid);
drop function if exists evento_do_cliente_para_lead(uuid);
