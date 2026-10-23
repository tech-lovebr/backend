-- Último aparelho usado (modelo do celular, sistema e navegador), gravado pelo
-- love.com.br e pelo Hub no metadado da conta (ultimo_aparelho). O Admin mostra
-- no drawer da conta. A função ganha uma coluna, por isso é recriada.

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
  sessoes integer,
  ultimo_aparelho text
)
language sql
stable
security definer
set search_path = public, auth
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
    greatest(
      u.last_sign_in_at,
      (select max(s.updated_at) from auth.sessions s where s.user_id = u.id)
    ) as ultimo_acesso,
    (u.email_confirmed_at is not null) as email_confirmado,
    u.raw_user_meta_data ->> 'dispositivo' as dispositivo,
    u.raw_user_meta_data ->> 'navegador'   as navegador,
    ultimo_user_agent(u.id)                as user_agent,
    conta_bloqueada(u.id)                  as bloqueado,
    sessoes_da_conta(u.id)                 as sessoes,
    u.raw_user_meta_data ->> 'ultimo_aparelho' as ultimo_aparelho
  from auth.users u
  left join fornecedores f on f.id = u.id
  left join clientes c on c.id = u.id
  where is_admin()
  order by u.created_at desc;
$$;

revoke all on function admin_listar_contas() from public, anon;
grant execute on function admin_listar_contas() to authenticated;
