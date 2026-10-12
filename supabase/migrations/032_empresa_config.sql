-- ==========================================================================
-- LOVE B2B — Configurações > Minha Empresa: endereço comercial, raio em
-- passos fixos, condições de pagamento e portfólio/depoimentos.
--
-- Antes desta migration, a aba "Minha Empresa" só gravava no localStorage
-- de quem preenchia (o mesmo bug que "company_name"/"cnpj" etc. já tinham
-- antes de 002_b2b_backend.sql) — nada chegava ao Admin nem sobrevivia a
-- troca de navegador. Esta migration cria as colunas que faltavam para
-- isso ser persistido de verdade em `fornecedores`.
-- ==========================================================================

alter table fornecedores add column if not exists business_address text;
alter table fornecedores add column if not exists business_city text;
alter table fornecedores add column if not exists business_state text;
alter table fornecedores add column if not exists usa_endereco_perfil boolean not null default true;
alter table fornecedores add column if not exists service_radius_km integer not null default 50;
alter table fornecedores add column if not exists delivery_time text;
alter table fornecedores add column if not exists deposit_percent integer;
alter table fornecedores add column if not exists deposit_deadline_days integer;
alter table fornecedores add column if not exists cancellation_policy text;
alter table fornecedores add column if not exists max_installments_no_interest integer not null default 0;
alter table fornecedores add column if not exists accepts_boleto boolean not null default false;
alter table fornecedores add column if not exists requires_full_payment_by_event boolean not null default false;
alter table fornecedores add column if not exists portfolio_images jsonb not null default '[]';
alter table fornecedores add column if not exists depoimentos jsonb not null default '[]';

comment on column fornecedores.business_address is 'Endereço comercial exibido só para o próprio fornecedor em Configurações. Null quando usa_endereco_perfil = true (replica o endereço do Perfil nesse caso).';
comment on column fornecedores.usa_endereco_perfil is 'Quando true, o endereço comercial replica address/city/state do Perfil em vez de usar business_address/business_city/business_state.';
comment on column fornecedores.service_radius_km is 'Raio de atendimento em km, em passos de 50 até 300. 0 = "qualquer distância" (sentinela, não um raio real). Usado só pelo algoritmo da plataforma, não aparece na vitrine.';
comment on column fornecedores.max_installments_no_interest is 'Quantas parcelas no cartão o fornecedor assume sem cobrar juro do cliente (0 = não oferece parcelamento sem juros).';
comment on column fornecedores.portfolio_images is 'Álbum de fotos de trabalhos já realizados, array de {url, uploadedAt}. Upload real para o Storage (bucket "fornecedores", prefixo portfolio/<fornecedor_id>/), não base64. Independente do Editor de Site por enquanto.';
comment on column fornecedores.depoimentos is 'Depoimentos recebidos de clientes, array de {id, autor, texto}. Independente do Editor de Site por enquanto — não aparece na vitrine pública.';
