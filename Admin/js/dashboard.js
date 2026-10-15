/* ==========================================================================
   LOVE ADMIN — Dashboard

   Cores da rosca: paleta categórica validada com o validador da skill
   dataviz sobre fundo branco — passa em todos os gates, inclusive CVD.
   ========================================================================== */

// Ordem fixa da paleta categórica — nunca reciclada entre categorias.
const CORES_CATEGORIA = ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4'];

let DADOS = null;

/* ============================================================ Período ==
   Filtro do cabeçalho: uma data específica ou um intervalo. Vale para os
   KPIs, o ranking, a rosca e a tabela de cadastros — cada um pela data em
   que o registro nasceu. Sem período, tudo. O drawer de conta continua
   com o histórico inteiro: ele é sobre a pessoa, não sobre o recorte.
   ====================================================================== */

let PERIODO = { de: null, ate: null };

/** "AAAA-MM-DD" → início ou fim daquele dia no fuso de quem está vendo. */
function diaLocal(valor, fimDoDia) {
  if (!valor) return null;
  const [a, m, d] = valor.split('-').map(Number);
  return fimDoDia ? new Date(a, m - 1, d, 23, 59, 59, 999) : new Date(a, m - 1, d);
}

function noPeriodo(data) {
  if (!PERIODO.de && !PERIODO.ate) return true;
  if (!data) return false;
  const t = new Date(data).getTime();
  return (!PERIODO.de || t >= PERIODO.de.getTime()) && (!PERIODO.ate || t <= PERIODO.ate.getTime());
}

const comPeriodo = () => Boolean(PERIODO.de || PERIODO.ate);

/** Os dados gerais recortados pelo período. */
function recorte() {
  const por = (lista, campo = 'created_at') => (lista || []).filter(x => noPeriodo(x[campo]));
  return {
    ...DADOS,
    fornecedores: por(DADOS.fornecedores),
    clientes: por(DADOS.clientes),
    eventos: por(DADOS.eventos),
    carteira: por(DADOS.carteira),
    contratos: por(DADOS.contratos)
  };
}

const formatarDia = d => d.toLocaleDateString('pt-BR');

function rotuloDoPeriodo() {
  const { de, ate } = PERIODO;
  if (!de && !ate) return 'Todo o período';
  if (de && ate && formatarDia(de) === formatarDia(ate)) return formatarDia(de);
  if (de && ate) return `${formatarDia(de)} – ${formatarDia(ate)}`;
  return de ? `A partir de ${formatarDia(de)}` : `Até ${formatarDia(ate)}`;
}

/** "AAAA-MM-DD" de um Date, sem passar por UTC. */
function isoLocal(d) {
  const dois = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${dois(d.getMonth() + 1)}-${dois(d.getDate())}`;
}

function montarFiltroDePeriodo() {
  const host = document.getElementById('header-actions');
  if (!host) return;

  const wrap = document.createElement('div');
  wrap.className = 'filtro-wrap';
  wrap.innerHTML = `
    <button type="button" class="btn btn-ghost" id="btn-periodo" aria-expanded="false" aria-controls="periodo-menu">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7a2 2 0 0 1 2 -2h12a2 2 0 0 1 2 2v12a2 2 0 0 1 -2 2h-12a2 2 0 0 1 -2 -2v-12z" /><path d="M16 3v4" /><path d="M8 3v4" /><path d="M4 11h16" /></svg>
      <span id="periodo-rotulo">Todo o período</span>
    </button>

    <div class="filtro-menu periodo-menu" id="periodo-menu" hidden>
      <label class="field">
        <span class="field-label">Período</span>
        <select class="field-select" id="periodo-tipo">
          <option value="tudo">Todo o período</option>
          <option value="hoje">Hoje</option>
          <option value="7">Últimos 7 dias</option>
          <option value="30">Últimos 30 dias</option>
          <option value="mes">Este mês</option>
          <option value="dia">Data específica</option>
          <option value="intervalo">De uma data até outra</option>
        </select>
      </label>

      <label class="field" id="periodo-campo-dia" hidden>
        <span class="field-label">Data</span>
        <input class="field-input" type="date" id="periodo-dia">
      </label>

      <div class="field-row" id="periodo-campo-intervalo" hidden>
        <label class="field">
          <span class="field-label">De</span>
          <input class="field-input" type="date" id="periodo-de">
        </label>
        <label class="field">
          <span class="field-label">Até</span>
          <input class="field-input" type="date" id="periodo-ate">
        </label>
      </div>

      <button type="button" class="btn btn-primary periodo-aplicar" id="periodo-aplicar">Aplicar</button>
      <button type="button" class="filtro-limpar" id="periodo-limpar">Limpar período</button>
    </div>`;
  host.prepend(wrap);

  const botao = wrap.querySelector('#btn-periodo');
  const menu = wrap.querySelector('#periodo-menu');
  const tipo = wrap.querySelector('#periodo-tipo');
  const campoDia = wrap.querySelector('#periodo-campo-dia');
  const campoIntervalo = wrap.querySelector('#periodo-campo-intervalo');
  const inputDia = wrap.querySelector('#periodo-dia');
  const hoje = isoLocal(new Date());
  wrap.querySelectorAll('input[type="date"]').forEach(i => { i.max = hoje; });

  const fechar = () => { menu.hidden = true; botao.setAttribute('aria-expanded', 'false'); };

  botao.addEventListener('click', e => {
    e.stopPropagation();
    menu.hidden = !menu.hidden;
    botao.setAttribute('aria-expanded', String(!menu.hidden));
  });
  menu.addEventListener('click', e => e.stopPropagation());
  document.addEventListener('click', fechar);
  document.addEventListener('keydown', e => { if (e.key === 'Escape') fechar(); });

  tipo.addEventListener('change', () => {
    campoDia.hidden = tipo.value !== 'dia';
    campoIntervalo.hidden = tipo.value !== 'intervalo';
    if (tipo.value === 'dia' && !inputDia.value) inputDia.value = hoje;
  });

  wrap.querySelector('#periodo-aplicar').addEventListener('click', () => {
    const agora = new Date();
    const diasAtras = n => new Date(agora.getFullYear(), agora.getMonth(), agora.getDate() - n);
    const fimDeHoje = diaLocal(hoje, true);

    switch (tipo.value) {
      case 'hoje': PERIODO = { de: diaLocal(hoje), ate: fimDeHoje }; break;
      case '7': PERIODO = { de: diasAtras(6), ate: fimDeHoje }; break;
      case '30': PERIODO = { de: diasAtras(29), ate: fimDeHoje }; break;
      case 'mes': PERIODO = { de: new Date(agora.getFullYear(), agora.getMonth(), 1), ate: fimDeHoje }; break;
      case 'dia': {
        if (!inputDia.value) { toast('Escolha a data.'); return; }
        PERIODO = { de: diaLocal(inputDia.value), ate: diaLocal(inputDia.value, true) };
        break;
      }
      case 'intervalo': {
        const de = wrap.querySelector('#periodo-de').value;
        const ate = wrap.querySelector('#periodo-ate').value;
        if (!de && !ate) { toast('Escolha ao menos uma das datas.'); return; }
        if (de && ate && de > ate) { toast('A data inicial é depois da final.'); return; }
        PERIODO = { de: diaLocal(de), ate: diaLocal(ate, true) };
        break;
      }
      default: PERIODO = { de: null, ate: null };
    }

    aplicarPeriodo();
    fechar();
  });

  wrap.querySelector('#periodo-limpar').addEventListener('click', () => {
    tipo.value = 'tudo';
    tipo.dispatchEvent(new Event('change'));
    PERIODO = { de: null, ate: null };
    aplicarPeriodo();
    fechar();
  });
}

function aplicarPeriodo() {
  document.getElementById('periodo-rotulo').textContent = rotuloDoPeriodo();
  document.getElementById('btn-periodo').classList.toggle('is-ativo', comPeriodo());
  if (DADOS) {
    renderKpis();
    renderTopFornecedores();
    renderCategorias();
  }
  PAGINA_CONTAS = 1;
  if (CONTAS.length) renderContas();
}

document.addEventListener('DOMContentLoaded', async () => {
  if (!(await window.adminReady)) return;

  montarFiltroDePeriodo();
  renderKpiSkeleton();

  const [fornecedores, clientes, eventos, carteira, contratos, convidados, presentes, produtos] = await Promise.all([
    safeSelect('fornecedores', '*'),
    safeSelect('clientes', '*'),
    safeSelect('eventos', '*'),
    safeSelect('wallet_transactions', 'fornecedor_id, type, amount, created_at'),
    safeSelect('contracts', 'fornecedor_id, valor_total, status, created_at'),
    safeSelect('convidados', 'evento_id, cliente_id, status, extra'),
    safeSelect('presentes', 'evento_id, cliente_id, valor, status'),
    // Só o drawer usa: é ele quem lista os produtos do fornecedor.
    safeSelect('products', '*')
  ]);

  DADOS = {
    fornecedores: fornecedores.data,
    clientes: clientes.data,
    eventos: eventos.data,
    carteira: carteira.data,
    contratos: contratos.data,
    convidados: convidados.data,
    presentes: presentes.data,
    produtos: produtos.data
  };

  ContaDrawer.semear({ dados: DADOS });

  // Se a tabela de contas chegou antes, redesenha agora que dá para numerar.
  if (CONTAS.length) renderContas();

  renderKpis();
  renderTopFornecedores();
  renderCategorias();
});

/* ------------------------------------------------------------------ KPIs */

function renderKpiSkeleton() {
  document.getElementById('kpi-grid').innerHTML = Array.from({ length: 4 }, () =>
    `<div class="kpi"><div class="skeleton" style="width:55%"></div><div class="skeleton" style="width:70%;height:26px;margin-top:.625rem"></div></div>`
  ).join('');
}

function renderKpis() {
  const D = recorte();
  const sufixo = comPeriodo() ? ' no período' : '';

  const volume = D.carteira
    .filter(t => t.type === 'credit')
    .reduce((s, t) => s + (Number(t.amount) || 0), 0);

  const faturamento = D.contratos.reduce((s, c) => s + (Number(c.valor_total) || 0), 0);

  const tile = (label, value, sub) => `
    <div class="kpi">
      <p class="kpi-label">${escapeHtml(label)}</p>
      <p class="kpi-value">${escapeHtml(value)}</p>
      <p class="kpi-sub">${escapeHtml(sub)}</p>
    </div>`;

  document.getElementById('kpi-grid').innerHTML = [
    tile('Volume B2B', formatCurrency(volume), `Entradas na carteira dos fornecedores${sufixo}`),
    tile('Faturamento bruto', formatCurrency(faturamento), `Valor total dos contratos${sufixo}`),
    tile('Fornecedores', formatNumber(D.fornecedores.length), comPeriodo() ? 'Contas B2B criadas no período' : 'Contas B2B criadas'),
    tile('Anfitriões', formatNumber(D.clientes.length), comPeriodo() ? 'Contas criadas no período' : 'Contas na plataforma')
  ].join('');
}

/* -------------------------------------------------- Top fornecedores */

function renderTopFornecedores() {
  const host = document.getElementById('top-fornecedores');
  const D = recorte();

  const porFornecedor = new Map();
  D.contratos.forEach(c => {
    if (c.status === 'quitado') return;
    const atual = porFornecedor.get(c.fornecedor_id) || { ativos: 0, valor: 0 };
    atual.ativos += 1;
    atual.valor += Number(c.valor_total) || 0;
    porFornecedor.set(c.fornecedor_id, atual);
  });

  const lista = DADOS.fornecedores
    .map(f => ({ f, m: porFornecedor.get(f.id) || { ativos: 0, valor: 0 } }))
    .filter(x => x.m.ativos > 0)
    .sort((a, b) => b.m.ativos - a.m.ativos || b.m.valor - a.m.valor)
    .slice(0, 6);

  if (!lista.length) {
    host.innerHTML = comPeriodo()
      ? `<div class="empty-state"><strong>Nenhum contrato ativo no período</strong>
          <p>Escolha outro período no cabeçalho.</p></div>`
      : `<div class="empty-state"><strong>Nenhum contrato ativo</strong>
          <p>Os fornecedores aparecem aqui conforme fecham contratos.</p></div>`;
    return;
  }

  host.innerHTML = `<ul class="rank">${lista.map(({ f, m }, i) => `
    <li class="rank-item">
      <span class="rank-pos">${i + 1}</span>
      <span class="rank-avatar">${escapeHtml(initials(f.company_name))}</span>
      <span class="rank-info">
        <span class="nome">${escapeHtml(f.company_name || '—')}</span>
        <span class="sub">${escapeHtml(f.email || f.category || '')}</span>
      </span>
      <span class="rank-valor">
        <span class="numero">${formatNumber(m.ativos)}</span>
        <span class="sub">${formatCurrency(m.valor)}</span>
      </span>
    </li>`).join('')}</ul>`;
}

/* ------------------------------------------------ Eventos por categoria */

function renderCategorias() {
  const host = document.getElementById('grafico-categorias');
  const eventos = recorte().eventos;
  const total = eventos.length;

  if (!total) {
    host.innerHTML = comPeriodo()
      ? `<div class="empty-state"><strong>Nenhum evento criado no período</strong>
          <p>Escolha outro período no cabeçalho.</p></div>`
      : `<div class="empty-state"><strong>Nenhum evento criado</strong>
          <p>As comemorações aparecem aqui assim que os clientes começarem a criá-las.</p></div>`;
    return;
  }

  const fatias = [...groupBy(eventos, 'tipo').entries()]
    .map(([tipo, lista]) => ({
      rotulo: EVENT_TYPE_LABELS[tipo] || tipo,
      qtd: lista.length,
      pct: (lista.length / total) * 100
    }))
    .sort((a, b) => b.qtd - a.qtd)
    .map((fatia, i) => ({ ...fatia, cor: CORES_CATEGORIA[i % CORES_CATEGORIA.length] }));

  const tamanho = 180;
  const raio = 74;
  const espessura = 26;
  const centro = tamanho / 2;
  const circunferencia = 2 * Math.PI * raio;

  // Cada arco recua 2px para o fundo aparecer entre as fatias.
  let acumulado = 0;
  const arcos = fatias.map(f => {
    const comprimento = (f.pct / 100) * circunferencia;
    const traco = Math.max(comprimento - 2, 0.5);
    const arco = `
      <circle cx="${centro}" cy="${centro}" r="${raio}" fill="none"
              stroke="${f.cor}" stroke-width="${espessura}"
              stroke-dasharray="${traco} ${circunferencia - traco}"
              stroke-dashoffset="${-acumulado}"
              transform="rotate(-90 ${centro} ${centro})"
              data-rotulo="${escapeHtml(f.rotulo)}" class="viz-fatia" />`;
    acumulado += comprimento;
    return arco;
  }).join('');

  host.innerHTML = `
    <div class="donut-wrap">
      <svg width="${tamanho}" height="${tamanho}" role="img" aria-label="Eventos por categoria">
        ${arcos}
        <text class="donut-total" x="${centro}" y="${centro - 2}" text-anchor="middle">${formatNumber(total)}</text>
        <text class="donut-legenda" x="${centro}" y="${centro + 16}" text-anchor="middle">eventos</text>
      </svg>

      <ul class="donut-lista">
        ${fatias.map(f => `
          <li>
            <span class="chave" style="background:${f.cor}"></span>
            <span class="nome">${escapeHtml(f.rotulo)}</span>
            <span class="valor">${formatNumber(f.qtd)} · ${Math.round(f.pct)}%</span>
          </li>`).join('')}
      </ul>
    </div>`;
}

/* ===================================================== Todas as contas ==
   Lê auth.users pela admin_listar_contas() (SECURITY DEFINER), já que a
   tabela de autenticação não é exposta pela API. Mostra de onde cada conta
   veio e permite classificar as que chegaram sem origem.
   ====================================================================== */

let CONTAS = [];

/** Quantas contas por página na tabela de últimos cadastros. */
const CONTAS_POR_PAGINA = 10;
let PAGINA_CONTAS = 1;

document.addEventListener('DOMContentLoaded', async () => {
  if (!(await window.adminReady)) return;
  await carregarContas();
});

async function carregarContas() {
  const tbody = document.getElementById('tbody-contas');
  if (!tbody) return;

  renderLoading(tbody, 5);

  const { data, error } = await supabaseClient.rpc('admin_listar_contas');

  if (error) {
    const faltaFuncao = /admin_listar_contas|does not exist|schema cache/i.test(error.message || '');
    renderEmpty(tbody, 5,
      faltaFuncao ? 'Função ainda não existe no banco' : 'Não foi possível carregar',
      faltaFuncao
        ? 'Rode supabase/migrations/015_contas_origem.sql no SQL Editor do Supabase.'
        : error.message);
    return;
  }

  CONTAS = data || [];
  ContaDrawer.semear({ contas: CONTAS });
  renderContas();

  const voltarAoInicio = () => { PAGINA_CONTAS = 1; renderContas(); };
  document.getElementById('busca-contas').addEventListener('input', voltarAoInicio);
  document.getElementById('filtro-origem').addEventListener('change', voltarAoInicio);
}

function filtrarContas() {
  const termo = document.getElementById('busca-contas').value.trim().toLowerCase();
  const origem = document.getElementById('filtro-origem').value;

  return CONTAS.filter(c => {
    if (origem && c.origem !== origem) return false;
    if (!noPeriodo(c.criado_em)) return false;
    if (!termo) return true;
    return [c.email, c.nome].some(v => String(v || '').toLowerCase().includes(termo));
  });
}

function renderContas() {
  const tbody = document.getElementById('tbody-contas');
  const paginacao = document.getElementById('paginacao-contas');
  const lista = filtrarContas();

  if (!lista.length) {
    paginacao.hidden = true;
    renderEmpty(tbody, 5, 'Nenhuma conta encontrada',
      CONTAS.length ? 'Ajuste a busca, o canal ou o período.' : 'Nenhuma conta foi criada ainda.');
    return;
  }

  // As sem origem vêm primeiro: são as que exigem ação.
  const ordenada = [...lista].sort((a, b) => {
    if ((a.origem === 'sem_origem') !== (b.origem === 'sem_origem')) {
      return a.origem === 'sem_origem' ? -1 : 1;
    }
    return new Date(b.criado_em || 0) - new Date(a.criado_em || 0);
  });

  const totalPaginas = Math.max(1, Math.ceil(ordenada.length / CONTAS_POR_PAGINA));
  PAGINA_CONTAS = Math.min(Math.max(PAGINA_CONTAS, 1), totalPaginas);

  const inicio = (PAGINA_CONTAS - 1) * CONTAS_POR_PAGINA;
  const pagina = ordenada.slice(inicio, inicio + CONTAS_POR_PAGINA);

  renderPaginacaoContas(ordenada.length, totalPaginas, inicio, pagina.length);

  tbody.innerHTML = pagina.map(c => `
    <tr data-id="${c.id}">
      <td class="col-numero cell-muted">${escapeHtml(numeroDoCadastro(c))}</td>
      <td class="cell-strong">${dash(c.email)}</td>
      <td>${canalDaConta(c)}</td>
      <td class="cell-muted">${escapeHtml(formatDate(c.criado_em))}</td>
      <td class="cell-muted">${escapeHtml(c.ultimo_acesso ? formatRelative(c.ultimo_acesso) : 'nunca')}</td>
    </tr>`).join('');

  tbody.querySelectorAll('tr[data-id]').forEach(tr => {
    tr.addEventListener('click', () => ContaDrawer.abrir(CONTAS.find(c => c.id === tr.dataset.id)));
  });
}

/**
 * De onde a conta veio. Anfitriões e Hub são o caminho normal e aparecem como
 * texto; só "Sem origem" fica em destaque, porque é o único que pede ação —
 * colorir os três igualaria o rotineiro ao que precisa ser resolvido.
 */
/* A numeração é por plataforma: o anfitrião nº 4 e o fornecedor nº 4 são
   contas distintas. Nesta lista as duas aparecem lado a lado, e quem desfaz
   a ambiguidade é a coluna Canal, logo ao lado. */
let ORDEM_CADASTRO = null;

function numeroDoCadastro(c) {
  // A tabela e os dados gerais carregam em paralelo: só memoiza depois que
  // DADOS existe, senão o mapa nasceria vazio e ficaria assim.
  if (!ORDEM_CADASTRO && DADOS) {
    ORDEM_CADASTRO = new Map([
      ...sequenciaDeCadastro(DADOS.clientes),
      ...sequenciaDeCadastro(DADOS.fornecedores)
    ]);
  }
  return ORDEM_CADASTRO?.get(c.id) || '—';
}

function canalDaConta(c) {
  const origem = ORIGENS[c.origem] || ORIGENS.sem_origem;
  return c.origem === 'sem_origem'
    ? badge(origem.rotulo, origem.badge)
    : `<span class="cell-muted">${escapeHtml(origem.rotulo)}</span>`;
}

/**
 * Paginação da tabela de cadastros. Trocar de página chama só renderContas(),
 * então o ranking B2B e a rosca de eventos ficam intactos.
 */
function renderPaginacaoContas(total, totalPaginas, inicio, nestaPagina) {
  const host = document.getElementById('paginacao-contas');

  if (totalPaginas <= 1) {
    host.hidden = true;
    return;
  }

  host.hidden = false;
  host.innerHTML = `
    <span class="paginacao-contagem">
      ${formatNumber(inicio + 1)}–${formatNumber(inicio + nestaPagina)} de ${formatNumber(total)}
    </span>
    <div class="paginacao-botoes">
      <button type="button" class="btn btn-ghost btn-sm paginacao-seta" data-pagina="${PAGINA_CONTAS - 1}"
              ${PAGINA_CONTAS === 1 ? 'disabled' : ''} aria-label="Página anterior">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M15 6l-6 6l6 6" /></svg>
      </button>
      <span class="paginacao-atual">${PAGINA_CONTAS} de ${totalPaginas}</span>
      <button type="button" class="btn btn-ghost btn-sm paginacao-seta" data-pagina="${PAGINA_CONTAS + 1}"
              ${PAGINA_CONTAS === totalPaginas ? 'disabled' : ''} aria-label="Próxima página">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 6l6 6l-6 6" /></svg>
      </button>
    </div>`;

  host.querySelectorAll('[data-pagina]').forEach(btn => {
    btn.addEventListener('click', () => {
      PAGINA_CONTAS = Number(btn.dataset.pagina);
      renderContas();
    });
  });
}
