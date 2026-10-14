-- ==============================================================================
-- LOVE — Bucket de Storage `fornecedores` (portfólio, avatar e logotipo)
--
-- Rode este arquivo inteiro no SQL Editor do Supabase. É idempotente.
--
-- O Hub (Configurações › Minha Empresa › Portfólio) e o Admin (cadastro de
-- fornecedor) sobem imagens pro bucket `fornecedores`, mas o bucket nunca
-- foi criado no projeto — o trecho da migration 030 que o criava não chegou
-- a ser executado, e a API responde "Bucket not found" em todo upload.
--
-- Este arquivo cria o bucket (público: a vitrine do anfitrião lê as fotos
-- sem login) e refaz as policies. Novidade em relação à 030: o próprio
-- fornecedor pode apagar os arquivos da pasta portfolio/<seu id>/ — antes
-- remover uma foto só tirava ela da lista e o arquivo ficava órfão.
-- ==============================================================================

-- 1. Bucket --------------------------------------------------------------------
--    Só imagem, até 10 MB por arquivo.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'fornecedores', 'fornecedores', true,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif']
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;


-- 2. Policies -----------------------------------------------------------------

-- Leitura pública: avatar, logo e portfólio aparecem na vitrine.
drop policy if exists "fornecedores_img_leitura" on storage.objects;
create policy "fornecedores_img_leitura" on storage.objects
  for select to anon, authenticated using (bucket_id = 'fornecedores');

-- Escrita de quem está logado (fornecedor no Hub ou admin no Admin).
drop policy if exists "fornecedores_img_escrita" on storage.objects;
create policy "fornecedores_img_escrita" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'fornecedores' and (is_admin() or auth.uid() is not null));

-- Remoção: admin apaga qualquer arquivo; o fornecedor, só os da própria
-- pasta de portfólio (portfolio/<auth.uid()>/...).
drop policy if exists "fornecedores_img_remocao" on storage.objects;
create policy "fornecedores_img_remocao" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'fornecedores'
    and (
      is_admin()
      or name like 'portfolio/' || auth.uid()::text || '/%'
    )
  );
