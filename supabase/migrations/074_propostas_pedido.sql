-- 074 — Propostas dos fornecedores para os pedidos de orçamento (RFP).
--
-- O anfitrião publica um pedido (072_pedidos_orcamento) em love.com.br; no
-- Hub, a empresa vê o pedido em Oportunidades e envia UMA proposta. A
-- proposta chega no chat da Love (conversations/messages) como uma mensagem
-- tipo 'proposta', que os dois lados desenham como um card.
--
-- Contrato com a plataforma dos anfitriões:
--   - messages.tipo = 'proposta' + messages.proposta_id identificam a mensagem.
--   - propostas_pedido.status é a fonte da verdade; o anfitrião só muda para
--     'vista', 'aceita' ou 'recusada'; a empresa só para 'retirada'.
--   - pedidos_orcamento.propostas_recebidas e status são mantidos só pela
--     RPC enviar_proposta.

-- ------------------------------------------------------------------
-- a) Tabela propostas_pedido
-- ------------------------------------------------------------------
create table if not exists propostas_pedido (
  id uuid primary key default gen_random_uuid(),
  pedido_id uuid not null references pedidos_orcamento(id) on delete cascade,
  fornecedor_id uuid not null references fornecedores(id) on delete cascade,
  valor numeric not null check (valor > 0),
  inclui text not null check (char_length(inclui) between 1 and 1000),
  mensagem text,
  validade date,
  prazo_entrega text,
  status text not null default 'enviada'
    check (status in ('enviada', 'vista', 'aceita', 'recusada', 'retirada')),
  conversation_id uuid references conversations(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (pedido_id, fornecedor_id)
);

create index if not exists propostas_pedido_fornecedor_idx on propostas_pedido (fornecedor_id, created_at desc);
create index if not exists propostas_pedido_pedido_idx on propostas_pedido (pedido_id);

alter table propostas_pedido enable row level security;

-- Funções auxiliares (security definer) para as políticas das duas tabelas
-- se consultarem sem cair em recursão de RLS.
create or replace function public.eh_dono_do_pedido(p_pedido uuid)
returns boolean language sql stable security definer set search_path = public as $fn$
  select exists (select 1 from pedidos_orcamento where id = p_pedido and cliente_id = auth.uid());
$fn$;

create or replace function public.empresa_propos_no_pedido(p_pedido uuid)
returns boolean language sql stable security definer set search_path = public as $fn$
  select exists (
    select 1 from propostas_pedido pp
    join fornecedores f on f.id = pp.fornecedor_id
    where pp.pedido_id = p_pedido and f.dono_id = auth.uid()
  );
$fn$;

-- Empresa (login dono): lê as próprias propostas.
drop policy if exists "propostas_pedido_empresa_le" on propostas_pedido;
create policy "propostas_pedido_empresa_le" on propostas_pedido
  for select to authenticated
  using (exists (select 1 from fornecedores f where f.id = fornecedor_id and f.dono_id = auth.uid()));

-- Empresa: só pode retirar (status 'retirada') as próprias.
drop policy if exists "propostas_pedido_empresa_retira" on propostas_pedido;
create policy "propostas_pedido_empresa_retira" on propostas_pedido
  for update to authenticated
  using (exists (select 1 from fornecedores f where f.id = fornecedor_id and f.dono_id = auth.uid()))
  with check (
    status = 'retirada'
    and exists (select 1 from fornecedores f where f.id = fornecedor_id and f.dono_id = auth.uid())
  );

-- Anfitrião dono do pedido: lê as propostas do pedido dele.
drop policy if exists "propostas_pedido_anfitriao_le" on propostas_pedido;
create policy "propostas_pedido_anfitriao_le" on propostas_pedido
  for select to authenticated
  using (public.eh_dono_do_pedido(pedido_id));

-- Anfitrião: muda o status para 'vista', 'aceita' ou 'recusada'.
drop policy if exists "propostas_pedido_anfitriao_status" on propostas_pedido;
create policy "propostas_pedido_anfitriao_status" on propostas_pedido
  for update to authenticated
  using (public.eh_dono_do_pedido(pedido_id))
  with check (
    status in ('vista', 'aceita', 'recusada')
    and public.eh_dono_do_pedido(pedido_id)
  );

-- Admin lê tudo.
drop policy if exists "propostas_pedido_admin" on propostas_pedido;
create policy "propostas_pedido_admin" on propostas_pedido
  for select to authenticated
  using (is_admin());

-- Ninguém insere direto: só pela RPC enviar_proposta (security definer).
-- Quem atualiza só mexe no status (os outros campos ficam como foram enviados).
create or replace function propostas_pedido_proteger()
returns trigger language plpgsql as $$
begin
  if new.pedido_id is distinct from old.pedido_id
     or new.fornecedor_id is distinct from old.fornecedor_id
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
drop trigger if exists propostas_pedido_proteger on propostas_pedido;
create trigger propostas_pedido_proteger before update on propostas_pedido
  for each row execute function propostas_pedido_proteger();

-- A empresa que mandou proposta continua vendo o pedido depois que ele
-- fecha (para "Minhas propostas" mostrar categoria, data e local).
drop policy if exists "pedidos_orcamento_com_proposta" on pedidos_orcamento;
create policy "pedidos_orcamento_com_proposta" on pedidos_orcamento
  for select to authenticated
  using (public.empresa_propos_no_pedido(id));

-- ------------------------------------------------------------------
-- b) messages: tipo + proposta_id (o card de proposta no chat)
-- ------------------------------------------------------------------
alter table messages add column if not exists tipo text not null default 'texto';
alter table messages drop constraint if exists messages_tipo_check;
alter table messages add constraint messages_tipo_check check (tipo in ('texto', 'proposta'));
alter table messages add column if not exists proposta_id uuid references propostas_pedido(id) on delete set null;

-- ------------------------------------------------------------------
-- c) RPC enviar_proposta (tudo numa transação)
-- ------------------------------------------------------------------
create or replace function public.enviar_proposta(
  p_pedido uuid,
  p_fornecedor uuid,
  p_valor numeric,
  p_inclui text,
  p_mensagem text,
  p_validade date,
  p_prazo text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_pedido pedidos_orcamento%rowtype;
  v_proposta uuid;
  v_conversa uuid;
  v_categoria text;
  v_celebracao text;
  v_data text;
  v_texto text;
begin
  if not exists (select 1 from fornecedores where id = p_fornecedor and dono_id = auth.uid()) then
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

  if exists (select 1 from propostas_pedido where pedido_id = p_pedido and fornecedor_id = p_fornecedor) then
    raise exception 'Você já enviou uma proposta para este pedido.';
  end if;

  insert into propostas_pedido (pedido_id, fornecedor_id, valor, inclui, mensagem, validade, prazo_entrega)
  values (p_pedido, p_fornecedor, p_valor, btrim(p_inclui), nullif(btrim(coalesce(p_mensagem, '')), ''), p_validade, nullif(btrim(coalesce(p_prazo, '')), ''))
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

  v_texto := '📋 Proposta para o seu pedido de ' || v_categoria || ' (' || v_celebracao || ', ' || v_data || '): R$ '
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

revoke all on function public.enviar_proposta(uuid, uuid, numeric, text, text, date, text) from public, anon;
grant execute on function public.enviar_proposta(uuid, uuid, numeric, text, text, date, text) to authenticated;

-- ------------------------------------------------------------------
-- d) Notificação para a empresa quando o anfitrião aceita ou recusa
--    (tabela notificacoes do Hub, destino 'individual' = login dono).
-- ------------------------------------------------------------------
create or replace function propostas_pedido_notificar()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_dono uuid;
  v_categoria text;
begin
  if new.status is not distinct from old.status or new.status not in ('aceita', 'recusada') then
    return new;
  end if;
  select dono_id into v_dono from fornecedores where id = new.fornecedor_id;
  if v_dono is null then return new; end if;
  select initcap(categoria) into v_categoria from pedidos_orcamento where id = new.pedido_id;

  insert into notificacoes (titulo, mensagem, link_url, link_label, destino, destinatario_id, autor_nome)
  values (
    case when new.status = 'aceita' then 'Sua proposta foi aceita' else 'Sua proposta foi recusada' end,
    case when new.status = 'aceita'
      then 'O anfitrião aceitou a sua proposta de ' || coalesce(v_categoria, 'serviço') || '. Combine os próximos passos pelo chat.'
      else 'O anfitrião recusou a sua proposta de ' || coalesce(v_categoria, 'serviço') || '.' end,
    'oportunidades?aba=propostas',
    'Ver propostas',
    'individual',
    v_dono,
    'Love'
  );
  return new;
end;
$$;

drop trigger if exists propostas_pedido_notificar on propostas_pedido;
create trigger propostas_pedido_notificar after update on propostas_pedido
  for each row execute function propostas_pedido_notificar();
