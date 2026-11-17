-- ==============================================================================
-- LOVE — Conserta "Database error saving new user" no cadastro do anfitrião
--
-- Rode no SQL Editor. É idempotente (pode rodar mais de uma vez).
--
-- O problema: a função handle_new_user() (migration 117), que roda ao criar
-- a conta, grava em clientes as colunas birthday, intended_event_type,
-- intended_event_type_label e intended_event_date (criadas na migration 018)
-- e first_name/last_name/full_name (migration 034). No banco, a coluna
-- birthday não existia: o insert falhava e o Supabase recusava o cadastro
-- inteiro com "Database error saving new user".
--
-- A correção: garante todas as colunas que a função usa e recupera, para
-- quem já tem conta, o que ficou guardado no metadado do cadastro.
-- ==============================================================================

alter table clientes add column if not exists birthday date;
alter table clientes add column if not exists intended_event_type text;
alter table clientes add column if not exists intended_event_type_label text;
alter table clientes add column if not exists intended_event_date date;
alter table clientes add column if not exists first_name text;
alter table clientes add column if not exists last_name text;
alter table clientes add column if not exists full_name text;

-- Recupera as datas do metadado de quem já se cadastrou (só valores no
-- formato AAAA-MM-DD, para nenhum texto estranho quebrar a conversão).
update clientes c
   set birthday = (u.raw_user_meta_data ->> 'birthday')::date
  from auth.users u
 where u.id = c.id
   and c.birthday is null
   and u.raw_user_meta_data ->> 'birthday' ~ '^\d{4}-\d{2}-\d{2}$';

update clientes c
   set intended_event_date = (u.raw_user_meta_data ->> 'intended_event_date')::date
  from auth.users u
 where u.id = c.id
   and c.intended_event_date is null
   and u.raw_user_meta_data ->> 'intended_event_date' ~ '^\d{4}-\d{2}-\d{2}$';

update clientes c
   set intended_event_type = coalesce(c.intended_event_type, u.raw_user_meta_data ->> 'intended_event_type'),
       intended_event_type_label = coalesce(c.intended_event_type_label, u.raw_user_meta_data ->> 'intended_event_type_label')
  from auth.users u
 where u.id = c.id
   and (c.intended_event_type is null or c.intended_event_type_label is null)
   and (u.raw_user_meta_data ? 'intended_event_type' or u.raw_user_meta_data ? 'intended_event_type_label');

-- O PostgREST passa a enxergar as colunas novas na hora.
notify pgrst, 'reload schema';
