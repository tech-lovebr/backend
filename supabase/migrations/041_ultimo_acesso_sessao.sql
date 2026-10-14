-- ==============================================================================
-- LOVE — "Último acesso" conta a sessão em uso, não só o último login
--
-- Rode no SQL Editor DEPOIS do 040_notificacoes_tema.sql. É idempotente.
--
-- auth.users.last_sign_in_at só muda quando a pessoa entra de novo (senha,
-- Google…). Quem fica logado renova o token sozinho a cada hora, e isso não
-- toca esse campo — o painel mostrava "há 21 h" para quem estava usando
-- naquele minuto. A renovação atualiza auth.sessions.updated_at; o último
-- acesso passa a ser o mais recente dos dois (precisão de ~1 h, o intervalo
-- de renovação).
-- ==============================================================================

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
    sessoes_da_conta(u.id)                 as sessoes
  from auth.users u
  left join fornecedores f on f.id = u.id
  left join clientes c on c.id = u.id
  where is_admin()
  order by u.created_at desc;
$$;

revoke all on function admin_listar_contas() from public, anon;
grant execute on function admin_listar_contas() to authenticated;
