/* ==========================================================================
   LOVE B2B — Produtos & Serviços (catálogo do fornecedor)
   ========================================================================== */

let activeCategory = 'Todos';

const PRODUCT_VENUE_CATEGORY = 'Locação de Espaço';
const PRODUCT_EQUIPMENT_CATEGORY = 'Locação de Equipamentos';
const PRODUCT_FOOD_CATEGORY = 'Buffet';

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

let currentCoverImage = null;
let currentGalleryImages = [];
let currentOpenDays = {};
let currentDishes = [];
let currentFloorPlan = null;

document.addEventListener('DOMContentLoaded', () => {
  renderCategoryTabs();
  renderProducts();
  initProductDrawer();
  initCompleteProfileModal();
});

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

function renderCategoryTabs() {
  const wrap = document.getElementById('category-tabs');
  if (!wrap) return;
  const categories = ['Todos', ...new Set(B2B_DATA.products.map(p => p.category))];
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
  if (p.category === PRODUCT_VENUE_CATEGORY && p.venue) {
    const prices = [p.venue.priceWeekday, p.venue.priceSaturday, p.venue.priceSunday, p.venue.priceHoliday].filter(v => v > 0);
    return prices.length ? `A partir de ${formatCurrency(Math.min(...prices))}` : 'Consulte os valores';
  }
  if (p.category === PRODUCT_FOOD_CATEGORY && p.dishes && p.dishes.length) {
    const prices = p.dishes.map(d => d.price).filter(v => v > 0);
    return prices.length ? `A partir de ${formatCurrency(Math.min(...prices))}` : 'Consulte os valores';
  }
  return formatCurrency(p.price);
}

function renderProducts() {
  const grid = document.getElementById('products-grid');
  if (!grid) return;

  const items = activeCategory === 'Todos'
    ? B2B_DATA.products
    : B2B_DATA.products.filter(p => p.category === activeCategory);

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
          : `<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M21 7.5 12 2.25 3 7.5m18 0-9 5.25M21 7.5v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9" /></svg>`}
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
          <button class="btn-secondary text-xs py-2 px-3" data-remove-product="${p.id}" aria-label="Remover">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M6 7h12M9.5 7V5.5A1.5 1.5 0 0 1 11 4h2a1.5 1.5 0 0 1 1.5 1.5V7m2 0-.6 12.1a2 2 0 0 1-2 1.9H8.1a2 2 0 0 1-2-1.9L5.5 7" /></svg>
          </button>
        </div>
      </div>
    </div>
  `).join('');

  grid.querySelectorAll('[data-edit-product]').forEach(btn => {
    btn.addEventListener('click', () => openProductDrawer(btn.dataset.editProduct));
  });

  grid.querySelectorAll('[data-remove-product]').forEach(btn => {
    btn.addEventListener('click', () => {
      B2B_DATA.products = B2B_DATA.products.filter(x => x.id !== btn.dataset.removeProduct);
      renderCategoryTabs();
      renderProducts();
      showToast('Item removido da vitrine.');
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

/* -------------------- Planta do espaço (local) -------------------- */

function renderFloorPlanPicker() {
  const wrap = document.getElementById('product-floorplan-wrap');
  if (!wrap) return;

  const hasImage = !!currentFloorPlan;
  const processing = hasImage && currentFloorPlan.processing;
  const shape = hasImage ? (currentFloorPlan.shape || []) : [];
  const shapeReady = !processing && shape.length > 0;

  const polylines = shape.map(chain => `<polyline points="${chain.map(pt => `${(pt.x * 100).toFixed(2)},${(pt.y * 100).toFixed(2)}`).join(' ')}" />`).join('');

  let statusText = '';
  if (processing) statusText = 'Identificando o contorno da planta…';
  else if (shapeReady) statusText = 'Contorno identificado automaticamente a partir da planta.';
  else if (hasImage) statusText = 'Não foi possível identificar linhas nessa imagem.';

  wrap.innerHTML = `
    <div class="floorplan-upload-row">
      <div class="header-logo-picker-wrap">
        <label class="image-upload-zone floorplan-upload-zone ${hasImage ? 'has-image' : ''}">
          ${hasImage
            ? `<img src="${currentFloorPlan.image}" class="image-upload-zone-preview" alt="">
               <div class="header-logo-picker-overlay">${PI_IMAGE}<span>Alterar planta</span></div>`
            : `<span class="image-upload-zone-plus">${PI_PLUS}</span><span class="image-upload-zone-text">Adicione ou arraste a planta do espaço</span>`}
          <input type="file" accept="image/*" class="image-upload-zone-input" id="product-floorplan-input">
        </label>
        ${hasImage ? `<button type="button" class="header-logo-picker-remove" id="product-floorplan-remove" title="Remover planta">${PI_CLOSE}</button>` : ''}
      </div>
      <div class="floorplan-outline-preview">
        ${processing
          ? `<span class="floorplan-outline-loading">Analisando…</span>`
          : shapeReady
            ? `<svg viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet">${polylines}</svg>`
            : `<span class="floorplan-outline-empty">${hasImage ? 'Nenhum contorno identificado' : 'O contorno aparece aqui'}</span>`}
      </div>
    </div>
    ${statusText ? `<p class="floorplan-status">${statusText}</p>` : ''}
  `;

  const input = document.getElementById('product-floorplan-input');
  if (input) {
    input.addEventListener('change', () => { if (input.files[0]) applyFloorPlanFile(input.files[0]); });
    wireImageDropZone(input.closest('.image-upload-zone'), applyFloorPlanFile);
  }
  const removeBtn = document.getElementById('product-floorplan-remove');
  if (removeBtn) removeBtn.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); currentFloorPlan = null; renderFloorPlanPicker(); });
}

function applyFloorPlanFile(file) {
  readFileAsDataUrl(file, (dataUrl) => {
    currentFloorPlan = { image: dataUrl, shape: [], processing: true };
    renderFloorPlanPicker();

    const img = new Image();
    img.onload = () => {
      setTimeout(() => {
        const shape = extractFloorPlanOutline(img);
        currentFloorPlan = { image: dataUrl, shape, processing: false };
        renderFloorPlanPicker();
      }, 0);
    };
    img.src = dataUrl;
  });
}

function sendFloorPlanToDatabase(productId, floorPlan) {
  // TODO: integrar com o backend quando o endpoint estiver disponível.
  // Endpoint esperado: POST /api/produtos/:id/planta  { image, shape }
  // "shape" é uma lista de contornos; cada contorno é uma lista de pontos {x,y}
  // normalizados (0 a 1) em relação ao tamanho da imagem da planta.
  console.log('[planta] pronto para enviar ao banco de dados:', productId, floorPlan);
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

function updateCategoryFieldsVisibility() {
  const category = document.getElementById('product-category').value;
  const isVenue = category === PRODUCT_VENUE_CATEGORY;
  const isEquipment = category === PRODUCT_EQUIPMENT_CATEGORY;
  const isFood = category === PRODUCT_FOOD_CATEGORY;

  document.getElementById('product-venue-fields').hidden = !isVenue;
  document.getElementById('product-equipment-fields').hidden = !isEquipment;
  document.getElementById('product-dishes-fields').hidden = !isFood;
  document.getElementById('product-price-field').hidden = isVenue || isFood;
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

  const resetDrawerState = () => {
    currentCoverImage = null;
    currentGalleryImages = [];
    currentOpenDays = defaultOpenDays();
    currentDishes = [];
    currentFloorPlan = null;
    renderCoverImagePicker();
    renderGalleryImages();
    renderWeekdayChips();
    renderDishes();
    renderFloorPlanPicker();
    updateCategoryFieldsVisibility();
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

  document.getElementById('product-category').addEventListener('change', updateCategoryFieldsVisibility);

  document.getElementById('product-gallery-add-btn').addEventListener('click', () => {
    currentGalleryImages.push('');
    renderGalleryImages();
  });

  document.getElementById('product-dish-add-btn').addEventListener('click', () => {
    currentDishes.push({ id: 'd' + Date.now() + '-' + Math.round(Math.random() * 999), name: '', price: 0, quantity: 0 });
    renderDishes();
  });

  if (form) {
    form.addEventListener('submit', e => {
      e.preventDefault();
      const name = document.getElementById('product-name').value.trim();
      const category = document.getElementById('product-category').value;
      const description = document.getElementById('product-description').value.trim();
      const active = document.getElementById('product-active').checked;

      const isVenue = category === PRODUCT_VENUE_CATEGORY;
      const isEquipment = category === PRODUCT_EQUIPMENT_CATEGORY;
      const isFood = category === PRODUCT_FOOD_CATEGORY;

      const price = (isVenue || isFood) ? 0 : Number(document.getElementById('product-price').value);

      if (!name || !category || (!isVenue && !isFood && !price)) {
        showToast('Preencha nome, categoria e preço do item.', true);
        return;
      }

      const payload = {
        name, category, price, description, active,
        coverImage: currentCoverImage || null,
        gallery: currentGalleryImages.filter(Boolean),
        venue: null,
        equipmentType: null,
        dishes: []
      };

      if (isVenue) {
        payload.venue = {
          address: document.getElementById('product-venue-address').value.trim(),
          city: document.getElementById('product-venue-city').value.trim(),
          state: document.getElementById('product-venue-state').value.trim(),
          size: document.getElementById('product-venue-size').value.trim(),
          commonAreas: document.getElementById('product-venue-common-areas').value.trim(),
          floorPlan: currentFloorPlan ? { image: currentFloorPlan.image, shape: currentFloorPlan.shape || [] } : null,
          days: { ...currentOpenDays },
          hoursOpen: document.getElementById('product-venue-hours-open').value,
          hoursClose: document.getElementById('product-venue-hours-close').value,
          priceWeekday: Number(document.getElementById('product-venue-price-weekday').value) || 0,
          priceSaturday: Number(document.getElementById('product-venue-price-saturday').value) || 0,
          priceSunday: Number(document.getElementById('product-venue-price-sunday').value) || 0,
          priceHoliday: Number(document.getElementById('product-venue-price-holiday').value) || 0
        };
      }

      if (isEquipment) {
        payload.equipmentType = document.getElementById('product-equipment-type').value.trim();
      }

      if (isFood) {
        payload.dishes = currentDishes.map(d => ({ id: d.id, name: d.name, price: d.price, quantity: d.quantity }));
      }

      if (form.dataset.editId) {
        const item = B2B_DATA.products.find(p => p.id === form.dataset.editId);
        Object.assign(item, payload);
        showToast('Produto atualizado.');
        if (isVenue && payload.venue.floorPlan && payload.venue.floorPlan.shape.length) {
          sendFloorPlanToDatabase(item.id, payload.venue.floorPlan);
        }
      } else {
        const newId = 'p' + Date.now();
        B2B_DATA.products.unshift(Object.assign({ id: newId }, payload));
        showToast('Produto adicionado à vitrine.');
        if (isVenue && payload.venue.floorPlan && payload.venue.floorPlan.shape.length) {
          sendFloorPlanToDatabase(newId, payload.venue.floorPlan);
        }
      }
      renderCategoryTabs();
      renderProducts();
      close();
    });
  }
}

function openProductDrawer(id) {
  const p = B2B_DATA.products.find(x => x.id === id);
  if (!p) return;
  document.getElementById('product-drawer-title').textContent = 'Editar produto ou serviço';
  document.getElementById('product-name').value = p.name;
  document.getElementById('product-category').value = p.category;
  document.getElementById('product-price').value = p.price || '';
  document.getElementById('product-description').value = p.description || '';
  document.getElementById('product-active').checked = p.active;

  currentCoverImage = p.coverImage || null;
  currentGalleryImages = (p.gallery || []).slice();
  currentOpenDays = (p.venue && p.venue.days) ? { ...p.venue.days } : defaultOpenDays();
  currentDishes = (p.dishes || []).map(d => ({ ...d }));
  currentFloorPlan = (p.venue && p.venue.floorPlan) ? { image: p.venue.floorPlan.image, shape: p.venue.floorPlan.shape || [], processing: false } : null;

  document.getElementById('product-venue-address').value = (p.venue && p.venue.address) || '';
  document.getElementById('product-venue-city').value = (p.venue && p.venue.city) || '';
  document.getElementById('product-venue-state').value = (p.venue && p.venue.state) || '';
  document.getElementById('product-venue-size').value = (p.venue && p.venue.size) || '';
  document.getElementById('product-venue-common-areas').value = (p.venue && p.venue.commonAreas) || '';
  document.getElementById('product-venue-hours-open').value = (p.venue && p.venue.hoursOpen) || '';
  document.getElementById('product-venue-hours-close').value = (p.venue && p.venue.hoursClose) || '';
  document.getElementById('product-venue-price-weekday').value = (p.venue && p.venue.priceWeekday) || '';
  document.getElementById('product-venue-price-saturday').value = (p.venue && p.venue.priceSaturday) || '';
  document.getElementById('product-venue-price-sunday').value = (p.venue && p.venue.priceSunday) || '';
  document.getElementById('product-venue-price-holiday').value = (p.venue && p.venue.priceHoliday) || '';
  document.getElementById('product-equipment-type').value = p.equipmentType || '';

  renderCoverImagePicker();
  renderGalleryImages();
  renderWeekdayChips();
  renderDishes();
  renderFloorPlanPicker();
  updateCategoryFieldsVisibility();

  const form = document.getElementById('product-form');
  form.dataset.editId = p.id;
  document.getElementById('product-drawer').classList.add('show');
  document.getElementById('product-drawer-backdrop').classList.add('show');
}
