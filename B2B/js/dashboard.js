/* ==========================================================================
   LOVE B2B — Dashboard (saudação, visão geral do site, métricas, agenda)
   ========================================================================== */

document.addEventListener('DOMContentLoaded', async () => {
  await window.b2bAuthReady;
  renderGreeting();
  renderAvisoServicosSuspensos();
  await renderMetricsOverview();
  initWalletTabs();
  initWalletPeriodo();
  initWalletEyeToggle();
  renderAgenda();
  renderNewsList();
  initOnboardingModal();
  await initAdsCarousel();
  renderAnalyticsCard();
  initAnalyticsPeriodPopover();
  initDashboardPaymentLinkModal();
  initFirstProductModal();
  window.b2bPageReady?.();
});

document.addEventListener('shell:ready', initMobileGreetingHeader);

/* -------------------- Mobile: avatar + mensagens/notificações na saudação --------------------
   No mobile, o cabeçalho (busca, upgrade) some e o avatar/mensagens/notificações
   passam a viver ao lado de "Olá, [empresa]" em vez do topbar. Move os nós reais
   do DOM (em vez de duplicá-los) para preservar os listeners e dropdowns já ligados
   pelo shell.js. */
function initMobileGreetingHeader() {
  const avatarSlot = document.getElementById('dashboard-greeting-avatar-slot');
  const iconsSlot = document.getElementById('dashboard-greeting-icons-slot');
  const iconGroup = document.getElementById('topbar-icon-group');
  if (!avatarSlot || !iconsSlot || !iconGroup) return;

  const avatarWrap = document.getElementById('avatar-trigger')?.closest('.topbar-icon-btn-wrap');
  const notifWrap = document.getElementById('notif-trigger')?.closest('.topbar-icon-btn-wrap');
  const servicesLink = iconGroup.querySelector('a[href="produtos"]');
  if (!avatarWrap || !notifWrap || !servicesLink) return;

  const mq = window.matchMedia('(max-width: 768px)');
  const apply = () => {
    if (mq.matches) {
      avatarSlot.appendChild(avatarWrap);
      iconsSlot.appendChild(servicesLink);
      iconsSlot.appendChild(notifWrap);
    } else {
      iconGroup.appendChild(servicesLink);
      iconGroup.appendChild(notifWrap);
      iconGroup.appendChild(avatarWrap);
    }
    fitGreetingTitleToOneLine();
    sizeMobileAvatarToGreetingText();
  };
  apply();
  mq.addEventListener ? mq.addEventListener('change', apply) : mq.addListener(apply);
  window.addEventListener('resize', () => {
    fitGreetingTitleToOneLine();
    sizeMobileAvatarToGreetingText();
  });
}

/* No mobile, "Olá, [empresa]" precisa caber numa linha só ao lado do avatar e
   dos ícones, no maior tamanho possível — como o nome da empresa é livre
   (qualquer tamanho), calcula o font-size ideal via canvas (mede o texto
   sem depender de reflow do DOM, que em loop de tentativa-e-erro fica com
   scrollWidth desatualizado) em vez de um valor fixo pequeno demais para
   nomes curtos ou grande demais para nomes longos. */
function fitGreetingTitleToOneLine() {
  const titleEl = document.getElementById('greeting-title');
  if (!titleEl) return;

  titleEl.style.fontSize = '';
  if (window.innerWidth > 768) return;

  const availablePx = titleEl.clientWidth;
  if (!availablePx) return;

  const maxFontPx = parseFloat(getComputedStyle(titleEl).fontSize);
  const minFontPx = 11;
  const cs = getComputedStyle(titleEl);

  if (!fitGreetingTitleToOneLine._canvas) fitGreetingTitleToOneLine._canvas = document.createElement('canvas');
  const ctx = fitGreetingTitleToOneLine._canvas.getContext('2d');
  ctx.font = `${cs.fontWeight} ${maxFontPx}px ${cs.fontFamily}`;
  const textWidthAtMax = ctx.measureText(titleEl.textContent).width;

  let fontPx = maxFontPx;
  if (textWidthAtMax > availablePx) {
    fontPx = Math.max(minFontPx, Math.floor((availablePx / textWidthAtMax) * maxFontPx * 0.97));
  }
  titleEl.style.fontSize = fontPx + 'px';
}

/* No mobile, a caixinha do avatar acompanha a altura das duas linhas da
   saudação (nome + data) — mede depois que fitGreetingTitleToOneLine()
   já ajustou o font-size, e vira um quadrado (largura = altura). */
function sizeMobileAvatarToGreetingText() {
  const avatarSlot = document.getElementById('dashboard-greeting-avatar-slot');
  const textEl = document.querySelector('.dashboard-greeting-text');
  if (!avatarSlot || !textEl) return;

  if (window.innerWidth > 768) {
    avatarSlot.style.width = '';
    avatarSlot.style.height = '';
    return;
  }

  const size = Math.min(textEl.getBoundingClientRect().height, 44);
  if (size > 0) {
    avatarSlot.style.width = size + 'px';
    avatarSlot.style.height = size + 'px';
  }
}

/* -------------------- Pop-up: cadastre seu primeiro produto/serviço -------------------- */

async function initFirstProductModal() {
  const modal = document.getElementById('first-product-modal');
  if (!modal) return;

  const { data: { session } } = await supabaseClient.auth.getSession();
  if (!session) return;

  const { count } = await supabaseClient
    .from('products')
    .select('id', { count: 'exact', head: true })
    .eq('fornecedor_id', empresaId(session));

  if (count) return;

  modal.classList.add('show');
  const close = () => modal.classList.remove('show');
  document.getElementById('first-product-close-btn')?.addEventListener('click', close);
  modal.addEventListener('click', (e) => { if (e.target === modal) close(); });
}

/* -------------------- Pop-up: criar link de pagamento (direto no dashboard) -------------------- */

const DASH_PAYMENT_LINK_SUBMIT_BTN_HTML = '<button type="submit" class="btn-primary justify-center w-full py-3 mt-2" id="payment-link-submit-btn">Criar Link de Cobrança</button>';

function buildDashPaymentLinkUrl(id) {
  return new URL(`site-preview?page=checkout&link=${id}`, location.href).toString();
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
    const vencimento = document.getElementById('payment-link-vencimento').value || null;

    const { data: { session } } = await supabaseClient.auth.getSession();
    if (!session) return;

    const { data: created, error } = await supabaseClient
      .from('payment_links')
      .insert({
        fornecedor_id: empresaId(session),
        amount,
        installments,
        pass_fee_to_client: passFeeToClient,
        payment_methods: paymentMethods,
        vencimento,
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

/* Os slides vivem em conteudo_plataforma e são editados no Admin
   (Informações → Banner da home). O HTML traz o carrossel antigo escrito à
   mão apenas como rede de segurança: se o banco responder, ele manda —
   inclusive respondendo "nenhum banner", que esconde o card. Só um erro de
   rede mantém o que está no HTML. */
async function carregarAdsDoAdmin(root, dotsWrap) {
  let banners;
  try {
    const { data, error } = await supabaseClient
      .from('conteudo_plataforma')
      .select('titulo, descricao, imagem_url, link_url, posicao')
      .eq('plataforma', 'fornecedor')
      .eq('secao', 'banner')
      .eq('ativo', true)
      .order('posicao', { ascending: true });
    if (error) throw error;
    banners = data || [];
  } catch (err) {
    console.warn('Banner do carrossel: mantendo o conteúdo do HTML.', err);
    return;
  }

  if (!banners.length) {
    root.closest('.dash-ads-card')?.remove();
    root.innerHTML = '';
    dotsWrap.innerHTML = '';
    return;
  }

  const navs = Array.from(root.querySelectorAll('.dash-ads-nav'));

  root.innerHTML = banners.map((b, i) => {
    const legenda = (b.titulo || b.descricao)
      ? `<div class="dash-ads-slide-caption">
           ${b.titulo ? `<p class="dash-ads-slide-title">${escapeHtml(b.titulo)}</p>` : ''}
           ${b.descricao ? `<p class="dash-ads-slide-subtitle">${escapeHtml(b.descricao)}</p>` : ''}
         </div>`
      : '';
    const rotulo = b.titulo || b.descricao || `Anúncio ${i + 1}`;
    const atributos = `class="dash-ads-slide${i === 0 ? ' is-active' : ''}" data-slide="${i}" aria-label="${escapeHtml(rotulo)}"`;
    const miolo = `<img src="${escapeHtml(b.imagem_url || '')}" alt="" class="dash-ads-slide-img">${legenda}`;
    return b.link_url
      ? `<a href="${escapeHtml(b.link_url)}" ${atributos}>${miolo}</a>`
      : `<div ${atributos}>${miolo}</div>`;
  }).join('');

  navs.forEach(nav => root.appendChild(nav));

  dotsWrap.innerHTML = banners.length > 1
    ? banners.map((_, i) =>
        `<button type="button" class="dash-ads-dot${i === 0 ? ' is-active' : ''}" data-dot="${i}" aria-label="Ver anúncio ${i + 1}"></button>`
      ).join('')
    : '';
  navs.forEach(nav => { nav.hidden = banners.length <= 1; });
}

async function initAdsCarousel() {
  const root = document.getElementById('dash-ads-carousel');
  const dotsWrap = document.getElementById('dash-ads-dots');
  if (!root || !dotsWrap) return;

  await carregarAdsDoAdmin(root, dotsWrap);

  const slides = Array.from(root.querySelectorAll('.dash-ads-slide'));
  const dots = Array.from(dotsWrap.querySelectorAll('.dash-ads-dot'));
  if (!slides.length) return;
  let current = 0;
  let timer = null;

  // Título/subtítulo do carrossel são opcionais (virão do admin futuramente) —
  // um slide sem nenhum dos dois mostra só a imagem, sem a faixa de legenda.
  slides.forEach(slide => {
    const caption = slide.querySelector('.dash-ads-slide-caption');
    if (!caption) return;
    const titleEl = caption.querySelector('.dash-ads-slide-title');
    const subtitleEl = caption.querySelector('.dash-ads-slide-subtitle');
    const hasTitle = !!titleEl?.textContent.trim();
    const hasSubtitle = !!subtitleEl?.textContent.trim();
    if (!hasTitle && !hasSubtitle) {
      caption.remove();
      return;
    }
    if (!hasTitle) titleEl?.remove();
    if (!hasSubtitle) subtitleEl?.remove();
  });

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

// Período do Analytics: início e fim (Date) — padrão, últimos 30 dias.
let analyticsRange = analyticsLastDays(30);

function analyticsLastDays(n) {
  const end = new Date();
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - (n - 1));
  return { start, end };
}

// Sessões no site: visitas reais ao site publicado do fornecedor
// (<slug>.love.com.br ou hub.love.com.br/<slug>), uma por sessão do
// navegador, no período escolhido. Ver migration 053_site_visitas.sql.
async function renderSiteSessions() {
  const { data: { session } } = await supabaseClient.auth.getSession();
  if (!session) return;
  const { count, error } = await supabaseClient
    .from('site_visitas')
    .select('id', { count: 'exact', head: true })
    .eq('fornecedor_id', empresaId(session))
    .gte('criado_em', analyticsRange.start.toISOString())
    .lte('criado_em', analyticsRange.end.toISOString());
  // Sem a tabela (migration 053 ainda não rodada) mostra zero.
  setText('analytics-sessions', (error ? 0 : (count || 0)).toLocaleString('pt-BR'));
}

async function renderAnalyticsCard() {
  renderSiteSessions();

  const { data: { session } } = await supabaseClient.auth.getSession();
  const { data: leads } = session
    ? await supabaseClient.from('leads').select('status').eq('fornecedor_id', empresaId(session))
    : { data: [] };
  const allLeads = leads || [];

  const leadsAtivos = allLeads.filter(l => l.status !== 'fechado').length;
  setText('analytics-leads', leadsAtivos.toLocaleString('pt-BR'));

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

  // Calendário do "Personalizado": escolhe o primeiro e o último dia.
  const cal = document.createElement('div');
  cal.className = 'dash-range-cal';
  cal.hidden = true;
  popover.appendChild(cal);

  const pad2 = n => String(n).padStart(2, '0');
  const isoOf = d => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
  const fromIso = iso => new Date(iso + 'T00:00:00');
  const curto = iso => { const [, m, d] = iso.split('-'); return `${d}/${m}`; };
  let viewDate = new Date();
  viewDate.setDate(1);
  let rangeStart = null;
  let rangeEnd = null;

  const renderCal = () => {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const firstWeekday = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const todayIso = isoOf(new Date());
    let dias = '';
    for (let i = 0; i < firstWeekday; i++) dias += '<span></span>';
    for (let d = 1; d <= daysInMonth; d++) {
      const iso = isoOf(new Date(year, month, d));
      const classes = ['mini-cal-day'];
      if (iso === todayIso) classes.push('is-today');
      if (iso === rangeStart || iso === rangeEnd) classes.push('is-selected');
      else if (rangeStart && rangeEnd && iso > rangeStart && iso < rangeEnd) classes.push('is-in-range');
      const futuro = iso > todayIso;
      dias += `<button type="button" class="${classes.join(' ')}" data-range-day="${iso}"${futuro ? ' disabled' : ''}>${d}</button>`;
    }
    const mes = capitalize(viewDate.toLocaleDateString('pt-BR', { month: 'long' }));
    const dica = !rangeStart ? 'Escolha o primeiro dia' : !rangeEnd ? 'Agora o último dia' : `${curto(rangeStart)} a ${curto(rangeEnd)}`;
    cal.innerHTML = `
      <div class="mini-cal-header">
        <button type="button" class="mini-cal-nav-btn" data-range-prev aria-label="Mês anterior"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="m15 19-7-7 7-7" /></svg></button>
        <span class="mini-cal-month-label">${mes} de ${year}</span>
        <button type="button" class="mini-cal-nav-btn" data-range-next aria-label="Próximo mês"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="m9 5 7 7-7 7" /></svg></button>
      </div>
      <div class="mini-cal-weekdays"><span>D</span><span>S</span><span>T</span><span>Q</span><span>Q</span><span>S</span><span>S</span></div>
      <div class="mini-cal-grid">${dias}</div>
      <div class="dash-range-cal-foot">
        <span class="dash-range-cal-hint">${dica}</span>
        <button type="button" class="btn-primary dash-range-apply" data-range-apply${rangeStart && rangeEnd ? '' : ' disabled'}>Aplicar</button>
      </div>`;
  };

  cal.addEventListener('click', (e) => {
    e.stopPropagation();
    const alvo = e.target.closest('button');
    if (!alvo || alvo.disabled) return;
    if (alvo.hasAttribute('data-range-prev')) { viewDate.setMonth(viewDate.getMonth() - 1); return renderCal(); }
    if (alvo.hasAttribute('data-range-next')) { viewDate.setMonth(viewDate.getMonth() + 1); return renderCal(); }
    if (alvo.dataset.rangeDay) {
      const iso = alvo.dataset.rangeDay;
      if (!rangeStart || rangeEnd) { rangeStart = iso; rangeEnd = null; }
      else if (iso < rangeStart) { rangeEnd = rangeStart; rangeStart = iso; }
      else rangeEnd = iso;
      return renderCal();
    }
    if (alvo.hasAttribute('data-range-apply') && rangeStart && rangeEnd) {
      const end = fromIso(rangeEnd);
      end.setHours(23, 59, 59, 999);
      aplicar({ start: fromIso(rangeStart), end }, `${curto(rangeStart)} a ${curto(rangeEnd)}`);
    }
  });

  const close = () => {
    popover.hidden = true;
    cal.hidden = true;
    document.removeEventListener('click', onOutsideClick);
  };
  const onOutsideClick = (e) => { if (!popover.contains(e.target) && e.target !== btn && !btn.contains(e.target)) close(); };

  const aplicar = (range, texto) => {
    analyticsRange = range;
    setText('dash-analytics-period-label', texto);
    close();
    renderSiteSessions();
  };

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
    option.addEventListener('click', (e) => {
      e.stopPropagation();
      popover.querySelectorAll('[data-period]').forEach(o => o.classList.toggle('is-active', o === option));
      if (option.dataset.period === 'personalizado') {
        cal.hidden = false;
        renderCal();
        return;
      }
      aplicar(analyticsLastDays(Number(option.dataset.period)), option.dataset.periodLabel);
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
  carregarPrimeirosPassos(modal);
  closeBtn.addEventListener('click', () => modal.classList.remove('show'));
  modal.addEventListener('click', (e) => { if (e.target === modal) modal.classList.remove('show'); });
}

// Os pontos de partida da boas-vindas vêm do Admin (HUB/B2B → Dashboard →
// FAQ → Primeiros passos). Sem resposta, ficam os três fixos do HTML.
async function carregarPrimeirosPassos(modal) {
  const lista = modal.querySelector('.onboarding-tips');
  if (!lista) return;
  try {
    const { data, error } = await supabaseClient
      .from('primeiros_passos')
      .select('titulo, descricao, icone, link_url, ordem')
      .eq('plataforma', 'fornecedor')
      .eq('ativo', true)
      .order('ordem', { ascending: true })
      .limit(6);
    if (error || !Array.isArray(data) || !data.length) return;
    lista.innerHTML = data.map(p => `
      <li><span>${escapeHtml(p.icone || '•')}</span> <strong>${escapeHtml(p.titulo)}</strong>${p.descricao ? ' — ' + escapeHtml(p.descricao) : ''}</li>
    `).join('');
  } catch (e) { /* mantém os fixos */ }
}

// Aviso "N serviços suspensos pela Love" (products.suspenso, migration 059).
async function renderAvisoServicosSuspensos() {
  const aviso = document.getElementById('dashboard-suspensos-aviso');
  if (!aviso) return;
  const { data: { session } } = await supabaseClient.auth.getSession();
  if (!session) return;
  const { count, error } = await supabaseClient
    .from('products')
    .select('id', { count: 'exact', head: true })
    .eq('fornecedor_id', empresaId(session))
    .eq('suspenso', true);
  if (error || !count) { aviso.hidden = true; return; }
  aviso.innerHTML = `<span><strong>${count} ${count === 1 ? 'serviço suspenso' : 'serviços suspensos'} pela Love.</strong> ${count === 1 ? 'Ele não aparece' : 'Eles não aparecem'} no Explorar.</span><span class="dashboard-suspensos-link">Ver serviços →</span>`;
  aviso.hidden = false;
}

function renderGreeting() {
  const now = new Date();
  const dateStr = new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' }).format(now);
  setText('greeting-date', capitalize(dateStr));
  setText('greeting-date-side', capitalize(dateStr));

  const titleEl = document.getElementById('greeting-title');
  if (titleEl) {
    const verifiedBadge = B2B_DATA.professional.selfieVerified
      ? ` <span class="verified-badge" title="Conta verificada"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 0 1-1.043 3.296 3.745 3.745 0 0 1-3.296 1.043A3.745 3.745 0 0 1 12 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 0 1-3.296-1.043 3.745 3.745 0 0 1-1.043-3.296A3.745 3.745 0 0 1 3 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 0 1 1.043-3.296 3.745 3.745 0 0 1 3.296-1.043A3.746 3.746 0 0 1 12 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 0 1 3.296 1.043 3.746 3.746 0 0 1 1.043 3.296A3.745 3.745 0 0 1 21 12Z" /></svg></span>`
      : '';
    // "Boas-vindas, Victor": só o primeiro nome do responsável.
    const primeiroNome = String(B2B_DATA.professional.name || '').trim().split(/\s+/)[0] || '';
    titleEl.innerHTML = `Boas-vindas${primeiroNome ? ', ' + escapeHtml(primeiroNome) : ''}!${verifiedBadge}`;
    fitGreetingTitleToOneLine();
    sizeMobileAvatarToGreetingText();
  }
}

/* -------------------- Métricas rápidas -------------------- */

/* -------------------- Carteira (Saldo / Faturamento) -------------------- */

let walletBalanceVisible = true;
let walletFinData = {};

/* -------------------- Período do Faturamento --------------------
   Botão no canto do card Saldo/Faturamento: atalhos (1, 7, 15 e 30 dias) e
   calendário de dois meses para um período personalizado. O faturamento
   soma os créditos do período; a comparação é com o período anterior de
   mesmo tamanho. Padrão: últimos 30 dias (até hoje). */
let walletTransacoes = [];
const DIA_MS = 24 * 60 * 60 * 1000;
const inicioDoDia = d => new Date(d.getFullYear(), d.getMonth(), d.getDate());
let walletPeriodo = (() => { const fim = inicioDoDia(new Date()); return { inicio: new Date(fim.getTime() - 29 * DIA_MS), fim, dias: 30 }; })();

function faturamentoNoPeriodo() {
  const ini = walletPeriodo.inicio.getTime();
  const fim = walletPeriodo.fim.getTime() + DIA_MS; // fim do dia
  const tam = fim - ini;
  const soma = (a, b) => walletTransacoes
    .filter(t => t.type === 'credit')
    .filter(t => { const x = new Date(t.created_at).getTime(); return x >= a && x < b; })
    .reduce((s, t) => s + Number(t.amount), 0);
  return { atual: soma(ini, fim), anterior: soma(ini - tam, ini) };
}

function rotuloDoPeriodo(p) {
  if (p.dias === 1) return 'Hoje';
  if (p.dias) return `Últimos ${p.dias} dias`;
  const f = d => d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  return p.inicio.getTime() === p.fim.getTime() ? f(p.inicio) : `${f(p.inicio)} – ${f(p.fim)}`;
}

function aplicarPeriodoNoFaturamento() {
  const fat = faturamentoNoPeriodo();
  walletFinData.faturamentoEsteMes = fat.atual;
  walletFinData.faturamentoMesPassado = fat.anterior;
  const el = document.getElementById('wallet-faturamento-value');
  if (el) el.dataset.value = fat.atual || 0;
  setText('wallet-periodo-rotulo', rotuloDoPeriodo(walletPeriodo));
  renderWalletAmounts();
}

function initWalletPeriodo() {
  const btn = document.getElementById('wallet-periodo-btn');
  const menu = document.getElementById('wallet-periodo-menu');
  const cal = document.getElementById('wallet-periodo-cal');
  if (!btn || !menu || !cal) return;
  const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
  const SEMANA = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sab'];
  let rascunho = null;      // { inicio, fim, dias }
  let escolhendoFim = false;
  let mesBase = null;       // 1º dia do mês da esquerda

  const mesmoDia = (a, b) => a && b && a.getTime() === b.getTime();
  const desenharMes = (ano, mes) => {
    const primeiro = new Date(ano, mes, 1);
    const inicioGrade = new Date(ano, mes, 1 - primeiro.getDay());
    const hoje = inicioDoDia(new Date());
    let html = `<div class="wp-mes"><p class="wp-mes-titulo">${MESES[mes]} ${ano}</p><div class="wp-grade">${SEMANA.map(s => `<span class="wp-sem">${s}</span>`).join('')}`;
    for (let i = 0; i < 42; i++) {
      const d = new Date(inicioGrade.getFullYear(), inicioGrade.getMonth(), inicioGrade.getDate() + i);
      if (i >= 35 && d.getMonth() !== mes) break;
      const fora = d.getMonth() !== mes;
      const ini = rascunho && mesmoDia(d, rascunho.inicio);
      const fim = rascunho && mesmoDia(d, rascunho.fim);
      const dentro = rascunho && rascunho.fim && d > rascunho.inicio && d < rascunho.fim;
      const classes = ['wp-dia', fora ? 'is-fora' : '', dentro ? 'is-dentro' : '', (ini || fim) ? 'is-ponta' : '', mesmoDia(d, hoje) ? 'is-hoje' : '', d > hoje ? 'is-futuro' : ''].filter(Boolean).join(' ');
      html += `<button type="button" class="${classes}" data-dia="${d.getTime()}"${d > hoje ? ' disabled' : ''}>${d.getDate()}</button>`;
    }
    return html + '</div></div>';
  };
  const desenhar = () => {
    const esq = mesBase;
    const dir = new Date(esq.getFullYear(), esq.getMonth() + 1, 1);
    cal.innerHTML = `
      <button type="button" class="wp-nav wp-nav-ant" data-nav="-1" aria-label="Mês anterior"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="m15 18-6-6 6-6"/></svg></button>
      <button type="button" class="wp-nav wp-nav-prox" data-nav="1" aria-label="Próximo mês"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="m9 6 6 6-6 6"/></svg></button>
      ${desenharMes(esq.getFullYear(), esq.getMonth())}${desenharMes(dir.getFullYear(), dir.getMonth())}`;
    menu.querySelectorAll('[data-periodo-dias]').forEach(b => b.classList.toggle('is-ativo', !!rascunho && rascunho.dias === Number(b.dataset.periodoDias)));
  };
  const abrir = () => {
    rascunho = { ...walletPeriodo };
    escolhendoFim = false;
    const hoje = inicioDoDia(new Date());
    mesBase = new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1); // mês passado + este mês
    desenhar();
    menu.hidden = false;
    btn.setAttribute('aria-expanded', 'true');
  };
  const fechar = () => { menu.hidden = true; btn.setAttribute('aria-expanded', 'false'); };

  btn.addEventListener('click', (e) => { e.stopPropagation(); if (menu.hidden) abrir(); else fechar(); });
  menu.addEventListener('click', (e) => {
    e.stopPropagation();
    const nav = e.target.closest('[data-nav]');
    if (nav) { mesBase = new Date(mesBase.getFullYear(), mesBase.getMonth() + Number(nav.dataset.nav), 1); desenhar(); return; }
    const atalho = e.target.closest('[data-periodo-dias]');
    if (atalho) {
      const dias = Number(atalho.dataset.periodoDias);
      const fim = inicioDoDia(new Date());
      rascunho = { inicio: new Date(fim.getTime() - (dias - 1) * DIA_MS), fim, dias };
      escolhendoFim = false;
      desenhar();
      return;
    }
    const dia = e.target.closest('[data-dia]');
    if (dia && !dia.disabled) {
      const d = new Date(Number(dia.dataset.dia));
      if (!escolhendoFim || !rascunho || d < rascunho.inicio) {
        rascunho = { inicio: d, fim: d, dias: null };
        escolhendoFim = true;
      } else {
        rascunho = { inicio: rascunho.inicio, fim: d, dias: null };
        escolhendoFim = false;
      }
      desenhar();
    }
  });
  document.getElementById('wallet-periodo-cancelar')?.addEventListener('click', fechar);
  document.getElementById('wallet-periodo-aplicar')?.addEventListener('click', () => {
    if (rascunho) walletPeriodo = { ...rascunho, fim: rascunho.fim || rascunho.inicio };
    fechar();
    aplicarPeriodoNoFaturamento();
    // Mostra o Faturamento (é ele que muda com o período).
    document.querySelector('#wallet-tabs [data-wallet-tab="faturamento"]')?.click();
  });
  document.addEventListener('click', (e) => { if (!menu.hidden && !e.target.closest('#wallet-periodo')) fechar(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !menu.hidden) fechar(); });
  setText('wallet-periodo-rotulo', rotuloDoPeriodo(walletPeriodo));
}

async function renderMetricsOverview() {
  const { data: { session } } = await supabaseClient.auth.getSession();
  let transactions = [];
  let pendingLinksTotal = 0;

  if (session) {
    const [txRes, linksRes] = await Promise.all([
      supabaseClient.from('wallet_transactions').select('type, amount, created_at').eq('fornecedor_id', empresaId(session)),
      supabaseClient.from('payment_links').select('amount, status').eq('fornecedor_id', empresaId(session)).eq('status', 'pendente')
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

  walletTransacoes = transactions;
  const fat = faturamentoNoPeriodo();
  const fin = {
    saqueDisponivel,
    faturamentoEsteMes: fat.atual,
    faturamentoMesPassado: fat.anterior,
    valorEmAberto: pendingLinksTotal
  };
  walletFinData = fin;

  const saldoEl = document.getElementById('wallet-saldo-value');
  const faturamentoEl = document.getElementById('wallet-faturamento-value');

  if (saldoEl) saldoEl.dataset.value = fin.saqueDisponivel || 0;
  if (faturamentoEl) faturamentoEl.dataset.value = fin.faturamentoEsteMes || 0;

  renderWalletAmounts();
}

function renderWalletAmounts() {
  ['wallet-saldo-value', 'wallet-faturamento-value'].forEach(id => {
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
      .eq('fornecedor_id', empresaId(session))
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
      <a href="agenda" class="agenda-item" style="border-left-color:var(--primary-blue);">
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

// Notícias = artigos publicados na categoria Notícias do blog; workshops =
// HUB/B2B › Dashboard › Conteúdo no Admin. Sem resposta do banco, fica a
// lista fixa de data.js.
async function renderNewsList() {
  const wrap = document.getElementById('dash-news-list');
  if (!wrap) return;

  const desenhar = lista => {
    wrap.innerHTML = lista.map(item => `
      <a href="${escapeHtml(item.url || '#')}" class="dash-news-link"${/^https?:/i.test(item.url || '') ? ' target="_blank" rel="noopener noreferrer"' : ''}>${escapeHtml(item.title)}</a>
    `).join('');
  };

  desenhar(B2B_DATA.news);

  try {
    const [blog, workshops] = await Promise.all([
      supabaseClient
        .from('artigos')
        .select('titulo, slug, publicado_em, artigo_categoria!inner(artigo_categorias!inner(slug))')
        .eq('status', 'publicado')
        .eq('artigo_categoria.artigo_categorias.slug', 'noticias')
        .order('publicado_em', { ascending: false })
        .limit(5),
      supabaseClient
        .from('hub_conteudo')
        .select('titulo, link_url, ordem')
        .eq('tipo', 'workshop')
        .eq('ativo', true)
        .order('ordem', { ascending: true })
        .limit(3)
    ]);

    const noticias = (blog.data || []).map(a => ({ title: a.titulo, url: a.slug ? `https://love.com.br/blog/${a.slug}` : 'https://blog.love.com.br' }));
    const eventos = (workshops.data || []).map(i => ({ title: i.titulo, url: i.link_url || '#' }));
    const lista = [...noticias, ...eventos].slice(0, 6);
    if (lista.length) desenhar(lista);
  } catch (e) { /* mantém a lista fixa */ }
}

/* Carrossel da direita com a mesma altura do bloco da esquerda (Saldo +
   atalhos): assim "Analytics" começa na mesma linha de "Sua agenda". Só
   com as duas colunas lado a lado. */
function alinharCarrosselComSaldo() {
  const card = document.querySelector('.dash-ads-card');
  const saldo = document.querySelector('.wallet-card');
  const atalhos = document.querySelector('.dashboard-quick-actions');
  if (!card || !saldo || !atalhos) return;
  const ladoALado = window.matchMedia('(min-width: 1024px)').matches;
  if (!ladoALado) { card.style.height = ''; card.classList.remove('altura-alinhada'); return; }
  const altura = atalhos.getBoundingClientRect().bottom - saldo.getBoundingClientRect().top;
  if (altura > 0) {
    card.style.height = `${Math.round(altura)}px`;
    card.classList.add('altura-alinhada');
  }
}
window.addEventListener('resize', alinharCarrosselComSaldo);
window.addEventListener('load', alinharCarrosselComSaldo);
document.addEventListener('DOMContentLoaded', () => {
  alinharCarrosselComSaldo();
  const saldo = document.querySelector('.wallet-card');
  if (saldo && 'ResizeObserver' in window) new ResizeObserver(alinharCarrosselComSaldo).observe(saldo);
});
