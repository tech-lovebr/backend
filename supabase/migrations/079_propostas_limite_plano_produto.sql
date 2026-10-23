-- 079 — Propostas: produto ofertado, categoria e limite por plano.
--
-- 1) A proposta passa a dizer QUAL produto da empresa está sendo ofertado
--    (propostas_pedido.produto_id). O nome do produto vai no texto do chat.
-- 2) Só envia proposta quem tem produto cadastrado numa categoria que
--    atende o pedido (ex.: pedido de "espaco" → produto de Espaços para
--    Locação). É a mesma regra que o Hub usa para mostrar o pedido.
-- 3) Limite de envios por mês, pelo plano da empresa:
--      Gratuito: 3 propostas/mês · Pro: 100 propostas/mês.
--    (Premium ilimitado virá depois.) Conta todas as propostas enviadas no
--    mês corrente, inclusive as retiradas.
--
-- Rode no SQL Editor depois da 074. Idempotente.

alter table propostas_pedido add column if not exists produto_id uuid references products(id) on delete set null;

-- Categoria do produto no Hub → categorias de pedido que ele atende.
create or replace function public.categorias_pedido_do_produto(p_categoria text)
returns text[]
language sql
immutable
as $$
  select case coalesce(p_categoria, '')
    when 'Mídia e Audiovisual' then array['fotografia']
    when 'Foto, Vídeo & Audiovisual' then array['fotografia']
    when 'Mídia' then array['fotografia']
    when 'Buffet e Gastronomia' then array['buffet', 'doces']
    when 'Buffet' then array['buffet', 'doces']
    when 'Espaços para Locação' then array['espaco']
    when 'Locação de espaço' then array['espaco']
    when 'Espaços & Locações' then array['espaco']
    when 'Espaço de Locação' then array['espaco']
    when 'Decoração' then array['decoracao']
    when 'Música e Entretenimento' then array['musica']
    when 'Assessoria e Cerimonialista' then array['assessoria']
    when 'Bar e Bebidas' then array['bebidas']
    else array[]::text[]
  end;
$$;

-- A versão antiga (7 parâmetros) sai; a nova tem p_produto no fim.
drop function if exists public.enviar_proposta(uuid, uuid, numeric, text, text, date, text);

create or replace function public.enviar_proposta(
  p_pedido uuid,
  p_fornecedor uuid,
  p_valor numeric,
  p_inclui text,
  p_mensagem text,
  p_validade date,
  p_prazo text,
  p_produto uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_pedido pedidos_orcamento%rowtype;
  v_empresa fornecedores%rowtype;
  v_proposta uuid;
  v_conversa uuid;
  v_categoria text;
  v_celebracao text;
  v_data text;
  v_texto text;
  v_produto_nome text;
  v_limite integer;
  v_enviadas integer;
begin
  select * into v_empresa from fornecedores where id = p_fornecedor and dono_id = auth.uid();
  if not found then
    raise exception 'Esta empresa não pertence ao seu login.';
  end if;
  if p_valor is null or p_valor <= 0 then
    raise exception 'Informe o valor total da proposta.';
  end if;
  if coalesce(btrim(p_inclui), '') = '' then
    raise exception 'Descreva o que está incluso na proposta.';
  end if;

  select * into v_pedido from pedidos_orcamento where id = p_pedido for update;
  if not found or v_pedido.status <> 'aberto'
     or (v_pedido.limite_propostas is not null and v_pedido.propostas_recebidas >= v_pedido.limite_propostas) then
    raise exception 'Este pedido não recebe mais propostas.';
  end if;

  -- A empresa precisa ter produto numa categoria que atende o pedido.
  if not exists (
    select 1 from products pr
     where pr.fornecedor_id = p_fornecedor
       and v_pedido.categoria = any (public.categorias_pedido_do_produto(pr.category))
  ) then
    raise exception 'Este pedido não é da categoria dos seus produtos.';
  end if;

  -- Produto ofertado: tem que ser da empresa.
  if p_produto is not null then
    select name into v_produto_nome from products where id = p_produto and fornecedor_id = p_fornecedor;
    if not found then
      raise exception 'Escolha um produto da sua empresa.';
    end if;
  end if;

  -- Limite do plano no mês (Gratuito 3, Pro 100).
  v_limite := case
    when v_empresa.plan = 'Pro' and (v_empresa.plan_expira_em is null or v_empresa.plan_expira_em > now()) then 100
    else 3 end;
  select count(*) into v_enviadas from propostas_pedido
   where fornecedor_id = p_fornecedor
     and created_at >= date_trunc('month', now() at time zone 'America/Sao_Paulo') at time zone 'America/Sao_Paulo';
  if v_enviadas >= v_limite then
    raise exception 'LIMITE_PLANO: Seu plano permite % envios de propostas por mês.', v_limite;
  end if;

  if exists (select 1 from propostas_pedido where pedido_id = p_pedido and fornecedor_id = p_fornecedor) then
    raise exception 'Você já enviou uma proposta para este pedido.';
  end if;

  insert into propostas_pedido (pedido_id, fornecedor_id, produto_id, valor, inclui, mensagem, validade, prazo_entrega)
  values (p_pedido, p_fornecedor, p_produto, p_valor, btrim(p_inclui), nullif(btrim(coalesce(p_mensagem, '')), ''), p_validade, nullif(btrim(coalesce(p_prazo, '')), ''))
  returning id into v_proposta;

  update pedidos_orcamento
     set propostas_recebidas = propostas_recebidas + 1,
         status = case when limite_propostas is not null and propostas_recebidas + 1 >= limite_propostas then 'fechado' else status end
   where id = p_pedido;

  -- Conversa da empresa com o anfitrião (pega ou cria).
  insert into conversations (fornecedor_id, cliente_id, last_message_at)
  values (p_fornecedor, v_pedido.cliente_id, now())
  on conflict (fornecedor_id, cliente_id) do update set last_message_at = now()
  returning id into v_conversa;

  v_categoria := case v_pedido.categoria
    when 'fotografia' then 'Fotografia' when 'buffet' then 'Buffet' when 'espaco' then 'Espaço'
    when 'decoracao' then 'Decoração' when 'musica' then 'Música' when 'assessoria' then 'Assessoria'
    when 'bebidas' then 'Bebidas' when 'doces' then 'Doces' else initcap(v_pedido.categoria) end;
  v_celebracao := case v_pedido.tipo_celebracao
    when 'casamento' then 'casamento' when 'aniversario' then 'aniversário' when 'bodas' then 'bodas'
    when 'noivado' then 'noivado' when 'formatura' then 'formatura' when 'corporativo' then 'evento corporativo'
    else v_pedido.tipo_celebracao end;
  v_data := case when v_pedido.data_flexivel or v_pedido.data_evento is null then 'data flexível'
    else to_char(v_pedido.data_evento, 'DD/MM/YYYY') end;

  v_texto := '📋 Proposta para o seu pedido de ' || v_categoria || ' (' || v_celebracao || ', ' || v_data || ')'
    || coalesce(' — ' || v_produto_nome, '') || ': R$ '
    || replace(replace(replace(to_char(p_valor, 'FM999G999G999D00'), ',', '#'), '.', ','), '#', '.')
    || '. Inclui: ' || btrim(p_inclui) || '.'
    || coalesce(' ' || nullif(btrim(coalesce(p_mensagem, '')), ''), '');

  insert into messages (conversation_id, sender_id, sender_role, text, tipo, proposta_id)
  values (v_conversa, auth.uid(), 'fornecedor', v_texto, 'proposta', v_proposta);

  update conversations set last_message_at = now() where id = v_conversa;

  perform set_config('love.enviar_proposta', 'on', true);
  update propostas_pedido set conversation_id = v_conversa where id = v_proposta;
  perform set_config('love.enviar_proposta', 'off', true);

  return v_proposta;
end;
$$;

revoke all on function public.enviar_proposta(uuid, uuid, numeric, text, text, date, text, uuid) from public, anon;
grant execute on function public.enviar_proposta(uuid, uuid, numeric, text, text, date, text, uuid) to authenticated;

-- O produto da proposta também fica protegido (só a RPC grava).
create or replace function propostas_pedido_proteger()
returns trigger language plpgsql as $$
begin
  if new.pedido_id is distinct from old.pedido_id
     or new.fornecedor_id is distinct from old.fornecedor_id
     -- (produto apagado: o "set null" automático pode passar)
     or (new.produto_id is distinct from old.produto_id and new.produto_id is not null)
     or new.valor is distinct from old.valor
     or new.inclui is distinct from old.inclui
     or new.mensagem is distinct from old.mensagem
     or new.validade is distinct from old.validade
     or new.prazo_entrega is distinct from old.prazo_entrega
     or new.conversation_id is distinct from old.conversation_id then
    if current_setting('love.enviar_proposta', true) is distinct from 'on' then
      raise exception 'Só o status da proposta pode ser alterado.';
    end if;
  end if;
  new.updated_at := now();
  return new;
end;
$$;
