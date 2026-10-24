-- 108 — Dados aprovados uma vez, enviados para qualquer gateway.
--
-- A pessoa envia os dados e documentos uma vez só, na Love. O Admin aprova em
-- Verificações. Depois a Love manda esses mesmos dados para cada gateway que
-- precisar (hoje o Asaas; amanhã outro, como contingência), sem pedir nada
-- de novo para a pessoa.
--
--   • O original fica na Love: verificacoes_identidade (dados + caminhos dos
--     arquivos no bucket "documentos") e clientes.dados_saque (contas no
--     formato padrão dos bancos: código COMPE, agência e conta sem dígito,
--     dígito separado, corrente/poupança).
--   • verificacoes_gateways registra só como foi o envio para cada gateway
--     (uma linha por pessoa + gateway). Trocar ou somar gateway não mexe nos
--     dados aprovados.
--
-- Inclui o que a 107 fazia (selfie e documento_completo) e troca as colunas
-- asaas_* da 107 por esta tabela (copia o que houver antes de apagar).
-- Idempotente: pode rodar mesmo que a 107 não tenha rodado.

alter table verificacoes_identidade add column if not exists selfie text;
alter table verificacoes_identidade add column if not exists documento_completo text;

create table if not exists verificacoes_gateways (
  titular_tipo text not null default 'anfitriao' check (titular_tipo in ('anfitriao', 'fornecedor')),
  titular_id   uuid not null,
  gateway      text not null,                 -- 'asaas', ...
  status       text,                          -- aguardando_conta | enviado | link | sem_pendencia | erro
  detalhe      jsonb not null default '{}'::jsonb,
  enviado_em   timestamptz,
  atualizado_em timestamptz not null default now(),
  primary key (titular_tipo, titular_id, gateway)
);

alter table verificacoes_gateways enable row level security;

drop policy if exists "gateways_admin" on verificacoes_gateways;
create policy "gateways_admin" on verificacoes_gateways
  for all using (is_admin()) with check (is_admin());

-- Traz o que a 107 já tinha gravado e apaga as colunas presas ao Asaas.
do $$
begin
  if exists (select 1 from information_schema.columns
             where table_name = 'verificacoes_identidade' and column_name = 'asaas_status') then
    execute $q$
      insert into verificacoes_gateways (titular_tipo, titular_id, gateway, status, detalhe, enviado_em)
      select 'anfitriao', cliente_id, 'asaas', asaas_status, coalesce(asaas_detalhe, '{}'::jsonb), asaas_enviado_em
        from verificacoes_identidade
       where asaas_status is not null
      on conflict do nothing
    $q$;
    alter table verificacoes_identidade drop column if exists asaas_status;
    alter table verificacoes_identidade drop column if exists asaas_detalhe;
    alter table verificacoes_identidade drop column if exists asaas_enviado_em;
  end if;
end $$;

comment on table verificacoes_gateways is
  'Como os dados aprovados em Verificações foram para cada gateway (Asaas, ...). O original fica em verificacoes_identidade.';
comment on column verificacoes_identidade.documento_completo is
  'Frente e verso do documento numa imagem só (JPEG). Arquivo único reaproveitado em qualquer gateway.';
comment on column verificacoes_identidade.selfie is
  'Selfie segurando o documento (JPEG). Reaproveitada em qualquer gateway.';
