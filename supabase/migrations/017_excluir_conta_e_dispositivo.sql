-- ==============================================================================
-- LOVE — Excluir conta pelo próprio Admin, e de onde a pessoa se cadastrou
--
-- Rode no SQL Editor DEPOIS do 016_banner_carrosseis.sql. É idempotente.
--
-- Duas coisas:
--
-- 1. admin_excluir_conta() — apagar uma conta exige alcançar auth.users, que o
--    PostgREST não expõe e a chave anônima não alcança. Em vez de pôr uma chave
--    de serviço no navegador (qualquer um com ela apaga o banco inteiro), a
--    exclusão vira uma função SECURITY DEFINER com `is_admin()` na porta. O
--    poder continua vindo da tabela `admins`, não de um segredo no front.
--
-- 2. dispositivo e navegador — auth.users não guarda isso. Duas fontes, nessa
--    ordem: o que o cadastro registrou no metadado (exato, mas só vale para
--    quem se cadastrar daqui para frente) e, na falta dele, o user_agent da
--    sessão mais recente em auth.sessions (aproximado — é o último aparelho
--    usado, não necessariamente o do cadastro, e some quando a sessão expira).
-- ==============================================================================


-- ------------------------------------------------------------------
-- 1. Excluir conta
--    O cascade de auth.users leva junto perfil, eventos, convidados,
--    presentes, contratos, carteira, leads, produtos e conversas.
-- ------------------------------------------------------------------

create or replace function admin_excluir_conta(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not is_admin() then
    raise exception 'Apenas administradores podem excluir contas.';
  end if;

  if p_id = auth.uid() then
    raise exception 'Você não pode excluir a sua própria conta.';
  end if;

  if exists (select 1 from admins a where a.id = p_id) then
    raise exception 'Esta conta é de um administrador. Remova a função de administrador antes de excluir.';
  end if;

  if not exists (select 1 from auth.users u where u.id = p_id) then
    raise exception 'Conta não encontrada.';
  end if;

  delete from auth.users where id = p_id;
end;
$$;

revoke all on function admin_excluir_conta(uuid) from public, anon;
grant execute on function admin_excluir_conta(uuid) to authenticated;


-- ------------------------------------------------------------------
-- 2. User agent da sessão mais recente
--    Criada em duas etapas de propósito: a coluna auth.sessions.user_agent
--    existe nas versões atuais do GoTrue, mas não em todas. A versão vazia
--    garante que admin_listar_contas() compile de qualquer jeito; a troca
--    só acontece se a coluna realmente estiver lá.
-- ------------------------------------------------------------------

create or replace function ultimo_user_agent(p_id uuid)
returns text
language sql
stable
security definer
set search_path = public
as $$ select null::text $$;

do $do$
begin
  if exists (
    select 1 from information_schema.columns
     where table_schema = 'auth' and table_name = 'sessions' and column_name = 'user_agent'
  ) then
    execute 'create or replace function ultimo_user_agent(p_id uuid)
             returns text language sql stable security definer
             set search_path = public, auth
             as ''select s.user_agent from auth.sessions s
                  where s.user_id = p_id
                  order by s.updated_at desc nulls last, s.created_at desc
                  limit 1''';
  end if;
end
$do$;

revoke all on function ultimo_user_agent(uuid) from public, anon;


-- ------------------------------------------------------------------
-- 3. A lista de contas passa a carregar de onde a pessoa veio
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
  user_agent text
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
    ultimo_user_agent(u.id)                as user_agent
  from auth.users u
  left join fornecedores f on f.id = u.id
  left join clientes c on c.id = u.id
  where is_admin()
  order by u.created_at desc;
$$;

revoke all on function admin_listar_contas() from public, anon;
grant execute on function admin_listar_contas() to authenticated;
