-- Permite que o próprio usuário autenticado crie sua linha em `fornecedores`
-- quando ela ainda não existe — necessário para login social (Google), onde
-- o trigger handle_new_user() não recebe o "role" via raw_user_meta_data
-- (isso só acontece hoje no cadastro por e-mail/senha, via options.data do
-- signUp()). O app cria a linha no primeiro login, no client, assim que
-- detecta que o fornecedor logado ainda não tem perfil.

create policy "fornecedores_insert_own" on fornecedores
  for insert to authenticated with check (auth.uid() = id);
