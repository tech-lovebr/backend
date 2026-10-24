-- 107 — Os documentos da verificação de identidade vão para o Asaas.
--
-- O anfitrião envia uma vez só (Carteira › Contas bancárias): documento com
-- foto (frente e verso), selfie segurando o documento, CPF e chave Pix. O
-- Admin aprova em Verificações e o servidor manda os mesmos arquivos para a
-- conta digital dele no Asaas (api/_documentos-asaas.js):
--   documento_completo → IDENTIFICATION (frente e verso numa imagem só)
--   selfie             → IDENTIFICATION_SELFIE
-- asaas_status guarda como foi: aguardando_conta (a conta digital só abre na
-- primeira compra), enviado, link (o Asaas pediu pelo link dele), erro.
-- Idempotente.

alter table verificacoes_identidade add column if not exists selfie text;
alter table verificacoes_identidade add column if not exists documento_completo text;
alter table verificacoes_identidade add column if not exists asaas_status text;
alter table verificacoes_identidade add column if not exists asaas_detalhe jsonb not null default '{}'::jsonb;
alter table verificacoes_identidade add column if not exists asaas_enviado_em timestamptz;

-- RG frente e verso passam a ser só imagem; a selfie é nova. As colunas
-- antigas continuam obrigatórias (rg_frente, rg_verso).
comment on column verificacoes_identidade.documento_completo is
  'Frente e verso do documento numa imagem só (JPEG), montada no navegador — é o arquivo enviado ao Asaas como IDENTIFICATION.';
comment on column verificacoes_identidade.selfie is
  'Selfie segurando o documento (JPEG) — enviada ao Asaas como IDENTIFICATION_SELFIE.';
