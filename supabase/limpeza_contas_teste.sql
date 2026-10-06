-- ==============================================================================
-- LOVE — Limpeza das contas de teste
--
-- NÃO é migration: é uma operação pontual e DESTRUTIVA. Rode no SQL Editor do
-- Supabase, um passo de cada vez, lendo o resultado antes de ir para o próximo.
--
-- Como tudo pendura em auth.users com `on delete cascade`, apagar a conta leva
-- junto eventos, convidados, presentes, contratos, carteira, leads, produtos e
-- conversas daquela pessoa. É por isso que o "Volume B2B" zera: ele é a soma
-- das entradas em wallet_transactions, que somem com os fornecedores de teste.
-- ==============================================================================


-- ------------------------------------------------------------------ PASSO 1
-- Veja o que existe hoje. Decida, olhando esta lista, o que é teste.
-- Nada é apagado aqui.

select u.email,
       coalesce(f.company_name, c.couple_name, u.raw_user_meta_data->>'name') as nome,
       case when a.id is not null then 'ADMIN'
            when f.id is not null then 'fornecedor (B2B)'
            when c.id is not null then 'anfitrião'
            else 'sem origem' end                                            as tipo,
       u.created_at,
       u.last_sign_in_at,
       u.id
  from auth.users u
  left join fornecedores f on f.id = u.id
  left join clientes     c on c.id = u.id
  left join admins       a on a.id = u.id
 order by u.created_at desc;


-- ------------------------------------------------------------------ PASSO 2
-- Prévia do estrago: quem SERIA apagado. Edite a lista `manter` com os e-mails
-- que ficam (o seu de admin já está protegido à parte) e rode. Continua sem
-- apagar nada — é só para conferir a lista antes.

with manter(email) as (
  values
    ('maranhao4@gmail.com')
    -- , ('email.da.vanessa@exemplo.com')   -- acrescente aqui o que for real
)
select u.email,
       coalesce(f.company_name, c.couple_name) as nome,
       u.created_at
  from auth.users u
  left join fornecedores f on f.id = u.id
  left join clientes     c on c.id = u.id
 where u.email not in (select email from manter)
   and u.id not in (select id from admins)      -- admin nunca entra na conta
 order by u.created_at desc;


-- ------------------------------------------------------------------ PASSO 3
-- Apaga de verdade. Só rode depois de o PASSO 2 ter mostrado exatamente as
-- contas que você quer fora. Use a MESMA lista `manter` do passo anterior.
-- Não tem desfazer.

-- with manter(email) as (
--   values
--     ('maranhao4@gmail.com')
--     -- , ('email.da.vanessa@exemplo.com')
-- )
-- delete from auth.users u
--  where u.email not in (select email from manter)
--    and u.id not in (select id from admins);


-- ------------------------------------------------------------------ PASSO 4
-- Confere o que sobrou e se ainda há movimento financeiro de teste solto.
-- O esperado é zero em tudo que for de conta apagada.

-- select (select count(*) from auth.users)          as contas,
--        (select count(*) from fornecedores)        as fornecedores,
--        (select count(*) from clientes)            as anfitrioes,
--        (select count(*) from eventos)             as eventos,
--        (select coalesce(sum(amount), 0)
--           from wallet_transactions
--          where type = 'credit')                   as volume_b2b,
--        (select coalesce(sum(valor_total), 0)
--           from contracts)                         as faturamento_bruto;
