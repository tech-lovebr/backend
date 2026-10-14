-- ==============================================================================
-- LOVE — Pedido de orçamento do anfitrião vira lead no Hub (Contratar)
--
-- Rode este arquivo inteiro no SQL Editor do Supabase. É idempotente.
--
-- No Explorar, "Contratar" abre um pedido de orçamento com o serviço
-- escolhido. O pedido precisa virar um lead em Contatos (tabela leads) do
-- fornecedor — mas a RLS de leads é só do dono (002_b2b_backend.sql): o
-- anfitrião não pode inserir lá. Esta function faz a inserção por ele,
-- com SECURITY DEFINER, validando o mínimo: quem chama é um anfitrião
-- logado, o fornecedor existe e não está bloqueado, e o serviço (se
-- informado) é daquele fornecedor e está ativo.
--
-- O texto do pedido entra como primeiro comentário do lead (mesmo formato
-- dos comentários do CRM: id, user, text, at). Mesmo anfitrião + mesmo
-- fornecedor + mesmo serviço = um lead só; um novo pedido vira comentário.
-- ==============================================================================

create or replace function solicitar_orcamento(
  p_fornecedor_id uuid,
  p_product_id uuid,
  p_nome text,
  p_email text,
  p_data_evento text,
  p_mensagem text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cliente uuid := auth.uid();
  v_produto_nome text;
  v_lead_id uuid;
  v_nome text := coalesce(nullif(trim(p_nome), ''), 'Anfitrião');
  v_comentario jsonb;
begin
  if v_cliente is null or not exists (select 1 from clientes c where c.id = v_cliente) then
    raise exception 'Só um anfitrião logado pode pedir orçamento.';
  end if;

  if not exists (select 1 from fornecedores f where f.id = p_fornecedor_id and f.status <> 'bloqueado') then
    raise exception 'Fornecedor indisponível.';
  end if;

  if p_product_id is not null then
    select name into v_produto_nome
      from products
     where id = p_product_id and fornecedor_id = p_fornecedor_id and active = true;
    if v_produto_nome is null then
      raise exception 'Serviço indisponível.';
    end if;
  end if;

  v_comentario := jsonb_build_object(
    'id', 'pedido-' || (extract(epoch from now()) * 1000)::bigint,
    'user', v_nome,
    'text', coalesce(p_mensagem, ''),
    'at', now()
  );

  select id into v_lead_id
    from leads
   where fornecedor_id = p_fornecedor_id
     and cliente_id = v_cliente
     and product_id is not distinct from p_product_id
   order by created_at desc
   limit 1;

  if v_lead_id is not null then
    update leads
       set comentarios = coalesce(comentarios, '[]'::jsonb) || v_comentario,
           event_date = coalesce(nullif(p_data_evento, ''), event_date),
           email = coalesce(nullif(p_email, ''), email)
     where id = v_lead_id;
    return v_lead_id;
  end if;

  insert into leads (fornecedor_id, name, email, cliente_id, product_id, event_name, event_date, status, comentarios)
  values (
    p_fornecedor_id,
    v_nome,
    nullif(p_email, ''),
    v_cliente,
    p_product_id,
    v_produto_nome,
    nullif(p_data_evento, ''),
    'novo',
    jsonb_build_array(v_comentario)
  )
  returning id into v_lead_id;

  return v_lead_id;
end
$$;

revoke all on function solicitar_orcamento(uuid, uuid, text, text, text, text) from public, anon;
grant execute on function solicitar_orcamento(uuid, uuid, text, text, text, text) to authenticated;
