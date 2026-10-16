/* ==========================================================================
   LOVE ADMIN — Serviços/Produtos (HUB/B2B)
   Tudo o que os fornecedores cadastraram no Catálogo de serviços do Hub
   (tabela products): título, empresa, local, unidade de cobrança (UC) e
   quantos cliques cada um recebeu na vitrine dos anfitriões
   (produto_cliques, migration 054).

   Categoria, UC, status e período ficam num drawer só, aberto pelo botão
   Filtros. O período recorta a contagem de cliques.

   Seleção em massa (igual a Empresas › Cadastros): marcar linhas e
   Suspender, Reativar ou Excluir. Suspender usa admin_suspender_servicos
   (migration 059): o serviço some do Explorar e o fornecedor não consegue
   reativar sozinho.
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
let SELECIONADAS = new Set();
let CLIQUES_OK = true;

/** Filtros aplicados. `de`/`ate` são Date (início e fim do dia) ou null. */
const FILTROS = { categoria: '', uc: '', status: '', periodo: 'tudo', dia: '', inicio: '', fim: '', de: null, ate: null };

const STATUS_SERVICO = { ativo: 'Ativo', inativo: 'Inativo', suspenso: 'Suspenso' };
const statusDe = i => (i.suspenso ? 'suspenso' : i.ativo ? 'ativo' : 'inativo');

document.addEventListener('DOMContentLoaded', async () => {
  if (!(await window.adminReady)) return;

  const tbody = document.getElementById('tbody');
  renderLoading(tbody, 7);

  const [produtos, fornecedores, cliques] = await Promise.all([
    safeSelect('products', '*', q => q.order('created_at', { ascending: false })),
    safeSelect('fornecedores', 'id, company_name, city, state'),
    carregarCliques()
  ]);
  if (produtos.error) return renderError(tbody, 7, produtos.error);

  CLIQUES = cliques.data;
  CLIQUES_OK = !cliques.error;

  const porId = new Map(fornecedores.data.map(f => [f.id, f]));
  ITENS = produtos.data.map(p => montarItem(p, porId.get(p.fornecedor_id)));

  render();
  ligarSelecao();

  document.getElementById('busca').addEventListener('input', render);
  document.getElementById('btn-filtros').addEventListener('click', abrirFiltros);

  addHeaderAction('Exportar', () => exportarCSV('servicos-produtos', [
    { titulo: 'Produto/Serviço', valor: i => i.titulo },
    { titulo: 'Categoria', valor: i => i.categoria },
    { titulo: 'Empresa', valor: i => i.empresa },
    { titulo: 'Local', valor: i => i.local },
    { titulo: 'UC', valor: i => i.cobranca },
    { titulo: 'Cliques', valor: i => cliquesDe(i.id) },
    { titulo: 'Status', valor: i => STATUS_SERVICO[statusDe(i)] }
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
    ativo: p.active !== false,
    suspenso: p.suspenso === true
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
          <span class="field-label">Status</span>
          <select class="field-select" name="status">
            ${opcao('', 'Todos os status', FILTROS.status)}
            ${Object.entries(STATUS_SERVICO).map(([v, t]) => opcao(v, t, FILTROS.status)).join('')}
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
    Object.assign(FILTROS, { categoria: '', uc: '', status: '', periodo: 'tudo', dia: '', inicio: '', fim: '', de: null, ate: null });
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
      status: d.status,
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
  const ativos = [FILTROS.categoria, FILTROS.uc, FILTROS.status, FILTROS.periodo !== 'tudo'].filter(Boolean).length;
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
    if (FILTROS.status && statusDe(i) !== FILTROS.status) return false;
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
    renderBarraDeSelecao();
    renderEmpty(tbody, 7, 'Nenhum produto ou serviço encontrado',
      ITENS.length
        ? 'Ajuste a busca ou os filtros.'
        : 'Quando os fornecedores cadastrarem itens no Catálogo de serviços do Hub, eles aparecem aqui.');
    return;
  }

  tbody.innerHTML = lista.map(i => {
    const cliques = cliquesDe(i.id);
    const marcada = SELECIONADAS.has(i.id);
    const status = statusDe(i);
    return `
    <tr data-id="${i.id}" class="${marcada ? 'is-selecionada' : ''}">
      <td class="col-selecao">
        <input type="checkbox" data-selecionar="${i.id}" ${marcada ? 'checked' : ''} aria-label="Selecionar ${escapeHtml(i.titulo)}">
      </td>
      <td>
        <span class="cell-strong">${escapeHtml(i.titulo)}</span>
        ${i.categoria ? `<br><span class="cell-muted">${escapeHtml(i.categoria)}${i.subcategoria ? ' · ' + escapeHtml(i.subcategoria) : ''}</span>` : ''}
      </td>
      <td>${dash(i.empresa)}</td>
      <td class="cell-muted">${dash(i.local)}</td>
      <td class="cell-muted">${dash(i.cobranca)}</td>
      <td class="col-numero ${cliques ? 'cell-strong' : 'cell-muted'}">${CLIQUES_OK ? formatNumber(cliques) : '—'}</td>
      <td>${badge(STATUS_SERVICO[status], status === 'ativo' ? 'badge-success' : status === 'inativo' ? 'badge-warning' : '')}</td>
    </tr>`;
  }).join('');

  tbody.querySelectorAll('[data-selecionar]').forEach(caixa => {
    caixa.addEventListener('change', () => {
      if (caixa.checked) SELECIONADAS.add(caixa.dataset.selecionar);
      else SELECIONADAS.delete(caixa.dataset.selecionar);
      caixa.closest('tr').classList.toggle('is-selecionada', caixa.checked);
      renderBarraDeSelecao();
    });
  });

  renderBarraDeSelecao();
}

/* ------------------------------------------------------ Seleção em massa */

function ligarSelecao() {
  document.getElementById('selecionar-todos').addEventListener('change', (e) => {
    // Só o que está na tela (filtro e busca aplicados).
    const visiveis = filtrar().map(i => i.id);
    if (e.target.checked) visiveis.forEach(id => SELECIONADAS.add(id));
    else visiveis.forEach(id => SELECIONADAS.delete(id));
    render();
  });

  document.getElementById('btn-limpar-selecao').addEventListener('click', () => {
    SELECIONADAS.clear();
    render();
  });

  document.getElementById('btn-suspender-selecao').addEventListener('click', perguntarAcaoEmMassa);
}

function renderBarraDeSelecao() {
  const total = SELECIONADAS.size;
  document.getElementById('barra-selecao').hidden = total === 0;
  document.getElementById('selecao-contagem').textContent =
    `${formatNumber(total)} ${total === 1 ? 'selecionado' : 'selecionados'}`;

  const visiveis = filtrar().map(i => i.id);
  const todos = document.getElementById('selecionar-todos');
  todos.checked = visiveis.length > 0 && visiveis.every(id => SELECIONADAS.has(id));
  todos.indeterminate = !todos.checked && visiveis.some(id => SELECIONADAS.has(id));
}

const qtdServicos = n => `${formatNumber(n)} ${n === 1 ? 'serviço' : 'serviços'}`;

function perguntarAcaoEmMassa() {
  const ids = [...SELECIONADAS];
  const selecionados = ITENS.filter(i => SELECIONADAS.has(i.id));
  const suspensos = selecionados.filter(i => i.suspenso).map(i => i.id);
  const naoSuspensos = selecionados.filter(i => !i.suspenso).map(i => i.id);

  const acoes = [
    { rotulo: 'Excluir', classe: 'btn-danger', aoClicar: () => confirmarExclusao(ids) }
  ];
  if (suspensos.length) {
    acoes.push({ rotulo: 'Reativar', classe: 'btn-neutro', aoClicar: () => suspender(suspensos, false) });
  }
  if (naoSuspensos.length) {
    acoes.push({ rotulo: 'Suspender', classe: 'btn-neutro', aoClicar: () => suspender(naoSuspensos, true) });
  }
  acoes.push({ rotulo: 'Cancelar', classe: 'btn-ghost', aoClicar: () => Modal.fechar() });

  Modal.abrir({
    titulo: `Deseja suspender ou excluir ${qtdServicos(ids.length)}?`,
    texto: 'Suspender tira o serviço do Explorar e o fornecedor não consegue reativar sozinho; dá para desfazer em Reativar. '
         + 'Excluir apaga o serviço do catálogo do fornecedor.'
         + (suspensos.length ? ` ${qtdServicos(suspensos.length)} da seleção já ${suspensos.length === 1 ? 'está suspenso' : 'estão suspensos'}.` : ''),
    acoes
  });
}

function confirmarExclusao(ids) {
  Modal.abrir({
    titulo: 'Tem certeza?',
    texto: `${qtdServicos(ids.length)} ${ids.length === 1 ? 'será apagado' : 'serão apagados'} do catálogo do fornecedor. Esta ação não pode ser desfeita.`,
    acoes: [
      { rotulo: 'Sim', classe: 'btn-danger', aoClicar: () => excluir(ids) },
      { rotulo: 'Não', classe: 'btn-ghost', aoClicar: () => Modal.fechar() }
    ]
  });
}

async function suspender(ids, suspenderServicos) {
  Modal.ocupado(true);
  const { data, error } = await supabaseClient.rpc('admin_suspender_servicos', { p_ids: ids, p_suspender: suspenderServicos });
  Modal.ocupado(false);
  Modal.fechar();

  if (error) {
    return toast(/admin_suspender_servicos|does not exist|schema cache/i.test(error.message || '')
      ? 'Rode supabase/migrations/059_servico_suspenso_pelo_admin.sql no Supabase.'
      : `Não foi possível ${suspenderServicos ? 'suspender' : 'reativar'}: ${error.message}`);
  }

  const feitos = Number(data) || ids.length;
  ITENS.forEach(i => { if (ids.includes(i.id)) i.suspenso = suspenderServicos; });
  SELECIONADAS.clear();
  render();
  toast(`${qtdServicos(feitos)} ${suspenderServicos ? (feitos === 1 ? 'suspenso' : 'suspensos') : (feitos === 1 ? 'reativado' : 'reativados')}.`);
}

async function excluir(ids) {
  Modal.ocupado(true);
  const { data, error } = await supabaseClient.from('products').delete().in('id', ids).select('id');
  Modal.ocupado(false);
  Modal.fechar();

  if (error) return toast(`Não foi possível excluir: ${error.message}`);

  const apagados = new Set((data || []).map(r => r.id));
  if (!apagados.size) return toast('Nenhum serviço foi excluído.');

  ITENS = ITENS.filter(i => !apagados.has(i.id));
  SELECIONADAS.clear();
  render();
  toast(apagados.size < ids.length
    ? `${qtdServicos(apagados.size)} excluído(s); ${formatNumber(ids.length - apagados.size)} não puderam ser excluídos.`
    : `${qtdServicos(apagados.size)} ${apagados.size === 1 ? 'excluído' : 'excluídos'}.`);
}
