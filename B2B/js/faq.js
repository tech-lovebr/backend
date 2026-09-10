/* ==========================================================================
   LOVE B2B — Ajuda (FAQ por categoria, no mesmo padrão de Guias de início)
   ========================================================================== */

function initFaqPage() {
  const buttons = document.querySelectorAll('#faq-categories .guide-link');
  const panels = document.querySelectorAll('[data-category-panel]');
  const titleEl = document.getElementById('faq-category-title');
  if (!buttons.length || !panels.length) return;

  buttons.forEach(btn => {
    btn.addEventListener('click', () => {
      const category = btn.dataset.category;
      buttons.forEach(b => b.classList.toggle('guide-link--active', b === btn));
      panels.forEach(p => {
        p.style.display = p.dataset.categoryPanel === category ? '' : 'none';
      });
      if (titleEl) titleEl.textContent = btn.textContent;
    });
  });
}

document.addEventListener('shell:ready', initFaqPage);
