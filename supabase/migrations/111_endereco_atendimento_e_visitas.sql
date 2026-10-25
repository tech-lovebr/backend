-- 111 — Sua empresa: endereço de atendimento completo, visitas e amostras.
-- (Hub › Configurações › Sua empresa.) Quando o endereço de atendimento não é
-- o mesmo de Informações da empresa, a empresa preenche CEP, número,
-- complemento e bairro (além de business_address/city/state, que já existem).
-- E diz se recebe clientes para reuniões/visitas e se oferece prova ou
-- amostra do serviço antes de fechar (ex.: degustação de bolo).
-- Rode no SQL Editor. Idempotente.

alter table fornecedores add column if not exists business_cep text;
alter table fornecedores add column if not exists business_numero text;
alter table fornecedores add column if not exists business_complemento text;
alter table fornecedores add column if not exists business_bairro text;
alter table fornecedores add column if not exists aceita_visitas boolean not null default false;
alter table fornecedores add column if not exists oferece_amostra boolean not null default false;

notify pgrst, 'reload schema';
