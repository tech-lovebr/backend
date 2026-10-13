/* ==========================================================================
   LOVE ADMIN — Configurações
   Dados da própria conta de administrador. O super admin também troca a
   própria senha aqui, pela sessão do Supabase — sem chave mestra.
   ========================================================================== */

document.addEventListener('DOMContentLoaded', async () => {
  const admin = await window.adminReady;
  if (!admin) return;

  const form = document.getElementById('form-perfil');
  form.name.value = admin.name || '';
  form.email.value = admin.email || '';

  document.getElementById('btn-salvar-perfil').addEventListener('click', async () => {
    const nome = form.name.value.trim();

    if (!nome) {
      toast('O nome não pode ficar vazio.');
      return;
    }

    const botao = document.getElementById('btn-salvar-perfil');
    botao.disabled = true;
    const { error } = await supabaseClient.from('admins').update({ name: nome }).eq('id', admin.id);
    botao.disabled = false;

    if (error) {
      toast(`Não foi possível salvar: ${error.message}`);
      return;
    }

    toast('Dados atualizados.');
    // A topbar mostra o nome e as iniciais — recarrega para refletir a mudança.
    setTimeout(() => window.location.reload(), 900);
  });

  if (admin.role === 'superadmin') iniciarTrocaDeSenha(admin);
});

/* ---------------------------------------------------------- Trocar senha */

/**
 * O `updateUser` só altera a conta da sessão aberta, então não precisa da
 * chave mestra. Antes, a senha atual é conferida com um novo login: quem
 * achar o painel aberto num computador não troca a senha sem saber a antiga.
 */
function iniciarTrocaDeSenha(admin) {
  const card = document.getElementById('card-senha');
  const form = document.getElementById('form-senha');
  const botao = document.getElementById('btn-salvar-senha');
  card.hidden = false;

  botao.addEventListener('click', async () => {
    const atual = form.atual.value;
    const nova = form.nova.value;
    const confirmacao = form.confirmacao.value;

    if (!atual || !nova || !confirmacao) {
      toast('Preencha os três campos.');
      return;
    }
    if (nova.length < 8) {
      toast('A nova senha precisa ter pelo menos 8 caracteres.');
      return;
    }
    if (nova !== confirmacao) {
      toast('A confirmação não bate com a nova senha.');
      return;
    }
    if (nova === atual) {
      toast('A nova senha é igual à atual.');
      return;
    }

    botao.disabled = true;

    const { error: erroLogin } = await supabaseClient.auth
      .signInWithPassword({ email: admin.email, password: atual });

    if (erroLogin) {
      botao.disabled = false;
      toast('Senha atual incorreta.');
      return;
    }

    const { error } = await supabaseClient.auth.updateUser({ password: nova });
    botao.disabled = false;

    if (error) {
      toast(`Não foi possível alterar a senha: ${error.message}`);
      return;
    }

    form.reset();
    toast('Senha alterada.');
  });
}
