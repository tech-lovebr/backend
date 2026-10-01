-- ==============================================================================
-- LOVE — Plataforma dos noivos com dados reais por evento
--
-- Rode este arquivo inteiro no SQL Editor do Supabase, DEPOIS do 004_admin.sql.
-- É idempotente: pode rodar mais de uma vez.
--
-- Contexto: `eventos`, `convidados` e `presentes` (criadas em 004_admin.sql)
-- existem só pro relatório do Admin — a plataforma dos noivos nunca leu nem
-- gravou nelas, e ainda não existe nenhum lugar pra guardar o Convite Digital
-- (Aparência) de cada evento. Isso faz todo evento compartilhar a mesma
-- aparência/lista de convidados hoje.
--
-- O que este arquivo faz:
--   1. Corrige o tipo de evento em `eventos` pra bater com os 6 tipos reais
--      da tela de criar evento (hoje só aceitava wedding/baby/birthday/
--      corporate/other).
--   2. Adiciona uma coluna `extra jsonb` em `eventos`, `convidados` e
--      `presentes` pra guardar os campos que a tela já usa mas que não têm
--      coluna própria (hora, local, restrição alimentar, acompanhantes
--      nomeados, mensagem de quem presenteou, etc.) — sem redesenhar o banco.
--   3. Cria `convite_digital_pages`: a peça que faltava, uma linha por
--      evento + página (Convite Digital / Lista de Presentes / Dress Code)
--      guardando o JSON de seções/cores do construtor.
-- ==============================================================================


-- ------------------------------------------------------------------
-- 1. Tipos de evento reais (wedding, birthday, baby_shower, bridal_shower,
--    gender_reveal, anniversary) — substituindo o check antigo do Admin.
-- ------------------------------------------------------------------

alter table eventos drop constraint if exists eventos_tipo_check;
alter table eventos add constraint eventos_tipo_check
  check (tipo in ('wedding', 'birthday', 'baby_shower', 'bridal_shower', 'gender_reveal', 'anniversary'));


-- ------------------------------------------------------------------
-- 2. Coluna `extra` (campos soltos que a tela já usa, sem coluna própria)
-- ------------------------------------------------------------------

alter table eventos add column if not exists extra jsonb not null default '{}';
alter table convidados add column if not exists extra jsonb not null default '{}';
alter table presentes add column if not exists extra jsonb not null default '{}';


-- ------------------------------------------------------------------
-- 3. Convite Digital por evento (Aparência / Lista de Presentes / Dress Code)
-- ------------------------------------------------------------------

create table if not exists convite_digital_pages (
  id uuid primary key default gen_random_uuid(),
  evento_id uuid not null references eventos(id) on delete cascade,
  page_key text not null check (page_key in ('convite', 'presentes', 'dresscode')),
  state jsonb not null default '{}',
  published boolean not null default false,
  published_state jsonb,
  updated_at timestamptz not null default now(),
  unique (evento_id, page_key)
);

create index if not exists convite_digital_pages_evento_idx on convite_digital_pages (evento_id);

alter table convite_digital_pages enable row level security;

drop policy if exists "convite_digital_pages_owner_or_admin" on convite_digital_pages;
create policy "convite_digital_pages_owner_or_admin" on convite_digital_pages
  for all to authenticated
  using (
    is_admin() or exists (
      select 1 from eventos e where e.id = convite_digital_pages.evento_id and e.cliente_id = auth.uid()
    )
  )
  with check (
    is_admin() or exists (
      select 1 from eventos e where e.id = convite_digital_pages.evento_id and e.cliente_id = auth.uid()
    )
  );
