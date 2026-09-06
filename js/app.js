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
      title: 'Lista de Convidados',
      actionText: null,
      actionHandler: null,
      subItems: [
        { id: 'all', label: 'Todos' },
        { id: 'messages', label: 'Recados recebidos' },
        { id: 'tables', label: 'Mapear mesas' },
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
        { id: 'contracted', label: 'Meus contratos' },
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
            badgeMarkup = `<span class="px-2 py-0.5 rounded-full text-[10px] font-bold text-white shadow-sm ml-auto" style="background-color: #27394f;">${unreadCount}</span>`;
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
              document.querySelectorAll('.dashboard-tab-content').forEach(c => c.classList.remove('active'));
              if (item.id === 'messages') {
                const target = document.getElementById('tab-rsvp-messages') || document.getElementById('tab-messages');
                if (target) target.classList.add('active');
                renderRecadosMural();
              } else if (item.id === 'tables') {
                const target = document.getElementById('tab-rsvp-tables');
                if (target) target.classList.add('active');
                renderTablesOrganization();
              } else if (item.id === 'whatsapp') {
                const target = document.getElementById('tab-rsvp');
                if (target) target.classList.add('active');
                renderGuestsTable('all');
                showToast('Selecione os convidados na lista para enviar convite via WhatsApp.', '💬');
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
          });

          elements.drawerSubItemsList.appendChild(btn);
        });
      }
    }

    // 4. Atualiza os conteúdos de página
    document.querySelectorAll('.dashboard-tab-content').forEach(content => {
      content.classList.toggle('active', content.id === `tab-${tabKey}`);
    });

    document.body.classList.remove('editor-split-mode', 'rsvp-mode', 'b2b-mode', 'b2b-chat-mode', 'gifts-mode');

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
      switchWalletSubSection('wallet-digital', 'Carteira Digital');
    } else if (tabKey === 'b2b') {
      document.body.classList.add('b2b-mode');
      switchB2BView('explore');
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
      item.className = `p-2.5 rounded-[10px] text-xs font-bold cursor-pointer transition-all flex items-center justify-between gap-2 ${
        isActive 
          ? 'bg-slate-100/90 text-[#27394f] border border-[#27394f]/25' 
          : 'hover:bg-slate-50 text-slate-700 border border-transparent'
      }`;
      item.innerHTML = `
        <span class="block truncate font-bold" style="${isActive ? 'color: #27394f !important;' : ''}">${evt.title}</span>
        ${isActive ? '<span class="text-[#27394f] text-xs font-bold flex-shrink-0" style="color: #27394f !important;">✓</span>' : ''}
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
    if (hubDateText) hubDateText.textContent = activeEvent.date || '18 de Outubro de 2026';
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
    const kpiRsvpRate = document.getElementById('kpi-rsvp-rate-badge');
    if (kpiRsvpRate) {
      const total = activeEvent.convidadosTotal || 210;
      const confirmed = activeEvent.convidadosConfirmados !== undefined ? activeEvent.convidadosConfirmados : 185;
      const pct = Math.round((confirmed / total) * 100);
      kpiRsvpRate.textContent = `${pct}% RSVP`;
    }
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

    if (giftsTitle) giftsTitle.textContent = `Lista de Presentes: ${activeEvent.title}`;
    if (rsvpTitle) rsvpTitle.textContent = 'Lista de convidados';
    if (walletTitle) walletTitle.textContent = 'Financeiro';
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
      icon: '<svg class="w-4 h-4 text-zinc-700" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M13.5 21v-7.5a.75.75 0 0 1 .75-.75h3a.75.75 0 0 1 .75.75V21m-4.5 0H2.36m11.14 0H18m0 0h3.64m-1.39 0V9.349M3.75 21V9.349m0 0a3.001 3.001 0 0 0 3.75-.615A2.993 2.993 0 0 0 9.75 9.75c.896 0 1.7-.393 2.25-1.016a2.993 2.993 0 0 0 2.25 1.016c.896 0 1.7-.393 2.25-1.015a3.001 3.001 0 0 0 3.75.614m-16.5 0a3.004 3.004 0 0 1-.621-4.72l1.189-1.19A1.5 1.5 0 0 1 5.378 3h13.243a1.5 1.5 0 0 1 1.06.44l1.19 1.189a3 3 0 0 1-.621 4.72m-13.5 0c.168.082.344.148.528.196m12.444 0c.184-.048.36-.114.528-.196"/></svg>'
    },
    {
      id: 'budget',
      title: 'Definir orçamento do evento',
      desc: 'Organize metas e saldo da carteira',
      tab: 'wallet',
      icon: '<svg class="w-4 h-4 text-zinc-700" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M12 8v8m-3-5h6a1.5 1.5 0 0 0 0-3H9a1.5 1.5 0 0 0 0 3h6a1.5 1.5 0 0 1 0 3H9"/></svg>'
    },
    {
      id: 'savethedate',
      title: 'Escolher Save the Date',
      desc: 'Garanta a data na agenda dos convidados',
      tab: 'edit-site',
      icon: '<svg class="w-4 h-4 text-zinc-700" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24"><rect width="18" height="12" x="3" y="6" rx="2"/><circle cx="8" cy="12" r="1.5"/><circle cx="16" cy="12" r="1.5"/></svg>'
    },
    {
      id: 'registry',
      title: 'Criar lista de presentes virtual',
      desc: 'Cadastre presentes em dinheiro ou cotas',
      tab: 'gifts',
      icon: '<svg class="w-4 h-4 text-zinc-700" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 8v13m0-13V6a2 2 0 1 1 2 2h-2zm0 0V5.5A2.5 2.5 0 1 0 9.5 8H12zm-7 4h14M5 12a2 2 0 1 1 0-4h14a2 2 0 1 1 0 4M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7"/></svg>'
    },
    {
      id: 'website',
      title: 'Personalizar site do evento',
      desc: 'Adicione fotos, história e contagem',
      tab: 'edit-site',
      icon: '<svg class="w-4 h-4 text-zinc-700" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24"><rect width="20" height="14" x="2" y="3" rx="2"/><line x1="8" x2="16" y1="21" y2="21"/><line x1="12" x2="12" y1="17" y2="21"/></svg>'
    },
    {
      id: 'guests',
      title: 'Cadastrar primeiros convidados',
      desc: 'Adicione os primeiros contatos para o RSVP',
      tab: 'rsvp',
      icon: '<svg class="w-4 h-4 text-zinc-700" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z"/></svg>'
    }
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

    // Regra de revelação progressiva de tarefas:
    // Começa exibindo as tarefas concluídas + as próximas tarefas pendentes.
    // Conforme novas tarefas vão sendo alcançadas pela plataforma, novas tarefas vão aparecendo até todas estarem visíveis!
    const visibleCount = Math.min(total, Math.max(3, completedCount + 2));
    const visibleTasks = quickStartTasksData.slice(0, visibleCount);

    listEl.innerHTML = visibleTasks.map((task) => {
      const isDone = isQuickStartTaskAchieved(task.id, activeEvent);
      return `
        <div class="group p-2.5 rounded-xl hover:bg-zinc-50 transition-all flex items-center justify-between ${isDone ? 'opacity-85' : 'cursor-pointer'}" ${isDone ? '' : (task.id === 'budget' ? `onclick="navigateToBudget()"` : `onclick="switchRailTab('${task.tab}')"`)} title="${isDone ? 'Tarefa alcançada pela plataforma' : 'Ir para ' + task.title}">
          <div class="flex items-center gap-3 min-w-0">
            <!-- Ícone da Categoria (SEM círculo de check) -->
            <div class="w-7 h-7 rounded-xl ${isDone ? 'bg-emerald-50 text-emerald-600' : 'bg-zinc-100 text-zinc-700 group-hover:bg-zinc-200/70'} flex items-center justify-center flex-shrink-0 transition-colors">
              ${isDone ? '<svg class="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="m4.5 12.75 6 6 9-13.5"/></svg>' : task.icon}
            </div>

            <!-- Título e Descrição (Riscado automaticamente quando alcançado) -->
            <div class="min-w-0">
              <span class="text-xs sm:text-sm ${isDone ? 'line-through text-zinc-400 font-normal' : 'text-zinc-800 group-hover:text-zinc-950 font-medium'} truncate block transition-all font-sans">
                ${task.title}
              </span>
              <span class="text-[10px] ${isDone ? 'text-zinc-400/80 line-through' : 'text-zinc-500'} block truncate font-sans">
                ${task.desc}
              </span>
            </div>
          </div>

          <!-- Indicador à Direita: Concluído ou Seta -->
          <div class="flex-shrink-0 pl-2">
            ${isDone 
              ? '<span class="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200/60 font-sans">Concluído</span>' 
              : '<span class="text-zinc-400 group-hover:text-zinc-600 text-xs font-bold pl-1 font-sans">›</span>'
            }
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
  }

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
        drawerItem.closest('#drawer-sub-items-list').querySelectorAll('.sub-drawer-item').forEach(b => b.classList.remove('active'));
        drawerItem.classList.add('active');
        if (state.currentTab === 'edit-site' || !state.currentTab) {
          switchEditorSubSection(subId, subLabel);
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
      row.className = 'music-track-row flex flex-col sm:flex-row items-start gap-2 sm:gap-3 p-3 bg-zinc-50/70 border border-[#EAEAEF] rounded relative';

      const colUrl = document.createElement('div');
      colUrl.className = 'flex-1 w-full flex flex-col justify-start';
      colUrl.innerHTML = `
        <label class="block text-[10px] sm:text-[11px] font-bold uppercase text-zinc-500 tracking-wider font-sans mb-1 leading-4">URL DO VÍDEO</label>
        <input type="text" class="music-track-url w-full px-3 py-2 text-xs border border-[#EAEAEF] rounded bg-white focus:outline-none focus:border-[#537bae] text-zinc-800 placeholder:text-zinc-400 font-sans" placeholder="Ex: https://www.youtube.com/watch?v=XXXXXX" data-track-index="${idx}">
        <span class="text-[10px] text-zinc-400 block font-sans mt-1 leading-4">Ex: https://www.youtube.com/watch?v=XXXXXX</span>
      `;
      const inputUrl = colUrl.querySelector('input');
      inputUrl.value = track.url || '';

      const colPlacement = document.createElement('div');
      colPlacement.className = 'w-full sm:w-56 flex flex-col justify-start';
      colPlacement.innerHTML = `
        <label class="block text-[10px] sm:text-[11px] font-bold uppercase text-zinc-500 tracking-wider font-sans mb-1 leading-4">ONDE TOCAR *</label>
        <div class="relative">
          <select class="music-track-placement w-full px-3 py-2 text-xs border border-[#EAEAEF] rounded bg-white focus:outline-none focus:border-[#537bae] text-zinc-800 cursor-pointer appearance-none pr-7 font-sans" data-track-index="${idx}">
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
    if (fontClass === 'font-cinzel') fontClass = 'font-playfair';
    
    sel.value = fontClass;
    if (!sel.value) sel.value = 'font-playfair';
    
    const fontMap = {
      'font-playfair': "'Playfair Display', Georgia, serif",
      'font-garamond': "'EB Garamond', Garamond, serif",
      'font-outfit': "'Outfit', sans-serif",
      'font-inter': "'Inter', sans-serif",
      'font-arial': "Arial, Helvetica, sans-serif",
      'font-cursive': "'Great Vibes', cursive"
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
      'font-clean': "'Outfit', sans-serif"
    };
    const actualDescFamily = descFontMap[descFont] || "'Inter', sans-serif";

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

    // 3. EXATAMENTE 4 SLOTS DE TÍTULO E TEXTO (MÁXIMO 4 CAIXINHAS UNIFORMES E REORDENÁVEIS)
    if (!builderState.slots || !Array.isArray(builderState.slots)) {
      builderState.slots = [null, null, null, null];
    }
    while (builderState.slots.length < 4) builderState.slots.push(null);
    if (builderState.slots.length > 4) builderState.slots = builderState.slots.slice(0, 4);

    let draggedSlotIndex = null;

    for (let i = 0; i < 4; i++) {
      const slotContainer = document.getElementById(`invite-slot-${i}`);
      if (!slotContainer) continue;

      slotContainer.setAttribute('draggable', 'true');
      slotContainer.setAttribute('data-slot', i);

      const slotData = builderState.slots[i];
      const isEditingText = slotContainer.querySelector('.editable-live-box') && slotContainer.querySelector('.editable-live-box') === document.activeElement;

      const reorderControls = `
        <div class="slot-reorder-controls">
          ${i > 0 ? `<button type="button" class="btn-slot-move btn-slot-up" data-slot="${i}" title="Subir posição"><svg class="w-2.5 h-2.5 pointer-events-none" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="m4.5 15.75 7.5-7.5 7.5 7.5"/></svg></button>` : ''}
          ${i < 3 ? `<button type="button" class="btn-slot-move btn-slot-down" data-slot="${i}" title="Descer posição"><svg class="w-2.5 h-2.5 pointer-events-none" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5"/></svg></button>` : ''}
        </div>
      `;


      if (!slotData) {
        // SLOT VAZIO: Exibe a caixinha pontilhada uniforme com o botão circular (+) no centro
        slotContainer.innerHTML = `
          ${reorderControls}
          <div class="invite-slot-box-empty">
            <div class="relative">
              <button type="button" class="btn-slot-add w-7 h-7 rounded-full bg-[#537bae] hover:bg-[#416799] text-white shadow-xs flex items-center justify-center transition-all hover:scale-110 active:scale-95 cursor-pointer" data-slot="${i}" title="Adicionar Título ou Texto">
                <svg class="w-4 h-4 pointer-events-none" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15"/></svg>
              </button>
              <div id="dropdown-slot-${i}" class="hidden absolute left-1/2 -translate-x-1/2 top-full mt-2 w-36 bg-white border border-[#EAEAEF] rounded-lg shadow-xl p-1 z-30 space-y-0.5 animate-fade-in">
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
        // SLOT PREENCHIDO COM TÍTULO OU TEXTO (LIMPO E SEM ÍCONES INTERNOS)
        if (!isEditingText) {
          slotContainer.innerHTML = '';
          slotContainer.insertAdjacentHTML('beforeend', reorderControls);

          const wrapper = document.createElement('div');
          wrapper.className = 'live-block-wrapper relative group/block text-center';

          const box = document.createElement('div');
          box.contentEditable = "true";
          box.spellcheck = false;
          box.dataset.slotIndex = i;

          if (slotData.type === 'title') {
            box.className = `editable-live-box live-block-title leading-tight ${builderState.font || 'font-playfair'}`;
            box.setAttribute('data-placeholder', 'Digite o título...');
            box.textContent = slotData.content || '';
            box.style.setProperty('font-family', fontMap[builderState.font || 'font-playfair'] || "'Playfair Display', Georgia, serif", 'important');
            box.style.setProperty('color', builderState.titleColor || (isDark ? '#FFFFFF' : '#18181B'), 'important');
            box.style.setProperty('font-size', `${titleSize}px`, 'important');
            box.style.setProperty('font-weight', builderState.titleBold ? 'bold' : 'normal', 'important');
            box.style.setProperty('font-style', builderState.titleItalic ? 'italic' : 'normal', 'important');
            box.style.setProperty('text-decoration', builderState.titleUnderline ? 'underline' : 'none', 'important');
            box.style.setProperty('text-align', builderState.titleAlign || 'center', 'important');
          } else {
            // Estilização tipográfica inteligente e elegante para textos
            const isQuote = slotData.content && (slotData.content.includes('"') || slotData.content.includes('('));
            const isUppercaseCall = slotData.content && (slotData.content.includes('BÊNÇÃO') || slotData.content.includes('CONVIDAM') || slotData.content.toUpperCase() === slotData.content);

            let trackingClass = '';
            if (isUppercaseCall) trackingClass = 'uppercase tracking-[0.22em] font-bold text-[10px] sm:text-[11px]';
            else if (isQuote) trackingClass = 'font-serif text-xs sm:text-sm';
            else trackingClass = 'text-xs sm:text-sm';

            box.className = `editable-live-box live-block-text leading-relaxed ${trackingClass} ${descFont}`;
            if (builderState.descItalic) box.classList.add('italic');
            box.setAttribute('data-placeholder', 'Digite o texto...');
            box.textContent = slotData.content || '';
            box.style.setProperty('font-family', actualDescFamily, 'important');
            box.style.setProperty('color', descColor, 'important');
            box.style.setProperty('font-size', isQuote ? `${Math.round(descSize * 0.9)}px` : (isUppercaseCall ? `${Math.round(descSize * 0.78)}px` : `${descSize}px`), 'important');
            box.style.setProperty('font-weight', builderState.descBold ? 'bold' : (isUppercaseCall ? 'bold' : 'normal'), 'important');
            box.style.setProperty('font-style', builderState.descItalic ? 'italic' : 'normal', 'important');
            box.style.setProperty('text-decoration', builderState.descUnderline ? 'underline' : 'none', 'important');
            box.style.setProperty('text-align', builderState.descAlign || 'center', 'important');
          }

          if (!slotData.content || !slotData.content.trim()) {
            box.dataset.empty = "true";
          }

          box.addEventListener('focus', () => { slotContainer.draggable = false; });
          box.addEventListener('blur', () => { slotContainer.draggable = true; });

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
          btnDel.innerHTML = `<svg class="w-3 h-3 pointer-events-none" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>`;
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
          const moved = builderState.slots.splice(draggedSlotIndex, 1)[0];
          builderState.slots.splice(i, 0, moved);
          draggedSlotIndex = null;
          updateLiveSitePreview();
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

    // 7. Local & Endereço
    const venueNameVal = (inputDataLocation && inputDataLocation.value !== undefined && inputDataLocation.value.length > 0) ? inputDataLocation.value : (activeEvent.eventDetails?.locationName || activeEvent.location || 'VILLA BISUTTI - ESPAÇO JARDIM');
    const venueAddrVal = (inputDataAddress && inputDataAddress.value !== undefined && inputDataAddress.value.length > 0) ? inputDataAddress.value : (activeEvent.eventDetails?.address || 'Av. Cidade Jardim, 1200 - São Paulo, SP');

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
      countdownLabel.style.setProperty('color', descColor, 'important');
      countdownLabel.style.setProperty('font-family', actualDescFamily, 'important');
      countdownLabel.style.setProperty('font-size', `${Math.round(descSize * 0.85)}px`, 'important');
      countdownLabel.style.setProperty('font-style', builderState.descItalic ? 'italic' : 'normal', 'important');
    }

    const actionsLabel = document.getElementById('live-preview-actions-label');
    if (actionsLabel) {
      actionsLabel.style.setProperty('color', descColor, 'important');
      actionsLabel.style.setProperty('font-family', actualDescFamily, 'important');
      actionsLabel.style.setProperty('font-size', `${Math.round(descSize * 0.68)}px`, 'important');
      actionsLabel.style.setProperty('font-style', builderState.descItalic ? 'italic' : 'normal', 'important');
    }

    // 8. Fechamento
    if (previewClosingNames) {
      previewClosingNames.textContent = titleVal || 'Anfitriões';
      previewClosingNames.className = `text-xl italic ${builderState.font || 'font-serif-title'}`;
      previewClosingNames.style.setProperty('color', builderState.titleColor || (isDark ? '#FFFFFF' : '#18181B'), 'important');
    }

    // 9. Botões do Convite (Cor do Botão, Cor do Texto & Arredondamento da Borda)
    const btnRadius = builderState.btnRadius !== undefined ? builderState.btnRadius : 28;
    const radiusCss = btnRadius >= 28 ? '9999px' : `${btnRadius}px`;
    const btnColor = builderState.accentColor || '#FBFBFA';
    const btnTextColor = builderState.btnTextColor || '#18181B';

    const inviteButtons = document.querySelectorAll('#live-preview-buttons-container button, .live-preview-custom-btn');
    inviteButtons.forEach(btn => {
      btn.style.setProperty('border-radius', radiusCss, 'important');
      btn.style.setProperty('background-color', btnColor, 'important');
      btn.style.setProperty('color', btnTextColor, 'important');
      btn.querySelectorAll('*').forEach(child => {
        child.style.setProperty('color', btnTextColor, 'important');
      });
    });

    // 10. Widget Flutuante de Música
    updateFloatingMusicWidget();
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
  // CONTROLE DOS 4 SLOTS COM BOTÃO (+) E DROPDOWN DE OPÇÕES (MÁXIMO 4 CAIXINHAS)
  // ==========================================
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

      if (!builderState.slots) {
        builderState.slots = [null, null, null, null];
      }

      const defaultContent = type === 'title'
        ? (slotIdx === 2 ? 'Beatriz & Lucas' : (slotIdx === 0 ? 'Casamento' : 'Título'))
        : (slotIdx === 0 ? '"Um cordão de três dobras não se rompe com facilidade." (Eclesiastes 4:12)' : (slotIdx === 1 ? 'COM A BÊNÇÃO DE DEUS,' : 'CONVIDAM VOCÊ PARA O SEU CASAMENTO'));

      builderState.slots[slotIdx] = {
        type: type,
        content: defaultContent
      };

      updateLiveSitePreview();

      // Foca automaticamente no campo adicionado para digitação imediata
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
      return;
    }

    // 3. Clique em Subir (↑)
    const upBtn = e.target.closest('.btn-slot-up');
    if (upBtn) {
      e.stopPropagation();
      const idx = parseInt(upBtn.getAttribute('data-slot'), 10);
      if (idx > 0) {
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
      if (idx < 3) {
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
      const inputLocVal = document.getElementById('editor-data-location')?.value || activeEvent.eventDetails?.locationName || activeEvent.location || 'VILLA BISUTTI - ESPAÇO JARDIM';
      const inputAddrVal = document.getElementById('editor-data-address')?.value || activeEvent.eventDetails?.address || 'Av. Cidade Jardim, 1200 - São Paulo, SP';
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

  function openGiftDrawer() {
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

    // 2. Renderiza apenas os itens de presentes reais (cards de adicionar aleatório e adicionar presente removidos)
    filteredGifts.forEach(gift => {
      const card = document.createElement('div');
      card.className = 'group bg-white pt-3 px-4 pb-6 sm:pt-4 sm:px-5 sm:pb-7 border-r border-b border-zinc-200/80 flex flex-col justify-between items-center text-center relative transition-all hover:bg-zinc-50/40 cursor-pointer min-h-[350px] sm:min-h-[380px] lg:min-h-[410px]';

      card.innerHTML = `
        <!-- Topo do Card: Coração de Favorito à direita -->
        <div class="w-full flex items-center justify-end text-zinc-400 mb-1">
          <button type="button" class="btn-fav-gift text-zinc-300 hover:text-rose-500 transition-colors p-1 cursor-pointer" title="Favoritar">
            <svg class="w-4 h-4 fill-none stroke-currentColor" stroke-width="1.75" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z"/>
            </svg>
          </button>
        </div>

        <!-- Imagem do Produto direta na célula com Botão X no Canto Superior Direito -->
        <div class="relative w-full flex-1 flex items-center justify-center p-2 my-auto">
          <img src="${gift.image}" alt="${gift.title}" class="w-full max-w-[190px] sm:max-w-[210px] md:max-w-[230px] aspect-square object-cover group-hover:scale-105 transition-transform duration-300">
          
          <!-- Botão X de exclusão no canto superior direito da imagem -->
          <button type="button" class="btn-delete-gift absolute top-1 right-1 w-6 h-6 rounded-full bg-white/95 hover:bg-rose-500 text-zinc-400 hover:text-white flex items-center justify-center text-[11px] font-bold transition-all opacity-0 group-hover:opacity-100 cursor-pointer shadow-sm border border-zinc-200/80 z-10" title="Excluir presente" data-gift-id="${gift.id}">
            ✕
          </button>
        </div>

        <!-- Detalhes do Produto: Título em fonte clássica/itálica e Preço em destaque -->
        <div class="w-full pt-3 space-y-1 mt-auto">
          <h4 class="text-xs sm:text-[13px] font-serif italic text-zinc-800 line-clamp-2 px-1 leading-snug" title="${gift.title}">
            ${gift.title}
          </h4>
          <p class="text-xs sm:text-sm font-bold text-zinc-900 mt-0.5">
            R$ ${parseFloat(gift.price).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
        </div>
      `;

      // Evento de exclusão do presente
      const btnDelete = card.querySelector('.btn-delete-gift');
      if (btnDelete) {
        btnDelete.addEventListener('click', (e) => {
          e.stopPropagation();
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
            document.querySelectorAll('.btn-gift-img-preset').forEach(b => {
              b.classList.remove('active', 'border-[#537bae]');
              b.classList.add('border-transparent');
            });
          };
          reader.readAsDataURL(file);
        }
      });
    }

    // Seleção de presets de imagem da galeria
    document.querySelectorAll('.btn-gift-img-preset').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        document.querySelectorAll('.btn-gift-img-preset').forEach(b => {
          b.classList.remove('active', 'border-[#537bae]');
          b.classList.add('border-transparent');
        });
        btn.classList.add('active', 'border-[#537bae]');
        btn.classList.remove('border-transparent');
        const imgSrc = btn.getAttribute('data-img-src');
        if (imgSrc) {
          selectedGiftImage = imgSrc;
          if (giftPreviewImg) giftPreviewImg.src = imgSrc;
          if (giftUrlInput) giftUrlInput.value = imgSrc;
        }
      });
    });

    formAddGift.addEventListener('submit', (e) => {
      e.preventDefault();
      const activeEvent = getActiveEvent();
      if (!activeEvent.giftList) activeEvent.giftList = [];

      const title = document.getElementById('gift-title-input')?.value?.trim() || 'Presente Especial';
      const price = parseFloat(document.getElementById('gift-price-input')?.value) || 250;
      const description = document.getElementById('gift-description-input')?.value?.trim() || '';
      const image = giftUrlInput?.value || giftPreviewImg?.src || selectedGiftImage;

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
      if (headerSub) headerSub.textContent = 'Todos os presentes cadastrados são fictícios.';
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

    // 3. Atualiza Abas Universais (love-tab-item) com Underline Reta via ::after (position: absolute; bottom: -6px;)
    document.querySelectorAll('.rsvp-tab-link').forEach(tab => {
      const tabFilter = tab.getAttribute('data-filter');
      tab.style.borderBottom = '';
      tab.style.borderColor = '';
      tab.style.color = '';
      tab.style.borderRadius = '';
      tab.style.webkitBorderRadius = '';
      if (tabFilter === activeFilter) {
        tab.className = 'love-tab-item rsvp-tab-link active cursor-pointer whitespace-nowrap font-bold';
      } else {
        tab.className = 'love-tab-item rsvp-tab-link cursor-pointer whitespace-nowrap font-medium';
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
      // Status RSVP limpo: sem fundo colorido e sem ícones de check/pendente
      const statusBadges = {
        confirmed: '<span class="text-xs sm:text-sm font-medium text-emerald-700 whitespace-nowrap">Confirmado</span>',
        pending: '<span class="text-xs sm:text-sm font-medium text-amber-700 whitespace-nowrap">Pendente</span>',
        declined: '<span class="text-xs sm:text-sm font-medium text-rose-600 whitespace-nowrap">Recusado</span>'
      };

      const giftsCount = guest.giftsBought ? guest.giftsBought.length : 0;
      // Ícone de presente normal (SVG) sem fundo verde e sem emoji
      const giftsBadge = giftsCount > 0 
        ? `<span class="inline-flex items-center gap-1 text-xs font-medium text-zinc-600 ml-2 flex-shrink-0" title="${giftsCount} presente(s) comprado(s)">
            <svg class="w-3.5 h-3.5 text-zinc-500" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 7.5h1.5m-1.5 0h-1.5m1.5 0v11.25m0-11.25a2.25 2.25 0 1 0-2.25-2.25m2.25 2.25a2.25 2.25 0 1 1 2.25-2.25M3.75 12h16.5m-16.5 0a2.25 2.25 0 0 0-2.25 2.25v5.25a2.25 2.25 0 0 0 2.25 2.25h16.5a2.25 2.25 0 0 0 2.25-2.25v-5.25a2.25 2.25 0 0 0-2.25-2.25m-16.5 0V7.5a2.25 2.25 0 0 1 2.25-2.25h12a2.25 2.25 0 0 1 2.25 2.25V12"/></svg>
            <span>${giftsCount}</span>
          </span>`
        : '';

      const row = document.createElement('tr');
      row.className = 'border-b border-zinc-100 hover:bg-zinc-50/70 transition-colors text-xs sm:text-sm cursor-pointer group';
      row.innerHTML = `
        <td class="py-3 px-2 sm:px-4">
          <div class="flex items-center gap-2.5 min-w-0">
            <div class="w-8 h-8 rounded-full bg-zinc-100 text-zinc-700 text-xs font-semibold flex items-center justify-center flex-shrink-0">
              ${guest.name ? guest.name.substring(0, 1).toUpperCase() : 'C'}
            </div>
            <div class="min-w-0 flex-1 truncate">
              <span class="font-medium text-zinc-900 group-hover:text-[#537bae] transition-colors block truncate">${guest.name}</span>
              ${guest.table ? `<span class="text-[11px] text-zinc-400 block truncate">Mesa: ${guest.table}</span>` : ''}
            </div>
            ${giftsBadge}
          </div>
        </td>
        <td class="py-3 px-2 sm:px-4">
          <div class="flex items-center">
            ${statusBadges[guest.status] || guest.status}
          </div>
        </td>
        <td class="py-3 px-2 sm:px-4 text-right">
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

    // Gaveta Adicionar Mesa
    const btnOpenAdd = document.getElementById('btn-open-add-table-modal');
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

    if (btnOpenAdd) btnOpenAdd.addEventListener('click', openAddDrawer);
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
    const headerActions = document.getElementById('wallet-header-actions');

    if (headerActions) {
      headerActions.classList.add('hidden');
    }

    if (title) {
      if (subId === 'wallet-digital') {
        title.textContent = 'Carteira Digital';
        if (desc) desc.textContent = 'Acompanhe seu saldo disponível, arrecadações em dinheiro e solicite resgates instantâneos via PIX.';
      } else if (subId === 'wallet-budget') {
        title.textContent = 'Orçamento';
        if (desc) desc.textContent = 'Planeje metas, controle custos comprometidos e gerencie despesas de fornecedores do evento.';
        checkAndPromptBudgetSetup();
        renderBudgetExpensesTable();
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
          p.classList.remove('border-[#537bae]', 'text-zinc-900', 'font-semibold', 'active');
          p.classList.add('border-transparent', 'text-zinc-500', 'font-medium');
        });
        pill.classList.remove('border-transparent', 'text-zinc-500', 'font-medium');
        pill.classList.add('border-[#537bae]', 'text-zinc-900', 'font-semibold', 'active');

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
            <h3 class="text-base sm:text-lg font-bold text-zinc-900 mt-2 leading-snug truncate group-hover:text-[#537bae] transition-colors">${item.name}</h3>
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
              <button type="button" class="btn-supplier-contact px-4 py-2 rounded-xl bg-[#537bae] hover:bg-[#416799] text-white text-xs font-bold transition-all shadow-xs cursor-pointer">
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
  let activeB2BConversationId = 'mariana-assessoria';

  const DEFAULT_B2B_CONVERSATIONS = [
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

  let b2bConversationsData = [];
  try {
    const savedConvs = localStorage.getItem('love_b2b_chat_conversations');
    if (savedConvs) {
      b2bConversationsData = JSON.parse(savedConvs);
    }
  } catch (err) {
    console.error('Erro ao ler conversas salvas', err);
  }
  if (!b2bConversationsData || !b2bConversationsData.length) {
    b2bConversationsData = JSON.parse(JSON.stringify(DEFAULT_B2B_CONVERSATIONS));
  }

  function saveB2BConversations() {
    try {
      localStorage.setItem('love_b2b_chat_conversations', JSON.stringify(b2bConversationsData));
      window.dispatchEvent(new CustomEvent('love:chat-updated', { detail: { conversations: b2bConversationsData } }));
    } catch (err) {
      console.error('Erro ao persistir conversas do chat', err);
    }
  }

  // Hub global de chat Love - Conecta esta tela com a futura tela dos assessores
  window.LoveChatService = {
    getConversations: () => b2bConversationsData,
    getConversation: (id) => b2bConversationsData.find(c => c.id === id),
    getActiveConversationId: () => activeB2BConversationId,
    setActiveConversationId: (id) => {
      activeB2BConversationId = id;
      const c = b2bConversationsData.find(conv => conv.id === id);
      if (c) c.unread = 0;
      saveB2BConversations();
      renderB2BChat();
    },
    sendMessage: (convId, text, sender = 'me', attachment = null) => {
      const conv = b2bConversationsData.find(c => c.id === convId) || b2bConversationsData[0];
      if (!conv) return null;

      const now = new Date();
      const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      const msgObj = {
        sender: sender, // 'me' (noivos) ou 'them' (assessor)
        text: text || '',
        time: timeStr,
        attachment: attachment || null
      };

      conv.messages.push(msgObj);
      conv.lastMessage = text || (attachment ? (attachment.type === 'image' ? '📷 Foto enviada' : `📎 ${attachment.name}`) : '');
      conv.time = timeStr;

      // Reordena conversa para o topo da lista
      const idx = b2bConversationsData.indexOf(conv);
      if (idx > 0) {
        b2bConversationsData.splice(idx, 1);
        b2bConversationsData.unshift(conv);
      }

      saveB2BConversations();
      renderB2BChat();
      return msgObj;
    }
  };

  // Sincronização em tempo real entre diferentes abas ou portais (Noivos <-> Assessor)
  window.addEventListener('storage', (e) => {
    if (e.key === 'love_b2b_chat_conversations' && e.newValue) {
      try {
        b2bConversationsData = JSON.parse(e.newValue);
        renderB2BChat();
      } catch (err) {
        console.error('Erro ao sincronizar chat entre abas', err);
      }
    }
  });

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
        'contracted': 'Meus contratos',
        'insurance': 'Serviços',
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
              p.classList.remove('border-[#537bae]', 'text-zinc-900', 'font-semibold', 'active');
              p.classList.add('border-transparent', 'text-zinc-500', 'font-medium');
            });
            favPill.classList.remove('border-transparent', 'text-zinc-500', 'font-medium');
            favPill.classList.add('border-[#537bae]', 'text-zinc-900', 'font-semibold', 'active');
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
          <span class="inline-block text-[10px] font-medium text-zinc-500 bg-white/70 px-1.5 py-0.5 rounded border border-zinc-200/60 mb-1">${conv.category}</span>
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
    if (!activeConv) return;
    activeB2BConversationId = activeConv.id;

    if (nameEl) nameEl.textContent = activeConv.name;
    if (statusEl) statusEl.textContent = `${activeConv.category} • ${activeConv.online ? 'Online agora' : 'Online recentemente'}`;
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
            <div class="chat-bubble-user-glass text-white p-3.5 rounded-2xl rounded-br-xs text-xs sm:text-sm leading-relaxed text-left" style="color: #FFFFFF !important;">
              ${msg.text ? `<p class="whitespace-pre-wrap break-words text-white" style="color: #FFFFFF !important;">${msg.text}</p>` : ''}
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
    const chatSearch = document.getElementById('b2b-chat-search-input');
    const chatAttachBtn = document.getElementById('b2b-chat-attach-btn');
    const chatFileInput = document.getElementById('b2b-chat-file-input');

    if (chatSearch && !chatSearch.dataset.bound) {
      chatSearch.dataset.bound = "true";
      chatSearch.addEventListener('input', (e) => {
        renderB2BChatContacts(e.target.value);
      });
    }

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
            window.LoveChatService.sendMessage(convId, '', 'me', {
              type: 'image',
              name: file.name,
              url: evt.target.result
            });
            showToast(`Foto "${file.name}" enviada no chat!`, '📷');
          };
          reader.readAsDataURL(file);
        } else {
          window.LoveChatService.sendMessage(convId, `Documento compartilhado: ${file.name}`, 'me', {
            type: 'file',
            name: file.name,
            size: (file.size / 1024).toFixed(1) + ' KB'
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

        // 1. Envia mensagem do casal
        window.LoveChatService.sendMessage(convId, text, 'me');
        chatInput.value = '';

        // 2. Resposta automatizada realista do assessor/fornecedor (caso não esteja com assessor conectado)
        setTimeout(() => {
          const replies = [
            'Perfeito! Recebemos sua mensagem e entraremos em contato com todos os detalhes.',
            'Excelente! Já estamos preparando o orçamento atualizado para vocês.',
            'Maravilha! Fico à total disposição para agendarmos uma apresentação.',
            'Combinado! Em instantes enviaremos a proposta formatada em PDF.',
            'Anotado! Já incluímos no cronograma de alinhamento.'
          ];
          const randomReply = replies[Math.floor(Math.random() * replies.length)];
          window.LoveChatService.sendMessage(convId, randomReply, 'them');
        }, 1200);
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

  // Inicializa módulo B2B e sistema de chat messenger
  initB2BMarketplace();

  // Início padrão na página pública
  switchView('public');
});
