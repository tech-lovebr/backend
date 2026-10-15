-- ==============================================================================
-- LOVE — De que tipo é a conta deste e-mail? (anfitrião, fornecedor ou nenhuma)
--
-- Rode no SQL Editor. É idempotente.
--
-- Usada pelos botões "Fazer login / Continuar com o Google" ANTES de entrar:
--   'anfitriao'  → entra normalmente;
--   'fornecedor' → o e-mail já é de uma conta do Hub B2B: não entra nem cria
--                  conta de anfitrião, e a tela avisa;
--   null         → e-mail novo: o login avisa "não cadastrado"; o cadastro cria.
-- Mesma decisão de produto do 027 (verificar_email_anfitriao): o cliente
-- aceitou que isso revela se um e-mail tem conta na Love.
-- ==============================================================================

create or replace function verificar_email_cadastrado(p_email text)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select case
    when exists (select 1 from clientes where lower(email) = lower(btrim(p_email))) then 'anfitriao'
    when exists (select 1 from fornecedores where lower(email) = lower(btrim(p_email))) then 'fornecedor'
    else null
  end;
$$;

revoke all on function verificar_email_cadastrado(text) from public;
grant execute on function verificar_email_cadastrado(text) to anon, authenticated;
