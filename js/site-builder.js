/* ==========================================================================
   LOVE — Construtor visual da Aparência (Personalizar evento > Aparência)
   Baseado no motor do construtor do B2B ("Editar meu site"), adaptado para
   um convite de casamento: uma única seção/coluna, mobile-first.
   Somente front-end. Estado salvo em localStorage (sem backend ainda).
   ========================================================================== */

const BUILDER_STORAGE_KEY = 'love-site-builder-page';
const BUILDER_PUBLISHED_KEY = 'love-site-builder-published';
const BUILDER_PUBLISHED_STATE_KEY = 'love-site-builder-published-state';
const PREVIEW_PAGE_URL = '/convite-preview';

/**
 * Link público do evento ativo (love.com.br/<slug>, no domínio atual). Sem
 * slug ainda, cai na prévia.
 * @returns {string}
 */
function urlDaPaginaPublicada() {
  const evento = typeof getActiveEventForBuilder === 'function' ? getActiveEventForBuilder() : null;
  const slug = evento && String(evento.slug || '').trim();
  return slug ? `${window.location.origin}/${encodeURIComponent(slug)}` : PREVIEW_PAGE_URL;
}

// Páginas/templates adicionais do site (mesmo padrão do dropdown "Páginas do site"
// do B2B — site principal + meu checkout): cada uma tem seu próprio estado salvo.
const PRESENTES_STORAGE_KEY = 'love-site-builder-presentes';
const PRESENTES_PUBLISHED_KEY = 'love-site-builder-presentes-published';
const PRESENTES_PUBLISHED_STATE_KEY = 'love-site-builder-presentes-published-state';
const DRESSCODE_STORAGE_KEY = 'love-site-builder-dresscode';
const DRESSCODE_PUBLISHED_KEY = 'love-site-builder-dresscode-published';
const DRESSCODE_PUBLISHED_STATE_KEY = 'love-site-builder-dresscode-published-state';
// Save the Date: capa (mesma imagem do convite) + textos, sem botões. Não é
// publicado — é compartilhado como imagem + texto (WhatsApp, Instagram, e-mail).
const SAVETHEDATE_STORAGE_KEY = 'love-site-builder-savethedate';
const BUILDER_PAGE_LABELS = { convite: 'Convite digital', presentes: 'Lista de Presentes', dresscode: 'Dress code', savethedate: 'Save the Date' };
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
  social: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="6" r="2.5"/><circle cx="18" cy="18" r="2.5"/><path stroke-linecap="round" d="m8.2 10.8 7.6-3.6M8.2 13.2l7.6 3.6"/></svg>',
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
  trash: '<svg stroke-linejoin="round" stroke-linecap="round" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M4 6.5h16"/><path stroke-linecap="round" stroke-linejoin="round" d="M9 6.5V4.5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/><path stroke-linecap="round" stroke-linejoin="round" d="M6.5 9.5V18a3 3 0 0 0 3 3h5a3 3 0 0 0 3-3V9.5"/><path stroke-linecap="round" stroke-linejoin="round" d="M10.5 11v5.5M13.5 11v5.5"/></svg>',
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
  textShadow: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 20 12 5l5 15M8.7 15h6.6" opacity="0.35" transform="translate(2 1.5)"/><path d="M5 18.5 10 3.5l5 15M6.7 13.5h6.6"/></svg>',
  alignLeft: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" d="M4 6h16M4 12h10M4 18h14"/></svg>',
  alignCenter: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" d="M4 6h16M7 12h10M5 18h14"/></svg>',
  alignRight: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" d="M4 6h16M10 12h10M6 18h14"/></svg>',
  vinculo: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>',
  vinculoCortado: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/><path d="M3 3l18 18"/></svg>',
  plusCircle: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15"/></svg>',
  grip: '<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="8" cy="6" r="1.8"/><circle cx="16" cy="6" r="1.8"/><circle cx="8" cy="12" r="1.8"/><circle cx="16" cy="12" r="1.8"/><circle cx="8" cy="18" r="1.8"/><circle cx="16" cy="18" r="1.8"/></svg>',
  gift: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="9" width="18" height="4" rx="1"/><rect x="4.5" y="13" width="15" height="8" rx="1"/><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v12M12 9c-1.8 0-3.4-1.7-3.4-3.4A2.6 2.6 0 0 1 12 5c0 1.5-1.1 2.7-2.5 3.3M12 9c1.8 0 3.4-1.7 3.4-3.4A2.6 2.6 0 0 0 12 5c0 1.5 1.1 2.7 2.5 3.3"/></svg>',
  checkCircle: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="9"/><path stroke-linecap="round" stroke-linejoin="round" d="m8.5 12.5 2.3 2.3 4.7-5.1"/></svg>',
  shirt: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path stroke-linecap="round" stroke-linejoin="round" d="M8 4 4 7l2 3 2-1.2V20h8V8.8L18 10l2-3-4-3-2 2h-4L8 4Z"/></svg>',
  // Clássicos dos botões: presente igual ao do menu lateral, cabide (dress code) e coração (sobre).
  giftSidebar: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path stroke-linecap="round" stroke-linejoin="round" d="M12 8v13m0-13V6a2 2 0 1 1 2 2h-2zm0 0V5.5A2.5 2.5 0 1 0 9.5 8H12zm-7 4h14M5 12a2 2 0 1 1 0-4h14a2 2 0 1 1 0 4M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7"/></svg>',
  hanger: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path stroke-linecap="round" stroke-linejoin="round" d="M9.75 5.75a2.25 2.25 0 1 1 3.06 2.1c-.49.19-.81.66-.81 1.18V10m0 0 8.36 5.57A1.5 1.5 0 0 1 19.53 18.3H4.47a1.5 1.5 0 0 1-.83-2.73L12 10Z"/></svg>',
  heart: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path stroke-linecap="round" stroke-linejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z"/></svg>',
  users: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path stroke-linecap="round" stroke-linejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z"/></svg>'
};

const QUICKNAV_ICON_MAP = {
  'qn-loc': 'map',
  'qn-gifts': 'giftSidebar',
  'qn-rsvp': 'checkCircle',
  'qn-dress': 'hanger',
  'qn-about': 'heart'
};

const QUICKNAV_EMOJI_MAP = {
  'qn-loc': '📍',
  'qn-gifts': '🎁',
  'qn-rsvp': '💌',
  'qn-dress': '👗',
  'qn-about': '💞'
};

// Ícones "Modernos": glifo sólido, sem círculo, num tom mais escuro que o
// fundo do botão (ver corMaisEscura). O mapa de
// cores abaixo não é mais usado no desenho; fica só por compatibilidade.
const QUICKNAV_MODERN_COLOR_MAP = {
  'qn-loc': '#3B82F6',
  'qn-gifts': '#F43F5E',
  'qn-rsvp': '#10B981',
  'qn-dress': '#8B5CF6',
  'qn-about': '#F59E0B'
};

// Modernos: glifos sólidos, sem círculo em volta e diferentes dos Clássicos
// (pino em vez de mapa, caixa de presente, envelope, vestido, coração cheio).
const QUICKNAV_MODERN_ICON_MAP = {
  'qn-loc': '<svg viewBox="0 0 24 24" fill="currentColor"><path fill-rule="evenodd" d="M12 2a7.5 7.5 0 0 0-7.5 7.5c0 5.4 6.2 11.6 6.9 12.3a.85.85 0 0 0 1.2 0c.7-.7 6.9-6.9 6.9-12.3A7.5 7.5 0 0 0 12 2Zm0 10.25a2.75 2.75 0 1 0 0-5.5 2.75 2.75 0 0 0 0 5.5Z"/></svg>',
  'qn-gifts': '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M3 8.5A1.5 1.5 0 0 1 4.5 7h15A1.5 1.5 0 0 1 21 8.5V10a1 1 0 0 1-1 1h-7V7h-2v4H4a1 1 0 0 1-1-1V8.5Z"/><path d="M4.5 12.5H11V22H6a1.5 1.5 0 0 1-1.5-1.5v-8Zm8.5 0h6.5v8A1.5 1.5 0 0 1 18 22h-5v-9.5Z"/><path d="M12 7c-1.2-2.6-3.2-4-4.8-3.4-1.3.5-1.4 2.3.2 3.4H12Zm0 0c1.2-2.6 3.2-4 4.8-3.4 1.3.5 1.4 2.3-.2 3.4H12Z"/></svg>',
  'qn-rsvp': '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M3 6.5A2.5 2.5 0 0 1 5.5 4h13A2.5 2.5 0 0 1 21 6.5v.35l-9 5.6-9-5.6V6.5Z"/><path d="M3 9.2v8.3A2.5 2.5 0 0 0 5.5 20h13a2.5 2.5 0 0 0 2.5-2.5V9.2l-8.47 5.27a1 1 0 0 1-1.06 0L3 9.2Z"/></svg>',
  'qn-dress': '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M9 2.5a.75.75 0 0 1 .75.75V5c0 .55.45 1 1 1h2.5c.55 0 1-.45 1-1V3.25a.75.75 0 0 1 1.5 0V6.2c0 .5-.2.98-.55 1.33l-.7.71 4.3 11.36A1.75 1.75 0 0 1 17.16 22H6.84a1.75 1.75 0 0 1-1.64-2.4L9.5 8.24l-.7-.71A1.88 1.88 0 0 1 8.25 6.2V3.25A.75.75 0 0 1 9 2.5Z"/></svg>',
  'qn-about': '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 21s-7.5-4.6-9.6-9.4C.9 8.1 3.1 4 6.9 4c2.1 0 3.6 1.1 5.1 2.9C13.5 5.1 15 4 17.1 4c3.8 0 6 4.1 4.5 7.6C19.5 16.4 12 21 12 21Z"/></svg>'
};

/**
 * Cor um pouco mais escura que a do botão (ícones Modernos): branco vira
 * cinza, amarelo vira amarelo mais escuro. Aceita #rgb, #rrggbb e rgb()/rgba().
 * @param {string} cor
 * @param {number} [fator]  0–1 (quanto da luminosidade fica)
 * @returns {string|null}
 */
function corMaisEscura(cor, fator) {
  const k = typeof fator === 'number' ? fator : 0.68;
  const txt = String(cor || '').trim();
  /** @type {number[]} */
  let rgb = [];
  const hex = txt.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (hex) {
    let h = hex[1];
    if (h.length === 3) h = h.split('').map(c => c + c).join('');
    rgb = [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16));
  } else {
    const fn = txt.match(/^rgba?\(([^)]+)\)$/i);
    if (!fn) return null;
    rgb = fn[1].split(',').slice(0, 3).map(v => parseFloat(v));
    if (rgb.length < 3 || rgb.some(v => isNaN(v))) return null;
  }
  return '#' + rgb.map(v => Math.max(0, Math.min(255, Math.round(v * k))).toString(16).padStart(2, '0')).join('');
}

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
      { id: 'qn-dress', label: 'Dress code', visible: true },
      { id: 'qn-about', label: 'Sobre', visible: true }
    ]
  };
}

// Garante que a seção de botões de navegação exista dentro de builderState.sections
// (ela é uma seção como qualquer outra — pode ser arrastada — só não pode ser excluída
// nem ficar em primeiro lugar). Migra estados antigos que guardavam "quickNav" à parte.
// Capa com imagem é só imagem: elementos que caíram dentro dela (versões
// antigas deixavam) vão para uma seção nova logo abaixo da capa.
function tirarElementosDaCapa(state) {
  if (!state || !Array.isArray(state.sections)) return;
  const capa = state.sections.find(sec => !sec.isQuickNav && !sec.isGiftsBlock);
  if (!capa || !capa.bgImage || !Array.isArray(capa.columns)) return;
  const elementos = [];
  capa.columns.forEach(col => {
    if (Array.isArray(col.elements) && col.elements.length) {
      elementos.push(...col.elements);
      col.elements = [];
    }
  });
  if (!elementos.length) return;
  const nova = createSection();
  nova.columns[0].elements = elementos;
  state.sections.splice(state.sections.indexOf(capa) + 1, 0, nova);
}

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

  // Convites salvos antes de um botão novo existir (ex.: "Sobre") ganham o
  // botão, logo depois do anterior a ele na lista padrão.
  if (!Array.isArray(qnSection.buttons)) qnSection.buttons = [];
  defaultQuickNavSection().buttons.forEach((padrao, i, padroes) => {
    if (qnSection.buttons.some(b => b.id === padrao.id)) return;
    const anterior = i > 0 ? qnSection.buttons.findIndex(b => b.id === padroes[i - 1].id) : -1;
    qnSection.buttons.splice(anterior >= 0 ? anterior + 1 : qnSection.buttons.length, 0, { ...padrao });
  });
}

const FONT_OPTIONS = [
  { value: '', label: 'Padrão (Inter)' },
  { value: "'Alex Brush', cursive", label: 'Alex Brush' },
  { value: "'Avermont House', 'Avermont', 'Playfair Display', Georgia, serif", label: 'Avermont House' },
  { value: "'Bludhaven', 'Cinzel', serif", label: 'Bludhaven' },
  { value: "'Bride', 'Ephesis', cursive", label: 'Bride' },
  { value: "'Great Vibes', cursive", label: 'Great Vibes' },
  { value: "'Inter', sans-serif", label: 'Inter' },
  { value: "'Italiana', Georgia, serif", label: 'Italiana' },
  { value: "'Lora', Georgia, serif", label: 'Lora' },
  { value: "'Marcellus', Georgia, serif", label: 'Marcellus' },
  { value: "'Mea Culpa', cursive", label: 'Mea Culpa' },
  { value: "'Montserrat', sans-serif", label: 'Montserrat' },
  { value: "'Outfit', sans-serif", label: 'Moderno Outfit' },
  { value: "'Parisienne', cursive", label: 'Parisienne' },
  { value: "'Pinyon Script', cursive", label: 'Pinyon Script' },
  { value: "'Plus Jakarta Sans', sans-serif", label: 'Plus Jakarta Sans' },
  { value: "'Prata', Georgia, serif", label: 'Prata' },
  { value: "'Sacramento', cursive", label: 'Sacramento' }
];

const FONT_OPTIONS_FORMAL = [
  { value: '', label: 'Padrão (Inter)' },
  { value: "'Alex Brush', cursive", label: 'Alex Brush' },
  { value: "'Avermont House', 'Avermont', 'Playfair Display', Georgia, serif", label: 'Avermont House' },
  { value: "'Cinzel', Georgia, serif", label: 'Cinzel' },
  { value: "'Inter', sans-serif", label: 'Inter' },
  { value: "'Italiana', Georgia, serif", label: 'Italiana' },
  { value: "'Lora', Georgia, serif", label: 'Lora' },
  { value: "'Marcellus', Georgia, serif", label: 'Marcellus' },
  { value: "'Mea Culpa', cursive", label: 'Mea Culpa' },
  { value: "'Montserrat', sans-serif", label: 'Montserrat' },
  { value: "'Outfit', sans-serif", label: 'Moderno Outfit' },
  { value: "'Pinyon Script', cursive", label: 'Pinyon Script' },
  { value: "'Plus Jakarta Sans', sans-serif", label: 'Plus Jakarta Sans' },
  { value: "'Prata', Georgia, serif", label: 'Prata' },
  { value: "'Sacramento', cursive", label: 'Sacramento' },
  { value: "'Times New Roman', Times, serif", label: 'Times New Roman' }
];

/**
 * Campo de horário de 15 em 15 minutos (00:00, 00:15 … 23:45). Um horário
 * salvo antes fora dessa grade (ex.: 16:20) continua na lista para não sumir.
 * @param {string} valor  horário atual no formato HH:MM ('' = sem horário)
 * @param {string} rotuloVazio  texto da opção sem horário
 * @returns {string}
 */
function seletorDeHorarioHtml(valor, rotuloVazio) {
  /** @type {string[]} */
  const horarios = [];
  for (let m = 0; m < 24 * 60; m += 15) {
    horarios.push(String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0'));
  }
  const atual = (valor || '').slice(0, 5);
  if (atual && !horarios.includes(atual)) { horarios.push(atual); horarios.sort(); }
  return `<select class="inspector-select" data-bind="prop:targetTime">
    <option value="" ${atual ? '' : 'selected'}>${rotuloVazio}</option>
    ${horarios.map(h => `<option value="${h}" ${h === atual ? 'selected' : ''}>${h}</option>`).join('')}
  </select>`;
}

// Fontes do elemento Data: as formais sem as cursivas (a data precisa ser
// legível) e com a Jost, que entra sempre espaçada (ver JOST_TRACKING).
const FONTES_CURSIVAS_FORA_DA_DATA = ['Alex Brush', 'Allura', 'Mea Culpa', 'Pinyon Script', 'Sacramento'];
const FONT_OPTIONS_DATA = (() => {
  const lista = FONT_OPTIONS_FORMAL.filter(f => !FONTES_CURSIVAS_FORA_DA_DATA.includes(f.label));
  lista.push({ value: "'Jost', sans-serif", label: 'Jost' });
  return [lista[0], ...lista.slice(1).sort((a, b) => a.label.localeCompare(b.label, 'pt-BR'))];
})();
// A Jost nunca fica no espaçamento padrão: letras abertas (0.2em, na faixa de 0.15em a 0.3em).
const JOST_TRACKING = '0.2em';

const VIDEO_ASPECT_RATIOS = { '16:9': 56.25, '9:16': 177.78, '1:1': 100, '4:5': 125 };
const VIDEO_ASPECT_RATIO_OPTIONS = [
  { value: '16:9', label: 'Paisagem (16:9)' },
  { value: '9:16', label: 'Retrato (9:16)' },
  { value: '1:1', label: 'Quadrado (1:1)' },
  { value: '4:5', label: 'Vertical (4:5)' }
];

const ELEMENT_GROUPS = [
  { title: 'Elementos', types: ['titulo', 'texto', 'imagem', 'botao', 'video', 'separador', 'espacamento', 'secao'] },
  { title: 'Avançado', types: ['galeria', 'carrossel', 'mapa', 'contagem', 'data', 'redes'] }
];

// Redes sociais: as mesmas plataformas e cores do editor de site do Hub.
const SOCIAL_PLATFORMS = {
  instagram: { label: 'Instagram', svg: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324Zm0 10.162a4 4 0 1 1 0-8 4 4 0 0 1 0 8Z"/></svg>' },
  whatsapp: { label: 'WhatsApp', svg: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21h.01c5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01a9.82 9.82 0 0 0-7.02-2.91zm0 18.15h-.01c-1.48 0-2.93-.4-4.19-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.26 8.26 0 0 1-1.26-4.38c0-4.54 3.7-8.24 8.24-8.24 2.2 0 4.27.86 5.83 2.42a8.18 8.18 0 0 1 2.41 5.83c.02 4.54-3.68 8.23-8.23 8.23zm4.52-6.16c-.25-.12-1.47-.72-1.69-.81-.23-.08-.39-.12-.56.12-.17.25-.64.81-.78.97-.14.17-.29.19-.54.06-.25-.12-1.05-.39-1.99-1.23-.74-.66-1.23-1.47-1.38-1.72-.14-.25-.02-.38.11-.51.11-.11.25-.29.37-.43s.17-.25.25-.41c.08-.17.04-.31-.02-.43-.06-.12-.56-1.34-.76-1.84-.2-.48-.41-.42-.56-.43h-.48c-.17 0-.43.06-.66.31-.22.25-.86.85-.86 2.07s.89 2.4 1.01 2.56c.12.17 1.75 2.67 4.23 3.74.59.26 1.05.41 1.41.52.59.19 1.13.16 1.56.1.48-.07 1.47-.6 1.67-1.18.21-.58.21-1.07.14-1.18-.06-.11-.22-.17-.47-.29z"/></svg>' },
  facebook: { label: 'Facebook', svg: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M22 12a10 10 0 1 0-11.56 9.88v-6.99H7.9V12h2.54V9.8c0-2.5 1.5-3.89 3.78-3.89 1.1 0 2.24.2 2.24.2v2.46H15.2c-1.24 0-1.63.77-1.63 1.56V12h2.78l-.44 2.89h-2.34v6.99A10 10 0 0 0 22 12Z"/></svg>' },
  tiktok: { label: 'TikTok', svg: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-1.01-.02 2.98.02 5.96-.02 8.94-.03 1.53-.45 3.08-1.28 4.38-1.12 1.77-2.97 3.04-5.04 3.49-1.71.38-3.55.19-5.14-.54-1.68-.78-3.05-2.14-3.86-3.8-1.07-2.18-.94-4.88.35-6.94 1.05-1.67 2.75-2.86 4.67-3.29.93-.21 1.9-.22 2.85-.04v4.18c-.7-.22-1.49-.24-2.19-.04-.84.23-1.57.81-1.95 1.59-.51 1.03-.38 2.3.33 3.2.66.84 1.72 1.34 2.8 1.34 1.14 0 2.21-.56 2.85-1.51.37-.55.57-1.22.57-1.89V.02z"/></svg>' },
  linkedin: { label: 'LinkedIn', svg: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/></svg>' },
  youtube: { label: 'YouTube', svg: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>' },
  twitter: { label: 'Twitter (X)', svg: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231Zm-1.161 17.52h1.833L7.084 4.126H5.117Z"/></svg>' },
  pinterest: { label: 'Pinterest', svg: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12.017 0C5.396 0 0 5.396 0 12.017c0 5.077 3.169 9.417 7.627 11.164-.105-.949-.199-2.405.041-3.441.219-.937 1.406-5.965 1.406-5.965s-.359-.72-.359-1.781c0-1.663.967-2.911 2.171-2.911 1.024 0 1.518.769 1.518 1.688 0 1.029-.653 2.567-.992 3.995-.285 1.193.6 2.165 1.775 2.165 2.128 0 3.768-2.245 3.768-5.487 0-2.86-2.056-4.861-4.991-4.861-3.398 0-5.393 2.549-5.393 5.184 0 1.027.395 2.127.889 2.726a.36.36 0 0 1 .083.343c-.091.378-.293 1.189-.332 1.355-.053.218-.174.265-.402.159-1.499-.698-2.436-2.889-2.436-4.649 0-3.785 2.75-7.262 7.929-7.262 4.163 0 7.398 2.967 7.398 6.931 0 4.136-2.607 7.464-6.227 7.464-1.216 0-2.359-.631-2.75-1.378 0 0-.602 2.291-.748 2.853-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24 12.017 24c6.624 0 11.99-5.396 11.99-12.017C24.007 5.396 18.641 0 12.017 0Z"/></svg>' }
};

const SOCIAL_PLATFORM_COLORS = {
  instagram: '#E1306C', whatsapp: '#25D366', facebook: '#1877F2', tiktok: '#000000',
  linkedin: '#0A66C2', youtube: '#FF0000', twitter: '#000000', pinterest: '#E60023'
};

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
  redes: { label: 'Redes sociais', icon: BI.social },
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

// Template inicial do Convite Digital por tipo de evento (cor de destaque +
// imagem de capa) — ponto de partida ao criar um evento, totalmente editável
// depois em Aparência. Imagens são placeholders dos assets já existentes;
// trocar por `tmpl.coverImage` quando as imagens definitivas chegarem.
const EVENT_TYPE_BUILDER_TEMPLATES = {
  wedding: { primaryColor: '#537bae', coverImage: 'assets/criar-casamento.jpg' },
  birthday: { primaryColor: '#D97706', coverImage: 'assets/criar-aniversario.jpg?v=20261021' },
  baby_shower: { primaryColor: '#8EC5D6', coverImage: 'assets/criar-cha-de-bebe.jpg' },
  bridal_shower: { primaryColor: '#D98B9E', coverImage: 'assets/criar-cha-de-panela.jpg' },
  gender_reveal: { primaryColor: '#B48FC9', coverImage: 'assets/criar-revelacao.jpg' },
  anniversary: { primaryColor: '#A98B5D', coverImage: 'assets/criar-bodas.jpg' }
};

// Aplica o template de cor + imagem de capa do Convite Digital de acordo com o
// tipo de evento escolhido na criação. Chamada a partir de app.js logo que o
// evento é criado — sobrescreve o estado salvo (única instância do construtor,
// compartilhada entre eventos neste mockup) e, se o construtor já estiver
// carregado na página, atualiza a tela na hora.
function applyEventTypeBuilderTemplate(typeKey) {
  const tmpl = EVENT_TYPE_BUILDER_TEMPLATES[typeKey] || EVENT_TYPE_BUILDER_TEMPLATES.wedding;
  const state = defaultPageState();
  state.globalStyle.primaryColor = tmpl.primaryColor;
  const firstSection = state.sections.find(s => !s.isQuickNav && !s.isGiftsBlock);
  if (firstSection) firstSection.bgImage = tmpl.coverImage;
  localStorage.setItem(BUILDER_STORAGE_KEY, JSON.stringify(state));

  if (currentPageKey === 'convite') {
    builderState = state;
    historyStack = [snapshotState()];
    historyIndex = 0;
    selectedId = null;
    if (document.getElementById('builder-canvas')) {
      applyGlobalStyleVars();
      renderCanvas();
      renderLeftPanel();
    }
  }
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
      tirarElementosDaCapa(parsed);
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
  // O evento ativo de verdade (o que está selecionado no topo); a lista de
  // window.LOVE_DATA é só a de demonstração e não acompanha a troca.
  if (typeof window.getLoveActiveEvent === 'function') {
    const ativo = window.getLoveActiveEvent();
    if (ativo) return ativo;
  }
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

/** Data do evento por extenso ("17 de outubro de 2026"). */
function dataDoEventoPorExtenso(ev) {
  const iso = ev && ((ev.eventDetails && ev.eventDetails.date) || ev.date);
  if (!iso) return '';
  const d = new Date(String(iso).slice(0, 10) + 'T12:00:00');
  return isNaN(d.getTime()) ? '' : d.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' });
}

// Save the Date vai como texto no WhatsApp: sem alinhamento (sempre à
// esquerda), sem fonte, sem cor e sem nível de título — só negrito ou não.
function textoNoFormatoWhatsapp(el) {
  if (!el || (el.type !== 'titulo' && el.type !== 'texto')) return el;
  if (!el.styles) el.styles = { desktop: {}, tablet: {}, mobile: {} };
  ['desktop', 'tablet', 'mobile'].forEach(dev => {
    const st = el.styles[dev] || (el.styles[dev] = {});
    delete st.fontFamily; delete st.color; delete st.textAlign;
  });
  el.styles.desktop.textAlign = 'left';
  delete el.color;
  return el;
}

/* Save the Date = capa + UMA mensagem (o texto que vai no WhatsApp, com
   *negrito*). A mensagem fica em state.mensagem; a seção de texto do canvas
   é gerada a partir dela (um único bloco, sem mover/duplicar/excluir). */
// Formatação do WhatsApp na prévia: *negrito*, _itálico_, ~tachado~,
// ```monoespaçado```, `código`, "> " citação, "- "/"* " lista com marcadores
// e "1. " lista numerada.
function formatarLinhaWhatsapp(texto) {
  return texto
    .replace(/```([^`]+)```/g, '<span class="std-mono">$1</span>')
    .replace(/`([^`\n]+)`/g, '<code class="std-codigo">$1</code>')
    .replace(/\*([^*\n]+)\*/g, '<strong>$1</strong>')
    .replace(/(^|[\s(])_([^_\n]+)_(?=$|[\s).,!?:;])/g, '$1<em>$2</em>')
    .replace(/~([^~\n]+)~/g, '<s>$1</s>');
}

function mensagemEmHtml(mensagem) {
  return escapeHtml(mensagem || '').split('\n').map(linha => {
    let m;
    if ((m = linha.match(/^&gt; ?(.*)$/))) return `<div class="std-citacao">${formatarLinhaWhatsapp(m[1]) || '&nbsp;'}</div>`;
    if ((m = linha.match(/^[-*] (.*)$/))) return `<div class="std-item">• ${formatarLinhaWhatsapp(m[1])}</div>`;
    if ((m = linha.match(/^(\d+)\. (.*)$/))) return `<div class="std-item">${m[1]}. ${formatarLinhaWhatsapp(m[2])}</div>`;
    return `<div>${formatarLinhaWhatsapp(linha) || '&nbsp;'}</div>`;
  }).join('');
}

// Estado antigo (vários títulos/textos): junta tudo numa mensagem só.
function mensagemDosElementos(state) {
  const div = document.createElement('div');
  const partes = [];
  (state.sections || []).filter(s => !s.hidden).forEach(sec => (sec.columns || []).forEach(col => (col.elements || []).forEach(el => {
    if ((el.type === 'titulo' || el.type === 'texto') && el.content) {
      div.innerHTML = String(el.content).replace(/<br\s*\/?>/gi, '\n');
      const t = (div.innerText || div.textContent || '').trim();
      if (!t) return;
      const peso = String((el.styles && el.styles.desktop && el.styles.desktop.fontWeight) || (el.type === 'titulo' ? '700' : ''));
      const negrito = peso === 'bold' || Number(peso) >= 600;
      partes.push(negrito ? t.split('\n').map(l => (l.trim() ? `*${l.trim()}*` : l)).join('\n') : t);
    }
  })));
  return partes.join('\n');
}

// Save the Date = só a mensagem (sem imagem): um bloco de texto.
function normalizarSaveTheDate(state) {
  if (!state) return state;
  state.sections = (state.sections || []).filter(s => !s.isQuickNav && !s.isGiftsBlock);
  if (typeof state.mensagem !== 'string') state.mensagem = mensagemDosElementos(state);
  const texto = createElement('texto');
  texto.id = 'std-mensagem';
  texto.content = mensagemEmHtml(state.mensagem);
  textoNoFormatoWhatsapp(texto);
  texto.styles.desktop.fontWeight = '400';
  const secao = state.sections.find(s => s.id === 'std-texto') || { id: 'std-texto', hidden: false, columns: [{ id: 'std-texto-col', width: 100, elements: [] }] };
  secao.columns = [{ id: 'std-texto-col', width: 100, elements: [texto] }];
  state.sections = [secao];
  return state;
}

function defaultSaveTheDateState() {
  const ev = getActiveEventForBuilder();
  // Mesma capa e cor do Convite Digital.
  let capaImg = '', cor = '#537bae';
  try {
    const convite = JSON.parse(localStorage.getItem(pageStorageKey('convite')) || 'null') || loadBuilderState();
    const capa = (convite.sections || []).find(s => !s.isQuickNav && !s.isGiftsBlock);
    capaImg = (capa && capa.bgImage) || '';
    cor = (convite.globalStyle && convite.globalStyle.primaryColor) || cor;
  } catch (e) { /* sem convite salvo */ }
  const titulo = createElement('titulo');
  titulo.content = 'Save the Date';
  const nomes = createElement('texto');
  nomes.content = (ev && ev.title) || 'Nosso evento';
  nomes.styles.desktop.fontWeight = '600';
  const data = createElement('texto');
  data.content = dataDoEventoPorExtenso(ev) || 'Data do evento';
  const aviso = createElement('texto');
  aviso.content = 'Reserve a data! O convite chega em breve.';
  [titulo, nomes, data, aviso].forEach(textoNoFormatoWhatsapp);
  return normalizarSaveTheDate({
    name: 'Save the Date',
    globalStyle: { primaryColor: cor, radius: 16, sectionSpacing: 32 },
    sections: [
      { id: uid('sec'), hidden: false, bgImage: capaImg, columns: [{ id: uid('col'), width: 100, elements: [] }] },
      { id: uid('sec'), hidden: false, columns: [{ id: uid('col'), width: 100, elements: [titulo, nomes, data, aviso] }] }
    ]
  });
}

function loadSaveTheDateState() {
  try {
    const raw = localStorage.getItem(pageStorageKey('savethedate'));
    if (raw) {
      const parsed = JSON.parse(raw);
      if (!parsed.globalStyle) parsed.globalStyle = { primaryColor: '#537bae', radius: 16, sectionSpacing: 32 };
      if (!Array.isArray(parsed.sections) || !parsed.sections.length) return defaultSaveTheDateState();
      // Save the Date não tem botões; o texto é uma mensagem única.
      tirarElementosDaCapa(parsed);
      migrateElementDefaults(parsed);
      return normalizarSaveTheDate(parsed);
    }
  } catch (e) { /* ignora estado corrompido */ }
  return defaultSaveTheDateState();
}

function loadPageState(pageKey) {
  if (pageKey === 'savethedate') return loadSaveTheDateState();
  if (pageKey === 'presentes') return loadPresentesState();
  if (pageKey === 'dresscode') return loadDresscodeState();
  return loadBuilderState();
}

// Cada evento tem seu próprio Convite Digital/Presentes/Dress code — a chave
// de localStorage (cache local instantâneo) é isolada por evento ativo; a
// fonte de verdade de verdade é a tabela `convite_digital_pages` no Supabase
// (ver syncBuilderStateFromSupabase/persistBuilderStateRemote mais abaixo).
function activeEventStorageSuffix() {
  const eventId = (typeof window.getLoveActiveEventId === 'function') ? window.getLoveActiveEventId() : null;
  return eventId ? `:${eventId}` : '';
}

// Enquanto os eventos do Supabase ainda não carregaram (ou em qualquer estado
// antigo com ids de mock tipo "evt-wedding-1"), o evento ativo não é um uuid
// de verdade — nesse caso não faz sentido consultar o Supabase por ele ainda.
function getActiveEventUuid() {
  const eventId = (typeof window.getLoveActiveEventId === 'function') ? window.getLoveActiveEventId() : null;
  const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return (eventId && uuidRe.test(eventId)) ? eventId : null;
}

function pageStorageKey(pageKey) {
  const suffix = activeEventStorageSuffix();
  if (pageKey === 'presentes') return PRESENTES_STORAGE_KEY + suffix;
  if (pageKey === 'dresscode') return DRESSCODE_STORAGE_KEY + suffix;
  if (pageKey === 'savethedate') return SAVETHEDATE_STORAGE_KEY + suffix;
  return BUILDER_STORAGE_KEY + suffix;
}

function pagePublishedKeys(pageKey) {
  const suffix = activeEventStorageSuffix();
  if (pageKey === 'presentes') return { flag: PRESENTES_PUBLISHED_KEY + suffix, state: PRESENTES_PUBLISHED_STATE_KEY + suffix };
  if (pageKey === 'dresscode') return { flag: DRESSCODE_PUBLISHED_KEY + suffix, state: DRESSCODE_PUBLISHED_STATE_KEY + suffix };
  return { flag: BUILDER_PUBLISHED_KEY + suffix, state: BUILDER_PUBLISHED_STATE_KEY + suffix };
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
  persistBuilderStateRemote(currentPageKey, builderState);
  if (!silent) showToast('Alterações salvas!');
  // Guia de primeiros passos: salvar o Save the Date risca "Escolher Save the Date".
  if (!silent && currentPageKey === 'savethedate' && typeof window.markPlatformTaskAchieved === 'function') {
    window.markPlatformTaskAchieved('savethedate');
  }
}

// Grava o estado atual na tabela `convite_digital_pages` (Supabase), por
// evento ativo — localStorage continua sendo o cache instantâneo que a tela
// lê; isso aqui garante que o dado sobrevive entre dispositivos/sessões.
async function persistBuilderStateRemote(pageKey, state) {
  const eventId = getActiveEventUuid();
  if (!eventId || typeof supabaseClient === 'undefined') return;
  const { error } = await supabaseClient
    .from('convite_digital_pages')
    .upsert({ evento_id: eventId, page_key: pageKey, state, updated_at: new Date().toISOString() }, { onConflict: 'evento_id,page_key' });
  if (error) console.error('Erro ao salvar Convite Digital no Supabase:', error);
}

// "Publicar": grava a cópia publicada (published_state) que a página pública
// love.com.br/<slug> lê pela função convite_publicado (migration 038).
async function publishBuilderStateRemote(pageKey, state) {
  const eventId = getActiveEventUuid();
  if (!eventId || typeof supabaseClient === 'undefined') return { error: new Error('Evento sem id do banco') };
  const agora = new Date().toISOString();
  const { error } = await supabaseClient
    .from('convite_digital_pages')
    .upsert({ evento_id: eventId, page_key: pageKey, state, published_state: state, published_at: agora, updated_at: agora }, { onConflict: 'evento_id,page_key' });
  if (error) console.error('Erro ao publicar Convite Digital:', error);
  return { error };
}

// Retorno no próprio botão (os avisos flutuantes estão desligados no painel).
async function publicarConviteNoAr(btn) {
  const textoOriginal = btn.textContent;
  btn.disabled = true;
  btn.textContent = 'Publicando…';
  let resultado = 'Publicado';
  try {
    // O link público vem do evento (eventos.slug): garante que está salvo.
    const evento = typeof window.persistirEventoAtivo === 'function'
      ? await window.persistirEventoAtivo()
      : { error: null };
    const { error } = await publishBuilderStateRemote(currentPageKey, builderState);
    if (error || (evento && evento.error)) resultado = 'Erro ao publicar';
    else if (evento && evento.slugEmUso) resultado = 'Link já em uso';
  } catch (e) {
    console.error('Erro ao publicar Convite Digital:', e);
    resultado = 'Erro ao publicar';
  }
  btn.textContent = resultado;
  setTimeout(() => {
    btn.textContent = textoOriginal;
    btn.disabled = false;
  }, 2200);
}

// Cria a primeira linha do Convite Digital de um evento recém-criado
// (chamado por app.js, tanto na criação manual quanto ao semear os eventos
// de demonstração) — já com o template de cor/imagem do tipo escolhido.
/**
 * Template padrão do tipo de evento (tabela convite_templates_padrao,
 * migration 071): o Convite digital montado num evento-modelo. null se o
 * tipo ainda não tem template.
 * @param {string} typeKey
 * @returns {Promise<any|null>}
 */
async function templatePadraoDoTipo(typeKey) {
  try {
    const { data, error } = await supabaseClient
      .from('convite_templates_padrao')
      .select('state')
      .eq('tipo', typeKey)
      .maybeSingle();
    if (error || !data || !data.state || !Array.isArray(data.state.sections)) return null;
    return JSON.parse(JSON.stringify(data.state));
  } catch (e) {
    return null;
  }
}

/**
 * No template, os elementos Data e Contagem regressiva passam a apontar para
 * a data e o horário do evento novo.
 * @param {any} state
 * @param {{ data?: string, hora?: string }} [quando]
 */
function ajustarDatasDoTemplate(state, quando) {
  if (!quando || !quando.data) return;
  (state.sections || []).forEach(sec => (sec.columns || []).forEach(col => (col.elements || []).forEach(el => {
    if (el.type === 'data' || el.type === 'contagem') {
      el.targetDate = quando.data;
      if (quando.hora) el.targetTime = quando.hora;
    }
  })));
}

// Modelos prontos (no código) para os tipos que ainda não têm template salvo
// no banco — mesma estrutura do modelo de casamento: capa com foto, abertura
// em Lora itálico, título vazio ("Insira um título"), "A realizar-se", Data
// com linhas, "Sobre…", Contagem regressiva, botões e "Com carinho,".
const MODELOS_DE_CONVITE = {
  baby_shower: {
    fundo: '#eef5f8', destaque: '#2f6f86', caixa: '#cfe6ee',
    abertura: 'Com muito amor e alegria,',
    convite: 'Convidamos você para o chá de bebê de',
    sobre: 'Sobre o chá'
  },
  gender_reveal: {
    fundo: '#f5f0f8', destaque: '#6f4d8f', caixa: '#e3d6ee',
    abertura: 'Menino ou menina?',
    convite: 'Venha descobrir com a gente no chá revelação de',
    sobre: 'Sobre o chá'
  },
  bridal_shower: {
    fundo: '#f9eff1', destaque: '#9a4d62', caixa: '#f0d6dd',
    abertura: 'Com muita alegria,',
    convite: 'Convidamos você para o chá de panela de',
    sobre: 'Sobre o chá'
  },
  anniversary: {
    fundo: '#f6f1e8', destaque: '#7a5b2c', caixa: '#e8dcc4',
    abertura: 'Celebrando uma história de amor,',
    convite: 'Convidamos você para comemorar as bodas de',
    sobre: 'Sobre a comemoração'
  }
};

/**
 * Convite inicial (no código) de um tipo de evento, ou null se o tipo não tem.
 * @param {string} typeKey
 * @returns {any|null}
 */
function modeloDeConviteEmCodigo(typeKey) {
  const m = MODELOS_DE_CONVITE[typeKey];
  if (!m) return null;
  const tmpl = EVENT_TYPE_BUILDER_TEMPLATES[typeKey] || EVENT_TYPE_BUILDER_TEMPLATES.wedding;
  const LORA = "'Lora', Georgia, serif";
  /** @param {string} tipo @param {object} props @param {object} [mobile] */
  const el = (tipo, props, mobile) => {
    const novo = Object.assign(createElement(tipo), props || {});
    if (mobile) novo.styles.mobile = Object.assign({}, novo.styles.mobile || {}, mobile);
    if (novo.styles && novo.styles.desktop) novo.styles.desktop.textAlign = 'center';
    return novo;
  };
  const tituloDeSecao = (texto) => el('titulo', { content: texto }, { fontSize: '20px', fontFamily: LORA, fontWeight: '400', lineHeight: '1' });

  const capa = createSection();
  capa.bgImage = tmpl.coverImage;

  const principal = createSection();
  principal.bg = m.fundo;
  principal.columns[0].elements = [
    el('texto', { content: m.abertura }, { fontSize: '15px', fontStyle: 'italic', fontFamily: LORA }),
    el('texto', { content: m.convite }, { fontSize: '15px', fontStyle: 'italic', fontFamily: LORA }),
    el('titulo', { content: '' }),
    el('texto', { content: 'A realizar-se' }, { color: m.destaque, fontSize: '17px', fontFamily: LORA }),
    el('data', { showLines: true, textColor: m.destaque, fontFamily: LORA }),
    tituloDeSecao(m.sobre),
    el('texto', { content: '' }),
    tituloDeSecao('Contagem Regressiva'),
    el('contagem', { label: '', showBox: true, textColor: m.destaque, boxBgColor: m.caixa, fontFamily: LORA })
  ];

  const botoes = defaultQuickNavSection();
  botoes.buttonBgColor = m.caixa;
  botoes.iconStyle = 'moderno';
  botoes.textColor = '#18181B';
  botoes.iconColor = '#18181B';

  const fim = createSection();
  fim.bg = m.fundo;
  fim.columns[0].elements = [
    el('titulo', { content: 'Com carinho,' }, { fontFamily: LORA }),
    el('texto', { content: '' })
  ];

  const state = defaultPageState();
  state.globalStyle.primaryColor = tmpl.primaryColor;
  state.sections = [capa, principal, botoes, fim];
  return state;
}

async function seedConviteDigitalForEvent(eventoId, typeKey, quando) {
  if (typeof supabaseClient === 'undefined') return;
  // Com template padrão do tipo (ex.: casamento), o evento já nasce com ele.
  // Sem template salvo no banco: modelo pronto do código (chás e bodas).
  let state = (await templatePadraoDoTipo(typeKey)) || modeloDeConviteEmCodigo(typeKey);
  if (state) {
    ajustarDatasDoTemplate(state, quando);
  } else {
    const tmpl = EVENT_TYPE_BUILDER_TEMPLATES[typeKey] || EVENT_TYPE_BUILDER_TEMPLATES.wedding;
    state = defaultPageState();
    state.globalStyle.primaryColor = tmpl.primaryColor;
    const firstSection = state.sections.find(s => !s.isQuickNav && !s.isGiftsBlock);
    if (firstSection) firstSection.bgImage = tmpl.coverImage;
  }
  const { error } = await supabaseClient
    .from('convite_digital_pages')
    .upsert({ evento_id: eventoId, page_key: 'convite', state }, { onConflict: 'evento_id,page_key' });
  if (error) console.error('Erro ao criar Convite Digital inicial:', error);
}
window.seedConviteDigitalForEvent = seedConviteDigitalForEvent;

// Busca o Convite Digital do evento ativo no Supabase. Se já existir lá,
// isso é a fonte de verdade (sobrescreve o cache local); se ainda não
// existir (ex.: evento criado antes desta integração), publica o estado
// local atual pra lá, pra passar a existir dali em diante.
async function syncBuilderStateFromSupabase(pageKey) {
  const eventId = getActiveEventUuid();
  if (!eventId || typeof supabaseClient === 'undefined') return;
  const { data: row, error } = await supabaseClient
    .from('convite_digital_pages')
    .select('state')
    .eq('evento_id', eventId)
    .eq('page_key', pageKey)
    .maybeSingle();
  if (error) { console.error('Erro ao buscar Convite Digital:', error); return; }

  if (row && row.state && Object.keys(row.state).length) {
    localStorage.setItem(pageStorageKey(pageKey), JSON.stringify(row.state));
    if (pageKey === currentPageKey) {
      builderState = row.state;
      if (pageKey === 'savethedate') normalizarSaveTheDate(builderState);
      else migrateQuickNavSection(builderState);
      tirarElementosDaCapa(builderState);
      migrateElementDefaults(builderState);
      historyStack = [snapshotState()];
      historyIndex = 0;
      selectedId = null;
      if (document.getElementById('builder-canvas')) {
        renderLeftPanel();
        renderCanvas();
        applyGlobalStyleVars();
      }
      // F5 em Informações/Anfitriões: a prévia foi desenhada antes de o
      // convite chegar do banco (sem a imagem) — redesenha com o convite real.
      const previa = document.getElementById('classic-builder-preview');
      if (previa && !previa.classList.contains('hidden')) {
        if (previa.dataset.previa === 'data') renderInformacoesPreview();
        else if (previa.dataset.previa === 'about') renderAnfitrioesPreview();
      }
    }
  } else {
    persistBuilderStateRemote(pageKey, loadPageState(pageKey));
  }
}

// Chamado por app.js assim que o anfitrião troca de evento no dropdown —
// recarrega o Convite Digital do evento recém-selecionado.
window.reloadBuilderStateForActiveEvent = function () {
  // Fica na página que estava aberta (ex.: Save the Date depois do F5).
  const guardada = paginaAbertaGuardada();
  currentPageKey = guardada && BUILDER_PAGE_LABELS[guardada] ? guardada : 'convite';
  builderState = loadPageState(currentPageKey);
  historyStack = [snapshotState()];
  historyIndex = 0;
  selectedId = null;
  updatePageSwitcherUI();
  atualizarBotoesDaPagina();
  if (document.getElementById('builder-canvas')) { renderLeftPanel(); renderCanvas(); applyGlobalStyleVars(); }
  syncBuilderStateFromSupabase(currentPageKey);
};

/* -------------------- Dropdown de páginas do site -------------------- */

// Página aberta no construtor (Convite Digital / Save the Date): guardada na
// aba do navegador para o F5 voltar nela, e não sempre no Convite Digital.
const CHAVE_PAGINA_ABERTA = 'love-aparencia-pagina';
function lembrarPaginaAberta(pageKey) {
  try { sessionStorage.setItem(CHAVE_PAGINA_ABERTA, pageKey); } catch (e) { /* sem armazenamento */ }
}
function paginaAbertaGuardada() {
  try { return sessionStorage.getItem(CHAVE_PAGINA_ABERTA) || ''; } catch (e) { return ''; }
}

function switchBuilderPage(pageKey) {
  if (pageKey === currentPageKey) return;
  persistBuilderState(true);
  currentPageKey = pageKey;
  lembrarPaginaAberta(pageKey);
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
  atualizarBotoesDaPagina();
  syncBuilderStateFromSupabase(pageKey);
}

// Convite Digital: Salvar + Publicar. Save the Date: Salvar + Compartilhar.
function atualizarBotoesDaPagina() {
  const ehSaveTheDate = currentPageKey === 'savethedate';
  const raiz = document.getElementById('site-builder-root');
  if (raiz) raiz.dataset.pagina = currentPageKey;
  document.getElementById('builder-publish')?.classList.toggle('hidden', ehSaveTheDate);
  document.getElementById('builder-preview-link')?.classList.toggle('hidden', ehSaveTheDate);
  document.getElementById('builder-share-wrap')?.classList.toggle('hidden', !ehSaveTheDate);
  document.getElementById('builder-share-menu')?.classList.add('hidden');
}

function updatePageSwitcherUI() {
  const label = document.getElementById('builder-page-select-label');
  if (label) label.textContent = BUILDER_PAGE_LABELS[currentPageKey] || 'Convite digital';
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

// Botões/links que levam para fora do construtor e ainda não passam pelo
// aviso do app.js (que já cobre sidebar e submenu): seletor de eventos,
// atalhos do topo, menu da conta e links do rodapé.
const SAIDAS_DO_CONSTRUTOR = [
  '.event-switcher-item',
  '#btn-dropdown-create-new-event',
  '#btn-dash-header-chat',
  '#btn-notifications-menu',
  '#dropdown-user-account [id^="btn-account-"]:not(#btn-account-preview-site)',
  '#dashboard-footer a',
  '.sidebar-icon-rail [data-rail-tab]',
  '#sidebar-sub-drawer .sub-drawer-item:not(.active)'
].join(', ');

let liberandoSaida = false;

/** O construtor está na tela (Aparência › Convite digital / Save the Date)? */
function construtorVisivel() {
  const raiz = document.getElementById('site-builder-root');
  return !!(raiz && raiz.offsetParent !== null);
}

function wireUnsavedChangesGuard() {
  window.addEventListener('beforeunload', (e) => {
    if (!hasUnsavedChanges) return;
    e.preventDefault();
    e.returnValue = '';
  });

  // Fase de captura: segura o clique antes do destino agir, pergunta se quer
  // salvar e, depois da resposta, repete o mesmo clique.
  document.addEventListener('click', (e) => {
    if (liberandoSaida || !hasUnsavedChanges || !construtorVisivel()) return;
    const alvo = e.target instanceof Element ? e.target.closest(SAIDAS_DO_CONSTRUTOR) : null;
    if (!alvo || !(alvo instanceof HTMLElement)) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    showUnsavedChangesModal(() => {
      liberandoSaida = true;
      try { alvo.click(); } finally { liberandoSaida = false; }
    });
  }, true);
}

/* -------------------- Histórico (undo/redo) -------------------- */

function snapshotState() { return JSON.stringify(builderState); }

function pushHistory() {
  if (suppressHistory) return;
  // Sem mudança desde o último passo (ex.: só saiu de um campo): não grava,
  // senão o Desfazer gastaria um passo "vazio" e parecia não fazer nada.
  const foto = snapshotState();
  if (historyStack[historyIndex] === foto) return;
  historyStack = historyStack.slice(0, historyIndex + 1);
  historyStack.push(foto);
  if (historyStack.length > 60) historyStack.shift();
  historyIndex = historyStack.length - 1;
  hasUnsavedChanges = true;
  updateHistoryButtons();
  // Guia de primeiros passos (plataforma): a primeira edição em Aparência
  // risca "Personalizar site do evento".
  if (currentPageKey === 'convite' && typeof window.markPlatformTaskAchieved === 'function') window.markPlatformTaskAchieved('website');
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
  // Mesmo histórico, botões de desfazer/refazer no cabeçalho de Informações/Anfitriões.
  const classicUndoBtn = document.getElementById('classic-editor-undo');
  const classicRedoBtn = document.getElementById('classic-editor-redo');
  if (classicUndoBtn) classicUndoBtn.disabled = historyIndex <= 0;
  if (classicRedoBtn) classicRedoBtn.disabled = historyIndex >= historyStack.length - 1;
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
    // Título e Texto nascem vazios: mostram "Insira um título" / "Insira um texto".
    case 'texto':
      return Object.assign(base, { content: '' });
    case 'titulo':
      base.styles.desktop.fontWeight = '700';
      // Altura da linha nasce em 1: o texto fica centrado e a sobra (para mais
      // ou para menos) se divide igual em cima e embaixo.
      base.styles.desktop.lineHeight = '1';
      return Object.assign(base, { content: '', level: 2 });
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
    case 'redes':
      return Object.assign(base, { profiles: [{ platform: 'instagram', url: 'https://instagram.com' }, { platform: 'whatsapp', url: 'https://wa.me/5511999999999' }], colorMode: 'custom', customColor: '', iconRadius: 50 });
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

// A primeira seção de conteúdo é a capa: só imagem — não recebe elementos.
function secaoDeCapa() {
  if (currentPageKey === 'savethedate') return null; // Save the Date: só texto, sem capa
  return builderState.sections.find(s => !s.isQuickNav && !s.isGiftsBlock) || null;
}

function colunaEhDaCapa(columnId) {
  const capa = secaoDeCapa();
  return !!(capa && capa.columns && capa.columns.some(c => c.id === columnId));
}

function insertElementAt(columnId, index, type) {
  const { column } = findColumnAndSection(columnId);
  if (!column) return null;
  const el = createElement(type);
  if (currentPageKey === 'savethedate') textoNoFormatoWhatsapp(el);
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
  lineHeight: 'line-height', fontStyle: 'font-style', textDecoration: 'text-decoration', textShadow: 'text-shadow', marginTop: 'margin-top',
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

/** @param {HTMLElement} raiz */
function ligarCaixasQueCrescem(raiz) {
  raiz.querySelectorAll('textarea').forEach(ta => {
    if (!(ta instanceof HTMLTextAreaElement)) return;
    ta.classList.add('builder-textarea-cresce');
    autoCrescer(ta);
    // Painel recém-montado pode ainda não ter largura: mede de novo no próximo quadro.
    requestAnimationFrame(() => autoCrescer(ta));
    ta.addEventListener('input', () => autoCrescer(ta));
  });
}

function renderLeftPanel() {
  const panel = document.getElementById('builder-elements-panel');
  if (!panel) return;

  // Save the Date: o painel é sempre o "Editar texto" (nada no canvas abre outro painel).
  const sel = currentPageKey === 'savethedate' ? null : findSelected();
  if (sel) {
    renderElementEditorPanel(panel, sel);
    ligarCaixasQueCrescem(panel);
    const canvas = document.getElementById('builder-canvas');
    if (canvas) initSortables(canvas);
    return;
  }

  // Sem a caixinha de rótulo no topo: no Convite digital o primeiro grupo já
  // se chama "Elementos"; no Save the Date fica só o texto "Editar texto".
  const ehSaveTheDate = currentPageKey === 'savethedate';
  panel.innerHTML = `<div class="builder-panel-tab-body" id="builder-panel-tab-body"></div>`;
  const corpo = document.getElementById('builder-panel-tab-body');
  if (ehSaveTheDate) {
    renderEditorDeTextoSaveTheDate(corpo);
    if (corpo) corpo.insertAdjacentHTML('afterbegin', '<div class="builder-el-group-title std-editar-texto-rotulo">Editar texto</div>');
  } else {
    renderElementosTab(corpo);
  }
  ligarCaixasQueCrescem(panel);

  const canvas = document.getElementById('builder-canvas');
  if (canvas) initSortables(canvas);
}

// Save the Date: só Título e Texto (vai como texto no WhatsApp).
const ELEMENT_GROUPS_SAVETHEDATE = [
  { title: 'Básicos', types: ['titulo', 'texto'] }
];

// Save the Date › Editar texto: uma caixa só com a mensagem e a barra de
// formatação do WhatsApp. Selecione o trecho (ou as linhas) e clique.
const STD_ICONES = {
  tachado: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 12h16"/><path d="M16.5 7.5c-.6-1.8-2.3-3-4.5-3-2.6 0-4.5 1.5-4.5 3.4 0 1.4.9 2.4 2.6 3.1M8 16.5c.6 1.8 2.3 3 4.5 3 2.6 0 4.5-1.5 4.5-3.4 0-.6-.1-1.1-.4-1.6"/></svg>',
  mono: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 6 3 12l5 6M16 6l5 6-5 6"/></svg>',
  codigo: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="6" width="18" height="12" rx="2"/><path d="m9 10-2 2 2 2M15 10l2 2-2 2"/></svg>',
  numerada: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 6h11M10 12h11M10 18h11M4 6h1v4M4 10h2M6 18H4c0-1 2-2 2-3s-1-1.5-2-1"/></svg>',
  marcadores: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M9 6h12M9 12h12M9 18h12"/><circle cx="4.5" cy="6" r="1" fill="currentColor"/><circle cx="4.5" cy="12" r="1" fill="currentColor"/><circle cx="4.5" cy="18" r="1" fill="currentColor"/></svg>',
  citacao: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M5 5v14"/><path d="M10 8h10M10 12h10M10 16h7"/></svg>',
  emoji: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M8.5 14.5a4 4 0 0 0 7 0"/><path d="M9 9.5h.01M15 9.5h.01"/></svg>'
};
// Emojis do Save the Date: só os de amor, festa, brinde, flores e carinhas felizes.
const STD_EMOJIS = ['❤️','🧡','💛','💚','💙','💜','🤍','💕','💞','💓','💗','💖','💘','💝','💌','🫶','😍','🥰','😘','😊','😄','😁','🤩','🥳','😇','🤗','🙌','👏','🙏','💍','💒','👰','🤵','💐','🌹','🌸','🌷','🌺','🌻','🌼','🕊️','🦋','✨','💫','⭐','🌟','🎉','🎊','🎈','🎁','🎀','🎂','🍰','🧁','🥂','🍾','🍷','🍸','🍹','🍻','🥃','☕','🍽️','🎵','🎶','🎤','💃','🕺','🪩','📸','📅','🗓️','📍','⏰','🏡','👶','🍼','🧸','💎','👑','🌈','☀️','🌙'];

const STD_FORMATOS = [
  { id: 'negrito', titulo: 'Negrito', marca: '*', icone: () => BI.bold },
  { id: 'italico', titulo: 'Itálico', marca: '_', icone: () => BI.italic },
  { id: 'tachado', titulo: 'Tachado', marca: '~', icone: () => STD_ICONES.tachado },
  { id: 'codigo', titulo: 'Código em linha', marca: '`', icone: () => STD_ICONES.codigo },
  { id: 'numerada', titulo: 'Lista numerada', linha: 'numerada', icone: () => STD_ICONES.numerada },
  { id: 'marcadores', titulo: 'Lista com marcadores', linha: '- ', icone: () => STD_ICONES.marcadores },
  { id: 'citacao', titulo: 'Citação', linha: '> ', icone: () => STD_ICONES.citacao }
];

// "Gerar com IA" do Save the Date: na verdade sorteia um texto pronto do tipo
// do evento (casamento, aniversário, bodas…). {DATA} vira a data em negrito e
// {CASAL:…} vira a assinatura entre colchetes ([Nome] & [Nome] ou [Nome]),
// para a pessoa completar — nunca o nome cadastrado.
const STD_TEXTOS_PRONTOS = {
  wedding: [
    "Olá! Tudo bem?\n\nCom muito carinho, queremos compartilhar com você uma notícia muito especial: vamos nos casar!\n\nGostaríamos imensamente de ter você ao nosso lado nesse momento inesquecível.\n\nPor isso, já queremos reservar a data na sua agenda para que possa se programar:\n\n{DATA}\n\nEm breve, enviaremos o convite oficial com todos os detalhes da cerimônia e da celebração.\n\nPor enquanto, pedimos uma confirmação prévia da sua presença, junto com o envio do seu nome completo (e acompanhantes, se houver) — essas informações são essenciais para o cadastro e envio do convite digital interativo.\n\nSerá uma alegria imensa ter você conosco.\n\nCom carinho,\n\n{CASAL:[Nome do Noivo(a)] & [Nome do Noivo(a)]}",
    "Olá!\n\nUm grande capítulo da nossa história está prestes a começar: vamos oficializar a nossa união!\n\nFaremos questão de celebrar esse passo com as pessoas que mais fazem parte da nossa trajetória.\n\nSalve essa data para estar com a gente:\n\n{DATA}\n\nTodos os detalhes sobre local, horários e programação completa serão enviados no convite oficial em breve.\n\nPara organizarmos a lista e liberarmos o acesso à página do nosso convite digital, solicitamos que nos envie uma resposta prévia confirmando o seu interesse e informando o seu nome completo.\n\nEsperamos você!\n\nAbraços,\n\n{CASAL:[Nome do Noivo(a)] & [Nome do Noivo(a)]}",
    "Oi! Tudo bem?\n\nTem notícia boa chegando por aqui: nós vamos casar! 🎉\n\nComo você é alguém fundamental na nossa caminhada, não dá para comemorar sem você.\n\nJá bloqueia a agenda para não marcar mais nada:\n\n{DATA}\n\nO convite oficial com tudo explicadinho chega em breve, mas já estamos montando a lista dos convidados. Se puder nos responder com o seu nome completo e uma prévia se conseguirá estar presente, já nos ajuda a liberar seu acesso à nossa página/convite digital.\n\nMal podemos esperar para brindar juntos!\n\nCom amor,\n\n{CASAL:[Nome do Noivo(a)] & [Nome do Noivo(a)]}"
  ],
  birthday: [
    "Olá!\n\nUma nova idade está chegando e a melhor forma de comemorar esse ciclo é reunindo quem faz a diferença na minha vida!\n\nGostaria muito de contar com a sua presença para celebrar meu aniversário.\n\nJá anota na agenda para garantir o dia:\n\n{DATA}\n\nLogo enviarei o convite completo com horário, local e todos os detalhes da festa.\n\nPara organizar a lista e liberar o seu acesso ao convite digital interativo, peço a gentileza de responder confirmando previamente se vai conseguir ir e informando seu nome completo.\n\nVai ser ótimo comemorar juntos!\n\nUm abraço,\n\n{CASAL:[Nome do Aniversariante]}",
    "Oi! Tudo bem?\n\nMais um ano de vida vem aí e eu não poderia deixar de comemorar ao lado de pessoas tão especiais.\n\nJá reserve a data para garantir que vai estar livre:\n\n{DATA}\n\nO convite oficial com o local e horários sairá em breve.\n\nPor enquanto, preciso apenas que me dê uma resposta rápida sobre sua presença e me confirme o seu nome completo para o cadastro na nossa lista de acesso e convite digital.\n\nConto com você!\n\nCom carinho,\n\n{CASAL:[Nome do Aniversariante]}",
    "Olá!\n\nMomentos especiais merecem grandes celebrações. Estou completando mais uma etapa muito importante e quero muito a sua companhia para brindar!\n\nSalve esta data no seu calendário:\n\n{DATA}\n\nEm breve você receberá todas as informações detalhadas no convite oficial.\n\nPara organizarmos os preparativos com carinho, envie-me o seu nome completo e uma confirmação preliminar de presença para cadastro no nosso convite digital.\n\nAté breve!\n\n{CASAL:[Nome do Aniversariante]}"
  ],
  anniversary: [
    "Olá!\n\nO amor se renova com o passar dos anos, e chegou o momento de celebrarmos nossas [Número] Bodas de [Material/Nome da Boda]!\n\nTer pessoas que acompanharam e apoiaram nossa trajetória conosco nesse marco é o nosso maior presente.\n\nPor isso, guarde esta data tão significativa:\n\n{DATA}\n\nEm breve enviaremos o convite oficial com todos os detalhes da renovação de votos e recepção.\n\nPedimos, por gentileza, uma confirmação prévia e o envio do seu nome completo para liberarmos o acesso ao nosso convite digital.\n\nCom imenso carinho,\n\n{CASAL:[Nome do Cônjuge 1] & [Nome do Cônjuge 2]}",
    "Olá!\n\nEstamos comemorando [Número] anos de união e queremos brindar a essa história de amor e companheirismo ao lado de pessoas muito queridas.\n\nGostaríamos muito que já guardasse a data na agenda:\n\n{DATA}\n\nAs orientações completas sobre o evento serão enviadas no convite digital definitivo em breve.\n\nPara a montagem do cadastro de convidados e envio dos links de acesso, responda por favor com seu nome completo e uma pré-confirmação de presença.\n\nUm grande abraço,\n\n{CASAL:[Nome do Cônjuge 1] & [Nome do Cônjuge 2]}",
    "Oi! Tudo bem?\n\nSão [Número] anos construindo uma vida a dois, superando desafios e acumulando sorrisos — motivos de sobra para festejar!\n\nFaça questão de reservar esse dia para celebrar conosco:\n\n{DATA}\n\nLogo você receberá o convite com a programação da nossa comemoração.\n\nEnquanto isso, confirme se poderemos contar com você e nos mande seu nome completo para integrarmos o seu cadastro ao nosso convite digital.\n\nCom muito afeto,\n\n{CASAL:[Nome do Cônjuge 1] & [Nome do Cônjuge 2]}"
  ],
  baby_shower: [
    "Olá!\n\nO nosso maior presente está a caminho e nosso coração transborda de alegria!\n\nQueremos muito a sua presença no Chá de Bebê do(a) [Nome do Bebê], para celebrarmos essa nova fase com todo carinho.\n\nJá reserve esse dia especial na agenda:\n\n{DATA}\n\nO convite completo com horários, local e a listinha de mimos será enviado muito em breve.\n\nPor gentileza, nos envie seu nome completo e uma confirmação preliminar de presença para cadastrarmos você no nosso convite digital e organizarmos tudo com carinho.\n\nCom muito amor,\n\n{CASAL:[Nome dos Pais]}",
    "Oi! Tudo bem?\n\nA família está crescendo e a contagem regressiva para a chegada do(a) [Nome do Bebê] já começou! 🍼\n\nEstamos preparando um Chá de Bebê muito aconchegante e queremos muito você com a gente.\n\nJá deixa essa data reservada:\n\n{DATA}\n\nTodos os detalhes sobre o evento e as sugestões de presentes serão compartilhados no convite oficial.\n\nPara adiantar a lista de convidados e liberar o link da página do evento, envie seu nome completo e nos dê uma prévia se poderá estar presente.\n\nEsperamos por você!\n\n{CASAL:[Nome dos Pais]}",
    "Olá!\n\nUm momento tão transformador só fica completo perto de quem queremos bem. O Chá de Bebê do(a) [Nome do Bebê] já tem data marcada!\n\nGuarde esse dia para celebrarmos juntos:\n\n{DATA}\n\nLogo mais você receberá o convite digital com o endereço e a lista de sugestões.\n\nPara organizar o espaço com conforto, me mande por favor uma prévia de confirmação e seu nome completo.\n\nUm abraço carinhoso,\n\n{CASAL:[Nome da Mãe / Pais]}"
  ],
  gender_reveal: [
    "Oi! Tudo bem?\n\nChegou a hora de matar a maior curiosidade das nossas vidas: vem aí um menininho ou uma menininha? 👶💙💖\n\nQueremos que você venha palpitar e viver essa emoção com a gente no nosso Chá Revelação!\n\nJá bloqueie a data no calendário:\n\n{DATA}\n\nO convite oficial com o horário e instruções sobre a brincadeira chega em breve.\n\nPor enquanto, responda se vai conseguir estar presente e envie seu nome completo para cadastrarmos na plataforma do convite digital.\n\nQual é o seu palpite?\n\n{CASAL:[Nome dos Pais]}",
    "Olá!\n\nO amor que sentimos já é infinito, mas estamos ansiosos para finalmente descobrir quem está a caminho!\n\nFaremos nosso Chá Revelação e a sua presença tornará essa descoberta ainda mais inesquecível.\n\nAnote a data para estarmos juntos:\n\n{DATA}\n\nEm breve enviaremos o convite oficial com todos os detalhes e orientações do dia.\n\nPedimos que nos envie uma pré-confirmação de presença junto com o seu nome completo para inclusão no convite digital interativo.\n\nUm abraço cheio de expectativa,\n\n{CASAL:[Nome dos Pais]}",
    "Olá!\n\nMenino ou menina? O grande segredo vai ser revelado e você faz parte desse momento especial!\n\nReserve essa data na sua agenda:\n\n{DATA}\n\nTodos os detalhes da comemoração e do convite interativo serão enviados logo mais.\n\nPara organizarmos o acesso e prepararmos tudo direitinho, envie por favor seu nome completo e avise se poderemos contar com a sua presença.\n\nAté breve!\n\n{CASAL:[Nome dos Pais]}"
  ],
  bridal_shower: [
    "Oi! Tudo bem?\n\nO casamento está chegando e a nossa casinha já está quase pronta, mas ainda falta o melhor: comemorar o nosso Chá de Panela! 🍳🥂\n\nQueremos reunir os amigos mais próximos para dar muitas risadas antes do grande dia.\n\nJá salva a data na agenda:\n\n{DATA}\n\nEm breve mandaremos o convite com o local e a lista de presentes/utensílios.\n\nPara organizarmos o espaço e gerarmos o acesso ao seu convite digital, envie seu nome completo e uma pré-confirmação se vai conseguir ir.\n\nContamos com você!\n\n{CASAL:[Nome do Noivo(a)] & [Nome do Noivo(a)]}",
    "Olá!\n\nEstamos dando os retoques finais para começar a nossa vida a dois e o Chá de Panela é um momento muito aguardado por nós!\n\nVai ser uma delícia reunir as pessoas queridas para confraternizar e equipar o nosso novo lar.\n\nAnote na sua agenda:\n\n{DATA}\n\nO convite oficial com detalhes de horário, endereço e lista de sugestões será enviado muito em breve.\n\nPara facilitar nossa lista, mande por favor seu nome completo e a confirmação de que estará conosco.\n\nCom muito carinho,\n\n{CASAL:[Nome do Noivo(a)] & [Nome do Noivo(a)]}",
    "Olá!\n\nAntes do \"sim\" no altar, vem a farra do Chá de Panela! Queremos você pertinho da gente para celebrar essa contagem regressiva.\n\nMarque esse dia no calendário:\n\n{DATA}\n\nLogo mais encaminhamos o convite completo com todos os detalhes e lista de utilidades.\n\nPor gentileza, nos responda com seu nome completo e confirme previamente sua presença para cadastro na nossa lista digital.\n\nAbraços,\n\n{CASAL:[Nome do Noivo(a)] & [Nome do Noivo(a)]}"
  ]
};

function textoProntoDoSaveTheDate(anterior) {
  const ev = getActiveEventForBuilder() || {};
  const lista = STD_TEXTOS_PRONTOS[ev.type] || STD_TEXTOS_PRONTOS.birthday;
  const data = dataDoEventoPorExtenso(ev) || '[Data do Evento]';
  // Assinatura sempre com o espaço entre colchetes (nunca o nome cadastrado):
  // casal = "[Nome] & [Nome]"; aniversário = um nome só, "[Nome]".
  const assinatura = (padrao) => {
    if (['wedding', 'bridal_shower', 'anniversary'].includes(ev.type)) return '[Nome] & [Nome]';
    if (!ev.type || ev.type === 'birthday' || !STD_TEXTOS_PRONTOS[ev.type]) return '[Nome]';
    return padrao;
  };
  const montar = (modelo) => modelo
    .replace('{DATA}', `*${data}*`)
    .replace(/\{CASAL:([^}]*)\}/g, (m, padrao) => assinatura(padrao));
  const opcoes = lista.map(montar).filter(t => t !== anterior);
  return opcoes[Math.floor(Math.random() * opcoes.length)] || montar(lista[0]);
}

const ICONE_IA = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M15 4.5l1.35 4.4a2.6 2.6 0 0 0 1.75 1.75L22.5 12l-4.4 1.35a2.6 2.6 0 0 0-1.75 1.75L15 19.5l-1.35-4.4a2.6 2.6 0 0 0-1.75-1.75L7.5 12l4.4-1.35a2.6 2.6 0 0 0 1.75-1.75Z"/><path d="M6.5 2.5l.65 1.85 1.85.65-1.85.65L6.5 7.5l-.65-1.85L4 5l1.85-.65Z"/><path d="M5 15.5l.65 1.85 1.85.65-1.85.65L5 20.5l-.65-1.85L2.5 18l1.85-.65Z"/></svg>';

function renderEditorDeTextoSaveTheDate(body) {
  body.innerHTML = `
    <div class="std-editor">
      <div class="std-editor-barra" role="toolbar" aria-label="Formatação do WhatsApp">
        ${STD_FORMATOS.map(f => `<button type="button" class="std-editor-negrito" data-std-formato="${f.id}" title="${f.titulo}" aria-label="${f.titulo}">${f.icone()}</button>`).join('')}
        <button type="button" class="std-editor-negrito" data-std-emoji title="Emojis" aria-label="Emojis" aria-expanded="false">${STD_ICONES.emoji}</button>
      </div>
      <div class="std-emojis hidden" id="std-emojis" role="listbox" aria-label="Emojis">
        ${STD_EMOJIS.map(e => `<button type="button" class="std-emoji" data-emoji="${e}">${e}</button>`).join('')}
      </div>
      <textarea class="inspector-textarea std-texto-grande std-editor-texto" id="std-editor-texto" rows="14" placeholder="Escreva o Save the Date…">${escapeHtml(builderState.mensagem || '')}</textarea>
      <div class="std-editor-ia">
        <button type="button" class="std-gerar-ia" data-std-gerar-ia>${ICONE_IA}<span>Gerar com IA</span></button>
      </div>
    </div>`;
  const campo = /** @type {HTMLTextAreaElement} */ (body.querySelector('#std-editor-texto'));
  let historicoTimer = null;
  const aplicar = () => {
    builderState.mensagem = campo.value;
    normalizarSaveTheDate(builderState);
    hasUnsavedChanges = true;
    renderCanvasOnly();
    clearTimeout(historicoTimer);
    historicoTimer = setTimeout(pushHistory, 600);
  };
  campo.addEventListener('input', aplicar);

  // Marca em volta do trecho (negrito, itálico…): liga/desliga, linha a linha.
  // Liga/desliga: se o trecho (ou cada linha dele) já tem a marca, tira;
  // senão, põe uma vez só — nunca empilha marcas repetidas.
  const alternarMarca = (marca) => {
    let ini = campo.selectionStart, fim = campo.selectionEnd;
    const v = campo.value, n = marca.length;
    if (ini === fim) return;
    // Marca logo fora da seleção (selecionou só o texto de dentro): conta junto.
    if (v.slice(ini - n, ini) === marca && v.slice(fim, fim + n) === marca) { ini -= n; fim += n; }
    const linhas = v.slice(ini, fim).split('\n');
    const temMarca = (l) => { const t = l.trim(); return t.length > 2 * n && t.startsWith(marca) && t.endsWith(marca); };
    const semMarca = (l) => {
      const ant = l.match(/^\s*/)[0], dep = l.match(/\s*$/)[0];
      let meio = l.trim();
      while (meio.length > 2 * n && meio.startsWith(marca) && meio.endsWith(marca)) meio = meio.slice(n, -n);
      return { ant, meio, dep };
    };
    const comTexto = linhas.filter(l => l.trim());
    const tirar = comTexto.length > 0 && comTexto.every(temMarca);
    // O WhatsApp não junta a marca entre linhas: vale linha a linha.
    const novo = linhas.map(l => {
      if (!l.trim()) return l;
      const { ant, meio, dep } = semMarca(l);
      return tirar ? ant + meio + dep : `${ant}${marca}${meio}${marca}${dep}`;
    }).join('\n');
    campo.value = v.slice(0, ini) + novo + v.slice(fim);
    campo.setSelectionRange(ini, ini + novo.length);
  };

  // Começo de linha (listas, citação): nas linhas selecionadas ou na do cursor.
  const alternarLinhas = (tipo) => {
    const v = campo.value;
    const ini = v.lastIndexOf('\n', campo.selectionStart - 1) + 1;
    let fim = v.indexOf('\n', Math.max(campo.selectionEnd - (campo.selectionEnd > campo.selectionStart ? 1 : 0), campo.selectionStart));
    if (fim < 0) fim = v.length;
    const linhas = v.slice(ini, fim).split('\n');
    const prefixo = (l) => (tipo === 'numerada' ? /^\d+\. / : new RegExp('^' + tipo.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))).exec(l);
    const todas = linhas.filter(l => l.trim()).every(l => prefixo(l));
    let n = 0;
    const novas = linhas.map(l => {
      if (!l.trim()) return l;
      const p = prefixo(l);
      const limpa = p ? l.slice(p[0].length) : l.replace(/^(\d+\. |[-*] |> )/, '');
      if (todas) return limpa;
      n += 1;
      return (tipo === 'numerada' ? `${n}. ` : tipo) + limpa;
    });
    const novo = novas.join('\n');
    campo.value = v.slice(0, ini) + novo + v.slice(fim);
    campo.setSelectionRange(ini, ini + novo.length);
  };

  // Emojis: abre o painel; clicar num emoji coloca onde está o cursor.
  const botaoEmoji = /** @type {HTMLButtonElement} */ (body.querySelector('[data-std-emoji]'));
  const painelEmojis = /** @type {HTMLElement} */ (body.querySelector('#std-emojis'));
  botaoEmoji.addEventListener('mousedown', (e) => e.preventDefault());
  botaoEmoji.addEventListener('click', () => {
    const abrir = painelEmojis.classList.contains('hidden');
    painelEmojis.classList.toggle('hidden', !abrir);
    botaoEmoji.setAttribute('aria-expanded', String(abrir));
    botaoEmoji.classList.toggle('is-ativo', abrir);
  });
  // Fecha ao clicar fora ou com Esc.
  const fecharEmojis = () => { painelEmojis.classList.add('hidden'); botaoEmoji.setAttribute('aria-expanded', 'false'); botaoEmoji.classList.remove('is-ativo'); };
  document.addEventListener('mousedown', (e) => { if (!painelEmojis.contains(/** @type {Node} */ (e.target)) && e.target !== botaoEmoji && !botaoEmoji.contains(/** @type {Node} */ (e.target))) fecharEmojis(); });
  campo.addEventListener('keydown', (e) => { if (e.key === 'Escape') fecharEmojis(); });
  painelEmojis.querySelectorAll('[data-emoji]').forEach(b => {
    b.addEventListener('mousedown', (e) => e.preventDefault()); // mantém o cursor na caixa
    b.addEventListener('click', () => {
      const emoji = b.dataset.emoji || '';
      const ini = campo.selectionStart, fim = campo.selectionEnd;
      campo.value = campo.value.slice(0, ini) + emoji + campo.value.slice(fim);
      campo.setSelectionRange(ini + emoji.length, ini + emoji.length);
      campo.focus();
      aplicar();
    });
  });

  // "Gerar com IA": "pensa" um instante e escreve o texto aos poucos.
  const botaoIa = /** @type {HTMLButtonElement} */ (body.querySelector('[data-std-gerar-ia]'));
  botaoIa.addEventListener('click', () => {
    if (botaoIa.disabled) return;
    const texto = textoProntoDoSaveTheDate(campo.value.trim());
    const rotulo = botaoIa.querySelector('span');
    botaoIa.disabled = true;
    botaoIa.classList.add('is-gerando');
    rotulo.textContent = 'Gerando…';
    setTimeout(() => {
      let i = 0;
      const passo = Math.max(6, Math.ceil(texto.length / 60));
      const escrever = () => {
        i = Math.min(texto.length, i + passo);
        campo.value = texto.slice(0, i);
        campo.scrollTop = campo.scrollHeight;
        builderState.mensagem = campo.value;
        normalizarSaveTheDate(builderState);
        renderCanvasOnly();
        if (i < texto.length) { setTimeout(escrever, 16); return; }
        botaoIa.disabled = false;
        botaoIa.classList.remove('is-gerando');
        rotulo.textContent = 'Gerar com IA';
        campo.scrollTop = 0;
        aplicar();
      };
      escrever();
    }, 900);
  });

  body.querySelectorAll('[data-std-formato]').forEach(btn => {
    btn.addEventListener('mousedown', (e) => e.preventDefault()); // mantém a seleção
    btn.addEventListener('click', () => {
      const formato = STD_FORMATOS.find(f => f.id === btn.dataset.stdFormato);
      if (!formato) return;
      if (formato.marca) alternarMarca(formato.marca);
      else alternarLinhas(formato.linha);
      campo.focus();
      aplicar();
    });
  });
}

function renderElementosTab(body) {
  const grupos = currentPageKey === 'savethedate' ? ELEMENT_GROUPS_SAVETHEDATE : ELEMENT_GROUPS;
  body.innerHTML = grupos.map(group => `
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
  const isTextLike = sel.kind === 'element' && (sel.obj.type === 'titulo' || sel.obj.type === 'texto');
  const textoDoSaveTheDate = isTextLike && currentPageKey === 'savethedate';
  const showTabs = sel.kind === 'element' && !textoDoSaveTheDate;
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
  else if (textoDoSaveTheDate) { renderTextoSaveTheDateInspector(sel.obj, body); }
  else { renderElementInspector(sel.obj, body); }
  wireColorSwatchPopovers(body);
}

/* Áreas "Solte aqui para criar uma seção nova" (logo acima e logo abaixo da
   seção de botões). Só aparecem com o cursor EM CIMA da seção de botões —
   metade de cima = área de cima; metade de baixo = área de baixo — ou em cima
   da própria área. Arrastar sobre um título/texto de uma seção nunca abre a
   área: ali o elemento entra na seção, como esperado. */
function atualizarAreaNovaSecaoPerto(y) {
  const canvas = document.getElementById('builder-canvas');
  if (!canvas || !canvas.classList.contains('is-arrastando-elemento')) return;
  const zonas = Array.from(canvas.querySelectorAll('[data-new-section-dropzone]'));
  const dentro = el => { const r = el.getBoundingClientRect(); return r.height > 0 && y >= r.top && y <= r.bottom; };
  let ativa = zonas.find(z => z.classList.contains('is-perto') && dentro(z)) || null;
  if (!ativa) {
    const botoes = canvas.querySelector('.builder-section.builder-quicknav-section, .builder-quicknav-section');
    if (botoes && dentro(botoes)) {
      const r = botoes.getBoundingClientRect();
      const posicao = y < r.top + r.height / 2 ? 'antes' : 'depois';
      ativa = zonas.find(z => z.dataset.posicao === posicao) || null;
    }
  }
  zonas.forEach(z => z.classList.toggle('is-perto', z === ativa));
}
// Fim do arraste: some a marca "arrastando" (e as áreas). O onEnd do Sortable
// nem sempre chega — soltar redesenha o canvas e recria os Sortables no meio.
function encerrarArrasteDeElemento() {
  const canvas = document.getElementById('builder-canvas');
  if (!canvas) return;
  canvas.classList.remove('is-arrastando-elemento');
  canvas.querySelectorAll('[data-new-section-dropzone].is-perto').forEach(z => z.classList.remove('is-perto'));
}
document.addEventListener('dragover', (e) => atualizarAreaNovaSecaoPerto(e.clientY));
// Mouse andando sem botão apertado = não está arrastando nada.
document.addEventListener('mousemove', (e) => {
  if (e.buttons === 0) { encerrarArrasteDeElemento(); return; }
  atualizarAreaNovaSecaoPerto(e.clientY);
});
['dragend', 'drop', 'mouseup', 'pointerup'].forEach(evento => {
  document.addEventListener(evento, () => setTimeout(encerrarArrasteDeElemento, 0), true);
});

/* -------------------- Render: canvas -------------------- */

function renderCanvas() {
  const canvas = document.getElementById('builder-canvas');
  if (!canvas) return;
  canvas.dataset.device = currentDevice;
  const frame = document.getElementById('builder-canvas-frame');
  if (frame) frame.dataset.device = currentDevice;

  const visible = builderState.sections.filter(s => !s.hidden);
  // Logo acima e logo abaixo da seção de botões: áreas para soltar um
  // elemento e criar uma seção nova com ele ali (aparecem só com o cursor
  // sobre os botões durante o arraste).
  const novaSecaoDropzoneHtml = (posicao) => `
    <div class="builder-new-section-dropzone" data-new-section-dropzone data-posicao="${posicao}">
      <span>Solte aqui para criar uma seção nova</span>
    </div>`;
  const sectionsHtml = visible.map(section => section.isQuickNav
    ? novaSecaoDropzoneHtml('antes') + renderAnySectionHtml(section, 'edit', currentDevice) + novaSecaoDropzoneHtml('depois')
    : renderAnySectionHtml(section, 'edit', currentDevice)
  ).join('');
  // Fim do convite (abaixo dos botões): soltar qualquer elemento aqui cria uma
  // seção nova com ele. Invisível até começar a arrastar.
  const endDropzoneHtml = `
    <div class="builder-canvas-end-dropzone" id="builder-canvas-end-dropzone">
      <span>Solte aqui para criar uma seção nova</span>
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
  let sections = (builderState && builderState.sections) || [];
  // Seção do convite desenhada com outra página aberta (prévia de Informações).
  if (!sections.some(s => s.id === section.id)) sections = ((estadoDoConvite() || {}).sections) || [];
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
  const sectionBg = section.bg || resolveAdjacentSectionBg(section);
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
          const modernSvg = QUICKNAV_MODERN_ICON_MAP[btn.id] || BI.plusCircle;
          const corModerna = corMaisEscura(buttonBg) || iconColor;
          iconHtml = `<span class="builder-quicknav-icon-modern" style="color:${corModerna};">${modernSvg}</span>`;
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
  // A primeira seção "de conteúdo" (ignorando blocos fixos como botões/presentes)
  // é a capa do convite: mostra um botão dedicado de Adicionar/Alterar imagem de
  // fundo, sem depender de arrastar um elemento pra dentro da coluna.
  const isFirstContentSection = mode === 'edit' && currentPageKey !== 'savethedate' && builderState.sections.find(s => !s.isQuickNav && !s.isGiftsBlock) === section;
  const bgImages = section.bgImage ? [section.bgImage, ...(section.bgImages || [])].filter(Boolean).slice(0, 3) : [];
  const bgFitStyle = bgImageFitStyle(section.bgFit);
  const bgImageDiv = bgImages.length
    ? `<div class="builder-section-bg-image" style="background-image:url('${bgImages[0]}');${bgFitStyle}"></div>`
    : '';
  const overlayDiv = (section.bgImage && section.overlayColor)
    ? `<div class="builder-section-overlay" style="background-color:${section.overlayColor};opacity:${section.overlayOpacity !== undefined ? section.overlayOpacity : 1};"></div>`
    : '';
  // fadeColor '' = cor removida no inspetor: sem degradê. Sem valor = branco (padrão antigo).
  const fadeColor = section.fadeColor === '' ? '' : (section.fadeColor || '#ffffff');
  const fadeTopDiv = (section.bgImage && fadeColor && section.fadePosition === 'top')
    ? `<div class="builder-section-fade builder-section-fade-top" style="background:linear-gradient(to bottom, ${fadeColor} 0%, ${fadeColor} 35%, ${fadeColor}00 100%);"></div>`
    : '';
  const fadeBottomDiv = (section.bgImage && fadeColor && section.fadePosition === 'bottom')
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
  const coverImageBtn = isFirstContentSection ? `
      <button type="button" class="builder-first-section-cover-btn" data-first-section-cover-btn title="${section.bgImage ? 'Alterar imagem' : 'Adicionar imagem'}">
        ${BI.image}
        <span>${section.bgImage ? 'Alterar imagem' : 'Adicionar imagem'}</span>
      </button>` : '';
  return `
    <section class="builder-section${isFirstContentSection ? ' is-first-content-section' : ''}${isFirstContentSection && section.bgImage ? ' has-cover-image' : ''}" id="${section.id}" data-section-id="${section.id}" style="${section.bg ? `background-color:${section.bg};` : ''}">
      ${bgImageDiv}
      ${overlayDiv}
      ${fadeTopDiv}
      ${fadeBottomDiv}
      ${toolbar}
      ${coverImageBtn}
      ${columnsRowHtml}
    </section>
  `;
}

function renderColumnHtml(column, owner, index, mode, device) {
  mode = mode || 'edit';
  device = device || currentDevice;
  const visibleElements = column.elements.filter(el => mode === 'edit' || !isHiddenOnDevice(el, device));
  // A primeira seção "de conteúdo" já tem seu próprio botão de Adicionar/Alterar
  // imagem (renderizado na seção) — a coluna vazia não mostra nada sobreposto
  // (nem texto, nem ícone), só reserva o mesmo espaço de uma seção vazia normal.
  const firstContentSection = builderState.sections.find(s => !s.isQuickNav && !s.isGiftsBlock);
  const isFirstSection = firstContentSection === owner;
  const emptyPlaceholder = isFirstSection
    ? ''
    : `${BI.layers}<span>Arraste um elemento aqui para começar.</span>`;
  const emptyClass = mode === 'edit' && !column.elements.length
    ? `is-empty is-empty-section${isFirstSection ? ' is-empty-first-section is-empty-has-bg' : ''}`
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
      // Coluna sem nenhum elemento: não há nada útil pra mostrar no inspetor
      // de coluna — abre direto os ajustes da seção (cor, imagem de fundo etc).
      const isEmptyColumn = col.querySelector('.builder-elements-list')?.classList.contains('is-empty');
      if (isEmptyColumn) {
        const sectionId = col.closest('.builder-section')?.dataset.sectionId;
        if (sectionId) { selectElement(sectionId, 'section'); return; }
      }
      selectElement(col.dataset.columnId, 'column');
    });
  });

  canvas.querySelectorAll('[data-first-section-cover-btn]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const sectionId = btn.closest('.builder-section')?.dataset.sectionId;
      const section = builderState.sections.find(s => s.id === sectionId);
      if (!section) return;
      let fileInput = document.getElementById('builder-first-section-cover-file-input');
      if (!fileInput) {
        fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = 'image/*';
        fileInput.id = 'builder-first-section-cover-file-input';
        fileInput.className = 'hidden';
        document.body.appendChild(fileInput);
      }
      fileInput.onchange = (ev) => {
        const file = ev.target.files && ev.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev2) => {
          section.bgImage = ev2.target.result;
          pushHistory();
          renderCanvas();
          renderLeftPanel();
        };
        reader.readAsDataURL(file);
        fileInput.value = '';
      };
      fileInput.click();
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
      // A capa (só imagem) não aceita elementos: nem aparece como lugar de soltar.
      group: { name: 'builder-elements', pull: true, put: colunaEhDaCapa(list.dataset.columnId) ? false : (to, from, dragEl) => dragEl.dataset.elType !== 'secao' },
      ghostClass: 'sortable-ghost',
      dragClass: 'sortable-drag',
      emptyInsertThreshold: 24,
      onStart: () => { const c = document.getElementById('builder-canvas'); if (c) c.classList.add('is-arrastando-elemento'); },
      onEnd: () => { const c = document.getElementById('builder-canvas'); if (c) c.classList.remove('is-arrastando-elemento'); },
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

  canvas.querySelectorAll('[data-new-section-dropzone]').forEach(novaSecaoDropzone => {
    sortableInstances.push(new Sortable(novaSecaoDropzone, {
      group: { name: 'builder-elements', pull: false, put: true },
      sort: false,
      animation: 160,
      ghostClass: 'sortable-ghost',
      onAdd: (evt) => {
        // Entra logo antes ou logo depois da seção de botões.
        const botoes = builderState.sections.find(s => s.isQuickNav);
        const nova = createSection();
        const idxBotoes = botoes ? builderState.sections.indexOf(botoes) : builderState.sections.length - 1;
        builderState.sections.splice(novaSecaoDropzone.dataset.posicao === 'antes' ? idxBotoes : idxBotoes + 1, 0, nova);
        let selecionar = { id: nova.id, kind: 'section' };
        if (evt.item.classList.contains('builder-el-item')) {
          const type = evt.item.dataset.elType;
          evt.item.remove();
          if (type && type !== 'secao') {
            const el = insertElementAt(nova.columns[0].id, 0, type);
            if (el) selecionar = { id: el.id, kind: 'element' };
          }
        } else if (evt.item.dataset.elementId) {
          // Elemento que já estava no convite: sai de onde estava e vai para a seção nova.
          const loc = findElementLocation(evt.item.dataset.elementId);
          evt.item.remove();
          if (loc) {
            loc.column.elements.splice(loc.index, 1);
            nova.columns[0].elements.push(loc.element);
            selecionar = { id: loc.element.id, kind: 'element' };
          }
        }
        pushHistory();
        renderCanvas();
        selectElement(selecionar.id, selecionar.kind);
      }
    }));
  });
  // Enquanto um elemento é arrastado, o canvas mostra a área "nova seção".
  const marcarArrastando = (ativo) => {
    const c = document.getElementById('builder-canvas');
    if (c) c.classList.toggle('is-arrastando-elemento', ativo);
  };

  const endDropzone = canvas.querySelector('#builder-canvas-end-dropzone');
  if (endDropzone) {
    sortableInstances.push(new Sortable(endDropzone, {
      group: { name: 'builder-elements', pull: false, put: true },
      sort: false,
      animation: 160,
      ghostClass: 'sortable-ghost',
      onAdd: (evt) => {
        const newSection = createSection();
        builderState.sections.push(newSection);
        let selecionar = { id: newSection.id, kind: 'section' };
        if (evt.item.classList.contains('builder-el-item')) {
          // Elemento da lista (Título, Texto…): entra na seção nova.
          const type = evt.item.dataset.elType;
          evt.item.remove();
          if (type && type !== 'secao') {
            const el = insertElementAt(newSection.columns[0].id, 0, type);
            if (el) selecionar = { id: el.id, kind: 'element' };
          }
        } else if (evt.item.dataset.elementId) {
          // Elemento que já estava no convite: sai de onde estava e vai para a seção nova.
          const loc = findElementLocation(evt.item.dataset.elementId);
          evt.item.remove();
          if (loc) {
            loc.column.elements.splice(loc.index, 1);
            newSection.columns[0].elements.push(loc.element);
            selecionar = { id: loc.element.id, kind: 'element' };
          }
        } else {
          evt.item.remove();
        }
        pushHistory();
        renderCanvas();
        selectElement(selecionar.id, selecionar.kind);
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
        ghostClass: 'sortable-chosen',
        onStart: () => marcarArrastando(true),
        onEnd: () => marcarArrastando(false)
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
      return `<div class="be-text" style="${style}" ${editable}${edit ? ' data-placeholder="Insira um texto"' : ''}>${el.content || (edit ? '' : '<span class="be-vazio-publico">Insira um texto</span>')}</div>`;

    case 'titulo': {
      const level = el.level || 2;
      return `<h${level} class="be-heading" style="${style}" ${editable}${edit ? ' data-placeholder="Insira um título"' : ''}>${el.content || (edit ? '' : '<span class="be-vazio-publico">Insira um título</span>')}</h${level}>`;
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

    case 'redes': {
      const socialAlign = styleValue(el, 'textAlign', device);
      const justify = socialAlign === 'left' ? 'flex-start' : socialAlign === 'right' ? 'flex-end' : 'center';
      return `<div class="be-social" style="${style}justify-content:${justify};">${(el.profiles || []).map(p => {
        const platform = SOCIAL_PLATFORMS[p.platform];
        if (!platform) return '';
        const bg = el.colorMode === 'original' ? (SOCIAL_PLATFORM_COLORS[p.platform] || '#18181B') : (el.customColor || '#18181B');
        const iconRadius = el.iconRadius != null ? el.iconRadius : 50;
        return `<a href="${escapeHtml(p.url || '#')}" target="_blank" rel="noopener" ${linkGuard} title="${platform.label}" style="background-color:${bg};border-radius:${iconRadius}%;">${platform.svg}</a>`;
      }).join('')}</div>`;
    }

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
      const comCaixa = el.showBox !== false;
      const boxAttr = comCaixa && el.boxBgColor ? ` style="background-color:${el.boxBgColor} !important;"` : '';
      const scale = (el.sizeScale !== undefined && el.sizeScale !== '' ? el.sizeScale : 100) / 100;
      const scaleStyle = scale !== 1 ? `transform:scale(${scale});transform-origin:center;` : '';
      const unitHtml = (dataAttr, unitLabel) => `
        <div class="be-countdown-unit${comCaixa ? '' : ' be-countdown-unit-sem-caixa'}"${boxAttr}>
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
        el.fontFamily && el.fontFamily.includes('Jost') ? `letter-spacing:${JOST_TRACKING} !important;` : '',
        el.textColor ? `color:${el.textColor} !important;` : ''
      ].filter(Boolean).join('');
      const textAttr = textInline ? ` style="${textInline}"` : '';
      const lineStyle = el.textColor ? ` style="background-color:${el.textColor};"` : '';
      const topRule = el.showLines ? `<span class="be-date-display-rule"${lineStyle}></span>` : '';
      const line = `<span class="be-date-display-line"${lineStyle}></span>`;
      const timeText = formatted.time
        ? `<span class="be-date-display-time-text">${formatted.time}</span>`
        : `<span class="be-date-display-time-text be-date-display-empty">Dia da semana</span>`;
      const timeBlock = timeText
        ? (el.showLines
          ? `<div class="be-date-display-time-row"${textAttr}>${line}${timeText}${line}</div>`
          : `<p class="be-date-display-time"${textAttr}>${formatted.time || 'Dia da semana'}</p>`)
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

// Ícones da prévia "celular" do Save the Date (barra do WhatsApp).
const STD_CELULAR = {
  sinal: '<svg viewBox="0 0 18 12" fill="currentColor"><rect x="0" y="8" width="3" height="4" rx="1"/><rect x="5" y="5.5" width="3" height="6.5" rx="1"/><rect x="10" y="3" width="3" height="9" rx="1"/><rect x="15" y="0" width="3" height="12" rx="1"/></svg>',
  wifi: '<svg viewBox="0 0 16 12" fill="currentColor"><path d="M8 2.2c2.4 0 4.6.9 6.2 2.5l1.3-1.3A10.5 10.5 0 0 0 8 .3 10.5 10.5 0 0 0 .5 3.4l1.3 1.3A8.7 8.7 0 0 1 8 2.2Zm0 3.7c1.4 0 2.7.5 3.6 1.4l1.3-1.3A7 7 0 0 0 8 4 7 7 0 0 0 3.1 6l1.3 1.3A5.2 5.2 0 0 1 8 5.9Zm0 3.6c.4 0 .8.2 1.1.5L8 11.2 6.9 10c.3-.3.7-.5 1.1-.5Z"/></svg>',
  bateria: '<svg viewBox="0 0 26 12" fill="none"><rect x="0.5" y="0.5" width="22" height="11" rx="3" stroke="currentColor" opacity=".45"/><rect x="2" y="2" width="15" height="8" rx="1.5" fill="currentColor"/><rect x="23.5" y="4" width="2" height="4" rx="1" fill="currentColor" opacity=".45"/></svg>',
  voltar: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="m15 5-7 7 7 7"/></svg>',
  pessoa: '<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="9" r="4"/><path d="M4 20c1.5-3.5 4.5-5 8-5s6.5 1.5 8 5"/></svg>',
  video: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><rect x="2.5" y="6" width="13" height="12" rx="2.5"/><path d="m15.5 10.5 6-3.5v10l-6-3.5"/></svg>',
  telefone: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M5 3.5h3.5l1.5 4.5-2.2 1.4a11 11 0 0 0 6.8 6.8l1.4-2.2 4.5 1.5V19a1.5 1.5 0 0 1-1.6 1.5C10.6 20 4 13.4 3.5 5.1A1.5 1.5 0 0 1 5 3.5Z"/></svg>',
  mais: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 4v16M4 12h16"/></svg>',
  figurinha: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M14 20H8a4 4 0 0 1-4-4V8a4 4 0 0 1 4-4h8a4 4 0 0 1 4 4v6l-6 6Z"/><path d="M14 20v-3a3 3 0 0 1 3-3h3"/></svg>',
  camera: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M4 8h3l2-2.5h6L17 8h3a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1Z"/><circle cx="12" cy="13" r="3.5"/></svg>',
  microfone: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21"/></svg>'
};

function renderElementBlockHtml(el, mode, device) {
  mode = mode || 'edit';
  device = device || currentDevice;
  const align = styleValue(el, 'textAlign', device);

  // Save the Date: a mensagem é um bloco só, editado no painel "Editar texto".
  if (mode !== 'preview' && currentPageKey === 'savethedate') {
    // Aparece como uma conversa no celular: barra do WhatsApp em cima, o
    // papel de parede no meio com a mensagem num balão verde de "enviada",
    // e a barra de digitar embaixo.
    const agora = new Date();
    const hora = `${String(agora.getHours()).padStart(2, '0')}:${String(agora.getMinutes()).padStart(2, '0')}`;
    return `
      <div class="builder-element std-celular" aria-label="Prévia no WhatsApp">
        <div class="std-celular-status"><span>${hora}</span><span class="std-celular-status-icones">${STD_CELULAR.sinal}${STD_CELULAR.wifi}${STD_CELULAR.bateria}</span></div>
        <div class="std-celular-topo">
          <span class="std-celular-voltar">${STD_CELULAR.voltar}</span>
          <span class="std-celular-avatar">${STD_CELULAR.pessoa}</span>
          <span class="std-celular-nome">Convidado</span>
          <span class="std-celular-acoes">${STD_CELULAR.video}${STD_CELULAR.telefone}</span>
        </div>
        <div class="std-celular-conversa">
          <div class="std-mensagem-bloco"><div class="std-bolha">${renderElementContent(el, device, 'preview')}<span class="std-bolha-hora">${hora} <span class="std-bolha-lido">✓✓</span></span></div></div>
        </div>
        <div class="std-celular-rodape">
          <span class="std-celular-mais">${STD_CELULAR.mais}</span>
          <span class="std-celular-campo">${STD_CELULAR.figurinha}</span>
          ${STD_CELULAR.camera}${STD_CELULAR.microfone}
        </div>
      </div>`;
  }

  if (mode === 'preview') {
    return `<div class="builder-element" data-element-id="${el.id}" data-element-type="${el.type}"${align ? ` style="text-align:${align};"` : ''}>${renderElementContent(el, device, 'preview')}</div>`;
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
  // Fonte vale para todos os tamanhos de tela de uma vez: antes ficava por
  // dispositivo e uma fonte escolhida em outra visualização "prendia" no
  // celular (que é o que o convite publicado mostra).
  if (path === 'style:fontFamily') {
    ['desktop', 'tablet', 'mobile'].forEach(d => {
      el.styles[d] = el.styles[d] || {};
      if (value === '' || value === null || value === undefined) delete el.styles[d].fontFamily;
      else el.styles[d].fontFamily = value;
    });
    return;
  }
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
      ${colorSwatchPopoverHtml(section.fadeColor === '' ? '' : (section.fadeColor || '#ffffff'), 'data-section-fade-color', { removivel: true })}
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
    // Remover: sem cor de transição (a imagem fica sem o degradê).
    fadeColorInput.addEventListener('color-remover', () => { section.fadeColor = ''; renderCanvas(); pushHistory(); });
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
  `;
}

function wireColumnInspector() { /* somente leitura por enquanto */ }

/* -------------------- Inspector: Botões de navegação (quicknav) -------------------- */

function renderQuickNavInspector(qn) {
  return `
    <p class="inspector-hint">Seção fixa no topo de todas as páginas. Personalize a cor de fundo ou mantenha a da seção acima. Abaixo, edite o estilo, a ordem e ative ou desative os botões.</p>

    <div class="inspector-section-title">Fundo da seção</div>
    <div class="inspector-field inspector-field-row">
      <span class="inspector-field-label-plain">Cor de fundo</span>
      <div class="overlay-color-controls">
        ${colorSwatchPopoverHtml(qn.bg || '', 'data-quicknav-color="bg"')}
        ${qn.bg ? `<button type="button" class="overlay-color-remove" data-quicknav-bg-remove title="Usar cor da seção acima">${BI.close}</button>` : ''}
      </div>
    </div>

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

  const bgRemoveBtn = body.querySelector('[data-quicknav-bg-remove]');
  if (bgRemoveBtn) {
    bgRemoveBtn.addEventListener('click', () => {
      delete qn.bg;
      pushHistory();
      renderCanvas();
      renderLeftPanel();
    });
  }

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

/**
 * Caixinha de escrever do Título/Texto: aceita negrito, itálico e sombra só
 * num trecho (selecionado), igual à edição direta no template.
 * @param {any} el
 * @returns {string}
 */
function caixaDeTextoRicaHtml(el) {
  return botoesDeEstiloHtml(el, 'inspector-estilo-texto') + `<div class="inspector-rich" data-placeholder="${el.type === 'titulo' ? 'Insira um título' : 'Insira um texto'}" contenteditable="true" role="textbox" aria-multiline="${el.type === 'texto'}" data-rich-content data-tipo="${el.type}">${el.content || ''}</div>`;
}

/**
 * Normaliza o HTML da caixinha rica. No Texto, cada Enter é um parágrafo:
 * trechos soltos entram num <p> e <div> vira <p>. No Título não há parágrafos.
 * @param {HTMLElement} caixa
 * @param {string} tipo  'titulo' | 'texto'
 * @returns {string}
 */
function htmlDaCaixaRica(caixa, tipo) {
  const copia = /** @type {HTMLElement} */ (caixa.cloneNode(true));
  copia.querySelectorAll('[style]').forEach(n => {
    if (!(n instanceof HTMLElement)) return;
    const sombra = n.style.textShadow;
    n.removeAttribute('style');
    if (sombra) n.style.textShadow = sombra;
  });
  if (tipo !== 'texto') {
    copia.querySelectorAll('p, div').forEach(b => {
      const frag = document.createDocumentFragment();
      if (b.previousSibling) frag.appendChild(document.createElement('br'));
      while (b.firstChild) frag.appendChild(b.firstChild);
      b.replaceWith(frag);
    });
    const html = copia.innerHTML.replace(/(<br\s*\/?>)+$/i, '');
    return copia.textContent && copia.textContent.trim() ? html : '';
  }
  const blocos = [];
  /** @type {HTMLParagraphElement|null} */
  let solto = null;
  Array.from(copia.childNodes).forEach(no => {
    const ehBloco = no.nodeType === 1 && /^(P|DIV)$/.test(/** @type {Element} */ (no).tagName);
    if (ehBloco) {
      solto = null;
      const p = document.createElement('p');
      while (no.firstChild) p.appendChild(no.firstChild);
      blocos.push(p);
    } else {
      if (!solto) { solto = document.createElement('p'); blocos.push(solto); }
      solto.appendChild(no);
    }
  });
  if (blocos.length <= 1) {
    const unico = blocos[0];
    return unico && unico.textContent && unico.textContent.trim() ? unico.innerHTML : '';
  }
  return blocos.map(p => (p.textContent && p.textContent.trim() ? p.outerHTML : '<p><br></p>')).join('');
}

/**
 * Caixinha de texto que cresce sozinha conforme o texto (sem alça de arrastar).
 * @param {HTMLTextAreaElement} ta
 */
function autoCrescer(ta) {
  ta.style.height = 'auto';
  ta.style.height = ta.scrollHeight + 2 + 'px';
}

function wireContentTab(el, body) {
  wireBind(body, el);
  body.querySelectorAll('[data-redesenha-painel]').forEach(input => {
    input.addEventListener('change', () => renderLeftPanel());
  });

  const caixaRica = body.querySelector('[data-rich-content]');
  if (caixaRica instanceof HTMLElement) {
    const tipo = caixaRica.dataset.tipo || 'texto';
    caixaRica.addEventListener('focus', () => {
      try { document.execCommand('defaultParagraphSeparator', false, 'p'); } catch (e) { /* navegador sem suporte */ }
      try { document.execCommand('styleWithCSS', false, 'false'); } catch (e) { /* idem */ }
    });
    caixaRica.addEventListener('keydown', (e) => {
      // Título: Enter quebra a linha (sem parágrafo novo).
      if (tipo === 'titulo' && e.key === 'Enter') { e.preventDefault(); document.execCommand('insertLineBreak'); }
    });
    caixaRica.addEventListener('paste', (e) => {
      // Cola só o texto (sem a formatação de onde veio).
      e.preventDefault();
      const texto = e.clipboardData ? e.clipboardData.getData('text/plain') : '';
      document.execCommand('insertText', false, texto);
    });
    caixaRica.addEventListener('input', () => {
      el.content = htmlDaCaixaRica(caixaRica, tipo);
      renderCanvasOnly();
    });
    caixaRica.addEventListener('blur', () => pushHistory());
  }

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

  if (el.type === 'redes') {
    body.querySelectorAll('[data-remove-social]').forEach(btn => {
      btn.addEventListener('click', () => { el.profiles.splice(Number(btn.dataset.removeSocial), 1); pushHistory(); renderCanvasOnly(); renderLeftPanel(); });
    });
    body.querySelectorAll('[data-social-platform]').forEach(sel => {
      sel.addEventListener('change', () => { el.profiles[Number(sel.dataset.socialPlatform)].platform = sel.value; pushHistory(); renderCanvasOnly(); });
    });
    body.querySelectorAll('[data-social-url]').forEach(input => {
      input.addEventListener('input', () => { el.profiles[Number(input.dataset.socialUrl)].url = input.value; renderCanvasOnly(); });
      input.addEventListener('blur', () => pushHistory());
    });
    body.querySelector('[data-add-social]')?.addEventListener('click', () => {
      if (!Array.isArray(el.profiles)) el.profiles = [];
      el.profiles.push({ platform: 'instagram', url: '' }); pushHistory(); renderCanvasOnly(); renderLeftPanel();
    });
    // Original × Personalizada: mostra/esconde a cor dos ícones.
    body.querySelectorAll('[data-segmented="prop:colorMode"] button').forEach(btn => {
      btn.addEventListener('click', () => setTimeout(renderLeftPanel, 0));
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
      ? colorFieldHtml(el, el.type === 'titulo' ? 'Cor do título' : 'Cor do texto') + renderContentTab(el) + renderStyleTab(el, true, true, true)
      : renderContentTab(el);
    wireContentTab(el, body);
    if (isTextLike) wireTypographyToggles(body, el);
  }
}

// Save the Date: título e texto só com o texto e Negrito (o que existe no WhatsApp).
function renderTextoSaveTheDateInspector(el, body) {
  const peso = String(cascadedStyleValue(el, 'fontWeight') || '');
  const negrito = peso === 'bold' || Number(peso) >= 600;
  const campo = el.type === 'titulo'
    ? fieldRow('Texto do título', `<input type="text" class="inspector-input" data-bind="prop:content" value="${escapeHtml(el.content || '')}">`)
    : fieldRow('Texto', `<textarea class="inspector-textarea inspector-textarea-plain std-texto-grande" rows="12" data-bind="prop:content">${escapeHtml(el.content || '')}</textarea>`);
  body.innerHTML = `
    ${campo}
    <div class="inspector-field">
      <span class="inspector-field-label">Estilo</span>
      <div class="inspector-segmented">
        <button type="button" data-typography-toggle="bold" class="${negrito ? 'active' : ''}" title="Negrito">${BI.bold}</button>
      </div>
    </div>`;
  wireContentTab(el, body);
  wireTypographyToggles(body, el);
}

// Sombra leve atrás do texto (título e texto): curta e transparente, só para
// destacar do fundo sem borrar as letras.
const SOMBRA_DO_TEXTO = '0 1px 3px rgba(0, 0, 0, 0.22)';

/**
 * Trecho selecionado dentro da caixinha rica (ou null se não houver).
 * @param {HTMLElement|null} caixa
 * @returns {Range|null}
 */
function trechoSelecionadoNaCaixa(caixa) {
  const sel = window.getSelection();
  if (!caixa || !sel || !sel.rangeCount || sel.isCollapsed) return null;
  const r = sel.getRangeAt(0);
  return caixa.contains(r.commonAncestorContainer) ? r : null;
}

/**
 * Sombra só no trecho: se o trecho já está numa sombra, tira; senão, envolve.
 * @param {HTMLElement} caixa
 * @param {Range} r
 */
function alternarSombraNoTrecho(caixa, r) {
  const base = r.commonAncestorContainer.nodeType === 1 ? /** @type {Element} */ (r.commonAncestorContainer) : r.commonAncestorContainer.parentElement;
  const comSombra = base ? base.closest('span[style*="text-shadow"]') : null;
  if (comSombra && caixa.contains(comSombra)) {
    const frag = document.createDocumentFragment();
    while (comSombra.firstChild) frag.appendChild(comSombra.firstChild);
    comSombra.replaceWith(frag);
    return;
  }
  const span = document.createElement('span');
  span.style.textShadow = SOMBRA_DO_TEXTO;
  span.appendChild(r.extractContents());
  r.insertNode(span);
  const sel = window.getSelection();
  if (sel) { const nova = document.createRange(); nova.selectNodeContents(span); sel.removeAllRanges(); sel.addRange(nova); }
}

function wireTypographyToggles(body, el) {
  const caixa = /** @type {HTMLElement|null} */ (body.querySelector('[data-rich-content]'));
  const botoes = Array.from(body.querySelectorAll('[data-typography-toggle]'));
  // Com trecho selecionado, os botões mostram o estado do trecho.
  const atualizarEstado = () => {
    if (!body.isConnected) { document.removeEventListener('selectionchange', atualizarEstado); return; }
    const r = trechoSelecionadoNaCaixa(caixa);
    botoes.forEach(b => {
      if (!(b instanceof HTMLElement)) return;
      let ativo = b.dataset.ativoElemento === 'true';
      if (r) {
        const k = b.dataset.typographyToggle;
        const base = r.commonAncestorContainer.nodeType === 1 ? /** @type {Element} */ (r.commonAncestorContainer) : r.commonAncestorContainer.parentElement;
        if (k === 'bold') ativo = document.queryCommandState('bold');
        else if (k === 'italic') ativo = document.queryCommandState('italic');
        else if (k === 'sombra') ativo = !!(base && base.closest('span[style*="text-shadow"]'));
      }
      b.classList.toggle('active', ativo);
    });
  };
  if (caixa) document.addEventListener('selectionchange', atualizarEstado);

  botoes.forEach(btn => {
    // Não tira o foco/seleção da caixinha ao clicar no botão.
    btn.addEventListener('mousedown', (e) => { if (trechoSelecionadoNaCaixa(caixa)) e.preventDefault(); });
    btn.addEventListener('click', () => {
      const kind = btn instanceof HTMLElement ? btn.dataset.typographyToggle : '';
      const trecho = trechoSelecionadoNaCaixa(caixa);
      if (caixa && trecho) {
        if (kind === 'bold') document.execCommand('bold');
        else if (kind === 'italic') document.execCommand('italic');
        else if (kind === 'sombra') alternarSombraNoTrecho(caixa, trecho);
        el.content = htmlDaCaixaRica(caixa, caixa.dataset.tipo || 'texto');
        pushHistory();
        renderCanvasOnly();
        atualizarEstado();
        return;
      }
      const isActive = btn.classList.contains('active');
      if (kind === 'bold') applyBind(el, 'style:fontWeight', isActive ? '400' : '700');
      else if (kind === 'italic') applyBind(el, 'style:fontStyle', isActive ? '' : 'italic');
      else if (kind === 'underline') applyBind(el, 'style:textDecoration', isActive ? '' : 'underline');
      else if (kind === 'sombra') applyBind(el, 'style:textShadow', isActive ? '' : SOMBRA_DO_TEXTO);
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

// removivel: mostra "Remover" abaixo da cor (volta o campo para sem cor).
function colorSwatchPopoverHtml(value, attrs, { removivel = false } = {}) {
  const isEmpty = !value;
  const v = value || '#000000';
  return `
    <div class="color-alpha-field" data-color-swatch-field>
      <button type="button" class="color-alpha-swatch${isEmpty ? ' is-empty' : ''}" data-color-swatch-toggle ${isEmpty ? '' : `style="background-color:${v}"`}>${isEmpty ? '<span class="color-alpha-swatch-empty-icon">+</span>' : ''}</button>
      <div class="color-alpha-popover" data-color-swatch-popover hidden>
        <div class="color-alpha-top-row">
          <input type="color" class="color-alpha-native" ${attrs || ''} value="${v}">
          <input type="text" class="color-alpha-hex" value="${isEmpty ? '' : escapeHtml(v.toUpperCase())}" maxlength="7" spellcheck="false" placeholder="#000000">
          <button type="button" class="color-alpha-copy-btn" data-color-swatch-copy title="Copiar cor">${BI.duplicate}</button>
        </div>
        ${removivel ? '<button type="button" class="color-alpha-remove-btn" data-color-swatch-remove>Remover</button>' : ''}
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
    const copyBtn = field.querySelector('[data-color-swatch-copy]');
    if (!toggle || !popover || !nativeColor || !hexInput) return;

    wireColorPopoverToggle(field, toggle, popover);

    if (copyBtn) {
      copyBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const val = hexInput.value.trim() || nativeColor.value;
        if (!val) return;
        navigator.clipboard?.writeText(val).then(() => {
          showToast('Cor copiada!');
        }).catch(() => {});
      });
    }

    const removeBtn = field.querySelector('[data-color-swatch-remove]');
    if (removeBtn) {
      removeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        hexInput.value = '';
        toggle.classList.add('is-empty');
        toggle.style.backgroundColor = '';
        toggle.innerHTML = '<span class="color-alpha-swatch-empty-icon">+</span>';
        popover.hidden = true;
        if (typeof closeOpenColorPopover === 'function') closeOpenColorPopover();
        nativeColor.dispatchEvent(new CustomEvent('color-remover', { bubbles: true }));
      });
    }

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

/**
 * Linha "Estilo" (Negrito, Itálico, Sombra).
 * @param {any} el
 * @returns {string}
 */
function estiloRowHtml(el) {
  return `
    <div class="inspector-field">
      <span class="inspector-field-label">Estilo</span>
      ${botoesDeEstiloHtml(el)}
    </div>`;
}

/**
 * Botões Negrito, Itálico e Sombra.
 * @param {any} el
 * @param {string} [classeExtra]
 * @returns {string}
 */
function botoesDeEstiloHtml(el, classeExtra) {
  const isBold = cascadedStyleValue(el, 'fontWeight') === '700';
  const isItalic = cascadedStyleValue(el, 'fontStyle') === 'italic';
  const temSombra = !!cascadedStyleValue(el, 'textShadow');
  return `
      <div class="inspector-segmented${classeExtra ? ' ' + classeExtra : ''}">
        <button type="button" data-typography-toggle="bold" class="${isBold ? 'active' : ''}" data-ativo-elemento="${isBold}" title="Negrito">${BI.bold}</button>
        <button type="button" data-typography-toggle="italic" class="${isItalic ? 'active' : ''}" data-ativo-elemento="${isItalic}" title="Itálico">${BI.italic}</button>
        <button type="button" data-typography-toggle="sombra" class="${temSombra ? 'active' : ''}" data-ativo-elemento="${temSombra}" title="Sombra">${BI.textShadow}</button>
      </div>`;
}

function renderStyleTab(el, flat, skipColor, semEstilo) {
  if (!STYLE_CAPABLE_TYPES.includes(el.type)) return '';
  const align = cascadedStyleValue(el, 'textAlign');
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
    ${semEstilo ? '' : estiloRowHtml(el)}
    ${el.type === 'botao' ? '' : segRow('Alinhamento', 'style:textAlign', [
      { value: 'left', title: 'Esquerda', html: BI.alignLeft },
      { value: 'center', title: 'Centro', html: BI.alignCenter },
      { value: 'right', title: 'Direita', html: BI.alignRight }
    ], align || 'left')}
    ${skipColor ? '' : colorFieldHtml(el, el.type === 'botao' ? 'Cor do texto' : 'Cor')}
  `;
}

function renderLayoutTab(el, flat) {
  // Vincular valores: ligado = mesma margem nos 4 lados (corrente inteira);
  // desligado = cada lado com seu valor (corrente cortada por uma linha).
  const marginSyncBtn = `<button type="button" class="margin-sync-toggle ${marginSyncEnabled ? 'active' : ''}" data-margin-sync-toggle aria-pressed="${marginSyncEnabled}" title="${marginSyncEnabled ? 'Valores vinculados: mesmo valor nos 4 lados' : 'Valores livres: cada lado com seu valor'}">${marginSyncEnabled ? BI.vinculo : BI.vinculoCortado}</button>`;
  const alignmentRow = el.type === 'botao'
    ? segRow('Alinhamento', 'style:textAlign', [
        { value: 'left', title: 'Esquerda', html: BI.alignLeft },
        { value: 'center', title: 'Centro', html: BI.alignCenter },
        { value: 'right', title: 'Direita', html: BI.alignRight }
      ], currentDeviceStyleOrProp(el, 'textAlign') || 'left')
    : '';
  const marginHeading = flat
    ? `<span class="inspector-field-label">Margem (px)${marginSyncBtn}</span>`
    : `<div class="inspector-section-title inspector-section-title-row inspector-vincular"><span>Vincular valores</span>${marginSyncBtn}</div>${alignmentRow}<span class="inspector-field-label">Margem (px)</span>`;
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
      <span class="${labelClass}">Altura <span data-range-out="style:lineHeight">${cascadedStyleValue(el, 'lineHeight') || '1'}</span></span>
      <input type="range" min="1" max="2.5" step="0.1" value="${parseFloat(cascadedStyleValue(el, 'lineHeight')) || 1}" data-bind="style:lineHeight">
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
    case 'redes':
      return `
        <div id="social-editor">
          ${(el.profiles || []).map((p, i) => `
            <div class="inspector-list-item">
              <div class="inspector-list-item-row">
                <select class="inspector-select" data-social-platform="${i}">
                  ${Object.keys(SOCIAL_PLATFORMS).map(k => `<option value="${k}" ${p.platform === k ? 'selected' : ''}>${SOCIAL_PLATFORMS[k].label}</option>`).join('')}
                </select>
                <button type="button" class="inspector-list-item-remove-inline" data-remove-social="${i}" title="Remover">${BI.trash}</button>
              </div>
              <input type="text" class="inspector-input" data-social-url="${i}" value="${escapeHtml(p.url || '')}" placeholder="https://">
            </div>
          `).join('')}
        </div>
        <button type="button" class="inspector-add-btn" data-add-social>${BI.plus} Adicionar rede</button>
        ${segRow('Cores', 'prop:colorMode', [
          { value: 'original', title: 'Cores originais de cada rede', html: 'Original' },
          { value: 'custom', title: 'Uma cor para todos os ícones', html: 'Personalizada' }
        ], el.colorMode || 'custom')}
        ${el.colorMode === 'original' ? '' : `
        <div class="inspector-field inspector-field-row">
          <span class="inspector-field-label">Cor dos ícones</span>
          ${colorSwatchPopoverHtml(el.customColor || '#18181B', 'data-bind="prop:customColor"')}
        </div>`}
        <div class="inspector-field">
          <span class="inspector-field-label">Arredondamento do ícone <span data-range-out="prop:iconRadius">${el.iconRadius != null ? el.iconRadius : 50}%</span></span>
          <input type="range" min="0" max="50" value="${el.iconRadius != null ? el.iconRadius : 50}" data-bind="prop:iconRadius" data-unit="%" data-cast="number">
        </div>
      `;

    case 'texto':
      return fieldRow('Texto', caixaDeTextoRicaHtml(el));

    case 'titulo':
      return `
        ${fieldRow('Texto do título', caixaDeTextoRicaHtml(el))}
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
        <div class="inspector-toggle-row"><span class="inspector-field-label">Fundo com caixa</span><label class="settings-switch"><input type="checkbox" data-bind="prop:showBox" data-redesenha-painel ${el.showBox !== false ? 'checked' : ''}><span class="settings-switch-track"></span></label></div>
        ${el.showBox !== false ? `
        <div class="inspector-field inspector-field-row">
          <span class="inspector-field-label">Cor de fundo</span>
          ${colorSwatchPopoverHtml(el.boxBgColor, 'data-bind="prop:boxBgColor"')}
        </div>
        <p class="inspector-hint">A cor de fundo muda apenas as caixinhas de dias/horas/min/seg.</p>` : ''}
        ${fieldRow('Data alvo', `<input type="date" class="inspector-input" data-bind="prop:targetDate" value="${escapeHtml(el.targetDate || '')}">`)}
        ${fieldRow('Horário', seletorDeHorarioHtml(el.targetTime, 'Sem horário'))}
      `;

    case 'data':
      return `
        ${fieldRow('Data', `<input type="date" class="inspector-input" data-bind="prop:targetDate" value="${escapeHtml(el.targetDate || '')}">`)}
        ${fieldRow('Horário (opcional)', seletorDeHorarioHtml(el.targetTime, 'Sem horário'))}
        ${fieldRow('Fonte do texto', `<select class="inspector-select" data-bind="prop:fontFamily">
          ${FONT_OPTIONS_DATA.map(f => `<option value="${escapeHtml(f.value)}" ${(el.fontFamily || '') === f.value ? 'selected' : ''}>${escapeHtml(f.label)}</option>`).join('')}
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
  syncBuilderStateFromSupabase(currentPageKey);

  initPageSwitcher();
  // F5 no Save the Date: volta direto nele (a página fica guardada na aba).
  const paginaGuardada = paginaAbertaGuardada();
  if (paginaGuardada && paginaGuardada !== 'convite' && document.querySelector(`#builder-page-dropdown [data-page-option="${paginaGuardada}"]`)) {
    setTimeout(() => switchBuilderPage(paginaGuardada), 0);
  }

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
  const classicUndoBtn = document.getElementById('classic-editor-undo');
  if (classicUndoBtn) classicUndoBtn.addEventListener('click', undo);
  const classicRedoBtn = document.getElementById('classic-editor-redo');
  if (classicRedoBtn) classicRedoBtn.addEventListener('click', redo);
  const saveBtn = document.getElementById('builder-save');
  if (saveBtn) saveBtn.addEventListener('click', () => persistBuilderState(false));
  const publishBtn = document.getElementById('builder-publish');
  if (publishBtn) publishBtn.addEventListener('click', async () => {
    persistBuilderState(true);
    const keys = pagePublishedKeys(currentPageKey);
    localStorage.setItem(keys.flag, '1');
    localStorage.setItem(keys.state, JSON.stringify(builderState));
    await publicarConviteNoAr(publishBtn);
  });

  initCompartilharSaveTheDate();

  // "Ver página publicada" (Convite digital e Informações): abre o convite no
  // link público do evento (love.com.br/<slug>), não a prévia.
  ['builder-preview-link', 'classic-editor-ver-publicada'].forEach(id => {
    const btn = document.getElementById(id);
    if (btn) btn.addEventListener('click', (e) => {
      e.preventDefault();
      window.open(urlDaPaginaPublicada(), '_blank', 'noopener');
    });
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

  // Ctrl+Z / Ctrl+Y (Cmd no Mac) fazem o mesmo que os botões Desfazer/Refazer.
  // Se o cursor estiver num campo do painel ou no texto do convite, primeiro
  // tira o foco dele — como o clique no botão faz —, para a edição em curso
  // entrar no histórico e ser ela a desfeita (e não a ação anterior).
  /** @param {() => void} acao */
  const comoOsBotoes = (acao) => {
    const ativo = document.activeElement;
    const raiz = document.getElementById('site-builder-root');
    if (ativo instanceof HTMLElement && raiz && raiz.contains(ativo) &&
        (ativo.tagName === 'INPUT' || ativo.tagName === 'TEXTAREA' || ativo.tagName === 'SELECT' || ativo.isContentEditable)) {
      ativo.blur();
    }
    // Garante que a edição em curso virou um passo do histórico mesmo que o
    // blur não dispare (pushHistory ignora quando nada mudou).
    pushHistory();
    acao();
  };

  document.addEventListener('keydown', (e) => {
    if (!construtorVisivel()) return;
    const ativoEl = document.activeElement;
    const raizEl = document.getElementById('site-builder-root');
    // Campo fora do construtor (ex.: busca do topo) mantém o Ctrl+Z do navegador.
    if (ativoEl && raizEl && ativoEl !== document.body && !raizEl.contains(ativoEl)) return;
    const tag = (ativoEl && ativoEl.tagName) || '';
    const isEditingField = tag === 'INPUT' || tag === 'TEXTAREA' || (ativoEl instanceof HTMLElement && ativoEl.isContentEditable);
    const tecla = e.key.toLowerCase();

    if ((e.metaKey || e.ctrlKey) && tecla === 'z' && !e.shiftKey) { e.preventDefault(); comoOsBotoes(undo); return; }
    if ((e.metaKey || e.ctrlKey) && (tecla === 'y' || (tecla === 'z' && e.shiftKey))) { e.preventDefault(); comoOsBotoes(redo); return; }

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

/* -------------------- Página pública de pré-visualização (/convite-preview) -------------------- */

// love.com.br/<slug> → "<slug>"; /convite-preview (prévia do editor) → null.
function slugDaUrlPublica() {
  const partes = window.location.pathname.split('/').filter(Boolean);
  if (partes.length !== 1) return null;
  const slug = decodeURIComponent(partes[0]).toLowerCase();
  if (slug === 'convite-preview' || slug === 'convite-preview.html') return null;
  return slug;
}

// Dados do convite publicado (função convite_publicado): evento + presentes.
let conviteSlugPublico = null;
let conviteDadosPublicos = null;

// ==========================================
// Música de fundo do convite publicado (link do YouTube em Informações).
// Toca escondida, em loop, e continua ao trocar de tela (as telas do convite
// são da mesma página). Navegadores só deixam tocar som depois de um toque
// ou clique na página — por isso começa no primeiro toque, e há um botão
// pequeno para pausar/voltar a tocar.
// ==========================================
function idDoVideoYoutubePublico(link) {
  const m = String(link || '').trim().match(/(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/|v\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/i);
  return m ? m[1] : '';
}

let musicaPlayer = null;
let musicaTocando = false;
let musicaComSom = false;
let musicaPausadaPeloConvidado = false;

// autoplay = true: começa sozinha (no primeiro toque, se o navegador bloquear).
// autoplay = false: só toca quando o convidado clicar no botão de música.
function iniciarMusicaDeFundo(link, autoplay = true) {
  const videoId = idDoVideoYoutubePublico(link);
  if (!videoId || document.getElementById('convite-musica')) return;

  const holder = document.createElement('div');
  holder.id = 'convite-musica';
  holder.setAttribute('aria-hidden', 'true');
  holder.innerHTML = '<div id="convite-musica-player"></div>';
  document.body.appendChild(holder);

  const botao = document.createElement('button');
  botao.type = 'button';
  botao.id = 'convite-musica-botao';
  // rounded-full: fica de fora da regra geral que dá 12px de raio a todo botão.
  botao.className = 'convite-musica-botao rounded-full';
  botao.setAttribute('aria-label', 'Tocar música');
  botao.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>';
  document.body.appendChild(botao);

  // "Tocando" no botão = tocando E com som (no autoplay a música começa muda).
  const atualizarBotao = () => {
    const ativo = musicaTocando && musicaComSom;
    botao.classList.toggle('is-tocando', ativo);
    botao.setAttribute('aria-label', ativo ? 'Pausar música' : 'Tocar música');
    botao.title = ativo ? 'Pausar música' : 'Tocar música';
  };
  atualizarBotao();

  const tocarComSom = () => {
    if (!musicaPlayer || typeof musicaPlayer.playVideo !== 'function') return;
    try { musicaPlayer.unMute(); musicaPlayer.setVolume(60); musicaPlayer.playVideo(); } catch (e) {}
    musicaComSom = true;
    atualizarBotao();
  };

  botao.addEventListener('click', (e) => {
    e.stopPropagation();
    if (!musicaPlayer) return;
    if (musicaTocando && musicaComSom) { musicaPausadaPeloConvidado = true; try { musicaPlayer.pauseVideo(); } catch (err) {} }
    else { musicaPausadaPeloConvidado = false; tocarComSom(); }
  });

  // Autoplay: navegadores não deixam tocar som antes de a pessoa interagir.
  // A música começa MUDA assim que o convite abre (isso é permitido) e o som
  // liga no primeiro toque/clique/tecla — eventos que o navegador aceita como
  // interação (no celular é o "touchend"/"pointerup", não o "touchstart").
  const eventosDeInteracao = ['pointerup', 'touchend', 'click', 'keydown'];
  const primeiraInteracao = (e) => {
    if (e && e.target && e.target.closest && e.target.closest('#convite-musica-botao')) return;
    eventosDeInteracao.forEach(ev => document.removeEventListener(ev, primeiraInteracao, true));
    if (!musicaPausadaPeloConvidado && !musicaComSom) tocarComSom();
  };
  if (autoplay) {
    eventosDeInteracao.forEach(ev => document.addEventListener(ev, primeiraInteracao, true));
  }

  const criarPlayer = () => {
    musicaPlayer = new YT.Player('convite-musica-player', {
      width: '200', height: '200', videoId,
      playerVars: { autoplay: autoplay ? 1 : 0, mute: autoplay ? 1 : 0, loop: 1, playlist: videoId, controls: 0, disablekb: 1, playsinline: 1, modestbranding: 1, rel: 0 },
      events: {
        onReady: () => {
          if (!autoplay) return;
          try { musicaPlayer.mute(); musicaPlayer.playVideo(); } catch (e) {}
        },
        onStateChange: (ev) => {
          musicaTocando = ev.data === YT.PlayerState.PLAYING;
          // Garante o loop mesmo se o YouTube parar no fim.
          if (ev.data === YT.PlayerState.ENDED) { try { musicaPlayer.seekTo(0); musicaPlayer.playVideo(); } catch (e) {} }
          atualizarBotao();
        }
      }
    });
  };

  if (window.YT && window.YT.Player) { criarPlayer(); return; }
  const anterior = window.onYouTubeIframeAPIReady;
  window.onYouTubeIframeAPIReady = () => { if (typeof anterior === 'function') anterior(); criarPlayer(); };
  const s = document.createElement('script');
  s.src = 'https://www.youtube.com/iframe_api';
  s.async = true;
  document.head.appendChild(s);
}

// escapeHtml (acima) não escapa aspas — aqui o texto também vai para atributos.
function escaparPublico(valor) {
  return String(valor ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

async function initPublicPreview() {
  const root = document.getElementById('public-preview-root');
  if (!root) return;

  let publishedState = null;
  const slug = slugDaUrlPublica();

  if (slug) {
    // Site publicado do evento: vem do banco (função convite_publicado).
    root.innerHTML = '<div class="public-preview-empty">Carregando convite…</div>';
    let dados = null;
    if (typeof supabaseClient !== 'undefined') {
      const { data, error } = await supabaseClient.rpc('convite_publicado', { p_slug: slug });
      if (error) console.error('Erro ao carregar convite publicado:', error);
      dados = data;
    }
    if (!dados || !dados.state) {
      root.innerHTML = '<div class="public-preview-empty">Convite não encontrado.<br>Confira o link ou peça um novo aos anfitriões.</div>';
      return;
    }
    publishedState = dados.state;
    conviteSlugPublico = slug;
    conviteDadosPublicos = dados;
    if (dados.titulo) document.title = `${dados.titulo} — Love`;
    iniciarMusicaDeFundo(dados.evento && dados.evento.musica, !(dados.evento && dados.evento.musica_autoplay === false));
  } else {
    // Prévia do editor (/convite-preview): o que foi publicado neste navegador.
    try {
      publishedState = JSON.parse(localStorage.getItem(BUILDER_PUBLISHED_STATE_KEY) || 'null');
    } catch (e) { publishedState = null; }
  }

  if (!publishedState || !Array.isArray(publishedState.sections) || !publishedState.sections.length) {
    root.innerHTML = '<div class="public-preview-empty">Este convite ainda não foi publicado.<br>Volte para "Personalizar evento" → "Aparência" e clique em "Publicar".</div>';
    return;
  }

  builderState = publishedState;
  migrateQuickNavSection(builderState);
  tirarElementosDaCapa(builderState);
  migrateElementDefaults(builderState);
  currentDevice = 'mobile';

  const gs = builderState.globalStyle || {};
  root.style.setProperty('--bx-primary', gs.primaryColor || '#537bae');
  root.style.setProperty('--bx-radius', (gs.radius !== undefined ? gs.radius : 16) + 'px');
  root.style.setProperty('--bx-section-spacing', (gs.sectionSpacing !== undefined ? gs.sectionSpacing : 32) + 'px');

  // Botões do convite: Localização/Dress code → Informações, Lista de
  // Presentes → presentes, Confirmar presença → formulário. Cada tela tem
  // um #hash, então o voltar do navegador também funciona.
  const destinoDoBotao = { 'qn-loc': 'informacoes', 'qn-dress': 'informacoes', 'qn-gifts': 'presentes', 'qn-rsvp': 'confirmar', 'qn-about': 'sobre' };
  // Só volta pelo histórico se a tela foi aberta por um botão do convite;
  // se o visitante entrou direto em /<slug>#presentes, voltar = ir ao convite.
  let abriuPeloConvite = false;
  root.addEventListener('click', (e) => {
    const botao = e.target.closest('[data-quicknav-btn-id]');
    if (botao && destinoDoBotao[botao.dataset.quicknavBtnId]) {
      abriuPeloConvite = true;
      window.location.hash = destinoDoBotao[botao.dataset.quicknavBtnId];
      return;
    }
    // Card da lista de presentes: comum vai direto ao checkout; vaquinha
    // abre a tela do presente (com a barra do arrecadado).
    const check = e.target.closest('[data-carrinho-check]');
    if (check) {
      carrinhoAlternar(check.dataset.carrinhoCheck);
      atualizarCarrinhoNaLista(root);
      return;
    }
    const ir = e.target.closest('[data-convite-ir]');
    if (ir) {
      abriuPeloConvite = true;
      window.location.hash = ir.dataset.conviteIr.replace(/^#/, '');
      return;
    }
    const cardPresente = e.target.closest('[data-presente-abrir]');
    if (cardPresente) {
      abriuPeloConvite = true;
      window.location.hash = 'presente=' + cardPresente.dataset.presenteAbrir;
      return;
    }
    const voltarEspecifico = e.target.closest('[data-convite-voltar-para]');
    if (voltarEspecifico) {
      window.location.hash = voltarEspecifico.dataset.conviteVoltarPara.replace(/^#/, '');
      return;
    }
    if (e.target.closest('[data-convite-voltar]')) {
      if (abriuPeloConvite) {
        abriuPeloConvite = false;
        window.history.back();
      } else {
        window.history.replaceState(null, '', window.location.pathname);
        renderTelaPublica(root);
      }
    }
  });
  root.addEventListener('keydown', (e) => {
    if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('[data-presente-abrir]')) {
      e.preventDefault();
      e.target.click();
    }
  });
  window.addEventListener('hashchange', () => renderTelaPublica(root));
  renderTelaPublica(root);
}

function renderTelaPublica(root) {
  const tela = window.location.hash.replace('#', '');
  window.scrollTo(0, 0);
  if (tela === 'informacoes') return renderInformacoesPublicas(root);
  if (tela === 'presentes') return renderPresentesPublicos(root);
  if (tela.startsWith('presente=')) return renderPresentePublico(root, decodeURIComponent(tela.slice('presente='.length)));
  if (tela.startsWith('checkout=')) return renderCheckoutPublico(root, decodeURIComponent(tela.slice('checkout='.length)));
  if (tela === 'confirmar') return renderConfirmarPresencaPublica(root);
  if (tela === 'sobre') return renderSobrePublico(root);
  renderConvitePublico(root);
}

function renderConvitePublico(root) {
  const visible = builderState.sections.filter(s => !s.hidden);
  root.innerHTML = visible.map(section => renderAnySectionHtml(section, 'preview', 'mobile')).join('') + renderFixedFooterHtml();

  // No modo "preview" a capa não ganha a altura que tem em Aparência e a
  // foto aparecia cortada — mesma altura mínima usada na prévia das abas
  // clássicas (wireClassicPreviewCoverEdit).
  const capa = visible.find(s => !s.isQuickNav && !s.isGiftsBlock);
  const capaEl = (capa && root.querySelector(`[data-section-id="${capa.id}"]`)) || root.querySelector(':scope > section');
  if (capaEl) {
    capaEl.style.minHeight = '348px';
    capaEl.classList.add('convite-capa');
  }

  // Local, endereço e "Como chegar" ficam só na tela Informações (botão
  // Localização) — a home do convite mostra apenas o que foi montado em Aparência.
  startCountdownTicker(root);
}

// Moldura das telas internas do convite (Informações, Presentes, Confirmar).
// Cor de fundo da seção de botões (ela já acompanha a cor de Aparência) —
// as telas internas do convite usam a mesma, como as seções de informação.
/**
 * Estado do Convite digital, mesmo com outra página aberta na Aparência
 * (ex.: Save the Date). Informações, Anfitriões e as telas do convite usam
 * sempre a capa, as cores e os botões do Convite digital.
 * @returns {any}
 */
function estadoDoConvite() {
  if (currentPageKey === 'convite' || !builderState) return builderState;
  try {
    // Cópia do convite deste evento (gravada ao salvar e ao sincronizar com o banco).
    const raw = localStorage.getItem(pageStorageKey('convite'));
    const salvo = raw ? JSON.parse(raw) : null;
    if (salvo && Array.isArray(salvo.sections) && salvo.sections.length) {
      if (!salvo.globalStyle) salvo.globalStyle = { primaryColor: '#537bae', radius: 16, sectionSpacing: 32 };
      return salvo;
    }
    return loadPageState('convite') || builderState;
  } catch (e) { return builderState; }
}

function corDeFundoDosBotoes() {
  const conv = estadoDoConvite();
  const qn = (conv && conv.sections || []).find(sec => sec.isQuickNav);
  if (!qn) return '';
  return qn.bg || resolveAdjacentSectionBg(qn) || '';
}

function telaPublicaHtml(titulo, conteudo, { comCapa = false, fundoBranco = false } = {}) {
  const fundo = fundoBranco ? '#FFFFFF' : corDeFundoDosBotoes();
  return `
    <div class="convite-tela${fundoBranco ? ' convite-tela-branca' : ''}"${fundo ? ` style="background-color:${escaparPublico(fundo)};"` : ''}>
      <div class="convite-tela-topo">
        <!-- Voltar: só uma setinha numa caixinha cinza-clara, ao lado do título -->
        <button type="button" class="convite-voltar" data-convite-voltar aria-label="Voltar ao convite" title="Voltar ao convite">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7"/></svg>
        </button>
        <h1 class="convite-tela-titulo">${escaparPublico(titulo)}</h1>
      </div>
      ${comCapa ? capaDoConviteHtml() : ''}
      ${conteudo}
    </div>
  ` + renderFixedFooterHtml();
}

// Mesma foto de capa do convite (primeira seção de conteúdo), para as telas
// internas que mostram a imagem logo abaixo do título.
function capaDoConviteHtml() {
  const conv = estadoDoConvite();
  const secao = (conv && conv.sections || []).find(s => !s.isQuickNav && !s.isGiftsBlock && !s.hidden);
  const imagem = secao && secao.bgImage;
  if (!imagem) return '';
  // Mesmas camadas da capa em Aparência: cor por cima da foto e transição
  // (degradê) em cima ou embaixo — assim a capa fica igual em todas as telas.
  const camadas = [];
  if (secao.overlayColor) {
    const opacidade = secao.overlayOpacity !== undefined ? secao.overlayOpacity : 1;
    camadas.push(`<div class="convite-tela-capa-camada" style="inset:0;background-color:${escaparPublico(secao.overlayColor)};opacity:${Number(opacidade) || 0};"></div>`);
  }
  const corTransicao = secao.fadeColor === '' ? '' : (secao.fadeColor || '#ffffff');
  if (corTransicao && (secao.fadePosition === 'top' || secao.fadePosition === 'bottom')) {
    const emCima = secao.fadePosition === 'top';
    const c = escaparPublico(corTransicao);
    camadas.push(`<div class="convite-tela-capa-camada" style="left:0;right:0;height:45%;${emCima ? 'top:0' : 'bottom:0'};background:linear-gradient(to ${emCima ? 'bottom' : 'top'}, ${c} 0%, ${c} 35%, ${c}00 100%);"></div>`);
  }
  return `<div class="convite-tela-capa"><img src="${escaparPublico(imagem)}" alt="">${camadas.join('')}</div>`;
}

function semDadosPublicos(root, titulo) {
  root.innerHTML = telaPublicaHtml(titulo, '<p class="convite-vazio">Disponível no site publicado do evento.</p>');
}

function formatarDataPublica(data, hora) {
  if (!data) return '';
  const d = new Date(`${String(data).slice(0, 10)}T00:00:00`);
  if (isNaN(d.getTime())) return '';
  const texto = d.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  return hora ? `${texto} às ${hora}` : texto;
}

function renderInformacoesPublicas(root) {
  if (!conviteDadosPublicos) return semDadosPublicos(root, 'Informações');
  root.innerHTML = telaInformacoesHtml(conviteDadosPublicos.evento || {});
}

// Tela Informações (convite publicado e prévia da aba Informações no editor —
// as duas usam esta mesma função, para ficarem idênticas).
function telaInformacoesHtml(ev) {
  const quando = formatarDataPublica(ev.data, ev.hora);
  const ate = ev.data_fim ? formatarDataPublica(ev.data_fim, ev.hora_fim) : (ev.hora_fim ? `até ${ev.hora_fim}` : '');
  const enderecoCompleto = enderecoComCidade(ev.endereco, ev.cidade, ev.uf);
  const botoesMapa = botoesDeMapaHtml(ev.local, enderecoCompleto);

  const bloco = (rotulo, valor, extra = '') => valor ? `
    <div class="convite-info">
      <p class="convite-info-rotulo">${rotulo}</p>
      <p class="convite-info-valor">${escaparPublico(valor).replace(/\n/g, '<br>')}</p>
      ${extra}
    </div>` : '';

  // Quando, Local, Endereço e Ponto de referência ficam numa caixa branca.
  const principais =
    bloco('Quando', [quando, ate].filter(Boolean).join(' — ')) +
    // "Como chegar" sempre logo abaixo do Local (sem local, abaixo do Endereço).
    bloco('Local', ev.local, ev.local ? botoesMapa : '') +
    bloco('Endereço', enderecoCompleto, ev.local ? '' : botoesMapa) +
    bloco('Ponto de referência', ev.referencia);
  // Dress code e Informações gerais: cada um na sua caixa branca, sobre o
  // fundo colorido — só aparecem se tiver texto.
  const caixa = html => html ? `<div class="convite-info-caixa">${html}</div>` : '';
  const conteudo =
    caixa(principais) +
    caixa(bloco('Dress code', (ev.dresscode || '').trim())) +
    caixa(bloco('Informações gerais', (ev.informacoes || '').trim()));

  return telaPublicaHtml('Informações', conteudo || '<p class="convite-vazio">Os anfitriões ainda não preencheram as informações do evento.</p>', { comCapa: true });
}

// "Sobre" → o que foi preenchido em Personalizar evento → Anfitriões.
function renderSobrePublico(root) {
  if (!conviteDadosPublicos) return semDadosPublicos(root, 'Sobre');
  const sobre = conviteDadosPublicos.sobre || {};
  const ev = conviteDadosPublicos.evento || {};
  const titulo = sobre.titulo || 'Sobre';
  const conteudo = (sobre.texto || ev.anfitrioes)
    ? `
      ${ev.anfitrioes ? `<p class="convite-info-rotulo">Anfitriões</p><p class="convite-info-valor convite-sobre-nomes">${escaparPublico(ev.anfitrioes)}</p>` : ''}
      ${sobre.texto ? `<p class="convite-sobre-texto">${escaparPublico(sobre.texto).replace(/\n/g, '<br>')}</p>` : ''}`
    : '<p class="convite-vazio">Os anfitriões ainda não contaram a história deles por aqui.</p>';
  root.innerHTML = telaPublicaHtml(titulo, conteudo);
}

function renderPresentesPublicos(root) {
  if (!conviteDadosPublicos) return semDadosPublicos(root, 'Lista de Presentes');
  // Anfitrião ainda não finalizou o cadastro (migration 101): sem presentes,
  // para o convidado não tentar comprar e dar erro.
  if (conviteDadosPublicos.recebimento_pronto === false) {
    root.innerHTML = telaPublicaHtml('Lista de Presentes', `
      <div class="convite-presentes-indisponivel" role="status">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="8" width="18" height="4" rx="1"/><path d="M12 8v13"/><path d="M19 12v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7"/><path d="M7.5 8a2.5 2.5 0 0 1 0-5C9 3 11 5 12 8c1-3 3-5 4.5-5a2.5 2.5 0 0 1 0 5"/></svg>
        <p class="convite-presentes-indisponivel-titulo">A lista de presentes ainda não está disponível</p>
        <p>Os anfitriões estão finalizando a lista. Volte em breve para escolher um presente.</p>
      </div>`);
    return;
  }
  const presentes = conviteDadosPublicos.presentes || [];
  const brl = v => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const noCarrinho = carrinhoIds();
  const conteudo = presentes.length ? `
    ${barraDoCarrinhoHtml()}
    <div class="convite-presentes">
      ${presentes.map(p => `
        <div class="convite-presente${p.recebido ? ' is-recebido' : ''}${noCarrinho.has(String(p.id)) ? ' is-no-carrinho' : ''}"${p.recebido ? '' : ` data-presente-abrir="${escaparPublico(p.id)}" data-presente-vaquinha="${p.vaquinha ? '1' : ''}" role="button" tabindex="0"`}>
          <div class="convite-presente-foto">
            ${p.imagem ? `<img src="${escaparPublico(p.imagem)}" alt="${escaparPublico(p.nome)}" loading="lazy">` : ''}
            ${p.recebido ? '' : `<button type="button" class="convite-presente-check" data-carrinho-check="${escaparPublico(p.id)}" aria-pressed="${noCarrinho.has(String(p.id)) ? 'true' : 'false'}" aria-label="Colocar no carrinho" title="Colocar no carrinho"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="m5 12.5 4.5 4.5L19 7.5"/></svg></button>`}
          </div>
          <div class="convite-presente-texto">
            <p class="convite-presente-nome">${escaparPublico(p.nome)}</p>
            <p class="convite-presente-valor">${p.recebido ? 'Já presenteado' : brl(p.valor)}</p>
            ${(!p.recebido && p.vaquinha) ? `<div class="convite-presente-mini-barra"><div style="width:${progressoDoPresente(p).pct}%"></div></div>` : ''}
            ${p.recebido ? '' : `<button type="button" class="convite-presente-botao" data-convite-ir="#checkout=${escaparPublico(p.id)}">Presentear</button>`}
          </div>
        </div>
      `).join('')}
    </div>` : '<p class="convite-vazio">A lista de presentes ainda está sendo montada.</p>';

  root.innerHTML = telaPublicaHtml('Lista de Presentes', conteudo);
}

/* Confirmar presença pela lista de convidados (migration 100): o convidado
   digita o nome, escolhe o dele entre os nomes como os anfitriões
   escreveram (busca sem maiúsculas/acentos) e confirma. Na hora ele fica
   "confirmado" na lista do anfitrião. */
function renderConfirmarPresencaPublica(root) {
  if (!conviteDadosPublicos) return semDadosPublicos(root, 'Confirmar presença');

  root.innerHTML = telaPublicaHtml('Confirmar presença', `
    <form class="convite-form" data-convite-rsvp novalidate>
      <label for="rsvp-nome">Seu nome</label>
      <div class="convite-rsvp-campo">
        <input type="text" id="rsvp-nome" name="nome" maxlength="120" autocomplete="off" placeholder="Digite seu nome" role="combobox" aria-expanded="false" aria-controls="rsvp-opcoes" aria-describedby="rsvp-ajuda">
        <div class="convite-rsvp-opcoes" id="rsvp-opcoes" data-rsvp-opcoes role="listbox" aria-label="Nomes na lista" hidden></div>
      </div>
      <p class="convite-rsvp-ajuda" id="rsvp-ajuda">Digite seu nome e escolha como ele está na lista dos anfitriões.</p>
      <p class="convite-erro" hidden></p>
      <button type="submit" class="convite-botao" disabled>Confirmar minha presença</button>
    </form>
  `);

  const form = root.querySelector('[data-convite-rsvp]');
  const input = form.querySelector('input[name="nome"]');
  const opcoes = form.querySelector('[data-rsvp-opcoes]');
  const ajuda = form.querySelector('.convite-rsvp-ajuda');
  const erroEl = form.querySelector('.convite-erro');
  const botao = form.querySelector('button[type="submit"]');
  let escolhido = null; // { id, nome, confirmado }
  let espera = null;
  let ultimaBusca = 0;

  const fechar = () => { opcoes.hidden = true; input.setAttribute('aria-expanded', 'false'); };
  const abrir = () => { opcoes.hidden = false; input.setAttribute('aria-expanded', 'true'); };

  // Menu suspenso com os nomes como estão na lista dos anfitriões.
  const desenhar = (lista) => {
    opcoes.innerHTML = lista.length
      ? lista.map(c => `
        <button type="button" class="convite-rsvp-opcao" role="option" data-rsvp-id="${escaparPublico(c.id)}">
          <span>${escaparPublico(c.nome)}</span>${c.confirmado ? '<small>Já confirmado</small>' : ''}
        </button>`).join('')
      : '<p class="convite-rsvp-nada">Nenhum nome encontrado na lista.</p>';
    abrir();
    opcoes.querySelectorAll('[data-rsvp-id]').forEach(b => b.addEventListener('click', () => {
      escolhido = lista.find(c => String(c.id) === b.dataset.rsvpId) || null;
      if (!escolhido) return;
      input.value = escolhido.nome;
      botao.disabled = false;
      ajuda.textContent = escolhido.confirmado ? 'Sua presença já estava confirmada. Pode confirmar de novo se quiser.' : 'Agora é só confirmar.';
      fechar();
    }));
  };

  const buscar = async () => {
    const termo = input.value.trim();
    const minha = ++ultimaBusca;
    erroEl.hidden = true;
    if (termo.replace(/\s/g, '').length < 3) {
      fechar(); opcoes.innerHTML = '';
      ajuda.textContent = 'Digite seu nome e escolha como ele está na lista dos anfitriões.';
      return;
    }
    const { data, error } = await supabaseClient.rpc('buscar_convidado_do_convite', { p_slug: conviteSlugPublico, p_busca: termo });
    if (minha !== ultimaBusca) return; // chegou uma busca mais nova
    if (error) { console.error('Erro ao buscar convidado:', error); return; }
    const lista = data || [];
    ajuda.textContent = lista.length
      ? 'Escolha o seu nome na lista.'
      : 'Não encontramos esse nome. Tente só o primeiro nome ou fale com os anfitriões.';
    desenhar(lista);
  };

  // Digitar de novo desfaz a escolha e busca outra vez.
  input.addEventListener('input', () => {
    escolhido = null;
    botao.disabled = true;
    clearTimeout(espera);
    espera = setTimeout(buscar, 250);
  });
  input.addEventListener('focus', () => { if (!escolhido && opcoes.innerHTML) abrir(); });
  input.addEventListener('keydown', (e) => { if (e.key === 'Escape') fechar(); });
  document.addEventListener('click', (e) => { if (!form.isConnected) return; if (!e.target.closest || !e.target.closest('.convite-rsvp-campo')) fechar(); });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!escolhido) return;
    erroEl.hidden = true;
    botao.disabled = true;
    botao.textContent = 'Confirmando…';
    const { data, error } = await supabaseClient.rpc('confirmar_presenca_convidado', { p_slug: conviteSlugPublico, p_convidado_id: escolhido.id });
    if (error || !data || !data.ok) {
      if (error) console.error('Erro ao confirmar presença:', error);
      botao.disabled = false;
      botao.textContent = 'Confirmar minha presença';
      erroEl.textContent = 'Não foi possível confirmar agora. Tente de novo em instantes.';
      erroEl.hidden = false;
      return;
    }
    const nome = data.nome || escolhido.nome;
    const primeiro = escaparPublico(String(nome).split(' ')[0]);
    const convidadoId = escolhido.id;
    const tela = document.createElement('div');
    tela.innerHTML = `
      <div class="convite-sucesso">
        <p class="convite-sucesso-titulo">Presença confirmada!</p>
        <p>Obrigado, ${primeiro}. Sua presença já aparece na lista dos anfitriões.</p>
      </div>
      ${data.chave ? `
      <form class="convite-form convite-rsvp-dados" data-rsvp-dados novalidate>
        <p class="convite-rsvp-dados-titulo">Que tal informar alguns dados para ajudar a assessoria?</p>
        <label>E-mail <span>(opcional)</span>
          <input type="email" name="email" maxlength="200" autocomplete="email" inputmode="email" placeholder="seu@email.com">
        </label>
        <label>WhatsApp <span>(opcional)</span>
          <input type="tel" name="whatsapp" maxlength="15" autocomplete="tel" inputmode="tel" placeholder="(11) 99999-9999">
        </label>
        <label class="convite-rsvp-aceite"><input type="checkbox" name="novidades"><span>Aceito receber novidades sobre o evento</span></label>
        <label class="convite-rsvp-aceite"><input type="checkbox" name="ofertas"><span>Aceito receber ofertas e descontos da Love Viagens</span></label>
        <p class="convite-erro" hidden></p>
        <button type="submit" class="convite-botao">Enviar</button>
        <button type="button" class="convite-rsvp-depois" data-rsvp-depois>Agora não</button>
      </form>` : ''}`;
    form.replaceWith(...tela.childNodes);
    ligarDadosDoConvidado(root, convidadoId, data.chave, primeiro);
  });
}

/* Depois de confirmar: e-mail, WhatsApp e consentimentos (migration 102).
   Tudo opcional; os aceites começam desmarcados. */
function ligarDadosDoConvidado(root, convidadoId, chave, primeiro) {
  const form = root.querySelector('[data-rsvp-dados]');
  if (!form) return;
  const erroEl = form.querySelector('.convite-erro');
  const botao = form.querySelector('button[type="submit"]');
  const whats = form.querySelector('input[name="whatsapp"]');
  const soDigitos = v => String(v || '').replace(/\D/g, '');

  whats.addEventListener('input', () => {
    const d = soDigitos(whats.value).slice(0, 11);
    whats.value = d.length > 10 ? `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
      : d.length > 6 ? `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`
      : d.length > 2 ? `(${d.slice(0, 2)}) ${d.slice(2)}` : d;
  });

  const terminar = (texto) => {
    form.outerHTML = `<p class="convite-rsvp-dados-ok">${texto}</p>`;
  };
  form.querySelector('[data-rsvp-depois]').addEventListener('click', () => form.remove());

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    erroEl.hidden = true;
    const email = form.email.value.trim();
    const numero = soDigitos(whats.value);
    const mostrarErro = (msg, campo) => { erroEl.textContent = msg; erroEl.hidden = false; if (campo) campo.focus(); };
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return mostrarErro('Digite um e-mail válido.', form.email);
    if (numero && !(numero.length === 11 || numero.length === 10)) return mostrarErro('Digite o WhatsApp com DDD.', whats);
    if (!email && !numero && !form.novidades.checked && !form.ofertas.checked) return mostrarErro('Preencha pelo menos um campo ou toque em "Agora não".');
    if ((form.novidades.checked || form.ofertas.checked) && !email && !numero) return mostrarErro('Para receber novidades, informe o e-mail ou o WhatsApp.', form.email);

    botao.disabled = true;
    botao.textContent = 'Enviando…';
    const { data, error } = await supabaseClient.rpc('completar_dados_convidado', {
      p_slug: conviteSlugPublico,
      p_convidado_id: convidadoId,
      p_chave: chave,
      p_email: email || null,
      p_whatsapp: numero || null,
      p_ofertas_love: form.ofertas.checked,
      p_novidades_evento: form.novidades.checked
    });
    if (error || !data || !data.ok) {
      if (error) console.error('Erro ao salvar dados do convidado:', error);
      botao.disabled = false;
      botao.textContent = 'Enviar';
      const codigo = data && data.erro;
      return mostrarErro(codigo === 'email_invalido' ? 'Digite um e-mail válido.'
        : codigo === 'whatsapp_invalido' ? 'Digite o WhatsApp com DDD.'
        : codigo === 'chave_invalida' ? 'O tempo para enviar acabou. Seus dados não foram salvos, mas sua presença continua confirmada.'
        : 'Não foi possível enviar agora. Tente de novo em instantes.');
    }
    terminar(`Pronto, ${primeiro}! Obrigado pelas informações.`);
  });
}


/* ==========================================================================
   Presente em tela cheia + checkout (site publicado)
   - Presente comum: clicar no card já abre o checkout (#checkout=<id>).
   - Presente com vaquinha: abre a tela do presente (#presente=<id>) com a
     barra do que já foi arrecadado; "Presentear" leva ao checkout, onde o
     convidado escolhe quanto dar.
   O "Pagar" registra a escolha (presentear_pelo_convite); o pagamento em
   si entra com a integração do gateway.
   ========================================================================== */

const brlPublico = v => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

// Checkout e carrinho: sempre com fundo branco, seja qual for a cor do convite.
function telaPublicaHtmlBranca(titulo, conteudo) { return telaPublicaHtml(titulo, conteudo, { fundoBranco: true }); }

function presentePublicoPorId(id) {
  const lista = (conviteDadosPublicos && conviteDadosPublicos.presentes) || [];
  return lista.find(p => String(p.id) === String(id)) || null;
}

// Voltar da tela do presente/checkout vai para a lista (não para o convite).
function voltarPara(root, hash) {
  root.querySelector('[data-convite-voltar]')?.setAttribute('data-convite-voltar-para', hash);
}

function progressoDoPresente(p) {
  const meta = Number(p.valor) || 0;
  const arrecadado = Math.max(0, Number(p.arrecadado) || 0);
  const pct = meta > 0 ? Math.min(100, Math.round((arrecadado / meta) * 100)) : 0;
  const falta = Math.max(0, Math.round((meta - arrecadado) * 100) / 100);
  return { meta, arrecadado, pct, falta };
}

function renderPresentePublico(root, id) {
  const p = presentePublicoPorId(id);
  if (!p) return renderPresentesPublicos(root);

  const { meta, arrecadado, pct, falta } = progressoDoPresente(p);
  const vaquinha = !!p.vaquinha;
  const fechado = p.recebido || (vaquinha && falta <= 0);
  const botao = fechado
    ? '<p class="convite-vazio">Este presente já foi presenteado. Obrigado!</p>'
    : `<button type="button" class="convite-botao" data-convite-ir="#checkout=${escaparPublico(p.id)}">Presentear</button>`;
  const sobre = p.descricao
    ? `<div class="convite-presente-detalhe-sobre">
         <h3>Sobre o presente</h3>
         <p>${escaparPublico(p.descricao)}</p>
       </div>`
    : '';

  const conteudo = `
    <div class="convite-presente-detalhe">
      <div class="convite-presente-detalhe-foto">
        ${p.imagem ? `<img src="${escaparPublico(p.imagem)}" alt="${escaparPublico(p.nome)}">` : ''}
      </div>
      <h2 class="convite-presente-detalhe-nome">${escaparPublico(p.nome)}</h2>
      ${vaquinha ? `
        <p class="convite-presente-detalhe-arrecadado">Arrecadado <strong>${brlPublico(arrecadado)}</strong></p>
        <div class="convite-vaquinha-trilho"><div class="convite-vaquinha-barra" style="width:${pct}%"></div></div>
        <div class="convite-presente-detalhe-meta"><strong>Meta: ${brlPublico(meta)}</strong><strong>${pct}% da meta</strong></div>
      ` : `
        <p class="convite-presente-detalhe-preco">${brlPublico(meta)}</p>
      `}
      ${botao}
      ${sobre}
    </div>`;
  root.innerHTML = telaPublicaHtml(vaquinha ? 'Vaquinha' : 'Presente', conteudo, { fundoBranco: true });
  // Página do presente: sem o título, a foto vai até o topo e o Voltar fica
  // por cima dela (ver .convite-tela-presente no CSS).
  const tela = root.querySelector('.convite-tela');
  if (tela) {
    tela.classList.add('convite-tela-presente');
    tela.querySelector('.convite-tela-titulo')?.remove();
  }
  voltarPara(root, '#presentes');
}

/* ==========================================================================
   Recado para os anfitriões no checkout do convite: escrito (a caixa cresce
   junto com o texto, sem alça de redimensionar) ou gravado em vídeo (abre a
   câmera no celular; no computador escolhe um arquivo). O vídeo sobe para o
   bucket "recados" depois que o presente é registrado e fica ligado à
   contribuição (anexar_video_ao_recado, migration 097).
   ========================================================================== */
const RECADO_VIDEO_MAX_MB = 100;

function htmlRecadoParaAnfitrioes() {
  return `
      <div class="convite-recado" data-convite-recado>
        <p class="convite-recado-rotulo">Mensagem para os anfitriões <span>(opcional)</span></p>
        <p class="convite-recado-ajuda">Escreva um recado ou grave um vídeo para eles.</p>
        <div class="convite-recado-abas" role="tablist">
          <button type="button" class="convite-recado-aba is-ativo" role="tab" aria-selected="true" data-recado-modo="texto">Escrever</button>
          <button type="button" class="convite-recado-aba" role="tab" aria-selected="false" data-recado-modo="video">Gravar vídeo</button>
        </div>
        <div data-recado-painel="texto">
          <textarea name="mensagem" maxlength="300" rows="3" class="convite-recado-texto" aria-label="Mensagem para os anfitriões" placeholder="Deixe um recado carinhoso"></textarea>
        </div>
        <div data-recado-painel="video" hidden>
          <label class="convite-recado-video-vazio" data-recado-escolher>
            <input type="file" name="recado_video" accept="video/*" capture="user" hidden>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="2.5" y="6" width="13" height="12" rx="2"/><path d="m15.5 10.5 6-3.5v10l-6-3.5"/></svg>
            <b>Gravar ou escolher um vídeo</b>
            <span>Até ${RECADO_VIDEO_MAX_MB} MB</span>
          </label>
          <div class="convite-recado-video" data-recado-previa hidden>
            <video controls playsinline preload="metadata"></video>
            <div class="convite-recado-video-acoes">
              <button type="button" data-recado-trocar>Gravar outro</button>
              <button type="button" data-recado-remover>Remover vídeo</button>
            </div>
          </div>
        </div>
      </div>`;
}

/** Liga o recado do formulário. Devolve { texto(), video(), erro() }. */
function ligarRecadoParaAnfitrioes(form) {
  const caixa = form.querySelector('[data-convite-recado]');
  const textarea = caixa.querySelector('textarea[name="mensagem"]');
  const input = caixa.querySelector('input[name="recado_video"]');
  const previa = caixa.querySelector('[data-recado-previa]');
  const vazio = caixa.querySelector('[data-recado-escolher]');
  const player = previa.querySelector('video');
  let modo = 'texto';
  let arquivo = null;
  let urlPrevia = '';
  let erro = '';

  // A caixa cresce junto com o texto.
  const crescer = () => { textarea.style.height = 'auto'; textarea.style.height = `${textarea.scrollHeight + 2}px`; };
  textarea.addEventListener('input', crescer);

  caixa.querySelectorAll('[data-recado-modo]').forEach(aba => {
    aba.addEventListener('click', () => {
      modo = aba.dataset.recadoModo;
      caixa.querySelectorAll('[data-recado-modo]').forEach(a => {
        const ativa = a === aba;
        a.classList.toggle('is-ativo', ativa);
        a.setAttribute('aria-selected', String(ativa));
      });
      caixa.querySelectorAll('[data-recado-painel]').forEach(p => { p.hidden = p.dataset.recadoPainel !== modo; });
      if (modo === 'texto') crescer();
    });
  });

  const mostrar = () => {
    if (urlPrevia) { URL.revokeObjectURL(urlPrevia); urlPrevia = ''; }
    if (arquivo) { urlPrevia = URL.createObjectURL(arquivo); player.src = urlPrevia; }
    else player.removeAttribute('src');
    previa.hidden = !arquivo;
    vazio.hidden = !!arquivo;
  };
  input.addEventListener('change', () => {
    const f = input.files && input.files[0];
    erro = '';
    if (f && !/^video\//.test(f.type)) erro = 'Escolha um arquivo de vídeo.';
    else if (f && f.size > RECADO_VIDEO_MAX_MB * 1024 * 1024) erro = `O vídeo pode ter até ${RECADO_VIDEO_MAX_MB} MB. Grave um vídeo mais curto.`;
    arquivo = f && !erro ? f : null;
    mostrar();
    const erroEl = form.querySelector('.convite-erro');
    if (erroEl) { erroEl.textContent = erro; erroEl.hidden = !erro; }
  });
  caixa.querySelector('[data-recado-trocar]').addEventListener('click', () => input.click());
  caixa.querySelector('[data-recado-remover]').addEventListener('click', () => { arquivo = null; input.value = ''; mostrar(); });

  return {
    texto: () => textarea.value.trim() || null,
    video: () => arquivo,
    erro: () => erro
  };
}

/** Sobe o vídeo do recado e liga às contribuições. Não trava o presente se falhar. */
async function enviarVideoDoRecado(arquivo, contribuicoes) {
  if (!arquivo || !contribuicoes.length) return true;
  try {
    const ext = (arquivo.name.split('.').pop() || 'mp4').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 5) || 'mp4';
    const caminho = `video/${conviteSlugPublico || 'convite'}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const { error } = await supabaseClient.storage.from('recados').upload(caminho, arquivo, { contentType: arquivo.type || 'video/mp4' });
    if (error) throw error;
    const { data } = supabaseClient.storage.from('recados').getPublicUrl(caminho);
    for (const id of contribuicoes) {
      await supabaseClient.rpc('anexar_video_ao_recado', { p_contribuicao: id, p_url: data.publicUrl });
    }
    return true;
  } catch (e) {
    console.error('Erro ao enviar o vídeo do recado:', e);
    return false;
  }
}

/* ==========================================================================
   Pagamento dos presentes (Asaas, via /api/presentear). O servidor registra
   os presentes, cria a cobrança com o valor do presente indo direto para a
   conta digital dos anfitriões e devolve o QR Code do Pix ou o link do
   cartão. Esta tela espera a confirmação (consulta a cada 4 s) e mostra o
   obrigado quando o pagamento cai.
   ========================================================================== */
const mascaraCpf = v => String(v || '').replace(/\D/g, '').slice(0, 11)
  .replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d{1,2})$/, '$1-$2');

function htmlCampoCpf() {
  return `
      <label>CPF
        <input type="text" name="cpf" required inputmode="numeric" autocomplete="off" maxlength="14" placeholder="000.000.000-00">
        <span class="convite-campo-ajuda">Pedido pelo banco para emitir o pagamento.</span>
      </label>`;
}

function ligarCampoCpf(form) {
  const input = form.querySelector('input[name="cpf"]');
  input?.addEventListener('input', () => { input.value = mascaraCpf(input.value); });
}

function cpfPareceValido(cpf) {
  const d = String(cpf || '').replace(/\D/g, '');
  if (d.length !== 11 || /^(\d)\1+$/.test(d)) return false;
  for (const t of [9, 10]) {
    let soma = 0;
    for (let i = 0; i < t; i++) soma += Number(d[i]) * (t + 1 - i);
    if (((soma * 10) % 11) % 10 !== Number(d[t])) return false;
  }
  return true;
}

/**
 * Envia a compra e segue para a tela de pagamento.
 * pedido = { titulo, itens: [{ presente_id, valor }], nome, email, cpf, mensagem, metodo, video, descricao }
 * Devolve { ok:false, mensagem } se não deu para gerar o pagamento.
 */
async function pagarPresentesPeloConvite(root, pedido) {
  let r;
  try {
    const resp = await fetch('/api/presentear', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        slug: conviteSlugPublico,
        itens: pedido.itens,
        nome: pedido.nome,
        email: pedido.email,
        cpf: pedido.cpf,
        mensagem: pedido.mensagem,
        metodo: pedido.metodo
      })
    });
    r = await resp.json().catch(() => null);
    // Resposta que não é JSON (servidor caiu ou demorou demais): guarda o código.
    if (!r) r = { ok: false, mensagem: `Não foi possível gerar o pagamento agora. Tente de novo em instantes. (erro ${resp.status})` };
  } catch (e) {
    console.error('Pagamento do presente:', e);
    r = { ok: false, mensagem: 'Sem conexão com o servidor. Confira sua internet e tente de novo.' };
  }
  if (!r.ok) console.error('Pagamento do presente recusado:', r);
  if (!r.ok) return { ok: false, erro: r.erro, mensagem: r.mensagem || 'Não foi possível gerar o pagamento agora. Tente de novo em instantes.' };

  // O vídeo do recado sobe enquanto a pessoa paga.
  const video = pedido.video ? enviarVideoDoRecado(pedido.video, r.contribuicoes || []) : Promise.resolve(true);
  renderAguardandoPagamento(root, pedido, r, video);
  return { ok: true };
}

function renderAguardandoPagamento(root, pedido, r, videoEnviado) {
  const pix = r.metodo === 'pix' && r.pix;
  const resumo = `
      <div class="convite-pagar-resumo">
        <div><span>${escaparPublico(pedido.descricao)}</span><strong>${brlPublico(r.soma)}</strong></div>
        <div><span>Taxa de serviço</span><strong>${brlPublico(r.taxa)}</strong></div>
        <div class="is-total"><span>Total</span><strong>${brlPublico(r.total)}</strong></div>
      </div>`;
  const corpo = pix ? `
      <p class="convite-pagar-instrucao">Abra o app do seu banco, escolha pagar com Pix e leia o QR Code ou cole o código.</p>
      <img class="convite-pagar-qr" src="data:image/png;base64,${pix.imagem}" alt="QR Code do Pix" width="220" height="220">
      <div class="convite-pagar-copia">
        <input type="text" readonly value="${escaparPublico(pix.copiaECola)}" aria-label="Pix copia e cola">
        <button type="button" class="convite-botao" data-pagar-copiar>Copiar código</button>
      </div>` : `
      <p class="convite-pagar-instrucao">O pagamento com cartão abre numa página segura do banco. Depois de pagar, volte para esta tela.</p>
      <a class="convite-botao" href="${escaparPublico(r.url)}" target="_blank" rel="noopener">Pagar com cartão</a>`;

  root.innerHTML = telaPublicaHtmlBranca(pedido.titulo, `
    <div class="convite-pagar">
      ${resumo}
      ${corpo}
      <p class="convite-pagar-status" data-pagar-status><span class="convite-pagar-ponto"></span>Aguardando o pagamento…</p>
    </div>`);
  voltarPara(root, '#presentes');

  root.querySelector('[data-pagar-copiar]')?.addEventListener('click', async (e) => {
    const input = root.querySelector('.convite-pagar-copia input');
    try { await navigator.clipboard.writeText(input.value); } catch (_) { input.select(); document.execCommand('copy'); }
    e.currentTarget.textContent = 'Código copiado';
  });
  if (!pix && r.url) window.open(r.url, '_blank', 'noopener');

  const tela = root.querySelector('.convite-pagar');
  const status = root.querySelector('[data-pagar-status]');
  let tentativas = 0;
  const consultar = async () => {
    if (!tela.isConnected) return; // a pessoa saiu da tela
    tentativas++;
    try {
      const resp = await fetch(`/api/presentear?pagamento=${encodeURIComponent(r.pagamento)}`);
      const s = await resp.json();
      if (s && s.status === 'pago') return mostrarObrigado(root, pedido, r, await videoEnviado);
      if (s && s.status === 'cancelado') { status.textContent = 'Este pagamento foi cancelado. Volte para a lista e tente de novo.'; return; }
    } catch (_) { /* tenta de novo */ }
    // 4 s nos primeiros 15 min; depois a cada 15 s.
    setTimeout(consultar, tentativas < 225 ? 4000 : 15000);
  };
  setTimeout(consultar, 4000);
}

function mostrarObrigado(root, pedido, r, videoOk) {
  if (pedido.aoPagar) pedido.aoPagar();
  root.innerHTML = telaPublicaHtmlBranca(pedido.titulo, `
    <div class="convite-sucesso">
      <p class="convite-sucesso-titulo">Pagamento confirmado!</p>
      <p>Obrigado, ${escaparPublico(pedido.nome.split(' ')[0])}. Seu presente de <strong>${brlPublico(r.soma)}</strong> já foi para os anfitriões.</p>${videoOk ? '' : '<p>Não conseguimos enviar o seu vídeo agora, mas o presente foi pago.</p>'}
      <button type="button" class="convite-botao" data-convite-ir="#presentes">Voltar para a lista</button>
    </div>`);
  voltarPara(root, '#presentes');
}

function renderCheckoutPublico(root, id) {
  if (id === 'carrinho') return renderCheckoutCarrinho(root);
  const p = presentePublicoPorId(id);
  if (!p) return renderPresentesPublicos(root);
  const { meta, pct, falta } = progressoDoPresente(p);
  const vaquinha = !!p.vaquinha;

  if (p.recebido || (vaquinha && falta <= 0)) {
    root.innerHTML = telaPublicaHtmlBranca('Presentear', '<p class="convite-vazio">Este presente já foi presenteado. Escolha outro da lista.</p>');
    voltarPara(root, '#presentes');
    return;
  }

  // Vaquinha: sugestões de valor (um quarto, metade, o que falta) + outro valor.
  const sugestoes = vaquinha
    ? [...new Set([Math.round(falta * 0.25), Math.round(falta * 0.5), Math.round(falta * 100) / 100].filter(v => v >= 1))]
    : [];
  const valorInicial = vaquinha ? (sugestoes[0] || falta) : meta;

  const conteudo = `
    <div class="convite-checkout-resumo">
      <div class="convite-checkout-resumo-foto">${p.imagem ? `<img src="${escaparPublico(p.imagem)}" alt="">` : ''}</div>
      <div>
        <p class="convite-checkout-resumo-nome">${escaparPublico(p.nome)}</p>
        <p class="convite-checkout-resumo-valor">${vaquinha ? `Faltam ${brlPublico(falta)} para completar · ${pct}% arrecadado` : brlPublico(meta)}</p>
      </div>
    </div>
    <form class="convite-form" data-convite-checkout novalidate>
      ${vaquinha ? `
      <fieldset class="convite-valor">
        <legend>Quanto você quer dar?</legend>
        <div class="convite-valor-chips">
          ${sugestoes.map((v, i) => `<button type="button" class="convite-valor-chip${i === 0 ? ' is-ativo' : ''}" data-valor="${v}">${brlPublico(v)}</button>`).join('')}
        </div>
        <label>Outro valor <span>(até ${brlPublico(falta)})</span>
          <input type="number" name="valor" min="1" max="${falta}" step="0.01" inputmode="decimal" value="${valorInicial}" placeholder="R$">
        </label>
      </fieldset>` : ''}
      <label>Seu nome completo
        <input type="text" name="nome" required maxlength="120" autocomplete="name" placeholder="Como está no convite">
      </label>
      <label>E-mail
        <input type="email" name="email" required maxlength="200" autocomplete="email" placeholder="seu@email.com">
      </label>
${htmlCampoCpf()}
${htmlRecadoParaAnfitrioes()}
      <fieldset class="convite-pagamento">
        <legend>Forma de pagamento</legend>
        <label class="convite-pagamento-opcao is-ativo"><input type="radio" name="metodo" value="pix" checked><span>Pix</span></label>
        <label class="convite-pagamento-opcao"><input type="radio" name="metodo" value="cartao"><span>Cartão de crédito</span></label>
      </fieldset>
      <p class="convite-erro" hidden></p>
      <button type="submit" class="convite-botao">Continuar para o pagamento</button>
    </form>`;
  root.innerHTML = telaPublicaHtmlBranca('Presentear', conteudo);
  voltarPara(root, `#presente=${p.id}`);

  const form = root.querySelector('[data-convite-checkout]');
  const recado = ligarRecadoParaAnfitrioes(form);
  const erroEl = form.querySelector('.convite-erro');
  const botao = form.querySelector('button[type="submit"]');
  const valorInput = form.querySelector('input[name="valor"]');

  ligarCampoCpf(form);
  const valorEscolhido = () => vaquinha ? Math.min(falta, Math.max(0, parseFloat(valorInput.value) || 0)) : meta;
  const atualizarBotao = () => { botao.textContent = 'Continuar para o pagamento'; };

  form.querySelectorAll('.convite-valor-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      valorInput.value = chip.dataset.valor;
      form.querySelectorAll('.convite-valor-chip').forEach(c => c.classList.toggle('is-ativo', c === chip));
      atualizarBotao();
    });
  });
  valorInput?.addEventListener('input', () => {
    form.querySelectorAll('.convite-valor-chip').forEach(c => c.classList.toggle('is-ativo', parseFloat(c.dataset.valor) === parseFloat(valorInput.value)));
    atualizarBotao();
  });
  form.querySelectorAll('input[name="metodo"]').forEach(radio => {
    radio.addEventListener('change', () => {
      form.querySelectorAll('.convite-pagamento-opcao').forEach(o => o.classList.toggle('is-ativo', o.contains(radio)));
    });
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    erroEl.hidden = true;
    const nome = form.nome.value.trim();
    const email = form.email.value.trim();
    const valor = valorEscolhido();
    if (nome.length < 2) { erroEl.textContent = 'Digite seu nome completo.'; erroEl.hidden = false; return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { erroEl.textContent = 'Digite um e-mail válido.'; erroEl.hidden = false; return; }
    if (!cpfPareceValido(form.cpf.value)) { erroEl.textContent = 'Digite um CPF válido.'; erroEl.hidden = false; return; }
    if (vaquinha && valor < 1) { erroEl.textContent = 'Escolha um valor de pelo menos R$ 1,00.'; erroEl.hidden = false; return; }
    if (recado.erro()) { erroEl.textContent = recado.erro(); erroEl.hidden = false; return; }
    const metodo = form.querySelector('input[name="metodo"]:checked')?.value || 'pix';

    botao.disabled = true;
    botao.textContent = 'Gerando o pagamento…';
    const r = await pagarPresentesPeloConvite(root, {
      titulo: 'Presentear',
      descricao: p.nome,
      itens: [{ presente_id: p.id, valor }],
      nome, email, cpf: form.cpf.value, metodo,
      mensagem: recado.texto(),
      video: recado.video()
    });
    if (!r.ok) {
      botao.disabled = false;
      atualizarBotao();
      erroEl.textContent = r.mensagem;
      erroEl.hidden = false;
    }
  });
}


/* ==========================================================================
   Carrinho da lista de presentes (site publicado): caixinha no canto da
   foto de cada card, "Ver carrinho (N)" acima da lista e um checkout só
   com todos os presentes escolhidos. Guardado por convite no sessionStorage,
   para sobreviver à troca de tela (#hash) e ao recarregar.
   ========================================================================== */

function chaveDoCarrinho() { return `love-carrinho-${conviteSlugPublico || 'previa'}`; }

function carrinhoIds() {
  try { return new Set(JSON.parse(sessionStorage.getItem(chaveDoCarrinho()) || '[]')); } catch (e) { return new Set(); }
}

function salvarCarrinho(ids) {
  try { sessionStorage.setItem(chaveDoCarrinho(), JSON.stringify([...ids])); } catch (e) { /* sem storage */ }
}

function carrinhoAlternar(id) {
  const ids = carrinhoIds();
  if (ids.has(id)) ids.delete(id); else ids.add(id);
  salvarCarrinho(ids);
  return ids;
}

// Presentes do carrinho que ainda existem e continuam abertos.
function presentesDoCarrinho() {
  const ids = carrinhoIds();
  return ((conviteDadosPublicos && conviteDadosPublicos.presentes) || []).filter(p => ids.has(String(p.id)) && !p.recebido);
}

// Valor cobrado de cada presente no carrinho: o do presente, ou o que falta
// para completar numa vaquinha.
function valorNoCarrinho(p) {
  return p.vaquinha ? progressoDoPresente(p).falta : (Number(p.valor) || 0);
}

function barraDoCarrinhoHtml() {
  const qtd = presentesDoCarrinho().length;
  if (!qtd) return '';
  return `
    <div class="convite-carrinho-barra">
      <button type="button" class="convite-carrinho-botao" data-convite-ir="#checkout=carrinho">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 0 0-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 0 0-16.536-1.84M7.5 14.25 5.106 5.272M6 20.25a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Zm12.75 0a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Z"/></svg>
        <span>Ver carrinho (${qtd})</span>
      </button>
    </div>`;
}

// Depois de marcar/desmarcar: acerta as caixinhas e a barra sem redesenhar
// a lista inteira (a rolagem fica onde está).
function atualizarCarrinhoNaLista(root) {
  const ids = carrinhoIds();
  root.querySelectorAll('[data-carrinho-check]').forEach(btn => {
    const marcado = ids.has(btn.dataset.carrinhoCheck);
    btn.setAttribute('aria-pressed', String(marcado));
    btn.closest('.convite-presente')?.classList.toggle('is-no-carrinho', marcado);
  });
  const atual = root.querySelector('.convite-carrinho-barra');
  const nova = barraDoCarrinhoHtml();
  if (atual && !nova) atual.remove();
  else if (atual && nova) atual.outerHTML = nova;
  else if (!atual && nova) root.querySelector('.convite-presentes')?.insertAdjacentHTML('beforebegin', nova);
}

function renderCheckoutCarrinho(root) {
  const itens = presentesDoCarrinho();
  if (!itens.length) {
    root.innerHTML = telaPublicaHtmlBranca('Carrinho', `
      <p class="convite-vazio">Seu carrinho está vazio. Marque a caixinha dos presentes que quer dar e volte aqui.</p>
      <button type="button" class="convite-botao" data-convite-ir="#presentes">Ver a lista de presentes</button>`);
    voltarPara(root, '#presentes');
    return;
  }
  const total = itens.reduce((s, p) => s + valorNoCarrinho(p), 0);

  const conteudo = `
    <div class="convite-carrinho-itens">
      ${itens.map(p => `
        <div class="convite-checkout-resumo convite-carrinho-item">
          <div class="convite-checkout-resumo-foto">${p.imagem ? `<img src="${escaparPublico(p.imagem)}" alt="">` : ''}</div>
          <div class="convite-carrinho-item-texto">
            <p class="convite-checkout-resumo-nome">${escaparPublico(p.nome)}</p>
            <p class="convite-checkout-resumo-valor">${brlPublico(valorNoCarrinho(p))}${p.vaquinha ? ' · o que falta na vaquinha' : ''}</p>
          </div>
          <button type="button" class="convite-carrinho-remover" data-carrinho-remover="${escaparPublico(p.id)}" aria-label="Tirar do carrinho" title="Tirar do carrinho">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>`).join('')}
      <div class="convite-carrinho-total"><span>Total (${itens.length} ${itens.length === 1 ? 'presente' : 'presentes'})</span><strong>${brlPublico(total)}</strong></div>
    </div>
    <form class="convite-form" data-convite-checkout novalidate>
      <label>Seu nome completo
        <input type="text" name="nome" required maxlength="120" autocomplete="name" placeholder="Como está no convite">
      </label>
      <label>E-mail
        <input type="email" name="email" required maxlength="200" autocomplete="email" placeholder="seu@email.com">
      </label>
${htmlCampoCpf()}
${htmlRecadoParaAnfitrioes()}
      <fieldset class="convite-pagamento">
        <legend>Forma de pagamento</legend>
        <label class="convite-pagamento-opcao is-ativo"><input type="radio" name="metodo" value="pix" checked><span>Pix</span></label>
        <label class="convite-pagamento-opcao"><input type="radio" name="metodo" value="cartao"><span>Cartão de crédito</span></label>
      </fieldset>
      <p class="convite-erro" hidden></p>
      <button type="submit" class="convite-botao">Continuar para o pagamento</button>
    </form>`;
  root.innerHTML = telaPublicaHtmlBranca('Carrinho', conteudo);
  voltarPara(root, '#presentes');

  root.querySelectorAll('[data-carrinho-remover]').forEach(btn => {
    btn.addEventListener('click', () => {
      carrinhoAlternar(btn.dataset.carrinhoRemover);
      renderCheckoutCarrinho(root);
    });
  });

  const form = root.querySelector('[data-convite-checkout]');
  const recado = ligarRecadoParaAnfitrioes(form);
  ligarCampoCpf(form);
  const erroEl = form.querySelector('.convite-erro');
  const botao = form.querySelector('button[type="submit"]');
  form.querySelectorAll('input[name="metodo"]').forEach(radio => {
    radio.addEventListener('change', () => {
      form.querySelectorAll('.convite-pagamento-opcao').forEach(o => o.classList.toggle('is-ativo', o.contains(radio)));
    });
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    erroEl.hidden = true;
    const nome = form.nome.value.trim();
    const email = form.email.value.trim();
    if (nome.length < 2) { erroEl.textContent = 'Digite seu nome completo.'; erroEl.hidden = false; return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { erroEl.textContent = 'Digite um e-mail válido.'; erroEl.hidden = false; return; }
    if (!cpfPareceValido(form.cpf.value)) { erroEl.textContent = 'Digite um CPF válido.'; erroEl.hidden = false; return; }
    if (recado.erro()) { erroEl.textContent = recado.erro(); erroEl.hidden = false; return; }
    const metodo = form.querySelector('input[name="metodo"]:checked')?.value || 'pix';

    botao.disabled = true;
    botao.textContent = 'Gerando o pagamento…';
    const r = await pagarPresentesPeloConvite(root, {
      titulo: 'Carrinho',
      descricao: `${itens.length} ${itens.length === 1 ? 'presente' : 'presentes'}`,
      itens: itens.map(p => ({ presente_id: p.id, valor: valorNoCarrinho(p) })),
      nome, email, cpf: form.cpf.value, metodo,
      mensagem: recado.texto(),
      video: recado.video(),
      // Pago: os presentes saem do carrinho.
      aoPagar: () => { const ids = carrinhoIds(); itens.forEach(p => ids.delete(String(p.id))); salvarCarrinho(ids); }
    });
    if (!r.ok) {
      botao.disabled = false;
      botao.textContent = 'Continuar para o pagamento';
      erroEl.textContent = r.mensagem;
      erroEl.hidden = false;
    }
  });
}

document.addEventListener('DOMContentLoaded', initPublicPreview);

/* ==========================================================================
   Prévia real nas abas clássicas (Informações, Anfitriões, Convite online,
   Produzir convite) — mesmo motor de renderização do Convite Digital, para
   sempre refletir exatamente o que foi criado em Aparência.
   ========================================================================== */

function renderClassicBuilderPreview() {
  const container = document.getElementById('classic-builder-preview');
  const conv = estadoDoConvite();
  if (!container || !conv) return;

  const gs = conv.globalStyle || {};
  container.style.setProperty('--bx-primary', gs.primaryColor || '#537bae');
  container.style.setProperty('--bx-radius', (gs.radius !== undefined ? gs.radius : 16) + 'px');
  container.style.setProperty('--bx-section-spacing', (gs.sectionSpacing !== undefined ? gs.sectionSpacing : 32) + 'px');

  const visible = (conv.sections || []).filter(s => !s.hidden);
  container.innerHTML = visible.map(section => renderAnySectionHtml(section, 'preview', 'mobile')).join('') + renderFixedFooterHtml();

  startCountdownTicker(container);
}

// Permite trocar a imagem do topo (primeira seção) diretamente pela prévia,
// tanto em Informações quanto em Anfitriões — clique/hover mostra "Alterar
// imagem", igual ao padrão já usado na foto de capa de Aparência.
function wireClassicPreviewCoverEdit(container, rerenderFn) {
  const firstSection = container.querySelector(':scope > section');
  if (!firstSection) return;
  firstSection.classList.add('group');
  // Nessa prévia (modo "preview") a seção não ganha as classes de capa do modo
  // de edição — garante aqui a mesma altura mínima da primeira seção em Aparência.
  firstSection.style.minHeight = '348px';
  const conv = estadoDoConvite();
  const targetSection = (conv && conv.sections || []).find(s => !s.isQuickNav && !s.isGiftsBlock);
  const salvarCapa = () => {
    if (conv === builderState) {
      pushHistory();
      renderCanvas();
      persistBuilderState(false);
    } else {
      try { localStorage.setItem(pageStorageKey('convite'), JSON.stringify(conv)); } catch (err) { /* sem armazenamento */ }
      persistBuilderStateRemote('convite', conv);
    }
  };

  let fileInput = document.getElementById('classic-preview-cover-file-input');
  if (!fileInput) {
    fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'image/*';
    fileInput.id = 'classic-preview-cover-file-input';
    fileInput.className = 'hidden';
    document.body.appendChild(fileInput);
  }

  const overlay = document.createElement('button');
  overlay.type = 'button';
  overlay.title = 'Alterar imagem do topo';
  overlay.className = 'absolute inset-0 m-auto w-fit h-fit px-3.5 py-1.5 rounded-full bg-black/45 hover:bg-black/70 text-white backdrop-blur-md text-xs font-semibold border border-white/40 shadow-lg transition-all flex items-center gap-1.5 cursor-pointer z-20 hover:scale-105 active:scale-95 opacity-0 group-hover:opacity-100';
  overlay.innerHTML = `
    <svg class="w-3.5 h-3.5 text-white pointer-events-none" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z"/>
      <path stroke-linecap="round" stroke-linejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z"/>
    </svg>
    <span>Alterar imagem</span>
  `;
  overlay.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    fileInput.click();
  });
  firstSection.appendChild(overlay);

  // Permite remover a imagem do topo, deixando essa seção sem foto de fundo.
  if (targetSection && targetSection.bgImage) {
    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.title = 'Remover imagem do topo';
    removeBtn.className = 'absolute top-2.5 right-2.5 w-7 h-7 rounded-full bg-black/60 hover:bg-red-600 text-white flex items-center justify-center backdrop-blur-md shadow-md transition-all z-20 cursor-pointer hover:scale-110 active:scale-95 opacity-0 group-hover:opacity-100';
    removeBtn.innerHTML = `<svg class="w-3.5 h-3.5 pointer-events-none" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>`;
    removeBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      targetSection.bgImage = '';
      salvarCapa();
      rerenderFn();
    });
    firstSection.appendChild(removeBtn);
  }

  fileInput.onchange = (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const target = targetSection;
      if (target) {
        target.bgImage = ev.target.result;
        salvarCapa();
        rerenderFn();
      }
    };
    reader.readAsDataURL(file);
    fileInput.value = '';
  };
}

// Prévia da aba "Anfitriões": mesmo convite real, mas sem os elementos de
// Título/Texto (a "capa" do convite) — no lugar deles entra apenas uma caixa
// branca com a lista de anfitriões com acesso à conta (mesmos dados de
// #hosts-team-list, preenchidos ali mesmo em Anfitriões).
function renderAnfitrioesPreview() {
  const container = document.getElementById('classic-builder-preview');
  const conv = estadoDoConvite();
  if (!container || !conv) return;

  const gs = conv.globalStyle || {};
  container.style.setProperty('--bx-primary', gs.primaryColor || '#537bae');
  container.style.setProperty('--bx-radius', (gs.radius !== undefined ? gs.radius : 16) + 'px');
  container.style.setProperty('--bx-section-spacing', (gs.sectionSpacing !== undefined ? gs.sectionSpacing : 32) + 'px');

  const visible = (conv.sections || []).filter(s => !s.hidden);
  container.innerHTML = visible.map(section => renderAnySectionHtml(section, 'preview', 'mobile')).join('') + renderFixedFooterHtml();

  // Remove os elementos de Título/Texto (a marcação de tipo só existe em modo preview).
  container.querySelectorAll('[data-element-type="titulo"], [data-element-type="texto"]').forEach(node => node.remove());

  // Monta a caixa com a lista de anfitriões a partir do que está em "Anfitriões com Acesso à Conta".
  const hostsTeamItems = document.querySelectorAll('#hosts-team-list > div');
  // Só o nome de cada anfitrião (sem bolinha de iniciais nem "Criador(a)").
  const hostsCardsHtml = Array.from(hostsTeamItems || []).map(item => {
    const nameEl = item.querySelector('.host-name-text, .host-name-input') || item.querySelector('p.font-bold');
    const nameText = nameEl ? ((nameEl.value !== undefined ? nameEl.value : '') || nameEl.textContent || '').trim() : 'Anfitrião';
    return `
      <div class="classic-preview-host-card">
        <div class="classic-preview-host-info">
          <p>${escapeHtml(nameText || 'Anfitrião')}</p>
        </div>
      </div>
    `;
  }).join('');

  // Fundo atrás dos nomes = mesma cor da seção de botões (padronizado).
  const fundoBotoes = corDeFundoDosBotoes();
  const boxesHtml = `
    <div class="classic-preview-info-boxes"${fundoBotoes ? ` style="background-color:${fundoBotoes};"` : ''}>
      <div class="classic-preview-info-box">
        <h4>Anfitriões</h4>
        <div class="classic-preview-hosts-list">${hostsCardsHtml}</div>
      </div>
    </div>
  `;
  const firstSection = container.querySelector(':scope > section');
  if (firstSection) {
    firstSection.insertAdjacentHTML('afterend', boxesHtml);
  } else {
    container.insertAdjacentHTML('afterbegin', boxesHtml);
  }

  wireClassicPreviewCoverEdit(container, renderAnfitrioesPreview);
  startCountdownTicker(container);
}
window.renderAnfitrioesPreview = renderAnfitrioesPreview;

// Prévia da aba "Informações": mesmo convite real, mas sem os elementos de
// Título/Texto (a "capa" do convite) — no lugar deles entram Dress Code e
// Informações Gerais (preenchidos ali mesmo em Informações), sempre em
// caixas brancas, para não depender da cor de fundo escolhida em Aparência.
function renderInformacoesPreview() {
  const container = document.getElementById('classic-builder-preview');
  const conv = estadoDoConvite();
  if (!container || !conv) return;

  const gs = conv.globalStyle || {};
  container.style.setProperty('--bx-primary', gs.primaryColor || '#537bae');
  container.style.setProperty('--bx-radius', (gs.radius !== undefined ? gs.radius : 16) + 'px');
  container.style.setProperty('--bx-section-spacing', (gs.sectionSpacing !== undefined ? gs.sectionSpacing : 32) + 'px');

  // Mesma tela do convite publicado (#informacoes), montada com os campos ao
  // lado — o que já está salvo no evento serve de reserva.
  const activeEvent = getActiveEventForBuilder();
  const details = (activeEvent && activeEvent.eventDetails) || {};
  const campo = (id, salvo) => (document.getElementById(id)?.value || salvo || '').trim();
  // Dress code e Informações gerais: campo vazio = não aparece (mesmo com algo antigo salvo).
  const soDoCampo = (id, salvo) => {
    const el = document.getElementById(id);
    return (el ? el.value : (salvo || '')).trim();
  };
  const ev = {
    data: campo('editor-data-date', details.date),
    hora: campo('editor-data-time', details.time),
    data_fim: campo('editor-data-end-date', details.endDate),
    hora_fim: campo('editor-data-end-time', details.endTime),
    local: campo('editor-data-location', details.locationName),
    endereco: campo('editor-data-address', details.address),
    cidade: campo('editor-data-city', details.city),
    uf: campo('editor-data-state', details.state),
    referencia: soDoCampo('editor-data-reference', details.referencePoint),
    dresscode: soDoCampo('editor-data-dresscode', details.dresscode),
    informacoes: soDoCampo('editor-data-general-info', details.generalInfo)
  };
  container.innerHTML = telaInformacoesHtml(ev);
  // Prévia: sem o título "Informações" e a setinha de voltar (só no convite publicado).
  container.querySelector('.convite-tela-topo')?.remove();
}

// "Av. Duquesa de Goiás, 825" + "São Paulo" + "SP" → "Av. Duquesa de Goiás, 825, São Paulo - SP"
// (cidade/UF vêm dos campos Estado e Cidade de Informações).
function enderecoComCidade(endereco, cidade, uf) {
  // Cidade por extenso + UF em 2 letras; sem a cidade, a sigla sozinha não entra.
  const nomeCidade = (cidade || '').trim();
  const cidadeUf = nomeCidade ? [nomeCidade, (uf || '').trim().toUpperCase()].filter(Boolean).join(' - ') : '';
  return [(endereco || '').trim(), cidadeUf].filter(Boolean).join(', ');
}

// Ícones oficiais dos apps no menu "Como chegar" (assets/).
const ICONE_GOOGLE_MAPS = '<img src="/assets/googlemaps-icon.png" alt="" aria-hidden="true">';
const ICONE_WAZE = '<img src="/assets/waze-icon.png" alt="" aria-hidden="true">';

// "Google Maps" e "Waze" com o endereço do evento (abre o app no celular).
function botoesDeMapaHtml(local, endereco) {
  // Busca pelo endereço; o nome do local (ex.: "Churrasqueira do prédio") só
  // atrapalha o Maps/Waze — entra apenas quando não há endereço.
  const destino = (endereco || '').trim() || (local || '').trim();
  if (!destino) return '';
  const q = encodeURIComponent(destino);
  const maps = `https://www.google.com/maps/search/?api=1&query=${q}`;
  const waze = `https://waze.com/ul?q=${q}&navigate=yes`;
  const attr = v => String(v).replace(/&/g, '&amp;').replace(/"/g, '&quot;');
  // Um botão "Como chegar?" que abre um menu para a pessoa escolher o app.
  return `
    <details class="convite-como-chegar">
      <summary class="convite-como-chegar-btn">Como chegar?</summary>
      <div class="convite-como-chegar-menu">
        <a href="${attr(maps)}" target="_blank" rel="noopener noreferrer">${ICONE_GOOGLE_MAPS}<span>Google Maps</span></a>
        <a href="${attr(waze)}" target="_blank" rel="noopener noreferrer">${ICONE_WAZE}<span>Waze</span></a>
      </div>
    </details>`;
}

// Fecha o menu "Como chegar?" ao clicar fora dele ou escolher um app.
document.addEventListener('click', (e) => {
  document.querySelectorAll('details.convite-como-chegar[open]').forEach(menu => {
    if (!menu.contains(e.target) || e.target.closest('.convite-como-chegar-menu a')) menu.removeAttribute('open');
  });
});

// A prévia de Informações acompanha os campos enquanto a pessoa digita.
let infoPreviewTimer = null;
document.addEventListener('input', (e) => {
  const id = e.target && e.target.id;
  if (!id || !id.startsWith('editor-data-')) return;
  clearTimeout(infoPreviewTimer);
  infoPreviewTimer = setTimeout(renderInformacoesPreview, 150);
});
document.addEventListener('change', (e) => {
  const id = e.target && e.target.id;
  if (!id || !id.startsWith('editor-data-')) return;
  clearTimeout(infoPreviewTimer);
  infoPreviewTimer = setTimeout(renderInformacoesPreview, 150);
});

/* -------------------- Save the Date › Compartilhar -------------------- */
// O Save the Date é só texto (com a formatação do WhatsApp): vai direto
// para o WhatsApp da pessoa, para o e-mail ou copiado para o Instagram.
function textoDoSaveTheDate() {
  if (typeof builderState.mensagem === 'string') return builderState.mensagem.trim();
  return mensagemDosElementos(builderState);
}

// Só no celular o WhatsApp abre pelo app; no computador, pelo WhatsApp Web.
function ehCelular() {
  const uaData = /** @type {any} */ (navigator).userAgentData;
  if (uaData && typeof uaData.mobile === 'boolean') return uaData.mobile;
  return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent || '');
}

async function copiarTexto(texto) {
  try { await navigator.clipboard.writeText(texto); return true; } catch (e) { return false; }
}

async function compartilharSaveTheDate(canal, status) {
  const avisar = (t) => { if (!status) return; status.textContent = t; status.classList.toggle('hidden', !t); };
  persistBuilderState(true);
  const texto = textoDoSaveTheDate();
  if (!texto) { avisar('Escreva o texto do Save the Date antes de compartilhar.'); return false; }
  if (canal === 'whatsapp') {
    const url = (ehCelular() ? 'https://wa.me/?text=' : 'https://web.whatsapp.com/send?text=') + encodeURIComponent(texto);
    window.open(url, '_blank');
    avisar('');
    return true;
  }
  if (canal === 'email') {
    window.location.href = 'mailto:?subject=' + encodeURIComponent('Save the Date') + '&body=' + encodeURIComponent(texto);
    avisar('');
    return true;
  }
  // Instagram não recebe texto por link: copia para colar na conversa.
  const copiou = await copiarTexto(texto);
  window.open(ehCelular() ? 'https://www.instagram.com/direct/inbox/' : 'https://www.instagram.com/direct/inbox/', '_blank');
  avisar(copiou ? 'Texto copiado. Cole na conversa do Instagram.' : 'Copie o texto e cole na conversa do Instagram.');
  return true;
}

function initCompartilharSaveTheDate() {
  const wrap = document.getElementById('builder-share-wrap');
  const btn = document.getElementById('builder-share');
  const menu = document.getElementById('builder-share-menu');
  const status = document.getElementById('builder-share-status');
  if (!wrap || !btn || !menu || wrap.dataset.ligado) return;
  wrap.dataset.ligado = '1';
  const fechar = () => { menu.classList.add('hidden'); btn.setAttribute('aria-expanded', 'false'); };
  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    const abrir = menu.classList.contains('hidden');
    menu.classList.toggle('hidden', !abrir);
    btn.setAttribute('aria-expanded', String(abrir));
    if (abrir && status) { status.textContent = ''; status.classList.add('hidden'); }
  });
  menu.addEventListener('click', (e) => e.stopPropagation());
  menu.querySelectorAll('[data-compartilhar]').forEach(item => {
    item.addEventListener('click', async () => {
      menu.querySelectorAll('[data-compartilhar]').forEach(b => { b.disabled = true; });
      try {
        const ok = await compartilharSaveTheDate(item.dataset.compartilhar, status);
        if (ok && typeof window.markPlatformTaskAchieved === 'function') window.markPlatformTaskAchieved('savethedate');
      } finally {
        menu.querySelectorAll('[data-compartilhar]').forEach(b => { b.disabled = false; });
      }
    });
  });
  document.addEventListener('click', fechar);
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') fechar(); });
}
window.switchBuilderPage = switchBuilderPage;
// Mesmo seletor de cor do inspector, usado também no pop-up da mesa (Mapa do evento).
window.colorSwatchPopoverHtml = colorSwatchPopoverHtml;
window.wireColorSwatchPopovers = wireColorSwatchPopovers;
