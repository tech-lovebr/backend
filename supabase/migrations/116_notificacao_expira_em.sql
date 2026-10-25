-- 116 — Notificação com data para sair do ar
-- O balão fica visível até expira_em (horário escolhido no Admin em
-- CMS › Notificações › Nova notificação › "Fica no ar até"). Depois disso
-- some para todo mundo. Vazio = não sai do ar sozinho.
alter table public.notificacoes add column if not exists expira_em timestamptz;
