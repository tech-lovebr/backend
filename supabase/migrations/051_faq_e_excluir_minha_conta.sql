-- ==============================================================================
-- LOVE — Dúvidas (FAQ) editáveis no Admin + excluir a própria conta
--
-- Rode no SQL Editor DEPOIS do 050_verificar_email_cadastrado.sql. É idempotente.
--
-- 1. faq — perguntas e respostas da página /duvidas da plataforma de
--    anfitrião, separadas por categoria (Lista de convidados, Meus presentes,
--    Edição de site, Fornecedores…). Lidas por qualquer conta logada; só o
--    Admin cria, edita e apaga (is_admin(), igual a documentos_legais).
--
-- 2. excluir_minha_conta() — o anfitrião apaga a própria conta em
--    Configurações, sem pedir ao Admin. Mesmo mecanismo de
--    admin_excluir_conta (017): SECURITY DEFINER alcança auth.users, e o
--    cascade leva junto perfil, eventos, convidados, presentes, conversas e
--    dados de saque. Só apaga quem está logado (auth.uid()).
-- ==============================================================================


-- ------------------------------------------------------------------
-- 1. FAQ
-- ------------------------------------------------------------------

create table if not exists faq (
  id uuid primary key default gen_random_uuid(),
  categoria text not null,
  pergunta text not null,
  resposta text not null default '',
  ordem integer not null default 0,
  ativo boolean not null default true,
  atualizado_por uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists faq_categoria_ordem_idx on faq (categoria, ordem);

alter table faq enable row level security;

drop policy if exists "faq_leitura" on faq;
create policy "faq_leitura" on faq
  for select to anon, authenticated using (ativo);

drop policy if exists "faq_admin" on faq;
create policy "faq_admin" on faq
  for all to authenticated using (is_admin()) with check (is_admin());

create or replace function touch_faq()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists faq_touch on faq;
create trigger faq_touch before update on faq
  for each row execute function touch_faq();

-- Primeiras perguntas (só na primeira vez; depois o Admin cuida).
insert into faq (categoria, pergunta, resposta, ordem)
select * from (values
  ('Lista de convidados', 'Como os convidados confirmam presença?',
   'Pelo link do seu site: o convidado clica em "Confirmar presença", informa quem vai com ele e pode deixar um recado. A confirmação aparece na hora em Meus Convidados.', 1),
  ('Lista de convidados', 'Posso adicionar acompanhantes a um convidado?',
   'Sim. Ao criar ou editar um convidado, informe os acompanhantes. Eles contam na lista, no mapa de mesas e nos números da Home.', 2),
  ('Meus presentes', 'Como funciona o resgate dos presentes em dinheiro?',
   'Tudo que os convidados presenteiam entra como saldo disponível na sua Carteira. Você pede o saque quando quiser, pela chave Pix ou conta cadastrada em Dados de saque.', 1),
  ('Meus presentes', 'Posso duplicar um presente?',
   'Sim. Em Meus Presentes, abra o presente e use "Duplicar": uma cópia é criada e você só ajusta o que mudar.', 2),
  ('Edição de site', 'Como mudar as cores e o visual do meu site?',
   'Em Personalizar, na aba Aparência, escolha um modelo pronto ou ajuste cores, fontes e foto de capa com a prévia ao vivo.', 1),
  ('Edição de site', 'Dá para colocar música no site?',
   'Sim. Em Personalizar, informe o link da música e, se quiser, marque para tocar automaticamente quando o convidado abrir o site.', 2),
  ('Fornecedores', 'Como contratar um fornecedor pela Love?',
   'Em Fornecedores, encontre quem você procura, abra o perfil e use "Contratar" ou peça um orçamento. Os contratados ficam reunidos em Contratados.', 1),
  ('Fornecedores', 'Como falo com um fornecedor?',
   'Pelo chat da plataforma: clique em "Chat" no card ou no perfil do fornecedor. As conversas ficam em Fornecedores › Mensagens.', 2)
) as v(categoria, pergunta, resposta, ordem)
where not exists (select 1 from faq);


-- ------------------------------------------------------------------
-- 2. Excluir a própria conta
-- ------------------------------------------------------------------

create or replace function excluir_minha_conta()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid := auth.uid();
begin
  if v_id is null then
    raise exception 'É preciso estar logado para excluir a conta.';
  end if;

  if exists (select 1 from admins a where a.id = v_id) then
    raise exception 'Contas de administrador não podem ser excluídas por aqui.';
  end if;

  delete from auth.users where id = v_id;
end;
$$;

revoke all on function excluir_minha_conta() from public, anon;
grant execute on function excluir_minha_conta() to authenticated;
