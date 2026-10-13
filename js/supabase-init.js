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
