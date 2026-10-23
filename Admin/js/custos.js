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
        { fonte: 'ses', nome: 'Amazon SES', categoria: 'E-mail', tipo: 'recorrente', moeda: 'USD', status: 'erro', erro: String(e.message || e), meses: zerado }
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
  return Array.from({ length: 6 }, (_, i) => {
    const d = new Date(hoje.getFullYear(), hoje.getMonth() - 5 + i, 1);
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
  const media = MESES.reduce((s, m) => s + totalNoMes(linhas, m), 0) / MESES.length;
  const variacao = anterior ? ((atual - anterior) / anterior) * 100 : (atual ? 100 : 0);
  const sinal = variacao > 0 ? '+' : '';

  const cotacao = [
    COTACAO.USD ? `US$ 1 = ${formatCurrency(COTACAO.USD)}` : null,
    COTACAO.EUR ? `€ 1 = ${formatCurrency(COTACAO.EUR)}` : null
  ].filter(Boolean).join(' · ') || 'Cotação indisponível';

  const tile = (label, value, sub) => `
    <div class="kpi"><p class="kpi-label">${label}</p><p class="kpi-value">${value}</p><p class="kpi-sub">${sub}</p></div>`;

  document.getElementById('kpi-grid').innerHTML = [
    tile('Custo deste mês', formatCurrency(atual), `${sinal}${Math.round(variacao)}% sobre o mês passado`),
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
    const detalhe = l.manual
      ? `${TIPO[l.tipo]} desde ${formatDate(l.data)}`
      : (l.status === 'ativo' ? (l.detalhe || 'Acumulado do mês') : (l.erro || 'Configure as chaves na Vercel'));
    return `
      <tr ${l.manual ? `data-manual="${i}"` : 'class="no-hover"'}>
        <td><span title="${escapeHtml(l.erro || '')}">${badge(rotulo, classe)}</span></td>
        <td><span class="cell-strong">${escapeHtml(l.nome)}</span><span class="cell-sub">${escapeHtml(detalhe)}</span></td>
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
}

/* ------------------------------------------------------- Custo manual */

function abrirFormulario(item) {
  const editando = Boolean(item);
  const hoje = new Date().toISOString().slice(0, 10);
  const categorias = item && !CATEGORIAS_CUSTO.includes(item.categoria) ? [...CATEGORIAS_CUSTO, item.categoria] : CATEGORIAS_CUSTO;

  Drawer.open({
    title: editando ? 'Editar custo' : 'Adicionar custo',
    subtitle: 'Custo manual',
    body: `
      <form id="form-custo">
        <label class="field">
          <span class="field-label">Nome</span>
          <input class="field-input" name="nome" type="text" required placeholder="Ex.: Google Workspace" value="${escapeHtml(item?.nome || '')}">
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
      <button type="button" class="btn btn-ghost" id="btn-cancelar">Cancelar</button>
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
    if (!d.nome.trim()) return toast('Informe o nome do custo');
    if (d.valor === '' || Number(d.valor) < 0) return toast('Informe o valor');

    const payload = {
      nome: d.nome.trim(),
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
    if (error) return toast(`Não foi possível salvar: ${error.message}`);

    MANUAIS = editando ? MANUAIS.map(c => (c.id === item.id ? data : c)) : [data, ...MANUAIS];
    Drawer.close();
    toast(editando ? 'Custo atualizado' : 'Custo adicionado');
    renderTudo();
  });
}
