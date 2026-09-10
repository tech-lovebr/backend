/* ==========================================================================
   LOVE B2B — Dashboard (saudação, estatísticas, contratos, agenda, tarefas)
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
  renderGreeting();
  renderStats();
  renderContractsTable();
  renderAgenda();
  renderTarefas();
  initTarefaAddButton();
});

function renderGreeting() {
  const now = new Date();
  const dateStr = new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' }).format(now);
  setText('greeting-date', capitalize(dateStr));
  setText('greeting-title', `${getBrasiliaGreeting()}, ${B2B_DATA.professional.name}`);
}

function getBrasiliaGreeting() {
  const hour = Number(new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', hour: 'numeric', hour12: false }).format(new Date()));
  if (hour >= 5 && hour < 12) return 'Bom dia';
  if (hour >= 12 && hour < 18) return 'Boa tarde';
  return 'Boa noite';
}

function renderStats() {
  const pendentes = B2B_DATA.contracts.filter(c => c.status === 'enviado').length;
  const ativos = B2B_DATA.contracts.filter(c => c.status === 'assinado').length;
  setText('stat-leads', B2B_DATA.leads.length);
  setText('stat-pendentes', pendentes);
  setText('stat-ativos', ativos);
}

function renderContractsTable() {
  const tbody = document.getElementById('contracts-table-body');
  if (!tbody) return;
  tbody.innerHTML = B2B_DATA.contracts.map(c => `
    <tr>
      <td class="font-medium text-zinc-900">${c.client}</td>
      <td>${c.event}</td>
      <td>${formatCurrency(c.value)}</td>
      <td>${c.date}</td>
      <td><span class="status-badge status-${c.status}">${statusLabel(c.status)}</span></td>
    </tr>
  `).join('');
}

/* -------------------- Agenda: faixa de dias + lista -------------------- */

const WEEKDAY_LABELS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

function renderAgenda() {
  const stripEl = document.getElementById('day-strip');
  const listEl = document.getElementById('agenda-list');
  if (!stripEl) return;

  const today = new Date();
  const eventDays = new Set(B2B_DATA.proximosEventos.map(e => e.day));

  let strip = '';
  for (let i = 0; i < 7; i++) {
    const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() + i);
    const isToday = i === 0;
    const hasEvent = d.getMonth() === today.getMonth() && eventDays.has(d.getDate());
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
    const sorted = [...B2B_DATA.proximosEventos].sort((a, b) => a.day - b.day);
    const accentByStatus = { confirmado: 'var(--primary-blue)', 'visita técnica': '#B45309', reunião: '#7E22CE' };
    listEl.innerHTML = sorted.map(ev => `
      <a href="agenda.html" class="agenda-item" style="border-left-color:${accentByStatus[ev.status] || 'var(--primary-blue)'};">
        <div class="flex-1 min-w-0">
          <p class="text-sm font-semibold text-zinc-900 truncate">${ev.client} · ${ev.event}</p>
          <p class="text-xs text-zinc-500 truncate mt-0.5">Dia ${ev.day} · ${ev.local}</p>
        </div>
        <div class="b2b-avatar" style="width:30px;height:30px;display:flex;align-items:center;justify-content:center;color:#fff;font-weight:600;font-size:.6875rem;flex-shrink:0;">
          ${initials(ev.client)}
        </div>
      </a>
    `).join('');
  }
}

/* -------------------- Tarefas (tabela) -------------------- */

const TAREFA_STATUS_LABEL = { andamento: 'Em andamento', feito: 'Feito', parado: 'Parado' };
const TAREFA_STATUS_ORDER = ['andamento', 'feito', 'parado'];

function renderTarefas() {
  const table = document.getElementById('tarefas-table');
  if (!table) return;

  if (!B2B_DATA.tarefas.length) {
    table.innerHTML = `<tr><td class="text-sm text-zinc-500 py-4">Parece que está tudo resolvido, você não tem nenhuma tarefa.</td></tr>`;
    return;
  }

  table.innerHTML = `
    <thead>
      <tr><th>Tarefa</th><th>Responsável</th><th>Status</th><th>Prazo</th></tr>
    </thead>
    <tbody>
      ${B2B_DATA.tarefas.map(t => `
        <tr data-tarefa-id="${t.id}">
          <td>
            <label class="tarefa-row-label">
              <input type="checkbox" class="tarefas-row-check" data-tarefa-id="${t.id}" ${t.status === 'feito' ? 'checked' : ''}>
              <span class="${t.status === 'feito' ? 'tarefa-text-cell done' : 'tarefa-text-cell'}">${escapeHtml(t.text)}</span>
            </label>
          </td>
          <td>
            ${t.responsavel
              ? `<img src="${t.responsavel}" alt="Responsável" class="member-avatar" style="width:26px;height:26px;">`
              : `<button type="button" class="responsavel-add-btn" aria-label="Atribuir responsável">+</button>`}
          </td>
          <td>
            <span class="status-badge status-tarefa-${t.status}">${TAREFA_STATUS_LABEL[t.status] || t.status}</span>
          </td>
          <td class="prazo-text">${escapeHtml(t.prazo || '')}</td>
        </tr>
      `).join('')}
    </tbody>
  `;

  table.querySelectorAll('.tarefas-row-check').forEach(input => {
    input.addEventListener('change', () => {
      const t = B2B_DATA.tarefas.find(x => x.id === input.dataset.tarefaId);
      if (t) t.status = input.checked ? 'feito' : 'andamento';
      renderTarefas();
    });
  });
}

function initTarefaAddButton() {
  const btn = document.getElementById('tarefa-add-btn');
  if (!btn) return;
  btn.addEventListener('click', () => {
    const text = prompt('Nova tarefa:');
    if (!text || !text.trim()) return;
    B2B_DATA.tarefas.push({ id: 't' + Date.now(), text: text.trim(), status: 'andamento', prazo: '', responsavel: null });
    renderTarefas();
  });
}
