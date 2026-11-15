-- ==============================================================================
-- LOVE — Encontrar evento: aparece quem já tem convidado na lista
--
-- Rode no SQL Editor. É idempotente.
--
-- Antes (migration 121) só apareciam eventos com o Convite digital publicado.
-- Agora aparece todo evento com pelo menos um convidado cadastrado, publicado
-- ou não (que não foi apagado nem suspenso pelo Admin e tem link). A coluna
-- nova "publicado" diz se o convite já abre pelo link: sem ele, a página
-- /encontrar-evento mostra o evento sem link ("Convite ainda não publicado").
--
-- A pesquisa continua igual: ignora acentos e maiúsculas, todas as palavras
-- digitadas no título, no nome dos anfitriões ou no link; mínimo de 3 letras,
-- no máximo 50 resultados, do evento mais próximo para o mais distante.
-- ==============================================================================

-- O retorno ganhou uma coluna: precisa apagar a versão antiga antes.
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
           e.slug::text as slug,
           exists (
             select 1 from convite_digital_pages c
              where c.evento_id = e.id and c.page_key = 'convite' and c.published_state is not null
           ) as publicado
      from eventos e
     cross join consulta q
     where length(q.texto) >= 3
       and e.deleted_at is null
       and not coalesce(e.suspenso, false)
       and coalesce(e.slug, '') <> ''
       and exists (select 1 from convidados g where g.evento_id = e.id)
       and not exists (
         select 1
           from unnest(string_to_array(q.texto, ' ')) as palavra
          where palavra <> ''
            and translate(lower(coalesce(e.titulo, '') || ' ' || coalesce(e.host_name, '') || ' ' || replace(e.slug, '-', ' ')),
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

-- Faz a API do Supabase enxergar a função na hora.
notify pgrst, 'reload schema';
