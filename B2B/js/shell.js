/* ==========================================================================
   LOVE B2B — Shell compartilhado (Sidebar + Topbar)
   Injeta os partials em toda página e resolve navegação/topbar.
   ========================================================================== */

document.addEventListener('DOMContentLoaded', async () => {
  // Captura o total de não lidas antes de qualquer página marcar
  // conversas como lidas (evita corrida com mensagens.js).
  const unreadSnapshot = typeof B2B_DATA !== 'undefined'
    ? B2B_DATA.conversations.reduce((sum, c) => sum + (c.unread || 0), 0)
    : 0;

  await loadShell();
  initSidebarState();
  initUserCard();
  initTopbarDropdowns();
  initCommandPalette();
  initNotifications(unreadSnapshot);
  document.dispatchEvent(new CustomEvent('shell:ready'));
});

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
  document.querySelectorAll('.b2b-nav-item[data-page]').forEach(item => {
    item.classList.toggle('active', item.dataset.page === page);
  });
}

function initUserCard() {
  const topbarAvatar = document.getElementById('topbar-user-avatar');
  if (topbarAvatar) topbarAvatar.src = B2B_DATA.professional.avatar;
}

/* -------------------- Dropdowns do topbar -------------------- */

function initTopbarDropdowns() {
  const pairs = [
    ['notif-trigger', 'notif-dropdown'],
    ['quickcreate-trigger', 'quickcreate-dropdown'],
    ['avatar-trigger', 'avatar-dropdown']
  ];

  function closeAll(except) {
    pairs.forEach(([, dropId]) => {
      if (dropId !== except) document.getElementById(dropId)?.classList.remove('show');
    });
  }

  pairs.forEach(([triggerId, dropId]) => {
    const trigger = document.getElementById(triggerId);
    const drop = document.getElementById(dropId);
    if (!trigger || !drop) return;
    trigger.addEventListener('click', e => {
      e.stopPropagation();
      const willShow = !drop.classList.contains('show');
      closeAll(dropId);
      drop.classList.toggle('show', willShow);
    });
  });

  document.addEventListener('click', () => closeAll(null));

  const search = document.getElementById('search-trigger');
  if (search) search.addEventListener('click', () => openCommandPalette());
}

/* -------------------- Notificações -------------------- */

function initNotifications(unreadSnapshot) {
  const list = document.getElementById('notif-list');
  const dot = document.getElementById('notif-dot');
  const navBadge = document.getElementById('nav-msg-badge');
  if (!list) return;

  const alerts = typeof B2B_DATA !== 'undefined' ? B2B_DATA.alertas : [];

  if (alerts.length) {
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
  if (navBadge) {
    if (unreadMsgs > 0) { navBadge.textContent = unreadMsgs; navBadge.style.display = ''; }
    else navBadge.style.display = 'none';
  }
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
