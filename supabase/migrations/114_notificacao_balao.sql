-- 114 — Notificação em formato balão.
--
-- Além da notificação padrão (sino), o Admin pode criar um "balão": cartão
-- no canto inferior esquerdo da plataforma dos anfitriões (love.com.br) ou do
-- Hub, com imagem, título, texto e um botão.
--   formato    'padrao' (sino) | 'balao' (cartão no canto)
--   imagem_url imagem do balão (lado esquerdo)
-- O balão reaproveita titulo, mensagem, link_url (destino do botão) e
-- link_label (texto do botão). Fechar ou clicar no botão grava em
-- notificacao_leituras — o balão não volta para quem já viu.
-- Idempotente.

alter table notificacoes add column if not exists formato text not null default 'padrao';
alter table notificacoes add column if not exists imagem_url text;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'notificacoes_formato_check') then
    alter table notificacoes add constraint notificacoes_formato_check check (formato in ('padrao', 'balao'));
  end if;
end $$;

comment on column notificacoes.formato is 'padrao = aparece no sino; balao = cartão com imagem, título, texto e botão no canto da tela.';
