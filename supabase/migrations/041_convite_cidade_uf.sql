-- ==============================================================================
-- LOVE — Cidade e Estado do endereço no convite publicado
--
-- Rode no SQL Editor DEPOIS do 040_convite_sobre.sql. É idempotente.
--
-- Personalizar evento → Informações ganhou os campos Estado (UF) e Cidade,
-- salvos em eventos.extra.eventDetails.state / city. convite_publicado passa
-- a devolvê-los para o convite mostrar o endereço completo e o Google Maps /
-- Waze acharem o lugar certo.
-- ==============================================================================

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
           'published_at', c.published_at,
           'evento', jsonb_build_object(
             'titulo', e.titulo,
             'anfitrioes', e.host_name,
             'data', coalesce(e.extra -> 'eventDetails' ->> 'date', e.data_evento::text),
             'hora', e.extra -> 'eventDetails' ->> 'time',
             'data_fim', e.extra -> 'eventDetails' ->> 'endDate',
             'hora_fim', e.extra -> 'eventDetails' ->> 'endTime',
             'local', coalesce(e.extra -> 'eventDetails' ->> 'locationName', e.extra ->> 'location'),
             'endereco', e.extra -> 'eventDetails' ->> 'address',
             'cidade', e.extra -> 'eventDetails' ->> 'city',
             'uf', e.extra -> 'eventDetails' ->> 'state',
             'referencia', e.extra -> 'eventDetails' ->> 'referencePoint',
             'dresscode', e.extra -> 'eventDetails' ->> 'dresscode',
             'informacoes', e.extra -> 'eventDetails' ->> 'generalInfo'
           ),
           'sobre', jsonb_build_object(
             'titulo', e.extra -> 'siteSections' ->> 'aboutTitle',
             'texto', e.extra -> 'siteSections' ->> 'aboutText'
           ),
           'presentes', coalesce((
             select jsonb_agg(jsonb_build_object(
                      'id', p.id,
                      'nome', p.nome,
                      'categoria', p.categoria,
                      'valor', p.valor,
                      'imagem', p.imagem_url,
                      'recebido', p.status = 'recebido'
                    ) order by p.created_at)
               from presentes p
              where p.evento_id = e.id
           ), '[]'::jsonb)
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
