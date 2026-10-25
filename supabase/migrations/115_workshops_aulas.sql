-- 115 — Workshops no formato de aula (hub.love.com.br/workshops)
-- Cada workshop (hub_conteudo tipo 'workshop') ganha vídeo, duração e o
-- conteúdo da aula escrito no editor do Admin (CMS › Conteúdo › Workshops).
alter table public.hub_conteudo add column if not exists video_url text;
alter table public.hub_conteudo add column if not exists duracao text;
alter table public.hub_conteudo add column if not exists conteudo_html text;
