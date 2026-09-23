/* ==========================================================================
   LOVE B2B — Pagamentos (Financeiro + Receber)
   ========================================================================== */

const PAYMENT_LINKS_STORAGE_KEY = 'b2b-payment-links';

document.addEventListener('DOMContentLoaded', () => {
  initPaymentsViewTabs();
  renderFinanceStats();
  renderContratosAbertos();
  renderPaymentLinksList();
  initPaymentLinkModal();
  initWithdrawalModal();
});

/* -------------------- Abas: Financeiro / Receber -------------------- */

function initPaymentsViewTabs() {
  const wrap = document.getElementById('payments-view-tabs');
  if (!wrap) return;

  wrap.querySelectorAll('[data-view]').forEach(btn => {
    btn.addEventListener('click', () => {
      wrap.querySelectorAll('[data-view]').forEach(b => b.classList.toggle('active', b === btn));
      document.querySelectorAll('[data-view-panel]').forEach(panel => {
        panel.style.display = panel.dataset.viewPanel === btn.dataset.view ? '' : 'none';
      });
      if (btn.dataset.view === 'financeiro') renderFinanceStats();
    });
  });

  const requestedTab = new URLSearchParams(location.search).get('tab');
  const requestedBtn = requestedTab && wrap.querySelector(`[data-view="${requestedTab}"]`);
  if (requestedBtn) requestedBtn.click();
}

/* -------------------- Links de pagamento (armazenamento) -------------------- */

function loadPaymentLinks() {
  try {
    const raw = localStorage.getItem(PAYMENT_LINKS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

function savePaymentLinks(links) {
  localStorage.setItem(PAYMENT_LINKS_STORAGE_KEY, JSON.stringify(links));
}

function computeSaldoAReceber(links) {
  return links.filter(l => l.status === 'pago').reduce((sum, l) => sum + l.amount, 0);
}

function buildPaymentLinkUrl(id) {
  return new URL(`site-preview.html?page=checkout&link=${id}`, location.href).toString();
}

function formatLinkDate(timestamp) {
  return new Date(timestamp).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' });
}

/* -------------------- Aba Financeiro -------------------- */

function renderFinanceStats() {
  const grid = document.getElementById('finance-stat-grid');
  if (!grid) return;
  const fin = B2B_DATA.financeiro || {};
  const links = loadPaymentLinks();
  const saldoAReceber = computeSaldoAReceber(links);

  grid.innerHTML = `
    <div class="dash-card finance-stat-card">
      <p class="finance-stat-label">Saque disponível</p>
      <p class="finance-stat-value">${formatCurrency(fin.saqueDisponivel || 0)}</p>
      <button type="button" class="btn-secondary finance-stat-action-btn" id="request-withdrawal-btn"><img src="../assets/pix-icone.png" alt="" class="pix-inline-icon">Sacar Pix</button>
    </div>
    <div class="dash-card finance-stat-card">
      <p class="finance-stat-label">Saldo a receber</p>
      <p class="finance-stat-value">${formatCurrency(saldoAReceber)}</p>
    </div>
    <div class="dash-card finance-stat-card">
      <p class="finance-stat-label">Faturamento este mês</p>
      <p class="finance-stat-value">${formatCurrency(fin.faturamentoEsteMes || 0)}</p>
      <p class="finance-stat-sub">Mês passado: ${formatCurrency(fin.faturamentoMesPassado || 0)}</p>
    </div>
    <div class="dash-card finance-stat-card">
      <p class="finance-stat-label">Valor em aberto</p>
      <p class="finance-stat-value">${formatCurrency(fin.valorEmAberto || 0)}</p>
    </div>
  `;

  const withdrawBtn = document.getElementById('request-withdrawal-btn');
  if (withdrawBtn) withdrawBtn.addEventListener('click', openWithdrawalModal);
}

/* -------------------- Modal: sacar Pix -------------------- */

let withdrawalKeyInfo = null;

function isFirstWithdrawalSetup() {
  return !B2B_DATA.professional.pixKey;
}

function goToWithdrawalStep(step) {
  document.querySelectorAll('[data-withdrawal-step]').forEach(panel => {
    panel.hidden = panel.dataset.withdrawalStep !== step;
  });
  const titles = {
    key: isFirstWithdrawalSetup() ? 'Faça seu primeiro Pix' : 'Sacar Pix',
    bank: 'Insira os dados de quem vai receber seu Pix',
    confirm: 'Confira a conta',
    amount: 'Insira o valor'
  };
  setText('withdrawal-modal-title', titles[step] || 'Sacar Pix');

  const card = document.getElementById('withdrawal-modal-card');
  if (card) card.style.maxWidth = step === 'bank' ? '540px' : '420px';
}

function renderWithdrawalConfirmStep() {
  if (!withdrawalKeyInfo) return;
  setText('withdrawal-confirm-name', withdrawalKeyInfo.name || '—');
  setText('withdrawal-confirm-key', withdrawalKeyInfo.key || '—');
  setText('withdrawal-confirm-doc-label', withdrawalKeyInfo.docLabel || 'CPF');
  setText('withdrawal-confirm-doc', withdrawalKeyInfo.doc || '—');
  setText('withdrawal-confirm-bank', withdrawalKeyInfo.bank || '—');
}

function renderWithdrawalAmountStep() {
  if (!withdrawalKeyInfo) return;
  const fin = B2B_DATA.financeiro || {};
  setText('withdrawal-amount-avatar', initials(withdrawalKeyInfo.name || '—'));
  setText('withdrawal-amount-name', withdrawalKeyInfo.name || '—');
  setText('withdrawal-amount-key', `Chave Pix: ${withdrawalKeyInfo.key || '—'}`);
  setText('withdrawal-saldo-value', formatCurrency(fin.saqueDisponivel || 0));
  const amountInput = document.getElementById('withdrawal-amount');
  if (amountInput) amountInput.value = '';
}

function openWithdrawalModal() {
  const modal = document.getElementById('withdrawal-modal');
  if (!modal) return;

  document.getElementById('withdrawal-pix-key-input').value = '';
  ['withdrawal-bank-name', 'withdrawal-bank-agencia', 'withdrawal-bank-conta', 'withdrawal-bank-fullname', 'withdrawal-bank-doc']
    .forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });

  if (isFirstWithdrawalSetup()) {
    withdrawalKeyInfo = null;
    goToWithdrawalStep('key');
  } else {
    const p = B2B_DATA.professional;
    withdrawalKeyInfo = {
      key: p.pixKey,
      name: p.name,
      doc: p.documentNumber,
      docLabel: p.documentType === 'cpf' ? 'CPF' : 'CNPJ',
      bank: '—'
    };
    renderWithdrawalAmountStep();
    goToWithdrawalStep('amount');
  }

  modal.classList.add('show');
}

function initWithdrawalModal() {
  const modal = document.getElementById('withdrawal-modal');
  if (!modal) return;

  const closeBtn = document.getElementById('withdrawal-modal-close');
  const close = () => modal.classList.remove('show');
  closeBtn.addEventListener('click', close);
  modal.addEventListener('click', (e) => { if (e.target === modal) close(); });

  /* Etapa 1: chave Pix */
  const keyInput = document.getElementById('withdrawal-pix-key-input');

  document.getElementById('withdrawal-use-bank-btn').addEventListener('click', () => {
    goToWithdrawalStep('bank');
  });

  document.getElementById('withdrawal-key-continue-btn').addEventListener('click', () => {
    const key = keyInput.value.trim();
    if (!key) {
      showToast('Insira sua chave Pix para continuar.', true);
      return;
    }
    const p = B2B_DATA.professional;
    withdrawalKeyInfo = {
      key,
      name: p.name,
      doc: p.documentNumber,
      docLabel: p.documentType === 'cpf' ? 'CPF' : 'CNPJ',
      bank: '—'
    };
    renderWithdrawalConfirmStep();
    goToWithdrawalStep('confirm');
  });

  /* Etapa 2: agência e conta */
  const bankName = document.getElementById('withdrawal-bank-name');
  const bankAgencia = document.getElementById('withdrawal-bank-agencia');
  const bankConta = document.getElementById('withdrawal-bank-conta');
  const bankFullname = document.getElementById('withdrawal-bank-fullname');
  const bankDocType = document.getElementById('withdrawal-bank-doc-type');
  const bankDoc = document.getElementById('withdrawal-bank-doc');

  document.getElementById('withdrawal-bank-continue-btn').addEventListener('click', () => {
    if (!bankName.value.trim() || !bankAgencia.value.trim() || !bankConta.value.trim() || !bankFullname.value.trim() || !bankDoc.value.trim()) {
      showToast('Preencha todos os dados bancários para continuar.', true);
      return;
    }
    withdrawalKeyInfo = {
      key: `Agência ${bankAgencia.value.trim()} • Conta ${bankConta.value.trim()}`,
      name: bankFullname.value.trim(),
      doc: bankDoc.value.trim(),
      docLabel: bankDocType.value === 'cnpj' ? 'CNPJ' : 'CPF',
      bank: bankName.value.trim()
    };
    renderWithdrawalConfirmStep();
    goToWithdrawalStep('confirm');
  });

  /* Etapa 3: confirmar conta */
  document.getElementById('withdrawal-confirm-change-btn').addEventListener('click', () => {
    goToWithdrawalStep('key');
  });

  document.getElementById('withdrawal-confirm-continue-btn').addEventListener('click', () => {
    if (!withdrawalKeyInfo) return;
    const p = B2B_DATA.professional;
    p.pixKeyType = 'aleatoria';
    p.pixKey = withdrawalKeyInfo.key;
    localStorage.setItem('b2b-professional-profile', JSON.stringify(p));
    renderWithdrawalAmountStep();
    goToWithdrawalStep('amount');
  });

  /* Etapa 4: valor do saque */
  const amountInput = document.getElementById('withdrawal-amount');
  wireCurrencyMaskInput(amountInput);

  document.getElementById('withdrawal-amount-message-btn').addEventListener('click', () => {
    showToast('Em breve você poderá adicionar uma mensagem ao Pix.');
  });

  document.getElementById('withdrawal-amount-submit-btn').addEventListener('click', () => {
    const amount = currencyMaskValue(amountInput);
    const fin = B2B_DATA.financeiro || {};

    if (!amount || amount <= 0) {
      showToast('Informe a quantia que deseja sacar.', true);
      return;
    }
    if (amount > (fin.saqueDisponivel || 0)) {
      showToast('A quantia é maior que o saldo disponível para saque.', true);
      return;
    }

    close();
    showToast('Solicitação de saque enviada. O valor cai na sua conta em até 1 dia útil.');
  });
}

function formatShortDate(iso) {
  return new Date(iso + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' });
}

const CONTRATO_STATUS_INFO = {
  quitado: { label: 'Finalizado', color: 'status-neutral-dark' },
  em_dia: { label: 'Em dia', color: 'status-inativo' },
  atrasado: { label: 'Atrasado', color: 'status-recusado' }
};

function renderContratosAbertos() {
  const body = document.getElementById('finance-contratos-body');
  if (!body) return;
  const rows = B2B_DATA.contratosAbertos || [];
  body.innerHTML = rows.length
    ? rows.map(row => {
      const info = CONTRATO_STATUS_INFO[row.status] || CONTRATO_STATUS_INFO.em_dia;
      const pct = row.valorTotal ? Math.min(100, Math.round((row.valorPago / row.valorTotal) * 100)) : 0;
      return `
      <tr>
        <td>${escapeHtml(row.client)}</td>
        <td>${formatCurrency(row.valorTotal)}</td>
        <td>
          ${formatCurrency(row.valorPago)} de ${formatCurrency(row.valorTotal)}
          <div class="payment-progress"><div class="payment-progress-fill" style="width:${pct}%"></div></div>
        </td>
        <td>${row.parcelasPagas}/${row.parcelasTotal}</td>
        <td>${row.proximaParcela ? formatShortDate(row.proximaParcela) : '—'}</td>
        <td><span class="status-text ${info.color}">${info.label}</span></td>
      </tr>
    `;
    }).join('')
    : `<tr><td colspan="6" class="text-center text-sm text-zinc-500" style="padding:1.5rem 0;">Nenhum contrato em aberto no momento.</td></tr>`;
}

/* -------------------- Aba Receber -------------------- */

function renderPaymentLinksList() {
  const body = document.getElementById('payment-links-body');
  const empty = document.getElementById('payment-links-empty');
  if (!body) return;
  const links = loadPaymentLinks().slice().sort((a, b) => b.createdAt - a.createdAt);

  if (!links.length) {
    body.innerHTML = '';
    if (empty) empty.style.display = '';
    return;
  }
  if (empty) empty.style.display = 'none';

  body.innerHTML = links.map(link => `
    <tr>
      <td>${formatLinkDate(link.createdAt)}</td>
      <td>${formatCurrency(link.amount)}</td>
      <td>${link.installments}x${link.installments === 1 ? ' (à vista)' : ''}</td>
      <td><span class="status-badge status-badge-plain ${link.status === 'pago' ? 'status-ativo' : 'status-enviado'}">${link.status === 'pago' ? 'Pago' : 'Aguardando pagamento'}</span></td>
      <td>
        ${link.status === 'pago'
          ? `<span class="payment-link-row-paid">Link pago</span>`
          : `<button type="button" class="payment-link-row-copy" data-copy-link="${link.id}">Copiar link</button>`}
      </td>
    </tr>
  `).join('');

  body.querySelectorAll('[data-copy-link]').forEach(btn => {
    btn.addEventListener('click', () => {
      const url = buildPaymentLinkUrl(btn.dataset.copyLink);
      copyTextToClipboard(url);
      showToast('Link copiado!');
    });
  });
}

function copyTextToClipboard(text) {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).catch(() => fallbackCopyText(text));
  } else {
    fallbackCopyText(text);
  }
}

function fallbackCopyText(text) {
  const el = document.createElement('textarea');
  el.value = text;
  el.style.position = 'fixed';
  el.style.opacity = '0';
  document.body.appendChild(el);
  el.select();
  try { document.execCommand('copy'); } catch (e) { /* ignora */ }
  document.body.removeChild(el);
}

/* -------------------- Modal: gerar link de pagamento -------------------- */

const PAYMENT_LINK_SUBMIT_BTN_HTML = '<button type="submit" class="btn-primary justify-center w-full py-3 mt-2" id="payment-link-submit-btn">Criar link de pagamento</button>';

function initPaymentLinkModal() {
  const modal = document.getElementById('payment-link-modal');
  const openBtn = document.getElementById('generate-payment-link-btn');
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
    actionRow.innerHTML = PAYMENT_LINK_SUBMIT_BTN_HTML;
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

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const amount = currencyMaskValue(amountInput);
    if (amount <= 0) return;

    const paymentMethods = {
      boleto: form.querySelector('[data-payment-method="boleto"]').checked,
      pix: form.querySelector('[data-payment-method="pix"]').checked,
      cartao: form.querySelector('[data-payment-method="cartao"]').checked
    };
    const installments = Number(installmentsSelect.value) || 1;

    const links = loadPaymentLinks();
    const id = 'pl' + Date.now().toString(36);
    links.push({
      id,
      amount,
      installments,
      passFeeToClient,
      paymentMethods,
      status: 'pendente',
      createdAt: Date.now(),
      paidAt: null
    });
    savePaymentLinks(links);
    renderPaymentLinksList();

    const url = buildPaymentLinkUrl(id);
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
      copyTextToClipboard(url);
      showToast('Link copiado!');
    });
  });
}
