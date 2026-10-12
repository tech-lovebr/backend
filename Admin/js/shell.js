/* ==========================================================================
   LOVE ADMIN — Shell (sidebar + topbar) e guarda de autenticação
   Carregado por todas as páginas internas, sempre antes do script da página.
   ========================================================================== */

const NAV_SECTIONS = [
  {
    label: 'Visão geral',
    items: [
      { page: 'dashboard', href: 'dashboard.html', text: 'Dashboard', icon: 'grid' }
    ]
  },
  {
    label: 'Contas',
    items: [
      {
        // Grupos não navegam: clicar apenas abre e fecha os filhos.
        grupo: 'fornecedores', text: 'HUB/B2B', icon: 'store',
        children: [
          { page: 'fornecedores', href: 'fornecedores.html', text: 'Cadastros' },
          { page: 'afiliados', href: 'afiliados.html', text: 'Afiliados' },
          { page: 'fornecedores-dashboard', href: 'fornecedores-dashboard.html', text: 'Dashboard' }
        ]
      },
      {
        grupo: 'clientes', text: 'Anfitriões', icon: 'users',
        children: [
          { page: 'clientes', href: 'clientes.html', text: 'Cadastros' },
          { page: 'clientes-dashboard', href: 'clientes-dashboard.html', text: 'Dashboard' }
        ]
      }
    ]
  },
  {
    label: 'Operação',
    items: [
      { page: 'eventos', href: 'eventos.html', text: 'Eventos', icon: 'calendar' },
      { page: 'financeiro', href: 'financeiro.html', text: 'Financeiro', icon: 'wallet' },
      { page: 'atendimento', href: 'atendimento.html', text: 'Atendimento', icon: 'chat', badge: 'tickets-abertos' }
    ]
  },
  {
    label: 'Vendas',
    items: [
      { page: 'servicos', href: 'servicos.html', text: 'Serviços', icon: 'shield' },
      { page: 'viagens', href: 'viagens.html', text: 'Love Viagens', icon: 'plane' }
    ]
  },
  {
    label: 'CMS',
    items: [
      { page: 'cms', href: 'cms.html', text: 'Blog', icon: 'artigo' },
      { page: 'cms-legal', href: 'cms-legal.html', text: 'Legal', icon: 'legal' },
      { page: 'cms-notificacoes', href: 'cms-notificacoes.html', text: 'Notificações', icon: 'sino' }
    ]
  }
];

// Ícones no mesmo traço do sidebar do B2B (Tabler outline, stroke 1.6).
const ICONS = {
  grid: '<path d="M4 5a1 1 0 0 1 1 -1h4a1 1 0 0 1 1 1v4a1 1 0 0 1 -1 1h-4a1 1 0 0 1 -1 -1l0 -4" /><path d="M14 5a1 1 0 0 1 1 -1h4a1 1 0 0 1 1 1v4a1 1 0 0 1 -1 1h-4a1 1 0 0 1 -1 -1l0 -4" /><path d="M4 15a1 1 0 0 1 1 -1h4a1 1 0 0 1 1 1v4a1 1 0 0 1 -1 1h-4a1 1 0 0 1 -1 -1l0 -4" /><path d="M14 15a1 1 0 0 1 1 -1h4a1 1 0 0 1 1 1v4a1 1 0 0 1 -1 1h-4a1 1 0 0 1 -1 -1l0 -4" />',
  store: '<path d="M3 21l18 0" /><path d="M3 7v1a3 3 0 0 0 6 0v-1m0 1a3 3 0 0 0 6 0v-1m0 1a3 3 0 0 0 6 0v-1h-18l2 -4h14l2 4" /><path d="M5 21l0 -10.15" /><path d="M19 21l0 -10.15" /><path d="M9 21v-4a2 2 0 0 1 2 -2h2a2 2 0 0 1 2 2v4" />',
  users: '<path d="M9 7m-4 0a4 4 0 1 0 8 0a4 4 0 1 0 -8 0" /><path d="M3 21v-2a4 4 0 0 1 4 -4h4a4 4 0 0 1 4 4v2" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /><path d="M21 21v-2a4 4 0 0 0 -3 -3.85" />',
  calendar: '<path d="M4 5m0 2a2 2 0 0 1 2 -2h12a2 2 0 0 1 2 2v12a2 2 0 0 1 -2 2h-12a2 2 0 0 1 -2 -2z" /><path d="M16 3l0 4" /><path d="M8 3l0 4" /><path d="M4 11l16 0" /><path d="M8 15h2v2h-2z" />',
  wallet: '<path d="M17 8v-3a1 1 0 0 0 -1 -1h-10a2 2 0 0 0 0 4h12a1 1 0 0 1 1 1v3m0 4v3a1 1 0 0 1 -1 1h-12a2 2 0 0 1 -2 -2v-12" /><path d="M20 12v4h-4a2 2 0 0 1 0 -4h4" />',
  menu: '<path d="M4 6l16 0" /><path d="M4 12l16 0" /><path d="M4 18l16 0" />',
  shield: '<path d="M11.46 20.846a12 12 0 0 1 -7.96 -14.846a12 12 0 0 0 8.5 -3a12 12 0 0 0 8.5 3a12 12 0 0 1 -.09 7.06" /><path d="M15 19l2 2l4 -4" />',
  plane: '<path d="M16 10h4a2 2 0 0 1 0 4h-4l-4 7h-3l2 -7h-4l-2 2h-3l2 -4l-2 -4h3l2 2h4l-2 -7h3z" />',
  artigo: '<path d="M19 3v18h-14a2 2 0 0 1 -2 -2v-14a2 2 0 0 1 2 -2z" /><path d="M7 7h8" /><path d="M7 11h8" /><path d="M7 15h5" />',
  legal: '<path d="M14 3v4a1 1 0 0 0 1 1h4" /><path d="M5 8v-3a2 2 0 0 1 2 -2h7l5 5v11a2 2 0 0 1 -2 2h-5" /><path d="M3 13h6" /><path d="M6 10v6" />',
  sino: '<path d="M10 5a2 2 0 1 1 4 0a7 7 0 0 1 4 6v3a4 4 0 0 0 2 3h-16a4 4 0 0 0 2 -3v-3a7 7 0 0 1 4 -6" /><path d="M9 17v1a3 3 0 0 0 6 0v-1" />',
  chat: '<path d="M3 7a2 2 0 0 1 2 -2h14a2 2 0 0 1 2 2v10a2 2 0 0 1 -2 2h-14a2 2 0 0 1 -2 -2v-10z" /><path d="M3 7l9 6l9 -6" />',
};

function icon(name) {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${ICONS[name] || ''}</svg>`;
}

const CHEVRON = '<svg class="sidebar-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6" /></svg>';

/* ----------------------------------------------------- Guarda de sessão */

/**
 * Exige sessão válida E registro ativo na tabela `admins`.
 * Ter conta no Supabase não basta: um fornecedor ou um casal logado que
 * tentasse abrir o Admin cai fora aqui (e o banco também o bloquearia).
 * Páginas aguardam `window.adminReady` antes de consultar dados.
 */
window.adminReady = (async () => {
  const { data: { session } } = await supabaseClient.auth.getSession();

  if (!session) {
    window.location.replace('login.html');
    return null;
  }

  const { data: admin, error } = await supabaseClient
    .from('admins')
    .select('id, name, email, role, active')
    .eq('id', session.user.id)
    .maybeSingle();

  if (error) {
    console.error('[admin] não foi possível verificar o papel de administrador:', error.message);
  }

  if (!admin || !admin.active) {
    await supabaseClient.auth.signOut();
    window.location.replace('login.html?erro=sem-acesso');
    return null;
  }

  window.adminUser = { ...admin, email: admin.email || session.user.email };
  return window.adminUser;
})();

/* --------------------------------------------------------- Renderização */

document.addEventListener('DOMContentLoaded', async () => {
  const admin = await window.adminReady;
  if (!admin) return;

  renderSidebar();
  renderTopbar(admin);
  renderHeaderBar();
  document.body.classList.add('is-ready');
  refreshTicketBadge();
});

function renderSidebar() {
  const host = document.getElementById('admin-sidebar');
  if (!host) return;

  const current = document.body.dataset.page;

  const item = (dados) => `
    <a class="admin-nav-item ${dados.page === current ? 'is-active' : ''}" href="${dados.href}" title="${dados.text}">
      <span class="admin-nav-icon-box">${icon(dados.icon)}</span>
      <span class="admin-nav-text">${dados.text}</span>
      ${dados.badge ? `<span class="admin-nav-badge" id="${dados.badge}" hidden></span>` : ''}
    </a>`;

  const grupo = (dados) => {
    // O grupo já nasce aberto quando a página atual é uma das filhas — senão
    // você estaria numa tela sem nada no menu indicando onde está.
    const aberto = dados.children.some(f => f.page === current);
    return `
      <button type="button" class="admin-nav-item admin-nav-group ${aberto ? 'is-open' : ''}"
              data-grupo="${dados.grupo}" aria-expanded="${aberto}" title="${dados.text}">
        <span class="admin-nav-icon-box">${icon(dados.icon)}</span>
        <span class="admin-nav-text">${dados.text}</span>
        ${CHEVRON}
      </button>
      <div class="admin-nav-children" data-filhos="${dados.grupo}" ${aberto ? '' : 'hidden'}>
        ${dados.children.map(f => `
          <a class="admin-nav-subitem ${f.page === current ? 'is-active' : ''}" href="${f.href}">${f.text}</a>
        `).join('')}
      </div>`;
  };

  const sections = NAV_SECTIONS.map(section => `
    <p class="admin-nav-label">${section.label}</p>
    ${section.items.map(i => (i.grupo ? grupo(i) : item(i))).join('')}
  `).join('');

  host.innerHTML = `
    <div class="admin-sidebar-brand">
      <img src="assets/logo-preto.png" alt="Love" class="marca-logo">
      <span class="marca-admin">Admin</span>
    </div>
    <nav class="admin-nav">${sections}</nav>
    <footer class="admin-sidebar-footer">
      <p class="razao-social">LOVE HUB LTDA</p>
      <p class="cnpj">69.386.397/0001-06</p>
    </footer>`;



  host.querySelectorAll('[data-grupo]').forEach(botao => {
    botao.addEventListener('click', () => {
      const filhos = host.querySelector(`[data-filhos="${botao.dataset.grupo}"]`);
      const abrindo = filhos.hidden;
      filhos.hidden = !abrindo;
      botao.classList.toggle('is-open', abrindo);
      botao.setAttribute('aria-expanded', String(abrindo));
    });
  });

  const backdrop = document.getElementById('sidebar-backdrop');
  if (backdrop) {
    backdrop.addEventListener('click', () => {
      host.classList.remove('is-open');
      backdrop.classList.remove('is-open');
    });
  }
}

/**
 * Barra de título no topo do conteúdo — mesmo formato da .b2b-header-bar do
 * Portal do Fornecedor: fundo claro, sangrando até as bordas do conteúdo.
 */
function renderHeaderBar() {
  const content = document.querySelector('.admin-content');
  if (!content || content.querySelector('.admin-header-bar')) return;

  // Uma página pode apontar para o site que ela administra (data-title-link);
  // o ícone abre em outra aba, com rel de segurança.
  const link = document.body.dataset.titleLink;
  const atalho = link ? `
    <a class="header-bar-link" href="${escapeHtml(link)}" target="_blank" rel="noopener noreferrer"
       title="Abrir ${escapeHtml(link.replace(/^https?:\/\//, ''))}" aria-label="Abrir site em nova aba">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
        <path d="M12 6h-6a2 2 0 0 0 -2 2v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2 -2v-6" />
        <path d="M11 13l9 -9" /><path d="M15 4h5v5" />
      </svg>
    </a>` : '';

  const barra = document.createElement('div');
  barra.className = 'admin-header-bar';
  barra.innerHTML = `
    <div class="header-bar-titulo">
      <h1>${escapeHtml(document.body.dataset.title || 'Painel')}</h1>
      ${atalho}
    </div>
    <div class="admin-header-actions" id="header-actions"></div>`;
  content.prepend(barra);
}

/* Mesmo ícone e mesma espessura de traço do botão "Minha conta" da
   plataforma principal (index.html). O Admin não guarda foto do
   administrador, então é sempre ele. */
const ICONE_PERFIL = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.15"><path stroke-linecap="round" stroke-linejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z"/></svg>';

function renderTopbar(admin) {
  const host = document.getElementById('admin-topbar');
  if (!host) return;

  host.innerHTML = `
    <button type="button" class="btn btn-ghost btn-sm btn-sidebar-toggle" id="btn-toggle-sidebar" aria-label="Abrir menu">
      ${icon('menu')}
    </button>

    <button type="button" class="topbar-search-trigger" id="abrir-busca">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M3 10a7 7 0 1 0 14 0a7 7 0 1 0 -14 0" /><path d="M21 21l-6 -6" /></svg>
      <span>Buscar fornecedor, cliente ou evento…</span>
      <kbd>⌘K</kbd>
    </button>
    <div class="admin-user">
      <button type="button" class="admin-user-chip" id="btn-user-menu"
              aria-haspopup="true" aria-expanded="false"
              aria-label="${escapeHtml(admin.name || 'Administrador')}">
        <span class="avatar">${ICONE_PERFIL}</span>
      </button>
      <div class="admin-user-menu" id="user-menu" hidden>
        <p class="admin-user-menu-nome">${escapeHtml(admin.name || 'Administrador')}</p>
        <p class="admin-user-menu-email">${escapeHtml(admin.email || '')}</p>

        <a href="configuracoes.html" class="admin-user-menu-item">Configurações</a>
        <a href="funcoes.html" class="admin-user-menu-item">Funções</a>

        <div class="admin-user-menu-divider"></div>

        <button type="button" class="admin-user-menu-item" id="btn-logout">Sair</button>
      </div>
    </div>`;

  host.querySelector('#abrir-busca').addEventListener('click', () => Busca.abrir());

  host.querySelector('#btn-toggle-sidebar').addEventListener('click', (e) => {
    e.stopPropagation();
    document.getElementById('admin-sidebar')?.classList.toggle('is-open');
    document.getElementById('sidebar-backdrop')?.classList.toggle('is-open');
  });

  const botaoMenu = host.querySelector('#btn-user-menu');
  const menu = host.querySelector('#user-menu');

  const fecharMenu = () => {
    menu.hidden = true;
    botaoMenu.setAttribute('aria-expanded', 'false');
  };

  botaoMenu.addEventListener('click', (e) => {
    e.stopPropagation();
    menu.hidden = !menu.hidden;
    botaoMenu.setAttribute('aria-expanded', String(!menu.hidden));
  });

  document.addEventListener('click', fecharMenu);
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') fecharMenu(); });

  host.querySelector('#btn-logout').addEventListener('click', async () => {
    await supabaseClient.auth.signOut();
    window.location.replace('login.html');
  });

}

/** Contador de chamados abertos no menu lateral. */
async function refreshTicketBadge() {
  const el = document.getElementById('tickets-abertos');
  if (!el) return;

  const { count, error } = await supabaseClient
    .from('tickets')
    .select('id', { count: 'exact', head: true })
    .in('status', ['aberto', 'em_andamento']);

  if (error || !count) return;
  el.textContent = count > 99 ? '99+' : count;
  el.hidden = false;
}
