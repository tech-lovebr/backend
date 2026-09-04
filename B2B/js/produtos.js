/* ==========================================================================
   LOVE B2B — Produtos & Serviços (catálogo do fornecedor)
   ========================================================================== */

let activeCategory = 'Todos';

document.addEventListener('DOMContentLoaded', () => {
  renderCategoryTabs();
  renderProducts();
  initProductModal();
});

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
      <div class="product-thumb">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M21 7.5 12 2.25 3 7.5m18 0-9 5.25M21 7.5v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9" /></svg>
      </div>
      <div class="p-4 flex flex-col gap-2 flex-1">
        <div class="flex items-start justify-between gap-2">
          <p class="text-sm font-semibold text-zinc-900 leading-snug">${p.name}</p>
          <span class="status-badge ${p.active ? 'status-ativo' : 'status-inativo'}">${p.active ? 'Ativo' : 'Inativo'}</span>
        </div>
        <p class="text-xs text-zinc-500">${p.category}</p>
        <p class="text-base font-bold text-zinc-900 mt-auto">${formatCurrency(p.price)}</p>
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
    btn.addEventListener('click', () => openProductModal(btn.dataset.editProduct));
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

function initProductModal() {
  const addBtn = document.getElementById('product-add-btn');
  const modal = document.getElementById('product-modal');
  const closeBtn = document.getElementById('product-modal-close');
  const cancelBtn = document.getElementById('product-modal-cancel');
  const form = document.getElementById('product-form');

  const open = () => modal.classList.add('show');
  const close = () => { modal.classList.remove('show'); form.reset(); delete form.dataset.editId; };

  if (addBtn) addBtn.addEventListener('click', () => {
    document.getElementById('product-modal-title').textContent = 'Adicionar produto ou serviço';
    open();
  });
  if (closeBtn) closeBtn.addEventListener('click', close);
  if (cancelBtn) cancelBtn.addEventListener('click', close);
  if (modal) modal.addEventListener('click', e => { if (e.target === modal) close(); });

  if (form) {
    form.addEventListener('submit', e => {
      e.preventDefault();
      const name = document.getElementById('product-name').value.trim();
      const category = document.getElementById('product-category').value;
      const price = Number(document.getElementById('product-price').value);
      const active = document.getElementById('product-active').checked;
      if (!name || !category || !price) {
        showToast('Preencha nome, categoria e preço do item.', true);
        return;
      }

      if (form.dataset.editId) {
        const item = B2B_DATA.products.find(p => p.id === form.dataset.editId);
        Object.assign(item, { name, category, price, active });
        showToast('Produto atualizado.');
      } else {
        B2B_DATA.products.unshift({ id: 'p' + Date.now(), name, category, price, active });
        showToast('Produto adicionado à vitrine.');
      }
      renderCategoryTabs();
      renderProducts();
      close();
    });
  }
}

function openProductModal(id) {
  const p = B2B_DATA.products.find(x => x.id === id);
  if (!p) return;
  document.getElementById('product-modal-title').textContent = 'Editar produto ou serviço';
  document.getElementById('product-name').value = p.name;
  document.getElementById('product-category').value = p.category;
  document.getElementById('product-price').value = p.price;
  document.getElementById('product-active').checked = p.active;
  const form = document.getElementById('product-form');
  form.dataset.editId = p.id;
  document.getElementById('product-modal').classList.add('show');
}
