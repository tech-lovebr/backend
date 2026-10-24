-- 104 — Taxa de serviço de 10% por presente (no lugar dos R$ 8 da 103).
--
-- Presentes › Configurações: a Love cobra 10% de cada presente comprado;
-- quem paga continua em eventos.extra.taxaPresentes ("convidados", o padrão,
-- ou "anfitriao"). Com os convidados pagando, o convite mostra o preço já com
-- os 10% somados. O valor cobrado é calculado no servidor (api/presentear.js).
-- Mesma função da 103 com "taxa" = { percentual, paga_por }. Idempotente.

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
             'informacoes', e.extra -> 'eventDetails' ->> 'generalInfo',
             'musica', e.extra -> 'eventDetails' ->> 'musicUrl',
             'musica_autoplay', coalesce((e.extra -> 'eventDetails' ->> 'musicAutoplay')::boolean, true)
           ),
           'sobre', jsonb_build_object(
             'titulo', e.extra -> 'siteSections' ->> 'aboutTitle',
             'texto', e.extra -> 'siteSections' ->> 'aboutText'
           ),
           'recebimento_pronto', cadastro_recebimento_completo(e.cliente_id),
           -- Taxa de serviço da Love (% do presente) e quem paga (Presentes › Configurações).
           'taxa', jsonb_build_object('percentual', 10, 'paga_por', coalesce(nullif(e.extra ->> 'taxaPresentes', ''), 'convidados')),
           'presentes', case when cadastro_recebimento_completo(e.cliente_id) then coalesce((
             select jsonb_agg(jsonb_build_object(
                      'id', p.id,
                      'nome', p.nome,
                      'categoria', p.categoria,
                      'valor', p.valor,
                      'imagem', p.imagem_url,
                      'descricao', p.extra ->> 'description',
                      'vaquinha', coalesce((p.extra ->> 'isCrowdfunding')::boolean, false),
                      'arrecadado', coalesce(nullif(p.extra ->> 'received', '')::numeric, 0),
                      'recebido', p.status = 'recebido'
                    ) order by p.created_at)
               from presentes p
              where p.evento_id = e.id
           ), '[]'::jsonb) else '[]'::jsonb end
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
