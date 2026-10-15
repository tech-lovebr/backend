/* ==========================================================================
   LOVE ADMIN — Clientes (contas da plataforma dos noivos)
   ========================================================================== */

let CLIENTES = [];
let EVENTOS = [];
let METRICAS = new Map();

/* O último acesso mora em auth.users, que o PostgREST não expõe — vem pela
   admin_listar_contas(), a mesma função que alimenta Últimos cadastros. */
let ULTIMO_ACESSO = new Map();

/** Contas marcadas na tabela, para as ações em massa. */
let SELECIONADAS = new Set();

document.addEventListener('DOMContentLoaded', async () => {
  if (!(await window.adminReady)) return;

  const tbody = document.getElementById('tbody');
  renderLoading(tbody, 6);

  const [clientes, eventos, convidados, presentes, carteira, conversas, contas] = await Promise.all([
    safeSelect('clientes', '*'),
    safeSelect('eventos', 'id, cliente_id, titulo, tipo, data_evento, status, slug'),
    safeSelect('convidados', 'cliente_id, status, extra'),
    safeSelect('presentes', 'cliente_id, valor, status'),
    safeSelect('cliente_wallet_transactions', 'cliente_id, type, amount'),
    safeSelect('conversations', 'cliente_id'),
    supabaseClient.rpc('admin_listar_contas')
  ]);

  if (clientes.error) return renderError(tbody, 6, clientes.error);

  CLIENTES = clientes.data;
  // Sem a função no banco a coluna fica vazia, em vez de derrubar a página.
  ULTIMO_ACESSO = new Map((contas.data || []).map(c => [c.id, c.ultimo_acesso]));
  EVENTOS = eventos.data;
  METRICAS = montarMetricas({
    eventos: eventos.data,
    convidados: convidados.data,
    presentes: presentes.data,
    carteira: carteira.data,
    conversas: conversas.data
  });

  renderKpis();
  render();

  document.getElementById('busca').addEventListener('input', render);
  document.getElementById('filtro-categoria').addEventListener('change', render);

  montarOpcoesDeCategoria();
  ligarMenuDeFiltros();
  ligarSelecao();

  addHeaderAction('Exportar', exportar);
  moverControlesParaHeader();
  aplicarBuscaDaUrl(document.getElementById('busca'));
});

/** Exporta o que está na tela — com a busca já aplicada. */
function exportar() {
  const lista = filtrar().sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));

  if (!lista.length) {
    toast('Nenhum cliente para exportar com a busca atual.');
    return;
  }

  exportarCSV('clientes', [
    { titulo: 'Conta', valor: c => c.couple_name },
    { titulo: 'E-mail', valor: c => c.email },
    { titulo: 'Telefone', valor: c => c.phone },
    { titulo: 'Data de nascimento', valor: c => formatDate(c.birthday) },
    { titulo: 'CPF', valor: c => c.cpf },
    { titulo: 'Cidade', valor: c => c.city },
    { titulo: 'Evento indicado no cadastro', valor: c => c.intended_event_type_label },
    { titulo: 'Data de evento indicada no cadastro', valor: c => formatDate(c.intended_event_date) },
    { titulo: 'Eventos', valor: c => metricas(c.id).eventos },
    { titulo: 'Convidados', valor: c => metricas(c.id).convidados },
    { titulo: 'Confirmados', valor: c => metricas(c.id).confirmados },
    { titulo: 'Presentes recebidos', valor: c => metricas(c.id).presentesRecebidos },
    { titulo: 'Arrecadado', valor: c => metricas(c.id).arrecadado.toFixed(2).replace('.', ',') },
    { titulo: 'Saldo em conta', valor: c => (metricas(c.id).creditos - metricas(c.id).debitos).toFixed(2).replace('.', ',') },
    { titulo: 'Status', valor: c => (c.status || 'ativo') },
    { titulo: 'Criada em', valor: c => formatDate(c.created_at) },
    { titulo: 'Último acesso', valor: c => formatDate(ULTIMO_ACESSO.get(c.id)) }
  ], lista);
}

function montarMetricas({ eventos, convidados, presentes, carteira, conversas }) {
  const mapa = new Map();

  const bucket = (id) => {
    if (!mapa.has(id)) {
      mapa.set(id, {
        eventos: 0, convidados: 0, confirmados: 0,
        presentes: 0, presentesRecebidos: 0, arrecadado: 0,
        creditos: 0, debitos: 0, contatos: 0
      });
    }
    return mapa.get(id);
  };

  eventos.forEach(e => { bucket(e.cliente_id).eventos += 1; });

  convidados.forEach(g => {
    const b = bucket(g.cliente_id);
    const pessoas = pessoasDoConvidado(g);
    b.convidados += pessoas;
    if (g.status === 'confirmado') b.confirmados += pessoas;
  });

  presentes.forEach(p => {
    const b = bucket(p.cliente_id);
    b.presentes += 1;
    if (p.status === 'recebido') {
      b.presentesRecebidos += 1;
      b.arrecadado += Number(p.valor) || 0;
    }
  });

  carteira.forEach(t => {
    const b = bucket(t.cliente_id);
    const valor = Number(t.amount) || 0;
    if (t.type === 'credit') b.creditos += valor; else b.debitos += valor;
  });

  conversas.forEach(c => { bucket(c.cliente_id).contatos += 1; });

  return mapa;
}

function metricas(id) {
  return METRICAS.get(id) || {
    eventos: 0, convidados: 0, confirmados: 0,
    presentes: 0, presentesRecebidos: 0, arrecadado: 0,
    creditos: 0, debitos: 0, contatos: 0
  };
}

function renderKpis() {
  const totalEventos = CLIENTES.reduce((s, c) => s + metricas(c.id).eventos, 0);
  const totalConvidados = CLIENTES.reduce((s, c) => s + metricas(c.id).convidados, 0);
  const saldoTotal = CLIENTES.reduce((s, c) => {
    const m = metricas(c.id);
    return s + (m.creditos - m.debitos);
  }, 0);

  const tile = (label, value, sub) => `
    <div class="kpi"><p class="kpi-label">${label}</p><p class="kpi-value">${value}</p><p class="kpi-sub">${sub}</p></div>`;

  document.getElementById('kpi-grid').innerHTML = [
    tile('Clientes', formatNumber(CLIENTES.length), 'Contas criadas na plataforma'),
    tile('Eventos criados', formatNumber(totalEventos), 'Somando todas as contas'),
    tile('Convidados cadastrados', formatNumber(totalConvidados), 'Em todos os eventos'),
    tile('Saldo em conta', formatCurrency(saldoTotal), 'Somado de todos os clientes')
  ].join('');
}

/* O anfitrião não tem categoria — quem tem é o evento dele. Filtrar por
   "Casamento" é pedir quem criou pelo menos um casamento, que é a pergunta
   que o admin realmente faz. */
function categoriasDe(clienteId) {
  return new Set(EVENTOS.filter(e => e.cliente_id === clienteId).map(e => e.tipo));
}

function montarOpcoesDeCategoria() {
  const tipos = [...new Set(EVENTOS.map(e => e.tipo).filter(Boolean))]
    .sort((a, b) => (EVENT_TYPE_LABELS[a] || a).localeCompare(EVENT_TYPE_LABELS[b] || b));

  const select = document.getElementById('filtro-categoria');
  tipos.forEach(t => {
    const opcao = document.createElement('option');
    opcao.value = t;
    opcao.textContent = EVENT_TYPE_LABELS[t] || t;
    select.appendChild(opcao);
  });
}

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

  menu.addEventListener('click', (e) => e.stopPropagation());
  document.addEventListener('click', fechar);
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') fechar(); });

  document.getElementById('limpar-filtros').addEventListener('click', () => {
    document.getElementById('filtro-categoria').value = '';
    render();
    fechar();
  });
}

function atualizarBadgeDeFiltros() {
  const badge = document.getElementById('filtro-badge');
  if (!badge) return;
  const ativos = document.getElementById('filtro-categoria').value ? 1 : 0;
  badge.textContent = ativos;
  badge.hidden = ativos === 0;
}

function filtrar() {
  const termo = document.getElementById('busca').value.trim().toLowerCase();
  const categoria = document.getElementById('filtro-categoria').value;

  return CLIENTES.filter(c => {
    if (categoria && !categoriasDe(c.id).has(categoria)) return false;
    if (!termo) return true;
    return [c.couple_name, c.email, c.phone, c.cpf, c.city]
      .some(v => String(v || '').toLowerCase().includes(termo));
  });
}

let ORDEM_CADASTRO = null;

/** Ordem de entrada na plataforma. Ver sequenciaDeCadastro() em utils.js. */
function numeroDoCadastro(id) {
  if (!ORDEM_CADASTRO) ORDEM_CADASTRO = sequenciaDeCadastro(CLIENTES);
  return ORDEM_CADASTRO.get(id) || '—';
}

/** "agora", "há 12 min", "há 3d" — e a data quando passa de um mês. */
function ultimoAcessoDe(id) {
  const quando = ULTIMO_ACESSO.get(id);
  return quando ? formatRelative(quando) : 'nunca';
}

function render() {
  atualizarBadgeDeFiltros();
  const tbody = document.getElementById('tbody');
  const lista = filtrar().sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));


  if (!lista.length) {
    renderBarraDeSelecao();
    renderEmpty(tbody, 6, 'Nenhum cliente encontrado',
      CLIENTES.length ? 'Ajuste a busca acima.' : 'Nenhuma conta de cliente foi criada ainda.');
    return;
  }

  tbody.innerHTML = lista.map(c => {
    const m = metricas(c.id);
    const marcada = SELECIONADAS.has(c.id);
    return `
      <tr data-id="${c.id}" class="${marcada ? 'is-selecionada' : ''}">
        <td class="col-selecao">
          <input type="checkbox" data-selecionar="${c.id}" ${marcada ? 'checked' : ''}
                 aria-label="Selecionar ${escapeHtml(c.couple_name || c.email || '')}">
        </td>
        <td class="col-numero cell-muted">${escapeHtml(numeroDoCadastro(c.id))}</td>
        <td class="cell-strong">${dash(c.couple_name)}</td>
        <td class="cell-muted">${dash(c.email)}</td>
        <td>${formatNumber(m.eventos)}</td>
        <td class="cell-muted">${escapeHtml(ultimoAcessoDe(c.id))}</td>
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

  tbody.querySelectorAll('tr[data-id]').forEach(tr => {
    tr.addEventListener('click', () => abrirDetalhe(tr.dataset.id));
  });

  renderBarraDeSelecao();
}

/* ------------------------------------------------------ Seleção em massa */

function ligarSelecao() {
  document.getElementById('selecionar-todos').addEventListener('change', (e) => {
    const visiveis = filtrar().map(c => c.id);
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

  const visiveis = filtrar().map(c => c.id);
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
    texto: `${quantas} e tudo que ${ids.length === 1 ? 'ela criou' : 'elas criaram'} serão apagados: eventos, convidados e presentes. Esta ação não pode ser desfeita.`,
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
