-- 105 — TPV de presentes: quanto o convidado pagou de verdade.
--
-- presentes_contribuicoes.valor é o preço do presente. valor_pago é a parte
-- deste presente no total cobrado do convidado (preço + taxa de serviço
-- quando os convidados pagam a taxa) — é o que entra no TPV do Admin.
-- Gravado pela /api/presentear em cada compra.
-- Compras antigas pelo Asaas com Pix e convidados pagando (repasse = valor):
-- preço + 10% (mínimo R$ 2,00). As demais: o próprio valor.
-- Idempotente.

alter table presentes_contribuicoes add column if not exists valor_pago numeric(12,2);

update presentes_contribuicoes
   set valor_pago = case
         when gateway = 'asaas' and metodo = 'pix' and repasse = valor
           then valor + greatest(round(valor * 0.10, 2), 2.00)
         else valor
       end
 where valor_pago is null;
