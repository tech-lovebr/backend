/* ==========================================================================
   LOVE B2B — Planos e recursos
   Mock local (sem backend): grava o plano escolhido no localStorage.
   ========================================================================== */

function renderPlanButtons() {
  const pro = typeof B2B_DATA !== 'undefined' && B2B_DATA.professional.plan === 'Pro';
  const freeBtn = document.getElementById('plan-cta-free');
  const proBtn = document.getElementById('plan-cta-pro');
  if (!freeBtn || !proBtn) return;

  freeBtn.disabled = !pro;
  freeBtn.textContent = pro ? 'Fazer downgrade' : 'Seu plano atual';

  proBtn.disabled = pro;
  proBtn.textContent = pro ? 'Seu plano atual' : 'Fazer upgrade';
}

function setPlan(planName, message) {
  localStorage.setItem('b2b-plan', planName);
  if (typeof B2B_DATA !== 'undefined') B2B_DATA.professional.plan = planName;
  renderPlanButtons();
  renderUpgradeCard();
  setText('upgrade-current-plan', planName);
  showToast(message);
}

function initPlanosPage() {
  renderPlanButtons();

  document.getElementById('plan-cta-pro')?.addEventListener('click', e => {
    if (e.currentTarget.disabled) return;
    setPlan('Pro', 'Upgrade realizado! Bem-vindo ao plano Pro.');
  });

  document.getElementById('plan-cta-free')?.addEventListener('click', e => {
    if (e.currentTarget.disabled) return;
    setPlan('Gratuito', 'Você voltou para o plano Gratuito.');
  });

  const billingOptions = document.querySelectorAll('.plan-billing-option');
  const proPrice = document.getElementById('plan-price-pro');
  billingOptions.forEach(btn => {
    btn.addEventListener('click', () => {
      billingOptions.forEach(b => b.classList.toggle('active', b === btn));
      if (proPrice) {
        const value = btn.dataset.cycle === 'annual' ? proPrice.dataset.annual : proPrice.dataset.monthly;
        proPrice.textContent = `R$ ${value}`;
      }
    });
  });
}

document.addEventListener('shell:ready', initPlanosPage);
