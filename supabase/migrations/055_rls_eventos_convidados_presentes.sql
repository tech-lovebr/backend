-- ==============================================================================
-- LOVE — RLS em eventos, convidados e presentes (e convite_digital_pages)
--
-- Rode no SQL Editor DEPOIS do 054_organizadores.sql. É idempotente.
--
-- Até aqui essas três tabelas não tinham proteção por linha: qualquer conta
-- logada conseguia, pela API, ler e alterar eventos de outras pessoas (a
-- trava era só na tela). Agora cada linha só é vista/alterada por:
--   - o criador do evento (eventos.cliente_id = conta logada);
--   - os organizadores que aceitaram o convite (eventos_organizadores, 054);
--   - o Admin (is_admin()).
-- Quem não está logado não vê nada direto — o site público do convite e o
-- checkout usam funções SECURITY DEFINER (convite_publicado, confirmar_presenca,
-- presentear_pelo_convite), que continuam funcionando.
--
-- pode_ver_evento() é SECURITY DEFINER de propósito: as policies de eventos e
-- de eventos_organizadores olham uma para a outra, e sem isso o Postgres
-- entraria em recursão ao avaliar as duas.
-- ==============================================================================

create or replace function pode_ver_evento(p_evento_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select auth.uid() is not null and (
    exists (select 1 from eventos e where e.id = p_evento_id and e.cliente_id = auth.uid())
    or exists (select 1 from eventos_organizadores o
                where o.evento_id = p_evento_id and o.user_id = auth.uid() and o.status = 'aceito')
    or is_admin()
  );
$$;

revoke all on function pode_ver_evento(uuid) from public;
grant execute on function pode_ver_evento(uuid) to authenticated;

-- Dono do evento (ou Admin): criar, excluir.
create or replace function sou_dono_do_evento(p_evento_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select auth.uid() is not null and (
    exists (select 1 from eventos e where e.id = p_evento_id and e.cliente_id = auth.uid())
    or is_admin()
  );
$$;

revoke all on function sou_dono_do_evento(uuid) from public;
grant execute on function sou_dono_do_evento(uuid) to authenticated;


-- ------------------------------------------------------------------
-- eventos
-- ------------------------------------------------------------------
alter table eventos enable row level security;

drop policy if exists "eventos_select" on eventos;
create policy "eventos_select" on eventos
  for select to authenticated
  using (pode_ver_evento(id));

drop policy if exists "eventos_insert" on eventos;
create policy "eventos_insert" on eventos
  for insert to authenticated
  with check (cliente_id = auth.uid() or is_admin());

-- Organizador aceito também edita (site, informações, mapa de mesas...);
-- o dono não pode ser trocado por quem não é Admin.
drop policy if exists "eventos_update" on eventos;
create policy "eventos_update" on eventos
  for update to authenticated
  using (pode_ver_evento(id))
  with check (pode_ver_evento(id) and (cliente_id = (select e.cliente_id from eventos e where e.id = eventos.id) or is_admin()));

drop policy if exists "eventos_delete" on eventos;
create policy "eventos_delete" on eventos
  for delete to authenticated
  using (sou_dono_do_evento(id));


-- ------------------------------------------------------------------
-- convidados
-- ------------------------------------------------------------------
alter table convidados enable row level security;

drop policy if exists "convidados_evento" on convidados;
create policy "convidados_evento" on convidados
  for all to authenticated
  using (pode_ver_evento(evento_id))
  with check (pode_ver_evento(evento_id));


-- ------------------------------------------------------------------
-- presentes
-- ------------------------------------------------------------------
alter table presentes enable row level security;

drop policy if exists "presentes_evento" on presentes;
create policy "presentes_evento" on presentes
  for all to authenticated
  using (pode_ver_evento(evento_id))
  with check (pode_ver_evento(evento_id));


-- ------------------------------------------------------------------
-- convite_digital_pages: antes só dono/Admin; o designer convidado também
-- precisa salvar e publicar o convite.
-- ------------------------------------------------------------------
drop policy if exists "convite_digital_pages_owner_or_admin" on convite_digital_pages;
drop policy if exists "convite_digital_pages_evento" on convite_digital_pages;
create policy "convite_digital_pages_evento" on convite_digital_pages
  for all to authenticated
  using (pode_ver_evento(evento_id))
  with check (pode_ver_evento(evento_id));
