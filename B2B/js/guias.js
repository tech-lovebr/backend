/* ==========================================================================
   LOVE B2B — Guias de início (FAQ em acordeão por guia, mesmo padrão de Ajuda)
   ========================================================================== */

function initGuiasPage() {
  const buttons = document.querySelectorAll('#guias-nav .guide-link');
  const panels = document.querySelectorAll('[data-guide-panel]');
  const titleEl = document.getElementById('guias-faq-title');
  if (!buttons.length || !panels.length) return;

  buttons.forEach(btn => {
    btn.addEventListener('click', () => {
      const guide = btn.dataset.guide;
      buttons.forEach(b => b.classList.toggle('guide-link--active', b === btn));
      panels.forEach(p => {
        p.style.display = p.dataset.guidePanel === guide ? '' : 'none';
      });
      if (titleEl) titleEl.textContent = btn.textContent;
    });
  });
}

document.addEventListener('shell:ready', initGuiasPage);
