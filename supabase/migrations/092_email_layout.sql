-- 092 — Layout dos e-mails (Settings → E-mails → Layout).
-- Uma linha só (id = 1): logo, cores e rodapé que envolvem todo e-mail
-- escrito no Admin. A /api/emails lê daqui na hora de enviar.
--
-- Rode no SQL Editor. Idempotente.

create table if not exists email_layout (
  id integer primary key default 1 check (id = 1),
  logo_url text,
  logo_largura integer not null default 120 check (logo_largura between 40 and 400),
  cor_fundo text not null default '#F4F6F7',
  cor_destaque text not null default '#183b54',
  rodape text not null default 'Love · love.com.br',
  updated_at timestamptz not null default now()
);

insert into email_layout (id) values (1) on conflict (id) do nothing;

alter table email_layout enable row level security;
drop policy if exists "email_layout_admin" on email_layout;
create policy "email_layout_admin" on email_layout
  for all using (is_admin()) with check (is_admin());
