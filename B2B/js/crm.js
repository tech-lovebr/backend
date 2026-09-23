/* ==========================================================================
   LOVE B2B — Contatos (lista de leads e oportunidades, dados reais via Supabase)
   ========================================================================== */

const LEAD_STATUS_ORDER = ['novo', 'conversa', 'proposta', 'fechado'];

let activeLeadStatus = 'todos';
let leadSearchQuery = '';
let crmLeads = [];

document.addEventListener('DOMContentLoaded', async () => {
  await window.b2bAuthReady;
  initGmailSyncBanner();
  await loadLeads();
  renderLeadStatusTabs();
  renderLeadsTable();
  initLeadDrawer();

  document.getElementById('lead-search-input')?.addEventListener('input', (e) => {
    leadSearchQuery = e.target.value.trim();
    renderLeadsTable();
  });
});

async function loadLeads() {
  const { data: { session } } = await supabaseClient.auth.getSession();
  if (!session) { crmLeads = []; return; }

  const { data, error } = await supabaseClient
    .from('leads')
    .select('*')
    .eq('fornecedor_id', session.user.id)
    .order('created_at', { ascending: false });

  crmLeads = error || !data ? [] : data;
}

/* -------------------- Banner de sincronização do Gmail -------------------- */

function initGmailSyncBanner() {
  const GMAIL_SYNC_KEY = 'b2b-gmail-connected';
  const banner = document.getElementById('gmail-sync-banner');
  if (!banner) return;

  if (localStorage.getItem(GMAIL_SYNC_KEY) === '1') {
    banner.remove();
    return;
  }

  document.getElementById('gmail-sync-banner-close')?.addEventListener('click', () => {
    banner.remove();
  });

  document.getElementById('gmail-sync-connect-btn')?.addEventListener('click', () => {
    localStorage.setItem(GMAIL_SYNC_KEY, '1');
    showToast('Gmail conectado! Sincronizando seus contatos e conversas.');
    banner.style.opacity = '0';
    setTimeout(() => banner.remove(), 200);
  });
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
      <td class="font-medium text-zinc-900">${escapeHtml(lead.name)}</td>
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

  const open = () => { drawer.classList.add('show'); backdrop.classList.add('show'); };
  const close = () => {
    drawer.classList.remove('show');
    backdrop.classList.remove('show');
    form.reset();
    delete form.dataset.editId;
  };

  addBtn?.addEventListener('click', () => {
    form.reset();
    delete form.dataset.editId;
    document.getElementById('lead-drawer-title').textContent = 'Novo contato';
    document.getElementById('lead-status').value = 'novo';
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
    const event_name = document.getElementById('lead-event').value.trim();
    const event_date = document.getElementById('lead-date').value.trim();
    const value = Number(document.getElementById('lead-value').value) || 0;
    const status = document.getElementById('lead-status').value;

    if (!name || !event_name) {
      showToast('Preencha nome e evento do contato.', true);
      return;
    }

    const { data: { session } } = await supabaseClient.auth.getSession();
    if (!session) return;

    if (form.dataset.editId) {
      const { error } = await supabaseClient
        .from('leads')
        .update({ name, event_name, event_date, value, status })
        .eq('id', form.dataset.editId);
      if (error) { showToast('Não foi possível atualizar o contato.', true); return; }
      showToast('Contato atualizado.');
    } else {
      const { error } = await supabaseClient
        .from('leads')
        .insert({ fornecedor_id: session.user.id, name, event_name, event_date, value, status });
      if (error) { showToast('Não foi possível adicionar o contato.', true); return; }
      showToast('Contato adicionado.');
    }

    await loadLeads();
    close();
    renderLeadStatusTabs();
    renderLeadsTable();
  });
}

function openLeadDrawer(id) {
  const lead = crmLeads.find(l => l.id === id);
  if (!lead) return;

  document.getElementById('lead-drawer-title').textContent = 'Editar contato';
  document.getElementById('lead-name').value = lead.name;
  document.getElementById('lead-event').value = lead.event_name || '';
  document.getElementById('lead-date').value = lead.event_date || '';
  document.getElementById('lead-value').value = lead.value || 0;
  document.getElementById('lead-status').value = lead.status;

  const form = document.getElementById('lead-form');
  form.dataset.editId = lead.id;
  document.getElementById('lead-delete-btn').hidden = false;

  document.getElementById('lead-drawer').classList.add('show');
  document.getElementById('lead-drawer-backdrop').classList.add('show');
}
