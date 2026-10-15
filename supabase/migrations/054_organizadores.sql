-- ==============================================================================
-- LOVE — Organizadores do evento (anfitriões convidados e colaboradores)
--
-- Rode no SQL Editor DEPOIS do 053_presentear_pelo_convite.sql. É idempotente.
--
-- Em Personalizar evento → Organizadores, o criador do evento convida outras
-- pessoas por e-mail. Cada convite tem um papel:
--   anfitriao     → vê o evento todo (menos o saque, que é só do criador);
--   designer      → Aparência, Informações e Produzir convite;
--   assessoria    → Meus convidados, Mapear mesas e Checklist;
--   personalizado → só as áreas marcadas (coluna permissoes).
--
-- Quem é convidado pode ter conta de anfitrião OU de fornecedor (Hub B2B):
-- ao aceitar (love.com.br/organizador?token=...), a linha ganha o user_id e
-- a plataforma de anfitrião passa a mostrar aquele evento para essa conta,
-- só com as áreas permitidas (a trava das áreas é feita pela plataforma).
-- ==============================================================================

create table if not exists eventos_organizadores (
  id uuid primary key default gen_random_uuid(),
  evento_id uuid not null references eventos(id) on delete cascade,
  email text not null,
  nome text,
  user_id uuid references auth.users(id) on delete cascade,
  papel text not null check (papel in ('anfitriao', 'designer', 'assessoria', 'personalizado')),
  permissoes jsonb not null default '[]'::jsonb,
  status text not null default 'pendente' check (status in ('pendente', 'aceito', 'recusado', 'removido')),
  token uuid not null default gen_random_uuid(),
  convidado_por uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  aceito_em timestamptz,
  unique (evento_id, email)
);

create index if not exists eventos_organizadores_evento_idx on eventos_organizadores (evento_id);
create index if not exists eventos_organizadores_user_idx on eventos_organizadores (user_id) where user_id is not null;
create unique index if not exists eventos_organizadores_token_idx on eventos_organizadores (token);

alter table eventos_organizadores enable row level security;

-- Vê: o criador do evento, a própria pessoa convidada (pelo user_id ou pelo
-- e-mail da sessão) e o Admin.
drop policy if exists "organizadores_select" on eventos_organizadores;
create policy "organizadores_select" on eventos_organizadores
  for select to authenticated
  using (
    is_admin()
    or user_id = auth.uid()
    or lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
    or exists (select 1 from eventos e where e.id = eventos_organizadores.evento_id and e.cliente_id = auth.uid())
  );

-- Cria/edita/remove: só o criador do evento (e o Admin). Aceitar é pela função.
drop policy if exists "organizadores_dono" on eventos_organizadores;
create policy "organizadores_dono" on eventos_organizadores
  for all to authenticated
  using (
    is_admin()
    or exists (select 1 from eventos e where e.id = eventos_organizadores.evento_id and e.cliente_id = auth.uid())
  )
  with check (
    is_admin()
    or exists (select 1 from eventos e where e.id = eventos_organizadores.evento_id and e.cliente_id = auth.uid())
  );


-- ------------------------------------------------------------------
-- Convidar (criador do evento). Reenviar para o mesmo e-mail renova o
-- token e o papel, sem mexer em quem já aceitou (só o papel muda).
-- ------------------------------------------------------------------
create or replace function convidar_organizador(
  p_evento_id uuid,
  p_email text,
  p_papel text,
  p_permissoes jsonb default '[]'::jsonb,
  p_nome text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text := lower(btrim(coalesce(p_email, '')));
  v_papel text := lower(btrim(coalesce(p_papel, '')));
  v_meu_email text := lower(coalesce(auth.jwt() ->> 'email', ''));
  v_row eventos_organizadores%rowtype;
  v_conta text;
begin
  if auth.uid() is null then
    return jsonb_build_object('ok', false, 'erro', 'nao_logado');
  end if;
  if not exists (select 1 from eventos e where e.id = p_evento_id and e.cliente_id = auth.uid() and e.deleted_at is null) and not is_admin() then
    return jsonb_build_object('ok', false, 'erro', 'sem_permissao');
  end if;
  if v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    return jsonb_build_object('ok', false, 'erro', 'email_invalido');
  end if;
  if v_email = v_meu_email then
    return jsonb_build_object('ok', false, 'erro', 'proprio_email');
  end if;
  if v_papel not in ('anfitriao', 'designer', 'assessoria', 'personalizado') then
    return jsonb_build_object('ok', false, 'erro', 'papel_invalido');
  end if;

  insert into eventos_organizadores (evento_id, email, nome, papel, permissoes, convidado_por)
  values (p_evento_id, v_email, nullif(btrim(coalesce(p_nome, '')), ''), v_papel, coalesce(p_permissoes, '[]'::jsonb), auth.uid())
  on conflict (evento_id, email) do update
    set papel = excluded.papel,
        permissoes = excluded.permissoes,
        nome = coalesce(excluded.nome, eventos_organizadores.nome),
        status = case when eventos_organizadores.status = 'aceito' then 'aceito' else 'pendente' end,
        token = case when eventos_organizadores.status = 'aceito' then eventos_organizadores.token else gen_random_uuid() end,
        convidado_por = auth.uid()
  returning * into v_row;

  -- Que tipo de conta esse e-mail já tem na Love (para a tela avisar).
  select case
           when exists (select 1 from clientes c where lower(c.email) = v_email) then 'anfitriao'
           when exists (select 1 from fornecedores f where lower(f.email) = v_email) then 'fornecedor'
           else null
         end into v_conta;

  return jsonb_build_object('ok', true, 'id', v_row.id, 'token', v_row.token, 'status', v_row.status, 'conta', v_conta);
end;
$$;

revoke all on function convidar_organizador(uuid, text, text, jsonb, text) from public, anon;
grant execute on function convidar_organizador(uuid, text, text, jsonb, text) to authenticated;


-- ------------------------------------------------------------------
-- Dados do convite para a página /organizador (sem precisar estar logado).
-- ------------------------------------------------------------------
create or replace function convite_organizador(p_token uuid)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((
    select jsonb_build_object(
             'ok', true,
             'evento', e.titulo,
             'tipo', e.tipo,
             'anfitriao', coalesce(nullif(c.full_name, ''), c.couple_name, 'Anfitrião'),
             'papel', o.papel,
             'email', o.email,
             'status', o.status,
             'tem_conta', exists (select 1 from auth.users u where lower(u.email) = lower(o.email))
           )
      from eventos_organizadores o
      join eventos e on e.id = o.evento_id and e.deleted_at is null
      left join clientes c on c.id = e.cliente_id
     where o.token = p_token
     limit 1
  ), jsonb_build_object('ok', false, 'erro', 'convite_nao_encontrado'));
$$;

revoke all on function convite_organizador(uuid) from public;
grant execute on function convite_organizador(uuid) to anon, authenticated;


-- ------------------------------------------------------------------
-- Aceitar: a conta logada precisa ter o mesmo e-mail do convite.
-- ------------------------------------------------------------------
create or replace function aceitar_convite_organizador(p_token uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row eventos_organizadores%rowtype;
  v_email text := lower(coalesce(auth.jwt() ->> 'email', ''));
begin
  if auth.uid() is null then
    return jsonb_build_object('ok', false, 'erro', 'nao_logado');
  end if;
  select * into v_row from eventos_organizadores where token = p_token for update;
  if v_row.id is null then
    return jsonb_build_object('ok', false, 'erro', 'convite_nao_encontrado');
  end if;
  if v_row.status = 'removido' then
    return jsonb_build_object('ok', false, 'erro', 'convite_cancelado');
  end if;
  if lower(v_row.email) <> v_email then
    return jsonb_build_object('ok', false, 'erro', 'email_diferente', 'email', v_row.email);
  end if;
  if v_row.status = 'aceito' and v_row.user_id = auth.uid() then
    return jsonb_build_object('ok', true, 'evento_id', v_row.evento_id, 'ja_aceito', true);
  end if;

  update eventos_organizadores
     set user_id = auth.uid(), status = 'aceito', aceito_em = now()
   where id = v_row.id;

  return jsonb_build_object('ok', true, 'evento_id', v_row.evento_id);
end;
$$;

revoke all on function aceitar_convite_organizador(uuid) from public, anon;
grant execute on function aceitar_convite_organizador(uuid) to authenticated;


-- ------------------------------------------------------------------
-- Eventos em que a conta logada é organizadora (aceito): a plataforma usa
-- para montar a lista de eventos de quem não é o criador. eventos não tem
-- RLS, então a função só devolve o que a pessoa tem direito de ver.
-- ------------------------------------------------------------------
create or replace function meus_eventos_organizados()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
           'organizador_id', o.id,
           'papel', o.papel,
           'permissoes', o.permissoes,
           'evento', to_jsonb(e) || jsonb_build_object(
             'convidados', coalesce((select jsonb_agg(to_jsonb(g) order by g.created_at) from convidados g where g.evento_id = e.id), '[]'::jsonb),
             'presentes',  coalesce((select jsonb_agg(to_jsonb(p) order by p.created_at) from presentes p where p.evento_id = e.id), '[]'::jsonb)
           )
         ) order by e.created_at), '[]'::jsonb)
    from eventos_organizadores o
    join eventos e on e.id = o.evento_id and e.deleted_at is null
   where o.user_id = auth.uid()
     and o.status = 'aceito';
$$;

revoke all on function meus_eventos_organizados() from public, anon;
grant execute on function meus_eventos_organizados() to authenticated;
