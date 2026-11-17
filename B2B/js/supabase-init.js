/* ==========================================================================
   LOVE B2B — Cliente Supabase compartilhado
   Depende do script global do Supabase (UMD) carregado antes deste arquivo.
   ========================================================================== */

const SUPABASE_URL = 'https://krpgtixwmxwhtjchcufl.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtycGd0aXh3bXh3aHRqY2hjdWZsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAxNzI5ODgsImV4cCI6MjEwNTc0ODk4OH0.6ZwpEz-m-qWM_bPW8_Fucvv2EWkdMBkmH2BVgPdMfuQ';

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

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

/* ==========================================================================
   Entrar com o Google em janelinha (pop-up), como no love.com.br

   No computador abre a tela do Google numa janela pequena por cima do Hub.
   A volta do Google cai na mesma página de sempre (dashboard, que já
   está liberada no Supabase); como a janela tem nome próprio, ela só avisa
   o Hub e fecha. No celular, ou se o navegador bloquear o pop-up, segue o
   caminho antigo (a página inteira vai para o Google e volta).
   ========================================================================== */

const JANELA_GOOGLE_HUB = 'love-hub-google-login';

async function entrarComGoogleHub(redirectTo) {
  const opcoesBase = { redirectTo, queryParams: { prompt: 'select_account' } };
  const ehCelular = window.matchMedia('(max-width: 767px)').matches || /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
  if (ehCelular) return supabaseClient.auth.signInWithOAuth({ provider: 'google', options: opcoesBase });

  const { data, error } = await supabaseClient.auth.signInWithOAuth({
    provider: 'google',
    options: { ...opcoesBase, skipBrowserRedirect: true }
  });
  if (error || !data || !data.url) return supabaseClient.auth.signInWithOAuth({ provider: 'google', options: opcoesBase });

  const largura = 500, altura = 640;
  const esquerda = Math.round(window.screenX + (window.outerWidth - largura) / 2);
  const topo = Math.round(window.screenY + (window.outerHeight - altura) / 2.5);
  const janela = window.open(data.url, JANELA_GOOGLE_HUB, `width=${largura},height=${altura},left=${esquerda},top=${topo},menubar=no,toolbar=no,location=yes,status=no`);
  if (!janela) return supabaseClient.auth.signInWithOAuth({ provider: 'google', options: opcoesBase });
  janela.focus();

  return new Promise(resolve => {
    let terminou = false;
    const terminar = (ok) => {
      if (terminou) return;
      terminou = true;
      window.removeEventListener('message', aoReceber);
      clearInterval(vigia);
      // Entrou: o Hub (esta aba) segue para o painel.
      if (ok) window.location.href = 'dashboard';
      resolve({ error: ok ? null : new Error('Login com o Google não concluído') });
    };
    const aoReceber = (e) => {
      if (e.origin !== window.location.origin || !e.data || e.data.tipo !== 'love-hub-google-login') return;
      terminar(e.data.resultado === 'ok');
    };
    window.addEventListener('message', aoReceber);
    // Janela fechada sem aviso: confere se a sessão existe mesmo assim.
    const vigia = setInterval(async () => {
      if (!janela.closed) return;
      const { data: s } = await supabaseClient.auth.getSession();
      terminar(!!(s && s.session));
    }, 600);
  });
}

// Dentro da janelinha, na volta do Google: esconde a página, espera a sessão
// ser lida da URL, avisa o Hub que abriu a janela e fecha.
if (window.name === JANELA_GOOGLE_HUB && window.opener && !window.opener.closed) {
  document.documentElement.style.visibility = 'hidden';
  (async () => {
    const temErro = /error=/.test(location.hash + location.search);
    let sessao = null;
    for (let i = 0; i < 20 && !temErro; i++) {
      const { data } = await supabaseClient.auth.getSession();
      if (data && data.session) { sessao = data.session; break; }
      await new Promise(r => setTimeout(r, 150));
    }
    try { window.opener.postMessage({ tipo: 'love-hub-google-login', resultado: sessao ? 'ok' : 'erro' }, location.origin); } catch (e) {}
    window.close();
  })();
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

/* ==========================================================================
   Senha segura (igual à Love): pelo menos 8 caracteres, uma maiúscula, uma
   minúscula, um número e não ser fácil de adivinhar. Vale no cadastro, no
   Crie uma nova senha e em Configurações. O Hub movimenta dinheiro (saldo,
   saques), então "Senha123", "Abc12345", "Love2026", sequências e senhas com
   o nome/e-mail da pessoa ficam de fora. Isto é a barreira do navegador; a de
   verdade fica no Supabase (Auth → requisitos de senha, senhas vazadas,
   limite de tentativas e CAPTCHA).
   ========================================================================== */
var MENSAGEM_REGRAS_SENHA_HUB = 'A senha precisa ter pelo menos 8 caracteres, uma letra maiúscula, uma letra minúscula e um número, e não pode ser fácil de adivinhar (como Senha123, sequências, seu nome ou seu e-mail).';
var MENSAGEM_REGRAS_SENHA_HUB_EN = 'The password must have at least 8 characters, one uppercase letter, one lowercase letter and one number, and can’t be easy to guess (like Password123, sequences, your name or your email).';
var SENHAS_PALAVRAS_COMUNS_HUB = new Set([
  'senha', 'minhasenha', 'senhaforte', 'novasenha', 'password', 'passw', 'pass', 'admin', 'administrador', 'root', 'user', 'usuario',
  'teste', 'test', 'mudar', 'mudarsenha', 'trocar', 'acesso', 'entrar', 'login', 'segredo', 'secreto', 'secret', 'welcome', 'bemvindo', 'bemvinda',
  'love', 'loves', 'lovehub', 'hub', 'iloveyou', 'teamo', 'amor', 'meuamor', 'amoreterno', 'amorzinho', 'paixao', 'casamento', 'casal', 'noiva', 'noivo', 'festa',
  'aniversario', 'deus', 'jesus', 'deusefiel', 'familia', 'feliz', 'felicidade', 'brasil', 'brazil', 'saopaulo', 'riodejaneiro',
  'flamengo', 'corinthians', 'palmeiras', 'santos', 'vasco', 'gremio', 'internacional', 'cruzeiro', 'botafogo', 'fluminense', 'atletico', 'bahia',
  'qwerty', 'qwertyuiop', 'asdf', 'asdfgh', 'zxcvbn', 'abc', 'abcd', 'abcde', 'abcdef', 'abcdefg', 'abcdefgh', 'aa', 'aaa',
  'princesa', 'princess', 'dragon', 'monkey', 'master', 'shadow', 'sunshine', 'football', 'futebol', 'baseball', 'superman', 'batman',
  'maria', 'joao', 'jose', 'ana', 'pedro', 'lucas', 'gabriel', 'rafael', 'mateus', 'matheus', 'julia', 'beatriz', 'mariana', 'fernanda',
  'banco', 'pix', 'dinheiro', 'carteira', 'gateway', 'asaas', 'empresa', 'fornecedor', 'eventos', 'buffet', 'bufe', 'decoracao', 'fotografia'
]);
var SENHAS_INTEIRAS_COMUNS_HUB = new Set([
  '1q2w3e4r', '1q2w3e4r5t', 'q1w2e3r4', 'q1w2e3r4t5', '1qaz2wsx', 'zaq12wsx', 'qazwsx', 'a1b2c3d4', 'a1s2d3f4', 'p4ssw0rd', 'passw0rd', 'trustno1'
]);
var SEQUENCIAS_SENHA_HUB = ['abcdefghijklmnopqrstuvwxyz', '01234567890', 'qwertyuiop', 'asdfghjkl', 'zxcvbnm', '1qaz2wsx3edc', 'qazwsxedc'];

/** Troca os disfarces mais comuns (S3nh@ → senha) e deixa em minúsculas sem acento. */
function normalizarSenhaHub(v) {
  return String(v || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/@|4/g, 'a').replace(/3/g, 'e').replace(/[1!|]/g, 'i').replace(/0/g, 'o').replace(/[$5]/g, 's').replace(/7/g, 't');
}

/**
 * true quando a senha é fácil de adivinhar, mesmo cumprindo maiúscula/minúscula/número.
 * @param {string} senha
 * @param {{ email?: string, nome?: string }} [contexto] e-mail e nome (pessoa ou empresa), quando já se sabe
 */
function senhaEhFacilHub(senha, contexto) {
  var v = String(senha || '');
  if (!v) return true;
  var minus = v.toLowerCase();
  if (SENHAS_INTEIRAS_COMUNS_HUB.has(minus)) return true;
  if (new Set(minus).size < 5) return true;
  if (/(.)\1{3,}/.test(minus)) return true;
  for (var s = 0; s < SEQUENCIAS_SENHA_HUB.length; s++) {
    var seq = SEQUENCIAS_SENHA_HUB[s], inv = seq.split('').reverse().join('');
    for (var i = 0; i + 4 <= seq.length; i++) {
      if (minus.indexOf(seq.slice(i, i + 4)) >= 0 || minus.indexOf(inv.slice(i, i + 4)) >= 0) return true;
    }
  }
  var letras = normalizarSenhaHub(v).replace(/[^a-z]/g, '');
  if (SENHAS_PALAVRAS_COMUNS_HUB.has(letras)) return true;
  var soLetras = minus.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z]/g, '');
  if (SENHAS_PALAVRAS_COMUNS_HUB.has(soLetras)) return true;
  if (/love|senha|password|passw/.test(normalizarSenhaHub(v))) return true;
  var ctx = contexto || {}, pedacos = [];
  var usuario = String(ctx.email || '').toLowerCase().split('@')[0];
  usuario.split(/[^a-z0-9]+/).forEach(function (p) { pedacos.push(p); });
  pedacos.push(usuario.replace(/[^a-z0-9]/g, ''));
  String(ctx.nome || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').split(/\s+/).forEach(function (p) { pedacos.push(p); });
  var semAcento = minus.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  return pedacos.some(function (p) { return p && p.length >= 3 && (semAcento.indexOf(p) >= 0 || letras.indexOf(p) >= 0); });
}

/** As 5 regras, uma a uma (para o quadro de regras). */
function regrasDaSenhaHub(senha, contexto) {
  var v = String(senha || '');
  return { length: v.length >= 8, upper: /[A-Z]/.test(v), lower: /[a-z]/.test(v), number: /[0-9]/.test(v), facil: !!v && !senhaEhFacilHub(v, contexto) };
}
function senhaCumpreRegrasHub(senha, contexto) {
  var r = regrasDaSenhaHub(senha, contexto);
  return r.length && r.upper && r.lower && r.number && r.facil;
}

/* Força bruta no login: 5 senhas erradas para o mesmo e-mail em 15 min
   bloqueiam novas tentativas neste navegador por 15 min (sobrevive a
   recarregar). A barreira de verdade é o limite de tentativas e o CAPTCHA do
   Supabase Auth, que valem para qualquer cliente. */
var LOGIN_HUB_MAX_TENTATIVAS = 5, LOGIN_HUB_JANELA_MS = 15 * 60 * 1000, LOGIN_HUB_BLOQUEIO_MS = 15 * 60 * 1000;
var CHAVE_TENTATIVAS_LOGIN_HUB = 'love-hub-login-tentativas';
function lerTentativasLoginHub() {
  try { return JSON.parse(localStorage.getItem(CHAVE_TENTATIVAS_LOGIN_HUB) || '{}') || {}; } catch (e) { return {}; }
}
function gravarTentativasLoginHub(todas) {
  try { localStorage.setItem(CHAVE_TENTATIVAS_LOGIN_HUB, JSON.stringify(todas)); } catch (e) {}
}
/** Minutos que ainda faltam de bloqueio para esse e-mail (0 = liberado). */
function minutosBloqueioLoginHub(email) {
  var r = lerTentativasLoginHub()[String(email).toLowerCase()];
  return r && r.ate > Date.now() ? Math.ceil((r.ate - Date.now()) / 60000) : 0;
}
/** Conta uma senha errada; devolve os minutos de bloqueio se chegou ao limite. */
function registrarFalhaLoginHub(email) {
  var todas = lerTentativasLoginHub(), chave = String(email).toLowerCase(), agora = Date.now();
  var r = todas[chave] && agora - todas[chave].desde < LOGIN_HUB_JANELA_MS ? todas[chave] : { n: 0, desde: agora, ate: 0 };
  r.n += 1;
  if (r.n >= LOGIN_HUB_MAX_TENTATIVAS) { r.ate = agora + LOGIN_HUB_BLOQUEIO_MS; r.n = 0; r.desde = agora; }
  todas[chave] = r;
  gravarTentativasLoginHub(todas);
  return r.ate > agora ? Math.ceil(LOGIN_HUB_BLOQUEIO_MS / 60000) : 0;
}
function limparFalhasLoginHub(email) {
  var todas = lerTentativasLoginHub();
  delete todas[String(email).toLowerCase()];
  gravarTentativasLoginHub(todas);
}
