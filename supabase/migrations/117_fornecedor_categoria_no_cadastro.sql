-- 117 — Categoria da empresa já escolhida no cadastro do Hub B2B
-- O onboarding "Crie sua conta" do Hub (B2B/signup.html) agora pede a
-- categoria da empresa junto com nome/e-mail/senha, igual ao Admin já faz
-- ao cadastrar um fornecedor manualmente (Admin/js/novo-fornecedor.js).
-- Sem isso, handle_new_user() criava a linha em fornecedores sem
-- categoria nenhuma, e a pessoa só via esse campo depois em Configurações.
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  papel text := new.raw_user_meta_data ->> 'role';
begin
  if papel = 'fornecedor' then
    insert into fornecedores (id, company_name, email, category)
    values (
      new.id,
      coalesce(new.raw_user_meta_data ->> 'company_name', ''),
      new.email,
      new.raw_user_meta_data ->> 'category'
    )
    on conflict (id) do nothing;

  elsif papel = 'cliente' then
    insert into clientes (id, couple_name, first_name, last_name, email, birthday, intended_event_type, intended_event_type_label, intended_event_date)
    values (
      new.id,
      coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'couple_name', ''),
      new.raw_user_meta_data ->> 'first_name',
      new.raw_user_meta_data ->> 'last_name',
      new.email,
      (new.raw_user_meta_data ->> 'birthday')::date,
      new.raw_user_meta_data ->> 'intended_event_type',
      new.raw_user_meta_data ->> 'intended_event_type_label',
      (new.raw_user_meta_data ->> 'intended_event_date')::date
    )
    on conflict (id) do nothing;

  else
    insert into contas_sem_origem (id, email, provedor)
    values (new.id, new.email, coalesce(new.raw_app_meta_data ->> 'provider', 'desconhecido'))
    on conflict (id) do nothing;
  end if;

  return new;
end;
$$;
