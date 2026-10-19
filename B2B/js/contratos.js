/* ==========================================================================
   LOVE B2B — Pagamentos (Financeiro + Receber), dados reais via Supabase
   ========================================================================== */

let bPaymentLinks = [];
let bContracts = [];
let financeContratosEstado = null;
let paymentLinksEstado = null;
let bWalletTransactions = [];

document.addEventListener('DOMContentLoaded', async () => {
  await window.b2bAuthReady;
  await loadContratosData();
  initPaymentsViewTabs();
  renderFinanceStats();
  // Barras das tabelas (busca, Filtrar por, Exportar) — padrão do Admin.
  financeContratosEstado = montarBarraTabela(document.getElementById('finance-contratos-card'), {
    placeholder: 'Buscar cliente...',
    filtros: [{ chave: 'status', rotulo: 'Quitação', opcoes: () => Object.entries(CONTRATO_STATUS_INFO).map(([k, v]) => [k, v.label]) }],
    exportar: () => tabelaExportarCSV('gestao-de-pagamentos', [
      { titulo: 'Cliente', valor: r => r.client_name },
      { titulo: 'Valor total', valor: r => r.valor_total },
      { titulo: 'Pago', valor: r => r.valor_pago },
      { titulo: 'Parcelas', valor: r => `${r.parcelas_pagas}/${r.parcelas_total}` },
      { titulo: 'Próxima parcela', valor: r => r.proxima_parcela || '' },
      { titulo: 'Quitação', valor: r => (CONTRATO_STATUS_INFO[r.status] || CONTRATO_STATUS_INFO.em_dia).label }
    ], contratosAbertosFiltrados()),
    aoMudar: () => renderContratosAbertos()
  });
  paymentLinksEstado = montarBarraTabela(document.getElementById('payment-links-card'), {
    placeholder: 'Buscar por valor ou data...',
    filtros: [{ chave: 'situacao', rotulo: 'Situação', opcoes: () => [['pago', 'Pago'], ['pendente', 'Aguardando pagamento']] }],
    exportar: () => tabelaExportarCSV('links-de-cobranca', [
      { titulo: 'Criado em', valor: l => formatLinkDate(l.created_at) },
      { titulo: 'Valor', valor: l => l.amount },
      { titulo: 'Parcelas', valor: l => l.installments },
      { titulo: 'Situação', valor: l => (l.status === 'pago' ? 'Pago' : 'Aguardando pagamento') },
      { titulo: 'Link', valor: l => buildPaymentLinkUrl(l.id) }
    ], paymentLinksFiltrados()),
    aoMudar: () => renderPaymentLinksList()
  });
  renderContratosAbertos();
  renderPaymentLinksList();
  initPaymentLinkModal();
  initWithdrawalModal();
  initChargeDrawer();
  window.b2bPageReady?.();
});

async function loadContratosData() {
  const { data: { session } } = await supabaseClient.auth.getSession();
  if (!session) return;

  const [linksRes, contractsRes, txRes] = await Promise.all([
    supabaseClient.from('payment_links').select('*').eq('fornecedor_id', empresaId(session)).order('created_at', { ascending: false }),
    supabaseClient.from('contracts').select('*, contract_guests(*)').eq('fornecedor_id', empresaId(session)).order('created_at', { ascending: false }),
    supabaseClient.from('wallet_transactions').select('*').eq('fornecedor_id', empresaId(session)).order('created_at', { ascending: false })
  ]);

  bPaymentLinks = linksRes.data || [];
  bContracts = contractsRes.data || [];
  bWalletTransactions = txRes.data || [];
}

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

/* -------------------- Carteira: cálculos a partir das transações reais -------------------- */

function computeSaldoDisponivel() {
  return bWalletTransactions.reduce((sum, t) => sum + (t.type === 'credit' ? Number(t.amount) : -Number(t.amount)), 0);
}

function computeSaldoAReceber() {
  return bPaymentLinks.filter(l => l.status === 'pago').reduce((sum, l) => sum + Number(l.amount), 0);
}

function computeValorEmAberto() {
  return bPaymentLinks.filter(l => l.status === 'pendente').reduce((sum, l) => sum + Number(l.amount), 0);
}

function computeFaturamentoDoMes(monthsAgo) {
  const now = new Date();
  const targetMonth = now.getMonth() - monthsAgo;
  const targetYear = now.getFullYear() + Math.floor(targetMonth / 12);
  const normalizedMonth = ((targetMonth % 12) + 12) % 12;

  return bWalletTransactions
    .filter(t => t.type === 'credit')
    .filter(t => {
      const d = new Date(t.created_at);
      return d.getMonth() === normalizedMonth && d.getFullYear() === targetYear;
    })
    .reduce((sum, t) => sum + Number(t.amount), 0);
}

function buildPaymentLinkUrl(id) {
  return new URL(`site-preview?page=checkout&link=${id}`, location.href).toString();
}

function formatLinkDate(iso) {
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' });
}

// `vencimento` é uma coluna `date` (sem horário) — formatar com `new Date()`
// direto interpretaria como UTC e, em fusos atrás de UTC, mostraria um dia
// a menos. Monta a data local a partir dos componentes para evitar isso.
function formatDateOnly(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' });
}

/* -------------------- Aba Financeiro -------------------- */

function renderFinanceStats() {
  const grid = document.getElementById('finance-stat-grid');
  if (!grid) return;

  const saqueDisponivel = computeSaldoDisponivel();
  const saldoAReceber = computeSaldoAReceber();
  const faturamentoEsteMes = computeFaturamentoDoMes(0);
  const faturamentoMesPassado = computeFaturamentoDoMes(1);
  const valorEmAberto = computeValorEmAberto();

  grid.innerHTML = `
    <div class="dash-card finance-stat-card">
      <p class="finance-stat-label">Saque disponível</p>
      <p class="finance-stat-value">${formatCurrency(saqueDisponivel)}</p>
      <button type="button" class="btn-secondary finance-stat-action-btn" id="request-withdrawal-btn"><img src="assets/pix-icone.png" alt="" class="pix-inline-icon">Sacar Pix</button>
    </div>
    <div class="dash-card finance-stat-card">
      <p class="finance-stat-label">Saldo a receber</p>
      <p class="finance-stat-value">${formatCurrency(saldoAReceber)}</p>
    </div>
    <div class="dash-card finance-stat-card">
      <p class="finance-stat-label">Faturamento este mês</p>
      <p class="finance-stat-value">${formatCurrency(faturamentoEsteMes)}</p>
      <p class="finance-stat-sub">Mês passado: ${formatCurrency(faturamentoMesPassado)}</p>
    </div>
    <div class="dash-card finance-stat-card finance-acesso-card">
      <p class="finance-stat-label">Acesso rápido</p>
      <nav class="finance-acesso-lista">
        ${FINANCE_LISTAS.map(l => `
          <button type="button" class="finance-acesso-item${l.chave === financeListaAtual ? ' is-ativo' : ''}" data-finance-lista="${l.chave}">
            <span class="finance-acesso-icone">${l.icone}</span>
            <span class="finance-acesso-nome">${l.nome}</span>
            <svg class="finance-acesso-seta" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="m9 6 6 6-6 6"/></svg>
          </button>`).join('')}
      </nav>
    </div>
  `;
  grid.querySelectorAll('[data-finance-lista]').forEach(btn => {
    btn.addEventListener('click', () => mostrarListaFinanceira(btn.dataset.financeLista));
  });
  renderListaFinanceira();

  const withdrawBtn = document.getElementById('request-withdrawal-btn');
  if (withdrawBtn) withdrawBtn.addEventListener('click', openWithdrawalModal);
}

/* -------------------- Acesso rápido: Extrato / Saques / Notas fiscais --------------------
   No lugar do antigo "Valor em aberto". Clicar troca a lista de baixo (sem
   drawer): Extrato (recebimentos e saques, padrão), Saques (só as saídas)
   e Minhas notas fiscais (as emitidas). */
const FINANCE_LISTAS = [
  { chave: 'extrato', nome: 'Extrato', titulo: 'Extrato',
    icone: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M9 6h11M9 12h11M9 18h11"/><path d="M4.5 6h.01M4.5 12h.01M4.5 18h.01" stroke-width="2.6"/></svg>' },
  { chave: 'saques', nome: 'Saques', titulo: 'Saques',
    icone: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="6" width="18" height="12" rx="2"/><circle cx="12" cy="12" r="2.6"/><path d="M6.5 9.5v.01M17.5 14.5v.01" stroke-width="2.4"/></svg>' },
  { chave: 'notas', nome: 'Notas fiscais', titulo: 'Minhas notas fiscais',
    icone: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M7 3h7l5 5v12a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z"/><path d="M14 3v5h5"/><path d="M12 11v6M14 12.5c-.4-.6-1.1-.9-2-.9-1.1 0-1.9.6-1.9 1.4 0 1.9 4 .9 4 2.8 0 .8-.9 1.4-2.1 1.4-.9 0-1.7-.4-2-1"/></svg>' }
];
let financeListaAtual = 'extrato';
let bNotasFiscais = [];
let notasCarregadas = false;

const dataHoraCurta = iso => new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' });

function mostrarListaFinanceira(chave) {
  financeListaAtual = chave;
  document.querySelectorAll('[data-finance-lista]').forEach(b => b.classList.toggle('is-ativo', b.dataset.financeLista === chave));
  renderListaFinanceira();
}

async function carregarNotasFiscais() {
  if (notasCarregadas) return;
  const { data: { session } } = await supabaseClient.auth.getSession();
  if (!session) return;
  const { data } = await supabaseClient.from('notas_fiscais').select('*').eq('fornecedor_id', empresaId(session)).order('created_at', { ascending: false });
  bNotasFiscais = data || [];
  notasCarregadas = true;
}

async function renderListaFinanceira() {
  const head = document.getElementById('finance-lista-head');
  const body = document.getElementById('finance-lista-body');
  const vazia = document.getElementById('finance-lista-vazia');
  if (!head || !body) return;
  const lista = FINANCE_LISTAS.find(l => l.chave === financeListaAtual) || FINANCE_LISTAS[0];
  setText('finance-lista-titulo', lista.titulo);
  let colunas = [];
  let linhas = [];
  let textoVazio = '';
  if (lista.chave === 'extrato') {
    colunas = ['Data', 'Descrição', 'Tipo', 'Valor'];
    linhas = bWalletTransactions.map(t => {
      const entrada = t.type === 'credit';
      return `<tr><td>${dataHoraCurta(t.created_at)}</td><td>${escapeHtml(t.description || (entrada ? 'Recebimento' : 'Saque'))}</td><td>${entrada ? 'Entrada' : 'Saída'}</td><td class="finance-valor ${entrada ? 'is-entrada' : 'is-saida'}">${entrada ? '+' : '−'} ${formatCurrency(Number(t.amount))}</td></tr>`;
    });
    textoVazio = 'Nenhuma movimentação ainda.';
  } else if (lista.chave === 'saques') {
    colunas = ['Data', 'Descrição', 'Valor', 'Situação'];
    linhas = bWalletTransactions.filter(t => t.type === 'debit').map(t =>
      `<tr><td>${dataHoraCurta(t.created_at)}</td><td>${escapeHtml(t.description || 'Saque')}</td><td class="finance-valor">${formatCurrency(Number(t.amount))}</td><td>Concluído</td></tr>`);
    textoVazio = 'Você ainda não fez nenhum saque.';
  } else {
    await carregarNotasFiscais();
    if (financeListaAtual !== 'notas') return;
    colunas = ['Número', 'Cliente', 'Valor', 'Emitida em', 'Situação'];
    linhas = bNotasFiscais.map(n =>
      `<tr><td>${escapeHtml(n.number || '—')}</td><td>${escapeHtml(n.client || '—')}</td><td class="finance-valor">${formatCurrency(Number(n.value || 0))}</td><td>${dataHoraCurta(n.created_at)}</td><td>${n.status === 'emitida' ? 'Emitida' : escapeHtml(n.status || '—')}</td></tr>`);
    textoVazio = 'Nenhuma nota fiscal emitida ainda.';
  }
  head.innerHTML = `<tr>${colunas.map(c => `<th>${c}</th>`).join('')}</tr>`;
  body.innerHTML = linhas.join('');
  if (vazia) { vazia.textContent = textoVazio; vazia.style.display = linhas.length ? 'none' : ''; }
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
  setText('withdrawal-amount-avatar', initials(withdrawalKeyInfo.name || '—'));
  setText('withdrawal-amount-name', withdrawalKeyInfo.name || '—');
  setText('withdrawal-amount-key', `Chave Pix: ${withdrawalKeyInfo.key || '—'}`);
  setText('withdrawal-saldo-value', formatCurrency(computeSaldoDisponivel()));
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

  document.getElementById('withdrawal-confirm-continue-btn').addEventListener('click', async () => {
    if (!withdrawalKeyInfo) return;
    const p = B2B_DATA.professional;
    p.pixKeyType = 'aleatoria';
    p.pixKey = withdrawalKeyInfo.key;

    const { data: { session } } = await supabaseClient.auth.getSession();
    if (session) {
      await supabaseClient.from('fornecedores').update({ pix_key: p.pixKey, pix_key_type: p.pixKeyType }).eq('id', empresaId(session));
    }

    renderWithdrawalAmountStep();
    goToWithdrawalStep('amount');
  });

  /* Etapa 4: valor do saque */
  const amountInput = document.getElementById('withdrawal-amount');
  wireCurrencyMaskInput(amountInput);

  document.getElementById('withdrawal-amount-message-btn').addEventListener('click', () => {
    showToast('Em breve você poderá adicionar uma mensagem ao Pix.');
  });

  document.getElementById('withdrawal-amount-submit-btn').addEventListener('click', async () => {
    const amount = currencyMaskValue(amountInput);
    const saldoDisponivel = computeSaldoDisponivel();

    if (!amount || amount <= 0) {
      showToast('Informe a quantia que deseja sacar.', true);
      return;
    }
    if (amount > saldoDisponivel) {
      showToast('A quantia é maior que o saldo disponível para saque.', true);
      return;
    }

    const { data: { session } } = await supabaseClient.auth.getSession();
    if (!session) return;

    const { error } = await supabaseClient.from('wallet_transactions').insert({
      fornecedor_id: empresaId(session),
      type: 'debit',
      amount,
      description: 'Saque via Pix'
    });

    if (error) {
      showToast('Não foi possível processar o saque.', true);
      return;
    }

    await loadContratosData();
    renderFinanceStats();
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

function contratosAbertosFiltrados() {
  const est = financeContratosEstado || { busca: '', filtros: {} };
  return (bContracts || []).filter(r =>
    (!est.filtros.status || r.status === est.filtros.status) &&
    tabelaBateBusca(est, [r.client_name]));
}

function paymentLinksFiltrados() {
  const est = paymentLinksEstado || { busca: '', filtros: {} };
  return bPaymentLinks.filter(l =>
    (!est.filtros.situacao || (est.filtros.situacao === 'pago' ? l.status === 'pago' : l.status !== 'pago')) &&
    tabelaBateBusca(est, [formatLinkDate(l.created_at), formatCurrency(l.amount), l.amount]));
}

function renderContratosAbertos() {
  const body = document.getElementById('finance-contratos-body');
  if (!body) return;
  const rows = contratosAbertosFiltrados();
  body.innerHTML = rows.length
    ? rows.map(row => {
      const info = CONTRATO_STATUS_INFO[row.status] || CONTRATO_STATUS_INFO.em_dia;
      const pct = row.valor_total ? Math.min(100, Math.round((row.valor_pago / row.valor_total) * 100)) : 0;
      return `
      <tr>
        <td class="col-principal">${escapeHtml(row.client_name)}</td>
        <td>${formatCurrency(row.valor_total)}</td>
        <td>
          ${formatCurrency(row.valor_pago)} de ${formatCurrency(row.valor_total)}
          <div class="payment-progress"><div class="payment-progress-fill" style="width:${pct}%"></div></div>
        </td>
        <td>${row.parcelas_pagas}/${row.parcelas_total}</td>
        <td>${row.proxima_parcela ? formatShortDate(row.proxima_parcela) : '—'}</td>
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
  const links = paymentLinksFiltrados().sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  if (!links.length) {
    body.innerHTML = '';
    if (empty) empty.style.display = '';
    return;
  }
  if (empty) empty.style.display = 'none';

  body.innerHTML = links.map(link => `
    <tr class="payment-link-row">
      <td>${formatLinkDate(link.created_at)}</td>
      <td class="col-principal">${formatCurrency(link.amount)}</td>
      <td>${link.installments}x${link.installments === 1 ? ' (à vista)' : ''}</td>
      <td><span class="status-badge status-badge-plain ${link.status === 'pago' ? 'status-ativo' : 'status-enviado'}">${link.status === 'pago' ? 'Pago' : 'Aguardando pagamento'}</span></td>
      <td>
        ${link.status === 'pago'
          ? `<span class="payment-link-row-paid">Link pago</span>`
          : `<button type="button" class="payment-link-row-copy" data-copy-link="${link.id}">Copiar link</button>`}
      </td>
      ${tabelaVerMaisHtml('data-link-row', link.id)}
    </tr>
  `).join('');

  body.querySelectorAll('[data-copy-link]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const url = buildPaymentLinkUrl(btn.dataset.copyLink);
      copyTextToClipboard(url);
      showToast('Link copiado!');
    });
  });

  // Só o "ver mais" abre os dados da cobrança.
  body.querySelectorAll('[data-link-row]').forEach(btn => {
    btn.addEventListener('click', () => openChargeDrawer(btn.dataset.linkRow));
  });
}

/* -------------------- Drawer: Dados da cobrança -------------------- */

const PAYMENT_METHOD_LABELS = { boleto: 'Boleto', pix: 'Pix', cartao: 'Cartão' };

function initChargeDrawer() {
  const backdrop = document.getElementById('charge-drawer-backdrop');
  const drawer = document.getElementById('charge-drawer');
  const closeBtn = document.getElementById('charge-drawer-close');
  if (!drawer) return;

  const close = () => { drawer.classList.remove('show'); backdrop.classList.remove('show'); };
  closeBtn.addEventListener('click', close);
  backdrop.addEventListener('click', close);

  document.getElementById('charge-drawer-copy').addEventListener('click', () => {
    const link = bPaymentLinks.find(l => l.id === drawer.dataset.linkId);
    if (!link) return;
    copyTextToClipboard(buildPaymentLinkUrl(link.id));
    showToast('Link copiado!');
  });
}

function openChargeDrawer(linkId) {
  const link = bPaymentLinks.find(l => l.id === linkId);
  if (!link) return;

  const drawer = document.getElementById('charge-drawer');
  const backdrop = document.getElementById('charge-drawer-backdrop');
  drawer.dataset.linkId = linkId;

  const situacaoEl = document.getElementById('charge-drawer-situacao');
  situacaoEl.textContent = link.status === 'pago' ? 'Pago' : 'Aguardando pagamento';
  situacaoEl.className = `charge-drawer-value status-text ${link.status === 'pago' ? 'status-ativo' : 'status-pendente'}`;

  document.getElementById('charge-drawer-valor').textContent = formatCurrency(link.amount);
  document.getElementById('charge-drawer-criado').textContent = formatLinkDate(link.created_at);
  document.getElementById('charge-drawer-vencimento').textContent = link.vencimento ? formatDateOnly(link.vencimento) : '—';
  document.getElementById('charge-drawer-parcelas').textContent = `${link.installments}x${link.installments === 1 ? ' (à vista)' : ''}`;

  const methods = link.payment_methods || {};
  const formas = Object.keys(methods).filter(k => methods[k]).map(k => PAYMENT_METHOD_LABELS[k] || k);
  document.getElementById('charge-drawer-formas').textContent = formas.length ? formas.join(', ') : '—';

  document.getElementById('charge-drawer-taxa').textContent = link.pass_fee_to_client ? 'Sim' : 'Não';
  document.getElementById('charge-drawer-link').textContent = buildPaymentLinkUrl(link.id);

  drawer.classList.add('show');
  backdrop.classList.add('show');
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

const PAYMENT_LINK_SUBMIT_BTN_HTML = '<button type="submit" class="btn-primary justify-center w-full py-3 mt-2" id="payment-link-submit-btn">Criar Link de Cobrança</button>';

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
        status: 'pendente',
        vencimento
      })
      .select('id')
      .single();

    if (error) {
      showToast('Não foi possível criar o link de pagamento.', true);
      return;
    }

    await loadContratosData();
    renderPaymentLinksList();

    const url = buildPaymentLinkUrl(created.id);
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
