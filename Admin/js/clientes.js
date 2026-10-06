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

function render() {
  const tbody = document.getElementById('tbody');
  const lista = filtrar().sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));


  if (!lista.length) {
    renderEmpty(tbody, 8, 'Nenhum cliente encontrado',
      CLIENTES.length ? 'Ajuste a busca acima.' : 'Nenhuma conta de cliente foi criada ainda.');
    return;
  }

  tbody.innerHTML = lista.map(c => {
    const m = metricas(c.id);
    return `
      <tr data-id="${c.id}">
        <td class="cell-strong">${dash(c.couple_name)}</td>
        <td class="cell-muted">${dash(c.email)}</td>
        <td class="cell-muted">${dash(c.phone)}</td>
        <td>${formatNumber(m.eventos)}</td>
        <td>${formatNumber(m.convidados)} <span class="cell-muted">(${formatNumber(m.confirmados)} conf.)</span></td>
        <td>${formatNumber(m.presentesRecebidos)}</td>
        <td class="cell-strong">${formatCurrency(m.creditos - m.debitos)}</td>
        <td class="cell-muted">${escapeHtml(formatDate(c.created_at))}</td>
      </tr>`;
  }).join('');

  tbody.querySelectorAll('tr[data-id]').forEach(tr => {
    tr.addEventListener('click', () => abrirDetalhe(tr.dataset.id));
  });
}

function abrirDetalhe(id) {
  const c = CLIENTES.find(x => x.id === id);
  if (!c) return;
  const m = metricas(id);
  const eventosDoCliente = EVENTOS.filter(e => e.cliente_id === id);

  const campo = (name, label, value, type = 'text') => `
    <label class="field">
      <span class="field-label">${label}</span>
      <input class="field-input" name="${name}" type="${type}" value="${escapeHtml(value ?? '')}">
    </label>`;

  const listaEventos = eventosDoCliente.length
    ? `<div style="display:flex;flex-direction:column;gap:.5rem">${eventosDoCliente.map(e => `
        <div style="display:flex;align-items:center;gap:.75rem;padding:.75rem;background:var(--bg-muted);border-radius:var(--radius-card)">
          <div style="flex:1;min-width:0">
            <p style="font-size:.875rem;font-weight:600;margin:0">${escapeHtml(e.titulo || 'Sem título')}</p>
            <p style="font-size:.75rem;color:var(--text-muted);margin:.125rem 0 0">
              ${escapeHtml(EVENT_TYPE_LABELS[e.tipo] || e.tipo || '—')} · ${escapeHtml(formatDate(e.data_evento))}
            </p>
          </div>
          ${badge(e.status || 'ativo', e.status === 'ativo' ? 'badge-success' : '')}
        </div>`).join('')}</div>`
    : `<p class="cell-muted" style="font-size:.8125rem">Este cliente ainda não criou nenhum evento.</p>`;

  const intencaoCadastro = (c.intended_event_type_label || c.intended_event_date)
    ? `<p class="cell-muted" style="font-size:.8125rem;margin-top:.5rem">
        Indicou no cadastro: ${escapeHtml(c.intended_event_type_label || '—')}
        ${c.intended_event_date ? ` · data pretendida ${escapeHtml(formatDate(c.intended_event_date))}` : ''}
      </p>`
    : '';

  Drawer.open({
    title: c.couple_name || 'Cliente',
    subtitle: c.email || '',
    body: `
      <div class="stat-row">
        <div class="stat-box"><p class="label">Saldo</p><p class="value">${formatCurrency(m.creditos - m.debitos)}</p></div>
        <div class="stat-box"><p class="label">Arrecadado</p><p class="value">${formatCurrency(m.arrecadado)}</p></div>
        <div class="stat-box"><p class="label">Presentes</p><p class="value">${formatNumber(m.presentesRecebidos)}</p></div>
      </div>
      <div class="stat-row">
        <div class="stat-box"><p class="label">Eventos</p><p class="value">${formatNumber(m.eventos)}</p></div>
        <div class="stat-box"><p class="label">Convidados</p><p class="value">${formatNumber(m.convidados)}</p></div>
        <div class="stat-box"><p class="label">Fornecedores</p><p class="value">${formatNumber(m.contatos)}</p></div>
      </div>

      <form id="form-cliente">
        <p class="drawer-section-title">Cadastro</p>
        ${campo('couple_name', 'Nome do casal / responsável', c.couple_name)}
        ${campo('email', 'E-mail', c.email, 'email')}
        <div class="field-row">
          ${campo('phone', 'Telefone', c.phone)}
          ${campo('birthday', 'Data de nascimento', c.birthday, 'date')}
        </div>
        <div class="field-row">
          ${campo('cpf', 'CPF', c.cpf)}
          ${campo('city', 'Cidade', c.city)}
        </div>
        <label class="field">
          <span class="field-label">Status</span>
          <select class="field-select" name="status">
            <option value="ativo" ${(c.status || 'ativo') === 'ativo' ? 'selected' : ''}>Ativo</option>
            <option value="suspenso" ${c.status === 'suspenso' ? 'selected' : ''}>Suspenso</option>
          </select>
        </label>
      </form>
      ${intencaoCadastro}

      <p class="drawer-section-title">Eventos do cliente</p>
      ${listaEventos}

      <p class="cell-muted" style="font-size:.75rem;margin-top:1.5rem">
        Conta criada em ${escapeHtml(formatDateTime(c.created_at))} · ID ${escapeHtml(c.id)}
      </p>`,
    footer: `
      <button type="button" class="btn btn-ghost" id="btn-cancelar">Fechar</button>
      <button type="button" class="btn btn-primary" id="btn-salvar">Salvar alterações</button>`
  });

  document.getElementById('btn-cancelar').addEventListener('click', () => Drawer.close());
  document.getElementById('btn-salvar').addEventListener('click', () => salvar(id));
}

async function salvar(id) {
  const form = document.getElementById('form-cliente');
  const payload = Object.fromEntries(
    [...new FormData(form).entries()].map(([k, v]) => [k, String(v).trim() || null])
  );

  if (!payload.couple_name) {
    toast('O nome não pode ficar vazio.');
    return;
  }

  Drawer.setFooterBusy(true);
  const { error } = await supabaseClient.from('clientes').update(payload).eq('id', id);
  Drawer.setFooterBusy(false);

  if (error) {
    toast(`Não foi possível salvar: ${error.message}`);
    return;
  }

  Object.assign(CLIENTES.find(c => c.id === id), payload);
  render();
  renderKpis();
  Drawer.close();
  toast('Cliente atualizado.');
}
