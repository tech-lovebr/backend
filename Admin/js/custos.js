/* ==========================================================================
   LOVE ADMIN — Settings · Custos
   Custos de tecnologia da empresa: Vercel, Supabase e Amazon SES vêm na hora
   pela função /api/custos; o resto é lançado à mão (tabela custos). Tudo em
   outra moeda é convertido para real pela cotação do dia.
   ========================================================================== */

const API_CUSTOS = 'https://love.com.br/api/custos';

const CATEGORIAS_CUSTO = [
  'Infraestrutura', 'Servidor', 'Banco de dados', 'E-mail', 'Ferramentas e APIs',
  'Domínios', 'Marketing', 'Mídia', 'Software e assinaturas', 'Segurança', 'Outros'
];
const EMPRESAS = ['Vercel', 'Supabase', 'Amazon', 'AWS', 'GoDaddy', 'Registro.br', 'Claude Code', 'Gemini', 'Google', 'Microsoft'];
const MOEDAS = { BRL: 'Real (BRL)', USD: 'Dólar (USD)', EUR: 'Euro (EUR)' };
const SIMBOLO = { BRL: 'R$', USD: 'US$', EUR: '€' };
const CORES = ['#183b54', '#2a78d6', '#1baf7a', '#eda100', '#eb6834', '#e87ba4', '#7c5cd6', '#71717A'];

let MESES = [];
let COTACAO = { BRL: 1, USD: null, EUR: null };
let INTEGRACOES = [];
let MANUAIS = [];
let ABA = 'atuais';

document.addEventListener('DOMContentLoaded', async () => {
  if (!(await window.adminReady)) return;

  addHeaderAction('Adicionar custo', () => abrirFormulario(), {
    principal: true,
    icone: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5l0 14" /><path d="M5 12l14 0" /></svg>'
  });

  document.querySelectorAll('#abas-custos [data-aba]').forEach(aba => aba.addEventListener('click', () => {
    ABA = aba.dataset.aba;
    document.querySelectorAll('#abas-custos [data-aba]').forEach(a => a.classList.toggle('is-active', a === aba));
    renderTabela();
  }));
  document.getElementById('busca').addEventListener('input', renderTabela);
  document.getElementById('grafico-serie').addEventListener('change', renderGraficoMeses);

  let largura = window.innerWidth;
  window.addEventListener('resize', () => {
    if (Math.abs(window.innerWidth - largura) < 20) return;
    largura = window.innerWidth;
    renderGraficoMeses();
  });

  await carregar();
});

/* ------------------------------------------------------------ Dados */

async function carregar(forcar = false) {
  renderLoading(document.getElementById('tbody'), 6);
  MESES = ultimosMeses();

  const [integracoes, manuais] = await Promise.all([
    buscarIntegracoes(forcar),
    safeSelect('custos', '*', q => q.order('data', { ascending: false }))
  ]);

  INTEGRACOES = integracoes.itens || [];
  if (integracoes.cotacoes) COTACAO = { ...COTACAO, ...integracoes.cotacoes };
  if (!COTACAO.USD || !COTACAO.EUR) await buscarCotacao();
  MANUAIS = manuais.error ? [] : manuais.data;
  if (manuais.error) toast('A tabela de custos manuais ainda não existe (migration 089).');

  renderTudo();
}

async function buscarIntegracoes(forcar) {
  try {
    const { data: { session } } = await supabaseClient.auth.getSession();
    const r = await fetch(`${API_CUSTOS}${forcar ? '?atualizar=1' : ''}`, {
      headers: { Authorization: `Bearer ${session?.access_token || ''}` }
    });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return await r.json();
  } catch (e) {
    // Sem a função no ar, as três integrações aparecem como não conectadas.
    const zerado = Object.fromEntries(MESES.map(m => [m, 0]));
    return {
      itens: [
        { fonte: 'vercel', nome: 'Vercel', categoria: 'Servidor', tipo: 'recorrente', moeda: 'USD', status: 'erro', erro: String(e.message || e), meses: zerado },
        { fonte: 'supabase', nome: 'Supabase', categoria: 'Banco de dados', tipo: 'recorrente', moeda: 'USD', status: 'erro', erro: String(e.message || e), meses: zerado },
        { fonte: 'aws', nome: 'Amazon', categoria: 'E-mail', tipo: 'recorrente', moeda: 'USD', status: 'erro', erro: String(e.message || e), meses: zerado }
      ]
    };
  }
}

async function buscarCotacao() {
  try {
    const r = await fetch('https://economia.awesomeapi.com.br/json/last/USD-BRL,EUR-BRL');
    const j = await r.json();
    COTACAO.USD = COTACAO.USD || Number(j.USDBRL?.bid) || null;
    COTACAO.EUR = COTACAO.EUR || Number(j.EURBRL?.bid) || null;
  } catch { /* sem cotação: valores em outra moeda ficam sem conversão */ }
}

function ultimosMeses() {
  const hoje = new Date();
  return Array.from({ length: 12 }, (_, i) => {
    const d = new Date(hoje.getFullYear(), hoje.getMonth() - 11 + i, 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });
}

const mesAtual = () => MESES[MESES.length - 1];
const mesPassado = () => MESES[MESES.length - 2];

function emReais(valor, moeda) {
  if (moeda === 'BRL' || !moeda) return Number(valor) || 0;
  const taxa = COTACAO[moeda];
  return taxa ? (Number(valor) || 0) * taxa : 0;
}

function formatarMoeda(valor, moeda) {
  const casas = Math.abs(valor) > 0 && Math.abs(valor) < 1 ? 3 : 2;
  return `${SIMBOLO[moeda] || moeda} ${Number(valor || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: casas })}`;
}

function nomeDoMes(mes, curto = false) {
  const [a, m] = mes.split('-').map(Number);
  const nome = new Date(a, m - 1, 1).toLocaleDateString('pt-BR', { month: curto ? 'short' : 'long' }).replace('.', '');
  return curto ? `${nome} ${String(a).slice(2)}` : `${nome.charAt(0).toUpperCase()}${nome.slice(1)} de ${a}`;
}

/** Quanto um custo manual pesa no mês, na moeda dele. */
function valorManualNoMes(c, mes) {
  const inicio = String(c.data || c.created_at || '').slice(0, 7);
  if (c.tipo === 'unico') return inicio === mes ? Number(c.valor) || 0 : 0;
  return inicio <= mes ? Number(c.valor) || 0 : 0;
}

/**
 * Todos os custos numa forma só: { nome, categoria, tipo, moeda, status,
 * meses: { '2026-10': valor na moeda } }, para gráficos e tabelas.
 */
function linhasDeCusto() {
  const integracoes = INTEGRACOES.map(i => ({ ...i, manual: false }));
  const manuais = MANUAIS.map(c => ({
    id: c.id, manual: true, nome: c.nome, categoria: c.categoria, tipo: c.tipo, moeda: c.moeda,
    status: 'ativo', valor: Number(c.valor) || 0, data: c.data, bruto: c,
    meses: Object.fromEntries(MESES.map(m => [m, valorManualNoMes(c, m)]))
  }));
  return [...integracoes, ...manuais];
}

function totalNoMes(linhas, mes) {
  return linhas.reduce((s, l) => s + emReais(l.meses?.[mes] || 0, l.moeda), 0);
}

/* ------------------------------------------------------------ Render */

function renderTudo() {
  const linhas = linhasDeCusto();
  renderKpis(linhas);
  montarSeries(linhas);
  renderGraficoMeses();
  renderGraficoCategorias(linhas);
  renderTabela();
}

function renderKpis(linhas) {
  const atual = totalNoMes(linhas, mesAtual());
  const anterior = totalNoMes(linhas, mesPassado());
  // Média só dos meses que tiveram custo (antes disso as contas não existiam).
  const comCusto = MESES.map(m => totalNoMes(linhas, m)).filter(v => v > 0);
  const media = comCusto.length ? comCusto.reduce((s, v) => s + v, 0) / comCusto.length : 0;
  const cotacao = [
    COTACAO.USD ? `US$ 1 = ${formatCurrency(COTACAO.USD)}` : null,
    COTACAO.EUR ? `€ 1 = ${formatCurrency(COTACAO.EUR)}` : null
  ].filter(Boolean).join(' · ') || 'Cotação indisponível';

  // Mesmo padrão do Dashboard: título em cima, valor com a variação ao lado
  // (vermelha se caiu, verde se subiu) e o período anterior embaixo.
  let variacao = '';
  if (anterior) {
    const pct = ((atual - anterior) / anterior) * 100;
    const classe = pct < 0 ? 'is-negativa' : (pct > 0 ? 'is-positiva' : '');
    variacao = `<span class="kpi-variacao ${classe}">${pct > 0 ? '+' : ''}${pct.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%</span>`;
  }
  const tile = (label, value, sub, extra = '') => `
    <div class="kpi">
      <p class="kpi-label">${escapeHtml(label)}</p>
      <div class="kpi-linha"><p class="kpi-value">${escapeHtml(value)}</p>${extra}</div>
      <p class="kpi-sub">${escapeHtml(sub)}</p>
    </div>`;

  document.getElementById('kpi-grid').innerHTML = [
    tile('Custo deste mês', formatCurrency(atual), `P.P: ${formatCurrency(anterior)}`, variacao),
    tile('Mês passado', formatCurrency(anterior), nomeDoMes(mesPassado())),
    tile('Média mensal', formatCurrency(media), cotacao)
  ].join('');
}

/* Série do gráfico de linha: total ou uma categoria. */
function montarSeries(linhas) {
  const select = document.getElementById('grafico-serie');
  const atual = select.value;
  const categorias = [...new Set(linhas.map(l => l.categoria))].sort((a, b) => a.localeCompare(b, 'pt-BR'));
  select.innerHTML = `<option value="">Total (BRL)</option>${categorias.map(c => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join('')}`;
  if (categorias.includes(atual)) select.value = atual;
}

function renderGraficoMeses() {
  const host = document.getElementById('grafico-meses');
  const serie = document.getElementById('grafico-serie').value;
  const linhas = linhasDeCusto().filter(l => !serie || l.categoria === serie);
  const valores = MESES.map(m => totalNoMes(linhas, m));

  const largura = Math.max(host.clientWidth || 560, 280);
  const altura = 240;
  const margem = { esq: 64, dir: 16, topo: 12, base: 28 };
  const w = largura - margem.esq - margem.dir;
  const h = altura - margem.topo - margem.base;
  const maximo = escalaBonita(Math.max(...valores, 0));
  const x = i => margem.esq + (MESES.length === 1 ? w / 2 : (i * w) / (MESES.length - 1));
  const y = v => margem.topo + h - (v / maximo) * h;

  const marcas = [0, .25, .5, .75, 1].map(f => f * maximo);
  const grade = marcas.map(v => `
    <line x1="${margem.esq}" x2="${largura - margem.dir}" y1="${y(v)}" y2="${y(v)}" class="custos-grade" />
    <text x="${margem.esq - 10}" y="${y(v) + 4}" text-anchor="end" class="custos-eixo">${escapeHtml(formatarEixo(v))}</text>`).join('');

  const pontos = valores.map((v, i) => [x(i), y(v)]);
  const caminho = curvaSuave(pontos);
  const area = `${caminho} L ${x(MESES.length - 1)} ${y(0)} L ${x(0)} ${y(0)} Z`;

  host.innerHTML = `
    <svg width="${largura}" height="${altura}" role="img" aria-label="Custo por mês">
      ${grade}
      <path d="${area}" class="custos-area" />
      <path d="${caminho}" class="custos-linha" />
      ${pontos.map(([px, py], i) => `
        <circle cx="${px}" cy="${py}" r="3.5" class="custos-ponto"><title>${escapeHtml(nomeDoMes(MESES[i]))}: ${formatCurrency(valores[i])}</title></circle>
        <text x="${px}" y="${altura - 6}" text-anchor="middle" class="custos-eixo">${escapeHtml(nomeDoMes(MESES[i], true))}</text>`).join('')}
    </svg>`;
}

/** Teto do eixo arredondado para cima (1, 2, 2,5, 5 × 10ⁿ). */
function escalaBonita(valor) {
  if (!valor) return 1;
  const potencia = 10 ** Math.floor(Math.log10(valor));
  const passo = [1, 2, 2.5, 5, 10].find(p => p * potencia >= valor);
  return passo * potencia;
}

function formatarEixo(v) {
  const casas = v && v < 1 ? 2 : 0;
  return `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: casas, maximumFractionDigits: casas })}`;
}

/** Curva que passa pelos pontos sem passar do valor deles (Catmull-Rom suave). */
function curvaSuave(pontos) {
  if (pontos.length < 2) return pontos.length ? `M ${pontos[0][0]} ${pontos[0][1]}` : '';
  let d = `M ${pontos[0][0]} ${pontos[0][1]}`;
  for (let i = 0; i < pontos.length - 1; i++) {
    const [x0, y0] = pontos[i - 1] || pontos[i];
    const [x1, y1] = pontos[i];
    const [x2, y2] = pontos[i + 1];
    const [x3, y3] = pontos[i + 2] || pontos[i + 1];
    const base = Math.max(y1, y2);
    const c1y = Math.min(y1 + (y2 - y0) / 6, base);
    const c2y = Math.min(y2 - (y3 - y1) / 6, base);
    d += ` C ${x1 + (x2 - x0) / 6} ${c1y} ${x2 - (x3 - x1) / 6} ${c2y} ${x2} ${y2}`;
  }
  return d;
}

function porCategoria(linhas, mes) {
  const mapa = new Map();
  linhas.forEach(l => {
    const v = emReais(l.meses?.[mes] || 0, l.moeda);
    if (!mapa.has(l.categoria)) mapa.set(l.categoria, { categoria: l.categoria, total: 0, itens: 0 });
    const c = mapa.get(l.categoria);
    c.total += v;
    c.itens += 1;
  });
  return [...mapa.values()].sort((a, b) => b.total - a.total);
}

function renderGraficoCategorias(linhas) {
  const host = document.getElementById('grafico-categorias');
  const fatias = porCategoria(linhas, mesAtual()).filter(c => c.total > 0);
  const total = fatias.reduce((s, f) => s + f.total, 0);

  if (!total) {
    host.innerHTML = '<div class="empty-state"><strong>Nenhum custo neste mês</strong><p>Os valores aparecem assim que houver cobrança.</p></div>';
    return;
  }

  const tamanho = 160;
  const raio = 64;
  const espessura = 24;
  const centro = tamanho / 2;
  const circ = 2 * Math.PI * raio;
  let acumulado = 0;
  const arcos = fatias.map((f, i) => {
    const comp = (f.total / total) * circ;
    const traco = fatias.length > 1 ? Math.max(comp - 2, 0.5) : comp;
    const arco = `<circle cx="${centro}" cy="${centro}" r="${raio}" fill="none" stroke="${CORES[i % CORES.length]}"
      stroke-width="${espessura}" stroke-dasharray="${traco} ${circ - traco}" stroke-dashoffset="${-acumulado}"
      transform="rotate(-90 ${centro} ${centro})"><title>${escapeHtml(f.categoria)}: ${formatCurrency(f.total)}</title></circle>`;
    acumulado += comp;
    return arco;
  }).join('');

  host.innerHTML = `
    <div class="donut-wrap custos-donut">
      <svg width="${tamanho}" height="${tamanho}" role="img" aria-label="Custo por categoria">${arcos}</svg>
      <ul class="donut-lista">
        ${fatias.map((f, i) => `
          <li>
            <span class="chave" style="background:${CORES[i % CORES.length]}"></span>
            <span class="nome">${escapeHtml(f.categoria)}</span>
            <span class="valor">${formatCurrency(f.total)} · ${Math.round((f.total / total) * 100)}%</span>
          </li>`).join('')}
      </ul>
    </div>`;
}

/* ------------------------------------------------------------ Tabelas */

const STATUS = {
  ativo: ['Ativo', 'badge-success'],
  nao_conectado: ['Não conectado', ''],
  erro: ['Erro', 'badge-warning']
};
const TIPO = { recorrente: 'Recorrente', unico: 'Pagamento único' };

function renderTabela() {
  const thead = document.getElementById('thead');
  const tbody = document.getElementById('tbody');
  const termo = document.getElementById('busca').value.trim().toLowerCase();
  const linhas = linhasDeCusto();
  const casa = texto => !termo || String(texto || '').toLowerCase().includes(termo);

  if (ABA === 'categorias') {
    thead.innerHTML = '<tr><th>Categoria</th><th class="col-numero">Itens</th><th>Custo do mês</th><th>Participação</th></tr>';
    const cats = porCategoria(linhas, mesAtual()).filter(c => casa(c.categoria));
    const total = cats.reduce((s, c) => s + c.total, 0);
    if (!cats.length) return renderEmpty(tbody, 4, 'Nenhuma categoria', 'Nada encontrado para essa busca.');
    tbody.innerHTML = cats.map(c => `
      <tr class="no-hover">
        <td class="cell-strong">${escapeHtml(c.categoria)}</td>
        <td class="col-numero">${formatNumber(c.itens)}</td>
        <td class="valor-dinheiro">${formatCurrency(c.total)}</td>
        <td>${total ? Math.round((c.total / total) * 100) : 0}%</td>
      </tr>`).join('');
    return;
  }

  if (ABA === 'historico') {
    const categorias = [...new Set(linhas.map(l => l.categoria))];
    thead.innerHTML = `<tr><th>Mês</th>${categorias.map(c => `<th>${escapeHtml(c)}</th>`).join('')}<th>Total</th></tr>`;
    const meses = MESES.slice().reverse().filter(m => casa(nomeDoMes(m)));
    if (!meses.length) return renderEmpty(tbody, categorias.length + 2, 'Nenhum mês', 'Nada encontrado para essa busca.');
    tbody.innerHTML = meses.map(m => `
      <tr class="no-hover">
        <td class="cell-strong">${escapeHtml(nomeDoMes(m))}</td>
        ${categorias.map(c => `<td class="valor-dinheiro">${formatCurrency(totalNoMes(linhas.filter(l => l.categoria === c), m))}</td>`).join('')}
        <td class="cell-strong valor-dinheiro">${formatCurrency(totalNoMes(linhas, m))}</td>
      </tr>`).join('');
    return;
  }

  thead.innerHTML = '<tr><th>Status</th><th>Nome</th><th>Tipo</th><th>Valor</th><th>Moeda</th><th>Categoria</th></tr>';
  const lista = linhas.filter(l => casa(l.nome) || casa(l.categoria) || casa(TIPO[l.tipo]));
  if (!lista.length) {
    return renderEmpty(tbody, 6, 'Nenhum custo', termo ? 'Nada encontrado para essa busca.' : 'Adicione o primeiro custo manual.');
  }

  tbody.innerHTML = lista.map((l, i) => {
    const [rotulo, classe] = STATUS[l.status] || STATUS.ativo;
    // Integração mostra o acumulado do mês; manual, o valor cadastrado.
    const original = l.manual ? l.valor : (l.meses?.[mesAtual()] || 0);
    const reais = emReais(original, l.moeda);
    const semCotacao = l.moeda !== 'BRL' && !COTACAO[l.moeda];
    return `
      <tr ${l.manual ? `data-manual="${i}"` : `data-integracao="${i}"`}>
        <td><span title="${escapeHtml(l.erro || '')}">${badge(rotulo, classe)}</span></td>
        <td class="cell-strong">${escapeHtml(l.nome)}</td>
        <td>${badge(TIPO[l.tipo] || l.tipo)}</td>
        <td class="valor-dinheiro">
          ${semCotacao ? formatarMoeda(original, l.moeda) : formatCurrency(reais)}
          ${l.moeda !== 'BRL' ? `<span class="cell-sub">${formatarMoeda(original, l.moeda)}</span>` : ''}
        </td>
        <td>${escapeHtml(l.moeda)}</td>
        <td>${escapeHtml(l.categoria)}</td>
      </tr>`;
  }).join('');

  tbody.querySelectorAll('[data-manual]').forEach(tr => tr.addEventListener('click', () => {
    abrirFormulario(lista[Number(tr.dataset.manual)].bruto);
  }));
  tbody.querySelectorAll('[data-integracao]').forEach(tr => tr.addEventListener('click', () => {
    abrirDetalhe(lista[Number(tr.dataset.integracao)]);
  }));
}

/* ------------------------------------------------------- Custo manual */

function abrirFormulario(item) {
  const editando = Boolean(item);
  const hoje = new Date().toISOString().slice(0, 10);
  const categorias = item && !CATEGORIAS_CUSTO.includes(item.categoria) ? [...CATEGORIAS_CUSTO, item.categoria] : CATEGORIAS_CUSTO;
  const empresaAtual = item?.empresa || '';
  const empresaOutra = Boolean(empresaAtual) && !EMPRESAS.includes(empresaAtual);

  Drawer.open({
    title: editando ? 'Editar custo' : 'Adicionar custo',
    semLinha: true,
    body: `
      <form id="form-custo">
        <label class="field">
          <span class="field-label">Empresa</span>
          <select class="field-select" name="empresa_lista">
            <option value="" ${!empresaAtual ? 'selected' : ''} disabled>Selecione</option>
            ${EMPRESAS.map(e => `<option ${empresaAtual === e ? 'selected' : ''}>${escapeHtml(e)}</option>`).join('')}
            <option value="__outro" ${empresaOutra ? 'selected' : ''}>Outro</option>
          </select>
        </label>
        <label class="field" id="campo-empresa-outra" ${empresaOutra ? '' : 'hidden'}>
          <span class="field-label">Nome da empresa</span>
          <input class="field-input" name="empresa_outra" type="text" value="${escapeHtml(empresaOutra ? empresaAtual : '')}">
        </label>
        <label class="field">
          <span class="field-label">Nome</span>
          <input class="field-input" name="nome" type="text" required value="${escapeHtml(item?.nome || '')}">
        </label>
        <label class="field">
          <span class="field-label">Descrição do custo</span>
          <textarea class="field-textarea" name="descricao" rows="3">${escapeHtml(item?.descricao || '')}</textarea>
        </label>
        <div class="field-row">
          <label class="field">
            <span class="field-label">Valor</span>
            <input class="field-input" name="valor" type="number" min="0" step="0.01" required placeholder="0,00" value="${item?.valor ?? ''}">
          </label>
          <label class="field">
            <span class="field-label">Moeda</span>
            <select class="field-select" name="moeda">
              ${Object.entries(MOEDAS).map(([k, v]) => `<option value="${k}" ${(item?.moeda || 'BRL') === k ? 'selected' : ''}>${v}</option>`).join('')}
            </select>
          </label>
        </div>
        <label class="field">
          <span class="field-label">Categoria</span>
          <select class="field-select" name="categoria">
            ${categorias.map(c => `<option ${item?.categoria === c ? 'selected' : ''}>${escapeHtml(c)}</option>`).join('')}
          </select>
        </label>
        <div class="field-row">
          <label class="field">
            <span class="field-label">Tipo de custo</span>
            <select class="field-select" name="tipo">
              <option value="recorrente" ${item?.tipo !== 'unico' ? 'selected' : ''}>Recorrente (mensal)</option>
              <option value="unico" ${item?.tipo === 'unico' ? 'selected' : ''}>Pagamento único</option>
            </select>
          </label>
          <label class="field">
            <span class="field-label" id="rotulo-data">${item?.tipo === 'unico' ? 'Data do pagamento' : 'Início da cobrança'}</span>
            <input class="field-input" name="data" type="date" value="${escapeHtml(item?.data || hoje)}">
          </label>
        </div>
        <p class="field-hint" id="custo-conversao"></p>
      </form>`,
    footer: `
      ${editando ? '<button type="button" class="btn btn-ghost" id="btn-remover-custo" style="margin-right:auto">Remover</button>' : ''}
      <button type="button" class="btn-texto" id="btn-cancelar">Cancelar</button>
      <button type="button" class="btn btn-primary" id="btn-salvar">${editando ? 'Salvar' : 'Adicionar'}</button>`
  });

  const form = document.getElementById('form-custo');
  const conversao = document.getElementById('custo-conversao');
  const atualizarConversao = () => {
    const valor = Number(form.valor.value) || 0;
    const moeda = form.moeda.value;
    conversao.textContent = moeda === 'BRL' || !valor ? ''
      : (COTACAO[moeda] ? `≈ ${formatCurrency(emReais(valor, moeda))} pela cotação de hoje` : 'Cotação indisponível agora');
  };
  form.empresa_lista.addEventListener('change', () => {
    const outro = form.empresa_lista.value === '__outro';
    document.getElementById('campo-empresa-outra').hidden = !outro;
    if (outro) form.empresa_outra.focus();
  });
  form.valor.addEventListener('input', atualizarConversao);
  form.moeda.addEventListener('change', atualizarConversao);
  form.tipo.addEventListener('change', () => {
    document.getElementById('rotulo-data').textContent = form.tipo.value === 'unico' ? 'Data do pagamento' : 'Início da cobrança';
  });
  atualizarConversao();

  document.getElementById('btn-cancelar').addEventListener('click', () => Drawer.close());
  document.getElementById('btn-remover-custo')?.addEventListener('click', async () => {
    if (!(await confirmar(`Remover "${item.nome}" dos custos?`, { titulo: 'Remover custo', rotulo: 'Remover' }))) return;
    const { error } = await supabaseClient.from('custos').delete().eq('id', item.id);
    if (error) return toast(`Não foi possível remover: ${error.message}`);
    MANUAIS = MANUAIS.filter(c => c.id !== item.id);
    Drawer.close();
    toast('Custo removido');
    renderTudo();
  });

  document.getElementById('btn-salvar').addEventListener('click', async () => {
    const d = Object.fromEntries(new FormData(form).entries());
    const empresa = d.empresa_lista === '__outro' ? (d.empresa_outra || '').trim() : (d.empresa_lista || '');
    if (!empresa) return toast(d.empresa_lista === '__outro' ? 'Escreva o nome da empresa' : 'Selecione a empresa');
    if (!d.nome.trim()) return toast('Informe o nome do custo');
    if (d.valor === '' || Number(d.valor) < 0) return toast('Informe o valor');

    const payload = {
      empresa,
      nome: d.nome.trim(),
      descricao: (d.descricao || '').trim() || null,
      valor: Number(d.valor),
      moeda: d.moeda,
      categoria: d.categoria,
      tipo: d.tipo,
      data: d.data || hoje
    };

    Drawer.setFooterBusy(true);
    const consulta = editando
      ? supabaseClient.from('custos').update(payload).eq('id', item.id).select().single()
      : supabaseClient.from('custos').insert(payload).select().single();
    const { data, error } = await consulta;
    Drawer.setFooterBusy(false);
    if (error) {
      if (/empresa|descricao/i.test(error.message)) return toast('Falta preparar o banco: rode a migration 095 no Supabase.');
      return toast(`Não foi possível salvar: ${error.message}`);
    }

    MANUAIS = editando ? MANUAIS.map(c => (c.id === item.id ? data : c)) : [data, ...MANUAIS];
    Drawer.close();
    toast(editando ? 'Custo atualizado' : 'Custo adicionado');
    renderTudo();
  });
}

/* ------------------------------------------------------------ Detalhe
   Clicar num serviço (Vercel, Supabase, Amazon) abre, dentro da própria
   página, de onde vem o custo, a fatura do ciclo, a previsão e o
   diagnóstico. */

const SECOES_PRINCIPAIS = ['#kpi-grid', '.custos-graficos', '#abas-custos', '.table-card'];

function abrirDetalhe(l) {
  SECOES_PRINCIPAIS.forEach(sel => { document.querySelector(sel).hidden = true; });
  const acoes = document.getElementById('header-actions');
  if (acoes) acoes.hidden = true;

  const cabecalho = document.querySelector('.header-bar-titulo');
  if (cabecalho) {
    cabecalho.innerHTML = `
      <a class="header-bar-voltar" href="#" title="Voltar" aria-label="Voltar">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M15 6l-6 6l6 6" /></svg>
      </a>
      <h1>${escapeHtml(l.nome)}</h1>`;
    cabecalho.querySelector('.header-bar-voltar').addEventListener('click', e => { e.preventDefault(); fecharDetalhe(); });
  }

  const visao = document.getElementById('visao-custos');
  const montar = { vercel: detalheVercel, supabase: detalheSupabase, aws: detalheAws }[l.fonte];
  visao.innerHTML = l.status !== 'ativo'
    ? `<div class="card"><div class="card-body"><div class="empty-state"><strong>${l.status === 'erro' ? 'Não foi possível ler os custos' : 'Não conectado'}</strong><p>${escapeHtml(l.erro || 'Configure as chaves na Vercel (projeto love-platform).')}</p></div></div></div>`
    : (montar ? montar(l) : '');
  visao.hidden = false;
  window.scrollTo(0, 0);
}

function fecharDetalhe() {
  const visao = document.getElementById('visao-custos');
  visao.hidden = true;
  visao.innerHTML = '';
  SECOES_PRINCIPAIS.forEach(sel => { document.querySelector(sel).hidden = false; });
  const acoes = document.getElementById('header-actions');
  if (acoes) acoes.hidden = false;
  const cabecalho = document.querySelector('.header-bar-titulo');
  if (cabecalho) cabecalho.innerHTML = '<h1>Custos</h1>';
  renderGraficoMeses();
}

/* Pedaços do detalhe */

const usd = v => formatarMoeda(v, 'USD');
const comReais = v => `${usd(v)}${COTACAO.USD ? ` <span class="cell-muted">≈ ${formatCurrency(v * COTACAO.USD)}</span>` : ''}`;
const linhaDado = (rotulo, valor) => `<div class="dados-linha"><span class="rotulo">${rotulo}</span><span class="valor">${valor}</span></div>`;
const dataCurta = iso => new Date(`${iso}T12:00:00`).toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' }).replace('.', '');
const diasEntre = (de, ate) => Math.round((new Date(`${ate}T12:00:00`) - new Date(`${de}T12:00:00`)) / 86400000);

function cardDetalhe(titulo, sub, corpo) {
  return `<div class="card"><div class="card-head"><div><h2>${titulo}</h2>${sub ? `<p>${sub}</p>` : ''}</div></div><div class="card-body">${corpo}</div></div>`;
}

function cardDiagnostico(saude, resumo, dicas) {
  const [rotulo, classe] = { saudavel: ['Saudável', 'badge-success'], atencao: ['Atenção', 'badge-warning'], alto: ['Alto', 'badge-danger'] }[saude];
  return cardDetalhe('Diagnóstico', '', `
    <div class="custo-diagnostico">
      <div class="custo-saude">${badge(rotulo, classe)}</div>
      <p class="custo-resumo">${resumo}</p>
      ${dicas.length ? `<p class="custo-dicas-titulo">Como reduzir</p><ol class="custo-dicas">${dicas.map(d => `<li>${d}</li>`).join('')}</ol>` : ''}
    </div>`);
}

function tabelaDetalhe(cabecalho, linhas, vazio = 'Nada cobrado ainda') {
  return `<div class="table-wrap"><table class="data"><thead><tr>${cabecalho.map(c => `<th>${escapeHtml(c)}</th>`).join('')}</tr></thead>
    <tbody>${linhas.length ? linhas.join('') : `<tr class="no-hover"><td colspan="${cabecalho.length}" class="cell-muted">${vazio}</td></tr>`}</tbody></table></div>`;
}

function historicoDoItem(l) {
  const linhas = MESES.slice().reverse().filter(m => (l.meses?.[m] || 0) > 0).map(m => `
    <tr class="no-hover"><td class="cell-strong">${escapeHtml(nomeDoMes(m))}</td><td class="valor-dinheiro">${usd(l.meses[m])}</td><td class="valor-dinheiro">${formatCurrency(emReais(l.meses[m], l.moeda))}</td></tr>`);
  const sub = l.fonte === 'vercel'
    ? 'Retroativo de 12 meses, por mês do calendário: assinatura proporcional aos dias + cobrança extra. Meses sem cobrança ficam de fora.'
    : 'Retroativo dos últimos 12 meses (meses sem cobrança ficam de fora)';
  return cardDetalhe('Mês a mês', sub,
    tabelaDetalhe(['Mês', 'Dólar', 'Real (cotação de hoje)'], linhas, 'Nenhuma cobrança nos últimos 12 meses'));
}

const NOME_SERVICO_VERCEL = {
  'Build CPU Minutes': 'Tempo de máquina montando o site a cada publicação',
  'Deployment Storage': 'Armazenamento das versões publicadas',
  'Function Storage': 'Armazenamento das funções /api',
  'Fluid Active CPU': 'Processamento das funções /api',
  'Observability Events': 'Eventos de monitoramento (logs)',
  'Fast Data Transfer': 'Tráfego entregue aos visitantes',
  'Function Invocations': 'Chamadas às funções /api',
  'Fluid Provisioned Memory': 'Memória das funções /api',
  'Fast Origin Transfer': 'Tráfego entre a CDN e as funções',
  'CDN Requests': 'Requisições na CDN'
};

const UNIDADE = { minute: 'min de CPU', gigabyte: 'GB', 'gigabyte-hour': 'GB-hora', hour: 'horas', events: 'eventos', invocations: 'chamadas', requests: 'requisições' };
// Armazenamento vem um registro por dia: a soma é GB-dia.
const unidadeDe = sv => (/storage/i.test(sv.servico) && /^gigabyte$/i.test(sv.unidade) ? 'GB-dia' : UNIDADE[String(sv.unidade || '').toLowerCase()] || sv.unidade);
const formatarUso = (q, u) => q ? `${(q >= 10 ? Math.round(q) : Math.round(q * 100) / 100).toLocaleString('pt-BR')} ${u || ''}`.trim() : '—';

function detalheVercel(l) {
  const c = l.ciclo;
  if (!c) return historicoDoItem(l);
  const hoje = new Date().toISOString().slice(0, 10);
  const ultimoDia = new Date(new Date(`${c.fim}T12:00:00`).getTime() - 86400000).toISOString().slice(0, 10);
  const faltam = Math.max(0, diasEntre(hoje, ultimoDia));

  // Previsão: média dos últimos 7 dias com dados, até o fim do ciclo.
  const dias = Object.keys(c.dias || {}).sort();
  const ultimos = dias.slice(-7);
  const mediaDia = ultimos.length ? ultimos.reduce((s, d) => s + c.dias[d], 0) / ultimos.length : 0;
  const diasSemDado = Math.max(0, diasEntre(c.dados_ate, c.fim) - 1);
  const consumoPrevisto = c.consumo + mediaDia * diasSemDado;
  const extraPrevisto = Math.max(0, consumoPrevisto - c.credito);
  const faturaPrevista = c.assinatura + extraPrevisto;

  const fatura = cardDetalhe('Fatura do ciclo', `${dataCurta(c.inicio)} a ${dataCurta(ultimoDia)} · faltam ${faltam} dias`, `
    <div class="lista-dados">
      ${linhaDado('Assinatura (plano Pro)', `${comReais(c.assinatura)} por mês`)}
      ${linhaDado('Crédito de consumo incluso no plano', usd(c.credito))}
      ${linhaDado('Consumo no ciclo (antes do crédito)', comReais(c.consumo))}
      ${linhaDado('Crédito usado', `${usd(Math.min(c.consumo, c.credito))} de ${usd(c.credito)}`)}
      ${linhaDado('Cobrança extra (além do crédito)', comReais(c.extra))}
      ${linhaDado('<strong>Fatura até agora</strong>', `<strong>${comReais(c.total)}</strong>`)}
    </div>
    <p class="custo-nota">Dados até ${dataCurta(c.dados_ate)}. O painel da Vercel soma também as horas de hoje, por isso pode mostrar um pouco mais. A fatura fecha em ${dataCurta(ultimoDia)}.</p>`);

  const previsao = cardDetalhe('Previsão até o fim do ciclo', `Pela média dos últimos ${ultimos.length} dias`, `
    <div class="lista-dados">
      ${linhaDado('Consumo médio por dia', usd(mediaDia))}
      ${linhaDado('Consumo previsto no ciclo', usd(consumoPrevisto))}
      ${linhaDado('Cobrança extra prevista', usd(extraPrevisto))}
      ${linhaDado('<strong>Fatura prevista</strong>', `<strong>${comReais(faturaPrevista)}</strong>`)}
    </div>`);

  // Diagnóstico
  const maior = c.servicos[0];
  const fatia = maior && c.consumo ? maior.consumo / c.consumo : 0;
  const saude = faturaPrevista <= c.assinatura * 1.1 ? 'saudavel' : (faturaPrevista <= c.assinatura * 2 ? 'atencao' : 'alto');
  let resumo;
  let dicas = [];
  if (maior?.servico === 'Build CPU Minutes' && fatia > 0.5) {
    const minutos = c.projetos.reduce((s, p) => s + p.minutos_build, 0);
    resumo = `${Math.round(fatia * 100)}% do consumo é <strong>build</strong>: o tempo de máquina que a Vercel gasta montando o site a cada publicação de código (${Math.round(minutos).toLocaleString('pt-BR')} minutos de CPU neste ciclo). O site no ar (visitas, funções, tráfego) custa centavos. `
      + 'Não é um custo de uso dos clientes, e sim da configuração dos builds: cada envio de código ao GitHub monta os 3 projetos (love-platform, b2b-platform e admin-platform) numa máquina "Elastic", que chega a 30 processadores, e sem fila.';
    dicas = [
      'Em cada projeto da Vercel, <strong>Settings → Build and Deployment → Build Machine</strong>: trocar de Elastic para <strong>Basic</strong> (2 processadores). O site é estático + funções, não precisa de máquina grande.',
      'Na mesma tela, <strong>On-Demand Concurrent Builds</strong>: trocar "Run all builds immediately" por <strong>Disable</strong>. Os builds entram em fila em vez de ganharem máquina extra.',
      'Em b2b-platform e admin-platform, ligar <strong>Skip deployments when there are no changes to the root directory</strong>: o projeto só monta quando a pasta dele mudou.',
      'Juntar mudanças pequenas num envio só, em vez de publicar cada ajuste separado.'
    ];
  } else if (maior) {
    resumo = `O maior custo é ${escapeHtml(NOME_SERVICO_VERCEL[maior.servico] || maior.servico)} (${Math.round(fatia * 100)}% do consumo).`;
  } else {
    resumo = 'Só a assinatura do plano neste ciclo.';
  }
  if (saude === 'saudavel') resumo += ' O consumo cabe no crédito do plano: a fatura fica no valor da assinatura.';
  else resumo += ` No ritmo atual, a fatura deve fechar em ${usd(faturaPrevista)}, ${saude === 'alto' ? 'mais que o dobro' : 'acima'} da assinatura de ${usd(c.assinatura)}.`;

  const servicos = c.servicos.map(sv => `
    <tr class="no-hover">
      <td><span class="cell-strong">${escapeHtml(sv.servico)}</span><span class="cell-sub">${escapeHtml(NOME_SERVICO_VERCEL[sv.servico] || '')}</span></td>
      <td>${escapeHtml(formatarUso(sv.uso, unidadeDe(sv)))}</td>
      <td class="valor-dinheiro">${usd(sv.consumo)}</td>
      <td class="valor-dinheiro">${usd(sv.cobrado)}</td>
      <td>${c.consumo ? Math.round((sv.consumo / c.consumo) * 100) : 0}%</td>
    </tr>`);
  const projetos = c.projetos.map(p => `
    <tr class="no-hover">
      <td class="cell-strong">${escapeHtml(p.projeto)}</td>
      <td>${p.minutos_build ? `${Math.round(p.minutos_build).toLocaleString('pt-BR')} min de CPU` : '—'}</td>
      <td class="valor-dinheiro">${usd(p.consumo)}</td>
      <td>${c.consumo ? Math.round((p.consumo / c.consumo) * 100) : 0}%</td>
    </tr>`);

  return `
    <section class="custo-detalhe">
      ${fatura}
      <div class="custo-detalhe-lado">${cardDiagnostico(saude, resumo, dicas)}${previsao}</div>
    </section>
    ${cardDetalhe('De onde vem o custo', 'Serviços da Vercel neste ciclo. Consumo é antes do crédito; Cobrado é o que entra na fatura.',
      tabelaDetalhe(['Serviço', 'Uso', 'Consumo', 'Cobrado', 'Parte'], servicos))}
    ${cardDetalhe('Por projeto', 'Quanto cada site consumiu neste ciclo', tabelaDetalhe(['Projeto', 'Build', 'Consumo', 'Parte'], projetos))}
    ${historicoDoItem(l)}`;
}

function detalheSupabase(l) {
  const valor = l.meses?.[mesAtual()] || 0;
  const gratis = valor === 0;
  const plano = cardDetalhe('Assinatura', escapeHtml(l.detalhe || ''), `
    <div class="lista-dados">
      ${linhaDado('Plano', gratis ? 'Free (gratuito)' : escapeHtml(l.detalhe || 'Pago'))}
      ${linhaDado('Valor por mês', comReais(valor))}
      ${linhaDado('Banco de dados', gratis ? 'até 500 MB' : 'até 8 GB inclusos')}
      ${linhaDado('Arquivos (Storage)', gratis ? 'até 1 GB' : 'até 100 GB inclusos')}
      ${linhaDado('Usuários ativos por mês', gratis ? 'até 50 mil' : 'até 100 mil inclusos')}
      ${linhaDado('Backup automático', gratis ? 'Não tem' : 'Diário, 7 dias')}
    </div>
    <p class="custo-nota">A Supabase não libera a fatura por API: o valor vem do plano. Ao mudar de plano, avise para atualizar aqui.</p>`);
  const diag = gratis
    ? cardDiagnostico('saudavel', 'Custo zero. O plano gratuito atende enquanto o banco ficar abaixo de 500 MB e os arquivos abaixo de 1 GB. O ponto fraco é não ter <strong>backup automático</strong>: se algo for apagado por engano, não há como voltar.',
      ['Acompanhar o tamanho em <strong>Supabase → Settings → Usage</strong>; perto de 80% do limite, é hora do Pro (US$ 25/mês).', 'Antes de ter clientes pagantes, considerar o Pro só pelo backup diário.'])
    : cardDiagnostico('saudavel', 'Valor fixo do plano, sem cobrança por uso além dos limites inclusos.', []);
  return `<section class="custo-detalhe">${plano}<div class="custo-detalhe-lado">${diag}</div></section>${historicoDoItem(l)}`;
}

function detalheAws(l) {
  const atual = l.meses?.[mesAtual()] || 0;
  const hoje = new Date();
  const diasNoMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0).getDate();
  const previsto = hoje.getDate() > 1 ? (atual / (hoje.getDate() - 1)) * diasNoMes : atual;
  const servicos = (l.servicos || []).slice().sort((a, b) => b.mes.localeCompare(a.mes) || b.valor - a.valor).map(sv => `
    <tr class="no-hover"><td>${escapeHtml(nomeDoMes(sv.mes))}</td><td class="cell-strong">${escapeHtml(sv.servico)}</td><td class="valor-dinheiro">${usd(sv.valor)}</td></tr>`);
  const resumo = cardDetalhe('Fatura do mês', escapeHtml(nomeDoMes(mesAtual())), `
    <div class="lista-dados">
      ${linhaDado('Assinatura', 'Não tem (paga só o que usa)')}
      ${linhaDado('Consumo no mês', comReais(atual))}
      ${linhaDado('Previsão para o mês', comReais(previsto))}
      ${linhaDado('Preço do e-mail (SES)', 'US$ 0,10 a cada mil e-mails')}
    </div>
    <p class="custo-nota">Fatura da conta AWS inteira (Cost Explorer), atualizada uma vez por dia.</p>`);
  const diag = cardDiagnostico(previsto < 5 ? 'saudavel' : (previsto < 20 ? 'atencao' : 'alto'),
    previsto < 5
      ? 'Custo baixo e proporcional ao uso: a Amazon cobra por e-mail enviado, sem mensalidade. Mesmo 10 mil e-mails num mês custam cerca de US$ 1.'
      : 'O consumo subiu mais que o normal para e-mails. Veja em "De onde vem o custo" qual serviço puxou o valor.',
    previsto < 5 ? [] : ['Conferir em E-mails quantos disparos saíram no mês.', 'Verificar se algum serviço da AWS ficou ligado sem uso.']);
  return `<section class="custo-detalhe">${resumo}<div class="custo-detalhe-lado">${diag}</div></section>
    ${cardDetalhe('De onde vem o custo', 'Serviços da AWS por mês', tabelaDetalhe(['Mês', 'Serviço', 'Valor'], servicos, 'Nenhuma cobrança da AWS ainda'))}`;
}
