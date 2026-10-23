-- 090 — Planos do Hub editáveis pelo Admin (Configurações → Planos).
--
-- 1) Tabela planos: nome, descrição, status, preço, período e quantas
--    empresas o login pode ter (a principal + as extras).
--    fornecedores.plan continua guardando o NOME do plano ("Gratuito", "Pro").
-- 2) limite_de_empresas() passa a ler o limite daqui (antes era fixo: 1 e 3).
--    Plano vencido volta a valer o limite do Gratuito.
-- 3) admin_mudar_plano(e-mail, plano, dias): o Admin muda o plano de uma
--    conta pelo e-mail. dias = null deixa sem vencimento.
--
-- Rode no SQL Editor. Idempotente.

create table if not exists planos (
  id text primary key,
  nome text not null unique,
  descricao text,
  status text not null default 'ativo' check (status in ('ativo', 'inativo')),
  preco numeric(10,2) not null default 0 check (preco >= 0),
  periodo text not null default 'mensal' check (periodo in ('mensal', 'trimestral', 'semestral', 'anual')),
  limite_empresas integer not null default 1 check (limite_empresas >= 1),
  ordem integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into planos (id, nome, descricao, preco, periodo, limite_empresas, ordem) values
  ('gratuito', 'Gratuito', 'Plano de entrada do Hub, com uma empresa.', 0, 'mensal', 1, 1),
  ('pro', 'Pro', 'Plano completo: a empresa principal e mais duas.', 82, 'mensal', 3, 2)
on conflict (id) do nothing;

alter table planos enable row level security;

drop policy if exists "planos_leitura" on planos;
create policy "planos_leitura" on planos for select using (true);

drop policy if exists "planos_admin" on planos;
create policy "planos_admin" on planos
  for all
  using (is_admin())
  with check (is_admin());

-- Limite de empresas pelo plano da conta principal.
create or replace function public.limite_de_empresas()
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select p.limite_empresas
       from planos p
      where lower(p.nome) = lower(
        case when f.plan_expira_em is not null and f.plan_expira_em <= now() then 'Gratuito'
             else coalesce(f.plan, 'Gratuito') end)
      limit 1),
    case when f.plan = 'Pro' and (f.plan_expira_em is null or f.plan_expira_em > now()) then 3 else 1 end
  )
  from fornecedores f
  where f.id = auth.uid();
$$;

revoke all on function public.limite_de_empresas() from public, anon;
grant execute on function public.limite_de_empresas() to authenticated;

-- Mudar o plano de uma conta pelo e-mail (todas as empresas daquele login).
create or replace function public.admin_mudar_plano(p_email text, p_plano text, p_dias integer default null)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_plano planos%rowtype;
  v_dono uuid;
  v_total integer;
begin
  if not is_admin() then
    raise exception 'Apenas administradores podem mudar planos.';
  end if;

  select * into v_plano from planos where id = p_plano;
  if not found then
    raise exception 'Plano não encontrado.';
  end if;

  select coalesce(f.dono_id, f.id) into v_dono
    from fornecedores f
   where lower(f.email) = lower(trim(p_email))
   limit 1;

  if v_dono is null then
    select u.id into v_dono from auth.users u where lower(u.email) = lower(trim(p_email)) limit 1;
  end if;

  if v_dono is null then
    raise exception 'Nenhuma conta do Hub com o e-mail %.', p_email;
  end if;

  update fornecedores
     set plan = v_plano.nome,
         plan_origem = case when v_plano.preco = 0 then null else 'bonificacao_admin' end,
         plan_expira_em = case when v_plano.preco = 0 or p_dias is null then null
                               else now() + (p_dias || ' days')::interval end
   where id = v_dono or dono_id = v_dono;

  get diagnostics v_total = row_count;
  if v_total = 0 then
    raise exception 'Nenhuma empresa encontrada para o e-mail %.', p_email;
  end if;
  return v_total;
end;
$$;

revoke all on function public.admin_mudar_plano(text, text, integer) from public, anon;
grant execute on function public.admin_mudar_plano(text, text, integer) to authenticated;
