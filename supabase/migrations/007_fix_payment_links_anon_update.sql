-- ==============================================================================
-- Corrige um bug real na policy de pagamento público (003_checkout_publico.sql):
-- "for update to anon using (status = 'pendente')" sem um WITH CHECK explícito
-- faz o Postgres reusar a mesma condição também como WITH CHECK — ou seja, a
-- LINHA NOVA também precisava continuar com status = 'pendente'. Resultado:
-- nenhum cliente sem login conseguia de fato marcar um link como pago (o
-- update sempre falhava com "new row violates row-level security policy").
-- Rode este arquivo no SQL Editor do Supabase.
-- ==============================================================================

drop policy if exists "payment_links_public_update" on payment_links;
create policy "payment_links_public_update" on payment_links
  for update to anon
  using (status = 'pendente')
  with check (true);
