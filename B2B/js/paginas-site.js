/* ==========================================================================
   LOVE B2B — Páginas do Site (URL personalizada + personalização da vitrine)
   Somente front-end. Sem integração com backend ainda.
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
  initSlugField();
  initColorSwatches();
  initCoverUpload();
  initSaveButtons();
});

function initSlugField() {
  const slugInput = document.getElementById('site-slug');
  const saveBtn = document.getElementById('site-url-save');
  if (!slugInput || !saveBtn) return;

  slugInput.addEventListener('input', () => {
    slugInput.value = slugInput.value
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '');
  });

  saveBtn.addEventListener('click', () => {
    if (!slugInput.value.trim()) {
      showToast('Escolha uma URL antes de salvar.', true);
      return;
    }
    showToast('Endereço do site atualizado!');
  });
}

function initColorSwatches() {
  const wrap = document.getElementById('brand-color-swatches');
  if (!wrap) return;

  wrap.querySelectorAll('.color-swatch').forEach(btn => {
    btn.addEventListener('click', () => {
      wrap.querySelectorAll('.color-swatch').forEach(b => b.classList.toggle('active', b === btn));
    });
  });
}

function initCoverUpload() {
  const btn = document.getElementById('cover-upload-btn');
  if (!btn) return;
  btn.addEventListener('click', () => {
    showToast('Upload de imagens chega em breve por aqui.');
  });
}

function initSaveButtons() {
  const saveAllBtn = document.getElementById('site-save-all');
  if (!saveAllBtn) return;
  saveAllBtn.addEventListener('click', () => {
    showToast('Personalização salva com sucesso!');
  });
}
