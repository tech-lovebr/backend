-- ==============================================================================
-- LOVE — Vitrine real de fornecedores na plataforma do anfitrião
--
-- Rode no SQL Editor. É idempotente.
--
-- O Explorar deixa de usar fornecedores de demonstração e passa a mostrar só
-- quem se cadastrou no B2B (tabela fornecedores) com pelo menos um serviço
-- ativo (tabela products). Para isso:
--
--   1. products era legível só pelo próprio fornecedor (e admin). Agora
--      qualquer usuário logado lê os serviços ATIVOS de fornecedores que não
--      estão bloqueados — escrita continua só do dono.
--   2. Favoritos do anfitrião não eram salvos em lugar nenhum (só na memória
--      da página). Nova tabela fornecedores_favoritos, cada anfitrião só
--      enxerga e mexe nos próprios.
-- ==============================================================================

-- 1. Serviços ativos visíveis na vitrine -------------------------------------
drop policy if exists "products_select_vitrine" on products;
create policy "products_select_vitrine" on products
  for select to authenticated
  using (
    active = true
    and exists (
      select 1 from fornecedores f
       where f.id = products.fornecedor_id
         and f.status <> 'bloqueado'
    )
  );

-- 2. Favoritos do anfitrião ---------------------------------------------------
create table if not exists fornecedores_favoritos (
  cliente_id    uuid not null references clientes(id) on delete cascade,
  fornecedor_id uuid not null references fornecedores(id) on delete cascade,
  created_at    timestamptz not null default now(),
  primary key (cliente_id, fornecedor_id)
);

alter table fornecedores_favoritos enable row level security;

drop policy if exists "fornecedores_favoritos_select_own" on fornecedores_favoritos;
create policy "fornecedores_favoritos_select_own" on fornecedores_favoritos
  for select to authenticated using (auth.uid() = cliente_id);

drop policy if exists "fornecedores_favoritos_insert_own" on fornecedores_favoritos;
create policy "fornecedores_favoritos_insert_own" on fornecedores_favoritos
  for insert to authenticated with check (auth.uid() = cliente_id);

drop policy if exists "fornecedores_favoritos_delete_own" on fornecedores_favoritos;
create policy "fornecedores_favoritos_delete_own" on fornecedores_favoritos
  for delete to authenticated using (auth.uid() = cliente_id);
