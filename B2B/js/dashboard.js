/* ==========================================================================
   LOVE B2B — Dashboard (saudação, visão geral do site, métricas, agenda)
   ========================================================================== */

document.addEventListener('DOMContentLoaded', async () => {
  await window.b2bAuthReady;
  renderGreeting();
  renderAvisoServicosSuspensos();
  await renderSaldoTotal();
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

  // Celular: o sino e o ☰ agora ficam no topo (como no anfitrião) e o perfil
  // abre pelo ☰, então nada mais é movido para dentro do "Olá" — os ícones
  // ficam sempre no topbar, na ordem de sempre.
  iconGroup.appendChild(servicesLink);
  iconGroup.appendChild(notifWrap);
  iconGroup.appendChild(avatarWrap);
  const apply = () => {
    fitGreetingTitleToOneLine();
    sizeMobileAvatarToGreetingText();
  };
  apply();
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

  // Aparece só uma vez por empresa (neste navegador).
  const chaveVisto = `b2b-primeiro-produto-visto-${empresaId(session)}`;
  try { if (localStorage.getItem(chaveVisto)) return; localStorage.setItem(chaveVisto, '1'); } catch (e) { /* sem armazenamento: mostra */ }

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
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" width="17" height="17"><rect x="8" y="8" width="12" height="12" rx="2"/><path stroke-linecap="round" stroke-linejoin="round" d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/></svg>
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

  // Celular: arrastar a imagem para o lado passa para o próximo (ou o
  // anterior) banner, com a imagem acompanhando o dedo.
  let toque = null;
  let arrastouAgora = 0;
  const vizinho = dx => (current + (dx < 0 ? 1 : -1) + slides.length) % slides.length;
  const limpar = slide => {
    slide.style.transition = 'none'; slide.style.transform = ''; slide.style.opacity = ''; slide.style.visibility = '';
    requestAnimationFrame(() => requestAnimationFrame(() => { slide.style.transition = ''; }));
  };
  const posicionar = (dx, w, animar, lado) => {
    const atual = slides[current];
    const viz = slides[vizinho(lado)];
    slides.forEach(sl => { if (sl !== atual && sl !== viz && sl.style.transform) limpar(sl); });
    [atual, viz].forEach(sl => { sl.style.transition = animar ? 'transform .25s ease' : 'none'; sl.style.opacity = '1'; sl.style.visibility = 'visible'; });
    atual.style.transform = `translateX(${dx}px)`;
    viz.style.transform = `translateX(${dx + (lado < 0 ? w : -w)}px)`;
  };
  root.addEventListener('touchstart', e => {
    if (slides.length < 2 || e.touches.length !== 1) return;
    toque = { x: e.touches[0].clientX, y: e.touches[0].clientY, dx: 0, lateral: null, w: root.clientWidth };
  }, { passive: true });
  root.addEventListener('touchmove', e => {
    if (!toque) return;
    const dx = e.touches[0].clientX - toque.x;
    const dy = e.touches[0].clientY - toque.y;
    if (toque.lateral === null) {
      if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
      toque.lateral = Math.abs(dx) > Math.abs(dy);
      if (!toque.lateral) { toque = null; return; }
      clearInterval(timer);
    }
    e.preventDefault();
    toque.dx = dx;
    posicionar(dx, toque.w, false, dx || -1);
  }, { passive: false });
  const soltar = () => {
    if (!toque) return;
    const { dx, w, lateral } = toque;
    toque = null;
    if (!lateral) return;
    arrastouAgora = Date.now();
    const lado = dx || -1;
    const passou = Math.abs(dx) > Math.min(60, w * 0.2);
    posicionar(passou ? (lado < 0 ? -w : w) : 0, w, true, lado);
    setTimeout(() => {
      const atual = slides[current];
      const viz = slides[vizinho(lado)];
      if (passou) goTo(vizinho(lado));
      limpar(atual); limpar(viz);
      startAutoplay();
    }, 260);
  };
  root.addEventListener('touchend', soltar);
  root.addEventListener('touchcancel', soltar);
  // Depois de arrastar, o toque não abre o link do banner.
  root.addEventListener('click', e => { if (Date.now() - arrastouAgora < 500) e.preventDefault(); }, true);

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

  // Leads ativos: todo anfitrião para quem a empresa mandou proposta em
  // Oportunidades (propostas_pedido, migration 074), contado uma vez só.
  const { data: propostas, error: erroPropostas } = session
    ? await supabaseClient.from('propostas_pedido').select('pedido_id, pedido:pedidos_orcamento(cliente_id)').eq('fornecedor_id', empresaId(session))
    : { data: [] };
  const pessoas = new Set((erroPropostas ? [] : (propostas || [])).map(p => (p.pedido && p.pedido.cliente_id) || p.pedido_id));
  setText('analytics-leads', pessoas.size.toLocaleString('pt-BR'));

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
        <button type="button" class="mini-cal-nav-btn" data-range-prev aria-label="Mês anterior"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75"><path stroke-linecap="round" stroke-linejoin="round" d="m15 19-7-7 7-7" /></svg></button>
        <span class="mini-cal-month-label">${mes} de ${year}</span>
        <button type="button" class="mini-cal-nav-btn" data-range-next aria-label="Próximo mês"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75"><path stroke-linecap="round" stroke-linejoin="round" d="m9 5 7 7-7 7" /></svg></button>
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

/* Fundo do topo da Home: a imagem de capa da empresa (Configurações ›
   Imagem de capa, fornecedores.logo_url). Sem capa, fica o azul em degradê. */
function aplicarCapaDaEmpresa() {
  const capa = String((B2B_DATA.professional && B2B_DATA.professional.logo) || '').trim();
  const ok = /^(https?:|data:image\/|blob:)/.test(capa);
  document.body.classList.toggle('tem-capa-empresa', ok);
  if (ok) document.body.style.setProperty('--capa-empresa', `url("${capa.replace(/["\\]/g, encodeURIComponent)}")`);
  else document.body.style.removeProperty('--capa-empresa');
}

function renderGreeting() {
  aplicarCapaDaEmpresa();
  const now = new Date();
  const dateStr = new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' }).format(now);
  setText('greeting-date', capitalize(dateStr));
  setText('greeting-date-side', capitalize(dateStr));

  const titleEl = document.getElementById('greeting-title');
  if (titleEl) {
    const verifiedBadge = B2B_DATA.professional.selfieVerified
      ? ` <span class="verified-badge" title="Conta verificada"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 0 1-1.043 3.296 3.745 3.745 0 0 1-3.296 1.043A3.745 3.745 0 0 1 12 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 0 1-3.296-1.043 3.745 3.745 0 0 1-1.043-3.296A3.745 3.745 0 0 1 3 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 0 1 1.043-3.296 3.745 3.745 0 0 1 3.296-1.043A3.746 3.746 0 0 1 12 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 0 1 3.296 1.043 3.746 3.746 0 0 1 1.043 3.296A3.745 3.745 0 0 1 21 12Z" /></svg></span>`
      : '';
    // "Olá, Master Drinks LTDA" — razão social (nome do CNPJ); sem ela, o nome fantasia.
    const empresa = String(B2B_DATA.professional.razaoSocial || B2B_DATA.professional.company || '').trim();
    titleEl.innerHTML = `Olá${empresa ? ', ' + escapeHtml(empresa) : ''}!${verifiedBadge}`;
    fitGreetingTitleToOneLine();
    sizeMobileAvatarToGreetingText();
  }
}

/* -------------------- Caixa do saldo (Home) --------------------
   Abas Saldo / Faturamento em 30 dias no topo e o olho que esconde os
   valores (a mesma escolha de "Esconder valores" do Financeiro). */
const saldoCelular = { saldo: null, faturamento: null };
const ICONE_OLHO_ABERTO = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z"/><circle cx="12" cy="12" r="3"/></svg>';
const ICONE_OLHO_FECHADO = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10.6 6.1A9.6 9.6 0 0 1 12 6c6 0 9.5 6 9.5 6a16 16 0 0 1-2.6 3.3M6.6 6.6A16 16 0 0 0 2.5 12s3.5 6 9.5 6a9 9 0 0 0 5.4-1.6"/><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/><path d="m3 3 18 18"/></svg>';
function saldoEscondido() {
  try { return localStorage.getItem('b2b-fin-esconder') === '1'; } catch (e) { return false; }
}
function desenharSaldoCelular() {
  const esconder = saldoEscondido();
  const valor = v => (v == null ? '—' : esconder ? 'R$ ••••' : formatCurrency(v));
  setText('dash-saldo-celular-saldo', valor(saldoCelular.saldo));
  setText('dash-saldo-celular-faturamento', valor(saldoCelular.faturamento));
  const olho = document.getElementById('dash-saldo-celular-olho');
  if (olho) {
    olho.innerHTML = esconder ? ICONE_OLHO_FECHADO : ICONE_OLHO_ABERTO;
    const dica = esconder ? 'Mostrar valores' : 'Esconder valores';
    olho.setAttribute('aria-label', dica);
    olho.dataset.dica = dica;
  }
}
function ligarSaldoCelular() {
  const caixa = document.querySelector('.dash-saldo-celular');
  if (!caixa || caixa.dataset.ligada) return;
  caixa.dataset.ligada = '1';
  caixa.querySelectorAll('[data-saldo-aba]').forEach(aba => aba.addEventListener('click', () => {
    caixa.querySelectorAll('[data-saldo-aba]').forEach(a => {
      const ativa = a === aba;
      a.classList.toggle('active', ativa);
      a.setAttribute('aria-selected', ativa ? 'true' : 'false');
    });
    caixa.querySelectorAll('[data-saldo-painel]').forEach(p => { p.hidden = p.dataset.saldoPainel !== aba.dataset.saldoAba; });
  }));
  document.getElementById('dash-saldo-celular-olho')?.addEventListener('click', () => {
    try { localStorage.setItem('b2b-fin-esconder', saldoEscondido() ? '0' : '1'); } catch (e) { /* sem armazenamento */ }
    desenharSaldoCelular();
  });
  desenharSaldoCelular();
}

/* -------------------- Saldo total --------------------
   Valor grande do saldo (créditos − débitos da carteira) e, embaixo, o
   gráfico do faturamento de cada dia nos últimos 30 dias. Passando o mouse
   (ou o dedo), o ponto do dia aparece no topo da linha com a data e quanto
   foi faturado. Sem nenhuma movimentação, mostra uma linha cinza de exemplo,
   sem valores. */
async function renderSaldoTotal() {
  const valorEl = document.getElementById('dash-saldo-total-valor');
  const grafico = document.getElementById('dash-saldo-total-grafico');
  ligarSaldoCelular();
  if (!valorEl || !grafico) return;
  const session = window.b2bSession || (await supabaseClient.auth.getSession()).data.session;
  let transacoes = [];
  if (session) {
    const { data } = await supabaseClient.from('wallet_transactions').select('type, amount, created_at').eq('fornecedor_id', empresaId(session));
    transacoes = data || [];
  }
  const sinal = t => (t.type === 'credit' ? 1 : -1) * Number(t.amount || 0);
  valorEl.textContent = formatCurrency(transacoes.reduce((soma, t) => soma + sinal(t), 0));
  saldoCelular.saldo = transacoes.reduce((soma, t) => soma + sinal(t), 0);

  // Faturamento (créditos) de cada um dos últimos 30 dias.
  const DIA = 24 * 60 * 60 * 1000;
  const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
  const dias = [];
  for (let i = 29; i >= 0; i--) {
    const inicio = new Date(hoje.getTime() - i * DIA);
    const fim = inicio.getTime() + DIA;
    const valor = transacoes
      .filter(t => t.type === 'credit')
      .filter(t => { const x = new Date(t.created_at).getTime(); return x >= inicio.getTime() && x < fim; })
      .reduce((soma, t) => soma + Number(t.amount || 0), 0);
    dias.push({ data: inicio, valor });
  }
  const temFaturamento = dias.some(d => d.valor > 0);
  saldoCelular.faturamento = dias.reduce((soma, d) => soma + d.valor, 0);
  desenharSaldoCelular();

  let pontos;
  if (!temFaturamento) {
    pontos = [0.38, 0.45, 0.42, 0.5, 0.48, 0.57, 0.54, 0.51, 0.6, 0.57, 0.64, 0.62, 0.6, 0.67, 0.65, 0.71, 0.68, 0.67, 0.73, 0.7, 0.76, 0.75, 0.73, 0.78];
  } else {
    const max = Math.max(...dias.map(d => d.valor)) || 1;
    pontos = dias.map(d => 0.04 + 0.8 * (d.valor / max));
  }
  const L = 600, A = 180;
  const xy = pontos.map((p, i) => [(i / (pontos.length - 1)) * L, A - p * A]);
  const linha = xy.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
  grafico.innerHTML = `
    <svg viewBox="0 0 ${L} ${A}" preserveAspectRatio="none">
      <defs><linearGradient id="dash-saldo-grad" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#EBEBEC"/><stop offset="1" stop-color="#FAFAFA"/></linearGradient></defs>
      <path d="${linha} L${L},${A} L0,${A} Z" fill="url(#dash-saldo-grad)"/>
      <path d="${linha}" fill="none" stroke="#D4D4D8" stroke-width="1.75" vector-effect="non-scaling-stroke" stroke-linejoin="round"/>
      <line x1="0" y1="${A - 0.5}" x2="${L}" y2="${A - 0.5}" stroke="#D4D4D8" stroke-width="1" stroke-dasharray="2 4" vector-effect="non-scaling-stroke"/>
    </svg>
    <span class="dash-saldo-ponto" hidden></span>
    <div class="dash-saldo-dica" hidden></div>`;
  if (!temFaturamento) return;

  const ponto = grafico.querySelector('.dash-saldo-ponto');
  const dica = grafico.querySelector('.dash-saldo-dica');
  const formatarDia = d => d.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' }).replace('.', '');
  const mostrar = (clientX) => {
    const caixa = grafico.getBoundingClientRect();
    const fracao = Math.min(1, Math.max(0, (clientX - caixa.left) / caixa.width));
    const i = Math.round(fracao * (dias.length - 1));
    const x = (i / (dias.length - 1)) * 100;
    const y = (1 - pontos[i]) * 100;
    ponto.style.left = `${x}%`; ponto.style.top = `${y}%`; ponto.hidden = false;
    dica.innerHTML = `<span class="dash-saldo-dica-dia">${formatarDia(dias[i].data)}</span><strong>${formatCurrency(dias[i].valor)}</strong>`;
    dica.style.top = `${y}%`;
    dica.hidden = false;
    // Perto das bordas a dica não sai da caixa.
    const largura = dica.offsetWidth;
    const px = (x / 100) * caixa.width;
    dica.style.left = `${Math.min(caixa.width - largura / 2, Math.max(largura / 2, px))}px`;
  };
  const esconder = () => { ponto.hidden = true; dica.hidden = true; };
  grafico.addEventListener('pointermove', e => mostrar(e.clientX));
  grafico.addEventListener('pointerdown', e => mostrar(e.clientX));
  grafico.addEventListener('pointerleave', esconder);
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
        .select('id, titulo, link_url, ordem')
        .eq('tipo', 'workshop')
        .eq('ativo', true)
        .order('ordem', { ascending: true })
        .limit(3)
    ]);

    const noticias = (blog.data || []).map(a => ({ title: a.titulo, url: a.slug ? `https://love.com.br/blog/${a.slug}` : 'https://blog.love.com.br' }));
    const eventos = (workshops.data || []).map(i => ({ title: i.titulo, url: `workshops?aula=${i.id}` }));
    const lista = [...noticias, ...eventos].slice(0, 6);
    if (lista.length) desenhar(lista);
  } catch (e) { /* mantém a lista fixa */ }
}

/* Carrossel da direita com a mesma altura do bloco da esquerda (Saldo +
   atalhos): assim "Analytics" começa na mesma linha de "Sua agenda". Só
   com as duas colunas lado a lado. */
function alinharCarrosselComSaldo() {
  const card = document.querySelector('.dash-ads-card');
  const saldo = document.querySelector('.dash-saldo-total');
  const atalhos = document.querySelector('.dashboard-quick-actions');
  if (!card || !saldo || !atalhos) return;
  const ladoALado = window.matchMedia('(min-width: 1024px)').matches
    // Na Home do desktop os atalhos sobem para a caixa do "Olá": o saldo
    // fica baixo e o banner achataria. Aí ele fica no tamanho próprio (16:9).
    && !atalhos.closest('.dash-home-caixa');
  if (!ladoALado) { card.style.height = ''; card.classList.remove('altura-alinhada'); return; }
  // Altura = do topo do carrossel até onde começa "Sua agenda", menos o
  // espaço entre os blocos: assim "Analytics" começa na mesma linha.
  const agenda = saldo.closest('.dashboard-side-stack')?.querySelector('.dashboard-panel-section');
  const gap = parseFloat(getComputedStyle(card.parentElement).rowGap) || 24;
  card.style.height = '';
  const altura = agenda
    ? agenda.getBoundingClientRect().top - card.getBoundingClientRect().top - gap
    : atalhos.getBoundingClientRect().bottom - saldo.getBoundingClientRect().top;
  if (altura > 0) {
    card.style.height = `${Math.round(altura)}px`;
    card.classList.add('altura-alinhada');
  }
}
window.addEventListener('resize', alinharCarrosselComSaldo);
window.addEventListener('load', alinharCarrosselComSaldo);
document.addEventListener('DOMContentLoaded', () => {
  alinharCarrosselComSaldo();
  const saldo = document.querySelector('.dash-saldo-total');
  if (saldo && 'ResizeObserver' in window) new ResizeObserver(alinharCarrosselComSaldo).observe(saldo);
});

/* Celular: no Dashboard o cabeçalho rola junto com a página (sem ficar
   preso no topo). Ele entra no começo da área que rola e volta para o
   lugar no computador. */
(function cabecalhoRolaNoCelular() {
  const topo = document.getElementById('shell-topbar');
  const conteudo = document.querySelector('.b2b-content');
  if (!topo || !conteudo || typeof MQ_CELULAR_HUB === 'undefined') return;
  const casa = { pai: topo.parentElement, depois: topo.nextSibling };
  const ajustar = () => {
    if (hubNoCelular()) {
      if (topo.parentElement !== conteudo) conteudo.insertBefore(topo, conteudo.firstChild);
      topo.classList.add('topo-rola-junto');
    } else if (topo.parentElement === conteudo) {
      topo.classList.remove('topo-rola-junto');
      casa.pai.insertBefore(topo, casa.depois && casa.depois.parentNode === casa.pai ? casa.depois : null);
    }
  };
  ajustar();
  document.addEventListener('DOMContentLoaded', ajustar);
  window.addEventListener('load', ajustar);
  window.addEventListener('resize', ajustar);
  window.matchMedia?.(MQ_CELULAR_HUB).addEventListener?.('change', ajustar);
})();

/* Desktop: Home como a do anfitrião (b5e1d5f0). Faixa azul (o azul do
   sidebar em degradê, como no Admin) no lugar da foto e, por cima dela, a
   caixa com "Olá, empresa!" + data à esquerda e os atalhos redondos à
   direita. No celular tudo volta para o lugar (lá a caixa é montada por CSS). */
(function homeDoDesktop() {
  const ola = document.querySelector('.dashboard-greeting');
  const texto = ola && ola.querySelector('.dashboard-greeting-text');
  const atalhos = document.querySelector('.dashboard-quick-actions');
  if (!ola || !texto || !atalhos || typeof MQ_CELULAR_HUB === 'undefined') return;
  const casaTexto = { pai: texto.parentElement, depois: texto.nextSibling };
  const casaAtalhos = { pai: atalhos.parentElement, depois: atalhos.nextSibling };
  const faixa = document.createElement('div');
  faixa.className = 'dash-home-faixa';
  faixa.setAttribute('aria-hidden', 'true');
  const caixa = document.createElement('div');
  caixa.className = 'dash-home-caixa';
  const devolver = (el, casa) => casa.pai.insertBefore(el, casa.depois && casa.depois.parentNode === casa.pai ? casa.depois : null);
  const ajustar = () => {
    if (!hubNoCelular()) {
      if (caixa.parentElement === ola) return;
      ola.prepend(faixa);
      faixa.after(caixa);
      caixa.append(texto, atalhos);
      ola.classList.add('home-desktop');
    } else {
      if (caixa.parentElement === ola) {
        ola.classList.remove('home-desktop');
        devolver(texto, casaTexto);
        devolver(atalhos, casaAtalhos);
        caixa.remove();
      }
      // Celular: a faixa fica no topo da área que rola, atrás do cabeçalho e do Olá.
      const conteudo = document.querySelector('.b2b-content');
      if (conteudo && faixa.parentElement !== conteudo) conteudo.prepend(faixa);
    }
  };
  ajustar();
  document.addEventListener('DOMContentLoaded', ajustar);
  window.addEventListener('load', ajustar);
  window.addEventListener('resize', ajustar);
  window.matchMedia?.(MQ_CELULAR_HUB).addEventListener?.('change', ajustar);
})();
