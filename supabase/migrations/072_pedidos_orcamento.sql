-- 072 — Pedidos de orçamento (RFP) dos anfitriões.
--
-- O anfitrião descreve o que precisa (categoria, data, local, convidados,
-- faixa de orçamento e detalhes) em Fornecedores › Pedidos de orçamento.
-- O pedido aberto aparece para os fornecedores no Hub, que enviam propostas
-- pela Love — telefone e WhatsApp do anfitrião nunca ficam expostos.

create table if not exists pedidos_orcamento (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references clientes(id) on delete cascade,
  evento_id uuid references eventos(id) on delete set null,

  -- Etapa 1: o que precisa
  categoria text not null,                       -- fotografia, buffet, espaco, decoracao, musica, assessoria, bebidas, doces
  especialidades text[] not null default '{}',   -- tags da categoria (ex.: Drone, Álbum impresso)

  -- Etapa 2: evento e logística
  tipo_celebracao text not null,                 -- casamento, aniversario, bodas, noivado, formatura, corporativo
  data_evento date,
  data_flexivel boolean not null default false,
  cep text,
  cidade text not null,
  bairro text,
  uf text not null,
  convidados text not null,                      -- ate-50, 50-100, 100-200, 200-mais
  periodo text not null,                         -- diurno, noturno, horas
  horas_servico integer,

  -- Etapa 3: orçamento e detalhes
  faixa text not null,                           -- economico, moderado, premium, exclusivo
  valor_min numeric,
  valor_max numeric,
  aceita_fora_da_faixa boolean not null default false,
  descricao text not null check (char_length(descricao) between 50 and 1000),
  referencias text[] not null default '{}',      -- URLs das fotos de referência (bucket clientes, pasta pedidos/<cliente>/)

  -- Etapa 4: publicação
  limite_propostas integer,                      -- null = sem limite
  status text not null default 'aberto' check (status in ('aberto', 'fechado', 'cancelado')),
  propostas_recebidas integer not null default 0,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists pedidos_orcamento_cliente_idx on pedidos_orcamento (cliente_id, created_at desc);
create index if not exists pedidos_orcamento_feed_idx on pedidos_orcamento (status, categoria, created_at desc);

alter table pedidos_orcamento enable row level security;

-- Anfitrião: vê, cria, altera e apaga só os próprios pedidos.
drop policy if exists "pedidos_orcamento_dono" on pedidos_orcamento;
create policy "pedidos_orcamento_dono" on pedidos_orcamento
  for all to authenticated
  using (cliente_id = auth.uid())
  with check (cliente_id = auth.uid());

-- Fornecedores (logins com empresa no Hub) leem os pedidos abertos.
drop policy if exists "pedidos_orcamento_fornecedores" on pedidos_orcamento;
create policy "pedidos_orcamento_fornecedores" on pedidos_orcamento
  for select to authenticated
  using (
    status = 'aberto'
    and exists (select 1 from fornecedores f where f.dono_id = auth.uid())
  );

-- Admin vê tudo.
drop policy if exists "pedidos_orcamento_admin" on pedidos_orcamento;
create policy "pedidos_orcamento_admin" on pedidos_orcamento
  for select to authenticated
  using (is_admin());

-- updated_at automático.
create or replace function pedidos_orcamento_tocar()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;
drop trigger if exists pedidos_orcamento_tocar on pedidos_orcamento;
create trigger pedidos_orcamento_tocar before update on pedidos_orcamento
  for each row execute function pedidos_orcamento_tocar();

-- Storage: fotos de referência em clientes/pedidos/<cliente>/ (além da foto de
-- perfil e da imagem do Save the Date).
drop policy if exists "clientes_img_escrita" on storage.objects;
create policy "clientes_img_escrita" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'clientes'
    and (
      name like 'avatar/' || auth.uid()::text || '/%'
      or name like 'savethedate/' || auth.uid()::text || '/%'
      or name like 'pedidos/' || auth.uid()::text || '/%'
    )
  );

drop policy if exists "clientes_img_remocao" on storage.objects;
create policy "clientes_img_remocao" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'clientes'
    and (
      is_admin()
      or name like 'avatar/' || auth.uid()::text || '/%'
      or name like 'savethedate/' || auth.uid()::text || '/%'
      or name like 'pedidos/' || auth.uid()::text || '/%'
    )
  );
