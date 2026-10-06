/* ==========================================================================
   LOVE ADMIN — Fornecedores (contas B2B)
   Lista, detalha e edita tudo o que o fornecedor vê no próprio painel.
   ========================================================================== */

let FORNECEDORES = [];
let METRICAS = new Map();

document.addEventListener('DOMContentLoaded', async () => {
  if (!(await window.adminReady)) return;

  const tbody = document.getElementById('tbody');
  renderLoading(tbody, 5);

  const [fornecedores, carteira, conversas, leads, produtos, contratos, links] = await Promise.all([
    safeSelect('fornecedores', '*'),
    safeSelect('wallet_transactions', 'fornecedor_id, type, amount'),
    safeSelect('conversations', 'fornecedor_id, cliente_id, last_message_at'),
    safeSelect('leads', 'fornecedor_id, status, value'),
    safeSelect('products', 'fornecedor_id, active'),
    safeSelect('contracts', 'fornecedor_id, valor_total, valor_pago, status'),
    safeSelect('payment_links', 'fornecedor_id, amount, status')
  ]);

  if (fornecedores.error) return renderError(tbody, 5, fornecedores.error);

  FORNECEDORES = fornecedores.data;
  METRICAS = montarMetricas({
    carteira: carteira.data,
    conversas: conversas.data,
    leads: leads.data,
    produtos: produtos.data,
    contratos: contratos.data,
    links: links.data
  });

  renderKpis();
  montarOpcoesDeFiltro();
  render();

  document.getElementById('busca').addEventListener('input', render);
  document.getElementById('filtro-plano').addEventListener('change', render);
  document.getElementById('filtro-categoria').addEventListener('change', render);

  addHeaderAction('Exportar', exportar);
  moverControlesParaHeader();
  ligarMenuDeFiltros();
  aplicarBuscaDaUrl(document.getElementById('busca'));
});

/* ---------------------------------------------------------------- Filtros */

function ligarMenuDeFiltros() {
  const botao = document.getElementById('btn-filtros');
  const menu = document.getElementById('filtro-menu');

  const fechar = () => {
    menu.hidden = true;
    botao.setAttribute('aria-expanded', 'false');
  };

  botao.addEventListener('click', (e) => {
    e.stopPropagation();
    menu.hidden = !menu.hidden;
    botao.setAttribute('aria-expanded', String(!menu.hidden));
  });

  // Clicar dentro do menu não pode fechá-lo — os selects vivem aqui.
  menu.addEventListener('click', (e) => e.stopPropagation());
  document.addEventListener('click', fechar);
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') fechar(); });

  document.getElementById('limpar-filtros').addEventListener('click', () => {
    document.getElementById('filtro-plano').value = '';
    document.getElementById('filtro-categoria').value = '';
    render();
    fechar();
  });
}

/** Mostra no botão quantos filtros estão ativos. */
function atualizarBadgeDeFiltros() {
  const ativos = ['filtro-plano', 'filtro-categoria']
    .filter(id => document.getElementById(id)?.value).length;

  const badge = document.getElementById('filtro-badge');
  if (!badge) return;
  badge.textContent = ativos;
  badge.hidden = ativos === 0;
}

/** Exporta o que está na tela — com os filtros e a busca já aplicados. */
function exportar() {
  const lista = filtrar().sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));

  if (!lista.length) {
    toast('Nenhum fornecedor para exportar com os filtros atuais.');
    return;
  }

  exportarCSV('fornecedores', [
    { titulo: 'Empresa', valor: f => f.company_name },
    { titulo: 'Razão social', valor: f => f.razao_social },
    { titulo: 'CNPJ', valor: f => f.cnpj },
    { titulo: 'E-mail', valor: f => f.email },
    { titulo: 'Responsável', valor: f => f.contact_name },
    { titulo: 'Telefone', valor: f => f.phone },
    { titulo: 'Categoria', valor: f => f.category },
    { titulo: 'Plano', valor: f => f.plan || 'Gratuito' },
    { titulo: 'Cidade', valor: f => f.city },
    { titulo: 'Estado', valor: f => f.state },
    { titulo: 'Faturamento', valor: f => metricas(f.id).entradas.toFixed(2).replace('.', ',') },
    { titulo: 'Contratos ativos', valor: f => metricas(f.id).contratosAtivos },
    { titulo: 'Contatos ativos', valor: f => metricas(f.id).contatos },
    { titulo: 'Status', valor: f => (f.status || 'ativo') },
    { titulo: 'Cadastro', valor: f => formatDate(f.created_at) }
  ], lista);
}

/* -------------------------------------------------------------- Métricas */

function montarMetricas({ carteira, conversas, leads, produtos, contratos, links }) {
  const porFornecedor = new Map();

  const bucket = (id) => {
    if (!porFornecedor.has(id)) {
      porFornecedor.set(id, {
        entradas: 0, saidas: 0, contatos: 0, leads: 0, leadsFechados: 0,
        produtos: 0, produtosAtivos: 0, contratos: 0, contratosAtivos: 0,
        valorContratos: 0, valorContratosAtivos: 0, valorRecebido: 0, tpv: 0
      });
    }
    return porFornecedor.get(id);
  };

  carteira.forEach(t => {
    const b = bucket(t.fornecedor_id);
    const valor = Number(t.amount) || 0;
    if (t.type === 'credit') b.entradas += valor; else b.saidas += valor;
  });

  conversas.forEach(c => { bucket(c.fornecedor_id).contatos += 1; });

  leads.forEach(l => {
    const b = bucket(l.fornecedor_id);
    b.leads += 1;
    if (l.status === 'fechado') b.leadsFechados += 1;
  });

  produtos.forEach(p => {
    const b = bucket(p.fornecedor_id);
    b.produtos += 1;
    if (p.active) b.produtosAtivos += 1;
  });

  contratos.forEach(c => {
    const b = bucket(c.fornecedor_id);
    const total = Number(c.valor_total) || 0;
    b.contratos += 1;
    b.valorContratos += total;
    b.valorRecebido += Number(c.valor_pago) || 0;
    // "Ativo" = contrato ainda em execução; quitado já saiu da conta.
    if (c.status !== 'quitado') {
      b.contratosAtivos += 1;
      b.valorContratosAtivos += total;
    }
  });

  (links || []).forEach(l => {
    if (l.status === 'pago') bucket(l.fornecedor_id).tpv += Number(l.amount) || 0;
  });

  return porFornecedor;
}

function metricas(id) {
  return METRICAS.get(id) || {
    entradas: 0, saidas: 0, contatos: 0, leads: 0, leadsFechados: 0,
    produtos: 0, produtosAtivos: 0, contratos: 0, contratosAtivos: 0,
    valorContratos: 0, valorContratosAtivos: 0, valorRecebido: 0, tpv: 0
  };
}

/* ------------------------------------------------------------------ KPIs */

function renderKpis() {
  const soma = (campo) => FORNECEDORES.reduce((total, f) => total + metricas(f.id)[campo], 0);

  // TPV: o que efetivamente passou pela plataforma (links de pagamento pagos).
  // Faturamento bruto: tudo que os fornecedores fecharam em contrato, pago ou não.
  const tpv = soma('tpv');
  const faturamentoBruto = soma('valorContratos');
  const contratosAtivos = soma('contratosAtivos');
  const valorAtivo = soma('valorContratosAtivos');

  const tile = (label, value, sub) => `
    <div class="kpi">
      <p class="kpi-label">${label}</p>
      <p class="kpi-value">${value}</p>
      <p class="kpi-sub">${sub}</p>
    </div>`;

  document.getElementById('kpi-grid').innerHTML = [
    tile('Fornecedores', formatNumber(FORNECEDORES.length), `${FORNECEDORES.filter(f => f.status !== 'suspenso').length} ativos`),
    tile('TPV', formatCurrency(tpv), 'Pago via links de pagamento'),
    tile('Faturamento bruto', formatCurrency(faturamentoBruto), 'Valor total dos contratos'),
    tile('Contratos ativos', formatNumber(contratosAtivos), `${formatCurrency(valorAtivo)} em aberto`)
  ].join('');
}

function montarOpcoesDeFiltro() {
  const preencher = (id, valores) => {
    const select = document.getElementById(id);
    [...new Set(valores.filter(Boolean))].sort().forEach(v => {
      const opt = document.createElement('option');
      opt.value = v;
      opt.textContent = v;
      select.appendChild(opt);
    });
  };

  preencher('filtro-plano', FORNECEDORES.map(f => f.plan));
  preencher('filtro-categoria', FORNECEDORES.map(f => f.category));
}

/* ----------------------------------------------------------------- Lista */

function filtrar() {
  const termo = document.getElementById('busca').value.trim().toLowerCase();
  const plano = document.getElementById('filtro-plano').value;
  const categoria = document.getElementById('filtro-categoria').value;

  return FORNECEDORES.filter(f => {
    if (plano && f.plan !== plano) return false;
    if (categoria && f.category !== categoria) return false;
    if (!termo) return true;
    return [f.company_name, f.email, f.cnpj, f.razao_social, f.category, f.phone, f.city]
      .some(v => String(v || '').toLowerCase().includes(termo));
  });
}

function render() {
  atualizarBadgeDeFiltros();
  const tbody = document.getElementById('tbody');
  const lista = filtrar().sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));


  if (!lista.length) {
    renderEmpty(tbody, 5, 'Nenhum fornecedor encontrado',
      FORNECEDORES.length ? 'Ajuste a busca ou os filtros acima.' : 'Nenhuma conta B2B foi criada ainda.');
    return;
  }

  // A lista mostra só o essencial — e-mail, telefone, endereço, status e as
  // demais métricas ficam no painel de detalhe, ao clicar na linha.
  tbody.innerHTML = lista.map(f => `
    <tr data-id="${f.id}">
      <td class="cell-strong">${dash(f.company_name)}</td>
      <td class="cell-muted">${dash(f.cnpj)}</td>
      <td>${dash(f.category)}</td>
      <td>${badge(f.plan || 'Gratuito', f.plan && f.plan !== 'Gratuito' ? 'badge-info' : '')}</td>
      <td class="cell-strong">${formatCurrency(metricas(f.id).entradas)}</td>
    </tr>`).join('');

  tbody.querySelectorAll('tr[data-id]').forEach(tr => {
    tr.addEventListener('click', () => abrirDetalhe(tr.dataset.id));
  });
}

/* ---------------------------------------------------------------- Drawer
   O painel é o mesmo de Últimos cadastros no dashboard: ContaDrawer.abrir()
   desenha, aqui só se diz qual conta. */

function abrirDetalhe(id) {
  ContaDrawer.abrir(id);
}
