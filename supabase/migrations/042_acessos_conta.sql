-- ==============================================================================
-- LOVE — "Sessões" passa a contar acessos de verdade
--
-- Já aplicado no Supabase em 14/10/2026 (rodado pelo usuário no SQL Editor).
-- Rode DEPOIS do 041_ultimo_acesso_sessao.sql. É idempotente.
--
-- O 019 contava logins em auth.audit_log_entries. Só que quem continua
-- logado e volta ao site dia após dia nunca faz login de novo — aparecia
-- "1 sessão" para quem usa a plataforma todo dia. E o Supabase poda esse log.
--
-- Agora cada acesso fica em `acessos_conta`, uma tabela nossa que ninguém
-- poda. Conta como acesso novo:
--   * uma sessão nova (login, cadastro, entrar com Google…);
--   * a mesma sessão voltando a ser usada depois de 2 h ou mais parada.
-- Enquanto a pessoa está usando, o token renova a cada ~1 h — renovações
-- com menos de 2 h de intervalo são o mesmo acesso e não contam de novo.
--
-- O gatilho em auth.sessions engole qualquer erro: nunca derruba um login.
-- O histórico anterior não existe em lugar nenhum; o número exibido é o
-- maior entre os acessos anotados e os logins do log antigo.
-- ==============================================================================

create table if not exists acessos_conta (
  id bigserial primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  session_id uuid,
  iniciado_em timestamptz not null default now()
);
create index if not exists acessos_conta_user_idx on acessos_conta (user_id, iniciado_em desc);
alter table acessos_conta enable row level security;
drop policy if exists "acessos_conta_admin" on acessos_conta;
create policy "acessos_conta_admin" on acessos_conta for select to authenticated using (is_admin());

create or replace function registrar_acesso()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  begin
    if tg_op = 'INSERT'
       or (old.updated_at is not null and new.updated_at - old.updated_at >= interval '2 hours') then
      insert into public.acessos_conta (user_id, session_id, iniciado_em)
      values (new.user_id, new.id, coalesce(new.updated_at, now()));
    end if;
  exception when others then null;
  end;
  return new;
end; $$;
revoke all on function registrar_acesso() from public, anon, authenticated;

drop trigger if exists love_registrar_acesso on auth.sessions;
create trigger love_registrar_acesso
  after insert or update of updated_at on auth.sessions
  for each row execute function registrar_acesso();

-- Ponto de partida: as sessões abertas hoje contam como um acesso.
insert into acessos_conta (user_id, session_id, iniciado_em)
select s.user_id, s.id, s.created_at from auth.sessions s
 where not exists (select 1 from acessos_conta a where a.session_id = s.id);

-- O número que o painel mostra (admin_listar_contas já chama esta).
create or replace function sessoes_da_conta(p_id uuid)
returns integer language plpgsql stable security definer set search_path = public, auth as $$
declare n_acessos integer; n_logins integer := 0;
begin
  select count(*) into n_acessos from public.acessos_conta where user_id = p_id;
  if to_regclass('auth.audit_log_entries') is not null then
    select count(*) into n_logins from auth.audit_log_entries a
     where a.payload ->> 'actor_id' = p_id::text
       and a.payload ->> 'action' in ('login', 'user_signedup');
  end if;
  return greatest(n_acessos, n_logins);
end; $$;
revoke all on function sessoes_da_conta(uuid) from public, anon;
