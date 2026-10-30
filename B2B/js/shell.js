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
// Menu fixado (botão ao lado do logotipo): fica sempre aberto e o conteúdo
// vai para a direita, em vez de abrir só com o mouse.
const SIDEBAR_FIXO = SIDEBAR_HOVER && localStorage.getItem('b2b-sidebar-fixo') === '1';
if ((SIDEBAR_HOVER && !SIDEBAR_FIXO) || (!SIDEBAR_HOVER && localStorage.getItem('b2b-sidebar-collapsed') === '1')) {
  document.body.classList.add('sidebar-collapsed');
}
if (SIDEBAR_HOVER) document.body.classList.add('sidebar-hover-mode');
if (SIDEBAR_FIXO) document.body.classList.add('sidebar-fixo');

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

/* Dica dos ícones do topo (data-dica="Texto"): caixinha branca da Love no
   lugar da caixinha preta do navegador — igual ao love.com.br. Aparece em
   cima do ícone; se não couber (topo da tela), embaixo. */
(function ligarDicasDosIcones() {
  let dica = null;
  const esconder = () => { if (dica) dica.classList.remove('is-visivel'); };
  const mostrar = (alvo) => {
    const texto = alvo.dataset.dica;
    if (!texto) return;
    if (!dica) {
      dica = document.createElement('div');
      dica.className = 'love-dica';
      dica.setAttribute('role', 'tooltip');
      document.body.appendChild(dica);
    }
    dica.textContent = texto;
    dica.classList.add('is-visivel');
    const r = alvo.getBoundingClientRect();
    const d = dica.getBoundingClientRect();
    let top = r.top - d.height - 8;
    if (top < 8) top = r.bottom + 8;
    const left = Math.max(8, Math.min(r.left + r.width / 2 - d.width / 2, window.innerWidth - d.width - 8));
    dica.style.top = `${top}px`;
    dica.style.left = `${left}px`;
  };
  document.addEventListener('mouseover', (e) => {
    const alvo = e.target instanceof Element ? e.target.closest('[data-dica]') : null;
    if (alvo) mostrar(alvo);
  });
  document.addEventListener('mouseout', (e) => {
    const de = e.target instanceof Element ? e.target.closest('[data-dica]') : null;
    const para = e.relatedTarget instanceof Element ? e.relatedTarget.closest('[data-dica]') : null;
    if (de && de !== para) esconder();
  });
  document.addEventListener('focusin', (e) => {
    const alvo = e.target instanceof Element ? e.target.closest('[data-dica]') : null;
    if (alvo && alvo.matches(':focus-visible')) mostrar(alvo);
  });
  document.addEventListener('focusout', esconder);
  document.addEventListener('click', esconder, true);
  window.addEventListener('scroll', esconder, true);
})();

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
  window.location.href = 'login?erro=google-desconectado';
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
    window.location.href = 'login';
    return false;
  }

  window.b2bSession = session;
  if (await bloquearGoogleDesconectado(session)) return false;

  // Empresas deste login (a principal tem o id do login). Sem a coluna
  // dono_id (migration 066 ainda não rodada), só a principal.
  const uid = session.user.id;
  const { data: listaEmpresas, error: erroEmpresas } = await supabaseClient
    .from('fornecedores').select('id, company_name, razao_social, avatar_url, cnpj').eq('dono_id', uid);
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
    .select('id, company_name, razao_social, email, avatar_url, logo_url, plan, plan_origem, plan_expira_em, pix_key, pix_key_type, status, contact_name, document_type, cnpj, phone, address, city, state, description, business_address, business_city, business_state, usa_endereco_perfil, service_radius_km, delivery_time, deposit_percent, deposit_deadline_days, cancellation_policy, max_installments_no_interest, requires_full_payment_by_event, portfolio_images, depoimentos, social_links')
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
      window.location.href = 'login';
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
      .select('id, company_name, razao_social, email, avatar_url, logo_url, plan, plan_origem, plan_expira_em, pix_key, pix_key_type, status, contact_name, document_type, cnpj, phone, address, city, state, description, business_address, business_city, business_state, usa_endereco_perfil, service_radius_km, delivery_time, deposit_percent, deposit_deadline_days, cancellation_policy, max_installments_no_interest, requires_full_payment_by_event, portfolio_images, depoimentos, social_links')
      .maybeSingle();
    fornecedor = created;
  }

  if (fornecedor && fornecedor.status === 'bloqueado') {
    await supabaseClient.auth.signOut();
    window.location.href = 'login';
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
      razaoSocial: fornecedor.razao_social,
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
    B2B_DATA.professional.socialLinks = fornecedor.social_links || {};
  }

  return true;
}

function initLogout() {
  document.querySelectorAll('[data-logout]').forEach(link => {
    link.addEventListener('click', async (e) => {
      e.preventDefault();
      await supabaseClient.auth.signOut();
      window.location.href = 'login';
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
  // Na página do grupo (ex.: Editar meu site / Formulários), o item de cima
  // (Construtor) é que fica marcado como ativo, com a caixinha.
  groupToggle?.classList.add('active');

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
  const fixar = document.getElementById('sidebar-fixar');
  const marcarFixar = () => {
    const fixo = document.body.classList.contains('sidebar-fixo');
    const rotulo = fixo ? 'Desafixar menu' : 'Fixar menu';
    if (!fixar) return;
    fixar.setAttribute('aria-pressed', fixo ? 'true' : 'false');
    fixar.setAttribute('aria-label', rotulo);
    fixar.dataset.dica = rotulo;
  };
  marcarFixar();
  fixar?.addEventListener('click', () => {
    const fixo = !document.body.classList.contains('sidebar-fixo');
    document.body.classList.toggle('sidebar-fixo', fixo);
    // Ao desafixar com o mouse em cima, o menu continua aberto por cima do
    // conteúdo e recolhe quando o mouse sair.
    document.body.classList.toggle('sidebar-flutuando', !fixo);
    document.body.classList.remove('sidebar-collapsed');
    try { localStorage.setItem('b2b-sidebar-fixo', fixo ? '1' : '0'); } catch (e) { /* sem armazenamento */ }
    marcarFixar();
    window.dispatchEvent(new Event('resize'));
  });
  sidebar.addEventListener('mouseenter', () => {
    if (document.body.classList.contains('sidebar-fixo')) return;
    clearTimeout(fechar);
    abrir = setTimeout(() => {
      document.body.classList.add('sidebar-flutuando');
      document.body.classList.remove('sidebar-collapsed');
    }, 80);
  });
  sidebar.addEventListener('mouseleave', () => {
    if (document.body.classList.contains('sidebar-fixo')) return;
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
  if (btn) { btn.dataset.dica = label; btn.removeAttribute('title'); btn.setAttribute('aria-label', label); }
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
  empresas = empresas.map(e => (e.id === ativa ? { ...e, company_name: p.company || e.company_name, razao_social: p.razaoSocial || e.razao_social, cnpj: e.cnpj || p.documentNumber } : e));
  const cnpjFormatado = v => {
    const d = String(v || '').replace(/\D/g, '');
    return d.length === 14 && typeof formatDocumentValue === 'function' ? 'CNPJ ' + formatDocumentValue(d, 'cnpj') : '';
  };
  wrap.hidden = false;
  // Só o nome de cada empresa (razão social; sem ela, o nome fantasia), sem título nem linha antes de "Adicionar empresa".
  wrap.innerHTML = empresas.map(e => `
    <button type="button" class="profile-empresa-item${e.id === ativa ? ' is-ativa' : ''}" data-empresa-id="${escapeHtml(e.id || '')}">
      <span class="profile-empresa-linha">
        <svg class="menu-perfil-icone" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 21h18"/><path d="M3 7v1a3 3 0 0 0 6 0V7m0 1a3 3 0 0 0 6 0V7m0 1a3 3 0 0 0 6 0V7H3l2-4h14l2 4"/><path d="M5 21V10.85M19 21V10.85"/><path d="M9 21v-4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v4"/></svg>
        <span class="profile-empresa-nome">${escapeHtml(e.razao_social || e.company_name || 'Empresa')}</span>
      </span>
    </button>`).join('');
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
  const linhas = await fetchB2BNotificacoesTodas(userId);
  // Balão (migration 114) não entra no sino: aparece no canto da tela.
  return linhas.filter(n => n.formato !== 'balao');
}

async function fetchB2BNotificacoesTodas(userId) {
  const { data, error } = await supabaseClient
    .from('notificacoes')
    .select('*')
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
  mostrarBalaoDoHub();
}

/* Balão de aviso (notificação formato "balão", criada no Admin): cartão no
   canto inferior esquerdo, ao lado da sidebar, até a pessoa fechar ou clicar.
   O componente está em js/balao-aviso.js (cópia do de love.com.br). */
async function mostrarBalaoDoHub() {
  const userId = window.b2bSession && window.b2bSession.user.id;
  if (!userId) return;
  const [linhas, lidas] = await Promise.all([fetchB2BNotificacoesTodas(userId), fetchB2BNotificacoesLidas(userId)]);
  const baloes = linhas.filter(n => n.formato === 'balao' && !lidas.has(n.id));
  if (!baloes.length) return;
  if (!window.LoveBalao) {
    await new Promise(ok => {
      const s = document.createElement('script');
      s.src = 'js/balao-aviso.js?v=3';
      s.onload = ok; s.onerror = ok;
      document.head.appendChild(s);
    });
  }
  window.LoveBalao?.mostrar(baloes, {
    barra: '.b2b-sidebar',
    aoVer: id => supabaseClient.from('notificacao_leituras')
      .upsert({ notificacao_id: id, user_id: userId }, { onConflict: 'notificacao_id,user_id', ignoreDuplicates: true })
      .then(() => {}, () => {})
  });
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
    ...commandPaletteData.leads.map(l => ({ label: l.name, meta: l.event_name || '', href: 'crm', group: 'Clientes' })),
    ...commandPaletteData.contracts.map(c => ({ label: c.client_name, meta: `Contrato · ${(c.evento && c.evento.nome) || ''}`, href: 'pagamentos', group: 'Contratos' })),
    ...commandPaletteData.products.map(p => ({ label: p.name, meta: p.category || '', href: 'produtos', group: 'Produtos' }))
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


/* ==========================================================================
   Celular: submenu como barra segmentada no topo do conteúdo (igual ao app
   dos anfitriões). A lista lateral do submenu (Configurações, Construtor)
   some no celular; a barra copia os itens dela e repassa o toque ao item
   original, então o resto do código não muda. Um item só: a barra não
   aparece. Muitos: rola para o lado e centraliza o ativo. No desktop ela
   fica escondida pelo CSS.
   ========================================================================== */
function submenuNoCelular(lista, seletor, rotuloDe) {
  const area = document.querySelector('.b2b-content');
  if (!lista || !area || area.querySelector(':scope > .submenu-celular')) return;
  const barra = document.createElement('nav');
  barra.className = 'submenu-celular';
  barra.setAttribute('aria-label', 'Submenu');
  const cabecalho = area.querySelector(':scope > .b2b-header-bar');
  if (cabecalho) cabecalho.after(barra); else area.insertBefore(barra, area.firstChild);
  let agendado = false;
  /** @type {Element[]} */
  let itensAnteriores = [];
  const desenhar = () => {
    agendado = false;
    const itens = Array.from(lista.querySelectorAll(seletor))
      .filter(i => !i.hidden && !i.classList.contains('hidden') && i.style.display !== 'none');
    // Só redesenha quando algo muda (itens, textos ou a aba ativa): redesenhar
    // sempre recria os botões e engole o toque (como no anfitrião, e1e315be).
    const assinatura = itens.map(i => ((i.classList.contains('active') || i.classList.contains('is-ativo')) ? '*' : '') + rotuloDe(i)).join('|');
    const mesmosElementos = itens.length === itensAnteriores.length && itens.every((el, i) => el === itensAnteriores[i]);
    if (mesmosElementos && assinatura === barra.dataset.assinatura) return;
    itensAnteriores = itens;
    barra.dataset.assinatura = assinatura;
    barra.hidden = itens.length < 2;
    barra.textContent = '';
    itens.forEach(orig => {
      const ativo = orig.classList.contains('active') || orig.classList.contains('is-ativo');
      const botao = document.createElement('button');
      botao.type = 'button';
      botao.className = 'submenu-celular-item' + (ativo ? ' is-ativo' : '');
      if (ativo) botao.setAttribute('aria-current', 'page');
      const rotulo = document.createElement('span');
      rotulo.textContent = rotuloDe(orig);
      botao.appendChild(rotulo);
      botao.addEventListener('click', () => orig.click());
      barra.appendChild(botao);
    });
    const atual = barra.querySelector('.is-ativo');
    if (atual) barra.scrollLeft = Math.max(0, atual.offsetLeft - (barra.clientWidth - atual.offsetWidth) / 2);
  };
  new MutationObserver(() => {
    if (agendado) return;
    agendado = true;
    // Junta as mudanças do mesmo toque e redesenha uma vez só.
    Promise.resolve().then(desenhar);
  }).observe(lista, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ['class', 'style', 'hidden'] });
  desenhar();
}

function ligarSubmenusNoCelular() {
  // Configurações: Informações, Sua empresa, Preferências, Privacidade…
  const config = document.getElementById('settings-tabs');
  if (config) submenuNoCelular(config, '.category-tab', b => (b.querySelector('span') || b).textContent.trim());
  // Construtor: Editar meu site / Formulários (a lista fica na sidebar).
  if (document.body.dataset.page === 'paginas-site') {
    const sub = document.querySelector('.b2b-sidebar .sidebar-nav-group--construtor .sidebar-subnav');
    if (sub) submenuNoCelular(sub, '.sidebar-subnav-item', a => a.textContent.trim());
  }
}
document.addEventListener('shell:ready', ligarSubmenusNoCelular);

/* ==========================================================================
   Celular (mesma media query do anfitrião, inclusive com o celular deitado).
   ========================================================================== */
const MQ_CELULAR = '(max-width: 768px), (hover: none) and (pointer: coarse) and (max-height: 500px)';
const noCelular = () => window.matchMedia(MQ_CELULAR).matches;
/* Volta ao topo na hora: a janela e a caixa do conteúdo (quem rola no Hub). */
const irAoTopo = () => {
  window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  document.querySelector('.b2b-content')?.scrollTo({ top: 0, left: 0, behavior: 'instant' });
};

/* Barra de baixo: tocar em qualquer item sempre começa a página do topo; tocar
   de novo no item já ativo volta ao topo e à primeira aba daquela seção
   (fecha a tela aberta por dentro, como o pedido ou o produto, pela seta). */
function ligarBarraDeBaixo() {
  const barra = document.querySelector('.mobile-bottom-nav');
  if (!barra) return;
  barra.addEventListener('click', (e) => {
    const item = e.target instanceof Element ? e.target.closest('.mobile-nav-item') : null;
    if (!item || !noCelular()) return;
    irAoTopo();
    if (!item.classList.contains('active')) return;
    e.preventDefault();
    const visivel = (/** @type {Element|null|undefined} */ el) => el instanceof HTMLElement && el.offsetParent !== null;
    const voltar = Array.from(document.querySelectorAll('.b2b-content > .b2b-header-bar .produto-voltar')).find(visivel);
    if (voltar instanceof HTMLElement) voltar.click();
    const primeiraAba = [
      ...document.querySelectorAll('.b2b-content > .submenu-celular:not([hidden]) .submenu-celular-item'),
      ...document.querySelectorAll('.b2b-content .category-tabs-bar .category-tab')
    ].find(visivel);
    if (primeiraAba instanceof HTMLElement && !primeiraAba.classList.contains('is-ativo') && !primeiraAba.classList.contains('active')) primeiraAba.click();
    setTimeout(irAoTopo, 0);
  });
}

/* Menu do celular (☰ no topo do Dashboard): gaveta lateral com todas as
   seções do Hub e, embaixo, a conta. Tocar na conta abre o pop-up de baixo
   para cima com as empresas, os itens da conta e Sair, que repassam o toque
   aos itens do menu do perfil (mesmo comportamento do desktop).
   Copiado do menu do celular do anfitrião (js/app.js, menuDoCelular). */
function montarMenuDoCelular() {
  const abrirBtn = document.getElementById('btn-menu-celular');
  if (!abrirBtn || document.getElementById('menu-celular')) return;
  const logo = `<span class="logo-celular">
      <img class="logo-celular-icone logo-claro" src="assets/iconelove2.png?v=5" alt="" aria-hidden="true">
      <img class="logo-celular-icone logo-escuro" src="assets/icon-white1.png?v=5" alt="" aria-hidden="true">
      <img class="logo-celular-nome logo-claro" src="assets/Love-dark-03.png" alt="Love">
      <img class="logo-celular-nome logo-escuro" src="assets/Love-white-03.png" alt="Love">
    </span>`;
  document.body.insertAdjacentHTML('beforeend', `
    <div class="menu-celular-fundo" aria-hidden="true"></div>
    <aside id="menu-celular" class="menu-celular" role="dialog" aria-modal="true" aria-label="Menu" aria-hidden="true">
      <div class="menu-celular-topo">
        ${logo}
        <button type="button" class="menu-celular-fechar" aria-label="Fechar menu"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14m0 0-7-7m7 7-7 7"/></svg></button>
      </div>
      <nav class="menu-celular-nav" aria-label="Seções"></nav>
      <button type="button" class="menu-celular-conta" aria-haspopup="dialog">
        <span class="menu-celular-avatar" aria-hidden="true"></span>
        <span class="menu-celular-conta-textos">
          <span class="menu-celular-nome"></span>
          <span class="menu-celular-empresa-nome"></span>
        </span>
        <svg class="menu-celular-conta-seta" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 15 6-6 6 6"/></svg>
      </button>
    </aside>
    <div class="menu-conta-fundo" aria-hidden="true"></div>
    <section class="menu-conta" role="dialog" aria-modal="true" aria-label="Minha conta" aria-hidden="true">
      <div class="menu-conta-alca" aria-hidden="true"></div>
      <button type="button" class="menu-conta-fechar" aria-label="Fechar"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg></button>
      <div class="menu-conta-cabeca">
        <span class="menu-conta-avatar" aria-hidden="true"></span>
        <p class="menu-conta-nome"></p>
        <p class="menu-conta-email"></p>
      </div>
      <div class="menu-conta-empresas">
        <button type="button" class="menu-celular-empresa-atual" aria-expanded="false">
          <span class="menu-celular-empresa-textos">
            <span class="menu-celular-empresa-rotulo">Suas empresas</span>
            <span class="menu-celular-empresa-nome"></span>
          </span>
          <svg class="menu-celular-empresa-seta" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>
        </button>
        <div class="menu-celular-empresas-lista" hidden></div>
      </div>
      <nav class="menu-conta-itens" aria-label="Minha conta"></nav>
      <button type="button" class="menu-conta-sair">Sair</button>
    </section>`);

  const gaveta = /** @type {HTMLElement} */ (document.getElementById('menu-celular'));
  const fundo = /** @type {HTMLElement} */ (document.querySelector('.menu-celular-fundo'));
  const conta = /** @type {HTMLElement} */ (document.querySelector('.menu-conta'));
  const contaFundo = /** @type {HTMLElement} */ (document.querySelector('.menu-conta-fundo'));
  const nav = /** @type {HTMLElement} */ (gaveta.querySelector('.menu-celular-nav'));
  const listaEmpresas = /** @type {HTMLElement} */ (conta.querySelector('.menu-celular-empresas-lista'));
  const empresaAtual = /** @type {HTMLElement} */ (conta.querySelector('.menu-celular-empresa-atual'));
  const itensConta = /** @type {HTMLElement} */ (conta.querySelector('.menu-conta-itens'));

  const abertos = (/** @type {Element} */ el, /** @type {boolean} */ ligado) => {
    el.classList.toggle('is-aberta', ligado);
    el.setAttribute('aria-hidden', String(!ligado));
  };
  const fecharConta = () => { abertos(conta, false); abertos(contaFundo, false); };
  const fechar = () => {
    fecharConta();
    abertos(gaveta, false);
    abertos(fundo, false);
    document.body.classList.remove('menu-celular-aberto');
    abrirBtn.setAttribute('aria-expanded', 'false');
  };
  /** Fecha tudo e repassa o toque ao item original. @param {Element|null} alvo */
  const repassar = (alvo) => { fechar(); if (alvo instanceof HTMLElement) alvo.click(); };
  const texto = (/** @type {string} */ id) => ((document.getElementById(id)?.textContent) || '').trim().replace(/^—$/, '');
  /** Ícone da sidebar, no traço do menu do anfitrião (1.5). @param {Element|null} origem */
  const icone = (origem) => {
    const svg = origem && origem.querySelector('svg');
    if (!svg) return '';
    const copia = /** @type {SVGElement} */ (svg.cloneNode(true));
    copia.setAttribute('stroke-width', '1.5');
    copia.setAttribute('aria-hidden', 'true');
    copia.removeAttribute('class');
    return copia.outerHTML;
  };
  const pagina = document.body.dataset.page || '';
  const linha = (/** @type {string} */ href, /** @type {string} */ rotulo, /** @type {string} */ ic, /** @type {boolean} */ ativo) =>
    `<a href="${escapeHtml(href)}" class="menu-celular-link${ativo ? ' is-ativo' : ''}"${ativo ? ' aria-current="page"' : ''}>${ic}<span>${escapeHtml(rotulo)}</span></a>`;

  // Todas as seções da sidebar, na mesma ordem; o Construtor vira um título
  // com Editar meu site e Formulários embaixo; Workshops e Dúvidas no fim.
  const desenharNav = () => {
    const sidebar = document.querySelector('.b2b-sidebar');
    if (!sidebar) return;
    let html = '';
    sidebar.querySelectorAll('.sidebar-nav > .sidebar-nav-item[data-page], .sidebar-nav > .sidebar-nav-group').forEach(el => {
      if (el.classList.contains('sidebar-nav-group')) {
        const titulo = (el.querySelector('.sidebar-nav-text')?.textContent || '').trim();
        const ic = icone(el.querySelector('.sidebar-nav-toggle'));
        const aba = new URLSearchParams(location.search).get('tab') || 'editar';
        html += `<p class="menu-celular-secao">${escapeHtml(titulo)}</p>`;
        el.querySelectorAll('.sidebar-subnav-item').forEach(sub => {
          const a = /** @type {HTMLAnchorElement} */ (sub);
          const ativo = pagina === 'paginas-site' && a.dataset.construtorAba === aba;
          html += linha(a.getAttribute('href') || '', (a.textContent || '').trim(), ic, ativo);
        });
        return;
      }
      const a = /** @type {HTMLAnchorElement} */ (el);
      html += linha(a.getAttribute('href') || '', (a.querySelector('.sidebar-nav-text')?.textContent || '').trim(), icone(a), a.classList.contains('active'));
    });
    const extras = Array.from(sidebar.querySelectorAll('.sidebar-bottom > .sidebar-nav-item[data-page]'));
    if (extras.length) {
      html += '<p class="menu-celular-secao">Mais</p>';
      extras.forEach(el => {
        const a = /** @type {HTMLAnchorElement} */ (el);
        html += linha(a.getAttribute('href') || '', (a.querySelector('.sidebar-nav-text')?.textContent || '').trim(), icone(a), a.classList.contains('active'));
      });
    }
    nav.innerHTML = html;
  };
  nav.addEventListener('click', (e) => {
    const link = e.target instanceof Element ? e.target.closest('.menu-celular-link') : null;
    if (!link) return;
    fechar();
    if (link.classList.contains('is-ativo')) { e.preventDefault(); irAoTopo(); }
  });

  const copiarAvatar = (/** @type {Element|null} */ destino) => {
    const orig = document.getElementById('topbar-user-avatar');
    if (destino instanceof HTMLElement) destino.innerHTML = orig ? orig.innerHTML : '';
  };
  const preencherConta = () => {
    const empresa = texto('topbar-account-name');
    const nome = texto('profile-dropdown-name');
    const email = texto('profile-dropdown-email');
    const empresaAtiva = (document.querySelector('#profile-empresas .profile-empresa-item.is-ativa .profile-empresa-nome')?.textContent || '').trim() || empresa;
    gaveta.querySelectorAll('.menu-celular-nome').forEach(n => { n.textContent = empresa || nome || 'Minha conta'; });
    gaveta.querySelectorAll('.menu-celular-empresa-nome').forEach(n => { n.textContent = nome && nome !== empresa ? nome : email; });
    const nomeConta = conta.querySelector('.menu-conta-nome');
    if (nomeConta) nomeConta.textContent = nome || empresa || 'Minha conta';
    const emailConta = conta.querySelector('.menu-conta-email');
    if (emailConta) emailConta.textContent = email;
    const atual = empresaAtual.querySelector('.menu-celular-empresa-nome');
    if (atual) atual.textContent = empresaAtiva;
    copiarAvatar(gaveta.querySelector('.menu-celular-avatar'));
    copiarAvatar(conta.querySelector('.menu-conta-avatar'));
  };
  const mostrarEmpresas = (/** @type {boolean} */ aberto) => {
    listaEmpresas.hidden = !aberto;
    empresaAtual.setAttribute('aria-expanded', String(aberto));
  };
  const desenharEmpresas = () => {
    listaEmpresas.innerHTML = '';
    document.querySelectorAll('#profile-empresas .profile-empresa-item').forEach(orig => {
      const b = document.createElement('button');
      b.type = 'button';
      const ativa = orig.classList.contains('is-ativa');
      b.className = 'menu-celular-empresa' + (ativa ? ' is-ativo' : '');
      const nome = document.createElement('span');
      nome.textContent = (orig.querySelector('.profile-empresa-nome')?.textContent || '').trim();
      b.appendChild(nome);
      if (ativa) b.insertAdjacentHTML('beforeend', '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m5 12 5 5 9-10"/></svg>');
      b.addEventListener('click', () => repassar(orig));
      listaEmpresas.appendChild(b);
    });
    const criar = document.createElement('button');
    criar.type = 'button';
    criar.className = 'menu-celular-empresa is-criar';
    criar.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg><span>Adicionar empresa</span>';
    criar.addEventListener('click', () => repassar(document.querySelector('#avatar-dropdown .topbar-item-adicionar-empresa')));
    listaEmpresas.appendChild(criar);
  };
  const desenharItensConta = () => {
    itensConta.innerHTML = '';
    document.querySelectorAll('#avatar-dropdown > .topbar-dropdown-item:not(.topbar-item-adicionar-empresa):not(.topbar-item-sair)').forEach(orig => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'menu-conta-item';
      const ic = orig.querySelector('svg');
      if (ic) {
        const copia = /** @type {SVGElement} */ (ic.cloneNode(true));
        copia.removeAttribute('class');
        b.appendChild(copia);
      }
      const t = document.createElement('span');
      t.textContent = (orig.textContent || '').trim();
      b.appendChild(t);
      b.addEventListener('click', () => repassar(orig));
      itensConta.appendChild(b);
    });
  };

  const abrir = () => {
    desenharNav();
    preencherConta();
    abertos(gaveta, true);
    abertos(fundo, true);
    document.body.classList.add('menu-celular-aberto');
    abrirBtn.setAttribute('aria-expanded', 'true');
  };
  const abrirConta = () => {
    preencherConta();
    desenharEmpresas();
    desenharItensConta();
    mostrarEmpresas(false);
    abertos(contaFundo, true);
    abertos(conta, true);
  };

  abrirBtn.addEventListener('click', (e) => { e.stopPropagation(); abrir(); });
  gaveta.querySelector('.menu-celular-fechar')?.addEventListener('click', fechar);
  fundo.addEventListener('click', fechar);
  gaveta.querySelector('.menu-celular-conta')?.addEventListener('click', abrirConta);
  conta.querySelector('.menu-conta-fechar')?.addEventListener('click', fecharConta);
  contaFundo.addEventListener('click', fecharConta);
  conta.querySelector('.menu-conta-sair')?.addEventListener('click', () => repassar(document.querySelector('#avatar-dropdown [data-logout]')));
  empresaAtual.addEventListener('click', () => mostrarEmpresas(listaEmpresas.hidden));
  // Puxar a alça do pop-up para baixo fecha.
  const alca = conta.querySelector('.menu-conta-alca');
  let alcaY = 0;
  alca?.addEventListener('touchstart', (e) => { alcaY = /** @type {TouchEvent} */ (e).touches[0].clientY; }, { passive: true });
  alca?.addEventListener('touchend', (e) => { if (/** @type {TouchEvent} */ (e).changedTouches[0].clientY - alcaY > 40) fecharConta(); });
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    if (conta.classList.contains('is-aberta')) fecharConta(); else fechar();
  });
  window.matchMedia(MQ_CELULAR).addEventListener?.('change', (e) => { if (!e.matches) fechar(); });
}

document.addEventListener('shell:ready', () => {
  ligarBarraDeBaixo();
  montarMenuDoCelular();
});

/* Faixa central de 1280px (como no anfitrião): a largura da área de
   conteúdo vai para --largura-conteudo; o CSS transforma o que passa de
   1280px em margem dos dois lados (ver "Desktop: espaço como no anfitrião"). */
(function medirLarguraDoConteudo() {
  const conteudo = document.querySelector('.b2b-content');
  if (!conteudo) return;
  const medir = () => conteudo.style.setProperty('--largura-conteudo', `${Math.round(conteudo.getBoundingClientRect().width)}px`);
  medir();
  if (typeof ResizeObserver === 'function') new ResizeObserver(medir).observe(conteudo);
  else window.addEventListener('resize', medir);
})();
