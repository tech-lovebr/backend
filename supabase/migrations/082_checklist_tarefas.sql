-- 082 — Checklist do evento (Convidados › Checklist).
-- Tarefas com prazo, categoria, responsável, notas e orçamento. Na primeira
-- vez que o evento abre o Checklist, a plataforma cria as tarefas sugeridas
-- com os prazos calculados pela data do evento.
create table if not exists checklist_tarefas (
  id uuid primary key default gen_random_uuid(),
  evento_id uuid not null references eventos(id) on delete cascade,
  titulo text not null check (char_length(titulo) between 1 and 140),
  categoria text not null default 'Geral',
  prazo date,
  concluida boolean not null default false,
  responsavel text,
  notas text check (notas is null or char_length(notas) <= 1000),
  orcamento numeric check (orcamento is null or orcamento >= 0),
  busca_fornecedor text,
  ordem integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists checklist_tarefas_evento_idx on checklist_tarefas (evento_id, ordem);

alter table checklist_tarefas enable row level security;

-- Quem vê o evento (criador e co-anfitriões) gerencia o checklist.
drop policy if exists "checklist_tarefas_evento" on checklist_tarefas;
create policy "checklist_tarefas_evento" on checklist_tarefas
  for all to authenticated
  using (pode_ver_evento(evento_id))
  with check (pode_ver_evento(evento_id));
