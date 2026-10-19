-- 071 — Templates padrão do Convite digital por tipo de evento.
--
-- Quem cria um evento novo já recebe o Convite digital montado a partir do
-- template do tipo (casamento, aniversário…), em vez de começar do zero.
-- O template é uma cópia do Convite digital de um evento-modelo feito na
-- plataforma; para trocar, é só salvar de novo a partir de outro evento.

create table if not exists convite_templates_padrao (
  tipo text primary key,                 -- tipo do evento no app: wedding, birthday, anniversary…
  state jsonb not null,                  -- o Convite digital (mesmo formato de convite_digital_pages.state)
  origem_evento_id uuid,                 -- evento de onde o template foi copiado
  origem_titulo text,
  updated_at timestamptz not null default now()
);

alter table convite_templates_padrao enable row level security;

-- Leitura liberada (o app lê o template ao criar o evento); gravação só pelo
-- SQL Editor / função abaixo.
drop policy if exists "convite_templates_padrao_leitura" on convite_templates_padrao;
create policy "convite_templates_padrao_leitura" on convite_templates_padrao
  for select using (true);

-- Salva como template do tipo o Convite digital do evento cujo título bate
-- com o padrão (ilike; o mais recente, se houver mais de um). Uso:
--   select * from salvar_template_padrao('wedding', '%casamento%vi%tor%');
create or replace function salvar_template_padrao(p_tipo text, p_titulo text)
returns table (tipo text, origem_titulo text, origem_evento_id uuid, atualizado_em timestamptz)
language plpgsql
security definer
set search_path = public
as $$
#variable_conflict use_column
begin
  return query
  with origem as (
    select e.id, e.titulo, c.state
    from eventos e
    join convite_digital_pages c on c.evento_id = e.id and c.page_key = 'convite'
    where e.deleted_at is null
      and e.titulo ilike p_titulo
    order by c.updated_at desc nulls last
    limit 1
  ), gravado as (
    insert into convite_templates_padrao as t (tipo, state, origem_evento_id, origem_titulo, updated_at)
    select p_tipo, o.state, o.id, o.titulo, now() from origem o
    on conflict (tipo) do update
      set state = excluded.state,
          origem_evento_id = excluded.origem_evento_id,
          origem_titulo = excluded.origem_titulo,
          updated_at = now()
    returning t.tipo, t.origem_titulo, t.origem_evento_id, t.updated_at
  )
  select * from gravado;
end;
$$;

revoke all on function salvar_template_padrao(text, text) from public, anon, authenticated;

-- Casamento: o template feito no evento "Casamento de Vitor".
select * from salvar_template_padrao('wedding', '%casamento%vi%tor%');
