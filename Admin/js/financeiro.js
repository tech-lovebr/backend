/* ==========================================================================
   LOVE ADMIN — Financeiro

   Topo: TPV total (tudo o que foi processado), faturamento bruto (o take
   rate que ficou com a Love), custos da plataforma e o lucro líquido entre
   os dois. Tudo recortado pelo período do cabeçalho, igual ao Dashboard.

   Embaixo dos números, o mesmo gráfico de linha do Dashboard (Financas.
   desenharGrafico) e um extrato único: cada movimento de dinheiro — presente
   de evento, cobrança de fornecedor ou saída de carteira — numa linha só,
   com a origem, se entrou ou saiu, quanto foi processado e quanto virou
   take rate.
   ========================================================================== */

// Abre em "Este mês", como o Dashboard; o calendário recorta dia ou intervalo.
const HOJE_ABERTURA = new Date();
let PERIODO = {
  de: new Date(HOJE_ABERTURA.getFullYear(), HOJE_ABERTURA.getMonth(), 1),
  ate: new Date(HOJE_ABERTURA.getFullYear(), HOJE_ABERTURA.getMonth(), HOJE_ABERTURA.getDate(), 23, 59, 59, 999)
};

let FORNECEDORES = new Map();
let EVENTOS = new Map();
let MOVIMENTOS = [];

const SERIES = [
  { id: 'tpv', rotulo: 'TPV total', cor: '#2a78d6' },
  { id: 'custo', rotulo: 'Custos', cor: '#64748b' },
  { id: 'receita', rotulo: 'Faturamento bruto', cor: '#1baf7a' }
];
let SERIE_ESCOLHIDA = null;

const comPeriodo = () => Boolean(PERIODO.de || PERIODO.ate);

document.addEventListener('DOMContentLoaded', async () => {
  if (!(await window.adminReady)) return;

  filtroDePeriodo(PERIODO, aplicarPeriodo);
  document.getElementById('btn-periodo')?.classList.toggle('is-ativo', comPeriodo());

  renderKpiSkeleton();
  renderLoading(document.getElementById('tbody-extrato'), 6);

  let largura = window.innerWidth;
  window.addEventListener('resize', () => {
    if (Math.abs(window.innerWidth - largura) < 20) return;
    largura = window.innerWidth;
    renderGrafico();
  });

  const [fornecedores, carteira, links, contribuicoes, eventos] = await Promise.all([
    safeSelect('fornecedores', 'id, company_name, plan'),
    safeSelect('wallet_transactions', 'fornecedor_id, type, amount, created_at'),
    safeSelect('payment_links', '*'),
    safeSelect('presentes_contribuicoes', '*'),
    safeSelect('eventos', 'id, titulo, host_name, couple_name'),
    Financas.carregarCustos()
  ]);

  if (fornecedores.error) return renderError(document.getElementById('tbody-extrato'), 6, fornecedores.error);

  FORNECEDORES = new Map((fornecedores.data || []).map(f => [f.id, f]));
  EVENTOS = new Map((eventos.data || []).map(e => [e.id, e]));
  MOVIMENTOS = montarMovimentos(contribuicoes.data, links.data, carteira.data);

  renderTudo();

  document.getElementById('busca-extrato').addEventListener('input', renderExtrato);
  document.getElementById('filtro-origem-extrato').addEventListener('change', renderExtrato);
  document.getElementById('filtro-tipo-extrato').addEventListener('change', renderExtrato);
});

function aplicarPeriodo() {
  document.getElementById('periodo-rotulo').textContent = rotuloDePeriodo(PERIODO);
  document.getElementById('btn-periodo').classList.toggle('is-ativo', comPeriodo());
  renderTudo();
}

function renderTudo() {
  renderKpis();
  renderGrafico();
  renderExtrato();
}

/* ======================================================== Movimentos ==
   Uma linha por movimento de dinheiro, de três fontes que antes eram três
   tabelas. Os créditos da carteira ficam de fora de propósito: eles são o
   dinheiro das cobranças chegando ao fornecedor, então contá-los também
   dobraria a mesma entrada. ============================================ */

function montarMovimentos(contribuicoes, links, carteira) {
  const presentes = (contribuicoes || [])
    .filter(c => c.status === 'pago' && (c.pago_em || c.created_at))
    .map(c => {
      const valor = Number(c.valor) || 0;
      const evento = EVENTOS.get(c.evento_id);
      return {
        em: c.pago_em || c.created_at,
        origem: 'evento',
        nome: evento?.titulo || evento?.couple_name || evento?.host_name || 'Evento',
        sub: c.nome ? `Presente de ${c.nome}` : 'Presente',
        tipo: 'entrada',
        valor,
        takeRate: c.comissao_love != null ? Number(c.comissao_love) : valor * COMISSAO_PADRAO.presentes,
        estimada: c.comissao_love == null,
        status: 'pago'
      };
    });

  const cobrancas = (links || [])
    .filter(l => l.created_at || l.paid_at)
    .map(l => {
      const valor = Number(l.amount) || 0;
      const pago = l.status === 'pago';
      return {
        em: l.paid_at || l.created_at,
        origem: 'fornecedor',
        nome: FORNECEDORES.get(l.fornecedor_id)?.company_name || 'Fornecedor',
        sub: `Cobrança · ${formatNumber(l.installments || 1)}x`,
        tipo: 'entrada',
        valor,
        // Só o que foi pago rendeu take rate; o pendente ainda não é receita.
        takeRate: pago ? (l.comissao_love != null ? Number(l.comissao_love) : valor * COMISSAO_PADRAO.contratos) : 0,
        estimada: pago && l.comissao_love == null,
        status: pago ? 'pago' : 'pendente'
      };
    });

  const saidas = (carteira || [])
    .filter(t => t.type !== 'credit' && t.created_at)
    .map(t => ({
      em: t.created_at,
      origem: 'fornecedor',
      nome: FORNECEDORES.get(t.fornecedor_id)?.company_name || 'Fornecedor',
      sub: 'Saque da carteira',
      tipo: 'saida',
      valor: Number(t.amount) || 0,
      takeRate: 0,
      estimada: false,
      status: 'pago'
    }));

  return [...presentes, ...cobrancas, ...saidas].sort((a, b) => new Date(b.em) - new Date(a.em));
}

/** Só o que entrou e foi pago conta como processado. */
const ehProcessado = m => m.tipo === 'entrada' && m.status === 'pago';

function noPeriodo(data) {
  if (!PERIODO.de && !PERIODO.ate) return true;
  if (!data) return false;
  const t = new Date(data).getTime();
  return (!PERIODO.de || t >= PERIODO.de.getTime()) && (!PERIODO.ate || t <= PERIODO.ate.getTime());
}

/** Início e fim do período em datas de verdade ("Todo o período" começa no primeiro movimento). */
function intervalo() {
  const agora = new Date();
  const ate = PERIODO.ate || new Date(agora.getFullYear(), agora.getMonth(), agora.getDate(), 23, 59, 59, 999);
  if (PERIODO.de) return { de: PERIODO.de, ate };
  const datas = MOVIMENTOS.map(m => new Date(m.em).getTime()).filter(Number.isFinite);
  const primeiro = datas.length ? new Date(Math.min(...datas)) : new Date(agora.getFullYear(), agora.getMonth(), 1);
  return { de: new Date(primeiro.getFullYear(), primeiro.getMonth(), primeiro.getDate()), ate };
}

function receitaNoIntervalo(de, ate) {
  const r = { tpv: 0, receita: 0 };
  MOVIMENTOS.forEach(m => {
    if (!ehProcessado(m)) return;
    const t = new Date(m.em);
    if (t < de || t > ate) return;
    r.tpv += m.valor;
    r.receita += m.takeRate;
  });
  return r;
}

/* ============================================================== KPIs == */

function renderKpiSkeleton() {
  document.getElementById('kpi-grid').innerHTML = Array.from({ length: 4 }, () =>
    `<div class="kpi"><div class="skeleton" style="width:55%"></div><div class="skeleton" style="width:70%;height:26px;margin-top:.625rem"></div></div>`
  ).join('');
}

function renderKpis() {
  const { de, ate } = intervalo();
  const { tpv, receita } = receitaNoIntervalo(de, ate);
  const custo = Financas.somar(Financas.custosNoIntervalo(de, ate));
  const lucro = receita - custo;
  const pagos = MOVIMENTOS.filter(m => ehProcessado(m) && noPeriodo(m.em)).length;

  const tile = (label, value, sub, cor = '') => `
    <div class="kpi"><p class="kpi-label">${escapeHtml(label)}</p>
      <p class="kpi-value"${cor ? ` style="color:${cor}"` : ''}>${value}</p>
      <p class="kpi-sub">${escapeHtml(sub)}</p></div>`;

  document.getElementById('kpi-grid').innerHTML = [
    tile('TPV total', formatCurrency(tpv), `${formatNumber(pagos)} ${pagos === 1 ? 'pagamento processado' : 'pagamentos processados'}`),
    tile('Faturamento bruto', formatCurrency(receita), 'Take rate da Love sobre o TPV'),
    tile('Custos', formatCurrency(custo), 'Servidor, banco, e-mail e custos manuais'),
    tile('Lucro líquido', formatCurrency(lucro), 'Faturamento bruto − custos',
      lucro < 0 ? 'var(--danger)' : (lucro > 0 ? 'var(--success)' : ''))
  ].join('');
}

/* =========================================================== Gráfico == */

function renderGrafico() {
  Financas.chips(document.getElementById('grafico-topo'), SERIES, SERIE_ESCOLHIDA, escolhida => {
    SERIE_ESCOLHIDA = escolhida;
    renderGrafico();
  });

  const { de, ate } = intervalo();
  const agora = new Date();
  Financas.desenharGrafico(document.getElementById('grafico-financeiro'), {
    de, ate, series: SERIES, escolhida: SERIE_ESCOLHIDA,
    pontoDe: (ini, fim) => {
      if (ini > agora) return { tpv: 0, receita: 0, custo: 0 };
      const r = receitaNoIntervalo(ini, new Date(fim.getTime() - 1));
      return { ...r, custo: Financas.somar(Financas.custosNoIntervalo(ini, fim)) };
    }
  });
}

/* =========================================================== Extrato == */

const ROTULO_ORIGEM = { evento: 'Evento', fornecedor: 'Fornecedor', assinatura: 'Assinatura' };

function renderExtrato() {
  const tbody = document.getElementById('tbody-extrato');
  const termo = document.getElementById('busca-extrato').value.trim().toLowerCase();
  const origem = document.getElementById('filtro-origem-extrato').value;
  const tipo = document.getElementById('filtro-tipo-extrato').value;

  const noRecorte = MOVIMENTOS.filter(m => noPeriodo(m.em));
  const lista = noRecorte.filter(m => {
    if (origem && m.origem !== origem) return false;
    if (tipo && m.tipo !== tipo) return false;
    if (!termo) return true;
    return [m.nome, m.sub, ROTULO_ORIGEM[m.origem]].some(v => String(v || '').toLowerCase().includes(termo));
  });

  if (!lista.length) {
    renderEmpty(tbody, 6, 'Nenhum movimento no período',
      noRecorte.length ? 'Nada encontrado para essa busca ou filtro.' : 'Presentes, cobranças de fornecedores e saques aparecem aqui.');
    return;
  }

  tbody.innerHTML = lista.map(m => {
    const entrada = m.tipo === 'entrada';
    return `
      <tr class="no-hover">
        <td class="cell-muted">${escapeHtml(formatDateTime(m.em))}</td>
        <td><span class="cell-strong">${escapeHtml(m.nome)}</span><span class="cell-sub">${escapeHtml([ROTULO_ORIGEM[m.origem], m.sub].filter(Boolean).join(' · '))}</span></td>
        <td>${badge(entrada ? 'Entrada' : 'Saída', entrada ? 'badge-success' : 'badge-warning')}</td>
        <td class="valor-dinheiro"${entrada ? '' : ' style="color:var(--danger)"'}>${entrada ? '' : '− '}${formatCurrency(m.valor)}</td>
        <td class="valor-dinheiro cell-strong" title="${m.estimada ? 'Pela taxa padrão: o gateway ainda não informou a comissão' : ''}">${m.takeRate ? formatCurrency(m.takeRate) : '—'}</td>
        <td>${badge(m.status === 'pago' ? 'Pago' : 'Pendente', m.status === 'pago' ? 'badge-success' : 'badge-warning')}</td>
      </tr>`;
  }).join('');
}
