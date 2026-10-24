-- 109 — Descadastro dos e-mails de marketing (Marketing e Novidades).
--
-- Quem clica em "Descadastrar" no fim do e-mail (ou no "Cancelar
-- inscrição" do Gmail) entra aqui e não recebe mais marketing; os e-mails do
-- sistema continuam. O anfitrião também entra/sai pela tela
-- Configurações › Preferências: desligar Ofertas, Benefícios e Viagens
-- descadastra; religar qualquer um volta a receber.
-- A /api/descadastrar e o envio do Admin usam a chave de serviço; o usuário
-- logado só mexe na linha do próprio e-mail.
-- Idempotente.

create table if not exists email_descadastros (
  email text primary key check (email = lower(email)),
  origem text not null default 'link',
  created_at timestamptz not null default now()
);

alter table email_descadastros enable row level security;

drop policy if exists "descadastro_proprio_select" on email_descadastros;
create policy "descadastro_proprio_select" on email_descadastros
  for select to authenticated using (email = lower(auth.jwt() ->> 'email'));

drop policy if exists "descadastro_proprio_insert" on email_descadastros;
create policy "descadastro_proprio_insert" on email_descadastros
  for insert to authenticated with check (email = lower(auth.jwt() ->> 'email'));

drop policy if exists "descadastro_proprio_update" on email_descadastros;
create policy "descadastro_proprio_update" on email_descadastros
  for update to authenticated using (email = lower(auth.jwt() ->> 'email')) with check (email = lower(auth.jwt() ->> 'email'));

drop policy if exists "descadastro_proprio_delete" on email_descadastros;
create policy "descadastro_proprio_delete" on email_descadastros
  for delete to authenticated using (email = lower(auth.jwt() ->> 'email'));
