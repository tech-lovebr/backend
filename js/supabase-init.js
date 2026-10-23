/* ==========================================================================
   LOVE — Cliente Supabase compartilhado (app principal)
   Depende do script global do Supabase (UMD) carregado antes deste arquivo.
   ========================================================================== */

// Link de "esqueci a senha" que caiu fora de /resetar-senha (ex.: o Supabase
// voltou para o Site URL porque o redirectTo não estava na lista permitida):
// manda para a página certa levando o token, antes do cliente consumi-lo aqui.
(function () {
  if (window.location.pathname.startsWith('/resetar-senha')) return;
  const hash = new URLSearchParams(window.location.hash.slice(1));
  const query = new URLSearchParams(window.location.search);
  const isRecovery = hash.get('type') === 'recovery' || query.get('type') === 'recovery';
  if (isRecovery) {
    window.location.replace('/resetar-senha' + window.location.search + window.location.hash);
  }
})();

const SUPABASE_URL = 'https://krpgtixwmxwhtjchcufl.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtycGd0aXh3bXh3aHRqY2hjdWZsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAxNzI5ODgsImV4cCI6MjEwNTc0ODk4OH0.6ZwpEz-m-qWM_bPW8_Fucvv2EWkdMBkmH2BVgPdMfuQ';

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/* ==========================================================================
   Nome do anfitrião: first_name / last_name / full_name

   Mesmos nomes no user_metadata do Auth (templates de e-mail usam
   {{ .Data.first_name }}) e na tabela clientes. full_name nunca é digitado:
   é sempre nome + sobrenome; sobrenome vazio → full_name é só o nome.
   ========================================================================== */

/* ==========================================================================
   Data de aniversário em 3 listas (Dia / Mês / Ano) no lugar do calendário

   Recebe o <input type="date"> já existente, transforma em campo oculto (o
   mesmo id continua guardando "AAAA-MM-DD" — ou "" enquanto faltar escolher
   algo) e põe as três listas logo depois dele, com as mesmas classes.
   Para preencher por código: input.definirData('1990-05-17').
   ========================================================================== */

const MESES_PT = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
const ANO_MINIMO_ANIVERSARIO = 1917;

function criarSeletorData(input) {
  if (!input || input.definirData) return input;

  const classe = input.className;
  input.type = 'hidden';

  const wrapper = document.createElement('div');
  wrapper.className = 'grid grid-cols-3 gap-2';

  function criarSelect(rotulo, opcoes) {
    const select = document.createElement('select');
    select.className = classe;
    select.setAttribute('aria-label', rotulo);
    select.innerHTML = `<option value="">${rotulo}</option>` +
      opcoes.map(([valor, texto]) => `<option value="${valor}">${texto}</option>`).join('');
    wrapper.appendChild(select);
    return select;
  }

  const anoAtual = new Date().getFullYear();
  const anos = [];
  for (let a = anoAtual; a >= ANO_MINIMO_ANIVERSARIO; a--) anos.push([a, a]);

  const dia = criarSelect('Dia', Array.from({ length: 31 }, (_, i) => [i + 1, i + 1]));
  const mes = criarSelect('Mês', MESES_PT.map((nome, i) => [i + 1, nome]));
  const ano = criarSelect('Ano', anos);
  input.after(wrapper);

  // Esconde os dias que não existem no mês/ano escolhido (31/04, 29/02…).
  function ajustarDias() {
    const ultimoDia = new Date(Number(ano.value) || 2000, Number(mes.value) || 1, 0).getDate();
    Array.from(dia.options).forEach(opt => {
      if (opt.value) opt.hidden = opt.disabled = Number(opt.value) > ultimoDia;
    });
    if (Number(dia.value) > ultimoDia) dia.value = String(ultimoDia);
  }

  function sincronizar() {
    ajustarDias();
    input.value = dia.value && mes.value && ano.value
      ? `${ano.value}-${String(mes.value).padStart(2, '0')}-${String(dia.value).padStart(2, '0')}`
      : '';
  }

  [dia, mes, ano].forEach(s => s.addEventListener('change', sincronizar));

  input.definirData = (valor) => {
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(valor || '');
    ano.value = m && Number(m[1]) >= ANO_MINIMO_ANIVERSARIO ? String(Number(m[1])) : '';
    mes.value = m ? String(Number(m[2])) : '';
    dia.value = m ? String(Number(m[3])) : '';
    sincronizar();
  };

  input.definirData(input.value);
  return input;
}

function montarNomeCliente(firstName, lastName) {
  const first_name = (firstName || '').trim().replace(/\s+/g, ' ');
  const last_name = (lastName || '').trim().replace(/\s+/g, ' ');
  const full_name = last_name ? `${first_name} ${last_name}` : first_name;
  return { first_name, last_name, full_name };
}

/* ==========================================================================
   De onde a pessoa se cadastrou

   auth.users não guarda aparelho nem navegador, e o user_agent da sessão só
   diz qual foi o último acesso — não o do cadastro. Então registramos no
   próprio metadado do signUp, que é o único momento em que a informação é
   realmente "de onde se cadastrou". O admin lê isso no drawer da conta.
   ========================================================================== */

function dadosDoDispositivo() {
  const ua = navigator.userAgent || "";

  const aparelho =
    /ipad|tablet/i.test(ua) ? "tablet" :
    /mobile|android|iphone|ipod/i.test(ua) ? "mobile" : "desktop";

  const navegador =
    /edg\//i.test(ua) ? "Edge" :
    /opr\/|opera/i.test(ua) ? "Opera" :
    /samsungbrowser/i.test(ua) ? "Samsung Internet" :
    /firefox|fxios/i.test(ua) ? "Firefox" :
    /chrome|crios/i.test(ua) ? "Chrome" :      // CriOS = Chrome no iPhone
    /safari/i.test(ua) ? "Safari" : null;

  return { dispositivo: aparelho, navegador };
}

// ==========================================
// Nomes de pessoas com a primeira letra de cada palavra em maiúscula,
// também no computador (no celular o teclado já faz isso): cadastro,
// Configurações da conta e convidados/acompanhantes. "de/da/do/dos/das/e"
// ficam minúsculas fora do começo; as outras letras ficam como digitadas
// e o cursor não sai do lugar.
// ==========================================
const PARTICULAS_DE_NOME = ['da', 'de', 'do', 'das', 'dos', 'e'];
function maiusculaNoNome(texto) {
  let palavra = 0;
  return String(texto || '').replace(/(^|\s)(\S)(\S*)/g, (m, espaco, primeira, resto) => {
    const ehParticula = palavra > 0 && PARTICULAS_DE_NOME.includes((primeira + resto).toLowerCase());
    palavra++;
    return espaco + (ehParticula ? primeira.toLowerCase() : primeira.toLocaleUpperCase('pt-BR')) + resto;
  });
}
const CAMPOS_DE_NOME_PROPRIO = [
  '#settings-user-first-name', '#settings-user-last-name',
  '#onboard-firstname-input', '#onboard-lastname-input',
  '#guest-name-input', '.guest-companion-name-input',
  '[data-nome-proprio]'
].join(', ');
document.addEventListener('input', (e) => {
  const campo = e.target;
  if (!campo || !campo.matches || !campo.matches(CAMPOS_DE_NOME_PROPRIO)) return;
  const novo = maiusculaNoNome(campo.value);
  if (novo === campo.value) return;
  const ini = campo.selectionStart, fim = campo.selectionEnd;
  campo.value = novo;
  try { campo.setSelectionRange(ini, fim); } catch (err) {}
});

// ==========================================
// Entrar com o Google. No computador abre uma janelinha (pop-up) por cima
// da página; ao terminar, auth-popup.html avisa esta página e fecha, e
// aoEntrar() roda (ex.: recarregar a plataforma). No celular — ou se o
// navegador bloquear o pop-up — vai para a página do Google e volta para a
// raiz do site. Devolve { error } se o Supabase recusar.
// ==========================================
async function entrarComGoogle({ aoEntrar, aoFalhar, soEntrar = false } = {}) {
  // Na volta do Google a plataforma lê esse modo (só entrar x cadastrar).
  try { localStorage.setItem('love-google-modo', soEntrar ? 'entrar' : 'cadastrar'); } catch (e) {}
  const ehCelular = window.matchMedia('(max-width: 767px)').matches || /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
  if (ehCelular) {
    return supabaseClient.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/`, queryParams: { prompt: 'select_account' } }
    });
  }

  const { data, error } = await supabaseClient.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${window.location.origin}/auth-popup.html`,
      queryParams: { prompt: 'select_account' },
      skipBrowserRedirect: true
    }
  });
  if (error || !data || !data.url) return { error: error || new Error('Sem URL do Google') };

  const largura = 500, altura = 640;
  const esquerda = Math.round(window.screenX + (window.outerWidth - largura) / 2);
  const topo = Math.round(window.screenY + (window.outerHeight - altura) / 2.5);
  const janela = window.open(data.url, 'love-google-login', `width=${largura},height=${altura},left=${esquerda},top=${topo},menubar=no,toolbar=no,location=yes,status=no`);
  if (!janela) {
    // Pop-up bloqueado: segue na mesma aba (volta para a raiz do site).
    return supabaseClient.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/`, queryParams: { prompt: 'select_account' } }
    });
  }
  janela.focus();

  return new Promise(resolve => {
    let terminou = false;
    const terminar = (ok) => {
      if (terminou) return;
      terminou = true;
      window.removeEventListener('message', aoReceber);
      clearInterval(vigia);
      if (ok) { if (typeof aoEntrar === 'function') aoEntrar(); }
      else if (typeof aoFalhar === 'function') aoFalhar();
      resolve({ error: ok ? null : new Error('Login com o Google não concluído') });
    };
    const aoReceber = (e) => {
      if (e.origin !== window.location.origin || !e.data || e.data.tipo !== 'love-google-login') return;
      terminar(e.data.resultado === 'ok');
    };
    window.addEventListener('message', aoReceber);
    // Janela fechada sem concluir: confere se a sessão existe mesmo assim.
    const vigia = setInterval(async () => {
      if (!janela.closed) return;
      const { data: s } = await supabaseClient.auth.getSession();
      terminar(!!(s && s.session));
    }, 600);
  });
}

// ==========================================
// Botão oficial do Google (Google Identity Services) + Supabase
// signInWithIdToken. Com ele a tela do Google mostra o domínio do site
// (love.com.br) — e não o endereço do Supabase, como no redirecionamento
// OAuth. O botão antigo fica escondido e só volta se o script do Google
// não carregar (ex.: bloqueador), usando o caminho antigo (entrarComGoogle).
// ==========================================
// Cliente OAuth só dos anfitriões (love.com.br), no projeto Google Cloud próprio
// "Love Anfitrioes" — o Hub usa o "Login - Hub" de outro projeto. Projetos
// separados para o Google não tratar os dois logins como o mesmo app,
// para o login de um não aparecer no outro.
const GOOGLE_CLIENT_ID = '555856044590-qeug48r9i9u65q2i1bssad62anvs0jii.apps.googleusercontent.com';
let googleIdentityPromessa = null;
let googleIdentityPronto = false;
let googleNonceBruto = null;
let googleAoEntrarAtual = null;
let googleAoFalharAtual = null;
let googleSoEntrarAtual = false;
let googleQualquerContaAtual = false;

// 'anfitriao' | 'fornecedor' | null (não existe) | undefined (não deu para
// conferir — segue o fluxo normal). Sem a migration 050, cai na checagem
// antiga só de anfitrião (027).
async function tipoDeContaDoEmail(email) {
  if (!email) return undefined;
  const r = await supabaseClient.rpc('verificar_email_cadastrado', { p_email: email });
  if (!r.error) return r.data || null;
  const antiga = await supabaseClient.rpc('verificar_email_anfitriao', { p_email: email });
  if (antiga.error) return undefined;
  return antiga.data ? 'anfitriao' : null;
}

// Texto do aviso quando o Google não pode seguir.
function mensagemErroGoogle(motivo) {
  if (motivo && motivo.codigo === 'fornecedor') {
    return 'Esse e-mail já está cadastrado na Love como fornecedor. Para cadastrar-se como anfitrião, use outro e-mail.';
  }
  if (motivo && motivo.codigo === 'nao-cadastrado') {
    return 'Esse e-mail não está cadastrado como anfitrião. <a href="/cadastro" style="font-weight:700;color:#537bae;">Cadastre-se</a>';
  }
  return 'Não foi possível continuar com o Google. Tente de novo.';
}

// Aviso logo abaixo do botão do Google (cadastro e "Criar conta").
function avisoAbaixoDoBotaoGoogle(botaoAntigo, html) {
  if (!botaoAntigo) return;
  const ancora = (botaoAntigo.nextElementSibling && botaoAntigo.nextElementSibling.classList.contains('google-botao-oficial'))
    ? botaoAntigo.nextElementSibling : botaoAntigo;
  let p = ancora.nextElementSibling && ancora.nextElementSibling.classList.contains('google-aviso') ? ancora.nextElementSibling : null;
  if (!p) {
    p = document.createElement('p');
    p.className = 'google-aviso';
    p.style.cssText = 'margin:0.5rem 0 0;font-size:0.75rem;line-height:1.45;color:#DC2626;text-align:center;';
    ancora.insertAdjacentElement('afterend', p);
  }
  p.innerHTML = html;
}

// E-mail de dentro do token do Google (JWT), sem validar — só para conferir
// o cadastro antes de entrar; quem valida o token de verdade é o Supabase.
function emailDoTokenGoogle(token) {
  try {
    const meio = String(token || '').split('.')[1] || '';
    const json = decodeURIComponent(atob(meio.replace(/-/g, '+').replace(/_/g, '/'))
      .split('').map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join(''));
    return (JSON.parse(json).email || '').trim();
  } catch (e) { return ''; }
}

function carregarGoogleIdentity() {
  if (window.google && google.accounts && google.accounts.id) return Promise.resolve();
  if (googleIdentityPromessa) return googleIdentityPromessa;
  googleIdentityPromessa = new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = 'https://accounts.google.com/gsi/client';
    s.async = true;
    s.defer = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('Não carregou o Google Identity'));
    document.head.appendChild(s);
    setTimeout(() => reject(new Error('Google Identity demorou demais')), 8000);
  });
  return googleIdentityPromessa;
}

async function sha256Hex(texto) {
  const dados = new TextEncoder().encode(texto);
  const hash = await crypto.subtle.digest('SHA-256', dados);
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
}

// Uma inicialização só por página (vários botões chamam ao mesmo tempo).
let googleInicioPromessa = null;
function iniciarGoogleIdentity() {
  if (!googleInicioPromessa) googleInicioPromessa = iniciarGoogleIdentityUmaVez();
  return googleInicioPromessa;
}

async function iniciarGoogleIdentityUmaVez() {
  if (googleIdentityPronto) return;
  const aleatorio = new Uint8Array(16);
  crypto.getRandomValues(aleatorio);
  googleNonceBruto = Array.from(aleatorio).map(b => b.toString(16).padStart(2, '0')).join('');
  const nonceHash = await sha256Hex(googleNonceBruto);
  google.accounts.id.initialize({
    client_id: GOOGLE_CLIENT_ID,
    nonce: nonceHash,
    ux_mode: 'popup',
    auto_select: false,
    cancel_on_tap_outside: true,
    callback: async (resposta) => {
      // ANTES de entrar, confere no banco de que tipo é a conta desse e-mail
      // (migration 050): e-mail de fornecedor do Hub B2B não entra nem vira
      // anfitrião; no login, e-mail sem cadastro não cria conta (igual ao
      // login com e-mail e senha) — criar conta é pelo cadastro.
      const email = emailDoTokenGoogle(resposta.credential);
      // /organizador: qualquer conta da Love (anfitrião ou fornecedor) entra.
      const tipoConta = googleQualquerContaAtual ? 'anfitriao' : await tipoDeContaDoEmail(email);
      if (tipoConta === 'fornecedor') {
        if (typeof googleAoFalharAtual === 'function') googleAoFalharAtual({ codigo: 'fornecedor', email });
        return;
      }
      if (googleSoEntrarAtual && tipoConta === null) {
        if (typeof googleAoFalharAtual === 'function') googleAoFalharAtual({ codigo: 'nao-cadastrado', email });
        return;
      }
      const { error } = await supabaseClient.auth.signInWithIdToken({
        provider: 'google',
        token: resposta.credential,
        nonce: googleNonceBruto
      });
      if (error) {
        console.error('Erro ao entrar com o Google:', error);
        if (typeof googleAoFalharAtual === 'function') googleAoFalharAtual(error);
        return;
      }
      if (typeof googleAoEntrarAtual === 'function') googleAoEntrarAtual();
    }
  });
  googleIdentityPronto = true;
}

// Troca botaoAntigo pelo botão oficial do Google. texto: 'signin_with'
// (Fazer login com o Google), 'signup_with' (Inscrever-se…) ou
// 'continue_with' (Continuar com o Google).
// soEntrar: true = só entra quem já é anfitrião (tela de login); false = cria a conta se for nova (cadastro).
async function botaoOficialDoGoogle(botaoAntigo, { aoEntrar, aoFalhar, texto = 'continue_with', soEntrar = false, qualquerConta = false } = {}) {
  if (!botaoAntigo || botaoAntigo.dataset.googleOficial) return;
  try {
    await carregarGoogleIdentity();
    await iniciarGoogleIdentity();
  } catch (e) {
    console.warn('Botão oficial do Google indisponível; usando o botão antigo.', e);
    return;
  }
  botaoAntigo.dataset.googleOficial = '1';
  const caixa = document.createElement('div');
  caixa.className = 'google-botao-oficial';
  caixa.style.cssText = 'display:flex;justify-content:center;width:100%;min-height:44px;';
  botaoAntigo.insertAdjacentElement('afterend', caixa);
  botaoAntigo.style.display = 'none';
  // A largura do botão do Google é fixa (200 a 400px): desenha com a largura
  // real da caixa — que é a mesma dos campos acima — só quando ela aparece
  // (telas escondidas medem 0) e redesenha se a largura mudar.
  let larguraDesenhada = 0;
  const desenhar = () => {
    const disponivel = Math.round(caixa.getBoundingClientRect().width);
    if (!disponivel) return;
    const largura = Math.max(200, Math.min(400, disponivel));
    if (Math.abs(largura - larguraDesenhada) < 2) return;
    larguraDesenhada = largura;
    caixa.innerHTML = '';
    google.accounts.id.renderButton(caixa, {
      type: 'standard',
      theme: 'outline',
      size: 'large',
      text: texto,
      shape: 'rectangular',
      logo_alignment: 'center',
      width: largura,
      locale: 'pt-BR',
      click_listener: () => { googleAoEntrarAtual = aoEntrar; googleAoFalharAtual = aoFalhar; googleSoEntrarAtual = !!soEntrar; googleQualquerContaAtual = !!qualquerConta; }
    });
  };
  desenhar();
  if (window.ResizeObserver) {
    let espera = null;
    new ResizeObserver(() => { clearTimeout(espera); espera = setTimeout(desenhar, 120); }).observe(caixa);
  }
}

/* ==========================================================================
   Último aparelho usado (modelo do celular, sistema e navegador)

   O Admin mostra no drawer da conta. O navegador só conta o modelo no
   Android (Chrome/Edge/Samsung, pelas "client hints"); no iPhone a Apple não
   informa o modelo, então fica "iPhone · iOS 17.5". Guardado no metadado da
   conta (ultimo_aparelho) só quando muda, para não gravar a cada página.
   ========================================================================== */

async function descreverAparelho() {
  const ua = navigator.userAgent || '';
  let modelo = '';
  let sistema = '';

  try {
    const hints = navigator.userAgentData && await navigator.userAgentData.getHighEntropyValues(['model', 'platform', 'platformVersion']);
    if (hints) {
      modelo = (hints.model || '').trim();
      if (hints.platform === 'Android') sistema = `Android ${String(hints.platformVersion || '').split('.')[0]}`.trim();
      else if (hints.platform === 'Windows') sistema = Number(String(hints.platformVersion || '0').split('.')[0]) >= 13 ? 'Windows 11' : 'Windows 10';
      else if (hints.platform === 'macOS') sistema = 'Mac';
      else if (hints.platform === 'Chrome OS') sistema = 'Chromebook';
    }
  } catch { /* navegador sem client hints: fica com o user agent */ }

  if (!sistema) {
    const ios = ua.match(/(iPhone|iPad|iPod).*?OS (\d+)[_.](\d+)/);
    const android = ua.match(/Android (\d+)/);
    if (ios) { sistema = `iOS ${ios[2]}.${ios[3]}`; modelo = modelo || ios[1]; }
    else if (android) sistema = `Android ${android[1]}`;
    else if (/Windows NT/.test(ua)) sistema = 'Windows';
    else if (/Mac OS X/.test(ua)) sistema = 'Mac';
    else if (/Linux/.test(ua)) sistema = 'Linux';
  }

  // Android antigo/Firefox ainda trazem o modelo no user agent ("; SM-S918B Build").
  if (!modelo) {
    const m = ua.match(/Android [\d.]+; (?:[a-z]{2}-[a-z]{2}; )?([^;)]+?)(?: Build|\))/i);
    if (m && m[1] !== 'K') modelo = m[1].trim();
  }

  const navegador = (typeof dadosDoDispositivo === 'function' && dadosDoDispositivo().navegador) || '';
  return [modelo, sistema, navegador].filter(Boolean).join(' · ').slice(0, 120);
}

async function registrarUltimoAparelho(session) {
  if (!session || !session.user) return;
  try {
    const atual = await descreverAparelho();
    if (!atual || session.user.user_metadata?.ultimo_aparelho === atual) return;
    await supabaseClient.auth.updateUser({ data: { ultimo_aparelho: atual } });
  } catch { /* não atrapalha o uso da plataforma */ }
}

supabaseClient.auth.onAuthStateChange((evento, session) => {
  if (evento !== 'SIGNED_IN' && evento !== 'INITIAL_SESSION') return;
  // Fora do caminho do carregamento da página.
  setTimeout(() => registrarUltimoAparelho(session), 1500);
});
