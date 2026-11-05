/**
 * LOVE - i18n por domínio (sistema de chaves de tradução)
 *
 * planwithlove.com é a mesma plataforma que love.com.br, só em inglês — sem
 * nenhuma duplicação de HTML/CSS/JS. O idioma é decidido 100% pelo hostname
 * (nunca por preferência do navegador nem por um seletor visível), igual ao
 * que já roda na landing pública (ver index.html, classe "love-en-domain").
 *
 * O atributo é data-love-i18n (e não data-i18n) porque extensões do Chrome,
 * como a "Método Pomodoro", traduzem qualquer [data-i18n] da página com o
 * dicionário delas e escrevem a chave crua (ex.: "login.entrar") na tela.
 *
 * Como usar num elemento estático:
 *   <h3 data-love-i18n="login.acessarConta">Acesse sua conta</h3>
 *   <input data-love-i18n-placeholder="login.emailPlaceholder" placeholder="seu.email@exemplo.com">
 * (atributos aceitos: data-love-i18n [textContent], data-love-i18n-html [innerHTML],
 *  data-love-i18n-placeholder, data-love-i18n-aria-label, data-love-i18n-title, data-love-i18n-alt)
 *
 * Para texto montado em JS (toasts, erros, innerHTML dinâmico), chame
 * LoveI18n.t('namespace.chave') direto no lugar do literal em português.
 *
 * Importante: só traduz a INTERFACE (botões, rótulos, mensagens do sistema).
 * Nunca traduz conteúdo que a própria pessoa digitou (nome do evento, nomes
 * de convidados, descrições de fornecedores etc.) — isso é dado, não texto
 * da plataforma.
 */
(function () {
  function hostnameEhIngles() {
    try {
      if (document.documentElement.classList.contains('love-en-domain')) return true;
      return /(^|\.)planwithlove\.com$/i.test(location.hostname);
    } catch (e) {
      return false;
    }
  }

  var EM_INGLES = hostnameEhIngles();
  var IDIOMA = EM_INGLES ? 'en' : 'pt';

  // Dicionário por namespace. Cada chave = { pt, en }. Namespaces novos
  // (dashboard por seção: convite, convidados, presentes, mesas, carteira,
  // b2b…) entram aqui conforme forem traduzidos — sem seletor visível, o
  // dono do idioma é sempre o hostname.
  var DICIONARIO = {
    login: {
      acessarConta: { pt: 'Acesse sua conta', en: 'Access your account' },
      email: { pt: 'E-mail', en: 'Email' },
      emailPlaceholder: { pt: 'seu.email@exemplo.com', en: 'you@example.com' },
      senha: { pt: 'Senha', en: 'Password' },
      senhaPlaceholder: { pt: 'Sua senha secreta', en: 'Your password' },
      mostrarSenha: { pt: 'Mostrar senha', en: 'Show password' },
      esconderSenha: { pt: 'Esconder senha', en: 'Hide password' },
      esqueceuSenha: { pt: 'Esqueceu a senha?', en: 'Forgot your password?' },
      entrar: { pt: 'Entrar', en: 'Log in' },
      ouContinueCom: { pt: 'ou continue com', en: 'or continue with' },
      continuarComGoogle: { pt: 'Continuar com o Google', en: 'Continue with Google' },
      continuarComApple: { pt: 'Continuar com a Apple', en: 'Continue with Apple' },
      aindaNaoTemConta: { pt: 'Ainda não tem uma conta?', en: "Don't have an account yet?" },
      cadastreSe: { pt: 'Cadastre-se', en: 'Sign up' },
      recuperarSenha: { pt: 'Recuperar senha', en: 'Reset password' },
      recuperarSenhaDesc: { pt: 'Digite seu e-mail e enviaremos um link para você criar uma nova senha.', en: "Enter your email and we'll send you a link to create a new password." },
      reenviarSenha: { pt: 'Reenviar senha', en: 'Send reset link' },
      voltarParaLogin: { pt: '← Voltar para o login', en: '← Back to login' },
      verificacaoDuasEtapas: { pt: 'Verificação em duas etapas', en: 'Two-factor verification' },
      verificacaoDuasEtapasDesc: { pt: 'Digite o código de 6 dígitos do seu app autenticador.', en: 'Enter the 6-digit code from your authenticator app.' },
      codigo: { pt: 'Código', en: 'Code' },
      verificar: { pt: 'Verificar', en: 'Verify' },
      usuarioBloqueado: { pt: 'Este usuário está bloqueado.', en: 'This user is blocked.' },
      emailNaoCadastradoHtml: { pt: 'Esse e-mail não está cadastrado como anfitrião. <a href="/cadastro" class="font-bold text-[#537bae] hover:text-[#416799] hover:underline">Cadastre-se</a>', en: 'This email isn’t registered as a host yet. <a href="/cadastro" class="font-bold text-[#537bae] hover:text-[#416799] hover:underline">Sign up</a>' },
      confirmeEmailFrase: { pt: 'Confirme seu e-mail para entrar. Enviamos um link para', en: 'Confirm your email to log in. We sent a link to' },
      confiraSpam: { pt: 'Confira também o spam.', en: 'Also check your spam folder.' },
      reenviarEmail: { pt: 'Reenviar e-mail', en: 'Resend email' },
      aguardeUmMinuto: { pt: 'Aguarde um minuto e tente de novo', en: 'Wait a minute and try again' },
      emailReenviado: { pt: 'E-mail reenviado', en: 'Email resent' },
      usuarioSenhaInvalidosTemplate: { pt: 'Usuário ou senha inválidos. ({n}/3)', en: 'Invalid username or password. ({n}/3)' },
      codigoSeisDigitos: { pt: 'O código tem 6 dígitos.', en: 'The code has 6 digits.' },
      codigoInvalidoExpirado: { pt: 'Código inválido ou expirado. Tente de novo.', en: 'Invalid or expired code. Try again.' },
      seEmailCadastradoRecuperacao: { pt: 'Se esse e-mail estiver cadastrado, você vai receber um link de recuperação.', en: 'If that email is registered, you’ll receive a reset link.' },
      naoFoiPossivelEntrarGoogle: { pt: 'Não foi possível entrar com o Google. Tente de novo.', en: 'Couldn’t sign in with Google. Try again.' },
      googleJaCadastradoFornecedor: { pt: 'Esse e-mail já está cadastrado na Love como fornecedor. Para cadastrar-se como anfitrião, use outro e-mail.', en: 'This email is already registered on Love as a vendor. To sign up as a host, use a different email.' },
      googleNaoCadastradoHtml: { pt: 'Esse e-mail não está cadastrado como anfitrião. <a href="/cadastro" style="font-weight:700;color:#537bae;">Cadastre-se</a>', en: 'This email isn’t registered as a host yet. <a href="/cadastro" style="font-weight:700;color:#537bae;">Sign up</a>' },
      googleNaoFoiPossivelContinuar: { pt: 'Não foi possível continuar com o Google. Tente de novo.', en: 'Couldn’t continue with Google. Try again.' }
    },
    cadastro: {
      etapaComecar: { pt: 'Começar', en: 'Start' },
      etapaSeusDados: { pt: 'Seus dados', en: 'Your info' },
      etapaFinalizar: { pt: 'Finalizar', en: 'Finish' },
      tituloTipoEvento: { pt: 'Vamos planejar o seu grande dia?', en: "Let's plan your big day?" },
      subTituloTipoEvento: { pt: 'Para começar, que tipo de evento você quer celebrar?', en: "To start, what kind of event do you want to celebrate?" },
      casamento: { pt: 'Casamento', en: 'Wedding' },
      aniversario: { pt: 'Aniversário', en: 'Birthday' },
      bodas: { pt: 'Bodas', en: 'Anniversary' },
      chaDeBebe: { pt: 'Chá de Bebê', en: 'Baby Shower' },
      festaDe15: { pt: 'Festa de 15 Anos', en: 'Quinceañera' },
      outro: { pt: 'Outro', en: 'Other' },
      outroTipoEvento: { pt: 'Outro tipo de evento', en: 'Other event type' },
      proximo: { pt: 'Próximo', en: 'Next' },
      jaTemContaEntre: { pt: 'Já tem uma conta? <a href="/login" class="text-[#537bae] font-bold hover:underline">Entre por aqui</a>', en: 'Already have an account? <a href="/login" class="text-[#537bae] font-bold hover:underline">Log in here</a>' },
      voltar: { pt: 'Voltar', en: 'Back' },
      tituloDadosPessoais: { pt: 'Conte um pouco sobre você.', en: 'Tell us a bit about yourself.' },
      subTituloDadosPessoais: { pt: 'Isso nos ajuda a personalizar sua experiência.', en: 'This helps us personalize your experience.' },
      nome: { pt: 'Nome', en: 'First name' },
      nomePlaceholder: { pt: 'Seu nome', en: 'Your first name' },
      sobrenome: { pt: 'Sobrenome', en: 'Last name' },
      sobrenomePlaceholder: { pt: 'Seu sobrenome', en: 'Your last name' },
      dataNascimento: { pt: 'Data de nascimento', en: 'Date of birth' },
      dataEvento: { pt: 'Data do evento', en: 'Event date' },
      aindaNaoSei: { pt: 'Ainda não sei', en: "I don't know yet" },
      tituloFinalizar: { pt: 'Finalize seu cadastro.', en: 'Finish creating your account.' },
      subTituloFinalizar: { pt: 'Só falta criar seu acesso à plataforma.', en: 'Just one step left to access the platform.' },
      email: { pt: 'E-mail', en: 'Email' },
      senha: { pt: 'Senha', en: 'Password' },
      criarSenhaPlaceholder: { pt: 'Crie uma senha', en: 'Create a password' },
      mostrarSenha: { pt: 'Mostrar senha', en: 'Show password' },
      esconderSenha: { pt: 'Esconder senha', en: 'Hide password' },
      senhaPeloMenos8: { pt: 'Pelo menos 8 caracteres', en: 'At least 8 characters' },
      senhaUmaMaiuscula: { pt: 'Uma letra maiúscula', en: 'One uppercase letter' },
      senhaUmaMinuscula: { pt: 'Uma letra minúscula', en: 'One lowercase letter' },
      senhaUmNumero: { pt: 'Um número', en: 'One number' },
      senhaFraca: { pt: 'Senha fraca', en: 'Weak password' },
      senhaMedia: { pt: 'Senha média', en: 'Medium password' },
      senhaForte: { pt: 'Senha forte', en: 'Strong password' },
      criarConta: { pt: 'Criar conta', en: 'Create account' },
      criando: { pt: 'Criando...', en: 'Creating...' },
      ouContinueCom: { pt: 'ou continue com', en: 'or continue with' },
      continuarComGoogle: { pt: 'Continuar com o Google', en: 'Continue with Google' },
      continuarComApple: { pt: 'Continuar com a Apple', en: 'Continue with Apple' },
      jaTemContaEntrar: { pt: 'Já tem uma conta? <a href="/login" class="text-[#537bae] font-bold hover:underline">Entrar</a>', en: 'Already have an account? <a href="/login" class="text-[#537bae] font-bold hover:underline">Log in</a>' },
      appleIndisponivel: { pt: 'Cadastro com a Apple ainda não disponível. Use o Google ou e-mail e senha.', en: 'Signing up with Apple isn’t available yet. Use Google or email and password.' },
      emailJaExiste: { pt: 'Esse e-mail já tem uma conta. Faça login.', en: 'This email already has an account. Please log in.' },
      erroCriarConta: { pt: 'Não foi possível criar sua conta: ', en: 'We couldn’t create your account: ' },
      confirmeSeuEmail: { pt: 'Confirme seu e-mail', en: 'Confirm your email' },
      linkConfirmacaoEnviado: { pt: 'Enviamos um link de confirmação para', en: 'We sent a confirmation link to' },
      cliqueNoLink: { pt: 'Clique no link para ativar sua conta e poder entrar na plataforma.', en: 'Click the link to activate your account and access the platform.' },
      fraseLateral: { pt: 'Para o dia em<br>que tudo começa', en: 'For the day<br>it all begins' }
    },
    dashboardChrome: {
      inicio: { pt: 'Início', en: 'Home' },
      convite: { pt: 'Convite', en: 'Invitation' },
      presentes: { pt: 'Presentes', en: 'Gifts' },
      convidados: { pt: 'Convidados', en: 'Guests' },
      financeiro: { pt: 'Financeiro', en: 'Finance' },
      mensagens: { pt: 'Mensagens', en: 'Messages' },
      fornecedores: { pt: 'Fornecedores', en: 'Vendors' },
      notificacoes: { pt: 'Notificações', en: 'Notifications' },
      minhaConta: { pt: 'Minha conta', en: 'My account' },
      seusEventos: { pt: 'Seus eventos', en: 'Your events' },
      criarNovoEvento: { pt: 'Criar novo evento', en: 'Create new event' },
      verMeuSite: { pt: 'Ver meu site', en: 'View my site' },
      configuracoes: { pt: 'Configurações', en: 'Settings' },
      falarComSuporte: { pt: 'Falar com Suporte', en: 'Contact Support' },
      centralDeAjuda: { pt: 'Central de ajuda', en: 'Help Center' },
      sair: { pt: 'Sair', en: 'Log out' },
      abrirMenu: { pt: 'Abrir menu', en: 'Open menu' },
      fecharMenu: { pt: 'Fechar menu', en: 'Close menu' },
      fechar: { pt: 'Fechar', en: 'Close' },
      visaoGeralHome: { pt: 'Visão Geral / Home', en: 'Overview / Home' },
      visaoGeral: { pt: 'Visão Geral', en: 'Overview' },
      personalizarEvento: { pt: 'Personalizar evento', en: 'Customize event' },
      listaDePresentes: { pt: 'Lista de Presentes', en: 'Gift Registry' },
      seusConvidadosRsvp: { pt: 'Seus Convidados (RSVP)', en: 'Your Guests (RSVP)' },
      carteira: { pt: 'Carteira', en: 'Wallet' }
    }
  };

  function resolverChave(chave) {
    var partes = String(chave || '').split('.');
    var nodo = DICIONARIO;
    for (var i = 0; i < partes.length; i++) {
      if (!nodo || typeof nodo !== 'object') return null;
      nodo = nodo[partes[i]];
    }
    return nodo && typeof nodo === 'object' ? nodo : null;
  }

  /** @param {string} chave @returns {string} tradução no idioma atual (cai pro PT se faltar o EN) */
  function t(chave) {
    var par = resolverChave(chave);
    if (!par) return chave;
    return par[IDIOMA] || par.pt || chave;
  }

  // chave do atributo data-love-i18n-<chave> → nome real do atributo a trocar.
  var MAPA_ATRIBUTOS = { placeholder: 'placeholder', 'aria-label': 'aria-label', title: 'title', alt: 'alt', dica: 'data-dica' };

  /** Aplica as traduções dentro de `raiz` (documento inteiro por padrão). Chame de novo depois de inserir HTML novo dinamicamente. */
  function aplicarTraducao(raiz) {
    if (!EM_INGLES) return;
    raiz = raiz || document;
    raiz.querySelectorAll('[data-love-i18n]').forEach(function (el) {
      var par = resolverChave(el.getAttribute('data-love-i18n'));
      if (par) el.textContent = par.en || par.pt;
    });
    raiz.querySelectorAll('[data-love-i18n-html]').forEach(function (el) {
      var par = resolverChave(el.getAttribute('data-love-i18n-html'));
      if (par) el.innerHTML = par.en || par.pt;
    });
    Object.keys(MAPA_ATRIBUTOS).forEach(function (chaveAttr) {
      var attrReal = MAPA_ATRIBUTOS[chaveAttr];
      raiz.querySelectorAll('[data-love-i18n-' + chaveAttr + ']').forEach(function (el) {
        var par = resolverChave(el.getAttribute('data-love-i18n-' + chaveAttr));
        if (par) el.setAttribute(attrReal, par.en || par.pt);
      });
    });
  }

  window.LoveI18n = { idioma: IDIOMA, emIngles: EM_INGLES, t: t, aplicarTraducao: aplicarTraducao };

  document.addEventListener('DOMContentLoaded', function () { aplicarTraducao(document); });
})();
