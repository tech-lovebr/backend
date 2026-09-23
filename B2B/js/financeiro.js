/* ==========================================================================
   LOVE B2B — Vendas (Propostas comerciais + Notas fiscais)
   ========================================================================== */

let bNotasFiscais = [];
let bFinLeads = [];
let bFinProducts = [];

document.addEventListener('DOMContentLoaded', async () => {
  await window.b2bAuthReady;
  await Promise.all([loadNotasFiscais(), loadFinLeadsAndProducts()]);
  initSalesViewTabs();
  initProposalForm();
  renderNotasFiscais();
  initNotasFiscaisActions();
});

async function loadNotasFiscais() {
  const { data: { session } } = await supabaseClient.auth.getSession();
  if (!session) { bNotasFiscais = []; return; }

  const { data, error } = await supabaseClient
    .from('notas_fiscais')
    .select('*')
    .eq('fornecedor_id', session.user.id)
    .order('created_at', { ascending: false });

  bNotasFiscais = error || !data ? [] : data;
}

async function loadFinLeadsAndProducts() {
  const { data: { session } } = await supabaseClient.auth.getSession();
  if (!session) { bFinLeads = []; bFinProducts = []; return; }

  const [leadsRes, productsRes] = await Promise.all([
    supabaseClient.from('leads').select('id, name').eq('fornecedor_id', session.user.id),
    supabaseClient.from('products').select('id, name, price').eq('fornecedor_id', session.user.id)
  ]);

  bFinLeads = leadsRes.data || [];
  bFinProducts = productsRes.data || [];
}

/* -------------------- Abas: Orçamentos / Notas fiscais -------------------- */

function initSalesViewTabs() {
  const wrap = document.getElementById('sales-view-tabs');
  if (!wrap) return;

  wrap.querySelectorAll('[data-view]').forEach(btn => {
    btn.addEventListener('click', () => {
      wrap.querySelectorAll('[data-view]').forEach(b => b.classList.toggle('active', b === btn));
      document.querySelectorAll('[data-view-panel]').forEach(panel => {
        panel.style.display = panel.dataset.viewPanel === btn.dataset.view ? '' : 'none';
      });
      if (btn.dataset.view === 'notas') renderNotasFiscais();
    });
  });
}

/* -------------------- Notas fiscais -------------------- */

function formatNotaFiscalDate(iso) {
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' });
}

function renderNotasFiscais() {
  const body = document.getElementById('notas-fiscais-body');
  if (!body) return;

  const search = (document.getElementById('notas-fiscais-search-input').value || '').trim().toLowerCase();
  const all = bNotasFiscais;
  const rows = search
    ? all.filter(n => (n.client || '').toLowerCase().includes(search) || String(n.number).includes(search))
    : all;

  const empty = document.getElementById('notas-fiscais-empty');
  const table = body.closest('.overflow-x-auto');
  if (!rows.length) {
    body.innerHTML = '';
    if (table) table.style.display = 'none';
    if (empty) empty.style.display = '';
  } else {
    if (table) table.style.display = '';
    if (empty) empty.style.display = 'none';
    body.innerHTML = rows.map(n => `
      <tr>
        <td>#${n.number}</td>
        <td>${escapeHtml(n.client)}</td>
        <td>${formatNotaFiscalDate(n.created_at)}</td>
        <td>${formatCurrency(n.value)}</td>
        <td><span class="status-badge status-ativo">Emitida</span></td>
      </tr>
    `).join('');
  }

  setText('notas-fiscais-count', String(all.length));
  setText('notas-fiscais-total', formatCurrency(all.reduce((sum, n) => sum + n.value, 0)));
}

function initNotasFiscaisActions() {
  const searchInput = document.getElementById('notas-fiscais-search-input');
  if (searchInput) searchInput.addEventListener('input', renderNotasFiscais);

  const printBtn = document.getElementById('notas-fiscais-print-btn');
  if (printBtn) printBtn.addEventListener('click', () => window.print());

  document.querySelectorAll('[data-notas-action]').forEach(btn => {
    btn.addEventListener('click', () => {
      showToast('Em breve você poderá fazer isso direto por aqui.');
    });
  });
}

/* -------------------- Proposta comercial -------------------- */

let proposalItemCounter = 0;

function initProposalForm() {
  const clientOptions = document.getElementById('proposal-client-options');
  if (clientOptions) {
    clientOptions.innerHTML = bFinLeads.map(l => `<option value="${escapeHtml(l.name)}"></option>`).join('');
  }

  const productOptions = document.getElementById('proposal-product-options');
  if (productOptions) {
    productOptions.innerHTML = bFinProducts.map(p => `<option value="${escapeHtml(p.name)}"></option>`).join('');
  }

  const dateInput = document.getElementById('proposal-date');
  if (dateInput) dateInput.value = new Date().toISOString().slice(0, 10);

  addProposalItemRow();

  const addBtn = document.getElementById('proposal-add-item-btn');
  if (addBtn) addBtn.addEventListener('click', () => addProposalItemRow());

  const cancelBtn = document.getElementById('proposal-cancel-btn');
  if (cancelBtn) cancelBtn.addEventListener('click', () => resetProposalForm());

  const saveBtn = document.getElementById('proposal-save-btn');
  if (saveBtn) saveBtn.addEventListener('click', () => {
    const client = document.getElementById('proposal-client').value.trim();
    if (!client) {
      showToast('Preencha o campo Cliente.', true);
      document.getElementById('proposal-client').focus();
      return;
    }
    showToast('Proposta salva!');
  });

  initProposalExtraToolbar();
}

function resetProposalForm() {
  document.getElementById('proposal-client').value = '';
  document.getElementById('proposal-attn').value = '';
  document.getElementById('proposal-intro').value = '';
  document.getElementById('proposal-seller').value = '';
  document.getElementById('proposal-next-contact').value = '';
  document.getElementById('proposal-extra-items').innerHTML = '';
  document.getElementById('proposal-items-body').innerHTML = '';
  addProposalItemRow();
}

function addProposalItemRow() {
  const body = document.getElementById('proposal-items-body');
  if (!body) return;
  proposalItemCounter += 1;
  const rowId = 'pi' + proposalItemCounter;

  const row = document.createElement('tr');
  row.dataset.rowId = rowId;
  row.innerHTML = `
    <td><span class="proposal-item-index">${body.children.length + 1}</span></td>
    <td><input type="text" class="proposal-cell-input" list="proposal-product-options" data-item-name placeholder="Buscar item"></td>
    <td><input type="text" class="proposal-cell-input" data-item-code style="width:80px;"></td>
    <td><input type="text" class="proposal-cell-input" data-item-unit style="width:50px;"></td>
    <td><input type="number" min="0" class="proposal-cell-input" data-item-qty style="width:60px;" value="1"></td>
    <td><input type="text" class="proposal-cell-input proposal-cell-readonly" data-item-list-price style="width:90px;" readonly></td>
    <td><input type="number" min="0" max="100" class="proposal-cell-input" data-item-discount style="width:60px;" value="0"></td>
    <td><input type="number" min="0" step="0.01" class="proposal-cell-input" data-item-unit-price style="width:90px;" value="0"></td>
    <td><span class="proposal-cell-total" data-item-total>R$ 0</span></td>
    <td>
      <button type="button" class="proposal-item-icon-btn" title="Detalhes do item">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path stroke-linecap="round" d="M12 11v5m0-8h.01"/></svg>
      </button>
    </td>
    <td>
      <button type="button" class="proposal-item-icon-btn proposal-item-remove-btn" data-remove-item title="Remover item">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0"/></svg>
      </button>
    </td>
  `;
  body.appendChild(row);
  wireProposalItemRow(row);
}

function wireProposalItemRow(row) {
  const nameInput = row.querySelector('[data-item-name]');
  const qtyInput = row.querySelector('[data-item-qty]');
  const listPriceInput = row.querySelector('[data-item-list-price]');
  const discountInput = row.querySelector('[data-item-discount]');
  const unitPriceInput = row.querySelector('[data-item-unit-price]');
  const totalEl = row.querySelector('[data-item-total]');
  const removeBtn = row.querySelector('[data-remove-item]');

  const recalcTotal = () => {
    const qty = Number(qtyInput.value) || 0;
    const unitPrice = Number(unitPriceInput.value) || 0;
    const discount = Number(discountInput.value) || 0;
    const total = qty * unitPrice * (1 - discount / 100);
    totalEl.textContent = formatCurrency(total);
  };

  nameInput.addEventListener('input', () => {
    const product = bFinProducts.find(p => p.name === nameInput.value);
    if (product) {
      listPriceInput.value = formatCurrency(product.price);
      unitPriceInput.value = product.price;
      recalcTotal();
    }
  });

  [qtyInput, discountInput, unitPriceInput].forEach(input => input.addEventListener('input', recalcTotal));

  removeBtn.addEventListener('click', () => {
    const body = document.getElementById('proposal-items-body');
    row.remove();
    body.querySelectorAll('.proposal-item-index').forEach((el, i) => { el.textContent = i + 1; });
    if (!body.children.length) addProposalItemRow();
  });

  recalcTotal();
}

function initProposalExtraToolbar() {
  document.querySelectorAll('#proposal-extra-toolbar [data-desc-cmd]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.getElementById('proposal-extra-items').focus();
      document.execCommand(btn.dataset.descCmd, false, null);
    });
  });
}
