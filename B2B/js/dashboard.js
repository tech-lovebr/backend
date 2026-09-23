/* ==========================================================================
   LOVE B2B — Dashboard (saudação, visão geral do site, métricas, agenda)
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
  renderGreeting();
  renderMetricsOverview();
  initWalletTabs();
  initWalletEyeToggle();
  renderAgenda();
  renderNewsList();
  initOnboardingModal();
  initAdsCarousel();
  renderAnalyticsCard();
  initAnalyticsPeriodPopover();
});

/* -------------------- Carrossel de anúncios -------------------- */

function initAdsCarousel() {
  const root = document.getElementById('dash-ads-carousel');
  const dotsWrap = document.getElementById('dash-ads-dots');
  if (!root || !dotsWrap) return;

  const slides = Array.from(root.querySelectorAll('.dash-ads-slide'));
  const dots = Array.from(dotsWrap.querySelectorAll('.dash-ads-dot'));
  let current = 0;
  let timer = null;

  function goTo(index) {
    current = (index + slides.length) % slides.length;
    slides.forEach((slide, i) => slide.classList.toggle('is-active', i === current));
    dots.forEach((dot, i) => dot.classList.toggle('is-active', i === current));
  }

  function startAutoplay() {
    clearInterval(timer);
    timer = setInterval(() => goTo(current + 1), 20000);
  }

  const prevBtn = document.getElementById('dash-ads-prev');
  const nextBtn = document.getElementById('dash-ads-next');
  if (prevBtn) prevBtn.addEventListener('click', (e) => { e.preventDefault(); goTo(current - 1); startAutoplay(); });
  if (nextBtn) nextBtn.addEventListener('click', (e) => { e.preventDefault(); goTo(current + 1); startAutoplay(); });
  dots.forEach((dot, i) => dot.addEventListener('click', () => { goTo(i); startAutoplay(); }));

  goTo(0);
  startAutoplay();
}

/* -------------------- Analytics -------------------- */

function renderAnalyticsCard() {
  setText('analytics-sessions', padTwoDigits(B2B_DATA.siteMetrics.visits30d));

  const leadsAtivos = B2B_DATA.leads.filter(l => l.status !== 'fechado').length;
  setText('analytics-leads', padTwoDigits(leadsAtivos));

  const totalLeads = B2B_DATA.leads.length;
  const closedLeads = B2B_DATA.leads.filter(l => l.status === 'fechado').length;
  setText('analytics-conversion', totalLeads ? `${Math.round((closedLeads / totalLeads) * 100)}%` : '—');

  const boostBtn = document.getElementById('dash-analytics-boost-btn');
  if (boostBtn) {
    boostBtn.addEventListener('click', () => {
      showToast('Em breve você poderá impulsionar seu perfil e aparecer no topo das buscas.');
    });
  }

  const leadsBtn = document.getElementById('dash-analytics-leads-btn');
  if (leadsBtn) {
    leadsBtn.addEventListener('click', () => {
      showToast('Em breve você poderá impulsionar seus anúncios e atrair mais leads.');
    });
  }
}

function initAnalyticsPeriodPopover() {
  const btn = document.getElementById('dash-analytics-period-btn');
  const popover = document.getElementById('dash-analytics-period-popover');
  const label = document.getElementById('dash-analytics-period-label');
  if (!btn || !popover || !label) return;

  const close = () => { popover.hidden = true; document.removeEventListener('click', onOutsideClick); };
  const onOutsideClick = (e) => { if (!popover.contains(e.target) && e.target !== btn) close(); };

  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    if (popover.hidden) {
      popover.hidden = false;
      document.addEventListener('click', onOutsideClick);
    } else {
      close();
    }
  });

  popover.querySelectorAll('[data-period]').forEach(option => {
    option.addEventListener('click', () => {
      popover.querySelectorAll('[data-period]').forEach(o => o.classList.toggle('is-active', o === option));
      setText('dash-analytics-period-label', option.dataset.periodLabel);
      close();
    });
  });
}

function initOnboardingModal() {
  if (localStorage.getItem('b2b-onboarding-pending') !== '1') return;
  localStorage.removeItem('b2b-onboarding-pending');

  const modal = document.getElementById('onboarding-modal');
  const closeBtn = document.getElementById('onboarding-close-btn');
  if (!modal || !closeBtn) return;

  modal.classList.add('show');
  closeBtn.addEventListener('click', () => modal.classList.remove('show'));
  modal.addEventListener('click', (e) => { if (e.target === modal) modal.classList.remove('show'); });
}

function renderGreeting() {
  const now = new Date();
  const dateStr = new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' }).format(now);
  setText('greeting-date', capitalize(dateStr));

  const titleEl = document.getElementById('greeting-title');
  if (titleEl) {
    const verifiedBadge = B2B_DATA.professional.selfieVerified
      ? ` <span class="verified-badge" title="Conta verificada"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 0 1-1.043 3.296 3.745 3.745 0 0 1-3.296 1.043A3.745 3.745 0 0 1 12 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 0 1-3.296-1.043 3.745 3.745 0 0 1-1.043-3.296A3.745 3.745 0 0 1 3 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 0 1 1.043-3.296 3.745 3.745 0 0 1 3.296-1.043A3.746 3.746 0 0 1 12 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 0 1 3.296 1.043 3.746 3.746 0 0 1 1.043 3.296A3.745 3.745 0 0 1 21 12Z" /></svg></span>`
      : '';
    titleEl.innerHTML = `Olá, ${escapeHtml(B2B_DATA.professional.company)}${verifiedBadge}`;
  }
}

/* -------------------- Métricas rápidas -------------------- */

/* -------------------- Carteira (Saldo / Faturamento / Investimentos) -------------------- */

let walletBalanceVisible = true;
let walletFinData = {};

function renderMetricsOverview() {
  const fin = B2B_DATA.financeiro || {};
  walletFinData = fin;
  const saldoEl = document.getElementById('wallet-saldo-value');
  const faturamentoEl = document.getElementById('wallet-faturamento-value');
  const investimentosEl = document.getElementById('wallet-investimentos-value');

  if (saldoEl) saldoEl.dataset.value = fin.saqueDisponivel || 0;
  if (faturamentoEl) faturamentoEl.dataset.value = fin.faturamentoEsteMes || 0;
  if (investimentosEl) investimentosEl.dataset.value = 0;

  renderWalletAmounts();
}

function renderWalletAmounts() {
  ['wallet-saldo-value', 'wallet-faturamento-value', 'wallet-investimentos-value'].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    el.innerHTML = walletBalanceVisible
      ? formatCurrencySuperscript(Number(el.dataset.value || 0))
      : 'R$ ****';
  });

  document.querySelectorAll('.wallet-eye-btn').forEach(btn => {
    btn.classList.toggle('is-hidden', !walletBalanceVisible);
  });

  setText('wallet-saldo-pendente', walletBalanceVisible ? formatCurrency(walletFinData.valorEmAberto || 0) : '****');
  setText('wallet-faturamento-anterior', walletBalanceVisible ? formatCurrency(walletFinData.faturamentoMesPassado || 0) : '****');

  const deltaEl = document.getElementById('wallet-faturamento-delta');
  if (deltaEl) {
    if (!walletBalanceVisible) {
      deltaEl.textContent = '';
      deltaEl.className = '';
    } else {
      const anterior = walletFinData.faturamentoMesPassado || 0;
      const atual = walletFinData.faturamentoEsteMes || 0;
      if (anterior > 0) {
        const pct = ((atual - anterior) / anterior) * 100;
        const up = pct >= 0;
        deltaEl.textContent = `(${up ? '+' : ''}${pct.toFixed(1)}%)`;
        deltaEl.className = `metric-delta ${up ? 'up' : 'down'}`;
      } else {
        deltaEl.textContent = '';
        deltaEl.className = '';
      }
    }
  }
}

function initWalletTabs() {
  const wrap = document.getElementById('wallet-tabs');
  if (!wrap) return;
  wrap.querySelectorAll('[data-wallet-tab]').forEach(btn => {
    btn.addEventListener('click', () => {
      wrap.querySelectorAll('[data-wallet-tab]').forEach(b => b.classList.toggle('active', b === btn));
      document.querySelectorAll('[data-wallet-panel]').forEach(panel => {
        panel.hidden = panel.dataset.walletPanel !== btn.dataset.walletTab;
      });
    });
  });
}

function initWalletEyeToggle() {
  document.querySelectorAll('.wallet-eye-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      walletBalanceVisible = !walletBalanceVisible;
      renderWalletAmounts();
    });
  });
}

/* -------------------- Agenda: faixa de dias + lista -------------------- */

const WEEKDAY_LABELS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

function renderAgenda() {
  const stripEl = document.getElementById('day-strip');
  const listEl = document.getElementById('agenda-list');
  if (!stripEl) return;

  const today = new Date();
  const eventDays = new Set(B2B_DATA.proximosEventos.map(e => e.day));

  let strip = '';
  for (let i = 0; i < 7; i++) {
    const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() + i);
    const isToday = i === 0;
    const hasEvent = d.getMonth() === today.getMonth() && eventDays.has(d.getDate());
    const classes = ['day-strip-cell'];
    if (isToday) classes.push('today');
    strip += `
      <div class="${classes.join(' ')}">
        <span class="dow">${WEEKDAY_LABELS[d.getDay()]}</span>
        <span class="dom">${d.getDate()}</span>
        ${hasEvent ? '<span class="day-strip-dot"></span>' : ''}
      </div>
    `;
  }
  stripEl.innerHTML = strip;

  if (listEl) {
    const sorted = [...B2B_DATA.proximosEventos].sort((a, b) => a.day - b.day);
    const accentByStatus = { confirmado: 'var(--primary-blue)', 'visita técnica': '#B45309', reunião: '#7E22CE' };
    listEl.innerHTML = sorted.map(ev => `
      <a href="agenda.html" class="agenda-item" style="border-left-color:${accentByStatus[ev.status] || 'var(--primary-blue)'};">
        <div class="flex-1 min-w-0">
          <p class="text-sm font-semibold text-zinc-900 truncate">${ev.client} · ${ev.event}</p>
          <p class="text-xs text-zinc-500 truncate mt-0.5">Dia ${ev.day} · ${ev.local}</p>
        </div>
        <div class="b2b-avatar" style="width:30px;height:30px;display:flex;align-items:center;justify-content:center;color:#fff;font-weight:600;font-size:.6875rem;flex-shrink:0;">
          ${initials(ev.client)}
        </div>
      </a>
    `).join('');
  }
}

/* -------------------- Eventos e notícias -------------------- */

function renderNewsList() {
  const wrap = document.getElementById('dash-news-list');
  if (!wrap) return;
  wrap.innerHTML = B2B_DATA.news.map(item => `
    <a href="${item.url}" class="dash-news-link">${escapeHtml(item.title)}</a>
  `).join('');
}
