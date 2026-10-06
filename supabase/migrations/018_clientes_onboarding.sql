-- ==============================================================================
-- LOVE — Guarda no perfil do cliente o que ela preencheu no onboarding
--
-- Rode no SQL Editor DEPOIS do 015_contas_origem.sql. É idempotente.
--
-- O problema: a tela /cadastro já pergunta data de nascimento, tipo de
-- evento e data do evento desejada, mas só a data de nascimento ia pro
-- metadado do auth.users — e nada disso era copiado pra `clientes`. Se a
-- pessoa não chegasse a criar o evento de verdade (fechou a aba, etc.), essa
-- informação não aparecia em lugar nenhum do admin.
-- ==============================================================================

alter table clientes add column if not exists birthday date;
alter table clientes add column if not exists intended_event_type text;
alter table clientes add column if not exists intended_event_type_label text;
alter table clientes add column if not exists intended_event_date date;

-- Recupera o que já está disponível no metadado de quem já se cadastrou
-- (a data de nascimento já era enviada; tipo/data do evento passam a ser
-- enviados a partir de agora pelo /cadastro, então ficam nulos aqui pra
-- quem já tinha criado conta antes desta migration).
update clientes c
   set birthday = (u.raw_user_meta_data ->> 'birthday')::date
  from auth.users u
 where u.id = c.id
   and c.birthday is null
   and u.raw_user_meta_data ->> 'birthday' is not null;

create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  papel text := new.raw_user_meta_data ->> 'role';
begin
  if papel = 'fornecedor' then
    insert into fornecedores (id, company_name, email)
    values (new.id, coalesce(new.raw_user_meta_data ->> 'company_name', ''), new.email)
    on conflict (id) do nothing;

  elsif papel = 'cliente' then
    insert into clientes (id, couple_name, email, birthday, intended_event_type, intended_event_type_label, intended_event_date)
    values (
      new.id,
      coalesce(new.raw_user_meta_data ->> 'couple_name', ''),
      new.email,
      (new.raw_user_meta_data ->> 'birthday')::date,
      new.raw_user_meta_data ->> 'intended_event_type',
      new.raw_user_meta_data ->> 'intended_event_type_label',
      (new.raw_user_meta_data ->> 'intended_event_date')::date
    )
    on conflict (id) do nothing;

  else
    insert into contas_sem_origem (id, email, provedor)
    values (new.id, new.email, coalesce(new.raw_app_meta_data ->> 'provider', 'desconhecido'))
    on conflict (id) do nothing;
  end if;

  return new;
end;
$$;
