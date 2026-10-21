/* ==========================================================================
   LOVE B2B — Shell compartilhado (Sidebar + Topbar)
   Injeta os partials em toda página e resolve navegação/topbar.
   ========================================================================== */

// site-preview.html é a página pública do site publicado pelo fornecedor
// (quem acessa é o cliente final, não precisa estar logado no B2B nem tentar
// sessão nenhuma).
const PUBLIC_PAGES = ['site-preview'];

// termos e privacidade também são de leitura livre (logado ou não), mas ao
// contrário de site-preview elas IMPORTAM se há sessão: logado, o texto abre
// dentro do mesmo shell (sidebar + header) de qualquer página do portal —
// exatamente como a plataforma principal (love.com.br) já faz — em vez de
// uma página solta aberta em outra aba.
const AUTH_OPTIONAL_PAGES = ['termos', 'privacidade'];

// Aplica o tema e o estado do sidebar salvos o quanto antes, para evitar flash.
// Sem a opção de tema no menu do perfil: o Hub fica sempre no claro (e quem
// tinha escolhido o escuro volta para o claro).
localStorage.removeItem('b2b-theme');
document.body.dataset.theme = 'light';
// Computador (mouse): o menu fica sempre recolhido e abre ao passar o mouse
// (ver initSidebarHover). Telas de toque mantêm o recolher/expandir salvo.
const SIDEBAR_HOVER = window.matchMedia('(hover: hover) and (pointer: fine) and (min-width: 769px)').matches;
if (SIDEBAR_HOVER || localStorage.getItem('b2b-sidebar-collapsed') === '1') {
  document.body.classList.add('sidebar-collapsed');
}
if (SIDEBAR_HOVER) document.body.classList.add('sidebar-hover-mode');

// Ao navegar de uma página do próprio B2B para outra (clicou num link do
// sidebar, por exemplo), a página já tem a transição nativa do navegador
// (@view-transition no CSS) fazendo a troca suave a partir da página
// anterior — então não mostra o ícone de loading por cima, só esconde o
// conteúdo até ficar pronto. O ícone continua aparecendo num carregamento
// direto (digitou a URL, abriu um favorito/link externo) ou numa atualização
// de página, onde não existe uma página anterior para servir de transição.
try {
  const navEntry = performance.getEntriesByType('navigation')[0];
  const cameFromSameApp = document.referrer && document.referrer.startsWith(location.origin);
  if (navEntry && navEntry.type === 'navigate' && cameFromSameApp) {
    document.body.classList.add('nav-transition');
  }
} catch (e) { /* Navigation Timing indisponível — mantém o ícone de loading padrão */ }

// Empresa ativa (um login pode ter várias — migration 066). A escolha fica
// guardada e é conferida no initAuthGuard; já vale desde o carregamento para
// as páginas que consultam antes do login terminar.
window.b2bEmpresaId = localStorage.getItem('b2b-empresa-ativa') || null;
// Cópia do perfil "em branco" (data.js), para trocar de empresa sem levar os
// dados da outra que ficaram no cache do navegador.
const B2B_PERFIL_PADRAO = typeof B2B_DATA !== 'undefined' ? JSON.parse(JSON.stringify(B2B_DATA.professional)) : {};

// Perfil da empresa (mock local — sem backend) salvo em Editar Perfil.
const savedProfile = localStorage.getItem('b2b-professional-profile');
if (savedProfile && typeof B2B_DATA !== 'undefined') {
  try {
    const parsedProfile = JSON.parse(savedProfile);
    delete parsedProfile.plan; // o plano é sempre controlado por b2b-plan, nunca pelo snapshot do perfil
    Object.assign(B2B_DATA.professional, parsedProfile);
  } catch (e) { /* ignora estado inválido */ }
}

// Plano (mock local — sem backend) salvo pela página de planos. Sempre por último, para não ser sobrescrito.
const savedPlan = localStorage.getItem('b2b-plan');
if (savedPlan && typeof B2B_DATA !== 'undefined') B2B_DATA.professional.plan = savedPlan;

// O Chrome às vezes aborta a view-transition nativa quando a navegação vem de
// uma página pré-renderizada (combinação de @view-transition + Speculation Rules).
// É inofensivo — a página troca normalmente — mas as promises internas da
// transição (pagereveal) ficam sem handler e aparecem como erro no console.
// Anexa um catch nelas para não sobrar rejeição não tratada.
window.addEventListener('pagereveal', (e) => {
  if (e.viewTransition) {
    e.viewTransition.ready.catch(() => {});
    e.viewTransition.finished.catch(() => {});
    e.viewTransition.updateCallbackDone.catch(() => {});
  }
});

window.addEventListener('unhandledrejection', (e) => {
  if (e.reason && e.reason.name === 'AbortError' && /[Tt]ransition was skipped/.test(e.reason.message || '')) {
    e.preventDefault();
  }
});

// Pré-carrega (prerender) as páginas do menu assim que os links aparecerem no DOM,
// para a transição entre elas ser instantânea e sem engasgo. A regra acompanha o
// DOM dinamicamente, então funciona mesmo com o sidebar sendo injetado depois.
initSpeculationRules();

function initSpeculationRules() {
  if (!(window.HTMLScriptElement && HTMLScriptElement.supports && HTMLScriptElement.supports('speculationrules'))) return;
  const script = document.createElement('script');
  script.type = 'speculationrules';
  script.textContent = JSON.stringify({
    prerender: [
      {
        where: { selector_matches: '.sidebar-nav-item[href], .mobile-nav-item[href]' },
        eagerness: 'immediate'
      }
    ]
  });
  document.head.appendChild(script);
}

// Dispara a checagem de sessão/perfil já na carga do script (não espera o
// DOMContentLoaded), para que outras páginas possam aguardar
// `window.b2bAuthReady` antes de ler B2B_DATA.professional e evitar mostrar
// dados do perfil mockado por uma fração de segundo antes do overlay real.
window.b2bAuthReady = initAuthGuard();

// A página só aparece (classe `app-ready` no body, ver css/styles.css) depois
// que o shell (sidebar/topbar) E os dados próprios da página (tabela,
// cards, etc.) estiverem prontos — pra tudo surgir junto, em vez de um
// elemento de cada vez. Cada página chama `window.b2bPageReady()` no fim do
// próprio carregamento; quem não chamar (página sem dado assíncrono) cai só
// no timeout de segurança abaixo, que garante que a página nunca fique
// escondida pra sempre se algo travar ou der erro.
let shellIsReady = false;
let pageIsReady = false;
function revealAppIfReady() {
  if (shellIsReady && pageIsReady) document.body.classList.add('app-ready');
}
window.b2bPageReady = function () {
  pageIsReady = true;
  revealAppIfReady();
};
setTimeout(() => document.body.classList.add('app-ready'), 4000);

document.addEventListener('DOMContentLoaded', async () => {
  const authed = await window.b2bAuthReady;
  if (!authed) return;

  // termos/privacidade sem sessão: não tem sidebar/topbar pra montar — só
  // libera a página (ver initAuthGuard, que marcou 'legal-logged-out').
  if (document.body.classList.contains('legal-logged-out')) {
    document.dispatchEvent(new CustomEvent('shell:ready'));
    shellIsReady = true;
    revealAppIfReady();
    return;
  }

  // Não lidas do chat: contadas de verdade em initNotifications e
  // atualizadas em tempo real (subscribeChatUnreadBadge).
  const unreadSnapshot = 0;

  await loadShell();
  initSidebarState();
  initSidebarNav();
  initMobileNav();
  renderUpgradeCard();
  initUserCard();
  initTopbarDropdowns();
  initCommandPalette();
  initNotifications(unreadSnapshot);
  initThemeToggle();
  initLogout();
  document.dispatchEvent(new CustomEvent('shell:ready'));
  shellIsReady = true;
  revealAppIfReady();
});

/* -------------------- Autenticação (Supabase) -------------------- */

/* Google desconectado em Configurações › Contas conectadas: se a pessoa
   tentar entrar de novo pelo Google, o Supabase liga a conta sozinho (mesmo
   e-mail). Aqui isso é desfeito: solta o Google, sai e volta ao login com o
   aviso para entrar com o e-mail e usar "Esqueci minha senha". Quem clicou
   em "Conectar com o Google" (marca no navegador) passa e a marca some. */
async function bloquearGoogleDesconectado(session) {
  if (window.name === 'love-hub-google-login') return false;
  if (!((session.user || {}).user_metadata || {}).google_desconectado) return false;
  const { data } = await supabaseClient.auth.getUser();
  const user = (data && data.user) || session.user;
  const google = (user.identities || []).find(i => i.provider === 'google');
  if (!google) return false;
  if (localStorage.getItem('b2b-reconectando-google')) {
    localStorage.removeItem('b2b-reconectando-google');
    await supabaseClient.auth.updateUser({ data: { google_desconectado: false } });
    return false;
  }
  await supabaseClient.auth.unlinkIdentity(google);
  await supabaseClient.auth.signOut();
  window.location.href = 'login.html?erro=google-desconectado';
  return true;
}

async function initAuthGuard() {
  const page = document.body.dataset.page;
  if (PUBLIC_PAGES.includes(page)) return true;

  const { data: { session } } = await supabaseClient.auth.getSession();
  if (!session) {
    if (AUTH_OPTIONAL_PAGES.includes(page)) {
      // Sem sessão: mostra a versão solta da página (ver termos.html/
      // privacidade.html), não tenta montar sidebar/topbar nem redireciona.
      document.body.classList.add('legal-logged-out');
      return true;
    }
    window.location.href = 'login.html';
    return false;
  }

  window.b2bSession = session;
  if (await bloquearGoogleDesconectado(session)) return false;

  // Empresas deste login (a principal tem o id do login). Sem a coluna
  // dono_id (migration 066 ainda não rodada), só a principal.
  const uid = session.user.id;
  const { data: listaEmpresas, error: erroEmpresas } = await supabaseClient
    .from('fornecedores').select('id, company_name, avatar_url, cnpj').eq('dono_id', uid);
  const empresas = (!erroEmpresas && listaEmpresas) ? listaEmpresas.slice() : [];
  empresas.sort((a, b) => (a.id === uid ? -1 : b.id === uid ? 1 : String(a.company_name || '').localeCompare(String(b.company_name || ''), 'pt-BR')));
  const escolhida = window.b2bEmpresaId;
  const escolhaValida = !escolhida || escolhida === uid || empresas.some(e => e.id === escolhida);
  if (!escolhaValida) {
    // Empresa de outro login (ou excluída): volta para a principal.
    localStorage.removeItem('b2b-empresa-ativa');
    window.b2bEmpresaId = null;
    window.location.reload();
    return false;
  }
  const empresaAtivaId = escolhida || uid;
  window.b2bEmpresaId = empresaAtivaId;
  window.b2bEmpresas = empresas;

  // Cache do perfil é de uma empresa só: trocou de empresa, começa limpo.
  if (typeof B2B_DATA !== 'undefined') {
    const idDoCache = B2B_DATA.professional.id || uid;
    if (idDoCache !== empresaAtivaId) {
      Object.keys(B2B_DATA.professional).forEach(k => { delete B2B_DATA.professional[k]; });
      Object.assign(B2B_DATA.professional, JSON.parse(JSON.stringify(B2B_PERFIL_PADRAO)));
      localStorage.removeItem('b2b-professional-profile');
    }
  }

  let { data: fornecedor } = await supabaseClient
    .from('fornecedores')
    .select('id, company_name, email, avatar_url, logo_url, plan, plan_origem, plan_expira_em, pix_key, pix_key_type, status, contact_name, document_type, cnpj, phone, address, city, state, description, business_address, business_city, business_state, usa_endereco_perfil, service_radius_km, delivery_time, deposit_percent, deposit_deadline_days, cancellation_policy, max_installments_no_interest, requires_full_payment_by_event, portfolio_images, depoimentos')
    .eq('id', empresaAtivaId)
    .maybeSingle();

  // O plano é do login (empresa principal): Gratuito = 1 empresa, Pro = até 3.
  if (fornecedor && empresaAtivaId !== uid) {
    const { data: principal } = await supabaseClient
      .from('fornecedores').select('plan, plan_origem, plan_expira_em').eq('id', uid).maybeSingle();
    if (principal) Object.assign(fornecedor, principal);
  }

  if (!fornecedor && empresaAtivaId !== uid) {
    localStorage.removeItem('b2b-empresa-ativa');
    window.location.reload();
    return false;
  }

  if (!fornecedor) {
    // Login/B2B/Admin compartilham o mesmo Supabase Auth. Antes de criar uma
    // linha de fornecedor, confirma que essa conta não é de um anfitrião da
    // plataforma principal (love.com.br) — senão qualquer anfitrião que
    // abrisse o B2B virava fornecedor automaticamente.
    const { data: cliente } = await supabaseClient
      .from('clientes')
      .select('id')
      .eq('id', session.user.id)
      .maybeSingle();

    if (cliente) {
      await supabaseClient.auth.signOut();
      window.location.href = 'login.html';
      return false;
    }

    // Login social (Google): o trigger handle_new_user() não recebe o "role"
    // nesse fluxo (só vem via options.data no cadastro por e-mail/senha), então
    // a linha em `fornecedores` ainda não existe no primeiro acesso — cria aqui.
    const meta = session.user.user_metadata || {};
    const { data: created } = await supabaseClient
      .from('fornecedores')
      .insert({
        id: session.user.id,
        company_name: meta.full_name || meta.name || session.user.email.split('@')[0],
        email: session.user.email,
        avatar_url: meta.avatar_url || meta.picture || null
      })
      .select('id, company_name, email, avatar_url, logo_url, plan, plan_origem, plan_expira_em, pix_key, pix_key_type, status, contact_name, document_type, cnpj, phone, address, city, state, description, business_address, business_city, business_state, usa_endereco_perfil, service_radius_km, delivery_time, deposit_percent, deposit_deadline_days, cancellation_policy, max_installments_no_interest, requires_full_payment_by_event, portfolio_images, depoimentos')
      .maybeSingle();
    fornecedor = created;
  }

  if (fornecedor && fornecedor.status === 'bloqueado') {
    await supabaseClient.auth.signOut();
    window.location.href = 'login.html';
    return false;
  }

  if (fornecedor && typeof B2B_DATA !== 'undefined') {
    B2B_DATA.professional.id = fornecedor.id;
    B2B_DATA.professional.company = fornecedor.company_name || B2B_DATA.professional.company;
    B2B_DATA.professional.email = fornecedor.email || B2B_DATA.professional.email;
    if (fornecedor.avatar_url) B2B_DATA.professional.avatar = fornecedor.avatar_url;
    // A foto de perfil vem do banco (é a mesma que o anfitrião vê). Foto só
    // local (de antes de sincronizar) sobe uma vez, em segundo plano.
    if (fornecedor.avatar_url) {
      Object.assign(B2B_DATA.professional, { profilePhoto: fornecedor.avatar_url, profilePhotoScale: 1, profilePhotoOffsetX: 0, profilePhotoOffsetY: 0 });
    } else if (B2B_DATA.professional.profilePhoto && typeof syncFornecedorAvatar === 'function') {
      syncFornecedorAvatar(B2B_DATA.professional);
    }
    // Capa: a do banco é a que aparece na página da empresa. Capa só local
    // (de antes de sincronizar) sobe uma vez, em segundo plano.
    if (fornecedor.logo_url) {
      Object.assign(B2B_DATA.professional, { logo: fornecedor.logo_url, logoScale: 1, logoOffsetX: 0, logoOffsetY: 0 });
    } else if (B2B_DATA.professional.logo && typeof syncFornecedorCapa === 'function') {
      syncFornecedorCapa(B2B_DATA.professional);
    }
    // O plano vem sempre do banco (a página de planos grava lá, e o Admin
    // grava as bonificações): é o mesmo dado que a página pública do site
    // usa pra liberar o subdomínio — ver site_publicado na migration 038,
    // que tem esta mesma regra. O localStorage é só cache.
    const vencido = fornecedor.plan_expira_em && new Date(fornecedor.plan_expira_em) < new Date();
    B2B_DATA.professional.plan = (fornecedor.plan === 'Pro' && !vencido) ? 'Pro' : 'Gratuito';
    localStorage.setItem('b2b-plan', B2B_DATA.professional.plan);
    B2B_DATA.professional.pixKey = fornecedor.pix_key || null;
    B2B_DATA.professional.pixKeyType = fornecedor.pix_key_type || null;

    /* O cadastro vem do banco, não do localStorage: é o que faz o perfil
       sobreviver à troca de navegador. O `||` preserva o que estiver local
       quando a coluna ainda estiver vazia — conta antiga, nunca sincronizada. */
    const doBanco = {
      name: fornecedor.contact_name,
      documentType: fornecedor.document_type,
      documentNumber: fornecedor.cnpj,
      phone: fornecedor.phone,
      address: fornecedor.address,
      city: fornecedor.city,
      state: fornecedor.state,
      description: fornecedor.description
    };

    Object.entries(doBanco).forEach(([chave, valor]) => {
      if (valor) B2B_DATA.professional[chave] = valor;
    });
    // Sem nome do responsável no cadastro: usa o da empresa (nunca o nome de
    // demonstração do data.js).
    if (!fornecedor.contact_name) B2B_DATA.professional.name = fornecedor.company_name || B2B_DATA.professional.company || '';

    // Equipe: o responsável principal é o único colaborador da conta.
    B2B_DATA.team = [{
      id: 'owner',
      name: B2B_DATA.professional.name,
      email: fornecedor.email || B2B_DATA.professional.email || '',
      avatar: B2B_DATA.professional.profilePhoto || null,
      role: 'Administrador',
      status: 'ativo',
      owner: true,
      modules: Object.keys(B2B_DATA.modules || {})
    }];

    /* Campos de "Minha Empresa": aqui o valor do banco vence mesmo quando for
       "falsy" (false, 0, array vazio) — para esses campos isso é um valor
       explícito já salvo, não um campo que nunca foi preenchido. */
    B2B_DATA.professional.useProfileAddress = fornecedor.usa_endereco_perfil ?? true;
    B2B_DATA.professional.businessAddress = fornecedor.business_address || '';
    B2B_DATA.professional.businessCity = fornecedor.business_city || '';
    B2B_DATA.professional.businessState = fornecedor.business_state || 'SP';
    B2B_DATA.professional.serviceRadiusKm = fornecedor.service_radius_km ?? 50;
    if (fornecedor.delivery_time) B2B_DATA.professional.deliveryTime = fornecedor.delivery_time;
    if (fornecedor.deposit_percent !== null) B2B_DATA.professional.depositPercent = fornecedor.deposit_percent;
    if (fornecedor.deposit_deadline_days !== null) B2B_DATA.professional.depositDeadlineDays = fornecedor.deposit_deadline_days;
    if (fornecedor.cancellation_policy) B2B_DATA.professional.cancellationPolicy = fornecedor.cancellation_policy;
    B2B_DATA.professional.maxInstallmentsNoInterest = fornecedor.max_installments_no_interest ?? 0;
    B2B_DATA.professional.requiresFullPaymentByEvent = fornecedor.requires_full_payment_by_event ?? false;
    B2B_DATA.professional.portfolioImages = fornecedor.portfolio_images || [];
    B2B_DATA.professional.depoimentos = fornecedor.depoimentos || [];
  }

  return true;
}

function initLogout() {
  document.querySelectorAll('[data-logout]').forEach(link => {
    link.addEventListener('click', async (e) => {
      e.preventDefault();
      await supabaseClient.auth.signOut();
      window.location.href = 'login.html';
    });
  });
}

/* -------------------- Tema (light/dark) -------------------- */

function initThemeToggle() {
  const buttons = document.querySelectorAll('.theme-toggle-btn');
  if (!buttons.length) return;

  const setActive = theme => {
    buttons.forEach(btn => btn.classList.toggle('active', btn.dataset.themeOption === theme));
  };

  const savedTheme = localStorage.getItem('b2b-theme') || document.body.dataset.theme || 'light';
  document.body.dataset.theme = savedTheme;
  setActive(savedTheme);

  buttons.forEach(btn => {
    btn.addEventListener('click', () => {
      const theme = btn.dataset.themeOption;
      document.body.dataset.theme = theme;
      localStorage.setItem('b2b-theme', theme);
      setActive(theme);
    });
  });
}

async function loadShell() {
  const sidebarMount = document.getElementById('shell-sidebar');
  const topbarMount = document.getElementById('shell-topbar');
  const [sidebarHtml, topbarHtml] = await Promise.all([
    fetch('partials/sidebar.html', { cache: 'no-store' }).then(r => r.text()),
    fetch('partials/topbar.html', { cache: 'no-store' }).then(r => r.text())
  ]);
  if (sidebarMount) sidebarMount.innerHTML = sidebarHtml;
  if (topbarMount) topbarMount.innerHTML = topbarHtml;

  const content = document.querySelector('.b2b-content');
  if (content && !content.querySelector('.b2b-footer')) {
    const year = new Date().getFullYear();
    const footer = document.createElement('footer');
    footer.className = 'b2b-footer';
    // Rodapé enxuto e centralizado: © Love Hub Ltda + "Feito com amor…" e,
    // embaixo, Privacidade e Termos e condições.
    footer.innerHTML = `
      <div class="b2b-footer-bottom b2b-footer-bottom--enxuto">
        <p>© ${year} Love Hub Ltda. Feito com amor para momentos inesquecíveis.</p>
        <div class="b2b-footer-legal-links">
          <a href="privacidade">Privacidade</a>
          <a href="termos">Termos e condições</a>
        </div>
      </div>
    `;
    // Respiro fixo entre o fim do conteúdo e o rodapé (vale mesmo quando o
    // último bloco da página está escondido, como as abas de Leads).
    const respiro = document.createElement('div');
    respiro.className = 'b2b-footer-respiro';
    respiro.setAttribute('aria-hidden', 'true');
    content.appendChild(respiro);
    content.appendChild(footer);
  }
}

function initSidebarState() {
  const page = document.body.dataset.page;

  document.querySelectorAll('.sidebar-nav-item[data-page], .sidebar-subnav-item[data-page], .mobile-nav-item[data-page], .mobile-sheet-link[data-page]').forEach(item => {
    item.classList.toggle('active', item.dataset.page === page);
  });

  const groupToggle = Array.from(document.querySelectorAll('.sidebar-nav-toggle[data-pages]'))
    .find(btn => (btn.dataset.pages || '').split(',').includes(page));

  groupToggle?.closest('.sidebar-nav-group')?.classList.add('open');

  const mobileGroupToggle = Array.from(document.querySelectorAll('.mobile-nav-toggle[data-pages]'))
    .find(btn => (btn.dataset.pages || '').split(',').includes(page));

  mobileGroupToggle?.classList.add('active');
}

function initSidebarNav() {
  document.querySelectorAll('.sidebar-nav-toggle').forEach(btn => {
    btn.addEventListener('click', () => {
      if (document.body.classList.contains('sidebar-collapsed')) setSidebarCollapsed(false);
      btn.closest('.sidebar-nav-group')?.classList.toggle('open');
    });
  });

  document.getElementById('sidebar-collapse-toggle')?.addEventListener('click', () => {
    setSidebarCollapsed(!document.body.classList.contains('sidebar-collapsed'));
  });

  if (SIDEBAR_HOVER) { initSidebarHover(); return; }
  setSidebarCollapsed(document.body.classList.contains('sidebar-collapsed'));
}

/* Menu que abre ao passar o mouse: recolhido por padrão; com o mouse em
   cima, abre por cima do conteúdo (sem empurrar a página); ao sair, recolhe. */
function initSidebarHover() {
  const sidebar = document.querySelector('.b2b-sidebar');
  if (!sidebar) return;
  let abrir = null;
  let fechar = null;
  sidebar.addEventListener('mouseenter', () => {
    clearTimeout(fechar);
    abrir = setTimeout(() => {
      document.body.classList.add('sidebar-flutuando');
      document.body.classList.remove('sidebar-collapsed');
    }, 80);
  });
  sidebar.addEventListener('mouseleave', () => {
    clearTimeout(abrir);
    fechar = setTimeout(() => {
      document.body.classList.add('sidebar-collapsed');
      document.body.classList.remove('sidebar-flutuando');
    }, 150);
  });
}

function setSidebarCollapsed(collapsed) {
  document.body.classList.toggle('sidebar-collapsed', collapsed);
  localStorage.setItem('b2b-sidebar-collapsed', collapsed ? '1' : '0');

  const label = collapsed ? 'Expandir menu' : 'Recolher menu';
  const btn = document.getElementById('sidebar-collapse-toggle');
  if (btn) { btn.title = label; btn.setAttribute('aria-label', label); }
}

// Sem foto, o avatar padrão é o ícone da Love (não um bonequinho genérico):
// escuro no tema claro, branco no escuro (as classes sidebar-icon-* já
// alternam por tema). Usado no cabeçalho, no dropdown e no chat (mensagens.js).
const B2B_PROFILE_ICON = '<img src="assets/iconelove2.png" class="avatar-love-icon sidebar-icon-light" alt=""><img src="assets/icon-white1.png" class="avatar-love-icon sidebar-icon-dark" alt="">';

// Sem foto: as iniciais da empresa (ou do nome) no lugar de um ícone.
function renderAvatarInto(el, photo, name) {
  if (!el) return;
  el.innerHTML = photo ? `<img src="${photo}" class="avatar-photo-img" alt="">` : initialsAvatarHtml(name);
}

function initUserCard() {
  const p = B2B_DATA.professional;
  renderAvatarInto(document.getElementById('topbar-user-avatar'), p.profilePhoto, p.company || p.name);
  renderAvatarInto(document.getElementById('profile-dropdown-avatar'), p.profilePhoto, p.company || p.name);

  // No menu do perfil, o nome do responsável; no canto do topo, a empresa.
  setText('profile-dropdown-name', p.name || p.company);
  setText('topbar-account-name', p.company);
  renderEmpresasNoMenu();
  setText('profile-dropdown-email', p.email);
  setText('upgrade-current-plan', p.plan);
}

/* Empresas do login no menu do perfil, sempre visíveis (nome e CNPJ),
   acima de "Adicionar empresa": clicar troca a empresa ativa. Na tela de
   Nova empresa, clicar na empresa atual volta para ela. */
function renderEmpresasNoMenu() {
  const wrap = document.getElementById('profile-empresas');
  if (!wrap) return;
  const ativa = window.b2bEmpresaId;
  const uid = window.b2bSession && window.b2bSession.user.id;
  const p = (typeof B2B_DATA !== 'undefined' && B2B_DATA.professional) || {};
  let empresas = (window.b2bEmpresas || []).slice();
  if (!empresas.length) empresas = [{ id: ativa, company_name: p.company, avatar_url: p.avatar, cnpj: p.documentNumber }];
  empresas = empresas.map(e => (e.id === ativa ? { ...e, company_name: p.company || e.company_name, cnpj: e.cnpj || p.documentNumber } : e));
  const cnpjFormatado = v => {
    const d = String(v || '').replace(/\D/g, '');
    return d.length === 14 && typeof formatDocumentValue === 'function' ? 'CNPJ ' + formatDocumentValue(d, 'cnpj') : '';
  };
  wrap.hidden = false;
  wrap.innerHTML = `<p class="profile-empresas-titulo">${empresas.length > 1 ? 'Suas empresas' : 'Sua empresa'}</p>` + empresas.map(e => `
    <button type="button" class="profile-empresa-item${e.id === ativa ? ' is-ativa' : ''}" data-empresa-id="${escapeHtml(e.id || '')}">
      <span class="profile-empresa-linha">
        <span class="profile-empresa-nome">${escapeHtml(e.company_name || 'Empresa')}</span>
      </span>
    </button>`).join('') + '<div class="topbar-dropdown-divider"></div>';
  wrap.querySelectorAll('[data-empresa-id]').forEach(btn => {
    btn.addEventListener('click', () => trocarEmpresa(btn.dataset.empresaId));
  });
}

function trocarEmpresa(id) {
  const naNovaEmpresa = document.body.dataset.page === 'nova-empresa';
  if (!id || id === window.b2bEmpresaId) {
    if (naNovaEmpresa) window.location.href = 'dashboard';
    return;
  }
  const uid = window.b2bSession && window.b2bSession.user.id;
  if (id === uid) localStorage.removeItem('b2b-empresa-ativa');
  else localStorage.setItem('b2b-empresa-ativa', id);
  localStorage.removeItem('b2b-professional-profile');
  window.location.href = 'dashboard';
}
window.trocarEmpresa = trocarEmpresa;

function isProPlan() {
  return typeof B2B_DATA !== 'undefined' && B2B_DATA.professional.plan === 'Pro';
}

function renderUpgradeCard() {
  const pro = isProPlan();
  document.getElementById('sidebar-upgrade-card')?.classList.toggle('is-pro', pro);
  const headerBtn = document.getElementById('header-upgrade-btn');
  if (headerBtn) headerBtn.style.display = pro ? 'none' : '';
}

/* -------------------- Dropdowns do topbar -------------------- */

function initTopbarDropdowns() {
  const pairs = [
    ['notif-trigger', 'notif-dropdown'],
    ['avatar-trigger', 'avatar-dropdown']
  ];

  function closeAll(except) {
    pairs.forEach(([, dropId]) => {
      if (dropId !== except) document.getElementById(dropId)?.classList.remove('show');
    });
    syncMobileSheetOverlay();
  }

  pairs.forEach(([triggerId, dropId]) => {
    const trigger = document.getElementById(triggerId);
    const drop = document.getElementById(dropId);
    if (!trigger || !drop) return;
    trigger.addEventListener('click', e => {
      e.stopPropagation();
      const willShow = !drop.classList.contains('show');
      closeAll(dropId);
      closeMobileNavSheet();
      drop.classList.toggle('show', willShow);
      syncMobileSheetOverlay();
    });
  });

  document.addEventListener('click', () => {
    closeAll(null);
    closeMobileNavSheet();
    syncMobileSheetOverlay();
  });

  const search = document.getElementById('search-trigger');
  if (search) search.addEventListener('click', () => openCommandPalette());
}

/* -------------------- Navegação mobile (barra inferior + bottom sheets) -------------------- */

function closeMobileNavSheet() {
  document.querySelectorAll('.mobile-nav-toggle').forEach(b => b.classList.remove('sheet-open'));
  document.querySelectorAll('.mobile-nav-sheet-panel').forEach(p => p.classList.remove('active'));
  document.getElementById('mobile-nav-sheet')?.classList.remove('has-open-panel');
}

function syncMobileSheetOverlay() {
  const avatarOpen = document.getElementById('avatar-dropdown')?.classList.contains('show');
  const navSheetOpen = !!document.querySelector('.mobile-nav-toggle.sheet-open');
  document.body.classList.toggle('mobile-sheet-open', !!avatarOpen || navSheetOpen);
}

function initMobileNav() {
  const overlay = document.getElementById('mobile-nav-overlay');

  document.querySelectorAll('.mobile-nav-toggle').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      const wasOpen = btn.classList.contains('sheet-open');
      closeMobileNavSheet();
      document.getElementById('avatar-dropdown')?.classList.remove('show');
      document.getElementById('notif-dropdown')?.classList.remove('show');
      if (!wasOpen) {
        btn.classList.add('sheet-open');
        document.querySelector(`.mobile-nav-sheet-panel[data-mobile-panel="${btn.dataset.mobileGroup}"]`)?.classList.add('active');
        document.getElementById('mobile-nav-sheet')?.classList.add('has-open-panel');
      }
      syncMobileSheetOverlay();
    });
  });

  overlay?.addEventListener('click', () => {
    closeMobileNavSheet();
    document.getElementById('avatar-dropdown')?.classList.remove('show');
    syncMobileSheetOverlay();
  });
}

/* -------------------- Notificações -------------------- */

/* Notificações enviadas pelo Admin (tabela `notificacoes`, migrations 031,
   032 e 039). A RLS já esconde as agendadas e as de outro público, mas
   quem também é admin ou anfitrião enxergaria mais — por isso o filtro de
   público e de data vai explícito na consulta: o Hub só mostra as de
   'todos', 'b2b' e as 'individual' endereçadas a este fornecedor.
   Usado aqui (número do sino, em toda página) e em js/notificacoes.js. */
async function fetchB2BNotificacoes(userId) {
  const { data, error } = await supabaseClient
    .from('notificacoes')
    .select('id, titulo, mensagem, link_url, link_label, created_at')
    .or(`destino.in.(todos,b2b),and(destino.eq.individual,destinatario_id.eq.${userId})`)
    .lte('created_at', new Date().toISOString())
    .order('created_at', { ascending: false });
  if (error) { console.error('Erro ao carregar notificações:', error); return []; }
  return data || [];
}

async function fetchB2BNotificacoesLidas(userId) {
  const { data, error } = await supabaseClient
    .from('notificacao_leituras')
    .select('notificacao_id')
    .eq('user_id', userId);
  if (error) return new Set();
  return new Set((data || []).map(r => r.notificacao_id));
}

// O número começa escondido e vazio no HTML (partials/topbar.html) e só
// aparece quando o número real chega; com 0 não lidas, some.
function updateNotificationsBadge(unreadCount) {
  // Guarda o valor: na página de Notificações a lista pode chegar antes de
  // o topbar ser injetado — initNotifications reaplica quando ele existir.
  window.b2bUnreadNotifications = unreadCount;
  const badge = document.getElementById('notif-dot');
  if (!badge) return;
  badge.textContent = unreadCount > 0 ? String(unreadCount) : '';
  badge.classList.toggle('hidden', !(unreadCount > 0));
}

async function initNotifications(unreadSnapshot) {
  // A página de Notificações calcula o número ela mesma ao carregar a lista
  // (se já calculou antes do topbar existir, só reaplica).
  if (document.body.dataset.page === 'notificacoes') {
    if (window.b2bUnreadNotifications !== undefined) updateNotificationsBadge(window.b2bUnreadNotifications);
  } else {
    const userId = window.b2bSession && window.b2bSession.user.id;
    if (userId) {
      const [rows, lidas] = await Promise.all([fetchB2BNotificacoes(userId), fetchB2BNotificacoesLidas(userId)]);
      updateNotificationsBadge(rows.filter(n => !lidas.has(n.id)).length);
    }
  }

  await refreshChatUnreadBadge();
  subscribeChatUnreadBadge();
}

/* -------------------- Chat: mensagens não lidas -------------------- */

// Não lidas = mensagens do cliente com read_at nulo nas conversas deste
// fornecedor. Quem marca como lidas é o chat (marcar_conversa_lida,
// migration 045) ao abrir a conversa.
async function countChatUnread() {
  const userId = window.b2bSession && empresaId(window.b2bSession);
  if (!userId) return 0;
  const { data: convs, error: convErr } = await supabaseClient
    .from('conversations')
    .select('id')
    .eq('fornecedor_id', userId);
  if (convErr || !convs || !convs.length) return 0;
  const { count, error } = await supabaseClient
    .from('messages')
    .select('id', { count: 'exact', head: true })
    .in('conversation_id', convs.map(c => c.id))
    .eq('sender_role', 'cliente')
    .is('read_at', null);
  return error ? 0 : (count || 0);
}

function updateChatUnreadBadge(unreadMsgs) {
  ['nav-msg-badge', 'nav-msg-badge-rail', 'nav-msg-badge-header', 'nav-msg-badge-mobile'].forEach(id => {
    const badge = document.getElementById(id);
    if (!badge) return;
    if (unreadMsgs > 0) { badge.textContent = unreadMsgs > 99 ? '99+' : String(unreadMsgs); badge.style.display = ''; }
    else { badge.textContent = ''; badge.style.display = 'none'; }
  });
}

async function refreshChatUnreadBadge() {
  updateChatUnreadBadge(await countChatUnread());
}
window.b2bRefreshChatUnreadBadge = refreshChatUnreadBadge;

// Mensagem nova (ou lida) em qualquer página do Hub: o número do ícone do
// chat atualiza sozinho, sem recarregar.
let chatUnreadChannel = null;
function subscribeChatUnreadBadge() {
  if (chatUnreadChannel || !window.b2bSession) return;
  chatUnreadChannel = supabaseClient
    .channel('b2b-chat-unread-badge')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, refreshChatUnreadBadge)
    .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'messages' }, refreshChatUnreadBadge)
    .subscribe();
  // Rede: se o realtime cair, a aba volta a contar ao ganhar foco.
  window.addEventListener('focus', refreshChatUnreadBadge);
}

/* -------------------- Command palette (busca global) -------------------- */

let commandPaletteData = { leads: [], products: [], contracts: [] };

async function loadCommandPaletteData() {
  const { data: { session } } = await supabaseClient.auth.getSession();
  if (!session) return;

  const [leadsRes, productsRes, contractsRes] = await Promise.all([
    supabaseClient.from('leads').select('id, name, event_name').eq('fornecedor_id', empresaId(session)),
    supabaseClient.from('products').select('id, name, category').eq('fornecedor_id', empresaId(session)),
    supabaseClient.from('contracts').select('id, client_name, evento').eq('fornecedor_id', empresaId(session))
  ]);

  commandPaletteData = {
    leads: leadsRes.data || [],
    products: productsRes.data || [],
    contracts: contractsRes.data || []
  };
}

function initCommandPalette() {
  const palette = document.getElementById('command-palette');
  const input = document.getElementById('command-input');
  if (!palette || !input) return;

  loadCommandPaletteData();

  document.addEventListener('keydown', e => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      openCommandPalette();
    }
    if (e.key === 'Escape') closeCommandPalette();
  });

  palette.addEventListener('click', e => { if (e.target === palette) closeCommandPalette(); });
  input.addEventListener('input', () => renderCommandResults(input.value));
}

function openCommandPalette() {
  const palette = document.getElementById('command-palette');
  const input = document.getElementById('command-input');
  // Em Nova empresa a busca (da empresa atual) fica desligada, inclusive pelo ⌘K.
  if (!palette || document.body.dataset.page === 'nova-empresa') return;
  palette.classList.add('show');
  renderCommandResults('');
  setTimeout(() => input?.focus(), 30);
}

function closeCommandPalette() {
  document.getElementById('command-palette')?.classList.remove('show');
}

function renderCommandResults(query) {
  const results = document.getElementById('command-results');
  if (!results) return;
  const q = query.trim().toLowerCase();

  const items = [
    ...commandPaletteData.leads.map(l => ({ label: l.name, meta: l.event_name || '', href: 'crm.html', group: 'Clientes' })),
    ...commandPaletteData.contracts.map(c => ({ label: c.client_name, meta: `Contrato · ${(c.evento && c.evento.nome) || ''}`, href: 'pagamentos.html', group: 'Contratos' })),
    ...commandPaletteData.products.map(p => ({ label: p.name, meta: p.category || '', href: 'produtos.html', group: 'Produtos' }))
  ];

  const filtered = q ? items.filter(i => i.label.toLowerCase().includes(q) || i.meta.toLowerCase().includes(q)) : items.slice(0, 6);

  if (!filtered.length) {
    results.innerHTML = '<p class="text-sm text-zinc-500 px-3 py-6 text-center">Nenhum resultado encontrado.</p>';
    return;
  }

  const groups = {};
  filtered.forEach(i => { (groups[i.group] ||= []).push(i); });

  results.innerHTML = Object.entries(groups).map(([group, arr]) => `
    <p class="command-group-label">${group}</p>
    ${arr.map(i => `
      <a href="${i.href}" class="command-result-item">
        <span class="text-sm font-medium text-zinc-900">${i.label}</span>
        <span class="text-xs text-zinc-500">${i.meta}</span>
      </a>
    `).join('')}
  `).join('');
}
