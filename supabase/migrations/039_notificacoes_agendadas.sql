-- ==============================================================================
-- LOVE — Notificações agendadas
--
-- Rode no SQL Editor DEPOIS do 032_notificacoes_fixar_tipo.sql. É idempotente.
--
-- O Admin agenda uma notificação gravando a data de envio em `created_at`.
-- Enquanto essa data está no futuro, ela é "agendada": só o admin a enxerga.
-- Quando o horário chega, a própria policy passa a liberá-la — sem cron, sem
-- função rodando de minuto em minuto, e sem mudar nada no site, que já
-- ordena por `created_at` e por isso a mostra no lugar certo da lista.
-- ==============================================================================

drop policy if exists "notificacoes_destinatario" on notificacoes;
create policy "notificacoes_destinatario" on notificacoes
  for select to authenticated using (
    is_admin()
    or (
      created_at <= now()
      and (
        destino = 'todos'
        or (destino = 'b2b' and eh_fornecedor())
        or (destino = 'anfitriao' and eh_anfitriao())
        or (destino = 'individual' and destinatario_id = auth.uid())
      )
    )
  );

comment on column notificacoes.created_at is
  'Data de envio. No futuro = agendada: só o admin vê até o horário chegar.';
