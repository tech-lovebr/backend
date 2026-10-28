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

// Abre em "Este mês"; o calendário do filtro recorta um dia ou intervalo.
const HOJE_ABERTURA = new Date();
let PERIODO = {
  de: new Date(HOJE_ABERTURA.getFullYear(), HOJE_ABERTURA.getMonth(), 1),
  ate: new Date(HOJE_ABERTURA.getFullYear(), HOJE_ABERTURA.getMonth(), HOJE_ABERTURA.getDate(), 23, 59, 59, 999)
};

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
  return rotuloDePeriodo(PERIODO);
}

/* Filtro de período: o mesmo dos Cadastros (filtroDePeriodo, utils.js). */
function montarFiltroDePeriodo() {
  filtroDePeriodo(PERIODO, aplicarPeriodo);
}

function aplicarPeriodo() {
  document.getElementById('periodo-rotulo').textContent = rotuloDoPeriodo();
  document.getElementById('btn-periodo').classList.toggle('is-ativo', comPeriodo());
  if (DADOS) renderPainel();
  PAGINA_CONTAS = 1;
  if (CONTAS.length) renderContas();
}

document.addEventListener('DOMContentLoaded', async () => {
  if (!(await window.adminReady)) return;

  montarFiltroDePeriodo();
  document.getElementById('btn-periodo')?.classList.toggle('is-ativo', comPeriodo());
  montarBotaoAtualizar();

  document.getElementById('rosca-tipo').addEventListener('change', e => {
    ROSCA = e.target.value;
    renderCategorias();
  });
  let largura = window.innerWidth;
  window.addEventListener('resize', () => {
    if (Math.abs(window.innerWidth - largura) < 20) return;
    largura = window.innerWidth;
    renderGraficoFinanceiro();
  });

  await carregarDados();
});

/* Atualizar: o botão é o mesmo das outras telas (botaoAtualizar, utils.js).
   Recarrega os números e a lista de contas mantendo o período escolhido. */
function montarBotaoAtualizar() {
  botaoAtualizar(() => Promise.all([carregarDados(), carregarContas()]),
    { aviso: 'Dashboard atualizado.', rotulo: 'Atualizar o dashboard' });
}

async function carregarDados() {
  renderKpiSkeleton();

  const [fornecedores, clientes, eventos, carteira, contratos, convidados, presentes, produtos, contribuicoes, links, custos, integrados] = await Promise.all([
    safeSelect('fornecedores', '*'),
    safeSelect('clientes', '*'),
    safeSelect('eventos', '*'),
    safeSelect('wallet_transactions', 'fornecedor_id, type, amount, created_at'),
    safeSelect('contracts', 'fornecedor_id, valor_total, status, created_at'),
    safeSelect('convidados', 'evento_id, cliente_id, status, extra'),
    safeSelect('presentes', 'evento_id, cliente_id, valor, status'),
    // Só o drawer usa: é ele quem lista os produtos do fornecedor.
    safeSelect('products', '*'),
    // TPV, faturamento e custos do painel.
    safeSelect('presentes_contribuicoes', '*'),
    safeSelect('payment_links', '*'),
    safeSelect('custos', '*'),
    buscarCustosIntegrados()
  ]);

  const cotacoes = { BRL: 1, ...(integrados.cotacoes || {}) };
  if (!cotacoes.USD || !cotacoes.EUR) {
    try {
      const j = await (await fetch('https://economia.awesomeapi.com.br/json/last/USD-BRL,EUR-BRL')).json();
      cotacoes.USD = cotacoes.USD || Number(j.USDBRL?.bid) || null;
      cotacoes.EUR = cotacoes.EUR || Number(j.EURBRL?.bid) || null;
    } catch { /* sem cotação: custos em dólar ficam fora */ }
  }

  DADOS = {
    fornecedores: fornecedores.data,
    clientes: clientes.data,
    eventos: eventos.data,
    carteira: carteira.data,
    contratos: contratos.data,
    convidados: convidados.data,
    presentes: presentes.data,
    produtos: produtos.data,
    contribuicoes: contribuicoes.data,
    links: links.data,
    custos: custos.error ? [] : custos.data,
    integracoes: (integrados.itens || []).filter(i => i.status === 'ativo'),
    cotacoes
  };

  ContaDrawer.semear({ dados: DADOS });

  // Se a tabela de contas chegou antes, redesenha agora que dá para numerar.
  if (CONTAS.length) renderContas();

  renderPainel();
}

/* ------------------------------------------------------------------ KPIs
   TPV: tudo o que passou pela plataforma e rendeu comissão (presentes pagos
   pelos convidados + links de pagamento pagos nos contratos do Hub).
   Faturamento bruto: a comissão da Love sobre o TPV.
   Custo total: o mesmo de Settings → Custos (Vercel, Supabase, Amazon e
   custos manuais), rateado por dia.
   Lucro líquido: faturamento bruto − custo total. */

// Comissão da Love: a gravada pelo gateway, ou a padrão (COMISSAO_PADRAO, utils.js).

const API_CUSTOS = 'https://love.com.br/api/custos';
const DIA_MS = 86400000;

function renderKpiSkeleton() {
  document.getElementById('kpi-grid').innerHTML = Array.from({ length: 4 }, () =>
    `<div class="kpi"><div class="skeleton" style="width:55%"></div><div class="skeleton" style="width:70%;height:26px;margin-top:.625rem"></div></div>`
  ).join('');
}

/** Entradas de dinheiro: cada pagamento com data, valor e comissão. */
function pagamentos() {
  return pagamentosProcessados(DADOS.contribuicoes, DADOS.links);
}

/** Início e fim do período em datas de verdade ("Todo o período" começa no primeiro registro). */
function intervalo() {
  // Até o fim do dia: o custo de hoje entra inteiro, como em Settings → Custos.
  const agora = new Date();
  const ate = PERIODO.ate || new Date(agora.getFullYear(), agora.getMonth(), agora.getDate(), 23, 59, 59, 999);
  if (PERIODO.de) return { de: PERIODO.de, ate };
  const datas = pagamentos().map(p => new Date(p.em).getTime());
  (DADOS.integracoes || []).forEach(i => Object.entries(i.meses || {}).forEach(([m, v]) => { if (v > 0) datas.push(new Date(`${m}-01T00:00:00`).getTime()); }));
  (DADOS.custos || []).forEach(c => { if (c.data) datas.push(new Date(`${c.data}T00:00:00`).getTime()); });
  const primeiro = datas.length ? new Date(Math.min(...datas)) : new Date(agora.getFullYear(), agora.getMonth(), 1);
  return { de: new Date(primeiro.getFullYear(), primeiro.getMonth(), primeiro.getDate()), ate };
}

/* ---- Custos rateados por dia (mesma conta de Settings → Custos) */

const chaveMes = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

function emReais(valor, moeda) {
  if (!moeda || moeda === 'BRL') return Number(valor) || 0;
  const taxa = DADOS.cotacoes?.[moeda];
  return taxa ? (Number(valor) || 0) * taxa : 0;
}

/** Dias em que o custo do mês se espalha: no mês atual, só os que já passaram. */
function diasDoRateio(d) {
  const hoje = new Date();
  if (d.getFullYear() === hoje.getFullYear() && d.getMonth() === hoje.getMonth()) return hoje.getDate();
  return new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
}

const CACHE_DIA = new Map();

/** Custo de um dia, em reais, já separado por item (para a rosca de custos). */
function custoDoDia(d) {
  const chave = d.toDateString();
  if (CACHE_DIA.has(chave)) return CACHE_DIA.get(chave);
  const hoje = new Date();
  const itens = {};
  if (d <= hoje) {
    const mes = chaveMes(d);
    const dias = diasDoRateio(d);
    (DADOS.integracoes || []).forEach(i => {
      const v = emReais(i.meses?.[mes] || 0, i.moeda) / dias;
      if (v) itens[i.nome] = (itens[i.nome] || 0) + v;
    });
    const iso = `${mes}-${String(d.getDate()).padStart(2, '0')}`;
    (DADOS.custos || []).forEach(c => {
      const nome = c.empresa || c.nome;
      if (c.tipo === 'unico') {
        if (c.data === iso) itens[nome] = (itens[nome] || 0) + emReais(c.valor, c.moeda);
      } else if (String(c.data || '').slice(0, 7) <= mes) {
        itens[nome] = (itens[nome] || 0) + emReais(c.valor, c.moeda) / dias;
      }
    });
  }
  CACHE_DIA.set(chave, itens);
  return itens;
}

/** Custo entre dois instantes (frações de dia contam proporcionalmente). */
function custosNoIntervalo(de, ate) {
  const total = {};
  let d = new Date(de.getFullYear(), de.getMonth(), de.getDate());
  while (d <= ate) {
    const fimDia = new Date(d.getTime() + DIA_MS);
    const parte = (Math.min(fimDia, ate) - Math.max(d, de)) / DIA_MS;
    if (parte > 0) Object.entries(custoDoDia(d)).forEach(([k, v]) => { total[k] = (total[k] || 0) + v * parte; });
    d = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1);
  }
  return total;
}

const somar = obj => Object.values(obj).reduce((s, v) => s + v, 0);

function receitaNoIntervalo(de, ate) {
  const r = { tpv: 0, receita: 0, presentes: 0, contratos: 0 };
  pagamentos().forEach(p => {
    const t = new Date(p.em);
    if (t < de || t > ate) return;
    r.tpv += p.valor;
    r.receita += p.comissao;
    r[p.origem] += p.comissao;
  });
  return r;
}

/**
 * Período anterior, para comparar: os mesmos dias no mês anterior
 * (Hoje 28/10 → 28/09; 25/10 a 28/10 → 25/09 a 28/09).
 * "Todo o período" não tem com o que comparar.
 */
function periodoAnterior(de, ate) {
  if (!PERIODO.de) return null;
  // Padrão do Admin: os mesmos dias no mês anterior (25/10–28/10 → 25/09–28/09).
  return mesmoPeriodoNoMesAnterior(de, ate);
}

function numerosDoPeriodo(de, ate) {
  const r = receitaNoIntervalo(de, ate);
  const custo = somar(custosNoIntervalo(de, ate));
  return { tpv: r.tpv, custo, receita: r.receita, lucro: r.receita - custo };
}

function renderKpis() {
  const { de, ate } = intervalo();
  const atual = numerosDoPeriodo(de, ate);
  const anterior = periodoAnterior(de, ate);
  const antes = anterior && numerosDoPeriodo(anterior.de, anterior.ate);

  // Título em cima; ao lado do valor, a variação (vermelha se caiu, verde se
  // subiu); embaixo, o valor do período anterior ("P.P").
  const tile = (label, chave) => {
    const a = atual[chave];
    let variacao = '';
    let sub = 'Desde o início';
    if (anterior) {
      const b = antes[chave];
      sub = `P.P: ${formatCurrency(b)}`;
      if (b) {
        const pct = ((a - b) / Math.abs(b)) * 100;
        const classe = pct < 0 ? 'is-negativa' : (pct > 0 ? 'is-positiva' : '');
        const texto = `${pct > 0 ? '+' : ''}${pct.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`;
        variacao = `<span class="kpi-variacao ${classe}">${escapeHtml(texto)}</span>`;
      }
    }
    const dica = anterior ? `Período anterior: ${anterior.nome}` : '';
    return `
    <div class="kpi kpi-dash">
      <p class="kpi-label">${escapeHtml(label)}</p>
      <div class="kpi-linha"><p class="kpi-value">${escapeHtml(formatCurrency(a))}</p>${variacao}</div>
      <p class="kpi-sub" title="${escapeHtml(dica)}">${escapeHtml(sub)}</p>
    </div>`;
  };

  document.getElementById('kpi-grid').innerHTML = [
    tile('TPV total', 'tpv'),
    tile('Custo total', 'custo'),
    tile('Faturamento bruto', 'receita'),
    tile('Lucro líquido', 'lucro')
  ].join('');
}

/* ------------------------------------- TPV, custo total e faturamento bruto
   Linhas no tempo. Um dia só: por hora. Até dois meses: por dia. Mais que
   isso: por mês. Passar o mouse mostra os três valores daquele ponto. */

const SERIES = [
  { id: 'tpv', rotulo: 'TPV total', cor: '#2a78d6' },
  { id: 'custo', rotulo: 'Custo total', cor: '#64748b' },
  { id: 'receita', rotulo: 'Faturamento bruto', cor: '#1baf7a' }
];
// Nenhuma escolhida: mostra as três. Clicar numa mostra só ela; clicar de
// novo na mesma volta para as três. Nunca fica sem linha nenhuma.
let SERIE_ESCOLHIDA = null;

function montarTopoDoGrafico() {
  const host = document.getElementById('grafico-topo');
  host.innerHTML = `
    <div class="dash-chips" role="group" aria-label="Linha do gráfico">
      ${SERIES.map(s => `
        <button type="button" class="dash-chip${SERIE_ESCOLHIDA === s.id ? ' is-ativa' : ''}${SERIE_ESCOLHIDA && SERIE_ESCOLHIDA !== s.id ? ' is-apagada' : ''}"
                data-serie="${s.id}" aria-pressed="${SERIE_ESCOLHIDA === s.id}">
          <span class="dash-chip-cor" style="background:${s.cor}"></span>${escapeHtml(s.rotulo)}
        </button>`).join('')}
    </div>`;
  host.querySelectorAll('[data-serie]').forEach(b => b.addEventListener('click', () => {
    SERIE_ESCOLHIDA = SERIE_ESCOLHIDA === b.dataset.serie ? null : b.dataset.serie;
    montarTopoDoGrafico();
    renderGraficoFinanceiro();
  }));
}

function fatiasDoTempo(de, ate) {
  const mesmoDia = de.toDateString() === ate.toDateString();
  const lista = [];
  if (mesmoDia) {
    for (let h = 0; h < 24; h++) {
      const ini = new Date(de.getFullYear(), de.getMonth(), de.getDate(), h);
      lista.push({ ini, fim: new Date(ini.getTime() + 3600000), eixo: `${String(h).padStart(2, '0')}:00`, tipo: 'Horário' });
    }
    return lista;
  }
  const dias = Math.round((ate - de) / DIA_MS) + 1;
  if (dias <= 62) {
    for (let i = 0; i < dias; i++) {
      const ini = new Date(de.getFullYear(), de.getMonth(), de.getDate() + i);
      lista.push({ ini, fim: new Date(ini.getFullYear(), ini.getMonth(), ini.getDate() + 1), eixo: ini.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }), tipo: 'Dia' });
    }
    return lista;
  }
  let ini = new Date(de.getFullYear(), de.getMonth(), 1);
  while (ini <= ate) {
    const fim = new Date(ini.getFullYear(), ini.getMonth() + 1, 1);
    const nome = ini.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '');
    lista.push({ ini, fim, eixo: `${nome} ${String(ini.getFullYear()).slice(2)}`, tipo: 'Mês' });
    ini = fim;
  }
  return lista;
}

function escalaBonita(valor) {
  if (!valor) return 4;
  const potencia = 10 ** Math.floor(Math.log10(valor));
  return [1, 2, 2.5, 4, 5, 10].find(p => p * potencia >= valor) * potencia;
}

function renderGraficoFinanceiro() {
  const host = document.getElementById('grafico-financeiro');
  if (!host || !DADOS) return;
  const { de, ate } = intervalo();
  const fatias = fatiasDoTempo(de, ate);
  const pontos = fatias.map(f => {
    const fimReal = f.fim > ate ? ate : f.fim;
    const futuro = f.ini > new Date();
    const r = futuro ? { tpv: 0, receita: 0 } : receitaNoIntervalo(f.ini, new Date(fimReal.getTime() - 1));
    const custo = futuro ? 0 : somar(custosNoIntervalo(f.ini, fimReal));
    return { ...f, tpv: r.tpv, receita: r.receita, custo };
  });
  const series = SERIES.filter(s => !SERIE_ESCOLHIDA || s.id === SERIE_ESCOLHIDA);

  const largura = Math.max(host.clientWidth || 640, 300);
  const altura = 300;
  const m = { esq: 64, dir: 12, topo: 12, base: 30 };
  const w = largura - m.esq - m.dir;
  const h = altura - m.topo - m.base;
  const valores = pontos.flatMap(p => series.map(s => p[s.id]));
  const teto = escalaBonita(Math.max(0, ...valores));
  const piso = Math.min(0, ...valores) < 0 ? -escalaBonita(-Math.min(...valores)) : 0;
  const x = i => m.esq + (pontos.length === 1 ? w / 2 : (i * w) / (pontos.length - 1));
  const y = v => m.topo + h - ((v - piso) / (teto - piso)) * h;

  const marcas = Array.from({ length: 5 }, (_, i) => piso + ((teto - piso) * i) / 4);
  const reais = v => `R$ ${Math.round(v).toLocaleString('pt-BR')}`;
  const grade = marcas.map(v => `
    <line x1="${m.esq}" x2="${largura - m.dir}" y1="${y(v)}" y2="${y(v)}" class="custos-grade" />
    <text x="${m.esq - 10}" y="${y(v) + 4}" text-anchor="end" class="custos-eixo">${escapeHtml(reais(v))}</text>`).join('');

  // Rótulos do eixo sem amontoar: no máximo uns 8.
  const passo = Math.max(1, Math.ceil(pontos.length / 8));
  const eixo = pontos.map((p, i) => i % passo === 0
    ? `<text x="${x(i)}" y="${altura - 8}" text-anchor="middle" class="custos-eixo">${escapeHtml(p.eixo)}</text>` : '').join('');

  const linhas = series.map(s => `
    <path d="${pontos.map((p, i) => `${i ? 'L' : 'M'} ${x(i)} ${y(p[s.id])}`).join(' ')}" fill="none" stroke="${s.cor}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" />
    ${pontos.map((p, i) => `<circle cx="${x(i)}" cy="${y(p[s.id])}" r="3" fill="#fff" stroke="${s.cor}" stroke-width="1.5" data-ponto="${i}" />`).join('')}`).join('');

  host.innerHTML = `
    <svg width="${largura}" height="${altura}" role="img" aria-label="TPV total, custo total e faturamento bruto">
      ${grade}
      <line class="dash-guia" id="dash-guia" x1="0" x2="0" y1="${m.topo}" y2="${m.topo + h}" visibility="hidden" />
      ${linhas}
      ${eixo}
      <rect x="${m.esq}" y="${m.topo}" width="${w}" height="${h}" fill="transparent" id="dash-area" />
    </svg>
    <div class="dash-dica" id="dash-dica" hidden></div>`;

  const area = host.querySelector('#dash-area');
  const guia = host.querySelector('#dash-guia');
  const dica = host.querySelector('#dash-dica');
  const mostrar = e => {
    const caixa = host.querySelector('svg').getBoundingClientRect();
    const px = e.clientX - caixa.left;
    const i = Math.max(0, Math.min(pontos.length - 1, Math.round(((px - m.esq) / w) * (pontos.length - 1))));
    const p = pontos[i];
    guia.setAttribute('x1', x(i)); guia.setAttribute('x2', x(i)); guia.setAttribute('visibility', 'visible');
    host.querySelectorAll('[data-ponto]').forEach(c => c.setAttribute('r', Number(c.dataset.ponto) === i ? 4.5 : 3));
    const titulo = p.tipo === 'Dia' ? p.ini.toLocaleDateString('pt-BR') : p.eixo;
    dica.innerHTML = `<strong>${p.tipo}: ${escapeHtml(titulo)}</strong>
      ${series.map(s => `<div class="dash-dica-linha"><span class="dash-chip-cor" style="background:${s.cor}"></span><span>${escapeHtml(s.rotulo)}</span><b>${formatCurrency(p[s.id])}</b></div>`).join('')}`;
    dica.hidden = false;
    const esquerda = x(i) + 16 + dica.offsetWidth > largura ? x(i) - 16 - dica.offsetWidth : x(i) + 16;
    dica.style.left = `${esquerda}px`;
    dica.style.top = `${Math.max(0, Math.min(altura - dica.offsetHeight, e.clientY - caixa.top - dica.offsetHeight / 2))}px`;
  };
  area.addEventListener('mousemove', mostrar);
  area.addEventListener('mouseleave', () => {
    guia.setAttribute('visibility', 'hidden');
    dica.hidden = true;
    host.querySelectorAll('[data-ponto]').forEach(c => c.setAttribute('r', 3));
  });
}

/* ------------------------------------------------------------- Rosca
   Sem legenda: passar o mouse numa cor mostra o nome e o valor. */

const ROSCAS = {
  eventos: 'Eventos por categoria',
  receita: 'Receita por origem',
  custos: 'Custos por empresa'
};
let ROSCA = 'eventos';

function fatiasDaRosca() {
  const { de, ate } = intervalo();
  if (ROSCA === 'receita') {
    const r = receitaNoIntervalo(de, ate);
    return { total: r.receita, dinheiro: true, legenda: 'receita', fatias: [['Presentes', r.presentes], ['Contratos', r.contratos]] };
  }
  if (ROSCA === 'custos') {
    const c = custosNoIntervalo(de, ate);
    return { total: somar(c), dinheiro: true, legenda: 'custo', fatias: Object.entries(c) };
  }
  const eventos = recorte().eventos;
  return {
    total: eventos.length, dinheiro: false, legenda: eventos.length === 1 ? 'evento' : 'eventos',
    fatias: [...groupBy(eventos, 'tipo').entries()].map(([tipo, lista]) => [EVENT_TYPE_LABELS[tipo] || tipo, lista.length])
  };
}

function renderCategorias() {
  const host = document.getElementById('grafico-categorias');
  const { total, dinheiro, legenda, fatias: brutas } = fatiasDaRosca();
  const fatias = brutas.filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1])
    .map(([rotulo, valor], i) => ({ rotulo, valor, pct: total ? (valor / total) * 100 : 0, cor: CORES_CATEGORIA[i % CORES_CATEGORIA.length] }));

  if (!fatias.length) {
    host.innerHTML = `<div class="empty-state"><strong>Nada no período</strong><p>Escolha outro período no cabeçalho.</p></div>`;
    return;
  }

  const tamanho = 180;
  const raio = 74;
  const espessura = 26;
  const centro = tamanho / 2;
  const circunferencia = 2 * Math.PI * raio;
  let acumulado = 0;
  const arcos = fatias.map((f, i) => {
    const comprimento = (f.pct / 100) * circunferencia;
    const traco = fatias.length > 1 ? Math.max(comprimento - 2, 0.5) : comprimento;
    const arco = `<circle cx="${centro}" cy="${centro}" r="${raio}" fill="none" stroke="${f.cor}" stroke-width="${espessura}"
      stroke-dasharray="${traco} ${circunferencia - traco}" stroke-dashoffset="${-acumulado}"
      transform="rotate(-90 ${centro} ${centro})" class="viz-fatia" data-fatia="${i}" />`;
    acumulado += comprimento;
    return arco;
  }).join('');
  const valorTotal = dinheiro ? formatCurrency(total) : formatNumber(total);

  host.innerHTML = `
    <div class="dash-rosca">
      <svg width="${tamanho}" height="${tamanho}" role="img" aria-label="${escapeHtml(ROSCAS[ROSCA])}">
        ${arcos}
        <text class="dash-rosca-rotulo" x="${centro}" y="${centro - 18}" text-anchor="middle">TOTAL</text>
        <text class="${dinheiro ? 'dash-rosca-valor' : 'donut-total'}" x="${centro}" y="${centro + 6}" text-anchor="middle">${escapeHtml(valorTotal)}</text>
        <text class="donut-legenda" x="${centro}" y="${centro + 24}" text-anchor="middle">${escapeHtml(legenda)}</text>
      </svg>
      <div class="dash-dica" id="rosca-dica" hidden></div>
    </div>
    <ul class="donut-lista dash-rosca-lista">
      ${fatias.map(f => `
        <li>
          <span class="chave" style="background:${f.cor}"></span>
          <span class="nome">${escapeHtml(f.rotulo)}</span>
          <span class="valor">${dinheiro ? formatCurrency(f.valor) : formatNumber(f.valor)} · ${Math.round(f.pct)}%</span>
        </li>`).join('')}
    </ul>`;

  const dica = host.querySelector('#rosca-dica');
  host.querySelectorAll('[data-fatia]').forEach(arco => {
    arco.addEventListener('mousemove', e => {
      const f = fatias[Number(arco.dataset.fatia)];
      dica.innerHTML = `<div class="dash-dica-linha"><span class="dash-chip-cor" style="background:${f.cor}"></span><span>${escapeHtml(f.rotulo)}</span><b>${dinheiro ? formatCurrency(f.valor) : formatNumber(f.valor)} · ${Math.round(f.pct)}%</b></div>`;
      dica.hidden = false;
      // A dica fica sempre dentro do card: perto da borda, vira para o outro lado.
      const caixa = host.querySelector('.dash-rosca').getBoundingClientRect();
      const px = e.clientX - caixa.left;
      const py = e.clientY - caixa.top;
      const larg = dica.offsetWidth;
      const alt = dica.offsetHeight;
      let esquerda = px + 12;
      if (esquerda + larg > caixa.width) esquerda = px - 12 - larg;
      esquerda = Math.max(0, Math.min(esquerda, caixa.width - larg));
      let topo = py + 12;
      if (topo + alt > caixa.height) topo = py - 12 - alt;
      dica.style.left = `${esquerda}px`;
      dica.style.top = `${Math.max(0, topo)}px`;
    });
    arco.addEventListener('mouseleave', () => { dica.hidden = true; });
  });
}

function renderPainel() {
  CACHE_DIA.clear();
  renderKpis();
  montarTopoDoGrafico();
  renderGraficoFinanceiro();
  renderCategorias();
}

async function buscarCustosIntegrados() {
  try {
    const { data: { session } } = await supabaseClient.auth.getSession();
    const r = await fetch(API_CUSTOS, { headers: { Authorization: `Bearer ${session?.access_token || ''}` } });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return await r.json();
  } catch {
    return { itens: [], cotacoes: {} };
  }
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
let CONTAS_LIGADAS = false; // busca e filtro da lista ligados uma vez só

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

  if (CONTAS_LIGADAS) return;
  CONTAS_LIGADAS = true;
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
 * então os números, o gráfico e a rosca ficam intactos.
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
