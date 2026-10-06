-- ==============================================================================
-- LOVE — Separar por origem as contas criadas no Supabase
--
-- Rode no SQL Editor DEPOIS do 014_conteudo_status.sql. É idempotente.
--
-- O problema: `auth.users` guarda toda conta criada, mas a origem só aparece
-- em `fornecedores` (B2B) ou `clientes` (plataforma principal). O trigger
-- handle_new_user() usa o "role" enviado no cadastro por e-mail — e o login
-- social (Google/Apple) não envia esse dado. Resultado: a conta existe no
-- Supabase e não aparece em lugar nenhum do admin.
--
-- Aqui: o admin passa a enxergar TODA conta, com a origem que der para apurar,
-- e as que ficaram sem perfil são recuperadas.
-- ==============================================================================


-- ------------------------------------------------------------------
-- 1. Recupera quem tem o papel no metadado mas ficou sem perfil
--    (cadastro interrompido, trigger criado depois do usuário, etc.)
-- ------------------------------------------------------------------

insert into fornecedores (id, company_name, email)
select u.id,
       coalesce(u.raw_user_meta_data ->> 'company_name', ''),
       u.email
  from auth.users u
 where u.raw_user_meta_data ->> 'role' = 'fornecedor'
   and not exists (select 1 from fornecedores f where f.id = u.id)
on conflict (id) do nothing;

insert into clientes (id, couple_name, email)
select u.id,
       coalesce(u.raw_user_meta_data ->> 'couple_name',
                u.raw_user_meta_data ->> 'full_name',
                u.raw_user_meta_data ->> 'name', ''),
       u.email
  from auth.users u
 where u.raw_user_meta_data ->> 'role' = 'cliente'
   and not exists (select 1 from clientes c where c.id = u.id)
on conflict (id) do nothing;


-- ------------------------------------------------------------------
-- 2. O trigger passa a registrar também quem chega sem papel
--    definido, para nenhuma conta ficar invisível.
-- ------------------------------------------------------------------

create table if not exists contas_sem_origem (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  provedor text,
  created_at timestamptz not null default now()
);

alter table contas_sem_origem enable row level security;

drop policy if exists "contas_sem_origem_admin" on contas_sem_origem;
create policy "contas_sem_origem_admin" on contas_sem_origem
  for all to authenticated using (is_admin()) with check (is_admin());

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
    insert into clientes (id, couple_name, email)
    values (new.id, coalesce(new.raw_user_meta_data ->> 'couple_name', ''), new.email)
    on conflict (id) do nothing;

  else
    -- Sem papel: tipicamente login social, que não carrega metadados nossos.
    -- Fica aqui para o admin classificar em vez de sumir.
    insert into contas_sem_origem (id, email, provedor)
    values (new.id, new.email, coalesce(new.raw_app_meta_data ->> 'provider', 'desconhecido'))
    on conflict (id) do nothing;
  end if;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- Registra as contas já existentes que ficaram sem perfil nenhum.
insert into contas_sem_origem (id, email, provedor)
select u.id, u.email, coalesce(u.raw_app_meta_data ->> 'provider', 'desconhecido')
  from auth.users u
 where not exists (select 1 from fornecedores f where f.id = u.id)
   and not exists (select 1 from clientes c where c.id = u.id)
on conflict (id) do nothing;


-- ------------------------------------------------------------------
-- 3. Visão completa para o admin
--    SECURITY DEFINER para alcançar auth.users, que o PostgREST não
--    expõe. O `where is_admin()` é o que impede qualquer outro de ler.
-- ------------------------------------------------------------------

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
  email_confirmado boolean
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
    (u.email_confirmed_at is not null) as email_confirmado
  from auth.users u
  left join fornecedores f on f.id = u.id
  left join clientes c on c.id = u.id
  where is_admin()
  order by u.created_at desc;
$$;

revoke all on function admin_listar_contas() from public, anon;
grant execute on function admin_listar_contas() to authenticated;
