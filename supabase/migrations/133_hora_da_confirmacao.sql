-- 133 — Hora em que o convidado confirmou presença pelo convite.
--
-- A plataforma do anfitrião mostra a notificação "Fulano confirmou. Agora
-- são X pessoas na sua lista." e precisa saber quando foi. A chave de 1 hora
-- da migration 102 some quando o convidado completa os dados, então a hora
-- passa a ficar fixa em convidados.extra -> 'confirmado_em' (só na primeira
-- confirmação; confirmar de novo não muda a hora).
-- Mesma função da 102, só com o confirmado_em a mais. Idempotente.

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
         extra = coalesce(extra, '{}'::jsonb)
                 || jsonb_build_object(
                      'chave_dados', v_chave,
                      'chave_dados_expira', (now() + interval '1 hour')::text,
                      'confirmado_em', coalesce(extra ->> 'confirmado_em', now()::text))
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
