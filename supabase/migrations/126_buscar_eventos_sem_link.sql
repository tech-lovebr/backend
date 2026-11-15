-- ==============================================================================
-- LOVE — Encontrar evento: evento sem link também aparece
--
-- Rode no SQL Editor. É idempotente.
--
-- A 125 lista eventos com pelo menos um convidado, mas ainda exigia o link
-- (eventos.slug), que só é gravado ao publicar o convite — então os eventos
-- não publicados ficavam de fora. Agora o link não é mais exigido: evento sem
-- convite publicado aparece sem link ("Convite ainda não publicado") e
-- "publicado" só é verdadeiro quando há convite publicado E link.
-- ==============================================================================

drop function if exists buscar_eventos(text);

create function buscar_eventos(p_texto text)
returns table (titulo text, anfitrioes text, data text, cidade text, uf text, slug text, publicado boolean)
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
    select e.titulo::text as titulo,
           e.host_name::text as anfitrioes,
           coalesce(e.extra -> 'eventDetails' ->> 'date', e.data_evento::text) as data,
           e.extra -> 'eventDetails' ->> 'city' as cidade,
           e.extra -> 'eventDetails' ->> 'state' as uf,
           nullif(e.slug::text, '') as slug,
           (coalesce(e.slug, '') <> '' and exists (
             select 1 from convite_digital_pages c
              where c.evento_id = e.id and c.page_key = 'convite' and c.published_state is not null
           )) as publicado
      from eventos e
     cross join consulta q
     where length(q.texto) >= 3
       and e.deleted_at is null
       and not coalesce(e.suspenso, false)
       and exists (select 1 from convidados g where g.evento_id = e.id)
       and not exists (
         select 1
           from unnest(string_to_array(q.texto, ' ')) as palavra
          where palavra <> ''
            and translate(lower(coalesce(e.titulo, '') || ' ' || coalesce(e.host_name, '') || ' ' || replace(coalesce(e.slug, ''), '-', ' ')),
                          'áàâãäéèêëíìîïóòôõöúùûüç',
                          'aaaaaeeeeiiiiooooouuuuc') not like '%' || palavra || '%'
       )
  )
  select *
    from achados
   order by abs(coalesce(case when achados.data ~ '^\d{4}-\d{2}-\d{2}' then left(achados.data, 10)::date end, current_date + 36500) - current_date),
            achados.titulo
   limit 50;
$$;
revoke all on function buscar_eventos(text) from public;
grant execute on function buscar_eventos(text) to anon, authenticated;

notify pgrst, 'reload schema';

-- Conferência (opcional): eventos com "victor" no nome e quantos convidados têm.
-- select e.titulo, e.host_name, e.slug, e.deleted_at, e.suspenso,
--        (select count(*) from convidados g where g.evento_id = e.id) as convidados
--   from eventos e
--  where translate(lower(coalesce(e.titulo,'') || ' ' || coalesce(e.host_name,'')), 'áàâãäéèêëíìîïóòôõöúùûüç', 'aaaaaeeeeiiiiooooouuuuc') like '%victor%';
