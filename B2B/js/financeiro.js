/* ==========================================================================
   LOVE B2B — Orçamentos (tela de apresentação Pro no primeiro acesso)
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
  initOrcamentosIntro();
});

function initOrcamentosIntro() {
  const intro = document.getElementById('orcamentos-intro');
  const content = document.getElementById('orcamentos-content');
  const actions = document.getElementById('orcamentos-intro-actions');
  if (!intro || !content || !actions) return;

  const alreadySeen = localStorage.getItem('b2b-orcamentos-intro-seen') === '1';

  if (alreadySeen) {
    showOrcamentosContent();
    return;
  }

  if (isProPlan()) {
    actions.innerHTML = `<button type="button" class="btn-primary" id="orcamentos-continue-btn">Continuar</button>`;
    document.getElementById('orcamentos-continue-btn').addEventListener('click', () => {
      markIntroSeen();
      showOrcamentosContent();
    });
  } else {
    actions.innerHTML = `
      <button type="button" class="btn-primary" id="orcamentos-trial-btn">Iniciar avaliação de 5 dias</button>
      <p class="orcamentos-intro-hint">Sem precisar de cartão de crédito</p>
      <button type="button" class="btn-secondary" id="orcamentos-free-btn">Continuar grátis</button>
    `;

    document.getElementById('orcamentos-trial-btn').addEventListener('click', () => {
      markIntroSeen();
      localStorage.setItem('b2b-plan', 'Pro');
      showProWelcomeModal();
    });

    document.getElementById('orcamentos-free-btn').addEventListener('click', () => {
      markIntroSeen();
      showOrcamentosContent();
    });
  }
}

function markIntroSeen() {
  localStorage.setItem('b2b-orcamentos-intro-seen', '1');
}

function showOrcamentosContent() {
  document.getElementById('orcamentos-intro').style.display = 'none';
  document.getElementById('orcamentos-content').style.display = '';
}

function showProWelcomeModal() {
  const modal = document.getElementById('orcamentos-pro-modal');
  const closeBtn = document.getElementById('orcamentos-pro-modal-close');
  if (!modal || !closeBtn) { showOrcamentosContent(); return; }

  modal.classList.add('show');
  closeBtn.addEventListener('click', () => {
    modal.classList.remove('show');
    showOrcamentosContent();
  }, { once: true });
}
