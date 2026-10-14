-- ==============================================================================
-- LOVE B2B — Site publicado + se o dono é Pro, numa consulta pública
--
-- O subdomínio <slug>.love.com.br é exclusivo do plano Pro; no Gratuito o
-- site fica em hub.love.com.br/<slug>. Quem visita não está logado, e a RLS
-- de `fornecedores` não deixa o anon ler o plano (nem deve: a tabela tem
-- dados de cadastro). Esta function devolve só o necessário — o state do
-- site e um booleano "dono é Pro" — ignorando a RLS só pra essa pergunta.
--
-- Pro = plan 'Pro' e, se tiver data de expiração (bonificação do Admin),
-- ainda não vencida. Mesma regra do initAuthGuard em B2B/js/shell.js.
--
-- Rode este arquivo inteiro no SQL Editor do Supabase. É idempotente.
-- ==============================================================================

create or replace function site_publicado(p_slug text)
returns table (state jsonb, dono_pro boolean)
language sql
stable
security definer
set search_path = public
as $$
  select
    sp.state,
    (f.plan = 'Pro' and (f.plan_expira_em is null or f.plan_expira_em > now())) as dono_pro
  from site_pages sp
  join fornecedores f on f.id = sp.fornecedor_id
  where sp.slug = p_slug;
$$;

revoke all on function site_publicado(text) from public;
grant execute on function site_publicado(text) to anon, authenticated;
