-- ==============================================================================
-- LOVE B2B — Sessões no site do fornecedor (Analytics do dashboard do Hub)
--
-- Cada visita ao site publicado do fornecedor (<slug>.love.com.br no Pro ou
-- hub.love.com.br/<slug> no Gratuito) registra UMA linha por sessão do
-- navegador (o id da sessão é gerado no site e vive enquanto a aba/janela
-- estiver aberta). O dashboard do Hub conta as linhas do período escolhido.
--
-- Quem visita não está logado: o registro passa pela function
-- registrar_visita_site (security definer), que só aceita slug de site
-- publicado e ignora o próprio dono olhando o site logado no Hub.
-- O fornecedor só lê as visitas dele; o Admin lê todas.
--
-- Rode este arquivo inteiro no SQL Editor do Supabase. É idempotente.
-- ==============================================================================

create table if not exists site_visitas (
  id            bigserial primary key,
  fornecedor_id uuid not null references fornecedores(id) on delete cascade,
  sessao        text not null,
  referrer      text,
  criado_em     timestamptz not null default now(),
  unique (fornecedor_id, sessao)
);

create index if not exists site_visitas_fornecedor_data
  on site_visitas (fornecedor_id, criado_em desc);

alter table site_visitas enable row level security;

drop policy if exists "site_visitas_select_dono" on site_visitas;
create policy "site_visitas_select_dono" on site_visitas
  for select to authenticated
  using (fornecedor_id = auth.uid());

drop policy if exists "site_visitas_admin_all" on site_visitas;
create policy "site_visitas_admin_all" on site_visitas
  for all to authenticated
  using (is_admin()) with check (is_admin());

create or replace function registrar_visita_site(p_slug text, p_sessao text, p_referrer text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_fornecedor uuid;
begin
  if p_slug is null or p_sessao is null or length(p_sessao) < 8 or length(p_sessao) > 64 then
    return;
  end if;

  select sp.fornecedor_id into v_fornecedor
  from site_pages sp
  where sp.slug = lower(p_slug)
  limit 1;

  -- Site inexistente ou o próprio dono olhando o site: não conta.
  if v_fornecedor is null or v_fornecedor = auth.uid() then
    return;
  end if;

  insert into site_visitas (fornecedor_id, sessao, referrer)
  values (v_fornecedor, p_sessao, left(p_referrer, 500))
  on conflict (fornecedor_id, sessao) do nothing;
end;
$$;

revoke all on function registrar_visita_site(text, text, text) from public;
grant execute on function registrar_visita_site(text, text, text) to anon, authenticated;
