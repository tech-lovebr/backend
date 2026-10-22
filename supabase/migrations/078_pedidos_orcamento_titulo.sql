-- 078 — Título da solicitação de orçamento (etapa 1: "o que você procura").
alter table pedidos_orcamento add column if not exists titulo text;
alter table pedidos_orcamento drop constraint if exists pedidos_orcamento_titulo_tamanho;
alter table pedidos_orcamento add constraint pedidos_orcamento_titulo_tamanho
  check (titulo is null or char_length(titulo) <= 120);
