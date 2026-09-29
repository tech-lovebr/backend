-- ==============================================================================
-- LOVE — Conteúdo editorial das duas plataformas, gerenciado pelo Admin
--
-- Rode no SQL Editor do Supabase DEPOIS do 004_admin.sql. É idempotente.
--
-- Alimenta os dashboards de conteúdo em Contas → Fornecedores → Dashboard e
-- Contas → Clientes → Dashboard: banner da home, guias de primeiros passos,
-- benefícios associados e serviços. O admin escreve; as plataformas só leem.
-- ==============================================================================

create table if not exists conteudo_plataforma (
  id uuid primary key default gen_random_uuid(),

  -- Em qual das duas plataformas este bloco aparece.
  plataforma text not null check (plataforma in ('fornecedor', 'cliente')),

  -- Qual área da plataforma ele alimenta.
  secao text not null check (secao in ('banner', 'guia', 'beneficio', 'servico')),

  titulo text not null,
  subtitulo text,
  descricao text,
  imagem_url text,
  link_url text,
  link_label text,
  icone text,

  posicao int not null default 0,
  ativo boolean not null default true,

  -- Espaço para campos específicos de uma seção sem precisar de migration nova.
  extra jsonb not null default '{}',

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists conteudo_plataforma_idx
  on conteudo_plataforma (plataforma, secao, posicao);

alter table conteudo_plataforma enable row level security;

-- Leitura liberada para todo mundo (inclusive visitante sem login): é isso que
-- permite o site, o B2B e a plataforma dos noivos consumirem o conteúdo. Só
-- blocos marcados como ativos saem daqui.
drop policy if exists "conteudo_publico_select" on conteudo_plataforma;
create policy "conteudo_publico_select" on conteudo_plataforma
  for select to anon, authenticated using (ativo);

-- Escrita (e leitura dos inativos/rascunhos) é exclusiva do administrador.
drop policy if exists "conteudo_admin_all" on conteudo_plataforma;
create policy "conteudo_admin_all" on conteudo_plataforma
  for all to authenticated using (is_admin()) with check (is_admin());

-- Mantém updated_at correto sem depender do front-end.
create or replace function touch_conteudo_plataforma()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists conteudo_plataforma_touch on conteudo_plataforma;
create trigger conteudo_plataforma_touch
  before update on conteudo_plataforma
  for each row execute function touch_conteudo_plataforma();
