-- 091 — E-mails (Settings → E-mails) e moeda dos planos.
--
-- 1) email_envios: o livro-razão de tudo que sai pelo Amazon SES. As funções
--    da Vercel gravam no envio (remetente, assunto, trecho, latência); a
--    /api/ses-eventos atualiza com o que o SES avisa pelo SNS (entregue,
--    bounce, denúncia, abertura, clique). E-mails que não passam pelas
--    nossas funções (os do login, enviados pelo Supabase via SMTP) entram
--    pelo evento "Send" do SES.
-- 2) email_templates: modelos escritos no Admin para enviar pela plataforma.
-- 3) planos.moeda e planos.pais: a Love vai rodar em outros países, com outro
--    domínio. Por enquanto tudo em real (BRL) no Brasil.
--
-- Rode no SQL Editor. Idempotente.

create table if not exists email_envios (
  id uuid primary key default gen_random_uuid(),
  message_id text unique,
  remetente text,
  destinatario text not null,
  assunto text,
  template text,
  categoria text not null default 'Sistema',
  trecho text,
  status text not null default 'enviado'
    check (status in ('enviado', 'entregue', 'atrasado', 'bounce', 'denuncia', 'rejeitado', 'falhou')),
  erro text,
  provedor text not null default 'Amazon SES',
  latencia_ms integer,
  aberto_em timestamptz,
  clicado_em timestamptz,
  entregue_em timestamptz,
  eventos jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists email_envios_created_at on email_envios (created_at desc);
create index if not exists email_envios_destinatario on email_envios (lower(destinatario));

alter table email_envios enable row level security;
drop policy if exists "email_envios_admin" on email_envios;
create policy "email_envios_admin" on email_envios
  for all using (is_admin()) with check (is_admin());

create table if not exists email_templates (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  categoria text not null default 'Comunicados',
  assunto text not null,
  html text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table email_templates enable row level security;
drop policy if exists "email_templates_admin" on email_templates;
create policy "email_templates_admin" on email_templates
  for all using (is_admin()) with check (is_admin());

-- Planos: moeda e país (domínio) de cada plano.
alter table planos add column if not exists moeda text not null default 'BRL';
alter table planos add column if not exists pais text not null default 'BR';
