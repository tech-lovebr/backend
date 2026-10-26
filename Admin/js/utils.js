/* ==========================================================================
   LOVE ADMIN — Utilitários compartilhados
   ========================================================================== */

/* ------------------------------------------------------------ Formatação */

const BRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

function formatCurrency(value) {
  return BRL.format(Number(value) || 0);
}

function formatNumber(value) {
  return new Intl.NumberFormat('pt-BR').format(Number(value) || 0);
}

/* ------------------------------------------------------------ Convidados
   Uma linha de `convidados` é uma reserva: o convidado e os acompanhantes
   dele, guardados em `extra` pela plataforma. Conta-se pessoas, não
   linhas — a mesma regra de pessoasDaReserva em js/app.js (1 + 1 = 2). */

function pessoasDoConvidado(g) {
  const extra = (g && g.extra) || {};
  const nomes = (extra.companionsNames || []).filter(n => String(n || '').trim()).length;
  const detalhados = (extra.companionsDetailed || []).length;
  return 1 + Math.max(nomes, detalhados, parseInt(extra.companions, 10) || 0);
}

/** Crianças na reserva: o próprio convidado, se for criança, e os acompanhantes criança/bebê. */
function criancasDoConvidado(g) {
  const extra = (g && g.extra) || {};
  const acompanhantes = Number.isFinite(extra.children)
    ? extra.children
    : (extra.companionsDetailed || []).filter(c => c.ageGroup === 'child' || c.ageGroup === 'baby').length;
  return acompanhantes + (g.tipo === 'crianca' ? 1 : 0);
}

function formatDate(value) {
  if (!value) return '—';
  // Datas puras (YYYY-MM-DD) são interpretadas como UTC pelo Date e podem
  // "voltar um dia" no fuso do Brasil — por isso monta na mão.
  const dateOnly = /^\d{4}-\d{2}-\d{2}$/.exec(String(value));
  if (dateOnly) {
    const [y, m, d] = value.split('-');
    return `${d}/${m}/${y}`;
  }
  const dt = new Date(value);
  if (Number.isNaN(dt.getTime())) return '—';
  return dt.toLocaleDateString('pt-BR');
}

function formatDateTime(value) {
  if (!value) return '—';
  const dt = new Date(value);
  if (Number.isNaN(dt.getTime())) return '—';
  return dt.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function formatRelative(value) {
  if (!value) return '—';
  const dt = new Date(value);
  if (Number.isNaN(dt.getTime())) return '—';
  const diff = Date.now() - dt.getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return 'agora';
  if (min < 60) return `há ${min} min`;
  const hours = Math.floor(min / 60);
  if (hours < 24) return `há ${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `há ${days}d`;
  return formatDate(value);
}

function initials(name) {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '—';
  return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
}

/** Escapa texto vindo do banco antes de injetar em innerHTML. */
function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function dash(value) {
  const str = String(value ?? '').trim();
  return str ? escapeHtml(str) : '<span class="cell-muted">—</span>';
}

/* --------------------------------------------------------------- Rótulos */

/* ------------------------------------------- Pagamentos processados
   Tudo o que passou pela Love e rendeu comissão: presentes pagos pelos
   convidados e links de pagamento pagos no Hub. Cada um com o gateway que
   processou, a comissão da Love e o repasse (split) para o anfitrião ou o
   fornecedor. Sem a comissão gravada pelo gateway, vale a taxa padrão. */

const COMISSAO_PADRAO = { presentes: 0.0389, contratos: 0.0389 };
const NOME_GATEWAY = { asaas: 'Asaas' };
const NOME_METODO = { pix: 'Pix', cartao: 'Cartão', apple_pay: 'Apple Pay', boleto: 'Boleto', credit_card: 'Cartão' };

function pagamentosProcessados(contribuicoes, links) {
  const montar = (origem, x, valor, em) => {
    const comissao = x.comissao_love != null ? Number(x.comissao_love) : valor * COMISSAO_PADRAO[origem];
    const repasse = x.repasse != null ? Number(x.repasse) : valor - comissao;
    return { origem, id: x.id, em, valor, comissao, repasse, gateway: x.gateway || null, metodo: x.metodo || null, estimada: x.comissao_love == null, bruto: x };
  };
  const presentes = (contribuicoes || []).filter(c => c.status === 'pago')
    .map(c => montar('presentes', c, Number(c.valor) || 0, c.pago_em || c.created_at));
  const contratos = (links || []).filter(l => l.status === 'pago')
    .map(l => montar('contratos', l, Number(l.amount) || 0, l.paid_at || l.created_at));
  return [...presentes, ...contratos].filter(p => p.em);
}

const EVENT_TYPE_LABELS = {
  wedding: 'Casamento',
  baby: 'Chá de bebê',
  birthday: 'Aniversário',
  corporate: 'Corporativo',
  other: 'Outro'
};

const TICKET_STATUS_LABELS = {
  aberto: 'Aberto',
  em_andamento: 'Em andamento',
  aguardando_cliente: 'Aguardando cliente',
  respondida_bot: 'Respondida pelo robô',
  resolvido: 'Resolvido',
  fechado: 'Fechado',
  spam: 'Spam'
};

const TICKET_STATUS_BADGE = {
  aberto: 'badge-warning',
  em_andamento: 'badge-info',
  aguardando_cliente: 'badge-info',
  respondida_bot: 'badge-info',
  resolvido: 'badge-success',
  fechado: 'badge',
  spam: 'badge-danger'
};

const ORIGEM_LABELS = {
  site: 'Site público',
  cliente: 'Plataforma (cliente)',
  fornecedor: 'Fornecedor'
};

function badge(text, variant) {
  return `<span class="badge ${variant || ''}">${escapeHtml(text)}</span>`;
}

/* ----------------------------------------------------------------- Toast */

let toastTimer = null;

function toast(message) {
  let el = document.getElementById('admin-toast');
  if (!el) {
    el = document.createElement('div');
    el.id = 'admin-toast';
    el.className = 'toast';
    document.body.appendChild(el);
  }
  el.textContent = message;
  el.classList.add('is-open');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('is-open'), 2800);
}

/* ---------------------------------------------------------------- Drawer */

/**
 * Painel lateral de detalhe/edição. Reutilizado por todas as páginas.
 * Cria o backdrop e o container uma única vez e depois só troca o conteúdo.
 */
const Drawer = {
  _built: false,

  _build() {
    if (this._built) return;
    const backdrop = document.createElement('div');
    backdrop.className = 'drawer-backdrop';
    backdrop.id = 'drawer-backdrop';
    backdrop.addEventListener('click', () => Drawer.close());

    const panel = document.createElement('aside');
    panel.className = 'drawer';
    panel.id = 'drawer-panel';
    panel.innerHTML = `
      <header class="drawer-head">
        <button type="button" class="drawer-back" id="drawer-back" aria-label="Voltar" hidden>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7"/></svg>
        </button>
        <div style="flex:1;min-width:0">
          <h2 id="drawer-title">Detalhes</h2>
          <p id="drawer-subtitle"></p>
        </div>
        <button type="button" class="btn btn-ghost btn-sm" id="drawer-close" aria-label="Fechar">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" d="M6 18 18 6M6 6l12 12"/></svg>
        </button>
      </header>
      <div class="drawer-body" id="drawer-body"></div>
      <footer class="drawer-foot" id="drawer-foot"></footer>`;

    document.body.append(backdrop, panel);
    panel.querySelector('#drawer-close').addEventListener('click', () => Drawer.close());
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') Drawer.close(); });
    this._built = true;
  },

  /* Na mesma caixa: emLinha = { host, esconder: [elementos] }. O painel é
     desenhado dentro de host, no lugar do que está em esconder (a tabela). */
  _linha: null,

  /* Padrão do Admin: tudo abre na mesma caixa, no lugar do conteúdo da tela
     (tabela, cards…), com o formulário centralizado — como as Configurações
     do love.com.br. Pop-up só com { popup: true }. */
  _alvoAutomatico() {
    if (this._linha) return this._linha; // já tem painel aberto: troca só o conteúdo
    const conteudo = document.querySelector('.admin-content');
    if (!conteudo) return null;
    let host = document.getElementById('painel-auto');
    if (!host) {
      host = document.createElement('div');
      host.id = 'painel-auto';
      host.hidden = true;
    }
    const cabecalho = conteudo.querySelector(':scope > .admin-header-bar');
    const esconder = [...conteudo.children].filter(el =>
      el !== host && el !== cabecalho && !el.hidden && el.offsetParent !== null);
    const acoes = document.getElementById('header-actions');
    if (acoes && !acoes.hidden) esconder.push(acoes);
    if (cabecalho) cabecalho.after(host); else conteudo.prepend(host);
    return { host, esconder, auto: true };
  },

  _abrirEmLinha({ emLinha, title, subtitle, subtitleHtml, body, footer, back }) {
    const { host, esconder = [] } = emLinha;
    esconder.forEach(el => { if (el) el.hidden = true; });
    host.innerHTML = `
      <section class="card painel-linha ${emLinha.auto ? 'painel-centro' : ''}">
        <header class="painel-linha-cabeca">
          <button type="button" class="header-bar-voltar painel-linha-voltar" title="Voltar" aria-label="Voltar">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M15 6l-6 6l6 6" /></svg>
          </button>
          <div class="painel-linha-titulos">
            <h2 id="painel-linha-titulo">${escapeHtml(title || 'Detalhes')}</h2>
            ${subtitleHtml ? `<p>${subtitleHtml}</p>` : subtitle ? `<p>${escapeHtml(subtitle)}</p>` : ''}
          </div>
        </header>
        <div class="painel-linha-corpo" id="painel-linha-corpo">${body || ''}</div>
        ${footer ? `<footer class="painel-linha-pe" id="painel-linha-pe">${footer}</footer>` : ''}
      </section>`;
    host.querySelector('.painel-linha-voltar').addEventListener('click', back || (() => Drawer.close()));
    host.hidden = false;
    this._linha = emLinha;
    window.scrollTo(0, 0);
  },

  _fecharLinha() {
    const l = this._linha;
    if (!l) return;
    l.host.hidden = true;
    l.host.innerHTML = '';
    (l.esconder || []).forEach(el => { if (el) el.hidden = false; });
    this._linha = null;
  },

  _overlayAberto() {
    return this._built && document.getElementById('drawer-panel').classList.contains('is-open');
  },

  /** Título do painel aberto (pop-up ou na mesma caixa). */
  titulo() {
    return this._overlayAberto() || !this._linha
      ? document.getElementById('drawer-title')
      : document.getElementById('painel-linha-titulo');
  },

  /** Corpo do painel aberto (pop-up ou na mesma caixa). */
  corpo() {
    return this._overlayAberto() || !this._linha
      ? document.getElementById('drawer-body')
      : document.getElementById('painel-linha-corpo');
  },

  /** `back`, quando informado, mostra a seta de voltar no cabeçalho. */
  open({ title, subtitle, subtitleHtml, body, footer, back, semTitulo = false, semLinha = false, emLinha = null, popup = false }) {
    if (!emLinha && !popup && !this._overlayAberto()) emLinha = this._alvoAutomatico();
    if (emLinha) return this._abrirEmLinha({ emLinha, title, subtitle, subtitleHtml, body, footer, back });
    this._build();
    document.getElementById('drawer-panel').classList.toggle('drawer-sem-titulo', semTitulo);
    // semLinha: cabeçalho só com o título, sem a linha embaixo.
    document.getElementById('drawer-panel').classList.toggle('drawer-sem-linha', semLinha);

    const btnBack = document.getElementById('drawer-back');
    btnBack.hidden = !back;
    btnBack.onclick = back || null;

    document.getElementById('drawer-title').textContent = title || 'Detalhes';
    const sub = document.getElementById('drawer-subtitle');
    // textContent por padrão; só quem passa subtitleHtml assume o escape.
    if (subtitleHtml) sub.innerHTML = subtitleHtml;
    else sub.textContent = subtitle || '';
    document.getElementById('drawer-body').innerHTML = body || '';
    document.getElementById('drawer-foot').innerHTML = footer || '';
    document.getElementById('drawer-backdrop').classList.add('is-open');
    document.getElementById('drawer-panel').classList.add('is-open');
    document.body.style.overflow = 'hidden';
  },

  close() {
    // Fecha o pop-up se ele estiver aberto; senão, o painel na mesma caixa.
    if (!this._overlayAberto()) { this._fecharLinha(); return; }
    document.getElementById('drawer-backdrop').classList.remove('is-open');
    document.getElementById('drawer-panel').classList.remove('is-open');
    document.body.style.overflow = '';
  },

  setFooterBusy(busy) {
    const foot = this._overlayAberto() || !this._linha
      ? document.getElementById('drawer-foot')
      : document.getElementById('painel-linha-pe');
    if (foot) foot.querySelectorAll('button').forEach(b => { b.disabled = busy; });
  }
};

/* ---------------------------------------------------- Filtro de período
   O mesmo do Dashboard: botão com o período e um calendário com atalhos.
   `estado` = { de, ate } é atualizado no lugar; aoAplicar redesenha a tela. */

function periodoEsteMes() {
  const h = new Date();
  return { de: new Date(h.getFullYear(), h.getMonth(), 1), ate: new Date(h.getFullYear(), h.getMonth(), h.getDate(), 23, 59, 59, 999) };
}

function dentroDoPeriodo(estado, data) {
  if (!estado.de && !estado.ate) return true;
  if (!data) return false;
  const t = new Date(data).getTime();
  return (!estado.de || t >= estado.de.getTime()) && (!estado.ate || t <= estado.ate.getTime());
}

function rotuloDePeriodo(estado) {
  const { de, ate } = estado;
  const dia = d => d.toLocaleDateString('pt-BR');
  if (!de && !ate) return 'Todo o período';
  const hoje = new Date();
  if (de && ate && de.getDate() === 1 && de.getMonth() === hoje.getMonth() && de.getFullYear() === hoje.getFullYear()
      && dia(ate) === dia(hoje)) return 'Este mês';
  if (de && ate && dia(de) === dia(ate) && dia(de) === dia(hoje)) return 'Hoje';
  if (de && ate && dia(de) === dia(ate)) return dia(de);
  if (de && ate) return `${dia(de)} – ${dia(ate)}`;
  return de ? `A partir de ${dia(de)}` : `Até ${dia(ate)}`;
}

function filtroDePeriodo(estado, aoAplicar) {
  const host = document.getElementById('header-actions');
  if (!host) return;

  const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
  const SEMANA = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];
  const ATALHOS = [['hoje', 'Hoje'], ['7', 'Últimos 7 dias'], ['30', 'Últimos 30 dias'], ['mes', 'Este mês'], ['tudo', 'Todo o período']];
  const formatarDia = d => d.toLocaleDateString('pt-BR');
  const temPeriodo = () => Boolean(estado.de || estado.ate);

  const wrap = document.createElement('div');
  wrap.className = 'filtro-wrap';
  wrap.innerHTML = `
    <button type="button" class="btn btn-ghost btn-periodo ${temPeriodo() ? 'is-ativo' : ''}" id="btn-periodo" aria-expanded="false" aria-controls="periodo-menu">
      <span id="periodo-rotulo">${rotuloDePeriodo(estado)}</span>
      <svg class="btn-periodo-seta" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6l6 -6"/></svg>
    </button>

    <div class="filtro-menu periodo-menu periodo-calendario" id="periodo-menu" hidden>
      <div class="cal-atalhos">
        ${ATALHOS.map(([v, r]) => `<button type="button" class="cal-atalho" data-atalho="${v}">${r}</button>`).join('')}
      </div>
      <div class="cal-corpo">
        <div class="cal-topo">
          <button type="button" class="cal-nav" data-mes="-1" aria-label="Mês anterior"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 6l-6 6l6 6"/></svg></button>
          <span class="cal-mes" id="cal-mes"></span>
          <button type="button" class="cal-nav" data-mes="1" aria-label="Próximo mês"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6l6 6l-6 6"/></svg></button>
        </div>
        <div class="cal-semana">${SEMANA.map(d => `<span>${d}</span>`).join('')}</div>
        <div class="cal-dias" id="cal-dias"></div>
        <p class="cal-dica" id="cal-dica">Clique num dia, ou em dois para um intervalo.</p>
        <button type="button" class="btn btn-neutro periodo-aplicar" id="periodo-aplicar">Aplicar</button>
      </div>
    </div>`;
  host.prepend(wrap);

  const botao = wrap.querySelector('#btn-periodo');
  const menu = /** @type {HTMLElement} */ (wrap.querySelector('#periodo-menu'));
  const dias = wrap.querySelector('#cal-dias');
  const dica = wrap.querySelector('#cal-dica');
  const inicioDoDia = d => new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const fimDoDia = d => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
  const hoje = inicioDoDia(new Date());

  /** @type {Date | null} */ let selDe = estado.de && inicioDoDia(estado.de);
  /** @type {Date | null} */ let selAte = estado.ate && inicioDoDia(estado.ate);
  let mesVisto = new Date((selAte || hoje).getFullYear(), (selAte || hoje).getMonth(), 1);

  function desenhar() {
    wrap.querySelector('#cal-mes').textContent = `${MESES[mesVisto.getMonth()]} ${mesVisto.getFullYear()}`;
    const primeiro = new Date(mesVisto.getFullYear(), mesVisto.getMonth(), 1);
    const total = new Date(mesVisto.getFullYear(), mesVisto.getMonth() + 1, 0).getDate();
    let html = '<span></span>'.repeat(primeiro.getDay());
    for (let n = 1; n <= total; n++) {
      const t = new Date(mesVisto.getFullYear(), mesVisto.getMonth(), n).getTime();
      const classes = ['cal-dia'];
      if (t === hoje.getTime()) classes.push('is-hoje');
      if (selDe && t === selDe.getTime()) classes.push('is-inicio');
      if (selAte && t === selAte.getTime()) classes.push('is-fim');
      if (selDe && selAte && t > selDe.getTime() && t < selAte.getTime()) classes.push('is-meio');
      html += `<button type="button" class="${classes.join(' ')}" data-dia="${t}" ${t > hoje.getTime() ? 'disabled' : ''}>${n}</button>`;
    }
    dias.innerHTML = html;
    const proximo = new Date(mesVisto.getFullYear(), mesVisto.getMonth() + 1, 1);
    /** @type {HTMLButtonElement} */ (wrap.querySelector('[data-mes="1"]')).disabled = proximo > hoje;
    dica.textContent = !selDe ? 'Clique num dia, ou em dois para um intervalo.'
      : selAte && selAte.getTime() !== selDe.getTime() ? `${formatarDia(selDe)} – ${formatarDia(selAte)}`
      : `${formatarDia(selDe)} · clique em outro dia para um intervalo`;
  }

  const fechar = () => { menu.hidden = true; botao.setAttribute('aria-expanded', 'false'); };

  /** @param {Date | null} de @param {Date | null} ate */
  function aplicar(de, ate) {
    estado.de = de && inicioDoDia(de);
    estado.ate = ate && fimDoDia(ate);
    wrap.querySelector('#periodo-rotulo').textContent = rotuloDePeriodo(estado);
    botao.classList.toggle('is-ativo', temPeriodo());
    fechar();
    aoAplicar();
  }

  botao.addEventListener('click', e => {
    e.stopPropagation();
    const abrir = menu.hidden;
    if (abrir) {
      selDe = estado.de && inicioDoDia(estado.de);
      selAte = estado.ate && inicioDoDia(estado.ate);
      const ref = selAte || hoje;
      mesVisto = new Date(ref.getFullYear(), ref.getMonth(), 1);
      desenhar();
    }
    menu.hidden = !abrir;
    botao.setAttribute('aria-expanded', String(abrir));
  });
  menu.addEventListener('click', e => e.stopPropagation());
  document.addEventListener('click', fechar);
  document.addEventListener('keydown', e => { if (e.key === 'Escape') fechar(); });

  wrap.querySelectorAll('[data-mes]').forEach(b => b.addEventListener('click', () => {
    mesVisto = new Date(mesVisto.getFullYear(), mesVisto.getMonth() + Number(/** @type {HTMLElement} */ (b).dataset.mes), 1);
    desenhar();
  }));

  dias.addEventListener('click', e => {
    const alvo = /** @type {HTMLElement} */ (e.target).closest('[data-dia]');
    if (!alvo) return;
    const d = new Date(Number(/** @type {HTMLElement} */ (alvo).dataset.dia));
    if (!selDe || (selAte && selAte.getTime() !== selDe.getTime())) { selDe = d; selAte = d; }
    else if (d < selDe) { selAte = selDe; selDe = d; }
    else selAte = d;
    desenhar();
  });

  wrap.querySelector('#periodo-aplicar').addEventListener('click', () => {
    if (!selDe) return toast('Escolha um dia no calendário.');
    aplicar(selDe, selAte || selDe);
  });

  wrap.querySelectorAll('[data-atalho]').forEach(b => b.addEventListener('click', () => {
    const v = /** @type {HTMLElement} */ (b).dataset.atalho;
    const menos = n => new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() - n);
    if (v === 'hoje') aplicar(hoje, hoje);
    else if (v === '7') aplicar(menos(6), hoje);
    else if (v === '30') aplicar(menos(29), hoje);
    else if (v === 'mes') aplicar(new Date(hoje.getFullYear(), hoje.getMonth(), 1), hoje);
    else aplicar(null, null);
  }));
}

/* ---------------------------------------------------- Estados de tabela */

function renderEmpty(tbody, colspan, title, text) {
  tbody.innerHTML = `
    <tr class="no-hover"><td colspan="${colspan}">
      <div class="empty-state">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path stroke-linecap="round" stroke-linejoin="round" d="M3.75 6A2.25 2.25 0 0 1 6 3.75h12A2.25 2.25 0 0 1 20.25 6v12A2.25 2.25 0 0 1 18 20.25H6A2.25 2.25 0 0 1 3.75 18V6Z"/><path stroke-linecap="round" d="M7.5 9h9M7.5 12.75h6"/></svg>
        <strong>${escapeHtml(title)}</strong>
        <p>${escapeHtml(text)}</p>
      </div>
    </td></tr>`;
}

function renderLoading(tbody, colspan, rows = 5) {
  tbody.innerHTML = Array.from({ length: rows }, () =>
    `<tr class="no-hover"><td colspan="${colspan}"><div class="skeleton" style="width:${60 + Math.floor(Math.random() * 35)}%"></div></td></tr>`
  ).join('');
}

/**
 * Erro de consulta. O caso mais comum aqui é a migration 004_admin.sql ainda
 * não ter sido rodada — então a mensagem diz isso em vez de só "erro".
 */
function renderError(tbody, colspan, error) {
  const missingTable = error && (error.code === '42P01' || /does not exist/i.test(error.message || ''));
  const title = missingTable ? 'Tabela ainda não existe no banco' : 'Não foi possível carregar';
  const text = missingTable
    ? 'Rode supabase/migrations/004_admin.sql no SQL Editor do Supabase para criar as tabelas do Admin.'
    : (error?.message || 'Erro desconhecido ao consultar o banco.');
  renderEmpty(tbody, colspan, title, text);
}

/* ------------------------------------------------------------- Consultas */

/** Soma `amount` de créditos menos débitos de uma lista de transações. */
function walletBalance(transactions) {
  return (transactions || []).reduce(
    (sum, t) => sum + (t.type === 'credit' ? Number(t.amount) || 0 : -(Number(t.amount) || 0)),
    0
  );
}

/** Agrupa linhas por uma chave, devolvendo um Map. */
function groupBy(rows, key) {
  const map = new Map();
  (rows || []).forEach(row => {
    const k = row[key];
    if (!map.has(k)) map.set(k, []);
    map.get(k).push(row);
  });
  return map;
}

/**
 * Consulta tolerante: se a tabela ainda não existe (migration não rodada),
 * devolve lista vazia em vez de quebrar a página inteira.
 */
async function safeSelect(table, columns = '*', tweak) {
  let query = supabaseClient.from(table).select(columns);
  if (tweak) query = tweak(query);
  const { data, error } = await query;
  if (error) {
    console.warn(`[admin] falha ao consultar "${table}":`, error.message);
    return { data: [], error };
  }
  return { data: data || [], error: null };
}

/* --------------------------------------------------------- Exportar CSV */

/**
 * Baixa uma lista como CSV. Usa ponto e vírgula e BOM porque é o que o
 * Excel em português entende sem pedir importação manual.
 *
 * @param {string} nomeArquivo  sem extensão
 * @param {Array<{titulo: string, valor: Function}>} colunas
 * @param {Array<Object>} linhas
 */
function exportarCSV(nomeArquivo, colunas, linhas) {
  const escapar = (valor) => {
    const texto = String(valor ?? '').replace(/"/g, '""');
    return `"${texto}"`;
  };

  const conteudo = [
    colunas.map(c => escapar(c.titulo)).join(';'),
    ...linhas.map(linha => colunas.map(c => escapar(c.valor(linha))).join(';'))
  ].join('\r\n');

  const blob = new Blob(['﻿' + conteudo], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  const hoje = new Date().toISOString().slice(0, 10);
  link.href = url;
  link.download = `${nomeArquivo}-${hoje}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);

  toast(`${formatNumber(linhas.length)} registro(s) exportado(s).`);
}

/** Cria o botão de ação no cabeçalho da página (ao lado do título). */
/**
 * Barra no topo da caixa da tabela (busca à esquerda; filtros e Exportar à
 * direita). Criada na primeira vez que alguém pede; null se a página não
 * tem tabela.
 */
function barraDaTabela() {
  const card = document.querySelector('.admin-content .table-card');
  if (!card) return null;
  let barra = card.querySelector(':scope > .table-toolbar');
  if (!barra) {
    barra = document.createElement('div');
    barra.className = 'table-toolbar';
    barra.innerHTML = '<div class="table-toolbar-esq"></div><div class="table-toolbar-dir"></div>';
    card.prepend(barra);
  }
  return barra;
}

function addHeaderAction(texto, aoClicar, { icone, principal } = {}) {
  // Exportar é ação da tabela, não da página: vai para a barra da tabela.
  const barra = texto === 'Exportar' ? barraDaTabela() : null;
  const host = barra ? barra.lastElementChild : document.getElementById('header-actions');
  if (!host) return null;

  const botao = document.createElement('button');
  botao.type = 'button';
  // Ação principal da página (criar, cadastrar): o mesmo botão cinza claro
  // em todas as telas. As demais (Exportar, Voltar) ficam no estilo neutro.
  botao.className = principal ? 'btn btn-neutro btn-principal' : 'btn btn-ghost';
  // Seta para cima, saindo da bandeja: exportar. A de baixo seria importar.
  // `icone: null` pede um botão só de texto; omitir usa o padrão.
  const padrao = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2 -2v-2" /><path d="M7 9l5 -5l5 5" /><path d="M12 4l0 12" /></svg>';

  botao.innerHTML = `
    ${icone === null ? '' : (icone || padrao)}
    <span>${escapeHtml(texto)}</span>`;
  botao.addEventListener('click', aoClicar);
  if (barra) botao.dataset.exportar = '';
  host.appendChild(botao);
  return botao;
}

/**
 * Numera cadastros pela ordem de entrada: 1 para o mais antigo. É por
 * plataforma — no dashboard, onde as duas aparecem juntas, quem desfaz a
 * ambiguidade é a coluna Canal ao lado.
 *
 * É posicional, não persistente: excluir um cadastro faz os posteriores
 * subirem. O identificador estável continua sendo o UID.
 */
function sequenciaDeCadastro(linhas) {
  return new Map(
    (linhas || [])
      .slice()
      .sort((a, b) => new Date(a.created_at || 0) - new Date(b.created_at || 0))
      .map((linha, i) => [linha.id, String(i + 1)])
  );
}

/* ------------------------------------------------------------- Modal

   Diálogo curto e centrado, para decisões que não cabem num drawer: uma
   pergunta e até três saídas. O Drawer é para examinar um registro; isto
   é para confirmar uma ação sobre vários.
   -------------------------------------------------------------------- */

const Modal = {
  _built: false,

  _build() {
    if (this._built) return;

    const fundo = document.createElement('div');
    fundo.className = 'modal-fundo';
    fundo.id = 'modal-fundo';
    fundo.innerHTML = `
      <div class="modal-caixa" role="dialog" aria-modal="true" aria-labelledby="modal-titulo">
        <h2 class="modal-titulo" id="modal-titulo"></h2>
        <p class="modal-texto" id="modal-texto"></p>
        <input class="field-input modal-campo" id="modal-campo" autocomplete="off" hidden>
        <div class="modal-acoes" id="modal-acoes"></div>
      </div>`;

    // Clicar fora fecha; clicar dentro, não.
    fundo.addEventListener('click', () => Modal.fechar());
    fundo.querySelector('.modal-caixa').addEventListener('click', e => e.stopPropagation());
    document.addEventListener('keydown', e => { if (e.key === 'Escape') Modal.fechar(); });

    document.body.appendChild(fundo);
    this._built = true;
  },

  /** `acoes`: [{ rotulo, classe, aoClicar }] — a última fica à direita. */
  /**
   * @param {{ titulo?: string, texto?: string, acoes?: { rotulo: string, classe?: string, icone?: string, aoClicar?: (b: HTMLButtonElement) => void }[],
   *           campo?: { tipo?: string, placeholder?: string, valor?: string }, aoFechar?: () => void }} opcoes
   */
  abrir({ titulo, texto, acoes = [], campo, aoFechar }) {
    this._build();
    this._aoFechar = aoFechar || null;

    document.getElementById('modal-titulo').textContent = titulo || '';
    document.getElementById('modal-texto').textContent = texto || '';

    const host = document.getElementById('modal-acoes');
    host.innerHTML = '';

    acoes.forEach(acao => {
      const botao = document.createElement('button');
      botao.type = 'button';
      botao.className = `btn ${acao.classe || 'btn-ghost'}`;
      // Ação só com ícone (ex.: lixeira): o rótulo vira o nome acessível.
      if (acao.icone) {
        botao.innerHTML = acao.icone;
        botao.setAttribute('aria-label', acao.rotulo);
        botao.title = acao.rotulo;
      } else {
        botao.textContent = acao.rotulo;
      }
      botao.addEventListener('click', () => acao.aoClicar?.(botao));
      host.appendChild(botao);
    });

    // Campo de texto opcional (ex.: endereço do link). Enter confirma pela
    // última ação, que é sempre a principal.
    const entrada = /** @type {HTMLInputElement} */ (document.getElementById('modal-campo'));
    entrada.hidden = !campo;
    entrada.onkeydown = null;
    if (campo) {
      entrada.type = campo.tipo || 'text';
      entrada.placeholder = campo.placeholder || '';
      entrada.value = campo.valor || '';
      entrada.onkeydown = (e) => {
        if (e.key !== 'Enter') return;
        e.preventDefault();
        /** @type {HTMLButtonElement} */ (host.lastElementChild)?.click();
      };
      setTimeout(() => { entrada.focus(); entrada.select(); }, 30);
    }

    document.getElementById('modal-fundo').classList.add('is-open');
    document.body.style.overflow = 'hidden';
  },

  ocupado(estado) {
    document.querySelectorAll('#modal-acoes .btn').forEach(b => { b.disabled = estado; });
  },

  fechar() {
    const fundo = document.getElementById('modal-fundo');
    if (!fundo) return;
    fundo.classList.remove('is-open');
    document.body.style.overflow = '';
    const aoFechar = this._aoFechar;
    this._aoFechar = null;
    aoFechar?.();
  },

  /** Texto digitado no campo do modal. */
  valor() {
    return /** @type {HTMLInputElement} */ (document.getElementById('modal-campo'))?.value.trim() || '';
  }
};

/* Janelas da própria Love no lugar das do navegador (confirm/prompt): o
   Admin nunca abre a caixinha cinza do navegador. */

/**
 * @param {string} texto
 * @param {{ titulo?: string, rotulo?: string, perigo?: boolean }} [opcoes]
 * @returns {Promise<boolean>}
 */
function confirmar(texto, { titulo = 'Tem certeza?', rotulo = 'Confirmar', perigo = false } = {}) {
  return new Promise(resolve => {
    let ok = false;
    Modal.abrir({
      titulo,
      texto,
      aoFechar: () => resolve(ok),
      acoes: [
        { rotulo: 'Cancelar', aoClicar: () => Modal.fechar() },
        { rotulo, classe: perigo ? 'btn-danger' : 'btn-neutro', aoClicar: () => { ok = true; Modal.fechar(); } }
      ]
    });
  });
}

/**
 * @param {{ titulo: string, texto?: string, placeholder?: string, valor?: string, rotulo?: string, tipo?: string }} opcoes
 * @returns {Promise<string | null>} null se cancelar
 */
function pedirTexto({ titulo, texto = '', placeholder = '', valor = '', rotulo = 'Inserir', tipo = 'text' }) {
  return new Promise(resolve => {
    let resposta = null;
    Modal.abrir({
      titulo,
      texto,
      campo: { placeholder, valor, tipo },
      aoFechar: () => resolve(resposta),
      acoes: [
        { rotulo: 'Cancelar', aoClicar: () => Modal.fechar() },
        { rotulo, classe: 'btn-neutro', aoClicar: () => { resposta = Modal.valor(); Modal.fechar(); } }
      ]
    });
  });
}

/* ------------------------------------------------------- Busca global */

/**
 * Paleta de busca do cabeçalho (o mesmo ⌘K do B2B). Carrega as tabelas na
 * primeira abertura e mantém em memória enquanto a página viver.
 */
const Busca = {
  _montada: false,
  _dados: null,

  _montar() {
    if (this._montada) return;

    const fundo = document.createElement('div');
    fundo.className = 'busca-backdrop';
    fundo.id = 'busca-backdrop';
    fundo.innerHTML = `
      <div class="busca-card" role="dialog" aria-label="Busca">
        <div class="busca-campo">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 10a7 7 0 1 0 14 0a7 7 0 1 0 -14 0" /><path d="M21 21l-6 -6" /></svg>
          <input type="text" id="busca-input" placeholder="Buscar fornecedor, cliente, evento ou chamado…" autocomplete="off">
          <kbd>ESC</kbd>
        </div>
        <div class="busca-resultados" id="busca-resultados"></div>
      </div>`;

    document.body.appendChild(fundo);

    fundo.addEventListener('click', (e) => { if (e.target === fundo) Busca.fechar(); });
    document.getElementById('busca-input').addEventListener('input', (e) => Busca._render(e.target.value));

    this._montada = true;
  },

  async abrir() {
    this._montar();
    document.getElementById('busca-backdrop').classList.add('is-open');
    document.body.style.overflow = 'hidden';

    const campo = document.getElementById('busca-input');
    campo.value = '';
    campo.focus();

    this._render('');
    if (!this._dados) await this._carregar();
    this._render(campo.value);
  },

  fechar() {
    const fundo = document.getElementById('busca-backdrop');
    if (!fundo) return;
    fundo.classList.remove('is-open');
    document.body.style.overflow = '';
  },

  async _carregar() {
    const [fornecedores, clientes, eventos, tickets] = await Promise.all([
      safeSelect('fornecedores', 'id, company_name, email, cnpj'),
      safeSelect('clientes', 'id, couple_name, email, phone'),
      safeSelect('eventos', 'id, titulo, host_name, slug, tipo'),
      safeSelect('tickets', 'id, protocolo, nome, email, assunto')
    ]);

    this._dados = [
      ...fornecedores.data.map(f => ({
        grupo: 'Fornecedores', titulo: f.company_name,
        sub: [f.email, f.cnpj].filter(Boolean).join(' · '),
        href: `fornecedores.html?q=${encodeURIComponent(f.company_name || '')}`
      })),
      ...clientes.data.map(c => ({
        grupo: 'Clientes', titulo: c.couple_name,
        sub: [c.email, c.phone].filter(Boolean).join(' · '),
        href: `clientes.html?q=${encodeURIComponent(c.couple_name || '')}`
      })),
      ...eventos.data.map(e => ({
        grupo: 'Eventos', titulo: e.titulo,
        sub: [EVENT_TYPE_LABELS[e.tipo] || e.tipo, e.host_name].filter(Boolean).join(' · '),
        href: `eventos.html?q=${encodeURIComponent(e.titulo || '')}`
      })),
      ...tickets.data.map(t => ({
        grupo: 'Atendimento', titulo: t.assunto,
        sub: [t.protocolo, t.nome].filter(Boolean).join(' · '),
        href: `atendimento.html?q=${encodeURIComponent(t.protocolo || '')}`
      }))
    ];
  },

  _render(termo) {
    const host = document.getElementById('busca-resultados');
    const busca = termo.trim().toLowerCase();

    if (!this._dados) {
      host.innerHTML = `<p class="busca-vazio">Carregando…</p>`;
      return;
    }

    if (!busca) {
      host.innerHTML = `<p class="busca-vazio">Digite para buscar em fornecedores, clientes, eventos e chamados.</p>`;
      return;
    }

    const achados = this._dados
      .filter(i => `${i.titulo} ${i.sub}`.toLowerCase().includes(busca))
      .slice(0, 20);

    if (!achados.length) {
      host.innerHTML = `<p class="busca-vazio">Nada encontrado para “${escapeHtml(termo)}”.</p>`;
      return;
    }

    let grupoAtual = null;
    host.innerHTML = achados.map(i => {
      const cabecalho = i.grupo !== grupoAtual ? `<p class="busca-grupo">${i.grupo}</p>` : '';
      grupoAtual = i.grupo;
      return `${cabecalho}
        <a class="busca-item" href="${i.href}">
          <span class="titulo">${escapeHtml(i.titulo || '—')}</span>
          ${i.sub ? `<span class="sub">${escapeHtml(i.sub)}</span>` : ''}
        </a>`;
    }).join('');
  }
};

// ⌘K / Ctrl+K abre; ESC fecha.
document.addEventListener('keydown', (e) => {
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
    e.preventDefault();
    Busca.abrir();
  }
  if (e.key === 'Escape') Busca.fechar();
});

/** Preenche o campo de busca da página a partir do ?q= da URL. */
function aplicarBuscaDaUrl(input) {
  const q = new URLSearchParams(location.search).get('q');
  if (q && input) {
    input.value = q;
    input.dispatchEvent(new Event('input'));
  }
}


/**
 * Move os controles da página (busca, filtros) para dentro do cabeçalho,
 * à esquerda dos botões de ação.
 */
function moverControlesParaHeader(seletor = '#page-controls') {
  const controles = document.querySelector(seletor);
  if (!controles) return;

  // Página com tabela: busca e filtros vão para a barra no topo da caixa da
  // tabela; o cabeçalho fica só com a ação principal (Adicionar).
  const barra = barraDaTabela();
  if (barra) {
    const [esquerda, direita] = barra.children;
    const exportar = direita.querySelector('[data-exportar]');
    [...controles.children].forEach(filho => {
      if (filho.classList.contains('search-input')) esquerda.appendChild(filho);
      else direita.insertBefore(filho, exportar);
    });
    controles.remove();
    return;
  }

  const host = document.getElementById('header-actions');
  if (!host) return;

  // O primeiro botão de ação marca onde os controles entram — inserir antes
  // dele, na ordem original, mantém busca e filtros à esquerda do Exportar.
  const ancora = host.firstChild;
  [...controles.children].forEach(filho => host.insertBefore(filho, ancora));
  controles.remove();
}

/* ------------------------------------------ Conteúdo: campos comuns
   Usados pelos dashboards de conteúdo e pelo Conteúdo do Hub. */

/** Imagens enviadas pelo Admin vão para o bucket público do blog. */
const BUCKET_IMAGENS = 'blog';

/** Sobe uma imagem e devolve a URL pública. Mostra o erro e devolve null. */
async function enviarImagem(file, pasta) {
  if (file.size > 5 * 1024 * 1024) {
    toast('A imagem precisa ter até 5 MB.');
    return null;
  }

  const extensao = (file.name.split('.').pop() || 'jpg').toLowerCase();
  const caminho = `${pasta}/${Date.now()}-${Math.round(performance.now())}.${extensao}`;

  const { error } = await supabaseClient.storage.from(BUCKET_IMAGENS).upload(caminho, file, {
    cacheControl: '31536000',
    contentType: file.type || 'image/jpeg'
  });

  if (error) {
    toast(/bucket|not found/i.test(error.message || '')
      ? 'Rode supabase/migrations/027_cms_blog.sql no Supabase.'
      : `Não foi possível enviar: ${error.message}`);
    return null;
  }

  return supabaseClient.storage.from(BUCKET_IMAGENS).getPublicUrl(caminho).data.publicUrl;
}

/* Campo de imagem: prévia, botão de envio e a URL (que também pode ser colada). */
function campoImagem(nome, rotulo, valor) {
  return `
    <div class="field">
      <span class="field-label">${rotulo}</span>
      <div class="imagem-campo">
        <div class="imagem-previa" data-previa="${nome}" ${valor ? `style="background-image:url('${escapeHtml(valor)}')"` : ''}>
          ${valor ? '' : '<span>sem imagem</span>'}
        </div>
        <div class="imagem-acoes">
          <button type="button" class="btn btn-ghost btn-sm" data-enviar="${nome}">Enviar imagem</button>
          <input type="file" accept="image/*" data-arquivo="${nome}" hidden>
          <input class="field-input" name="${nome}" type="url" placeholder="ou cole a URL da imagem" value="${escapeHtml(valor || '')}">
        </div>
      </div>
    </div>`;
}

function ligarCamposDeImagem(form, pasta) {
  form.querySelectorAll('[data-enviar]').forEach(botao => {
    const nome = botao.dataset.enviar;
    const arquivo = form.querySelector(`[data-arquivo="${nome}"]`);
    const url = form.querySelector(`input[name="${nome}"]`);
    const previa = form.querySelector(`[data-previa="${nome}"]`);

    const mostrar = () => {
      previa.style.backgroundImage = url.value ? `url('${url.value}')` : '';
      previa.innerHTML = url.value ? '' : '<span>sem imagem</span>';
    };

    botao.addEventListener('click', () => arquivo.click());
    url.addEventListener('input', mostrar);

    arquivo.addEventListener('change', async () => {
      const file = arquivo.files[0];
      if (!file) return;
      botao.disabled = true;
      botao.textContent = 'Enviando…';
      const publica = await enviarImagem(file, pasta);
      botao.disabled = false;
      botao.textContent = 'Enviar imagem';
      arquivo.value = '';
      // Avisa o formulário (prévias que escutam "input", como a do layout de e-mail).
      if (publica) { url.value = publica; mostrar(); url.dispatchEvent(new Event('input', { bubbles: true })); }
    });
  });
}

function blocoPublicacao(posicao, ativo, rotuloPosicao = 'Posição') {
  return `
    <p class="drawer-section-title">Publicação</p>
    <div class="field-row">
      <label class="field">
        <span class="field-label">${rotuloPosicao}</span>
        <input class="field-input" name="posicao" type="number" min="0" value="${posicao}">
      </label>
      <label class="field">
        <span class="field-label">Status</span>
        <select class="field-select" name="ativo">
          <option value="true" ${ativo ? 'selected' : ''}>Publicado</option>
          <option value="false" ${ativo ? '' : 'selected'}>Rascunho</option>
        </select>
      </label>
    </div>
    <p class="cell-muted" style="font-size:.75rem;line-height:1.6">
      Itens em rascunho continuam aqui, mas não aparecem na plataforma.
      A ordem vai do menor número para o maior.
    </p>`;
}



/* ------------------------------------------ Linhas sem clique (cadastros)
   Nas listas de cadastros a linha não abre o drawer — clicar para copiar
   um e-mail abria o painel. O e-mail tem botão de copiar ao lado e o
   drawer abre pelo ícone de três bolinhas no fim da linha. */

const ICONE_COPIAR = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M7 9.667a2.667 2.667 0 0 1 2.667 -2.667h8.666a2.667 2.667 0 0 1 2.667 2.667v8.666a2.667 2.667 0 0 1 -2.667 2.667h-8.666a2.667 2.667 0 0 1 -2.667 -2.667z" /><path d="M4.012 16.737a2 2 0 0 1 -1.012 -1.737v-10c0 -1.1 .9 -2 2 -2h10c.75 0 1.158 .385 1.5 1" /></svg>';
const ICONE_VER_MAIS = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14" /><path d="M5 12h14" /></svg>';

/** Valor com botão de copiar à esquerda (e-mail, CNPJ…). */
function celulaCopiavel(valor, rotulo = 'E-mail') {
  if (!valor) return '—';
  return `<span class="email-copiavel"><button type="button" class="btn-icone-linha" data-copiar="${escapeHtml(valor)}" data-copiar-rotulo="${escapeHtml(rotulo)}" title="Copiar ${escapeHtml(rotulo)}" aria-label="Copiar ${escapeHtml(rotulo)}">${ICONE_COPIAR}</button><span>${escapeHtml(valor)}</span></span>`;
}

function celulaEmail(email) {
  return celulaCopiavel(email, 'E-mail');
}

function botaoVerMais(id) {
  return `<button type="button" class="btn-icone-linha btn-ver-mais" data-ver="${escapeHtml(id)}" title="Ver mais" aria-label="Ver mais">${ICONE_VER_MAIS}</button>`;
}

function ligarAcoesDaLinha(host, abrir) {
  host.querySelectorAll('[data-copiar]').forEach(btn => {
    btn.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(btn.dataset.copiar);
        toast(`${btn.dataset.copiarRotulo || 'E-mail'} copiado.`);
      } catch {
        toast('Não foi possível copiar.');
      }
    });
  });
  host.querySelectorAll('[data-ver]').forEach(btn => {
    btn.addEventListener('click', () => abrir(btn.dataset.ver));
  });
}


/* ------------------------------------------- Evento excluído pelo criador
   O anfitrião exclui um evento em love.com.br › Configurações › Meus eventos
   só marcando eventos.deleted_at — nada é apagado. O Admin pode restaurar
   (deleted_at = null): o evento volta para a conta e o site volta ao ar. */

function rotuloEventoExcluido(evento) {
  if (!evento || !evento.deleted_at) return '';
  return `Excluído pelo criador em ${formatDateTime(evento.deleted_at)}`;
}

function restaurarEvento(evento, depois) {
  Modal.abrir({
    titulo: 'Restaurar este evento?',
    texto: `"${evento.titulo || 'Evento'}" volta a aparecer na conta do anfitrião e o site publicado volta ao ar.`,
    acoes: [
      { rotulo: 'Cancelar', classe: 'btn-ghost', aoClicar: () => Modal.fechar() },
      {
        rotulo: 'Restaurar evento',
        classe: 'btn-primary',
        aoClicar: async () => {
          Modal.ocupado(true);
          const { data, error } = await supabaseClient.from('eventos')
            .update({ deleted_at: null }).eq('id', evento.id).select('id');
          Modal.ocupado(false);
          Modal.fechar();
          if (error) return toast(`Não foi possível restaurar: ${error.message}`);
          if (!data || !data.length) return toast('O evento não foi restaurado (sem permissão ou não encontrado).');
          evento.deleted_at = null;
          toast('Evento restaurado.');
          if (depois) depois();
        }
      }
    ]
  });
}
