-- ==============================================================================
-- LOVE — Bonificação contada em dias
--
-- Rode no SQL Editor DEPOIS do 023_plano_bonificado.sql. É idempotente.
--
-- A 023 concedia de 1 a 6 meses. Na prática a cortesia é dada em blocos de
-- 30 dias, até 90 — então a unidade passa a ser o dia, que é o que o Admin
-- escolhe na tela. "Mês" também é ambíguo para prazo (28 a 31 dias); dia não é.
-- ==============================================================================

alter table fornecedores
  add column if not exists plan_bonificado_dias int not null default 0;

-- Converte o que já tiver sido concedido em meses.
update fornecedores
   set plan_bonificado_dias = coalesce(plan_bonificado_meses, 0) * 30
 where plan_bonificado_dias = 0
   and coalesce(plan_bonificado_meses, 0) > 0;

comment on column fornecedores.plan_bonificado_dias is
  'Total de dias de Pro de cortesia já concedidos. Teto de 90 por conta.';


-- A assinatura muda de p_meses para p_dias: as duas seriam (uuid, int) e o
-- PostgREST escolhe pelo nome do parâmetro, então a antiga precisa sair.
drop function if exists admin_bonificar_plano(uuid, int);

create or replace function admin_bonificar_plano(p_id uuid, p_dias int)
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

  if p_dias is null or p_dias not in (30, 60, 90) then
    raise exception 'A bonificação é de 30, 60 ou 90 dias.';
  end if;

  select * into f from fornecedores where id = p_id;

  if not found then
    raise exception 'Fornecedor não encontrado.';
  end if;

  if f.plan_origem = 'cartao' then
    raise exception 'Esta conta tem assinatura paga. Bonificar por cima dela confundiria a cobrança.';
  end if;

  total := coalesce(f.plan_bonificado_dias, 0) + p_dias;

  if total > 90 then
    raise exception 'O limite é de 90 dias por conta. Esta já tem % concedidos.',
      coalesce(f.plan_bonificado_dias, 0);
  end if;

  -- Só estende: somar ao prazo que ainda corre, nunca reiniciá-lo, e nunca
  -- partir de um vencimento que já passou.
  novo_fim := greatest(now(), coalesce(f.plan_expira_em, now())) + (p_dias || ' days')::interval;

  update fornecedores
     set plan = 'Pro',
         plan_origem = 'bonificacao_admin',
         plan_expira_em = novo_fim,
         plan_bonificado_dias = total
   where id = p_id;

  return novo_fim;
end;
$$;

revoke all on function admin_bonificar_plano(uuid, int) from public, anon;
grant execute on function admin_bonificar_plano(uuid, int) to authenticated;
