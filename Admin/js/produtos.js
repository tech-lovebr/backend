/* ==========================================================================
   LOVE ADMIN — Serviços/Produtos (HUB/B2B)
   Tudo o que os fornecedores cadastraram no Catálogo de serviços do Hub
   (tabela products): título, empresa, local, unidade de cobrança (UC) e
   quantos cliques cada um recebeu na vitrine dos anfitriões
   (produto_cliques, migration 054).

   Categoria, UC, status e período ficam no dropdown "Filtrar por", igual ao
   de Cadastro de empresas. O período recorta a contagem de cliques.

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
let FORNECEDORES = new Map();
const EXTRAS = { leads: [], favoritos: [], sites: new Map() };
let CLIQUES_OK = true;

/** Filtros aplicados. `de`/`ate` são Date (início e fim do dia) ou null. */
const FILTROS = { categoria: '', uc: '', status: '', periodo: 'tudo', dia: '', inicio: '', fim: '', de: null, ate: null };

const STATUS_SERVICO = { ativo: 'Ativo', inativo: 'Inativo', suspenso: 'Suspenso' };
const statusDe = i => (i.suspenso ? 'suspenso' : i.ativo ? 'ativo' : 'inativo');

document.addEventListener('DOMContentLoaded', async () => {
  if (!(await window.adminReady)) return;

  const tbody = document.getElementById('tbody');
  renderLoading(tbody, 8);

  const [produtos, fornecedores, cliques] = await Promise.all([
    safeSelect('products', '*', q => q.order('created_at', { ascending: false })),
    safeSelect('fornecedores', 'id, company_name, city, state, cnpj, document_type, email, phone, plan, contact_name'),
    carregarCliques()
  ]);
  if (produtos.error) return renderError(tbody, 8, produtos.error);

  CLIQUES = cliques.data;

  // Dados só do drawer: pedidos de orçamento e contratações (leads ligados ao
  // serviço), favoritos e o endereço do site da empresa. Falhar não trava a lista.
  Promise.all([
    safeSelect('leads', 'product_id, status'),
    safeSelect('servicos_favoritos', 'produto_id'),
    safeSelect('site_pages', 'fornecedor_id, slug')
  ]).then(([leads, favoritos, sites]) => {
    EXTRAS.leads = leads.data.filter(l => l.product_id);
    EXTRAS.favoritos = favoritos.data;
    EXTRAS.sites = new Map(sites.data.map(s => [s.fornecedor_id, s.slug]));
  });
  CLIQUES_OK = !cliques.error;

  const porId = new Map(fornecedores.data.map(f => [f.id, f]));
  ITENS = produtos.data.map(p => montarItem(p, porId.get(p.fornecedor_id)));
  FORNECEDORES = porId;

  render();
  ligarSelecao();

  document.getElementById('busca').addEventListener('input', render);
  montarMenuDeFiltros();

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
    suspenso: p.suspenso === true,
    raw: p
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

/* --------------------------------------------- Menu de filtros (dropdown)
   Mesmo dropdown de "Filtrar por" de Cadastro de empresas: abre embaixo do
   botão, aplica na hora a cada mudança e fecha ao clicar fora ou no Esc. */

function montarMenuDeFiltros() {
  const botao = document.getElementById('btn-filtros');
  const menu = document.getElementById('filtro-menu');
  const $ = id => document.getElementById(id);

  const preencher = (id, pares) => {
    const select = $(id);
    pares.forEach(([valor, texto]) => {
      const opt = document.createElement('option');
      opt.value = valor;
      opt.textContent = texto;
      select.appendChild(opt);
    });
  };

  preencher('filtro-categoria',
    [...new Set(ITENS.map(i => i.categoria).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'pt-BR')).map(c => [c, c]));
  preencher('filtro-status', Object.entries(STATUS_SERVICO));
  preencher('filtro-uc', Object.entries(COBRANCA).filter(([tipo]) => ITENS.some(i => i.tipo === tipo)));
  preencher('filtro-periodo', Object.entries(PERIODOS));

  const hoje = isoLocal(new Date());
  ['filtro-dia', 'filtro-inicio', 'filtro-fim'].forEach(id => { $(id).max = hoje; });

  const fechar = () => { menu.hidden = true; botao.setAttribute('aria-expanded', 'false'); };

  botao.addEventListener('click', (e) => {
    e.stopPropagation();
    menu.hidden = !menu.hidden;
    botao.setAttribute('aria-expanded', String(!menu.hidden));
  });
  menu.addEventListener('click', (e) => e.stopPropagation());
  document.addEventListener('click', fechar);
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') fechar(); });

  const aplicar = () => {
    const periodo = $('filtro-periodo').value;
    $('campo-periodo-dia').hidden = periodo !== 'dia';
    $('campo-periodo-intervalo').hidden = periodo !== 'intervalo';
    if (periodo === 'dia' && !$('filtro-dia').value) $('filtro-dia').value = hoje;

    let inicio = $('filtro-inicio').value;
    let fimData = $('filtro-fim').value;
    if (inicio && fimData && inicio > fimData) [inicio, fimData] = [fimData, inicio];

    Object.assign(FILTROS, {
      categoria: $('filtro-categoria').value,
      status: $('filtro-status').value,
      uc: $('filtro-uc').value,
      periodo,
      dia: $('filtro-dia').value,
      inicio,
      fim: fimData
    });
    // Intervalo sem nenhuma data ainda conta como "todo o período".
    const intervaloVazio = periodo === 'intervalo' && !inicio && !fimData;
    Object.assign(FILTROS, intervaloVazio ? { de: null, ate: null } : intervaloDoPeriodo(FILTROS));
    render();
  };

  ['filtro-categoria', 'filtro-status', 'filtro-uc', 'filtro-periodo', 'filtro-dia', 'filtro-inicio', 'filtro-fim']
    .forEach(id => $(id).addEventListener('change', aplicar));

  $('limpar-filtros').addEventListener('click', () => {
    ['filtro-categoria', 'filtro-status', 'filtro-uc', 'filtro-dia', 'filtro-inicio', 'filtro-fim'].forEach(id => { $(id).value = ''; });
    $('filtro-periodo').value = 'tudo';
    aplicar();
    fechar();
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
    renderEmpty(tbody, 8, 'Nenhum produto ou serviço encontrado',
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
      <td class="col-acoes">${botaoVerMais(i.id)}</td>
    </tr>`;
  }).join('');

  ligarAcoesDaLinha(tbody, abrirDetalhe);

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

/* ------------------------------------------------------- Drawer do serviço
   Tudo o que o fornecedor preencheu no cadastro do Hub (products + extra),
   a empresa dona, os números (cliques, orçamentos, contratações,
   favoritos) e os links da página na Love e do site da empresa. */

const DIAS_SEMANA = { seg: 'Seg', ter: 'Ter', qua: 'Qua', qui: 'Qui', sex: 'Sex', sab: 'Sáb', dom: 'Dom' };

function slugify(texto) {
  return String(texto || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
}

/* Mesmo endereço que a plataforma monta (rotaPerfilFornecedor em js/app.js). */
function linkNaLove(item) {
  const id8 = v => String(v || '').slice(0, 8);
  return `https://love.com.br/fornecedores/${slugify(item.empresa) || 'fornecedor'}-${id8(item.fornecedorId)}/${slugify(item.titulo) || 'servico'}-${id8(item.id)}`;
}

/* Pro publica em <slug>.love.com.br; Gratuito em hub.love.com.br/<slug>. */
function linkDoSite(fornecedor, slug) {
  if (!slug) return null;
  return fornecedor && fornecedor.plan === 'Pro' ? `https://${slug}.love.com.br` : `https://hub.love.com.br/${slug}`;
}

const moeda = v => (Number(v) > 0 ? formatCurrency(v) : null);
const simNao = v => (v === true ? 'Sim' : v === false ? 'Não' : null);

function linhasDoPreco(pricing, venue, price) {
  const l = [];
  const add = (r, v) => { if (v !== null && v !== undefined && v !== '') l.push([r, v]); };
  if (pricing && pricing.type === 'POR_PESSOA' && pricing.perPerson) {
    add('Preço por pessoa', moeda(pricing.perPerson.pricePerPerson));
    add('Mínimo de pessoas', pricing.perPerson.minPeople);
    add('Máximo de pessoas', pricing.perPerson.maxPeople);
  } else if (pricing && pricing.type === 'POR_HORA' && pricing.perHour) {
    add('Preço por hora', moeda(pricing.perHour.pricePerHour));
    add('Mínimo de horas', pricing.perHour.minHours);
    add('Hora extra', moeda(pricing.perHour.extraHourPrice));
  } else if (pricing && pricing.type === 'VALOR_FIXO' && pricing.fixed) {
    add('Valor', moeda(pricing.fixed.price));
    if (pricing.fixed.durationValue) add('Duração', `${pricing.fixed.durationValue} ${pricing.fixed.durationUnit || ''}`.trim());
  } else if (pricing && pricing.type === 'SOB_CONSULTA') {
    add('A partir de', moeda(pricing.onRequest && pricing.onRequest.startingPrice) || 'Sob consulta');
  }
  if (venue) {
    add('Diária (seg a sex)', moeda(venue.priceWeekday));
    add('Diária sábado', moeda(venue.priceSaturday));
    add('Diária domingo', moeda(venue.priceSunday));
    add('Diária feriado', moeda(venue.priceHoliday));
    add('Taxa de limpeza', moeda(venue.cleaningFee));
  }
  if (!l.length) add('Preço', moeda(price));
  return l;
}

function linhasDoEspaco(v) {
  if (!v) return [];
  const l = [];
  const add = (r, x) => { if (x !== null && x !== undefined && x !== '' && !(Array.isArray(x) && !x.length)) l.push([r, x]); };
  add('Endereço', [[v.street || v.address, v.number].filter(Boolean).join(', '), v.complement, [v.city, v.state].filter(Boolean).join(' / ')].filter(Boolean).join(' · '));
  add('Tamanho', v.size ? `${v.size} m²` : null);
  add('Capacidade sentados', v.capacitySeated);
  add('Capacidade em pé', v.capacityStanding);
  add('Dias', Array.isArray(v.days) ? v.days.map(d => DIAS_SEMANA[d] || d).join(', ') : v.days);
  add('Horário', v.hoursOpen || v.hoursClose ? `${v.hoursOpen || '?'} às ${v.hoursClose || '?'}` : null);
  add('Áreas comuns', Array.isArray(v.commonAreas) ? v.commonAreas.join(', ') : v.commonAreas);
  add('Acessível (PcD)', simNao(v.isPcdAccessible));
  add('Gerador', simNao(v.hasGenerator));
  add('Restrição de barulho', typeof v.noiseRestriction === 'boolean' ? simNao(v.noiseRestriction) : v.noiseRestriction);
  return l;
}

/* Campos de extra que não têm lugar próprio no drawer, em texto simples. */
const EXTRA_COM_LUGAR = ['pricing', 'venue', 'subcategory', 'cover', 'videoUrl'];
const ROTULOS_EXTRA = {
  attributes: 'Atributos', cancellationPolicy: 'Política de cancelamento', dishes: 'Pratos',
  equipmentType: 'Tipo de equipamento', logistics: 'Logística', offerType: 'Tipo de oferta', scope: 'Escopo'
};

function textoDeValor(v) {
  if (v === null || v === undefined || v === '') return null;
  if (typeof v === 'boolean') return v ? 'Sim' : 'Não';
  if (Array.isArray(v)) return v.map(textoDeValor).filter(Boolean).join(', ') || null;
  if (typeof v === 'object') {
    return Object.entries(v).map(([k, x]) => { const t = textoDeValor(x); return t ? `${k}: ${t}` : null; }).filter(Boolean).join(' · ') || null;
  }
  return String(v);
}

function abrirDetalhe(id) {
  const item = ITENS.find(i => i.id === id);
  if (!item) return;
  const p = item.raw || {};
  const extra = p.extra || {};
  const f = FORNECEDORES.get(item.fornecedorId) || {};

  const leads = EXTRAS.leads.filter(l => l.product_id === id);
  const contratacoes = leads.filter(l => l.status === 'fechado').length;
  const favoritos = EXTRAS.favoritos.filter(x => x.produto_id === id).length;
  const cliquesTotal = CLIQUES.filter(c => c.produto_id === id).length;
  const site = linkDoSite(f, EXTRAS.sites.get(item.fornecedorId));
  const status = statusDe(item);

  const linha = (rotulo, valor) => (valor === null || valor === undefined || valor === '') ? '' : `
    <div class="dados-linha"><span class="rotulo">${escapeHtml(rotulo)}</span><span class="valor">${valor}</span></div>`;
  const bloco = (titulo, pares) => pares.length ? `
    <p class="drawer-section-title">${escapeHtml(titulo)}</p>
    <div class="lista-dados">${pares.map(([r, v]) => linha(r, escapeHtml(String(v)))).join('')}</div>` : '';
  const link = (url, texto) => url ? `<a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer" class="link-convite">${escapeHtml(texto || url)}</a>` : null;

  const capa = (extra.cover && extra.cover.originalUrl) || p.cover_image_url;
  const galeria = (Array.isArray(p.gallery) ? p.gallery : []).map(g => (typeof g === 'string' ? g : g && g.url)).filter(Boolean);
  const outros = Object.entries(extra)
    .filter(([k]) => !EXTRA_COM_LUGAR.includes(k))
    .map(([k, v]) => [ROTULOS_EXTRA[k] || k, textoDeValor(v)])
    .filter(([, v]) => v);

  Drawer.open({
    title: item.titulo,
    subtitle: item.empresa || '',
    body: `
      ${capa ? `<img src="${escapeHtml(capa)}" alt="" class="produto-capa">` : ''}

      <div class="lista-dados">
        ${linha('Status', badge(STATUS_SERVICO[status], status === 'ativo' ? 'badge-success' : status === 'inativo' ? 'badge-warning' : ''))}
        ${linha('Categoria', escapeHtml([item.categoria, item.subcategoria].filter(Boolean).join(' · ') || '—'))}
        ${linha('Unidade de cobrança (UC)', escapeHtml(item.cobranca || '—'))}
        ${linha('Cadastrado em', escapeHtml(formatDateTime(p.created_at)))}
        ${item.suspenso && p.suspenso_em ? linha('Suspenso em', escapeHtml(formatDateTime(p.suspenso_em))) : ''}
      </div>

      <p class="drawer-section-title">Números</p>
      <div class="lista-dados">
        ${linha('Cliques', CLIQUES_OK ? escapeHtml(`${formatNumber(cliquesTotal)} no total · ${formatNumber(cliquesDe(id))} em ${rotuloDoPeriodo().toLowerCase()}`) : '—')}
        ${linha('Pedidos de orçamento e contatos', escapeHtml(formatNumber(leads.length)))}
        ${linha('Contratações', escapeHtml(formatNumber(contratacoes)))}
        ${linha('Favoritado por', escapeHtml(`${formatNumber(favoritos)} ${favoritos === 1 ? 'anfitrião' : 'anfitriões'}`))}
        ${linha('Chats abertos por este serviço', '<span class="cell-muted">ainda não medido</span>')}
      </div>

      <p class="drawer-section-title">Empresa</p>
      <div class="lista-dados">
        ${linha('Empresa', escapeHtml(f.company_name || '—'))}
        ${linha(f.document_type === 'cpf' ? 'CPF' : 'CNPJ', f.cnpj ? celulaCopiavel(f.cnpj, f.document_type === 'cpf' ? 'CPF' : 'CNPJ') : '—')}
        ${linha('Responsável', escapeHtml(f.contact_name || ''))}
        ${linha('E-mail', f.email ? celulaCopiavel(f.email, 'E-mail') : '')}
        ${linha('Telefone', escapeHtml(f.phone || ''))}
        ${linha('Plano', escapeHtml(f.plan || 'Gratuito'))}
        ${linha('Local', escapeHtml(item.local || ''))}
      </div>

      <p class="drawer-section-title">Links</p>
      <div class="lista-dados">
        ${linha('Página na Love', link(linkNaLove(item), 'Abrir no love.com.br'))}
        ${linha('Site da empresa', link(site, site ? site.replace(/^https:\/\//, '') : null) || '<span class="cell-muted">não publicado</span>')}
        ${linha('Vídeo', link(extra.videoUrl, 'Abrir vídeo'))}
      </div>

      ${bloco('Preço', linhasDoPreco(extra.pricing, extra.venue, p.price))}
      ${bloco('Espaço', linhasDoEspaco(extra.venue))}

      ${p.description ? `<p class="drawer-section-title">Descrição</p><p class="texto-corrido">${escapeHtml(p.description)}</p>` : ''}

      ${galeria.length ? `<p class="drawer-section-title">Galeria</p>
        <div class="produto-galeria">${galeria.map(u => `<a href="${escapeHtml(u)}" target="_blank" rel="noopener noreferrer"><img src="${escapeHtml(u)}" alt=""></a>`).join('')}</div>` : ''}

      ${bloco('Outros campos do cadastro', outros)}`,
    footer: `<button type="button" class="btn btn-ghost" id="btn-fechar-servico">Fechar</button>`
  });

  document.getElementById('btn-fechar-servico').addEventListener('click', () => Drawer.close());
  ligarAcoesDaLinha(document.getElementById('drawer-body'), () => {});
}
