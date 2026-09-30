-- ==============================================================================
-- LOVE — Vendas: benefícios/serviços e pacotes da Love Viagens
--
-- Rode no SQL Editor do Supabase DEPOIS do 012_conteudo_faq.sql. É idempotente.
--
-- Duas coisas que o admin passa a vender e precificar dentro da plataforma
-- dos noivos:
--   • serviços e benefícios (seguro de saúde, assistência, garantias…), que
--     aparecem na página de benefícios;
--   • pacotes de viagem da Love Viagens.
-- ==============================================================================


-- ------------------------------------------------------------------
-- 1. Serviços e benefícios oferecidos na plataforma
-- ------------------------------------------------------------------

create table if not exists servicos_beneficios (
  id uuid primary key default gen_random_uuid(),

  nome text not null,
  categoria text,                 -- seguro, saúde, assistência, garantia…
  parceiro text,                  -- quem presta o serviço
  descricao text,
  imagem_url text,
  link_url text,

  -- Preço mostrado ao cliente. `preco_de` só é usado quando há promoção.
  preco numeric not null default 0,
  preco_de numeric,
  periodicidade text not null default 'mensal'
    check (periodicidade in ('unico', 'mensal', 'anual')),

  destaque boolean not null default false,
  posicao int not null default 0,
  ativo boolean not null default true,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);


-- ------------------------------------------------------------------
-- 2. Pacotes da Love Viagens
-- ------------------------------------------------------------------

create table if not exists viagens_pacotes (
  id uuid primary key default gen_random_uuid(),

  titulo text not null,
  destino text,
  descricao text,
  imagem_url text,

  preco numeric not null default 0,
  preco_de numeric,
  parcelas int not null default 1,

  duracao_noites int,
  data_inicio date,
  data_fim date,
  vagas int,
  vagas_vendidas int not null default 0,

  -- Lista livre do que está incluso: ["Aéreo", "Café da manhã", ...]
  inclui jsonb not null default '[]',

  tipo text not null default 'lua_de_mel'
    check (tipo in ('lua_de_mel', 'destination_wedding', 'experiencia', 'outro')),

  destaque boolean not null default false,
  posicao int not null default 0,
  ativo boolean not null default true,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists servicos_beneficios_idx on servicos_beneficios (posicao);
create index if not exists viagens_pacotes_idx on viagens_pacotes (posicao);


-- ------------------------------------------------------------------
-- 3. RLS — a plataforma lê o que está ativo; só o admin escreve
-- ------------------------------------------------------------------

do $$
declare t text;
begin
  foreach t in array array['servicos_beneficios', 'viagens_pacotes']
  loop
    execute format('alter table %I enable row level security;', t);

    execute format('drop policy if exists "%1$s_publico_select" on %1$I;', t);
    execute format(
      'create policy "%1$s_publico_select" on %1$I for select to anon, authenticated using (ativo);',
      t
    );

    execute format('drop policy if exists "%1$s_admin_all" on %1$I;', t);
    execute format(
      'create policy "%1$s_admin_all" on %1$I for all to authenticated '
      'using (is_admin()) with check (is_admin());',
      t
    );
  end loop;
end $$;


-- ------------------------------------------------------------------
-- 4. updated_at automático
-- ------------------------------------------------------------------

create or replace function touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists servicos_beneficios_touch on servicos_beneficios;
create trigger servicos_beneficios_touch
  before update on servicos_beneficios
  for each row execute function touch_updated_at();

drop trigger if exists viagens_pacotes_touch on viagens_pacotes;
create trigger viagens_pacotes_touch
  before update on viagens_pacotes
  for each row execute function touch_updated_at();
