/* ==========================================================================
   LOVE ADMIN — Serviços/Produtos (HUB/B2B)
   Tudo o que os fornecedores cadastraram no Catálogo de serviços do Hub
   (tabela products). Mostra o título, a empresa, o local, a unidade de
   cobrança e o valor do jeito que o fornecedor preencheu.
   ========================================================================== */

// Unidade de cobrança gravada pelo Hub em products.extra.pricing.type.
const COBRANCA = {
  POR_PESSOA: 'Por pessoa',
  POR_HORA: 'Por hora',
  VALOR_FIXO: 'Valor fixo',
  SOB_CONSULTA: 'Sob consulta',
  POR_DIA: 'Por dia'
};

let ITENS = [];

document.addEventListener('DOMContentLoaded', async () => {
  if (!(await window.adminReady)) return;

  const tbody = document.getElementById('tbody');
  renderLoading(tbody, 5);

  const [produtos, fornecedores] = await Promise.all([
    safeSelect('products', '*', q => q.order('created_at', { ascending: false })),
    safeSelect('fornecedores', 'id, company_name, city, state')
  ]);
  if (produtos.error) return renderError(tbody, 5, produtos.error);

  const porId = new Map(fornecedores.data.map(f => [f.id, f]));
  ITENS = produtos.data.map(p => montarItem(p, porId.get(p.fornecedor_id)));

  montarFiltros();
  renderKpis();
  render();

  document.getElementById('busca').addEventListener('input', render);
  document.getElementById('filtro-categoria').addEventListener('change', render);
  document.getElementById('filtro-cobranca').addEventListener('change', render);

  addHeaderAction('Exportar', () => exportarCSV('servicos-produtos', [
    { titulo: 'Produto/Serviço', valor: i => i.titulo },
    { titulo: 'Categoria', valor: i => i.categoria },
    { titulo: 'Empresa', valor: i => i.empresa },
    { titulo: 'Local', valor: i => i.local },
    { titulo: 'Cobrança', valor: i => i.cobranca },
    { titulo: 'Valor', valor: i => i.valorTexto },
    { titulo: 'Status', valor: i => (i.ativo ? 'Ativo' : 'Inativo') }
  ], filtrar()));
  moverControlesParaHeader();
  aplicarBuscaDaUrl(document.getElementById('busca'));
});

/* Lê o produto do jeito que o Hub grava (products.extra) e já deixa os
   textos prontos para a tabela e para o CSV. */
function montarItem(p, fornecedor) {
  const extra = p.extra || {};
  const pricing = extra.pricing || null;
  const venue = extra.venue || null;

  let tipo = pricing && pricing.type;
  let valor = null;
  let aPartirDe = false;

  if (tipo === 'POR_PESSOA') valor = pricing.perPerson && pricing.perPerson.pricePerPerson;
  else if (tipo === 'POR_HORA') valor = pricing.perHour && pricing.perHour.pricePerHour;
  else if (tipo === 'VALOR_FIXO') valor = pricing.fixed && pricing.fixed.price;
  else if (tipo === 'SOB_CONSULTA') { valor = pricing.onRequest && pricing.onRequest.startingPrice; aPartirDe = true; }

  // Espaço para locação usa a grade de preço por dia (sem motor de preço).
  if (!tipo && venue) {
    const dias = [venue.priceWeekday, venue.priceSaturday, venue.priceSunday, venue.priceHoliday]
      .map(Number).filter(v => v > 0);
    if (dias.length) { tipo = 'POR_DIA'; valor = Math.min(...dias); aPartirDe = dias.length > 1; }
  }
  if (!tipo && Number(p.price) > 0) { tipo = 'VALOR_FIXO'; valor = p.price; }

  valor = Number(valor) || 0;
  let valorTexto;
  if (tipo === 'SOB_CONSULTA') valorTexto = valor > 0 ? `A partir de ${formatCurrency(valor)}` : 'Sob consulta';
  else if (valor > 0) valorTexto = (aPartirDe ? 'A partir de ' : '') + formatCurrency(valor);
  else valorTexto = '—';

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
    valor,
    valorTexto,
    ativo: p.active !== false
  };
}

function montarFiltros() {
  const preencher = (id, valores) => {
    const select = document.getElementById(id);
    valores.forEach(([valor, texto]) => {
      const opt = document.createElement('option');
      opt.value = valor;
      opt.textContent = texto;
      select.appendChild(opt);
    });
  };
  preencher('filtro-categoria',
    [...new Set(ITENS.map(i => i.categoria).filter(Boolean))].sort().map(c => [c, c]));
  preencher('filtro-cobranca',
    Object.entries(COBRANCA).filter(([tipo]) => ITENS.some(i => i.tipo === tipo)));
}

function renderKpis() {
  const ativos = ITENS.filter(i => i.ativo);
  const tile = (label, value, sub) => `
    <div class="kpi"><p class="kpi-label">${label}</p><p class="kpi-value">${value}</p><p class="kpi-sub">${sub}</p></div>`;

  document.getElementById('kpi-grid').innerHTML = [
    tile('Produtos e serviços', formatNumber(ITENS.length), `${formatNumber(ativos.length)} ativos`),
    tile('Empresas', formatNumber(new Set(ITENS.map(i => i.fornecedorId)).size), 'Com algo cadastrado'),
    tile('Categorias', formatNumber(new Set(ITENS.map(i => i.categoria).filter(Boolean)).size), 'Usadas no catálogo'),
    tile('Sob consulta', formatNumber(ITENS.filter(i => i.tipo === 'SOB_CONSULTA').length), 'Sem preço fechado')
  ].join('');
}

function filtrar() {
  const termo = document.getElementById('busca').value.trim().toLowerCase();
  const categoria = document.getElementById('filtro-categoria').value;
  const cobranca = document.getElementById('filtro-cobranca').value;

  return ITENS.filter(i => {
    if (categoria && i.categoria !== categoria) return false;
    if (cobranca && i.tipo !== cobranca) return false;
    if (!termo) return true;
    return [i.titulo, i.empresa, i.categoria, i.subcategoria, i.local]
      .some(v => String(v || '').toLowerCase().includes(termo));
  });
}

function render() {
  const tbody = document.getElementById('tbody');
  const lista = filtrar();

  if (!lista.length) {
    renderEmpty(tbody, 5, 'Nenhum produto ou serviço encontrado',
      ITENS.length
        ? 'Ajuste a busca ou os filtros.'
        : 'Quando os fornecedores cadastrarem itens no Catálogo de serviços do Hub, eles aparecem aqui.');
    return;
  }

  tbody.innerHTML = lista.map(i => `
    <tr data-id="${i.id}">
      <td>
        <span class="cell-strong">${escapeHtml(i.titulo)}</span>
        ${i.ativo ? '' : badge('Inativo', 'badge-warning')}
        ${i.categoria ? `<br><span class="cell-muted">${escapeHtml(i.categoria)}${i.subcategoria ? ' · ' + escapeHtml(i.subcategoria) : ''}</span>` : ''}
      </td>
      <td>${dash(i.empresa)}</td>
      <td class="cell-muted">${dash(i.local)}</td>
      <td class="cell-muted">${dash(i.cobranca)}</td>
      <td class="cell-strong">${escapeHtml(i.valorTexto)}</td>
    </tr>`).join('');
}
