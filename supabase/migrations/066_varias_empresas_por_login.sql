-- ==============================================================================
-- 066: Várias empresas no mesmo login (Hub B2B › perfil › "Adicionar empresa")
--
-- Antes: cada login era uma empresa (fornecedores.id = auth.uid()) e todas as
-- regras de acesso comparavam fornecedor_id com auth.uid().
-- Agora: a empresa "principal" continua sendo a do login (id = auth.uid()) e o
-- login pode ter outras empresas (fornecedores com id próprio e dono_id = o
-- login). Cada empresa tem os seus dados (serviços, leads, chat, orçamentos,
-- site, agenda…), separados pelo fornecedor_id de sempre.
--
-- Limite pelo plano do login (o da empresa principal): Gratuito = 1 empresa,
-- Pro = até 3.
--
-- Rode DEPOIS da 065. É idempotente.
-- ==============================================================================


-- ------------------------------------------------------------------
-- 1. Dono da empresa
-- ------------------------------------------------------------------

alter table public.fornecedores add column if not exists dono_id uuid references auth.users(id) on delete cascade;
update public.fornecedores set dono_id = id where dono_id is null;
create index if not exists fornecedores_dono_idx on public.fornecedores (dono_id);

comment on column public.fornecedores.dono_id is
  'Login dono da empresa. Na empresa principal, dono_id = id (= auth.users.id).';

-- A empresa deixa de precisar ser um usuário do Auth: as empresas extras têm
-- id próprio. (A principal continua com id = auth.uid().)
do $$
declare c record;
begin
  for c in
    select con.conname
      from pg_constraint con
     where con.conrelid = 'public.fornecedores'::regclass
       and con.contype = 'f'
       and con.confrelid = 'auth.users'::regclass
       and pg_get_constraintdef(con.oid) ilike 'FOREIGN KEY (id)%'
  loop
    execute format('alter table public.fornecedores drop constraint %I', c.conname);
  end loop;
end $$;

alter table public.fornecedores alter column id set default gen_random_uuid();

-- Linha nova sem dono: é a principal (cadastro normal, id = login).
create or replace function public.fornecedores_definir_dono()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.dono_id is null then
    new.dono_id := new.id;
  end if;
  return new;
end;
$$;

drop trigger if exists fornecedores_definir_dono on public.fornecedores;
create trigger fornecedores_definir_dono
  before insert on public.fornecedores
  for each row execute function public.fornecedores_definir_dono();


-- ------------------------------------------------------------------
-- 2. "É uma empresa minha?" — usada por todas as regras de acesso
-- ------------------------------------------------------------------

create or replace function public.e_minha_empresa(p_fornecedor_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select auth.uid() is not null and (
    p_fornecedor_id = auth.uid()
    or exists (select 1 from fornecedores f where f.id = p_fornecedor_id and f.dono_id = auth.uid())
  );
$$;

revoke all on function public.e_minha_empresa(uuid) from public, anon;
grant execute on function public.e_minha_empresa(uuid) to authenticated;

-- Quantas empresas o login ainda pode criar (Gratuito: 1; Pro: até 3).
create or replace function public.limite_de_empresas()
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select case
    when f.plan = 'Pro' and (f.plan_expira_em is null or f.plan_expira_em > now()) then 3
    else 1
  end
  from fornecedores f
  where f.id = auth.uid();
$$;

revoke all on function public.limite_de_empresas() from public, anon;
grant execute on function public.limite_de_empresas() to authenticated;


-- ------------------------------------------------------------------
-- 3. Regras de acesso: "fornecedor_id = auth.uid()" vira
--    "e_minha_empresa(fornecedor_id)" em todas as tabelas do schema public.
-- ------------------------------------------------------------------

do $$
declare
  p record;
  novo_using text;
  novo_check text;
  troca text;
begin
  for p in
    select schemaname, tablename, policyname, qual, with_check
      from pg_policies
     where schemaname = 'public'
       and (coalesce(qual, '') ~ 'auth\.uid\(\)' or coalesce(with_check, '') ~ 'auth\.uid\(\)')
  loop
    novo_using := p.qual;
    novo_check := p.with_check;

    -- (auth.uid() = x.fornecedor_id) / (x.fornecedor_id = auth.uid())
    novo_using := regexp_replace(novo_using, '\(auth\.uid\(\) = ((\w+\.)?fornecedor_id)\)', '(e_minha_empresa(\1))', 'g');
    novo_using := regexp_replace(novo_using, '\(((\w+\.)?fornecedor_id) = auth\.uid\(\)\)', '(e_minha_empresa(\1))', 'g');
    novo_check := regexp_replace(novo_check, '\(auth\.uid\(\) = ((\w+\.)?fornecedor_id)\)', '(e_minha_empresa(\1))', 'g');
    novo_check := regexp_replace(novo_check, '\(((\w+\.)?fornecedor_id) = auth\.uid\(\)\)', '(e_minha_empresa(\1))', 'g');

    -- Na própria tabela fornecedores: (auth.uid() = id) / (id = auth.uid())
    if p.tablename = 'fornecedores' and p.policyname <> 'fornecedores_insert_own' then
      novo_using := regexp_replace(novo_using, '\(auth\.uid\(\) = id\)', '(e_minha_empresa(id))', 'g');
      novo_using := regexp_replace(novo_using, '\(id = auth\.uid\(\)\)', '(e_minha_empresa(id))', 'g');
      novo_check := regexp_replace(novo_check, '\(auth\.uid\(\) = id\)', '(e_minha_empresa(id))', 'g');
      novo_check := regexp_replace(novo_check, '\(id = auth\.uid\(\)\)', '(e_minha_empresa(id))', 'g');
    end if;

    if novo_using is distinct from p.qual or novo_check is distinct from p.with_check then
      troca := format('alter policy %I on %I.%I', p.policyname, p.schemaname, p.tablename);
      if novo_using is not null then troca := troca || format(' using (%s)', novo_using); end if;
      if novo_check is not null then troca := troca || format(' with check (%s)', novo_check); end if;
      execute troca;
      raise notice 'Regra atualizada: %.%', p.tablename, p.policyname;
    end if;
  end loop;
end $$;

-- Criar empresa: a principal (id = login, no cadastro) ou uma extra do
-- próprio login, dentro do limite do plano.
drop policy if exists "fornecedores_insert_own" on public.fornecedores;
create policy "fornecedores_insert_own" on public.fornecedores
  for insert to authenticated with check (
    auth.uid() = id
    or (
      dono_id = auth.uid()
      and (select count(*) from public.fornecedores f where f.dono_id = auth.uid()) < public.limite_de_empresas()
    )
  );


-- ------------------------------------------------------------------
-- 4. Funções que tratavam o login como a empresa
-- ------------------------------------------------------------------

create or replace function public.marcar_conversa_lida(p_conversation_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_qtd integer;
begin
  if auth.uid() is null then
    return 0;
  end if;

  -- Só quem participa da conversa (uma empresa do login ou o cliente).
  if not exists (
    select 1 from conversations c
     where c.id = p_conversation_id
       and (e_minha_empresa(c.fornecedor_id) or c.cliente_id = auth.uid())
  ) then
    return 0;
  end if;

  update messages
     set read_at = now()
   where conversation_id = p_conversation_id
     and sender_id <> auth.uid()
     and read_at is null;

  get diagnostics v_qtd = row_count;
  return v_qtd;
end;
$$;

create or replace function public.registrar_visita_site(p_slug text, p_sessao text, p_referrer text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_fornecedor uuid;
begin
  if p_slug is null or p_sessao is null or length(p_sessao) < 8 or length(p_sessao) > 64 then
    return;
  end if;

  select sp.fornecedor_id into v_fornecedor
  from site_pages sp
  where sp.slug = lower(p_slug)
  limit 1;

  -- Site inexistente ou o próprio dono olhando o site: não conta.
  if v_fornecedor is null or e_minha_empresa(v_fornecedor) then
    return;
  end if;

  insert into site_visitas (fornecedor_id, sessao, referrer)
  values (v_fornecedor, p_sessao, left(p_referrer, 500))
  on conflict (fornecedor_id, sessao) do nothing;
end;
$$;
