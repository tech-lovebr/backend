/* ==========================================================================
   LOVE HUB — Landing de cadastro rápido de fornecedores (/lp1, /lp2...).
   O nome da landing vem de <body data-origem="lp1">. Ele fica guardado neste
   navegador e vai nos dados da conta (origem_cadastro): no e-mail já no
   cadastro; no Google, quando a conta nova chega em signup?completar=1.
   Depois do cadastro a pessoa segue o onboarding normal do Hub.
   ========================================================================== */
(function () {
  const origem = document.body.dataset.origem || '';
  const $ = id => document.getElementById(id);
  try { localStorage.setItem('b2b-origem-cadastro', JSON.stringify({ origem, em: Date.now() })); } catch (e) { /* sem armazenamento */ }

  const form = $('lp-form');
  const campoEmail = $('lp-email');
  const campoSenha = $('lp-senha');
  const erro = $('lp-erro');
  const botao = $('lp-criar');
  const regras = $('lp-regras');

  const mostrarErro = texto => { erro.textContent = texto; erro.classList.remove('is-info'); erro.hidden = false; };

  // Chamada do topo: leva ao formulário, já no campo de e-mail.
  document.querySelectorAll('[data-lp-criar]').forEach(a => a.addEventListener('click', e => {
    e.preventDefault();
    $('criar-conta').scrollIntoView({ behavior: 'smooth', block: 'center' });
    campoEmail.focus({ preventScroll: true });
  }));

  $('lp-google').addEventListener('click', () => entrarComGoogleHub(location.origin + '/dashboard'));

  $('lp-ver-senha').addEventListener('click', e => {
    const mostrar = campoSenha.type === 'password';
    campoSenha.type = mostrar ? 'text' : 'password';
    e.currentTarget.textContent = mostrar ? 'Ocultar' : 'Mostrar';
    e.currentTarget.setAttribute('aria-pressed', String(mostrar));
    campoSenha.focus();
  });

  const pintarRegras = () => {
    const r = regrasDaSenhaHub(campoSenha.value);
    regras.querySelectorAll('[data-regra]').forEach(li => li.classList.toggle('is-ok', !!r[li.dataset.regra]));
  };
  campoSenha.addEventListener('focus', () => { regras.hidden = false; pintarRegras(); });
  campoSenha.addEventListener('input', pintarRegras);

  function avisoConfirmeEmail(email) {
    form.hidden = true;
    document.querySelector('.lp-ou').hidden = true;
    $('lp-google').hidden = true;
    $('lp-card-titulo').textContent = 'Confirme seu e-mail';
    $('lp-card-sub').textContent = 'Enviamos um link para ' + email + '. Clique nele para continuar o cadastro. Confira também o spam.';
    const reenviar = $('lp-reenviar');
    reenviar.hidden = false;
    reenviar.onclick = async () => {
      reenviar.disabled = true;
      const { error } = await supabaseClient.auth.resend({ type: 'signup', email, options: { emailRedirectTo: location.origin + '/dashboard' } });
      reenviar.textContent = error ? 'Aguarde um minuto e tente de novo' : 'E-mail reenviado';
    };
  }

  form.addEventListener('submit', async e => {
    e.preventDefault();
    erro.hidden = true;
    const email = campoEmail.value.trim();
    const password = campoSenha.value;
    if (!email) { mostrarErro('Digite o seu e-mail.'); campoEmail.focus(); return; }
    if (!senhaCumpreRegrasHub(password)) {
      regras.hidden = false;
      pintarRegras();
      campoSenha.focus();
      return;
    }
    botao.disabled = true;
    const { data, error } = await supabaseClient.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: location.origin + '/dashboard',
        data: { role: 'fornecedor', precisa_completar: true, origem_cadastro: origem, ...dadosDoDispositivo() }
      }
    });
    botao.disabled = false;
    if (error) {
      const recusada = mensagemSenhaRecusada(error);
      if (recusada) { mostrarErro(recusada); campoSenha.focus(); return; }
      mostrarErro(/already registered/i.test(error.message || '') ? 'Esse e-mail já tem uma conta. Tente entrar.' : 'Não foi possível criar sua conta. Confira os dados e tente de novo.');
      return;
    }
    // Com a confirmação ligada, o Supabase não dá erro para e-mail repetido:
    // devolve a conta sem nenhuma identidade.
    if (data?.user && Array.isArray(data.user.identities) && !data.user.identities.length) {
      mostrarErro('Esse e-mail já tem uma conta. Tente entrar.');
      return;
    }
    try { if (data?.user?.id) localStorage.setItem('b2b-onboarding-empresa', data.user.id); } catch (err) { /* sem armazenamento */ }
    if (!data?.session) { avisoConfirmeEmail(email); return; }
    location.href = 'signup?completar=1';
  });

  // Já conectado neste navegador: não cria outra conta por cima.
  (async () => {
    const { data } = await supabaseClient.auth.getSession();
    if (!data?.session) return;
    form.hidden = true;
    document.querySelector('.lp-ou').hidden = true;
    $('lp-google').hidden = true;
    document.querySelector('.lp-card-rodape').hidden = true;
    $('lp-card-titulo').textContent = 'Você já está conectado';
    $('lp-card-sub').textContent = 'Sua conta está aberta neste navegador.';
    $('lp-ir-painel').hidden = false;
  })();
})();
