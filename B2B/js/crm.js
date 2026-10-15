/* ==========================================================================
   LOVE B2B — Contatos (lista de leads e oportunidades, dados reais via Supabase)
   ========================================================================== */

const LEAD_STATUS_ORDER = ['novo', 'conversa', 'proposta', 'fechado'];

let activeLeadStatus = 'todos';
let leadSearchQuery = '';
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

  document.getElementById('lead-search-input')?.addEventListener('input', (e) => {
    leadSearchQuery = e.target.value.trim();
    renderLeadsTable();
  });

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

  const [leadsRes, convosRes] = await Promise.all([
    supabaseClient.from('leads').select('*').eq('fornecedor_id', session.user.id).order('created_at', { ascending: false }),
    supabaseClient.from('conversations').select('cliente_id').eq('fornecedor_id', session.user.id)
  ]);

  crmLeads = leadsRes.error || !leadsRes.data ? [] : leadsRes.data;

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
    .eq('fornecedor_id', session.user.id)
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

  // Sugestões de provedor ao digitar "@"; máscaras de data e de valor.
  wireEmailDomainSuggestions(input);
  const dateInput = document.getElementById('lead-date');
  if (dateInput) wireDateMaskInput(dateInput);
  const valueInput = document.getElementById('lead-value');
  if (valueInput) wireBRLMaskInput(valueInput);

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
    <button type="button" class="category-tab ${s === activeLeadStatus ? 'active' : ''}" data-lead-status="${s}">${s === 'todos' ? 'Todos os contatos' : statusLabel(s)}</button>
  `).join('');

  wrap.querySelectorAll('[data-lead-status]').forEach(btn => {
    btn.addEventListener('click', () => {
      activeLeadStatus = btn.dataset.leadStatus;
      wrap.querySelectorAll('[data-lead-status]').forEach(b => b.classList.toggle('active', b === btn));
      renderLeadsTable();
    });
  });
}

/* -------------------- Tabela de contatos -------------------- */

function renderLeadsTable() {
  const tbody = document.getElementById('leads-table-body');
  if (!tbody) return;

  let items = activeLeadStatus === 'todos'
    ? crmLeads
    : crmLeads.filter(l => l.status === activeLeadStatus);

  if (leadSearchQuery) {
    const q = leadSearchQuery.toLowerCase();
    items = items.filter(l => l.name.toLowerCase().includes(q) || (l.event_name || '').toLowerCase().includes(q));
  }

  setText('leads-count-label', `${items.length} ${items.length === 1 ? 'contato' : 'contatos'}`);

  if (!items.length) {
    tbody.innerHTML = `<tr><td colspan="5" class="text-sm text-zinc-500 py-6 text-center">Nenhum contato encontrado.</td></tr>`;
    return;
  }

  tbody.innerHTML = items.map(lead => `
    <tr data-open-lead="${lead.id}" style="cursor:pointer;">
      <td class="col-principal">${escapeHtml(lead.name)}</td>
      <td>${escapeHtml(lead.event_name || '')}</td>
      <td>${escapeHtml(lead.event_date || '')}</td>
      <td>${formatCurrency(lead.value || 0)}</td>
      <td><span class="text-sm text-zinc-700">${statusLabel(lead.status)}</span></td>
    </tr>
  `).join('');

  tbody.querySelectorAll('[data-open-lead]').forEach(row => {
    row.addEventListener('click', () => openLeadDrawer(row.dataset.openLead));
  });
}

/* -------------------- Drawer: novo / editar contato -------------------- */

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
    document.getElementById('lead-drawer-title').textContent = 'Novo contato';
    if (subtitle) subtitle.hidden = false;
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
    if (error) { showToast('Não foi possível remover o contato.', true); return; }
    await loadLeads();
    close();
    renderLeadStatusTabs();
    renderLeadsTable();
    showToast('Contato removido.');
  });

  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('lead-name').value.trim();
    const email = document.getElementById('lead-email').value.trim();
    const productId = document.getElementById('lead-product').value || null;
    const event_date = document.getElementById('lead-date').value.trim();
    const value = currencyMaskValue(document.getElementById('lead-value')) || 0;

    if (!name) {
      showToast('Preencha o nome do contato.', true);
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
      value
    };

    if (form.dataset.editId) {
      const { error } = await supabaseClient.from('leads').update(payload).eq('id', form.dataset.editId);
      if (error) { showToast('Não foi possível atualizar o contato.', true); return; }
      showToast('Contato atualizado.');
    } else {
      const { error } = await supabaseClient
        .from('leads')
        .insert(Object.assign({ fornecedor_id: session.user.id }, payload));
      if (error) { showToast('Não foi possível adicionar o contato.', true); return; }
      showToast('Contato adicionado.');
    }

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

  document.getElementById('lead-drawer-title').textContent = 'Editar contato';
  document.getElementById('lead-name').value = lead.name;
  document.getElementById('lead-email').value = lead.email || '';
  document.getElementById('lead-date').value = lead.event_date || '';
  document.getElementById('lead-value').value = formatBRLValue(lead.value);

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
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path stroke-linecap="round" stroke-linejoin="round" d="M6 7h12M9.5 7V5a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1v2m-8 0 .6 12.2A2 2 0 0 0 9.1 21h5.8a2 2 0 0 0 2-1.8L17.5 7M10 11v6M14 11v6"/></svg>
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
