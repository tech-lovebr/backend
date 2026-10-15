-- ==============================================================================
-- LOVE — Favoritos por serviço + avaliações de fornecedores
--
-- Rode no SQL Editor DEPOIS do 055_rls_eventos_convidados_presentes.sql. É idempotente.
--
-- 1. servicos_favoritos — o coração do Explorar passa a marcar o SERVIÇO
--    (linha de products), não a empresa. Os favoritos antigos (por
--    fornecedor) viram favoritos de todos os serviços ativos daquela empresa,
--    para ninguém perder o que já tinha marcado.
--
-- 2. fornecedores_avaliacoes — nota de 1 a 5 e comentário que um anfitrião
--    deixa para um fornecedor. A página da empresa mostra as estrelas, a
--    quantidade e a lista. Qualquer conta logada lê; só o autor escreve.
-- ==============================================================================

-- 1. Favoritos por serviço -----------------------------------------------------
create table if not exists servicos_favoritos (
  cliente_id uuid not null references clientes(id) on delete cascade,
  produto_id uuid not null references products(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (cliente_id, produto_id)
);

alter table servicos_favoritos enable row level security;

drop policy if exists "servicos_favoritos_select_own" on servicos_favoritos;
create policy "servicos_favoritos_select_own" on servicos_favoritos
  for select to authenticated using (auth.uid() = cliente_id);

drop policy if exists "servicos_favoritos_insert_own" on servicos_favoritos;
create policy "servicos_favoritos_insert_own" on servicos_favoritos
  for insert to authenticated with check (auth.uid() = cliente_id);

drop policy if exists "servicos_favoritos_delete_own" on servicos_favoritos;
create policy "servicos_favoritos_delete_own" on servicos_favoritos
  for delete to authenticated using (auth.uid() = cliente_id);

-- Favoritos antigos (por empresa) viram favoritos dos serviços ativos dela.
insert into servicos_favoritos (cliente_id, produto_id, created_at)
select f.cliente_id, p.id, f.created_at
  from fornecedores_favoritos f
  join products p on p.fornecedor_id = f.fornecedor_id and p.active
on conflict do nothing;


-- 2. Avaliações ----------------------------------------------------------------
create table if not exists fornecedores_avaliacoes (
  id uuid primary key default gen_random_uuid(),
  fornecedor_id uuid not null references fornecedores(id) on delete cascade,
  cliente_id uuid not null references clientes(id) on delete cascade,
  nota integer not null check (nota between 1 and 5),
  comentario text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (fornecedor_id, cliente_id)
);

create index if not exists fornecedores_avaliacoes_fornecedor_idx on fornecedores_avaliacoes (fornecedor_id, created_at desc);

alter table fornecedores_avaliacoes enable row level security;

drop policy if exists "avaliacoes_select" on fornecedores_avaliacoes;
create policy "avaliacoes_select" on fornecedores_avaliacoes
  for select to authenticated using (true);

drop policy if exists "avaliacoes_insert_own" on fornecedores_avaliacoes;
create policy "avaliacoes_insert_own" on fornecedores_avaliacoes
  for insert to authenticated with check (auth.uid() = cliente_id);

drop policy if exists "avaliacoes_update_own" on fornecedores_avaliacoes;
create policy "avaliacoes_update_own" on fornecedores_avaliacoes
  for update to authenticated using (auth.uid() = cliente_id) with check (auth.uid() = cliente_id);

drop policy if exists "avaliacoes_delete_own" on fornecedores_avaliacoes;
create policy "avaliacoes_delete_own" on fornecedores_avaliacoes
  for delete to authenticated using (auth.uid() = cliente_id or is_admin());

create or replace function touch_fornecedores_avaliacoes()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists fornecedores_avaliacoes_touch on fornecedores_avaliacoes;
create trigger fornecedores_avaliacoes_touch before update on fornecedores_avaliacoes
  for each row execute function touch_fornecedores_avaliacoes();

-- Quem avaliou (nome do anfitrião) sem expor a tabela clientes inteira.
create or replace function avaliacoes_do_fornecedor(p_fornecedor_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
           'id', a.id,
           'nota', a.nota,
           'comentario', a.comentario,
           'created_at', a.created_at,
           'autor', coalesce(nullif(c.first_name, ''), split_part(coalesce(c.full_name, c.couple_name, 'Anfitrião'), ' ', 1))
         ) order by a.created_at desc), '[]'::jsonb)
    from fornecedores_avaliacoes a
    left join clientes c on c.id = a.cliente_id
   where a.fornecedor_id = p_fornecedor_id;
$$;

revoke all on function avaliacoes_do_fornecedor(uuid) from public, anon;
grant execute on function avaliacoes_do_fornecedor(uuid) to authenticated;
