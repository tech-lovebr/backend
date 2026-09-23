/* ==========================================================================
   LOVE — Construtor visual da Aparência (Personalizar evento > Aparência)
   Baseado no motor do construtor do B2B ("Editar meu site"), adaptado para
   um convite de casamento: uma única seção/coluna, mobile-first.
   Somente front-end. Estado salvo em localStorage (sem backend ainda).
   ========================================================================== */

const BUILDER_STORAGE_KEY = 'love-site-builder-page';
const BUILDER_PUBLISHED_KEY = 'love-site-builder-published';
const BUILDER_PUBLISHED_STATE_KEY = 'love-site-builder-published-state';
const PREVIEW_PAGE_URL = 'convite-preview.html';

// Páginas/templates adicionais do site (mesmo padrão do dropdown "Páginas do site"
// do B2B — site principal + meu checkout): cada uma tem seu próprio estado salvo.
const PRESENTES_STORAGE_KEY = 'love-site-builder-presentes';
const PRESENTES_PUBLISHED_KEY = 'love-site-builder-presentes-published';
const PRESENTES_PUBLISHED_STATE_KEY = 'love-site-builder-presentes-published-state';
const DRESSCODE_STORAGE_KEY = 'love-site-builder-dresscode';
const DRESSCODE_PUBLISHED_KEY = 'love-site-builder-dresscode-published';
const DRESSCODE_PUBLISHED_STATE_KEY = 'love-site-builder-dresscode-published-state';
const BUILDER_PAGE_LABELS = { convite: 'Convite Digital', presentes: 'Lista de Presentes', dresscode: 'Dress code' };
let currentPageKey = 'convite';

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str == null ? '' : str;
  return div.innerHTML;
}

let builderToastTimer = null;
function showToast(message) {
  if (!message) return;
  let toast = document.getElementById('builder-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'builder-toast';
    toast.className = 'toast';
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(builderToastTimer);
  builderToastTimer = setTimeout(() => toast.classList.remove('show'), 3200);
}

/* -------------------- Ícones -------------------- */

const BI = {
  text: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path stroke-linecap="round" stroke-linejoin="round" d="M4 6h16M4 12h16M4 18h10"/></svg>',
  heading: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path stroke-linecap="round" stroke-linejoin="round" d="M6 4v16M18 4v16M6 12h12"/></svg>',
  image: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="8.5" cy="9.5" r="1.5"/><path stroke-linecap="round" stroke-linejoin="round" d="m5 18 5-5 3 3 4-5 4 5"/></svg>',
  video: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="2.5" y="5.5" width="14" height="13" rx="2"/><path stroke-linecap="round" stroke-linejoin="round" d="m16.5 10 5-3v10l-5-3"/></svg>',
  button: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="8" width="18" height="8" rx="4"/></svg>',
  gallery: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="3" width="8" height="8" rx="1.5"/><rect x="13" y="3" width="8" height="8" rx="1.5"/><rect x="3" y="13" width="8" height="8" rx="1.5"/><rect x="13" y="13" width="8" height="8" rx="1.5"/></svg>',
  carousel: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="7" y="5" width="10" height="14" rx="2"/><path stroke-linecap="round" stroke-linejoin="round" d="M3 9v6m18-6v6"/></svg>',
  map: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path stroke-linecap="round" stroke-linejoin="round" d="M12 21s7-6.5 7-12a7 7 0 1 0-14 0c0 5.5 7 12 7 12Z"/><circle cx="12" cy="9" r="2.5"/></svg>',
  divider: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path stroke-linecap="round" d="M4 12h16"/></svg>',
  spacer: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path stroke-linecap="round" stroke-linejoin="round" d="M12 3v18M8 7l4-4 4 4M8 17l4 4 4-4"/></svg>',
  clock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="9"/><path stroke-linecap="round" stroke-linejoin="round" d="M12 7.5V12l3 2"/></svg>',
  calendar: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3.5" y="5" width="17" height="16" rx="2"/><path stroke-linecap="round" d="M8 3v4M16 3v4M3.5 10h17"/></svg>',
  section: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="4.5" width="18" height="6" rx="1.5"/><rect x="3" y="13.5" width="18" height="6" rx="1.5"/></svg>',
  trash: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0"/></svg>',
  duplicate: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="8" y="8" width="12" height="12" rx="2"/><path stroke-linecap="round" stroke-linejoin="round" d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/></svg>',
  move: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 1L17 6L14.5 6L14.5 9.5L18 9.5L18 7L23 12L18 17L18 14.5L14.5 14.5L14.5 18L17 18L12 23L7 18L9.5 18L9.5 14.5L6 14.5L6 17L1 12L6 7L6 9.5L9.5 9.5L9.5 6L7 6Z"/></svg>',
  layers: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path stroke-linecap="round" stroke-linejoin="round" d="m12 3 9 5-9 5-9-5 9-5Zm-9 9 9 5 9-5"/></svg>',
  plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15"/></svg>',
  close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12"/></svg>',
  chevronLeft: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path stroke-linecap="round" stroke-linejoin="round" d="m15 19-7-7 7-7"/></svg>',
  chevronDown: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path stroke-linecap="round" stroke-linejoin="round" d="m5 9 7 7 7-7"/></svg>',
  bold: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 4.5h6.5a3.5 3.5 0 0 1 0 7H6zm0 7h7a3.5 3.5 0 0 1 0 7H6z"/></svg>',
  italic: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" d="M10 4.5h7M7 19.5h7M13.5 4.5l-3 15"/></svg>',
  underline: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" d="M6 4v7a6 6 0 0 0 12 0V4M5 20h14"/></svg>',
  alignLeft: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" d="M4 6h16M4 12h10M4 18h14"/></svg>',
  alignCenter: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" d="M4 6h16M7 12h10M5 18h14"/></svg>',
  alignRight: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" d="M4 6h16M10 12h10M6 18h14"/></svg>',
  plusCircle: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15"/></svg>',
  grip: '<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="8" cy="6" r="1.8"/><circle cx="16" cy="6" r="1.8"/><circle cx="8" cy="12" r="1.8"/><circle cx="16" cy="12" r="1.8"/><circle cx="8" cy="18" r="1.8"/><circle cx="16" cy="18" r="1.8"/></svg>',
  gift: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="9" width="18" height="4" rx="1"/><rect x="4.5" y="13" width="15" height="8" rx="1"/><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v12M12 9c-1.8 0-3.4-1.7-3.4-3.4A2.6 2.6 0 0 1 12 5c0 1.5-1.1 2.7-2.5 3.3M12 9c1.8 0 3.4-1.7 3.4-3.4A2.6 2.6 0 0 0 12 5c0 1.5 1.1 2.7 2.5 3.3"/></svg>',
  checkCircle: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="9"/><path stroke-linecap="round" stroke-linejoin="round" d="m8.5 12.5 2.3 2.3 4.7-5.1"/></svg>',
  shirt: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path stroke-linecap="round" stroke-linejoin="round" d="M8 4 4 7l2 3 2-1.2V20h8V8.8L18 10l2-3-4-3-2 2h-4L8 4Z"/></svg>'
};

const QUICKNAV_ICON_MAP = {
  'qn-loc': 'map',
  'qn-gifts': 'gift',
  'qn-rsvp': 'checkCircle',
  'qn-dress': 'shirt'
};

const QUICKNAV_EMOJI_MAP = {
  'qn-loc': '📍',
  'qn-gifts': '🎁',
  'qn-rsvp': '✅',
  'qn-dress': '👗'
};

// Ícones "Modernos": emblema colorido com glifo sólido (não são emoji nem os ícones de linha "Clássicos")
const QUICKNAV_MODERN_COLOR_MAP = {
  'qn-loc': '#3B82F6',
  'qn-gifts': '#F43F5E',
  'qn-rsvp': '#10B981',
  'qn-dress': '#8B5CF6'
};

const QUICKNAV_MODERN_ICON_MAP = {
  'qn-loc': '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2c-4.14 0-7.5 3.36-7.5 7.5 0 5.63 6.5 11.86 6.78 12.12a1 1 0 0 0 1.44 0C13 21.36 19.5 15.13 19.5 9.5 19.5 5.36 16.14 2 12 2Zm0 10.25a2.75 2.75 0 1 1 0-5.5 2.75 2.75 0 0 1 0 5.5Z"/></svg>',
  'qn-gifts': '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M20 7h-2.1a3 3 0 0 0 .1-.75A3.25 3.25 0 0 0 14.75 3c-1.3 0-2.42.77-2.94 1.88a.9.9 0 0 0-.1.24l-.02.05a3.29 3.29 0 0 0-.12-.29A3.24 3.24 0 0 0 8.63 3 3.25 3.25 0 0 0 5.38 6.25c0 .27.04.51.1.75H4a2 2 0 0 0-2 2v2a1 1 0 0 0 1 1h18a1 1 0 0 0 1-1V9a2 2 0 0 0-2-2ZM8.63 5.5a.75.75 0 0 1 0 1.5A.75.75 0 0 1 8.63 5.5Zm6.12 0a.75.75 0 0 1 0 1.5.75.75 0 0 1 0-1.5ZM3 13v6a2 2 0 0 0 2 2h6v-8H3Zm10 8h6a2 2 0 0 0 2-2v-6h-8v8Z"/></svg>',
  'qn-rsvp': '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2Zm-1.2 14.6-4.4-4.4 1.4-1.4 3 3 6-6 1.4 1.4-7.4 7.4Z"/></svg>',
  'qn-dress': '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M9.5 2a2.5 2.5 0 0 0 5 0h1.5l3.6 3.6a1 1 0 0 1 0 1.41l-1.9 1.9-2.2-2.2V21a1 1 0 0 1-1 1H9.5a1 1 0 0 1-1-1V6.71l-2.2 2.2-1.9-1.9a1 1 0 0 1 0-1.41L8 2h1.5Z"/></svg>'
};

function defaultQuickNavSection() {
  return {
    id: 'quicknav',
    isQuickNav: true,
    hidden: false,
    bg: '',
    buttonBgColor: '#F4F4F5',
    textColor: '#18181B',
    iconColor: '#18181B',
    iconStyle: 'animado',
    buttons: [
      { id: 'qn-loc', label: 'Localização', visible: true },
      { id: 'qn-gifts', label: 'Lista de Presentes', visible: true },
      { id: 'qn-rsvp', label: 'Confirmar presença', visible: true },
      { id: 'qn-dress', label: 'Dress code', visible: true }
    ]
  };
}

// Garante que a seção de botões de navegação exista dentro de builderState.sections
// (ela é uma seção como qualquer outra — pode ser arrastada — só não pode ser excluída
// nem ficar em primeiro lugar). Migra estados antigos que guardavam "quickNav" à parte.
function migrateQuickNavSection(state) {
  if (!Array.isArray(state.sections)) state.sections = [];
  let qnSection = state.sections.find(s => s.isQuickNav);
  if (!qnSection) {
    qnSection = state.quickNav
      ? Object.assign({ id: 'quicknav', isQuickNav: true, hidden: false }, state.quickNav)
      : defaultQuickNavSection();
    const insertAt = Math.min(1, state.sections.length);
    state.sections.splice(insertAt, 0, qnSection);
  }
  // Migração: "Modernos" antigo (ícones de linha) foi renomeado para "Clássicos",
  // e um novo "Modernos" (emblema colorido) tomou o lugar do valor.
  if (qnSection.iconStyle === 'moderno' && !qnSection.iconStyleMigrated) {
    qnSection.iconStyle = 'classico';
    qnSection.iconStyleMigrated = true;
  }
  if (state.quickNav) delete state.quickNav;
}

const FONT_OPTIONS = [
  { value: '', label: 'Padrão (Inter)' },
  { value: "'Avermont House', 'Avermont', 'Playfair Display', Georgia, serif", label: 'Avermont House' },
  { value: "'Bludhaven', 'Cinzel', serif", label: 'Bludhaven' },
  { value: "'Bride', 'Ephesis', cursive", label: 'Bride' },
  { value: "'EB Garamond', Georgia, serif", label: 'Clássico Garamond' },
  { value: "'Playfair Display', Georgia, serif", label: 'Clássico Playfair' },
  { value: "'Bodoni Moda', Georgia, serif", label: 'Couture Bodoni' },
  { value: "'Lora', Georgia, serif", label: 'Editorial Lora' },
  { value: "'Cormorant Garamond', Georgia, serif", label: 'Elegante Cormorant' },
  { value: "'Montserrat', sans-serif", label: 'Geométrico Montserrat' },
  { value: "'Great Vibes', cursive", label: 'Great Vibes' },
  { value: "'Inter', sans-serif", label: 'Inter' },
  { value: "'Marcellus', Georgia, serif", label: 'Marcellus' },
  { value: "'Outfit', sans-serif", label: 'Moderno Outfit' },
  { value: "'Parisienne', cursive", label: 'Parisienne' },
  { value: "'Prata', Georgia, serif", label: 'Prata' },
  { value: "'Tangerine', cursive", label: 'Tangerine' }
];

const FONT_OPTIONS_FORMAL = [
  { value: '', label: 'Padrão (Inter)' },
  { value: "'Avermont House', 'Avermont', 'Playfair Display', Georgia, serif", label: 'Avermont House' },
  { value: "'Cinzel', Georgia, serif", label: 'Cinzel' },
  { value: "'EB Garamond', Georgia, serif", label: 'Clássico Garamond' },
  { value: "'Playfair Display', Georgia, serif", label: 'Clássico Playfair' },
  { value: "'Bodoni Moda', Georgia, serif", label: 'Couture Bodoni' },
  { value: "'Lora', Georgia, serif", label: 'Editorial Lora' },
  { value: "'Cormorant Garamond', Georgia, serif", label: 'Elegante Cormorant' },
  { value: "'Montserrat', sans-serif", label: 'Geométrico Montserrat' },
  { value: "'Inter', sans-serif", label: 'Inter' },
  { value: "'Marcellus', Georgia, serif", label: 'Marcellus' },
  { value: "'Outfit', sans-serif", label: 'Moderno Outfit' },
  { value: "'Prata', Georgia, serif", label: 'Prata' },
  { value: "'Times New Roman', Times, serif", label: 'Times New Roman' }
];

const VIDEO_ASPECT_RATIOS = { '16:9': 56.25, '9:16': 177.78, '1:1': 100, '4:5': 125 };
const VIDEO_ASPECT_RATIO_OPTIONS = [
  { value: '16:9', label: 'Paisagem (16:9)' },
  { value: '9:16', label: 'Retrato (9:16)' },
  { value: '1:1', label: 'Quadrado (1:1)' },
  { value: '4:5', label: 'Vertical (4:5)' }
];

const ELEMENT_GROUPS = [
  { title: 'Básicos', types: ['titulo', 'texto', 'imagem', 'botao', 'video', 'separador', 'espacamento', 'secao'] },
  { title: 'Avançado', types: ['galeria', 'carrossel', 'mapa', 'contagem', 'data'] }
];

const ELEMENT_META = {
  titulo: { label: 'Título', icon: BI.heading },
  texto: { label: 'Texto', icon: BI.text },
  imagem: { label: 'Imagem', icon: BI.image },
  botao: { label: 'Botão', icon: BI.button },
  video: { label: 'Vídeo', icon: BI.video },
  separador: { label: 'Separador', icon: BI.divider },
  espacamento: { label: 'Espaçamento', icon: BI.spacer },
  galeria: { label: 'Galeria', icon: BI.gallery },
  carrossel: { label: 'Carrossel', icon: BI.carousel },
  mapa: { label: 'Mapa', icon: BI.map },
  contagem: { label: 'Contagem regressiva', icon: BI.clock },
  data: { label: 'Data', icon: BI.calendar },
  secao: { label: 'Nova seção', icon: BI.section }
};

/* -------------------- Estado -------------------- */

let builderState = null;
let historyStack = [];
let historyIndex = -1;
let suppressHistory = false;
let selectedId = null;
let currentDevice = 'mobile';
let sortableInstances = [];
let hasUnsavedChanges = false;

function uid(prefix) {
  return prefix + '-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function defaultPageState() {
  return {
    name: 'Convite Digital',
    globalStyle: { primaryColor: '#537bae', radius: 16, sectionSpacing: 32 },
    sections: [
      { id: uid('sec'), hidden: false, columns: [{ id: uid('col'), width: 100, elements: [] }] },
      defaultQuickNavSection()
    ]
  };
}

function loadBuilderState() {
  try {
    const raw = localStorage.getItem(BUILDER_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (!parsed.globalStyle) parsed.globalStyle = { primaryColor: '#537bae', radius: 16, sectionSpacing: 32 };
      if (parsed.name === 'Meu Convite Digital') parsed.name = 'Convite Digital';
      if (!Array.isArray(parsed.sections) || !parsed.sections.length) parsed.sections = defaultPageState().sections;
      migrateQuickNavSection(parsed);
      migrateElementDefaults(parsed);
      return parsed;
    }
  } catch (e) { /* ignora estado corrompido */ }
  return defaultPageState();
}

// Bloco fixo "Meus Presentes": puxa ao vivo a lista de presentes cadastrada em
// Personalizar evento > Lista de Presentes (window.LOVE_DATA), não é editável em
// conteúdo — só a cor de fundo, cor do texto/subtítulo e presentes por coluna
// podem ser ajustados aqui no construtor.
function defaultGiftsBlockSection() {
  return { id: 'gifts-block', isGiftsBlock: true, hidden: false, bg: '', perColumn: 3, textColor: '', subtitleColor: '' };
}

function migrateGiftsBlockSection(state) {
  if (!Array.isArray(state.sections)) state.sections = [];
  const hasBlock = state.sections.some(s => s.isGiftsBlock);
  if (!hasBlock) state.sections.unshift(defaultGiftsBlockSection());
}

function getActiveEventForBuilder() {
  const data = window.LOVE_DATA;
  if (!data || !Array.isArray(data.events)) return null;
  return data.events.find(e => e.id === data.currentEventId) || data.events[0] || null;
}

function defaultPresentesPageState() {
  return {
    name: 'Lista de Presentes',
    globalStyle: { primaryColor: '#537bae', radius: 16, sectionSpacing: 32 },
    sections: [
      defaultGiftsBlockSection()
    ]
  };
}

function loadPresentesState() {
  try {
    const raw = localStorage.getItem(PRESENTES_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (!parsed.globalStyle) parsed.globalStyle = { primaryColor: '#537bae', radius: 16, sectionSpacing: 32 };
      if (!Array.isArray(parsed.sections) || !parsed.sections.length) parsed.sections = defaultPresentesPageState().sections;
      migrateGiftsBlockSection(parsed);
      migrateElementDefaults(parsed);
      return parsed;
    }
  } catch (e) { /* ignora estado corrompido */ }
  return defaultPresentesPageState();
}

function defaultDresscodePageState() {
  return {
    name: 'Dress code',
    globalStyle: { primaryColor: '#537bae', radius: 16, sectionSpacing: 32 },
    sections: [
      { id: uid('sec'), hidden: false, columns: [{ id: uid('col'), width: 100, elements: [] }] }
    ]
  };
}

function loadDresscodeState() {
  try {
    const raw = localStorage.getItem(DRESSCODE_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (!parsed.globalStyle) parsed.globalStyle = { primaryColor: '#537bae', radius: 16, sectionSpacing: 32 };
      if (!Array.isArray(parsed.sections) || !parsed.sections.length) parsed.sections = defaultDresscodePageState().sections;
      migrateElementDefaults(parsed);
      return parsed;
    }
  } catch (e) { /* ignora estado corrompido */ }
  return defaultDresscodePageState();
}

function loadPageState(pageKey) {
  if (pageKey === 'presentes') return loadPresentesState();
  if (pageKey === 'dresscode') return loadDresscodeState();
  return loadBuilderState();
}

function pageStorageKey(pageKey) {
  if (pageKey === 'presentes') return PRESENTES_STORAGE_KEY;
  if (pageKey === 'dresscode') return DRESSCODE_STORAGE_KEY;
  return BUILDER_STORAGE_KEY;
}

function pagePublishedKeys(pageKey) {
  if (pageKey === 'presentes') return { flag: PRESENTES_PUBLISHED_KEY, state: PRESENTES_PUBLISHED_STATE_KEY };
  if (pageKey === 'dresscode') return { flag: DRESSCODE_PUBLISHED_KEY, state: DRESSCODE_PUBLISHED_STATE_KEY };
  return { flag: BUILDER_PUBLISHED_KEY, state: BUILDER_PUBLISHED_STATE_KEY };
}

function migrateElementDefaults(state) {
  (state.sections || []).forEach(section => {
    (section.columns || []).forEach(column => {
      (column.elements || []).forEach(el => {
        if (!el.styles) el.styles = { desktop: {}, tablet: {}, mobile: {} };
        if (!el.styles.desktop) el.styles.desktop = {};
        if (el.styles.desktop.textAlign === undefined) el.styles.desktop.textAlign = 'center';
        if (!el.hidden) el.hidden = { desktop: false, tablet: false, mobile: false };
      });
    });
  });
}

function applyGlobalStyleVars() {
  const gs = builderState.globalStyle || {};
  const node = document.getElementById('builder-canvas');
  if (!node) return;
  node.style.setProperty('--bx-primary', gs.primaryColor || '#537bae');
  node.style.setProperty('--bx-radius', (gs.radius !== undefined ? gs.radius : 16) + 'px');
  node.style.setProperty('--bx-section-spacing', (gs.sectionSpacing !== undefined ? gs.sectionSpacing : 32) + 'px');
}

function persistBuilderState(silent) {
  localStorage.setItem(pageStorageKey(currentPageKey), JSON.stringify(builderState));
  hasUnsavedChanges = false;
  if (!silent) showToast('Alterações salvas!');
}

/* -------------------- Dropdown de páginas do site -------------------- */

function switchBuilderPage(pageKey) {
  if (pageKey === currentPageKey) return;
  persistBuilderState(true);
  currentPageKey = pageKey;
  builderState = loadPageState(pageKey);
  historyStack = [snapshotState()];
  historyIndex = 0;
  selectedId = null;
  hasUnsavedChanges = false;
  renderLeftPanel();
  renderCanvas();
  applyGlobalStyleVars();
  updateHistoryButtons();
  updatePageSwitcherUI();
}

function updatePageSwitcherUI() {
  const label = document.getElementById('builder-page-select-label');
  if (label) label.textContent = BUILDER_PAGE_LABELS[currentPageKey] || 'Convite Digital';
  document.querySelectorAll('#builder-page-dropdown [data-page-option]').forEach(item => {
    item.classList.toggle('active', item.dataset.pageOption === currentPageKey);
  });
}

function initPageSwitcher() {
  const switcher = document.getElementById('builder-page-switcher');
  const btn = document.getElementById('builder-page-select-btn');
  const dropdown = document.getElementById('builder-page-dropdown');
  if (!switcher || !btn || !dropdown) return;

  updatePageSwitcherUI();

  const closeDropdown = () => {
    dropdown.classList.remove('show');
    btn.setAttribute('aria-expanded', 'false');
  };

  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    const isOpen = dropdown.classList.toggle('show');
    btn.setAttribute('aria-expanded', String(isOpen));
  });

  dropdown.addEventListener('click', (e) => e.stopPropagation());

  dropdown.querySelectorAll('[data-page-option]').forEach(item => {
    item.addEventListener('click', () => {
      closeDropdown();
      switchBuilderPage(item.dataset.pageOption);
    });
  });

  document.addEventListener('click', closeDropdown);
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeDropdown(); });
}

/* -------------------- Alerta de alterações não salvas -------------------- */

let pendingLeaveCallback = null;

function showUnsavedChangesModal(onProceed) {
  const modal = document.getElementById('modal-unsaved-changes');
  if (!modal) { onProceed(); return; }
  pendingLeaveCallback = onProceed;
  modal.classList.remove('hidden');
  modal.style.setProperty('display', 'flex', 'important');
  modal.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function hideUnsavedChangesModal() {
  const modal = document.getElementById('modal-unsaved-changes');
  if (!modal) return;
  modal.classList.remove('open');
  modal.style.setProperty('display', 'none', 'important');
  modal.classList.add('hidden');
  document.body.style.overflow = '';
  pendingLeaveCallback = null;
}

// Chamado pelo app.js antes de trocar de aba/menu enquanto o construtor está aberto.
// Se não houver alterações pendentes, segue direto; senão, mostra o aviso (igual ao B2B).
window.builderConfirmLeaveIfDirty = function (proceed) {
  if (!hasUnsavedChanges) { proceed(); return; }
  showUnsavedChangesModal(proceed);
};

function wireUnsavedChangesGuard() {
  window.addEventListener('beforeunload', (e) => {
    if (!hasUnsavedChanges) return;
    e.preventDefault();
    e.returnValue = '';
  });
}

/* -------------------- Histórico (undo/redo) -------------------- */

function snapshotState() { return JSON.stringify(builderState); }

function pushHistory() {
  if (suppressHistory) return;
  historyStack = historyStack.slice(0, historyIndex + 1);
  historyStack.push(snapshotState());
  if (historyStack.length > 60) historyStack.shift();
  historyIndex = historyStack.length - 1;
  hasUnsavedChanges = true;
  updateHistoryButtons();
}

function undo() {
  if (historyIndex <= 0) return;
  historyIndex -= 1;
  builderState = JSON.parse(historyStack[historyIndex]);
  hasUnsavedChanges = true;
  selectedId = null;
  renderCanvas();
  renderLeftPanel();
  updateHistoryButtons();
}

function redo() {
  if (historyIndex >= historyStack.length - 1) return;
  historyIndex += 1;
  builderState = JSON.parse(historyStack[historyIndex]);
  hasUnsavedChanges = true;
  selectedId = null;
  renderCanvas();
  renderLeftPanel();
  updateHistoryButtons();
}

function updateHistoryButtons() {
  const undoBtn = document.getElementById('builder-undo');
  const redoBtn = document.getElementById('builder-redo');
  if (undoBtn) undoBtn.disabled = historyIndex <= 0;
  if (redoBtn) redoBtn.disabled = historyIndex >= historyStack.length - 1;
}

/* -------------------- Fábrica de elementos -------------------- */

function createElement(type) {
  const base = {
    id: uid('el'),
    type,
    styles: {
      desktop: { textAlign: 'center', marginTop: '0px', marginBottom: '0px', marginLeft: '0px', marginRight: '0px' },
      tablet: {},
      mobile: {}
    },
    hidden: { desktop: false, tablet: false, mobile: false }
  };
  switch (type) {
    case 'texto':
      return Object.assign(base, { content: 'Adicione aqui o texto do seu convite. Clique para editar.' });
    case 'titulo':
      base.styles.desktop.fontWeight = '700';
      return Object.assign(base, { content: 'Título', level: 2 });
    case 'botao':
      return Object.assign(base, { content: 'Clique aqui', href: '#' });
    case 'imagem':
      base.styles.desktop.width = '100%';
      return Object.assign(base, { src: '', alt: '', href: '', objectFit: 'cover' });
    case 'video':
      return Object.assign(base, { url: '', autoplay: false, loop: false, controls: true, aspectRatio: '16:9' });
    case 'separador':
      return Object.assign(base, { borderStyle: 'solid', color: '#E4E4E7', thickness: 1, width: 100 });
    case 'espacamento':
      return Object.assign(base, { height: 40 });
    case 'galeria':
      return Object.assign(base, { columns: 3, images: [{ src: '', alt: '' }, { src: '', alt: '' }, { src: '', alt: '' }] });
    case 'carrossel':
      return Object.assign(base, { scrollMode: 'slider', images: [{ src: '', alt: '' }, { src: '', alt: '' }, { src: '', alt: '' }] });
    case 'mapa':
      return Object.assign(base, { embedUrl: '', address: '' });
    case 'contagem':
      return Object.assign(base, { label: 'Contagem Regressiva', targetDate: '', targetTime: '18:00', fontFamily: '', textColor: '', boxBgColor: '', sizeScale: 100 });
    case 'data':
      return Object.assign(base, { targetDate: '', targetTime: '', fontFamily: '', textColor: '', showLines: false, sizeScale: 100 });
    default:
      return base;
  }
}

/* -------------------- Buscas na árvore -------------------- */

function findColumnAndSection(columnId) {
  for (const section of builderState.sections) {
    if (!section.columns) continue;
    const column = section.columns.find(c => c.id === columnId);
    if (column) return { owner: section, column };
  }
  return {};
}

function findElementLocation(elementId) {
  for (const section of builderState.sections) {
    if (!section.columns) continue;
    for (const column of section.columns) {
      const index = column.elements.findIndex(e => e.id === elementId);
      if (index !== -1) return { column, index, element: column.elements[index] };
    }
  }
  return null;
}

function findSection(sectionId) {
  return builderState.sections.find(s => s.id === sectionId);
}

/* -------------------- Mutações estruturais -------------------- */

function createSection() {
  return { id: uid('sec'), hidden: false, columns: [{ id: uid('col'), width: 100, elements: [] }] };
}

function removeSectionById(sectionId) {
  const target = builderState.sections.find(s => s.id === sectionId);
  if (target && (target.isQuickNav || target.isGiftsBlock)) return false;
  if (builderState.sections.length <= 1) return false;
  const before = builderState.sections.length;
  builderState.sections = builderState.sections.filter(s => s.id !== sectionId);
  return builderState.sections.length < before;
}

function insertElementAt(columnId, index, type) {
  const { column } = findColumnAndSection(columnId);
  if (!column) return null;
  const el = createElement(type);
  const safeIndex = Math.max(0, Math.min(index, column.elements.length));
  column.elements.splice(safeIndex, 0, el);
  return el;
}

function removeElementById(elementId) {
  const loc = findElementLocation(elementId);
  if (!loc) return;
  loc.column.elements.splice(loc.index, 1);
}

function duplicateElementById(elementId) {
  const loc = findElementLocation(elementId);
  if (!loc) return null;
  const clone = JSON.parse(JSON.stringify(loc.element));
  clone.id = uid('el');
  loc.column.elements.splice(loc.index + 1, 0, clone);
  return clone;
}

function allElementsById() {
  const map = {};
  builderState.sections.forEach(section => {
    if (!section.columns) return;
    section.columns.forEach(column => {
      column.elements.forEach(el => { map[el.id] = el; });
    });
  });
  return map;
}

function resyncColumnsFromDom(columnEls) {
  const byId = allElementsById();
  const unique = Array.from(new Set(columnEls.filter(Boolean)));
  unique.forEach(columnEl => {
    const { column } = findColumnAndSection(columnEl.dataset.columnId);
    if (!column) return;
    const orderedIds = Array.from(columnEl.querySelectorAll(':scope > .builder-element')).map(n => n.dataset.elementId);
    column.elements = orderedIds.map(id => byId[id]).filter(Boolean);
  });
}

/* -------------------- Estilos responsivos -------------------- */

const DEVICE_FALLBACK = { desktop: [], tablet: ['desktop'], mobile: ['tablet', 'desktop'] };

function styleValue(el, key, device) {
  if (!el.styles) return undefined;
  const chain = [device, ...DEVICE_FALLBACK[device]];
  for (const d of chain) {
    if (el.styles[d] && el.styles[d][key] !== undefined && el.styles[d][key] !== '') return el.styles[d][key];
  }
  return undefined;
}

function currentStyleValue(el, key) {
  return (el.styles[currentDevice] && el.styles[currentDevice][key] !== undefined) ? el.styles[currentDevice][key] : '';
}

const STYLE_CSS_KEY = {
  color: 'color', fontSize: 'font-size', fontFamily: 'font-family', fontWeight: 'font-weight', textAlign: 'text-align',
  lineHeight: 'line-height', fontStyle: 'font-style', textDecoration: 'text-decoration', marginTop: 'margin-top',
  marginBottom: 'margin-bottom', marginLeft: 'margin-left', marginRight: 'margin-right',
  width: 'width', maxWidth: 'max-width', borderRadius: 'border-radius', boxShadow: 'box-shadow',
  opacity: 'opacity', backgroundColor: 'background-color', objectFit: 'object-fit'
};

const BG_IMAGE_FIT_OPTIONS = [
  { value: 'cover', label: 'Cover' },
  { value: 'stretch', label: 'Preencher' },
  { value: 'contain', label: 'Conter' },
  { value: 'original', label: 'Tamanho Original' }
];

function bgImageFitStyle(fit) {
  switch (fit) {
    case 'stretch': return 'background-size:100% 100%;background-position:center;background-repeat:no-repeat;';
    case 'contain': return 'background-size:contain;background-position:center;background-repeat:no-repeat;';
    case 'original': return 'background-size:auto;background-position:center;background-repeat:no-repeat;';
    case 'cover':
    default: return 'background-size:cover;background-position:center;background-repeat:no-repeat;';
  }
}

function styleAttr(el, device) {
  let out = '';
  Object.keys(STYLE_CSS_KEY).forEach(key => {
    const v = styleValue(el, key, device);
    // !important: a plataforma força h1-h6 e outros elementos para Inter (padronização do dashboard);
    // o conteúdo do convite dentro do canvas precisa poder usar as fontes escolhidas no construtor.
    if (v !== undefined && v !== '') out += `${STYLE_CSS_KEY[key]}:${v} !important;`;
  });
  return out;
}

function isHiddenOnDevice(el, device) {
  return !!(el.hidden && el.hidden[device]);
}

/* -------------------- Render: painel de elementos -------------------- */

function renderLeftPanel() {
  const panel = document.getElementById('builder-elements-panel');
  if (!panel) return;

  const sel = findSelected();
  if (sel) {
    renderElementEditorPanel(panel, sel);
    const canvas = document.getElementById('builder-canvas');
    if (canvas) initSortables(canvas);
    return;
  }

  panel.innerHTML = `
    <div class="builder-panel-tabs">
      <span class="builder-panel-tab active" style="cursor:default;">Elementos</span>
    </div>
    <div class="builder-panel-tab-body" id="builder-panel-tab-body"></div>
  `;
  renderElementosTab(document.getElementById('builder-panel-tab-body'));

  const canvas = document.getElementById('builder-canvas');
  if (canvas) initSortables(canvas);
}

function renderElementosTab(body) {
  body.innerHTML = ELEMENT_GROUPS.map(group => `
    <div class="builder-el-group-title">${escapeHtml(group.title)}</div>
    <div class="builder-el-grid">
      ${group.types.map(type => `
        <button type="button" class="builder-el-item" draggable="true" data-el-type="${type}" title="${ELEMENT_META[type].label}">
          ${ELEMENT_META[type].icon}
          <span>${ELEMENT_META[type].label}</span>
        </button>
      `).join('')}
    </div>
  `).join('');
}

function renderElementEditorPanel(panel, sel) {
  const titleMap = { section: 'Página', column: 'Coluna', quicknav: 'Botões de navegação', giftsblock: 'Meus Presentes', element: (ELEMENT_META[sel.obj.type] || {}).label || 'Elemento' };
  const showTabs = sel.kind === 'element';
  const isTextLike = sel.kind === 'element' && (sel.obj.type === 'titulo' || sel.obj.type === 'texto');
  const layoutTabLabel = isTextLike ? 'Aparência' : 'Layout';

  panel.innerHTML = `
    <div class="inspector-header">
      <button type="button" class="builder-breadcrumb-back" data-editor-back>
        ${BI.chevronLeft}
        Voltar
      </button>
      <span class="inspector-editing-label">${titleMap[sel.kind]}</span>
    </div>
    ${showTabs ? `
    <div class="inspector-tabs">
      <button type="button" class="inspector-tab ${inspectorActiveTab === 'content' ? 'active' : ''}" data-inspector-tab="content">Conteúdo</button>
      <button type="button" class="inspector-tab ${inspectorActiveTab === 'layout' ? 'active' : ''}" data-inspector-tab="layout">${layoutTabLabel}</button>
    </div>` : ''}
    <div class="inspector-body" id="inspector-body"></div>
  `;

  panel.querySelector('[data-editor-back]').addEventListener('click', deselect);
  panel.querySelectorAll('[data-inspector-tab]').forEach(tab => {
    tab.addEventListener('click', () => { inspectorActiveTab = tab.dataset.inspectorTab; renderLeftPanel(); });
  });

  const body = document.getElementById('inspector-body');
  if (sel.kind === 'section') { body.innerHTML = renderSectionInspector(sel.obj); wireSectionInspector(sel.obj, body); }
  else if (sel.kind === 'column') { body.innerHTML = renderColumnInspector(sel.obj); wireColumnInspector(sel.obj, body); }
  else if (sel.kind === 'quicknav') { body.innerHTML = renderQuickNavInspector(sel.obj); wireQuickNavInspector(sel.obj, body); }
  else if (sel.kind === 'giftsblock') { body.innerHTML = renderGiftsBlockInspector(sel.obj); wireGiftsBlockInspector(sel.obj, body); }
  else { renderElementInspector(sel.obj, body); }
  wireColorSwatchPopovers(body);
}

/* -------------------- Render: canvas -------------------- */

function renderCanvas() {
  const canvas = document.getElementById('builder-canvas');
  if (!canvas) return;
  canvas.dataset.device = currentDevice;
  const frame = document.getElementById('builder-canvas-frame');
  if (frame) frame.dataset.device = currentDevice;

  const visible = builderState.sections.filter(s => !s.hidden);
  const sectionsHtml = visible.map(section => renderAnySectionHtml(section, 'edit', currentDevice)).join('');
  const endDropzoneHtml = `
    <div class="builder-canvas-end-dropzone" id="builder-canvas-end-dropzone">
      ${BI.section}
      <span>Arraste "Nova seção" aqui para adicionar uma seção</span>
    </div>
  `;

  canvas.innerHTML = `<div class="builder-sections-list" id="builder-sections-list">${sectionsHtml}</div>` + endDropzoneHtml + renderFixedFooterHtml();

  wireCanvasEvents(canvas);
  initSortables(canvas);
  applySelectionClasses();
  startCountdownTicker(canvas);
}

function renderCanvasOnly() { renderCanvas(); }

function renderAnySectionHtml(section, mode, device) {
  if (section.isQuickNav) return renderQuickNavSectionHtml(section, mode);
  if (section.isGiftsBlock) return renderGiftsBlockSectionHtml(section, mode);
  return renderSectionHtml(section, mode, device);
}

function renderGiftsBlockSectionHtml(section, mode) {
  mode = mode || 'edit';
  const activeEvent = getActiveEventForBuilder();
  const giftList = (activeEvent && activeEvent.giftList) || [];
  const sectionBg = section.bg || resolveAdjacentSectionBg(section);
  const perColumn = section.perColumn || 3;
  const textColor = section.textColor || '#18181B';
  const subtitleColor = section.subtitleColor || '#A1A1AA';
  const toolbar = mode === 'edit' ? `
      <div class="builder-block-toolbar">
        <button type="button" class="el-drag-handle" title="Arrastar para reordenar" data-drag-section>${BI.grip}</button>
        <span class="builder-block-toolbar-tag">Meus Presentes</span>
      </div>` : '';

  const cardsHtml = giftList.length
    ? giftList.map(gift => `
        <div class="builder-giftsblock-card">
          <div class="builder-giftsblock-card-image" style="background-image:url('${gift.image || ''}');"></div>
          <div class="builder-giftsblock-card-body">
            <h4 style="color:${textColor};">${escapeHtml(gift.title || '')}</h4>
            <p style="color:${subtitleColor};">${escapeHtml(gift.category || '')}</p>
            <span class="builder-giftsblock-card-price" style="color:${textColor};">R$ ${Number(gift.price || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>
        </div>
      `).join('')
    : `<p class="builder-giftsblock-empty">Nenhum presente cadastrado ainda. Adicione presentes em "Meus presentes".</p>`;

  return `
    <section class="builder-section builder-giftsblock-section" id="${section.id}" data-section-id="${section.id}" style="background-color:${sectionBg};" title="${mode === 'edit' ? 'Lista de Presentes fixa — sincronizada com Meus presentes' : ''}">
      ${toolbar}
      <div class="builder-giftsblock-inner">
        <div class="builder-giftsblock-grid" style="grid-template-columns:repeat(${perColumn}, 1fr);">
          ${cardsHtml}
        </div>
      </div>
    </section>
  `;
}

// A seção de botões não tem cor de fundo própria — ela sempre acompanha a cor
// da seção imediatamente acima, para nunca criar uma quebra visual entre seções.
function resolveAdjacentSectionBg(section) {
  const sections = (builderState && builderState.sections) || [];
  const idx = sections.findIndex(s => s.id === section.id);
  if (idx <= 0) return 'transparent';
  const prev = sections[idx - 1];
  return (prev && prev.bg) || 'transparent';
}

function renderQuickNavSectionHtml(section, mode) {
  mode = mode || 'edit';
  const visibleButtons = (section.buttons || []).filter(b => b.visible !== false);
  if (mode !== 'edit' && !visibleButtons.length) return '';

  const iconStyle = section.iconStyle || 'animado';
  const sectionBg = resolveAdjacentSectionBg(section);
  const buttonBg = section.buttonBgColor || '#F4F4F5';
  const textColor = section.textColor || '#18181B';
  const iconColor = section.iconColor || textColor;
  const toolbar = mode === 'edit' ? `
      <div class="builder-block-toolbar">
        <button type="button" class="el-drag-handle" title="Arrastar para reordenar" data-drag-section>${BI.grip}</button>
        <span class="builder-block-toolbar-tag">Botões</span>
      </div>` : '';

  const btnsHtml = visibleButtons.length
    ? visibleButtons.map(btn => {
        let iconHtml = '';
        if (iconStyle === 'classico') {
          const iconKey = QUICKNAV_ICON_MAP[btn.id] || 'plusCircle';
          iconHtml = `<span class="builder-quicknav-icon" style="color:${iconColor};">${BI[iconKey]}</span>`;
        } else if (iconStyle === 'moderno') {
          const badgeColor = QUICKNAV_MODERN_COLOR_MAP[btn.id] || '#333333';
          const modernSvg = QUICKNAV_MODERN_ICON_MAP[btn.id] || BI.plusCircle;
          iconHtml = `<span class="builder-quicknav-icon-modern" style="background:${badgeColor};">${modernSvg}</span>`;
        } else if (iconStyle === 'animado') {
          const emoji = QUICKNAV_EMOJI_MAP[btn.id] || '⭐';
          iconHtml = `<span class="builder-quicknav-emoji">${emoji}</span>`;
        }
        return `
        <div class="builder-quicknav-btn" style="background-color:${buttonBg}; color:${textColor};" data-quicknav-btn-id="${btn.id}">
          ${iconHtml}
          <span class="builder-quicknav-btn-label">${escapeHtml(btn.label || '')}</span>
        </div>`;
      }).join('')
    : (mode === 'edit' ? `<p class="builder-quicknav-empty-hint">Nenhum botão visível. Ative um botão no painel lateral.</p>` : '');

  return `
    <section class="builder-section builder-quicknav-section" id="${section.id}" data-section-id="${section.id}" style="background-color:${sectionBg};" title="${mode === 'edit' ? 'Seção de botões fixa — presente em todos os sites' : ''}">
      ${toolbar}
      <div class="builder-quicknav-inner">
        ${btnsHtml}
      </div>
    </section>
  `;
}

function renderFixedFooterHtml() {
  return `
    <footer class="builder-fixed-footer" title="Este rodapé é o mesmo em todos os sites e não pode ser removido">
      <div class="builder-fixed-footer-inner">
        <div class="builder-fixed-footer-logo">
          <span class="builder-fixed-footer-madewith">Feito com</span>
          <img src="assets/logo-white.png" alt="Love" class="builder-fixed-footer-word">
        </div>
        <div class="builder-fixed-footer-text">
          <span>Desenvolvido com amor para momentos inesquecíveis.</span>
        </div>
      </div>
    </footer>
  `;
}

function renderSectionHtml(section, mode, device) {
  mode = mode || 'edit';
  device = device || currentDevice;
  const bgImages = section.bgImage ? [section.bgImage, ...(section.bgImages || [])].filter(Boolean).slice(0, 3) : [];
  const bgFitStyle = bgImageFitStyle(section.bgFit);
  const bgImageDiv = bgImages.length
    ? `<div class="builder-section-bg-image" style="background-image:url('${bgImages[0]}');${bgFitStyle}"></div>`
    : '';
  const overlayDiv = (section.bgImage && section.overlayColor)
    ? `<div class="builder-section-overlay" style="background-color:${section.overlayColor};opacity:${section.overlayOpacity !== undefined ? section.overlayOpacity : 1};"></div>`
    : '';
  const fadeColor = section.fadeColor || '#ffffff';
  const fadeTopDiv = (section.bgImage && section.fadePosition === 'top')
    ? `<div class="builder-section-fade builder-section-fade-top" style="background:linear-gradient(to bottom, ${fadeColor} 0%, ${fadeColor} 35%, ${fadeColor}00 100%);"></div>`
    : '';
  const fadeBottomDiv = (section.bgImage && section.fadePosition === 'bottom')
    ? `<div class="builder-section-fade builder-section-fade-bottom" style="background:linear-gradient(to top, ${fadeColor} 0%, ${fadeColor} 35%, ${fadeColor}00 100%);"></div>`
    : '';
  const columnsRowHtml = `<div class="builder-columns-row" data-section-id="${section.id}">
        ${section.columns.map((col, i) => renderColumnHtml(col, section, i, mode, device)).join('')}
      </div>`;
  const toolbar = (mode === 'edit' && builderState.sections.length > 1) ? `
      <div class="builder-block-toolbar">
        <button type="button" class="el-drag-handle" title="Arrastar para reordenar" data-drag-section>${BI.grip}</button>
        <span class="builder-block-toolbar-tag">Seção</span>
        <button type="button" data-delete-section title="Excluir seção">${BI.trash}</button>
      </div>` : '';
  return `
    <section class="builder-section" id="${section.id}" data-section-id="${section.id}" style="${section.bg ? `background-color:${section.bg};` : ''}">
      ${bgImageDiv}
      ${overlayDiv}
      ${fadeTopDiv}
      ${fadeBottomDiv}
      ${toolbar}
      ${columnsRowHtml}
    </section>
  `;
}

function renderColumnHtml(column, owner, index, mode, device) {
  mode = mode || 'edit';
  device = device || currentDevice;
  const visibleElements = column.elements.filter(el => mode === 'edit' || !isHiddenOnDevice(el, device));
  const emptyPlaceholder = `${BI.layers}<span>Arraste um elemento aqui para começar.</span>`;
  // A primeira seção da página nunca mostra a borda tracejada do estado vazio —
  // ela costuma ser a capa/topo do convite e não deve ficar "emoldurada".
  const isFirstSection = builderState.sections[0] === owner;
  const emptyClass = mode === 'edit' && !column.elements.length
    ? `is-empty is-empty-section${isFirstSection ? ' is-empty-first-section' : ''}`
    : '';
  return `
    <div class="builder-column" data-column-id="${column.id}" style="flex: 0 0 ${column.width}%; max-width:${column.width}%;">
      <div class="builder-elements-list ${emptyClass}" data-column-id="${column.id}">
        ${visibleElements.length
          ? visibleElements.map(el => renderElementBlockHtml(el, mode, device)).join('')
          : (mode === 'edit' ? emptyPlaceholder : '')}
      </div>
    </div>
  `;
}

/* -------------------- Eventos do canvas -------------------- */

function wireCanvasEvents(canvas) {
  canvas.querySelectorAll('.builder-section').forEach(sec => {
    sec.addEventListener('click', (e) => {
      if (e.target.closest('.builder-column') || e.target.closest('.builder-block-toolbar')) return;
      e.stopPropagation();
      selectElement(sec.dataset.sectionId, 'section');
    });
    const delSectionBtn = sec.querySelector('[data-delete-section]');
    if (delSectionBtn) delSectionBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const sectionId = sec.dataset.sectionId;
      if (removeSectionById(sectionId)) {
        if (selectedId === sectionId) deselect();
        pushHistory();
        renderCanvas();
        renderLeftPanel();
      }
    });
  });

  canvas.querySelectorAll('.builder-column').forEach(col => {
    col.addEventListener('click', (e) => {
      if (e.target.closest('.builder-element')) return;
      e.stopPropagation();
      selectElement(col.dataset.columnId, 'column');
    });
  });

  canvas.querySelectorAll('.builder-element').forEach(elBlock => {
    elBlock.addEventListener('click', (e) => {
      if (e.target.closest('.builder-block-toolbar')) return;
      e.stopPropagation();
      selectElement(elBlock.dataset.elementId, 'element');
    });
    const dup = elBlock.querySelector('[data-duplicate-element]');
    if (dup) dup.addEventListener('click', (e) => {
      e.stopPropagation();
      const clone = duplicateElementById(elBlock.dataset.elementId);
      pushHistory(); renderCanvas();
      if (clone) selectElement(clone.id, 'element');
    });
    const del = elBlock.querySelector('[data-delete-element]');
    if (del) del.addEventListener('click', (e) => {
      e.stopPropagation();
      removeElementById(elBlock.dataset.elementId);
      if (selectedId === elBlock.dataset.elementId) selectedId = null;
      pushHistory(); renderCanvas(); renderLeftPanel();
    });

    elBlock.querySelectorAll('[data-carousel-arrow]').forEach(arrowBtn => {
      arrowBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const track = elBlock.querySelector('[data-carousel-track]');
        if (!track) return;
        const firstImg = track.querySelector('img');
        const step = (firstImg ? firstImg.getBoundingClientRect().width : 240) + 12;
        track.scrollBy({ left: arrowBtn.dataset.carouselArrow === 'prev' ? -step : step, behavior: 'smooth' });
      });
    });
  });

  wireEditableFields(canvas);
}

const SANITIZE_INLINE_TAGS = { B: 'b', STRONG: 'b', I: 'i', EM: 'i', U: 'u' };

function sanitizeInlineHtml(node) {
  let out = '';
  node.childNodes.forEach(child => {
    if (child.nodeType === 3) {
      out += escapeHtml(child.textContent);
    } else if (child.nodeType === 1) {
      if (child.tagName === 'BR') {
        out += '<br>';
      } else if (SANITIZE_INLINE_TAGS[child.tagName]) {
        const tag = SANITIZE_INLINE_TAGS[child.tagName];
        out += `<${tag}>${sanitizeInlineHtml(child)}</${tag}>`;
      } else {
        out += sanitizeInlineHtml(child);
      }
    }
  });
  return out;
}

/* -------------------- Barra flutuante: negrito/itálico/sublinhado numa seleção parcial -------------------- */

function ensureTextFormatToolbar() {
  let toolbar = document.getElementById('be-text-format-toolbar');
  if (toolbar) return toolbar;

  toolbar = document.createElement('div');
  toolbar.id = 'be-text-format-toolbar';
  toolbar.className = 'be-text-format-toolbar';
  toolbar.hidden = true;
  toolbar.innerHTML = `
    <button type="button" data-format-cmd="bold" title="Negrito">${BI.bold}</button>
    <button type="button" data-format-cmd="italic" title="Itálico">${BI.italic}</button>
    <button type="button" data-format-cmd="underline" title="Sublinhado">${BI.underline}</button>
  `;
  // Anexado ao body (não ao site-builder-root): um ancestro do builder usa
  // transform, o que quebraria o position:fixed relativo à viewport.
  document.body.appendChild(toolbar);

  const updateState = () => {
    toolbar.querySelectorAll('[data-format-cmd]').forEach(btn => {
      let active = false;
      try { active = document.queryCommandState(btn.dataset.formatCmd); } catch (e) { /* noop */ }
      btn.classList.toggle('active', active);
    });
  };

  toolbar.querySelectorAll('[data-format-cmd]').forEach(btn => {
    btn.addEventListener('mousedown', (e) => e.preventDefault());
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      document.execCommand(btn.dataset.formatCmd, false, null);
      updateState();
    });
  });

  document.addEventListener('selectionchange', () => {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0 || sel.isCollapsed) { toolbar.hidden = true; return; }
    const anchorEl = sel.anchorNode && (sel.anchorNode.nodeType === 1 ? sel.anchorNode : sel.anchorNode.parentElement);
    const textEl = anchorEl ? anchorEl.closest('.be-text[contenteditable="true"], .be-heading[contenteditable="true"]') : null;
    if (!textEl) { toolbar.hidden = true; return; }
    const rect = sel.getRangeAt(0).getBoundingClientRect();
    if (!rect || (rect.width === 0 && rect.height === 0)) { toolbar.hidden = true; return; }
    toolbar.style.top = `${rect.top - 42}px`;
    toolbar.style.left = `${rect.left + rect.width / 2}px`;
    toolbar.hidden = false;
    updateState();
  });

  return toolbar;
}

function wireEditableFields(root) {
  ensureTextFormatToolbar();
  root.querySelectorAll('[data-editable]').forEach(node => {
    const isRichText = node.classList.contains('be-text') || node.classList.contains('be-heading');
    node.addEventListener('input', () => {
      const elBlock = node.closest('.builder-element');
      if (!elBlock) return;
      const loc = findElementLocation(elBlock.dataset.elementId);
      if (!loc) return;
      const path = node.dataset.editable;
      loc.element[path] = isRichText ? sanitizeInlineHtml(node) : node.innerText;
    });
    node.addEventListener('blur', () => pushHistory());
  });
}

/* -------------------- Seleção -------------------- */

let inspectorActiveTab = 'content';

function selectElement(id, kind) {
  if (selectedId !== id) inspectorActiveTab = 'content';
  selectedId = id;
  applySelectionClasses();
  renderLeftPanel();
}

function deselect() {
  selectedId = null;
  applySelectionClasses();
  renderLeftPanel();
}

function applySelectionClasses() {
  document.querySelectorAll('.builder-section, .builder-column, .builder-element').forEach(node => {
    const id = node.dataset.sectionId || node.dataset.columnId || node.dataset.elementId;
    node.classList.toggle('is-selected', id === selectedId);
  });
}

function findSelected() {
  if (!selectedId) return null;
  const section = findSection(selectedId);
  if (section) {
    const kind = section.isQuickNav ? 'quicknav' : section.isGiftsBlock ? 'giftsblock' : 'section';
    return { kind, obj: section };
  }
  const { column } = findColumnAndSection(selectedId);
  if (column) return { kind: 'column', obj: column };
  const loc = findElementLocation(selectedId);
  if (loc) return { kind: 'element', obj: loc.element };
  return null;
}

/* -------------------- Drag and drop (SortableJS) -------------------- */

function destroySortables() {
  sortableInstances.forEach(s => { try { s.destroy(); } catch (e) { /* já destruído */ } });
  sortableInstances = [];
}

function initSortables(canvas) {
  destroySortables();
  if (typeof Sortable === 'undefined') return;

  const sectionsList = canvas.querySelector('#builder-sections-list');
  if (sectionsList) {
    sortableInstances.push(new Sortable(sectionsList, {
      animation: 160,
      handle: '[data-drag-section]',
      draggable: '.builder-section',
      ghostClass: 'sortable-ghost',
      onEnd: () => {
        const orderedIds = Array.from(sectionsList.querySelectorAll(':scope > .builder-section')).map(n => n.dataset.sectionId);
        const byId = {};
        builderState.sections.forEach(s => { byId[s.id] = s; });
        let ordered = orderedIds.map(id => byId[id]).filter(Boolean);
        // A seção de botões de navegação nunca pode ficar em primeiro lugar.
        if (ordered.length > 1 && ordered[0].isQuickNav) {
          ordered.splice(1, 0, ordered.shift());
        }
        builderState.sections = ordered;
        pushHistory();
        renderCanvas();
      }
    }));
  }

  canvas.querySelectorAll('.builder-elements-list').forEach(list => {
    sortableInstances.push(new Sortable(list, {
      animation: 160,
      draggable: '.builder-element',
      filter: '[contenteditable="true"]',
      preventOnFilter: false,
      group: { name: 'builder-elements', pull: true, put: (to, from, dragEl) => dragEl.dataset.elType !== 'secao' },
      ghostClass: 'sortable-ghost',
      dragClass: 'sortable-drag',
      emptyInsertThreshold: 24,
      onAdd: (evt) => {
        const toColumnId = evt.to.dataset.columnId;
        const newIndex = evt.newIndex;
        if (evt.item.classList.contains('builder-el-item')) {
          const type = evt.item.dataset.elType;
          evt.item.remove();
          if (!type) return;
          const newEl = insertElementAt(toColumnId, newIndex, type);
          pushHistory();
          renderCanvas();
          if (newEl) selectElement(newEl.id, 'element');
          return;
        }
        resyncColumnsFromDom([evt.from, evt.to]);
        pushHistory();
        renderCanvas();
      },
      onUpdate: (evt) => {
        resyncColumnsFromDom([evt.from]);
        pushHistory();
        renderCanvas();
      }
    }));
  });

  const endDropzone = canvas.querySelector('#builder-canvas-end-dropzone');
  if (endDropzone) {
    sortableInstances.push(new Sortable(endDropzone, {
      group: { name: 'builder-elements', pull: false, put: (to, from, dragEl) => dragEl.dataset.elType === 'secao' },
      sort: false,
      animation: 160,
      ghostClass: 'sortable-ghost',
      onAdd: (evt) => {
        evt.item.remove();
        const newSection = createSection();
        builderState.sections.push(newSection);
        pushHistory();
        renderCanvas();
        selectElement(newSection.id, 'section');
      }
    }));
  }

  const sidebarPanel = document.getElementById('builder-elements-panel');
  if (sidebarPanel) {
    sidebarPanel.querySelectorAll('.builder-el-grid').forEach(grid => {
      sortableInstances.push(new Sortable(grid, {
        group: { name: 'builder-elements', pull: 'clone', put: false },
        sort: false,
        animation: 150,
        ghostClass: 'sortable-chosen'
      }));
    });
  }
}

/* -------------------- Render: conteúdo de cada tipo de elemento -------------------- */

function parseVideoEmbed(url) {
  if (!url) return null;
  const yt = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([\w-]+)/);
  if (yt) return `https://www.youtube.com/embed/${yt[1]}`;
  const vimeo = url.match(/vimeo\.com\/(\d+)/);
  if (vimeo) return `https://player.vimeo.com/video/${vimeo[1]}`;
  return null;
}

function placeholderImage() {
  return 'data:image/svg+xml;utf8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="400" height="240"><rect width="400" height="240" fill="#E4E4E7"/><text x="50%" y="50%" font-family="sans-serif" font-size="16" fill="#A1A1AA" text-anchor="middle" dy=".3em">Imagem</text></svg>');
}

const MONTHS_PT = ['JANEIRO', 'FEVEREIRO', 'MARÇO', 'ABRIL', 'MAIO', 'JUNHO', 'JULHO', 'AGOSTO', 'SETEMBRO', 'OUTUBRO', 'NOVEMBRO', 'DEZEMBRO'];
const WEEKDAYS_PT = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];

function formatEventDate(dateStr, timeStr) {
  if (!dateStr) return { date: '', time: '' };
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(y, (m || 1) - 1, d || 1);
  const date = `${String(d).padStart(2, '0')} . ${MONTHS_PT[dt.getMonth()]} . ${y}`;
  const time = timeStr ? `${WEEKDAYS_PT[dt.getDay()]}, às ${timeStr}` : WEEKDAYS_PT[dt.getDay()];
  return { date, time };
}

function renderElementContent(el, device, mode) {
  const edit = mode === 'edit';
  const style = styleAttr(el, device);
  const editable = edit ? 'contenteditable="true" data-editable="content"' : '';
  const linkGuard = edit ? 'onclick="return false;"' : '';

  switch (el.type) {
    case 'texto':
      return `<div class="be-text" style="${style}" ${editable}>${el.content}</div>`;

    case 'titulo': {
      const level = el.level || 2;
      return `<h${level} class="be-heading" style="${style}" ${editable}>${el.content}</h${level}>`;
    }

    case 'botao':
      return `<a href="${escapeHtml(el.href || '#')}" class="be-button" style="${style}" ${linkGuard}>
        <span ${editable}>${el.content}</span>
      </a>`;

    case 'imagem': {
      const img = `<img class="be-image" src="${el.src || placeholderImage()}" alt="${escapeHtml(el.alt || '')}" style="${style}">`;
      return el.href ? `<a href="${escapeHtml(el.href)}" ${linkGuard}>${img}</a>` : img;
    }

    case 'video': {
      const embed = parseVideoEmbed(el.url);
      if (!embed) {
        return `<div class="be-video-empty" style="${style}">${BI.video}<span>${edit ? 'Cole a URL de um vídeo do YouTube ou Vimeo no painel à esquerda' : 'Vídeo não configurado'}</span></div>`;
      }
      const params = [];
      if (el.autoplay) params.push('autoplay=1', 'mute=1');
      if (el.loop) params.push('loop=1');
      if (el.controls === false) params.push('controls=0');
      const src = embed + (params.length ? '?' + params.join('&') : '');
      const ratio = VIDEO_ASPECT_RATIOS[el.aspectRatio] || VIDEO_ASPECT_RATIOS['16:9'];
      return `<div class="be-video-embed" style="${style}padding-top:${ratio}%;"><iframe src="${src}" title="Vídeo" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen></iframe></div>`;
    }

    case 'separador':
      return `<hr class="be-separator" style="border-top-style:${el.borderStyle};border-top-color:${el.color};border-top-width:${el.thickness}px;width:${el.width}%;margin-left:auto;margin-right:auto;${style}">`;

    case 'espacamento':
      return `<div class="be-spacer" style="height:${el.height}px;${style}"></div>`;

    case 'galeria': {
      const galleryImgRadius = styleValue(el, 'borderRadius', device);
      const galleryImgStyle = galleryImgRadius !== undefined ? ` style="border-radius:${galleryImgRadius};"` : '';
      return `<div class="be-gallery" style="grid-template-columns:repeat(${el.columns || 3}, 1fr);${style}">${el.images.map(img =>
        `<img src="${img.src || placeholderImage()}" alt="${escapeHtml(img.alt || '')}"${galleryImgStyle}>`
      ).join('')}</div>`;
    }

    case 'carrossel': {
      const mode = el.scrollMode || 'slider';
      const imgsHtml = (list) => list.map(img => `<img src="${img.src || placeholderImage()}" alt="${escapeHtml(img.alt || '')}">`).join('');

      if (mode === 'auto') {
        const loopImages = el.images.length ? [...el.images, ...el.images] : el.images;
        return `<div class="be-carousel-auto" style="${style}">
          <div class="be-carousel-auto-track" style="--carousel-auto-duration:${Math.max(10, el.images.length * 4)}s;">
            ${imgsHtml(loopImages)}
          </div>
        </div>`;
      }

      if (mode === 'arrows') {
        return `<div class="be-carousel-arrows-wrap" style="${style}">
          <div class="be-carousel be-carousel-arrows-track" data-carousel-track>${imgsHtml(el.images)}</div>
          <button type="button" class="be-carousel-arrow be-carousel-arrow-sm be-carousel-arrow-prev" data-carousel-arrow="prev" ${linkGuard} aria-label="Anterior">${BI.chevronDown}</button>
          <button type="button" class="be-carousel-arrow be-carousel-arrow-sm be-carousel-arrow-next" data-carousel-arrow="next" ${linkGuard} aria-label="Próximo">${BI.chevronDown}</button>
        </div>`;
      }

      return `<div class="be-carousel" style="${style}">${imgsHtml(el.images)}</div>`;
    }

    case 'mapa':
      return el.embedUrl
        ? `<iframe class="be-map-embed" src="${escapeHtml(el.embedUrl)}" style="${style}" loading="lazy"></iframe>`
        : `<div class="be-map-empty">${BI.map}<span>${edit ? 'Cole o link de incorporação do Google Maps no painel à esquerda' : 'Mapa não configurado'}${el.address ? `<br><strong>${escapeHtml(el.address)}</strong>` : ''}</span></div>`;

    case 'contagem': {
      const target = el.targetDate ? `${el.targetDate}T${el.targetTime || '00:00'}:00` : '';
      const targetMs = target ? new Date(target).getTime() : '';
      const textInline = [
        el.fontFamily ? `font-family:${el.fontFamily} !important;` : '',
        el.textColor ? `color:${el.textColor} !important;` : ''
      ].filter(Boolean).join('');
      const textAttr = textInline ? ` style="${textInline}"` : '';
      const boxAttr = el.boxBgColor ? ` style="background-color:${el.boxBgColor} !important;"` : '';
      const scale = (el.sizeScale !== undefined && el.sizeScale !== '' ? el.sizeScale : 100) / 100;
      const scaleStyle = scale !== 1 ? `transform:scale(${scale});transform-origin:center;` : '';
      const unitHtml = (dataAttr, unitLabel) => `
        <div class="be-countdown-unit"${boxAttr}>
          <span class="be-countdown-number" ${dataAttr}${textAttr}>00</span>
          <span class="be-countdown-unit-label"${textAttr}>${unitLabel}</span>
        </div>`;
      return `<div class="be-countdown" style="${style}${scaleStyle}" data-countdown-target="${targetMs}">
        ${el.label ? `<p class="be-countdown-label" ${edit ? 'contenteditable="true" data-editable="label"' : ''}${textAttr}>${escapeHtml(el.label)}</p>` : ''}
        <div class="be-countdown-grid">
          ${unitHtml('data-countdown-days', 'dias')}
          ${unitHtml('data-countdown-hours', 'horas')}
          ${unitHtml('data-countdown-minutes', 'min')}
          ${unitHtml('data-countdown-seconds', 'seg')}
        </div>
        ${!el.targetDate ? `<p class="be-countdown-empty-hint">${edit ? 'Defina a data e o horário no painel à esquerda' : ''}</p>` : ''}
      </div>`;
    }

    case 'data': {
      const formatted = formatEventDate(el.targetDate, el.targetTime);
      const textInline = [
        el.fontFamily ? `font-family:${el.fontFamily} !important;` : '',
        el.textColor ? `color:${el.textColor} !important;` : ''
      ].filter(Boolean).join('');
      const textAttr = textInline ? ` style="${textInline}"` : '';
      const lineStyle = el.textColor ? ` style="background-color:${el.textColor};"` : '';
      const topRule = el.showLines ? `<span class="be-date-display-rule"${lineStyle}></span>` : '';
      const line = `<span class="be-date-display-line"${lineStyle}></span>`;
      const timeText = formatted.time
        ? `<span class="be-date-display-time-text">${formatted.time}</span>`
        : (edit ? `<span class="be-date-display-time-text be-date-display-empty">Defina a data no painel à esquerda</span>` : '');
      const timeBlock = timeText
        ? (el.showLines
          ? `<div class="be-date-display-time-row"${textAttr}>${line}${timeText}${line}</div>`
          : `<p class="be-date-display-time"${textAttr}>${formatted.time || 'Defina a data no painel à esquerda'}</p>`)
        : '';
      const scale = (el.sizeScale !== undefined && el.sizeScale !== '' ? el.sizeScale : 100) / 100;
      const scaleStyle = scale !== 1 ? `transform:scale(${scale});transform-origin:center;` : '';
      return `<div class="be-date-display" style="${style}${scaleStyle}">
        ${topRule}
        <p class="be-date-display-date"${textAttr}>${formatted.date || 'DD . MÊS . AAAA'}</p>
        ${timeBlock}
      </div>`;
    }

    default:
      return '';
  }
}

function renderElementBlockHtml(el, mode, device) {
  mode = mode || 'edit';
  device = device || currentDevice;
  const align = styleValue(el, 'textAlign', device);

  if (mode === 'preview') {
    return `<div class="builder-element" data-element-id="${el.id}"${align ? ` style="text-align:${align};"` : ''}>${renderElementContent(el, device, 'preview')}</div>`;
  }

  const meta = ELEMENT_META[el.type] || { label: el.type };
  const wrapperStyle = [
    isHiddenOnDevice(el, device) ? 'opacity:.35;' : '',
    align ? `text-align:${align};` : ''
  ].filter(Boolean).join('');
  return `
    <div class="builder-element" data-element-id="${el.id}"${wrapperStyle ? ` style="${wrapperStyle}"` : ''}>
      <div class="builder-block-toolbar">
        <span class="builder-block-toolbar-tag">${meta.label}</span>
        <button type="button" class="el-drag-handle" title="Mover" data-drag-element>${BI.move}</button>
        <button type="button" data-duplicate-element title="Duplicar">${BI.duplicate}</button>
        <button type="button" data-delete-element title="Excluir">${BI.trash}</button>
      </div>
      ${renderElementContent(el, device, 'edit')}
    </div>
  `;
}

/* -------------------- Contagem regressiva: relógio ao vivo no canvas -------------------- */

let countdownTickerInterval = null;

function startCountdownTicker(canvas) {
  clearInterval(countdownTickerInterval);
  const tick = () => {
    canvas.querySelectorAll('.be-countdown[data-countdown-target]').forEach(box => {
      const target = Number(box.dataset.countdownTarget);
      if (!target) return;
      const diff = Math.max(0, target - Date.now());
      const days = Math.floor(diff / 86400000);
      const hours = Math.floor((diff % 86400000) / 3600000);
      const minutes = Math.floor((diff % 3600000) / 60000);
      const seconds = Math.floor((diff % 60000) / 1000);
      const set = (sel, val) => { const n = box.querySelector(sel); if (n) n.textContent = String(val).padStart(2, '0'); };
      set('[data-countdown-days]', days);
      set('[data-countdown-hours]', hours);
      set('[data-countdown-minutes]', minutes);
      set('[data-countdown-seconds]', seconds);
    });
  };
  tick();
  countdownTickerInterval = setInterval(tick, 1000);
}

/* ==========================================================================
   Inspector (painel de propriedades)
   ========================================================================== */

let marginSyncEnabled = true;
const STYLE_CAPABLE_TYPES = ['texto', 'titulo', 'botao'];

/* -------------------- Binder genérico -------------------- */

function applyBind(el, path, rawValue, unit) {
  const value = unit ? (rawValue === '' ? '' : rawValue + unit) : rawValue;
  if (path.startsWith('style:')) {
    const key = path.slice(6);
    el.styles[currentDevice] = el.styles[currentDevice] || {};
    if (value === '' || value === null || value === undefined) delete el.styles[currentDevice][key];
    else el.styles[currentDevice][key] = value;
  } else if (path.startsWith('hidden:')) {
    const device = path.slice(7);
    el.hidden[device] = rawValue;
  } else if (path.startsWith('prop:')) {
    const key = path.slice(5);
    el[key] = rawValue;
  }
}

function wireBind(root, el) {
  root.querySelectorAll('[data-bind]').forEach(input => {
    const path = input.dataset.bind;
    const unit = input.dataset.unit || '';
    const evt = (input.tagName === 'SELECT' || input.type === 'checkbox') ? 'change' : 'input';
    input.addEventListener(evt, () => {
      let val = input.type === 'checkbox' ? input.checked : input.value;
      if (input.dataset.cast === 'number') val = Number(val);
      applyBind(el, path, val, unit);
      if (input.type === 'range') {
        const out = root.querySelector(`[data-range-out="${path}"]`);
        if (out) out.textContent = val + unit;
      }
      renderCanvasOnly();
    });
    input.addEventListener('blur', () => pushHistory());
    if (input.type === 'checkbox' || input.tagName === 'SELECT' || input.type === 'range' || input.type === 'color') {
      input.addEventListener('change', () => pushHistory());
    }
  });

  root.querySelectorAll('[data-segmented]').forEach(group => {
    group.querySelectorAll('button').forEach(btn => {
      btn.addEventListener('click', () => {
        applyBind(el, group.dataset.segmented, btn.dataset.value, '');
        group.querySelectorAll('button').forEach(b => b.classList.toggle('active', b === btn));
        renderCanvasOnly();
        pushHistory();
      });
    });
  });
}

function fieldRow(label, inputHtml, labelClass) {
  return `<div class="inspector-field"><span class="${labelClass || 'inspector-field-label'}">${label}</span>${inputHtml}</div>`;
}

function currentDeviceStyleOrProp(el, key) { return currentStyleValue(el, key); }
function cascadedStyleValue(el, key) { const v = styleValue(el, key, currentDevice); return v === undefined ? '' : v; }
function numOrBlank(value) { return (value === undefined || value === '') ? '' : parseFloat(value); }

/* -------------------- Inspector: Página (seção) / Coluna -------------------- */

function renderSectionInspector(section) {
  return `
    <p class="inspector-hint">Ajustes gerais do fundo do convite.</p>
    <div class="inspector-field inspector-field-row">
      <span class="inspector-field-label">Cor de fundo</span>
      ${colorSwatchPopoverHtml(section.bg || '#FBFBFA', 'data-bind="prop:bg"')}
    </div>
    <div class="inspector-field">
      <span class="inspector-field-label">Imagem de fundo</span>
      <div class="header-logo-picker-wrap">
        <label class="header-logo-picker ${section.bgImage ? 'has-image' : ''}">
          ${section.bgImage
            ? `<img src="${section.bgImage}" class="header-logo-picker-preview" alt="">
               <div class="header-logo-picker-overlay">${BI.image}<span>Alterar imagem</span></div>`
            : `<span class="image-upload-zone-plus">${BI.plus}</span><span class="image-upload-zone-text">Adicione ou arraste uma imagem</span>`}
          <input type="file" accept="image/*" class="image-upload-zone-input" data-section-bg-image-upload>
        </label>
        ${section.bgImage ? `<button type="button" class="header-logo-picker-remove" data-section-bg-image-remove title="Remover imagem">${BI.close}</button>` : ''}
      </div>
    </div>
    ${section.bgImage ? `
    <div class="inspector-field">
      <span class="inspector-field-label">Ajuste da imagem</span>
      <select class="inspector-select" data-section-bg-fit>
        ${BG_IMAGE_FIT_OPTIONS.map(o => `<option value="${o.value}" ${(section.bgFit || 'cover') === o.value ? 'selected' : ''}>${o.label}</option>`).join('')}
      </select>
    </div>
    <div class="inspector-field inspector-field-row">
      <span class="inspector-field-label">Cor de sobreposição</span>
      <div class="overlay-color-controls">
        ${colorSwatchPopoverHtml(section.overlayColor, 'data-section-overlay-color')}
        ${section.overlayColor ? `<button type="button" class="overlay-color-remove" data-section-overlay-color-remove title="Remover cor">${BI.close}</button>` : ''}
      </div>
    </div>
    ${section.overlayColor ? `
    <div class="inspector-field">
      <span class="inspector-field-label">Transparência</span>
      <input type="range" min="0" max="1" step="0.05" style="margin-top:0.3rem;" value="${1 - (section.overlayOpacity !== undefined ? section.overlayOpacity : 1)}" data-section-overlay-opacity>
    </div>
    ` : ''}
    ${section.fadePosition && section.fadePosition !== 'none' ? `
    <div class="inspector-field inspector-field-row">
      <span class="inspector-field-label">Cor da transição</span>
      ${colorSwatchPopoverHtml(section.fadeColor || '#ffffff', 'data-section-fade-color')}
    </div>
    ` : ''}
    <div class="inspector-field">
      <span class="inspector-field-label">Transição da imagem</span>
      <div class="inspector-segmented">
        <button type="button" data-section-fade-position="none" class="${(section.fadePosition || 'none') === 'none' ? 'active' : ''}">Nenhuma</button>
        <button type="button" data-section-fade-position="top" class="${section.fadePosition === 'top' ? 'active' : ''}">Em cima</button>
        <button type="button" data-section-fade-position="bottom" class="${section.fadePosition === 'bottom' ? 'active' : ''}">Embaixo</button>
      </div>
      <p class="inspector-hint">A imagem some suavemente na cor escolhida abaixo, em vez de cortar seco.</p>
    </div>
    ` : ''}
  `;
}

function wireSectionInspector(section, body) {
  const colorInput = body.querySelector('[data-bind="prop:bg"]');
  if (colorInput) {
    colorInput.addEventListener('input', () => { section.bg = colorInput.value; applySectionBg(section); });
    colorInput.addEventListener('change', () => pushHistory());
  }

  const bgImageUpload = body.querySelector('[data-section-bg-image-upload]');
  if (bgImageUpload) {
    const applyBgImageFile = (file) => {
      readFileAsDataUrl(file, (dataUrl) => { section.bgImage = dataUrl; pushHistory(); renderCanvas(); renderLeftPanel(); });
    };
    bgImageUpload.addEventListener('change', () => { const file = bgImageUpload.files[0]; if (file) applyBgImageFile(file); });
    wireImageDropZone(bgImageUpload.closest('.header-logo-picker'), applyBgImageFile);
  }

  const bgImageRemove = body.querySelector('[data-section-bg-image-remove]');
  if (bgImageRemove) {
    bgImageRemove.addEventListener('click', (e) => {
      e.preventDefault(); e.stopPropagation();
      section.bgImage = ''; pushHistory(); renderCanvas(); renderLeftPanel();
    });
  }

  const bgFitSelect = body.querySelector('[data-section-bg-fit]');
  if (bgFitSelect) {
    bgFitSelect.addEventListener('change', () => { section.bgFit = bgFitSelect.value; pushHistory(); renderCanvas(); });
  }

  const overlayColorInput = body.querySelector('[data-section-overlay-color]');
  if (overlayColorInput) {
    overlayColorInput.addEventListener('input', () => {
      if (!section.overlayColor) section.overlayOpacity = 1;
      section.overlayColor = overlayColorInput.value;
      renderCanvas();
    });
    overlayColorInput.addEventListener('change', () => { pushHistory(); renderLeftPanel(); });
  }

  const overlayColorRemove = body.querySelector('[data-section-overlay-color-remove]');
  if (overlayColorRemove) {
    overlayColorRemove.addEventListener('click', (e) => {
      e.preventDefault(); e.stopPropagation();
      section.overlayColor = '';
      pushHistory(); renderCanvas(); renderLeftPanel();
    });
  }

  const overlayOpacityInput = body.querySelector('[data-section-overlay-opacity]');
  if (overlayOpacityInput) {
    overlayOpacityInput.addEventListener('input', () => {
      const transparency = parseFloat(overlayOpacityInput.value);
      section.overlayOpacity = 1 - transparency;
      applySectionBg(section);
    });
    overlayOpacityInput.addEventListener('change', () => pushHistory());
  }

  body.querySelectorAll('[data-section-fade-position]').forEach(btn => {
    btn.addEventListener('click', () => {
      section.fadePosition = btn.dataset.sectionFadePosition;
      pushHistory();
      renderCanvas();
      renderLeftPanel();
    });
  });

  const fadeColorInput = body.querySelector('[data-section-fade-color]');
  if (fadeColorInput) {
    fadeColorInput.addEventListener('input', () => { section.fadeColor = fadeColorInput.value; renderCanvas(); });
    fadeColorInput.addEventListener('change', () => pushHistory());
  }
}

function applySectionBg(section) {
  const node = document.querySelector(`.builder-section[data-section-id="${section.id}"]`);
  if (!node) return;
  node.style.backgroundColor = section.bg || '';
  const overlayDiv = node.querySelector(':scope > .builder-section-overlay');
  if (overlayDiv) {
    overlayDiv.style.backgroundColor = section.overlayColor || '#000000';
    overlayDiv.style.opacity = section.overlayOpacity !== undefined ? section.overlayOpacity : 1;
  }
  // A seção de botões (quicknav) sempre acompanha a cor da seção logo acima —
  // atualiza o DOM dela também ao vivo, sem esperar por um re-render completo do canvas.
  const idx = builderState.sections.findIndex(s => s.id === section.id);
  const next = idx > -1 ? builderState.sections[idx + 1] : null;
  if (next && next.isQuickNav) {
    const qnNode = document.querySelector(`.builder-section[data-section-id="${next.id}"]`);
    if (qnNode) qnNode.style.backgroundColor = resolveAdjacentSectionBg(next);
  }
}

function renderColumnInspector(column) {
  return `
    <p class="inspector-hint">Esta coluna organiza os elementos do convite. Arraste para reordenar direto no canvas.</p>
    <div class="inspector-field">
      <span class="inspector-field-label">Elementos nesta coluna</span>
      <p class="inspector-hint">${column.elements.length} elemento(s)</p>
    </div>
  `;
}

function wireColumnInspector() { /* somente leitura por enquanto */ }

/* -------------------- Inspector: Botões de navegação (quicknav) -------------------- */

function renderQuickNavInspector(qn) {
  return `
    <p class="inspector-hint">Esta barra de botões aparece no início do conteúdo, em todos os sites, como uma seção fixa (não pode ser removida ou arrastada). A cor de fundo sempre acompanha a seção logo acima. Você pode editar as cores dos botões, o formato dos ícones, os nomes, a ordem e ativar ou desativar cada botão.</p>

    <div class="inspector-section-title">Cores dos botões</div>
    <div class="inspector-field inspector-field-row">
      <span class="inspector-field-label-plain">Cor do botão</span>
      ${colorSwatchPopoverHtml(qn.buttonBgColor || '#F4F4F5', 'data-quicknav-color="buttonBgColor"')}
    </div>
    <div class="inspector-field inspector-field-row">
      <span class="inspector-field-label-plain">Cor do texto</span>
      ${colorSwatchPopoverHtml(qn.textColor || '#18181B', 'data-quicknav-color="textColor"')}
    </div>
    <div class="inspector-field inspector-field-row">
      <span class="inspector-field-label-plain">Cor dos ícones</span>
      ${colorSwatchPopoverHtml(qn.iconColor || '#18181B', 'data-quicknav-color="iconColor"')}
    </div>

    <div class="inspector-field">
      <span class="inspector-field-label">Formato dos ícones</span>
      <select class="inspector-select" data-quicknav-icon-style>
        <option value="nenhum" ${qn.iconStyle === 'nenhum' ? 'selected' : ''}>Nenhum</option>
        <option value="classico" ${qn.iconStyle === 'classico' ? 'selected' : ''}>Clássicos</option>
        <option value="moderno" ${qn.iconStyle === 'moderno' ? 'selected' : ''}>Modernos</option>
        <option value="animado" ${(!qn.iconStyle || qn.iconStyle === 'animado') ? 'selected' : ''}>Animados</option>
      </select>
    </div>

    <div class="inspector-section-title">Botões</div>
    <p class="inspector-hint">Arraste para reordenar. Edite o nome e use o interruptor para exibir ou ocultar cada botão — desativado, o botão some do convite.</p>
    <div class="menu-order-list" id="quicknav-order-list">
      ${qn.buttons.map(btn => `
        <div class="menu-order-row" data-quicknav-row="${btn.id}">
          <button type="button" class="el-drag-handle" title="Arrastar para reordenar" data-drag-quicknav-row>${BI.grip}</button>
          <input type="text" class="inspector-input" data-quicknav-name="${btn.id}" value="${escapeHtml(btn.label || '')}" placeholder="Nome do botão">
          <label class="settings-switch" title="Mostrar/ocultar botão">
            <input type="checkbox" data-quicknav-visible-toggle="${btn.id}" ${btn.visible !== false ? 'checked' : ''}>
            <span class="settings-switch-track"></span>
          </label>
        </div>
      `).join('')}
    </div>
  `;
}

function wireQuickNavInspector(qn, body) {
  const colorGroups = {};
  body.querySelectorAll('[data-quicknav-color]').forEach(input => {
    const key = input.dataset.quicknavColor;
    (colorGroups[key] = colorGroups[key] || []).push(input);
  });
  Object.keys(colorGroups).forEach(key => {
    const colorInput = colorGroups[key][0];
    colorInput.addEventListener('input', () => { qn[key] = colorInput.value; renderCanvas(); });
    colorInput.addEventListener('change', () => pushHistory());
  });

  const iconStyleSelect = body.querySelector('[data-quicknav-icon-style]');
  if (iconStyleSelect) {
    iconStyleSelect.addEventListener('change', () => {
      qn.iconStyle = iconStyleSelect.value;
      pushHistory();
      renderCanvas();
    });
  }

  body.querySelectorAll('[data-quicknav-name]').forEach(input => {
    input.addEventListener('input', () => {
      const btn = qn.buttons.find(b => b.id === input.dataset.quicknavName);
      if (!btn) return;
      btn.label = input.value;
      renderCanvas();
    });
    input.addEventListener('blur', () => pushHistory());
  });

  body.querySelectorAll('[data-quicknav-visible-toggle]').forEach(toggle => {
    const stop = (e) => e.stopPropagation();
    toggle.addEventListener('pointerdown', stop);
    toggle.addEventListener('mousedown', stop);
    toggle.addEventListener('touchstart', stop);
    toggle.addEventListener('change', () => {
      const btn = qn.buttons.find(b => b.id === toggle.dataset.quicknavVisibleToggle);
      if (!btn) return;
      btn.visible = toggle.checked;
      pushHistory();
      renderCanvas();
    });
  });

  const list = body.querySelector('#quicknav-order-list');
  if (list && typeof Sortable !== 'undefined') {
    new Sortable(list, {
      animation: 160,
      handle: '[data-drag-quicknav-row]',
      draggable: '.menu-order-row',
      ghostClass: 'sortable-ghost',
      filter: 'input, .settings-switch',
      preventOnFilter: false,
      onEnd: () => {
        const orderedIds = Array.from(list.querySelectorAll(':scope > .menu-order-row')).map(n => n.dataset.quicknavRow);
        const byId = {};
        qn.buttons.forEach(b => { byId[b.id] = b; });
        qn.buttons = orderedIds.map(id => byId[id]).filter(Boolean);
        pushHistory();
        renderCanvas();
      }
    });
  }
}

/* -------------------- Inspector: Meus Presentes (bloco fixo) -------------------- */

function renderGiftsBlockInspector(section) {
  const perColumn = section.perColumn || 3;
  return `
    <div class="inspector-field">
      <span class="inspector-field-label">Presentes por coluna</span>
      <select class="inspector-select" data-giftsblock-per-column>
        <option value="1" ${perColumn === 1 ? 'selected' : ''}>1</option>
        <option value="2" ${perColumn === 2 ? 'selected' : ''}>2</option>
        <option value="3" ${perColumn === 3 ? 'selected' : ''}>3</option>
      </select>
    </div>
    <div class="inspector-field inspector-field-row">
      <span class="inspector-field-label">Cor de fundo</span>
      <div class="overlay-color-controls">
        ${colorSwatchPopoverHtml(section.bg, 'data-giftsblock-color="bg"')}
        ${section.bg ? `<button type="button" class="overlay-color-remove" data-giftsblock-bg-remove title="Deixar transparente">${BI.close}</button>` : ''}
      </div>
    </div>
    <div class="inspector-field inspector-field-row">
      <span class="inspector-field-label-plain">Cor do texto</span>
      ${colorSwatchPopoverHtml(section.textColor || '#18181B', 'data-giftsblock-color="textColor"')}
    </div>
    <div class="inspector-field inspector-field-row">
      <span class="inspector-field-label-plain">Cor do subtítulo</span>
      ${colorSwatchPopoverHtml(section.subtitleColor || '#A1A1AA', 'data-giftsblock-color="subtitleColor"')}
    </div>
  `;
}

function wireGiftsBlockInspector(section, body) {
  const colorGroups = {};
  body.querySelectorAll('[data-giftsblock-color]').forEach(input => {
    const key = input.dataset.giftsblockColor;
    (colorGroups[key] = colorGroups[key] || []).push(input);
  });
  Object.keys(colorGroups).forEach(key => {
    const colorInput = colorGroups[key][0];
    colorInput.addEventListener('input', () => { section[key] = colorInput.value; renderCanvas(); });
    colorInput.addEventListener('change', () => pushHistory());
  });

  const removeBtn = body.querySelector('[data-giftsblock-bg-remove]');
  if (removeBtn) {
    removeBtn.addEventListener('click', (e) => {
      e.preventDefault(); e.stopPropagation();
      section.bg = '';
      pushHistory();
      renderCanvas();
      renderLeftPanel();
    });
  }

  const perColumnSelect = body.querySelector('[data-giftsblock-per-column]');
  if (perColumnSelect) {
    perColumnSelect.addEventListener('change', () => {
      section.perColumn = parseInt(perColumnSelect.value, 10);
      pushHistory();
      renderCanvas();
    });
  }
}

/* -------------------- Inspector: Elemento -------------------- */

function readFileAsDataUrl(file, cb) {
  const reader = new FileReader();
  reader.onload = () => cb(reader.result);
  reader.readAsDataURL(file);
}

function imageUploadZoneHtml(src, inputAttrs) {
  return `
    <label class="image-upload-zone">
      ${src
        ? `<img src="${src}" class="image-upload-zone-preview" alt="">`
        : `<span class="image-upload-zone-plus">${BI.plus}</span><span class="image-upload-zone-text">Adicione ou arraste uma imagem</span>`}
      <input type="file" accept="image/*" class="image-upload-zone-input" ${inputAttrs}>
    </label>
  `;
}

function wireImageDropZone(zoneEl, onFile) {
  if (!zoneEl) return;
  zoneEl.addEventListener('dragover', (e) => { e.preventDefault(); zoneEl.classList.add('is-dragover'); });
  zoneEl.addEventListener('dragleave', () => zoneEl.classList.remove('is-dragover'));
  zoneEl.addEventListener('drop', (e) => {
    e.preventDefault();
    zoneEl.classList.remove('is-dragover');
    const file = e.dataTransfer.files && e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) onFile(file);
  });
}

function wireContentTab(el, body) {
  wireBind(body, el);

  const uploadInput = body.querySelector('[data-image-upload]');
  if (uploadInput) {
    const applyImageFile = (file) => {
      readFileAsDataUrl(file, (dataUrl) => { el.src = dataUrl; pushHistory(); renderCanvasOnly(); renderLeftPanel(); });
    };
    uploadInput.addEventListener('change', () => { const file = uploadInput.files[0]; if (file) applyImageFile(file); });
    wireImageDropZone(uploadInput.closest('.image-upload-zone'), applyImageFile);
  }

  const imageRemoveBtn = body.querySelector('[data-image-remove]');
  if (imageRemoveBtn) {
    imageRemoveBtn.addEventListener('click', (e) => {
      e.preventDefault(); e.stopPropagation();
      el.src = ''; pushHistory(); renderCanvasOnly(); renderLeftPanel();
    });
  }

  if (el.type === 'galeria' || el.type === 'carrossel') {
    body.querySelectorAll('[data-remove-image]').forEach(btn => {
      btn.addEventListener('click', () => { el.images.splice(Number(btn.dataset.removeImage), 1); pushHistory(); renderCanvasOnly(); renderLeftPanel(); });
    });
    body.querySelectorAll('[data-image-file]').forEach(fileInput => {
      const applyImageFile = (file) => {
        readFileAsDataUrl(file, (dataUrl) => {
          el.images[Number(fileInput.dataset.imageFile)].src = dataUrl;
          pushHistory(); renderCanvasOnly(); renderLeftPanel();
        });
      };
      fileInput.addEventListener('change', () => { const file = fileInput.files[0]; if (file) applyImageFile(file); });
      wireImageDropZone(fileInput.closest('.image-upload-zone'), applyImageFile);
    });
    const addBtn = body.querySelector('[data-add-image]');
    if (addBtn) addBtn.addEventListener('click', () => { el.images.push({ src: '', alt: '' }); pushHistory(); renderCanvasOnly(); renderLeftPanel(); });
  }
}

function renderElementInspector(el, body) {
  const isTextLike = el.type === 'titulo' || el.type === 'texto';
  if (inspectorActiveTab === 'layout') {
    body.innerHTML = isTextLike ? renderLayoutTab(el, true) : (renderStyleTab(el) + renderLayoutTab(el));
    wireBind(body, el);
    wireMarginSync(body, el);
    wireTypographyToggles(body, el);
  } else {
    body.innerHTML = isTextLike
      ? colorFieldHtml(el, el.type === 'titulo' ? 'Cor do título' : 'Cor do texto') + renderContentTab(el) + renderStyleTab(el, true, true)
      : renderContentTab(el);
    wireContentTab(el, body);
    if (isTextLike) wireTypographyToggles(body, el);
  }
}

function wireTypographyToggles(body, el) {
  body.querySelectorAll('[data-typography-toggle]').forEach(btn => {
    btn.addEventListener('click', () => {
      const kind = btn.dataset.typographyToggle;
      const isActive = btn.classList.contains('active');
      if (kind === 'bold') applyBind(el, 'style:fontWeight', isActive ? '400' : '700');
      else if (kind === 'italic') applyBind(el, 'style:fontStyle', isActive ? '' : 'italic');
      else if (kind === 'underline') applyBind(el, 'style:textDecoration', isActive ? '' : 'underline');
      pushHistory();
      renderCanvasOnly();
      renderLeftPanel();
    });
  });
}

function wireMarginSync(body, el) {
  const toggleBtn = body.querySelector('[data-margin-sync-toggle]');
  if (toggleBtn) toggleBtn.addEventListener('click', () => { marginSyncEnabled = !marginSyncEnabled; renderLeftPanel(); });
  if (!marginSyncEnabled) return;

  const sideKeys = { top: 'marginTop', bottom: 'marginBottom', left: 'marginLeft', right: 'marginRight' };
  const inputs = Array.from(body.querySelectorAll('[data-margin-side]'));
  inputs.forEach(input => {
    input.addEventListener('input', () => {
      inputs.forEach(other => {
        if (other === input) return;
        other.value = input.value;
        applyBind(el, `style:${sideKeys[other.dataset.marginSide]}`, input.value, 'px');
      });
      renderCanvasOnly();
    });
    input.addEventListener('blur', () => pushHistory());
  });
}

function segRow(label, path, options, current) {
  return `
    <div class="inspector-field">
      <span class="inspector-field-label">${label}</span>
      <div class="inspector-segmented" data-segmented="${path}">
        ${options.map(o => `<button type="button" data-value="${o.value}" class="${current === o.value ? 'active' : ''}" title="${o.title}">${o.html}</button>`).join('')}
      </div>
    </div>
  `;
}

function colorSwatchPopoverHtml(value, attrs) {
  const isEmpty = !value;
  const v = value || '#000000';
  return `
    <div class="color-alpha-field" data-color-swatch-field>
      <button type="button" class="color-alpha-swatch${isEmpty ? ' is-empty' : ''}" data-color-swatch-toggle ${isEmpty ? '' : `style="background-color:${v}"`}>${isEmpty ? '<span class="color-alpha-swatch-empty-icon">+</span>' : ''}</button>
      <div class="color-alpha-popover" data-color-swatch-popover hidden>
        <div class="color-alpha-top-row">
          <input type="color" class="color-alpha-native" ${attrs || ''} value="${v}">
          <input type="text" class="color-alpha-hex" value="${isEmpty ? '' : escapeHtml(v.toUpperCase())}" maxlength="7" spellcheck="false" placeholder="#000000">
        </div>
      </div>
    </div>
  `;
}

let openColorPopover = null;
let colorPopoverGlobalClickWired = false;

function closeOpenColorPopover() {
  if (openColorPopover) { openColorPopover.popoverEl.hidden = true; openColorPopover = null; }
}

function ensureColorPopoverGlobalClick() {
  if (colorPopoverGlobalClickWired) return;
  colorPopoverGlobalClickWired = true;
  document.addEventListener('click', (e) => {
    if (openColorPopover && !openColorPopover.fieldEl.contains(e.target)) closeOpenColorPopover();
  });
}

function wireColorPopoverToggle(fieldEl, toggleEl, popoverEl) {
  ensureColorPopoverGlobalClick();
  toggleEl.addEventListener('click', (e) => {
    e.stopPropagation();
    const isOpen = !popoverEl.hidden;
    closeOpenColorPopover();
    if (!isOpen) { popoverEl.hidden = false; openColorPopover = { fieldEl, popoverEl }; }
  });
}

function wireColorSwatchPopovers(root) {
  root.querySelectorAll('[data-color-swatch-field]').forEach(field => {
    const toggle = field.querySelector('[data-color-swatch-toggle]');
    const popover = field.querySelector('[data-color-swatch-popover]');
    const nativeColor = field.querySelector('.color-alpha-native');
    const hexInput = field.querySelector('.color-alpha-hex');
    if (!toggle || !popover || !nativeColor || !hexInput) return;

    wireColorPopoverToggle(field, toggle, popover);

    nativeColor.addEventListener('input', () => {
      hexInput.value = nativeColor.value.toUpperCase();
      toggle.classList.remove('is-empty');
      toggle.innerHTML = '';
      toggle.style.backgroundColor = nativeColor.value;
    });
    hexInput.addEventListener('input', () => {
      const val = hexInput.value.trim();
      if (/^#[0-9A-Fa-f]{6}$/.test(val)) {
        nativeColor.value = val;
        toggle.classList.remove('is-empty');
        toggle.innerHTML = '';
        toggle.style.backgroundColor = val;
        nativeColor.dispatchEvent(new Event('input', { bubbles: true }));
      }
    });
    hexInput.addEventListener('change', () => {
      hexInput.value = nativeColor.value.toUpperCase();
      nativeColor.dispatchEvent(new Event('change', { bubbles: true }));
    });
  });
}

function colorFieldHtml(el, label) {
  return `
    <div class="inspector-field inspector-field-row">
      <span class="inspector-field-label">${label || 'Cor'}</span>
      ${colorSwatchPopoverHtml(currentDeviceStyleOrProp(el, 'color') || '#18181B', 'data-bind="style:color"')}
    </div>
  `;
}

function renderStyleTab(el, flat, skipColor) {
  if (!STYLE_CAPABLE_TYPES.includes(el.type)) return '';
  const align = cascadedStyleValue(el, 'textAlign');
  const isBold = cascadedStyleValue(el, 'fontWeight') === '700';
  const isItalic = cascadedStyleValue(el, 'fontStyle') === 'italic';
  const isUnderline = cascadedStyleValue(el, 'textDecoration') === 'underline';
  const currentFont = cascadedStyleValue(el, 'fontFamily') || '';
  const tipografiaHeading = flat ? `<span class="inspector-field-label">Tipografia</span>` : `<div class="inspector-section-title">Tipografia</div>`;
  return `
    ${tipografiaHeading}
    <div class="inspector-field">
      <span class="inspector-field-label">Fonte</span>
      <select class="inspector-select" data-bind="style:fontFamily">
        ${FONT_OPTIONS.map(f => `<option value="${escapeHtml(f.value)}" ${currentFont === f.value ? 'selected' : ''}>${escapeHtml(f.label)}</option>`).join('')}
      </select>
    </div>
    ${fieldRow('Tamanho', `<div class="inspector-range-row"><input type="range" min="10" max="96" value="${parseInt(cascadedStyleValue(el, 'fontSize')) || 16}" data-bind="style:fontSize" data-unit="px"><span class="inspector-range-value" data-range-out="style:fontSize">${cascadedStyleValue(el, 'fontSize') || '16px'}</span></div>`)}
    <div class="inspector-field">
      <span class="inspector-field-label">Estilo</span>
      <div class="inspector-segmented">
        <button type="button" data-typography-toggle="bold" class="${isBold ? 'active' : ''}" title="Negrito">${BI.bold}</button>
        <button type="button" data-typography-toggle="italic" class="${isItalic ? 'active' : ''}" title="Itálico">${BI.italic}</button>
        <button type="button" data-typography-toggle="underline" class="${isUnderline ? 'active' : ''}" title="Sublinhado">${BI.underline}</button>
      </div>
    </div>
    ${el.type === 'botao' ? '' : segRow('Alinhamento', 'style:textAlign', [
      { value: 'left', title: 'Esquerda', html: BI.alignLeft },
      { value: 'center', title: 'Centro', html: BI.alignCenter },
      { value: 'right', title: 'Direita', html: BI.alignRight }
    ], align || 'left')}
    ${skipColor ? '' : colorFieldHtml(el, el.type === 'botao' ? 'Cor do texto' : 'Cor')}
  `;
}

function renderLayoutTab(el, flat) {
  const marginSyncBtn = `<button type="button" class="margin-sync-toggle ${marginSyncEnabled ? 'active' : ''}" data-margin-sync-toggle title="${marginSyncEnabled ? 'Sincronizado, mesmo valor nos 4 lados' : 'Livre, cada lado com seu valor'}">${BI.plusCircle}</button>`;
  const alignmentRow = el.type === 'botao'
    ? segRow('Alinhamento', 'style:textAlign', [
        { value: 'left', title: 'Esquerda', html: BI.alignLeft },
        { value: 'center', title: 'Centro', html: BI.alignCenter },
        { value: 'right', title: 'Direita', html: BI.alignRight }
      ], currentDeviceStyleOrProp(el, 'textAlign') || 'left')
    : '';
  const marginHeading = flat
    ? `<span class="inspector-field-label">Margem (px)${marginSyncBtn}</span>`
    : `<div class="inspector-section-title inspector-section-title-row"><span>Posicionamento</span>${marginSyncBtn}</div>${alignmentRow}<span class="inspector-field-label">Margem (px)</span>`;
  const labelClass = flat ? 'inspector-field-label-plain' : 'inspector-field-label';
  const aparenciaHeading = flat ? '' : `<div class="inspector-section-title">Aparência</div>`;
  return `
    ${marginHeading}
    <div class="inspector-row">
      ${fieldRow('Topo', `<input type="number" class="inspector-input" data-bind="style:marginTop" data-unit="px" data-margin-side="top" value="${numOrBlank(currentDeviceStyleOrProp(el, 'marginTop'))}">`, labelClass)}
      ${fieldRow('Base', `<input type="number" class="inspector-input" data-bind="style:marginBottom" data-unit="px" data-margin-side="bottom" value="${numOrBlank(currentDeviceStyleOrProp(el, 'marginBottom'))}">`, labelClass)}
    </div>
    <div class="inspector-row">
      ${fieldRow('Esquerda', `<input type="number" class="inspector-input" data-bind="style:marginLeft" data-unit="px" data-margin-side="left" value="${numOrBlank(currentDeviceStyleOrProp(el, 'marginLeft'))}">`, labelClass)}
      ${fieldRow('Direita', `<input type="number" class="inspector-input" data-bind="style:marginRight" data-unit="px" data-margin-side="right" value="${numOrBlank(currentDeviceStyleOrProp(el, 'marginRight'))}">`, labelClass)}
    </div>
    ${aparenciaHeading}
    ${el.type === 'video' ? `
    <div class="inspector-field">
      <span class="${labelClass}">Formato</span>
      <select class="inspector-select" data-bind="prop:aspectRatio">
        ${VIDEO_ASPECT_RATIO_OPTIONS.map(o => `<option value="${o.value}" ${(el.aspectRatio || '16:9') === o.value ? 'selected' : ''}>${o.label}</option>`).join('')}
      </select>
    </div>
    ` : ''}
    ${el.type === 'titulo' ? `
    <div class="inspector-field">
      <span class="${labelClass}">Altura <span data-range-out="style:lineHeight">${cascadedStyleValue(el, 'lineHeight') || '1.4'}</span></span>
      <input type="range" min="1" max="2.5" step="0.1" value="${parseFloat(cascadedStyleValue(el, 'lineHeight')) || 1.4}" data-bind="style:lineHeight">
    </div>
    ` : el.type === 'contagem' || el.type === 'data' ? `
    <div class="inspector-field">
      <span class="${labelClass}">Tamanho <span data-range-out="prop:sizeScale">${el.sizeScale !== undefined && el.sizeScale !== '' ? el.sizeScale : 100}%</span></span>
      <input type="range" min="50" max="200" step="5" value="${el.sizeScale !== undefined && el.sizeScale !== '' ? el.sizeScale : 100}" data-bind="prop:sizeScale" data-cast="number" data-unit="%">
    </div>
    ` : el.type === 'video' || el.type === 'carrossel' ? '' : el.type === 'botao' ? `
    <div class="inspector-field">
      <span class="${labelClass}">Largura</span>
      <input type="range" min="15" max="100" value="${Math.min(100, Math.max(15, parseInt(cascadedStyleValue(el, 'width')) || 20))}" data-bind="style:width" data-unit="%">
    </div>
    ` : `
    <div class="inspector-field">
      <span class="${labelClass}">Largura <span data-range-out="style:width">${parseInt(cascadedStyleValue(el, 'width')) || 100}%</span></span>
      <input type="range" min="0" max="100" value="${parseInt(cascadedStyleValue(el, 'width')) || 100}" data-bind="style:width" data-unit="%">
    </div>
    `}
    ${el.type === 'video' ? '' : el.type === 'botao' ? `
    <div class="inspector-field" style="margin-top:0.5rem;">
      <span class="${labelClass}">Arredondamento da borda <span data-range-out="style:borderRadius">${parseFloat(currentDeviceStyleOrProp(el, 'borderRadius')) || 0}px</span></span>
      <input type="range" min="0" max="28" value="${parseFloat(currentDeviceStyleOrProp(el, 'borderRadius')) || 0}" data-bind="style:borderRadius" data-unit="px">
    </div>
    ` : fieldRow('Raio da borda (px)', `<input type="number" class="inspector-input" min="0" data-bind="style:borderRadius" data-unit="px" value="${parseFloat(currentDeviceStyleOrProp(el, 'borderRadius')) || ''}">`, labelClass)}
    ${el.type === 'video' ? '' : `
    <div class="inspector-field"${el.type === 'botao' ? ' style="margin-top:0.5rem;"' : ''}>
      <span class="${labelClass}">Opacidade <span data-range-out="style:opacity">${currentDeviceStyleOrProp(el, 'opacity') || '1'}</span></span>
      <input type="range" min="0" max="1" step="0.05" value="${currentDeviceStyleOrProp(el, 'opacity') || 1}" data-bind="style:opacity">
    </div>
    `}
    ${el.type === 'video' || el.type === 'imagem' || el.type === 'mapa' ? '' : segRow('Sombra', 'style:boxShadow', [
      { value: '', title: 'Nenhuma', html: 'N' },
      { value: '0 1px 2px rgba(16,24,40,0.06)', title: 'Leve', html: 'S' },
      { value: '0 8px 24px rgba(16,24,40,0.16)', title: 'Forte', html: 'SS' }
    ], currentDeviceStyleOrProp(el, 'boxShadow') || '')}
  `;
}

/* -------------------- Inspector: aba Conteúdo (por tipo) -------------------- */

function renderContentTab(el) {
  switch (el.type) {
    case 'texto':
      return fieldRow('Texto', `<textarea class="inspector-textarea inspector-textarea-plain" data-bind="prop:content">${escapeHtml(el.content || '')}</textarea>`);

    case 'titulo':
      return `
        ${fieldRow('Texto do título', `<input type="text" class="inspector-input" data-bind="prop:content" value="${escapeHtml(el.content || '')}">`)}
        ${fieldRow('Nível do título', `<select class="inspector-select" data-bind="prop:level" data-cast="number">
          ${[1, 2, 3, 4, 5, 6].map(n => `<option value="${n}" ${Number(el.level) === n ? 'selected' : ''}>H${n}</option>`).join('')}
        </select>`)}
      `;

    case 'botao':
      return `
        <div class="inspector-field inspector-field-row">
          <span class="inspector-field-label">Cor do botão</span>
          ${colorSwatchPopoverHtml(currentDeviceStyleOrProp(el, 'backgroundColor') || builderState.globalStyle.primaryColor || '#537bae', 'data-bind="style:backgroundColor"')}
        </div>
        ${fieldRow('Texto do botão', `<input type="text" class="inspector-input" data-bind="prop:content" value="${escapeHtml(el.content || '')}">`)}
        ${fieldRow('Link (URL)', `<input type="text" class="inspector-input" data-bind="prop:href" value="${escapeHtml(el.href || '')}" placeholder="https://">`)}
      `;

    case 'imagem':
      return `
        <div class="inspector-field">
          <span class="inspector-field-label">Imagem</span>
          <div class="header-logo-picker-wrap">
            <label class="image-upload-zone">
              ${el.src
                ? `<img src="${el.src}" class="image-upload-zone-preview" alt="">
                   <div class="header-logo-picker-overlay">${BI.image}<span>Alterar imagem</span></div>`
                : `<span class="image-upload-zone-plus">${BI.plus}</span><span class="image-upload-zone-text">Adicione ou arraste uma imagem</span>`}
              <input type="file" accept="image/*" class="image-upload-zone-input" data-image-upload>
            </label>
            ${el.src ? `<button type="button" class="header-logo-picker-remove" data-image-remove title="Remover imagem">${BI.close}</button>` : ''}
          </div>
        </div>
        ${fieldRow('Texto alternativo', `<input type="text" class="inspector-input" data-bind="prop:alt" value="${escapeHtml(el.alt || '')}">`)}
        ${fieldRow('Link (opcional)', `<input type="text" class="inspector-input" data-bind="prop:href" value="${escapeHtml(el.href || '')}" placeholder="https://">`)}
        ${fieldRow('Ajuste (object-fit)', `<select class="inspector-select" data-bind="style:objectFit">
          <option value="cover" ${currentDeviceStyleOrProp(el, 'objectFit') !== 'contain' ? 'selected' : ''}>Preencher (cover)</option>
          <option value="contain" ${currentDeviceStyleOrProp(el, 'objectFit') === 'contain' ? 'selected' : ''}>Conter (contain)</option>
        </select>`)}
      `;

    case 'video':
      return `
        ${fieldRow('URL do vídeo (YouTube ou Vimeo)', `<input type="text" class="inspector-input" data-bind="prop:url" value="${escapeHtml(el.url || '')}" placeholder="https://youtube.com/watch?v=...">`)}
        <div class="inspector-toggle-row"><span class="inspector-field-label">Autoplay</span><label class="settings-switch"><input type="checkbox" data-bind="prop:autoplay" ${el.autoplay ? 'checked' : ''}><span class="settings-switch-track"></span></label></div>
        <div class="inspector-toggle-row"><span class="inspector-field-label">Loop</span><label class="settings-switch"><input type="checkbox" data-bind="prop:loop" ${el.loop ? 'checked' : ''}><span class="settings-switch-track"></span></label></div>
        <div class="inspector-toggle-row"><span class="inspector-field-label">Mostrar controles</span><label class="settings-switch"><input type="checkbox" data-bind="prop:controls" ${el.controls !== false ? 'checked' : ''}><span class="settings-switch-track"></span></label></div>
      `;

    case 'separador':
      return `
        ${fieldRow('Estilo', `<select class="inspector-select" data-bind="prop:borderStyle">
          <option value="solid" ${el.borderStyle === 'solid' ? 'selected' : ''}>Sólido</option>
          <option value="dashed" ${el.borderStyle === 'dashed' ? 'selected' : ''}>Tracejado</option>
          <option value="dotted" ${el.borderStyle === 'dotted' ? 'selected' : ''}>Pontilhado</option>
        </select>`)}
        <div class="inspector-field inspector-field-row"><span class="inspector-field-label">Cor</span>${colorSwatchPopoverHtml(el.color, 'data-bind="prop:color"')}</div>
        ${fieldRow('Espessura (px)', `<input type="number" class="inspector-input" data-bind="prop:thickness" value="${el.thickness}">`)}
        ${fieldRow('Largura (%)', `<input type="range" min="10" max="100" data-bind="prop:width" value="${el.width}">`)}
      `;

    case 'espacamento':
      return fieldRow('Altura (px)', `<input type="range" min="4" max="240" data-bind="prop:height" value="${el.height}"> <span>${el.height}px</span>`);

    case 'galeria':
    case 'carrossel':
      return `
        ${el.type === 'galeria' ? fieldRow('Colunas', `<select class="inspector-select" data-bind="prop:columns" data-cast="number">
          <option value="2" ${el.columns === 2 ? 'selected' : ''}>2</option>
          <option value="3" ${el.columns === 3 ? 'selected' : ''}>3</option>
          <option value="4" ${el.columns === 4 ? 'selected' : ''}>4</option>
        </select>`) : ''}
        ${el.type === 'carrossel' ? fieldRow('Formato de rolagem', `<select class="inspector-select" data-bind="prop:scrollMode">
          <option value="slider" ${(el.scrollMode || 'slider') === 'slider' ? 'selected' : ''}>Barra deslizante</option>
          <option value="arrows" ${el.scrollMode === 'arrows' ? 'selected' : ''}>Setas</option>
          <option value="auto" ${el.scrollMode === 'auto' ? 'selected' : ''}>Automático</option>
        </select>`) : ''}
        <div id="images-editor">
          ${el.images.map((img, i) => `
            <div class="inspector-list-item">
              <button type="button" class="inspector-list-item-remove" data-remove-image="${i}">${BI.trash}</button>
              <span class="inspector-field-label">Imagem ${i + 1}</span>
              ${imageUploadZoneHtml(img.src, `data-image-file="${i}"`)}
            </div>
          `).join('')}
        </div>
        <button type="button" class="inspector-add-btn" data-add-image>${BI.plus} Adicionar imagem</button>
      `;

    case 'mapa':
      return `
        ${fieldRow('Link de incorporação do Google Maps', `<input type="text" class="inspector-input" data-bind="prop:embedUrl" value="${escapeHtml(el.embedUrl || '')}" placeholder="https://www.google.com/maps/embed?...">`)}
        <p class="inspector-hint">No Google Maps: Compartilhar → Incorporar um mapa → copie a URL do atributo "src" do código.</p>
        ${fieldRow('Endereço (texto exibido)', `<input type="text" class="inspector-input" data-bind="prop:address" value="${escapeHtml(el.address || '')}">`)}
      `;

    case 'contagem':
      return `
        ${fieldRow('Rótulo', `<input type="text" class="inspector-input" data-bind="prop:label" value="${escapeHtml(el.label || '')}">`)}
        ${fieldRow('Fonte do texto', `<select class="inspector-select" data-bind="prop:fontFamily">
          ${FONT_OPTIONS_FORMAL.map(f => `<option value="${escapeHtml(f.value)}" ${(el.fontFamily || '') === f.value ? 'selected' : ''}>${escapeHtml(f.label)}</option>`).join('')}
        </select>`)}
        <div class="inspector-field inspector-field-row">
          <span class="inspector-field-label">Cor do texto</span>
          ${colorSwatchPopoverHtml(el.textColor, 'data-bind="prop:textColor"')}
        </div>
        <div class="inspector-field inspector-field-row">
          <span class="inspector-field-label">Cor de fundo</span>
          ${colorSwatchPopoverHtml(el.boxBgColor, 'data-bind="prop:boxBgColor"')}
        </div>
        <p class="inspector-hint">A cor de fundo muda apenas as caixinhas de dias/horas/min/seg.</p>
        ${fieldRow('Data alvo', `<input type="date" class="inspector-input" data-bind="prop:targetDate" value="${escapeHtml(el.targetDate || '')}">`)}
        ${fieldRow('Horário', `<input type="time" class="inspector-input" data-bind="prop:targetTime" value="${escapeHtml(el.targetTime || '')}">`)}
      `;

    case 'data':
      return `
        ${fieldRow('Data', `<input type="date" class="inspector-input" data-bind="prop:targetDate" value="${escapeHtml(el.targetDate || '')}">`)}
        ${fieldRow('Horário (opcional)', `<input type="time" class="inspector-input" data-bind="prop:targetTime" value="${escapeHtml(el.targetTime || '')}">`)}
        ${fieldRow('Fonte do texto', `<select class="inspector-select" data-bind="prop:fontFamily">
          ${FONT_OPTIONS_FORMAL.map(f => `<option value="${escapeHtml(f.value)}" ${(el.fontFamily || '') === f.value ? 'selected' : ''}>${escapeHtml(f.label)}</option>`).join('')}
        </select>`)}
        <div class="inspector-field inspector-field-row">
          <span class="inspector-field-label">Cor do texto</span>
          ${colorSwatchPopoverHtml(el.textColor, 'data-bind="prop:textColor"')}
        </div>
        <div class="inspector-toggle-row"><span class="inspector-field-label">Aplicar linhas</span><label class="settings-switch"><input type="checkbox" data-bind="prop:showLines" ${el.showLines ? 'checked' : ''}><span class="settings-switch-track"></span></label></div>
        <p class="inspector-hint">Adiciona uma linha antes da data e outra dos dois lados do dia da semana.</p>
      `;

    default:
      return '<p class="inspector-hint">Sem opções de conteúdo para este elemento.</p>';
  }
}

/* -------------------- Inicialização -------------------- */

function initSiteBuilder() {
  const root = document.getElementById('site-builder-root');
  if (!root) return;

  currentPageKey = 'convite';
  builderState = loadPageState(currentPageKey);
  historyStack = [snapshotState()];
  historyIndex = 0;

  initPageSwitcher();

  const deviceToggle = document.getElementById('builder-device-toggle');
  if (deviceToggle) {
    deviceToggle.querySelectorAll('.builder-device-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        currentDevice = btn.dataset.device;
        deviceToggle.querySelectorAll('.builder-device-btn').forEach(b => b.classList.toggle('active', b === btn));
        renderCanvas();
        if (selectedId) renderLeftPanel();
      });
    });
  }

  const undoBtn = document.getElementById('builder-undo');
  if (undoBtn) undoBtn.addEventListener('click', undo);
  const redoBtn = document.getElementById('builder-redo');
  if (redoBtn) redoBtn.addEventListener('click', redo);
  const saveBtn = document.getElementById('builder-save');
  if (saveBtn) saveBtn.addEventListener('click', () => persistBuilderState(false));
  const publishBtn = document.getElementById('builder-publish');
  if (publishBtn) publishBtn.addEventListener('click', () => {
    persistBuilderState(true);
    const keys = pagePublishedKeys(currentPageKey);
    localStorage.setItem(keys.flag, '1');
    localStorage.setItem(keys.state, JSON.stringify(builderState));
    showToast('Site publicado com sucesso!');
  });

  const previewBtn = document.getElementById('builder-preview-link');
  if (previewBtn) previewBtn.addEventListener('click', (e) => {
    e.preventDefault();
    window.open(PREVIEW_PAGE_URL, '_blank', 'noopener');
  });

  const unsavedSaveBtn = document.getElementById('btn-unsaved-save');
  if (unsavedSaveBtn) unsavedSaveBtn.addEventListener('click', () => {
    persistBuilderState(true);
    const cb = pendingLeaveCallback;
    hideUnsavedChangesModal();
    if (cb) cb();
  });
  const unsavedDiscardBtn = document.getElementById('btn-unsaved-discard');
  if (unsavedDiscardBtn) unsavedDiscardBtn.addEventListener('click', () => {
    hasUnsavedChanges = false;
    const cb = pendingLeaveCallback;
    hideUnsavedChangesModal();
    if (cb) cb();
  });

  wireUnsavedChangesGuard();

  const canvasViewport = document.getElementById('builder-canvas-viewport');
  if (canvasViewport) {
    canvasViewport.addEventListener('click', (e) => {
      if (e.target.id === 'builder-canvas-viewport' || e.target.id === 'builder-canvas') deselect();
    });
  }

  document.addEventListener('keydown', (e) => {
    if (!document.getElementById('site-builder-root') || document.getElementById('site-builder-root').classList.contains('hidden')) return;
    const tag = (document.activeElement && document.activeElement.tagName) || '';
    const isEditingField = tag === 'INPUT' || tag === 'TEXTAREA' || (document.activeElement && document.activeElement.isContentEditable);

    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z' && !e.shiftKey) { e.preventDefault(); undo(); return; }
    if ((e.metaKey || e.ctrlKey) && (e.key.toLowerCase() === 'y' || (e.key.toLowerCase() === 'z' && e.shiftKey))) { e.preventDefault(); redo(); return; }

    if (isEditingField) return;

    if ((e.key === 'Delete' || e.key === 'Backspace') && selectedId) {
      const sel = findSelected();
      if (sel && sel.kind === 'element') { removeElementById(selectedId); }
      else return;
      e.preventDefault();
      selectedId = null;
      pushHistory();
      renderCanvas();
      renderLeftPanel();
    }

    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'd' && selectedId) {
      const sel = findSelected();
      if (sel && sel.kind === 'element') {
        e.preventDefault();
        const clone = duplicateElementById(selectedId);
        pushHistory(); renderCanvas();
        if (clone) selectElement(clone.id, 'element');
      }
    }
  });

  renderLeftPanel();
  renderCanvas();
  applyGlobalStyleVars();
  updateHistoryButtons();
}

document.addEventListener('DOMContentLoaded', initSiteBuilder);

/* -------------------- Página pública de pré-visualização (convite-preview.html) -------------------- */

function initPublicPreview() {
  const root = document.getElementById('public-preview-root');
  if (!root) return;

  let publishedState = null;
  try {
    publishedState = JSON.parse(localStorage.getItem(BUILDER_PUBLISHED_STATE_KEY) || 'null');
  } catch (e) { publishedState = null; }

  if (!publishedState || !Array.isArray(publishedState.sections) || !publishedState.sections.length) {
    root.innerHTML = '<div class="public-preview-empty">Este convite ainda não foi publicado.<br>Volte para "Personalizar evento" → "Aparência" e clique em "Publicar".</div>';
    return;
  }

  builderState = publishedState;
  migrateQuickNavSection(builderState);
  migrateElementDefaults(builderState);
  currentDevice = 'mobile';

  const gs = builderState.globalStyle || {};
  root.style.setProperty('--bx-primary', gs.primaryColor || '#537bae');
  root.style.setProperty('--bx-radius', (gs.radius !== undefined ? gs.radius : 16) + 'px');
  root.style.setProperty('--bx-section-spacing', (gs.sectionSpacing !== undefined ? gs.sectionSpacing : 32) + 'px');

  const visible = builderState.sections.filter(s => !s.hidden);
  root.innerHTML = visible.map(section => renderAnySectionHtml(section, 'preview', 'mobile')).join('') + renderFixedFooterHtml();

  startCountdownTicker(root);
}

document.addEventListener('DOMContentLoaded', initPublicPreview);
