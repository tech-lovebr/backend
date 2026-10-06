-- Data de vencimento da cobrança, opcional — definida ao criar o link.
alter table payment_links add column if not exists vencimento date;
