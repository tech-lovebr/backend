-- 096 — Apaga os valores de teste do QA (setembro de 2026) para o
-- Dashboard mostrar só dinheiro real. São das contas de teste
-- "Fornecedor Teste QA" e "Ateliê Teste QA":
--   4 links de pagamento (R$ 1.234,56 e R$ 2.000 pagos; R$ 1.000 e R$ 750 pendentes),
--   1 nota fiscal (R$ 1.234,56) e 3 lançamentos de carteira (R$ 1.234,56, R$ 500, R$ 200).
-- As contas de teste continuam existindo; só os valores somem.
--
-- Rode no SQL Editor.

delete from notas_fiscais
where fornecedor_id in ('741bd266-94bc-43fa-8a0b-0f9e7200c17b', 'a1c81d4d-bcbc-4517-9a19-6c52256c25c4');

delete from wallet_transactions
where fornecedor_id in ('741bd266-94bc-43fa-8a0b-0f9e7200c17b', 'a1c81d4d-bcbc-4517-9a19-6c52256c25c4');

delete from payment_links
where fornecedor_id in ('741bd266-94bc-43fa-8a0b-0f9e7200c17b', 'a1c81d4d-bcbc-4517-9a19-6c52256c25c4');
