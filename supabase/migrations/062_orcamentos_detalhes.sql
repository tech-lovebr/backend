-- 062: Orçamentos com os dados da proposta (Vendas › Orçamentos do Hub)
-- nº da proposta, introdução, vendedor, endereço do evento e serviço; status "aceito".
alter table public.orcamentos
  add column if not exists numero int,
  add column if not exists introducao text,
  add column if not exists vendedor text,
  add column if not exists endereco_evento text,
  add column if not exists produto_id uuid references public.products(id) on delete set null;

alter table public.orcamentos drop constraint if exists orcamentos_status_check;
alter table public.orcamentos
  add constraint orcamentos_status_check check (status in ('enviado', 'aceito', 'recusado', 'pago'));
