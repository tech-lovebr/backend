-- 099 — Dados para receber os presentes, em Suas informações.
--
-- A conta digital do anfitrião (subconta Asaas, que tem custo) só é aberta
-- na primeira compra de um convidado (api/_recebimento.js), com estes dados
-- do cadastro. Enquanto faltar algum, Meus presentes mostra o aviso
-- "Finalize seu cadastro" (js/recebimento.js). Nome, CPF e celular já
-- existiam em clientes. O dono já lê e grava a própria linha (RLS de clientes).
-- Idempotente.

alter table clientes add column if not exists data_nascimento date;
alter table clientes add column if not exists renda_mensal numeric(12,2);
alter table clientes add column if not exists cep text;
alter table clientes add column if not exists endereco text;
alter table clientes add column if not exists endereco_numero text;
alter table clientes add column if not exists endereco_complemento text;
alter table clientes add column if not exists bairro text;

-- Primeira versão desta migration guardava os dados à parte; não é mais usada.
drop function if exists tenho_dados_de_recebimento();
drop table if exists dados_recebimento;
