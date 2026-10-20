-- Hub › Configurações › Contas conectadas › "Desconectar do Google".
-- O Supabase só deixa o próprio usuário soltar o Google com o "manual
-- linking" ligado, e mesmo assim recusa se o Google for o único login da
-- conta. Esta função faz no banco: garante o login por e-mail na conta
-- (identidade "email"), remove a identidade do Google e marca a conta como
-- "google_desconectado" (o Hub recusa entrar de novo pelo Google; ver
-- bloquearGoogleDesconectado em B2B/js/shell.js). Depois a pessoa entra
-- com o e-mail e cria a senha pelo "Esqueci minha senha".
create or replace function public.desconectar_google()
returns void
language plpgsql
security definer
set search_path = auth, public
as $$
declare
  u auth.users%rowtype;
begin
  select * into u from auth.users where id = auth.uid();
  if not found then
    raise exception 'SEM_USUARIO';
  end if;

  if not exists (select 1 from auth.identities where user_id = u.id and provider = 'email') then
    insert into auth.identities (provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    values (
      u.id::text,
      u.id,
      jsonb_build_object('sub', u.id::text, 'email', u.email, 'email_verified', true, 'phone_verified', false),
      'email',
      now(), now(), now()
    );
  end if;

  delete from auth.identities where user_id = u.id and provider = 'google';

  update auth.users
     set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb)
                             || jsonb_build_object('provider', 'email', 'providers', jsonb_build_array('email')),
         raw_user_meta_data = coalesce(raw_user_meta_data, '{}'::jsonb)
                              || jsonb_build_object('google_desconectado', true),
         updated_at = now()
   where id = u.id;
end;
$$;

revoke all on function public.desconectar_google() from public, anon;
grant execute on function public.desconectar_google() to authenticated;
