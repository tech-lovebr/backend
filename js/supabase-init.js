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
