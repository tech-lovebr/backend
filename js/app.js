/**
 * LOVE - Event OS (Event Operating System) & Marketplace
 * Controlador com Double-Sidebar (Ícone de Editar + Sub-drawer), Multi-Comemorações com Isolamento Total & Fintech
 */

document.addEventListener('DOMContentLoaded', () => {
  // Dica dos botões só com ícone (Mensagens, Notificações, lista/grid em
  // Encontrar fornecedor): caixinha branca da Love no lugar da caixinha preta
  // do navegador. Basta o botão ter data-dica="Texto". Aparece em cima do
  // botão; se não couber (ex.: topo da tela), embaixo.
  (function ligarDicasDosIcones() {
    /** @type {HTMLDivElement|null} */
    let dica = null;
    const esconder = () => { if (dica) dica.classList.remove('is-visivel'); };
    /** @param {HTMLElement} alvo */
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
      const alvo = e.target instanceof Element ? /** @type {HTMLElement|null} */ (e.target.closest('[data-dica]')) : null;
      if (alvo) mostrar(alvo);
    });
    document.addEventListener('mouseout', (e) => {
      const de = e.target instanceof Element ? e.target.closest('[data-dica]') : null;
      const para = e.relatedTarget instanceof Element ? e.relatedTarget.closest('[data-dica]') : null;
      if (de && de !== para) esconder();
    });
    document.addEventListener('focusin', (e) => {
      const alvo = e.target instanceof Element ? /** @type {HTMLElement|null} */ (e.target.closest('[data-dica]')) : null;
      if (alvo && alvo.matches(':focus-visible')) mostrar(alvo);
    });
    document.addEventListener('focusout', esconder);
    document.addEventListener('click', esconder, true);
    window.addEventListener('scroll', esconder, true);
  })();

  // Rodapé da plataforma logada: ano atual no "© {ano} Love Hub Ltda."
  const anoDoRodape = document.getElementById('rodape-ano');
  if (anoDoRodape) anoDoRodape.textContent = String(new Date().getFullYear());

  // Estado Global da Aplicação com Isolamento Completo por Comemoração
  const state = {
    currentView: 'public', // 'public' | 'dashboard'
    currentTab: 'edit-site', // 'edit-site' | 'gifts' | 'rsvp' | 'wallet' | 'overview' | 'b2b' | 'settings' | 'create-event-page'
    activeSubSection: 'home', // 'home' | 'about' | 'invite' | 'giftnotice'
    activeEventId: window.LOVE_DATA.currentEventId,
    events: [ ...window.LOVE_DATA.events ],
    hasEventCreated: true // Controla se o usuário já possui comemoração criada
  };

  // Elementos do DOM
  const elements = {
    viewPublic: document.getElementById('view-public-site'),
    viewDashboard: document.getElementById('view-event-os-dashboard'),
    viewLogin: document.getElementById('view-login'),
    
    // Header do Dashboard
    dashHeader: {
      btnSwitcher: document.getElementById('btn-event-switcher'),
      dropdownList: document.getElementById('dropdown-events-list'),
      eventsItemsContainer: document.getElementById('events-switcher-items'),
      btnDropdownCreate: document.getElementById('btn-dropdown-create-new-event'),
      eventTitle: document.getElementById('dash-header-event-title'),
      countdownBadge: document.getElementById('dash-event-countdown-badge'),
      slugBadge: document.getElementById('dash-slug-badge'),
      btnShareEvent: document.getElementById('btn-dash-share-event'),
      dropdownShare: document.getElementById('dropdown-share-event'),
      shareUrlInput: document.getElementById('share-event-url-input'),
      btnCopyShareUrl: document.getElementById('btn-copy-share-url'),
      btnShareWhatsApp: document.getElementById('btn-share-whatsapp'),
      btnShareNative: document.getElementById('btn-share-native'),
      btnLogout: document.getElementById('btn-dash-logout')
    },

    // Double Sidebar Elements
    railIconBtns: document.querySelectorAll('.rail-icon-btn'),
    subDrawer: document.getElementById('sidebar-sub-drawer'),
    drawerTitle: document.getElementById('drawer-section-title'),
    drawerActionBtn: document.getElementById('btn-drawer-primary-action'),
    drawerSubItemsList: document.getElementById('drawer-sub-items-list'),
    mainArea: document.getElementById('dashboard-main-area'),
    mobileBackdrop: document.getElementById('mobile-drawer-backdrop'),
    btnToggleSubDrawer: document.getElementById('btn-toggle-sub-drawer'),

    // Toast
    toast: document.getElementById('toast-notification'),
    toastText: document.getElementById('toast-message'),

    // Modais
    modals: {
      withdrawPix: document.getElementById('modal-withdraw-pix'),
      addGift: document.getElementById('modal-add-gift'),
      inviteAdvisor: document.getElementById('modal-invite-advisor'),
      searchWedding: document.getElementById('modal-search-wedding'),
      deleteEvent: document.getElementById('modal-delete-event'),
      templatePicker: document.getElementById('modal-template-picker'),
      register: document.getElementById('modal-register'),
      verifyCode: document.getElementById('modal-verify-code'),
      cropCover: document.getElementById('modal-crop-cover')
    }
  };

  // Evento aberto lembrado no navegador: ao atualizar a página (F5), a pessoa
  // continua no mesmo evento. Só muda quando ela troca no seletor do topo,
  // cria um evento novo ou exclui o que estava aberto.
  const CHAVE_EVENTO_ATIVO = 'love-evento-ativo';

  /** @param {string|null} id */
  function definirEventoAtivo(id) {
    state.activeEventId = id;
    try {
      if (id) localStorage.setItem(CHAVE_EVENTO_ATIVO, String(id));
      else localStorage.removeItem(CHAVE_EVENTO_ATIVO);
    } catch (e) { /* armazenamento indisponível: segue sem lembrar */ }
  }

  /** @returns {string|null} */
  function eventoAtivoGuardado() {
    try { return localStorage.getItem(CHAVE_EVENTO_ATIVO); } catch (e) { return null; }
  }

  // Helper para obter a comemoração ativa
  function getActiveEvent() {
    return state.events.find(e => e.id === state.activeEventId) || state.events[0];
  }

  // ==========================================
  // 1. HELPERS (TOASTS DESATIVADOS EM TODA A PLATAFORMA)
  // ==========================================
  function showToast(message, icon = '✓') {
    // Notificações flutuantes desativadas em toda a plataforma
    return;
  }

  function openModal(modalEl) {
    if (!modalEl) return;
    modalEl.classList.remove('hidden');
    modalEl.style.setProperty('display', 'flex', 'important');
    modalEl.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function closeModal(modalEl) {
    if (!modalEl) return;
    modalEl.classList.remove('open');
    modalEl.style.setProperty('display', 'none', 'important');
    modalEl.classList.add('hidden');
    document.body.style.overflow = '';
  }

  // Pop-up de confirmação da Love (no lugar do confirm() do navegador).
  // aoConfirmar (opcional, async): roda com o pop-up aberto e o botão
  // travado; se devolver um texto, ele aparece como erro e o pop-up fica.
  // Resolve true se confirmou (e deu certo), false se cancelou.
  /**
   * @param {{ titulo?: string, texto?: string, botao?: string, aoConfirmar?: (null | (() => any)) }} [opcoes]
   * @returns {Promise<boolean>}
   */
  function confirmarNaLove({ titulo, texto = '', botao = 'Excluir', aoConfirmar = null } = {}) {
    const modal = document.getElementById('modal-love-confirmar');
    if (!modal) return Promise.resolve(window.confirm(titulo));
    const btnOk = document.getElementById('love-confirmar-ok');
    const btnCancelar = document.getElementById('love-confirmar-cancelar');
    const erroEl = document.getElementById('love-confirmar-erro');
    document.getElementById('love-confirmar-titulo').textContent = titulo || '';
    const textoEl = document.getElementById('love-confirmar-texto');
    textoEl.textContent = texto;
    textoEl.classList.toggle('hidden', !texto);
    erroEl.classList.add('hidden');
    btnOk.textContent = botao;
    btnOk.disabled = false;
    openModal(modal);
    btnCancelar.focus();

    return new Promise(resolve => {
      const fechar = (resultado) => {
        btnOk.removeEventListener('click', aoOk);
        btnCancelar.removeEventListener('click', aoCancelar);
        modal.removeEventListener('click', aoFundo);
        document.removeEventListener('keydown', aoTecla);
        closeModal(modal);
        resolve(resultado);
      };
      const aoCancelar = () => { if (!btnOk.disabled) fechar(false); };
      const aoFundo = (e) => { if (e.target === modal) aoCancelar(); };
      const aoTecla = (e) => { if (e.key === 'Escape') aoCancelar(); };
      const aoOk = async () => {
        if (btnOk.disabled) return;
        if (!aoConfirmar) return fechar(true);
        btnOk.disabled = true;
        erroEl.classList.add('hidden');
        let erro = null;
        try { erro = await aoConfirmar(); } catch (e) { erro = 'Algo deu errado. Tente de novo.'; }
        btnOk.disabled = false;
        if (erro) {
          erroEl.textContent = erro;
          erroEl.classList.remove('hidden');
          return;
        }
        fechar(true);
      };
      btnOk.addEventListener('click', aoOk);
      btnCancelar.addEventListener('click', aoCancelar);
      modal.addEventListener('click', aoFundo);
      document.addEventListener('keydown', aoTecla);
    });
  }

  function foldSubDrawer() {
    if (elements.subDrawer) elements.subDrawer.classList.add('hidden-drawer');
    if (elements.mainArea) elements.mainArea.classList.add('full-width');
    if (elements.mobileBackdrop) elements.mobileBackdrop.classList.remove('active');
  }

  function expandSubDrawer() {
    if (elements.subDrawer) elements.subDrawer.classList.remove('hidden-drawer');
    if (elements.mainArea) elements.mainArea.classList.remove('full-width');
    if (window.innerWidth <= 768 && elements.mobileBackdrop) {
      elements.mobileBackdrop.classList.add('active');
    }
  }

  function toggleSubDrawer() {
    if (elements.subDrawer && elements.subDrawer.classList.contains('hidden-drawer')) {
      expandSubDrawer();
    } else {
      foldSubDrawer();
    }
  }

  function closeMobileDrawer() {
    foldSubDrawer();
  }

  function openMobileDrawer() {
    expandSubDrawer();
  }

  if (elements.btnToggleSubDrawer) {
    elements.btnToggleSubDrawer.addEventListener('click', toggleSubDrawer);
  }
  if (elements.mobileBackdrop) {
    elements.mobileBackdrop.addEventListener('click', foldSubDrawer);
  }

  document.querySelectorAll('.modal-backdrop-custom').forEach(modal => {
    modal.classList.remove('open');
    modal.addEventListener('click', (e) => {
      if (modal.getAttribute('data-no-backdrop-close') === 'true') return;
      if (e.target === modal) closeModal(modal);
    });
    modal.querySelectorAll('[data-close-modal]').forEach(btn => {
      btn.addEventListener('click', () => closeModal(modal));
    });
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      document.querySelectorAll('.modal-backdrop-custom.open').forEach(m => {
        if (m.getAttribute('data-no-backdrop-close') === 'true') return;
        closeModal(m);
      });
      closeAddGuestDrawer();
      closeGiftDrawer();
      document.body.style.overflow = '';
    }
  });

  // ==========================================
  // 2. GESTÃO DE TELAS & DOUBLE-SIDEBAR
  // ==========================================
  // Rota pendente do carregamento inicial (ex: a pessoa recarregou a página
  // em /termos, ou em /presentes, já logada) — setada uma única vez antes do
  // primeiro switchView(), e consumida aqui dentro assim que a sessão
  // confirma 'dashboard'. Sem isso, switchView('dashboard') sempre abria
  // primeiro na Visão Geral (chamando updateAllCelebrationData, montando a
  // aba inteira) só pra, um instante depois, trocar pra rota pedida —
  // dava pra ver esse "pulo" pela Visão Geral antes da página certa aparecer.
  let pendingInitialDashboardRoute = null;

  // Presentes marcados na caixinha do card (Meus presentes) — exclusão em massa.
  const presentesSelecionados = new Set();
  // Convidados marcados na caixinha da tabela (Meus convidados) — exclusão em massa.
  const convidadosSelecionados = new Set();

  // Navegação programática (ex.: botão "Checklist do Evento" no dashboard)
  // que precisa abrir já num sub-item específico de uma aba, sem precisar
  // clicar nele — setado antes de switchRailTab(), consumido e zerado logo
  // em seguida, dentro da própria renderização da sub-barra.
  let pendingSubItemId = null;

  function switchView(viewName) {
    // Essa é a decisão de verdade — solta o palpite visual do <head> (ver
    // index.html), que só existia pra cobrir o instante antes desta função
    // rodar pela primeira vez.
    document.documentElement.classList.remove('love-likely-logged-in');
    document.documentElement.classList.remove('love-rota-login');

    state.currentView = viewName;

    if (viewName === 'dashboard') {
      document.body.classList.add('dashboard-mode');
      if (elements.viewPublic) {
        elements.viewPublic.classList.add('hidden');
        elements.viewPublic.style.display = 'none';
      }
      if (elements.viewLogin) {
        elements.viewLogin.classList.add('hidden');
        elements.viewLogin.style.display = 'none';
      }
      if (elements.viewDashboard) {
        elements.viewDashboard.classList.remove('hidden');
        elements.viewDashboard.style.display = 'flex';
      }
      const activeEvent = getActiveEvent();
      if (activeEvent) {
        document.body.setAttribute('data-event-theme', activeEvent.type);
        updateAllCelebrationData();
      } else if (elements.dashHeader.eventTitle) {
        // Conta sem evento ainda — não deixa o texto estático do HTML
        // ("Casamento Beatriz & Lucas", de mockup) aparecer no cabeçalho.
        elements.dashHeader.eventTitle.textContent = 'Nenhum evento';
        if (elements.dashHeader.countdownBadge) elements.dashHeader.countdownBadge.textContent = '';
      }
      renderEventsSwitcher();
      loadNotificationsFeed();

      if (pendingInitialDashboardRoute) {
        const route = pendingInitialDashboardRoute;
        pendingInitialDashboardRoute = null;
        if (route.type === 'legal') {
          openLegalDocPage(route.slug);
        } else if (route.type === 'notifications') {
          openNotificationsPage({ pushUrl: false });
        } else if (route.type === 'faq') {
          openFaqPage({ pushUrl: false });
        } else if (route.type === 'settings') {
          openAccountSettingsPage({ pushUrl: false });
        } else if (route.type === 'tab') {
          if (route.rota) aplicarRota(route.rota, { inicial: true });
          else switchRailTab(route.tab);
        } else {
          switchRailTab('overview');
        }
      } else {
        switchRailTab('overview'); // Inicia na Home / Visão Geral
      }

      // Aplica tema salvo ao entrar na plataforma logada
      // Sem seletor de tema no perfil: sempre no claro.
      applyTheme('light');
    } else {
      document.body.classList.remove('dashboard-mode', 'editor-split-mode', 'organizadores-sem-previa', 'rsvp-mode', 'b2b-mode', 'b2b-chat-mode', 'page-mode', 'gifts-mode', 'wallet-mode', 'first-access-locked');
      document.body.removeAttribute('data-theme');
      document.documentElement.removeAttribute('data-theme');
      if (elements.viewDashboard) {
        elements.viewDashboard.classList.add('hidden');
        elements.viewDashboard.style.display = 'none';
      }
      if (viewName === 'login') {
        if (elements.viewPublic) {
          elements.viewPublic.classList.add('hidden');
          elements.viewPublic.style.display = 'none';
        }
        if (elements.viewLogin) {
          elements.viewLogin.classList.remove('hidden');
          elements.viewLogin.style.display = 'flex';
        }
      } else {
        if (elements.viewLogin) {
          elements.viewLogin.classList.add('hidden');
          elements.viewLogin.style.display = 'none';
        }
        if (elements.viewPublic) {
          elements.viewPublic.classList.remove('hidden');
          elements.viewPublic.style.display = 'flex';
        }
        // Volta pro conteúdo de marketing por padrão — quem quiser reabrir a
        // página legal chama openLegalDocPage() depois do switchView('public').
        const landingSections = document.getElementById('public-landing-sections');
        const legalPage = document.getElementById('legal-doc-page');
        if (landingSections) landingSections.classList.remove('hidden');
        if (legalPage) legalPage.classList.add('hidden');
      }
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // =========================================================================
  // PÁGINA LEGAL (Termos de Uso / Política de Privacidade)
  //
  // Abre dentro do shell que já está na tela — header/rail do dashboard ou
  // header da home continuam visíveis, só o conteúdo do meio troca — em vez
  // de mandar a pessoa pra um documento isolado. Texto lido de
  // documentos_legais, a mesma tabela que o Admin escreve em CMS → Legal.
  // =========================================================================
  async function openLegalDocPage(slug, opts = {}) {
    const isDashboard = state.currentView === 'dashboard';

    if (isDashboard) {
      state.currentTab = 'legal-doc';
      elements.railIconBtns.forEach(btn => btn.classList.remove('active'));
      // Mesmo encaixe das outras páginas do painel: barra de título colada
      // no header e no rail (ver body.page-mode em styles.css).
      document.body.classList.remove('editor-split-mode', 'organizadores-sem-previa', 'rsvp-mode', 'b2b-mode', 'b2b-chat-mode', 'gifts-mode', 'wallet-mode');
      document.body.classList.add('page-mode');
      if (elements.subDrawer) elements.subDrawer.classList.add('hidden-drawer');
      if (elements.mainArea) elements.mainArea.classList.add('full-width');
      document.querySelectorAll('.dashboard-tab-content').forEach(content => {
        content.classList.toggle('active', content.id === 'tab-legal-doc');
      });
    } else {
      if (state.currentView !== 'public') switchView('public');
      const landingSections = document.getElementById('public-landing-sections');
      const legalPage = document.getElementById('legal-doc-page');
      if (landingSections) landingSections.classList.add('hidden');
      if (legalPage) legalPage.classList.remove('hidden');
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });

    const suffix = isDashboard ? '-dash' : '';
    const loadingEl = document.getElementById(`legal-doc-loading${suffix}`);
    const titleEl = document.getElementById(`legal-doc-title${suffix}`);
    const dateEl = document.getElementById(`legal-doc-date${suffix}`);
    const bodyEl = document.getElementById(`legal-doc-body${suffix}`);

    const tituloProvisorio = slug === 'termos' ? 'Termos de Uso' : 'Política de Privacidade';
    if (loadingEl) loadingEl.classList.remove('hidden');
    if (titleEl) titleEl.textContent = tituloProvisorio;
    if (dateEl) dateEl.textContent = '';
    if (bodyEl) bodyEl.innerHTML = '';
    document.title = `${tituloProvisorio} — Love`;

    const path = slug === 'termos' ? '/termos' : '/privacidade';
    if (opts.pushUrl !== false && window.location.pathname !== path) {
      history.pushState({ legalDoc: slug }, '', path);
    }

    const { data, error } = await supabaseClient
      .from('documentos_legais')
      .select('*')
      .eq('slug', slug)
      .maybeSingle();

    if (loadingEl) loadingEl.classList.add('hidden');

    if (error || !data) {
      if (bodyEl) bodyEl.innerHTML = '<p class="text-zinc-500">Não foi possível carregar este documento no momento. Tente novamente em instantes.</p>';
      return;
    }

    if (titleEl) titleEl.textContent = data.titulo || tituloProvisorio;
    document.title = `${data.titulo || tituloProvisorio} — Love`;

    const dataReferencia = data.vigente_desde || data.updated_at;
    if (dateEl && dataReferencia) {
      dateEl.textContent = `Última atualização: ${formatarDataLegal(dataReferencia)}`;
    }
    if (bodyEl) {
      bodyEl.innerHTML = (data.conteudo && data.conteudo.trim())
        ? data.conteudo
        : '<p class="text-zinc-500">Este documento ainda não foi publicado.</p>';
    }
  }

  function formatarDataLegal(valor) {
    const meses = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
    const texto = String(valor);
    const d = new Date(texto.length <= 10 ? `${texto}T00:00:00` : texto);
    if (isNaN(d.getTime())) return '';
    return `${d.getDate()} de ${meses[d.getMonth()]} de ${d.getFullYear()}`;
  }

  // =========================================================================
  // PÁGINA DE NOTIFICAÇÕES (/notificacoes) — página própria no lugar do
  // dropdown do sino, mesmo padrão de cabeçalho/tamanhos de Meus Presentes,
  // sem sub-sidebar expandida (mesmo esquema de switchRailTab('overview')).
  //
  // Mistura dois tipos de notificação:
  //  - "admin": enviadas pelo Admin (tabela `notificacoes`, Assunto/Texto
  //    = titulo/mensagem), com leitura rastreada em `notificacao_leituras`.
  //  - "gift": geradas a partir dos presentes recebidos de verdade
  //    (activeEvent.receivedGifts) — sem tabela própria, sempre "lidas".
  // =========================================================================
  const NOTIFICATION_ICONS = {
    // Mesmo sino do header.
    admin: 'M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9',
    // Mesmo ícone do rail "Presentes".
    gift: 'M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7'
  };

  // Tema escolhido no Admin (coluna notificacoes.tema): ícone e cor da
  // caixinha. "padrao" é o sino no cinza de sempre; tema desconhecido cai nele.
  const NOTIFICATION_THEMES = {
    padrao: { icon: NOTIFICATION_ICONS.admin, box: 'bg-zinc-100 text-zinc-600' },
    // Mesmo avião de "Viagens" em Mais Recursos.
    viagens: { icon: 'M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z', box: 'bg-orange-50 text-orange-600' },
    beneficios: { icon: 'M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z', box: 'bg-green-50 text-green-700' },
    novidades: { icon: 'M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z', box: 'bg-[#EBF4FF] text-[#183b54]' },
    aviso: { icon: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z', box: 'bg-yellow-50 text-yellow-700' }
  };

  let notificationsFeedCache = [];

  function escapeNotificationText(s) {
    return (s || '').replace(/</g, '&lt;');
  }

  async function fetchAdminNotifications() {
    const { data, error } = await supabaseClient
      .from('notificacoes')
      .select('*')
      .order('fixada', { ascending: false })
      .order('created_at', { ascending: false });
    if (error) { console.error('Erro ao carregar notificações:', error); return []; }
    return data || [];
  }

  async function fetchReadNotificationIds(userId) {
    const { data, error } = await supabaseClient
      .from('notificacao_leituras')
      .select('notificacao_id')
      .eq('user_id', userId);
    if (error) return new Set();
    return new Set((data || []).map(r => r.notificacao_id));
  }

  async function markNotificationRead(notificacaoId) {
    const userId = window.loveClienteSession?.user?.id;
    if (!userId) return;
    await supabaseClient
      .from('notificacao_leituras')
      .upsert({ notificacao_id: notificacaoId, user_id: userId }, { onConflict: 'notificacao_id,user_id', ignoreDuplicates: true });
  }

  async function markAllNotificationsRead() {
    const userId = window.loveClienteSession?.user?.id;
    const unreadIds = notificationsFeedCache.filter(n => n.kind === 'admin' && n.unread).map(n => n.id);
    if (!userId || !unreadIds.length) return;
    const rows = unreadIds.map(id => ({ notificacao_id: id, user_id: userId }));
    const { error } = await supabaseClient
      .from('notificacao_leituras')
      .upsert(rows, { onConflict: 'notificacao_id,user_id', ignoreDuplicates: true });
    if (error) { console.error('Erro ao marcar notificações como lidas:', error); return; }
    await loadNotificationsFeed();
  }

  // Presentes recebidos de verdade (activeEvent.receivedGifts) viram
  // notificação: "Fulano comprou Tal Presente, pelo valor de R$X. O saldo
  // já está na sua conta."
  function buildGiftNotifications() {
    const activeEvent = getActiveEvent();
    const gifts = (activeEvent && activeEvent.receivedGifts) || [];
    return gifts.map(g => ({
      kind: 'gift',
      id: `gift-${g.id}`,
      iconPath: NOTIFICATION_ICONS.gift,
      titleHtml: '',
      bodyHtml: `<strong class="text-zinc-900 font-bold">${escapeNotificationText(g.guestName)}</strong> comprou <strong class="text-zinc-900 font-bold">${escapeNotificationText(g.giftTitle)}</strong>, pelo valor de R$ ${Number(g.amount || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}. O saldo já está na sua conta.`,
      time: g.date || '',
      unread: false,
      onClick: () => switchRailTab('gifts')
    }));
  }

  async function loadNotificationsFeed() {
    const userId = window.loveClienteSession?.user?.id;
    const adminRows = await fetchAdminNotifications();
    const readIds = userId ? await fetchReadNotificationIds(userId) : new Set();

    const adminItems = adminRows.map(n => {
      const theme = NOTIFICATION_THEMES[n.tema] || NOTIFICATION_THEMES.padrao;
      const item = {
        kind: 'admin',
        id: n.id,
        iconPath: theme.icon,
        iconBox: theme.box,
        titleHtml: escapeNotificationText(n.titulo),
        bodyHtml: escapeNotificationText(n.mensagem),
        time: n.created_at ? formatCommentDate(n.created_at) : '',
        unread: !readIds.has(n.id),
        linkUrl: n.link_url || null
      };
      item.onClick = () => {
        if (!item.linkUrl) return;
        if (/^https?:\/\//i.test(item.linkUrl)) { window.open(item.linkUrl, '_blank'); return; }
        const tab = RAIL_ROUTE_TO_TAB[item.linkUrl];
        if (tab) switchRailTab(tab);
      };
      return item;
    });

    notificationsFeedCache = [...adminItems, ...buildGiftNotifications()];
    renderNotificationsPage();
    updateNotificationsBadge();
  }

  function updateNotificationsBadge() {
    const badge = document.querySelector('.badge-header-notifications');
    if (!badge) return;
    const unreadCount = notificationsFeedCache.filter(n => n.kind === 'admin' && n.unread).length;
    badge.textContent = String(unreadCount);
    badge.classList.toggle('hidden', unreadCount === 0);
  }

  function renderNotificationsPage() {
    const listEl = document.getElementById('notifications-list-container');
    if (!listEl) return;

    if (!notificationsFeedCache.length) {
      listEl.innerHTML = '<div class="py-16 text-center text-sm text-zinc-400 font-sans">Nenhuma notificação por enquanto.</div>';
      return;
    }

    listEl.innerHTML = notificationsFeedCache.map((n, i) => `
      <div class="notification-row py-4 flex items-start gap-3.5 cursor-pointer transition-colors -mx-2 px-2 rounded-xl ${n.unread ? 'bg-[#EBF4FF] hover:bg-[#DCEBFF]' : 'bg-zinc-50/80 hover:bg-zinc-100'}" data-index="${i}">
        <div class="w-10 h-10 rounded-xl ${n.iconBox || 'bg-zinc-100 text-zinc-600'} flex items-center justify-center flex-shrink-0">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="${n.iconPath}"/></svg>
        </div>
        <div class="flex-1 min-w-0 flex items-start justify-between gap-3">
          <div class="min-w-0">
            ${n.titleHtml ? `<p class="text-sm font-bold text-zinc-900 font-sans">${n.titleHtml}</p>` : ''}
            <p class="text-sm ${n.titleHtml ? 'text-zinc-600 mt-0.5' : 'text-zinc-800'} leading-snug font-sans">${n.bodyHtml}</p>
          </div>
          <div class="flex items-center gap-1.5 flex-shrink-0 pt-0.5">
            ${n.unread ? '<span class="w-1.5 h-1.5 rounded-full bg-[#537bae]"></span>' : ''}
            <span class="text-xs text-zinc-400 whitespace-nowrap font-sans">${n.time}</span>
          </div>
        </div>
      </div>
    `).join('');

    listEl.querySelectorAll('.notification-row').forEach(row => {
      const n = notificationsFeedCache[parseInt(row.dataset.index, 10)];
      if (!n) return;
      row.addEventListener('click', () => {
        if (n.kind === 'admin' && n.unread) {
          n.unread = false;
          markNotificationRead(n.id);
          updateNotificationsBadge();
          renderNotificationsPage();
        }
        if (typeof n.onClick === 'function') n.onClick();
      });
    });
  }

  function openNotificationsPage(opts = {}) {
    fecharTodosOsDrawers();
    state.currentTab = 'notifications';
    elements.railIconBtns.forEach(btn => btn.classList.remove('active'));
    // Mesmo encaixe das outras páginas do painel: barra de título colada
    // no header e no rail (ver body.page-mode em styles.css).
    document.body.classList.remove('editor-split-mode', 'organizadores-sem-previa', 'rsvp-mode', 'b2b-mode', 'b2b-chat-mode', 'gifts-mode', 'wallet-mode');
    document.body.classList.add('page-mode');
    if (elements.subDrawer) elements.subDrawer.classList.add('hidden-drawer');
    if (elements.mainArea) elements.mainArea.classList.add('full-width');
    document.querySelectorAll('.dashboard-tab-content').forEach(content => {
      content.classList.toggle('active', content.id === 'tab-notifications');
    });

    if (opts.pushUrl !== false && window.location.pathname !== '/notificacoes') {
      history.pushState({ notifications: true }, '', '/notificacoes');
    }
    document.title = 'Notificações — Love';

    loadNotificationsFeed();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }


  // ------------------------------------------------------------------
  // PÁGINAS DO MENU DA CONTA: Dúvidas (/central-de-ajuda) e Configurações
  // (/configuracoes). Mesmo encaixe da página de notificações: sem aba
  // no rail, barra de título colada no header (body.page-mode).
  // ------------------------------------------------------------------
  function abrirPaginaDaConta(tabId, path, titulo, opts = {}) {
    fecharTodosOsDrawers();
    state.currentTab = tabId;
    elements.railIconBtns.forEach(btn => btn.classList.remove('active'));
    document.body.classList.remove('editor-split-mode', 'organizadores-sem-previa', 'rsvp-mode', 'b2b-mode', 'b2b-chat-mode', 'gifts-mode', 'wallet-mode');
    document.body.classList.add('page-mode');
    if (elements.subDrawer) elements.subDrawer.classList.add('hidden-drawer');
    if (elements.mainArea) elements.mainArea.classList.add('full-width');
    document.querySelectorAll('.dashboard-tab-content').forEach(content => {
      content.classList.toggle('active', content.id === tabId);
    });
    if (opts.pushUrl !== false && window.location.pathname !== path) {
      history.pushState({ paginaConta: tabId }, '', path);
    }
    document.title = `${titulo} — Love`;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function openFaqPage(opts = {}) {
    abrirPaginaDaConta('tab-faq', '/central-de-ajuda', 'Central de ajuda', opts);
    // Central de ajuda usa o submenu lateral, como os outros menus: título
    // "Central de ajuda" e as categorias como itens.
    if (elements.subDrawer) elements.subDrawer.classList.remove('hidden-drawer');
    if (elements.mainArea) elements.mainArea.classList.remove('full-width');
    if (elements.drawerTitle) elements.drawerTitle.textContent = 'Central de ajuda';
    if (elements.drawerActionBtn && elements.drawerActionBtn.parentElement) elements.drawerActionBtn.parentElement.classList.add('hidden');
    if (elements.drawerSubItemsList) elements.drawerSubItemsList.innerHTML = '';
    loadFaqPage();
  }

  /**
   * Páginas da conta com o submenu lateral dos outros menus (título + itens),
   * ex.: Configurações (Minha conta / Meus eventos).
   * @param {string} titulo
   * @param {{ id: string, rotulo: string }[]} itens
   * @param {string} ativo
   * @param {(id: string) => void} aoEscolher
   */
  function abrirSubmenuDaPagina(titulo, itens, ativo, aoEscolher) {
    if (elements.subDrawer) elements.subDrawer.classList.remove('hidden-drawer');
    if (elements.mainArea) elements.mainArea.classList.remove('full-width');
    if (elements.drawerTitle) elements.drawerTitle.textContent = titulo;
    if (elements.drawerActionBtn && elements.drawerActionBtn.parentElement) elements.drawerActionBtn.parentElement.classList.add('hidden');
    const lista = elements.drawerSubItemsList;
    if (!lista) return;
    lista.innerHTML = '';
    itens.forEach(({ id, rotulo }) => {
      const item = document.createElement('div');
      item.className = `sub-drawer-item${id === ativo ? ' active' : ''}`;
      item.dataset.paginaItem = id;
      const span = document.createElement('span');
      span.textContent = rotulo;
      item.appendChild(span);
      item.addEventListener('click', () => {
        lista.querySelectorAll('.sub-drawer-item').forEach(b => b.classList.toggle('active', b === item));
        aoEscolher(id);
      });
      lista.appendChild(item);
    });
  }

  function openAccountSettingsPage(opts = {}) {
    abrirPaginaDaConta('tab-account-settings', '/configuracoes', 'Configurações', opts);
    const abaInicial = opts.aba || 'conta';
    abrirSubmenuDaPagina('Configurações', [
      { id: 'conta', rotulo: 'Minha conta' },
      { id: 'eventos', rotulo: 'Meus eventos' }
    ], abaInicial, mostrarAbaDeConfiguracoes);
    mostrarAbaDeConfiguracoes(abaInicial);
    preencherConfiguracoesDaConta();
  }

  // Preenche nome/sobrenome/e-mail e zera senha, 2FA e a caixa de excluir.
  function preencherConfiguracoesDaConta() {
    const firstNameInput = document.getElementById('settings-user-first-name');
    const lastNameInput = document.getElementById('settings-user-last-name');
    const emailInput = document.getElementById('settings-user-email');
    const profile = window.loveClienteProfile || {};
    // Antes da migration 034 só existia couple_name: divide na hora.
    const legacyParts = (profile.couple_name || '').trim().split(/\s+/);
    const first = profile.first_name ?? legacyParts[0] ?? '';
    const last = profile.first_name ? (profile.last_name || '') : legacyParts.slice(1).join(' ');
    if (firstNameInput) firstNameInput.value = first;
    if (lastNameInput) lastNameInput.value = last;
    if (emailInput) emailInput.value = window.loveClienteSession?.user?.email || '';
    document.getElementById('settings-form-error')?.classList.add('hidden');
    document.getElementById('settings-form-ok')?.classList.add('hidden');
    document.getElementById('settings-delete-box')?.classList.add('hidden');
    const confirmInput = document.getElementById('settings-delete-confirm-input');
    if (confirmInput) confirmInput.value = '';
    resetSettingsSecurity();
    refreshMfaStatus();
    desenharFotoDaConta();
    atualizarCartaoDeLogin();
  }

  // Login com o Google: mostra a conta conectada (e quando) no lugar da troca
  // de senha — quem entrou pelo Google não criou senha. Quem tem e-mail e
  // senha continua vendo "Senha".
  async function atualizarCartaoDeLogin() {
    const cartao = document.getElementById('settings-login-card');
    const cartaoSenha = document.getElementById('settings-password-card');
    if (!cartao || !cartaoSenha) return;
    let usuario = window.loveClienteSession?.user || null;
    try {
      const { data } = await supabaseClient.auth.getUser();
      if (data && data.user) usuario = data.user;
    } catch (e) { /* segue com a sessão já carregada */ }
    const identidades = (usuario && usuario.identities) || [];
    const provedores = (usuario && usuario.app_metadata && usuario.app_metadata.providers) || [];
    const google = identidades.find(i => i.provider === 'google') || null;
    const comGoogle = !!google || provedores.includes('google');
    const comSenha = identidades.some(i => i.provider === 'email') || provedores.includes('email');
    cartao.classList.toggle('hidden', !comGoogle);
    cartaoSenha.classList.toggle('hidden', comGoogle && !comSenha);
    if (!comGoogle) return;
    const email = (google && google.identity_data && google.identity_data.email) || (usuario && usuario.email) || '';
    const desde = (google && (google.created_at || google.last_sign_in_at)) || (usuario && usuario.created_at) || '';
    const emailEl = document.getElementById('settings-login-email');
    const dataEl = document.getElementById('settings-login-data');
    if (emailEl) emailEl.textContent = email;
    if (dataEl) dataEl.textContent = desde
      ? 'Conectado em ' + new Date(desde).toLocaleDateString('pt-BR', { day: 'numeric', month: 'short', year: 'numeric' })
      : 'Conectado';
  }

  // ---- Foto de perfil (Configurações › Minha conta) ----
  // Mesmo modelo do Hub: caixa vazia só com o "+"; com foto, um lápis no
  // canto para trocar. A foto é recortada no centro (400 × 400), sobe para o
  // bucket clientes (avatar/<id>/…, migration 065) e vira clientes.avatar_url
  // — a mesma do cabeçalho, do menu do perfil e do chat.
  const ICONE_MAIS_FOTO = '<span class="conta-avatar-mais" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15"/></svg></span>';
  const ICONE_LAPIS_FOTO = '<span class="conta-avatar-lapis" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M16.86 4.49a2.1 2.1 0 0 1 2.97 2.97L8.5 18.79 4 20l1.21-4.5L16.86 4.49Z"/><path d="M14.5 6.85l2.65 2.65"/></svg></span>';

  function desenharFotoDaConta() {
    const caixa = document.getElementById('conta-avatar-picker');
    const conteudo = document.getElementById('conta-avatar-conteudo');
    if (!caixa || !conteudo) return;
    const foto = window.loveClienteProfile && window.loveClienteProfile.avatar_url;
    caixa.classList.toggle('tem-foto', !!foto);
    caixa.title = foto ? 'Alterar foto' : 'Adicionar foto';
    conteudo.innerHTML = foto ? `<img src="${escaparHtml(foto)}" alt="">${ICONE_LAPIS_FOTO}` : ICONE_MAIS_FOTO;
  }

  /** Recorta a imagem no centro, em JPEG 400 × 400.
   * @param {File} arquivo @returns {Promise<Blob>} */
  function fotoQuadrada(arquivo) {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(arquivo);
      const img = new Image();
      img.onload = () => {
        const N = 400;
        const lado = Math.min(img.naturalWidth, img.naturalHeight);
        const canvas = document.createElement('canvas');
        canvas.width = N; canvas.height = N;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#fff';
        ctx.fillRect(0, 0, N, N);
        ctx.drawImage(img, (img.naturalWidth - lado) / 2, (img.naturalHeight - lado) / 2, lado, lado, 0, 0, N, N);
        URL.revokeObjectURL(url);
        canvas.toBlob(b => (b ? resolve(b) : reject(new Error('sem imagem'))), 'image/jpeg', 0.9);
      };
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('imagem inválida')); };
      img.src = url;
    });
  }

  document.getElementById('conta-avatar-input')?.addEventListener('change', async (e) => {
    const input = /** @type {HTMLInputElement} */ (e.target);
    const arquivo = input.files && input.files[0];
    input.value = '';
    const status = document.getElementById('conta-avatar-status');
    const avisar = (texto, erro) => {
      if (!status) return;
      status.textContent = texto;
      status.classList.toggle('hidden', !texto);
      status.classList.toggle('is-erro', !!erro);
    };
    const session = window.loveClienteSession;
    if (!arquivo || !session) return;
    if (!/^image\//.test(arquivo.type)) { avisar('Escolha um arquivo de imagem.', true); return; }
    const caixa = document.getElementById('conta-avatar-picker');
    caixa?.classList.add('is-enviando');
    avisar('Enviando foto…');
    try {
      const blob = await fotoQuadrada(arquivo);
      const caminho = `avatar/${session.user.id}/${Date.now()}.jpg`;
      const { error: upErr } = await supabaseClient.storage.from('clientes')
        .upload(caminho, blob, { cacheControl: '31536000', contentType: 'image/jpeg' });
      if (upErr) throw upErr;
      const url = supabaseClient.storage.from('clientes').getPublicUrl(caminho).data.publicUrl;
      const { error } = await supabaseClient.from('clientes').update({ avatar_url: url }).eq('id', session.user.id);
      if (error) throw error;
      if (window.loveClienteProfile) window.loveClienteProfile.avatar_url = url;
      desenharFotoDaConta();
      atualizarAvatarDoCabecalho();
      avisar('Foto atualizada.');
      setTimeout(() => avisar(''), 3000);
    } catch (err) {
      console.error('Foto de perfil:', err);
      avisar('Não foi possível enviar a foto. Tente de novo.', true);
    } finally {
      caixa?.classList.remove('is-enviando');
    }
  });

  // ---- Dúvidas (FAQ) ----
  // Ordem fixa das categorias pedidas; outras criadas no Admin vêm depois, em
  // ordem alfabética.
  const FAQ_CATEGORIAS_ORDEM = ['Fornecedores', 'Carteira digital', 'Lista de convidados', 'Meus presentes', 'Editar meu site', 'Convite digital', 'Benefícios', 'Serviços'];

  // Usada só quando a tabela `faq` não existe ou está vazia.
  const FAQ_PADRAO = [
    { categoria: 'Convidados', pergunta: 'Como os convidados confirmam presença?', resposta: 'Pelo link do seu site: o convidado clica em "Confirmar presença", informa quem vai com ele e pode deixar um recado. A confirmação aparece na hora em Meus Convidados.' },
    { categoria: 'Convidados', pergunta: 'Posso adicionar acompanhantes a um convidado?', resposta: 'Sim. Ao criar ou editar um convidado, informe os acompanhantes. Eles contam na lista, no mapa de mesas e nos números da Home.' },
    { categoria: 'Presentes', pergunta: 'Como funciona o resgate dos presentes em dinheiro?', resposta: 'Tudo que os convidados presenteiam entra como saldo disponível na sua Carteira. Você pede o saque quando quiser, pela chave Pix ou conta cadastrada em Dados de saque.' },
    { categoria: 'Presentes', pergunta: 'Posso duplicar um presente?', resposta: 'Sim. Em Meus Presentes, abra o presente e use "Duplicar": uma cópia é criada e você só ajusta o que mudar.' },
    { categoria: 'Convite digital', pergunta: 'Como mudar as cores e o visual do meu site?', resposta: 'Em Personalizar, na aba Aparência, escolha um modelo pronto ou ajuste cores, fontes e foto de capa com a prévia ao vivo.' },
    { categoria: 'Convite digital', pergunta: 'Dá para colocar música no site?', resposta: 'Sim. Em Personalizar, informe o link da música e, se quiser, marque para tocar automaticamente quando o convidado abrir o site.' },
    { categoria: 'Fornecedores', pergunta: 'Como contratar um fornecedor pela Love?', resposta: 'Em Fornecedores, encontre quem você procura, abra o perfil e use "Contratar" ou peça um orçamento. Os contratados ficam reunidos em Contratados.' },
    { categoria: 'Fornecedores', pergunta: 'Como falo com um fornecedor?', resposta: 'Pelo chat da plataforma: clique em "Chat" no card ou no perfil do fornecedor. As conversas ficam em Fornecedores › Mensagens.' },
    { categoria: 'Financeiro', pergunta: 'Como faço o saque do meu saldo?', resposta: 'Na Carteira, cadastre seus dados de saque (chave Pix ou conta para TED) e peça o saque do saldo disponível.' },
    { categoria: 'Financeiro', pergunta: 'Onde vejo quanto já arrecadei?', resposta: 'Na Carteira aparecem o saldo disponível e o total arrecadado com os presentes do seu evento.' },
    { categoria: 'Benefícios e serviços', pergunta: 'O que são os Benefícios e Serviços da Love?', resposta: 'São vantagens e serviços de parceiros, como seguros, com condições especiais para quem organiza o evento pela Love. Eles ficam na Home e em Fornecedores › Benefícios Love.' },
    { categoria: 'Benefícios e serviços', pergunta: 'Como contrato um benefício?', resposta: 'Abra o benefício que interessa e siga o botão de contratação: você é levado ao parceiro responsável, que conclui a contratação.' }
  ];

  let faqItensCache = null;
  let faqCategoriaAtiva = null;
  // Categoria pedida por um link "Saiba mais" (trecho do nome, ex.: "present").
  /** @type {string|null} */
  let faqCategoriaPedida = null;

  async function loadFaqPage() {
    const cont = document.getElementById('faq-page-container');
    if (!cont) return;
    if (faqItensCache) renderFaqPage(faqItensCache);
    else cont.innerHTML = '<p class="text-sm text-zinc-400">Carregando…</p>';

    let itens = [];
    try {
      const { data, error } = await supabaseClient
        .from('faq')
        .select('id, categoria, pergunta, resposta, ordem')
        .eq('plataforma', 'cliente')
        .eq('ativo', true)
        .order('ordem', { ascending: true })
        .order('created_at', { ascending: true });
      if (!error && Array.isArray(data)) itens = data;
    } catch (e) { /* sem tabela ainda: usa a lista padrão */ }
    faqItensCache = itens.length ? itens : FAQ_PADRAO;
    renderFaqPage(faqItensCache);
  }

  // A resposta vem do Admin: HTML (negrito, listas, link, vídeo em <iframe>)
  // ou texto puro das perguntas antigas. Só o texto puro precisa de escape.
  function faqRespostaHtml(resposta) {
    const r = String(resposta || '');
    return /<[a-z][\s\S]*>/i.test(r) ? r : escaparHtml(r).replace(/\r?\n/g, '<br>');
  }

  // ---- Benefícios & Serviços (home) e Benefícios Love ----
  // Os cards vêm de servicos_beneficios, editados no Admin em Anfitriões →
  // Serviços. Se a consulta falhar, o HTML fixo da página continua no lugar.
  const TAG_ICONE = '<svg class="w-3.5 h-3.5 text-sky-400 flex-shrink-0" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M9.568 3H5.25A2.25 2.25 0 0 0 3 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 0 0 5.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 0 0 9.568 3Z"/><circle cx="7" cy="7" r="1.2" fill="currentColor"/></svg>';

  function precoBeneficio(s) {
    const valor = Number(s.preco) || 0;
    return 'R$ ' + valor.toLocaleString('pt-BR', { minimumFractionDigits: valor % 1 ? 2 : 0, maximumFractionDigits: 2 });
  }

  async function carregarBeneficiosDoAdmin() {
    const home = document.getElementById('home-beneficios-grid');
    const love = document.getElementById('beneficios-love-grupos');
    if (!home && !love) return;

    let itens = [];
    try {
      const { data, error } = await supabaseClient
        .from('servicos_beneficios')
        .select('id, tipo, nome, parceiro, titulo, descricao, imagem_url, link_url, desconto_texto, cupom, grupo, preco, preco_tipo, preco_sufixo, posicao')
        .eq('ativo', true)
        .order('posicao', { ascending: true });
      if (error || !Array.isArray(data)) return;
      itens = data;
    } catch (e) { return; }

    const descontos = itens.filter(i => i.tipo === 'desconto');
    const servicos = itens.filter(i => i.tipo !== 'desconto');

    if (home && descontos.length) {
      home.innerHTML = descontos.map(s => `
        <div class="bg-white rounded-[var(--radius-card,10px)] border border-zinc-200/80 overflow-hidden shadow-2xs hover:shadow-md hover:border-zinc-300 transition-all flex flex-col justify-between cursor-pointer group" data-beneficio="${escaparHtml(s.id)}">
          <div class="h-36 sm:h-40 flex items-center justify-center p-6 bg-white group-hover:scale-105 transition-transform duration-300">
            ${s.imagem_url
              ? `<img src="${escaparHtml(s.imagem_url)}" alt="${escaparHtml(s.nome || '')}" class="max-h-full max-w-full object-contain">`
              : `<span class="text-2xl sm:text-[26px] font-black tracking-tight text-zinc-900 font-sans text-center" style="letter-spacing:-0.03em">${escaparHtml(s.nome || '')}</span>`}
          </div>
          <div class="px-4 py-3.5 border-t border-[#EAEAEA] bg-[#FAFAFA] flex flex-col gap-0.5">
            <span class="text-xs text-zinc-500 font-sans font-medium">${escaparHtml(s.nome || '')}</span>
            <div class="flex items-center gap-1.5 mt-0.5">
              <span class="text-xs sm:text-sm font-bold text-zinc-900 font-sans">${escaparHtml(s.desconto_texto || '')}</span>
              ${TAG_ICONE}
            </div>
          </div>
        </div>`).join('');

      home.querySelectorAll('[data-beneficio]').forEach(card => {
        const s = descontos.find(i => i.id === card.dataset.beneficio);
        if (!s) return;
        card.addEventListener('click', async () => {
          if (s.cupom) {
            try { await navigator.clipboard.writeText(s.cupom); } catch (e) { /* sem permissão: só avisa */ }
            showToast(s.descricao ? `Cupom ${s.cupom} copiado! ${s.descricao}` : `Cupom ${s.cupom} copiado!`, '🏷️');
            return;
          }
          if (s.link_url) window.open(s.link_url, '_blank', 'noopener');
        });
      });
    }

    if (love && servicos.length) {
      // Categorias (coluna "grupo" no Admin): Seguros, Mídia e entretenimento…
      // Sem grupo, entra em Seguros.
      const grupoDe = s => (s.grupo || '').trim() || 'Seguros';
      const grupos = [];
      servicos.forEach(s => { const g = grupoDe(s); if (!grupos.includes(g)) grupos.push(g); });

      love.innerHTML = grupos.map(g => `
        <div class="space-y-4" data-beneficios-grupo>
          <div class="flex items-center justify-between gap-3">
            <h3 class="text-sm sm:text-base font-semibold text-zinc-800 tracking-tight">${escaparHtml(g)}</h3>
            <div class="beneficios-setas">
              <button type="button" class="beneficios-seta" data-seta="-1" aria-label="Anteriores" title="Anteriores"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7"/></svg></button>
              <button type="button" class="beneficios-seta" data-seta="1" aria-label="Próximos" title="Próximos"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7"/></svg></button>
            </div>
          </div>
          <div class="beneficios-carrossel" data-carrossel>
            ${servicos.filter(s => grupoDe(s) === g).map(s => `
              <div class="beneficios-card bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all flex flex-col justify-between group cursor-pointer border border-transparent" data-servico="${escaparHtml(s.id)}">
                <div>
                  <div class="relative h-48 w-full overflow-hidden bg-zinc-100">
                    ${s.imagem_url ? `<img src="${escaparHtml(s.imagem_url)}" alt="" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500">` : ''}
                    <div class="absolute bottom-3 left-4 text-white font-bold text-base tracking-tight drop-shadow-md">${escaparHtml(s.parceiro || s.nome || '')}</div>
                  </div>
                  <div class="p-5 space-y-2">
                    <h4 class="font-semibold text-zinc-900 text-base">${escaparHtml(s.titulo || s.nome || '')}</h4>
                    ${s.descricao ? `<p class="text-xs text-zinc-500 leading-relaxed">${escaparHtml(s.descricao)}</p>` : ''}
                  </div>
                </div>
                ${Number(s.preco) > 0 ? `
                  <div class="p-5 pt-0">
                    ${s.preco_tipo === 'fixo' ? '' : '<span class="text-[11px] text-zinc-400 block font-normal">A partir de</span>'}
                    <span class="text-base sm:text-lg font-bold text-[#537bae]">${precoBeneficio(s)}${s.preco_sufixo ? ` <span class="text-xs font-normal text-zinc-500">${escaparHtml(s.preco_sufixo)}</span>` : ''}</span>
                  </div>` : ''}
              </div>`).join('')}
          </div>
        </div>`).join('');

      love.querySelectorAll('[data-servico]').forEach(card => {
        const s = servicos.find(i => i.id === card.dataset.servico);
        if (s && s.link_url) card.addEventListener('click', () => window.open(s.link_url, '_blank', 'noopener'));
      });

      // Setas: rolam uma "página" (3 cards no desktop); somem quando tudo
      // cabe na tela e desligam nas pontas.
      love.querySelectorAll('[data-beneficios-grupo]').forEach(grupo => {
        const trilho = grupo.querySelector('[data-carrossel]');
        const setas = grupo.querySelector('.beneficios-setas');
        const ant = grupo.querySelector('[data-seta="-1"]');
        const prox = grupo.querySelector('[data-seta="1"]');
        if (!trilho || !setas) return;
        const atualizar = () => {
          const cabe = trilho.scrollWidth <= trilho.clientWidth + 2;
          setas.classList.toggle('hidden', cabe);
          if (ant) ant.disabled = trilho.scrollLeft <= 2;
          if (prox) prox.disabled = trilho.scrollLeft + trilho.clientWidth >= trilho.scrollWidth - 2;
        };
        grupo.querySelectorAll('[data-seta]').forEach(btn => {
          btn.addEventListener('click', () => {
            trilho.scrollBy({ left: Number(btn.dataset.seta) * trilho.clientWidth, behavior: 'smooth' });
          });
        });
        trilho.addEventListener('scroll', atualizar, { passive: true });
        window.addEventListener('resize', atualizar);
        atualizar();
        setTimeout(atualizar, 300);
      });
    }
  }

  document.addEventListener('DOMContentLoaded', carregarBeneficiosDoAdmin);

  function renderFaqPage(itens) {
    const cont = document.getElementById('faq-page-container');
    if (!cont) return;
    const grupos = new Map();
    itens.forEach(item => {
      const cat = (item.categoria || 'Outras dúvidas').trim();
      if (!grupos.has(cat)) grupos.set(cat, []);
      grupos.get(cat).push(item);
    });
    const posicao = cat => {
      const i = FAQ_CATEGORIAS_ORDEM.findIndex(c => c.toLowerCase() === cat.toLowerCase());
      return i === -1 ? FAQ_CATEGORIAS_ORDEM.length : i;
    };
    const categorias = [...grupos.keys()].sort((a, b) => posicao(a) - posicao(b) || a.localeCompare(b, 'pt-BR'));

    if (!categorias.length) {
      cont.innerHTML = '<p class="text-sm text-zinc-400">Nenhuma dúvida cadastrada ainda.</p>';
      return;
    }

    if (faqCategoriaPedida) {
      const pedida = faqCategoriaPedida.toLowerCase();
      const achou = categorias.find(c => c.toLowerCase().includes(pedida));
      if (achou) faqCategoriaAtiva = achou;
      faqCategoriaPedida = null;
    }
    // Primeira categoria fica selecionada; mantém a escolhida ao recarregar.
    if (!faqCategoriaAtiva || !grupos.has(faqCategoriaAtiva)) faqCategoriaAtiva = categorias[0];

    const seta = '<svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5"/></svg>';
    cont.innerHTML = `
      <nav class="faq-categorias" aria-label="Categorias">
        ${categorias.map(cat => `
          <button type="button" class="faq-categoria-btn${cat === faqCategoriaAtiva ? ' ativa' : ''}" data-categoria="${escaparHtml(cat)}">${escaparHtml(cat)}</button>`).join('')}
      </nav>
      <div class="faq-conteudo">
        <h3 class="faq-categoria-titulo">${escaparHtml(faqCategoriaAtiva)}</h3>
        <div class="faq-lista">
          ${grupos.get(faqCategoriaAtiva).map(item => `
            <div class="faq-item">
              <button type="button" class="faq-pergunta" aria-expanded="false">
                <span>${escaparHtml(item.pergunta || '')}</span>
                ${seta}
              </button>
              <div class="faq-resposta">${faqRespostaHtml(item.resposta)}</div>
            </div>`).join('')}
        </div>
      </div>`;

    cont.querySelectorAll('.faq-categoria-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        faqCategoriaAtiva = btn.dataset.categoria;
        renderFaqPage(itens);
      });
    });

    // Submenu lateral (desktop): as mesmas categorias, no formato dos outros menus.
    if (state.currentTab === 'tab-faq' && elements.drawerSubItemsList) {
      elements.drawerSubItemsList.innerHTML = '';
      categorias.forEach(cat => {
        const item = document.createElement('div');
        item.className = `sub-drawer-item${cat === faqCategoriaAtiva ? ' active' : ''}`;
        item.dataset.faqCategoria = cat;
        const rotulo = document.createElement('span');
        rotulo.textContent = cat;
        item.appendChild(rotulo);
        item.addEventListener('click', () => {
          faqCategoriaAtiva = cat;
          renderFaqPage(itens);
        });
        elements.drawerSubItemsList.appendChild(item);
      });
    }
    cont.querySelectorAll('.faq-pergunta').forEach(btn => {
      btn.addEventListener('click', () => {
        const item = btn.closest('.faq-item');
        const aberto = item.classList.toggle('aberto');
        btn.setAttribute('aria-expanded', String(aberto));
      });
    });
  }

  // ---- Excluir a própria conta (RPC excluir_minha_conta, migration 051) ----
  const btnDeleteAccount = document.getElementById('btn-settings-delete-account');
  const deleteBox = document.getElementById('settings-delete-box');
  if (btnDeleteAccount && deleteBox) {
    btnDeleteAccount.addEventListener('click', () => {
      deleteBox.classList.toggle('hidden');
      if (!deleteBox.classList.contains('hidden')) document.getElementById('settings-delete-confirm-input')?.focus();
    });
    document.getElementById('settings-delete-confirm-input')?.addEventListener('keydown', (e) => { if (e.key === 'Enter') e.preventDefault(); });
    document.getElementById('btn-settings-delete-cancel')?.addEventListener('click', () => {
      deleteBox.classList.add('hidden');
      document.getElementById('settings-delete-confirm-input').value = '';
      document.getElementById('settings-delete-error').classList.add('hidden');
    });
    document.getElementById('btn-settings-delete-confirm')?.addEventListener('click', async (e) => {
      const btn = e.currentTarget;
      const input = document.getElementById('settings-delete-confirm-input');
      const err = document.getElementById('settings-delete-error');
      err.classList.add('hidden');
      if (input.value.trim().toUpperCase() !== 'EXCLUIR') {
        err.textContent = 'Digite EXCLUIR para confirmar.';
        err.classList.remove('hidden');
        return;
      }
      btn.disabled = true;
      const { error } = await supabaseClient.rpc('excluir_minha_conta');
      if (error) {
        console.error('Erro ao excluir a conta:', error);
        btn.disabled = false;
        err.textContent = 'Não foi possível excluir sua conta agora. Tente de novo em instantes.';
        err.classList.remove('hidden');
        return;
      }
      try { await supabaseClient.auth.signOut({ scope: 'local' }); } catch (e2) { /* a conta já não existe */ }
      window.location.replace('/');
    });
  }

  const btnNotificationsMarkAllRead = document.getElementById('btn-notifications-mark-all-read');
  if (btnNotificationsMarkAllRead) {
    btnNotificationsMarkAllRead.addEventListener('click', async () => {
      await markAllNotificationsRead();
      showToast('Todas as notificações foram marcadas como lidas.', '✓');
    });
  }

  // =========================================================================
  // TEMA: CLARO / ESCURO (TOGGLE NO MENU DE PERFIL)
  // =========================================================================
  function applyTheme(theme) {
    const isDark = theme === 'dark';
    const logoLight = document.getElementById('header-logo-light');
    const logoDark = document.getElementById('header-logo-dark');
    const iconLight = document.getElementById('sidebar-brand-icon-light');
    const iconDark = document.getElementById('sidebar-brand-icon-dark');

    // Salva a preferência exclusiva da plataforma logada
    localStorage.setItem('love-theme', theme);

    // O tema Light / Dark aplica-se EXCLUSIVAMENTE à plataforma logada (dashboard-mode)
    if (document.body.classList.contains('dashboard-mode')) {
      if (isDark) {
        document.body.setAttribute('data-theme', 'dark');
        document.documentElement.setAttribute('data-theme', 'dark');
      } else {
        document.body.removeAttribute('data-theme');
        document.documentElement.removeAttribute('data-theme');
      }
    } else {
      document.body.removeAttribute('data-theme');
      document.documentElement.removeAttribute('data-theme');
    }

    // Atualiza estado ativo dos botões do segmented control (Light / Dark)
    const themeButtons = document.querySelectorAll('.theme-toggle-btn');
    themeButtons.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.themeOption === theme);
    });

    const footerLogosLight = document.querySelectorAll('.footer-logo-light');
    const footerLogosDark = document.querySelectorAll('.footer-logo-dark');

    if (logoLight) logoLight.src = 'assets/love-dark-03.png';
    if (logoDark) logoDark.src = 'assets/Love-white-03.png';

    if (isDark) {
      if (logoLight) logoLight.classList.add('hidden');
      if (logoDark) logoDark.classList.remove('hidden');
      if (iconLight) iconLight.classList.add('hidden');
      if (iconDark) iconDark.classList.remove('hidden');
      footerLogosLight.forEach(img => img.classList.add('hidden'));
      footerLogosDark.forEach(img => img.classList.remove('hidden'));
    } else {
      if (logoLight) logoLight.classList.remove('hidden');
      if (logoDark) logoDark.classList.add('hidden');
      if (logoLight) logoLight.style.display = '';
      if (logoDark) logoDark.classList.add('hidden');
      if (iconLight) iconLight.classList.remove('hidden');
      if (iconDark) iconDark.classList.add('hidden');
      footerLogosLight.forEach(img => img.classList.remove('hidden'));
      footerLogosDark.forEach(img => img.classList.add('hidden'));
    }
  }

  // Sem seletor de tema no perfil: sempre no claro.
  applyTheme('light');

  // Registra eventos de clique nos botões de tema (Light e Dark)
  document.querySelectorAll('.theme-toggle-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const selectedTheme = btn.dataset.themeOption;
      applyTheme(selectedTheme);
      showToast(selectedTheme === 'dark' ? 'Modo Escuro ativado' : 'Modo Claro ativado', selectedTheme === 'dark' ? '🌙' : '☀️');
    });
  });

  // Configuração das Abas na Double-Sidebar
  const railTabsConfig = {
    overview: {
      title: 'Visão Geral',
      actionText: null,
      subItems: [] // Sem sub-sidebar: Visão Geral é tela principal direta com métricas
    },
    'edit-site': {
      title: 'Personalizar evento',
      actionText: null,
      subItems: [
        { id: 'home', label: 'Aparência' },
        { id: 'data', label: 'Informações' },
        { id: 'about', label: 'Organizadores' },
        { id: 'invite-print', label: 'Produzir convite' }
      ]
    },
    gifts: {
      title: 'Lista de Presentes',
      actionText: null,
      actionHandler: null,
      subItems: [
        { id: 'my-gifts', label: 'Meus presentes' },
        { id: 'gift-settings', label: 'Configurações' }
      ]
    },
    rsvp: {
      title: 'Lista de Convidados',
      actionText: null,
      actionHandler: null,
      subItems: [
        { id: 'all', label: 'Meus convidados' },
        { id: 'tables', label: 'Mapa do evento' },
        { id: 'checklist', label: 'Checklist' }
      ]
    },
    wallet: {
      title: 'Financeiro',
      actionText: null,
      actionHandler: null,
      subItems: [
        { id: 'wallet-digital', label: 'Carteira Digital' },
        { id: 'wallet-budget', label: 'Orçamento' },
        { id: 'wallet-statement', label: 'Extrato' }
      ]
    },
    b2b: {
      title: 'Fornecedores',
      actionText: null,
      actionHandler: null,
      subItems: [
        { id: 'explore', label: 'Explorar' },
        { id: 'pedidos', label: 'Solicitar propostas' },
        { id: 'messages', label: 'Mensagens' },
        { id: 'contracted', label: 'Meus contratos' },
        // Benefícios: guardado, mas fora do menu por enquanto (oculto: true).
        { id: 'insurance', label: 'Benefícios', oculto: true },
        { id: 'favorites', label: 'Favoritos' }
      ]
    }
  };

  function setSidebarLocked(locked) {
    state.hasEventCreated = !locked;
    const switcher = document.getElementById('btn-event-switcher');
    
    if (locked) {
      document.body.classList.add('first-access-locked');
      if (switcher) {
        switcher.style.pointerEvents = 'none';
        switcher.style.opacity = '0.5';
      }
    } else {
      document.body.classList.remove('first-access-locked');
      if (switcher) {
        switcher.style.pointerEvents = '';
        switcher.style.opacity = '';
      }
    }
  }

  function startFirstAccessFlow() {
    switchView('dashboard');
    setSidebarLocked(true);

    // Oculta sub-sidebar e expande tela
    if (elements.subDrawer) elements.subDrawer.classList.add('hidden-drawer');
    if (elements.mainArea) elements.mainArea.classList.add('full-width');

    // Desmarca abas ativas
    elements.railIconBtns.forEach(btn => btn.classList.remove('active'));

    // Exibe exclusivamente a página de criação do evento no passo 1 (Boas-vindas)
    document.querySelectorAll('.dashboard-tab-content').forEach(content => {
      content.classList.toggle('active', content.id === 'tab-create-event-page');
    });

    const welcomeStep = document.getElementById('create-event-welcome-step');
    const formStep = document.getElementById('create-event-form-step');
    const welcomeTitle = document.getElementById('create-event-welcome-title');
    const welcomeSubtitle = document.getElementById('create-event-welcome-subtitle');

    if (welcomeTitle) welcomeTitle.textContent = 'Crie seu primeiro evento';
    if (welcomeSubtitle) welcomeSubtitle.textContent = 'Comece a planejar seu grande dia ou crie a lista de presentes perfeita para celebrar seus momentos mais especiais.';

    if (welcomeStep) welcomeStep.classList.remove('hidden');
    if (formStep) formStep.classList.add('hidden');

    // Limpa campos do formulário
    const inputName = document.getElementById('page-new-event-name');
    const inputSlug = document.getElementById('page-new-event-slug');
    const inputDate = document.getElementById('page-new-event-date');
    if (inputName) inputName.value = '';
    if (inputSlug) inputSlug.value = '';
    if (inputDate) inputDate.value = '';
    preencherInicioPadraoDoNovoEvento();

    showToast('Crie seu primeiro evento para começar!', '✨');
  }

  // URL limpa de cada aba principal do painel — sem isso, trocar de aba
  // enquanto a URL estava em /termos ou /privacidade deixava a
  // pessoa presa naquela URL em qualquer lugar que fosse depois (a troca de
  // aba nunca tocava a URL, então o que estava lá só ficava obsoleto).
  const RAIL_TAB_ROUTES = {
    overview: '/',
    'edit-site': '/personalizar',
    gifts: '/presentes',
    rsvp: '/convidados',
    wallet: '/carteira',
    b2b: '/fornecedores'
  };
  const RAIL_ROUTE_TO_TAB = Object.fromEntries(Object.entries(RAIL_TAB_ROUTES).map(([k, v]) => [v, k]));

  // ==========================================
  // Sub-rotas: cada sub-item (e as páginas de fornecedor) tem URL própria,
  // pra o voltar/avançar do navegador passar por elas em vez de pular
  // direto pra aba anterior. O sub-item padrão de cada aba usa a URL base.
  //   /fornecedores/contratos/<id>  → página do fornecedor contratado
  //   /fornecedores/perfil/<id>     → página do fornecedor (Explorar/Favoritos)
  // ==========================================
  const SUB_ROUTES = {
    'edit-site': { home: '', data: 'informacoes', about: 'anfitrioes', 'invite-print': 'convite' },
    gifts: { 'my-gifts': '', 'gift-settings': 'configuracoes' },
    rsvp: { all: '', tables: 'mesas', checklist: 'checklist' },
    wallet: { 'wallet-digital': '', 'wallet-budget': 'orcamento', 'wallet-statement': 'extrato' },
    b2b: { explore: '', pedidos: 'pedidos', messages: 'chat', contracted: 'contratos', insurance: 'beneficios', favorites: 'favoritos' }
  };

  // Ligado enquanto a tela está sendo montada a partir da URL (voltar/avançar
  // ou F5) — nesse caso nada pode empilhar uma entrada nova no histórico.
  let aplicandoRotaDoHistorico = false;

  function caminhoSubRota(tab, subId) {
    const base = RAIL_TAB_ROUTES[tab];
    if (!base) return null;
    const slug = (SUB_ROUTES[tab] || {})[subId] || '';
    return slug ? base + '/' + slug : base;
  }

  // voltarComHistorico: a entrada anterior é a lista de onde a página foi
  // aberta — o botão "Voltar" da própria tela pode usar history.back().
  function registrarRota(path, { voltarComHistorico = false } = {}) {
    if (aplicandoRotaDoHistorico || !path || window.location.pathname === path) return;
    history.pushState({ loveRoute: path, voltarComHistorico }, '', path);
  }

  // URL do perfil do fornecedor legível e rastreável:
  //   /fornecedores/<empresa>-<id8>                      → perfil
  //   /fornecedores/<empresa>-<id8>/<servico>-<id8>      → perfil aberto a
  //   partir daquele serviço — cada serviço vira um "source" próprio no
  //   Analytics. id8 = os 8 primeiros caracteres do uuid; é por ele que a
  //   rota acha o fornecedor/serviço de novo (F5, link compartilhado).
  function rotaPerfilFornecedor(item, servico) {
    const id8 = v => String(v || '').slice(0, 8);
    let path = `/fornecedores/${slugify(item.name) || 'fornecedor'}-${id8(item.id)}`;
    if (servico && servico.id) path += `/${slugify(servico.name) || 'servico'}-${id8(servico.id)}`;
    return path;
  }

  function lerRota(pathname) {
    const partes = pathname.split('/').filter(Boolean);
    const base = '/' + (partes[0] || '');
    const tab = RAIL_ROUTE_TO_TAB[base];
    if (!tab) return null;
    const slug = partes[1] || '';
    // Formato antigo (/fornecedores/perfil/<uuid>): links já compartilhados continuam valendo.
    if (tab === 'b2b' && slug === 'perfil' && partes[2]) {
      return { tab, subId: null, perfilId: decodeURIComponent(partes[2]) };
    }
    const subs = SUB_ROUTES[tab] || {};
    const subId = Object.keys(subs).find(id => subs[id] === slug);
    if (subId === undefined) {
      const mPerfil = tab === 'b2b' ? /-([0-9a-f]{8})$/i.exec(decodeURIComponent(slug)) : null;
      if (mPerfil) {
        const mServ = partes[2] ? /-([0-9a-f]{8})$/i.exec(decodeURIComponent(partes[2])) : null;
        return { tab, subId: null, perfilId: mPerfil[1], servicoId: mServ ? mServ[1] : null };
      }
      return slug ? null : { tab, subId: null };
    }
    return {
      tab,
      subId,
      contratoId: tab === 'b2b' && subId === 'contracted' && partes[2] ? decodeURIComponent(partes[2]) : null
    };
  }

  // Abre um sub-item como se tivesse sido clicado na sub-barra (sem empilhar URL).
  // Fecha qualquer drawer lateral aberto (presente, convidado, mesa,
  // acomodar, despesa): ao trocar de página ele não pode continuar na tela.
  function fecharTodosOsDrawers() {
    if (typeof closeGiftDrawer === 'function') closeGiftDrawer();
    if (typeof closeAddGuestDrawer === 'function') closeAddGuestDrawer();
    document.querySelectorAll('aside.gift-drawer, aside.guest-add-drawer, aside.budget-expense-drawer, aside.table-drawer, aside.guest-details-drawer').forEach(d => {
      d.classList.remove('open');
      d.style.setProperty('display', 'none', 'important');
      d.classList.add('hidden');
    });
    document.querySelectorAll('.gift-drawer-backdrop, .guest-drawer-backdrop, .budget-expense-drawer-backdrop, .table-drawer-backdrop').forEach(b => {
      b.classList.remove('open');
      b.style.setProperty('display', 'none', 'important');
      b.classList.add('hidden');
    });
  }

  function abrirSubItem(tab, subId) {
    if (!subId) return;
    if (!areaPermitida(tab, subId)) return;
    fecharTodosOsDrawers();
    const label = (railTabsConfig[tab]?.subItems || []).find(i => i.id === subId)?.label || '';
    elements.drawerSubItemsList?.querySelectorAll('.sub-drawer-item').forEach(b => {
      b.classList.toggle('active', b.dataset.routeSub === subId);
    });
    if (tab === 'edit-site') switchEditorSubSection(subId, label);
    else if (tab === 'gifts') {
      document.querySelectorAll('.dashboard-tab-content').forEach(c => c.classList.toggle('active', c.id === 'tab-gifts'));
      switchGiftsSubSection(subId);
    }
    else if (tab === 'rsvp') switchRsvpSubSection(subId);
    else if (tab === 'wallet') switchWalletSubSection(subId, label);
    else if (tab === 'b2b') switchB2BView(subId);
  }

  // id completo (rota antiga) ou os 8 primeiros caracteres (rota nova).
  function encontrarFornecedorExplorar(id) {
    const alvo = String(id || '').toLowerCase();
    const item = b2bFornecedores.find(f => {
      const fid = String(f.id).toLowerCase();
      return fid === alvo || (alvo.length === 8 && fid.startsWith(alvo));
    });
    return item ? { ...item } : null;
  }

  // inicial: abertura pela URL (F5/link). state.currentTab já nasce como
  // 'edit-site' sem a aba estar aberta — sem forçar, recarregar em
  // /personalizar não abria nada e ficava a Home do HTML.
  function aplicarRota(rota, { inicial = false } = {}) {
    if (!rota) return;
    aplicandoRotaDoHistorico = true;
    try {
      if (inicial || state.currentTab !== rota.tab) {
        if (rota.subId) pendingSubItemId = rota.subId;
        switchRailTab(rota.tab);
      }
      if (rota.tab === 'overview') return;
      if (rota.tab === 'b2b' && rota.perfilId) {
        // Explorar primeiro: esconde Chat/Contratos que possam estar abertos.
        abrirSubItem('b2b', 'explore');
        // A vitrine vem do Supabase: no F5 direto num perfil ela ainda pode
        // estar carregando — abre o perfil assim que chegar.
        const abrirPerfil = () => {
          const item = encontrarFornecedorExplorar(rota.perfilId);
          if (!item || state.currentTab !== 'b2b') return;
          const servico = rota.servicoId
            ? (item.services || []).find(s => String(s.id).toLowerCase().startsWith(rota.servicoId.toLowerCase())) || null
            : null;
          const antes = aplicandoRotaDoHistorico;
          aplicandoRotaDoHistorico = true;
          openB2BVendorProfile(item, servico);
          aplicandoRotaDoHistorico = antes;
        };
        if (b2bFornecedoresCarregados) abrirPerfil();
        else carregarFornecedoresVitrine().then(abrirPerfil);
        return;
      }
      abrirSubItem(rota.tab, rota.subId || Object.keys(SUB_ROUTES[rota.tab] || {})[0]);
      if (rota.contratoId) {
        const contrato = (window.LOVE_DATA.contractedVendors || []).find(v => String(v.id) === String(rota.contratoId));
        if (contrato) openContractedVendorPage(contrato);
      }
    } finally {
      aplicandoRotaDoHistorico = false;
    }
  }

  function switchRailTab(tabKey) {
    // Se o usuário ainda não criou seu primeiro evento, bloqueia o acesso aos outros menus
    if (!state.hasEventCreated) {
      showToast('Crie seu primeiro evento para desbloquear os menus do painel.', '🔒');
      return;
    }

    // Pop-up de configurar orçamento só faz sentido dentro de Orçamento —
    // sai ao trocar de menu (reabre sozinho se voltar pra lá sem orçamento definido).
    closeModal(document.getElementById('modal-setup-budget'));
    fecharTodosOsDrawers();

    // Organizador sem acesso a essa área: fica na Home. Com acesso só a
    // alguns submenus, abre o primeiro liberado.
    if (!areaPermitida(tabKey)) { tabKey = 'overview'; pendingSubItemId = null; }
    else {
      const subs = (railTabsConfig[tabKey] && railTabsConfig[tabKey].subItems) || [];
      if (subs.length && (!pendingSubItemId || !areaPermitida(tabKey, pendingSubItemId))) {
        const padrao = tabKey === 'edit-site' ? (state.activeSubSection || 'home') : subs[0].id;
        if (!areaPermitida(tabKey, padrao)) {
          const primeiro = subs.find(i => areaPermitida(tabKey, i.id));
          if (primeiro) { pendingSubItemId = primeiro.id; if (tabKey === 'edit-site') state.activeSubSection = primeiro.id; }
        }
      }
    }

    state.currentTab = tabKey;

    registrarRota(pendingSubItemId ? caminhoSubRota(tabKey, pendingSubItemId) : RAIL_TAB_ROUTES[tabKey]);
    // Sem isso, o título da aba do navegador ficava preso em "Política de
    // Privacidade" (ou Termos) depois de sair da página legal pra qualquer
    // outro lugar do painel.
    if (document.title !== 'Love - Event OS & Lista de Presentes') {
      document.title = 'Love - Event OS & Lista de Presentes';
    }

    // Reseta todos os modos especiais do body primeiro
    document.body.classList.remove('editor-split-mode', 'organizadores-sem-previa', 'rsvp-mode', 'b2b-mode', 'b2b-chat-mode', 'page-mode', 'gifts-mode', 'wallet-mode');

    // 1. Atualiza destaque circular do ícone na Sidebar Rail
    elements.railIconBtns.forEach(btn => {
      if (btn.getAttribute('data-rail-tab') === tabKey) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    // 2. CASO ESPECIAL: VISÃO GERAL (HOME)
    // Resumo direto na tela com métricas: não possui sub-sidebar e ocupa 100% da largura
    if (tabKey === 'overview') {
      if (elements.subDrawer) elements.subDrawer.classList.add('hidden-drawer');
      if (elements.mainArea) elements.mainArea.classList.add('full-width');

      document.querySelectorAll('.dashboard-tab-content').forEach(content => {
        content.classList.toggle('active', content.id === 'tab-overview');
      });
      renderQuickStartChecklist();
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    // 3. DEMAIS ABAS: Sub-sidebar SEMPRE FIXA E ABERTA NO DESKTOP
    const config = railTabsConfig[tabKey];
    if (config) {
      if (window.innerWidth > 768) {
        if (elements.subDrawer) elements.subDrawer.classList.remove('hidden-drawer');
        if (elements.mainArea) elements.mainArea.classList.remove('full-width');
      } else {
        // No mobile
        if (config.subItems && config.subItems.length > 0) {
          openMobileDrawer();
        } else {
          closeMobileDrawer();
        }
      }

      if (elements.drawerTitle) elements.drawerTitle.textContent = config.title;
      if (elements.drawerActionBtn && elements.drawerActionBtn.parentElement) {
        if (config.actionText) {
          elements.drawerActionBtn.parentElement.classList.remove('hidden');
          elements.drawerActionBtn.innerHTML = `<span>${config.actionText}</span>`;
          elements.drawerActionBtn.onclick = config.actionHandler;
        } else {
          elements.drawerActionBtn.parentElement.classList.add('hidden');
        }
      }

      // Renderiza as opções de submenu em formato pill arredondado
      if (elements.drawerSubItemsList) {
        elements.drawerSubItemsList.innerHTML = '';
        const activeEvent = getActiveEvent();
        // Não lidas do chat com fornecedores (0 enquanto não carregou).
        let unreadCount = 0;
        try { unreadCount = totalNaoLidasDoChat(); } catch (e) { /* chat ainda não carregou */ }

        config.subItems.filter(item => !item.oculto && areaPermitida(tabKey, item.id)).forEach((item, index) => {
          const btn = document.createElement('div');
          const isFirstActive = (tabKey === 'edit-site' && item.id === (state.activeSubSection || 'home'))
            || (pendingSubItemId && item.id === pendingSubItemId)
            || (tabKey !== 'edit-site' && !pendingSubItemId && index === 0);
          btn.className = `sub-drawer-item ${isFirstActive ? 'active' : ''}`;
          btn.dataset.routeSub = item.id;
          
          let badgeMarkup = '';
          if (item.id === 'messages' && unreadCount > 0) {
            badgeMarkup = `<span class="badge-recados-count px-2 py-0.5 rounded-full text-[10px] font-bold shadow-sm ml-auto" style="background-color: #c7305b !important; color: #FFFFFF !important;">${unreadCount}</span>`;
          }

          btn.innerHTML = `<span>${item.label}</span>${badgeMarkup}`;

          btn.addEventListener('click', () => {
            const runSubItemClick = () => {
            elements.drawerSubItemsList.querySelectorAll('.sub-drawer-item').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            if (tabKey === 'edit-site') {
              switchEditorSubSection(item.id, item.label);
            } else if (tabKey === 'gifts') {
              document.querySelectorAll('.dashboard-tab-content').forEach(c => {
                c.classList.toggle('active', c.id === 'tab-gifts');
              });
              switchGiftsSubSection(item.id);
            } else if (tabKey === 'info-event') {
              switchInfoSubSection(item.id, item.label);
            } else if (tabKey === 'rsvp') {
              switchRsvpSubSection(item.id);
            } else if (tabKey === 'wallet') {
              switchWalletSubSection(item.id, item.label);
            } else if (tabKey === 'b2b') {
              switchB2BView(item.id);
            } else {
              showToast(`Opção "${item.label}" selecionada.`, 'ℹ️');
            }

            registrarRota(caminhoSubRota(tabKey, item.id));

            // Apenas fecha a gaveta se estiver em tela mobile (< 768px). No desktop fica SEMPRE FIXO!
            if (window.innerWidth <= 768) {
              closeMobileDrawer();
            }
            };

            // Saindo da Aparência (construtor visual): avisa se houver alterações não salvas
            if (tabKey === 'edit-site' && item.id !== 'home' && state.activeSubSection === 'home' && window.builderConfirmLeaveIfDirty) {
              window.builderConfirmLeaveIfDirty(runSubItemClick);
            } else {
              runSubItemClick();
            }
          });

          elements.drawerSubItemsList.appendChild(btn);
        });

        pendingSubItemId = null;
      }
    }

    // 4. Atualiza os conteúdos de página
    document.querySelectorAll('.dashboard-tab-content').forEach(content => {
      content.classList.toggle('active', content.id === `tab-${tabKey}`);
    });

    document.body.classList.remove('editor-split-mode', 'organizadores-sem-previa', 'rsvp-mode', 'b2b-mode', 'b2b-chat-mode', 'page-mode', 'gifts-mode', 'wallet-mode');

    // Ativa os modos e sub-seções correspondentes
    if (tabKey === 'edit-site') {
      document.body.classList.add('editor-split-mode');
      switchEditorSubSection(state.activeSubSection || 'home', 'Aparência');
    } else if (tabKey === 'gifts') {
      document.body.classList.add('gifts-mode');
      switchGiftsSubSection('my-gifts');
    } else if (tabKey === 'rsvp') {
      document.body.classList.add('rsvp-mode');
      renderGuestsTable('all');
    } else if (tabKey === 'wallet') {
      document.body.classList.add('wallet-mode');
      switchWalletSubSection('wallet-digital', 'Carteira Digital');
    } else if (tabKey === 'b2b') {
      document.body.classList.add('b2b-mode');
      // Montagem padrão da aba: a URL já foi definida acima por registrarRota
      // (base ou sub-item pedido) — aqui não pode empilhar outra.
      const aplicandoAntes = aplicandoRotaDoHistorico;
      aplicandoRotaDoHistorico = true;
      if (document.body.classList.contains('b2b-chat-mode')) {
        switchB2BView('messages');
      } else {
        switchB2BView('explore');
      }
      aplicandoRotaDoHistorico = aplicandoAntes;
    } else if (tabKey === 'info-event') {
      switchInfoSubSection('my-event', 'Meu evento');
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // Listener robusto para os ícones da barra lateral (com alternância abre/fecha se clicar novamente)
  document.addEventListener('click', (e) => {
    const railBtn = e.target.closest('.rail-icon-btn');
    if (railBtn) {
      const tab = railBtn.getAttribute('data-rail-tab');
      if (tab) {
        e.preventDefault();
        e.stopPropagation();

        // Se o usuário ainda não criou seu primeiro evento, bloqueia o acesso aos outros menus
        if (!state.hasEventCreated) {
          showToast('Crie seu primeiro evento para desbloquear os menus do painel.', '🔒');
          return;
        }

        // Se clicar mais 1 vez no ícone da aba ativa (exceto 'overview' que não possui submenu):
        // Faz o reverso: se o submenu estiver aberto, fecha; se estiver fechado, reabre!
        if (state.currentTab === tab && tab !== 'overview') {
          const isDrawerOpen = elements.subDrawer && !elements.subDrawer.classList.contains('hidden-drawer');
          if (isDrawerOpen) {
            foldSubDrawer();
          } else {
            expandSubDrawer();
          }
          return;
        }

        // Saindo da Aparência (construtor visual): avisa se houver alterações não salvas
        if (state.currentTab === 'edit-site' && state.activeSubSection === 'home' && window.builderConfirmLeaveIfDirty) {
          window.builderConfirmLeaveIfDirty(() => switchRailTab(tab));
        } else {
          switchRailTab(tab);
        }
      }
    }
  });

  // Data na Home: abre Personalizar evento › Informações, já no campo da data.
  const homeEventDateBadge = document.getElementById('dash-hub-event-date-badge');
  if (homeEventDateBadge) {
    homeEventDateBadge.addEventListener('click', () => {
      pendingSubItemId = 'data';
      state.activeSubSection = 'data';
      switchRailTab('edit-site');
      setTimeout(() => {
        const campo = document.getElementById('editor-data-date');
        if (campo) { campo.scrollIntoView({ behavior: 'smooth', block: 'center' }); campo.focus(); }
      }, 300);
    });
  }

  // Listener e Dropdown para Encaminhar / Compartilhar site do evento na Home
  const btnShareDropdownTrigger = document.getElementById('btn-dash-share-dropdown-trigger');
  const shareDropdownMenu = document.getElementById('dash-share-dropdown-menu');
  const btnDropdownViewSite = document.getElementById('btn-dropdown-view-site');
  const btnDropdownShareSite = document.getElementById('btn-dropdown-share-site');
  const modalShareSite = document.getElementById('modal-share-event-site');
  const shareUrlInput = document.getElementById('share-modal-url-input');
  const btnShareModalCopy = document.getElementById('btn-share-modal-copy');
  const shareModalCopyText = document.getElementById('share-modal-copy-text');
  const btnShareWhatsapp = document.getElementById('btn-share-whatsapp');
  const btnShareFacebook = document.getElementById('btn-share-facebook');
  const btnShareTwitter = document.getElementById('btn-share-twitter');

  if (btnShareDropdownTrigger && shareDropdownMenu) {
    btnShareDropdownTrigger.addEventListener('click', (e) => {
      e.stopPropagation();
      shareDropdownMenu.classList.toggle('hidden');
    });

    document.addEventListener('click', (e) => {
      if (!shareDropdownMenu.contains(e.target) && e.target !== btnShareDropdownTrigger) {
        shareDropdownMenu.classList.add('hidden');
      }
    });
  }

  function getActiveEventShareUrl() {
    const activeEv = getActiveEvent();
    return activeEv.publicUrl || `https://love.com.br/${activeEv.slug || 'beatriz-e-lucas'}`;
  }

  if (btnDropdownViewSite) {
    btnDropdownViewSite.addEventListener('click', () => {
      if (shareDropdownMenu) shareDropdownMenu.classList.add('hidden');
      const url = getActiveEventShareUrl();
      window.open(url, '_blank');
    });
  }

  function openShareSiteModal() {
    const activeEv = getActiveEvent();
    const url = getActiveEventShareUrl();
    const eventTitle = activeEv.title || 'Nosso Evento Especial';

    if (shareUrlInput) {
      shareUrlInput.value = url;
    }

    if (btnShareWhatsapp) {
      const msg = `Olá! Convido você para acessar o site oficial do nosso evento e acompanhar todos os detalhes: ${url}`;
      btnShareWhatsapp.href = `https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`;
    }

    if (btnShareFacebook) {
      btnShareFacebook.href = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
    }

    if (btnShareTwitter) {
      const tweet = `Confira o site oficial de ${eventTitle}:`;
      btnShareTwitter.href = `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweet)}&url=${encodeURIComponent(url)}`;
    }

    if (modalShareSite) {
      openModal(modalShareSite);
    }
  }

  if (btnDropdownShareSite) {
    btnDropdownShareSite.addEventListener('click', () => {
      if (shareDropdownMenu) shareDropdownMenu.classList.add('hidden');
      openShareSiteModal();
    });
  }

  if (btnShareModalCopy) {
    btnShareModalCopy.addEventListener('click', async () => {
      const url = shareUrlInput ? shareUrlInput.value : getActiveEventShareUrl();
      try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          await navigator.clipboard.writeText(url);
        } else if (shareUrlInput) {
          shareUrlInput.select();
          document.execCommand('copy');
        }
        if (shareModalCopyText) shareModalCopyText.textContent = 'Copiado!';
        if (btnShareModalCopy) {
          btnShareModalCopy.classList.remove('bg-[#537bae]', 'hover:bg-[#416799]');
          btnShareModalCopy.classList.add('bg-emerald-600', 'hover:bg-emerald-700');
        }
        showToast('Link do evento copiado para a área de transferência! 📋', '✨');
        setTimeout(() => {
          if (shareModalCopyText) shareModalCopyText.textContent = 'Copiar';
          if (btnShareModalCopy) {
            btnShareModalCopy.classList.remove('bg-emerald-600', 'hover:bg-emerald-700');
            btnShareModalCopy.classList.add('bg-[#537bae]', 'hover:bg-[#416799]');
          }
        }, 2500);
      } catch (err) {
        showToast('Não foi possível copiar automaticamente. Selecione e copie manualmente.', '⚠️');
      }
    });
  }

  // ==========================================
  // 3. SELETOR DE COMEMORAÇÕES (Sem Emojis, "Suas comemorações")
  // ==========================================
  function renderEventsSwitcher() {
    aplicarPermissoesDoEventoAtivo();
    const container = elements.dashHeader.eventsItemsContainer;
    if (!container) return;

    container.innerHTML = '';
    state.events.forEach(evt => {
      const isActive = evt.id === state.activeEventId;
      const item = document.createElement('div');
      item.className = `event-switcher-item p-2.5 rounded-[10px] text-xs font-normal cursor-pointer transition-all flex items-center justify-between gap-2 ${
        isActive ? 'is-active' : 'is-inactive'
      }`;
      item.innerHTML = `
        <span class="block truncate font-normal">${evt.title}</span>
        ${isActive ? '<span class="text-xs font-bold flex-shrink-0 checkmark-icon">✓</span>' : ''}
      `;

      item.addEventListener('click', () => {
        definirEventoAtivo(evt.id);
        elements.dashHeader.dropdownList.classList.add('hidden');
        document.body.setAttribute('data-event-theme', evt.type);
        updateAllCelebrationData();
        renderEventsSwitcher();
        // Convite Digital é por evento — recarrega o do evento recém-ativado.
        if (typeof window.reloadBuilderStateForActiveEvent === 'function') {
          window.reloadBuilderStateForActiveEvent();
        }
        showToast(`Evento ativo alterado para "${evt.title}"!`, '🎉');
      });

      container.appendChild(item);
    });
  }

  // Toggle do Dropdown de Eventos
  if (elements.dashHeader.btnSwitcher && elements.dashHeader.dropdownList) {
    elements.dashHeader.btnSwitcher.addEventListener('click', (e) => {
      e.stopPropagation();
      elements.dashHeader.dropdownList.classList.toggle('hidden');
    });

    document.addEventListener('click', () => {
      elements.dashHeader.dropdownList.classList.add('hidden');
    });
  }

  if (elements.dashHeader.btnDropdownCreate) {
    elements.dashHeader.btnDropdownCreate.addEventListener('click', () => {
      elements.dashHeader.dropdownList.classList.add('hidden');
      openCreateEventPage();
    });
  }

  // Novo evento sempre começa amanhã ao meio-dia (e termina no mesmo dia).
  // Se a data veio do /cadastro (pendente), respeita a que a pessoa escolheu.
  function preencherInicioPadraoDoNovoEvento() {
    let pendente = null;
    try { pendente = localStorage.getItem('love-pending-event-date'); } catch (e) { /* sem armazenamento */ }
    if (pendente) return;
    const amanha = new Date();
    amanha.setDate(amanha.getDate() + 1);
    const iso = `${amanha.getFullYear()}-${String(amanha.getMonth() + 1).padStart(2, '0')}-${String(amanha.getDate()).padStart(2, '0')}`;
    const inicio = /** @type {HTMLInputElement|null} */ (document.getElementById('page-new-event-date'));
    const horaInicio = /** @type {HTMLInputElement|null} */ (document.getElementById('page-new-event-start-time'));
    const fim = /** @type {HTMLInputElement|null} */ (document.getElementById('page-new-event-end-date'));
    if (inicio) inicio.value = iso;
    if (horaInicio) horaInicio.value = '12:00';
    if (fim) fim.value = iso;
  }

  function openCreateEventPage(isFirstAccess = false, goToForm = false) {
    state.currentTab = 'create-event-page';
    preencherInicioPadraoDoNovoEvento();
    elements.railIconBtns.forEach(btn => btn.classList.remove('active'));
    elements.subDrawer.classList.add('hidden-drawer');
    elements.mainArea.classList.add('full-width');

    document.querySelectorAll('.dashboard-tab-content').forEach(content => {
      if (content.id === 'tab-create-event-page') {
        content.classList.add('active');
      } else {
        content.classList.remove('active');
      }
    });

    const welcomeStep = document.getElementById('create-event-welcome-step');
    const formStep = document.getElementById('create-event-form-step');
    const welcomeTitle = document.getElementById('create-event-welcome-title');
    const welcomeSubtitle = document.getElementById('create-event-welcome-subtitle');

    if (isFirstAccess || !state.hasEventCreated || (state.events && state.events.length === 0)) {
      if (welcomeTitle) welcomeTitle.textContent = 'Crie seu primeiro evento';
      if (welcomeSubtitle) welcomeSubtitle.textContent = 'Comece a planejar seu grande dia ou crie a lista de presentes perfeita para celebrar seus momentos mais especiais.';
    } else {
      if (welcomeTitle) welcomeTitle.textContent = 'Vamos criar um novo evento?';
      if (welcomeSubtitle) welcomeSubtitle.textContent = 'Adicione uma nova comemoração à sua conta e gerencie convidados, presentes e finanças em um só lugar.';
    }

    if (goToForm) {
      if (welcomeStep) welcomeStep.classList.add('hidden');
      if (formStep) formStep.classList.remove('hidden');
    } else {
      if (welcomeStep) welcomeStep.classList.remove('hidden');
      if (formStep) formStep.classList.add('hidden');
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // Formata uma data ISO ("2025-10-18") como "18 de Outubro de 2025"
  function formatEventDateLong(isoDate) {
    if (!isoDate) return '';
    const months = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
    const parts = String(isoDate).split('-');
    if (parts.length !== 3) return isoDate;
    const [year, month, day] = parts;
    const monthName = months[parseInt(month, 10) - 1];
    if (!monthName) return isoDate;
    return `${parseInt(day, 10)} de ${monthName} de ${year}`;
  }

  // ==========================================
  // 4. ATUALIZAÇÃO COMPLETA DOS DADOS DA COMEMORAÇÃO ATIVA
  // ==========================================
  // Calcula sempre a partir da data real do evento — nunca um número
  // guardado (que fica desatualizado a cada dia que passa).
  function calcularDiasRestantes(dataEvento) {
    if (!dataEvento) return null;
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const data = new Date(`${String(dataEvento).slice(0, 10)}T00:00:00`);
    if (isNaN(data.getTime())) return null;
    return Math.round((data - hoje) / 86400000);
  }

  function updateAllCelebrationData() {
    const activeEvent = getActiveEvent();

    // 1. Header Superior
    if (elements.dashHeader.eventTitle) elements.dashHeader.eventTitle.textContent = activeEvent.title;
    if (elements.dashHeader.countdownBadge) {
      const dias = calcularDiasRestantes(activeEvent.date);
      elements.dashHeader.countdownBadge.textContent = dias === null ? '' : dias < 0 ? 'Evento realizado' : `Faltam ${dias} dias`;
    }
    if (elements.dashHeader.slugBadge) elements.dashHeader.slugBadge.textContent = `love.com.br/${activeEvent.slug}`;
    if (elements.dashHeader.shareUrlInput) {
      elements.dashHeader.shareUrlInput.value = activeEvent.publicUrl || `https://love.com.br/${activeEvent.slug}`;
    }

    // 2. Overview Hub
    const hubTitle = document.getElementById('dash-hub-title');
    const kpiInvites = document.getElementById('kpi-invites-sent');
    const kpiArrecadado = document.getElementById('kpi-total-arrecadado');
    const kpiRsvp = document.getElementById('kpi-rsvp-confirmed');
    const kpiRsvpBreakdown = document.getElementById('kpi-rsvp-breakdown');
    const kpiGifts = document.getElementById('kpi-gifts-count');
    const kpiGiftsSubtext = document.getElementById('kpi-gifts-subtext');
    const overviewUrl = document.getElementById('overview-public-url');

    if (hubTitle) {
      // Primeiro nome da CONTA (o mesmo de Configurações), com maiúscula —
      // antes vinha do nome dos anfitriões do evento, que podia estar em
      // minúscula ("victor").
      const perfilConta = window.loveClienteProfile || {};
      const nomeConta = String(perfilConta.first_name || perfilConta.full_name || perfilConta.couple_name || '').trim().split(/\s+/)[0];
      const rawName = activeEvent.hostName || activeEvent.title || '';
      const nomeDoEvento = rawName.split('&')[0].trim().replace(/^(Casamento|Aniversário|Chá de Bebê|Bodas)\s+(d[eo]\s+)?/i, '').split(/\s+/)[0];
      const firstNameBruto = nomeConta || nomeDoEvento || '';
      const firstName = typeof maiusculaNoNome === 'function' ? maiusculaNoNome(firstNameBruto) : firstNameBruto;
      hubTitle.innerHTML = firstName
        ? `Olá, <span id="dash-hub-user-first-name">${escaparHtml(firstName)}</span>!`
        : 'Olá!';
    }
    const hubCoupleName = document.getElementById('dash-hub-couple-name');
    if (hubCoupleName) {
      hubCoupleName.textContent = activeEvent.hostName ? activeEvent.hostName.toLowerCase() : 'gabriel & joana';
    }
    const kpiGuestsAdded = document.getElementById('kpi-guests-added-count');
    if (kpiGuestsAdded) {
      kpiGuestsAdded.textContent = `${activeEvent.convidadosConfirmados ?? 0}`;
    }
    const hubDateText = document.getElementById('dash-hub-event-date-text');
    const hubLocText = document.getElementById('dash-hub-event-location-text');
    const hasLocation = activeEvent.location && activeEvent.location.trim() !== '' && activeEvent.location !== 'Adicionar Local';
    if (hubDateText) hubDateText.textContent = formatEventDateLong(activeEvent.date) || '18 de Outubro de 2025';
    // Mostra o endereço (Informações); só sem endereço cai no nome do espaço.
    if (hubLocText) hubLocText.textContent = localDoEventoParaHome() || (hasLocation ? activeEvent.location : 'Local do evento');
    // Para saber se o lugar é de um fornecedor da Love, a vitrine precisa
    // estar carregada: carrega (uma vez) e confere de novo.
    let vitrinePronta = true;
    try { vitrinePronta = b2bFornecedoresCarregados; } catch (e) { vitrinePronta = true; }
    if (hubLocText && window.loveClienteSession && !vitrinePronta) {
      carregarFornecedoresVitrine().then(atualizarLocalDaHome).catch(() => {});
    }

    // Atualização dos Convites Enviados — total de convidados da lista
    // (nunca um número de mentira: um evento novo de verdade tem zero).
    // Convidados e Confirmados contam também os acompanhantes.
    if (Array.isArray(activeEvent.guests)) {
      activeEvent.totalConvidados = pessoasNaLista(activeEvent.guests);
      activeEvent.convidadosConfirmados = pessoasNaLista(activeEvent.guests.filter(g => g.status === 'confirmed'));
      if (kpiGuestsAdded) kpiGuestsAdded.textContent = `${activeEvent.convidadosConfirmados}`;
    }
    if (kpiInvites) kpiInvites.textContent = `${activeEvent.totalConvidados ?? 0}`;

    if (kpiArrecadado) kpiArrecadado.textContent = `R$ ${activeEvent.wallet.saldoDisponivel.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
    if (kpiRsvp) kpiRsvp.textContent = `${activeEvent.convidadosConfirmados}`;
    if (kpiRsvpBreakdown) kpiRsvpBreakdown.textContent = `${activeEvent.adultosConfirmados ?? 0} adultos • ${activeEvent.criancasConfirmadas ?? 0} crianças confirmadas`;
    if (kpiGifts) kpiGifts.textContent = `${activeEvent.presentesRecebidos}`;
    if (kpiGiftsSubtext) kpiGiftsSubtext.textContent = `Total de R$ ${activeEvent.totalArrecadado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} arrecadados`;
    
    const kpiSuppliers = document.getElementById('kpi-suppliers-count');
    if (kpiSuppliers) {
      kpiSuppliers.textContent = `${(activeEvent.fornecedores && activeEvent.fornecedores.length) || 8}`;
    }

    const homeB2bChatStatus = document.getElementById('home-b2b-chat-status');
    if (homeB2bChatStatus) {
      const count = (activeEvent.supplierChats && activeEvent.supplierChats.length !== undefined) ? activeEvent.supplierChats.length : 5;
      if (count === 0) {
        homeB2bChatStatus.innerHTML = `<span class="inline-block w-2 h-2 rounded-full bg-zinc-400"></span><span class="text-zinc-500 font-medium">Você ainda não encontrou fornecedores.</span>`;
      } else if (count === 1) {
        homeB2bChatStatus.innerHTML = `<span class="inline-block w-2 h-2 rounded-full" style="background-color: #27394f;"></span><span class="text-[#537bae] font-semibold">Você está falando com 1 fornecedor</span>`;
      } else {
        homeB2bChatStatus.innerHTML = `<span class="inline-block w-2 h-2 rounded-full" style="background-color: #27394f;"></span><span class="text-[#537bae] font-semibold">Você está falando com ${count} fornecedores</span>`;
      }
    }
    
    if (overviewUrl) overviewUrl.textContent = activeEvent.publicUrl || `https://love.com.br/${activeEvent.slug}`;

    // 3. Títulos dos Módulos
    const giftsTitle = document.getElementById('gifts-header-title');
    const rsvpTitle = document.getElementById('rsvp-header-title');
    const walletTitle = document.getElementById('wallet-header-title');
    const walletPixLabel = document.getElementById('wallet-pix-key-label');

    if (giftsTitle) giftsTitle.textContent = 'Meus presentes';
    if (rsvpTitle) rsvpTitle.textContent = 'Meus convidados';
    if (walletTitle) walletTitle.textContent = 'Carteira Digital';
    if (walletPixLabel) walletPixLabel.textContent = `Chave PIX: ${activeEvent.wallet.chavePix}`;
    updateBudgetKPIs();


    // 3.5 B2B: Localização e Fornecedores Baseados no Evento Ativo
    const b2bLocationTitle = document.getElementById('b2b-location-title');
    const b2bLocationSubtitle = document.getElementById('b2b-location-subtitle');
    const b2bEventNameTag = document.getElementById('b2b-event-name-tag');
    const b2bPopularCity = document.getElementById('b2b-popular-venues-city');

    const loc = (activeEvent.eventDetails && (activeEvent.eventDetails.address || activeEvent.eventDetails.locationName)) || activeEvent.location || 'São Paulo, SP';
    // Explorar volta a seguir a cidade deste evento (a escolha manual nas
    // caixinhas vale só enquanto o mesmo evento estiver ativo).
    b2bCityChosenByUser = false;
    if (b2bLocationTitle) b2bLocationTitle.textContent = `${loc} & Região`;
    if (b2bEventNameTag) b2bEventNameTag.textContent = activeEvent.title;
    if (b2bPopularCity) b2bPopularCity.textContent = loc;

    // 4. Renderiza dados isolados
    renderEditorForm();
    renderHostsTeam();
    renderHostGifts();
    renderGuestsTable();
    renderHomeConfirmedGuests();
    renderWalletTransactions();
    renderQuickStartChecklist();
  }

  // "Anfitriões com Acesso à Conta" — só o dono real da conta (nome e e-mail
  // de verdade). Antes vinham dois nomes de mockup ("Beatriz Silveira" e
  // "Lucas Mendonça") sempre fixos, mesmo numa conta nova sem nada a ver com
  // esses nomes.
  function renderHostsTeam() {
    renderOrganizadores().catch(err => console.error('Erro ao montar organizadores:', err));
  }

  // Uma linha da lista: nome (editável pelo lápis) e e-mail (não editável).
  function linhaDeAnfitriaoHtml(nome, email, papel) {
    return `
      <div class="host-team-row p-3.5 rounded-lg bg-zinc-50/80 border border-zinc-200/80 flex items-center justify-between gap-3" data-host-email="${escaparHtml(email)}">
        <div class="min-w-0 flex-1">
          <p class="text-xs font-bold text-zinc-900"><span class="host-name-text">${escaparHtml(nome)}</span> <span class="host-role-badge text-[10px] font-semibold text-[#537bae] bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100 ml-1">${escaparHtml(papel)}</span></p>
          <p class="text-[11px] text-zinc-500 truncate">${escaparHtml(email)}</p>
        </div>
        <button type="button" class="btn-edit-host-name w-8 h-8 flex-shrink-0 rounded-lg border border-zinc-200 bg-white hover:bg-zinc-100 text-zinc-500 hover:text-zinc-800 flex items-center justify-center transition-colors cursor-pointer" title="Editar nome" aria-label="Editar nome">
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="1.9" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125"/></svg>
        </button>
      </div>
    `;
  }

  // Lápis: troca o nome por um campo; Enter ou sair do campo salva, Esc cancela.
  // Salva no evento (anfitrioesNomes por e-mail) e no nome dos anfitriões do
  // convite (hostName), e atualiza a prévia ao lado.
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('.btn-edit-host-name');
    if (!btn) return;
    const linha = btn.closest('.host-team-row');
    const nomeEl = linha && linha.querySelector('.host-name-text');
    if (!nomeEl || linha.querySelector('.host-name-input')) return;
    const original = nomeEl.textContent.trim();
    const input = document.createElement('input');
    input.type = 'text';
    input.value = original;
    input.maxLength = 80;
    input.className = 'host-name-input text-xs font-bold text-zinc-900 px-2 py-1 rounded-md border border-zinc-300 bg-white focus:outline-none focus:border-[#537bae] w-full max-w-[220px]';
    nomeEl.replaceWith(input);
    input.focus();
    input.select();
    let terminou = false;
    const terminar = (salvar) => {
      if (terminou) return;
      terminou = true;
      const novo = input.value.trim();
      const final = salvar && novo ? novo : original;
      const span = document.createElement('span');
      span.className = 'host-name-text';
      span.textContent = final;
      input.replaceWith(span);
      if (!salvar || !novo || novo === original) return;
      const ev = getActiveEvent();
      if (ev) {
        ev.anfitrioesNomes = Object.assign({}, ev.anfitrioesNomes || {}, { [linha.dataset.hostEmail || '']: final });
        const todos = Array.from(document.querySelectorAll('#hosts-team-list .host-name-text')).map(n => n.textContent.trim()).filter(Boolean);
        if (todos.length) ev.hostName = todos.join(' & ');
        persistirEventoAtivo().catch(err => console.error('Erro ao salvar o nome do anfitrião:', err));
      }
      if (typeof updateHostsPreview === 'function') updateHostsPreview();
      if (typeof window.renderAnfitrioesPreview === 'function') window.renderAnfitrioesPreview();
    };
    input.addEventListener('keydown', (ev) => {
      if (ev.key === 'Enter') { ev.preventDefault(); terminar(true); }
      if (ev.key === 'Escape') { ev.preventDefault(); terminar(false); }
    });
    input.addEventListener('blur', () => terminar(true));
  });

  // ==========================================
  // GUIA DE PRIMEIROS PASSOS (Checklist de Progresso da Plataforma)
  // ==========================================
  const quickStartTasksData = [
    {
      id: 'vendors',
      title: 'Favoritar primeiros fornecedores',
      desc: 'Espaços, buffet, foto e música',
      tab: 'b2b',
      icon: '<svg class="w-[23px] h-[23px] text-zinc-700" fill="none" stroke="currentColor" stroke-width="2.15" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M13.5 21v-7.5a.75.75 0 0 1 .75-.75h3a.75.75 0 0 1 .75.75V21m-4.5 0H2.36m11.14 0H18m0 0h3.64m-1.39 0V9.349M3.75 21V9.349m0 0a3.001 3.001 0 0 0 3.75-.615A2.993 2.993 0 0 0 9.75 9.75c.896 0 1.7-.393 2.25-1.016a2.993 2.993 0 0 0 2.25 1.016c.896 0 1.7-.393 2.25-1.015a3.001 3.001 0 0 0 3.75.614m-16.5 0a3.004 3.004 0 0 1-.621-4.72l1.189-1.19A1.5 1.5 0 0 1 5.378 3h13.243a1.5 1.5 0 0 1 1.06.44l1.19 1.189a3 3 0 0 1-.621 4.72m-13.5 0c.168.082.344.148.528.196m12.444 0c.184-.048.36-.114.528-.196"/></svg>'
    },
    {
      id: 'budget',
      title: 'Definir orçamento do evento',
      desc: 'Organize metas e saldo da carteira',
      tab: 'wallet',
      icon: '<svg class="w-[23px] h-[23px] text-zinc-700" fill="none" stroke="currentColor" stroke-width="2.15" viewBox="0 0 24 24"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M12 8v8m-3-5h6a1.5 1.5 0 0 0 0-3H9a1.5 1.5 0 0 0 0 3h6a1.5 1.5 0 0 1 0 3H9"/></svg>'
    },
    {
      id: 'savethedate',
      title: 'Escolher Save the Date',
      desc: 'Garanta a data na agenda dos convidados',
      tab: 'edit-site',
      icon: '<svg class="w-[23px] h-[23px] text-zinc-700" fill="none" stroke="currentColor" stroke-width="2.15" viewBox="0 0 24 24"><rect width="18" height="12" x="3" y="6" rx="2"/><circle cx="8" cy="12" r="1.5"/><circle cx="16" cy="12" r="1.5"/></svg>'
    },
    {
      id: 'registry',
      title: 'Criar lista de presentes virtual',
      desc: 'Cadastre presentes em dinheiro ou cotas',
      tab: 'gifts',
      icon: '<svg class="w-[23px] h-[23px] text-zinc-700" fill="none" stroke="currentColor" stroke-width="2.15" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 8v13m0-13V6a2 2 0 1 1 2 2h-2zm0 0V5.5A2.5 2.5 0 1 0 9.5 8H12zm-7 4h14M5 12a2 2 0 1 1 0-4h14a2 2 0 1 1 0 4M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7"/></svg>'
    },
    {
      id: 'website',
      title: 'Personalizar site do evento',
      desc: 'Adicione fotos, história e contagem',
      tab: 'edit-site',
      icon: '<svg class="w-[23px] h-[23px] text-zinc-700" fill="none" stroke="currentColor" stroke-width="2.15" viewBox="0 0 24 24"><rect width="20" height="14" x="2" y="3" rx="2"/><line x1="8" x2="16" y1="21" y2="21"/><line x1="12" x2="12" y1="17" y2="21"/></svg>'
    },
    {
      id: 'guests',
      title: 'Cadastrar primeiros convidados',
      desc: 'Adicione os primeiros contatos para o RSVP',
      tab: 'rsvp',
      icon: '<svg class="w-[23px] h-[23px] text-zinc-700" fill="none" stroke="currentColor" stroke-width="2.15" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z"/></svg>'
    },
  ];

  function isQuickStartTaskAchieved(taskId, activeEvent) {
    if (!activeEvent) return false;
    try {
      const key = `love_quick_start_achieved_${activeEvent.id}`;
      const saved = JSON.parse(localStorage.getItem(key) || '[]');
      if (saved.includes(taskId)) return true;
    } catch (e) {}

    // Passos fixos (não vêm mais do Admin): cada um é riscado sozinho quando
    // a pessoa faz a ação na plataforma — além do registro acima, confere os
    // dados do próprio evento.
    switch (taskId) {
      case 'vendors': {
        // Primeiro serviço favoritado no Explorar.
        let favoritos = 0;
        try { favoritos = b2bFavoritosIds.size; } catch (e) { favoritos = 0; } // ainda não carregou
        return favoritos > 0;
      }
      case 'budget':
        return Boolean(
          activeEvent.budgetConfigured || 
          (activeEvent.budgetTotal && activeEvent.budgetTotal > 0) ||
          localStorage.getItem(`love_budget_configured_${activeEvent.id}`) === 'true'
        );
      case 'savethedate':
        return Boolean(activeEvent.saveTheDateChosen || activeEvent.hasSaveTheDate);
      case 'registry':
        // Primeiro presente na lista de presentes.
        return (activeEvent.giftList || []).length > 0;
      case 'website':
        // Primeira edição em Aparência (construtor do convite) — registrada
        // pelo site-builder.js ao mexer no convite.
        return Boolean(activeEvent.sitePersonalizado);
      case 'guests':
        // Primeiro convidado cadastrado.
        return (activeEvent.guests || []).length > 0;
      default:
        return false;
    }
  }

  window.markPlatformTaskAchieved = function(taskId) {
    const activeEvent = getActiveEvent();
    if (!activeEvent) return;
    try {
      const key = `love_quick_start_achieved_${activeEvent.id}`;
      const saved = JSON.parse(localStorage.getItem(key) || '[]');
      if (saved.includes(taskId)) return; // já riscado
      saved.push(taskId);
      localStorage.setItem(key, JSON.stringify(saved));
    } catch (e) {}
    renderQuickStartChecklist();
  };

  function renderQuickStartChecklist() {
    const listEl = document.getElementById('quick-start-tasks-list');
    const counterBadge = document.getElementById('quick-start-counter-badge');
    const progressBar = document.getElementById('quick-start-progress-bar');
    const allDoneBanner = document.getElementById('quick-start-all-done-banner');
    if (!listEl) return;

    const activeEvent = getActiveEvent();
    const total = quickStartTasksData.length;

    // Avalia quais tarefas foram alcançadas na plataforma
    const achievedTasks = quickStartTasksData.filter(t => isQuickStartTaskAchieved(t.id, activeEvent));
    const completedCount = achievedTasks.length;

    // Atualiza contador e barra de progresso verde
    if (counterBadge) counterBadge.textContent = `${completedCount}/${total}`;
    if (progressBar) {
      const percent = Math.round((completedCount / total) * 100);
      progressBar.style.width = `${percent}%`;
    }

    // Sem o card "Parabéns!" ao concluir as 6 tarefas: a lista toda marcada já basta.
    if (allDoneBanner) allDoneBanner.classList.add('hidden');

    listEl.innerHTML = quickStartTasksData.map((task) => {
      const isDone = isQuickStartTaskAchieved(task.id, activeEvent);
      const clickAction = isDone
        ? ''
        : (task.id === 'budget'
            ? 'onclick="navigateToBudget()"'
            : task.id === 'website'
            ? 'onclick="navigateToConviteDigital()"'
            : task.id === 'savethedate'
            ? 'onclick="navigateToSaveTheDate()"'
            : task.id === 'vendors'
            ? 'onclick="navigateToExplorarFornecedores()"'
            : `onclick="switchRailTab('${task.tab}')"`);
      return `
        <div class="group py-4 px-2.5 rounded-xl hover:bg-zinc-50 transition-all flex items-center justify-between ${isDone ? 'opacity-85' : 'cursor-pointer'}" ${clickAction} title="${isDone ? 'Tarefa alcançada pela plataforma' : 'Ir para ' + task.title}">
          <div class="flex items-center gap-3 min-w-0">
            <!-- Ícone da Categoria (sem fundo — mesmo tamanho/traço dos ícones do sidebar) -->
            <div class="flex items-center justify-center flex-shrink-0">
              ${isDone ? '<svg class="w-[23px] h-[23px] text-emerald-600" fill="none" stroke="currentColor" stroke-width="2.15" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="m4.5 12.75 6 6 9-13.5"/></svg>' : task.icon}
            </div>

            <!-- Título (Riscado automaticamente quando alcançado) -->
            <div class="min-w-0">
              <span class="text-xs sm:text-sm ${isDone ? 'line-through text-zinc-400 font-normal' : 'text-zinc-800 group-hover:text-zinc-950 font-medium'} truncate block transition-all font-sans">
                ${task.title}
              </span>
            </div>
          </div>

          <!-- Indicador à Direita: seta (o check já aparece no ícone à esquerda quando concluído) -->
          <div class="flex-shrink-0 pl-2">
            ${isDone ? '' : '<span class="text-zinc-400 group-hover:text-zinc-600 text-xs font-bold pl-1 font-sans">›</span>'}
          </div>
        </div>
      `;
    }).join('');
  }

  // ==========================================
  // 4.5 LISTA DE CONFIRMADOS NA HOME
  // ==========================================
  function renderHomeConfirmedGuests(searchKeyword = '') {
    const listEl = document.getElementById('home-confirmed-guests-list');
    const badgeEl = document.getElementById('home-confirmed-badge-count');
    if (!listEl) return;

    const activeEvent = getActiveEvent();
    const allConfirmed = (activeEvent.guests || []).filter(g => g.status === 'confirmed');

    if (badgeEl) {
      const totalConfirmedNumber = activeEvent.convidadosConfirmados || allConfirmed.length;
      badgeEl.textContent = `${totalConfirmedNumber} confirmados`;
    }

    const cleanSearch = searchKeyword.toLowerCase().trim();
    const filtered = allConfirmed.filter(g => {
      if (!cleanSearch) return true;
      const nameMatch = (g.name || '').toLowerCase().includes(cleanSearch);
      const phoneMatch = (g.phone || '').includes(cleanSearch);
      return nameMatch || phoneMatch;
    });

    if (filtered.length === 0) {
      listEl.innerHTML = `
        <div class="py-8 text-center text-zinc-400 space-y-1">
          <svg class="w-7 h-7 mx-auto text-zinc-300 stroke-[1.5]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"/>
          </svg>
          <p class="text-xs font-medium text-zinc-500">${cleanSearch ? 'Nenhum confirmado com este nome' : 'Nenhuma presença confirmada ainda'}</p>
        </div>
      `;
      return;
    }

    listEl.innerHTML = filtered.map(guest => {
      // Iniciais
      const parts = (guest.name || 'Convidado').trim().split(/\s+/);
      const initials = parts.length > 1 
        ? `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase() 
        : (parts[0][0] || 'C').toUpperCase();

      // Detalhe de acompanhantes
      let subtext = '';
      if (guest.adults || guest.children) {
        const adults = guest.adults || 1;
        const children = guest.children || 0;
        subtext = `${adults} adulto${adults > 1 ? 's' : ''}${children > 0 ? ` • ${children} criança${children > 1 ? 's' : ''}` : ''}`;
      } else if (guest.companions > 0) {
        subtext = `+${guest.companions} acompanhante${guest.companions > 1 ? 's' : ''}`;
      } else {
        subtext = 'Individual';
      }

      return `
        <div class="py-2.5 px-2 hover:bg-zinc-50 rounded-xl transition-colors flex items-center justify-between gap-3 group">
          <div class="flex items-center gap-3 min-w-0">
            <div class="w-8 h-8 rounded-full bg-blue-50 text-[#537bae] font-bold text-xs flex items-center justify-center flex-shrink-0 border border-blue-100/80">
              ${initials}
            </div>
            <div class="min-w-0">
              <p class="text-xs font-semibold text-zinc-900 truncate leading-tight group-hover:text-[#537bae] transition-colors">${guest.name}</p>
              <p class="text-[11px] text-zinc-400 truncate mt-0.5">${subtext}${guest.table ? ` • ${guest.table}` : ''}</p>
            </div>
          </div>
          <span class="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/80 flex-shrink-0">
            <span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            <span>Confirmado</span>
          </span>
        </div>
      `;
    }).join('');
  }

  // Listener para busca na lista de confirmados da Home
  const homeSearchConfirmedInput = document.getElementById('home-search-confirmed-input');
  if (homeSearchConfirmedInput) {
    homeSearchConfirmedInput.addEventListener('input', (e) => {
      renderHomeConfirmedGuests(e.target.value);
    });
  }

  // ==========================================
  // 5. EDITOR DA COMEMORAÇÃO & CRIADOR DE SITES (Aparência)
  // ==========================================
  let builderState = {
    buttonIconsStyle: 'animado',
    ornamentsStyle: 'nenhum',
    bgColor: '#FBFBFA',
    font: 'font-playfair',
    titleColor: '#18181B',
    titleSize: 36,
    titleBold: false,
    titleItalic: true,
    titleUnderline: false,
    titleAlign: 'center',
    descFont: 'font-sans',
    descColor: '#52525B',
    descSize: 14,
    descBold: false,
    descItalic: false,
    descUnderline: false,
    descAlign: 'center',
    gradientOpacity: 80,
    gradientColor: '#FBFBFA',
    coverImage: 'assets/wedding_hero_banner.jpg',
    bgImage: null,
    venueImage: 'assets/theme_garden.jpg',
    closingImage: 'assets/wedding_hero_banner.jpg',
    accentColor: '#FBFBFA',
    btnTextColor: '#18181B',
    btnRadius: 28,
    prefaces: [
      '"Um cordão de três dobras não se rompe com facilidade." (Eclesiastes 4:12)',
      'COM A BÊNÇÃO DE DEUS,'
    ],
    slots: [null, null, null, null],
    music: {
      tracks: [
        { url: 'https://www.youtube.com/watch?v=lp-EO5I60KA', placement: 'all' }
      ],
      autoplay: true
    }
  };

  const templatesPresets = {
    buxton: {
      bgColor: '#F4F1EA',
      font: 'font-playfair',
      titleColor: '#18181B',
      descFont: 'font-serif',
      descColor: '#52525B',
      gradientOpacity: 80,
      gradientColor: '#F4F1EA',
      coverImage: 'assets/theme_garden.jpg',
      accentColor: '#FBFBFA',
      headline: 'CONVIDAM VOCÊ PARA O SEU CASAMENTO',
      subtitle: 'Celebrando o amor em harmonia com a natureza.'
    },
    rose: {
      bgColor: '#FFF1F2',
      font: 'font-playfair',
      titleColor: '#881337',
      descFont: 'font-sans',
      descColor: '#4C0519',
      gradientOpacity: 80,
      gradientColor: '#FFF1F2',
      coverImage: 'assets/wedding_hero_banner.jpg',
      accentColor: '#5c7aaa',
      headline: 'CONVIDAM VOCÊ PARA O SEU CASAMENTO',
      subtitle: 'Um romance clássico sob o encanto das flores.'
    },
    terracota: {
      bgColor: '#FEF3C7',
      font: 'font-sans',
      titleColor: '#78350F',
      descFont: 'font-sans',
      descColor: '#92400E',
      gradientOpacity: 75,
      gradientColor: '#FEF3C7',
      coverImage: 'assets/orchid_luxury.jpg',
      accentColor: '#D97706',
      headline: 'CONVIDAM VOCÊ PARA O SEU CASAMENTO',
      subtitle: 'Aconchego, autenticidade e a celebração do nosso amor.'
    },
    dark: {
      bgColor: '#0F172A',
      font: 'font-cinzel',
      titleColor: '#FFFFFF',
      descFont: 'font-clean',
      descColor: '#E2E8F0',
      gradientOpacity: 85,
      gradientColor: '#0F172A',
      coverImage: 'assets/theme_dark.jpg',
      accentColor: '#537bae',
      headline: 'CONVIDAM VOCÊ PARA O SEU CASAMENTO',
      subtitle: 'Uma noite inesquecível de elegância e sofisticação.'
    },
    garden: {
      bgColor: '#F0FDF4',
      font: 'font-serif',
      titleColor: '#064E3B',
      descFont: 'font-sans',
      descColor: '#065F46',
      gradientOpacity: 75,
      gradientColor: '#F0FDF4',
      coverImage: 'assets/theme_garden.jpg',
      accentColor: '#059669',
      headline: 'CONVIDAM VOCÊ PARA O SEU CASAMENTO',
      subtitle: 'Dois corações que se unem com poesia e afeto.'
    }
  };

  function switchEditorSubSection(subId, subLabel) {
    state.activeSubSection = subId;

    const title = document.getElementById('editor-active-sub-title');
    const desc = document.getElementById('editor-active-sub-desc');
    const btnTemplate = document.getElementById('btn-open-template-modal');

    // Sincroniza as abas horizontais do painel
    document.querySelectorAll('.editor-sub-tab-btn').forEach(tab => {
      const tabKey = tab.getAttribute('data-editor-tab');
      if (tabKey === subId) {
        tab.className = 'editor-sub-tab-btn active pb-3 border-b-2 border-[#537bae] text-zinc-900 font-semibold text-xs sm:text-sm whitespace-nowrap transition-all cursor-pointer';
      } else {
        tab.className = 'editor-sub-tab-btn pb-3 border-b-2 border-transparent text-zinc-500 hover:text-zinc-800 hover:border-zinc-300 font-medium text-xs sm:text-sm whitespace-nowrap transition-all cursor-pointer';
      }
    });

    // O botão "Usar template" deve aparecer SOMENTE no menu "Aparência"
    if (btnTemplate) {
      if (subId === 'home') {
        btnTemplate.classList.remove('hidden');
      } else {
        btnTemplate.classList.add('hidden');
      }
    }

    if (desc) desc.remove();

    if (title) {
      if (subId === 'home') {
        title.textContent = 'Aparência';
      } else if (subId === 'data') {
        title.textContent = 'Informações';
        setTimeout(() => ajustarTextosAutomaticos(document.getElementById('editor-form-data') || document), 0);
      } else if (subId === 'about') {
        title.textContent = 'Organizadores';
        renderHostsTeam();
      } else if (subId === 'invite-online') {
        title.textContent = 'Convite online';
        renderOnlineInvitesTable();
      } else if (subId === 'invite-print') {
        title.textContent = 'Produzir convite';
      } else {
        title.textContent = subLabel || 'Personalizar';
      }
    }

    // O botão salvar alterações no rodapé da prévia foi removido
    const previewSaveContainer = document.getElementById('preview-save-btn-container');
    if (previewSaveContainer) {
      previewSaveContainer.classList.add('hidden');
    }

    // O botão salvar alterações fica sempre à direita do título (Aparência, Informações, etc.)
    const headerSaveContainer = document.getElementById('editor-header-save-container');
    if (headerSaveContainer) {
      headerSaveContainer.classList.remove('hidden');
    }

    // Organizadores não tem prévia ao lado: só a tabela, na largura toda.
    document.body.classList.toggle('organizadores-sem-previa', subId === 'about');

    // Oculta todos os sub-formulários e exibe o selecionado
    document.querySelectorAll('.editor-sub-panel').forEach(panel => panel.classList.add('hidden'));
    const targetPanel = document.getElementById(`editor-form-${subId}`);
    if (targetPanel) targetPanel.classList.remove('hidden');

    // Aba "Aparência" usa o construtor visual (Elementos + Prévia); as demais abas usam o editor clássico
    const classicWrapper = document.querySelector('#tab-edit-site > .editor-split-wrapper');
    const builderRoot = document.getElementById('site-builder-root');
    const classicToolbar = document.getElementById('classic-editor-toolbar');
    if (subId === 'home') {
      if (classicWrapper) classicWrapper.style.setProperty('display', 'none', 'important');
      if (builderRoot) builderRoot.style.display = '';
      if (classicToolbar) classicToolbar.style.setProperty('display', 'none', 'important');
    } else {
      if (builderRoot) builderRoot.style.setProperty('display', 'none', 'important');
      if (classicWrapper) classicWrapper.style.setProperty('display', 'flex', 'important');
      if (classicToolbar) classicToolbar.style.setProperty('display', 'flex', 'important');
    }

    // Em "Informações" e "Anfitriões", a prévia usa o mesmo motor de renderização
    // do Convite Digital (reflete o conteúdo real criado em Aparência: imagem,
    // cores, textos), no lugar da antiga prévia estática de exemplo.
    const classicBuilderPreview = document.getElementById('classic-builder-preview');
    const coverImageWrapper = document.getElementById('cover-image-section-wrapper');
    const livePreviewBody = document.getElementById('live-preview-body');
    if (subId === 'data' || subId === 'about') {
      if (coverImageWrapper) coverImageWrapper.classList.add('hidden');
      if (livePreviewBody) livePreviewBody.classList.add('hidden');
      if (classicBuilderPreview) {
        classicBuilderPreview.classList.remove('hidden');
        // site-builder.js redesenha a prévia certa quando o convite chega do banco.
        classicBuilderPreview.dataset.previa = subId;
      }
      if (subId === 'data' && typeof renderInformacoesPreview === 'function') {
        renderInformacoesPreview();
      } else if (subId === 'about' && typeof renderAnfitrioesPreview === 'function') {
        renderAnfitrioesPreview();
      }
    } else {
      if (coverImageWrapper) coverImageWrapper.classList.remove('hidden');
      if (livePreviewBody) livePreviewBody.classList.remove('hidden');
      if (classicBuilderPreview) classicBuilderPreview.classList.add('hidden');
    }

    // Alterna a prévia ao vivo: no submenu "about" (Anfitriões), exibe como se parece a página de anfitriões (capa no início, 2 campos de título/texto, quem são os anfitriões, SEM botões)
    const mainPreviewContent = document.getElementById('live-preview-main-content');
    const hostsPreviewContent = document.getElementById('live-preview-hosts-content');

    if (subId === 'about') {
      if (mainPreviewContent) mainPreviewContent.classList.add('hidden');
      if (hostsPreviewContent) hostsPreviewContent.classList.remove('hidden');
      updateHostsPreview();
    } else {
      if (mainPreviewContent) mainPreviewContent.classList.remove('hidden');
      if (hostsPreviewContent) hostsPreviewContent.classList.add('hidden');
    }
  }

  function updateHostsPreview() {
    const titleEl = document.getElementById('live-preview-hosts-title');
    const descEl = document.getElementById('live-preview-hosts-desc');
    const listEl = document.getElementById('live-preview-hosts-list');
    const inputTitle = document.getElementById('editor-about-title');
    const inputDesc = document.getElementById('editor-about-text');

    const activeEvent = getActiveEvent();

    if (titleEl) {
      const val = (inputTitle && inputTitle.value.trim()) || activeEvent?.siteSections?.aboutTitle || 'Sobre os Anfitriões & Nossa História';
      titleEl.textContent = val;
      titleEl.className = `text-xl sm:text-2xl font-bold tracking-tight leading-snug italic ${builderState.font || 'font-serif'}`;
      titleEl.style.setProperty('color', builderState.titleColor || '#18181B', 'important');
    }

    if (descEl) {
      const descVal = (inputDesc && inputDesc.value.trim()) || activeEvent?.siteSections?.aboutText || 'Conte aos convidados sobre os anfitriões a história dessa celebração.';
      descEl.textContent = descVal;
      const descFontMap = {
        'font-sans': "'Inter', sans-serif",
        'font-serif': "'EB Garamond', Georgia, serif",
        'font-cormorant': "'Cormorant Garamond', Georgia, serif",
        'font-cinzel': "'Cinzel', serif",
        'font-lora': "'Lora', Georgia, serif",
        'font-montserrat': "'Montserrat', sans-serif"
      };
      const actualDescFamily = descFontMap[builderState.descFont] || "'Inter', sans-serif";
      descEl.style.setProperty('font-family', actualDescFamily, 'important');
      descEl.style.setProperty('color', builderState.descColor || '#52525B', 'important');
    }

    if (listEl) {
      const hostsTeamItems = document.querySelectorAll('#hosts-team-list > div');
      if (hostsTeamItems && hostsTeamItems.length > 0) {
        listEl.innerHTML = Array.from(hostsTeamItems).map(item => {
          const nameEl = item.querySelector('p.font-bold');
          const avatarEl = item.querySelector('.rounded-full');
          const badgeEl = item.querySelector('span');

          const nameText = nameEl ? (nameEl.childNodes[0]?.textContent?.trim() || nameEl.textContent?.trim()) : 'Anfitrião';
          const initials = avatarEl ? avatarEl.textContent.trim() : nameText.substring(0, 2).toUpperCase();
          const roleText = badgeEl ? badgeEl.textContent.trim() : 'Anfitrião';
          const isCreator = roleText.includes('Criador');

          return `
            <div class="p-3 rounded-xl bg-white border border-zinc-200/80 shadow-2xs flex items-center gap-3">
              <div class="w-10 h-10 rounded-full ${isCreator ? 'bg-[#537bae]' : 'bg-zinc-800'} text-white font-bold text-xs flex items-center justify-center shrink-0">
                ${initials}
              </div>
              <div class="min-w-0 flex-1">
                <p class="text-xs font-bold text-zinc-900 truncate">${nameText}</p>
                <span class="inline-block text-[10px] font-semibold ${isCreator ? 'text-[#537bae] bg-blue-50 border-blue-100' : 'text-zinc-700 bg-zinc-100 border-zinc-200'} px-2 py-0.5 rounded-md border mt-0.5">${roleText}</span>
              </div>
            </div>
          `;
        }).join('');
      } else {
        listEl.innerHTML = `
          <div class="p-3 rounded-xl bg-white border border-zinc-200/80 shadow-2xs flex items-center gap-3">
            <div class="w-10 h-10 rounded-full bg-[#537bae] text-white font-bold text-xs flex items-center justify-center shrink-0">
              BS
            </div>
            <div class="min-w-0 flex-1">
              <p class="text-xs font-bold text-zinc-900 truncate">Beatriz Silveira</p>
              <span class="inline-block text-[10px] font-semibold text-[#537bae] bg-blue-50 border-blue-100 px-2 py-0.5 rounded-md border mt-0.5">Criador(a)</span>
            </div>
          </div>
          <div class="p-3 rounded-xl bg-white border border-zinc-200/80 shadow-2xs flex items-center gap-3">
            <div class="w-10 h-10 rounded-full bg-zinc-800 text-white font-bold text-xs flex items-center justify-center shrink-0">
              LM
            </div>
            <div class="min-w-0 flex-1">
              <p class="text-xs font-bold text-zinc-900 truncate">Lucas Mendonça</p>
              <span class="inline-block text-[10px] font-semibold text-zinc-700 bg-zinc-100 border-zinc-200 px-2 py-0.5 rounded-md border mt-0.5">Anfitrião</span>
            </div>
          </div>
        `;
      }
    }
  }
  window.updateHostsPreview = updateHostsPreview;

  // Listener de clique para as abas horizontais e itens da sub-sidebar do painel de personalização
  document.addEventListener('click', (e) => {
    const tabBtn = e.target.closest('.editor-sub-tab-btn');
    if (tabBtn) {
      const tabId = tabBtn.getAttribute('data-editor-tab');
      const tabLabel = tabBtn.textContent.trim();
      if (tabId) {
        switchEditorSubSection(tabId, tabLabel);
      }
    }

    const drawerItem = e.target.closest('.sub-drawer-item');
    if (drawerItem && drawerItem.hasAttribute('data-sub-id')) {
      const subId = drawerItem.getAttribute('data-sub-id');
      const subLabel = drawerItem.querySelector('span') ? drawerItem.querySelector('span').textContent.trim() : '';
      if (drawerItem.closest('#drawer-sub-items-list')) {
        const subDrawerList = drawerItem.closest('#drawer-sub-items-list');
        const applySubTabSwitch = () => {
          subDrawerList.querySelectorAll('.sub-drawer-item').forEach(b => b.classList.remove('active'));
          drawerItem.classList.add('active');
          switchEditorSubSection(subId, subLabel);
        };
        if (state.currentTab === 'edit-site' || !state.currentTab) {
          // Saindo da Aparência (construtor visual): avisa se houver alterações não salvas
          if (subId !== 'home' && state.activeSubSection === 'home' && window.builderConfirmLeaveIfDirty) {
            window.builderConfirmLeaveIfDirty(applySubTabSwitch);
          } else {
            applySubTabSwitch();
          }
        }
      }
    }
  });

  function cleanSlug(str) {
    return (str || '')
      .toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9-]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  }

  function validateSlugAvailability(slug, currentEventId) {
    const statusBadge = document.getElementById('editor-url-status-badge');
    const helperText = document.getElementById('editor-url-helper-text');
    const statusIcon = document.getElementById('editor-url-status-icon');
    const inputWrapper = document.getElementById('editor-slug-input-wrapper');
    
    const cleaned = cleanSlug(slug);

    if (!cleaned || cleaned.length < 3) {
      if (statusIcon) {
        statusIcon.innerHTML = '';
      }
      if (statusBadge) {
        statusBadge.className = 'px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 font-bold text-xs border border-amber-200 flex items-center gap-1.5';
        statusBadge.innerHTML = `
          <svg class="w-3.5 h-3.5 text-amber-600" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"/>
          </svg>
          <span>Mínimo 3 letras</span>
        `;
      }
      if (inputWrapper) {
        inputWrapper.classList.remove('border-rose-400', 'border-emerald-400', 'focus-within:ring-rose-400');
        inputWrapper.classList.add('border-zinc-200');
      }
      if (helperText) {
        helperText.textContent = 'O link deve ter pelo menos 3 caracteres.';
        helperText.className = 'text-[11px] text-amber-600 font-medium';
      }
      return { available: false, slug: cleaned };
    }

    // Lista de slugs já ocupados (outros eventos no database e palavras reservadas do sistema)
    // Inclui as rotas do próprio site: love.com.br/<slug> abre o convite, então
    // um evento não pode ter o mesmo nome de uma página da plataforma.
    const reservedSlugs = ['admin', 'login', 'register', 'dashboard', 'api', 'help', 'suporte', 'termos', 'privacidade', 'app', 'beatriz', 'lucas', 'casamento', 'evento',
      'cadastro', 'resetar-senha', 'convite-preview', 'privacidade', 'politica-de-privacidade', 'personalizar', 'presentes', 'convidados', 'carteira', 'fornecedores', 'notificacoes', 'duvidas', 'central-de-ajuda', 'configuracoes', 'organizador', 'blog', 'assets', 'css', 'js', 'lib'];
    const existsInOtherEvents = state.events.some(ev => ev.id !== currentEventId && ev.slug === cleaned);
    const isReserved = reservedSlugs.includes(cleaned);

    if (existsInOtherEvents || isReserved) {
      if (statusIcon) {
        statusIcon.innerHTML = `
          <div class="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-rose-50 text-rose-500 border border-rose-200 flex items-center justify-center shadow-2xs animate-in fade-in duration-200" title="URL já utilizada">
            <svg class="w-3 h-3 sm:w-3.5 sm:h-3.5 pointer-events-none" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </div>
        `;
      }
      if (inputWrapper) {
        inputWrapper.classList.add('border-rose-400');
        inputWrapper.classList.remove('border-zinc-200', 'border-emerald-400');
      }
      if (statusBadge) {
        statusBadge.className = 'px-2.5 py-1 rounded-full bg-rose-50 text-rose-700 font-bold text-xs border border-rose-200 flex items-center gap-1.5';
        statusBadge.innerHTML = `
          <svg class="w-3.5 h-3.5 text-rose-600" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/>
          </svg>
          <span>Indisponível</span>
        `;
      }
      if (helperText) {
        helperText.textContent = 'essa url ja esta sendo usada, por favor escolha outra.';
        helperText.className = 'text-[11px] text-rose-600 font-medium';
      }
      return { available: false, slug: cleaned };
    }

    // Slug liberado / sem uso no database
    if (statusIcon) {
      statusIcon.innerHTML = `
        <div class="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center shadow-2xs animate-in fade-in duration-200" title="URL disponível">
          <svg class="w-3 h-3 sm:w-3.5 sm:h-3.5 pointer-events-none" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5"/>
          </svg>
        </div>
      `;
    }
    if (inputWrapper) {
      inputWrapper.classList.add('border-emerald-400');
      inputWrapper.classList.remove('border-rose-400', 'border-zinc-200');
    }
    if (statusBadge) {
      statusBadge.className = 'px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 font-bold text-xs border border-emerald-200 flex items-center gap-1.5';
      statusBadge.innerHTML = `
        <svg class="w-3.5 h-3.5 text-emerald-600" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5"/>
        </svg>
        <span>Disponível</span>
      `;
    }
    if (helperText) {
      helperText.textContent = `Perfeito! Seu site ficará acessível em: love.com.br/${cleaned}`;
      helperText.className = 'text-[11px] text-emerald-600 font-medium';
    }
    return { available: true, slug: cleaned };
  }

  function renderEditorPrefaces() {
    const listEl = document.getElementById('editor-prefaces-list');
    if (!listEl) return;
    listEl.innerHTML = '';

    if (!builderState.prefaces || builderState.prefaces.length === 0) {
      builderState.prefaces = [
        '"Um cordão de três dobras não se rompe com facilidade." (Eclesiastes 4:12)',
        'COM A BÊNÇÃO DE DEUS,'
      ];
    }

    builderState.prefaces.forEach((prefaceText, idx) => {
      const row = document.createElement('div');
      row.className = 'flex items-center gap-2';
      row.innerHTML = `
        <div class="flex-1 relative">
          <input type="text" value="${prefaceText.replace(/"/g, '&quot;')}" placeholder="Ex: 'Um cordão de três dobras...' ou 'Com a bênção de Deus,'" class="preface-input-field w-full text-xs p-2.5 rounded-xl border border-zinc-200 bg-white focus:outline-none focus:ring-2 focus:ring-[#537bae] text-zinc-800 font-medium" data-index="${idx}">
        </div>
        ${builderState.prefaces.length > 1 ? `
          <button type="button" class="btn-remove-preface p-2.5 rounded-xl border border-zinc-200 hover:border-rose-300 hover:bg-rose-50 text-zinc-400 hover:text-rose-600 transition-colors flex-shrink-0 cursor-pointer" title="Remover esta epígrafe" data-index="${idx}">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        ` : ''}
      `;

      const inputEl = row.querySelector('.preface-input-field');
      if (inputEl) {
        inputEl.addEventListener('input', (e) => {
          builderState.prefaces[idx] = e.target.value;
          updateLiveSitePreview();
        });
      }

      const btnRemove = row.querySelector('.btn-remove-preface');
      if (btnRemove) {
        btnRemove.addEventListener('click', () => {
          builderState.prefaces.splice(idx, 1);
          renderEditorPrefaces();
          updateLiveSitePreview();
        });
      }

      listEl.appendChild(row);
    });
  }

  // Listener para botão "+ Adicionar Prefácio"
  const btnAddPreface = document.getElementById('btn-add-preface-item');
  if (btnAddPreface) {
    btnAddPreface.addEventListener('click', () => {
      if (!builderState.prefaces) builderState.prefaces = [];
      builderState.prefaces.push('');
      renderEditorPrefaces();
      updateLiveSitePreview();
      setTimeout(() => {
        const inputs = document.querySelectorAll('.preface-input-field');
        if (inputs.length) inputs[inputs.length - 1].focus();
      }, 50);
    });
  }

  // =========================================================================
  // GESTÃO DE MÚSICA DO EVENTO (URL do YouTube, Onde Tocar, Autoplay e Player)
  // =========================================================================
  let isMusicPlaying = false;

  function renderMusicTracks() {
    const container = document.getElementById('music-tracks-container');
    if (!container) return;

    if (!builderState.music) {
      builderState.music = {
        tracks: [{ url: 'https://www.youtube.com/watch?v=lp-EO5I60KA', placement: 'all' }],
        autoplay: true
      };
    }
    if (!Array.isArray(builderState.music.tracks) || builderState.music.tracks.length === 0) {
      builderState.music.tracks = [{ url: '', placement: 'all' }];
    }

    container.innerHTML = '';

    builderState.music.tracks.forEach((track, idx) => {
      const row = document.createElement('div');
      row.className = 'music-track-row flex flex-col sm:flex-row items-start gap-2 sm:gap-3 p-3 bg-zinc-50/70 border border-[#EAEAEA] rounded relative';

      const colUrl = document.createElement('div');
      colUrl.className = 'flex-1 w-full flex flex-col justify-start';
      colUrl.innerHTML = `
        <label class="block text-[10px] sm:text-[11px] font-bold uppercase text-zinc-500 tracking-wider font-sans mb-1 leading-4">URL DO VÍDEO</label>
        <input type="text" class="music-track-url w-full px-3 py-2 text-xs border border-[#EAEAEA] rounded bg-white focus:outline-none focus:border-[#537bae] text-zinc-800 placeholder:text-zinc-400 font-sans" placeholder="Ex: https://www.youtube.com/watch?v=XXXXXX" data-track-index="${idx}">
        <span class="text-[10px] text-zinc-400 block font-sans mt-1 leading-4">Ex: https://www.youtube.com/watch?v=XXXXXX</span>
      `;
      const inputUrl = colUrl.querySelector('input');
      inputUrl.value = track.url || '';

      const colPlacement = document.createElement('div');
      colPlacement.className = 'w-full sm:w-56 flex flex-col justify-start';
      colPlacement.innerHTML = `
        <label class="block text-[10px] sm:text-[11px] font-bold uppercase text-zinc-500 tracking-wider font-sans mb-1 leading-4">ONDE TOCAR *</label>
        <div class="relative">
          <select class="music-track-placement w-full px-3 py-2 text-xs border border-[#EAEAEA] rounded bg-white focus:outline-none focus:border-[#537bae] text-zinc-800 cursor-pointer appearance-none pr-7 font-sans" data-track-index="${idx}">
            <option value="all">Todas as páginas</option>
            <option value="localizacao">Localização</option>
            <option value="lista_presentes">Lista de presentes</option>
            <option value="anfitrioes">Anfitriões</option>
            <option value="confirmacao_presenca">Confirmação de presença</option>
            <option value="dress_code">Dress code</option>
          </select>
          <div class="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-400">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5"/></svg>
          </div>
        </div>
        <span class="text-[10px] block font-sans mt-1 leading-4 invisible select-none">&nbsp;</span>
      `;
      const selectPlacement = colPlacement.querySelector('select');
      selectPlacement.value = track.placement || 'all';

      const btnRemove = document.createElement('button');
      btnRemove.type = 'button';
      btnRemove.className = 'btn-remove-music-track self-end sm:self-start text-zinc-400 hover:text-red-500 transition-colors p-1.5 cursor-pointer sm:mt-[23px]';
      btnRemove.setAttribute('data-track-index', idx);
      btnRemove.setAttribute('title', 'Remover música');
      btnRemove.innerHTML = `<svg class="w-4 h-4 pointer-events-none" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>`;

      row.appendChild(colUrl);
      row.appendChild(colPlacement);
      row.appendChild(btnRemove);
      container.appendChild(row);
    });

    const toggleAutoplay = document.getElementById('music-autoplay-toggle');
    if (toggleAutoplay) {
      toggleAutoplay.checked = builderState.music.autoplay !== false;
    }

    updateFloatingMusicWidget();
  }

  function getYouTubeVideoId(url) {
    if (!url) return null;
    const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/);
    return match ? match[1] : null;
  }

  // Link da música da prévia: o campo "Adicionar música" de Informações (ou o
  // que já está salvo no evento) — o mesmo que o convite publicado toca.
  function linkDaMusicaDaPrevia() {
    const campo = document.getElementById('editor-data-music');
    const ev = getActiveEvent();
    const link = (campo && campo.value.trim()) || (ev && ev.eventDetails && ev.eventDetails.musicUrl) || '';
    return idDoVideoYoutube(link) ? link : '';
  }

  function updateFloatingMusicWidget() {
    const widget = document.getElementById('live-preview-floating-music');
    if (!widget) return;
    if (!linkDaMusicaDaPrevia()) {
      widget.classList.add('hidden');
      return;
    }
    widget.classList.remove('hidden');
    // Mesmo visual do convite publicado: nota normal tocando, riscada pausada.
    widget.classList.toggle('is-tocando', !!isMusicPlaying);
    widget.title = isMusicPlaying ? 'Pausar música' : 'Tocar música';
  }

  // Prévia do editor: o botão de música só alterna o visual (tocando ×
  // pausado), igual ao do convite publicado. Não toca som aqui dentro da
  // plataforma — a música toca só no site publicado, no navegador do convidado.
  function toggleLiveMusic() {
    if (!linkDaMusicaDaPrevia()) return;
    isMusicPlaying = !isMusicPlaying;
    const iframe = document.getElementById('youtube-audio-iframe');
    if (iframe && iframe.src) iframe.src = '';
    updateFloatingMusicWidget();
  }

  // Listener para Botão "+ Adicionar música"
  const btnAddMusic = document.getElementById('btn-add-music-track');
  if (btnAddMusic) {
    btnAddMusic.addEventListener('click', () => {
      if (!builderState.music) builderState.music = { tracks: [], autoplay: true };
      builderState.music.tracks.push({ url: '', placement: 'all' });
      renderMusicTracks();
      const activeEv = getActiveEvent();
      if (activeEv) activeEv.music = builderState.music;
      setTimeout(() => {
        const inputs = document.querySelectorAll('.music-track-url');
        if (inputs.length) inputs[inputs.length - 1].focus();
      }, 50);
    });
  }

  // Delegação de eventos para inputs, selects, exclusão e player flutuante
  document.addEventListener('input', (e) => {
    if (e.target.classList.contains('music-track-url')) {
      const idx = parseInt(e.target.dataset.trackIndex, 10);
      if (builderState.music?.tracks?.[idx]) {
        builderState.music.tracks[idx].url = e.target.value.trim();
        const activeEv = getActiveEvent();
        if (activeEv) activeEv.music = builderState.music;
        updateFloatingMusicWidget();
      }
    }
  });

  document.addEventListener('change', (e) => {
    if (e.target.classList.contains('music-track-placement')) {
      const idx = parseInt(e.target.dataset.trackIndex, 10);
      if (builderState.music?.tracks?.[idx]) {
        builderState.music.tracks[idx].placement = e.target.value;
        const activeEv = getActiveEvent();
        if (activeEv) activeEv.music = builderState.music;
      }
    }
    if (e.target.id === 'music-autoplay-toggle') {
      if (builderState.music) {
        builderState.music.autoplay = e.target.checked;
        const activeEv = getActiveEvent();
        if (activeEv) activeEv.music = builderState.music;
      }
    }
  });

  document.addEventListener('click', (e) => {
    const btnRemove = e.target.closest('.btn-remove-music-track');
    if (btnRemove) {
      const idx = parseInt(btnRemove.dataset.trackIndex, 10);
      if (builderState.music?.tracks) {
        builderState.music.tracks.splice(idx, 1);
        if (builderState.music.tracks.length === 0) {
          builderState.music.tracks.push({ url: '', placement: 'all' });
        }
        renderMusicTracks();
        const activeEv = getActiveEvent();
        if (activeEv) activeEv.music = builderState.music;
      }
      return;
    }

    const floatMusicBtn = e.target.closest('#live-preview-floating-music');
    if (floatMusicBtn) {
      toggleLiveMusic();
    }
  });

  function updateTitleFontSelectDisplay(val) {
    const sel = document.getElementById('editor-select-title-font');
    if (!sel) return;
    let fontClass = val || 'font-playfair';
    if (fontClass === 'font-serif-title') fontClass = 'font-playfair';
    if (fontClass === 'font-serif') fontClass = 'font-garamond';
    if (fontClass === 'font-modern') fontClass = 'font-outfit';
    if (fontClass === 'font-clean') fontClass = 'font-inter';
    if (fontClass === 'font-sans') fontClass = 'font-inter';
    
    sel.value = fontClass;
    if (!sel.value) sel.value = 'font-playfair';
    
    const fontMap = {
      'font-playfair': "'Playfair Display', Georgia, serif",
      'font-garamond': "'EB Garamond', Garamond, serif",
      'font-cormorant': "'Cormorant Garamond', Georgia, serif",
      'font-avermont': "'Avermont House', 'Avermont', 'Playfair Display', Georgia, serif",
      'font-bride': "'Bride', 'Ephesis', cursive",
      'font-bludhaven': "'Bludhaven', 'Cinzel', serif",
      'font-fleur': "'Fleur De Leah', cursive",
      'font-ephesis': "'Ephesis', cursive",
      'font-hurricane': "'Hurricane', cursive",
      'font-cookie': "'Cookie', cursive",
      'font-italiana': "'Italiana', Georgia, serif",
      'font-bodoni': "'Bodoni Moda', Georgia, serif",
      'font-cinzel': "'Cinzel', serif",
      'font-lora': "'Lora', Georgia, serif",
      'font-outfit': "'Outfit', sans-serif",
      'font-montserrat': "'Montserrat', sans-serif",
      'font-inter': "'Inter', sans-serif"
    };
    if (fontMap[sel.value]) {
      sel.style.setProperty('font-family', fontMap[sel.value], 'important');
    }
  }

  function updateDescFontSelectDisplay(val) {
    const sel = document.getElementById('editor-select-desc-font');
    if (!sel) return;
    let fontClass = val || 'font-sans';
    if (fontClass === 'font-clean') fontClass = 'font-clean';
    if (fontClass === 'font-inter') fontClass = 'font-sans';
    sel.value = fontClass;
    if (!sel.value) sel.value = 'font-sans';
    
    const descFontMap = {
      'font-sans': "'Inter', sans-serif",
      'font-serif': "'EB Garamond', Garamond, serif",
      'font-cormorant': "'Cormorant Garamond', Georgia, serif",
      'font-cinzel': "'Cinzel', serif",
      'font-lora': "'Lora', Georgia, serif",
      'font-montserrat': "'Montserrat', sans-serif",
      'font-sans-title': "'Outfit', sans-serif",
      'font-clean': "'Outfit', sans-serif"
    };
    if (descFontMap[sel.value]) {
      sel.style.setProperty('font-family', descFontMap[sel.value], 'important');
    }
  }

  // Retorna a imagem de capa padrão inteligente de acordo com o tipo/tema do evento
  function getDefaultCoverForEventType(typeKey = '', typeLabel = '') {
    const t = `${typeKey || ''} ${typeLabel || ''}`.toLowerCase();
    if (t.includes('birthday') || t.includes('anivers') || t.includes('niver')) {
      return 'assets/criar-aniversario.jpg?v=20261019b';
    }
    if (t.includes('baby') || t.includes('bebe') || t.includes('bebê')) {
      return 'assets/criar-cha-de-bebe.jpg';
    }
    if (t.includes('bridal') || t.includes('panela')) {
      return 'assets/criar-cha-de-panela.jpg';
    }
    if (t.includes('reveal') || t.includes('revelacao') || t.includes('revelação')) {
      return 'assets/criar-revelacao.jpg';
    }
    if (t.includes('anniversary') || t.includes('bodas')) {
      return 'assets/criar-bodas.jpg';
    }
    return 'assets/criar-casamento.jpg';
  }

  function renderEditorForm() {
    const activeEvent = getActiveEvent();
    if (!activeEvent) return;
    
    // Inputs do formulário
    const inputTitle = document.getElementById('editor-event-title');
    const inputSlug = document.getElementById('editor-event-slug');
    const inputDate = document.getElementById('editor-event-date');
    const inputLocation = document.getElementById('editor-event-location');
    const inputHeadline = document.getElementById('editor-hero-headline');
    const inputSubtitle = document.getElementById('editor-hero-subtitle');
    const inputAbout = document.getElementById('editor-about-text');
    const inputInvite = document.getElementById('editor-invite-text');

    if (inputTitle) inputTitle.value = activeEvent.title;
    if (inputSlug) {
      inputSlug.value = activeEvent.slug || '';
      validateSlugAvailability(activeEvent.slug, activeEvent.id);
    }
    if (inputDate) inputDate.value = activeEvent.date;
    if (inputLocation) inputLocation.value = activeEvent.location;
    if (inputHeadline) inputHeadline.value = activeEvent.siteSections?.heroHeadline || 'CONVIDAM VOCÊ PARA O SEU CASAMENTO';
    if (inputSubtitle) inputSubtitle.value = activeEvent.siteSections?.heroSubtitle || 'A REALIZAR-SE';
    const inputAboutTitle = document.getElementById('editor-about-title');
    if (inputAboutTitle) inputAboutTitle.value = activeEvent.siteSections?.aboutTitle || 'Sobre os Anfitriões & Nossa História';
    if (inputAbout) inputAbout.value = activeEvent.siteSections?.aboutText || '';
    if (inputInvite) inputInvite.value = activeEvent.siteSections?.inviteText || '';

    const inputOnlineTitle = document.getElementById('editor-online-invite-title');
    const inputOnlineMsg = document.getElementById('editor-online-invite-msg');
    const inputOnlineDresscode = document.getElementById('editor-online-invite-dresscode');
    const inputOnlineRsvp = document.getElementById('editor-online-invite-rsvp-deadline');

    if (inputOnlineTitle && activeEvent.onlineInvite?.title) inputOnlineTitle.value = activeEvent.onlineInvite.title;
    if (inputOnlineMsg && activeEvent.onlineInvite?.message) inputOnlineMsg.value = activeEvent.onlineInvite.message;
    if (inputOnlineDresscode && activeEvent.onlineInvite?.dresscode) inputOnlineDresscode.value = activeEvent.onlineInvite.dresscode;
    if (inputOnlineRsvp && activeEvent.onlineInvite?.rsvpDeadline) inputOnlineRsvp.value = activeEvent.onlineInvite.rsvpDeadline;

    builderState.prefaces = [...(activeEvent.prefaces && activeEvent.prefaces.length ? activeEvent.prefaces : [
      '"Um cordão de três dobras não se rompe com facilidade." (Eclesiastes 4:12)',
      'COM A BÊNÇÃO DE DEUS,'
    ])];
    renderEditorPrefaces();

    if (activeEvent.slots && Array.isArray(activeEvent.slots) && activeEvent.slots.some(s => s !== null)) {
      builderState.slots = JSON.parse(JSON.stringify(activeEvent.slots));
      while (builderState.slots.length < 6) {
        if (builderState.slots.length === 4) {
          builderState.slots.push({ type: 'title', content: 'Esperamos por você!', bend: 0 });
        } else if (builderState.slots.length === 5) {
          builderState.slots.push({ type: 'text', content: 'Sua presença tornará nosso dia ainda mais especial.', bend: 0 });
        } else {
          builderState.slots.push(null);
        }
      }
    } else {
      builderState.slots = [
        { type: 'text', content: '"Um cordão de três dobras não se rompe com facilidade." (Eclesiastes 4:12)', bend: 0 },
        { type: 'text', content: 'COM A BÊNÇÃO DE DEUS,', bend: 0 },
        { type: 'title', content: activeEvent.title || 'Beatriz & Lucas', bend: 0 },
        { type: 'text', content: 'CONVIDAM VOCÊ PARA O SEU CASAMENTO', bend: 0 },
        { type: 'title', content: 'Esperamos por você!', bend: 0 },
        { type: 'text', content: 'Sua presença tornará nosso dia ainda mais especial.', bend: 0 }
      ];
    }

    if (activeEvent.music) {
      builderState.music = JSON.parse(JSON.stringify(activeEvent.music));
    }
    renderMusicTracks();

    // Nome do evento, exibido na sub-seção "Informações" antes do endereço do site
    const inputDataEventName = document.getElementById('editor-data-event-name');
    if (inputDataEventName) inputDataEventName.value = activeEvent.title || '';

    // Renderiza dados detalhados na sub-seção "Informações"
    if (activeEvent.eventDetails) {
      const inputDataDate = document.getElementById('editor-data-date');
      const inputDataTime = document.getElementById('editor-data-time');
      const inputDataEndDate = document.getElementById('editor-data-end-date');
      const inputDataEndTime = document.getElementById('editor-data-end-time');
      const inputDataLocation = document.getElementById('editor-data-location');
      const inputDataAddress = document.getElementById('editor-data-address');
      const inputDataReference = document.getElementById('editor-data-reference');
      const inputDataDresscode = document.getElementById('editor-data-dresscode');
      const inputDataRecommended = document.getElementById('editor-data-recommended');
      const inputDataNotRecommended = document.getElementById('editor-data-not-recommended');
      const inputDataGeneralInfo = document.getElementById('editor-data-general-info');

      if (inputDataDate) inputDataDate.value = activeEvent.eventDetails.date || activeEvent.date || '';
      if (inputDataTime) inputDataTime.value = activeEvent.eventDetails.time || '16:30';
      // Fim: usa o que já foi salvo, ou cai no mesmo dia do início — nunca uma data aleatória.
      if (inputDataEndDate) inputDataEndDate.value = activeEvent.eventDetails.endDate || activeEvent.eventDetails.date || activeEvent.date || '';
      if (inputDataEndTime) inputDataEndTime.value = activeEvent.eventDetails.endTime || '23:30';
      // locationName vazio = a pessoa apagou o nome; não cai no nome antigo.
      if (inputDataLocation) {
        const salvo = activeEvent.eventDetails.locationName;
        inputDataLocation.value = typeof salvo === 'string' ? salvo
          : (activeEvent.location && activeEvent.location !== 'Adicionar Local' ? activeEvent.location : '');
      }
      // Endereço: CEP + rua/número/complemento/bairro (e cidade/UF do CEP).
      preencherEnderecoInformacoes(activeEvent.eventDetails);
      if (inputDataReference) inputDataReference.value = activeEvent.eventDetails.referencePoint || '';
      if (inputDataDresscode) inputDataDresscode.value = activeEvent.eventDetails.dresscode || '';
      if (inputDataRecommended) inputDataRecommended.value = activeEvent.eventDetails.recommended || '';
      if (inputDataNotRecommended) inputDataNotRecommended.value = activeEvent.eventDetails.notRecommended || '';
      if (inputDataGeneralInfo) inputDataGeneralInfo.value = activeEvent.eventDetails.generalInfo || '';
      const inputDataMusic = document.getElementById('editor-data-music');
      if (inputDataMusic) inputDataMusic.value = activeEvent.eventDetails.musicUrl || '';
      const inputDataMusicAutoplay = document.getElementById('editor-data-music-autoplay');
      if (inputDataMusicAutoplay) inputDataMusicAutoplay.checked = activeEvent.eventDetails.musicAutoplay !== false;
      updateFloatingMusicWidget();
      validarLinkDaMusica();
    }

    let bIcons = activeEvent.buttonIconsStyle || activeEvent.themeStyle || 'animado';
    if (bIcons === 'classico' || bIcons === 'retro') bIcons = 'animado';
    builderState.buttonIconsStyle = bIcons;
    builderState.themeStyle = bIcons;
    let oStyle = activeEvent.ornamentsStyle || 'nenhum';
    if (oStyle === 'sem' || oStyle === 'classico') oStyle = 'nenhum';
    builderState.ornamentsStyle = oStyle;
    builderState.bgColor = activeEvent.bgColor || '#FBFBFA';
    let initialFont = activeEvent.fontFamily || builderState.font || 'font-playfair';
    if (initialFont === 'font-serif-title') initialFont = 'font-playfair';
    if (initialFont === 'font-serif') initialFont = 'font-garamond';
    if (initialFont === 'font-modern') initialFont = 'font-outfit';
    builderState.font = initialFont;
    builderState.titleColor = activeEvent.titleColor || '#18181B';
    builderState.descFont = activeEvent.descFont || 'font-sans';
    builderState.descColor = activeEvent.descColor || '#52525B';
    builderState.titleSize = activeEvent.titleSize || builderState.titleSize || 36;
    builderState.descSize = activeEvent.descSize || builderState.descSize || 14;
    builderState.gradientOpacity = activeEvent.gradientOpacity !== undefined ? activeEvent.gradientOpacity : 80;
    builderState.gradientColor = activeEvent.gradientColor || builderState.bgColor;

    const defaultCover = getDefaultCoverForEventType(activeEvent.type || '', activeEvent.title || '');
    if (!activeEvent.hasCustomCoverImage && (!activeEvent.coverImage || activeEvent.coverImage === 'assets/wedding_hero_banner.jpg')) {
      builderState.coverImage = defaultCover;
    } else {
      builderState.coverImage = activeEvent.coverImage || defaultCover;
    }
    
    builderState.bgImage = activeEvent.bgImage || null;
    builderState.accentColor = (activeEvent.accentColor && activeEvent.accentColor !== '#537bae') ? activeEvent.accentColor : '#FBFBFA';
    builderState.titleBold = activeEvent.titleBold || false;
    builderState.titleItalic = activeEvent.titleItalic !== undefined ? activeEvent.titleItalic : true;
    builderState.titleUnderline = activeEvent.titleUnderline || false;
    builderState.titleAlign = activeEvent.titleAlign || 'center';

    builderState.descBold = activeEvent.descBold || false;
    builderState.descItalic = activeEvent.descItalic !== undefined ? activeEvent.descItalic : false;
    builderState.descUnderline = activeEvent.descUnderline || false;
    builderState.descAlign = activeEvent.descAlign || 'center';

    // Sincroniza os controles da sub-seção Aparência com aplicação da fonte
    updateTitleFontSelectDisplay(builderState.font);

    const titlePicker = document.getElementById('editor-title-color-picker');
    const swatchTitleBtn = document.getElementById('swatch-title-color-btn');
    if (titlePicker) titlePicker.value = builderState.titleColor || '#18181B';
    if (swatchTitleBtn) swatchTitleBtn.style.backgroundColor = builderState.titleColor || '#18181B';

    const titleSizeSlider = document.getElementById('editor-title-size-slider');
    const titleSizeVal = document.getElementById('editor-title-size-val');
    if (titleSizeSlider) titleSizeSlider.value = builderState.titleSize;
    if (titleSizeVal) titleSizeVal.textContent = builderState.titleSize + 'px';

    updateDescFontSelectDisplay(builderState.descFont);

    const descPicker = document.getElementById('editor-desc-color-picker');
    const swatchDescBtn = document.getElementById('swatch-desc-color-btn');
    if (descPicker) descPicker.value = builderState.descColor || '#52525B';
    if (swatchDescBtn) swatchDescBtn.style.backgroundColor = builderState.descColor || '#52525B';

    const descSizeSlider = document.getElementById('editor-desc-size-slider');
    const descSizeVal = document.getElementById('editor-desc-size-val');
    if (descSizeSlider) descSizeSlider.value = builderState.descSize;
    if (descSizeVal) descSizeVal.textContent = builderState.descSize + 'px';

    const gradSlider = document.getElementById('editor-gradient-opacity-slider');
    const gradVal = document.getElementById('gradient-opacity-value');
    if (gradSlider) gradSlider.value = builderState.gradientOpacity !== undefined ? builderState.gradientOpacity : 80;
    if (gradVal) gradVal.textContent = (builderState.gradientOpacity !== undefined ? builderState.gradientOpacity : 80) + '%';

    const gradPicker = document.getElementById('editor-gradient-color-picker');
    const swatchGradBtn = document.getElementById('swatch-gradient-color-btn');
    if (gradPicker) gradPicker.value = builderState.gradientColor || builderState.bgColor || '#FBFBFA';
    if (swatchGradBtn) swatchGradBtn.style.backgroundColor = builderState.gradientColor || builderState.bgColor || '#FBFBFA';

    const selBgPreset = document.getElementById('editor-select-bg-preset');
    if (selBgPreset) selBgPreset.value = builderState.bgColor || '#FBFBFA';

    const bgPicker = document.getElementById('editor-bg-color-picker');
    const swatchBgBtn = document.getElementById('swatch-bg-color-btn');
    if (bgPicker) bgPicker.value = builderState.bgColor || '#FBFBFA';
    if (swatchBgBtn) swatchBgBtn.style.backgroundColor = builderState.bgColor || '#FBFBFA';

    syncTextFormatButtons();
    updateButtonColorUI(builderState.accentColor || '#FBFBFA');
    updateButtonTextColorUI(builderState.btnTextColor || activeEvent.btnTextColor || '#18181B');
    const selBtnIcons = document.getElementById('editor-select-btn-icons');
    if (selBtnIcons) selBtnIcons.value = builderState.buttonIconsStyle;
    const selOrnaments = document.getElementById('editor-select-ornaments');
    if (selOrnaments) selOrnaments.value = builderState.ornamentsStyle;
    updateBgImageUI(builderState.bgImage);
    const btnRadiusSlider = document.getElementById('editor-btn-radius-slider');
    const btnRadiusVal = document.getElementById('editor-btn-radius-val');
    const bRad = builderState.btnRadius !== undefined ? builderState.btnRadius : 28;
    if (btnRadiusSlider) btnRadiusSlider.value = bRad;
    if (btnRadiusVal) {
      if (bRad >= 28) btnRadiusVal.textContent = 'Total';
      else if (bRad === 0) btnRadiusVal.textContent = '0px (Reto)';
      else btnRadiusVal.textContent = `${bRad}px`;
    }
    updateLiveSitePreview();
  }

  // Remove popup do circle bender se existir no DOM
  const existingBenderPopup = document.getElementById('circle-bender-popup');
  if (existingBenderPopup) existingBenderPopup.remove();

  // ==========================================================================
  // CONTAGEM REGRESSIVA AO VIVO (Dias, Horas, Minutos e Segundos)
  // ==========================================================================
  let countdownTickerInterval = null;

  function startLiveCountdown(targetDate) {
    if (countdownTickerInterval) clearInterval(countdownTickerInterval);

    function update() {
      const now = new Date().getTime();
      const distance = targetDate.getTime() - now;

      const days = distance > 0 ? Math.floor(distance / (1000 * 60 * 60 * 24)) : 0;
      const hours = distance > 0 ? Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)) : 0;
      const minutes = distance > 0 ? Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60)) : 0;
      const seconds = distance > 0 ? Math.floor((distance % (1000 * 60)) / 1000) : 0;

      const daysEl = document.getElementById('countdown-days');
      const hoursEl = document.getElementById('countdown-hours');
      const minsEl = document.getElementById('countdown-minutes');
      const secsEl = document.getElementById('countdown-seconds');

      if (daysEl) daysEl.textContent = String(days).padStart(2, '0');
      if (hoursEl) hoursEl.textContent = String(hours).padStart(2, '0');
      if (minsEl) minsEl.textContent = String(minutes).padStart(2, '0');
      if (secsEl) secsEl.textContent = String(seconds).padStart(2, '0');
    }

    update();
    countdownTickerInterval = setInterval(update, 1000);
  }

  function updateLiveSitePreview() {
    const activeEvent = getActiveEvent();
    if (!activeEvent) return;

    const inputTitle = document.getElementById('editor-event-title');
    const inputDate = document.getElementById('editor-event-date');
    const inputHeadline = document.getElementById('editor-hero-headline');

    const previewCover = document.getElementById('live-preview-cover');
    const previewTitle = document.getElementById('live-preview-title');
    const previewHeadline = document.getElementById('live-preview-headline');
    const previewFormattedDate = document.getElementById('live-preview-formatted-date');
    const previewFormattedTime = document.getElementById('live-preview-formatted-time');
    const previewVenueName = document.getElementById('live-preview-venue-name');
    const previewVenueAddress = document.getElementById('live-preview-venue-address');
    const previewClosingNames = document.getElementById('live-preview-closing-names');
    const previewPrefacesContainer = document.getElementById('live-preview-prefaces-container');
    const previewActionBtn = document.getElementById('live-preview-action-btn');

    const titleVal = (inputTitle && typeof inputTitle.value === 'string' && inputTitle.value.length > 0)
      ? inputTitle.value
      : (activeEvent.title !== undefined ? activeEvent.title : 'Beatriz & Lucas');

    const headlineVal = (inputHeadline && typeof inputHeadline.value === 'string' && inputHeadline.value.length > 0)
      ? inputHeadline.value
      : (activeEvent.siteSections?.heroHeadline !== undefined ? activeEvent.siteSections.heroHeadline : 'CONVIDAM VOCÊ PARA O SEU CASAMENTO');

    // 1. Plano de Fundo Dinâmico Completo (Coluna, Container, Corpo e Degradê)
    const previewColumn = document.getElementById('editor-live-preview-column');
    const previewContainer = document.getElementById('live-preview-container');
    const previewBody = document.getElementById('live-preview-body');
    const coverGradient = document.getElementById('live-preview-cover-gradient');
    const activeBgColor = builderState.bgColor || '#FBFBFA';

    if (previewColumn) previewColumn.style.setProperty('background-color', activeBgColor, 'important');
    if (previewContainer) {
      previewContainer.style.setProperty('background-color', activeBgColor, 'important');
      if (builderState.bgImage) {
        previewContainer.style.setProperty('background-image', `url('${builderState.bgImage}')`, 'important');
        previewContainer.style.setProperty('background-size', 'cover', 'important');
        previewContainer.style.setProperty('background-position', 'center', 'important');
        previewContainer.style.setProperty('background-repeat', 'no-repeat', 'important');
      } else {
        previewContainer.style.setProperty('background-image', 'none', 'important');
      }
    }
    if (previewBody) {
      if (builderState.bgImage) {
        previewBody.style.setProperty('background-color', 'transparent', 'important');
      } else {
        previewBody.style.setProperty('background-color', activeBgColor, 'important');
      }
    }
    
    // Identifica se a cor de fundo escolhida é escura para adaptar contraste dos textos
    function isDarkBg(hexColor) {
      if (!hexColor || !hexColor.startsWith('#')) return false;
      let hex = hexColor.replace('#', '');
      if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
      const r = parseInt(hex.substring(0, 2), 16) || 0;
      const g = parseInt(hex.substring(2, 4), 16) || 0;
      const b = parseInt(hex.substring(4, 6), 16) || 0;
      return ((r * 299) + (g * 587) + (b * 114)) / 1000 < 128;
    }
    const isDark = isDarkBg(activeBgColor);

    // Degradê da Foto de Capa (Transparência da Borda acompanha a cor do fundo)
    if (coverGradient) {
      const gradColor = builderState.bgColor || activeBgColor;
      builderState.gradientColor = gradColor;
      const gradOpacity = (builderState.gradientOpacity !== undefined ? builderState.gradientOpacity : 75) / 100;
      coverGradient.style.background = `linear-gradient(to top, ${gradColor} 0%, ${gradColor} 30%, transparent 100%)`;
      coverGradient.style.opacity = gradOpacity;
    }

    // 2. Capa do Casal na Prévia
    const coverFilledContainer = document.getElementById('cover-image-filled-container');
    const coverEmptySlot = document.getElementById('cover-image-empty-slot');
    const hasCoverImg = !!(builderState.coverImage || activeEvent?.coverImage);

    if (hasCoverImg) {
      if (coverFilledContainer) coverFilledContainer.classList.remove('hidden');
      if (coverEmptySlot) coverEmptySlot.classList.add('hidden');
      if (previewCover) previewCover.style.backgroundImage = `url('${builderState.coverImage || activeEvent.coverImage}')`;
    } else {
      if (coverFilledContainer) coverFilledContainer.classList.add('hidden');
      if (coverEmptySlot) coverEmptySlot.classList.remove('hidden');
    }

    // Imagem do Local / Evento na Prévia (Alternância entre Imagem Ativa e Slot Vazio com +)
    const venueImg = document.getElementById('live-preview-venue-img');
    const venueFilledContainer = document.getElementById('venue-image-filled-container');
    const venueEmptySlot = document.getElementById('venue-image-empty-slot');
    const hasVenueImg = !!(builderState.venueImage || activeEvent?.venueImage);

    if (hasVenueImg) {
      if (venueFilledContainer) venueFilledContainer.classList.remove('hidden');
      if (venueEmptySlot) venueEmptySlot.classList.add('hidden');
      if (venueImg) venueImg.src = builderState.venueImage || activeEvent.venueImage;
    } else {
      if (venueFilledContainer) venueFilledContainer.classList.add('hidden');
      if (venueEmptySlot) venueEmptySlot.classList.remove('hidden');
    }

    // Imagem de Fechamento / Rodapé do Casal na Prévia
    const closingImg = document.getElementById('live-preview-closing-img');
    const closingFilledContainer = document.getElementById('closing-image-filled-container');
    const closingEmptySlot = document.getElementById('closing-image-empty-slot');
    const hasClosingImg = !!(builderState.closingImage || activeEvent?.closingImage);

    if (hasClosingImg) {
      if (closingFilledContainer) closingFilledContainer.classList.remove('hidden');
      if (closingEmptySlot) closingEmptySlot.classList.add('hidden');
      if (closingImg) closingImg.src = builderState.closingImage || activeEvent.closingImage;
    } else {
      if (closingFilledContainer) closingFilledContainer.classList.add('hidden');
      if (closingEmptySlot) closingEmptySlot.classList.remove('hidden');
    }

    const descFont = builderState.descFont || 'font-sans';
    const descColor = builderState.descColor || (isDark ? '#E4E4E7' : '#52525B');
    const titleSize = builderState.titleSize || 36;
    const descSize = builderState.descSize || 14;

    const descFontMap = {
      'font-sans': "'Inter', sans-serif",
      'font-serif': "'EB Garamond', Georgia, serif",
      'font-garamond': "'EB Garamond', Georgia, serif",
      'font-cormorant': "'Cormorant Garamond', Georgia, serif",
      'font-cinzel': "'Cinzel', serif",
      'font-lora': "'Lora', Georgia, serif",
      'font-montserrat': "'Montserrat', sans-serif",
      'font-sans-title': "'Outfit', sans-serif",
      'font-outfit': "'Outfit', sans-serif",
      'font-clean': "'Outfit', sans-serif"
    };
    const actualDescFamily = descFontMap[descFont] || "'Inter', sans-serif";

    const fontMap = {
      'font-playfair': "'Playfair Display', Georgia, serif",
      'font-serif-title': "'Playfair Display', Georgia, serif",
      'font-garamond': "'EB Garamond', Garamond, serif",
      'font-serif': "'EB Garamond', Garamond, serif",
      'font-cormorant': "'Cormorant Garamond', Georgia, serif",
      'font-avermont': "'Avermont House', 'Avermont', 'Playfair Display', Georgia, serif",
      'font-bride': "'Bride', 'Ephesis', cursive",
      'font-bludhaven': "'Bludhaven', 'Cinzel', serif",
      'font-fleur': "'Fleur De Leah', cursive",
      'font-ephesis': "'Ephesis', cursive",
      'font-hurricane': "'Hurricane', cursive",
      'font-cookie': "'Cookie', cursive",
      'font-italiana': "'Italiana', Georgia, serif",
      'font-bodoni': "'Bodoni Moda', Georgia, serif",
      'font-cinzel': "'Cinzel', serif",
      'font-lora': "'Lora', Georgia, serif",
      'font-montserrat': "'Montserrat', sans-serif",
      'font-outfit': "'Outfit', sans-serif",
      'font-modern': "'Outfit', sans-serif",
      'font-sans-title': "'Outfit', sans-serif",
      'font-inter': "'Inter', sans-serif",
      'font-sans': "'Inter', sans-serif",
      'font-clean': "'Inter', sans-serif",
      'font-cursive': "'Italiana', Georgia, serif",
      'font-greatvibes': "'Italiana', Georgia, serif",
      'font-arial': "'EB Garamond', Garamond, serif"
    };

    // 3. SLOTS DE TÍTULO E TEXTO (4 ANTES DA DATA + 2 ANTES DA ÚLTIMA IMAGEM)
    if (!builderState.slots || !Array.isArray(builderState.slots)) {
      builderState.slots = [null, null, null, null, null, null];
    }
    while (builderState.slots.length < 6) builderState.slots.push(null);
    if (builderState.slots.length > 6) builderState.slots = builderState.slots.slice(0, 6);

    let draggedSlotIndex = null;

    for (let i = 0; i < 6; i++) {
      const slotContainer = document.getElementById(`invite-slot-${i}`);
      if (!slotContainer) continue;

      slotContainer.setAttribute('draggable', 'true');
      slotContainer.setAttribute('data-slot', i);

      const slotData = builderState.slots[i];
      const isEditingText = slotContainer.querySelector('.editable-live-box') && slotContainer.querySelector('.editable-live-box') === document.activeElement;

      const dragHandleHTML = `
        <div class="slot-drag-handle" data-slot="${i}" title="Arrastar para reordenar" draggable="true">
          <svg class="w-3.5 h-4 pointer-events-none" viewBox="0 0 16 20" fill="currentColor">
            <circle cx="5" cy="4" r="1.75"/>
            <circle cx="11" cy="4" r="1.75"/>
            <circle cx="5" cy="10" r="1.75"/>
            <circle cx="11" cy="10" r="1.75"/>
            <circle cx="5" cy="16" r="1.75"/>
            <circle cx="11" cy="16" r="1.75"/>
          </svg>
        </div>
      `;

      if (!slotData) {
        // SLOT VAZIO: Exibe a caixinha pontilhada uniforme com o botão circular (+) no centro e drag handle à esquerda
        slotContainer.innerHTML = `
          <div class="invite-slot-box-empty">
            ${dragHandleHTML}
            <div class="relative">
              <button type="button" class="btn-slot-add w-7 h-7 rounded-full bg-[#537bae] hover:bg-[#416799] text-white shadow-xs flex items-center justify-center transition-all hover:scale-110 active:scale-95 cursor-pointer" data-slot="${i}" title="Adicionar Título ou Texto">
                <svg class="w-4 h-4 pointer-events-none" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15"/></svg>
              </button>
              <div id="dropdown-slot-${i}" class="hidden absolute left-1/2 -translate-x-1/2 top-full mt-2 w-36 bg-white border border-[#EAEAEA] rounded-lg shadow-xl p-1 z-30 space-y-0.5 animate-fade-in">
                <button type="button" class="btn-slot-pick w-full flex items-center gap-2 px-2.5 py-1.5 text-xs font-semibold text-zinc-800 hover:bg-blue-50 hover:text-[#537bae] rounded transition-colors text-left cursor-pointer" data-slot="${i}" data-type="title">
                  <span class="w-4 h-4 rounded bg-blue-100/70 text-[#537bae] flex items-center justify-center font-bold text-[10px]">T</span>
                  <span>Título</span>
                </button>
                <button type="button" class="btn-slot-pick w-full flex items-center gap-2 px-2.5 py-1.5 text-xs font-semibold text-zinc-800 hover:bg-blue-50 hover:text-[#537bae] rounded transition-colors text-left cursor-pointer" data-slot="${i}" data-type="text">
                  <span class="w-4 h-4 rounded bg-zinc-100 text-zinc-600 flex items-center justify-center font-bold text-[10px]">¶</span>
                  <span>Texto</span>
                </button>
              </div>
            </div>
          </div>
        `;
      } else {
        // SLOT PREENCHIDO COM TÍTULO OU TEXTO (COM ÍCONE DE DRAG À ESQUERDA & BOTÃO LÁPIS/EXCLUIR)
        if (!isEditingText) {
          slotContainer.innerHTML = '';

          const wrapper = document.createElement('div');
          wrapper.className = 'live-block-wrapper relative group/block text-center inline-flex items-center justify-center';

          // Ícone de Drag à Esquerda (6 pontinhos conforme referência)
          const dragHandle = document.createElement('div');
          dragHandle.className = 'slot-drag-handle';
          dragHandle.dataset.slot = i;
          dragHandle.title = 'Arrastar para reordenar';
          dragHandle.setAttribute('draggable', 'true');
          dragHandle.innerHTML = `
            <svg class="w-3.5 h-4 pointer-events-none" viewBox="0 0 16 20" fill="currentColor">
              <circle cx="5" cy="4" r="1.75"/>
              <circle cx="11" cy="4" r="1.75"/>
              <circle cx="5" cy="10" r="1.75"/>
              <circle cx="11" cy="10" r="1.75"/>
              <circle cx="5" cy="16" r="1.75"/>
              <circle cx="11" cy="16" r="1.75"/>
            </svg>
          `;
          dragHandle.addEventListener('mousedown', () => {
            slotContainer.draggable = true;
          });
          dragHandle.addEventListener('dragstart', (e) => {
            draggedSlotIndex = i;
            slotContainer.classList.add('is-dragging');
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/plain', i);
          });
          wrapper.appendChild(dragHandle);

          const box = document.createElement('div');
          box.contentEditable = "true";
          box.spellcheck = false;
          box.dataset.slotIndex = i;

          const isTitle = slotData.type === 'title';
          const isQuote = slotData.content && (slotData.content.includes('"') || slotData.content.includes('('));
          const isUppercaseCall = slotData.content && (slotData.content.includes('BÊNÇÃO') || slotData.content.includes('CONVIDAM') || slotData.content.toUpperCase() === slotData.content);

          let trackingClass = '';
          if (isUppercaseCall) trackingClass = 'uppercase tracking-[0.22em] font-bold text-[10px] sm:text-[11px]';
          else if (isQuote) trackingClass = 'font-serif text-xs sm:text-sm';
          else trackingClass = 'text-xs sm:text-sm';

          const slotFontFam = isTitle ? (fontMap[builderState.font || 'font-playfair'] || "'Playfair Display', Georgia, serif") : actualDescFamily;
          const slotFontSize = isTitle ? titleSize : (isQuote ? Math.round(descSize * 0.9) : (isUppercaseCall ? Math.round(descSize * 0.78) : descSize));
          const slotFontWeight = isTitle ? (builderState.titleBold ? 'bold' : 'normal') : (builderState.descBold ? 'bold' : (isUppercaseCall ? 'bold' : 'normal'));
          const slotFontStyle = isTitle ? (builderState.titleItalic ? 'italic' : 'normal') : (builderState.descItalic ? 'italic' : 'normal');
          const slotColor = isTitle ? (builderState.titleColor || (isDark ? '#FFFFFF' : '#18181B')) : descColor;

          if (isTitle) {
            box.className = `editable-live-box live-block-title leading-tight ${builderState.font || 'font-playfair'}`;
            box.setAttribute('data-placeholder', 'Digite o título...');
            box.style.setProperty('font-family', slotFontFam, 'important');
            box.style.setProperty('color', slotColor, 'important');
            box.style.setProperty('font-size', `${slotFontSize}px`, 'important');
            box.style.setProperty('font-weight', slotFontWeight, 'important');
            box.style.setProperty('font-style', slotFontStyle, 'important');
            box.style.setProperty('text-decoration', builderState.titleUnderline ? 'underline' : 'none', 'important');
            box.style.setProperty('text-align', builderState.titleAlign || 'center', 'important');
          } else {
            box.className = `editable-live-box live-block-text leading-relaxed ${trackingClass} ${descFont}`;
            if (builderState.descItalic) box.classList.add('italic');
            box.setAttribute('data-placeholder', 'Digite o texto...');
            box.style.setProperty('font-family', slotFontFam, 'important');
            box.style.setProperty('color', slotColor, 'important');
            box.style.setProperty('font-size', `${slotFontSize}px`, 'important');
            box.style.setProperty('font-weight', slotFontWeight, 'important');
            box.style.setProperty('font-style', slotFontStyle, 'important');
            box.style.setProperty('text-decoration', builderState.descUnderline ? 'underline' : 'none', 'important');
            box.style.setProperty('text-align', builderState.descAlign || 'center', 'important');
          }

          box.textContent = slotData.content || '';

          if (!slotData.content || !slotData.content.trim()) {
            box.dataset.empty = "true";
          }

          box.addEventListener('focus', () => {
            slotContainer.draggable = false;
          });

          box.addEventListener('blur', () => {
            slotContainer.draggable = true;
          });

          box.addEventListener('input', () => {
            const val = (box.innerText || box.textContent || '').replace(/\u200B/g, '').replace(/[↗✎]/g, '').trim();
            slotData.content = box.innerText;
            if (!val) {
              box.dataset.empty = "true";
            } else {
              delete box.dataset.empty;
            }
            if (slotData.type === 'title' && i === 2) {
              const inputTitle = document.getElementById('editor-event-title');
              if (inputTitle) inputTitle.value = val;
              const activeEv = getActiveEvent();
              if (activeEv) activeEv.title = val;
            }
          });

          // Botão Excluir (✕) - remove o campo e faz o (+) voltar imediatamente naquele slot
          const btnDel = document.createElement('button');
          btnDel.type = 'button';
          btnDel.className = 'btn-delete-text-block';
          btnDel.title = 'Excluir campo e voltar ao botão +';
          btnDel.innerHTML = `<svg class="w-2.5 h-2.5 pointer-events-none" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>`;
          btnDel.addEventListener('click', (ev) => {
            ev.stopPropagation();
            builderState.slots[i] = null;
            updateLiveSitePreview();
          });

          wrapper.appendChild(box);
          wrapper.appendChild(btnDel);
          slotContainer.appendChild(wrapper);
        } else {
          // Atualiza estilos em tempo real sem resetar foco
          const box = slotContainer.querySelector('.editable-live-box');
          if (box) {
            if (slotData.type === 'title') {
              box.style.setProperty('font-family', fontMap[builderState.font || 'font-playfair'] || "'Playfair Display', Georgia, serif", 'important');
              box.style.setProperty('color', builderState.titleColor || (isDark ? '#FFFFFF' : '#18181B'), 'important');
              box.style.setProperty('font-size', `${titleSize}px`, 'important');
              box.style.setProperty('font-weight', builderState.titleBold ? 'bold' : 'normal', 'important');
              box.style.setProperty('font-style', builderState.titleItalic ? 'italic' : 'normal', 'important');
              box.style.setProperty('text-decoration', builderState.titleUnderline ? 'underline' : 'none', 'important');
              box.style.setProperty('text-align', builderState.titleAlign || 'center', 'important');
            } else {
              box.style.setProperty('font-family', actualDescFamily, 'important');
              box.style.setProperty('color', descColor, 'important');
              box.style.setProperty('font-size', `${descSize}px`, 'important');
              box.style.setProperty('font-weight', builderState.descBold ? 'bold' : 'normal', 'important');
              box.style.setProperty('font-style', builderState.descItalic ? 'italic' : 'normal', 'important');
              box.classList.toggle('italic', !!builderState.descItalic);
              box.style.setProperty('text-decoration', builderState.descUnderline ? 'underline' : 'none', 'important');
              box.style.setProperty('text-align', builderState.descAlign || 'center', 'important');
            }
          }
        }
      }

      // Handlers de Drag & Drop para o slotContainer
      slotContainer.ondragstart = (e) => {
        draggedSlotIndex = i;
        slotContainer.classList.add('is-dragging');
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', i);
      };

      slotContainer.ondragend = () => {
        slotContainer.classList.remove('is-dragging');
        document.querySelectorAll('.invite-slot-wrapper').forEach(w => w.classList.remove('drag-over', 'is-dragging'));
      };

      slotContainer.ondragover = (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        slotContainer.classList.add('drag-over');
      };

      slotContainer.ondragleave = () => {
        slotContainer.classList.remove('drag-over');
      };

      slotContainer.ondrop = (e) => {
        e.preventDefault();
        slotContainer.classList.remove('drag-over');
        if (draggedSlotIndex !== null && draggedSlotIndex !== i) {
          const isTopGroup = (draggedSlotIndex <= 3 && i <= 3);
          const isBottomGroup = (draggedSlotIndex >= 4 && i >= 4);
          if (isTopGroup || isBottomGroup) {
            const moved = builderState.slots.splice(draggedSlotIndex, 1)[0];
            builderState.slots.splice(i, 0, moved);
            draggedSlotIndex = null;
            updateLiveSitePreview();
          }
        }
      };
    }

    // 6. Data & Horário
    const inputDataDate = document.getElementById('editor-data-date');
    const inputDataTime = document.getElementById('editor-data-time');
    const inputDataLocation = document.getElementById('editor-data-location');
    const inputDataAddress = document.getElementById('editor-data-address');

    const rawDate = (inputDataDate && inputDataDate.value) ? inputDataDate.value : (activeEvent.eventDetails?.date || activeEvent.date || '2026-10-18');
    const rawTime = (inputDataTime && inputDataTime.value) ? inputDataTime.value : (activeEvent.eventDetails?.time || '16:30');
    
    let dayOfWeekName = 'Domingo';
    if (previewFormattedDate) {
      if (rawDate) {
        const parts = rawDate.split('-');
        if (parts.length === 3) {
          const year = parseInt(parts[0], 10);
          const month = parseInt(parts[1], 10) - 1;
          const day = parseInt(parts[2], 10);
          const dateObj = new Date(year, month, day);
          
          const daysOfWeek = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
          if (!isNaN(dateObj.getTime())) {
            dayOfWeekName = daysOfWeek[dateObj.getDay()];
          }
          
          const months = ['JANEIRO', 'FEVEREIRO', 'MARÇO', 'ABRIL', 'MAIO', 'JUNHO', 'JULHO', 'AGOSTO', 'SETEMBRO', 'OUTUBRO', 'NOVEMBRO', 'DEZEMBRO'];
          const mName = months[month] || 'OUTUBRO';
          previewFormattedDate.textContent = `${String(day).padStart(2, '0')} . ${mName} . ${year}`;
          previewFormattedDate.style.opacity = '1';
        } else {
          previewFormattedDate.textContent = rawDate;
        }
      } else {
        previewFormattedDate.textContent = 'DATA DO EVENTO';
        previewFormattedDate.style.opacity = '0.45';
      }
      previewFormattedDate.className = `font-bold tracking-[0.2em] uppercase ${descFont}`;
      previewFormattedDate.style.setProperty('color', builderState.titleColor || (isDark ? '#FFFFFF' : '#18181B'), 'important');
      previewFormattedDate.style.setProperty('font-size', `${Math.round(descSize * 0.95)}px`, 'important');
    }
    if (previewFormattedTime) {
      if (rawTime) {
        previewFormattedTime.textContent = dayOfWeekName ? `${dayOfWeekName}, às ${rawTime}` : `Às ${rawTime}`;
        previewFormattedTime.style.opacity = '1';
      } else {
        previewFormattedTime.textContent = 'Horário do evento';
        previewFormattedTime.style.opacity = '0.45';
      }
      previewFormattedTime.className = `font-medium ${descFont}`;
      previewFormattedTime.style.setProperty('color', descColor, 'important');
      previewFormattedTime.style.setProperty('font-family', actualDescFamily, 'important');
      previewFormattedTime.style.setProperty('font-size', `${Math.round(descSize * 0.82)}px`, 'important');
      previewFormattedTime.style.setProperty('font-style', builderState.descItalic ? 'italic' : 'normal', 'important');
    }

    const dateTimeBox = document.getElementById('live-preview-date-time-box');
    if (dateTimeBox) {
      dateTimeBox.style.setProperty('border-color', descColor + '35', 'important');
    }

    // Inicializa / Atualiza o Timer da Contagem Regressiva ao Vivo (Dias, Horas, Minutos e Segundos)
    let targetEventDate = new Date(2026, 9, 18, 16, 30, 0);
    if (rawDate) {
      const parts = rawDate.split('-').map(Number);
      if (parts.length === 3) {
        let [hh, mm] = (rawTime || '16:30').split(':').map(Number);
        if (isNaN(hh)) hh = 16;
        if (isNaN(mm)) mm = 30;
        targetEventDate = new Date(parts[0], parts[1] - 1, parts[2], hh, mm, 0);
      }
    }
    startLiveCountdown(targetEventDate);

    document.querySelectorAll('.countdown-number').forEach(el => {
      el.style.setProperty('color', builderState.titleColor || (isDark ? '#FFFFFF' : '#18181B'), 'important');
    });
    document.querySelectorAll('.countdown-unit-box').forEach(el => {
      el.style.setProperty('border-color', descColor + '35', 'important');
    });

    // 7. Local & Endereço
    const venueNameVal = (inputDataLocation && inputDataLocation.value !== undefined && inputDataLocation.value.length > 0) ? inputDataLocation.value : (activeEvent.eventDetails?.locationName || activeEvent.location || 'Villa Santanna Eventos');
    const venueAddrVal = (inputDataAddress && inputDataAddress.value !== undefined && inputDataAddress.value.length > 0) ? inputDataAddress.value : (activeEvent.eventDetails?.address || 'Av. Castello Branco, 2490');

    const venueLabel = document.getElementById('live-preview-venue-label');
    if (venueLabel) {
      venueLabel.style.setProperty('color', descColor, 'important');
      venueLabel.style.setProperty('font-family', actualDescFamily, 'important');
      venueLabel.style.setProperty('font-size', `${Math.round(descSize * 0.85)}px`, 'important');
      venueLabel.style.setProperty('font-style', builderState.descItalic ? 'italic' : 'normal', 'important');
    }

    if (previewVenueName) {
      if (document.activeElement !== previewVenueName) {
        previewVenueName.textContent = venueNameVal ? venueNameVal.toUpperCase() : '';
      }
      previewVenueName.setAttribute('data-placeholder', 'Nome do local / espaço...');
      previewVenueName.className = `editable-live-box font-bold uppercase tracking-wider ${descFont}`;
      previewVenueName.style.setProperty('color', builderState.titleColor || (isDark ? '#FFFFFF' : '#18181B'), 'important');
      previewVenueName.style.setProperty('font-size', `${Math.round(descSize * 0.95)}px`, 'important');
      const rawVName = (previewVenueName.innerText || previewVenueName.textContent || '').replace(/\u200B/g, '').replace(/↗/g, '').trim();
      if (!rawVName) {
        previewVenueName.dataset.empty = "true";
        if (previewVenueName.innerHTML === '<br>') previewVenueName.innerHTML = '';
      } else {
        delete previewVenueName.dataset.empty;
      }
    }
    if (previewVenueAddress) {
      if (document.activeElement !== previewVenueAddress) {
        previewVenueAddress.textContent = venueAddrVal || '';
      }
      previewVenueAddress.setAttribute('data-placeholder', 'Endereço completo do evento...');
      previewVenueAddress.className = `editable-live-box max-w-[260px] mx-auto leading-relaxed ${descFont}`;
      previewVenueAddress.style.setProperty('color', descColor, 'important');
      previewVenueAddress.style.setProperty('font-family', actualDescFamily, 'important');
      previewVenueAddress.style.setProperty('font-size', `${Math.round(descSize * 0.82)}px`, 'important');
      previewVenueAddress.style.setProperty('font-style', builderState.descItalic ? 'italic' : 'normal', 'important');
      const rawVAddr = (previewVenueAddress.innerText || previewVenueAddress.textContent || '').replace(/\u200B/g, '').replace(/↗/g, '').trim();
      if (!rawVAddr) {
        previewVenueAddress.dataset.empty = "true";
        if (previewVenueAddress.innerHTML === '<br>') previewVenueAddress.innerHTML = '';
      } else {
        delete previewVenueAddress.dataset.empty;
      }
    }

    const countdownLabel = document.getElementById('live-preview-countdown-label');
    if (countdownLabel) {
      countdownLabel.textContent = 'Contagem Regressiva';
      const actualTitleFamily = fontMap[builderState.font || 'font-playfair'] || "'Playfair Display', Georgia, serif";
      countdownLabel.style.setProperty('color', builderState.titleColor || (isDark ? '#FFFFFF' : '#18181B'), 'important');
      countdownLabel.style.setProperty('font-family', actualTitleFamily, 'important');
      countdownLabel.style.setProperty('font-size', `${Math.max(12, Math.round(titleSize * 0.45))}px`, 'important');
      countdownLabel.style.setProperty('font-weight', builderState.titleBold ? 'bold' : 'normal', 'important');
      countdownLabel.style.setProperty('font-style', builderState.titleItalic ? 'italic' : 'normal', 'important');
      countdownLabel.style.setProperty('text-align', builderState.titleAlign || 'center', 'important');
      countdownLabel.style.setProperty('text-transform', 'none', 'important');
      countdownLabel.style.setProperty('margin-bottom', '0.75rem', 'important');
    }
    // 8. Fechamento
    if (previewClosingNames) {
      previewClosingNames.textContent = titleVal || 'Anfitriões';
      previewClosingNames.className = `text-xl italic ${builderState.font || 'font-serif-title'}`;
      previewClosingNames.style.setProperty('color', builderState.titleColor || (isDark ? '#FFFFFF' : '#18181B'), 'important');
    }

    const buttonsCallout = document.getElementById('live-preview-buttons-callout');
    if (buttonsCallout) {
      buttonsCallout.style.setProperty('color', descColor, 'important');
      buttonsCallout.style.setProperty('font-family', actualDescFamily, 'important');
    }

    // 9. Estilo dos Botões do Convite (Ícones: Animado, Moderno, Minimalista & Fonte Clássica)
    const iconStyle = builderState.buttonIconsStyle || builderState.themeStyle || 'animado';
    const btnRadius = builderState.btnRadius !== undefined ? builderState.btnRadius : 28;
    const radiusCss = btnRadius >= 28 ? '9999px' : `${btnRadius}px`;
    const btnColor = builderState.accentColor || '#FBFBFA';
    const btnTextColor = builderState.btnTextColor || '#18181B';

    // Configuração dos botões de ação do convite conforme cada estilo de ícones
    const actionButtonsConfig = [
      {
        text: 'Localização',
        emoji: '📍 Localização',
        iconSvg: '<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z"/></svg>'
      },
      {
        text: 'Lista de Presentes',
        emoji: '🎁 Lista de Presentes',
        iconSvg: '<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M21 11.25v8.25a1.5 1.5 0 01-1.5 1.5H4.5a1.5 1.5 0 01-1.5-1.5v-8.25M21 11.25H3m18 0a2.25 2.25 0 000-4.5H3a2.25 2.25 0 000 4.5m9-4.5v14.25m0-14.25H8.25a2.25 2.25 0 010-4.5c1.864 0 3.75 2.25 3.75 4.5m0 0h3.75a2.25 2.25 0 000-4.5c-1.864 0-3.75 2.25-3.75 4.5"/></svg>'
      },
      {
        text: 'Confirmação de Presença',
        emoji: '✓ Confirmação de Presença',
        iconSvg: '<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>'
      },
      {
        text: 'Anfitriões',
        emoji: '👥 Anfitriões',
        iconSvg: '<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z"/></svg>'
      },
      {
        text: 'Dress Code',
        emoji: '👗 Dress Code',
        iconSvg: '<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.386l3.86-2.268c.827-.486 1.134-1.503.748-2.33l-2.268-4.86a2.25 2.25 0 00-.733-.872L9.568 3z"/><path stroke-linecap="round" stroke-linejoin="round" d="M6 6h.008v.008H6V6z"/></svg>'
      }
    ];

    const inviteButtons = document.querySelectorAll('#live-preview-buttons-container button, .live-preview-custom-btn');
    inviteButtons.forEach((btn, idx) => {
      const config = actionButtonsConfig[idx];

      if (config) {
        if (iconStyle === 'animado') {
          btn.innerHTML = `<span>${config.emoji}</span>`;
        } else if (iconStyle === 'moderno') {
          btn.innerHTML = `<span class="inline-flex items-center gap-1.5">${config.iconSvg} <span>${config.text}</span></span>`;
        } else {
          // minimalista
          btn.innerHTML = `<span>${config.text}</span>`;
        }
      }
      btn.style.boxShadow = '';
      btn.style.borderWidth = '1px';
      btn.style.borderColor = 'rgba(0,0,0,0.08)';
      btn.style.setProperty('border-radius', radiusCss, 'important');
      btn.style.setProperty('font-family', "'EB Garamond', Georgia, serif", 'important');
      btn.style.setProperty('font-size', '0.725rem', 'important');
      btn.style.setProperty('text-transform', 'none', 'important');
      btn.style.setProperty('letter-spacing', '0.01em', 'important');

      btn.style.setProperty('background-color', btnColor, 'important');
      btn.style.setProperty('color', btnTextColor, 'important');
      btn.querySelectorAll('*').forEach(child => {
        child.style.setProperty('color', btnTextColor, 'important');
      });
    });

    // 9.5 Renderização dos Ornamentos (Nenhum, Moderno)
    const ornamentStyle = builderState.ornamentsStyle || 'nenhum';
    const venueOrnament = document.getElementById('venue-ornament-top');
    const closingOrnament = document.getElementById('closing-ornament-top');

    const modernSvg = '<svg class="w-28 h-3 text-zinc-400 mx-auto" viewBox="0 0 120 12" fill="none" stroke="currentColor" stroke-width="1"><line x1="0" y1="6" x2="48" y2="6" stroke="currentColor" stroke-width="0.8" opacity="0.4"/><polygon points="60,2 64,6 60,10 56,6" fill="currentColor" opacity="0.6"/><line x1="72" y1="6" x2="120" y2="6" stroke="currentColor" stroke-width="0.8" opacity="0.4"/></svg>';

    [venueOrnament, closingOrnament].forEach(el => {
      if (!el) return;
      if (ornamentStyle === 'moderno') {
        el.innerHTML = modernSvg;
        el.classList.remove('hidden');
      } else {
        el.innerHTML = '';
        el.classList.add('hidden');
      }
    });

    // 10. Widget Flutuante de Música
    updateFloatingMusicWidget();

    // 11. Sincroniza a prévia de anfitriões caso ativa
    if (typeof updateHostsPreview === 'function') {
      updateHostsPreview();
    }
  }

  function applyTemplate(templateId, notify = true) {
    const tmpl = templatesPresets[templateId];
    if (!tmpl) return;

    builderState.bgColor = tmpl.bgColor || '#FBFBFA';
    builderState.font = tmpl.font || 'font-playfair';
    builderState.titleColor = tmpl.titleColor || '#18181B';
    builderState.descFont = tmpl.descFont || 'font-sans';
    builderState.descColor = tmpl.descColor || '#52525B';
    builderState.gradientOpacity = tmpl.gradientOpacity !== undefined ? tmpl.gradientOpacity : 75;
    builderState.gradientColor = tmpl.gradientColor || tmpl.bgColor;
    
    // A imagem de capa adicionada pelo usuário NUNCA é sobrescrita ao mudar template
    if (!builderState.hasCustomCoverImage && tmpl.coverImage) {
      builderState.coverImage = tmpl.coverImage;
    }
    if (tmpl.accentColor) builderState.accentColor = tmpl.accentColor;

    // Sincroniza controles de design
    const selTitleFont = document.getElementById('editor-select-title-font');
    const titleColorPicker = document.getElementById('editor-title-color-picker');
    const swatchTitleBtn = document.getElementById('swatch-title-color-btn');

    const selDescFont = document.getElementById('editor-select-desc-font');
    const descColorPicker = document.getElementById('editor-desc-color-picker');
    const swatchDescBtn = document.getElementById('swatch-desc-color-btn');

    const gradOpacitySlider = document.getElementById('editor-gradient-opacity-slider');
    const gradOpacityVal = document.getElementById('gradient-opacity-value');
    const gradColorPicker = document.getElementById('editor-gradient-color-picker');
    const swatchGradBtn = document.getElementById('swatch-gradient-color-btn');

    const selBgPreset = document.getElementById('editor-select-bg-preset');
    const bgPickerEl = document.getElementById('editor-bg-color-picker');
    const swatchBgBtn = document.getElementById('swatch-bg-color-btn');

    updateTitleFontSelectDisplay(builderState.font);
    if (titleColorPicker) titleColorPicker.value = builderState.titleColor;
    if (swatchTitleBtn) swatchTitleBtn.style.backgroundColor = builderState.titleColor;

    const titleSizeSlider = document.getElementById('editor-title-size-slider');
    const titleSizeVal = document.getElementById('editor-title-size-val');
    if (titleSizeSlider) titleSizeSlider.value = builderState.titleSize || 36;
    if (titleSizeVal) titleSizeVal.textContent = (builderState.titleSize || 36) + 'px';

    updateDescFontSelectDisplay(builderState.descFont);
    if (descColorPicker) descColorPicker.value = builderState.descColor;
    if (swatchDescBtn) swatchDescBtn.style.backgroundColor = builderState.descColor;

    const descSizeSlider = document.getElementById('editor-desc-size-slider');
    const descSizeVal = document.getElementById('editor-desc-size-val');
    if (descSizeSlider) descSizeSlider.value = builderState.descSize || 14;
    if (descSizeVal) descSizeVal.textContent = (builderState.descSize || 14) + 'px';

    if (gradOpacitySlider) gradOpacitySlider.value = builderState.gradientOpacity;
    if (gradOpacityVal) gradOpacityVal.textContent = builderState.gradientOpacity + '%';
    if (gradColorPicker) gradColorPicker.value = builderState.gradientColor.startsWith('#') ? builderState.gradientColor : '#FBFBFA';
    if (swatchGradBtn) swatchGradBtn.style.backgroundColor = builderState.gradientColor;

    if (selBgPreset) selBgPreset.value = builderState.bgColor;
    if (bgPickerEl) bgPickerEl.value = builderState.bgColor.startsWith('#') ? builderState.bgColor : '#FBFBFA';
    if (swatchBgBtn) swatchBgBtn.style.backgroundColor = builderState.bgColor;

    // Atualiza cards de templates sugeridos (Featured themes)
    document.querySelectorAll('#featured-themes-list .theme-card').forEach(card => {
      const cardId = card.getAttribute('data-theme-id');
      const badge = card.querySelector('.theme-check-badge');
      if (cardId === templateId) {
        card.classList.add('active', 'border-2', 'border-[#537bae]');
        card.classList.remove('border-zinc-200/80');
        if (badge) badge.classList.remove('hidden');
      } else {
        card.classList.remove('active', 'border-2', 'border-[#537bae]');
        card.classList.add('border-zinc-200/80');
        if (badge) badge.classList.add('hidden');
      }
    });

    updateLiveSitePreview();
    if (notify) {
      showToast('Template aplicado com sucesso!', '🎨');
    }
  }

  function saveEditorChanges() {
    const activeEvent = getActiveEvent();
    const inputTitle = document.getElementById('editor-event-title');
    const inputSlug = document.getElementById('editor-event-slug');
    const inputDate = document.getElementById('editor-event-date');
    const inputLocation = document.getElementById('editor-event-location');
    const inputHeadline = document.getElementById('editor-hero-headline');
    const inputSubtitle = document.getElementById('editor-hero-subtitle');
    const inputAboutTitle = document.getElementById('editor-about-title');
    const inputAbout = document.getElementById('editor-about-text');
    const inputInvite = document.getElementById('editor-invite-text');
    const inputOnlineTitle = document.getElementById('editor-online-invite-title');
    const inputOnlineMsg = document.getElementById('editor-online-invite-msg');
    const inputOnlineDresscode = document.getElementById('editor-online-invite-dresscode');
    const inputOnlineRsvp = document.getElementById('editor-online-invite-rsvp-deadline');

    if (inputTitle && inputTitle.value) activeEvent.title = inputTitle.value;
    if (inputSlug && inputSlug.value) {
      const validation = validateSlugAvailability(inputSlug.value, activeEvent.id);
      if (validation.available) {
        activeEvent.slug = validation.slug;
        activeEvent.publicUrl = `https://love.com.br/${validation.slug}`;
      }
    }
    if (inputDate && inputDate.value) activeEvent.date = inputDate.value;
    if (inputLocation && inputLocation.value) activeEvent.location = inputLocation.value;
    // Evento vindo do banco pode não ter siteSections ainda.
    if (!activeEvent.siteSections) activeEvent.siteSections = {};
    if (inputHeadline && inputHeadline.value) activeEvent.siteSections.heroHeadline = inputHeadline.value;
    if (inputSubtitle && inputSubtitle.value) activeEvent.siteSections.heroSubtitle = inputSubtitle.value;
    if (inputAboutTitle && inputAboutTitle.value) activeEvent.siteSections.aboutTitle = inputAboutTitle.value;
    if (inputAbout && inputAbout.value) activeEvent.siteSections.aboutText = inputAbout.value;
    if (inputInvite && inputInvite.value) activeEvent.siteSections.inviteText = inputInvite.value;

    if (inputOnlineTitle || inputOnlineMsg || inputOnlineDresscode || inputOnlineRsvp) {
      if (!activeEvent.onlineInvite) activeEvent.onlineInvite = {};
      if (inputOnlineTitle && inputOnlineTitle.value) activeEvent.onlineInvite.title = inputOnlineTitle.value;
      if (inputOnlineMsg && inputOnlineMsg.value) activeEvent.onlineInvite.message = inputOnlineMsg.value;
      if (inputOnlineDresscode && inputOnlineDresscode.value) activeEvent.onlineInvite.dresscode = inputOnlineDresscode.value;
      if (inputOnlineRsvp && inputOnlineRsvp.value) activeEvent.onlineInvite.rsvpDeadline = inputOnlineRsvp.value;
    }

    activeEvent.prefaces = [...(builderState.prefaces || [])];
    activeEvent.slots = JSON.parse(JSON.stringify(builderState.slots || []));

    // Nome do evento (campo da sub-seção "Informações")
    const inputDataEventName = document.getElementById('editor-data-event-name');
    if (inputDataEventName && inputDataEventName.value) {
      activeEvent.title = inputDataEventName.value;
      if (inputTitle) inputTitle.value = inputDataEventName.value;
    }

    // Salva Dados detalhados do evento
    if (!activeEvent.eventDetails) activeEvent.eventDetails = {};
    const inputDataDate = document.getElementById('editor-data-date');
    const inputDataTime = document.getElementById('editor-data-time');
    const inputDataEndDate = document.getElementById('editor-data-end-date');
    const inputDataEndTime = document.getElementById('editor-data-end-time');
    const inputDataLocation = document.getElementById('editor-data-location');
    const inputDataAddress = document.getElementById('editor-data-address');
    const inputDataReference = document.getElementById('editor-data-reference');
    const inputDataDresscode = document.getElementById('editor-data-dresscode');
    const inputDataRecommended = document.getElementById('editor-data-recommended');
    const inputDataNotRecommended = document.getElementById('editor-data-not-recommended');
    const inputDataGeneralInfo = document.getElementById('editor-data-general-info');

    if (inputDataDate && inputDataDate.value) {
      activeEvent.eventDetails.date = inputDataDate.value;
      activeEvent.date = inputDataDate.value;
    }
    if (inputDataTime && inputDataTime.value) activeEvent.eventDetails.time = inputDataTime.value;
    if (inputDataEndDate && inputDataEndDate.value) activeEvent.eventDetails.endDate = inputDataEndDate.value;
    if (inputDataEndTime && inputDataEndTime.value) activeEvent.eventDetails.endTime = inputDataEndTime.value;
    if (inputDataLocation) {
      const nomeDoLocal = inputDataLocation.value.trim();
      activeEvent.eventDetails.locationName = nomeDoLocal;
      activeEvent.location = nomeDoLocal;
    }
    montarEnderecoInformacoes();
    if (inputDataAddress) activeEvent.eventDetails.address = inputDataAddress.value;
    // Partes do endereço (CEP) — address acima já é a junção delas; cidade e
    // UF vêm do CEP e completam a busca do Maps/Waze do convite.
    const parteEndereco = nome => (cepCampo(nome)?.value || '').trim();
    activeEvent.eventDetails.cep = parteEndereco('cep');
    activeEvent.eventDetails.street = parteEndereco('rua');
    activeEvent.eventDetails.number = parteEndereco('numero');
    activeEvent.eventDetails.complement = parteEndereco('complemento');
    activeEvent.eventDetails.district = parteEndereco('bairro');
    activeEvent.eventDetails.city = parteEndereco('cidade');
    activeEvent.eventDetails.state = parteEndereco('uf');
    if (inputDataReference) activeEvent.eventDetails.referencePoint = inputDataReference.value;
    if (inputDataDresscode) activeEvent.eventDetails.dresscode = inputDataDresscode.value;
    if (inputDataRecommended) activeEvent.eventDetails.recommended = inputDataRecommended.value;
    if (inputDataNotRecommended) activeEvent.eventDetails.notRecommended = inputDataNotRecommended.value;
    if (inputDataGeneralInfo) activeEvent.eventDetails.generalInfo = inputDataGeneralInfo.value;
    // Música de fundo: só guarda link do YouTube (link inválido = sem música).
    const inputDataMusic = document.getElementById('editor-data-music');
    if (inputDataMusic) {
      const link = inputDataMusic.value.trim();
      activeEvent.eventDetails.musicUrl = idDoVideoYoutube(link) ? link : '';
    }
    const inputDataMusicAutoplay = document.getElementById('editor-data-music-autoplay');
    if (inputDataMusicAutoplay) activeEvent.eventDetails.musicAutoplay = inputDataMusicAutoplay.checked;

    activeEvent.bgColor = builderState.bgColor;
    activeEvent.fontFamily = builderState.font;
    activeEvent.coverImage = builderState.coverImage;
    activeEvent.accentColor = builderState.accentColor;
    activeEvent.music = JSON.parse(JSON.stringify(builderState.music || { tracks: [], autoplay: true }));
    activeEvent.closingImage = builderState.closingImage;
    activeEvent.buttonIconsStyle = builderState.buttonIconsStyle || 'animado';
    activeEvent.themeStyle = builderState.buttonIconsStyle || 'animado';
    activeEvent.ornamentsStyle = builderState.ornamentsStyle || 'nenhum';

    updateAllCelebrationData();
    renderEventsSwitcher();

    // Sincroniza fundo e cores na página pública se aplicável
    const publicHero = document.getElementById('public-hero-section');
    if (publicHero) {
      publicHero.style.backgroundImage = `url('${activeEvent.coverImage}')`;
    }

    showToast('Alterações salvas com sucesso no convite!', '✨');
  }

  // Live Listeners para inputs de texto e dados em tempo real
  ['editor-event-title', 'editor-data-event-name', 'editor-hero-headline', 'editor-data-date', 'editor-data-time', 'editor-data-end-date', 'editor-data-end-time', 'editor-data-location', 'editor-data-address', 'editor-data-reference', 'editor-data-dresscode'].forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener('input', updateLiveSitePreview);
      el.addEventListener('change', updateLiveSitePreview);
    }
  });

  // Live Listener para validação em tempo real de URL/Slug
  const inputEditorSlug = document.getElementById('editor-event-slug');
  if (inputEditorSlug) {
    inputEditorSlug.addEventListener('input', (e) => {
      const activeEv = getActiveEvent();
      const validation = validateSlugAvailability(e.target.value, activeEv.id);
      if (validation.available) {
        activeEv.slug = validation.slug;
        activeEv.publicUrl = `https://love.com.br/${validation.slug}`;
        const previewBrowserUrl = document.getElementById('live-preview-browser-url');
        if (previewBrowserUrl) previewBrowserUrl.textContent = `love.com.br/${validation.slug}`;
        const overviewUrl = document.getElementById('overview-public-url');
        if (overviewUrl) overviewUrl.textContent = activeEv.publicUrl;
      }
    });
  }

  // Botão "Copiar link" em Informações → Endereço do site
  const btnEditorDataCopyLink = document.getElementById('editor-data-copy-link');
  if (btnEditorDataCopyLink) {
    btnEditorDataCopyLink.addEventListener('click', () => {
      const activeEv = getActiveEvent();
      const slugAtual = (inputEditorSlug && inputEditorSlug.value) || activeEv.slug || '';
      const url = activeEv.publicUrl || `https://love.com.br/${slugAtual}`;
      const restoreLabel = () => {
        btnEditorDataCopyLink.title = 'Copiar link';
        btnEditorDataCopyLink.classList.remove('text-emerald-600');
        btnEditorDataCopyLink.classList.add('text-zinc-400');
      };
      const marcarCopiado = () => {
        btnEditorDataCopyLink.title = 'Copiado!';
        btnEditorDataCopyLink.classList.remove('text-zinc-400');
        btnEditorDataCopyLink.classList.add('text-emerald-600');
        setTimeout(restoreLabel, 2000);
      };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(url).then(marcarCopiado).catch(() => {
          const temp = document.createElement('input');
          temp.value = url;
          document.body.appendChild(temp);
          temp.select();
          document.execCommand('copy');
          temp.remove();
          marcarCopiado();
        });
      } else {
        const temp = document.createElement('input');
        temp.value = url;
        document.body.appendChild(temp);
        temp.select();
        document.execCommand('copy');
        temp.remove();
        marcarCopiado();
      }
    });
  }

  // ==========================================
  // CONTROLES DE DESIGN & ESTÉTICA (Aparência Fiel à Referência)
  // ==========================================
  // 1. Fonte do Título e Cor
  const selTitleFont = document.getElementById('editor-select-title-font');
  const titleColorPicker = document.getElementById('editor-title-color-picker');
  const swatchTitleBtn = document.getElementById('swatch-title-color-btn');

  if (selTitleFont) {
    selTitleFont.addEventListener('change', (e) => {
      builderState.font = e.target.value;
      updateTitleFontSelectDisplay(e.target.value);
      const activeEv = getActiveEvent();
      if (activeEv) activeEv.fontFamily = e.target.value;
      updateLiveSitePreview();
    });
  }
  if (titleColorPicker) {
    const handleTitleColor = (e) => {
      builderState.titleColor = e.target.value;
      if (swatchTitleBtn) swatchTitleBtn.style.backgroundColor = e.target.value;
      const activeEv = getActiveEvent();
      if (activeEv) activeEv.titleColor = e.target.value;
      updateLiveSitePreview();
    };
    titleColorPicker.addEventListener('input', handleTitleColor);
    titleColorPicker.addEventListener('change', handleTitleColor);
  }

  const titleSizeSlider = document.getElementById('editor-title-size-slider');
  const titleSizeVal = document.getElementById('editor-title-size-val');
  if (titleSizeSlider) {
    const handleTitleSize = (e) => {
      const val = parseInt(e.target.value, 10);
      builderState.titleSize = val;
      if (titleSizeVal) titleSizeVal.textContent = val + 'px';
      const activeEv = getActiveEvent();
      if (activeEv) activeEv.titleSize = val;
      updateLiveSitePreview();
    };
    titleSizeSlider.addEventListener('input', handleTitleSize);
    titleSizeSlider.addEventListener('change', handleTitleSize);
  }

  // 2. Fonte dos Textos / Descrição e Cor
  const selDescFont = document.getElementById('editor-select-desc-font');
  const descColorPicker = document.getElementById('editor-desc-color-picker');
  const swatchDescBtn = document.getElementById('swatch-desc-color-btn');

  if (selDescFont) {
    selDescFont.addEventListener('change', (e) => {
      builderState.descFont = e.target.value;
      updateDescFontSelectDisplay(e.target.value);
      const activeEv = getActiveEvent();
      if (activeEv) activeEv.descFont = e.target.value;
      updateLiveSitePreview();
    });
  }
  if (descColorPicker) {
    const handleDescColor = (e) => {
      builderState.descColor = e.target.value;
      if (swatchDescBtn) swatchDescBtn.style.backgroundColor = e.target.value;
      const activeEv = getActiveEvent();
      if (activeEv) activeEv.descColor = e.target.value;
      updateLiveSitePreview();
    };
    descColorPicker.addEventListener('input', handleDescColor);
    descColorPicker.addEventListener('change', handleDescColor);
  }

  const descSizeSlider = document.getElementById('editor-desc-size-slider');
  const descSizeVal = document.getElementById('editor-desc-size-val');
  if (descSizeSlider) {
    const handleDescSize = (e) => {
      const val = parseInt(e.target.value, 10);
      builderState.descSize = val;
      if (descSizeVal) descSizeVal.textContent = val + 'px';
      const activeEv = getActiveEvent();
      if (activeEv) activeEv.descSize = val;
      updateLiveSitePreview();
    };
    descSizeSlider.addEventListener('input', handleDescSize);
    descSizeSlider.addEventListener('change', handleDescSize);
  }

  // 3. Opacidade e Cor do Degradê
  const gradOpacitySlider = document.getElementById('editor-gradient-opacity-slider');
  const gradOpacityVal = document.getElementById('gradient-opacity-value');
  const gradColorPicker = document.getElementById('editor-gradient-color-picker');
  const swatchGradBtn = document.getElementById('swatch-gradient-color-btn');

  if (gradOpacitySlider) {
    gradOpacitySlider.addEventListener('input', (e) => {
      builderState.gradientOpacity = parseInt(e.target.value, 10);
      if (gradOpacityVal) gradOpacityVal.textContent = e.target.value + '%';
      const activeEv = getActiveEvent();
      if (activeEv) activeEv.gradientOpacity = builderState.gradientOpacity;
      updateLiveSitePreview();
    });
  }
  if (gradColorPicker) {
    gradColorPicker.addEventListener('input', (e) => {
      builderState.gradientColor = e.target.value;
      if (swatchGradBtn) swatchGradBtn.style.backgroundColor = e.target.value;
      const activeEv = getActiveEvent();
      if (activeEv) activeEv.gradientColor = e.target.value;
      updateLiveSitePreview();
    });
  }

  // 4. Plano de Fundo (Preset Off-White + Custom Picker)
  const selBgPreset = document.getElementById('editor-select-bg-preset');
  const bgPickerEl = document.getElementById('editor-bg-color-picker');
  const swatchBgBtn = document.getElementById('swatch-bg-color-btn');

  if (selBgPreset) {
    selBgPreset.addEventListener('change', (e) => {
      const color = e.target.value;
      builderState.bgColor = color;
      builderState.gradientColor = color;
      if (bgPickerEl) bgPickerEl.value = color.startsWith('#') ? color : '#FBFBFA';
      if (swatchBgBtn) swatchBgBtn.style.backgroundColor = color;
      const activeEv = getActiveEvent();
      if (activeEv) {
        activeEv.bgColor = color;
        activeEv.gradientColor = color;
      }
      updateLiveSitePreview();
    });
  }
  if (bgPickerEl) {
    bgPickerEl.addEventListener('input', (e) => {
      const color = e.target.value;
      builderState.bgColor = color;
      builderState.gradientColor = color;
      if (swatchBgBtn) swatchBgBtn.style.backgroundColor = color;
      const activeEv = getActiveEvent();
      if (activeEv) {
        activeEv.bgColor = color;
        activeEv.gradientColor = color;
      }
      updateLiveSitePreview();
    });
  }

  // 5. Cor dos Botões (Preset Sugerido + Custom Picker)
  const selBtnPreset = document.getElementById('editor-select-btn-preset');
  const btnColorPickerEl = document.getElementById('editor-btn-color-picker');
  const swatchBtnColor = document.getElementById('swatch-btn-color-btn');
  const btnColorDisplay = document.getElementById('btn-color-code-display');
  const btnColorSample = document.getElementById('btn-color-preview-sample');

  function updateButtonColorUI(color) {
    if (!color) return;
    if (btnColorPickerEl) btnColorPickerEl.value = color.startsWith('#') ? color : '#FBFBFA';
    if (swatchBtnColor) swatchBtnColor.style.backgroundColor = color;
    if (btnColorDisplay) btnColorDisplay.textContent = color.toUpperCase();
    if (btnColorSample) btnColorSample.style.backgroundColor = color;
    if (selBtnPreset) {
      const matchOpt = Array.from(selBtnPreset.options).find(opt => opt.value.toLowerCase() === color.toLowerCase());
      if (matchOpt) {
        selBtnPreset.value = matchOpt.value;
      }
    }
  }

  if (selBtnPreset) {
    selBtnPreset.addEventListener('change', (e) => {
      const color = e.target.value;
      builderState.accentColor = color;
      updateButtonColorUI(color);
      const activeEv = getActiveEvent();
      if (activeEv) {
        activeEv.accentColor = color;
      }
      updateLiveSitePreview();
    });
  }

  if (btnColorPickerEl) {
    btnColorPickerEl.addEventListener('input', (e) => {
      const color = e.target.value;
      builderState.accentColor = color;
      updateButtonColorUI(color);
      const activeEv = getActiveEvent();
      if (activeEv) {
        activeEv.accentColor = color;
      }
      updateLiveSitePreview();
    });
  }

  // Cor do Texto do Botão (Preset + Custom Picker)
  const selBtnTextPreset = document.getElementById('editor-select-btn-text-preset');
  const btnTextColorPicker = document.getElementById('editor-btn-text-color-picker');
  const swatchBtnTextBtn = document.getElementById('swatch-btn-text-color-btn');

  function updateButtonTextColorUI(color) {
    if (!color) return;
    if (btnTextColorPicker) btnTextColorPicker.value = color.startsWith('#') ? color : '#18181B';
    if (swatchBtnTextBtn) swatchBtnTextBtn.style.backgroundColor = color;
    if (selBtnTextPreset) {
      const matchOpt = Array.from(selBtnTextPreset.options).find(opt => opt.value.toLowerCase() === color.toLowerCase());
      if (matchOpt) {
        selBtnTextPreset.value = matchOpt.value;
      }
    }
  }

  if (selBtnTextPreset) {
    selBtnTextPreset.addEventListener('change', (e) => {
      const color = e.target.value;
      builderState.btnTextColor = color;
      updateButtonTextColorUI(color);
      const activeEv = getActiveEvent();
      if (activeEv) {
        activeEv.btnTextColor = color;
      }
      updateLiveSitePreview();
    });
  }

  if (btnTextColorPicker) {
    btnTextColorPicker.addEventListener('input', (e) => {
      const color = e.target.value;
      builderState.btnTextColor = color;
      updateButtonTextColorUI(color);
      const activeEv = getActiveEvent();
      if (activeEv) {
        activeEv.btnTextColor = color;
      }
      updateLiveSitePreview();
    });
  }

  // Slider de Arredondamento da Borda dos Botões
  const btnRadiusSlider = document.getElementById('editor-btn-radius-slider');
  const btnRadiusVal = document.getElementById('editor-btn-radius-val');

  if (btnRadiusSlider) {
    btnRadiusSlider.addEventListener('input', (e) => {
      const val = parseInt(e.target.value, 10);
      builderState.btnRadius = val;
      if (btnRadiusVal) {
        if (val >= 28) {
          btnRadiusVal.textContent = 'Total';
        } else if (val === 0) {
          btnRadiusVal.textContent = '0px (Reto)';
        } else {
          btnRadiusVal.textContent = `${val}px`;
        }
      }
      const activeEv = getActiveEvent();
      if (activeEv) {
        activeEv.btnRadius = val;
      }
      updateLiveSitePreview();
    });
  }

  // Dropdown de Ícones dos Botões (Animado, Moderno, Minimalista)
  const selectBtnIcons = document.getElementById('editor-select-btn-icons');
  if (selectBtnIcons) {
    selectBtnIcons.addEventListener('change', (e) => {
      const val = e.target.value;
      builderState.buttonIconsStyle = val;
      builderState.themeStyle = val;
      const activeEv = getActiveEvent();
      if (activeEv) {
        activeEv.buttonIconsStyle = val;
        activeEv.themeStyle = val;
      }
      updateLiveSitePreview();
    });
  }

  // Dropdown de Ornamentos (Sem, Clássico, Moderno)
  const selectOrnaments = document.getElementById('editor-select-ornaments');
  if (selectOrnaments) {
    selectOrnaments.addEventListener('change', (e) => {
      const val = e.target.value;
      builderState.ornamentsStyle = val;
      const activeEv = getActiveEvent();
      if (activeEv) {
        activeEv.ornamentsStyle = val;
      }
      updateLiveSitePreview();
    });
  }

  // Sincronização e Handlers de Estilo Dobrável (Foldable Accordion) & Formatação de Texto
  function syncTextFormatButtons() {
    function setBtnActive(btn, isActive) {
      if (!btn) return;
      if (isActive) {
        btn.classList.add('bg-[#537bae]', 'text-white', 'shadow-2xs');
        btn.classList.remove('text-zinc-700', 'text-zinc-600', 'hover:bg-white');
      } else {
        btn.classList.remove('bg-[#537bae]', 'text-white', 'shadow-2xs');
        btn.classList.add('text-zinc-700', 'hover:bg-white');
      }
    }

    // Título: B, I, U
    setBtnActive(document.getElementById('btn-title-bold'), builderState.titleBold);
    setBtnActive(document.getElementById('btn-title-italic'), builderState.titleItalic);
    setBtnActive(document.getElementById('btn-title-underline'), builderState.titleUnderline);

    // Título: Alinhamento
    const tAlign = builderState.titleAlign || 'center';
    setBtnActive(document.getElementById('btn-title-align-left'), tAlign === 'left');
    setBtnActive(document.getElementById('btn-title-align-center'), tAlign === 'center');
    setBtnActive(document.getElementById('btn-title-align-right'), tAlign === 'right');

    // Descrição: B, I, U
    setBtnActive(document.getElementById('btn-desc-bold'), builderState.descBold);
    setBtnActive(document.getElementById('btn-desc-italic'), builderState.descItalic);
    setBtnActive(document.getElementById('btn-desc-underline'), builderState.descUnderline);

    // Descrição: Alinhamento
    const dAlign = builderState.descAlign || 'center';
    setBtnActive(document.getElementById('btn-desc-align-left'), dAlign === 'left');
    setBtnActive(document.getElementById('btn-desc-align-center'), dAlign === 'center');
    setBtnActive(document.getElementById('btn-desc-align-right'), dAlign === 'right');
  }

  // Accordion Dobrável: Estilo do Título e Estilo da Descrição
  const btnToggleTitle = document.getElementById('btn-toggle-title-style');
  const btnToggleDesc = document.getElementById('btn-toggle-desc-style');
  const contentTitle = document.getElementById('content-title-style');
  const contentDesc = document.getElementById('content-desc-style');
  const arrowTitle = document.getElementById('arrow-title-style');
  const arrowDesc = document.getElementById('arrow-desc-style');

  function toggleTitleAccordion() {
    if (!contentTitle) return;
    const isTitleOpen = !contentTitle.classList.contains('hidden');
    if (isTitleOpen) {
      contentTitle.classList.add('hidden');
      if (arrowTitle) arrowTitle.classList.remove('rotate-90');
    } else {
      contentTitle.classList.remove('hidden');
      if (arrowTitle) arrowTitle.classList.add('rotate-90');
    }
  }

  function toggleDescAccordion() {
    if (!contentDesc) return;
    const isDescOpen = !contentDesc.classList.contains('hidden');
    if (isDescOpen) {
      contentDesc.classList.add('hidden');
      if (arrowDesc) arrowDesc.classList.remove('rotate-90');
    } else {
      contentDesc.classList.remove('hidden');
      if (arrowDesc) arrowDesc.classList.add('rotate-90');
    }
  }

  if (btnToggleTitle) {
    btnToggleTitle.addEventListener('click', (e) => {
      e.preventDefault();
      toggleTitleAccordion();
    });
  }

  if (btnToggleDesc) {
    btnToggleDesc.addEventListener('click', (e) => {
      e.preventDefault();
      toggleDescAccordion();
    });
  }

  // Listeners para B, I, U e Alinhamento do Título
  const btnTitleBold = document.getElementById('btn-title-bold');
  const btnTitleItalic = document.getElementById('btn-title-italic');
  const btnTitleUnderline = document.getElementById('btn-title-underline');
  const btnTitleAlignLeft = document.getElementById('btn-title-align-left');
  const btnTitleAlignCenter = document.getElementById('btn-title-align-center');
  const btnTitleAlignRight = document.getElementById('btn-title-align-right');

  if (btnTitleBold) {
    btnTitleBold.addEventListener('click', () => {
      builderState.titleBold = !builderState.titleBold;
      syncTextFormatButtons();
      updateLiveSitePreview();
    });
  }
  if (btnTitleItalic) {
    btnTitleItalic.addEventListener('click', () => {
      builderState.titleItalic = !builderState.titleItalic;
      syncTextFormatButtons();
      updateLiveSitePreview();
    });
  }
  if (btnTitleUnderline) {
    btnTitleUnderline.addEventListener('click', () => {
      builderState.titleUnderline = !builderState.titleUnderline;
      syncTextFormatButtons();
      updateLiveSitePreview();
    });
  }
  if (btnTitleAlignLeft) {
    btnTitleAlignLeft.addEventListener('click', () => {
      builderState.titleAlign = 'left';
      syncTextFormatButtons();
      updateLiveSitePreview();
    });
  }
  if (btnTitleAlignCenter) {
    btnTitleAlignCenter.addEventListener('click', () => {
      builderState.titleAlign = 'center';
      syncTextFormatButtons();
      updateLiveSitePreview();
    });
  }
  if (btnTitleAlignRight) {
    btnTitleAlignRight.addEventListener('click', () => {
      builderState.titleAlign = 'right';
      syncTextFormatButtons();
      updateLiveSitePreview();
    });
  }

  // Listeners para B, I, U e Alinhamento da Descrição
  const btnDescBold = document.getElementById('btn-desc-bold');
  const btnDescItalic = document.getElementById('btn-desc-italic');
  const btnDescUnderline = document.getElementById('btn-desc-underline');
  const btnDescAlignLeft = document.getElementById('btn-desc-align-left');
  const btnDescAlignCenter = document.getElementById('btn-desc-align-center');
  const btnDescAlignRight = document.getElementById('btn-desc-align-right');

  if (btnDescBold) {
    btnDescBold.addEventListener('click', () => {
      builderState.descBold = !builderState.descBold;
      const activeEv = getActiveEvent();
      if (activeEv) activeEv.descBold = builderState.descBold;
      syncTextFormatButtons();
      updateLiveSitePreview();
    });
  }
  if (btnDescItalic) {
    btnDescItalic.addEventListener('click', () => {
      builderState.descItalic = !builderState.descItalic;
      const activeEv = getActiveEvent();
      if (activeEv) activeEv.descItalic = builderState.descItalic;
      syncTextFormatButtons();
      updateLiveSitePreview();
    });
  }
  if (btnDescUnderline) {
    btnDescUnderline.addEventListener('click', () => {
      builderState.descUnderline = !builderState.descUnderline;
      const activeEv = getActiveEvent();
      if (activeEv) activeEv.descUnderline = builderState.descUnderline;
      syncTextFormatButtons();
      updateLiveSitePreview();
    });
  }
  if (btnDescAlignLeft) {
    btnDescAlignLeft.addEventListener('click', () => {
      builderState.descAlign = 'left';
      const activeEv = getActiveEvent();
      if (activeEv) activeEv.descAlign = 'left';
      syncTextFormatButtons();
      updateLiveSitePreview();
    });
  }
  if (btnDescAlignCenter) {
    btnDescAlignCenter.addEventListener('click', () => {
      builderState.descAlign = 'center';
      const activeEv = getActiveEvent();
      if (activeEv) activeEv.descAlign = 'center';
      syncTextFormatButtons();
      updateLiveSitePreview();
    });
  }
  if (btnDescAlignRight) {
    btnDescAlignRight.addEventListener('click', () => {
      builderState.descAlign = 'right';
      const activeEv = getActiveEvent();
      if (activeEv) activeEv.descAlign = 'right';
      syncTextFormatButtons();
      updateLiveSitePreview();
    });
  }

  // ==========================================
  // CONTROLE DOS 6 SLOTS COM BOTÃO (+) E DROPDOWN DE OPÇÕES (TÍTULO/TEXTO)
  // ==========================================

  // Preenche um slot vazio com Título ou Texto e foca para digitação imediata.
  // Usado tanto pelo dropdown "+" de dentro da prévia quanto pela sidebar de Elementos.
  function addSlotContent(slotIdx, type) {
    if (!builderState.slots) {
      builderState.slots = [null, null, null, null, null, null];
    }
    while (builderState.slots.length < 6) builderState.slots.push(null);

    const defaultContent = type === 'title'
      ? (slotIdx === 2 ? 'Beatriz & Lucas' : (slotIdx === 4 ? 'Esperamos por você!' : (slotIdx === 0 ? 'Casamento' : 'Título')))
      : (slotIdx === 0 ? '"Um cordão de três dobras não se rompe com facilidade." (Eclesiastes 4:12)' : (slotIdx === 1 ? 'COM A BÊNÇÃO DE DEUS,' : (slotIdx === 5 ? 'Sua presença tornará nosso dia ainda mais especial.' : 'CONVIDAM VOCÊ PARA O SEU CASAMENTO')));

    builderState.slots[slotIdx] = {
      type: type,
      content: defaultContent,
      bend: 0
    };

    updateLiveSitePreview();

    setTimeout(() => {
      const slotEl = document.getElementById(`invite-slot-${slotIdx}`);
      const box = slotEl ? slotEl.querySelector('.editable-live-box') : null;
      if (box) {
        box.focus();
        const range = document.createRange();
        range.selectNodeContents(box);
        const sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);
      }
    }, 70);
  }

  document.addEventListener('click', (e) => {
    // 1. Clique no botão (+) de um slot
    const addBtn = e.target.closest('.btn-slot-add');
    if (addBtn) {
      e.stopPropagation();
      const slotIdx = addBtn.getAttribute('data-slot');
      document.querySelectorAll('[id^="dropdown-slot-"]').forEach(dd => {
        if (dd.id !== `dropdown-slot-${slotIdx}`) dd.classList.add('hidden');
      });
      const dd = document.getElementById(`dropdown-slot-${slotIdx}`);
      if (dd) dd.classList.toggle('hidden');
      return;
    }

    // 2. Clique em uma opção (Título ou Texto) do dropdown de um slot
    const pickBtn = e.target.closest('.btn-slot-pick');
    if (pickBtn) {
      e.stopPropagation();
      const slotIdx = parseInt(pickBtn.getAttribute('data-slot'), 10);
      const type = pickBtn.getAttribute('data-type');

      const dd = document.getElementById(`dropdown-slot-${slotIdx}`);
      if (dd) dd.classList.add('hidden');

      addSlotContent(slotIdx, type);
      return;
    }

    // 3. Clique em Subir (↑)
    const upBtn = e.target.closest('.btn-slot-up');
    if (upBtn) {
      e.stopPropagation();
      const idx = parseInt(upBtn.getAttribute('data-slot'), 10);
      if (idx > 0 && idx !== 4) {
        const temp = builderState.slots[idx];
        builderState.slots[idx] = builderState.slots[idx - 1];
        builderState.slots[idx - 1] = temp;
        updateLiveSitePreview();
      }
      return;
    }

    // 4. Clique em Descer (↓)
    const downBtn = e.target.closest('.btn-slot-down');
    if (downBtn) {
      e.stopPropagation();
      const idx = parseInt(downBtn.getAttribute('data-slot'), 10);
      if (idx < 3 || idx === 4) {
        const temp = builderState.slots[idx];
        builderState.slots[idx] = builderState.slots[idx + 1];
        builderState.slots[idx + 1] = temp;
        updateLiveSitePreview();
      }
      return;
    }

    // 5. Clique fora: fecha todos os dropdowns de slot abertos
    if (!e.target.closest('.invite-slot-wrapper')) {
      document.querySelectorAll('[id^="dropdown-slot-"]').forEach(dd => dd.classList.add('hidden'));
    }
  });

  // 5. Listeners para Templates Sugeridos (Featured Themes)
  document.querySelectorAll('#featured-themes-list .theme-card').forEach(card => {
    card.addEventListener('click', () => {
      const themeId = card.getAttribute('data-theme-id');
      if (themeId) {
        applyTemplate(themeId, true);
      }
    });
  });

  // ==========================================
  // CROPPER & AJUSTE DE FOTO DE CAPA (Modal Interativo)
  // ==========================================
  const cropModal = document.getElementById('modal-crop-cover');
  const cropImageTarget = document.getElementById('crop-image-target');
  const cropViewportContainer = document.getElementById('crop-viewport-container');
  const cropOverlayBox = document.getElementById('crop-overlay-box');
  const cropZoomRange = document.getElementById('crop-zoom-range');
  const btnCropZoomIn = document.getElementById('btn-crop-zoom-in');
  const btnCropZoomOut = document.getElementById('btn-crop-zoom-out');
  const btnCropRotate = document.getElementById('btn-crop-rotate');
  const btnCropReset = document.getElementById('btn-crop-reset');
  const btnApplyCrop = document.getElementById('btn-apply-crop');
  const cropAspectBadge = document.getElementById('crop-aspect-badge');

  let cropState = {
    target: 'cover',
    x: 0,
    y: 0,
    zoom: 1,
    rotation: 0,
    ratio: '16/9',
    rawImageSrc: '',
    fileName: '',
    isDragging: false,
    startX: 0,
    startY: 0
  };

  function updateCropTransform() {
    if (!cropImageTarget) return;
    cropImageTarget.style.transform = `translate(${cropState.x}px, ${cropState.y}px) scale(${cropState.zoom}) rotate(${cropState.rotation}deg)`;
    if (cropZoomRange) cropZoomRange.value = cropState.zoom;
  }

  function resetCropState() {
    cropState.x = 0;
    cropState.y = 0;
    cropState.rotation = 0;

    if (cropImageTarget && cropViewportContainer) {
      const vW = cropViewportContainer.clientWidth || 550;
      const vH = cropViewportContainer.clientHeight || 320;
      const nW = cropImageTarget.naturalWidth || 800;
      const nH = cropImageTarget.naturalHeight || 600;

      // Dimensiona para que a imagem inteira caiba visível no container de recorte
      const fitScale = Math.min((vW * 0.95) / nW, (vH * 0.95) / nH, 1);
      const baseW = Math.round(nW * fitScale);
      const baseH = Math.round(nH * fitScale);

      cropImageTarget.style.width = `${baseW}px`;
      cropImageTarget.style.height = `${baseH}px`;
      cropImageTarget.style.maxWidth = 'none';
      cropImageTarget.style.maxHeight = 'none';

      cropState.zoom = 1;
    } else {
      cropState.zoom = 1;
    }

    updateCropTransform();
  }

  // Listener para Upload da Foto de Capa -> Abre Modal de Recorte antes de aplicar
  const inputCoverFile = document.getElementById('editor-cover-file-input');
  if (inputCoverFile) {
    inputCoverFile.addEventListener('change', (e) => {
      const file = e.target.files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
          cropState.target = 'cover';
          cropState.rawImageSrc = event.target.result;
          cropState.fileName = file.name;
          
          if (cropImageTarget) {
            cropImageTarget.src = cropState.rawImageSrc;
            cropImageTarget.onload = () => {
              resetCropState();
              cropState.ratio = '16/9';
              if (cropAspectBadge) cropAspectBadge.textContent = '16:9 Panorâmico';
              document.querySelectorAll('.btn-crop-aspect').forEach(b => {
                if (b.getAttribute('data-ratio') === '16/9') {
                  b.classList.add('active', 'border-blue-600', 'bg-blue-50', 'text-blue-700');
                  b.classList.remove('border-slate-200', 'text-slate-600');
                } else {
                  b.classList.remove('active', 'border-blue-600', 'bg-blue-50', 'text-blue-700');
                  b.classList.add('border-slate-200', 'text-slate-600');
                }
              });
              if (cropOverlayBox) {
                cropOverlayBox.style.width = '85%';
                cropOverlayBox.style.height = '60%';
              }
              const titleEl = document.querySelector('#modal-crop-cover h3');
              if (titleEl) titleEl.textContent = 'Ajustar Foto de Capa';
              const descEl = document.querySelector('#modal-crop-cover p');
              if (descEl) descEl.textContent = 'Selecione e recorte o enquadramento perfeito para o cabeçalho do seu evento.';
              openModal(cropModal);
              showToast('Selecione e ajuste o enquadramento da sua foto de capa.', '✂️');
            };
          }
        };
        reader.readAsDataURL(file);
        // Limpa valor do input para permitir selecionar o mesmo arquivo novamente
        inputCoverFile.value = '';
      }
    });
  }

  // Listener para Botão Alterar Imagem de Capa no Live Preview
  const btnChangeCoverImg = document.getElementById('btn-change-cover-img');
  if (btnChangeCoverImg && inputCoverFile) {
    btnChangeCoverImg.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      inputCoverFile.click();
    });
  }

  // Listener para Adicionar Imagem de Capa a partir do Slot Vazio (+)
  const coverEmptySlot = document.getElementById('cover-image-empty-slot');
  if (coverEmptySlot && inputCoverFile) {
    coverEmptySlot.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      inputCoverFile.click();
    });
  }

  // Listener para Excluir Imagem de Capa (botão ✕)
  const btnDeleteCoverImg = document.getElementById('btn-delete-cover-img');
  if (btnDeleteCoverImg) {
    btnDeleteCoverImg.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      builderState.coverImage = '';
      builderState.hasCustomCoverImage = false;
      const activeEv = getActiveEvent();
      if (activeEv) {
        activeEv.coverImage = '';
        activeEv.hasCustomCoverImage = false;
      }
      updateLiveSitePreview();
      showToast('Foto de capa removida. Clique em + para adicionar uma nova.', '🗑️');
    });
  }



  // Helper e Listeners para Imagem de Fundo do Convite
  function updateBgImageUI(imgUrl) {
    const thumb = document.getElementById('editor-bg-thumb-preview');
    const icon = document.getElementById('editor-bg-placeholder-icon');
    const btnRemove = document.getElementById('btn-remove-bg-image');
    const uploadText = document.getElementById('editor-bg-upload-text');

    if (imgUrl) {
      if (thumb) {
        thumb.src = imgUrl;
        thumb.classList.remove('hidden');
      }
      if (icon) icon.classList.add('hidden');
      if (btnRemove) btnRemove.classList.remove('hidden');
      if (uploadText) uploadText.textContent = 'Alterar imagem de fundo';
    } else {
      if (thumb) {
        thumb.src = '';
        thumb.classList.add('hidden');
      }
      if (icon) icon.classList.remove('hidden');
      if (btnRemove) btnRemove.classList.add('hidden');
      if (uploadText) uploadText.textContent = 'Adicionar imagem de fundo';
    }
  }

  const inputBgFile = document.getElementById('editor-bg-file-input');
  if (inputBgFile) {
    inputBgFile.addEventListener('change', (e) => {
      const file = e.target.files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
          builderState.bgImage = event.target.result;
          const activeEv = getActiveEvent();
          if (activeEv) activeEv.bgImage = event.target.result;
          updateBgImageUI(event.target.result);
          updateLiveSitePreview();
          showToast('Imagem de fundo adicionada!', '🖼️');
        };
        reader.readAsDataURL(file);
      }
    });
  }

  const btnRemoveBg = document.getElementById('btn-remove-bg-image');
  if (btnRemoveBg) {
    btnRemoveBg.addEventListener('click', (e) => {
      e.stopPropagation();
      e.preventDefault();
      builderState.bgImage = null;
      const activeEv = getActiveEvent();
      if (activeEv) activeEv.bgImage = null;
      if (inputBgFile) inputBgFile.value = '';
      updateBgImageUI(null);
      updateLiveSitePreview();
      showToast('Imagem de fundo removida.', '🗑️');
    });
  }

  // Listener para Upload da Imagem do Local / Evento no Live Preview
  const btnChangeVenueImg = document.getElementById('btn-change-venue-img');
  const inputVenueFile = document.getElementById('venue-image-file-input');
  if (btnChangeVenueImg && inputVenueFile) {
    btnChangeVenueImg.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      inputVenueFile.click();
    });

    inputVenueFile.addEventListener('change', (e) => {
      const file = e.target.files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
          cropState.target = 'venue';
          cropState.rawImageSrc = event.target.result;
          cropState.fileName = file.name;
          
          if (cropImageTarget) {
            cropImageTarget.src = cropState.rawImageSrc;
            cropImageTarget.onload = () => {
              resetCropState();
              cropState.ratio = '1/1';
              if (cropAspectBadge) cropAspectBadge.textContent = '1:1 Quadrado';
              document.querySelectorAll('.btn-crop-aspect').forEach(b => {
                if (b.getAttribute('data-ratio') === '1/1') {
                  b.classList.add('active', 'border-blue-600', 'bg-blue-50', 'text-blue-700');
                  b.classList.remove('border-slate-200', 'text-slate-600');
                } else {
                  b.classList.remove('active', 'border-blue-600', 'bg-blue-50', 'text-blue-700');
                  b.classList.add('border-slate-200', 'text-slate-600');
                }
              });
              if (cropOverlayBox) {
                cropOverlayBox.style.width = '240px';
                cropOverlayBox.style.height = '240px';
              }
              const titleEl = document.querySelector('#modal-crop-cover h3');
              if (titleEl) titleEl.textContent = 'Ajustar Imagem do Evento / Local';
              const descEl = document.querySelector('#modal-crop-cover p');
              if (descEl) descEl.textContent = 'Ajuste o enquadramento quadrado perfeito para a imagem do seu evento.';
              openModal(cropModal);
              showToast('Ajuste o enquadramento quadrado da imagem.', '✂️');
            };
          }
        };
        reader.readAsDataURL(file);
        inputVenueFile.value = '';
      }
    });
  }

  // Listener para Excluir Imagem do Evento / Local (botão ✕)
  const btnDeleteVenueImg = document.getElementById('btn-delete-venue-img');
  if (btnDeleteVenueImg) {
    btnDeleteVenueImg.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      builderState.venueImage = '';
      const activeEv = getActiveEvent();
      if (activeEv) {
        activeEv.venueImage = '';
      }
      updateLiveSitePreview();
      showToast('Imagem removida com sucesso. Clique em + para adicionar uma nova.', '🗑️');
    });
  }

  // Listener para Adicionar Imagem a partir do Slot Vazio (+)
  const venueEmptySlot = document.getElementById('venue-image-empty-slot');
  if (venueEmptySlot && inputVenueFile) {
    venueEmptySlot.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      inputVenueFile.click();
    });
  }

  // Listener para Upload da Imagem de Fechamento / Rodapé do Casal
  const btnChangeClosingImg = document.getElementById('btn-change-closing-img');
  const inputClosingFile = document.getElementById('closing-image-file-input');
  if (btnChangeClosingImg && inputClosingFile) {
    btnChangeClosingImg.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      inputClosingFile.click();
    });

    inputClosingFile.addEventListener('change', (e) => {
      const file = e.target.files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
          cropState.target = 'closing';
          cropState.rawImageSrc = event.target.result;
          cropState.fileName = file.name;

          if (cropImageTarget) {
            cropImageTarget.src = cropState.rawImageSrc;
            cropImageTarget.onload = () => {
              resetCropState();
              cropState.ratio = '16/9';
              if (cropAspectBadge) cropAspectBadge.textContent = '16:9 Panorâmico';
              document.querySelectorAll('.btn-crop-aspect').forEach(b => {
                if (b.getAttribute('data-ratio') === '16/9') {
                  b.classList.add('active', 'border-blue-600', 'bg-blue-50', 'text-blue-700');
                  b.classList.remove('border-slate-200', 'text-slate-600');
                } else {
                  b.classList.remove('active', 'border-blue-600', 'bg-blue-50', 'text-blue-700');
                  b.classList.add('border-slate-200', 'text-slate-600');
                }
              });
              if (cropOverlayBox) {
                cropOverlayBox.style.width = '85%';
                cropOverlayBox.style.height = '60%';
              }
              const titleEl = document.querySelector('#modal-crop-cover h3');
              if (titleEl) titleEl.textContent = 'Ajustar Imagem de Encerramento';
              const descEl = document.querySelector('#modal-crop-cover p');
              if (descEl) descEl.textContent = 'Ajuste o enquadramento perfeito para a imagem final do convite.';
              openModal(cropModal);
              showToast('Ajuste o enquadramento da imagem de encerramento.', '✂️');
            };
          }
        };
        reader.readAsDataURL(file);
        inputClosingFile.value = '';
      }
    });
  }

  // Listener para Excluir Imagem de Encerramento (botão ✕)
  const btnDeleteClosingImg = document.getElementById('btn-delete-closing-img');
  if (btnDeleteClosingImg) {
    btnDeleteClosingImg.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      builderState.closingImage = '';
      const activeEv = getActiveEvent();
      if (activeEv) {
        activeEv.closingImage = '';
      }
      updateLiveSitePreview();
      showToast('Imagem de encerramento removida com sucesso. Clique em + para adicionar uma nova.', '🗑️');
    });
  }

  // Listener para Adicionar Imagem a partir do Slot Vazio (+) de Encerramento
  const closingEmptySlot = document.getElementById('closing-image-empty-slot');
  if (closingEmptySlot && inputClosingFile) {
    closingEmptySlot.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      inputClosingFile.click();
    });
  }

  // Botão Reabrir Recorte na Imagem Atual
  const btnReopenCrop = document.getElementById('btn-reopen-crop-modal');
  if (btnReopenCrop) {
    btnReopenCrop.addEventListener('click', () => {
      cropState.rawImageSrc = builderState.coverImage || 'assets/wedding_hero_banner.jpg';
      cropState.fileName = document.getElementById('editor-cover-file-name')?.textContent || 'foto-capa.jpg';
      if (cropImageTarget) {
        cropImageTarget.src = cropState.rawImageSrc;
        cropImageTarget.onload = () => {
          resetCropState();
          openModal(cropModal);
          showToast('Ajuste e recorte sua foto de capa.', '✂️');
        };
      }
    });
  }

  // Presets de Imagem de Capa -> Abre Modal de Recorte
  document.querySelectorAll('.btn-cover-preset').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.btn-cover-preset').forEach(b => {
        b.classList.remove('active', 'border-blue-600');
        b.classList.add('border-transparent');
      });
      btn.classList.add('active', 'border-blue-600');
      btn.classList.remove('border-transparent');

      const imgSrc = btn.getAttribute('data-img-src');
      const imgName = btn.getAttribute('data-img-name') || 'capa-evento.jpg';
      if (imgSrc) {
        cropState.rawImageSrc = imgSrc;
        cropState.fileName = imgName;
        if (cropImageTarget) {
          cropImageTarget.src = cropState.rawImageSrc;
          cropImageTarget.onload = () => {
            resetCropState();
            openModal(cropModal);
            showToast('Selecione e ajuste o enquadramento da sua foto de capa.', '✂️');
          };
        }
      }
    });
  });

  // Arrastar Imagem no Viewport (Drag to pan)
  if (cropViewportContainer && cropImageTarget) {
    const onStartDrag = (clientX, clientY) => {
      cropState.isDragging = true;
      cropState.startX = clientX - cropState.x;
      cropState.startY = clientY - cropState.y;
    };

    const onMoveDrag = (clientX, clientY) => {
      if (!cropState.isDragging) return;
      cropState.x = clientX - cropState.startX;
      cropState.y = clientY - cropState.startY;
      updateCropTransform();
    };

    const onEndDrag = () => {
      cropState.isDragging = false;
    };

    // Mouse events
    cropViewportContainer.addEventListener('mousedown', (e) => {
      e.preventDefault();
      onStartDrag(e.clientX, e.clientY);
    });
    window.addEventListener('mousemove', (e) => {
      if (cropState.isDragging) {
        e.preventDefault();
        onMoveDrag(e.clientX, e.clientY);
      }
    });
    window.addEventListener('mouseup', onEndDrag);

    // Touch events
    cropViewportContainer.addEventListener('touchstart', (e) => {
      if (e.touches.length === 1) {
        onStartDrag(e.touches[0].clientX, e.touches[0].clientY);
      }
    }, { passive: true });
    window.addEventListener('touchmove', (e) => {
      if (cropState.isDragging && e.touches.length === 1) {
        onMoveDrag(e.touches[0].clientX, e.touches[0].clientY);
      }
    }, { passive: true });
    window.addEventListener('touchend', onEndDrag);
  }

  // Zoom slider & botões +/-
  if (cropZoomRange) {
    cropZoomRange.addEventListener('input', (e) => {
      cropState.zoom = parseFloat(e.target.value) || 1;
      updateCropTransform();
    });
  }
  if (btnCropZoomIn) {
    btnCropZoomIn.addEventListener('click', () => {
      cropState.zoom = Math.min(3, +(cropState.zoom + 0.15).toFixed(2));
      updateCropTransform();
    });
  }
  if (btnCropZoomOut) {
    btnCropZoomOut.addEventListener('click', () => {
      cropState.zoom = Math.max(0.4, +(cropState.zoom - 0.15).toFixed(2));
      updateCropTransform();
    });
  }

  // Rotação & Centralização
  if (btnCropRotate) {
    btnCropRotate.addEventListener('click', () => {
      cropState.rotation = (cropState.rotation + 90) % 360;
      updateCropTransform();
    });
  }
  if (btnCropReset) {
    btnCropReset.addEventListener('click', resetCropState);
  }

  // Botões de Proporção de Recorte (16:9, 21:9, 4:3)
  document.querySelectorAll('.btn-crop-aspect').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.btn-crop-aspect').forEach(b => {
        b.classList.remove('active', 'border-blue-600', 'bg-blue-50', 'text-blue-700');
        b.classList.add('border-slate-200', 'text-slate-600');
      });
      btn.classList.add('active', 'border-blue-600', 'bg-blue-50', 'text-blue-700');
      btn.classList.remove('border-slate-200', 'text-slate-600');

      const ratio = btn.getAttribute('data-ratio');
      cropState.ratio = ratio;

      if (cropOverlayBox) {
        if (ratio === '1/1') {
          cropOverlayBox.style.width = '240px';
          cropOverlayBox.style.height = '240px';
          if (cropAspectBadge) cropAspectBadge.textContent = '1:1 Quadrado';
        } else if (ratio === '21/9') {
          cropOverlayBox.style.width = '90%';
          cropOverlayBox.style.height = '42%';
          if (cropAspectBadge) cropAspectBadge.textContent = '21:9 Ultra-Wide';
        } else if (ratio === '4/3') {
          cropOverlayBox.style.width = '65%';
          cropOverlayBox.style.height = '75%';
          if (cropAspectBadge) cropAspectBadge.textContent = '4:3 Padrão';
        } else {
          // 16:9 padrão
          cropOverlayBox.style.width = '85%';
          cropOverlayBox.style.height = '60%';
          if (cropAspectBadge) cropAspectBadge.textContent = '16:9 Panorâmico';
        }
      }
    });
  });

  // Aplicar Recorte via HTML5 Canvas em alta resolução
  if (btnApplyCrop) {
    btnApplyCrop.addEventListener('click', () => {
      if (!cropImageTarget || !cropState.rawImageSrc) return;

      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let targetWidth = 1920;
        let targetHeight = 1080;

        if (cropState.ratio === '1/1') {
          targetWidth = 1200;
          targetHeight = 1200;
        } else if (cropState.ratio === '21/9') {
          targetHeight = 822;
        } else if (cropState.ratio === '4/3') {
          targetHeight = 1440;
        }

        canvas.width = targetWidth;
        canvas.height = targetHeight;
        const ctx = canvas.getContext('2d');

        // Dimensões do viewport e da caixa de overlay
        const vRect = cropViewportContainer.getBoundingClientRect();
        const oRect = cropOverlayBox.getBoundingClientRect();

        // Posição central da imagem na tela
        const imgCenterScreenX = (vRect.left + vRect.width / 2) + cropState.x;
        const imgCenterScreenY = (vRect.top + vRect.height / 2) + cropState.y;

        const overlayCenterX = oRect.left + oRect.width / 2;
        const overlayCenterY = oRect.top + oRect.height / 2;

        const deltaScreenX = overlayCenterX - imgCenterScreenX;
        const deltaScreenY = overlayCenterY - imgCenterScreenY;

        ctx.fillStyle = '#0F172A';
        ctx.fillRect(0, 0, targetWidth, targetHeight);

        ctx.save();
        ctx.translate(targetWidth / 2, targetHeight / 2);
        ctx.rotate((cropState.rotation * Math.PI) / 180);

        const drawScale = (targetWidth / oRect.width) * (cropState.zoom);
        const drawW = (cropImageTarget.offsetWidth || img.naturalWidth) * drawScale;
        const drawH = (cropImageTarget.offsetHeight || img.naturalHeight) * drawScale;

        const drawX = -drawW / 2 - (deltaScreenX * (targetWidth / oRect.width));
        const drawY = -drawH / 2 - (deltaScreenY * (targetHeight / oRect.height));

        ctx.drawImage(img, drawX, drawY, drawW, drawH);
        ctx.restore();

        const croppedDataUrl = canvas.toDataURL('image/jpeg', 0.92);

        if (cropState.target === 'venue') {
          // Aplica na imagem do local / evento
          builderState.venueImage = croppedDataUrl;
          const activeEv = getActiveEvent();
          if (activeEv) {
            activeEv.venueImage = croppedDataUrl;
          }
          const venueImg = document.getElementById('live-preview-venue-img');
          if (venueImg) venueImg.src = croppedDataUrl;

          updateLiveSitePreview();
          closeModal(cropModal);
          showToast('Imagem do local recortada e aplicada com sucesso!', '✨');
          triggerConfetti();
        } else if (cropState.target === 'closing') {
          // Aplica na imagem de encerramento / rodapé do casal
          builderState.closingImage = croppedDataUrl;
          const activeEv = getActiveEvent();
          if (activeEv) {
            activeEv.closingImage = croppedDataUrl;
          }
          const closingImg = document.getElementById('live-preview-closing-img');
          if (closingImg) closingImg.src = croppedDataUrl;

          updateLiveSitePreview();
          closeModal(cropModal);
          showToast('Imagem de encerramento aplicada com sucesso!', '✨');
          triggerConfetti();
        } else {
          // Aplica na capa e atualiza preview em tempo real (Persistente)
          builderState.hasCustomCoverImage = true;
          builderState.coverImage = croppedDataUrl;
          const activeEv = getActiveEvent();
          if (activeEv) {
            activeEv.coverImage = croppedDataUrl;
            activeEv.hasCustomCoverImage = true;
          }
          const thumb = document.getElementById('editor-cover-preview-thumb');
          const fileNameEl = document.getElementById('editor-cover-file-name');
          const editorCoverThumb = document.getElementById('editor-cover-thumb-preview');
          if (thumb) thumb.src = croppedDataUrl;
          if (editorCoverThumb) editorCoverThumb.src = croppedDataUrl;
          if (fileNameEl) fileNameEl.textContent = cropState.fileName || 'foto-capa-recortada.jpg';

          updateLiveSitePreview();
          closeModal(cropModal);
          showToast('Foto de capa recortada e aplicada com sucesso!', '✂️');
          triggerConfetti();
        }
      };
      img.src = cropState.rawImageSrc;
    });
  }

  // =========================================================================
  // DRAWER LATERAL À DIREITA: ESCOLHA DE TEMPLATES / DESIGNS (Estilo Zola)
  // =========================================================================
  // ==========================================
  // 12. MODAL DE SELEÇÃO DE TEMPLATES (Pop-up Padrão Love)
  // ==========================================
  const modalSelectTemplate = document.getElementById('modal-select-template');
  const btnOpenTemplate = document.getElementById('btn-open-template-modal');
  const btnApplySelectedDesign = document.getElementById('btn-apply-selected-design');

  if (btnOpenTemplate && modalSelectTemplate) {
    btnOpenTemplate.addEventListener('click', () => {
      openModal(modalSelectTemplate);
    });
  }

  // Seleção e visualização instantânea de templates dentro do Modal
  const templateCards = document.querySelectorAll('.template-drawer-card');
  templateCards.forEach(card => {
    card.addEventListener('click', () => {
      templateCards.forEach(c => {
        c.classList.remove('ring-2', 'ring-[#537bae]', 'border-[#537bae]', 'bg-blue-50/40');
        c.classList.add('border-zinc-100/80', 'bg-zinc-50');
      });
      card.classList.remove('border-zinc-100/80', 'bg-zinc-50');
      card.classList.add('ring-2', 'ring-[#537bae]', 'border-[#537bae]', 'bg-blue-50/40');

      const tmplId = card.getAttribute('data-template-id');
      if (tmplId) {
        applyTemplate(tmplId, false); // Atualiza imediatamente o preview ao vivo na esquerda!
      }
    });
  });

  if (btnApplySelectedDesign && modalSelectTemplate) {
    btnApplySelectedDesign.addEventListener('click', () => {
      closeModal(modalSelectTemplate);
    });
  }

  // ==========================================
  // 12.6 MODAL DE EDIÇÃO RÁPIDA NO MOBILE (Responsividade Direta)
  // ==========================================
  const modalMobileEdit = document.getElementById('modal-mobile-quick-edit');
  const mobileEditTitle = document.getElementById('mobile-edit-modal-title');
  const mobileEditContainer = document.getElementById('mobile-edit-fields-container');
  const btnCloseMobileEdit = document.getElementById('btn-close-mobile-edit-modal');
  const btnSaveMobileEdit = document.getElementById('btn-save-mobile-edit');

  let currentMobileEditTarget = null;

  function openMobileQuickEdit(target) {
    if (!modalMobileEdit || !mobileEditContainer) return;
    currentMobileEditTarget = target;
    mobileEditContainer.innerHTML = '';

    const activeEvent = getActiveEvent();
    if (!activeEvent) return;

    if (target === 'title') {
      if (mobileEditTitle) mobileEditTitle.textContent = 'Editar Título ou Nomes';
      const inputTitleVal = document.getElementById('editor-event-title')?.value || activeEvent.title || 'Beatriz & Lucas';
      mobileEditContainer.innerHTML = `
        <div>
          <label class="block text-xs font-bold text-zinc-700 mb-1.5">Título do Evento ou Nomes do Casal</label>
          <input type="text" id="mobile-field-title" value="${inputTitleVal.replace(/"/g, '&quot;')}" class="w-full text-sm p-3 rounded-xl border border-zinc-200 bg-white focus:outline-none focus:ring-2 focus:ring-[#537bae] font-bold text-zinc-900">
        </div>
      `;
    } else if (target === 'headline') {
      if (mobileEditTitle) mobileEditTitle.textContent = 'Editar Frase de Chamada';
      const inputHeadlineVal = document.getElementById('editor-hero-headline')?.value || activeEvent.siteSections?.heroHeadline || 'CONVIDAM VOCÊ PARA O SEU CASAMENTO';
      mobileEditContainer.innerHTML = `
        <div>
          <label class="block text-xs font-bold text-zinc-700 mb-1.5">Frase de Chamada</label>
          <input type="text" id="mobile-field-headline" value="${inputHeadlineVal.replace(/"/g, '&quot;')}" class="w-full text-sm p-3 rounded-xl border border-zinc-200 bg-white focus:outline-none focus:ring-2 focus:ring-[#537bae] text-zinc-800">
        </div>
      `;
    } else if (target === 'datetime') {
      if (mobileEditTitle) mobileEditTitle.textContent = 'Editar Data e Horário';
      const inputDateVal = document.getElementById('editor-data-date')?.value || activeEvent.eventDetails?.date || activeEvent.date || '2026-10-18';
      const inputTimeVal = document.getElementById('editor-data-time')?.value || activeEvent.eventDetails?.time || '16:30';
      mobileEditContainer.innerHTML = `
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label class="block text-xs font-bold text-zinc-700 mb-1.5">Data do Evento</label>
            <input type="date" id="mobile-field-date" value="${inputDateVal}" class="w-full text-sm p-3 rounded-xl border border-zinc-200 bg-white focus:outline-none focus:ring-2 focus:ring-[#537bae] text-zinc-800 font-medium">
          </div>
          <div>
            <label class="block text-xs font-bold text-zinc-700 mb-1.5">Horário de Início</label>
            <input type="time" id="mobile-field-time" value="${inputTimeVal}" class="w-full text-sm p-3 rounded-xl border border-zinc-200 bg-white focus:outline-none focus:ring-2 focus:ring-[#537bae] text-zinc-800 font-medium">
          </div>
        </div>
      `;
    } else if (target === 'venue') {
      if (mobileEditTitle) mobileEditTitle.textContent = 'Editar Local e Endereço';
      const inputLocVal = document.getElementById('editor-data-location')?.value || activeEvent.eventDetails?.locationName || activeEvent.location || 'Villa Santanna Eventos';
      const inputAddrVal = document.getElementById('editor-data-address')?.value || activeEvent.eventDetails?.address || 'Av. Castello Branco, 2490';
      mobileEditContainer.innerHTML = `
        <div class="space-y-3">
          <div>
            <label class="block text-xs font-bold text-zinc-700 mb-1.5">Nome do Espaço / Local</label>
            <input type="text" id="mobile-field-location" value="${inputLocVal.replace(/"/g, '&quot;')}" class="w-full text-sm p-3 rounded-xl border border-zinc-200 bg-white focus:outline-none focus:ring-2 focus:ring-[#537bae] font-bold text-zinc-900">
          </div>
          <div>
            <label class="block text-xs font-bold text-zinc-700 mb-1.5">Endereço Completo</label>
            <input type="text" id="mobile-field-address" value="${inputAddrVal.replace(/"/g, '&quot;')}" class="w-full text-sm p-3 rounded-xl border border-zinc-200 bg-white focus:outline-none focus:ring-2 focus:ring-[#537bae] text-zinc-800">
          </div>
        </div>
      `;
    } else if (target === 'prefaces') {
      if (mobileEditTitle) mobileEditTitle.textContent = 'Editar Epígrafes';
      const prefaces = builderState.prefaces && builderState.prefaces.length > 0 ? builderState.prefaces : (activeEvent.prefaces || ['"Um cordão de três dobras não se rompe com facilidade." (Eclesiastes 4:12)', 'COM A BÊNÇÃO DE DEUS,']);
      let html = '<div class="space-y-2.5" id="mobile-prefaces-wrapper">';
      prefaces.forEach((p) => {
        html += `
          <div class="flex items-center gap-2">
            <input type="text" class="mobile-preface-input flex-1 text-sm p-2.5 rounded-xl border border-zinc-200 bg-white focus:outline-none focus:ring-2 focus:ring-[#537bae]" value="${p.replace(/"/g, '&quot;')}">
            <button type="button" onclick="this.parentElement.remove()" class="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100 flex items-center justify-center text-xs font-bold cursor-pointer">✕</button>
          </div>
        `;
      });
      html += `
        </div>
        <button type="button" id="btn-add-mobile-preface-row" class="text-xs font-bold text-[#537bae] flex items-center gap-1 mt-2 cursor-pointer">
          <span>+ Adicionar outra epígrafe</span>
        </button>
      `;
      mobileEditContainer.innerHTML = html;

      const btnAddRow = document.getElementById('btn-add-mobile-preface-row');
      if (btnAddRow) {
        btnAddRow.addEventListener('click', () => {
          const wrapper = document.getElementById('mobile-prefaces-wrapper');
          if (wrapper) {
            const div = document.createElement('div');
            div.className = 'flex items-center gap-2';
            div.innerHTML = `
              <input type="text" class="mobile-preface-input flex-1 text-sm p-2.5 rounded-xl border border-zinc-200 bg-white focus:outline-none focus:ring-2 focus:ring-[#537bae]" placeholder="Nova citação ou epígrafe...">
              <button type="button" onclick="this.parentElement.remove()" class="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100 flex items-center justify-center text-xs font-bold cursor-pointer">✕</button>
            `;
            wrapper.appendChild(div);
          }
        });
      }
    }

    openModal(modalMobileEdit);
  }

  // Event delegation para todos os botões de edição rápida no mobile
  document.querySelectorAll('.btn-mobile-edit').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const target = btn.getAttribute('data-edit-target');
      if (target) openMobileQuickEdit(target);
    });
  });

  if (btnCloseMobileEdit && modalMobileEdit) {
    btnCloseMobileEdit.addEventListener('click', () => closeModal(modalMobileEdit));
  }

  if (btnSaveMobileEdit && modalMobileEdit) {
    btnSaveMobileEdit.addEventListener('click', () => {
      if (currentMobileEditTarget === 'title') {
        const val = document.getElementById('mobile-field-title')?.value || '';
        const mainInput = document.getElementById('editor-event-title');
        if (mainInput) mainInput.value = val;
      } else if (currentMobileEditTarget === 'headline') {
        const val = document.getElementById('mobile-field-headline')?.value || '';
        const mainInput = document.getElementById('editor-hero-headline');
        if (mainInput) mainInput.value = val;
      } else if (currentMobileEditTarget === 'datetime') {
        const dateVal = document.getElementById('mobile-field-date')?.value || '';
        const timeVal = document.getElementById('mobile-field-time')?.value || '';
        const mainDate = document.getElementById('editor-data-date');
        const mainTime = document.getElementById('editor-data-time');
        if (mainDate) mainDate.value = dateVal;
        if (mainTime) mainTime.value = timeVal;
      } else if (currentMobileEditTarget === 'venue') {
        const locVal = document.getElementById('mobile-field-location')?.value || '';
        const addrVal = document.getElementById('mobile-field-address')?.value || '';
        const mainLoc = document.getElementById('editor-data-location');
        const mainAddr = document.getElementById('editor-data-address');
        if (mainLoc) mainLoc.value = locVal;
        if (mainAddr) mainAddr.value = addrVal;
      } else if (currentMobileEditTarget === 'prefaces') {
        const newPrefaces = [];
        document.querySelectorAll('.mobile-preface-input').forEach(inp => {
          if (inp.value && inp.value.trim()) newPrefaces.push(inp.value.trim());
        });
        builderState.prefaces = newPrefaces;
      }

      updateLiveSitePreview();
      closeModal(modalMobileEdit);
    });
  }

  // ==========================================
  // EDIÇÃO DIRETA IN-PLACE NA PRÉVIA (Mobile & Desktop)
  // ==========================================
  const previewLiveTitle = document.getElementById('live-preview-title');
  const previewLiveHeadline = document.getElementById('live-preview-headline');
  const previewLiveVenueName = document.getElementById('live-preview-venue-name');
  const previewLiveVenueAddr = document.getElementById('live-preview-venue-address');
  const previewLiveDateTimeBox = document.getElementById('live-preview-date-time-box');
  const previewLivePrefaces = document.getElementById('live-preview-prefaces-container');

  function checkAndSyncEmptyState(el) {
    if (!el) return;
    const text = (el.innerText || el.textContent || '').replace(/\u200B/g, '').replace(/[↗✎]/g, '').trim();
    if (!text) {
      el.dataset.empty = "true";
      el.innerHTML = '';
    } else {
      delete el.dataset.empty;
    }
  }

  // Sincroniza todos os campos editáveis da prévia
  document.querySelectorAll('.editable-live-box').forEach(el => {
    const handleSync = () => checkAndSyncEmptyState(el);
    el.addEventListener('input', handleSync);
    el.addEventListener('keyup', handleSync);
    el.addEventListener('keydown', handleSync);
    el.addEventListener('focus', handleSync);
    el.addEventListener('blur', handleSync);
    handleSync();
  });

  if (previewLiveTitle) {
    const handleTitleInput = () => {
      const activeEv = getActiveEvent();
      const val = (previewLiveTitle.innerText || '').replace(/\u200B/g, '').replace(/[↗✎]/g, '').trim();
      checkAndSyncEmptyState(previewLiveTitle);
      const mainInput = document.getElementById('editor-event-title');
      if (mainInput) mainInput.value = val;
      if (activeEv) activeEv.title = val;
      const closing = document.getElementById('live-preview-closing-names');
      if (closing) closing.textContent = val || 'Anfitriões';
    };
    previewLiveTitle.addEventListener('input', handleTitleInput);
    previewLiveTitle.addEventListener('keyup', handleTitleInput);
    previewLiveTitle.addEventListener('blur', handleTitleInput);
  }

  if (previewLiveHeadline) {
    const handleHeadlineInput = () => {
      const activeEv = getActiveEvent();
      const val = (previewLiveHeadline.innerText || '').replace(/\u200B/g, '').replace(/[↗✎]/g, '').trim();
      checkAndSyncEmptyState(previewLiveHeadline);
      const mainInput = document.getElementById('editor-hero-headline');
      if (mainInput) mainInput.value = val;
      if (activeEv && activeEv.siteSections) activeEv.siteSections.heroHeadline = val;
    };
    previewLiveHeadline.addEventListener('input', handleHeadlineInput);
    previewLiveHeadline.addEventListener('keyup', handleHeadlineInput);
    previewLiveHeadline.addEventListener('blur', handleHeadlineInput);
  }

  if (previewLiveVenueName) {
    const handleVenueNameInput = () => {
      const activeEv = getActiveEvent();
      const val = (previewLiveVenueName.innerText || '').replace(/\u200B/g, '').replace(/[↗✎]/g, '').trim();
      checkAndSyncEmptyState(previewLiveVenueName);
      const mainInput = document.getElementById('editor-data-location');
      if (mainInput) mainInput.value = val;
      if (activeEv) {
        if (!activeEv.eventDetails) activeEv.eventDetails = {};
        activeEv.eventDetails.locationName = val;
        activeEv.location = val;
      }
    };
    previewLiveVenueName.addEventListener('input', handleVenueNameInput);
    previewLiveVenueName.addEventListener('keyup', handleVenueNameInput);
    previewLiveVenueName.addEventListener('blur', handleVenueNameInput);
  }

  if (previewLiveVenueAddr) {
    const handleVenueAddrInput = () => {
      const activeEv = getActiveEvent();
      const val = (previewLiveVenueAddr.innerText || '').replace(/\u200B/g, '').replace(/[↗✎]/g, '').trim();
      checkAndSyncEmptyState(previewLiveVenueAddr);
      const mainInput = document.getElementById('editor-data-address');
      if (mainInput) mainInput.value = val;
      if (activeEv) {
        if (!activeEv.eventDetails) activeEv.eventDetails = {};
        activeEv.eventDetails.address = val;
      }
    };
    previewLiveVenueAddr.addEventListener('input', handleVenueAddrInput);
    previewLiveVenueAddr.addEventListener('keyup', handleVenueAddrInput);
    previewLiveVenueAddr.addEventListener('blur', handleVenueAddrInput);
  }


  if (previewLivePrefaces) {
    const handlePrefacesInput = () => {
      const paragraphs = previewLivePrefaces.querySelectorAll('p');
      const texts = [];
      paragraphs.forEach(p => {
        const t = (p.innerText || '').replace(/\u200B/g, '').replace(/[↗✎]/g, '').trim();
        checkAndSyncEmptyState(p);
        if (t) texts.push(t);
      });
      builderState.prefaces = texts;
      const activeEv = getActiveEvent();
      if (activeEv) activeEv.prefaces = texts;
    };
    previewLivePrefaces.addEventListener('input', handlePrefacesInput);
    previewLivePrefaces.addEventListener('keyup', handlePrefacesInput);
    previewLivePrefaces.addEventListener('blur', handlePrefacesInput);
  }

  // 12.5 Interatividade da Loja de Convites & Papelaria (Produzir Convite)
  const inviteCatItems = document.querySelectorAll('.invite-cat-item');
  inviteCatItems.forEach(item => {
    item.addEventListener('click', () => {
      const name = item.querySelector('span') ? item.querySelector('span').textContent.trim() : 'Convite';
      showToast(`Abrindo catálogo e modelos de: ${name}`, '💌');
    });
  });

  const btnTryThankYou = document.getElementById('btn-try-instant-thankyou');
  if (btnTryThankYou) {
    btnTryThankYou.addEventListener('click', () => {
      showToast('Recurso de Agradecimentos Instantâneos ativado com caligrafia personalizada!', '✍️');
      triggerConfetti();
    });
  }

  // Pedido de Produção e Envio de Convites Físicos
  const btnSubmitPrintOrder = document.getElementById('btn-submit-print-order');
  if (btnSubmitPrintOrder) {
    btnSubmitPrintOrder.addEventListener('click', () => {
      const qty = document.getElementById('input-print-invite-qty')?.value || '100';
      const addr = document.getElementById('input-print-invite-address')?.value || 'Endereço cadastrado';
      showToast(`Pedido de ${qty} convites físicos enviado com sucesso! Entrega expressa para: ${addr}`, '📦');
      triggerConfetti();
    });
  }

  // 12.6 Convite Online: Tabela e Envio via WhatsApp / E-mail
  function renderOnlineInvitesTable() {
    const tableBody = document.getElementById('table-online-invites-guests');
    if (!tableBody) return;
    
    const activeEvt = getActiveEvent();
    const guests = activeEvt.guests || [];

    if (guests.length === 0) {
      tableBody.innerHTML = `
        <tr>
          <td colspan="4" class="py-6 text-center text-slate-400">
            Nenhum convidado cadastrado ainda. Cadastre convidados no menu "Lista de Convidados" para enviar convites online.
          </td>
        </tr>
      `;
      return;
    }

    tableBody.innerHTML = guests.map(g => {
      const statusBadge = g.inviteSent 
        ? `<span class="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-bold text-[10px] border border-emerald-200">Enviado ✉️</span>`
        : `<span class="px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 font-bold text-[10px] border border-amber-200">Pendente 🟡</span>`;

      return `
        <tr class="hover:bg-slate-50/80 transition-colors">
          <td class="py-3 px-3">
            <span class="font-bold text-slate-900 block">${g.name}</span>
            <span class="text-[10px] text-slate-400">${g.category || 'Adulto'} • Mesa ${g.table || '01'}</span>
          </td>
          <td class="py-3 px-3">
            <span class="text-slate-600 block">${g.phone || '(11) 98765-4321'}</span>
            <span class="text-[10px] text-slate-400 inline-flex items-center gap-1">${escaparHtml(g.email || 'convidado@email.com')}${botaoCopiarEmailHtml(g.email || '')}</span>
          </td>
          <td class="py-3 px-3">
            ${statusBadge}
          </td>
          <td class="py-3 px-3 text-right">
            <button type="button" class="btn-send-guest-online-invite px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] shadow-sm transition-all" data-guest-name="${g.name}" data-guest-phone="${g.phone || '(11) 98765-4321'}">
              Enviar 💬
            </button>
          </td>
        </tr>
      `;
    }).join('');

    tableBody.querySelectorAll('.btn-send-guest-online-invite').forEach(btn => {
      btn.addEventListener('click', () => {
        const gName = btn.getAttribute('data-guest-name');
        const gPhone = btn.getAttribute('data-guest-phone');
        showToast(`Convite online disparado via WhatsApp para ${gName} (${gPhone})!`, '💬');
        btn.textContent = 'Enviado ✓';
        btn.classList.remove('bg-emerald-600', 'hover:bg-emerald-700');
        btn.classList.add('bg-slate-300', 'text-slate-700', 'cursor-default');
        triggerConfetti();
      });
    });
  }

  // Formulário de Disparo Individual de Convite Online
  const formSendSingleInvite = document.getElementById('form-send-single-invite');
  if (formSendSingleInvite) {
    formSendSingleInvite.addEventListener('submit', (e) => {
      e.preventDefault();
      const name = document.getElementById('input-send-invite-name')?.value || 'Convidado';
      const channel = document.querySelector('input[name="invite-channel"]:checked')?.value || 'whatsapp';
      const phone = document.getElementById('input-send-invite-phone')?.value || '(11) 98765-4321';
      const email = document.getElementById('input-send-invite-email')?.value || 'convidado@email.com';

      if (channel === 'whatsapp') {
        showToast(`Convite online personalizado enviado via WhatsApp para ${name} (${phone})!`, '💬');
      } else {
        showToast(`Convite online personalizado enviado via E-mail para ${name} (${email})!`, '✉️');
      }
      triggerConfetti();
      formSendSingleInvite.reset();
    });
  }

  // Disparo em Lote para Todos os Pendentes
  const btnBroadcastOnlineInvites = document.getElementById('btn-broadcast-online-invites');
  if (btnBroadcastOnlineInvites) {
    btnBroadcastOnlineInvites.addEventListener('click', () => {
      const activeEvt = getActiveEvent();
      const count = (activeEvt.guests && activeEvt.guests.length) || 12;
      showToast(`Disparando convites online para todos os ${count} convidados da lista!`, '🚀');
      triggerConfetti();
    });
  }

  // Listener para salvar alterações gerais do editor
  const btnSaveEditor = document.getElementById('btn-save-edit-site');
  if (btnSaveEditor) {
    btnSaveEditor.addEventListener('click', () => {
      saveEditorChanges();
      showToast('Alterações salvas e sincronizadas com o site do evento!', '✨');
      triggerConfetti();
    });
  }

  // Grava no banco o evento ativo (antes as edições só ficavam na memória da
  // página e voltavam ao recarregar). Mesmo formato do insert ao criar o
  // evento (mapEventToEventoRow); tipo/status/dono não mudam aqui.
  async function persistirEventoAtivo() {
    const evt = getActiveEvent();
    if (!evt || !ehUuid(evt.id)) return { error: null };
    const { cliente_id, status, tipo, ...campos } = mapEventToEventoRow(evt, null);
    let { error } = await supabaseClient.from('eventos').update(campos).eq('id', evt.id);
    let slugEmUso = false;
    if (error && error.code === '23505') {
      // Link (slug) já usado por outro evento: salva o resto sem trocar o link.
      slugEmUso = true;
      const { slug, ...semSlug } = campos;
      ({ error } = await supabaseClient.from('eventos').update(semSlug).eq('id', evt.id));
    }
    if (error) console.error('Erro ao salvar evento:', error);
    return { error, slugEmUso };
  }
  // ==========================================
  // Convidados no banco (tabela convidados). Antes a lista só existia na
  // memória da página e sumia ao recarregar. Convidado novo tem id local
  // ("g-…"): o insert devolve o id real, que passa a ser o id do convidado.
  // ==========================================
  async function salvarConvidadoNoBanco(guest) {
    const evt = getActiveEvent();
    if (!guest || !evt || !ehUuid(evt.id)) return { error: null };
    const { data: sessao } = await supabaseClient.auth.getSession();
    const usuarioId = sessao && sessao.session && sessao.session.user && sessao.session.user.id;
    if (!usuarioId) return { error: new Error('Sessão expirada') };
    // Organizador convidado grava no nome do criador do evento.
    const clienteId = evt.clienteId || usuarioId;
    const linha = mapGuestToConvidadoRow(guest, evt.id, clienteId);
    if (ehUuid(guest.id)) {
      const { error } = await supabaseClient.from('convidados').update(linha).eq('id', guest.id);
      if (error) console.error('Erro ao salvar convidado:', error);
      return { error };
    }
    const { data, error } = await supabaseClient.from('convidados').insert(linha).select('id').single();
    if (error) { console.error('Erro ao criar convidado:', error); return { error }; }
    window.markPlatformTaskAchieved?.('guests');
    if (activeDrawerGuestId === guest.id) activeDrawerGuestId = data.id;
    guest.id = data.id;
    return { error: null };
  }

  async function excluirConvidadoNoBanco(guestId) {
    if (!ehUuid(guestId)) return { error: null };
    const { error } = await supabaseClient.from('convidados').delete().eq('id', guestId);
    if (error) console.error('Erro ao remover convidado:', error);
    return { error };
  }

  // ==========================================
  // Presentes no banco (tabela presentes). Antes a lista só existia na
  // memória da página — sumia ao recarregar e nunca chegava ao convite
  // publicado (que lê presentes do banco). Presente novo tem id local
  // ("gift-…"): o insert devolve o id real.
  // ==========================================
  async function salvarPresenteNoBanco(gift) {
    const evt = getActiveEvent();
    if (!gift || !evt || !ehUuid(evt.id)) return { error: null };
    const { data: sessao } = await supabaseClient.auth.getSession();
    const usuarioId = sessao && sessao.session && sessao.session.user && sessao.session.user.id;
    if (!usuarioId) return { error: new Error('Sessão expirada') };
    // Organizador convidado grava no nome do criador do evento.
    const clienteId = evt.clienteId || usuarioId;
    const linha = mapGiftToPresenteRow(gift, evt.id, clienteId);
    if (ehUuid(gift.id)) {
      const { error } = await supabaseClient.from('presentes').update(linha).eq('id', gift.id);
      if (error) console.error('Erro ao salvar presente:', error);
      return { error };
    }
    const { data, error } = await supabaseClient.from('presentes').insert(linha).select('id').single();
    if (error) { console.error('Erro ao criar presente:', error); return { error }; }
    window.markPlatformTaskAchieved?.('registry');
    if (editingGiftId === gift.id) editingGiftId = data.id;
    gift.id = data.id;
    return { error: null };
  }

  function atualizarLixeiraDePresentes() {
    const btn = document.getElementById('btn-gifts-delete-selected');
    if (!btn) return;
    const qtd = presentesSelecionados.size;
    btn.classList.toggle('hidden', qtd === 0);
    btn.classList.toggle('flex', qtd > 0);
    btn.title = qtd === 1 ? 'Excluir 1 presente selecionado' : `Excluir ${qtd} presentes selecionados`;
    const cont = document.getElementById('gifts-selected-count');
    if (cont) cont.textContent = String(qtd);

    // Caixinha "Selecionar tudo": marcada quando todos os presentes da lista
    // estão marcados; meio marcada quando só alguns.
    const checks = [...document.querySelectorAll('#host-gifts-list-container .gift-select-check, .gift-select-check')];
    const wrap = document.getElementById('gifts-select-all-wrap');
    const todos = document.getElementById('gifts-select-all');
    if (wrap) {
      wrap.classList.toggle('hidden', checks.length === 0);
      wrap.classList.toggle('flex', checks.length > 0);
    }
    // Sem card na tela (lista vazia ou busca sem resultado), a faixa some
    // inteira para não deixar um espaço em branco acima da lista.
    document.getElementById('gifts-select-bar')?.classList.toggle('hidden', checks.length === 0);
    if (todos) {
      const marcados = checks.filter(c => c.checked).length;
      todos.checked = checks.length > 0 && marcados === checks.length;
      todos.indeterminate = marcados > 0 && marcados < checks.length;
    }
  }

  // Marca/desmarca todos os presentes que estão na lista (respeita a busca).
  document.getElementById('gifts-select-all')?.addEventListener('change', (e) => {
    const marcar = e.currentTarget.checked;
    document.querySelectorAll('.gift-select-check').forEach(check => {
      if (check.checked === marcar) return;
      check.checked = marcar;
      check.dispatchEvent(new Event('change', { bubbles: true }));
    });
    atualizarLixeiraDePresentes();
  });

  document.getElementById('btn-gifts-delete-selected')?.addEventListener('click', async (e) => {
    const btn = e.currentTarget;
    const evento = getActiveEvent();
    const ids = [...presentesSelecionados];
    if (!evento || !ids.length || btn.disabled) return;
    const excluiu = await confirmarNaLove({
      titulo: ids.length === 1 ? 'Deseja excluir 1 presente selecionado?' : `Deseja excluir ${ids.length} presentes selecionados?`,
      texto: 'Essa ação não pode ser desfeita.',
      botao: 'Excluir',
      aoConfirmar: async () => {
        const doBanco = ids.filter(ehUuid);
        if (!doBanco.length) return null;
        const { error } = await supabaseClient.from('presentes').delete().in('id', doBanco);
        if (error) {
          console.error('Erro ao excluir presentes:', error);
          return 'Não foi possível excluir os presentes agora. Tente de novo.';
        }
        return null;
      }
    });
    if (!excluiu) return;
    const apagados = new Set(ids);
    evento.giftList = (evento.giftList || []).filter(g => !apagados.has(g.id));
    presentesSelecionados.clear();
    const searchInput = document.getElementById('gifts-search-input');
    renderHostGifts(searchInput ? searchInput.value : '');
  });

  async function excluirPresenteNoBanco(giftId) {
    if (!ehUuid(giftId)) return { error: null };
    const { error } = await supabaseClient.from('presentes').delete().eq('id', giftId);
    if (error) console.error('Erro ao excluir presente:', error);
    return { error };
  }

  function gravarPresenteEmSegundoPlano(gift) {
    salvarPresenteNoBanco(gift).then(() => renderHostGifts()).catch(e => console.error('Erro ao salvar presente:', e));
  }

  // Mudança de mesa etc.: grava em segundo plano (sem botão para dar retorno).
  function gravarConvidadoEmSegundoPlano(guest) {
    salvarConvidadoNoBanco(guest).catch(e => console.error('Erro ao salvar convidado:', e));
  }

  // O "Publicar" do Convite Digital (js/site-builder.js) usa pra garantir que o
  // link público (eventos.slug) está salvo antes de pôr o site no ar.
  window.persistirEventoAtivo = persistirEventoAtivo;

  // showToast está desligado na plataforma — o retorno aparece no próprio botão.
  async function salvarComRetornoNoBotao(btn, salvar) {
    const label = btn.querySelector('span') || btn;
    const textoOriginal = label.textContent;
    btn.disabled = true;
    label.textContent = 'Salvando…';
    let error = null;
    try {
      ({ error } = await salvar());
    } catch (e) {
      console.error('Erro ao salvar:', e);
      error = e;
    }
    label.textContent = error ? 'Erro ao salvar' : 'Salvo';
    setTimeout(() => {
      label.textContent = textoOriginal;
      btn.disabled = false;
    }, 1800);
  }

  // Caixas de texto que crescem junto com o texto (.love-textarea-auto): sem
  // alça de arrastar; a altura acompanha o conteúdo enquanto a pessoa digita
  // e quando o texto salvo é carregado.
  /** @param {any} el textarea .love-textarea-auto */
  function ajustarAlturaDoTexto(el) {
    if (!el || !el.isConnected) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight + 2}px`;
  }
  /** @param {Document | HTMLElement} [raiz] */
  function ajustarTextosAutomaticos(raiz = document) {
    raiz.querySelectorAll('textarea.love-textarea-auto').forEach(ajustarAlturaDoTexto);
  }
  document.addEventListener('input', (e) => {
    if (e.target && e.target.matches && e.target.matches('textarea.love-textarea-auto')) ajustarAlturaDoTexto(e.target);
  });
  document.addEventListener('focusin', (e) => {
    if (e.target && e.target.matches && e.target.matches('textarea.love-textarea-auto')) ajustarAlturaDoTexto(e.target);
  });
  window.addEventListener('resize', () => ajustarTextosAutomaticos());

  // "Salvar alterações" no fim de Informações: o mesmo salvar do topo, com o
  // retorno ("Salvando…/Salvo") no próprio botão.
  const btnSaveInformacoesRodape = document.getElementById('btn-save-informacoes-rodape');
  if (btnSaveInformacoesRodape) {
    btnSaveInformacoesRodape.addEventListener('click', () => {
      salvarComRetornoNoBotao(btnSaveInformacoesRodape, () => {
        try {
          saveEditorChanges();
        } catch (e) {
          console.error('Erro ao aplicar alterações na tela (o evento será salvo mesmo assim):', e);
        }
        return persistirEventoAtivo();
      });
    });
  }

  const btnSaveHeaderEdit = document.getElementById('btn-save-header-edit');
  if (btnSaveHeaderEdit) {
    btnSaveHeaderEdit.addEventListener('click', () => {
      salvarComRetornoNoBotao(btnSaveHeaderEdit, () => {
        // Erro só de atualização da tela não pode impedir a gravação no banco:
        // os campos já foram copiados para o evento antes desses passos.
        try {
          saveEditorChanges();
        } catch (e) {
          console.error('Erro ao aplicar alterações na tela (o evento será salvo mesmo assim):', e);
        }
        return persistirEventoAtivo();
      });
    });
  }

  // Listener para salvar especificamente as informações do evento
  const btnSaveEventData = document.getElementById('btn-save-event-data');
  if (btnSaveEventData) {
    btnSaveEventData.addEventListener('click', () => {
      saveEditorChanges();
      showToast('Informações do evento salvas com sucesso! 📅', '✨');
      triggerConfetti();
    });
  }

  // ==========================================
  // TABELAS NO PADRÃO DO ADMIN: barra dentro da caixa (busca à esquerda;
  // "Filtrar por", extras e "Exportar" à direita), CSV do que está visível,
  // "ver mais" (⋯) por linha e copiar e-mail.
  // ==========================================
  const ICONE_FUNIL = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M3 4.5h18l-7 8.5v6l-4 2v-8L3 4.5z"/></svg>';
  const ICONE_EXPORTAR = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M12 3v12m0-12 4.5 4.5M12 3 7.5 7.5"/></svg>';
  const ICONE_BUSCA = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-6-6m2-5a7 7 0 1 1-14 0 7 7 0 0 1 14 0z"/></svg>';
  const ICONE_MAIS = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="5" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/></svg>';
  const ICONE_COPIAR = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/></svg>';

  function botaoVerMaisHtml(titulo = 'Ver mais') {
    return `<button type="button" class="love-tabela-mais" title="${escaparHtml(titulo)}" aria-label="${escaparHtml(titulo)}">${ICONE_MAIS}</button>`;
  }

  function botaoCopiarEmailHtml(email) {
    if (!email) return '';
    return `<button type="button" class="love-copiar-email" data-email="${escaparHtml(email)}" title="Copiar e-mail" aria-label="Copiar e-mail">${ICONE_COPIAR}</button><span class="love-copiar-email-ok hidden">E-mail copiado.</span>`;
  }

  document.addEventListener('click', async (e) => {
    const btn = e.target.closest('.love-copiar-email');
    if (!btn) return;
    e.stopPropagation();
    try { await navigator.clipboard.writeText(btn.dataset.email || ''); } catch (err) { window.prompt('Copie o e-mail:', btn.dataset.email || ''); return; }
    const ok = btn.nextElementSibling;
    if (ok && ok.classList.contains('love-copiar-email-ok')) {
      ok.classList.remove('hidden');
      setTimeout(() => ok.classList.add('hidden'), 2000);
    }
  });

  // Linhas visíveis (fora as de "nenhum resultado") de uma tabela.
  function linhasVisiveisDaTabela(tabela) {
    return Array.from(tabela.querySelectorAll('tbody tr')).filter(tr =>
      !tr.classList.contains('hidden') && !tr.classList.contains('linha-vazia') && tr.offsetParent !== null && !tr.querySelector('td[colspan]'));
  }

  // CSV (separador ";" e BOM, para abrir certo no Excel) só com as colunas
  // visíveis e as linhas que passaram na busca/filtro.
  function exportarTabelaVisivelCsv(tabela, nomeArquivo) {
    const ths = Array.from(tabela.querySelectorAll('thead th'));
    const colunas = ths.map((th, i) => ({ i, nome: th.textContent.replace(/\s+/g, ' ').replace(/\(\d+\)|ⓘ/g, '').trim() }))
      .filter(c => c.nome && !ths[c.i].classList.contains('love-tabela-col-acoes') && !ths[c.i].classList.contains('love-tabela-col-mais') && ths[c.i].offsetParent !== null);
    const esc = v => `"${String(v ?? '').replace(/\s+/g, ' ').trim().replace(/"/g, '""')}"`;
    const linhas = [colunas.map(c => esc(c.nome)).join(';')];
    linhasVisiveisDaTabela(tabela).forEach(tr => {
      const tds = tr.children;
      linhas.push(colunas.map(c => {
        const td = tds[c.i];
        if (!td) return esc('');
        const clone = td.cloneNode(true);
        clone.querySelectorAll('button, .love-copiar-email-ok, svg, .guest-tipo-badge, .guest-sub-conector').forEach(el => el.remove());
        return esc(clone.textContent);
      }).join(';'));
    });
    const blob = new Blob(['﻿' + linhas.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${nomeArquivo || 'tabela'}-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }

  // Busca e filtro genéricos (tabelas cujas linhas o JS já desenhou): esconde
  // as linhas que não batem. Reaplicado sempre que a tabela redesenha.
  function aplicarFiltroDaTabela(tabela) {
    const busca = (tabela.dataset.busca || '').trim().toLowerCase();
    const filtro = tabela.dataset.filtro || '';
    const col = Number(tabela.dataset.filtroColuna);
    Array.from(tabela.querySelectorAll('tbody tr')).forEach(tr => {
      if (tr.querySelector('td[colspan]')) return;
      const texto = tr.textContent.replace(/\s+/g, ' ').toLowerCase();
      const passaBusca = !busca || texto.includes(busca);
      const celula = Number.isFinite(col) ? tr.children[col] : null;
      const valor = celula ? celula.textContent.replace(/\s+/g, ' ').trim() : '';
      const passaFiltro = !filtro || valor === filtro;
      tr.classList.toggle('hidden', !(passaBusca && passaFiltro));
    });
  }

  function opcoesDaColuna(tabela, col) {
    const vistos = new Set();
    Array.from(tabela.querySelectorAll('tbody tr')).forEach(tr => {
      if (tr.querySelector('td[colspan]')) return;
      const celula = tr.children[col];
      const v = celula ? celula.textContent.replace(/\s+/g, ' ').trim() : '';
      if (v && v !== '—') vistos.add(v);
    });
    return Array.from(vistos).sort((a, b) => a.localeCompare(b, 'pt-BR')).map(v => ({ label: v, value: v }));
  }

  // Monta a barra no topo da caixa da tabela.
  //   placeholder: do campo de busca | buscaExistente: elemento já com listeners (é movido para a barra)
  //   filtro: { coluna } (opções = valores da coluna) ou { opcoes: [{label,value}], aoEscolher(value) }
  //   extras: [elementos ou html] à direita, antes de Exportar | exportar: { nome } ou elemento existente (movido)
  function montarBarraDaTabela(tabela, cfg = {}) {
    if (!tabela || tabela.dataset.barraMontada) return;
    tabela.dataset.barraMontada = '1';
    const caixa = cfg.caixa || tabela.closest('.dash-card') || tabela.parentElement;
    caixa.classList.add('love-tabela-caixa');
    tabela.classList.add('love-tabela');

    const barra = document.createElement('div');
    barra.className = 'love-tabela-barra';
    const esquerda = document.createElement('div');
    esquerda.className = 'love-tabela-barra-esq';
    const direita = document.createElement('div');
    direita.className = 'love-tabela-barra-dir';
    barra.append(esquerda, direita);

    // Busca
    if (cfg.buscaExistente) {
      cfg.buscaExistente.classList.add('love-tabela-busca');
      esquerda.appendChild(cfg.buscaExistente);
    } else {
      const wrap = document.createElement('div');
      wrap.className = 'love-tabela-busca';
      wrap.innerHTML = `${ICONE_BUSCA}<input type="search" placeholder="${escaparHtml(cfg.placeholder || 'Buscar...')}" aria-label="Buscar">`;
      wrap.querySelector('input').addEventListener('input', (e) => {
        tabela.dataset.busca = e.target.value;
        aplicarFiltroDaTabela(tabela);
      });
      esquerda.appendChild(wrap);
    }

    // Filtrar por
    if (cfg.filtro) {
      const filtroWrap = document.createElement('div');
      filtroWrap.className = 'love-tabela-filtro';
      filtroWrap.innerHTML = `<button type="button" class="love-tabela-botao love-tabela-filtro-btn">${ICONE_FUNIL}<span>Filtrar por</span><span class="love-tabela-filtro-contador hidden">1</span></button><div class="love-tabela-filtro-menu hidden"></div>`;
      const btn = filtroWrap.querySelector('.love-tabela-filtro-btn');
      const menu = filtroWrap.querySelector('.love-tabela-filtro-menu');
      const contador = filtroWrap.querySelector('.love-tabela-filtro-contador');
      let atual = '';
      if (Number.isFinite(cfg.filtro.coluna)) tabela.dataset.filtroColuna = String(cfg.filtro.coluna);
      const renderMenu = () => {
        const opcoes = cfg.filtro.opcoes || opcoesDaColuna(tabela, cfg.filtro.coluna);
        menu.innerHTML = [{ label: cfg.filtro.rotuloTodos || 'Todos', value: '' }, ...opcoes].map(o =>
          `<button type="button" class="love-tabela-filtro-opcao${o.value === atual ? ' is-ativa' : ''}" data-valor="${escaparHtml(o.value)}">${escaparHtml(o.label)}</button>`).join('');
      };
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (menu.classList.contains('hidden')) { renderMenu(); menu.classList.remove('hidden'); }
        else menu.classList.add('hidden');
      });
      menu.addEventListener('click', (e) => {
        const op = e.target.closest('.love-tabela-filtro-opcao');
        if (!op) return;
        atual = op.dataset.valor || '';
        menu.classList.add('hidden');
        contador.classList.toggle('hidden', !atual);
        btn.classList.toggle('is-ativo', !!atual);
        if (typeof cfg.filtro.aoEscolher === 'function') cfg.filtro.aoEscolher(atual);
        else { tabela.dataset.filtro = atual; aplicarFiltroDaTabela(tabela); }
      });
      document.addEventListener('click', (e) => { if (!filtroWrap.contains(e.target)) menu.classList.add('hidden'); });
      direita.appendChild(filtroWrap);
    }

    // Extras (ex.: Importar) e Exportar
    (cfg.extras || []).forEach(el => { if (el) { el.classList.add('love-tabela-botao'); direita.appendChild(el); } });
    if (cfg.exportar instanceof HTMLElement) {
      cfg.exportar.classList.add('love-tabela-botao');
      direita.appendChild(cfg.exportar);
    } else {
      const exp = document.createElement('button');
      exp.type = 'button';
      exp.className = 'love-tabela-botao';
      exp.innerHTML = `${ICONE_EXPORTAR}<span>Exportar</span>`;
      exp.addEventListener('click', () => exportarTabelaVisivelCsv(tabela, (cfg.exportar && cfg.exportar.nome) || cfg.nome || 'tabela'));
      direita.appendChild(exp);
    }

    caixa.insertBefore(barra, caixa.firstChild);

    // Tabela redesenhada pelo JS: reaplica busca/filtro genéricos.
    if (!cfg.buscaExistente || cfg.filtro && Number.isFinite(cfg.filtro.coluna)) {
      const tbody = tabela.querySelector('tbody');
      if (tbody) new MutationObserver(() => { if (tabela.dataset.busca || tabela.dataset.filtro) aplicarFiltroDaTabela(tabela); }).observe(tbody, { childList: true });
    }
  }

  // Monta as barras das tabelas da plataforma (uma vez; os elementos existem desde o carregamento).
  // ==========================================
  // IMPORTAR CONVIDADOS (CSV) — Meus convidados, ao lado do Exportar
  // ==========================================
  const ICONE_IMPORTAR = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M12 15V3m0 12-4.5-4.5M12 15l4.5-4.5"/></svg>';

  /**
   * Lê um CSV (";" ou ","; aspas; com ou sem cabeçalho). O Excel salva assim
   * em "Salvar como › CSV".
   * @param {string} texto @returns {string[][]}
   */
  function lerCsv(texto) {
    const limpo = texto.replace(/^\uFEFF/, '');
    const primeira = limpo.split(/\r?\n/)[0] || '';
    const sep = (primeira.match(/;/g) || []).length >= (primeira.match(/,/g) || []).length ? ';' : ',';
    /** @type {string[][]} */
    const linhas = [];
    let linha = [], campo = '', aspas = false;
    for (let i = 0; i < limpo.length; i++) {
      const ch = limpo[i];
      if (aspas) {
        if (ch === '"' && limpo[i + 1] === '"') { campo += '"'; i++; }
        else if (ch === '"') aspas = false;
        else campo += ch;
      } else if (ch === '"') aspas = true;
      else if (ch === sep) { linha.push(campo); campo = ''; }
      else if (ch === '\n' || ch === '\r') {
        if (ch === '\r' && limpo[i + 1] === '\n') i++;
        linha.push(campo); campo = '';
        if (linha.some(c => c.trim())) linhas.push(linha);
        linha = [];
      } else campo += ch;
    }
    linha.push(campo);
    if (linha.some(c => c.trim())) linhas.push(linha);
    return linhas.map(l => l.map(c => c.trim()));
  }

  /**
   * Convidados a partir das linhas do CSV. Reconhece as colunas pelo nome
   * (Nome/Convidado, Telefone/Celular/WhatsApp, E-mail); sem cabeçalho, usa
   * nome; telefone; e-mail. Pula vazios e quem já está na lista.
   * @param {string[][]} linhas @param {any[]} jaNaLista
   */
  function convidadosDoCsv(linhas, jaNaLista) {
    if (!linhas.length) return [];
    const norm = (/** @type {string} */ s) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z]/g, '');
    const cab = linhas[0].map(norm);
    const acha = (/** @type {string[]} */ nomes) => cab.findIndex(c => nomes.some(n => c === n || c.startsWith(n)));
    let iNome = acha(['nome', 'convidado', 'name']);
    let iTel = acha(['telefone', 'celular', 'whatsapp', 'fone', 'phone']);
    let iEmail = acha(['email', 'mail']);
    const temCabecalho = iNome >= 0 || iTel >= 0 || iEmail >= 0;
    if (!temCabecalho) { iNome = 0; iTel = 1; iEmail = 2; }
    if (iNome < 0) iNome = 0;
    const existentes = new Set(jaNaLista.map(g => (g.name || '').trim().toLowerCase()));
    /** @type {any[]} */
    const novos = [];
    (temCabecalho ? linhas.slice(1) : linhas).forEach((l, i) => {
      const nome = (l[iNome] || '').replace(/\s+/g, ' ').trim();
      if (nome.length < 2 || existentes.has(nome.toLowerCase())) return;
      existentes.add(nome.toLowerCase());
      const telBruto = iTel >= 0 ? (l[iTel] || '') : '';
      const emailBruto = iEmail >= 0 ? (l[iEmail] || '') : '';
      novos.push({
        id: `g-${Date.now()}-${i}`,
        name: nome,
        email: /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(emailBruto) ? emailBruto : '',
        companions: 0, companionsNames: [], companionsDetailed: [],
        adults: 1, children: 0,
        phone: telBruto ? maskBrazilPhone(telBruto) : '',
        table: 'Mesa a Definir', status: 'pending', giftsBought: [],
        dietaryRestrictions: '', observationComments: [],
        relationshipTitle: 'Convidado', relationshipHost: ''
      });
    });
    return novos;
  }

  // Botão "Importar": escolhe o arquivo, cria os convidados e salva. O
  // resultado aparece no próprio botão por alguns segundos.
  function botaoImportarConvidados() {
    const botao = document.createElement('button');
    botao.type = 'button';
    botao.id = 'btn-rsvp-importar';
    botao.innerHTML = `${ICONE_IMPORTAR}<span>Importar</span>`;
    botao.dataset.dica = 'Arquivo CSV com nome, telefone e e-mail';
    const arquivo = document.createElement('input');
    arquivo.type = 'file';
    arquivo.accept = '.csv,text/csv,.txt';
    arquivo.hidden = true;
    botao.appendChild(arquivo);
    const texto = /** @type {HTMLElement} */ (botao.querySelector('span'));
    const avisar = (/** @type {string} */ msg) => {
      texto.textContent = msg;
      setTimeout(() => { texto.textContent = 'Importar'; botao.disabled = false; }, 3500);
    };
    botao.addEventListener('click', (e) => { if (e.target !== arquivo && !botao.disabled) arquivo.click(); });
    arquivo.addEventListener('change', async () => {
      const f = arquivo.files && arquivo.files[0];
      arquivo.value = '';
      if (!f) return;
      const ev = getActiveEvent();
      if (!ev) return;
      botao.disabled = true;
      texto.textContent = 'Importando…';
      let novos = [];
      try { novos = convidadosDoCsv(lerCsv(await f.text()), ev.guests || []); } catch (err) { console.error('Erro ao ler o CSV:', err); }
      if (!novos.length) { avisar('Nenhum convidado novo'); return; }
      let falhas = 0;
      for (const g of novos) {
        ev.guests.push(g);
        const { error } = await salvarConvidadoNoBanco(g).catch(err => ({ error: err }));
        if (error) { falhas++; ev.guests.splice(ev.guests.indexOf(g), 1); }
      }
      renderGuestsTable();
      renderFloorPlanGuestCards();
      updateAllCelebrationData();
      const ok = novos.length - falhas;
      avisar(falhas ? `${ok} importados · ${falhas} com erro` : `${ok} importado${ok === 1 ? '' : 's'}`);
    });
    return botao;
  }

  function montarBarrasDasTabelas() {
    // Meus convidados: busca e "Adicionar" estavam no cabeçalho — a busca desce
    // para a caixa; "Filtrar por" aciona as abas de status já existentes.
    const tabelaConvidados = document.querySelector('#rsvp-guests-table-body')?.closest('table');
    const buscaConvidados = document.getElementById('rsvp-search-input')?.closest('.relative');
    if (tabelaConvidados) {
      montarBarraDaTabela(tabelaConvidados, {
        buscaExistente: buscaConvidados,
        nome: 'convidados',
        extras: [botaoImportarConvidados()],
        filtro: {
          opcoes: [{ label: 'Confirmados', value: 'confirmed' }, { label: 'Pendentes', value: 'pending' }, { label: 'Recusados', value: 'declined' }],
          aoEscolher: (v) => document.querySelector(`.rsvp-status-option[data-filter="${v || 'all'}"]`)?.click()
        }
      });
      if (buscaConvidados) {
        const input = buscaConvidados.querySelector('input');
        if (input && !input.placeholder) input.placeholder = 'Buscar convidado...';
      }
    }

    // Extrato da carteira: o "Exportar" do cabeçalho desce para a caixa.
    const tabelaExtrato = document.getElementById('wallet-transactions-list')?.closest('table');
    if (tabelaExtrato) {
      montarBarraDaTabela(tabelaExtrato, {
        placeholder: 'Buscar no extrato...',
        filtro: { coluna: 2 },
        exportar: document.getElementById('btn-wallet-export')
      });
    }

    // Orçamento
    const tabelaOrcamento = document.getElementById('budget-expenses-tbody')?.closest('table');
    if (tabelaOrcamento) {
      montarBarraDaTabela(tabelaOrcamento, {
        caixa: tabelaOrcamento.closest('.budget-table-full-bleed') || tabelaOrcamento.parentElement,
        placeholder: 'Buscar item ou fornecedor...',
        filtro: { coluna: 1, rotuloTodos: 'Todos os fornecedores' },
        nome: 'orcamento'
      });
    }

    // Convite online
    const tabelaConvites = document.getElementById('table-online-invites-guests')?.closest('table');
    if (tabelaConvites) {
      montarBarraDaTabela(tabelaConvites, {
        caixa: tabelaConvites.parentElement,
        placeholder: 'Buscar convidado...',
        filtro: { coluna: 2 },
        nome: 'convites-online'
      });
    }
  }
  montarBarrasDasTabelas();

  // ==========================================
  // ORGANIZADORES DO EVENTO (anfitriões convidados e colaboradores)
  // Migration 054: tabela eventos_organizadores + RPCs. Quem é convidado
  // entra na plataforma só com as áreas do papel (ou as marcadas).
  // ==========================================
  const AREAS_ORGANIZADOR = [
    { id: 'aparencia', label: 'Aparência', tab: 'edit-site', sub: 'home' },
    { id: 'informacoes', label: 'Informações', tab: 'edit-site', sub: 'data' },
    { id: 'produzir-convite', label: 'Produzir convite', tab: 'edit-site', sub: 'invite-print' },
    { id: 'presentes', label: 'Lista de presentes', tab: 'gifts' },
    { id: 'convidados', label: 'Meus convidados', tab: 'rsvp', sub: 'all' },
    { id: 'mesas', label: 'Mapa do evento', tab: 'rsvp', sub: 'tables' },
    { id: 'checklist', label: 'Checklist', tab: 'rsvp', sub: 'checklist' },
    { id: 'fornecedores', label: 'Fornecedores', tab: 'b2b' },
    { id: 'carteira', label: 'Carteira (sem saque)', tab: 'wallet' }
  ];
  const PAPEIS_ORGANIZADOR = {
    anfitriao: { label: 'Anfitrião', areas: AREAS_ORGANIZADOR.map(a => a.id) },
    designer: { label: 'Designer', areas: ['aparencia', 'informacoes', 'produzir-convite'] },
    assessoria: { label: 'Assessoria', areas: ['convidados', 'mesas', 'checklist'] },
    personalizado: { label: 'Personalizado', areas: null }
  };

  // null = acesso total (criador do evento); Set = áreas liberadas.
  function permissoesDoEvento(ev) {
    if (!ev || !ev.souOrganizador) return null;
    const preset = PAPEIS_ORGANIZADOR[ev.papelOrganizador];
    const areas = preset && preset.areas ? preset.areas : (Array.isArray(ev.permissoesOrganizador) ? ev.permissoesOrganizador : []);
    return new Set(areas);
  }

  // Pode abrir essa aba (e, se informado, esse submenu) no evento ativo?
  function areaPermitida(tab, sub) {
    const ev = getActiveEvent();
    const perm = permissoesDoEvento(ev);
    if (!perm) return true;
    if (tab === 'overview') return true;
    if (tab === 'edit-site' && sub === 'about') return ev.papelOrganizador === 'anfitriao';
    const areas = AREAS_ORGANIZADOR.filter(a => a.tab === tab && (!sub || !a.sub || a.sub === sub));
    if (!areas.length) return tab === 'edit-site' && !sub && ev.papelOrganizador === 'anfitriao';
    return areas.some(a => perm.has(a.id)) || (tab === 'edit-site' && !sub && ev.papelOrganizador === 'anfitriao');
  }

  // Esconde no rail o que o organizador não pode abrir; saque e convites
  // de organizador são só do criador; criar evento exige conta de anfitrião.
  function aplicarPermissoesDoEventoAtivo() {
    const ev = getActiveEvent();
    const souOrganizador = !!(ev && ev.souOrganizador);
    (elements.railIconBtns || []).forEach(btn => {
      const tab = btn.getAttribute('data-rail-tab');
      btn.classList.toggle('love-sem-acesso', !areaPermitida(tab));
    });
    document.querySelectorAll('.btn-trigger-withdraw-pix').forEach(b => b.classList.toggle('hidden', souOrganizador));
    const blocoConvite = document.getElementById('organizadores-convidar');
    if (blocoConvite) blocoConvite.classList.toggle('hidden', souOrganizador);
    const semCadastro = !!(window.loveClienteProfile && window.loveClienteProfile.colaboradorSemCadastro);
    const btnNovoEvento = document.getElementById('btn-dropdown-create-new-event');
    if (btnNovoEvento) btnNovoEvento.classList.toggle('hidden', semCadastro);
  }

  // Convite aberto em /organizador antes de entrar ou criar a conta: aceita
  // agora, com a sessão já válida.
  async function aceitarConvitePendenteDeOrganizador() {
    let token = null;
    try { token = localStorage.getItem('love-organizador-token'); } catch (e) { return; }
    if (!token) return;
    const { data, error } = await supabaseClient.rpc('aceitar_convite_organizador', { p_token: token });
    if (error) { console.error('Erro ao aceitar convite de organizador:', error); return; }
    if (data && (data.ok || data.erro !== 'nao_logado')) {
      try { localStorage.removeItem('love-organizador-token'); } catch (e) {}
    }
  }

  // Eventos em que esta conta foi aceita como organizadora.
  async function carregarEventosOrganizados() {
    const { data, error } = await supabaseClient.rpc('meus_eventos_organizados');
    if (error) {
      if (!/function|schema cache/i.test(error.message || '')) console.error('Erro ao carregar eventos organizados:', error);
      return [];
    }
    return (Array.isArray(data) ? data : []).map(item => Object.assign(mapEventoRowToEvent(item.evento || {}), {
      souOrganizador: true,
      papelOrganizador: item.papel,
      permissoesOrganizador: Array.isArray(item.permissoes) ? item.permissoes : []
    }));
  }

  // Perfil mínimo para quem entra só como organizador (sem cadastro de anfitrião).
  function perfilDeColaborador(session) {
    const meta = (session && session.user && session.user.user_metadata) || {};
    const nome = String(meta.full_name || meta.name || '').trim() || String(session.user.email || '').split('@')[0];
    const partes = nome.split(/\s+/);
    return {
      id: session.user.id,
      email: session.user.email || '',
      first_name: partes[0] || '',
      last_name: partes.slice(1).join(' '),
      full_name: nome,
      couple_name: nome,
      avatar_url: meta.avatar_url || meta.picture || null,
      colaboradorSemCadastro: true
    };
  }

  function rotuloDoPapel(papel) {
    return (PAPEIS_ORGANIZADOR[papel] && PAPEIS_ORGANIZADOR[papel].label) || 'Colaborador';
  }

  // Áreas liberadas de um organizador (ids): as do papel antigo ou as marcadas.
  function areasDoOrganizador(o) {
    const preset = PAPEIS_ORGANIZADOR[o.papel];
    return preset && preset.areas ? preset.areas : (Array.isArray(o.permissoes) ? o.permissoes : []);
  }

  function checklistDeAreasHtml(classe, marcadas = []) {
    return AREAS_ORGANIZADOR.map(a => `
      <label class="flex items-center gap-2 text-xs text-zinc-700 cursor-pointer select-none">
        <input type="checkbox" value="${a.id}" class="gifts-select-all-check ${classe}"${marcadas.includes(a.id) ? ' checked' : ''}>
        <span>${a.label}</span>
      </label>`).join('');
  }

  function situacaoDoOrganizadorHtml(o) {
    if (o.criador) return '<span class="org-situacao org-situacao-criador">Criador(a)</span>';
    const aceito = o.status === 'aceito';
    return `<span class="org-situacao ${aceito ? 'org-situacao-aceito' : 'org-situacao-pendente'}">${aceito ? 'Aceito' : 'Pendente'}</span><span class="org-copiado hidden">Link copiado.</span>`;
  }

  // Linha da tabela de organizadores: nome, e-mail, funções, situação e ⋯
  // (editar funções / copiar link do convite / remover — só para o criador).
  // Logo abaixo, uma linha escondida com as funções para editar.
  function linhaDeOrganizadorHtml(o, ehDono) {
    const nome = (o.nome || '').trim() || String(o.email || '').split('@')[0];
    const aceito = o.status === 'aceito';
    const areas = areasDoOrganizador(o);
    const todas = AREAS_ORGANIZADOR.every(a => areas.includes(a.id));
    const rotulos = todas ? 'Todas as funções' : AREAS_ORGANIZADOR.filter(a => areas.includes(a.id)).map(a => a.label).join(', ');
    const link = `${window.location.origin}/organizador?token=${encodeURIComponent(o.token || '')}`;
    return `
      <tr data-organizador-id="${escaparHtml(o.id)}" data-permissoes="${escaparHtml(JSON.stringify(areas))}" data-link="${escaparHtml(link)}" data-aceito="${aceito ? '1' : ''}" data-nome="${escaparHtml(nome)}">
        <td class="font-semibold text-zinc-900">${escaparHtml(nome)}</td>
        <td class="text-zinc-600">${escaparHtml(o.email || '')}</td>
        <td class="text-zinc-600">${rotulos ? escaparHtml(rotulos) : '<span class="text-zinc-400">Sem funções liberadas</span>'}</td>
        <td>${situacaoDoOrganizadorHtml(o)}</td>
        <td class="love-tabela-col-mais">${ehDono ? `<button type="button" class="love-tabela-mais btn-org-mais" title="Mais opções" aria-label="Mais opções">${ICONE_MAIS}</button>` : ''}</td>
      </tr>
      ${ehDono ? `
      <tr class="org-editar-linha hidden" data-para="${escaparHtml(o.id)}">
        <td colspan="5">
          <div class="org-editar space-y-3">
            <p class="text-xs font-semibold text-zinc-800">Funções que ${escaparHtml(nome)} pode acessar</p>
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">${checklistDeAreasHtml('org-editar-area', areas)}</div>
            <p class="org-editar-erro text-xs text-red-600 hidden"></p>
            <div class="flex items-center gap-3">
              <button type="button" class="btn-org-salvar btn-secondary">Salvar</button>
              <button type="button" class="btn-org-cancelar text-xs text-zinc-500 hover:underline cursor-pointer bg-transparent border-0 p-0">Cancelar</button>
            </div>
          </div>
        </td>
      </tr>` : ''}`;
  }

  // Tabela "Organizadores": criador (só leitura) + convidados do banco.
  async function renderOrganizadores() {
    const hostsList = document.getElementById('hosts-team-list');
    const ev = getActiveEvent();
    if (!hostsList || !ev) return;
    const ehDono = !ev.souOrganizador;
    const perfil = window.loveClienteProfile || {};
    const nomeCriador = ehDono ? (perfil.couple_name || 'Anfitrião') : (ev.hostName || 'Anfitrião');
    const emailCriador = ehDono ? (perfil.email || '') : '';
    hostsList.innerHTML = `
      <tr class="org-linha-criador">
        <td class="font-semibold text-zinc-900">${escaparHtml(nomeCriador)}</td>
        <td class="text-zinc-600">${escaparHtml(emailCriador)}</td>
        <td class="text-zinc-600">Todas as funções</td>
        <td>${situacaoDoOrganizadorHtml({ criador: true })}</td>
        <td class="love-tabela-col-mais"></td>
      </tr>`;
    if (!ehUuid(ev.id)) return;
    const { data, error } = await supabaseClient
      .from('eventos_organizadores')
      .select('id, email, nome, papel, permissoes, status, token')
      .eq('evento_id', ev.id)
      .neq('status', 'removido')
      .order('created_at', { ascending: true });
    if (error) {
      if (!/relation|schema cache/i.test(error.message || '')) console.error('Erro ao carregar organizadores:', error);
      return;
    }
    hostsList.insertAdjacentHTML('beforeend', (data || []).map(o => linhaDeOrganizadorHtml(o, ehDono)).join(''));
  }

  // Menu ⋯ da linha: Editar funções / Copiar link do convite / Remover.
  function fecharMenuOrganizador() {
    document.querySelector('.org-menu')?.remove();
  }
  /** @param {HTMLElement} btn @param {HTMLElement} linha */
  function abrirMenuOrganizador(btn, linha) {
    fecharMenuOrganizador();
    const id = linha.dataset.organizadorId || '';
    const menu = document.createElement('div');
    menu.className = 'org-menu';
    menu.dataset.para = id;
    menu.setAttribute('role', 'menu');
    menu.innerHTML = `
      <button type="button" role="menuitem" data-org-acao="editar" data-organizador-id="${escaparHtml(id)}">Editar funções</button>
      ${linha.dataset.aceito ? '' : `<button type="button" role="menuitem" data-org-acao="copiar" data-organizador-id="${escaparHtml(id)}">Copiar link do convite</button>`}
      <button type="button" role="menuitem" data-org-acao="remover" data-organizador-id="${escaparHtml(id)}">Remover</button>`;
    document.body.appendChild(menu);
    const r = btn.getBoundingClientRect();
    menu.style.top = `${r.bottom + 4 + window.scrollY}px`;
    menu.style.left = `${Math.max(8, r.right - menu.offsetWidth + window.scrollX)}px`;
  }
  document.addEventListener('click', (e) => {
    const alvo = /** @type {Element} */ (e.target);
    if (!alvo.closest || (!alvo.closest('.org-menu') && !alvo.closest('.btn-org-mais'))) fecharMenuOrganizador();
  });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') fecharMenuOrganizador(); });

  // Ações da tabela (delegação: a tabela é redesenhada).
  document.addEventListener('click', async (e) => {
    const alvo = /** @type {Element} */ (e.target);
    const lista = document.getElementById('hosts-team-list');
    if (!lista || !alvo.closest) return;

    const mais = alvo.closest('.btn-org-mais');
    if (mais) {
      e.stopPropagation();
      const linha = /** @type {HTMLElement} */ (mais.closest('tr'));
      const aberto = document.querySelector('.org-menu');
      if (aberto && aberto.dataset.para === linha.dataset.organizadorId) { fecharMenuOrganizador(); return; }
      abrirMenuOrganizador(/** @type {HTMLElement} */ (mais), linha);
      return;
    }

    const acao = /** @type {HTMLElement|null} */ (alvo.closest('[data-org-acao]'));
    if (acao) {
      const id = acao.dataset.organizadorId || '';
      fecharMenuOrganizador();
      const linha = /** @type {HTMLElement|null} */ (lista.querySelector(`tr[data-organizador-id="${id}"]`));
      const editorLinha = /** @type {HTMLElement|null} */ (lista.querySelector(`tr.org-editar-linha[data-para="${id}"]`));
      if (!linha) return;
      if (acao.dataset.orgAcao === 'copiar') {
        const link = linha.dataset.link || '';
        try { await navigator.clipboard.writeText(link); } catch (err) { window.prompt('Copie o link do convite:', link); return; }
        const ok = linha.querySelector('.org-copiado');
        if (ok) { ok.classList.remove('hidden'); setTimeout(() => ok.classList.add('hidden'), 2000); }
        return;
      }
      if (acao.dataset.orgAcao === 'editar') {
        if (!editorLinha) return;
        lista.querySelectorAll('tr.org-editar-linha').forEach(l => { if (l !== editorLinha) l.classList.add('hidden'); });
        let marcadas = [];
        try { marcadas = JSON.parse(linha.dataset.permissoes || '[]'); } catch (err) { marcadas = []; }
        editorLinha.querySelectorAll('.org-editar-area').forEach(c => { /** @type {HTMLInputElement} */ (c).checked = marcadas.includes(/** @type {HTMLInputElement} */ (c).value); });
        editorLinha.querySelector('.org-editar-erro')?.classList.add('hidden');
        editorLinha.classList.remove('hidden');
        return;
      }
      if (acao.dataset.orgAcao === 'remover') {
        const nome = linha.dataset.nome || 'esta pessoa';
        const ok = await confirmarNaLove({ titulo: `Remover ${nome}?`, texto: 'A pessoa deixa de ver o evento na conta dela.', botao: 'Remover', aoConfirmar: async () => {
          const { error } = await supabaseClient.from('eventos_organizadores').update({ status: 'removido' }).eq('id', id);
          return error ? 'Não foi possível remover agora. Tente de novo.' : null;
        } });
        if (ok) renderOrganizadores();
      }
      return;
    }

    const salvar = alvo.closest('.btn-org-salvar');
    const cancelar = alvo.closest('.btn-org-cancelar');
    if (!salvar && !cancelar) return;
    const editorLinha = /** @type {HTMLElement} */ ((salvar || cancelar).closest('tr.org-editar-linha'));
    if (!editorLinha) return;
    if (cancelar) { editorLinha.classList.add('hidden'); return; }
    const id = editorLinha.dataset.para || '';
    const erro = /** @type {HTMLElement} */ (editorLinha.querySelector('.org-editar-erro'));
    const permissoes = Array.from(editorLinha.querySelectorAll('.org-editar-area:checked')).map(c => /** @type {HTMLInputElement} */ (c).value);
    erro.classList.add('hidden');
    if (!permissoes.length) { erro.textContent = 'Marque pelo menos uma função.'; erro.classList.remove('hidden'); return; }
    /** @type {HTMLButtonElement} */ (salvar).disabled = true;
    const { error } = await supabaseClient.from('eventos_organizadores').update({ papel: 'personalizado', permissoes }).eq('id', id);
    /** @type {HTMLButtonElement} */ (salvar).disabled = false;
    if (error) { console.error('Erro ao salvar acesso:', error); erro.textContent = 'Não foi possível salvar agora. Tente de novo.'; erro.classList.remove('hidden'); return; }
    renderOrganizadores();
  });

  // Convidar: e-mail → Enter → marca as áreas → Enviar convite.
  const formInviteHost = document.getElementById('form-invite-host');
  if (formInviteHost) {
    const inputEmail = document.getElementById('input-host-invite-email');
    const passo2 = document.getElementById('host-invite-passo2');
    const areasBox = document.getElementById('host-invite-areas');
    const emailLabel = document.getElementById('host-invite-email-label');
    const feedback = document.getElementById('host-invite-feedback');

    const avisar = (html, erro = false) => {
      if (!feedback) return;
      feedback.innerHTML = html;
      feedback.className = `org-feedback text-xs leading-relaxed ${erro ? 'text-red-600' : 'text-zinc-600'}`;
      feedback.classList.remove('hidden');
    };
    const limparPasso2 = () => {
      passo2.classList.add('hidden');
      areasBox.innerHTML = '';
    };
    const abrirPasso2 = () => {
      const email = (inputEmail.value || '').trim();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { avisar('Digite um e-mail válido.', true); return false; }
      feedback?.classList.add('hidden');
      emailLabel.textContent = email;
      if (!areasBox.children.length) areasBox.innerHTML = checklistDeAreasHtml('host-invite-area');
      passo2.classList.remove('hidden');
      return true;
    };

    inputEmail.addEventListener('input', () => { if (!passo2.classList.contains('hidden')) emailLabel.textContent = inputEmail.value.trim(); });
    // "Continuar" ao lado do e-mail: abre as funções (o mesmo que dar Enter).
    document.getElementById('btn-continuar-host-invite')?.addEventListener('click', () => {
      if (abrirPasso2()) passo2.querySelector('input')?.focus();
    });
    document.getElementById('btn-cancel-host-invite')?.addEventListener('click', () => { limparPasso2(); inputEmail.value = ''; feedback?.classList.add('hidden'); });

    formInviteHost.addEventListener('submit', async (e) => {
      e.preventDefault();
      // Primeiro Enter: só abre as áreas.
      if (passo2.classList.contains('hidden')) { abrirPasso2(); return; }
      const ev = getActiveEvent();
      const email = (inputEmail.value || '').trim();
      const permissoes = Array.from(document.querySelectorAll('.host-invite-area:checked')).map(c => c.value);
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return avisar('Digite um e-mail válido.', true);
      if (!ev || !ehUuid(ev.id)) return avisar('Salve o evento antes de convidar organizadores.', true);
      if (!permissoes.length) return avisar('Marque pelo menos uma função para a pessoa acessar.', true);

      const btn = document.getElementById('btn-submit-host-invite');
      if (btn) btn.disabled = true;
      avisar('Enviando convite…');
      const { data, error } = await supabaseClient.rpc('convidar_organizador', {
        p_evento_id: ev.id, p_email: email, p_papel: 'personalizado', p_permissoes: permissoes, p_nome: null
      });
      if (btn) btn.disabled = false;
      if (error || !data || !data.ok) {
        if (error) console.error('Erro ao convidar organizador:', error);
        const codigo = data && data.erro;
        const msgs = { proprio_email: 'Esse é o seu próprio e-mail.', email_invalido: 'Digite um e-mail válido.', sem_permissao: 'Só o criador do evento pode convidar organizadores.' };
        return avisar(msgs[codigo] || 'Não foi possível enviar o convite agora. Tente de novo.', true);
      }

      const link = `${window.location.origin}/organizador?token=${encodeURIComponent(data.token)}`;
      let enviado = false;
      try {
        const r = await fetch('/api/convidar-organizador', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token: data.token }) });
        const j = await r.json().catch(() => ({}));
        enviado = !!(j && j.enviado);
      } catch (err) { enviado = false; }

      const conta = data.conta === 'fornecedor' ? ' Esse e-mail tem conta de fornecedor na Love: a pessoa entra com ela e vê só as áreas liberadas.'
        : data.conta === 'anfitriao' ? '' : ' Esse e-mail ainda não tem conta na Love; pelo link a pessoa pode criar uma e aceitar.';
      if (data.status === 'aceito') avisar(`${escaparHtml(email)} já organiza este evento — o acesso foi atualizado.`);
      else if (enviado) avisar(`Convite enviado para <strong>${escaparHtml(email)}</strong>.${conta}`);
      else avisar(`Convite criado para <strong>${escaparHtml(email)}</strong>, mas o e-mail não pôde ser enviado. Copie o link e mande para a pessoa: <a href="${escaparHtml(link)}" class="font-semibold text-[#537bae] break-all">${escaparHtml(link)}</a>${conta}`);
      inputEmail.value = '';
      limparPasso2();
      renderOrganizadores();
    });
  }

  // Listeners em tempo real para os campos de Anfitriões refletirem instantaneamente na prévia ao lado
  const inputAboutTitleEl = document.getElementById('editor-about-title');
  if (inputAboutTitleEl) {
    inputAboutTitleEl.addEventListener('input', () => {
      const activeEv = getActiveEvent();
      if (activeEv) {
        if (!activeEv.siteSections) activeEv.siteSections = {};
        activeEv.siteSections.aboutTitle = inputAboutTitleEl.value;
      }
      updateHostsPreview();
    });
  }

  const inputAboutTextEl = document.getElementById('editor-about-text');
  if (inputAboutTextEl) {
    inputAboutTextEl.addEventListener('input', () => {
      const activeEv = getActiveEvent();
      if (activeEv) {
        if (!activeEv.siteSections) activeEv.siteSections = {};
        activeEv.siteSections.aboutText = inputAboutTextEl.value;
      }
      updateHostsPreview();
    });
  }

  // ==========================================
  // 6. LISTA DE PRESENTES (Meus Presentes & Presentes Recebidos)
  // ==========================================
  function switchGiftModalTab(tabKey) {
    const tabCustom = document.getElementById('tab-btn-gift-custom');
    const tabRandom = document.getElementById('tab-btn-gift-random');
    const panelCustom = document.getElementById('gift-modal-panel-custom');
    const panelRandom = document.getElementById('gift-modal-panel-random');

    if (tabKey === 'random') {
      if (tabCustom) {
        tabCustom.className = 'flex-1 py-1.5 px-3 rounded-lg text-zinc-500 hover:text-zinc-800 transition-all cursor-pointer';
      }
      if (tabRandom) {
        tabRandom.className = 'flex-1 py-1.5 px-3 rounded-lg text-zinc-900 bg-white shadow-xs transition-all cursor-pointer';
      }
      if (panelCustom) panelCustom.classList.add('hidden');
      if (panelRandom) panelRandom.classList.remove('hidden');
      renderQuickGiftsInModal();
    } else {
      if (tabCustom) {
        tabCustom.className = 'flex-1 py-1.5 px-3 rounded-lg text-zinc-900 bg-white shadow-xs transition-all cursor-pointer';
      }
      if (tabRandom) {
        tabRandom.className = 'flex-1 py-1.5 px-3 rounded-lg text-zinc-500 hover:text-zinc-800 transition-all cursor-pointer';
      }
      if (panelCustom) panelCustom.classList.remove('hidden');
      if (panelRandom) panelRandom.classList.add('hidden');
    }
  }

  function openGiftModal(initialTab = 'custom') {
    const modal = document.getElementById('modal-add-gift');
    if (!modal) return;
    switchGiftModalTab(initialTab);
    openModal(modal);
  }

  function closeGiftModal() {
    const modal = document.getElementById('modal-add-gift');
    if (modal) closeModal(modal);
  }

  let editingGiftId = null;

  // Imagem da gaveta de presente: o campo oculto é a fonte. Sem imagem
  // (presente novo) aparece "Adicionar imagem"; com imagem (editar, presente
  // aleatório ou foto enviada) aparece a foto e "Clique para trocar a imagem".
  function mostrarImagemDoPresente(src) {
    const img = document.getElementById('gift-image-preview-img');
    const urlInput = document.getElementById('gift-image-url-input');
    const vazio = document.getElementById('gift-image-empty');
    const trocar = document.getElementById('gift-image-change-overlay');
    const temImagem = !!src;
    if (urlInput) urlInput.value = src || '';
    if (img) {
      if (temImagem) img.src = src; else img.removeAttribute('src');
      img.classList.toggle('hidden', !temImagem);
    }
    if (vazio) vazio.classList.toggle('hidden', temImagem);
    if (trocar) { trocar.classList.toggle('hidden', !temImagem); trocar.classList.toggle('flex', temImagem); }
  }

  function openGiftDrawer() {
    editingGiftId = null;
    const formAddGift = document.getElementById('form-add-gift');
    const drawerTitle = document.getElementById('drawer-gift-heading-title');
    const drawerSub = document.getElementById('drawer-gift-heading-sub');
    const btnSubmitText = document.getElementById('btn-submit-gift-text');
    const giftPreviewImg = document.getElementById('gift-image-preview-img');
    const giftUrlInput = document.getElementById('gift-image-url-input');

    if (formAddGift) formAddGift.reset();
    // Presente novo: começa sem imagem.
    mostrarImagemDoPresente('');
    if (drawerTitle) drawerTitle.textContent = 'Criar presente';
    if (drawerSub) drawerSub.textContent = 'Cadastre um novo presente fictício para sua lista de presentes.';
    if (btnSubmitText) btnSubmitText.textContent = 'Criar presente';
    document.getElementById('btn-submit-gift-icon')?.classList.remove('hidden');
    document.getElementById('btn-duplicate-gift')?.classList.add('hidden');
    resetGiftCrowdfundingFields();

    const drawer = document.getElementById('drawer-add-gift');
    const backdrop = document.getElementById('gift-drawer-backdrop');
    if (backdrop) {
      backdrop.classList.remove('hidden');
      backdrop.style.setProperty('display', 'block', 'important');
      backdrop.classList.add('open');
    }
    if (drawer) {
      drawer.classList.remove('hidden');
      drawer.style.setProperty('display', 'flex', 'important');
      drawer.classList.add('open');
    }
  }

  function openGiftDrawerForEdit(gift) {
    // Presente comprado também pode ser editado (pedido do cliente).
    editingGiftId = gift.id;
    const titleInput = document.getElementById('gift-title-input');
    const priceInput = document.getElementById('gift-price-input');
    const descInput = document.getElementById('gift-description-input');
    const giftPreviewImg = document.getElementById('gift-image-preview-img');
    const giftUrlInput = document.getElementById('gift-image-url-input');
    const drawerTitle = document.getElementById('drawer-gift-heading-title');
    const drawerSub = document.getElementById('drawer-gift-heading-sub');
    const btnSubmitText = document.getElementById('btn-submit-gift-text');

    if (titleInput) titleInput.value = gift.title || '';
    if (priceInput) priceInput.value = gift.price !== undefined ? gift.price : '';
    if (descInput) descInput.value = gift.description || '';
    mostrarImagemDoPresente(gift.image || '');

    if (drawerTitle) drawerTitle.textContent = 'Editar Presente';
    if (drawerSub) drawerSub.textContent = 'Modifique os detalhes ou o valor deste presente.';
    if (btnSubmitText) btnSubmitText.textContent = 'Salvar Alterações';
    // Editar: sem o "+" no botão e com "Duplicar" ao lado.
    document.getElementById('btn-submit-gift-icon')?.classList.add('hidden');
    document.getElementById('btn-duplicate-gift')?.classList.remove('hidden');
    populateGiftCrowdfundingFields(gift);

    const drawer = document.getElementById('drawer-add-gift');
    const backdrop = document.getElementById('gift-drawer-backdrop');
    if (backdrop) {
      backdrop.classList.remove('hidden');
      backdrop.style.setProperty('display', 'block', 'important');
      backdrop.classList.add('open');
    }
    if (drawer) {
      drawer.classList.remove('hidden');
      drawer.style.setProperty('display', 'flex', 'important');
      drawer.classList.add('open');
    }
  }

  function closeGiftDrawer() {
    editingGiftId = null;
    const drawer = document.getElementById('drawer-add-gift');
    const backdrop = document.getElementById('gift-drawer-backdrop');
    if (drawer) {
      drawer.classList.remove('open');
      drawer.style.setProperty('display', 'none', 'important');
      drawer.classList.add('hidden');
    }
    if (backdrop) {
      backdrop.classList.remove('open');
      backdrop.style.setProperty('display', 'none', 'important');
      backdrop.classList.add('hidden');
    }
  }

  function renderQuickGiftsInModal() {
    const container = document.getElementById('modal-quick-gifts-list');
    if (!container) return;
    container.innerHTML = '';

    randomGiftsPool.forEach(item => {
      const card = document.createElement('button');
      card.type = 'button';
      card.className = 'w-full p-2.5 rounded-xl border border-zinc-200/80 hover:border-[#537bae] bg-zinc-50/70 hover:bg-blue-50/40 flex items-center justify-between text-left transition-all group cursor-pointer';
      card.innerHTML = `
        <div class="flex items-center gap-2.5 min-w-0 pr-2">
          <img src="${item.image}" alt="${item.title}" class="w-12 h-12 rounded-[10px] object-cover flex-shrink-0 border border-zinc-200 shadow-2xs">
          <div class="min-w-0">
            <h5 class="text-xs font-bold text-zinc-900 group-hover:text-[#537bae] truncate transition-colors">${item.title}</h5>
            <span class="text-[11px] font-bold text-emerald-600">R$ ${item.price.toFixed(2).replace('.', ',')}</span>
          </div>
        </div>
        <span class="text-xs font-bold text-[#537bae] flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">+ Adicionar</span>
      `;
      card.addEventListener('click', () => {
        const activeEvent = getActiveEvent();
        if (!activeEvent.giftList) activeEvent.giftList = [];
        activeEvent.giftList.unshift({
          id: `gift-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          title: item.title,
          category: item.category,
          price: item.price,
          type: 'virtual',
          marketplaceUrl: null,
          received: 0,
          status: 'Disponível para Presentear',
          image: item.image,
          contributorsCount: 0
        });
        gravarPresenteEmSegundoPlano(activeEvent.giftList[0]);
        activeEvent.presentesRecebidos += 1;
        closeGiftModal();
        renderHostGifts();
        updateAllCelebrationData();
        triggerConfetti();
      });
      container.appendChild(card);
    });
  }

  const randomGiftsPool = [
    { title: 'Contribuir com Safari na Lua de Mel', price: 1200.00, category: 'honeymoon', image: 'assets/card_safari.jpg' },
    { title: 'Panela Casserole Redonda Le Creuset 24cm', price: 799.00, category: 'kitchen', image: 'assets/card_lecreuset.jpg' },
    { title: 'Cafeteira Espresso Italiana Inox Especialista', price: 890.00, category: 'kitchen', image: 'assets/card_espresso.jpg' },
    { title: 'Passeio de Caiaque nas Ilhas Maldivas', price: 450.00, category: 'honeymoon', image: 'assets/card_kayak.jpg' },
    { title: 'Jogo de Lençóis 400 Fios Algodão Egípcio King', price: 620.00, category: 'home', image: 'assets/card_bedding.jpg' },
    { title: 'Buquê Luxuoso de Rosas Nobres para o Quarto', price: 195.00, category: 'home', image: 'assets/bouquet_roses.jpg' },
    { title: 'Cesta de Café da Manhã Especial com Champanhe', price: 290.00, category: 'honeymoon', image: 'assets/breakfast_basket.jpg' },
    { title: 'Orquídea Phalaenopsis Rara em Vaso Cerâmico', price: 160.00, category: 'home', image: 'assets/orchid_luxury.jpg' },
    { title: 'Jantar Romântico à Luz de Velas em Paris', price: 750.00, category: 'honeymoon', image: 'assets/wedding_table_dinner.jpg' },
    { title: 'Passeio de Barco no Pôr do Sol em Santorini', price: 580.00, category: 'honeymoon', image: 'assets/wedding_sunset_couple.jpg' },
    { title: 'Cota de Hospedagem em Bangalô Sobre as Águas', price: 1500.00, category: 'honeymoon', image: 'assets/theme_coastal.jpg' },
    { title: 'Degustação de Vinhos & Queijos em Toscana', price: 340.00, category: 'honeymoon', image: 'assets/theme_garden.jpg' },
    { title: 'Camiseta: "Fui obrigado a comparecer"', price: 79.90, category: 'clothing', image: 'assets/card_espresso.jpg' },
    { title: 'Caneta que dá choque', price: 49.90, category: 'toys', image: 'assets/card_safari.jpg' },
    { title: 'Capivara de pelúcia em tamanho real', price: 250.00, category: 'toys', image: 'assets/card_bedding.jpg' },
    { title: 'Almofada em formato de coxinha', price: 59.90, category: 'home', image: 'assets/bouquet_roses.jpg' },
    { title: 'Mini karaokê de chuveiro', price: 129.90, category: 'kitchen', image: 'assets/card_espresso.jpg' },
    { title: 'Sino para pedir lanches da cama', price: 39.90, category: 'home', image: 'assets/card_kayak.jpg' },
    { title: 'Paciência (pacote com 100g)', price: 19.90, category: 'food', image: 'assets/card_bedding.jpg' },
    { title: 'Kit anti-ressaca', price: 89.90, category: 'health', image: 'assets/card_lecreuset.jpg' }
  ];

  function createRandomGift() {
    const activeEvent = getActiveEvent();
    if (!activeEvent.giftList) activeEvent.giftList = [];

    const randomItem = randomGiftsPool[Math.floor(Math.random() * randomGiftsPool.length)];
    const newGift = {
      id: 'gift-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
      title: randomItem.title,
      price: randomItem.price,
      category: randomItem.category,
      image: randomItem.image
    };

    activeEvent.giftList.unshift(newGift);
    gravarPresenteEmSegundoPlano(newGift);
    const searchInput = document.getElementById('gifts-search-input');
    renderHostGifts(searchInput ? searchInput.value : '');
    showToast(`"${randomItem.title}" adicionado à lista!`, '🎁');
  }

  // Presente com vaquinha: barra de progresso abaixo do valor
  // (porcentagem e quanto já foi arrecadado).
  function barraDaVaquinhaHtml(gift) {
    if (!gift || !gift.isCrowdfunding) return '';
    const meta = parseFloat(gift.price) || 0;
    const arrecadado = Math.max(0, parseFloat(gift.received) || 0);
    const pct = meta > 0 ? Math.min(100, Math.round((arrecadado / meta) * 100)) : 0;
    const brl = v => `R$ ${Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    return `
      <div class="gift-vaquinha" title="Vaquinha: ${pct}% arrecadado">
        <div class="gift-vaquinha-linha">
          <span class="gift-vaquinha-pct">${pct}%</span>
          <div class="gift-vaquinha-trilho"><div class="gift-vaquinha-barra" style="width:${pct}%"></div></div>
        </div>
        <p class="gift-vaquinha-info">Arrecadado <strong>${brl(arrecadado)}</strong></p>
      </div>`;
  }

  function renderHostGifts(searchQuery = '') {
    const container = document.getElementById('host-gifts-grid');
    const headerTitle = document.getElementById('gifts-header-title');
    const headerSub = document.getElementById('gifts-header-subtitle');
    const summaryStats = document.getElementById('gifts-summary-stats');
    const totalCountEl = document.getElementById('gifts-total-count');
    const totalValueEl = document.getElementById('gifts-total-value');

    if (headerTitle) headerTitle.textContent = 'Meus presentes';
    if (headerSub) headerSub.textContent = 'Os presentes adicionados são apenas fictícios para os seus convidados, você recebe o valor em dinheiro.';
    if (summaryStats) summaryStats.classList.remove('hidden');

    if (!container) return;
    container.innerHTML = '';
    const activeEvent = getActiveEvent();

    // 1. Calcula o total de produtos e a soma do valor total dos produtos
    const giftList = activeEvent.giftList || [];
    const totalCount = giftList.length;
    const totalValue = giftList.reduce((acc, g) => acc + (parseFloat(g.price) || 0), 0);

    if (totalCountEl) totalCountEl.textContent = `${totalCount}`;
    if (totalValueEl) totalValueEl.textContent = `R$ ${totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    // Seleção só de presentes que ainda existem neste evento.
    const idsDaLista = new Set(giftList.map(g => g.id));
    [...presentesSelecionados].forEach(id => { if (!idsDaLista.has(id)) presentesSelecionados.delete(id); });
    atualizarLixeiraDePresentes();

    // Filtra presentes caso haja busca ativa
    let filteredGifts = giftList;
    if (searchQuery && searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      filteredGifts = giftList.filter(g => g.title && g.title.toLowerCase().includes(q));
    }

    if (filteredGifts.length === 0) {
      if (searchQuery && searchQuery.trim()) {
        container.innerHTML = `
          <div class="col-span-full py-16 text-center bg-white rounded-[var(--radius-card,10px)] border border-transparent">
            <p class="text-xs sm:text-sm text-zinc-500 font-medium font-sans">Nenhum presente encontrado para "${searchQuery}".</p>
          </div>
        `;
      } else {
        container.innerHTML = `
          <div class="col-span-full py-16 text-center bg-white rounded-[var(--radius-card,10px)] border border-transparent space-y-3">
            <svg class="w-10 h-10 mx-auto text-zinc-300" fill="none" stroke="currentColor" stroke-width="2.15" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.15" d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7"></path>
            </svg>
            <p class="text-xs sm:text-sm text-zinc-500 font-medium font-sans">Sua lista de presentes está vazia.</p>
            <button type="button" id="btn-empty-gifts-add" class="btn-brand text-xs py-2 px-3.5 font-semibold rounded-[var(--radius-control,12px)] cursor-pointer">Criar presente</button>
          </div>
        `;
        const btnEmptyAddGift = document.getElementById('btn-empty-gifts-add');
        if (btnEmptyAddGift) btnEmptyAddGift.addEventListener('click', () => openGiftDrawer());
      }
      return;
    }

    // 2. Renderiza os itens de presentes reais no estilo da imagem de referência
    filteredGifts.forEach(gift => {
      const receivedRecord = (activeEvent.receivedGifts || []).find(r => r.giftTitle === gift.title || r.id === gift.id) || null;
      const buyerName = gift.buyerName || (gift.received > 0 ? (receivedRecord?.guestName || 'Convidado') : null);
      const isPurchased = Boolean(buyerName);

      const card = document.createElement('div');
      // Comprado: esmaecido e sem clique no cartão — só Editar/Excluir.
      card.className = `group bg-white rounded-[var(--radius-card,10px)] border border-transparent shadow-2xs overflow-hidden flex flex-col justify-between transition-all hover:shadow-md ${
        isPurchased ? 'gift-card-comprado' : ''
      }`;

      card.innerHTML = `
        <!-- Topo do Card: Imagem com Proporção Ampla e Background Suave -->
        <div class="w-full h-44 sm:h-48 bg-zinc-50 flex items-center justify-center relative overflow-hidden">
          <label class="gift-select-box" title="Selecionar presente">
            <input type="checkbox" class="gift-select-check" ${presentesSelecionados.has(gift.id) ? 'checked' : ''} aria-label="Selecionar ${escaparHtml(gift.title || 'presente')}">
            <span aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path stroke-linecap="round" stroke-linejoin="round" d="m5 12.5 4.5 4.5L19 7.5"/></svg></span>
          </label>
          ${gift.image
            ? `<img src="${gift.image}" alt="${gift.title}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300">`
            : '<div class="w-full h-full flex items-center justify-center bg-zinc-100 text-zinc-300"><svg class="w-10 h-10" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 8v13m0-13V6a2 2 0 1 1 2 2h-2zm0 0V5.5A2.5 2.5 0 1 0 9.5 8H12zm-7 4h14M5 12a2 2 0 1 1 0-4h14a2 2 0 1 1 0 4M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7"/></svg></div>'}
          
          ${isPurchased ? `
            <!-- Nome do Convidado no canto inferior esquerdo, sem fundo, com sombra para legibilidade -->
            <div class="gift-received-buyer absolute bottom-2 left-3 z-10 text-white text-xs font-bold font-sans max-w-[85%] truncate pointer-events-none" style="text-shadow: 0 1px 3px rgba(0,0,0,0.85), 0 1px 6px rgba(0,0,0,0.6);">
              ${buyerName}
            </div>
          ` : ''}
        </div>

        <!-- Corpo do Card: Título com Badge de Status, Subtítulo, Valor e Botões -->
        <div class="p-4 sm:p-5 flex flex-col justify-between flex-1 space-y-3.5 text-left">
          <div>
            <div class="flex items-start justify-between gap-2">
              <h4 class="text-sm sm:text-base font-bold text-zinc-900 line-clamp-1 font-sans tracking-tight" title="${gift.title}">
                ${gift.title}
              </h4>
              <span class="gift-status-badge${isPurchased ? '' : ' is-ativo'}">${isPurchased ? 'Comprado' : 'Ativo'}</span>
            </div>
            <p class="text-xs text-zinc-400 font-medium font-sans mt-0.5">
              ${gift.category || 'Presente fictício'}
            </p>
          </div>

          <div>
            <p class="text-base sm:text-lg font-bold text-zinc-900 font-sans">
              R$ ${parseFloat(gift.price).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            ${barraDaVaquinhaHtml(gift)}
          </div>

          <!-- Linha de Ações: Editar / Excluir (também no presente comprado) -->
          ${true ? `
            <div class="flex items-center gap-2 pt-1 mt-auto">
              <button type="button" class="btn-edit-gift flex-1 py-2 px-3 rounded-[var(--radius-control,12px)] border border-zinc-200 hover:border-zinc-300 hover:bg-zinc-50 text-xs font-semibold text-zinc-700 transition-all font-sans cursor-pointer text-center">
                Editar
              </button>
            </div>
          ` : `
            <div class="pt-1 mt-auto">
              <div class="gift-received-btn w-full py-2 px-3 rounded-[var(--radius-control,12px)] bg-[#FAFAFA] border border-zinc-200 text-center text-xs font-bold text-zinc-600 font-sans select-none flex items-center justify-center gap-1.5" title="Ver recado">
                <span>Presente recebido</span>
              </div>
            </div>
          `}
        </div>
      `;

      // Evento de edição do presente
      const btnEdit = card.querySelector('.btn-edit-gift');
      if (btnEdit) {
        btnEdit.addEventListener('click', (e) => {
          e.stopPropagation();
          openGiftDrawerForEdit(gift);
        });
      }

      // Caixinha de seleção (exclusão em massa pela lixeira do topo)
      const checkSelecao = card.querySelector('.gift-select-check');
      if (checkSelecao) {
        checkSelecao.closest('.gift-select-box').addEventListener('click', (e) => e.stopPropagation());
        checkSelecao.addEventListener('change', () => {
          if (checkSelecao.checked) presentesSelecionados.add(gift.id);
          else presentesSelecionados.delete(gift.id);
          card.classList.toggle('gift-card-selecionado', checkSelecao.checked);
          atualizarLixeiraDePresentes();
        });
        card.classList.toggle('gift-card-selecionado', checkSelecao.checked);
      }


      // Evento de favoritar presente
      const btnFav = card.querySelector('.btn-fav-gift');
      if (btnFav) {
        btnFav.addEventListener('click', (e) => {
          e.stopPropagation();
          btnFav.classList.toggle('text-rose-500');
          btnFav.classList.toggle('text-zinc-300');
          const svg = btnFav.querySelector('svg');
          if (svg) {
            svg.classList.toggle('fill-rose-500');
          }
        });
      }

      // Presente comprado não abre nada ao clicar no cartão (pedido do cliente).
      if (false) {
        card.addEventListener('click', () => {
          const buyerNameLower = (buyerName || '').trim().toLowerCase();
          const buyerGuest = activeEvent.guests.find(g => {
            const gName = (g.name || '').trim().toLowerCase();
            return gName && (gName === buyerNameLower || buyerNameLower.startsWith(gName + ' '));
          });
          openGiftMessageModal({
            image: gift.image,
            title: gift.title,
            buyerName,
            message: receivedRecord && receivedRecord.message,
            date: receivedRecord && receivedRecord.date,
            amount: (receivedRecord && receivedRecord.amount) || parseFloat(gift.price) || 0,
            rsvpStatus: buyerGuest && buyerGuest.status
          });
        });
      }

      container.appendChild(card);
    });

    // Cards na tela: mostra "Selecionar tudo" e acerta o estado da caixinha.
    atualizarLixeiraDePresentes();
  }

  function openGiftMessageModal({ image, title, buyerName, message, date, amount, rsvpStatus }) {
    const modal = document.getElementById('modal-gift-message');
    if (!modal) return;
    const imgEl = document.getElementById('gift-message-modal-image');
    const titleEl = document.getElementById('gift-message-modal-title');
    const buyerEl = document.getElementById('gift-message-modal-buyer');
    const valueEl = document.getElementById('gift-message-modal-value');
    const dateEl = document.getElementById('gift-message-modal-date');
    const statusEl = document.getElementById('gift-message-modal-status');
    const textEl = document.getElementById('gift-message-modal-text');

    if (imgEl) { imgEl.src = image || ''; imgEl.alt = title || ''; }
    if (titleEl) titleEl.textContent = title || '';
    if (buyerEl) buyerEl.textContent = `Presente de ${buyerName || 'um convidado'}`;
    if (valueEl) valueEl.textContent = `R$ ${(amount || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    if (dateEl) dateEl.textContent = date || '—';

    const statusMap = {
      confirmed: { label: 'Confirmado', color: '#10B981' },
      pending: { label: 'Pendente', color: '#71717A' },
      declined: { label: 'Recusado', color: '#b04369' }
    };
    if (statusEl) {
      const info = statusMap[rsvpStatus] || { label: '—', color: '#71717A' };
      statusEl.textContent = info.label;
      statusEl.style.setProperty('color', info.color, 'important');
    }

    if (textEl) textEl.textContent = (message && message.trim()) ? message : 'Nenhum recado foi deixado com esse presente.';
    openModal(modal);
  }

  function renderReceivedGifts() {
    const container = document.getElementById('host-gifts-grid');
    const headerTitle = document.getElementById('gifts-header-title');
    const headerSub = document.getElementById('gifts-header-subtitle');
    const summaryStats = document.getElementById('gifts-summary-stats');

    if (headerTitle) headerTitle.textContent = 'Presentes Recebidos';
    if (headerSub) headerSub.textContent = 'Presentes presenteados pelos convidados, valores creditados na carteira e recados carinhosos.';
    if (summaryStats) summaryStats.classList.add('hidden');

    if (!container) return;
    container.innerHTML = '';
    const activeEvent = getActiveEvent();
    const list = activeEvent.receivedGifts || [];

    if (list.length === 0) {
      container.innerHTML = `
        <div class="col-span-full py-12 text-center bg-white rounded-[var(--radius-card,10px)] border border-transparent p-8 space-y-2">
          <span class="text-3xl block">🎁</span>
          <h4 class="font-bold text-slate-800 text-sm">Nenhum presente recebido ainda</h4>
          <p class="text-xs text-slate-400">Quando os convidados presentearem você pela página pública, eles aparecerão aqui com os valores e recados.</p>
        </div>
      `;
      return;
    }

    list.forEach(item => {
      const card = document.createElement('div');
      card.className = 'bg-white rounded-2xl border border-transparent shadow-sm p-4 flex flex-col justify-between gap-3 hover:shadow-md transition-shadow';
      card.innerHTML = `
        <div class="flex items-start gap-3">
          <img src="${item.image}" alt="${item.giftTitle}" class="w-16 h-16 rounded-xl object-cover border border-gray-100 flex-shrink-0">
          <div class="flex-1 min-w-0">
            <span class="gift-received-tag text-[10px] font-bold text-[#183b54] bg-[#ebf4ff] border border-[#d4e5ff] px-2 py-0.5 rounded-[var(--radius-control,12px)] uppercase tracking-wider inline-block">Presente Recebido ● ${item.method}</span>
            <h4 class="font-bold text-slate-900 text-xs sm:text-sm truncate mt-1">${item.giftTitle}</h4>
            <div class="text-sm font-black text-emerald-600 mt-0.5">R$ ${item.amount.toFixed(2).replace('.', ',')}</div>
            <p class="text-[11px] font-bold text-slate-700 mt-1 flex items-center gap-1">
              <span>De: ${item.guestName}</span>
            </p>
          </div>
        </div>

        ${item.message ? `
          <div class="p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-[11px] text-slate-600 italic">
            "${item.message}"
          </div>
        ` : ''}

        <div class="pt-2 border-t border-gray-100 flex items-center justify-between text-[11px] text-slate-400">
          <span>${item.date}</span>
          <span class="text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded-full">Resgatado na Carteira</span>
        </div>
      `;
      container.appendChild(card);
    });
  }

  const btnHostAddGift = document.getElementById('btn-host-add-gift');
  if (btnHostAddGift) {
    btnHostAddGift.addEventListener('click', () => openGiftDrawer());
  }

  const btnHostAddRandomGift = document.getElementById('btn-host-add-random-gift');
  if (btnHostAddRandomGift) {
    btnHostAddRandomGift.addEventListener('click', () => {
      createRandomGift();
      triggerConfetti();
    });
  }

  const inputGiftsSearch = document.getElementById('gifts-search-input');
  if (inputGiftsSearch) {
    inputGiftsSearch.addEventListener('input', (e) => {
      renderHostGifts(e.target.value);
    });
  }

  const btnCloseGiftModal = document.getElementById('btn-close-gift-modal');
  if (btnCloseGiftModal) btnCloseGiftModal.addEventListener('click', closeGiftModal);

  // Listeners para fechar o Drawer Lateral de Adicionar Presente
  const btnCloseGiftDrawer = document.getElementById('btn-close-gift-drawer');
  const giftDrawerBackdrop = document.getElementById('gift-drawer-backdrop');
  if (btnCloseGiftDrawer) btnCloseGiftDrawer.addEventListener('click', closeGiftDrawer);
  if (giftDrawerBackdrop) giftDrawerBackdrop.addEventListener('click', closeGiftDrawer);

  // Alternância das abas dentro do Modal de Adicionar Presente
  const tabBtnGiftCustom = document.getElementById('tab-btn-gift-custom');
  if (tabBtnGiftCustom) {
    tabBtnGiftCustom.addEventListener('click', () => switchGiftModalTab('custom'));
  }

  const tabBtnGiftRandom = document.getElementById('tab-btn-gift-random');
  if (tabBtnGiftRandom) {
    tabBtnGiftRandom.addEventListener('click', () => switchGiftModalTab('random'));
  }

  // Botão "Gerar Presente Aleatório" dentro do Modal
  const btnModalTriggerRandom = document.getElementById('btn-modal-trigger-random');
  if (btnModalTriggerRandom) {
    btnModalTriggerRandom.addEventListener('click', () => {
      createRandomGift();
      closeGiftModal();
      showToast('Presente aleatório gerado e adicionado à lista!', '🎲');
      triggerConfetti();
    });
  }

  // Adicionar Presente via Drawer (Nome, Imagem, Descrição Opcional, Valor)
  const formAddGift = document.getElementById('form-add-gift');
  if (formAddGift) {
    let selectedGiftImage = '';
    const giftDropzone = document.getElementById('gift-image-dropzone');
    const giftFileInput = document.getElementById('gift-file-input');
    const giftPreviewImg = document.getElementById('gift-image-preview-img');
    const giftUrlInput = document.getElementById('gift-image-url-input');

    // Clique na área de upload para selecionar arquivo do computador
    if (giftDropzone && giftFileInput) {
      giftDropzone.addEventListener('click', () => giftFileInput.click());
      giftFileInput.addEventListener('change', (e) => {
        const file = e.target.files && e.target.files[0];
        if (file) {
          const reader = new FileReader();
          reader.onload = (event) => {
            selectedGiftImage = event.target.result;
            mostrarImagemDoPresente(event.target.result);
          };
          reader.readAsDataURL(file);
        }
      });
    }

    // ---- Presente Coletivo / Cotas (Crowdfunding) ----
    const giftCrowdfundingToggle = document.getElementById('gift-crowdfunding-toggle');
    const giftCrowdfundingFields = document.getElementById('gift-crowdfunding-fields');
    const giftQuotaCountInput = document.getElementById('gift-quota-count-input');
    const giftQuotaValueInput = document.getElementById('gift-quota-value-input');

    if (giftCrowdfundingToggle) {
      giftCrowdfundingToggle.addEventListener('change', () => setGiftCrowdfundingOpen(giftCrowdfundingToggle.checked));
    }
    const giftPriceInputEl = document.getElementById('gift-price-input');
    if (giftPriceInputEl) {
      giftPriceInputEl.addEventListener('input', () => {
        if (giftCrowdfundingToggle?.checked) updateGiftQuotaCalc('count');
      });
    }
    if (giftQuotaCountInput) {
      giftQuotaCountInput.addEventListener('input', () => updateGiftQuotaCalc('count'));
    }
    if (giftQuotaValueInput) {
      giftQuotaValueInput.addEventListener('input', () => updateGiftQuotaCalc('value'));
    }
    const giftQuotaDecrement = document.getElementById('gift-quota-decrement');
    if (giftQuotaDecrement) {
      giftQuotaDecrement.addEventListener('click', () => {
        giftQuotaCountInput.value = Math.max(2, (parseInt(giftQuotaCountInput.value, 10) || 2) - 1);
        updateGiftQuotaCalc('count');
      });
    }
    const giftQuotaIncrement = document.getElementById('gift-quota-increment');
    if (giftQuotaIncrement) {
      giftQuotaIncrement.addEventListener('click', () => {
        giftQuotaCountInput.value = Math.min(999, (parseInt(giftQuotaCountInput.value, 10) || 2) + 1);
        updateGiftQuotaCalc('count');
      });
    }
    document.querySelectorAll('#gift-quota-preset-group .gift-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        const n = parseInt(chip.getAttribute('data-quota-preset'), 10);
        if (giftQuotaCountInput && n) {
          giftQuotaCountInput.value = n;
          updateGiftQuotaCalc('count');
        }
      });
    });
    document.querySelectorAll('#gift-category-tag-group .gift-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        const tag = chip.getAttribute('data-category');
        setGiftCategoryTag(chip.classList.contains('active') ? '' : tag);
      });
    });

    // Duplicar (gaveta de editar): cria uma cópia do presente na lista.
    document.getElementById('btn-duplicate-gift')?.addEventListener('click', async () => {
      const btn = document.getElementById('btn-duplicate-gift');
      if (!btn || btn.disabled || !editingGiftId) return;
      const activeEvent = getActiveEvent();
      const original = (activeEvent.giftList || []).find(g => g.id === editingGiftId);
      if (!original) return;
      const copia = JSON.parse(JSON.stringify(original));
      copia.id = `gift-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      copia.title = `${original.title || 'Presente'} (cópia)`;
      // A cópia nasce disponível: sem comprador nem valor recebido.
      copia.received = 0;
      copia.buyerName = null;
      copia.contributorsCount = 0;
      copia.status = 'Disponível para Presentear';
      const textoAntes = btn.textContent;
      btn.disabled = true;
      btn.textContent = 'Duplicando…';
      const { error } = await salvarPresenteNoBanco(copia).catch(err => ({ error: err }));
      btn.disabled = false;
      if (error) {
        btn.textContent = 'Erro ao duplicar';
        setTimeout(() => { btn.textContent = textoAntes; }, 1800);
        return;
      }
      btn.textContent = textoAntes;
      const idx = activeEvent.giftList.indexOf(original);
      activeEvent.giftList.splice(idx >= 0 ? idx + 1 : 0, 0, copia);
      editingGiftId = null;
      closeGiftDrawer();
      renderHostGifts();
      updateAllCelebrationData();
    });

    formAddGift.addEventListener('submit', async (e) => {
      e.preventDefault();
      const btnSubmitGift = formAddGift.querySelector('button[type="submit"]');
      const btnSubmitGiftText = document.getElementById('btn-submit-gift-text');
      if (btnSubmitGift && btnSubmitGift.disabled) return;
      const activeEvent = getActiveEvent();
      if (!activeEvent.giftList) activeEvent.giftList = [];
      // Retorno no próprio botão (avisos flutuantes desligados).
      const salvarComRetorno = async (gift) => {
        const textoAntes = btnSubmitGiftText ? btnSubmitGiftText.textContent : '';
        if (btnSubmitGift) btnSubmitGift.disabled = true;
        if (btnSubmitGiftText) btnSubmitGiftText.textContent = 'Salvando…';
        let erro = null;
        try { ({ error: erro } = await salvarPresenteNoBanco(gift)); } catch (err) { erro = err; }
        if (btnSubmitGift) btnSubmitGift.disabled = false;
        if (btnSubmitGiftText) btnSubmitGiftText.textContent = erro ? 'Erro ao salvar' : textoAntes;
        if (erro && btnSubmitGiftText) setTimeout(() => { btnSubmitGiftText.textContent = textoAntes; }, 1800);
        return !erro;
      };

      const title = document.getElementById('gift-title-input')?.value?.trim() || '';
      const price = parseFloat(document.getElementById('gift-price-input')?.value) || 0;
      if (!title || !(price > 0)) return;
      const description = document.getElementById('gift-description-input')?.value?.trim() || '';
      // Só a imagem escolhida (vazio = presente sem foto).
      const image = (giftUrlInput && giftUrlInput.value) || '';

      // Presente Coletivo / Cotas — ver interface GiftItemPayload
      const isCrowdfunding = !!document.getElementById('gift-crowdfunding-toggle')?.checked;
      let crowdfundingConfig = null;
      // Vaquinha livre: sem cotas — o convidado escolhe o valor que quer dar.
      if (isCrowdfunding) crowdfundingConfig = { valorLivre: true };
      const categoryTag = document.getElementById('gift-category-tag-input')?.value || null;

      if (editingGiftId) {
        const giftItem = activeEvent.giftList.find(g => g.id === editingGiftId);
        if (giftItem) {
          giftItem.title = title;
          giftItem.description = description;
          giftItem.price = price;
          giftItem.image = image;
          giftItem.isCrowdfunding = isCrowdfunding;
          giftItem.crowdfundingConfig = crowdfundingConfig;
          giftItem.categoryTag = categoryTag;
          if (!(await salvarComRetorno(giftItem))) return;
        }
        editingGiftId = null;
        formAddGift.reset();
        selectedGiftImage = '';
        mostrarImagemDoPresente('');
        resetGiftCrowdfundingFields();
        closeGiftDrawer();
        renderHostGifts();
        updateAllCelebrationData();
        showToast(`Presente "${title}" atualizado com sucesso!`, '✅');
        return;
      }

      const novoPresente = {
        id: `gift-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        title: title,
        description: description,
        category: 'Presentes & Cotas',
        price: price,
        type: 'virtual',
        marketplaceUrl: null,
        received: 0,
        status: 'Disponível para Presentear',
        image: image,
        contributorsCount: 0,
        isCrowdfunding: isCrowdfunding,
        crowdfundingConfig: crowdfundingConfig,
        categoryTag: categoryTag
      };
      if (!(await salvarComRetorno(novoPresente))) return;
      activeEvent.giftList.unshift(novoPresente);

      activeEvent.presentesRecebidos = (activeEvent.presentesRecebidos || 0) + 1;
      formAddGift.reset();
      selectedGiftImage = '';
      mostrarImagemDoPresente('');
      resetGiftCrowdfundingFields();

      closeGiftDrawer();
      closeGiftModal();
      renderHostGifts();
      updateAllCelebrationData();
      showToast(`Presente "${title}" adicionado à lista!`, '🎁');
      triggerConfetti();
    });
  }

  // Formata número como moeda BRL (sem o prefixo "R$")
  function formatGiftCurrency(n) {
    return (Number(n) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  // Recalcula cota <-> valor total em tempo real (bidirecional).
  // source 'count': quantidade de cotas mudou, recalcula o valor de cada cota.
  // source 'value': valor da cota mudou, recalcula quantas cotas cabem no total.
  function updateGiftQuotaCalc(source) {
    const priceInput = document.getElementById('gift-price-input');
    const quotaCountInput = document.getElementById('gift-quota-count-input');
    const quotaValueInput = document.getElementById('gift-quota-value-input');
    const summaryText = document.getElementById('gift-quota-summary-text');
    const previewQtyLabel = document.getElementById('gift-quota-preview-qty-label');
    const previewBtnPartial = document.getElementById('gift-quota-preview-btn-partial');
    const previewBtnFull = document.getElementById('gift-quota-preview-btn-full');
    if (!priceInput || !quotaCountInput) return;

    const total = parseFloat(priceInput.value) || 0;
    let count = Math.max(2, parseInt(quotaCountInput.value, 10) || 2);

    if (source === 'value' && quotaValueInput) {
      const typedQuotaValue = parseFloat(quotaValueInput.value) || 0;
      if (typedQuotaValue > 0 && total > 0) {
        count = Math.max(2, Math.round(total / typedQuotaValue));
      }
    }

    quotaCountInput.value = count;
    const quotaValue = count > 0 ? total / count : 0;
    if (quotaValueInput) quotaValueInput.value = quotaValue > 0 ? quotaValue.toFixed(2) : '';

    if (summaryText) {
      summaryText.innerHTML = `Cada cota custará <strong class="text-zinc-900">R$ ${formatGiftCurrency(quotaValue)}</strong> (${count} cotas no total)`;
    }
    if (previewQtyLabel) previewQtyLabel.textContent = `1 cota (R$ ${formatGiftCurrency(quotaValue)})`;
    // Um botão só: "Presentear com 1 cota · R$ X".
    if (previewBtnPartial) previewBtnPartial.textContent = 'Presentear com 1 cota';
    if (previewBtnFull) previewBtnFull.textContent = `Comprar as ${count} cotas (R$ ${formatGiftCurrency(total)})`;

    document.querySelectorAll('#gift-quota-preset-group .gift-chip').forEach(chip => {
      chip.classList.toggle('active', parseInt(chip.getAttribute('data-quota-preset'), 10) === count);
    });
  }

  // Abre/fecha com animação a seção de campos de cotas, ligada ao switch
  function setGiftCrowdfundingOpen(open) {
    const fields = document.getElementById('gift-crowdfunding-fields');
    const toggle = document.getElementById('gift-crowdfunding-toggle');
    if (fields) fields.classList.toggle('open', open);
    if (toggle) toggle.checked = open;
    if (open) updateGiftQuotaCalc('count');
  }

  // Seleciona (ou limpa, se clicar de novo) a tag de categoria do presente
  function setGiftCategoryTag(tag) {
    const input = document.getElementById('gift-category-tag-input');
    if (input) input.value = tag || '';
    document.querySelectorAll('#gift-category-tag-group .gift-chip').forEach(chip => {
      chip.classList.toggle('active', !!tag && chip.getAttribute('data-category') === tag);
    });
  }

  // Volta o bloco de cotas/categoria ao estado inicial (drawer de criação)
  function resetGiftCrowdfundingFields() {
    setGiftCrowdfundingOpen(false);
    const quotaCountInput = document.getElementById('gift-quota-count-input');
    const quotaValueInput = document.getElementById('gift-quota-value-input');
    const allowCustomInput = document.getElementById('gift-quota-allow-custom-input');
    if (quotaCountInput) quotaCountInput.value = 5;
    if (quotaValueInput) quotaValueInput.value = '';
    if (allowCustomInput) allowCustomInput.checked = true;
    document.querySelectorAll('#gift-quota-preset-group .gift-chip').forEach(c => c.classList.remove('active'));
    setGiftCategoryTag('');
  }

  // Repopula o bloco de cotas/categoria ao abrir o drawer em modo edição
  function populateGiftCrowdfundingFields(gift) {
    const isCf = !!(gift && gift.isCrowdfunding);
    setGiftCrowdfundingOpen(isCf);
    const cfg = (gift && gift.crowdfundingConfig) || {};
    const quotaCountInput = document.getElementById('gift-quota-count-input');
    const quotaValueInput = document.getElementById('gift-quota-value-input');
    const allowCustomInput = document.getElementById('gift-quota-allow-custom-input');
    if (quotaCountInput) quotaCountInput.value = cfg.totalQuotas || 5;
    if (allowCustomInput) allowCustomInput.checked = cfg.allowCustomQuotas !== false;
    if (isCf) {
      updateGiftQuotaCalc('count');
    } else if (quotaValueInput) {
      quotaValueInput.value = '';
    }
    setGiftCategoryTag((gift && gift.categoryTag) || '');
  }

  // Alternar sub-seção da Lista de Presentes (Meus presentes vs Configurações)
  function switchGiftsSubSection(subId) {
    const topSearchBar = document.getElementById('gifts-top-search-bar');
    const panelProducts = document.getElementById('gifts-panel-products');
    const panelSettings = document.getElementById('gifts-panel-settings');
    const summaryStats = document.getElementById('gifts-summary-stats');
    const headerTitle = document.getElementById('gifts-header-title');
    const headerSub = document.getElementById('gifts-header-subtitle');

    if (subId === 'gift-settings') {
      if (topSearchBar) topSearchBar.classList.add('hidden');
      if (panelProducts) panelProducts.classList.add('hidden');
      if (panelSettings) panelSettings.classList.remove('hidden');
      if (summaryStats) summaryStats.classList.add('hidden');
      if (headerTitle) headerTitle.textContent = 'Configurações da Lista';
      if (headerSub) headerSub.textContent = 'Configure taxas, parcelamento sem juros para convidados e preferências.';
    } else {
      if (topSearchBar) topSearchBar.classList.remove('hidden');
      if (panelProducts) panelProducts.classList.remove('hidden');
      if (panelSettings) panelSettings.classList.add('hidden');
      if (summaryStats) summaryStats.classList.remove('hidden');
      if (headerTitle) headerTitle.textContent = 'Meus presentes';
      if (headerSub) headerSub.textContent = 'Os presentes adicionados são apenas fictícios para os seus convidados, você recebe o valor em dinheiro.';
      const searchInput = document.getElementById('gifts-search-input');
      renderHostGifts(searchInput ? searchInput.value : '');
    }
  }

  // Quem paga a taxa dos presentes: "Seus convidados" ou "Você" (o visual
  // de selecionado vem da classe .active no CSS).
  document.querySelectorAll('.gift-fee-card').forEach(card => {
    const escolher = () => {
      document.querySelectorAll('.gift-fee-card').forEach(c => {
        c.classList.toggle('active', c === card);
        c.setAttribute('aria-checked', String(c === card));
      });
    };
    card.addEventListener('click', escolher);
    card.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); escolher(); } });
  });

  // "Saiba mais" da taxa: abre a Central de ajuda direto na categoria de presentes.
  document.querySelectorAll('.gift-saiba-mais').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      faqCategoriaPedida = /** @type {HTMLElement} */ (link).dataset.ajudaCategoria || null;
      openFaqPage();
    });
  });

  // Salvar configurações da lista de presentes (retorno no próprio botão).
  const btnSaveGiftSettings = document.getElementById('btn-save-gift-settings');
  if (btnSaveGiftSettings) {
    btnSaveGiftSettings.addEventListener('click', () => {
      const texto = btnSaveGiftSettings.textContent;
      btnSaveGiftSettings.textContent = 'Salvo';
      btnSaveGiftSettings.disabled = true;
      setTimeout(() => { btnSaveGiftSettings.textContent = texto; btnSaveGiftSettings.disabled = false; }, 1800);
    });
  }

  // ==========================================
  // 7. LISTA DE CONVIDADOS & RSVP (Layout idêntico ao Casar.com)
  // ==========================================
  let currentRsvpFilter = 'all';
  let rsvpPageSize = 15;
  let rsvpCurrentPage = 1;

  // Sub-seções de Lista de Convidados: Meus convidados / Mapear mesas / Checklist.
  function switchRsvpSubSection(id) {
    document.querySelectorAll('.dashboard-tab-content').forEach(c => c.classList.remove('active'));
    if (id === 'tables') {
      document.getElementById('tab-rsvp-tables')?.classList.add('active');
      renderTablesOrganization();
      // Lista da planta sempre atual (convidados adicionados depois de abrir a plataforma).
      renderFloorPlanGuestCards();
    } else if (id === 'checklist') {
      document.getElementById('tab-rsvp-checklist')?.classList.add('active');
      renderEventChecklist();
    } else {
      document.getElementById('tab-rsvp')?.classList.add('active');
      renderGuestsTable('all');
    }
  }

  // Ordem da lista de convidados: sempre alfabética pelo nome do convidado
  // (os acompanhantes vêm logo abaixo de quem os trouxe, fora dessa ordem).
  /** @param {any} a @param {any} b */
  function compararOrdemDeConvidados(a, b) {
    return (a.name || '').localeCompare(b.name || '', 'pt-BR', { sensitivity: 'base' });
  }

  function renderGuestsTable(activeFilter = currentRsvpFilter, searchKeyword = '') {
    currentRsvpFilter = activeFilter;
    const listEl = document.getElementById('rsvp-guests-table-body');
    const emptyStateEl = document.getElementById('rsvp-empty-state');
    if (!listEl) return;

    listEl.innerHTML = '';
    const activeEvent = getActiveEvent();

    // 1. Atualiza Top 3 KPI Summary Cards
    const summaryConfirmed = document.getElementById('rsvp-summary-confirmed');
    const summaryBreakdown = document.getElementById('rsvp-summary-breakdown');
    const summaryDeclined = document.getElementById('rsvp-summary-declined');
    const summaryPending = document.getElementById('rsvp-summary-pending');

    if (summaryConfirmed) summaryConfirmed.textContent = activeEvent.convidadosConfirmados;
    if (summaryBreakdown) summaryBreakdown.textContent = `Adultos: ${activeEvent.adultosConfirmados || 160} | Crianças: ${activeEvent.criancasConfirmadas || 25}`;
    if (summaryDeclined) summaryDeclined.textContent = activeEvent.convidadosRecusados || 10;
    if (summaryPending) summaryPending.textContent = activeEvent.convidadosPendentes || 25;

    // 2. Contagens do Menu de Status
    // Conta pessoas, não reservas: convidado + acompanhantes (1 + 1 = 2).
    const pessoasDaReserva = g => 1 + Math.max(
      (g.companionsNames || []).filter(n => (n || '').trim()).length,
      parseInt(g.companions) || 0
    );
    const somaPessoas = lista => lista.reduce((acc, g) => acc + pessoasDaReserva(g), 0);
    const totalCount = somaPessoas(activeEvent.guests);
    const confirmedCount = somaPessoas(activeEvent.guests.filter(g => g.status === 'confirmed'));
    const declinedCount = somaPessoas(activeEvent.guests.filter(g => g.status === 'declined'));
    const pendingCount = somaPessoas(activeEvent.guests.filter(g => g.status === 'pending'));

    const countOptAll = document.getElementById('count-rsvp-opt-all');
    const countOptConfirmed = document.getElementById('count-rsvp-opt-confirmed');
    const countOptDeclined = document.getElementById('count-rsvp-opt-declined');
    const countOptPending = document.getElementById('count-rsvp-opt-pending');

    if (countOptAll) countOptAll.textContent = totalCount;
    if (countOptConfirmed) countOptConfirmed.textContent = confirmedCount;
    if (countOptDeclined) countOptDeclined.textContent = declinedCount;
    if (countOptPending) countOptPending.textContent = pendingCount;

    // 3. Atualiza Label do Botão de Status e Checks
    const statusLabel = document.getElementById('rsvp-status-label');
    const statusLabelsMap = {
      'all': `Todos (${totalCount})`,
      'confirmed': `Confirmados (${confirmedCount})`,
      'declined': `Recusados (${declinedCount})`,
      'pending': `Pendentes (${pendingCount})`
    };
    if (statusLabel) {
      statusLabel.textContent = statusLabelsMap[activeFilter] || `Todos (${totalCount})`;
    }

    document.querySelectorAll('.rsvp-status-option').forEach(opt => {
      const optFilter = opt.getAttribute('data-filter');
      const isSelected = optFilter === activeFilter;
      opt.classList.toggle('active', isSelected);
      const check = opt.querySelector('.rsvp-status-check');
      if (check) check.classList.toggle('hidden', !isSelected);
    });

    // 4. Filtragem por Status e por Busca (lista sempre em ordem alfabética)
    const cleanSearch = searchKeyword.toLowerCase().trim();
    const filteredGuests = activeEvent.guests.filter(guest => {
      const matchesFilter = (activeFilter === 'all') || (guest.status === activeFilter);
      const matchesSearch = !cleanSearch ||
        guest.name.toLowerCase().includes(cleanSearch) ||
        (guest.phone && guest.phone.includes(cleanSearch)) ||
        (guest.table && guest.table.toLowerCase().includes(cleanSearch));
      return matchesFilter && matchesSearch;
    }).sort(compararOrdemDeConvidados);

    // O parêntese ao lado de "Convidados" mostra só quantos estão marcados
    // (ver atualizarLixeiraDeConvidados); o total já aparece nas abas acima.
    const footerCountEl = document.getElementById('rsvp-footer-count');
    if (footerCountEl) {
      footerCountEl.textContent = '';
    }

    if (filteredGuests.length === 0) {
      if (emptyStateEl) emptyStateEl.classList.remove('hidden');
      renderRsvpPagination(0);
      return;
    } else {
      if (emptyStateEl) emptyStateEl.classList.add('hidden');
    }

    // Paginação: só as mesas/convidados da página atual são renderizados,
    // mas sempre junto com seus acompanhantes (nunca dividimos uma reserva entre páginas).
    const totalPages = Math.max(1, Math.ceil(filteredGuests.length / rsvpPageSize));
    if (rsvpCurrentPage > totalPages) rsvpCurrentPage = totalPages;
    const pageStart = (rsvpCurrentPage - 1) * rsvpPageSize;
    const pageGuests = filteredGuests.slice(pageStart, pageStart + rsvpPageSize);
    renderRsvpPagination(filteredGuests.length);

    // Extrai só o número da mesa (ex: "Mesa 04 (Família)" -> "04")
    const extractTableNumber = (table) => {
      if (!table) return '—';
      const match = table.match(/\d+/);
      return match ? match[0] : '—';
    };

    // Status RSVP limpo: sem fundo colorido
    const statusBadges = {
      confirmed: '<span class="text-xs sm:text-sm font-medium whitespace-nowrap" style="color:#10B981;">Confirmado</span>',
      pending: '<span class="text-xs sm:text-sm font-medium text-zinc-700 whitespace-nowrap">Pendente</span>',
      declined: '<span class="text-xs sm:text-sm font-medium whitespace-nowrap" style="color:#b04369;">Recusado</span>'
    };

    // Mesa de cada pessoa: a da planta (Mapear mesas); sem assento lá, a mesa
    // antiga do convidado (Organizar mesas), se houver.
    // try: na abertura da plataforma a lista pode ser desenhada antes de o
    // módulo da planta existir.
    let elementosDaPlanta = [];
    try { elementosDaPlanta = getFloorPlanElements(); } catch (e) {}
    // Coluna Mesa: "Mesa 2", "Mesa 4"… (sem mesa: "—").
    const mesaDaPessoa = (seatName, guest) => {
      const numero = findFloorPlanTableNumberForGuest(seatName, elementosDaPlanta);
      if (numero !== null && numero !== undefined) return `Mesa ${Number(numero) || numero}`;
      const antiga = extractTableNumber(guest.table === 'Mesa a Definir' ? '' : guest.table);
      return antiga === '—' ? antiga : `Mesa ${Number(antiga) || antiga}`;
    };

    // Um convidado com acompanhantes nunca aparece com nomes concatenados
    // ("Fulano & Beltrano") numa única linha — cada pessoa ganha sua própria
    // linha, sempre com um nome único, compartilhando status e mesa da mesma reserva.
    pageGuests.forEach((guest, indiceGrupo) => {
      const gifts = guest.giftsBought || [];
      const giftsTotal = gifts.reduce((acc, g) => acc + (g.amount || 0), 0);
      const giftLabel = giftsTotal > 0
        ? `R$ ${giftsTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
        : '—';

      // seatName: o nome com que a pessoa aparece na planta (Mapear mesas) —
      // acompanhante sem nome lá é "Acompanhante de <primeiro nome>".
      const primeiroNome = (guest.name || '').trim().split(/\s+/)[0];
      const attendees = [{ name: guest.name, seatName: guest.name, isPrimary: true }];
      (guest.companionsNames || []).forEach((comp, i) => {
        const cleanName = (comp || '').replace(/\s*\([^)]*\)\s*$/, '').trim();
        const generico = !cleanName || cleanName.toLowerCase() === 'acompanhante';
        attendees.push({
          name: cleanName || 'Acompanhante',
          seatName: generico ? `Acompanhante de ${primeiroNome}` : cleanName,
          isPrimary: false,
          restricaoAlimentar: guest.companionsDetailed && guest.companionsDetailed[i] ? guest.companionsDetailed[i].restricaoAlimentar : null
        });
      });

      attendees.forEach(attendee => {
        const row = document.createElement('tr');
        // Mesma cor para o convidado e seus acompanhantes (o grupo alterna,
        // não cada linha); o acompanhante aparece como subitem do convidado.
        row.className = `group ${indiceGrupo % 2 ? 'grupo-par' : 'grupo-impar'}${attendee.isPrimary ? '' : ' is-acompanhante-row'}`;
        row.innerHTML = `
          <td>
            <div class="flex items-center gap-2 min-w-0">
              ${attendee.isPrimary ? `<input type="checkbox" class="gifts-select-all-check guest-select-check" data-guest-id="${escaparHtml(guest.id)}"${convidadosSelecionados.has(guest.id) ? ' checked' : ''} aria-label="Selecionar ${escaparHtml(guest.name || 'convidado')}">` : '<span class="guest-select-espaco" aria-hidden="true"></span>'}
              ${attendee.isPrimary ? '' : '<span class="guest-sub-conector" aria-hidden="true"></span>'}
              <span class="guest-tipo-badge ${attendee.isPrimary ? 'is-convidado' : 'is-acompanhante'}" title="${attendee.isPrimary ? 'Convidado' : 'Acompanhante'}">${attendee.isPrimary ? 'C' : 'A'}</span>
              <button type="button" class="guest-nome-btn font-semibold text-zinc-900 block truncate" title="Ver convidado">${attendee.name}</button>
            </div>
          </td>
          <td>
            <span class="text-[0.8125rem] font-normal text-[#667085] whitespace-nowrap">${attendee.isPrimary ? escaparHtml(formatGuestTitleLabel(guest)) : escaparHtml(`+1 / ${(guest.name || '').trim().split(/\s+/)[0] || 'convidado'}`)}</span>
          </td>
          <td>
            <span class="text-[0.8125rem] font-normal text-[#667085] whitespace-nowrap">${mesaDaPessoa(attendee.seatName, guest)}</span>
          </td>
          <td>
            <span class="text-[0.8125rem] font-normal text-[#667085] whitespace-nowrap">${attendee.isPrimary ? giftLabel : '—'}</span>
          </td>
          <td>
            <div class="flex items-center">
              ${statusBadges[guest.status] || guest.status}
            </div>
          </td>
          <td class="guest-col-restricao">${bolinhaDaRestricaoHtml(attendee.isPrimary ? guest.restricaoAlimentar : attendee.restricaoAlimentar)}</td>
        `;
        row.dataset.guestId = guest.id;

        // O nome abre o convidado (a linha continua livre para selecionar/copiar texto).
        row.querySelector('.guest-nome-btn')?.addEventListener('click', (e) => {
          e.stopPropagation();
          openAddGuestDrawer(guest.id);
        });

        listEl.appendChild(row);
      });
    });
    atualizarLixeiraDeConvidados();
  }

  // Lixeira ao lado do "Filtrar por" (barra da tabela): aparece com algum
  // convidado marcado, com a quantidade; "Selecionar tudo" marca os visíveis.
  function atualizarLixeiraDeConvidados() {
    const ev = getActiveEvent();
    const ids = new Set(((ev && ev.guests) || []).map(g => g.id));
    [...convidadosSelecionados].forEach(id => { if (!ids.has(id)) convidadosSelecionados.delete(id); });
    const btn = document.getElementById('btn-rsvp-delete-selected');
    if (btn) {
      const qtd = convidadosSelecionados.size;
      btn.classList.toggle('hidden', qtd === 0);
      btn.title = qtd === 1 ? 'Excluir 1 convidado selecionado' : `Excluir ${qtd} convidados selecionados`;
    }
    const checks = Array.from(document.querySelectorAll('#rsvp-guests-table-body .guest-select-check'));
    const contagem = document.getElementById('rsvp-footer-count');
    if (contagem) contagem.textContent = convidadosSelecionados.size ? `(${convidadosSelecionados.size})` : '';
    const todos = document.getElementById('rsvp-select-all');
    if (todos) {
      const marcados = checks.filter(c => c.checked).length;
      todos.checked = checks.length > 0 && marcados === checks.length;
      todos.indeterminate = marcados > 0 && marcados < checks.length;
    }
  }

  document.addEventListener('change', (e) => {
    const check = e.target.closest('.guest-select-check');
    if (check) {
      if (check.checked) convidadosSelecionados.add(check.dataset.guestId); else convidadosSelecionados.delete(check.dataset.guestId);
      atualizarLixeiraDeConvidados();
      return;
    }
    if (e.target.id === 'rsvp-select-all') {
      const marcar = e.target.checked;
      document.querySelectorAll('#rsvp-guests-table-body .guest-select-check').forEach(c => {
        c.checked = marcar;
        if (marcar) convidadosSelecionados.add(c.dataset.guestId); else convidadosSelecionados.delete(c.dataset.guestId);
      });
      atualizarLixeiraDeConvidados();
    }
  });

  // Botão da lixeira: entra na barra da tabela, antes do "Filtrar por".
  (function montarLixeiraDeConvidados() {
    const tabela = document.getElementById('rsvp-guests-table-body')?.closest('table');
    const dir = tabela && tabela.closest('.love-tabela-caixa')?.querySelector('.love-tabela-barra-dir');
    if (!dir) return;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.id = 'btn-rsvp-delete-selected';
    btn.className = 'love-tabela-botao love-tabela-lixeira hidden';
    btn.innerHTML = '<svg stroke-linejoin="round" stroke-linecap="round" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M4 6.5h16"/><path stroke-linecap="round" stroke-linejoin="round" d="M9 6.5V4.5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/><path stroke-linecap="round" stroke-linejoin="round" d="M6.5 9.5V18a3 3 0 0 0 3 3h5a3 3 0 0 0 3-3V9.5"/><path stroke-linecap="round" stroke-linejoin="round" d="M10.5 11v5.5M13.5 11v5.5"/></svg>';
    dir.prepend(btn);
    btn.addEventListener('click', async () => {
      const ev = getActiveEvent();
      const ids = [...convidadosSelecionados];
      if (!ev || !ids.length || btn.disabled) return;
      const excluiu = await confirmarNaLove({
        titulo: ids.length === 1 ? 'Deseja excluir 1 convidado selecionado?' : `Deseja excluir ${ids.length} convidados selecionados?`,
        texto: 'Os acompanhantes dele(s) também saem da lista. Essa ação não pode ser desfeita.',
        botao: 'Excluir',
        aoConfirmar: async () => {
          for (const id of ids) {
            const { error } = await excluirConvidadoNoBanco(id).catch(err => ({ error: err }));
            if (error) return 'Não foi possível excluir todos agora. Tente de novo.';
            const idx = ev.guests.findIndex(g => g.id === id);
            if (idx !== -1) ev.guests.splice(idx, 1);
            convidadosSelecionados.delete(id);
          }
          return null;
        }
      });
      if (!excluiu && !convidadosSelecionados.size) { /* nada */ }
      renderGuestsTable();
      renderFloorPlanGuestCards();
      updateAllCelebrationData();
    });
  })();

  // Configurações da Lista de Convidados: cada fornecedor contratado tem um
  // conjunto próprio de permissões (o que pode ver, e ações extras como
  // comentar ou contatar convidados) — mestre-detalhe: lista à esquerda,
  // permissões do fornecedor selecionado à direita.
  const RSVP_SHARE_PERMISSIONS = [
    {
      key: 'viewGuestList',
      label: 'Lista de convidados',
      desc: 'Ver nomes, quantidade de acompanhantes e status de confirmação.',
      child: { key: 'canContactGuests', label: 'Permitir contato com os convidados', desc: 'O fornecedor pode entrar em contato diretamente com os convidados.' }
    },
    { key: 'viewTableMapping', label: 'Mapeamento de mesas', desc: 'Ver a distribuição das mesas e assentos.' },
    { key: 'viewReceivedGifts', label: 'Presentes recebidos', desc: 'Ver os presentes já recebidos pelos noivos.' },
    { key: 'viewDietaryRestrictions', label: 'Restrições alimentares', desc: 'Ver restrições e preferências alimentares dos convidados.' },
    {
      key: 'viewObservations',
      label: 'Observações',
      desc: 'Ver os comentários registrados sobre cada convidado.',
      child: { key: 'canComment', label: 'Permitir comentários', desc: 'O fornecedor pode comentar na lista de convidados.' }
    }
  ];

  function getVendorGuestListPermissions(activeEvent, vendorId) {
    if (!activeEvent.guestListPermissions) activeEvent.guestListPermissions = {};
    if (!activeEvent.guestListPermissions[vendorId]) {
      activeEvent.guestListPermissions[vendorId] = {
        viewGuestList: false,
        canContactGuests: false,
        viewTableMapping: false,
        viewReceivedGifts: false,
        viewDietaryRestrictions: false,
        viewObservations: false,
        canComment: false
      };
    }
    return activeEvent.guestListPermissions[vendorId];
  }

  // Checklist do evento (Convidados → Checklist): lista de tarefas por
  // categoria (mesma árvore do B2B_CATEGORY_TREE) — pra cada uma, escolhe
  // qual fornecedor contratado é o responsável.
  function renderEventChecklist() {
    const container = document.getElementById('event-checklist-list');
    if (!container) return;
    const activeEvent = getActiveEvent();
    if (!activeEvent.checklistAssignments) activeEvent.checklistAssignments = {};
    const vendors = (window.LOVE_DATA && Array.isArray(window.LOVE_DATA.contractedVendors)) ? window.LOVE_DATA.contractedVendors : [];
    const categories = Object.keys(B2B_CATEGORY_TREE);

    container.innerHTML = categories.map(cat => {
      const assignedId = activeEvent.checklistAssignments[cat] || '';
      return `
        <div class="flex items-center justify-between gap-4 py-3.5">
          <span class="text-sm font-semibold text-zinc-800">${cat}</span>
          <select class="field-input checklist-assign-select" style="max-width: 260px;" data-category="${cat}">
            <option value="">— Ninguém atribuído —</option>
            ${vendors.map(v => `<option value="${v.id}" ${v.id === assignedId ? 'selected' : ''}>${v.name}</option>`).join('')}
          </select>
        </div>
      `;
    }).join('');

    container.querySelectorAll('.checklist-assign-select').forEach(select => {
      select.addEventListener('change', () => {
        activeEvent.checklistAssignments[select.dataset.category] = select.value || null;
      });
    });
  }

  // Permissões de UM fornecedor contratado (Fornecedores → Meus Contratos →
  // fornecedor → aba Configurações) — mesmos dados/estrutura de antes
  // (activeEvent.guestListPermissions[vendorId]), só que sem o seletor de
  // fornecedor ao lado, já que a página inteira é desse fornecedor.
  function renderContractedVendorPermissions(vendor) {
    const list = document.getElementById('contracted-vendor-permissions-list');
    if (!list || !vendor) return;
    const activeEvent = getActiveEvent();
    const perms = getVendorGuestListPermissions(activeEvent, vendor.id);

    list.innerHTML = '';
    RSVP_SHARE_PERMISSIONS.forEach(perm => {
      const row = document.createElement('div');
      row.className = 'py-3.5 border-b border-zinc-100 last:border-b-0';
      row.innerHTML = `
        <div class="flex items-center justify-between gap-3">
          <div class="min-w-0">
            <p class="text-sm font-bold text-zinc-900 font-sans">${perm.label}</p>
            <p class="text-xs text-zinc-500 mt-0.5">${perm.desc}</p>
          </div>
          <label class="settings-switch flex-shrink-0">
            <input type="checkbox" data-perm-key="${perm.key}" ${perms[perm.key] ? 'checked' : ''}>
            <span class="settings-switch-track"></span>
          </label>
        </div>
        ${perm.child ? `
          <div class="flex items-center justify-between gap-3 mt-3 ml-1 pl-3 border-l-2 border-zinc-100 ${perms[perm.key] ? '' : 'opacity-40'}">
            <div class="min-w-0">
              <p class="text-xs font-bold text-zinc-700 font-sans">${perm.child.label}</p>
              <p class="text-[11px] text-zinc-400 mt-0.5">${perm.child.desc}</p>
            </div>
            <label class="settings-switch flex-shrink-0" style="transform:scale(0.85);">
              <input type="checkbox" data-perm-key="${perm.child.key}" ${perms[perm.child.key] ? 'checked' : ''} ${perms[perm.key] ? '' : 'disabled'}>
              <span class="settings-switch-track"></span>
            </label>
          </div>
        ` : ''}
      `;
      list.appendChild(row);
    });

    list.querySelectorAll('input[type="checkbox"]').forEach(input => {
      input.addEventListener('change', () => {
        const key = input.dataset.permKey;
        perms[key] = input.checked;
        const parentDef = RSVP_SHARE_PERMISSIONS.find(p => p.key === key && p.child);
        if (parentDef && !input.checked) {
          perms[parentDef.child.key] = false;
        }
        renderContractedVendorPermissions(vendor);
      });
    });
  }

  function renderRsvpPagination(totalCount) {
    const label = document.getElementById('rsvp-pagination-label');
    const prevBtn = document.getElementById('rsvp-page-prev');
    const nextBtn = document.getElementById('rsvp-page-next');
    const totalPages = Math.max(1, Math.ceil(totalCount / rsvpPageSize));
    if (rsvpCurrentPage > totalPages) rsvpCurrentPage = totalPages;
    if (label) label.textContent = `Página ${rsvpCurrentPage} de ${totalPages}`;
    if (prevBtn) prevBtn.disabled = rsvpCurrentPage <= 1;
    if (nextBtn) nextBtn.disabled = rsvpCurrentPage >= totalPages;
  }

  // ==========================================
  // 7.1. DRAWER LATERAL: CONVIDADO (compartilhado entre Adicionar e Editar)
  // ==========================================
  let activeDrawerGuestId = null;
  let isNewGuestDraft = false;

  // Nomes individuais dos anfitriões, extraídos de "Beatriz & Lucas" (ou
  // "Beatriz & Lucas (Pais do Theo)") -> ["Beatriz", "Lucas"].
  function getEventHostNames() {
    const activeEvent = getActiveEvent();
    const raw = (activeEvent && activeEvent.hostName) ? activeEvent.hostName.split('(')[0].trim() : '';
    return raw.split('&').map(n => n.trim()).filter(Boolean);
  }

  // Nome(s) do(s) anfitrião(ões) de verdade — do PERFIL DO CLIENTE logado,
  // não do evento (activeEvent.hostName às vezes é só o título do evento,
  // ex.: "Aniversário de Victor", que não é um nome de anfitrião).
  function getClienteHostNames() {
    const raw = (window.loveClienteProfile && window.loveClienteProfile.couple_name)
      ? window.loveClienteProfile.couple_name.split('(')[0].trim()
      : '';
    return raw.split('&').map(n => n.trim()).filter(Boolean);
  }

  // Rótulo da coluna "Relação" (antes "Título") na lista de convidados: "Pai/Beatriz",
  // ou só "Pai" quando não há anfitrião associado (ou só um anfitrião no evento).
  // "Irmão / Victor": título + primeiro nome de quem convidou (sempre que houver).
  function formatGuestTitleLabel(guest) {
    if (!guest.relationshipTitle) return '—';
    const quemConvidou = String(guest.relationshipHost || '').trim().split(/\s+/)[0];
    return quemConvidou ? `${guest.relationshipTitle} / ${quemConvidou}` : guest.relationshipTitle;
  }

  // ==========================================
  // DRAWER LATERAL: CONVIDADO (Adicionar Convidado / editar convidado existente)
  // ==========================================
  const GUEST_AGE_GROUP_LABELS = { adult: 'Adulto', child: 'Criança (5 a 11 anos)', baby: 'Bebê (0 a 4 anos)' };

  // Máscara de celular brasileiro: (11) 98888-7777 — DDD + 9 dígitos.
  function maskBrazilPhone(raw) {
    const digits = (raw || '').replace(/\D/g, '').slice(0, 11);
    if (digits.length <= 2) return digits;
    if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  }
  function isValidBrazilPhone(masked) {
    return /^\(\d{2}\) \d{5}-\d{4}$/.test((masked || '').trim());
  }

  // "+ Adicionar acompanhante" — insere uma linha com nome + faixa etária
  // (adulto/criança/bebê), fundamental pra contagem real de custo do buffet.
  function addCompanionRow(companion = {}) {
    const list = document.getElementById('guest-companions-list');
    if (!list) return;
    const { id, name = '', ageGroup = 'adult' } = companion;
    const row = document.createElement('div');
    row.className = 'guest-companion-row';
    row.dataset.id = id || `comp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    row.innerHTML = `
      <div class="flex items-center gap-2">
      <input type="text" placeholder="Nome ou 'Acompanhante'" class="field-input guest-companion-name-input" value="${name.replace(/"/g, '&quot;')}">
      <select class="field-input guest-companion-age-input" style="flex: 0 0 auto; width: 150px;">
        ${Object.entries(GUEST_AGE_GROUP_LABELS).map(([val, label]) => `<option value="${val}" ${val === ageGroup ? 'selected' : ''}>${label}</option>`).join('')}
      </select>
      <button type="button" class="btn-remove-companion-row guest-acompanhante-lixeira" aria-label="Remover acompanhante">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6M10 11v6M14 11v6"/></svg>
      </button>
      </div>
      <div class="guest-companion-restricao mt-2"></div>
    `;
    row.querySelector('.btn-remove-companion-row').addEventListener('click', () => row.remove());
    // Restrição alimentar deste acompanhante.
    const raizDoAcompanhante = /** @type {HTMLElement} */ (row.querySelector('.guest-companion-restricao'));
    restricaoDoAcompanhante.set(row, DietaryRestrictionSelect(raizDoAcompanhante, { rotulo: 'Restrições alimentares deste acompanhante', valor: companion.restricaoAlimentar || null }));
    list.appendChild(row);
    if (!name) row.querySelector('input').focus();
  }

  // Observações — histórico de comentários (igual ao comportamento original).
  const NO_DIETARY_FILLERS = ['não informado', 'nenhuma', 'nenhuma restrição', 'nenhuma restrição alimentar cadastrada'];

  function initialsFromName(name) {
    const words = (name || '').replace(/&/g, ' ').split(' ').map(w => w.trim()).filter(Boolean);
    const chars = words.slice(0, 2).map(w => w[0]).join('').toUpperCase();
    return chars || '?';
  }

  function formatCommentDate(date) {
    try {
      const d = date instanceof Date ? date : new Date(date);
      if (isNaN(d.getTime())) return '';
      const datePart = d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
      const timePart = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
      return `${datePart}, ${timePart}`;
    } catch (e) { return ''; }
  }

  function getGuestCommentAuthorName() {
    const raw = (window.loveClienteProfile && window.loveClienteProfile.couple_name)
      ? window.loveClienteProfile.couple_name.split('(')[0].trim()
      : '';
    return raw || 'Você';
  }

  function getGuestComments(guest) {
    if (!Array.isArray(guest.observationComments)) {
      const seed = (guest.dietaryRestrictions || '').trim();
      guest.observationComments = (seed && !NO_DIETARY_FILLERS.includes(seed.toLowerCase()))
        ? [{ text: seed, at: guest.confirmedAt || '', author: getGuestCommentAuthorName() }]
        : [];
    }
    return guest.observationComments;
  }

  function renderGuestComments(guest) {
    const listEl = document.getElementById('guest-drawer-comments-list');
    if (!listEl) return;
    const comments = getGuestComments(guest);
    if (!comments.length) {
      listEl.innerHTML = '<p class="guest-comment-empty">Nenhuma observação registrada ainda.</p>';
      return;
    }
    listEl.innerHTML = comments.map((c, i) => {
      const author = c.author || getGuestCommentAuthorName();
      return `
        <div class="guest-comment-item">
          <span class="guest-comment-avatar">${initialsFromName(author)}</span>
          <div class="guest-comment-content">
            <p class="guest-comment-author"><strong>${author.replace(/</g, '&lt;')}</strong></p>
            <div class="guest-comment-bubble">
              ${(c.text || '').replace(/</g, '&lt;')}
              <button type="button" class="guest-comment-delete" data-comment-index="${i}" title="Excluir comentário">×</button>
            </div>
            ${c.at ? `<p class="guest-comment-time">${c.at}</p>` : ''}
          </div>
        </div>
      `;
    }).reverse().join('');

    listEl.querySelectorAll('.guest-comment-delete').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.dataset.commentIndex, 10);
        comments.splice(idx, 1);
        renderGuestComments(guest);
      });
    });
  }

  function submitGuestComment() {
    const input = document.getElementById('guest-drawer-comment-input');
    if (!input || !activeDrawerGuestId) return;
    const text = input.value.trim();
    if (!text) return;
    const activeEvent = getActiveEvent();
    const guest = activeEvent.guests.find(g => g.id === activeDrawerGuestId);
    if (!guest) return;
    getGuestComments(guest).push({ text, at: formatCommentDate(new Date()), author: getGuestCommentAuthorName() });
    input.value = '';
    renderGuestComments(guest);
  }

  const guestCommentSubmitBtn = document.getElementById('guest-drawer-comment-submit');
  const guestCommentInput = document.getElementById('guest-drawer-comment-input');
  if (guestCommentSubmitBtn) guestCommentSubmitBtn.addEventListener('click', submitGuestComment);
  if (guestCommentInput) {
    guestCommentInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submitGuestComment(); }
    });
  }

  // ==========================================
  // RESTRIÇÕES ALIMENTARES (drawer de adicionar/editar convidado)
  // ==========================================
  /**
   * @typedef {'NONE' | 'VEGETARIAN' | 'VEGAN' | 'GLUTEN_FREE' | 'LACTOSE_FREE' | 'ALLERGY' | 'OTHER'} TipoDeRestricao
   * @typedef {{ restrictionType: TipoDeRestricao, details?: string }} RestricaoAlimentar
   */
  /**
   * Opções com a cor da bolinha (cor = bolinha; fundo = assento no Mapa do evento).
   * @type {{ valor: TipoDeRestricao, rotulo: string, cor?: string, fundo?: string }[]}
   */
  const OPCOES_DE_RESTRICAO = [
    { valor: 'NONE', rotulo: 'Sem restrições alimentares' },
    { valor: 'VEGETARIAN', rotulo: 'Vegetariano', cor: '#86EFAC', fundo: '#DCFCE7' },
    { valor: 'VEGAN', rotulo: 'Vegano', cor: '#F9A8D4', fundo: '#FCE7F3' },
    { valor: 'GLUTEN_FREE', rotulo: 'Sem glúten', cor: '#D2B48C', fundo: '#F3E8DA' },
    { valor: 'LACTOSE_FREE', rotulo: 'Sem lactose', cor: '#93C5FD', fundo: '#DBEAFE' },
    { valor: 'ALLERGY', rotulo: 'Possui alergia alimentar', cor: '#FCA5A5', fundo: '#FEE2E2' },
    { valor: 'OTHER', rotulo: 'Outra restrição' }
  ];
  /** Campo de detalhe que aparece em "Possui alergia" e "Outra restrição". */
  const DETALHE_DA_RESTRICAO = {
    ALLERGY: { rotulo: 'Qual é a alergia?', placeholder: 'Ex: camarão, amendoim, ovo, nozes...' },
    OTHER: { rotulo: 'Descreva a restrição', placeholder: 'Ex: Kosher, Halal, diabético...' }
  };

  /** Opção (com cor) de uma restrição salva; null quando não tem bolinha. @param {any} r */
  function opcaoComCor(r) {
    const o = r && OPCOES_DE_RESTRICAO.find(x => x.valor === r.restrictionType);
    return o && o.cor ? o : null;
  }

  /** Bolinha colorida (com a dica do nome) para a lista de convidados. @param {any} r */
  function bolinhaDaRestricaoHtml(r) {
    const o = opcaoComCor(r);
    if (!o) return '';
    const nome = r.restrictionType === 'ALLERGY' && r.details ? `Alergia: ${r.details}` : o.rotulo;
    return `<span class="restricao-bolinha" style="--cor:${o.cor}" data-dica="${escaparHtml(nome)}" aria-label="${escaparHtml(nome)}" role="img"></span>`;
  }

  // Fecha qualquer lista de restrição aberta ao clicar fora.
  document.addEventListener('click', (e) => {
    document.querySelectorAll('.restricao-select.is-aberto').forEach(s => {
      if (!(e.target instanceof Node && s.contains(e.target))) s.dispatchEvent(new CustomEvent('restricao-fechar'));
    });
  });

  let contadorDeRestricao = 0;
  /**
   * Seletor de restrição alimentar: lista própria com a bolinha de cor de cada
   * opção + campo de detalhe condicional (abre/fecha com animação). Nas
   * outras opções o detalhe some e é apagado.
   * @param {HTMLElement} raiz  onde o componente é montado
   * @param {{ valor?: RestricaoAlimentar|null, rotulo?: string, onChange?: (data: RestricaoAlimentar) => void }} [opcoes]
   */
  function DietaryRestrictionSelect(raiz, opcoes = {}) {
    const id = `restricao-${++contadorDeRestricao}`;
    const seta = '<svg class="restricao-seta" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>';
    raiz.innerHTML = `
      <p class="block text-xs font-bold text-zinc-700 mb-1.5" id="${id}-rotulo">${escaparHtml(opcoes.rotulo || 'Restrições alimentares')}</p>
      <div class="restricao-select">
        <button type="button" class="field-input restricao-botao" id="${id}-botao" aria-haspopup="listbox" aria-expanded="false" aria-labelledby="${id}-rotulo ${id}-botao">
          <span class="restricao-bolinha"></span><span class="restricao-texto"></span>${seta}
        </button>
        <ul class="restricao-lista" role="listbox" aria-labelledby="${id}-rotulo" tabindex="-1">
          ${OPCOES_DE_RESTRICAO.map(o => `<li role="option" tabindex="-1" data-valor="${o.valor}"><span class="restricao-bolinha"${o.cor ? ` style="--cor:${o.cor}"` : ''}></span><span>${o.rotulo}</span></li>`).join('')}
        </ul>
      </div>
      <div class="restricao-detalhe" aria-hidden="true">
        <div class="restricao-detalhe-dentro">
          <label for="${id}-detalhe" class="block text-xs font-bold text-zinc-700 mb-1.5 mt-3"></label>
          <input type="text" id="${id}-detalhe" class="field-input" autocomplete="off">
          <p class="text-[11px] text-rose-600 mt-1 hidden" id="${id}-erro">Preencha este campo.</p>
        </div>
      </div>`;
    const caixaSelect = /** @type {HTMLElement} */ (raiz.querySelector('.restricao-select'));
    const botao = /** @type {HTMLButtonElement} */ (raiz.querySelector('.restricao-botao'));
    const lista = /** @type {HTMLElement} */ (raiz.querySelector('.restricao-lista'));
    const itens = /** @type {HTMLElement[]} */ (Array.from(lista.querySelectorAll('li')));
    const caixa = /** @type {HTMLElement} */ (raiz.querySelector('.restricao-detalhe'));
    const rotulo = /** @type {HTMLLabelElement} */ (raiz.querySelector(`label[for="${id}-detalhe"]`));
    const detalhe = /** @type {HTMLInputElement} */ (raiz.querySelector(`#${id}-detalhe`));
    const erro = /** @type {HTMLElement} */ (raiz.querySelector(`#${id}-erro`));
    /** @type {TipoDeRestricao} */
    let tipo = 'NONE';

    /** @returns {RestricaoAlimentar} */
    const valorAtual = () => (tipo in DETALHE_DA_RESTRICAO ? { restrictionType: tipo, details: detalhe.value.trim() } : { restrictionType: tipo });
    const mostrarTipo = () => {
      const o = OPCOES_DE_RESTRICAO.find(x => x.valor === tipo) || OPCOES_DE_RESTRICAO[0];
      const bolinha = /** @type {HTMLElement} */ (botao.querySelector('.restricao-bolinha'));
      bolinha.style.setProperty('--cor', o.cor || 'transparent');
      bolinha.classList.toggle('is-vazia', !o.cor);
      /** @type {HTMLElement} */ (botao.querySelector('.restricao-texto')).textContent = o.rotulo;
      itens.forEach(li => li.setAttribute('aria-selected', String(li.dataset.valor === tipo)));
      const config = DETALHE_DA_RESTRICAO[/** @type {'ALLERGY'|'OTHER'} */ (tipo)];
      if (config) {
        rotulo.textContent = config.rotulo;
        detalhe.placeholder = config.placeholder;
        detalhe.required = true;
        caixa.classList.add('is-aberto');
        caixa.setAttribute('aria-hidden', 'false');
      } else {
        detalhe.required = false;
        detalhe.value = '';
        erro.classList.add('hidden');
        caixa.classList.remove('is-aberto');
        caixa.setAttribute('aria-hidden', 'true');
      }
    };
    const abrir = (/** @type {boolean} */ sim) => {
      caixaSelect.classList.toggle('is-aberto', sim);
      botao.setAttribute('aria-expanded', String(sim));
      if (sim) (itens.find(li => li.dataset.valor === tipo) || itens[0]).focus();
    };
    const escolher = (/** @type {string} */ valor) => {
      tipo = /** @type {TipoDeRestricao} */ (valor);
      mostrarTipo();
      abrir(false);
      botao.focus();
      if (detalhe.required) setTimeout(() => detalhe.focus(), 150);
      opcoes.onChange?.(valorAtual());
    };
    caixaSelect.addEventListener('restricao-fechar', () => abrir(false));
    botao.addEventListener('click', () => abrir(!caixaSelect.classList.contains('is-aberto')));
    botao.addEventListener('keydown', (e) => {
      if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(e.key)) { e.preventDefault(); abrir(true); }
    });
    itens.forEach((li, i) => {
      li.addEventListener('click', () => escolher(li.dataset.valor || 'NONE'));
      li.addEventListener('keydown', (e) => {
        e.stopPropagation();
        if (e.key === 'ArrowDown') { e.preventDefault(); (itens[i + 1] || li).focus(); }
        else if (e.key === 'ArrowUp') { e.preventDefault(); (itens[i - 1] || li).focus(); }
        else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); escolher(li.dataset.valor || 'NONE'); }
        else if (e.key === 'Escape') { e.preventDefault(); abrir(false); botao.focus(); }
        else if (e.key === 'Tab') abrir(false);
      });
    });
    detalhe.addEventListener('input', () => {
      if (detalhe.value.trim()) erro.classList.add('hidden');
      opcoes.onChange?.(valorAtual());
    });

    const definir = (/** @type {RestricaoAlimentar|null|undefined} */ v) => {
      tipo = v && OPCOES_DE_RESTRICAO.some(o => o.valor === v.restrictionType) ? v.restrictionType : 'NONE';
      mostrarTipo();
      detalhe.value = (v && tipo in DETALHE_DA_RESTRICAO && v.details) || '';
      erro.classList.add('hidden');
    };
    definir(opcoes.valor);

    return {
      valor: valorAtual,
      definir,
      /** Obrigatório: com alergia/outra, o detalhe precisa estar preenchido. */
      validar() {
        if (detalhe.required && !detalhe.value.trim()) {
          erro.classList.remove('hidden');
          detalhe.focus();
          return false;
        }
        erro.classList.add('hidden');
        return true;
      }
    };
  }

  /** Texto legível da restrição (vai em dietaryRestrictions, usado em listas/exportações). @param {RestricaoAlimentar} r */
  function textoDaRestricao(r) {
    if (!r || r.restrictionType === 'NONE') return '';
    const rotuloDaOpcao = (OPCOES_DE_RESTRICAO.find(o => o.valor === r.restrictionType) || { rotulo: '' }).rotulo;
    if (r.restrictionType === 'ALLERGY') return `Alergia: ${r.details || ''}`.trim();
    if (r.restrictionType === 'OTHER') return r.details || rotuloDaOpcao;
    return rotuloDaOpcao;
  }

  /**
   * Restrição de quem está num assento do Mapa do evento (convidado ou
   * acompanhante), pelo nome com que aparece na planta.
   * @param {string} nomeNoAssento
   */
  function restricaoDoAssento(nomeNoAssento) {
    const ev = getActiveEvent();
    const alvo = String(nomeNoAssento || '').trim().toLowerCase();
    if (!ev || !alvo) return null;
    for (const g of ev.guests || []) {
      if ((g.name || '').trim().toLowerCase() === alvo) return g.restricaoAlimentar || null;
      const primeiro = (g.name || '').trim().split(/\s+/)[0];
      const nomes = g.companionsNames || [];
      for (let i = 0; i < nomes.length; i++) {
        const limpo = (nomes[i] || '').replace(/\s*\([^)]*\)\s*$/, '').trim();
        const nomeNaPlanta = !limpo || limpo.toLowerCase() === 'acompanhante' ? `Acompanhante de ${primeiro}` : limpo;
        if (nomeNaPlanta.toLowerCase() === alvo) return (g.companionsDetailed && g.companionsDetailed[i] && g.companionsDetailed[i].restricaoAlimentar) || null;
      }
    }
    return null;
  }

  const raizDaRestricao = document.getElementById('guest-restricao-alimentar');
  const restricaoDoConvidado = raizDaRestricao ? DietaryRestrictionSelect(raizDaRestricao) : null;
  /** Restrição de cada linha de acompanhante do drawer. @type {WeakMap<HTMLElement, ReturnType<typeof DietaryRestrictionSelect>>} */
  const restricaoDoAcompanhante = new WeakMap();

  // guestId: null = novo convidado; caso contrário abre já preenchido para edição.
  function openAddGuestDrawer(guestId = null) {
    const drawer = document.getElementById('drawer-add-guest');
    const backdrop = document.getElementById('add-guest-drawer-backdrop');
    if (!drawer || !backdrop) return;

    const activeEvent = getActiveEvent();
    const form = document.getElementById('form-add-guest');
    const titleEl = document.getElementById('add-guest-drawer-title');
    const companionsList = document.getElementById('guest-companions-list');
    if (form) form.reset();
    if (companionsList) companionsList.innerHTML = '';
    document.getElementById('guest-name-error')?.classList.add('hidden');
    document.getElementById('guest-phone-error')?.classList.add('hidden');

    let guest;
    if (guestId) {
      guest = activeEvent.guests.find(g => g.id === guestId);
      if (!guest) return;
      isNewGuestDraft = false;
    } else {
      guest = {
        id: `g-${Date.now()}`,
        name: '',
        email: '',
        companions: 0,
        companionsNames: [],
        companionsDetailed: [],
        adults: 1,
        children: 0,
        phone: '',
        table: 'Mesa a Definir',
        status: 'pending',
        giftsBought: [],
        dietaryRestrictions: '',
        observationComments: [],
        relationshipTitle: 'Convidado',
        relationshipHost: ''
      };
      activeEvent.guests.unshift(guest);
      isNewGuestDraft = true;
    }

    activeDrawerGuestId = guest.id;
    if (titleEl) titleEl.textContent = guestId ? 'Editar Convidado' : 'Adicionar Convidado';
    const saveBtn = document.getElementById('btn-save-guest');
    if (saveBtn) saveBtn.textContent = guestId ? 'Salvar alterações' : 'Salvar convidado';
    document.getElementById('guest-name-input').value = guest.name || '';
    document.getElementById('guest-phone-input').value = guest.phone || '';
    document.getElementById('guest-email-input').value = guest.email || '';

    // "Convidado de quem?" — um item por anfitrião de verdade, do perfil do
    // cliente (pode ter mais de dois, então sem opção fixa de "Ambos").
    const titleHostSelect = document.getElementById('guest-title-host-input');
    if (titleHostSelect) {
      const hostNames = getClienteHostNames();
      titleHostSelect.innerHTML = '<option value="">—</option>' +
        hostNames.map(name => `<option value="${name}">${name}</option>`).join('');
      titleHostSelect.value = guest.relationshipHost || '';
    }
    const titleSelect = document.getElementById('guest-title-input');
    if (titleSelect) titleSelect.value = guest.relationshipTitle || 'Convidado';

    const companionsDetailed = (guest.companionsDetailed && guest.companionsDetailed.length)
      ? guest.companionsDetailed
      : (guest.companionsNames || []).map(name => ({ name, ageGroup: 'adult' }));
    companionsDetailed.forEach(c => addCompanionRow(c));

    restricaoDoConvidado?.definir(guest.restricaoAlimentar || null);

    const removeWrap = document.getElementById('guest-remove-wrap');
    if (removeWrap) removeWrap.hidden = !guestId;
    document.getElementById('btn-remove-guest')?.classList.remove('hidden');
    document.getElementById('guest-remove-confirm')?.classList.add('hidden');
    document.querySelector('.guest-drawer-rodape')?.classList.remove('is-confirmando');

    backdrop.classList.remove('hidden');
    backdrop.style.setProperty('display', 'block', 'important');
    backdrop.classList.add('open');
    drawer.classList.remove('hidden');
    drawer.style.setProperty('display', 'flex', 'important');
    drawer.classList.add('open');
  }

  function closeAddGuestDrawer() {
    const drawer = document.getElementById('drawer-add-guest');
    const backdrop = document.getElementById('add-guest-drawer-backdrop');
    if (drawer) {
      drawer.classList.remove('open');
      drawer.style.setProperty('display', 'none', 'important');
      drawer.classList.add('hidden');
    }
    if (backdrop) {
      backdrop.classList.remove('open');
      backdrop.style.setProperty('display', 'none', 'important');
      backdrop.classList.add('hidden');
    }

    // Rascunho de convidado novo abandonado sem nome — descarta em vez de deixar um convidado vazio na lista.
    if (isNewGuestDraft) {
      const activeEvent = getActiveEvent();
      const idx = activeEvent.guests.findIndex(g => g.id === activeDrawerGuestId);
      if (idx !== -1 && !activeEvent.guests[idx].name.trim()) {
        activeEvent.guests.splice(idx, 1);
      }
    }
    isNewGuestDraft = false;
    activeDrawerGuestId = null;
  }

  const btnHostAddGuest = document.getElementById('btn-host-add-guest');
  if (btnHostAddGuest) btnHostAddGuest.addEventListener('click', () => openAddGuestDrawer());
  // Mapear mesas › "+ Adicionar" ao lado de Convidados: o mesmo drawer.
  document.getElementById('btn-floorplan-add-guest')?.addEventListener('click', () => openAddGuestDrawer());
  const btnCloseAddGuestDrawer = document.getElementById('btn-close-add-guest-drawer');
  const addGuestDrawerBackdrop = document.getElementById('add-guest-drawer-backdrop');
  if (btnCloseAddGuestDrawer) btnCloseAddGuestDrawer.addEventListener('click', closeAddGuestDrawer);
  if (addGuestDrawerBackdrop) addGuestDrawerBackdrop.addEventListener('click', closeAddGuestDrawer);

  const guestPhoneInput = document.getElementById('guest-phone-input');
  if (guestPhoneInput) {
    guestPhoneInput.addEventListener('input', (e) => {
      e.target.value = maskBrazilPhone(e.target.value);
    });
  }

  // Remover convidado (drawer): o botão vira "Tem certeza? Sim / Não" no
  // mesmo lugar; só o Sim remove.
  const btnRemoveGuest = document.getElementById('btn-remove-guest');
  const guestRemoveConfirm = document.getElementById('guest-remove-confirm');
  const btnRemoveGuestSim = document.getElementById('btn-remove-guest-sim');
  const btnRemoveGuestNao = document.getElementById('btn-remove-guest-nao');
  if (btnRemoveGuest && guestRemoveConfirm) {
    const rodapeDoDrawer = btnRemoveGuest.closest('.guest-drawer-rodape');
    btnRemoveGuest.addEventListener('click', () => {
      if (!activeDrawerGuestId) return;
      rodapeDoDrawer?.classList.add('is-confirmando');
      guestRemoveConfirm.classList.remove('hidden');
      btnRemoveGuestSim?.focus();
    });
    btnRemoveGuestNao?.addEventListener('click', () => {
      guestRemoveConfirm.classList.add('hidden');
      rodapeDoDrawer?.classList.remove('is-confirmando');
    });
    btnRemoveGuestSim?.addEventListener('click', async () => {
      if (!activeDrawerGuestId || btnRemoveGuestSim.disabled) return;
      const activeEvent = getActiveEvent();
      const idx = activeEvent.guests.findIndex(g => g.id === activeDrawerGuestId);
      if (idx === -1) return;
      const name = activeEvent.guests[idx].name;
      btnRemoveGuestSim.disabled = true;
      btnRemoveGuestSim.textContent = 'Removendo…';
      const { error } = await excluirConvidadoNoBanco(activeDrawerGuestId).catch(err => ({ error: err }));
      btnRemoveGuestSim.disabled = false;
      btnRemoveGuestSim.textContent = 'Sim';
      if (error) {
        guestRemoveConfirm.querySelector('span').textContent = 'Não foi possível remover. Tentar de novo?';
        return;
      }
      guestRemoveConfirm.querySelector('span').textContent = 'Remover este convidado?';
      guestRemoveConfirm.classList.add('hidden');
      rodapeDoDrawer?.classList.remove('is-confirmando');
      const idxAtual = activeEvent.guests.findIndex(g => g.id === activeDrawerGuestId);
      if (idxAtual !== -1) activeEvent.guests.splice(idxAtual, 1);
      convidadosSelecionados.delete(activeDrawerGuestId);
      isNewGuestDraft = false;
      closeAddGuestDrawer();
      renderGuestsTable();
      renderFloorPlanGuestCards();
      updateAllCelebrationData();
      showToast(`Convidado ${name} removido da lista.`, '🗑️');
    });
  }

  const btnAddCompanionRow = document.getElementById('btn-add-companion-row');
  if (btnAddCompanionRow) btnAddCompanionRow.addEventListener('click', () => addCompanionRow());

  // Listener para Busca de Convidado em Tempo Real
  const inputRsvpSearch = document.getElementById('rsvp-search-input');
  if (inputRsvpSearch) {
    inputRsvpSearch.addEventListener('input', (e) => {
      rsvpCurrentPage = 1;
      renderGuestsTable(currentRsvpFilter, e.target.value);
    });
  }

  // Paginação: tamanho de página + navegação
  const rsvpPageSizeSelect = document.getElementById('rsvp-page-size-select');
  if (rsvpPageSizeSelect) {
    rsvpPageSizeSelect.addEventListener('change', () => {
      rsvpPageSize = parseInt(rsvpPageSizeSelect.value) || 15;
      rsvpCurrentPage = 1;
      renderGuestsTable(currentRsvpFilter, inputRsvpSearch ? inputRsvpSearch.value : '');
    });
  }
  const rsvpPagePrevBtn = document.getElementById('rsvp-page-prev');
  const rsvpPageNextBtn = document.getElementById('rsvp-page-next');
  if (rsvpPagePrevBtn) {
    rsvpPagePrevBtn.addEventListener('click', () => {
      if (rsvpCurrentPage <= 1) return;
      rsvpCurrentPage -= 1;
      renderGuestsTable(currentRsvpFilter, inputRsvpSearch ? inputRsvpSearch.value : '');
    });
  }
  if (rsvpPageNextBtn) {
    rsvpPageNextBtn.addEventListener('click', () => {
      rsvpCurrentPage += 1;
      renderGuestsTable(currentRsvpFilter, inputRsvpSearch ? inputRsvpSearch.value : '');
    });
  }

  // Dropdown de Status de Convidados (Todos, Confirmados, Recusados, Pendentes)
  const btnRsvpStatus = document.getElementById('btn-rsvp-status-dropdown');
  const rsvpStatusMenu = document.getElementById('rsvp-status-menu');
  const rsvpStatusChevron = document.getElementById('rsvp-status-chevron');

  if (btnRsvpStatus && rsvpStatusMenu) {
    btnRsvpStatus.addEventListener('click', (e) => {
      e.stopPropagation();
      const isHidden = rsvpStatusMenu.classList.contains('hidden');
      rsvpStatusMenu.classList.toggle('hidden', !isHidden);
      if (rsvpStatusChevron) rsvpStatusChevron.style.transform = isHidden ? 'rotate(180deg)' : 'rotate(0deg)';
    });

    document.addEventListener('click', (e) => {
      if (!rsvpStatusMenu.contains(e.target) && !btnRsvpStatus.contains(e.target)) {
        rsvpStatusMenu.classList.add('hidden');
        if (rsvpStatusChevron) rsvpStatusChevron.style.transform = 'rotate(0deg)';
      }
    });
  }

  document.querySelectorAll('.rsvp-status-option').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const filter = btn.getAttribute('data-filter') || 'all';
      const searchVal = inputRsvpSearch ? inputRsvpSearch.value : '';
      rsvpCurrentPage = 1;
      renderGuestsTable(filter, searchVal);
      if (rsvpStatusMenu) rsvpStatusMenu.classList.add('hidden');
      if (rsvpStatusChevron) rsvpStatusChevron.style.transform = 'rotate(0deg)';
    });
  });

  // =========================================================================
  // COMPONENTE UNIVERSAL DE ABAS DE NAVEGAÇÃO (TABS)
  // Reutilizável em qualquer seção da plataforma (links ou botões)
  // =========================================================================
  window.initLoveTabs = function(containerSelector, onTabChange) {
    const containers = typeof containerSelector === 'string' 
      ? document.querySelectorAll(containerSelector) 
      : [containerSelector];

    containers.forEach(container => {
      if (!container) return;
      const tabs = container.querySelectorAll('.love-tab-item');
      tabs.forEach(tab => {
        tab.addEventListener('click', (e) => {
          e.preventDefault();
          tabs.forEach(t => t.classList.remove('active'));
          tab.classList.add('active');
          const tabId = tab.getAttribute('data-tab') || tab.getAttribute('data-filter') || tab.textContent.trim();
          if (typeof onTabChange === 'function') {
            onTabChange(tabId, tab);
          }
        });
      });
    });
  };

  // ==========================================
  // 7.2. ORGANIZAR MESAS DOS CONVIDADOS
  // ==========================================
  let activeTableSectorFilter = 'all';
  let activeTableSearchQuery = '';
  let targetTableForAssignment = null;

  function getEventTables() {
    const activeEvent = getActiveEvent();
    const eventId = (activeEvent && activeEvent.id) || 'default';
    const stored = localStorage.getItem(`love_tables_${eventId}`);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (e) {}
    }
    const defaultTables = [
      { id: 'tbl-1', name: 'Mesa 01 - Noivos e Pais', sector: 'Salão Principal', capacity: 8, notes: 'Mesa de honra central' },
      { id: 'tbl-2', name: 'Mesa 02 - Padrinhos Noiva', sector: 'Salão Principal', capacity: 10, notes: 'Próxima ao palco' },
      { id: 'tbl-3', name: 'Mesa 03 - Padrinhos Noivo', sector: 'Salão Principal', capacity: 10, notes: 'Próxima ao bar' },
      { id: 'tbl-4', name: 'Mesa 04 (Família)', sector: 'Salão Principal', capacity: 10, notes: 'Família paterna e materna' },
      { id: 'tbl-5', name: 'Mesa 05 - Família Paterna', sector: 'Área Externa', capacity: 8, notes: 'Jardim coberto' },
      { id: 'tbl-6', name: 'Mesa 06 - Primos e Jovens', sector: 'Área Externa', capacity: 10, notes: 'Ambiente descontraído' },
      { id: 'tbl-7', name: 'Mesa 07 - Colegas de Trabalho', sector: 'Mezanino', capacity: 8, notes: 'Vista panorâmica' },
      { id: 'tbl-8', name: 'Mesa 08 (Amigos Faculdade)', sector: 'Salão Principal', capacity: 10, notes: 'Próxima à pista' }
    ];
    localStorage.setItem(`love_tables_${eventId}`, JSON.stringify(defaultTables));
    return defaultTables;
  }

  function saveEventTables(tables) {
    const activeEvent = getActiveEvent();
    const eventId = (activeEvent && activeEvent.id) || 'default';
    localStorage.setItem(`love_tables_${eventId}`, JSON.stringify(tables));
  }

  function renderTablesOrganization() {
    const container = document.getElementById('tables-grid-container');
    if (!container) return;

    const tables = getEventTables();
    const activeEvent = getActiveEvent();
    const guests = (activeEvent && activeEvent.guests) || [];

    // Calcular KPIs
    let totalCapacity = 0;
    let totalOccupied = 0;
    
    // Mapear convidados por mesa
    const guestsByTable = {};
    tables.forEach(t => {
      guestsByTable[t.id] = [];
      totalCapacity += (parseInt(t.capacity) || 0);
    });

    let unassignedCount = 0;

    guests.forEach(g => {
      const gSeats = 1 + (parseInt(g.companions) || 0);
      let assignedTable = null;

      if (g.table && g.table !== 'Mesa a Definir' && g.table.trim() !== '') {
        assignedTable = tables.find(t => 
          t.name.trim().toLowerCase() === g.table.trim().toLowerCase() ||
          t.id === g.table
        );
      }

      if (assignedTable) {
        guestsByTable[assignedTable.id].push(g);
        totalOccupied += gSeats;
      } else {
        unassignedCount += gSeats;
      }
    });

    // Atualizar indicadores numéricos
    const statTotal = document.getElementById('tables-stat-total');
    const statCap = document.getElementById('tables-stat-capacity');
    const statOcc = document.getElementById('tables-stat-occupied');
    const statOccRate = document.getElementById('tables-stat-occupancy-rate');
    const statUnassigned = document.getElementById('tables-stat-unassigned');
    const countAll = document.getElementById('tables-count-all');

    if (statTotal) statTotal.textContent = tables.length;
    if (statCap) statCap.textContent = totalCapacity;
    if (statOcc) statOcc.textContent = totalOccupied;
    if (statOccRate) {
      const pct = totalCapacity > 0 ? Math.round((totalOccupied / totalCapacity) * 100) : 0;
      statOccRate.textContent = `(${pct}%)`;
    }
    if (statUnassigned) statUnassigned.textContent = unassignedCount;
    if (countAll) countAll.textContent = tables.length;

    // Filtragem por setor e busca
    const filteredTables = tables.filter(tbl => {
      if (activeTableSectorFilter !== 'all' && tbl.sector !== activeTableSectorFilter) {
        return false;
      }
      if (activeTableSearchQuery) {
        const q = activeTableSearchQuery.toLowerCase();
        const matchesName = tbl.name.toLowerCase().includes(q);
        const matchesSector = tbl.sector.toLowerCase().includes(q);
        const tblGuests = guestsByTable[tbl.id] || [];
        const matchesGuest = tblGuests.some(g => g.name.toLowerCase().includes(q));
        return matchesName || matchesSector || matchesGuest;
      }
      return true;
    });

    container.innerHTML = '';

    if (filteredTables.length === 0) {
      container.innerHTML = `
        <div class="col-span-full py-16 px-6 text-center bg-white rounded-[var(--radius-card,10px)] border border-zinc-200/80 space-y-3 shadow-xs">
          <div class="w-12 h-12 mx-auto rounded-full bg-zinc-100 flex items-center justify-center text-zinc-400">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24"><rect width="18" height="12" x="3" y="4" rx="2"/><circle cx="8" cy="18" r="1.5"/><circle cx="16" cy="18" r="1.5"/><path stroke-linecap="round" stroke-linejoin="round" d="M12 4v12"/></svg>
          </div>
          <h4 class="text-sm font-bold text-zinc-900 font-sans">Nenhuma mesa encontrada</h4>
          <p class="text-xs text-zinc-500 max-w-sm mx-auto font-sans">Não encontramos mesas com o filtro ou busca selecionados. Você pode cadastrar uma nova mesa a qualquer momento.</p>
        </div>
      `;
      return;
    }

    filteredTables.forEach(tbl => {
      const tblGuests = guestsByTable[tbl.id] || [];
      const occPlaces = tblGuests.reduce((acc, g) => acc + 1 + (parseInt(g.companions) || 0), 0);
      const cap = parseInt(tbl.capacity) || 8;
      const pct = Math.min(100, Math.round((occPlaces / cap) * 100));
      const isFull = occPlaces >= cap;

      const card = document.createElement('div');
      card.className = 'bg-white rounded-[var(--radius-card,10px)] border border-zinc-200/80 p-5 shadow-xs flex flex-col justify-between space-y-4 hover:shadow-md transition-shadow font-sans';
      
      // Lista de convidados acomodados
      let guestsListMarkup = '';
      if (tblGuests.length === 0) {
        guestsListMarkup = `
          <div class="py-6 text-center text-zinc-400 text-xs italic font-sans">
            Nenhum convidado acomodado ainda.
          </div>
        `;
      } else {
        guestsListMarkup = `
          <div class="space-y-2 max-h-48 overflow-y-auto pr-1 divide-y divide-zinc-100">
            ${tblGuests.map(g => {
              const compCount = parseInt(g.companions) || 0;
              const seats = 1 + compCount;
              return `
                <div class="pt-2 first:pt-0 flex items-center justify-between gap-2 group">
                  <div class="flex items-center gap-2.5 min-w-0">
                    <div class="w-7 h-7 rounded-full bg-[#537bae]/10 text-[#537bae] flex items-center justify-center font-bold text-xs flex-shrink-0">
                      ${g.name.charAt(0).toUpperCase()}
                    </div>
                    <div class="min-w-0">
                      <p class="text-xs font-semibold text-zinc-900 truncate font-sans">${g.name}</p>
                      <span class="text-[10px] text-zinc-400 font-sans block">${seats} ${seats === 1 ? 'lugar' : 'lugares'} ${compCount > 0 ? `(+${compCount} acomp.)` : ''}</span>
                    </div>
                  </div>
                  <button type="button" class="btn-remove-guest-table text-zinc-400 hover:text-rose-600 p-1 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer" data-guest-id="${g.id}" title="Desocupar lugar">
                    <svg class="w-3.5 h-3.5 pointer-events-none" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
                  </button>
                </div>
              `;
            }).join('')}
          </div>
        `;
      }

      card.innerHTML = `
        <div class="space-y-3.5">
          <!-- Header do Card da Mesa -->
          <div class="flex items-start justify-between gap-2">
            <div>
              <div class="flex items-center gap-2">
                <h3 class="font-bold text-zinc-900 text-sm sm:text-base leading-tight font-sans">${tbl.name}</h3>
              </div>
              <span class="inline-block mt-1 text-[11px] font-semibold text-zinc-500 bg-zinc-100 px-2 py-0.5 rounded-md font-sans">
                ${tbl.sector}
              </span>
            </div>
            <button type="button" class="btn-delete-table p-1.5 text-zinc-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer" data-table-id="${tbl.id}" title="Excluir mesa">
              <svg stroke-linejoin="round" stroke-linecap="round" class="w-4 h-4 pointer-events-none" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M4 6.5h16"/><path stroke-linecap="round" stroke-linejoin="round" d="M9 6.5V4.5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/><path stroke-linecap="round" stroke-linejoin="round" d="M6.5 9.5V18a3 3 0 0 0 3 3h5a3 3 0 0 0 3-3V9.5"/><path stroke-linecap="round" stroke-linejoin="round" d="M10.5 11v5.5M13.5 11v5.5"/></svg>
            </button>
          </div>

          <!-- Barra de Lotação com cor primária #537bae -->
          <div class="space-y-1.5">
            <div class="flex items-center justify-between text-xs font-sans">
              <span class="font-bold ${isFull ? 'text-rose-600' : 'text-zinc-700'}">${occPlaces} / ${cap} lugares</span>
              <span class="text-[11px] font-semibold text-zinc-500">${pct}% ocupada</span>
            </div>
            <div class="w-full bg-zinc-100 rounded-full h-2 overflow-hidden">
              <div class="h-full rounded-full transition-all duration-300" style="width: ${pct}%; background-color: ${isFull ? '#e11d48' : '#537bae'};"></div>
            </div>
          </div>

          <!-- Lista de Convidados -->
          <div class="pt-1">
            <span class="text-[10.5px] font-bold text-zinc-400 uppercase tracking-wider block mb-1.5 font-sans">Convidados Sentados</span>
            ${guestsListMarkup}
          </div>
        </div>

        <!-- Botão Acomodar Convidado com raio padronizado 12px -->
        <div class="pt-3 border-t border-zinc-100">
          <button type="button" class="btn-open-assign-guest w-full py-2.5 px-3 rounded-[var(--radius-control,12px)] border border-zinc-200 hover:border-[#537bae] text-zinc-700 hover:text-[#537bae] hover:bg-[#537bae]/5 text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 font-sans" data-table-id="${tbl.id}" data-table-name="${tbl.name}">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15"/></svg>
            <span>Acomodar Convidado</span>
          </button>
        </div>
      `;

      // Eventos dos botões do card
      const btnDelete = card.querySelector('.btn-delete-table');
      if (btnDelete) {
        btnDelete.addEventListener('click', () => {
          const updated = getEventTables().filter(t => t.id !== tbl.id);
          // Atualiza convidados que estavam nesta mesa
          guests.forEach(g => {
            if (g.table && (g.table.toLowerCase() === tbl.name.toLowerCase() || g.table === tbl.id)) {
              g.table = 'Mesa a Definir';
              gravarConvidadoEmSegundoPlano(g);
            }
          });
          saveEventTables(updated);
          renderTablesOrganization();
          showToast(`Mesa "${tbl.name}" removida.`, '🗑️');
        });
      }

      // Remover convidado da mesa
      card.querySelectorAll('.btn-remove-guest-table').forEach(btn => {
        btn.addEventListener('click', () => {
          const gId = btn.getAttribute('data-guest-id');
          const guest = guests.find(g => g.id === gId);
          if (guest) {
            guest.table = 'Mesa a Definir';
            gravarConvidadoEmSegundoPlano(guest);
            renderTablesOrganization();
            showToast(`${guest.name} retirado(a) da mesa.`, 'ℹ️');
          }
        });
      });

      // Abrir gaveta para acomodar convidado
      const btnAssign = card.querySelector('.btn-open-assign-guest');
      if (btnAssign) {
        btnAssign.addEventListener('click', () => {
          openAssignGuestDrawer(tbl);
        });
      }

      container.appendChild(card);
    });
  }

  // Gaveta: Acomodar Convidado na Mesa
  function openAssignGuestDrawer(table) {
    targetTableForAssignment = table;
    const drawer = document.getElementById('drawer-assign-table-guest');
    const backdrop = document.getElementById('assign-guest-modal-backdrop');
    const targetLabel = document.getElementById('assign-guest-table-target-name');
    const inputSearch = document.getElementById('assign-guest-filter-input');
    const container = document.getElementById('assign-guest-list-container');

    if (targetLabel) targetLabel.textContent = `Acomodar em: ${table.name} (${table.sector})`;
    if (inputSearch) inputSearch.value = '';

    const renderList = (filter = '') => {
      if (!container) return;
      container.innerHTML = '';
      const activeEvent = getActiveEvent();
      const guests = (activeEvent && activeEvent.guests) || [];

      const q = filter.toLowerCase();
      const availableGuests = guests.filter(g => {
        const matchesQuery = !q || g.name.toLowerCase().includes(q);
        return matchesQuery;
      });

      if (availableGuests.length === 0) {
        container.innerHTML = `
          <div class="py-12 text-center text-zinc-400 text-xs font-sans">
            Nenhum convidado encontrado.
          </div>
        `;
        return;
      }

      availableGuests.forEach(g => {
        const compCount = parseInt(g.companions) || 0;
        const seats = 1 + compCount;
        const isCurrentTable = g.table && (g.table.toLowerCase() === table.name.toLowerCase() || g.table === table.id);

        const row = document.createElement('div');
        row.className = 'p-3 rounded-xl border border-zinc-200 hover:border-[#537bae] hover:bg-zinc-50 flex items-center justify-between gap-3 transition-colors cursor-pointer font-sans';
        row.innerHTML = `
          <div class="flex items-center gap-3 min-w-0">
            <div class="w-8 h-8 rounded-full bg-[#537bae]/10 text-[#537bae] flex items-center justify-center font-bold text-xs flex-shrink-0">
              ${g.name.charAt(0).toUpperCase()}
            </div>
            <div class="min-w-0">
              <h4 class="text-xs sm:text-sm font-bold text-zinc-900 truncate font-sans">${g.name}</h4>
              <span class="text-[11px] text-zinc-400 font-sans block">${seats} ${seats === 1 ? 'lugar' : 'lugares'} ${compCount > 0 ? `(+${compCount} acomp.)` : ''} • Atual: ${g.table || 'Sem mesa'}</span>
            </div>
          </div>
          <button type="button" class="px-3 py-1.5 rounded-lg text-xs font-bold ${isCurrentTable ? 'bg-zinc-100 text-zinc-400 pointer-events-none' : 'bg-[#537bae] hover:bg-[#416799] text-white shadow-xs'} transition-all cursor-pointer font-sans flex-shrink-0">
            ${isCurrentTable ? 'Já nesta mesa' : 'Acomodar'}
          </button>
        `;

        if (!isCurrentTable) {
          row.addEventListener('click', () => {
            g.table = table.name;
            gravarConvidadoEmSegundoPlano(g);
            closeAssignGuestDrawer();
            renderTablesOrganization();
            showToast(`${g.name} acomodado(a) na ${table.name}!`, '🪑');
          });
        }

        container.appendChild(row);
      });
    };

    renderList('');

    if (inputSearch) {
      inputSearch.oninput = (e) => renderList(e.target.value);
    }

    if (backdrop) {
      backdrop.classList.remove('hidden');
      backdrop.style.setProperty('display', 'block', 'important');
      backdrop.classList.add('open');
    }
    if (drawer) {
      drawer.classList.remove('hidden');
      drawer.style.setProperty('display', 'flex', 'important');
      drawer.classList.add('open');
    }
  }

  function closeAssignGuestDrawer() {
    const drawer = document.getElementById('drawer-assign-table-guest');
    const backdrop = document.getElementById('assign-guest-modal-backdrop');
    if (drawer) {
      drawer.classList.remove('open');
      drawer.style.setProperty('display', 'none', 'important');
      drawer.classList.add('hidden');
    }
    if (backdrop) {
      backdrop.classList.remove('open');
      backdrop.style.setProperty('display', 'none', 'important');
      backdrop.classList.add('hidden');
    }
    targetTableForAssignment = null;
  }

  // Inicializador de Mesas e Gaveta de Adicionar Mesa
  function initTablesOrganization() {
    // Setor tabs
    const sectorNav = document.getElementById('tables-sectors-nav');
    if (sectorNav) {
      sectorNav.querySelectorAll('.love-tab-item').forEach(btn => {
        btn.addEventListener('click', () => {
          sectorNav.querySelectorAll('.love-tab-item').forEach(b => {
            b.classList.remove('active', 'font-bold');
            b.classList.add('font-medium');
          });
          btn.classList.add('active', 'font-bold');
          btn.classList.remove('font-medium');
          activeTableSectorFilter = btn.getAttribute('data-sector') || 'all';
          renderTablesOrganization();
        });
      });
    }

    // Busca de mesas
    const inputSearch = document.getElementById('tables-search-input');
    if (inputSearch) {
      inputSearch.addEventListener('input', (e) => {
        activeTableSearchQuery = e.target.value.trim();
        renderTablesOrganization();
      });
    }

    // Gaveta Adicionar Mesa (legado — o botão "Adicionar Mesa" agora cria a mesa
    // direto na planta, ver initFloorPlan/addFloorPlanTableViaButton)
    const btnCloseAdd = document.getElementById('btn-close-add-table-drawer');
    const drawerAdd = document.getElementById('drawer-add-table');
    const backdropAdd = document.getElementById('table-drawer-backdrop');
    const formAdd = document.getElementById('form-add-table');

    const openAddDrawer = () => {
      if (formAdd) formAdd.reset();
      if (backdropAdd) {
        backdropAdd.classList.remove('hidden');
        backdropAdd.style.setProperty('display', 'block', 'important');
        backdropAdd.classList.add('open');
      }
      if (drawerAdd) {
        drawerAdd.classList.remove('hidden');
        drawerAdd.style.setProperty('display', 'flex', 'important');
        drawerAdd.classList.add('open');
      }
    };

    const closeAddDrawer = () => {
      if (drawerAdd) {
        drawerAdd.classList.remove('open');
        drawerAdd.style.setProperty('display', 'none', 'important');
        drawerAdd.classList.add('hidden');
      }
      if (backdropAdd) {
        backdropAdd.classList.remove('open');
        backdropAdd.style.setProperty('display', 'none', 'important');
        backdropAdd.classList.add('hidden');
      }
    };

    if (btnCloseAdd) btnCloseAdd.addEventListener('click', closeAddDrawer);
    if (backdropAdd) backdropAdd.addEventListener('click', closeAddDrawer);

    if (formAdd) {
      formAdd.addEventListener('submit', (e) => {
        e.preventDefault();
        const name = document.getElementById('table-name-input').value.trim();
        const sector = document.getElementById('table-sector-select').value;
        const capacity = parseInt(document.getElementById('table-capacity-input').value) || 8;
        const notes = document.getElementById('table-notes-input').value.trim();

        if (!name) return;

        const tables = getEventTables();
        const newTable = {
          id: `tbl-${Date.now()}`,
          name: name,
          sector: sector,
          capacity: capacity,
          notes: notes
        };

        tables.push(newTable);
        saveEventTables(tables);
        closeAddDrawer();
        renderTablesOrganization();
        showToast(`Mesa "${name}" adicionada com sucesso!`, '🪑');
      });
    }

    // Gaveta Acomodar Convidado fechar
    const btnCloseAssign = document.getElementById('btn-close-assign-table-guest');
    const backdropAssign = document.getElementById('assign-guest-modal-backdrop');
    if (btnCloseAssign) btnCloseAssign.addEventListener('click', closeAssignGuestDrawer);
    if (backdropAssign) backdropAssign.addEventListener('click', closeAssignGuestDrawer);
  }

  // ==========================================
  // PLANTA DO SALÃO (Mapear mesas → painel "Lista de convidados" + espaço livre de drag-and-drop)
  // Mesmo padrão do construtor "Editar meu site": painel fixo à esquerda com a Mesa
  // arrastável e os cards de convidados; arraste "Mesa" para a planta e depois
  // arraste um convidado da lista até a mesa para acomodá-lo num assento.
  // ==========================================
  // Itens da planta além das mesas (Inserir item › Espaços). w/h = tamanho
  // base; svg = ícone do menu; planta = desenho em planta baixa (viewBox w x h).
  const ITENS_DA_PLANTA = [
    { type: 'buffet', label: 'Buffet', w: 200, h: 72, svg: '<path d="M4 23h24M6.5 23a9.5 9.5 0 0 1 19 0M16 13.5v-2.5M13.5 11h5M7 26.5h18"/>',
      planta: '<rect x="1" y="1" width="198" height="70" rx="4"/><circle cx="34" cy="36" r="11" class="l"/><circle cx="166" cy="36" r="11" class="l"/><svg x="76" y="12" width="48" height="48" viewBox="0 0 32 32" class="l"><path d="M4 23h24M6.5 23a9.5 9.5 0 0 1 19 0M16 13.5v-2.5M13.5 11h5M7 26.5h18"/></svg>' },
    { type: 'doces', label: 'Mesa de doces', w: 150, h: 72, svg: '<path d="M7 27v-9h18v9M5 27h22M7 21.5c2 1.5 4 1.5 6 0s4-1.5 6 0 4 1.5 6 0M10 18v-4h12v4M16 14v-3"/><path d="M16 5.5c1.1 1.3 1.1 2.4 0 3.3-1.1-.9-1.1-2-0-3.3Z"/>',
      planta: '<rect x="1" y="1" width="148" height="70" rx="4"/><circle cx="22" cy="22" r="6" class="l"/><circle cx="22" cy="50" r="6" class="l"/><circle cx="128" cy="22" r="6" class="l"/><circle cx="128" cy="50" r="6" class="l"/><svg x="51" y="12" width="48" height="48" viewBox="0 0 32 32" class="l"><path d="M7 27v-9h18v9M5 27h22M7 21.5c2 1.5 4 1.5 6 0s4-1.5 6 0 4 1.5 6 0M10 18v-4h12v4M16 14v-3"/><path d="M16 5.5c1.1 1.3 1.1 2.4 0 3.3-1.1-.9-1.1-2-0-3.3Z"/></svg>' },
    { type: 'cafe', label: 'Mesa de café', w: 130, h: 72, svg: '<path d="M8 13h13v5a6 6 0 0 1-6 6h-1a6 6 0 0 1-6-6Z"/><path d="M21 15h2a3 3 0 0 1 0 6h-2.5M11 6.5c0 1.5 1.5 1.5 1.5 3M15.5 6.5c0 1.5 1.5 1.5 1.5 3M6 27h17"/>',
      planta: '<rect x="1" y="1" width="128" height="70" rx="4"/><svg x="43" y="14" width="44" height="44" viewBox="0 0 32 32" class="l"><path d="M8 13h13v5a6 6 0 0 1-6 6h-1a6 6 0 0 1-6-6Z"/><path d="M21 15h2a3 3 0 0 1 0 6h-2.5M11 6.5c0 1.5 1.5 1.5 1.5 3M15.5 6.5c0 1.5 1.5 1.5 1.5 3M6 27h17"/></svg>' },
    { type: 'bar', label: 'Bar de drinks', w: 170, h: 90, svg: '<path d="M7 7h14l-7 9Z"/><path d="M14 16v9M10 25h8M21.5 10.5l4-4"/><circle cx="23.5" cy="9" r="1.5"/>',
      planta: '<rect x="1" y="1" width="168" height="52" rx="4"/><path d="M1 14h168" class="l"/><circle cx="35" cy="75" r="9"/><circle cx="85" cy="75" r="9"/><circle cx="135" cy="75" r="9"/><svg x="69" y="16" width="32" height="32" viewBox="0 0 32 32" class="l"><path d="M7 7h14l-7 9Z"/><path d="M14 16v9M10 25h8M21.5 10.5l4-4"/><circle cx="23.5" cy="9" r="1.5"/></svg>' },
    { type: 'pista', label: 'Pista de dança', w: 200, h: 200, svg: '<rect x="5" y="5" width="22" height="22" rx="1.5"/><path d="M5 12.3h22M5 19.7h22M12.3 5v22M19.7 5v22"/>',
      planta: '<rect x="1" y="1" width="198" height="198" rx="2"/><rect x="1" y="40.6" width="39.6" height="39.6" class="c"/><rect x="1" y="119.80000000000001" width="39.6" height="39.6" class="c"/><rect x="40.6" y="1" width="39.6" height="39.6" class="c"/><rect x="40.6" y="80.2" width="39.6" height="39.6" class="c"/><rect x="40.6" y="159.4" width="39.6" height="39.6" class="c"/><rect x="80.2" y="40.6" width="39.6" height="39.6" class="c"/><rect x="80.2" y="119.80000000000001" width="39.6" height="39.6" class="c"/><rect x="119.80000000000001" y="1" width="39.6" height="39.6" class="c"/><rect x="119.80000000000001" y="80.2" width="39.6" height="39.6" class="c"/><rect x="119.80000000000001" y="159.4" width="39.6" height="39.6" class="c"/><rect x="159.4" y="40.6" width="39.6" height="39.6" class="c"/><rect x="159.4" y="119.80000000000001" width="39.6" height="39.6" class="c"/><rect x="1" y="1" width="198" height="198" rx="2" class="l"/>' },
    { type: 'palco', label: 'Palco', w: 240, h: 110, svg: '<path d="M4 5h24M7 5c0 6 1.5 10.5 4.5 13.5M25 5c0 6-1.5 10.5-4.5 13.5M3 22h26v4.5H3Z"/><circle cx="16" cy="10.5" r="2"/><path d="M16 12.5v6"/>',
      planta: '<rect x="12" y="92" width="216" height="17" rx="2"/><rect x="1" y="1" width="238" height="94" rx="4"/><rect x="12" y="12" width="24" height="24" rx="2"/><circle cx="24" cy="24" r="6.5" class="l"/><rect x="204" y="12" width="24" height="24" rx="2"/><circle cx="216" cy="24" r="6.5" class="l"/><rect x="80" y="14" width="80" height="36" rx="3"/><circle cx="99" cy="32" r="11" class="l"/><circle cx="99" cy="32" r="2.5" class="l"/><circle cx="141" cy="32" r="11" class="l"/><circle cx="141" cy="32" r="2.5" class="l"/><rect x="114.5" y="22" width="11" height="20" rx="1.5" class="l"/><circle cx="120" cy="72" r="4" class="l"/>' },
    { type: 'altar', label: 'Altar', w: 160, h: 90, svg: '<path d="M5 23c4-9 18-9 22 0Z"/><path d="M16 5v8M12.5 8h7M5 27h22"/>',
      planta: '<rect x="1" y="1" width="158" height="88" rx="4"/><rect x="10" y="10" width="140" height="70" rx="3" class="l"/><rect x="52" y="18" width="56" height="16" rx="2" class="l"/><circle cx="28" cy="26" r="9" class="l"/><circle cx="28" cy="26" r="3.5" class="l"/><circle cx="132" cy="26" r="9" class="l"/><circle cx="132" cy="26" r="3.5" class="l"/><text x="80" y="64" text-anchor="middle" class="t">Altar</text>' },
    { type: 'kids', label: 'Área kids', w: 170, h: 140, svg: '<path d="M16 3.5a7.5 7.5 0 0 1 7.5 7.5c0 4.6-3.9 8.6-7.5 9.6-3.6-1-7.5-5-7.5-9.6A7.5 7.5 0 0 1 16 3.5Z"/><path d="m14.6 20.6 1.4 1.9 1.4-1.9M16 22.5c0 2.2-2.5 2.6-2.5 6M12.5 8.5a3.5 3.5 0 0 1 2.5-1.8"/>',
      planta: '<rect x="1" y="1" width="168" height="138" rx="16"/><svg x="61" y="16" width="48" height="48" viewBox="0 0 32 32" class="l"><path d="M16 3.5a7.5 7.5 0 0 1 7.5 7.5c0 4.6-3.9 8.6-7.5 9.6-3.6-1-7.5-5-7.5-9.6A7.5 7.5 0 0 1 16 3.5Z"/><path d="m14.6 20.6 1.4 1.9 1.4-1.9M16 22.5c0 2.2-2.5 2.6-2.5 6M12.5 8.5a3.5 3.5 0 0 1 2.5-1.8"/></svg><text x="85" y="84" text-anchor="middle" class="t">Área Kids</text><rect x="20" y="104" width="16" height="16" rx="2" class="l"/><rect x="38" y="111" width="13" height="13" rx="2" class="l"/><circle cx="146" cy="113" r="9" class="l"/>' },
    { type: 'sofa', label: 'Sofá', w: 150, h: 64, svg: '<rect x="4" y="9" width="24" height="14" rx="2"/><path d="M4 13h24M8 13v10M24 13v10M16 13v10"/>',
      planta: '<rect x="1" y="1" width="148" height="62" rx="6"/><rect x="17" y="1" width="116" height="14" rx="2" class="l"/><rect x="1" y="1" width="16" height="62" rx="6" class="l"/><rect x="133" y="1" width="16" height="62" rx="6" class="l"/><rect x="19" y="17" width="55" height="44" rx="3" class="l"/><rect x="76" y="17" width="55" height="44" rx="3" class="l"/>' },
    { type: 'backdrop', label: 'Backdrop', w: 200, h: 40, svg: '<path d="M5 5h22v15H5Z"/><path d="M5 5l5 15M27 5l-5 15M9 27l2-7M23 27l-2-7"/>',
      planta: '<rect x="1" y="1" width="198" height="10" rx="2"/><circle cx="16" cy="24" r="10"/><circle cx="16" cy="24" r="4" class="l"/><circle cx="184" cy="24" r="10"/><circle cx="184" cy="24" r="4" class="l"/><circle cx="40" cy="17" r="4" class="l"/><circle cx="60" cy="17" r="4" class="l"/><circle cx="80" cy="17" r="4" class="l"/><circle cx="100" cy="17" r="4" class="l"/><circle cx="120" cy="17" r="4" class="l"/><circle cx="140" cy="17" r="4" class="l"/><circle cx="160" cy="17" r="4" class="l"/>' }
  ];
  ITENS_DA_PLANTA.push(
    { type: 'banheiro', label: 'Banheiro', w: 120, h: 100, svg: '<circle cx="10" cy="6.5" r="2.3"/><path d="M7.2 11h5.6v7.5h-1.3V27H8.5v-8.5H7.2Z"/><circle cx="22" cy="6.5" r="2.3"/><path d="M22 11l3.8 9h-2.3v7h-3v-7h-2.3Z"/><path d="M16 4v24"/>',
      planta: '<rect x="1" y="1" width="118" height="98" rx="3"/><path d="M60 1v58" class="l"/><rect x="20" y="6" width="20" height="8" rx="2" class="l"/><ellipse cx="30" cy="26" rx="8" ry="10" class="l"/><rect x="80" y="6" width="20" height="8" rx="2" class="l"/><ellipse cx="90" cy="26" rx="8" ry="10" class="l"/><rect x="10" y="80" width="26" height="14" rx="3" class="l"/><circle cx="23" cy="87" r="3" class="l"/><path d="M84 99V71a28 28 0 0 1 28 28" class="l"/>' },
    { type: 'recepcao', label: 'Recepção', w: 150, h: 110, svg: '<circle cx="16" cy="8.5" r="3.5"/><path d="M9.5 18.5a6.5 6.5 0 0 1 13 0M4 18.5h24v8.5H4Z"/>',
      planta: '<circle cx="52" cy="17" r="12"/><circle cx="52" cy="17" r="5" class="l"/><circle cx="98" cy="17" r="12"/><circle cx="98" cy="17" r="5" class="l"/><rect x="15" y="34" width="120" height="70" rx="4"/><rect x="25" y="44" width="100" height="50" rx="2" class="l"/><rect x="62" y="58" width="26" height="18" rx="1.5" class="l"/><path d="M75 58v18" class="l"/>' },
    // Círculo (botão de formas): só aumenta/diminui.
    { type: 'circulo', label: 'Círculo', w: 120, h: 120, svg: '', planta: '<circle cx="60" cy="60" r="59"/>' }
  );
  // Banda saiu do menu (virou Palco); plantas antigas com banda mostram o palco.
  ITENS_DA_PLANTA.push(Object.assign({}, ITENS_DA_PLANTA.find(i => i.type === 'palco'), { type: 'banda', label: 'Palco' }));
  const FLOORPLAN_ELEMENT_TYPES = [
    { type: 'mesa', label: 'Mesa', icon: '🪑' },
    ...ITENS_DA_PLANTA.map(item => ({ type: item.type, label: item.label, icon: '' })),
    // Botão de formas: linha (arrasta as pontas) e rabisco (desenho livre).
    { type: 'linha', label: 'Linha', icon: '' },
    { type: 'rabisco', label: 'Rabisco', icon: '' },
    // Objetos › Texto: caixinha de texto simples (sem negrito), editável.
    { type: 'texto', label: 'Texto', icon: '' }
  ];
  /** Altura de um elemento na planta (mesa = quadro de 220px). @param {any} item */
  function alturaNaPlanta(item) {
    if (item.type === 'mesa') return 110 + 110 * escalaDaMesa(item);
    if (item.type === 'linha') return parseFloat(item.h) || 20;
    return tamanhoDoItem(item).h;
  }
  /** Tamanho da mesa (1 = normal), entre 0,5 e 2. @param {any} item */
  function escalaDaMesa(item) {
    const s = parseFloat(item && item.escala);
    return s ? Math.min(2, Math.max(0.5, s)) : 1;
  }
  /**
   * Tamanho de um item na planta. Cresce sempre na proporção (escala, de 0,4 a 3)
   * e gira de 45 em 45° (0, 45, 90... 315). Plantas antigas guardavam
   * largura/altura soltas ou só "girado": vira escala + rotação.
   * @param {any} elData
   */
  function tamanhoDoItem(elData) {
    const meta = ITENS_DA_PLANTA.find(i => i.type === elData.type);
    // Rabisco: o tamanho base é o do desenho feito à mão (bw x bh).
    const bw = meta ? meta.w : (parseFloat(elData.bw) || 84);
    const bh = meta ? meta.h : (parseFloat(elData.bh) || 64);
    let escala = parseFloat(elData.escala);
    let rotacao = Number.isInteger(elData.rotacao) && elData.rotacao % 45 === 0 ? ((elData.rotacao % 360) + 360) % 360 : (elData.girado ? 90 : 0);
    if (!escala && (parseFloat(elData.w) || parseFloat(elData.h))) {
      const w = parseFloat(elData.w) || bw;
      const h = parseFloat(elData.h) || bh;
      escala = Math.max(w, h) / Math.max(bw, bh);
      if (bw !== bh && (w > h) !== (bw > bh)) rotacao = 90;
    }
    escala = Math.min(3, Math.max(0.4, escala || 1));
    const baseW = bw * escala;
    const baseH = bh * escala;
    // Caixa ocupada pelo desenho girado (na diagonal ela fica maior).
    const rad = rotacao * Math.PI / 180;
    const cos = Math.abs(Math.round(Math.cos(rad) * 1e6) / 1e6);
    const sen = Math.abs(Math.round(Math.sin(rad) * 1e6) / 1e6);
    return { w: baseW * cos + baseH * sen, h: baseW * sen + baseH * cos, escala, rotacao, baseW, baseH };
  }

  // Elemento selecionado na planta (caixa com alças + menuzinho embaixo).
  /** @type {string|null} */
  let plantaSelecionada = null;
  /** Linha com a ponta sendo arrastada (ainda não salva). @type {any} */
  let dadosDaSelecaoEmArraste = null;
  /** Pop-up da mesa: como a planta estava ao abrir (o Voltar desfaz). @type {string|null} */
  let plantaAntesDoPopup = null;
  const FLOORPLAN_TYPE_META = {};
  FLOORPLAN_ELEMENT_TYPES.forEach(t => { FLOORPLAN_TYPE_META[t.type] = t; });
  const FLOORPLAN_MAX_SEATS = 24;

  let floorplanActiveTableId = null;

  function getFloorPlanElements() {
    const activeEvent = getActiveEvent();
    const eventId = (activeEvent && activeEvent.id) || 'default';
    const key = `love_floorplan_${eventId}`;
    // Fonte principal: a planta salva no evento (banco). O localStorage fica
    // como reserva para plantas montadas antes de ela ir para o banco.
    if (activeEvent && Array.isArray(activeEvent.floorPlan)) {
      return JSON.parse(JSON.stringify(activeEvent.floorPlan)).filter(el => el && FLOORPLAN_TYPE_META[el.type]);
    }
    const stored = localStorage.getItem(key);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          // Limpa elementos de formatos antigos/desconhecidos (ex.: mesas de uma
          // versão anterior sem "type" válido, que apareciam na planta com ícone "?").
          const cleaned = parsed.filter(el => el && FLOORPLAN_TYPE_META[el.type]);
          if (cleaned.length !== parsed.length) localStorage.setItem(key, JSON.stringify(cleaned));
          // Planta montada antes de ir para o banco: leva para o evento agora.
          if (cleaned.length && activeEvent && ehUuid(activeEvent.id)) saveFloorPlanElements(cleaned);
          return cleaned;
        }
      } catch (e) {}
    }
    return [];
  }

  let gravarPlantaTimer = null;
  // Mesas sempre numeradas em sequência (1, 2, 3…), mantendo a ordem atual:
  // excluir a Mesa 2 faz a Mesa 3 virar Mesa 2, e assim por diante — nunca
  // sobra buraco nem número repetido. Devolve true se algum número mudou.
  function renumerarMesas(elements) {
    const mesas = elements
      .map((el, i) => ({ el, i }))
      .filter(x => x.el && x.el.type === 'mesa')
      .sort((a, b) => ((parseInt(a.el.number) || 0) - (parseInt(b.el.number) || 0)) || (a.i - b.i));
    let mudou = false;
    mesas.forEach((x, idx) => {
      if (x.el.number !== idx + 1) { x.el.number = idx + 1; mudou = true; }
    });
    return mudou;
  }

  function saveFloorPlanElements(elements) {
    const activeEvent = getActiveEvent();
    const eventId = (activeEvent && activeEvent.id) || 'default';
    try { localStorage.setItem(`love_floorplan_${eventId}`, JSON.stringify(elements)); } catch (e) {}
    if (!activeEvent) return;
    activeEvent.floorPlan = JSON.parse(JSON.stringify(elements));
    // Grava no banco (eventos.extra.floorPlan) logo depois da última mudança.
    clearTimeout(gravarPlantaTimer);
    gravarPlantaTimer = setTimeout(() => {
      persistirEventoAtivo().catch(e => console.error('Erro ao salvar a planta:', e));
    }, 800);
  }

  // Mantém o array de nomes por assento do mesmo tamanho de "seats"
  // (preenche com vazio ao aumentar, corta ao diminuir).
  function resizeSeatNames(t) {
    const seats = parseInt(t.seats) || 1;
    if (!Array.isArray(t.seatNames)) t.seatNames = [];
    while (t.seatNames.length < seats) t.seatNames.push('');
    if (t.seatNames.length > seats) t.seatNames = t.seatNames.slice(0, seats);
  }

  // Move (ou troca) um assento de lugar: arrastar e soltar sobre outro assento
  // da MESMA mesa reordena os dois convidados ao redor dela; soltar sobre um
  // assento de OUTRA mesa muda a mesa em que o convidado está sentado (se o
  // assento de destino já tiver alguém, os dois convidados trocam de mesa).
  function swapFloorPlanSeats(sourceTableId, sourceIdx, targetTableId, targetIdx) {
    const elements = getFloorPlanElements();
    const sourceTable = elements.find(item => item.id === sourceTableId);
    const targetTable = elements.find(item => item.id === (targetTableId || sourceTableId));
    if (!sourceTable || !targetTable) return;
    resizeSeatNames(sourceTable);
    resizeSeatNames(targetTable);

    if (sourceTable === targetTable) {
      const tmp = sourceTable.seatNames[sourceIdx];
      sourceTable.seatNames[sourceIdx] = sourceTable.seatNames[targetIdx];
      sourceTable.seatNames[targetIdx] = tmp;
    } else {
      const movingGuest = sourceTable.seatNames[sourceIdx];
      const displacedGuest = targetTable.seatNames[targetIdx];
      targetTable.seatNames[targetIdx] = movingGuest;
      sourceTable.seatNames[sourceIdx] = displacedGuest;
    }

    saveFloorPlanElements(elements);
    renderFloorPlanCanvas();
    renderFloorPlanGuestCards();
    if (floorplanActiveTableId === sourceTable.id) renderFloorPlanSeatAssignments(sourceTable);
    if (floorplanActiveTableId === targetTable.id) renderFloorPlanSeatAssignments(targetTable);
  }

  // Pessoas que ocupam assento: cada convidado e cada acompanhante dele
  // (com o status da reserva). Acompanhante sem nome vira
  // "Acompanhante de <primeiro nome>", para não repetir o mesmo nome.
  // Quantas pessoas há numa lista de convidados: cada convidado conta 1 e
  // cada acompanhante dele também conta 1 (a lista mostra os dois).
  function pessoasNaLista(guests) {
    return (guests || []).reduce((s, g) => s + 1 + ((g && g.companionsNames) || []).filter(c => (c || '').trim()).length, 0);
  }

  function pessoasParaMesas() {
    const activeEvent = getActiveEvent();
    const guests = (activeEvent && activeEvent.guests) || [];
    const pessoas = [];
    guests.forEach(g => {
      if (!g.name || !g.name.trim()) return;
      pessoas.push({ name: g.name.trim(), status: g.status, isPrimary: true });
      (g.companionsNames || []).forEach(comp => {
        let nome = (comp || '').replace(/\s*\([^)]*\)\s*$/, '').trim();
        if (!nome || nome.toLowerCase() === 'acompanhante') {
          nome = `Acompanhante de ${g.name.trim().split(/\s+/)[0]}`;
        }
        pessoas.push({ name: nome, status: g.status, isPrimary: false });
      });
    });
    return pessoas;
  }

  function pessoaPeloNome(name) {
    const alvo = (name || '').trim().toLowerCase();
    if (!alvo) return null;
    return pessoasParaMesas().find(p => p.name.toLowerCase() === alvo) || null;
  }

  // Um assento fica verde quando o nome digitado bate (case-insensitive)
  // com um convidado (ou acompanhante) cujo RSVP está confirmado.
  function isFloorPlanSeatConfirmed(name) {
    const match = pessoaPeloNome(name);
    return !!(match && match.status === 'confirmed');
  }

  // Convidado recusado mantém a cor de recusado no assento/card independente
  // da mesa em que estiver — só muda se ele voltar a pendente ou confirmado.
  function isFloorPlanSeatDeclined(name) {
    const match = pessoaPeloNome(name);
    return !!(match && match.status === 'declined');
  }

  // Renderiza os cards arrastáveis de convidados no painel fixo da esquerda.
  let floorplanGuestStatusFilter = 'all';

  // Em qual mesa (se houver) o convidado está sentado — usado pra mostrar "Mesa N"
  // ao lado do nome no painel "Lista de convidados".
  function findFloorPlanTableNumberForGuest(guestName, elements) {
    if (!guestName || !guestName.trim()) return null;
    const els = elements || getFloorPlanElements();
    const norm = guestName.trim().toLowerCase();
    const table = els.find(t => t.type === 'mesa' && Array.isArray(t.seatNames) &&
      t.seatNames.some(n => n && n.trim().toLowerCase() === norm));
    return table ? table.number : null;
  }

  function renderFloorPlanGuestCards() {
    const container = document.getElementById('floorplan-guest-cards');
    if (!container) return;
    // Convidados e acompanhantes, cada um com seu card.
    let guests = pessoasParaMesas();
    if (floorplanGuestStatusFilter !== 'all') {
      guests = guests.filter(g => g.status === floorplanGuestStatusFilter);
    }
    guests = guests.slice().sort((a, b) => (a.name || '').localeCompare(b.name || '', 'pt-BR', { sensitivity: 'base' }));
    const elements = getFloorPlanElements();
    container.innerHTML = '';

    if (!guests.length) {
      const empty = document.createElement('p');
      empty.className = 'floorplan-field-hint';
      empty.style.margin = '0';
      empty.textContent = 'Nenhum convidado encontrado.';
      container.appendChild(empty);
      return;
    }

    guests.forEach(g => {
      const tableNumber = findFloorPlanTableNumberForGuest(g.name, elements);
      const isSeated = tableNumber !== null;

      const card = document.createElement('div');
      const isDeclined = g.status === 'declined';
      card.className = `floorplan-guest-card${isSeated ? ' is-seated' : ''}${isDeclined ? ' is-declined' : ''}`;
      card.draggable = !isSeated;
      card.dataset.guestName = g.name || '';

      if (g.status === 'confirmed') {
        card.insertAdjacentHTML('beforeend', '<span class="floorplan-guest-card-check-badge"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="m4.5 12.75 6 6 9-13.5"/></svg></span>');
      } else if (isDeclined) {
        card.insertAdjacentHTML('beforeend', '<span class="floorplan-guest-card-x-badge"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M6 6l12 12M18 6 6 18"/></svg></span>');
      } else {
        card.insertAdjacentHTML('beforeend', '<span class="floorplan-guest-card-pending-badge"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" d="M5 12h14"/></svg></span>');
      }

      const nameEl = document.createElement('span');
      nameEl.className = 'floorplan-guest-card-name';
      nameEl.textContent = g.name || '';
      card.appendChild(nameEl);

      if (isSeated) {
        const tableEl = document.createElement('span');
        tableEl.className = 'floorplan-guest-card-table';
        tableEl.textContent = `Mesa ${tableNumber}`;
        card.appendChild(tableEl);
      }

      card.addEventListener('dragstart', (e) => {
        e.dataTransfer.setData('text/plain', JSON.stringify({ kind: 'guest', name: card.dataset.guestName }));
        e.dataTransfer.effectAllowed = 'copy';
      });

      container.appendChild(card);
    });
  }

  // Altura da planta: a da tela (CSS) ou, se alguma mesa passar dela, até a
  // mesa mais baixa. Encolhe de novo quando as mesas sobem.
  function ajustarAlturaDaPlanta(canvas, elements) {
    const maisBaixa = elements.reduce((max, item) => Math.max(max, (parseFloat(item.y) || 0) + alturaNaPlanta(item)), 0);
    canvas.style.minHeight = maisBaixa ? `${Math.max(360, maisBaixa + 16)}px` : '';
  }

  function alturaVisivelDaPlanta(canvas) {
    const antes = canvas.style.minHeight;
    canvas.style.minHeight = '';
    const altura = canvas.getBoundingClientRect().height || 480;
    canvas.style.minHeight = antes;
    return altura;
  }

  function trazerMesasPerdidasDeVolta(canvas, elements) {
    // Expandida, a área visível é outra: não mexe em nada (só rola).
    if (canvas.closest('.floorplan-wrap.is-expandida')) return false;
    let limite = alturaVisivelDaPlanta(canvas);
    let mudou = false;
    elements.slice().sort((a, b) => (parseFloat(a.y) || 0) - (parseFloat(b.y) || 0)).forEach(item => {
      const altura = alturaNaPlanta(item);
      const y = parseFloat(item.y) || 0;
      // Folga de uma mesa abaixo do fundo (o mesmo que o arraste deixa descer).
      if (y > limite + 220) { item.y = Math.max(0, limite - 40); mudou = true; }
      limite = Math.max(limite, (parseFloat(item.y) || 0) + altura);
    });
    return mudou;
  }

  // Formatos de mesa da planta (o mesmo nome vai em elements[].formato).
  const FORMATOS_DE_MESA = ['redonda', 'retangular', 'quadrada', 'bistro'];

  function renderFloorPlanCanvas() {
    const canvas = document.getElementById('floorplan-canvas');
    const emptyHint = document.getElementById('floorplan-empty-hint');
    if (!canvas) return;
    const elements = getFloorPlanElements();

    canvas.querySelectorAll('.floorplan-el').forEach(el => el.remove());
    if (emptyHint) emptyHint.style.display = elements.length ? 'none' : 'flex';
    // Mesa "perdida" lá embaixo (arrastada para longe): sobe para logo abaixo
    // da área visível / da mesa anterior, para sempre dar para alcançá-la.
    // Planta antiga com mesas repetidas ou buracos (ex.: duas "Mesa 7"):
    // renumera em sequência e salva.
    const renumerou = renumerarMesas(elements);
    if (trazerMesasPerdidasDeVolta(canvas, elements) || renumerou) saveFloorPlanElements(elements);
    ajustarAlturaDaPlanta(canvas, elements);

    elements.forEach(elData => {
      const meta = FLOORPLAN_TYPE_META[elData.type] || { label: elData.type, icon: '❓' };
      const el = document.createElement('div');
      const isMesa = elData.type === 'mesa';
      el.className = `floorplan-el${isMesa ? ` is-mesa formato-${FORMATOS_DE_MESA.includes(elData.formato) ? elData.formato : 'redonda'}${elData.formato === 'retangular' && elData.orientacao === 'vertical' ? ' is-vertical' : ''}` : ''}`;
      el.style.left = `${elData.x || 0}px`;
      el.style.top = `${elData.y || 0}px`;
      el.dataset.elId = elData.id;
      if (isMesa && escalaDaMesa(elData) !== 1) el.style.transform = `scale(${escalaDaMesa(elData)})`;

      if (isMesa) {
        const core = document.createElement('div');
        core.className = 'floorplan-mesa-core';

        const numberEl = document.createElement('span');
        numberEl.className = 'floorplan-table-number';
        numberEl.textContent = `Mesa ${elData.number}`;
        // Retangular: o ícone de girar fica dentro da mesa, ao lado do "Mesa N"
        // (à esquerda na horizontal; em cima na vertical).
        const linhaDoNumero = document.createElement('span');
        linhaDoNumero.className = 'floorplan-core-linha';
        linhaDoNumero.appendChild(numberEl);
        core.appendChild(linhaDoNumero);

        if (elData.name) {
          const nameEl = document.createElement('span');
          nameEl.className = 'floorplan-table-core-name';
          nameEl.textContent = elData.name;
          nameEl.title = elData.name;
          core.appendChild(nameEl);
        }
        el.appendChild(core);

        const seats = parseInt(elData.seats) || 1;
        const seatNames = Array.isArray(elData.seatNames) ? elData.seatNames : [];
        // Precisa bater com o tamanho real de .floorplan-el.is-mesa (220x220) —
        // se não bater, os assentos ficam desalinhados em volta da mesa.
        const containerSize = 220;
        const ringRadius = 80;
        // Sem o "Exibir nomes" no pop-up: as iniciais aparecem sempre.
        const showNames = true;
        const formato = FORMATOS_DE_MESA.includes(elData.formato) ? elData.formato : 'redonda';
        for (let i = 0; i < seats; i++) {
          // Redonda segue a conta de sempre; os outros formatos têm a própria.
          let [seatX, seatY] = formato === 'redonda'
            ? [containerSize / 2 + ringRadius * Math.cos((2 * Math.PI * i / seats) - Math.PI / 2), containerSize / 2 + ringRadius * Math.sin((2 * Math.PI * i / seats) - Math.PI / 2)]
            : posicaoDoAssento(formato, i, seats);
          if (formato === 'retangular' && elData.orientacao === 'vertical') [seatX, seatY] = [seatY, seatX];
          const guestName = (seatNames[i] || '').trim();
          const confirmed = isFloorPlanSeatConfirmed(guestName);
          const declined = isFloorPlanSeatDeclined(guestName);
          const seatDot = document.createElement('div');
          let seatState = 'is-empty';
          if (guestName) seatState = declined ? 'is-declined' : (confirmed ? 'is-confirmed' : 'is-assigned');
          seatDot.className = `floorplan-seat-dot ${seatState}`;
          // Restrição alimentar de quem senta aqui: o assento fica na cor dela.
          const corDaRestricao = guestName ? opcaoComCor(restricaoDoAssento(guestName)) : null;
          if (corDaRestricao) {
            seatDot.classList.add('tem-restricao');
            seatDot.style.setProperty('--cor-restricao', corDaRestricao.fundo || corDaRestricao.cor || '');
            seatDot.style.setProperty('--cor-restricao-borda', corDaRestricao.cor || '');
          }
          if (!guestName) seatDot.title = 'Lugar vago';
          seatDot.style.left = `${seatX}px`;
          seatDot.style.top = `${seatY}px`;
          if (guestName) {
            seatDot.title = guestName;
            if (showNames) {
              // As duas iniciais no assento redondo (o nome inteiro fica no title).
              const iniciais = document.createElement('span');
              iniciais.className = 'floorplan-seat-dot-line';
              const partes = guestName.split(/\s+/).filter(Boolean);
              iniciais.textContent = ((partes[0] || '')[0] || '') + (partes.length > 1 ? (partes[partes.length - 1][0] || '') : ((partes[0] || '')[1] || ''));
              iniciais.textContent = iniciais.textContent.toUpperCase();
              seatDot.appendChild(iniciais);
            }
            seatDot.draggable = true;
            seatDot.addEventListener('dragstart', (e) => {
              e.stopPropagation();
              e.dataTransfer.setData('application/x-floorplan-seat', JSON.stringify({ tableId: elData.id, seatIndex: i }));
              e.dataTransfer.effectAllowed = 'move';
            });
          }
          // Reordenar assentos: arrastar um assento sobre outro troca os convidados
          // de lugar (ou move para um assento vazio), aproximando quem o usuário quiser.
          seatDot.addEventListener('dragover', (e) => {
            if (!e.dataTransfer.types.includes('application/x-floorplan-seat')) return;
            e.preventDefault();
            e.stopPropagation();
            seatDot.classList.add('is-dragover');
          });
          seatDot.addEventListener('dragleave', () => seatDot.classList.remove('is-dragover'));
          seatDot.addEventListener('drop', (e) => {
            if (!e.dataTransfer.types.includes('application/x-floorplan-seat')) return;
            e.preventDefault();
            e.stopPropagation();
            seatDot.classList.remove('is-dragover');
            let payload;
            try { payload = JSON.parse(e.dataTransfer.getData('application/x-floorplan-seat')); } catch (err) { return; }
            if (!payload) return;
            if (payload.tableId === elData.id && payload.seatIndex === i) return;
            swapFloorPlanSeats(payload.tableId, payload.seatIndex, elData.id, i);
          });
          // Clicar num assento sem arrastar ainda abre o modal da mesa
          // (o mousedown da mesa é ignorado quando começa num assento).
          seatDot.addEventListener('click', (e) => {
            e.stopPropagation();
            openFloorplanTableModal(elData.id);
          });
          el.appendChild(seatDot);
        }
      } else if (elData.type === 'linha') {
        // Linha: só o traço; dá para pegar no traço e arrastar, e as pontas
        // (quando selecionada) mudam a direção.
        el.classList.add('is-linha');
        el.title = 'Linha';
        el.style.width = `${parseFloat(elData.w) || 200}px`;
        el.style.height = `${parseFloat(elData.h) || 20}px`;
        el.innerHTML = svgDaLinha(elData);
      } else {
        // Item (buffet, palco, pista...): só o desenho em planta baixa, sem nome
        // (o nome aparece ao parar o mouse em cima). Rabisco: o desenho à mão.
        const item = ITENS_DA_PLANTA.find(i => i.type === elData.type);
        el.classList.add('is-item', `item-${elData.type}`);
        el.title = meta.label;
        const tam = tamanhoDoItem(elData);
        el.style.width = `${tam.w}px`;
        el.style.height = `${tam.h}px`;
        if (!item && elData.type === 'texto') {
          const caixa = document.createElement('div');
          caixa.className = 'floorplan-texto';
          caixa.textContent = String(elData.texto || '');
          caixa.style.transform = transformDoTexto(tam.escala, tam.rotacao);
          el.appendChild(caixa);
          el.addEventListener('dblclick', (e) => { e.stopPropagation(); editarTextoDaPlanta(elData.id); });
        }
        if (!item && elData.type === 'rabisco') {
          el.insertAdjacentHTML('beforeend', `<svg class="floorplan-planta" viewBox="0 0 ${parseFloat(elData.bw) || 84} ${parseFloat(elData.bh) || 64}" style="width:${tam.baseW}px;height:${tam.baseH}px;transform:translate(-50%, -50%)${tam.rotacao ? ` rotate(${tam.rotacao}deg)` : ''}" aria-hidden="true"><path class="l" d="${tracadoSeguro(elData.d)}"/></svg>`);
        }
        if (item) {
          el.insertAdjacentHTML('beforeend', `<svg class="floorplan-planta" viewBox="0 0 ${item.w} ${item.h}" style="width:${tam.baseW}px;height:${tam.baseH}px;transform:translate(-50%, -50%)${tam.rotacao ? ` rotate(${tam.rotacao}deg)` : ''}" aria-hidden="true">${item.planta}</svg>`);
        }
      }

      wireFloorPlanElementDrag(el, elData);
      canvas.appendChild(el);
    });
    desenharSelecaoDaPlanta();
  }

  // Ícones do menuzinho do elemento selecionado.
  const ICONES_DA_SELECAO = {
    editar: '<path d="M17 3a2.85 2.85 0 0 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/>',
    girar: '<path d="M21 12a9 9 0 1 1-2.64-6.36L21 8"/><path d="M21 3v5h-5"/>',
    duplicar: '<rect x="8" y="8" width="13" height="13" rx="2"/><path d="M4 16a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2"/>',
    excluir: '<path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6M10 11v6M14 11v6"/>'
  };

  /** Caixa visível do elemento dentro da planta (mesa = tampo + assentos). @param {HTMLElement} canvas @param {HTMLElement} el */
  function caixaVisivelNaPlanta(canvas, el) {
    const base = canvas.getBoundingClientRect();
    const partes = el.classList.contains('is-mesa')
      ? Array.from(el.children).map(c => c.getBoundingClientRect()).filter(r => r.width && r.height)
      : [el.getBoundingClientRect()];
    if (!partes.length) partes.push(el.getBoundingClientRect());
    return {
      esq: Math.min(...partes.map(r => r.left)) - base.left,
      topo: Math.min(...partes.map(r => r.top)) - base.top,
      dir: Math.max(...partes.map(r => r.right)) - base.left,
      base: Math.max(...partes.map(r => r.bottom)) - base.top
    };
  }

  // Desenha a caixa de seleção (com as 4 alças para aumentar/diminuir) e o
  // menuzinho embaixo: Editar, Girar, Duplicar e Excluir.
  function desenharSelecaoDaPlanta() {
    const canvas = document.getElementById('floorplan-canvas');
    if (!canvas) return;
    canvas.querySelectorAll('.floorplan-selecao').forEach(s => s.remove());
    if (!plantaSelecionada) return;
    const el = /** @type {HTMLElement|null} */ (canvas.querySelector(`.floorplan-el[data-el-id="${CSS.escape(plantaSelecionada)}"]`));
    const elData = dadosDaSelecaoEmArraste || getFloorPlanElements().find(x => x.id === plantaSelecionada);
    if (!el || !elData) { plantaSelecionada = null; return; }
    const cx = caixaVisivelNaPlanta(canvas, el);
    const folga = 6;
    const sel = document.createElement('div');
    sel.className = 'floorplan-selecao';
    sel.style.left = `${cx.esq - folga}px`;
    sel.style.top = `${cx.topo - folga}px`;
    sel.style.width = `${cx.dir - cx.esq + folga * 2}px`;
    sel.style.height = `${cx.base - cx.topo + folga * 2}px`;
    if (elData.type === 'linha') {
      // Linha: sem caixa; uma bolinha em cada ponta para mudar a direção.
      sel.classList.add('is-linha');
      const x0 = parseFloat(elData.x) || 0;
      const y0 = parseFloat(elData.y) || 0;
      /** @type {['a' | 'b', number, number][]} */
      const pontas = [['a', parseFloat(elData.ax) || 0, parseFloat(elData.ay) || 0], ['b', parseFloat(elData.bx) || 0, parseFloat(elData.by) || 0]];
      pontas.forEach(([ponta, px, py]) => {
        const alca = document.createElement('span');
        alca.className = 'floorplan-alca alca-ponta';
        alca.title = 'Arraste para mudar a direção';
        alca.style.left = `${x0 + px - (cx.esq - folga) - 6.5}px`;
        alca.style.top = `${y0 + py - (cx.topo - folga) - 6.5}px`;
        alca.addEventListener('mousedown', (e) => iniciarArrasteDaPonta(e, elData.id, ponta));
        sel.appendChild(alca);
      });
    } else {
      ['tl', 'tr', 'bl', 'br'].forEach(canto => {
        const alca = document.createElement('span');
        alca.className = `floorplan-alca alca-${canto}`;
        alca.title = 'Arraste para aumentar ou diminuir';
        alca.addEventListener('mousedown', (e) => iniciarRedimensionamento(e, elData.id));
        sel.appendChild(alca);
      });
    }

    const giravel = elData.type === 'mesa' ? elData.formato === 'retangular' : !['linha', 'circulo'].includes(elData.type);
    const acoes = document.createElement('div');
    acoes.className = 'floorplan-acoes';
    /** @type {[string, string][]} */
    const botoes = elData.type === 'mesa' ? [['editar', 'Editar mesa']] : elData.type === 'texto' ? [['editar', 'Editar texto']] : [];
    if (giravel) botoes.push(['girar', 'Girar']);
    botoes.push(['duplicar', 'Duplicar'], ['excluir', 'Excluir']);
    botoes.forEach(([acao, titulo]) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = `floorplan-acao acao-${acao}`;
      b.title = titulo;
      b.setAttribute('aria-label', titulo);
      b.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONES_DA_SELECAO[/** @type {keyof typeof ICONES_DA_SELECAO} */ (acao)]}</svg>`;
      b.addEventListener('mousedown', (e) => e.stopPropagation());
      b.addEventListener('click', (e) => { e.stopPropagation(); acaoNaSelecao(acao, elData.id); });
      acoes.appendChild(b);
    });
    sel.appendChild(acoes);
    canvas.appendChild(sel);
    // O menuzinho fica embaixo; se não couber (fim da planta), vai para cima.
    // Na horizontal, não sai pelas laterais.
    const larguraMenu = acoes.offsetWidth;
    const centro = (cx.esq + cx.dir) / 2;
    const esqMenu = Math.max(4, Math.min(centro - larguraMenu / 2, canvas.clientWidth - larguraMenu - 4));
    acoes.style.left = `${esqMenu - (cx.esq - folga)}px`;
    if (cx.base + folga + 12 + acoes.offsetHeight > canvas.clientHeight) acoes.classList.add('is-acima');
  }

  /** @param {string} acao @param {string} id */
  function acaoNaSelecao(acao, id) {
    const lista = getFloorPlanElements();
    const alvo = lista.find(x => x.id === id);
    if (!alvo) return;
    if (acao === 'editar') {
      if (alvo.type === 'mesa') openFloorplanTableModal(id);
      else if (alvo.type === 'texto') editarTextoDaPlanta(id);
      return;
    }
    if (acao === 'girar') {
      if (alvo.type === 'mesa') {
        alvo.orientacao = alvo.orientacao === 'vertical' ? 'horizontal' : 'vertical';
      } else {
        // Item: gira 45° (8 posições), mantendo o centro no lugar.
        const t = tamanhoDoItem(alvo);
        alvo.escala = t.escala;
        alvo.rotacao = (t.rotacao + 45) % 360;
        delete alvo.girado;
        const novo = tamanhoDoItem(alvo);
        alvo.x = Math.max(0, (parseFloat(alvo.x) || 0) + (t.w - novo.w) / 2);
        alvo.y = Math.max(0, (parseFloat(alvo.y) || 0) + (t.h - novo.h) / 2);
        delete alvo.girado;
        delete alvo.w;
        delete alvo.h;
      }
    } else if (acao === 'duplicar') {
      const copia = JSON.parse(JSON.stringify(alvo));
      copia.id = `fp-${Date.now()}`;
      copia.x = (parseFloat(alvo.x) || 0) + 28;
      copia.y = (parseFloat(alvo.y) || 0) + 28;
      if (copia.type === 'mesa') {
        // Mesma mesa, com número novo e os lugares vazios (ninguém senta em dois lugares).
        copia.number = lista.filter(x => x.type === 'mesa').length + 1;
        copia.seatNames = (copia.seatNames || []).map(() => '');
      }
      lista.push(copia);
      plantaSelecionada = copia.id;
    } else if (acao === 'excluir') {
      const resto = lista.filter(x => x.id !== id);
      renumerarMesas(resto);
      plantaSelecionada = null;
      saveFloorPlanElements(resto);
      if (alvo.type === 'mesa') renderGuestsTable();
      renderFloorPlanCanvas();
      renderFloorPlanGuestCards();
      return;
    }
    saveFloorPlanElements(lista);
    renderFloorPlanCanvas();
    if (alvo.type === 'mesa') renderFloorPlanGuestCards();
  }

  // Alças da seleção: arrastar para fora aumenta, para dentro diminui.
  // Mesa e item crescem por igual (na proporção). O centro fica no lugar.
  /** @param {MouseEvent} e @param {string} id */
  function iniciarRedimensionamento(e, id) {
    e.preventDefault();
    e.stopPropagation();
    const canvas = document.getElementById('floorplan-canvas');
    const el = canvas && /** @type {HTMLElement|null} */ (canvas.querySelector(`.floorplan-el[data-el-id="${CSS.escape(id)}"]`));
    const alvo = getFloorPlanElements().find(x => x.id === id);
    if (!canvas || !el || !alvo) return;
    const base = canvas.getBoundingClientRect();
    const isMesa = alvo.type === 'mesa';
    const tam0 = isMesa ? { w: 220, h: 220 } : tamanhoDoItem(alvo);
    const x0 = parseFloat(alvo.x) || 0;
    const y0 = parseFloat(alvo.y) || 0;
    const centroX = x0 + tam0.w / 2;
    const centroY = y0 + tam0.h / 2;
    const dx0 = Math.abs(e.clientX - base.left - centroX) || 1;
    const dy0 = Math.abs(e.clientY - base.top - centroY) || 1;
    const escala0 = isMesa ? escalaDaMesa(alvo) : tamanhoDoItem(alvo).escala;
    /** @type {Record<string, any>} */
    let resultado = isMesa ? { escala: escala0 } : { escala: escala0, rotacao: tamanhoDoItem(alvo).rotacao, x: x0, y: y0 };
    document.body.classList.add('planta-redimensionando');

    const mover = (/** @type {MouseEvent} */ ev) => {
      const dx = Math.abs(ev.clientX - base.left - centroX);
      const dy = Math.abs(ev.clientY - base.top - centroY);
      const fator = Math.hypot(dx, dy) / Math.hypot(dx0, dy0);
      if (isMesa) {
        const escala = Math.round(Math.min(2, Math.max(0.5, escala0 * fator)) * 100) / 100;
        el.style.transform = escala === 1 ? '' : `scale(${escala})`;
        resultado = { escala };
      } else {
        const escala = Math.round(Math.min(3, Math.max(0.4, escala0 * fator)) * 100) / 100;
        const w = tam0.w / escala0 * escala;
        const hh = tam0.h / escala0 * escala;
        const x = Math.max(0, centroX - w / 2);
        const y = Math.max(0, centroY - hh / 2);
        el.style.width = `${w}px`;
        el.style.height = `${hh}px`;
        el.style.left = `${x}px`;
        el.style.top = `${y}px`;
        const caixaDeTexto = /** @type {HTMLElement|null} */ (el.querySelector('.floorplan-texto'));
        if (caixaDeTexto) caixaDeTexto.style.transform = transformDoTexto(escala, resultado.rotacao || 0);
        const desenho = /** @type {SVGElement|null} */ (el.querySelector('.floorplan-planta'));
        if (desenho) {
          const t0 = tamanhoDoItem(alvo);
          desenho.style.width = `${t0.baseW / escala0 * escala}px`;
          desenho.style.height = `${t0.baseH / escala0 * escala}px`;
        }
        resultado = { escala, rotacao: resultado.rotacao, x, y };
      }
      desenharSelecaoDaPlanta();
    };
    const soltar = () => {
      document.removeEventListener('mousemove', mover);
      document.removeEventListener('mouseup', soltar);
      document.body.classList.remove('planta-redimensionando');
      const lista = getFloorPlanElements();
      const t = lista.find(x => x.id === id);
      if (!t) return;
      Object.assign(t, resultado);
      if (!isMesa) { delete t.w; delete t.h; delete t.girado; }
      saveFloorPlanElements(lista);
      renderFloorPlanCanvas();
    };
    document.addEventListener('mousemove', mover);
    document.addEventListener('mouseup', soltar);
  }


  // Arrastar um elemento já posicionado para reorganizar; um clique sem
  // arrastar (deslocamento mínimo) seleciona o elemento e abre o inspector na sidebar.
  function wireFloorPlanElementDrag(el, elData) {
    el.addEventListener('mousedown', (e) => {
      // Clique começando num assento: é o reordenamento (drag nativo) do assento,
      // não o reposicionamento da mesa inteira — deixa o evento seguir para ele.
      if (e.target.closest('.floorplan-seat-dot')) return;
      e.preventDefault();
      const canvas = document.getElementById('floorplan-canvas');
      if (!canvas) return;
      const startX = e.clientX;
      const startY = e.clientY;
      const origLeft = parseFloat(el.style.left) || 0;
      const origTop = parseFloat(el.style.top) || 0;
      let moved = false;
      // Área visível da mesa (círculo + assentos) dentro da caixa de 220px:
      // é ela que não pode sair da planta, não a caixa inteira.
      // (Mesa aumentada/diminuída: a caixa na tela é a escalada; volta para a de 220px.)
      const caixaTela = el.getBoundingClientRect();
      const caixa = { left: caixaTela.left + (caixaTela.width - el.offsetWidth) / 2, top: caixaTela.top + (caixaTela.height - el.offsetHeight) / 2 };
      const partes = Array.from(el.children).filter(c => !c.classList.contains('floorplan-selecao')).map(c => c.getBoundingClientRect()).filter(r => r.width && r.height);
      const visivel = partes.length ? {
        esq: Math.min(...partes.map(r => r.left)) - caixa.left,
        dir: Math.max(...partes.map(r => r.right)) - caixa.left,
        topo: Math.min(...partes.map(r => r.top)) - caixa.top,
        base: Math.max(...partes.map(r => r.bottom)) - caixa.top
      } : { esq: 0, dir: el.offsetWidth, topo: 0, base: el.offsetHeight };
      // Selecionar já no clique; a caixa some enquanto arrasta e volta ao soltar.
      plantaSelecionada = elData.id;
      canvas.querySelectorAll('.floorplan-selecao').forEach(s => s.remove());

      // Até onde a mesa pode descer neste arraste: o fundo atual da planta
      // + o tamanho de uma mesa (cresce aos poucos, nunca sem fim).
      const alturaInicial = canvas.getBoundingClientRect().height;
      const topoMaximo = alturaInicial + 220 - el.offsetHeight - 16;

      const onMouseMove = (moveEvt) => {
        const dx = moveEvt.clientX - startX;
        const dy = moveEvt.clientY - startY;
        if (Math.abs(dx) > 3 || Math.abs(dy) > 3) moved = true;
        const rect = canvas.getBoundingClientRect();
        const newLeft = Math.max(4 - visivel.esq, Math.min(origLeft + dx, rect.width - 4 - visivel.dir));
        const newTop = Math.max(4 - visivel.topo, Math.min(origTop + dy, topoMaximo));
        const fundoNecessario = newTop + el.offsetHeight + 16;
        if (fundoNecessario > rect.height) canvas.style.minHeight = `${fundoNecessario}px`;
        el.style.left = `${newLeft}px`;
        el.style.top = `${newTop}px`;
      };

      const onMouseUp = () => {
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
        if (moved) {
          const elements = getFloorPlanElements();
          const t = elements.find(x => x.id === elData.id);
          if (t) {
            t.x = parseFloat(el.style.left) || 0;
            t.y = parseFloat(el.style.top) || 0;
            saveFloorPlanElements(elements);
          }
          ajustarAlturaDaPlanta(canvas, elements);
        }
        desenharSelecaoDaPlanta();
      };

      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
    });
  }

  // Cria uma nova mesa direto na planta (posições em cascata para não empilhar
  // uma exatamente sobre a outra) — usado pelo botão "Adicionar Mesa".
  /** @param {string} [formato]  redonda | retangular | quadrada | bistro */
  function addFloorPlanTableViaButton(formato) {
    const canvas = document.getElementById('floorplan-canvas');
    if (!canvas) return;
    const elements = getFloorPlanElements();
    const mesaCount = elements.filter(item => item.type === 'mesa').length;
    // No meio da parte da planta que está na tela (quadro da mesa = 220px).
    const { x, y } = posicaoNoMeioDaPlanta(canvas, elements, 220, 220);

    elements.push({
      id: `fp-${Date.now()}`,
      type: 'mesa',
      formato: FORMATOS_DE_MESA.includes(formato || '') ? formato : 'redonda',
      number: mesaCount + 1,
      name: '',
      seats: 1,
      seatNames: [''],
      x, y
    });
    plantaSelecionada = elements[elements.length - 1].id;
    saveFloorPlanElements(elements);
    renderFloorPlanCanvas();
  }

  /** Caminho do rabisco só com números e M/L (vem do banco). @param {any} d */
  function tracadoSeguro(d) {
    return String(d || '').replace(/[^MLml0-9.\s-]/g, '');
  }

  /** SVG da linha (traço visível + faixa invisível mais grossa para pegar com o mouse). @param {any} l */
  function svgDaLinha(l) {
    const w = parseFloat(l.w) || 200;
    const hh = parseFloat(l.h) || 20;
    const p = [l.ax, l.ay, l.bx, l.by].map(v => parseFloat(v) || 0);
    return `<svg class="floorplan-linha-svg" width="${w}" height="${hh}" viewBox="0 0 ${w} ${hh}" aria-hidden="true"><line class="pega" x1="${p[0]}" y1="${p[1]}" x2="${p[2]}" y2="${p[3]}"/><line class="traco" x1="${p[0]}" y1="${p[1]}" x2="${p[2]}" y2="${p[3]}"/></svg>`;
  }

  /**
   * Caixa da linha a partir das duas pontas (na planta), com folga de 10px.
   * @param {number} x1 @param {number} y1 @param {number} x2 @param {number} y2
   */
  function caixaDaLinha(x1, y1, x2, y2) {
    const f = 10;
    const x = Math.min(x1, x2) - f;
    const y = Math.min(y1, y2) - f;
    return { x, y, w: Math.abs(x2 - x1) + f * 2, h: Math.abs(y2 - y1) + f * 2, ax: x1 - x, ay: y1 - y, bx: x2 - x, by: y2 - y };
  }

  // Formas › Linha: entra na parte visível da planta, já selecionada.
  function inserirLinhaNaPlanta() {
    const canvas = document.getElementById('floorplan-canvas');
    if (!canvas) return;
    const elements = getFloorPlanElements();
    // No meio da parte da planta que está na tela.
    const meio = posicaoNoMeioDaPlanta(canvas, elements, 200, 20);
    const x1 = meio.x + 10;
    const y1 = meio.y + 10;
    elements.push(Object.assign({ id: `fp-${Date.now()}`, type: 'linha' }, caixaDaLinha(x1, y1, x1 + 180, y1)));
    plantaSelecionada = elements[elements.length - 1].id;
    saveFloorPlanElements(elements);
    renderFloorPlanCanvas();
  }

  // Arrastar uma ponta da linha: a outra fica parada.
  /** @param {MouseEvent} e @param {string} id @param {'a' | 'b'} ponta */
  function iniciarArrasteDaPonta(e, id, ponta) {
    e.preventDefault();
    e.stopPropagation();
    const canvas = document.getElementById('floorplan-canvas');
    const el = canvas && /** @type {HTMLElement|null} */ (canvas.querySelector(`.floorplan-el[data-el-id="${CSS.escape(id)}"]`));
    const alvo = getFloorPlanElements().find(x => x.id === id);
    if (!canvas || !el || !alvo) return;
    const base = canvas.getBoundingClientRect();
    const x0 = parseFloat(alvo.x) || 0;
    const y0 = parseFloat(alvo.y) || 0;
    const fixa = ponta === 'a'
      ? { x: x0 + (parseFloat(alvo.bx) || 0), y: y0 + (parseFloat(alvo.by) || 0) }
      : { x: x0 + (parseFloat(alvo.ax) || 0), y: y0 + (parseFloat(alvo.ay) || 0) };
    /** @type {ReturnType<typeof caixaDaLinha>|null} */
    let resultado = null;
    const mover = (/** @type {MouseEvent} */ ev) => {
      const px = Math.max(10, Math.min(ev.clientX - base.left, canvas.clientWidth - 10));
      const py = Math.max(10, ev.clientY - base.top);
      resultado = ponta === 'a' ? caixaDaLinha(px, py, fixa.x, fixa.y) : caixaDaLinha(fixa.x, fixa.y, px, py);
      el.style.left = `${resultado.x}px`;
      el.style.top = `${resultado.y}px`;
      el.style.width = `${resultado.w}px`;
      el.style.height = `${resultado.h}px`;
      el.innerHTML = svgDaLinha(resultado);
      Object.assign(alvo, resultado);
      desenharSelecaoComDados(alvo);
    };
    const soltar = () => {
      document.removeEventListener('mousemove', mover);
      document.removeEventListener('mouseup', soltar);
      if (!resultado) return;
      const lista = getFloorPlanElements();
      const t = lista.find(x => x.id === id);
      if (!t) return;
      Object.assign(t, resultado);
      saveFloorPlanElements(lista);
      renderFloorPlanCanvas();
    };
    document.addEventListener('mousemove', mover);
    document.addEventListener('mouseup', soltar);
  }

  // Durante o arraste da ponta a planta ainda não foi salva: redesenha a seleção
  // com os dados em mãos.
  /** @param {any} dados */
  function desenharSelecaoComDados(dados) {
    dadosDaSelecaoEmArraste = dados;
    desenharSelecaoDaPlanta();
    dadosDaSelecaoEmArraste = null;
  }

  // Formas › Rabisco: o próximo arraste na planta vira um desenho livre.
  function comecarRabisco() {
    const canvas = document.getElementById('floorplan-canvas');
    if (!canvas) return;
    plantaSelecionada = null;
    desenharSelecaoDaPlanta();
    canvas.classList.add('is-desenhando');
    let dica = canvas.querySelector('.floorplan-dica-desenho');
    if (!dica) {
      dica = document.createElement('div');
      dica.className = 'floorplan-dica-desenho';
      dica.textContent = 'Desenhe com o mouse na planta · Esc cancela';
      canvas.appendChild(dica);
    }
  }

  function pararRabisco() {
    const canvas = document.getElementById('floorplan-canvas');
    if (!canvas) return;
    canvas.classList.remove('is-desenhando');
    canvas.querySelectorAll('.floorplan-dica-desenho, .floorplan-rabisco-ao-vivo').forEach(n => n.remove());
  }

  /** @param {MouseEvent} e */
  function desenharRabisco(e) {
    const canvas = document.getElementById('floorplan-canvas');
    if (!canvas || !canvas.classList.contains('is-desenhando')) return;
    e.preventDefault();
    e.stopPropagation();
    const base = canvas.getBoundingClientRect();
    /** @type {{x: number, y: number}[]} */
    const pontos = [{ x: e.clientX - base.left, y: e.clientY - base.top }];
    const aoVivo = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    aoVivo.setAttribute('class', 'floorplan-rabisco-ao-vivo');
    aoVivo.setAttribute('width', String(canvas.clientWidth));
    aoVivo.setAttribute('height', String(canvas.scrollHeight));
    const caminho = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    aoVivo.appendChild(caminho);
    canvas.appendChild(aoVivo);
    const comoTexto = (/** @type {{x: number, y: number}[]} */ pts, dx = 0, dy = 0) => 'M' + pts.map(p => `${(p.x - dx).toFixed(1)} ${(p.y - dy).toFixed(1)}`).join(' L');
    const mover = (/** @type {MouseEvent} */ ev) => {
      const p = { x: ev.clientX - base.left, y: ev.clientY - base.top };
      const ult = pontos[pontos.length - 1];
      if (Math.hypot(p.x - ult.x, p.y - ult.y) < 2) return;
      pontos.push(p);
      caminho.setAttribute('d', comoTexto(pontos));
    };
    const soltar = () => {
      document.removeEventListener('mousemove', mover);
      document.removeEventListener('mouseup', soltar);
      pararRabisco();
      if (pontos.length < 3) return;
      const folga = 4;
      const minX = Math.min(...pontos.map(p => p.x)) - folga;
      const minY = Math.min(...pontos.map(p => p.y)) - folga;
      const bw = Math.max(12, Math.max(...pontos.map(p => p.x)) - minX + folga);
      const bh = Math.max(12, Math.max(...pontos.map(p => p.y)) - minY + folga);
      const lista = getFloorPlanElements();
      lista.push({ id: `fp-${Date.now()}`, type: 'rabisco', x: Math.max(0, minX), y: Math.max(0, minY), bw: Math.round(bw), bh: Math.round(bh), d: comoTexto(pontos, minX, minY) });
      plantaSelecionada = lista[lista.length - 1].id;
      saveFloorPlanElements(lista);
      renderFloorPlanCanvas();
    };
    document.addEventListener('mousemove', mover);
    document.addEventListener('mouseup', soltar);
  }

  /**
   * Onde um elemento novo entra: centralizado na parte da planta que está na
   * tela (vale com a página rolada e na planta expandida). Se já houver algo
   * exatamente ali, desce um pouco em cascata para não ficar um em cima do outro.
   * @param {HTMLElement} canvas @param {any[]} elements @param {number} w @param {number} h
   */
  function posicaoNoMeioDaPlanta(canvas, elements, w, h) {
    const r = canvas.getBoundingClientRect();
    const rolagem = canvas.closest('.floorplan-wrap.is-expandida') ? canvas.closest('.floorplan-body') : null;
    const area = rolagem ? rolagem.getBoundingClientRect() : { top: 0, bottom: window.innerHeight, left: 0, right: window.innerWidth };
    const cabecalho = document.querySelector('.floorplan-toolbar');
    const topoTela = Math.max(area.top, cabecalho ? cabecalho.getBoundingClientRect().bottom : 0);
    const topo = Math.max(r.top, topoTela);
    const base = Math.min(r.bottom, area.bottom);
    const esq = Math.max(r.left, area.left);
    const dir = Math.min(r.right, area.right);
    let x = (esq + dir) / 2 - r.left - w / 2;
    let y = (base > topo ? (topo + base) / 2 : r.top + r.height / 2) - r.top - h / 2;
    for (let i = 0; i < 8 && elements.some(el => Math.abs((parseFloat(el.x) || 0) - x) < 12 && Math.abs((parseFloat(el.y) || 0) - y) < 12); i++) {
      x += 24;
      y += 24;
    }
    return { x: Math.max(0, Math.min(x, r.width - w)), y: Math.max(0, y) };
  }

  /** Centraliza a caixa de texto no bloco, girada e na escala. @param {number} escala @param {number} rotacao */
  function transformDoTexto(escala, rotacao) {
    return `translate(-50%, -50%)${rotacao ? ` rotate(${rotacao}deg)` : ''} scale(${escala})`;
  }

  /** Tamanho do texto no tamanho normal (escala 1), medido com a mesma fonte da planta. @param {string} texto */
  function medirTextoDaPlanta(texto) {
    const medida = document.createElement('div');
    medida.className = 'floorplan-texto floorplan-texto-medida';
    medida.textContent = texto || ' ';
    document.body.appendChild(medida);
    const r = { w: Math.ceil(medida.offsetWidth) || 40, h: Math.ceil(medida.offsetHeight) || 24 };
    medida.remove();
    return r;
  }

  // Objetos › Texto: entra no meio da planta com "Texto" já selecionado para digitar.
  function inserirTextoNaPlanta() {
    const canvas = document.getElementById('floorplan-canvas');
    if (!canvas) return;
    const elements = getFloorPlanElements();
    const { w, h } = medirTextoDaPlanta('Texto');
    const { x, y } = posicaoNoMeioDaPlanta(canvas, elements, w, h);
    elements.push({ id: `fp-${Date.now()}`, type: 'texto', texto: 'Texto', bw: w, bh: h, x, y });
    plantaSelecionada = elements[elements.length - 1].id;
    saveFloorPlanElements(elements);
    renderFloorPlanCanvas();
    editarTextoDaPlanta(plantaSelecionada);
  }

  // Editar o texto direto na planta: texto simples (sem negrito/itálico, colar vira
  // texto puro). Enter salva, Shift+Enter quebra a linha, Esc desiste.
  /** @param {string} id */
  function editarTextoDaPlanta(id) {
    const canvas = document.getElementById('floorplan-canvas');
    const caixa = canvas && /** @type {HTMLElement|null} */ (canvas.querySelector(`.floorplan-el[data-el-id="${CSS.escape(id)}"] .floorplan-texto`));
    if (!caixa) return;
    const original = caixa.textContent || '';
    try { caixa.contentEditable = 'plaintext-only'; } catch (err) { caixa.contentEditable = 'true'; }
    if (caixa.contentEditable !== 'plaintext-only') caixa.contentEditable = 'true';
    caixa.classList.add('is-editando');
    caixa.focus();
    const faixa = document.createRange();
    faixa.selectNodeContents(caixa);
    const sel = window.getSelection();
    if (sel) { sel.removeAllRanges(); sel.addRange(faixa); }
    caixa.addEventListener('mousedown', (e) => e.stopPropagation());
    caixa.addEventListener('paste', (e) => {
      e.preventDefault();
      const puro = e.clipboardData ? e.clipboardData.getData('text/plain') : '';
      document.execCommand('insertText', false, puro);
    });
    let terminou = false;
    const terminar = (/** @type {boolean} */ salvar) => {
      if (terminou) return;
      terminou = true;
      caixa.contentEditable = 'false';
      const texto = (caixa.innerText || '').replace(/\n+$/, '');
      const lista = getFloorPlanElements();
      const alvo = lista.find(x => x.id === id);
      if (salvar && alvo && texto.trim() && texto !== original) {
        // Mantém o centro no lugar com o tamanho novo do texto.
        const antes = tamanhoDoItem(alvo);
        const medida = medirTextoDaPlanta(texto);
        alvo.texto = texto;
        alvo.bw = medida.w;
        alvo.bh = medida.h;
        const depois = tamanhoDoItem(alvo);
        alvo.x = Math.max(0, (parseFloat(alvo.x) || 0) + (antes.w - depois.w) / 2);
        alvo.y = Math.max(0, (parseFloat(alvo.y) || 0) + (antes.h - depois.h) / 2);
        saveFloorPlanElements(lista);
      }
      renderFloorPlanCanvas();
    };
    caixa.addEventListener('keydown', (e) => {
      e.stopPropagation();
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); terminar(true); }
      else if (e.key === 'Escape') { e.preventDefault(); terminar(false); }
      // Sem negrito/itálico/sublinhado: é um texto simples.
      else if ((e.ctrlKey || e.metaKey) && ['b', 'i', 'u'].includes(e.key.toLowerCase())) e.preventDefault();
    });
    caixa.addEventListener('blur', () => terminar(true));
  }

  /** @param {string} tipo  um dos ITENS_DA_PLANTA */
  function inserirItemNaPlanta(tipo) {
    const canvas = document.getElementById('floorplan-canvas');
    const item = ITENS_DA_PLANTA.find(i => i.type === tipo);
    if (!canvas || !item) return;
    const elements = getFloorPlanElements();
    // No meio da parte da planta que está na tela.
    const { x, y } = posicaoNoMeioDaPlanta(canvas, elements, item.w, item.h);
    elements.push({ id: `fp-${Date.now()}`, type: tipo, x, y });
    plantaSelecionada = elements[elements.length - 1].id;
    saveFloorPlanElements(elements);
    renderFloorPlanCanvas();
  }

  /**
   * Posição (x, y) do assento i de n em volta da mesa, dentro do quadro de
   * 220x220 da mesa (centro em 110, 110), conforme o formato.
   * @param {string} formato @param {number} i @param {number} n
   * @returns {[number, number]}
   */
  function posicaoDoAssento(formato, i, n) {
    const c = 110;
    if (formato === 'retangular') {
      // A partir de 6 lugares, um em cada ponta da mesa (cabeceiras) e o resto
      // dividido entre os dois lados (ex.: 10 = 4 em cima, 4 embaixo, 1 em cada ponta).
      const pontas = n >= 6 ? 2 : 0;
      const nosLados = n - pontas;
      if (pontas && i >= nosLados) return [i === nosLados ? c - 98 : c + 98, c];
      const emCima = Math.ceil(nosLados / 2);
      const naLinha = i < emCima ? emCima : nosLados - emCima;
      const j = i < emCima ? i : i - emCima;
      const x = c - 70 + ((j + 0.5) / naLinha) * 140;
      return [x, i < emCima ? c - 50 : c + 50];
    }
    if (formato === 'quadrada') {
      // Distribuídos pelo contorno de um quadrado de 140 de lado.
      const lado = 140;
      const d = ((i + 0.5) / n) * lado * 4;
      const s = Math.floor(d / lado);
      const t = d - s * lado - lado / 2;
      if (s === 0) return [c + t, c - lado / 2];
      if (s === 1) return [c + lado / 2, c + t];
      if (s === 2) return [c - t, c + lado / 2];
      return [c - lado / 2, c - t];
    }
    const raio = formato === 'bistro' ? 52 : 80;
    const ang = (2 * Math.PI * i / n) - Math.PI / 2;
    return [c + raio * Math.cos(ang), c + raio * Math.sin(ang)];
  }

  function wireFloorPlanCanvasDrop() {
    const canvas = document.getElementById('floorplan-canvas');
    if (!canvas) return;
    canvas.addEventListener('dragover', (e) => {
      e.preventDefault();
      canvas.classList.add('is-dragover');
    });
    canvas.addEventListener('dragleave', () => canvas.classList.remove('is-dragover'));
    canvas.addEventListener('drop', (e) => {
      e.preventDefault();
      canvas.classList.remove('is-dragover');
      // Pessoa arrastada de um assento e solta sobre outra mesa (não num
      // assento): vai para o primeiro lugar vazio dessa mesa.
      if (e.dataTransfer.types.includes('application/x-floorplan-seat')) {
        let origem;
        try { origem = JSON.parse(e.dataTransfer.getData('application/x-floorplan-seat')); } catch (err) { return; }
        if (origem) moverPessoaDoAssentoParaMesa(origem.tableId, origem.seatIndex, e.clientX, e.clientY);
        return;
      }
      let payload;
      try { payload = JSON.parse(e.dataTransfer.getData('text/plain')); } catch (err) { return; }
      if (!payload) return;

      if (payload.kind === 'guest') {
        assignGuestToTableAtPoint(payload.name, e.clientX, e.clientY);
        return;
      }
      if (!payload.type || !FLOORPLAN_TYPE_META[payload.type]) return;

      const rect = canvas.getBoundingClientRect();
      const isMesa = payload.type === 'mesa';
      const shapeSize = isMesa ? 220 : 84;
      const shapeHeightOffset = isMesa ? 110 : 32;
      let x = e.clientX - rect.left - shapeSize / 2;
      let y = e.clientY - rect.top - shapeHeightOffset;
      x = Math.max(4, Math.min(x, rect.width - shapeSize - 4));
      y = Math.max(4, Math.min(y, rect.height - shapeSize - 4));

      const elements = getFloorPlanElements();
      const newEl = { id: `fp-${Date.now()}`, type: payload.type, x, y };
      if (isMesa) {
        const mesaCount = elements.filter(item => item.type === 'mesa').length;
        newEl.number = mesaCount + 1;
        newEl.seats = 1;
        newEl.name = '';
        newEl.seatNames = [''];
      }
      elements.push(newEl);
      saveFloorPlanElements(elements);
      renderFloorPlanCanvas();
    });
  }

  // Move quem está num assento para a mesa solta (primeiro lugar vazio, ou
  // um lugar a mais se ela estiver cheia). Soltar na própria mesa não muda nada.
  function moverPessoaDoAssentoParaMesa(sourceTableId, sourceIdx, clientX, clientY) {
    const hit = document.elementFromPoint(clientX, clientY);
    const targetTableEl = hit && hit.closest('.floorplan-el.is-mesa');
    if (!targetTableEl) return;
    const targetId = targetTableEl.dataset.elId;
    if (targetId === sourceTableId) return;
    const elements = getFloorPlanElements();
    const origem = elements.find(item => item.id === sourceTableId);
    const destino = elements.find(item => item.id === targetId);
    if (!origem || !destino) return;
    resizeSeatNames(origem);
    resizeSeatNames(destino);
    const nome = (origem.seatNames[sourceIdx] || '').trim();
    if (!nome) return;

    let idx = destino.seatNames.findIndex(n => !n || !n.trim());
    if (idx === -1) {
      if ((parseInt(destino.seats) || 1) >= FLOORPLAN_MAX_SEATS) return;
      destino.seats = (parseInt(destino.seats) || 1) + 1;
      resizeSeatNames(destino);
      idx = destino.seatNames.length - 1;
    }
    destino.seatNames[idx] = nome;
    origem.seatNames[sourceIdx] = '';
    saveFloorPlanElements(elements);
    renderFloorPlanCanvas();
    renderFloorPlanGuestCards();
    if (floorplanActiveTableId === origem.id) renderFloorPlanSeatAssignments(origem);
    if (floorplanActiveTableId === destino.id) renderFloorPlanSeatAssignments(destino);
  }

  // Solta um convidado sobre uma mesa posicionada: acomoda no primeiro assento
  // vazio, ou cria mais um lugar se a mesa já estiver cheia.
  function assignGuestToTableAtPoint(guestName, clientX, clientY) {
    const hit = document.elementFromPoint(clientX, clientY);
    const targetTableEl = hit && hit.closest('.floorplan-el.is-mesa');
    if (!targetTableEl) return;
    const tableId = targetTableEl.dataset.elId;
    const elements = getFloorPlanElements();
    const t = elements.find(item => item.id === tableId);
    if (!t) return;

    // Cada convidado só pode ocupar um assento por vez em toda a planta —
    // evita duplicar a mesma pessoa em vários lugares (na mesma mesa ou em outra).
    if (findFloorPlanTableNumberForGuest(guestName, elements) !== null) {
      showToast(`${guestName} já está sentado(a) em uma mesa.`, '⚠️');
      return;
    }

    resizeSeatNames(t);
    let idx = t.seatNames.findIndex(n => !n || !n.trim());
    if (idx === -1) {
      if ((parseInt(t.seats) || 1) >= FLOORPLAN_MAX_SEATS) return;
      t.seats = (parseInt(t.seats) || 1) + 1;
      resizeSeatNames(t);
      idx = t.seatNames.length - 1;
    }
    t.seatNames[idx] = guestName;
    saveFloorPlanElements(elements);
    renderFloorPlanCanvas();
    renderFloorPlanGuestCards();
    if (floorplanActiveTableId === tableId) {
      renderFloorPlanSeatAssignments(t);
      const seatsValueEl = document.getElementById('floorplan-seats-value');
      if (seatsValueEl) seatsValueEl.textContent = t.seats;
    }
  }

  function openFloorplanTableModal(tableId) {
    const elements = getFloorPlanElements();
    const t = elements.find(item => item.id === tableId);
    if (!t) return;
    floorplanActiveTableId = tableId;
    plantaAntesDoPopup = JSON.stringify(elements);
    resizeSeatNames(t);

    const titleEl = document.getElementById('floorplan-table-modal-title');
    if (titleEl) titleEl.textContent = `Mesa ${t.number}`;
    const nameInput = document.getElementById('floorplan-el-name-input');
    if (nameInput) nameInput.value = t.name || '';
    const seatsValueEl = document.getElementById('floorplan-seats-value');
    if (seatsValueEl) seatsValueEl.textContent = parseInt(t.seats) || 1;
    const showNamesToggle = document.getElementById('floorplan-show-names-toggle');
    if (showNamesToggle) showNamesToggle.checked = t.showNames !== false;
    renderFloorPlanSeatAssignments(t);

    openModal(document.getElementById('modal-floorplan-table'));
  }

  function renderFloorPlanSeatAssignments(t) {
    const container = document.getElementById('floorplan-seat-assignments');
    if (!container) return;
    container.innerHTML = '';
    const assigned = t.seatNames.map((name, i) => ({ name, i })).filter(s => s.name && s.name.trim());

    if (!assigned.length) {
      const empty = document.createElement('p');
      empty.className = 'floorplan-field-hint';
      empty.style.margin = '0';
      empty.textContent = 'Nenhum convidado acomodado ainda.';
      container.appendChild(empty);
      return;
    }

    assigned.forEach(({ name, i }) => {
      const row = document.createElement('div');
      const declined = isFloorPlanSeatDeclined(name);
      row.className = `floorplan-seat-assignment-row${declined ? ' is-declined' : ''}`;

      const nameEl = document.createElement('span');
      nameEl.className = 'floorplan-seat-assignment-name';
      nameEl.textContent = name;
      row.appendChild(nameEl);

      const rightWrap = document.createElement('div');
      rightWrap.className = 'floorplan-seat-assignment-right';

      if (declined) {
        const label = document.createElement('span');
        label.className = 'floorplan-seat-confirmed-label is-declined';
        label.textContent = 'Recusado';
        rightWrap.appendChild(label);
      } else if (isFloorPlanSeatConfirmed(name)) {
        const label = document.createElement('span');
        label.className = 'floorplan-seat-confirmed-label';
        label.textContent = 'Confirmado';
        rightWrap.appendChild(label);
      }

      const removeBtn = document.createElement('button');
      removeBtn.type = 'button';
      removeBtn.className = 'floorplan-seat-assignment-remove';
      removeBtn.textContent = '×';
      removeBtn.title = 'Remover convidado desta mesa';
      removeBtn.addEventListener('click', () => {
        const els = getFloorPlanElements();
        const tbl = els.find(item => item.id === floorplanActiveTableId);
        if (!tbl) return;
        tbl.seatNames[i] = '';
        saveFloorPlanElements(els);
        renderFloorPlanCanvas();
        renderFloorPlanGuestCards();
        renderFloorPlanSeatAssignments(tbl);
      });
      rightWrap.appendChild(removeBtn);

      row.appendChild(rightWrap);
      container.appendChild(row);
    });
  }

  function initFloorPlanTableModal() {
    const nameInput = document.getElementById('floorplan-el-name-input');
    if (nameInput) {
      nameInput.addEventListener('input', () => {
        const els = getFloorPlanElements();
        const t = els.find(item => item.id === floorplanActiveTableId);
        if (!t) return;
        t.name = nameInput.value.trim();
        saveFloorPlanElements(els);
        renderFloorPlanCanvas();
      });
    }

    const seatsValueEl = document.getElementById('floorplan-seats-value');
    const seatsUpBtn = document.getElementById('floorplan-seats-up');
    const seatsDownBtn = document.getElementById('floorplan-seats-down');
    if (seatsUpBtn) {
      seatsUpBtn.addEventListener('click', () => {
        const els = getFloorPlanElements();
        const t = els.find(item => item.id === floorplanActiveTableId);
        if (!t) return;
        t.seats = Math.min(FLOORPLAN_MAX_SEATS, (parseInt(t.seats) || 1) + 1);
        resizeSeatNames(t);
        saveFloorPlanElements(els);
        if (seatsValueEl) seatsValueEl.textContent = t.seats;
        renderFloorPlanCanvas();
        renderFloorPlanGuestCards();
        renderFloorPlanSeatAssignments(t);
      });
    }
    if (seatsDownBtn) {
      seatsDownBtn.addEventListener('click', () => {
        const els = getFloorPlanElements();
        const t = els.find(item => item.id === floorplanActiveTableId);
        if (!t) return;
        t.seats = Math.max(1, (parseInt(t.seats) || 1) - 1);
        resizeSeatNames(t);
        saveFloorPlanElements(els);
        if (seatsValueEl) seatsValueEl.textContent = t.seats;
        renderFloorPlanCanvas();
        renderFloorPlanGuestCards();
        renderFloorPlanSeatAssignments(t);
      });
    }

    // Voltar: desfaz o que mudou desde que o pop-up abriu. Salvar: mantém e fecha.
    const voltarBtn = document.getElementById('btn-floorplan-voltar');
    if (voltarBtn) {
      voltarBtn.addEventListener('click', () => {
        if (plantaAntesDoPopup) {
          saveFloorPlanElements(JSON.parse(plantaAntesDoPopup));
          plantaAntesDoPopup = null;
          renderGuestsTable();
          renderFloorPlanCanvas();
          renderFloorPlanGuestCards();
        }
        closeModal(document.getElementById('modal-floorplan-table'));
      });
    }
    const salvarBtn = document.getElementById('btn-floorplan-salvar');
    if (salvarBtn) {
      salvarBtn.addEventListener('click', () => {
        plantaAntesDoPopup = null;
        closeModal(document.getElementById('modal-floorplan-table'));
      });
    }

    const showNamesToggle = document.getElementById('floorplan-show-names-toggle');
    if (showNamesToggle) {
      showNamesToggle.addEventListener('change', () => {
        const els = getFloorPlanElements();
        const t = els.find(item => item.id === floorplanActiveTableId);
        if (!t) return;
        t.showNames = showNamesToggle.checked;
        saveFloorPlanElements(els);
        renderFloorPlanCanvas();
      });
    }
  }

  function initFloorPlanFilterDropdown() {
    const switcher = document.getElementById('floorplan-filter-switcher');
    const btn = document.getElementById('floorplan-filter-btn');
    const dropdown = document.getElementById('floorplan-filter-dropdown');
    if (!switcher || !btn || !dropdown) return;

    const closeDropdown = () => {
      dropdown.classList.remove('show');
      btn.setAttribute('aria-expanded', 'false');
    };

    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const isOpen = dropdown.classList.toggle('show');
      btn.setAttribute('aria-expanded', String(isOpen));
    });

    dropdown.addEventListener('click', (e) => e.stopPropagation());

    dropdown.querySelectorAll('[data-status-option]').forEach(item => {
      item.addEventListener('click', () => {
        dropdown.querySelectorAll('[data-status-option]').forEach(opt => opt.classList.remove('active'));
        item.classList.add('active');
        floorplanGuestStatusFilter = item.dataset.statusOption;
        closeDropdown();
        renderFloorPlanGuestCards();
      });
    });

    document.addEventListener('click', closeDropdown);
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeDropdown(); });
  }

  function initFloorPlan() {
    wireFloorPlanCanvasDrop();
    renderFloorPlanGuestCards();
    renderFloorPlanCanvas();
    initFloorPlanTableModal();
    initFloorPlanFilterDropdown();

    // Expandir: esconde a lista de convidados e a planta ocupa a tela toda
    // (clique de novo para voltar). Esc também volta.
    const btnExpandir = document.getElementById('btn-floorplan-expandir');
    const wrapPlanta = btnExpandir ? btnExpandir.closest('.floorplan-wrap') : null;
    if (btnExpandir && wrapPlanta) {
      const expandir = (/** @type {boolean} */ ligado) => {
        wrapPlanta.classList.toggle('is-expandida', ligado);
        document.body.classList.toggle('planta-expandida', ligado);
        btnExpandir.setAttribute('aria-pressed', String(ligado));
        btnExpandir.dataset.dica = ligado ? 'Reduzir' : 'Expandir';
        btnExpandir.setAttribute('aria-label', btnExpandir.dataset.dica);
        const lista = document.getElementById('floorplan-guests-panel');
        if (lista && !ligado) { lista.style.left = ''; lista.style.top = ''; }
        renderFloorPlanCanvas();
      };
      btnExpandir.addEventListener('click', () => expandir(!wrapPlanta.classList.contains('is-expandida')));

      // Expandida: a lista de convidados flutua sobre a planta. O tracinho
      // minimiza (fica só a barrinha); o quadradinho abre de novo. Dá para
      // arrastar a lista pela barra de cima.
      const listaFlutuante = document.getElementById('floorplan-guests-panel');
      const btnMinimizar = document.getElementById('btn-floorplan-minimizar-lista');
      if (listaFlutuante && btnMinimizar) {
        btnMinimizar.addEventListener('click', () => {
          const minimizada = listaFlutuante.classList.toggle('is-minimizada');
          btnMinimizar.title = minimizada ? 'Abrir lista' : 'Minimizar lista';
          btnMinimizar.setAttribute('aria-label', btnMinimizar.title);
          btnMinimizar.setAttribute('aria-expanded', String(!minimizada));
        });
        const barra = listaFlutuante.querySelector('.floorplan-convidados-topo');
        if (barra) {
          barra.addEventListener('mousedown', (e) => {
            if (!wrapPlanta.classList.contains('is-expandida')) return;
            if (e.target instanceof Element && e.target.closest('button')) return;
            e.preventDefault();
            const r = listaFlutuante.getBoundingClientRect();
            const dx = e.clientX - r.left;
            const dy = e.clientY - r.top;
            const mover = (/** @type {MouseEvent} */ ev) => {
              listaFlutuante.style.left = `${Math.max(8, Math.min(ev.clientX - dx, window.innerWidth - r.width - 8))}px`;
              listaFlutuante.style.top = `${Math.max(8, Math.min(ev.clientY - dy, window.innerHeight - 48))}px`;
            };
            const soltar = () => {
              document.removeEventListener('mousemove', mover);
              document.removeEventListener('mouseup', soltar);
            };
            document.addEventListener('mousemove', mover);
            document.addEventListener('mouseup', soltar);
          });
        }
      }
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && wrapPlanta.classList.contains('is-expandida') && !document.querySelector('.modal-backdrop-custom.open')) expandir(false);
      });
    }

    // Clique no fundo da planta (ou Esc) tira a seleção.
    const canvasDaPlanta = document.getElementById('floorplan-canvas');
    if (canvasDaPlanta) {
      canvasDaPlanta.addEventListener('mousedown', (e) => {
        if (e.target === canvasDaPlanta && plantaSelecionada) { plantaSelecionada = null; desenharSelecaoDaPlanta(); }
      });
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && plantaSelecionada && !document.querySelector('.modal-backdrop-custom.open') && !(e.target instanceof HTMLElement && e.target.isContentEditable)) {
          plantaSelecionada = null;
          desenharSelecaoDaPlanta();
        }
        // Delete (ou Backspace) com um item selecionado na planta: exclui, igual
        // à lixeira do menuzinho. Não vale enquanto digita num campo.
        if ((e.key === 'Delete' || e.key === 'Backspace') && plantaSelecionada && canvasDaPlanta.offsetParent
          && !document.querySelector('.modal-backdrop-custom.open')
          && !(e.target instanceof HTMLElement && (e.target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)))) {
          e.preventDefault();
          acaoNaSelecao('excluir', plantaSelecionada);
        }
      });
    }

    // "Adicionar Mesa" abre o menu de formatos (Redonda, Retangular, Quadrada, Bistrô).
    const btnAddTable = document.getElementById('btn-open-add-table-modal');
    const menuFormatos = document.getElementById('floorplan-add-table-menu');
    if (btnAddTable && menuFormatos) {
      const abrirMenu = (/** @type {boolean} */ abrir) => {
        menuFormatos.classList.toggle('hidden', !abrir);
        btnAddTable.setAttribute('aria-expanded', String(abrir));
      };
      btnAddTable.addEventListener('click', (e) => {
        e.stopPropagation();
        abrirMenu(menuFormatos.classList.contains('hidden'));
      });
      menuFormatos.querySelectorAll('[data-mesa-formato]').forEach(op => {
        op.addEventListener('click', (e) => {
          e.stopPropagation();
          abrirMenu(false);
          addFloorPlanTableViaButton(/** @type {HTMLElement} */ (op).dataset.mesaFormato);
        });
      });
      // Formas (linha, círculo, rabisco) — caixinha à esquerda do "Inserir item".
      const btnFormas = document.getElementById('btn-floorplan-formas');
      const menuFormas = document.getElementById('floorplan-formas-menu');
      if (btnFormas && menuFormas) {
        const abrirFormas = (/** @type {boolean} */ abrir) => {
          menuFormas.classList.toggle('hidden', !abrir);
          btnFormas.setAttribute('aria-expanded', String(abrir));
        };
        btnFormas.addEventListener('click', (e) => {
          e.stopPropagation();
          abrirMenu(false);
          abrirFormas(menuFormas.classList.contains('hidden'));
        });
        btnAddTable.addEventListener('click', () => abrirFormas(false));
        menuFormas.querySelectorAll('[data-planta-forma]').forEach(op => {
          op.addEventListener('click', (e) => {
            e.stopPropagation();
            abrirFormas(false);
            const forma = /** @type {HTMLElement} */ (op).dataset.plantaForma;
            if (forma === 'linha') inserirLinhaNaPlanta();
            else if (forma === 'circulo') inserirItemNaPlanta('circulo');
            else if (forma === 'rabisco') comecarRabisco();
            else if (forma === 'texto') inserirTextoNaPlanta();
          });
        });
        document.addEventListener('click', (e) => {
          if (!menuFormas.classList.contains('hidden') && !(e.target instanceof Element && e.target.closest('.floorplan-formas'))) abrirFormas(false);
        });
        document.addEventListener('keydown', (e) => {
          if (e.key !== 'Escape') return;
          abrirFormas(false);
          pararRabisco();
        });
      }
      const canvasDeDesenho = document.getElementById('floorplan-canvas');
      if (canvasDeDesenho) canvasDeDesenho.addEventListener('mousedown', desenharRabisco, true);

      menuFormatos.querySelectorAll('[data-planta-item]').forEach(op => {
        op.addEventListener('click', (e) => {
          e.stopPropagation();
          abrirMenu(false);
          inserirItemNaPlanta(/** @type {HTMLElement} */ (op).dataset.plantaItem || '');
        });
      });
      document.addEventListener('click', (e) => {
        if (!menuFormatos.classList.contains('hidden') && !(e.target instanceof Element && e.target.closest('.floorplan-add-mesa'))) abrirMenu(false);
      });
      document.addEventListener('keydown', (e) => { if (e.key === 'Escape') abrirMenu(false); });
    }
  }

  // Salvar Convidado (drawer compartilhado: cria um novo ou atualiza o que está sendo editado)
  const formAddGuest = document.getElementById('form-add-guest');
  if (formAddGuest) {
    formAddGuest.addEventListener('submit', async (e) => {
      e.preventDefault();
      const btnSalvar = document.getElementById('btn-save-guest');
      if (btnSalvar && btnSalvar.disabled) return;
      const activeEvent = getActiveEvent();
      const guest = activeEvent.guests.find(g => g.id === activeDrawerGuestId);
      if (!guest) return;

      // Validação: nome com no mínimo 3 caracteres.
      const nameInput = document.getElementById('guest-name-input');
      const name = nameInput.value.trim();
      const nameError = document.getElementById('guest-name-error');
      if (name.length < 3) {
        nameError?.classList.remove('hidden');
        nameInput.focus();
        return;
      }
      nameError?.classList.add('hidden');

      // Validação: se preenchido, telefone precisa estar no formato
      // (DDD) 9XXXX-XXXX completo.
      const phoneInput = document.getElementById('guest-phone-input');
      const phoneRaw = phoneInput.value.trim();
      const phoneError = document.getElementById('guest-phone-error');
      if (phoneRaw && !isValidBrazilPhone(phoneRaw)) {
        phoneError?.classList.remove('hidden');
        phoneInput.focus();
        return;
      }
      phoneError?.classList.add('hidden');

      // Restrição alimentar: com alergia/outra, o detalhe é obrigatório.
      if (restricaoDoConvidado && !restricaoDoConvidado.validar()) return;
      const linhasDeAcompanhante = /** @type {HTMLElement[]} */ (Array.from(document.querySelectorAll('.guest-companion-row')));
      if (linhasDeAcompanhante.some(l => { const r = restricaoDoAcompanhante.get(l); return r ? !r.validar() : false; })) return;

      // Acompanhantes: { id, name, ageGroup } por linha.
      const companionsDetailed = Array.from(document.querySelectorAll('.guest-companion-row')).map(row => ({
        id: row.dataset.id,
        name: row.querySelector('.guest-companion-name-input').value.trim() || 'Acompanhante',
        ageGroup: row.querySelector('.guest-companion-age-input').value,
        restricaoAlimentar: restricaoDoAcompanhante.get(/** @type {HTMLElement} */ (row))?.valor() || { restrictionType: 'NONE' }
      }));
      const companionsNames = companionsDetailed.map(c => c.name);
      const adults = 1 + companionsDetailed.filter(c => c.ageGroup === 'adult').length;
      const children = companionsDetailed.filter(c => c.ageGroup === 'child' || c.ageGroup === 'baby').length;

      const wasNew = isNewGuestDraft;
      const previousCompanionsCount = guest.companions || 0;
      guest.name = name;
      guest.phone = phoneRaw;
      guest.email = document.getElementById('guest-email-input').value.trim();
      guest.companionsNames = companionsNames;
      guest.companionsDetailed = companionsDetailed;
      guest.companions = companionsDetailed.length;
      guest.adults = adults;
      guest.children = children;
      guest.relationshipTitle = document.getElementById('guest-title-input').value || '';
      guest.relationshipHost = document.getElementById('guest-title-host-input').value || '';
      if (restricaoDoConvidado) {
        guest.restricaoAlimentar = restricaoDoConvidado.valor();
        guest.dietaryRestrictions = textoDaRestricao(guest.restricaoAlimentar);
      }

      // Grava no banco antes de fechar; se falhar, o aviso fica no botão e a
      // gaveta continua aberta para tentar de novo.
      const textoBotao = btnSalvar ? btnSalvar.textContent : '';
      if (btnSalvar) { btnSalvar.disabled = true; btnSalvar.textContent = 'Salvando…'; }
      let erroAoSalvar = null;
      try {
        ({ error: erroAoSalvar } = await salvarConvidadoNoBanco(guest));
      } catch (err) {
        erroAoSalvar = err;
      }
      if (erroAoSalvar) {
        console.error('Erro ao salvar convidado:', erroAoSalvar);
        if (btnSalvar) {
          btnSalvar.textContent = 'Erro ao salvar';
          setTimeout(() => { btnSalvar.textContent = textoBotao; btnSalvar.disabled = false; }, 1800);
        }
        return;
      }
      if (btnSalvar) { btnSalvar.textContent = textoBotao; btnSalvar.disabled = false; }

      if (wasNew) {
        activeEvent.totalConvidados = (activeEvent.totalConvidados || 0) + (1 + companionsNames.length);
      } else {
        activeEvent.totalConvidados = (activeEvent.totalConvidados || 0) + (companionsDetailed.length - previousCompanionsCount);
      }

      isNewGuestDraft = false;
      closeAddGuestDrawer();
      renderGuestsTable();
      renderFloorPlanGuestCards();
      // A cor da restrição alimentar aparece no assento do Mapa do evento.
      renderFloorPlanCanvas();
      updateAllCelebrationData();
      showToast(wasNew ? `Convidado ${name} adicionado à lista de ${activeEvent.title}!` : `Convidado ${name} atualizado!`, '👤');
    });
  }

  // ==========================================
  // ==========================================
  // 8. FINANCEIRO: CARTEIRA DIGITAL, ORÇAMENTO & EXTRATO
  // ==========================================
  function switchWalletSubSection(subId, subLabel) {
    // Pop-up de configurar orçamento só deve aparecer dentro de Orçamento —
    // sai ao trocar pra qualquer outra sub-seção da Carteira.
    if (subId !== 'wallet-budget') closeModal(document.getElementById('modal-setup-budget'));

    document.body.classList.add('wallet-mode');
    const title = document.getElementById('wallet-header-title');
    const desc = document.getElementById('wallet-header-desc');
    const headerActions = document.getElementById('wallet-header-actions');

    // Cabeçalho: "Adicionar despesa" no Orçamento, "Adicionar comprovante" no Extrato.
    if (headerActions) {
      headerActions.classList.toggle('hidden', subId !== 'wallet-statement' && subId !== 'wallet-budget');
      document.getElementById('btn-open-add-expense')?.classList.toggle('hidden', subId !== 'wallet-budget');
      document.getElementById('btn-add-comprovante')?.classList.toggle('hidden', subId !== 'wallet-statement');
    }

    if (title) {
      if (subId === 'wallet-digital') {
        title.textContent = 'Carteira Digital';
        if (desc) desc.classList.add('hidden');
      } else if (subId === 'wallet-budget') {
        title.textContent = 'Orçamento';
        if (desc) {
          desc.textContent = 'Planeje metas, controle custos comprometidos e gerencie despesas de fornecedores do evento.';
          desc.classList.remove('hidden');
        }
        checkAndPromptBudgetSetup();
        renderBudgetExpensesTable();
      } else if (subId === 'wallet-statement') {
        title.textContent = 'Extrato';
        if (desc) desc.classList.add('hidden');
      } else {
        title.textContent = subLabel;
        if (desc) desc.classList.add('hidden');
      }
    }

    // Alterna sub-painéis visíveis
    document.querySelectorAll('.wallet-sub-panel').forEach(panel => panel.classList.add('hidden'));
    const panelKey = subId.replace('wallet-', '');
    const targetPanel = document.getElementById(`wallet-sub-${panelKey}`);
    if (targetPanel) targetPanel.classList.remove('hidden');

    renderWalletTransactions();
  }

  // ==========================================
  // Carteira › Dados de saque (acordeão): Pix (tipo + chave) ou TED.
  // Salvo em clientes.dados_saque (migration 048). Não há "alterar chave":
  // a pessoa muda o campo e salva.
  // ==========================================
  let metodoDeSaque = 'pix';
  const so_digitos = v => String(v || '').replace(/\D/g, '');
  function mascaraCpf(v) {
    const d = so_digitos(v).slice(0, 11);
    return d.replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d{1,2})$/, '$1-$2');
  }

  function mostrarMetodoDeSaque(metodo) {
    metodoDeSaque = metodo === 'ted' ? 'ted' : 'pix';
    document.querySelectorAll('[data-saque-metodo]').forEach(b => b.classList.toggle('active', b.dataset.saqueMetodo === metodoDeSaque));
    document.querySelectorAll('[data-saque-painel]').forEach(p => p.classList.toggle('hidden', p.dataset.saquePainel !== metodoDeSaque));
  }

  function resumoDosDadosDeSaque(d) {
    if (d && d.metodo === 'pix' && d.pix && d.pix.chave) {
      const nomes = { cpf: 'CPF', email: 'E-mail', telefone: 'Telefone', aleatoria: 'Chave aleatória' };
      return `Pix · ${nomes[d.pix.tipo] || 'Chave'}: ${d.pix.chave}`;
    }
    if (d && d.metodo === 'ted' && d.ted && d.ted.conta) {
      return `TED · ${d.ted.banco || 'Banco'} · Ag. ${d.ted.agencia || '—'} · Conta ${d.ted.conta}`;
    }
    return 'Cadastre a chave Pix ou a conta para receber seus saques.';
  }

  function preencherDadosDeSaque() {
    const d = (window.loveClienteProfile && window.loveClienteProfile.dados_saque) || {};
    const set = (id, v) => { const el = document.getElementById(id); if (el && document.activeElement !== el) el.value = v || ''; };
    set('saque-pix-tipo', (d.pix && d.pix.tipo) || 'cpf');
    set('saque-pix-chave', d.pix && d.pix.chave);
    set('saque-ted-banco', d.ted && d.ted.banco);
    set('saque-ted-agencia', d.ted && d.ted.agencia);
    set('saque-ted-conta', d.ted && d.ted.conta);
    set('saque-ted-titular', d.ted && d.ted.titular);
    set('saque-ted-cpf', d.ted && d.ted.cpf);
    mostrarMetodoDeSaque(d.metodo || 'pix');
    const resumo = document.getElementById('wallet-saque-resumo');
    if (resumo) resumo.textContent = resumoDosDadosDeSaque(d);
    // Modal de saque: já vem com a chave Pix salva.
    const destinoSaque = document.querySelector('#form-withdraw-pix input[type="text"]');
    if (destinoSaque && !destinoSaque.value && d.metodo === 'pix' && d.pix && d.pix.chave) destinoSaque.value = d.pix.chave;
  }

  function avisoDadosDeSaque(texto, erro) {
    const el = document.getElementById('wallet-saque-status');
    if (!el) return;
    el.textContent = texto || '';
    el.classList.toggle('hidden', !texto);
    el.classList.toggle('text-rose-600', !!erro);
    el.classList.toggle('text-emerald-600', !erro);
  }

  document.querySelectorAll('[data-saque-metodo]').forEach(b => b.addEventListener('click', () => mostrarMetodoDeSaque(b.dataset.saqueMetodo)));
  // Máscaras: CPF (Pix tipo CPF e TED) e telefone (Pix tipo Telefone).
  document.getElementById('saque-ted-cpf')?.addEventListener('input', (e) => { e.target.value = mascaraCpf(e.target.value); });
  document.getElementById('saque-pix-chave')?.addEventListener('input', (e) => {
    const tipo = document.getElementById('saque-pix-tipo')?.value;
    if (tipo === 'cpf') e.target.value = mascaraCpf(e.target.value);
    if (tipo === 'telefone' && typeof maskBrazilPhone === 'function') e.target.value = maskBrazilPhone(e.target.value);
  });
  document.getElementById('saque-pix-tipo')?.addEventListener('change', () => {
    const chave = document.getElementById('saque-pix-chave');
    if (chave) { chave.value = ''; chave.focus(); }
  });

  document.getElementById('btn-salvar-dados-saque')?.addEventListener('click', async () => {
    const btn = document.getElementById('btn-salvar-dados-saque');
    const v = id => (document.getElementById(id)?.value || '').trim();
    let dados;
    if (metodoDeSaque === 'pix') {
      const tipo = v('saque-pix-tipo') || 'cpf';
      const chave = v('saque-pix-chave');
      if (!chave) return avisoDadosDeSaque('Informe a chave Pix.', true);
      if (tipo === 'cpf' && so_digitos(chave).length !== 11) return avisoDadosDeSaque('CPF incompleto.', true);
      if (tipo === 'email' && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(chave)) return avisoDadosDeSaque('E-mail inválido.', true);
      if (tipo === 'telefone' && so_digitos(chave).length < 10) return avisoDadosDeSaque('Telefone incompleto.', true);
      dados = { metodo: 'pix', pix: { tipo, chave } };
    } else {
      const ted = { banco: v('saque-ted-banco'), agencia: v('saque-ted-agencia'), conta: v('saque-ted-conta'), titular: v('saque-ted-titular'), cpf: v('saque-ted-cpf') };
      if (!ted.banco || !ted.agencia || !ted.conta || !ted.titular || !ted.cpf) return avisoDadosDeSaque('Preencha todos os dados bancários.', true);
      if (so_digitos(ted.cpf).length !== 11) return avisoDadosDeSaque('CPF do titular incompleto.', true);
      dados = { metodo: 'ted', ted };
    }
    const userId = window.loveClienteSession && window.loveClienteSession.user && window.loveClienteSession.user.id;
    if (!userId) return avisoDadosDeSaque('Sessão expirada. Entre de novo.', true);
    if (btn) { btn.disabled = true; btn.textContent = 'Salvando…'; }
    avisoDadosDeSaque('');
    const { error } = await supabaseClient.from('clientes').update({ dados_saque: dados }).eq('id', userId);
    if (btn) { btn.disabled = false; btn.textContent = 'Salvar'; }
    if (error) {
      console.error('Erro ao salvar dados de saque:', error);
      return avisoDadosDeSaque('Não foi possível salvar. Tente de novo.', true);
    }
    if (window.loveClienteProfile) window.loveClienteProfile.dados_saque = dados;
    avisoDadosDeSaque('Salvo');
    const resumo = document.getElementById('wallet-saque-resumo');
    if (resumo) resumo.textContent = resumoDosDadosDeSaque(dados);
    setTimeout(() => avisoDadosDeSaque(''), 2500);
  });

  function renderWalletTransactions() {
    const listEl = document.getElementById('wallet-transactions-list');
    const balanceDisponivel = document.getElementById('wallet-balance-disponivel');
    const balanceArrecadado = document.getElementById('wallet-balance-arrecadado');
    const balanceSacado = document.getElementById('wallet-balance-sacado');

    const activeEvent = getActiveEvent();

    if (balanceDisponivel) balanceDisponivel.textContent = `R$ ${activeEvent.wallet.saldoDisponivel.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
    if (balanceArrecadado) balanceArrecadado.textContent = `R$ ${(activeEvent.wallet.saldoDisponivel + activeEvent.wallet.totalSacado).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
    if (balanceSacado) balanceSacado.textContent = `R$ ${activeEvent.wallet.totalSacado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
    // Quantos presentes os convidados compraram = entradas do extrato
    // (antes era um "48" fixo do HTML de demonstração).
    const presentesCompradosEl = document.getElementById('wallet-presentes-comprados');
    if (presentesCompradosEl) {
      const qtd = (activeEvent.wallet.transactions || []).filter(tx => Number(tx.amount) > 0).length;
      presentesCompradosEl.textContent = qtd === 0 ? 'Nenhum presente comprado ainda'
        : `${qtd} ${qtd === 1 ? 'presente comprado' : 'presentes comprados'} por convidados`;
    }
    preencherDadosDeSaque();

    if (!listEl) return;
    listEl.innerHTML = '';

    // Pagamentos (comprovantes e pagamentos do orçamento) entram como saída.
    const pagamentos = getPagamentos().slice().sort((a, b) => String(b.pagoEm || '').localeCompare(String(a.pagoEm || '')));
    const transactions = pagamentos.map(p => ({
      title: p.descricao && p.descricao !== p.fornecedor ? `${p.fornecedor} — ${p.descricao}` : p.fornecedor,
      guest: p.vencimento ? `Vencimento ${dataISOParaBR(p.vencimento)}` : '',
      method: p.origem === 'orcamento' ? 'Orçamento' : 'Comprovante',
      date: dataISOParaBR(p.pagoEm),
      status: 'Pago',
      amount: -(Number(p.valor) || 0),
      comprovante: p.comprovante || null
    })).concat(activeEvent.wallet.transactions || []);
    if (!transactions.length) {
      listEl.innerHTML = '<tr class="linha-vazia"><td colspan="4" class="text-center text-sm text-zinc-500 py-12">Nenhuma movimentação por enquanto.</td></tr>';
      return;
    }

    // Mesmo padrão de célula de Meus convidados: título em semi-negrito,
    // demais colunas em cinza 13px (o espaçamento vem de .guests-table td).
    transactions.forEach(tx => {
      const isNegative = tx.amount < 0;
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>
          <span class="font-semibold text-zinc-900 block truncate">${escaparHtml(tx.title)}</span>
          <span class="text-[0.75rem] text-[#667085] block truncate">${escaparHtml([tx.guest, tx.method].filter(Boolean).join(' • '))}</span>
          ${tx.comprovante && tx.comprovante.url ? `<a href="${escaparHtml(tx.comprovante.url)}" target="_blank" rel="noopener" download="${escaparHtml(tx.comprovante.nome || 'comprovante')}" class="extrato-comprovante-link">Ver comprovante</a>` : (tx.comprovante ? `<span class="text-[0.75rem] text-[#667085]">${escaparHtml(tx.comprovante.nome || 'Comprovante')}</span>` : '')}
        </td>
        <td><span class="text-[0.8125rem] font-normal text-[#667085] whitespace-nowrap">${escaparHtml(tx.date)}</span></td>
        <td>
          <span class="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold font-sans whitespace-nowrap ${tx.status === 'Disponível' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-blue-50 text-blue-700 border border-blue-200'}">
            ● ${escaparHtml(tx.status)}
          </span>
        </td>
        <td class="text-right font-semibold whitespace-nowrap ${isNegative ? 'text-zinc-800' : 'text-emerald-600'}">
          ${isNegative ? '-' : '+'} R$ ${Math.abs(tx.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </td>
      `;
      listEl.appendChild(row);
    });
  }

  // Exportar (cabeçalho do Extrato): baixa as movimentações do evento ativo
  // em CSV (separador ";" e BOM, pra abrir certo no Excel em português).
  function exportarExtratoCsv() {
    const evento = getActiveEvent();
    const transacoes = getPagamentos().map(p => ({ title: p.descricao ? `${p.fornecedor} — ${p.descricao}` : p.fornecedor, guest: '', method: p.origem === 'orcamento' ? 'Orçamento' : 'Comprovante', date: dataISOParaBR(p.pagoEm), status: 'Pago', amount: -(Number(p.valor) || 0) }))
      .concat((evento && evento.wallet && evento.wallet.transactions) || []);
    const campo = valor => `"${String(valor ?? '').replace(/"/g, '""')}"`;
    const linhas = [
      ['Descrição', 'Convidado', 'Forma', 'Data', 'Status', 'Valor líquido (R$)'],
      ...transacoes.map(tx => [tx.title, tx.guest, tx.method, tx.date, tx.status, Number(tx.amount || 0).toFixed(2).replace('.', ',')])
    ];
    const csv = '﻿' + linhas.map(l => l.map(campo).join(';')).join('\r\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `extrato-${(evento && (evento.slug || evento.id)) || 'evento'}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  document.getElementById('btn-wallet-export')?.addEventListener('click', exportarExtratoCsv);

  // Saque PIX da comemoração ativa
  const formWithdrawPix = document.getElementById('form-withdraw-pix');
  if (formWithdrawPix) {
    formWithdrawPix.addEventListener('submit', (e) => {
      e.preventDefault();
      const activeEvent = getActiveEvent();
      const amountInput = document.getElementById('pix-withdraw-amount');
      const val = parseFloat(amountInput.value) || 1000;

      if (val > activeEvent.wallet.saldoDisponivel) {
        alert('O valor solicitado é maior que o saldo disponível para saque neste evento.');
        return;
      }

      activeEvent.wallet.saldoDisponivel -= val;
      activeEvent.wallet.totalSacado += val;
      activeEvent.wallet.transactions.unshift({
        id: `tx-${Date.now().toString().slice(-4)}`,
        type: 'withdrawal',
        title: `Transferência PIX (${activeEvent.title})`,
        guest: 'Solicitado via Dashboard',
        date: 'Agora mesmo',
        amount: -val,
        status: 'Concluído',
        method: 'PIX Instantâneo'
      });

      closeModal(elements.modals.withdrawPix);
      renderWalletTransactions();
      showToast(`Saque PIX de R$ ${val.toFixed(2).replace('.', ',')} transferido com sucesso!`, '💸');
      triggerConfetti();
    });
  }

  document.querySelectorAll('.btn-trigger-withdraw-pix').forEach(btn => {
    btn.addEventListener('click', () => {
      const activeEvent = getActiveEvent();
      const maxAmountEl = document.getElementById('pix-modal-max-amount');
      const amountInput = document.getElementById('pix-withdraw-amount');
      if (activeEvent && activeEvent.wallet) {
        if (maxAmountEl) maxAmountEl.textContent = `R$ ${activeEvent.wallet.saldoDisponivel.toFixed(2).replace('.', ',')}`;
        if (amountInput) amountInput.max = activeEvent.wallet.saldoDisponivel;
      }
      openModal(elements.modals.withdrawPix);
    });
  });

  // ==========================================
  // 8.5 MÓDULO DE ORÇAMENTO & ONBOARDING POPUP
  // ==========================================
  window.navigateToBudget = function() {
    pendingSubItemId = 'wallet-budget';
    switchRailTab('wallet');
    if (elements.drawerSubItemsList) {
      elements.drawerSubItemsList.querySelectorAll('.sub-drawer-item').forEach(b => {
        b.classList.toggle('active', b.textContent.includes('Orçamento'));
      });
    }
    switchWalletSubSection('wallet-budget', 'Orçamento');
  };

  // Home (Mais recursos › Save the Date e o passo "Escolher Save the Date" do
  // guia): abre Personalizar evento › Aparência já na página Save the Date.
  // Guia › "Personalizar site do evento": Aparência já no Convite Digital.
  window.navigateToConviteDigital = function() {
    state.activeSubSection = 'home';
    pendingSubItemId = 'home';
    switchRailTab('edit-site');
    setTimeout(() => {
      if (typeof window.switchBuilderPage === 'function') window.switchBuilderPage('convite');
    }, 150);
  };

  window.navigateToSaveTheDate = function() {
    state.activeSubSection = 'home';
    pendingSubItemId = 'home';
    switchRailTab('edit-site');
    setTimeout(() => {
      if (typeof window.switchBuilderPage === 'function') window.switchBuilderPage('savethedate');
    }, 150);
  };

  // Guia de primeiros passos › "Favoritar primeiros fornecedores": Fornecedores › Explorar.
  window.navigateToExplorarFornecedores = function() {
    if (state.currentTab === 'b2b') { abrirSubItem('b2b', 'explore'); return; }
    pendingSubItemId = 'explore';
    switchRailTab('b2b');
  };

  window.navigateToTables = function() {
    pendingSubItemId = 'tables';
    switchRailTab('rsvp');
    if (elements.drawerSubItemsList) {
      elements.drawerSubItemsList.querySelectorAll('.sub-drawer-item').forEach(b => {
        b.classList.toggle('active', b.textContent.includes('Mapa do evento'));
      });
    }
    document.querySelectorAll('.dashboard-tab-content').forEach(c => c.classList.remove('active'));
    const target = document.getElementById('tab-rsvp-tables');
    if (target) target.classList.add('active');
    renderTablesOrganization();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  window.navigateToStationery = function() {
    switchRailTab('edit-site');
    if (elements.drawerSubItemsList) {
      elements.drawerSubItemsList.querySelectorAll('.sub-drawer-item').forEach(b => {
        b.classList.toggle('active', b.textContent.includes('Produzir convite'));
      });
    }
    switchEditorSubSection('invite-print', 'Produzir convite');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Carrossel promocional do dashboard. Os slides vivem em
  // conteudo_plataforma e são editados no Admin (Informações → Banner da
  // home); o array abaixo é só a rede de segurança para quando o banco não
  // responder — editar ou excluir lá reflete aqui.
  const dashboardPromoFallback = [
    { src: 'assets/banner_high_quality.jpg', alt: 'High quality, not high cost - Designs that will wow your guests without blowing your budget.' }
  ];
  let dashboardPromoSlides = dashboardPromoFallback;

  async function carregarPromoDoAdmin() {
    try {
      const { data, error } = await supabaseClient
        .from('conteudo_plataforma')
        .select('titulo, descricao, imagem_url, link_url, posicao')
        .eq('plataforma', 'cliente')
        .eq('secao', 'banner')
        .eq('ativo', true)
        .order('posicao', { ascending: true });
      if (error) throw error;
      // Zero banners é uma resposta válida: o admin excluiu tudo e o card sai do ar.
      return (data || []).map(b => ({
        src: b.imagem_url || '',
        alt: b.titulo || b.descricao || '',
        titulo: b.titulo || '',
        descricao: b.descricao || '',
        href: b.link_url || ''
      }));
    } catch (err) {
      console.warn('Banner do dashboard: mantendo a imagem padrão.', err);
      return null;
    }
  }

  async function initDashboardPromoCarousel() {
    const track = document.getElementById('dashboard-promo-track');
    const dotsWrap = document.getElementById('dashboard-promo-dots');
    if (!track) return;

    const doAdmin = await carregarPromoDoAdmin();
    if (doAdmin) dashboardPromoSlides = doAdmin;

    if (!dashboardPromoSlides.length) {
      document.getElementById('dashboard-promo-carousel')?.remove();
      return;
    }

    track.innerHTML = dashboardPromoSlides.map((s, i) => `
      <div class="dashboard-promo-slide${i === 0 ? ' active' : ''}" data-promo-href="${encodeURI(s.href || '')}" title="${s.titulo || 'Ver modelos de convites e papelaria'}">
        <img src="${s.src}" alt="${s.alt}">
      </div>
    `).join('');

    // Sem link cadastrado o slide continua levando para a papelaria, como antes.
    // Link externo abre em nova aba; link interno navega na mesma.
    track.querySelectorAll('.dashboard-promo-slide').forEach(slide => {
      slide.addEventListener('click', () => {
        const href = slide.dataset.promoHref;
        if (!href) return navigateToStationery();
        if (/^https?:\/\//i.test(href)) window.open(href, '_blank', 'noopener');
        else window.location.href = href;
      });
    });

    if (dashboardPromoSlides.length <= 1) {
      if (dotsWrap) dotsWrap.innerHTML = '';
      return;
    }

    if (dotsWrap) {
      dotsWrap.innerHTML = dashboardPromoSlides.map((_, i) =>
        `<button type="button" class="dashboard-promo-dot${i === 0 ? ' active' : ''}" data-slide-index="${i}" aria-label="Slide ${i + 1}"></button>`
      ).join('');
    }

    let current = 0;
    const getSlides = () => track.querySelectorAll('.dashboard-promo-slide');
    const getDots = () => dotsWrap ? dotsWrap.querySelectorAll('.dashboard-promo-dot') : [];

    function goToSlide(index) {
      getSlides().forEach((el, i) => el.classList.toggle('active', i === index));
      getDots().forEach((el, i) => el.classList.toggle('active', i === index));
      current = index;
    }

    let timer = setInterval(() => goToSlide((current + 1) % dashboardPromoSlides.length), 4500);

    getDots().forEach(dot => {
      dot.addEventListener('click', (e) => {
        e.stopPropagation();
        clearInterval(timer);
        goToSlide(parseInt(dot.dataset.slideIndex));
        timer = setInterval(() => goToSlide((current + 1) % dashboardPromoSlides.length), 4500);
      });
    });
  }
  initDashboardPromoCarousel();

  window.navigateToPix = function() {
    switchRailTab('wallet');
    if (elements.drawerSubItemsList) {
      elements.drawerSubItemsList.querySelectorAll('.sub-drawer-item').forEach(b => {
        b.classList.toggle('active', b.textContent.includes('Carteira Digital'));
      });
    }
    switchWalletSubSection('wallet-digital', 'Carteira Digital');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  window.openShareModal = function() {
    const modal = document.getElementById('modal-share-event-site');
    if (modal) modal.classList.remove('hidden');
  };

  // Botão "Checklist do Evento" no dashboard: leva direto pra Convidados → Checklist.
  window.navigateToChecklist = function() {
    pendingSubItemId = 'checklist';
    switchRailTab('rsvp');
    switchRsvpSubSection('checklist');
  };

  window.navigateToVendors = function() {
    switchRailTab('b2b');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  function checkAndPromptBudgetSetup() {
    const activeEv = getActiveEvent();
    if (!activeEv) return;

    const isConfigured = Boolean(
      activeEv.budgetConfigured || 
      (activeEv.budgetTotal && activeEv.budgetTotal > 0) ||
      localStorage.getItem(`love_budget_configured_${activeEv.id}`) === 'true'
    );

    if (isConfigured) {
      updateBudgetKPIs();
      return;
    }

    const modal = document.getElementById('modal-setup-budget');
    if (!modal) return;

    const inputLoc = document.getElementById('budget-setup-location');
    const inputGuests = document.getElementById('budget-setup-guests');
    const inputTotal = document.getElementById('budget-setup-total');
    const reqMsg = document.getElementById('budget-setup-required-msg');

    if (reqMsg) reqMsg.classList.add('hidden');
    if (inputTotal) {
      inputTotal.classList.remove('border-rose-500', 'ring-2', 'ring-rose-500/20');
      inputTotal.value = '';
    }

    // Localização preenchida se já salva no evento
    if (inputLoc) {
      const hasLoc = activeEv.location && activeEv.location.trim() !== '' && activeEv.location !== 'Adicionar Local';
      inputLoc.value = hasLoc ? activeEv.location : '';
    }

    // Quantidade de convidados
    if (inputGuests) {
      const g = activeEv.convidadosTotal || (activeEv.convidadosConfirmados > 0 ? activeEv.convidadosConfirmados : 100);
      inputGuests.value = g;
    }

    updateBudgetSetupPreview();
    openModal(modal);
  }

  function updateBudgetSetupPreview() {
    const activeEv = getActiveEvent();
    const inputLoc = document.getElementById('budget-setup-location');
    const inputGuests = document.getElementById('budget-setup-guests');
    const inputTotal = document.getElementById('budget-setup-total');

    const previewLoc = document.getElementById('budget-preview-loc');
    const previewGuests = document.getElementById('budget-preview-guests');
    const previewRange = document.getElementById('budget-preview-range');
    const previewAvg = document.getElementById('budget-preview-avg');
    const donutAmount = document.getElementById('budget-donut-amount');
    const pillVal = document.getElementById('budget-preview-pill-val');

    let loc = (inputLoc && inputLoc.value.trim()) || (activeEv && activeEv.location && activeEv.location !== 'Adicionar Local' ? activeEv.location : 'São Paulo, SP');
    if (previewLoc) previewLoc.textContent = loc;

    let guests = parseInt(inputGuests ? inputGuests.value : 100, 10);
    if (isNaN(guests) || guests <= 0) guests = 100;
    if (previewGuests) previewGuests.textContent = guests.toLocaleString('pt-BR');

    let rawTotal = inputTotal ? inputTotal.value.replace(/\D/g, '') : '';
    let totalVal = rawTotal ? parseInt(rawTotal, 10) : null;

    const minEst = Math.round(guests * 570);
    const maxEst = Math.round(guests * 860);
    const avgEst = Math.round(guests * 720);

    const formatK = (val) => `${Math.round(val / 1000)}k`;

    if (previewRange) previewRange.textContent = `R$ ${formatK(minEst)}–R$ ${formatK(maxEst)}`;
    if (previewAvg) previewAvg.textContent = `R$ ${formatK(avgEst)}`;

    const displayAmount = totalVal || avgEst;
    if (donutAmount) donutAmount.textContent = `R$ ${displayAmount.toLocaleString('pt-BR')}`;

    const venueAmount = Math.round(displayAmount * 0.208);
    if (pillVal) pillVal.textContent = `R$ ${venueAmount.toLocaleString('pt-BR')}`;
  }

  function initBudgetSetupModal() {
    const modal = document.getElementById('modal-setup-budget');
    if (!modal) return;

    const inputLoc = document.getElementById('budget-setup-location');
    const inputGuests = document.getElementById('budget-setup-guests');
    const inputTotal = document.getElementById('budget-setup-total');
    const reqMsg = document.getElementById('budget-setup-required-msg');
    const btnSubmit = document.getElementById('btn-submit-budget-setup');

    if (inputLoc) inputLoc.addEventListener('input', updateBudgetSetupPreview);
    if (inputGuests) inputGuests.addEventListener('input', updateBudgetSetupPreview);

    if (inputTotal) {
      inputTotal.addEventListener('input', (e) => {
        let val = e.target.value.replace(/\D/g, '');
        if (val) {
          const num = parseInt(val, 10);
          e.target.value = num.toLocaleString('pt-BR');
          if (reqMsg) reqMsg.classList.add('hidden');
          inputTotal.classList.remove('border-rose-500', 'ring-2', 'ring-rose-500/20');
        } else {
          e.target.value = '';
        }
        updateBudgetSetupPreview();
      });
    }

    if (btnSubmit) {
      btnSubmit.addEventListener('click', () => {
        const activeEv = getActiveEvent();
        if (!activeEv) return;

        const rawTotal = inputTotal ? inputTotal.value.replace(/\D/g, '') : '';
        const totalNum = parseInt(rawTotal, 10);

        if (!rawTotal || isNaN(totalNum) || totalNum <= 0) {
          if (reqMsg) reqMsg.classList.remove('hidden');
          if (inputTotal) {
            inputTotal.classList.add('border-rose-500', 'ring-2', 'ring-rose-500/20');
            inputTotal.focus();
          }
          return;
        }

        activeEv.budgetTotal = totalNum;
        activeEv.budgetConfigured = true;

        if (inputLoc && inputLoc.value.trim()) {
          activeEv.location = inputLoc.value.trim();
          atualizarLocalDaHome();
          const fieldLoc = document.getElementById('field-event-location');
          if (fieldLoc) fieldLoc.value = activeEv.location;
        }

        if (inputGuests && inputGuests.value) {
          const g = parseInt(inputGuests.value, 10);
          if (g > 0) activeEv.convidadosTotal = g;
        }

        try {
          localStorage.setItem(`love_budget_configured_${activeEv.id}`, 'true');
          localStorage.setItem(`love_budget_total_${activeEv.id}`, totalNum.toString());
        } catch (e) {}

        if (typeof window.markPlatformTaskAchieved === 'function') {
          window.markPlatformTaskAchieved('budget');
        }

        updateBudgetKPIs();
        closeModal(modal);
        showToast('Orçamento definido com sucesso!', '✨');
      });
    }
  }

  function getContractedVendorsList() {
    const list = [];
    if (window.LOVE_DATA && Array.isArray(window.LOVE_DATA.contractedVendors)) {
      window.LOVE_DATA.contractedVendors.forEach(v => {
        if (v.name && !list.some(item => item.name.toLowerCase() === v.name.toLowerCase())) {
          list.push({ name: v.name, category: v.category || '' });
        }
      });
    }
    const activeEv = getActiveEvent();
    if (activeEv && Array.isArray(activeEv.fornecedores)) {
      activeEv.fornecedores.forEach(v => {
        const name = typeof v === 'string' ? v : v.name;
        if (name && !list.some(item => item.name.toLowerCase() === name.toLowerCase())) {
          list.push({ name, category: v.category || '' });
        }
      });
    }
    return list;
  }

  // Contratos fechados com fornecedores (Meus contratos) viram itens do
  // orçamento automaticamente: valor do contrato = custo real, já pago =
  // pago. Não dá para apagar daqui — eles vêm do contrato.
  function itensDeContratosParaOrcamento() {
    const lista = (window.LOVE_DATA && Array.isArray(window.LOVE_DATA.contractedVendors)) ? window.LOVE_DATA.contractedVendors : [];
    return lista.map(v => ({
      id: `contrato-${v.id}`,
      item: v.service || v.name || 'Contrato',
      vendor: v.name || '',
      category: v.category || 'Contrato',
      estimated: Number(v.negotiatedValueNum) || 0,
      actual: Number(v.negotiatedValueNum) || 0,
      paid: Number(v.paidValueNum) || 0,
      vencimentos: Array.isArray(v.parcelas) ? v.parcelas : (Array.isArray(v.installments) ? v.installments : []),
      proximoVencimento: v.proximoVencimento || v.dueDate || null,
      doContrato: true
    }));
  }

  function getBudgetExpenses() {
    const proprias = getBudgetExpensesProprias();
    const contratos = itensDeContratosParaOrcamento()
      .filter(c => !proprias.some(p => (p.vendor || '').toLowerCase() === (c.vendor || '').toLowerCase() && (p.item || '').toLowerCase() === (c.item || '').toLowerCase()));
    return contratos.concat(proprias);
  }

  function getBudgetExpensesProprias() {
    const activeEv = getActiveEvent();
    if (!activeEv) return [];

    try {
      const stored = localStorage.getItem(`love_budget_expenses_${activeEv.id}`);
      if (stored) return JSON.parse(stored);
    } catch (e) {}

    return [
      {
        id: 'exp-1',
        item: 'Espaço Quintal da Villa',
        vendor: 'Villa Bisutti Casa do Ator',
        category: 'Local',
        estimated: 25000,
        actual: 22000,
        paid: 15000
      },
      {
        id: 'exp-2',
        item: 'Buffet Gastronomia Nobre',
        vendor: 'Buffet Gastronomia Nobre',
        category: 'Alimentação',
        estimated: 18000,
        actual: 16500,
        paid: 10000
      },
      {
        id: 'exp-3',
        item: 'Estúdio Fotografia & Cinema',
        vendor: 'Estúdio Fotografia & Cinema',
        category: 'Fotografia e mídia',
        estimated: 8000,
        actual: 7800,
        paid: 7800
      },
      {
        id: 'exp-4',
        item: 'Decoração Floral Jardim Real',
        vendor: 'Decoração Floral Jardim Real',
        category: 'Decoração',
        estimated: 10000,
        actual: 6200,
        paid: 3000
      },
      {
        id: 'exp-5',
        item: 'DJ & Iluminação Pista',
        vendor: '',
        category: 'Música',
        estimated: 5500,
        actual: 0,
        paid: 0
      },
      {
        id: 'exp-6',
        item: 'Bar de Coquetéis & Drinks',
        vendor: '',
        category: 'Serviços de bar',
        estimated: 4200,
        actual: 0,
        paid: 0
      }
    ];
  }

  function saveBudgetExpenses(expenses) {
    const activeEv = getActiveEvent();
    if (!activeEv) return;
    try {
      localStorage.setItem(`love_budget_expenses_${activeEv.id}`, JSON.stringify((expenses || []).filter(e => !e.doContrato)));
    } catch (e) {}
  }

  function renderBudgetExpensesTable() {
    const tbody = document.getElementById('budget-expenses-tbody');
    if (!tbody) return;

    const expenses = getBudgetExpenses();
    const brl = v => `R$ ${Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
    let totalEstimated = 0;
    let totalActual = 0;
    let totalPaid = 0;

    tbody.innerHTML = expenses.length ? expenses.map((exp) => {
      const estimatedNum = Number(exp.estimated) || 0;
      const actualNum = Number(exp.actual) || 0;
      const paidNum = Number(exp.paid) || 0;
      const falta = Math.max(0, actualNum - paidNum);
      const pct = actualNum > 0 ? Math.min(100, Math.round((paidNum / actualNum) * 100)) : 0;
      totalEstimated += estimatedNum;
      totalActual += actualNum;
      totalPaid += paidNum;
      const temFornecedor = exp.vendor && exp.vendor.trim() !== '';

      return `
        <tr data-despesa-id="${escaparHtml(exp.id)}">
          <td>
            <span class="block text-zinc-900">${escaparHtml(exp.item)}</span>
            <span class="block text-xs text-zinc-500">${escaparHtml(exp.category || 'Geral')}</span>
          </td>
          <td>
            ${temFornecedor
              ? `<span class="text-zinc-900">${escaparHtml(exp.vendor)}</span>`
              : `<button type="button" class="orcamento-add-fornecedor" data-despesa-fornecedor="${escaparHtml(exp.id)}">+ Adicionar fornecedor</button>`}
          </td>
          <td class="whitespace-nowrap">${actualNum > 0 ? brl(actualNum) : '—'}</td>
          <td class="whitespace-nowrap">${paidNum > 0 ? brl(paidNum) : '—'}</td>
          <td class="whitespace-nowrap">
            <span class="block">${actualNum > 0 ? brl(falta) : '—'}</span>
            ${actualNum > 0 ? `<div class="orcamento-barra orcamento-barra--linha" title="${pct}% pago"><div style="width:${pct}%"></div></div>` : ''}
          </td>
          <td class="love-tabela-col-mais">${botaoVerMaisHtml('Ver despesa')}</td>
        </tr>`;
    }).join('') : '<tr class="linha-vazia"><td colspan="6" class="text-center text-sm text-zinc-500 py-12">Nenhuma despesa ainda. Use "Adicionar despesa" no topo.</td></tr>';

    // Ver mais (⋯) e "+ Adicionar fornecedor" abrem o drawer da despesa.
    tbody.querySelectorAll('[data-despesa-id]').forEach(tr => {
      tr.querySelector('.love-tabela-mais')?.addEventListener('click', (e) => {
        e.stopPropagation();
        abrirDespesaNoDrawer(tr.dataset.despesaId);
      });
    });
    tbody.querySelectorAll('[data-despesa-fornecedor]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        abrirDespesaNoDrawer(btn.dataset.despesaFornecedor, { focoFornecedor: true });
      });
    });

    // Resumo do topo: orçamento, custo real, saldo pago, saldo a pagar + barra.
    const activeEv = getActiveEvent();
    let savedTotal = activeEv && activeEv.budgetTotal;
    if (!savedTotal && activeEv) {
      const stored = localStorage.getItem(`love_budget_total_${activeEv.id}`);
      if (stored) savedTotal = parseInt(stored, 10);
    }
    if (!savedTotal) savedTotal = totalEstimated || 0;
    const due = Math.max(0, totalActual - totalPaid);
    const pctTotal = totalActual > 0 ? Math.min(100, Math.round((totalPaid / totalActual) * 100)) : 0;
    const set = (id, txt) => { const el = document.getElementById(id); if (el) el.textContent = txt; };
    set('kpi-budget-total', brl(savedTotal));
    set('kpi-budget-spent', brl(totalActual));
    set('kpi-budget-paid-total', brl(totalPaid));
    set('kpi-budget-due', brl(due));
    set('kpi-budget-pct', `${pctTotal}% pago`);
    const barra = document.getElementById('kpi-budget-barra');
    if (barra) barra.style.width = `${pctTotal}%`;
  }

  // ---- Pagamentos (Extrato): tudo que foi pago — comprovantes enviados e
  // pagamentos lançados no orçamento. Guardado por evento no navegador. ----
  function chavePagamentos() { const ev = getActiveEvent(); return ev ? `love_pagamentos_${ev.id}` : null; }
  function getPagamentos() {
    const k = chavePagamentos();
    if (!k) return [];
    try { return JSON.parse(localStorage.getItem(k) || '[]'); } catch (e) { return []; }
  }
  function savePagamentos(lista) {
    const k = chavePagamentos();
    if (!k) return true;
    try { localStorage.setItem(k, JSON.stringify(lista)); return true; } catch (e) { return false; }
  }
  function registrarPagamento(p) {
    const lista = getPagamentos();
    lista.unshift(Object.assign({ id: `pag-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, criadoEm: new Date().toISOString() }, p));
    return savePagamentos(lista);
  }
  function hojeISO() { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; }
  function dataISOParaBR(iso) {
    if (!iso) return '';
    const d = /^\d{4}-\d{2}-\d{2}$/.test(String(iso)) ? new Date(`${iso}T12:00:00`) : new Date(iso);
    return isNaN(d) ? String(iso) : d.toLocaleDateString('pt-BR');
  }

  // Drawer da despesa: abre a despesa (ver/editar). Itens que vêm de um
  // contrato são só leitura.
  function abrirDespesaNoDrawer(id, opts = {}) {
    const exp = getBudgetExpenses().find(e => e.id === id);
    if (!exp || typeof window.__abrirDrawerDespesa !== 'function') return;
    window.__abrirDrawerDespesa(exp, opts);
  }

  // ---- Drawer "Adicionar comprovante" (Extrato) ----
  (function initComprovante() {
    const drawer = document.getElementById('drawer-add-comprovante');
    const backdrop = document.getElementById('comprovante-drawer-backdrop');
    const form = document.getElementById('form-add-comprovante');
    if (!drawer || !form) return;
    const arquivo = document.getElementById('comprovante-arquivo');
    const preview = document.getElementById('comprovante-preview');
    const textoUpload = document.getElementById('comprovante-upload-texto');
    const valor = document.getElementById('comprovante-valor');
    const fornecedor = document.getElementById('comprovante-fornecedor');
    const vencimento = document.getElementById('comprovante-vencimento');
    const pagoEm = document.getElementById('comprovante-pago-em');
    const erro = document.getElementById('comprovante-erro');
    let comprovante = null;

    const fechar = () => {
      drawer.classList.remove('open'); drawer.style.setProperty('display', 'none', 'important'); drawer.classList.add('hidden');
      backdrop?.classList.remove('open'); backdrop?.style.setProperty('display', 'none', 'important'); backdrop?.classList.add('hidden');
    };
    const abrir = () => {
      form.reset(); comprovante = null; erro.classList.add('hidden');
      preview.classList.add('hidden'); preview.removeAttribute('src');
      textoUpload.textContent = 'Clique para enviar a imagem ou o PDF';
      pagoEm.value = hojeISO();
      const nomes = [...new Set(getBudgetExpenses().map(e => (e.vendor || '').trim()).filter(Boolean))];
      document.getElementById('comprovante-fornecedores-lista').innerHTML = nomes.map(n => `<option value="${escaparHtml(n)}"></option>`).join('');
      backdrop?.classList.remove('hidden'); backdrop?.style.setProperty('display', 'block', 'important'); backdrop?.classList.add('open');
      drawer.classList.remove('hidden'); drawer.style.setProperty('display', 'flex', 'important'); drawer.classList.add('open');
    };
    window.__abrirDrawerComprovante = abrir;
    document.getElementById('btn-add-comprovante')?.addEventListener('click', abrir);
    document.getElementById('btn-close-comprovante-drawer')?.addEventListener('click', fechar);
    backdrop?.addEventListener('click', fechar);

    valor.addEventListener('input', (e) => {
      const v = e.target.value.replace(/\D/g, '');
      e.target.value = v ? (parseFloat(v) / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '';
    });

    // Imagem: reduzida para caber no navegador (até 1200px, JPEG). PDF: guarda
    // o arquivo se for pequeno; senão só o nome.
    arquivo.addEventListener('change', () => {
      const f = arquivo.files && arquivo.files[0];
      if (!f) return;
      textoUpload.textContent = f.name;
      const leitor = new FileReader();
      if (f.type.startsWith('image/')) {
        leitor.onload = () => {
          const img = new Image();
          img.onload = () => {
            const escala = Math.min(1, 1200 / Math.max(img.width, img.height));
            const c = document.createElement('canvas');
            c.width = Math.round(img.width * escala); c.height = Math.round(img.height * escala);
            c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
            comprovante = { nome: f.name, tipo: 'imagem', url: c.toDataURL('image/jpeg', 0.72) };
            preview.src = comprovante.url; preview.classList.remove('hidden');
          };
          img.src = leitor.result;
        };
        leitor.readAsDataURL(f);
      } else {
        if (f.size > 1.5 * 1024 * 1024) { comprovante = { nome: f.name, tipo: 'pdf', url: null }; return; }
        leitor.onload = () => { comprovante = { nome: f.name, tipo: 'pdf', url: leitor.result }; };
        leitor.readAsDataURL(f);
      }
    });

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      erro.classList.add('hidden');
      const num = parseFloat((valor.value || '').replace(/\./g, '').replace(',', '.')) || 0;
      const quem = (fornecedor.value || '').trim();
      const mostrarErro = (m) => { erro.textContent = m; erro.classList.remove('hidden'); };
      if (num <= 0) return mostrarErro('Informe o valor pago.');
      if (!quem) return mostrarErro('Informe o fornecedor ou uma descrição (ex.: Uber).');
      if (!pagoEm.value) return mostrarErro('Informe a data do pagamento.');

      // Fornecedor do orçamento: abate do saldo a pagar do primeiro item dele em aberto.
      const proprias = getBudgetExpensesProprias();
      const alvo = proprias.find(x => (x.vendor || '').trim().toLowerCase() === quem.toLowerCase() && (Number(x.actual) || 0) > (Number(x.paid) || 0))
        || proprias.find(x => (x.vendor || '').trim().toLowerCase() === quem.toLowerCase());
      if (alvo) { alvo.paid = (Number(alvo.paid) || 0) + num; saveBudgetExpenses(proprias); }

      const ok = registrarPagamento({
        valor: num, fornecedor: quem, descricao: alvo ? alvo.item : '',
        vencimento: vencimento.value || null, pagoEm: pagoEm.value,
        comprovante, origem: 'comprovante', despesaId: alvo ? alvo.id : null
      });
      if (!ok) {
        // Sem espaço no navegador: salva sem o arquivo.
        registrarPagamento({ valor: num, fornecedor: quem, descricao: alvo ? alvo.item : '', vencimento: vencimento.value || null, pagoEm: pagoEm.value, comprovante: comprovante ? { nome: comprovante.nome, tipo: comprovante.tipo, url: null } : null, origem: 'comprovante', despesaId: alvo ? alvo.id : null });
      }
      fechar();
      renderBudgetExpensesTable();
      if (typeof renderWalletTransactions === 'function') renderWalletTransactions();
    });
  })();

  // Cronograma: o que falta pagar de cada item (contratos primeiro), com as
  // datas de vencimento quando o contrato tem parcelas.
  function abrirCronogramaDePagamentos() {
    const modal = document.getElementById('modal-cronograma-pagamentos');
    const lista = document.getElementById('cronograma-pagamentos-lista');
    if (!modal || !lista) return;
    const brl = v => `R$ ${Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
    // "2026-11-10" é dia, não instante: lê no fuso local (senão vira dia 9).
    const paraData = d => (/^\d{4}-\d{2}-\d{2}$/.test(String(d)) ? new Date(String(d) + 'T12:00:00') : new Date(d));
    const dataBR = d => { const x = paraData(d); return isNaN(x) ? String(d) : x.toLocaleDateString('pt-BR'); };
    const linhas = [];
    getBudgetExpenses().forEach(exp => {
      const falta = Math.max(0, (Number(exp.actual) || 0) - (Number(exp.paid) || 0));
      if (falta <= 0) return;
      const parcelas = (exp.vencimentos || []).filter(p => p && !p.pago && (p.vencimento || p.data || p.dueDate));
      if (parcelas.length) {
        parcelas.forEach(p => linhas.push({ quando: p.vencimento || p.data || p.dueDate, nome: exp.vendor || exp.item, item: exp.item, valor: Number(p.valor || p.value) || 0 }));
      } else {
        linhas.push({ quando: exp.proximoVencimento || null, nome: exp.vendor || exp.item, item: exp.item, valor: falta });
      }
    });
    linhas.sort((a, b) => (a.quando ? paraData(a.quando).getTime() : Infinity) - (b.quando ? paraData(b.quando).getTime() : Infinity));
    lista.innerHTML = linhas.length ? linhas.map(l => `
      <div class="cronograma-linha">
        <div class="cronograma-data">${l.quando ? escaparHtml(dataBR(l.quando)) : 'A combinar'}</div>
        <div class="min-w-0 flex-1">
          <p class="text-sm font-semibold text-zinc-900 truncate">${escaparHtml(l.nome)}</p>
          ${l.item && l.item !== l.nome ? `<p class="text-xs text-zinc-500 truncate">${escaparHtml(l.item)}</p>` : ''}
        </div>
        <div class="text-sm font-bold text-zinc-900 whitespace-nowrap">${brl(l.valor)}</div>
      </div>`).join('')
      : '<p class="text-sm text-zinc-500">Nenhum pagamento em aberto. Tudo quitado!</p>';
    openModal(modal);
  }
  const btnCronograma = document.getElementById('btn-cronograma-pagamentos');
  btnCronograma?.addEventListener('click', abrirCronogramaDePagamentos);
  btnCronograma?.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); abrirCronogramaDePagamentos(); } });

  window.deleteBudgetExpense = function(expId) {
    let expenses = getBudgetExpenses();
    expenses = expenses.filter(e => e.id !== expId);
    saveBudgetExpenses(expenses);
    renderBudgetExpensesTable();
    showToast('Item removido do orçamento.', '🗑️');
  };

  window.openAddExpenseModalWithItem = function(expId, encodedItem, encodedCategory) {
    const modal = document.getElementById('modal-add-budget-expense');
    if (!modal) return;
    const inputItem = document.getElementById('expense-item-name');
    const selectCat = document.getElementById('expense-category-select');
    const inputVendor = document.getElementById('expense-vendor-input');

    if (inputItem) inputItem.value = decodeURIComponent(encodedItem || '');
    if (selectCat) selectCat.value = decodeURIComponent(encodedCategory || 'Local');
    if (inputVendor) {
      inputVendor.value = '';
      inputVendor.focus();
    }
    openModal(modal);
  };

  function initAddBudgetExpenseModal() {
    const drawer = document.getElementById('drawer-add-budget-expense');
    const backdrop = document.getElementById('budget-expense-drawer-backdrop');
    const btnOpen = document.getElementById('btn-open-add-expense');
    const btnClose = document.getElementById('btn-close-add-expense-drawer');
    const form = document.getElementById('form-add-budget-expense');
    const inputVendor = document.getElementById('expense-vendor-input');
    const suggestionsBox = document.getElementById('expense-vendor-suggestions');
    const selectCat = document.getElementById('expense-category-select');

    const openDrawer = (exp, opts = {}) => {
      if (form) form.reset();
      if (suggestionsBox) suggestionsBox.classList.add('hidden');
      // exp = despesa existente (ver/editar) | nada = nova despesa.
      const editando = exp && exp.id;
      const soLeitura = !!(editando && exp.doContrato);
      if (form) form.dataset.editId = editando ? exp.id : '';
      const fmt = v => (Number(v) || 0) ? Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '';
      const titulo = document.getElementById('despesa-drawer-titulo');
      const sub = document.getElementById('despesa-drawer-sub');
      const textoBtn = document.getElementById('btn-submit-add-expense-texto');
      if (titulo) titulo.textContent = editando ? (exp.item || 'Despesa') : 'Adicionar despesa';
      if (sub) sub.textContent = soLeitura ? 'Este item vem de um contrato fechado com o fornecedor.' : (editando ? 'Veja e atualize esta despesa. Um aumento no saldo pago entra no extrato.' : 'Cadastre um item para acompanhar no seu orçamento.');
      if (textoBtn) textoBtn.textContent = editando ? 'Salvar alterações' : 'Adicionar despesa';
      if (editando) {
        document.getElementById('expense-item-name').value = exp.item || '';
        if (inputVendor) inputVendor.value = exp.vendor || '';
        if (selectCat && exp.category) selectCat.value = exp.category;
        document.getElementById('expense-estimated-input').value = fmt(exp.estimated);
        document.getElementById('expense-actual-input').value = fmt(exp.actual);
        document.getElementById('expense-paid-input').value = fmt(exp.paid);
      }
      form?.querySelectorAll('input, select').forEach(el => { el.disabled = soLeitura; });
      document.getElementById('btn-submit-add-expense')?.classList.toggle('hidden', soLeitura);
      if (opts.focoFornecedor) setTimeout(() => inputVendor?.focus(), 50);
      if (backdrop) {
        backdrop.classList.remove('hidden');
        backdrop.style.setProperty('display', 'block', 'important');
        backdrop.classList.add('open');
      }
      if (drawer) {
        drawer.classList.remove('hidden');
        drawer.style.setProperty('display', 'flex', 'important');
        drawer.classList.add('open');
      }
    };

    const closeDrawer = () => {
      if (drawer) {
        drawer.classList.remove('open');
        drawer.style.setProperty('display', 'none', 'important');
        drawer.classList.add('hidden');
      }
      if (backdrop) {
        backdrop.classList.remove('open');
        backdrop.style.setProperty('display', 'none', 'important');
        backdrop.classList.add('hidden');
      }
      if (suggestionsBox) suggestionsBox.classList.add('hidden');
    };

    if (btnOpen) btnOpen.addEventListener('click', () => openDrawer());
    window.__abrirDrawerDespesa = openDrawer;
    if (btnClose) btnClose.addEventListener('click', closeDrawer);
    if (backdrop) backdrop.addEventListener('click', closeDrawer);

    if (inputVendor && suggestionsBox) {
      inputVendor.addEventListener('input', (e) => {
        const query = e.target.value.trim().toLowerCase();
        if (!query) {
          suggestionsBox.classList.add('hidden');
          suggestionsBox.innerHTML = '';
          return;
        }

        const contractedVendors = getContractedVendorsList();
        const matches = contractedVendors.filter(v => v.name.toLowerCase().includes(query));

        if (matches.length === 0) {
          suggestionsBox.classList.add('hidden');
          suggestionsBox.innerHTML = '';
          return;
        }

        suggestionsBox.innerHTML = matches.map(v => `
          <div class="px-3.5 py-2.5 hover:bg-zinc-50 cursor-pointer flex items-center justify-between text-xs transition-colors" data-vendor-name="${v.name}" data-vendor-cat="${v.category}">
            <div>
              <span class="font-bold text-zinc-900 block">${v.name}</span>
              ${v.category ? `<span class="text-[10px] text-zinc-500">${v.category}</span>` : ''}
            </div>
            <span class="text-[9px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200/60">
              Meus contratos
            </span>
          </div>
        `).join('');

        suggestionsBox.querySelectorAll('[data-vendor-name]').forEach(el => {
          el.addEventListener('click', () => {
            inputVendor.value = el.getAttribute('data-vendor-name');
            const vCat = el.getAttribute('data-vendor-cat');
            if (vCat && selectCat) {
              Array.from(selectCat.options).forEach(opt => {
                if (vCat.toLowerCase().includes(opt.value.toLowerCase()) || opt.value.toLowerCase().includes(vCat.toLowerCase())) {
                  selectCat.value = opt.value;
                }
              });
            }
            suggestionsBox.classList.add('hidden');
          });
        });

        suggestionsBox.classList.remove('hidden');
      });

      document.addEventListener('click', (e) => {
        if (!inputVendor.contains(e.target) && !suggestionsBox.contains(e.target)) {
          suggestionsBox.classList.add('hidden');
        }
      });
    }

    // Formatação monetária nos inputs de valores
    ['expense-estimated-input', 'expense-actual-input', 'expense-paid-input'].forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        el.addEventListener('input', (e) => {
          let val = e.target.value.replace(/\D/g, '');
          if (val) {
            const num = parseFloat(val) / 100;
            e.target.value = num.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
          } else {
            e.target.value = '';
          }
        });
      }
    });

    if (form) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();

        const inputItem = document.getElementById('expense-item-name');
        const inputEstimated = document.getElementById('expense-estimated-input');
        const inputActual = document.getElementById('expense-actual-input');
        const inputPaid = document.getElementById('expense-paid-input');

        const itemName = inputItem ? inputItem.value.trim() : '';
        if (!itemName) return;

        const parseMoney = (inputEl) => {
          if (!inputEl || !inputEl.value) return 0;
          const cleaned = inputEl.value.replace(/\./g, '').replace(',', '.');
          const val = parseFloat(cleaned);
          return isNaN(val) ? 0 : val;
        };

        const editId = form.dataset.editId || '';
        const newItem = {
          id: editId || `exp-${Date.now()}`,
          item: itemName,
          vendor: inputVendor ? inputVendor.value.trim() : '',
          category: selectCat ? selectCat.value : 'Local',
          estimated: parseMoney(inputEstimated),
          actual: parseMoney(inputActual),
          paid: parseMoney(inputPaid)
        };

        const expenses = getBudgetExpensesProprias();
        const idx = editId ? expenses.findIndex(x => x.id === editId) : -1;
        const pagoAntes = idx >= 0 ? (Number(expenses[idx].paid) || 0) : 0;
        if (idx >= 0) expenses[idx] = Object.assign({}, expenses[idx], newItem);
        else expenses.unshift(newItem);
        saveBudgetExpenses(expenses);
        // Pagamento lançado no orçamento também entra no extrato.
        const pagoAgora = Number(newItem.paid) || 0;
        if (pagoAgora > pagoAntes) {
          registrarPagamento({ valor: pagoAgora - pagoAntes, fornecedor: newItem.vendor || newItem.item, descricao: newItem.item, vencimento: null, pagoEm: hojeISO(), comprovante: null, origem: 'orcamento', despesaId: newItem.id });
          if (typeof renderWalletTransactions === 'function') renderWalletTransactions();
        }

        renderBudgetExpensesTable();
        closeDrawer();
        form.reset();
        form.dataset.editId = '';
        showToast(`Despesa "${newItem.item}" salva!`, '💰');
      });
    }
  }

  function updateBudgetKPIs() {
    renderBudgetExpensesTable();
  }

  // ==========================================
  // 9. CRIAR NOVO EVENTO (Passo 1: Boas-Vindas -> Modal Escolha de Tipo -> Passo 2: Formulário)
  // ==========================================
  const formCreatePage = document.getElementById('form-create-new-event-page');
  const btnStartEventCreation = document.getElementById('btn-start-event-creation');
  const btnBackToWelcome = document.getElementById('btn-back-to-welcome-step');
  const welcomeStep = document.getElementById('create-event-welcome-step');
  const formStep = document.getElementById('create-event-form-step');
  const modalSelectEventType = document.getElementById('modal-select-event-type');
  let selectedNewType = 'wedding';
  let createdCoverImageSrc = 'assets/wedding_hero_banner.jpg';

  // Transição: Clicar em "+ Criar Evento" abre o modal pop-up de escolha de tipo de evento (estilo Joy)
  if (btnStartEventCreation && modalSelectEventType) {
    btnStartEventCreation.addEventListener('click', () => {
      openModal(modalSelectEventType);
    });
  }

  // Função para avançar da escolha do tipo para o formulário
  function proceedToEventForm(typeKey, typeLabel) {
    selectedNewType = typeKey || 'custom';
    createdCoverImageSrc = getDefaultCoverForEventType(selectedNewType, typeLabel);

    const pageNewCoverImg = document.getElementById('page-new-event-cover-img');
    if (pageNewCoverImg) {
      pageNewCoverImg.src = createdCoverImageSrc;
    }

    if (modalSelectEventType) closeModal(modalSelectEventType);

    openCreateEventPage(false, true);

    const inputName = document.getElementById('page-new-event-name');
    const inputSlug = document.getElementById('page-new-event-slug');
    if (inputName) {
      // Sempre recalcula o nome a partir do tipo escolhido agora — antes só
      // preenchia quando o campo estava vazio, então o valor de uma escolha
      // anterior (ex: "Aniversário de Victor") ficava preso ao trocar de tipo
      // num evento seguinte (campo nunca mais fica vazio depois da 1ª vez).
      const firstName = (window.loveClienteProfile?.couple_name || '').trim().split(/\s+/)[0] || '';
      if (typeLabel && typeLabel !== 'Novo Evento' && firstName) {
        inputName.value = `${typeLabel} de ${firstName}`;
        // Dispara a sincronização nome → slug (o listener de 'input' não
        // roda numa troca programática do .value).
        inputName.dispatchEvent(new Event('input', { bubbles: true }));
        // Sugestão de link já checada no banco — se o slug "óbvio" estiver em
        // uso, sugere um disponível na hora (ex: com número no final).
        if (inputSlug) {
          sugerirSlugDisponivel(inputName.value).then(slug => {
            inputSlug.value = slug;
            checarDisponibilidadeSlug();
          });
        }
      } else if (!inputName.value) {
        if (selectedNewType === 'birthday') {
          inputName.placeholder = 'Ex: Aniversário de Lucas';
        } else {
          inputName.placeholder = `Ex: ${typeLabel || 'Novo Evento'} de Beatriz & Lucas`;
        }
      }
      setTimeout(() => inputName.focus(), 150);
    }

    showToast(typeLabel === 'Novo Evento' ? 'Vamos começar a planejar seu evento!' : `Tipo selecionado: ${typeLabel}. Preencha os detalhes do evento!`, '✨');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // Listeners para os cards do modal de tipo de evento
  document.querySelectorAll('.btn-select-event-type-card').forEach(card => {
    card.addEventListener('click', () => {
      const typeKey = card.getAttribute('data-type') || 'wedding';
      const typeLabel = card.getAttribute('data-label') || 'Casamento';
      proceedToEventForm(typeKey, typeLabel);
    });
  });

  // Listener para o campo e botão 'Outro' do modal
  const inputCustomType = document.getElementById('input-custom-event-type');
  const btnSubmitCustomType = document.getElementById('btn-submit-custom-type');

  const handleCustomTypeSubmit = () => {
    const customVal = (inputCustomType && inputCustomType.value.trim()) || 'Evento Especial';
    proceedToEventForm('custom', customVal);
  };

  if (btnSubmitCustomType) {
    btnSubmitCustomType.addEventListener('click', handleCustomTypeSubmit);
  }
  if (inputCustomType) {
    inputCustomType.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleCustomTypeSubmit();
      }
    });
  }

  // Listener para o botão "Ainda não tenho certeza"
  const btnEventTypeUnsure = document.getElementById('btn-event-type-unsure');
  if (btnEventTypeUnsure) {
    btnEventTypeUnsure.addEventListener('click', () => {
      proceedToEventForm('custom', 'Novo Evento');
    });
  }

  // Transição: Clicar em "← Voltar" retorna ao passo inicial
  if (btnBackToWelcome && welcomeStep && formStep) {
    btnBackToWelcome.addEventListener('click', () => {
      formStep.classList.add('hidden');
      welcomeStep.classList.remove('hidden');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  // 9.2 Troca de Foto de Capa
  const pageNewCoverInput = document.getElementById('page-new-event-cover-input');
  const pageNewCoverImg = document.getElementById('page-new-event-cover-img');
  if (pageNewCoverInput && pageNewCoverImg) {
    pageNewCoverInput.addEventListener('change', (e) => {
      const file = e.target.files && e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (evt) => {
          createdCoverImageSrc = evt.target.result;
          pageNewCoverImg.src = createdCoverImageSrc;
          showToast('Foto de capa atualizada!', '📷');
        };
        reader.readAsDataURL(file);
      }
    });
  }

  // 9.3 Seletor e Shuffle de Tema
  const themeSelect = document.getElementById('page-new-event-theme-select');
  const btnShuffleTheme = document.getElementById('btn-shuffle-theme');
  const themes = ['minimalista', 'romantico', 'moderno', 'jardim'];
  if (btnShuffleTheme && themeSelect) {
    btnShuffleTheme.addEventListener('click', () => {
      const currentIdx = themes.indexOf(themeSelect.value);
      const nextIdx = (currentIdx + 1) % themes.length;
      themeSelect.value = themes[nextIdx];
      showToast(`Tema alterado para: ${themeSelect.options[themeSelect.selectedIndex].text}`, '🎨');
    });
  }

  // 9.4 Autocomplete de Locais Parceiros Admin — reaproveitado também na
  // sub-seção "Informações" (editor-data-location), por isso em função.
  // A lista mostra só os espaços cadastrados no Hub (serviços da categoria
  // Espaços para Locação). Sem nenhum, a lista não abre e o nome digitado
  // fica como um local qualquer (a Home mostra o endereço).
  function wirePartnerVenueAutocomplete(input, dropdown, opts = {}) {
    const { addressInput, numberInput, complementInput } = opts;
    if (!input || !dropdown) return;
    let espacos = [];

    const desenhar = () => {
      const termo = normalizarTexto(input.value);
      const filtrados = espacos.filter(({ empresa, servico }) => !termo
        || normalizarTexto(empresa.name).includes(termo) || normalizarTexto(servico.name).includes(termo));
      dropdown.innerHTML = filtrados.slice(0, 8).map(({ empresa, servico }, i) => {
        const v = (servico.extra && servico.extra.venue) || {};
        const linha2 = [[v.street, v.number].filter(Boolean).join(', '), v.city].filter(Boolean).join(' - ');
        const titulo = normalizarTexto(servico.name) === normalizarTexto(empresa.name) ? servico.name : `${servico.name} — ${empresa.name}`;
        return `
          <div class="venue-option p-2 rounded-xl hover:bg-zinc-50 cursor-pointer flex items-center justify-between text-xs" data-indice="${i}">
            <div>
              <p class="font-bold text-zinc-800">${escaparHtml(titulo)}</p>
              ${linha2 ? `<p class="text-[11px] text-zinc-400">${escaparHtml(linha2)}</p>` : ''}
            </div>
          </div>`;
      }).join('');
      dropdown.classList.toggle('hidden', !filtrados.length);
      dropdown.querySelectorAll('.venue-option').forEach(opt => {
        opt.addEventListener('click', () => {
          const { empresa, servico } = filtrados[Number(opt.dataset.indice)];
          const v = (servico.extra && servico.extra.venue) || {};
          input.value = servico.name || empresa.name;
          if (addressInput) addressInput.value = v.street || '';
          if (numberInput) numberInput.value = v.number || '';
          if (complementInput) complementInput.value = v.complement || '';
          dropdown.classList.add('hidden');
          [addressInput, numberInput, complementInput].forEach(el => el && el.dispatchEvent(new Event('input', { bubbles: true })));
          input.dispatchEvent(new Event('input', { bubbles: true }));
          dropdown.classList.add('hidden');
        });
      });
    };

    const carregarEDesenhar = async () => {
      let pronta = false;
      try { pronta = b2bFornecedoresCarregados; } catch (e) { pronta = false; }
      if (!pronta && window.loveClienteSession) {
        try { await carregarFornecedoresVitrine(); } catch (e) { /* sem vitrine: lista vazia */ }
      }
      espacos = espacosCadastradosNoHub();
      if (document.activeElement === input) desenhar();
    };

    input.addEventListener('focus', carregarEDesenhar);
    input.addEventListener('input', (e) => {
      if (!e.isTrusted) return; // eventos disparados ao escolher uma opção
      desenhar();
    });

    document.addEventListener('click', (e) => {
      if (!input.contains(e.target) && !dropdown.contains(e.target)) {
        dropdown.classList.add('hidden');
      }
    });
  }

  const locationInput = document.getElementById('page-new-event-location-name');
  const partnerDropdown = document.getElementById('dropdown-partner-venues');
  wirePartnerVenueAutocomplete(locationInput, partnerDropdown, {
    numberInput: document.getElementById('page-new-event-number'),
    complementInput: document.getElementById('page-new-event-complement')
  });

  // Mesmo autocomplete na sub-seção "Informações" (Personalizar evento) —
  // aqui o endereço é um campo único, sem número/complemento separados.
  wirePartnerVenueAutocomplete(
    document.getElementById('editor-data-location'),
    document.getElementById('editor-data-location-dropdown'),
    {
      addressInput: document.getElementById('editor-data-street'),
      numberInput: document.getElementById('editor-data-number'),
      complementInput: document.getElementById('editor-data-complement')
    }
  );

  // ==========================================
  // Informações › música de fundo (link do YouTube)
  // ==========================================
  // Aceita youtube.com/watch?v=, youtu.be/, /shorts/, /embed/ e music.youtube.com.
  function idDoVideoYoutube(link) {
    const texto = String(link || '').trim();
    if (!texto) return '';
    const m = texto.match(/(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/|v\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/i);
    return m ? m[1] : '';
  }

  function validarLinkDaMusica() {
    const input = document.getElementById('editor-data-music');
    const status = document.getElementById('editor-data-music-status');
    if (!input || !status) return;
    const link = input.value.trim();
    if (!link) { status.textContent = ''; status.classList.add('hidden'); return; }
    const ok = !!idDoVideoYoutube(link);
    status.textContent = ok ? 'Música que irá tocar no convite publicado.' : 'Esse link não é de um vídeo do YouTube. Confira e cole de novo.';
    status.classList.remove('hidden');
    status.classList.toggle('text-emerald-600', ok);
    status.classList.toggle('text-rose-600', !ok);
  }
  document.getElementById('editor-data-music')?.addEventListener('input', () => {
    validarLinkDaMusica();
    if (typeof updateFloatingMusicWidget === 'function') updateFloatingMusicWidget();
  });

  // ==========================================
  // Informações › endereço pelo CEP
  // Ao digitar o CEP (8 dígitos), busca no ViaCEP e mostra os campos de
  // endereço já preenchidos. O endereço final ("Rua, Nº - Compl, Bairro"),
  // a cidade e o estado vão para os campos ocultos editor-data-address /
  // -city / -state, que a prévia, o convite e o "Como chegar?" já usam.
  // ==========================================
  // Função (e não const) para poder ser usada antes desta linha rodar.
  function cepCampo(nome) {
    return document.getElementById({
      cep: 'editor-data-cep', status: 'editor-data-cep-status', blocos: 'editor-data-address-fields',
      rua: 'editor-data-street', numero: 'editor-data-number', complemento: 'editor-data-complement',
      bairro: 'editor-data-district', cidadeVisivel: 'editor-data-city-uf-view',
      endereco: 'editor-data-address', cidade: 'editor-data-city', uf: 'editor-data-state'
    }[nome]);
  }

  // Os campos de endereço ficam sempre visíveis: sem CEP, a pessoa digita
  // tudo à mão (inclusive a cidade).
  function mostrarCamposDeEndereco() {
    cepCampo('blocos')?.classList.remove('hidden');
  }

  // Cidade travada só quando veio do CEP (CEP completo + cidade preenchida).
  function travarCidadeSeVeioDoCep() {
    const visivel = cepCampo('cidadeVisivel');
    if (!visivel) return;
    const cepCompleto = (cepCampo('cep')?.value || '').replace(/D/g, '').length === 8;
    visivel.disabled = cepCompleto && !!(cepCampo('cidade')?.value || '').trim();
  }

  // "São Paulo - SP" digitado à mão → cidade "São Paulo" e UF "SP".
  function lerCidadeDigitada() {
    const texto = (cepCampo('cidadeVisivel')?.value || '').trim();
    const m = texto.match(/^(.*?)s*[-–/,]s*([A-Za-z]{2})$/);
    if (cepCampo('cidade')) cepCampo('cidade').value = m ? m[1].trim() : texto;
    if (cepCampo('uf')) cepCampo('uf').value = m ? m[2].toUpperCase() : '';
  }

  function mensagemCep(texto, erro = false) {
    const el = cepCampo('status');
    if (!el) return;
    el.textContent = texto || '';
    el.classList.toggle('hidden', !texto);
    el.classList.toggle('text-rose-600', !!erro);
    el.classList.toggle('text-slate-400', !erro);
  }

  // Junta os campos visíveis no endereço único usado pelo resto da plataforma.
  function montarEnderecoInformacoes({ atualizarCidade = true } = {}) {
    const v = nome => (cepCampo(nome)?.value || '').trim();
    let endereco = v('rua');
    if (endereco && v('numero')) endereco += `, ${v('numero')}`;
    if (endereco && v('complemento')) endereco += ` - ${v('complemento')}`;
    if (v('bairro')) endereco = [endereco, v('bairro')].filter(Boolean).join(', ');
    const oculto = cepCampo('endereco');
    if (oculto) oculto.value = endereco;
    // "São Paulo - SP": cidade por extenso e estado em 2 letras. Sem a cidade,
    // fica vazio (não mostra a sigla sozinha).
    const cidadeUf = v('cidade') ? [v('cidade'), v('uf').toUpperCase()].filter(Boolean).join(' - ') : '';
    if (atualizarCidade && cepCampo('cidadeVisivel')) cepCampo('cidadeVisivel').value = cidadeUf;
    travarCidadeSeVeioDoCep();
  }

  // Abre a aba Informações com o que está salvo no evento. Eventos antigos
  // (sem CEP) têm só o endereço inteiro: ele vai para o campo Endereço.
  function preencherEnderecoInformacoes(detalhes = {}) {
    const set = (nome, valor) => { const el = cepCampo(nome); if (el) el.value = valor || ''; };
    set('cep', detalhes.cep);
    set('rua', detalhes.street || (detalhes.cep ? '' : detalhes.address));
    set('numero', detalhes.number);
    set('complemento', detalhes.complement);
    set('bairro', detalhes.district);
    set('cidade', detalhes.city);
    set('uf', detalhes.state);
    mensagemCep('');
    montarEnderecoInformacoes();
    mostrarCamposDeEndereco(!!(detalhes.cep || detalhes.address || detalhes.street));
    // Evento salvo sem cidade (ou sem UF): completa pelo CEP, sem mexer no resto.
    const digitos = String(detalhes.cep || '').replace(/D/g, '');
    if (digitos.length === 8 && (!detalhes.city || !detalhes.state)) completarCidadePeloCep(digitos);
  }

  // Busca só a cidade (nome completo) e a UF (2 letras) do CEP; o bairro
  // entra apenas se estiver vazio.
  async function completarCidadePeloCep(digitos) {
    try {
      const resp = await fetch(`https://viacep.com.br/ws/${digitos}/json/`);
      const dados = await resp.json();
      if (!resp.ok || dados.erro) return;
      if ((cepCampo('cep')?.value || '').replace(/D/g, '') !== digitos) return;
      if (dados.localidade) cepCampo('cidade').value = dados.localidade;
      if (dados.uf) cepCampo('uf').value = dados.uf;
      if (dados.bairro && !(cepCampo('bairro')?.value || '').trim()) cepCampo('bairro').value = dados.bairro;
      montarEnderecoInformacoes();
      cepCampo('endereco')?.dispatchEvent(new Event('input', { bubbles: true }));
    } catch (e) {
      console.error('Erro ao completar cidade pelo CEP:', e);
    }
  }

  async function buscarCepInformacoes(digitos) {
    mensagemCep('Buscando endereço…');
    try {
      const resp = await fetch(`https://viacep.com.br/ws/${digitos}/json/`);
      const dados = await resp.json();
      // Digitou outro CEP enquanto buscava: ignora a resposta antiga.
      if ((cepCampo('cep')?.value || '').replace(/\D/g, '') !== digitos) return;
      if (!resp.ok || dados.erro) {
        mensagemCep('CEP não encontrado. Confira o número.', true);
        return;
      }
      cepCampo('rua').value = dados.logradouro || '';
      cepCampo('bairro').value = dados.bairro || '';
      cepCampo('cidade').value = dados.localidade || '';
      cepCampo('uf').value = dados.uf || '';
      mensagemCep('');
      montarEnderecoInformacoes();
      mostrarCamposDeEndereco(true);
      // Avisa a prévia (ela escuta "input" nos campos editor-data-*).
      cepCampo('endereco')?.dispatchEvent(new Event('input', { bubbles: true }));
      (dados.logradouro ? cepCampo('numero') : cepCampo('rua'))?.focus();
    } catch (e) {
      console.error('Erro ao buscar CEP:', e);
      mensagemCep('Não foi possível buscar o CEP agora. Tente de novo.', true);
    }
  }

  cepCampo('cep')?.addEventListener('input', (e) => {
    const digitos = e.target.value.replace(/\D/g, '').slice(0, 8);
    e.target.value = digitos.length > 5 ? `${digitos.slice(0, 5)}-${digitos.slice(5)}` : digitos;
    if (digitos.length === 8) buscarCepInformacoes(digitos);
    else mensagemCep('');
    travarCidadeSeVeioDoCep();
  });

  // Cidade digitada à mão (sem CEP): vai para os campos ocultos cidade/UF.
  cepCampo('cidadeVisivel')?.addEventListener('input', () => {
    lerCidadeDigitada();
    montarEnderecoInformacoes({ atualizarCidade: false });
  });

  // Editar rua/número/complemento/bairro atualiza o endereço oculto na hora
  // (antes da prévia, que espera 150ms para redesenhar).
  ['editor-data-street', 'editor-data-number', 'editor-data-complement', 'editor-data-district'].forEach(id => {
    document.getElementById(id)?.addEventListener('input', montarEnderecoInformacoes);
  });

  // Espaço parceiro escolhido no autocomplete de "Nome do espaço/local":
  // ele preenche rua/número/complemento — mostra os campos e monta o endereço.
  document.getElementById('editor-data-location')?.addEventListener('input', () => {
    if ((cepCampo('rua')?.value || '').trim()) {
      mostrarCamposDeEndereco(true);
      montarEnderecoInformacoes();
    }
  });


  // 9.5 Sincronização do Nome com o Slug
  const pageNewName = document.getElementById('page-new-event-name');
  const pageNewSlug = document.getElementById('page-new-event-slug');
  if (pageNewName && pageNewSlug) {
    pageNewName.addEventListener('input', (e) => {
      pageNewSlug.value = e.target.value
        .toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');
    });
  }

  // Avisa embaixo do campo se o link já está em uso por outro evento
  // (checagem real no banco — ver verificar_slug_disponivel, migration 026).
  const pageNewSlugStatus = document.getElementById('page-new-event-slug-status');
  let slugCheckTimer = null;
  function checarDisponibilidadeSlug() {
    if (!pageNewSlug || !pageNewSlugStatus) return;
    const valor = slugify(pageNewSlug.value);
    clearTimeout(slugCheckTimer);
    if (!valor) {
      pageNewSlugStatus.classList.add('hidden');
      return;
    }
    slugCheckTimer = setTimeout(async () => {
      const { data: disponivel, error } = await supabaseClient.rpc('verificar_slug_disponivel', { p_slug: valor });
      if (error) {
        pageNewSlugStatus.classList.add('hidden');
        return;
      }
      pageNewSlugStatus.classList.remove('hidden', 'text-red-600', 'text-[#27394f]');
      if (disponivel) {
        pageNewSlugStatus.textContent = 'Link personalizado disponível';
        pageNewSlugStatus.classList.add('text-[#27394f]');
      } else {
        pageNewSlugStatus.textContent = 'Link personalizado já em uso';
        pageNewSlugStatus.classList.add('text-red-600');
      }
    }, 400);
  }
  // O listener acima só sincroniza o nome → slug (não dispara o evento
  // 'input' do slug, já que é uma troca programática do .value) — este
  // segundo listener, no mesmo campo de nome, roda depois e só cuida de
  // checar a disponibilidade do valor que acabou de ser preenchido.
  if (pageNewName) pageNewName.addEventListener('input', checarDisponibilidadeSlug);
  if (pageNewSlug) pageNewSlug.addEventListener('input', checarDisponibilidadeSlug);

  // Mesma regra de limpeza usada no listener acima, reaproveitável pra
  // sugerir um slug a partir do nome da pessoa (não do título do evento).
  function slugify(texto) {
    return (texto || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  }

  // Testa o slug no banco (não dá pra só checar "existe uma linha minha com
  // esse slug" — a RLS só deixa o anfitrião ver os próprios eventos, então a
  // disponibilidade de verdade vem de uma function que ignora a RLS pra essa
  // única pergunta booleana). Se a function ainda não existir (migration 026
  // não rodada), assume disponível em vez de travar o fluxo.
  async function sugerirSlugDisponivel(base) {
    const raiz = slugify(base) || 'meu-evento';
    for (let tentativa = 0; tentativa < 50; tentativa++) {
      const candidato = tentativa === 0 ? raiz : `${raiz}${tentativa}`;
      const { data: disponivel, error } = await supabaseClient.rpc('verificar_slug_disponivel', { p_slug: candidato });
      if (error) return raiz;
      if (disponivel) return candidato;
    }
    return `${raiz}${Date.now()}`;
  }

  // 9.5b Fim do evento sempre no mesmo dia do início (a hora de fim continua
  // livre pra pessoa ajustar) — em vez da data fixa que vinha travada no HTML.
  const pageNewStartDate = document.getElementById('page-new-event-date');
  const pageNewEndDate = document.getElementById('page-new-event-end-date');
  if (pageNewStartDate && pageNewEndDate) {
    pageNewStartDate.addEventListener('change', () => {
      pageNewEndDate.value = pageNewStartDate.value;
    });
  }

  // 9.6 Submissão do Formulário (Continuar Ajustes)
  if (formCreatePage) {
    formCreatePage.addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = (pageNewName && pageNewName.value.trim()) || 'Meu Evento';
      const startDate = document.getElementById('page-new-event-date') ? document.getElementById('page-new-event-date').value : '2026-08-28';
      const startTime = document.getElementById('page-new-event-start-time') ? document.getElementById('page-new-event-start-time').value : '16:30';
      const endDate = document.getElementById('page-new-event-end-date') ? document.getElementById('page-new-event-end-date').value : startDate;
      const endTime = document.getElementById('page-new-event-end-time') ? document.getElementById('page-new-event-end-time').value : '23:30';
      const slug = (pageNewSlug && pageNewSlug.value.trim()) || 'meu-evento';
      const locName = (locationInput && locationInput.value.trim()) || 'São Paulo - SP';
      const desc = document.getElementById('page-new-event-description') ? document.getElementById('page-new-event-description').value.trim() : '';

      if (!window.loveClienteSession) {
        showToast('Sua sessão expirou — recarregue a página e entre novamente.', '⚠️');
        return;
      }
      const clienteId = window.loveClienteSession.user.id;

      const newEvt = {
        type: selectedNewType,
        title: name,
        hostName: name,
        date: startDate,
        time: startTime,
        location: locName,
        slug: slug,
        publicUrl: `https://love.com.br/${slug}`,
        coverImage: createdCoverImageSrc || getDefaultCoverForEventType(selectedNewType, name),
        theme: themeSelect ? themeSelect.options[themeSelect.selectedIndex].text : 'Minimalista',
        colorAccent: '#537bae',
        // Pré-preenche "Informações" com o que já foi digitado aqui na
        // criação — sem isso, a página de Informações nascia sempre em
        // branco (data/horário/local vazios) até a pessoa digitar tudo de novo.
        eventDetails: {
          date: startDate,
          time: startTime,
          endDate: endDate,
          endTime: endTime,
          locationName: locName
        },
        siteSections: {
          heroHeadline: selectedNewType === 'birthday' ? 'CONVIDA VOCÊ PARA COMEMORAR O SEU ANIVERSÁRIO' : `Bem-vindo ao ${name}!`,
          heroSubtitle: desc || 'Estamos muito felizes em celebrar este momento com você.',
          aboutText: 'Criamos este espaço para compartilhar todos os detalhes com nossos convidados especiais.',
          inviteText: `Celebração no dia ${startDate} às ${startTime}. Aguardamos sua presença!`,
          giftNotice: 'Se desejar nos presentear, criamos nossa lista personalizada com resgate via PIX!'
        },
        wallet: {
          saldoDisponivel: 0.00,
          lancamentosFuturos: 0.00,
          totalSacado: 0.00,
          chavePix: 'anfitriao@love.com',
          transactions: []
        }
      };

      const { data: createdEvento, error } = await supabaseClient
        .from('eventos').insert(mapEventToEventoRow(newEvt, clienteId)).select('id').single();
      if (error || !createdEvento) {
        console.error('Erro ao criar evento:', error);
        showToast('Não foi possível criar o evento. Tente novamente.', '⚠️');
        return;
      }

      // Só agora o primeiro evento existe de verdade — o que foi escolhido
      // no /cadastro (tipo, nome, data) não precisa mais ficar guardado pra
      // reaparecer a cada login.
      localStorage.removeItem('love-pending-event-type');
      localStorage.removeItem('love-pending-event-type-label');
      localStorage.removeItem('love-pending-event-name');
      localStorage.removeItem('love-pending-event-date');

      newEvt.id = createdEvento.id;
      newEvt.giftList = [];
      newEvt.guests = [];
      newEvt.messages = [];
      newEvt.convidadosConfirmados = 0;
      newEvt.totalConvidados = 0;
      newEvt.clienteId = clienteId;
      newEvt.presentesRecebidos = 0;
      newEvt.totalArrecadado = 0;

      setSidebarLocked(false);
      state.hasEventCreated = true;
      state.events.unshift(newEvt);
      definirEventoAtivo(newEvt.id);

      // Convite Digital já nasce com o template (cor + imagem de capa) do tipo
      // de evento escolhido — ponto de partida editável em Aparência.
      if (typeof seedConviteDigitalForEvent === 'function') {
        await seedConviteDigitalForEvent(newEvt.id, selectedNewType, { data: startDate, hora: startTime });
      }
      if (typeof window.reloadBuilderStateForActiveEvent === 'function') {
        window.reloadBuilderStateForActiveEvent();
      }

      updateAllCelebrationData();
      renderEventsSwitcher();
      switchRailTab('edit-site');
      showToast(`Evento "${name}" criado com sucesso! Todos os recursos foram liberados.`, '🎉');
      triggerConfetti();
    });
  }

  // ==========================================
  // 10. AUTENTICAÇÃO (LOGIN & CRIAR CONTA GRÁTIS COM CÓDIGO)
  // ==========================================
  // Ir para a página de Login (Entrar) — era um popup, agora é página própria
  document.querySelectorAll('.btn-trigger-login').forEach(btn => {
    btn.addEventListener('click', () => {
      switchView('login');
      history.pushState({ loveView: 'login' }, '', '/login');
    });
  });

  // Botão "voltar" do navegador: se a página de login estiver aberta, volta
  // pro site público em vez de sair da plataforma.
  window.addEventListener('popstate', () => {
    const viewLogin = document.getElementById('view-login');
    if (viewLogin && !viewLogin.classList.contains('hidden')) {
      switchView('public');
    }
  });

  // "Criar grátis" vai para a página /cadastro (onboarding em etapas), não mais um popup
  document.querySelectorAll('.btn-trigger-register').forEach(btn => {
    btn.addEventListener('click', () => {
      window.location.href = '/cadastro';
    });
  });

  // Alternar entre Login e Cadastro
  const btnLoginToRegister = document.getElementById('btn-login-to-register');
  if (btnLoginToRegister) {
    btnLoginToRegister.addEventListener('click', () => {
      window.location.href = '/cadastro';
    });
  }

  const btnRegisterToLogin = document.getElementById('btn-register-to-login');
  if (btnRegisterToLogin) {
    btnRegisterToLogin.addEventListener('click', () => {
      closeModal(elements.modals.register);
      switchView('login');
    });
  }

  // 10.1 Login com Email e Senha (Conta Existente)
  const formLoginEmail = document.getElementById('form-login-email');
  const loginErrorMessage = document.getElementById('login-error-message');
  let loginFailedAttempts = 0;

  // As notificações flutuantes (showToast) estão desativadas na plataforma —
  // o erro de login precisa aparecer no próprio formulário.
  function showLoginError(message) {
    if (!loginErrorMessage) return;
    loginErrorMessage.innerHTML = message;
    loginErrorMessage.classList.remove('hidden');
  }
  function hideLoginError() {
    if (loginErrorMessage) loginErrorMessage.classList.add('hidden');
  }

  if (formLoginEmail) {
    formLoginEmail.addEventListener('submit', async (e) => {
      e.preventDefault();
      hideLoginError();
      const email = document.getElementById('login-email-input').value.trim();
      const password = document.getElementById('login-password-input').value;
      const submitBtn = document.getElementById('btn-do-email-login');

      submitBtn.disabled = true;
      const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });

      if (error) {
        if (/banned/i.test(error.message || '')) {
          submitBtn.disabled = false;
          showLoginError('Este usuário está bloqueado.');
          loginFailedAttempts = 0;
          return;
        }

        // O Supabase devolve o mesmo erro genérico tanto pra "esse e-mail não
        // existe" quanto pra "a senha está errada" (de propósito, pra não dar
        // pista a quem está tentando adivinhar). Checagem separada só pra
        // decidir qual aviso mostrar — pedido explícito do cliente, sabendo
        // que isso deixa qualquer um descobrir quais e-mails têm conta aqui.
        const { data: emailCadastrado, error: checkError } = await supabaseClient.rpc('verificar_email_anfitriao', { p_email: email });
        submitBtn.disabled = false;

        if (!checkError && !emailCadastrado) {
          showLoginError('Esse e-mail não está cadastrado como anfitrião. <a href="/cadastro" class="font-bold text-[#537bae] hover:text-[#416799] hover:underline">Cadastre-se</a>');
          loginFailedAttempts = 0;
          return;
        }

        loginFailedAttempts++;
        if (loginFailedAttempts >= 3) {
          showLoginForgotPanel(email);
          loginFailedAttempts = 0;
          return;
        }
        showLoginError(`Usuário ou senha inválidos. (${loginFailedAttempts}/3)`);
        return;
      }

      // Senha certa, mas essa plataforma é só pra quem tem cadastro de
      // anfitrião — login/B2B/Admin compartilham o mesmo Supabase Auth.
      const { data: cliente } = await supabaseClient
        .from('clientes')
        .select('id, status')
        .eq('id', data.user.id)
        .maybeSingle();

      submitBtn.disabled = false;

      if (!cliente) {
        await supabaseClient.auth.signOut();
        showLoginError('Esse e-mail não está cadastrado como anfitrião. <a href="/cadastro" class="font-bold text-[#537bae] hover:text-[#416799] hover:underline">Cadastre-se</a>');
        loginFailedAttempts = 0;
        return;
      }

      if (cliente.status === 'bloqueado') {
        await supabaseClient.auth.signOut();
        showLoginError('Este usuário está bloqueado.');
        loginFailedAttempts = 0;
        return;
      }

      loginFailedAttempts = 0;

      // Senha certa, mas a conta tem dois fatores ativos: a sessão ainda é
      // aal1 e só vira aal2 depois do código do app autenticador.
      // Login certo: pede ao navegador para oferecer "Salvar senha".
      await oferecerSalvarSenha(email, password);

      if (await precisaCodigoMfa()) {
        showLoginMfaPanel();
        return;
      }

      setSidebarLocked(false);
      window.location.reload();
    });
  }

  // O login é feito por JavaScript (sem enviar o formulário de verdade) e a
  // página recarrega logo depois — o navegador não percebe que foi um login e
  // não oferece salvar a senha. No Chrome/Edge (inclusive Android), a API de
  // credenciais pede isso direto; nos outros, os campos já têm autocomplete
  // username/current-password. Nunca bloqueia o login se falhar.
  async function oferecerSalvarSenha(email, password) {
    try {
      if (!window.PasswordCredential || !navigator.credentials || !navigator.credentials.store) return;
      const credencial = new PasswordCredential({ id: email, password, name: email });
      await Promise.race([
        navigator.credentials.store(credencial),
        new Promise(resolve => setTimeout(resolve, 1500))
      ]);
    } catch (e) {
      console.warn('Navegador não ofereceu salvar a senha:', e);
    }
  }

  // Botão de perfil do cabeçalho: a foto da conta (avatar_url) ou, sem foto,
  // as iniciais do nome + sobrenome (ex.: Victor Maranhão → VM). Vale para
  // toda conta; sem sessão continua o ícone de pessoa.
  // Iniciais de avatar (mesma regra do Hub B2B — utils.js avatarInitials):
  // primeira letra das duas primeiras palavras, em maiúsculas. "Vitor Drinks"
  // → VD; uma palavra → 1 letra; vazio → "?".
  function avatarIniciais(nome) {
    const letras = String(nome || '').trim().split(/\s+/)
      .map(palavra => (palavra.match(/[\p{L}\p{N}]/u) || [''])[0])
      .filter(Boolean).slice(0, 2).join('').toLocaleUpperCase('pt-BR');
    return letras || '?';
  }

  function nomeDaConta(perfil) {
    const p = perfil || {};
    const montado = [p.first_name, p.last_name].map(v => String(v || '').trim()).filter(Boolean).join(' ');
    return montado || String(p.full_name || p.couple_name || '').trim();
  }

  function iniciaisDaConta(perfil) {
    return avatarIniciais(nomeDaConta(perfil));
  }


  // Conteúdo da caixinha de avatar: a foto (preenche) ou as iniciais.
  function conteudoDaCaixaDeAvatar(foto, nome) {
    return foto
      ? `<img src="${escaparHtml(foto)}" alt="" class="love-avatar-foto">`
      : `<span class="love-avatar-iniciais">${escaparHtml(avatarIniciais(nome))}</span>`;
  }

  function atualizarAvatarDoCabecalho() {
    const alvo = document.getElementById('header-user-avatar');
    const icone = document.getElementById('header-user-icon');
    const perfil = window.loveClienteProfile;
    const foto = perfil && perfil.avatar_url;
    const nome = nomeDaConta(perfil);
    const botao = document.getElementById('btn-user-account-menu');
    if (alvo) {
      if (!perfil) {
        alvo.classList.add('hidden');
        if (icone) icone.classList.remove('hidden');
        if (botao) botao.classList.remove('tem-avatar');
      } else {
        alvo.innerHTML = conteudoDaCaixaDeAvatar(foto, nome);
        alvo.classList.remove('hidden');
        if (icone) icone.classList.add('hidden');
        if (botao) botao.classList.add('tem-avatar');
      }
    }
    // Menu do perfil: mesmo avatar + nome + e-mail
    const menuAvatar = document.getElementById('account-dropdown-avatar');
    if (menuAvatar) menuAvatar.innerHTML = perfil ? conteudoDaCaixaDeAvatar(foto, nome) : '';
    const menuNome = document.getElementById('account-dropdown-username');
    if (menuNome) menuNome.textContent = nome;
    const menuEmail = document.getElementById('account-dropdown-email');
    if (menuEmail) menuEmail.textContent = (perfil && perfil.email) || '';
  }

  // 10.1a Verificação em duas etapas (TOTP) no login
  async function precisaCodigoMfa() {
    const { data, error } = await supabaseClient.auth.mfa.getAuthenticatorAssuranceLevel();
    if (error || !data) return false;
    return data.nextLevel === 'aal2' && data.currentLevel !== 'aal2';
  }

  function showLoginMfaPanel() {
    ['login-panel-signin', 'login-panel-forgot'].forEach(id => document.getElementById(id)?.classList.add('hidden'));
    const panelMfa = document.getElementById('login-panel-mfa');
    if (!panelMfa) return;
    panelMfa.classList.remove('hidden');
    document.getElementById('login-mfa-error')?.classList.add('hidden');
    const codeInput = document.getElementById('login-mfa-code-input');
    if (codeInput) { codeInput.value = ''; codeInput.focus(); }
  }

  const formLoginMfa = document.getElementById('form-login-mfa');
  if (formLoginMfa) {
    formLoginMfa.addEventListener('submit', async (e) => {
      e.preventDefault();
      const code = document.getElementById('login-mfa-code-input').value.replace(/\D/g, '');
      const errorEl = document.getElementById('login-mfa-error');
      const submitBtn = document.getElementById('btn-do-mfa-login');
      errorEl.classList.add('hidden');

      if (code.length !== 6) {
        errorEl.textContent = 'O código tem 6 dígitos.';
        errorEl.classList.remove('hidden');
        return;
      }

      submitBtn.disabled = true;
      const { data: factors } = await supabaseClient.auth.mfa.listFactors();
      const factor = (factors?.totp || []).find(f => f.status === 'verified');
      const { error } = factor
        ? await supabaseClient.auth.mfa.challengeAndVerify({ factorId: factor.id, code })
        : { error: new Error('sem fator') };
      submitBtn.disabled = false;

      if (error) {
        errorEl.textContent = 'Código inválido ou expirado. Tente de novo.';
        errorEl.classList.remove('hidden');
        return;
      }

      setSidebarLocked(false);
      window.location.reload();
    });
  }

  const btnMfaToLogin = document.getElementById('btn-mfa-to-login');
  if (btnMfaToLogin) {
    btnMfaToLogin.addEventListener('click', async () => {
      await supabaseClient.auth.signOut({ scope: 'local' });
      showLoginSigninPanel();
    });
  }

  // 10.1b Esqueci a senha — painel inline (mesmo espaço do login)
  function showLoginForgotPanel(prefillEmail) {
    const panelSignin = document.getElementById('login-panel-signin');
    const panelForgot = document.getElementById('login-panel-forgot');
    if (!panelSignin || !panelForgot) return;
    panelSignin.classList.add('hidden');
    panelForgot.classList.remove('hidden');
    const forgotEmailInput = document.getElementById('login-forgot-email-input');
    if (forgotEmailInput && prefillEmail) forgotEmailInput.value = prefillEmail;
  }

  function showLoginSigninPanel() {
    const panelSignin = document.getElementById('login-panel-signin');
    const panelForgot = document.getElementById('login-panel-forgot');
    if (!panelSignin || !panelForgot) return;
    panelForgot.classList.add('hidden');
    document.getElementById('login-panel-mfa')?.classList.add('hidden');
    panelSignin.classList.remove('hidden');
  }

  const btnLoginForgotPassword = document.getElementById('btn-login-forgot-password');
  if (btnLoginForgotPassword) {
    btnLoginForgotPassword.addEventListener('click', () => {
      const currentEmail = document.getElementById('login-email-input').value.trim();
      showLoginForgotPanel(currentEmail);
    });
  }

  const btnForgotToLogin = document.getElementById('btn-forgot-to-login');
  if (btnForgotToLogin) {
    btnForgotToLogin.addEventListener('click', showLoginSigninPanel);
  }

  const formLoginForgot = document.getElementById('form-login-forgot');
  if (formLoginForgot) {
    formLoginForgot.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = document.getElementById('login-forgot-email-input').value.trim();
      const submitBtn = document.getElementById('btn-do-forgot-password');

      submitBtn.disabled = true;
      // Em produção o link sempre aponta para love.com.br, mesmo que o pedido
      // tenha sido feito pelo domínio .vercel.app; localhost segue local.
      const resetOrigin = window.location.hostname.endsWith('vercel.app')
        ? 'https://love.com.br'
        : window.location.origin;
      await supabaseClient.auth.resetPasswordForEmail(email, {
        redirectTo: `${resetOrigin}/resetar-senha`,
      });
      submitBtn.disabled = false;

      showToast('Se esse e-mail estiver cadastrado, você vai receber um link de recuperação.', '✉️');
    });
  }

  // Login e cadastro: o olhinho mostra ou esconde a senha (data-ver-senha = id do campo).
  document.querySelectorAll('[data-ver-senha]').forEach(botao => {
    botao.addEventListener('click', (e) => {
      const btn = /** @type {HTMLButtonElement} */ (e.currentTarget);
      const campo = /** @type {HTMLInputElement|null} */ (document.getElementById(btn.dataset.verSenha || ''));
      if (!campo) return;
      const mostrar = campo.type === 'password';
      campo.type = mostrar ? 'text' : 'password';
      btn.setAttribute('aria-pressed', String(mostrar));
      btn.setAttribute('aria-label', mostrar ? 'Esconder senha' : 'Mostrar senha');
      btn.querySelector('.login-olho-aberto')?.classList.toggle('hidden', mostrar);
      btn.querySelector('.login-olho-fechado')?.classList.toggle('hidden', !mostrar);
      campo.focus();
    });
  });

  // 10.2 / 10.3 — Entrar / criar conta com o Google (Supabase Auth). Volta
  // para a raiz do site; initClienteSession cria o cadastro de anfitrião na
  // primeira vez (função garantir_cliente_google — migration 049).
  ['btn-google-login', 'btn-google-register'].forEach(id => {
    const btn = document.getElementById(id);
    if (!btn) return;
    btn.addEventListener('click', async () => {
      if (btn.disabled) return;
      btn.disabled = true;
      // No computador abre em pop-up; ao entrar, recarrega e cai no painel.
      const { error } = await entrarComGoogle({ aoEntrar: () => window.location.reload(), soEntrar: id === 'btn-google-login' });
      btn.disabled = false;
      if (error && !/não concluído/.test(error.message || '')) {
        console.error('Erro ao entrar com o Google:', error);
        if (typeof showLoginError === 'function') showLoginError('Não foi possível entrar com o Google. Tente de novo.');
      }
    });
  });

  // Botão oficial do Google por cima dos botões acima (a tela do Google
  // mostra love.com.br). Sem o script do Google, os botões acima seguem.
  botaoOficialDoGoogle(document.getElementById('btn-google-login'), {
    texto: 'signin_with',
    soEntrar: true,
    aoEntrar: () => window.location.reload(),
    aoFalhar: (motivo) => { if (typeof showLoginError === 'function') showLoginError(mensagemErroGoogle(motivo)); }
  });
  botaoOficialDoGoogle(document.getElementById('btn-google-register'), {
    texto: 'signup_with',
    aoEntrar: () => window.location.reload(),
    aoFalhar: (motivo) => avisoAbaixoDoBotaoGoogle(document.getElementById('btn-google-register'), mensagemErroGoogle(motivo))
  });

  // Apple: ainda não configurado.
  ['btn-apple-login', 'btn-apple-register'].forEach(id => {
    const btn = document.getElementById(id);
    if (btn) {
      btn.addEventListener('click', () => {
        showToast('Login social ainda não disponível. Use e-mail e senha.', 'ℹ️');
      });
    }
  });

  // 10.4 Formulário Criar Conta Grátis (Nome, E-mail e Senha)
  const formRegisterUser = document.getElementById('form-register-user');
  if (formRegisterUser) {
    formRegisterUser.addEventListener('submit', async (e) => {
      e.preventDefault();
      // Esse popup só tem um campo de nome: primeira palavra vira first_name,
      // o resto last_name (mesma regra da migração do banco).
      const nameParts = document.getElementById('register-name-input').value.trim().split(/\s+/);
      const { first_name, last_name, full_name } = montarNomeCliente(nameParts[0], nameParts.slice(1).join(' '));
      const name = full_name;
      const email = document.getElementById('register-email-input').value.trim();
      const password = document.getElementById('register-password-input').value;
      const submitBtn = document.getElementById('btn-register-submit');

      submitBtn.disabled = true;
      const { error } = await supabaseClient.auth.signUp({
        email,
        password,
        options: { data: { role: 'cliente', first_name, last_name, full_name, couple_name: full_name, ...dadosDoDispositivo() } }
      });
      submitBtn.disabled = false;

      if (error) {
        showToast(
          error.message.includes('already registered') ? 'Esse e-mail já tem uma conta. Tente entrar.' : 'Não foi possível criar sua conta.',
          '⚠️'
        );
        return;
      }

      const dropdownUsername = document.getElementById('account-dropdown-username');
      if (dropdownUsername) dropdownUsername.textContent = name;

      closeModal(elements.modals.register);
      startFirstAccessFlow();
      triggerConfetti();
    });
  }

  // 10.5 Auto-avanço e navegação dos dígitos OTP
  const otpInputs = document.querySelectorAll('.otp-code-input');
  otpInputs.forEach((input, idx) => {
    input.addEventListener('input', (e) => {
      if (e.target.value.length >= 1) {
        e.target.value = e.target.value.slice(-1);
        const nextInput = document.querySelector(`.otp-code-input[data-idx="${idx + 1}"]`);
        if (nextInput) nextInput.focus();
      }
    });

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Backspace' && !e.target.value) {
        const prevInput = document.querySelector(`.otp-code-input[data-idx="${idx - 1}"]`);
        if (prevInput) {
          prevInput.focus();
          prevInput.value = '';
        }
      }
    });
  });

  // 10.6 Validação do Código de 4 dígitos (Primeiro Acesso)
  const formVerifyCode = document.getElementById('form-verify-code');
  if (formVerifyCode) {
    formVerifyCode.addEventListener('submit', (e) => {
      e.preventDefault();
      const nameInput = document.getElementById('register-name-input');
      const userName = nameInput && nameInput.value.trim() ? nameInput.value.trim() : 'Beatriz Silveira';

      // Atualiza nome na interface
      const dropdownUsername = document.getElementById('account-dropdown-username');
      if (dropdownUsername) dropdownUsername.textContent = userName;

      closeModal(elements.modals.verifyCode);
      startFirstAccessFlow();
      triggerConfetti();
    });
  }

  // 10.7 Reenviar código
  const btnResendCode = document.getElementById('btn-resend-verify-code');
  if (btnResendCode) {
    btnResendCode.addEventListener('click', () => {
      showToast('Novo código de 4 dígitos reenviado para o seu e-mail!', '📩');
    });
  }

  // 10.8 Alterar e-mail no modal de código
  const btnChangeEmail = document.getElementById('btn-change-register-email');
  if (btnChangeEmail) {
    btnChangeEmail.addEventListener('click', () => {
      closeModal(elements.modals.verifyCode);
      openModal(elements.modals.register);
    });
  }

  if (elements.dashHeader.btnShareEvent) {
    elements.dashHeader.btnShareEvent.addEventListener('click', (e) => {
      e.stopPropagation();
      if (elements.dashHeader.dropdownShare) {
        elements.dashHeader.dropdownShare.classList.toggle('hidden');
      }
    });
  }

  if (elements.dashHeader.btnCopyShareUrl && elements.dashHeader.shareUrlInput) {
    elements.dashHeader.btnCopyShareUrl.addEventListener('click', () => {
      const url = elements.dashHeader.shareUrlInput.value;
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(url).then(() => {
          elements.dashHeader.btnCopyShareUrl.textContent = 'Copiado! ✓';
          elements.dashHeader.btnCopyShareUrl.classList.remove('bg-[#537bae]');
          elements.dashHeader.btnCopyShareUrl.classList.add('bg-emerald-600');
          setTimeout(() => {
            elements.dashHeader.btnCopyShareUrl.textContent = 'Copiar';
            elements.dashHeader.btnCopyShareUrl.classList.remove('bg-emerald-600');
            elements.dashHeader.btnCopyShareUrl.classList.add('bg-[#537bae]');
          }, 2000);
        }).catch(() => {
          elements.dashHeader.shareUrlInput.select();
          document.execCommand('copy');
        });
      } else {
        elements.dashHeader.shareUrlInput.select();
        document.execCommand('copy');
      }
    });
  }

  if (elements.dashHeader.btnShareWhatsApp && elements.dashHeader.shareUrlInput) {
    elements.dashHeader.btnShareWhatsApp.addEventListener('click', () => {
      const activeEvent = getActiveEvent();
      const url = elements.dashHeader.shareUrlInput.value;
      const text = encodeURIComponent(`Olá! Acompanhe todas as novidades e confirme sua presença no casamento de ${activeEvent.title}: ${url}`);
      window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
    });
  }

  if (elements.dashHeader.btnShareNative && elements.dashHeader.shareUrlInput) {
    elements.dashHeader.btnShareNative.addEventListener('click', async () => {
      const activeEvent = getActiveEvent();
      const url = elements.dashHeader.shareUrlInput.value;
      if (navigator.share) {
        try {
          await navigator.share({
            title: activeEvent.title,
            text: `Acompanhe o casamento de ${activeEvent.title} no Love Event OS`,
            url: url
          });
        } catch (err) {
          console.log('Share cancelado', err);
        }
      } else {
        window.open(url, '_blank');
      }
    });
  }

  // Fecha o dropdown de compartilhar ao clicar fora
  document.addEventListener('click', (e) => {
    if (elements.dashHeader.dropdownShare && !elements.dashHeader.dropdownShare.contains(e.target) && e.target !== elements.dashHeader.btnShareEvent && !elements.dashHeader.btnShareEvent?.contains(e.target)) {
      elements.dashHeader.dropdownShare.classList.add('hidden');
    }
  });

  if (elements.dashHeader.btnLogout) {
    elements.dashHeader.btnLogout.addEventListener('click', async () => {
      await supabaseClient.auth.signOut();
      switchView('public');
      showToast('Você saiu do painel de anfitrião.', '👋');
    });
  }

  function renderAdvisorsList() {
    const container = document.getElementById('advisors-marketplace-grid');
    if (!container) return;
  }

  // ==========================================
  // 12. B2B MARKETPLACE & ENCONTRAR FORNECEDORES (SPLIT SCREEN LISTA & MAPA/DETALHES)
  // ==========================================
  let currentB2BCategory = 'all';
  let currentB2BSort = 'recommended';
  let activeB2BItemId = 'venue-villa-bisutti';
  let b2bSearchQuery = '';
  let currentB2BView = 'explore';

  // Mesma árvore de categoria/subcategoria do cadastro de produto no B2B
  // (B2B/js/produtos.js, SUBCATEGORY_MAP) — repetida aqui de propósito: são
  // apps/arquivos diferentes, sem import entre eles.
  // Subcategorias renomeadas no cadastro do Hub: serviço salvo com o nome
  // antigo continua casando com a opção nova do filtro.
  const SUBCATEGORIA_ALIASES = {
    'Open Bar': 'Bar Completo / Open Bar',
    'Carrinhos': 'Carrinhos / Food Truck'
  };
  function subcategoriaAtual(sub) {
    return SUBCATEGORIA_ALIASES[sub] || sub;
  }

  const B2B_CATEGORY_TREE = {
    'Assessoria e Cerimonialista': ['Assessoria completa', 'Cerimonial no dia', 'Planejamento', 'Day Coordinator', 'Celebrante'],
    'Espaços para Locação': ['Salão de Festas', 'Sítio/Chácara', 'Rooftop', 'Igreja/Capela', 'Praia', 'Hotel', 'Espaços Exclusivos'],
    'Buffet e Gastronomia': ['Buffet Completo', 'Finger Food', 'Bolo & Doces', 'Churrasco', 'Café da Manhã', 'Carrinhos / Food Truck', 'Cardápio Vegano', 'Tábua de Frios', 'Buffet Infantil'],
    'Bar e Bebidas': ['Bar Completo / Open Bar', 'Sommelier', 'Aluguel de Cervejeira', 'Consignação de Bebidas', 'Bar Infantil'],
    'Staff e Mão de Obra': ['Garçom', 'Bartender', 'Segurança', 'Recepcionista', 'Limpeza', 'Manobrista', 'Montadores', 'Carregadores'],
    'Mídia e Audiovisual': ['Fotografia', 'Filmagem', 'Drone', 'Cabine de Fotos', 'Edição de Vídeo', 'Álbum de Fotos'],
    'Música e Entretenimento': ['DJ', 'Banda ao vivo', 'Mestre de cerimônias', 'Aluguel de Brinquedos', 'Animação de Festa', 'Recreação Infantil', 'Orquestra', 'Personagens Vivos', 'Mágicos', 'Efeitos Especiais'],
    'Decoração': ['Florais', 'Iluminação', 'Mobiliário', 'Cenografia', 'Esculturas em Balões', 'Lembrancinhas', 'Papelaria'],
    'Trajes, Beleza e Estilo': ['Aluguel de Roupa', 'Acessórios', 'Ateliê', 'Trajes de Madrinhas', 'Roupas para Festa', 'Moda Infantil', 'Dia da Noiva', 'Maquiagem', 'Camarim'],
    'Aluguel de Carros': []
  };
  let b2bSelectedMainCategory = null;
  let b2bSelectedSubcategory = null;
  let b2bExpandedCategoryGroup = null;

  // ==========================================
  // Vitrine real: só fornecedores cadastrados no B2B (tabela fornecedores),
  // não bloqueados e com pelo menos um serviço ativo (products). Os serviços
  // de outros fornecedores só são legíveis pela policy da migration 037.
  // ==========================================
  let b2bFornecedores = [];
  let b2bFornecedoresCarregados = false;
  let b2bFornecedoresPromise = null;
  let b2bFavoritosIds = new Set(); // ids de serviços (products) favoritados
  let b2bAvaliacoesResumo = new Map(); // fornecedor_id -> { media, total }

  // Texto digitado pelo fornecedor no B2B vai pra dentro de innerHTML aqui —
  // sempre escapado.
  function escaparHtml(valor) {
    return String(valor ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  // O B2B ainda não salva a foto de perfil no banco: sem avatar_url/logo_url,
  // mostra as iniciais do nome.
  // Fornecedor sem foto: o ícone da Love é o avatar padrão no chat (e não
  // uma foto de tema aleatória). O ícone é mostrado inteiro, com respiro,
  // em vez de cortado no círculo.
  const LOVE_AVATAR_PADRAO = 'assets/iconelove2.png';
  function classeAvatarChat(src) {
    return src === LOVE_AVATAR_PADRAO ? 'object-contain p-1.5 bg-white' : 'object-cover';
  }

  function avatarComIniciais(nome) {
    const iniciais = String(nome || '').trim().split(/\s+/)
      .map(palavra => (palavra.match(/[\p{L}\p{N}]/u) || [''])[0])
      .filter(Boolean).slice(0, 2).join('').toUpperCase() || '?';
    const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96">' +
      '<rect width="96" height="96" fill="#FFFFFF"/>' +
      '<text x="50%" y="50%" dy=".35em" text-anchor="middle" font-family="Inter, sans-serif" font-size="36" font-weight="700" fill="#183b54">' +
      escaparHtml(iniciais) + '</text></svg>';
    return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  }

  // Serviço do tipo espaço guarda o endereço no próprio serviço (extra.venue).
  function enderecoDoEspacoDoServico(servicos) {
    const venue = (servicos || []).map(s => s && s.extra && s.extra.venue).find(v => v && v.city);
    if (!venue) return { address: '', city: '', state: '' };
    const rua = [venue.street, venue.number].filter(Boolean).join(', ');
    return { address: rua, city: venue.city || '', state: venue.state || '' };
  }

  function mapearFornecedorVitrine(f) {
    const servicos = (f.products || []).filter(p => p.active !== false);
    // "Minha empresa" pode ter endereço comercial próprio (032_empresa_config).
    const usaPerfil = f.usa_endereco_perfil !== false;
    // Portfólio do Hub: cada foto é { url, comentario, uploadedAt } (as antigas
    // podem ser só a URL em texto) — vira sempre { url, comentario }.
    const portfolioItens = (Array.isArray(f.portfolio_images) ? f.portfolio_images : [])
      .map(foto => (typeof foto === 'string'
        ? { url: foto, comentario: '' }
        : (foto && foto.url ? { url: foto.url, comentario: String(foto.comentario || '').trim() } : null)))
      .filter(Boolean);
    const fotos = portfolioItens.map(p => p.url);
    const capasServicos = servicos.map(s => s.cover_image_url).filter(Boolean);
    // Imagem do card (lista 5:3, grid 4:3, capa do perfil): a original da
    // capa com o ponto de foco que o fornecedor escolheu no recorte
    // (extra.cover, Hub) — cada formato "cobre" em volta do foco, em vez de
    // cortar o recorte 14:5 pelo centro. Sem original/foco: capa e centro.
    const capaPrincipal = servicos.map(s => {
      const meta = (s.extra && s.extra.cover) || null;
      const src = (meta && meta.originalUrl) || s.cover_image_url;
      if (!src) return null;
      const foco = meta && meta.focus && Number.isFinite(meta.focus.x) && Number.isFinite(meta.focus.y) ? meta.focus : null;
      return { id: s.id, src, focus: foco ? `${foco.x}% ${foco.y}%` : '50% 50%' };
    }).find(Boolean) || null;
    // Portfólio do perfil = só as fotos de Configurações › Minha Empresa ›
    // Portfólio (fornecedores.portfolio_images). Sem foto lá, a seção não
    // aparece — a galeria de cada serviço fica no card do serviço.
    const comPreco = servicos.filter(s => Number(s.price) > 0).sort((a, b) => Number(a.price) - Number(b.price));
    const maisBarato = comPreco[0];

    return {
      id: f.id,
      name: f.company_name || 'Fornecedor',
      description: f.description || '',
      about: f.description || '',
      address: (usaPerfil ? f.address : f.business_address) || enderecoDoEspacoDoServico(servicos).address,
      // Sem cidade no perfil do Hub: usa a do espaço cadastrado no serviço.
      city: (usaPerfil ? f.city : f.business_city) || enderecoDoEspacoDoServico(servicos).city,
      state: (usaPerfil ? f.state : f.business_state) || enderecoDoEspacoDoServico(servicos).state,
      image: fotos[0] || (capaPrincipal && capaPrincipal.src) || '',
      imageFocus: (fotos[0] || !capaPrincipal) ? '50% 50%' : capaPrincipal.focus,
      imageServiceId: capaPrincipal ? capaPrincipal.id : null,
      // Cards do Explorar (lista e grid): a capa já recortada no Hub (14:5,
      // 1400×500) — mostrada no mesmo formato, fica idêntica ao que o
      // fornecedor enquadrou. Sem capa: a primeira foto do portfólio.
      cardImage: (servicos.map(s => s.cover_image_url).find(Boolean)) || fotos[0] || '',
      avatar: f.avatar_url || '', // capa (logo_url) não serve de avatar: sem foto, ficam as iniciais
      portfolioPhotos: fotos,
      portfolioItens,
      services: servicos,
      // Categoria do fornecedor = categorias dos serviços que ele cadastrou
      // (o B2B não tem categoria no nível do fornecedor).
      categories: [...new Set(servicos.map(s => s.category).filter(Boolean))],
      mainCategory: servicos.find(s => s.category)?.category || '',
      subcategories: [...new Set(servicos.map(s => subcategoriaAtual(s.extra?.subcategory)).filter(Boolean))],
      priceNum: maisBarato ? Number(maisBarato.price) : 0,
      pricingType: maisBarato?.extra?.pricing?.type || (maisBarato ? 'VALOR_FIXO' : 'SOB_CONSULTA'),
      // Favorito é por serviço (ver cardsPorServico); a empresa em si não é favoritada.
      isFavorite: false,
      // Capa e foto da empresa (Configurações › Minha Empresa no Hub).
      capaEmpresa: f.logo_url || '',
      avaliacaoMedia: (b2bAvaliacoesResumo.get(f.id) || {}).media || 0,
      avaliacaoTotal: (b2bAvaliacoesResumo.get(f.id) || {}).total || 0
    };
  }

  // Carrega uma vez por sessão (e de novo só se pedido). Sem sessão não
  // carrega — a policy de fornecedores/products é só pra quem está logado.
  let b2bFornecedoresCarregadosEm = 0;
  function carregarFornecedoresVitrine({ forcar = false } = {}) {
    const userId = window.loveClienteSession?.user?.id;
    if (!userId) return Promise.resolve([]);
    if (b2bFornecedoresPromise && !forcar) return b2bFornecedoresPromise;
    b2bFornecedoresCarregadosEm = Date.now();

    b2bFornecedoresPromise = (async () => {
      const buscarFornecedores = () => supabaseClient
        .from('fornecedores')
        .select('id, company_name, description, avatar_url, logo_url, address, city, state, usa_endereco_perfil, business_address, business_city, business_state, portfolio_images, status, products(id, name, category, price, description, active, cover_image_url, gallery, extra)')
        .neq('status', 'bloqueado')
        .order('company_name');
      const [fornecedoresRes, favoritosRes, avaliacoesRes] = await Promise.all([
        buscarFornecedores(),
        supabaseClient
          .from('servicos_favoritos')
          .select('produto_id')
          .eq('cliente_id', userId),
        supabaseClient
          .from('fornecedores_avaliacoes')
          .select('fornecedor_id, nota')
      ]);

      if (favoritosRes.error) console.error('[vitrine] favoritos:', favoritosRes.error);
      b2bFavoritosIds = new Set((favoritosRes.data || []).map(r => r.produto_id));
      // Média e quantidade de avaliações por fornecedor (estrelas do perfil).
      b2bAvaliacoesResumo = new Map();
      if (!avaliacoesRes.error) {
        (avaliacoesRes.data || []).forEach(a => {
          const r = b2bAvaliacoesResumo.get(a.fornecedor_id) || { soma: 0, total: 0 };
          r.soma += Number(a.nota) || 0; r.total += 1;
          b2bAvaliacoesResumo.set(a.fornecedor_id, r);
        });
        b2bAvaliacoesResumo.forEach(r => { r.media = r.total ? r.soma / r.total : 0; });
      }

      if (fornecedoresRes.error) {
        console.error('[vitrine] fornecedores:', fornecedoresRes.error);
        b2bFornecedores = [];
      } else {
        b2bFornecedores = (fornecedoresRes.data || [])
          .map(mapearFornecedorVitrine)
          .filter(f => f.services.length > 0);
      }
      b2bFornecedoresCarregados = true;
      return b2bFornecedores;
    })();

    return b2bFornecedoresPromise;
  }

  // Serviço publicado no Hub depois que a página abriu: ao voltar para o
  // Explorar, a vitrine é buscada de novo (no máximo a cada 20s) e redesenha.
  function atualizarVitrineSeAntiga() {
    if (!b2bFornecedoresCarregados || Date.now() - b2bFornecedoresCarregadosEm < 20000) return;
    carregarFornecedoresVitrine({ forcar: true }).then(() => {
      aplicarCidadePadraoVitrine();
      renderB2BCityFilter();
      if (currentB2BView !== 'messages' && currentB2BView !== 'contracted') renderB2BExplore();
    }).catch(e => console.error('[vitrine] atualizar:', e));
  }

  // Cidades que têm fornecedor na vitrine (filtro rápido acima da lista).
  function cidadesDaVitrine() {
    const porCidade = new Map();
    b2bFornecedores.forEach(f => {
      const cidade = (f.city || '').trim();
      if (cidade && !porCidade.has(cidade)) porCidade.set(cidade, { city: cidade, uf: (f.state || '').trim().toUpperCase() });
    });
    return [...porCidade.values()].sort((a, b) => a.city.localeCompare(b.city, 'pt-BR'));
  }

  // Chat/Contratar abrem (ou criam) a conversa real com aquele fornecedor.
  async function abrirChatComFornecedor(fornecedorId) {
    // Já marca a conversa desse fornecedor como a ativa (se estiver na
    // memória), para o Chat abrir direto nela.
    const conhecida = fornecedorId && b2bConversationsData.find(c => c.fornecedorId === fornecedorId);
    if (conhecida) activeB2BConversationId = conhecida.id;
    switchB2BView('messages');
    if (fornecedorId && window.LoveChatService) {
      await window.LoveChatService.openConversationWithFornecedor(fornecedorId);
    }
  }

  let b2bSelectedCity = null;
  // Cidade escolhida à mão nas caixinhas; enquanto for false, o Explorar
  // segue a cidade do evento ativo (aplicarCidadePadraoVitrine).
  let b2bCityChosenByUser = false;

  // "São Paulo" ≡ "sao paulo " ≡ "SÃO PAULO": comparação de cidade sem
  // acento, caixa nem espaço sobrando — o cadastro do Hub e o CEP do evento
  // escrevem de jeitos diferentes.
  function cidadeNormalizada(valor) {
    return String(valor || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();
  }

  function cidadeDoEventoAtivo() {
    const ev = getActiveEvent();
    return ((ev && ev.eventDetails && ev.eventDetails.city) || '').trim();
  }

  // Por padrão o Explorar mostra só quem atende a cidade do evento — um
  // fornecedor cadastrado em Indaiatuba não aparece pra um evento em São
  // Paulo. Usa a grafia da vitrine quando há fornecedor lá; senão a do
  // evento, e a lista fica vazia dizendo a cidade (as caixinhas deixam
  // trocar). Evento sem cidade: mostra todas.
  function aplicarCidadePadraoVitrine() {
    if (b2bCityChosenByUser) return;
    const cidadeEvento = cidadeDoEventoAtivo();
    if (!cidadeEvento) { b2bSelectedCity = null; return; }
    const naVitrine = cidadesDaVitrine().find(c => cidadeNormalizada(c.city) === cidadeNormalizada(cidadeEvento));
    b2bSelectedCity = naVitrine ? naVitrine.city : cidadeEvento;
  }

  // Alternância Lista / Grid do Explorar — lista é o padrão.
  let b2bViewMode = 'list';

  let b2bMarketplaceInitialized = false;
  function initB2BMarketplace() {
    if (b2bMarketplaceInitialized) return;
    b2bMarketplaceInitialized = true;

    // 12.1 Navegação por Abas Principais B2B (Explorar, Mensagens, Favoritos)
    const b2bNavTabs = document.querySelectorAll('.tab-b2b-nav');
    b2bNavTabs.forEach(tab => {
      tab.addEventListener('click', () => {
        const view = tab.getAttribute('data-b2b-view');
        switchB2BView(view);
      });
    });

    // 12.2 Drawer de Categorias (abre ao clicar na caixa de busca) — mesma
    // árvore de categorias/subcategorias do cadastro de produto no B2B.
    const b2bSearchContainer = document.getElementById('b2b-search-container');
    const b2bCategoryMenu = document.getElementById('b2b-category-menu');
    if (b2bSearchContainer && b2bCategoryMenu) {
      b2bSearchContainer.addEventListener('click', (e) => {
        e.stopPropagation();
        // Sempre abre (nunca fecha por clicar de novo na caixa) — fechar é
        // só clicando fora ou escolhendo uma categoria.
        openB2BCategoryMenu();
      });
      document.addEventListener('click', (e) => {
        if (!b2bCategoryMenu.classList.contains('hidden') && !b2bSearchContainer.contains(e.target)) {
          closeB2BCategoryMenu();
        }
      });
    }

    // 12.3 Busca em Tempo Real
    const b2bSearch = document.getElementById('b2b-search-input');
    if (b2bSearch) {
      b2bSearch.addEventListener('input', (e) => {
        if (currentB2BView === 'messages') {
          renderB2BChatContacts(e.target.value);
        } else if (currentB2BView !== 'contracted') {
          b2bSearchQuery = e.target.value.toLowerCase().trim();
          renderB2BExplore();
        }
      });
    }

    // 12.3.1 Dropdown de Ordenação (Recomendados, Avaliações, Maior valor, Menor valor)
    const btnSort = document.getElementById('btn-b2b-sort-dropdown');
    const sortMenu = document.getElementById('b2b-sort-menu');
    const sortChevron = document.getElementById('b2b-sort-chevron');
    const sortLabel = document.getElementById('b2b-sort-label');

    if (btnSort && sortMenu) {
      btnSort.addEventListener('click', (e) => {
        e.stopPropagation();
        const isHidden = sortMenu.classList.contains('hidden');
        sortMenu.classList.toggle('hidden', !isHidden);
        if (sortChevron) sortChevron.style.transform = isHidden ? 'rotate(180deg)' : 'rotate(0deg)';
      });

      document.addEventListener('click', (e) => {
        if (!sortMenu.contains(e.target) && !btnSort.contains(e.target)) {
          sortMenu.classList.add('hidden');
          if (sortChevron) sortChevron.style.transform = 'rotate(0deg)';
        }
      });
    }

    document.querySelectorAll('.b2b-sort-option').forEach(opt => {
      opt.addEventListener('click', (e) => {
        e.stopPropagation();
        const sortVal = opt.getAttribute('data-sort');
        if (!sortVal) return;
        currentB2BSort = sortVal;
        const labels = {
          'recommended': 'Recomendados',
          'rating': 'Avaliações',
          'price-desc': 'Maior valor',
          'price-asc': 'Menor valor'
        };
        if (sortLabel) sortLabel.textContent = labels[sortVal] || 'Recomendados';

        document.querySelectorAll('.b2b-sort-option').forEach(o => {
          const check = o.querySelector('.sort-check');
          if (check) check.classList.toggle('hidden', o !== opt);
        });

        if (sortMenu) sortMenu.classList.add('hidden');
        if (sortChevron) sortChevron.style.transform = 'rotate(0deg)';

        renderB2BExplore();
      });
    });

    // Setas "<"/">" do filtro de cidade: arrastam a fileira de caixinhas
    // pra ver mais nomes de cidade além do que cabe na largura visível.
    document.getElementById('btn-b2b-city-scroll-next')?.addEventListener('click', () => {
      document.getElementById('b2b-city-filter-row')?.scrollBy({ left: 240, behavior: 'smooth' });
    });
    document.getElementById('btn-b2b-city-scroll-prev')?.addEventListener('click', () => {
      document.getElementById('b2b-city-filter-row')?.scrollBy({ left: -240, behavior: 'smooth' });
    });
    // A seta "<" só faz sentido depois que a fileira foi rolada pra direita —
    // em São Paulo (primeira cidade) não há pra onde voltar.
    document.getElementById('b2b-city-filter-row')?.addEventListener('scroll', updateB2BCityScrollArrows);
    updateB2BCityScrollArrows();

    // Alternância Lista / Grid do Explorar.
    document.getElementById('btn-b2b-view-list')?.addEventListener('click', () => {
      b2bViewMode = 'list';
      renderB2BViewToggle();
      renderB2BExplore();
    });
    document.getElementById('btn-b2b-view-grid')?.addEventListener('click', () => {
      b2bViewMode = 'grid';
      renderB2BViewToggle();
      renderB2BExplore();
    });
    renderB2BViewToggle();

    // 12.5 Inicialização do Chat Messenger B2B & Render Inicial
    initB2BChatHandlers();
    renderB2BCityFilter();
    renderB2BExplore();
  }

  // Caixinhas de cidade acima da lista do Explorar — filtro rápido por
  // localização, junto com o que já é filtrado por categoria/busca.
  // Campo "Em … Local" da barra do Explorar: digitar a cidade filtra a
  // vitrine (Enter ou ao parar de digitar). Aceita parte do nome e ignora
  // acento/maiúscula ("indaia" → Indaiatuba). Vazio = todas as cidades.
  function aplicarCidadeDigitada(texto) {
    const digitado = String(texto || '').trim();
    b2bCityChosenByUser = true;
    if (!digitado) {
      b2bSelectedCity = null;
    } else {
      const alvo = cidadeNormalizada(digitado);
      const cidades = cidadesDaVitrine();
      const exata = cidades.find(c => cidadeNormalizada(c.city) === alvo);
      const parcial = cidades.find(c => cidadeNormalizada(c.city).startsWith(alvo)) || cidades.find(c => cidadeNormalizada(c.city).includes(alvo));
      b2bSelectedCity = (exata || parcial) ? (exata || parcial).city : digitado;
    }
    renderB2BCityFilter();
    renderB2BExplore();
  }
  (function ligarCampoLocalDoExplorar() {
    const input = document.getElementById('b2b-location-input');
    if (!input || input.dataset.ligado) return;
    input.dataset.ligado = '1';
    let timer = null;
    input.addEventListener('input', () => {
      clearTimeout(timer);
      timer = setTimeout(() => aplicarCidadeDigitada(input.value), 450);
    });
    input.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter') return;
      e.preventDefault();
      clearTimeout(timer);
      aplicarCidadeDigitada(input.value);
      const escolhida = b2bSelectedCity || '';
      if (escolhida) input.value = escolhida;
    });
  })();

  function renderB2BCityFilter() {
    const row = document.getElementById('b2b-city-filter-row');
    if (!row) return;
    // O campo "Local" mostra a cidade que está filtrando (se não estiver sendo digitado).
    const campoLocal = document.getElementById('b2b-location-input');
    if (campoLocal && document.activeElement !== campoLocal) campoLocal.value = b2bSelectedCity || '';

    const cidades = cidadesDaVitrine();
    // Só as cidades que têm fornecedor na vitrine; sem nenhuma, a barra some.
    document.getElementById('b2b-city-filter-wrap')?.classList.toggle('hidden', cidades.length === 0 || currentB2BCategory === 'favorites');
    row.innerHTML = cidades.map(({ city, uf }) => {
      const active = cidadeNormalizada(b2bSelectedCity) === cidadeNormalizada(city);
      return `
        <button type="button" class="btn-b2b-city-chip px-3.5 py-1.5 text-xs font-semibold border transition-colors cursor-pointer shrink-0 whitespace-nowrap ${active ? 'bg-[#537bae] text-white border-[#537bae]' : 'bg-white text-zinc-600 border-zinc-200 hover:bg-zinc-50'}" data-city="${escaparHtml(city)}">
          ${escaparHtml(city)}${uf ? ` (${escaparHtml(uf)})` : ''}
        </button>
      `;
    }).join('');

    row.querySelectorAll('.btn-b2b-city-chip').forEach(btn => {
      btn.addEventListener('click', () => {
        const city = btn.getAttribute('data-city');
        b2bCityChosenByUser = true;
        b2bSelectedCity = (cidadeNormalizada(b2bSelectedCity) === cidadeNormalizada(city)) ? null : city;
        renderB2BCityFilter();
        renderB2BExplore();
      });
    });

    updateB2BCityScrollArrows();
  }

  // Esconde a seta "<" quando a fileira de cidades está no começo (nada
  // pra voltar) — só aparece depois que a pessoa rola pra direita.
  function updateB2BCityScrollArrows() {
    const row = document.getElementById('b2b-city-filter-row');
    const prevBtn = document.getElementById('btn-b2b-city-scroll-prev');
    if (!row || !prevBtn) return;
    prevBtn.classList.toggle('hidden', row.scrollLeft <= 0);
  }

  // Destaca o botão ativo da alternância Lista / Grid.
  function renderB2BViewToggle() {
    const listBtn = document.getElementById('btn-b2b-view-list');
    const gridBtn = document.getElementById('btn-b2b-view-grid');
    if (!listBtn || !gridBtn) return;
    const activeClasses = ['bg-[#181D24]', 'text-[#ebf4ff]'];
    const inactiveClasses = ['text-zinc-400', 'hover:bg-zinc-50', 'hover:text-zinc-700'];
    [listBtn, gridBtn].forEach(btn => btn.classList.remove(...activeClasses, ...inactiveClasses));
    const activeBtn = b2bViewMode === 'grid' ? gridBtn : listBtn;
    const inactiveBtn = b2bViewMode === 'grid' ? listBtn : gridBtn;
    activeBtn.classList.add(...activeClasses);
    inactiveBtn.classList.add(...inactiveClasses);
  }

  // Selo de avaliação (anel + ícone) do card, em nota de 0 a 10 — usado na
  // lista e no grid. Ícone e anel em amarelo (mesma cor da estrela).
  // "★★★★☆ (12)" — média de 1 a 5; sem avaliação, cinco estrelas vazias e (0).
  function estrelasHtml(media, total) {
    const m = Math.max(0, Math.min(5, Number(media) || 0));
    const cheias = Math.round(m);
    const estrela = cheia => `<svg viewBox="0 0 20 20" class="${cheia ? 'b2b-estrela-cheia' : 'b2b-estrela-vazia'}" aria-hidden="true"><path fill="currentColor" d="M10 1.5l2.6 5.4 5.9.8-4.3 4.1 1.1 5.9L10 14.9l-5.3 2.8 1.1-5.9L1.5 7.7l5.9-.8L10 1.5z"/></svg>`;
    let html = '<span class="b2b-estrelas" title="' + (total ? `${m.toFixed(1)} de 5` : 'Sem avaliações') + '">';
    for (let i = 1; i <= 5; i++) html += estrela(i <= cheias);
    html += `</span><span class="text-zinc-500 text-sm">(${Number(total) || 0})</span>`;
    return html;
  }

  // Lista de avaliações do fornecedor (RPC avaliacoes_do_fornecedor).
  async function carregarAvaliacoesDoPerfil(item) {
    const lista = document.getElementById('b2b-profile-reviews-list');
    if (!lista || !item || !ehUuid(item.id)) { if (lista) lista.innerHTML = '<p class="text-sm text-zinc-400">Ainda sem avaliações.</p>'; return; }
    lista.innerHTML = '<p class="text-sm text-zinc-400">Carregando…</p>';
    const { data, error } = await supabaseClient.rpc('avaliacoes_do_fornecedor', { p_fornecedor_id: item.id });
    if (!activeB2BProfileItem || activeB2BProfileItem.id !== item.id) return;
    if (error || !Array.isArray(data) || !data.length) {
      if (error && !/function|schema cache/i.test(error.message || '')) console.error('[perfil] avaliações:', error);
      lista.innerHTML = '<p class="text-sm text-zinc-400">Ainda sem avaliações.</p>';
      return;
    }
    lista.innerHTML = data.map(a => `
      <div class="b2b-avaliacao">
        <div class="flex items-center justify-between gap-3 flex-wrap">
          <p class="text-sm font-semibold text-zinc-900">${escaparHtml(a.autor || 'Anfitrião')}</p>
          ${estrelasHtml(a.nota, 0).replace(/<span class="text-zinc-500 text-sm">\(0\)<\/span>/, '')}
        </div>
        ${a.comentario ? `<p class="text-sm text-zinc-600 mt-1.5 leading-relaxed">${escaparHtml(a.comentario)}</p>` : ''}
        <p class="text-[11px] text-zinc-400 mt-1.5">${escaparHtml(new Date(a.created_at).toLocaleDateString('pt-BR'))}</p>
      </div>`).join('');
  }

  // "por Empresa" na página do serviço abre a página da empresa (sem serviço),
  // lembrando o serviço de origem para o caminho do topo.
  document.addEventListener('click', (e) => {
    const link = e.target.closest('.b2b-profile-empresa-link, #b2b-profile-ver-mais-servicos');
    if (link && activeB2BProfileItem) openB2BVendorProfile(activeB2BProfileItem, null, activeB2BProfileServico);
  });

  // Caminho do topo da página: Explorar › Serviço (quando houver) › Empresa.
  // A última parte é a página atual; as anteriores são links.
  function renderB2BProfileBreadcrumb(item, servicoAtual) {
    const nav = document.getElementById('b2b-profile-breadcrumb');
    if (!nav) return;
    const rotuloLista = currentB2BView === 'favorites' ? 'Favoritos' : 'Explorar';
    const partes = [{ texto: rotuloLista, acao: 'lista' }];
    if (servicoAtual) {
      partes.push({ texto: (servicoAtual.name || 'Serviço').trim() });
    } else {
      const origem = b2bServicoDeOrigem && (item.services || []).some(s => s.id === b2bServicoDeOrigem.id) ? b2bServicoDeOrigem : null;
      if (origem) partes.push({ texto: (origem.name || 'Serviço').trim(), acao: 'servico' });
      partes.push({ texto: item.name || 'Empresa' });
    }
    nav.innerHTML = partes.map((p, i) => {
      const ultima = i === partes.length - 1;
      const sep = i > 0 ? '<span class="b2b-breadcrumb-sep" aria-hidden="true">›</span>' : '';
      return sep + (ultima
        ? `<span class="b2b-breadcrumb-atual" aria-current="page">${escaparHtml(p.texto)}</span>`
        : `<button type="button" class="b2b-breadcrumb-link" data-breadcrumb="${p.acao}">${escaparHtml(p.texto)}</button>`);
    }).join('');
  }

  document.getElementById('b2b-profile-breadcrumb')?.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-breadcrumb]');
    if (!btn) return;
    if (btn.dataset.breadcrumb === 'servico') {
      // Empresa aberta a partir do serviço nesta sessão: volta pelo histórico.
      if (history.state?.voltarComHistorico && b2bServicoDeOrigem) { history.back(); return; }
      if (activeB2BProfileItem && b2bServicoDeOrigem) openB2BVendorProfile(activeB2BProfileItem, b2bServicoDeOrigem);
      return;
    }
    // Explorar (ou Favoritos): volta para a lista.
    closeB2BVendorProfile();
    const lista = caminhoSubRota('b2b', currentB2BView);
    history.pushState({ loveRoute: lista }, '', lista);
  });

  function b2bRatingBadgeHTML(item, compact) {
    const recommendPct = Math.round(((item.rating || 4.9) / 5) * 100);
    const ratingScore = (recommendPct / 10).toFixed(1);
    const ringRadius = 9;
    const ringCircumference = 2 * Math.PI * ringRadius;
    const ringOffset = ringCircumference * (1 - recommendPct / 100);
    const ringSizeClass = compact ? 'w-5 h-5' : 'w-8 h-8';
    const iconSizeClass = compact ? 'w-3 h-3' : 'w-4 h-4';
    return `
      <div class="relative ${ringSizeClass} shrink-0">
        <svg class="${ringSizeClass} -rotate-90" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="${ringRadius}" fill="none" stroke="#E4E4E7" stroke-width="2.5"></circle>
          <circle cx="12" cy="12" r="${ringRadius}" fill="none" stroke="#fbbf24" stroke-width="2.5" stroke-linecap="round" stroke-dasharray="${ringCircumference.toFixed(2)}" stroke-dashoffset="${ringOffset.toFixed(2)}"></circle>
        </svg>
        <svg class="${iconSizeClass} absolute inset-0 m-auto text-amber-400" fill="currentColor" viewBox="0 0 24 24"><path d="M5 16L3 5l5.5 5L12 4l3.5 6L21 5l-2 11H5zm0 2h14v2H5v-2z"/></svg>
      </div>
      <span class="font-semibold text-zinc-700">${ratingScore}</span>
    `;
  }

  // Preço de vitrine do card: segue a mesma unidade de cobrança cadastrada
  // pelo fornecedor em B2B/produtos.html (POR_HORA, POR_PESSOA, VALOR_FIXO,
  // SOB_CONSULTA — ver B2B/js/produtos.js:productPriceLabel).
  function b2bPriceLabel(item) {
    const amount = item.priceNum;
    if (!amount) return item.startingPrice || item.price || 'Sob consulta';
    const formatted = `R$ ${amount.toLocaleString('pt-BR')}`;
    if (item.pricingType === 'POR_HORA') return `A partir de ${formatted} a hora`;
    if (item.pricingType === 'POR_PESSOA') return `A partir de ${formatted} por pessoa`;
    if (item.pricingType === 'SOB_CONSULTA') return 'Sob consulta';
    return `A partir de ${formatted}`;
  }

  // A vitrine mostra UM CARD POR SERVIÇO ativo (não um por fornecedor): quem
  // oferece Bar e Bebidas e também Buffet aparece nas duas categorias, cada
  // card com a capa, a categoria e o preço daquele serviço. Clicar abre o
  // perfil do fornecedor com todos os serviços dele.
  function cardsPorServico(fornecedor) {
    return (fornecedor.services || []).map(s => {
      const preco = Number(s.price) > 0 ? Number(s.price) : 0;
      return {
        ...fornecedor,
        servicoCard: s,
        isFavorite: b2bFavoritosIds.has(s.id),
        cardImage: s.cover_image_url || fornecedor.cardImage,
        imageServiceId: s.id,
        description: s.description || fornecedor.description,
        mainCategory: s.category || '',
        categories: s.category ? [s.category] : [],
        subcategories: [subcategoriaAtual(s.extra && s.extra.subcategory)].filter(Boolean),
        priceNum: preco,
        pricingType: (s.extra && s.extra.pricing && s.extra.pricing.type) || (preco ? 'VALOR_FIXO' : 'SOB_CONSULTA')
      };
    });
  }

  // Título do card = nome do serviço criado no Hub (ex.: "Buffet Brasileiro");
  // sem nome, o da empresa.
  function tituloDoCard(item) {
    const servico = item.servicoCard && item.servicoCard.name ? item.servicoCard.name.trim() : '';
    return servico || item.name || '';
  }

  // Cidade do card (onde antes ficava a categoria): "Indaiatuba (SP)".
  function cidadeDoCardHtml(item) {
    const local = localCurto(item);
    if (!local) return '';
    return `<span class="b2b-cidade-card" title="${escaparHtml(local)}"><svg fill="none" stroke="currentColor" stroke-width="1.75" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"/><path stroke-linecap="round" stroke-linejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z"/></svg><span>${escaparHtml(local)}</span></span>`;
  }

  // Categoria do serviço no canto superior esquerdo da imagem.
  function categoriaNaImagemHtml(item) {
    const categoria = (item && (item.mainCategory || (item.categories || [])[0])) || '';
    if (!categoria) return '';
    return `<span class="b2b-categoria-imagem">${escaparHtml(categoria)}</span>`;
  }

  // Serviço que o card do Explorar representa (vai na URL do perfil como
  // "source"): o do próprio card, senão o da categoria/subcategoria
  // filtrada, senão o da capa, senão o primeiro.
  function servicoDestaque(item) {
    if (item.servicoCard) return item.servicoCard;
    const servicos = item.services || [];
    if (b2bSelectedMainCategory) {
      const daCategoria = servicos.find(s => s.category === b2bSelectedMainCategory
        && (!b2bSelectedSubcategory || subcategoriaAtual(s.extra && s.extra.subcategory) === b2bSelectedSubcategory));
      if (daCategoria) return daCategoria;
    }
    return servicos.find(s => s.id === item.imageServiceId) || servicos[0] || null;
  }

  function renderB2BExplore() {
    const listContainer = document.getElementById('b2b-cards-list-container');
    const resultsCountEl = document.getElementById('b2b-results-count');

    if (!listContainer) return;
    listContainer.innerHTML = '';
    listContainer.className = b2bViewMode === 'grid'
      ? 'w-full grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5'
      : 'w-full flex flex-col divide-y divide-zinc-200/80';

    // Vitrine real (Supabase): na primeira vez carrega e redesenha.
    if (!b2bFornecedoresCarregados) {
      listContainer.innerHTML = '<div class="p-12 text-center text-sm text-zinc-400">Carregando fornecedores…</div>';
      if (window.loveClienteSession) {
        carregarFornecedoresVitrine().then(() => {
          aplicarCidadePadraoVitrine();
          renderB2BCityFilter();
          renderB2BExplore();
        });
      }
      return;
    }

    aplicarCidadePadraoVitrine();

    let items = b2bFornecedores.flatMap(cardsPorServico);
    let categoryName = 'serviços';

    if (currentB2BCategory === 'favorites') {
      items = items.filter(item => item.isFavorite);
      categoryName = 'itens favoritados';
    }

    // Categoria/subcategoria escolhida no drawer de busca (mesma árvore do
    // cadastro de produto no B2B) — filtra por cima do que já foi montado
    // acima (currentB2BCategory vira 'all' ao escolher uma categoria aqui,
    // pra buscar em todos os tipos de fornecedor, não só no tipo da aba atual).
    if (b2bSelectedMainCategory) {
      items = items.filter(item => (item.categories || []).includes(b2bSelectedMainCategory) &&
        (!b2bSelectedSubcategory || (item.subcategories || []).includes(b2bSelectedSubcategory)));
      categoryName = b2bSelectedSubcategory || b2bSelectedMainCategory;
    }

    if (b2bSelectedCity && currentB2BCategory !== 'favorites') {
      items = items.filter(item => cidadeNormalizada(item.city) === cidadeNormalizada(b2bSelectedCity));
    }

    if (b2bSearchQuery) {
      const q = b2bSearchQuery.toLowerCase();
      items = items.filter(item =>
        (item.name && item.name.toLowerCase().includes(q)) ||
        (item.city && item.city.toLowerCase().includes(q)) ||
        ((item.servicoCard && item.servicoCard.name) || '').toLowerCase().includes(q) ||
        (item.mainCategory || '').toLowerCase().includes(q) ||
        (item.description && item.description.toLowerCase().includes(q)) ||
        (item.neighborhood && item.neighborhood.toLowerCase().includes(q))
      );
    }

    // Ordenação dinâmica
    if (currentB2BSort === 'rating') {
      items.sort((a, b) => (b.rating || 4.9) - (a.rating || 4.9) || (b.reviewsCount || 0) - (a.reviewsCount || 0));
    } else if (currentB2BSort === 'price-asc') {
      const getPrice = (i) => i.priceNum || parseFloat((i.price || i.startingPrice || '0').replace(/[^0-9]/g, '')) || 0;
      items.sort((a, b) => getPrice(a) - getPrice(b));
    } else if (currentB2BSort === 'price-desc') {
      const getPrice = (i) => i.priceNum || parseFloat((i.price || i.startingPrice || '0').replace(/[^0-9]/g, '')) || 0;
      items.sort((a, b) => getPrice(b) - getPrice(a));
    }

    if (resultsCountEl) {
      resultsCountEl.innerHTML = `<strong class="font-semibold text-zinc-900">${items.length}</strong> ${categoryName} encontrados${currentB2BCategory === 'favorites' ? '' : ` em ${b2bSelectedCity || 'todas as cidades'}`}`;
    }

    if (items.length === 0) {
      const mensagemVazia = currentB2BCategory === 'favorites'
        ? 'Você ainda não favoritou nenhum fornecedor.'
        : (b2bFornecedores.length === 0
          ? 'Ainda não há fornecedores na vitrine.'
          : (b2bSelectedCity && !b2bSelectedMainCategory && !b2bSearchQuery
            ? `Ainda não há fornecedores em ${escaparHtml(b2bSelectedCity)}. Escolha outra cidade acima.`
            : 'Nenhum fornecedor encontrado com esses filtros.'));
      // Mesmo visual das caixas de Benefícios Love: sem linha, com a sombra
      // leve da regra global de .bg-white.rounded-*.
      listContainer.innerHTML = `<div class="p-12 text-center bg-white border border-transparent rounded-2xl text-sm text-zinc-500">${mensagemVazia}</div>`;
      return;
    }

    items.forEach(item => {
      const priceLabel = b2bPriceLabel(item);

      if (b2bViewMode === 'grid') {
        listContainer.appendChild(buildB2BGridCard(item, { priceLabel }));
        return;
      }

      const card = document.createElement('div');
      // Primeiro card do fornecedor mantém o id antigo (mapa); os outros
      // serviços dele ganham o id do serviço junto.
      card.id = document.getElementById(`card-${item.id}`) ? `card-${item.id}-${item.imageServiceId}` : `card-${item.id}`;
      // Sem padding à esquerda no desktop (onde a imagem fica ao lado do
      // texto): ela fica flush com a borda do container, igual ao card do
      // grid (que não tem padding próprio) — sem isso a margem esquerda da
      // foto ficava diferente ao trocar lista/grid. No mobile (empilhado)
      // mantém o padding de todos os lados, já que a imagem fica em cima.
      // first:pt-0 no primeiro card: sem padding-top extra ali, a margem
      // até o filtro de cidade acima fica igual à do grid (que não tem
      // padding próprio nenhum).
      card.className = 'b2b-item-card group flex flex-col md:flex-row gap-6 items-stretch w-full p-6 md:pl-0 first:pt-0 cursor-pointer';

      card.innerHTML = `
        <!-- Imagem prévia da empresa -->
        <div class="btn-open-supplier-gallery relative w-full md:w-[22rem] aspect-[14/5] self-start rounded-xl overflow-hidden bg-zinc-100 flex-shrink-0 cursor-pointer">
          ${(item.cardImage || item.image)
            ? `<img src="${escaparHtml(item.cardImage || item.image)}" alt="${escaparHtml(item.name)}" style="object-position:${item.cardImage ? '50% 50%' : (item.imageFocus || '50% 50%')}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300">`
            : '<div class="w-full h-full bg-gradient-to-br from-blue-50 via-zinc-50 to-orange-50"></div>'}
        </div>

        <div class="flex-1 flex flex-col justify-between min-w-0">
          <div>
            <div class="flex items-start justify-between gap-3 flex-nowrap">
              <div class="min-w-0 flex-1">
                <div class="min-w-0">
                  <h4 class="text-base sm:text-lg font-bold text-zinc-900 truncate font-sans tracking-tight group-hover:text-[#537bae] transition-colors" title="${escaparHtml(tituloDoCard(item))}">
                    ${escaparHtml(tituloDoCard(item))}
                  </h4>
                  <p class="text-sm text-zinc-400 font-medium font-sans truncate">por ${escaparHtml(item.name)}</p>
                </div>
              </div>

              <!-- Favoritar, Mensagens e Solicitar no topo à direita: não quebram para a linha de baixo -->
              <div class="flex items-center gap-2.5 shrink-0">
                <!-- Favoritar à esquerda do Mensagens (saiu de cima da foto) -->
                <button type="button" class="btn-toggle-card-fav w-10 h-10 shrink-0 rounded-full bg-white shadow-md text-zinc-300 hover:text-rose-500 flex items-center justify-center transition-colors cursor-pointer" data-dica="Favoritar" aria-label="Favoritar"><svg class="w-4 h-4 ${item.isFavorite ? 'fill-[#c7305b] text-[#c7305b]' : 'fill-none text-zinc-300'} stroke-current" stroke-width="1.75" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z"/></svg></button>
                <button type="button" class="btn-message-supplier btn-secondary">
                  <span>Mensagens</span>
                </button>
                <button type="button" class="btn-hire-supplier px-5 py-2.5 rounded-xl bg-[#333333] hover:bg-[#222222] text-white text-xs sm:text-sm font-bold transition-all shadow-xs cursor-pointer">
                  Solicitar
                </button>
              </div>
            </div>

            <p class="text-sm text-zinc-500 mt-3 leading-relaxed line-clamp-2 font-sans">${escaparHtml(item.description || item.about || '')}</p>
          </div>

          <div class="flex flex-wrap items-center justify-between gap-4 pt-3.5 mt-3.5 border-t border-zinc-100">
            <div class="flex items-center gap-2 text-sm min-w-0">
              <svg class="w-4 h-4 text-zinc-400 shrink-0" fill="none" stroke="currentColor" stroke-width="1.75" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M9.568 3H5.25A2.25 2.25 0 0 0 3 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 0 0 5.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 0 0 9.568 3Z"/><path stroke-linecap="round" stroke-linejoin="round" d="M6 6h.008v.008H6V6Z"/></svg>
              <span class="font-semibold text-zinc-800 truncate">${priceLabel}</span>
            </div>

            <div class="flex items-center gap-3 shrink-0">
              ${item.rating ? `
              <div class="flex items-center gap-1.5 text-sm">
                ${b2bRatingBadgeHTML(item)}
                <span class="text-zinc-400">(${item.reviewsCount || 0})</span>
              </div>` : ''}
              ${cidadeDoCardHtml(item)}
            </div>
          </div>
        </div>
      `;

      // Imagem, nome (resto do card) e "Contratar" abrem a página completa
      // do fornecedor — nunca mais um pop-up ou drawer inferior pra essas 3 ações.
      card.querySelector('.btn-open-supplier-gallery')?.addEventListener('click', (e) => {
        e.stopPropagation();
        openB2BVendorProfile(item, servicoDestaque(item));
      });

      card.querySelector('.btn-toggle-card-fav')?.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleB2BFavorite(item);
        renderB2BExplore();
      });

      card.querySelector('.btn-message-supplier')?.addEventListener('click', (e) => {
        e.stopPropagation();
        abrirChatComFornecedor(item.id);
      });

      card.querySelector('.btn-hire-supplier')?.addEventListener('click', (e) => {
        e.stopPropagation();
        handleB2BHireAction(item);
      });

      card.addEventListener('click', () => {
        openB2BVendorProfile(item, servicoDestaque(item));
      });

      listContainer.appendChild(card);
    });
  }

  // Categoria do fornecedor (a do serviço que ele cadastrou no Hub — ex.:
  // "Bar e Bebidas"), à direita do nome da empresa nos cards do Explorar.
  function categoriaDoFornecedorHtml(item) {
    const categoria = (item && (item.mainCategory || (item.categories || [])[0])) || '';
    if (!categoria) return '';
    return `<span class="b2b-categoria-tag" title="${escaparHtml(categoria)}">${escaparHtml(categoria)}</span>`;
  }

  // Card do modo Grid do Explorar: caixa sem sombra (só borda), imagem com
  // selo de destaque + favoritar, nome, nota, preço/capacidade e CTA.
  function buildB2BGridCard(item, { priceLabel }) {
    const capacityLabel = item.guests ? `Até ${item.guests} pessoas` : '';

    const card = document.createElement('div');
    card.id = `grid-card-${item.id}-${item.imageServiceId}`;
    card.className = 'b2b-grid-card group border border-zinc-200 rounded-xl overflow-hidden bg-[#FFFFFF] cursor-pointer flex flex-col';

    card.innerHTML = `
      <div class="btn-open-supplier-gallery relative w-full aspect-[14/5] bg-zinc-100 overflow-hidden cursor-pointer">
        ${(item.cardImage || item.image)
          ? `<img src="${escaparHtml(item.cardImage || item.image)}" alt="${escaparHtml(item.name)}" style="object-position:${item.cardImage ? '50% 50%' : (item.imageFocus || '50% 50%')}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300">`
          : '<div class="w-full h-full bg-gradient-to-br from-blue-50 via-zinc-50 to-orange-50"></div>'}
      </div>

      <div class="p-4 flex flex-col gap-2.5 flex-1">
        <div class="flex items-start justify-between gap-2 min-w-0">
          <h4 class="text-base font-bold text-zinc-900 truncate font-sans tracking-tight min-w-0" title="${escaparHtml(tituloDoCard(item))}">${escaparHtml(tituloDoCard(item))}</h4>
          ${cidadeDoCardHtml(item)}
        </div>

        <div class="flex items-center gap-1.5 text-sm text-zinc-600">
          ${item.rating ? `
          ${b2bRatingBadgeHTML(item, true)}
          <span class="text-zinc-400">(${item.reviewsCount || 0})</span>
          <span class="text-zinc-400">·</span>` : ''}
          <span class="truncate">por ${escaparHtml(item.name)}</span>
        </div>

        <div class="flex items-center gap-3 text-sm text-zinc-600 flex-wrap">
          <span class="flex items-center gap-1.5">
            <svg class="w-4 h-4 text-zinc-400 shrink-0" fill="none" stroke="currentColor" stroke-width="1.75" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M9.568 3H5.25A2.25 2.25 0 0 0 3 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 0 0 5.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 0 0 9.568 3Z"/><path stroke-linecap="round" stroke-linejoin="round" d="M6 6h.008v.008H6V6Z"/></svg>
            ${priceLabel}
          </span>
          ${capacityLabel ? `
            <span class="flex items-center gap-1.5">
              <svg class="w-4 h-4 text-zinc-400 shrink-0" fill="none" stroke="currentColor" stroke-width="1.75" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z"/></svg>
              ${capacityLabel}
            </span>
          ` : ''}
        </div>

        <div class="flex items-center gap-2 mt-auto pt-2">
          <button type="button" class="btn-toggle-card-fav w-9 h-9 shrink-0 rounded-full bg-white shadow-md text-zinc-300 hover:text-rose-500 flex items-center justify-center transition-colors cursor-pointer" data-dica="Favoritar" aria-label="Favoritar"><svg class="w-4 h-4 ${item.isFavorite ? 'fill-[#c7305b] text-[#c7305b]' : 'fill-none text-zinc-300'} stroke-current" stroke-width="1.75" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z"/></svg></button>
          <button type="button" class="btn-message-supplier btn-secondary flex-1 justify-center !px-3 !text-xs">
            <span>Mensagens</span>
          </button>
          <button type="button" class="btn-hire-supplier flex-1 px-3 py-2.5 rounded-xl bg-[#333333] hover:bg-[#222222] text-white text-xs font-bold transition-all cursor-pointer">
            Solicitar
          </button>
        </div>
      </div>
    `;

    card.querySelector('.btn-open-supplier-gallery')?.addEventListener('click', (e) => {
      e.stopPropagation();
      openB2BVendorProfile(item, servicoDestaque(item));
    });

    card.querySelector('.btn-toggle-card-fav')?.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleB2BFavorite(item);
      renderB2BExplore();
    });

    card.querySelector('.btn-message-supplier')?.addEventListener('click', (e) => {
      e.stopPropagation();
      abrirChatComFornecedor(item.id);
    });

    card.querySelector('.btn-hire-supplier')?.addEventListener('click', (e) => {
      e.stopPropagation();
      handleB2BHireAction(item);
    });

    card.addEventListener('click', () => {
      openB2BVendorProfile(item, servicoDestaque(item));
    });

    return card;
  }

  // ==========================================
  // 12.3b DRAWER DE CATEGORIAS DA BUSCA (mesma árvore do cadastro de
  // produto no B2B — ver B2B_CATEGORY_TREE)
  // ==========================================
  function openB2BCategoryMenu() {
    b2bExpandedCategoryGroup = b2bSelectedMainCategory;
    renderB2BCategoryMenu();
    document.getElementById('b2b-category-menu')?.classList.remove('hidden');
  }

  function closeB2BCategoryMenu() {
    document.getElementById('b2b-category-menu')?.classList.add('hidden');
  }

  function renderB2BCategoryMenu() {
    const menu = document.getElementById('b2b-category-menu');
    if (!menu) return;

    const allActive = !b2bSelectedMainCategory;
    let html = `
      <button type="button" class="b2b-category-all-btn w-full text-left px-3.5 py-2.5 text-xs font-bold ${allActive ? 'text-zinc-900 bg-blue-50/60' : 'text-zinc-800 hover:bg-zinc-50'} flex items-center justify-between transition-colors cursor-pointer">
        <span>Todos os fornecedores</span>
        ${allActive ? '<span>✓</span>' : ''}
      </button>
      <div class="border-t border-zinc-100 my-1"></div>
    `;

    html += Object.entries(B2B_CATEGORY_TREE).map(([main, subs]) => {
      const isMainSelected = b2bSelectedMainCategory === main && !b2bSelectedSubcategory;
      const isExpanded = b2bExpandedCategoryGroup === main;
      return `
        <div class="b2b-category-group">
          <div class="w-full flex items-center justify-between pl-3.5 pr-2 py-2">
            <button type="button" class="b2b-category-main-btn flex-1 text-left text-xs font-semibold ${isMainSelected ? 'text-zinc-900' : 'text-zinc-800'} hover:text-zinc-900 transition-colors cursor-pointer" data-main="${main}">
              ${main}
            </button>
            ${subs.length ? `
              <button type="button" class="b2b-category-toggle-btn w-7 h-7 flex items-center justify-center text-zinc-400 hover:text-zinc-700 cursor-pointer flex-shrink-0" data-main="${main}" title="Ver subcategorias">
                <svg class="w-3.5 h-3.5 transition-transform ${isExpanded ? 'rotate-180' : ''}" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7"/></svg>
              </button>
            ` : ''}
          </div>
          ${subs.length ? `
            <div class="b2b-subcategory-list ${isExpanded ? '' : 'hidden'} pb-1.5">
              ${subs.map(sub => {
                const isSubSelected = b2bSelectedSubcategory === sub;
                return `
                  <button type="button" class="b2b-category-sub-btn w-full text-left pl-7 pr-3.5 py-1.5 text-[11px] ${isSubSelected ? 'text-zinc-900 font-bold bg-blue-50/60' : 'text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900'} transition-colors cursor-pointer flex items-center justify-between" data-main="${main}" data-sub="${sub}">
                    <span>${sub}</span>
                    ${isSubSelected ? '<span>✓</span>' : ''}
                  </button>
                `;
              }).join('')}
            </div>
          ` : ''}
        </div>
      `;
    }).join('');

    menu.innerHTML = html;

    menu.querySelector('.b2b-category-all-btn')?.addEventListener('click', () => {
      b2bSelectedMainCategory = null;
      b2bSelectedSubcategory = null;
      currentB2BCategory = 'all';
      closeB2BCategoryMenu();
      renderB2BExplore();
    });

    menu.querySelectorAll('.b2b-category-main-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        b2bSelectedMainCategory = btn.getAttribute('data-main');
        b2bSelectedSubcategory = null;
        currentB2BCategory = 'all';
        closeB2BCategoryMenu();
        renderB2BExplore();
      });
    });

    menu.querySelectorAll('.b2b-category-toggle-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const main = btn.getAttribute('data-main');
        b2bExpandedCategoryGroup = (b2bExpandedCategoryGroup === main) ? null : main;
        renderB2BCategoryMenu();
      });
    });

    menu.querySelectorAll('.b2b-category-sub-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        b2bSelectedMainCategory = btn.getAttribute('data-main');
        b2bSelectedSubcategory = btn.getAttribute('data-sub');
        currentB2BCategory = 'all';
        closeB2BCategoryMenu();
        renderB2BExplore();
      });
    });
  }

  function renderB2BMapPins(venues) {
    const container = document.getElementById('b2b-map-pins-container');
    if (!container) return;
    container.innerHTML = '';

    venues.forEach(venue => {
      const pin = document.createElement('div');
      pin.id = `map-pin-${venue.id}`;
      pin.className = 'absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer z-20 group transition-all duration-300';
      pin.style.top = venue.coords.top;
      pin.style.left = venue.coords.left;

      const isSelected = venue.id === activeB2BItemId;

      pin.innerHTML = `
        <div class="relative flex flex-col items-center">
          <div class="pin-badge ${
            isSelected ? 'bg-[#537bae] text-white scale-110 shadow-lg ring-2 ring-white' : 'bg-amber-500 text-white shadow-md hover:bg-[#537bae] hover:scale-105'
          } text-[11px] font-bold px-2.5 py-1 rounded-full whitespace-nowrap transition-all flex items-center gap-1">
            <span>${venue.price.split(' ')[1] || venue.price}</span>
          </div>
          <div class="w-2 h-2 ${isSelected ? 'bg-[#537bae]' : 'bg-amber-500'} rotate-45 -mt-1 shadow-xs"></div>

          <!-- Mini Popup Card no Hover/Click do Pino -->
          <div class="pin-popup absolute bottom-full mb-2 hidden group-hover:block w-48 bg-white rounded-xl border border-zinc-200 shadow-xl p-2 z-30 pointer-events-none animate-fade-in">
            <img src="${venue.image}" alt="${venue.name}" class="w-full h-20 rounded-lg object-cover mb-1.5">
            <h5 class="text-xs font-bold text-zinc-900 truncate">${venue.name}</h5>
            <p class="text-[10px] text-zinc-500">${venue.neighborhood} • ★ ${venue.rating}</p>
            <p class="text-xs font-black text-amber-600 mt-1">${venue.price}</p>
          </div>
        </div>
      `;

      pin.addEventListener('click', () => {
        activeB2BItemId = venue.id;
        highlightMapPin(venue.id);
        const card = document.getElementById(`card-${venue.id}`);
        if (card) {
          card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          document.querySelectorAll('.b2b-item-card').forEach(c => {
            c.classList.remove('border-[#537bae]', 'shadow-md', 'ring-1', 'ring-[#537bae]/30');
            c.classList.add('border-zinc-200', 'shadow-2xs');
          });
          card.classList.remove('border-zinc-200', 'shadow-2xs');
          card.classList.add('border-[#537bae]', 'shadow-md', 'ring-1', 'ring-[#537bae]/30');
        }
      });

      container.appendChild(pin);
    });
  }

  function highlightMapPin(venueId) {
    document.querySelectorAll('#b2b-map-pins-container .pin-badge').forEach(b => {
      b.classList.remove('bg-[#537bae]', 'scale-110', 'ring-2', 'ring-white');
      b.classList.add('bg-amber-500');
    });
    const activePin = document.getElementById(`map-pin-${venueId}`);
    if (activePin) {
      const badge = activePin.querySelector('.pin-badge');
      if (badge) {
        badge.classList.remove('bg-amber-500');
        badge.classList.add('bg-[#537bae]', 'scale-110', 'ring-2', 'ring-white');
      }
    }
  }

  // ==========================================
  // 12.3b PÁGINA COMPLETA DO FORNECEDOR (substitui a lista do Explorar)
  // ==========================================
  let activeB2BProfileItem = null;

  // Mesma lógica de favoritar usada no card — extraída pra ser reaproveitada
  // aqui e na página de perfil.
  // Favoritos ficam salvos em fornecedores_favoritos (migration 037). Muda
  // na tela na hora e desfaz se o banco recusar.
  // Favorito é do SERVIÇO (card do Explorar ou serviço aberto no perfil),
  // não da empresa: gostar do bar não marca o buffet do mesmo fornecedor.
  function toggleB2BFavorite(item, servico) {
    const userId = window.loveClienteSession?.user?.id;
    const svc = servico || (item && item.servicoCard) || activeB2BProfileServico || null;
    const servicoId = svc && svc.id;
    if (!userId || !servicoId) return item?.isFavorite;

    const virouFavorito = !b2bFavoritosIds.has(servicoId);
    if (virouFavorito) b2bFavoritosIds.add(servicoId); else b2bFavoritosIds.delete(servicoId);
    // Guia de primeiros passos: o primeiro favorito risca "Favoritar primeiros fornecedores".
    if (virouFavorito) window.markPlatformTaskAchieved?.('vendors');
    if (item) item.isFavorite = virouFavorito;

    const pedido = virouFavorito
      ? supabaseClient.from('servicos_favoritos').insert({ cliente_id: userId, produto_id: servicoId })
      : supabaseClient.from('servicos_favoritos').delete().eq('cliente_id', userId).eq('produto_id', servicoId);

    pedido.then(({ error }) => {
      if (!error) return;
      console.error('[vitrine] favorito:', error);
      if (virouFavorito) b2bFavoritosIds.delete(servicoId); else b2bFavoritosIds.add(servicoId);
      if (item) item.isFavorite = !virouFavorito;
      renderB2BExplore();
      if (activeB2BProfileItem && item && activeB2BProfileItem.id === item.id) renderB2BVendorProfile(activeB2BProfileItem);
    });

    return virouFavorito;
  }

  // "Contratar" não tem checkout de verdade ainda — abre a conversa real com
  // o fornecedor já com uma mensagem de intenção de contratação.
  /* ---- Pedido de orçamento (Contratar) ----
     "Contratar" abre um pedido com o serviço escolhido. Ao enviar, vira um
     lead em Contatos do fornecedor no Hub (function solicitar_orcamento,
     migration 043 — a tabela leads é só do fornecedor) e o mesmo texto vai
     como primeira mensagem no chat. Se a function ainda não existir no
     banco, cai no comportamento antigo: abre o chat com o texto pronto. */
  let orcamentoFornecedor = null;
  let orcamentoServicoInicial = null;

  // Chat › "Solicitar orçamento" (ao lado do anexar): manda o pedido para o
  // fornecedor desta conversa com os dados do evento ativo, sem formulário.
  // Vira lead no Hub (solicitar_orcamento, migration 043) e entra como
  // mensagem na própria conversa.
  document.getElementById('b2b-chat-orcamento-btn')?.addEventListener('click', async (e) => {
    const btn = e.currentTarget;
    if (btn.disabled || !window.loveClienteSession) return;
    const conv = b2bConversationsData.find(c => c.id === activeB2BConversationId);
    if (!conv || !conv.fornecedorId) return;
    btn.disabled = true;
    try {
      if (!b2bFornecedoresCarregados) await carregarFornecedoresVitrine();
      const item = encontrarFornecedorExplorar(conv.fornecedorId) || { id: conv.fornecedorId, name: conv.name, services: [] };
      const servicos = (item.services || []).filter(s => s && s.active !== false);
      const servico = servicos.length === 1 ? servicos[0] : null;
      const ev = getActiveEvent();
      const convidados = ev ? (ev.totalConvidados || (ev.guests || []).length || null) : null;
      const evAtivo = getActiveEvent();
      const data = dataDDMMAAAA(evAtivo && ((evAtivo.eventDetails && evAtivo.eventDetails.date) || evAtivo.date));
      const texto = textoDoPedidoOrcamento(item, servico, data, convidados, '', enderecoDoEventoAtivo());
      const nome = getGuestCommentAuthorName();
      const email = (window.loveClienteProfile && window.loveClienteProfile.email) || window.loveClienteSession.user.email || '';

      const { error } = await supabaseClient.rpc('solicitar_orcamento', {
        p_fornecedor_id: item.id,
        p_product_id: servico ? servico.id : null,
        p_nome: nome,
        p_email: email,
        p_data_evento: data || null,
        p_mensagem: texto
      });
      if (error) {
        console.error('[chat] solicitar_orcamento:', error);
        // Sem a function no banco (ou outro erro): deixa o texto pronto no campo.
        const input = document.getElementById('b2b-chat-input');
        if (input && !input.value) { input.value = texto; input.focus(); }
        return;
      }
      if (window.LoveChatService) await window.LoveChatService.sendMessage(activeB2BConversationId, texto, 'cliente');
    } finally {
      btn.disabled = false;
    }
  });

  function handleB2BHireAction(item, servico) {
    abrirPedidoOrcamento(item, servico);
  }

  async function abrirChatComTextoPronto(item, texto) {
    await abrirChatComFornecedor(item.id);
    const chatInput = document.getElementById('b2b-chat-input');
    if (chatInput && !chatInput.value) {
      chatInput.value = texto || `Olá! Gostaria de contratar os serviços de ${item.name}. Pode me passar mais detalhes?`;
      chatInput.focus();
    }
  }

  // Endereço do evento ativo (Informações): "Rua X, 250, Indaiatuba - SP".
  // É o que vai para o fornecedor — o nome do espaço ("churrasqueira do
  // prédio") sozinho não diz onde é.
  function enderecoDoEventoAtivo() {
    const ev = getActiveEvent();
    const d = (ev && ev.eventDetails) || {};
    const rua = String(d.address || '').trim();
    const cidade = [String(d.city || '').trim(), String(d.state || '').trim().toUpperCase()].filter(Boolean).join('/');
    return [rua, cidade].filter(Boolean).join(', ');
  }

  /** Texto sem acento, minúsculo e sem espaços sobrando, para comparar nomes.
   * @param {unknown} v @returns {string} */
  function normalizarTexto(v) {
    return String(v || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
  }

  /**
   * Local que a Home mostra no evento:
   *  - se o espaço é de um fornecedor da Love (nome do evento = nome da
   *    empresa ou de um serviço de espaço, ou o endereço bate com o do espaço
   *    cadastrado), mostra o nome do lugar (o serviço), não o da empresa;
   *  - senão (churrasqueira do prédio, espaço contratado por fora…), mostra o
   *    rua e o número, sem bairro nem cidade ("Av. Duquesa de Goiás, 1200").
   * @returns {string}
   */
  // Categorias de espaço no Hub (o nome atual e os antigos, que o Hub
  // converte para "Espaços para Locação" — B2B/js/produtos.js).
  const CATEGORIAS_DE_ESPACO = ['espacos para locacao', 'locacao de espaco', 'espacos & locacoes', 'espaco de locacao'];

  /** Serviços da vitrine que são espaços para locação, com a empresa dona.
   * @returns {{ empresa: any, servico: any }[]} */
  function espacosCadastradosNoHub() {
    let lista = [];
    try { if (b2bFornecedoresCarregados) lista = b2bFornecedores || []; } catch (e) { lista = []; }
    const out = [];
    lista.forEach(f => (f.services || []).forEach(s => {
      if (s && CATEGORIAS_DE_ESPACO.includes(normalizarTexto(s.category))) out.push({ empresa: f, servico: s });
    }));
    return out;
  }

  /** Rua para a Home: "Avenida" vira "Av.".
   * @param {unknown} rua @returns {string} */
  function ruaAbreviada(rua) {
    return String(rua || '').trim().replace(/^avenida\b\.?\s*/i, 'Av. ');
  }

  function localDoEventoParaHome() {
    const ev = getActiveEvent();
    if (!ev) return '';
    const d = ev.eventDetails || {};
    const nome = String((typeof d.locationName === 'string' ? d.locationName : (ev.location !== 'Adicionar Local' ? ev.location : '')) || '').trim();
    const endereco = String(d.address || '').trim();
    const nomeN = normalizarTexto(nome);
    const ruaN = normalizarTexto(d.street || endereco.split(',')[0]);
    const numeroN = normalizarTexto(d.number);
    // Só conta como lugar "oficial" um serviço da categoria Espaços para
    // Locação no Hub: pelo nome (da empresa ou do serviço) ou pelo endereço.
    for (const { empresa, servico } of espacosCadastradosNoHub()) {
      const nomeDoLugar = servico.name || empresa.name;
      if (nomeN && (normalizarTexto(empresa.name) === nomeN || normalizarTexto(servico.name) === nomeN)) return nomeDoLugar;
      const v = (servico.extra && servico.extra.venue) || {};
      const vRua = normalizarTexto(v.street);
      if (ruaN && vRua && ruaN === vRua && (!numeroN || !v.number || normalizarTexto(v.number) === numeroN)) return nomeDoLugar;
    }
    // Fora do Hub: só a rua (Avenida → Av.) e o número, sem bairro nem cidade.
    const rua = ruaAbreviada(d.street || endereco.split(',')[0]);
    const numero = String(d.number || '').trim();
    if (rua) return numero ? `${rua}, ${numero}` : rua;
    return nome;
  }

  function atualizarLocalDaHome() {
    const el = document.getElementById('dash-hub-event-location-text');
    if (el) el.textContent = localDoEventoParaHome() || 'Local do evento';
  }

  function dataEventoAtivoTexto() {
    const ev = getActiveEvent();
    const iso = ev && ((ev.eventDetails && ev.eventDetails.date) || ev.date);
    return iso ? (formatEventDateLong(iso) || String(iso)) : '';
  }

  // Exemplo no campo de detalhes, de acordo com a categoria do serviço.
  function exemploDeBriefing(categoria) {
    const c = String(categoria || '').toLowerCase();
    if (/m[uú]sica|banda|dj|som/.test(c)) return 'Ex.: 4 horas de apresentação, repertório de MPB e pop acústico na recepção e pista animada depois do jantar.';
    if (/buffet|gastronomia|alimenta/.test(c)) return 'Ex.: jantar completo com entrada, dois pratos principais e opção vegetariana; serviço à francesa.';
    if (/bar|bebida|drink/.test(c)) return 'Ex.: open bar de 5 horas com drinks clássicos, opções sem álcool e bartender na recepção.';
    if (/foto|v[ií]deo|filmagem/.test(c)) return 'Ex.: cobertura do making of à festa, ensaio no dia e vídeo de até 5 minutos com os melhores momentos.';
    if (/decora|flor/.test(c)) return 'Ex.: decoração em tons claros com flores naturais, mesa principal e arranjos nas mesas dos convidados.';
    return 'Ex.: conte o que você imagina para o serviço, horários, estilo e qualquer detalhe importante.';
  }

  (function ligarModalDeOrcamento() {
    const modal = document.getElementById('modal-b2b-orcamento');
    if (!modal) return;
    modal.addEventListener('click', (e) => {
      const pill = e.target.closest('.orc-pill');
      if (pill) {
        const grupo = pill.closest('.orc-pills');
        const jaAtiva = pill.classList.contains('is-ativa');
        grupo.querySelectorAll('.orc-pill').forEach(p => { p.classList.remove('is-ativa'); p.setAttribute('aria-checked', 'false'); });
        if (!jaAtiva) { pill.classList.add('is-ativa'); pill.setAttribute('aria-checked', 'true'); }
        return;
      }
      const passo = e.target.closest('[data-convidados]');
      if (passo) {
        const campo = document.getElementById('orcamento-convidados');
        const atual = parseInt(campo.value, 10) || 0;
        campo.value = Math.max(1, atual + Number(passo.dataset.convidados));
        return;
      }
      // Clique no fundo escuro fecha.
      if (e.target === modal) closeModal(modal);
    });
    document.getElementById('orcamento-data')?.addEventListener('input', () => document.getElementById('orcamento-data-selo')?.classList.add('hidden'));
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !modal.classList.contains('hidden')) closeModal(modal);
    });
  })();

  function valorDaPill(grupo) {
    return document.querySelector(`#modal-b2b-orcamento .orc-pills[data-grupo="${grupo}"] .orc-pill.is-ativa`)?.dataset.valor || '';
  }

  function abrirPedidoOrcamento(item, servico) {
    const modal = document.getElementById('modal-b2b-orcamento');
    if (!modal) { abrirChatComTextoPronto(item); return; }
    orcamentoFornecedor = item;
    orcamentoServicoInicial = servico || null;

    const ev = getActiveEvent();
    const servicos = (item.services || []).filter(s => s.active !== false);
    const select = document.getElementById('orcamento-servico');
    if (select) {
      select.innerHTML = servicos.length
        ? servicos.map(s => {
            const preco = rotuloPrecoServico(s);
            return `<option value="${escaparHtml(s.id)}">${escaparHtml(s.name)}${preco ? ` — ${escaparHtml(preco)}` : ''}</option>`;
          }).join('')
        : '<option value="">Serviço a combinar</option>';
      if (servico && servico.id) select.value = servico.id;
    }
    // A. Card do serviço: foto, nome, empresa, categoria e "a partir de".
    const svc = servico || servicos[0] || null;
    const foto = document.getElementById('orcamento-servico-foto');
    const capa = (svc && svc.cover_image_url) || item.cardImage || item.avatar || '';
    if (foto) { if (capa) { foto.src = capa; foto.classList.remove('hidden'); } else { foto.removeAttribute('src'); foto.classList.add('hidden'); } }
    const tituloEl = document.getElementById('orcamento-titulo');
    if (tituloEl) tituloEl.textContent = (svc && svc.name) || item.name || 'Solicitar orçamento';
    const empresaEl = document.getElementById('orcamento-servico-empresa');
    if (empresaEl) empresaEl.textContent = svc && svc.name ? `por ${item.name}` : '';
    const infoEl = document.getElementById('orcamento-servico-info');
    if (infoEl) {
      const preco = svc ? rotuloPrecoServico(svc) : '';
      infoEl.textContent = [svc && svc.category, preco ? `A partir de ${preco.replace(/^A partir de /, '')}` : ''].filter(Boolean).join(' • ');
    }
    // B. Data: a do evento ativo já vem preenchida, com o selo.
    const dataEl = document.getElementById('orcamento-data');
    const dataISO = ev ? String((ev.eventDetails && ev.eventDetails.date) || ev.date || '').slice(0, 10) : '';
    if (dataEl) dataEl.value = /^\d{4}-\d{2}-\d{2}$/.test(dataISO) ? dataISO : '';
    document.getElementById('orcamento-data-selo')?.classList.toggle('hidden', !(dataEl && dataEl.value));
    // Tipo de celebração vindo do evento; ambiente e faixa começam em branco.
    const tipoDoEvento = { wedding: 'Casamento', birthday: 'Aniversário', corporate: 'Corporativo' }[ev && ev.type] || (ev ? 'Outro' : '');
    modal.querySelectorAll('.orc-pills').forEach(g => {
      const inicial = g.dataset.grupo === 'tipo' ? tipoDoEvento : '';
      g.querySelectorAll('.orc-pill').forEach(p => { const on = p.dataset.valor === inicial; p.classList.toggle('is-ativa', on); p.setAttribute('aria-checked', String(on)); });
    });
    // E. Exemplo de briefing de acordo com a categoria do serviço.
    const msgPh = document.getElementById('orcamento-mensagem');
    if (msgPh) msgPh.placeholder = exemploDeBriefing(svc && svc.category);
    const convEl = document.getElementById('orcamento-convidados');
    if (convEl) convEl.value = (ev && Array.isArray(ev.guests) && ev.guests.length) ? ev.guests.length : '';
    // Local: o endereço salvo em Informações já vem escolhido; "Outro
    // endereço…" abre um campo para digitar.
    const localSel = document.getElementById('orcamento-local');
    const localOutro = document.getElementById('orcamento-local-outro');
    if (localSel) {
      const endereco = enderecoDoEventoAtivo();
      localSel.innerHTML = (endereco ? `<option value="${escaparHtml(endereco)}">${escaparHtml(endereco)}</option>` : '')
        + '<option value="__outro">Outro endereço…</option>';
      localSel.value = endereco || '__outro';
      if (localOutro) { localOutro.value = ''; localOutro.classList.toggle('hidden', !!endereco); }
      if (!localSel.dataset.bound) {
        localSel.dataset.bound = '1';
        localSel.addEventListener('change', () => {
          const outro = localSel.value === '__outro';
          localOutro?.classList.toggle('hidden', !outro);
          if (outro) localOutro?.focus();
        });
      }
    }
    const msgEl = document.getElementById('orcamento-mensagem');
    if (msgEl) msgEl.value = '';
    document.getElementById('orcamento-form')?.classList.remove('hidden');
    document.getElementById('orcamento-sucesso')?.classList.add('hidden');
    document.getElementById('orcamento-erro')?.classList.add('hidden');
    const btn = document.getElementById('btn-orcamento-enviar');
    if (btn) btn.disabled = false;
    openModal(modal);
  }

  // Tipo de celebração do evento ativo (para a linha "Evento:").
  function tipoDeCelebracaoDoEvento() {
    const ev = getActiveEvent();
    if (!ev) return '';
    return { wedding: 'Casamento', birthday: 'Aniversário', corporate: 'Corporativo', baby: 'Chá de bebê' }[ev.type] || 'Outro';
  }

  // "2026-11-20" (ou Date) → "20/11/2026".
  function dataDDMMAAAA(valor) {
    if (!valor) return '';
    const s = String(valor);
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
    if (m) return `${m[3]}/${m[2]}/${m[1]}`;
    const d = new Date(s);
    return isNaN(d) ? s : d.toLocaleDateString('pt-BR');
  }

  // Texto do pedido no formato fixo que o Hub lê:
  //   Pedido de orçamento — <serviço (products.name)>
  //   Evento: <tipo de celebração>
  //   Data: <DD/MM/AAAA>
  //   Convidados: <número>
  //   Local: <endereço completo>
  //   Mensagem: <briefing>
  // Ambiente e faixa de investimento vão dentro da mensagem.
  function textoDoPedidoOrcamento(item, servico, data, convidados, mensagem, local, extras = {}) {
    const msg = [
      mensagem,
      extras.ambiente ? `Ambiente: ${extras.ambiente}` : '',
      extras.faixa ? `Investimento: ${extras.faixa}` : ''
    ].filter(Boolean).join(' — ');
    return [
      'Pedido de orçamento' + (servico && servico.name ? ` — ${servico.name}` : ''),
      `Evento: ${extras.tipo || tipoDeCelebracaoDoEvento() || 'Outro'}`,
      data ? `Data: ${data}` : '',
      convidados ? `Convidados: ${convidados}` : '',
      local ? `Local: ${local}` : '',
      msg ? `Mensagem: ${msg}` : ''
    ].filter(Boolean).join('\n');
  }

  async function enviarPedidoOrcamento() {
    const item = orcamentoFornecedor;
    if (!item || !window.loveClienteSession) return;
    const modal = document.getElementById('modal-b2b-orcamento');
    const btn = document.getElementById('btn-orcamento-enviar');
    const erro = document.getElementById('orcamento-erro');
    if (btn && btn.disabled) return;
    if (btn) btn.disabled = true;
    if (erro) erro.classList.add('hidden');

    const select = document.getElementById('orcamento-servico');
    const servico = (item.services || []).find(s => s.id === (select && select.value)) || null;
    const dataISO = (document.getElementById('orcamento-data')?.value || '').trim();
    const data = dataDDMMAAAA(dataISO);
    const convidados = parseInt(document.getElementById('orcamento-convidados')?.value, 10) || null;
    const extras = { tipo: valorDaPill('tipo'), ambiente: valorDaPill('ambiente'), faixa: valorDaPill('faixa') };
    const mensagem = (document.getElementById('orcamento-mensagem')?.value || '').trim();
    const localSel = document.getElementById('orcamento-local');
    const local = localSel && localSel.value === '__outro'
      ? (document.getElementById('orcamento-local-outro')?.value || '').trim()
      : ((localSel && localSel.value) || '');
    const nome = getGuestCommentAuthorName();
    const email = (window.loveClienteProfile && window.loveClienteProfile.email) || window.loveClienteSession.user.email || '';
    const texto = textoDoPedidoOrcamento(item, servico, data, convidados, mensagem, local, extras);

    const { error } = await supabaseClient.rpc('solicitar_orcamento', {
      p_fornecedor_id: item.id,
      p_product_id: servico ? servico.id : null,
      p_nome: nome,
      p_email: email,
      p_data_evento: data || null,
      p_mensagem: texto
    });

    if (error) {
      console.error('[orçamento] solicitar_orcamento:', error);
      // Function ainda não rodou no banco (ou outro erro): não perde o
      // pedido — abre o chat com o texto pronto, como era antes.
      if (btn) btn.disabled = false;
      closeModal(modal);
      await abrirChatComTextoPronto(item, texto);
      return;
    }

    // Mesmo texto como primeira mensagem do chat (abre/acha a conversa).
    await openConversationWithFornecedor(item.id);
    if (activeB2BConversationId) {
      await window.LoveChatService.sendMessage(activeB2BConversationId, texto, 'cliente');
    }

    document.getElementById('orcamento-form')?.classList.add('hidden');
    document.getElementById('orcamento-sucesso')?.classList.remove('hidden');
    if (btn) btn.disabled = false;
  }

  function handleB2BShare(item, triggerBtn) {
    const shareText = `${item.name} — ${item.description || item.about || ''}`.trim();
    const marcarCopiado = () => {
      if (!triggerBtn) return;
      triggerBtn.classList.add('text-emerald-600');
      setTimeout(() => triggerBtn.classList.remove('text-emerald-600'), 2000);
    };
    if (navigator.share) {
      navigator.share({ title: item.name, text: shareText }).catch(() => {});
    } else if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(shareText).then(marcarCopiado).catch(() => {});
    }
  }

  // Local do fornecedor no formato salvo pelo B2B: fornecedores.address
  // ("Rua, número, bairro"), city e state (UF de 2 letras). Os fornecedores
  // de demonstração (LOVE_DATA) só têm "Bairro, Cidade - UF" em location —
  // lido como alternativa.
  function partesDoLocal(item) {
    if (item.city || item.state) {
      return { endereco: (item.address || '').trim(), cidade: (item.city || '').trim(), uf: (item.state || '').trim().toUpperCase() };
    }
    // "Bairro, Cidade - UF", "Cidade - UF & Região", "Cidade, UF & Litoral"…
    const texto = item.location || '';
    const m = /^(?:(.*?),\s*)?([^,&]+?)\s*[-,]\s*([A-Z]{2})\b/.exec(texto);
    if (m) return { endereco: (m[1] || item.neighborhood || '').trim(), cidade: m[2].trim(), uf: m[3] };
    // Sem UF ("São Paulo & Rio de Janeiro"): fica só a primeira cidade.
    return { endereco: item.neighborhood || '', cidade: texto.split(/[,&]/)[0].trim(), uf: '' };
  }

  // "São Paulo (SP)" — usado nos cards da lista/grade.
  function localCurto(item) {
    const { cidade, uf } = partesDoLocal(item);
    return uf ? `${cidade} (${uf})` : cidade;
  }

  // "Rua, número, bairro, São Paulo (SP)" — usado na página do fornecedor.
  function enderecoCompleto(item) {
    return [partesDoLocal(item).endereco, localCurto(item)].filter(Boolean).join(', ');
  }

  // Preço do serviço como no card do B2B (B2B/js/produtos.js:productPriceLabel):
  // aceita o texto pronto dos dados de demonstração ou a linha de `products`
  // (price + extra.pricing).
  function rotuloPrecoServico(svc) {
    if (typeof svc.price === 'string') return svc.price;
    const brl = v => Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
    const pricing = svc.extra?.pricing || svc.pricing;
    if (pricing?.type === 'SOB_CONSULTA') {
      const inicial = pricing.onRequest?.startingPrice;
      return inicial > 0 ? `A partir de ${brl(inicial)}` : 'Sob consulta';
    }
    if (pricing?.type === 'POR_PESSOA' && pricing.perPerson?.pricePerPerson) return `${brl(pricing.perPerson.pricePerPerson)} / pessoa`;
    if (pricing?.type === 'POR_HORA' && pricing.perHour?.pricePerHour) return `${brl(pricing.perHour.pricePerHour)} / hora`;
    return svc.price != null ? brl(svc.price) : '';
  }

  // Serviço pelo qual o perfil foi aberto (card do Explorar): o topo do
  // perfil mostra o nome dele, "por <empresa>" e a categoria na capa.
  let activeB2BProfileServico = null;
  // Serviço de onde a página da empresa foi aberta ("por Empresa"): entra
  // no caminho Explorar › Serviço › Empresa do topo.
  let b2bServicoDeOrigem = null;

  function renderB2BVendorProfile(item) {
    const servicoAtual = activeB2BProfileServico && (item.services || []).some(s => s.id === activeB2BProfileServico.id)
      ? activeB2BProfileServico : null;
    const coverImg = document.getElementById('b2b-profile-cover-img');
    const avatarImg = document.getElementById('b2b-profile-avatar-img');
    const nameEl = document.getElementById('b2b-profile-name');
    const roleEl = document.getElementById('b2b-profile-role');
    const locationTextEl = document.getElementById('b2b-profile-location-text');
    const siteLink = document.getElementById('b2b-profile-site-link');
    const ratingWrap = document.getElementById('b2b-profile-rating-wrap');
    const aboutEl = document.getElementById('b2b-profile-about');
    const specialtiesEl = document.getElementById('b2b-profile-specialties');
    const servicesSection = document.getElementById('b2b-profile-services-section');
    const servicesGrid = document.getElementById('b2b-profile-services-grid');
    const portfolioSection = document.getElementById('b2b-profile-portfolio-section');
    const portfolioGrid = document.getElementById('b2b-profile-portfolio-grid');
    const favIcon = document.getElementById('b2b-profile-favorite-icon');

    const portfolioPhotos = (item.portfolioPhotos || []).filter(Boolean);
    // Aberto por um serviço: a capa é a daquele serviço (original + foco do
    // recorte do Hub); senão, a do fornecedor como antes.
    const capaMeta = servicoAtual && servicoAtual.extra && servicoAtual.extra.cover;
    const capaServico = servicoAtual ? ((capaMeta && capaMeta.originalUrl) || servicoAtual.cover_image_url || '') : '';
    const focoServico = capaMeta && capaMeta.focus && Number.isFinite(capaMeta.focus.x) && Number.isFinite(capaMeta.focus.y)
      ? `${capaMeta.focus.x}% ${capaMeta.focus.y}%` : '50% 50%';
    const capa = capaServico || item.capaEmpresa || portfolioPhotos[0] || item.image || '';

    // Sem foto: fica o degradê do container da capa.
    if (coverImg) {
      coverImg.src = capa;
      coverImg.style.objectPosition = capaServico ? focoServico : ((capa && capa === item.image) ? (item.imageFocus || '50% 50%') : '50% 50%');
      coverImg.classList.toggle('hidden', !capa);

      // Categoria no canto inferior direito da capa.
      const caixaCapa = coverImg.parentElement;
      caixaCapa.querySelector('.b2b-categoria-capa')?.remove();
      const categoriaCapa = servicoAtual ? (servicoAtual.category || '') : '';
      if (categoriaCapa) caixaCapa.insertAdjacentHTML('beforeend', `<span class="b2b-categoria-capa">${escaparHtml(categoriaCapa)}</span>`);
    }
    if (avatarImg) avatarImg.src = item.avatar || avatarComIniciais(item.name);
    // Aberto por um serviço: título = nome do serviço (ex.: "Bar Completo"),
    // abaixo "por <empresa>" e o endereço. Sem serviço: nome da empresa.
    const nomeServico = servicoAtual && servicoAtual.name ? servicoAtual.name.trim() : '';
    if (nameEl) nameEl.textContent = nomeServico || item.name;
    if (roleEl) {
      if (nomeServico) {
        roleEl.innerHTML = `por <button type="button" class="b2b-profile-empresa-link" title="Ver a página de ${escaparHtml(item.name)}">${escaparHtml(item.name)}</button>`;
        roleEl.classList.remove('hidden');
      } else {
        // Página da empresa: só o nome e o endereço (a empresa pode ter
        // serviços de várias categorias).
        roleEl.textContent = '';
        roleEl.classList.add('hidden');
      }
    }
    if (locationTextEl) locationTextEl.textContent = enderecoCompleto(item);
    renderB2BProfileBreadcrumb(item, servicoAtual);

    // "Acessar site" só aparece se o fornecedor publicou um site próprio
    // pelo construtor do Love (B2B/js/site-builder.js).
    if (siteLink) {
      siteLink.classList.toggle('hidden', !item.siteUrl);
      if (item.siteUrl) siteLink.href = item.siteUrl;
    }

    // Mesmo selo (anel + ícone, nota de 0 a 10) usado no card da lista/grid
    // do Explorar — a nota aqui é exatamente a mesma daquele card.
    // Estrelas (média de 1 a 5) e quantidade de avaliações, sempre visíveis.
    if (ratingWrap) {
      ratingWrap.classList.remove('hidden');
      ratingWrap.innerHTML = estrelasHtml(item.avaliacaoMedia, item.avaliacaoTotal);
    }
    // A lista de avaliações é só da página da empresa (não da do serviço).
    const reviewsSection = document.getElementById('b2b-profile-reviews-section');
    if (reviewsSection) reviewsSection.classList.toggle('hidden', !!servicoAtual);
    if (!servicoAtual) carregarAvaliacoesDoPerfil(item);

    if (aboutEl) aboutEl.textContent = item.about || item.description || '';

    // Tags sem fundo, separadas por vírgula — texto corrido, não mais pills.
    const specialties = item.specialties || item.features || [];
    if (specialtiesEl) {
      specialtiesEl.textContent = specialties.join(', ');
      specialtiesEl.classList.toggle('hidden', specialties.length === 0);
    }

    // Serviços oferecidos: mesmo card de B2B/produtos.html (capa ou degradê,
    // nome, categoria e preço). Só os ativos; "Ativo"/"Editar" são do painel
    // do fornecedor e não aparecem pro anfitrião.
    const services = (item.services || []).filter(svc => svc.active !== false);
    if (servicesGrid) {
      servicesGrid.innerHTML = services.map((svc, svcIndex) => {
        const capa = svc.cover_image_url || svc.coverImage || '';
        const categoria = svc.category || item.mainCategory || '';
        // "Mais imagens" do serviço (até 6, como no Hub): quadradinhos
        // abaixo da capa; clicar abre a foto no lightbox.
        const galeria = (Array.isArray(svc.gallery) ? svc.gallery : []).filter(f => typeof f === 'string' && f).slice(0, 6);
        return `
          <div class="border border-zinc-200 rounded-xl bg-[#FFFFFF] overflow-hidden flex flex-col">
            <div class="aspect-[14/5] bg-gradient-to-br from-blue-50 via-zinc-50 to-orange-50 overflow-hidden">
              ${capa ? `<img src="${escaparHtml(capa)}" alt="${escaparHtml(svc.name)}" class="w-full h-full object-cover">` : ''}
            </div>
            ${galeria.length ? `
            <div class="flex gap-1.5 px-3 pt-3 overflow-x-auto no-scrollbar">
              ${galeria.map((foto, fotoIndex) => `
                <button type="button" class="b2b-profile-service-photo w-12 h-12 rounded-lg overflow-hidden bg-zinc-100 shrink-0 cursor-pointer" data-svc-index="${svcIndex}" data-photo-index="${fotoIndex}" title="Ver foto">
                  <img src="${escaparHtml(foto)}" alt="" class="w-full h-full object-cover">
                </button>
              `).join('')}
            </div>` : ''}
            <div class="p-4 flex flex-col gap-2 flex-1">
              <p class="text-sm font-semibold text-zinc-900 leading-snug">${escaparHtml(svc.name)}</p>
              <p class="text-xs text-zinc-500">${escaparHtml(categoria)}</p>
              <p class="text-base font-bold text-zinc-900 mt-auto">${escaparHtml(rotuloPrecoServico(svc))}</p>
              <button type="button" class="b2b-profile-service-hire mt-1 w-full py-2 rounded-xl bg-[#333333] hover:bg-[#222222] text-white text-xs font-bold transition-all cursor-pointer" data-svc-index="${svcIndex}">Pedir orçamento</button>
            </div>
          </div>
        `;
      }).join('');

      servicesGrid.querySelectorAll('.b2b-profile-service-hire').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const svc = services[Number(btn.dataset.svcIndex)];
          handleB2BHireAction(item, svc || null);
        });
      });

      servicesGrid.querySelectorAll('.b2b-profile-service-photo').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const svc = services[Number(btn.dataset.svcIndex)];
          if (!svc) return;
          const fotos = (Array.isArray(svc.gallery) ? svc.gallery : []).filter(f => typeof f === 'string' && f).slice(0, 6);
          openSupplierGalleryModal(item, fotos);
          supplierGalleryIndex = Number(btn.dataset.photoIndex) || 0;
          renderSupplierGalleryImage();
        });
      });
    }
    if (servicesSection) servicesSection.classList.toggle('hidden', services.length === 0 || !!servicoAtual);

    // Portfólio: só na página da empresa (não na do serviço) e só se o
    // fornecedor configurou fotos no Hub. Carrossel em cima, texto embaixo.
    // Página do serviço: no lugar dele, o carrossel com as imagens daquele
    // serviço (carrossel de imagens do Hub) e "Ver mais serviços" embaixo.
    const fotosServico = servicoAtual
      ? (Array.isArray(servicoAtual.gallery) ? servicoAtual.gallery : []).filter(f => typeof f === 'string' && f)
      : [];
    const fotosCarrossel = servicoAtual ? fotosServico : portfolioPhotos;
    const mostrarPortfolio = fotosCarrossel.length > 0;
    const portfolioItens = servicoAtual
      ? fotosServico.map(url => ({ url, comentario: '' }))
      : (Array.isArray(item.portfolioItens) && item.portfolioItens.length
        ? item.portfolioItens
        : portfolioPhotos.map(url => ({ url, comentario: '' })));
    const tituloCarrossel = document.getElementById('b2b-profile-portfolio-titulo');
    if (tituloCarrossel) {
      tituloCarrossel.textContent = servicoAtual ? 'Imagens' : 'Portfólio';
      tituloCarrossel.classList.toggle('hidden', !mostrarPortfolio);
    }
    const verMaisServicos = document.getElementById('b2b-profile-ver-mais-servicos-wrap');
    if (verMaisServicos) verMaisServicos.classList.toggle('hidden', !servicoAtual);
    // Comentário da foto que está na tela (troca junto com a foto); sem
    // comentário, nada aparece embaixo.
    const mostrarComentarioDaFoto = (i) => {
      const el = document.getElementById('b2b-profile-portfolio-texto');
      if (!el) return;
      const c = (i >= 0 && portfolioItens[i] && portfolioItens[i].comentario) || '';
      el.textContent = c;
      el.classList.toggle('hidden', !c);
    };
    if (portfolioGrid) {
      portfolioGrid.innerHTML = mostrarPortfolio ? `
        <div class="b2b-portfolio-slides">
          ${fotosCarrossel.map((photo, i) => `
            <button type="button" class="b2b-portfolio-slide${i === 0 ? ' is-ativo' : ''}" data-index="${i}" aria-label="Ampliar foto ${i + 1}">
              <img src="${escaparHtml(photo)}" alt="${servicoAtual ? escaparHtml(servicoAtual.name || '') : 'Portfólio'}" loading="lazy">
            </button>`).join('')}
          ${fotosCarrossel.length > 1 ? `
            <button type="button" class="b2b-portfolio-seta b2b-portfolio-seta--ant" data-portfolio-seta="-1" aria-label="Foto anterior"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path stroke-linecap="round" stroke-linejoin="round" d="m15 19-7-7 7-7"/></svg></button>
            <button type="button" class="b2b-portfolio-seta b2b-portfolio-seta--prox" data-portfolio-seta="1" aria-label="Próxima foto"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path stroke-linecap="round" stroke-linejoin="round" d="m9 5 7 7-7 7"/></svg></button>` : ''}
        </div>
        ${fotosCarrossel.length > 1 ? `<div class="b2b-portfolio-pontos">${fotosCarrossel.map((_, i) => `<span class="${i === 0 ? 'is-ativo' : ''}"></span>`).join('')}</div>` : ''}` : '';
      let atual = 0;
      const ir = (n) => {
        const total = fotosCarrossel.length;
        atual = (n + total) % total;
        portfolioGrid.querySelectorAll('.b2b-portfolio-slide').forEach((el, i) => el.classList.toggle('is-ativo', i === atual));
        portfolioGrid.querySelectorAll('.b2b-portfolio-pontos span').forEach((el, i) => el.classList.toggle('is-ativo', i === atual));
        mostrarComentarioDaFoto(atual);
      };
      portfolioGrid.querySelectorAll('[data-portfolio-seta]').forEach(btn => {
        btn.addEventListener('click', (e) => { e.stopPropagation(); ir(atual + Number(btn.dataset.portfolioSeta)); });
      });
      portfolioGrid.querySelectorAll('.b2b-portfolio-slide').forEach(btn => {
        btn.addEventListener('click', () => {
          if (servicoAtual) openSupplierGalleryModal(item, fotosCarrossel);
          else openSupplierGalleryModal(item);
          supplierGalleryIndex = parseInt(btn.getAttribute('data-index'), 10) || 0;
          renderSupplierGalleryImage();
        });
      });
    }
    mostrarComentarioDaFoto(mostrarPortfolio ? 0 : -1);
    if (portfolioSection) portfolioSection.classList.toggle('hidden', !mostrarPortfolio && !servicoAtual);

    // Coração do perfil: só na página do serviço (favorito é do serviço).
    const favBtn = document.getElementById('btn-b2b-profile-favorite');
    const favoritado = !!(servicoAtual && b2bFavoritosIds.has(servicoAtual.id));
    if (favBtn) favBtn.classList.toggle('hidden', !servicoAtual);
    if (favIcon) {
      favIcon.classList.toggle('fill-[#c7305b]', favoritado);
      favIcon.classList.toggle('text-[#c7305b]', favoritado);
      favIcon.classList.toggle('fill-none', !favoritado);
      favIcon.classList.toggle('text-zinc-300', !favoritado);
    }
  }

  // Esconde a seta "<" do carrossel de portfólio quando está no começo —
  // mesmo padrão do filtro de cidade do Explorar.
  function updateB2BProfilePortfolioArrows() {
    const row = document.getElementById('b2b-profile-portfolio-grid');
    const prevBtn = document.getElementById('btn-b2b-profile-portfolio-prev');
    if (!row || !prevBtn) return;
    prevBtn.classList.toggle('hidden', row.scrollLeft <= 0);
  }

  // servico: o que levou até o perfil (vai na URL como "source") — o perfil
  // em si sempre mostra todos os serviços do fornecedor.
  // Clique no serviço (Admin › HUB/B2B › Serviços/Produtos, migration 054).
  // Conta o serviço aberto ou, sem ele, o principal do card do fornecedor.
  // Reabrir pela rota (F5, voltar) não é clique novo. Falhar não atrapalha.
  function registrarCliqueNoServico(item, servico) {
    if (aplicandoRotaDoHistorico) return;
    const alvo = servico || ((item && item.services) || [])[0];
    const id = alvo && alvo.id;
    if (!id || !/^[0-9a-f-]{36}$/i.test(String(id)) || !window.loveClienteSession?.user?.id) return;
    supabaseClient.from('produto_cliques').insert({ produto_id: id }).then(() => {}, () => {});
  }

  function openB2BVendorProfile(item, servico, servicoDeOrigem) {
    registrarCliqueNoServico(item, servico);
    activeB2BProfileItem = item;
    activeB2BProfileServico = servico || null;
    // Na página de um serviço não há origem; na da empresa, guarda de qual
    // serviço veio (ou mantém, ao reabrir a mesma empresa pelo histórico).
    if (servico) b2bServicoDeOrigem = null;
    else if (servicoDeOrigem) b2bServicoDeOrigem = servicoDeOrigem;
    registrarRota(rotaPerfilFornecedor(item, servico), { voltarComHistorico: true });
    renderB2BVendorProfile(item);

    const exploreView = document.getElementById('b2b-explore-view');
    const profileView = document.getElementById('b2b-vendor-profile-view');
    const searchBar = document.getElementById('b2b-top-search-bar');
    if (exploreView) exploreView.classList.add('hidden');
    if (profileView) profileView.classList.remove('hidden');
    if (searchBar) searchBar.classList.add('hidden');

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function closeB2BVendorProfile() {
    activeB2BProfileItem = null;
    activeB2BProfileServico = null;
    b2bServicoDeOrigem = null;
    const exploreView = document.getElementById('b2b-explore-view');
    const profileView = document.getElementById('b2b-vendor-profile-view');
    const searchBar = document.getElementById('b2b-top-search-bar');
    if (profileView) profileView.classList.add('hidden');
    if (exploreView) exploreView.classList.remove('hidden');
    if (searchBar) searchBar.classList.remove('hidden');

    renderB2BExplore();
  }

  // (Antigo botão "Voltar para Explorar" — hoje o caminho do topo faz isso.)
  document.getElementById('btn-b2b-profile-back')?.addEventListener('click', () => {
    // Aberta a partir da lista nesta sessão: volta pelo histórico (o popstate
    // remonta a lista certa — Explorar ou Favoritos).
    if (history.state?.voltarComHistorico) { history.back(); return; }
    // Entrou direto pela URL do perfil (F5, link): não há lista antes no
    // histórico, então troca a URL pela da lista em vez de empilhar.
    closeB2BVendorProfile();
    const lista = caminhoSubRota('b2b', currentB2BView);
    history.replaceState({ loveRoute: lista }, '', lista);
  });

  document.getElementById('btn-b2b-profile-message')?.addEventListener('click', () => {
    if (activeB2BProfileItem) abrirChatComFornecedor(activeB2BProfileItem.id);
  });

  document.getElementById('btn-b2b-profile-hire')?.addEventListener('click', () => {
    if (activeB2BProfileItem) handleB2BHireAction(activeB2BProfileItem);
  });

  document.getElementById('btn-orcamento-enviar')?.addEventListener('click', enviarPedidoOrcamento);
  document.getElementById('btn-orcamento-ir-chat')?.addEventListener('click', () => {
    closeModal(document.getElementById('modal-b2b-orcamento'));
    if (orcamentoFornecedor) abrirChatComFornecedor(orcamentoFornecedor.id);
  });

  document.getElementById('btn-b2b-profile-favorite')?.addEventListener('click', () => {
    if (!activeB2BProfileItem) return;
    toggleB2BFavorite(activeB2BProfileItem, activeB2BProfileServico);
    renderB2BVendorProfile(activeB2BProfileItem);
  });

  document.getElementById('btn-b2b-profile-share')?.addEventListener('click', (e) => {
    if (activeB2BProfileItem) handleB2BShare(activeB2BProfileItem, e.currentTarget);
  });

  // Setas "<"/">" do carrossel de portfólio do perfil do fornecedor.
  document.getElementById('btn-b2b-profile-portfolio-next')?.addEventListener('click', () => {
    document.getElementById('b2b-profile-portfolio-grid')?.scrollBy({ left: 220, behavior: 'smooth' });
  });
  document.getElementById('btn-b2b-profile-portfolio-prev')?.addEventListener('click', () => {
    document.getElementById('b2b-profile-portfolio-grid')?.scrollBy({ left: -220, behavior: 'smooth' });
  });
  document.getElementById('b2b-profile-portfolio-grid')?.addEventListener('scroll', updateB2BProfilePortfolioArrows);

  // ==========================================
  // 12.4 GALERIA/PORTFÓLIO DO FORNECEDOR (Explorar → clique na imagem)
  // ==========================================
  let supplierGalleryPhotos = [];
  let supplierGalleryIndex = 0;
  let supplierGalleryItem = null;

  function renderSupplierGalleryImage() {
    const img = document.getElementById('supplier-gallery-image');
    const dotsWrap = document.getElementById('supplier-gallery-dots');
    const prevBtn = document.getElementById('btn-supplier-gallery-prev');
    const nextBtn = document.getElementById('btn-supplier-gallery-next');
    if (!img) return;

    img.src = supplierGalleryPhotos[supplierGalleryIndex] || '';

    const multiple = supplierGalleryPhotos.length > 1;
    if (prevBtn) prevBtn.classList.toggle('hidden', !multiple);
    if (nextBtn) nextBtn.classList.toggle('hidden', !multiple);

    if (dotsWrap) {
      dotsWrap.innerHTML = multiple
        ? supplierGalleryPhotos.map((_, i) => `<span class="w-1.5 h-1.5 rounded-full ${i === supplierGalleryIndex ? 'bg-white' : 'bg-white/50'}"></span>`).join('')
        : '';
    }
  }

  // `fotos` opcional: abre com esse conjunto (ex.: galeria de um serviço)
  // em vez do portfólio do fornecedor.
  function openSupplierGalleryModal(item, fotos) {
    const modal = document.getElementById('modal-supplier-gallery');
    if (!modal) return;

    supplierGalleryPhotos = (fotos && fotos.length)
      ? fotos
      : ((item.portfolioPhotos && item.portfolioPhotos.length) ? item.portfolioPhotos : [item.image]);
    supplierGalleryIndex = 0;
    supplierGalleryItem = item;

    const titleEl = document.getElementById('supplier-gallery-title');
    if (titleEl) titleEl.textContent = item.name;

    const roleWrap = document.getElementById('supplier-gallery-role-wrap');
    const roleEl = document.getElementById('supplier-gallery-role');
    if (item.role) {
      if (roleEl) roleEl.textContent = item.role;
      if (roleWrap) roleWrap.classList.remove('hidden');
    } else if (roleWrap) {
      roleWrap.classList.add('hidden');
    }

    const descEl = document.getElementById('supplier-gallery-description');
    if (descEl) descEl.textContent = item.about || item.description || '';

    const skillsWrap = document.getElementById('supplier-gallery-skills-wrap');
    const skillsEl = document.getElementById('supplier-gallery-skills');
    const skills = item.specialties || item.features || [];
    if (skillsEl) {
      skillsEl.innerHTML = skills.map(s => `<span class="px-3 py-1 rounded-full bg-zinc-100 text-zinc-700 text-xs font-medium">${s}</span>`).join('');
    }
    if (skillsWrap) skillsWrap.classList.toggle('hidden', skills.length === 0);

    renderSupplierGalleryImage();
    openModal(modal);
  }

  document.getElementById('btn-supplier-gallery-prev')?.addEventListener('click', (e) => {
    e.stopPropagation();
    supplierGalleryIndex = (supplierGalleryIndex - 1 + supplierGalleryPhotos.length) % supplierGalleryPhotos.length;
    renderSupplierGalleryImage();
  });

  document.getElementById('btn-supplier-gallery-next')?.addEventListener('click', (e) => {
    e.stopPropagation();
    supplierGalleryIndex = (supplierGalleryIndex + 1) % supplierGalleryPhotos.length;
    renderSupplierGalleryImage();
  });

  document.getElementById('btn-supplier-gallery-site')?.addEventListener('click', () => {
    showToast('Este fornecedor ainda não cadastrou um site.', '🔗');
  });

  document.getElementById('btn-supplier-gallery-hire')?.addEventListener('click', () => {
    if (!supplierGalleryItem) return;
    closeModal(document.getElementById('modal-supplier-gallery'));
    handleB2BHireAction(supplierGalleryItem);
  });

  // ==========================================
  // 12. B2B FORNECEDORES & MESSENGER CHAT
  // ==========================================
  let activeB2BConversationId = null;
  let b2bConversationsData = [];
  let b2bMessagesRealtimeChannel = null;

  function formatB2BChatTime(iso) {
    const d = new Date(iso);
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    const yesterday = new Date(now); yesterday.setDate(now.getDate() - 1);
    const isYesterday = d.toDateString() === yesterday.toDateString();
    const hhmm = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    if (isToday) return hhmm;
    if (isYesterday) return `Ontem ${hhmm}`;
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  }

  // "+ Nova conversa": favoritados (algum serviço no coração) que ainda não
  // têm conversa vêm primeiro; depois, do mais bem avaliado para o menos
  // (média, depois quantidade de avaliações, depois nome).
  function ordenarFornecedoresParaNovaConversa(lista, favoritosIds, conversas) {
    const comConversa = new Set((conversas || []).map(c => c.fornecedorId));
    const nota = f => Number(f.avaliacaoMedia) || 0;
    const qtd = f => Number(f.avaliacaoTotal) || 0;
    return (lista || []).map(f => ({
      ...f,
      favoritoSemConversa: (f.services || []).some(s => favoritosIds && favoritosIds.has(s.id)) && !comConversa.has(f.id)
    })).sort((a, b) =>
      (b.favoritoSemConversa - a.favoritoSemConversa)
      || (nota(b) - nota(a))
      || (qtd(b) - qtd(a))
      || String(a.name || '').localeCompare(String(b.name || ''), 'pt-BR'));
  }

  // Várias telas pedem as conversas quase ao mesmo tempo (abrir o Chat,
  // abrir a conversa, redesenhar): uma busca em andamento é reaproveitada
  // em vez de repetir a mesma consulta pesada várias vezes seguidas.
  let b2bConversasCarregando = null;
  function loadB2BConversationsData() {
    if (b2bConversasCarregando) return b2bConversasCarregando;
    b2bConversasCarregando = carregarConversasDoBanco().finally(() => { b2bConversasCarregando = null; });
    return b2bConversasCarregando;
  }

  /* ---------------- Suporte Love (conversa fixa no topo do Chat) ----------------
     É um chamado do Atendimento (tickets, canal "chat"; o Admin responde em
     Atendimento): a 1ª mensagem abre o chamado e as seguintes entram em
     ticket_messages. Sempre aparece, mesmo sem nenhuma mensagem ainda. */
  const SUPORTE_CONV_ID = 'suporte-love';
  const SUPORTE_BOAS_VINDAS = 'Olá! Aqui é o suporte da Love. Conte como podemos ajudar.';
  let suporteTicketId = null;

  function textoDoHtmlSuporte(html) {
    const div = document.createElement('div');
    div.innerHTML = html || '';
    return (div.innerText || div.textContent || '').trim();
  }

  async function conversaSuporteLove() {
    const conv = {
      id: SUPORTE_CONV_ID, isSuporte: true, fornecedorId: null, name: 'Suporte Love', category: 'suporte',
      avatar: LOVE_AVATAR_PADRAO, online: false, unread: 0, lastMessage: SUPORTE_BOAS_VINDAS, time: '',
      messages: [{ id: null, sender: 'them', text: SUPORTE_BOAS_VINDAS, editedAt: null, time: '', attachment: null }]
    };
    try {
      const { data: tickets } = await supabaseClient.from('tickets')
        .select('id, mensagem, created_at')
        .eq('user_id', window.loveClienteSession.user.id).eq('canal', 'chat')
        .order('created_at', { ascending: false }).limit(1);
      const t = tickets && tickets[0];
      if (!t) return conv;
      suporteTicketId = t.id;
      const { data: msgs } = await supabaseClient.from('ticket_messages')
        .select('id, author_role, body, body_html, created_at')
        .eq('ticket_id', t.id).order('created_at', { ascending: true });
      const lista = [
        ...(t.mensagem ? [{ author_role: 'usuario', body: t.mensagem, created_at: t.created_at }] : []),
        ...(msgs || [])
      ];
      lista.forEach(x => conv.messages.push({
        id: null, sender: x.author_role === 'usuario' ? 'me' : 'them',
        text: x.body_html ? textoDoHtmlSuporte(x.body_html) : (x.body || ''),
        editedAt: null, time: formatB2BChatTime(x.created_at), attachment: null
      }));
      const ultima = lista[lista.length - 1];
      if (ultima) {
        conv.lastMessage = ultima.body_html ? textoDoHtmlSuporte(ultima.body_html) : (ultima.body || '');
        conv.time = formatB2BChatTime(ultima.created_at);
      }
    } catch (e) { /* sem acesso aos chamados: fica só a boas-vindas */ }
    return conv;
  }

  // "Digitando…" no Suporte Love: a resposta (robô ou atendente) não aparece
  // na hora — primeiro as três bolinhas, por um tempo que cresce com o
  // tamanho do texto, como no WhatsApp. Depois de a pessoa enviar, as
  // bolinhas já aparecem enquanto a resposta não chega.
  /** Quantas mensagens do suporte já foram mostradas (null = ainda não abriu). @type {number|null} */
  let suporteReveladas = null;
  let suporteTimer = null;
  let suporteAguardandoAte = 0;

  /** Esconde as respostas ainda "sendo digitadas" e marca conv.digitando. */
  function aplicarDigitandoNoSuporte(conv) {
    const todas = conv.todasMensagens || conv.messages;
    conv.todasMensagens = todas;
    if (suporteReveladas === null) suporteReveladas = todas.length; // histórico: tudo de uma vez
    // As mensagens da própria pessoa aparecem na hora.
    while (suporteReveladas < todas.length && todas[suporteReveladas].sender === 'me') suporteReveladas++;
    conv.messages = todas.slice(0, suporteReveladas);
    const pendente = todas[suporteReveladas];
    if (pendente) {
      suporteAguardandoAte = 0;
      if (!suporteTimer) {
        const espera = Math.min(6500, 1800 + String(pendente.text || '').length * 28);
        suporteTimer = setTimeout(() => {
          suporteTimer = null;
          suporteReveladas = (suporteReveladas || 0) + 1;
          redesenharSuporte();
        }, espera);
      }
    }
    conv.digitando = !!pendente || Date.now() < suporteAguardandoAte;
    const ultima = conv.messages[conv.messages.length - 1];
    conv.lastMessage = conv.digitando ? 'Digitando…' : ((ultima && ultima.text) || SUPORTE_BOAS_VINDAS);
    conv.time = (ultima && ultima.time) || '';
  }

  function redesenharSuporte() {
    const conv = b2bConversationsData.find(c => c.isSuporte);
    if (!conv) return;
    aplicarDigitandoNoSuporte(conv);
    if (chatEstaVisivel()) desenharChatComOQueTem();
  }

  async function enviarParaSuporte(text) {
    const sessao = window.loveClienteSession;
    if (!sessao || !text) return false;
    // Bolinhas enquanto a resposta não chega (some sozinha depois de 9 s).
    suporteAguardandoAte = Date.now() + 9000;
    setTimeout(redesenharSuporte, 9100);
    const meta = sessao.user.user_metadata || {};
    const nome = meta.couple_name || meta.full_name || sessao.user.email;
    if (!suporteTicketId) {
      const { data, error } = await supabaseClient.from('tickets').insert({
        origem: 'cliente', user_id: sessao.user.id, nome, email: sessao.user.email,
        assunto: 'Chat com o suporte', mensagem: text, canal: 'chat'
      }).select('id').single();
      if (error) { console.error('Suporte: não foi possível abrir o chamado.', error); return false; }
      suporteTicketId = data.id;
      return true;
    }
    const { error } = await supabaseClient.from('ticket_messages').insert({
      ticket_id: suporteTicketId, author_role: 'usuario', author_id: sessao.user.id,
      author_name: nome, body: text, canal: 'chat'
    });
    if (error) { console.error('Suporte: não foi possível enviar.', error); return false; }
    return true;
  }

  async function carregarConversasDoBanco() {
    if (!window.loveClienteSession) { b2bConversationsData = []; return; }
    const suporte = await conversaSuporteLove();
    aplicarDigitandoNoSuporte(suporte);

    const buscar = (comEditado) => supabaseClient
      .from('conversations')
      .select(`id, last_message_at, fornecedor:fornecedores(id, company_name, avatar_url, products(category, active)), messages(id, text, created_at, sender_role, attachment_url, attachment_type, read_at${comEditado ? ', edited_at' : ''})`)
      .eq('cliente_id', window.loveClienteSession.user.id)
      .order('last_message_at', { ascending: false });
    let { data: rows, error } = await buscar(true);
    // Sem a migration 057 (coluna edited_at) ainda: busca de novo sem ela.
    if (error && /edited_at/i.test(error.message || '')) ({ data: rows, error } = await buscar(false));

    if (error || !rows) { b2bConversationsData = [suporte]; return; }

    b2bConversationsData = rows.map(row => {
      const msgs = (row.messages || []).slice().sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
      const last = msgs[msgs.length - 1];
      return {
        id: row.id,
        fornecedorId: row.fornecedor && row.fornecedor.id,
        // Data da última mensagem (ou da conversa): traz de volta uma conversa excluída da lista.
        lastAt: (last && last.created_at) || row.last_message_at || null,
        name: (row.fornecedor && row.fornecedor.company_name) || 'Fornecedor',
        // Categoria do fornecedor = a do primeiro serviço ativo com categoria (ex.: "Bar e Bebidas").
        category: ((row.fornecedor && row.fornecedor.products) || []).filter(p => p && p.active !== false && p.category).map(p => p.category)[0] || '',
        // Sem foto: as iniciais da empresa (mesmo avatar do perfil no Explorar).
        avatar: (row.fornecedor && row.fornecedor.avatar_url) || avatarComIniciais((row.fornecedor && row.fornecedor.company_name) || 'Fornecedor'),
        online: false,
        // Não lidas = mensagens do fornecedor ainda sem read_at.
        unread: msgs.filter(m => m.sender_role === 'fornecedor' && !m.read_at).length,
        lastMessage: last ? (last.text || (last.attachment_url ? '[Anexo]' : '')) : 'Nova conversa',
        time: last ? formatB2BChatTime(last.created_at) : '',
        messages: msgs.map(m => ({
          id: m.id,
          sender: m.sender_role === 'cliente' ? 'me' : 'them',
          text: m.text,
          editedAt: m.edited_at || null,
          time: formatB2BChatTime(m.created_at),
          attachment: m.attachment_url ? { type: m.attachment_type || 'doc', url: m.attachment_url, name: 'Anexo' } : null
        }))
      };
    });
    b2bConversationsData.unshift(suporte);
  }

  // Cria (ou reaproveita) a conversa com um fornecedor real e a torna a ativa.
  async function openConversationWithFornecedor(fornecedorId) {
    if (!window.loveClienteSession) return;
    const clienteId = window.loveClienteSession.user.id;

    // Conversa já carregada: abre na hora e atualiza em segundo plano.
    const jaCarregada = b2bConversationsData.find(c => c.fornecedorId === fornecedorId);
    if (jaCarregada) {
      activeB2BConversationId = jaCarregada.id;
      renderB2BChat();
      return;
    }

    const { data: existing } = await supabaseClient
      .from('conversations')
      .select('id')
      .eq('fornecedor_id', fornecedorId)
      .eq('cliente_id', clienteId)
      .maybeSingle();

    let convId = existing && existing.id;
    if (!convId) {
      const { data: created, error } = await supabaseClient
        .from('conversations')
        .insert({ fornecedor_id: fornecedorId, cliente_id: clienteId })
        .select('id')
        .single();
      if (error) { showToast('Não foi possível iniciar a conversa.', '⚠️'); return; }
      convId = created.id;
    }

    activeB2BConversationId = convId;
    await renderB2BChat();
  }

  // Total de mensagens não lidas (todas as conversas) no envelope do
  // cabeçalho e no item "Chat" do submenu — antes eram números fixos (2 e 3).
  function totalNaoLidasDoChat() {
    return b2bConversationsData.reduce((acc, c) => acc + (c.unread || 0), 0);
  }

  function atualizarContadoresDoChat() {
    const total = totalNaoLidasDoChat();
    const texto = total > 99 ? '99+' : String(total);
    const badgeHeader = document.querySelector('.badge-header-chat');
    if (badgeHeader) {
      badgeHeader.textContent = texto;
      badgeHeader.classList.toggle('hidden', total === 0);
    }
    const itemChat = document.querySelector('.sub-drawer-item[data-route-sub="messages"]');
    if (itemChat) {
      let badge = itemChat.querySelector('.badge-recados-count');
      if (total > 0) {
        if (!badge) {
          badge = document.createElement('span');
          badge.className = 'badge-recados-count chat-unread-count ml-auto';
          badge.style.cssText = 'background-color: #c7305b !important; color: #FFFFFF !important;';
          itemChat.appendChild(badge);
        }
        badge.textContent = texto;
      } else if (badge) {
        badge.remove();
      }
    }
  }

  // Chat aberto na tela (aba Fornecedores › Chat visível)?
  function chatEstaVisivel() {
    const tab = document.getElementById('tab-b2b');
    const view = document.getElementById('b2b-messages-view');
    return !!(tab && tab.classList.contains('active') && view && !view.classList.contains('hidden') && currentB2BView === 'messages');
  }

  // Conversa aberta e visível: marca como lidas as mensagens recebidas
  // (função marcar_conversa_lida — migration 045).
  async function marcarConversaAtivaComoLida() {
    if (!chatEstaVisivel() || !activeB2BConversationId) return;
    const conv = b2bConversationsData.find(c => c.id === activeB2BConversationId);
    if (!conv || !conv.unread) return;
    conv.unread = 0;
    atualizarContadoresDoChat();
    const { error } = await supabaseClient.rpc('marcar_conversa_lida', { p_conversation_id: activeB2BConversationId });
    if (error) console.error('Erro ao marcar conversa como lida:', error);
  }

  // Hub global de chat Love - Conecta esta tela com a futura tela dos assessores
  window.LoveChatService = {
    getConversations: () => b2bConversationsData,
    getConversation: (id) => b2bConversationsData.find(c => c.id === id),
    getActiveConversationId: () => activeB2BConversationId,
    setActiveConversationId: (id) => {
      activeB2BConversationId = id;
      renderB2BChat();
    },
    openConversationWithFornecedor,
    sendMessage: async (convId, text, sender, attachment = null) => {
      if (!window.loveClienteSession || !convId) return null;

      if (convId === SUPORTE_CONV_ID) {
        if (!text || attachment) { showToast('No suporte, envie a mensagem em texto.', '⚠️'); return null; }
        if (!(await enviarParaSuporte(text))) { showToast('Não foi possível enviar ao suporte.', '⚠️'); return null; }
        await loadB2BConversationsData();
        renderB2BChat();
        return true;
      }

      const { error } = await supabaseClient.from('messages').insert({
        conversation_id: convId,
        sender_id: window.loveClienteSession.user.id,
        sender_role: 'cliente',
        text: text || null,
        attachment_url: attachment ? attachment.url : null,
        attachment_type: attachment ? attachment.type : null
      });
      if (error) { console.error('Erro ao enviar mensagem:', error); return null; }

      await supabaseClient.from('conversations').update({ last_message_at: new Date().toISOString() }).eq('id', convId);
      await loadB2BConversationsData();
      renderB2BChat();
      return true;
    }
  };

  function subscribeToB2BChatRealtime() {
    if (!window.loveClienteSession) return;
    if (b2bMessagesRealtimeChannel) supabaseClient.removeChannel(b2bMessagesRealtimeChannel);
    b2bMessagesRealtimeChannel = supabaseClient
      .channel('love-b2b-mensagens')
      // Resposta do suporte (Admin › Atendimento) no chamado do chat.
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'ticket_messages' }, async (payload) => {
        if (!payload.new || payload.new.ticket_id !== suporteTicketId) return;
        if (chatEstaVisivel()) { await renderB2BChat(); return; }
        await loadB2BConversationsData();
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, async (payload) => {
        const nova = payload && payload.new;
        if (nova && nova.conversation_id) delete digitandoAte[nova.conversation_id];
        if (chatEstaVisivel()) { await renderB2BChat(); return; }
        await loadB2BConversationsData();
        atualizarContadoresDoChat();
      })
      // Mensagem editada do outro lado (Hub) ou apagada: atualiza na hora,
      // sem F5. Com a tela do chat aberta, redesenha; senão, só a cache.
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'messages' }, async (payload) => {
        const nova = payload && payload.new;
        if (!nova || !nova.id) return;
        const conv = b2bConversationsData.find(c => c.id === nova.conversation_id);
        const msg = conv && conv.messages.find(m => m.id === nova.id);
        if (!msg) return;
        // Só marcação de lida (read_at): texto e edição iguais, nada a redesenhar.
        const textoIgual = (msg.text || '') === (nova.text || '');
        const edicaoIgual = (msg.editedAt || null) === (nova.edited_at || null);
        if (textoIgual && edicaoIgual) return;
        msg.text = nova.text;
        msg.editedAt = nova.edited_at || null;
        if (conv.messages[conv.messages.length - 1] === msg) conv.lastMessage = nova.text || (nova.attachment_url ? '[Anexo]' : '');
        // Não apaga o que a pessoa está digitando numa edição em andamento.
        const editando = !!document.querySelector('#b2b-chat-messages-container .chat-msg-editor');
        if (chatEstaVisivel() && !editando) await renderB2BChat();
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'messages' }, async () => {
        if (chatEstaVisivel()) { await renderB2BChat(); return; }
        await loadB2BConversationsData();
        atualizarContadoresDoChat();
      })
      .subscribe();
  }

  function switchB2BView(viewId, targetVendorId) {
    registrarRota(caminhoSubRota('b2b', viewId));
    const tabB2B = document.getElementById('tab-b2b');
    if (tabB2B && !tabB2B.classList.contains('active')) {
      document.querySelectorAll('.dashboard-tab-content').forEach(c => c.classList.remove('active'));
      tabB2B.classList.add('active');
    }
    document.querySelectorAll('.rail-icon-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.railTab === 'b2b');
    });

    const exploreView = document.getElementById('b2b-explore-view');
    const vendorProfileView = document.getElementById('b2b-vendor-profile-view');
    const messagesView = document.getElementById('b2b-messages-view');
    const contractedView = document.getElementById('b2b-contracted-view');
    const insuranceView = document.getElementById('b2b-insurance-view');
    const searchBar = document.getElementById('b2b-top-search-bar');
    const toolbarTitle = document.getElementById('b2b-toolbar-title');
    const searchInput = document.getElementById('b2b-search-input');
    const sortContainer = document.getElementById('b2b-sort-container');
    const b2bNavTabs = document.querySelectorAll('.tab-b2b-nav');

    // Navegar pra qualquer aba nomeada (Mensagens, Meus Contratos, etc.)
    // sempre sai da página de perfil de um fornecedor específico.
    activeB2BProfileItem = null;
    if (vendorProfileView) vendorProfileView.classList.add('hidden');
    document.getElementById('b2b-contracted-vendor-view')?.classList.add('hidden');

    currentB2BView = viewId;
    if (viewId !== 'messages' && viewId !== 'contracted') atualizarVitrineSeAntiga();
    if (sortContainer) sortContainer.classList.toggle('hidden', viewId === 'messages' || viewId === 'contracted');
    if (searchInput) searchInput.value = '';
    b2bSearchQuery = '';

    b2bNavTabs.forEach(t => {
      const v = t.getAttribute('data-b2b-view');
      if (viewId === v) {
        t.classList.remove('border-transparent', 'text-zinc-500');
        t.classList.add('border-blue-600', 'text-blue-600', 'font-medium', 'active');
      } else {
        t.classList.remove('border-blue-600', 'text-blue-600', 'font-medium', 'active');
        t.classList.add('border-transparent', 'text-zinc-500');
      }
    });

    document.body.classList.add('b2b-mode');

    // Sincroniza destaque visual na sub-barra lateral de fornecedores
    if (elements.drawerSubItemsList) {
      const b2bItemMap = {
        'explore': 'Explorar',
        'pedidos': 'Solicitar propostas',
        'messages': 'Mensagens',
        'contracted': 'Meus contratos',
        'insurance': 'Benefícios',
        'favorites': 'Favoritos'
      };
      const targetLabel = b2bItemMap[viewId] || 'Explorar';
      elements.drawerSubItemsList.querySelectorAll('.sub-drawer-item').forEach((b) => {
        b.classList.toggle('active', b.textContent.includes(targetLabel));
      });
    }

    initB2BMarketplace();

    // Pedidos de orçamento: a tabela dos pedidos e o botão "Novo pedido" no
    // cabeçalho, sem busca/local/lista-grade.
    const pedidosView = document.getElementById('b2b-pedidos-view');
    const ehPedidos = viewId === 'pedidos';
    pedidosView?.classList.toggle('hidden', !ehPedidos);
    document.getElementById('btn-rfp-novo')?.classList.toggle('hidden', !ehPedidos);
    if (ehPedidos) {
      document.body.classList.remove('b2b-chat-mode');
      document.getElementById('b2b-toolbar-controls')?.classList.add('hidden');
      if (searchBar) searchBar.classList.remove('hidden');
      if (toolbarTitle) toolbarTitle.textContent = 'Solicitar propostas';
      [exploreView, messagesView, contractedView, insuranceView].forEach(v => v?.classList.add('hidden'));
      if (window.LovePedidos) window.LovePedidos.mostrarLista();
      return;
    }

    // Chat: só o título no cabeçalho — sem busca, local e lista/grade.
    document.getElementById('b2b-toolbar-controls')?.classList.toggle('hidden', viewId === 'messages');

    if (viewId === 'messages') {
      document.body.classList.add('b2b-chat-mode');
      if (searchBar) searchBar.classList.remove('hidden');
      if (toolbarTitle) toolbarTitle.textContent = 'Mensagens';
      if (searchInput) searchInput.placeholder = 'Buscar nas conversas...';
      if (exploreView) exploreView.classList.add('hidden');
      if (contractedView) contractedView.classList.add('hidden');
      if (insuranceView) insuranceView.classList.add('hidden');
      if (messagesView) messagesView.classList.remove('hidden');
      if (targetVendorId) {
        activeB2BConversationId = targetVendorId;
      }
      renderB2BChat();
    } else {
      document.body.classList.remove('b2b-chat-mode');
      if (searchBar) searchBar.classList.remove('hidden');
      if (messagesView) messagesView.classList.add('hidden');
      // Meus contratos é sempre em lista — sem o seletor grade/lista no cabeçalho.
      document.getElementById('b2b-view-toggle')?.classList.toggle('hidden', viewId === 'contracted');
      if (viewId === 'contracted') {
        if (exploreView) exploreView.classList.add('hidden');
        if (insuranceView) insuranceView.classList.add('hidden');
        if (contractedView) contractedView.classList.remove('hidden');
        if (toolbarTitle) toolbarTitle.textContent = 'Meus Contratos';
        if (searchInput) searchInput.placeholder = 'Buscar fornecedores';
        renderB2BContracted();
      } else if (viewId === 'insurance') {
        if (exploreView) exploreView.classList.add('hidden');
        if (contractedView) contractedView.classList.add('hidden');
        if (insuranceView) insuranceView.classList.remove('hidden');
        if (searchBar) searchBar.classList.add('hidden');
      } else {
        if (contractedView) contractedView.classList.add('hidden');
        if (insuranceView) insuranceView.classList.add('hidden');
        if (exploreView) exploreView.classList.remove('hidden');
        if (searchInput) searchInput.placeholder = 'Buscar fornecedores';
        const categoryTabs = document.getElementById('b2b-category-tabs');
        // Favoritos não tem o filtro de cidades (a barra só existe no Explorar).
        document.getElementById('b2b-city-filter-wrap')?.classList.toggle('hidden', viewId === 'favorites');
        if (viewId === 'favorites') {
          if (toolbarTitle) toolbarTitle.textContent = 'Favoritos';
          if (categoryTabs) categoryTabs.style.setProperty('display', 'none', 'important');
          currentB2BCategory = 'favorites';
        } else {
          if (toolbarTitle) toolbarTitle.textContent = 'Encontrar fornecedor';
          if (categoryTabs) categoryTabs.style.removeProperty('display');
          if (viewId === 'explore' && currentB2BCategory === 'favorites') {
            currentB2BCategory = 'all';
          }
        }
        renderB2BExplore();
      }
    }
  }

  // "R$ 28.500,00" → 28500
  function parseValorBRL(texto) {
    const n = parseFloat(String(texto || '').replace(/[^\d.,]/g, '').replace(/\./g, '').replace(',', '.'));
    return Number.isFinite(n) ? n : 0;
  }

  function renderB2BContracted() {
    const container = document.getElementById('b2b-contracted-list-container');
    if (!container) return;
    container.innerHTML = '';

    const contractedList = window.LOVE_DATA.contractedVendors || [];

    if (contractedList.length === 0) {
      // Mesmo visual das caixas de Benefícios Love: sem linha, com a sombra
      // leve da regra global de .bg-white.rounded-*.
      container.innerHTML = `
        <div class="p-12 text-center bg-white rounded-2xl border border-transparent text-sm text-zinc-500 flex flex-col items-center gap-4">
          <p>Você ainda não possui fornecedores contratados, que tal explorar?</p>
          <button type="button" class="btn-contracted-empty-explore px-5 py-2.5 rounded-xl bg-[#333333] hover:bg-[#222222] text-white text-xs sm:text-sm font-bold transition-all cursor-pointer">
            Explorar Fornecedores
          </button>
        </div>
      `;
      // Mesmo efeito de clicar em "Explorar" na sub-barra (marca o item e troca a URL).
      container.querySelector('.btn-contracted-empty-explore')?.addEventListener('click', () => {
        abrirSubItem('b2b', 'explore');
      });
      return;
    }

    contractedList.forEach(item => {
      // Mesmo padrão estético (flat, sem caixa) da lista do Explorar — ver
      // renderB2BExplore() / .b2b-item-card.
      const card = document.createElement('div');
      card.className = 'b2b-item-card group flex flex-col md:flex-row gap-6 items-stretch w-full p-6 md:pl-0 first:pt-0 cursor-pointer';

      // Quitação = quanto já foi pago do valor negociado (barra de progresso).
      const valorPago = item.paidValueNum ?? parseValorBRL(item.paidValue);
      const valorTotal = item.negotiatedValueNum ?? parseValorBRL(item.negotiatedValue);
      const quitacao = valorTotal > 0 ? Math.min(100, Math.round((valorPago / valorTotal) * 100)) : 0;

      card.innerHTML = `
        <div class="relative w-full md:w-80 h-48 rounded-xl overflow-hidden bg-zinc-100 flex-shrink-0">
          <img src="${item.image}" alt="${item.name}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300">
        </div>

        <div class="flex-1 flex flex-col justify-between min-w-0">
          <div>
            <h4 class="text-base sm:text-lg font-bold text-zinc-900 truncate font-sans tracking-tight group-hover:text-[#537bae] transition-colors" title="${item.name}">${item.name}</h4>
            <p class="text-sm text-zinc-500 mt-3 leading-relaxed line-clamp-2 font-sans">${item.service || ''}</p>
          </div>

          <div class="flex flex-wrap items-end justify-between gap-4 pt-3.5 mt-3.5 border-t border-zinc-100">
            <div class="flex flex-wrap items-end gap-x-8 gap-y-3 min-w-0">
              <div>
                <span class="block text-xs text-zinc-400">Valor do contrato</span>
                <span class="block text-sm font-semibold text-zinc-800">${item.negotiatedValue || '—'}</span>
              </div>
              <div class="w-44">
                <div class="flex items-center justify-between text-xs">
                  <span class="text-zinc-400">Quitação</span>
                  <span class="font-semibold text-zinc-700">${quitacao}%</span>
                </div>
                <div class="mt-1.5 h-2 w-full rounded-full bg-zinc-100 overflow-hidden" role="progressbar" aria-label="Quitação do contrato" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${quitacao}">
                  <div class="h-full rounded-full bg-[#537bae]" style="width: ${quitacao}%"></div>
                </div>
              </div>
            </div>

            <div class="flex items-center gap-2.5">
              <button type="button" class="btn-contracted-chat btn-secondary">
                <svg fill="none" stroke="currentColor" stroke-width="2.15" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.15" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75"/></svg>
                <span>Mensagens</span>
              </button>
              <button type="button" class="btn-contracted-actions px-5 py-2.5 rounded-xl bg-[#333333] hover:bg-[#222222] text-white text-xs sm:text-sm font-bold transition-all shadow-xs cursor-pointer">
                Meu contrato
              </button>
            </div>
          </div>
        </div>
      `;

      card.querySelector('.btn-contracted-chat')?.addEventListener('click', (e) => {
        e.stopPropagation();
        switchB2BView('messages');
      });

      card.querySelector('.btn-contracted-actions')?.addEventListener('click', (e) => {
        e.stopPropagation();
        openContractedVendorPage(item);
      });

      card.addEventListener('click', () => openContractedVendorPage(item));

      container.appendChild(card);
    });
  }

  let activeContractedVendor = null;

  // Página do fornecedor contratado (Meus Contratos → clique num
  // fornecedor) — mesmo padrão da página do fornecedor em Explorar, nunca
  // mais um drawer/pop-up pra essa ação. Submenu Contrato / Configurações.
  function openContractedVendorPage(vendor) {
    activeContractedVendor = vendor;
    registrarRota(`/fornecedores/contratos/${encodeURIComponent(vendor.id)}`, { voltarComHistorico: true });
    const listView = document.getElementById('b2b-contracted-view');
    const pageView = document.getElementById('b2b-contracted-vendor-view');
    if (!pageView) return;

    if (listView) listView.classList.add('hidden');
    pageView.classList.remove('hidden');

    document.getElementById('contracted-vendor-page-name').textContent = vendor.name;
    document.getElementById('contracted-vendor-page-category').textContent = vendor.category;
    document.getElementById('contracted-vendor-page-image').src = vendor.image;

    renderContractedVendorContract(vendor);
    renderContractedVendorPermissions(vendor);
    setContractedVendorSubtab('contract');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function closeContractedVendorPage() {
    document.getElementById('b2b-contracted-vendor-view')?.classList.add('hidden');
    document.getElementById('b2b-contracted-view')?.classList.remove('hidden');
    activeContractedVendor = null;
  }

  function setContractedVendorSubtab(id) {
    document.querySelectorAll('.contracted-vendor-subtab').forEach(btn => {
      const active = btn.dataset.subtab === id;
      btn.classList.toggle('border-[#181D24]', active);
      btn.classList.toggle('text-zinc-900', active);
      btn.classList.toggle('border-transparent', !active);
      btn.classList.toggle('text-zinc-400', !active);
    });
    document.getElementById('contracted-vendor-panel-contract')?.classList.toggle('hidden', id !== 'contract');
    document.getElementById('contracted-vendor-panel-settings')?.classList.toggle('hidden', id !== 'settings');
  }

  function renderContractedVendorContract(vendor) {
    const bodyEl = document.getElementById('contracted-vendor-panel-contract');
    if (!bodyEl) return;

    const deliverablesHtml = (vendor.deliverables || []).map(d => `
      <li class="flex items-start gap-2 text-xs text-zinc-700">
        <span class="text-emerald-500 font-bold mt-0.5">✓</span>
        <span>${d}</span>
      </li>
    `).join('');

    bodyEl.innerHTML = `
      <!-- 1. Status & Vigência -->
      <div class="p-4 rounded-2xl bg-zinc-50 border border-zinc-200/80 flex items-center justify-between gap-3">
        <div>
          <span class="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Status do Contrato</span>
          <span class="text-sm font-bold text-emerald-700 mt-0.5 block flex items-center gap-1.5">
            <span>🛡️</span> ${vendor.contractStatus}
          </span>
        </div>
        <div class="text-right">
          <span class="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Data do Evento</span>
          <span class="text-xs font-bold text-zinc-800 mt-0.5 block">${vendor.eventDate}</span>
        </div>
      </div>

      <!-- 2. Serviço Contratado & Entregáveis -->
      <div class="p-4 rounded-2xl bg-white border border-zinc-200/80 shadow-xs space-y-3">
        <span class="text-xs font-bold text-zinc-800 uppercase tracking-wider flex items-center gap-1.5">
          <span>📋</span> Escopo do Serviço Contratado
        </span>
        <p class="text-xs text-zinc-600 leading-relaxed font-normal">${vendor.service}</p>
        
        <div class="pt-2 border-t border-zinc-100 space-y-2">
          <span class="text-[11px] font-bold text-zinc-700 block">Itens & Cláusulas Inclusas:</span>
          <ul class="space-y-1.5 pl-1">
            ${deliverablesHtml}
          </ul>
        </div>
      </div>

      <!-- 3. Responsável & Contato Direto -->
      <div class="p-4 rounded-2xl bg-white border border-zinc-200/80 shadow-xs space-y-3">
        <span class="text-xs font-bold text-zinc-800 uppercase tracking-wider flex items-center gap-1.5">
          <span>👤</span> Responsável & Atendimento Direto
        </span>
        <div class="flex items-center justify-between gap-3 bg-zinc-50 p-3 rounded-xl border border-zinc-100">
          <div>
            <h4 class="font-bold text-zinc-900 text-sm">${vendor.responsibleName}</h4>
            <p class="text-[11px] text-zinc-500">${vendor.responsibleRole || 'Atendimento'}</p>
            <p class="text-xs font-medium text-zinc-700 mt-1">${vendor.responsiblePhone} • ${vendor.responsibleEmail}</p>
          </div>
          <a href="https://wa.me/5511999999999" target="_blank" class="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs">
            <span>WhatsApp</span>
          </a>
        </div>
      </div>

      <!-- 4. Condições Comerciais & Negociado -->
      <div class="p-4 rounded-2xl bg-white border border-zinc-200/80 shadow-xs space-y-3">
        <span class="text-xs font-bold text-zinc-800 uppercase tracking-wider flex items-center gap-1.5">
          <span>💳</span> Condições Comerciais & Pagamentos
        </span>
        
        <div class="grid grid-cols-2 gap-2 text-xs">
          <div class="p-3 bg-zinc-50 rounded-xl border border-zinc-100">
            <span class="text-[10px] text-zinc-400 block font-medium">Valor Total Negociado</span>
            <span class="text-base font-black text-zinc-900 mt-0.5 block">${vendor.negotiatedValue}</span>
          </div>
          <div class="p-3 bg-zinc-50 rounded-xl border border-zinc-100">
            <span class="text-[10px] text-zinc-400 block font-medium">Valor Já Quitado</span>
            <span class="text-base font-black text-[#537bae] mt-0.5 block">${vendor.paidValue || vendor.negotiatedValue}</span>
          </div>
        </div>

        <div class="p-3 bg-zinc-50 rounded-xl border border-zinc-100 space-y-1">
          <span class="text-[10px] text-zinc-400 block font-medium">Condições de Pagamento</span>
          <span class="text-xs font-semibold text-zinc-800 block">${vendor.paymentTerms}</span>
        </div>
      </div>

      <!-- 5. Próximo Marco & Cronograma -->
      <div class="p-4 rounded-2xl bg-white border border-zinc-200/80 shadow-xs space-y-2">
        <span class="text-xs font-bold text-zinc-800 uppercase tracking-wider flex items-center gap-1.5">
          <span>📅</span> Próxima Etapa / Marco do Cronograma
        </span>
        <div class="p-3 bg-blue-50/60 rounded-xl border border-blue-100 text-xs text-blue-900 font-medium flex items-center gap-2">
          <span class="text-base">🔔</span>
          <span>${vendor.nextMilestone}</span>
        </div>
      </div>

      <!-- 6. Arquivo do Contrato Anexo -->
      <div class="p-4 rounded-2xl bg-white border border-zinc-200/80 shadow-xs space-y-3">
        <span class="text-xs font-bold text-zinc-800 uppercase tracking-wider flex items-center gap-1.5">
          <span>📎</span> Documento Oficial Assinado
        </span>
        <div class="flex items-center justify-between p-3 rounded-xl bg-zinc-50 border border-zinc-100 hover:bg-zinc-100/80 transition-colors">
          <div class="flex items-center gap-2.5">
            <span class="text-2xl">📄</span>
            <div>
              <span class="text-xs font-bold text-zinc-800 block">${vendor.contractFile}</span>
              <span class="text-[10px] text-zinc-400">PDF Autenticado digitalmente • 2.4 MB</span>
            </div>
          </div>
          <button type="button" class="px-3 py-1.5 rounded-lg border border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-700 text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center gap-1" onclick="alert('Download do contrato iniciado!')">
            <span>Baixar</span>
          </button>
        </div>
      </div>
    `;
  }

  // Inicialização de Listeners da Página de Fornecedor Contratado
  const btnContractedVendorBack = document.getElementById('btn-contracted-vendor-back');
  if (btnContractedVendorBack) {
    btnContractedVendorBack.addEventListener('click', () => {
      if (history.state?.voltarComHistorico) { history.back(); return; }
      closeContractedVendorPage();
      history.replaceState({ loveRoute: '/fornecedores/contratos' }, '', '/fornecedores/contratos');
    });
  }

  const btnContractedVendorChat = document.getElementById('btn-contracted-vendor-chat');
  if (btnContractedVendorChat) {
    btnContractedVendorChat.addEventListener('click', () => {
      if (activeContractedVendor) {
        switchB2BView('messages');
      }
    });
  }

  document.querySelectorAll('.contracted-vendor-subtab').forEach(btn => {
    btn.addEventListener('click', () => setContractedVendorSubtab(btn.dataset.subtab));
  });

  // ---------------- "Digitando…" entre anfitrião e fornecedor ----------------
  // Realtime Broadcast do Supabase (não grava nada no banco): canal
  // "digitando:<id da conversa>", evento "digitando", payload { papel }.
  // O Hub (B2B/js/mensagens.js) usa o mesmo canal com papel "fornecedor".
  // Quem digita avisa no máximo a cada 2 s; do outro lado as bolinhas ficam
  // 4,5 s depois do último aviso, ou até a mensagem chegar.
  /** @type {Map<string, any>} */
  const canaisDigitando = new Map();
  /** @type {Record<string, number>} */
  const digitandoAte = {};
  let ultimoAvisoDigitando = 0;

  /** @param {any} conv @returns {boolean} */
  function outroEstaDigitando(conv) {
    return !!conv && !conv.isSuporte && (digitandoAte[conv.id] || 0) > Date.now();
  }

  function redesenharDigitando() {
    if (!chatEstaVisivel()) return;
    if (document.querySelector('#b2b-chat-messages-container .chat-msg-editor')) return; // edição em andamento
    const busca = /** @type {HTMLInputElement|null} */ (document.getElementById('b2b-chat-search'));
    renderB2BChatContacts(busca ? busca.value : '');
    renderB2BChatMessages();
  }

  // Um canal por conversa com fornecedor (as 30 mais recentes).
  function assinarCanaisDigitando() {
    if (!window.loveClienteSession) return;
    const ids = new Set(b2bConversationsData.filter(c => !c.isSuporte).slice(0, 30).map(c => c.id));
    canaisDigitando.forEach((canal, id) => {
      if (!ids.has(id)) { supabaseClient.removeChannel(canal); canaisDigitando.delete(id); }
    });
    ids.forEach(id => {
      if (canaisDigitando.has(id)) return;
      const canal = supabaseClient.channel(`digitando:${id}`, { config: { broadcast: { self: false } } })
        .on('broadcast', { event: 'digitando' }, ({ payload }) => {
          if (!payload || payload.papel !== 'fornecedor') return;
          const tinha = (digitandoAte[id] || 0) > Date.now();
          digitandoAte[id] = Date.now() + 4500;
          if (!tinha) redesenharDigitando();
          setTimeout(() => { if ((digitandoAte[id] || 0) <= Date.now()) redesenharDigitando(); }, 4600);
        })
        .subscribe();
      canaisDigitando.set(id, canal);
    });
  }

  /** Avisa o fornecedor que o anfitrião está digitando (no máximo a cada 2 s). */
  function avisarQueEstouDigitando() {
    const canal = canaisDigitando.get(activeB2BConversationId);
    if (!canal || Date.now() - ultimoAvisoDigitando < 2000) return;
    ultimoAvisoDigitando = Date.now();
    canal.send({ type: 'broadcast', event: 'digitando', payload: { papel: 'cliente' } });
  }

  function desenharChatComOQueTem() {
    assinarCanaisDigitando();
    if (!b2bConversationsData.some(c => c.id === activeB2BConversationId)) {
      const primeira = b2bConversationsData.find(c => !c.isSuporte) || b2bConversationsData[0];
      activeB2BConversationId = primeira ? primeira.id : null;
    }
    renderB2BChatContacts();
    renderB2BChatMessages();
    initB2BChatHandlers();
  }

  // Desenha na hora com as conversas já carregadas (sem esperar o banco) e
  // redesenha quando a busca atualizada chega.
  async function renderB2BChat() {
    if (b2bConversationsData.length) desenharChatComOQueTem();
    await loadB2BConversationsData();
    desenharChatComOQueTem();
    await marcarConversaAtivaComoLida();
    atualizarContadoresDoChat();
  }

  /* ---------------- Excluir conversa (menu ⋯ da lista) ----------------
     Mesmo modelo do chat do Hub (B2B/js/mensagens.js). Excluída: some só da lista desta pessoa e volta sozinha se chegar mensagem nova —
     nada é apagado no banco nem do lado do fornecedor. Fica no localStorage,
     por usuário. */
  /** @param {'excluidas'} tipo */
  function chaveConversas(tipo) {
    const uid = (window.loveClienteSession && window.loveClienteSession.user && window.loveClienteSession.user.id) || 'anon';
    return `love-conversas-${tipo}-${uid}`;
  }
  /** @param {'excluidas'} tipo @param {any} padrao */
  function lerConversas(tipo, padrao) {
    try { return JSON.parse(localStorage.getItem(chaveConversas(tipo)) || 'null') || padrao; } catch (e) { return padrao; }
  }
  /** @param {'excluidas'} tipo @param {any} valor */
  function gravarConversas(tipo, valor) {
    try { localStorage.setItem(chaveConversas(tipo), JSON.stringify(valor)); } catch (e) { /* sem armazenamento */ }
  }
  /** @returns {Record<string, string>} */
  const conversasExcluidas = () => lerConversas('excluidas', {});

  function conversaVisivelNaLista(conv) {
    if (conv.isSuporte) return true;
    const excluidaEm = conversasExcluidas()[conv.id];
    return !excluidaEm || (!!conv.lastAt && new Date(conv.lastAt) > new Date(excluidaEm));
  }

  function filtroDaListaDoChat() {
    const busca = /** @type {HTMLInputElement|null} */ (document.getElementById('b2b-chat-search'));
    return busca ? busca.value : '';
  }

  function excluirConversaDaLista(convId) {
    const excluidas = conversasExcluidas();
    excluidas[convId] = new Date().toISOString();
    gravarConversas('excluidas', excluidas);
    if (activeB2BConversationId === convId) {
      const proxima = b2bConversationsData.find(c => c.id !== convId && !c.isSuporte && conversaVisivelNaLista(c))
        || b2bConversationsData.find(c => c.isSuporte);
      activeB2BConversationId = proxima ? proxima.id : null;
      renderB2BChatMessages();
    }
    renderB2BChatContacts(filtroDaListaDoChat());
  }

  function fecharMenuConversa() {
    document.querySelector('.conv-menu')?.remove();
    document.querySelectorAll('.conv-item.menu-aberto').forEach(el => el.classList.remove('menu-aberto'));
  }

  /** @param {HTMLElement} btn @param {any} conv */
  function abrirMenuConversa(btn, conv) {
    fecharMenuConversa();
    const menu = document.createElement('div');
    menu.className = 'conv-menu';
    menu.setAttribute('role', 'menu');
    menu.innerHTML = `
      <button type="button" role="menuitem" data-conv-excluir>Excluir</button>`;
    document.body.appendChild(menu);
    const r = btn.getBoundingClientRect();
    menu.style.top = `${r.bottom + 4 + window.scrollY}px`;
    menu.style.left = `${Math.max(8, r.right - menu.offsetWidth + window.scrollX)}px`;
    btn.closest('.conv-item')?.classList.add('menu-aberto');
    menu.querySelector('[data-conv-excluir]').addEventListener('click', () => {
      fecharMenuConversa();
      confirmarNaLove({
        titulo: 'Excluir conversa?',
        texto: `A conversa com ${conv.name} sai da sua lista. Se chegar mensagem nova, ela volta.`,
        botao: 'Excluir',
        aoConfirmar: () => excluirConversaDaLista(conv.id)
      });
    });
  }
  document.addEventListener('click', (e) => {
    const alvo = /** @type {Element} */ (e.target);
    if (!alvo.closest || (!alvo.closest('.conv-menu') && !alvo.closest('[data-conv-menu]'))) fecharMenuConversa();
  });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') fecharMenuConversa(); });

  const ICONE_CONVERSA_MAIS = '<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="5" cy="12" r="1.8"/><circle cx="12" cy="12" r="1.8"/><circle cx="19" cy="12" r="1.8"/></svg>';

  /** Texto da busca da lista de conversas. */
  function buscaDoChat() {
    const campo = /** @type {HTMLInputElement|null} */ (document.getElementById('b2b-chat-search'));
    return campo ? campo.value : '';
  }

  function renderB2BChatContacts(filterQuery = buscaDoChat()) {
    const list = document.getElementById('b2b-chat-contacts-list');
    if (!list) return;

    list.innerHTML = '';

    if (!b2bConversationsData.length) {
      list.innerHTML = '<div class="p-6 text-center text-xs text-zinc-400">Nenhuma conversa ainda. Fale com um fornecedor pelo Explorar.</div>';
      return;
    }

    // Suporte Love no topo; as excluídas da lista só voltam com mensagem nova.
    const filtered = b2bConversationsData
      .filter(conversaVisivelNaLista)
      .map((c, i) => ({ c, i }))
      .sort((a, b) => ((a.c.isSuporte ? -1 : 0) - (b.c.isSuporte ? -1 : 0)) || (a.i - b.i))
      .map(x => x.c)
      .filter(c => {
        // Busca pelo nome da empresa, pela categoria ou por qualquer mensagem.
        const q = normalizarTexto(filterQuery);
        if (!q) return true;
        return normalizarTexto(c.name).includes(q)
          || normalizarTexto(c.category).includes(q)
          || normalizarTexto(c.lastMessage).includes(q)
          || (c.messages || []).some(m => normalizarTexto(m.text).includes(q));
      });

    if (filtered.length === 0) {
      list.innerHTML = '<div class="p-6 text-center text-xs text-zinc-400">Nenhuma conversa encontrada.</div>';
      return;
    }

    filtered.forEach(conv => {
      const isActive = conv.id === activeB2BConversationId;
      const item = document.createElement('div');
      item.className = `conv-item p-3.5 flex items-start gap-3 cursor-pointer transition-colors ${
        isActive ? 'is-ativa bg-[#EBF4FF] border-l-4 border-[#537bae]' : 'hover:bg-zinc-200/50 border-l-4 border-transparent'
      }`;

      item.innerHTML = `
        <div class="relative flex-shrink-0">
          <img src="${conv.avatar}" alt="${conv.name}" class="w-10 h-10 rounded-xl chat-avatar-quadrado ${classeAvatarChat(conv.avatar)} border border-zinc-200">
          ${conv.online ? '<span class="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-white"></span>' : ''}
        </div>
        <div class="flex-1 min-w-0">
          <div class="flex items-center justify-between gap-1 mb-0.5">
            <div class="flex items-center gap-1.5 min-w-0">
              <h4 class="text-xs sm:text-sm font-medium ${isActive ? 'text-[#416799] font-semibold' : 'text-zinc-900'} truncate">${conv.name}</h4>
            </div>
            <span class="conv-item-canto">
              <span class="conv-item-hora text-[10px] text-zinc-400">${conv.time}</span>
              ${conv.isSuporte ? '' : `<button type="button" class="conv-item-mais" data-conv-menu aria-label="Mais opções da conversa">${ICONE_CONVERSA_MAIS}</button>`}
            </span>
          </div>
          <div class="flex items-center justify-between gap-2">
            <p class="text-xs ${conv.unread > 0 ? 'text-zinc-900 font-bold' : 'text-zinc-500'} truncate leading-tight ${outroEstaDigitando(conv) ? 'chat-previa-digitando' : ''}">${escaparHtml(outroEstaDigitando(conv) ? 'Digitando…' : conv.lastMessage)}</p>
            ${conv.unread > 0 ? `<span class="chat-unread-count" aria-label="${conv.unread} não lidas">${conv.unread > 99 ? '99+' : conv.unread}</span>` : ''}
          </div>
        </div>
      `;

      item.querySelector('[data-conv-menu]')?.addEventListener('click', (e) => {
        e.stopPropagation();
        if (document.querySelector('.conv-menu') && item.classList.contains('menu-aberto')) { fecharMenuConversa(); return; }
        abrirMenuConversa(/** @type {HTMLElement} */ (e.currentTarget), conv);
      });

      item.addEventListener('click', () => {
        activeB2BConversationId = conv.id;
        conv.unread = 0;
        renderB2BChat();
      });

      list.appendChild(item);
    });
  }

  function renderB2BChatMessages() {
    const container = document.getElementById('b2b-chat-messages-container');
    const nameEl = document.getElementById('b2b-chat-active-name');
    const statusEl = document.getElementById('b2b-chat-active-status');
    const avatarEl = document.getElementById('b2b-chat-active-avatar');
    if (!container) return;

    const activeConv = b2bConversationsData.find(c => c.id === activeB2BConversationId) || b2bConversationsData[0];
    if (!activeConv) {
      container.innerHTML = '<div class="flex items-center justify-center h-full text-sm text-zinc-400">Nenhuma conversa selecionada.</div>';
      if (nameEl) nameEl.textContent = '';
      if (statusEl) statusEl.textContent = '';
      return;
    }
    activeB2BConversationId = activeConv.id;

    if (nameEl) {
      // Só o nome da empresa (sem a categoria ao lado).
      nameEl.textContent = activeConv.name;
    }
    if (statusEl) statusEl.textContent = activeConv.isSuporte ? 'Respondemos o quanto antes' : (activeConv.online ? 'Online agora' : '');
    if (avatarEl) {
      avatarEl.src = activeConv.avatar;
      const padrao = activeConv.avatar === LOVE_AVATAR_PADRAO;
      avatarEl.classList.toggle('object-contain', padrao);
      avatarEl.classList.toggle('p-1.5', padrao);
      avatarEl.classList.toggle('bg-white', padrao);
      avatarEl.classList.toggle('object-cover', !padrao);
    }

    container.innerHTML = `
      <div class="flex justify-center my-2">
        <span class="px-3 py-1 bg-white border border-zinc-200 text-zinc-400 text-[11px] rounded-full shadow-2xs">Hoje</span>
      </div>
    `;

    activeConv.messages.forEach(msg => {
      const isMe = msg.sender === 'me';
      const row = document.createElement('div');
      row.className = `flex items-end gap-2.5 ${isMe ? 'justify-end' : 'justify-start'} animate-fade-in`;

      let attachmentHTML = '';
      if (msg.attachment) {
        if (msg.attachment.type === 'image') {
          attachmentHTML = `
            <div class="mt-2 rounded-xl overflow-hidden max-w-xs border border-white/20 shadow-xs cursor-pointer">
              <img src="${msg.attachment.url}" alt="${msg.attachment.name || 'Foto'}" class="w-full h-auto object-cover max-h-56 hover:scale-102 transition-transform">
            </div>
          `;
        } else {
          attachmentHTML = `
            <div class="mt-2 inline-flex items-center gap-2.5 px-3 py-2 rounded-xl ${isMe ? 'bg-white/15' : 'bg-zinc-100'} border border-zinc-200/50 text-xs">
              <span class="text-base">📄</span>
              <div class="min-w-0">
                <p class="font-medium truncate max-w-[170px]">${msg.attachment.name || 'Arquivo'}</p>
                ${msg.attachment.size ? `<span class="text-[10px] opacity-75">${msg.attachment.size}</span>` : ''}
              </div>
            </div>
          `;
        }
      }

      // Minhas mensagens: ⋮ (na vertical) com Editar e Copiar. As do
      // fornecedor: só o ícone de copiar. Os dois centralizados na bolha.
      let menuHtml = '';
      if (msg.id && msg.text && isMe) {
        menuHtml = `
          <div class="chat-msg-acoes is-minha">
            <button type="button" class="chat-msg-mais" title="Mais opções" aria-label="Mais opções"><svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="12" cy="5" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="12" cy="19" r="2"/></svg></button>
            <div class="chat-msg-menu hidden">
              ${msg.editedAt ? '' : '<button type="button" class="chat-msg-opcao chat-msg-editar">Editar</button>'}
              <button type="button" class="chat-msg-opcao chat-msg-copiar">Copiar</button>
            </div>
          </div>`;
      } else if (msg.id && msg.text) {
        menuHtml = `
          <div class="chat-msg-acoes">
            <button type="button" class="chat-msg-mais chat-msg-copiar-direto" title="Copiar mensagem" aria-label="Copiar mensagem"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/></svg></button>
          </div>`;
      }
      row.dataset.msgId = msg.id || '';

      if (isMe) {
        row.innerHTML = `
          <div class="max-w-[80%] sm:max-w-[70%] space-y-1 text-right">
            <div class="flex items-center justify-end gap-2">
              ${menuHtml}
              <div class="chat-bubble-user-glass p-3.5 rounded-2xl rounded-br-xs text-xs sm:text-sm leading-relaxed text-left min-w-0">
                ${msg.text ? `<p class="chat-msg-texto whitespace-pre-wrap break-words">${escaparHtml(msg.text)}</p>` : ''}
                ${attachmentHTML}
              </div>
            </div>
            <div class="flex items-center justify-end gap-1 text-[10px] text-zinc-400 pr-1">
              ${msg.editedAt ? '<span>(editado)</span>' : ''}
              <span>${msg.time || 'Agora'}</span>
              <span class="text-[#537bae] font-bold">✓✓</span>
            </div>
          </div>
          ${meuAvatarDoChatHtml()}
        `;
      } else {
        row.innerHTML = `
          <img src="${activeConv.avatar}" alt="${activeConv.name}" class="w-7 h-7 rounded-lg chat-avatar-quadrado ${classeAvatarChat(activeConv.avatar)} flex-shrink-0 border border-zinc-200 mb-4">
          <div class="max-w-[80%] sm:max-w-[70%] space-y-1">
            <div class="flex items-center gap-2">
              <div class="bg-white border border-zinc-200/80 text-zinc-800 p-3.5 rounded-2xl rounded-bl-xs text-xs sm:text-sm leading-relaxed shadow-2xs min-w-0">
                ${msg.text ? `<p class="chat-msg-texto whitespace-pre-wrap break-words">${escaparHtml(msg.text)}</p>` : ''}
                ${attachmentHTML}
              </div>
              ${menuHtml}
            </div>
            <span class="text-[10px] text-zinc-400 pl-1 block">${msg.editedAt ? '(editado) ' : ''}${msg.time || 'Agora'}</span>
          </div>
        `;
      }

      container.appendChild(row);
    });

    // Suporte Love "digitando…": três bolinhas na vez dele.
    if (activeConv.digitando || outroEstaDigitando(activeConv)) {
      const row = document.createElement('div');
      row.className = 'flex items-end gap-2.5 justify-start';
      row.innerHTML = `
        <img src="${activeConv.avatar}" alt="${activeConv.name}" class="w-7 h-7 rounded-lg chat-avatar-quadrado ${classeAvatarChat(activeConv.avatar)} flex-shrink-0 border border-zinc-200">
        <div class="chat-digitando" role="status" aria-label="${escaparHtml(activeConv.name)} está digitando"><span></span><span></span><span></span></div>`;
      container.appendChild(row);
    }

    container.scrollTop = container.scrollHeight;
  }

  // Nome da empresa no cabeçalho do chat: abre a página da empresa (Explorar).
  (function ligarNomeDaEmpresaNoChat() {
    const nameEl = document.getElementById('b2b-chat-active-name');
    if (!nameEl) return;
    const abrir = async () => {
      const conv = b2bConversationsData.find(c => c.id === activeB2BConversationId);
      if (!conv || !conv.fornecedorId) return;
      try { if (!b2bFornecedoresCarregados) await carregarFornecedoresVitrine(); } catch (e) { console.error('[chat] vitrine:', e); }
      const item = encontrarFornecedorExplorar(conv.fornecedorId);
      if (!item) return;
      switchB2BView('explore');
      openB2BVendorProfile(item, null);
    };
    nameEl.addEventListener('click', abrir);
    nameEl.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); abrir(); } });
  })();

  // ⋯ da mensagem: Editar (só as minhas) e Copiar. Editar troca o texto da
  // bolha por um campo; Salvar grava em messages (edited_at) e redesenha.
  (function ligarMenuDasMensagens() {
    const container = document.getElementById('b2b-chat-messages-container');
    if (!container) return;
    const fecharMenus = () => container.querySelectorAll('.chat-msg-menu').forEach(m => m.classList.add('hidden'));
    document.addEventListener('click', (e) => { if (!e.target.closest('.chat-msg-acoes')) fecharMenus(); });

    container.addEventListener('click', async (e) => {
      const copiarDireto = e.target.closest('.chat-msg-copiar-direto');
      if (copiarDireto) {
        const rowC = copiarDireto.closest('[data-msg-id]');
        const convC = b2bConversationsData.find(c => c.id === activeB2BConversationId);
        const msgC = convC && rowC && convC.messages.find(m => m.id === rowC.dataset.msgId);
        const textoC = (msgC && msgC.text) || rowC?.querySelector('.chat-msg-texto')?.textContent || '';
        try { await navigator.clipboard.writeText(textoC); } catch (err) { window.prompt('Copie a mensagem:', textoC); }
        return;
      }
      const mais = e.target.closest('.chat-msg-mais');
      if (mais) {
        const menu = mais.nextElementSibling;
        const aberto = !menu.classList.contains('hidden');
        fecharMenus();
        if (!aberto) menu.classList.remove('hidden');
        return;
      }
      const row = e.target.closest('[data-msg-id]');
      if (!row) return;
      const conv = b2bConversationsData.find(c => c.id === activeB2BConversationId);
      const msg = conv && conv.messages.find(m => m.id === row.dataset.msgId);
      if (!msg) return;

      if (e.target.closest('.chat-msg-copiar')) {
        fecharMenus();
        try { await navigator.clipboard.writeText(msg.text || ''); } catch (err) { window.prompt('Copie a mensagem:', msg.text || ''); }
        return;
      }

      if (e.target.closest('.chat-msg-editar')) {
        fecharMenus();
        // Só uma edição por mensagem.
        if (msg.editedAt) return;
        const p = row.querySelector('.chat-msg-texto');
        if (!p || row.querySelector('.chat-msg-editor')) return;
        const editor = document.createElement('div');
        editor.className = 'chat-msg-editor';
        editor.innerHTML = `
          <textarea class="chat-msg-editor-campo" rows="3"></textarea>
          <div class="chat-msg-editor-botoes">
            <button type="button" class="chat-msg-editor-salvar">Salvar</button>
            <button type="button" class="chat-msg-editor-cancelar">Cancelar</button>
          </div>
          <p class="chat-msg-editor-erro hidden"></p>`;
        editor.querySelector('textarea').value = msg.text || '';
        p.replaceWith(editor);
        const campo = editor.querySelector('textarea');
        campo.focus();
        campo.setSelectionRange(campo.value.length, campo.value.length);
        campo.addEventListener('keydown', (ev) => {
          if (ev.key === 'Escape') { ev.preventDefault(); renderB2BChatMessages(); }
          if (ev.key === 'Enter' && !ev.shiftKey) { ev.preventDefault(); editor.querySelector('.chat-msg-editor-salvar').click(); }
        });
        return;
      }

      if (e.target.closest('.chat-msg-editor-cancelar')) { renderB2BChatMessages(); return; }

      const salvar = e.target.closest('.chat-msg-editor-salvar');
      if (salvar) {
        const editor = row.querySelector('.chat-msg-editor');
        const campo = editor.querySelector('textarea');
        const erro = editor.querySelector('.chat-msg-editor-erro');
        const novo = campo.value.trim();
        if (!novo) { erro.textContent = 'A mensagem não pode ficar vazia.'; erro.classList.remove('hidden'); return; }
        if (novo === (msg.text || '').trim()) { renderB2BChatMessages(); return; }
        salvar.disabled = true;
        const quando = new Date().toISOString();
        const { error } = await supabaseClient.from('messages').update({ text: novo, edited_at: quando }).eq('id', msg.id);
        salvar.disabled = false;
        if (error) {
          console.error('[chat] editar mensagem:', error);
          erro.textContent = /já foi editada/i.test(error.message || '') ? 'Esta mensagem já foi editada uma vez e não pode ser editada de novo.'
            : /column|edited_at|policy|permission/i.test(error.message || '') ? 'Edição ainda não liberada no banco (migration 057).' : 'Não foi possível salvar agora. Tente de novo.';
          erro.classList.remove('hidden');
          return;
        }
        msg.text = novo;
        msg.editedAt = quando;
        if (conv.messages[conv.messages.length - 1] === msg) conv.lastMessage = novo;
        renderB2BChatMessages();
      }
    });
  })();

  // Avatar das minhas mensagens no chat: a foto da conta ou as iniciais do
  // nome (ex.: VM) no mesmo estilo do Hub B2B (quadrado, azul-claro).
  function meuAvatarDoChatHtml() {
    const perfil = window.loveClienteProfile || {};
    const foto = perfil.avatar_url;
    const conteudo = foto
      ? `<img src="${escaparHtml(foto)}" alt="" class="w-full h-full object-cover">`
      : `<span class="chat-avatar-iniciais">${escaparHtml(iniciaisDaConta(perfil))}</span>`;
    return `<span class="w-7 h-7 rounded-lg chat-avatar-quadrado flex-shrink-0 border border-zinc-200 overflow-hidden mb-4 inline-flex">${conteudo}</span>`;
  }

  document.getElementById('b2b-chat-search')?.addEventListener('input', (e) => {
    renderB2BChatContacts(/** @type {HTMLInputElement} */ (e.target).value);
  });

  function initB2BChatHandlers() {
    const chatForm = document.getElementById('b2b-chat-form');
    const chatInput = document.getElementById('b2b-chat-input');
    const chatAttachBtn = document.getElementById('b2b-chat-attach-btn');
    const chatFileInput = document.getElementById('b2b-chat-file-input');
    const newConvBtn = document.getElementById('b2b-new-conversation-btn');
    const newConvPicker = document.getElementById('b2b-new-conversation-picker');

    if (chatAttachBtn && chatFileInput && !chatAttachBtn.dataset.bound) {
      chatAttachBtn.dataset.bound = "true";
      chatAttachBtn.addEventListener('click', (e) => {
        e.preventDefault();
        chatFileInput.click();
      });

      chatFileInput.addEventListener('change', (e) => {
        const file = e.target.files && e.target.files[0];
        if (!file) return;

        const convId = activeB2BConversationId || (b2bConversationsData[0] && b2bConversationsData[0].id);
        if (!convId) return;

        if (file.type.startsWith('image/')) {
          const reader = new FileReader();
          reader.onload = (evt) => {
            window.LoveChatService.sendMessage(convId, '', undefined, {
              type: 'image',
              name: file.name,
              url: evt.target.result
            });
            showToast(`Foto "${file.name}" enviada no chat!`, '📷');
          };
          reader.readAsDataURL(file);
        } else {
          window.LoveChatService.sendMessage(convId, `Documento compartilhado: ${file.name}`, undefined, {
            type: 'file',
            name: file.name
          });
          showToast(`Arquivo "${file.name}" compartilhado!`, '📎');
        }
        chatFileInput.value = '';
      });
    }

    if (chatForm && !chatForm.dataset.bound) {
      chatForm.dataset.bound = "true";

      // Digitando numa conversa com fornecedor: avisa o outro lado (Hub).
      chatInput?.addEventListener('input', () => {
        if (chatInput.value.trim() && activeB2BConversationId !== SUPORTE_CONV_ID) avisarQueEstouDigitando();
      });

      // Envio único: vários Enter seguidos mandam a mensagem uma vez só. O
      // campo esvazia na hora e fica travado até o envio terminar; se der
      // erro, o texto volta para o campo.
      let enviandoMensagem = false;
      chatForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!chatInput || enviandoMensagem) return;
        const text = chatInput.value.trim();
        if (!text) return;

        const convId = activeB2BConversationId || (b2bConversationsData[0] && b2bConversationsData[0].id);
        if (!convId) return;

        enviandoMensagem = true;
        chatInput.value = '';
        try {
          const ok = await window.LoveChatService.sendMessage(convId, text);
          if (!ok && !chatInput.value) chatInput.value = text;
        } finally {
          enviandoMensagem = false;
        }
      });
    }

    if (newConvBtn && newConvPicker && !newConvBtn.dataset.bound) {
      newConvBtn.dataset.bound = "true";

      newConvBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const willShow = newConvPicker.classList.contains('hidden');
        if (!willShow) { newConvPicker.classList.add('hidden'); return; }

        newConvPicker.innerHTML = '<div class="p-4 text-center text-xs text-zinc-400">Carregando fornecedores...</div>';
        newConvPicker.classList.remove('hidden');

        // Fornecedores da vitrine (com serviços, favoritos e avaliações):
        // primeiro os favoritados que ainda não têm conversa, depois os mais
        // bem avaliados.
        let fornecedores = [];
        try {
          fornecedores = await carregarFornecedoresVitrine();
        } catch (err) { console.error('[chat] fornecedores:', err); }
        if (!fornecedores || !fornecedores.length) {
          newConvPicker.innerHTML = '<div class="p-4 text-center text-xs text-zinc-400">Nenhum fornecedor cadastrado ainda.</div>';
          return;
        }
        const ordenados = ordenarFornecedoresParaNovaConversa(fornecedores, b2bFavoritosIds, b2bConversationsData);

        newConvPicker.innerHTML = ordenados.map(f => `
          <button type="button" data-fornecedor-id="${f.id}" class="w-full flex items-center gap-2.5 p-3 hover:bg-zinc-50 text-left border-b border-zinc-100 last:border-0">
            <img src="${escaparHtml(f.avatar || avatarComIniciais(f.name))}" class="w-8 h-8 rounded-lg chat-avatar-quadrado object-cover border border-zinc-200" alt="">
            <span class="min-w-0 flex-1">
              <span class="text-xs font-medium text-zinc-800 truncate block">${escaparHtml(f.name)}</span>
              <span class="text-[10px] text-zinc-400 block">${f.favoritoSemConversa ? '♥ Favorito' : (f.avaliacaoTotal ? `★ ${Number(f.avaliacaoMedia).toFixed(1)} (${f.avaliacaoTotal})` : '')}</span>
            </span>
          </button>
        `).join('');

        newConvPicker.querySelectorAll('[data-fornecedor-id]').forEach(btn => {
          btn.addEventListener('click', async () => {
            newConvPicker.classList.add('hidden');
            await window.LoveChatService.openConversationWithFornecedor(btn.dataset.fornecedorId);
          });
        });
      });

      document.addEventListener('click', (e) => {
        if (!newConvPicker.contains(e.target) && e.target !== newConvBtn) {
          newConvPicker.classList.add('hidden');
        }
      });
    }
  }

  // ==========================================
  // 12. INFORMAÇÕES & MEU EVENTO
  // ==========================================
  function switchInfoSubSection(subId, label) {
    const badge = document.getElementById('info-active-sub-badge');
    const title = document.getElementById('info-active-sub-title');
    if (badge) badge.textContent = label || 'Meu evento';
    if (title) title.textContent = label || 'Meu evento';

    document.querySelectorAll('.info-sub-panel').forEach(p => p.classList.add('hidden'));
    const target = document.getElementById(`info-panel-${subId}`);
    if (target) target.classList.remove('hidden');

    if (subId === 'my-event') {
      renderInfoEventPage();
    }
  }

  function renderInfoEventPage() {
    const activeEvent = getActiveEvent();
    const urlEl = document.getElementById('info-event-public-url');
    const nameInput = document.getElementById('info-event-name-input');
    if (urlEl) urlEl.textContent = activeEvent.publicUrl || `https://love.com.br/${activeEvent.slug}`;
    if (nameInput) nameInput.value = activeEvent.title;
  }

  // Salvar novo nome do evento principal em "Meu Evento"
  const btnSaveInfoName = document.getElementById('btn-save-info-event-name');
  const infoNameInput = document.getElementById('info-event-name-input');
  if (btnSaveInfoName && infoNameInput) {
    btnSaveInfoName.addEventListener('click', () => {
      const val = infoNameInput.value.trim();
      if (!val) return;
      salvarComRetornoNoBotao(btnSaveInfoName, () => {
        const activeEvent = getActiveEvent();
        activeEvent.title = val;
        updateAllCelebrationData();
        renderEventsSwitcher();
        return persistirEventoAtivo();
      });
    });
  }

  // Botão Ver Site Público dentro de "Meu Evento"
  const btnInfoOpenPublic = document.getElementById('btn-info-open-public');
  if (btnInfoOpenPublic) {
    btnInfoOpenPublic.addEventListener('click', (e) => {
      e.preventDefault();
      const activeEvent = getActiveEvent();
      if (!activeEvent || !activeEvent.slug) return;
      window.open(activeEvent.publicUrl || `/${encodeURIComponent(activeEvent.slug)}`, '_blank', 'noopener');
    });
  }

  // Abrir Modal de Deletar Evento com dados dinâmicos
  const btnTriggerDelete = document.getElementById('btn-trigger-delete-event');
  if (btnTriggerDelete) {
    btnTriggerDelete.addEventListener('click', () => {
      const activeEvent = getActiveEvent();
      const confirmedCount = (activeEvent.adultosConfirmados || 0) + (activeEvent.criancasConfirmadas || 0) || activeEvent.convidadosConfirmados || 185;
      const giftsCount = activeEvent.presentesRecebidos || activeEvent.giftList?.length || 48;

      const countConfEl = document.getElementById('delete-modal-confirmed-count');
      const countGiftsEl = document.getElementById('delete-modal-gifts-count');
      if (countConfEl) countConfEl.textContent = confirmedCount;
      if (countGiftsEl) countGiftsEl.textContent = giftsCount;

      openModal(elements.modals.deleteEvent);
    });
  }

  /**
   * Exclui um evento criado por esta conta: marca eventos.deleted_at (o
   * evento some para o anfitrião e do site, mas o Admin continua vendo —
   * "Excluído pelo criador" — e pode restaurar). Sem nenhum evento sobrando,
   * volta para "Crie seu primeiro evento" com o menu lateral travado.
   * @param {string} id
   * @returns {Promise<string|null>} mensagem de erro ou null
   */
  async function excluirEventoDoCriador(id) {
    if (ehUuid(id)) {
      const { error } = await supabaseClient.from('eventos').update({ deleted_at: new Date().toISOString() }).eq('id', id);
      if (error) { console.error('Erro ao excluir evento:', error); return 'Não foi possível excluir o evento agora. Tente de novo.'; }
    }
    state.events = state.events.filter(e => e.id !== id);
    const proprios = state.events.filter(e => !e.souOrganizador);
    if (!state.events.length) {
      definirEventoAtivo(null);
      setSidebarLocked(true);
      renderEventsSwitcher();
      // Topo sem o nome do evento que acabou de sair.
      if (elements.dashHeader.eventTitle) elements.dashHeader.eventTitle.textContent = 'Nenhum evento';
      if (elements.dashHeader.countdownBadge) elements.dashHeader.countdownBadge.textContent = '';
      if (window.location.pathname !== '/') history.replaceState({}, '', '/');
      document.title = 'Love - Event OS & Lista de Presentes';
      openCreateEventPage(true, false);
      return null;
    }
    if (state.activeEventId === id || !state.events.some(e => e.id === state.activeEventId)) {
      definirEventoAtivo((proprios[0] || state.events[0]).id);
      if (typeof window.reloadBuilderStateForActiveEvent === 'function') window.reloadBuilderStateForActiveEvent();
    }
    updateAllCelebrationData();
    renderEventsSwitcher();
    return null;
  }

  // Configurações › abas "Minha conta" / "Meus eventos".
  function mostrarAbaDeConfiguracoes(aba) {
    document.querySelectorAll('#config-abas [data-config-aba]').forEach(b => b.classList.toggle('active', b.dataset.configAba === aba));
    // Submenu lateral acompanha a aba (quando a troca vem de outro lugar).
    if (state.currentTab === 'tab-account-settings') {
      elements.drawerSubItemsList?.querySelectorAll('[data-pagina-item]').forEach(b => b.classList.toggle('active', /** @type {HTMLElement} */ (b).dataset.paginaItem === aba));
    }
    document.getElementById('config-painel-conta')?.classList.toggle('hidden', aba !== 'conta');
    document.getElementById('config-painel-eventos')?.classList.toggle('hidden', aba !== 'eventos');
    document.getElementById('btn-save-user-settings')?.classList.toggle('hidden', aba !== 'conta');
    if (aba === 'eventos') renderMeusEventos();
  }
  document.querySelectorAll('#config-abas [data-config-aba]').forEach(b => b.addEventListener('click', () => mostrarAbaDeConfiguracoes(b.dataset.configAba)));

  const TIPOS_DE_EVENTO = { wedding: 'Casamento', birthday: 'Aniversário', anniversary: 'Bodas', baby_shower: 'Chá de bebê', baby: 'Chá de bebê', bridal_shower: 'Chá de panela', gender_reveal: 'Chá revelação', corporate: 'Corporativo', other: 'Outro' };
  const eventosSelecionados = new Set();

  // Lixeira e contagem acompanham os checks (como em Meus convidados).
  function atualizarLixeiraDeEventos() {
    const checks = Array.from(document.querySelectorAll('#config-lista-eventos .config-evento-check'));
    const ids = new Set(checks.map(c => /** @type {HTMLInputElement} */ (c).value));
    [...eventosSelecionados].forEach(id => { if (!ids.has(id)) eventosSelecionados.delete(id); });
    const qtd = eventosSelecionados.size;
    const btn = document.getElementById('btn-config-eventos-excluir');
    if (btn) {
      btn.classList.toggle('hidden', qtd === 0);
      btn.title = qtd === 1 ? 'Excluir 1 evento selecionado' : `Excluir ${qtd} eventos selecionados`;
    }
    const contagem = document.getElementById('config-eventos-count');
    if (contagem) contagem.textContent = qtd ? `(${qtd})` : '';
    const todos = /** @type {HTMLInputElement|null} */ (document.getElementById('config-eventos-select-all'));
    if (todos) {
      const marcados = checks.filter(c => /** @type {HTMLInputElement} */ (c).checked).length;
      todos.checked = checks.length > 0 && marcados === checks.length;
      todos.indeterminate = marcados > 0 && marcados < checks.length;
    }
  }

  // Barra da tabela (busca + lixeira), montada uma vez.
  function montarTabelaDeEventos() {
    const tabela = document.getElementById('config-eventos-tabela');
    if (!tabela || tabela.dataset.barraMontada) return;
    const lixeira = document.createElement('button');
    lixeira.type = 'button';
    lixeira.id = 'btn-config-eventos-excluir';
    lixeira.className = 'love-tabela-lixeira hidden';
    lixeira.innerHTML = '<svg stroke-linejoin="round" stroke-linecap="round" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M4 6.5h16"/><path d="M9 6.5V4.5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/><path d="M6.5 9.5V18a3 3 0 0 0 3 3h5a3 3 0 0 0 3-3V9.5"/><path d="M10.5 11v5.5M13.5 11v5.5"/></svg>';
    montarBarraDaTabela(tabela, { caixa: document.getElementById('config-eventos-caixa'), placeholder: 'Buscar evento...', nome: 'eventos', extras: [lixeira] });
    lixeira.addEventListener('click', async () => {
      const ids = [...eventosSelecionados];
      if (!ids.length || lixeira.disabled) return;
      const nomes = ids.map(id => { const e = state.events.find(x => x.id === id); return e ? `"${e.title}"` : ''; }).filter(Boolean).join(', ');
      const ok = await confirmarNaLove({
        titulo: ids.length === 1 ? `Excluir ${nomes}?` : `Excluir ${ids.length} eventos?`,
        texto: 'O evento sai da sua conta e o site dele deixa de ficar no ar. Convidados, presentes e o histórico continuam guardados: se foi sem querer, fale com o suporte da Love para recuperar.',
        botao: ids.length === 1 ? 'Excluir evento' : 'Excluir eventos',
        aoConfirmar: async () => {
          for (const id of ids) {
            const erro = await excluirEventoDoCriador(id);
            if (erro) return erro;
            eventosSelecionados.delete(id);
          }
          return null;
        }
      });
      if (ok && state.events.length) renderMeusEventos();
    });
    document.getElementById('config-eventos-select-all')?.addEventListener('change', (e) => {
      const marcar = /** @type {HTMLInputElement} */ (e.target).checked;
      document.querySelectorAll('#config-lista-eventos tr:not(.hidden) .config-evento-check').forEach(c => {
        const check = /** @type {HTMLInputElement} */ (c);
        check.checked = marcar;
        if (marcar) eventosSelecionados.add(check.value); else eventosSelecionados.delete(check.value);
      });
      atualizarLixeiraDeEventos();
    });
    tabela.addEventListener('change', (e) => {
      const check = /** @type {HTMLInputElement|null} */ (/** @type {Element} */ (e.target).closest('.config-evento-check'));
      if (!check) return;
      if (check.checked) eventosSelecionados.add(check.value); else eventosSelecionados.delete(check.value);
      atualizarLixeiraDeEventos();
    });
  }

  function renderMeusEventos() {
    const lista = document.getElementById('config-lista-eventos');
    if (!lista) return;
    montarTabelaDeEventos();
    const meus = state.events.filter(e => !e.souOrganizador && e.id !== 'nova-comemoracao');
    if (!meus.length) {
      lista.innerHTML = '<tr><td colspan="4" class="text-sm text-zinc-500">Você ainda não tem eventos.</td></tr>';
      atualizarLixeiraDeEventos();
      return;
    }
    lista.innerHTML = meus.map(e => {
      const data = e.date ? (formatEventDateLong(e.date) || e.date) : 'Data a definir';
      const aberto = e.id === state.activeEventId;
      return `
        <tr data-evento-id="${escaparHtml(e.id)}">
          <td><span class="inline-flex items-center gap-4"><input type="checkbox" value="${escaparHtml(e.id)}" class="gifts-select-all-check config-evento-check"${eventosSelecionados.has(e.id) ? ' checked' : ''} aria-label="Selecionar ${escaparHtml(e.title || 'evento')}"><span class="font-semibold text-zinc-900">${escaparHtml(e.title || 'Evento')}</span></span></td>
          <td class="text-zinc-600">${escaparHtml(TIPOS_DE_EVENTO[e.type] || 'Evento')}</td>
          <td class="text-zinc-600">${escaparHtml(data)}</td>
          <td>${aberto ? '<span class="meus-eventos-atual">Evento aberto</span>' : '<span class="text-zinc-400">—</span>'}</td>
        </tr>`;
    }).join('');
    atualizarLixeiraDeEventos();
  }

  // Confirmar Exclusão do Evento
  const btnConfirmDelete = document.getElementById('btn-confirm-delete-event');
  if (btnConfirmDelete) {
    btnConfirmDelete.addEventListener('click', async () => {
      const deletedId = state.activeEventId;
      const deletedEvent = getActiveEvent();

      const erro = await excluirEventoDoCriador(deletedId);
      if (erro) { showToast(erro, '⚠️'); return; }
      closeModal(elements.modals.deleteEvent);
      if (state.events.length) switchRailTab('edit-site');
      showToast(`O evento "${deletedEvent.title}" foi cancelado e excluído com sucesso.`, '🗑️');
    });
  }

  // ==========================================
  // 13. MINHA CONTA & NOTIFICAÇÕES
  // ==========================================
  const btnUserAccount = document.getElementById('btn-user-account-menu');
  const dropdownUserAccount = document.getElementById('dropdown-user-account');
  const btnNotifications = document.getElementById('btn-notifications-menu');
  const btnProfileData = document.getElementById('btn-account-profile-data');
  const btnAccountSettings = document.getElementById('btn-account-settings');
  const btnAccountLogout = document.getElementById('btn-account-logout');

  // Minha Conta Dropdown
  if (btnUserAccount && dropdownUserAccount) {
    btnUserAccount.addEventListener('click', (e) => {
      e.stopPropagation();
      dropdownUserAccount.classList.toggle('hidden');
    });
  }

  // Botão Mensagens/Chat no Header Superior (Direciona para o Chat B2B)
  const btnHeaderChat = document.getElementById('btn-dash-header-chat');
  if (btnHeaderChat) {
    btnHeaderChat.addEventListener('click', (e) => {
      e.preventDefault();
      dropdownUserAccount?.classList.add('hidden');
      // Já entra com /fornecedores/chat (uma entrada só no histórico).
      pendingSubItemId = 'messages';
      switchRailTab('b2b');
      switchB2BView('messages');
    });
  }

  // Sino de notificações: abre a página própria (ver openNotificationsPage).
  if (btnNotifications) {
    btnNotifications.addEventListener('click', (e) => {
      e.stopPropagation();
      dropdownUserAccount?.classList.add('hidden');
      openNotificationsPage();
    });
  }

  // Fecha o dropdown de Minha Conta ao clicar fora
  document.addEventListener('click', (e) => {
    if (btnUserAccount && dropdownUserAccount && !btnUserAccount.contains(e.target) && !dropdownUserAccount.contains(e.target)) {
      dropdownUserAccount.classList.add('hidden');
    }
  });

  // Handlers dos itens do Dropdown Minha Conta
  const btnPreviewSite = document.getElementById('btn-account-preview-site');
  if (btnPreviewSite) {
    btnPreviewSite.addEventListener('click', () => {
      dropdownUserAccount?.classList.add('hidden');
      const activeEvent = getActiveEvent();
      window.open(activeEvent.publicUrl || `https://love.com.br/${activeEvent.slug}`, '_blank');
    });
  }

  const btnAccountWallet = document.getElementById('btn-account-wallet');
  if (btnAccountWallet) {
    btnAccountWallet.addEventListener('click', () => {
      dropdownUserAccount?.classList.add('hidden');
      document.querySelector('[data-rail-tab="wallet"]')?.click();
    });
  }

  // Configurações e Dúvidas são páginas próprias (/configuracoes, /central-de-ajuda).
  if (btnProfileData) {
    btnProfileData.addEventListener('click', () => {
      dropdownUserAccount?.classList.add('hidden');
      openAccountSettingsPage();
    });
  }

  const btnLeaveSuggestion = document.getElementById('btn-account-leave-suggestion');
  if (btnLeaveSuggestion) {
    btnLeaveSuggestion.addEventListener('click', () => {
      dropdownUserAccount?.classList.add('hidden');
      showToast('Obrigado pela sua sugestão! Envie diretamente pelo nosso WhatsApp ou e-mail.', '💡');
    });
  }

  const btnContactSupport = document.getElementById('btn-account-contact-support');
  if (btnContactSupport) {
    btnContactSupport.addEventListener('click', () => {
      dropdownUserAccount?.classList.add('hidden');
      // Abre o Chat já na conversa fixa Suporte Love.
      activeB2BConversationId = SUPORTE_CONV_ID;
      pendingSubItemId = 'messages';
      switchRailTab('b2b'); // sai de páginas como Central de ajuda/Configurações
      activeB2BConversationId = SUPORTE_CONV_ID;
      switchB2BView('messages');
      renderB2BChat();
      setTimeout(() => document.getElementById('b2b-chat-input')?.focus(), 300);
    });
  }

  const btnAccountFaq = document.getElementById('btn-account-faq');
  if (btnAccountFaq) {
    btnAccountFaq.addEventListener('click', () => {
      dropdownUserAccount?.classList.add('hidden');
      openFaqPage();
    });
  }

  const btnManageEvents = document.getElementById('btn-account-manage-events');
  if (btnManageEvents) {
    btnManageEvents.addEventListener('click', () => {
      dropdownUserAccount?.classList.add('hidden');
      const switcher = document.getElementById('btn-event-switcher');
      if (switcher) switcher.click();
    });
  }

  // ==========================================
  // 14. MODAL ADICIONAR / EDITAR LOCAL DO EVENTO
  // ==========================================
  const modalAddVenue = document.getElementById('modal-add-venue');
  const btnOpenVenueModal = document.getElementById('dash-hub-event-location-badge');
  const btnSaveVenue = document.getElementById('btn-modal-save-venue');
  const btnNoVenueYet = document.getElementById('btn-modal-no-venue-yet');
  const inputVenue = document.getElementById('modal-venue-input');

  // Local já definido: o que vai no mapa (nome do lugar + endereço + cidade/UF).
  function buscaDoLocalNoMapa(ev) {
    const d = (ev && ev.eventDetails) || {};
    const nome = String((typeof d.locationName === 'string' ? d.locationName : (ev && ev.location !== 'Adicionar Local' ? ev.location : '')) || '').trim();
    const cidade = [String(d.city || '').trim(), String(d.state || '').trim().toUpperCase()].filter(Boolean).join(' - ');
    return [nome, String(d.address || '').trim(), cidade].filter(Boolean).join(', ');
  }

  /** @param {string} busca */
  function mostrarMapaDoLocal(busca) {
    const mapa = /** @type {HTMLIFrameElement|null} */ (document.getElementById('modal-venue-mapa'));
    if (!mapa) return;
    if (!busca) { mapa.classList.add('hidden'); mapa.removeAttribute('src'); return; }
    const src = `https://maps.google.com/maps?q=${encodeURIComponent(busca)}&z=15&output=embed`;
    if (mapa.getAttribute('src') !== src) mapa.setAttribute('src', src);
    mapa.classList.remove('hidden');
  }

  if (btnOpenVenueModal && modalAddVenue) {
    btnOpenVenueModal.addEventListener('click', (e) => {
      e.stopPropagation();
      // Abre o popup de local direto na home, sem sair do dashboard.
      // Sem local: "Adicione o local". Com local: "Alterar o local", com o
      // mapa já mostrando o lugar e sem o "Ainda não tenho um local".
      const activeEv = getActiveEvent();
      const d = (activeEv && activeEv.eventDetails) || {};
      const nome = String((typeof d.locationName === 'string' ? d.locationName : (activeEv.location !== 'Adicionar Local' ? activeEv.location : '')) || '').trim();
      const temLocal = !!(nome || String(d.address || '').trim());
      if (inputVenue) inputVenue.value = nome || localDoEventoParaHome() || '';
      const titulo = document.getElementById('modal-venue-titulo');
      if (titulo) titulo.textContent = temLocal ? 'Alterar o local' : 'Adicione o local';
      const subtitulo = document.getElementById('modal-venue-subtitulo');
      if (subtitulo) subtitulo.textContent = temLocal
        ? 'Deseja alterar o local do evento? Digite o novo local e salve.'
        : 'Usaremos essa informação para personalizar o site dos seus convidados com mapas, rotas, dicas e hotéis próximos.';
      document.getElementById('modal-venue-sem-local')?.classList.toggle('hidden', temLocal);
      if (btnSaveVenue) btnSaveVenue.textContent = temLocal ? 'Salvar novo local' : 'Salvar Local';
      mostrarMapaDoLocal(temLocal ? buscaDoLocalNoMapa(activeEv) : '');
      openModal(modalAddVenue);
    });
  }

  // Digitando o novo local: o mapa acompanha (com uma pausa, para não
  // recarregar a cada letra).
  let mapaDoLocalTimer = null;
  inputVenue?.addEventListener('input', () => {
    const mapa = document.getElementById('modal-venue-mapa');
    if (!mapa || mapa.classList.contains('hidden')) return;
    clearTimeout(mapaDoLocalTimer);
    mapaDoLocalTimer = setTimeout(() => { if (inputVenue.value.trim()) mostrarMapaDoLocal(inputVenue.value.trim()); }, 700);
  });

  if (btnSaveVenue && modalAddVenue) {
    btnSaveVenue.addEventListener('click', () => {
      const activeEv = getActiveEvent();
      const newLoc = inputVenue ? inputVenue.value.trim() : '';
      if (newLoc) {
        activeEv.location = newLoc;
        // O nome do local é o que a Home e Informações leem.
        if (!activeEv.eventDetails) activeEv.eventDetails = {};
        activeEv.eventDetails.locationName = newLoc;
        const campoInformacoes = /** @type {HTMLInputElement|null} */ (document.getElementById('editor-data-location'));
        if (campoInformacoes) campoInformacoes.value = newLoc;
        atualizarLocalDaHome();
        const fieldLoc = document.getElementById('field-event-location');
        if (fieldLoc) fieldLoc.value = newLoc;
        try { persistirEventoAtivo(); } catch (err) { console.error('Local do evento:', err); }
      }
      closeModal(modalAddVenue);
    });
  }

  if (btnNoVenueYet && modalAddVenue) {
    btnNoVenueYet.addEventListener('click', () => {
      closeModal(modalAddVenue);
      // Redireciona para fornecedores, aba Locais
      const b2bTabBtn = document.querySelector('[data-rail-tab="b2b"]');
      if (b2bTabBtn) b2bTabBtn.click();
      setTimeout(() => {
        const venuesPill = document.querySelector('.b2b-category-pill[data-category="venues"]');
        if (venuesPill) venuesPill.click();
      }, 100);
    });
  }

  // ==========================================
  // 15. COMPARTILHAR DROPUP (Site Público)
  // ==========================================
  const btnOpenShareDropup = document.getElementById('btn-open-share-dropup');
  const dropupShareSite = document.getElementById('dropup-share-site');
  const btnShareOptWhatsapp = document.getElementById('btn-share-opt-whatsapp');
  const btnShareOptDigital = document.getElementById('btn-share-opt-digital');
  const btnShareOptTags = document.getElementById('btn-share-opt-tags');
  const btnShareOptQr = document.getElementById('btn-share-opt-qr');

  if (btnOpenShareDropup && dropupShareSite) {
    btnOpenShareDropup.addEventListener('click', (e) => {
      e.stopPropagation();
      dropupShareSite.classList.toggle('hidden');
    });

    document.addEventListener('click', (e) => {
      if (!btnOpenShareDropup.contains(e.target) && !dropupShareSite.contains(e.target)) {
        dropupShareSite.classList.add('hidden');
      }
    });
  }

  if (btnShareOptWhatsapp) {
    btnShareOptWhatsapp.addEventListener('click', () => {
      const activeEv = getActiveEvent();
      const url = activeEv.publicUrl || `https://love.com.br/${activeEv.slug}`;
      const msg = `Olá! Convidamos você com muito carinho para o nosso grande dia. Acesse nosso site para confirmar presença e ver a lista de presentes: ${url}`;
      window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`, '_blank');
      dropupShareSite?.classList.add('hidden');
    });
  }

  if (btnShareOptDigital) {
    btnShareOptDigital.addEventListener('click', () => {
      const activeEv = getActiveEvent();
      const url = activeEv.publicUrl || `https://love.com.br/${activeEv.slug}`;
      navigator.clipboard.writeText(url).then(() => {
        window.open(url, '_blank');
      }).catch(() => {
        window.open(url, '_blank');
      });
      dropupShareSite?.classList.add('hidden');
    });
  }

  if (btnShareOptTags) {
    btnShareOptTags.addEventListener('click', () => {
      const activeEv = getActiveEvent();
      const url = activeEv.publicUrl || `https://love.com.br/${activeEv.slug}`;
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(`
          <html>
            <head>
              <title>Tags de Lembrancinhas e Convite - ${activeEv.title}</title>
              <style>
                body { font-family: sans-serif; padding: 20px; display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; }
                .tag { border: 2px dashed #537bae; border-radius: 12px; padding: 15px; text-align: center; }
                .title { font-size: 14px; font-weight: bold; color: #1E293B; margin-bottom: 5px; }
                .subtitle { font-size: 11px; color: #64748B; margin-bottom: 10px; }
                .url { font-size: 11px; font-weight: bold; color: #537bae; word-break: break-all; }
              </style>
            </head>
            <body>
              ${Array(9).fill(`
                <div class="tag">
                  <div class="title">${activeEv.title}</div>
                  <div class="subtitle">Confirme sua presença & presentes:</div>
                  <div class="url">${url}</div>
                </div>
              `).join('')}
            </body>
          </html>
        `);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => printWindow.print(), 300);
      }
      dropupShareSite?.classList.add('hidden');
    });
  }

  if (btnShareOptQr) {
    btnShareOptQr.addEventListener('click', () => {
      const activeEv = getActiveEvent();
      const url = activeEv.publicUrl || `https://love.com.br/${activeEv.slug}`;
      const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(url)}`;
      const qrWindow = window.open('', '_blank');
      if (qrWindow) {
        qrWindow.document.write(`
          <html>
            <head>
              <title>QR Code - ${activeEv.title}</title>
              <style>
                body { font-family: sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; margin: 0; background: #F8FAFC; }
                .card { background: white; padding: 30px; border-radius: 24px; box-shadow: 0 10px 25px rgba(0,0,0,0.08); text-align: center; max-width: 340px; }
                h2 { font-size: 18px; color: #0F172A; margin: 0 0 8px 0; }
                p { font-size: 12px; color: #64748B; margin: 0 0 20px 0; }
                img { width: 240px; height: 240px; border-radius: 12px; border: 1px solid #E2E8F0; }
              </style>
            </head>
            <body>
              <div class="card">
                <h2>${activeEv.title}</h2>
                <p>Aponte a câmera para acessar o site</p>
                <img src="${qrUrl}" alt="QR Code">
              </div>
            </body>
          </html>
        `);
        qrWindow.document.close();
      }
      dropupShareSite?.classList.add('hidden');
    });
  }

  if (btnAccountLogout) {
    btnAccountLogout.addEventListener('click', async () => {
      dropdownUserAccount?.classList.add('hidden');
      await supabaseClient.auth.signOut();
      showToast('Você saiu da sua conta. Até logo!', '👋');
      setTimeout(() => {
        switchView('public');
      }, 1000);
    });
  }

  // Formulário de Configurações da Conta (Perfil + Segurança)
  const formUserSettings = document.getElementById('form-user-settings');
  if (formUserSettings) {
    formUserSettings.addEventListener('submit', async (e) => {
      e.preventDefault();
      const session = window.loveClienteSession;
      if (!session) return;

      const saveBtn = document.getElementById('btn-save-user-settings');
      const { first_name, last_name, full_name } = montarNomeCliente(
        document.getElementById('settings-user-first-name').value,
        document.getElementById('settings-user-last-name').value
      );
      const name = full_name;
      const currentPassword = document.getElementById('settings-password-current').value;
      const newPassword = document.getElementById('settings-password-new').value;
      const confirmPassword = document.getElementById('settings-password-confirm').value;
      const errorEl = document.getElementById('settings-form-error');

      // showToast está desligado na plataforma — o erro aparece no formulário.
      function showSettingsError(message) {
        errorEl.textContent = message;
        errorEl.classList.remove('hidden');
      }
      errorEl.classList.add('hidden');

      if (!first_name) return showSettingsError('O nome não pode ficar vazio.');

      const wantsPasswordChange = currentPassword || newPassword || confirmPassword;
      if (wantsPasswordChange) {
        if (!currentPassword || !newPassword || !confirmPassword) return showSettingsError('Preencha os 3 campos de senha para trocá-la.');
        if (newPassword !== confirmPassword) return showSettingsError('A confirmação não coincide com a nova senha.');
        if (newPassword.length < 6) return showSettingsError('A nova senha precisa ter pelo menos 6 caracteres.');
      }

      saveBtn.disabled = true;

      if (wantsPasswordChange) {
        // Confere a senha atual num cliente separado e descartável: um
        // signInWithPassword no cliente principal trocaria a sessão atual por
        // uma nova de nível aal1, derrubando quem tem dois fatores ativos.
        const checker = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
          auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false, storageKey: 'love-password-check' }
        });
        const { error: authError } = await checker.auth.signInWithPassword({
          email: session.user.email,
          password: currentPassword
        });
        if (!authError) await checker.auth.signOut({ scope: 'local' });
        if (authError) {
          saveBtn.disabled = false;
          return showSettingsError('Senha atual incorreta.');
        }

        const { error: updateError } = await supabaseClient.auth.updateUser({ password: newPassword });
        if (updateError) {
          saveBtn.disabled = false;
          return showSettingsError(/different from the old/i.test(updateError.message || '')
            ? 'A nova senha precisa ser diferente da atual.'
            : 'Não foi possível trocar sua senha. Tente novamente.');
        }
      }

      // Nome vai pros dois lugares: tabela clientes (couple_name é mantido
      // igual a full_name pelo gatilho do banco) e user_metadata do Auth
      // (usado nos templates de e-mail).
      const [{ error: profileError }, { error: metaError }] = await Promise.all([
        supabaseClient
          .from('clientes')
          .update({ first_name, last_name: last_name || null, full_name, couple_name: full_name })
          .eq('id', session.user.id),
        supabaseClient.auth.updateUser({ data: { first_name, last_name, full_name } })
      ]);

      saveBtn.disabled = false;

      if (profileError || metaError) return showSettingsError('Não foi possível salvar seus dados. Tente novamente.');

      if (window.loveClienteProfile) {
        Object.assign(window.loveClienteProfile, { first_name, last_name, full_name, couple_name: full_name });
      }
      atualizarAvatarDoCabecalho();
      const dropdownUsername = document.getElementById('account-dropdown-username');
      if (dropdownUsername) dropdownUsername.textContent = name;

      resetSettingsSecurity();
      // Página (não popup): confirma ali mesmo, sem fechar nada.
      const okEl = document.getElementById('settings-form-ok');
      if (okEl) {
        okEl.classList.remove('hidden');
        setTimeout(() => okEl.classList.add('hidden'), 4000);
      }
    });
  }

  // Configurações da conta › acordeão "Segurança" (senha + dois fatores)
  const btnSecurityToggle = document.getElementById('btn-settings-security-toggle');
  const securityBody = document.getElementById('settings-security-body');
  const securityChevron = document.getElementById('settings-security-chevron');
  const btnChangePassword = document.getElementById('btn-settings-change-password');
  const passwordFields = document.getElementById('settings-password-fields');
  const passwordInputIds = ['settings-password-current', 'settings-password-new', 'settings-password-confirm'];

  function setSecurityOpen(open) {
    if (!securityBody) return;
    securityBody.classList.toggle('hidden', !open);
    btnSecurityToggle.setAttribute('aria-expanded', String(open));
    securityChevron?.classList.toggle('rotate-180', open);
    if (open) refreshMfaStatus();
  }

  function setPasswordFieldsOpen(open) {
    if (!passwordFields) return;
    passwordFields.classList.toggle('hidden', !open);
    btnChangePassword.textContent = open ? 'Cancelar' : 'Alterar senha';
    // Fechar = desistir da troca: limpa pra não salvar uma senha esquecida ali.
    if (!open) passwordInputIds.forEach(id => { document.getElementById(id).value = ''; });
    else document.getElementById('settings-password-current').focus();
  }

  // Chamado ao abrir/salvar a página: tudo fechado e sem senha preenchida.
  function resetSettingsSecurity() {
    setSecurityOpen(false);
    setPasswordFieldsOpen(false);
    hideMfaSetup();
  }

  btnSecurityToggle?.addEventListener('click', () => {
    setSecurityOpen(securityBody.classList.contains('hidden'));
  });
  btnChangePassword?.addEventListener('click', () => {
    setPasswordFieldsOpen(passwordFields.classList.contains('hidden'));
  });

  // Dois fatores (TOTP via Supabase Auth MFA)
  const mfaStatusEl = document.getElementById('settings-mfa-status');
  const btnMfaToggle = document.getElementById('btn-settings-mfa-toggle');
  const mfaSetup = document.getElementById('settings-mfa-setup');
  const mfaErrorEl = document.getElementById('settings-mfa-error');
  let mfaVerifiedFactor = null;
  let mfaPendingFactorId = null;

  function showMfaError(message) {
    mfaErrorEl.textContent = message;
    mfaErrorEl.classList.remove('hidden');
  }

  function hideMfaSetup() {
    if (!mfaSetup) return;
    mfaSetup.classList.add('hidden');
    mfaErrorEl.classList.add('hidden');
    document.getElementById('settings-mfa-code').value = '';
  }

  async function refreshMfaStatus() {
    if (!btnMfaToggle) return;
    btnMfaToggle.disabled = true;
    const { data, error } = await supabaseClient.auth.mfa.listFactors();
    if (error) {
      if (mfaStatusEl) mfaStatusEl.textContent = 'indisponível';
      btnMfaToggle.textContent = 'Indisponível';
      return;
    }
    mfaVerifiedFactor = (data.totp || []).find(f => f.status === 'verified') || null;
    if (mfaStatusEl) mfaStatusEl.textContent = mfaVerifiedFactor ? 'ativada' : 'desativada';
    // O botão mostra o estado: "Desativar" = está ativada; "Ativar" = está desativada.
    btnMfaToggle.textContent = mfaVerifiedFactor ? 'Desativar' : 'Permitir';
    btnMfaToggle.disabled = false;
  }

  btnMfaToggle?.addEventListener('click', async () => {
    mfaErrorEl.classList.add('hidden');

    if (mfaVerifiedFactor) {
      if (!confirm('Desativar a autenticação de dois fatores? Seu login voltará a pedir só e-mail e senha.')) return;
      btnMfaToggle.disabled = true;
      const { error } = await supabaseClient.auth.mfa.unenroll({ factorId: mfaVerifiedFactor.id });
      if (error) {
        btnMfaToggle.disabled = false;
        mfaSetup.classList.remove('hidden');
        return showMfaError('Não foi possível desativar agora. Saia e entre de novo na conta e tente outra vez.');
      }
      hideMfaSetup();
      return refreshMfaStatus();
    }

    // Já aberto: o botão funciona como "cancelar".
    if (!mfaSetup.classList.contains('hidden')) {
      hideMfaSetup();
      btnMfaToggle.textContent = 'Permitir';
      return;
    }

    btnMfaToggle.disabled = true;
    // Tentativas anteriores abandonadas deixam fatores "unverified" que
    // bloqueiam um novo enroll — remove antes de gerar o QR code.
    const { data: factors } = await supabaseClient.auth.mfa.listFactors();
    for (const f of (factors?.all || []).filter(f => f.status === 'unverified')) {
      await supabaseClient.auth.mfa.unenroll({ factorId: f.id });
    }
    const { data, error } = await supabaseClient.auth.mfa.enroll({ factorType: 'totp', friendlyName: 'Love' });
    btnMfaToggle.disabled = false;
    mfaSetup.classList.remove('hidden');
    if (error) return showMfaError('Não foi possível iniciar a ativação. Tente novamente.');

    mfaPendingFactorId = data.id;
    document.getElementById('settings-mfa-qr').src = data.totp.qr_code;
    document.getElementById('settings-mfa-secret').textContent = data.totp.secret;
    document.getElementById('settings-mfa-code').focus();
  });

  // Pop-up dos dois fatores: mora no <body> (um ancestral com transform
  // prendia o position:fixed fora da tela); fecha no X, no Esc ou fora da caixa.
  if (mfaSetup && mfaSetup.parentElement !== document.body) document.body.appendChild(mfaSetup);
  const fecharPopupMfa = () => { hideMfaSetup(); mfaPendingFactorId = null; refreshMfaStatus(); };
  document.getElementById('btn-settings-mfa-close')?.addEventListener('click', fecharPopupMfa);
  mfaSetup?.addEventListener('click', (e) => { if (e.target === mfaSetup) fecharPopupMfa(); });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && mfaSetup && !mfaSetup.classList.contains('hidden')) fecharPopupMfa();
  });

  document.getElementById('btn-settings-mfa-verify')?.addEventListener('click', async (e) => {
    const code = document.getElementById('settings-mfa-code').value.replace(/\D/g, '');
    mfaErrorEl.classList.add('hidden');
    if (!mfaPendingFactorId) return;
    if (code.length !== 6) return showMfaError('O código tem 6 dígitos.');

    const verifyBtn = e.currentTarget;
    verifyBtn.disabled = true;
    const { error } = await supabaseClient.auth.mfa.challengeAndVerify({ factorId: mfaPendingFactorId, code });
    verifyBtn.disabled = false;
    if (error) return showMfaError('Código inválido ou expirado. Confira o app e tente de novo.');

    mfaPendingFactorId = null;
    hideMfaSetup();
    refreshMfaStatus();
  });

  function triggerConfetti() {
    const emojis = ['💙', '💍', '✨', '🌸', '🥂', '🎉', '🎁'];
    for (let i = 0; i < 20; i++) {
      const particle = document.createElement('div');
      particle.textContent = emojis[Math.floor(Math.random() * emojis.length)];
      particle.style.position = 'fixed';
      particle.style.left = `${15 + Math.random() * 70}vw`;
      particle.style.top = `${60 + Math.random() * 30}vh`;
      particle.style.fontSize = `${16 + Math.random() * 24}px`;
      particle.style.opacity = '1';
      particle.style.pointerEvents = 'none';
      particle.style.zIndex = '99999';
      particle.style.transition = 'all 1.4s cubic-bezier(0.2, 0.8, 0.2, 1)';
      document.body.appendChild(particle);

      requestAnimationFrame(() => {
        const moveX = (Math.random() - 0.5) * 180;
        const moveY = -180 - Math.random() * 200;
        particle.style.transform = `translate(${moveX}px, ${moveY}px) scale(1.3)`;
        particle.style.opacity = '0';
      });

      setTimeout(() => particle.remove(), 1500);
    }
  }

  // ==========================================
  // 14. LISTENERS INTERATIVOS DO RODAPÉ
  // ==========================================
  const btnFooterCreate = document.getElementById('btn-footer-create-event');
  const btnFooterFind = document.getElementById('btn-footer-find-event');
  const btnFooterB2B = document.getElementById('btn-footer-b2b-advisors');
  const btnFooterBlog = document.getElementById('btn-footer-blog');
  const btnFooterHelp = document.getElementById('btn-footer-help-center');
  const btnFooterContact = document.getElementById('btn-footer-contact');
  const btnFooterWhatsapp = document.getElementById('btn-footer-whatsapp');
  if (btnFooterCreate) {
    btnFooterCreate.addEventListener('click', () => {
      openModal(elements.modals.createEvent || elements.modals.login);
    });
  }

  if (btnFooterFind) {
    btnFooterFind.addEventListener('click', () => {
      showToast('Digite o nome dos anfitriões na busca para encontrar o evento desejado.', '🔍');
    });
  }

  if (btnFooterB2B) {
    btnFooterB2B.addEventListener('click', () => {
      switchView('dashboard');
      switchRailTab('b2b');
      showToast('Acessando o Marketplace & Painel de Assessores Certificados.', '🤝');
    });
  }

  if (btnFooterBlog) {
    btnFooterBlog.addEventListener('click', () => {
      showToast('Acessando o Blog Love: Dicas, Checklist & Inspirações para Eventos.', '📖');
    });
  }

  if (btnFooterHelp) {
    btnFooterHelp.addEventListener('click', () => {
      switchView('dashboard');
      openFaqPage();
    });
  }

  if (btnFooterContact || btnFooterWhatsapp) {
    const handleContact = () => {
      showToast('Suporte Love via WhatsApp: (11) 98765-4321 • Atendimento 24/7.', '💬');
    };
    if (btnFooterContact) btnFooterContact.addEventListener('click', handleContact);
    if (btnFooterWhatsapp) btnFooterWhatsapp.addEventListener('click', handleContact);
  }

  // Política de Privacidade & Termos de Uso: os <a href="/termos"> e
  // <a href="/privacidade"> do rodapé (público, dashboard,
  // login) continuam links de verdade (clique do meio/botão direito
  // funcionam normalmente) — um clique normal é interceptado pra abrir sem
  // sair da SPA, mantendo o header/rail atual (ver openLegalDocPage).
  document.querySelectorAll('a[href="/termos"], a[href="/privacidade"]').forEach(link => {
    link.addEventListener('click', (e) => {
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
      e.preventDefault();
      e.stopPropagation();
      openLegalDocPage(link.getAttribute('href') === '/termos' ? 'termos' : 'privacidade');
    });
  });

  // Botão voltar/avançar do navegador: reabre a página legal, troca de aba
  // do painel, ou (se nenhuma rota reconhecida) só sai da página legal.
  window.addEventListener('popstate', () => {
    const path = window.location.pathname;
    if (path === '/termos') { openLegalDocPage('termos', { pushUrl: false }); return; }
    if (path === '/privacidade') { openLegalDocPage('privacidade', { pushUrl: false }); return; }
    if (path === '/notificacoes' && state.currentView === 'dashboard') { openNotificationsPage({ pushUrl: false }); return; }
    if (path === '/central-de-ajuda' && state.currentView === 'dashboard') { openFaqPage({ pushUrl: false }); return; }
    if (path === '/configuracoes' && state.currentView === 'dashboard') { openAccountSettingsPage({ pushUrl: false }); return; }

    const rota = lerRota(path);
    if (state.currentView === 'dashboard' && rota) {
      aplicarRota(rota);
      return;
    }

    const legalPage = document.getElementById('legal-doc-page');
    if (legalPage && !legalPage.classList.contains('hidden')) {
      switchView(state.currentView === 'dashboard' ? 'dashboard' : 'public');
    }
  });

  // Retorno universal à Home/Visão Geral ao clicar em qualquer Logo da plataforma
  document.querySelectorAll('.btn-navigate-home, img[src*="logo.png"], img[src*="icone-azul1"], img[src*="iconelove2"]').forEach(el => {
    if (!el.closest('.modal-container-custom')) {
      const clickTarget = el.tagName.toLowerCase() === 'img' ? el.parentElement : el;
      if (clickTarget) {
        clickTarget.style.cursor = 'pointer';
        clickTarget.addEventListener('click', (e) => {
          e.preventDefault();
          if (state.currentView === 'dashboard') {
            switchRailTab('overview');
          } else {
            const legalPage = document.getElementById('legal-doc-page');
            if (legalPage && !legalPage.classList.contains('hidden')) {
              switchView('public');
              history.pushState({}, '', '/');
            }
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }
        });
      }
    }
  });

  // Inicializa modal de onboarding do orçamento e modal de nova despesa
  initBudgetSetupModal();
  initAddBudgetExpenseModal();
  initTablesOrganization();
  initFloorPlan();

  // Inicializa módulo B2B e sistema de chat messenger
  initB2BMarketplace();

  // ==========================================
  // Dados reais por evento (Supabase) — substitui o mock de js/data.js assim
  // que o anfitrião loga. Cada evento vem com seus próprios convidados e
  // presentes, reais no banco, em vez de uma única lista compartilhada.
  // ==========================================

  const GUEST_STATUS_DB_TO_APP = { pendente: 'pending', confirmado: 'confirmed', recusado: 'declined' };
  const GUEST_STATUS_APP_TO_DB = { pending: 'pendente', confirmed: 'confirmado', declined: 'recusado' };

  function mapConvidadoRowToGuest(row) {
    return {
      id: row.id,
      name: row.nome,
      email: row.email,
      phone: row.telefone,
      status: GUEST_STATUS_DB_TO_APP[row.status] || 'pending',
      table: row.mesa,
      ...(row.extra || {})
    };
  }

  function mapGuestToConvidadoRow(guest, eventoId, clienteId) {
    const { id, name, email, phone, status, table, ...rest } = guest;
    return {
      evento_id: eventoId,
      cliente_id: clienteId,
      nome: name || '',
      email: email || null,
      telefone: phone || null,
      tipo: 'adulto',
      status: GUEST_STATUS_APP_TO_DB[status] || 'pendente',
      mesa: table || null,
      extra: rest
    };
  }

  function mapPresenteRowToGift(row) {
    return {
      id: row.id,
      title: row.nome,
      category: row.categoria,
      price: Number(row.valor) || 0,
      image: row.imagem_url,
      buyerName: row.comprador_nome,
      ...(row.extra || {})
    };
  }

  function mapGiftToPresenteRow(gift, eventoId, clienteId) {
    const { id, title, category, price, image, buyerName, status, received, ...rest } = gift;
    return {
      evento_id: eventoId,
      cliente_id: clienteId,
      nome: title || '',
      categoria: category || null,
      valor: price || 0,
      imagem_url: image || null,
      status: (received > 0) ? 'recebido' : 'disponivel',
      comprador_nome: buyerName || null,
      extra: { ...rest, status, received }
    };
  }

  function mapEventoRowToEvent(row) {
    const guests = (row.convidados || []).map(mapConvidadoRowToGuest);
    const giftList = (row.presentes || []).map(mapPresenteRowToGift);
    const confirmed = guests.filter(g => g.status === 'confirmed');
    const declined = guests.filter(g => g.status === 'declined');
    const pending = guests.filter(g => g.status === 'pending');
    return {
      id: row.id,
      clienteId: row.cliente_id,
      type: row.tipo,
      title: row.titulo,
      hostName: row.host_name,
      date: row.data_evento,
      slug: row.slug,
      theme: row.theme,
      coverImage: row.cover_image_url,
      status: row.status,
      ...(row.extra || {}),
      convidadosConfirmados: pessoasNaLista(confirmed),
      convidadosRecusados: declined.length,
      convidadosPendentes: pending.length,
      totalConvidados: pessoasNaLista(guests),
      adultosConfirmados: confirmed.reduce((s, g) => s + (g.adults || 0), 0),
      criancasConfirmadas: confirmed.reduce((s, g) => s + (g.children || 0), 0),
      presentesRecebidos: giftList.filter(g => (g.received || 0) > 0).length,
      totalArrecadado: giftList.reduce((s, g) => s + (g.received || 0), 0),
      guests,
      giftList
    };
  }

  // js/data.js (mock antigo) usa 'baby' pro chá de bebê — o banco só aceita
  // os 6 tipos reais usados na tela de criar evento (wedding, birthday,
  // baby_shower, bridal_shower, gender_reveal, anniversary).
  const LEGACY_EVENT_TYPE_MAP = { baby: 'baby_shower', corporate: 'wedding', other: 'wedding' };
  const VALID_EVENT_TYPES = ['wedding', 'birthday', 'baby_shower', 'bridal_shower', 'gender_reveal', 'anniversary'];
  function normalizeEventTypeForDb(type) {
    const mapped = LEGACY_EVENT_TYPE_MAP[type] || type;
    return VALID_EVENT_TYPES.includes(mapped) ? mapped : 'wedding';
  }

  /** Evento criado só no navegador ainda não tem id do banco. */
  function ehUuid(valor) {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(valor || ''));
  }

  function mapEventToEventoRow(evt, clienteId) {
    const { id, type, title, hostName, date, slug, theme, coverImage, status, guests, giftList, ...rest } = evt;
    return {
      cliente_id: clienteId,
      tipo: normalizeEventTypeForDb(type),
      titulo: title || 'Meu Evento',
      host_name: hostName || null,
      data_evento: date || null,
      slug: slug || null,
      theme: theme || null,
      cover_image_url: coverImage || null,
      status: 'ativo',
      extra: rest
    };
  }

  // Busca todos os eventos do cliente logado, cada um já com seus convidados
  // e presentes reais (join numa única consulta).
  async function loadEventsFromSupabase(clienteId) {
    const { data: rows, error } = await supabaseClient
      .from('eventos')
      .select('*, convidados(*), presentes(*)')
      .eq('cliente_id', clienteId)
      .is('deleted_at', null)
      .order('created_at', { ascending: true });
    if (error) { console.error('Erro ao carregar eventos:', error); return []; }
    return (rows || []).map(mapEventoRowToEvent);
  }

  // Expõe o evento ativo pra outros scripts (site-builder.js) sem depender
  // de window.LOVE_DATA.currentEventId, que nunca é atualizado.
  window.getLoveActiveEventId = () => state.activeEventId;
  // O evento ativo inteiro (tipo, data, anfitriões…) para o site-builder.js —
  // window.LOVE_DATA.events é só a lista inicial de demonstração.
  window.getLoveActiveEvent = () => getActiveEvent();

  // Início padrão na página pública — troca para o dashboard automaticamente
  // se já existir uma sessão Supabase válida (usuário já logado). Quem acessa
  // /login direto (URL limpa, sem hash) já abre na tela de login.
  const initialLegalSlug =
    window.location.pathname === '/termos' ? 'termos' :
    window.location.pathname === '/privacidade' ? 'privacidade' :
    null;

  // Quem acessa /presentes, /convidados etc. direto (link externo, favorito,
  // F5) já abre naquela aba do painel; sem conta logada essas rotas não
  // significam nada e o pendingInitialDashboardRoute simplesmente nunca é
  // consumido (switchView('dashboard') nunca roda).
  const initialRoute = lerRota(window.location.pathname);
  const initialRailTab = initialRoute ? initialRoute.tab : null;

  // /notificacoes não é uma aba do rail (sem ícone próprio) — mesma lógica
  // de rota "direta" das legais/abas, só que abrindo a página de notificações.
  const initialIsNotifications = window.location.pathname === '/notificacoes';
  const initialIsFaq = window.location.pathname === '/central-de-ajuda';
  const initialIsSettings = window.location.pathname === '/configuracoes';

  // Guardado ANTES do switchView/initClienteSession: se a sessão confirmar
  // 'dashboard', é consumido ali dentro mesmo, sem passar pela Visão Geral
  // no meio do caminho (ver pendingInitialDashboardRoute, perto do topo).
  if (initialLegalSlug) pendingInitialDashboardRoute = { type: 'legal', slug: initialLegalSlug };
  else if (initialIsNotifications) pendingInitialDashboardRoute = { type: 'notifications' };
  else if (initialIsFaq) pendingInitialDashboardRoute = { type: 'faq' };
  else if (initialIsSettings) pendingInitialDashboardRoute = { type: 'settings' };
  else if (initialRailTab && initialRailTab !== 'overview') pendingInitialDashboardRoute = { type: 'tab', tab: initialRailTab, rota: initialRoute };

  // Só chama switchView('public') de cara se NÃO houver pista de sessão no
  // localStorage. Quando há (ver o <script> no <head> de index.html, que já
  // escondeu #view-public-site por CSS antes deste arquivo inteiro rodar),
  // deixa a decisão pra quando initClienteSession() confirmar de verdade —
  // chamar switchView('public') aqui e trocar pra 'dashboard' alguns
  // instantes depois é exatamente o que fazia a home pública piscar pra
  // quem já estava logado, em QUALQUER página (não só nas legais).
  const isLoginRoute = window.location.pathname === '/login' || window.location.hash === '#login';
  const hasPlausibleSession = (() => {
    try { return !!localStorage.getItem('sb-krpgtixwmxwhtjchcufl-auth-token'); } catch (e) { return false; }
  })();

  if (isLoginRoute) {
    switchView('login');
  } else if (!hasPlausibleSession) {
    switchView('public');
  }
  // Se houver pista de sessão e não for /login, state.currentView já nasce
  // 'public' (valor padrão) sem a função ter sido chamada — initClienteSession
  // decide de verdade (switchView('dashboard') ou, se a sessão não se
  // confirmar, switchView('public') no fallback abaixo).

  // Mostra a página legal (com um estado de carregamento) JÁ na primeira
  // pintura da tela, cobrindo o caso de quem NÃO está logado — sem isso,
  // dava pra ver a home piscar por um instante em /termos e
  // /privacidade antes da sessão terminar de resolver
  // (initClienteSession é assíncrono) e só então trocar pra lá. Quem está
  // logado nem chega a ver isso: switchView('dashboard') troca pra cá antes
  // de qualquer pintura (ver pendingInitialDashboardRoute).
  if (initialLegalSlug) {
    const landingSections = document.getElementById('public-landing-sections');
    const legalPage = document.getElementById('legal-doc-page');
    const loadingEl = document.getElementById('legal-doc-loading');
    const titleEl = document.getElementById('legal-doc-title');
    if (landingSections) landingSections.classList.add('hidden');
    if (legalPage) legalPage.classList.remove('hidden');
    if (loadingEl) loadingEl.classList.remove('hidden');
    if (titleEl) titleEl.textContent = initialLegalSlug === 'termos' ? 'Termos de Uso' : 'Política de Privacidade';
  }

  initClienteSession();

  async function initClienteSession() {
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (!session) {
      // Cobre o palpite de sessão (localStorage tinha a chave, mas o token
      // não se confirmou) — sem a classe ainda presente, switchView() nunca
      // chegou a rodar (ela mesma se encarrega de removê-la), e sem isso
      // aqui quem tivesse um token velho/inválido ficava travado na tela
      // escondida pelo CSS do <head>, sem nunca cair de volta pra home.
      if (document.documentElement.classList.contains('love-likely-logged-in')) switchView('public');
      return;
    }

    let { data: cliente } = await supabaseClient
      .from('clientes')
      .select('*') // inclui first_name/last_name/full_name sem quebrar se a migration 034 ainda não rodou
      .eq('id', session.user.id)
      .maybeSingle();

    // Primeira entrada pelo Google: o usuário existe no Auth, mas ainda não
    // tem cadastro de anfitrião. Cria (nome/e-mail/foto do Google) e segue.
    const veioDoGoogle = (session.user.app_metadata && (session.user.app_metadata.provider === 'google' ||
      (session.user.app_metadata.providers || []).includes('google')));
    let modoGoogle = null;
    try { modoGoogle = localStorage.getItem('love-google-modo'); localStorage.removeItem('love-google-modo'); } catch (e) {}
    if (!cliente && veioDoGoogle && modoGoogle === 'entrar') {
      // Veio de "Fazer login com o Google" com um e-mail sem cadastro: não
      // cria conta (igual ao login com e-mail) — avisa na tela de login.
      await supabaseClient.auth.signOut();
      switchView('login');
      showLoginError('Esse e-mail não está cadastrado como anfitrião. <a href="/cadastro" class="font-bold text-[#537bae] hover:text-[#416799] hover:underline">Cadastre-se</a>');
      return;
    }
    let motivoSemCadastro = '';
    if (!cliente && veioDoGoogle) {
      const { data: criado, error: erroCriar } = await supabaseClient.rpc('garantir_cliente_google');
      if (erroCriar) console.error('Erro ao criar cadastro pelo Google:', erroCriar);
      if (criado) {
        ({ data: cliente } = await supabaseClient.from('clientes').select('*').eq('id', session.user.id).maybeSingle());
      }
      // A função recusa (false) quando o e-mail já é de uma conta de
      // fornecedor do Hub B2B — cada conta é de anfitrião OU de fornecedor.
      if (!cliente) {
        motivoSemCadastro = erroCriar
          ? 'Não foi possível criar sua conta com o Google agora. Tente de novo em instantes.'
          : `O e-mail ${escaparHtml(session.user.email || '')} já está em uso numa conta de fornecedor do Hub B2B. Para usar a plataforma de anfitrião, entre ou cadastre-se com outro e-mail.`;
      }
    }

    // Convite de organizador aberto antes de entrar/criar a conta: aceita agora.
    await aceitarConvitePendenteDeOrganizador();
    const eventosOrganizados = await carregarEventosOrganizados();
    // Conta sem cadastro de anfitrião (ex.: fornecedor do Hub) convidada como
    // organizadora de um evento: entra só com as áreas liberadas.
    const colaboradorSemCadastro = !cliente && eventosOrganizados.length > 0;

    // Essa plataforma é só pra quem tem cadastro de anfitrião. Login/B2B/Admin
    // compartilham o mesmo Supabase Auth — sem essa checagem, uma conta de
    // fornecedor (B2B) ou uma conta excluída aqui (mas com sessão ainda válida
    // no navegador) continuaria entrando normalmente.
    if (!cliente && !colaboradorSemCadastro) {
      await supabaseClient.auth.signOut();
      // Os avisos flutuantes estão desligados: a explicação vai para a tela
      // de login (antes voltava calado para a página inicial).
      switchView('login');
      showLoginError(motivoSemCadastro || 'Essa conta não está cadastrada como anfitrião. <a href="/cadastro" class="font-bold text-[#537bae] hover:text-[#416799] hover:underline">Cadastre-se</a>');
      return;
    }

    if (cliente && cliente.status === 'bloqueado') {
      await supabaseClient.auth.signOut();
      showToast('Este usuário está bloqueado.', '⛔');
      switchView('public');
      return;
    }

    // Sessão salva que parou antes do código de dois fatores (ex.: fechou a
    // aba na tela do código): não entra no painel até completar a etapa.
    if (await precisaCodigoMfa()) {
      switchView('login');
      showLoginMfaPanel();
      return;
    }

    window.loveClienteSession = session;
    window.loveClienteProfile = cliente || perfilDeColaborador(session);
    atualizarAvatarDoCabecalho();
    const dropdownUsername = document.getElementById('account-dropdown-username');
    if (dropdownUsername) dropdownUsername.textContent = nomeDaConta(window.loveClienteProfile);

    // Veio da página /cadastro, que já perguntou o tipo de evento no onboarding
    // — pula os eventos de demonstração e leva direto pro formulário de criar
    // o primeiro evento de verdade, com o tipo já escolhido.
    let pendingType = localStorage.getItem('love-pending-event-type');
    const pendingTypeLabel = localStorage.getItem('love-pending-event-type-label');

    // Eventos próprios + os em que esta conta é organizadora.
    const events = (cliente ? await loadEventsFromSupabase(session.user.id) : []).concat(eventosOrganizados);

    // Quem já tem evento entra sempre no painel. Um tipo pendente que sobrou
    // do /cadastro (ex.: cadastro pelo Google, ou um evento criado por outro
    // caminho) não pode mandar de novo para "criar evento" a cada recarga.
    if (events.length && pendingType) {
      ['love-pending-event-type', 'love-pending-event-type-label', 'love-pending-event-name', 'love-pending-event-date']
        .forEach(k => { try { localStorage.removeItem(k); } catch (e) {} });
      pendingType = null;
    }

    // Conta nova nasce vazia. Antes daqui saíam dois eventos de demonstração
    // gravados como linhas reais no banco — o que fazia o Admin mostrar
    // "2 eventos" para quem nunca criou nenhum. Sem evento, a pessoa cai no
    // onboarding de "Crie seu primeiro evento", que já existe.
    if (!events.length && !pendingType) setSidebarLocked(true);

    if (events.length) {
      state.events = events;
      // Volta para o evento que estava aberto antes de atualizar a página.
      const guardado = eventoAtivoGuardado();
      state.activeEventId = (events.find(e => String(e.id) === guardado) || events[0]).id;
      state.hasEventCreated = true;
      // Garante que o Convite Digital do evento ativo (o guardado ou o primeiro)
      // sincronize com o Supabase assim que a sessão carrega — sem isso, só
      // sincronizava ao trocar/criar evento, nunca no login inicial.
      if (typeof window.reloadBuilderStateForActiveEvent === 'function') {
        window.reloadBuilderStateForActiveEvent();
      }
      // initFloorPlan() já rodou de forma síncrona, antes da sessão carregar
      // — com o id do evento de demonstração (window.LOVE_DATA) ainda em
      // state.events. getFloorPlanElements() lê a planta salva pela chave
      // love_floorplan_<id do evento>, então com o id errado a planta real
      // nunca aparecia (dava a impressão de ter perdido as mesas já criadas)
      // até trocar de evento ou recarregar de novo. Sem reler aqui, o mesmo
      // valia pra lista de convidados fake que ficava travada na tela.
      renderFloorPlanGuestCards();
      renderFloorPlanCanvas();
    } else {
      // `state.events` nasce preenchido com os 2 eventos de demonstração
      // (window.LOVE_DATA, usados só de mockup visual) — sem isso aqui, uma
      // conta nova sem eventos reais no Supabase continuava mostrando
      // "Casamento Beatriz & Lucas" e "Chá de Bebê do Theo" no dashboard.
      state.events = [];
      state.activeEventId = null;
      state.hasEventCreated = false;
    }

    subscribeToB2BChatRealtime();
    loadB2BConversationsData().then(atualizarContadoresDoChat).catch(e => console.error('Erro ao carregar o chat:', e));

    switchView('dashboard');

    if (pendingType && typeof proceedToEventForm === 'function') {
      // Só apaga esses dados do localStorage quando o evento for criado de
      // verdade (no submit do formulário) — enquanto isso não acontecer,
      // deslogar e logar de novo precisa continuar voltando pra esta mesma
      // tela pré-preenchida, em vez de "esquecer" o que a pessoa já tinha
      // escolhido no /cadastro e mandar pra tela genérica de boas-vindas.
      proceedToEventForm(pendingType, pendingTypeLabel || 'Novo Evento');

      // Nome e data do evento já coletados no onboarding de /cadastro
      const pendingName = localStorage.getItem('love-pending-event-name');
      const pendingDate = localStorage.getItem('love-pending-event-date');

      const firstName = (pendingName || '').trim().split(/\s+/)[0] || '';

      if (pendingName) {
        const nameInput = document.getElementById('page-new-event-name');
        // "Aniversário de Victor" em vez do nome completo da pessoa
        // ("Victor Maranhão") — mais parecido com um nome de evento de verdade.
        if (nameInput) nameInput.value = (pendingTypeLabel && firstName) ? `${pendingTypeLabel} de ${firstName}` : pendingName;

        // Link personalizado sugerido a partir do nome da pessoa (não do
        // título do evento), já checando disponibilidade no banco.
        const slugInput = document.getElementById('page-new-event-slug');
        if (slugInput) {
          sugerirSlugDisponivel(pendingName).then(slug => { slugInput.value = slug; checarDisponibilidadeSlug(); });
        }
      }
      if (pendingDate) {
        const dateInput = document.getElementById('page-new-event-date');
        if (dateInput) dateInput.value = pendingDate;
        // Fim no mesmo dia do início, em vez da data fixa do HTML.
        const endDateInput = document.getElementById('page-new-event-end-date');
        if (endDateInput) endDateInput.value = pendingDate;
      }
    } else if (!events.length) {
      // Sem evento e sem vir do /cadastro agora — é quem saiu e voltou antes
      // de terminar de criar o primeiro evento. switchView('dashboard') tenta
      // abrir a Visão Geral, mas switchRailTab já bloqueia isso (hasEventCreated
      // é false) e sem mais nada aqui a tela ficava parada no HTML estático
      // da Visão Geral (ex: "Olá, Beatriz!" e estatísticas de mentira). Força
      // a tela de criar o primeiro evento em vez disso, toda vez.
      if (typeof openCreateEventPage === 'function') openCreateEventPage(true, false);
    }
  }
});
