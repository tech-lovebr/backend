-- 102 — Dados do convidado depois de confirmar presença (convite publicado).
--
-- Depois de "Presença confirmada!", o convite pede (opcional) e-mail e
-- WhatsApp para ajudar a assessoria, e dois consentimentos (começam
-- desmarcados): ofertas e descontos da Love Viagens e novidades sobre o
-- evento. Ficam em convidados.email / telefone e em
-- convidados.extra -> 'consentimentos'.
--
-- Segurança: confirmar_presenca_convidado passa a devolver uma chave que
-- vale 1 hora; só com ela completar_dados_convidado grava (ninguém altera
-- os dados de outro convidado só por saber o id dele).
-- Idempotente.

create or replace function confirmar_presenca_convidado(p_slug text, p_convidado_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_evento uuid := evento_do_convite_publicado(p_slug);
  v_nome text;
  v_email text;
  v_telefone text;
  v_chave text := replace(gen_random_uuid()::text, '-', '');
begin
  if v_evento is null then
    return jsonb_build_object('ok', false, 'erro', 'convite_nao_encontrado');
  end if;
  update convidados
     set status = 'confirmado',
         extra = coalesce(extra, '{}'::jsonb) || jsonb_build_object(
           'chave_dados', v_chave,
           'chave_dados_expira', (now() + interval '1 hour')::text)
   where id = p_convidado_id and evento_id = v_evento
  returning nome, email, telefone into v_nome, v_email, v_telefone;
  if v_nome is null then
    return jsonb_build_object('ok', false, 'erro', 'convidado_nao_encontrado');
  end if;
  -- Já tinha e-mail/WhatsApp: a tela não precisa mostrar (só se tem, não o valor).
  return jsonb_build_object('ok', true, 'nome', v_nome, 'chave', v_chave,
    'tem_email', v_email is not null and v_email <> '', 'tem_whatsapp', v_telefone is not null and v_telefone <> '');
end;
$$;
revoke all on function confirmar_presenca_convidado(text, uuid) from public;
grant execute on function confirmar_presenca_convidado(text, uuid) to anon, authenticated;

create or replace function completar_dados_convidado(
  p_slug text,
  p_convidado_id uuid,
  p_chave text,
  p_email text,
  p_whatsapp text,
  p_ofertas_love boolean,
  p_novidades_evento boolean
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_evento uuid := evento_do_convite_publicado(p_slug);
  v_extra jsonb;
  v_email text := nullif(lower(btrim(coalesce(p_email, ''))), '');
  v_whats text := nullif(regexp_replace(coalesce(p_whatsapp, ''), '\D', '', 'g'), '');
begin
  if v_evento is null then
    return jsonb_build_object('ok', false, 'erro', 'convite_nao_encontrado');
  end if;
  select extra into v_extra from convidados where id = p_convidado_id and evento_id = v_evento;
  if v_extra is null
     or coalesce(v_extra ->> 'chave_dados', '') = ''
     or v_extra ->> 'chave_dados' <> coalesce(p_chave, '')
     or (v_extra ->> 'chave_dados_expira')::timestamptz < now() then
    return jsonb_build_object('ok', false, 'erro', 'chave_invalida');
  end if;
  if v_email is not null and (length(v_email) > 200 or v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$') then
    return jsonb_build_object('ok', false, 'erro', 'email_invalido');
  end if;
  if v_whats is not null and length(v_whats) not in (10, 11) then
    return jsonb_build_object('ok', false, 'erro', 'whatsapp_invalido');
  end if;

  update convidados
     set email = coalesce(v_email, email),
         telefone = coalesce(v_whats, telefone),
         extra = (coalesce(extra, '{}'::jsonb) - 'chave_dados' - 'chave_dados_expira')
                 || jsonb_build_object('consentimentos', jsonb_build_object(
                      'ofertas_love', coalesce(p_ofertas_love, false),
                      'novidades_evento', coalesce(p_novidades_evento, false),
                      'em', now()::text,
                      'origem', 'convite'))
   where id = p_convidado_id and evento_id = v_evento;
  return jsonb_build_object('ok', true);
end;
$$;
revoke all on function completar_dados_convidado(text, uuid, text, text, text, boolean, boolean) from public;
grant execute on function completar_dados_convidado(text, uuid, text, text, text, boolean, boolean) to anon, authenticated;
