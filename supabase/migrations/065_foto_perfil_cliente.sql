-- ==============================================================================
-- LOVE — Foto de perfil do anfitrião (love.com.br › Configurações › Minha conta)
--
-- Rode no SQL Editor. É idempotente.
--
-- Bucket público `clientes` (só imagem, até 5 MB). Cada pessoa grava e apaga
-- apenas na própria pasta avatar/<seu id>/; a URL vai para clientes.avatar_url
-- (a policy clientes_update_own da 001 já permite o update).
-- ==============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'clientes', 'clientes', true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif']
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "clientes_img_leitura" on storage.objects;
create policy "clientes_img_leitura" on storage.objects
  for select to anon, authenticated using (bucket_id = 'clientes');

drop policy if exists "clientes_img_escrita" on storage.objects;
create policy "clientes_img_escrita" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'clientes' and name like 'avatar/' || auth.uid()::text || '/%');

drop policy if exists "clientes_img_remocao" on storage.objects;
create policy "clientes_img_remocao" on storage.objects
  for delete to authenticated
  using (bucket_id = 'clientes' and (is_admin() or name like 'avatar/' || auth.uid()::text || '/%'));
