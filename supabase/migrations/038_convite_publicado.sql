-- ==============================================================================
-- LOVE — Publicar o Convite Digital de verdade (love.com.br/<slug>)
--
-- Rode no SQL Editor. É idempotente.
--
-- O botão "Publicar" só gravava o convite no navegador de quem clicou
-- (localStorage) e não existia página pública lendo do banco — por isso
-- love.com.br/<slug> dava 404. Agora:
--
--   1. convite_digital_pages ganha uma cópia PUBLICADA (published_state),
--      separada do rascunho (state), que só muda quando o anfitrião publica.
--   2. convite_publicado(slug) devolve o convite publicado de um evento pelo
--      link público. É security definer: visitante sem login lê só isso, sem
--      ganhar acesso às tabelas eventos/convite_digital_pages.
-- ==============================================================================

alter table convite_digital_pages add column if not exists published_state jsonb;
alter table convite_digital_pages add column if not exists published_at timestamptz;

create or replace function convite_publicado(p_slug text, p_page_key text default 'convite')
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
           'state', c.published_state,
           'titulo', e.titulo,
           'published_at', c.published_at
         )
    from eventos e
    join convite_digital_pages c
      on c.evento_id = e.id
     and c.page_key = coalesce(p_page_key, 'convite')
   where lower(e.slug) = lower(p_slug)
     and e.deleted_at is null
     and c.published_state is not null
   limit 1;
$$;

revoke all on function convite_publicado(text, text) from public;
grant execute on function convite_publicado(text, text) to anon, authenticated;
