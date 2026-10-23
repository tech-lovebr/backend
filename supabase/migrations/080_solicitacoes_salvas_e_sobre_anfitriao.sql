-- 080 — Análise de solicitação (Hub › Buscar eventos):
--   1) "Salvar vaga": a empresa guarda solicitações para ver depois.
--   2) "Sobre o anfitrião": nome, foto, cidade, membro desde e se tem CPF e
--      telefone cadastrados — sem expor o CPF nem o telefone.
-- Rode no SQL Editor. Idempotente.

create table if not exists pedidos_salvos (
  fornecedor_id uuid not null references fornecedores(id) on delete cascade,
  pedido_id uuid not null references pedidos_orcamento(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (fornecedor_id, pedido_id)
);

alter table pedidos_salvos enable row level security;

drop policy if exists "pedidos_salvos_empresa" on pedidos_salvos;
create policy "pedidos_salvos_empresa" on pedidos_salvos
  for all to authenticated
  using (exists (select 1 from fornecedores f where f.id = fornecedor_id and f.dono_id = auth.uid()))
  with check (exists (select 1 from fornecedores f where f.id = fornecedor_id and f.dono_id = auth.uid()));

-- Só para quem tem empresa no Hub; devolve apenas se o anfitrião tem um
-- pedido aberto (ou já recebeu proposta da empresa).
create or replace function public.sobre_anfitriao(p_cliente uuid)
returns table (
  nome text,
  avatar_url text,
  cidade text,
  membro_desde timestamptz,
  tem_cpf boolean,
  tem_telefone boolean
)
language sql
stable
security definer
set search_path = public
as $$
  select
    coalesce(nullif(btrim(c.full_name), ''), nullif(btrim(concat_ws(' ', c.first_name, c.last_name)), ''), c.couple_name),
    c.avatar_url,
    c.city,
    c.created_at,
    coalesce(btrim(c.cpf), '') <> '',
    coalesce(btrim(c.phone), '') <> ''
  from clientes c
  where c.id = p_cliente
    and exists (select 1 from fornecedores f where f.dono_id = auth.uid())
    and exists (select 1 from pedidos_orcamento p where p.cliente_id = c.id);
$$;

revoke all on function public.sobre_anfitriao(uuid) from public, anon;
grant execute on function public.sobre_anfitriao(uuid) to authenticated;
