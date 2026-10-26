/* ==========================================================================
   LOVE B2B — Editar perfil (Perfil da empresa + Preferências da conta)
   ========================================================================== */

const PROFILE_LOGO_PLUS_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15"/></svg>';
const PROFILE_LOGO_IMAGE_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="8.5" cy="9.5" r="1.5"/><path stroke-linecap="round" stroke-linejoin="round" d="m5 18 5-5 3 3 4-5 4 5"/></svg>';
// Lápis no canto da imagem já enviada: clicar troca a imagem (sem excluir).
const PROFILE_IMAGEM_LAPIS = '<span class="profile-imagem-editar" title="Alterar imagem" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M16.86 4.49a2.1 2.1 0 0 1 2.97 2.97L8.5 18.79 4 20l1.21-4.5L16.86 4.49Z"/><path d="M14.5 6.85l2.65 2.65"/></svg></span>';
const PROFILE_LOGO_CLOSE_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12"/></svg>';
// Mesmo formato da caixa "Imagem de Capa" (320 × 130px): o que se ajusta
// na janela de enquadramento é exatamente o que aparece na caixa.
const PROFILE_LOGO_ASPECT_RATIO = 320 / 130;
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
  initDesativarConta();
  initSecurityRows();
  initSubscriptionModal();
  initBankDetailsForm();
  initAccordionCards();
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
      // O título da página é o nome da aba escolhida no menu lateral.
      setText('settings-titulo-pagina', btn.dataset.titulo || btn.textContent.trim());
      const salvarTopo = document.getElementById('settings-salvar-topo');
      if (salvarTopo) salvarTopo.hidden = btn.dataset.settingsTab !== 'perfil';
      document.querySelectorAll('[data-settings-panel]').forEach(panel => {
        panel.style.display = panel.dataset.settingsPanel === btn.dataset.settingsTab ? '' : 'none';
      });
      // Mesmo botão "Salvar alterações" pra Perfil e Minha Empresa — só
      // muda qual formulário ele envia. Preferências salva sozinha.
      const saveBtn = document.getElementById('profile-save-top-btn');
      if (saveBtn) {
        const tab = btn.dataset.settingsTab;
        saveBtn.hidden = tab === 'preferencias' || tab === 'urls';
        saveBtn.setAttribute('form', tab === 'empresa' ? 'company-form' : 'profile-form');
      }
    });
  });
}

/* -------------------- Perfil da empresa -------------------- */

function initProfileForm() {
  const p = B2B_DATA.professional;

  document.getElementById('profile-razao-social').value = p.razaoSocial || '';
  document.getElementById('profile-company').value = p.company || '';
  document.getElementById('profile-name').value = p.name || '';
  // Primeiro nome e sobrenome: juntos formam o responsável (contact_name).
  const nomeInput = document.getElementById('profile-name');
  const primeiroInput = document.getElementById('profile-first-name');
  const sobrenomeInput = document.getElementById('profile-last-name');
  if (primeiroInput && sobrenomeInput) {
    const partes = String(p.name || '').trim().split(/\s+/).filter(Boolean);
    primeiroInput.value = partes.shift() || '';
    sobrenomeInput.value = partes.join(' ');
    const juntar = () => { nomeInput.value = [primeiroInput.value.trim(), sobrenomeInput.value.trim()].filter(Boolean).join(' '); };
    [primeiroInput, sobrenomeInput].forEach(i => {
      if (typeof wireNameCaseInput === 'function') wireNameCaseInput(i);
      i.addEventListener('input', juntar);
    });
  }
  const birthdatePicker = initDatePicker(document.getElementById('profile-birthdate'), p.birthDate || '');
  document.getElementById('profile-phone').value = p.phone || '';
  document.getElementById('profile-address').value = p.address || '';
  // Descrição da empresa: até 650 caracteres, com contador embaixo.
  const descriptionInput = document.getElementById('profile-description');
  const descriptionCount = document.getElementById('profile-description-count');
  descriptionInput.value = (p.description || '').slice(0, 650);
  const updateDescriptionCount = () => {
    if (descriptionCount) descriptionCount.textContent = `${descriptionInput.value.length}/650`;
  };
  descriptionInput.addEventListener('input', updateDescriptionCount);
  updateDescriptionCount();
  document.getElementById('profile-document').value = p.documentNumber || '';

  wirePhoneMaskInput(document.getElementById('profile-phone'));
  wireDocumentMaskInput(document.getElementById('profile-document'), () => B2B_DATA.professional.documentType || 'cnpj');

  setProfileDocType(p.documentType || 'cnpj');
  initAbasDeInformacoes();
  carregarDadosDaContaDigital();
  renderProfileAvatarPicker();
  renderProfileLogoPicker();
  initStateCityFields(p);
  lockConfiguredFields(p);

  document.getElementById('profile-doc-type-toggle').querySelectorAll('[data-doc-type]').forEach(btn => {
    btn.addEventListener('click', () => setProfileDocType(btn.dataset.docType));
  });

  document.getElementById('profile-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const antes = { company: p.company, razaoSocial: p.razaoSocial, documentNumber: p.documentNumber, documentType: p.documentType };
    const company = document.getElementById('profile-company').value.trim();
    const name = document.getElementById('profile-name').value.trim();
    const phone = document.getElementById('profile-phone').value.trim();
    const documentNumber = document.getElementById('profile-document').value.trim();
    const docLabel = p.documentType === 'cpf' ? 'CPF' : 'CNPJ';

    if (!company || !name || !documentNumber) {
      showToast(`Preencha nome, sobrenome, nome fantasia e ${docLabel} para continuar.`, true);
      return;
    }

    p.company = company;
    p.razaoSocial = document.getElementById('profile-razao-social').value.trim();
    p.name = name;
    p.birthDate = birthdatePicker.getValue();
    p.phone = phone;
    p.address = document.getElementById('profile-address').value.trim();
    p.city = document.getElementById('profile-city').value.trim();
    p.state = document.getElementById('profile-state').value;
    p.description = document.getElementById('profile-description').value.trim();
    p.documentNumber = documentNumber;
    const erroBanco = await salvarPerfilNoBanco(p);
    if (!erroBanco) await salvarDadosDaContaDigital(birthdatePicker.getValue());
    // Razão social / documento já preenchidos: o banco recusa a troca (migration 077)
    // e o valor anterior volta.
    if (erroBanco && /ALTERACAO_BLOQUEADA/.test(erroBanco.message || '')) {
      Object.assign(p, antes);
      document.getElementById('profile-company').value = p.company || '';
      document.getElementById('profile-razao-social').value = p.razaoSocial || '';
      document.getElementById('profile-document').value = p.documentNumber || '';
      lockConfiguredFields(p);
      showToast('A razão social e o CNPJ não podem ser alterados depois de preenchidos.', true);
      return;
    }
    localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(p));
    if (antes.company && antes.company !== p.company) {
      // A URL do site acompanha o nome da empresa.
      if (typeof atualizarUrlDoSitePeloNome === 'function') {
        atualizarUrlDoSitePeloNome(p.company).then(slug => { if (slug) showToast(`URL do site atualizada: ${slug}`); });
      }
    }

    // Liberação concedida pelo Admin vale uma edição: gastou, trava de novo.
    consumirLiberacoes(['razao_social', 'documento']).then(() => lockConfiguredFields(p));

    lockConfiguredFields(p);
    showToast('Perfil atualizado.');
  });
}

/* -------------------- Informações da empresa × pessoais --------------------
   Abas sobre a caixa de Suas informações e os dados da conta digital da
   empresa no Asaas (tipo de empresa, faturamento, endereço completo, CPF e
   nascimento do responsável — migration 110). */
function initAbasDeInformacoes() {
  const abas = document.querySelectorAll('[data-info-aba]');
  abas.forEach(b => b.addEventListener('click', () => {
    abas.forEach(x => { const on = x === b; x.classList.toggle('is-ativa', on); x.setAttribute('aria-selected', String(on)); });
    document.querySelectorAll('[data-info-painel]').forEach(pn => { pn.hidden = pn.dataset.infoPainel !== b.dataset.infoAba; });
  }));
  const cep = document.getElementById('profile-cep');
  cep?.addEventListener('input', () => { const d = cep.value.replace(/\D/g, '').slice(0, 8); cep.value = d.length > 5 ? `${d.slice(0, 5)}-${d.slice(5)}` : d; });
  const cpf = document.getElementById('profile-resp-cpf');
  cpf?.addEventListener('input', () => {
    const d = cpf.value.replace(/\D/g, '').slice(0, 11);
    cpf.value = d.replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})\.(\d{3})(\d)/, '$1.$2.$3').replace(/(\d{3})(\d{1,2})$/, '$1-$2');
  });
}

async function carregarDadosDaContaDigital() {
  const session = window.b2bSession || (await supabaseClient.auth.getSession()).data.session;
  if (!session) return;
  const { data, error } = await supabaseClient.from('fornecedores')
    .select('tipo_empresa, faturamento_mensal, cep, endereco_numero, endereco_complemento, bairro, responsavel_cpf, data_nascimento')
    .eq('id', empresaId(session)).maybeSingle();
  if (error || !data) return; // migration 110 ainda não rodada
  const set = (id, v) => { const el = document.getElementById(id); if (el && v != null && v !== '') el.value = v; };
  set('profile-tipo-empresa', data.tipo_empresa);
  set('profile-faturamento', data.faturamento_mensal != null ? String(Math.round(Number(data.faturamento_mensal))) : '');
  set('profile-cep', data.cep);
  set('profile-numero', data.endereco_numero);
  set('profile-complemento', data.endereco_complemento);
  set('profile-bairro', data.bairro);
  set('profile-resp-cpf', data.responsavel_cpf);
  if (data.data_nascimento) {
    const [a, m, d] = String(data.data_nascimento).split('-');
    const nasc = document.getElementById('profile-birthdate');
    if (nasc && !nasc.value) nasc.value = `${d}/${m}/${a}`;
  }
}

async function salvarDadosDaContaDigital(nascimento) {
  const session = window.b2bSession || (await supabaseClient.auth.getSession()).data.session;
  if (!session) return;
  const v = id => (document.getElementById(id)?.value || '').trim();
  let dataNasc = null;
  const n = String(nascimento || v('profile-birthdate'));
  const br = n.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (br) dataNasc = `${br[3]}-${br[2]}-${br[1]}`;
  else if (/^\d{4}-\d{2}-\d{2}$/.test(n)) dataNasc = n;
  const { error } = await supabaseClient.from('fornecedores').update({
    tipo_empresa: v('profile-tipo-empresa') || null,
    faturamento_mensal: v('profile-faturamento') ? Number(v('profile-faturamento')) : null,
    cep: v('profile-cep').replace(/\D/g, '') || null,
    endereco_numero: v('profile-numero') || null,
    endereco_complemento: v('profile-complemento') || null,
    bairro: v('profile-bairro') || null,
    responsavel_cpf: v('profile-resp-cpf').replace(/\D/g, '') || null,
    data_nascimento: dataNasc
  }).eq('id', empresaId(session));
  if (error) console.warn('Dados da conta digital não salvos (rode a migration 110).', error);
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
      razao_social: p.razaoSocial || null,
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
    .eq('id', empresaId(session));

  // Falhar aqui não pode travar o fluxo: o perfil local já foi salvo.
  if (error) console.error('Não foi possível sincronizar o perfil com o banco.', error);
  return error || null;
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
    .eq('fornecedor_id', empresaId(session))
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

/* Razão social e CNPJ/CPF: depois de preenchidos, ficam travados (sem
   "Alterar"); só o Admin consegue liberar. O nome fantasia muda à vontade.
   O banco garante a mesma regra (migration 077). */
function lockConfiguredFields(p) {
  const razaoInput = document.getElementById('profile-razao-social');
  const documentInput = document.getElementById('profile-document');

  if (p.razaoSocial && razaoInput && !liberado('razao_social')) {
    razaoInput.readOnly = true;
    razaoInput.classList.add('field-locked');
  }

  if (p.documentNumber && !liberado('documento')) {
    documentInput.readOnly = true;
    documentInput.classList.add('field-locked');
    document.getElementById('profile-doc-type-toggle').querySelectorAll('[data-doc-type]').forEach(btn => {
      btn.disabled = true;
    });
  }
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
  // "O endereço de atendimento é o mesmo de Informações da empresa": marcado,
  // os campos somem (o endereço é copiado); desmarcado, aparecem para preencher.
  const enderecoProprio = document.getElementById('company-endereco-proprio');
  sameAddressCheckbox.checked = p.useProfileAddress !== false && !p.businessAddress;
  const mostrarEnderecoProprio = () => {
    if (enderecoProprio) enderecoProprio.hidden = sameAddressCheckbox.checked;
    [addressInput, stateSelect, cityInput].forEach(el => { el.disabled = false; });
  };
  sameAddressCheckbox.addEventListener('change', mostrarEnderecoProprio);
  mostrarEnderecoProprio();
  carregarExtrasDaEmpresa();
  const cepEmpresa = document.getElementById('company-cep');
  cepEmpresa?.addEventListener('input', () => { const d = cepEmpresa.value.replace(/\D/g, '').slice(0, 8); cepEmpresa.value = d.length > 5 ? `${d.slice(0, 5)}-${d.slice(5)}` : d; });

  /* -------- Descrição da empresa (cresce com o texto, até 650) -------- */
  const descricaoInput = document.getElementById('company-description');
  const descricaoContador = document.getElementById('company-description-count');
  const contarDescricao = () => { if (descricaoContador) descricaoContador.textContent = `${descricaoInput.value.length}/650`; };
  if (descricaoInput) {
    descricaoInput.value = (p.description || '').slice(0, 650);
    descricaoInput.addEventListener('input', contarDescricao);
    contarDescricao();
  }

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
  initParcelamento(installmentsSelect, p.maxInstallmentsNoInterest ?? 0);

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
    if (descricaoInput) {
      p.description = descricaoInput.value.trim();
      const descricaoPerfil = document.getElementById('profile-description');
      if (descricaoPerfil) descricaoPerfil.value = p.description;
    }
    localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(p));
    salvarEmpresaNoBanco(p);
    showToast('Informações da empresa atualizadas.');
  });

  /* -------- Portfólio (fora do submit — salva a cada ação) -------- */
  renderPortfolioImages();
}

/* O mesmo bug que o Perfil já teve: sem isto, "Minha Empresa" só existia no
   localStorage de quem preenchia e nunca chegava ao banco/Admin. */
/* -------------------- Parcelamento (revelação progressiva) --------------------
   1) Quem paga os juros: CLIENT (repassa ao cliente → 0 parcelas sem juros)
      ou SUPPLIER (o fornecedor assume).
   2) Só no SUPPLIER: até quantas vezes sem juros (2x a 12x), com o resumo
      do que fica com o fornecedor e do que passa para o cliente.
   O valor final vai para o select escondido #company-max-installments, que
   o "Salvar alterações" já grava em max_installments_no_interest. */
const PARCELAS_SEM_JUROS = [2, 3, 4, 5, 6, 10, 12];
const PARCELAS_MAXIMO = 12;
const PARCELAS_PADRAO_FORNECEDOR = 6;

function initParcelamento(select, valorSalvo) {
  const pills = document.getElementById('parcelas-pills');
  const limite = document.getElementById('parcelas-limite');
  const infoCliente = document.getElementById('parcelas-info-cliente');
  const alerta = document.getElementById('parcelas-alerta');
  if (!pills || !limite) return;

  // Valor antigo fora da lista (7, 8, 9, 11): fica na maior opção abaixo dele.
  const normalizar = n => PARCELAS_SEM_JUROS.filter(v => v <= n).pop() || PARCELAS_SEM_JUROS[0];
  let responsavel = Number(valorSalvo) >= 2 ? 'SUPPLIER' : 'CLIENT';
  let parcelas = responsavel === 'SUPPLIER' ? normalizar(Number(valorSalvo)) : PARCELAS_PADRAO_FORNECEDOR;

  pills.innerHTML = PARCELAS_SEM_JUROS.map(n => `
    <button type="button" class="parcelas-pill" role="radio" data-parcelas="${n}">${n}x</button>`).join('');

  const textoAlerta = n => n >= PARCELAS_MAXIMO
    ? `Parcelas de 1x a ${n}x: taxa de parcelamento descontada do seu repasse.`
    : `Parcelas de 1x a ${n}x: taxa de parcelamento descontada do seu repasse. Da ${n + 1}ª até a ${PARCELAS_MAXIMO}ª parcela: juros repassados ao cliente.`;

  const render = () => {
    const fornecedor = responsavel === 'SUPPLIER';
    document.querySelectorAll('input[name="interest-bearer"]').forEach(r => { r.checked = r.value === responsavel; });
    infoCliente.hidden = fornecedor;
    limite.hidden = !fornecedor;
    pills.querySelectorAll('[data-parcelas]').forEach(b => {
      const ativo = Number(b.dataset.parcelas) === parcelas;
      b.classList.toggle('is-ativo', ativo);
      b.setAttribute('aria-checked', ativo ? 'true' : 'false');
    });
    alerta.textContent = fornecedor ? textoAlerta(parcelas) : '';
    const valor = fornecedor ? parcelas : 0;
    if (![...select.options].some(o => Number(o.value) === valor)) select.add(new Option(`${valor}x`, String(valor)));
    select.value = String(valor);
  };

  document.querySelectorAll('input[name="interest-bearer"]').forEach(r => {
    r.addEventListener('change', () => { responsavel = r.value; render(); });
  });
  pills.addEventListener('click', (e) => {
    const b = e.target.closest('[data-parcelas]');
    if (!b) return;
    parcelas = Number(b.dataset.parcelas);
    render();
  });
  render();
}

/* Endereço de atendimento completo, visitas e amostras (migration 111). */
async function carregarExtrasDaEmpresa() {
  const session = window.b2bSession || (await supabaseClient.auth.getSession()).data.session;
  if (!session) return;
  const { data, error } = await supabaseClient.from('fornecedores')
    .select('business_cep, business_numero, business_complemento, business_bairro, aceita_visitas, oferece_amostra')
    .eq('id', empresaId(session)).maybeSingle();
  if (error || !data) return;
  const set = (id, v) => { const el = document.getElementById(id); if (el && v) el.value = v; };
  set('company-cep', data.business_cep);
  set('company-numero', data.business_numero);
  set('company-complemento', data.business_complemento);
  set('company-bairro', data.business_bairro);
  const v = document.getElementById('company-aceita-visitas');
  if (v) v.checked = !!data.aceita_visitas;
  const a = document.getElementById('company-oferece-amostra');
  if (a) a.checked = !!data.oferece_amostra;
}

async function salvarExtrasDaEmpresa() {
  const session = window.b2bSession || (await supabaseClient.auth.getSession()).data.session;
  if (!session) return;
  const mesmo = document.getElementById('company-same-address')?.checked;
  const v = id => (document.getElementById(id)?.value || '').trim();
  const { error } = await supabaseClient.from('fornecedores').update({
    business_cep: mesmo ? null : (v('company-cep').replace(/\D/g, '') || null),
    business_numero: mesmo ? null : (v('company-numero') || null),
    business_complemento: mesmo ? null : (v('company-complemento') || null),
    business_bairro: mesmo ? null : (v('company-bairro') || null),
    aceita_visitas: !!document.getElementById('company-aceita-visitas')?.checked,
    oferece_amostra: !!document.getElementById('company-oferece-amostra')?.checked
  }).eq('id', empresaId(session));
  if (error) console.warn('Endereço de atendimento/visitas não salvos (rode a migration 111).', error);
}

async function salvarEmpresaNoBanco(p) {
  salvarExtrasDaEmpresa();
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
      cancellation_policy: p.cancellationPolicy || null,
      description: p.description || null
    })
    .eq('id', empresaId(session));

  if (error) console.error('Não foi possível sincronizar as informações da empresa com o banco.', error);
}

/* -------------------- Portfólio: texto (fornecedores.portfolio_texto, migration 061) -------------------- */

// Aparece embaixo do carrossel do portfólio na página da empresa. Salva
// sozinho ao parar de digitar. Sem a coluna no banco, o campo some.
async function initPortfolioTexto() {
  const campo = document.getElementById('company-portfolio-texto');
  const wrap = document.getElementById('company-portfolio-texto-wrap');
  const status = document.getElementById('company-portfolio-texto-status');
  if (!campo) return;
  const { data: { session } } = await supabaseClient.auth.getSession();
  if (!session) return;
  const { data, error } = await supabaseClient.from('fornecedores').select('portfolio_texto').eq('id', empresaId(session)).maybeSingle();
  if (error) { if (wrap) wrap.hidden = true; return; }
  campo.value = (data && data.portfolio_texto) || '';
  let espera = null;
  campo.addEventListener('input', () => {
    if (status) status.textContent = 'Salvando…';
    clearTimeout(espera);
    espera = setTimeout(async () => {
      const { error: erroSalvar } = await supabaseClient.from('fornecedores')
        .update({ portfolio_texto: campo.value.trim() || null }).eq('id', empresaId(session));
      if (status) status.textContent = erroSalvar ? 'Não foi possível salvar. Tente de novo.' : 'Salvo.';
    }, 800);
  });
}

/* -------------------- Portfólio: fotos (upload real no Storage) -------------------- */

let portfolioComentarioEspera = null;

function renderPortfolioImages() {
  const grid = document.getElementById('company-portfolio-grid');
  if (!grid) return;
  // Fotos antigas guardadas só como texto (URL) viram { url } para ganhar comentário.
  B2B_DATA.professional.portfolioImages = (B2B_DATA.professional.portfolioImages || [])
    .map(x => (typeof x === 'string' ? { url: x } : x)).filter(x => x && x.url);
  const images = B2B_DATA.professional.portfolioImages;

  grid.innerHTML = images.map((img, i) => `
    <div class="portfolio-item">
      <div class="header-logo-picker-wrap">
        <div class="image-upload-zone has-image" style="cursor:default;">
          <img src="${img.url}" class="image-upload-zone-preview" alt="">
        </div>
        <button type="button" class="header-logo-picker-remove" data-remove-portfolio-image="${i}" title="Remover foto">${PROFILE_LOGO_CLOSE_ICON}</button>
      </div>
      <label class="portfolio-item-rotulo" for="portfolio-comentario-${i}">Comentários sobre este serviço</label>
      <textarea id="portfolio-comentario-${i}" class="field-textarea portfolio-item-comentario" data-portfolio-comentario="${i}" maxlength="600" rows="3">${escapeHtml(img.comentario || '')}</textarea>
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

  // Comentário de cada foto: salva sozinho ao parar de digitar.
  grid.querySelectorAll('[data-portfolio-comentario]').forEach(campo => {
    campo.addEventListener('input', () => {
      const item = (B2B_DATA.professional.portfolioImages || [])[Number(campo.dataset.portfolioComentario)];
      if (!item) return;
      item.comentario = campo.value;
      clearTimeout(portfolioComentarioEspera);
      portfolioComentarioEspera = setTimeout(() => {
        persistPortfolioImages().then(ok => showToast(ok ? 'Comentário salvo.' : 'Não foi possível salvar o comentário.', !ok));
      }, 900);
    });
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
    .eq('id', empresaId(session));
  if (error) console.error('Não foi possível sincronizar o portfólio com o banco.', error);
  return !error;
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
    .eq('id', empresaId(session));
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
  document.body.classList.toggle('doc-cpf', type === 'cpf');
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
             ${PROFILE_IMAGEM_LAPIS}`
          : `<span class="image-upload-zone-plus">${PROFILE_LOGO_PLUS_ICON}</span>`}
        <input type="file" accept="image/*" class="image-upload-zone-input" id="profile-avatar-input">
      </label>

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
    localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(p));
    syncFornecedorAvatar(p);
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
  // A foto (com o enquadramento) vira o avatar_url que o anfitrião vê.
  const p = B2B_DATA.professional;
  localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(p));
  syncFornecedorAvatar(p).then(url => {
    if (!url) return;
    Object.assign(p, { profilePhoto: url, profilePhotoScale: 1, profilePhotoOffsetX: 0, profilePhotoOffsetY: 0 });
    localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(p));
    renderProfileAvatarPicker();
    if (typeof initUserCard === 'function') initUserCard();
  });
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
             ${PROFILE_IMAGEM_LAPIS}`
          : `<span class="image-upload-zone-plus">${PROFILE_LOGO_PLUS_ICON}</span>`}
        <input type="file" accept="image/*" class="image-upload-zone-input" id="profile-logo-input">
      </label>

    </div>
  `;

  const input = document.getElementById('profile-logo-input');
  const applyFile = (file) => readFileAsDataUrl(file, (dataUrl) => {
    const img = new Image();
    img.onload = () => {
      // Capa preenche a caixa (cover): começa centralizada, sem zoom; a
      // pessoa ajusta na janela de enquadramento.
      const scale = 1, offsetX = 0, offsetY = 0;
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
    localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(p));
    syncFornecedorCapa(p);
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
  // A capa (com o enquadramento) vira o logo_url: a capa da página da
  // empresa no love.com.br.
  const p = B2B_DATA.professional;
  localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(p));
  syncFornecedorCapa(p).then(url => {
    if (!url) return;
    Object.assign(p, { logo: url, logoScale: 1, logoOffsetX: 0, logoOffsetY: 0 });
    localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(p));
    renderProfileLogoPicker();
  });
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

/* Mensagem curta embaixo do formulário (os toasts estão desligados). */
function mostrarMsgForm(id, texto, erro) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = texto || '';
  el.hidden = !texto;
  el.classList.toggle('is-erro', !!erro);
}

/* Senha e segurança › Senha: confere a senha atual (entrando de novo com
   ela) e grava a nova no Supabase. */
function initPasswordForm() {
  document.getElementById('password-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.target;
    const current = document.getElementById('password-current').value;
    const next = document.getElementById('password-new').value;
    const confirm = document.getElementById('password-confirm').value;
    mostrarMsgForm('password-msg', '');

    if (!current || !next || !confirm) return mostrarMsgForm('password-msg', 'Preencha a senha atual e a nova senha duas vezes.', true);
    if (next !== confirm) return mostrarMsgForm('password-msg', 'A confirmação não é igual à nova senha.', true);
    if (next.length < 6) return mostrarMsgForm('password-msg', 'A nova senha precisa ter pelo menos 6 caracteres.', true);
    if (next === current) return mostrarMsgForm('password-msg', 'A nova senha precisa ser diferente da atual.', true);

    const btn = form.querySelector('button[type="submit"]');
    btn.disabled = true;
    try {
      const session = window.b2bSession || (await supabaseClient.auth.getSession()).data.session;
      const email = session && session.user && session.user.email;
      const { error: erroAtual } = await supabaseClient.auth.signInWithPassword({ email, password: current });
      if (erroAtual) return mostrarMsgForm('password-msg', 'A senha atual está errada.', true);
      const { error } = await supabaseClient.auth.updateUser({ password: next });
      if (error) return mostrarMsgForm('password-msg', 'Não foi possível trocar a senha agora. Tente de novo.', true);
      form.reset();
      mostrarMsgForm('password-msg', 'Senha atualizada.');
    } finally {
      btn.disabled = false;
    }
  });
}

/* Senha e segurança › Desativar conta: confirma na própria tela, marca a
   empresa como inativa (sai da vitrine) e desconecta. */
function initDesativarConta() {
  const btn = document.getElementById('settings-desativar-btn');
  const caixa = document.getElementById('settings-desativar-confirmar');
  if (!btn || !caixa) return;
  btn.addEventListener('click', () => { caixa.hidden = false; btn.hidden = true; });
  document.getElementById('settings-desativar-cancelar').addEventListener('click', () => { caixa.hidden = true; btn.hidden = false; });
  document.getElementById('settings-desativar-sim').addEventListener('click', async (e) => {
    const sim = e.currentTarget;
    sim.disabled = true;
    const session = window.b2bSession || (await supabaseClient.auth.getSession()).data.session;
    const { error } = session
      ? await supabaseClient.from('fornecedores').update({ status: 'inativo' }).eq('id', empresaId(session))
      : { error: new Error('sem sessão') };
    if (error) {
      sim.disabled = false;
      return mostrarMsgForm('settings-desativar-msg', 'Não foi possível desativar agora. Fale com o suporte da Love.', true);
    }
    await supabaseClient.auth.signOut();
    window.location.href = 'login';
  });
}

/* -------------------- Segurança: 2FA e selfie -------------------- */

function initSecurityRows() {
  const p = B2B_DATA.professional;

  initLoginDaConta();
  initDoisFatores();
  initPreferenciasDeEmail();
  initUrlsDoSite();

  renderSelfieStatus();
  initVerificacaoDeConta();
}

/* -------------------- Preferências › Login --------------------
   Entrou com o Google: caixa "Login" com o Google, o e-mail e a data em que
   conectou (sem senha). "Alterar senha" só para quem criou a conta com
   e-mail e senha. */
async function initLoginDaConta() {
  const caixaGoogle = document.getElementById('settings-login-google');
  const caixaSenha = document.getElementById('settings-login-senha');
  // Até saber como a conta entra, a senha fica escondida (não pisca para quem é Google).
  if (caixaSenha) caixaSenha.hidden = true;
  const session = window.b2bSession || (await supabaseClient.auth.getSession()).data.session;
  let user = session && session.user;
  // A sessão guardada pode vir sem as identidades: busca o usuário completo.
  const { data: fresco } = await supabaseClient.auth.getUser();
  if (fresco && fresco.user) user = fresco.user;
  if (!user) return;
  const identidades = user.identities || [];
  const meta = user.app_metadata || {};
  const provedores = meta.providers || (meta.provider ? [meta.provider] : []);
  const identidadeGoogle = identidades.find(i => i.provider === 'google');
  // Conta criada com o Google: a senha é do Google, então não tem "Alterar senha".
  const ehGoogle = !!identidadeGoogle || provedores.includes('google');
  const temSenha = !ehGoogle && (identidades.some(i => i.provider === 'email') || provedores.includes('email'));
  if (ehGoogle && caixaGoogle) {
    const google = identidadeGoogle || {};
    caixaGoogle.hidden = false;
    const dados = google.identity_data || {};
    setText('settings-login-google-email', dados.email || user.email || '—');
    const quando = google.created_at || google.last_sign_in_at || user.created_at;
    setText('settings-login-google-data', quando
      ? 'Conectado em ' + new Date(quando).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }).replace('.', '')
      : '');
  }
  if (caixaSenha) caixaSenha.hidden = !temSenha;
  const vazio = document.getElementById('settings-contas-vazio');
  if (vazio) vazio.hidden = ehGoogle;
  ligarContaGoogle(user, identidadeGoogle, ehGoogle);
}

/* Contas conectadas › Desconectar do Google / Conectar com o Google.
   Desconectar: o e-mail continua cadastrado e o login passa a ser por
   e-mail e senha (a pessoa cria a senha pelo "Esqueci minha senha").
   Desconectar é feito no banco (função desconectar_google, migration 073);
   o "Manual linking" do Supabase só é preciso para "Conectar com o Google". */
let contaGoogleLigada = false;
function ligarContaGoogle(user, identidadeGoogle, ehGoogle) {
  const acoes = document.getElementById('settings-google-acoes');
  const conectar = document.getElementById('settings-google-conectar');
  const msg = document.getElementById('settings-google-msg');
  if (!acoes || !conectar) return;
  acoes.hidden = !ehGoogle;
  conectar.hidden = ehGoogle;
  if (contaGoogleLigada) return;
  contaGoogleLigada = true;

  const linkDesconectar = document.getElementById('settings-google-desconectar');
  const mostrarMsg = (texto, erro) => { msg.textContent = texto; msg.hidden = !texto; msg.classList.toggle('is-erro', !!erro); };


  // Clicou, desconecta na hora (sem confirmação).
  linkDesconectar.addEventListener('click', async (e) => {
    mostrarMsg('');
    const btn = e.currentTarget;
    btn.disabled = true;
    try {
      // Feito no banco (migration 073): a conta passa a entrar pelo e-mail, o
      // Google sai e a conta fica marcada como "google_desconectado".
      const { error } = await supabaseClient.rpc('desconectar_google');
      if (error) {
        console.warn('Não foi possível desconectar o Google.', error);
        mostrarMsg('Não foi possível desconectar agora. Tente de novo em instantes.', true);
        return;
      }
      await supabaseClient.auth.refreshSession();
      linkDesconectar.hidden = false;
      document.getElementById('settings-login-google').hidden = true;
      acoes.hidden = true;
      document.getElementById('settings-contas-vazio').hidden = false;
      conectar.hidden = false;
      mostrarMsg('Google desconectado. Na próxima vez, entre com o seu e-mail e use "Esqueci minha senha" para criar a senha.');
    } finally {
      btn.disabled = false;
    }
  });

  // Conectar de novo: vai ao Google e volta para o Hub já com a conta ligada.
  conectar.addEventListener('click', async () => {
    localStorage.setItem('b2b-reconectando-google', String(Date.now()));
    const { error } = await supabaseClient.auth.linkIdentity({
      provider: 'google',
      options: { redirectTo: `${location.origin}/dashboard`, queryParams: { prompt: 'select_account' } }
    });
    if (error) mostrarMsg('Não foi possível conectar com o Google agora. Tente de novo em instantes.', true);
  });
}

/* -------------------- URLs --------------------
   O endereço do site publicado (o mesmo de Construtor › Ajustes): no Pro,
   <slug>.love.com.br; no Gratuito, hub.love.com.br/site/<slug>. Sem site
   publicado ainda, mostra o que vai ser (pelo nome da empresa). */
async function initUrlsDoSite() {
  const slugEl = document.getElementById('settings-url-slug');
  if (!slugEl) return;
  const p = B2B_DATA.professional || {};
  const pro = p.plan === 'Pro';
  const session = window.b2bSession || (await supabaseClient.auth.getSession()).data.session;
  let slug = '';
  if (session) {
    const { data } = await supabaseClient.from('site_pages').select('slug').eq('fornecedor_id', empresaId(session)).maybeSingle();
    slug = (data && data.slug) || '';
  }
  if (!slug && typeof slugDoNome === 'function') slug = slugDoNome(p.company);
  const base = pro ? 'https://' : 'https://hub.love.com.br/site/';
  const exibido = pro ? `${slug}.love.com.br` : slug;
  const link = pro ? `https://${slug}.love.com.br` : `https://hub.love.com.br/site/${slug}`;
  setText('settings-url-base', base);
  slugEl.textContent = slug ? exibido : '—';
  const proBox = document.getElementById('settings-url-pro');
  if (proBox) proBox.hidden = pro;

  const aviso = document.getElementById('settings-url-aviso');
  let timer = null;
  document.getElementById('settings-url-copiar')?.addEventListener('click', async () => {
    if (!slug) return;
    try { await navigator.clipboard.writeText(link); aviso.textContent = 'Link copiado.'; }
    catch (e) { aviso.textContent = link; }
    clearTimeout(timer);
    timer = setTimeout(() => { aviso.textContent = ''; }, 2000);
  });
}

/* -------------------- Preferências › Autenticação de dois fatores --------------------
   "Permitir" já começa o cadastro TOTP (supabase.auth.mfa.enroll) e abre o
   pop-up com o QR code do Google Authenticator, a chave e o código de 6
   dígitos. Com o 2FA ativo, o botão vira "Desativar". */
let mfaFatorPendente = null;

async function fatorTotpVerificado() {
  const { data, error } = await supabaseClient.auth.mfa.listFactors();
  if (error || !data) return null;
  return (data.totp || []).find(f => f.status === 'verified') || null;
}

async function renderDoisFatores() {
  const btn = document.getElementById('profile-2fa-btn');
  if (!btn) return;
  const ativo = await fatorTotpVerificado();
  btn.textContent = ativo ? 'Desativar' : 'Permitir';
  btn.dataset.fatorId = ativo ? ativo.id : '';
  setText('profile-2fa-desc', ativo ? 'Ativa: o login pede o código do Google Authenticator.' : 'Peça um código do Google Authenticator ao entrar.');
}

function fecharModalDoisFatores() {
  const modal = document.getElementById('mfa-modal');
  if (!modal || !modal.classList.contains('show')) return;
  modal.classList.remove('show');
  modal.setAttribute('aria-hidden', 'true');
  // Cadastro não confirmado: apaga o fator pendente para poder tentar de novo.
  if (mfaFatorPendente) { supabaseClient.auth.mfa.unenroll({ factorId: mfaFatorPendente }); mfaFatorPendente = null; }
}

async function abrirModalDoisFatores() {
  const modal = document.getElementById('mfa-modal');
  const qr = document.getElementById('mfa-modal-qr');
  const erro = document.getElementById('mfa-modal-erro');
  const codigo = document.getElementById('mfa-modal-codigo');
  qr.innerHTML = '<span class="mfa-modal-carregando">Gerando QR code…</span>';
  setText('mfa-modal-chave', '—');
  codigo.value = '';
  erro.hidden = true;
  modal.classList.add('show');
  modal.setAttribute('aria-hidden', 'false');

  // Tentativa anterior não confirmada fica como fator "unverified": limpa antes.
  const { data: lista } = await supabaseClient.auth.mfa.listFactors();
  const pendentes = ((lista && lista.all) || []).filter(f => f.factor_type === 'totp' && f.status !== 'verified');
  await Promise.all(pendentes.map(f => supabaseClient.auth.mfa.unenroll({ factorId: f.id })));

  const { data, error } = await supabaseClient.auth.mfa.enroll({ factorType: 'totp', friendlyName: 'Google Authenticator ' + Date.now() });
  if (error || !data) {
    qr.innerHTML = '';
    erro.textContent = 'Não foi possível começar agora. Tente de novo em instantes.';
    erro.hidden = false;
    return;
  }
  mfaFatorPendente = data.id;
  qr.innerHTML = `<img src="${data.totp.qr_code}" alt="QR code para o Google Authenticator">`;
  setText('mfa-modal-chave', data.totp.secret);
  codigo.focus();
}

async function confirmarDoisFatores() {
  const codigo = document.getElementById('mfa-modal-codigo');
  const erro = document.getElementById('mfa-modal-erro');
  const btn = document.getElementById('mfa-modal-confirmar');
  const valor = codigo.value.replace(/\D/g, '');
  erro.hidden = true;
  if (!mfaFatorPendente) return;
  if (valor.length !== 6) { erro.textContent = 'Digite os 6 números do app.'; erro.hidden = false; return; }
  btn.disabled = true;
  const { error } = await supabaseClient.auth.mfa.challengeAndVerify({ factorId: mfaFatorPendente, code: valor });
  btn.disabled = false;
  if (error) { erro.textContent = 'Código inválido. Confira no app e tente de novo.'; erro.hidden = false; return; }
  mfaFatorPendente = null;
  fecharModalDoisFatores();
  renderDoisFatores();
}

function initDoisFatores() {
  const btn = document.getElementById('profile-2fa-btn');
  const modal = document.getElementById('mfa-modal');
  if (!btn || !modal) return;
  renderDoisFatores();

  btn.addEventListener('click', async () => {
    if (btn.dataset.fatorId) {
      btn.disabled = true;
      await supabaseClient.auth.mfa.unenroll({ factorId: btn.dataset.fatorId });
      btn.disabled = false;
      renderDoisFatores();
      return;
    }
    abrirModalDoisFatores();
  });

  const codigo = document.getElementById('mfa-modal-codigo');
  codigo.addEventListener('input', () => { codigo.value = codigo.value.replace(/\D/g, '').slice(0, 6); });
  codigo.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); confirmarDoisFatores(); } });
  document.getElementById('mfa-modal-confirmar').addEventListener('click', confirmarDoisFatores);
  document.getElementById('mfa-modal-fechar').addEventListener('click', fecharModalDoisFatores);
  modal.addEventListener('click', (e) => { if (e.target === modal) fecharModalDoisFatores(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') fecharModalDoisFatores(); });
}

/* -------------------- Preferências › E-mails --------------------
   Uma linha por tipo de e-mail com toggle; salva ao clicar (sem botão) em
   fornecedores.preferencias_email (jsonb) e mostra "Salvo" ao lado. */
const PREFERENCIAS_DE_EMAIL = [
  { chave: 'novos_leads', titulo: 'Novos leads', desc: 'Avise quando um cliente pedir orçamento', padrao: true },
  { chave: 'mensagens', titulo: 'Mensagens', desc: 'Avise quando chegar mensagem de cliente', padrao: true },
  { chave: 'vendas_pagamentos', titulo: 'Vendas e pagamentos', desc: 'Avise sobre pagamentos recebidos e saques', padrao: true },
  { chave: 'novidades', titulo: 'Novidades da Love', desc: 'Novos recursos e anúncios', padrao: false },
  { chave: 'dicas', titulo: 'Dicas e conteúdos', desc: 'Dicas para vender mais', padrao: false }
];

async function initPreferenciasDeEmail() {
  const lista = document.getElementById('prefs-email-lista');
  if (!lista) return;
  const session = window.b2bSession || (await supabaseClient.auth.getSession()).data.session;
  if (!session) return;
  const id = empresaId(session);

  const { data } = await supabaseClient.from('fornecedores').select('preferencias_email').eq('id', id).maybeSingle();
  const salvas = (data && data.preferencias_email) || {};
  const prefs = {};
  PREFERENCIAS_DE_EMAIL.forEach(p => { prefs[p.chave] = typeof salvas[p.chave] === 'boolean' ? salvas[p.chave] : p.padrao; });

  lista.innerHTML = PREFERENCIAS_DE_EMAIL.map(p => `
    <div class="prefs-email-linha">
      <div class="prefs-email-textos">
        <p class="prefs-email-nome">${escapeHtml(p.titulo)}</p>
        <p class="prefs-email-desc">${escapeHtml(p.desc)}</p>
      </div>
      <span class="prefs-email-salvo" data-salvo-de="${p.chave}" aria-live="polite"></span>
      <label class="settings-switch prefs-email-switch">
        <input type="checkbox" data-pref-email="${p.chave}"${prefs[p.chave] ? ' checked' : ''} aria-label="${escapeHtml(p.titulo)}">
        <span class="settings-switch-track"></span>
      </label>
    </div>`).join('');

  const timers = {};
  lista.querySelectorAll('[data-pref-email]').forEach(input => {
    input.addEventListener('change', async () => {
      const chave = input.dataset.prefEmail;
      prefs[chave] = input.checked;
      const aviso = lista.querySelector(`[data-salvo-de="${chave}"]`);
      const { error } = await supabaseClient.from('fornecedores').update({ preferencias_email: { ...prefs } }).eq('id', id);
      aviso.textContent = error ? 'Não salvou' : 'Salvo';
      aviso.classList.toggle('is-erro', !!error);
      aviso.classList.add('is-visivel');
      clearTimeout(timers[chave]);
      timers[chave] = setTimeout(() => aviso.classList.remove('is-visivel'), 1800);
    });
  });
}

/* -------------------- Verificação de conta (migration 070) --------------------
   "Verificar" abre, ao lado, a caixa para enviar o Cartão CNPJ e a CNH/RG
   do sócio (obrigatórios) e a inscrição municipal (opcional). Os arquivos
   vão para o bucket privado "verificacao"; o Admin analisa. */
let verificacaoStatus = null; // null | 'em_analise' | 'aprovada' | 'recusada'

async function carregarVerificacao() {
  const session = window.b2bSession || (await supabaseClient.auth.getSession()).data.session;
  if (!session) return;
  const { data, error } = await supabaseClient.from('verificacoes_conta')
    .select('status, motivo').eq('fornecedor_id', empresaId(session))
    .order('created_at', { ascending: false }).limit(1);
  if (error) return; // migration 070 ainda não rodada
  const ultima = data && data[0];
  verificacaoStatus = ultima ? ultima.status : null;
  if (verificacaoStatus === 'aprovada') B2B_DATA.professional.selfieVerified = true;
  renderSelfieStatus(ultima && ultima.status === 'recusada' ? (ultima.motivo || 'Documentos recusados. Envie de novo.') : null);
}

function abrirCaixaVerificacao(abrir) {
  const card = document.getElementById('verificacao-conta-card');
  const painel = document.querySelector('[data-settings-panel="seguranca"]');
  if (!card || !painel) return;
  card.hidden = !abrir;
  painel.classList.toggle('verificacao-aberta', abrir);
  if (abrir) card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function initVerificacaoDeConta() {
  const arquivos = {};
  [['verif-cnpj', 'cnpj'], ['verif-socio', 'socio'], ['verif-inscricao', 'inscricao_municipal']].forEach(([id, chave]) => {
    const input = document.getElementById(id);
    if (!input) return;
    input.addEventListener('change', () => {
      const f = input.files && input.files[0];
      if (!f) return;
      if (f.size > 10 * 1024 * 1024) { showToast('Arquivo muito grande (máximo 10 MB).', true); input.value = ''; return; }
      arquivos[chave] = f;
      const nome = input.closest('.verif-doc').querySelector('[data-verif-nome]');
      nome.textContent = f.name;
      input.closest('.verif-doc').classList.add('tem-arquivo');
    });
  });

  document.getElementById('profile-selfie-btn')?.addEventListener('click', () => abrirCaixaVerificacao(true));
  document.getElementById('verif-cancelar')?.addEventListener('click', () => abrirCaixaVerificacao(false));

  const erro = document.getElementById('verif-erro');
  document.getElementById('verif-enviar')?.addEventListener('click', async (e) => {
    const btn = e.currentTarget;
    erro.hidden = true;
    if (!arquivos.cnpj || !arquivos.socio) {
      erro.textContent = 'Envie o Cartão CNPJ e a CNH ou RG do sócio.';
      erro.hidden = false;
      return;
    }
    const session = window.b2bSession || (await supabaseClient.auth.getSession()).data.session;
    if (!session) return;
    btn.disabled = true;
    try {
      const fid = empresaId(session);
      const documentos = {};
      for (const [chave, f] of Object.entries(arquivos)) {
        const ext = (f.name.split('.').pop() || 'pdf').toLowerCase().replace(/[^a-z0-9]/g, '') || 'pdf';
        const caminho = `${session.user.id}/${fid}/${chave}-${Date.now()}.${ext}`;
        const { error: upErr } = await supabaseClient.storage.from('verificacao').upload(caminho, f, { contentType: f.type || undefined });
        if (upErr) throw upErr;
        documentos[chave] = caminho;
      }
      const { error: insErr } = await supabaseClient.from('verificacoes_conta').insert({ fornecedor_id: fid, documentos });
      if (insErr) throw insErr;
      verificacaoStatus = 'em_analise';
      abrirCaixaVerificacao(false);
      renderSelfieStatus();
      showToast('Documentos enviados. Avisaremos quando a verificação terminar.');
    } catch (err) {
      console.error('Verificação de conta:', err);
      erro.textContent = 'Não foi possível enviar os documentos. Tente de novo.';
      erro.hidden = false;
    } finally {
      btn.disabled = false;
    }
  });

  carregarVerificacao();
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

  // Já tem chave salva: o aceite vem marcado.
  const aceite = document.getElementById('bank-details-aceite');
  if (aceite && p.pixKey) aceite.checked = true;

  document.getElementById('bank-details-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const key = keyInput.value.trim();
    mostrarMsgForm('bank-details-msg', '');
    if (!key) return mostrarMsgForm('bank-details-msg', 'Preencha a sua chave Pix.', true);
    if (aceite && !aceite.checked) return mostrarMsgForm('bank-details-msg', 'Marque a confirmação para salvar.', true);
    p.pixKeyType = typeSelect.value;
    p.pixKey = key;
    localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(p));
    // Grava no banco (pix_key / pix_key_type), que é de onde o Hub lê.
    const session = window.b2bSession || (await supabaseClient.auth.getSession()).data.session;
    const { error } = session
      ? await supabaseClient.from('fornecedores').update({ pix_key: key, pix_key_type: typeSelect.value }).eq('id', empresaId(session))
      : { error: new Error('sem sessão') };
    mostrarMsgForm('bank-details-msg', error ? 'Não foi possível salvar agora. Tente de novo.' : 'Dados bancários salvos.', !!error);
  });
}

function renderSelfieStatus(avisoRecusa) {
  const verified = !!B2B_DATA.professional.selfieVerified;
  const emAnalise = !verified && typeof verificacaoStatus !== 'undefined' && verificacaoStatus === 'em_analise';
  document.getElementById('profile-selfie-btn').hidden = verified || emAnalise;
  document.getElementById('profile-selfie-badge').hidden = !verified;
  const analise = document.getElementById('profile-verif-analise');
  if (analise) analise.hidden = !emAnalise;
  setText('profile-selfie-desc', verified
    ? 'Sua identidade já foi verificada.'
    : (emAnalise ? 'Seus documentos estão em análise.' : (avisoRecusa || '')));
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
      <button type="button" class="btn-secondary flex-1 justify-center" id="subscription-cancel-btn">Cancelar plano</button>
      <button type="button" class="btn-secondary flex-1 justify-center assinatura-voltar-btn" id="subscription-exit-btn">Voltar</button>
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
      <button type="button" class="btn-primary flex-1 justify-center" style="background:#B91C1C; box-shadow:none;" id="subscription-cancel-confirm-btn">Confirmar</button>
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
