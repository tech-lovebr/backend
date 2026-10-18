-- ==============================================================================
-- 070: Verificação de conta (Hub › Configurações › Segurança › Verificar)
--
-- O fornecedor envia o Cartão CNPJ e a CNH/RG do sócio (obrigatórios) e a
-- inscrição municipal (opcional). Os arquivos vão para um bucket PRIVADO
-- ("verificacao"): só quem enviou e o Admin conseguem abrir. Cada envio vira
-- uma linha em verificacoes_conta (em_analise → aprovada / recusada pelo
-- Admin). Aprovada marca fornecedores.conta_verificada.
--
-- Rode DEPOIS da 066. É idempotente.
-- ==============================================================================

alter table public.fornecedores add column if not exists conta_verificada boolean not null default false;

create table if not exists public.verificacoes_conta (
  id uuid primary key default gen_random_uuid(),
  fornecedor_id uuid not null references public.fornecedores(id) on delete cascade,
  enviado_por uuid references auth.users(id) on delete set null default auth.uid(),
  documentos jsonb not null default '{}',
  status text not null default 'em_analise' check (status in ('em_analise', 'aprovada', 'recusada')),
  motivo text,
  analisado_por uuid references auth.users(id) on delete set null,
  analisado_em timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists verificacoes_conta_fornecedor_idx on public.verificacoes_conta (fornecedor_id, created_at desc);

comment on column public.verificacoes_conta.documentos is
  'Caminhos no bucket "verificacao": {cnpj, socio, inscricao_municipal}.';

alter table public.verificacoes_conta enable row level security;

drop policy if exists "verificacoes_select" on public.verificacoes_conta;
create policy "verificacoes_select" on public.verificacoes_conta
  for select to authenticated using (e_minha_empresa(fornecedor_id) or is_admin());

drop policy if exists "verificacoes_insert" on public.verificacoes_conta;
create policy "verificacoes_insert" on public.verificacoes_conta
  for insert to authenticated with check (e_minha_empresa(fornecedor_id) and status = 'em_analise');

drop policy if exists "verificacoes_update_admin" on public.verificacoes_conta;
create policy "verificacoes_update_admin" on public.verificacoes_conta
  for update to authenticated using (is_admin()) with check (is_admin());

-- Aprovada pelo Admin: a empresa fica verificada (recusada: deixa de ficar).
create or replace function public.verificacao_atualiza_empresa()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status is distinct from old.status then
    update fornecedores set conta_verificada = (new.status = 'aprovada') where id = new.fornecedor_id;
    new.analisado_em := coalesce(new.analisado_em, now());
    new.analisado_por := coalesce(new.analisado_por, auth.uid());
  end if;
  return new;
end;
$$;

drop trigger if exists verificacao_atualiza_empresa on public.verificacoes_conta;
create trigger verificacao_atualiza_empresa
  before update on public.verificacoes_conta
  for each row execute function public.verificacao_atualiza_empresa();

-- Bucket privado dos documentos: pasta = id do login (verificacao/<login>/...).
insert into storage.buckets (id, name, public)
values ('verificacao', 'verificacao', false)
on conflict (id) do nothing;

drop policy if exists "verificacao_envio" on storage.objects;
create policy "verificacao_envio" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'verificacao' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "verificacao_leitura" on storage.objects;
create policy "verificacao_leitura" on storage.objects
  for select to authenticated
  using (bucket_id = 'verificacao' and ((storage.foldername(name))[1] = auth.uid()::text or is_admin()));
