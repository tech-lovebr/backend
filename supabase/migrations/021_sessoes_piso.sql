-- ==============================================================================
-- LOVE — Sessões contadas por três fontes, nunca abaixo da verdade
--
-- Rode no SQL Editor DEPOIS do 020_evento_excluido.sql. É idempotente.
--
-- A 019 contava só auth.audit_log_entries. O Supabase poda essa tabela, e em
-- projeto novo ela pode nem ter o registro ainda — o resultado era "0 entradas"
-- para quem comprovadamente entrou, o que é pior do que não mostrar nada.
--
-- Agora o número é o maior entre três fontes, nessa lógica: o registro de
-- auditoria é o mais completo quando existe; as sessões abertas servem de
-- confirmação; e last_sign_in_at garante o piso — se a pessoa já entrou uma
-- vez, o número nunca pode ser zero.
-- ==============================================================================

-- Versão base: sem o registro de auditoria, ainda assim nunca mente para baixo.
create or replace function sessoes_da_conta(p_id uuid)
returns integer
language sql
stable
security definer
set search_path = public, auth
as $$
  select (select case when u.last_sign_in_at is not null then 1 else 0 end
            from auth.users u where u.id = p_id);
$$;

do $do$
begin
  if exists (
    select 1 from information_schema.tables
     where table_schema = 'auth' and table_name = 'audit_log_entries'
  ) and exists (
    select 1 from information_schema.tables
     where table_schema = 'auth' and table_name = 'sessions'
  ) then
    execute $cmd$
      create or replace function sessoes_da_conta(p_id uuid)
      returns integer language sql stable security definer
      set search_path = public, auth
      as $fn$
        select greatest(
          -- entradas ainda registradas na auditoria
          (select count(*)::int
             from auth.audit_log_entries a
            where a.payload ->> 'actor_id' = p_id::text
              and a.payload ->> 'action' in ('login', 'user_signedup')),
          -- sessões que continuam abertas
          (select count(*)::int
             from auth.sessions s
            where s.user_id = p_id),
          -- piso: já entrou pelo menos uma vez
          (select case when u.last_sign_in_at is not null then 1 else 0 end
             from auth.users u where u.id = p_id)
        );
      $fn$;
    $cmd$;
  end if;
end
$do$;

revoke all on function sessoes_da_conta(uuid) from public, anon;
