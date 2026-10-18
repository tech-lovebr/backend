-- ==============================================================================
-- 069: URL do site (Hub › Editor de site › Ajustes)
--
-- Gratuito: endereço padrão hub.love.com.br/site/<nome-da-empresa>, que
--   acompanha o nome da empresa (sem limite aqui; o nome já tem o limite de
--   7 dias da 065).
-- Pro: subdomínio <nome>.love.com.br. A primeira URL (sugestão confirmada ou
--   publicada) e cada troca contam; a próxima troca só 14 dias depois. O
--   trigger garante a regra no banco (o Admin não tem limite).
--
-- Rode DEPOIS da 066. É idempotente.
-- ==============================================================================

alter table public.fornecedores add column if not exists site_slug_alterado_em timestamptz;

comment on column public.fornecedores.site_slug_alterado_em is
  'Última definição/troca da URL do site no plano Pro (regra: 1 a cada 14 dias).';

create or replace function public.site_pages_regra_url()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_pro boolean;
  v_ultima timestamptz;
begin
  if tg_op = 'UPDATE' and new.slug is not distinct from old.slug then
    return new;
  end if;
  -- Publicar faz upsert: o "insert" de quem já tem site vira update (e a
  -- troca de URL, se houver, é tratada no update).
  if tg_op = 'INSERT' and exists (select 1 from site_pages s where s.fornecedor_id = new.fornecedor_id) then
    return new;
  end if;
  -- Admin e processos do servidor (sem usuário logado) não têm limite.
  if auth.uid() is null or is_admin() then
    return new;
  end if;

  -- O plano é do login dono da empresa.
  select (d.plan = 'Pro' and (d.plan_expira_em is null or d.plan_expira_em > now())), f.site_slug_alterado_em
    into v_pro, v_ultima
    from fornecedores f
    join fornecedores d on d.id = coalesce(f.dono_id, f.id)
   where f.id = new.fornecedor_id;

  if coalesce(v_pro, false) then
    if tg_op = 'UPDATE' and v_ultima is not null and v_ultima > now() - interval '14 days' then
      raise exception 'ALTERACAO_BLOQUEADA: a URL do site só pode ser alterada a cada 14 dias';
    end if;
    update fornecedores set site_slug_alterado_em = now() where id = new.fornecedor_id;
  end if;

  return new;
end;
$$;

drop trigger if exists site_pages_regra_url on public.site_pages;
create trigger site_pages_regra_url
  before insert or update on public.site_pages
  for each row execute function public.site_pages_regra_url();
