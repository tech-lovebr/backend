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
  await initProposalForm();
  renderNotasFiscais();
  initNotasFiscaisActions();
  window.b2bPageReady?.();
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
    supabaseClient.from('products').select('id, name, price, category').eq('fornecedor_id', session.user.id)
  ]);

  bFinLeads = leadsRes.data || [];
  bFinProducts = productsRes.data || [];
}

async function countOrcamentos() {
  const { data: { session } } = await supabaseClient.auth.getSession();
  if (!session) return 0;
  const { count } = await supabaseClient
    .from('orcamentos')
    .select('id', { count: 'exact', head: true })
    .eq('fornecedor_id', session.user.id);
  return count || 0;
}

async function refreshProposalNumber() {
  const input = document.getElementById('proposal-number');
  if (!input) return;
  const count = await countOrcamentos();
  input.value = String(count + 1);
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

let notasFiscaisEstado = null;

function mesDaNota(n) {
  const d = new Date(n.created_at);
  return isNaN(d) ? '' : `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function notasFiscaisFiltradas() {
  const est = notasFiscaisEstado || { busca: '', filtros: {} };
  return bNotasFiscais.filter(n =>
    (!est.filtros.mes || mesDaNota(n) === est.filtros.mes) &&
    tabelaBateBusca(est, [n.client, n.number, '#' + n.number]));
}

function renderNotasFiscais() {
  const body = document.getElementById('notas-fiscais-body');
  if (!body) return;

  const all = bNotasFiscais;
  const rows = notasFiscaisFiltradas();

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
        <td class="col-principal">${escapeHtml(n.client)}</td>
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
  // Barra da tabela: busca, Filtrar por (mês) e Exportar.
  notasFiscaisEstado = montarBarraTabela(document.getElementById('notas-fiscais-card'), {
    placeholder: 'Buscar cliente ou nº da nota...',
    filtros: [{ chave: 'mes', rotulo: 'Mês', opcoes: () => [...new Set(bNotasFiscais.map(mesDaNota).filter(Boolean))].sort().reverse()
      .map(m => { const [y, mm] = m.split('-'); return [m, `${capitalize(new Date(+y, +mm - 1, 1).toLocaleDateString('pt-BR', { month: 'long' }))} de ${y}`]; }) }],
    exportar: () => tabelaExportarCSV('notas-fiscais', [
      { titulo: 'Nº', valor: n => n.number },
      { titulo: 'Cliente', valor: n => n.client },
      { titulo: 'Data', valor: n => formatNotaFiscalDate(n.created_at) },
      { titulo: 'Valor', valor: n => n.value },
      { titulo: 'Status', valor: () => 'Emitida' }
    ], notasFiscaisFiltradas()),
    aoMudar: () => renderNotasFiscais()
  });
  renderNotasFiscais();

  document.querySelectorAll('[data-notas-action]').forEach(btn => {
    btn.addEventListener('click', () => {
      showToast('Em breve você poderá fazer isso direto por aqui.');
    });
  });
}

/* -------------------- Proposta comercial -------------------- */

let proposalItemCounter = 0;
let proposalSelectedLeadId = null;
let proposalSelectedClienteId = null;
let proposalDatePicker = null;
let proposalNextContactPicker = null;

function todayIso() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

async function initProposalForm() {
  const productOptions = document.getElementById('proposal-product-options');
  if (productOptions) {
    productOptions.innerHTML = bFinProducts.map(p => `<option value="${escapeHtml(p.name)}"></option>`).join('');
  }

  const dateInput = document.getElementById('proposal-date');
  if (dateInput) proposalDatePicker = initDatePicker(dateInput, todayIso());

  const nextContactInput = document.getElementById('proposal-next-contact');
  if (nextContactInput) proposalNextContactPicker = initDatePicker(nextContactInput, '');

  addProposalItemRow();

  const addBtn = document.getElementById('proposal-add-item-btn');
  if (addBtn) addBtn.addEventListener('click', () => addProposalItemRow());

  const cancelBtn = document.getElementById('proposal-cancel-btn');
  if (cancelBtn) cancelBtn.addEventListener('click', () => resetProposalForm());

  const saveBtn = document.getElementById('proposal-save-btn');
  if (saveBtn) saveBtn.addEventListener('click', () => saveProposal());

  initProposalExtraToolbar();
  initProposalClientAutocomplete();
  renderProposalSellerField();
  renderProposalCompanyAndCnpj();
  populateProposalCategoryPicker();
  populateProposalProductPicker();
  await refreshProposalNumber();
}

/* -------------------- Vendedor / Empresa / CNPJ (derivados do perfil) -------------------- */

function renderProposalSellerField() {
  const wrap = document.getElementById('proposal-seller-field-wrap');
  if (!wrap) return;
  const team = (typeof B2B_DATA !== 'undefined' && B2B_DATA.team) || [];

  if (team.length <= 1) {
    wrap.innerHTML = `
      <label for="proposal-seller-field" class="field-label">Vendedor</label>
      <input id="proposal-seller-field" type="text" class="field-input" value="${escapeHtml(team[0]?.name || '')}" disabled style="background:#F4F4F5;">
    `;
  } else {
    wrap.innerHTML = `
      <label for="proposal-seller-field" class="field-label">Vendedor</label>
      <select id="proposal-seller-field" class="field-select">
        ${team.map(m => `<option value="${escapeHtml(m.name)}">${escapeHtml(m.name)}</option>`).join('')}
      </select>
    `;
  }
}

function renderProposalCompanyAndCnpj() {
  const p = (typeof B2B_DATA !== 'undefined' && B2B_DATA.professional) || {};
  const companyInput = document.getElementById('proposal-company-display');
  const cnpjInput = document.getElementById('proposal-cnpj-display');
  if (companyInput) companyInput.value = p.company || '';
  if (cnpjInput) cnpjInput.value = p.documentNumber || '';
}

/* -------------------- Categoria / Produto de interesse (atalho pra itens) -------------------- */

function populateProposalCategoryPicker() {
  const select = document.getElementById('proposal-category');
  if (!select) return;
  const categories = [...new Set(bFinProducts.map(p => p.category).filter(Boolean))];
  select.innerHTML = '<option value="">Todos</option>' + categories.map(c => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join('');
  select.addEventListener('change', () => populateProposalProductPicker());
}

function populateProposalProductPicker() {
  const select = document.getElementById('proposal-product-picker');
  const categorySelect = document.getElementById('proposal-category');
  if (!select) return;
  const category = categorySelect ? categorySelect.value : '';
  const filtered = category ? bFinProducts.filter(p => p.category === category) : bFinProducts;

  select.innerHTML = '<option value="">Selecione um produto/serviço</option>'
    + filtered.map(p => `<option value="${p.id}">${escapeHtml(p.name)}</option>`).join('');

  select.onchange = () => {
    const product = bFinProducts.find(p => p.id === select.value);
    if (!product) return;
    const row = addProposalItemRow();
    const nameInput = row.querySelector('[data-item-name]');
    nameInput.value = product.name;
    nameInput.dispatchEvent(new Event('input', { bubbles: true }));
    select.value = '';
  };
}

/* -------------------- Cliente: busca ao vivo em Contatos + clientes da plataforma -------------------- */

function initProposalClientAutocomplete() {
  const input = document.getElementById('proposal-client');
  const dropdown = document.getElementById('proposal-client-dropdown');
  if (!input || !dropdown) return;

  let searchTimer = null;

  const closeDropdown = () => { dropdown.hidden = true; };

  input.addEventListener('input', () => {
    proposalSelectedLeadId = null;
    proposalSelectedClienteId = null;
    const q = input.value.trim();
    clearTimeout(searchTimer);
    if (!q) { closeDropdown(); return; }
    searchTimer = setTimeout(() => searchProposalClients(q), 250);
  });

  input.addEventListener('focus', () => {
    if (input.value.trim()) searchProposalClients(input.value.trim());
  });

  document.addEventListener('click', (e) => {
    if (e.target !== input && !dropdown.contains(e.target)) closeDropdown();
  });
}

async function searchProposalClients(q) {
  const dropdown = document.getElementById('proposal-client-dropdown');
  if (!dropdown) return;

  const { data: { session } } = await supabaseClient.auth.getSession();
  if (!session) return;

  const [leadsRes, clientesRes] = await Promise.all([
    supabaseClient.from('leads').select('id, name, email').eq('fornecedor_id', session.user.id).ilike('name', `%${q}%`).limit(6),
    supabaseClient.from('clientes').select('id, couple_name, email').or(`couple_name.ilike.%${q}%,email.ilike.%${q}%`).limit(6)
  ]);

  const leadEmails = new Set((leadsRes.data || []).map(l => (l.email || '').toLowerCase()).filter(Boolean));
  const results = [
    ...(leadsRes.data || []).map(l => ({ kind: 'lead', id: l.id, name: l.name, meta: l.email || 'Contato do CRM' })),
    ...(clientesRes.data || [])
      .filter(c => !leadEmails.has((c.email || '').toLowerCase()))
      .map(c => ({ kind: 'cliente', id: c.id, name: c.couple_name || c.email, meta: `${c.email} · Cliente da plataforma` }))
  ];

  dropdown.innerHTML = results.length
    ? results.map((r, i) => `
      <div class="proposal-client-dropdown-item" data-result-index="${i}">
        <p class="proposal-client-dropdown-item-name">${escapeHtml(r.name)}</p>
        <p class="proposal-client-dropdown-item-meta">${escapeHtml(r.meta)}</p>
      </div>
    `).join('')
    : `<div class="proposal-client-dropdown-add" id="proposal-client-add-btn">+ Adicionar contato</div>`;

  dropdown.querySelectorAll('[data-result-index]').forEach(item => {
    item.addEventListener('click', () => {
      const r = results[Number(item.dataset.resultIndex)];
      document.getElementById('proposal-client').value = r.name;
      proposalSelectedLeadId = r.kind === 'lead' ? r.id : null;
      proposalSelectedClienteId = r.kind === 'cliente' ? r.id : null;
      dropdown.hidden = true;
    });
  });

  document.getElementById('proposal-client-add-btn')?.addEventListener('click', () => {
    window.open('crm.html', '_blank');
    dropdown.hidden = true;
  });

  dropdown.hidden = false;
}

async function saveProposal() {
  const clientInput = document.getElementById('proposal-client');
  const client = clientInput.value.trim();
  if (!client) {
    showToast('Preencha o campo Cliente.', true);
    clientInput.focus();
    return;
  }

  const { data: { session } } = await supabaseClient.auth.getSession();
  if (!session) return;

  const itens = [];
  let valor_total = 0;
  document.querySelectorAll('#proposal-items-body tr').forEach(row => {
    const name = row.querySelector('[data-item-name]')?.value.trim();
    if (!name) return;
    const qty = Number(row.querySelector('[data-item-qty]')?.value) || 0;
    const unitPrice = Number(row.querySelector('[data-item-unit-price]')?.value) || 0;
    const discount = Number(row.querySelector('[data-item-discount]')?.value) || 0;
    const total = qty * unitPrice * (1 - discount / 100);
    valor_total += total;
    itens.push({ name, qty, unitPrice, discount, total });
  });

  // Vincula a proposta a um contato real do CRM — direto (contato já
  // escolhido na busca), criando um contato novo (cliente da plataforma
  // escolhido que ainda não tinha lead), ou por nome exato como último
  // recurso — é isso que faz o status do lead avançar sozinho e permite
  // gerar o link de pagamento do orçamento.
  let leadId = proposalSelectedLeadId;

  if (!leadId && proposalSelectedClienteId) {
    const { data: clienteRow } = await supabaseClient.from('clientes').select('email').eq('id', proposalSelectedClienteId).maybeSingle();
    const { data: newLead } = await supabaseClient
      .from('leads')
      .insert({ fornecedor_id: session.user.id, name: client, email: clienteRow?.email || null, cliente_id: proposalSelectedClienteId })
      .select('id')
      .single();
    leadId = newLead ? newLead.id : null;
  }

  if (!leadId) {
    const fallbackLead = bFinLeads.find(l => l.name.trim().toLowerCase() === client.toLowerCase());
    leadId = fallbackLead ? fallbackLead.id : null;
  }

  const { data: orcamento, error } = await supabaseClient
    .from('orcamentos')
    .insert({
      fornecedor_id: session.user.id,
      lead_id: leadId,
      cliente_nome: client,
      valor_total,
      itens
    })
    .select('id')
    .single();

  if (error) { showToast('Não foi possível salvar a proposta.', true); return; }

  if (leadId) {
    await supabaseClient.from('leads').update({ status: 'proposta' }).eq('id', leadId).in('status', ['novo', 'conversa']);
  }

  if (valor_total > 0) {
    const { data: link } = await supabaseClient
      .from('payment_links')
      .insert({
        fornecedor_id: session.user.id,
        orcamento_id: orcamento.id,
        amount: valor_total,
        installments: 1,
        pass_fee_to_client: false,
        payment_methods: { boleto: true, pix: true, cartao: true },
        status: 'pendente'
      })
      .select('id')
      .single();

    if (link) {
      const url = new URL(`site-preview?page=checkout&link=${link.id}`, location.href).toString();
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(url).catch(() => {});
      showToast('Proposta salva! Link de pagamento copiado para a área de transferência.');
    } else {
      showToast('Proposta salva!');
    }
  } else {
    showToast('Proposta salva!');
  }

  await loadFinLeadsAndProducts();
  await resetProposalForm();
}

async function resetProposalForm() {
  document.getElementById('proposal-client').value = '';
  proposalSelectedLeadId = null;
  proposalSelectedClienteId = null;
  document.getElementById('proposal-intro').value = '';
  if (proposalDatePicker) proposalDatePicker.setValue(todayIso());
  if (proposalNextContactPicker) proposalNextContactPicker.setValue('');
  document.getElementById('proposal-extra-items').innerHTML = '';
  document.getElementById('proposal-items-body').innerHTML = '';
  addProposalItemRow();
  await refreshProposalNumber();
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
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path stroke-linecap="round" stroke-linejoin="round" d="M4 7h16"/><path stroke-linecap="round" stroke-linejoin="round" d="M9 7V4.5A1.5 1.5 0 0 1 10.5 3h3A1.5 1.5 0 0 1 15 4.5V7"/><path stroke-linecap="round" stroke-linejoin="round" d="M6 7l1 12.1A2 2 0 0 0 9 21h6a2 2 0 0 0 2-1.9L18 7"/><path stroke-linecap="round" stroke-linejoin="round" d="M10 11v6M14 11v6"/></svg>
      </button>
    </td>
  `;
  body.appendChild(row);
  wireProposalItemRow(row);
  return row;
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
