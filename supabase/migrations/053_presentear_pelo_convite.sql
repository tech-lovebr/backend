-- ==============================================================================
-- LOVE — Presentear pelo convite publicado (vaquinha livre + checkout)
--
-- Rode no SQL Editor DEPOIS do 052_faq_categorias.sql. É idempotente.
--
-- 1. convite_publicado passa a devolver, em cada presente, se ele é vaquinha
--    (extra.isCrowdfunding), quanto já foi arrecadado (extra.received) e a
--    descrição — a tela do presente no convite mostra a barra de progresso.
--
-- 2. presentes_contribuicoes — cada "Pagar" do checkout do convite vira uma
--    linha aqui, com status 'pendente'. O gateway de pagamento (integração a
--    seguir) confirma chamando confirmar_contribuicao(), que marca 'pago' e
--    soma o valor em presentes.extra.received (e fecha o presente quando
--    completa). Enquanto o gateway não existe, nada é somado sozinho.
--
-- 3. presentear_pelo_convite() — chamada pelo site público (anon): confere
--    que o convite está publicado, que o presente é do evento e ainda está
--    aberto, e registra a contribuição. Presente sem vaquinha: o valor é o
--    do presente, sempre. Com vaquinha: o convidado escolhe quanto dar, até
--    o que falta para completar.
-- ==============================================================================


-- ------------------------------------------------------------------
-- 1. convite_publicado com vaquinha/arrecadado/descrição
-- ------------------------------------------------------------------

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
           'presentes', coalesce((
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


-- ------------------------------------------------------------------
-- 2. Contribuições (o que o convidado escolheu presentear)
-- ------------------------------------------------------------------

create table if not exists presentes_contribuicoes (
  id uuid primary key default gen_random_uuid(),
  evento_id uuid not null references eventos(id) on delete cascade,
  presente_id uuid not null references presentes(id) on delete cascade,
  valor numeric(12,2) not null check (valor > 0),
  nome text not null,
  email text,
  telefone text,
  mensagem text,
  metodo text not null check (metodo in ('pix', 'cartao', 'apple_pay')),
  status text not null default 'pendente' check (status in ('pendente', 'pago', 'cancelado')),
  gateway_ref text,
  created_at timestamptz not null default now(),
  pago_em timestamptz
);

create index if not exists presentes_contribuicoes_presente_idx on presentes_contribuicoes (presente_id, status);
create index if not exists presentes_contribuicoes_evento_idx on presentes_contribuicoes (evento_id, created_at desc);

alter table presentes_contribuicoes enable row level security;

-- O anfitrião vê as contribuições dos próprios eventos; o Admin vê todas.
-- Ninguém escreve direto: só pelas funções abaixo.
drop policy if exists "contribuicoes_select_anfitriao" on presentes_contribuicoes;
create policy "contribuicoes_select_anfitriao" on presentes_contribuicoes
  for select to authenticated
  using (
    is_admin()
    or exists (select 1 from eventos e where e.id = presentes_contribuicoes.evento_id and e.cliente_id = auth.uid())
  );


-- ------------------------------------------------------------------
-- 3. Registrar a escolha do convidado (site público)
-- ------------------------------------------------------------------

create or replace function presentear_pelo_convite(
  p_slug text,
  p_presente_id uuid,
  p_valor numeric,
  p_nome text,
  p_email text default null,
  p_telefone text default null,
  p_mensagem text default null,
  p_metodo text default 'pix'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_evento_id uuid;
  v_presente presentes%rowtype;
  v_nome text := regexp_replace(btrim(coalesce(p_nome, '')), '\s+', ' ', 'g');
  v_email text := nullif(btrim(coalesce(p_email, '')), '');
  v_telefone text := nullif(btrim(coalesce(p_telefone, '')), '');
  v_mensagem text := nullif(btrim(coalesce(p_mensagem, '')), '');
  v_metodo text := lower(btrim(coalesce(p_metodo, 'pix')));
  v_vaquinha boolean;
  v_recebido numeric;
  v_falta numeric;
  v_valor numeric;
  v_id uuid;
begin
  if length(v_nome) < 2 or length(v_nome) > 120 then
    return jsonb_build_object('ok', false, 'erro', 'nome_invalido');
  end if;
  if v_email is not null and length(v_email) > 200 then v_email := null; end if;
  if v_telefone is not null and length(v_telefone) > 40 then v_telefone := null; end if;
  if v_mensagem is not null and length(v_mensagem) > 300 then v_mensagem := left(v_mensagem, 300); end if;
  if v_metodo not in ('pix', 'cartao', 'apple_pay') then
    return jsonb_build_object('ok', false, 'erro', 'metodo_invalido');
  end if;

  -- Só eventos com convite publicado aceitam presente pelo site.
  select e.id into v_evento_id
    from eventos e
   where lower(e.slug) = lower(p_slug)
     and e.deleted_at is null
     and exists (
       select 1 from convite_digital_pages c
        where c.evento_id = e.id and c.published_state is not null
     )
   limit 1;
  if v_evento_id is null then
    return jsonb_build_object('ok', false, 'erro', 'convite_nao_encontrado');
  end if;

  select * into v_presente from presentes where id = p_presente_id and evento_id = v_evento_id;
  if v_presente.id is null then
    return jsonb_build_object('ok', false, 'erro', 'presente_nao_encontrado');
  end if;
  if v_presente.status = 'recebido' then
    return jsonb_build_object('ok', false, 'erro', 'ja_presenteado');
  end if;

  v_vaquinha := coalesce((v_presente.extra ->> 'isCrowdfunding')::boolean, false);
  v_recebido := coalesce(nullif(v_presente.extra ->> 'received', '')::numeric, 0);
  v_falta := greatest(0, coalesce(v_presente.valor, 0) - v_recebido);

  if v_vaquinha then
    -- O convidado escolhe quanto dar, até o que falta para completar.
    v_valor := round(coalesce(p_valor, 0), 2);
    if v_valor < 1 then
      return jsonb_build_object('ok', false, 'erro', 'valor_invalido');
    end if;
    if v_falta <= 0 then
      return jsonb_build_object('ok', false, 'erro', 'ja_presenteado');
    end if;
    if v_valor > v_falta then v_valor := v_falta; end if;
  else
    -- Presente comum: sempre o valor inteiro do presente.
    v_valor := round(coalesce(v_presente.valor, 0), 2);
    if v_valor < 1 then
      return jsonb_build_object('ok', false, 'erro', 'valor_invalido');
    end if;
  end if;

  insert into presentes_contribuicoes (evento_id, presente_id, valor, nome, email, telefone, mensagem, metodo)
  values (v_evento_id, v_presente.id, v_valor, v_nome, v_email, v_telefone, v_mensagem, v_metodo)
  returning id into v_id;

  return jsonb_build_object('ok', true, 'contribuicao_id', v_id, 'valor', v_valor, 'vaquinha', v_vaquinha);
end;
$$;

revoke all on function presentear_pelo_convite(text, uuid, numeric, text, text, text, text, text) from public;
grant execute on function presentear_pelo_convite(text, uuid, numeric, text, text, text, text, text) to anon, authenticated;


-- ------------------------------------------------------------------
-- 4. Confirmar o pagamento (para o webhook do gateway — chave de serviço)
--    Marca a contribuição como paga e soma em presentes.extra.received.
--    Quando o valor recebido alcança o do presente, o presente fecha
--    (status 'recebido') e ganha o nome de quem deu (ou "Vários
--    convidados", numa vaquinha com mais de uma pessoa).
-- ------------------------------------------------------------------

create or replace function confirmar_contribuicao(p_id uuid, p_gateway_ref text default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_c presentes_contribuicoes%rowtype;
  v_p presentes%rowtype;
  v_vaquinha boolean;
  v_recebido numeric;
  v_novo numeric;
  v_quantos integer;
begin
  select * into v_c from presentes_contribuicoes where id = p_id for update;
  if v_c.id is null then
    return jsonb_build_object('ok', false, 'erro', 'contribuicao_nao_encontrada');
  end if;
  if v_c.status = 'pago' then
    return jsonb_build_object('ok', true, 'ja_estava_pago', true);
  end if;

  update presentes_contribuicoes
     set status = 'pago', pago_em = now(), gateway_ref = coalesce(p_gateway_ref, gateway_ref)
   where id = p_id;

  select * into v_p from presentes where id = v_c.presente_id for update;
  v_vaquinha := coalesce((v_p.extra ->> 'isCrowdfunding')::boolean, false);
  v_recebido := coalesce(nullif(v_p.extra ->> 'received', '')::numeric, 0);
  v_novo := v_recebido + v_c.valor;
  select count(*) into v_quantos from presentes_contribuicoes where presente_id = v_p.id and status = 'pago';

  update presentes
     set extra = coalesce(extra, '{}'::jsonb) || jsonb_build_object('received', v_novo),
         status = case when v_novo >= coalesce(valor, 0) then 'recebido' else status end,
         comprador_nome = case
           when v_novo >= coalesce(valor, 0) then
             coalesce(comprador_nome, case when v_vaquinha and v_quantos > 1 then 'Vários convidados' else v_c.nome end)
           else comprador_nome
         end
   where id = v_p.id;

  return jsonb_build_object('ok', true, 'recebido', v_novo, 'completo', v_novo >= coalesce(v_p.valor, 0));
end;
$$;

revoke all on function confirmar_contribuicao(uuid, text) from public, anon, authenticated;
grant execute on function confirmar_contribuicao(uuid, text) to service_role;
