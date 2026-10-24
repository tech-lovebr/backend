-- 106 — Verificação de identidade (Carteira): RG, CNH ou passaporte.
--
-- O anfitrião escolhe o documento com foto. No passaporte o verso é
-- opcional, então rg_verso passa a aceitar vazio. documento_tipo guarda
-- qual foi enviado ('rg', 'cnh' ou 'passaporte'); os antigos ficam 'rg'.
-- Idempotente.

alter table verificacoes_identidade add column if not exists documento_tipo text not null default 'rg';
alter table verificacoes_identidade drop constraint if exists verificacoes_identidade_documento_tipo_check;
alter table verificacoes_identidade add constraint verificacoes_identidade_documento_tipo_check
  check (documento_tipo in ('rg', 'cnh', 'passaporte'));
alter table verificacoes_identidade alter column rg_verso drop not null;
