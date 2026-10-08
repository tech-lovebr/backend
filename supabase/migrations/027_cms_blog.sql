-- ==============================================================================
-- LOVE — CMS do blog
--
-- Rode no SQL Editor DEPOIS do 026_score_fornecedor.sql. É idempotente.
--
-- Artigos escritos no Admin e publicados no site. O corpo é HTML gerado pelo
-- editor — guardar HTML, e não markdown, evita um passo de conversão entre o
-- que o autor vê ao escrever e o que o leitor recebe.
--
-- "lixo" é um estado, não uma exclusão: o WordPress ensinou que quem apaga um
-- artigo quase sempre quer poder voltar atrás.
-- ==============================================================================


-- ------------------------------------------------------------------
-- 1. Categorias
-- ------------------------------------------------------------------

create table if not exists artigo_categorias (
  id uuid primary key default gen_random_uuid(),
  nome text not null unique,
  slug text not null unique,
  created_at timestamptz not null default now()
);

alter table artigo_categorias enable row level security;

drop policy if exists "artigo_categorias_leitura" on artigo_categorias;
create policy "artigo_categorias_leitura" on artigo_categorias
  for select to anon, authenticated using (true);

drop policy if exists "artigo_categorias_admin" on artigo_categorias;
create policy "artigo_categorias_admin" on artigo_categorias
  for all to authenticated using (is_admin()) with check (is_admin());

insert into artigo_categorias (nome, slug) values
  ('Casamento', 'casamento'),
  ('Festas', 'festas'),
  ('Fornecedores', 'fornecedores'),
  ('Dicas', 'dicas'),
  ('Sem categoria', 'sem-categoria')
on conflict (slug) do nothing;


-- ------------------------------------------------------------------
-- 2. Artigos
-- ------------------------------------------------------------------

create table if not exists artigos (
  id uuid primary key default gen_random_uuid(),
  titulo text not null,
  slug text unique,
  resumo text,
  conteudo text,
  imagem_destaque_url text,

  status text not null default 'rascunho'
    check (status in ('rascunho', 'publicado', 'lixo')),

  autor_id uuid references auth.users(id) on delete set null,
  autor_nome text,

  publicado_em timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists artigos_status_idx on artigos (status, publicado_em desc nulls last);

alter table artigos enable row level security;

-- O site lê só o que está publicado; rascunho e lixo são do Admin.
drop policy if exists "artigos_publicos" on artigos;
create policy "artigos_publicos" on artigos
  for select to anon, authenticated using (status = 'publicado');

drop policy if exists "artigos_admin" on artigos;
create policy "artigos_admin" on artigos
  for all to authenticated using (is_admin()) with check (is_admin());

create or replace function touch_artigos()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists artigos_touch on artigos;
create trigger artigos_touch before update on artigos
  for each row execute function touch_artigos();


-- ------------------------------------------------------------------
-- 3. Artigo ↔ categoria (um artigo pode estar em várias)
-- ------------------------------------------------------------------

create table if not exists artigo_categoria (
  artigo_id uuid not null references artigos(id) on delete cascade,
  categoria_id uuid not null references artigo_categorias(id) on delete cascade,
  primary key (artigo_id, categoria_id)
);

alter table artigo_categoria enable row level security;

drop policy if exists "artigo_categoria_leitura" on artigo_categoria;
create policy "artigo_categoria_leitura" on artigo_categoria
  for select to anon, authenticated using (true);

drop policy if exists "artigo_categoria_admin" on artigo_categoria;
create policy "artigo_categoria_admin" on artigo_categoria
  for all to authenticated using (is_admin()) with check (is_admin());


-- ------------------------------------------------------------------
-- 4. Imagens dos artigos
--    Bucket público: a capa é lida pelo site sem login. Só o admin
--    escreve — senão qualquer pessoa logada subiria arquivo.
-- ------------------------------------------------------------------

insert into storage.buckets (id, name, public)
values ('blog', 'blog', true)
on conflict (id) do nothing;

drop policy if exists "blog_leitura_publica" on storage.objects;
create policy "blog_leitura_publica" on storage.objects
  for select to anon, authenticated using (bucket_id = 'blog');

drop policy if exists "blog_escrita_admin" on storage.objects;
create policy "blog_escrita_admin" on storage.objects
  for insert to authenticated with check (bucket_id = 'blog' and is_admin());

drop policy if exists "blog_remocao_admin" on storage.objects;
create policy "blog_remocao_admin" on storage.objects
  for delete to authenticated using (bucket_id = 'blog' and is_admin());
