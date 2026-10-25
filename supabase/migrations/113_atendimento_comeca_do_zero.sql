-- 113 — Atendimento começa do zero.
--
-- Apaga (sem volta):
--   • os pedidos de "Alteração de dados" do Hub — a regra antiga de liberar
--     nome da empresa/CNPJ pelo suporte não existe mais (no Hub a pessoa
--     altera direto, dentro do prazo);
--   • todas as conversas resolvidas ou fechadas.
-- As mensagens dessas conversas saem junto (ticket_messages, on delete cascade).
-- Conversas abertas, em andamento ou aguardando a pessoa continuam.

-- Quantas vão sair (confira antes, se quiser):
-- select status, assunto, count(*) from tickets
--  where lower(trim(assunto)) in ('alteração de dados', 'alteração de dado')
--     or status in ('resolvido', 'fechado')
--  group by 1, 2;

delete from tickets
 where lower(trim(assunto)) in ('alteração de dados', 'alteração de dado')
    or status in ('resolvido', 'fechado');
