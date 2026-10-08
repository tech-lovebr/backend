-- ==============================================================================
-- LOVE — Quantas vezes a pessoa entrou na plataforma
--
-- Rode no SQL Editor DEPOIS do 018_bloquear_conta.sql. É idempotente.
--
-- auth.users guarda só o último acesso. A contagem de entradas existe em
-- auth.audit_log_entries, onde o GoTrue registra cada evento de autenticação —
-- é de lá que sai o número.
--
-- Duas ressalvas honestas, que a interface repete:
--   * o Supabase poda essa tabela periodicamente, então o número conta as
--     entradas que ainda estão no registro, não a vida inteira da conta;
--   * renovação de token não é entrada nova e fica de fora de propósito.
-- ==============================================================================


create or replace function sessoes_da_conta(p_id uuid)
returns integer
language sql
stable
security definer
set search_path = public
as $$ select 0 $$;

do $do$
begin
  if exists (
    select 1 from information_schema.tables
     where table_schema = 'auth' and table_name = 'audit_log_entries'
  ) then
    execute $cmd$
      create or replace function sessoes_da_conta(p_id uuid)
      returns integer language sql stable security definer
      set search_path = public, auth
      as $fn$
        select count(*)::int
          from auth.audit_log_entries a
         where a.payload ->> 'actor_id' = p_id::text
           and a.payload ->> 'action' in ('login', 'user_signedup');
      $fn$;
    $cmd$;
  end if;
end
$do$;

revoke all on function sessoes_da_conta(uuid) from public, anon;


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
  bloqueado boolean,
  sessoes integer
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
    conta_bloqueada(u.id)                  as bloqueado,
    sessoes_da_conta(u.id)                 as sessoes
  from auth.users u
  left join fornecedores f on f.id = u.id
  left join clientes c on c.id = u.id
  where is_admin()
  order by u.created_at desc;
$$;

revoke all on function admin_listar_contas() from public, anon;
grant execute on function admin_listar_contas() to authenticated;
