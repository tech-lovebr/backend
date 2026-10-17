-- ==============================================================================
-- LOVE — Robô do Suporte Love (chat do love.com.br e do Hub)
--
-- Rode no SQL Editor DEPOIS do 063_suporte_chat_realtime.sql. É idempotente.
--
-- Quando alguém escreve na conversa "Suporte Love" (tickets com canal 'chat'),
-- o robô procura uma resposta pronta liberada para o robô
-- (respostas_prontas.envio_automatico) cujas palavras-chave apareçam na
-- mensagem — sem diferença de acento nem de maiúscula.
--
--   * Achou: responde no chat como "Robô Love" e a conversa vai para
--     "Respondida pelo robô" (sai de Pendentes).
--   * Não achou, ou a pessoa pediu um atendente: avisa que um atendente vai
--     responder (uma vez a cada 12 h) e a conversa fica em Pendentes.
--   * Se a pessoa escrever de novo, a conversa volta para Pendentes e o robô
--     tenta de novo.
--
-- Tudo roda em gatilhos do banco: responde na hora, sem servidor. Na etapa
-- da IA, a escolha da resposta passa para o Claude.
-- ==============================================================================


-- ------------------------------------------------------------------
-- 1. Novo status: respondida pelo robô
-- ------------------------------------------------------------------

do $$
declare c record;
begin
  for c in
    select conname from pg_constraint
     where conrelid = 'tickets'::regclass and contype = 'c'
       and pg_get_constraintdef(oid) ilike '%status%'
  loop
    execute format('alter table tickets drop constraint %I', c.conname);
  end loop;

  alter table tickets add constraint tickets_status_check
    check (status in ('aberto', 'em_andamento', 'aguardando_cliente', 'respondida_bot', 'resolvido', 'fechado', 'spam'));
end $$;

-- Mensagem nova do solicitante reabre também o que o robô tinha respondido.
create or replace function atualizar_conversa_do_ticket()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update tickets t
     set last_message_at = new.created_at,
         updated_at = now(),
         nao_lido = case when new.author_role = 'usuario' then true else t.nao_lido end,
         status = case
           when new.author_role = 'usuario'
                and t.status in ('aguardando_cliente', 'respondida_bot', 'resolvido', 'fechado') then 'aberto'
           else t.status
         end
   where t.id = new.ticket_id;
  return new;
end;
$$;


-- ------------------------------------------------------------------
-- 2. O robô
-- ------------------------------------------------------------------

-- Minúsculas e sem acento, para comparar "Saque" com "saque" e "sáque".
create or replace function suporte_normalizar(p text)
returns text
language sql
immutable
as $$
  select translate(lower(coalesce(p, '')),
    'áàâãäéèêëíìîïóòôõöúùûüçñ',
    'aaaaaeeeeiiiiooooouuuucn');
$$;

-- Texto puro de um HTML simples (para o campo body).
create or replace function suporte_texto_do_html(p text)
returns text
language sql
immutable
as $$
  select btrim(regexp_replace(
           regexp_replace(
             regexp_replace(coalesce(p, ''), '<br\s*/?>|</p>|</li>|</h[1-6]>', E'\n', 'gi'),
             '<[^>]+>', '', 'g'),
           E'\n{3,}', E'\n\n', 'g'));
$$;

create or replace function suporte_robo_responder(p_ticket uuid, p_texto text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  t tickets%rowtype;
  v_texto text := suporte_normalizar(p_texto);
  v_resp respostas_prontas%rowtype;
  v_primeiro text;
  v_html text;
  v_pediu_humano boolean;
begin
  select * into t from tickets where id = p_ticket;
  if not found or t.canal <> 'chat' then return; end if;

  v_pediu_humano := v_texto ~ '(atendente|humano|pessoa de verdade|falar com alguem|falar com uma pessoa)';

  if not v_pediu_humano then
    select r.* into v_resp
      from respostas_prontas r
     where r.ativo and r.envio_automatico
       and (r.publico = 'todos' or r.publico = t.origem or (t.origem = 'site' and r.publico = 'cliente'))
       and exists (select 1 from unnest(r.palavras_chave) k
                    where length(btrim(k)) > 1 and position(suporte_normalizar(btrim(k)) in v_texto) > 0)
     order by (select count(*) from unnest(r.palavras_chave) k
                where length(btrim(k)) > 1 and position(suporte_normalizar(btrim(k)) in v_texto) > 0) desc,
              r.usos desc
     limit 1;
  end if;

  if v_resp.id is not null then
    v_primeiro := coalesce(nullif(split_part(btrim(coalesce(t.nome, '')), ' ', 1), ''), 'tudo bem');
    v_html := replace(replace(replace(replace(v_resp.corpo_html,
                '{{primeiro_nome}}', v_primeiro),
                '{{nome}}', coalesce(nullif(btrim(t.nome), ''), 'tudo bem')),
                '{{protocolo}}', coalesce(t.protocolo, '')),
                '{{assunto}}', coalesce(t.assunto, ''));

    insert into ticket_messages (ticket_id, author_role, author_name, body, body_html, canal, resposta_pronta_id)
    values (t.id, 'ia', 'Robô Love', suporte_texto_do_html(v_html), v_html, 'chat', v_resp.id);

    update respostas_prontas set usos = usos + 1 where id = v_resp.id;
    update tickets set status = 'respondida_bot', updated_at = now() where id = t.id;
    return;
  end if;

  -- Sem resposta pronta: avisa que um atendente responde (no máximo a cada 12 h).
  if not exists (
    select 1 from ticket_messages m
     where m.ticket_id = t.id and m.author_role = 'sistema'
       and m.created_at > now() - interval '12 hours'
  ) then
    insert into ticket_messages (ticket_id, author_role, author_name, body, canal)
    values (t.id, 'sistema', 'Suporte Love',
            'Recebemos sua mensagem! Um atendente da Love vai responder aqui em breve.', 'chat');
  end if;

  update tickets set status = 'aberto', updated_at = now() where id = t.id and status <> 'aberto';
end;
$$;

revoke all on function suporte_robo_responder(uuid, text) from public, anon, authenticated;

-- Primeira mensagem: vem na própria linha do chamado (tickets.mensagem).
create or replace function suporte_robo_no_chamado()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.canal = 'chat' and nullif(btrim(coalesce(new.mensagem, '')), '') is not null then
    perform suporte_robo_responder(new.id, new.mensagem);
  end if;
  return new;
end;
$$;

drop trigger if exists zz_suporte_robo_chamado on tickets;
create trigger zz_suporte_robo_chamado
  after insert on tickets
  for each row execute function suporte_robo_no_chamado();

-- Mensagens seguintes. O nome com "zz_" faz rodar depois de
-- ticket_messages_atualiza_conversa (gatilhos rodam em ordem alfabética).
create or replace function suporte_robo_na_mensagem()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.author_role = 'usuario' then
    perform suporte_robo_responder(new.ticket_id, new.body);
  end if;
  return new;
end;
$$;

drop trigger if exists zz_suporte_robo_mensagem on ticket_messages;
create trigger zz_suporte_robo_mensagem
  after insert on ticket_messages
  for each row execute function suporte_robo_na_mensagem();
