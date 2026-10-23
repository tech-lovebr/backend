-- 097 — Proposta aceita = cliente na lista do Hub (Clientes).
--
-- Quando o anfitrião aceita a proposta de uma empresa, ele entra na hora
-- em Clientes dessa empresa (tabela leads, status 'fechado'), com nome,
-- e-mail, telefone, cidade, serviço, data do evento e valor. O contrato em
-- si continua sendo a proposta aceita (migration 096: parcelas, entregas e
-- atualizações). Se o cliente já existir na lista, só atualiza o status.
-- Rode no SQL Editor depois da 096. Idempotente.

create or replace function public.cliente_ao_aceitar_proposta()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_pedido pedidos_orcamento%rowtype;
  v_cli clientes%rowtype;
  v_produto text;
  v_nome text;
  v_lead uuid;
begin
  if not (new.status = 'aceita' and (tg_op = 'INSERT' or old.status is distinct from 'aceita')) then
    return new;
  end if;

  select * into v_pedido from pedidos_orcamento where id = new.pedido_id;
  if not found then return new; end if;
  select * into v_cli from clientes where id = v_pedido.cliente_id;
  if new.produto_id is not null then
    select name into v_produto from products where id = new.produto_id;
  end if;
  v_nome := coalesce(nullif(btrim(v_cli.full_name), ''), nullif(btrim(concat_ws(' ', v_cli.first_name, v_cli.last_name)), ''), v_cli.couple_name, 'Cliente');

  select id into v_lead from leads
   where fornecedor_id = new.fornecedor_id and cliente_id = v_pedido.cliente_id
   order by created_at limit 1;

  if v_lead is null then
    insert into leads (fornecedor_id, name, email, cliente_id, product_id, event_name, event_date, value, status,
                       whatsapp, cidade, estado, tipo_evento, data_orcamento)
    values (new.fornecedor_id, v_nome, v_cli.email, v_pedido.cliente_id, new.produto_id,
            coalesce(v_produto, v_pedido.titulo), to_char(v_pedido.data_evento, 'YYYY-MM-DD'), new.valor, 'fechado',
            v_cli.phone, v_pedido.cidade, v_pedido.uf, v_pedido.tipo_celebracao, to_char(now(), 'YYYY-MM-DD'));
  else
    update leads set status = 'fechado',
                     value = coalesce(value, 0) + new.valor,
                     product_id = coalesce(product_id, new.produto_id),
                     event_name = coalesce(event_name, v_produto, v_pedido.titulo),
                     event_date = coalesce(event_date, to_char(v_pedido.data_evento, 'YYYY-MM-DD'))
     where id = v_lead;
  end if;
  return new;
end;
$$;

drop trigger if exists cliente_ao_aceitar_proposta on propostas_pedido;
create trigger cliente_ao_aceitar_proposta after insert or update of status on propostas_pedido
  for each row execute function public.cliente_ao_aceitar_proposta();

-- Propostas aceitas antes desta migration: o cliente entra na lista.
insert into leads (fornecedor_id, name, email, cliente_id, product_id, event_name, event_date, value, status,
                   whatsapp, cidade, estado, tipo_evento, data_orcamento)
select distinct on (pp.fornecedor_id, po.cliente_id)
  pp.fornecedor_id,
  coalesce(nullif(btrim(c.full_name), ''), nullif(btrim(concat_ws(' ', c.first_name, c.last_name)), ''), c.couple_name, 'Cliente'),
  c.email, po.cliente_id, pp.produto_id,
  coalesce(pr.name, po.titulo), to_char(po.data_evento, 'YYYY-MM-DD'), pp.valor, 'fechado',
  c.phone, po.cidade, po.uf, po.tipo_celebracao, to_char(pp.updated_at, 'YYYY-MM-DD')
from propostas_pedido pp
join pedidos_orcamento po on po.id = pp.pedido_id
left join clientes c on c.id = po.cliente_id
left join products pr on pr.id = pp.produto_id
where pp.status = 'aceita'
  and not exists (select 1 from leads l where l.fornecedor_id = pp.fornecedor_id and l.cliente_id = po.cliente_id)
order by pp.fornecedor_id, po.cliente_id, pp.updated_at;

notify pgrst, 'reload schema';
