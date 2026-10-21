/* ==========================================================================
   LOVE B2B — Vendas › Meus contratos
   Clientes com contrato, painel do evento, convidados e os drawers de
   contrato e convidado. Saiu de Gestão de Trabalho (agenda.js).
   ========================================================================== */

document.addEventListener('DOMContentLoaded', async () => {
  await window.b2bAuthReady;
  await initContratosTab();
});

function formatActivityDate(iso) {
  const d = new Date(iso);
  const datePart = d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
  const timePart = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  return `${datePart}, ${timePart}`;
}

/* -------------------- Aba: Meus Contratos -------------------- */

const CONTRATO_STATUS_LABELS = {
  quitado: { label: 'Finalizado', className: 'status-text status-neutral-dark' },
  em_dia: { label: 'Em dia', className: 'status-text status-inativo' },
  atrasado: { label: 'Inadimplente', className: 'status-text status-recusado' }
};

const CONVIDADO_STATUS_LABELS = {
  confirmado: { label: 'Confirmado', className: 'status-text status-ativo' },
  pendente: { label: 'Pendente', className: 'status-text status-pendente' },
  recusado: { label: 'Recusado', className: 'status-text status-recusado' }
};

const CONTRATOS_EYE_ICON_SVG = '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path stroke-linecap="round" stroke-linejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z"/><path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"/></svg>';

let selectedContratoId = null;

function formatEventoData(iso, horario) {
  if (!iso) return '—';
  const d = new Date(iso + 'T00:00:00');
  const dateLabel = capitalize(d.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' }));
  return horario ? `${dateLabel} · ${horario}` : dateLabel;
}

function formatEventoCountdown(iso) {
  if (!iso) return '';
  const eventDate = new Date(iso + 'T00:00:00');
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diffDays = Math.round((eventDate - today) / 86400000);
  if (diffDays > 1) return `Faltam ${diffDays} dias`;
  if (diffDays === 1) return 'Falta 1 dia';
  if (diffDays === 0) return 'É hoje';
  return 'Evento realizado';
}

let bContratosAbertos = [];

async function loadContratosAbertos() {
  const { data: { session } } = await supabaseClient.auth.getSession();
  if (!session) { bContratosAbertos = []; return; }

  const { data, error } = await supabaseClient
    .from('contracts')
    .select('*, contract_guests(*)')
    .eq('fornecedor_id', empresaId(session))
    .order('created_at', { ascending: false });

  bContratosAbertos = error || !data ? [] : data.map(c => ({
    id: c.id,
    client: c.client_name,
    phone: c.client_phone,
    categoria: c.categoria,
    valorTotal: c.valor_total,
    valorPago: c.valor_pago,
    parcelasPagas: c.parcelas_pagas,
    parcelasTotal: c.parcelas_total,
    status: c.status,
    evento: c.evento || {},
    convidados: (c.contract_guests || []).map(g => ({
      id: g.id,
      nome: g.nome,
      status: g.status,
      mesa: g.mesa,
      whatsapp: g.whatsapp,
      comentarios: g.comentarios || []
    }))
  }));

  // SANDBOX: sem nenhum contrato ainda, mostra um de exemplo (js/contratos-nf.js).
  if (!bContratosAbertos.length && typeof CONTRATO_EXEMPLO === 'function') bContratosAbertos = [CONTRATO_EXEMPLO()];
  if (typeof carregarNotasDosContratos === 'function') await carregarNotasDosContratos(session);
}

function findContrato(id) {
  return bContratosAbertos.find(c => c.id === id);
}

let contratosStatusFilter = 'todos';
let contratosStatusFilterOpen = false;
let contratosTabelaEstado = null;

// Contratos que passam na busca e nos filtros da barra da tabela.
function contratosClientesFiltrados() {
  const est = contratosTabelaEstado || { busca: '', filtros: {} };
  return (bContratosAbertos || []).filter(c => !!c.evento).filter(c =>
    (!est.filtros.status || c.status === est.filtros.status) &&
    (!est.filtros.categoria || (c.categoria || '') === est.filtros.categoria) &&
    tabelaBateBusca(est, [c.client, c.categoria, produtoDoContrato(c)]));
}

// Produto/serviço escolhido pelo cliente (fica no JSON do evento do contrato).
function produtoDoContrato(c) {
  const ev = c.evento || {};
  return ev.produto || ev.servico || ev.produto_nome || ev.product || '';
}

function dataCurtaDoEvento(iso) {
  if (!iso) return '—';
  const d = new Date(iso + 'T00:00:00');
  return isNaN(d) ? '—' : d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function renderContratosClientes() {
  const body = document.getElementById('contratos-clientes-body');
  if (!body) return;
  let rows = contratosClientesFiltrados();
  rows = rows.slice().sort((a, b) => (a.status === 'quitado' ? 1 : 0) - (b.status === 'quitado' ? 1 : 0));

  body.innerHTML = rows.length
    ? rows.map(c => {
      const aberto = c.id === selectedContratoId;
      const convidados = (c.convidados || []).length;
      return `
      <tr class="contratos-cliente-row${aberto ? ' is-selected' : ''}" data-contrato-row="${escapeHtml(c.id)}">
        <td class="contratos-cliente-name-cell col-principal">${escapeHtml(c.client)}${c.exemplo ? ' <span class="contrato-exemplo">Exemplo</span>' : ''}</td>
        <td>${escapeHtml(c.categoria || '—')}</td>
        <td>${escapeHtml(produtoDoContrato(c) || '—')}</td>
        <td>${dataCurtaDoEvento(c.evento && c.evento.data)}</td>
        <td>${convidados}</td>
        ${typeof nfMenuHtml === 'function' ? nfMenuHtml(c) : tabelaVerMaisHtml('data-contrato-select', c.id)}
      </tr>
      ${aberto ? renderContratoDetalheRow(c) : ''}
    `;
    }).join('')
    : `<tr><td colspan="6" class="text-center text-sm text-zinc-500" style="padding:1.5rem 0;">Nenhum contrato fechado no momento.</td></tr>`;

  // Clicar na linha (ou no "ver mais") abre/fecha os detalhes logo abaixo.
  body.querySelectorAll('[data-contrato-row]').forEach(tr => {
    tr.addEventListener('click', (e) => {
      if (e.target.closest('.contrato-menu-wrap')) return;
      if (String(window.getSelection && window.getSelection()).trim()) return;
      selectContrato(tr.dataset.contratoRow);
    });
  });
  body.querySelectorAll('[data-contrato-vermais]').forEach(btn => {
    btn.addEventListener('click', (e) => { e.stopPropagation(); openContratoDrawer(); });
  });
  body.querySelectorAll('[data-convidado-select]').forEach(btn => {
    btn.addEventListener('click', (e) => { e.stopPropagation(); openConvidadoDrawer(btn.dataset.convidadoSelect); });
  });
}

// Detalhes do contrato dentro da própria tabela: evento, status e convidados.
function renderContratoDetalheRow(c) {
  const ev = c.evento || {};
  const info = CONTRATO_STATUS_LABELS[c.status] || CONTRATO_STATUS_LABELS.em_dia;
  const convidados = c.convidados || [];
  const linhasConvidados = convidados.length
    ? convidados.map(g => {
      const st = CONVIDADO_STATUS_LABELS[g.status] || CONVIDADO_STATUS_LABELS.pendente;
      return `
          <tr class="contratos-convidado-row">
            <td class="col-principal">${escapeHtml(g.nome)}</td>
            <td><span class="${st.className}">${st.label}</span></td>
            <td>${g.mesa ? escapeHtml(g.mesa) : '—'}</td>
            <td>${g.whatsapp ? escapeHtml(g.whatsapp) : '—'}</td>
            ${tabelaVerMaisHtml('data-convidado-select', g.id)}
          </tr>`;
    }).join('')
    : `<tr><td colspan="5" class="text-center text-sm text-zinc-500" style="padding:1rem 0;">Nenhum convidado cadastrado.</td></tr>`;

  return `
      <tr class="contratos-detalhe-row">
        <td colspan="6">
          <div class="contratos-detalhe">
            <div class="contratos-evento-header-row">
              <p class="contratos-evento-label">Evento</p>
              <div class="contratos-evento-header-actions">
                <span class="contratos-evento-countdown">${formatEventoCountdown(ev.data)}</span>
                <button type="button" class="btn-secondary builder-toolbar-btn contratos-evento-vermais-btn" data-contrato-vermais>Ver mais</button>
              </div>
            </div>
            <h3 class="contratos-evento-title">${escapeHtml(ev.nome || '—')}</h3>
            <p class="contratos-evento-meta">${escapeHtml(ev.local || '—')}</p>
            <p class="contratos-evento-meta">${formatEventoData(ev.data, ev.horario)}</p>
            <p class="contratos-evento-meta">Status do contrato: <span class="${info.className}">${info.label}</span></p>

            <div class="contratos-convidados-block">
              <p class="contratos-convidados-title">Convidados</p>
              <div class="overflow-x-auto leads-table-wrap">
                <table class="leads-table w-full">
                  <thead>
                    <tr><th>Nome</th><th>Status</th><th>Mesa</th><th>WhatsApp</th><th class="tabela-col-acoes"></th></tr>
                  </thead>
                  <tbody>${linhasConvidados}</tbody>
                </table>
              </div>
            </div>
          </div>
        </td>
      </tr>`;
}

function selectContrato(id) {
  selectedContratoId = selectedContratoId === id ? null : id;
  renderContratosClientes();
}

// O painel lateral saiu; os detalhes agora ficam na tabela.
function renderContratoEventoPanel() {}

let activeConvidadoId = null;

function currentVendorName() {
  return (typeof B2B_DATA !== 'undefined' && B2B_DATA.professional && B2B_DATA.professional.company) || 'Você';
}

function findConvidadoGlobal(guestId) {
  for (const c of (bContratosAbertos || [])) {
    const guest = (c.convidados || []).find(g => g.id === guestId);
    if (guest) return { contrato: c, guest };
  }
  return null;
}

function openConvidadoDrawer(guestId) {
  activeConvidadoId = guestId;
  renderConvidadoDrawer();
  document.getElementById('convidado-drawer-backdrop')?.classList.add('show');
  document.getElementById('convidado-drawer')?.classList.add('show');
}

function closeConvidadoDrawer() {
  activeConvidadoId = null;
  document.getElementById('convidado-drawer-backdrop')?.classList.remove('show');
  document.getElementById('convidado-drawer')?.classList.remove('show');
}

function renderConvidadoDrawer() {
  if (!activeConvidadoId) return;
  const found = findConvidadoGlobal(activeConvidadoId);
  if (!found) { closeConvidadoDrawer(); return; }
  const { contrato, guest } = found;

  const info = CONVIDADO_STATUS_LABELS[guest.status] || CONVIDADO_STATUS_LABELS.pendente;
  document.getElementById('convidado-drawer-title').textContent = guest.nome;
  document.getElementById('convidado-drawer-body').innerHTML = `
    <div class="task-drawer-field" style="margin-bottom:1.25rem;">
      <label class="task-drawer-field-label">Evento</label>
      <div class="field-input contratos-drawer-box">${escapeHtml(contrato.evento.nome)}</div>
    </div>
    <div class="task-drawer-field" style="margin-bottom:1.25rem;">
      <label class="task-drawer-field-label">Status</label>
      <div class="field-input contratos-drawer-box"><span class="${info.className}">${info.label}</span></div>
    </div>
    <div class="task-drawer-field" style="margin-bottom:1.25rem;">
      <label class="task-drawer-field-label">Mesa</label>
      <div class="field-input contratos-drawer-box">${guest.mesa ? escapeHtml(guest.mesa) : 'Não atribuída'}</div>
    </div>
    <div class="task-drawer-field" style="margin-bottom:1.25rem;">
      <label class="task-drawer-field-label">WhatsApp</label>
      <div class="field-input contratos-drawer-box">${guest.whatsapp ? escapeHtml(guest.whatsapp) : '—'}</div>
    </div>

    <div class="task-drawer-activity-header">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path stroke-linecap="round" stroke-linejoin="round" d="M7.5 8.25h9M7.5 12h6M4.5 4.5h15A1.5 1.5 0 0 1 21 6v10.5a1.5 1.5 0 0 1-1.5 1.5H9l-4 3v-3H4.5A1.5 1.5 0 0 1 3 16.5V6a1.5 1.5 0 0 1 1.5-1.5Z" /></svg>
      <span>Observações e comentários</span>
    </div>
    <div class="task-drawer-comment-card">
      <div class="task-drawer-comment-box">
        <textarea class="task-drawer-comment-input" id="convidado-comment-input" placeholder="Escrever um comentário..." rows="1"></textarea>
        <div class="task-drawer-comment-actions">
          <button type="button" class="btn-primary btn-comentar" id="convidado-comment-submit">Comentar</button>
        </div>
      </div>
    </div>
    <div class="task-drawer-activity-list" id="convidado-activity-list"></div>
  `;

  const activityList = document.getElementById('convidado-activity-list');
  const entries = (guest.comentarios || []).slice().reverse();
  activityList.innerHTML = entries.length
    ? entries.map(renderConvidadoActivityEntry).join('')
    : '<p class="task-activity-empty">Nenhum comentário ainda.</p>';

  document.getElementById('convidado-comment-submit')?.addEventListener('click', submitConvidadoComment);
  document.getElementById('convidado-comment-input')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submitConvidadoComment(); }
  });
  activityList?.addEventListener('click', (e) => {
    const btn = e.target.closest('.task-activity-comment-delete');
    if (btn) deleteConvidadoComment(btn.dataset.commentId);
  });
}

function renderConvidadoActivityEntry(entry) {
  const avatar = initials(entry.user || 'Você');
  const when = formatActivityDate(entry.at);
  return `
    <div class="task-activity-item">
      <span class="task-activity-avatar">${avatar}</span>
      <div class="task-activity-content">
        <p class="task-activity-line">
          <strong>${escapeHtml(entry.user)}</strong> adicionou um comentário
          <button type="button" class="task-activity-comment-delete" data-comment-id="${entry.id}" title="Apagar comentário" aria-label="Apagar comentário">
            <svg stroke-linejoin="round" stroke-linecap="round" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M4 6.5h16"/><path stroke-linecap="round" stroke-linejoin="round" d="M9 6.5V4.5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/><path stroke-linecap="round" stroke-linejoin="round" d="M6.5 9.5V18a3 3 0 0 0 3 3h5a3 3 0 0 0 3-3V9.5"/><path stroke-linecap="round" stroke-linejoin="round" d="M10.5 11v5.5M13.5 11v5.5"/></svg>
          </button>
        </p>
        <p class="task-activity-comment-text">${escapeHtml(entry.text || '')}</p>
        <p class="task-activity-time">${when}</p>
      </div>
    </div>
  `;
}

async function submitConvidadoComment() {
  const input = document.getElementById('convidado-comment-input');
  if (!input) return;
  const text = input.value.trim();
  if (!text) return;
  const found = findConvidadoGlobal(activeConvidadoId);
  if (!found) return;
  if (!found.guest.comentarios) found.guest.comentarios = [];
  found.guest.comentarios.push({ id: 'com-' + Date.now(), user: currentVendorName(), text, at: new Date().toISOString() });
  input.value = '';
  await supabaseClient.from('contract_guests').update({ comentarios: found.guest.comentarios }).eq('id', found.guest.id);
  renderConvidadoDrawer();
}

async function deleteConvidadoComment(commentId) {
  if (!commentId) return;
  const found = findConvidadoGlobal(activeConvidadoId);
  if (!found) return;
  found.guest.comentarios = (found.guest.comentarios || []).filter(entry => entry.id !== commentId);
  await supabaseClient.from('contract_guests').update({ comentarios: found.guest.comentarios }).eq('id', found.guest.id);
  renderConvidadoDrawer();
}

function openContratoDrawer() {
  const contrato = findContrato(selectedContratoId);
  if (!contrato) return;
  const info = CONTRATO_STATUS_LABELS[contrato.status] || CONTRATO_STATUS_LABELS.em_dia;
  const ev = contrato.evento;

  document.getElementById('contrato-drawer-title').textContent = ev.nome;
  document.getElementById('contrato-drawer-body').innerHTML = `
    <div class="task-drawer-field" style="margin-bottom:1.25rem;">
      <label class="task-drawer-field-label">Cliente</label>
      <div class="field-input contratos-drawer-box">${escapeHtml(contrato.client)} · ${escapeHtml(contrato.phone || '—')}</div>
    </div>
    <div class="task-drawer-field" style="margin-bottom:1.25rem;">
      <label class="task-drawer-field-label">Status do contrato</label>
      <div class="field-input contratos-drawer-box"><span class="${info.className}">${info.label}</span></div>
    </div>
    <div class="task-drawer-field" style="margin-bottom:1.25rem;">
      <label class="task-drawer-field-label">Local</label>
      <div class="field-input contratos-drawer-box">${escapeHtml(ev.local)}</div>
    </div>
    <div class="task-drawer-field" style="margin-bottom:1.25rem;">
      <label class="task-drawer-field-label">Data e horário</label>
      <div class="field-input contratos-drawer-box">${formatEventoData(ev.data, ev.horario)}</div>
    </div>
    <div class="task-drawer-field" style="margin-bottom:1.25rem;">
      <label class="task-drawer-field-label">Site do evento</label>
      <div class="field-input contratos-drawer-box"><a href="${escapeHtml(ev.siteUrl)}" target="_blank" rel="noopener noreferrer" class="contratos-drawer-link">${escapeHtml(ev.siteUrl)}</a></div>
    </div>
    <div class="task-drawer-field" style="margin-bottom:1.25rem;">
      <label class="task-drawer-field-label">Dress code</label>
      <div class="field-input contratos-drawer-box">${escapeHtml(ev.dressCode || '—')}</div>
    </div>
    <div class="task-drawer-field">
      <label class="task-drawer-field-label">Informações</label>
      <div class="field-input contratos-drawer-box">${escapeHtml(ev.informacoes || '—')}</div>
    </div>
  `;
  document.getElementById('contrato-drawer').classList.add('show');
  document.getElementById('contrato-drawer-backdrop').classList.add('show');
}

async function initContratosTab() {
  await loadContratosAbertos();
  // Barra da tabela: busca, Filtrar por (status e categoria) e Exportar.
  contratosTabelaEstado = montarBarraTabela(document.getElementById('contratos-clientes-card'), {
    placeholder: 'Buscar cliente...',
    filtros: [
      { chave: 'status', rotulo: 'Status', opcoes: () => Object.entries(CONTRATO_STATUS_LABELS).map(([k, v]) => [k, v.label]) },
      { chave: 'categoria', rotulo: 'Categoria', opcoes: () => [...new Set((bContratosAbertos || []).map(c => c.categoria).filter(Boolean))].sort().map(v => [v, v]) }
    ],
    exportar: () => tabelaExportarCSV('contratos', [
      { titulo: 'Cliente', valor: c => c.client },
      { titulo: 'Categoria', valor: c => c.categoria },
      { titulo: 'Produto/serviço', valor: c => produtoDoContrato(c) },
      { titulo: 'Convidados', valor: c => (c.convidados || []).length },
      { titulo: 'Status', valor: c => (CONTRATO_STATUS_LABELS[c.status] || CONTRATO_STATUS_LABELS.em_dia).label },
      { titulo: 'Evento', valor: c => c.evento && c.evento.nome },
      { titulo: 'Data do evento', valor: c => c.evento && c.evento.data }
    ], contratosClientesFiltrados()),
    aoMudar: () => renderContratosClientes()
  });
  renderContratosClientes();
  renderContratoEventoPanel();


  const closeContrato = () => {
    document.getElementById('contrato-drawer').classList.remove('show');
    document.getElementById('contrato-drawer-backdrop').classList.remove('show');
  };
  document.getElementById('contrato-drawer-close')?.addEventListener('click', closeContrato);
  document.getElementById('contrato-drawer-backdrop')?.addEventListener('click', closeContrato);

  document.getElementById('convidado-drawer-close')?.addEventListener('click', closeConvidadoDrawer);
  document.getElementById('convidado-drawer-backdrop')?.addEventListener('click', closeConvidadoDrawer);

  document.getElementById('contratos-status-filter-btn')?.addEventListener('click', (e) => {
    e.stopPropagation();
    contratosStatusFilterOpen = !contratosStatusFilterOpen;
    renderContratosClientes();
  });
  document.getElementById('contratos-status-filter-dropdown')?.addEventListener('click', (e) => {
    e.stopPropagation();
    const item = e.target.closest('[data-status-filter]');
    if (!item) return;
    contratosStatusFilter = item.dataset.statusFilter;
    contratosStatusFilterOpen = false;
    renderContratosClientes();
  });
  document.addEventListener('click', () => {
    if (contratosStatusFilterOpen) { contratosStatusFilterOpen = false; renderContratosClientes(); }
  });
}
