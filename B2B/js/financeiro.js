/* ==========================================================================
   LOVE B2B — Vendas (Propostas comerciais + Notas fiscais)
   ========================================================================== */

let bNotasFiscais = [];
let bFinLeads = [];
let bFinProducts = [];

document.addEventListener('DOMContentLoaded', async () => {
  await window.b2bAuthReady;
  await Promise.all([loadNotasFiscais(), loadFinLeadsAndProducts(), loadOrcamentos()]);
  initSalesViewTabs();
  await initProposalForm();
  initOrcamentosLista();
  await preencherPropostaDoPedido();
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
    .eq('fornecedor_id', empresaId(session))
    .order('created_at', { ascending: false });

  bNotasFiscais = error || !data ? [] : data;
}

async function loadFinLeadsAndProducts() {
  const { data: { session } } = await supabaseClient.auth.getSession();
  if (!session) { bFinLeads = []; bFinProducts = []; return; }

  const [leadsRes, productsRes] = await Promise.all([
    supabaseClient.from('leads').select('id, name, email, cliente_id, comentarios, event_name, event_date').eq('fornecedor_id', empresaId(session)),
    supabaseClient.from('products').select('id, name, price, category, extra, description').eq('fornecedor_id', empresaId(session))
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
    .eq('fornecedor_id', empresaId(session));
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
      // "Novo orçamento" só aparece na aba Orçamentos.
      const novo = document.getElementById('orcamento-novo-btn');
      if (novo) novo.hidden = btn.dataset.view !== 'orcamentos';
    });
  });
  const novo = document.getElementById('orcamento-novo-btn');
  const ativa = wrap.querySelector('[data-view].active');
  if (novo) novo.hidden = !ativa || ativa.dataset.view !== 'orcamentos';
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
    placeholder: 'Pesquisar cliente ou nº da nota...',
    celular: { nome: 2, info: 4, singular: 'nota', plural: 'notas' },
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
  if (dateInput) dateInput.value = new Date().toLocaleDateString('pt-BR');

  addProposalItemRow();

  const addBtn = document.getElementById('proposal-add-item-btn');
  if (addBtn) addBtn.addEventListener('click', () => addProposalItemRow());

  const cancelBtn = document.getElementById('proposal-cancel-btn');
  if (cancelBtn) cancelBtn.addEventListener('click', () => resetProposalForm());

  const saveBtn = document.getElementById('proposal-save-btn');
  if (saveBtn) saveBtn.addEventListener('click', () => saveProposal());

  const eventDateInput = document.getElementById('proposal-event-date');
  if (eventDateInput) wireDateMaskInput(eventDateInput);

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
    aplicarProdutoNaProposta(product);
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
    supabaseClient.from('leads').select('id, name, email').eq('fornecedor_id', empresaId(session)).ilike('name', `%${q}%`).limit(6),
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
    window.open('crm', '_blank');
    dropdown.hidden = true;
  });

  dropdown.hidden = false;
}

/* -------------------- Lista de orçamentos (padrão das tabelas) --------------------
   Propostas enviadas (orcamentos) e pedidos de orçamento ainda sem proposta
   (leads que vieram do "Solicitar orçamento" do love.com.br).
   Status: Pendente (pedido sem proposta) · Em análise (enviada) · Aceito. */

let bOrcamentos = [];
let bOrcamentosPagos = new Set();
let orcamentosTabelaEstado = null;
let propostaModo = 'novo';            // 'novo' | 'pedido' | 'ver'
let propostaProdutoId = null;

const ORCAMENTO_STATUS = {
  pendente: { label: 'Pendente', classe: 'status-orc-pendente' },
  em_analise: { label: 'Em análise', classe: 'status-orc-analise' },
  aceito: { label: 'Aceito', classe: 'status-orc-aceito' }
};

async function loadOrcamentos() {
  const { data: { session } } = await supabaseClient.auth.getSession();
  if (!session) { bOrcamentos = []; return; }
  const [orcRes, linksRes] = await Promise.all([
    supabaseClient.from('orcamentos').select('*').eq('fornecedor_id', empresaId(session)).order('created_at', { ascending: false }),
    supabaseClient.from('payment_links').select('orcamento_id, status').eq('fornecedor_id', empresaId(session))
  ]);
  bOrcamentos = orcRes.data || [];
  bOrcamentosPagos = new Set((linksRes.data || []).filter(l => l.status === 'pago' && l.orcamento_id).map(l => l.orcamento_id));
}

function formatarDataBR(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return isNaN(d) ? String(iso) : d.toLocaleDateString('pt-BR');
}

// Linhas da tabela: orçamentos + pedidos pendentes (lead com pedido e sem orçamento).
function linhasDeOrcamentos() {
  const comOrcamento = new Set(bOrcamentos.map(o => o.lead_id).filter(Boolean));
  const linhas = bOrcamentos.map(o => {
    const aceito = o.status === 'aceito' || o.status === 'pago' || bOrcamentosPagos.has(o.id);
    const produto = (o.produto_id && bFinProducts.find(p => p.id === o.produto_id)) || null;
    const primeiroItem = Array.isArray(o.itens) && o.itens[0] ? o.itens[0].name : '';
    const sku = (produto && produto.extra && produto.extra.sku) || (Array.isArray(o.itens) && o.itens[0] && o.itens[0].code) || '';
    return {
      tipo: 'orcamento', id: o.id, numero: o.numero || null, cliente: o.cliente_nome,
      produto: (produto && produto.name) || primeiroItem || '', sku,
      data: formatarDataBR(o.created_at), dataEvento: o.data_evento || '',
      valor: Number(o.valor_total) || 0, status: aceito ? 'aceito' : 'em_analise', registro: o
    };
  });
  bFinLeads.forEach(l => {
    const pedido = typeof pedidoDoLead === 'function' ? pedidoDoLead(l) : null;
    if (!pedido || comOrcamento.has(l.id)) return;
    const prodPedido = pedido.servico && bFinProducts.find(p => (p.name || '').trim().toLowerCase() === pedido.servico.trim().toLowerCase());
    const comentarios = Array.isArray(l.comentarios) ? l.comentarios : [];
    const ultimo = comentarios.filter(c => String(c.id || '').startsWith('pedido-')).pop();
    linhas.push({
      tipo: 'pedido', id: l.id, numero: null, cliente: l.name,
      produto: pedido.servico || l.event_name || '', sku: (prodPedido && prodPedido.extra && prodPedido.extra.sku) || '', data: formatarDataBR(ultimo && ultimo.at),
      dataEvento: pedido.data || l.event_date || '', valor: null, status: 'pendente', lead: l, pedido
    });
  });
  // Pendentes primeiro.
  return linhas.sort((a, b) => (a.status === 'pendente' ? 0 : 1) - (b.status === 'pendente' ? 0 : 1));
}

function orcamentosFiltrados() {
  const est = orcamentosTabelaEstado || { busca: '', filtros: {} };
  return linhasDeOrcamentos().filter(r =>
    (!est.filtros.status || r.status === est.filtros.status) &&
    tabelaBateBusca(est, [r.cliente, r.produto, r.sku, r.numero, r.dataEvento]));
}

function renderOrcamentos() {
  const body = document.getElementById('orcamentos-body');
  if (!body) return;
  const todas = orcamentosFiltrados();
  const linhas = paginarLinhas(orcamentosPaginacao, todas, JSON.stringify(orcamentosTabelaEstado ? [orcamentosTabelaEstado.busca, orcamentosTabelaEstado.filtros] : []));
  if (!linhas.length) {
    body.innerHTML = `<tr><td colspan="8" class="tabela-vazia-cheia">Nenhum orçamento ainda. Clique em "Novo orçamento" para criar o primeiro.</td></tr>`;
    return;
  }
  body.innerHTML = linhas.map((r, i) => {
    const st = ORCAMENTO_STATUS[r.status];
    return `
      <tr>
        <td class="col-id">${r.numero || '—'}</td>
        <td class="col-principal">${escapeHtml(r.cliente || '')}</td>
        <td>${escapeHtml(r.produto || '—')}${r.sku ? `<span class="produto-sku">${escapeHtml(r.sku)}</span>` : ''}</td>
        <td>${escapeHtml(r.data || '—')}</td>
        <td>${escapeHtml(r.dataEvento || '—')}</td>
        <td>${r.valor == null ? '—' : formatCurrency(r.valor)}</td>
        <td><span class="status-badge ${st.classe}">${st.label}</span></td>
        ${tabelaVerMaisHtml('data-orcamento-linha', i)}
      </tr>`;
  }).join('');
  body.querySelectorAll('[data-orcamento-linha]').forEach(btn => {
    btn.addEventListener('click', () => {
      const r = linhas[Number(btn.dataset.orcamentoLinha)];
      if (!r) return;
      if (r.tipo === 'pedido') abrirPropostaDoPedido({ lead: r.lead, pedido: r.pedido });
      else abrirPropostaParaVer(r.registro, r.status);
    });
  });
}

let orcamentosPaginacao = null;
function initOrcamentosLista() {
  orcamentosPaginacao = montarPaginacaoTabela(document.getElementById('orcamentos-table-card'), () => renderOrcamentos());
  orcamentosTabelaEstado = montarBarraTabela(document.getElementById('orcamentos-table-card'), {
    placeholder: 'Pesquisar cliente ou serviço...',
    celular: { nome: 2, info: 6, singular: 'orçamento', plural: 'orçamentos', editarSel: '[data-orcamento-linha]', rotuloEditar: 'Abrir' },
    filtros: [{ chave: 'status', rotulo: 'Status', opcoes: () => Object.entries(ORCAMENTO_STATUS).map(([k, v]) => [k, v.label]) }],
    exportar: () => tabelaExportarCSV('orcamentos', [
      { titulo: 'Nº', valor: r => r.numero || '' },
      { titulo: 'Cliente', valor: r => r.cliente },
      { titulo: 'Produto/serviço', valor: r => r.produto },
      { titulo: 'Data', valor: r => r.data },
      { titulo: 'Data do evento', valor: r => r.dataEvento },
      { titulo: 'Valor', valor: r => (r.valor == null ? '' : r.valor) },
      { titulo: 'Status', valor: r => ORCAMENTO_STATUS[r.status].label }
    ], orcamentosFiltrados()),
    aoMudar: () => { if (orcamentosPaginacao) orcamentosPaginacao.pagina = 1; renderOrcamentos(); }
  });
  document.getElementById('orcamento-novo-btn')?.addEventListener('click', () => abrirPropostaNova());
  document.getElementById('proposal-voltar')?.addEventListener('click', () => voltarParaListaOrcamentos());
  // Voltar do navegador com a proposta aberta: volta para a lista (como o caminho do topo).
  window.addEventListener('popstate', () => {
    if (!document.getElementById('orcamentos-form-view').hidden) mostrarListaOrcamentos();
  });
  document.getElementById('proposal-send-btn')?.addEventListener('click', () => saveProposal());
  renderOrcamentos();
}

/* -------------------- Telas: lista × proposta -------------------- */

function mostrarListaOrcamentos() {
  document.getElementById('orcamentos-form-view').hidden = true;
  document.getElementById('orcamentos-lista-view').hidden = false;
  renderOrcamentos();
}

/* A proposta aberta ganha uma entrada no histórico: o Voltar do navegador
   (e o "Orçamentos" do caminho do topo) volta para a lista. */
function voltarParaListaOrcamentos() {
  if (history.state && history.state.propostaAberta) history.back();
  else mostrarListaOrcamentos();
}

function mostrarFormularioProposta(titulo) {
  if (!(history.state && history.state.propostaAberta)) history.pushState({ propostaAberta: true }, '', location.pathname);
  const aba = document.querySelector('#sales-view-tabs [data-view="orcamentos"]');
  if (aba && !aba.classList.contains('active')) aba.click();
  document.getElementById('orcamentos-lista-view').hidden = true;
  document.getElementById('orcamentos-form-view').hidden = false;
  document.getElementById('proposal-titulo').textContent = titulo;
  document.getElementById('proposal-titulo-atual').textContent = titulo;
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function hojeBR() {
  return new Date().toLocaleDateString('pt-BR');
}

async function prepararFormularioVazio(modo) {
  propostaModo = modo;
  propostaProdutoId = null;
  proposalSelectedLeadId = null;
  proposalSelectedClienteId = null;
  document.getElementById('proposal-fieldset').disabled = modo === 'ver';
  document.getElementById('proposal-rodape').hidden = modo === 'ver';
  document.getElementById('proposal-status-badge').hidden = true;
  document.getElementById('proposal-client').value = '';
  document.getElementById('proposal-intro').value = '';
  document.getElementById('proposal-event-date').value = '';
  document.getElementById('proposal-address').value = '';
  const guests = document.getElementById('proposal-guests');
  guests.value = '';
  guests.readOnly = false;
  guests.classList.remove('proposal-campo-fixo');
  document.getElementById('proposal-date').value = hojeBR();
  document.getElementById('proposal-extra-items').value = '';
  document.getElementById('proposal-items-body').innerHTML = '';
  const cat = document.getElementById('proposal-category');
  if (cat) { cat.value = ''; populateProposalProductPicker(); }
  renderProposalSellerField();
  renderProposalCompanyAndCnpj();
  addProposalItemRow();
  await refreshProposalNumber();
  atualizarTotalProposta();
}

async function abrirPropostaNova() {
  await prepararFormularioVazio('novo');
  mostrarFormularioProposta('Nova proposta');
}

/* Pedido de orçamento (chat do love.com.br): cliente, data do evento,
   convidados (travado), endereço, categoria, serviço e introdução já vêm
   preenchidos. */
async function abrirPropostaDoPedido({ lead, pedido, clienteId, servico, data, convidados, evento, endereco }) {
  await prepararFormularioVazio('pedido');
  pedido = pedido || {};
  const nomeServico = (pedido.servico || servico || (lead && lead.event_name) || '').trim();
  const dataEvento = pedido.data || data || (lead && lead.event_date) || '';
  const qtd = pedido.convidados || convidados || null;
  const local = pedido.local || endereco || '';

  if (lead) {
    document.getElementById('proposal-client').value = lead.name || '';
    proposalSelectedLeadId = lead.id;
  } else if (clienteId) {
    const { data: c } = await supabaseClient.from('clientes').select('id, couple_name, email').eq('id', clienteId).maybeSingle();
    if (c) { document.getElementById('proposal-client').value = c.couple_name || c.email; proposalSelectedClienteId = c.id; }
  }
  document.getElementById('proposal-event-date').value = dataEvento;
  document.getElementById('proposal-address').value = local;
  if (qtd) {
    const guests = document.getElementById('proposal-guests');
    guests.value = String(qtd);
    guests.readOnly = true;            // o anfitrião já informou no pedido
    guests.classList.add('proposal-campo-fixo');
  }
  const produto = nomeServico && bFinProducts.find(p => (p.name || '').trim().toLowerCase() === nomeServico.toLowerCase());
  if (produto) aplicarProdutoNaProposta(produto);
  else if (evento) document.getElementById('proposal-intro').value = 'Proposta para ' + evento + '.';
  mostrarFormularioProposta('Proposta do pedido');
}

/* Orçamento já enviado: abre só para ver (sem editar nem reenviar). */
async function abrirPropostaParaVer(o, status) {
  await prepararFormularioVazio('ver');
  document.getElementById('proposal-client').value = o.cliente_nome || '';
  document.getElementById('proposal-date').value = formatarDataBR(o.created_at);
  document.getElementById('proposal-event-date').value = o.data_evento || '';
  document.getElementById('proposal-guests').value = o.convidados || '';
  document.getElementById('proposal-address').value = o.endereco_evento || '';
  document.getElementById('proposal-intro').value = o.introducao || '';
  if (o.numero) document.getElementById('proposal-number').value = String(o.numero);
  const body = document.getElementById('proposal-items-body');
  body.innerHTML = '';
  (Array.isArray(o.itens) ? o.itens : []).forEach(it => {
    const row = addProposalItemRow();
    row.querySelector('[data-item-name]').value = it.name || '';
    row.querySelector('[data-item-unit]').value = it.unit || '';
    row.querySelector('[data-item-code]').value = it.code || '';
    row.querySelector('[data-item-qty]').value = it.qty ?? '';
    row.querySelector('[data-item-discount]').value = it.discount ?? 0;
    row.querySelector('[data-item-unit-price]').value = it.unitPrice ?? 0;
    row.querySelector('[data-item-list-price]').value = precoNaCelula(it.unitPrice);
    row.querySelector('[data-item-total]').textContent = formatCurrency(it.total || 0);
  });
  if (!body.children.length) addProposalItemRow();
  atualizarTotalProposta(Number(o.valor_total) || 0);
  const badge = document.getElementById('proposal-status-badge');
  const st = ORCAMENTO_STATUS[status];
  badge.className = 'status-badge ' + st.classe;
  badge.textContent = st.label;
  badge.hidden = false;
  mostrarFormularioProposta('Proposta nº ' + (o.numero || '—'));
}

/* -------------------- Serviço escolhido: itens -------------------- */

function preencherItem(row, { name, unit, qty, unitPrice, code }) {
  const nameInput = row.querySelector('[data-item-name]');
  nameInput.value = name;
  nameInput.dispatchEvent(new Event('input', { bubbles: true }));
  const codeInput = row.querySelector('[data-item-code]');
  if (codeInput && code) codeInput.value = code;
  row.querySelector('[data-item-unit]').value = unit || '';
  const qtyInput = row.querySelector('[data-item-qty]');
  qtyInput.value = String(qty ?? 1);
  const preco = row.querySelector('[data-item-unit-price]');
  preco.value = String(Number(unitPrice) || 0);
  const lista = row.querySelector('[data-item-list-price]');
  if (lista) lista.value = precoNaCelula(unitPrice);
  qtyInput.dispatchEvent(new Event('input', { bubbles: true }));
}

function aplicarProdutoNaProposta(p) {
  propostaProdutoId = p.id;
  const cat = document.getElementById('proposal-category');
  if (cat && p.category) {
    if (![...cat.options].some(o => o.value === p.category)) cat.insertAdjacentHTML('beforeend', `<option value="${escapeHtml(p.category)}">${escapeHtml(p.category)}</option>`);
    cat.value = p.category;
    populateProposalProductPicker();
  }
  const sel = document.getElementById('proposal-product-picker');
  if (sel) sel.value = p.id;

  // Introdução = descrição do serviço (só se ainda estiver vazia).
  const intro = document.getElementById('proposal-intro');
  if (intro && !intro.value.trim() && p.description) intro.value = p.description;

  // SKU interno do serviço vai na coluna Código dos itens.
  const sku = (p.extra && p.extra.sku) || '';
  // Itens conforme a unidade de cobrança.
  const body = document.getElementById('proposal-items-body');
  const primeira = body.firstElementChild;
  const vazia = body.children.length === 1 && !primeira.querySelector('[data-item-name]').value;
  const novaLinha = () => (vazia && !body.dataset.usouPrimeira ? (body.dataset.usouPrimeira = '1', primeira) : addProposalItemRow());
  body.dataset.usouPrimeira = '';
  const convidados = parseInt(document.getElementById('proposal-guests').value, 10) || 0;
  const pr = (p.extra && p.extra.pricing) || null;
  if (pr && pr.type === 'POR_PESSOA' && pr.perPerson) {
    preencherItem(novaLinha(), { name: p.name, code: sku, unit: 'pessoa', qty: convidados || pr.perPerson.minPeople || 1, unitPrice: pr.perPerson.pricePerPerson });
  } else if (pr && pr.type === 'POR_HORA' && pr.perHour) {
    preencherItem(novaLinha(), { name: p.name, code: sku, unit: 'hora', qty: pr.perHour.minHours || 1, unitPrice: pr.perHour.pricePerHour });
    if (pr.perHour.extraHourPrice) preencherItem(addProposalItemRow(), { name: 'Hora adicional', unit: 'hora', qty: 0, unitPrice: pr.perHour.extraHourPrice });
  } else if (pr && pr.type === 'VALOR_FIXO' && pr.fixed) {
    preencherItem(novaLinha(), { name: p.name, code: sku, unit: 'serviço', qty: 1, unitPrice: pr.fixed.price });
  } else if (pr && pr.type === 'SOB_CONSULTA') {
    preencherItem(novaLinha(), { name: p.name, code: sku, unit: 'serviço', qty: 1, unitPrice: (pr.onRequest && pr.onRequest.startingPrice) || 0 });
  } else {
    preencherItem(novaLinha(), { name: p.name, code: sku, unit: 'serviço', qty: 1, unitPrice: p.price || 0 });
  }
  const log = (p.extra && p.extra.logistics) || {};
  if (log.extraKmFee) preencherItem(addProposalItemRow(), { name: 'Deslocamento (km adicional)', unit: 'km', qty: 0, unitPrice: log.extraKmFee });
  atualizarTotalProposta();
}

function atualizarTotalProposta(valorFixo) {
  const el = document.getElementById('proposal-total');
  if (!el) return;
  if (typeof valorFixo === 'number') { el.textContent = formatCurrency(valorFixo); return; }
  let total = 0;
  document.querySelectorAll('#proposal-items-body tr').forEach(row => {
    const qty = Number(row.querySelector('[data-item-qty]')?.value) || 0;
    const unit = Number(row.querySelector('[data-item-unit-price]')?.value) || 0;
    const desc = Number(row.querySelector('[data-item-discount]')?.value) || 0;
    total += qty * unit * (1 - desc / 100);
  });
  el.textContent = formatCurrency(total);
}

/* -------------------- Enviar proposta -------------------- */

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
    const unit = row.querySelector('[data-item-unit]')?.value.trim() || '';
    const code = row.querySelector('[data-item-code]')?.value.trim() || '';
    const unitPrice = Number(row.querySelector('[data-item-unit-price]')?.value) || 0;
    const discount = Number(row.querySelector('[data-item-discount]')?.value) || 0;
    const total = qty * unitPrice * (1 - discount / 100);
    valor_total += total;
    itens.push({ name, code, unit, qty, unitPrice, discount, total });
  });

  // Vincula a proposta a um lead real (o escolhido, um novo para o cliente
  // da plataforma, ou por nome exato) — é o que avança o status do lead.
  let leadId = proposalSelectedLeadId;
  if (!leadId && proposalSelectedClienteId) {
    const { data: clienteRow } = await supabaseClient.from('clientes').select('email').eq('id', proposalSelectedClienteId).maybeSingle();
    const { data: newLead } = await supabaseClient
      .from('leads')
      .insert({ fornecedor_id: empresaId(session), name: client, email: clienteRow?.email || null, cliente_id: proposalSelectedClienteId })
      .select('id')
      .single();
    leadId = newLead ? newLead.id : null;
  }
  if (!leadId) {
    const fallbackLead = bFinLeads.find(l => (l.name || '').trim().toLowerCase() === client.toLowerCase());
    leadId = fallbackLead ? fallbackLead.id : null;
  }

  const vendedorEl = document.getElementById('proposal-seller-field');
  const dados = {
    fornecedor_id: empresaId(session),
    lead_id: leadId,
    cliente_nome: client,
    valor_total,
    itens,
    status: 'enviado',
    data_evento: (document.getElementById('proposal-event-date')?.value || '').trim() || null,
    convidados: parseInt(document.getElementById('proposal-guests')?.value, 10) || null,
    numero: parseInt(document.getElementById('proposal-number')?.value, 10) || null,
    introducao: document.getElementById('proposal-intro')?.value.trim() || null,
    vendedor: vendedorEl ? (vendedorEl.value || '').trim() || null : null,
    endereco_evento: (document.getElementById('proposal-address')?.value || '').trim() || null,
    produto_id: propostaProdutoId
  };
  // Sem as migrations 059/062, salva sem as colunas novas.
  let { data: orcamento, error } = await supabaseClient.from('orcamentos').insert(dados).select('id').single();
  if (error && /column|schema cache/i.test(error.message || '')) {
    const { numero, introducao, vendedor, endereco_evento, produto_id, ...sem062 } = dados;
    ({ data: orcamento, error } = await supabaseClient.from('orcamentos').insert(sem062).select('id').single());
    if (error && /column|schema cache/i.test(error.message || '')) {
      const { data_evento, convidados, ...basico } = sem062;
      ({ data: orcamento, error } = await supabaseClient.from('orcamentos').insert(basico).select('id').single());
    }
  }
  if (error) { showToast('Não foi possível enviar a proposta.', true); return; }

  if (leadId) {
    await supabaseClient.from('leads').update({ status: 'proposta' }).eq('id', leadId).in('status', ['novo', 'conversa']);
  }

  if (valor_total > 0) {
    const { data: link } = await supabaseClient
      .from('payment_links')
      .insert({
        fornecedor_id: empresaId(session),
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
      showToast('Proposta enviada! Link de pagamento copiado.');
    } else {
      showToast('Proposta enviada!');
    }
  } else {
    showToast('Proposta enviada!');
  }

  await Promise.all([loadFinLeadsAndProducts(), loadOrcamentos()]);
  voltarParaListaOrcamentos();
}

/* Vindo do botão "Criar orçamento" (chat / Leads): vendas?criar=orcamento&… */
async function preencherPropostaDoPedido() {
  const q = new URLSearchParams(location.search);
  if (q.get('criar') !== 'orcamento') return;
  // Tira os parâmetros antes de abrir (recarregar não preenche de novo; o
  // Voltar com a proposta aberta cai na lista).
  history.replaceState(null, '', location.pathname);
  let lead = null;
  if (q.get('lead')) lead = bFinLeads.find(l => l.id === q.get('lead')) || null;
  if (!lead && q.get('cliente')) lead = bFinLeads.find(l => l.cliente_id === q.get('cliente')) || null;
  await abrirPropostaDoPedido({
    lead,
    pedido: lead ? pedidoDoLead(lead) : null,
    clienteId: q.get('cliente'),
    servico: q.get('servico') || '',
    data: q.get('data') || '',
    convidados: parseInt(q.get('convidados'), 10) || null,
    evento: q.get('evento') || '',
    endereco: q.get('local') || ''
  });
}

async function resetProposalForm() {
  await prepararFormularioVazio('novo');
}

const precoNaCelula = v => (Number(v) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function addProposalItemRow() {
  const body = document.getElementById('proposal-items-body');
  if (!body) return;
  proposalItemCounter += 1;
  const rowId = 'pi' + proposalItemCounter;

  const row = document.createElement('tr');
  row.dataset.rowId = rowId;
  row.innerHTML = `
    <td><span class="proposal-item-index">${body.children.length + 1}</span></td>
    <td><input type="text" class="proposal-cell-input" list="proposal-product-options" data-item-name placeholder="Pesquisar item"></td>
    <td><input type="text" class="proposal-cell-input" data-item-code style="width:80px;"></td>
    <td><input type="text" class="proposal-cell-input" data-item-unit style="width:50px;"></td>
    <td><input type="number" min="0" class="proposal-cell-input" data-item-qty style="width:60px;" value="1"></td>
    <td><input type="text" inputmode="numeric" class="proposal-cell-input" data-item-list-price style="width:100px;" placeholder="0,00"><input type="hidden" data-item-unit-price value="0"></td>
    <td><input type="number" min="0" max="100" class="proposal-cell-input" data-item-discount style="width:60px;" value="0"></td>
    <td><span class="proposal-cell-total" data-item-total>R$ 0</span></td>
    <td>
      <button type="button" class="proposal-item-icon-btn" title="Detalhes do item">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75"><circle cx="12" cy="12" r="9"/><path stroke-linecap="round" d="M12 11v5m0-8h.01"/></svg>
      </button>
    </td>
    <td>
      <button type="button" class="proposal-item-icon-btn proposal-item-remove-btn" data-remove-item title="Remover item">
        <svg stroke-linejoin="round" stroke-linecap="round" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75"><path stroke-linecap="round" stroke-linejoin="round" d="M4 6.5h16"/><path stroke-linecap="round" stroke-linejoin="round" d="M9 6.5V4.5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/><path stroke-linecap="round" stroke-linejoin="round" d="M6.5 9.5V18a3 3 0 0 0 3 3h5a3 3 0 0 0 3-3V9.5"/><path stroke-linecap="round" stroke-linejoin="round" d="M10.5 11v5.5M13.5 11v5.5"/></svg>
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
    if (typeof atualizarTotalProposta === 'function') atualizarTotalProposta();
  };

  nameInput.addEventListener('input', () => {
    const product = bFinProducts.find(p => p.name === nameInput.value);
    if (product) {
      listPriceInput.value = precoNaCelula(product.price);
      unitPriceInput.value = product.price;
      recalcTotal();
    }
  });

  // Preço editável direto na coluna "Preço UC" (sem a coluna "Preço un").
  wireCurrencyMaskInput(listPriceInput);
  listPriceInput.addEventListener('input', () => {
    unitPriceInput.value = String(currencyMaskValue(listPriceInput));
    recalcTotal();
  });
  [qtyInput, discountInput].forEach(input => input.addEventListener('input', recalcTotal));

  removeBtn.addEventListener('click', () => {
    const body = document.getElementById('proposal-items-body');
    row.remove();
    body.querySelectorAll('.proposal-item-index').forEach((el, i) => { el.textContent = i + 1; });
    if (!body.children.length) addProposalItemRow();
    if (typeof atualizarTotalProposta === 'function') atualizarTotalProposta();
  });

  recalcTotal();
}

