-- ==========================================================================
-- 129: Co-anfitriões › convidar um fornecedor contratado
--
-- Em Personalizar evento › Co-anfitriões › Adicionar, além do e-mail, o
-- anfitrião escolhe um dos fornecedores que contratou (proposta aceita num
-- pedido dele) e marca as funções que o fornecedor pode acessar. O e-mail
-- do fornecedor vem do login dono da empresa (auth.users), aqui no banco —
-- a tela não precisa conhecer o e-mail. O resto é igual ao
-- convidar_organizador (migration 054): mesma tabela, mesmo token e o
-- mesmo e-mail de convite (/api/convidar-organizador).
-- ==========================================================================

create or replace function convidar_fornecedor_organizador(
  p_evento_id uuid,
  p_fornecedor_id uuid,
  p_permissoes jsonb default '[]'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text;
  v_nome text;
  v_meu_email text := lower(coalesce(auth.jwt() ->> 'email', ''));
  v_row eventos_organizadores%rowtype;
begin
  if auth.uid() is null then
    return jsonb_build_object('ok', false, 'erro', 'nao_logado');
  end if;
  if not exists (select 1 from eventos e where e.id = p_evento_id and e.cliente_id = auth.uid() and e.deleted_at is null) then
    return jsonb_build_object('ok', false, 'erro', 'sem_permissao');
  end if;
  -- Só fornecedores contratados por este anfitrião (proposta aceita).
  if not exists (
    select 1
      from propostas_pedido pp
      join pedidos_orcamento po on po.id = pp.pedido_id
     where pp.fornecedor_id = p_fornecedor_id
       and pp.status = 'aceita'
       and po.cliente_id = auth.uid()
  ) then
    return jsonb_build_object('ok', false, 'erro', 'fornecedor_nao_contratado');
  end if;

  select lower(btrim(coalesce(u.email, f.email, ''))), nullif(btrim(coalesce(f.company_name, '')), '')
    into v_email, v_nome
    from fornecedores f
    left join auth.users u on u.id = coalesce(f.dono_id, f.id)
   where f.id = p_fornecedor_id;

  if coalesce(v_email, '') !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    return jsonb_build_object('ok', false, 'erro', 'fornecedor_sem_email');
  end if;
  if v_email = v_meu_email then
    return jsonb_build_object('ok', false, 'erro', 'proprio_email');
  end if;

  insert into eventos_organizadores (evento_id, email, nome, papel, permissoes, convidado_por)
  values (p_evento_id, v_email, v_nome, 'personalizado', coalesce(p_permissoes, '[]'::jsonb), auth.uid())
  on conflict (evento_id, email) do update
    set papel = excluded.papel,
        permissoes = excluded.permissoes,
        nome = coalesce(excluded.nome, eventos_organizadores.nome),
        status = case when eventos_organizadores.status = 'aceito' then 'aceito' else 'pendente' end,
        token = case when eventos_organizadores.status = 'aceito' then eventos_organizadores.token else gen_random_uuid() end,
        convidado_por = auth.uid()
  returning * into v_row;

  return jsonb_build_object('ok', true, 'id', v_row.id, 'token', v_row.token, 'status', v_row.status, 'conta', 'fornecedor', 'nome', v_nome);
end;
$$;

revoke all on function convidar_fornecedor_organizador(uuid, uuid, jsonb) from public, anon;
grant execute on function convidar_fornecedor_organizador(uuid, uuid, jsonb) to authenticated;
