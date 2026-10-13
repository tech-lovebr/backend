-- ==============================================================================
-- LOVE — Anfitrião não pode mudar o próprio status
--
-- Rode no SQL Editor DEPOIS do 034_clientes_nome_sobrenome.sql. É idempotente.
--
-- A policy "clientes_update_own" deixa o anfitrião atualizar o próprio registro
-- — inclusive a coluna status, ou seja, dava pra se desbloquear chamando a API
-- direto. RLS não restringe coluna, então um gatilho barra a troca de status
-- quando ela vem de um usuário comum (papéis anon/authenticated da API).
--
-- Continua funcionando:
--   • alternar_bloqueio_conta() e demais funções security definer (rodam como
--     dono da tabela, não como "authenticated");
--   • admin logado editando direto pela API (is_admin()).
-- ==============================================================================

create or replace function clientes_protege_status()
returns trigger
language plpgsql
as $$
begin
  if new.status is distinct from old.status
     and current_user in ('anon', 'authenticated')
     and not coalesce(is_admin(), false) then
    raise exception 'Sem permissão para alterar o status da conta.'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists clientes_protege_status on clientes;
create trigger clientes_protege_status
  before update on clientes
  for each row execute function clientes_protege_status();
