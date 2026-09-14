/* ==========================================================================
   LOVE B2B — Páginas do Site (URL, personalização da vitrine e formulários)
   Somente front-end. Sem integração com backend ainda.
   ========================================================================== */

const FIELD_TYPE_LABELS = {
  curta: 'Resposta curta',
  longa: 'Resposta longa',
  multipla: 'Múltipla escolha',
  livre: 'Texto livre'
};

let siteForms = [
  {
    id: 'form1',
    title: 'Formulário de orçamento',
    responses: 18,
    fields: [
      { id: 'f1a', type: 'curta', question: 'Nome completo' },
      { id: 'f1b', type: 'multipla', question: 'Tipo de evento', options: ['Casamento', 'Debutante', 'Aniversário', 'Corporativo'] },
      { id: 'f1c', type: 'longa', question: 'Conte um pouco sobre o evento que você está planejando' }
    ]
  },
  {
    id: 'form2',
    title: 'Pesquisa de satisfação',
    responses: 34,
    fields: [
      { id: 'f2a', type: 'multipla', question: 'Como você avalia o nosso atendimento?', options: ['Ótimo', 'Bom', 'Regular', 'Ruim'] },
      { id: 'f2b', type: 'longa', question: 'O que podemos melhorar?' }
    ]
  }
];

let editingFormId = null;
let drawerFields = [];
let fieldIdCounter = 0;

document.addEventListener('DOMContentLoaded', () => {
  initSiteTabs();
  initFormsList();
  initFormDrawer();
});

/* -------------------- Abas: Editar site / Formulários -------------------- */

function initSiteTabs() {
  const wrap = document.getElementById('site-tabs');
  if (!wrap) return;

  wrap.querySelectorAll('[data-tab]').forEach(btn => {
    btn.addEventListener('click', () => {
      wrap.querySelectorAll('[data-tab]').forEach(b => b.classList.toggle('active', b === btn));
      document.querySelectorAll('[data-tab-panel]').forEach(panel => {
        panel.style.display = panel.dataset.tabPanel === btn.dataset.tab ? '' : 'none';
      });
    });
  });
}

/* -------------------- Lista de formulários -------------------- */

function initFormsList() {
  const createBtn = document.getElementById('form-create-btn');
  if (createBtn) createBtn.addEventListener('click', () => openFormDrawer(null));
  renderFormsList();
}

function renderFormsList() {
  const list = document.getElementById('forms-list');
  if (!list) return;

  if (!siteForms.length) {
    list.innerHTML = `<div class="forms-empty">Você ainda não criou nenhum formulário. Clique em "Criar novo" para começar.</div>`;
    return;
  }

  list.innerHTML = siteForms.map(form => `
    <div class="form-list-item" data-form-id="${form.id}">
      <div class="form-list-item-icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" /></svg>
      </div>
      <div class="form-list-item-info">
        <p class="form-list-item-title">${escapeHtml(form.title)}</p>
        <p class="form-list-item-meta">${form.fields.length} ${form.fields.length === 1 ? 'pergunta' : 'perguntas'} · ${form.responses} respostas</p>
      </div>
      <div class="form-list-item-actions">
        <button type="button" class="form-list-item-btn" data-edit-form="${form.id}" aria-label="Editar formulário">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Z" /></svg>
        </button>
        <button type="button" class="form-list-item-btn" data-delete-form="${form.id}" aria-label="Excluir formulário">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" /></svg>
        </button>
      </div>
    </div>
  `).join('');

  list.querySelectorAll('[data-edit-form]').forEach(btn => {
    btn.addEventListener('click', () => openFormDrawer(btn.dataset.editForm));
  });
  list.querySelectorAll('[data-delete-form]').forEach(btn => {
    btn.addEventListener('click', () => {
      siteForms = siteForms.filter(f => f.id !== btn.dataset.deleteForm);
      renderFormsList();
      showToast('Formulário excluído.');
    });
  });
}

/* -------------------- Drawer de criação/edição -------------------- */

function initFormDrawer() {
  const backdrop = document.getElementById('form-drawer-backdrop');
  const drawer = document.getElementById('form-drawer');
  const closeBtn = document.getElementById('form-drawer-close');
  const addFieldBtn = document.getElementById('form-add-field-btn');
  const saveBtn = document.getElementById('form-save-btn');
  if (!backdrop || !drawer) return;

  closeBtn.addEventListener('click', closeFormDrawer);
  backdrop.addEventListener('click', closeFormDrawer);
  addFieldBtn.addEventListener('click', () => {
    drawerFields.push(makeField('curta'));
    renderDrawerFields();
  });
  saveBtn.addEventListener('click', saveDrawerForm);
}

function openFormDrawer(formId) {
  const backdrop = document.getElementById('form-drawer-backdrop');
  const drawer = document.getElementById('form-drawer');
  const titleInput = document.getElementById('form-title-input');

  editingFormId = formId;
  const existing = formId ? siteForms.find(f => f.id === formId) : null;

  if (existing) {
    titleInput.value = existing.title;
    drawerFields = existing.fields.map(f => ({ ...f, options: f.options ? [...f.options] : undefined }));
  } else {
    titleInput.value = '';
    drawerFields = [makeField('curta')];
  }

  renderDrawerFields();
  backdrop.classList.add('show');
  drawer.classList.add('show');
  titleInput.focus();
}

function closeFormDrawer() {
  document.getElementById('form-drawer-backdrop').classList.remove('show');
  document.getElementById('form-drawer').classList.remove('show');
}

function makeField(type) {
  fieldIdCounter += 1;
  const field = { id: 'field-' + Date.now() + '-' + fieldIdCounter, type, question: '' };
  if (type === 'multipla') field.options = ['Opção 1'];
  if (type === 'livre') field.freeText = '';
  return field;
}

function renderDrawerFields() {
  const wrap = document.getElementById('form-drawer-fields');
  if (!wrap) return;

  wrap.innerHTML = drawerFields.map(field => `
    <div class="form-field-card" data-field-id="${field.id}">
      <div class="form-field-card-header">
        <input type="text" class="form-field-question-input" placeholder="Pergunta sem título" value="${escapeHtml(field.question || '')}" data-field-question>
        <select class="form-field-type-select" data-field-type>
          <option value="curta" ${field.type === 'curta' ? 'selected' : ''}>Resposta curta</option>
          <option value="longa" ${field.type === 'longa' ? 'selected' : ''}>Resposta longa</option>
          <option value="multipla" ${field.type === 'multipla' ? 'selected' : ''}>Múltipla escolha</option>
          <option value="livre" ${field.type === 'livre' ? 'selected' : ''}>Texto livre</option>
        </select>
      </div>
      <div class="form-field-body">${renderFieldBody(field)}</div>
      <div class="form-field-footer">
        <button type="button" class="form-field-delete" data-field-remove>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" /></svg>
          Remover pergunta
        </button>
      </div>
    </div>
  `).join('');

  wrap.querySelectorAll('.form-field-card').forEach(card => {
    const fieldId = card.dataset.fieldId;
    const field = drawerFields.find(f => f.id === fieldId);
    if (!field) return;

    card.querySelector('[data-field-question]').addEventListener('input', (e) => {
      field.question = e.target.value;
    });

    card.querySelector('[data-field-type]').addEventListener('change', (e) => {
      const newType = e.target.value;
      field.type = newType;
      if (newType === 'multipla' && !field.options) field.options = ['Opção 1'];
      if (newType === 'livre' && field.freeText === undefined) field.freeText = '';
      renderDrawerFields();
    });

    card.querySelector('[data-field-remove]').addEventListener('click', () => {
      drawerFields = drawerFields.filter(f => f.id !== fieldId);
      renderDrawerFields();
    });

    if (field.type === 'multipla') {
      card.querySelectorAll('[data-option-input]').forEach((input, i) => {
        input.addEventListener('input', (e) => { field.options[i] = e.target.value; });
      });
      card.querySelectorAll('[data-option-remove]').forEach((btn, i) => {
        btn.addEventListener('click', () => {
          field.options.splice(i, 1);
          if (!field.options.length) field.options = ['Opção 1'];
          renderDrawerFields();
        });
      });
      const addOptionBtn = card.querySelector('[data-option-add]');
      if (addOptionBtn) {
        addOptionBtn.addEventListener('click', () => {
          field.options.push('Opção ' + (field.options.length + 1));
          renderDrawerFields();
        });
      }
    }

    if (field.type === 'livre') {
      const freeTextArea = card.querySelector('[data-freetext]');
      if (freeTextArea) freeTextArea.addEventListener('input', (e) => { field.freeText = e.target.value; });
    }
  });
}

function renderFieldBody(field) {
  if (field.type === 'curta') {
    return `<input type="text" class="form-field-preview-line" placeholder="Texto de resposta curta" disabled>`;
  }
  if (field.type === 'longa') {
    return `<div class="form-field-preview-box">Texto de resposta longa</div>`;
  }
  if (field.type === 'livre') {
    return `<textarea class="form-field-freetext" placeholder="Escreva aqui o texto explicativo que aparecerá no formulário..." data-freetext>${escapeHtml(field.freeText || '')}</textarea>`;
  }
  if (field.type === 'multipla') {
    const options = field.options && field.options.length ? field.options : ['Opção 1'];
    return `
      <div class="form-field-options">
        ${options.map((opt, i) => `
          <div class="form-field-option-row">
            <span class="radio-dot"></span>
            <input type="text" class="form-field-option-input" value="${escapeHtml(opt)}" placeholder="Opção ${i + 1}" data-option-input>
            <button type="button" class="form-field-option-remove" data-option-remove aria-label="Remover opção">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
            </button>
          </div>
        `).join('')}
        <button type="button" class="form-field-add-option" data-option-add>
          <span class="radio-dot"></span> Adicionar opção
        </button>
      </div>
    `;
  }
  return '';
}

function saveDrawerForm() {
  const titleInput = document.getElementById('form-title-input');
  const title = titleInput.value.trim() || 'Formulário sem título';

  if (!drawerFields.length) {
    showToast('Adicione ao menos uma pergunta antes de salvar.', true);
    return;
  }

  if (editingFormId) {
    const form = siteForms.find(f => f.id === editingFormId);
    if (form) {
      form.title = title;
      form.fields = drawerFields;
    }
  } else {
    siteForms.push({
      id: 'form-' + Date.now(),
      title,
      responses: 0,
      fields: drawerFields
    });
  }

  renderFormsList();
  closeFormDrawer();
  showToast(editingFormId ? 'Formulário atualizado!' : 'Formulário criado!');
}
