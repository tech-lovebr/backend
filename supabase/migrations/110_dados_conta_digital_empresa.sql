-- 110 — Dados da conta digital da empresa (Hub › Configurações › Suas informações).
--
-- Como no love.com.br (conta digital do anfitrião, api/_recebimento.js), a
-- empresa vai ter uma subconta no Asaas para receber os contratos e sacar.
-- O POST /accounts do Asaas pede, para empresa (CNPJ): razão social, CNPJ,
-- companyType (MEI, LIMITED, INDIVIDUAL, ASSOCIATION), incomeValue
-- (faturamento mensal), celular e o endereço completo (CEP, rua, número,
-- complemento, bairro). Para quem usa CPF: também a data de nascimento.
-- Os dados do responsável (CPF e nascimento) servem para a verificação.
-- Rode no SQL Editor. Idempotente.

alter table fornecedores add column if not exists tipo_empresa text;
alter table fornecedores add column if not exists faturamento_mensal numeric;
alter table fornecedores add column if not exists cep text;
alter table fornecedores add column if not exists endereco_numero text;
alter table fornecedores add column if not exists endereco_complemento text;
alter table fornecedores add column if not exists bairro text;
alter table fornecedores add column if not exists responsavel_cpf text;
alter table fornecedores add column if not exists data_nascimento date;

alter table fornecedores drop constraint if exists fornecedores_tipo_empresa_check;
alter table fornecedores add constraint fornecedores_tipo_empresa_check
  check (tipo_empresa is null or tipo_empresa in ('MEI', 'LIMITED', 'INDIVIDUAL', 'ASSOCIATION'));

comment on column fornecedores.tipo_empresa is 'companyType do Asaas: MEI, LIMITED (Ltda), INDIVIDUAL (empresário individual), ASSOCIATION.';
comment on column fornecedores.faturamento_mensal is 'incomeValue do Asaas (faturamento mensal da empresa, em reais).';

notify pgrst, 'reload schema';
