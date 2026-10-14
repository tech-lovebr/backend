/* ==========================================================================
   LOVE B2B — Utilitários compartilhados entre páginas
   ========================================================================== */

function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

function formatCurrency(value) {
  return Number(value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
}

// Formata como "R$ 1.234<sup>56</sup>" (centavos em sobrescrito), estilo apps bancários.
function formatCurrencySuperscript(value) {
  const cents = Math.round((value || 0) * 100);
  const reais = Math.floor(Math.abs(cents) / 100);
  const centavos = String(Math.abs(cents) % 100).padStart(2, '0');
  const sign = cents < 0 ? '-' : '';
  return `${sign}R$ ${reais.toLocaleString('pt-BR')}<sup>${centavos}</sup>`;
}

function padTwoDigits(value) {
  return String(value).padStart(2, '0');
}

function wireCurrencyMaskInput(input) {
  input.addEventListener('input', () => {
    const digits = input.value.replace(/\D/g, '').replace(/^0+(?=\d)/, '');
    if (!digits) { input.value = ''; return; }
    const reais = parseInt(digits, 10) / 100;
    input.value = reais.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  });
}

function currencyMaskValue(input) {
  const digits = (input.value || '').replace(/\D/g, '');
  return digits ? parseInt(digits, 10) / 100 : 0;
}

function formatPhoneDigits(digits) {
  let formatted = '';
  if (digits.length > 0) formatted += '(' + digits.slice(0, 2);
  if (digits.length >= 2) formatted += ')';
  if (digits.length > 2) formatted += ' ' + digits.slice(2, 7);
  if (digits.length > 7) formatted += '-' + digits.slice(7, 11);
  return formatted;
}

function wirePhoneMaskInput(input) {
  let prevDigits = '';
  input.addEventListener('input', (e) => {
    let digits = input.value.replace(/\D/g, '').slice(0, 11);
    // Apagar só um caractere de formatação (parênteses/traço) não muda a
    // contagem de dígitos — sem isso a máscara volta sozinha e trava o
    // apagar (o DDD nunca sai). Se foi um backspace/delete e a contagem
    // não mudou, remove o último dígito de verdade também.
    const isDeleting = e.inputType && e.inputType.indexOf('delete') === 0;
    if (isDeleting && digits.length === prevDigits.length && digits.length > 0) {
      digits = digits.slice(0, -1);
    }
    prevDigits = digits;
    input.value = formatPhoneDigits(digits);
  });
}

function formatCPF(digits) {
  let out = digits.slice(0, 3);
  if (digits.length > 3) out += '.' + digits.slice(3, 6);
  if (digits.length > 6) out += '.' + digits.slice(6, 9);
  if (digits.length > 9) out += '-' + digits.slice(9, 11);
  return out;
}

function formatCNPJ(digits) {
  let out = digits.slice(0, 2);
  if (digits.length > 2) out += '.' + digits.slice(2, 5);
  if (digits.length > 5) out += '.' + digits.slice(5, 8);
  if (digits.length > 8) out += '/' + digits.slice(8, 12);
  if (digits.length > 12) out += '-' + digits.slice(12, 14);
  return out;
}

function formatDocumentValue(value, type) {
  const maxDigits = type === 'cnpj' ? 14 : 11;
  const digits = (value || '').replace(/\D/g, '').slice(0, maxDigits);
  return type === 'cnpj' ? formatCNPJ(digits) : formatCPF(digits);
}

function wireDocumentMaskInput(input, getType) {
  input.addEventListener('input', () => {
    input.value = formatDocumentValue(input.value, getType ? getType() : 'cnpj');
  });
}

// Máscara da caixa de chave Pix: muda de comportamento conforme o tipo de
// chave selecionado (CPF/CNPJ usam a mesma máscara de documento, telefone
// usa a máscara de celular, e-mail/aleatória ficam em texto livre).
function wirePixKeyMaskInput(input, getType) {
  let prevPhoneDigits = '';
  input.addEventListener('input', (e) => {
    const type = getType();
    if (type === 'telefone') {
      let digits = input.value.replace(/\D/g, '').slice(0, 11);
      const isDeleting = e.inputType && e.inputType.indexOf('delete') === 0;
      if (isDeleting && digits.length === prevPhoneDigits.length && digits.length > 0) {
        digits = digits.slice(0, -1);
      }
      prevPhoneDigits = digits;
      input.value = formatPhoneDigits(digits);
    } else if (type === 'cpf' || type === 'cnpj') {
      input.value = formatDocumentValue(input.value, type);
    } else {
      prevPhoneDigits = '';
    }
  });
}

const PROFILE_REQUIRED_FIELDS = ['company', 'name', 'phone', 'documentNumber'];

function isProfileComplete() {
  const p = typeof B2B_DATA !== 'undefined' ? B2B_DATA.professional : null;
  if (!p) return false;
  return PROFILE_REQUIRED_FIELDS.every(key => {
    const v = p[key];
    return typeof v === 'string' ? v.trim().length > 0 : !!v;
  });
}

function initDatePicker(input, initialIso) {
  let isoValue = initialIso || '';
  let viewDate = isoValue ? new Date(isoValue + 'T00:00:00') : new Date();
  let viewMode = 'days';
  let yearRangeStart = Math.floor(viewDate.getFullYear() / 12) * 12;

  const popover = document.createElement('div');
  popover.className = 'date-picker-popover';
  popover.style.display = 'none';
  popover.innerHTML = `
    <div class="mini-cal-header">
      <button type="button" class="mini-cal-nav-btn" data-dp-prev aria-label="Anterior"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="m15 19-7-7 7-7" /></svg></button>
      <button type="button" class="mini-cal-month-label-btn" data-dp-label>—</button>
      <button type="button" class="mini-cal-nav-btn" data-dp-next aria-label="Próximo"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="m9 5 7 7-7 7" /></svg></button>
    </div>
    <div class="mini-cal-weekdays" data-dp-weekdays><span>D</span><span>S</span><span>T</span><span>Q</span><span>Q</span><span>S</span><span>S</span></div>
    <div class="mini-cal-grid" data-dp-grid></div>
  `;
  document.body.appendChild(popover);

  const pad2 = (n) => String(n).padStart(2, '0');
  const isoOf = (y, m, d) => `${y}-${pad2(m + 1)}-${pad2(d)}`;
  const formatDisplay = (iso) => {
    if (!iso) return '';
    const [y, m, d] = iso.split('-');
    return `${d}/${m}/${y}`;
  };

  function renderDays() {
    const label = popover.querySelector('[data-dp-label]');
    const grid = popover.querySelector('[data-dp-grid]');
    const weekdaysEl = popover.querySelector('[data-dp-weekdays]');
    weekdaysEl.style.display = '';
    grid.className = 'mini-cal-grid';

    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    label.textContent = capitalize(viewDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }));

    const firstWeekday = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();
    const now = new Date();
    const todayIso = isoOf(now.getFullYear(), now.getMonth(), now.getDate());

    let html = '';
    for (let i = firstWeekday - 1; i >= 0; i--) {
      html += `<button type="button" class="mini-cal-day is-muted" disabled>${daysInPrevMonth - i}</button>`;
    }
    for (let d = 1; d <= daysInMonth; d++) {
      const iso = isoOf(year, month, d);
      const classes = ['mini-cal-day'];
      if (iso === todayIso) classes.push('is-today');
      if (iso === isoValue) classes.push('is-selected');
      html += `<button type="button" class="${classes.join(' ')}" data-dp-date="${iso}">${d}</button>`;
    }
    const totalCells = firstWeekday + daysInMonth;
    const trailing = (7 - (totalCells % 7)) % 7;
    for (let d = 1; d <= trailing; d++) {
      html += `<button type="button" class="mini-cal-day is-muted" disabled>${d}</button>`;
    }
    grid.innerHTML = html;

    grid.querySelectorAll('[data-dp-date]').forEach(btn => {
      btn.addEventListener('click', () => {
        isoValue = btn.dataset.dpDate;
        input.value = formatDisplay(isoValue);
        input.dataset.isoValue = isoValue;
        input.dispatchEvent(new Event('change', { bubbles: true }));
        close();
      });
    });
  }

  function renderYears() {
    const label = popover.querySelector('[data-dp-label]');
    const grid = popover.querySelector('[data-dp-grid]');
    const weekdaysEl = popover.querySelector('[data-dp-weekdays]');
    weekdaysEl.style.display = 'none';
    grid.className = 'mini-cal-year-grid';

    label.textContent = `${yearRangeStart} – ${yearRangeStart + 11}`;

    const currentYear = new Date().getFullYear();
    const selectedYear = viewDate.getFullYear();

    let html = '';
    for (let y = yearRangeStart; y < yearRangeStart + 12; y++) {
      const classes = ['mini-cal-year-btn'];
      if (y === currentYear) classes.push('is-current');
      if (y === selectedYear) classes.push('is-selected');
      html += `<button type="button" class="${classes.join(' ')}" data-dp-year="${y}">${y}</button>`;
    }
    grid.innerHTML = html;

    grid.querySelectorAll('[data-dp-year]').forEach(btn => {
      btn.addEventListener('click', () => {
        viewDate.setFullYear(Number(btn.dataset.dpYear));
        viewMode = 'days';
        render();
      });
    });
  }

  function render() {
    if (viewMode === 'years') renderYears();
    else renderDays();
    // A altura muda (5 ou 6 semanas, grade de anos): aberto em cima do
    // campo, ele precisa ser reposicionado pra continuar encostado nele.
    if (popover.style.display === 'block') position();
  }

  // O popover é position:fixed, preso à janela — mas quem rola no B2B é o
  // .b2b-content, não a janela. Por isso a posição é recalculada a cada
  // rolagem (ver onScrollOrResize) e, sem espaço embaixo do campo, ele abre
  // em cima, em vez de ficar cortado no fim da tela.
  function position() {
    const rect = input.getBoundingClientRect();
    const popoverWidth = 260;
    const popoverHeight = popover.offsetHeight;
    const margin = 8;
    let left = rect.left;
    left = Math.min(left, window.innerWidth - popoverWidth - margin);
    left = Math.max(left, margin);

    const spaceBelow = window.innerHeight - rect.bottom - margin;
    const spaceAbove = rect.top - margin;
    let top = (spaceBelow < popoverHeight + 4 && spaceAbove > spaceBelow)
      ? rect.top - popoverHeight - 4
      : rect.bottom + 4;
    top = Math.max(margin, Math.min(top, window.innerHeight - popoverHeight - margin));

    popover.style.top = `${top}px`;
    popover.style.left = `${left}px`;
  }

  function onOutsideClick(e) {
    if (!popover.contains(e.target) && e.target !== input) close();
  }

  // Campo saiu da tela rolando: fecha, em vez de deixar o calendário solto.
  function onScrollOrResize(e) {
    if (e && e.target && popover.contains(e.target)) return;
    const rect = input.getBoundingClientRect();
    if (rect.bottom < 0 || rect.top > window.innerHeight) { close(); return; }
    position();
  }

  function open() {
    viewDate = isoValue ? new Date(isoValue + 'T00:00:00') : new Date();
    viewMode = 'days';
    yearRangeStart = Math.floor(viewDate.getFullYear() / 12) * 12;
    render();
    // Visível (mas transparente) antes de posicionar: position() precisa
    // da altura real do calendário pra decidir se abre em cima ou embaixo.
    popover.style.visibility = 'hidden';
    popover.style.display = 'block';
    position();
    popover.style.visibility = '';
    document.addEventListener('click', onOutsideClick);
    document.addEventListener('scroll', onScrollOrResize, true);
    window.addEventListener('resize', onScrollOrResize);
  }

  function close() {
    popover.style.display = 'none';
    document.removeEventListener('click', onOutsideClick);
    document.removeEventListener('scroll', onScrollOrResize, true);
    window.removeEventListener('resize', onScrollOrResize);
  }

  popover.addEventListener('click', (e) => e.stopPropagation());

  popover.querySelector('[data-dp-label]').addEventListener('click', () => {
    if (viewMode === 'days') {
      yearRangeStart = Math.floor(viewDate.getFullYear() / 12) * 12;
      viewMode = 'years';
    } else {
      viewMode = 'days';
    }
    render();
  });

  popover.querySelector('[data-dp-prev]').addEventListener('click', () => {
    if (viewMode === 'years') { yearRangeStart -= 12; renderYears(); }
    else { viewDate.setMonth(viewDate.getMonth() - 1); render(); }
  });
  popover.querySelector('[data-dp-next]').addEventListener('click', () => {
    if (viewMode === 'years') { yearRangeStart += 12; renderYears(); }
    else { viewDate.setMonth(viewDate.getMonth() + 1); render(); }
  });

  input.addEventListener('click', (e) => { e.stopPropagation(); open(); });
  const icon = input.parentElement && input.parentElement.querySelector('.date-picker-field-icon');
  if (icon) icon.addEventListener('click', (e) => { e.stopPropagation(); open(); });

  if (isoValue) input.value = formatDisplay(isoValue);

  return {
    setValue(iso) {
      isoValue = iso || '';
      input.value = formatDisplay(isoValue);
      input.dataset.isoValue = isoValue;
    },
    getValue() { return isoValue; }
  };
}

function initials(name) {
  return name.split(' ').filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase();
}

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

const PIX_KEY_TYPES = {
  cpf: { label: 'CPF', placeholder: '000.000.000-00' },
  cnpj: { label: 'CNPJ', placeholder: '00.000.000/0000-00' },
  telefone: { label: 'Telefone', placeholder: '(00) 00000-0000' },
  email: { label: 'E-mail', placeholder: 'seuemail@exemplo.com' },
  aleatoria: { label: 'Chave aleatória', placeholder: 'Chave gerada pelo seu banco' }
};

const STATUS_LABELS = {
  novo: 'Novo',
  conversa: 'Em conversa',
  proposta: 'Proposta enviada',
  fechado: 'Fechado',
  enviado: 'Enviado',
  assinado: 'Assinado',
  recusado: 'Recusado',
  ativo: 'Ativo',
  inativo: 'Inativo',
  pendente: 'Convite pendente'
};

function statusLabel(status) {
  return STATUS_LABELS[status] || status;
}

const BRAZIL_STATES = [
  { uf: 'AC', name: 'Acre', cities: ['Rio Branco', 'Cruzeiro do Sul', 'Sena Madureira', 'Feijó', 'Tarauacá'] },
  { uf: 'AL', name: 'Alagoas', cities: ['Maceió', 'Arapiraca', 'Palmeira dos Índios', 'Rio Largo', 'Penedo'] },
  { uf: 'AP', name: 'Amapá', cities: ['Macapá', 'Santana', 'Laranjal do Jari', 'Oiapoque', 'Mazagão'] },
  { uf: 'AM', name: 'Amazonas', cities: ['Manaus', 'Parintins', 'Itacoatiara', 'Manacapuru', 'Coari'] },
  { uf: 'BA', name: 'Bahia', cities: ['Salvador', 'Feira de Santana', 'Vitória da Conquista', 'Camaçari', 'Itabuna'] },
  { uf: 'CE', name: 'Ceará', cities: ['Fortaleza', 'Caucaia', 'Juazeiro do Norte', 'Maracanaú', 'Sobral'] },
  { uf: 'DF', name: 'Distrito Federal', cities: ['Brasília', 'Ceilândia', 'Taguatinga', 'Samambaia', 'Planaltina'] },
  { uf: 'ES', name: 'Espírito Santo', cities: ['Vitória', 'Vila Velha', 'Serra', 'Cariacica', 'Cachoeiro de Itapemirim'] },
  { uf: 'GO', name: 'Goiás', cities: ['Goiânia', 'Aparecida de Goiânia', 'Anápolis', 'Rio Verde', 'Luziânia'] },
  { uf: 'MA', name: 'Maranhão', cities: ['São Luís', 'Imperatriz', 'São José de Ribamar', 'Timon', 'Caxias'] },
  { uf: 'MT', name: 'Mato Grosso', cities: ['Cuiabá', 'Várzea Grande', 'Rondonópolis', 'Sinop', 'Tangará da Serra'] },
  { uf: 'MS', name: 'Mato Grosso do Sul', cities: ['Campo Grande', 'Dourados', 'Três Lagoas', 'Corumbá', 'Ponta Porã'] },
  { uf: 'MG', name: 'Minas Gerais', cities: ['Belo Horizonte', 'Uberlândia', 'Contagem', 'Juiz de Fora', 'Betim'] },
  { uf: 'PA', name: 'Pará', cities: ['Belém', 'Ananindeua', 'Santarém', 'Marabá', 'Castanhal'] },
  { uf: 'PB', name: 'Paraíba', cities: ['João Pessoa', 'Campina Grande', 'Santa Rita', 'Patos', 'Bayeux'] },
  { uf: 'PR', name: 'Paraná', cities: ['Curitiba', 'Londrina', 'Maringá', 'Ponta Grossa', 'Cascavel'] },
  { uf: 'PE', name: 'Pernambuco', cities: ['Recife', 'Jaboatão dos Guararapes', 'Olinda', 'Caruaru', 'Petrolina'] },
  { uf: 'PI', name: 'Piauí', cities: ['Teresina', 'Parnaíba', 'Picos', 'Piripiri', 'Floriano'] },
  { uf: 'RJ', name: 'Rio de Janeiro', cities: ['Rio de Janeiro', 'Niterói', 'Duque de Caxias', 'Nova Iguaçu', 'São Gonçalo'] },
  { uf: 'RN', name: 'Rio Grande do Norte', cities: ['Natal', 'Mossoró', 'Parnamirim', 'São Gonçalo do Amarante', 'Ceará-Mirim'] },
  { uf: 'RS', name: 'Rio Grande do Sul', cities: ['Porto Alegre', 'Caxias do Sul', 'Pelotas', 'Canoas', 'Santa Maria'] },
  { uf: 'RO', name: 'Rondônia', cities: ['Porto Velho', 'Ji-Paraná', 'Ariquemes', 'Vilhena', 'Cacoal'] },
  { uf: 'RR', name: 'Roraima', cities: ['Boa Vista', 'Rorainópolis', 'Caracaraí', 'Alto Alegre', 'Mucajaí'] },
  { uf: 'SC', name: 'Santa Catarina', cities: ['Florianópolis', 'Joinville', 'Blumenau', 'São José', 'Chapecó'] },
  { uf: 'SP', name: 'São Paulo', cities: ['São Paulo', 'Campinas', 'Sorocaba', 'Guarulhos', 'Osasco', 'Indaiatuba'] },
  { uf: 'SE', name: 'Sergipe', cities: ['Aracaju', 'Nossa Senhora do Socorro', 'Lagarto', 'Itabaiana', 'São Cristóvão'] },
  { uf: 'TO', name: 'Tocantins', cities: ['Palmas', 'Araguaína', 'Gurupi', 'Porto Nacional', 'Paraíso do Tocantins'] }
];

function citiesForState(uf) {
  const state = BRAZIL_STATES.find(s => s.uf === uf);
  return state ? state.cities : [];
}

function readFileAsDataUrl(file, cb) {
  const reader = new FileReader();
  reader.onload = () => cb(reader.result);
  reader.readAsDataURL(file);
}

function wireImageDropZone(zoneEl, onFile) {
  if (!zoneEl) return;
  zoneEl.addEventListener('dragover', (e) => { e.preventDefault(); zoneEl.classList.add('is-dragover'); });
  zoneEl.addEventListener('dragleave', () => zoneEl.classList.remove('is-dragover'));
  zoneEl.addEventListener('drop', (e) => {
    e.preventDefault();
    zoneEl.classList.remove('is-dragover');
    const file = e.dataTransfer.files && e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) onFile(file);
  });
}

function detectImageContentBBox(img, alphaThreshold = 10) {
  const w = img.naturalWidth, h = img.naturalHeight;
  if (!w || !h) return null;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0, w, h);
  let data;
  try {
    data = ctx.getImageData(0, 0, w, h).data;
  } catch (e) {
    return null;
  }
  const step = Math.max(1, Math.floor(Math.max(w, h) / 600));
  let minX = w, minY = h, maxX = -1, maxY = -1;
  for (let y = 0; y < h; y += step) {
    for (let x = 0; x < w; x += step) {
      if (data[(y * w + x) * 4 + 3] > alphaThreshold) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX < minX || maxY < minY) return null;
  return { x0: minX, y0: minY, x1: Math.min(w, maxX + step), y1: Math.min(h, maxY + step), width: w, height: h };
}

function computeAutoFillCrop(bbox, frameAspectRatio) {
  const cw = bbox.x1 - bbox.x0;
  const ch = bbox.y1 - bbox.y0;
  if (cw <= 0 || ch <= 0) return null;

  const imgAspect = bbox.width / bbox.height;
  const frameW = frameAspectRatio, frameH = 1;

  let dispW, dispH;
  if (imgAspect > frameAspectRatio) { dispW = frameW; dispH = dispW / imgAspect; }
  else { dispH = frameH; dispW = dispH * imgAspect; }

  const natToDisp = dispW / bbox.width;
  const contentDispW = cw * natToDisp;
  const contentDispH = ch * natToDisp;

  let scale = Math.max(frameW / contentDispW, frameH / contentDispH);
  scale = Math.max(1, Math.min(8, +scale.toFixed(2)));

  const frameOffsetX = (frameW - dispW) / 2;
  const frameOffsetY = (frameH - dispH) / 2;
  const contentCenterX = frameOffsetX + (bbox.x0 + cw / 2) * natToDisp;
  const contentCenterY = frameOffsetY + (bbox.y0 + ch / 2) * natToDisp;

  let offsetX = 50 - (contentCenterX / frameW * 100);
  let offsetY = 50 - (contentCenterY / frameH * 100);
  offsetX = Math.max(-50, Math.min(50, +offsetX.toFixed(2)));
  offsetY = Math.max(-50, Math.min(50, +offsetY.toFixed(2)));

  return { scale, offsetX, offsetY };
}

let toastTimer = null;
function showToast(message, isError = false) {
  let toast = document.getElementById('b2b-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'b2b-toast';
    toast.className = 'toast';
    document.body.appendChild(toast);
  }
  toast.style.background = isError ? '#B91C1C' : '#18181B';
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 3200);
}
