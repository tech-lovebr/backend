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
document.body.dataset.theme = localStorage.getItem('b2b-theme') || 'light';
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
    footer.innerHTML = `
      <div class="b2b-footer-top">
        <div>
          <div class="b2b-footer-logo">
            <img src="assets/iconelove2.png?v=5" alt="" class="sidebar-icon-light">
            <img src="assets/icon-white1.png?v=5" alt="" class="sidebar-icon-dark">
            <img src="assets/Love-dark-03.png" alt="Love" class="sidebar-word-light">
            <img src="assets/Love-white-03.png" alt="Love" class="sidebar-word-dark">
          </div>
          <p class="b2b-footer-desc">Os dias mais felizes da sua vida, organizados sem esforço.</p>
          <div class="b2b-footer-legal-links">
            <a href="privacidade">Privacidade</a>
            <a href="termos">Termos e condições</a>
          </div>
        </div>
        <div class="b2b-footer-social">
          <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" class="b2b-footer-social-btn" title="Instagram">
            <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
          </a>
          <a href="https://tiktok.com" target="_blank" rel="noopener noreferrer" class="b2b-footer-social-btn" title="TikTok">
            <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-1.01-.02 2.98.02 5.96-.02 8.94-.03 1.53-.45 3.08-1.28 4.38-1.12 1.77-2.97 3.04-5.04 3.49-1.71.38-3.55.19-5.14-.54-1.68-.78-3.05-2.14-3.86-3.8-1.07-2.18-.94-4.88.35-6.94 1.05-1.67 2.75-2.86 4.67-3.29.93-.21 1.9-.22 2.85-.04v4.18c-.7-.22-1.49-.24-2.19-.04-.84.23-1.57.81-1.95 1.59-.51 1.03-.38 2.3.33 3.2.66.84 1.72 1.34 2.8 1.34 1.14 0 2.21-.56 2.85-1.51.37-.55.57-1.22.57-1.89V.02z"/></svg>
          </a>
          <a href="https://x.com/loveplataforma" target="_blank" rel="noopener noreferrer" class="b2b-footer-social-btn" title="X (Twitter)">
            <svg viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
          </a>
          <a href="https://linkedin.com" target="_blank" rel="noopener noreferrer" class="b2b-footer-social-btn" title="LinkedIn">
            <svg viewBox="0 0 24 24" fill="currentColor"><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/></svg>
          </a>
          <a href="https://www.youtube.com/@LovePlataforma" target="_blank" rel="noopener noreferrer" class="b2b-footer-social-btn" title="YouTube">
            <svg viewBox="0 0 24 24" fill="currentColor"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
          </a>
        </div>
      </div>
      <div class="b2b-footer-bottom">
        <p>© ${year} Love Hub Ltda. Todos os direitos reservados.</p>
        <span>Feito com amor para momentos inesquecíveis.</span>
      </div>
    `;
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
  const p = (typeof B2B_DATA !== 'undefined' && B2B_DATA.professional) || {};
  let empresas = (window.b2bEmpresas || []).slice();
  if (!empresas.length) empresas = [{ id: ativa, company_name: p.company, avatar_url: p.avatar, cnpj: p.documentNumber }];
  empresas = empresas.map(e => (e.id === ativa ? { ...e, company_name: p.company || e.company_name, cnpj: e.cnpj || p.documentNumber } : e));
  const cnpjFormatado = v => {
    const d = String(v || '').replace(/D/g, '');
    return d.length === 14 && typeof formatDocumentValue === 'function' ? 'CNPJ ' + formatDocumentValue(d, 'cnpj') : '';
  };
  wrap.hidden = false;
  wrap.innerHTML = `<p class="profile-empresas-titulo">${empresas.length > 1 ? 'Suas empresas' : 'Sua empresa'}</p>` + empresas.map(e => `
    <button type="button" class="profile-empresa-item${e.id === ativa ? ' is-ativa' : ''}" data-empresa-id="${escapeHtml(e.id || '')}">
      <span class="profile-empresa-marca">${e.id === ativa ? '<svg class="profile-empresa-check" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path stroke-linecap="round" stroke-linejoin="round" d="m5 12.5 4.5 4.5L19 7.5"/></svg>' : ''}</span>
      <span class="profile-empresa-nome">${escapeHtml(e.company_name || 'Empresa')}</span>
      ${cnpjFormatado(e.cnpj) ? `<span class="profile-empresa-cnpj">${cnpjFormatado(e.cnpj)}</span>` : ''}
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
  if (!palette) return;
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
