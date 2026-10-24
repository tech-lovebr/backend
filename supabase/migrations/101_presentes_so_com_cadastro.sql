-- 101 — Presentes no convite publicado só com o cadastro do anfitrião completo.
--
-- Sem os dados de Suas informações (migration 099) a conta digital não pode
-- ser aberta e a compra falharia. Para não frustrar o convidado, o convite
-- publicado não mostra presentes até o anfitrião finalizar o cadastro: a
-- função manda "recebimento_pronto": false e a lista vazia, e a tela de
-- Presentes mostra o aviso (js/site-builder.js).
-- Idempotente.

-- Mesmos obrigatórios de Suas informações (js/app.js) e da abertura da
-- conta (api/_recebimento.js).
create or replace function cadastro_recebimento_completo(p_cliente_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from clientes c
     where c.id = p_cliente_id
       and nullif(btrim(c.first_name), '') is not null
       and nullif(btrim(c.last_name), '') is not null
       and length(regexp_replace(coalesce(c.cpf, ''), '\D', '', 'g')) = 11
       and length(regexp_replace(coalesce(c.phone, ''), '\D', '', 'g')) >= 10
       and c.data_nascimento is not null
       and coalesce(c.renda_mensal, 0) > 0
       and length(regexp_replace(coalesce(c.cep, ''), '\D', '', 'g')) = 8
       and nullif(btrim(c.endereco), '') is not null
       and nullif(btrim(c.endereco_numero), '') is not null
       and nullif(btrim(c.bairro), '') is not null
  );
$$;
revoke all on function cadastro_recebimento_completo(uuid) from public, anon, authenticated;

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
