/* ==========================================================================
   LOVE ADMIN — Configurações
   Dados da própria conta de administrador. O super admin também troca a
   própria senha aqui, no card Segurança, pela sessão do Supabase — sem
   chave mestra.
   ========================================================================== */

/* Cada regra da nova senha, na ordem em que aparece no dropdown. */
const REGRAS_SENHA = {
  tamanho: s => s.length >= 8,
  numero: s => /\d/.test(s),
  simbolo: s => /[^A-Za-z0-9\s]/.test(s)
};

const senhaValida = s => Object.values(REGRAS_SENHA).every(regra => regra(s));

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
  const card = document.getElementById('card-seguranca');
  const form = document.getElementById('form-senha');
  const abrir = document.getElementById('btn-abrir-senha');
  const salvar = document.getElementById('btn-salvar-senha');
  const regras = document.getElementById('senha-regras');
  card.hidden = false;

  const atualizarRegras = () => {
    regras.querySelectorAll('li').forEach(li => {
      li.classList.toggle('ok', REGRAS_SENHA[li.dataset.regra](form.nova.value));
    });
  };

  const mostrar = visivel => {
    form.hidden = !visivel;
    abrir.hidden = visivel;
    abrir.setAttribute('aria-expanded', String(visivel));
    if (visivel) {
      form.atual.focus();
    } else {
      form.reset();
      atualizarRegras();
    }
  };

  abrir.addEventListener('click', () => mostrar(true));
  document.getElementById('btn-cancelar-senha').addEventListener('click', () => mostrar(false));

  form.nova.addEventListener('focus', () => { regras.hidden = false; });
  form.nova.addEventListener('blur', () => { regras.hidden = true; });
  form.nova.addEventListener('input', atualizarRegras);

  salvar.addEventListener('click', async () => {
    const atual = form.atual.value;
    const nova = form.nova.value;
    const confirmacao = form.confirmacao.value;

    if (!atual || !nova || !confirmacao) {
      toast('Preencha os três campos.');
      return;
    }
    if (!senhaValida(nova)) {
      toast('A nova senha precisa de 8 caracteres, 1 número e 1 símbolo.');
      form.nova.focus();
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

    salvar.disabled = true;

    const { error: erroLogin } = await supabaseClient.auth
      .signInWithPassword({ email: admin.email, password: atual });

    if (erroLogin) {
      salvar.disabled = false;
      toast('Senha atual incorreta.');
      return;
    }

    const { error } = await supabaseClient.auth.updateUser({ password: nova });
    salvar.disabled = false;

    if (error) {
      toast(`Não foi possível alterar a senha: ${error.message}`);
      return;
    }

    mostrar(false);
    toast('Senha alterada.');
  });
}
