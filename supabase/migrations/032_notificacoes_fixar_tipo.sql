-- ==============================================================================
-- LOVE — Notificação fixada e tipos únicos
--
-- Rode no SQL Editor DEPOIS do 031_notificacoes.sql. É idempotente.
--
-- Duas coisas: uma notificação pode ser presa no topo da lista, e duas
-- delas têm papel único — a mensagem padrão e a de boas-vindas. "Única" é
-- garantido por índice, não só pela tela: se a regra vive apenas no
-- JavaScript, duas abas abertas ao mesmo tempo criam a segunda.
-- ==============================================================================

alter table notificacoes add column if not exists fixada boolean not null default false;

alter table notificacoes add column if not exists tipo text not null default 'comum';

do $$
begin
  if not exists (
    select 1 from pg_constraint
     where conrelid = 'notificacoes'::regclass
       and conname = 'notificacoes_tipo_check'
  ) then
    alter table notificacoes
      add constraint notificacoes_tipo_check
      check (tipo in ('comum', 'padrao', 'boas_vindas'));
  end if;
end $$;

-- Índice parcial: só 'padrao' e 'boas_vindas' são limitados a uma; as
-- comuns podem ser quantas forem.
create unique index if not exists notificacoes_tipo_unico
  on notificacoes (tipo)
  where tipo in ('padrao', 'boas_vindas');

create index if not exists notificacoes_fixada_idx
  on notificacoes (fixada, created_at desc);

comment on column notificacoes.fixada is
  'Presa no topo da lista do Admin.';
comment on column notificacoes.tipo is
  'comum = avulsa; padrao = mensagem padrão; boas_vindas = enviada a quem acabou de entrar. As duas últimas só podem existir uma de cada.';
