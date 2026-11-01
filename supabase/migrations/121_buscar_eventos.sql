-- ==============================================================================
-- LOVE — Encontrar evento (página /encontrar-evento)
--
-- Rode no SQL Editor. É idempotente.
--
-- O convidado pesquisa pelo nome dos anfitriões ou do evento e a página lista
-- os eventos com o link do convite (love.com.br/<slug>). Só aparecem eventos
-- com o Convite digital publicado, que não foram apagados nem suspensos pelo
-- Admin — os mesmos que já abrem pelo link (convite_publicado).
--
-- A pesquisa ignora acentos e maiúsculas e exige que todas as palavras
-- digitadas apareçam no título, no nome dos anfitriões ou no link.
-- Mínimo de 3 letras e no máximo 50 resultados, do evento mais próximo para
-- o mais distante.
-- ==============================================================================

create or replace function buscar_eventos(p_texto text)
returns table (titulo text, anfitrioes text, data text, cidade text, uf text, slug text)
language sql
stable
security definer
set search_path = public
as $$
  with consulta as (
    select translate(lower(trim(coalesce(p_texto, ''))),
                     'áàâãäéèêëíìîïóòôõöúùûüç',
                     'aaaaaeeeeiiiiooooouuuuc') as texto
  ),
  achados as (
    select distinct on (e.id)
           e.titulo::text as titulo,
           e.host_name::text as anfitrioes,
           coalesce(e.extra -> 'eventDetails' ->> 'date', e.data_evento::text) as data,
           e.extra -> 'eventDetails' ->> 'city' as cidade,
           e.extra -> 'eventDetails' ->> 'state' as uf,
           e.slug::text as slug
      from eventos e
      join convite_digital_pages c
        on c.evento_id = e.id
       and c.page_key = 'convite'
       and c.published_state is not null
     cross join consulta q
     where length(q.texto) >= 3
       and e.deleted_at is null
       and not coalesce(e.suspenso, false)
       and coalesce(e.slug, '') <> ''
       and not exists (
         select 1
           from unnest(string_to_array(q.texto, ' ')) as palavra
          where palavra <> ''
            and translate(lower(coalesce(e.titulo, '') || ' ' || coalesce(e.host_name, '') || ' ' || replace(e.slug, '-', ' ')),
                          'áàâãäéèêëíìîïóòôõöúùûüç',
                          'aaaaaeeeeiiiiooooouuuuc') not like '%' || palavra || '%'
       )
     order by e.id
  )
  select *
    from achados
   order by abs(coalesce(case when achados.data ~ '^\d{4}-\d{2}-\d{2}' then left(achados.data, 10)::date end, current_date + 36500) - current_date),
            achados.titulo
   limit 50;
$$;
revoke all on function buscar_eventos(text) from public;
grant execute on function buscar_eventos(text) to anon, authenticated;
