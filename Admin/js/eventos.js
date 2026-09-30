/* ==========================================================================
   LOVE ADMIN — Eventos (comemorações criadas na plataforma dos noivos)
   ========================================================================== */

let EVENTOS = [];
let CLIENTES = new Map();
let METRICAS = new Map();

document.addEventListener('DOMContentLoaded', async () => {
  if (!(await window.adminReady)) return;

  const tbody = document.getElementById('tbody');
  renderLoading(tbody, 9);

  const [eventos, clientes, convidados, presentes] = await Promise.all([
    safeSelect('eventos', '*'),
    safeSelect('clientes', 'id, couple_name, email'),
    safeSelect('convidados', 'evento_id, status, tipo'),
    safeSelect('presentes', 'evento_id, valor, status')
  ]);

  if (eventos.error) return renderError(tbody, 9, eventos.error);

  EVENTOS = eventos.data;
  CLIENTES = new Map(clientes.data.map(c => [c.id, c]));
  METRICAS = montarMetricas(convidados.data, presentes.data);

  renderKpis();
  render();

  document.getElementById('busca').addEventListener('input', render);
  document.getElementById('filtro-tipo').addEventListener('change', render);

  moverControlesParaHeader();
  aplicarBuscaDaUrl(document.getElementById('busca'));
});

function montarMetricas(convidados, presentes) {
  const mapa = new Map();

  const bucket = (id) => {
    if (!mapa.has(id)) {
      mapa.set(id, {
        convidados: 0, confirmados: 0, recusados: 0, pendentes: 0,
        adultos: 0, criancas: 0,
        presentes: 0, recebidos: 0, arrecadado: 0
      });
    }
    return mapa.get(id);
  };

  convidados.forEach(g => {
    const b = bucket(g.evento_id);
    b.convidados += 1;
    if (g.status === 'confirmado') b.confirmados += 1;
    else if (g.status === 'recusado') b.recusados += 1;
    else b.pendentes += 1;
    if (g.tipo === 'crianca') b.criancas += 1; else b.adultos += 1;
  });

  presentes.forEach(p => {
    const b = bucket(p.evento_id);
    b.presentes += 1;
    if (p.status === 'recebido') {
      b.recebidos += 1;
      b.arrecadado += Number(p.valor) || 0;
    }
  });

  return mapa;
}

function metricas(id) {
  return METRICAS.get(id) || {
    convidados: 0, confirmados: 0, recusados: 0, pendentes: 0,
    adultos: 0, criancas: 0, presentes: 0, recebidos: 0, arrecadado: 0
  };
}

function renderKpis() {
  const total = EVENTOS.length;
  const casamentos = EVENTOS.filter(e => e.tipo === 'wedding').length;
  const chas = EVENTOS.filter(e => e.tipo === 'baby').length;
  const arrecadado = EVENTOS.reduce((s, e) => s + metricas(e.id).arrecadado, 0);

  const tile = (label, value, sub) => `
    <div class="kpi"><p class="kpi-label">${label}</p><p class="kpi-value">${value}</p><p class="kpi-sub">${sub}</p></div>`;

  document.getElementById('kpi-grid').innerHTML = [
    tile('Eventos', formatNumber(total), `${EVENTOS.filter(e => e.status === 'ativo').length} ativos`),
    tile('Casamentos', formatNumber(casamentos), total ? `${Math.round((casamentos / total) * 100)}% do total` : '—'),
    tile('Chás de bebê', formatNumber(chas), total ? `${Math.round((chas / total) * 100)}% do total` : '—'),
    tile('Total arrecadado', formatCurrency(arrecadado), 'Em presentes recebidos')
  ].join('');
}

function filtrar() {
  const termo = document.getElementById('busca').value.trim().toLowerCase();
  const tipo = document.getElementById('filtro-tipo').value;

  return EVENTOS.filter(e => {
    if (tipo && e.tipo !== tipo) return false;
    if (!termo) return true;
    const cliente = CLIENTES.get(e.cliente_id);
    return [e.titulo, e.host_name, e.slug, e.theme, cliente?.couple_name, cliente?.email]
      .some(v => String(v || '').toLowerCase().includes(termo));
  });
}

function render() {
  const tbody = document.getElementById('tbody');
  const lista = filtrar().sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));


  if (!lista.length) {
    renderEmpty(tbody, 9, 'Nenhum evento encontrado',
      EVENTOS.length
        ? 'Ajuste a busca ou o filtro de categoria.'
        : 'Nenhuma comemoração foi criada ainda. Os eventos aparecem aqui assim que a plataforma dos noivos começar a gravá-los no banco.');
    return;
  }

  tbody.innerHTML = lista.map(e => {
    const m = metricas(e.id);
    const cliente = CLIENTES.get(e.cliente_id);
    return `
      <tr data-id="${e.id}">
        <td class="cell-strong">${dash(e.titulo)}</td>
        <td>${badge(EVENT_TYPE_LABELS[e.tipo] || e.tipo || '—', e.tipo === 'wedding' ? 'badge-info' : 'badge-success')}</td>
        <td class="cell-muted">${dash(cliente?.couple_name || e.host_name)}</td>
        <td class="cell-muted">${escapeHtml(formatDate(e.data_evento))}</td>
        <td>${formatNumber(m.convidados)}</td>
        <td>${formatNumber(m.confirmados)}</td>
        <td>${formatNumber(m.recebidos)}/${formatNumber(m.presentes)}</td>
        <td class="cell-strong">${formatCurrency(m.arrecadado)}</td>
        <td>${badge(e.status || 'ativo', e.status === 'ativo' ? 'badge-success' : e.status === 'encerrado' ? 'badge' : 'badge-warning')}</td>
      </tr>`;
  }).join('');

  tbody.querySelectorAll('tr[data-id]').forEach(tr => {
    tr.addEventListener('click', () => abrirDetalhe(tr.dataset.id));
  });
}

function abrirDetalhe(id) {
  const e = EVENTOS.find(x => x.id === id);
  if (!e) return;
  const m = metricas(id);
  const cliente = CLIENTES.get(e.cliente_id);

  const campo = (name, label, value, type = 'text') => `
    <label class="field">
      <span class="field-label">${label}</span>
      <input class="field-input" name="${name}" type="${type}" value="${escapeHtml(value ?? '')}">
    </label>`;

  Drawer.open({
    title: e.titulo || 'Evento',
    subtitle: cliente ? `${cliente.couple_name} · ${cliente.email}` : (e.host_name || ''),
    body: `
      <div class="stat-row">
        <div class="stat-box"><p class="label">Convidados</p><p class="value">${formatNumber(m.convidados)}</p></div>
        <div class="stat-box"><p class="label">Confirmados</p><p class="value">${formatNumber(m.confirmados)}</p></div>
        <div class="stat-box"><p class="label">Pendentes</p><p class="value">${formatNumber(m.pendentes)}</p></div>
      </div>
      <div class="stat-row">
        <div class="stat-box"><p class="label">Adultos</p><p class="value">${formatNumber(m.adultos)}</p></div>
        <div class="stat-box"><p class="label">Crianças</p><p class="value">${formatNumber(m.criancas)}</p></div>
        <div class="stat-box"><p class="label">Recusaram</p><p class="value">${formatNumber(m.recusados)}</p></div>
      </div>
      <div class="stat-row">
        <div class="stat-box"><p class="label">Presentes</p><p class="value">${formatNumber(m.recebidos)}/${formatNumber(m.presentes)}</p></div>
        <div class="stat-box"><p class="label">Arrecadado</p><p class="value">${formatCurrency(m.arrecadado)}</p></div>
      </div>

      <form id="form-evento">
        <p class="drawer-section-title">Dados do evento</p>
        ${campo('titulo', 'Título', e.titulo)}
        ${campo('host_name', 'Anfitriões', e.host_name)}
        <div class="field-row">
          <label class="field">
            <span class="field-label">Categoria</span>
            <select class="field-select" name="tipo">
              ${Object.entries(EVENT_TYPE_LABELS)
                .map(([v, l]) => `<option value="${v}" ${e.tipo === v ? 'selected' : ''}>${l}</option>`).join('')}
            </select>
          </label>
          ${campo('data_evento', 'Data', e.data_evento, 'date')}
        </div>
        <div class="field-row">
          ${campo('slug', 'Link público (slug)', e.slug)}
          ${campo('theme', 'Tema', e.theme)}
        </div>
        <label class="field">
          <span class="field-label">Status</span>
          <select class="field-select" name="status">
            <option value="rascunho" ${e.status === 'rascunho' ? 'selected' : ''}>Rascunho</option>
            <option value="ativo" ${(e.status || 'ativo') === 'ativo' ? 'selected' : ''}>Ativo</option>
            <option value="encerrado" ${e.status === 'encerrado' ? 'selected' : ''}>Encerrado</option>
          </select>
        </label>

        <p class="cell-muted" style="font-size:.75rem;margin-top:1rem">
          Criado em ${escapeHtml(formatDateTime(e.created_at))} · ID ${escapeHtml(e.id)}
        </p>
      </form>`,
    footer: `
      <button type="button" class="btn btn-ghost" id="btn-cancelar">Fechar</button>
      <button type="button" class="btn btn-primary" id="btn-salvar">Salvar alterações</button>`
  });

  document.getElementById('btn-cancelar').addEventListener('click', () => Drawer.close());
  document.getElementById('btn-salvar').addEventListener('click', () => salvar(id));
}

async function salvar(id) {
  const form = document.getElementById('form-evento');
  const payload = Object.fromEntries(
    [...new FormData(form).entries()].map(([k, v]) => [k, String(v).trim() || null])
  );

  if (!payload.titulo) {
    toast('O título do evento não pode ficar vazio.');
    return;
  }

  Drawer.setFooterBusy(true);
  const { error } = await supabaseClient.from('eventos').update(payload).eq('id', id);
  Drawer.setFooterBusy(false);

  if (error) {
    toast(`Não foi possível salvar: ${error.message}`);
    return;
  }

  Object.assign(EVENTOS.find(e => e.id === id), payload);
  render();
  renderKpis();
  Drawer.close();
  toast('Evento atualizado.');
}
