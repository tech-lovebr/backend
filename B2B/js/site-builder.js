/* ==========================================================================
   LOVE B2B — Construtor visual de páginas (Editar meu site)
   Somente front-end. Estado salvo em localStorage (sem backend ainda).
   ========================================================================== */

const BUILDER_STORAGE_KEY = 'b2b-site-builder-page';
const BUILDER_PUBLISHED_KEY = 'b2b-site-builder-published';
const BUILDER_PUBLISHED_STATE_KEY = 'b2b-site-builder-published-state';

const CHECKOUT_STORAGE_KEY = 'b2b-site-builder-checkout';
const CHECKOUT_PUBLISHED_KEY = 'b2b-site-builder-checkout-published';
const CHECKOUT_PUBLISHED_STATE_KEY = 'b2b-site-builder-checkout-published-state';

/* -------------------- Ícones -------------------- */

const BI = {
  text: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path stroke-linecap="round" stroke-linejoin="round" d="M4 6h16M4 12h16M4 18h10"/></svg>',
  heading: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path stroke-linecap="round" stroke-linejoin="round" d="M6 4v16M18 4v16M6 12h12"/></svg>',
  subtitle: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path stroke-linecap="round" stroke-linejoin="round" d="M4 7h16M4 12h10M4 17h6"/></svg>',
  image: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="8.5" cy="9.5" r="1.5"/><path stroke-linecap="round" stroke-linejoin="round" d="m5 18 5-5 3 3 4-5 4 5"/></svg>',
  video: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="2.5" y="5.5" width="14" height="13" rx="2"/><path stroke-linecap="round" stroke-linejoin="round" d="m16.5 10 5-3v10l-5-3"/></svg>',
  button: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="8" width="18" height="8" rx="4"/></svg>',
  link: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path stroke-linecap="round" stroke-linejoin="round" d="M13.19 8.688a4.5 4.5 0 0 1 1.242 7.244l-4.5 4.5a4.5 4.5 0 0 1-6.364-6.364l1.757-1.757m13.35-.622 1.757-1.757a4.5 4.5 0 0 0-6.364-6.364l-4.5 4.5a4.5 4.5 0 0 0 1.242 7.244"/></svg>',
  icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path stroke-linecap="round" stroke-linejoin="round" d="m11.48 3.5 2.11 4.28 4.72.69-3.42 3.33.81 4.7L11.48 14l-4.22 2.22.81-4.7-3.42-3.33 4.72-.69 2.11-4.28Z"/></svg>',
  social: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="6" r="2.5"/><circle cx="18" cy="18" r="2.5"/><path stroke-linecap="round" d="m8.2 10.8 7.6-3.6M8.2 13.2l7.6 3.6"/></svg>',
  gallery: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="3" width="8" height="8" rx="1.5"/><rect x="13" y="3" width="8" height="8" rx="1.5"/><rect x="3" y="13" width="8" height="8" rx="1.5"/><rect x="13" y="13" width="8" height="8" rx="1.5"/></svg>',
  carousel: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="7" y="5" width="10" height="14" rx="2"/><path stroke-linecap="round" stroke-linejoin="round" d="M3 9v6m18-6v6"/></svg>',
  testimonials: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path stroke-linecap="round" stroke-linejoin="round" d="M7.5 8.25h9M7.5 12h6M4.5 4.5h15A1.5 1.5 0 0 1 21 6v10.5a1.5 1.5 0 0 1-1.5 1.5H9l-4 3v-3H4.5A1.5 1.5 0 0 1 3 16.5V6a1.5 1.5 0 0 1 1.5-1.5Z"/></svg>',
  form: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"/></svg>',
  map: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path stroke-linecap="round" stroke-linejoin="round" d="M12 21s7-6.5 7-12a7 7 0 1 0-14 0c0 5.5 7 12 7 12Z"/><circle cx="12" cy="9" r="2.5"/></svg>',
  divider: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path stroke-linecap="round" d="M4 12h16"/></svg>',
  spacer: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path stroke-linecap="round" stroke-linejoin="round" d="M12 3v18M8 7l4-4 4 4M8 17l4 4 4-4"/></svg>',
  list: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="4.5" cy="6" r="1"/><circle cx="4.5" cy="12" r="1"/><circle cx="4.5" cy="18" r="1"/><path stroke-linecap="round" d="M9 6h11M9 12h11M9 18h11"/></svg>',
  columns: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="4" width="7" height="16" rx="1.5"/><rect x="14" y="4" width="7" height="16" rx="1.5"/></svg>',
  section: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="4.5" width="18" height="6" rx="1.5"/><rect x="3" y="13.5" width="18" height="6" rx="1.5"/></svg>',
  html: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path stroke-linecap="round" stroke-linejoin="round" d="m8.25 8-4 4 4 4m7.5-8 4 4-4 4M13 5l-2 14"/></svg>',
  code: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path stroke-linecap="round" stroke-linejoin="round" d="M6.75 5.25 2.25 12l4.5 6.75M17.25 5.25 21.75 12l-4.5 6.75"/></svg>',
  trash: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0"/></svg>',
  duplicate: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="8" y="8" width="12" height="12" rx="2"/><path stroke-linecap="round" stroke-linejoin="round" d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/></svg>',
  move: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 1L17 6L14.5 6L14.5 9.5L18 9.5L18 7L23 12L18 17L18 14.5L14.5 14.5L14.5 18L17 18L12 23L7 18L9.5 18L9.5 14.5L6 14.5L6 17L1 12L6 7L6 9.5L9.5 9.5L9.5 6L7 6Z"/></svg>',
  grip: '<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="8" cy="6" r="1.8"/><circle cx="16" cy="6" r="1.8"/><circle cx="8" cy="12" r="1.8"/><circle cx="16" cy="12" r="1.8"/><circle cx="8" cy="18" r="1.8"/><circle cx="16" cy="18" r="1.8"/></svg>',
  plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15"/></svg>',
  close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12"/></svg>',
  chevronRight: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path stroke-linecap="round" stroke-linejoin="round" d="m9 5 7 7-7 7"/></svg>',
  chevronDown: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path stroke-linecap="round" stroke-linejoin="round" d="m5 9 7 7 7-7"/></svg>',
  bold: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 4.5h6.5a3.5 3.5 0 0 1 0 7H6zm0 7h7a3.5 3.5 0 0 1 0 7H6z"/></svg>',
  italic: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" d="M10 4.5h7M7 19.5h7M13.5 4.5l-3 15"/></svg>',
  underline: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" d="M6 4v7a6 6 0 0 0 12 0V4M5 20h14"/></svg>',
  alignLeft: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" d="M4 6h16M4 12h10M4 18h14"/></svg>',
  alignCenter: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" d="M4 6h16M7 12h10M5 18h14"/></svg>',
  alignRight: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" d="M4 6h16M10 12h10M6 18h14"/></svg>',
  eye: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M2.25 12s3.75-7.5 9.75-7.5 9.75 7.5 9.75 7.5-3.75 7.5-9.75 7.5-9.75-7.5-9.75-7.5Z"/><circle cx="12" cy="12" r="3"/></svg>',
  layers: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path stroke-linecap="round" stroke-linejoin="round" d="m12 3 9 5-9 5-9-5 9-5Zm-9 9 9 5 9-5"/></svg>',
  cursor: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path stroke-linecap="round" stroke-linejoin="round" d="m5 3 5.5 15 2-6.5L19 9.5 5 3Z"/></svg>',
  check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path stroke-linecap="round" stroke-linejoin="round" d="m4.5 12.75 6 6 9-13.5"/></svg>',
  heart: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path stroke-linecap="round" stroke-linejoin="round" d="M12 20.25c-4.5-3-9-6.5-9-11a5 5 0 0 1 9-3 5 5 0 0 1 9 3c0 4.5-4.5 8-9 11Z"/></svg>',
  phone: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path stroke-linecap="round" stroke-linejoin="round" d="M2.25 6.75c0 8.28 6.97 15 15.25 15l3.5-3.5-4.5-2.5-2 2c-2.5-1-5-3.5-6-6l2-2-2.5-4.5-3.5 1.5z"/></svg>',
  mail: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="2.5" y="5" width="19" height="14" rx="2"/><path stroke-linecap="round" stroke-linejoin="round" d="m3 6.5 9 6.5 9-6.5"/></svg>',
  pin: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path stroke-linecap="round" stroke-linejoin="round" d="M12 21s7-6.5 7-12a7 7 0 1 0-14 0c0 5.5 7 12 7 12Z"/><circle cx="12" cy="9" r="2.5"/></svg>',
  whatsapp: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21h.01c5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01a9.82 9.82 0 0 0-7.02-2.91zm0 18.15h-.01c-1.48 0-2.93-.4-4.19-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.26 8.26 0 0 1-1.26-4.38c0-4.54 3.7-8.24 8.24-8.24 2.2 0 4.27.86 5.83 2.42a8.18 8.18 0 0 1 2.41 5.83c.02 4.54-3.68 8.23-8.23 8.23zm4.52-6.16c-.25-.12-1.47-.72-1.69-.81-.23-.08-.39-.12-.56.12-.17.25-.64.81-.78.97-.14.17-.29.19-.54.06-.25-.12-1.05-.39-1.99-1.23-.74-.66-1.23-1.47-1.38-1.72-.14-.25-.02-.38.11-.51.11-.11.25-.29.37-.43s.17-.25.25-.41c.08-.17.04-.31-.02-.43-.06-.12-.56-1.34-.76-1.84-.2-.48-.41-.42-.56-.43h-.48c-.17 0-.43.06-.66.31-.22.25-.86.85-.86 2.07s.89 2.4 1.01 2.56c.12.17 1.75 2.67 4.23 3.74.59.26 1.05.41 1.41.52.59.19 1.13.16 1.56.1.48-.07 1.47-.6 1.67-1.18.21-.58.21-1.07.14-1.18-.06-.11-.22-.17-.47-.29z"/></svg>',
  share: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="6" r="2.5"/><circle cx="18" cy="18" r="2.5"/><path stroke-linecap="round" d="m8.2 10.8 7.6-3.6M8.2 13.2l7.6 3.6"/></svg>',
  gift: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path stroke-linecap="round" stroke-linejoin="round" d="M20 12v9H4v-9M2 7h20v5H2zM12 22V7M12 7H7.5a2.5 2.5 0 1 1 0-5C11 2 12 7 12 7ZM12 7h4.5a2.5 2.5 0 1 0 0-5C13 2 12 7 12 7Z"/></svg>',
  style: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path stroke-linecap="round" stroke-linejoin="round" d="M9.53 16.122a3 3 0 0 0-5.78 1.128 2.25 2.25 0 0 1-2.4 2.245 4.5 4.5 0 0 0 8.4-2.245c0-.399-.078-.78-.22-1.128Zm0 0a15.998 15.998 0 0 0 3.388-1.62m-5.043-.025a15.994 15.994 0 0 1 1.622-3.395m3.42 3.42a15.995 15.995 0 0 0 4.764-4.648l3.876-5.814a1.151 1.151 0 0 0-1.597-1.597L14.146 6.32a15.996 15.996 0 0 0-4.649 4.763m3.42 3.42a6.776 6.776 0 0 0-3.42-3.42" /></svg>',
  chain: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2.5" y="9" width="8" height="6" rx="3"/><rect x="13.5" y="9" width="8" height="6" rx="3"/><path stroke-linecap="round" d="M9 12h6"/></svg>',
  lock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="4.5" y="10.5" width="15" height="9.5" rx="2"/><path stroke-linecap="round" d="M7.5 10.5V7a4.5 4.5 0 0 1 9 0v3.5"/></svg>',
  info: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="9"/><path stroke-linecap="round" d="M12 11v5.25"/><circle cx="12" cy="8" r="0.75" fill="currentColor" stroke="none"/></svg>',
  editSquare: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.375 2.625a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4Z"/></svg>',
  palette: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.286-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z"/><circle cx="13.5" cy="6.5" r="1" fill="currentColor" stroke="none"/><circle cx="17.5" cy="10.5" r="1" fill="currentColor" stroke="none"/><circle cx="8.5" cy="7.5" r="1" fill="currentColor" stroke="none"/><circle cx="6.5" cy="12.5" r="1" fill="currentColor" stroke="none"/></svg>'
};

const ICON_PICKER = {
  icon: 'Estrela', check: 'Concluído', heart: 'Coração', phone: 'Telefone', mail: 'E-mail', pin: 'Localização',
  map: 'Mapa', whatsapp: 'WhatsApp', share: 'Compartilhar', gift: 'Presente'
};

const LIST_ICON_OPTIONS = { '': 'Nenhum', star: 'Estrela', arrow: 'Seta', dot: 'Bolinha', check: 'Concluído', heart: 'Coração' };
const LIST_ICON_SVG = {
  star: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path stroke-linecap="round" stroke-linejoin="round" d="m11.48 3.5 2.11 4.28 4.72.69-3.42 3.33.81 4.7L11.48 14l-4.22 2.22.81-4.7-3.42-3.33 4.72-.69 2.11-4.28Z"/></svg>',
  arrow: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path stroke-linecap="round" stroke-linejoin="round" d="m9 5 7 7-7 7"/></svg>',
  dot: '<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="6"/></svg>',
  check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path stroke-linecap="round" stroke-linejoin="round" d="m4.5 12.75 6 6 9-13.5"/></svg>',
  heart: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path stroke-linecap="round" stroke-linejoin="round" d="M12 20.25c-4.5-3-9-6.5-9-11a5 5 0 0 1 9-3 5 5 0 0 1 9 3c0 4.5-4.5 8-9 11Z"/></svg>'
};

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

const VIDEO_ASPECT_RATIOS = { '16:9': 56.25, '9:16': 177.78, '1:1': 100, '4:5': 125 };
const VIDEO_ASPECT_RATIO_OPTIONS = [
  { value: '16:9', label: 'Paisagem (16:9)' },
  { value: '9:16', label: 'Retrato (9:16)' },
  { value: '1:1', label: 'Quadrado (1:1)' },
  { value: '4:5', label: 'Vertical (4:5)' }
];

const TESTIMONIALS_LAYOUT_OPTIONS = [
  { value: 'grid', label: 'Grid / Grade de Cards' },
  { value: 'carrossel', label: 'Carrossel / Slider' },
  { value: 'marquee', label: 'Marquee / Ticker Infinito' }
];

const LAYOUT_PRESETS = [
  { label: '1 coluna', widths: [100] },
  { label: '2 colunas', widths: [50, 50] },
  { label: '3 colunas', widths: [33.33, 33.33, 33.34] },
  { label: '4 colunas', widths: [25, 25, 25, 25] },
  { label: '30 / 70', widths: [30, 70] },
  { label: '70 / 30', widths: [70, 30] }
];

const ELEMENT_GROUPS = [
  { title: 'Básicos', types: ['texto', 'titulo', 'imagem', 'botao', 'video', 'icone', 'separador', 'espacamento', 'link', 'lista'] },
  { title: 'Avançado', types: ['galeria', 'carrossel', 'depoimentos', 'mapa', 'redes'] }
];

function blockPreviewHtml(widths) {
  return `<div class="builder-el-block-preview">${widths.map(w => `<span style="flex:${w};"></span>`).join('')}</div>`;
}

const COLUMN_LAYOUT_ITEMS = LAYOUT_PRESETS.slice(0, 4).map(preset => ({
  key: preset.widths.join('-'),
  label: preset.label,
  widths: preset.widths,
  icon: blockPreviewHtml(preset.widths)
}));

const FONT_OPTIONS = [
  { value: '', label: 'Padrão (Inter)' },
  { value: "'Poppins', sans-serif", label: 'Poppins' },
  { value: "'Montserrat', sans-serif", label: 'Montserrat' },
  { value: "'Playfair Display', serif", label: 'Playfair Display' },
  { value: "'Merriweather', serif", label: 'Merriweather' },
  { value: "'Roboto', sans-serif", label: 'Roboto' },
  { value: "'Lato', sans-serif", label: 'Lato' },
  { value: "'Oswald', sans-serif", label: 'Oswald' },
  { value: "'Raleway', sans-serif", label: 'Raleway' },
  { value: "'Nunito', sans-serif", label: 'Nunito' },
  { value: "'Italianno', cursive", label: 'Italianno' },
  { value: "'Fondamento', cursive", label: 'Fondamento' },
  { value: "'Great Vibes', cursive", label: 'Great Vibes' },
  { value: "'Bodoni Moda', serif", label: 'Bodoni Moda' },
  { value: "'Voltaire', sans-serif", label: 'Voltaire' },
  { value: "'Cormorant Garamond', serif", label: 'Cormorant Garamond' },
  { value: "'Prata', serif", label: 'Prata' },
  { value: "'Fraunces', serif", label: 'Fraunces' }
];

const HEADING_LEVELS = [1, 2, 3, 4, 5];

function defaultHeadingStyles() {
  const out = { menu: { fontFamily: '', bold: true, italic: false, underline: false } };
  HEADING_LEVELS.forEach(n => { out[n] = { fontFamily: '', bold: true, italic: false, underline: false }; });
  return out;
}

const ELEMENT_META = {
  texto: { label: 'Texto', icon: BI.text },
  titulo: { label: 'Título', icon: BI.heading },
  subtitulo: { label: 'Subtítulo', icon: BI.subtitle },
  botao: { label: 'Botão', icon: BI.button },
  link: { label: 'Link', icon: BI.link },
  icone: { label: 'Ícone', icon: BI.icon },
  imagem: { label: 'Imagem', icon: BI.image },
  video: { label: 'Vídeo', icon: BI.video },
  secao: { label: 'Seção', icon: BI.section },
  colunas: { label: 'Colunas', icon: BI.columns },
  separador: { label: 'Separador', icon: BI.divider },
  espacamento: { label: 'Espaçamento', icon: BI.spacer },
  lista: { label: 'Lista', icon: BI.list },
  galeria: { label: 'Galeria', icon: BI.gallery },
  carrossel: { label: 'Carrossel', icon: BI.carousel },
  depoimentos: { label: 'Depoimentos', icon: BI.testimonials },
  formulario: { label: 'Formulário', icon: BI.form },
  mapa: { label: 'Mapa', icon: BI.map },
  redes: { label: 'Redes sociais', icon: BI.social },
  html: { label: 'HTML personalizado', icon: BI.html },
  codigo: { label: 'Código personalizado', icon: BI.code }
};

/* -------------------- Estado -------------------- */

let builderState = null;
let currentPageKey = 'home';
let historyStack = [];
let historyIndex = -1;
let suppressHistory = false;
let selectedId = null;
let currentDevice = 'desktop';
let sortableInstances = [];
let clipboardEl = null;
let hasUnsavedChanges = false;
let pendingNavigationHref = null;

function uid(prefix) {
  return prefix + '-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

const RESERVED_SLUGS = ['sophia-eventos', 'buffet-real', 'espaco-jardim', 'casa-de-festas', 'eventos-vip', 'admin', 'love'];

function slugify(value) {
  return (value || '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function defaultSiteSettings() {
  return {
    slug: 'sophia-eventos',
    social: [
      { platform: 'instagram', url: 'https://instagram.com/sophiaeventos' },
      { platform: 'whatsapp', url: 'https://wa.me/5511999999999' }
    ],
    sections: { produtos: true, portfolio: true, depoimentos: true, contato: false },
    seo: defaultSeoSettings()
  };
}

function defaultSeoSettings() {
  return { metaTitle: '', metaDescription: '', ogImage: '', favicon: '', headerScripts: '', footerScripts: '' };
}

function defaultHeaderState() {
  return {
    logoImage: '',
    logoScale: 1,
    logoOffsetX: 0,
    logoOffsetY: 0,
    ctaText: 'Fale conosco',
    ctaFormId: '',
    sticky: true,
    style: 'padrao',
    menuStyle: 'padrao',
    bgColor: '#FAFAFA',
    textColor: '#3F3F46',
    ctaBgColor: '',
    ctaTextColor: '#ffffff',
    menuItems: []
  };
}

function defaultMenuItems() {
  return [
    { id: uid('menu'), label: 'Início', visible: true },
    { id: uid('menu'), label: 'Meus Serviços', visible: true },
    { id: uid('menu'), label: 'Sobre', visible: true },
    { id: uid('menu'), label: 'Orçamento', visible: true }
  ];
}

function defaultPageState() {
  const menuItems = defaultMenuItems();
  const header = defaultHeaderState();
  header.menuItems = menuItems;
  const menuIdByKey = {
    apresentacao: menuItems[0].id,
    servicos: menuItems[1].id,
    sobre: menuItems[2].id,
    orcamento: menuItems[3].id
  };
  return {
    name: 'Página inicial',
    globalStyle: { primaryColor: '#183b54', radius: 10, sectionSpacing: 40, headings: defaultHeadingStyles() },
    siteSettings: defaultSiteSettings(),
    header,
    sections: FIXED_SECTIONS.map(f => buildFixedSection(f.key, menuIdByKey[f.key]))
  };
}

function loadBuilderState() {
  try {
    const raw = localStorage.getItem(BUILDER_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (!parsed.globalStyle) parsed.globalStyle = { primaryColor: '#183b54', radius: 10, sectionSpacing: 40, headings: defaultHeadingStyles() };
      else if (!parsed.globalStyle.headings) parsed.globalStyle.headings = defaultHeadingStyles();
      else {
        const headingDefaults = defaultHeadingStyles();
        HEADING_LEVELS.forEach(n => {
          if (!parsed.globalStyle.headings[n]) parsed.globalStyle.headings[n] = headingDefaults[n];
        });
        if (!parsed.globalStyle.headings.menu) parsed.globalStyle.headings.menu = headingDefaults.menu;
      }
      if (!parsed.siteSettings) parsed.siteSettings = defaultSiteSettings();
      else if (!parsed.siteSettings.seo) parsed.siteSettings.seo = defaultSeoSettings();
      if (!parsed.header) parsed.header = defaultHeaderState();
      else {
        const headerDefaults = defaultHeaderState();
        Object.keys(headerDefaults).forEach(key => {
          if (parsed.header[key] === undefined) parsed.header[key] = headerDefaults[key];
        });
      }
      migrateElementDefaults(parsed);
      return parsed;
    }
  } catch (e) { /* ignora estado corrompido */ }
  return defaultPageState();
}

/* -------------------- Página: Meu Checkout -------------------- */

const CHECKOUT_ICONS = {
  mail: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/></svg>',
  user: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="3.5"/><path d="M5 20c0-3.5 3-6 7-6s7 2.5 7 6"/></svg>',
  globe: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.5 4 6 4 9s-1.5 6.5-4 9c-2.5-2.5-4-6-4-9s1.5-6.5 4-9Z"/></svg>',
  card: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="2.5" y="5.5" width="19" height="13" rx="2"/><path d="M2.5 10h19"/></svg>',
  calendar: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="3.5" y="5" width="17" height="16" rx="2"/><path d="M8 3v4M16 3v4M3.5 10h17"/></svg>',
  lock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="4.5" y="10.5" width="15" height="9.5" rx="2"/><path d="M7.5 10.5V7a4.5 4.5 0 0 1 9 0v3.5"/></svg>',
  bolt: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M13 3 4 14h6l-1 7 9-11h-6l1-7Z"/></svg>',
  phone: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="2.5" width="12" height="19" rx="2.5"/><path d="M10.5 19h3"/></svg>',
  pix: '<img src="../assets/pix-icone.png" alt="Pix" style="width:100%;height:100%;object-fit:contain;">',
  applePay: '<img src="../assets/apple-pay-icone.png" alt="Apple Pay" style="width:100%;height:100%;object-fit:contain;">'
};

function checkoutBoxEl(text, extraStyle) {
  return withDesktopStyle(Object.assign(createElement('texto'), { content: text }), Object.assign({
    textAlign: 'left', color: '#3F3F46', fontSize: '30px',
    backgroundColor: '#ffffff', paddingTop: '13px', paddingBottom: '13px', paddingLeft: '14px', paddingRight: '14px',
    borderRadius: '8px', boxShadow: 'inset 0 0 0 1px #E4E4E7', marginTop: '10px'
  }, extraStyle || {}));
}

function checkoutField(iconKey, label, extraStyle) {
  const icon = CHECKOUT_ICONS[iconKey] || '';
  const content = `<span style="display:inline-flex;align-items:center;gap:9px;"><span style="display:inline-flex;width:18px;height:18px;flex-shrink:0;color:#71717A;">${icon}</span><span>${escapeHtml(label)}</span></span>`;
  return checkoutBoxEl(content, extraStyle);
}

function checkoutBadgeCol(label) {
  return {
    id: uid('col'), width: 25,
    elements: [
      withDesktopStyle(Object.assign(createElement('icone'), { iconKey: 'check' }), { color: '#16A34A', fontSize: '20px' }),
      withDesktopStyle(Object.assign(createElement('texto'), { content: label }), { textAlign: 'center', fontSize: '11px', color: '#71717A' })
    ]
  };
}

/* Template fixo do checkout (2 colunas: dados de cobrança + pagamento à esquerda,
   resumo da compra à direita) inspirado no exemplo de referência anexado pelo cliente.
   Em mobile as colunas empilham (ver CSS [data-page-key="checkout"][data-device="mobile"]). */
function buildCheckoutPaymentAccordion() {
  const el = Object.assign(createElement('html'), {
    content: `<style>
  .co-acc { display:flex; flex-direction:column; gap:10px; }
  .co-acc details { border:1px solid #E4E4E7; border-radius:8px; background:#ffffff; overflow:hidden; transition:border-color .15s ease; }
  .co-acc details:hover, .co-acc details[open] { border-color:#E9EEF6; }
  .co-acc summary { list-style:none; cursor:pointer; padding:14px 16px; font-size:15px; font-weight:600; color:#18181B; display:flex; align-items:center; justify-content:center; gap:10px; }
  .co-acc summary::-webkit-details-marker { display:none; }
  .co-acc .co-icon { width:20px; height:20px; flex-shrink:0; display:flex; align-items:center; justify-content:center; color:#18181B; }
  .co-acc .co-body { padding:0 16px 16px; display:flex; flex-direction:column; gap:10px; }
  .co-acc .co-field { border:1px solid #E4E4E7; border-radius:8px; padding:12px 14px; font-size:15px; color:#3F3F46; background:#ffffff; display:flex; align-items:center; gap:9px; }
  .co-acc .co-field svg { width:16px; height:16px; flex-shrink:0; color:#71717A; }
  .co-acc .co-row { display:flex; gap:10px; }
  .co-acc .co-row .co-field { flex:1; }
  .co-acc .co-note { text-align:center; padding:14px 0 4px; color:#52525B; font-size:13px; line-height:1.5; }
</style>
<div class="co-acc">
  <details name="co-payment" open>
    <summary><span class="co-icon">${CHECKOUT_ICONS.card}</span>Cartão de crédito</summary>
    <div class="co-body">
      <div class="co-field">${CHECKOUT_ICONS.card}Número do cartão *</div>
      <div class="co-row">
        <div class="co-field">${CHECKOUT_ICONS.calendar}Validade *</div>
        <div class="co-field">${CHECKOUT_ICONS.lock}Cód. de segurança *</div>
      </div>
    </div>
  </details>
  <details name="co-payment">
    <summary><span class="co-icon">${CHECKOUT_ICONS.pix}</span>Pix</summary>
    <div class="co-body">
      <p class="co-note">Ao confirmar, geramos um QR Code e um código Pix copia e cola para você finalizar o pagamento.</p>
    </div>
  </details>
  <details name="co-payment">
    <summary><span class="co-icon">${CHECKOUT_ICONS.applePay}</span>Apple Pay</summary>
    <div class="co-body">
      <p class="co-note">Finalize com Apple Pay usando Touch ID ou Face ID.</p>
    </div>
  </details>
</div>`
  });
  return withDesktopStyle(el, { marginTop: '10px' });
}

function buildCheckoutMainSection() {
  const nameRow = createColumnsElement([50, 50]);
  nameRow.columns[0].elements.push(checkoutField('user', 'Nome*'));
  nameRow.columns[1].elements.push(checkoutField('user', 'Sobrenome*'));

  const col1 = {
    id: uid('col'), width: 55,
    elements: [
      withDesktopStyle(Object.assign(createElement('titulo'), { content: 'Informações de cobrança', level: 4 }), { textAlign: 'left' }),
      withDesktopStyle(Object.assign(createElement('texto'), { content: '☐ Compra empresarial' }), { textAlign: 'left', fontSize: '13px', color: '#52525B', marginTop: '4px' }),
      checkoutField('mail', 'E-mail *'),
      nameRow,
      checkoutField('globe', 'Brasil'),
      checkoutField('globe', 'São Paulo'),
      withDesktopStyle(Object.assign(createElement('titulo'), { content: 'Forma de pagamento', level: 4 }), { textAlign: 'left', marginTop: '28px' }),
      buildCheckoutPaymentAccordion()
    ]
  };

  const productRow = createColumnsElement([30, 70]);
  productRow.columns[0].elements.push(
    withDesktopStyle(Object.assign(createElement('imagem'), { alt: 'Produto' }), {})
  );
  productRow.columns[1].elements.push(
    withDesktopStyle(Object.assign(createElement('texto'), { content: 'Produto exemplo' }), { textAlign: 'left', fontWeight: '700', color: '#18181B' }),
    withDesktopStyle(Object.assign(createElement('texto'), { content: 'Renovação automática' }), { textAlign: 'left', fontSize: '13px', color: 'var(--bx-primary)', fontWeight: '600' }),
    withDesktopStyle(Object.assign(createElement('texto'), { content: 'R$ 32,39 /mês' }), { textAlign: 'left', fontSize: '13px', color: '#71717A', marginTop: '4px' })
  );

  const badgesRow = createColumnsElement([25, 25, 25, 25]);
  badgesRow.columns[0] = checkoutBadgeCol('Pagamento seguro');
  badgesRow.columns[1] = checkoutBadgeCol('Dados criptografados');
  badgesRow.columns[2] = checkoutBadgeCol('Compra protegida');
  badgesRow.columns[3] = checkoutBadgeCol('Site verificado');

  const col2 = {
    id: uid('col'), width: 45,
    elements: [
      withDesktopStyle(Object.assign(createElement('titulo'), { content: 'Você está comprando', level: 4 }), { textAlign: 'left' }),
      productRow,
      createElement('separador'),
      withDesktopStyle(Object.assign(createElement('texto'), { content: 'Impostos (8,00%): R$ 2,40' }), { textAlign: 'left', fontSize: '13px', color: '#52525B' }),
      withDesktopStyle(Object.assign(createElement('texto'), { content: 'TOTAL: R$ 32,39' }), { textAlign: 'left', fontWeight: '700', fontSize: '18px', marginTop: '6px' }),
      withDesktopStyle(Object.assign(createElement('botao'), { content: 'Finalizar pedido', href: '#' }), {
        backgroundColor: '#F5A623', color: '#ffffff', width: '100%', marginTop: '20px',
        paddingTop: '14px', paddingBottom: '14px', fontSize: '16px', fontWeight: '700'
      }),
      badgesRow
    ]
  };

  return {
    id: uid('sec'), fixedKey: 'checkout', hidden: false, menuItemId: null,
    columns: [col1, col2]
  };
}

function buildCheckoutFooterSection() {
  return {
    id: uid('sec'), fixedKey: 'checkout-footer', hidden: false, menuItemId: null,
    columns: [{
      id: uid('col'), width: 100,
      elements: [
        withDesktopStyle(Object.assign(createElement('texto'), {
          content: 'Ao confirmar seu pedido, você concorda com os Termos e Condições e a Política de Privacidade. Em caso de dúvidas sobre o pagamento, entre em contato com o suporte informando o número do pedido.'
        }), { textAlign: 'left', fontSize: '12px', color: '#A1A1AA', lineHeight: '1.6' }),
        withDesktopStyle(Object.assign(createElement('texto'), {
          content: '© 2026 Sua Empresa. Todos os direitos reservados. · Política de Privacidade · Termos e Condições · Política de Reembolso'
        }), { textAlign: 'left', fontSize: '12px', color: '#A1A1AA', marginTop: '10px' })
      ]
    }]
  };
}

function buildCheckoutSections() {
  return [buildCheckoutMainSection(), buildCheckoutFooterSection()];
}

/* Sempre que o template fixo do checkout (buildCheckoutSections) for alterado no código,
   incremente esta versão. Rascunhos salvos com uma versão antiga são descartados
   automaticamente e substituídos pelo template atual — sem precisar de ação do usuário. */
const CHECKOUT_TEMPLATE_VERSION = 6;

function defaultCheckoutPageState() {
  const header = defaultHeaderState();
  header.menuItems = [];
  return {
    name: 'Meu Checkout',
    templateVersion: CHECKOUT_TEMPLATE_VERSION,
    globalStyle: { primaryColor: '#183b54', radius: 10, sectionSpacing: 40, headings: defaultHeadingStyles() },
    siteSettings: defaultSiteSettings(),
    header,
    sections: buildCheckoutSections()
  };
}

function loadCheckoutState() {
  try {
    const raw = localStorage.getItem(CHECKOUT_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed.templateVersion !== CHECKOUT_TEMPLATE_VERSION) return defaultCheckoutPageState();
      if (!parsed.globalStyle) parsed.globalStyle = { primaryColor: '#183b54', radius: 10, sectionSpacing: 40, headings: defaultHeadingStyles() };
      else if (!parsed.globalStyle.headings) parsed.globalStyle.headings = defaultHeadingStyles();
      if (!parsed.siteSettings) parsed.siteSettings = defaultSiteSettings();
      else if (!parsed.siteSettings.seo) parsed.siteSettings.seo = defaultSeoSettings();
      if (!parsed.header) { parsed.header = defaultHeaderState(); parsed.header.menuItems = []; }
      (parsed.sections || []).forEach(section => {
        (section.columns || []).forEach(column => {
          (column.elements || []).forEach(el => {
            if (!el.styles) el.styles = { desktop: {}, tablet: {}, mobile: {} };
            if (!el.styles.desktop) el.styles.desktop = {};
            if (el.styles.desktop.textAlign === undefined) el.styles.desktop.textAlign = 'center';
          });
        });
      });
      return parsed;
    }
  } catch (e) { /* ignora estado corrompido */ }
  return defaultCheckoutPageState();
}

function loadPageState(pageKey) {
  return pageKey === 'checkout' ? loadCheckoutState() : loadBuilderState();
}

function migrateMenuItems(state) {
  if (!state.header) state.header = defaultHeaderState();
  if (!Array.isArray(state.header.menuItems)) state.header.menuItems = [];
  if (!state.sections) return;

  state.sections.forEach(section => {
    if (section.menuLabel && !section.menuItemId) {
      const item = { id: uid('menu'), label: section.menuLabel, visible: true };
      state.header.menuItems.push(item);
      section.menuItemId = item.id;
    }
    if (section.menuLabel !== undefined) delete section.menuLabel;
  });

  const apresentacao = state.sections.find(s => s.fixedKey === 'apresentacao');
  if (apresentacao && !apresentacao.menuItemId) {
    let inicio = state.header.menuItems.find(m => m.label === 'Início');
    if (!inicio) {
      inicio = { id: uid('menu'), label: 'Início', visible: true };
      state.header.menuItems.unshift(inicio);
    }
    apresentacao.menuItemId = inicio.id;
  }
}

function pruneOrphanSections(state) {
  if (!state.sections) return;
  const validKeys = new Set(FIXED_SECTIONS.map(f => f.key).concat(['checkout', 'checkout-footer']));
  const seenKeys = new Set();
  state.sections = state.sections.filter(sec => {
    if (!validKeys.has(sec.fixedKey)) return false;
    if (seenKeys.has(sec.fixedKey)) return false;
    seenKeys.add(sec.fixedKey);
    return true;
  });
}

function migrateElementDefaults(state) {
  if (!state.sections) return;
  migrateMenuItems(state);
  pruneOrphanSections(state);
  state.sections.forEach(section => {
    (section.columns || []).forEach(column => {
      (column.elements || []).forEach(el => {
        if (!el.styles) el.styles = { desktop: {}, tablet: {}, mobile: {} };
        if (!el.styles.desktop) el.styles.desktop = {};
        if (el.styles.desktop.textAlign === undefined) el.styles.desktop.textAlign = 'center';
      });
    });
  });
}

function applyGlobalStyleVars() {
  const gs = builderState.globalStyle || {};
  const node = document.getElementById('builder-canvas');
  if (!node) return;
  node.style.setProperty('--bx-primary', gs.primaryColor || '#183b54');
  node.style.setProperty('--bx-radius', (gs.radius !== undefined ? gs.radius : 10) + 'px');
  node.style.setProperty('--bx-section-spacing', (gs.sectionSpacing !== undefined ? gs.sectionSpacing : 40) + 'px');

  const headings = gs.headings || defaultHeadingStyles();
  HEADING_LEVELS.forEach(n => {
    const h = headings[n] || {};
    node.style.setProperty(`--h${n}-font-family`, h.fontFamily || 'inherit');
    node.style.setProperty(`--h${n}-font-weight`, h.bold ? '700' : '400');
    node.style.setProperty(`--h${n}-font-style`, h.italic ? 'italic' : 'normal');
    node.style.setProperty(`--h${n}-text-decoration`, h.underline ? 'underline' : 'none');
  });

  const menuFont = headings.menu || {};
  node.style.setProperty('--menu-font-family', menuFont.fontFamily || 'inherit');
  node.style.setProperty('--menu-font-weight', menuFont.bold ? '700' : '400');
  node.style.setProperty('--menu-font-style', menuFont.italic ? 'italic' : 'normal');
  node.style.setProperty('--menu-text-decoration', menuFont.underline ? 'underline' : 'none');
}

function persistBuilderState(silent) {
  const storageKey = currentPageKey === 'checkout' ? CHECKOUT_STORAGE_KEY : BUILDER_STORAGE_KEY;
  localStorage.setItem(storageKey, JSON.stringify(builderState));
  hasUnsavedChanges = false;
  if (!silent) showToast('Alterações salvas!');
}

function publishBuilderState() {
  const snapshot = JSON.stringify(builderState);
  const isCheckout = currentPageKey === 'checkout';
  localStorage.setItem(isCheckout ? CHECKOUT_STORAGE_KEY : BUILDER_STORAGE_KEY, snapshot);
  localStorage.setItem(isCheckout ? CHECKOUT_PUBLISHED_STATE_KEY : BUILDER_PUBLISHED_STATE_KEY, snapshot);
  localStorage.setItem(isCheckout ? CHECKOUT_PUBLISHED_KEY : BUILDER_PUBLISHED_KEY, '1');
  hasUnsavedChanges = false;
}

/* -------------------- Alerta de alterações não salvas -------------------- */

function wireUnsavedChangesGuard() {
  window.addEventListener('beforeunload', (e) => {
    if (!hasUnsavedChanges) return;
    e.preventDefault();
    e.returnValue = '';
  });

  const modal = document.getElementById('unsaved-changes-modal');
  if (!modal) return;

  const closeModal = () => { modal.classList.remove('show'); pendingNavigationHref = null; };

  document.addEventListener('click', (e) => {
    const link = e.target.closest('a[href]');
    if (!link || modal.contains(link)) return;
    if (!hasUnsavedChanges) return;
    const href = link.getAttribute('href');
    if (!href || href.startsWith('#') || href.startsWith('javascript:')) return;
    if (link.target === '_blank') return;
    e.preventDefault();
    pendingNavigationHref = link.href;
    modal.classList.add('show');
  });

  modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });

  document.getElementById('unsaved-changes-save-btn').addEventListener('click', () => {
    persistBuilderState(true);
    const href = pendingNavigationHref;
    closeModal();
    if (href) window.location.href = href;
  });

  document.getElementById('unsaved-changes-discard-btn').addEventListener('click', () => {
    const href = pendingNavigationHref;
    hasUnsavedChanges = false;
    closeModal();
    if (href) window.location.href = href;
  });
}

/* -------------------- Histórico (undo/redo) -------------------- */

function snapshotState() {
  return JSON.stringify(builderState);
}

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
      return Object.assign(base, { content: 'Adicione aqui o texto do seu site. Clique para editar.' });
    case 'titulo':
      return Object.assign(base, { content: 'Título da seção', level: 2 });
    case 'subtitulo':
      return Object.assign(base, { content: 'Subtítulo de apoio' });
    case 'botao':
      return Object.assign(base, { content: 'Clique aqui', href: '#' });
    case 'link':
      return Object.assign(base, { content: 'Saiba mais', href: '#', newTab: false });
    case 'icone':
      return Object.assign(base, { iconKey: 'icon', href: '' });
    case 'imagem':
      base.styles.desktop.width = '100%';
      return Object.assign(base, { src: '', alt: '', href: '', objectFit: 'cover' });
    case 'video':
      return Object.assign(base, { url: '', autoplay: false, loop: false, controls: true, muted: false, aspectRatio: '16:9' });
    case 'separador':
      return Object.assign(base, { borderStyle: 'solid', color: '#E4E4E7', thickness: 1, width: 100 });
    case 'espacamento':
      return Object.assign(base, { height: 40 });
    case 'lista':
      return Object.assign(base, { ordered: false, iconStyle: '', items: ['Primeiro item', 'Segundo item', 'Terceiro item'] });
    case 'redes':
      return Object.assign(base, { profiles: [{ platform: 'instagram', url: 'https://instagram.com' }, { platform: 'whatsapp', url: 'https://wa.me/5511999999999' }], colorMode: 'custom', customColor: '', iconRadius: 50 });
    case 'galeria':
      return Object.assign(base, { columns: 3, images: [{ src: '', alt: '' }, { src: '', alt: '' }, { src: '', alt: '' }] });
    case 'carrossel':
      return Object.assign(base, { images: [{ src: '', alt: '' }, { src: '', alt: '' }, { src: '', alt: '' }], scrollFormat: 'barra' });
    case 'depoimentos':
      return Object.assign(base, {
        items: [
          { name: 'Camila Souza', role: 'Casamento em Indaiatuba', text: 'Equipe atenciosa do início ao fim, recomendo muito!', avatar: '' },
          { name: 'Rafael Lima', role: 'Debutante', text: 'Superou todas as expectativas da festa.', avatar: '' }
        ],
        layoutFormat: 'grid', gridColumns: 3, carouselVisible: 1, textColor: '', boxColor: ''
      });
    case 'formulario':
      return Object.assign(base, { formId: '', title: 'Fale conosco' });
    case 'mapa':
      return Object.assign(base, { embedUrl: '', address: '' });
    case 'html':
      return Object.assign(base, { content: '<p style="padding:12px;">Cole aqui seu HTML personalizado.</p>' });
    case 'codigo':
      return Object.assign(base, { content: '<!-- Cole aqui código HTML/CSS/JS personalizado -->' });
    default:
      return base;
  }
}

function withDesktopStyle(el, extra) {
  Object.assign(el.styles.desktop, extra);
  return el;
}

function createColumnsElement(widths) {
  return {
    id: uid('el'),
    type: 'colunas',
    hidden: { desktop: false, tablet: false, mobile: false },
    styles: { desktop: { marginTop: '0px', marginBottom: '0px', marginLeft: '0px', marginRight: '0px' }, tablet: {}, mobile: {} },
    columns: widths.map(w => ({ id: uid('col'), width: w, elements: [] }))
  };
}

const FIXED_SECTIONS = [
  { key: 'apresentacao', label: 'Apresentação' },
  { key: 'servicos', label: 'Meus Serviços' },
  { key: 'sobre', label: 'Sobre' },
  { key: 'orcamento', label: 'Orçamento' }
];

function buildFixedSection(key, menuItemId) {
  if (key === 'apresentacao') {
    return {
      id: uid('sec'), fixedKey: key, hidden: false, menuItemId: menuItemId || null,
      columns: [{
        id: uid('col'), width: 100,
        elements: [
          withDesktopStyle(Object.assign(createElement('titulo'), { content: 'Sua marca, sua história, do seu jeito', level: 1 }), { fontSize: '42px' }),
          withDesktopStyle(Object.assign(createElement('texto'), { content: 'Clique para editar este texto e conte em poucas palavras o que torna o seu trabalho especial.' }), { color: '#52525B', fontSize: '18px' }),
          withDesktopStyle(Object.assign(createElement('botao'), { content: 'Solicitar orçamento', href: '#orcamento' }), { marginTop: '8px' }),
          withDesktopStyle(Object.assign(createElement('botao'), { content: 'Conheça nossos serviços', href: '#servicos' }), { marginTop: '8px', backgroundColor: 'transparent', color: 'var(--bx-primary)' })
        ]
      }]
    };
  }

  if (key === 'servicos') {
    const col = (title) => ({
      id: uid('col'), width: 33.33,
      elements: [
        withDesktopStyle(Object.assign(createElement('icone'), { iconKey: 'check' }), { color: '#183b54', fontSize: '32px' }),
        Object.assign(createElement('titulo'), { content: title, level: 4 }),
        Object.assign(createElement('texto'), { content: 'Clique para editar e descrever este serviço.' })
      ]
    });
    const cols = [col('Serviço 1'), col('Serviço 2'), col('Serviço 3')];
    cols[2].width = 33.34;
    return { id: uid('sec'), fixedKey: key, hidden: false, menuItemId: menuItemId || null, columns: cols };
  }

  if (key === 'sobre') {
    return {
      id: uid('sec'), fixedKey: key, hidden: false, menuItemId: menuItemId || null,
      columns: [{
        id: uid('col'), width: 100,
        elements: [
          Object.assign(createElement('titulo'), { content: 'Sobre nós', level: 2 }),
          Object.assign(createElement('texto'), { content: 'Clique para editar e contar a história da sua empresa, sua experiência e o que te diferencia no mercado.' })
        ]
      }]
    };
  }

  // orcamento
  return {
    id: uid('sec'), fixedKey: key, hidden: false, menuItemId: menuItemId || null, bg: '#183b54',
    columns: [{
      id: uid('col'), width: 100,
      elements: [
        withDesktopStyle(Object.assign(createElement('titulo'), { content: 'Vamos planejar o seu evento?', level: 2 }), { color: '#ffffff' }),
        withDesktopStyle(Object.assign(createElement('texto'), { content: 'Conte pra gente a sua ideia e receba uma proposta sob medida.' }), { color: '#ffffff' }),
        withDesktopStyle(Object.assign(createElement('botao'), { content: 'Solicitar orçamento', href: '#' }), { backgroundColor: '#ffffff', color: '#183b54' })
      ]
    }]
  };
}

/* -------------------- Buscas na árvore -------------------- */

function searchColumnsArray(columnId, columns, owner) {
  const direct = columns.find(c => c.id === columnId);
  if (direct) return { owner, column: direct };
  for (const col of columns) {
    for (const el of col.elements) {
      if (el.type === 'colunas') {
        const nested = searchColumnsArray(columnId, el.columns, el);
        if (nested) return nested;
      }
    }
  }
  return null;
}

function findColumnAndSection(columnId) {
  for (const section of builderState.sections) {
    const found = searchColumnsArray(columnId, section.columns, section);
    if (found) return found;
  }
  return {};
}

function searchElementsArray(elementId, columns) {
  for (const column of columns) {
    const index = column.elements.findIndex(e => e.id === elementId);
    if (index !== -1) return { column, index, element: column.elements[index] };
    for (const el of column.elements) {
      if (el.type === 'colunas') {
        const nested = searchElementsArray(elementId, el.columns);
        if (nested) return nested;
      }
    }
  }
  return null;
}

function findElementLocation(elementId) {
  for (const section of builderState.sections) {
    const found = searchElementsArray(elementId, section.columns);
    if (found) return found;
  }
  return null;
}

function findSection(sectionId) {
  return builderState.sections.find(s => s.id === sectionId);
}

function columnsContainFormId(columns, formId) {
  return columns.some(column => column.elements.some(el =>
    (el.type === 'formulario' && el.formId === formId) || (el.type === 'colunas' && columnsContainFormId(el.columns, formId))
  ));
}

function findSectionIdByFormId(formId) {
  for (const section of builderState.sections) {
    if (columnsContainFormId(section.columns, formId)) return section.id;
  }
  return null;
}

/* -------------------- Mutações estruturais -------------------- */

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

function removeColumnById(columnId) {
  const { owner, column } = findColumnAndSection(columnId);
  if (!owner || !column) return false;

  if (owner.columns.length <= 1) {
    if (owner.type === 'colunas') {
      const loc = findElementLocation(owner.id);
      if (!loc) return false;
      loc.column.elements.splice(loc.index, 1);
      return true;
    }
    column.elements = [];
    return true;
  }

  const idx = owner.columns.indexOf(column);
  if (idx === -1) return false;
  owner.columns.splice(idx, 1);
  const share = column.width / owner.columns.length;
  owner.columns.forEach(c => { c.width += share; });
  return true;
}

function insertColumnsRowRelativeTo(columnId, widths, position) {
  const { owner } = findColumnAndSection(columnId);
  if (!owner) return;
  const newRowEl = createColumnsElement(widths);

  if (owner.type === 'colunas') {
    const loc = findElementLocation(owner.id);
    if (!loc) return;
    const insertIndex = position === 'above' ? loc.index : loc.index + 1;
    loc.column.elements.splice(insertIndex, 0, newRowEl);
  } else {
    const oldRowEl = {
      id: uid('el'),
      type: 'colunas',
      hidden: { desktop: false, tablet: false, mobile: false },
      styles: { desktop: {}, tablet: {}, mobile: {} },
      columns: owner.columns
    };
    const elements = position === 'above' ? [newRowEl, oldRowEl] : [oldRowEl, newRowEl];
    owner.columns = [{ id: uid('col'), width: 100, elements }];
  }
}

function regenerateElementIds(elements) {
  elements.forEach(el => {
    el.id = uid('el');
    if (el.type === 'colunas') regenerateColumnIds(el.columns);
  });
}

function regenerateColumnIds(columns) {
  columns.forEach(col => {
    col.id = uid('col');
    regenerateElementIds(col.elements);
  });
}

function duplicateElementById(elementId) {
  const loc = findElementLocation(elementId);
  if (!loc) return null;
  const clone = JSON.parse(JSON.stringify(loc.element));
  clone.id = uid('el');
  if (clone.type === 'colunas') regenerateColumnIds(clone.columns);
  loc.column.elements.splice(loc.index + 1, 0, clone);
  return clone;
}

function duplicateColumnInSection(section, columnId) {
  const idx = section.columns.findIndex(c => c.id === columnId);
  if (idx === -1) return null;
  const clone = JSON.parse(JSON.stringify(section.columns[idx]));
  clone.id = uid('col');
  regenerateElementIds(clone.elements);
  section.columns.splice(idx + 1, 0, clone);
  const total = section.columns.reduce((sum, c) => sum + (c.width || 0), 0);
  if (total > 0) section.columns.forEach(c => { c.width = (c.width || 0) * 100 / total; });
  return clone;
}

function removeSectionById(sectionId) {
  builderState.sections = builderState.sections.filter(s => s.id !== sectionId);
}

function allElementsById() {
  const map = {};
  function walk(columns) {
    columns.forEach(column => {
      column.elements.forEach(el => {
        map[el.id] = el;
        if (el.type === 'colunas') walk(el.columns);
      });
    });
  }
  builderState.sections.forEach(section => walk(section.columns));
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

function resyncColumnsOrderFromDom(rowEl) {
  const { owner } = findColumnAndSection(rowEl.querySelector('.builder-column')?.dataset.columnId || '');
  if (!owner) return;
  const orderedIds = Array.from(rowEl.querySelectorAll(':scope > .builder-column')).map(n => n.dataset.columnId);
  const byId = {};
  owner.columns.forEach(c => { byId[c.id] = c; });
  owner.columns = orderedIds.map(id => byId[id]).filter(Boolean);
}

function resyncSectionsOrderFromDom(canvasEl) {
  const orderedIds = Array.from(canvasEl.querySelectorAll(':scope > .builder-section')).map(n => n.dataset.sectionId);
  const byId = {};
  builderState.sections.forEach(s => { byId[s.id] = s; });
  const visible = orderedIds.map(id => byId[id]).filter(Boolean);
  const hiddenOnes = builderState.sections.filter(s => s.hidden);
  builderState.sections = [...visible, ...hiddenOnes];
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
  lineHeight: 'line-height', letterSpacing: 'letter-spacing', textTransform: 'text-transform',
  fontStyle: 'font-style', textDecoration: 'text-decoration', marginTop: 'margin-top',
  marginBottom: 'margin-bottom', marginLeft: 'margin-left', marginRight: 'margin-right',
  paddingTop: 'padding-top', paddingBottom: 'padding-bottom', paddingLeft: 'padding-left', paddingRight: 'padding-right',
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

const RESPONSIVE_FONT_REFERENCE_WIDTH = 1152;

function responsiveFontSize(value) {
  const px = parseFloat(value);
  if (!px) return value;
  const cqw = (px / RESPONSIVE_FONT_REFERENCE_WIDTH * 100).toFixed(3);
  const minPx = Math.round(px * 0.55 * 100) / 100;
  return `clamp(${minPx}px, ${cqw}cqw, ${px}px)`;
}

function styleAttr(el, device) {
  let out = '';
  Object.keys(STYLE_CSS_KEY).forEach(key => {
    const v = styleValue(el, key, device);
    if (v !== undefined && v !== '') {
      out += key === 'fontSize' ? `font-size:${responsiveFontSize(v)};` : `${STYLE_CSS_KEY[key]}:${v};`;
    }
  });
  return out;
}

function isHiddenOnDevice(el, device) {
  return !!(el.hidden && el.hidden[device]);
}

/* -------------------- Render: painel de elementos -------------------- */

let leftTab = new URLSearchParams(location.search).get('tab') === 'estilo' ? 'estilo' : 'elementos';
let pendingScrollToSlug = leftTab === 'estilo';

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
      <button type="button" class="builder-panel-tab ${leftTab === 'elementos' ? 'active' : ''}" data-panel-tab="elementos">Elementos</button>
      <button type="button" class="builder-panel-tab ${leftTab === 'estilo' ? 'active' : ''}" data-panel-tab="estilo">Estilo</button>
    </div>
    <div class="builder-panel-tab-body${leftTab === 'estilo' ? ' builder-panel-tab-body-estilo' : ''}" id="builder-panel-tab-body"></div>
  `;
  panel.querySelectorAll('[data-panel-tab]').forEach(btn => {
    btn.addEventListener('click', () => {
      leftTab = btn.dataset.panelTab;
      renderLeftPanel();
    });
  });

  const body = document.getElementById('builder-panel-tab-body');
  if (leftTab === 'estilo') {
    renderEstiloTab(body); wireAccordions(body, ['Configurações']); wireColorSwatchPopovers(body);
    if (pendingScrollToSlug) {
      pendingScrollToSlug = false;
      setTimeout(() => {
        const slugInput = document.getElementById('site-slug-input');
        if (slugInput) { slugInput.scrollIntoView({ block: 'center', behavior: 'smooth' }); slugInput.focus(); }
      }, 50);
    }
  } else renderElementosTab(body);

  const canvas = document.getElementById('builder-canvas');
  if (canvas) initSortables(canvas);
}

function renderElementEditorPanel(panel, sel) {
  const titleMap = { section: 'Seção', column: 'Coluna', header: 'Cabeçalho', element: (ELEMENT_META[sel.obj.type] || {}).label || 'Elemento' };
  const showTabs = sel.kind === 'element';
  const isTextLike = sel.kind === 'element' && (sel.obj.type === 'titulo' || sel.obj.type === 'texto');
  const layoutTabLabel = isTextLike ? 'Aparência' : 'Layout';

  panel.innerHTML = `
    <div class="inspector-header">
      <button type="button" class="builder-breadcrumb-back" data-editor-back>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7"/></svg>
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
  else if (sel.kind === 'header') { body.innerHTML = renderHeaderInspector(sel.obj); wireHeaderInspector(sel.obj, body); }
  else { renderElementInspector(sel.obj, body); }
  const skipAccordions = sel.kind === 'header' || sel.kind === 'element';
  if (!skipAccordions) wireAccordions(body);
  wireColorSwatchPopovers(body);
}

let expandedAccordionSections = new Set();

function wireAccordions(container, skipTitles) {
  const titles = Array.from(container.querySelectorAll(':scope > .inspector-section-title'));
  titles.forEach(title => {
    if (title.classList.contains('inspector-accordion-title')) return;
    const key = title.textContent.trim();
    if (skipTitles && skipTitles.includes(key)) return;
    title.classList.add('inspector-accordion-title');
    if (!expandedAccordionSections.has(key)) title.classList.add('is-collapsed');
    const chevron = document.createElement('span');
    chevron.className = 'inspector-accordion-chevron';
    chevron.innerHTML = BI.chevronDown;
    title.appendChild(chevron);

    const bodyEls = [];
    let sib = title.nextElementSibling;
    while (sib && !sib.classList.contains('inspector-section-title')) {
      const next = sib.nextElementSibling;
      bodyEls.push(sib);
      sib = next;
    }
    const wrapper = document.createElement('div');
    wrapper.className = 'inspector-accordion-body';
    title.after(wrapper);
    bodyEls.forEach(el => wrapper.appendChild(el));

    title.addEventListener('click', (e) => {
      if (e.target.closest('button, input, select, a') && !e.target.closest('.inspector-accordion-chevron')) return;
      title.classList.toggle('is-collapsed');
      if (title.classList.contains('is-collapsed')) expandedAccordionSections.delete(key);
      else expandedAccordionSections.add(key);
    });
  });
}

function renderElementosTab(body) {
  const colunasBlockHtml = `
    <div class="builder-el-group-title">Colunas</div>
    <div class="builder-el-grid" data-columns-grid="1">
      ${COLUMN_LAYOUT_ITEMS.map(item => `
        <button type="button" class="builder-el-item" draggable="true" data-columns-layout="${escapeHtml(JSON.stringify(item.widths))}" title="${item.label}">
          ${item.icon}
          <span>${item.label}</span>
        </button>
      `).join('')}
    </div>
  `;
  body.innerHTML = ELEMENT_GROUPS.map((group, i) => `
    <div class="builder-el-group-title">${group.title}</div>
    <div class="builder-el-grid">
      ${group.types.map(type => `
        <button type="button" class="builder-el-item${type === 'secao' || type === 'colunas' ? ' is-structural' : ''}" draggable="${type === 'secao' || type === 'colunas' ? 'false' : 'true'}" data-el-type="${type}" title="${ELEMENT_META[type].label}">
          ${ELEMENT_META[type].icon}
          <span>${ELEMENT_META[type].label}</span>
        </button>
      `).join('')}
    </div>
    ${i === 0 ? colunasBlockHtml : ''}
  `).join('');
}

function fontSelectHtml(dataAttr, level, value) {
  return `
    <select class="inspector-select" style="flex:1;" data-${dataAttr}="${level}">
      ${FONT_OPTIONS.map(f => `<option value="${escapeHtml(f.value)}" ${value === f.value ? 'selected' : ''}>${escapeHtml(f.label)}</option>`).join('')}
    </select>
  `;
}

function headingRowHtml(level, cfg, label) {
  return `
    <div class="inspector-field">
      <span class="inspector-field-label">${label || 'H' + level}</span>
      <div class="inspector-row" style="align-items:center;">
        ${fontSelectHtml('heading-font', level, cfg.fontFamily || '')}
        <div class="inspector-segmented" style="flex-shrink:0;">
          <button type="button" data-heading-toggle="${level}:bold" class="${cfg.bold ? 'active' : ''}" title="Negrito">${BI.bold}</button>
          <button type="button" data-heading-toggle="${level}:italic" class="${cfg.italic ? 'active' : ''}" title="Itálico">${BI.italic}</button>
          <button type="button" data-heading-toggle="${level}:underline" class="${cfg.underline ? 'active' : ''}" title="Sublinhado">${BI.underline}</button>
        </div>
      </div>
    </div>
  `;
}

function renderEstiloTab(body) {
  const gs = builderState.globalStyle || { primaryColor: '#183b54', radius: 10, sectionSpacing: 40 };
  if (!gs.headings) gs.headings = defaultHeadingStyles();
  if (!builderState.siteSettings) builderState.siteSettings = defaultSiteSettings();
  if (!builderState.siteSettings.seo) builderState.siteSettings.seo = defaultSeoSettings();
  const seo = builderState.siteSettings.seo;
  const siteSettings = builderState.siteSettings;
  const isPro = typeof isProPlan === 'function' && isProPlan();

  body.innerHTML = `
    <div class="builder-el-group-title">${BI.style} Estilo geral do site</div>
    <div class="builder-estilo-section">
      <p class="inspector-hint">Estas configurações definem a aparência padrão de toda a página, os elementos que não têm uma cor ou raio próprios seguem estes valores automaticamente. Nada aqui é arrastável: são ajustes gerais do site.</p>
      <div class="inspector-field inspector-field-row">
        <span class="inspector-field-label">Cor principal</span>
        ${colorSwatchPopoverHtml(gs.primaryColor, 'id="gs-primary"')}
      </div>
      <div class="inspector-field">
        <span class="inspector-field-label">Arredondamento de bordas <span id="gs-radius-out">${gs.radius}px</span></span>
        <input type="range" min="0" max="32" id="gs-radius" value="${gs.radius}">
      </div>
      <div class="inspector-field">
        <span class="inspector-field-label">Espaçamento de seções <span id="gs-spacing-out">${gs.sectionSpacing}px</span></span>
        <input type="range" min="0" max="120" id="gs-spacing" value="${gs.sectionSpacing}">
      </div>
    </div>
    <div class="inspector-section-title">Tipografia</div>
    <p class="inspector-hint">Defina a fonte e o estilo padrão de cada nível de título. Ao escolher o nível (H1 a H5) em um título, ele usa automaticamente essas configurações.</p>
    ${headingRowHtml('menu', gs.headings.menu, 'Menus')}
    ${HEADING_LEVELS.map(n => headingRowHtml(n, gs.headings[n])).join('')}
    <div class="inspector-section-title">Configurações</div>
    <div class="inspector-field">
      <span class="inspector-field-label">
        URL personalizada
        ${isPro ? '' : `
        <span class="info-tooltip-wrap">
          <button type="button" class="info-tooltip-trigger" tabindex="0" aria-label="Mais informações">${BI.info}</button>
          <span class="info-tooltip-bubble">Para ter um subdomínio personalizado, <a href="planos.html" class="info-tooltip-link">faça o upgrade para o plano Pro</a>.</span>
        </span>
        `}
      </span>
      <div class="url-slug-field">
        ${isPro ? '' : `<span class="url-slug-prefix">app.love.com.br/</span>`}
        <input type="text" class="url-slug-input" id="site-slug-input" value="${escapeHtml(siteSettings.slug || '')}" placeholder="sua-empresa" autocomplete="off" spellcheck="false">
        ${isPro ? `<span class="url-slug-suffix">.love.com.br</span>` : ''}
        <span class="url-slug-status" id="site-slug-status"></span>
      </div>
      <p class="inspector-hint url-slug-error" id="site-slug-error" hidden>Esta URL já está sendo usada.</p>
    </div>
    <div class="inspector-field">
      <span class="inspector-field-label">Título da Página (Meta Title)</span>
      <input type="text" class="inspector-input" id="seo-meta-title" value="${escapeHtml(seo.metaTitle || '')}" placeholder="Ex: Premium Eventos">
      <p class="inspector-hint">O que aparece na aba do navegador e no Google.</p>
    </div>
    <div class="inspector-field">
      <span class="inspector-field-label">Descrição (Meta Description)</span>
      <textarea class="inspector-textarea inspector-textarea-plain" id="seo-meta-description" placeholder="Escreva uma resumo curto sobre sua empresa">${escapeHtml(seo.metaDescription || '')}</textarea>
      <p class="inspector-hint">Resumo para buscadores e redes sociais.</p>
    </div>
    <div class="inspector-field">
      <span class="inspector-field-label">Imagem de Compartilhamento</span>
      <div class="header-logo-picker-wrap">
        <label class="header-logo-picker ${seo.ogImage ? 'has-image' : ''}">
          ${seo.ogImage
            ? `<img src="${seo.ogImage}" class="header-logo-picker-preview" alt="">
               <div class="header-logo-picker-overlay">${BI.image}<span>Alterar imagem</span></div>`
            : `<span class="image-upload-zone-plus">${BI.plus}</span><span class="image-upload-zone-text">Adicione ou arraste uma imagem</span>`}
          <input type="file" accept="image/*" class="image-upload-zone-input" data-seo-og-upload>
        </label>
        ${seo.ogImage ? `<button type="button" class="header-logo-picker-remove" data-seo-og-remove title="Remover imagem">${BI.close}</button>` : ''}
      </div>
      <p class="inspector-hint">A foto que aparece quando alguém envia o link no WhatsApp ou LinkedIn.</p>
    </div>
    <div class="inspector-field">
      <span class="inspector-field-label">Favicon</span>
      <div class="header-logo-picker-wrap">
        <label class="header-logo-picker ${seo.favicon ? 'has-image' : ''}">
          ${seo.favicon
            ? `<img src="${seo.favicon}" class="header-logo-picker-preview" alt="">
               <div class="header-logo-picker-overlay">${BI.image}<span>Alterar imagem</span></div>`
            : `<span class="image-upload-zone-plus">${BI.plus}</span><span class="image-upload-zone-text">Adicione ou arraste uma imagem</span>`}
          <input type="file" accept="image/*" class="image-upload-zone-input" data-seo-favicon-upload>
        </label>
        ${seo.favicon ? `<button type="button" class="header-logo-picker-remove" data-seo-favicon-remove title="Remover imagem">${BI.close}</button>` : ''}
      </div>
      <p class="inspector-hint">O ícone pequeno da aba do navegador.</p>
    </div>
    <div class="inspector-field">
      <span class="inspector-field-label">Scripts Personalizados — Header</span>
      <textarea class="inspector-textarea" id="seo-header-scripts" placeholder="<!-- cole aqui, ex: Google Tag Manager -->">${escapeHtml(seo.headerScripts || '')}</textarea>
    </div>
    <div class="inspector-field">
      <span class="inspector-field-label">Scripts Personalizados — Footer</span>
      <textarea class="inspector-textarea" id="seo-footer-scripts" placeholder="<!-- cole aqui, ex: Meta Pixel -->">${escapeHtml(seo.footerScripts || '')}</textarea>
      <p class="inspector-hint">Cole aqui o Google Tag Manager, o Meta Pixel de anúncios ou outros scripts de rastreamento.</p>
    </div>
  `;

  const primaryColor = body.querySelector('#gs-primary');
  const radius = body.querySelector('#gs-radius');
  const spacing = body.querySelector('#gs-spacing');

  primaryColor.addEventListener('input', () => {
    builderState.globalStyle.primaryColor = primaryColor.value;
    applyGlobalStyleVars();
  });
  primaryColor.addEventListener('change', () => pushHistory());

  radius.addEventListener('input', () => {
    builderState.globalStyle.radius = Number(radius.value);
    body.querySelector('#gs-radius-out').textContent = radius.value + 'px';
    applyGlobalStyleVars();
  });
  radius.addEventListener('change', () => pushHistory());

  spacing.addEventListener('input', () => {
    builderState.globalStyle.sectionSpacing = Number(spacing.value);
    body.querySelector('#gs-spacing-out').textContent = spacing.value + 'px';
    applyGlobalStyleVars();
  });
  spacing.addEventListener('change', () => pushHistory());

  body.querySelectorAll('[data-heading-font]').forEach(sel => {
    sel.addEventListener('change', () => {
      gs.headings[sel.dataset.headingFont].fontFamily = sel.value;
      applyGlobalStyleVars();
      pushHistory();
    });
  });

  body.querySelectorAll('[data-heading-toggle]').forEach(btn => {
    btn.addEventListener('click', () => {
      const [level, kind] = btn.dataset.headingToggle.split(':');
      const cfg = gs.headings[level];
      cfg[kind] = !cfg[kind];
      btn.classList.toggle('active', cfg[kind]);
      applyGlobalStyleVars();
      pushHistory();
    });
  });

  const slugInput = body.querySelector('#site-slug-input');
  if (slugInput) {
    const slugStatus = body.querySelector('#site-slug-status');
    const slugError = body.querySelector('#site-slug-error');
    const savedSlug = siteSettings.slug;
    let slugCheckTimer = null;
    const checkSlug = () => {
      const val = slugInput.value;
      slugStatus.classList.remove('is-available', 'is-taken');
      slugStatus.innerHTML = '';
      slugError.hidden = true;
      if (!val) return;
      const taken = RESERVED_SLUGS.includes(val) && val !== savedSlug;
      if (taken) {
        slugStatus.classList.add('is-taken');
        slugStatus.innerHTML = BI.close;
        slugError.hidden = false;
      } else {
        slugStatus.classList.add('is-available');
        slugStatus.innerHTML = BI.check;
      }
    };
    slugInput.addEventListener('input', () => {
      const cursorAtEnd = slugInput.selectionStart === slugInput.value.length;
      const clean = slugify(slugInput.value);
      slugInput.value = clean;
      siteSettings.slug = clean;
      if (cursorAtEnd) slugInput.setSelectionRange(clean.length, clean.length);
      clearTimeout(slugCheckTimer);
      slugCheckTimer = setTimeout(checkSlug, 300);
    });
    slugInput.addEventListener('blur', () => pushHistory());
    checkSlug();
  }

  const metaTitleInput = body.querySelector('#seo-meta-title');
  if (metaTitleInput) {
    metaTitleInput.addEventListener('input', () => { seo.metaTitle = metaTitleInput.value; });
    metaTitleInput.addEventListener('blur', () => pushHistory());
  }

  const metaDescInput = body.querySelector('#seo-meta-description');
  if (metaDescInput) {
    metaDescInput.addEventListener('input', () => { seo.metaDescription = metaDescInput.value; });
    metaDescInput.addEventListener('blur', () => pushHistory());
  }

  const headerScriptsInput = body.querySelector('#seo-header-scripts');
  if (headerScriptsInput) {
    headerScriptsInput.addEventListener('input', () => { seo.headerScripts = headerScriptsInput.value; });
    headerScriptsInput.addEventListener('blur', () => pushHistory());
  }

  const footerScriptsInput = body.querySelector('#seo-footer-scripts');
  if (footerScriptsInput) {
    footerScriptsInput.addEventListener('input', () => { seo.footerScripts = footerScriptsInput.value; });
    footerScriptsInput.addEventListener('blur', () => pushHistory());
  }

  const ogUpload = body.querySelector('[data-seo-og-upload]');
  if (ogUpload) {
    const applyOgFile = (file) => {
      readFileAsDataUrl(file, (dataUrl) => {
        seo.ogImage = dataUrl;
        pushHistory();
        renderLeftPanel();
      });
    };
    ogUpload.addEventListener('change', () => {
      const file = ogUpload.files[0];
      if (file) applyOgFile(file);
    });
    wireImageDropZone(ogUpload.closest('.header-logo-picker'), applyOgFile);
  }

  const ogRemove = body.querySelector('[data-seo-og-remove]');
  if (ogRemove) {
    ogRemove.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      seo.ogImage = '';
      pushHistory();
      renderLeftPanel();
    });
  }

  const faviconUpload = body.querySelector('[data-seo-favicon-upload]');
  if (faviconUpload) {
    const applyFaviconFile = (file) => {
      readFileAsDataUrl(file, (dataUrl) => {
        seo.favicon = dataUrl;
        pushHistory();
        renderLeftPanel();
      });
    };
    faviconUpload.addEventListener('change', () => {
      const file = faviconUpload.files[0];
      if (file) applyFaviconFile(file);
    });
    wireImageDropZone(faviconUpload.closest('.header-logo-picker'), applyFaviconFile);
  }

  const faviconRemove = body.querySelector('[data-seo-favicon-remove]');
  if (faviconRemove) {
    faviconRemove.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      seo.favicon = '';
      pushHistory();
      renderLeftPanel();
    });
  }
}

/* -------------------- Render: canvas -------------------- */

function renderCanvas() {
  const canvas = document.getElementById('builder-canvas');
  if (!canvas) return;
  canvas.dataset.device = currentDevice;
  canvas.dataset.pageKey = currentPageKey;
  const frame = document.getElementById('builder-canvas-frame');
  if (frame) frame.dataset.device = currentDevice;

  const visible = builderState.sections
    .map((section, index) => ({ section, index }))
    .filter(v => !v.section.hidden);

  if (!visible.length) {
    canvas.innerHTML = renderFixedHeaderHtml() + `
      <div class="builder-empty-canvas">
        ${BI.layers}
        <p><strong>Todas as seções estão ocultas.</strong><br>Ative alguma em Cabeçalho → Menus.</p>
      </div>
    ` + renderFixedFooterHtml();
  } else {
    canvas.innerHTML = renderFixedHeaderHtml() + visible.map((v, i) =>
      renderSectionHtml(v.section, 'edit', currentDevice)
    ).join('') + renderFixedFooterHtml();
  }

  const menuRoot = document.getElementById('builder-mobile-menu-root');
  if (menuRoot) menuRoot.innerHTML = currentDevice === 'mobile' ? renderMobileMenuDrawerHtml() : '';

  wireFixedHeader(canvas);
  wireMobileMenuDrawer(menuRoot);
  wireCanvasEvents(canvas);
  initSortables(canvas);
  applySelectionClasses();
  applyFloatingHeaderOverlap(canvas);
}

function applyFloatingHeaderOverlap(canvas) {
  const header = canvas.querySelector('.builder-fixed-header');
  const firstSection = canvas.querySelector('.builder-section');
  if (!header) return;
  if (header.dataset.style !== 'flutuante') {
    header.style.marginBottom = '';
    if (firstSection) firstSection.style.paddingTop = '';
    return;
  }
  const overlap = header.offsetHeight + 16;
  header.style.marginBottom = `-${overlap}px`;
  if (firstSection) firstSection.style.paddingTop = `calc(var(--bx-section-spacing, 40px) + ${overlap}px)`;
}

function hexToRgba(hex, opacity) {
  const h = (hex || '#000000').replace('#', '');
  const full = h.length === 3 ? h.split('').map(c => c + c).join('') : h;
  const bigint = parseInt(full, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return `rgba(${r}, ${g}, ${b}, ${opacity !== undefined ? opacity : 1})`;
}

function headerStyleVars(h) {
  const primaryColor = (builderState.globalStyle && builderState.globalStyle.primaryColor) || '#183b54';
  return [
    h.bgColor ? `--header-bg:${hexToRgba(h.bgColor, h.bgOpacity !== undefined ? h.bgOpacity : 1)}` : '',
    `--header-bg-solid:${primaryColor}`,
    h.textColor ? `--header-text:${h.textColor}` : '',
    h.ctaBgColor ? `--header-cta-bg:${h.ctaBgColor}` : '',
    h.ctaTextColor ? `--header-cta-text:${h.ctaTextColor}` : ''
  ].filter(Boolean).join(';');
}

function renderHeaderLogoHtml(h) {
  if (!h.logoImage) return `<span class="builder-fixed-header-logo-placeholder">Seu logo aqui</span>`;
  const scale = h.logoScale || 1;
  const x = h.logoOffsetX || 0;
  const y = h.logoOffsetY || 0;
  return `
    <div class="builder-fixed-header-logo-frame" style="--logo-scale:${scale};--logo-x:${x}%;--logo-y:${y}%;">
      <img src="${h.logoImage}" class="builder-fixed-header-logo-img" alt="Logo">
    </div>
  `;
}

function resolveVisibleMenuLinks() {
  const items = (builderState.header && builderState.header.menuItems) || [];
  return items
    .filter(m => m.visible !== false)
    .map(m => {
      const section = builderState.sections.find(s => !s.hidden && s.menuItemId === m.id);
      return section ? { label: m.label, sectionId: section.id } : null;
    })
    .filter(Boolean);
}

function renderFixedHeaderHtml() {
  const h = builderState.header || defaultHeaderState();
  const menuItems = resolveVisibleMenuLinks();
  const logo = renderHeaderLogoHtml(h);
  return `
    <div class="builder-fixed-header" data-header-select data-sticky="${h.sticky !== false}" data-style="${h.style || 'padrao'}" style="${headerStyleVars(h)}" title="Este cabeçalho é o mesmo em todos os sites e não pode ser removido">
      <div class="builder-fixed-header-inner">
        ${logo}
        <nav class="builder-fixed-header-menu" data-menu-style="${h.menuStyle || 'padrao'}">
          ${menuItems.map(m => `<a href="#${m.sectionId}" data-menu-anchor="${m.sectionId}">${escapeHtml(m.label)}</a>`).join('')}
        </nav>
        <a href="#" class="builder-fixed-header-cta" data-menu-anchor-cta="${escapeHtml(h.ctaFormId || '')}">${escapeHtml(h.ctaText || 'Fale conosco')}</a>
        <button type="button" class="builder-fixed-header-burger" data-header-burger aria-label="Abrir menu">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" d="M3.75 6h16.5M3.75 12h16.5M3.75 18h16.5"/></svg>
        </button>
      </div>
    </div>
  `;
}

function renderMobileMenuDrawerHtml() {
  const h = builderState.header || defaultHeaderState();
  const menuItems = resolveVisibleMenuLinks();
  const logo = renderHeaderLogoHtml(h);
  const styleVars = headerStyleVars(h);
  return `
    <div class="builder-mobile-menu-backdrop" data-mobile-menu-backdrop style="${styleVars}"></div>
    <div class="builder-mobile-menu-drawer" data-mobile-menu-drawer style="${styleVars}">
      <div class="builder-mobile-menu-drawer-top">
        ${logo}
        <button type="button" class="builder-mobile-menu-close" data-mobile-menu-close aria-label="Fechar menu">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12"/></svg>
        </button>
      </div>
      <nav class="builder-mobile-menu-drawer-links">
        ${menuItems.map(m => `<a href="#${m.sectionId}" data-menu-anchor="${m.sectionId}">${escapeHtml(m.label)}</a>`).join('')}
      </nav>
      <a href="#" class="builder-fixed-header-cta builder-mobile-menu-drawer-cta" data-menu-anchor-cta="${escapeHtml(h.ctaFormId || '')}">${escapeHtml(h.ctaText || 'Fale conosco')}</a>
    </div>
  `;
}

function renderFixedFooterHtml() {
  return `
    <footer class="builder-fixed-footer" title="Este rodapé é o mesmo em todos os sites e não pode ser removido">
      <div class="builder-fixed-footer-inner">
        <div class="builder-fixed-footer-logo">
          <span class="builder-fixed-footer-madewith">Feito com</span>
          <img src="../assets/logo-white.png" alt="Love" class="builder-fixed-footer-word">
        </div>
        <div class="builder-fixed-footer-text">
          <span>Desenvolvido com amor para momentos inesquecíveis.</span>
        </div>
      </div>
    </footer>
  `;
}

function wireFixedHeader(canvas) {
  const header = canvas.querySelector('[data-header-select]');
  if (!header) return;

  header.addEventListener('click', (e) => {
    if (e.target.closest('[data-menu-anchor]') || e.target.closest('[data-menu-anchor-cta]') || e.target.closest('[data-header-burger]')) return;
    e.stopPropagation();
    selectedId = '__header__';
    applySelectionClasses();
    renderLeftPanel();
  });

  const burger = header.querySelector('[data-header-burger]');
  if (burger) burger.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); openMobileMenuDrawer(); });

  header.querySelectorAll('[data-menu-anchor]').forEach(a => {
    a.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const target = document.getElementById(a.dataset.menuAnchor);
      if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });

  const cta = header.querySelector('[data-menu-anchor-cta]');
  if (cta) {
    cta.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const formId = cta.dataset.menuAnchorCta;
      if (!formId) return;
      const sectionId = findSectionIdByFormId(formId);
      const target = sectionId && document.getElementById(sectionId);
      if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }
}

function openMobileMenuDrawer() {
  const menuRoot = document.getElementById('builder-mobile-menu-root');
  if (!menuRoot) return;
  const drawer = menuRoot.querySelector('[data-mobile-menu-drawer]');
  const backdrop = menuRoot.querySelector('[data-mobile-menu-backdrop]');
  if (drawer) drawer.classList.add('is-open');
  if (backdrop) backdrop.classList.add('is-open');
}

function closeMobileMenuDrawer() {
  const menuRoot = document.getElementById('builder-mobile-menu-root');
  if (!menuRoot) return;
  const drawer = menuRoot.querySelector('[data-mobile-menu-drawer]');
  const backdrop = menuRoot.querySelector('[data-mobile-menu-backdrop]');
  if (drawer) drawer.classList.remove('is-open');
  if (backdrop) backdrop.classList.remove('is-open');
}

function wireMobileMenuDrawer(menuRoot) {
  if (!menuRoot) return;
  const drawer = menuRoot.querySelector('[data-mobile-menu-drawer]');
  const backdrop = menuRoot.querySelector('[data-mobile-menu-backdrop]');
  const closeBtn = menuRoot.querySelector('[data-mobile-menu-close]');
  if (!drawer) return;

  if (closeBtn) closeBtn.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); closeMobileMenuDrawer(); });
  if (backdrop) backdrop.addEventListener('click', (e) => { e.stopPropagation(); closeMobileMenuDrawer(); });

  drawer.querySelectorAll('[data-menu-anchor]').forEach(a => {
    a.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      closeMobileMenuDrawer();
      const target = document.getElementById(a.dataset.menuAnchor);
      if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });

  const cta = drawer.querySelector('[data-menu-anchor-cta]');
  if (cta) {
    cta.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      closeMobileMenuDrawer();
      const formId = cta.dataset.menuAnchorCta;
      if (!formId) return;
      const sectionId = findSectionIdByFormId(formId);
      const target = sectionId && document.getElementById(sectionId);
      if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }
}

function renderCanvasOnly() { renderCanvas(); }

/* -------------------- Eventos do canvas -------------------- */

function wireCanvasEvents(canvas) {
  canvas.querySelectorAll('.builder-section').forEach(sec => {
    sec.addEventListener('click', (e) => {
      if (e.target.closest('.builder-column') || e.target.closest('.builder-block-toolbar')) return;
      e.stopPropagation();
      selectElement(sec.dataset.sectionId, 'section');
    });
  });

  canvas.querySelectorAll('.builder-column').forEach(col => {
    col.addEventListener('click', (e) => {
      if (e.target.closest('.builder-element') || e.target.closest('.builder-block-toolbar')) return;
      e.stopPropagation();
      selectElement(col.dataset.columnId, 'column');
    });
    col.querySelector('[data-duplicate-column]').addEventListener('click', (e) => {
      e.stopPropagation();
      const { owner } = findColumnAndSection(col.dataset.columnId);
      if (!owner) return;
      if (owner.type === 'colunas') {
        const clone = duplicateElementById(owner.id);
        pushHistory(); renderCanvas();
        if (clone) selectElement(clone.id, 'element');
        return;
      }
      const clone = duplicateColumnInSection(owner, col.dataset.columnId);
      pushHistory(); renderCanvas();
      if (clone) selectElement(clone.id, 'column');
    });
    const deleteColumnBtn = col.querySelector('[data-delete-column]');
    if (deleteColumnBtn) {
      deleteColumnBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const columnId = col.dataset.columnId;
        if (removeColumnById(columnId)) {
          if (selectedId === columnId) deselect();
          pushHistory(); renderCanvas();
        }
      });
    }
  });

  canvas.querySelectorAll('.builder-element').forEach(elBlock => {
    elBlock.addEventListener('click', (e) => {
      if (e.target.closest('.builder-block-toolbar')) return;
      e.stopPropagation();
      selectElement(elBlock.dataset.elementId, 'element');
    });
    elBlock.querySelector('[data-duplicate-element]').addEventListener('click', (e) => {
      e.stopPropagation();
      const clone = duplicateElementById(elBlock.dataset.elementId);
      pushHistory(); renderCanvas();
      if (clone) selectElement(clone.id, 'element');
    });
    elBlock.querySelector('[data-delete-element]').addEventListener('click', (e) => {
      e.stopPropagation();
      removeElementById(elBlock.dataset.elementId);
      if (selectedId === elBlock.dataset.elementId) selectedId = null;
      pushHistory(); renderCanvas(); renderLeftPanel();
    });

    const submitPreviewBtn = elBlock.querySelector('[data-form-submit-preview]');
    if (submitPreviewBtn) submitPreviewBtn.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); showToast('Prévia: o envio real funciona quando a página for publicada.'); });

    const carouselTrack = elBlock.querySelector('.be-testimonials-track');
    if (carouselTrack) {
      elBlock.querySelectorAll('[data-carousel-arrow]').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.preventDefault(); e.stopPropagation();
          const cardWidth = carouselTrack.querySelector('.be-testimonial-card')?.offsetWidth || carouselTrack.offsetWidth;
          carouselTrack.scrollBy({ left: btn.dataset.carouselArrow === 'prev' ? -(cardWidth + 16) : (cardWidth + 16), behavior: 'smooth' });
        });
      });
      const dots = elBlock.querySelectorAll('[data-carousel-dot]');
      dots.forEach(dot => {
        dot.addEventListener('click', (e) => {
          e.preventDefault(); e.stopPropagation();
          const cardWidth = carouselTrack.querySelector('.be-testimonial-card')?.offsetWidth || carouselTrack.offsetWidth;
          carouselTrack.scrollTo({ left: Number(dot.dataset.carouselDot) * (cardWidth + 16), behavior: 'smooth' });
        });
      });
      if (dots.length) {
        carouselTrack.addEventListener('scroll', () => {
          const cardWidth = carouselTrack.querySelector('.be-testimonial-card')?.offsetWidth || carouselTrack.offsetWidth;
          const nearest = Math.round(carouselTrack.scrollLeft / (cardWidth + 16));
          dots.forEach((dot, i) => dot.classList.toggle('active', i === nearest));
        });
      }
    }

    const imageCarouselTrack = elBlock.querySelector('[data-image-carousel-track]');
    if (imageCarouselTrack) {
      elBlock.querySelectorAll('[data-image-carousel-arrow]').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.preventDefault(); e.stopPropagation();
          const imgWidth = imageCarouselTrack.querySelector('img')?.offsetWidth || imageCarouselTrack.offsetWidth;
          imageCarouselTrack.scrollBy({ left: btn.dataset.imageCarouselArrow === 'prev' ? -(imgWidth + 12) : (imgWidth + 12), behavior: 'smooth' });
        });
      });
    }
  });

  wireEditableFields(canvas, 'edit');
  wireColumnResizers(canvas);
}

const SANITIZE_BLOCK_TAGS = ['P', 'DIV', 'LI', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'BLOCKQUOTE', 'TR'];
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

function sanitizeMultiParagraphHtml(html) {
  const temp = document.createElement('div');
  temp.innerHTML = html || '';
  const paragraphs = [];
  let currentHtml = '';
  function flush() {
    paragraphs.push(currentHtml);
    currentHtml = '';
  }
  function walk(node) {
    node.childNodes.forEach(child => {
      if (child.nodeType === 3) {
        currentHtml += escapeHtml(child.textContent);
      } else if (child.nodeType === 1) {
        if (child.tagName === 'BR') {
          flush();
        } else if (SANITIZE_BLOCK_TAGS.includes(child.tagName)) {
          if (currentHtml) flush();
          currentHtml = sanitizeInlineHtml(child);
          flush();
        } else if (SANITIZE_INLINE_TAGS[child.tagName]) {
          const tag = SANITIZE_INLINE_TAGS[child.tagName];
          currentHtml += `<${tag}>${sanitizeInlineHtml(child)}</${tag}>`;
        } else {
          walk(child);
        }
      }
    });
  }
  walk(temp);
  if (currentHtml || !paragraphs.length) flush();
  return paragraphs.map(p => `<p>${p}</p>`).join('');
}

function textContentToPlain(html) {
  const temp = document.createElement('div');
  temp.innerHTML = html || '';
  const paragraphs = Array.from(temp.querySelectorAll('p'));
  if (paragraphs.length) return paragraphs.map(p => p.textContent).join('\n');
  return temp.textContent;
}

function plainToTextContent(plain) {
  return plain.split('\n').map(line => `<p>${escapeHtml(line)}</p>`).join('');
}

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
    const textEl = anchorEl ? anchorEl.closest('.be-text[contenteditable="true"]') : null;
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

function wireEditableFields(root, mode) {
  ensureTextFormatToolbar();
  root.querySelectorAll('[data-editable]').forEach(node => {
    if (node.classList.contains('be-text')) {
      try { document.execCommand('defaultParagraphSeparator', false, 'p'); } catch (e) { /* noop */ }
    }
    node.addEventListener('paste', (e) => {
      e.preventDefault();
      const text = (e.clipboardData || window.clipboardData).getData('text/plain');
      document.execCommand('insertText', false, text);
    });
    node.addEventListener('input', () => {
      const elBlock = node.closest('.builder-element');
      if (!elBlock) return;
      const loc = findElementLocation(elBlock.dataset.elementId);
      if (!loc) return;
      const isMultiParagraph = loc.element.type === 'texto';
      applyEditablePath(loc.element, node.dataset.editable, isMultiParagraph ? sanitizeMultiParagraphHtml(node.innerHTML) : node.innerText);
    });
    node.addEventListener('blur', () => pushHistory());
  });
}

function applyEditablePath(el, path, value) {
  const parts = path.split(':');
  if (parts[0] === 'content') { el.content = value; return; }
  if (parts[0] === 'items' && parts.length === 2) { el.items[Number(parts[1])] = value; return; }
  if (parts[0] === 'items' && parts.length === 3) { el.items[Number(parts[1])][parts[2]] = value; return; }
}

/* -------------------- Seleção -------------------- */

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
  const header = document.querySelector('[data-header-select]');
  if (header) header.classList.toggle('is-selected', selectedId === '__header__');
}

/* -------------------- Drag and drop (SortableJS) -------------------- */

function destroySortables() {
  sortableInstances.forEach(s => { try { s.destroy(); } catch (e) { /* já destruído */ } });
  sortableInstances = [];
}

function initSortables(canvas) {
  destroySortables();
  if (typeof Sortable === 'undefined') return;
  if (currentPageKey === 'checkout') return;

  sortableInstances.push(new Sortable(canvas, {
    animation: 160,
    handle: '[data-drag-section]',
    draggable: '.builder-section',
    group: { name: 'builder-sections', pull: false, put: ['builder-sections'] },
    ghostClass: 'sortable-ghost',
    onEnd: () => { resyncSectionsOrderFromDom(canvas); pushHistory(); renderCanvas(); }
  }));

  canvas.querySelectorAll('.builder-columns-row').forEach(row => {
    const rowGroupName = 'builder-columns-' + row.dataset.sectionId;
    sortableInstances.push(new Sortable(row, {
      animation: 160,
      handle: '[data-drag-column]',
      draggable: '.builder-column',
      group: { name: rowGroupName, pull: true, put: [rowGroupName, 'builder-elements'] },
      ghostClass: 'sortable-ghost',
      onAdd: (evt) => {
        if (!evt.item.classList.contains('builder-el-item') || !evt.item.dataset.columnsLayout) {
          evt.item.remove();
          return;
        }
        const widths = JSON.parse(evt.item.dataset.columnsLayout);
        evt.item.remove();
        const firstColumnId = row.querySelector('.builder-column')?.dataset.columnId;
        if (!firstColumnId) return;
        insertColumnsRowRelativeTo(firstColumnId, widths, 'below');
        pushHistory();
        renderCanvas();
      },
      onEnd: () => {
        if (!row.isConnected) return;
        resyncColumnsOrderFromDom(row); pushHistory(); renderCanvas();
      }
    }));
  });

  canvas.querySelectorAll('.builder-elements-list').forEach(list => {
    sortableInstances.push(new Sortable(list, {
      animation: 160,
      draggable: '.builder-element',
      filter: '[contenteditable="true"]',
      preventOnFilter: false,
      group: { name: 'builder-elements', pull: true, put: ['builder-elements'] },
      ghostClass: 'sortable-ghost',
      dragClass: 'sortable-drag',
      emptyInsertThreshold: 20,
      onAdd: (evt) => {
        if (evt.item.classList.contains('builder-el-item')) {
          const toColumnId = evt.to.dataset.columnId;
          const newIndex = evt.newIndex;
          if (evt.item.dataset.columnsLayout) {
            const widths = JSON.parse(evt.item.dataset.columnsLayout);
            evt.item.remove();
            const { column } = findColumnAndSection(toColumnId);
            if (!column) return;
            const position = newIndex <= column.elements.length / 2 ? 'above' : 'below';
            insertColumnsRowRelativeTo(toColumnId, widths, position);
            pushHistory();
            renderCanvas();
            return;
          }
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

  const sidebarPanel = document.getElementById('builder-elements-panel');
  if (sidebarPanel) {
    sidebarPanel.querySelectorAll('.builder-el-grid').forEach(grid => {
      sortableInstances.push(new Sortable(grid, {
        group: { name: 'builder-elements', pull: 'clone', put: false },
        sort: false,
        animation: 150,
        ghostClass: 'sortable-chosen',
        filter: '.is-structural',
        preventOnFilter: false
      }));
    });
  }
}

function wireColumnResizers(canvas) {
  canvas.querySelectorAll('[data-resizer]').forEach(handle => {
    handle.addEventListener('mousedown', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const leftId = handle.dataset.leftCol;
      const rightId = handle.dataset.rightCol;
      const { owner, column: leftCol } = findColumnAndSection(leftId);
      const rightCol = owner ? owner.columns.find(c => c.id === rightId) : null;
      if (!leftCol || !rightCol) return;
      handle.classList.add('is-dragging');
      const rowEl = handle.closest('.builder-columns-row');
      const rowWidth = rowEl.getBoundingClientRect().width;
      const startX = e.clientX;
      const startLeft = leftCol.width;
      const startRight = rightCol.width;

      function onMove(ev) {
        const deltaPct = ((ev.clientX - startX) / rowWidth) * 100;
        let newLeft = Math.max(8, Math.min(startLeft + startRight - 8, startLeft + deltaPct));
        let newRight = startLeft + startRight - newLeft;
        leftCol.width = Math.round(newLeft * 100) / 100;
        rightCol.width = Math.round(newRight * 100) / 100;
        const leftEl = canvas.querySelector(`.builder-column[data-column-id="${leftId}"]`);
        const rightEl = canvas.querySelector(`.builder-column[data-column-id="${rightId}"]`);
        if (leftEl) { leftEl.style.flex = `0 0 ${leftCol.width}%`; leftEl.style.maxWidth = `${leftCol.width}%`; }
        if (rightEl) { rightEl.style.flex = `0 0 ${rightCol.width}%`; rightEl.style.maxWidth = `${rightCol.width}%`; }
      }
      function onUp() {
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
        handle.classList.remove('is-dragging');
        pushHistory();
      }
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    });
  });
}

function renderSectionHtml(section, mode, device) {
  mode = mode || 'edit';
  device = device || currentDevice;
  const toolbar = mode === 'edit' ? `
      <div class="builder-block-toolbar">
        <span class="builder-block-toolbar-tag">Seção</span>
        <button type="button" class="el-drag-handle" title="Mover" data-drag-section>${BI.move}</button>
      </div>` : '';
  const bgImages = section.bgImage ? [section.bgImage, ...(section.bgImages || [])].filter(Boolean).slice(0, 3) : [];
  const bgFitStyle = bgImageFitStyle(section.bgFit);
  const bgImageDiv = bgImages.length > 1
    ? bgImages.map(src => `<div class="builder-section-bg-image builder-section-bg-carousel-layer" style="background-image:url('${src}');${bgFitStyle}"></div>`).join('')
    : (bgImages.length === 1 ? `<div class="builder-section-bg-image" style="background-image:url('${bgImages[0]}');${bgFitStyle}"></div>` : '');
  const overlayDiv = (section.bgImage && section.overlayColor)
    ? `<div class="builder-section-overlay" style="background-color:${section.overlayColor};opacity:${section.overlayOpacity !== undefined ? section.overlayOpacity : 1};"></div>`
    : '';
  const columnsRowHtml = `<div class="builder-columns-row" data-section-id="${section.id}">
        ${section.columns.map((col, i) => renderColumnHtml(col, section, i, mode, device)).join('')}
      </div>`;
  return `
    <section class="builder-section" id="${section.id}" data-section-id="${section.id}" data-bg-carousel-count="${bgImages.length > 1 ? bgImages.length : ''}" style="${section.bg ? `background-color:${section.bg};` : ''}${section.marginTop ? `margin-top:${section.marginTop}px;` : ''}${section.marginBottom ? `margin-bottom:${section.marginBottom}px;` : ''}">
      ${bgImageDiv}
      ${overlayDiv}
      ${toolbar}
      ${columnsRowHtml}
    </section>
  `;
}

function renderColumnHtml(column, owner, index, mode, device) {
  mode = mode || 'edit';
  device = device || currentDevice;
  const resizer = mode === 'edit' && currentPageKey !== 'checkout' && index < owner.columns.length - 1
    ? `<div class="builder-column-resizer" data-resizer data-left-col="${column.id}" data-right-col="${owner.columns[index + 1].id}"></div>`
    : '';
  const toolbar = mode === 'edit' ? `
      <div class="builder-block-toolbar">
        <span class="builder-block-toolbar-tag">Coluna</span>
        <button type="button" class="el-drag-handle" title="Mover" data-drag-column>${BI.move}</button>
        <button type="button" data-duplicate-column title="Duplicar">${BI.duplicate}</button>
        <button type="button" data-delete-column title="Excluir">${BI.trash}</button>
      </div>` : '';
  const visibleElements = column.elements.filter(el => mode === 'edit' || !isHiddenOnDevice(el, device));
  const isWholeEmptySection = owner.type !== 'colunas' && owner.columns.length === 1 && column.elements.length === 0;
  const emptyPlaceholder = isWholeEmptySection
    ? `${BI.layers}<span>Esta seção ainda não possui elementos.<br>Arraste um elemento aqui para começar.</span>`
    : `<span>Arraste um elemento aqui para começar</span>`;
  return `
    <div class="builder-column" data-column-id="${column.id}" style="flex: 0 0 ${column.width}%; max-width:${column.width}%;${column.marginTop ? `margin-top:${column.marginTop}px;` : ''}${column.marginBottom ? `margin-bottom:${column.marginBottom}px;` : ''}">
      ${toolbar}
      <div class="builder-elements-list ${mode === 'edit' && !column.elements.length ? 'is-empty' : ''} ${isWholeEmptySection ? 'is-empty-section' : ''}" data-column-id="${column.id}">
        ${visibleElements.length
          ? visibleElements.map(el => renderElementBlockHtml(el, mode, device)).join('')
          : (mode === 'edit' ? emptyPlaceholder : '')}
      </div>
    </div>
    ${resizer}
  `;
}

/* -------------------- Render: conteúdo de cada tipo de elemento -------------------- */

function parseVideoEmbed(url) {
  if (!url) return null;
  const yt = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([\w-]{6,})/);
  if (yt) return `https://www.youtube.com/embed/${yt[1]}`;
  const vimeo = url.match(/vimeo\.com\/(\d+)/);
  if (vimeo) return `https://player.vimeo.com/video/${vimeo[1]}`;
  return null;
}

function renderElementContent(el, device, mode) {
  const edit = mode === 'edit';
  const style = styleAttr(el, device);
  const editable = edit ? 'contenteditable="true" data-editable="content"' : '';
  const linkGuard = edit ? 'onclick="return false;"' : '';

  switch (el.type) {
    case 'colunas':
      return `
        <div class="builder-columns-row builder-columns-row-nested" data-section-id="${el.id}">
          ${el.columns.map((col, i) => renderColumnHtml(col, el, i, mode, device)).join('')}
        </div>
      `;

    case 'texto':
      return `<div class="be-text" style="${style}" ${editable}>${el.content}</div>`;

    case 'titulo': {
      const level = el.level || 2;
      return `<h${level} class="be-heading" style="${style}" ${editable}>${el.content}</h${level}>`;
    }

    case 'subtitulo':
      return `<p class="be-subtitle" style="${style}" ${editable}>${el.content}</p>`;

    case 'botao':
      return `<a href="${escapeHtml(el.href || '#')}" class="be-button" style="${style}" ${linkGuard} ${edit ? '' : (el.href && el.href.startsWith('http') ? 'target="_blank" rel="noopener noreferrer"' : '')}>
        <span ${editable}>${el.content}</span>
      </a>`;

    case 'link':
      return `<a href="${escapeHtml(el.href || '#')}" class="be-link" style="${style}" ${linkGuard} ${!edit && el.newTab ? 'target="_blank" rel="noopener noreferrer"' : ''} ${editable}>${el.content}</a>`;

    case 'icone': {
      const svg = BI[el.iconKey] || BI.icon;
      const size = styleValue(el, 'fontSize', device) || '32px';
      const color = styleValue(el, 'color', device);
      const opacity = styleValue(el, 'opacity', device);
      const marginStyle = ['marginTop', 'marginBottom', 'marginLeft', 'marginRight'].map(k => {
        const v = styleValue(el, k, device);
        return v ? `${STYLE_CSS_KEY[k]}:${v};` : '';
      }).join('');
      const body = `<span class="be-icon" style="width:${size};height:${size};${color ? `color:${color};` : ''}${opacity !== undefined ? `opacity:${opacity};` : ''}${marginStyle}">${svg}</span>`;
      return el.href ? `<a href="${escapeHtml(el.href)}" ${linkGuard}>${body}</a>` : body;
    }

    case 'imagem': {
      const img = `<img class="be-image" src="${el.src || placeholderImage()}" alt="${escapeHtml(el.alt || '')}" style="${style}">`;
      return el.href ? `<a href="${escapeHtml(el.href)}" ${linkGuard}>${img}</a>` : img;
    }

    case 'video': {
      const embed = parseVideoEmbed(el.url);
      if (!embed) {
        return `<div class="be-video-empty" style="${style}">${BI.video}<span>${edit ? 'Cole a URL de um vídeo do YouTube ou Vimeo no painel à direita' : 'Vídeo não configurado'}</span></div>`;
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

    case 'lista': {
      const useCustomMarker = !!el.iconStyle;
      const iconSvg = useCustomMarker ? LIST_ICON_SVG[el.iconStyle] : '';
      const tag = useCustomMarker ? 'ul' : (el.ordered ? 'ol' : 'ul');
      const listClass = `be-list${useCustomMarker ? ' be-list-custom-marker' : ''}`;
      const itemsHtml = el.items.map((item, i) => {
        if (useCustomMarker) {
          const marker = `<span class="be-list-marker" contenteditable="false">${iconSvg}${el.ordered ? `<span class="be-list-marker-num">${i + 1}.</span>` : ''}</span>`;
          const text = `<span class="be-list-item-text" ${edit ? `contenteditable="true" data-editable="items:${i}"` : ''}>${item}</span>`;
          return `<li>${marker}${text}</li>`;
        }
        return `<li ${edit ? `contenteditable="true" data-editable="items:${i}"` : ''}>${item}</li>`;
      }).join('');
      return `<${tag} class="${listClass}" style="${style}">${itemsHtml}</${tag}>`;
    }

    case 'redes': {
      const socialAlign = styleValue(el, 'textAlign', device);
      const justify = socialAlign === 'center' ? 'center' : socialAlign === 'right' ? 'flex-end' : 'flex-start';
      return `<div class="be-social" style="${style}justify-content:${justify};">${el.profiles.map(p => {
        const platform = SOCIAL_PLATFORMS[p.platform];
        if (!platform) return '';
        const bg = el.colorMode === 'original' ? (SOCIAL_PLATFORM_COLORS[p.platform] || '#18181B') : (el.customColor || '#18181B');
        const iconRadius = el.iconRadius != null ? el.iconRadius : 50;
        return `<a href="${escapeHtml(p.url || '#')}" ${linkGuard} title="${platform.label}" style="background-color:${bg};border-radius:${iconRadius}%;">${platform.svg}</a>`;
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
      const scrollFormat = el.scrollFormat || 'barra';
      const images = el.images || [];

      if (scrollFormat === 'setas') {
        return `<div class="be-carousel-arrows-wrap" style="${style}">
          <div class="be-carousel be-carousel-arrows-track" data-image-carousel-track>
            ${images.map(img => `<img src="${img.src || placeholderImage()}" alt="${escapeHtml(img.alt || '')}">`).join('')}
          </div>
          ${images.length > 1 ? `
          <button type="button" class="be-carousel-arrow be-carousel-arrow-prev" data-image-carousel-arrow="prev" aria-label="Anterior">${BI.chevronDown}</button>
          <button type="button" class="be-carousel-arrow be-carousel-arrow-next" data-image-carousel-arrow="next" aria-label="Próximo">${BI.chevronDown}</button>
          ` : ''}
        </div>`;
      }

      if (scrollFormat === 'automatico') {
        const dup = images.length ? [...images, ...images] : [];
        const duration = Math.max(10, images.length * 4);
        return `<div class="be-carousel-marquee" style="${style}">
          <div class="be-carousel-marquee-track" style="--carousel-marquee-duration:${duration}s;">
            ${dup.map(img => `<img src="${img.src || placeholderImage()}" alt="${escapeHtml(img.alt || '')}">`).join('')}
          </div>
        </div>`;
      }

      return `<div class="be-carousel" style="${style}">${images.map(img =>
        `<img src="${img.src || placeholderImage()}" alt="${escapeHtml(img.alt || '')}">`
      ).join('')}</div>`;
    }

    case 'depoimentos': {
      const cardRadius = styleValue(el, 'borderRadius', device);
      const cardStyle = `${cardRadius !== undefined ? `border-radius:${cardRadius};` : ''}${el.boxColor ? `background-color:${el.boxColor};` : ''}`;
      const textStyle = el.textColor ? `color:${el.textColor};` : '';
      const cardHtml = (t, i, editable) => `
        <div class="be-testimonial-card" style="${cardStyle}">
          <p class="be-testimonial-quote" style="${textStyle}" ${editable ? `contenteditable="true" data-editable="items:${i}:text"` : ''}>“${t.text}”</p>
          <div class="be-testimonial-person">
            <img class="be-testimonial-avatar" src="${t.avatar || placeholderAvatar()}" alt="">
            <div>
              <p class="be-testimonial-name" style="${textStyle}">${escapeHtml(t.name)}</p>
              <p class="be-testimonial-role">${escapeHtml(t.role || '')}</p>
            </div>
          </div>
        </div>
      `;
      const format = el.layoutFormat || 'grid';

      if (format === 'carrossel') {
        const visible = el.carouselVisible || 1;
        const pages = Math.max(1, Math.ceil(el.items.length / visible));
        return `<div class="be-testimonials-carousel" style="${style}">
          <div class="be-testimonials-track" style="--carousel-visible:${visible};">
            ${el.items.map((t, i) => cardHtml(t, i, edit)).join('')}
          </div>
          ${el.items.length > visible ? `
          <button type="button" class="be-carousel-arrow be-carousel-arrow-prev" data-carousel-arrow="prev" aria-label="Anterior">${BI.chevronDown}</button>
          <button type="button" class="be-carousel-arrow be-carousel-arrow-next" data-carousel-arrow="next" aria-label="Próximo">${BI.chevronDown}</button>
          <div class="be-carousel-dots">${Array.from({ length: pages }).map((_, i) => `<button type="button" class="be-carousel-dot${i === 0 ? ' active' : ''}" data-carousel-dot="${i}"></button>`).join('')}</div>
          ` : ''}
        </div>`;
      }

      if (format === 'marquee') {
        const loopItems = el.items.length ? [...el.items, ...el.items] : el.items;
        return `<div class="be-testimonials-marquee" style="${style}">
          <div class="be-testimonials-marquee-track" style="--marquee-duration:${Math.max(12, el.items.length * 6)}s;">
            ${loopItems.map((t, i) => cardHtml(t, i % el.items.length, false)).join('')}
          </div>
        </div>`;
      }

      const cols = device === 'mobile' ? 1 : (el.gridColumns || 3);
      return `<div class="be-testimonials" style="grid-template-columns:repeat(${cols}, 1fr);${style}">${el.items.map((t, i) => cardHtml(t, i, edit)).join('')}</div>`;
    }

    case 'formulario': {
      const form = typeof siteForms !== 'undefined' ? siteForms.find(f => f.id === el.formId) : null;
      const fields = form ? form.fields : [{ type: 'curta', question: 'Nome' }, { type: 'curta', question: 'E-mail' }, { type: 'longa', question: 'Mensagem' }];
      return `<div class="be-form-preview" style="${style}">
        <p class="be-form-preview-title">${escapeHtml(el.title || (form ? form.title : 'Formulário de contato'))}</p>
        ${fields.map(f => f.type === 'longa'
          ? `<div class="form-field-preview-box">${escapeHtml(f.question)}</div>`
          : `<input class="form-field-preview-line" placeholder="${escapeHtml(f.question)}" disabled>`
        ).join('')}
        <button type="button" class="btn-primary" data-form-submit-preview>Enviar</button>
      </div>`;
    }

    case 'mapa':
      return el.embedUrl
        ? `<iframe class="be-map-embed" src="${escapeHtml(el.embedUrl)}" style="${style}" loading="lazy"></iframe>`
        : `<div class="be-map-empty">${BI.map}<span>${edit ? 'Cole o link de incorporação do Google Maps no painel à direita' : 'Mapa não configurado'}${el.address ? `<br><strong>${escapeHtml(el.address)}</strong>` : ''}</span></div>`;

    case 'html':
    case 'codigo':
      return `<div class="be-custom-html" style="${style}">${el.content}</div>`;

    default:
      return '';
  }
}

function placeholderImage() {
  return 'data:image/svg+xml;utf8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="400" height="240"><rect width="400" height="240" fill="#E4E4E7"/><text x="50%" y="50%" font-family="sans-serif" font-size="16" fill="#A1A1AA" text-anchor="middle" dy=".3em">Imagem</text></svg>');
}

function placeholderAvatar() {
  return 'data:image/svg+xml;utf8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64"><rect width="64" height="64" fill="#E4E4E7"/><circle cx="32" cy="24" r="12" fill="#A1A1AA"/><ellipse cx="32" cy="56" rx="20" ry="14" fill="#A1A1AA"/></svg>');
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

/* ==========================================================================
   Inspector (painel de propriedades)
   ========================================================================== */

let inspectorActiveTab = 'content';
let marginSyncEnabled = true;
const STYLE_CAPABLE_TYPES = ['texto', 'titulo', 'subtitulo', 'botao', 'link', 'lista'];

function findSelected() {
  if (!selectedId) return null;
  if (selectedId === '__header__') return { kind: 'header', obj: builderState.header };
  const section = findSection(selectedId);
  if (section) return { kind: 'section', obj: section };
  const { owner, column } = findColumnAndSection(selectedId);
  if (column) return { kind: 'column', obj: column, owner };
  const loc = findElementLocation(selectedId);
  if (loc) return { kind: 'element', obj: loc.element };
  return null;
}

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
      if (input.type === 'number' && input.min !== '' && val !== '' && Number(val) < Number(input.min)) {
        val = input.min;
        input.value = val;
      }
      if (input.dataset.cast === 'number') val = Number(val);
      applyBind(el, path, val, unit);
      if (input.type === 'range') {
        const out = root.querySelector(`[data-range-out="${path}"]`);
        if (out) out.textContent = val + unit;
      }
      renderCanvasOnly();
      if (path === 'prop:layoutFormat') renderLeftPanel();
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
        if (group.dataset.segmented === 'prop:colorMode') renderLeftPanel();
        pushHistory();
      });
    });
  });
}

function fieldRow(label, inputHtml, labelClass) {
  return `<div class="inspector-field"><span class="${labelClass || 'inspector-field-label'}">${label}</span>${inputHtml}</div>`;
}

function currentDeviceStyleOrProp(el, key) {
  return currentStyleValue(el, key);
}

function cascadedStyleValue(el, key) {
  const v = styleValue(el, key, currentDevice);
  return v === undefined ? '' : v;
}

function numOrBlank(value) {
  return (value === undefined || value === '') ? '' : parseFloat(value);
}


/* -------------------- Inspector: Seção / Coluna -------------------- */

function renderSectionInspector(section) {
  return `
    <div class="inspector-field inspector-field-row">
      <span class="inspector-field-label">Cor de fundo</span>
      ${colorSwatchPopoverHtml(section.bg || '#ffffff', 'data-bind="prop:bg"')}
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
      <span class="inspector-field-label">Carrossel de imagens</span>
      <p class="inspector-hint" style="margin-top:-0.2rem;">Adicione até mais 2 imagens para alternar em slider no fundo da seção.</p>
      <div class="bg-carousel-thumbs">
        ${[0, 1].map(i => {
          const img = (section.bgImages || [])[i];
          return img
            ? `<div class="bg-carousel-thumb">
                 <img src="${img}" alt="">
                 <button type="button" class="bg-carousel-thumb-remove" data-section-bg-carousel-remove="${i}" title="Remover">${BI.close}</button>
               </div>`
            : `<label class="bg-carousel-thumb bg-carousel-thumb-empty" title="Adicionar imagem">
                 ${BI.plus}
                 <input type="file" accept="image/*" class="bg-carousel-thumb-input" data-section-bg-carousel-upload="${i}">
               </label>`;
        }).join('')}
      </div>
    </div>
    ` : ''}
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
    ` : ''}
    <div class="inspector-field">
      <span class="inspector-field-label">Menu correspondente</span>
      <select class="inspector-select" data-bind="prop:menuItemId">
        <option value="">Nenhum</option>
        ${((builderState.header && builderState.header.menuItems) || []).map(m => `<option value="${m.id}" ${section.menuItemId === m.id ? 'selected' : ''}>${escapeHtml(m.label)}</option>`).join('')}
      </select>
      <p class="inspector-hint">Ao escolher um menu, o item correspondente no cabeçalho passa a rolar até esta seção. Os nomes dos menus são editados em Cabeçalho → Menus.</p>
    </div>
  `;
}

function wireSectionInspector(section, body) {
  const colorInput = body.querySelector('[data-bind="prop:bg"]');
  if (colorInput) {
    colorInput.addEventListener('input', () => {
      section.bg = colorInput.value;
      applySectionBg(section);
    });
    colorInput.addEventListener('change', () => pushHistory());
  }

  const bgImageUpload = body.querySelector('[data-section-bg-image-upload]');
  if (bgImageUpload) {
    const applyBgImageFile = (file) => {
      readFileAsDataUrl(file, (dataUrl) => {
        section.bgImage = dataUrl;
        pushHistory();
        renderCanvas();
        renderLeftPanel();
      });
    };
    bgImageUpload.addEventListener('change', () => {
      const file = bgImageUpload.files[0];
      if (file) applyBgImageFile(file);
    });
    wireImageDropZone(bgImageUpload.closest('.header-logo-picker'), applyBgImageFile);
  }

  const bgImageRemove = body.querySelector('[data-section-bg-image-remove]');
  if (bgImageRemove) {
    bgImageRemove.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      section.bgImage = '';
      section.bgImages = [];
      pushHistory();
      renderCanvas();
      renderLeftPanel();
    });
  }

  body.querySelectorAll('[data-section-bg-carousel-upload]').forEach(input => {
    input.addEventListener('change', () => {
      const file = input.files[0];
      if (!file) return;
      const idx = Number(input.dataset.sectionBgCarouselUpload);
      readFileAsDataUrl(file, (dataUrl) => {
        if (!section.bgImages) section.bgImages = [];
        section.bgImages[idx] = dataUrl;
        pushHistory();
        renderCanvas();
        renderLeftPanel();
      });
    });
  });

  body.querySelectorAll('[data-section-bg-carousel-remove]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const idx = Number(btn.dataset.sectionBgCarouselRemove);
      if (section.bgImages) section.bgImages.splice(idx, 1);
      pushHistory();
      renderCanvas();
      renderLeftPanel();
    });
  });

  const overlayColorInput = body.querySelector('[data-section-overlay-color]');
  if (overlayColorInput) {
    overlayColorInput.addEventListener('input', () => {
      if (!section.overlayColor) section.overlayOpacity = 1;
      section.overlayColor = overlayColorInput.value;
      renderCanvas();
    });
    overlayColorInput.addEventListener('change', () => {
      pushHistory();
      renderLeftPanel();
    });
  }

  const overlayColorRemove = body.querySelector('[data-section-overlay-color-remove]');
  if (overlayColorRemove) {
    overlayColorRemove.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      section.overlayColor = '';
      pushHistory();
      renderCanvas();
      renderLeftPanel();
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

  const menuItemSelect = body.querySelector('[data-bind="prop:menuItemId"]');
  if (menuItemSelect) {
    menuItemSelect.addEventListener('change', () => {
      section.menuItemId = menuItemSelect.value || null;
      pushHistory();
      renderCanvas();
    });
  }

  const bgFitSelect = body.querySelector('[data-section-bg-fit]');
  if (bgFitSelect) {
    bgFitSelect.addEventListener('change', () => {
      section.bgFit = bgFitSelect.value;
      pushHistory();
      renderCanvas();
    });
  }
}

function renderHeaderInspector(header) {
  const forms = typeof siteForms !== 'undefined' ? siteForms : [];
  return `
    <p class="inspector-hint">Este cabeçalho é o mesmo em todos os sites criados, a estrutura (logo à esquerda, menu e botão) é fixa e não pode ser removida ou arrastada. Você pode editar o conteúdo abaixo.</p>
    <div class="inspector-field">
      <span class="inspector-field-label">Logo</span>
      <div class="header-logo-picker-wrap">
        <label class="header-logo-picker ${header.logoImage ? 'has-image' : ''}">
          ${header.logoImage
            ? `<img src="${header.logoImage}" class="header-logo-picker-preview" alt="">
               <div class="header-logo-picker-overlay">${BI.image}<span>Alterar imagem</span></div>`
            : `<span class="image-upload-zone-plus">${BI.plus}</span><span class="image-upload-zone-text">Adicione ou arraste uma imagem</span>`}
          <input type="file" accept="image/*" class="image-upload-zone-input" data-header-logo-upload>
        </label>
        ${header.logoImage ? `<button type="button" class="header-logo-picker-remove" data-header-logo-remove title="Remover logo">${BI.close}</button>` : ''}
      </div>
    </div>
    <div class="inspector-field">
      <span class="inspector-field-label">Botão de ação</span>
      <input type="text" class="inspector-input" data-header-field="ctaText" value="${escapeHtml(header.ctaText || '')}">
    </div>
    <div class="inspector-field">
      <span class="inspector-field-label">Formulário do botão de ação</span>
      <select class="inspector-select" data-header-field="ctaFormId">
        <option value="">Nenhum</option>
        ${forms.map(f => `<option value="${f.id}" ${header.ctaFormId === f.id ? 'selected' : ''}>${escapeHtml(f.title)}</option>`).join('')}
      </select>
    </div>
    <div class="inspector-field">
      <span class="inspector-field-label">Estilo do cabeçalho</span>
      <select class="inspector-select" data-header-field="style">
        <option value="padrao" ${(!header.style || header.style === 'padrao') ? 'selected' : ''}>Padrão</option>
        <option value="flutuante" ${header.style === 'flutuante' ? 'selected' : ''}>Flutuante</option>
      </select>
    </div>
    ${currentPageKey === 'checkout' ? '' : `
    <div class="inspector-toggle-row">
      <span class="inspector-field-label">Cabeçalho fixo</span>
      <label class="settings-switch">
        <input type="checkbox" data-header-sticky-toggle ${header.sticky !== false ? 'checked' : ''}>
        <span class="settings-switch-track"></span>
      </label>
    </div>
    `}
    <div class="inspector-field">
      <span class="inspector-field-label">Estilo do menu</span>
      <select class="inspector-select" data-header-field="menuStyle">
        <option value="padrao" ${(!header.menuStyle || header.menuStyle === 'padrao') ? 'selected' : ''}>Padrão</option>
        <option value="flutuante" ${header.menuStyle === 'flutuante' ? 'selected' : ''}>Flutuante</option>
        <option value="botoes" ${header.menuStyle === 'botoes' ? 'selected' : ''}>Botões</option>
      </select>
      <p class="inspector-hint">Flutuante coloca os links dentro de uma pílula única. Botões dá um fundo individual a cada link.</p>
    </div>

    <div class="inspector-section-title">Cores</div>
    <div class="inspector-field inspector-field-row">
      <span class="inspector-field-label-plain">Fundo do Cabeçalho</span>
      <div class="color-alpha-field" data-color-alpha-field>
        <button type="button" class="color-alpha-swatch" data-color-alpha-toggle style="background-color:${hexToRgba(header.bgColor || '#FAFAFA', header.bgOpacity !== undefined ? header.bgOpacity : 1)}"></button>
        <div class="color-alpha-popover" data-color-alpha-popover hidden>
          <div class="color-alpha-top-row">
            <input type="color" class="color-alpha-native" data-header-bg-native value="${header.bgColor || '#FAFAFA'}">
            <input type="text" class="color-alpha-hex" data-header-bg-hex value="${escapeHtml((header.bgColor || '#FAFAFA').toUpperCase())}" maxlength="7" spellcheck="false">
          </div>
          <div class="color-alpha-range-row">
            <span class="color-alpha-range-label">Transparência</span>
            <input type="range" min="0" max="1" step="0.01" class="color-alpha-range" data-header-bg-opacity value="${1 - (header.bgOpacity !== undefined ? header.bgOpacity : 1)}">
          </div>
        </div>
      </div>
    </div>
    <div class="inspector-field inspector-field-row">
      <span class="inspector-field-label-plain">Texto do Menu</span>
      ${colorSwatchPopoverHtml(header.textColor || '#3F3F46', 'data-header-color="textColor"')}
    </div>
    <div class="inspector-field inspector-field-row">
      <span class="inspector-field-label-plain">Botão de Ação</span>
      ${colorSwatchPopoverHtml(header.ctaBgColor || builderState.globalStyle.primaryColor || '#183b54', 'data-header-color="ctaBgColor"')}
    </div>
    <div class="inspector-field inspector-field-row">
      <span class="inspector-field-label-plain">Texto do Botão de Ação</span>
      ${colorSwatchPopoverHtml(header.ctaTextColor || '#ffffff', 'data-header-color="ctaTextColor"')}
    </div>

    <div class="inspector-section-title">Menus</div>
    ${renderSectionsMenuListHtml()}
  `;
}

function wireHeaderInspector(header, body) {
  body.querySelectorAll('[data-header-field]').forEach(input => {
    const isSelect = input.tagName === 'SELECT';
    input.addEventListener(isSelect ? 'change' : 'input', () => {
      header[input.dataset.headerField] = input.value;
      renderCanvas();
    });
    input.addEventListener(isSelect ? 'change' : 'blur', () => pushHistory());
  });

  const uploadInput = body.querySelector('[data-header-logo-upload]');
  if (uploadInput) {
    const applyLogoFile = (file) => {
      readFileAsDataUrl(file, (dataUrl) => {
        header.logoImage = dataUrl;
        header.logoScale = 1;
        header.logoOffsetX = 0;
        header.logoOffsetY = 0;
        pushHistory();
        renderCanvas();
        renderLeftPanel();
        openLogoAdjustModal(header);
      });
    };
    uploadInput.addEventListener('change', () => {
      const file = uploadInput.files[0];
      if (file) applyLogoFile(file);
    });
    wireImageDropZone(uploadInput.closest('.header-logo-picker'), applyLogoFile);
  }

  const removeBtn = body.querySelector('[data-header-logo-remove]');
  if (removeBtn) {
    removeBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      header.logoImage = '';
      header.logoScale = 1;
      header.logoOffsetX = 0;
      header.logoOffsetY = 0;
      pushHistory();
      renderCanvas();
      renderLeftPanel();
    });
  }

  const stickyToggle = body.querySelector('[data-header-sticky-toggle]');
  if (stickyToggle) {
    stickyToggle.addEventListener('change', () => {
      header.sticky = stickyToggle.checked;
      pushHistory();
      renderCanvas();
    });
  }

  const colorAlphaField = body.querySelector('[data-color-alpha-field]');
  if (colorAlphaField) {
    const toggle = colorAlphaField.querySelector('[data-color-alpha-toggle]');
    const popover = colorAlphaField.querySelector('[data-color-alpha-popover]');
    const nativeColor = colorAlphaField.querySelector('[data-header-bg-native]');
    const hexInput = colorAlphaField.querySelector('[data-header-bg-hex]');
    const opacityRange = colorAlphaField.querySelector('[data-header-bg-opacity]');

    const updateSwatch = () => {
      const opacity = header.bgOpacity !== undefined ? header.bgOpacity : 1;
      toggle.style.backgroundColor = hexToRgba(header.bgColor || '#FAFAFA', opacity);
    };

    wireColorPopoverToggle(colorAlphaField, toggle, popover);

    nativeColor.addEventListener('input', () => {
      header.bgColor = nativeColor.value;
      hexInput.value = nativeColor.value.toUpperCase();
      updateSwatch();
      renderCanvas();
    });
    nativeColor.addEventListener('change', () => pushHistory());

    hexInput.addEventListener('input', () => {
      const val = hexInput.value.trim();
      if (/^#[0-9A-Fa-f]{6}$/.test(val)) {
        header.bgColor = val;
        nativeColor.value = val;
        updateSwatch();
        renderCanvas();
      }
    });
    hexInput.addEventListener('blur', () => {
      hexInput.value = (header.bgColor || '#FAFAFA').toUpperCase();
      pushHistory();
    });

    opacityRange.addEventListener('input', () => {
      header.bgOpacity = 1 - parseFloat(opacityRange.value);
      updateSwatch();
      renderCanvas();
    });
    opacityRange.addEventListener('change', () => pushHistory());
  }

  const colorGroups = {};
  body.querySelectorAll('[data-header-color]').forEach(input => {
    const key = input.dataset.headerColor;
    (colorGroups[key] = colorGroups[key] || []).push(input);
  });
  Object.keys(colorGroups).forEach(key => {
    const [colorInput, textInput] = colorGroups[key];
    const sync = (val) => {
      header[key] = val;
      if (val) colorInput.value = val;
      if (textInput) textInput.value = val;
      renderCanvas();
    };
    colorInput.addEventListener('input', () => sync(colorInput.value));
    colorInput.addEventListener('change', () => pushHistory());
    if (textInput) {
      textInput.addEventListener('input', () => sync(textInput.value));
      textInput.addEventListener('blur', () => pushHistory());
    }
  });

  wireSectionsMenuList(body);
}

/* -------------------- Modal: ajustar logo -------------------- */

let logoAdjustHeaderRef = null;

function openLogoAdjustModal(header) {
  logoAdjustHeaderRef = header;
  const modal = document.getElementById('logo-adjust-modal');
  if (!modal) return;
  wireLogoAdjustModalOnce();
  const img = modal.querySelector('[data-logo-adjust-modal-img]');
  img.src = header.logoImage;
  updateLogoAdjustModalTransform();
  modal.classList.add('show');
}

function closeLogoAdjustModal() {
  if (logoAdjustHeaderRef) pushHistory();
  logoAdjustHeaderRef = null;
  const modal = document.getElementById('logo-adjust-modal');
  if (modal) modal.classList.remove('show');
  renderCanvas();
  renderLeftPanel();
}

function updateLogoAdjustModalTransform() {
  if (!logoAdjustHeaderRef) return;
  const modal = document.getElementById('logo-adjust-modal');
  if (!modal) return;
  const h = logoAdjustHeaderRef;
  const img = modal.querySelector('[data-logo-adjust-modal-img]');
  if (img) img.style.transform = `scale(${h.logoScale || 1}) translate(${h.logoOffsetX || 0}%, ${h.logoOffsetY || 0}%)`;
  const rangeInput = modal.querySelector('[data-logo-adjust-modal-range]');
  if (rangeInput) rangeInput.value = h.logoScale || 1;
  renderCanvas();
}

function wireLogoAdjustModalOnce() {
  const modal = document.getElementById('logo-adjust-modal');
  if (!modal || modal.dataset.wired) return;
  modal.dataset.wired = '1';

  modal.addEventListener('click', (e) => { if (e.target === modal) closeLogoAdjustModal(); });
  const closeBtn = modal.querySelector('[data-logo-adjust-modal-close]');
  if (closeBtn) closeBtn.addEventListener('click', closeLogoAdjustModal);
  const doneBtn = modal.querySelector('[data-logo-adjust-modal-done]');
  if (doneBtn) doneBtn.addEventListener('click', closeLogoAdjustModal);

  const rangeInput = modal.querySelector('[data-logo-adjust-modal-range]');
  if (rangeInput) {
    rangeInput.addEventListener('input', () => {
      if (!logoAdjustHeaderRef) return;
      logoAdjustHeaderRef.logoScale = parseFloat(rangeInput.value);
      updateLogoAdjustModalTransform();
    });
  }

  const zoomMinus = modal.querySelector('[data-logo-adjust-modal-zoom-minus]');
  if (zoomMinus) {
    zoomMinus.addEventListener('click', () => {
      if (!logoAdjustHeaderRef) return;
      logoAdjustHeaderRef.logoScale = Math.max(1, +(((logoAdjustHeaderRef.logoScale || 1) - 0.05).toFixed(2)));
      updateLogoAdjustModalTransform();
    });
  }
  const zoomPlus = modal.querySelector('[data-logo-adjust-modal-zoom-plus]');
  if (zoomPlus) {
    zoomPlus.addEventListener('click', () => {
      if (!logoAdjustHeaderRef) return;
      logoAdjustHeaderRef.logoScale = Math.min(8, +(((logoAdjustHeaderRef.logoScale || 1) + 0.05).toFixed(2)));
      updateLogoAdjustModalTransform();
    });
  }


  const frame = modal.querySelector('[data-logo-adjust-modal-frame]');
  if (frame) {
    let dragging = false;
    let dragStartX = 0, dragStartY = 0, startX = 0, startY = 0;
    frame.addEventListener('pointerdown', (e) => {
      if (!logoAdjustHeaderRef) return;
      dragging = true;
      dragStartX = e.clientX;
      dragStartY = e.clientY;
      startX = logoAdjustHeaderRef.logoOffsetX || 0;
      startY = logoAdjustHeaderRef.logoOffsetY || 0;
      frame.setPointerCapture(e.pointerId);
      frame.classList.add('is-dragging');
    });
    frame.addEventListener('pointermove', (e) => {
      if (!dragging || !logoAdjustHeaderRef) return;
      const rect = frame.getBoundingClientRect();
      const dxPct = ((e.clientX - dragStartX) / rect.width) * 100;
      const dyPct = ((e.clientY - dragStartY) / rect.height) * 100;
      logoAdjustHeaderRef.logoOffsetX = Math.max(-50, Math.min(50, startX + dxPct));
      logoAdjustHeaderRef.logoOffsetY = Math.max(-50, Math.min(50, startY + dyPct));
      updateLogoAdjustModalTransform();
    });
    const endDrag = () => { dragging = false; frame.classList.remove('is-dragging'); };
    frame.addEventListener('pointerup', endDrag);
    frame.addEventListener('pointercancel', endDrag);
  }
}

function renderSectionsMenuListHtml() {
  const items = builderState.header.menuItems || [];
  return `
    <p class="inspector-hint">Arraste para reordenar os itens do menu do cabeçalho. Em cada seção, escolha o "Menu correspondente" para linkar a ela.</p>
    <div class="menu-order-list" id="menu-order-list">
      ${items.map(item => `
        <div class="menu-order-row" data-menu-row="${item.id}">
          <button type="button" class="el-drag-handle" title="Arrastar para reordenar" data-drag-menu-row>${BI.grip}</button>
          <input type="text" class="inspector-input" data-menu-name="${item.id}" value="${escapeHtml(item.label || '')}" placeholder="Nome no menu">
          <label class="settings-switch" title="Mostrar/ocultar no menu">
            <input type="checkbox" data-menu-visible-toggle="${item.id}" ${item.visible !== false ? 'checked' : ''}>
            <span class="settings-switch-track"></span>
          </label>
        </div>
      `).join('')}
    </div>
  `;
}

function wireSectionsMenuList(body) {
  body.querySelectorAll('[data-menu-name]').forEach(input => {
    input.addEventListener('input', () => {
      const item = builderState.header.menuItems.find(m => m.id === input.dataset.menuName);
      if (!item) return;
      item.label = input.value;
      renderCanvas();
    });
    input.addEventListener('blur', () => pushHistory());
  });

  body.querySelectorAll('[data-menu-visible-toggle]').forEach(toggle => {
    const stop = (e) => e.stopPropagation();
    toggle.addEventListener('pointerdown', stop);
    toggle.addEventListener('mousedown', stop);
    toggle.addEventListener('touchstart', stop);
    toggle.addEventListener('change', () => {
      const item = builderState.header.menuItems.find(m => m.id === toggle.dataset.menuVisibleToggle);
      if (!item) return;
      item.visible = toggle.checked;
      builderState.sections.forEach(section => {
        if (section.menuItemId === item.id) {
          section.hidden = !toggle.checked;
          if (section.hidden && selectedId === section.id) deselect();
        }
      });
      pushHistory();
      renderCanvas();
    });
  });

  const list = body.querySelector('#menu-order-list');
  if (list && typeof Sortable !== 'undefined') {
    new Sortable(list, {
      animation: 160,
      handle: '[data-drag-menu-row]',
      draggable: '.menu-order-row',
      ghostClass: 'sortable-ghost',
      filter: 'input, .settings-switch',
      preventOnFilter: false,
      onEnd: () => {
        const orderedIds = Array.from(list.querySelectorAll(':scope > .menu-order-row')).map(n => n.dataset.menuRow);
        const byId = {};
        builderState.header.menuItems.forEach(m => { byId[m.id] = m; });
        builderState.header.menuItems = orderedIds.map(id => byId[id]).filter(Boolean);
        pushHistory();
        renderCanvas();
      }
    });
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
}

function renderColumnInspector(column) {
  return `
    <div class="inspector-field">
      <span class="inspector-field-label">Largura da coluna <span>${column.width.toFixed ? column.width.toFixed(1) : column.width}%</span></span>
      <input type="range" min="8" max="100" step="0.5" value="${column.width}" data-column-width>
    </div>
    <span class="inspector-field-label">Margem (px)</span>
    <div class="inspector-row">
      <div class="inspector-field">
        <span class="inspector-field-label">Topo</span>
        <input type="number" class="inspector-input" data-column-margin-top value="${column.marginTop || ''}">
      </div>
      <div class="inspector-field">
        <span class="inspector-field-label">Base</span>
        <input type="number" class="inspector-input" data-column-margin-bottom value="${column.marginBottom || ''}">
      </div>
    </div>
  `;
}

function wireColumnInspector(column, body) {
  const widthInput = body.querySelector('[data-column-width]');
  if (widthInput) {
    widthInput.addEventListener('input', () => {
      column.width = Number(widthInput.value);
      const node = document.querySelector(`.builder-column[data-column-id="${column.id}"]`);
      if (node) { node.style.flex = `0 0 ${column.width}%`; node.style.maxWidth = `${column.width}%`; }
      body.querySelector('.inspector-field-label span').textContent = column.width.toFixed(1) + '%';
    });
    widthInput.addEventListener('change', () => pushHistory());
  }

  const marginTopInput = body.querySelector('[data-column-margin-top]');
  if (marginTopInput) {
    marginTopInput.addEventListener('input', () => {
      column.marginTop = marginTopInput.value === '' ? 0 : Number(marginTopInput.value);
      const node = document.querySelector(`.builder-column[data-column-id="${column.id}"]`);
      if (node) node.style.marginTop = column.marginTop ? `${column.marginTop}px` : '';
    });
    marginTopInput.addEventListener('blur', () => pushHistory());
  }

  const marginBottomInput = body.querySelector('[data-column-margin-bottom]');
  if (marginBottomInput) {
    marginBottomInput.addEventListener('input', () => {
      column.marginBottom = marginBottomInput.value === '' ? 0 : Number(marginBottomInput.value);
      const node = document.querySelector(`.builder-column[data-column-id="${column.id}"]`);
      if (node) node.style.marginBottom = column.marginBottom ? `${column.marginBottom}px` : '';
    });
    marginBottomInput.addEventListener('blur', () => pushHistory());
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

  const textParagraphsInput = body.querySelector('[data-text-paragraphs]');
  if (textParagraphsInput) {
    textParagraphsInput.addEventListener('input', () => {
      el.content = plainToTextContent(textParagraphsInput.value);
      renderCanvasOnly();
    });
    textParagraphsInput.addEventListener('blur', () => pushHistory());
  }

  const uploadInput = body.querySelector('[data-image-upload]');
  if (uploadInput) {
    const applyImageFile = (file) => {
      readFileAsDataUrl(file, (dataUrl) => {
        el.src = dataUrl;
        pushHistory();
        renderCanvasOnly();
        renderLeftPanel();
      });
    };
    uploadInput.addEventListener('change', () => {
      const file = uploadInput.files[0];
      if (file) applyImageFile(file);
    });
    wireImageDropZone(uploadInput.closest('.image-upload-zone'), applyImageFile);
  }

  const imageRemoveBtn = body.querySelector('[data-image-remove]');
  if (imageRemoveBtn) {
    imageRemoveBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      el.src = '';
      pushHistory();
      renderCanvasOnly();
      renderLeftPanel();
    });
  }

  if (el.type === 'lista') {
    body.querySelectorAll('[data-list-item-text]').forEach(input => {
      input.addEventListener('input', () => {
        el.items[Number(input.dataset.listItemText)] = input.value;
        renderCanvasOnly();
      });
      input.addEventListener('blur', () => pushHistory());
    });
    body.querySelectorAll('[data-remove-item]').forEach(btn => {
      btn.addEventListener('click', () => { el.items.splice(Number(btn.dataset.removeItem), 1); pushHistory(); renderCanvasOnly(); renderLeftPanel(); });
    });
    const addBtn = body.querySelector('[data-add-item]');
    if (addBtn) addBtn.addEventListener('click', () => { el.items.push('Novo item'); pushHistory(); renderCanvasOnly(); renderLeftPanel(); });
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
    const addBtn = body.querySelector('[data-add-social]');
    if (addBtn) addBtn.addEventListener('click', () => { el.profiles.push({ platform: 'instagram', url: '' }); pushHistory(); renderCanvasOnly(); renderLeftPanel(); });
  }

  if (el.type === 'galeria' || el.type === 'carrossel') {
    body.querySelectorAll('[data-remove-image]').forEach(btn => {
      btn.addEventListener('click', () => { el.images.splice(Number(btn.dataset.removeImage), 1); pushHistory(); renderCanvasOnly(); renderLeftPanel(); });
    });
    body.querySelectorAll('[data-image-url]').forEach(input => {
      input.addEventListener('input', () => { el.images[Number(input.dataset.imageUrl)].src = input.value; renderCanvasOnly(); });
      input.addEventListener('blur', () => pushHistory());
    });
    body.querySelectorAll('[data-image-file]').forEach(fileInput => {
      const applyImageFile = (file) => {
        readFileAsDataUrl(file, (dataUrl) => {
          el.images[Number(fileInput.dataset.imageFile)].src = dataUrl;
          pushHistory(); renderCanvasOnly(); renderLeftPanel();
        });
      };
      fileInput.addEventListener('change', () => {
        const file = fileInput.files[0];
        if (file) applyImageFile(file);
      });
      wireImageDropZone(fileInput.closest('.image-upload-zone'), applyImageFile);
    });
    const addBtn = body.querySelector('[data-add-image]');
    if (addBtn) addBtn.addEventListener('click', () => { el.images.push({ src: '', alt: '' }); pushHistory(); renderCanvasOnly(); renderLeftPanel(); });
  }

  if (el.type === 'depoimentos') {
    body.querySelectorAll('[data-remove-testimonial]').forEach(btn => {
      btn.addEventListener('click', () => { el.items.splice(Number(btn.dataset.removeTestimonial), 1); pushHistory(); renderCanvasOnly(); renderLeftPanel(); });
    });
    body.querySelectorAll('[data-testimonial-text]').forEach(textarea => {
      textarea.addEventListener('input', () => { el.items[Number(textarea.dataset.testimonialText)].text = textarea.value; renderCanvasOnly(); });
      textarea.addEventListener('blur', () => pushHistory());
    });
    body.querySelectorAll('[data-testimonial-name]').forEach(input => {
      input.addEventListener('input', () => { el.items[Number(input.dataset.testimonialName)].name = input.value; renderCanvasOnly(); });
      input.addEventListener('blur', () => pushHistory());
    });
    body.querySelectorAll('[data-testimonial-role]').forEach(input => {
      input.addEventListener('input', () => { el.items[Number(input.dataset.testimonialRole)].role = input.value; renderCanvasOnly(); });
      input.addEventListener('blur', () => pushHistory());
    });
    body.querySelectorAll('[data-testimonial-avatar]').forEach(fileInput => {
      const applyImageFile = (file) => {
        readFileAsDataUrl(file, (dataUrl) => {
          el.items[Number(fileInput.dataset.testimonialAvatar)].avatar = dataUrl;
          pushHistory(); renderCanvasOnly(); renderLeftPanel();
        });
      };
      fileInput.addEventListener('change', () => {
        const file = fileInput.files[0];
        if (file) applyImageFile(file);
      });
      wireImageDropZone(fileInput.closest('.image-upload-zone'), applyImageFile);
    });
    const addBtn = body.querySelector('[data-add-testimonial]');
    if (addBtn) addBtn.addEventListener('click', () => { el.items.push({ name: 'Novo cliente', role: '', text: 'Escreva aqui o depoimento.', avatar: '' }); pushHistory(); renderCanvasOnly(); renderLeftPanel(); });
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
      ? colorFieldHtml(el, el.type === 'titulo' ? 'Cor do título' : 'Cor do texto') + renderContentTab(el) + renderStyleTab(el, true, true) + renderAdvancedTab(el)
      : renderContentTab(el) + renderAdvancedTab(el);
    wireContentTab(el, body);
    if (isTextLike) wireTypographyToggles(body, el);
  }
}

function wireTypographyToggles(body, el) {
  body.querySelectorAll('[data-typography-toggle]').forEach(btn => {
    btn.addEventListener('click', () => {
      const kind = btn.dataset.typographyToggle;
      const isActive = btn.classList.contains('active');
      if (kind === 'bold') applyBind(el, 'style:fontWeight', isActive ? '' : '700');
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
  if (toggleBtn) {
    toggleBtn.addEventListener('click', () => {
      marginSyncEnabled = !marginSyncEnabled;
      renderLeftPanel();
    });
  }
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
  if (openColorPopover) {
    openColorPopover.popoverEl.hidden = true;
    openColorPopover = null;
  }
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
    if (!isOpen) {
      popoverEl.hidden = false;
      openColorPopover = { fieldEl, popoverEl };
    }
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
  const align = currentDeviceStyleOrProp(el, 'textAlign');
  const isBold = currentDeviceStyleOrProp(el, 'fontWeight') === '700';
  const isItalic = currentDeviceStyleOrProp(el, 'fontStyle') === 'italic';
  const isUnderline = currentDeviceStyleOrProp(el, 'textDecoration') === 'underline';
  const currentFont = currentDeviceStyleOrProp(el, 'fontFamily') || '';
  const tipografiaHeading = flat ? `<span class="inspector-field-label">Tipografia</span>` : `<div class="inspector-section-title">Tipografia</div>`;
  return `
    ${tipografiaHeading}
    <div class="inspector-field">
      <span class="inspector-field-label">Fonte</span>
      <select class="inspector-select" data-bind="style:fontFamily">
        ${FONT_OPTIONS.map(f => `<option value="${escapeHtml(f.value)}" ${currentFont === f.value ? 'selected' : ''}>${escapeHtml(f.label)}</option>`).join('')}
      </select>
    </div>
    ${fieldRow('Tamanho', `<div class="inspector-range-row"><input type="range" min="10" max="96" value="${parseInt(currentDeviceStyleOrProp(el, 'fontSize')) || 16}" data-bind="style:fontSize" data-unit="px"><span class="inspector-range-value" data-range-out="style:fontSize">${currentDeviceStyleOrProp(el, 'fontSize') || '16px'}</span></div>`)}
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
  const marginSyncBtn = `<button type="button" class="margin-sync-toggle ${marginSyncEnabled ? 'active' : ''}" data-margin-sync-toggle title="${marginSyncEnabled ? 'Sincronizado, mesmo valor nos 4 lados' : 'Livre, cada lado com seu valor'}">${BI.chain}</button>`;
  const alignmentRow = (el.type === 'botao' || el.type === 'redes')
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
  const paddingBlock = '';
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
    ${paddingBlock}
    ${aparenciaHeading}
    ${el.type === 'redes' ? `
    ${segRow('Cores', 'prop:colorMode', [
      { value: 'original', title: 'Cores originais de cada rede', html: 'Original' },
      { value: 'custom', title: 'Uma cor personalizada para todos os ícones', html: 'Personalizada' }
    ], el.colorMode || 'custom')}
    ${el.colorMode === 'custom' ? `
    <div class="inspector-field inspector-field-row">
      <span class="${labelClass}">Cor dos ícones</span>
      ${colorSwatchPopoverHtml(el.customColor, 'data-bind="prop:customColor"')}
    </div>
    ` : ''}
    <div class="inspector-field">
      <span class="${labelClass}">Arredondamento do ícone <span data-range-out="prop:iconRadius">${el.iconRadius != null ? el.iconRadius : 50}%</span></span>
      <input type="range" min="0" max="50" value="${el.iconRadius != null ? el.iconRadius : 50}" data-bind="prop:iconRadius" data-unit="%" data-cast="number">
    </div>
    ` : ''}
    ${el.type === 'video' ? `
    <div class="inspector-field">
      <span class="${labelClass}">Formato</span>
      <select class="inspector-select" data-bind="prop:aspectRatio">
        ${VIDEO_ASPECT_RATIO_OPTIONS.map(o => `<option value="${o.value}" ${(el.aspectRatio || '16:9') === o.value ? 'selected' : ''}>${o.label}</option>`).join('')}
      </select>
    </div>
    <div class="inspector-field">
      <span class="${labelClass}">Arredondamento das bordas <span data-range-out="style:borderRadius">${parseFloat(currentDeviceStyleOrProp(el, 'borderRadius')) || 0}px</span></span>
      <input type="range" min="0" max="60" value="${parseFloat(currentDeviceStyleOrProp(el, 'borderRadius')) || 0}" data-bind="style:borderRadius" data-unit="px">
    </div>
    ` : ''}
    ${el.type === 'depoimentos' ? `
    <div class="inspector-field">
      <span class="${labelClass}">Formato de layout</span>
      <select class="inspector-select" data-bind="prop:layoutFormat">
        ${TESTIMONIALS_LAYOUT_OPTIONS.map(o => `<option value="${o.value}" ${(el.layoutFormat || 'grid') === o.value ? 'selected' : ''}>${o.label}</option>`).join('')}
      </select>
    </div>
    ${(el.layoutFormat || 'grid') === 'grid' ? `
    <div class="inspector-field">
      <span class="${labelClass}">Colunas (desktop)</span>
      <select class="inspector-select" data-bind="prop:gridColumns" data-cast="number">
        ${[2, 3, 4].map(n => `<option value="${n}" ${(el.gridColumns || 3) === n ? 'selected' : ''}>${n} colunas</option>`).join('')}
      </select>
    </div>
    ` : ''}
    ${el.layoutFormat === 'carrossel' ? `
    <div class="inspector-field">
      <span class="${labelClass}">Cards visíveis por vez</span>
      <select class="inspector-select" data-bind="prop:carouselVisible" data-cast="number">
        ${[1, 2, 3].map(n => `<option value="${n}" ${(el.carouselVisible || 1) === n ? 'selected' : ''}>${n}</option>`).join('')}
      </select>
    </div>
    ` : ''}
    ` : ''}
    ${el.type === 'redes' || el.type === 'video' || el.type === 'galeria' || el.type === 'depoimentos' || el.type === 'carrossel' ? '' : el.type === 'icone' ? `
    <div class="inspector-field">
      <span class="${labelClass}">Tamanho do ícone</span>
      <input type="range" min="16" max="120" value="${parseInt(cascadedStyleValue(el, 'fontSize')) || 32}" data-bind="style:fontSize" data-unit="px">
    </div>
    ` : el.type === 'botao' ? `
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
    ${flat ? `
    <div class="inspector-field">
      <span class="${labelClass}">Altura <span data-range-out="style:lineHeight">${cascadedStyleValue(el, 'lineHeight') || '1.4'}</span></span>
      <input type="range" min="1" max="2.5" step="0.1" value="${parseFloat(cascadedStyleValue(el, 'lineHeight')) || 1.4}" data-bind="style:lineHeight">
    </div>
    ` : ''}
    ${el.type === 'redes' || el.type === 'icone' || el.type === 'video' ? '' : el.type === 'botao' ? `
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
    ${el.type === 'redes' || el.type === 'video' || el.type === 'depoimentos' || el.type === 'imagem' || el.type === 'mapa' ? '' : segRow('Sombra', 'style:boxShadow', [
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
      return `
        ${fieldRow('Texto', `<textarea class="inspector-textarea inspector-textarea-plain" data-text-paragraphs>${escapeHtml(textContentToPlain(el.content))}</textarea>`)}
      `;

    case 'subtitulo':
      return `
        ${fieldRow('Texto', `<textarea class="inspector-textarea inspector-textarea-plain" data-bind="prop:content">${escapeHtml(el.content || '')}</textarea>`)}
      `;

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
          ${colorSwatchPopoverHtml(currentDeviceStyleOrProp(el, 'backgroundColor') || builderState.globalStyle.primaryColor || '#183b54', 'data-bind="style:backgroundColor"')}
        </div>
        ${fieldRow('Texto do botão', `<input type="text" class="inspector-input" data-bind="prop:content" value="${escapeHtml(el.content || '')}">`)}
        ${fieldRow('Link (URL)', `<input type="text" class="inspector-input" data-bind="prop:href" value="${escapeHtml(el.href || '')}" placeholder="https://">`)}
      `;

    case 'link':
      return `
        <p class="inspector-hint">Clique no texto do link dentro do canvas para editá-lo.</p>
        ${fieldRow('Link (URL)', `<input type="text" class="inspector-input" data-bind="prop:href" value="${escapeHtml(el.href || '')}" placeholder="https://">`)}
        <div class="inspector-toggle-row">
          <span class="inspector-field-label">Abrir em nova aba</span>
          <label class="settings-switch"><input type="checkbox" data-bind="prop:newTab" ${el.newTab ? 'checked' : ''}><span class="settings-switch-track"></span></label>
        </div>
      `;

    case 'icone':
      return `
        <div class="inspector-field inspector-field-row">
          <span class="inspector-field-label">Cor do ícone</span>
          ${colorSwatchPopoverHtml(currentDeviceStyleOrProp(el, 'color') || builderState.globalStyle.primaryColor || '#183b54', 'data-bind="style:color"')}
        </div>
        ${fieldRow('Ícone', `<select class="inspector-select" data-bind="prop:iconKey">
          ${Object.keys(ICON_PICKER).map(k => `<option value="${k}" ${el.iconKey === k ? 'selected' : ''}>${ICON_PICKER[k]}</option>`).join('')}
        </select>`)}
        ${fieldRow('Link (opcional)', `<input type="text" class="inspector-input" data-bind="prop:href" value="${escapeHtml(el.href || '')}" placeholder="https://">`)}
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

    case 'lista':
      return `
        <div class="inspector-toggle-row"><span class="inspector-field-label">Lista numerada</span><label class="settings-switch"><input type="checkbox" data-bind="prop:ordered" ${el.ordered ? 'checked' : ''}><span class="settings-switch-track"></span></label></div>
        <div class="inspector-field">
          <span class="inspector-field-label">Ícones</span>
          <select class="inspector-select" data-bind="prop:iconStyle">
            ${Object.keys(LIST_ICON_OPTIONS).map(k => `<option value="${k}" ${(el.iconStyle || '') === k ? 'selected' : ''}>${LIST_ICON_OPTIONS[k]}</option>`).join('')}
          </select>
          <p class="inspector-hint">Se usar ícone junto com lista numerada, o ícone sempre aparece antes do número.</p>
        </div>
        <div id="list-items-editor">
          ${el.items.map((item, i) => `
            <div class="inspector-list-item-row">
              <input type="text" class="inspector-input" data-list-item-text="${i}" value="${escapeHtml(item)}">
              ${el.items.length > 1 ? `<button type="button" class="inspector-list-item-remove-inline" data-remove-item="${i}" title="Remover">${BI.trash}</button>` : ''}
            </div>
          `).join('')}
        </div>
        <button type="button" class="inspector-add-btn" data-add-item>${BI.plus} Adicionar item</button>
      `;

    case 'redes':
      return `
        <div id="social-editor">
          ${el.profiles.map((p, i) => `
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
      `;

    case 'galeria':
    case 'carrossel':
      return `
        ${el.type === 'galeria' ? fieldRow('Colunas', `<select class="inspector-select" data-bind="prop:columns">
          <option value="2" ${el.columns === 2 ? 'selected' : ''}>2</option>
          <option value="3" ${el.columns === 3 ? 'selected' : ''}>3</option>
          <option value="4" ${el.columns === 4 ? 'selected' : ''}>4</option>
        </select>`) : ''}
        ${el.type === 'carrossel' ? fieldRow('Formato de rolagem', `<select class="inspector-select" data-bind="prop:scrollFormat">
          <option value="barra" ${(el.scrollFormat || 'barra') === 'barra' ? 'selected' : ''}>Barra deslizante</option>
          <option value="setas" ${el.scrollFormat === 'setas' ? 'selected' : ''}>Setas</option>
          <option value="automatico" ${el.scrollFormat === 'automatico' ? 'selected' : ''}>Automático</option>
        </select>`) : ''}
        <div id="images-editor">
          ${el.images.map((img, i) => `
            <div class="inspector-list-item">
              <button type="button" class="inspector-list-item-remove" data-remove-image="${i}">${BI.trash}</button>
              <span class="inspector-field-label">Imagem ${i + 1}</span>
              ${imageUploadZoneHtml(img.src, `data-image-file="${i}"`)}
              <input type="text" class="inspector-input" data-image-url="${i}" value="${escapeHtml(img.src || '')}" placeholder="ou cole a URL" style="margin-top:0.5rem;">
            </div>
          `).join('')}
        </div>
        <button type="button" class="inspector-add-btn" data-add-image>${BI.plus} Adicionar imagem</button>
      `;

    case 'depoimentos':
      return `
        <div class="inspector-field inspector-field-row">
          <span class="inspector-field-label">Cor do texto</span>
          ${colorSwatchPopoverHtml(el.textColor, 'data-bind="prop:textColor"')}
        </div>
        <div class="inspector-field inspector-field-row">
          <span class="inspector-field-label">Cor da caixa</span>
          ${colorSwatchPopoverHtml(el.boxColor, 'data-bind="prop:boxColor"')}
        </div>
        <div id="testimonials-editor">
          ${el.items.map((t, i) => `
            <div class="inspector-list-item">
              <button type="button" class="inspector-list-item-remove" data-remove-testimonial="${i}">${BI.trash}</button>
              <span class="inspector-field-label">Depoimento ${i + 1}</span>
              <textarea class="inspector-textarea inspector-textarea-plain" data-testimonial-text="${i}" placeholder="Texto do depoimento">${escapeHtml(t.text || '')}</textarea>
              <input type="text" class="inspector-input" data-testimonial-name="${i}" value="${escapeHtml(t.name || '')}" placeholder="Nome">
              <input type="text" class="inspector-input" data-testimonial-role="${i}" value="${escapeHtml(t.role || '')}" placeholder="Evento / cargo">
              ${imageUploadZoneHtml(t.avatar, `data-testimonial-avatar="${i}"`)}
            </div>
          `).join('')}
        </div>
        <button type="button" class="inspector-add-btn" data-add-testimonial>${BI.plus} Adicionar depoimento</button>
      `;

    case 'formulario':
      return `
        ${fieldRow('Título exibido', `<input type="text" class="inspector-input" data-bind="prop:title" value="${escapeHtml(el.title || '')}">`)}
        ${fieldRow('Formulário', `<select class="inspector-select" data-bind="prop:formId">
          <option value="">Formulário de contato padrão</option>
          ${(typeof siteForms !== 'undefined' ? siteForms : []).map(f => `<option value="${f.id}" ${el.formId === f.id ? 'selected' : ''}>${escapeHtml(f.title)}</option>`).join('')}
        </select>`)}
        <p class="inspector-hint">Crie ou edite formulários na aba "Formulários" desta página.</p>
      `;

    case 'mapa':
      return `
        ${fieldRow('Link de incorporação do Google Maps', `<input type="text" class="inspector-input" data-bind="prop:embedUrl" value="${escapeHtml(el.embedUrl || '')}" placeholder="https://www.google.com/maps/embed?...">`)}
        <p class="inspector-hint">No Google Maps: Compartilhar → Incorporar um mapa → copie a URL do atributo "src" do código.</p>
        ${fieldRow('Endereço (texto exibido)', `<input type="text" class="inspector-input" data-bind="prop:address" value="${escapeHtml(el.address || '')}">`)}
      `;

    case 'html':
    case 'codigo':
      return `
        ${fieldRow(el.type === 'codigo' ? 'Código personalizado (HTML/CSS/JS)' : 'HTML personalizado', `<textarea class="inspector-textarea" data-bind="prop:content" style="min-height:180px;">${el.content}</textarea>`)}
        <p class="inspector-hint">O conteúdo é renderizado diretamente na página. Use com cuidado.</p>
      `;

    default:
      return '<p class="inspector-hint">Sem opções de conteúdo para este elemento.</p>';
  }
}

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

const BUILDER_PAGE_LABELS = { home: 'Site Principal', checkout: 'Meu Checkout' };

function updatePageSwitcherUI() {
  const label = document.getElementById('builder-page-select-label');
  if (label) label.textContent = BUILDER_PAGE_LABELS[currentPageKey] || 'Site Principal';
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

function initSiteBuilder() {
  const root = document.getElementById('site-builder-root');
  if (!root) return;

  builderState = loadPageState(currentPageKey);
  historyStack = [snapshotState()];
  historyIndex = 0;

  initPageSwitcher();

  document.getElementById('builder-device-toggle').querySelectorAll('.builder-device-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      currentDevice = btn.dataset.device;
      document.querySelectorAll('#builder-device-toggle .builder-device-btn').forEach(b => b.classList.toggle('active', b === btn));
      renderCanvas();
      if (selectedId) renderLeftPanel();
    });
  });

  document.getElementById('builder-undo').addEventListener('click', undo);
  document.getElementById('builder-redo').addEventListener('click', redo);
  document.getElementById('builder-save').addEventListener('click', () => persistBuilderState(false));
  document.getElementById('builder-publish').addEventListener('click', () => {
    publishBuilderState();
    showToast('Site publicado com sucesso!');
  });
  wireUnsavedChangesGuard();

  document.getElementById('builder-canvas-viewport').addEventListener('click', (e) => {
    if (e.target.id === 'builder-canvas-viewport' || e.target.id === 'builder-canvas') deselect();
  });

  document.addEventListener('keydown', (e) => {
    if (!document.getElementById('site-builder-root')) return;
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
  renderLeftPanel();
  updateHistoryButtons();
}

document.addEventListener('DOMContentLoaded', initSiteBuilder);

function renderAdvancedTab(el) {
  return `
    <div class="inspector-section-title">Visibilidade por dispositivo</div>
    <p class="inspector-hint">Oculte este elemento em telas específicas sem excluí-lo.</p>
    <div class="inspector-toggle-row">
      <span class="inspector-field-label">Ocultar no desktop</span>
      <label class="settings-switch"><input type="checkbox" data-bind="hidden:desktop" ${el.hidden.desktop ? 'checked' : ''}><span class="settings-switch-track"></span></label>
    </div>
    <div class="inspector-toggle-row">
      <span class="inspector-field-label">Ocultar no tablet</span>
      <label class="settings-switch"><input type="checkbox" data-bind="hidden:tablet" ${el.hidden.tablet ? 'checked' : ''}><span class="settings-switch-track"></span></label>
    </div>
    <div class="inspector-toggle-row">
      <span class="inspector-field-label">Ocultar no mobile</span>
      <label class="settings-switch"><input type="checkbox" data-bind="hidden:mobile" ${el.hidden.mobile ? 'checked' : ''}><span class="settings-switch-track"></span></label>
    </div>
  `;
}
