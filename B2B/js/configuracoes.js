/* ==========================================================================
   LOVE B2B — Editar perfil (Perfil da empresa + Preferências da conta)
   ========================================================================== */

const PROFILE_LOGO_PLUS_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15"/></svg>';
const PROFILE_LOGO_IMAGE_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="8.5" cy="9.5" r="1.5"/><path stroke-linecap="round" stroke-linejoin="round" d="m5 18 5-5 3 3 4-5 4 5"/></svg>';
const PROFILE_LOGO_CLOSE_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12"/></svg>';
const PROFILE_LOGO_ASPECT_RATIO = 8 / 5;
const PROFILE_AVATAR_ASPECT_RATIO = 1;
const PROFILE_STORAGE_KEY = 'b2b-professional-profile';

// Posições do slider de raio de atendimento → km reais. 0 = "qualquer distância"
// (sentinela, não um raio de 0km) — ver comentário da coluna no banco.
const RADIUS_STEPS = [50, 100, 150, 200, 250, 300, 0];
function radiusLabelFor(km) { return km === 0 ? 'Qualquer distância' : `${km} km`; }

document.addEventListener('DOMContentLoaded', async () => {
  await window.b2bAuthReady;
  initSettingsTabs();
  await carregarLiberacoes();
  initProfileForm();
  initCompanyForm();
  initPasswordForm();
  initSecurityRows();
  initSubscriptionModal();
  initBankDetailsForm();
  initAccordionCards();
  initRequestChangeLinks();
  window.b2bPageReady?.();
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
      // Mesmo botão "Salvar alterações" pra Perfil e Minha Empresa — só
      // muda qual formulário ele envia. Preferências salva sozinha.
      const saveBtn = document.getElementById('profile-save-top-btn');
      if (saveBtn) {
        const tab = btn.dataset.settingsTab;
        saveBtn.hidden = tab === 'preferencias';
        saveBtn.setAttribute('form', tab === 'empresa' ? 'company-form' : 'profile-form');
      }
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
  document.getElementById('profile-document').value = p.documentNumber || '';

  wirePhoneMaskInput(document.getElementById('profile-phone'));
  wireDocumentMaskInput(document.getElementById('profile-document'), () => B2B_DATA.professional.documentType || 'cnpj');

  setProfileDocType(p.documentType || 'cnpj');
  renderProfileAvatarPicker();
  renderProfileLogoPicker();
  initStateCityFields(p);
  lockConfiguredFields(p);

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
    salvarPerfilNoBanco(p);

    // Liberação concedida pelo Admin vale uma edição: gastou, trava de novo.
    consumirLiberacoes(['company', 'documento']).then(() => lockConfiguredFields(p));

    lockConfiguredFields(p);
    showToast('Perfil atualizado.');
  });
}

/* O perfil também vai para o banco, não só para o localStorage. Sem isto,
   CNPJ, telefone e endereço existiam apenas no navegador de quem preencheu:
   sumiam ao trocar de máquina e nunca chegavam ao Admin, que mostrava "—"
   mesmo com os campos preenchidos aqui. */
async function salvarPerfilNoBanco(p) {
  const session = window.b2bSession || (await supabaseClient.auth.getSession()).data.session;
  if (!session) return;

  const { error } = await supabaseClient
    .from('fornecedores')
    .update({
      company_name: p.company || null,
      contact_name: p.name || null,
      document_type: p.documentType || 'cnpj',
      cnpj: p.documentNumber || null,
      phone: p.phone || null,
      address: p.address || null,
      city: p.city || null,
      state: p.state || null,
      description: p.description || null
    })
    .eq('id', session.user.id);

  // Falhar aqui não pode travar o fluxo: o perfil local já foi salvo.
  if (error) console.error('Não foi possível sincronizar o perfil com o banco.', error);
}

// Nome da empresa e documento (CNPJ/CPF) travam para edição assim que
// configurados pela primeira vez — evita que o fornecedor mude a
// identidade da conta depois que ela já está em uso na plataforma.
/* Liberações concedidas pelo Admin (tabela campos_liberados). Enquanto houver
   uma liberação não usada para o campo, ele não trava — é assim que a decisão
   tomada no Admin atravessa para cá. A liberação vale uma edição: ao salvar,
   marcamos como usada e o campo trava de novo. */
let LIBERACOES = [];

async function carregarLiberacoes() {
  const session = window.b2bSession || (await supabaseClient.auth.getSession()).data.session;
  if (!session) return;

  const { data, error } = await supabaseClient
    .from('campos_liberados')
    .select('id, campo')
    .eq('fornecedor_id', session.user.id)
    .is('usado_em', null);

  if (error) {
    console.warn('Não foi possível ler as liberações de cadastro.', error);
    return;
  }

  LIBERACOES = data || [];
}

function liberado(campo) {
  return LIBERACOES.some(l => l.campo === campo);
}

/** Consome as liberações usadas: o campo volta a travar na próxima visita. */
async function consumirLiberacoes(campos) {
  const usar = LIBERACOES.filter(l => campos.includes(l.campo));
  if (!usar.length) return;

  await supabaseClient
    .from('campos_liberados')
    .update({ usado_em: new Date().toISOString() })
    .in('id', usar.map(l => l.id));

  LIBERACOES = LIBERACOES.filter(l => !campos.includes(l.campo));
}

function lockConfiguredFields(p) {
  const companyInput = document.getElementById('profile-company');
  const documentInput = document.getElementById('profile-document');
  const companyLock = document.getElementById('profile-company-lock');
  const documentLock = document.getElementById('profile-document-lock');
  const companyRequestChange = document.getElementById('profile-company-request-change');
  const documentRequestChange = document.getElementById('profile-document-request-change');

  if (p.company && !liberado('company')) {
    companyInput.readOnly = true;
    companyInput.classList.add('field-locked');
    companyLock.hidden = false;
    companyRequestChange.hidden = false;
  }

  if (p.documentNumber && !liberado('documento')) {
    documentInput.readOnly = true;
    documentInput.classList.add('field-locked');
    documentLock.hidden = false;
    documentRequestChange.hidden = false;
    document.getElementById('profile-doc-type-toggle').querySelectorAll('[data-doc-type]').forEach(btn => {
      btn.disabled = true;
    });
  }
}

// Abre um chamado em Atendimento (Admin) pedindo a alteração do nome da
// empresa ou do CNPJ/CPF — esses campos travam depois de preenchidos, então
// a mudança só acontece via suporte.
function initRequestChangeLinks() {
  const links = [
    { el: document.getElementById('profile-company-request-change'), campo: 'Nome da empresa', valor: () => B2B_DATA.professional.company },
    { el: document.getElementById('profile-document-request-change'), campo: () => B2B_DATA.professional.documentType === 'cpf' ? 'CPF' : 'CNPJ', valor: () => B2B_DATA.professional.documentNumber }
  ];

  links.forEach(({ el, campo, valor }) => {
    if (!el) return;
    el.addEventListener('click', async (e) => {
      e.preventDefault();
      if (el.dataset.sent) return;

      const p = B2B_DATA.professional;
      const campoNome = typeof campo === 'function' ? campo() : campo;
      const session = window.b2bSession;

      const { error } = await supabaseClient.from('tickets').insert({
        origem: 'fornecedor',
        user_id: session ? session.user.id : null,
        nome: p.name || p.company || '',
        email: p.email || (session ? session.user.email : ''),
        telefone: p.phone || null,
        assunto: 'Alteração de dados',
        categoria: 'Dados cadastrais',
        mensagem: `Solicitação de alteração do campo "${campoNome}" (valor atual: ${valor()}).`,
        // O Admin age a partir daqui, em vez de interpretar a frase acima.
        extra: {
          campo: el.id.includes('document') ? 'documento' : 'company',
          campo_label: campoNome,
          valor_atual: String(valor() ?? '')
        }
      });

      if (error) return;

      el.dataset.sent = 'true';
      el.textContent = 'Solicitação enviada';
      el.removeAttribute('href');
      el.style.cursor = 'default';
    });
  });
}

/* -------------------- Minha Empresa -------------------- */

function initCompanyForm() {
  const form = document.getElementById('company-form');
  if (!form) return;
  const p = B2B_DATA.professional;

  /* -------- Endereço comercial -------- */
  const sameAddressCheckbox = document.getElementById('company-same-address');
  const addressInput = document.getElementById('company-address');
  const stateSelect = document.getElementById('company-state');
  const cityInput = document.getElementById('company-city');

  initStateCityFields(p, 'company');
  addressInput.value = p.businessAddress || '';

  const applySameAddressState = () => {
    const useProfile = sameAddressCheckbox.checked;
    if (useProfile) {
      addressInput.value = p.address || '';
      stateSelect.value = p.state || 'SP';
      cityInput.value = p.city || '';
      document.getElementById('company-city-options').innerHTML =
        citiesForState(stateSelect.value).map(c => `<option value="${c}"></option>`).join('');
    }
    [addressInput, stateSelect, cityInput].forEach(el => { el.disabled = useProfile; });
  };
  sameAddressCheckbox.checked = p.useProfileAddress !== false;
  applySameAddressState();
  sameAddressCheckbox.addEventListener('change', applySameAddressState);

  /* -------- Raio de atendimento -------- */
  const radiusInput = document.getElementById('company-service-radius');
  const radiusValue = document.getElementById('company-service-radius-value');
  const radiusTicks = document.getElementById('company-service-radius-ticks');
  if (radiusTicks) {
    radiusTicks.innerHTML = RADIUS_STEPS.map(() => '<span class="b2b-range-tick"></span>').join('');
  }
  const updateRadiusLabel = () => {
    radiusValue.textContent = radiusLabelFor(RADIUS_STEPS[Number(radiusInput.value)]);
    radiusTicks?.querySelectorAll('.b2b-range-tick').forEach((tick, i) => {
      tick.classList.toggle('is-active', i === Number(radiusInput.value));
    });
  };
  const initialStepIndex = RADIUS_STEPS.indexOf(p.serviceRadiusKm ?? 50);
  radiusInput.value = initialStepIndex > -1 ? initialStepIndex : 0;
  updateRadiusLabel();
  radiusInput.addEventListener('input', updateRadiusLabel);

  document.getElementById('company-delivery-time').value = p.deliveryTime || '';

  /* -------- Forma e condições de pagamento -------- */
  const installmentsSelect = document.getElementById('company-max-installments');
  // 0 = nenhuma parcela sem juros (o cliente paga juros desde a 1ª).
  installmentsSelect.innerHTML = ['<option value="0">Nenhuma</option>', '<option value="1">1x (à vista)</option>']
    .concat(Array.from({ length: 11 }, (_, i) => `<option value="${i + 2}">Até ${i + 2}x</option>`))
    .join('');
  installmentsSelect.value = String(p.maxInstallmentsNoInterest ?? 0);

  const depositInput = document.getElementById('company-deposit-percent');
  wirePercentMaskInput(depositInput);
  depositInput.value = (p.depositPercent ?? '') === '' ? '' : `${p.depositPercent}%`;
  document.getElementById('company-deposit-deadline').value = p.depositDeadlineDays ?? '';
  document.getElementById('company-cancellation-policy').value = p.cancellationPolicy || '';

  const fullPaymentToggle = document.getElementById('company-full-payment-toggle');
  let requiresFullPayment = !!p.requiresFullPaymentByEvent;
  const applyFullPaymentToggle = () => {
    fullPaymentToggle.querySelectorAll('[data-full-payment]').forEach(btn => {
      btn.classList.toggle('active', (btn.dataset.fullPayment === 'sim') === requiresFullPayment);
    });
  };
  applyFullPaymentToggle();
  fullPaymentToggle.querySelectorAll('[data-full-payment]').forEach(btn => {
    btn.addEventListener('click', () => {
      requiresFullPayment = btn.dataset.fullPayment === 'sim';
      applyFullPaymentToggle();
    });
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    p.useProfileAddress = sameAddressCheckbox.checked;
    p.businessAddress = sameAddressCheckbox.checked ? null : addressInput.value.trim();
    p.businessCity = sameAddressCheckbox.checked ? null : cityInput.value.trim();
    p.businessState = sameAddressCheckbox.checked ? null : stateSelect.value;
    p.serviceRadiusKm = RADIUS_STEPS[Number(radiusInput.value)];
    p.deliveryTime = document.getElementById('company-delivery-time').value.trim();
    p.maxInstallmentsNoInterest = Number(installmentsSelect.value);
    p.depositPercent = percentMaskValue(document.getElementById('company-deposit-percent'));
    p.depositDeadlineDays = Number(document.getElementById('company-deposit-deadline').value) || null;
    p.requiresFullPaymentByEvent = requiresFullPayment;
    p.cancellationPolicy = document.getElementById('company-cancellation-policy').value.trim();
    localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(p));
    salvarEmpresaNoBanco(p);
    showToast('Informações da empresa atualizadas.');
  });

  /* -------- Portfólio (fora do submit — salva a cada ação) -------- */
  renderPortfolioImages();
}

/* O mesmo bug que o Perfil já teve: sem isto, "Minha Empresa" só existia no
   localStorage de quem preenchia e nunca chegava ao banco/Admin. */
async function salvarEmpresaNoBanco(p) {
  const session = window.b2bSession || (await supabaseClient.auth.getSession()).data.session;
  if (!session) return;

  const { error } = await supabaseClient
    .from('fornecedores')
    .update({
      usa_endereco_perfil: p.useProfileAddress !== false,
      business_address: p.businessAddress || null,
      business_city: p.businessCity || null,
      business_state: p.businessState || null,
      service_radius_km: p.serviceRadiusKm ?? 50,
      delivery_time: p.deliveryTime || null,
      max_installments_no_interest: p.maxInstallmentsNoInterest ?? 0,
      deposit_percent: p.depositPercent ?? null,
      deposit_deadline_days: p.depositDeadlineDays ?? null,
      requires_full_payment_by_event: !!p.requiresFullPaymentByEvent,
      cancellation_policy: p.cancellationPolicy || null
    })
    .eq('id', session.user.id);

  if (error) console.error('Não foi possível sincronizar as informações da empresa com o banco.', error);
}

/* -------------------- Portfólio: fotos (upload real no Storage) -------------------- */

function renderPortfolioImages() {
  const grid = document.getElementById('company-portfolio-grid');
  if (!grid) return;
  const images = B2B_DATA.professional.portfolioImages || [];

  grid.innerHTML = images.map((img, i) => `
    <div class="header-logo-picker-wrap">
      <div class="image-upload-zone has-image" style="cursor:default;">
        <img src="${img.url}" class="image-upload-zone-preview" alt="">
      </div>
      <button type="button" class="header-logo-picker-remove" data-remove-portfolio-image="${i}" title="Remover foto">${PROFILE_LOGO_CLOSE_ICON}</button>
    </div>
  `).join('') + `
    <label class="image-upload-zone" id="company-portfolio-add-zone">
      <span class="image-upload-zone-plus">${PROFILE_LOGO_PLUS_ICON}</span>
      <span class="image-upload-zone-text">Adicionar foto</span>
      <input type="file" accept="image/*" class="image-upload-zone-input" id="company-portfolio-input">
    </label>
  `;

  grid.querySelectorAll('[data-remove-portfolio-image]').forEach(btn => {
    btn.addEventListener('click', () => removePortfolioImage(Number(btn.dataset.removePortfolioImage)));
  });

  const input = document.getElementById('company-portfolio-input');
  if (input) {
    input.addEventListener('change', () => { if (input.files[0]) uploadPortfolioImage(input.files[0]); });
    wireImageDropZone(document.getElementById('company-portfolio-add-zone'), uploadPortfolioImage);
  }
}

async function uploadPortfolioImage(file) {
  if (file.size > 3 * 1024 * 1024) {
    showToast('A imagem precisa ter até 3 MB.', true);
    return;
  }

  const session = window.b2bSession || (await supabaseClient.auth.getSession()).data.session;
  if (!session) return;

  const addZone = document.getElementById('company-portfolio-add-zone');
  if (addZone) addZone.classList.add('is-enviando');

  const extensao = (file.name.split('.').pop() || 'jpg').toLowerCase();
  const caminho = `portfolio/${session.user.id}/${Date.now()}-${Math.round(performance.now())}.${extensao}`;

  const { error } = await supabaseClient.storage.from('fornecedores').upload(caminho, file, {
    cacheControl: '31536000',
    contentType: file.type || 'image/jpeg'
  });

  if (addZone) addZone.classList.remove('is-enviando');

  if (error) {
    showToast(/bucket|not found/i.test(error.message || '')
      ? 'Não foi possível enviar: o Storage ainda não está configurado (migration 042_storage_fornecedores.sql).'
      : `Não foi possível enviar: ${error.message}`, true);
    return;
  }

  const url = supabaseClient.storage.from('fornecedores').getPublicUrl(caminho).data.publicUrl;
  B2B_DATA.professional.portfolioImages = B2B_DATA.professional.portfolioImages || [];
  B2B_DATA.professional.portfolioImages.push({ url, uploadedAt: new Date().toISOString() });
  renderPortfolioImages();
  persistPortfolioImages();
}

async function removePortfolioImage(index) {
  const [removida] = B2B_DATA.professional.portfolioImages.splice(index, 1);
  renderPortfolioImages();
  persistPortfolioImages();

  // Apaga o arquivo do Storage também (a policy da migration 042 deixa o
  // fornecedor remover o que está em portfolio/<seu id>/). Se falhar, a
  // foto já saiu da lista — o arquivo só fica órfão, sem prejuízo pra tela.
  const marcador = '/object/public/fornecedores/';
  const url = removida && removida.url ? String(removida.url) : '';
  const pos = url.indexOf(marcador);
  if (pos === -1) return;
  const caminho = decodeURIComponent(url.slice(pos + marcador.length).split('?')[0]);
  const { error } = await supabaseClient.storage.from('fornecedores').remove([caminho]);
  if (error) console.error('Não foi possível apagar a foto do Storage.', error);
}

async function persistPortfolioImages() {
  const session = window.b2bSession || (await supabaseClient.auth.getSession()).data.session;
  if (!session) return;
  const { error } = await supabaseClient
    .from('fornecedores')
    .update({ portfolio_images: B2B_DATA.professional.portfolioImages || [] })
    .eq('id', session.user.id);
  if (error) console.error('Não foi possível sincronizar o portfólio com o banco.', error);
}

/* -------------------- Portfólio: depoimentos --------------------
   A seção saiu de Configurações; o código fica porque a coluna
   fornecedores.depoimentos continua existindo e pode voltar. */

function renderTestimonials() {
  const wrap = document.getElementById('company-testimonials-list');
  if (!wrap) return;
  const items = B2B_DATA.professional.depoimentos || [];

  wrap.innerHTML = items.map(item => `
    <div class="inspector-list-item">
      <button type="button" class="inspector-list-item-remove" data-remove-testimonial="${item.id}">${PROFILE_LOGO_CLOSE_ICON}</button>
      <input type="text" class="field-input" data-testimonial-author="${item.id}" value="${escapeHtml(item.autor || '')}" placeholder="Nome de quem deu o depoimento">
      <textarea class="field-textarea" style="min-height:70px;" data-testimonial-text="${item.id}" placeholder="O que o cliente disse sobre o seu trabalho…">${escapeHtml(item.texto || '')}</textarea>
    </div>
  `).join('');

  wrap.querySelectorAll('[data-remove-testimonial]').forEach(btn => {
    btn.addEventListener('click', () => removeTestimonial(btn.dataset.removeTestimonial));
  });
  wrap.querySelectorAll('[data-testimonial-author]').forEach(input => {
    input.addEventListener('change', () => updateTestimonialField(input.dataset.testimonialAuthor, 'autor', input.value.trim()));
  });
  wrap.querySelectorAll('[data-testimonial-text]').forEach(textarea => {
    textarea.addEventListener('change', () => updateTestimonialField(textarea.dataset.testimonialText, 'texto', textarea.value.trim()));
  });
}

function addTestimonial() {
  B2B_DATA.professional.depoimentos = B2B_DATA.professional.depoimentos || [];
  B2B_DATA.professional.depoimentos.push({ id: 't' + Date.now() + '-' + Math.round(Math.random() * 999), autor: '', texto: '' });
  renderTestimonials();
}

function removeTestimonial(id) {
  const arr = B2B_DATA.professional.depoimentos || [];
  const idx = arr.findIndex(x => x.id === id);
  if (idx > -1) arr.splice(idx, 1);
  renderTestimonials();
  persistTestimonials();
}

function updateTestimonialField(id, campo, valor) {
  const item = (B2B_DATA.professional.depoimentos || []).find(x => x.id === id);
  if (!item) return;
  item[campo] = valor;
  persistTestimonials();
}

async function persistTestimonials() {
  const session = window.b2bSession || (await supabaseClient.auth.getSession()).data.session;
  if (!session) return;
  const { error } = await supabaseClient
    .from('fornecedores')
    .update({ depoimentos: B2B_DATA.professional.depoimentos || [] })
    .eq('id', session.user.id);
  if (error) console.error('Não foi possível sincronizar os depoimentos com o banco.', error);
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
  input.value = formatDocumentValue(input.value, type);
}

// prefix: 'profile' (Perfil) ou 'company' (Minha Empresa → endereço comercial) —
// mesmos ids em padrão <prefix>-state/<prefix>-city/<prefix>-city-options.
function initStateCityFields(p, prefix = 'profile') {
  const stateSelect = document.getElementById(`${prefix}-state`);
  const cityInput = document.getElementById(`${prefix}-city`);
  const cityOptions = document.getElementById(`${prefix}-city-options`);
  if (!stateSelect || !cityInput || !cityOptions) return;

  const state = prefix === 'company' ? p.businessState : p.state;
  const city = prefix === 'company' ? p.businessCity : p.city;

  stateSelect.innerHTML = BRAZIL_STATES.map(s => `<option value="${s.uf}" title="${s.name}">${s.uf}</option>`).join('');
  stateSelect.value = state || 'SP';
  cityInput.value = city || '';

  const refreshCityOptions = () => {
    cityOptions.innerHTML = citiesForState(stateSelect.value).map(c => `<option value="${c}"></option>`).join('');
  };
  refreshCityOptions();
  stateSelect.addEventListener('change', refreshCityOptions);
}

function renderProfileAvatarPicker() {
  const p = B2B_DATA.professional;
  const photo = p.profilePhoto || null;
  const wrap = document.getElementById('profile-avatar-wrap');
  if (!wrap) return;
  const cropStyle = `--avatar-scale:${p.profilePhotoScale || 1};--avatar-x:${p.profilePhotoOffsetX || 0}%;--avatar-y:${p.profilePhotoOffsetY || 0}%;`;
  wrap.innerHTML = `
    <div class="header-logo-picker-wrap">
      <label class="profile-avatar-picker ${photo ? 'has-image' : ''}">
        ${photo
          ? `<img src="${photo}" class="avatar-crop-img" alt="" style="${cropStyle}">
             <div class="header-logo-picker-overlay">${PROFILE_LOGO_IMAGE_ICON}<span>Alterar foto</span></div>`
          : `<span class="image-upload-zone-plus">${PROFILE_LOGO_PLUS_ICON}</span><span class="image-upload-zone-text">Adicione uma foto</span>`}
        <input type="file" accept="image/*" class="image-upload-zone-input" id="profile-avatar-input">
      </label>
      ${photo ? `<button type="button" class="header-logo-picker-remove" id="profile-avatar-remove" title="Remover foto">${PROFILE_LOGO_CLOSE_ICON}</button>` : ''}
    </div>
  `;

  const input = document.getElementById('profile-avatar-input');
  const applyFile = (file) => readFileAsDataUrl(file, (dataUrl) => {
    const img = new Image();
    img.onload = () => {
      let scale = 1, offsetX = 0, offsetY = 0;
      const bbox = detectImageContentBBox(img);
      if (bbox) {
        const auto = computeAutoFillCrop(bbox, PROFILE_AVATAR_ASPECT_RATIO);
        if (auto) { scale = auto.scale; offsetX = auto.offsetX; offsetY = auto.offsetY; }
      }
      p.profilePhoto = dataUrl;
      p.profilePhotoScale = scale;
      p.profilePhotoOffsetX = offsetX;
      p.profilePhotoOffsetY = offsetY;
      renderProfileAvatarPicker();
      openProfileAvatarAdjustModal();
      if (typeof initUserCard === 'function') initUserCard();
    };
    img.src = dataUrl;
  });
  if (input) {
    input.addEventListener('change', () => { if (input.files[0]) applyFile(input.files[0]); });
    wireImageDropZone(input.closest('.profile-avatar-picker'), applyFile);
  }
  const removeBtn = document.getElementById('profile-avatar-remove');
  if (removeBtn) removeBtn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    p.profilePhoto = null;
    p.profilePhotoScale = 1;
    p.profilePhotoOffsetX = 0;
    p.profilePhotoOffsetY = 0;
    renderProfileAvatarPicker();
    if (typeof initUserCard === 'function') initUserCard();
  });
}

/* -------------------- Modal: ajustar foto de perfil -------------------- */

function openProfileAvatarAdjustModal() {
  const modal = document.getElementById('profile-avatar-adjust-modal');
  if (!modal) return;
  wireProfileAvatarAdjustModalOnce();
  const img = modal.querySelector('[data-profile-avatar-adjust-img]');
  img.src = B2B_DATA.professional.profilePhoto;
  updateProfileAvatarAdjustTransform();
  modal.classList.add('show');
}

function closeProfileAvatarAdjustModal() {
  const modal = document.getElementById('profile-avatar-adjust-modal');
  if (modal) modal.classList.remove('show');
  renderProfileAvatarPicker();
  if (typeof initUserCard === 'function') initUserCard();
}

function updateProfileAvatarAdjustTransform() {
  const modal = document.getElementById('profile-avatar-adjust-modal');
  if (!modal) return;
  const p = B2B_DATA.professional;
  const img = modal.querySelector('[data-profile-avatar-adjust-img]');
  if (img) img.style.transform = `scale(${p.profilePhotoScale || 1}) translate(${p.profilePhotoOffsetX || 0}%, ${p.profilePhotoOffsetY || 0}%)`;
  const rangeInput = modal.querySelector('[data-profile-avatar-adjust-range]');
  if (rangeInput) rangeInput.value = p.profilePhotoScale || 1;
}

function wireProfileAvatarAdjustModalOnce() {
  const modal = document.getElementById('profile-avatar-adjust-modal');
  if (!modal || modal.dataset.wired) return;
  modal.dataset.wired = '1';

  modal.addEventListener('click', (e) => { if (e.target === modal) closeProfileAvatarAdjustModal(); });
  const closeBtn = modal.querySelector('[data-profile-avatar-adjust-close]');
  if (closeBtn) closeBtn.addEventListener('click', closeProfileAvatarAdjustModal);
  const doneBtn = modal.querySelector('[data-profile-avatar-adjust-done]');
  if (doneBtn) doneBtn.addEventListener('click', closeProfileAvatarAdjustModal);

  const rangeInput = modal.querySelector('[data-profile-avatar-adjust-range]');
  if (rangeInput) {
    rangeInput.addEventListener('input', () => {
      B2B_DATA.professional.profilePhotoScale = parseFloat(rangeInput.value);
      updateProfileAvatarAdjustTransform();
    });
  }

  const zoomMinus = modal.querySelector('[data-profile-avatar-adjust-zoom-minus]');
  if (zoomMinus) {
    zoomMinus.addEventListener('click', () => {
      const p = B2B_DATA.professional;
      p.profilePhotoScale = Math.max(1, +(((p.profilePhotoScale || 1) - 0.05).toFixed(2)));
      updateProfileAvatarAdjustTransform();
    });
  }
  const zoomPlus = modal.querySelector('[data-profile-avatar-adjust-zoom-plus]');
  if (zoomPlus) {
    zoomPlus.addEventListener('click', () => {
      const p = B2B_DATA.professional;
      p.profilePhotoScale = Math.min(8, +(((p.profilePhotoScale || 1) + 0.05).toFixed(2)));
      updateProfileAvatarAdjustTransform();
    });
  }

  const frame = modal.querySelector('[data-profile-avatar-adjust-frame]');
  if (frame) {
    let dragging = false;
    let dragStartX = 0, dragStartY = 0, startX = 0, startY = 0;
    frame.addEventListener('pointerdown', (e) => {
      dragging = true;
      dragStartX = e.clientX;
      dragStartY = e.clientY;
      const p = B2B_DATA.professional;
      startX = p.profilePhotoOffsetX || 0;
      startY = p.profilePhotoOffsetY || 0;
      frame.setPointerCapture(e.pointerId);
      frame.classList.add('is-dragging');
    });
    frame.addEventListener('pointermove', (e) => {
      if (!dragging) return;
      const rect = frame.getBoundingClientRect();
      const dxPct = ((e.clientX - dragStartX) / rect.width) * 100;
      const dyPct = ((e.clientY - dragStartY) / rect.height) * 100;
      const p = B2B_DATA.professional;
      p.profilePhotoOffsetX = Math.max(-50, Math.min(50, startX + dxPct));
      p.profilePhotoOffsetY = Math.max(-50, Math.min(50, startY + dyPct));
      updateProfileAvatarAdjustTransform();
    });
    const endDrag = () => { dragging = false; frame.classList.remove('is-dragging'); };
    frame.addEventListener('pointerup', endDrag);
    frame.addEventListener('pointercancel', endDrag);
  }
}

function renderProfileLogoPicker() {
  const p = B2B_DATA.professional;
  const logo = p.logo || null;
  const wrap = document.getElementById('profile-logo-wrap');
  if (!wrap) return;
  const cropStyle = `--logo-scale:${p.logoScale || 1};--logo-x:${p.logoOffsetX || 0}%;--logo-y:${p.logoOffsetY || 0}%;`;
  wrap.innerHTML = `
    <div class="header-logo-picker-wrap">
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

  if (type === 'cpf' || type === 'cnpj') {
    input.value = formatDocumentValue(input.value, type);
  } else if (type === 'telefone') {
    input.value = formatPhoneDigits(input.value.replace(/\D/g, '').slice(0, 11));
  }
}

function initBankDetailsForm() {
  const p = B2B_DATA.professional;
  const typeSelect = document.getElementById('profile-pix-type');
  const keyInput = document.getElementById('profile-pix-key');
  if (!typeSelect || !keyInput) return;

  typeSelect.value = p.pixKeyType || 'cpf';
  keyInput.value = p.pixKey || '';
  updatePixKeyFieldForType(typeSelect.value);
  wirePixKeyMaskInput(keyInput, () => typeSelect.value);

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
      <a href="planos" class="btn-primary w-full justify-center">Fazer upgrade</a>
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
