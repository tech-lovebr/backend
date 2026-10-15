-- ==============================================================================
-- LOVE — Login/cadastro com o Google na plataforma do anfitrião
--
-- Rode no SQL Editor. É idempotente.
--
-- Quem entra pelo Google não passa pelo /cadastro, então o usuário é criado
-- no Supabase Auth sem "role" e o trigger handle_new_user não cria a linha
-- em clientes — e a plataforma derruba a sessão ("não cadastrado como
-- anfitrião"). Esta função, chamada pela plataforma logo depois do retorno
-- do Google, cria a linha de anfitrião do usuário logado com o nome, e-mail
-- e foto da conta Google. Não faz nada para contas de fornecedor (B2B) nem
-- para quem já tem cadastro.
-- ==============================================================================

create or replace function garantir_cliente_google()
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_user auth.users%rowtype;
  v_meta jsonb;
  v_nome text;
  v_primeiro text;
  v_sobrenome text;
begin
  if v_uid is null then
    return false;
  end if;

  if exists (select 1 from clientes where id = v_uid) then
    return true;
  end if;

  -- Conta de fornecedor (Hub B2B): não vira anfitrião automaticamente.
  if exists (select 1 from fornecedores where id = v_uid) then
    return false;
  end if;

  select * into v_user from auth.users where id = v_uid;
  if not found then
    return false;
  end if;

  v_meta := coalesce(v_user.raw_user_meta_data, '{}'::jsonb);
  v_nome := btrim(coalesce(v_meta ->> 'full_name', v_meta ->> 'name', ''));
  v_primeiro := nullif(btrim(coalesce(v_meta ->> 'given_name', split_part(v_nome, ' ', 1))), '');
  v_sobrenome := nullif(btrim(coalesce(
    v_meta ->> 'family_name',
    case when position(' ' in v_nome) > 0 then substr(v_nome, position(' ' in v_nome) + 1) else '' end
  )), '');

  insert into clientes (id, couple_name, first_name, last_name, email, avatar_url)
  values (
    v_uid,
    coalesce(nullif(v_nome, ''), split_part(coalesce(v_user.email, ''), '@', 1)),
    v_primeiro,
    v_sobrenome,
    coalesce(v_user.email, ''),
    coalesce(v_meta ->> 'avatar_url', v_meta ->> 'picture')
  )
  on conflict (id) do nothing;

  return true;
end;
$$;

revoke all on function garantir_cliente_google() from public;
grant execute on function garantir_cliente_google() to authenticated;
