/* ==========================================================================
   LOVE B2B — Utilitários compartilhados entre páginas
   ========================================================================== */

/* Empresa ativa do Hub. Um login pode ter várias empresas (migration 066):
   a principal tem o mesmo id do login; as outras têm id próprio. Tudo que é
   da empresa (serviços, leads, chat, orçamentos, site…) usa este id; o que é
   do login (notificações, chamados, plano, arquivos) continua no id do login.
   shell.js confere a escolha guardada e grava em window.b2bEmpresaId. */
function empresaId(session) {
  return window.b2bEmpresaId || (session && session.user && session.user.id) || null;
}

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

/* Nomes: primeira letra de cada palavra em maiúscula também no computador
   (no celular o teclado já faz). "da/de/do/das/dos/e" ficam minúsculas
   fora do começo; as outras letras não mudam e o cursor fica no lugar —
   mesma regra do index (maiusculaNoNome em js/app.js). */
const PARTICULAS_DE_NOME = ['da', 'de', 'do', 'das', 'dos', 'e'];
function maiusculaNoNome(texto) {
  let palavra = 0;
  return String(texto || '').replace(/(^|\s)(\S)(\S*)/g, (m, espaco, primeira, resto) => {
    const inteira = primeira + resto;
    const ehParticula = palavra > 0 && PARTICULAS_DE_NOME.includes(inteira.toLowerCase());
    palavra++;
    return espaco + (ehParticula ? primeira.toLowerCase() : primeira.toLocaleUpperCase('pt-BR')) + resto;
  });
}
function wireNameCaseInput(input) {
  if (!input) return;
  input.setAttribute('autocapitalize', 'words');
  input.addEventListener('input', () => {
    const novo = maiusculaNoNome(input.value);
    if (novo === input.value) return;
    const ini = input.selectionStart, fim = input.selectionEnd;
    input.value = novo;
    try { input.setSelectionRange(ini, fim); } catch (e) { /* campo sem seleção */ }
  });
}

/* Campo de dinheiro com "R$" fixo no começo, dentro da caixa (o número é
   digitado depois dele). Envolve o input num .money-field. */
function wireMoneyPrefix(input) {
  if (!input || input.parentElement.classList.contains('money-field')) return;
  const wrap = document.createElement('div');
  wrap.className = 'money-field';
  input.parentElement.insertBefore(wrap, input);
  wrap.appendChild(input);
  const prefixo = document.createElement('span');
  prefixo.className = 'money-field-prefix';
  prefixo.textContent = 'R$';
  wrap.insertBefore(prefixo, input);
}

/* Data DD/MM/AAAA: a barra entra sozinha depois do dia e do mês; dia acima
   de 31 vira 31 e mês acima de 12 vira 12. Apagar a barra apaga o dígito
   antes dela (mesmo truque da máscara de telefone). */
function formatDateDigits(digits) {
  let d = digits.slice(0, 8);
  if (d.length >= 2 && Number(d.slice(0, 2)) > 31) d = '31' + d.slice(2);
  if (d.length >= 4 && Number(d.slice(2, 4)) > 12) d = d.slice(0, 2) + '12' + d.slice(4);
  if (d.length < 2) return d;
  if (d.length === 2) return d + '/';
  if (d.length < 4) return `${d.slice(0, 2)}/${d.slice(2)}`;
  if (d.length === 4) return `${d.slice(0, 2)}/${d.slice(2, 4)}/`;
  return `${d.slice(0, 2)}/${d.slice(2, 4)}/${d.slice(4)}`;
}

function wireDateMaskInput(input) {
  // Vazio, mostra só as barrinhas com espaço ("   /   /") para indicar
  // dia, mês e ano. Espaços não separáveis para o navegador não juntá-los.
  if (!input.placeholder) input.placeholder = '    /    /';
  input.addEventListener('input', (e) => {
    const digits = input.value.replace(/\D/g, '').slice(0, 8);
    const isDeleting = e.inputType && e.inputType.indexOf('delete') === 0;
    // Apagando: tira só a barra (não recoloca), sem levar o dígito junto.
    let formatted = formatDateDigits(digits);
    if (isDeleting && formatted.endsWith('/')) formatted = formatted.slice(0, -1);
    input.value = formatted;
  });
}

/* Valor em reais: "R$ 1.234,56" enquanto digita (centavos primeiro: 1 →
   R$ 0,01 … 100000 → R$ 1.000,00). Ler o número com currencyMaskValue. */
function formatBRLFromDigits(digits) {
  const clean = String(digits || '').replace(/\D/g, '').replace(/^0+(?=\d)/, '');
  if (!clean) return '';
  return 'R$ ' + (parseInt(clean, 10) / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function formatBRLValue(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return '';
  return 'R$ ' + n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function wireBRLMaskInput(input) {
  input.addEventListener('input', () => {
    input.value = formatBRLFromDigits(input.value);
  });
}

/* E-mail: ao digitar "@", sugere os provedores mais usados logo abaixo do
   campo (gmail, icloud, outlook…), filtrando pelo que já foi digitado
   depois do @. Clicar (ou Enter/Tab) completa o e-mail. */
const EMAIL_DOMAINS = ['gmail.com', 'icloud.com', 'outlook.com', 'hotmail.com', 'yahoo.com.br', 'yahoo.com', 'live.com', 'uol.com.br', 'bol.com.br', 'terra.com.br'];

function wireEmailDomainSuggestions(input) {
  const box = document.createElement('div');
  box.className = 'email-suggest';
  box.hidden = true;
  input.insertAdjacentElement('afterend', box);
  if (getComputedStyle(input.parentElement).position === 'static') input.parentElement.style.position = 'relative';
  let opcoes = [];
  let ativo = 0;

  const fechar = () => { box.hidden = true; opcoes = []; };
  const aplicar = (i) => {
    const escolhido = opcoes[i];
    if (!escolhido) return;
    input.value = escolhido;
    fechar();
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
  };
  const render = () => {
    const v = input.value.trim();
    const at = v.indexOf('@');
    if (at < 1) return fechar();
    const local = v.slice(0, at);
    const dominio = v.slice(at + 1).toLowerCase();
    opcoes = EMAIL_DOMAINS.filter(d => d.startsWith(dominio) && d !== dominio).map(d => `${local}@${d}`);
    if (!opcoes.length) return fechar();
    if (ativo >= opcoes.length) ativo = 0;
    box.innerHTML = opcoes.map((o, i) => `<button type="button" class="email-suggest-option ${i === ativo ? 'is-active' : ''}" data-i="${i}">${escapeHtml(o)}</button>`).join('');
    box.hidden = false;
    box.querySelectorAll('[data-i]').forEach(btn => {
      btn.addEventListener('mousedown', (e) => e.preventDefault());
      btn.addEventListener('click', () => aplicar(Number(btn.dataset.i)));
    });
  };

  input.addEventListener('input', () => { ativo = 0; render(); });
  input.addEventListener('keydown', (e) => {
    if (box.hidden || !opcoes.length) return;
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      ativo = (ativo + (e.key === 'ArrowDown' ? 1 : -1) + opcoes.length) % opcoes.length;
      render();
    } else if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault();
      aplicar(ativo);
    } else if (e.key === 'Escape') {
      fechar();
    }
  });
  input.addEventListener('blur', () => setTimeout(fechar, 120));
}

/* Porcentagem: o "%" entra sozinho ao digitar e não dá pra apagar — só os
   dígitos. Mesmo truque da máscara de telefone: um backspace que só tirou
   o "%" (contagem de dígitos igual) apaga o último dígito de verdade. */
function wirePercentMaskInput(input) {
  let prevDigits = '';
  input.addEventListener('input', (e) => {
    let digits = input.value.replace(/\D/g, '').replace(/^0+(?=\d)/, '').slice(0, 3);
    const isDeleting = e.inputType && e.inputType.indexOf('delete') === 0;
    if (isDeleting && digits.length === prevDigits.length && digits.length > 0) {
      digits = digits.slice(0, -1);
    }
    if (digits && Number(digits) > 100) digits = '100';
    prevDigits = digits;
    input.value = digits ? digits + '%' : '';
    // Cursor sempre antes do "%".
    const pos = digits.length;
    try { input.setSelectionRange(pos, pos); } catch (err) { /* campo sem seleção */ }
  });
  // Clicar depois do "%" também deixa o cursor antes dele.
  input.addEventListener('click', () => {
    const pos = input.value.replace(/\D/g, '').length;
    if (input.selectionStart > pos) { try { input.setSelectionRange(pos, pos); } catch (err) {} }
  });
}

function percentMaskValue(input) {
  const digits = (input.value || '').replace(/\D/g, '');
  return digits ? Math.min(100, parseInt(digits, 10)) : null;
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
    <div class="dp-body" data-dp-body>
      <div class="mini-cal-weekdays" data-dp-weekdays><span>D</span><span>S</span><span>T</span><span>Q</span><span>Q</span><span>S</span><span>S</span></div>
      <div class="mini-cal-grid" data-dp-grid></div>
    </div>
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
    // "Outubro de 1995" — só a primeira letra maiúscula.
    label.textContent = `${capitalize(viewDate.toLocaleDateString('pt-BR', { month: 'long' }))} de ${year}`;

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
    // Sempre 6 semanas (42 dias): o calendário tem o mesmo tamanho em todo
    // mês, em vez de crescer nos meses que ocupam 6 linhas.
    const totalCells = firstWeekday + daysInMonth;
    const trailing = 42 - totalCells;
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
        viewMode = 'months';
        render();
      });
    });
  }

  // Clicar no rótulo "Outubro de 1995" mostra os meses do ano; clicar no ano
  // (rótulo desta visão) leva aos anos.
  function renderMonths() {
    const label = popover.querySelector('[data-dp-label]');
    const grid = popover.querySelector('[data-dp-grid]');
    const weekdaysEl = popover.querySelector('[data-dp-weekdays]');
    weekdaysEl.style.display = 'none';
    grid.className = 'mini-cal-year-grid';

    const year = viewDate.getFullYear();
    label.textContent = String(year);

    const now = new Date();
    const selected = isoValue ? new Date(isoValue + 'T00:00:00') : null;

    let html = '';
    for (let m = 0; m < 12; m++) {
      const classes = ['mini-cal-year-btn'];
      if (year === now.getFullYear() && m === now.getMonth()) classes.push('is-current');
      if (selected && year === selected.getFullYear() && m === selected.getMonth()) classes.push('is-selected');
      const name = capitalize(new Date(year, m, 1).toLocaleDateString('pt-BR', { month: 'short' }).replace('.', ''));
      html += `<button type="button" class="${classes.join(' ')}" data-dp-month="${m}">${name}</button>`;
    }
    grid.innerHTML = html;

    grid.querySelectorAll('[data-dp-month]').forEach(btn => {
      btn.addEventListener('click', () => {
        viewDate = new Date(year, Number(btn.dataset.dpMonth), 1);
        viewMode = 'days';
        render();
      });
    });
  }

  // Altura do corpo (dias da semana + 6 semanas), medida uma vez: meses e
  // anos ocupam exatamente o mesmo espaço, então a caixinha não muda de
  // tamanho ao trocar de visão.
  let bodyHeight = 0;

  function render() {
    if (viewMode === 'years') renderYears();
    else if (viewMode === 'months') renderMonths();
    else renderDays();
    const body = popover.querySelector('[data-dp-body]');
    if (!bodyHeight && viewMode === 'days' && popover.style.display === 'block') {
      bodyHeight = body.offsetHeight;
      body.style.height = `${bodyHeight}px`;
    }
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
    // Visível (mas transparente) antes de desenhar e posicionar: render()
    // mede a altura do corpo e position() a do calendário inteiro pra
    // decidir se abre em cima ou embaixo.
    popover.style.visibility = 'hidden';
    popover.style.display = 'block';
    render();
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

  // Dias → meses → anos; escolher um ano volta aos meses, um mês aos dias.
  popover.querySelector('[data-dp-label]').addEventListener('click', () => {
    if (viewMode === 'days') {
      viewMode = 'months';
    } else if (viewMode === 'months') {
      yearRangeStart = Math.floor(viewDate.getFullYear() / 12) * 12;
      viewMode = 'years';
    } else {
      viewMode = 'days';
    }
    render();
  });

  // setDate(1) antes de trocar o mês: no dia 31, avançar um mês pulava
  // os meses de 30 dias.
  popover.querySelector('[data-dp-prev]').addEventListener('click', () => {
    if (viewMode === 'years') { yearRangeStart -= 12; renderYears(); }
    else if (viewMode === 'months') { viewDate.setFullYear(viewDate.getFullYear() - 1); render(); }
    else { viewDate.setDate(1); viewDate.setMonth(viewDate.getMonth() - 1); render(); }
  });
  popover.querySelector('[data-dp-next]').addEventListener('click', () => {
    if (viewMode === 'years') { yearRangeStart += 12; renderYears(); }
    else if (viewMode === 'months') { viewDate.setFullYear(viewDate.getFullYear() + 1); render(); }
    else { viewDate.setDate(1); viewDate.setMonth(viewDate.getMonth() + 1); render(); }
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

/* Avatar padrão (sem foto): as iniciais do nome — de preferência o da
   empresa ("Vitor Drinks" → VD). Usado no cabeçalho, no dropdown e no chat. */
function avatarInitials(name) {
  const letras = String(name || '').trim().split(/\s+/)
    .map(palavra => (palavra.match(/[\p{L}\p{N}]/u) || [''])[0])
    .filter(Boolean).slice(0, 2).join('').toUpperCase();
  return letras || '?';
}

function initialsAvatarHtml(name) {
  return `<span class="avatar-initials">${escapeHtml(avatarInitials(name))}</span>`;
}

/* Foto de perfil do fornecedor → fornecedores.avatar_url, pra aparecer na
   plataforma do anfitrião (Explorar, perfil do fornecedor, chat). Renderiza
   o enquadramento escolhido no Hub (escala + deslocamento sobre a imagem
   "contida" num quadrado, igual ao .avatar-crop-img) num JPEG 400×400, sobe
   pro bucket fornecedores (avatar/<id>/...) e grava a URL. Sem foto: limpa
   o avatar_url. Falhar não trava nada — a foto continua valendo no Hub. */
async function syncFornecedorAvatar(p) {
  const session = window.b2bSession || (await supabaseClient.auth.getSession()).data.session;
  if (!session) return null;
  const userId = session.user.id;

  if (!p.profilePhoto) {
    await supabaseClient.from('fornecedores').update({ avatar_url: null }).eq('id', empresaId(session));
    return null;
  }
  // Já é a URL publicada (veio do banco) e sem ajuste novo: nada a fazer.
  if (/^https?:\/\//.test(p.profilePhoto) && (p.profilePhotoScale || 1) === 1 && !p.profilePhotoOffsetX && !p.profilePhotoOffsetY) {
    return p.profilePhoto;
  }

  try {
    const img = await new Promise((resolve, reject) => {
      const el = new Image();
      el.crossOrigin = 'anonymous';
      el.onload = () => resolve(el);
      el.onerror = reject;
      el.src = p.profilePhoto;
    });
    const N = 400;
    const canvas = document.createElement('canvas');
    canvas.width = N; canvas.height = N;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, N, N);
    const fit = Math.min(N / img.naturalWidth, N / img.naturalHeight);
    const s = p.profilePhotoScale || 1;
    const w = img.naturalWidth * fit * s, h = img.naturalHeight * fit * s;
    const cx = N / 2 + s * ((p.profilePhotoOffsetX || 0) / 100) * N;
    const cy = N / 2 + s * ((p.profilePhotoOffsetY || 0) / 100) * N;
    ctx.drawImage(img, cx - w / 2, cy - h / 2, w, h);
    const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.9));
    const caminho = `avatar/${userId}/${Date.now()}.jpg`;
    const { error: upErr } = await supabaseClient.storage.from('fornecedores')
      .upload(caminho, blob, { cacheControl: '31536000', contentType: 'image/jpeg' });
    if (upErr) { console.warn('Foto de perfil não subiu pro Storage.', upErr); return null; }
    const url = supabaseClient.storage.from('fornecedores').getPublicUrl(caminho).data.publicUrl;
    const { error } = await supabaseClient.from('fornecedores').update({ avatar_url: url }).eq('id', empresaId(session));
    if (error) { console.warn('Não foi possível gravar avatar_url.', error); return null; }
    return url;
  } catch (err) {
    console.warn('Não foi possível sincronizar a foto de perfil.', err);
    return null;
  }
}

/* Imagem de capa do fornecedor → fornecedores.logo_url, que é a capa da
   página da empresa no love.com.br (Explorar › perfil do fornecedor).
   Renderiza o enquadramento escolhido no Hub — a imagem preenchendo a caixa
   (cover) com o zoom e o deslocamento, igual ao .logo-crop-img da caixa de
   320 × 130 — num JPEG 1280 × 520, sobe pro bucket fornecedores
   (capa/<id>/...) e grava a URL. Sem capa: limpa o logo_url. */
async function syncFornecedorCapa(p) {
  const session = window.b2bSession || (await supabaseClient.auth.getSession()).data.session;
  if (!session) return null;
  const userId = session.user.id;

  if (!p.logo) {
    await supabaseClient.from('fornecedores').update({ logo_url: null }).eq('id', empresaId(session));
    return null;
  }
  if (/^https?:\/\//.test(p.logo) && (p.logoScale || 1) === 1 && !p.logoOffsetX && !p.logoOffsetY) {
    return p.logo;
  }

  try {
    const img = await new Promise((resolve, reject) => {
      const el = new Image();
      el.crossOrigin = 'anonymous';
      el.onload = () => resolve(el);
      el.onerror = reject;
      el.src = p.logo;
    });
    const W = 1280, H = 520;
    const canvas = document.createElement('canvas');
    canvas.width = W; canvas.height = H;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, W, H);
    const cover = Math.max(W / img.naturalWidth, H / img.naturalHeight);
    const s = p.logoScale || 1;
    const w = img.naturalWidth * cover * s, h = img.naturalHeight * cover * s;
    const cx = W / 2 + s * ((p.logoOffsetX || 0) / 100) * W;
    const cy = H / 2 + s * ((p.logoOffsetY || 0) / 100) * H;
    ctx.drawImage(img, cx - w / 2, cy - h / 2, w, h);
    const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.88));
    const caminho = `capa/${userId}/${Date.now()}.jpg`;
    const { error: upErr } = await supabaseClient.storage.from('fornecedores')
      .upload(caminho, blob, { cacheControl: '31536000', contentType: 'image/jpeg' });
    if (upErr) { console.warn('Capa não subiu pro Storage.', upErr); return null; }
    const url = supabaseClient.storage.from('fornecedores').getPublicUrl(caminho).data.publicUrl;
    const { error } = await supabaseClient.from('fornecedores').update({ logo_url: url }).eq('id', empresaId(session));
    if (error) { console.warn('Não foi possível gravar logo_url.', error); return null; }
    return url;
  } catch (err) {
    console.warn('Não foi possível sincronizar a capa.', err);
    return null;
  }
}

/* Formulários do Editor de Site — tabela site_formularios (migration 047).
   O navegador (b2b-site-forms) fica como cache; se a tabela ainda não
   existir, é o único lugar, como antes. Na primeira carga com a tabela
   vazia, os formulários que já estavam no navegador sobem pro banco com o
   mesmo id (blocos do site que apontam pra eles continuam funcionando). */
const SITE_FORMS_LOCAL_KEY = 'b2b-site-forms';
let siteFormsNoBanco = true;

function siteFormsLocais() {
  try { return JSON.parse(localStorage.getItem(SITE_FORMS_LOCAL_KEY) || '[]'); } catch (e) { return []; }
}
function gravarSiteFormsLocais(forms) {
  try { localStorage.setItem(SITE_FORMS_LOCAL_KEY, JSON.stringify(forms)); } catch (e) { /* cheio/bloqueado */ }
}
function siteFormDaLinha(r) {
  return { id: r.id, title: r.titulo, description: r.descricao || '', responses: 0, fields: r.campos || [], bgColor: r.bg_color || '', bgImage: r.bg_image || '' };
}
function siteFormParaLinha(f, fornecedorId) {
  return {
    id: f.id, fornecedor_id: fornecedorId, titulo: f.title || 'Formulário sem título',
    descricao: f.description || null, campos: f.fields || [],
    bg_color: f.bgColor || null, bg_image: f.bgImage || null, updated_at: new Date().toISOString()
  };
}
async function sessaoFornecedorId() {
  const session = window.b2bSession || (await supabaseClient.auth.getSession()).data.session;
  return session ? empresaId(session) : null;
}

async function loadSiteForms() {
  const locais = siteFormsLocais();
  const uid = await sessaoFornecedorId();
  if (!uid) return locais;
  const { data, error } = await supabaseClient
    .from('site_formularios')
    .select('id, titulo, descricao, campos, bg_color, bg_image')
    .eq('fornecedor_id', uid)
    .order('created_at');
  if (error) { siteFormsNoBanco = false; return locais; }
  siteFormsNoBanco = true;

  if (!data.length && locais.length) {
    const { error: upErr } = await supabaseClient
      .from('site_formularios')
      .upsert(locais.map(f => siteFormParaLinha(f, uid)), { onConflict: 'id' });
    if (upErr) console.warn('Não foi possível subir os formulários do navegador pro banco.', upErr);
    return locais;
  }

  const forms = data.map(siteFormDaLinha);
  gravarSiteFormsLocais(forms);
  if (typeof B2B_DATA !== 'undefined') B2B_DATA.siteForms = forms;
  return forms;
}

async function saveSiteFormRemote(form) {
  if (!siteFormsNoBanco || !form) return;
  const uid = await sessaoFornecedorId();
  if (!uid) return;
  const { error } = await supabaseClient.from('site_formularios').upsert(siteFormParaLinha(form, uid), { onConflict: 'id' });
  if (error) console.error('Não foi possível salvar o formulário no banco.', error);
}

async function deleteSiteFormRemote(id) {
  if (!siteFormsNoBanco || !id) return;
  const { error } = await supabaseClient.from('site_formularios').delete().eq('id', id);
  if (error) console.error('Não foi possível excluir o formulário no banco.', error);
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

/* ==========================================================================
   Tabelas do Hub — barra no topo da caixa da tabela (padrão do Admin)
   Esquerda: busca. Direita: "Filtrar por" (com contador de filtros ativos),
   "Importar" (se houver) e "Exportar". A última coluna das tabelas tem o
   botão "ver mais" (três bolinhas), que abre o detalhe; a linha em si não
   abre nada, para dar para selecionar e copiar texto.
   ========================================================================== */

const TABELA_ICONE_FUNIL = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 5h16l-6 7.5V19l-4 1.5v-8L4 5Z"/></svg>';
const TABELA_ICONE_EXPORTAR = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 15V3m0 0-4.5 4.5M12 3l4.5 4.5"/><path d="M3 15v3.75A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V15"/></svg>';
const TABELA_ICONE_IMPORTAR = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v12m0 0-4.5-4.5M12 15l4.5-4.5"/><path d="M3 15v3.75A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V15"/></svg>';
const TABELA_ICONE_BUSCA = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="m21 21-5.2-5.2m0 0A7.5 7.5 0 1 0 5.2 5.2a7.5 7.5 0 0 0 10.6 10.6Z"/></svg>';
const TABELA_ICONE_VER_MAIS = '<svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><circle cx="5" cy="12" r="1.7"/><circle cx="12" cy="12" r="1.7"/><circle cx="19" cy="12" r="1.7"/></svg>';
const TABELA_ICONE_COPIAR = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/></svg>';

/* Botão "ver mais" da última coluna. attr: nome do data-atributo (ex.:
   'data-open-lead'), valor: o id da linha. */
function tabelaVerMaisHtml(attr, valor) {
  return `<td class="tabela-col-acoes"><button type="button" class="tabela-ver-mais" ${attr}="${escapeHtml(String(valor))}" title="Ver mais" aria-label="Ver mais">${TABELA_ICONE_VER_MAIS}</button></td>`;
}

/* E-mail com o botão de copiar logo à direita. */
function tabelaEmailHtml(email) {
  if (!email) return '—';
  return `<span class="tabela-email">${escapeHtml(email)}<button type="button" class="tabela-copiar-email" data-copiar-email="${escapeHtml(email)}" title="Copiar e-mail" aria-label="Copiar e-mail">${TABELA_ICONE_COPIAR}</button></span>`;
}

document.addEventListener('click', async (e) => {
  const btn = e.target.closest('[data-copiar-email]');
  if (!btn) return;
  e.stopPropagation();
  try { await navigator.clipboard.writeText(btn.dataset.copiarEmail); } catch (err) { /* sem permissão */ }
  if (typeof showToast === 'function') showToast('E-mail copiado.');
});

/* CSV com ; e BOM (o Excel em português abre direto). */
function tabelaExportarCSV(nomeArquivo, colunas, linhas) {
  const esc = v => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const conteudo = [
    colunas.map(c => esc(c.titulo)).join(';'),
    ...linhas.map(l => colunas.map(c => esc(c.valor(l))).join(';'))
  ].join('\r\n');
  const blob = new Blob(['﻿' + conteudo], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${nomeArquivo}-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  if (typeof showToast === 'function') showToast(`${linhas.length} ${linhas.length === 1 ? 'linha exportada' : 'linhas exportadas'}.`);
}

/* Monta a barra no topo da caixa (card) da tabela.
   opts: {
     placeholder: 'Buscar ...',
     filtros: [{ chave, rotulo, opcoes: () => [[valor, texto], ...] }],
     importar: () => {} (opcional),
     exportar: () => {},
     aoMudar: (estado) => {}  — estado = { busca, filtros: { chave: valor } }
   }
   Devolve o estado (sempre atualizado). */
function montarBarraTabela(card, opts) {
  if (!card || card.querySelector(':scope > .tabela-barra')) return null;
  const estado = { busca: '', filtros: {} };
  const barra = document.createElement('div');
  barra.className = 'tabela-barra';
  const temFiltros = (opts.filtros || []).length > 0;
  barra.innerHTML = `
    <label class="tabela-busca">${TABELA_ICONE_BUSCA}<input type="search" placeholder="${escapeHtml(opts.placeholder || 'Buscar...')}" autocomplete="off"></label>
    <div class="tabela-barra-acoes">
      ${temFiltros ? `<div class="tabela-filtro-wrap">
        <button type="button" class="tabela-barra-btn" data-tabela-filtrar>${TABELA_ICONE_FUNIL}<span>Filtrar por</span><span class="tabela-filtro-contador" hidden></span></button>
        <div class="tabela-filtro-menu" hidden></div>
      </div>` : ''}
      ${opts.importar ? `<button type="button" class="tabela-barra-btn" data-tabela-importar>${TABELA_ICONE_IMPORTAR}<span>Importar</span></button>` : ''}
      ${opts.exportar ? `<button type="button" class="tabela-barra-btn" data-tabela-exportar>${TABELA_ICONE_EXPORTAR}<span>Exportar</span></button>` : ''}
    </div>`;
  card.classList.add('tem-tabela-barra');
  card.insertBefore(barra, card.firstChild);

  const avisar = () => { if (opts.aoMudar) opts.aoMudar(estado); };
  barra.querySelector('.tabela-busca input').addEventListener('input', (e) => {
    estado.busca = e.target.value.trim().toLowerCase();
    avisar();
  });
  barra.querySelector('[data-tabela-importar]')?.addEventListener('click', () => opts.importar());
  barra.querySelector('[data-tabela-exportar]')?.addEventListener('click', () => opts.exportar(estado));

  if (temFiltros) {
    const btn = barra.querySelector('[data-tabela-filtrar]');
    const menu = barra.querySelector('.tabela-filtro-menu');
    const contador = barra.querySelector('.tabela-filtro-contador');
    const atualizarContador = () => {
      const n = Object.values(estado.filtros).filter(Boolean).length;
      contador.textContent = String(n);
      contador.hidden = n === 0;
      btn.classList.toggle('is-ativo', n > 0);
    };
    const montarMenu = () => {
      menu.innerHTML = opts.filtros.map(f => `
        <label class="tabela-filtro-campo">
          <span>${escapeHtml(f.rotulo)}</span>
          <select class="field-select" data-filtro="${escapeHtml(f.chave)}">
            <option value="">Todos</option>
            ${(f.opcoes() || []).map(([v, t]) => `<option value="${escapeHtml(String(v))}"${estado.filtros[f.chave] === String(v) ? ' selected' : ''}>${escapeHtml(t)}</option>`).join('')}
          </select>
        </label>`).join('') + `<button type="button" class="tabela-filtro-limpar" data-filtro-limpar>Limpar filtros</button>`;
      menu.querySelectorAll('[data-filtro]').forEach(sel => sel.addEventListener('change', () => {
        estado.filtros[sel.dataset.filtro] = sel.value;
        atualizarContador();
        avisar();
      }));
      menu.querySelector('[data-filtro-limpar]').addEventListener('click', () => {
        estado.filtros = {};
        atualizarContador();
        montarMenu();
        avisar();
      });
    };
    const fechar = () => { menu.hidden = true; document.removeEventListener('click', foraDoMenu); };
    const foraDoMenu = (e) => { if (e.target.isConnected && !menu.contains(e.target) && !btn.contains(e.target)) fechar(); };
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (menu.hidden) { montarMenu(); menu.hidden = false; document.addEventListener('click', foraDoMenu); }
      else fechar();
    });
  }
  return estado;
}

/* Texto da linha bate com a busca? (campos: lista de valores da linha) */
function tabelaBateBusca(estado, campos) {
  if (!estado || !estado.busca) return true;
  return campos.some(v => String(v ?? '').toLowerCase().includes(estado.busca));
}

/* ==========================================================================
   Pop-up de confirmação padrão do Hub (no lugar do confirm() do navegador)
   confirmarNoHub({ titulo, texto, botao, perigo, aoConfirmar })
   - aoConfirmar: função (pode ser async). Se lançar erro, a mensagem
     aparece dentro do pop-up e ele continua aberto.
   Devolve uma Promise: true se confirmou (e deu certo), false se cancelou.
   ========================================================================== */
function confirmarNoHub({ titulo, texto = '', botao = 'Confirmar', perigo = false, aoConfirmar } = {}) {
  return new Promise(resolve => {
    const fundo = document.createElement('div');
    fundo.className = 'modal-backdrop show hub-confirmar';
    fundo.innerHTML = `
      <div class="modal-card hub-confirmar-card" role="dialog" aria-modal="true">
        <h3 class="hub-confirmar-titulo">${escapeHtml(titulo || '')}</h3>
        ${texto ? `<p class="hub-confirmar-texto">${escapeHtml(texto)}</p>` : ''}
        <p class="hub-confirmar-erro" hidden></p>
        <div class="hub-confirmar-acoes">
          <button type="button" class="btn-secondary" data-confirmar-cancelar>Cancelar</button>
          <button type="button" class="btn-primary${perigo ? ' btn-danger' : ''}" data-confirmar-ok>${escapeHtml(botao)}</button>
        </div>
      </div>`;
    document.body.appendChild(fundo);
    const okBtn = fundo.querySelector('[data-confirmar-ok]');
    const erroEl = fundo.querySelector('.hub-confirmar-erro');
    let ocupado = false;

    const fechar = (resultado) => {
      document.removeEventListener('keydown', aoTeclar);
      fundo.remove();
      resolve(resultado);
    };
    const aoTeclar = (e) => { if (e.key === 'Escape' && !ocupado) fechar(false); };
    document.addEventListener('keydown', aoTeclar);
    fundo.addEventListener('click', (e) => { if (e.target === fundo && !ocupado) fechar(false); });
    fundo.querySelector('[data-confirmar-cancelar]').addEventListener('click', () => { if (!ocupado) fechar(false); });
    okBtn.addEventListener('click', async () => {
      if (ocupado) return;
      ocupado = true;
      okBtn.disabled = true;
      erroEl.hidden = true;
      try {
        if (aoConfirmar) await aoConfirmar();
        fechar(true);
      } catch (err) {
        erroEl.textContent = (err && err.message) || 'Não foi possível concluir. Tente de novo.';
        erroEl.hidden = false;
        ocupado = false;
        okBtn.disabled = false;
      }
    });
    okBtn.focus();
  });
}

/* ==========================================================================
   Pedido de orçamento enviado pelo anfitrião (love.com.br › Solicitar
   orçamento → function solicitar_orcamento, migration 043). O texto chega
   no chat e no comentário do lead assim:
     Pedido de orçamento — <serviço>
     Evento: <título>
     Data: <data>
     Convidados: <n>
     Mensagem: <texto>
   ========================================================================== */

function lerPedidoOrcamento(texto) {
  const t = String(texto || '').trim();
  if (!/^pedido de orçamento/i.test(t)) return null;
  const linhas = t.split(/\r?\n/).map(s => s.trim()).filter(Boolean);
  const partesTitulo = linhas[0].split(/\s+[—–-]\s+/);
  const campo = (rotulo) => {
    const l = linhas.find(x => x.toLowerCase().startsWith(rotulo.toLowerCase() + ':'));
    return l ? l.slice(rotulo.length + 1).trim() : '';
  };
  let data = campo('Data');
  const iso = data.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (iso) data = `${iso[3]}/${iso[2]}/${iso[1]}`;
  return {
    servico: (partesTitulo[1] || '').trim(),
    evento: campo('Evento'),
    data,
    convidados: parseInt(campo('Convidados'), 10) || null,
    local: campo('Local') || campo('Endereço'),
    mensagem: campo('Mensagem')
  };
}

/* Endereço da Proposta (Vendas) já preenchida com o pedido. */
function urlCriarOrcamento({ leadId, clienteId, servico, data, convidados, evento, local } = {}) {
  const q = new URLSearchParams({ criar: 'orcamento' });
  if (leadId) q.set('lead', leadId);
  if (clienteId) q.set('cliente', clienteId);
  if (servico) q.set('servico', servico);
  if (data) q.set('data', data);
  if (convidados) q.set('convidados', String(convidados));
  if (evento) q.set('evento', evento);
  if (local) q.set('local', local);
  return 'vendas?' + q.toString();
}

/* Card "Solicitação de orçamento" (chat do Hub). attrs: atributos extras do
   botão "Criar orçamento". */
function pedidoOrcamentoCardHtml(p, attrs = '') {
  const linha = (rotulo, valor) => valor ? `<div class="pedido-card-linha"><span>${escapeHtml(rotulo)}</span><strong>${escapeHtml(String(valor))}</strong></div>` : '';
  return `
    <div class="pedido-card">
      <p class="pedido-card-titulo">Solicitação de orçamento</p>
      ${linha('Serviço', p.servico)}
      ${linha('Evento', p.evento)}
      ${linha('Data', p.data)}
      ${linha('Convidados', p.convidados)}
      ${p.mensagem ? `<p class="pedido-card-mensagem">${escapeHtml(p.mensagem)}</p>` : ''}
      <button type="button" class="btn-primary pedido-card-btn" ${attrs}>Criar orçamento</button>
    </div>`;
}

/* Último pedido de orçamento guardado nos comentários do lead (o id do
   comentário começa com "pedido-"). */
function pedidoDoLead(lead) {
  const comentarios = (lead && Array.isArray(lead.comentarios)) ? lead.comentarios : [];
  const pedidos = comentarios.filter(c => String(c && c.id || '').startsWith('pedido-'));
  if (!pedidos.length) return null;
  return lerPedidoOrcamento(pedidos[pedidos.length - 1].text) || {};
}

/* ==========================================================================
   URL do site acompanha o nome da empresa
   Mudou o nome da empresa (Configurações › Perfil): a URL personalizada
   vira o novo nome ("Super Drinks" → super-drinks). Se já estiver em uso
   por outra empresa, ganha um número no fim (super-drinks-2…). Atualiza o
   site publicado (site_pages) e o rascunho do editor guardado no navegador.
   ========================================================================== */
const SLUGS_RESERVADOS_SITE = ['hub', 'www', 'admin', 'api', 'app', 'love'];

function slugDoNome(nome) {
  return String(nome || '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
    .slice(0, 50);
}

async function urlDisponivel(slug, fornecedorId) {
  if (SLUGS_RESERVADOS_SITE.includes(slug)) return false;
  const { data, error } = await supabaseClient.rpc('verificar_site_slug_disponivel', { p_slug: slug, p_fornecedor_id: fornecedorId });
  return !error && data !== false;
}

/* Primeira URL livre a partir do nome: super-drinks, super-drinks-2, -3… */
async function sugerirUrlDisponivel(nome, fornecedorId) {
  const base = slugDoNome(nome);
  if (!base) return '';
  let slug = base;
  for (let n = 2; n < 50 && !(await urlDisponivel(slug, fornecedorId)); n++) slug = `${base}-${n}`;
  return slug;
}

async function atualizarUrlDoSitePeloNome(nome) {
  // Só no Gratuito: no Pro o subdomínio é escolhido pela pessoa (Ajustes do
  // editor), com troca a cada 14 dias.
  if (typeof B2B_DATA !== 'undefined' && B2B_DATA.professional.plan === 'Pro') return null;
  const session = window.b2bSession || (await supabaseClient.auth.getSession()).data.session;
  if (!session) return null;
  const fid = empresaId(session);
  const slug = await sugerirUrlDisponivel(nome, fid);
  if (!slug) return null;

  // Site já publicado: troca a URL e o slug guardado no estado.
  const { data: pagina } = await supabaseClient.from('site_pages').select('slug, state').eq('fornecedor_id', fid).maybeSingle();
  if (pagina && pagina.slug !== slug) {
    const state = pagina.state || {};
    state.siteSettings = Object.assign({}, state.siteSettings, { slug });
    const { error } = await supabaseClient.from('site_pages')
      .update({ slug, state, updated_at: new Date().toISOString() }).eq('fornecedor_id', fid);
    if (error) { console.warn('Não foi possível trocar a URL do site.', error); return null; }
  }

  // Rascunho do editor neste navegador (senão a próxima publicação voltaria a URL antiga).
  ['b2b-site-builder-page', 'b2b-site-builder-published-state'].forEach(chave => {
    try {
      const salvo = JSON.parse(localStorage.getItem(chave) || 'null');
      if (salvo && salvo.siteSettings) {
        salvo.siteSettings.slug = slug;
        localStorage.setItem(chave, JSON.stringify(salvo));
      }
    } catch (e) { /* rascunho inválido: o editor sugere a URL pelo nome */ }
  });
  return slug;
}
