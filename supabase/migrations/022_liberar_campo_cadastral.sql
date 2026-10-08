-- ==============================================================================
-- LOVE — Liberar um campo travado do cadastro do fornecedor
--
-- Rode no SQL Editor DEPOIS do 021_sessoes_piso.sql. É idempotente.
--
-- No B2B, nome da empresa e CNPJ/CPF travam depois de preenchidos: mudar a
-- identidade de uma conta já em uso não pode ser auto-atendimento. Para mudar,
-- o fornecedor abre um chamado.
--
-- O problema é que o travamento vivia só no navegador dele. O Admin podia
-- responder o chamado, mas não tinha como destravar nada. Aqui a liberação
-- passa a existir no banco: o Admin grava, o B2B lê ao carregar e deixa aquele
-- campo editável uma vez.
-- ==============================================================================


-- ------------------------------------------------------------------
-- 1. O chamado carrega o pedido de forma estruturada
--    Antes o campo e o valor atual só existiam dentro da frase da
--    mensagem — o Admin teria que interpretar texto para agir.
-- ------------------------------------------------------------------

alter table tickets add column if not exists extra jsonb not null default '{}';

comment on column tickets.extra is
  'Dados estruturados do chamado. Em "Alteração de dado": {campo, campo_label, valor_atual}.';


-- ------------------------------------------------------------------
-- 2. Liberações
--    Uma linha por liberação concedida. `usado_em` marca quando o
--    fornecedor efetivamente salvou — a liberação vale uma vez, senão
--    o campo ficaria destravado para sempre e o travamento perderia
--    o sentido.
-- ------------------------------------------------------------------

create table if not exists campos_liberados (
  id uuid primary key default gen_random_uuid(),
  fornecedor_id uuid not null references fornecedores(id) on delete cascade,
  campo text not null check (campo in ('company', 'documento')),
  ticket_id uuid references tickets(id) on delete set null,
  liberado_por uuid references auth.users(id) on delete set null,
  liberado_em timestamptz not null default now(),
  usado_em timestamptz
);

create index if not exists campos_liberados_pendentes_idx
  on campos_liberados (fornecedor_id, campo)
  where usado_em is null;

alter table campos_liberados enable row level security;

-- O fornecedor enxerga as próprias liberações — é assim que o B2B sabe que
-- pode destravar o campo — e marca como usada quando salva.
drop policy if exists "campos_liberados_dono_select" on campos_liberados;
create policy "campos_liberados_dono_select" on campos_liberados
  for select to authenticated using (fornecedor_id = auth.uid() or is_admin());

drop policy if exists "campos_liberados_dono_update" on campos_liberados;
create policy "campos_liberados_dono_update" on campos_liberados
  for update to authenticated using (fornecedor_id = auth.uid() or is_admin())
  with check (fornecedor_id = auth.uid() or is_admin());

-- Conceder liberação é só do admin: é ela que afrouxa o travamento.
drop policy if exists "campos_liberados_admin_insert" on campos_liberados;
create policy "campos_liberados_admin_insert" on campos_liberados
  for insert to authenticated with check (is_admin());

drop policy if exists "campos_liberados_admin_delete" on campos_liberados;
create policy "campos_liberados_admin_delete" on campos_liberados
  for delete to authenticated using (is_admin());
