/* ==========================================================================
   LOVE B2B — Central de ajuda (FAQ por categoria, no mesmo padrão de Guias de início)
   ========================================================================== */

function initFaqPage() {
  const buttons = document.querySelectorAll('#faq-categories button.guide-link');
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

  // Link direto para uma categoria: central-de-ajuda?categoria=privacidade
  const pedida = new URLSearchParams(location.search).get('categoria');
  const alvo = pedida && document.querySelector(`#faq-categories [data-category="${pedida}"]`);
  if (alvo) alvo.click();
}

// Avisa o shell que a página está pronta (sem isso a tela de carregamento
// só some no limite de 4 segundos).
document.addEventListener('shell:ready', () => {
  initFaqPage();
  window.b2bPageReady?.();
});
