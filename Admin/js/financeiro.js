/* ==========================================================================
   LOVE ADMIN — Financeiro
   Topo: TPV total (tudo o que foi processado) e faturamento bruto (só o que
   ficou com a Love em comissões de intermediação). Extrato: cada pagamento
   com a origem, o gateway que processou, o split que foi para o anfitrião
   ou o fornecedor e o que caiu para a Love. Embaixo, a carteira dos
   fornecedores e os links de pagamento.
   ========================================================================== */

let LINKS = [];
let FORNECEDORES = new Map();
let EVENTOS = new Map();
let EXTRATO = [];

document.addEventListener('DOMContentLoaded', async () => {
  if (!(await window.adminReady)) return;

  const tbodyExtrato = document.getElementById('tbody-extrato');
  const tbodyForn = document.getElementById('tbody-fornecedores');
  const tbodyLinks = document.getElementById('tbody-links');
  renderLoading(tbodyExtrato, 7);
  renderLoading(tbodyForn, 7);
  renderLoading(tbodyLinks, 6);

  const [fornecedores, carteira, contratos, links, contribuicoes, eventos] = await Promise.all([
    safeSelect('fornecedores', 'id, company_name, plan'),
    safeSelect('wallet_transactions', 'fornecedor_id, type, amount, created_at'),
    safeSelect('contracts', 'fornecedor_id, valor_total, valor_pago, status'),
    safeSelect('payment_links', '*'),
    safeSelect('presentes_contribuicoes', '*'),
    safeSelect('eventos', 'id, titulo, host_name, couple_name')
  ]);

  if (fornecedores.error) return renderError(tbodyForn, 7, fornecedores.error);

  FORNECEDORES = new Map(fornecedores.data.map(f => [f.id, f]));
  EVENTOS = new Map((eventos.data || []).map(e => [e.id, e]));
  LINKS = links.data;
  EXTRATO = pagamentosProcessados(contribuicoes.data, links.data)
    .sort((a, b) => new Date(b.em) - new Date(a.em));

  renderKpis();
  renderExtrato();
  renderFornecedores(fornecedores.data, carteira.data, contratos.data);
  renderLinks();

  document.getElementById('busca-extrato').addEventListener('input', renderExtrato);
  document.getElementById('filtro-origem-extrato').addEventListener('change', renderExtrato);
  document.getElementById('filtro-status-link').addEventListener('change', renderLinks);
});

function renderKpis() {
  const tpv = EXTRATO.reduce((s, p) => s + p.valor, 0);
  const love = EXTRATO.reduce((s, p) => s + p.comissao, 0);
  const repasse = EXTRATO.reduce((s, p) => s + p.repasse, 0);

  const tile = (label, value, sub) => `
    <div class="kpi"><p class="kpi-label">${label}</p><p class="kpi-value">${value}</p><p class="kpi-sub">${sub}</p></div>`;

  document.getElementById('kpi-grid').innerHTML = [
    tile('TPV total', formatCurrency(tpv), `${formatNumber(EXTRATO.length)} ${EXTRATO.length === 1 ? 'pagamento processado' : 'pagamentos processados'}`),
    tile('Faturamento bruto', formatCurrency(love), 'Comissões de intermediação da Love'),
    tile('Repasses', formatCurrency(repasse), 'Split para anfitriões e fornecedores')
  ].join('');
}

/** Quem pagou ou recebeu, para a coluna Origem. */
function origemDoPagamento(p) {
  if (p.origem === 'presentes') {
    const e = EVENTOS.get(p.bruto.evento_id);
    return { tipo: 'Presente', nome: e?.titulo || e?.couple_name || e?.host_name || 'Evento', sub: p.bruto.nome ? `de ${p.bruto.nome}` : '' };
  }
  return { tipo: 'Contrato', nome: FORNECEDORES.get(p.bruto.fornecedor_id)?.company_name || 'Fornecedor', sub: `${formatNumber(p.bruto.installments || 1)}x` };
}

function renderExtrato() {
  const tbody = document.getElementById('tbody-extrato');
  const termo = document.getElementById('busca-extrato').value.trim().toLowerCase();
  const origem = document.getElementById('filtro-origem-extrato').value;

  const lista = EXTRATO.filter(p => {
    if (origem && p.origem !== origem) return false;
    if (!termo) return true;
    const o = origemDoPagamento(p);
    return [o.nome, o.sub, p.gateway, NOME_GATEWAY[p.gateway], p.metodo].some(v => String(v || '').toLowerCase().includes(termo));
  });

  if (!lista.length) {
    renderEmpty(tbody, 7, 'Nenhum pagamento processado',
      EXTRATO.length ? 'Nada encontrado para essa busca.' : 'Os presentes e contratos pagos aparecem aqui, com o que ficou para a Love.');
    return;
  }

  tbody.innerHTML = lista.map(p => {
    const o = origemDoPagamento(p);
    const gateway = p.gateway ? (NOME_GATEWAY[p.gateway] || p.gateway) : '—';
    const metodo = p.metodo ? (NOME_METODO[p.metodo] || p.metodo) : '';
    return `
      <tr class="no-hover">
        <td class="cell-muted">${escapeHtml(formatDateTime(p.em))}</td>
        <td><span class="cell-strong">${escapeHtml(o.nome)}</span><span class="cell-sub">${escapeHtml([o.tipo, o.sub].filter(Boolean).join(' · '))}</span></td>
        <td><span class="cell-strong">${escapeHtml(gateway)}</span>${metodo ? `<span class="cell-sub">${escapeHtml(metodo)}</span>` : ''}</td>
        <td class="valor-dinheiro">${formatCurrency(p.valor)}</td>
        <td class="valor-dinheiro cell-muted">${formatCurrency(p.repasse)}</td>
        <td class="valor-dinheiro cell-strong" title="${p.estimada ? 'Pela taxa padrão: o gateway ainda não informou a comissão' : ''}">${formatCurrency(p.comissao)}</td>
        <td>${badge('Pago', 'badge-success')}</td>
      </tr>`;
  }).join('');
}

function renderFornecedores(fornecedores, carteira, contratos) {
  const tbody = document.getElementById('tbody-fornecedores');

  const mapa = new Map();
  const bucket = (id) => {
    if (!mapa.has(id)) mapa.set(id, { entradas: 0, saidas: 0, contratos: 0, valorContratos: 0 });
    return mapa.get(id);
  };

  carteira.forEach(t => {
    const b = bucket(t.fornecedor_id);
    const valor = Number(t.amount) || 0;
    if (t.type === 'credit') b.entradas += valor; else b.saidas += valor;
  });

  contratos.forEach(c => {
    const b = bucket(c.fornecedor_id);
    b.contratos += 1;
    b.valorContratos += Number(c.valor_total) || 0;
  });

  const linhas = fornecedores
    .map(f => ({ f, m: bucket(f.id) }))
    .sort((a, b) => b.m.entradas - a.m.entradas);

  if (!linhas.length) {
    renderEmpty(tbody, 7, 'Nenhum fornecedor', 'Nenhuma conta B2B foi criada ainda.');
    return;
  }

  tbody.innerHTML = linhas.map(({ f, m }) => `
    <tr class="no-hover">
      <td class="cell-strong">${dash(f.company_name)}</td>
      <td>${badge(f.plan || 'Gratuito', f.plan && f.plan !== 'Gratuito' ? 'badge-info' : '')}</td>
      <td style="color:var(--success);font-weight:600">${formatCurrency(m.entradas)}</td>
      <td style="color:var(--danger)">${formatCurrency(m.saidas)}</td>
      <td class="cell-strong">${formatCurrency(m.entradas - m.saidas)}</td>
      <td>${formatNumber(m.contratos)}</td>
      <td>${formatCurrency(m.valorContratos)}</td>
    </tr>`).join('');
}

function renderLinks() {
  const tbody = document.getElementById('tbody-links');
  const filtro = document.getElementById('filtro-status-link').value;

  const lista = LINKS
    .filter(l => !filtro || l.status === filtro)
    .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));

  if (!lista.length) {
    renderEmpty(tbody, 6, 'Nenhum link de pagamento',
      LINKS.length ? 'Nenhum link com esse status.' : 'Os fornecedores ainda não geraram cobranças.');
    return;
  }

  tbody.innerHTML = lista.map(l => `
    <tr class="no-hover">
      <td class="cell-strong">${dash(FORNECEDORES.get(l.fornecedor_id)?.company_name)}</td>
      <td class="cell-strong">${formatCurrency(l.amount)}</td>
      <td class="cell-muted">${formatNumber(l.installments || 1)}x</td>
      <td>${badge(l.status === 'pago' ? 'Pago' : 'Pendente', l.status === 'pago' ? 'badge-success' : 'badge-warning')}</td>
      <td class="cell-muted">${escapeHtml(formatDate(l.created_at))}</td>
      <td class="cell-muted">${escapeHtml(l.paid_at ? formatDate(l.paid_at) : '—')}</td>
    </tr>`).join('');
}
