/* ==========================================================================
   LOVE ADMIN — Clientes (contas da plataforma dos noivos)
   ========================================================================== */

let CLIENTES = [];
let EVENTOS = [];
let METRICAS = new Map();

document.addEventListener('DOMContentLoaded', async () => {
  if (!(await window.adminReady)) return;

  const tbody = document.getElementById('tbody');
  renderLoading(tbody, 8);

  const [clientes, eventos, convidados, presentes, carteira, conversas] = await Promise.all([
    safeSelect('clientes', '*'),
    safeSelect('eventos', 'id, cliente_id, titulo, tipo, data_evento, status, slug'),
    safeSelect('convidados', 'cliente_id, status'),
    safeSelect('presentes', 'cliente_id, valor, status'),
    safeSelect('cliente_wallet_transactions', 'cliente_id, type, amount'),
    safeSelect('conversations', 'cliente_id')
  ]);

  if (clientes.error) return renderError(tbody, 8, clientes.error);

  CLIENTES = clientes.data;
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
    { titulo: 'Criada em', valor: c => formatDate(c.created_at) }
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
    b.convidados += 1;
    if (g.status === 'confirmado') b.confirmados += 1;
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

function filtrar() {
  const termo = document.getElementById('busca').value.trim().toLowerCase();
  if (!termo) return CLIENTES.slice();
  return CLIENTES.filter(c =>
    [c.couple_name, c.email, c.phone, c.cpf, c.city]
      .some(v => String(v || '').toLowerCase().includes(termo))
  );
}

let ORDEM_CADASTRO = null;

/**
 * Número do cadastro: a ordem de entrada na plataforma, 1 para o mais antigo.
 * Vem da lista inteira, não da filtrada — buscar ou reordenar não renumera
 * ninguém, que é o que diferencia um identificador de uma posição na tela.
 */
function numeroDoCadastro(id) {
  if (!ORDEM_CADASTRO) {
    ORDEM_CADASTRO = new Map(
      CLIENTES
        .slice()
        .sort((a, b) => new Date(a.created_at || 0) - new Date(b.created_at || 0))
        .map((c, i) => [c.id, i + 1])
    );
  }
  return ORDEM_CADASTRO.get(id) || 0;
}


function render() {
  const tbody = document.getElementById('tbody');
  const lista = filtrar().sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));


  if (!lista.length) {
    renderEmpty(tbody, 6, 'Nenhum cliente encontrado',
      CLIENTES.length ? 'Ajuste a busca acima.' : 'Nenhuma conta de cliente foi criada ainda.');
    return;
  }

  tbody.innerHTML = lista.map(c => {
    const m = metricas(c.id);
    return `
      <tr data-id="${c.id}">
        <td class="col-numero cell-muted">${formatNumber(numeroDoCadastro(c.id))}</td>
        <td class="cell-strong">${dash(c.couple_name)}</td>
        <td class="cell-muted">${dash(c.email)}</td>
        <td>${formatNumber(m.eventos)}</td>
        <td class="cell-strong">${formatCurrency(m.creditos - m.debitos)}</td>
        <td class="cell-muted">${escapeHtml(formatDate(c.created_at))}</td>
      </tr>`;
  }).join('');

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
