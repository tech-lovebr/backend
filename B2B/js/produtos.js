/* ==========================================================================
   LOVE B2B — Produtos & Serviços (catálogo do fornecedor)
   ========================================================================== */

let activeCategory = 'Todos';
let produtosBusca = '';

// SKU: letras, números, hífen e sublinhado (o resto sai ao digitar).
const limparSku = v => String(v || '').replace(/[^A-Za-z0-9_\-]/g, '').slice(0, 40);

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
const PRODUCT_BAR_CATEGORIES = ['Bar e Bebidas', 'Bar e Coquetelaria', 'Bebidas', 'Bar'];
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

// Subcategorias renomeadas: produto salvo com o nome antigo continua
// casando com a opção nova (no Hub e no filtro do Explorar).
const SUBCATEGORY_LEGACY_ALIASES = {
  'Open Bar': 'Bar Completo / Open Bar',
  'Carrinhos': 'Carrinhos / Food Truck'
};
function normalizeSubcategory(sub) {
  return SUBCATEGORY_LEGACY_ALIASES[sub] || sub;
}

const SUBCATEGORY_MAP = {
  'Buffet e Gastronomia': ['Buffet Completo', 'Finger Food', 'Bolo & Doces', 'Churrasco', 'Café da Manhã', 'Carrinhos / Food Truck', 'Cardápio Vegano', 'Tábua de Frios', 'Buffet Infantil'],
  'Bar e Bebidas': ['Bar Completo / Open Bar', 'Sommelier', 'Aluguel de Cervejeira', 'Consignação de Bebidas', 'Bar Infantil'],
  'Espaços para Locação': ['Salão de Festas', 'Sítio/Chácara', 'Rooftop', 'Igreja/Capela', 'Praia', 'Hotel', 'Espaços Exclusivos'],
  'Staff e Mão de Obra': ['Garçom', 'Bartender', 'Segurança', 'Recepcionista', 'Limpeza', 'Manobrista', 'Montadores', 'Carregadores'],
  'Mídia e Audiovisual': ['Fotografia', 'Filmagem', 'Drone', 'Cabine de Fotos', 'Edição de Vídeo', 'Álbum de Fotos'],
  'Música e Entretenimento': ['DJ', 'Banda ao vivo', 'Mestre de cerimônias', 'Aluguel de Brinquedos', 'Animação de Festa', 'Recreação Infantil', 'Orquestra', 'Personagens Vivos', 'Mágicos', 'Efeitos Especiais'],
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
// Título do anúncio sem exemplo nenhum (antes mudava com a categoria).
const DEFAULT_TITLE_PLACEHOLDER = '';

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
const PI_TRASH = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path stroke-linecap="round" stroke-linejoin="round" d="M4 7h16"/><path stroke-linecap="round" stroke-linejoin="round" d="M9 7V4.5A1.5 1.5 0 0 1 10.5 3h3A1.5 1.5 0 0 1 15 4.5V7"/><path stroke-linecap="round" stroke-linejoin="round" d="M6 7l1 12.1A2 2 0 0 0 9 21h6a2 2 0 0 0 2-1.9L18 7"/><path stroke-linecap="round" stroke-linejoin="round" d="M10 11v6M14 11v6"/></svg>';
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
// Junto com a capa recortada (14:5) vai a imagem original e o ponto de foco
// (centro do recorte, em % da original) — extra.cover. É o que deixa o
// Explorar do anfitrião mostrar a capa em outros formatos (lista 5:3, grid
// 4:3) sem perder o assunto: cada formato "cobre" em volta do foco.
let currentCoverMeta = null;
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
// Pacotes ({ id, name, price, description }) e adicionais ({ id, name, price }).
let currentPackages = [];
let currentAddons = [];

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
    // Suspenso pelo Admin (migration 059): some do Explorar e o fornecedor
    // não consegue reativar. select('*') traz as colunas quando existem.
    suspenso: p.suspenso === true,
    suspensoEm: p.suspenso_em || null,
    suspensoMotivo: p.suspenso_motivo || '',
    coverImage: p.cover_image_url,
    cover: (p.extra && p.extra.cover) || null,
    gallery: p.gallery || [],
    venue: (p.extra && p.extra.venue) || null,
    equipmentType: (p.extra && p.extra.equipmentType) || null,
    dishes: (p.extra && p.extra.dishes) || [],
    offerType: (p.extra && p.extra.offerType) || 'servico',
    subcategory: normalizeSubcategory((p.extra && p.extra.subcategory) || null),
    pricing: (p.extra && p.extra.pricing) || null,
    scope: (p.extra && p.extra.scope) || { included: [], excluded: [] },
    sku: (p.extra && p.extra.sku) || '',
    packages: Array.isArray(p.extra && p.extra.packages) ? p.extra.packages : [],
    addons: Array.isArray(p.extra && p.extra.addons) ? p.extra.addons : [],
    rascunho: !!(p.extra && p.extra.rascunho),
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

  const termo = produtosBusca.trim().toLowerCase();
  const items = (activeCategory === 'Todos'
    ? bProducts
    : bProducts.filter(p => p.category === activeCategory))
    .filter(p => !termo || [p.name, p.sku, ...(p.packages || []).map(k => k.sku)].some(v => String(v || '').toLowerCase().includes(termo)));

  if (!items.length) {
    grid.innerHTML = `
      <div class="empty-state" style="grid-column:1/-1;">
        <div class="empty-state-icon">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M21 7.5 12 2.25 3 7.5m18 0-9 5.25M21 7.5v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9" /></svg>
        </div>
        <p class="text-sm font-medium text-zinc-700">${termo ? 'Nenhum item encontrado.' : 'Nenhum item nessa categoria ainda.'}</p>
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
          ${p.suspenso
            ? '<span class="status-badge status-suspenso">Suspenso</span>'
            : (p.rascunho && !p.active)
              ? '<span class="status-badge status-inativo">Rascunho</span>'
              : `<span class="status-badge ${p.active ? 'status-ativo' : 'status-inativo'}">${p.active ? 'Ativo' : 'Inativo'}</span>`}
        </div>
        ${p.sku ? `<p class="produto-sku">${escapeHtml(p.sku)}</p>` : ''}
        <p class="text-xs text-zinc-500">${p.category}</p>
        ${p.suspenso ? `<p class="produto-suspenso-aviso"><strong>Suspenso pela Love</strong>${p.suspensoMotivo ? ' — ' + escapeHtml(p.suspensoMotivo) : ''}</p>` : ''}
        <p class="text-base font-bold text-zinc-900 mt-auto">${productPriceLabel(p)}</p>
        <div class="flex items-center gap-2 mt-1">
          <button class="btn-secondary flex-1 justify-center text-xs py-2" data-edit-product="${p.id}">Editar</button>
          <button type="button" class="btn-secondary product-duplicar-btn" data-duplicate-product="${p.id}" title="Duplicar anúncio" aria-label="Duplicar anúncio"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="8" y="8" width="12" height="12" rx="2"/><path stroke-linecap="round" stroke-linejoin="round" d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/></svg></button>
        </div>
      </div>
    </div>
  `).join('');

  grid.querySelectorAll('[data-edit-product]').forEach(btn => {
    btn.addEventListener('click', () => openProductDrawer(btn.dataset.editProduct));
  });

  grid.querySelectorAll('[data-duplicate-product]').forEach(btn => {
    btn.addEventListener('click', () => duplicarProduto(btn.dataset.duplicateProduct));
  });

  grid.querySelectorAll('[data-add-image]').forEach(btn => {
    btn.addEventListener('click', () => {
      openProductDrawer(btn.dataset.addImage);
      goToStep(4);
    });
  });
}

/* -------------------- Duplicar anúncio --------------------
   Copia tudo do anúncio salvo (categoria/subcategoria, preços, escopo,
   pacotes, atendimento, capa e fotos) num novo, "Título (Cópia)", como
   Rascunho (fora do Explorar até salvar), e já abre para editar. */

async function duplicarProduto(id) {
  const { data: { session } } = await supabaseClient.auth.getSession();
  if (!session) return;
  const { data: orig, error: erroLer } = await supabaseClient.from('products').select('*').eq('id', id).maybeSingle();
  if (erroLer || !orig) { showToast('Não foi possível duplicar o anúncio.', true); return; }
  const extra = JSON.parse(JSON.stringify(orig.extra || {}));
  extra.rascunho = true;
  extra.sku = '';
  (extra.packages || []).forEach(k => { k.sku = ''; });
  const copia = {
    fornecedor_id: session.user.id,
    name: `${(orig.name || '').trim()} (Cópia)`,
    category: orig.category,
    price: orig.price,
    description: orig.description,
    cover_image_url: orig.cover_image_url,
    gallery: Array.isArray(orig.gallery) ? orig.gallery.slice() : [],
    extra,
    active: false
  };
  const { data: nova, error } = await supabaseClient.from('products').insert(copia).select('id').single();
  if (error || !nova) { showToast('Não foi possível duplicar o anúncio.', true); return; }
  await loadProducts();
  renderCategoryTabs();
  renderProducts();
  populateProductCategoryOptions();
  openProductDrawer(nova.id);
  showToast('Anúncio duplicado. Troque o título, as fotos e os preços e salve.');
}

/* -------------------- Pacotes e adicionais (Escopo) -------------------- */

const novoIdPacote = () => 'pk' + Date.now().toString(36) + Math.round(Math.random() * 1e4);
const valorMascarado = v => (Number(v) > 0 ? Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '');

function renderPacotesLista(tipo) {
  const lista = tipo === 'packages' ? currentPackages : currentAddons;
  const wrap = document.getElementById(tipo === 'packages' ? 'product-packages-list' : 'product-addons-list');
  if (!wrap) return;
  wrap.innerHTML = lista.map((item, i) => `
    <div class="product-pacote-item" data-index="${i}">
      <div class="product-pacote-linha">
        <input type="text" class="field-input" data-campo="name" maxlength="60" value="${escapeHtml(item.name || '')}" placeholder="${tipo === 'packages' ? 'Nome do pacote' : 'Nome do item'}" autocomplete="off">
        <input type="text" inputmode="numeric" class="field-input" data-campo="price" value="${valorMascarado(item.price)}" placeholder="0,00" autocomplete="off">
        <button type="button" class="scope-item-remove" data-remover title="Remover" aria-label="Remover">${PI_TRASH}</button>
      </div>
      ${tipo === 'packages' ? `<div class="product-pacote-linha product-pacote-linha--extra">
        <input type="text" class="field-input" data-campo="description" maxlength="160" value="${escapeHtml(item.description || '')}" placeholder="O que inclui (opcional)" autocomplete="off">
        <input type="text" class="field-input product-sku-input" data-campo="sku" maxlength="40" value="${escapeHtml(item.sku || '')}" placeholder="${escapeHtml(limparSku(document.getElementById('product-sku')?.value) || 'SKU (opcional)')}" autocomplete="off" spellcheck="false" title="SKU do pacote (vazio usa o SKU principal)">
      </div>` : ''}
    </div>`).join('');

  wrap.querySelectorAll('.product-pacote-item').forEach(el => {
    const item = lista[Number(el.dataset.index)];
    const preco = el.querySelector('[data-campo="price"]');
    wireCurrencyMaskInput(preco);
    wireMoneyPrefix(preco);
    preco.addEventListener('input', () => { item.price = currencyMaskValue(preco); });
    el.querySelector('[data-campo="name"]').addEventListener('input', e => { item.name = e.target.value; });
    el.querySelector('[data-campo="description"]')?.addEventListener('input', e => { item.description = e.target.value; });
    el.querySelector('[data-campo="sku"]')?.addEventListener('input', e => {
      const limpo = limparSku(e.target.value);
      if (limpo !== e.target.value) e.target.value = limpo;
      item.sku = limpo;
    });
    el.querySelector('[data-remover]').addEventListener('click', () => {
      lista.splice(Number(el.dataset.index), 1);
      renderPacotesLista(tipo);
    });
  });
}

function initPacotes() {
  const adicionar = (tipo) => {
    const lista = tipo === 'packages' ? currentPackages : currentAddons;
    lista.push(tipo === 'packages' ? { id: novoIdPacote(), name: '', price: 0, description: '' } : { id: novoIdPacote(), name: '', price: 0 });
    renderPacotesLista(tipo);
    const wrap = document.getElementById(tipo === 'packages' ? 'product-packages-list' : 'product-addons-list');
    wrap?.lastElementChild?.querySelector('[data-campo="name"]')?.focus();
  };
  document.getElementById('product-package-add-btn')?.addEventListener('click', () => adicionar('packages'));
  document.getElementById('product-addon-add-btn')?.addEventListener('click', () => adicionar('addons'));
}

const pacotesParaSalvar = (lista, comDescricao) => lista
  .map(i => ({ id: i.id, name: String(i.name || '').trim(), price: Number(i.price) || 0, ...(comDescricao ? { description: String(i.description || '').trim(), sku: limparSku(i.sku) } : {}) }))
  .filter(i => i.name);

/* -------------------- Upload de imagens -------------------- */

function renderCoverImagePicker() {
  const wrap = document.getElementById('product-cover-wrap');
  if (!wrap) return;
  wrap.innerHTML = `
    <div class="header-logo-picker-wrap">
      <label class="header-logo-picker product-cover-picker ${currentCoverImage ? 'has-image' : ''}">
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
  // A imagem escolhida abre no modal de corte; só vira capa ao Concluir.
  const applyFile = (file) => readFileAsDataUrl(file, (dataUrl) => openProductCoverCropModal(dataUrl));
  if (input) {
    input.addEventListener('change', () => { if (input.files[0]) applyFile(input.files[0]); });
    wireImageDropZone(input.closest('.header-logo-picker'), applyFile);
  }
  const removeBtn = document.getElementById('product-cover-remove');
  if (removeBtn) removeBtn.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); currentCoverImage = null; currentCoverMeta = null; renderCoverImagePicker(); });
}

/* -------------------- Modal: cortar a imagem de capa --------------------
   A capa do card tem proporção 14:5 (≈390×140 no catálogo). Em vez de
   guardar a foto inteira e deixar o object-fit decidir o enquadramento, o
   fornecedor arrasta/zoom e o resultado é recortado de verdade (canvas) já
   no tamanho da capa — é esse recorte que vai pro banco e pra vitrine. */
const PRODUCT_COVER_ASPECT = 14 / 5;
const PRODUCT_COVER_EXPORT_WIDTH = 1400;

const coverCrop = { img: null, zoom: 1, dx: 0, dy: 0 };

function coverCropFrame() {
  return document.querySelector('#product-cover-crop-modal [data-cover-crop-frame]');
}

// Zoom 1 = a imagem inteira cabendo no quadro ("contain"): quem sobe uma
// foto em outro formato vê ela toda e aumenta o zoom até preencher a capa
// (o que sobrar do quadro vai branco no recorte). Daí pra cima, vezes o zoom.
function coverCropScale() {
  const frame = coverCropFrame();
  const { img, zoom } = coverCrop;
  if (!frame || !img) return 1;
  const fw = frame.clientWidth, fh = frame.clientHeight;
  return Math.min(fw / img.naturalWidth, fh / img.naturalHeight) * zoom;
}

// No eixo em que a imagem é maior que o quadro, o arrasto para na borda;
// no eixo em que é menor (imagem inteira visível), fica centrada.
function clampCoverCropOffset() {
  const frame = coverCropFrame();
  const { img } = coverCrop;
  if (!frame || !img) return;
  const s = coverCropScale();
  const maxDx = Math.max(0, (img.naturalWidth * s - frame.clientWidth) / 2);
  const maxDy = Math.max(0, (img.naturalHeight * s - frame.clientHeight) / 2);
  coverCrop.dx = Math.min(maxDx, Math.max(-maxDx, coverCrop.dx));
  coverCrop.dy = Math.min(maxDy, Math.max(-maxDy, coverCrop.dy));
}

function updateCoverCropView() {
  const frame = coverCropFrame();
  const modal = document.getElementById('product-cover-crop-modal');
  const el = modal && modal.querySelector('[data-cover-crop-img]');
  const { img } = coverCrop;
  if (!frame || !el || !img) return;
  clampCoverCropOffset();
  const s = coverCropScale();
  const w = img.naturalWidth * s, h = img.naturalHeight * s;
  el.style.width = `${w}px`;
  el.style.height = `${h}px`;
  el.style.left = `${frame.clientWidth / 2 - w / 2 + coverCrop.dx}px`;
  el.style.top = `${frame.clientHeight / 2 - h / 2 + coverCrop.dy}px`;
  const range = modal.querySelector('[data-cover-crop-range]');
  if (range) range.value = coverCrop.zoom;
}

function setCoverCropZoom(zoom) {
  coverCrop.zoom = Math.min(8, Math.max(1, +Number(zoom).toFixed(2)));
  updateCoverCropView();
}

// Recorta a área visível do quadro num canvas 14:5 e devolve JPEG.
function exportCoverCrop() {
  const frame = coverCropFrame();
  const { img } = coverCrop;
  if (!frame || !img) return null;
  const s = coverCropScale();
  const fw = frame.clientWidth, fh = frame.clientHeight;
  const sx = (img.naturalWidth * s / 2 - fw / 2 - coverCrop.dx) / s;
  const sy = (img.naturalHeight * s / 2 - fh / 2 - coverCrop.dy) / s;
  const sw = fw / s, sh = fh / s;
  const canvas = document.createElement('canvas');
  canvas.width = PRODUCT_COVER_EXPORT_WIDTH;
  canvas.height = Math.round(PRODUCT_COVER_EXPORT_WIDTH / PRODUCT_COVER_ASPECT);
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  // Posição da imagem dentro do quadro, levada pra escala do canvas: vale
  // tanto com a imagem cobrindo o quadro quanto com ela inteira (sobra branca).
  const k = canvas.width / fw;
  ctx.drawImage(
    img,
    (fw / 2 - img.naturalWidth * s / 2 + coverCrop.dx) * k,
    (fh / 2 - img.naturalHeight * s / 2 + coverCrop.dy) * k,
    img.naturalWidth * s * k,
    img.naturalHeight * s * k
  );
  const crop = canvas.toDataURL('image/jpeg', 0.88);

  // Foco = centro do recorte, em % da imagem original (object-position).
  const clampPct = v => Math.max(0, Math.min(100, v));
  const focus = {
    x: +clampPct((sx + sw / 2) / img.naturalWidth * 100).toFixed(1),
    y: +clampPct((sy + sh / 2) / img.naturalHeight * 100).toFixed(1)
  };

  // Original reduzida (lado maior até 1600px) — é ela que o Explorar usa
  // nos formatos que não são 14:5.
  const maxSide = 1600;
  const ratio = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight));
  const oc = document.createElement('canvas');
  oc.width = Math.round(img.naturalWidth * ratio);
  oc.height = Math.round(img.naturalHeight * ratio);
  const octx = oc.getContext('2d');
  octx.fillStyle = '#fff';
  octx.fillRect(0, 0, oc.width, oc.height);
  octx.drawImage(img, 0, 0, oc.width, oc.height);
  const original = oc.toDataURL('image/jpeg', 0.85);

  return { crop, original, focus };
}

// Sobe recorte e original pro Storage (bucket fornecedores, pasta do próprio
// fornecedor — migration 042) e devolve as URLs públicas. Se não der (bucket
// ausente, sem sessão), devolve null e a capa fica como data URL, como antes.
async function salvarCapaNoStorage(result) {
  const session = window.b2bSession || (await supabaseClient.auth.getSession()).data.session;
  if (!session) return null;
  const toBlob = dataUrl => fetch(dataUrl).then(r => r.blob());
  const base = `portfolio/${session.user.id}/capas/${Date.now()}-${Math.round(performance.now())}`;
  try {
    const [cropBlob, originalBlob] = await Promise.all([toBlob(result.crop), toBlob(result.original)]);
    const opts = { cacheControl: '31536000', contentType: 'image/jpeg' };
    const [a, b] = await Promise.all([
      supabaseClient.storage.from('fornecedores').upload(`${base}-capa.jpg`, cropBlob, opts),
      supabaseClient.storage.from('fornecedores').upload(`${base}-original.jpg`, originalBlob, opts)
    ]);
    if (a.error || b.error) { console.warn('Capa ficou local (Storage indisponível).', a.error || b.error); return null; }
    const pub = caminho => supabaseClient.storage.from('fornecedores').getPublicUrl(caminho).data.publicUrl;
    return { coverUrl: pub(`${base}-capa.jpg`), originalUrl: pub(`${base}-original.jpg`) };
  } catch (err) {
    console.warn('Capa ficou local (Storage indisponível).', err);
    return null;
  }
}

function openProductCoverCropModal(dataUrl) {
  const modal = document.getElementById('product-cover-crop-modal');
  if (!modal) { currentCoverImage = dataUrl; currentCoverMeta = null; renderCoverImagePicker(); return; }
  wireProductCoverCropModalOnce();
  const img = new Image();
  img.onload = () => {
    coverCrop.img = img;
    coverCrop.zoom = 1;
    coverCrop.dx = 0;
    coverCrop.dy = 0;
    modal.querySelector('[data-cover-crop-img]').src = dataUrl;
    modal.classList.add('show');
    // O quadro só tem tamanho depois de aparecer.
    requestAnimationFrame(updateCoverCropView);
  };
  img.src = dataUrl;
}

function closeProductCoverCropModal() {
  const modal = document.getElementById('product-cover-crop-modal');
  if (modal) modal.classList.remove('show');
  coverCrop.img = null;
}

function wireProductCoverCropModalOnce() {
  const modal = document.getElementById('product-cover-crop-modal');
  if (!modal || modal.dataset.wired) return;
  modal.dataset.wired = '1';

  modal.addEventListener('click', (e) => { if (e.target === modal) closeProductCoverCropModal(); });
  modal.querySelector('[data-cover-crop-close]').addEventListener('click', closeProductCoverCropModal);
  modal.querySelector('[data-cover-crop-done]').addEventListener('click', async () => {
    const result = exportCoverCrop();
    closeProductCoverCropModal();
    if (!result) return;
    // Mostra já o recorte (data URL); se o Storage aceitar, troca pelas URLs.
    currentCoverImage = result.crop;
    currentCoverMeta = { originalUrl: null, focus: result.focus };
    renderCoverImagePicker();
    const urls = await salvarCapaNoStorage(result);
    if (urls && currentCoverImage === result.crop) {
      currentCoverImage = urls.coverUrl;
      currentCoverMeta = { originalUrl: urls.originalUrl, focus: result.focus };
      renderCoverImagePicker();
    }
  });

  const range = modal.querySelector('[data-cover-crop-range]');
  range.addEventListener('input', () => setCoverCropZoom(range.value));
  modal.querySelector('[data-cover-crop-zoom-minus]').addEventListener('click', () => setCoverCropZoom(coverCrop.zoom - 0.1));
  modal.querySelector('[data-cover-crop-zoom-plus]').addEventListener('click', () => setCoverCropZoom(coverCrop.zoom + 0.1));

  const frame = modal.querySelector('[data-cover-crop-frame]');
  let dragging = false, startX = 0, startY = 0, startDx = 0, startDy = 0;
  frame.addEventListener('pointerdown', (e) => {
    dragging = true;
    startX = e.clientX; startY = e.clientY;
    startDx = coverCrop.dx; startDy = coverCrop.dy;
    frame.setPointerCapture(e.pointerId);
    frame.classList.add('is-dragging');
  });
  frame.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    coverCrop.dx = startDx + (e.clientX - startX);
    coverCrop.dy = startDy + (e.clientY - startY);
    updateCoverCropView();
  });
  const stop = () => { dragging = false; frame.classList.remove('is-dragging'); };
  frame.addEventListener('pointerup', stop);
  frame.addEventListener('pointercancel', stop);
  // Roda do mouse dá zoom no quadro.
  frame.addEventListener('wheel', (e) => { e.preventDefault(); setCoverCropZoom(coverCrop.zoom + (e.deltaY < 0 ? 0.1 : -0.1)); }, { passive: false });
  window.addEventListener('resize', () => { if (modal.classList.contains('show')) updateCoverCropView(); });
}

/* "Mais imagens": carrossel de quadradinhos (como aparecem na galeria), com
   um quadradinho "+" no fim pra adicionar — até 6 fotos, várias de uma vez.
   Diferente da capa, aqui não tem corte: a galeria mostra a foto inteira
   num quadrado (object-fit: cover), que é o que a prévia aqui imita. */
const PRODUCT_GALLERY_MAX = 6;

function renderGalleryImages() {
  const wrap = document.getElementById('product-gallery-list');
  if (!wrap) return;
  // Slots vazios do fluxo antigo (push('')) não fazem sentido no carrossel.
  currentGalleryImages = currentGalleryImages.filter(Boolean).slice(0, PRODUCT_GALLERY_MAX);
  const cheio = currentGalleryImages.length >= PRODUCT_GALLERY_MAX;

  wrap.innerHTML = currentGalleryImages.map((src, i) => `
    <div class="product-gallery-tile">
      <img src="${src}" alt="">
      <button type="button" class="header-logo-picker-remove" data-remove-gallery-image="${i}" title="Remover imagem">${PI_CLOSE}</button>
    </div>
  `).join('') + (cheio ? '' : `
    <label class="image-upload-zone product-gallery-add" id="product-gallery-add-zone" title="Adicionar imagem">
      <span class="image-upload-zone-plus">${PI_PLUS}</span>
      <span class="image-upload-zone-text">Adicionar</span>
      <input type="file" accept="image/*" multiple class="image-upload-zone-input" id="product-gallery-input">
    </label>
  `);

  const count = document.getElementById('product-gallery-count');
  if (count) count.textContent = `${currentGalleryImages.length}/${PRODUCT_GALLERY_MAX}`;

  wrap.querySelectorAll('[data-remove-gallery-image]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      currentGalleryImages.splice(Number(btn.dataset.removeGalleryImage), 1);
      renderGalleryImages();
    });
  });

  const input = document.getElementById('product-gallery-input');
  if (input) {
    input.addEventListener('change', () => addGalleryFiles(input.files));
    wireImageDropZone(document.getElementById('product-gallery-add-zone'), (file) => addGalleryFiles([file]));
  }
}

// Lê os arquivos em ordem e só entra o que couber até o limite de 6.
function addGalleryFiles(files) {
  const lista = Array.from(files || []).filter(f => f && /^image\//.test(f.type || ''));
  const vagas = PRODUCT_GALLERY_MAX - currentGalleryImages.length;
  if (vagas <= 0) { showToast(`Limite de ${PRODUCT_GALLERY_MAX} imagens.`, true); return; }
  if (lista.length > vagas) showToast(`Só cabem mais ${vagas} ${vagas === 1 ? 'imagem' : 'imagens'} (limite de ${PRODUCT_GALLERY_MAX}).`, true);
  const aceitos = lista.slice(0, vagas);
  let pendentes = aceitos.length;
  if (!pendentes) return;
  const lidos = new Array(aceitos.length);
  aceitos.forEach((file, i) => readFileAsDataUrl(file, (dataUrl) => {
    lidos[i] = dataUrl;
    if (--pendentes === 0) {
      currentGalleryImages.push(...lidos.filter(Boolean));
      renderGalleryImages();
    }
  }));
}

/* -------------------- Detalhes do local (Espaços para Locação) -------------------- */

function initVenueCommonAreaOutro() {
  const input = document.getElementById('product-venue-common-area-outro-input');
  const add = document.getElementById('product-venue-common-area-outro-add');
  if (!input || !add) return;
  const adicionar = () => {
    const nome = input.value.trim().replace(/\s+/g, ' ');
    if (!nome) { input.focus(); return; }
    const existente = currentVenueCommonAreas.concat(VENUE_COMMON_AREA_OPTIONS).find(a => a.toLowerCase() === nome.toLowerCase());
    const area = existente || (nome.charAt(0).toUpperCase() + nome.slice(1));
    if (!currentVenueCommonAreas.includes(area)) currentVenueCommonAreas.push(area);
    input.value = '';
    renderVenueCommonAreas();
    input.focus();
  };
  add.addEventListener('click', adicionar);
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); adicionar(); } });
}

function renderVenueCommonAreas() {
  const wrap = document.getElementById('product-venue-common-areas-row');
  if (!wrap) return;

  // As áreas digitadas em "Outro" entram como chips próprios (clicar tira).
  const extras = currentVenueCommonAreas.filter(a => !VENUE_COMMON_AREA_OPTIONS.includes(a));
  const outroAberto = !document.getElementById('product-venue-common-area-outro')?.hidden;
  wrap.innerHTML = VENUE_COMMON_AREA_OPTIONS.concat(extras).map(area => `
    <button type="button" class="weekday-toggle-chip ${currentVenueCommonAreas.includes(area) ? 'active' : ''}" data-common-area="${escapeHtml(area)}">${escapeHtml(area)}</button>
  `).join('') + `<button type="button" class="weekday-toggle-chip ${outroAberto ? 'active' : ''}" data-common-area-outro>Outro</button>`;

  wrap.querySelector('[data-common-area-outro]').addEventListener('click', () => {
    const box = document.getElementById('product-venue-common-area-outro');
    if (!box) return;
    box.hidden = !box.hidden;
    renderVenueCommonAreas();
    if (!box.hidden) document.getElementById('product-venue-common-area-outro-input')?.focus();
  });

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
    opt.textContent = uf;
    opt.title = nome;
    select.appendChild(opt);
  });
}

/* Cidade: busca sem acento (digitar "sao paulo" acha "São Paulo"); ao
   escolher, entra o nome certo, com acento. */
const semAcento = t => String(t || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
let venueCidades = [];

function populateVenueCityOptions(uf) {
  const cityInput = document.getElementById('product-venue-city');
  if (!cityInput) return;
  venueCidades = (typeof BR_CIDADES_POR_UF !== 'undefined' && BR_CIDADES_POR_UF[uf]) || [];
  cityInput.disabled = !uf;
  cityInput.placeholder = uf ? 'Digite a cidade' : 'Selecione o estado primeiro';
  if (!uf) cityInput.value = '';
  fecharSugestoesCidade();
}

function fecharSugestoesCidade() {
  const box = document.getElementById('product-venue-city-sugestoes');
  const input = document.getElementById('product-venue-city');
  if (box) box.hidden = true;
  if (input) input.setAttribute('aria-expanded', 'false');
}

function initVenueCityBusca() {
  const input = document.getElementById('product-venue-city');
  const box = document.getElementById('product-venue-city-sugestoes');
  if (!input || !box) return;
  let ativo = -1;
  const escolher = (nome) => { input.value = nome; fecharSugestoesCidade(); };
  const mostrar = () => {
    const termo = semAcento(input.value);
    const achadas = termo
      ? venueCidades.filter(c => semAcento(c).startsWith(termo))
          .concat(venueCidades.filter(c => !semAcento(c).startsWith(termo) && semAcento(c).includes(termo)))
          .slice(0, 8)
      : [];
    ativo = -1;
    if (!achadas.length) { fecharSugestoesCidade(); return; }
    box.innerHTML = achadas.map(c => `<button type="button" class="cidade-sugestao" role="option">${escapeHtml(c)}</button>`).join('');
    box.querySelectorAll('.cidade-sugestao').forEach((b, i) => {
      b.addEventListener('mousedown', (e) => { e.preventDefault(); escolher(achadas[i]); });
    });
    box.hidden = false;
    input.setAttribute('aria-expanded', 'true');
  };
  input.addEventListener('input', mostrar);
  input.addEventListener('keydown', (e) => {
    const itens = [...box.querySelectorAll('.cidade-sugestao')];
    if (box.hidden || !itens.length) return;
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      ativo = (ativo + (e.key === 'ArrowDown' ? 1 : -1) + itens.length) % itens.length;
      itens.forEach((b, i) => b.classList.toggle('is-ativo', i === ativo));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      escolher(itens[Math.max(ativo, 0)].textContent);
    } else if (e.key === 'Escape') {
      fecharSugestoesCidade();
    }
  });
  // Ao sair: se o texto bate com uma cidade (ignorando acento), corrige o nome.
  input.addEventListener('blur', () => {
    const exata = venueCidades.find(c => semAcento(c) === semAcento(input.value));
    if (exata) input.value = exata;
    fecharSugestoesCidade();
  });
}

/* Área útil: só números, e o "m²" aparece logo depois do número digitado. */
function atualizarUnidadeArea() {
  const input = document.getElementById('product-venue-size');
  const eco = input && input.parentElement.querySelector('.campo-unidade-eco');
  if (!eco) return;
  eco.textContent = input.value;
  input.parentElement.classList.toggle('tem-valor', !!input.value);
}

function initVenueArea() {
  const input = document.getElementById('product-venue-size');
  if (!input) return;
  input.addEventListener('input', () => {
    const limpo = input.value.replace(/\D/g, '');
    if (limpo !== input.value) input.value = limpo;
    atualizarUnidadeArea();
  });
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
          <label class="field-label">Valor</label>
          <input type="text" inputmode="numeric" class="field-input" data-dish-price="${d.id}" value="${d.price > 0 ? Number(d.price).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : ''}">
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
    // Mesmo campo de dinheiro dos preços: "R$" fixo e vírgula automática.
    wireCurrencyMaskInput(input);
    wireMoneyPrefix(input);
    input.addEventListener('input', () => {
      const d = currentDishes.find(x => x.id === input.dataset.dishPrice);
      if (d) d.price = currencyMaskValue(input);
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
    isBar: PRODUCT_BAR_CATEGORIES.includes(category),
    isStaff: PRODUCT_STAFF_CATEGORIES.includes(category),
    isAV: PRODUCT_AV_CATEGORIES.includes(category)
  };
}

function updateCategoryFieldsVisibility() {
  const category = document.getElementById('product-category').value;
  const { isVenue, isEquipment, isFood, isStaff, isAV } = categoryGroups(category);

  // Etapa 3: bloco de atributos específico por categoria.
  setPanelHidden('product-venue-fields', !isVenue);
  setPanelHidden('product-scope-lists', isVenue);
  setPanelHidden('product-venue-details', !isVenue);
  setPanelHidden('product-food-fields', !isFood);
  setPanelHidden('product-tasting-field', !(isFood || categoryGroups(category).isBar));
  setPanelHidden('product-staff-fields', !isStaff);
  setPanelHidden('product-audiovisual-fields', !isAV);
  setPanelHidden('product-equipment-fields', !isEquipment);

  // Etapa 2: Locação de espaço mantém a grade de preço por dia já existente
  // em vez do motor de precificação novo (decisão confirmada com o usuário).
  setPanelHidden('pricing-venue-section', !isVenue);
  setPanelHidden('pricing-standard-section', isVenue);
}

/* -------------------- Etapa 1: seletor de categoria + chips de subcategoria -------------------- */

// Seletor fechado por padrão ("Selecione a categoria..."); clicar
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
  // Só o nome mais específico: "Churrasco" (não "Buffet e Gastronomia · Churrasco").
  const nome = select.value ? (currentSubcategory || select.value) : '';
  label.textContent = nome || 'Selecione a categoria...';
  // Mídia: sempre a categoria principal (Sítio/Chácara → espaços para locação).
  const hint = document.getElementById('product-gallery-hint');
  if (hint) hint.textContent = select.value
    ? `Adicione imagens sobre o seu serviço de ${select.value.toLowerCase()}.`
    : 'Adicione imagens sobre o seu serviço.';
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

// Escreve no campo e aperta Enter (ou "Adicionar"): o item vira uma
// caixinha na lista abaixo, com a lixeira ao lado.
function addScopeItemFromInput(kind) {
  const input = document.getElementById(`product-scope-${kind}-input`);
  if (!input) return false;
  const text = input.value.trim();
  if (!text) return false;
  scopeState(kind).push({ id: (kind === 'included' ? 'si' : 'se') + Date.now() + '-' + Math.round(Math.random() * 999), text });
  input.value = '';
  renderScopeList(kind);
  return true;
}

function renderScopeList(kind) {
  const wrap = document.getElementById(`product-scope-${kind}-list`);
  if (!wrap) return;
  // Itens vazios (de versões antigas, que criavam a linha antes do texto) somem.
  const arr = scopeState(kind);
  for (let i = arr.length - 1; i >= 0; i--) if (!String(arr[i].text || '').trim()) arr.splice(i, 1);
  wrap.innerHTML = arr.map(item => `
    <div class="scope-item">
      <span class="scope-item-text">${escapeHtml(item.text)}</span>
      <button type="button" class="scope-item-remove" data-remove-scope="${item.id}" data-scope-kind="${kind}" aria-label="Remover">${PI_TRASH}</button>
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
    const active = Number(el.dataset.stepIndicator) === n;
    el.classList.toggle('is-active', active);
    el.setAttribute('aria-selected', active ? 'true' : 'false');
  });

  // Rodapé: nas etapas 1–3, "Salvar item" (branco) à esquerda e "Próximo"
  // à direita. Na 4 (Mídia), "Voltar" à esquerda e "Salvar item" (principal)
  // à direita. Salvar fica disponível em qualquer aba (o submit valida
  // Categoria e Preço e leva pra aba que faltar).
  const ultima = n === 4;
  setPanelHidden('product-wizard-back-btn', !ultima);
  setPanelHidden('product-wizard-next-btn', ultima);
  setPanelHidden('product-wizard-submit-btn', false);
  const salvarBtn = document.getElementById('product-wizard-submit-btn');
  if (salvarBtn) {
    salvarBtn.classList.toggle('btn-primary', ultima);
    salvarBtn.classList.toggle('btn-secondary', !ultima);
  }
  updateWizardNextButtonState();
}

// Etapa 1: o botão Próximo só libera quando categoria e título estão
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

  const showDeleteConfirm = (show) => {
    setPanelHidden('product-wizard-footer-default', show);
    setPanelHidden('product-wizard-footer-confirm-delete', !show);
  };

  const open = () => { drawer.classList.add('show'); backdrop.classList.add('show'); };
  const close = () => {
    drawer.classList.remove('show');
    backdrop.classList.remove('show');
    form.reset();
    delete form.dataset.editId;
    showDeleteConfirm(false);
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
    if (el) { wireCurrencyMaskInput(el); wireMoneyPrefix(el); }
  });

  populateVenueStateOptions();
  initPacotes();
  const skuInput = document.getElementById('product-sku');
  skuInput?.addEventListener('input', () => {
    const limpo = limparSku(skuInput.value);
    if (limpo !== skuInput.value) skuInput.value = limpo;
    document.querySelectorAll('#product-packages-list [data-campo="sku"]').forEach(el => { el.placeholder = limpo || 'SKU (opcional)'; });
  });
  document.getElementById('products-search')?.addEventListener('input', (e) => {
    produtosBusca = e.target.value;
    renderProducts();
  });
  initVenueCommonAreaOutro();
  initVenueCityBusca();
  initVenueArea();
  document.getElementById('product-venue-state').addEventListener('change', (e) => {
    populateVenueCityOptions(e.target.value);
  });

  const resetDrawerState = () => {
    currentCoverImage = null;
    currentCoverMeta = null;
    currentGalleryImages = [];
    currentOpenDays = defaultOpenDays();
    currentDishes = [];
    currentVenueCommonAreas = [];
    const outroBox = document.getElementById('product-venue-common-area-outro');
    if (outroBox) outroBox.hidden = true;
    currentSubcategory = null;
    currentCategoryExpanded = null;
    currentPricingType = null;
    currentServiceAreaType = 'city_only';
    currentScopeIncluded = [];
    currentScopeExcluded = [];
    currentPackages = [];
    currentAddons = [];
    renderPacotesLista('packages');
    renderPacotesLista('addons');

    renderCoverImagePicker();
    renderGalleryImages();
    renderWeekdayChips();
    renderDishes();
    renderVenueCommonAreas();
    document.getElementById('product-venue-state').value = '';
    populateVenueCityOptions('');
    atualizarUnidadeArea();
    closeCategoryPanel();
    updateCategoryTriggerLabel();
    renderScopeList('included');
    renderScopeList('excluded');
    ['included', 'excluded'].forEach(k => { const el = document.getElementById(`product-scope-${k}-input`); if (el) el.value = ''; });
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
    setPanelHidden('product-drawer-duplicate-btn', true);
    showDeleteConfirm(false);

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
    const avisoSuspensoNovo = document.getElementById('product-suspenso-aviso');
    if (avisoSuspensoNovo) avisoSuspensoNovo.hidden = true;
    resetDrawerState();
    open();
  });
  if (closeBtn) closeBtn.addEventListener('click', close);
  if (cancelBtn) cancelBtn.addEventListener('click', close);
  if (backdrop) backdrop.addEventListener('click', close);

  const deleteBtn = document.getElementById('product-drawer-delete-btn');
  if (deleteBtn) deleteBtn.addEventListener('click', () => showDeleteConfirm(true));

  document.getElementById('product-drawer-duplicate-btn')?.addEventListener('click', async (e) => {
    const id = form.dataset.editId;
    if (!id) return;
    const btn = e.currentTarget;
    btn.disabled = true;
    try { await duplicarProduto(id); } finally { btn.disabled = false; }
  });

  const deleteNoBtn = document.getElementById('product-drawer-delete-no-btn');
  if (deleteNoBtn) deleteNoBtn.addEventListener('click', () => showDeleteConfirm(false));

  const deleteYesBtn = document.getElementById('product-drawer-delete-yes-btn');
  if (deleteYesBtn) deleteYesBtn.addEventListener('click', async () => {
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
    document.getElementById('product-name').placeholder = DEFAULT_TITLE_PLACEHOLDER;
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

  ['included', 'excluded'].forEach(kind => {
    const input = document.getElementById(`product-scope-${kind}-input`);
    document.getElementById(`product-scope-${kind}-add-btn`).addEventListener('click', () => {
      addScopeItemFromInput(kind);
      input.focus();
    });
    // Enter adiciona o item (e não envia o formulário).
    input.addEventListener('keydown', e => {
      if (e.key === 'Enter' && !e.isComposing) { e.preventDefault(); addScopeItemFromInput(kind); }
    });
  });

  document.getElementById('product-wizard-back-btn').addEventListener('click', () => {
    if (currentStep > 1) goToStep(currentStep - 1);
  });
  document.querySelectorAll('#product-wizard-steps [data-step-indicator]').forEach(tab => {
    tab.addEventListener('click', () => goToStep(Number(tab.dataset.stepIndicator)));
  });
  document.getElementById('product-wizard-next-btn').addEventListener('click', () => {
    const validators = { 1: validateStep1, 2: validateStep2, 3: validateStep3 };
    const validate = validators[currentStep];
    if (validate && !validate()) return;
    if (currentStep < 4) goToStep(currentStep + 1);
  });


  // "Adicionar prato" saiu do drawer; pratos já salvos continuam no item.
  const dishAddBtn = document.getElementById('product-dish-add-btn');
  if (dishAddBtn) dishAddBtn.addEventListener('click', () => {
    currentDishes.push({ id: 'd' + Date.now() + '-' + Math.round(Math.random() * 999), name: '', price: 0, quantity: 0 });
    renderDishes();
  });

  if (form) {
    form.addEventListener('submit', async e => {
      e.preventDefault();
      // Clique repetido (ou Enter) enquanto o primeiro envio ainda está
      // salvando criava o mesmo item várias vezes.
      if (form.dataset.saving) return;
      // Texto escrito no escopo sem apertar Enter também entra na lista.
      addScopeItemFromInput('included');
      addScopeItemFromInput('excluded');
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
          tastingAllowed: document.getElementById('product-tasting-allowed').checked
        } : null,
        bar: categoryGroups(category).isBar ? {
          tastingAllowed: document.getElementById('product-tasting-allowed').checked
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
          // original + foco do recorte da capa (null sem capa) — ver currentCoverMeta
          cover: currentCoverImage ? currentCoverMeta : null,
          subcategory: currentSubcategory,
          sku: limparSku(document.getElementById('product-sku').value.trim()) || null,
          pricing,
          scope: {
            included: currentScopeIncluded.map(i => i.text).filter(Boolean),
            excluded: currentScopeExcluded.map(i => i.text).filter(Boolean)
          },
          packages: pacotesParaSalvar(currentPackages, true),
          addons: pacotesParaSalvar(currentAddons, false),
          attributes,
          videoUrl: document.getElementById('product-video-url').value.trim() || null,
          logistics,
          cancellationPolicy: document.getElementById('product-cancellation-policy').value,
          venue,
          equipmentType,
          dishes
        }
      };

      const submitBtn = document.getElementById('product-wizard-submit-btn');
      form.dataset.saving = '1';
      if (submitBtn) submitBtn.disabled = true;

      try {
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
      } finally {
        delete form.dataset.saving;
        if (submitBtn) submitBtn.disabled = false;
      }
    });
  }
}

function openProductDrawer(id) {
  const p = bProducts.find(x => x.id === id);
  if (!p) return;
  document.getElementById('product-drawer-title').textContent = 'Editar produto ou serviço';
  // Serviço suspenso pela Love: aviso no topo do drawer.
  const avisoSuspenso = document.getElementById('product-suspenso-aviso');
  if (avisoSuspenso) {
    const prod = bProducts.find(x => x.id === id);
    avisoSuspenso.hidden = !(prod && prod.suspenso);
    if (prod && prod.suspenso) {
      avisoSuspenso.innerHTML = '<strong>Suspenso pela Love.</strong> Este serviço não aparece no Explorar enquanto estiver suspenso.'
        + (prod.suspensoMotivo ? '<br>Motivo: ' + escapeHtml(prod.suspensoMotivo) : '');
    }
  }
  document.getElementById('product-name').value = p.name;
  document.getElementById('product-category').value = p.category;
  document.getElementById('product-description').value = p.description || '';

  currentCoverImage = p.coverImage || null;
  currentCoverMeta = p.cover || null;
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
  currentPackages = (p.packages || []).map(i => ({ id: i.id || novoIdPacote(), name: i.name || '', price: Number(i.price) || 0, description: i.description || '', sku: i.sku || '' }));
  document.getElementById('product-sku').value = p.sku || '';
  currentAddons = (p.addons || []).map(i => ({ id: i.id || novoIdPacote(), name: i.name || '', price: Number(i.price) || 0 }));

  document.getElementById('product-venue-street').value = (p.venue && (p.venue.street !== undefined ? p.venue.street : p.venue.address)) || '';
  document.getElementById('product-venue-number').value = (p.venue && p.venue.number) || '';
  document.getElementById('product-venue-complement').value = (p.venue && p.venue.complement) || '';
  const venueState = (p.venue && p.venue.state) || '';
  document.getElementById('product-venue-state').value = venueState;
  populateVenueCityOptions(venueState);
  document.getElementById('product-venue-city').value = (p.venue && p.venue.city) || '';
  document.getElementById('product-venue-size').value = String((p.venue && p.venue.size) || '').replace(/\D/g, '');
  atualizarUnidadeArea();
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
  // Degustação: caixa de marcar (itens antigos com texto de política contam como permitido).
  const bar = p.attributes && p.attributes.bar;
  document.getElementById('product-tasting-allowed').checked = !!((food && (food.tastingAllowed || food.tastingPolicy)) || (bar && bar.tastingAllowed));

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
  document.getElementById('product-name').placeholder = DEFAULT_TITLE_PLACEHOLDER;
  renderScopeList('included');
  renderScopeList('excluded');
  renderPacotesLista('packages');
  renderPacotesLista('addons');
  ['included', 'excluded'].forEach(k => { const el = document.getElementById(`product-scope-${k}-input`); if (el) el.value = ''; });
  renderPricingTypeFields();
  updateCategoryFieldsVisibility();

  const form = document.getElementById('product-form');
  form.dataset.editId = p.id;
  setPanelHidden('product-drawer-delete-btn', false);
  setPanelHidden('product-drawer-duplicate-btn', false);
  setPanelHidden('product-wizard-footer-default', false);
  setPanelHidden('product-wizard-footer-confirm-delete', true);
  goToStep(1);
  document.getElementById('product-drawer').classList.add('show');
  document.getElementById('product-drawer-backdrop').classList.add('show');
}
