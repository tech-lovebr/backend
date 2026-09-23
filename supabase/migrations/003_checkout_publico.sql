-- ==============================================================================
-- Complemento: acesso público (sem login) ao checkout de pagamento.
-- Rode DEPOIS do 002_b2b_backend.sql. Não precisa rodar o 002 de novo.
--
-- O cliente final que abre um link de pagamento (site-preview.html) não tem
-- conta/login — por isso payment_links, e a emissão de nota fiscal/crédito na
-- carteira quando ele "paga", precisam de policies liberadas para o papel
-- "anon" do Supabase, além das policies já existentes do próprio fornecedor.
--
-- Aviso: como ainda não há gateway de pagamento real, este fluxo continua
-- sendo uma simulação (o botão "Pagar agora" só marca o link como pago,
-- sem verificação de pagamento de verdade) — igual já era antes, só que
-- agora os dados ficam no banco real em vez do localStorage do navegador.
-- ==============================================================================

alter table contracts add column if not exists proxima_parcela date;

alter table contract_guests alter column comentarios type jsonb using
  case when comentarios is null or comentarios = '' then '[]'::jsonb else '[]'::jsonb end;
alter table contract_guests alter column comentarios set default '[]';
alter table contract_guests alter column comentarios set not null;

drop policy if exists "payment_links_public_select" on payment_links;
create policy "payment_links_public_select" on payment_links
  for select to anon using (true);

drop policy if exists "payment_links_public_update" on payment_links;
create policy "payment_links_public_update" on payment_links
  for update to anon using (status = 'pendente');

drop policy if exists "notas_fiscais_public_insert" on notas_fiscais;
create policy "notas_fiscais_public_insert" on notas_fiscais
  for insert to anon with check (true);

drop policy if exists "wallet_transactions_public_insert" on wallet_transactions;
create policy "wallet_transactions_public_insert" on wallet_transactions
  for insert to anon with check (type = 'credit');
