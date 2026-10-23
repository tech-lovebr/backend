-- 097 — Recado em vídeo no checkout do convite (Presentear).
--
-- O convidado pode escrever o recado ou gravar um vídeo. O vídeo sobe para o
-- bucket público "recados" (pasta video/, até 100 MB, só vídeo) e depois é
-- ligado à contribuição por anexar_video_ao_recado(). Idempotente.

alter table presentes_contribuicoes add column if not exists video_url text;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'recados', 'recados', true,
  104857600,
  array['video/mp4', 'video/quicktime', 'video/webm', 'video/3gpp', 'video/x-m4v', 'video/mpeg']
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "recados_leitura" on storage.objects;
create policy "recados_leitura" on storage.objects
  for select to anon, authenticated using (bucket_id = 'recados');

-- Convidado (sem login) só envia, dentro de video/.
drop policy if exists "recados_envio" on storage.objects;
create policy "recados_envio" on storage.objects
  for insert to anon, authenticated
  with check (bucket_id = 'recados' and name like 'video/%');

-- Liga o vídeo à contribuição recém-registrada (até 1 dia depois, uma vez só).
create or replace function anexar_video_ao_recado(p_contribuicao uuid, p_url text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_url is null or p_url not like '%/storage/v1/object/public/recados/video/%' or length(p_url) > 500 then
    return false;
  end if;
  update presentes_contribuicoes
     set video_url = p_url
   where id = p_contribuicao
     and video_url is null
     and created_at > now() - interval '1 day';
  return found;
end;
$$;

revoke all on function anexar_video_ao_recado(uuid, text) from public;
grant execute on function anexar_video_ao_recado(uuid, text) to anon, authenticated;
