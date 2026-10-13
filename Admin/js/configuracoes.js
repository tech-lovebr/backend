/* ==========================================================================
   LOVE ADMIN — Configurações
   Dados da própria conta de administrador. O super admin também troca a
   própria senha aqui, pela sessão do Supabase — sem chave mestra.
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
  const botao = document.getElementById('btn-salvar-perfil');
  form.name.value = admin.name || '';
  form.email.value = admin.email || '';

  const senha = admin.role === 'superadmin' ? iniciarCamposDeSenha(form) : null;

  botao.addEventListener('click', async () => {
    const nome = form.name.value.trim();

    if (!nome) {
      toast('O nome não pode ficar vazio.');
      return;
    }

    const trocarSenha = senha?.aberto();
    if (trocarSenha && !senha.validar()) return;

    const mudouNome = nome !== (admin.name || '');
    if (!mudouNome && !trocarSenha) {
      toast('Nada para salvar.');
      return;
    }

    botao.disabled = true;

    if (trocarSenha) {
      const ok = await senha.salvar(admin.email);
      if (!ok) { botao.disabled = false; return; }
    }

    if (mudouNome) {
      const { error } = await supabaseClient.from('admins').update({ name: nome }).eq('id', admin.id);
      if (error) {
        botao.disabled = false;
        toast(`Não foi possível salvar: ${error.message}`);
        return;
      }
    }

    botao.disabled = false;
    toast(trocarSenha && mudouNome ? 'Dados e senha atualizados.' : trocarSenha ? 'Senha alterada.' : 'Dados atualizados.');

    // A topbar mostra o nome e as iniciais — recarrega para refletir a mudança.
    if (mudouNome) setTimeout(() => window.location.reload(), 900);
  });
});

/* ---------------------------------------------------------- Trocar senha */

/**
 * "Alterar senha" abre os campos entre o e-mail e o Salvar; o mesmo Salvar
 * grava tudo. O `updateUser` só altera a conta da sessão aberta, então não
 * precisa da chave mestra. Antes, a senha atual é conferida com um novo
 * login: quem achar o painel aberto não troca a senha sem saber a antiga.
 */
function iniciarCamposDeSenha(form) {
  const linha = document.getElementById('senha-linha');
  const campos = document.getElementById('campos-senha');
  const alternar = document.getElementById('btn-abrir-senha');
  const regras = document.getElementById('senha-regras');
  linha.hidden = false;

  const atualizarRegras = () => {
    regras.querySelectorAll('li').forEach(li => {
      li.classList.toggle('ok', REGRAS_SENHA[li.dataset.regra](form.nova.value));
    });
  };

  const mostrar = visivel => {
    campos.hidden = !visivel;
    alternar.textContent = visivel ? 'Cancelar alteração' : 'Alterar senha';
    alternar.setAttribute('aria-expanded', String(visivel));
    if (visivel) {
      form.atual.focus();
    } else {
      form.atual.value = form.nova.value = form.confirmacao.value = '';
      atualizarRegras();
    }
  };

  alternar.addEventListener('click', () => mostrar(campos.hidden));

  form.nova.addEventListener('focus', () => { regras.hidden = false; });
  form.nova.addEventListener('blur', () => { regras.hidden = true; });
  form.nova.addEventListener('input', atualizarRegras);

  return {
    aberto: () => !campos.hidden,

    validar() {
      const { atual, nova, confirmacao } = form;
      if (!atual.value || !nova.value || !confirmacao.value) {
        toast('Preencha os três campos de senha.');
        return false;
      }
      if (!senhaValida(nova.value)) {
        toast('A nova senha precisa de 8 caracteres, 1 número e 1 símbolo.');
        nova.focus();
        return false;
      }
      if (nova.value !== confirmacao.value) {
        toast('A confirmação não bate com a nova senha.');
        return false;
      }
      if (nova.value === atual.value) {
        toast('A nova senha é igual à atual.');
        return false;
      }
      return true;
    },

    async salvar(email) {
      const { error: erroLogin } = await supabaseClient.auth
        .signInWithPassword({ email, password: form.atual.value });

      if (erroLogin) {
        toast('Senha atual incorreta.');
        return false;
      }

      const { error } = await supabaseClient.auth.updateUser({ password: form.nova.value });
      if (error) {
        toast(`Não foi possível alterar a senha: ${error.message}`);
        return false;
      }

      mostrar(false);
      return true;
    }
  };
}
