/* ==========================================================================
   LOVE B2B — Páginas do Site (URL, personalização da vitrine e formulários)
   Somente front-end. Sem integração com backend ainda.
   ========================================================================== */

const FIELD_TYPE_LABELS = {
  curta: 'Resposta curta',
  longa: 'Resposta longa',
  multipla: 'Múltipla escolha',
  caixa: 'Caixa de seleção',
  data: 'Data',
  horario: 'Horário',
  livre: 'Texto livre'
};

let siteForms = B2B_DATA.siteForms;

let editingFormId = null;
let drawerFields = [];
let fieldIdCounter = 0;

let drawerBgMode = 'color';
let drawerBgColor = '';
let drawerBgImage = '';

document.addEventListener('DOMContentLoaded', () => {
  initSiteTabs();
  initFormsList();
  initFormDrawer();
  initResponsesDrawer();
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
  renderFormsList();
}

function renderFormsList() {
  const list = document.getElementById('forms-list');
  if (!list) return;

  const itemsHtml = siteForms.length ? siteForms.map(form => `
    <div class="form-list-item" data-form-id="${form.id}">
      <div class="form-list-item-icon form-list-item-icon-edit">
        ${BI.editSquare}
      </div>
      <div class="form-list-item-info">
        <p class="form-list-item-title">${escapeHtml(form.title)}</p>
        <p class="form-list-item-meta">${form.fields.length} ${form.fields.length === 1 ? 'pergunta' : 'perguntas'} · ${form.responses} respostas</p>
      </div>
      <div class="form-list-item-actions">
        <button type="button" class="form-list-item-btn" data-edit-form="${form.id}" aria-label="Editar formulário">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Z" /></svg>
        </button>
        <button type="button" class="form-list-item-btn" data-view-responses="${form.id}" aria-label="Ver respostas" title="Ver respostas">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M2.25 12s3.75-7.5 9.75-7.5 9.75 7.5 9.75 7.5-3.75 7.5-9.75 7.5-9.75-7.5-9.75-7.5Z" /><circle cx="12" cy="12" r="3" /></svg>
        </button>
        <button type="button" class="form-list-item-btn" data-delete-form="${form.id}" aria-label="Excluir formulário">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" /></svg>
        </button>
      </div>
    </div>
  `).join('') : '';

  const createBoxHtml = `
    <div class="form-list-item form-list-item-create" id="form-create-box" role="button" tabindex="0">
      <div class="form-list-item-icon form-list-item-icon-create">
        ${BI.plus}
      </div>
      <div class="form-list-item-info">
        <p class="form-list-item-title">Criar novo formulário</p>
      </div>
    </div>
  `;

  list.innerHTML = itemsHtml + createBoxHtml;

  const createBox = document.getElementById('form-create-box');
  createBox.addEventListener('click', () => openFormDrawer(null));
  createBox.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openFormDrawer(null); }
  });

  list.querySelectorAll('[data-edit-form]').forEach(btn => {
    btn.addEventListener('click', () => openFormDrawer(btn.dataset.editForm));
  });
  list.querySelectorAll('[data-view-responses]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      openResponsesDrawer(btn.dataset.viewResponses);
    });
  });
  list.querySelectorAll('[data-delete-form]').forEach(btn => {
    btn.addEventListener('click', () => {
      siteForms = B2B_DATA.siteForms = siteForms.filter(f => f.id !== btn.dataset.deleteForm);
      delete responsesCache[btn.dataset.deleteForm];
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
  const descriptionInput = document.getElementById('form-description-input');

  editingFormId = formId;
  const existing = formId ? siteForms.find(f => f.id === formId) : null;

  if (existing) {
    titleInput.value = existing.title;
    descriptionInput.value = existing.description || '';
    drawerFields = existing.fields.map(f => ({ ...f, options: f.options ? [...f.options] : undefined }));
    drawerBgColor = existing.bgColor || '';
    drawerBgImage = existing.bgImage || '';
  } else {
    titleInput.value = '';
    descriptionInput.value = '';
    drawerFields = [makeField('curta')];
    drawerBgColor = '';
    drawerBgImage = '';
  }
  drawerBgMode = drawerBgImage ? 'image' : 'color';

  renderDrawerFields();
  renderFormBgField();
  applyFormHeaderBg();
  backdrop.classList.add('show');
  drawer.classList.add('show');
  titleInput.focus();
}

function closeFormDrawer() {
  document.getElementById('form-drawer-backdrop').classList.remove('show');
  document.getElementById('form-drawer').classList.remove('show');
  closeOpenColorPopover();
}

/* -------------------- Fundo do formulário (drawer inteiro) -------------------- */

function applyFormHeaderBg() {
  const drawer = document.getElementById('form-drawer');
  if (!drawer) return;
  const hasCustomBg = !!(drawerBgImage || drawerBgColor);
  drawer.classList.toggle('has-custom-bg', hasCustomBg);
  drawer.style.backgroundImage = drawerBgImage ? `url('${drawerBgImage}')` : '';
  drawer.style.backgroundColor = drawerBgColor || '';
}

function reopenFormBgPopover() {
  const field = document.getElementById('form-bg-field');
  const popover = field && field.querySelector('[data-form-bg-popover]');
  if (field && popover) {
    popover.hidden = false;
    openColorPopover = { fieldEl: field, popoverEl: popover };
  }
}

function renderFormBgField() {
  const field = document.getElementById('form-bg-field');
  if (!field) return;

  const color = drawerBgColor || '#F4F4F5';

  field.innerHTML = `
    <button type="button" class="form-drawer-bg-edit-btn" data-form-bg-toggle title="Editar fundo da seção" aria-label="Editar fundo da seção">
      ${BI.palette}
    </button>
    <div class="color-alpha-popover form-drawer-bg-popover" data-form-bg-popover hidden>
      <div class="form-drawer-bg-tabs">
        <button type="button" class="form-drawer-bg-tab${drawerBgMode === 'color' ? ' active' : ''}" data-form-bg-mode="color">Cor</button>
        <button type="button" class="form-drawer-bg-tab${drawerBgMode === 'image' ? ' active' : ''}" data-form-bg-mode="image">Imagem</button>
      </div>
      <div class="form-drawer-bg-panel" data-form-bg-panel="color" ${drawerBgMode === 'color' ? '' : 'hidden'}>
        <div class="color-alpha-top-row">
          <input type="color" class="color-alpha-native" data-form-bg-color-native value="${color}">
          <input type="text" class="color-alpha-hex" data-form-bg-color-hex maxlength="7" spellcheck="false" value="${escapeHtml(color.toUpperCase())}">
        </div>
      </div>
      <div class="form-drawer-bg-panel" data-form-bg-panel="image" ${drawerBgMode === 'image' ? '' : 'hidden'}>
        ${imageUploadZoneHtml(drawerBgImage, 'data-form-bg-image-upload')}
      </div>
      ${(drawerBgColor || drawerBgImage) ? `<button type="button" class="form-drawer-bg-remove" data-form-bg-remove>Remover fundo</button>` : ''}
    </div>
  `;

  const toggle = field.querySelector('[data-form-bg-toggle]');
  const popover = field.querySelector('[data-form-bg-popover]');
  wireColorPopoverToggle(field, toggle, popover);

  field.querySelectorAll('[data-form-bg-mode]').forEach(tab => {
    tab.addEventListener('click', (e) => {
      e.stopPropagation();
      drawerBgMode = tab.dataset.formBgMode;
      renderFormBgField();
      reopenFormBgPopover();
    });
  });

  const nativeColor = field.querySelector('[data-form-bg-color-native]');
  const hexInput = field.querySelector('[data-form-bg-color-hex]');
  if (nativeColor) {
    nativeColor.addEventListener('input', () => {
      drawerBgColor = nativeColor.value;
      hexInput.value = nativeColor.value.toUpperCase();
      applyFormHeaderBg();
    });
  }
  if (hexInput) {
    hexInput.addEventListener('input', () => {
      const val = hexInput.value.trim();
      if (/^#[0-9A-Fa-f]{6}$/.test(val)) {
        drawerBgColor = val;
        nativeColor.value = val;
        applyFormHeaderBg();
      }
    });
  }

  const uploadInput = field.querySelector('[data-form-bg-image-upload]');
  if (uploadInput) {
    const applyFile = (file) => {
      readFileAsDataUrl(file, (dataUrl) => {
        drawerBgImage = dataUrl;
        applyFormHeaderBg();
        renderFormBgField();
        reopenFormBgPopover();
      });
    };
    uploadInput.addEventListener('change', () => {
      const file = uploadInput.files[0];
      if (file) applyFile(file);
    });
    wireImageDropZone(uploadInput.closest('.image-upload-zone'), applyFile);
  }

  const removeBtn = field.querySelector('[data-form-bg-remove]');
  if (removeBtn) {
    removeBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      drawerBgColor = '';
      drawerBgImage = '';
      drawerBgMode = 'color';
      applyFormHeaderBg();
      renderFormBgField();
    });
  }
}

function makeField(type) {
  fieldIdCounter += 1;
  const field = { id: 'field-' + Date.now() + '-' + fieldIdCounter, type, question: '', required: false };
  if (type === 'multipla' || type === 'caixa') field.options = ['Opção 1'];
  if (type === 'livre') field.freeText = '';
  return field;
}

function duplicateField(field) {
  fieldIdCounter += 1;
  const clone = { ...field, id: 'field-' + Date.now() + '-' + fieldIdCounter };
  if (field.options) clone.options = [...field.options];
  return clone;
}

function renderDrawerFields() {
  const wrap = document.getElementById('form-drawer-fields');
  if (!wrap) return;

  if (!drawerFields.length) {
    wrap.innerHTML = `
      <div class="form-fields-empty">
        ${BI.layers}
        <span>Ainda não existe nenhuma pergunta neste formulário.</span>
      </div>
    `;
    return;
  }

  wrap.innerHTML = drawerFields.map(field => `
    <div class="form-field-card" data-field-id="${field.id}">
      <div class="form-field-card-header">
        <input type="text" class="form-field-question-input" placeholder="Pergunta sem título" value="${escapeHtml(field.question || '')}" data-field-question>
        <select class="form-field-type-select" data-field-type>
          <option value="curta" ${field.type === 'curta' ? 'selected' : ''}>Resposta curta</option>
          <option value="longa" ${field.type === 'longa' ? 'selected' : ''}>Resposta longa</option>
          <option value="multipla" ${field.type === 'multipla' ? 'selected' : ''}>Múltipla escolha</option>
          <option value="caixa" ${field.type === 'caixa' ? 'selected' : ''}>Caixa de seleção</option>
          <option value="data" ${field.type === 'data' ? 'selected' : ''}>Data</option>
          <option value="horario" ${field.type === 'horario' ? 'selected' : ''}>Horário</option>
          <option value="livre" ${field.type === 'livre' ? 'selected' : ''}>Texto livre</option>
        </select>
      </div>
      <div class="form-field-body">${renderFieldBody(field)}</div>
      <div class="form-field-footer">
        <div class="form-field-footer-actions">
          <button type="button" class="form-field-icon-btn" data-field-duplicate title="Duplicar pergunta" aria-label="Duplicar pergunta">
            ${BI.duplicate}
          </button>
          <button type="button" class="form-field-icon-btn form-field-icon-btn-danger" data-field-remove title="Excluir pergunta" aria-label="Excluir pergunta">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" /></svg>
          </button>
        </div>
        <label class="form-field-required-toggle">
          <span>Obrigatória</span>
          <span class="settings-switch">
            <input type="checkbox" data-field-required ${field.required ? 'checked' : ''}>
            <span class="settings-switch-track"></span>
          </span>
        </label>
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
      if ((newType === 'multipla' || newType === 'caixa') && !field.options) field.options = ['Opção 1'];
      if (newType === 'livre' && field.freeText === undefined) field.freeText = '';
      renderDrawerFields();
    });

    card.querySelector('[data-field-required]').addEventListener('change', (e) => {
      field.required = e.target.checked;
    });

    card.querySelector('[data-field-duplicate]').addEventListener('click', () => {
      const idx = drawerFields.findIndex(f => f.id === fieldId);
      drawerFields.splice(idx + 1, 0, duplicateField(field));
      renderDrawerFields();
    });

    card.querySelector('[data-field-remove]').addEventListener('click', () => {
      drawerFields = drawerFields.filter(f => f.id !== fieldId);
      renderDrawerFields();
    });

    if (field.type === 'multipla' || field.type === 'caixa') {
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
  if (field.type === 'data') {
    return `<input type="date" class="form-field-preview-line" disabled>`;
  }
  if (field.type === 'horario') {
    return `<input type="time" class="form-field-preview-line" disabled>`;
  }
  if (field.type === 'multipla' || field.type === 'caixa') {
    const options = field.options && field.options.length ? field.options : ['Opção 1'];
    const markerClass = field.type === 'caixa' ? 'checkbox-square' : 'radio-dot';
    return `
      <div class="form-field-options">
        ${options.map((opt, i) => `
          <div class="form-field-option-row">
            <span class="${markerClass}"></span>
            <input type="text" class="form-field-option-input" value="${escapeHtml(opt)}" placeholder="Opção ${i + 1}" data-option-input>
            <button type="button" class="form-field-option-remove" data-option-remove aria-label="Remover opção">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
            </button>
          </div>
        `).join('')}
        <button type="button" class="form-field-add-option" data-option-add>
          <span class="${markerClass}"></span> Adicionar opção
        </button>
      </div>
    `;
  }
  return '';
}

function saveDrawerForm() {
  const titleInput = document.getElementById('form-title-input');
  const descriptionInput = document.getElementById('form-description-input');
  const title = titleInput.value.trim() || 'Formulário sem título';
  const description = descriptionInput.value.trim();

  if (!drawerFields.length) {
    showToast('Adicione ao menos uma pergunta antes de salvar.', true);
    return;
  }

  if (editingFormId) {
    const form = siteForms.find(f => f.id === editingFormId);
    if (form) {
      form.title = title;
      form.description = description;
      form.fields = drawerFields;
      form.bgColor = drawerBgColor;
      form.bgImage = drawerBgImage;
    }
  } else {
    siteForms.push({
      id: 'form-' + Date.now(),
      title,
      description,
      responses: 0,
      fields: drawerFields,
      bgColor: drawerBgColor,
      bgImage: drawerBgImage
    });
  }

  renderFormsList();
  closeFormDrawer();
  showToast(editingFormId ? 'Formulário atualizado!' : 'Formulário criado!');
}

/* ==========================================================================
   Respostas — lista de formulários e respostas recebidas (dados fictícios,
   sem backend; somente leitura)
   ========================================================================== */

const MOCK_RESPONDENT_NAMES = [
  'Marina Alves', 'Rafael Souza', 'Beatriz Lima', 'João Pedro Costa', 'Camila Ferreira',
  'Lucas Oliveira', 'Fernanda Rocha', 'Gabriel Santos', 'Juliana Martins', 'Pedro Henrique Silva',
  'Larissa Almeida', 'Thiago Pereira', 'Amanda Ribeiro', 'Bruno Carvalho', 'Isabela Gomes',
  'Rodrigo Barbosa', 'Patrícia Nunes', 'Diego Cardoso', 'Vanessa Teixeira', 'Felipe Araújo'
];
const MOCK_EMAIL_DOMAINS = ['gmail.com', 'hotmail.com', 'outlook.com', 'icloud.com'];
const MOCK_SHORT_ANSWERS = ['Sim', 'Ainda não decidi', '150 convidados', 'Prefiro decidir depois', 'Salão de festas no centro'];
const MOCK_LONG_ANSWERS = [
  'Estamos planejando um evento para cerca de 120 convidados, com decoração clássica e um jantar completo.',
  'Queremos algo intimista, ao ar livre, com uma cerimônia curta seguida de uma recepção descontraída.',
  'Ainda estamos definindo os detalhes, mas a ideia é um evento sofisticado com tema em tons pastel.',
  'Buscamos um espaço amplo para receber a família toda, com boa estrutura para crianças também.',
  'A celebração será mais reservada, focada em boa comida, música ao vivo e um ambiente aconchegante.'
];

let responsesViewFormId = null;
let responsesViewMode = 'list';
let responsesViewResponseId = null;
let responsesCache = {};

function slugifyEmailPart(name) {
  return name
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/[^a-z\s]/g, '').trim().replace(/\s+/g, '.');
}

function mockPhone(seed) {
  const part1 = 90000 + (seed * 137) % 10000;
  const part2 = 1000 + (seed * 271) % 9000;
  return `(19) 9${String(part1).slice(-4)}-${part2}`;
}

function mockAnswerForField(field, seed) {
  const type = field.type;
  if (type === 'curta') return MOCK_SHORT_ANSWERS[seed % MOCK_SHORT_ANSWERS.length];
  if (type === 'longa') return MOCK_LONG_ANSWERS[seed % MOCK_LONG_ANSWERS.length];
  if (type === 'multipla') {
    const opts = field.options && field.options.length ? field.options : ['Opção 1'];
    return opts[seed % opts.length];
  }
  if (type === 'caixa') {
    const opts = field.options && field.options.length ? field.options : ['Opção 1'];
    const count = 1 + (seed % Math.min(2, opts.length));
    const picked = [];
    for (let i = 0; i < count; i++) picked.push(opts[(seed + i) % opts.length]);
    return [...new Set(picked)];
  }
  if (type === 'data') {
    const day = 1 + (seed % 27);
    const month = 1 + (seed % 12);
    return `2026-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  }
  if (type === 'horario') {
    const hours = ['10:00', '14:00', '16:30', '19:00', '20:30'];
    return hours[seed % hours.length];
  }
  return null;
}

function generateMockResponses(form) {
  const answerableFields = form.fields.filter(f => f.type !== 'livre');
  const responses = [];
  const count = form.responses || 0;

  for (let i = 0; i < count; i++) {
    const name = MOCK_RESPONDENT_NAMES[i % MOCK_RESPONDENT_NAMES.length];
    const domain = MOCK_EMAIL_DOMAINS[i % MOCK_EMAIL_DOMAINS.length];
    const repeatSuffix = Math.floor(i / MOCK_RESPONDENT_NAMES.length);
    const email = `${slugifyEmailPart(name)}${repeatSuffix > 0 ? repeatSuffix + 1 : ''}@${domain}`;
    const phone = mockPhone(i + 1);
    const daysAgo = i * 2 + 1;
    const submittedAt = new Date(Date.now() - daysAgo * 86400000).toISOString();

    const answers = {};
    answerableFields.forEach((field, fi) => {
      const seed = i + fi * 7 + 3;
      answers[field.id] = /nome/i.test(field.question || '') && field.type === 'curta'
        ? name
        : mockAnswerForField(field, seed);
    });

    responses.push({ id: `${form.id}-r${i + 1}`, name, email, phone, submittedAt, answers });
  }

  return responses;
}

function getMockResponsesForForm(form) {
  if (!responsesCache[form.id]) responsesCache[form.id] = generateMockResponses(form);
  return responsesCache[form.id];
}

function formatAnswerValue(val) {
  if (val === null || val === undefined || val === '') return '—';
  if (Array.isArray(val)) return val.join(', ');
  if (/^\d{4}-\d{2}-\d{2}$/.test(val)) {
    const [y, m, d] = val.split('-');
    return `${d}/${m}/${y}`;
  }
  return String(val);
}

function initResponsesDrawer() {
  document.getElementById('responses-drawer-close')?.addEventListener('click', closeResponsesDrawer);
  document.getElementById('responses-drawer-backdrop')?.addEventListener('click', closeResponsesDrawer);
  document.getElementById('responses-drawer-back')?.addEventListener('click', () => {
    responsesViewMode = 'list';
    responsesViewResponseId = null;
    renderResponsesDrawerContent();
  });
}

function openResponsesDrawer(formId) {
  const form = siteForms.find(f => f.id === formId);
  if (!form) return;
  responsesViewFormId = formId;
  responsesViewMode = 'list';
  responsesViewResponseId = null;

  renderResponsesDrawerContent();

  document.getElementById('responses-drawer-backdrop').classList.add('show');
  document.getElementById('responses-drawer').classList.add('show');
}

function closeResponsesDrawer() {
  document.getElementById('responses-drawer-backdrop').classList.remove('show');
  document.getElementById('responses-drawer').classList.remove('show');
}

function renderResponsesDrawerContent() {
  const form = siteForms.find(f => f.id === responsesViewFormId);
  if (!form) return;

  const backBtn = document.getElementById('responses-drawer-back');
  const titleEl = document.getElementById('responses-drawer-title');
  const subtitleEl = document.getElementById('responses-drawer-subtitle');
  const body = document.getElementById('responses-list');

  if (responsesViewMode === 'detail') {
    const responses = getMockResponsesForForm(form);
    const r = responses.find(x => x.id === responsesViewResponseId);
    if (!r) {
      responsesViewMode = 'list';
      renderResponsesDrawerContent();
      return;
    }

    backBtn.hidden = false;
    titleEl.textContent = r.name;
    subtitleEl.textContent = `${r.email} · ${r.phone}`;

    const answerableFields = form.fields.filter(f => f.type !== 'livre');
    body.innerHTML = answerableFields.map(field => `
      <div class="response-answer-row">
        <p class="response-answer-question">${escapeHtml(field.question || '(Pergunta sem título)')}</p>
        <p class="response-answer-value">${escapeHtml(formatAnswerValue(r.answers[field.id]))}</p>
      </div>
    `).join('');
    return;
  }

  backBtn.hidden = true;
  titleEl.textContent = form.title;
  subtitleEl.textContent = `${form.responses} ${form.responses === 1 ? 'resposta' : 'respostas'}`;

  const responses = getMockResponsesForForm(form);

  if (!responses.length) {
    body.innerHTML = `
      <div class="form-fields-empty">
        ${BI.layers}
        <span>Este formulário ainda não recebeu nenhuma resposta.</span>
      </div>
    `;
    return;
  }

  body.innerHTML = responses.map(r => `
    <button type="button" class="response-list-row" data-response-id="${r.id}">
      <span class="response-list-row-avatar">${initials(r.name)}</span>
      <span class="response-list-row-info">
        <span class="response-list-row-name">${escapeHtml(r.name)}</span>
        <span class="response-list-row-email">${escapeHtml(r.email)}</span>
      </span>
      <span class="response-list-row-chevron">${BI.chevronRight}</span>
    </button>
  `).join('');

  body.querySelectorAll('[data-response-id]').forEach(btn => {
    btn.addEventListener('click', () => {
      responsesViewMode = 'detail';
      responsesViewResponseId = btn.dataset.responseId;
      renderResponsesDrawerContent();
    });
  });
}
