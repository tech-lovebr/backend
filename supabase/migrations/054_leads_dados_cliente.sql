-- ==============================================================================
-- LOVE B2B — Leads: dados do cliente
--
-- O drawer "Adicionar lead" (Hub › Leads) passou a pedir CPF, WhatsApp,
-- endereço, estado, cidade e a data do orçamento, além do que já existia
-- (nome, e-mail, produto/serviço, data do evento e orçamento — este último
-- continua na coluna `value`). A importação de lista de leads usa as mesmas
-- colunas. Todas são opcionais.
--
-- Rode este arquivo inteiro no SQL Editor do Supabase. É idempotente.
-- ==============================================================================

alter table leads add column if not exists cpf text;
alter table leads add column if not exists whatsapp text;
alter table leads add column if not exists endereco text;
alter table leads add column if not exists estado text;
alter table leads add column if not exists cidade text;
alter table leads add column if not exists data_orcamento text;
