/* ==========================================================================
   LOVE B2B — Meu Trabalho (abas Quadro / Agenda)
   Quadro Kanban: até 4 listas, tarefas com check e drag-and-drop.
   Somente front-end — estado salvo em localStorage.
   ========================================================================== */

const KANBAN_STORAGE_KEY = 'b2b-work-board';
const KANBAN_MAX_LISTS = 4;
const KANBAN_LIST_COLORS = ['#E8E8E8', '#BBE2EC', '#D1FFE3', '#F9F090', '#F9CDCD', '#F9AF90'];

let kanbanBoard = null;
let addingListOpen = false;
let editingTitleListId = null;
let openListMenu = null; // { listId, mode: 'menu' | 'color' }
let activeTaskId = null;
let editingTaskTitle = false;

document.addEventListener('DOMContentLoaded', async () => {
  await window.b2bAuthReady;
  initWorkViewTabs();
  await initKanbanBoard();
  initTaskDrawer();
  initShareBoardModal();
  await loadAgendaLeads();
  await initAgendaCalendar();
  window.b2bPageReady?.();
});

/* -------------------- Utilitários de atividade -------------------- */

function currentUserName() {
  return (typeof B2B_DATA !== 'undefined' && B2B_DATA.professional && B2B_DATA.professional.name) || 'Você';
}

function logTaskActivity(task, type, extra) {
  if (!task.activity) task.activity = [];
  task.activity.push(Object.assign({ id: type + '-' + Date.now(), type, user: currentUserName(), at: new Date().toISOString() }, extra || {}));
}

function formatActivityDate(iso) {
  const d = new Date(iso);
  const datePart = d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
  const timePart = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  return `${datePart}, ${timePart}`;
}

function formatDueDate(iso) {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

function findTaskAndList(taskId) {
  for (const list of kanbanBoard.lists) {
    const task = list.tasks.find(t => t.id === taskId);
    if (task) return { task, list };
  }
  return null;
}

/* Na Agenda, "Compartilhar agenda" fica dentro da caixa do cronograma, à
   direita (mesmo visual de Filtrar por / Exportar); nas outras abas volta
   para o cabeçalho da página. */
function moverBotaoCompartilhar(naAgenda) {
  const share = document.getElementById('share-board-btn');
  const caixa = document.querySelector('.agenda-timeline-header');
  const topo = document.querySelector('.b2b-header-bar');
  if (!share || !caixa || !topo) return;
  (naAgenda ? caixa : topo).appendChild(share);
  share.classList.toggle('tabela-barra-btn', naAgenda);
  share.classList.toggle('btn-secondary', !naAgenda);
  share.classList.toggle('builder-toolbar-btn', !naAgenda);
}

/* -------------------- Abas: Quadro / Agenda -------------------- */

function initWorkViewTabs() {
  const wrap = document.getElementById('work-view-tabs');
  if (!wrap) return;

  const activate = (btn) => {
    wrap.querySelectorAll('[data-view]').forEach(b => b.classList.toggle('active', b === btn));
    document.querySelectorAll('[data-view-panel]').forEach(panel => {
      panel.style.display = panel.dataset.viewPanel === btn.dataset.view ? '' : 'none';
    });
    const shareLabel = document.getElementById('share-board-btn-label');
    if (shareLabel) shareLabel.textContent = btn.dataset.view === 'agenda' ? 'Compartilhar agenda' : 'Compartilhar tarefas';
    moverBotaoCompartilhar(btn.dataset.view === 'agenda');
  };

  wrap.querySelectorAll('[data-view]').forEach(btn => {
    btn.addEventListener('click', () => activate(btn));
  });

  // Permite abrir direto numa aba específica via link (ex: dashboard > Tarefas).
  const requestedView = new URLSearchParams(location.search).get('view');
  const requestedBtn = requestedView && wrap.querySelector(`[data-view="${requestedView}"]`);
  activate(requestedBtn || wrap.querySelector('[data-view].active') || wrap.querySelector('[data-view]'));
}

/* -------------------- Quadro Kanban -------------------- */

function seedTask(id, text, done, listTitle) {
  return {
    id,
    text,
    done,
    dueDate: '',
    activity: [
      { type: 'created', user: currentUserName(), at: new Date().toISOString(), listTitle }
    ]
  };
}

function defaultKanbanBoard() {
  return {
    lists: [
      { id: 'list-' + Date.now() + '-1', title: 'Começar', tasks: [] },
      { id: 'list-' + Date.now() + '-2', title: 'Em andamento', tasks: [] },
      { id: 'list-' + Date.now() + '-3', title: 'Concluído', tasks: [] }
    ]
  };
}

async function loadKanbanBoard() {
  const { data: { session } } = await supabaseClient.auth.getSession();
  if (!session) return defaultKanbanBoard();

  const { data: lists, error } = await supabaseClient
    .from('agenda_lists')
    .select('id, title, color, position, agenda_tasks(id, text, done, due_date, position, agenda_task_activity(type, user_name, extra, created_at))')
    .eq('fornecedor_id', empresaId(session))
    .order('position', { ascending: true });

  if (error || !lists || !lists.length) return defaultKanbanBoard();

  return {
    lists: lists.map(l => ({
      id: l.id,
      title: l.title,
      color: l.color || null,
      tasks: (l.agenda_tasks || [])
        .slice()
        .sort((a, b) => a.position - b.position)
        .map(t => ({
          id: t.id,
          text: t.text,
          done: t.done,
          dueDate: t.due_date || '',
          activity: (t.agenda_task_activity || [])
            .slice()
            .sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
            .map(a => Object.assign({ type: a.type, user: a.user_name, at: a.created_at }, a.extra || {}))
        }))
    }))
  };
}

// Persistência simples: sempre que o quadro muda, apaga e recria as listas/
// tarefas/atividade do fornecedor a partir do estado em memória. O quadro é
// pequeno (poucas listas/tarefas por fornecedor), então isso é rápido e evita
// ter que mapear cada uma das ~15 mutações espalhadas pelo arquivo pra uma
// operação SQL incremental específica.
async function saveKanbanBoard() {
  const { data: { session } } = await supabaseClient.auth.getSession();
  if (!session) return;
  const fornecedorId = empresaId(session);

  const { data: oldLists } = await supabaseClient.from('agenda_lists').select('id').eq('fornecedor_id', fornecedorId);
  if (oldLists && oldLists.length) {
    await supabaseClient.from('agenda_lists').delete().in('id', oldLists.map(l => l.id));
  }

  for (let i = 0; i < kanbanBoard.lists.length; i++) {
    const list = kanbanBoard.lists[i];
    const { data: newList } = await supabaseClient
      .from('agenda_lists')
      .insert({ fornecedor_id: fornecedorId, title: list.title, color: list.color || null, position: i })
      .select('id')
      .single();
    if (!newList) continue;

    for (let j = 0; j < list.tasks.length; j++) {
      const task = list.tasks[j];
      const { data: newTask } = await supabaseClient
        .from('agenda_tasks')
        .insert({ fornecedor_id: fornecedorId, list_id: newList.id, position: j, text: task.text, done: task.done, due_date: task.dueDate || null })
        .select('id')
        .single();
      if (!newTask) continue;

      const activity = task.activity || [];
      if (activity.length) {
        await supabaseClient.from('agenda_task_activity').insert(
          activity.map(a => {
            const { type, user, at, ...extra } = a;
            return { fornecedor_id: fornecedorId, task_id: newTask.id, type, user_name: user, extra, created_at: at || new Date().toISOString() };
          })
        );
      }
    }
  }
}

async function initKanbanBoard() {
  const board = document.getElementById('kanban-board');
  if (!board) return;
  kanbanBoard = await loadKanbanBoard();
  renderKanbanBoard();

  document.addEventListener('click', () => {
    if (openListMenu) { openListMenu = null; renderKanbanBoard(); }
  });
}

const KANBAN_ICON_PLUS = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>';

function kanbanTaskIconIdle() {
  return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75"><circle cx="12" cy="12" r="9"/></svg>';
}

function kanbanTaskIconDone() {
  return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9" fill="currentColor" stroke="none"/><path d="m8 12.5 2.5 2.5 5-5.5" stroke="#fff"/></svg>';
}

function renderKanbanBoard() {
  const board = document.getElementById('kanban-board');
  if (!board) return;

  const listsHtml = kanbanBoard.lists.map(list => `
    <div class="kanban-list" data-list-id="${list.id}" style="${list.color ? `background:${list.color};` : ''}">
      <div class="kanban-list-header">
        ${editingTitleListId === list.id
          ? `<input type="text" class="kanban-list-title-input" data-title-input="${list.id}" value="${escapeHtml(list.title)}">`
          : `<span class="kanban-list-title" data-title-toggle="${list.id}" title="Clique para renomear">${escapeHtml(list.title)}</span>`}
        <span class="kanban-list-count">${list.tasks.length}</span>
        <div class="kanban-list-menu-wrap">
          <button type="button" class="kanban-list-menu-btn" data-menu-toggle="${list.id}" aria-label="Mais opções">
            <svg viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="5" r="1.7"/><circle cx="12" cy="12" r="1.7"/><circle cx="12" cy="19" r="1.7"/></svg>
          </button>
          ${openListMenu && openListMenu.listId === list.id ? (
            openListMenu.mode === 'color' ? `
            <div class="kanban-list-dropdown" data-dropdown="${list.id}">
              <button type="button" class="kanban-color-picker-back" data-color-back="${list.id}">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75"><path stroke-linecap="round" stroke-linejoin="round" d="m15 19-7-7 7-7" /></svg>
                Alterar cor da lista
              </button>
              <div class="kanban-color-grid">
                ${KANBAN_LIST_COLORS.map(c => `<button type="button" class="kanban-color-dot${list.color === c ? ' active' : ''}" style="background:${c};" data-set-color="${list.id}" data-color-value="${c}" aria-label="Cor ${c}"></button>`).join('')}
              </div>
            </div>
            ` : `
            <div class="kanban-list-dropdown" data-dropdown="${list.id}">
              <button type="button" class="kanban-list-dropdown-item" data-menu-add-task="${list.id}">Adicionar tarefa</button>
              <button type="button" class="kanban-list-dropdown-item" data-menu-color="${list.id}">Alterar cor da lista</button>
              <button type="button" class="kanban-list-dropdown-item kanban-list-dropdown-item-danger" data-menu-delete="${list.id}">Apagar lista</button>
            </div>
            `
          ) : ''}
        </div>
      </div>
      <div class="kanban-list-tasks" data-tasks-for="${list.id}">
        ${list.tasks.map(task => `
          <div class="kanban-task${task.done ? ' is-done' : ''}" data-task-id="${task.id}" data-open-task="${task.id}">
            <button type="button" class="kanban-task-check" data-toggle-task="${task.id}" aria-label="Concluir tarefa">
              ${task.done ? kanbanTaskIconDone() : kanbanTaskIconIdle()}
            </button>
            <div class="kanban-task-body">
              <span class="kanban-task-text">${escapeHtml(task.text)}</span>
              ${task.dueDate ? `<span class="kanban-task-due">${formatDueDate(task.dueDate)}</span>` : ''}
            </div>
            <button type="button" class="kanban-task-remove" data-remove-task="${task.id}" aria-label="Excluir tarefa">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
            </button>
          </div>
        `).join('')}
      </div>
      <div class="kanban-add-task-wrap">
        <textarea class="kanban-add-task-input" data-add-task-input="${list.id}" placeholder="Insira um título" rows="1"></textarea>
        <div class="kanban-add-task-actions">
          <button type="button" class="btn-secondary kanban-add-task-confirm" data-add-task-confirm="${list.id}">${KANBAN_ICON_PLUS}Adicionar tarefa</button>
        </div>
      </div>
    </div>
  `).join('');

  const canAddList = kanbanBoard.lists.length < KANBAN_MAX_LISTS;

  const addListHtml = canAddList ? (addingListOpen ? `
    <div class="kanban-list kanban-list-new">
      <textarea class="kanban-add-task-input" id="kanban-new-list-input" placeholder="Insira um título" rows="1"></textarea>
      <div class="kanban-add-task-actions">
        <button type="button" class="btn-primary" id="kanban-new-list-confirm">Adicionar lista</button>
        <button type="button" class="kanban-add-list-cancel" id="kanban-new-list-cancel" aria-label="Cancelar">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
        </button>
      </div>
    </div>
  ` : `
    <button type="button" class="kanban-add-list-btn" id="kanban-add-list-btn">
      ${KANBAN_ICON_PLUS} Adicionar nova lista
    </button>
  `) : '';

  board.innerHTML = listsHtml + addListHtml;

  wireKanbanBoard(board);
}

function wireKanbanBoard(board) {
  board.querySelectorAll('[data-toggle-task]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const taskId = btn.dataset.toggleTask;
      const found = findTaskAndList(taskId);
      if (found) {
        found.task.done = !found.task.done;
        logTaskActivity(found.task, found.task.done ? 'check' : 'uncheck');
      }
      saveKanbanBoard();
      renderKanbanBoard();
      if (activeTaskId === taskId) renderTaskDrawer();
    });
  });

  board.querySelectorAll('[data-remove-task]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const taskId = btn.dataset.removeTask;
      kanbanBoard.lists.forEach(list => {
        list.tasks = list.tasks.filter(t => t.id !== taskId);
      });
      if (activeTaskId === taskId) closeTaskDrawer();
      saveKanbanBoard();
      renderKanbanBoard();
    });
  });

  /* -------- Abrir drawer da tarefa -------- */
  board.querySelectorAll('[data-open-task]').forEach(el => {
    el.addEventListener('click', (e) => {
      if (e.target.closest('[data-toggle-task]') || e.target.closest('[data-remove-task]')) return;
      openTaskDrawer(el.dataset.openTask);
    });
  });

  /* -------- Título editável -------- */
  board.querySelectorAll('[data-title-toggle]').forEach(el => {
    el.addEventListener('click', () => {
      editingTitleListId = el.dataset.titleToggle;
      renderKanbanBoard();
      const input = document.querySelector(`[data-title-input="${editingTitleListId}"]`);
      if (input) { input.focus(); input.select(); }
    });
  });

  board.querySelectorAll('[data-title-input]').forEach(input => {
    const commit = () => {
      const list = kanbanBoard.lists.find(l => l.id === input.dataset.titleInput);
      if (list) {
        const val = input.value.trim();
        if (val) list.title = val;
      }
      editingTitleListId = null;
      saveKanbanBoard();
      renderKanbanBoard();
    };
    input.addEventListener('blur', commit);
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); input.blur(); }
      if (e.key === 'Escape') { editingTitleListId = null; renderKanbanBoard(); }
    });
  });

  /* -------- Menu "⋮" da lista -------- */
  board.querySelectorAll('[data-menu-toggle]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const listId = btn.dataset.menuToggle;
      openListMenu = (openListMenu && openListMenu.listId === listId) ? null : { listId, mode: 'menu' };
      renderKanbanBoard();
    });
  });

  board.querySelectorAll('[data-dropdown]').forEach(dropdown => {
    dropdown.addEventListener('click', (e) => e.stopPropagation());
  });

  board.querySelectorAll('[data-menu-add-task]').forEach(btn => {
    btn.addEventListener('click', () => {
      const listId = btn.dataset.menuAddTask;
      openListMenu = null;
      renderKanbanBoard();
      const input = document.querySelector(`[data-add-task-input="${listId}"]`);
      if (input) { input.scrollIntoView({ block: 'center', behavior: 'smooth' }); input.focus(); }
    });
  });

  board.querySelectorAll('[data-menu-color]').forEach(btn => {
    btn.addEventListener('click', () => {
      openListMenu = { listId: btn.dataset.menuColor, mode: 'color' };
      renderKanbanBoard();
    });
  });

  board.querySelectorAll('[data-color-back]').forEach(btn => {
    btn.addEventListener('click', () => {
      openListMenu = { listId: btn.dataset.colorBack, mode: 'menu' };
      renderKanbanBoard();
    });
  });

  board.querySelectorAll('[data-set-color]').forEach(btn => {
    btn.addEventListener('click', () => {
      const list = kanbanBoard.lists.find(l => l.id === btn.dataset.setColor);
      if (list) list.color = btn.dataset.colorValue;
      openListMenu = null;
      saveKanbanBoard();
      renderKanbanBoard();
    });
  });

  board.querySelectorAll('[data-menu-delete]').forEach(btn => {
    btn.addEventListener('click', () => {
      const listId = btn.dataset.menuDelete;
      kanbanBoard.lists = kanbanBoard.lists.filter(l => l.id !== listId);
      openListMenu = null;
      saveKanbanBoard();
      renderKanbanBoard();
    });
  });

  board.querySelectorAll('[data-add-task-confirm]').forEach(btn => {
    btn.addEventListener('click', () => addKanbanTask(btn.dataset.addTaskConfirm));
  });

  board.querySelectorAll('[data-add-task-input]').forEach(input => {
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        addKanbanTask(input.dataset.addTaskInput);
      }
    });
  });

  const addListBtn = document.getElementById('kanban-add-list-btn');
  if (addListBtn) {
    addListBtn.addEventListener('click', () => {
      addingListOpen = true;
      renderKanbanBoard();
      document.getElementById('kanban-new-list-input')?.focus();
    });
  }

  const newListInput = document.getElementById('kanban-new-list-input');
  const newListConfirm = document.getElementById('kanban-new-list-confirm');
  const newListCancel = document.getElementById('kanban-new-list-cancel');
  if (newListConfirm) newListConfirm.addEventListener('click', confirmAddKanbanList);
  if (newListCancel) newListCancel.addEventListener('click', () => { addingListOpen = false; renderKanbanBoard(); });
  if (newListInput) {
    newListInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); confirmAddKanbanList(); }
      if (e.key === 'Escape') { addingListOpen = false; renderKanbanBoard(); }
    });
  }

  board.querySelectorAll('.kanban-list-tasks').forEach(tasksEl => {
    new Sortable(tasksEl, {
      group: 'kanban-tasks',
      animation: 150,
      ghostClass: 'kanban-task-ghost',
      onEnd: syncKanbanOrderFromDom
    });
  });

  new Sortable(board, {
    animation: 150,
    handle: '.kanban-list-header',
    filter: '.kanban-list-menu-wrap, .kanban-list-title-input',
    preventOnFilter: false,
    draggable: '.kanban-list:not(.kanban-list-new)',
    ghostClass: 'kanban-list-ghost',
    onEnd: syncKanbanListOrderFromDom
  });
}

function syncKanbanListOrderFromDom() {
  const board = document.getElementById('kanban-board');
  if (!board) return;
  const idsInOrder = Array.from(board.querySelectorAll('.kanban-list[data-list-id]')).map(el => el.dataset.listId);
  const listById = {};
  kanbanBoard.lists.forEach(list => { listById[list.id] = list; });
  kanbanBoard.lists = idsInOrder.map(id => listById[id]).filter(Boolean);
  saveKanbanBoard();
}

function addKanbanTask(listId) {
  const input = document.querySelector(`[data-add-task-input="${listId}"]`);
  if (!input) return;
  const text = input.value.trim();
  if (!text) return;

  const list = kanbanBoard.lists.find(l => l.id === listId);
  if (!list) return;

  const task = seedTask('task-' + Date.now() + '-' + Math.round(Math.random() * 999), text, false, list.title);
  list.tasks.push(task);
  saveKanbanBoard();
  renderKanbanBoard();
}

function confirmAddKanbanList() {
  const input = document.getElementById('kanban-new-list-input');
  if (!input) return;
  const title = input.value.trim();
  if (!title) return;
  if (kanbanBoard.lists.length >= KANBAN_MAX_LISTS) {
    showToast('Você pode criar até 4 listas.', true);
    return;
  }

  kanbanBoard.lists.push({ id: 'list-' + Date.now(), title, tasks: [] });
  addingListOpen = false;
  saveKanbanBoard();
  renderKanbanBoard();
}

function syncKanbanOrderFromDom() {
  const board = document.getElementById('kanban-board');
  if (!board) return;

  const allTasks = {};
  const oldListIdOf = {};
  kanbanBoard.lists.forEach(list => list.tasks.forEach(task => {
    allTasks[task.id] = task;
    oldListIdOf[task.id] = list.id;
  }));

  board.querySelectorAll('.kanban-list-tasks').forEach(tasksEl => {
    const listId = tasksEl.dataset.tasksFor;
    const list = kanbanBoard.lists.find(l => l.id === listId);
    if (!list) return;
    const idsInOrder = Array.from(tasksEl.querySelectorAll('[data-task-id]')).map(el => el.dataset.taskId);
    list.tasks = idsInOrder.map(id => allTasks[id]).filter(Boolean);
  });

  kanbanBoard.lists.forEach(list => {
    list.tasks.forEach(task => {
      const oldListId = oldListIdOf[task.id];
      if (oldListId && oldListId !== list.id) {
        const oldList = kanbanBoard.lists.find(l => l.id === oldListId);
        logTaskActivity(task, 'move', { fromTitle: oldList ? oldList.title : '', toTitle: list.title });
      }
    });
  });

  saveKanbanBoard();

  board.querySelectorAll('.kanban-list-count').forEach((countEl, i) => {
    countEl.textContent = kanbanBoard.lists[i].tasks.length;
  });

  if (activeTaskId) renderTaskDrawer();
}

/* -------------------- Drawer da tarefa -------------------- */

function initTaskDrawer() {
  document.getElementById('task-drawer-close')?.addEventListener('click', closeTaskDrawer);
  document.getElementById('task-drawer-backdrop')?.addEventListener('click', closeTaskDrawer);

  const dueInput = document.getElementById('task-drawer-due-input');
  if (dueInput) {
    dueInput.addEventListener('change', () => {
      const found = findTaskAndList(activeTaskId);
      if (!found) return;
      found.task.dueDate = dueInput.value;
      if (dueInput.value) logTaskActivity(found.task, 'due-date', { date: dueInput.value });
      saveKanbanBoard();
      renderTaskDrawer();
      renderKanbanBoard();
    });
  }

  document.getElementById('task-drawer-due-clear')?.addEventListener('click', () => {
    const found = findTaskAndList(activeTaskId);
    if (!found) return;
    found.task.dueDate = '';
    logTaskActivity(found.task, 'due-date-clear');
    saveKanbanBoard();
    renderTaskDrawer();
    renderKanbanBoard();
  });

  document.getElementById('task-drawer-comment-submit')?.addEventListener('click', submitTaskComment);
  document.getElementById('task-drawer-comment-input')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submitTaskComment(); }
  });

  document.getElementById('task-drawer-activity-list')?.addEventListener('click', (e) => {
    const btn = e.target.closest('.task-activity-comment-delete');
    if (btn) deleteTaskComment(btn.dataset.commentId);
  });

  document.getElementById('task-drawer-title')?.addEventListener('click', () => {
    editingTaskTitle = true;
    renderTaskDrawer();
  });

  const titleInput = document.getElementById('task-drawer-title-input');
  if (titleInput) {
    const commitTitle = () => {
      const found = findTaskAndList(activeTaskId);
      if (found) {
        const val = titleInput.value.trim();
        if (val) found.task.text = val;
      }
      editingTaskTitle = false;
      saveKanbanBoard();
      renderTaskDrawer();
      renderKanbanBoard();
    };
    titleInput.addEventListener('blur', commitTitle);
    titleInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); titleInput.blur(); }
      if (e.key === 'Escape') { editingTaskTitle = false; renderTaskDrawer(); }
    });
  }
}

function openTaskDrawer(taskId) {
  activeTaskId = taskId;
  editingTaskTitle = false;
  renderTaskDrawer();
  document.getElementById('task-drawer-backdrop')?.classList.add('show');
  document.getElementById('task-drawer')?.classList.add('show');
}

function closeTaskDrawer() {
  activeTaskId = null;
  editingTaskTitle = false;
  document.getElementById('task-drawer-backdrop')?.classList.remove('show');
  document.getElementById('task-drawer')?.classList.remove('show');
}

function deleteTaskComment(commentId) {
  if (!commentId) return;
  const found = findTaskAndList(activeTaskId);
  if (!found) return;
  found.task.activity = (found.task.activity || []).filter(entry => entry.id !== commentId);
  saveKanbanBoard();
  renderTaskDrawer();
}

function submitTaskComment() {
  const input = document.getElementById('task-drawer-comment-input');
  if (!input) return;
  const text = input.value.trim();
  if (!text) return;
  const found = findTaskAndList(activeTaskId);
  if (!found) return;
  logTaskActivity(found.task, 'comment', { text });
  input.value = '';
  saveKanbanBoard();
  renderTaskDrawer();
}

function renderTaskDrawer() {
  if (!activeTaskId) return;
  const found = findTaskAndList(activeTaskId);
  if (!found) { closeTaskDrawer(); return; }
  const { task, list } = found;

  const listLabel = document.getElementById('task-drawer-list-label');
  const titleEl = document.getElementById('task-drawer-title');
  const titleInput = document.getElementById('task-drawer-title-input');
  if (listLabel) listLabel.textContent = list.title;
  if (titleEl) titleEl.textContent = task.text;
  if (titleInput) titleInput.value = task.text;
  if (titleEl && titleInput) {
    titleEl.hidden = editingTaskTitle;
    titleInput.hidden = !editingTaskTitle;
    if (editingTaskTitle) { titleInput.focus(); titleInput.select(); }
  }

  const createdValue = document.getElementById('task-drawer-created-value');
  if (createdValue) {
    const createdEntry = (task.activity || []).find(a => a.type === 'created');
    createdValue.textContent = createdEntry ? formatActivityDate(createdEntry.at) : '—';
  }

  const dueInput = document.getElementById('task-drawer-due-input');
  const dueClear = document.getElementById('task-drawer-due-clear');
  if (dueInput) dueInput.value = task.dueDate || '';
  if (dueClear) dueClear.hidden = !task.dueDate;

  const activityList = document.getElementById('task-drawer-activity-list');
  if (activityList) {
    const entries = (task.activity || []).slice().reverse();
    activityList.innerHTML = entries.length
      ? entries.map(renderActivityEntry).join('')
      : '<p class="task-activity-empty">Nenhuma atividade ainda.</p>';
  }
}

function renderActivityEntry(entry) {
  const avatar = initials(entry.user || 'Você');
  const when = formatActivityDate(entry.at);

  if (entry.type === 'comment') {
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

  let actionText;
  switch (entry.type) {
    case 'created':
      actionText = `adicionou este cartão a <strong>${escapeHtml(entry.listTitle || '')}</strong>`;
      break;
    case 'move':
      actionText = `moveu este cartão de <strong>${escapeHtml(entry.fromTitle || '')}</strong> para <strong>${escapeHtml(entry.toTitle || '')}</strong>`;
      break;
    case 'check':
      actionText = 'marcou este cartão como <strong>concluída</strong>';
      break;
    case 'uncheck':
      actionText = 'desmarcou a conclusão deste cartão';
      break;
    case 'due-date':
      actionText = `definiu o prazo para <strong>${formatDueDate(entry.date)}</strong>`;
      break;
    case 'due-date-clear':
      actionText = 'removeu o prazo desta tarefa';
      break;
    default:
      actionText = 'atualizou este cartão';
  }

  return `
    <div class="task-activity-item">
      <span class="task-activity-avatar">${avatar}</span>
      <div class="task-activity-content">
        <p class="task-activity-line"><strong>${escapeHtml(entry.user)}</strong> ${actionText}</p>
        <p class="task-activity-time">${when}</p>
      </div>
    </div>
  `;
}

/* -------------------- Compartilhar agenda -------------------- */

const SHARE_BOARD_ACCESS = { view: 'Somente ver', edit: 'Editar' };

function initShareBoardModal() {
  const openBtn = document.getElementById('share-board-btn');
  const modal = document.getElementById('share-board-modal');
  const closeBtn = document.getElementById('share-board-close');
  if (!openBtn || !modal) return;

  const open = () => {
    renderShareBoardMembers();
    modal.classList.add('show');
  };
  const close = () => modal.classList.remove('show');

  openBtn.addEventListener('click', open);
  if (closeBtn) closeBtn.addEventListener('click', close);
  modal.addEventListener('click', (e) => { if (e.target === modal) close(); });

  const inviteBtn = document.getElementById('share-board-invite-btn');
  if (inviteBtn) inviteBtn.addEventListener('click', submitShareBoardInvite);

  const emailInput = document.getElementById('share-board-email');
  if (emailInput) {
    emailInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); submitShareBoardInvite(); }
    });
  }

  const createLinkBtn = document.getElementById('share-board-create-link');
  if (createLinkBtn) createLinkBtn.addEventListener('click', createShareBoardLink);

  const copyLinkBtn = document.getElementById('share-board-copy-link');
  if (copyLinkBtn) copyLinkBtn.addEventListener('click', copyShareBoardLink);

  document.querySelectorAll('[data-share-tab]').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('[data-share-tab]').forEach(t => t.classList.toggle('active', t === tab));
      document.querySelectorAll('[data-share-panel]').forEach(panel => {
        panel.style.display = panel.dataset.sharePanel === tab.dataset.shareTab ? '' : 'none';
      });
    });
  });
}

function renderShareBoardMembers() {
  const wrap = document.getElementById('share-board-members-list');
  if (!wrap) return;

  wrap.innerHTML = B2B_DATA.team.map(m => `
    <div class="share-board-member-row">
      <!-- Sem foto/iniciais: só nome, e-mail e acesso. -->
      <div class="min-w-0 flex-1">
        <p class="text-sm font-semibold text-zinc-900 truncate">${m.name} ${m.owner ? '<span class="owner-tag">· Você</span>' : ''}</p>
        <p class="text-xs text-zinc-500 truncate">${m.email}</p>
      </div>
      ${m.owner
        ? `<span class="share-board-role-fixed">Administrador</span>`
        : `<select class="field-select share-board-role-select" data-share-access="${m.id}">
            ${Object.entries(SHARE_BOARD_ACCESS).map(([value, label]) => `<option value="${value}"${(m.boardAccess || 'edit') === value ? ' selected' : ''}>${label}</option>`).join('')}
          </select>`}
    </div>
  `).join('');

  wrap.querySelectorAll('[data-share-access]').forEach(sel => {
    sel.addEventListener('change', () => {
      const member = B2B_DATA.team.find(x => x.id === sel.dataset.shareAccess);
      if (member) {
        member.boardAccess = sel.value;
        showToast('Acesso atualizado.');
      }
    });
  });

  const countEl = document.getElementById('share-board-members-count');
  if (countEl) countEl.textContent = B2B_DATA.team.length;
}

function submitShareBoardInvite() {
  const emailInput = document.getElementById('share-board-email');
  const accessSelect = document.getElementById('share-board-invite-role');
  const email = emailInput.value.trim();
  if (!email || !email.includes('@')) { showToast('Informe um e-mail válido.', true); return; }

  B2B_DATA.team.push({
    id: 'u' + Date.now(),
    name: email.split('@')[0],
    email,
    role: 'Colaborador',
    boardAccess: accessSelect.value,
    modules: [],
    status: 'pendente',
    owner: false,
    avatar: null
  });

  emailInput.value = '';
  renderShareBoardMembers();
  showToast(`Convite enviado para ${email}.`);
}

function createShareBoardLink() {
  const staticBtn = document.getElementById('share-board-create-link');
  const generated = document.getElementById('share-board-link-generated');
  const linkInput = document.getElementById('share-board-link-input');
  if (!staticBtn || !generated || !linkInput) return;

  linkInput.value = `https://app.love.com.br/agenda/${Date.now().toString(36)}`;
  staticBtn.hidden = true;
  generated.hidden = false;
}

function copyShareBoardLink() {
  const linkInput = document.getElementById('share-board-link-input');
  if (!linkInput) return;
  linkInput.select();
  const done = () => showToast('Link copiado.');
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(linkInput.value).then(done).catch(done);
  } else {
    done();
  }
}

/* -------------------- Agenda: calendário + linha do tempo -------------------- */

const AGENDA_EVENTS_KEY = 'b2b-work-agenda';
const AGENDA_TIMELINE_START_HOUR = 7;
const AGENDA_TIMELINE_END_HOUR = 21;
const AGENDA_HOUR_HEIGHT = 56;
const AGENDA_WEEKDAY_SHORT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const AGENDA_TYPE_META = {
  reuniao: { label: 'Reunião', color: '#7E22CE' },
  entrega: { label: 'Entrega', color: '#B45309' },
  visita: { label: 'Visita técnica', color: '#183b54' },
  outro: { label: 'Outro', color: '#71717A' }
};
const AGENDA_TYPE_ARTICLE = {
  reuniao: 'uma reunião',
  entrega: 'uma entrega',
  visita: 'uma visita técnica',
  outro: 'um compromisso'
};
const AGENDA_NOTIF_BELL_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path stroke-linecap="round" stroke-linejoin="round" d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0"/></svg>';
const AGENDA_NOTIF_GIFT_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path stroke-linecap="round" stroke-linejoin="round" d="M21 11.25v8.25a1.5 1.5 0 0 1-1.5 1.5H5.25a1.5 1.5 0 0 1-1.5-1.5v-8.25M12 4.875A2.625 2.625 0 1 0 9.375 7.5H12m0-2.625V7.5m0-2.625A2.625 2.625 0 1 1 14.625 7.5H12m0 0V21m-8.625-9.75h18c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125h-18c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125Z"/></svg>';

let agendaEvents = [];
let calendarViewDate = new Date();
let selectedAgendaDate = new Date();
let editingEventId = null;
let currentEventGuests = [];

async function loadAgendaEvents() {
  const { data: { session } } = await supabaseClient.auth.getSession();
  if (!session) return [];

  const { data, error } = await supabaseClient
    .from('agenda_events')
    .select('*')
    .eq('fornecedor_id', empresaId(session))
    .order('date', { ascending: true });

  if (error || !data) return [];

  return data.map(e => ({
    id: e.id,
    date: e.date,
    title: e.title,
    type: e.type,
    typeCustom: e.type_custom || '',
    startTime: (e.start_time || '').slice(0, 5),
    endTime: (e.end_time || '').slice(0, 5),
    link: e.link || '',
    local: e.local || '',
    description: e.description || '',
    guests: e.guests || [],
    createdBy: e.created_by,
    createdAt: e.created_at
  }));
}

function formatDateKey(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function formatFriendlyDate(date) {
  return capitalize(date.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' }));
}

function formatShortDateLabel(dateKey) {
  const d = new Date(dateKey + 'T00:00:00');
  return d.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long' });
}

function agendaActivityPhrase(ev) {
  let phrase = AGENDA_TYPE_ARTICLE[ev.type] || AGENDA_TYPE_ARTICLE.outro;
  if (ev.type === 'outro' && ev.typeCustom) phrase += ` (${ev.typeCustom})`;
  return phrase;
}

function getRecentAgendaActivity(limit) {
  return agendaEvents
    .filter(e => e.createdAt)
    .slice()
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, limit);
}

let bAgendaLeads = [];

async function loadAgendaLeads() {
  const { data: { session } } = await supabaseClient.auth.getSession();
  if (!session) { bAgendaLeads = []; return; }
  const { data, error } = await supabaseClient.from('leads').select('name, birthday').eq('fornecedor_id', empresaId(session));
  bAgendaLeads = error || !data ? [] : data;
}

function getUpcomingLeadBirthdays(days) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const results = [];
  bAgendaLeads.forEach(lead => {
    if (!lead.birthday) return;
    const [mm, dd] = lead.birthday.split('-').map(Number);
    let next = new Date(today.getFullYear(), mm - 1, dd);
    if (next < today) next = new Date(today.getFullYear() + 1, mm - 1, dd);
    const diffDays = Math.round((next - today) / 86400000);
    if (diffDays >= 0 && diffDays <= days) results.push({ lead: lead.name, date: next });
  });
  return results.sort((a, b) => a.date - b.date);
}

function renderAgendaNotifications() {
  const wrap = document.getElementById('agenda-notifications-list');
  if (!wrap) return;

  const activity = getRecentAgendaActivity(3);
  const birthdays = getUpcomingLeadBirthdays(30).slice(0, 3);

  if (!activity.length && !birthdays.length) {
    wrap.innerHTML = '<p class="agenda-notif-empty">Nenhuma notificação por enquanto.</p>';
    return;
  }

  const activityHtml = activity.map(ev => `
    <button type="button" class="agenda-notif-item" data-notif-date="${ev.date}">
      <span class="agenda-notif-icon agenda-notif-icon-bell">${AGENDA_NOTIF_BELL_ICON}</span>
      <span class="agenda-notif-text"><strong>${escapeHtml(ev.createdBy || currentUserName())}</strong> adicionou ${agendaActivityPhrase(ev)} em ${formatShortDateLabel(ev.date)}.</span>
    </button>
  `).join('');

  const birthdayHtml = birthdays.map(b => `
    <button type="button" class="agenda-notif-item" data-notif-date="${formatDateKey(b.date)}">
      <span class="agenda-notif-icon agenda-notif-icon-gift">${AGENDA_NOTIF_GIFT_ICON}</span>
      <span class="agenda-notif-text">${formatShortDateLabel(formatDateKey(b.date))} é aniversário do seu lead <strong>${escapeHtml(b.lead)}</strong>.</span>
    </button>
  `).join('');

  wrap.innerHTML = activityHtml + birthdayHtml;

  wrap.querySelectorAll('[data-notif-date]').forEach(btn => {
    btn.addEventListener('click', () => {
      const [y, m, d] = btn.dataset.notifDate.split('-').map(Number);
      selectedAgendaDate = new Date(y, m - 1, d);
      calendarViewDate = new Date(y, m - 1, 1);
      renderMiniCalendar();
      renderAgendaTimeline();
    });
  });
}

async function initAgendaCalendar() {
  if (!document.getElementById('mini-cal-grid')) return;
  agendaEvents = await loadAgendaEvents();

  document.getElementById('mini-cal-prev').addEventListener('click', () => {
    calendarViewDate = new Date(calendarViewDate.getFullYear(), calendarViewDate.getMonth() - 1, 1);
    renderMiniCalendar();
  });
  document.getElementById('mini-cal-next').addEventListener('click', () => {
    calendarViewDate = new Date(calendarViewDate.getFullYear(), calendarViewDate.getMonth() + 1, 1);
    renderMiniCalendar();
  });
  document.getElementById('mini-cal-today-btn').addEventListener('click', () => {
    const today = new Date();
    calendarViewDate = new Date(today.getFullYear(), today.getMonth(), 1);
    selectedAgendaDate = today;
    renderMiniCalendar();
    renderAgendaTimeline();
  });

  // Navegação de dias (Hoje / ‹ / ›) no topo da linha do tempo.
  const irParaDia = (data) => {
    selectedAgendaDate = data;
    calendarViewDate = new Date(data.getFullYear(), data.getMonth(), 1);
    renderMiniCalendar();
    renderAgendaTimeline();
  };
  const somarDias = (n) => {
    const d = new Date(selectedAgendaDate);
    d.setDate(d.getDate() + n);
    irParaDia(d);
  };
  document.getElementById('agenda-hoje-btn')?.addEventListener('click', () => irParaDia(new Date()));
  initSeletorHorarios();
  document.getElementById('agenda-dia-anterior')?.addEventListener('click', () => somarDias(-1));
  document.getElementById('agenda-dia-proximo')?.addEventListener('click', () => somarDias(1));
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && document.getElementById('event-drawer')?.classList.contains('show')) closeEventDrawer();
  });

  document.getElementById('event-drawer-close').addEventListener('click', closeEventDrawer);
  document.getElementById('event-drawer-cancel').addEventListener('click', closeEventDrawer);
  document.getElementById('event-drawer-backdrop').addEventListener('click', closeEventDrawer);
  document.getElementById('event-delete-btn').addEventListener('click', deleteCurrentEvent);
  document.getElementById('event-form').addEventListener('submit', submitEventForm);

  document.getElementById('event-type').addEventListener('change', updateEventTypeCustomVisibility);

  document.querySelectorAll('#event-desc-toolbar [data-desc-cmd]').forEach(btn => {
    btn.addEventListener('mousedown', (e) => e.preventDefault());
    btn.addEventListener('click', () => {
      document.getElementById('event-description').focus();
      document.execCommand(btn.dataset.descCmd, false, null);
    });
  });

  document.getElementById('event-guest-input').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); addEventGuest(); }
  });

  initEventGuestNotifyModal();

  renderMiniCalendar();
  renderAgendaTimeline();
  renderAgendaNotifications();
}

function updateEventTypeCustomVisibility() {
  const wrap = document.getElementById('event-type-custom-wrap');
  wrap.hidden = document.getElementById('event-type').value !== 'outro';
}

function renderEventGuestChips() {
  const wrap = document.getElementById('event-guest-chips');
  wrap.innerHTML = currentEventGuests.map(email => `
    <span class="event-guest-chip">${escapeHtml(email)}<button type="button" data-remove-guest="${escapeHtml(email)}" aria-label="Remover convidado">×</button></span>
  `).join('');
  wrap.querySelectorAll('[data-remove-guest]').forEach(btn => {
    btn.addEventListener('click', () => {
      currentEventGuests = currentEventGuests.filter(email => email !== btn.dataset.removeGuest);
      renderEventGuestChips();
    });
  });
}

function addEventGuest() {
  const input = document.getElementById('event-guest-input');
  const email = input.value.trim();
  if (!email || !email.includes('@')) { showToast('Informe um e-mail válido.', true); return; }
  if (!currentEventGuests.includes(email)) currentEventGuests.push(email);
  input.value = '';
  renderEventGuestChips();
}

function initEventGuestNotifyModal() {
  const modal = document.getElementById('event-guest-notify-modal');
  if (!modal) return;
  const close = () => modal.classList.remove('show');
  document.getElementById('event-guest-notify-cancel').addEventListener('click', close);
  modal.addEventListener('click', (e) => { if (e.target === modal) close(); });
}

function openEventGuestNotifyModal(guests) {
  const modal = document.getElementById('event-guest-notify-modal');
  if (!modal) return;
  modal.classList.add('show');
  document.getElementById('event-guest-notify-send').onclick = () => {
    modal.classList.remove('show');
    showToast(`Aviso enviado para ${guests.length} ${guests.length === 1 ? 'convidado' : 'convidados'}.`);
  };
}

function renderMiniCalendar() {
  const grid = document.getElementById('mini-cal-grid');
  const label = document.getElementById('mini-cal-month-label');
  if (!grid || !label) return;

  const year = calendarViewDate.getFullYear();
  const month = calendarViewDate.getMonth();
  label.textContent = capitalize(calendarViewDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }));

  const firstWeekday = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  const todayKey = formatDateKey(new Date());
  const selectedKey = formatDateKey(selectedAgendaDate);
  const eventDates = new Set(agendaEvents.map(e => e.date));

  let html = '';
  for (let i = firstWeekday - 1; i >= 0; i--) {
    html += `<button type="button" class="mini-cal-day is-muted" disabled>${daysInPrevMonth - i}</button>`;
  }
  for (let d = 1; d <= daysInMonth; d++) {
    const key = formatDateKey(new Date(year, month, d));
    const classes = ['mini-cal-day'];
    if (key === todayKey) classes.push('is-today');
    if (key === selectedKey) classes.push('is-selected');
    html += `<button type="button" class="${classes.join(' ')}" data-cal-date="${key}">${d}${eventDates.has(key) ? '<span class="mini-cal-dot"></span>' : ''}</button>`;
  }
  const totalCells = firstWeekday + daysInMonth;
  const trailing = (7 - (totalCells % 7)) % 7;
  for (let d = 1; d <= trailing; d++) {
    html += `<button type="button" class="mini-cal-day is-muted" disabled>${d}</button>`;
  }

  grid.innerHTML = html;
  grid.querySelectorAll('[data-cal-date]').forEach(btn => {
    btn.addEventListener('click', () => {
      const [y, m, d] = btn.dataset.calDate.split('-').map(Number);
      selectedAgendaDate = new Date(y, m - 1, d);
      renderMiniCalendar();
      renderAgendaTimeline();
    });
  });
}

function renderAgendaTimeline() {
  const grid = document.getElementById('agenda-timeline-grid');
  const dateLabel = document.getElementById('agenda-timeline-date-label');
  if (!grid) return;

  dateLabel.textContent = formatFriendlyDate(selectedAgendaDate);

  const startHour = AGENDA_TIMELINE_START_HOUR;
  const endHour = AGENDA_TIMELINE_END_HOUR;
  const hourHeight = AGENDA_HOUR_HEIGHT;
  const totalHeight = (endHour - startHour + 1) * hourHeight;

  let hoursHtml = '';
  let linesHtml = '';
  for (let h = startHour; h <= endHour; h++) {
    hoursHtml += `<div class="agenda-timeline-hour-row" style="height:${hourHeight}px;"><span>${String(h).padStart(2, '0')}:00</span></div>`;
    linesHtml += `<div class="agenda-timeline-hour-row" style="height:${hourHeight}px;" data-hour="${h}"></div>`;
  }

  const dayKey = formatDateKey(selectedAgendaDate);
  const dayEvents = agendaEvents.filter(e => e.date === dayKey);

  const eventsHtml = dayEvents.map(ev => {
    const [sh, sm] = ev.startTime.split(':').map(Number);
    const [eh, em] = ev.endTime.split(':').map(Number);
    // Dia inteiro (00:00–23:59) ou fora da faixa: corta no começo/fim da linha do tempo.
    const startMinutes = Math.max(sh * 60 + sm, startHour * 60);
    const endMinutes = Math.min(Math.max(eh * 60 + em, startMinutes + 15), (endHour + 1) * 60);
    const top = ((startMinutes - startHour * 60) / 60) * hourHeight;
    const height = Math.max(((endMinutes - startMinutes) / 60) * hourHeight, 24);
    const meta = AGENDA_TYPE_META[ev.type] || AGENDA_TYPE_META.outro;
    return `
      <div class="agenda-timeline-event" data-event-id="${ev.id}" style="top:${top}px; height:${height}px; background:${meta.color};">
        <span class="agenda-timeline-event-title">${escapeHtml(ev.title)}</span>
        <span class="agenda-timeline-event-time">${ev.startTime} – ${ev.endTime}</span>
      </div>
    `;
  }).join('');

  let nowLineHtml = '';
  const now = new Date();
  if (formatDateKey(now) === dayKey) {
    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    if (nowMinutes >= startHour * 60 && nowMinutes <= endHour * 60) {
      const top = ((nowMinutes - startHour * 60) / 60) * hourHeight;
      nowLineHtml = `<div class="agenda-timeline-now-line" style="top:${top}px;"><span class="agenda-timeline-now-dot"></span></div>`;
    }
  }

  grid.innerHTML = `
    <div class="agenda-timeline-hours-col">${hoursHtml}</div>
    <div class="agenda-timeline-lines-col" style="height:${totalHeight}px;">${linesHtml}${eventsHtml}${nowLineHtml}</div>
  `;

  grid.querySelectorAll('.agenda-timeline-lines-col > .agenda-timeline-hour-row').forEach(row => {
    row.addEventListener('click', () => openEventDrawer(null, Number(row.dataset.hour)));
  });
  grid.querySelectorAll('.agenda-timeline-event').forEach(el => {
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      openEventDrawer(el.dataset.eventId);
    });
  });
}

/* Horários do pop-up: lista de 15 em 15 minutos (00:00 a 23:45), como no
   Google Agenda; "Dia inteiro" guarda 00:00–23:59. */
const HORARIOS_15_MIN = Array.from({ length: 96 }, (_, i) => `${String(Math.floor(i / 4)).padStart(2, '0')}:${String((i % 4) * 15).padStart(2, '0')}`);
const DIA_INTEIRO = { inicio: '00:00', fim: '23:59' };

function somarMinutos(hhmm, min) {
  const [h, m] = hhmm.split(':').map(Number);
  const t = Math.min(h * 60 + m + min, 23 * 60 + 45);
  return `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`;
}

function fecharListaHorarios() {
  document.querySelector('.agenda-hora-lista')?.remove();
}

function abrirListaHorarios(input) {
  fecharListaHorarios();
  const lista = document.createElement('div');
  lista.className = 'agenda-hora-lista';
  lista.setAttribute('role', 'listbox');
  lista.innerHTML = HORARIOS_15_MIN.map(hr => `<button type="button" role="option" data-hora="${hr}" class="${hr === input.value ? 'is-atual' : ''}">${hr}</button>`).join('');
  document.body.appendChild(lista);
  const r = input.getBoundingClientRect();
  lista.style.left = `${r.left + window.scrollX}px`;
  lista.style.top = `${r.bottom + 4 + window.scrollY}px`;
  const atual = lista.querySelector('.is-atual') || lista.querySelector(`[data-hora="${HORARIOS_15_MIN.find(hr => hr >= (input.value || '08:00')) || '08:00'}"]`);
  if (atual) lista.scrollTop = atual.offsetTop - lista.clientHeight / 2 + atual.offsetHeight / 2;
  lista.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-hora]');
    if (!btn) return;
    input.value = btn.dataset.hora;
    // Início depois do fim: o fim vai junto (1 hora depois).
    const ini = document.getElementById('event-start');
    const fim = document.getElementById('event-end');
    if (input === ini && fim.value <= ini.value) fim.value = somarMinutos(ini.value, 60);
    if (input === fim && fim.value <= ini.value) ini.value = somarMinutos(fim.value, -60);
    fecharListaHorarios();
  });
}

function aplicarDiaInteiro(ligado) {
  document.getElementById('event-horas-campos').hidden = ligado;
  if (ligado) {
    document.getElementById('event-start').value = DIA_INTEIRO.inicio;
    document.getElementById('event-end').value = DIA_INTEIRO.fim;
  } else if (document.getElementById('event-end').value === DIA_INTEIRO.fim) {
    document.getElementById('event-start').value = '09:00';
    document.getElementById('event-end').value = '10:00';
  }
}

function initSeletorHorarios() {
  ['event-start', 'event-end'].forEach(id => {
    const input = document.getElementById(id);
    input.addEventListener('click', (e) => {
      e.stopPropagation();
      if (document.querySelector('.agenda-hora-lista') && document.activeElement === input && input.dataset.aberto) {
        delete input.dataset.aberto; fecharListaHorarios(); return;
      }
      input.dataset.aberto = '1';
      abrirListaHorarios(input);
    });
  });
  document.getElementById('event-dia-inteiro').addEventListener('change', (e) => aplicarDiaInteiro(e.target.checked));
  document.addEventListener('click', (e) => { if (!e.target.closest('.agenda-hora-lista')) fecharListaHorarios(); });
  document.getElementById('event-drawer').addEventListener('scroll', fecharListaHorarios);
}

function openEventDrawer(eventId, presetHour) {
  editingEventId = eventId || null;
  const form = document.getElementById('event-form');
  form.reset();
  document.getElementById('event-description').innerHTML = '';
  currentEventGuests = [];

  const dateLabel = document.getElementById('event-drawer-date-label');
  const deleteBtn = document.getElementById('event-delete-btn');

  if (editingEventId) {
    const ev = agendaEvents.find(e => e.id === editingEventId);
    if (!ev) return;
    document.getElementById('event-title').value = ev.title;
    document.getElementById('event-type').value = ev.type;
    document.getElementById('event-type-custom').value = ev.typeCustom || '';
    document.getElementById('event-start').value = ev.startTime;
    document.getElementById('event-end').value = ev.endTime;
    document.getElementById('event-link').value = ev.link || '';
    document.getElementById('event-local').value = ev.local || '';
    document.getElementById('event-description').innerHTML = ev.description || '';
    currentEventGuests = (ev.guests || []).slice();
    dateLabel.textContent = formatFriendlyDate(new Date(ev.date + 'T00:00:00'));
    deleteBtn.hidden = false;
  } else {
    const h = presetHour != null ? presetHour : Math.min(Math.max(new Date().getHours(), AGENDA_TIMELINE_START_HOUR), AGENDA_TIMELINE_END_HOUR - 1);
    document.getElementById('event-start').value = `${String(h).padStart(2, '0')}:00`;
    document.getElementById('event-end').value = `${String(h + 1).padStart(2, '0')}:00`;
    document.getElementById('event-type').value = 'reuniao';
    dateLabel.textContent = formatFriendlyDate(selectedAgendaDate);
    deleteBtn.hidden = true;
  }

  const diaInteiro = document.getElementById('event-start').value === DIA_INTEIRO.inicio && document.getElementById('event-end').value === DIA_INTEIRO.fim;
  document.getElementById('event-dia-inteiro').checked = diaInteiro;
  document.getElementById('event-horas-campos').hidden = diaInteiro;
  fecharListaHorarios();
  updateEventTypeCustomVisibility();
  renderEventGuestChips();

  document.getElementById('event-drawer').classList.add('show');
  document.getElementById('event-drawer-backdrop').classList.add('show');
  setTimeout(() => document.getElementById('event-title')?.focus(), 30);
}

function closeEventDrawer() {
  editingEventId = null;
  fecharListaHorarios();
  document.getElementById('event-drawer').classList.remove('show');
  document.getElementById('event-drawer-backdrop').classList.remove('show');
}

async function submitEventForm(e) {
  e.preventDefault();
  const title = document.getElementById('event-title').value.trim();
  const type = document.getElementById('event-type').value;
  const typeCustom = type === 'outro' ? document.getElementById('event-type-custom').value.trim() : '';
  const startTime = document.getElementById('event-start').value;
  const endTime = document.getElementById('event-end').value;
  const link = document.getElementById('event-link').value.trim();
  const local = document.getElementById('event-local').value.trim();
  const description = document.getElementById('event-description').innerHTML.trim();
  const guests = currentEventGuests.slice();

  if (!title || !startTime || !endTime) {
    showToast('Preencha título, início e fim do evento.', true);
    return;
  }
  if (endTime <= startTime) {
    showToast('O horário de fim precisa ser depois do início.', true);
    return;
  }

  const { data: { session } } = await supabaseClient.auth.getSession();
  if (!session) return;

  if (editingEventId) {
    const { error } = await supabaseClient
      .from('agenda_events')
      .update({ title, type, type_custom: typeCustom, start_time: startTime, end_time: endTime, link, local, description, guests })
      .eq('id', editingEventId);
    if (error) { showToast('Não foi possível atualizar o evento.', true); return; }
    showToast('Evento atualizado.');
  } else {
    const { error } = await supabaseClient.from('agenda_events').insert({
      fornecedor_id: empresaId(session),
      date: formatDateKey(selectedAgendaDate),
      title, type, type_custom: typeCustom, start_time: startTime, end_time: endTime, link, local, description, guests,
      created_by: currentUserName()
    });
    if (error) { showToast('Não foi possível adicionar o evento.', true); return; }
    avisarAdicionado(title, 'Evento adicionado à agenda.');
  }

  agendaEvents = await loadAgendaEvents();
  closeEventDrawer();
  renderMiniCalendar();
  renderAgendaTimeline();
  renderAgendaNotifications();

  if (guests.length) openEventGuestNotifyModal(guests);
}

async function deleteCurrentEvent() {
  if (!editingEventId) return;
  const { error } = await supabaseClient.from('agenda_events').delete().eq('id', editingEventId);
  if (error) { showToast('Não foi possível remover o evento.', true); return; }
  agendaEvents = await loadAgendaEvents();
  closeEventDrawer();
  renderMiniCalendar();
  renderAgendaTimeline();
  renderAgendaNotifications();
  showToast('Evento removido.');
}
