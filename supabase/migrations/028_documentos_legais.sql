-- ==============================================================================
-- LOVE — Termos de uso e política de privacidade
--
-- Rode no SQL Editor DEPOIS do 027_cms_blog.sql. É idempotente.
--
-- Os dois textos passam a viver no banco e a ser editados no Admin, em vez
-- de ficarem fixos no HTML de cada plataforma. São lidos sem login: quem
-- ainda não tem conta precisa poder ler antes de aceitar.
--
-- `vigente_desde` é separado de `updated_at` de propósito: corrigir uma
-- vírgula não é uma nova versão dos termos, e só a data que o admin marcar
-- como vigência é a que o usuário vê.
-- ==============================================================================

create table if not exists documentos_legais (
  slug text primary key check (slug in ('termos', 'privacidade')),
  titulo text not null,
  conteudo text,
  vigente_desde date,
  atualizado_por uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now()
);

alter table documentos_legais enable row level security;

drop policy if exists "documentos_legais_leitura" on documentos_legais;
create policy "documentos_legais_leitura" on documentos_legais
  for select to anon, authenticated using (true);

drop policy if exists "documentos_legais_admin" on documentos_legais;
create policy "documentos_legais_admin" on documentos_legais
  for all to authenticated using (is_admin()) with check (is_admin());

create or replace function touch_documentos_legais()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists documentos_legais_touch on documentos_legais;
create trigger documentos_legais_touch before update on documentos_legais
  for each row execute function touch_documentos_legais();

insert into documentos_legais (slug, titulo) values
  ('termos', 'Termos de uso'),
  ('privacidade', 'Política de privacidade')
on conflict (slug) do nothing;
