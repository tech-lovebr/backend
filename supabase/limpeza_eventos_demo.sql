-- ==============================================================================
-- LOVE — Remove os eventos de demonstração semeados em contas reais
--
-- NÃO é migration: é uma limpeza pontual e DESTRUTIVA. Rode no SQL Editor do
-- Supabase, um passo de cada vez, lendo o resultado antes de ir para o próximo.
--
-- Até agora a plataforma principal gravava dois eventos de demonstração em
-- toda conta nova que entrasse sem nenhum evento (seedDemoEventsIfEmpty, em
-- js/app.js). Eram linhas reais no banco, com convidados e presentes — por
-- isso o Admin mostrava "2 eventos" para quem nunca criou nenhum. A semeadura
-- já saiu do código; isto apaga o que ela deixou para trás.
--
-- A identificação é precisa: a semeadura gerava o slug como
-- "<slug-do-modelo>-<8 primeiros caracteres do id do cliente>", então os
-- padrões abaixo não alcançam nenhum evento criado de verdade por alguém,
-- cujo slug a pessoa mesma escolheu.
-- ==============================================================================


-- ------------------------------------------------------------------ PASSO 1
-- O que seria apagado, e de quem. Nada é apagado aqui.

select e.id,
       e.titulo,
       e.slug,
       coalesce(c.couple_name, u.email) as dono,
       e.created_at,
       (select count(*) from convidados g where g.evento_id = e.id) as convidados,
       (select count(*) from presentes  p where p.evento_id = e.id) as presentes
  from eventos e
  left join clientes   c on c.id = e.cliente_id
  left join auth.users u on u.id = e.cliente_id
 where e.slug like 'beatriz-e-lucas-%'
    or e.slug like 'cha-do-theo-%'
 order by e.created_at desc;


-- ------------------------------------------------------------------ PASSO 2
-- Apaga. Convidados, presentes e o convite digital saem por cascade.
-- Só rode depois de o PASSO 1 ter mostrado exatamente o que você espera.

-- delete from eventos
--  where slug like 'beatriz-e-lucas-%'
--     or slug like 'cha-do-theo-%';


-- ------------------------------------------------------------------ PASSO 3
-- Confere. O esperado é zero na primeira coluna.

-- select (select count(*) from eventos
--          where slug like 'beatriz-e-lucas-%' or slug like 'cha-do-theo-%') as demos_restantes,
--        (select count(*) from eventos)     as eventos_totais,
--        (select count(*) from convidados)  as convidados,
--        (select count(*) from presentes)   as presentes;
