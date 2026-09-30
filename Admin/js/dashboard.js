/* ==========================================================================
   LOVE ADMIN — Dashboard

   Paleta dos gráficos: slots 1 e 2 da paleta categórica validada
   (azul #2a78d6 / laranja #eb6834). Conferida com o validador da skill
   dataviz sobre fundo branco — passa em todos os gates, inclusive CVD.
   ========================================================================== */

const SERIE_VOLUME = '#2a78d6';
const SERIE_FATURAMENTO = '#eb6834';

// Ordem fixa da paleta categórica — nunca reciclada entre categorias.
const CORES_CATEGORIA = ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4'];

const MESES_CURTOS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

let DADOS = null;

document.addEventListener('DOMContentLoaded', async () => {
  if (!(await window.adminReady)) return;

  renderKpiSkeleton();

  const [fornecedores, clientes, eventos, carteira, contratos] = await Promise.all([
    safeSelect('fornecedores', 'id, company_name, email, category, plan'),
    safeSelect('clientes', 'id, couple_name'),
    safeSelect('eventos', 'id, tipo'),
    safeSelect('wallet_transactions', 'fornecedor_id, type, amount, created_at'),
    safeSelect('contracts', 'fornecedor_id, valor_total, status, created_at')
  ]);

  DADOS = {
    fornecedores: fornecedores.data,
    clientes: clientes.data,
    eventos: eventos.data,
    carteira: carteira.data,
    contratos: contratos.data
  };

  renderKpis();
  renderEvolucao();
  renderTopFornecedores();
  renderCategorias();

  // O gráfico de linha é desenhado em pixels; redesenha quando a largura muda.
  window.addEventListener('resize', debounce(renderEvolucao, 150));
});

function debounce(fn, ms) {
  let t;
  return () => { clearTimeout(t); t = setTimeout(fn, ms); };
}

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

/* ------------------------------------------- Evolução (duas linhas, um eixo) */

/** Agrupa valores por mês nos últimos `qtd` meses. */
function porMes(linhas, qtd, valorDe) {
  const hoje = new Date();
  const baldes = [];

  for (let i = qtd - 1; i >= 0; i--) {
    const d = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1);
    baldes.push({ chave: `${d.getFullYear()}-${d.getMonth()}`, rotulo: MESES_CURTOS[d.getMonth()], valor: 0 });
  }

  const indice = new Map(baldes.map((b, i) => [b.chave, i]));

  linhas.forEach(linha => {
    const d = new Date(linha.created_at);
    if (Number.isNaN(d.getTime())) return;
    const pos = indice.get(`${d.getFullYear()}-${d.getMonth()}`);
    if (pos !== undefined) baldes[pos].valor += valorDe(linha);
  });

  return baldes;
}

function renderEvolucao() {
  const host = document.getElementById('grafico-evolucao');
  if (!host || !DADOS) return;

  const MESES = 6;
  const volume = porMes(
    DADOS.carteira.filter(t => t.type === 'credit'), MESES,
    t => Number(t.amount) || 0
  );
  const faturamento = porMes(DADOS.contratos, MESES, c => Number(c.valor_total) || 0);

  const series = [
    { nome: 'Volume B2B', cor: SERIE_VOLUME, pontos: volume },
    { nome: 'Faturamento bruto', cor: SERIE_FATURAMENTO, pontos: faturamento }
  ];

  renderLegenda(series);
  renderTabelaEvolucao(series);

  const maximo = Math.max(...series.flatMap(s => s.pontos.map(p => p.valor)), 1);
  if (maximo <= 1) {
    host.innerHTML = `<div class="empty-state"><strong>Sem movimentação ainda</strong>
      <p>O gráfico aparece assim que houver entradas na carteira ou contratos fechados.</p></div>`;
    return;
  }

  // Escala em passos redondos, para os rótulos do eixo caírem em números
  // limpos (0 / 20k / 40k…) em vez de frações do máximo.
  const passo = passoRedondo(maximo / 4);
  const topo = passo * 4;

  const largura = Math.max(host.clientWidth || 640, 320);
  const altura = 260;
  const margem = { topo: 16, direita: 16, baixo: 28, esquerda: 64 };
  const areaL = largura - margem.esquerda - margem.direita;
  const areaA = altura - margem.topo - margem.baixo;

  const x = (i) => margem.esquerda + (areaL * i) / (MESES - 1);
  const y = (v) => margem.topo + areaA - (areaA * v) / topo;

  const ticks = [0, passo, passo * 2, passo * 3, topo];

  const grade = ticks.map(t => `
    <line class="viz-grid" x1="${margem.esquerda}" y1="${y(t)}" x2="${largura - margem.direita}" y2="${y(t)}" />
    <text class="viz-axis" x="${margem.esquerda - 10}" y="${y(t) + 4}" text-anchor="end">${abreviar(t)}</text>`).join('');

  const rotulosX = volume.map((p, i) =>
    `<text class="viz-axis" x="${x(i)}" y="${altura - 8}" text-anchor="middle">${p.rotulo}</text>`).join('');

  const linhas = series.map(s => {
    const d = s.pontos.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(i)},${y(p.valor)}`).join(' ');
    const ultimo = s.pontos.length - 1;
    return `
      <path d="${d}" fill="none" stroke="${s.cor}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" />
      <circle cx="${x(ultimo)}" cy="${y(s.pontos[ultimo].valor)}" r="5" fill="${s.cor}" stroke="#fff" stroke-width="2" />`;
  }).join('');

  // Faixas invisíveis para o ponteiro: alvo bem maior que o traço.
  const alvos = volume.map((_, i) => {
    const meia = areaL / (MESES - 1) / 2;
    return `<rect class="viz-hit" data-i="${i}" x="${x(i) - meia}" y="${margem.topo}" width="${meia * 2}" height="${areaA}" fill="transparent" />`;
  }).join('');

  host.innerHTML = `
    <svg width="${largura}" height="${altura}" role="img" aria-label="Volume B2B e faturamento bruto por mês">
      ${grade}${rotulosX}
      <line class="viz-cursor" id="viz-cursor" y1="${margem.topo}" y2="${margem.topo + areaA}" x1="0" x2="0" style="display:none" />
      ${linhas}${alvos}
    </svg>
    <div class="viz-tooltip" id="viz-tooltip" hidden></div>`;

  ligarHoverEvolucao(host, { series, x, y, margem, altura });
}

function ligarHoverEvolucao(host, { series, x, y, margem, altura }) {
  const cursor = host.querySelector('#viz-cursor');
  const balao = host.querySelector('#viz-tooltip');

  host.querySelectorAll('.viz-hit').forEach(alvo => {
    alvo.addEventListener('mouseenter', () => {
      const i = Number(alvo.dataset.i);
      cursor.setAttribute('x1', x(i));
      cursor.setAttribute('x2', x(i));
      cursor.style.display = '';

      balao.innerHTML = `
        <p class="mes">${series[0].pontos[i].rotulo}</p>
        ${series.map(s => `
          <p class="linha">
            <span class="chave" style="background:${s.cor}"></span>
            <span class="nome">${escapeHtml(s.nome)}</span>
            <span class="valor">${formatCurrency(s.pontos[i].valor)}</span>
          </p>`).join('')}`;

      balao.hidden = false;
      const alturaBalao = balao.offsetHeight;
      balao.style.left = `${x(i)}px`;
      balao.style.top = `${Math.max(margem.topo, y(series[0].pontos[i].valor) - alturaBalao - 12)}px`;
    });
  });

  host.addEventListener('mouseleave', () => {
    cursor.style.display = 'none';
    balao.hidden = true;
  });
}

function renderLegenda(series) {
  document.getElementById('legenda-evolucao').innerHTML = series.map(s => `
    <span class="viz-legend-item">
      <span class="chave" style="background:${s.cor}"></span>${escapeHtml(s.nome)}
    </span>`).join('');
}

/** Tabela com os mesmos números — exigida quando o gráfico é o único caminho. */
function renderTabelaEvolucao(series) {
  const meses = series[0].pontos;
  document.getElementById('tabela-evolucao').innerHTML = `
    <table class="data">
      <thead><tr><th>Mês</th>${series.map(s => `<th>${escapeHtml(s.nome)}</th>`).join('')}</tr></thead>
      <tbody>
        ${meses.map((m, i) => `
          <tr class="no-hover">
            <td class="cell-strong">${m.rotulo}</td>
            ${series.map(s => `<td>${formatCurrency(s.pontos[i].valor)}</td>`).join('')}
          </tr>`).join('')}
      </tbody>
    </table>`;
}

/** Menor passo "bonito" (1, 2, 2,5 ou 5 vezes uma potência de 10) que cobre o valor. */
function passoRedondo(valor) {
  const ordem = Math.pow(10, Math.floor(Math.log10(valor)));
  const normalizado = valor / ordem;
  const escolhido = [1, 2, 2.5, 5, 10].find(c => normalizado <= c);
  return escolhido * ordem;
}

function abreviar(valor) {
  if (valor >= 1000) {
    const k = valor / 1000;
    return `${Number.isInteger(k) ? k : k.toFixed(1).replace('.', ',')}k`;
  }
  return String(Math.round(valor));
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
