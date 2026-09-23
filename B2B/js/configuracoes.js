/* ==========================================================================
   LOVE B2B — Editar perfil (Perfil da empresa + Preferências da conta)
   ========================================================================== */

const PROFILE_LOGO_PLUS_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15"/></svg>';
const PROFILE_LOGO_IMAGE_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="8.5" cy="9.5" r="1.5"/><path stroke-linecap="round" stroke-linejoin="round" d="m5 18 5-5 3 3 4-5 4 5"/></svg>';
const PROFILE_LOGO_CLOSE_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12"/></svg>';
const PROFILE_LOGO_ASPECT_RATIO = 8 / 5;
const PROFILE_STORAGE_KEY = 'b2b-professional-profile';

document.addEventListener('DOMContentLoaded', async () => {
  await window.b2bAuthReady;
  initSettingsTabs();
  initProfileForm();
  initPasswordForm();
  initSecurityRows();
  initSubscriptionModal();
  initBankDetailsForm();
  initAccordionCards();
});

/* -------------------- Acordeão (Segurança / Dados bancários) -------------------- */

function initAccordionCards() {
  document.querySelectorAll('[data-accordion-card]').forEach(card => {
    const toggle = card.querySelector('[data-accordion-toggle]');
    if (!toggle) return;
    toggle.addEventListener('click', () => card.classList.toggle('is-open'));
  });
}

/* -------------------- Abas Perfil / Preferências -------------------- */

function initSettingsTabs() {
  const wrap = document.getElementById('settings-tabs');
  if (!wrap) return;
  wrap.querySelectorAll('[data-settings-tab]').forEach(btn => {
    btn.addEventListener('click', () => {
      wrap.querySelectorAll('[data-settings-tab]').forEach(b => b.classList.toggle('active', b === btn));
      document.querySelectorAll('[data-settings-panel]').forEach(panel => {
        panel.style.display = panel.dataset.settingsPanel === btn.dataset.settingsTab ? '' : 'none';
      });
      const saveBtn = document.getElementById('profile-save-top-btn');
      if (saveBtn) saveBtn.hidden = btn.dataset.settingsTab !== 'perfil';
    });
  });
}

/* -------------------- Perfil da empresa -------------------- */

function initProfileForm() {
  const p = B2B_DATA.professional;

  document.getElementById('profile-company').value = p.company || '';
  document.getElementById('profile-name').value = p.name || '';
  const birthdatePicker = initDatePicker(document.getElementById('profile-birthdate'), p.birthDate || '');
  document.getElementById('profile-phone').value = p.phone || '';
  document.getElementById('profile-address').value = p.address || '';
  document.getElementById('profile-description').value = p.description || '';

  wirePhoneMaskInput(document.getElementById('profile-phone'));

  setProfileDocType(p.documentType || 'cnpj');
  renderProfileLogoPicker();
  initStateCityFields(p);

  document.getElementById('profile-doc-type-toggle').querySelectorAll('[data-doc-type]').forEach(btn => {
    btn.addEventListener('click', () => setProfileDocType(btn.dataset.docType));
  });

  document.getElementById('profile-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const company = document.getElementById('profile-company').value.trim();
    const name = document.getElementById('profile-name').value.trim();
    const phone = document.getElementById('profile-phone').value.trim();
    const documentNumber = document.getElementById('profile-document').value.trim();
    const docLabel = p.documentType === 'cpf' ? 'CPF' : 'CNPJ';

    if (!company || !name || !phone || !documentNumber) {
      showToast(`Preencha nome da empresa, nome do responsável, número de celular e ${docLabel} para continuar.`, true);
      return;
    }

    p.company = company;
    p.name = name;
    p.birthDate = birthdatePicker.getValue();
    p.phone = phone;
    p.address = document.getElementById('profile-address').value.trim();
    p.city = document.getElementById('profile-city').value.trim();
    p.state = document.getElementById('profile-state').value;
    p.description = document.getElementById('profile-description').value.trim();
    p.documentNumber = documentNumber;
    localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(p));
    showToast('Perfil atualizado.');
  });
}

function setProfileDocType(type) {
  const toggle = document.getElementById('profile-doc-type-toggle');
  toggle.querySelectorAll('[data-doc-type]').forEach(btn => btn.classList.toggle('active', btn.dataset.docType === type));

  const label = document.getElementById('profile-document-label');
  const input = document.getElementById('profile-document');
  if (type === 'cpf') {
    label.textContent = 'CPF';
    input.placeholder = '000.000.000-00';
  } else {
    label.textContent = 'CNPJ';
    input.placeholder = '00.000.000/0000-00';
  }
  B2B_DATA.professional.documentType = type;
}

function initStateCityFields(p) {
  const stateSelect = document.getElementById('profile-state');
  const cityInput = document.getElementById('profile-city');
  const cityOptions = document.getElementById('profile-city-options');
  if (!stateSelect || !cityInput || !cityOptions) return;

  stateSelect.innerHTML = BRAZIL_STATES.map(s => `<option value="${s.uf}" title="${s.name}">${s.uf}</option>`).join('');
  stateSelect.value = p.state || 'SP';
  cityInput.value = p.city || '';

  const refreshCityOptions = () => {
    cityOptions.innerHTML = citiesForState(stateSelect.value).map(c => `<option value="${c}"></option>`).join('');
  };
  refreshCityOptions();
  stateSelect.addEventListener('change', refreshCityOptions);
}

function renderProfileLogoPicker() {
  const p = B2B_DATA.professional;
  const logo = p.logo || null;
  const wrap = document.getElementById('profile-logo-wrap');
  if (!wrap) return;
  const cropStyle = `--logo-scale:${p.logoScale || 1};--logo-x:${p.logoOffsetX || 0}%;--logo-y:${p.logoOffsetY || 0}%;`;
  wrap.innerHTML = `
    <div class="header-logo-picker-wrap" style="max-width:220px;">
      <label class="profile-logo-picker ${logo ? 'has-image' : ''}">
        ${logo
          ? `<img src="${logo}" class="logo-crop-img" alt="" style="${cropStyle}">
             <div class="header-logo-picker-overlay">${PROFILE_LOGO_IMAGE_ICON}<span>Alterar logotipo</span></div>`
          : `<span class="image-upload-zone-plus">${PROFILE_LOGO_PLUS_ICON}</span><span class="image-upload-zone-text">Adicione ou arraste o logotipo</span>`}
        <input type="file" accept="image/*" class="image-upload-zone-input" id="profile-logo-input">
      </label>
      ${logo ? `<button type="button" class="header-logo-picker-remove" id="profile-logo-remove" title="Remover logotipo">${PROFILE_LOGO_CLOSE_ICON}</button>` : ''}
    </div>
  `;

  const input = document.getElementById('profile-logo-input');
  const applyFile = (file) => readFileAsDataUrl(file, (dataUrl) => {
    const img = new Image();
    img.onload = () => {
      let scale = 1, offsetX = 0, offsetY = 0;
      const bbox = detectImageContentBBox(img);
      if (bbox) {
        const auto = computeAutoFillCrop(bbox, PROFILE_LOGO_ASPECT_RATIO);
        if (auto) { scale = auto.scale; offsetX = auto.offsetX; offsetY = auto.offsetY; }
      }
      p.logo = dataUrl;
      p.logoScale = scale;
      p.logoOffsetX = offsetX;
      p.logoOffsetY = offsetY;
      renderProfileLogoPicker();
      openProfileLogoAdjustModal();
    };
    img.src = dataUrl;
  });
  if (input) {
    input.addEventListener('change', () => { if (input.files[0]) applyFile(input.files[0]); });
    wireImageDropZone(input.closest('.profile-logo-picker'), applyFile);
  }
  const removeBtn = document.getElementById('profile-logo-remove');
  if (removeBtn) removeBtn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    p.logo = null;
    p.logoScale = 1;
    p.logoOffsetX = 0;
    p.logoOffsetY = 0;
    renderProfileLogoPicker();
  });
}

/* -------------------- Modal: ajustar logotipo -------------------- */

function openProfileLogoAdjustModal() {
  const modal = document.getElementById('profile-logo-adjust-modal');
  if (!modal) return;
  wireProfileLogoAdjustModalOnce();
  const img = modal.querySelector('[data-profile-logo-adjust-img]');
  img.src = B2B_DATA.professional.logo;
  updateProfileLogoAdjustTransform();
  modal.classList.add('show');
}

function closeProfileLogoAdjustModal() {
  const modal = document.getElementById('profile-logo-adjust-modal');
  if (modal) modal.classList.remove('show');
  renderProfileLogoPicker();
}

function updateProfileLogoAdjustTransform() {
  const modal = document.getElementById('profile-logo-adjust-modal');
  if (!modal) return;
  const p = B2B_DATA.professional;
  const img = modal.querySelector('[data-profile-logo-adjust-img]');
  if (img) img.style.transform = `scale(${p.logoScale || 1}) translate(${p.logoOffsetX || 0}%, ${p.logoOffsetY || 0}%)`;
  const rangeInput = modal.querySelector('[data-profile-logo-adjust-range]');
  if (rangeInput) rangeInput.value = p.logoScale || 1;
}

function wireProfileLogoAdjustModalOnce() {
  const modal = document.getElementById('profile-logo-adjust-modal');
  if (!modal || modal.dataset.wired) return;
  modal.dataset.wired = '1';

  modal.addEventListener('click', (e) => { if (e.target === modal) closeProfileLogoAdjustModal(); });
  const closeBtn = modal.querySelector('[data-profile-logo-adjust-close]');
  if (closeBtn) closeBtn.addEventListener('click', closeProfileLogoAdjustModal);
  const doneBtn = modal.querySelector('[data-profile-logo-adjust-done]');
  if (doneBtn) doneBtn.addEventListener('click', closeProfileLogoAdjustModal);

  const rangeInput = modal.querySelector('[data-profile-logo-adjust-range]');
  if (rangeInput) {
    rangeInput.addEventListener('input', () => {
      B2B_DATA.professional.logoScale = parseFloat(rangeInput.value);
      updateProfileLogoAdjustTransform();
    });
  }

  const zoomMinus = modal.querySelector('[data-profile-logo-adjust-zoom-minus]');
  if (zoomMinus) {
    zoomMinus.addEventListener('click', () => {
      const p = B2B_DATA.professional;
      p.logoScale = Math.max(1, +(((p.logoScale || 1) - 0.05).toFixed(2)));
      updateProfileLogoAdjustTransform();
    });
  }
  const zoomPlus = modal.querySelector('[data-profile-logo-adjust-zoom-plus]');
  if (zoomPlus) {
    zoomPlus.addEventListener('click', () => {
      const p = B2B_DATA.professional;
      p.logoScale = Math.min(8, +(((p.logoScale || 1) + 0.05).toFixed(2)));
      updateProfileLogoAdjustTransform();
    });
  }

  const frame = modal.querySelector('[data-profile-logo-adjust-frame]');
  if (frame) {
    let dragging = false;
    let dragStartX = 0, dragStartY = 0, startX = 0, startY = 0;
    frame.addEventListener('pointerdown', (e) => {
      dragging = true;
      dragStartX = e.clientX;
      dragStartY = e.clientY;
      const p = B2B_DATA.professional;
      startX = p.logoOffsetX || 0;
      startY = p.logoOffsetY || 0;
      frame.setPointerCapture(e.pointerId);
      frame.classList.add('is-dragging');
    });
    frame.addEventListener('pointermove', (e) => {
      if (!dragging) return;
      const rect = frame.getBoundingClientRect();
      const dxPct = ((e.clientX - dragStartX) / rect.width) * 100;
      const dyPct = ((e.clientY - dragStartY) / rect.height) * 100;
      const p = B2B_DATA.professional;
      p.logoOffsetX = Math.max(-50, Math.min(50, startX + dxPct));
      p.logoOffsetY = Math.max(-50, Math.min(50, startY + dyPct));
      updateProfileLogoAdjustTransform();
    });
    const endDrag = () => { dragging = false; frame.classList.remove('is-dragging'); };
    frame.addEventListener('pointerup', endDrag);
    frame.addEventListener('pointercancel', endDrag);
  }
}

/* -------------------- Senha -------------------- */

function initPasswordForm() {
  document.getElementById('password-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const current = document.getElementById('password-current').value;
    const next = document.getElementById('password-new').value;
    const confirm = document.getElementById('password-confirm').value;

    if (!current || !next || !confirm) {
      showToast('Preencha todos os campos de senha.', true);
      return;
    }
    if (next !== confirm) {
      showToast('A confirmação não coincide com a nova senha.', true);
      return;
    }
    if (next.length < 6) {
      showToast('A nova senha precisa ter pelo menos 6 caracteres.', true);
      return;
    }

    e.target.reset();
    showToast('Senha atualizada.');
  });
}

/* -------------------- Segurança: 2FA e selfie -------------------- */

function initSecurityRows() {
  const p = B2B_DATA.professional;

  const twoFaToggle = document.getElementById('profile-2fa-toggle');
  twoFaToggle.checked = !!p.twoFactorEnabled;
  twoFaToggle.addEventListener('change', () => {
    p.twoFactorEnabled = twoFaToggle.checked;
    showToast(twoFaToggle.checked ? 'Autenticação de dois fatores ativada.' : 'Autenticação de dois fatores desativada.');
  });

  renderSelfieStatus();
  document.getElementById('profile-selfie-btn').addEventListener('click', () => {
    document.getElementById('profile-selfie-input').click();
  });
  document.getElementById('profile-selfie-input').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    p.selfieVerified = true;
    renderSelfieStatus();
    showToast('Selfie enviada. Identidade verificada.');
  });
}

/* -------------------- Dados bancários (chave Pix) -------------------- */

function updatePixKeyFieldForType(type) {
  const label = document.getElementById('profile-pix-key-label');
  const input = document.getElementById('profile-pix-key');
  const info = PIX_KEY_TYPES[type] || PIX_KEY_TYPES.cpf;
  label.textContent = `Chave Pix (${info.label})`;
  input.placeholder = info.placeholder;
}

function initBankDetailsForm() {
  const p = B2B_DATA.professional;
  const typeSelect = document.getElementById('profile-pix-type');
  const keyInput = document.getElementById('profile-pix-key');
  if (!typeSelect || !keyInput) return;

  typeSelect.value = p.pixKeyType || 'cpf';
  keyInput.value = p.pixKey || '';
  updatePixKeyFieldForType(typeSelect.value);

  typeSelect.addEventListener('change', () => updatePixKeyFieldForType(typeSelect.value));

  document.getElementById('bank-details-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const key = keyInput.value.trim();
    if (!key) {
      showToast('Preencha sua chave Pix para continuar.', true);
      return;
    }
    p.pixKeyType = typeSelect.value;
    p.pixKey = key;
    localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(p));
    showToast('Dados bancários salvos.');
  });
}

function renderSelfieStatus() {
  const verified = !!B2B_DATA.professional.selfieVerified;
  document.getElementById('profile-selfie-btn').hidden = verified;
  document.getElementById('profile-selfie-badge').hidden = !verified;
  setText('profile-selfie-desc', verified
    ? 'Sua identidade já foi verificada.'
    : 'Confirme sua identidade para aumentar a confiança dos seus clientes.');
}

/* -------------------- Assinatura -------------------- */

function endOfMonthLabel() {
  const now = new Date();
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return end.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' });
}

function initSubscriptionModal() {
  setText('profile-plan-desc', `Plano atual: ${B2B_DATA.professional.plan}`);

  const modal = document.getElementById('subscription-modal');
  const openBtn = document.getElementById('subscription-open-btn');
  const closeBtn = document.getElementById('subscription-close-btn');

  const open = () => { renderSubscriptionModal(); modal.classList.add('show'); };
  const close = () => modal.classList.remove('show');

  openBtn.addEventListener('click', open);
  closeBtn.addEventListener('click', close);
  modal.addEventListener('click', (e) => { if (e.target === modal) close(); });
}

function renderSubscriptionModal() {
  const body = document.getElementById('subscription-modal-body');
  const pro = isProPlan();

  if (!pro) {
    body.innerHTML = `
      <p class="text-sm text-zinc-600 mb-5">Você está no plano gratuito. Faça upgrade para liberar relatórios financeiros completos, CRM avançado e colaboradores ilimitados.</p>
      <a href="planos.html" class="btn-primary w-full justify-center">Fazer upgrade</a>
    `;
    return;
  }

  body.innerHTML = `
    <p class="text-sm text-zinc-600 mb-1">Você está no plano <strong>Pro</strong>.</p>
    <p class="text-xs text-zinc-500 mb-5">Próxima cobrança em ${endOfMonthLabel()}.</p>
    <div class="flex gap-3">
      <button type="button" class="btn-secondary flex-1 justify-center" id="subscription-cancel-btn">Cancelar</button>
      <button type="button" class="btn-primary flex-1 justify-center" style="background:#18181B; box-shadow:none;" id="subscription-exit-btn">Sair</button>
    </div>
  `;

  document.getElementById('subscription-cancel-btn').addEventListener('click', renderSubscriptionCancelConfirm);
  document.getElementById('subscription-exit-btn').addEventListener('click', () => {
    document.getElementById('subscription-modal').classList.remove('show');
  });
}

function renderSubscriptionCancelConfirm() {
  const body = document.getElementById('subscription-modal-body');
  body.innerHTML = `
    <p class="text-sm font-semibold text-zinc-900 mb-2">Tem certeza que deseja cancelar sua assinatura?</p>
    <p class="text-sm text-zinc-600 mb-5">Você pode continuar usando os recursos Pro até <strong>${endOfMonthLabel()}</strong>. Depois disso, sua conta volta para o plano gratuito.</p>
    <div class="flex gap-3">
      <button type="button" class="btn-secondary flex-1 justify-center" id="subscription-cancel-back-btn">Voltar</button>
      <button type="button" class="btn-primary flex-1 justify-center" style="background:#B91C1C; box-shadow:none;" id="subscription-cancel-confirm-btn">Confirmar cancelamento</button>
    </div>
  `;

  document.getElementById('subscription-cancel-back-btn').addEventListener('click', renderSubscriptionModal);
  document.getElementById('subscription-cancel-confirm-btn').addEventListener('click', () => {
    localStorage.setItem('b2b-plan', 'Gratuito');
    B2B_DATA.professional.plan = 'Gratuito';
    if (typeof renderUpgradeCard === 'function') renderUpgradeCard();
    setText('profile-plan-desc', 'Plano atual: Gratuito');
    document.getElementById('subscription-modal').classList.remove('show');
    showToast(`Assinatura cancelada. Você pode continuar usando o Pro até ${endOfMonthLabel()}.`);
  });
}
