-- ==============================================================================
-- LOVE — Cadastro de fornecedor criado pelo Admin
--
-- Rode no SQL Editor DEPOIS do 029_historico_legal.sql. É idempotente.
--
-- O formulário de Configurações do Hub tem dois campos que nunca existiram
-- no banco — data de nascimento e logotipo — porque viviam só no
-- localStorage. Para o Admin conseguir cadastrar um fornecedor completo,
-- eles precisam existir aqui.
-- ==============================================================================

alter table fornecedores add column if not exists birth_date date;
alter table fornecedores add column if not exists logo_url text;

comment on column fornecedores.birth_date is
  'Data de nascimento do responsável. Antes vivia só no navegador dele.';
comment on column fornecedores.logo_url is
  'Logotipo da empresa. avatar_url é a foto do responsável — são coisas diferentes.';


-- ------------------------------------------------------------------
-- Imagens de perfil e logotipo
--   Bucket público: avatar e logo aparecem na vitrine, lidos sem login.
--   Escrita do próprio fornecedor ou do admin.
-- ------------------------------------------------------------------

insert into storage.buckets (id, name, public)
values ('fornecedores', 'fornecedores', true)
on conflict (id) do nothing;

drop policy if exists "fornecedores_img_leitura" on storage.objects;
create policy "fornecedores_img_leitura" on storage.objects
  for select to anon, authenticated using (bucket_id = 'fornecedores');

drop policy if exists "fornecedores_img_escrita" on storage.objects;
create policy "fornecedores_img_escrita" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'fornecedores' and (is_admin() or auth.uid() is not null));

drop policy if exists "fornecedores_img_remocao" on storage.objects;
create policy "fornecedores_img_remocao" on storage.objects
  for delete to authenticated using (bucket_id = 'fornecedores' and is_admin());
