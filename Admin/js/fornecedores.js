/* ==========================================================================
   LOVE ADMIN — Fornecedores (contas B2B)
   Lista, detalha e edita tudo o que o fornecedor vê no próprio painel.
   ========================================================================== */

let FORNECEDORES = [];
let METRICAS = new Map();

/** Contas marcadas na tabela, para as ações em massa. */
let SELECIONADAS = new Set();

let ORDEM_CADASTRO = null;

/** Ordem de entrada na plataforma. Ver sequenciaDeCadastro() em utils.js. */
function numeroDoCadastro(id) {
  if (!ORDEM_CADASTRO) ORDEM_CADASTRO = sequenciaDeCadastro(FORNECEDORES);
  return ORDEM_CADASTRO.get(id) || '—';
}

document.addEventListener('DOMContentLoaded', async () => {
  if (!(await window.adminReady)) return;

  const tbody = document.getElementById('tbody');
  renderLoading(tbody, 9);

  const [fornecedores, carteira, conversas, leads, produtos, contratos, links] = await Promise.all([
    safeSelect('fornecedores', '*'),
    safeSelect('wallet_transactions', 'fornecedor_id, type, amount'),
    safeSelect('conversations', 'fornecedor_id, cliente_id, last_message_at'),
    safeSelect('leads', 'fornecedor_id, status, value'),
    safeSelect('products', 'fornecedor_id, active'),
    safeSelect('contracts', 'fornecedor_id, valor_total, valor_pago, status'),
    safeSelect('payment_links', 'fornecedor_id, amount, status')
  ]);

  if (fornecedores.error) return renderError(tbody, 7, fornecedores.error);

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
  ligarSelecao();
  render();

  document.getElementById('busca').addEventListener('input', render);
  document.getElementById('filtro-plano').addEventListener('change', render);
  document.getElementById('filtro-categoria').addEventListener('change', render);

  addHeaderAction('Exportar', exportar);
  addHeaderAction('Adicionar', () => NovoFornecedor.abrir(), {
    icone: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14" /><path d="M5 12h14" /></svg>'
  }).className = 'btn btn-primary';
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
    renderBarraDeSelecao();
    renderEmpty(tbody, 9, 'Nenhum fornecedor encontrado',
      FORNECEDORES.length ? 'Ajuste a busca ou os filtros acima.' : 'Nenhuma conta B2B foi criada ainda.');
    return;
  }

  // A lista mostra só o essencial — e-mail, telefone, endereço, status e as
  // demais métricas ficam no painel de detalhe, ao clicar na linha.
  tbody.innerHTML = lista.map(f => {
    const m = metricas(f.id);
    const marcada = SELECIONADAS.has(f.id);
    return `
    <tr data-id="${f.id}" class="${marcada ? 'is-selecionada' : ''}">
      <td class="col-selecao">
        <input type="checkbox" data-selecionar="${f.id}" ${marcada ? 'checked' : ''}
               aria-label="Selecionar ${escapeHtml(f.company_name || f.email || '')}">
      </td>
      <td class="col-numero cell-muted">${escapeHtml(numeroDoCadastro(f.id))}</td>
      <td class="cell-strong">${dash(f.company_name)}</td>
      <td class="cell-muted">${celulaEmail(f.email)}</td>
      <td class="cell-muted">${dash(f.cnpj)}</td>
      <td>${badge(f.plan || 'Gratuito', f.plan && f.plan !== 'Gratuito' ? 'badge-info' : '')}</td>
      <td>${formatNumber(m.contratosAtivos)} <span class="cell-muted">de ${formatNumber(m.contratos)}</span></td>
      <td class="col-numero ${f.score ? 'cell-strong' : 'cell-muted'}">${f.score ? formatNumber(f.score) : '—'}</td>
      <td class="col-acoes">${botaoVerMais(f.id)}</td>
    </tr>`;
  }).join('');

  // A caixa de seleção não abre o drawer: são intenções diferentes na mesma linha.
  tbody.querySelectorAll('[data-selecionar]').forEach(caixa => {
    caixa.addEventListener('click', e => e.stopPropagation());
    caixa.addEventListener('change', () => {
      if (caixa.checked) SELECIONADAS.add(caixa.dataset.selecionar);
      else SELECIONADAS.delete(caixa.dataset.selecionar);
      caixa.closest('tr').classList.toggle('is-selecionada', caixa.checked);
      renderBarraDeSelecao();
    });
  });

  // A linha não abre o drawer: dá para selecionar e copiar o texto. Quem
  // abre é o olho no fim da linha.
  ligarAcoesDaLinha(tbody, abrirDetalhe);

  renderBarraDeSelecao();
}

/* ------------------------------------------------------ Seleção em massa */

function ligarSelecao() {
  document.getElementById('selecionar-todos').addEventListener('change', (e) => {
    const visiveis = filtrar().map(f => f.id);
    // Marca o que está na tela, não a base inteira: o que o admin vê é o que ele pega.
    if (e.target.checked) visiveis.forEach(id => SELECIONADAS.add(id));
    else visiveis.forEach(id => SELECIONADAS.delete(id));
    render();
  });

  document.getElementById('btn-limpar-selecao').addEventListener('click', () => {
    SELECIONADAS.clear();
    render();
  });

  document.getElementById('btn-bloquear-selecao').addEventListener('click', perguntarAcaoEmMassa);
}

function renderBarraDeSelecao() {
  const barra = document.getElementById('barra-selecao');
  const total = SELECIONADAS.size;

  barra.hidden = total === 0;
  document.getElementById('selecao-contagem').textContent =
    `${formatNumber(total)} ${total === 1 ? 'conta selecionada' : 'contas selecionadas'}`;

  const visiveis = filtrar().map(f => f.id);
  const todos = document.getElementById('selecionar-todos');
  todos.checked = visiveis.length > 0 && visiveis.every(id => SELECIONADAS.has(id));
  todos.indeterminate = !todos.checked && visiveis.some(id => SELECIONADAS.has(id));
}

function perguntarAcaoEmMassa() {
  const ids = [...SELECIONADAS];
  const quantas = `${formatNumber(ids.length)} ${ids.length === 1 ? 'conta' : 'contas'}`;

  Modal.abrir({
    titulo: `Deseja bloquear ou excluir ${quantas}?`,
    texto: 'Bloquear impede o acesso e pode ser desfeito a qualquer momento. '
         + 'Excluir apaga as contas e tudo que elas criaram.',
    // Ordem deliberada: o destrutivo longe do canto onde a mão descansa, e
    // Cancelar à direita, que é para onde o clique de recuo vai.
    acoes: [
      { rotulo: 'Excluir', classe: 'btn-danger', aoClicar: () => confirmarExclusao(ids) },
      { rotulo: 'Bloquear', classe: 'btn-neutro', aoClicar: () => executarEmMassa(ids, 'bloquear') },
      { rotulo: 'Cancelar', classe: 'btn-ghost', aoClicar: () => Modal.fechar() }
    ]
  });
}

/* Excluir pede um segundo sim. O primeiro clique é uma escolha entre três
   saídas; este é o único que não tem volta, e um passo a mais é barato
   perto de apagar contas por engano. */
function confirmarExclusao(ids) {
  const quantas = `${formatNumber(ids.length)} ${ids.length === 1 ? 'conta' : 'contas'}`;

  Modal.abrir({
    titulo: 'Tem certeza?',
    texto: `${quantas} e tudo que ${ids.length === 1 ? 'ela criou' : 'elas criaram'} serão apagados: produtos, contratos, leads e conversas. Esta ação não pode ser desfeita.`,
    acoes: [
      { rotulo: 'Sim', classe: 'btn-danger', aoClicar: () => executarEmMassa(ids, 'excluir') },
      { rotulo: 'Não', classe: 'btn-ghost', aoClicar: () => Modal.fechar() }
    ]
  });
}

/**
 * Chama a função do banco uma vez por conta. O banco recusa sozinho o que não
 * pode (administrador, a própria conta), então o resultado vem separado em
 * feitas e recusadas, em vez de parar tudo no primeiro erro.
 */
async function executarEmMassa(ids, acao) {
  Modal.ocupado(true);

  const chamadas = ids.map(id => acao === 'bloquear'
    ? supabaseClient.rpc('admin_bloquear_conta', { p_id: id, p_bloquear: true })
    : supabaseClient.rpc('admin_excluir_conta', { p_id: id }));

  const respostas = await Promise.all(chamadas);
  const falhas = respostas.filter(r => r.error);

  Modal.ocupado(false);
  Modal.fechar();

  const feitas = ids.length - falhas.length;
  const verbo = acao === 'bloquear' ? 'bloqueada' : 'excluída';

  if (!feitas) {
    toast(`Nenhuma conta foi ${verbo}: ${falhas[0].error.message}`);
    return;
  }

  toast(falhas.length
    ? `${formatNumber(feitas)} ${feitas === 1 ? `conta ${verbo}` : `contas ${verbo}s`}; ${formatNumber(falhas.length)} recusada${falhas.length === 1 ? '' : 's'}.`
    : `${formatNumber(feitas)} ${feitas === 1 ? `conta ${verbo}` : `contas ${verbo}s`}.`);

  SELECIONADAS.clear();
  window.location.reload();
}

/* ---------------------------------------------------------------- Drawer
   O painel é o mesmo de Últimos cadastros no dashboard: ContaDrawer.abrir()
   desenha, aqui só se diz qual conta. */

function abrirDetalhe(id) {
  ContaDrawer.abrir(id);
}
