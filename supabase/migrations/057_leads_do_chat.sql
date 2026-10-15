-- ==============================================================================
-- LOVE B2B — Quem conversa no chat vira lead automaticamente
--
-- Todo cliente (anfitrião) que tem uma conversa com o fornecedor entra na
-- tabela de Leads do Hub, sem ninguém precisar adicionar à mão. O lead vem
-- com o nome e o e-mail do cliente, a data e o tipo do evento dele
-- (Casamento, Chá de bebê, Aniversário…) e o status "Em conversa".
--
--  * Conversa nova → o lead é criado na hora (trigger em conversations).
--  * Conversas que já existiam → entram quando o Hub abre a página de Leads
--    (function sincronizar_leads_do_chat), que também completa data e tipo
--    do evento que ainda estiverem vazios.
--  * Lead que já existe para o cliente (adicionado à mão ou importado com o
--    mesmo cliente vinculado) não é duplicado; só ganha o que faltar.
--
-- Nova coluna: leads.tipo_evento (texto, ex.: "Casamento").
--
-- Rode este arquivo inteiro no SQL Editor do Supabase. É idempotente.
-- ==============================================================================

alter table leads add column if not exists tipo_evento text;

-- Evento do cliente que vale para o lead: o próximo (data de hoje em
-- diante); sem próximo, o mais recente; sem evento, o que ele informou no
-- cadastro (intended_event_*).
create or replace function evento_do_cliente_para_lead(p_cliente uuid)
returns table (tipo_label text, data_texto text)
language sql
stable
security definer
set search_path = public
as $$
  with ev as (
    select
      case e.tipo
        when 'wedding' then 'Casamento'
        when 'baby' then 'Chá de bebê'
        when 'birthday' then 'Aniversário'
        when 'corporate' then 'Corporativo'
        else 'Outro'
      end as tipo_label,
      e.data_evento
    from eventos e
    where e.cliente_id = p_cliente and e.deleted_at is null
    order by (e.data_evento >= current_date) desc nulls last,
             case when e.data_evento >= current_date then e.data_evento end asc,
             e.data_evento desc nulls last,
             e.created_at desc
    limit 1
  )
  select
    coalesce((select tipo_label from ev), nullif(c.intended_event_type_label, '')),
    to_char(coalesce((select data_evento from ev), c.intended_event_date), 'DD/MM/YYYY')
  from clientes c
  where c.id = p_cliente;
$$;

create or replace function garantir_lead_do_chat(p_fornecedor uuid, p_cliente uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_lead uuid;
  v_nome text;
  v_email text;
  v_tipo text;
  v_data text;
begin
  if p_fornecedor is null or p_cliente is null then return; end if;

  select nullif(trim(coalesce(c.couple_name, '')), ''), c.email
    into v_nome, v_email
  from clientes c where c.id = p_cliente;
  if v_nome is null and v_email is null then return; end if;

  select tipo_label, data_texto into v_tipo, v_data
  from evento_do_cliente_para_lead(p_cliente);

  select l.id into v_lead
  from leads l
  where l.fornecedor_id = p_fornecedor
    and (l.cliente_id = p_cliente or (l.cliente_id is null and v_email is not null and lower(l.email) = lower(v_email)))
  order by (l.cliente_id = p_cliente) desc nulls last, l.created_at
  limit 1;

  if v_lead is null then
    insert into leads (fornecedor_id, cliente_id, name, email, status, tipo_evento, event_date)
    values (p_fornecedor, p_cliente, coalesce(v_nome, v_email), v_email, 'conversa', v_tipo, v_data);
  else
    update leads set
      cliente_id  = coalesce(cliente_id, p_cliente),
      email       = coalesce(nullif(email, ''), v_email),
      tipo_evento = coalesce(nullif(tipo_evento, ''), v_tipo),
      event_date  = coalesce(nullif(event_date, ''), v_data)
    where id = v_lead;
  end if;
end;
$$;

-- Conversa nova → lead na hora.
create or replace function conversations_criar_lead()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform garantir_lead_do_chat(new.fornecedor_id, new.cliente_id);
  return new;
exception when others then
  -- Nunca impede a conversa de ser criada.
  return new;
end;
$$;

drop trigger if exists conversations_criar_lead_trg on conversations;
create trigger conversations_criar_lead_trg
  after insert on conversations
  for each row execute function conversations_criar_lead();

-- Chamado pelo Hub ao abrir Leads: garante um lead para cada conversa do
-- fornecedor logado e completa data/tipo do evento que estiverem vazios.
create or replace function sincronizar_leads_do_chat()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
begin
  if auth.uid() is null then return; end if;
  for r in select cliente_id from conversations where fornecedor_id = auth.uid() loop
    perform garantir_lead_do_chat(auth.uid(), r.cliente_id);
  end loop;
end;
$$;

revoke all on function sincronizar_leads_do_chat() from public;
grant execute on function sincronizar_leads_do_chat() to authenticated;
revoke all on function garantir_lead_do_chat(uuid, uuid) from public;
revoke all on function evento_do_cliente_para_lead(uuid) from public;
