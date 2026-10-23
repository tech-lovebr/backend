-- 086 — Verificação de identidade para sacar (Carteira › Contas bancárias).
-- Antes de cadastrar conta bancária, o anfitrião envia nome, CPF, chave Pix
-- e o RG (frente e verso). Os arquivos ficam no bucket PRIVADO "documentos",
-- numa pasta com o id do usuário; só o dono e o admin conseguem ler.
-- A Love analisa e muda o status para "aprovado" ou "recusado" (com motivo).
create table if not exists verificacoes_identidade (
  cliente_id uuid primary key references clientes(id) on delete cascade,
  nome text not null,
  cpf text not null,
  pix_tipo text not null default 'cpf',
  pix_chave text not null,
  rg_frente text not null,
  rg_verso text not null,
  status text not null default 'em_analise'
    check (status in ('em_analise', 'aprovado', 'recusado')),
  motivo text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table verificacoes_identidade enable row level security;

-- Anfitrião: vê a própria verificação e envia (ou reenvia depois de recusada),
-- sempre como "em análise". Aprovar/recusar é só do admin.
drop policy if exists "verificacao_dono_le" on verificacoes_identidade;
create policy "verificacao_dono_le" on verificacoes_identidade
  for select to authenticated
  using (cliente_id = auth.uid());

drop policy if exists "verificacao_dono_envia" on verificacoes_identidade;
create policy "verificacao_dono_envia" on verificacoes_identidade
  for insert to authenticated
  with check (cliente_id = auth.uid() and status = 'em_analise');

drop policy if exists "verificacao_dono_reenvia" on verificacoes_identidade;
create policy "verificacao_dono_reenvia" on verificacoes_identidade
  for update to authenticated
  using (cliente_id = auth.uid() and status <> 'aprovado')
  with check (cliente_id = auth.uid() and status = 'em_analise');

drop policy if exists "verificacao_admin" on verificacoes_identidade;
create policy "verificacao_admin" on verificacoes_identidade
  for all to authenticated
  using (is_admin())
  with check (is_admin());

-- Bucket privado dos documentos (RG frente e verso), até 10 MB por arquivo.
insert into storage.buckets (id, name, public, file_size_limit)
values ('documentos', 'documentos', false, 10485760)
on conflict (id) do update set public = false, file_size_limit = 10485760;

drop policy if exists "documentos_dono_envia" on storage.objects;
create policy "documentos_dono_envia" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'documentos' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "documentos_dono_le" on storage.objects;
create policy "documentos_dono_le" on storage.objects
  for select to authenticated
  using (bucket_id = 'documentos' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "documentos_admin_le" on storage.objects;
create policy "documentos_admin_le" on storage.objects
  for select to authenticated
  using (bucket_id = 'documentos' and is_admin());
