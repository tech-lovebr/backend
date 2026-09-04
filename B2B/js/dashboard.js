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
  setText('greeting-title', `Olá, ${B2B_DATA.professional.name},`);
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
    const accentByStatus = { confirmado: '#4E96EF', 'visita técnica': '#B45309', reunião: '#7E22CE' };
    listEl.innerHTML = sorted.map(ev => `
      <a href="agenda.html" class="agenda-item" style="border-left-color:${accentByStatus[ev.status] || '#4E96EF'};">
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

/* -------------------- Tarefas (checklist com adicionar) -------------------- */

function renderTarefas() {
  const wrap = document.getElementById('tarefas-list');
  if (!wrap) return;

  if (!B2B_DATA.tarefas.length) {
    wrap.innerHTML = `<p class="text-sm text-zinc-500 py-2">Parece que está tudo resolvido, você não tem nenhuma tarefa.</p>`;
    return;
  }

  wrap.innerHTML = B2B_DATA.tarefas.map(t => `
    <div class="tarefa-item">
      <label class="tarefa-label">
        <input type="checkbox" data-tarefa-id="${t.id}" ${t.done ? 'checked' : ''}>
        <span class="tarefa-check"></span>
        <span class="tarefa-text ${t.done ? 'done' : ''}">${escapeHtml(t.text)}</span>
      </label>
      <button type="button" class="tarefa-remove" data-remove-id="${t.id}" aria-label="Excluir tarefa">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
      </button>
    </div>
  `).join('');

  wrap.querySelectorAll('[data-tarefa-id]').forEach(input => {
    input.addEventListener('change', () => {
      const t = B2B_DATA.tarefas.find(x => x.id === input.dataset.tarefaId);
      if (t) t.done = input.checked;
      renderTarefas();
    });
  });

  wrap.querySelectorAll('[data-remove-id]').forEach(btn => {
    btn.addEventListener('click', () => {
      B2B_DATA.tarefas = B2B_DATA.tarefas.filter(t => t.id !== btn.dataset.removeId);
      renderTarefas();
    });
  });
}

function initTarefaAddButton() {
  const btn = document.getElementById('tarefa-add-btn');
  if (!btn) return;
  btn.addEventListener('click', showTarefaInput);
}

function showTarefaInput() {
  const wrap = document.getElementById('tarefas-list');
  if (!wrap || document.getElementById('tarefa-new-input')) return;

  const row = document.createElement('div');
  row.className = 'tarefa-item';
  row.innerHTML = `
    <span class="tarefa-check" style="border-style:dashed;"></span>
    <input type="text" id="tarefa-new-input" class="tarefa-new-input" placeholder="Nova tarefa…">
  `;
  wrap.appendChild(row);

  const input = row.querySelector('#tarefa-new-input');
  input.focus();

  // Evita duplo-commit: Enter dispara commit(), e remover o input do DOM
  // (via renderTarefas) reentra em "blur" no mesmo elemento.
  let committed = false;
  const commit = () => {
    if (committed) return;
    committed = true;
    const text = input.value.trim();
    if (text) B2B_DATA.tarefas.push({ id: 't' + Date.now(), text, done: false });
    renderTarefas();
  };

  input.addEventListener('keydown', e => {
    if (e.key === 'Enter') { e.preventDefault(); commit(); }
    if (e.key === 'Escape') { committed = true; renderTarefas(); }
  });
  input.addEventListener('blur', commit);
}
