-- ==============================================================================
-- LOVE — Histórico de atualizações dos documentos legais
--
-- Rode no SQL Editor DEPOIS do 028_documentos_legais.sql. É idempotente.
--
-- A vigência deixa de ser um campo: ela é a data da última atualização, que
-- o banco já registra. Em troca, cada edição passa a virar uma linha de
-- histórico — com quem fez e o texto daquele momento.
--
-- Guardar o texto, e não só a data, é o que torna o histórico útil num
-- documento legal: daqui a um ano, saber *que* mudou em março vale mais do
-- que saber que algo mudou.
--
-- O registro é feito por trigger, não pelo Admin: assim nenhuma edição
-- escapa, venha de onde vier.
-- ==============================================================================

alter table documentos_legais drop column if exists vigente_desde;

create table if not exists documento_legal_versoes (
  id uuid primary key default gen_random_uuid(),
  slug text not null references documentos_legais(slug) on delete cascade,
  conteudo text,
  autor_id uuid references auth.users(id) on delete set null,
  autor_nome text,
  created_at timestamptz not null default now()
);

create index if not exists documento_legal_versoes_idx
  on documento_legal_versoes (slug, created_at desc);

alter table documento_legal_versoes enable row level security;

-- Leitura liberada: o histórico de um documento público também é público.
drop policy if exists "documento_legal_versoes_leitura" on documento_legal_versoes;
create policy "documento_legal_versoes_leitura" on documento_legal_versoes
  for select to anon, authenticated using (true);

-- Ninguém escreve à mão: só o trigger, que roda como dono da função.
drop policy if exists "documento_legal_versoes_admin" on documento_legal_versoes;
create policy "documento_legal_versoes_admin" on documento_legal_versoes
  for all to authenticated using (is_admin()) with check (is_admin());


create or replace function registrar_versao_legal()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  nome text;
begin
  -- Edição que não mexeu no texto não é uma versão nova.
  if new.conteudo is not distinct from old.conteudo then
    return new;
  end if;

  select a.name into nome from admins a where a.id = new.atualizado_por;

  insert into documento_legal_versoes (slug, conteudo, autor_id, autor_nome)
  values (new.slug, new.conteudo, new.atualizado_por, coalesce(nullif(nome, ''), 'Equipe Love'));

  return new;
end;
$$;

drop trigger if exists documentos_legais_versao on documentos_legais;
create trigger documentos_legais_versao
  after update on documentos_legais
  for each row execute function registrar_versao_legal();
