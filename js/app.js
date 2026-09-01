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
      addGuest: document.getElementById('modal-add-guest'),
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
      if (e.target === modal) closeModal(modal);
    });
    modal.querySelectorAll('[data-close-modal]').forEach(btn => {
      btn.addEventListener('click', () => closeModal(modal));
    });
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      document.querySelectorAll('.modal-backdrop-custom.open').forEach(m => closeModal(m));
      closeGuestDrawer();
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
    } else {
      document.body.classList.remove('dashboard-mode', 'editor-split-mode', 'rsvp-mode', 'b2b-mode', 'b2b-chat-mode', 'first-access-locked');
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
        { id: 'invite-online', label: 'Convite online' },
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
      title: 'Seus Convidados',
      actionText: null,
      actionHandler: null,
      subItems: [
        { id: 'all', label: 'Todos os Convidados' },
        { id: 'messages', label: 'Recados recebidos' },
        { id: 'whatsapp', label: 'Disparo WhatsApp' }
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
        { id: 'contracted', label: 'Contratados' },
        { id: 'insurance', label: 'Serviços' },
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
            badgeMarkup = `<span class="px-2 py-0.5 rounded-full text-[10px] font-bold text-zinc-900 shadow-sm ml-auto" style="background-color: #F7B99E;">${unreadCount}</span>`;
          }

          btn.innerHTML = `<span>${item.label}</span>${badgeMarkup}`;

          btn.addEventListener('click', () => {
            elements.drawerSubItemsList.querySelectorAll('.sub-drawer-item').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            if (tabKey === 'edit-site') {
              switchEditorSubSection(item.id, item.label);
            } else if (tabKey === 'gifts') {
              switchGiftsSubSection(item.id);
            } else if (tabKey === 'info-event') {
              switchInfoSubSection(item.id, item.label);
            } else if (tabKey === 'rsvp') {
              if (item.id === 'messages') {
                document.querySelectorAll('.dashboard-tab-content').forEach(c => c.classList.remove('active'));
                const target = document.getElementById('tab-rsvp-messages');
                if (target) target.classList.add('active');
                renderRecadosMural();
              } else {
                document.querySelectorAll('.dashboard-tab-content').forEach(c => c.classList.remove('active'));
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
          });

          elements.drawerSubItemsList.appendChild(btn);
        });
      }
    }

    // 4. Atualiza os conteúdos de página
    document.querySelectorAll('.dashboard-tab-content').forEach(content => {
      content.classList.toggle('active', content.id === `tab-${tabKey}`);
    });

    // Ativa os modos e sub-seções correspondentes
    if (tabKey === 'edit-site') {
      document.body.classList.add('editor-split-mode');
      switchEditorSubSection(state.activeSubSection || 'home', 'Aparência');
    } else if (tabKey === 'gifts') {
      switchGiftsSubSection('my-gifts');
    } else if (tabKey === 'rsvp') {
      document.body.classList.add('rsvp-mode');
      renderGuestsTable('all');
    } else if (tabKey === 'wallet') {
      switchWalletSubSection('wallet-digital', 'Carteira Digital');
    } else if (tabKey === 'b2b') {
      document.body.classList.add('b2b-mode');
      switchB2BView('explore');
    } else if (tabKey === 'info-event') {
      switchInfoSubSection('my-event', 'Meu evento');
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // Listener robusto para os ícones da barra lateral
  document.addEventListener('click', (e) => {
    const railBtn = e.target.closest('.rail-icon-btn');
    if (railBtn) {
      const tab = railBtn.getAttribute('data-rail-tab');
      if (tab) {
        e.preventDefault();
        e.stopPropagation();
        switchRailTab(tab);
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
      item.className = `p-2.5 rounded-lg text-xs font-bold cursor-pointer transition-all ${isActive ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'hover:bg-slate-50 text-slate-700'}`;
      item.innerHTML = `
        <span class="block truncate">${evt.title}</span>
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

    if (hubTitle) hubTitle.innerHTML = `Olá, <span style="color: #4E96EF;" class="text-[#4E96EF] text-logo-blue font-semibold">${activeEvent.hostName || activeEvent.title}</span>!`;
    const hubDateText = document.getElementById('dash-hub-event-date-text');
    const hubLocText = document.getElementById('dash-hub-event-location-text');
    const hasLocation = activeEvent.location && activeEvent.location.trim() !== '' && activeEvent.location !== 'Adicionar Local';
    if (hubDateText) hubDateText.textContent = activeEvent.date || '18 de Outubro de 2026';
    if (hubLocText) hubLocText.textContent = hasLocation ? activeEvent.location : 'Adicionar Local';
    
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
        homeB2bChatStatus.innerHTML = `<span class="inline-block w-2 h-2 rounded-full bg-emerald-500"></span><span class="text-[#4E96EF] font-semibold">Você está falando com 1 fornecedor</span>`;
      } else {
        homeB2bChatStatus.innerHTML = `<span class="inline-block w-2 h-2 rounded-full bg-emerald-500"></span><span class="text-[#4E96EF] font-semibold">Você está falando com ${count} fornecedores</span>`;
      }
    }
    
    if (overviewUrl) overviewUrl.textContent = activeEvent.publicUrl || `https://love.com.br/${activeEvent.slug}`;

    // 3. Títulos dos Módulos
    const giftsTitle = document.getElementById('gifts-header-title');
    const rsvpTitle = document.getElementById('rsvp-header-title');
    const walletTitle = document.getElementById('wallet-header-title');
    const walletPixLabel = document.getElementById('wallet-pix-key-label');

    if (giftsTitle) giftsTitle.textContent = `Lista de Presentes: ${activeEvent.title}`;
    if (rsvpTitle) rsvpTitle.textContent = 'Lista de convidados';
    if (walletTitle) walletTitle.textContent = 'Financeiro';
    if (walletPixLabel) walletPixLabel.textContent = `Chave PIX: ${activeEvent.wallet.chavePix}`;


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
            <div class="w-8 h-8 rounded-full bg-blue-50 text-[#4E96EF] font-bold text-xs flex items-center justify-center flex-shrink-0 border border-blue-100/80">
              ${initials}
            </div>
            <div class="min-w-0">
              <p class="text-xs font-semibold text-zinc-900 truncate leading-tight group-hover:text-[#4E96EF] transition-colors">${guest.name}</p>
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
    bgColor: '#FBFBFA',
    font: 'font-serif-title',
    titleColor: '#18181B',
    descFont: 'font-sans',
    descColor: '#52525B',
    gradientOpacity: 80,
    gradientColor: '#FBFBFA',
    coverImage: 'assets/wedding_hero_banner.jpg',
    accentColor: '#4E96EF',
    prefaces: [
      '"Um cordão de três dobras não se rompe com facilidade." (Eclesiastes 4:12)',
      'COM A BÊNÇÃO DE DEUS,'
    ]
  };

  const templatesPresets = {
    buxton: {
      bgColor: '#F4F1EA',
      font: 'font-serif-title',
      titleColor: '#18181B',
      descFont: 'font-serif',
      descColor: '#52525B',
      gradientOpacity: 80,
      gradientColor: '#F4F1EA',
      coverImage: 'assets/theme_garden.jpg',
      accentColor: '#4E96EF',
      headline: 'CONVIDAM VOCÊ PARA O SEU CASAMENTO',
      subtitle: 'Celebrando o amor em harmonia com a natureza.'
    },
    rose: {
      bgColor: '#FFF1F2',
      font: 'font-serif-title',
      titleColor: '#881337',
      descFont: 'font-sans',
      descColor: '#4C0519',
      gradientOpacity: 80,
      gradientColor: '#FFF1F2',
      coverImage: 'assets/wedding_hero_banner.jpg',
      accentColor: '#F7B99E',
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
      accentColor: '#4E96EF',
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
        title.textContent = subLabel;
      }
    }

    // Oculta todos os sub-formulários e exibe o selecionado
    document.querySelectorAll('.editor-sub-panel').forEach(panel => panel.classList.add('hidden'));
    const targetPanel = document.getElementById(`editor-form-${subId}`);
    if (targetPanel) targetPanel.classList.remove('hidden');
  }

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
    
    const cleaned = cleanSlug(slug);

    if (!cleaned || cleaned.length < 3) {
      if (statusBadge) {
        statusBadge.className = 'px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 font-bold text-xs border border-amber-200 flex items-center gap-1.5';
        statusBadge.innerHTML = `
          <svg class="w-3.5 h-3.5 text-amber-600" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"/>
          </svg>
          <span>Mínimo 3 letras</span>
        `;
      }
      if (helperText) {
        helperText.textContent = 'O link deve ter pelo menos 3 caracteres.';
        helperText.className = 'text-[11px] text-amber-600 font-medium';
      }
      return { available: false, slug: cleaned };
    }

    // Lista de slugs já ocupados (outros eventos no state e base do sistema)
    const reservedSlugs = ['admin', 'login', 'register', 'dashboard', 'api', 'help', 'suporte', 'termos', 'privacidade', 'app'];
    const existsInOtherEvents = state.events.some(ev => ev.id !== currentEventId && ev.slug === cleaned);
    const isReserved = reservedSlugs.includes(cleaned);

    if (existsInOtherEvents || isReserved) {
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
        helperText.textContent = `O endereço "love.com/c/${cleaned}" já está em uso. Tente adicionar seu sobrenome ou ano.`;
        helperText.className = 'text-[11px] text-rose-600 font-medium';
      }
      return { available: false, slug: cleaned };
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
      helperText.textContent = `Perfeito! Seu site ficará acessível em: love.com/c/${cleaned}`;
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
          <input type="text" value="${prefaceText.replace(/"/g, '&quot;')}" placeholder="Ex: 'Um cordão de três dobras...' ou 'Com a bênção de Deus,'" class="preface-input-field w-full text-xs p-2.5 rounded-xl border border-zinc-200 bg-white focus:outline-none focus:ring-2 focus:ring-[#4E96EF] text-zinc-800 font-medium" data-index="${idx}">
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

  function renderEditorForm() {
    const activeEvent = getActiveEvent();
    
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
    if (inputAbout) inputAbout.value = activeEvent.siteSections?.aboutText || '';
    if (inputInvite) inputInvite.value = activeEvent.siteSections?.inviteText || '';

    builderState.prefaces = [...(activeEvent.prefaces && activeEvent.prefaces.length ? activeEvent.prefaces : [
      '"Um cordão de três dobras não se rompe com facilidade." (Eclesiastes 4:12)',
      'COM A BÊNÇÃO DE DEUS,'
    ])];
    renderEditorPrefaces();

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

    builderState.bgColor = activeEvent.bgColor || '#FBFBFA';
    builderState.font = activeEvent.fontFamily || 'font-serif-title';
    builderState.titleColor = activeEvent.titleColor || '#18181B';
    builderState.descFont = activeEvent.descFont || 'font-sans';
    builderState.descColor = activeEvent.descColor || '#52525B';
    builderState.gradientOpacity = activeEvent.gradientOpacity !== undefined ? activeEvent.gradientOpacity : 80;
    builderState.gradientColor = activeEvent.gradientColor || builderState.bgColor;
    builderState.coverImage = activeEvent.coverImage || 'assets/wedding_hero_banner.jpg';
    builderState.accentColor = activeEvent.accentColor || '#4E96EF';

    // Sincroniza os controles da sub-seção Aparência
    const selTitleFont = document.getElementById('editor-select-title-font');
    if (selTitleFont) selTitleFont.value = builderState.font || 'font-serif-title';

    const titlePicker = document.getElementById('editor-title-color-picker');
    const swatchTitleBtn = document.getElementById('swatch-title-color-btn');
    if (titlePicker) titlePicker.value = builderState.titleColor || '#18181B';
    if (swatchTitleBtn) swatchTitleBtn.style.backgroundColor = builderState.titleColor || '#18181B';

    const selDescFont = document.getElementById('editor-select-desc-font');
    if (selDescFont) selDescFont.value = builderState.descFont || 'font-sans';

    const descPicker = document.getElementById('editor-desc-color-picker');
    const swatchDescBtn = document.getElementById('swatch-desc-color-btn');
    if (descPicker) descPicker.value = builderState.descColor || '#52525B';
    if (swatchDescBtn) swatchDescBtn.style.backgroundColor = builderState.descColor || '#52525B';

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

    updateLiveSitePreview();
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
    if (previewContainer) previewContainer.style.setProperty('background-color', activeBgColor, 'important');
    if (previewBody) previewBody.style.setProperty('background-color', activeBgColor, 'important');
    
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

    // Degradê da Foto de Capa (Cor + Opacidade ajustáveis)
    if (coverGradient) {
      const gradColor = builderState.gradientColor || activeBgColor;
      const gradOpacity = (builderState.gradientOpacity !== undefined ? builderState.gradientOpacity : 80) / 100;
      coverGradient.style.background = `linear-gradient(to top, ${gradColor} 0%, ${gradColor} 30%, transparent 100%)`;
      coverGradient.style.opacity = gradOpacity;
    }

    // 2. Capa do Casal
    if (previewCover && builderState.coverImage) {
      previewCover.style.backgroundImage = `url('${builderState.coverImage}')`;
    }
    const coverThumb = document.getElementById('editor-cover-thumb-preview');
    if (coverThumb && builderState.coverImage) {
      coverThumb.src = builderState.coverImage;
    }

    const descFont = builderState.descFont || 'font-sans';
    const descColor = builderState.descColor || (isDark ? '#E4E4E7' : '#52525B');

    // 3. Epígrafes / Prefácios Dinâmicos
    if (previewPrefacesContainer && !previewPrefacesContainer.contains(document.activeElement)) {
      previewPrefacesContainer.innerHTML = '';
      const prefaces = builderState.prefaces !== undefined
        ? builderState.prefaces
        : (activeEvent.prefaces || ['"Um cordão de três dobras não se rompe com facilidade." (Eclesiastes 4:12)', 'COM A BÊNÇÃO DE DEUS,']);

      if (!prefaces || prefaces.length === 0) {
        const pEl = document.createElement('p');
        pEl.contentEditable = "true";
        pEl.spellcheck = false;
        pEl.setAttribute('data-placeholder', 'Digite a epígrafe ou citação...');
        pEl.className = `editable-live-box text-[11px] sm:text-xs italic font-serif leading-relaxed px-2`;
        pEl.style.color = descColor;
        pEl.dataset.empty = "true";
        previewPrefacesContainer.appendChild(pEl);
      } else {
        prefaces.forEach(pText => {
          const pEl = document.createElement('p');
          pEl.contentEditable = "true";
          pEl.spellcheck = false;
          pEl.setAttribute('data-placeholder', 'Digite a epígrafe ou citação...');
          if (pText && (pText.includes('"') || pText.includes('(') || pText.length > 30)) {
            pEl.className = `editable-live-box text-[11px] sm:text-xs italic font-serif leading-relaxed px-2`;
            pEl.textContent = pText;
          } else {
            pEl.className = `editable-live-box text-[10px] font-bold tracking-[0.25em] uppercase`;
            pEl.textContent = pText || '';
          }
          pEl.style.color = descColor;
          if (!pText || !pText.trim()) pEl.dataset.empty = "true";
          previewPrefacesContainer.appendChild(pEl);
        });
      }
    }

    // 4. Nomes do Casal / Anfitriões com Tipografia & Cor Personalizadas
    if (previewTitle) {
      if (document.activeElement !== previewTitle) {
        previewTitle.textContent = titleVal || '';
      }
      previewTitle.setAttribute('data-placeholder', 'Digite os nomes dos anfitriões...');
      const currentFont = builderState.font || 'font-playfair';
      previewTitle.className = `editable-live-box text-3xl sm:text-4xl font-normal italic leading-tight ${currentFont}`;
      
      const fontMap = {
        'font-playfair': "'Playfair Display', Georgia, serif",
        'font-serif-title': "'Playfair Display', Georgia, serif",
        'font-garamond': "'EB Garamond', Garamond, serif",
        'font-serif': "'EB Garamond', Garamond, serif",
        'font-outfit': "'Outfit', sans-serif",
        'font-modern': "'Outfit', sans-serif",
        'font-sans-title': "'Outfit', sans-serif",
        'font-inter': "'Inter', sans-serif",
        'font-sans': "'Inter', sans-serif",
        'font-clean': "'Inter', sans-serif",
        'font-arial': "Arial, Helvetica, sans-serif",
        'font-cursive': "'Great Vibes', cursive",
        'font-greatvibes': "'Great Vibes', cursive"
      };
      if (fontMap[currentFont]) {
        previewTitle.style.fontFamily = fontMap[currentFont];
      }
      
      if (builderState.titleColor) {
        previewTitle.style.color = builderState.titleColor;
      } else {
        previewTitle.style.color = isDark ? '#FFFFFF' : '#18181B';
      }
      const rawTitle = (previewTitle.innerText || previewTitle.textContent || '').replace(/\u200B/g, '').replace(/[↗✎]/g, '').trim();
      if (!rawTitle) {
        previewTitle.dataset.empty = "true";
        if (previewTitle.innerHTML === '<br>' || previewTitle.innerHTML === '<br/>') previewTitle.innerHTML = '';
      } else {
        delete previewTitle.dataset.empty;
      }
    }

    // 5. Chamada
    if (previewHeadline) {
      if (document.activeElement !== previewHeadline) {
        previewHeadline.textContent = headlineVal || '';
      }
      previewHeadline.setAttribute('data-placeholder', 'Digite a frase de chamada...');
      previewHeadline.className = `editable-live-box text-[10px] sm:text-[11px] uppercase font-bold tracking-[0.22em] ${descFont}`;
      previewHeadline.style.color = descColor;
      const rawHead = (previewHeadline.innerText || previewHeadline.textContent || '').replace(/\u200B/g, '').replace(/↗/g, '').trim();
      if (!rawHead) {
        previewHeadline.dataset.empty = "true";
        if (previewHeadline.innerHTML === '<br>' || previewHeadline.innerHTML === '<br/>') previewHeadline.innerHTML = '';
      } else {
        delete previewHeadline.dataset.empty;
      }
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
      previewFormattedDate.className = `text-xs sm:text-sm font-bold tracking-[0.2em] uppercase ${descFont}`;
      previewFormattedDate.style.color = builderState.titleColor || (isDark ? '#FFFFFF' : '#18181B');
    }
    if (previewFormattedTime) {
      if (rawTime) {
        previewFormattedTime.textContent = dayOfWeekName ? `${dayOfWeekName}, às ${rawTime}` : `Às ${rawTime}`;
        previewFormattedTime.style.opacity = '1';
      } else {
        previewFormattedTime.textContent = 'Horário do evento';
        previewFormattedTime.style.opacity = '0.45';
      }
      previewFormattedTime.className = `text-[11px] font-medium ${descFont}`;
      previewFormattedTime.style.color = descColor;
    }

    // 7. Local & Endereço
    const venueNameVal = (inputDataLocation && inputDataLocation.value !== undefined && inputDataLocation.value.length > 0) ? inputDataLocation.value : (activeEvent.eventDetails?.locationName || activeEvent.location || 'VILLA BISUTTI - ESPAÇO JARDIM');
    const venueAddrVal = (inputDataAddress && inputDataAddress.value !== undefined && inputDataAddress.value.length > 0) ? inputDataAddress.value : (activeEvent.eventDetails?.address || 'Av. Cidade Jardim, 1200 - São Paulo, SP');

    if (previewVenueName) {
      if (document.activeElement !== previewVenueName) {
        previewVenueName.textContent = venueNameVal ? venueNameVal.toUpperCase() : '';
      }
      previewVenueName.setAttribute('data-placeholder', 'Nome do local / espaço...');
      previewVenueName.className = `editable-live-box text-xs sm:text-sm font-bold uppercase tracking-wider ${descFont}`;
      previewVenueName.style.color = builderState.titleColor || (isDark ? '#FFFFFF' : '#18181B');
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
      previewVenueAddress.className = `editable-live-box text-[11px] max-w-[260px] mx-auto leading-relaxed ${descFont}`;
      previewVenueAddress.style.color = descColor;
      const rawVAddr = (previewVenueAddress.innerText || previewVenueAddress.textContent || '').replace(/\u200B/g, '').replace(/↗/g, '').trim();
      if (!rawVAddr) {
        previewVenueAddress.dataset.empty = "true";
        if (previewVenueAddress.innerHTML === '<br>') previewVenueAddress.innerHTML = '';
      } else {
        delete previewVenueAddress.dataset.empty;
      }
    }

    // 8. Fechamento
    if (previewClosingNames) {
      previewClosingNames.textContent = titleVal || 'Anfitriões';
      previewClosingNames.className = `text-xl italic ${builderState.font || 'font-serif-title'}`;
      previewClosingNames.style.color = builderState.titleColor || (isDark ? '#FFFFFF' : '#18181B');
    }

    // 9. Botão Destaque
    if (previewActionBtn) {
      previewActionBtn.style.backgroundColor = builderState.accentColor || '#4E96EF';
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

    if (selTitleFont) selTitleFont.value = builderState.font;
    if (titleColorPicker) titleColorPicker.value = builderState.titleColor;
    if (swatchTitleBtn) swatchTitleBtn.style.backgroundColor = builderState.titleColor;

    if (selDescFont) selDescFont.value = builderState.descFont;
    if (descColorPicker) descColorPicker.value = builderState.descColor;
    if (swatchDescBtn) swatchDescBtn.style.backgroundColor = builderState.descColor;

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
        card.classList.add('active', 'border-2', 'border-[#4E96EF]');
        card.classList.remove('border-zinc-200/80');
        if (badge) badge.classList.remove('hidden');
      } else {
        card.classList.remove('active', 'border-2', 'border-[#4E96EF]');
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
    const inputAbout = document.getElementById('editor-about-text');
    const inputInvite = document.getElementById('editor-invite-text');

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
    if (inputAbout && inputAbout.value) activeEvent.siteSections.aboutText = inputAbout.value;
    if (inputInvite && inputInvite.value) activeEvent.siteSections.inviteText = inputInvite.value;

    activeEvent.prefaces = [...(builderState.prefaces || [])];

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
      const activeEv = getActiveEvent();
      if (activeEv) activeEv.fontFamily = e.target.value;
      updateLiveSitePreview();
    });
  }
  if (titleColorPicker) {
    titleColorPicker.addEventListener('input', (e) => {
      builderState.titleColor = e.target.value;
      if (swatchTitleBtn) swatchTitleBtn.style.backgroundColor = e.target.value;
      const activeEv = getActiveEvent();
      if (activeEv) activeEv.titleColor = e.target.value;
      updateLiveSitePreview();
    });
  }

  // 2. Fonte dos Textos / Descrição e Cor
  const selDescFont = document.getElementById('editor-select-desc-font');
  const descColorPicker = document.getElementById('editor-desc-color-picker');
  const swatchDescBtn = document.getElementById('swatch-desc-color-btn');

  if (selDescFont) {
    selDescFont.addEventListener('change', (e) => {
      builderState.descFont = e.target.value;
      const activeEv = getActiveEvent();
      if (activeEv) activeEv.descFont = e.target.value;
      updateLiveSitePreview();
    });
  }
  if (descColorPicker) {
    descColorPicker.addEventListener('input', (e) => {
      builderState.descColor = e.target.value;
      if (swatchDescBtn) swatchDescBtn.style.backgroundColor = e.target.value;
      const activeEv = getActiveEvent();
      if (activeEv) activeEv.descColor = e.target.value;
      updateLiveSitePreview();
    });
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
      if (bgPickerEl) bgPickerEl.value = color.startsWith('#') ? color : '#FBFBFA';
      if (swatchBgBtn) swatchBgBtn.style.backgroundColor = color;
      const activeEv = getActiveEvent();
      if (activeEv) activeEv.bgColor = color;
      updateLiveSitePreview();
    });
  }
  if (bgPickerEl) {
    bgPickerEl.addEventListener('input', (e) => {
      builderState.bgColor = e.target.value;
      if (swatchBgBtn) swatchBgBtn.style.backgroundColor = e.target.value;
      const activeEv = getActiveEvent();
      if (activeEv) activeEv.bgColor = e.target.value;
      updateLiveSitePreview();
    });
  }

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
    cropState.zoom = 1;
    cropState.rotation = 0;
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
          cropState.rawImageSrc = event.target.result;
          cropState.fileName = file.name;
          
          if (cropImageTarget) {
            cropImageTarget.src = cropState.rawImageSrc;
            cropImageTarget.onload = () => {
              resetCropState();
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
      cropState.zoom = Math.min(3, cropState.zoom + 0.2);
      updateCropTransform();
    });
  }
  if (btnCropZoomOut) {
    btnCropZoomOut.addEventListener('click', () => {
      cropState.zoom = Math.max(1, cropState.zoom - 0.2);
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
        if (ratio === '21/9') {
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

        if (cropState.ratio === '21/9') {
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
        c.classList.remove('ring-2', 'ring-[#4E96EF]', 'border-[#4E96EF]', 'bg-blue-50/40');
        c.classList.add('border-zinc-100/80', 'bg-zinc-50');
      });
      card.classList.remove('border-zinc-100/80', 'bg-zinc-50');
      card.classList.add('ring-2', 'ring-[#4E96EF]', 'border-[#4E96EF]', 'bg-blue-50/40');

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
          <input type="text" id="mobile-field-title" value="${inputTitleVal.replace(/"/g, '&quot;')}" class="w-full text-sm p-3 rounded-xl border border-zinc-200 bg-white focus:outline-none focus:ring-2 focus:ring-[#4E96EF] font-bold text-zinc-900">
        </div>
      `;
    } else if (target === 'headline') {
      if (mobileEditTitle) mobileEditTitle.textContent = 'Editar Frase de Chamada';
      const inputHeadlineVal = document.getElementById('editor-hero-headline')?.value || activeEvent.siteSections?.heroHeadline || 'CONVIDAM VOCÊ PARA O SEU CASAMENTO';
      mobileEditContainer.innerHTML = `
        <div>
          <label class="block text-xs font-bold text-zinc-700 mb-1.5">Frase de Chamada</label>
          <input type="text" id="mobile-field-headline" value="${inputHeadlineVal.replace(/"/g, '&quot;')}" class="w-full text-sm p-3 rounded-xl border border-zinc-200 bg-white focus:outline-none focus:ring-2 focus:ring-[#4E96EF] text-zinc-800">
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
            <input type="date" id="mobile-field-date" value="${inputDateVal}" class="w-full text-sm p-3 rounded-xl border border-zinc-200 bg-white focus:outline-none focus:ring-2 focus:ring-[#4E96EF] text-zinc-800 font-medium">
          </div>
          <div>
            <label class="block text-xs font-bold text-zinc-700 mb-1.5">Horário de Início</label>
            <input type="time" id="mobile-field-time" value="${inputTimeVal}" class="w-full text-sm p-3 rounded-xl border border-zinc-200 bg-white focus:outline-none focus:ring-2 focus:ring-[#4E96EF] text-zinc-800 font-medium">
          </div>
        </div>
      `;
    } else if (target === 'venue') {
      if (mobileEditTitle) mobileEditTitle.textContent = 'Editar Local e Endereço';
      const inputLocVal = document.getElementById('editor-data-location')?.value || activeEvent.eventDetails?.locationName || activeEvent.location || 'VILLA BISUTTI - ESPAÇO JARDIM';
      const inputAddrVal = document.getElementById('editor-data-address')?.value || activeEvent.eventDetails?.address || 'Av. Cidade Jardim, 1200 - São Paulo, SP';
      mobileEditContainer.innerHTML = `
        <div class="space-y-3">
          <div>
            <label class="block text-xs font-bold text-zinc-700 mb-1.5">Nome do Espaço / Local</label>
            <input type="text" id="mobile-field-location" value="${inputLocVal.replace(/"/g, '&quot;')}" class="w-full text-sm p-3 rounded-xl border border-zinc-200 bg-white focus:outline-none focus:ring-2 focus:ring-[#4E96EF] font-bold text-zinc-900">
          </div>
          <div>
            <label class="block text-xs font-bold text-zinc-700 mb-1.5">Endereço Completo</label>
            <input type="text" id="mobile-field-address" value="${inputAddrVal.replace(/"/g, '&quot;')}" class="w-full text-sm p-3 rounded-xl border border-zinc-200 bg-white focus:outline-none focus:ring-2 focus:ring-[#4E96EF] text-zinc-800">
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
            <input type="text" class="mobile-preface-input flex-1 text-sm p-2.5 rounded-xl border border-zinc-200 bg-white focus:outline-none focus:ring-2 focus:ring-[#4E96EF]" value="${p.replace(/"/g, '&quot;')}">
            <button type="button" onclick="this.parentElement.remove()" class="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100 flex items-center justify-center text-xs font-bold cursor-pointer">✕</button>
          </div>
        `;
      });
      html += `
        </div>
        <button type="button" id="btn-add-mobile-preface-row" class="text-xs font-bold text-[#4E96EF] flex items-center gap-1 mt-2 cursor-pointer">
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
              <input type="text" class="mobile-preface-input flex-1 text-sm p-2.5 rounded-xl border border-zinc-200 bg-white focus:outline-none focus:ring-2 focus:ring-[#4E96EF]" placeholder="Nova citação ou epígrafe...">
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
            Nenhum convidado cadastrado ainda. Cadastre convidados no menu "Seus Convidados" para enviar convites online.
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
    });
  }

  // ==========================================
  // 6. LISTA DE PRESENTES (Meus Presentes & Presentes Recebidos)
  // ==========================================
  // Funções do Drawer de Adicionar Presente
  function openGiftDrawer() {
    const drawer = document.getElementById('drawer-add-gift');
    const backdrop = document.getElementById('gift-drawer-backdrop');
    if (drawer) {
      drawer.classList.remove('hidden');
      drawer.style.setProperty('display', 'flex', 'important');
      drawer.classList.add('open');
    }
    if (backdrop) {
      backdrop.classList.remove('hidden');
      backdrop.style.setProperty('display', 'block', 'important');
      backdrop.classList.add('open');
    }
  }

  function closeGiftDrawer() {
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
    { title: 'Degustação de Vinhos & Queijos em Toscana', price: 340.00, category: 'honeymoon', image: 'assets/theme_garden.jpg' }
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
    renderHostGifts();
  }

  function renderHostGifts() {
    const container = document.getElementById('host-gifts-grid');
    const headerTitle = document.getElementById('gifts-header-title');
    const headerSub = document.getElementById('gifts-header-subtitle');
    const summaryStats = document.getElementById('gifts-summary-stats');
    const totalCountEl = document.getElementById('gifts-total-count');
    const totalValueEl = document.getElementById('gifts-total-value');

    if (headerTitle) headerTitle.textContent = 'Meus Presentes';
    if (headerSub) headerSub.textContent = 'Todos os presentes cadastrados são fictícios.';
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

    // 2. Card para Criar Presente Aleatório (AO LADO ESQUERDO DE CRIAR PRESENTE)
    const randomCard = document.createElement('div');
    randomCard.className = 'group rounded-2xl border-2 border-dashed border-slate-200 hover:border-indigo-500 bg-white hover:bg-indigo-50/20 p-5 flex flex-col items-center justify-center text-center cursor-pointer transition-all aspect-square shadow-sm hover:shadow-md';
    randomCard.innerHTML = `
      <div class="w-14 h-14 rounded-full bg-indigo-50 border-2 border-indigo-200 shadow-sm flex items-center justify-center text-indigo-600 group-hover:scale-110 group-hover:bg-indigo-600 group-hover:text-white group-hover:border-indigo-600 transition-all">
        <!-- Ícone Random / Shuffle -->
        <svg class="w-6 h-6" fill="none" stroke="currentColor" stroke-width="2.2" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" d="M2 18h1.4c1.3 0 2.5-.6 3.3-1.7l6.1-8.6c.8-1.1 2-1.7 3.3-1.7H22"/>
          <path stroke-linecap="round" stroke-linejoin="round" d="m18 2 4 4-4 4"/>
          <path stroke-linecap="round" stroke-linejoin="round" d="M2 6h1.9c1.5 0 2.9.9 3.6 2.2"/>
          <path stroke-linecap="round" stroke-linejoin="round" d="M22 18h-5.9c-1.3 0-2.5-.7-3.3-1.8l-.5-.8"/>
          <path stroke-linecap="round" stroke-linejoin="round" d="m18 14 4 4-4 4"/>
        </svg>
      </div>
      <span class="font-bold text-slate-800 group-hover:text-indigo-600 text-xs sm:text-sm block transition-colors leading-tight mt-3">
        Presente Aleatório
      </span>
    `;
    randomCard.addEventListener('click', createRandomGift);
    container.appendChild(randomCard);

    // 3. Card para Criar Presente (SEGUNDA OPÇÃO)
    const addCard = document.createElement('div');
    addCard.className = 'group rounded-2xl border-2 border-dashed border-slate-200 hover:border-blue-500 bg-white hover:bg-blue-50/20 p-5 flex flex-col items-center justify-center text-center cursor-pointer transition-all aspect-square shadow-sm hover:shadow-md';
    addCard.innerHTML = `
      <div class="w-14 h-14 rounded-full bg-blue-50 border-2 border-blue-200 shadow-sm flex items-center justify-center text-blue-600 group-hover:scale-110 group-hover:bg-blue-600 group-hover:text-white group-hover:border-blue-600 transition-all">
        <svg class="w-6 h-6" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4"></path>
        </svg>
      </div>
      <span class="font-bold text-slate-800 group-hover:text-blue-600 text-xs sm:text-sm block transition-colors leading-tight mt-3">
        Criar presente
      </span>
    `;
    addCard.addEventListener('click', openGiftDrawer);
    container.appendChild(addCard);

    // 3. Renderiza os cards de presentes no formato limpo da referência (imagem principal no topo, nome e preço embaixo)
    giftList.forEach(gift => {
      const card = document.createElement('div');
      card.className = 'group flex flex-col items-center text-center transition-all relative';

      card.innerHTML = `
        <div class="relative w-full aspect-square rounded-2xl overflow-hidden bg-slate-100 border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
          <img src="${gift.image}" alt="${gift.title}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300">
          
          <button type="button" class="btn-delete-gift absolute top-2 right-2 w-7 h-7 rounded-full bg-white/90 hover:bg-rose-500 text-slate-500 hover:text-white shadow-md flex items-center justify-center text-xs font-bold transition-all opacity-0 group-hover:opacity-100" title="Excluir presente" data-gift-id="${gift.id}">
            ✕
          </button>
        </div>

        <div class="pt-3 w-full px-1">
          <h4 class="font-bold text-slate-900 text-xs sm:text-sm leading-snug line-clamp-2" title="${gift.title}">${gift.title}</h4>
          <div class="text-xs sm:text-sm font-semibold text-slate-600 mt-1">R$ ${gift.price.toFixed(2).replace('.', ',')}</div>
        </div>
      `;

      // Evento de exclusão do presente
      const btnDelete = card.querySelector('.btn-delete-gift');
      if (btnDelete) {
        btnDelete.addEventListener('click', (e) => {
          e.stopPropagation();
          activeEvent.giftList = activeEvent.giftList.filter(g => g.id !== gift.id);
          renderHostGifts();
          showToast(`Presente "${gift.title}" excluído da lista.`, '🗑️');
        });
      }

      container.appendChild(card);
    });
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
            <span class="text-[10px] font-bold text-emerald-600 uppercase tracking-wider block">Presente Recebido ● ${item.method}</span>
            <h4 class="font-bold text-slate-900 text-xs sm:text-sm truncate">${item.giftTitle}</h4>
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
    btnHostAddGift.addEventListener('click', openGiftDrawer);
  }

  const btnCloseGiftDrawer = document.getElementById('btn-close-gift-drawer');
  const giftDrawerBackdrop = document.getElementById('gift-drawer-backdrop');
  if (btnCloseGiftDrawer) btnCloseGiftDrawer.addEventListener('click', closeGiftDrawer);
  if (giftDrawerBackdrop) giftDrawerBackdrop.addEventListener('click', closeGiftDrawer);

  // Adicionar Presente Fictício à comemoração ativa
  const formAddGift = document.getElementById('form-add-gift');
  if (formAddGift) {
    // Preset image picker
    let selectedGiftImage = 'assets/card_lecreuset.jpg';
    document.querySelectorAll('.btn-gift-img-preset').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.btn-gift-img-preset').forEach(b => {
          b.classList.remove('active', 'border-blue-600');
          b.classList.add('border-transparent');
        });
        btn.classList.add('active', 'border-blue-600');
        btn.classList.remove('border-transparent');
        const imgSrc = btn.getAttribute('data-img-src');
        if (imgSrc) {
          selectedGiftImage = imgSrc;
          const urlInput = document.getElementById('gift-image-url-input');
          if (urlInput) urlInput.value = imgSrc;
        }
      });
    });

    formAddGift.addEventListener('submit', (e) => {
      e.preventDefault();
      const activeEvent = getActiveEvent();
      const title = document.getElementById('gift-title-input').value;
      const price = parseFloat(document.getElementById('gift-price-input').value) || 250;
      const category = document.getElementById('gift-category-input').value || 'Cotas & Lua de Mel';
      const urlInput = document.getElementById('gift-image-url-input')?.value;
      const image = urlInput && urlInput.trim() ? urlInput.trim() : selectedGiftImage;

      activeEvent.giftList.unshift({
        id: `gift-${Date.now()}`,
        title: title,
        category: category,
        price: price,
        type: 'virtual',
        marketplaceUrl: null,
        received: 0,
        status: 'Disponível para Presentear',
        image: image,
        contributorsCount: 0
      });

      activeEvent.presentesRecebidos += 1;
      closeGiftDrawer();
      renderHostGifts();
      updateAllCelebrationData();
      showToast(`Presente fictício "${title}" adicionado à lista!`, '🎁');
      triggerConfetti();
    });
  }

  // Alternar sub-seção da Lista de Presentes (Meus Presentes vs Configurações)
  function switchGiftsSubSection(subId) {
    const panelProducts = document.getElementById('gifts-panel-products');
    const panelSettings = document.getElementById('gifts-panel-settings');
    const summaryStats = document.getElementById('gifts-summary-stats');
    const headerTitle = document.getElementById('gifts-header-title');
    const headerSub = document.getElementById('gifts-header-subtitle');

    if (subId === 'gift-settings') {
      if (panelProducts) panelProducts.classList.add('hidden');
      if (panelSettings) panelSettings.classList.remove('hidden');
      if (summaryStats) summaryStats.classList.add('hidden');
      if (headerTitle) headerTitle.textContent = 'Configurações da Lista';
      if (headerSub) headerSub.textContent = 'Configure taxas, parcelamento sem juros para convidados e preferências.';
    } else {
      if (panelProducts) panelProducts.classList.remove('hidden');
      if (panelSettings) panelSettings.classList.add('hidden');
      if (summaryStats) summaryStats.classList.remove('hidden');
      if (headerTitle) headerTitle.textContent = 'Meus Presentes';
      if (headerSub) headerSub.textContent = 'Todos os presentes cadastrados são fictícios.';
      renderHostGifts();
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
  // 7. SEUS CONVIDADOS & RSVP (Layout idêntico ao Casar.com)
  // ==========================================
  let currentRsvpFilter = 'all';

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

    // 2. Contagens das Abas
    const totalCount = activeEvent.guests.length;
    const confirmedCount = activeEvent.guests.filter(g => g.status === 'confirmed').length;
    const declinedCount = activeEvent.guests.filter(g => g.status === 'declined').length;
    const pendingCount = activeEvent.guests.filter(g => g.status === 'pending').length;

    const countAll = document.getElementById('count-rsvp-all');
    const countConfirmed = document.getElementById('count-rsvp-confirmed');
    const countDeclined = document.getElementById('count-rsvp-declined');
    const countPending = document.getElementById('count-rsvp-pending');

    if (countAll) countAll.textContent = totalCount;
    if (countConfirmed) countConfirmed.textContent = confirmedCount;
    if (countDeclined) countDeclined.textContent = declinedCount;
    if (countPending) countPending.textContent = pendingCount;

    // 3. Atualiza Abas com Underline
    document.querySelectorAll('.rsvp-tab-link').forEach(tab => {
      const tabFilter = tab.getAttribute('data-filter');
      if (tabFilter === activeFilter) {
        tab.className = 'rsvp-tab-link active pb-3 border-b-2 border-[#4E96EF] text-zinc-900 transition-all cursor-pointer whitespace-nowrap font-semibold';
      } else {
        tab.className = 'rsvp-tab-link pb-3 border-b-2 border-transparent text-zinc-500 hover:text-zinc-800 hover:border-zinc-300 transition-all cursor-pointer whitespace-nowrap font-medium';
      }
    });

    // 4. Filtragem por Status e por Busca
    const cleanSearch = searchKeyword.toLowerCase().trim();
    const filteredGuests = activeEvent.guests.filter(guest => {
      const matchesFilter = (activeFilter === 'all') || (guest.status === activeFilter);
      const matchesSearch = !cleanSearch || 
        guest.name.toLowerCase().includes(cleanSearch) || 
        (guest.phone && guest.phone.includes(cleanSearch)) ||
        (guest.table && guest.table.toLowerCase().includes(cleanSearch));
      return matchesFilter && matchesSearch;
    });

    if (filteredGuests.length === 0) {
      if (emptyStateEl) emptyStateEl.classList.remove('hidden');
      return;
    } else {
      if (emptyStateEl) emptyStateEl.classList.add('hidden');
    }

    filteredGuests.forEach(guest => {
      const statusBadges = {
        confirmed: '<span class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200/80 whitespace-nowrap">✓ Confirmado</span>',
        pending: '<span class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200/80 whitespace-nowrap">⏳ Pendente</span>',
        declined: '<span class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-rose-50 text-rose-700 border border-rose-200/80 whitespace-nowrap">✕ Recusado</span>'
      };

      const giftsCount = guest.giftsBought ? guest.giftsBought.length : 0;
      const giftsBadge = giftsCount > 0 
        ? `<span class="hidden sm:inline-flex text-[10px] font-medium text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-full border border-emerald-200 ml-1.5 flex-shrink-0" title="${giftsCount} presente(s) comprado(s)">🎁 ${giftsCount}</span>`
        : '';

      const compText = guest.companions > 0 
        ? `+${guest.companions} (${guest.adults || 2} ad.${guest.children ? `, ${guest.children} cr.` : ''})` 
        : 'Individual';

      const row = document.createElement('tr');
      row.className = 'border-b border-zinc-100 hover:bg-zinc-50/70 transition-colors text-xs sm:text-sm cursor-pointer group';
      row.innerHTML = `
        <td class="py-3 px-4 sm:px-6">
          <div class="flex items-center gap-2.5 min-w-0">
            <div class="w-8 h-8 rounded-full bg-zinc-100 text-zinc-700 text-xs font-semibold flex items-center justify-center flex-shrink-0">
              ${guest.name ? guest.name.substring(0, 1).toUpperCase() : 'C'}
            </div>
            <div class="min-w-0 flex-1 truncate">
              <span class="font-medium text-zinc-900 group-hover:text-[#4E96EF] transition-colors block truncate">${guest.name}</span>
              <span class="text-[11px] text-zinc-400 md:hidden block truncate">${compText} ${guest.table ? `• ${guest.table}` : ''}</span>
            </div>
            ${giftsBadge}
          </div>
        </td>
        <td class="py-3 px-4 text-zinc-600 hidden md:table-cell truncate">
          <span class="font-normal text-zinc-600">${compText}</span>
          ${guest.table ? `<span class="text-[11px] text-zinc-400 block truncate">📍 ${guest.table}</span>` : ''}
        </td>
        <td class="py-3 px-4">
          <div class="flex items-center">
            ${statusBadges[guest.status] || guest.status}
          </div>
        </td>
        <td class="py-3 px-4 sm:px-6 text-right">
          <button type="button" class="btn-open-guest-drawer p-1.5 rounded-md hover:bg-zinc-200/60 text-zinc-400 hover:text-zinc-800 transition-all cursor-pointer inline-flex items-center justify-center" title="Ver detalhes do convidado" data-guest-id="${guest.id}">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="1.25"></circle>
              <circle cx="12" cy="5" r="1.25"></circle>
              <circle cx="12" cy="19" r="1.25"></circle>
            </svg>
          </button>
        </td>
      `;

      // Clicar em qualquer lugar da linha ou no botão de 3 pontinhos abre o Drawer com todos os detalhes
      row.addEventListener('click', () => {
        openGuestDrawer(guest.id);
      });

      listEl.appendChild(row);
    });
  }

  // ==========================================
  // 7.1. DRAWER LATERAL: DETALHES DO CONVIDADO
  // ==========================================
  let activeDrawerGuestId = null;

  function openGuestDrawer(guestId) {
    const activeEvent = getActiveEvent();
    const guest = activeEvent.guests.find(g => g.id === guestId);
    if (!guest) return;

    activeDrawerGuestId = guestId;

    const drawer = document.getElementById('drawer-guest-details');
    const backdrop = document.getElementById('guest-drawer-backdrop');
    if (!drawer || !backdrop) return;

    // 1. Header do Drawer
    const nameEl = document.getElementById('guest-drawer-name');
    const avatarEl = document.getElementById('guest-drawer-avatar');
    const badgeEl = document.getElementById('guest-drawer-status-badge');

    if (nameEl) nameEl.textContent = guest.name;

    if (avatarEl) {
      const parts = guest.name.split(' ');
      const initials = parts.length > 1 ? (parts[0][0] + parts[1][0]).toUpperCase() : parts[0].substring(0, 2).toUpperCase();
      avatarEl.textContent = initials;
    }

    if (badgeEl) {
      const statusBadges = {
        confirmed: '<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">✓ Presença Confirmada</span>',
        pending: '<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">⏳ Aguardando Resposta</span>',
        declined: '<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">✕ Presença Recusada</span>'
      };
      badgeEl.innerHTML = statusBadges[guest.status] || guest.status;
    }

    // 2. RSVP & Acompanhantes
    const timeEl = document.getElementById('guest-drawer-confirmed-time');
    const summaryEl = document.getElementById('guest-drawer-companions-summary');
    const companionsListEl = document.getElementById('guest-drawer-companions-list');

    if (timeEl) timeEl.textContent = guest.confirmedAt || (guest.status === 'confirmed' ? 'Confirmado recentemente' : 'Pendente');
    
    const totalPeople = (guest.adults || 1) + (guest.children || 0);
    if (summaryEl) {
      summaryEl.textContent = `${totalPeople} ${totalPeople === 1 ? 'pessoa' : 'pessoas'} (${guest.adults || 1} adultos${guest.children ? `, ${guest.children} crianças` : ''})`;
    }

    if (companionsListEl) {
      companionsListEl.innerHTML = '';
      if (guest.companionsNames && guest.companionsNames.length > 0) {
        guest.companionsNames.forEach(comp => {
          const compItem = document.createElement('div');
          compItem.className = 'p-2 rounded-xl bg-slate-50 border border-slate-100 flex items-center gap-2 text-xs text-slate-700 font-medium';
          compItem.innerHTML = `<span class="text-slate-400">👤</span><span>${comp}</span>`;
          companionsListEl.appendChild(compItem);
        });
      } else {
        companionsListEl.innerHTML = `<span class="text-xs text-slate-400 italic">Nenhum acompanhante adicional cadastrado.</span>`;
      }
    }

    // 3. Informações de Contato, Mesa & Restrições
    const phoneEl = document.getElementById('guest-drawer-phone');
    const emailEl = document.getElementById('guest-drawer-email');
    const tableEl = document.getElementById('guest-drawer-table');
    const dietaryEl = document.getElementById('guest-drawer-dietary');
    const waBtn = document.getElementById('guest-drawer-whatsapp-btn');

    if (phoneEl) phoneEl.textContent = guest.phone || 'Não informado';
    if (emailEl) emailEl.textContent = guest.email || 'Não informado';
    if (tableEl) tableEl.textContent = guest.table || 'Pendente de atribuição';
    if (dietaryEl) dietaryEl.textContent = guest.dietaryRestrictions || 'Nenhuma restrição alimentar cadastrada';

    if (waBtn) {
      waBtn.onclick = () => {
        showToast(`Abrindo conversa de WhatsApp com ${guest.name}...`, '💬');
      };
    }

    // 4. Presentes Comprados por este Convidado
    const totalGiftsEl = document.getElementById('guest-drawer-total-gifts');
    const giftsListEl = document.getElementById('guest-drawer-gifts-list');
    const gifts = guest.giftsBought || [];

    const totalSpent = gifts.reduce((acc, curr) => acc + curr.amount, 0);
    if (totalGiftsEl) {
      totalGiftsEl.textContent = `Total: R$ ${totalSpent.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
      if (totalSpent > 0) {
        totalGiftsEl.className = 'text-xs font-black text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200';
      } else {
        totalGiftsEl.className = 'text-xs font-bold text-slate-400 bg-slate-100 px-2.5 py-0.5 rounded-full';
      }
    }

    if (giftsListEl) {
      giftsListEl.innerHTML = '';
      if (gifts.length === 0) {
        giftsListEl.innerHTML = `
          <div class="p-4 rounded-2xl bg-slate-50 border border-dashed border-slate-200 text-center space-y-2">
            <span class="text-2xl block">🎁</span>
            <p class="text-xs font-bold text-slate-700">Ainda não comprou nenhum presente</p>
            <p class="text-[11px] text-slate-400">Este convidado ainda não presenteou pela lista online.</p>
            <button type="button" class="btn-copy-guest-gift-link px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 text-[11px] font-bold transition-colors">
              📋 Copiar Link da Lista de Presentes
            </button>
          </div>
        `;

        const copyBtn = giftsListEl.querySelector('.btn-copy-guest-gift-link');
        if (copyBtn) {
          copyBtn.onclick = () => {
            navigator.clipboard?.writeText(activeEvent.publicUrl || 'https://love.com.br/beatriz-e-lucas');
            showToast('Link da lista copiado para a área de transferência!', '📋');
          };
        }
      } else {
        gifts.forEach(g => {
          const item = document.createElement('div');
          item.className = 'p-3.5 rounded-2xl border border-slate-200 bg-white shadow-sm flex items-start gap-3 hover:shadow-md transition-shadow';
          item.innerHTML = `
            <img src="${g.image}" class="w-14 h-14 rounded-xl object-cover border border-slate-100 flex-shrink-0" alt="${g.giftTitle}">
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-1.5 flex-wrap mb-0.5">
                ${g.type === 'real' 
                  ? '<span class="text-[9px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">📦 Produto Real</span>' 
                  : '<span class="text-[9px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">💵 Resgate em Dinheiro</span>'}
                <span class="text-[10px] text-slate-400">${g.date}</span>
              </div>
              <h5 class="text-xs font-bold text-slate-900 truncate">${g.giftTitle}</h5>
              <div class="text-xs font-black text-emerald-600 mt-0.5">R$ ${g.amount.toFixed(2).replace('.', ',')} (${g.method})</div>
              ${g.message ? `<div class="mt-1.5 p-2 rounded-xl bg-slate-50 border border-slate-100 text-[11px] text-slate-600 italic">"${g.message}"</div>` : ''}
            </div>
          `;
          giftsListEl.appendChild(item);
        });
      }
    }

    // Exibe o drawer
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

  function closeGuestDrawer() {
    const drawer = document.getElementById('drawer-guest-details');
    const backdrop = document.getElementById('guest-drawer-backdrop');
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
    activeDrawerGuestId = null;
  }

  // Listener fechar drawer
  const btnCloseGuestDrawer = document.getElementById('btn-close-guest-drawer');
  const guestDrawerBackdrop = document.getElementById('guest-drawer-backdrop');
  if (btnCloseGuestDrawer) btnCloseGuestDrawer.addEventListener('click', closeGuestDrawer);
  if (guestDrawerBackdrop) guestDrawerBackdrop.addEventListener('click', closeGuestDrawer);

  // Listeners para alterar status de RSVP diretamente do drawer
  document.querySelectorAll('.btn-change-rsvp-status').forEach(btn => {
    btn.addEventListener('click', () => {
      if (!activeDrawerGuestId) return;
      const activeEvent = getActiveEvent();
      const guest = activeEvent.guests.find(g => g.id === activeDrawerGuestId);
      if (!guest) return;

      const newStatus = btn.getAttribute('data-new-status');
      guest.status = newStatus;
      if (newStatus === 'confirmed') {
        guest.confirmedAt = 'Confirmado agora via painel';
      } else if (newStatus === 'declined') {
        guest.confirmedAt = 'Recusado via painel';
      } else {
        guest.confirmedAt = 'Aguardando resposta';
      }

      // Recalcula KPIs
      activeEvent.convidadosConfirmados = activeEvent.guests.filter(g => g.status === 'confirmed').length;
      activeEvent.convidadosRecusados = activeEvent.guests.filter(g => g.status === 'declined').length;
      activeEvent.convidadosPendentes = activeEvent.guests.filter(g => g.status === 'pending').length;

      renderGuestsTable(currentRsvpFilter);
      openGuestDrawer(activeDrawerGuestId);
      updateAllCelebrationData();
      showToast(`Status de ${guest.name} alterado com sucesso!`, '🎟️');
    });
  });

  // Listener para Busca de Convidado em Tempo Real
  const inputRsvpSearch = document.getElementById('rsvp-search-input');
  if (inputRsvpSearch) {
    inputRsvpSearch.addEventListener('input', (e) => {
      renderGuestsTable(currentRsvpFilter, e.target.value);
    });
  }

  // Listeners das abas com underline (Todos, Confirmados, Recusados, Pendentes)
  document.querySelectorAll('.rsvp-tab-link').forEach(btn => {
    btn.addEventListener('click', () => {
      const filter = btn.getAttribute('data-filter') || 'all';
      const searchVal = inputRsvpSearch ? inputRsvpSearch.value : '';
      renderGuestsTable(filter, searchVal);
    });
  });

  // ==========================================
  // 7.1. RECADOS RECEBIDOS DOS CONVIDADOS
  // ==========================================
  function renderRecadosMural() {
    const container = document.getElementById('recados-mural-grid');
    if (!container) return;

    container.innerHTML = '';
    const activeEvent = getActiveEvent();
    const messages = activeEvent.messages || [];

    if (messages.length === 0) {
      container.innerHTML = `
        <div class="col-span-2 py-12 text-center bg-white rounded-3xl border border-slate-200 p-8 space-y-2">
          <span class="text-4xl">💌</span>
          <h4 class="text-sm font-bold text-slate-800">Ainda não há recados registrados</h4>
          <p class="text-xs text-slate-400">Assim que seus convidados confirmarem presença no site, as mensagens aparecerão aqui.</p>
        </div>
      `;
      return;
    }

    messages.forEach(msg => {
      const card = document.createElement('div');
      card.className = 'bg-white rounded-3xl border border-slate-200/90 p-6 shadow-sm flex flex-col justify-between gap-4 hover:shadow-md transition-shadow relative overflow-hidden';
      card.innerHTML = `
        <div class="space-y-3">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-full bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-500 font-black text-sm">
                ${msg.author.charAt(0)}
              </div>
              <div>
                <h4 class="font-bold text-slate-900 text-sm leading-tight">${msg.author}</h4>
                <span class="text-[11px] text-slate-400 font-medium">${msg.date}</span>
              </div>
            </div>
            <span class="text-xs font-bold text-rose-500 bg-rose-50 px-2.5 py-1 rounded-full border border-rose-100 flex items-center gap-1">
              ❤️ Presença Confirmada
            </span>
          </div>

          <div class="p-4 rounded-2xl bg-rose-50/40 border border-rose-100/60 text-xs sm:text-sm text-slate-700 leading-relaxed italic relative">
            <span class="text-rose-300 font-serif text-2xl absolute top-1 left-2">“</span>
            <p class="pl-4">${msg.text}</p>
          </div>
        </div>

        <div class="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
          <span class="text-slate-400 text-[11px]">Enviado via RSVP Online</span>
          <button class="btn-agradecer-whatsapp text-xs font-bold text-emerald-600 hover:text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200 flex items-center gap-1">
            <span>💬 Agradecer via WhatsApp</span>
          </button>
        </div>
      `;

      const btnAg = card.querySelector('.btn-agradecer-whatsapp');
      if (btnAg) {
        btnAg.addEventListener('click', () => {
          showToast(`Mensagem de agradecimento criada para ${msg.author}!`, '💬');
        });
      }

      container.appendChild(card);
    });
  }

  // Adicionar Convidado à comemoração ativa
  const formAddGuest = document.getElementById('form-add-guest');
  if (formAddGuest) {
    formAddGuest.addEventListener('submit', (e) => {
      e.preventDefault();
      const activeEvent = getActiveEvent();
      const name = document.getElementById('guest-name-input').value;
      const companions = parseInt(document.getElementById('guest-companions-input').value) || 0;
      const phone = document.getElementById('guest-phone-input').value || '(11) 99999-9999';

      activeEvent.guests.unshift({
        id: `g-${Date.now()}`,
        name: name,
        companions: companions,
        phone: phone,
        table: 'Mesa a Definir',
        status: 'pending'
      });

      activeEvent.totalConvidados += (1 + companions);
      closeModal(elements.modals.addGuest);
      renderGuestsTable();
      updateAllCelebrationData();
      showToast(`Convidado ${name} adicionado à lista de ${activeEvent.title}!`, '👤');
    });
  }

  // ==========================================
  // ==========================================
  // 8. FINANCEIRO: CARTEIRA DIGITAL, ORÇAMENTO & EXTRATO
  // ==========================================
  function switchWalletSubSection(subId, subLabel) {
    const title = document.getElementById('wallet-header-title');
    const desc = document.getElementById('wallet-header-desc');

    if (title) {
      if (subId === 'wallet-digital') {
        title.textContent = 'Carteira Digital';
        if (desc) desc.textContent = 'Acompanhe seu saldo disponível, arrecadações em dinheiro e solicite resgates instantâneos via PIX.';
      } else if (subId === 'wallet-budget') {
        title.textContent = 'Orçamento';
        if (desc) desc.textContent = 'Planeje metas, controle custos comprometidos e gerencie despesas de fornecedores do evento.';
      } else if (subId === 'wallet-statement') {
        title.textContent = 'Extrato';
        if (desc) desc.textContent = 'Histórico completo de entradas de presentes, saques PIX realizados e conciliação financeira.';
      } else {
        title.textContent = subLabel;
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
      row.className = 'border-b border-gray-100 hover:bg-slate-50/80 transition-colors text-xs sm:text-sm';
      row.innerHTML = `
        <td class="py-3.5 px-4">
          <div class="font-bold text-slate-900">${tx.title}</div>
          <div class="text-[11px] text-slate-500">${tx.guest} • ${tx.method}</div>
        </td>
        <td class="py-3.5 px-4 text-slate-500 text-xs">${tx.date}</td>
        <td class="py-3.5 px-4">
          <span class="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold ${tx.status === 'Disponível' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-blue-50 text-blue-700 border border-blue-200'}">
            ● ${tx.status}
          </span>
        </td>
        <td class="py-3.5 px-4 text-right font-extrabold ${isNegative ? 'text-slate-800' : 'text-emerald-600'}">
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
    if (modalSelectEventType) closeModal(modalSelectEventType);

    openCreateEventPage(false, true);

    const inputName = document.getElementById('page-new-event-name');
    if (inputName) {
      if (!inputName.value) {
        inputName.placeholder = `Ex: ${typeLabel || 'Novo Evento'} de Beatriz & Lucas`;
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
        coverImage: createdCoverImageSrc,
        theme: themeSelect ? themeSelect.options[themeSelect.selectedIndex].text : 'Minimalista',
        colorAccent: '#4E96EF',
        totalArrecadado: 0.00,
        convidadosConfirmados: 0,
        totalConvidados: 50,
        presentesRecebidos: 0,
        siteSections: {
          heroHeadline: `Bem-vindo ao ${name}!`,
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
    formLoginEmail.addEventListener('submit', (e) => {
      e.preventDefault();
      setSidebarLocked(false);
      closeModal(elements.modalFakeLogin);
      switchView('dashboard');
    });
  }

  // 10.2 Login com Google (Conta Existente)
  const btnGoogleLogin = document.getElementById('btn-google-login');
  if (btnGoogleLogin) {
    btnGoogleLogin.addEventListener('click', () => {
      setSidebarLocked(false);
      closeModal(elements.modalFakeLogin);
      switchView('dashboard');
    });
  }

  // 10.2b Login com Apple (Conta Existente)
  const btnAppleLogin = document.getElementById('btn-apple-login');
  if (btnAppleLogin) {
    btnAppleLogin.addEventListener('click', () => {
      setSidebarLocked(false);
      closeModal(elements.modalFakeLogin);
      switchView('dashboard');
    });
  }

  // 10.3 Cadastro com Google (Primeiro Acesso)
  const btnGoogleRegister = document.getElementById('btn-google-register');
  if (btnGoogleRegister) {
    btnGoogleRegister.addEventListener('click', () => {
      closeModal(elements.modals.register);
      startFirstAccessFlow();
      triggerConfetti();
    });
  }

  // 10.3b Cadastro com Apple (Primeiro Acesso)
  const btnAppleRegister = document.getElementById('btn-apple-register');
  if (btnAppleRegister) {
    btnAppleRegister.addEventListener('click', () => {
      closeModal(elements.modals.register);
      startFirstAccessFlow();
      triggerConfetti();
    });
  }

  // 10.4 Formulário Criar Conta Grátis (Nome e E-mail, sem senha)
  const formRegisterUser = document.getElementById('form-register-user');
  if (formRegisterUser) {
    formRegisterUser.addEventListener('submit', (e) => {
      e.preventDefault();
      const nameInput = document.getElementById('register-name-input');
      const emailInput = document.getElementById('register-email-input');
      const emailVal = emailInput && emailInput.value.trim() ? emailInput.value.trim() : 'beatriz@exemplo.com';
      const targetEmailEl = document.getElementById('verify-code-email-target');
      if (targetEmailEl) targetEmailEl.textContent = emailVal;

      closeModal(elements.modals.register);
      openModal(elements.modals.verifyCode);

      // Foco no primeiro dígito
      const firstOtp = document.querySelector('.otp-code-input[data-idx="0"]');
      if (firstOtp) setTimeout(() => firstOtp.focus(), 150);

      showToast(`Código de 4 dígitos enviado para ${emailVal}`, '📩');
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
          elements.dashHeader.btnCopyShareUrl.classList.remove('bg-[#4E96EF]');
          elements.dashHeader.btnCopyShareUrl.classList.add('bg-emerald-600');
          setTimeout(() => {
            elements.dashHeader.btnCopyShareUrl.textContent = 'Copiar';
            elements.dashHeader.btnCopyShareUrl.classList.remove('bg-emerald-600');
            elements.dashHeader.btnCopyShareUrl.classList.add('bg-[#4E96EF]');
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
    elements.dashHeader.btnLogout.addEventListener('click', () => {
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
  let currentB2BCategory = 'venues';
  let currentB2BSort = 'recommended';
  let activeB2BItemId = 'venue-villa-bisutti';
  let b2bSearchQuery = '';

  function initB2BMarketplace() {
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
          p.classList.remove('border-[#4E96EF]', 'text-zinc-900', 'font-semibold', 'active');
          p.classList.add('border-transparent', 'text-zinc-500', 'font-medium');
        });
        pill.classList.remove('border-transparent', 'text-zinc-500', 'font-medium');
        pill.classList.add('border-[#4E96EF]', 'text-zinc-900', 'font-semibold', 'active');

        currentB2BCategory = pill.getAttribute('data-category') || 'venues';
        renderB2BExplore();
      });
    });

    // 12.3 Busca em Tempo Real
    const b2bSearch = document.getElementById('b2b-search-input');
    if (b2bSearch) {
      b2bSearch.addEventListener('input', (e) => {
        b2bSearchQuery = e.target.value.toLowerCase().trim();
        renderB2BExplore();
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

    if (currentB2BCategory === 'venues' || currentB2BCategory === 'all') {
      items = (window.LOVE_DATA.venues || []).map(v => ({ ...v, type: 'venue' }));
      categoryName = 'locais & espaços';
    } else if (currentB2BCategory === 'advisors') {
      items = (window.LOVE_DATA.advisors || []).map(a => ({ ...a, type: 'advisor' }));
      categoryName = 'assessores & cerimonial';
    } else if (currentB2BCategory === 'photo') {
      items = (window.LOVE_DATA.photo || []).map(p => ({ ...p, type: 'photo' }));
      categoryName = 'profissionais de foto & vídeo';
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

      const description = item.description || item.about || (item.role ? `${item.role} • Especialista em casamentos memoráveis.` : 'Serviços completos e atendimento de excelência para o seu casamento.');
      const locationText = item.location || item.neighborhood || 'São Paulo - SP';
      const priceText = item.price || item.startingPrice || item.priceLabel || 'Sob consulta';
      const countLabel = item.weddingsCount ? `${item.weddingsCount} Casamentos` : `${item.reviewsCount || 20} Avaliações`;

      const card = document.createElement('div');
      card.id = `card-${item.id}`;
      card.className = 'b2b-item-card bg-white rounded-2xl border border-zinc-200/80 p-4 sm:p-5 flex flex-col md:flex-row gap-5 items-stretch shadow-xs hover:shadow-md transition-all group relative cursor-pointer';

      card.innerHTML = `
        <div class="relative w-full md:w-80 lg:w-96 h-48 md:h-52 rounded-xl overflow-hidden bg-zinc-100 flex-shrink-0">
          <img src="${item.image}" alt="${item.name}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500">
          <button type="button" class="btn-toggle-card-fav absolute top-3 right-3 w-8 h-8 rounded-full bg-white/90 hover:bg-white text-zinc-400 ${item.isFavorite ? 'text-rose-500' : ''} flex items-center justify-center transition-all shadow-xs" title="Favoritar">
            <svg class="w-4 h-4 ${item.isFavorite ? 'fill-rose-500' : 'fill-none'} stroke-current" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
          </button>
        </div>

        <div class="flex-1 flex flex-col justify-between min-w-0 py-0.5">
          <div>
            <span class="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-semibold ${tagBg}">${tagText}</span>
            <h3 class="text-base sm:text-lg font-bold text-zinc-900 mt-2 leading-snug truncate group-hover:text-[#4E96EF] transition-colors">${item.name}</h3>
            <p class="text-xs sm:text-sm text-zinc-600 mt-1 leading-relaxed line-clamp-2">${description}</p>
            <p class="text-xs sm:text-sm font-medium text-zinc-500 mt-2.5 flex flex-wrap items-center gap-2">
              <span>${locationText}</span>
              <span>•</span>
              <span class="font-semibold text-zinc-900">${priceText}</span>
            </p>
          </div>

          <div class="flex flex-wrap items-center justify-between gap-3 pt-3 mt-3 border-t border-zinc-100">
            <div class="flex items-center gap-2">
              <div class="flex -space-x-1.5 overflow-hidden">
                <div class="w-6 h-6 rounded-full bg-blue-100 border border-white flex items-center justify-center text-[10px] font-bold text-blue-600">👰</div>
                <div class="w-6 h-6 rounded-full bg-emerald-100 border border-white flex items-center justify-center text-[10px] font-bold text-emerald-600">🤵</div>
              </div>
              <span class="text-xs font-semibold text-zinc-700">+${countLabel}</span>
            </div>

            <div class="flex items-center gap-2">
              <button type="button" class="btn-supplier-details px-4 py-2 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-800 text-xs font-semibold transition-all cursor-pointer">
                Ver Detalhes
              </button>
              <button type="button" class="btn-supplier-contact px-4 py-2 rounded-xl bg-[#4E96EF] hover:bg-[#3A80D8] text-white text-xs font-bold transition-all shadow-xs cursor-pointer">
                Solicitar Orçamento
              </button>
            </div>
          </div>
        </div>
      `;

      card.querySelector('.btn-toggle-card-fav')?.addEventListener('click', (e) => {
        e.stopPropagation();
        item.isFavorite = !item.isFavorite;
        renderB2BExplore();
      });

      card.querySelector('.btn-supplier-details')?.addEventListener('click', (e) => {
        e.stopPropagation();
        openB2BMobileModal(item, item.type || 'venue');
      });

      card.querySelector('.btn-supplier-contact')?.addEventListener('click', (e) => {
        e.stopPropagation();
        switchB2BView('messages', item.chatId || 'mariana-assessoria');
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
            isSelected ? 'bg-[#4E96EF] text-white scale-110 shadow-lg ring-2 ring-white' : 'bg-amber-500 text-white shadow-md hover:bg-[#4E96EF] hover:scale-105'
          } text-[11px] font-bold px-2.5 py-1 rounded-full whitespace-nowrap transition-all flex items-center gap-1">
            <span>${venue.price.split(' ')[1] || venue.price}</span>
          </div>
          <div class="w-2 h-2 ${isSelected ? 'bg-[#4E96EF]' : 'bg-amber-500'} rotate-45 -mt-1 shadow-xs"></div>

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
            c.classList.remove('border-[#4E96EF]', 'shadow-md', 'ring-1', 'ring-[#4E96EF]/30');
            c.classList.add('border-zinc-200', 'shadow-2xs');
          });
          card.classList.remove('border-zinc-200', 'shadow-2xs');
          card.classList.add('border-[#4E96EF]', 'shadow-md', 'ring-1', 'ring-[#4E96EF]/30');
        }
      });

      container.appendChild(pin);
    });
  }

  function highlightMapPin(venueId) {
    document.querySelectorAll('#b2b-map-pins-container .pin-badge').forEach(b => {
      b.classList.remove('bg-[#4E96EF]', 'scale-110', 'ring-2', 'ring-white');
      b.classList.add('bg-amber-500');
    });
    const activePin = document.getElementById(`map-pin-${venueId}`);
    if (activePin) {
      const badge = activePin.querySelector('.pin-badge');
      if (badge) {
        badge.classList.remove('bg-amber-500');
        badge.classList.add('bg-[#4E96EF]', 'scale-110', 'ring-2', 'ring-white');
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
              <button type="button" class="btn-open-chat-with-advisor bg-[#4E96EF] hover:bg-blue-600 text-white px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 shadow-sm transition-all cursor-pointer" data-chat-id="${adv.chatId}">
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
              <span class="text-sm font-black text-[#4E96EF]">${item.price}</span>
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
          <button type="button" class="btn-mobile-chat-cta w-full bg-[#4E96EF] text-white py-3 rounded-xl font-bold text-xs shadow-md cursor-pointer">
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
          <button type="button" class="btn-mobile-chat-cta w-full bg-[#4E96EF] text-white py-3 rounded-xl font-bold text-xs shadow-md cursor-pointer">
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
  let activeB2BConversationId = 'mariana-assessoria';

  const b2bConversationsData = [
    {
      id: 'mariana-assessoria',
      name: 'Mariana & Co. Assessoria',
      category: 'Assessoria & Cerimonial',
      avatar: 'assets/theme_garden.jpg',
      online: true,
      lastMessage: 'Acabei de anexar nossa apresentação com os valores e fotos dos últimos casamentos.',
      time: '14:20',
      unread: 1,
      messages: [
        { sender: 'them', text: 'Olá Beatriz & Lucas! Tudo bem? Recebemos a solicitação de vocês para a data do casamento em 2026.', time: '14:10' },
        { sender: 'me', text: 'Olá Mariana! Que ótimo! Adoramos o portfólio de vocês. Poderia nos enviar a proposta detalhada com assessoria completa?', time: '14:15' },
        { sender: 'them', text: 'Com certeza! Acabei de anexar nossa apresentação com os valores e fotos dos últimos casamentos. Fico à disposição para agendarmos uma reunião ou degustação!', time: '14:20' }
      ]
    },
    {
      id: 'villa-bisutti',
      name: 'Villa Bisutti Casa do Ator',
      category: 'Espaço & Gastronomia',
      avatar: 'assets/theme_blacktie.jpg',
      online: true,
      lastMessage: 'A data de 28/08/2026 está pré-reservada para vocês. Gostariam de agendar uma visita guiada?',
      time: '11:05',
      unread: 0,
      messages: [
        { sender: 'them', text: 'Olá Beatriz & Lucas! Sejam muito bem-vindos ao Villa Bisutti.', time: '10:45' },
        { sender: 'me', text: 'Bom dia! Gostaríamos de saber sobre a capacidade máxima e o formato do buffet para 250 convidados.', time: '11:00' },
        { sender: 'them', text: 'A Casa do Ator comporta confortavelmente até 320 convidados sentados! A data de 28/08/2026 está pré-reservada para vocês. Gostariam de agendar uma visita guiada?', time: '11:05' }
      ]
    },
    {
      id: 'palacio-tangara',
      name: 'Palácio Tangará Hotel',
      category: 'Espaço de Luxo & Hotel',
      avatar: 'assets/theme_garden.jpg',
      online: false,
      lastMessage: 'Será um prazer recebê-los para o tour no jardim Burle Marx nesta sexta-feira.',
      time: 'Ontem',
      unread: 0,
      messages: [
        { sender: 'me', text: 'Boa tarde! Qual é o procedimento para reservar o salão nobre e a suíte nupcial?', time: 'Ontem 16:30' },
        { sender: 'them', text: 'Olá! Será um prazer recebê-los para o tour no jardim Burle Marx nesta sexta-feira. Podemos preparar um welcome drink para o casal.', time: 'Ontem 17:15' }
      ]
    },
    {
      id: 'felipe-ramos-foto',
      name: 'Felipe Ramos Fotografia',
      category: 'Foto & Vídeo Cinema',
      avatar: 'assets/wedding_hero_banner.jpg',
      online: true,
      lastMessage: 'Enviei o link da nossa galeria completa de casamentos na praia e campo.',
      time: 'Ontem',
      unread: 0,
      messages: [
        { sender: 'them', text: 'Olá noivos! Que honra poder registrar a história de vocês.', time: 'Ontem 13:00' },
        { sender: 'them', text: 'Enviei o link da nossa galeria completa de casamentos na praia e campo. Trabalhamos com cobertura de drone e fotos analógicas também!', time: 'Ontem 13:02' }
      ]
    },
    {
      id: 'espaco-wood',
      name: 'Espaço Wood Garden',
      category: 'Espaço Rústico Chic',
      avatar: 'assets/theme_coastal.jpg',
      online: false,
      lastMessage: 'Temos opções de cardápio vegetariano e tradicional inclusas na contratação.',
      time: '26 Ago',
      unread: 0,
      messages: [
        { sender: 'them', text: 'Olá! Segue em anexo as opções de plantas baixas e cenários para a cerimônia no gazebo.', time: '26 Ago' },
        { sender: 'them', text: 'Temos opções de cardápio vegetariano e tradicional inclusas na contratação.', time: '26 Ago' }
      ]
    },
    {
      id: 'juliana-toledo',
      name: 'Juliana Toledo Cerimonial',
      category: 'Assessoria & Cerimonial',
      avatar: 'assets/theme_garden.jpg',
      online: false,
      lastMessage: 'Combinado! Nos falamos na quinta-feira para o alinhamento do cronograma.',
      time: '22 Ago',
      unread: 0,
      messages: [
        { sender: 'me', text: 'Oi Juliana! Recebemos sua mensagem e já aprovamos os fornecedores de doces.', time: '22 Ago' },
        { sender: 'them', text: 'Combinado! Nos falamos na quinta-feira para o alinhamento do cronograma.', time: '22 Ago' }
      ]
    }
  ];

  function switchB2BView(viewId, targetVendorId) {
    const exploreView = document.getElementById('b2b-explore-view');
    const messagesView = document.getElementById('b2b-messages-view');
    const contractedView = document.getElementById('b2b-contracted-view');
    const insuranceView = document.getElementById('b2b-insurance-view');
    const b2bNavTabs = document.querySelectorAll('.tab-b2b-nav');

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
        'contracted': 'Contratados',
        'insurance': 'Serviços',
        'favorites': 'Favoritos'
      };
      const targetLabel = b2bItemMap[viewId] || 'Explorar';
      elements.drawerSubItemsList.querySelectorAll('.sub-drawer-item').forEach((b) => {
        b.classList.toggle('active', b.textContent.includes(targetLabel));
      });
    }

    if (viewId === 'messages') {
      document.body.classList.add('b2b-chat-mode');
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
      if (viewId === 'contracted') {
        if (exploreView) exploreView.classList.add('hidden');
        if (messagesView) messagesView.classList.add('hidden');
        if (insuranceView) insuranceView.classList.add('hidden');
        if (contractedView) contractedView.classList.remove('hidden');
        renderB2BContracted();
      } else if (viewId === 'insurance') {
        if (exploreView) exploreView.classList.add('hidden');
        if (messagesView) messagesView.classList.add('hidden');
        if (contractedView) contractedView.classList.add('hidden');
        if (insuranceView) insuranceView.classList.remove('hidden');
      } else {
        if (messagesView) messagesView.classList.add('hidden');
        if (contractedView) contractedView.classList.add('hidden');
        if (insuranceView) insuranceView.classList.add('hidden');
        if (exploreView) exploreView.classList.remove('hidden');
        if (viewId === 'favorites') {
          currentB2BCategory = 'favorites';
          const favPill = document.querySelector('.b2b-category-pill[data-category="favorites"]');
          if (favPill) {
            document.querySelectorAll('.b2b-category-pill').forEach(p => {
              p.classList.remove('border-[#4E96EF]', 'text-zinc-900', 'font-semibold', 'active');
              p.classList.add('border-transparent', 'text-zinc-500', 'font-medium');
            });
            favPill.classList.remove('border-transparent', 'text-zinc-500', 'font-medium');
            favPill.classList.add('border-[#4E96EF]', 'text-zinc-900', 'font-semibold', 'active');
          }
        } else if (viewId === 'explore' && currentB2BCategory === 'favorites') {
          currentB2BCategory = 'venues';
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
                <svg class="w-4 h-4 text-[#4E96EF]" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/></svg>
                <span>Chat</span>
              </button>
              <button type="button" class="btn-contracted-actions px-5 py-2.5 rounded-xl bg-[#4E96EF] hover:bg-[#3A80D8] text-white text-xs sm:text-sm font-bold transition-all shadow-xs cursor-pointer flex items-center gap-2">
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
            <span class="text-base font-black text-[#4E96EF] mt-0.5 block">${vendor.paidValue || vendor.negotiatedValue}</span>
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

  function renderB2BChat() {
    renderB2BChatContacts();
    renderB2BChatMessages();
  }

  function renderB2BChatContacts(filterQuery = '') {
    const list = document.getElementById('b2b-chat-contacts-list');
    if (!list) return;

    list.innerHTML = '';
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
        isActive ? 'bg-[#EBF4FF] border-l-4 border-[#4E96EF]' : 'hover:bg-zinc-200/50 border-l-4 border-transparent'
      }`;

      item.innerHTML = `
        <div class="relative flex-shrink-0">
          <img src="${conv.avatar}" alt="${conv.name}" class="w-10 h-10 rounded-full object-cover border border-zinc-200">
          ${conv.online ? '<span class="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-white"></span>' : ''}
        </div>
        <div class="flex-1 min-w-0">
          <div class="flex items-center justify-between gap-1 mb-0.5">
            <h4 class="text-xs sm:text-sm font-medium ${isActive ? 'text-[#3A80D8] font-semibold' : 'text-zinc-900'} truncate">${conv.name}</h4>
            <span class="text-[10px] text-zinc-400 flex-shrink-0">${conv.time}</span>
          </div>
          <span class="inline-block text-[10px] font-medium text-zinc-500 bg-white/70 px-1.5 py-0.5 rounded border border-zinc-200/60 mb-1">${conv.category}</span>
          <p class="text-xs text-zinc-500 truncate leading-tight">${conv.lastMessage}</p>
        </div>
        ${conv.unread > 0 ? `<span class="w-2.5 h-2.5 rounded-full flex-shrink-0 mt-2 ring-2 ring-white shadow-2xs" style="background-color: #F7B99E;"></span>` : ''}
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
    if (!activeConv) return;

    if (nameEl) nameEl.textContent = activeConv.name;
    if (statusEl) statusEl.textContent = `${activeConv.category} • ${activeConv.online ? 'Online agora' : 'Online recentemente'}`;
    if (avatarEl) avatarEl.src = activeConv.avatar;

    container.innerHTML = `
      <div class="flex justify-center my-2">
        <span class="px-3 py-1 bg-white border border-zinc-200 text-zinc-400 text-[11px] rounded-full shadow-2xs">Hoje, 31 de Agosto</span>
      </div>
    `;

    activeConv.messages.forEach(msg => {
      const isMe = msg.sender === 'me';
      const row = document.createElement('div');
      row.className = `flex items-end gap-2.5 ${isMe ? 'justify-end' : 'justify-start'}`;

      if (isMe) {
        row.innerHTML = `
          <div class="max-w-[80%] sm:max-w-[70%] space-y-1 text-right">
            <div class="bg-[#4E96EF] text-white p-3.5 rounded-2xl rounded-br-xs text-xs sm:text-sm leading-relaxed shadow-xs text-left">
              ${msg.text}
            </div>
            <div class="flex items-center justify-end gap-1 text-[10px] text-zinc-400 pr-1">
              <span>${msg.time || 'Agora'}</span>
              <span class="text-blue-500 font-bold">✓✓</span>
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
              ${msg.text}
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
    const chatSearch = document.getElementById('b2b-chat-search-input');

    if (chatSearch) {
      chatSearch.addEventListener('input', (e) => {
        renderB2BChatContacts(e.target.value);
      });
    }

    if (chatForm && chatInput) {
      chatForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const text = chatInput.value.trim();
        if (!text) return;

        const activeConv = b2bConversationsData.find(c => c.id === activeB2BConversationId);
        if (!activeConv) return;

        const now = new Date();
        const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

        activeConv.messages.push({
          sender: 'me',
          text: text,
          time: timeStr
        });
        activeConv.lastMessage = text;
        activeConv.time = timeStr;

        chatInput.value = '';
        renderB2BChat();

        // Resposta automatizada realista do fornecedor
        setTimeout(() => {
          const replies = [
            'Perfeito! Recebemos sua mensagem e entraremos em contato com todos os detalhes.',
            'Excelente! Já estamos preparando o orçamento atualizado para vocês.',
            'Maravilha! Fico à total disposição para agendarmos uma apresentação.',
            'Combinado! Em instantes enviaremos a proposta formatada em PDF.'
          ];
          const randomReply = replies[Math.floor(Math.random() * replies.length)];

          activeConv.messages.push({
            sender: 'them',
            text: randomReply,
            time: timeStr
          });
          activeConv.lastMessage = randomReply;
          renderB2BChat();
        }, 1100);
      });
    }

    const chatAttachBtn = document.getElementById('b2b-chat-attach-btn');
    if (chatAttachBtn) {
      chatAttachBtn.addEventListener('click', () => {
        showToast('Selecione um arquivo ou foto para anexar à conversa.', '📎');
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
      switchRailTab('suppliers');
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
      // Ao abrir o popup de local a partir da home, o fundo abre na sub-seção 'Informações'
      switchRailTab('edit-site');
      switchEditorSubSection('data', 'Informações');
      
      // Atualiza o destaque ativo no sub-drawer
      if (elements.drawerSubItemsList) {
        elements.drawerSubItemsList.querySelectorAll('.sub-drawer-item').forEach((b) => {
          const isInfo = b.textContent.includes('Informações');
          b.classList.toggle('active', isInfo);
        });
      }

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
                .tag { border: 2px dashed #4E96EF; border-radius: 12px; padding: 15px; text-align: center; }
                .title { font-size: 14px; font-weight: bold; color: #1E293B; margin-bottom: 5px; }
                .subtitle { font-size: 11px; color: #64748B; margin-bottom: 10px; }
                .url { font-size: 11px; font-weight: bold; color: #4E96EF; word-break: break-all; }
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
    btnAccountLogout.addEventListener('click', () => {
      dropdownUserAccount?.classList.add('hidden');
      localStorage.removeItem('love_authenticated_user');
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

  // Retorno universal à Home/Visão Geral ao clicar em qualquer Logo da plataforma
  document.querySelectorAll('.btn-navigate-home, img[src*="logo.png"]').forEach(el => {
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

  // Início padrão na página pública
  switchView('public');
});
