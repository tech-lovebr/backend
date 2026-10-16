-- ==============================================================================
-- LOVE — Serviço/produto suspenso pelo Admin
--
-- Rode no SQL Editor DEPOIS do 058_mensagem_editada_uma_vez.sql. É idempotente.
--
-- Em Admin › HUB/B2B › Serviços/Produtos, o Admin pode "Suspender" um serviço
-- (ou vários de uma vez). Suspenso ≠ inativo: inativo é o próprio fornecedor
-- que desliga; suspenso é o Admin, e o fornecedor não consegue reativar.
--
-- Efeitos:
--   - some do Explorar da plataforma do anfitrião (policy da vitrine);
--   - no Hub o fornecedor vê o serviço marcado como "Suspenso" (a tela do
--     Hub lê a coluna; ver prompt da sessão do Hub);
--   - só o Admin muda a coluna (o fornecedor não consegue tirar a suspensão).
-- ==============================================================================

alter table products add column if not exists suspenso boolean not null default false;
alter table products add column if not exists suspenso_em timestamptz;
alter table products add column if not exists suspenso_motivo text;

create index if not exists products_suspenso_idx on products (fornecedor_id) where suspenso;

-- Vitrine do anfitrião: só serviços ativos, de fornecedor não bloqueado e
-- não suspensos pelo Admin.
drop policy if exists "products_select_vitrine" on products;
create policy "products_select_vitrine" on products
  for select to authenticated
  using (
    active = true
    and not suspenso
    and exists (
      select 1 from fornecedores f
       where f.id = products.fornecedor_id
         and f.status <> 'bloqueado'
    )
  );

-- O dono do serviço continua lendo/editando o próprio serviço (policy de
-- dono do 002), mas não pode mexer na suspensão: o gatilho desfaz qualquer
-- mudança nessas colunas feita por quem não é Admin.
create or replace function proteger_suspensao_de_servico()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if (new.suspenso is distinct from old.suspenso
      or new.suspenso_em is distinct from old.suspenso_em
      or new.suspenso_motivo is distinct from old.suspenso_motivo)
     and not is_admin() then
    new.suspenso := old.suspenso;
    new.suspenso_em := old.suspenso_em;
    new.suspenso_motivo := old.suspenso_motivo;
  end if;
  return new;
end;
$$;

drop trigger if exists products_proteger_suspensao on products;
create trigger products_proteger_suspensao before update on products
  for each row execute function proteger_suspensao_de_servico();

-- Suspender / reativar vários de uma vez (Admin).
create or replace function admin_suspender_servicos(p_ids uuid[], p_suspender boolean, p_motivo text default null)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_qtd integer;
begin
  if not is_admin() then
    raise exception 'Apenas administradores podem suspender serviços.';
  end if;
  update products
     set suspenso = p_suspender,
         suspenso_em = case when p_suspender then now() else null end,
         suspenso_motivo = case when p_suspender then nullif(btrim(coalesce(p_motivo, '')), '') else null end
   where id = any(p_ids);
  get diagnostics v_qtd = row_count;
  return v_qtd;
end;
$$;

revoke all on function admin_suspender_servicos(uuid[], boolean, text) from public, anon;
grant execute on function admin_suspender_servicos(uuid[], boolean, text) to authenticated;
