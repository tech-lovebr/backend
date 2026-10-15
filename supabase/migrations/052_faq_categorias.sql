-- ==============================================================================
-- LOVE — FAQ: novas categorias
--
-- Rode no SQL Editor DEPOIS do 051_faq_e_excluir_minha_conta.sql. É idempotente.
--
-- Categorias da página "Dúvidas frequentes", nesta ordem: Convidados,
-- Presentes, Convite digital, Fornecedores, Financeiro, Benefícios e serviços.
-- ==============================================================================

update faq set categoria = 'Convidados'      where categoria = 'Lista de convidados';
update faq set categoria = 'Presentes'       where categoria = 'Meus presentes';
update faq set categoria = 'Convite digital' where categoria = 'Edição de site';

insert into faq (categoria, pergunta, resposta, ordem)
select v.categoria, v.pergunta, v.resposta, v.ordem from (values
  ('Financeiro', 'Como faço o saque do meu saldo?',
   'Na Carteira, cadastre seus dados de saque (chave Pix ou conta para TED) e peça o saque do saldo disponível.', 1),
  ('Financeiro', 'Onde vejo quanto já arrecadei?',
   'Na Carteira aparecem o saldo disponível e o total arrecadado com os presentes do seu evento.', 2),
  ('Benefícios e serviços', 'O que são os Benefícios e Serviços da Love?',
   'São vantagens e serviços de parceiros, como seguros, com condições especiais para quem organiza o evento pela Love. Eles ficam na Home e em Fornecedores › Benefícios Love.', 1),
  ('Benefícios e serviços', 'Como contrato um benefício?',
   'Abra o benefício que interessa e siga o botão de contratação: você é levado ao parceiro responsável, que conclui a contratação.', 2)
) as v(categoria, pergunta, resposta, ordem)
where not exists (select 1 from faq f where f.categoria = v.categoria and f.pergunta = v.pergunta);
