-- 099 — Financeiro do Admin: de onde veio o dinheiro e quanto ficou com a Love.
--
-- Cada pagamento processado (presente pago pelo convidado ou link de
-- pagamento pago no Hub) guarda:
--   gateway        quem processou (ex.: 'asaas');
--   metodo         pix, cartão... (presentes já tinham);
--   comissao_love  o que ficou com a Love (comissão de intermediação);
--   repasse        o split que caiu para o anfitrião ou o fornecedor.
-- O webhook do gateway preenche ao confirmar o pagamento. Enquanto vier
-- vazio, o Admin calcula a comissão pela taxa padrão (3,89%).
--
-- Rode no SQL Editor. Idempotente.

alter table presentes_contribuicoes add column if not exists gateway text;
alter table presentes_contribuicoes add column if not exists comissao_love numeric(12,2);
alter table presentes_contribuicoes add column if not exists repasse numeric(12,2);

alter table payment_links add column if not exists gateway text;
alter table payment_links add column if not exists metodo text;
alter table payment_links add column if not exists comissao_love numeric(12,2);
alter table payment_links add column if not exists repasse numeric(12,2);
