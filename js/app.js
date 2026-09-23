/**
 * LOVE - Event OS (Event Operating System) & Marketplace
 * Controlador com Double-Sidebar (Ícone de Editar + Sub-drawer), Multi-Comemorações com Isolamento Total & Fintech
 */

document.addEventListener('DOMContentLoaded', () => {
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
    modalFakeLogin: document.getElementById('modal-fake-login'),
    
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
      userProfile: document.getElementById('modal-user-profile'),
      userSettings: document.getElementById('modal-user-settings'),
      userFaq: document.getElementById('modal-user-faq'),
      templatePicker: document.getElementById('modal-template-picker'),
      register: document.getElementById('modal-register'),
      verifyCode: document.getElementById('modal-verify-code'),
      cropCover: document.getElementById('modal-crop-cover')
    }
  };

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
      closeContractedVendorDrawer();
      document.body.style.overflow = '';
    }
  });

  // ==========================================
  // 2. GESTÃO DE TELAS & DOUBLE-SIDEBAR
  // ==========================================
  function switchView(viewName) {
    state.currentView = viewName;

    if (viewName === 'dashboard') {
      document.body.classList.add('dashboard-mode');
      if (elements.viewPublic) {
        elements.viewPublic.classList.add('hidden');
        elements.viewPublic.style.display = 'none';
      }
      if (elements.viewDashboard) {
        elements.viewDashboard.classList.remove('hidden');
        elements.viewDashboard.style.display = 'flex';
      }
      const activeEvent = getActiveEvent();
      if (activeEvent) {
        document.body.setAttribute('data-event-theme', activeEvent.type);
      }
      updateAllCelebrationData();
      renderEventsSwitcher();
      switchRailTab('overview'); // Inicia na Home / Visão Geral

      // Aplica tema salvo ao entrar na plataforma logada
      const savedTheme = localStorage.getItem('love-theme') || 'light';
      applyTheme(savedTheme);
    } else {
      document.body.classList.remove('dashboard-mode', 'editor-split-mode', 'rsvp-mode', 'b2b-mode', 'b2b-chat-mode', 'first-access-locked');
      document.body.removeAttribute('data-theme');
      document.documentElement.removeAttribute('data-theme');
      if (elements.viewDashboard) {
        elements.viewDashboard.classList.add('hidden');
        elements.viewDashboard.style.display = 'none';
      }
      if (elements.viewPublic) {
        elements.viewPublic.classList.remove('hidden');
        elements.viewPublic.style.display = 'flex';
      }
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
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
      if (iconLight) iconLight.classList.hidden = false;
      if (logoLight) logoLight.style.display = '';
      if (logoDark) logoDark.classList.add('hidden');
      if (iconLight) iconLight.classList.remove('hidden');
      if (iconDark) iconDark.classList.add('hidden');
      footerLogosLight.forEach(img => img.classList.remove('hidden'));
      footerLogosDark.forEach(img => img.classList.add('hidden'));
    }
  }

  // Carrega tema salvo ou light por padrão
  const currentSavedTheme = localStorage.getItem('love-theme') || 'light';
  applyTheme(currentSavedTheme);

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
        { id: 'about', label: 'Anfitriões' },
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
        { id: 'tables', label: 'Mapear mesas' },
        { id: 'rsvp-settings', label: 'Configurações' }
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
        { id: 'messages', label: 'Mensagens' },
        { id: 'contracted', label: 'Meus contratos' },
        { id: 'insurance', label: 'Benefícios' },
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

    showToast('Crie seu primeiro evento para começar!', '✨');
  }

  function switchRailTab(tabKey) {
    // Se o usuário ainda não criou seu primeiro evento, bloqueia o acesso aos outros menus
    if (!state.hasEventCreated) {
      showToast('Crie seu primeiro evento para desbloquear os menus do painel.', '🔒');
      return;
    }

    state.currentTab = tabKey;

    // Reseta todos os modos especiais do body primeiro
    document.body.classList.remove('editor-split-mode', 'rsvp-mode', 'b2b-mode', 'b2b-chat-mode');

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
        const unreadCount = (activeEvent && activeEvent.messages && activeEvent.messages.length) || 3;

        config.subItems.forEach((item, index) => {
          const btn = document.createElement('div');
          const isFirstActive = (tabKey === 'edit-site' && item.id === (state.activeSubSection || 'home')) || (tabKey !== 'edit-site' && index === 0);
          btn.className = `sub-drawer-item ${isFirstActive ? 'active' : ''}`;
          
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
              document.querySelectorAll('.dashboard-tab-content').forEach(c => c.classList.remove('active'));
              if (item.id === 'tables') {
                const target = document.getElementById('tab-rsvp-tables');
                if (target) target.classList.add('active');
                renderTablesOrganization();
              } else if (item.id === 'rsvp-settings') {
                const target = document.getElementById('tab-rsvp-settings');
                if (target) target.classList.add('active');
                renderRsvpShareSettings();
              } else {
                const target = document.getElementById('tab-rsvp');
                if (target) target.classList.add('active');
                renderGuestsTable('all');
              }
            } else if (tabKey === 'wallet') {
              switchWalletSubSection(item.id, item.label);
            } else if (tabKey === 'b2b') {
              switchB2BView(item.id);
            } else {
              showToast(`Opção "${item.label}" selecionada.`, 'ℹ️');
            }

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
      }
    }

    // 4. Atualiza os conteúdos de página
    document.querySelectorAll('.dashboard-tab-content').forEach(content => {
      content.classList.toggle('active', content.id === `tab-${tabKey}`);
    });

    document.body.classList.remove('editor-split-mode', 'rsvp-mode', 'b2b-mode', 'b2b-chat-mode', 'gifts-mode', 'wallet-mode');

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
      if (document.body.classList.contains('b2b-chat-mode')) {
        switchB2BView('messages');
      } else {
        switchB2BView('explore');
      }
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

  // Listener para o badge de data na Home (redireciona para Informações)
  const homeEventDateBadge = document.getElementById('dash-hub-event-date-badge');
  if (homeEventDateBadge) {
    homeEventDateBadge.addEventListener('click', () => {
      switchRailTab('info-event');
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
        state.activeEventId = evt.id;
        elements.dashHeader.dropdownList.classList.add('hidden');
        document.body.setAttribute('data-event-theme', evt.type);
        updateAllCelebrationData();
        renderEventsSwitcher();
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

  function openCreateEventPage(isFirstAccess = false, goToForm = false) {
    state.currentTab = 'create-event-page';
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
  function updateAllCelebrationData() {
    const activeEvent = getActiveEvent();

    // 1. Header Superior
    if (elements.dashHeader.eventTitle) elements.dashHeader.eventTitle.textContent = activeEvent.title;
    if (elements.dashHeader.countdownBadge) {
      elements.dashHeader.countdownBadge.textContent = `Faltam ${activeEvent.daysLeft} dias`;
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
      const rawName = activeEvent.hostName || activeEvent.title || 'Beatriz';
      const firstName = rawName.split('&')[0].trim().replace(/^(Casamento|Aniversário|Chá de Bebê|Bodas)\s+/i, '');
      hubTitle.innerHTML = `Olá, <span id="dash-hub-user-first-name">${firstName}</span>!`;
    }
    const hubCoupleName = document.getElementById('dash-hub-couple-name');
    if (hubCoupleName) {
      hubCoupleName.textContent = activeEvent.hostName ? activeEvent.hostName.toLowerCase() : 'gabriel & joana';
    }
    const kpiGuestsAdded = document.getElementById('kpi-guests-added-count');
    if (kpiGuestsAdded) {
      kpiGuestsAdded.textContent = `${activeEvent.convidadosConfirmados || 2}`;
    }
    const hubDateText = document.getElementById('dash-hub-event-date-text');
    const hubLocText = document.getElementById('dash-hub-event-location-text');
    const hasLocation = activeEvent.location && activeEvent.location.trim() !== '' && activeEvent.location !== 'Adicionar Local';
    if (hubDateText) hubDateText.textContent = formatEventDateLong(activeEvent.date) || '18 de Outubro de 2025';
    if (hubLocText) hubLocText.textContent = hasLocation ? activeEvent.location : 'Local do evento';
    
    // Atualização dos Convites Enviados
    if (kpiInvites) {
      const invitesCount = activeEvent.convitesEnviados !== undefined 
        ? activeEvent.convitesEnviados 
        : (activeEvent.convidadosConfirmados > 0 ? (activeEvent.convidadosTotal || 210) : 210);
      kpiInvites.textContent = `${invitesCount}`;
    }

    if (kpiArrecadado) kpiArrecadado.textContent = `R$ ${activeEvent.wallet.saldoDisponivel.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
    if (kpiRsvp) kpiRsvp.textContent = `${activeEvent.convidadosConfirmados}`;
    if (kpiRsvpBreakdown) kpiRsvpBreakdown.textContent = `${activeEvent.adultosConfirmados || 160} adultos • ${activeEvent.criancasConfirmadas || 25} crianças confirmadas`;
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
    if (b2bLocationTitle) b2bLocationTitle.textContent = `${loc} & Região`;
    if (b2bEventNameTag) b2bEventNameTag.textContent = activeEvent.title;
    if (b2bPopularCity) b2bPopularCity.textContent = loc;

    // 4. Renderiza dados isolados
    renderEditorForm();
    renderHostGifts();
    renderGuestsTable();
    renderHomeConfirmedGuests();
    renderWalletTransactions();
    renderQuickStartChecklist();
  }

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

    // Avaliação automática de marcos alcançados pela plataforma no evento
    switch (taskId) {
      case 'vendors':
        return Boolean(activeEvent.vendorsFavorited || (activeEvent.fornecedores && activeEvent.fornecedores.length > 0));
      case 'budget':
        return Boolean(
          activeEvent.budgetConfigured || 
          (activeEvent.budgetTotal && activeEvent.budgetTotal > 0) ||
          localStorage.getItem(`love_budget_configured_${activeEvent.id}`) === 'true'
        );
      case 'savethedate':
        return Boolean(activeEvent.saveTheDateChosen || activeEvent.hasSaveTheDate);
      case 'registry':
        return Boolean(activeEvent.registryCompleted || activeEvent.presentesRecebidos > 50);
      case 'website':
        return Boolean(activeEvent.sitePersonalizado || activeEvent.isPublished);
      case 'guests':
        return Boolean(activeEvent.guestsImported || activeEvent.convidadosConfirmados > 200);
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
      if (!saved.includes(taskId)) {
        saved.push(taskId);
        localStorage.setItem(key, JSON.stringify(saved));
      }
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

    // Exibe mensagem quando todas as tarefas estiverem em check (6/6)
    const isAllDone = completedCount >= total;
    if (allDoneBanner) {
      if (isAllDone) {
        allDoneBanner.classList.remove('hidden');
      } else {
        allDoneBanner.classList.add('hidden');
      }
    }

    listEl.innerHTML = quickStartTasksData.map((task) => {
      const isDone = isQuickStartTaskAchieved(task.id, activeEvent);
      const clickAction = isDone
        ? ''
        : (task.id === 'budget'
            ? 'onclick="navigateToBudget()"'
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
      } else if (subId === 'about') {
        title.textContent = 'Anfitriões';
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

    // Oculta todos os sub-formulários e exibe o selecionado
    document.querySelectorAll('.editor-sub-panel').forEach(panel => panel.classList.add('hidden'));
    const targetPanel = document.getElementById(`editor-form-${subId}`);
    if (targetPanel) targetPanel.classList.remove('hidden');

    // Aba "Aparência" usa o construtor visual (Elementos + Prévia); as demais abas usam o editor clássico
    const classicWrapper = document.querySelector('#tab-edit-site > .editor-split-wrapper');
    const builderRoot = document.getElementById('site-builder-root');
    if (subId === 'home') {
      if (classicWrapper) classicWrapper.style.setProperty('display', 'none', 'important');
      if (builderRoot) builderRoot.style.display = '';
    } else {
      if (builderRoot) builderRoot.style.setProperty('display', 'none', 'important');
      if (classicWrapper) classicWrapper.style.setProperty('display', 'flex', 'important');
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
    const reservedSlugs = ['admin', 'login', 'register', 'dashboard', 'api', 'help', 'suporte', 'termos', 'privacidade', 'app', 'beatriz', 'lucas', 'casamento', 'evento'];
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

  function updateFloatingMusicWidget() {
    const widget = document.getElementById('live-preview-floating-music');
    if (!widget) return;

    const firstTrack = builderState.music?.tracks?.find(t => t.url && t.url.trim());
    if (!firstTrack) {
      widget.classList.add('hidden');
      return;
    }
    widget.classList.remove('hidden');

    const musicIcon = document.getElementById('music-note-icon');
    if (musicIcon) {
      if (isMusicPlaying) {
        musicIcon.classList.add('text-emerald-500', 'animate-pulse');
        musicIcon.classList.remove('text-[#537bae]');
        widget.title = 'Pausar música do evento';
      } else {
        musicIcon.classList.remove('text-emerald-500', 'animate-pulse');
        musicIcon.classList.add('text-[#537bae]');
        widget.title = 'Tocar música do evento';
      }
    }
  }

  function toggleLiveMusic() {
    const firstTrack = builderState.music?.tracks?.find(t => t.url && t.url.trim());
    if (!firstTrack) {
      showToast('Insira um link do YouTube válido no campo de música.', '🎵');
      return;
    }

    const iframe = document.getElementById('youtube-audio-iframe');
    const videoId = getYouTubeVideoId(firstTrack.url);

    if (!isMusicPlaying) {
      isMusicPlaying = true;
      if (iframe && videoId) {
        iframe.src = `https://www.youtube.com/embed/${videoId}?autoplay=1&enablejsapi=1&loop=1`;
      }
      showToast('Reproduzindo música do convite... 🎶', '✨');
    } else {
      isMusicPlaying = false;
      if (iframe) {
        iframe.src = '';
      }
      showToast('Música pausada.', '⏸️');
    }
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
      return 'assets/birthday_hero_banner.jpg';
    }
    if (t.includes('baby') || t.includes('bebe') || t.includes('bebê')) {
      return 'assets/advisor_sophia.jpg';
    }
    if (t.includes('bridal') || t.includes('panela')) {
      return 'assets/bouquet_roses.jpg';
    }
    if (t.includes('reveal') || t.includes('revelacao') || t.includes('revelação')) {
      return 'assets/orchid_luxury.jpg';
    }
    if (t.includes('anniversary') || t.includes('bodas')) {
      return 'assets/wedding_sunset_couple.jpg';
    }
    return 'assets/wedding_hero_banner.jpg';
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

    // Renderiza dados detalhados na sub-seção "Informações"
    if (activeEvent.eventDetails) {
      const inputDataDate = document.getElementById('editor-data-date');
      const inputDataTime = document.getElementById('editor-data-time');
      const inputDataLocation = document.getElementById('editor-data-location');
      const inputDataAddress = document.getElementById('editor-data-address');
      const inputDataReference = document.getElementById('editor-data-reference');
      const inputDataDresscode = document.getElementById('editor-data-dresscode');
      const inputDataRecommended = document.getElementById('editor-data-recommended');
      const inputDataNotRecommended = document.getElementById('editor-data-not-recommended');
      const inputDataGeneralInfo = document.getElementById('editor-data-general-info');

      if (inputDataDate) inputDataDate.value = activeEvent.eventDetails.date || activeEvent.date || '';
      if (inputDataTime) inputDataTime.value = activeEvent.eventDetails.time || '16:30';
      if (inputDataLocation) inputDataLocation.value = activeEvent.eventDetails.locationName || activeEvent.location || '';
      if (inputDataAddress) inputDataAddress.value = activeEvent.eventDetails.address || '';
      if (inputDataReference) inputDataReference.value = activeEvent.eventDetails.referencePoint || '';
      if (inputDataDresscode) inputDataDresscode.value = activeEvent.eventDetails.dresscode || '';
      if (inputDataRecommended) inputDataRecommended.value = activeEvent.eventDetails.recommended || '';
      if (inputDataNotRecommended) inputDataNotRecommended.value = activeEvent.eventDetails.notRecommended || '';
      if (inputDataGeneralInfo) inputDataGeneralInfo.value = activeEvent.eventDetails.generalInfo || '';
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

    // Salva Dados detalhados do evento
    if (!activeEvent.eventDetails) activeEvent.eventDetails = {};
    const inputDataDate = document.getElementById('editor-data-date');
    const inputDataTime = document.getElementById('editor-data-time');
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
    if (inputDataLocation && inputLocation.value) {
      activeEvent.eventDetails.locationName = inputDataLocation.value;
      activeEvent.location = inputDataLocation.value;
    }
    if (inputDataAddress) activeEvent.eventDetails.address = inputDataAddress.value;
    if (inputDataReference) activeEvent.eventDetails.referencePoint = inputDataReference.value;
    if (inputDataDresscode) activeEvent.eventDetails.dresscode = inputDataDresscode.value;
    if (inputDataRecommended) activeEvent.eventDetails.recommended = inputDataRecommended.value;
    if (inputDataNotRecommended) activeEvent.eventDetails.notRecommended = inputDataNotRecommended.value;
    if (inputDataGeneralInfo) activeEvent.eventDetails.generalInfo = inputDataGeneralInfo.value;

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
  ['editor-event-title', 'editor-hero-headline', 'editor-data-date', 'editor-data-time', 'editor-data-location', 'editor-data-address', 'editor-data-reference', 'editor-data-dresscode'].forEach(id => {
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
        renderPrefacesList();
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
            <span class="text-[10px] text-slate-400">${g.email || 'convidado@email.com'}</span>
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

  const btnSaveHeaderEdit = document.getElementById('btn-save-header-edit');
  if (btnSaveHeaderEdit) {
    btnSaveHeaderEdit.addEventListener('click', () => {
      saveEditorChanges();
      showToast('Alterações salvas e sincronizadas com o site do evento!', '✨');
      triggerConfetti();
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

  // Listener para Convidar Novo Anfitrião para a Conta
  const formInviteHost = document.getElementById('form-invite-host');
  if (formInviteHost) {
    formInviteHost.addEventListener('submit', (e) => {
      e.preventDefault();
      const inputEmail = document.getElementById('input-host-invite-email');
      const email = inputEmail ? inputEmail.value.trim() : '';
      if (!email) return;

      const hostsList = document.getElementById('hosts-team-list');
      if (hostsList) {
        const initials = email.substring(0, 2).toUpperCase();
        const hostCard = document.createElement('div');
        hostCard.className = 'p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3';
        hostCard.innerHTML = `
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-full bg-emerald-600 text-white font-bold text-sm flex items-center justify-center shadow-sm flex-shrink-0">
              ${initials}
            </div>
            <div>
              <p class="text-xs font-bold text-slate-900">${email.split('@')[0]} <span class="text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100 ml-1">Anfitrião Convidado</span></p>
              <p class="text-[11px] text-slate-500">${email}</p>
            </div>
          </div>
          <span class="text-[11px] font-semibold text-emerald-600 self-start sm:self-auto bg-emerald-50 px-2.5 py-1 rounded-xl border border-emerald-100">
            ● Acesso Total & Saques PIX
          </span>
        `;
        hostsList.appendChild(hostCard);
      }

      showToast(`Convite de co-gestão enviado para ${email}! O anfitrião terá acesso total e poderá realizar saques.`, '📩');
      triggerConfetti();
      if (inputEmail) inputEmail.value = '';
      updateHostsPreview();
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

  function openGiftDrawer() {
    editingGiftId = null;
    const formAddGift = document.getElementById('form-add-gift');
    const drawerTitle = document.getElementById('drawer-gift-heading-title');
    const drawerSub = document.getElementById('drawer-gift-heading-sub');
    const btnSubmitText = document.getElementById('btn-submit-gift-text');
    const giftPreviewImg = document.getElementById('gift-image-preview-img');
    const giftUrlInput = document.getElementById('gift-image-url-input');

    if (formAddGift) formAddGift.reset();
    selectedGiftImage = 'assets/card_lecreuset.jpg';
    if (giftPreviewImg) giftPreviewImg.src = 'assets/card_lecreuset.jpg';
    if (giftUrlInput) giftUrlInput.value = 'assets/card_lecreuset.jpg';
    if (drawerTitle) drawerTitle.textContent = 'Adicionar Presente';
    if (drawerSub) drawerSub.textContent = 'Cadastre um novo presente fictício para sua lista de presentes.';
    if (btnSubmitText) btnSubmitText.textContent = 'Adicionar Presente';

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
    const activeEvent = getActiveEvent();
    const buyerName = gift.buyerName || (gift.received > 0 ? (activeEvent.receivedGifts?.find(r => r.giftTitle === gift.title || r.id === gift.id)?.guestName || 'Convidado') : null);
    if (buyerName) {
      showToast('Presentes já recebidos não podem ser editados.', '🔒');
      return;
    }

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
    const imgSrc = gift.image || 'assets/card_lecreuset.jpg';
    selectedGiftImage = imgSrc;
    if (giftPreviewImg) giftPreviewImg.src = imgSrc;
    if (giftUrlInput) giftUrlInput.value = imgSrc;

    if (drawerTitle) drawerTitle.textContent = 'Editar Presente';
    if (drawerSub) drawerSub.textContent = 'Modifique os detalhes ou o valor deste presente.';
    if (btnSubmitText) btnSubmitText.textContent = 'Salvar Alterações';

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
    const searchInput = document.getElementById('gifts-search-input');
    renderHostGifts(searchInput ? searchInput.value : '');
    showToast(`"${randomItem.title}" adicionado à lista!`, '🎁');
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

    // Filtra presentes caso haja busca ativa
    let filteredGifts = giftList;
    if (searchQuery && searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      filteredGifts = giftList.filter(g => g.title && g.title.toLowerCase().includes(q));
    }

    if (filteredGifts.length === 0) {
      if (searchQuery && searchQuery.trim()) {
        container.innerHTML = `
          <div class="col-span-full py-16 text-center border-r border-b border-zinc-200/80 bg-white">
            <p class="text-xs sm:text-sm text-zinc-500 font-medium font-sans">Nenhum presente encontrado para "${searchQuery}".</p>
          </div>
        `;
      } else {
        container.innerHTML = `
          <div class="col-span-full py-16 text-center space-y-3 border-r border-b border-zinc-200/80 bg-white">
            <p class="text-xs sm:text-sm text-zinc-500 font-medium font-sans">Sua lista de presentes está vazia.</p>
            <button type="button" onclick="openGiftDrawer()" class="btn-brand text-xs py-2 px-3.5 font-semibold rounded-[var(--radius-control,12px)] cursor-pointer">Adicionar presente</button>
          </div>
        `;
      }
      return;
    }

    // 2. Renderiza os itens de presentes reais no estilo da imagem de referência
    filteredGifts.forEach(gift => {
      const receivedRecord = (activeEvent.receivedGifts || []).find(r => r.giftTitle === gift.title || r.id === gift.id) || null;
      const buyerName = gift.buyerName || (gift.received > 0 ? (receivedRecord?.guestName || 'Convidado') : null);
      const isPurchased = Boolean(buyerName);

      const card = document.createElement('div');
      card.className = `group bg-white rounded-[var(--radius-card,10px)] border border-zinc-200/80 shadow-2xs overflow-hidden flex flex-col justify-between transition-all hover:shadow-md ${
        isPurchased ? 'opacity-55 hover:opacity-100 cursor-pointer' : ''
      }`;

      card.innerHTML = `
        <!-- Topo do Card: Imagem com Proporção Ampla e Background Suave -->
        <div class="w-full h-44 sm:h-48 bg-zinc-50 flex items-center justify-center relative overflow-hidden border-b border-zinc-100">
          <img src="${gift.image}" alt="${gift.title}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300">
          
          ${isPurchased ? `
            <!-- Nome do Convidado no canto inferior esquerdo, sem fundo, com sombra para legibilidade -->
            <div class="gift-received-buyer absolute bottom-2 left-3 z-10 text-white text-xs font-bold font-sans max-w-[85%] truncate pointer-events-none" style="text-shadow: 0 1px 3px rgba(0,0,0,0.85), 0 1px 6px rgba(0,0,0,0.6);">
              ${buyerName}
            </div>
          ` : `
            <!-- Botão de Favoritar no topo direito da imagem -->
            <button type="button" class="btn-fav-gift absolute top-2 right-2 w-7 h-7 rounded-full bg-white/90 hover:bg-white text-zinc-300 hover:text-rose-500 flex items-center justify-center transition-colors shadow-2xs cursor-pointer border border-zinc-200/80 z-10" title="Favoritar">
              <svg class="w-3.5 h-3.5 fill-none stroke-currentColor" stroke-width="1.75" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z"/>
              </svg>
            </button>
          `}
        </div>

        <!-- Corpo do Card: Título com Badge de Status, Subtítulo, Valor e Botões -->
        <div class="p-4 sm:p-5 flex flex-col justify-between flex-1 space-y-3.5 text-left">
          <div>
            <div class="flex items-start justify-between gap-2">
              <h4 class="text-sm sm:text-base font-bold text-zinc-900 line-clamp-1 font-sans tracking-tight" title="${gift.title}">
                ${gift.title}
              </h4>
              ${isPurchased ? '' : `
                <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#F8F9FA] text-emerald-700 border border-[#EAEAEA] font-sans shrink-0">
                  Ativo
                </span>
              `}
            </div>
            <p class="text-xs text-zinc-400 font-medium font-sans mt-0.5">
              ${gift.category || 'Presente fictício'}
            </p>
          </div>

          <div>
            <p class="text-base sm:text-lg font-bold text-zinc-900 font-sans">
              R$ ${parseFloat(gift.price).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>

          <!-- Linha de Ações: Apenas disponível se o presente NÃO foi recebido -->
          ${!isPurchased ? `
            <div class="flex items-center gap-2 pt-1 mt-auto">
              <button type="button" class="btn-edit-gift flex-1 py-2 px-3 rounded-[var(--radius-control,12px)] border border-zinc-200 hover:border-zinc-300 hover:bg-zinc-50 text-xs font-semibold text-zinc-700 transition-all font-sans cursor-pointer text-center">
                Editar
              </button>
              <button type="button" class="btn-delete-gift p-2 rounded-[var(--radius-control,12px)] border border-zinc-200 hover:border-rose-300 hover:bg-rose-50 text-zinc-400 hover:text-rose-600 transition-all cursor-pointer shrink-0 flex items-center justify-center" title="Excluir presente" data-gift-id="${gift.id}">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0"/>
                </svg>
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
          if (isPurchased) {
            showToast('Presentes já recebidos não podem ser editados.', '🔒');
            return;
          }
          openGiftDrawerForEdit(gift);
        });
      }

      // Evento de exclusão do presente
      const btnDelete = card.querySelector('.btn-delete-gift');
      if (btnDelete) {
        btnDelete.addEventListener('click', (e) => {
          e.stopPropagation();
          if (isPurchased) {
            showToast('Presentes já recebidos não podem ser apagados.', '🔒');
            return;
          }
          activeEvent.giftList = activeEvent.giftList.filter(g => g.id !== gift.id);
          const searchInput = document.getElementById('gifts-search-input');
          renderHostGifts(searchInput ? searchInput.value : '');
          showToast(`Presente "${gift.title}" excluído da lista.`, '🗑️');
        });
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

      // Abre o recado deixado pelo convidado ao comprar o presente
      if (isPurchased) {
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
        <div class="col-span-full py-12 text-center bg-white rounded-3xl border border-slate-200 p-8 space-y-2">
          <span class="text-3xl block">🎁</span>
          <h4 class="font-bold text-slate-800 text-sm">Nenhum presente recebido ainda</h4>
          <p class="text-xs text-slate-400">Quando os convidados presentearem você pela página pública, eles aparecerão aqui com os valores e recados.</p>
        </div>
      `;
      return;
    }

    list.forEach(item => {
      const card = document.createElement('div');
      card.className = 'bg-white rounded-2xl border border-slate-200 shadow-sm p-4 flex flex-col justify-between gap-3 hover:shadow-md transition-shadow';
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
    let selectedGiftImage = 'assets/card_lecreuset.jpg';
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
            if (giftPreviewImg) giftPreviewImg.src = event.target.result;
            if (giftUrlInput) giftUrlInput.value = event.target.result;
          };
          reader.readAsDataURL(file);
        }
      });
    }

    formAddGift.addEventListener('submit', (e) => {
      e.preventDefault();
      const activeEvent = getActiveEvent();
      if (!activeEvent.giftList) activeEvent.giftList = [];

      const title = document.getElementById('gift-title-input')?.value?.trim() || 'Presente Especial';
      const price = parseFloat(document.getElementById('gift-price-input')?.value) || 250;
      const description = document.getElementById('gift-description-input')?.value?.trim() || '';
      const image = giftUrlInput?.value || giftPreviewImg?.src || selectedGiftImage;

      if (editingGiftId) {
        const giftItem = activeEvent.giftList.find(g => g.id === editingGiftId);
        if (giftItem) {
          giftItem.title = title;
          giftItem.description = description;
          giftItem.price = price;
          giftItem.image = image;
        }
        editingGiftId = null;
        formAddGift.reset();
        selectedGiftImage = 'assets/card_lecreuset.jpg';
        if (giftPreviewImg) giftPreviewImg.src = 'assets/card_lecreuset.jpg';
        if (giftUrlInput) giftUrlInput.value = 'assets/card_lecreuset.jpg';
        closeGiftDrawer();
        renderHostGifts();
        updateAllCelebrationData();
        showToast(`Presente "${title}" atualizado com sucesso!`, '✅');
        return;
      }

      activeEvent.giftList.unshift({
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
        contributorsCount: 0
      });

      activeEvent.presentesRecebidos = (activeEvent.presentesRecebidos || 0) + 1;
      formAddGift.reset();
      selectedGiftImage = 'assets/card_lecreuset.jpg';
      if (giftPreviewImg) giftPreviewImg.src = 'assets/card_lecreuset.jpg';
      if (giftUrlInput) giftUrlInput.value = 'assets/card_lecreuset.jpg';
      
      closeGiftDrawer();
      closeGiftModal();
      renderHostGifts();
      updateAllCelebrationData();
      showToast(`Presente "${title}" adicionado à lista!`, '🎁');
      triggerConfetti();
    });
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

  // Alternar quem paga a taxa (repassar vs assumir)
  document.querySelectorAll('.gift-fee-card').forEach(card => {
    card.addEventListener('click', () => {
      document.querySelectorAll('.gift-fee-card').forEach(c => {
        c.classList.remove('active', 'border-2', 'border-rose-400', 'bg-rose-50/20');
        c.classList.add('border', 'border-slate-200', 'bg-white');
        const dot = c.querySelector('.fee-radio-indicator span');
        const circle = c.querySelector('.fee-radio-indicator');
        if (dot) dot.className = 'w-2.5 h-2.5 rounded-full bg-transparent';
        if (circle) circle.className = 'fee-radio-indicator w-5 h-5 rounded-full border-2 border-slate-300 flex items-center justify-center flex-shrink-0 mt-0.5 bg-white';
      });
      card.classList.add('active', 'border-2', 'border-rose-400', 'bg-rose-50/20');
      card.classList.remove('border-slate-200', 'bg-white');
      const dot = card.querySelector('.fee-radio-indicator span');
      const circle = card.querySelector('.fee-radio-indicator');
      if (dot) dot.className = 'w-2.5 h-2.5 rounded-full bg-rose-500';
      if (circle) circle.className = 'fee-radio-indicator w-5 h-5 rounded-full border-2 border-rose-500 flex items-center justify-center flex-shrink-0 mt-0.5 bg-white';

      const choice = card.getAttribute('data-fee-choice');
      if (choice === 'guest') {
        showToast('Taxa de 3,89% será repassada aos convidados.', '💳');
      } else {
        showToast('Você assumirá a taxa de 3,89% dos presentes recebidos.', '💼');
      }
    });
  });

  // Alternar parcelamento sem juros
  document.querySelectorAll('.installment-card').forEach(card => {
    card.addEventListener('click', () => {
      document.querySelectorAll('.installment-card').forEach(c => {
        c.classList.remove('active', 'border-2', 'border-indigo-600', 'bg-indigo-50/30', 'text-indigo-950');
        c.classList.add('border-slate-200', 'bg-white');
      });
      card.classList.add('active', 'border-2', 'border-indigo-600', 'bg-indigo-50/30', 'text-indigo-950');
      card.classList.remove('border-slate-200', 'bg-white');

      const installments = parseInt(card.getAttribute('data-installments')) || 1;
      const simText = document.getElementById('sim-installments-text');
      if (simText) {
        if (installments === 1) {
          simText.textContent = '1x de R$ 600,00 à vista';
        } else {
          const installmentVal = (600 / installments).toFixed(2).replace('.', ',');
          simText.textContent = `${installments} parcelas de R$ ${installmentVal} sem juros`;
        }
      }
    });
  });

  // Salvar configurações da lista de presentes
  const btnSaveGiftSettings = document.getElementById('btn-save-gift-settings');
  if (btnSaveGiftSettings) {
    btnSaveGiftSettings.addEventListener('click', () => {
      showToast('Configurações da lista de presentes salvas com sucesso!', '✨');
      triggerConfetti();
    });
  }

  // ==========================================
  // 7. LISTA DE CONVIDADOS & RSVP (Layout idêntico ao Casar.com)
  // ==========================================
  let currentRsvpFilter = 'all';
  let rsvpPageSize = 15;
  let rsvpCurrentPage = 1;

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
    const totalCount = activeEvent.guests.length;
    const confirmedCount = activeEvent.guests.filter(g => g.status === 'confirmed').length;
    const declinedCount = activeEvent.guests.filter(g => g.status === 'declined').length;
    const pendingCount = activeEvent.guests.filter(g => g.status === 'pending').length;

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
    }).sort((a, b) => (a.name || '').localeCompare(b.name || '', 'pt-BR', { sensitivity: 'base' }));

    const footerCountEl = document.getElementById('rsvp-footer-count');
    if (footerCountEl) {
      footerCountEl.textContent = `(${filteredGuests.length})`;
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

    // Um convidado com acompanhantes nunca aparece com nomes concatenados
    // ("Fulano & Beltrano") numa única linha — cada pessoa ganha sua própria
    // linha, sempre com um nome único, compartilhando status e mesa da mesma reserva.
    pageGuests.forEach(guest => {
      const gifts = guest.giftsBought || [];
      const giftsTotal = gifts.reduce((acc, g) => acc + (g.amount || 0), 0);
      const giftLabel = giftsTotal > 0
        ? `R$ ${giftsTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
        : '—';

      const attendees = [{ name: guest.name, isPrimary: true }];
      (guest.companionsNames || []).forEach(comp => {
        const cleanName = (comp || '').replace(/\s*\([^)]*\)\s*$/, '').trim();
        if (cleanName) attendees.push({ name: cleanName, isPrimary: false });
      });

      attendees.forEach(attendee => {
        const row = document.createElement('tr');
        row.className = 'cursor-pointer group';
        row.innerHTML = `
          <td>
            <span class="font-medium text-zinc-900 group-hover:text-[#537bae] transition-colors block truncate">${attendee.name}</span>
          </td>
          <td>
            <span class="text-xs sm:text-sm font-medium text-zinc-700 whitespace-nowrap">${attendee.isPrimary ? formatGuestTitleLabel(guest) : '—'}</span>
          </td>
          <td>
            <span class="text-xs sm:text-sm font-medium text-zinc-700 whitespace-nowrap">${extractTableNumber(guest.table)}</span>
          </td>
          <td>
            <span class="text-xs sm:text-sm font-medium text-zinc-700 whitespace-nowrap">${attendee.isPrimary ? giftLabel : '—'}</span>
          </td>
          <td>
            <div class="flex items-center">
              ${statusBadges[guest.status] || guest.status}
            </div>
          </td>
        `;

        row.addEventListener('click', () => {
          openAddGuestDrawer(guest.id);
        });

        listEl.appendChild(row);
      });
    });
  }

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

  let rsvpSettingsSelectedVendorId = null;

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

  function renderRsvpShareSettings() {
    const listContainer = document.getElementById('rsvp-share-vendors-list');
    const panel = document.getElementById('rsvp-share-permissions-panel');
    if (!listContainer || !panel) return;
    const vendors = (window.LOVE_DATA && Array.isArray(window.LOVE_DATA.contractedVendors)) ? window.LOVE_DATA.contractedVendors : [];

    listContainer.innerHTML = '';

    if (!vendors.length) {
      listContainer.innerHTML = `
        <div class="py-8 px-3 text-center border border-zinc-200/80 rounded-2xl">
          <p class="text-xs text-zinc-500 font-medium font-sans">Nenhum fornecedor contratado ainda.</p>
        </div>
      `;
      panel.innerHTML = '';
      return;
    }

    if (!rsvpSettingsSelectedVendorId || !vendors.some(v => v.id === rsvpSettingsSelectedVendorId)) {
      rsvpSettingsSelectedVendorId = vendors[0].id;
    }

    vendors.forEach(v => {
      const isActive = v.id === rsvpSettingsSelectedVendorId;
      const row = document.createElement('button');
      row.type = 'button';
      row.className = `w-full flex items-center gap-2.5 p-2.5 rounded-xl text-left transition-colors cursor-pointer ${isActive ? 'bg-zinc-100' : 'hover:bg-zinc-50'}`;
      row.innerHTML = `
        <img src="${v.image || ''}" alt="${v.name}" class="w-9 h-9 rounded-lg object-cover flex-shrink-0 border border-zinc-100">
        <div class="min-w-0 flex-1">
          <p class="text-sm font-bold ${isActive ? 'text-zinc-900' : 'text-zinc-700'} truncate font-sans">${v.name}</p>
          <p class="text-[11px] text-zinc-400 truncate font-sans">${v.category || ''}</p>
        </div>
      `;
      row.addEventListener('click', () => {
        rsvpSettingsSelectedVendorId = v.id;
        renderRsvpShareSettings();
      });
      listContainer.appendChild(row);
    });

    renderRsvpVendorPermissionsPanel(vendors.find(v => v.id === rsvpSettingsSelectedVendorId));
  }

  function renderRsvpVendorPermissionsPanel(vendor) {
    const panel = document.getElementById('rsvp-share-permissions-panel');
    if (!panel || !vendor) return;
    const activeEvent = getActiveEvent();
    const perms = getVendorGuestListPermissions(activeEvent, vendor.id);

    panel.innerHTML = `
      <div class="flex items-center gap-3 pb-4 mb-1 border-b border-zinc-100">
        <img src="${vendor.image || ''}" alt="${vendor.name}" class="w-11 h-11 rounded-xl object-cover border border-zinc-100 flex-shrink-0">
        <div class="min-w-0">
          <h3 class="text-base font-bold text-zinc-900 font-sans truncate">${vendor.name}</h3>
          <p class="text-xs text-zinc-400 font-sans">${vendor.category || ''}</p>
        </div>
      </div>
      <div id="rsvp-permissions-list"></div>
    `;

    const list = panel.querySelector('#rsvp-permissions-list');
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
        renderRsvpVendorPermissionsPanel(vendor);
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

  // Observação — histórico de comentários (igual aos comentários de tarefas no quadro B2B)
  const NO_DIETARY_FILLERS = ['não informado', 'nenhuma', 'nenhuma restrição', 'nenhuma restrição alimentar cadastrada'];

  // Nomes individuais dos anfitriões, extraídos de "Beatriz & Lucas" (ou
  // "Beatriz & Lucas (Pais do Theo)") -> ["Beatriz", "Lucas"].
  function getEventHostNames() {
    const activeEvent = getActiveEvent();
    const raw = (activeEvent && activeEvent.hostName) ? activeEvent.hostName.split('(')[0].trim() : '';
    return raw.split('&').map(n => n.trim()).filter(Boolean);
  }

  // Rótulo da coluna/campo "Título" na lista de convidados: "Pai/Beatriz",
  // ou só "Pai" quando não há anfitrião associado (ou só um anfitrião no evento).
  function formatGuestTitleLabel(guest) {
    if (!guest.relationshipTitle) return '—';
    if (guest.relationshipHost && getEventHostNames().length > 1) {
      return `${guest.relationshipTitle}/${guest.relationshipHost}`;
    }
    return guest.relationshipTitle;
  }

  function getGuestCommentAuthorName() {
    const activeEvent = getActiveEvent();
    const raw = (activeEvent && activeEvent.hostName) ? activeEvent.hostName.split('(')[0].trim() : '';
    return raw || 'Você';
  }

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
  // DRAWER LATERAL: CONVIDADO (Adicionar Convidado / editar convidado existente)
  // ==========================================
  function renderGuestGifts(guest) {
    const totalGiftsEl = document.getElementById('guest-drawer-total-gifts');
    const giftsListEl = document.getElementById('guest-drawer-gifts-list');
    const gifts = guest.giftsBought || [];

    const totalSpent = gifts.reduce((acc, curr) => acc + (curr.amount || 0), 0);
    if (totalGiftsEl) {
      totalGiftsEl.textContent = totalSpent > 0 ? `Total: R$ ${totalSpent.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '';
    }

    if (!giftsListEl) return;
    giftsListEl.innerHTML = '';
    if (gifts.length === 0) {
      giftsListEl.innerHTML = `
        <div class="p-4 rounded-2xl bg-slate-50 border border-dashed border-slate-200 text-center space-y-1">
          <p class="text-xs font-bold text-slate-700">Ainda não comprou nenhum presente</p>
          <p class="text-[11px] text-slate-400">Este convidado ainda não presenteou pela lista online.</p>
        </div>
      `;
      return;
    }
    gifts.forEach(g => {
      const item = document.createElement('div');
      item.className = 'p-3.5 rounded-2xl border border-slate-200 bg-white shadow-sm flex items-start gap-3';
      item.innerHTML = `
        <img src="${g.image}" class="w-14 h-14 rounded-xl object-cover border border-slate-100 flex-shrink-0" alt="${g.giftTitle}">
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-1.5 flex-wrap mb-0.5">
            <span class="text-[9px] font-bold text-zinc-600 bg-zinc-100 px-2 py-0.5 rounded-full">${g.type === 'real' ? 'Produto Real' : 'Resgate em Dinheiro'}</span>
            <span class="text-[10px] text-slate-400">${g.date}</span>
          </div>
          <h5 class="text-xs font-bold text-slate-900 truncate">${g.giftTitle}</h5>
          <div class="text-xs font-black text-zinc-700 mt-0.5">R$ ${g.amount.toFixed(2).replace('.', ',')} (${g.method})</div>
          ${g.message ? `<div class="mt-1.5 p-2 rounded-xl bg-slate-50 border border-slate-100 text-[11px] text-slate-600 italic">"${g.message}"</div>` : ''}
        </div>
      `;
      giftsListEl.appendChild(item);
    });
  }

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

    let guest;
    if (guestId) {
      guest = activeEvent.guests.find(g => g.id === guestId);
      if (!guest) return;
      isNewGuestDraft = false;
    } else {
      guest = {
        id: `g-${Date.now()}`,
        name: '',
        companions: 0,
        companionsNames: [],
        phone: '',
        table: 'Mesa a Definir',
        status: 'pending',
        giftsBought: [],
        observationComments: [],
        relationshipTitle: '',
        relationshipHost: ''
      };
      activeEvent.guests.unshift(guest);
      isNewGuestDraft = true;
    }

    activeDrawerGuestId = guest.id;
    if (titleEl) titleEl.textContent = guestId ? 'Editar Convidado' : 'Adicionar Convidado';
    const saveBtn = document.getElementById('btn-save-guest');
    if (saveBtn) saveBtn.textContent = guestId ? 'Salvar Alterações' : 'Salvar Convidado';
    document.getElementById('guest-name-input').value = guest.name || '';
    document.getElementById('guest-phone-input').value = guest.phone || '';

    const titleHostSelect = document.getElementById('guest-title-host-input');
    if (titleHostSelect) {
      const hostNames = getEventHostNames();
      titleHostSelect.innerHTML = '<option value="">—</option>' +
        hostNames.map(name => `<option value="${name}">${name}</option>`).join('');
      titleHostSelect.value = guest.relationshipHost || '';
    }
    const titleSelect = document.getElementById('guest-title-input');
    if (titleSelect) titleSelect.value = guest.relationshipTitle || '';

    (guest.companionsNames || []).forEach(name => addCompanionRow(name));

    const removeBtn = document.getElementById('btn-remove-guest');
    if (removeBtn) removeBtn.hidden = !guestId;

    renderGuestComments(guest);
    renderGuestGifts(guest);

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
  const btnCloseAddGuestDrawer = document.getElementById('btn-close-add-guest-drawer');
  const addGuestDrawerBackdrop = document.getElementById('add-guest-drawer-backdrop');
  if (btnCloseAddGuestDrawer) btnCloseAddGuestDrawer.addEventListener('click', closeAddGuestDrawer);
  if (addGuestDrawerBackdrop) addGuestDrawerBackdrop.addEventListener('click', closeAddGuestDrawer);

  const btnRemoveGuest = document.getElementById('btn-remove-guest');
  if (btnRemoveGuest) {
    btnRemoveGuest.addEventListener('click', () => {
      if (!activeDrawerGuestId) return;
      const activeEvent = getActiveEvent();
      const idx = activeEvent.guests.findIndex(g => g.id === activeDrawerGuestId);
      if (idx === -1) return;
      const name = activeEvent.guests[idx].name;
      activeEvent.guests.splice(idx, 1);
      isNewGuestDraft = false;
      closeAddGuestDrawer();
      renderGuestsTable();
      updateAllCelebrationData();
      showToast(`Convidado ${name} removido da lista.`, '🗑️');
    });
  }

  // "+ Adicionar acompanhante" — insere uma nova linha de nome de acompanhante
  function addCompanionRow(value = '') {
    const list = document.getElementById('guest-companions-list');
    if (!list) return;
    const row = document.createElement('div');
    row.className = 'flex items-center gap-2 guest-companion-row';
    row.innerHTML = `
      <input type="text" placeholder="Nome do acompanhante" class="field-input guest-companion-name-input" value="${value.replace(/"/g, '&quot;')}">
      <button type="button" class="btn-remove-companion-row w-9 h-9 rounded-xl border border-zinc-200 hover:border-rose-300 hover:bg-rose-50 text-zinc-400 hover:text-rose-600 flex items-center justify-center transition-colors cursor-pointer shrink-0" title="Remover acompanhante">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12"/></svg>
      </button>
    `;
    row.querySelector('.btn-remove-companion-row').addEventListener('click', () => row.remove());
    list.appendChild(row);
    if (!value) row.querySelector('input').focus();
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
            <svg class="w-6 h-6" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6ZM3.75 15.75A2.25 2.25 0 0 1 6 13.5h2.25a2.25 2.25 0 0 1 2.25 2.25V18a2.25 2.25 0 0 1-2.25 2.25H6A2.25 2.25 0 0 1 3.75 18v-2.25ZM13.5 6a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 6v2.25A2.25 2.25 0 0 1 18 10.5h-2.25a2.25 2.25 0 0 1-2.25-2.25V6ZM13.5 15.75a2.25 2.25 0 0 1 2.25-2.25H18a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-2.25A2.25 2.25 0 0 1 13.5 18v-2.25Z"/></svg>
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
              <svg class="w-4 h-4 pointer-events-none" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0"/></svg>
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
  const FLOORPLAN_ELEMENT_TYPES = [
    { type: 'mesa', label: 'Mesa', icon: '🪑' }
  ];
  const FLOORPLAN_TYPE_META = {};
  FLOORPLAN_ELEMENT_TYPES.forEach(t => { FLOORPLAN_TYPE_META[t.type] = t; });
  const FLOORPLAN_MAX_SEATS = 24;

  let floorplanActiveTableId = null;

  function getFloorPlanElements() {
    const activeEvent = getActiveEvent();
    const eventId = (activeEvent && activeEvent.id) || 'default';
    const key = `love_floorplan_${eventId}`;
    const stored = localStorage.getItem(key);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          // Limpa elementos de formatos antigos/desconhecidos (ex.: mesas de uma
          // versão anterior sem "type" válido, que apareciam na planta com ícone "?").
          const cleaned = parsed.filter(el => el && FLOORPLAN_TYPE_META[el.type]);
          if (cleaned.length !== parsed.length) localStorage.setItem(key, JSON.stringify(cleaned));
          return cleaned;
        }
      } catch (e) {}
    }
    return [];
  }

  function saveFloorPlanElements(elements) {
    const activeEvent = getActiveEvent();
    const eventId = (activeEvent && activeEvent.id) || 'default';
    localStorage.setItem(`love_floorplan_${eventId}`, JSON.stringify(elements));
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

  // Um assento fica verde quando o nome digitado bate (case-insensitive)
  // com um convidado da lista cujo RSVP está confirmado.
  function isFloorPlanSeatConfirmed(name) {
    if (!name || !name.trim()) return false;
    const activeEvent = getActiveEvent();
    const guests = (activeEvent && activeEvent.guests) || [];
    const match = guests.find(g => g.name && g.name.trim().toLowerCase() === name.trim().toLowerCase());
    return !!(match && match.status === 'confirmed');
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
    const activeEvent = getActiveEvent();
    let guests = (activeEvent && activeEvent.guests) || [];
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
      card.className = `floorplan-guest-card${isSeated ? ' is-seated' : ''}`;
      card.draggable = !isSeated;
      card.dataset.guestName = g.name || '';

      if (g.status === 'confirmed') {
        card.insertAdjacentHTML('beforeend', '<span class="floorplan-guest-card-check-badge"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="m4.5 12.75 6 6 9-13.5"/></svg></span>');
      } else {
        const dot = document.createElement('span');
        dot.className = 'floorplan-guest-card-dot';
        card.appendChild(dot);
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

  function renderFloorPlanCanvas() {
    const canvas = document.getElementById('floorplan-canvas');
    const emptyHint = document.getElementById('floorplan-empty-hint');
    if (!canvas) return;
    const elements = getFloorPlanElements();

    canvas.querySelectorAll('.floorplan-el').forEach(el => el.remove());
    if (emptyHint) emptyHint.style.display = elements.length ? 'none' : 'flex';

    elements.forEach(elData => {
      const meta = FLOORPLAN_TYPE_META[elData.type] || { label: elData.type, icon: '❓' };
      const el = document.createElement('div');
      const isMesa = elData.type === 'mesa';
      el.className = `floorplan-el${isMesa ? ' is-mesa' : ''}`;
      el.style.left = `${elData.x || 0}px`;
      el.style.top = `${elData.y || 0}px`;
      el.dataset.elId = elData.id;

      if (isMesa) {
        const core = document.createElement('div');
        core.className = 'floorplan-mesa-core';

        const numberEl = document.createElement('span');
        numberEl.className = 'floorplan-table-number';
        numberEl.textContent = `Mesa ${elData.number}`;
        core.appendChild(numberEl);

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
        const containerSize = 172;
        const ringRadius = 63;
        for (let i = 0; i < seats; i++) {
          const angle = (2 * Math.PI * i / seats) - Math.PI / 2;
          const seatX = containerSize / 2 + ringRadius * Math.cos(angle);
          const seatY = containerSize / 2 + ringRadius * Math.sin(angle);
          const guestName = (seatNames[i] || '').trim();
          const confirmed = isFloorPlanSeatConfirmed(guestName);
          const seatDot = document.createElement('div');
          let seatState = 'is-empty';
          if (guestName) seatState = confirmed ? 'is-confirmed' : 'is-assigned';
          seatDot.className = `floorplan-seat-dot ${seatState}`;
          seatDot.style.left = `${seatX}px`;
          seatDot.style.top = `${seatY}px`;
          if (guestName) {
            seatDot.title = guestName;
            seatDot.textContent = initialsFromName(guestName);
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
      } else {
        const iconEl = document.createElement('span');
        iconEl.className = 'floorplan-el-emoji';
        iconEl.textContent = meta.icon;
        el.appendChild(iconEl);

        const labelEl = document.createElement('span');
        labelEl.className = 'floorplan-el-label';
        labelEl.textContent = meta.label;
        el.appendChild(labelEl);
      }

      wireFloorPlanElementDrag(el, elData);
      canvas.appendChild(el);
    });
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

      const onMouseMove = (moveEvt) => {
        const dx = moveEvt.clientX - startX;
        const dy = moveEvt.clientY - startY;
        if (Math.abs(dx) > 3 || Math.abs(dy) > 3) moved = true;
        const rect = canvas.getBoundingClientRect();
        const w = el.offsetWidth, h = el.offsetHeight;
        const newLeft = Math.max(0, Math.min(origLeft + dx, rect.width - w));
        const newTop = Math.max(0, Math.min(origTop + dy, rect.height - h));
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
        } else {
          openFloorplanTableModal(elData.id);
        }
      };

      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
    });
  }

  // Cria uma nova mesa direto na planta (posições em cascata para não empilhar
  // uma exatamente sobre a outra) — usado pelo botão "Adicionar Mesa".
  function addFloorPlanTableViaButton() {
    const canvas = document.getElementById('floorplan-canvas');
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const shapeSize = 152;
    const elements = getFloorPlanElements();
    const mesaCount = elements.filter(item => item.type === 'mesa').length;

    const step = 28;
    const cascade = elements.length % 8;
    const maxX = Math.max(16, rect.width - shapeSize - 16);
    const maxY = Math.max(16, rect.height - shapeSize - 16);
    const x = Math.min(16 + cascade * step, maxX);
    const y = Math.min(16 + cascade * step, maxY);

    elements.push({
      id: `fp-${Date.now()}`,
      type: 'mesa',
      number: mesaCount + 1,
      name: '',
      seats: 1,
      seatNames: [''],
      x, y
    });
    saveFloorPlanElements(elements);
    renderFloorPlanCanvas();
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
      const shapeSize = isMesa ? 172 : 84;
      const shapeHeightOffset = isMesa ? 86 : 32;
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
    resizeSeatNames(t);

    const titleEl = document.getElementById('floorplan-table-modal-title');
    if (titleEl) titleEl.textContent = `Mesa ${t.number}`;
    const nameInput = document.getElementById('floorplan-el-name-input');
    if (nameInput) nameInput.value = t.name || '';
    const seatsValueEl = document.getElementById('floorplan-seats-value');
    if (seatsValueEl) seatsValueEl.textContent = parseInt(t.seats) || 1;
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
      row.className = 'floorplan-seat-assignment-row';

      const nameEl = document.createElement('span');
      nameEl.className = 'floorplan-seat-assignment-name';
      nameEl.textContent = name;
      row.appendChild(nameEl);

      const rightWrap = document.createElement('div');
      rightWrap.className = 'floorplan-seat-assignment-right';

      if (isFloorPlanSeatConfirmed(name)) {
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

    const removeBtn = document.getElementById('btn-floorplan-remove');
    if (removeBtn) {
      removeBtn.addEventListener('click', () => {
        const els = getFloorPlanElements().filter(item => item.id !== floorplanActiveTableId);
        saveFloorPlanElements(els);
        renderFloorPlanCanvas();
        renderFloorPlanGuestCards();
        closeModal(document.getElementById('modal-floorplan-table'));
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

    const btnAddTable = document.getElementById('btn-open-add-table-modal');
    if (btnAddTable) btnAddTable.addEventListener('click', addFloorPlanTableViaButton);
  }

  // Salvar Convidado (drawer compartilhado: cria um novo ou atualiza o que está sendo editado)
  const formAddGuest = document.getElementById('form-add-guest');
  if (formAddGuest) {
    formAddGuest.addEventListener('submit', (e) => {
      e.preventDefault();
      const activeEvent = getActiveEvent();
      const guest = activeEvent.guests.find(g => g.id === activeDrawerGuestId);
      if (!guest) return;

      const name = document.getElementById('guest-name-input').value.trim();
      if (!name) return;
      const phone = document.getElementById('guest-phone-input').value || '(11) 99999-9999';
      const companionsNames = Array.from(document.querySelectorAll('.guest-companion-name-input'))
        .map(input => input.value.trim())
        .filter(Boolean);

      const wasNew = isNewGuestDraft;
      guest.name = name;
      guest.phone = phone;
      guest.companionsNames = companionsNames;
      guest.companions = companionsNames.length;
      guest.relationshipTitle = document.getElementById('guest-title-input').value || '';
      guest.relationshipHost = document.getElementById('guest-title-host-input').value || '';

      if (wasNew) {
        activeEvent.totalConvidados = (activeEvent.totalConvidados || 0) + (1 + companionsNames.length);
      }

      isNewGuestDraft = false;
      closeAddGuestDrawer();
      renderGuestsTable();
      updateAllCelebrationData();
      showToast(wasNew ? `Convidado ${name} adicionado à lista de ${activeEvent.title}!` : `Convidado ${name} atualizado!`, '👤');
    });
  }

  // ==========================================
  // ==========================================
  // 8. FINANCEIRO: CARTEIRA DIGITAL, ORÇAMENTO & EXTRATO
  // ==========================================
  function switchWalletSubSection(subId, subLabel) {
    document.body.classList.add('wallet-mode');
    const title = document.getElementById('wallet-header-title');
    const desc = document.getElementById('wallet-header-desc');
    const headerActions = document.getElementById('wallet-header-actions');

    if (headerActions) {
      headerActions.classList.add('hidden');
    }

    if (title) {
      if (subId === 'wallet-digital') {
        title.textContent = 'Carteira Digital';
        if (desc) {
          desc.textContent = 'O saldo disponível é o valor já recebido em presentes, pronto para saque via PIX.';
          desc.classList.remove('hidden');
        }
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
        if (desc) {
          desc.textContent = 'Histórico completo de entradas de presentes, saques PIX realizados e conciliação financeira.';
          desc.classList.remove('hidden');
        }
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

  function renderWalletTransactions() {
    const listEl = document.getElementById('wallet-transactions-list');
    const balanceDisponivel = document.getElementById('wallet-balance-disponivel');
    const balanceArrecadado = document.getElementById('wallet-balance-arrecadado');
    const balanceSacado = document.getElementById('wallet-balance-sacado');

    const activeEvent = getActiveEvent();

    if (balanceDisponivel) balanceDisponivel.textContent = `R$ ${activeEvent.wallet.saldoDisponivel.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
    if (balanceArrecadado) balanceArrecadado.textContent = `R$ ${(activeEvent.wallet.saldoDisponivel + activeEvent.wallet.totalSacado).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
    if (balanceSacado) balanceSacado.textContent = `R$ ${activeEvent.wallet.totalSacado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;

    if (!listEl) return;
    listEl.innerHTML = '';

    activeEvent.wallet.transactions.forEach(tx => {
      const isNegative = tx.amount < 0;
      const row = document.createElement('tr');
      row.className = 'border-b border-zinc-100 hover:bg-zinc-50/80 transition-colors text-xs sm:text-sm font-sans';
      row.innerHTML = `
        <td class="py-3.5 pl-6 sm:pl-8 pr-4">
          <div class="font-bold text-zinc-900 font-sans">${tx.title}</div>
          <div class="text-[11px] text-zinc-500 font-sans">${tx.guest} • ${tx.method}</div>
        </td>
        <td class="py-3.5 px-4 text-zinc-500 text-xs font-sans">${tx.date}</td>
        <td class="py-3.5 px-4 font-sans">
          <span class="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold font-sans ${tx.status === 'Disponível' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-blue-50 text-blue-700 border border-blue-200'}">
            ● ${tx.status}
          </span>
        </td>
        <td class="py-3.5 pl-4 pr-6 sm:pr-8 text-right font-extrabold font-sans ${isNegative ? 'text-zinc-800' : 'text-emerald-600'}">
          ${isNegative ? '-' : '+'} R$ ${Math.abs(tx.amount).toFixed(2).replace('.', ',')}
        </td>
      `;
      listEl.appendChild(row);
    });
  }

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
    switchRailTab('wallet');
    if (elements.drawerSubItemsList) {
      elements.drawerSubItemsList.querySelectorAll('.sub-drawer-item').forEach(b => {
        b.classList.toggle('active', b.textContent.includes('Orçamento'));
      });
    }
    switchWalletSubSection('wallet-budget', 'Orçamento');
  };

  window.navigateToTables = function() {
    switchRailTab('rsvp');
    if (elements.drawerSubItemsList) {
      elements.drawerSubItemsList.querySelectorAll('.sub-drawer-item').forEach(b => {
        b.classList.toggle('active', b.textContent.includes('Mapear mesas'));
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

  // Carrossel promocional do dashboard ("High quality, not high cost") —
  // troque/adicione itens neste array para o carrossel ganhar mais slides.
  const dashboardPromoSlides = [
    { src: 'assets/banner_high_quality.jpg', alt: 'High quality, not high cost - Designs that will wow your guests without blowing your budget.' }
  ];

  function initDashboardPromoCarousel() {
    const track = document.getElementById('dashboard-promo-track');
    const dotsWrap = document.getElementById('dashboard-promo-dots');
    if (!track) return;

    track.innerHTML = dashboardPromoSlides.map((s, i) => `
      <div class="dashboard-promo-slide${i === 0 ? ' active' : ''}" onclick="navigateToStationery()" title="Ver modelos de convites e papelaria">
        <img src="${s.src}" alt="${s.alt}">
      </div>
    `).join('');

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

  window.navigateToChecklist = function() {
    const guideWidget = document.getElementById('quick-start-guide-widget');
    if (guideWidget) {
      guideWidget.scrollIntoView({ behavior: 'smooth', block: 'center' });
      guideWidget.classList.add('ring-2', 'ring-[#537bae]', 'ring-offset-2');
      setTimeout(() => {
        guideWidget.classList.remove('ring-2', 'ring-[#537bae]', 'ring-offset-2');
      }, 2000);
    }
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
          const hubLocText = document.getElementById('dash-hub-event-location-text');
          if (hubLocText) hubLocText.textContent = activeEv.location;
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

  function getBudgetExpenses() {
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
      localStorage.setItem(`love_budget_expenses_${activeEv.id}`, JSON.stringify(expenses));
    } catch (e) {}
  }

  function renderBudgetExpensesTable() {
    const tbody = document.getElementById('budget-expenses-tbody');
    if (!tbody) return;

    const expenses = getBudgetExpenses();
    let totalEstimated = 0;
    let totalActual = 0;
    let totalPaid = 0;

    tbody.innerHTML = expenses.map((exp) => {
      const estimatedNum = Number(exp.estimated) || 0;
      const actualNum = Number(exp.actual) || 0;
      const paidNum = Number(exp.paid) || 0;

      totalEstimated += estimatedNum;
      totalActual += actualNum;
      totalPaid += paidNum;

      const hasVendor = exp.vendor && exp.vendor.trim() !== '';

      return `
        <tr class="hover:bg-zinc-50/70 transition-colors group">
          <!-- Item -->
          <td class="py-3.5 pl-6 sm:pl-8 pr-4">
            <div class="font-bold text-zinc-900 font-sans">${exp.item}</div>
            <div class="text-[10px] text-zinc-400 font-normal uppercase tracking-wider mt-0.5 font-sans">${exp.category || 'Geral'}</div>
          </td>

          <!-- Fornecedor -->
          <td class="py-3.5 px-4 text-xs font-sans">
            ${hasVendor 
              ? `<div class="font-semibold text-zinc-800 flex items-center gap-1.5">
                   <span>${exp.vendor}</span>
                   <span class="text-[9px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200/60">Contrato</span>
                 </div>`
              : `<button type="button" onclick="openAddExpenseModalWithItem('${exp.id}', '${encodeURIComponent(exp.item)}', '${encodeURIComponent(exp.category || 'Local')}')" class="text-xs font-semibold text-zinc-700 hover:text-[#537bae] underline decoration-zinc-300 underline-offset-4 cursor-pointer transition-colors font-sans">
                   + Adicionar fornecedor
                 </button>`
            }
          </td>

          <!-- Estimado -->
          <td class="py-3.5 px-4 font-semibold text-zinc-600 font-sans">
            ${estimatedNum > 0 ? `R$ ${estimatedNum.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '—'}
          </td>

          <!-- Valor Real -->
          <td class="py-3.5 px-4 font-bold ${actualNum > 0 ? 'text-zinc-900' : 'text-zinc-400'} font-sans">
            ${actualNum > 0 ? `R$ ${actualNum.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '—'}
          </td>

          <!-- Valor Pago -->
          <td class="py-3.5 px-4 font-sans">
            ${paidNum > 0 
              ? `<span class="font-bold text-emerald-700 bg-emerald-50/80 px-2.5 py-1 rounded-lg border border-emerald-200/60 inline-block text-xs">
                   R$ ${paidNum.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                 </span>`
              : `<span class="text-zinc-400 text-xs font-normal">—</span>`
            }
          </td>

          <!-- Ações -->
          <td class="py-3.5 pl-4 pr-6 sm:pr-8 text-right">
            <div class="inline-flex items-center gap-1.5 opacity-40 group-hover:opacity-100 transition-opacity">
              <button type="button" onclick="showToast('Lembrete configurado para ${exp.item}!', '🔔')" class="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-colors cursor-pointer" title="Lembrete">
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0"/></svg>
              </button>
              <button type="button" onclick="deleteBudgetExpense('${exp.id}')" class="p-1.5 rounded-lg text-zinc-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer" title="Excluir item">
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0"/></svg>
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join('');

    // Atualiza footer da tabela (TFoot)
    const tfootCount = document.getElementById('budget-tfoot-count');
    const tfootEstimated = document.getElementById('budget-tfoot-estimated');
    const tfootActual = document.getElementById('budget-tfoot-actual');
    const tfootPaid = document.getElementById('budget-tfoot-paid');
    const tfootDue = document.getElementById('budget-tfoot-due');

    if (tfootCount) tfootCount.textContent = `${expenses.length} ${expenses.length === 1 ? 'item' : 'itens'}`;
    if (tfootEstimated) tfootEstimated.textContent = `R$ ${totalEstimated.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
    if (tfootActual) tfootActual.textContent = `R$ ${totalActual.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
    if (tfootPaid) tfootPaid.textContent = `R$ ${totalPaid.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
    
    const due = Math.max(0, totalActual - totalPaid);
    if (tfootDue) tfootDue.textContent = `R$ ${due.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} a vencer`;

    // Atualiza KPIs do topo
    const activeEv = getActiveEvent();
    let savedTotal = activeEv && activeEv.budgetTotal;
    if (!savedTotal && activeEv) {
      const stored = localStorage.getItem(`love_budget_total_${activeEv.id}`);
      if (stored) savedTotal = parseInt(stored, 10);
    }
    if (!savedTotal) savedTotal = totalEstimated || 85000;

    const kpiTotal = document.getElementById('kpi-budget-total');
    const kpiSpent = document.getElementById('kpi-budget-spent');
    const kpiPaidTotal = document.getElementById('kpi-budget-paid-total');

    if (kpiTotal) kpiTotal.textContent = `R$ ${savedTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
    if (kpiSpent) kpiSpent.textContent = `R$ ${totalActual.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
    if (kpiPaidTotal) kpiPaidTotal.textContent = `R$ ${totalPaid.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
  }

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

    const openDrawer = () => {
      if (form) form.reset();
      if (suggestionsBox) suggestionsBox.classList.add('hidden');
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

    if (btnOpen) btnOpen.addEventListener('click', openDrawer);
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

        const newItem = {
          id: `exp-${Date.now()}`,
          item: itemName,
          vendor: inputVendor ? inputVendor.value.trim() : '',
          category: selectCat ? selectCat.value : 'Local',
          estimated: parseMoney(inputEstimated),
          actual: parseMoney(inputActual),
          paid: parseMoney(inputPaid)
        };

        const expenses = getBudgetExpenses();
        expenses.unshift(newItem);
        saveBudgetExpenses(expenses);

        renderBudgetExpensesTable();
        closeDrawer();
        form.reset();
        showToast(`Despesa "${newItem.item}" adicionada com sucesso!`, '💰');
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
    if (inputName) {
      if (!inputName.value) {
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

  // 9.4 Autocomplete de Locais Parceiros Admin
  const locationInput = document.getElementById('page-new-event-location-name');
  const partnerDropdown = document.getElementById('dropdown-partner-venues');
  const inputNumber = document.getElementById('page-new-event-number');
  const inputComplement = document.getElementById('page-new-event-complement');

  if (locationInput && partnerDropdown) {
    locationInput.addEventListener('focus', () => {
      partnerDropdown.classList.remove('hidden');
    });

    locationInput.addEventListener('input', (e) => {
      const term = e.target.value.toLowerCase().trim();
      const options = partnerDropdown.querySelectorAll('.venue-option');
      let hasMatch = false;
      options.forEach(opt => {
        const text = opt.textContent.toLowerCase();
        const matches = text.includes(term);
        opt.style.display = matches ? 'flex' : 'none';
        if (matches) hasMatch = true;
      });
      partnerDropdown.classList.toggle('hidden', !hasMatch && term.length > 0);
    });

    partnerDropdown.querySelectorAll('.venue-option').forEach(opt => {
      opt.addEventListener('click', () => {
        const venue = opt.getAttribute('data-venue');
        const addr = opt.getAttribute('data-addr');
        const num = opt.getAttribute('data-num');
        const comp = opt.getAttribute('data-comp');

        if (locationInput) locationInput.value = venue || addr;
        if (inputNumber) inputNumber.value = num || '';
        if (inputComplement) inputComplement.value = comp || '';

        partnerDropdown.classList.add('hidden');
        showToast(`Espaço parceiro selecionado: ${venue}`, '📍');
      });
    });

    document.addEventListener('click', (e) => {
      if (!locationInput.contains(e.target) && !partnerDropdown.contains(e.target)) {
        partnerDropdown.classList.add('hidden');
      }
    });
  }

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

  // 9.6 Submissão do Formulário (Continuar Ajustes)
  if (formCreatePage) {
    formCreatePage.addEventListener('submit', (e) => {
      e.preventDefault();
      const name = (pageNewName && pageNewName.value.trim()) || 'Meu Evento';
      const startDate = document.getElementById('page-new-event-date') ? document.getElementById('page-new-event-date').value : '2026-08-28';
      const startTime = document.getElementById('page-new-event-start-time') ? document.getElementById('page-new-event-start-time').value : '16:30';
      const slug = (pageNewSlug && pageNewSlug.value.trim()) || 'meu-evento';
      const locName = (locationInput && locationInput.value.trim()) || 'São Paulo - SP';
      const desc = document.getElementById('page-new-event-description') ? document.getElementById('page-new-event-description').value.trim() : '';

      const newEvt = {
        id: `evt-${Date.now()}`,
        type: selectedNewType,
        title: name,
        hostName: name,
        date: startDate,
        time: startTime,
        location: locName,
        daysLeft: 90,
        slug: slug,
        publicUrl: `https://love.com.br/${slug}`,
        coverImage: createdCoverImageSrc || getDefaultCoverForEventType(selectedNewType, name),
        theme: themeSelect ? themeSelect.options[themeSelect.selectedIndex].text : 'Minimalista',
        colorAccent: '#537bae',
        totalArrecadado: 0.00,
        convidadosConfirmados: 0,
        totalConvidados: 50,
        presentesRecebidos: 0,
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
        },
        giftList: [],
        guests: [],
        messages: []
      };

      setSidebarLocked(false);
      state.hasEventCreated = true;
      state.events.unshift(newEvt);
      state.activeEventId = newEvt.id;

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
  // Abrir Modal de Login (Entrar)
  document.querySelectorAll('.btn-trigger-login').forEach(btn => {
    btn.addEventListener('click', () => {
      openModal(elements.modalFakeLogin);
    });
  });

  // Abrir Modal de Cadastro (Criar grátis)
  document.querySelectorAll('.btn-trigger-register').forEach(btn => {
    btn.addEventListener('click', () => {
      openModal(elements.modals.register);
    });
  });

  // Alternar entre Login e Cadastro
  const btnLoginToRegister = document.getElementById('btn-login-to-register');
  if (btnLoginToRegister) {
    btnLoginToRegister.addEventListener('click', () => {
      closeModal(elements.modalFakeLogin);
      openModal(elements.modals.register);
    });
  }

  const btnRegisterToLogin = document.getElementById('btn-register-to-login');
  if (btnRegisterToLogin) {
    btnRegisterToLogin.addEventListener('click', () => {
      closeModal(elements.modals.register);
      openModal(elements.modalFakeLogin);
    });
  }

  // 10.1 Login com Email e Senha (Conta Existente)
  const formLoginEmail = document.getElementById('form-login-email');
  if (formLoginEmail) {
    formLoginEmail.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = document.getElementById('login-email-input').value.trim();
      const password = document.getElementById('login-password-input').value;
      const submitBtn = document.getElementById('btn-do-email-login');

      submitBtn.disabled = true;
      const { error } = await supabaseClient.auth.signInWithPassword({ email, password });
      submitBtn.disabled = false;

      if (error) {
        showToast('E-mail ou senha incorretos.', '⚠️');
        return;
      }

      setSidebarLocked(false);
      closeModal(elements.modalFakeLogin);
      window.location.reload();
    });
  }

  // 10.2 / 10.2b / 10.3 / 10.3b — Login e Cadastro social (Google/Apple):
  // login social real não está configurado ainda (precisa habilitar os
  // provedores no painel do Supabase Auth). Por ora, orienta a usar e-mail/senha.
  ['btn-google-login', 'btn-apple-login', 'btn-google-register', 'btn-apple-register'].forEach(id => {
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
      const name = document.getElementById('register-name-input').value.trim();
      const email = document.getElementById('register-email-input').value.trim();
      const password = document.getElementById('register-password-input').value;
      const submitBtn = document.getElementById('btn-register-submit');

      submitBtn.disabled = true;
      const { error } = await supabaseClient.auth.signUp({
        email,
        password,
        options: { data: { role: 'cliente', couple_name: name } }
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
  let currentB2BCategory = 'advisors';
  let currentB2BSort = 'recommended';
  let activeB2BItemId = 'venue-villa-bisutti';
  let b2bSearchQuery = '';
  let currentB2BView = 'explore';

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

    // 12.2 Filtros de Categoria em Pills Horizontais
    const b2bPills = document.querySelectorAll('.b2b-category-pill');
    b2bPills.forEach(pill => {
      pill.addEventListener('click', () => {
        b2bPills.forEach(p => {
          p.classList.remove('border-[#537bae]', 'text-[#537bae]', 'font-semibold', 'active');
          p.classList.add('border-transparent', 'text-zinc-500', 'font-medium');
        });
        pill.classList.remove('border-transparent', 'text-zinc-500', 'font-medium');
        pill.classList.add('border-[#537bae]', 'text-[#537bae]', 'font-semibold', 'active');

        currentB2BCategory = pill.getAttribute('data-category') || 'all';
        renderB2BExplore();
      });
    });

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

    // 12.4 Fechar Modal Mobile
    const btnCloseMobileModal = document.getElementById('btn-close-b2b-mobile-modal');
    const mobileModal = document.getElementById('drawer-b2b-mobile-modal');
    if (btnCloseMobileModal && mobileModal) {
      btnCloseMobileModal.addEventListener('click', () => {
        mobileModal.classList.add('hidden');
        mobileModal.classList.remove('flex');
      });
      mobileModal.addEventListener('click', (e) => {
        if (e.target === mobileModal) {
          mobileModal.classList.add('hidden');
          mobileModal.classList.remove('flex');
        }
      });
    }

    // 12.5 Inicialização do Chat Messenger B2B & Render Inicial
    initB2BChatHandlers();
    renderB2BExplore();
  }

  function renderB2BExplore() {
    const listContainer = document.getElementById('b2b-cards-list-container');
    const resultsCountEl = document.getElementById('b2b-results-count');

    if (!listContainer) return;
    listContainer.innerHTML = '';

    let items = [];
    let categoryName = 'fornecedores';

    if (currentB2BCategory === 'all') {
      const allVenues = (window.LOVE_DATA.venues || []).map(v => ({ ...v, type: 'venue' }));
      const allAdvisors = (window.LOVE_DATA.advisors || []).map(a => ({ ...a, type: 'advisor' }));
      const allPhoto = (window.LOVE_DATA.photo || []).map(p => ({ ...p, type: 'photo' }));
      const allBuffet = (window.LOVE_DATA.buffet || []).map(b => ({ ...b, type: 'buffet' }));
      items = [...allVenues, ...allAdvisors, ...allPhoto, ...allBuffet];
      categoryName = 'todos os fornecedores';
    } else if (currentB2BCategory === 'venues') {
      items = (window.LOVE_DATA.venues || []).map(v => ({ ...v, type: 'venue' }));
      categoryName = 'locais & espaços';
    } else if (currentB2BCategory === 'advisors' || currentB2BCategory === 'assessoria') {
      items = (window.LOVE_DATA.advisors || []).map(a => ({ ...a, type: 'advisor' }));
      categoryName = 'assessoria';
    } else if (currentB2BCategory === 'cerimonial') {
      items = (window.LOVE_DATA.advisors || []).map(a => ({ ...a, type: 'advisor' }));
      categoryName = 'cerimonial';
    } else if (currentB2BCategory === 'decor') {
      items = (window.LOVE_DATA.venues || []).slice(0, 3).map(v => ({ ...v, type: 'decor', category: 'Decoração' }));
      categoryName = 'decoração';
    } else if (currentB2BCategory === 'photo') {
      items = (window.LOVE_DATA.photo || []).map(p => ({ ...p, type: 'photo' }));
      categoryName = 'fotografia';
    } else if (currentB2BCategory === 'buffet') {
      items = (window.LOVE_DATA.buffet || []).map(b => ({ ...b, type: 'buffet' }));
      categoryName = 'buffets & gastronomia';
    } else if (currentB2BCategory === 'favorites') {
      const favVenues = (window.LOVE_DATA.venues || []).filter(v => v.isFavorite).map(v => ({ ...v, type: 'venue' }));
      const favAdvisors = (window.LOVE_DATA.advisors || []).filter(a => a.isFavorite).map(a => ({ ...a, type: 'advisor' }));
      const favPhoto = (window.LOVE_DATA.photo || []).filter(p => p.isFavorite).map(p => ({ ...p, type: 'photo' }));
      const favBuffet = (window.LOVE_DATA.buffet || []).filter(b => b.isFavorite).map(b => ({ ...b, type: 'buffet' }));
      items = [...favVenues, ...favAdvisors, ...favPhoto, ...favBuffet];
      categoryName = 'itens favoritados';
    }

    if (b2bSearchQuery) {
      const q = b2bSearchQuery.toLowerCase();
      items = items.filter(item => 
        (item.name && item.name.toLowerCase().includes(q)) ||
        (item.location && item.location.toLowerCase().includes(q)) ||
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
      resultsCountEl.innerHTML = `<strong class="font-semibold text-zinc-900">${items.length}</strong> ${categoryName} encontrados em São Paulo`;
    }

    if (items.length === 0) {
      listContainer.innerHTML = `<div class="p-12 text-center bg-white rounded-2xl border border-zinc-200/80 text-sm text-zinc-500">Nenhum fornecedor encontrado nesta categoria.</div>`;
      return;
    }

    items.forEach(item => {
      let tagText = item.tag || 'Destaque';
      let tagBg = 'bg-emerald-50 text-emerald-700';

      if (item.type === 'advisor') {
        tagText = item.tag || 'Assessoria & Cerimonial';
        tagBg = 'bg-sky-50 text-sky-700';
      } else if (item.type === 'photo') {
        tagText = item.tag || 'Foto & Cinema';
        tagBg = 'bg-purple-50 text-purple-700';
      } else if (item.type === 'buffet') {
        tagText = item.tag || 'Gastronomia';
        tagBg = 'bg-amber-50 text-amber-700';
      } else if (item.type === 'venue') {
        tagText = item.tag || 'Espaço para Casamento';
        tagBg = 'bg-emerald-50 text-emerald-700';
      }

      const recommendPct = Math.round(((item.rating || 4.9) / 5) * 100);
      const avatarSrc = item.avatar || item.image;
      const matchedConversation = (b2bConversationsData || []).find(c => c.id === item.chatId);
      const isOnline = !!(matchedConversation && matchedConversation.online);
      const ringRadius = 9;
      const ringCircumference = 2 * Math.PI * ringRadius;
      const ringOffset = ringCircumference * (1 - recommendPct / 100);

      const card = document.createElement('div');
      card.id = `card-${item.id}`;
      card.className = 'b2b-item-card group bg-white rounded-2xl border border-zinc-200/80 p-6 shadow-xs hover:shadow-md transition-all flex flex-col md:flex-row gap-6 items-stretch w-full cursor-pointer';

      card.innerHTML = `
        <!-- Imagem prévia da empresa -->
        <div class="btn-open-supplier-gallery relative w-full md:w-80 h-48 rounded-xl overflow-hidden bg-zinc-100 flex-shrink-0 cursor-pointer">
          <img src="${item.image}" alt="${item.name}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300">
        </div>

        <div class="flex-1 flex flex-col justify-between min-w-0">
          <div>
            <div class="flex items-start justify-between gap-3 flex-wrap">
              <div class="flex items-center gap-2.5 min-w-0">
                <div class="relative shrink-0">
                  <img src="${avatarSrc}" alt="" class="w-11 h-11 rounded-full object-cover border border-zinc-200">
                  <span class="absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white ${isOnline ? 'bg-emerald-500' : 'bg-zinc-300'}" title="${isOnline ? 'Online' : 'Offline'}"></span>
                </div>
                <div class="min-w-0">
                  <h4 class="text-base sm:text-lg font-bold text-zinc-900 truncate font-sans tracking-tight group-hover:text-[#537bae] transition-colors" title="${item.name}">
                    ${item.name}
                  </h4>
                  <p class="text-sm text-zinc-400 font-medium font-sans">${item.location || item.neighborhood || ''}</p>
                </div>
              </div>

              <button type="button" class="btn-toggle-card-fav w-9 h-9 rounded-full border border-zinc-200 hover:border-rose-300 hover:bg-rose-50 text-zinc-300 hover:text-rose-500 flex items-center justify-center transition-colors cursor-pointer shrink-0" title="Favoritar">
                <svg class="w-4 h-4 ${item.isFavorite ? 'fill-[#c7305b] text-[#c7305b]' : 'fill-none text-zinc-300'} stroke-current" stroke-width="1.75" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z"/>
                </svg>
              </button>
            </div>

            <p class="text-sm text-zinc-500 mt-3 leading-relaxed line-clamp-2 font-sans">${item.description || item.about || ''}</p>
          </div>

          <div class="flex flex-wrap items-center justify-between gap-4 pt-3.5 mt-3.5 border-t border-zinc-100">
            <div class="flex items-center gap-2.5 text-sm">
              <div class="relative w-10 h-10 shrink-0">
                <svg class="w-10 h-10 -rotate-90" viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="${ringRadius}" fill="none" stroke="#E4E4E7" stroke-width="2.5"></circle>
                  <circle cx="12" cy="12" r="${ringRadius}" fill="none" stroke="#ebf4ff" stroke-width="2.5" stroke-linecap="round" stroke-dasharray="${ringCircumference.toFixed(2)}" stroke-dashoffset="${ringOffset.toFixed(2)}"></circle>
                </svg>
                <svg class="w-5 h-5 absolute inset-0 m-auto text-[#ebf4ff]" fill="currentColor" viewBox="0 0 24 24"><path d="M5 16L3 5l5.5 5L12 4l3.5 6L21 5l-2 11H5zm0 2h14v2H5v-2z"/></svg>
              </div>
              <span class="font-semibold text-zinc-700">${recommendPct}% de recomendação</span>
            </div>

            <div class="flex items-center gap-2.5">
              <button type="button" class="btn-message-supplier btn-secondary">
                <svg fill="none" stroke="currentColor" stroke-width="2.15" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.15" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75"/></svg>
                <span>Mensagem</span>
              </button>
              <button type="button" class="btn-hire-supplier px-5 py-2.5 rounded-xl bg-[#333333] hover:bg-[#222222] text-white text-xs sm:text-sm font-bold transition-all shadow-xs cursor-pointer">
                Contratar
              </button>
            </div>
          </div>
        </div>
      `;

      card.querySelector('.btn-open-supplier-gallery')?.addEventListener('click', (e) => {
        e.stopPropagation();
        openSupplierGalleryModal(item);
      });

      card.querySelector('.btn-toggle-card-fav')?.addEventListener('click', (e) => {
        e.stopPropagation();
        const sourceKey = { venue: 'venues', decor: 'venues', advisor: 'advisors', photo: 'photo', buffet: 'buffet' }[item.type];
        const source = sourceKey && (window.LOVE_DATA[sourceKey] || []).find(x => x.id === item.id);
        if (source) source.isFavorite = !source.isFavorite;
        item.isFavorite = !item.isFavorite;
        renderB2BExplore();
      });

      card.querySelector('.btn-message-supplier')?.addEventListener('click', (e) => {
        e.stopPropagation();
        switchB2BView('messages', item.chatId || 'mariana-assessoria');
      });

      card.querySelector('.btn-hire-supplier')?.addEventListener('click', (e) => {
        e.stopPropagation();
        openB2BMobileModal(item, item.type || 'venue');
      });

      card.addEventListener('click', () => {
        openB2BMobileModal(item, item.type || 'venue');
      });

      listContainer.appendChild(card);
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

  function renderB2BAdvisorDetails(adv) {
    const pane = document.getElementById('b2b-right-pane-details');
    if (!pane) return;

    pane.innerHTML = `
      <div class="h-full flex flex-col">
        <!-- Cover & Header -->
        <div class="relative h-44 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 flex-shrink-0">
          <img src="${adv.portfolioPhotos[0] || adv.image}" alt="Capa" class="w-full h-full object-cover opacity-30 mix-blend-overlay">
          <div class="absolute -bottom-7 left-6 flex items-end gap-4">
            <img src="${adv.avatar}" alt="${adv.name}" class="w-20 h-20 rounded-2xl object-cover border-4 border-white shadow-md bg-white">
          </div>
          <div class="absolute top-3 right-3 flex items-center gap-2">
            <span class="bg-white/95 backdrop-blur-md px-3 py-1 rounded-full text-xs font-semibold text-blue-700 shadow-sm border border-white/50">
              ${adv.badge}
            </span>
          </div>
        </div>

        <!-- Conteúdo do Dossiê -->
        <div class="flex-1 overflow-y-auto p-6 pt-9 space-y-6">
          
          <!-- Título & Ações Principais -->
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-100 pb-5">
            <div>
              <h3 class="text-xl font-bold text-zinc-900">${adv.name}</h3>
              <p class="text-xs text-zinc-500">${adv.company} • ${adv.location}</p>
              <div class="flex items-center gap-2 mt-1.5 text-xs">
                <span class="text-amber-500 font-bold">★ ${adv.rating}</span>
                <span class="text-zinc-400">(${adv.reviewsCount} avaliações)</span>
                <span class="text-zinc-300">•</span>
                <span class="text-emerald-600 font-semibold">${adv.weddingsCount} casamentos organizados</span>
              </div>
            </div>

            <!-- Botão Direto para o Chat Messenger -->
            <div class="flex items-center gap-2">
              <button type="button" class="btn-open-chat-with-advisor bg-[#537bae] hover:bg-blue-600 text-white px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 shadow-sm transition-all cursor-pointer" data-chat-id="${adv.chatId}">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/></svg>
                <span>Conversar no Chat</span>
              </button>
            </div>
          </div>

          <!-- Sobre & Metodologia -->
          <div class="space-y-2">
            <h4 class="text-xs font-bold text-zinc-900 uppercase tracking-wider">Sobre a Assessoria</h4>
            <p class="text-xs text-zinc-600 leading-relaxed">${adv.about}</p>
            <div class="flex flex-wrap gap-1.5 pt-2">
              ${adv.specialties.map(s => `<span class="bg-blue-50 text-blue-700 text-[11px] font-medium px-2.5 py-1 rounded-lg border border-blue-100">${s}</span>`).join('')}
            </div>
          </div>

          <!-- Pacotes & Investimento -->
          <div class="space-y-3">
            <h4 class="text-xs font-bold text-zinc-900 uppercase tracking-wider">Pacotes de Serviços & Preços</h4>
            <div class="grid grid-cols-1 gap-2.5">
              ${adv.packages.map(pkg => `
                <div class="p-3.5 rounded-xl border border-zinc-200 bg-zinc-50/50 flex items-center justify-between gap-3">
                  <div>
                    <h5 class="text-xs font-bold text-zinc-900">${pkg.name}</h5>
                    <p class="text-[11px] text-zinc-500">${pkg.desc}</p>
                  </div>
                  <span class="text-xs font-black text-zinc-900 whitespace-nowrap">${pkg.price}</span>
                </div>
              `).join('')}
            </div>
          </div>

          <!-- Galeria de Fotos Recentes -->
          <div class="space-y-2">
            <h4 class="text-xs font-bold text-zinc-900 uppercase tracking-wider">Galeria de Eventos Recentes</h4>
            <div class="grid grid-cols-3 gap-2">
              ${adv.portfolioPhotos.map(photo => `
                <img src="${photo}" alt="Portfólio" class="w-full h-20 rounded-xl object-cover border border-zinc-200 shadow-2xs hover:scale-105 transition-transform">
              `).join('')}
            </div>
          </div>

          <!-- Depoimentos Reais -->
          <div class="space-y-2 pb-4">
            <h4 class="text-xs font-bold text-zinc-900 uppercase tracking-wider">Depoimentos de Casais Love</h4>
            <div class="space-y-2">
              ${adv.reviews.map(rev => `
                <div class="p-3 rounded-xl bg-amber-50/60 border border-amber-100 text-xs space-y-1">
                  <div class="flex items-center justify-between">
                    <span class="font-bold text-zinc-900">${rev.author}</span>
                    <span class="text-amber-500">${rev.stars}</span>
                  </div>
                  <p class="text-zinc-600 italic leading-relaxed">"${rev.text}"</p>
                </div>
              `).join('')}
            </div>
          </div>

        </div>
      </div>
    `;

    // Conecta o botão de abrir chat direto
    const btnChat = pane.querySelector('.btn-open-chat-with-advisor');
    if (btnChat) {
      btnChat.addEventListener('click', () => {
        const chatId = btnChat.getAttribute('data-chat-id') || 'mariana-assessoria';
        switchB2BView('messages', chatId);
      });
    }
  }

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

  function openSupplierGalleryModal(item) {
    const modal = document.getElementById('modal-supplier-gallery');
    if (!modal) return;

    supplierGalleryPhotos = (item.portfolioPhotos && item.portfolioPhotos.length) ? item.portfolioPhotos : [item.image];
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
    openB2BMobileModal(supplierGalleryItem, supplierGalleryItem.type || 'venue');
  });

  function openB2BMobileModal(item, type) {
    const modal = document.getElementById('drawer-b2b-mobile-modal');
    const titleEl = document.getElementById('b2b-mobile-modal-title');
    const contentEl = document.getElementById('b2b-mobile-modal-content');
    if (!modal || !contentEl) return;

    if (titleEl) titleEl.textContent = item.name;

    if (type === 'venue') {
      contentEl.innerHTML = `
        <div class="space-y-4">
          <img src="${item.image}" alt="${item.name}" class="w-full h-44 rounded-2xl object-cover border border-zinc-200">
          <div>
            <div class="flex items-center justify-between">
              <h4 class="font-bold text-zinc-900 text-base">${item.name}</h4>
              <span class="text-sm font-black text-[#537bae]">${item.price}</span>
            </div>
            <p class="text-xs text-zinc-500">${item.location}</p>
            <div class="flex items-center gap-1 text-xs text-amber-500 font-bold mt-1">
              ★ ${item.rating} <span class="text-zinc-400 font-normal">(${item.reviewsCount} avaliações)</span>
            </div>
          </div>
          <p class="text-xs text-zinc-600 leading-relaxed">${item.description}</p>
          <div class="grid grid-cols-2 gap-2 text-xs">
            <div class="p-2.5 bg-zinc-50 rounded-xl border border-zinc-100">
              <span class="text-[10px] text-zinc-400 block font-medium">Capacidade</span>
              <span class="font-bold text-zinc-800">${item.guests} convidados</span>
            </div>
            <div class="p-2.5 bg-zinc-50 rounded-xl border border-zinc-100">
              <span class="text-[10px] text-zinc-400 block font-medium">Área Total</span>
              <span class="font-bold text-zinc-800">${item.area}</span>
            </div>
          </div>
          <button type="button" class="btn-mobile-chat-cta w-full bg-[#537bae] text-white py-3 rounded-xl font-bold text-xs shadow-md cursor-pointer">
            Conversar com o Espaço no Chat
          </button>
        </div>
      `;

      const btnChat = contentEl.querySelector('.btn-mobile-chat-cta');
      if (btnChat) {
        btnChat.addEventListener('click', () => {
          modal.classList.add('hidden');
          modal.classList.remove('flex');
          switchB2BView('messages', 'villa-bisutti');
        });
      }
    } else {
      contentEl.innerHTML = `
        <div class="space-y-4">
          <div class="flex items-center gap-3">
            <img src="${item.avatar}" alt="${item.name}" class="w-14 h-14 rounded-2xl object-cover border border-zinc-200">
            <div>
              <h4 class="font-bold text-zinc-900 text-base">${item.name}</h4>
              <p class="text-xs text-zinc-500">${item.role}</p>
              <span class="text-xs font-bold text-blue-700">${item.startingPrice}</span>
            </div>
          </div>
          <p class="text-xs text-zinc-600 leading-relaxed">${item.about}</p>
          <button type="button" class="btn-mobile-chat-cta w-full bg-[#537bae] text-white py-3 rounded-xl font-bold text-xs shadow-md cursor-pointer">
            Abrir Conversa no Chat
          </button>
        </div>
      `;

      const btnChat = contentEl.querySelector('.btn-mobile-chat-cta');
      if (btnChat) {
        btnChat.addEventListener('click', () => {
          modal.classList.add('hidden');
          modal.classList.remove('flex');
          switchB2BView('messages', item.chatId || 'mariana-assessoria');
        });
      }
    }

    modal.classList.remove('hidden');
    modal.classList.add('flex');
  }

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
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
  }

  async function loadB2BConversationsData() {
    if (!window.loveClienteSession) { b2bConversationsData = []; return; }

    const { data: rows, error } = await supabaseClient
      .from('conversations')
      .select('id, last_message_at, fornecedor:fornecedores(id, company_name, avatar_url), messages(id, text, created_at, sender_role, attachment_url, attachment_type)')
      .eq('cliente_id', window.loveClienteSession.user.id)
      .order('last_message_at', { ascending: false });

    if (error || !rows) { b2bConversationsData = []; return; }

    b2bConversationsData = rows.map(row => {
      const msgs = (row.messages || []).slice().sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
      const last = msgs[msgs.length - 1];
      return {
        id: row.id,
        name: (row.fornecedor && row.fornecedor.company_name) || 'Fornecedor',
        category: '',
        avatar: (row.fornecedor && row.fornecedor.avatar_url) || 'assets/theme_garden.jpg',
        online: false,
        unread: 0,
        lastMessage: last ? (last.text || (last.attachment_url ? '[Anexo]' : '')) : 'Nova conversa',
        time: last ? formatB2BChatTime(last.created_at) : '',
        messages: msgs.map(m => ({
          sender: m.sender_role === 'cliente' ? 'me' : 'them',
          text: m.text,
          time: formatB2BChatTime(m.created_at),
          attachment: m.attachment_url ? { type: m.attachment_type || 'doc', url: m.attachment_url, name: 'Anexo' } : null
        }))
      };
    });
  }

  // Cria (ou reaproveita) a conversa com um fornecedor real e a torna a ativa.
  async function openConversationWithFornecedor(fornecedorId) {
    if (!window.loveClienteSession) return;
    const clienteId = window.loveClienteSession.user.id;

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

    await loadB2BConversationsData();
    activeB2BConversationId = convId;
    renderB2BChat();
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
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, async () => {
        await loadB2BConversationsData();
        renderB2BChat();
      })
      .subscribe();
  }

  function switchB2BView(viewId, targetVendorId) {
    const tabB2B = document.getElementById('tab-b2b');
    if (tabB2B && !tabB2B.classList.contains('active')) {
      document.querySelectorAll('.dashboard-tab-content').forEach(c => c.classList.remove('active'));
      tabB2B.classList.add('active');
    }
    document.querySelectorAll('.rail-icon-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.railTab === 'b2b');
    });

    const exploreView = document.getElementById('b2b-explore-view');
    const messagesView = document.getElementById('b2b-messages-view');
    const contractedView = document.getElementById('b2b-contracted-view');
    const insuranceView = document.getElementById('b2b-insurance-view');
    const searchBar = document.getElementById('b2b-top-search-bar');
    const toolbarTitle = document.getElementById('b2b-toolbar-title');
    const searchInput = document.getElementById('b2b-search-input');
    const sortContainer = document.getElementById('b2b-sort-container');
    const b2bNavTabs = document.querySelectorAll('.tab-b2b-nav');

    currentB2BView = viewId;
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
        if (viewId === 'favorites') {
          if (toolbarTitle) toolbarTitle.textContent = 'Fornecedores Favoritos';
          if (categoryTabs) categoryTabs.style.setProperty('display', 'none', 'important');
          currentB2BCategory = 'favorites';
        } else {
          if (toolbarTitle) toolbarTitle.textContent = 'Catálogo de produtos e serviços';
          if (categoryTabs) categoryTabs.style.removeProperty('display');
          if (viewId === 'explore' && currentB2BCategory === 'favorites') {
            currentB2BCategory = 'all';
          }
        }
        renderB2BExplore();
      }
    }
  }

  function renderB2BContracted() {
    const container = document.getElementById('b2b-contracted-list-container');
    if (!container) return;
    container.innerHTML = '';

    const contractedList = window.LOVE_DATA.contractedVendors || [];

    if (contractedList.length === 0) {
      container.innerHTML = `
        <div class="p-12 text-center bg-white rounded-2xl border border-zinc-200/80 text-sm text-zinc-500">
          Você ainda não possui fornecedores contratados registrados.
        </div>
      `;
      return;
    }

    contractedList.forEach(item => {
      const card = document.createElement('div');
      card.className = 'bg-white rounded-2xl border border-zinc-200/80 p-6 shadow-xs hover:shadow-md transition-all flex flex-col md:flex-row gap-6 items-stretch w-full';

      card.innerHTML = `
        <div class="relative w-full md:w-80 h-48 rounded-xl overflow-hidden bg-zinc-100 flex-shrink-0">
          <img src="${item.image}" alt="${item.name}" class="w-full h-full object-cover">
          <span class="absolute top-3 left-3 px-3 py-1 rounded-lg text-[11px] font-bold bg-zinc-900/85 backdrop-blur-xs text-white">${item.tag || item.category}</span>
        </div>

        <div class="flex-1 flex flex-col justify-between min-w-0">
          <div>
            <div class="flex flex-wrap items-center justify-between gap-2">
              <div>
                <span class="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block">${item.category}</span>
                <h3 class="text-lg sm:text-xl font-bold text-zinc-900 leading-snug mt-0.5">${item.name}</h3>
              </div>
              <span class="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full border ${item.contractStatusColor}">
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg>
                <span>${item.contractStatus}</span>
              </span>
            </div>

            <p class="text-xs sm:text-sm text-zinc-600 mt-2.5 leading-relaxed font-normal">
              <strong class="font-bold text-zinc-800">Serviço:</strong> ${item.service}
            </p>

            <div class="flex flex-wrap items-center gap-x-8 gap-y-2 mt-4 pt-3.5 border-t border-zinc-100 text-xs sm:text-sm">
              <div class="flex items-center gap-2">
                <span class="text-zinc-400">👤 Responsável:</span>
                <span class="font-bold text-zinc-900">${item.responsibleName}</span>
              </div>
              <div class="flex items-center gap-2">
                <span class="text-zinc-400">💰 Negociado:</span>
                <span class="font-bold text-zinc-900">${item.negotiatedValue}</span>
                <span class="text-[11px] px-2.5 py-0.5 rounded-md border font-medium ${item.paymentStatusColor}">${item.paymentStatus}</span>
              </div>
            </div>
          </div>

          <div class="flex flex-wrap items-center justify-between gap-4 pt-3.5 mt-3.5 border-t border-zinc-100">
            <span class="text-xs sm:text-sm font-medium text-zinc-500 flex items-center gap-2">
              <span>📅</span> <strong>Próximo Marco:</strong> ${item.nextMilestone}
            </span>

            <div class="flex items-center gap-2.5">
              <button type="button" class="btn-contracted-chat px-4 py-2.5 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-700 text-xs sm:text-sm font-semibold transition-all cursor-pointer flex items-center gap-2">
                <svg class="w-4 h-4 text-[#537bae]" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/></svg>
                <span>Chat</span>
              </button>
              <button type="button" class="btn-contracted-actions px-5 py-2.5 rounded-xl bg-[#537bae] hover:bg-[#416799] text-white text-xs sm:text-sm font-bold transition-all shadow-xs cursor-pointer flex items-center gap-2">
                <span>Ver Contrato & Ações</span>
                <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7"/></svg>
              </button>
            </div>
          </div>
        </div>
      `;

      card.querySelector('.btn-contracted-chat')?.addEventListener('click', () => {
        switchB2BView('messages', item.chatId || 'mariana-assessoria');
      });

      card.querySelector('.btn-contracted-actions')?.addEventListener('click', () => {
        openContractedVendorDrawer(item);
      });

      container.appendChild(card);
    });
  }

  let activeContractedVendor = null;

  function openContractedVendorDrawer(vendor) {
    activeContractedVendor = vendor;
    const drawer = document.getElementById('drawer-contracted-vendor-details');
    const backdrop = document.getElementById('contracted-drawer-backdrop');
    const nameEl = document.getElementById('contracted-drawer-name');
    const categoryEl = document.getElementById('contracted-drawer-category');
    const imageEl = document.getElementById('contracted-drawer-image');
    const bodyEl = document.getElementById('contracted-drawer-body');

    if (!drawer || !bodyEl) return;

    if (nameEl) nameEl.textContent = vendor.name;
    if (categoryEl) categoryEl.textContent = vendor.category;
    if (imageEl) imageEl.src = vendor.image;

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

    drawer.classList.add('open');
    if (backdrop) backdrop.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function closeContractedVendorDrawer() {
    const drawer = document.getElementById('drawer-contracted-vendor-details');
    const backdrop = document.getElementById('contracted-drawer-backdrop');
    if (drawer) drawer.classList.remove('open');
    if (backdrop) backdrop.classList.remove('open');
    document.body.style.overflow = '';
  }

  // Inicialização de Listeners do Drawer de Contratados
  const btnCloseContractedDrawer = document.getElementById('btn-close-contracted-drawer');
  const btnCloseContractedDrawerFooter = document.getElementById('btn-contracted-drawer-close-footer');
  const contractedDrawerBackdrop = document.getElementById('contracted-drawer-backdrop');
  const btnContractedDrawerChat = document.getElementById('btn-contracted-drawer-chat');

  if (btnCloseContractedDrawer) btnCloseContractedDrawer.addEventListener('click', closeContractedVendorDrawer);
  if (btnCloseContractedDrawerFooter) btnCloseContractedDrawerFooter.addEventListener('click', closeContractedVendorDrawer);
  if (contractedDrawerBackdrop) contractedDrawerBackdrop.addEventListener('click', closeContractedVendorDrawer);
  if (btnContractedDrawerChat) {
    btnContractedDrawerChat.addEventListener('click', () => {
      closeContractedVendorDrawer();
      if (activeContractedVendor) {
        switchB2BView('messages', activeContractedVendor.chatId || 'mariana-assessoria');
      }
    });
  }

  async function renderB2BChat() {
    await loadB2BConversationsData();
    if (!b2bConversationsData.some(c => c.id === activeB2BConversationId)) {
      activeB2BConversationId = b2bConversationsData[0] ? b2bConversationsData[0].id : null;
    }
    renderB2BChatContacts();
    renderB2BChatMessages();
    initB2BChatHandlers();
  }

  function renderB2BChatContacts(filterQuery = '') {
    const list = document.getElementById('b2b-chat-contacts-list');
    if (!list) return;

    list.innerHTML = '';

    if (!b2bConversationsData.length) {
      list.innerHTML = '<div class="p-6 text-center text-xs text-zinc-400">Nenhuma conversa ainda. Clique em "+ Nova conversa" para falar com um fornecedor.</div>';
      return;
    }

    const filtered = b2bConversationsData.filter(c =>
      c.name.toLowerCase().includes(filterQuery.toLowerCase()) || 
      c.category.toLowerCase().includes(filterQuery.toLowerCase()) ||
      c.lastMessage.toLowerCase().includes(filterQuery.toLowerCase())
    );

    if (filtered.length === 0) {
      list.innerHTML = '<div class="p-6 text-center text-xs text-zinc-400">Nenhuma conversa encontrada.</div>';
      return;
    }

    filtered.forEach(conv => {
      const isActive = conv.id === activeB2BConversationId;
      const item = document.createElement('div');
      item.className = `p-3.5 flex items-start gap-3 cursor-pointer transition-colors ${
        isActive ? 'bg-[#EBF4FF] border-l-4 border-[#537bae]' : 'hover:bg-zinc-200/50 border-l-4 border-transparent'
      }`;

      item.innerHTML = `
        <div class="relative flex-shrink-0">
          <img src="${conv.avatar}" alt="${conv.name}" class="w-10 h-10 rounded-full object-cover border border-zinc-200">
          ${conv.online ? '<span class="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-white"></span>' : ''}
        </div>
        <div class="flex-1 min-w-0">
          <div class="flex items-center justify-between gap-1 mb-0.5">
            <h4 class="text-xs sm:text-sm font-medium ${isActive ? 'text-[#416799] font-semibold' : 'text-zinc-900'} truncate">${conv.name}</h4>
            <span class="text-[10px] text-zinc-400 flex-shrink-0">${conv.time}</span>
          </div>
          <p class="text-xs text-zinc-500 truncate leading-tight">${conv.lastMessage}</p>
        </div>
        ${conv.unread > 0 ? `<span class="w-2.5 h-2.5 rounded-full flex-shrink-0 mt-2 ring-2 ring-white shadow-2xs" style="background-color: #27394f;"></span>` : ''}
      `;

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

    if (nameEl) nameEl.textContent = activeConv.name;
    if (statusEl) statusEl.textContent = activeConv.online ? 'Online agora' : '';
    if (avatarEl) avatarEl.src = activeConv.avatar;

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

      if (isMe) {
        row.innerHTML = `
          <div class="max-w-[80%] sm:max-w-[70%] space-y-1 text-right">
            <div class="chat-bubble-user-glass p-3.5 rounded-2xl rounded-br-xs text-xs sm:text-sm leading-relaxed text-left">
              ${msg.text ? `<p class="whitespace-pre-wrap break-words">${msg.text}</p>` : ''}
              ${attachmentHTML}
            </div>
            <div class="flex items-center justify-end gap-1 text-[10px] text-zinc-400 pr-1">
              <span>${msg.time || 'Agora'}</span>
              <span class="text-[#537bae] font-bold">✓✓</span>
            </div>
          </div>
          <div class="w-7 h-7 rounded-full bg-zinc-800 text-white text-[10px] font-bold flex items-center justify-center flex-shrink-0 shadow-2xs">
            BL
          </div>
        `;
      } else {
        row.innerHTML = `
          <img src="${activeConv.avatar}" alt="${activeConv.name}" class="w-7 h-7 rounded-full object-cover flex-shrink-0 border border-zinc-200 mb-4">
          <div class="max-w-[80%] sm:max-w-[70%] space-y-1">
            <div class="bg-white border border-zinc-200/80 text-zinc-800 p-3.5 rounded-2xl rounded-bl-xs text-xs sm:text-sm leading-relaxed shadow-2xs">
              ${msg.text ? `<p class="whitespace-pre-wrap break-words">${msg.text}</p>` : ''}
              ${attachmentHTML}
            </div>
            <span class="text-[10px] text-zinc-400 pl-1 block">${msg.time || 'Agora'}</span>
          </div>
        `;
      }

      container.appendChild(row);
    });

    container.scrollTop = container.scrollHeight;
  }

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

      chatForm.addEventListener('submit', (e) => {
        e.preventDefault();
        if (!chatInput) return;
        const text = chatInput.value.trim();
        if (!text) return;

        const convId = activeB2BConversationId || (b2bConversationsData[0] && b2bConversationsData[0].id);
        if (!convId) return;

        window.LoveChatService.sendMessage(convId, text);
        chatInput.value = '';
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

        const { data: fornecedores, error } = await supabaseClient
          .from('fornecedores')
          .select('id, company_name, avatar_url')
          .order('company_name');

        if (error || !fornecedores || !fornecedores.length) {
          newConvPicker.innerHTML = '<div class="p-4 text-center text-xs text-zinc-400">Nenhum fornecedor cadastrado ainda.</div>';
          return;
        }

        newConvPicker.innerHTML = fornecedores.map(f => `
          <button type="button" data-fornecedor-id="${f.id}" class="w-full flex items-center gap-2.5 p-3 hover:bg-zinc-50 text-left border-b border-zinc-100 last:border-0">
            <img src="${f.avatar_url || 'assets/theme_garden.jpg'}" class="w-8 h-8 rounded-full object-cover border border-zinc-200" alt="">
            <span class="text-xs font-medium text-zinc-800 truncate">${f.company_name}</span>
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
      if (val) {
        const activeEvent = getActiveEvent();
        activeEvent.title = val;
        updateAllCelebrationData();
        renderEventsSwitcher();
        showToast(`Nome do evento atualizado para "${val}"!`, '✅');
        triggerConfetti();
      }
    });
  }

  // Botão Ver Site Público dentro de "Meu Evento"
  const btnInfoOpenPublic = document.getElementById('btn-info-open-public');
  if (btnInfoOpenPublic) {
    btnInfoOpenPublic.addEventListener('click', (e) => {
      e.preventDefault();
      const activeEvent = getActiveEvent();
      state.selectedPublicWedding = activeEvent.slug;
      switchView('public');
      renderPublicWeddingPage(activeEvent.slug);
      showToast(`Visualizando site público de "${activeEvent.title}"`, '🌐');
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

  // Confirmar Exclusão do Evento
  const btnConfirmDelete = document.getElementById('btn-confirm-delete-event');
  if (btnConfirmDelete) {
    btnConfirmDelete.addEventListener('click', () => {
      const deletedId = state.activeEventId;
      const deletedEvent = getActiveEvent();

      // Remove da lista
      state.events = state.events.filter(e => e.id !== deletedId);

      // Se não houver mais eventos, cria um padrão
      if (state.events.length === 0) {
        state.events.push({
          id: 'nova-comemoracao',
          title: 'Minha Nova Celebração',
          type: 'wedding',
          hostName: 'Anfitrião',
          date: '2026-12-31',
          daysLeft: 300,
          slug: 'minha-nova-celebracao',
          publicUrl: 'https://love.com.br/minha-nova-celebracao',
          coverImage: 'assets/wedding_hero_banner.jpg',
          totalArrecadado: 0,
          convidadosConfirmados: 0,
          totalConvidados: 100,
          presentesRecebidos: 0,
          adultosConfirmados: 0,
          criancasConfirmadas: 0,
          convidadosRecusados: 0,
          convidadosPendentes: 0,
          wallet: { saldoDisponivel: 0, saldoFuturo: 0, totalSacado: 0, chavePix: 'anfitriao@love.com', transacoes: [] },
          siteSections: { heroHeadline: 'Bem-vindos à nossa celebração', heroSubtitle: 'Confirme sua presença e veja nossa lista de presentes.', aboutText: '', inviteText: '' },
          giftList: [],
          guestList: [],
          messages: []
        });
      }

      state.activeEventId = state.events[0].id;
      closeModal(elements.modals.deleteEvent);
      updateAllCelebrationData();
      renderEventsSwitcher();
      switchRailTab('edit-site');
      showToast(`O evento "${deletedEvent.title}" foi cancelado e excluído com sucesso.`, '🗑️');
    });
  }

  // ==========================================
  // 13. MINHA CONTA & NOTIFICAÇÕES DROPDOWNS
  // ==========================================
  const btnUserAccount = document.getElementById('btn-user-account-menu');
  const dropdownUserAccount = document.getElementById('dropdown-user-account');
  const btnNotifications = document.getElementById('btn-notifications-menu');
  const dropdownNotifications = document.getElementById('dropdown-notifications');
  const btnProfileData = document.getElementById('btn-account-profile-data');
  const btnAccountSettings = document.getElementById('btn-account-settings');
  const btnAccountLogout = document.getElementById('btn-account-logout');

  // Minha Conta Dropdown
  if (btnUserAccount && dropdownUserAccount) {
    btnUserAccount.addEventListener('click', (e) => {
      e.stopPropagation();
      dropdownNotifications?.classList.add('hidden');
      dropdownUserAccount.classList.toggle('hidden');
    });
  }

  // Botão Mensagens/Chat no Header Superior (Direciona para o Chat B2B)
  const btnHeaderChat = document.getElementById('btn-dash-header-chat');
  if (btnHeaderChat) {
    btnHeaderChat.addEventListener('click', (e) => {
      e.preventDefault();
      dropdownNotifications?.classList.add('hidden');
      dropdownUserAccount?.classList.add('hidden');
      const badgeChat = document.querySelector('.badge-header-chat');
      if (badgeChat) badgeChat.classList.add('hidden');
      switchRailTab('b2b');
      switchB2BView('messages');
    });
  }

  // Notificações Dropdown
  if (btnNotifications && dropdownNotifications) {
    btnNotifications.addEventListener('click', (e) => {
      e.stopPropagation();
      dropdownUserAccount?.classList.add('hidden');
      dropdownNotifications.classList.toggle('hidden');
    });

    const btnMarkRead = dropdownNotifications.querySelector('button');
    if (btnMarkRead) {
      btnMarkRead.addEventListener('click', (e) => {
        e.stopPropagation();
        const badgeNotif = document.querySelector('.badge-header-notifications');
        if (badgeNotif) badgeNotif.classList.add('hidden');
        const badgeCount = dropdownNotifications.querySelector('span[style*="#27394f"]');
        if (badgeCount) badgeCount.textContent = '0 novas';
        showToast('Todas as notificações foram marcadas como lidas.', '✓');
      });
    }
  }

  // Fecha dropdowns ao clicar fora
  document.addEventListener('click', (e) => {
    if (btnUserAccount && dropdownUserAccount && !btnUserAccount.contains(e.target) && !dropdownUserAccount.contains(e.target)) {
      dropdownUserAccount.classList.add('hidden');
    }
    if (btnNotifications && dropdownNotifications && !btnNotifications.contains(e.target) && !dropdownNotifications.contains(e.target)) {
      dropdownNotifications.classList.add('hidden');
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

  if (btnProfileData) {
    btnProfileData.addEventListener('click', () => {
      dropdownUserAccount?.classList.add('hidden');
      openModal(elements.modals.userSettings);
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
      showToast('Suporte Love: (11) 98765-4321 • Atendimento prioritário 24/7.', '💬');
    });
  }

  const btnAccountFaq = document.getElementById('btn-account-faq');
  if (btnAccountFaq) {
    btnAccountFaq.addEventListener('click', () => {
      dropdownUserAccount?.classList.add('hidden');
      openModal(elements.modals.userFaq);
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

  const btnFaqSupport = document.getElementById('btn-faq-contact-support');
  if (btnFaqSupport) {
    btnFaqSupport.addEventListener('click', () => {
      closeModal(elements.modals.userFaq);
      showToast('Suporte Love via WhatsApp: (11) 98765-4321 • Atendimento 24/7.', '💬');
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

  if (btnOpenVenueModal && modalAddVenue) {
    btnOpenVenueModal.addEventListener('click', (e) => {
      e.stopPropagation();
      // Abre o popup de local direto na home, sem sair do dashboard
      const activeEv = getActiveEvent();
      if (inputVenue) {
        inputVenue.value = (activeEv.location && activeEv.location !== 'Adicionar Local') ? activeEv.location : '';
      }
      openModal(modalAddVenue);
    });
  }

  if (btnSaveVenue && modalAddVenue) {
    btnSaveVenue.addEventListener('click', () => {
      const activeEv = getActiveEvent();
      const newLoc = inputVenue ? inputVenue.value.trim() : '';
      if (newLoc) {
        activeEv.location = newLoc;
        const hubLocText = document.getElementById('dash-hub-event-location-text');
        if (hubLocText) hubLocText.textContent = newLoc;
        const fieldLoc = document.getElementById('field-event-location');
        if (fieldLoc) fieldLoc.value = newLoc;
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

  // Formulário de Perfil de Usuário
  const formUserProfile = document.getElementById('form-user-profile');
  if (formUserProfile) {
    formUserProfile.addEventListener('submit', (e) => {
      e.preventDefault();
      const name = document.getElementById('profile-user-name')?.value || 'Anfitrião';
      const dropdownUsername = document.getElementById('account-dropdown-username');
      if (dropdownUsername) dropdownUsername.textContent = name;
      closeModal(elements.modals.userProfile);
      showToast('Dados de usuário atualizados com sucesso!', '👤');
    });
  }

  // Formulário de Configurações
  const formUserSettings = document.getElementById('form-user-settings');
  if (formUserSettings) {
    formUserSettings.addEventListener('submit', (e) => {
      e.preventDefault();
      closeModal(elements.modals.userSettings);
      showToast('Configurações da conta salvas com sucesso!', '⚙️');
    });
  }

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
  const btnFooterPrivacy = document.getElementById('btn-footer-privacy');
  const btnFooterTerms = document.getElementById('btn-footer-terms');

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
      switchRailTab('info-event');
      switchInfoSubSection('faq', 'Dúvidas');
    });
  }

  if (btnFooterContact || btnFooterWhatsapp) {
    const handleContact = () => {
      showToast('Suporte Love via WhatsApp: (11) 98765-4321 • Atendimento 24/7.', '💬');
    };
    if (btnFooterContact) btnFooterContact.addEventListener('click', handleContact);
    if (btnFooterWhatsapp) btnFooterWhatsapp.addEventListener('click', handleContact);
  }

  if (btnFooterPrivacy) {
    btnFooterPrivacy.addEventListener('click', () => {
      showToast('Política de Privacidade: Seus dados estão protegidos sob a LGPD com criptografia bancária.', '🔒');
    });
  }

  // Mesmos links de Privacidade/Termos do rodapé público, agora também no rodapé do dashboard
  const btnDashboardFooterPrivacy = document.getElementById('btn-dashboard-footer-privacy');
  const btnDashboardFooterTerms = document.getElementById('btn-dashboard-footer-terms');
  if (btnDashboardFooterPrivacy) {
    btnDashboardFooterPrivacy.addEventListener('click', () => {
      showToast('Política de Privacidade: Seus dados estão protegidos sob a LGPD com criptografia bancária.', '🔒');
    });
  }
  if (btnDashboardFooterTerms) {
    btnDashboardFooterTerms.addEventListener('click', () => {
      showToast('Termos de Uso da plataforma Love.', '📄');
    });
  }

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

  // Início padrão na página pública — troca para o dashboard automaticamente
  // se já existir uma sessão Supabase válida (usuário já logado).
  switchView('public');
  initClienteSession();

  async function initClienteSession() {
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (!session) return;

    window.loveClienteSession = session;

    const { data: cliente } = await supabaseClient
      .from('clientes')
      .select('id, couple_name, email, avatar_url')
      .eq('id', session.user.id)
      .maybeSingle();

    if (cliente) {
      window.loveClienteProfile = cliente;
      const dropdownUsername = document.getElementById('account-dropdown-username');
      if (dropdownUsername) dropdownUsername.textContent = cliente.couple_name;
    }

    subscribeToB2BChatRealtime();

    switchView('dashboard');
  }
});
