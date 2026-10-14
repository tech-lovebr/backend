-- ==============================================================================
-- LOVE — Tema da notificação
--
-- Rode no SQL Editor DEPOIS do 039_notificacoes_agendadas.sql. É idempotente.
--
-- O tema decide o ícone e a cor da caixinha com que a notificação aparece
-- para quem recebe: padrão (sino, cinza), viagens (avião, laranja claro),
-- benefícios (verde claro), novidades (azul claro) e aviso (amarelo claro).
-- As que já existem ficam como 'padrao', que é como já apareciam.
-- ==============================================================================

alter table notificacoes add column if not exists tema text not null default 'padrao';

do $$
begin
  if not exists (
    select 1 from pg_constraint
     where conrelid = 'notificacoes'::regclass
       and conname = 'notificacoes_tema_check'
  ) then
    alter table notificacoes
      add constraint notificacoes_tema_check
      check (tema in ('padrao', 'viagens', 'beneficios', 'novidades', 'aviso'));
  end if;
end $$;

comment on column notificacoes.tema is
  'Ícone e cor na plataforma: padrao, viagens, beneficios, novidades ou aviso.';
