-- ==============================================================================
-- LOVE — Save the Date por link (love.com.br/<slug>/save-the-date)
--
-- Rode no SQL Editor DEPOIS da 065 (bucket clientes) e da 067. É idempotente.
--
-- Ao compartilhar o Save the Date, a imagem dele sobe para o bucket público
-- `clientes` em savethedate/<id de quem compartilha>/<id do evento>.jpg (um
-- arquivo por evento, regravado a cada compartilhamento — não acumula) e a
-- cópia publicada vai para convite_digital_pages (page_key 'savethedate').
-- A página pública do link lê só a imagem e o texto pela função abaixo.
-- ==============================================================================

-- 1. Storage: além da foto de perfil (avatar/<id>/), a imagem do Save the Date.
drop policy if exists "clientes_img_escrita" on storage.objects;
create policy "clientes_img_escrita" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'clientes'
    and (name like 'avatar/' || auth.uid()::text || '/%' or name like 'savethedate/' || auth.uid()::text || '/%')
  );

-- Regravar o mesmo arquivo (upsert) precisa de update.
drop policy if exists "clientes_img_atualizacao" on storage.objects;
create policy "clientes_img_atualizacao" on storage.objects
  for update to authenticated
  using (bucket_id = 'clientes' and name like 'savethedate/' || auth.uid()::text || '/%')
  with check (bucket_id = 'clientes' and name like 'savethedate/' || auth.uid()::text || '/%');

drop policy if exists "clientes_img_remocao" on storage.objects;
create policy "clientes_img_remocao" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'clientes'
    and (is_admin() or name like 'avatar/' || auth.uid()::text || '/%' or name like 'savethedate/' || auth.uid()::text || '/%')
  );


-- 2. Página pública do link: só imagem, texto e título do evento.
create or replace function save_the_date_publico(p_slug text)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
           'titulo', e.titulo,
           'imagem', c.published_state -> 'compartilhamento' ->> 'imagem',
           'texto', c.published_state -> 'compartilhamento' ->> 'texto',
           'atualizado_em', c.published_at
         )
    from eventos e
    join convite_digital_pages c
      on c.evento_id = e.id
     and c.page_key = 'savethedate'
   where e.slug = p_slug
     and e.deleted_at is null
     and c.published_state ? 'compartilhamento'
   limit 1
$$;

revoke all on function save_the_date_publico(text) from public;
grant execute on function save_the_date_publico(text) to anon, authenticated;
