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
