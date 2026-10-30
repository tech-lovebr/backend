/* ==========================================================================
   LOVE B2B — Leads (lista de leads e oportunidades, dados reais via Supabase)
   ========================================================================== */

const LEAD_STATUS_ORDER = ['novo', 'conversa', 'proposta', 'fechado'];

let activeLeadStatus = 'todos';
let leadSearchQuery = '';
let leadsTabelaEstado = null;
let leadsPaginacao = null;
// Leads marcados nas caixinhas (exclusão em massa).
const leadsSelecionados = new Set();
let crmLeads = [];
let crmProducts = [];
let leadMatchedClienteId = null;

document.addEventListener('DOMContentLoaded', async () => {
  await window.b2bAuthReady;
  await Promise.all([loadLeads(), loadCrmProducts()]);
  renderLeadStatusTabs();
  renderLeadsTable();
  initLeadDrawer();
  initLeadEmailAutocomplete();
  initLeadImport();

  // Barra da tabela: busca, Filtrar por (produto/serviço e estado),
  // Importar e Exportar (o que está filtrado/buscado no momento).
  leadsTabelaEstado = montarBarraTabela(document.getElementById('leads-table-card'), {
    placeholder: 'Pesquisar cliente, e-mail ou CPF...',
    celular: { nome: 2, info: 6, singular: 'cliente', plural: 'clientes', nomeSel: '.lead-nome-link', filtroRotulo: 'Evento', editarSel: '[data-open-lead]', remover: tr => excluirLeadDaLinha(tr) },
    filtros: [
      { chave: 'tipo', rotulo: 'Tipo do evento', opcoes: () => [...new Set(crmLeads.map(l => l.tipo_evento).filter(Boolean))].sort().map(v => [v, v]) },
      { chave: 'produto', rotulo: 'Produto/serviço', opcoes: () => [...new Set(crmLeads.map(l => l.event_name).filter(Boolean))].sort().map(v => [v, v]) },
      { chave: 'estado', rotulo: 'Estado', opcoes: () => [...new Set(crmLeads.map(l => l.estado).filter(Boolean))].sort().map(v => [v, v]) }
    ],
    importar: () => window.abrirImportacaoLeads?.(),
    exportar: () => tabelaExportarCSV('leads', [
      { titulo: 'ID', valor: l => l.numeroExibido },
      { titulo: 'Nome', valor: l => l.name },
      { titulo: 'E-mail', valor: l => l.email },
      { titulo: 'CPF', valor: l => l.cpf },
      { titulo: 'WhatsApp', valor: l => l.whatsapp },
      { titulo: 'Endereço', valor: l => l.endereco },
      { titulo: 'Estado', valor: l => l.estado },
      { titulo: 'Cidade', valor: l => l.cidade },
      { titulo: 'Tipo do evento', valor: l => l.tipo_evento },
      { titulo: 'Produto/serviço', valor: l => l.event_name },
      { titulo: 'Data do orçamento', valor: l => l.data_orcamento },
      { titulo: 'Data do evento', valor: l => l.event_date },
      { titulo: 'Orçamento', valor: l => (Number(l.value) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 }) }
    ], leadsFiltrados()),
    aoMudar: () => renderLeadsTable()
  });
  montarLixeiraDeLeads();
  renderLeadsTable(); // põe a contagem ao lado da busca, já na barra

  // Ao voltar de "Cadastrar serviço" (aberto em outra aba), atualiza a lista
  // de produtos do dropdown sem precisar recarregar a página.
  window.addEventListener('focus', async () => {
    await loadCrmProducts();
    renderLeadProductOptions();
  });
  window.b2bPageReady?.();
});

async function loadLeads() {
  const { data: { session } } = await supabaseClient.auth.getSession();
  if (!session) { crmLeads = []; return; }

  // Conversar no chat NÃO cria lead sozinho (LGPD: o cliente não consentiu
  // em entrar na base do fornecedor). Lead só entra adicionado ou importado
  // pelo fornecedor. Ver migration 058.

  const [leadsRes, convosRes] = await Promise.all([
    supabaseClient.from('leads').select('*').eq('fornecedor_id', empresaId(session)).order('created_at', { ascending: false }),
    supabaseClient.from('conversations').select('cliente_id').eq('fornecedor_id', empresaId(session))
  ]);

  crmLeads = leadsRes.error || !leadsRes.data ? [] : leadsRes.data;

  // ID do lead: número sequencial por fornecedor (coluna numero, migration
  // 055). Sem a migration, numera aqui pela ordem de criação.
  const porCriacao = [...crmLeads].sort((a, b) => String(a.created_at).localeCompare(String(b.created_at)));
  porCriacao.forEach((l, i) => { if (l.numero == null) l.numeroExibido = i + 1; else l.numeroExibido = l.numero; });

  // Todo lead começa "novo" e vira "em conversa" sozinho assim que existir
  // uma conversa de chat aberta com o cliente vinculado a ele.
  const clientesComConversa = new Set((convosRes.data || []).map(c => c.cliente_id));
  const toUpgrade = crmLeads.filter(l => l.status === 'novo' && l.cliente_id && clientesComConversa.has(l.cliente_id));
  if (toUpgrade.length) {
    await supabaseClient.from('leads').update({ status: 'conversa' }).in('id', toUpgrade.map(l => l.id));
    toUpgrade.forEach(l => { l.status = 'conversa'; });
  }
}

async function loadCrmProducts() {
  const { data: { session } } = await supabaseClient.auth.getSession();
  if (!session) { crmProducts = []; return; }

  const { data } = await supabaseClient
    .from('products')
    .select('id, name')
    .eq('fornecedor_id', empresaId(session))
    .order('name');

  crmProducts = data || [];
}

function renderLeadProductOptions() {
  const select = document.getElementById('lead-product');
  const link = document.getElementById('lead-add-product-link');
  if (!select || !link) return;

  const currentValue = select.value;
  if (!crmProducts.length) {
    select.innerHTML = '';
    select.hidden = true;
    link.classList.add('btn-secondary', 'justify-center', 'w-full', 'py-3');
    link.classList.remove('lead-add-product-link');
  } else {
    select.hidden = false;
    select.innerHTML = '<option value="">Selecione um produto/serviço</option>'
      + crmProducts.map(p => `<option value="${p.id}">${escapeHtml(p.name)}</option>`).join('');
    select.value = currentValue || '';
    link.classList.remove('btn-secondary', 'justify-center', 'w-full', 'py-3');
    link.classList.add('lead-add-product-link');
  }
}

/* -------------------- E-mail: busca e vincula a um cliente real -------------------- */

function initLeadEmailAutocomplete() {
  const input = document.getElementById('lead-email');
  const hint = document.getElementById('lead-email-match-hint');
  const options = document.getElementById('lead-email-options') || document.createElement('datalist');
  if (!input) return;

  // Sugestões de provedor ao digitar "@"; máscaras de data e de valor;
  // nome com maiúscula no início das palavras.
  // Botão de copiar no fim das caixas de e-mail, CPF, WhatsApp e endereço.
  ['lead-email', 'lead-cpf', 'lead-whatsapp', 'lead-endereco'].forEach(id => wireCopyField(document.getElementById(id)));
  wireEmailDomainSuggestions(input);
  wireNameCaseInput(document.getElementById('lead-name'));
  const dateInput = document.getElementById('lead-date');
  if (dateInput) wireDateMaskInput(dateInput);
  const quoteDateInput = document.getElementById('lead-quote-date');
  if (quoteDateInput) wireDateMaskInput(quoteDateInput);
  const valueInput = document.getElementById('lead-value');
  // "R$" fixo dentro da caixa (igual aos preços do catálogo); só o número é digitado.
  if (valueInput) { wireCurrencyMaskInput(valueInput); wireMoneyPrefix(valueInput); }

  // CPF (000.000.000-00) e WhatsApp com o DDD entre parênteses.
  const cpfInput = document.getElementById('lead-cpf');
  if (cpfInput) cpfInput.addEventListener('input', () => {
    cpfInput.value = formatCPF(cpfInput.value.replace(/\D/g, '').slice(0, 11));
  });
  const whatsInput = document.getElementById('lead-whatsapp');
  if (whatsInput) {
    // Vazio, já mostra os parênteses para a pessoa saber onde vai o DDD.
    whatsInput.placeholder = '(\u00a0\u00a0\u00a0\u00a0)';
    wirePhoneMaskInput(whatsInput);
    whatsInput.addEventListener('input', atualizarLinkWhatsAppDoLead);
  }

  // Estado antes da cidade; a cidade lista as do estado (base do IBGE).
  const estadoSelect = document.getElementById('lead-estado');
  if (estadoSelect && typeof BR_ESTADOS !== 'undefined' && estadoSelect.options.length <= 1) {
    BR_ESTADOS.forEach(({ uf, nome }) => {
      const opt = document.createElement('option');
      opt.value = uf;
      opt.textContent = `${uf} — ${nome}`;
      estadoSelect.appendChild(opt);
    });
  }
  estadoSelect?.addEventListener('change', () => {
    document.getElementById('lead-cidade').value = '';
    preencherCidadesDoLead(estadoSelect.value);
  });

  let timer = null;
  let lastMatches = [];

  input.addEventListener('input', () => {
    leadMatchedClienteId = null;
    if (hint) hint.hidden = true;
    const q = input.value.trim();
    clearTimeout(timer);
    if (q.length < 2) { options.innerHTML = ''; lastMatches = []; return; }

    timer = setTimeout(async () => {
      const { data } = await supabaseClient
        .from('clientes')
        .select('id, email, couple_name')
        .ilike('email', `%${q}%`)
        .limit(8);
      lastMatches = data || [];
      options.innerHTML = lastMatches.map(c => `<option value="${escapeHtml(c.email)}">${escapeHtml(c.couple_name || '')}</option>`).join('');

      const exact = lastMatches.find(c => c.email.toLowerCase() === input.value.trim().toLowerCase());
      if (exact) {
        leadMatchedClienteId = exact.id;
        if (hint) hint.hidden = false;
      }
    }, 300);
  });
}

async function resolveLeadClienteId(email) {
  if (!email) return null;
  if (leadMatchedClienteId) return leadMatchedClienteId;

  const { data } = await supabaseClient.from('clientes').select('id').ilike('email', email).maybeSingle();
  return data ? data.id : null;
}

/* -------------------- Abas por status -------------------- */

function renderLeadStatusTabs() {
  const wrap = document.getElementById('lead-status-tabs');
  if (!wrap) return;

  const statuses = ['todos', ...LEAD_STATUS_ORDER.filter(s => crmLeads.some(l => l.status === s))];
  wrap.innerHTML = statuses.map(s => `
    <button type="button" class="category-tab ${s === activeLeadStatus ? 'active' : ''}" data-lead-status="${s}">${s === 'todos' ? 'Todos os leads' : statusLabel(s)}</button>
  `).join('');

  wrap.querySelectorAll('[data-lead-status]').forEach(btn => {
    btn.addEventListener('click', () => {
      activeLeadStatus = btn.dataset.leadStatus;
      wrap.querySelectorAll('[data-lead-status]').forEach(b => b.classList.toggle('active', b === btn));
      renderLeadsTable();
    });
  });
}

/* -------------------- Tabela de leads -------------------- */

// Leads que passam na busca e nos filtros da barra da tabela.
function leadsFiltrados() {
  const est = leadsTabelaEstado || { busca: '', filtros: {} };
  return crmLeads.filter(l =>
    (!est.filtros.tipo || l.tipo_evento === est.filtros.tipo) &&
    (!est.filtros.produto || l.event_name === est.filtros.produto) &&
    (!est.filtros.estado || l.estado === est.filtros.estado) &&
    tabelaBateBusca(est, [l.name, l.tipo_evento, l.event_name, l.email, l.cpf, l.whatsapp, l.cidade, l.numeroExibido]));
}

function renderLeadsTable() {
  const tbody = document.getElementById('leads-table-body');
  if (!tbody) return;

  const items = leadsFiltrados();
  // Seleção: tira ids que não existem mais.
  const existentes = new Set(crmLeads.map(l => l.id));
  [...leadsSelecionados].forEach(id => { if (!existentes.has(id)) leadsSelecionados.delete(id); });

  setText('leads-count-label', `${items.length} ${items.length === 1 ? 'lead' : 'leads'}`);
  // A contagem fica na barra da tabela, logo à direita da busca.
  const contagem = document.getElementById('leads-count-label');
  const busca = document.querySelector('#leads-table-card .tabela-barra > .tabela-busca');
  if (contagem && busca && contagem.previousElementSibling !== busca) busca.after(contagem);
  if (!leadsPaginacao) leadsPaginacao = montarPaginacaoTabela(document.getElementById('leads-table-card'), () => renderLeadsTable());
  const daPagina = paginarLinhas(leadsPaginacao, items, JSON.stringify(leadsTabelaEstado ? [leadsTabelaEstado.busca, leadsTabelaEstado.filtros] : []));

  if (!items.length) {
    tbody.innerHTML = `<tr><td colspan="7" class="tabela-vazia-cheia">Nenhum lead encontrado.</td></tr>`;
    atualizarLixeiraDeLeads();
    return;
  }

  tbody.innerHTML = daPagina.map(lead => `
    <tr>
      <td class="col-id">${lead.numeroExibido || ''}</td>
      <td class="col-principal"><span class="lead-nome-cel${pedidoDoLead(lead) ? ' tem-origem' : ''}"><input type="checkbox" class="gifts-select-all-check" data-lead-check="${lead.id}"${leadsSelecionados.has(lead.id) ? ' checked' : ''} aria-label="Selecionar ${escapeHtml(lead.name)}"><span><button type="button" class="lead-nome-link" data-open-cliente="${lead.id}">${escapeHtml(lead.name)}</button>${pedidoDoLead(lead) ? '<span class="lead-origem-tag">Pedido pelo chat</span>' : ''}</span></span></td>
      <td>${escapeHtml(lead.tipo_evento || '—')}</td>
      <td>${escapeHtml(lead.event_name || '')}</td>
      <td>${escapeHtml(lead.event_date || '')}</td>
      <td>${formatCurrency(lead.value || 0)}</td>
      ${tabelaVerMaisHtml('data-open-lead', lead.id)}
    </tr>
  `).join('');

  // Nome e "ver mais" abrem a página do cliente (js/cliente-pagina.js), na
  // própria tela; a gaveta de edição fica no botão "Editar dados" de lá.
  const abrirCliente = id => (window.abrirClientePagina ? window.abrirClientePagina(id) : openLeadDrawer(id));
  tbody.querySelectorAll('[data-open-lead]').forEach(btn => {
    btn.addEventListener('click', () => abrirCliente(btn.dataset.openLead));
  });
  tbody.querySelectorAll('[data-open-cliente]').forEach(btn => {
    btn.addEventListener('click', () => abrirCliente(btn.dataset.openCliente));
  });
  tbody.querySelectorAll('[data-lead-check]').forEach(chk => {
    chk.addEventListener('change', () => {
      if (chk.checked) leadsSelecionados.add(chk.dataset.leadCheck);
      else leadsSelecionados.delete(chk.dataset.leadCheck);
      atualizarLixeiraDeLeads();
    });
  });
  atualizarLixeiraDeLeads();
}

/* -------------------- Exclusão em massa (caixinhas + lixeira) -------------------- */

const LEADS_ICONE_LIXEIRA = '<svg stroke-linejoin="round" stroke-linecap="round" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75"><path stroke-linecap="round" stroke-linejoin="round" d="M4 6.5h16"/><path stroke-linecap="round" stroke-linejoin="round" d="M9 6.5V4.5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/><path stroke-linecap="round" stroke-linejoin="round" d="M6.5 9.5V18a3 3 0 0 0 3 3h5a3 3 0 0 0 3-3V9.5"/><path stroke-linecap="round" stroke-linejoin="round" d="M10.5 11v5.5M13.5 11v5.5"/></svg>';

// Lixeira na barra da tabela, logo à esquerda do "Filtrar por". Só aparece
// com pelo menos 1 lead marcado.
function montarLixeiraDeLeads() {
  const acoes = document.querySelector('#leads-table-card .tabela-barra-acoes');
  if (!acoes || document.getElementById('leads-lixeira-btn')) return;
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.id = 'leads-lixeira-btn';
  btn.className = 'tabela-barra-btn tabela-lixeira-btn';
  btn.hidden = true;
  btn.innerHTML = LEADS_ICONE_LIXEIRA + '<span class="tabela-lixeira-qtd" id="leads-lixeira-qtd"></span>';
  acoes.insertBefore(btn, acoes.firstChild);
  btn.addEventListener('click', excluirLeadsSelecionados);

  document.getElementById('leads-selecionar-todos')?.addEventListener('change', (e) => {
    const visiveis = leadsFiltrados().map(l => l.id);
    visiveis.forEach(id => { if (e.target.checked) leadsSelecionados.add(id); else leadsSelecionados.delete(id); });
    renderLeadsTable();
  });
  atualizarLixeiraDeLeads();
}

function atualizarLixeiraDeLeads() {
  const n = leadsSelecionados.size;
  const btn = document.getElementById('leads-lixeira-btn');
  const qtdNome = document.getElementById('leads-qtd-selecionados');
  if (qtdNome) qtdNome.textContent = n ? ` (${n})` : '';
  if (btn) {
    btn.hidden = n === 0;
    // A quantidade selecionada fica ao lado de "Nome", não na lixeira.
    const qtd = document.getElementById('leads-lixeira-qtd');
    if (qtd) qtd.textContent = '';
    const texto = `Excluir ${n} ${n === 1 ? 'lead selecionado' : 'leads selecionados'}`;
    btn.title = texto;
    btn.setAttribute('aria-label', texto);
  }
  // "Selecionar tudo": marcado se todos os visíveis estão marcados; meio
  // marcado se só alguns.
  const todos = document.getElementById('leads-selecionar-todos');
  if (todos) {
    const visiveis = leadsFiltrados().map(l => l.id);
    const marcados = visiveis.filter(id => leadsSelecionados.has(id)).length;
    todos.checked = visiveis.length > 0 && marcados === visiveis.length;
    todos.indeterminate = marcados > 0 && marcados < visiveis.length;
  }
}

async function excluirLeadsSelecionados() {
  const ids = [...leadsSelecionados];
  if (!ids.length) return;
  const n = ids.length;
  await confirmarNoHub({
    titulo: `Deseja excluir ${n} ${n === 1 ? 'lead selecionado' : 'leads selecionados'}?`,
    texto: 'Essa ação não pode ser desfeita.',
    botao: 'Excluir',
    perigo: true,
    aoConfirmar: async () => {
      const { error } = await supabaseClient.from('leads').delete().in('id', ids);
      if (error) throw new Error('Não foi possível excluir os leads: ' + (error.message || 'tente de novo.'));
      const apagados = new Set(ids);
      crmLeads = crmLeads.filter(l => !apagados.has(l.id));
      leadsSelecionados.clear();
      renderLeadsTable();
      showToast(n === 1 ? 'Lead excluído.' : `${n} leads excluídos.`);
    }
  });
}

/* Celular: "Remover" do arrastar a linha para a esquerda. */
function excluirLeadDaLinha(tr) {
  const id = tr.querySelector('[data-open-lead]')?.dataset.openLead;
  const lead = crmLeads.find(l => String(l.id) === String(id));
  if (!lead) return;
  confirmarNoHub({
    titulo: `Remover ${lead.name}?`,
    texto: 'O cliente sai da sua lista. Essa ação não pode ser desfeita.',
    botao: 'Remover',
    aoConfirmar: async () => {
      const { error } = await supabaseClient.from('leads').delete().eq('id', lead.id);
      if (error) throw new Error('Não foi possível remover o cliente. Tente de novo.');
      crmLeads = crmLeads.filter(l => l.id !== lead.id);
      leadsSelecionados.delete(lead.id);
      renderLeadsTable();
      showToast('Cliente removido.');
    }
  });
}

/* -------------------- Drawer: adicionar / editar lead -------------------- */

function initLeadDrawer() {
  const addBtn = document.getElementById('lead-add-btn');
  const drawer = document.getElementById('lead-drawer');
  const backdrop = document.getElementById('lead-drawer-backdrop');
  const closeBtn = document.getElementById('lead-drawer-close');
  const cancelBtn = document.getElementById('lead-drawer-cancel');
  const deleteBtn = document.getElementById('lead-delete-btn');
  const form = document.getElementById('lead-form');
  const emailHint = document.getElementById('lead-email-match-hint');
  const commentsSection = document.getElementById('lead-comments-section');
  const subtitle = document.getElementById('lead-drawer-subtitle');

  const open = () => { drawer.classList.add('show'); backdrop.classList.add('show'); };
  const close = () => {
    drawer.classList.remove('show');
    backdrop.classList.remove('show');
    form.reset();
    delete form.dataset.editId;
    leadMatchedClienteId = null;
    if (emailHint) emailHint.hidden = true;
  };

  addBtn?.addEventListener('click', () => {
    form.reset();
    delete form.dataset.editId;
    leadMatchedClienteId = null;
    if (emailHint) emailHint.hidden = true;
    document.getElementById('lead-drawer-title').textContent = 'Adicionar lead';
    preencherCidadesDoLead('');
    atualizarLinkWhatsAppDoLead();
    if (subtitle) subtitle.hidden = false;
    const origem = document.getElementById('lead-origem');
    if (origem) origem.hidden = true;
    if (commentsSection) commentsSection.hidden = true;
    renderLeadProductOptions();
    deleteBtn.hidden = true;
    open();
  });
  closeBtn?.addEventListener('click', close);
  cancelBtn?.addEventListener('click', close);
  backdrop?.addEventListener('click', close);

  deleteBtn?.addEventListener('click', async () => {
    const id = form.dataset.editId;
    if (!id) return;
    const { error } = await supabaseClient.from('leads').delete().eq('id', id);
    if (error) { showToast('Não foi possível remover o lead.', true); return; }
    await loadLeads();
    close();
    renderLeadStatusTabs();
    renderLeadsTable();
    showToast('Lead removido.');
  });

  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('lead-name').value.trim();
    const email = document.getElementById('lead-email').value.trim();
    const productId = document.getElementById('lead-product').value || null;
    const event_date = document.getElementById('lead-date').value.trim();
    const value = currencyMaskValue(document.getElementById('lead-value')) || 0;
    const val = id => (document.getElementById(id)?.value || '').trim() || null;
    const dadosCliente = {
      cpf: val('lead-cpf'),
      whatsapp: val('lead-whatsapp'),
      endereco: val('lead-endereco'),
      estado: val('lead-estado'),
      cidade: val('lead-cidade'),
      data_orcamento: val('lead-quote-date')
    };

    if (!name) {
      showToast('Preencha o nome do lead.', true);
      return;
    }

    const { data: { session } } = await supabaseClient.auth.getSession();
    if (!session) return;

    const cliente_id = await resolveLeadClienteId(email);
    const product = productId ? crmProducts.find(p => p.id === productId) : null;
    const payload = {
      name,
      email: email || null,
      cliente_id,
      product_id: productId,
      event_name: product ? product.name : null,
      event_date,
      value,
      ...dadosCliente
    };

    // Sem a migration 054 o banco não tem as colunas novas: salva o resto e avisa.
    const gravar = async (dados) => form.dataset.editId
      ? supabaseClient.from('leads').update(dados).eq('id', form.dataset.editId)
      : supabaseClient.from('leads').insert(Object.assign({ fornecedor_id: empresaId(session) }, dados));
    let { error } = await gravar(payload);
    if (error && /column|schema cache/i.test(error.message || '')) {
      const semNovos = { ...payload };
      Object.keys(dadosCliente).forEach(k => delete semNovos[k]);
      ({ error } = await gravar(semNovos));
      if (!error) showToast('CPF, WhatsApp, endereço e datas não foram salvos: rode a migration 054 no Supabase.', true);
    }
    if (error) {
      showToast(form.dataset.editId ? 'Não foi possível atualizar o lead.' : 'Não foi possível adicionar o lead.', true);
      return;
    }
    if (form.dataset.editId) showToast('Lead atualizado.'); else avisarAdicionado(name, 'Lead adicionado.');

    await loadLeads();
    close();
    renderLeadStatusTabs();
    renderLeadsTable();
  });

  document.getElementById('lead-comment-submit')?.addEventListener('click', submitLeadComment);
  document.getElementById('lead-comment-input')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submitLeadComment(); }
  });
  document.getElementById('lead-activity-list')?.addEventListener('click', (e) => {
    const btn = e.target.closest('.task-activity-comment-delete');
    if (btn) deleteLeadComment(btn.dataset.commentId);
  });
}

function openLeadDrawer(id) {
  const lead = crmLeads.find(l => l.id === id);
  if (!lead) return;

  // Veio de um pedido de orçamento do chat: mostra a origem e "Criar orçamento".
  const pedido = pedidoDoLead(lead);
  const origem = document.getElementById('lead-origem');
  if (origem) {
    origem.hidden = !pedido;
    const btn = document.getElementById('lead-criar-orcamento');
    if (btn) btn.onclick = () => {
      window.location.href = urlCriarOrcamento({
        leadId: lead.id,
        clienteId: lead.cliente_id,
        servico: (pedido && pedido.servico) || lead.event_name || '',
        data: (pedido && pedido.data) || lead.event_date || '',
        convidados: pedido && pedido.convidados,
        evento: pedido && pedido.evento,
        local: pedido && pedido.local
      });
    };
  }

  document.getElementById('lead-drawer-title').textContent = 'Editar lead';
  document.getElementById('lead-cpf').value = lead.cpf || '';
  document.getElementById('lead-whatsapp').value = lead.whatsapp || '';
  atualizarLinkWhatsAppDoLead();
  document.getElementById('lead-endereco').value = lead.endereco || '';
  document.getElementById('lead-estado').value = lead.estado || '';
  preencherCidadesDoLead(lead.estado || '');
  document.getElementById('lead-cidade').value = lead.cidade || '';
  document.getElementById('lead-quote-date').value = lead.data_orcamento || '';
  document.getElementById('lead-name').value = lead.name;
  document.getElementById('lead-email').value = lead.email || '';
  document.getElementById('lead-date').value = lead.event_date || '';
  document.getElementById('lead-value').value = formatBRLValue(lead.value).replace(/^R\$\s*/, '');

  leadMatchedClienteId = lead.cliente_id || null;
  const emailHint = document.getElementById('lead-email-match-hint');
  if (emailHint) emailHint.hidden = !lead.cliente_id;

  renderLeadProductOptions();
  const productSelect = document.getElementById('lead-product');
  if (productSelect && !productSelect.hidden) productSelect.value = lead.product_id || '';

  const subtitle = document.getElementById('lead-drawer-subtitle');
  if (subtitle) subtitle.hidden = true;

  const commentsSection = document.getElementById('lead-comments-section');
  if (commentsSection) commentsSection.hidden = false;
  renderLeadComments(lead);

  const form = document.getElementById('lead-form');
  form.dataset.editId = lead.id;
  document.getElementById('lead-delete-btn').hidden = false;

  document.getElementById('lead-drawer').classList.add('show');
  document.getElementById('lead-drawer-backdrop').classList.add('show');
}

/* -------------------- Copiar o conteúdo de um campo -------------------- */

function wireCopyField(input) {
  if (!input || input.parentElement.classList.contains('field-copy-wrap')) return;
  const wrap = document.createElement('div');
  wrap.className = 'field-copy-wrap';
  input.parentNode.insertBefore(wrap, input);
  wrap.appendChild(input);
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'field-copy-btn';
  btn.title = 'Copiar';
  btn.setAttribute('aria-label', 'Copiar');
  btn.innerHTML = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/></svg>';
  btn.addEventListener('click', async () => {
    const texto = input.value.trim();
    if (!texto) { showToast('Nada para copiar.', true); return; }
    try {
      await navigator.clipboard.writeText(texto);
    } catch (e) {
      input.select();
      document.execCommand('copy');
    }
    showToast('Copiado.');
  });
  wrap.appendChild(btn);
}

/* -------------------- WhatsApp do lead -------------------- */

// Número completo (DDD + 8 ou 9 dígitos): o ícone vira link para a conversa.
function atualizarLinkWhatsAppDoLead() {
  const input = document.getElementById('lead-whatsapp');
  const link = document.getElementById('lead-whatsapp-link');
  if (!input || !link) return;
  const digitos = input.value.replace(/\D/g, '');
  if (digitos.length >= 10) {
    link.href = 'https://wa.me/55' + digitos;
    link.classList.add('is-ativo');
    link.title = 'Abrir conversa no WhatsApp';
  } else {
    link.removeAttribute('href');
    link.classList.remove('is-ativo');
    link.title = '';
  }
}

/* -------------------- Cidade do lead (depende do estado) -------------------- */

function preencherCidadesDoLead(uf) {
  const input = document.getElementById('lead-cidade');
  const lista = document.getElementById('lead-cidade-options');
  if (!input || !lista) return;
  const cidades = (typeof BR_CIDADES_POR_UF !== 'undefined' && BR_CIDADES_POR_UF[uf]) || [];
  lista.innerHTML = cidades.map(c => `<option value="${escapeHtml(c)}">`).join('');
  input.disabled = !uf;
  input.placeholder = uf ? 'Digite ou escolha a cidade' : 'Escolha o estado primeiro';
}

/* -------------------- Importar lista de leads (CSV) -------------------- */

// Cabeçalhos aceitos na planilha (sem acento, minúsculo) → campo do lead.
const LEAD_IMPORT_COLUNAS = {
  nome: 'name', name: 'name', cliente: 'name',
  email: 'email', 'e-mail': 'email',
  cpf: 'cpf',
  whatsapp: 'whatsapp', telefone: 'whatsapp', celular: 'whatsapp', fone: 'whatsapp',
  endereco: 'endereco',
  estado: 'estado', uf: 'estado',
  cidade: 'cidade',
  'data do orcamento': 'data_orcamento', 'data orcamento': 'data_orcamento',
  'data do evento': 'event_date', 'data evento': 'event_date', data: 'event_date',
  orcamento: 'value', valor: 'value'
};

const LEAD_IMPORT_MODELO = [
  'Nome;E-mail;CPF;WhatsApp;Endereço;Estado;Cidade;Data do orçamento;Data do evento;Orçamento',
  'Maria da Silva;maria@email.com;123.456.789-00;(11) 98765-4321;Rua das Flores, 100;SP;São Paulo;15/10/2026;20/03/2027;15000,00'
].join('\r\n');

function normalizarCabecalho(texto) {
  return String(texto || '').trim().toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, ' ');
}

// CSV simples com aspas; separador ; (Excel em português) ou , (Google).
function lerCsv(texto) {
  const linhas = [];
  const primeira = texto.split(/\r?\n/)[0] || '';
  const sep = (primeira.match(/;/g) || []).length >= (primeira.match(/,/g) || []).length ? ';' : ',';
  let linha = [], campo = '', aspas = false;
  for (let i = 0; i < texto.length; i++) {
    const c = texto[i];
    if (aspas) {
      if (c === '"' && texto[i + 1] === '"') { campo += '"'; i++; }
      else if (c === '"') aspas = false;
      else campo += c;
    } else if (c === '"') aspas = true;
    else if (c === sep) { linha.push(campo); campo = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && texto[i + 1] === '\n') i++;
      linha.push(campo); campo = '';
      if (linha.some(v => v.trim())) linhas.push(linha);
      linha = [];
    } else campo += c;
  }
  linha.push(campo);
  if (linha.some(v => v.trim())) linhas.push(linha);
  return linhas;
}

function valorEmReais(texto) {
  const limpo = String(texto || '').replace(/[^\d,.-]/g, '');
  if (!limpo) return 0;
  // "15.000,50" → 15000.50; "15000.50" → 15000.50
  const numero = limpo.includes(',') ? limpo.replace(/\./g, '').replace(',', '.') : limpo;
  return Number(numero) || 0;
}

function initLeadImport() {
  const modal = document.getElementById('lead-import-modal');
  const fileInput = document.getElementById('lead-import-file');
  const status = document.getElementById('lead-import-status');
  if (!modal || !fileInput) return;

  const abrir = () => { status.hidden = true; fileInput.value = ''; modal.classList.add('show'); };
  const fechar = () => modal.classList.remove('show');

  document.getElementById('lead-import-btn')?.addEventListener('click', abrir);
  window.abrirImportacaoLeads = abrir;
  document.getElementById('lead-import-close')?.addEventListener('click', fechar);
  modal.addEventListener('click', e => { if (e.target === modal) fechar(); });
  document.getElementById('lead-import-choose')?.addEventListener('click', () => fileInput.click());

  document.getElementById('lead-import-template')?.addEventListener('click', () => {
    const blob = new Blob(['﻿' + LEAD_IMPORT_MODELO], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'modelo-importar-leads.csv';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  });

  fileInput.addEventListener('change', async () => {
    const arquivo = fileInput.files && fileInput.files[0];
    if (!arquivo) return;
    const mostrar = (texto) => { status.textContent = texto; status.hidden = false; };

    const texto = (await arquivo.text()).replace(/^﻿/, '');
    const linhas = lerCsv(texto);
    if (linhas.length < 2) return mostrar('A planilha precisa ter o cabeçalho e pelo menos uma linha de lead.');

    const campos = linhas[0].map(h => LEAD_IMPORT_COLUNAS[normalizarCabecalho(h)] || null);
    if (!campos.includes('name')) return mostrar('Não achei a coluna "Nome". Use o modelo para ver os nomes das colunas.');

    const { data: { session } } = await supabaseClient.auth.getSession();
    if (!session) return;

    const leads = linhas.slice(1).map(cols => {
      const lead = { fornecedor_id: empresaId(session), status: 'novo' };
      campos.forEach((campo, i) => {
        if (!campo) return;
        const v = String(cols[i] || '').trim();
        if (!v) return;
        if (campo === 'value') lead.value = valorEmReais(v);
        else if (campo === 'cpf') lead.cpf = formatCPF(v.replace(/\D/g, '').slice(0, 11));
        else if (campo === 'whatsapp') lead.whatsapp = formatPhoneDigits(v.replace(/\D/g, '').replace(/^55(?=\d{10,11}$)/, '').slice(0, 11));
        else if (campo === 'estado') lead.estado = v.toUpperCase().slice(0, 2);
        else if (campo === 'name') lead.name = maiusculaNoNome(v);
        else lead[campo] = v;
      });
      return lead;
    }).filter(l => l.name);

    if (!leads.length) return mostrar('Nenhuma linha com nome para importar.');

    mostrar(`Importando ${leads.length} ${leads.length === 1 ? 'lead' : 'leads'}…`);
    let { error } = await supabaseClient.from('leads').insert(leads);
    let aviso = '';
    if (error && /column|schema cache/i.test(error.message || '')) {
      // Sem a migration 054: importa só nome, e-mail, data do evento e orçamento.
      const basicos = leads.map(({ fornecedor_id, status: st, name, email, event_date, value }) =>
        ({ fornecedor_id, status: st, name, email: email || null, event_date: event_date || null, value: value || 0 }));
      ({ error } = await supabaseClient.from('leads').insert(basicos));
      aviso = ' CPF, WhatsApp, endereço e datas ficaram de fora: rode a migration 054 no Supabase.';
    }
    if (error) return mostrar('Não foi possível importar a lista. Confira o arquivo e tente de novo.');

    await loadLeads();
    renderLeadStatusTabs();
    renderLeadsTable();
    mostrar(`${leads.length} ${leads.length === 1 ? 'lead importado' : 'leads importados'}.${aviso}`);
    showToast(`${leads.length} ${leads.length === 1 ? 'lead importado' : 'leads importados'}.`);
  });
}

/* -------------------- Observações e comentários -------------------- */

function currentCrmUserName() {
  return (typeof B2B_DATA !== 'undefined' && B2B_DATA.professional && B2B_DATA.professional.name) || 'Você';
}

function formatLeadActivityDate(iso) {
  const d = new Date(iso);
  const datePart = d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
  const timePart = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  return `${datePart}, ${timePart}`;
}

function renderLeadActivityEntry(entry) {
  const avatar = initials(entry.user || 'Você');
  const when = formatLeadActivityDate(entry.at);
  return `
    <div class="task-activity-item">
      <span class="task-activity-avatar">${avatar}</span>
      <div class="task-activity-content">
        <p class="task-activity-line">
          <strong>${escapeHtml(entry.user)}</strong> adicionou um comentário
          <button type="button" class="task-activity-comment-delete" data-comment-id="${entry.id}" title="Apagar comentário" aria-label="Apagar comentário">
            <svg stroke-linejoin="round" stroke-linecap="round" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75"><path stroke-linecap="round" stroke-linejoin="round" d="M4 6.5h16"/><path stroke-linecap="round" stroke-linejoin="round" d="M9 6.5V4.5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/><path stroke-linecap="round" stroke-linejoin="round" d="M6.5 9.5V18a3 3 0 0 0 3 3h5a3 3 0 0 0 3-3V9.5"/><path stroke-linecap="round" stroke-linejoin="round" d="M10.5 11v5.5M13.5 11v5.5"/></svg>
          </button>
        </p>
        <p class="task-activity-comment-text">${escapeHtml(entry.text || '')}</p>
        <p class="task-activity-time">${when}</p>
      </div>
    </div>
  `;
}

function renderLeadComments(lead) {
  const list = document.getElementById('lead-activity-list');
  if (!list) return;
  const entries = (lead.comentarios || []).slice().reverse();
  list.innerHTML = entries.length
    ? entries.map(renderLeadActivityEntry).join('')
    : '<p class="task-activity-empty">Nenhum comentário ainda.</p>';
}

async function submitLeadComment() {
  const input = document.getElementById('lead-comment-input');
  const form = document.getElementById('lead-form');
  const id = form?.dataset.editId;
  if (!input || !id) return;
  const text = input.value.trim();
  if (!text) return;

  const lead = crmLeads.find(l => l.id === id);
  if (!lead) return;
  if (!lead.comentarios) lead.comentarios = [];
  lead.comentarios.push({ id: 'com-' + Date.now(), user: currentCrmUserName(), text, at: new Date().toISOString() });
  input.value = '';

  await supabaseClient.from('leads').update({ comentarios: lead.comentarios }).eq('id', id);
  renderLeadComments(lead);
}

async function deleteLeadComment(commentId) {
  if (!commentId) return;
  const form = document.getElementById('lead-form');
  const id = form?.dataset.editId;
  const lead = crmLeads.find(l => l.id === id);
  if (!lead) return;
  lead.comentarios = (lead.comentarios || []).filter(entry => entry.id !== commentId);
  await supabaseClient.from('leads').update({ comentarios: lead.comentarios }).eq('id', id);
  renderLeadComments(lead);
}
