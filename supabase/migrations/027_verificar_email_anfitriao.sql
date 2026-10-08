-- ==============================================================================
-- LOVE — Checar se um e-mail está cadastrado como anfitrião (tela de login)
--
-- Rode no SQL Editor DEPOIS do 004_admin.sql. É idempotente.
--
-- Pedido explícito do cliente: a tela de login da plataforma principal
-- precisa distinguir "esse e-mail não existe" de "a senha está errada" —
-- então essa checagem roda ANTES de autenticar (usuário anônimo), e a
-- policy de leitura de `clientes` (clientes_select_authenticated) só vale
-- pra quem já está logado. Daí a function SECURITY DEFINER: ignora a RLS
-- só pra responder essa pergunta booleana, chamável por "anon".
--
-- Aviso: isso é uma troca deliberada de segurança — qualquer visitante
-- pode usar essa function pra descobrir quais e-mails têm conta na
-- plataforma (enumeração de contas). O cliente optou por essa UX mesmo
-- sabendo do risco.
-- ==============================================================================

create or replace function verificar_email_anfitriao(p_email text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from clientes where lower(email) = lower(p_email));
$$;

revoke all on function verificar_email_anfitriao(text) from public;
grant execute on function verificar_email_anfitriao(text) to anon, authenticated;
