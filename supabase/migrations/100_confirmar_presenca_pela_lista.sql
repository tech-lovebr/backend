-- 100 — Confirmar presença pela lista de convidados (convite publicado).
--
-- O convidado digita o nome e escolhe o dele entre os nomes como os
-- anfitriões escreveram na lista. A busca ignora maiúsculas, acentos e
-- espaços extras, e cada palavra digitada precisa aparecer no nome
-- ("joao silva" acha "João da Silva"). Só depois de 3 letras e no máximo
-- 6 nomes por busca, para a lista não poder ser lida inteira.
-- Ao confirmar, o convidado fica "confirmado" na lista do anfitrião.
-- Idempotente.

create or replace function normalizar_nome(p text)
returns text
language sql
immutable
as $$
  select regexp_replace(
    translate(lower(btrim(coalesce(p, ''))),
      'áàâãäåéèêëíìîïóòôõöúùûüçñý',
      'aaaaaaeeeeiiiiooooouuuucny'),
    '\s+', ' ', 'g');
$$;

-- Evento com convite publicado pelo slug (ou null).
create or replace function evento_do_convite_publicado(p_slug text)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select e.id
    from eventos e
   where lower(e.slug) = lower(btrim(coalesce(p_slug, '')))
     and e.deleted_at is null
     and exists (select 1 from convite_digital_pages c where c.evento_id = e.id and c.published_state is not null)
   limit 1;
$$;
revoke all on function evento_do_convite_publicado(text) from public, anon, authenticated;

create or replace function buscar_convidado_do_convite(p_slug text, p_busca text)
returns table (id uuid, nome text, confirmado boolean)
language plpgsql
stable
security definer
set search_path = public
as $$
#variable_conflict use_column
declare
  v_evento uuid := evento_do_convite_publicado(p_slug);
  v_busca text := normalizar_nome(p_busca);
  v_palavras text[];
begin
  if v_evento is null or length(replace(v_busca, ' ', '')) < 3 then
    return;
  end if;
  v_palavras := string_to_array(v_busca, ' ');
  return query
    select c.id, c.nome, c.status = 'confirmado'
      from convidados c
     where c.evento_id = v_evento
       and (select bool_and(position(w.palavra in normalizar_nome(c.nome)) > 0) from unnest(v_palavras) as w(palavra))
     order by
       (normalizar_nome(c.nome) = v_busca) desc,
       (normalizar_nome(c.nome) like v_busca || '%') desc,
       c.nome
     limit 6;
end;
$$;
revoke all on function buscar_convidado_do_convite(text, text) from public;
grant execute on function buscar_convidado_do_convite(text, text) to anon, authenticated;

create or replace function confirmar_presenca_convidado(p_slug text, p_convidado_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_evento uuid := evento_do_convite_publicado(p_slug);
  v_nome text;
begin
  if v_evento is null then
    return jsonb_build_object('ok', false, 'erro', 'convite_nao_encontrado');
  end if;
  update convidados
     set status = 'confirmado'
   where id = p_convidado_id and evento_id = v_evento
  returning nome into v_nome;
  if v_nome is null then
    return jsonb_build_object('ok', false, 'erro', 'convidado_nao_encontrado');
  end if;
  return jsonb_build_object('ok', true, 'nome', v_nome);
end;
$$;
revoke all on function confirmar_presenca_convidado(text, uuid) from public;
grant execute on function confirmar_presenca_convidado(text, uuid) to anon, authenticated;
