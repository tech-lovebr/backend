-- Hub › Configurações › Preferências de e-mail: quais e-mails a empresa
-- recebe da Love. Salvo direto pelo Hub ao clicar no toggle.
-- Chaves: novos_leads, mensagens, vendas_pagamentos (ligadas por padrão),
-- novidades, dicas (desligadas por padrão).
alter table fornecedores
  add column if not exists preferencias_email jsonb not null
  default '{"novos_leads": true, "mensagens": true, "vendas_pagamentos": true, "novidades": false, "dicas": false}'::jsonb;
