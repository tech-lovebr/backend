-- ==============================================================================
-- LOVE — Bloquear conta (reversível) ao lado de excluir (definitivo)
--
-- Rode no SQL Editor DEPOIS do 017_excluir_conta_e_dispositivo.sql. É idempotente.
--
-- Bloquear não é "marcar como bloqueado e torcer": uma conta marcada que ainda
-- consegue entrar não está bloqueada. Então o bloqueio faz as duas coisas —
-- grava o status no perfil, que é o que o Admin e as listas mostram, e preenche
-- `banned_until` em auth.users, que é o que de fato impede o login. Desbloquear
-- desfaz os dois. Nada é apagado: quem foi bloqueado continua na base com todos
-- os seus eventos, contratos e movimentos.
-- ==============================================================================


-- ------------------------------------------------------------------
-- 1. A conta está bloqueada?
--    Em duas etapas pelo mesmo motivo do ultimo_user_agent(): a coluna
--    auth.users.banned_until existe nas versões atuais do GoTrue, mas a
--    função precisa compilar mesmo onde ela não existir.
-- ------------------------------------------------------------------

create or replace function conta_bloqueada(p_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from fornecedores f where f.id = p_id and f.status = 'bloqueado')
      or exists (select 1 from clientes     c where c.id = p_id and c.status = 'bloqueado');
$$;

do $do$
begin
  if exists (
    select 1 from information_schema.columns
     where table_schema = 'auth' and table_name = 'users' and column_name = 'banned_until'
  ) then
    execute $cmd$
      create or replace function conta_bloqueada(p_id uuid)
      returns boolean language sql stable security definer
      set search_path = public, auth
      as $fn$
        select exists (select 1 from fornecedores f where f.id = p_id and f.status = 'bloqueado')
            or exists (select 1 from clientes     c where c.id = p_id and c.status = 'bloqueado')
            or exists (select 1 from auth.users   u where u.id = p_id and u.banned_until > now());
      $fn$;
    $cmd$;
  end if;
end
$do$;

revoke all on function conta_bloqueada(uuid) from public, anon;


-- ------------------------------------------------------------------
-- 2. Bloquear e desbloquear
-- ------------------------------------------------------------------

create or replace function admin_bloquear_conta(p_id uuid, p_bloquear boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not is_admin() then
    raise exception 'Apenas administradores podem bloquear contas.';
  end if;

  if p_id = auth.uid() then
    raise exception 'Você não pode bloquear a sua própria conta.';
  end if;

  if exists (select 1 from admins a where a.id = p_id) then
    raise exception 'Esta conta é de um administrador. Remova a função de administrador antes de bloquear.';
  end if;

  if not exists (select 1 from auth.users u where u.id = p_id) then
    raise exception 'Conta não encontrada.';
  end if;

  -- O que o Admin e as listas das plataformas enxergam.
  update fornecedores set status = case when p_bloquear then 'bloqueado' else 'ativo' end where id = p_id;
  update clientes     set status = case when p_bloquear then 'bloqueado' else 'ativo' end where id = p_id;

  -- O que realmente barra o login. Sem isto o bloqueio seria só um rótulo.
  if exists (
    select 1 from information_schema.columns
     where table_schema = 'auth' and table_name = 'users' and column_name = 'banned_until'
  ) then
    if p_bloquear then
      execute 'update auth.users set banned_until = $1 where id = $2'
        using (now() + interval '100 years'), p_id;
    else
      execute 'update auth.users set banned_until = null where id = $1'
        using p_id;
    end if;
  end if;
end;
$$;

revoke all on function admin_bloquear_conta(uuid, boolean) from public, anon;
grant execute on function admin_bloquear_conta(uuid, boolean) to authenticated;


-- ------------------------------------------------------------------
-- 3. A lista de contas passa a dizer quem está bloqueado
-- ------------------------------------------------------------------

drop function if exists admin_listar_contas();

create or replace function admin_listar_contas()
returns table (
  id uuid,
  email text,
  nome text,
  origem text,
  provedor text,
  papel_metadado text,
  criado_em timestamptz,
  ultimo_acesso timestamptz,
  email_confirmado boolean,
  dispositivo text,
  navegador text,
  user_agent text,
  bloqueado boolean
)
language sql
stable
security definer
set search_path = public
as $$
  select
    u.id,
    u.email::text,
    coalesce(
      nullif(f.company_name, ''),
      nullif(c.couple_name, ''),
      u.raw_user_meta_data ->> 'company_name',
      u.raw_user_meta_data ->> 'couple_name',
      u.raw_user_meta_data ->> 'full_name',
      u.raw_user_meta_data ->> 'name'
    ) as nome,
    case
      when f.id is not null then 'b2b'
      when c.id is not null then 'anfitriao'
      else 'sem_origem'
    end as origem,
    coalesce(u.raw_app_meta_data ->> 'provider', 'email') as provedor,
    u.raw_user_meta_data ->> 'role' as papel_metadado,
    u.created_at,
    u.last_sign_in_at,
    (u.email_confirmed_at is not null) as email_confirmado,
    u.raw_user_meta_data ->> 'dispositivo' as dispositivo,
    u.raw_user_meta_data ->> 'navegador'   as navegador,
    ultimo_user_agent(u.id)                as user_agent,
    conta_bloqueada(u.id)                  as bloqueado
  from auth.users u
  left join fornecedores f on f.id = u.id
  left join clientes c on c.id = u.id
  where is_admin()
  order by u.created_at desc;
$$;

revoke all on function admin_listar_contas() from public, anon;
grant execute on function admin_listar_contas() to authenticated;
