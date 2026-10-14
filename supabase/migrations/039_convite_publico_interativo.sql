-- ==============================================================================
-- LOVE — Botões do convite publicado (love.com.br/<slug>)
--
-- Rode no SQL Editor DEPOIS do 038_convite_publicado.sql. É idempotente.
--
-- Os botões do convite (Localização, Lista de Presentes, Confirmar presença,
-- Dress code) precisam de dados que só o anfitrião logado lia. Tudo continua
-- por funções security definer — o visitante não ganha acesso às tabelas:
--
--   1. convite_publicado(slug) passa a devolver também as informações
--      públicas do evento (data, horário, local, endereço, dress code…) e a
--      lista de presentes (nome, valor, imagem e se já foi recebido).
--   2. confirmar_presenca(slug, nome, email, telefone): se o nome já está na
--      lista de convidados do evento, marca como confirmado; se não está,
--      adiciona já confirmado (origem "site").
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
             'referencia', e.extra -> 'eventDetails' ->> 'referencePoint',
             'dresscode', e.extra -> 'eventDetails' ->> 'dresscode',
             'informacoes', e.extra -> 'eventDetails' ->> 'generalInfo'
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


create or replace function confirmar_presenca(
  p_slug text,
  p_nome text,
  p_email text default null,
  p_telefone text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_evento eventos%rowtype;
  v_nome text := regexp_replace(btrim(coalesce(p_nome, '')), '\s+', ' ', 'g');
  v_email text := nullif(btrim(coalesce(p_email, '')), '');
  v_telefone text := nullif(btrim(coalesce(p_telefone, '')), '');
  v_convidado_id uuid;
begin
  if length(v_nome) < 2 or length(v_nome) > 120 then
    return jsonb_build_object('ok', false, 'erro', 'nome_invalido');
  end if;
  if v_email is not null and length(v_email) > 200 then v_email := null; end if;
  if v_telefone is not null and length(v_telefone) > 40 then v_telefone := null; end if;

  -- Só eventos com convite publicado aceitam confirmação pelo site.
  select e.* into v_evento
    from eventos e
   where lower(e.slug) = lower(p_slug)
     and e.deleted_at is null
     and exists (
       select 1 from convite_digital_pages c
        where c.evento_id = e.id and c.published_state is not null
     )
   limit 1;

  if v_evento.id is null then
    return jsonb_build_object('ok', false, 'erro', 'convite_nao_encontrado');
  end if;

  -- Já está na lista (mesmo nome, ignorando maiúsculas/espaços): confirma.
  select id into v_convidado_id
    from convidados
   where evento_id = v_evento.id
     and lower(regexp_replace(btrim(nome), '\s+', ' ', 'g')) = lower(v_nome)
   order by created_at
   limit 1;

  if v_convidado_id is not null then
    update convidados
       set status = 'confirmado',
           email = coalesce(email, v_email),
           telefone = coalesce(telefone, v_telefone)
     where id = v_convidado_id;
    return jsonb_build_object('ok', true, 'novo', false);
  end if;

  insert into convidados (evento_id, cliente_id, nome, email, telefone, status, extra)
  values (
    v_evento.id, v_evento.cliente_id, v_nome, v_email, v_telefone, 'confirmado',
    jsonb_build_object('adults', 1, 'children', 0, 'origem', 'site')
  );
  return jsonb_build_object('ok', true, 'novo', true);
end;
$$;

revoke all on function confirmar_presenca(text, text, text, text) from public;
grant execute on function confirmar_presenca(text, text, text, text) to anon, authenticated;
