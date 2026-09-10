/* ==========================================================================
   LOVE B2B — Shell compartilhado (Sidebar + Topbar)
   Injeta os partials em toda página e resolve navegação/topbar.
   ========================================================================== */

// Aplica o tema e o estado do sidebar salvos o quanto antes, para evitar flash.
document.body.dataset.theme = localStorage.getItem('b2b-theme') || 'light';
if (localStorage.getItem('b2b-sidebar-collapsed') === '1') {
  document.body.classList.add('sidebar-collapsed');
}

// Plano (mock local — sem backend) salvo pela página de planos.
const savedPlan = localStorage.getItem('b2b-plan');
if (savedPlan && typeof B2B_DATA !== 'undefined') B2B_DATA.professional.plan = savedPlan;

document.addEventListener('DOMContentLoaded', async () => {
  // Captura o total de não lidas antes de qualquer página marcar
  // conversas como lidas (evita corrida com mensagens.js).
  const unreadSnapshot = typeof B2B_DATA !== 'undefined'
    ? B2B_DATA.conversations.reduce((sum, c) => sum + (c.unread || 0), 0)
    : 0;

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
  initPageTransitions();
  document.dispatchEvent(new CustomEvent('shell:ready'));
});

/* -------------------- Transição sutil entre páginas -------------------- */

function initPageTransitions() {
  document.addEventListener('click', e => {
    if (e.defaultPrevented || e.button !== 0) return;
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;

    const link = e.target.closest('a[href]');
    if (!link || (link.target && link.target !== '_self')) return;

    const href = link.getAttribute('href');
    if (!href || href.startsWith('#') || href.startsWith('javascript:') || href.startsWith('mailto:') || href.startsWith('tel:')) return;

    let url;
    try { url = new URL(href, location.href); } catch { return; }
    if (url.origin !== location.origin) return;
    if (url.pathname === location.pathname && url.search === location.search) return;

    e.preventDefault();
    document.body.classList.add('page-leaving');
    setTimeout(() => { window.location.href = url.href; }, 130);
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
    fetch('partials/sidebar.html').then(r => r.text()),
    fetch('partials/topbar.html').then(r => r.text())
  ]);
  if (sidebarMount) sidebarMount.innerHTML = sidebarHtml;
  if (topbarMount) topbarMount.innerHTML = topbarHtml;
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
  setText('profile-dropdown-name', p.name);
  setText('profile-dropdown-email', p.email);
  setText('profile-dropdown-company', p.company);
  setText('profile-dropdown-doc', p.document);
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

function initNotifications(unreadSnapshot) {
  const list = document.getElementById('notif-list');
  const dot = document.getElementById('notif-dot');
  const navBadge = document.getElementById('nav-msg-badge');
  const railBadge = document.getElementById('nav-msg-badge-rail');
  const headerBadge = document.getElementById('nav-msg-badge-header');
  const mobileBadge = document.getElementById('nav-msg-badge-mobile');
  if (!list) return;

  const alerts = typeof B2B_DATA !== 'undefined' ? B2B_DATA.alertas : [];

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

function initCommandPalette() {
  const palette = document.getElementById('command-palette');
  const input = document.getElementById('command-input');
  if (!palette || !input) return;

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
  if (!results || typeof B2B_DATA === 'undefined') return;
  const q = query.trim().toLowerCase();

  const items = [
    ...B2B_DATA.leads.map(l => ({ label: l.name, meta: l.event, href: 'crm.html', group: 'Clientes' })),
    ...B2B_DATA.contracts.map(c => ({ label: c.client, meta: `Contrato · ${c.event}`, href: 'contratos.html', group: 'Contratos' })),
    ...B2B_DATA.products.map(p => ({ label: p.name, meta: p.category, href: 'produtos.html', group: 'Produtos' }))
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
