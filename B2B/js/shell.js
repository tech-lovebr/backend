/* ==========================================================================
   LOVE B2B — Shell compartilhado (Sidebar + Topbar)
   Injeta os partials em toda página e resolve navegação/topbar.
   ========================================================================== */

// site-preview.html é a página pública do site publicado pelo fornecedor
// (quem acessa é o cliente final, não precisa estar logado no B2B).
const PUBLIC_PAGES = ['site-preview'];

// Aplica o tema e o estado do sidebar salvos o quanto antes, para evitar flash.
document.body.dataset.theme = localStorage.getItem('b2b-theme') || 'light';
if (localStorage.getItem('b2b-sidebar-collapsed') === '1') {
  document.body.classList.add('sidebar-collapsed');
}

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

document.addEventListener('DOMContentLoaded', async () => {
  const authed = await window.b2bAuthReady;
  if (!authed) return;

  // O chat real ainda não rastreia mensagens não lidas (ver mensagens.js),
  // então por enquanto o badge de notificação de chat fica sempre zerado.
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
});

/* -------------------- Autenticação (Supabase) -------------------- */

async function initAuthGuard() {
  if (PUBLIC_PAGES.includes(document.body.dataset.page)) return true;

  const { data: { session } } = await supabaseClient.auth.getSession();
  if (!session) {
    window.location.href = 'login.html';
    return false;
  }

  window.b2bSession = session;

  const { data: fornecedor } = await supabaseClient
    .from('fornecedores')
    .select('id, company_name, email, avatar_url, plan, pix_key, pix_key_type')
    .eq('id', session.user.id)
    .maybeSingle();

  if (fornecedor && typeof B2B_DATA !== 'undefined') {
    B2B_DATA.professional.id = fornecedor.id;
    B2B_DATA.professional.company = fornecedor.company_name || B2B_DATA.professional.company;
    B2B_DATA.professional.name = fornecedor.company_name || B2B_DATA.professional.name;
    B2B_DATA.professional.email = fornecedor.email || B2B_DATA.professional.email;
    if (fornecedor.avatar_url) B2B_DATA.professional.avatar = fornecedor.avatar_url;
    if (!localStorage.getItem('b2b-plan') && fornecedor.plan) B2B_DATA.professional.plan = fornecedor.plan;
    B2B_DATA.professional.pixKey = fornecedor.pix_key || null;
    B2B_DATA.professional.pixKeyType = fornecedor.pix_key_type || null;
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
            <img src="../assets/iconelove2.png?v=5" alt="" class="sidebar-icon-light">
            <img src="../assets/icon-white1.png?v=5" alt="" class="sidebar-icon-dark">
            <img src="../assets/Love-dark-03.png" alt="Love" class="sidebar-word-light">
            <img src="../assets/Love-white-03.png" alt="Love" class="sidebar-word-dark">
          </div>
          <p class="b2b-footer-desc">O sistema operacional completo para planejar, gerenciar e celebrar os momentos mais especiais da sua vida.</p>
          <div class="b2b-footer-legal-links">
            <a href="#" onclick="return false;">Privacidade</a>
            <a href="#" onclick="return false;">Termos e condições</a>
          </div>
        </div>
        <div class="b2b-footer-social">
          <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" class="b2b-footer-social-btn" title="Instagram">
            <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
          </a>
          <a href="https://tiktok.com" target="_blank" rel="noopener noreferrer" class="b2b-footer-social-btn" title="TikTok">
            <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-1.01-.02 2.98.02 5.96-.02 8.94-.03 1.53-.45 3.08-1.28 4.38-1.12 1.77-2.97 3.04-5.04 3.49-1.71.38-3.55.19-5.14-.54-1.68-.78-3.05-2.14-3.86-3.8-1.07-2.18-.94-4.88.35-6.94 1.05-1.67 2.75-2.86 4.67-3.29.93-.21 1.9-.22 2.85-.04v4.18c-.7-.22-1.49-.24-2.19-.04-.84.23-1.57.81-1.95 1.59-.51 1.03-.38 2.3.33 3.2.66.84 1.72 1.34 2.8 1.34 1.14 0 2.21-.56 2.85-1.51.37-.55.57-1.22.57-1.89V.02z"/></svg>
          </a>
          <a href="https://x.com" target="_blank" rel="noopener noreferrer" class="b2b-footer-social-btn" title="X (Twitter)">
            <svg viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
          </a>
          <a href="https://linkedin.com" target="_blank" rel="noopener noreferrer" class="b2b-footer-social-btn" title="LinkedIn">
            <svg viewBox="0 0 24 24" fill="currentColor"><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/></svg>
          </a>
          <a href="https://youtube.com" target="_blank" rel="noopener noreferrer" class="b2b-footer-social-btn" title="YouTube">
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

  setSidebarCollapsed(document.body.classList.contains('sidebar-collapsed'));
}

function setSidebarCollapsed(collapsed) {
  document.body.classList.toggle('sidebar-collapsed', collapsed);
  localStorage.setItem('b2b-sidebar-collapsed', collapsed ? '1' : '0');

  const label = collapsed ? 'Expandir menu' : 'Recolher menu';
  const btn = document.getElementById('sidebar-collapse-toggle');
  if (btn) { btn.title = label; btn.setAttribute('aria-label', label); }
}

function initUserCard() {
  const p = B2B_DATA.professional;
  const topbarAvatar = document.getElementById('topbar-user-avatar');
  if (topbarAvatar) topbarAvatar.textContent = initials(p.name);

  setText('profile-dropdown-avatar', initials(p.name));
  setText('profile-dropdown-name', p.company);
  setText('profile-dropdown-email', p.email);
  setText('upgrade-current-plan', p.plan);
}

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

async function getKanbanDueTomorrowAlerts() {
  const { data: { session } } = await supabaseClient.auth.getSession();
  if (!session) return [];

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, '0')}-${String(tomorrow.getDate()).padStart(2, '0')}`;

  const { data, error } = await supabaseClient
    .from('agenda_tasks')
    .select('text, done, due_date')
    .eq('fornecedor_id', session.user.id)
    .eq('due_date', tomorrowStr)
    .eq('done', false);

  if (error || !data) return [];

  return data.map(task => ({
    text: `Amanhã é o último dia para finalizar a tarefa "${escapeHtml(task.text)}"`,
    href: 'agenda.html',
    tone: 'warning'
  }));
}

async function initNotifications(unreadSnapshot) {
  const list = document.getElementById('notif-list');
  const dot = document.getElementById('notif-dot');
  const navBadge = document.getElementById('nav-msg-badge');
  const railBadge = document.getElementById('nav-msg-badge-rail');
  const headerBadge = document.getElementById('nav-msg-badge-header');
  const mobileBadge = document.getElementById('nav-msg-badge-mobile');
  if (!list) return;

  const staticAlerts = typeof B2B_DATA !== 'undefined' ? B2B_DATA.alertas : [];
  const alerts = [...(await getKanbanDueTomorrowAlerts()), ...staticAlerts];

  if (alerts.length) {
    dot.textContent = alerts.length;
    dot.style.display = '';
    list.innerHTML = alerts.map(a => `
      <a href="${a.href}" class="topbar-dropdown-item" style="align-items:flex-start;white-space:normal;">
        <span class="notif-dot-${a.tone}"></span>
        <span>${a.text}</span>
      </a>
    `).join('');
  } else {
    list.innerHTML = '<p class="text-sm text-zinc-500 px-3 py-4 text-center">Nenhuma notificação nova.</p>';
  }

  const unreadMsgs = unreadSnapshot || 0;
  [navBadge, railBadge, headerBadge, mobileBadge].forEach(badge => {
    if (!badge) return;
    if (unreadMsgs > 0) { badge.textContent = unreadMsgs; badge.style.display = ''; }
    else badge.style.display = 'none';
  });
}

/* -------------------- Command palette (busca global) -------------------- */

let commandPaletteData = { leads: [], products: [], contracts: [] };

async function loadCommandPaletteData() {
  const { data: { session } } = await supabaseClient.auth.getSession();
  if (!session) return;

  const [leadsRes, productsRes, contractsRes] = await Promise.all([
    supabaseClient.from('leads').select('id, name, event_name').eq('fornecedor_id', session.user.id),
    supabaseClient.from('products').select('id, name, category').eq('fornecedor_id', session.user.id),
    supabaseClient.from('contracts').select('id, client_name, evento').eq('fornecedor_id', session.user.id)
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
    ...commandPaletteData.contracts.map(c => ({ label: c.client_name, meta: `Contrato · ${(c.evento && c.evento.nome) || ''}`, href: 'contratos.html', group: 'Contratos' })),
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
