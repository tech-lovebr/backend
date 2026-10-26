-- ==============================================================================
-- LOVE — Evento suspenso sai do ar
--
-- Rode no SQL Editor DEPOIS do 118_evento_suspenso_pelo_admin.sql. É idempotente.
--
-- O 118 deu ao Admin o poder de suspender um evento, mas quem tira a página
-- do ar é esta função: o site público do convite é lido por
-- convite_publicado(slug), e ela não olhava a coluna `suspenso`.
--
-- Mesma função da 104 (taxa de 10%), com uma linha a mais no where:
--   and not coalesce(e.suspenso, false)
--
-- Sem linha devolvida, a plataforma mostra a mesma tela de "convite não
-- encontrado" que já existe para slug errado ou convite despublicado — não
-- é preciso inventar uma tela de "suspenso" para o visitante.
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
     and not coalesce(e.suspenso, false)
     and c.published_state is not null
   limit 1;
$$;
revoke all on function convite_publicado(text, text) from public;
grant execute on function convite_publicado(text, text) to anon, authenticated;
