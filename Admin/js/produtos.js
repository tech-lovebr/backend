/* ==========================================================================
   LOVE ADMIN — Serviços/Produtos (HUB/B2B)
   Tudo o que os fornecedores cadastraram no Catálogo de serviços do Hub
   (tabela products): título, empresa, local, unidade de cobrança (UC) e
   quantos cliques cada um recebeu na vitrine dos anfitriões
   (produto_cliques, migration 054).

   Categoria, UC e período ficam num drawer só, aberto pelo botão Filtros.
   O período recorta a contagem de cliques.
   ========================================================================== */

// Unidade de cobrança gravada pelo Hub em products.extra.pricing.type.
const COBRANCA = {
  POR_PESSOA: 'Por pessoa',
  POR_HORA: 'Por hora',
  VALOR_FIXO: 'Valor fixo',
  SOB_CONSULTA: 'Sob consulta',
  POR_DIA: 'Por dia'
};

const PERIODOS = {
  tudo: 'Todo o período',
  hoje: 'Hoje',
  '7': 'Últimos 7 dias',
  '30': 'Últimos 30 dias',
  mes: 'Este mês',
  dia: 'Data específica',
  intervalo: 'De uma data até outra'
};

let ITENS = [];
let CLIQUES = [];
let CLIQUES_OK = true;

/** Filtros aplicados. `de`/`ate` são Date (início e fim do dia) ou null. */
const FILTROS = { categoria: '', uc: '', periodo: 'tudo', dia: '', inicio: '', fim: '', de: null, ate: null };

document.addEventListener('DOMContentLoaded', async () => {
  if (!(await window.adminReady)) return;

  const tbody = document.getElementById('tbody');
  renderLoading(tbody, 5);

  const [produtos, fornecedores, cliques] = await Promise.all([
    safeSelect('products', '*', q => q.order('created_at', { ascending: false })),
    safeSelect('fornecedores', 'id, company_name, city, state'),
    carregarCliques()
  ]);
  if (produtos.error) return renderError(tbody, 5, produtos.error);

  CLIQUES = cliques.data;
  CLIQUES_OK = !cliques.error;

  const porId = new Map(fornecedores.data.map(f => [f.id, f]));
  ITENS = produtos.data.map(p => montarItem(p, porId.get(p.fornecedor_id)));

  render();

  document.getElementById('busca').addEventListener('input', render);
  document.getElementById('btn-filtros').addEventListener('click', abrirFiltros);

  addHeaderAction('Exportar', () => exportarCSV('servicos-produtos', [
    { titulo: 'Produto/Serviço', valor: i => i.titulo },
    { titulo: 'Categoria', valor: i => i.categoria },
    { titulo: 'Empresa', valor: i => i.empresa },
    { titulo: 'Local', valor: i => i.local },
    { titulo: 'UC', valor: i => i.cobranca },
    { titulo: 'Cliques', valor: i => cliquesDe(i.id) },
    { titulo: 'Status', valor: i => (i.ativo ? 'Ativo' : 'Inativo') }
  ], filtrar()));
  moverControlesParaHeader();
  aplicarBuscaDaUrl(document.getElementById('busca'));
});

/* A API devolve no máximo 1.000 linhas por consulta: busca em páginas até
   acabar. Sem a tabela (054 não rodada), a coluna mostra "—". */
async function carregarCliques() {
  const todos = [];
  const PAGINA = 1000;
  for (let inicio = 0; ; inicio += PAGINA) {
    const { data, error } = await supabaseClient
      .from('produto_cliques')
      .select('produto_id, created_at')
      .order('id', { ascending: true })
      .range(inicio, inicio + PAGINA - 1);
    if (error) return { data: [], error };
    todos.push(...(data || []));
    if (!data || data.length < PAGINA) break;
  }
  return { data: todos, error: null };
}

/* Lê o produto do jeito que o Hub grava (products.extra). */
function montarItem(p, fornecedor) {
  const extra = p.extra || {};
  const pricing = extra.pricing || null;
  const venue = extra.venue || null;

  let tipo = pricing && pricing.type;

  // Espaço para locação usa a grade de preço por dia (sem motor de preço).
  if (!tipo && venue) {
    const dias = [venue.priceWeekday, venue.priceSaturday, venue.priceSunday, venue.priceHoliday]
      .map(Number).filter(v => v > 0);
    if (dias.length) tipo = 'POR_DIA';
  }
  if (!tipo && Number(p.price) > 0) tipo = 'VALOR_FIXO';

  // Local: endereço do espaço (locação) ou a cidade da empresa.
  const cidade = (venue && venue.city) || (fornecedor && fornecedor.city) || '';
  const estado = (venue && venue.state) || (fornecedor && fornecedor.state) || '';

  return {
    id: p.id,
    titulo: p.name || 'Sem título',
    categoria: p.category || '',
    subcategoria: extra.subcategory || '',
    empresa: (fornecedor && fornecedor.company_name) || '',
    fornecedorId: p.fornecedor_id,
    local: [cidade, estado].filter(Boolean).join(' / '),
    tipo: tipo || '',
    cobranca: COBRANCA[tipo] || '',
    ativo: p.active !== false
  };
}

/* ------------------------------------------------------------- Período */

/** "AAAA-MM-DD" → início ou fim daquele dia no fuso de quem está vendo. */
function diaLocal(valor, fimDoDia) {
  if (!valor) return null;
  const [a, m, d] = valor.split('-').map(Number);
  return fimDoDia ? new Date(a, m - 1, d, 23, 59, 59, 999) : new Date(a, m - 1, d);
}

function isoLocal(d) {
  const dois = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${dois(d.getMonth() + 1)}-${dois(d.getDate())}`;
}

function intervaloDoPeriodo(f) {
  const agora = new Date();
  const hoje = isoLocal(agora);
  const diasAtras = n => new Date(agora.getFullYear(), agora.getMonth(), agora.getDate() - n);
  const fimDeHoje = diaLocal(hoje, true);

  switch (f.periodo) {
    case 'hoje': return { de: diaLocal(hoje), ate: fimDeHoje };
    case '7': return { de: diasAtras(6), ate: fimDeHoje };
    case '30': return { de: diasAtras(29), ate: fimDeHoje };
    case 'mes': return { de: new Date(agora.getFullYear(), agora.getMonth(), 1), ate: fimDeHoje };
    case 'dia': return { de: diaLocal(f.dia), ate: diaLocal(f.dia, true) };
    case 'intervalo': return { de: diaLocal(f.inicio), ate: diaLocal(f.fim, true) };
    default: return { de: null, ate: null };
  }
}

function noPeriodo(data) {
  if (!FILTROS.de && !FILTROS.ate) return true;
  const t = new Date(data).getTime();
  return (!FILTROS.de || t >= FILTROS.de.getTime()) && (!FILTROS.ate || t <= FILTROS.ate.getTime());
}

/** Cliques por produto dentro do período escolhido. */
function contagemDeCliques() {
  const mapa = new Map();
  CLIQUES.forEach(c => {
    if (!noPeriodo(c.created_at)) return;
    mapa.set(c.produto_id, (mapa.get(c.produto_id) || 0) + 1);
  });
  return mapa;
}

let CONTAGEM = new Map();
const cliquesDe = id => CONTAGEM.get(id) || 0;

function rotuloDoPeriodo() {
  const fmt = d => d.toLocaleDateString('pt-BR');
  if (FILTROS.periodo === 'dia' && FILTROS.de) return fmt(FILTROS.de);
  if (FILTROS.periodo === 'intervalo') {
    if (FILTROS.de && FILTROS.ate) return `${fmt(FILTROS.de)} – ${fmt(FILTROS.ate)}`;
    if (FILTROS.de) return `A partir de ${fmt(FILTROS.de)}`;
    if (FILTROS.ate) return `Até ${fmt(FILTROS.ate)}`;
  }
  return PERIODOS[FILTROS.periodo];
}

/* ------------------------------------------------------- Drawer de filtros */

function abrirFiltros() {
  const categorias = [...new Set(ITENS.map(i => i.categoria).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'pt-BR'));
  const ucs = Object.entries(COBRANCA).filter(([tipo]) => ITENS.some(i => i.tipo === tipo));
  const hoje = isoLocal(new Date());
  const opcao = (valor, texto, atual) => `<option value="${escapeHtml(valor)}" ${valor === atual ? 'selected' : ''}>${escapeHtml(texto)}</option>`;

  Drawer.open({
    title: 'Filtros',
    subtitle: 'Serviços/Produtos do Hub',
    body: `
      <form id="form-filtros">
        <label class="field">
          <span class="field-label">Categoria</span>
          <select class="field-select" name="categoria">
            ${opcao('', 'Todas as categorias', FILTROS.categoria)}
            ${categorias.map(c => opcao(c, c, FILTROS.categoria)).join('')}
          </select>
        </label>

        <label class="field">
          <span class="field-label">UC — unidade de cobrança</span>
          <select class="field-select" name="uc">
            ${opcao('', 'Todas as unidades', FILTROS.uc)}
            ${ucs.map(([v, t]) => opcao(v, t, FILTROS.uc)).join('')}
          </select>
        </label>

        <p class="drawer-section-title">Período dos cliques</p>
        <label class="field">
          <span class="field-label">Período</span>
          <select class="field-select" name="periodo" id="filtro-periodo">
            ${Object.entries(PERIODOS).map(([v, t]) => opcao(v, t, FILTROS.periodo)).join('')}
          </select>
        </label>

        <label class="field" data-periodo="dia" ${FILTROS.periodo === 'dia' ? '' : 'hidden'}>
          <span class="field-label">Data</span>
          <input class="field-input" type="date" name="dia" max="${hoje}" value="${escapeHtml(FILTROS.dia || hoje)}">
        </label>

        <div class="field-row" data-periodo="intervalo" ${FILTROS.periodo === 'intervalo' ? '' : 'hidden'}>
          <label class="field">
            <span class="field-label">De</span>
            <input class="field-input" type="date" name="inicio" max="${hoje}" value="${escapeHtml(FILTROS.inicio)}">
          </label>
          <label class="field">
            <span class="field-label">Até</span>
            <input class="field-input" type="date" name="fim" max="${hoje}" value="${escapeHtml(FILTROS.fim)}">
          </label>
        </div>

        ${CLIQUES_OK ? '' : `
          <p class="cell-muted" style="font-size:.75rem;line-height:1.6">
            A contagem de cliques ainda não existe no banco. Rode
            supabase/migrations/054_produto_cliques.sql no Supabase.
          </p>`}
      </form>`,
    footer: `
      <button type="button" class="btn btn-ghost" id="btn-limpar-filtros">Limpar</button>
      <button type="button" class="btn btn-primary" id="btn-aplicar-filtros">Aplicar</button>`
  });

  const form = document.getElementById('form-filtros');

  document.getElementById('filtro-periodo').addEventListener('change', e => {
    form.querySelectorAll('[data-periodo]').forEach(el => { el.hidden = el.dataset.periodo !== e.target.value; });
  });

  document.getElementById('btn-limpar-filtros').addEventListener('click', () => {
    Object.assign(FILTROS, { categoria: '', uc: '', periodo: 'tudo', dia: '', inicio: '', fim: '', de: null, ate: null });
    Drawer.close();
    render();
  });

  document.getElementById('btn-aplicar-filtros').addEventListener('click', () => {
    const d = Object.fromEntries(new FormData(form).entries());

    if (d.periodo === 'dia' && !d.dia) return toast('Escolha a data.');
    if (d.periodo === 'intervalo') {
      if (!d.inicio && !d.fim) return toast('Escolha ao menos uma das datas.');
      if (d.inicio && d.fim && d.inicio > d.fim) return toast('A data inicial é depois da final.');
    }

    Object.assign(FILTROS, {
      categoria: d.categoria,
      uc: d.uc,
      periodo: d.periodo,
      dia: d.dia || '',
      inicio: d.inicio || '',
      fim: d.fim || ''
    });
    Object.assign(FILTROS, intervaloDoPeriodo(FILTROS));

    Drawer.close();
    render();
  });
}

function atualizarBotaoDeFiltros() {
  const ativos = [FILTROS.categoria, FILTROS.uc, FILTROS.periodo !== 'tudo'].filter(Boolean).length;
  const badgeEl = document.getElementById('filtro-badge');
  badgeEl.textContent = ativos;
  badgeEl.hidden = !ativos;
}

/* ------------------------------------------------------------- Tabela */

function renderKpis(lista) {
  const ativos = ITENS.filter(i => i.ativo);
  const total = lista.reduce((t, i) => t + cliquesDe(i.id), 0);
  const tile = (label, value, sub) => `
    <div class="kpi"><p class="kpi-label">${label}</p><p class="kpi-value">${value}</p><p class="kpi-sub">${sub}</p></div>`;

  document.getElementById('kpi-grid').innerHTML = [
    tile('Produtos e serviços', formatNumber(ITENS.length), `${formatNumber(ativos.length)} ativos`),
    tile('Empresas', formatNumber(new Set(ITENS.map(i => i.fornecedorId)).size), 'Com algo cadastrado'),
    tile('Categorias', formatNumber(new Set(ITENS.map(i => i.categoria).filter(Boolean)).size), 'Usadas no catálogo'),
    tile('Cliques', CLIQUES_OK ? formatNumber(total) : '—', escapeHtml(rotuloDoPeriodo()))
  ].join('');
}

function filtrar() {
  const termo = document.getElementById('busca').value.trim().toLowerCase();

  return ITENS.filter(i => {
    if (FILTROS.categoria && i.categoria !== FILTROS.categoria) return false;
    if (FILTROS.uc && i.tipo !== FILTROS.uc) return false;
    if (!termo) return true;
    return [i.titulo, i.empresa, i.categoria, i.subcategoria, i.local]
      .some(v => String(v || '').toLowerCase().includes(termo));
  });
}

function render() {
  CONTAGEM = contagemDeCliques();
  atualizarBotaoDeFiltros();

  const tbody = document.getElementById('tbody');
  // Mais clicados primeiro; empate fica na ordem de cadastro.
  const lista = filtrar().sort((a, b) => cliquesDe(b.id) - cliquesDe(a.id));
  renderKpis(lista);

  if (!lista.length) {
    renderEmpty(tbody, 5, 'Nenhum produto ou serviço encontrado',
      ITENS.length
        ? 'Ajuste a busca ou os filtros.'
        : 'Quando os fornecedores cadastrarem itens no Catálogo de serviços do Hub, eles aparecem aqui.');
    return;
  }

  tbody.innerHTML = lista.map(i => {
    const cliques = cliquesDe(i.id);
    return `
    <tr data-id="${i.id}">
      <td>
        <span class="cell-strong">${escapeHtml(i.titulo)}</span>
        ${i.ativo ? '' : badge('Inativo', 'badge-warning')}
        ${i.categoria ? `<br><span class="cell-muted">${escapeHtml(i.categoria)}${i.subcategoria ? ' · ' + escapeHtml(i.subcategoria) : ''}</span>` : ''}
      </td>
      <td>${dash(i.empresa)}</td>
      <td class="cell-muted">${dash(i.local)}</td>
      <td class="cell-muted">${dash(i.cobranca)}</td>
      <td class="col-numero ${cliques ? 'cell-strong' : 'cell-muted'}">${CLIQUES_OK ? formatNumber(cliques) : '—'}</td>
    </tr>`;
  }).join('');
}
