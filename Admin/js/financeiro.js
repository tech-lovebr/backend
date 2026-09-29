/* ==========================================================================
   LOVE ADMIN — Financeiro
   Consolida a carteira dos fornecedores (B2B) e a dos clientes (noivos).
   ========================================================================== */

let LINKS = [];
let FORNECEDORES = new Map();

document.addEventListener('DOMContentLoaded', async () => {
  if (!(await window.adminReady)) return;

  const tbodyForn = document.getElementById('tbody-fornecedores');
  const tbodyLinks = document.getElementById('tbody-links');
  renderLoading(tbodyForn, 7);
  renderLoading(tbodyLinks, 6);

  const [fornecedores, carteira, contratos, links, notas, carteiraCliente, presentes] = await Promise.all([
    safeSelect('fornecedores', 'id, company_name, plan'),
    safeSelect('wallet_transactions', 'fornecedor_id, type, amount, created_at'),
    safeSelect('contracts', 'fornecedor_id, valor_total, valor_pago, status'),
    safeSelect('payment_links', 'id, fornecedor_id, amount, installments, status, created_at, paid_at'),
    safeSelect('notas_fiscais', 'id, value'),
    safeSelect('cliente_wallet_transactions', 'type, amount'),
    safeSelect('presentes', 'valor, status')
  ]);

  if (fornecedores.error) return renderError(tbodyForn, 7, fornecedores.error);

  FORNECEDORES = new Map(fornecedores.data.map(f => [f.id, f]));
  LINKS = links.data;

  renderKpis({
    carteira: carteira.data,
    links: links.data,
    notas: notas.data,
    carteiraCliente: carteiraCliente.data,
    presentes: presentes.data
  });

  renderFornecedores(fornecedores.data, carteira.data, contratos.data);
  renderLinks();

  document.getElementById('filtro-status-link').addEventListener('change', renderLinks);
});

function renderKpis({ carteira, links, notas, carteiraCliente, presentes }) {
  const entradasB2B = carteira.filter(t => t.type === 'credit').reduce((s, t) => s + (Number(t.amount) || 0), 0);
  const saidasB2B = carteira.filter(t => t.type === 'debit').reduce((s, t) => s + (Number(t.amount) || 0), 0);
  const pagos = links.filter(l => l.status === 'pago');
  const pendentes = links.filter(l => l.status === 'pendente');
  const valorPendente = pendentes.reduce((s, l) => s + (Number(l.amount) || 0), 0);
  const arrecadadoPresentes = presentes
    .filter(p => p.status === 'recebido')
    .reduce((s, p) => s + (Number(p.valor) || 0), 0);

  const tile = (label, value, sub) => `
    <div class="kpi"><p class="kpi-label">${label}</p><p class="kpi-value">${value}</p><p class="kpi-sub">${sub}</p></div>`;

  document.getElementById('kpi-grid').innerHTML = [
    tile('Entradas no B2B', formatCurrency(entradasB2B), `${formatNumber(pagos.length)} links pagos`),
    tile('Saques dos fornecedores', formatCurrency(saidasB2B), 'Debitados da carteira'),
    tile('Saldo retido no B2B', formatCurrency(entradasB2B - saidasB2B), 'Ainda não sacado'),
    tile('A receber', formatCurrency(valorPendente), `${formatNumber(pendentes.length)} links pendentes`),
    tile('Presentes (noivos)', formatCurrency(arrecadadoPresentes), 'Arrecadado em presentes'),
    tile('Saldo dos clientes', formatCurrency(walletBalance(carteiraCliente)), 'Disponível para saque'),
    tile('Notas fiscais', formatNumber(notas.length), `${formatCurrency(notas.reduce((s, n) => s + (Number(n.value) || 0), 0))} emitidos`)
  ].join('');
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
