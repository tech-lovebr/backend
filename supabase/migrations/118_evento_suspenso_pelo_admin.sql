-- ==============================================================================
-- LOVE — Evento suspenso pelo Admin
--
-- Rode no SQL Editor DEPOIS do 117. É idempotente.
--
-- Em Admin › Anfitriões › Eventos, o Admin deixa de mexer no `status` do
-- evento (rascunho / ativo / encerrado): esse é o estado que o anfitrião
-- escolhe na plataforma dele. O único poder do Admin passa a ser suspender.
--
-- Mesmo desenho do 059 (serviço suspenso pelo Admin):
--   - suspenso ≠ encerrado: encerrado é o anfitrião que encerra; suspenso é
--     o Admin, e o anfitrião não consegue tirar a suspensão;
--   - o gatilho desfaz qualquer mudança nessas colunas feita por quem não é
--     Admin, mesmo que a policy de dono deixe a linha ser atualizada.
-- ==============================================================================

alter table eventos add column if not exists suspenso boolean not null default false;
alter table eventos add column if not exists suspenso_em timestamptz;
alter table eventos add column if not exists suspenso_motivo text;

create index if not exists eventos_suspenso_idx on eventos (cliente_id) where suspenso;

create or replace function proteger_suspensao_de_evento()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if (new.suspenso is distinct from old.suspenso
      or new.suspenso_em is distinct from old.suspenso_em
      or new.suspenso_motivo is distinct from old.suspenso_motivo)
     and not is_admin() then
    new.suspenso := old.suspenso;
    new.suspenso_em := old.suspenso_em;
    new.suspenso_motivo := old.suspenso_motivo;
  end if;
  return new;
end;
$$;

drop trigger if exists eventos_proteger_suspensao on eventos;
create trigger eventos_proteger_suspensao before update on eventos
  for each row execute function proteger_suspensao_de_evento();

-- Suspender / reativar (Admin). Aceita vários de uma vez, como o 059.
create or replace function admin_suspender_eventos(p_ids uuid[], p_suspender boolean, p_motivo text default null)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_qtd integer;
begin
  if not is_admin() then
    raise exception 'Apenas administradores podem suspender eventos.';
  end if;
  update eventos
     set suspenso = p_suspender,
         suspenso_em = case when p_suspender then now() else null end,
         suspenso_motivo = case when p_suspender then nullif(btrim(coalesce(p_motivo, '')), '') else null end
   where id = any(p_ids);
  get diagnostics v_qtd = row_count;
  return v_qtd;
end;
$$;

revoke all on function admin_suspender_eventos(uuid[], boolean, text) from public, anon;
grant execute on function admin_suspender_eventos(uuid[], boolean, text) to authenticated;
