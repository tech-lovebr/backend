-- ==============================================================================
-- LOVE — Nome e sobrenome do anfitrião em colunas separadas
--
-- Rode no SQL Editor DEPOIS do 018_clientes_onboarding.sql. É idempotente.
--
-- O /cadastro pergunta "Nome" e "Sobrenome", mas só gravava a junção dos dois
-- em clientes.couple_name. Agora:
--   first_name  → campo "Nome"
--   last_name   → campo "Sobrenome" (nulo se vier vazio)
--   full_name   → first_name + ' ' + last_name, montado pelo banco
--
-- couple_name continua existindo porque Admin e B2B leem essa coluna. Um
-- gatilho mantém couple_name = full_name em qualquer escrita:
--   • quem grava first_name/last_name (plataforma) → recalcula full_name e
--     couple_name;
--   • quem grava só couple_name (Admin, cadastros antigos) → divide em
--     first_name (primeira palavra) e last_name (o resto).
-- ==============================================================================

alter table clientes add column if not exists first_name text;
alter table clientes add column if not exists last_name text;
alter table clientes add column if not exists full_name text;

-- ------------------------------------------------------------------------------
-- Gatilho de consistência
-- ------------------------------------------------------------------------------
create or replace function clientes_sync_nome()
returns trigger
language plpgsql
as $$
declare
  completo text;
begin
  if tg_op = 'INSERT'
     or new.first_name is distinct from old.first_name
     or new.last_name  is distinct from old.last_name then
    new.first_name := nullif(btrim(new.first_name), '');
    new.last_name  := nullif(btrim(new.last_name), '');

    -- Insert que só trouxe couple_name (cadastro antigo / Admin): divide.
    if new.first_name is null and new.last_name is null then
      completo := nullif(regexp_replace(btrim(coalesce(new.couple_name, '')), '\s+', ' ', 'g'), '');
      new.first_name := split_part(completo, ' ', 1);
      new.last_name  := nullif(substr(completo, length(new.first_name) + 2), '');
      new.first_name := nullif(new.first_name, '');
    end if;

  elsif new.couple_name is distinct from old.couple_name then
    completo := nullif(regexp_replace(btrim(coalesce(new.couple_name, '')), '\s+', ' ', 'g'), '');
    new.first_name := nullif(split_part(completo, ' ', 1), '');
    new.last_name  := nullif(substr(completo, length(coalesce(new.first_name, '')) + 2), '');

  else
    return new;
  end if;

  new.full_name   := nullif(concat_ws(' ', new.first_name, new.last_name), '');
  new.couple_name := coalesce(new.full_name, '');
  return new;
end;
$$;

drop trigger if exists clientes_sync_nome on clientes;
create trigger clientes_sync_nome
  before insert or update on clientes
  for each row execute function clientes_sync_nome();

-- ------------------------------------------------------------------------------
-- Migra quem já tem conta: primeira palavra de couple_name → first_name,
-- o resto → last_name; full_name recebe o valor completo (via gatilho).
-- ------------------------------------------------------------------------------
update clientes
   set first_name = nullif(split_part(regexp_replace(btrim(couple_name), '\s+', ' ', 'g'), ' ', 1), ''),
       last_name  = nullif(substr(
                      regexp_replace(btrim(couple_name), '\s+', ' ', 'g'),
                      length(split_part(regexp_replace(btrim(couple_name), '\s+', ' ', 'g'), ' ', 1)) + 2
                    ), '')
 where first_name is null
   and coalesce(btrim(couple_name), '') <> '';

-- E leva o mesmo para o user_metadata do Auth, que é o que os templates de
-- e-mail enxergam ({{ .Data.first_name }}). Só preenche quem ainda não tem.
update auth.users u
   set raw_user_meta_data = coalesce(u.raw_user_meta_data, '{}'::jsonb)
                            || jsonb_build_object(
                                 'first_name', coalesce(c.first_name, ''),
                                 'last_name',  coalesce(c.last_name, ''),
                                 'full_name',  coalesce(c.full_name, '')
                               )
  from clientes c
 where c.id = u.id
   and u.raw_user_meta_data ->> 'first_name' is null;

-- ------------------------------------------------------------------------------
-- Cadastro novo: copia first_name/last_name do metadado do signUp.
-- (Mesmo corpo do 018, só acrescentando as colunas de nome.)
-- ------------------------------------------------------------------------------
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
    insert into clientes (id, couple_name, first_name, last_name, email, birthday, intended_event_type, intended_event_type_label, intended_event_date)
    values (
      new.id,
      coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'couple_name', ''),
      new.raw_user_meta_data ->> 'first_name',
      new.raw_user_meta_data ->> 'last_name',
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

-- ------------------------------------------------------------------------------
-- RLS: o anfitrião só atualiza o próprio registro — inclusive o valor final
-- (with check), não só a linha que ele escolheu editar.
-- ------------------------------------------------------------------------------
drop policy if exists "clientes_update_own" on clientes;
create policy "clientes_update_own" on clientes
  for update to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);
