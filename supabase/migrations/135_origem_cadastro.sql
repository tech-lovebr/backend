-- ==============================================================================
-- LOVE — Source do cadastro (de qual landing ou campanha a conta veio)
--
-- Rode no SQL Editor. É idempotente (pode rodar mais de uma vez).
--
-- 1. fornecedores e clientes (anfitriões) ganham origem_cadastro.
-- 2. Contas existentes recebem a origem guardada em raw_user_meta_data.
-- 3. handle_new_user() copia a origem nas contas novas. Parte da versão da
--    migration 117, a mais recente da função (a 132 só criou colunas).
--
-- O metadado vem do navegador: só vale ^[a-z0-9-]{1,40}$; o resto vira null.
-- A trava (check) vale também para quem tentar gravar direto na tabela.
-- ==============================================================================

alter table fornecedores add column if not exists origem_cadastro text;
alter table clientes add column if not exists origem_cadastro text;

alter table fornecedores drop constraint if exists fornecedores_origem_cadastro_check;
alter table fornecedores add constraint fornecedores_origem_cadastro_check
  check (origem_cadastro ~ '^[a-z0-9-]{1,40}$');

alter table clientes drop constraint if exists clientes_origem_cadastro_check;
alter table clientes add constraint clientes_origem_cadastro_check
  check (origem_cadastro ~ '^[a-z0-9-]{1,40}$');

comment on column fornecedores.origem_cadastro is
  'Source do cadastro (ex.: lp1). Null aparece como Direto no Admin.';
comment on column clientes.origem_cadastro is
  'Source do cadastro (ex.: lp1). Null aparece como Direto no Admin.';

-- Contas existentes: só onde ainda está vazio e só valores válidos.
update fornecedores f
   set origem_cadastro = u.raw_user_meta_data ->> 'origem_cadastro'
  from auth.users u
 where u.id = f.id
   and f.origem_cadastro is null
   and u.raw_user_meta_data ->> 'origem_cadastro' ~ '^[a-z0-9-]{1,40}$';

update clientes c
   set origem_cadastro = u.raw_user_meta_data ->> 'origem_cadastro'
  from auth.users u
 where u.id = c.id
   and c.origem_cadastro is null
   and u.raw_user_meta_data ->> 'origem_cadastro' ~ '^[a-z0-9-]{1,40}$';

create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  papel text := new.raw_user_meta_data ->> 'role';
  v_origem text := case
    when new.raw_user_meta_data ->> 'origem_cadastro' ~ '^[a-z0-9-]{1,40}$'
      then new.raw_user_meta_data ->> 'origem_cadastro'
  end;
begin
  if papel = 'fornecedor' then
    insert into fornecedores (id, company_name, email, category, origem_cadastro)
    values (
      new.id,
      coalesce(new.raw_user_meta_data ->> 'company_name', ''),
      new.email,
      new.raw_user_meta_data ->> 'category',
      v_origem
    )
    on conflict (id) do nothing;

  elsif papel = 'cliente' then
    insert into clientes (id, couple_name, first_name, last_name, email, birthday, intended_event_type, intended_event_type_label, intended_event_date, origem_cadastro)
    values (
      new.id,
      coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'couple_name', ''),
      new.raw_user_meta_data ->> 'first_name',
      new.raw_user_meta_data ->> 'last_name',
      new.email,
      (new.raw_user_meta_data ->> 'birthday')::date,
      new.raw_user_meta_data ->> 'intended_event_type',
      new.raw_user_meta_data ->> 'intended_event_type_label',
      (new.raw_user_meta_data ->> 'intended_event_date')::date,
      v_origem
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

-- A API do Supabase passa a enxergar as colunas novas na hora.
notify pgrst, 'reload schema';
