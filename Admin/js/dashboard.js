/* ==========================================================================
   LOVE ADMIN — Dashboard

   Cores da rosca: paleta categórica validada com o validador da skill
   dataviz sobre fundo branco — passa em todos os gates, inclusive CVD.
   ========================================================================== */

// Ordem fixa da paleta categórica — nunca reciclada entre categorias.
const CORES_CATEGORIA = ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4'];

let DADOS = null;

document.addEventListener('DOMContentLoaded', async () => {
  if (!(await window.adminReady)) return;

  renderKpiSkeleton();

  const [fornecedores, clientes, eventos, carteira, contratos, convidados, presentes, produtos] = await Promise.all([
    safeSelect('fornecedores', '*'),
    safeSelect('clientes', '*'),
    safeSelect('eventos', '*'),
    safeSelect('wallet_transactions', 'fornecedor_id, type, amount, created_at'),
    safeSelect('contracts', 'fornecedor_id, valor_total, status, created_at'),
    safeSelect('convidados', 'evento_id, cliente_id, status'),
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
  const volume = DADOS.carteira
    .filter(t => t.type === 'credit')
    .reduce((s, t) => s + (Number(t.amount) || 0), 0);

  const faturamento = DADOS.contratos.reduce((s, c) => s + (Number(c.valor_total) || 0), 0);

  const tile = (label, value, sub) => `
    <div class="kpi">
      <p class="kpi-label">${escapeHtml(label)}</p>
      <p class="kpi-value">${escapeHtml(value)}</p>
      <p class="kpi-sub">${escapeHtml(sub)}</p>
    </div>`;

  document.getElementById('kpi-grid').innerHTML = [
    tile('Volume B2B', formatCurrency(volume), 'Entradas na carteira dos fornecedores'),
    tile('Faturamento bruto', formatCurrency(faturamento), 'Valor total dos contratos'),
    tile('Fornecedores', formatNumber(DADOS.fornecedores.length), 'Contas B2B criadas'),
    tile('Anfitriões', formatNumber(DADOS.clientes.length), 'Contas na plataforma')
  ].join('');
}

/* -------------------------------------------------- Top fornecedores */

function renderTopFornecedores() {
  const host = document.getElementById('top-fornecedores');

  const porFornecedor = new Map();
  DADOS.contratos.forEach(c => {
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
    host.innerHTML = `<div class="empty-state"><strong>Nenhum contrato ativo</strong>
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
  const total = DADOS.eventos.length;

  if (!total) {
    host.innerHTML = `<div class="empty-state"><strong>Nenhum evento criado</strong>
      <p>As comemorações aparecem aqui assim que os clientes começarem a criá-las.</p></div>`;
    return;
  }

  const fatias = [...groupBy(DADOS.eventos, 'tipo').entries()]
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
      CONTAS.length ? 'Ajuste a busca ou o filtro de origem.' : 'Nenhuma conta foi criada ainda.');
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
      <button type="button" class="btn btn-ghost btn-sm" data-pagina="${PAGINA_CONTAS - 1}"
              ${PAGINA_CONTAS === 1 ? 'disabled' : ''}>Anterior</button>
      <span class="paginacao-atual">${PAGINA_CONTAS} de ${totalPaginas}</span>
      <button type="button" class="btn btn-ghost btn-sm" data-pagina="${PAGINA_CONTAS + 1}"
              ${PAGINA_CONTAS === totalPaginas ? 'disabled' : ''}>Próxima</button>
    </div>`;

  host.querySelectorAll('[data-pagina]').forEach(btn => {
    btn.addEventListener('click', () => {
      PAGINA_CONTAS = Number(btn.dataset.pagina);
      renderContas();
    });
  });
}
