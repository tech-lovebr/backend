-- ==============================================================================
-- LOVE — Plano Pro: de onde veio e até quando vale
--
-- Rode no SQL Editor DEPOIS do 022_liberar_campo_cadastral.sql. É idempotente.
--
-- `fornecedores.plan` só dizia "Gratuito" ou "Pro". Não dava para saber se o
-- Pro foi comprado ou dado pelo Admin, nem quando acaba. Aqui o plano ganha
-- procedência e prazo:
--
--   * bonificacao_admin — cortesia concedida no Admin, com validade;
--   * cartao            — assinatura paga, identificada pela bandeira e pelos
--                         quatro últimos dígitos (nunca o número inteiro).
--
-- Bonificação não se desfaz: a função só estende, nunca encurta nem remove.
-- O teto é seis meses somados por conta.
-- ==============================================================================

alter table fornecedores
  add column if not exists plan_origem text,
  add column if not exists plan_expira_em timestamptz,
  add column if not exists plan_bonificado_meses int not null default 0,
  add column if not exists plan_cartao_bandeira text,
  add column if not exists plan_cartao_final text;

do $$
begin
  if not exists (
    select 1 from pg_constraint
     where conrelid = 'fornecedores'::regclass
       and conname = 'fornecedores_plan_origem_check'
  ) then
    alter table fornecedores
      add constraint fornecedores_plan_origem_check
      check (plan_origem is null or plan_origem in ('bonificacao_admin', 'cartao'));
  end if;
end $$;

comment on column fornecedores.plan_origem is
  'bonificacao_admin = cortesia dada no Admin; cartao = assinatura paga. Nulo no plano gratuito.';
comment on column fornecedores.plan_expira_em is
  'Fim da vigência do Pro. Nulo em assinatura paga ativa, que se renova sozinha.';
comment on column fornecedores.plan_cartao_final is
  'Quatro últimos dígitos do cartão. O número completo nunca passa por aqui.';


-- ------------------------------------------------------------------
-- Conceder bonificação
--   Só estende: `greatest(now(), expira_em)` garante que conceder de
--   novo some ao prazo que ainda corre, em vez de reiniciá-lo — e que
--   uma bonificação vencida não some a um passado.
-- ------------------------------------------------------------------

create or replace function admin_bonificar_plano(p_id uuid, p_meses int)
returns timestamptz
language plpgsql
security definer
set search_path = public
as $$
declare
  f record;
  total int;
  novo_fim timestamptz;
begin
  if not is_admin() then
    raise exception 'Apenas administradores podem bonificar planos.';
  end if;

  if p_meses is null or p_meses < 1 or p_meses > 6 then
    raise exception 'A bonificação vai de 1 a 6 meses.';
  end if;

  select * into f from fornecedores where id = p_id;

  if not found then
    raise exception 'Fornecedor não encontrado.';
  end if;

  if f.plan_origem = 'cartao' then
    raise exception 'Esta conta tem assinatura paga. Bonificar por cima dela confundiria a cobrança.';
  end if;

  total := coalesce(f.plan_bonificado_meses, 0) + p_meses;

  if total > 6 then
    raise exception 'O limite é de 6 meses por conta. Esta já tem % concedidos.',
      coalesce(f.plan_bonificado_meses, 0);
  end if;

  novo_fim := greatest(now(), coalesce(f.plan_expira_em, now())) + (p_meses || ' months')::interval;

  update fornecedores
     set plan = 'Pro',
         plan_origem = 'bonificacao_admin',
         plan_expira_em = novo_fim,
         plan_bonificado_meses = total
   where id = p_id;

  return novo_fim;
end;
$$;

revoke all on function admin_bonificar_plano(uuid, int) from public, anon;
grant execute on function admin_bonificar_plano(uuid, int) to authenticated;
