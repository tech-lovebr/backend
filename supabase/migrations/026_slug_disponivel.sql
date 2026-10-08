-- ==============================================================================
-- LOVE — Checar disponibilidade de link personalizado (slug) de evento
--
-- Rode no SQL Editor DEPOIS do 004_admin.sql. É idempotente.
--
-- `eventos.slug` é único no banco inteiro (vira love.com.br/<slug>), mas a
-- RLS só deixa cada anfitrião ver os próprios eventos — então o app não
-- consegue, pelo cliente normal, checar se um slug já está em uso por outra
-- pessoa. Esta function ignora a RLS só pra responder essa única pergunta
-- booleana (não devolve nenhum dado de quem é o dono do slug).
-- ==============================================================================

create or replace function verificar_slug_disponivel(p_slug text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select not exists (select 1 from eventos where slug = p_slug);
$$;

revoke all on function verificar_slug_disponivel(text) from public, anon;
grant execute on function verificar_slug_disponivel(text) to authenticated;
