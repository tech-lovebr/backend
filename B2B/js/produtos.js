/* ==========================================================================
   LOVE B2B — Produtos & Serviços (catálogo do fornecedor)
   ========================================================================== */

let activeCategory = 'Todos';

// Arrays (não mais string única) pra categorias antigas e novas continuarem
// abrindo os mesmos blocos condicionais — ver DECISÃO em "categorias" no
// plano: produtos antigos não são reescritos, só passam a conviver com a
// lista nova de 8 categorias.
// Inclui os nomes antigos (pré-wizard e a primeira leva de 8 categorias)
// junto dos novos, pra produto já cadastrado continuar abrindo os mesmos
// blocos condicionais mesmo depois da categoria ter sido renomeada.
const PRODUCT_VENUE_CATEGORIES = ['Locação de espaço', 'Espaços & Locações', 'Espaço de Locação', 'Espaços para Locação'];
const PRODUCT_EQUIPMENT_CATEGORIES = ['Aluguel de equipamentos'];
const PRODUCT_FOOD_CATEGORIES = ['Buffet', 'Gastronomia & Alimentos', 'Buffet e Gastronomia'];
const PRODUCT_STAFF_CATEGORIES = ['Staff & Mão de Obra', 'Staff e Mão de Obra'];
const PRODUCT_AV_CATEGORIES = ['Foto, Vídeo & Audiovisual', 'Mídia e Audiovisual'];

// Nomes antigos de categoria (de antes de uma renomeação) mapeados pro nome
// atual — normaliza só em memória, ao carregar os produtos, pra um produto
// salvo com o nome velho (ex: "Bar e Coquetelaria") não virar uma aba/opção
// extra duplicada da categoria atual. Não reescreve nada no banco; se a
// pessoa abrir esse produto e salvar de novo, aí sim ele grava o nome novo.
const CATEGORY_LEGACY_ALIASES = {
  'Bar e Coquetelaria': 'Bar e Bebidas',
  'Bebidas': 'Bar e Bebidas',
  'Bar': 'Bar e Bebidas',
  'Trajes': 'Trajes, Beleza e Estilo',
  'Gastronomia & Alimentos': 'Buffet e Gastronomia',
  'Buffet': 'Buffet e Gastronomia',
  'Locação de espaço': 'Espaços para Locação',
  'Espaços & Locações': 'Espaços para Locação',
  'Espaço de Locação': 'Espaços para Locação',
  'Staff & Mão de Obra': 'Staff e Mão de Obra',
  'Foto, Vídeo & Audiovisual': 'Mídia e Audiovisual',
  'Mídia': 'Mídia e Audiovisual'
};

function normalizeCategory(category) {
  return CATEGORY_LEGACY_ALIASES[category] || category;
}

const SUBCATEGORY_MAP = {
  'Buffet e Gastronomia': ['Buffet Completo', 'Finger Food', 'Bolo & Doces', 'Churrasco', 'Café da Manhã', 'Carrinhos', 'Cardápio Vegano', 'Tábua de Frios', 'Buffet Infantil'],
  'Bar e Bebidas': ['Open Bar', 'Drinks Autorais', 'Sommelier', 'Café/Chá', 'Aluguel de Cervejeira', 'Bebidas Não Alcoólicas', 'Bar Infantil'],
  'Espaços para Locação': ['Salão de Festas', 'Sítio/Chácara', 'Rooftop', 'Igreja/Capela', 'Praia', 'Hotel', 'Espaços Exclusivos'],
  'Staff e Mão de Obra': ['Garçom', 'Bartender', 'Segurança', 'Recepcionista', 'Limpeza', 'Manobrista', 'Montadores', 'Carregadores'],
  'Mídia e Audiovisual': ['Fotografia', 'Filmagem', 'Drone', 'Cabine de Fotos', 'Edição de Vídeo', 'Barra de Imagem', 'Álbum de Fotos'],
  'Música e Entretenimento': ['DJ', 'Banda ao vivo', 'Mestre de cerimônias', 'Atrações infantis', 'Animação de Festa', 'Recreação Infantil', 'Orquestra', 'Personagens Vivos', 'Mágicos', 'Efeitos Especiais'],
  'Decoração': ['Florais', 'Iluminação', 'Mobiliário', 'Cenografia', 'Esculturas em Balões', 'Lembrancinhas', 'Papelaria'],
  'Assessoria e Cerimonialista': ['Assessoria completa', 'Cerimonial no dia', 'Planejamento', 'Day Coordinator', 'Celebrante'],
  'Trajes, Beleza e Estilo': ['Aluguel de Roupa', 'Acessórios', 'Ateliê', 'Trajes de Madrinhas', 'Roupas para Festa', 'Moda Infantil', 'Dia da Noiva', 'Maquiagem', 'Camarim']
};

const VENUE_COMMON_AREA_OPTIONS = [
  'Piscina', 'Salão de festas', 'Jardim', 'Churrasqueira', 'Estacionamento',
  'Cozinha equipada', 'Vestiário', 'Lareira', 'Varanda/Deck', 'Área kids',
  'Quadra esportiva', 'Espaço gourmet', 'Lounge', 'Banheiros extras', 'Rooftop', 'Elevador'
];

const PRODUCT_TITLE_PLACEHOLDERS = {
  'Buffet e Gastronomia': 'Ex: Buffet Completo para Casamento (até 150 convidados)',
  'Bar e Bebidas': 'Ex: Bar de Coquetéis Clássicos e Gin Bar (até 150 convidados)',
  'Espaços para Locação': 'Ex: Salão de Festas com Área Externa e Piscina',
  'Staff e Mão de Obra': 'Ex: Diária de Barman Especializado com Kit de Coquetelaria',
  'Mídia e Audiovisual': 'Ex: Cobertura Fotográfica e Vídeo Completo do Evento',
  'Música e Entretenimento': 'Ex: DJ Set Completo com Som e Iluminação',
  'Decoração': 'Ex: Decoração Completa com Backdrop Floral e Lounge',
  'Assessoria e Cerimonialista': 'Ex: Assessoria Completa do Dia do Evento',
  'Trajes, Beleza e Estilo': 'Ex: Aluguel de Vestido de Noiva com Provas Inclusas',
  'Aluguel de Carros': 'Ex: Locação de Carro Clássico para Cerimônia'
};
const DEFAULT_TITLE_PLACEHOLDER = 'Selecione uma categoria para ver um exemplo';

const PRODUCT_WEEKDAYS = [
  { key: 'seg', label: 'Seg' },
  { key: 'ter', label: 'Ter' },
  { key: 'qua', label: 'Qua' },
  { key: 'qui', label: 'Qui' },
  { key: 'sex', label: 'Sex' },
  { key: 'sab', label: 'Sáb' },
  { key: 'dom', label: 'Dom' }
];

const PI_PLUS = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15"/></svg>';
const PI_TRASH = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0"/></svg>';
const PI_IMAGE = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="8.5" cy="9.5" r="1.5"/><path stroke-linecap="round" stroke-linejoin="round" d="m5 18 5-5 3 3 4-5 4 5"/></svg>';
const PI_CLOSE = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12"/></svg>';

// O atributo `hidden` sozinho não basta aqui: elementos com classe
// flex/grid do Tailwind (ex: "flex flex-col gap-4") continuam visíveis
// mesmo com hidden=true, porque o display do Tailwind vence o [hidden]
// nativo do navegador. Define os dois (atributo, pra semântica/acessibilidade,
// e o display inline, que sempre vence) pra esconder de verdade.
function setPanelHidden(id, hide) {
  const el = document.getElementById(id);
  if (!el) return;
  el.hidden = hide;
  el.style.display = hide ? 'none' : '';
}

let currentCoverImage = null;
let currentGalleryImages = [];
let currentOpenDays = {};
let currentDishes = [];
let currentVenueCommonAreas = [];
let bProducts = [];

let currentStep = 1;
let currentSubcategory = null;
let currentCategoryExpanded = null;
let currentPricingType = null;
let currentServiceAreaType = 'city_only';
let currentScopeIncluded = [];
let currentScopeExcluded = [];

document.addEventListener('DOMContentLoaded', async () => {
  await window.b2bAuthReady;
  await loadProducts();
  renderCategoryTabs();
  renderProducts();
  populateProductCategoryOptions();
  initProductDrawer();
  initCompleteProfileModal();

  if (new URLSearchParams(location.search).get('add') === '1') {
    document.getElementById('product-add-btn')?.click();
  }
  window.b2bPageReady?.();
});

async function loadProducts() {
  const { data: { session } } = await supabaseClient.auth.getSession();
  if (!session) { bProducts = []; return; }

  const { data, error } = await supabaseClient
    .from('products')
    .select('*')
    .eq('fornecedor_id', session.user.id)
    .order('created_at', { ascending: false });

  bProducts = error || !data ? [] : data.map(p => ({
    id: p.id,
    name: p.name,
    category: normalizeCategory(p.category),
    price: p.price,
    description: p.description,
    active: p.active,
    coverImage: p.cover_image_url,
    gallery: p.gallery || [],
    venue: (p.extra && p.extra.venue) || null,
    equipmentType: (p.extra && p.extra.equipmentType) || null,
    dishes: (p.extra && p.extra.dishes) || [],
    offerType: (p.extra && p.extra.offerType) || 'servico',
    subcategory: (p.extra && p.extra.subcategory) || null,
    pricing: (p.extra && p.extra.pricing) || null,
    scope: (p.extra && p.extra.scope) || { included: [], excluded: [] },
    attributes: (p.extra && p.extra.attributes) || {},
    videoUrl: (p.extra && p.extra.videoUrl) || null,
    logistics: (p.extra && p.extra.logistics) || null,
    cancellationPolicy: (p.extra && p.extra.cancellationPolicy) || 'flexivel'
  }));
}

/* -------------------- Modal: finalize seu cadastro -------------------- */

function initCompleteProfileModal() {
  const modal = document.getElementById('complete-profile-modal');
  if (!modal) return;
  const close = () => modal.classList.remove('show');
  document.getElementById('complete-profile-modal-close').addEventListener('click', close);
  modal.addEventListener('click', (e) => { if (e.target === modal) close(); });
}

function openCompleteProfileModal() {
  const modal = document.getElementById('complete-profile-modal');
  if (modal) modal.classList.add('show');
}

// Garante que produtos com uma categoria antiga/customizada (de antes desta
// lista fixa) continuem aparecendo selecionados corretamente ao editar.
function populateProductCategoryOptions() {
  const select = document.getElementById('product-category');
  if (!select) return;
  select.querySelectorAll('[data-extra-category]').forEach(o => o.remove());
  const known = new Set(Array.from(select.options).map(o => o.value).filter(Boolean));
  const extra = [...new Set(bProducts.map(p => p.category).filter(Boolean))].filter(c => !known.has(c));
  extra.forEach(c => {
    const opt = document.createElement('option');
    opt.value = c;
    opt.textContent = c;
    opt.dataset.extraCategory = '1';
    select.appendChild(opt);
  });
}

function renderCategoryTabs() {
  const wrap = document.getElementById('category-tabs');
  if (!wrap) return;
  const categories = ['Todos', ...new Set(bProducts.map(p => p.category))];
  wrap.innerHTML = categories.map(cat => `
    <button type="button" class="category-tab ${cat === activeCategory ? 'active' : ''}" data-category="${cat}">${cat}</button>
  `).join('');

  wrap.querySelectorAll('[data-category]').forEach(btn => {
    btn.addEventListener('click', () => {
      activeCategory = btn.dataset.category;
      wrap.querySelectorAll('[data-category]').forEach(b => b.classList.toggle('active', b === btn));
      renderProducts();
    });
  });
}

function productPriceLabel(p) {
  const { isVenue, isFood } = categoryGroups(p.category);

  if (isVenue && p.venue) {
    const prices = [p.venue.priceWeekday, p.venue.priceSaturday, p.venue.priceSunday, p.venue.priceHoliday].filter(v => v > 0);
    return prices.length ? `A partir de ${formatCurrency(Math.min(...prices))}` : 'Consulte os valores';
  }
  if (isFood && p.dishes && p.dishes.length) {
    const prices = p.dishes.map(d => d.price).filter(v => v > 0);
    if (prices.length) return `A partir de ${formatCurrency(Math.min(...prices))}`;
  }

  const pricing = p.pricing;
  if (pricing) {
    if (pricing.type === 'SOB_CONSULTA') {
      const starting = pricing.onRequest && pricing.onRequest.startingPrice;
      return starting > 0 ? `A partir de ${formatCurrency(starting)}` : 'Sob consulta';
    }
    if (pricing.type === 'POR_PESSOA' && pricing.perPerson) return `${formatCurrency(pricing.perPerson.pricePerPerson)} / pessoa`;
    if (pricing.type === 'POR_HORA' && pricing.perHour) return `${formatCurrency(pricing.perHour.pricePerHour)} / hora`;
  }

  return formatCurrency(p.price);
}

function renderProducts() {
  const grid = document.getElementById('products-grid');
  if (!grid) return;

  const items = activeCategory === 'Todos'
    ? bProducts
    : bProducts.filter(p => p.category === activeCategory);

  if (!items.length) {
    grid.innerHTML = `
      <div class="empty-state" style="grid-column:1/-1;">
        <div class="empty-state-icon">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M21 7.5 12 2.25 3 7.5m18 0-9 5.25M21 7.5v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9" /></svg>
        </div>
        <p class="text-sm font-medium text-zinc-700">Nenhum item nessa categoria ainda.</p>
      </div>`;
    return;
  }

  grid.innerHTML = items.map(p => `
    <div class="product-card">
      <div class="product-thumb"${p.coverImage ? ' style="padding:0;"' : ''}>
        ${p.coverImage
          ? `<img src="${p.coverImage}" alt="${escapeHtml(p.name)}" style="width:100%;height:100%;object-fit:cover;">`
          : `<button type="button" class="product-thumb-add-image-btn" data-add-image="${p.id}">Adicione uma imagem</button>`}
      </div>
      <div class="p-4 flex flex-col gap-2 flex-1">
        <div class="flex items-start justify-between gap-2">
          <p class="text-sm font-semibold text-zinc-900 leading-snug">${p.name}</p>
          <span class="status-badge ${p.active ? 'status-ativo' : 'status-inativo'}">${p.active ? 'Ativo' : 'Inativo'}</span>
        </div>
        <p class="text-xs text-zinc-500">${p.category}</p>
        <p class="text-base font-bold text-zinc-900 mt-auto">${productPriceLabel(p)}</p>
        <div class="flex items-center gap-2 mt-1">
          <button class="btn-secondary flex-1 justify-center text-xs py-2" data-edit-product="${p.id}">Editar</button>
        </div>
      </div>
    </div>
  `).join('');

  grid.querySelectorAll('[data-edit-product]').forEach(btn => {
    btn.addEventListener('click', () => openProductDrawer(btn.dataset.editProduct));
  });

  grid.querySelectorAll('[data-add-image]').forEach(btn => {
    btn.addEventListener('click', () => {
      openProductDrawer(btn.dataset.addImage);
      goToStep(4);
    });
  });
}

/* -------------------- Upload de imagens -------------------- */

function renderCoverImagePicker() {
  const wrap = document.getElementById('product-cover-wrap');
  if (!wrap) return;
  wrap.innerHTML = `
    <div class="header-logo-picker-wrap">
      <label class="header-logo-picker ${currentCoverImage ? 'has-image' : ''}">
        ${currentCoverImage
          ? `<img src="${currentCoverImage}" class="header-logo-picker-preview" alt="">
             <div class="header-logo-picker-overlay">${PI_IMAGE}<span>Alterar imagem</span></div>`
          : `<span class="image-upload-zone-plus">${PI_PLUS}</span><span class="image-upload-zone-text">Adicione ou arraste a imagem de capa</span>`}
        <input type="file" accept="image/*" class="image-upload-zone-input" id="product-cover-input">
      </label>
      ${currentCoverImage ? `<button type="button" class="header-logo-picker-remove" id="product-cover-remove" title="Remover imagem">${PI_CLOSE}</button>` : ''}
    </div>
  `;

  const input = document.getElementById('product-cover-input');
  const applyFile = (file) => readFileAsDataUrl(file, (dataUrl) => { currentCoverImage = dataUrl; renderCoverImagePicker(); });
  if (input) {
    input.addEventListener('change', () => { if (input.files[0]) applyFile(input.files[0]); });
    wireImageDropZone(input.closest('.header-logo-picker'), applyFile);
  }
  const removeBtn = document.getElementById('product-cover-remove');
  if (removeBtn) removeBtn.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); currentCoverImage = null; renderCoverImagePicker(); });
}

function renderGalleryImages() {
  const wrap = document.getElementById('product-gallery-list');
  if (!wrap) return;
  wrap.innerHTML = currentGalleryImages.map((src, i) => `
    <div class="inspector-list-item">
      <button type="button" class="inspector-list-item-remove" data-remove-gallery-image="${i}">${PI_TRASH}</button>
      <label class="image-upload-zone">
        ${src
          ? `<img src="${src}" class="image-upload-zone-preview" alt="">`
          : `<span class="image-upload-zone-plus">${PI_PLUS}</span><span class="image-upload-zone-text">Adicione ou arraste uma imagem</span>`}
        <input type="file" accept="image/*" class="image-upload-zone-input" data-gallery-image-input="${i}">
      </label>
    </div>
  `).join('');

  wrap.querySelectorAll('[data-remove-gallery-image]').forEach(btn => {
    btn.addEventListener('click', () => {
      currentGalleryImages.splice(Number(btn.dataset.removeGalleryImage), 1);
      renderGalleryImages();
    });
  });
  wrap.querySelectorAll('[data-gallery-image-input]').forEach(input => {
    const idx = Number(input.dataset.galleryImageInput);
    const applyFile = (file) => readFileAsDataUrl(file, (dataUrl) => { currentGalleryImages[idx] = dataUrl; renderGalleryImages(); });
    input.addEventListener('change', () => { if (input.files[0]) applyFile(input.files[0]); });
    wireImageDropZone(input.closest('.image-upload-zone'), applyFile);
  });
}

/* -------------------- Detalhes do local (Espaços para Locação) -------------------- */

function renderVenueCommonAreas() {
  const wrap = document.getElementById('product-venue-common-areas-row');
  if (!wrap) return;

  wrap.innerHTML = VENUE_COMMON_AREA_OPTIONS.map(area => `
    <button type="button" class="weekday-toggle-chip ${currentVenueCommonAreas.includes(area) ? 'active' : ''}" data-common-area="${escapeHtml(area)}">${escapeHtml(area)}</button>
  `).join('');

  wrap.querySelectorAll('[data-common-area]').forEach(btn => {
    btn.addEventListener('click', () => {
      const area = btn.dataset.commonArea;
      const idx = currentVenueCommonAreas.indexOf(area);
      if (idx > -1) currentVenueCommonAreas.splice(idx, 1);
      else currentVenueCommonAreas.push(area);
      renderVenueCommonAreas();
    });
  });
}

// Estado -> Cidade em cascata, usando a base completa do IBGE (js/data-br-localidades.js):
// escolher o estado popula o datalist da cidade (que também aceita digitar pra filtrar).
function populateVenueStateOptions() {
  const select = document.getElementById('product-venue-state');
  if (!select || typeof BR_ESTADOS === 'undefined') return;
  if (select.options.length > 1) return;
  BR_ESTADOS.forEach(({ uf, nome }) => {
    const opt = document.createElement('option');
    opt.value = uf;
    opt.textContent = `${uf} — ${nome}`;
    select.appendChild(opt);
  });
}

function populateVenueCityOptions(uf) {
  const cityInput = document.getElementById('product-venue-city');
  const datalist = document.getElementById('product-venue-city-options');
  if (!cityInput || !datalist) return;

  const cidades = (typeof BR_CIDADES_POR_UF !== 'undefined' && BR_CIDADES_POR_UF[uf]) || [];
  datalist.innerHTML = cidades.map(c => `<option value="${escapeHtml(c)}">`).join('');
  cityInput.disabled = !uf;
  cityInput.placeholder = uf ? 'Selecione ou digite a cidade' : 'Selecione o estado primeiro';
  if (!uf) cityInput.value = '';
}

/* -------------------- Dias de funcionamento (local) -------------------- */

function renderWeekdayChips() {
  const wrap = document.getElementById('product-weekday-row');
  if (!wrap) return;
  wrap.innerHTML = PRODUCT_WEEKDAYS.map(d => `
    <button type="button" class="weekday-toggle-chip ${currentOpenDays[d.key] ? 'active' : ''}" data-weekday="${d.key}">${d.label}</button>
  `).join('');

  wrap.querySelectorAll('[data-weekday]').forEach(btn => {
    btn.addEventListener('click', () => {
      const key = btn.dataset.weekday;
      currentOpenDays[key] = !currentOpenDays[key];
      renderWeekdayChips();
    });
  });
}

function defaultOpenDays() {
  return { seg: true, ter: true, qua: true, qui: true, sex: true, sab: true, dom: true };
}

/* -------------------- Cardápio (buffet) -------------------- */

function renderDishes() {
  const wrap = document.getElementById('product-dishes-list');
  if (!wrap) return;
  wrap.innerHTML = currentDishes.map(d => `
    <div class="inspector-list-item">
      <button type="button" class="inspector-list-item-remove" data-remove-dish="${d.id}">${PI_TRASH}</button>
      <div>
        <label class="field-label">Tipo de prato</label>
        <input type="text" class="field-input" data-dish-name="${d.id}" value="${escapeHtml(d.name || '')}" placeholder="Ex: Filé ao molho madeira">
      </div>
      <div class="product-dish-row">
        <div>
          <label class="field-label">Valor (R$)</label>
          <input type="number" min="0" step="1" class="field-input" data-dish-price="${d.id}" value="${d.price || ''}" placeholder="0,00">
        </div>
        <div>
          <label class="field-label">Quantidade</label>
          <input type="number" min="0" step="1" class="field-input" data-dish-qty="${d.id}" value="${d.quantity || ''}" placeholder="Ex: 50">
        </div>
      </div>
    </div>
  `).join('');

  wrap.querySelectorAll('[data-remove-dish]').forEach(btn => {
    btn.addEventListener('click', () => {
      currentDishes = currentDishes.filter(d => d.id !== btn.dataset.removeDish);
      renderDishes();
    });
  });
  wrap.querySelectorAll('[data-dish-name]').forEach(input => {
    input.addEventListener('input', () => {
      const d = currentDishes.find(x => x.id === input.dataset.dishName);
      if (d) d.name = input.value;
    });
  });
  wrap.querySelectorAll('[data-dish-price]').forEach(input => {
    input.addEventListener('input', () => {
      const d = currentDishes.find(x => x.id === input.dataset.dishPrice);
      if (d) d.price = Number(input.value) || 0;
    });
  });
  wrap.querySelectorAll('[data-dish-qty]').forEach(input => {
    input.addEventListener('input', () => {
      const d = currentDishes.find(x => x.id === input.dataset.dishQty);
      if (d) d.quantity = Number(input.value) || 0;
    });
  });
}

/* -------------------- Campos por categoria -------------------- */

function categoryGroups(category) {
  return {
    isVenue: PRODUCT_VENUE_CATEGORIES.includes(category),
    isEquipment: PRODUCT_EQUIPMENT_CATEGORIES.includes(category),
    isFood: PRODUCT_FOOD_CATEGORIES.includes(category),
    isStaff: PRODUCT_STAFF_CATEGORIES.includes(category),
    isAV: PRODUCT_AV_CATEGORIES.includes(category)
  };
}

function updateCategoryFieldsVisibility() {
  const category = document.getElementById('product-category').value;
  const { isVenue, isEquipment, isFood, isStaff, isAV } = categoryGroups(category);

  // Etapa 3: bloco de atributos específico por categoria.
  setPanelHidden('product-venue-fields', !isVenue);
  setPanelHidden('product-food-fields', !isFood);
  setPanelHidden('product-staff-fields', !isStaff);
  setPanelHidden('product-audiovisual-fields', !isAV);
  setPanelHidden('product-equipment-fields', !isEquipment);

  // Etapa 2: Locação de espaço mantém a grade de preço por dia já existente
  // em vez do motor de precificação novo (decisão confirmada com o usuário).
  setPanelHidden('pricing-venue-section', !isVenue);
  setPanelHidden('pricing-standard-section', isVenue);
}

/* -------------------- Etapa 1: seletor de categoria + chips de subcategoria -------------------- */

// Seletor fechado por padrão ("Selecione a categoria principal..."); clicar
// abre um painel com busca + lista simples (sem acordeão — subcategoria
// agora é uma linha de chips separada, logo abaixo do seletor). O
// <select id="product-category"> continua existindo (só escondido) pra
// toda a lógica de categoria que já existe (travas de campo por categoria,
// opção "extra" pra produto antigo, etc.) não precisar mudar — este
// componente só escreve nele.
function isCategoryPanelOpen() {
  const panel = document.getElementById('product-category-panel');
  return panel && !panel.hidden;
}

function openCategoryPanel() {
  const wrap = document.getElementById('product-category-select');
  const panel = document.getElementById('product-category-panel');
  const select = document.getElementById('product-category');
  if (!wrap || !panel || !select) return;
  panel.hidden = false;
  wrap.classList.add('is-open');
  document.getElementById('product-category-search').value = '';
  if (select.value && SUBCATEGORY_MAP[select.value]) currentCategoryExpanded = select.value;
  renderCategoryTree('');
  document.getElementById('product-category-search').focus();
}

function closeCategoryPanel() {
  const wrap = document.getElementById('product-category-select');
  const panel = document.getElementById('product-category-panel');
  if (!wrap || !panel) return;
  panel.hidden = true;
  wrap.classList.remove('is-open');
}

function updateCategoryTriggerLabel() {
  const select = document.getElementById('product-category');
  const label = document.getElementById('product-category-trigger-label');
  if (!select || !label) return;
  if (!select.value) { label.textContent = 'Selecione a categoria principal...'; return; }
  label.textContent = currentSubcategory ? `${select.value} · ${currentSubcategory}` : select.value;
}

// Acordeão dentro do painel: clicar numa categoria com subcategorias expande
// as subcategorias logo abaixo dela (sem fechar o painel); categoria sem
// subcategoria seleciona e já fecha. Clicar numa subcategoria finaliza a
// escolha e fecha o painel.
function renderCategoryTree(filterText) {
  const wrap = document.getElementById('product-category-tree');
  const select = document.getElementById('product-category');
  if (!wrap || !select) return;

  const term = (filterText || '').trim().toLowerCase();
  const selectedCategory = select.value;
  const categories = Array.from(select.options).map(o => o.value).filter(Boolean);
  const filtered = term ? categories.filter(c => c.toLowerCase().includes(term)) : categories;

  wrap.innerHTML = filtered.length
    ? filtered.map(cat => {
        const subs = SUBCATEGORY_MAP[cat] || [];
        const isExpanded = currentCategoryExpanded === cat;
        const rowHtml = `
          <div class="category-tree-row ${selectedCategory === cat ? 'active' : ''} ${isExpanded ? 'is-open' : ''}" data-category-row="${escapeHtml(cat)}">
            <span>${escapeHtml(cat)}</span>
            ${subs.length ? `<svg class="category-tree-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="m9 6 6 6-6 6"/></svg>` : ''}
          </div>`;
        const subHtml = (subs.length && isExpanded)
          ? subs.map(sub => `
              <div class="category-tree-subrow ${currentSubcategory === sub ? 'active' : ''}" data-subcategory-row="${escapeHtml(sub)}">${escapeHtml(sub)}</div>
            `).join('')
          : '';
        return rowHtml + subHtml;
      }).join('')
    : '<div class="category-tree-empty">Nenhuma categoria encontrada.</div>';

  wrap.querySelectorAll('[data-category-row]').forEach(row => {
    row.addEventListener('click', (e) => {
      // Precisa parar a propagação: o re-render abaixo troca o innerHTML do
      // painel e desanexa esta linha do DOM antes do clique "borbulhar" até o
      // listener de documento que fecha o painel ao clicar fora — sem isso,
      // `wrap.contains(e.target)` vê um nó já desanexado e acha que foi clique
      // fora, fechando o acordeão assim que ele deveria abrir.
      e.stopPropagation();
      const cat = row.dataset.categoryRow;
      const subs = SUBCATEGORY_MAP[cat] || [];
      if (select.value !== cat) {
        select.value = cat;
        currentSubcategory = null;
        currentCategoryExpanded = subs.length ? cat : null;
        select.dispatchEvent(new Event('change'));
        if (!subs.length) { closeCategoryPanel(); return; }
      } else if (subs.length) {
        currentCategoryExpanded = currentCategoryExpanded === cat ? null : cat;
      } else {
        closeCategoryPanel();
        return;
      }
      renderCategoryTree(document.getElementById('product-category-search').value);
    });
  });

  wrap.querySelectorAll('[data-subcategory-row]').forEach(row => {
    row.addEventListener('click', (e) => {
      e.stopPropagation();
      const sub = row.dataset.subcategoryRow;
      currentSubcategory = currentSubcategory === sub ? null : sub;
      updateCategoryTriggerLabel();
      closeCategoryPanel();
    });
  });
}

/* -------------------- Etapa 2: motor de precificação -------------------- */

function renderPricingTypeFields() {
  document.querySelectorAll('#pricing-type-grid [data-pricing-type]').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.pricingType === currentPricingType);
  });
  setPanelHidden('pricing-per-person-fields', currentPricingType !== 'POR_PESSOA');
  setPanelHidden('pricing-per-hour-fields', currentPricingType !== 'POR_HORA');
  setPanelHidden('pricing-fixed-fields', currentPricingType !== 'VALOR_FIXO');
  setPanelHidden('pricing-on-request-fields', currentPricingType !== 'SOB_CONSULTA');
}

/* -------------------- Etapa 3: escopo (incluso / não incluso) -------------------- */

function scopeState(kind) {
  return kind === 'included' ? currentScopeIncluded : currentScopeExcluded;
}

function renderScopeList(kind) {
  const wrap = document.getElementById(`product-scope-${kind}-list`);
  if (!wrap) return;
  wrap.innerHTML = scopeState(kind).map(item => `
    <div class="field-with-inline-icon">
      <input type="text" class="field-input" data-scope-text="${item.id}" data-scope-kind="${kind}" value="${escapeHtml(item.text || '')}" placeholder="Ex: Gelo e insumos">
      <button type="button" class="field-inline-remove-btn" data-remove-scope="${item.id}" data-scope-kind="${kind}">${PI_TRASH}</button>
    </div>
  `).join('');

  wrap.querySelectorAll('[data-remove-scope]').forEach(btn => {
    btn.addEventListener('click', () => {
      const arr = scopeState(btn.dataset.scopeKind);
      const idx = arr.findIndex(x => x.id === btn.dataset.removeScope);
      if (idx > -1) arr.splice(idx, 1);
      renderScopeList(btn.dataset.scopeKind);
    });
  });
  wrap.querySelectorAll('[data-scope-text]').forEach(input => {
    input.addEventListener('input', () => {
      const item = scopeState(input.dataset.scopeKind).find(x => x.id === input.dataset.scopeText);
      if (item) item.text = input.value;
    });
  });
}

/* -------------------- Navegação do wizard -------------------- */

function goToStep(n) {
  currentStep = n;

  document.querySelectorAll('.product-wizard-panel').forEach(panel => {
    panel.classList.toggle('is-active', Number(panel.dataset.step) === n);
  });

  document.querySelectorAll('#product-wizard-steps [data-step-indicator]').forEach(el => {
    const stepNum = Number(el.dataset.stepIndicator);
    const circle = el.querySelector('.product-wizard-step-circle');
    const label = el.querySelector('.product-wizard-step-label');
    circle.classList.toggle('is-active', stepNum === n);
    circle.classList.toggle('is-done', stepNum < n);
    circle.textContent = stepNum < n ? '✓' : stepNum;
    label.classList.toggle('is-active', stepNum === n);
    label.classList.toggle('is-done', stepNum < n);
  });
  document.querySelectorAll('.product-wizard-step-line').forEach((line, i) => {
    line.classList.toggle('is-done', n > i + 1);
  });

  setPanelHidden('product-wizard-back-btn', n === 1);
  setPanelHidden('product-wizard-next-btn', n === 4);
  setPanelHidden('product-wizard-submit-btn', n !== 4);
  updateWizardNextButtonState();
}

// Etapa 1: o botão Avançar só libera quando categoria e título estão
// preenchidos (em vez de deixar clicar e mostrar um toast de erro).
function updateWizardNextButtonState() {
  const nextBtn = document.getElementById('product-wizard-next-btn');
  if (!nextBtn) return;
  if (currentStep === 1) {
    const name = document.getElementById('product-name').value.trim();
    const category = document.getElementById('product-category').value;
    nextBtn.disabled = !(name && category);
  } else {
    nextBtn.disabled = false;
  }
}

function validateStep1() {
  const name = document.getElementById('product-name').value.trim();
  const category = document.getElementById('product-category').value;
  if (!name || !category) {
    showToast('Preencha nome e categoria para continuar.', true);
    return false;
  }
  return true;
}

function validateStep2() {
  const category = document.getElementById('product-category').value;
  if (categoryGroups(category).isVenue) return true;
  if (!currentPricingType) {
    showToast('Selecione a unidade de cobrança.', true);
    return false;
  }
  return true;
}

function validateStep3() {
  return true;
}

/* -------------------- Drawer: novo / editar produto -------------------- */

function initProductDrawer() {
  const addBtn = document.getElementById('product-add-btn');
  const drawer = document.getElementById('product-drawer');
  const backdrop = document.getElementById('product-drawer-backdrop');
  const closeBtn = document.getElementById('product-drawer-close');
  const cancelBtn = document.getElementById('product-drawer-cancel');
  const form = document.getElementById('product-form');

  const open = () => { drawer.classList.add('show'); backdrop.classList.add('show'); };
  const close = () => {
    drawer.classList.remove('show');
    backdrop.classList.remove('show');
    form.reset();
    delete form.dataset.editId;
  };

  // Campos de moeda do motor de precificação (texto mascarado, como já é
  // usado em pagamentos.html/configuracoes.html — não o type="number" cru
  // que o campo único de preço antigo usava).
  ['pricing-per-person-price', 'pricing-per-hour-price', 'pricing-per-hour-extra',
   'pricing-fixed-price', 'pricing-on-request-price',
   'product-venue-price-weekday', 'product-venue-price-saturday', 'product-venue-price-sunday', 'product-venue-price-holiday',
   'product-venue-cleaning-fee', 'product-service-extra-km-fee'
  ].forEach(id => {
    const el = document.getElementById(id);
    if (el) wireCurrencyMaskInput(el);
  });

  populateVenueStateOptions();
  document.getElementById('product-venue-state').addEventListener('change', (e) => {
    populateVenueCityOptions(e.target.value);
  });

  const resetDrawerState = () => {
    currentCoverImage = null;
    currentGalleryImages = [];
    currentOpenDays = defaultOpenDays();
    currentDishes = [];
    currentVenueCommonAreas = [];
    currentSubcategory = null;
    currentCategoryExpanded = null;
    currentPricingType = null;
    currentServiceAreaType = 'city_only';
    currentScopeIncluded = [];
    currentScopeExcluded = [];

    renderCoverImagePicker();
    renderGalleryImages();
    renderWeekdayChips();
    renderDishes();
    renderVenueCommonAreas();
    document.getElementById('product-venue-state').value = '';
    populateVenueCityOptions('');
    closeCategoryPanel();
    updateCategoryTriggerLabel();
    renderScopeList('included');
    renderScopeList('excluded');
    renderPricingTypeFields();
    updateCategoryFieldsVisibility();
    document.getElementById('product-name').placeholder = DEFAULT_TITLE_PLACEHOLDER;

    document.getElementById('product-service-area-toggle').querySelectorAll('[data-service-area]').forEach(b => b.classList.toggle('active', b.dataset.serviceArea === currentServiceAreaType));
    setPanelHidden('product-service-radius-fields', currentServiceAreaType !== 'radius_km');
    document.getElementById('product-cancellation-policy').value = 'flexivel';
    document.getElementById('product-video-url').value = '';
    document.getElementById('product-setup-minutes').value = '';
    document.getElementById('product-teardown-minutes').value = '';
    setPanelHidden('product-drawer-delete-btn', true);

    goToStep(1);
  };

  if (addBtn) addBtn.addEventListener('click', () => {
    if (!isProfileComplete()) {
      openCompleteProfileModal();
      return;
    }
    form.reset();
    delete form.dataset.editId;
    document.getElementById('product-drawer-title').textContent = 'Adicionar produto ou serviço';
    resetDrawerState();
    open();
  });
  if (closeBtn) closeBtn.addEventListener('click', close);
  if (cancelBtn) cancelBtn.addEventListener('click', close);
  if (backdrop) backdrop.addEventListener('click', close);

  const deleteBtn = document.getElementById('product-drawer-delete-btn');
  if (deleteBtn) deleteBtn.addEventListener('click', async () => {
    const id = form.dataset.editId;
    if (!id) return;
    const { error } = await supabaseClient.from('products').delete().eq('id', id);
    if (error) { showToast('Não foi possível remover o item.', true); return; }
    close();
    await loadProducts();
    renderCategoryTabs();
    renderProducts();
    showToast('Item removido da vitrine.');
  });

  document.getElementById('product-category').addEventListener('change', () => {
    const category = document.getElementById('product-category').value;
    updateCategoryTriggerLabel();
    updateCategoryFieldsVisibility();
    document.getElementById('product-name').placeholder = PRODUCT_TITLE_PLACEHOLDERS[category] || DEFAULT_TITLE_PLACEHOLDER;
    updateWizardNextButtonState();
  });

  document.getElementById('product-category-search').addEventListener('input', (e) => {
    renderCategoryTree(e.target.value);
  });

  document.getElementById('product-category-trigger').addEventListener('click', () => {
    if (isCategoryPanelOpen()) closeCategoryPanel();
    else openCategoryPanel();
  });

  // Clica fora do seletor de categoria (em qualquer lugar do drawer) fecha
  // o painel, igual um combobox normal.
  document.addEventListener('click', (e) => {
    const wrap = document.getElementById('product-category-select');
    if (wrap && isCategoryPanelOpen() && !wrap.contains(e.target)) closeCategoryPanel();
  });

  document.getElementById('product-name').addEventListener('input', updateWizardNextButtonState);

  document.getElementById('pricing-type-grid').querySelectorAll('[data-pricing-type]').forEach(btn => {
    btn.addEventListener('click', () => {
      currentPricingType = btn.dataset.pricingType;
      renderPricingTypeFields();
    });
  });

  document.getElementById('product-service-area-toggle').querySelectorAll('[data-service-area]').forEach(btn => {
    btn.addEventListener('click', () => {
      currentServiceAreaType = btn.dataset.serviceArea;
      document.getElementById('product-service-area-toggle').querySelectorAll('[data-service-area]').forEach(b => b.classList.toggle('active', b === btn));
      setPanelHidden('product-service-radius-fields', currentServiceAreaType !== 'radius_km');
    });
  });

  document.getElementById('product-scope-included-add-btn').addEventListener('click', () => {
    currentScopeIncluded.push({ id: 'si' + Date.now() + '-' + Math.round(Math.random() * 999), text: '' });
    renderScopeList('included');
  });
  document.getElementById('product-scope-excluded-add-btn').addEventListener('click', () => {
    currentScopeExcluded.push({ id: 'se' + Date.now() + '-' + Math.round(Math.random() * 999), text: '' });
    renderScopeList('excluded');
  });

  document.getElementById('product-wizard-back-btn').addEventListener('click', () => {
    if (currentStep > 1) goToStep(currentStep - 1);
  });
  document.getElementById('product-wizard-next-btn').addEventListener('click', () => {
    const validators = { 1: validateStep1, 2: validateStep2, 3: validateStep3 };
    const validate = validators[currentStep];
    if (validate && !validate()) return;
    if (currentStep < 4) goToStep(currentStep + 1);
  });

  document.getElementById('product-gallery-add-btn').addEventListener('click', () => {
    currentGalleryImages.push('');
    renderGalleryImages();
  });

  document.getElementById('product-dish-add-btn').addEventListener('click', () => {
    currentDishes.push({ id: 'd' + Date.now() + '-' + Math.round(Math.random() * 999), name: '', price: 0, quantity: 0 });
    renderDishes();
  });

  if (form) {
    form.addEventListener('submit', async e => {
      e.preventDefault();
      const name = document.getElementById('product-name').value.trim();
      const category = document.getElementById('product-category').value;
      const description = document.getElementById('product-description').value.trim();
      const active = true;

      if (!validateStep1()) { goToStep(1); return; }
      if (!validateStep2()) { goToStep(2); return; }

      const { isVenue, isEquipment, isFood, isStaff, isAV } = categoryGroups(category);

      const pricing = {
        type: currentPricingType,
        perPerson: null, perHour: null, fixed: null, onRequest: null
      };
      if (currentPricingType === 'POR_PESSOA') {
        pricing.perPerson = {
          pricePerPerson: currencyMaskValue(document.getElementById('pricing-per-person-price')),
          minPeople: Number(document.getElementById('pricing-per-person-min').value) || 0,
          maxPeople: Number(document.getElementById('pricing-per-person-max').value) || 0
        };
      } else if (currentPricingType === 'POR_HORA') {
        pricing.perHour = {
          pricePerHour: currencyMaskValue(document.getElementById('pricing-per-hour-price')),
          minHours: Number(document.getElementById('pricing-per-hour-min').value) || 0,
          extraHourPrice: currencyMaskValue(document.getElementById('pricing-per-hour-extra'))
        };
      } else if (currentPricingType === 'VALOR_FIXO') {
        pricing.fixed = {
          price: currencyMaskValue(document.getElementById('pricing-fixed-price')),
          durationValue: Number(document.getElementById('pricing-fixed-duration-value').value) || 0,
          durationUnit: document.getElementById('pricing-fixed-duration-unit').value || 'horas'
        };
      } else if (currentPricingType === 'SOB_CONSULTA') {
        pricing.onRequest = {
          startingPrice: currencyMaskValue(document.getElementById('pricing-on-request-price'))
        };
      }

      const venue = isVenue ? {
        street: document.getElementById('product-venue-street').value.trim(),
        number: document.getElementById('product-venue-number').value.trim(),
        complement: document.getElementById('product-venue-complement').value.trim(),
        city: document.getElementById('product-venue-city').value.trim(),
        state: document.getElementById('product-venue-state').value.trim(),
        size: document.getElementById('product-venue-size').value.trim(),
        commonAreas: currentVenueCommonAreas.slice(),
        capacitySeated: Number(document.getElementById('product-venue-capacity-seated').value) || 0,
        capacityStanding: Number(document.getElementById('product-venue-capacity-standing').value) || 0,
        hasGenerator: document.getElementById('product-venue-has-generator').checked,
        isPcdAccessible: document.getElementById('product-venue-is-pcd-accessible').checked,
        noiseRestriction: document.getElementById('product-venue-noise-restriction').value.trim(),
        days: { ...currentOpenDays },
        hoursOpen: document.getElementById('product-venue-hours-open').value,
        hoursClose: document.getElementById('product-venue-hours-close').value,
        priceWeekday: currencyMaskValue(document.getElementById('product-venue-price-weekday')),
        priceSaturday: currencyMaskValue(document.getElementById('product-venue-price-saturday')),
        priceSunday: currencyMaskValue(document.getElementById('product-venue-price-sunday')),
        priceHoliday: currencyMaskValue(document.getElementById('product-venue-price-holiday')),
        cleaningFee: currencyMaskValue(document.getElementById('product-venue-cleaning-fee'))
      } : null;

      const equipmentType = isEquipment ? document.getElementById('product-equipment-type').value.trim() : null;
      const dishes = isFood ? currentDishes.map(d => ({ id: d.id, name: d.name, price: d.price, quantity: d.quantity })) : [];

      const attributes = {
        venue: isVenue ? { capacity: venue.capacitySeated || venue.capacityStanding, areaM2: Number(venue.size) || null, hasGenerator: venue.hasGenerator, isPcdAccessible: venue.isPcdAccessible, hasNoiseRestriction: !!venue.noiseRestriction } : null,
        food: isFood ? {
          menuAttachmentUrl: null,
          dietaryRestrictions: document.getElementById('product-food-dietary').value.trim().split(',').map(s => s.trim()).filter(Boolean),
          tastingPolicy: document.getElementById('product-food-tasting-policy').value.trim()
        } : null,
        staff: isStaff ? {
          uniformDescription: document.getElementById('product-staff-uniform').value.trim(),
          mealRequired: document.getElementById('product-staff-meal-required').checked,
          arrivalTimeBeforeEvent: document.getElementById('product-staff-arrival').value.trim()
        } : null,
        audiovisual: isAV ? {
          crewCount: Number(document.getElementById('product-av-crew-count').value) || 0,
          deliveryDays: Number(document.getElementById('product-av-delivery-days').value) || 0
        } : null
      };

      const logistics = {
        serviceAreaType: currentServiceAreaType,
        serviceRadiusKm: currentServiceAreaType === 'radius_km' ? (Number(document.getElementById('product-service-radius-km').value) || 0) : null,
        extraKmFee: currentServiceAreaType === 'radius_km' ? currencyMaskValue(document.getElementById('product-service-extra-km-fee')) : null,
        setupMinutes: Number(document.getElementById('product-setup-minutes').value) || 0,
        teardownMinutes: Number(document.getElementById('product-teardown-minutes').value) || 0
      };

      // Preço de exibição/ordenação (coluna `price`, legada): derivado da
      // unidade de cobrança escolhida, pra continuar funcionando nos cards
      // e no autocomplete de proposta do financeiro.js sem precisar mudar
      // nada lá.
      let price = 0;
      if (isVenue) {
        const dayPrices = [venue.priceWeekday, venue.priceSaturday, venue.priceSunday, venue.priceHoliday].filter(v => v > 0);
        price = dayPrices.length ? Math.min(...dayPrices) : 0;
      } else if (currentPricingType === 'VALOR_FIXO') price = pricing.fixed.price;
      else if (currentPricingType === 'POR_PESSOA') price = pricing.perPerson.pricePerPerson;
      else if (currentPricingType === 'POR_HORA') price = pricing.perHour.pricePerHour;

      const row = {
        name, category, price, description, active,
        cover_image_url: currentCoverImage || null,
        gallery: currentGalleryImages.filter(Boolean),
        extra: {
          offerType: 'servico',
          subcategory: currentSubcategory,
          pricing,
          scope: {
            included: currentScopeIncluded.map(i => i.text).filter(Boolean),
            excluded: currentScopeExcluded.map(i => i.text).filter(Boolean)
          },
          attributes,
          videoUrl: document.getElementById('product-video-url').value.trim() || null,
          logistics,
          cancellationPolicy: document.getElementById('product-cancellation-policy').value,
          venue,
          equipmentType,
          dishes
        }
      };

      const { data: { session } } = await supabaseClient.auth.getSession();
      if (!session) return;

      if (form.dataset.editId) {
        const { error } = await supabaseClient.from('products').update(row).eq('id', form.dataset.editId);
        if (error) { showToast('Não foi possível atualizar o produto.', true); return; }
        showToast('Produto atualizado.');
      } else {
        const { error } = await supabaseClient.from('products').insert({ fornecedor_id: session.user.id, ...row });
        if (error) { showToast('Não foi possível adicionar o produto.', true); return; }
        showToast('Produto adicionado à vitrine.');
      }
      await loadProducts();
      renderCategoryTabs();
      renderProducts();
      populateProductCategoryOptions();
      close();
    });
  }
}

function openProductDrawer(id) {
  const p = bProducts.find(x => x.id === id);
  if (!p) return;
  document.getElementById('product-drawer-title').textContent = 'Editar produto ou serviço';
  document.getElementById('product-name').value = p.name;
  document.getElementById('product-category').value = p.category;
  document.getElementById('product-description').value = p.description || '';

  currentCoverImage = p.coverImage || null;
  currentGalleryImages = (p.gallery || []).slice();
  currentOpenDays = (p.venue && p.venue.days) ? { ...p.venue.days } : defaultOpenDays();
  currentDishes = (p.dishes || []).map(d => ({ ...d }));
  currentVenueCommonAreas = Array.isArray(p.venue && p.venue.commonAreas) ? p.venue.commonAreas.slice() : [];
  currentSubcategory = p.subcategory || null;
  currentCategoryExpanded = (currentSubcategory && SUBCATEGORY_MAP[p.category]) ? p.category : null;
  currentPricingType = (p.pricing && p.pricing.type) || null;
  currentServiceAreaType = (p.logistics && p.logistics.serviceAreaType) || 'city_only';
  currentScopeIncluded = ((p.scope && p.scope.included) || []).map((text, i) => ({ id: 'si' + i, text }));
  currentScopeExcluded = ((p.scope && p.scope.excluded) || []).map((text, i) => ({ id: 'se' + i, text }));

  document.getElementById('product-venue-street').value = (p.venue && (p.venue.street !== undefined ? p.venue.street : p.venue.address)) || '';
  document.getElementById('product-venue-number').value = (p.venue && p.venue.number) || '';
  document.getElementById('product-venue-complement').value = (p.venue && p.venue.complement) || '';
  const venueState = (p.venue && p.venue.state) || '';
  document.getElementById('product-venue-state').value = venueState;
  populateVenueCityOptions(venueState);
  document.getElementById('product-venue-city').value = (p.venue && p.venue.city) || '';
  document.getElementById('product-venue-size').value = (p.venue && p.venue.size) || '';
  document.getElementById('product-venue-capacity-seated').value = (p.venue && p.venue.capacitySeated) || '';
  document.getElementById('product-venue-capacity-standing').value = (p.venue && p.venue.capacityStanding) || '';
  document.getElementById('product-venue-has-generator').checked = !!(p.venue && p.venue.hasGenerator);
  document.getElementById('product-venue-is-pcd-accessible').checked = !!(p.venue && p.venue.isPcdAccessible);
  document.getElementById('product-venue-noise-restriction').value = (p.venue && p.venue.noiseRestriction) || '';
  document.getElementById('product-venue-hours-open').value = (p.venue && p.venue.hoursOpen) || '';
  document.getElementById('product-venue-hours-close').value = (p.venue && p.venue.hoursClose) || '';
  document.getElementById('product-venue-price-weekday').value = (p.venue && p.venue.priceWeekday) ? String(p.venue.priceWeekday.toFixed(2)).replace('.', ',') : '';
  document.getElementById('product-venue-price-saturday').value = (p.venue && p.venue.priceSaturday) ? String(p.venue.priceSaturday.toFixed(2)).replace('.', ',') : '';
  document.getElementById('product-venue-price-sunday').value = (p.venue && p.venue.priceSunday) ? String(p.venue.priceSunday.toFixed(2)).replace('.', ',') : '';
  document.getElementById('product-venue-price-holiday').value = (p.venue && p.venue.priceHoliday) ? String(p.venue.priceHoliday.toFixed(2)).replace('.', ',') : '';
  document.getElementById('product-venue-cleaning-fee').value = (p.venue && p.venue.cleaningFee) ? String(p.venue.cleaningFee.toFixed(2)).replace('.', ',') : '';
  document.getElementById('product-equipment-type').value = p.equipmentType || '';

  const food = p.attributes && p.attributes.food;
  document.getElementById('product-food-dietary').value = (food && food.dietaryRestrictions || []).join(', ');
  document.getElementById('product-food-tasting-policy').value = (food && food.tastingPolicy) || '';

  const staff = p.attributes && p.attributes.staff;
  document.getElementById('product-staff-uniform').value = (staff && staff.uniformDescription) || '';
  document.getElementById('product-staff-meal-required').checked = !!(staff && staff.mealRequired);
  document.getElementById('product-staff-arrival').value = (staff && staff.arrivalTimeBeforeEvent) || '';

  const av = p.attributes && p.attributes.audiovisual;
  document.getElementById('product-av-crew-count').value = (av && av.crewCount) || '';
  document.getElementById('product-av-delivery-days').value = (av && av.deliveryDays) || '';

  const pricing = p.pricing;
  const money = v => v ? String(Number(v).toFixed(2)).replace('.', ',') : '';
  document.getElementById('pricing-per-person-price').value = money(pricing && pricing.perPerson && pricing.perPerson.pricePerPerson);
  document.getElementById('pricing-per-person-min').value = (pricing && pricing.perPerson && pricing.perPerson.minPeople) || '';
  document.getElementById('pricing-per-person-max').value = (pricing && pricing.perPerson && pricing.perPerson.maxPeople) || '';
  document.getElementById('pricing-per-hour-price').value = money(pricing && pricing.perHour && pricing.perHour.pricePerHour);
  document.getElementById('pricing-per-hour-min').value = (pricing && pricing.perHour && pricing.perHour.minHours) || '';
  document.getElementById('pricing-per-hour-extra').value = money(pricing && pricing.perHour && pricing.perHour.extraHourPrice);
  document.getElementById('pricing-fixed-price').value = money(pricing && pricing.fixed && pricing.fixed.price);
  document.getElementById('pricing-fixed-duration-value').value = (pricing && pricing.fixed && pricing.fixed.durationValue) || '';
  document.getElementById('pricing-fixed-duration-unit').value = (pricing && pricing.fixed && pricing.fixed.durationUnit) || 'horas';
  document.getElementById('pricing-on-request-price').value = money(pricing && pricing.onRequest && pricing.onRequest.startingPrice);

  document.getElementById('product-video-url').value = p.videoUrl || '';
  document.getElementById('product-setup-minutes').value = (p.logistics && p.logistics.setupMinutes) || '';
  document.getElementById('product-teardown-minutes').value = (p.logistics && p.logistics.teardownMinutes) || '';
  document.getElementById('product-service-radius-km').value = (p.logistics && p.logistics.serviceRadiusKm) || '';
  document.getElementById('product-service-extra-km-fee').value = money(p.logistics && p.logistics.extraKmFee);
  document.getElementById('product-cancellation-policy').value = p.cancellationPolicy || 'flexivel';

  document.getElementById('product-service-area-toggle').querySelectorAll('[data-service-area]').forEach(b => b.classList.toggle('active', b.dataset.serviceArea === currentServiceAreaType));
  setPanelHidden('product-service-radius-fields', currentServiceAreaType !== 'radius_km');

  renderCoverImagePicker();
  renderGalleryImages();
  renderWeekdayChips();
  renderDishes();
  renderVenueCommonAreas();
  closeCategoryPanel();
  updateCategoryTriggerLabel();
  document.getElementById('product-name').placeholder = PRODUCT_TITLE_PLACEHOLDERS[p.category] || DEFAULT_TITLE_PLACEHOLDER;
  renderScopeList('included');
  renderScopeList('excluded');
  renderPricingTypeFields();
  updateCategoryFieldsVisibility();

  const form = document.getElementById('product-form');
  form.dataset.editId = p.id;
  setPanelHidden('product-drawer-delete-btn', false);
  goToStep(1);
  document.getElementById('product-drawer').classList.add('show');
  document.getElementById('product-drawer-backdrop').classList.add('show');
}
