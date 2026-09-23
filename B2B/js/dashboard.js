/* ==========================================================================
   LOVE B2B — Dashboard (saudação, visão geral do site, métricas, agenda)
   ========================================================================== */

document.addEventListener('DOMContentLoaded', async () => {
  await window.b2bAuthReady;
  renderGreeting();
  await renderMetricsOverview();
  initWalletTabs();
  initWalletEyeToggle();
  renderAgenda();
  renderNewsList();
  initOnboardingModal();
  initAdsCarousel();
  renderAnalyticsCard();
  initAnalyticsPeriodPopover();
  initDashboardPaymentLinkModal();
});

/* -------------------- Pop-up: criar link de pagamento (direto no dashboard) -------------------- */

const DASH_PAYMENT_LINK_SUBMIT_BTN_HTML = '<button type="submit" class="btn-primary justify-center w-full py-3 mt-2" id="payment-link-submit-btn">Criar link de pagamento</button>';

function buildDashPaymentLinkUrl(id) {
  return new URL(`site-preview.html?page=checkout&link=${id}`, location.href).toString();
}

function dashCopyTextToClipboard(text) {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).catch(() => dashFallbackCopyText(text));
  } else {
    dashFallbackCopyText(text);
  }
}

function dashFallbackCopyText(text) {
  const el = document.createElement('textarea');
  el.value = text;
  el.style.position = 'fixed';
  el.style.opacity = '0';
  document.body.appendChild(el);
  el.select();
  try { document.execCommand('copy'); } catch (e) { /* ignora */ }
  document.body.removeChild(el);
}

function initDashboardPaymentLinkModal() {
  const modal = document.getElementById('payment-link-modal');
  const openBtn = document.getElementById('dashboard-create-payment-link-btn');
  const closeBtn = document.getElementById('payment-link-modal-close');
  const form = document.getElementById('payment-link-form');
  const fieldsWrap = document.getElementById('payment-link-fields');
  const actionRow = document.getElementById('payment-link-action-row');
  const amountInput = document.getElementById('payment-link-amount');
  const installmentsSelect = document.getElementById('payment-link-installments');
  const feeToggle = document.getElementById('payment-link-fee-toggle');
  if (!modal || !form) return;

  installmentsSelect.innerHTML = Array.from({ length: 12 }, (_, i) => i + 1)
    .map(n => `<option value="${n}">${n}x${n === 1 ? ' (à vista)' : ''}</option>`)
    .join('');

  wireCurrencyMaskInput(amountInput);

  let passFeeToClient = false;

  feeToggle.querySelectorAll('[data-pass-fee]').forEach(btn => {
    btn.addEventListener('click', () => {
      feeToggle.querySelectorAll('[data-pass-fee]').forEach(b => b.classList.toggle('active', b === btn));
      passFeeToClient = btn.dataset.passFee === 'sim';
    });
  });

  const resetModal = () => {
    form.reset();
    fieldsWrap.style.display = '';
    actionRow.innerHTML = DASH_PAYMENT_LINK_SUBMIT_BTN_HTML;
    feeToggle.querySelectorAll('[data-pass-fee]').forEach(b => b.classList.toggle('active', b.dataset.passFee === 'nao'));
    passFeeToClient = false;
    installmentsSelect.value = '1';
    form.querySelectorAll('[data-payment-method]').forEach(cb => { cb.checked = true; });
  };

  const open = () => { resetModal(); modal.classList.add('show'); };
  const close = () => modal.classList.remove('show');

  if (openBtn) openBtn.addEventListener('click', open);
  if (closeBtn) closeBtn.addEventListener('click', close);
  modal.addEventListener('click', (e) => { if (e.target === modal) close(); });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const amount = currencyMaskValue(amountInput);
    if (amount <= 0) return;

    const paymentMethods = {
      boleto: form.querySelector('[data-payment-method="boleto"]').checked,
      pix: form.querySelector('[data-payment-method="pix"]').checked,
      cartao: form.querySelector('[data-payment-method="cartao"]').checked
    };
    const installments = Number(installmentsSelect.value) || 1;

    const { data: { session } } = await supabaseClient.auth.getSession();
    if (!session) return;

    const { data: created, error } = await supabaseClient
      .from('payment_links')
      .insert({
        fornecedor_id: session.user.id,
        amount,
        installments,
        pass_fee_to_client: passFeeToClient,
        payment_methods: paymentMethods,
        status: 'pendente'
      })
      .select('id')
      .single();

    if (error) {
      showToast('Não foi possível criar o link de pagamento.', true);
      return;
    }

    const url = buildDashPaymentLinkUrl(created.id);
    fieldsWrap.style.display = 'none';
    actionRow.innerHTML = `
      <div class="payment-link-result-box">
        <span class="payment-link-result-url">${escapeHtml(url)}</span>
        <button type="button" class="payment-link-result-send" id="payment-link-result-send" title="Copiar link" aria-label="Copiar link">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="17" height="17"><rect x="8" y="8" width="12" height="12" rx="2"/><path stroke-linecap="round" stroke-linejoin="round" d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/></svg>
        </button>
      </div>
    `;
    document.getElementById('payment-link-result-send').addEventListener('click', () => {
      dashCopyTextToClipboard(url);
      showToast('Link copiado!');
    });
  });
}

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

async function renderAnalyticsCard() {
  setText('analytics-sessions', padTwoDigits(B2B_DATA.siteMetrics.visits30d));

  const { data: { session } } = await supabaseClient.auth.getSession();
  const { data: leads } = session
    ? await supabaseClient.from('leads').select('status').eq('fornecedor_id', session.user.id)
    : { data: [] };
  const allLeads = leads || [];

  const leadsAtivos = allLeads.filter(l => l.status !== 'fechado').length;
  setText('analytics-leads', padTwoDigits(leadsAtivos));

  const totalLeads = allLeads.length;
  const closedLeads = allLeads.filter(l => l.status === 'fechado').length;
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

async function renderMetricsOverview() {
  const { data: { session } } = await supabaseClient.auth.getSession();
  let transactions = [];
  let pendingLinksTotal = 0;

  if (session) {
    const [txRes, linksRes] = await Promise.all([
      supabaseClient.from('wallet_transactions').select('type, amount, created_at').eq('fornecedor_id', session.user.id),
      supabaseClient.from('payment_links').select('amount, status').eq('fornecedor_id', session.user.id).eq('status', 'pendente')
    ]);
    transactions = txRes.data || [];
    pendingLinksTotal = (linksRes.data || []).reduce((sum, l) => sum + Number(l.amount), 0);
  }

  const saqueDisponivel = transactions.reduce((sum, t) => sum + (t.type === 'credit' ? Number(t.amount) : -Number(t.amount)), 0);

  const faturamentoPorMes = (monthsAgo) => {
    const now = new Date();
    const targetMonth = now.getMonth() - monthsAgo;
    const targetYear = now.getFullYear() + Math.floor(targetMonth / 12);
    const normalizedMonth = ((targetMonth % 12) + 12) % 12;
    return transactions
      .filter(t => t.type === 'credit')
      .filter(t => { const d = new Date(t.created_at); return d.getMonth() === normalizedMonth && d.getFullYear() === targetYear; })
      .reduce((sum, t) => sum + Number(t.amount), 0);
  };

  const fin = {
    saqueDisponivel,
    faturamentoEsteMes: faturamentoPorMes(0),
    faturamentoMesPassado: faturamentoPorMes(1),
    valorEmAberto: pendingLinksTotal
  };
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

function dashDateKey(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

async function renderAgenda() {
  const stripEl = document.getElementById('day-strip');
  const listEl = document.getElementById('agenda-list');
  if (!stripEl) return;

  const today = new Date();
  const rangeEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 6);

  const { data: { session } } = await supabaseClient.auth.getSession();
  let events = [];
  if (session) {
    const { data } = await supabaseClient
      .from('agenda_events')
      .select('*')
      .eq('fornecedor_id', session.user.id)
      .gte('date', dashDateKey(today))
      .lte('date', dashDateKey(rangeEnd))
      .order('date', { ascending: true });
    events = data || [];
  }

  const eventDays = new Set(events.map(e => e.date));

  let strip = '';
  for (let i = 0; i < 7; i++) {
    const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() + i);
    const isToday = i === 0;
    const hasEvent = eventDays.has(dashDateKey(d));
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
    if (!events.length) {
      listEl.innerHTML = '<p class="text-sm text-zinc-500">Nenhum compromisso nos próximos dias.</p>';
      return;
    }
    listEl.innerHTML = events.map(ev => `
      <a href="agenda.html" class="agenda-item" style="border-left-color:var(--primary-blue);">
        <div class="flex-1 min-w-0">
          <p class="text-sm font-semibold text-zinc-900 truncate">${escapeHtml(ev.title)}</p>
          <p class="text-xs text-zinc-500 truncate mt-0.5">${formatShortDate(ev.date)}${ev.local ? ' · ' + escapeHtml(ev.local) : ''}</p>
        </div>
        <div class="b2b-avatar" style="width:30px;height:30px;display:flex;align-items:center;justify-content:center;color:#fff;font-weight:600;font-size:.6875rem;flex-shrink:0;">
          ${initials(ev.title)}
        </div>
      </a>
    `).join('');
  }
}

function formatShortDate(iso) {
  return new Date(iso + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}

/* -------------------- Eventos e notícias -------------------- */

function renderNewsList() {
  const wrap = document.getElementById('dash-news-list');
  if (!wrap) return;
  wrap.innerHTML = B2B_DATA.news.map(item => `
    <a href="${item.url}" class="dash-news-link">${escapeHtml(item.title)}</a>
  `).join('');
}
