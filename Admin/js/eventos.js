/* ==========================================================================
   LOVE ADMIN — Eventos (comemorações criadas na plataforma dos noivos)
   ========================================================================== */

let EVENTOS = [];
let SELECIONADAS = new Set();
let CLIENTES = new Map();
let METRICAS = new Map();

document.addEventListener('DOMContentLoaded', async () => {
  if (!(await window.adminReady)) return;

  const tbody = document.getElementById('tbody');
  renderLoading(tbody, 11);

  const [eventos, clientes, convidados, presentes] = await Promise.all([
    safeSelect('eventos', '*'),
    safeSelect('clientes', 'id, couple_name, email'),
    safeSelect('convidados', 'evento_id, status, tipo, extra'),
    safeSelect('presentes', 'evento_id, valor, status')
  ]);

  if (eventos.error) return renderError(tbody, 11, eventos.error);

  EVENTOS = eventos.data;
  CLIENTES = new Map(clientes.data.map(c => [c.id, c]));
  METRICAS = montarMetricas(convidados.data, presentes.data);

  renderKpis();
  render();
  ligarSelecao();

  document.getElementById('busca').addEventListener('input', render);
  document.getElementById('filtro-tipo').addEventListener('change', render);
  document.getElementById('filtro-situacao').addEventListener('change', render);

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
    const pessoas = pessoasDoConvidado(g);
    const criancas = Math.min(criancasDoConvidado(g), pessoas);
    b.convidados += pessoas;
    if (g.status === 'confirmado') b.confirmados += pessoas;
    else if (g.status === 'recusado') b.recusados += pessoas;
    else b.pendentes += pessoas;
    b.criancas += criancas;
    b.adultos += pessoas - criancas;
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
  const situacao = document.getElementById('filtro-situacao').value;

  return EVENTOS.filter(e => {
    if (tipo && e.tipo !== tipo) return false;
    if (situacao === 'excluidos' && !e.deleted_at) return false;
    if (situacao === 'ativos' && e.deleted_at) return false;
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
    renderBarraDeSelecao();
    renderEmpty(tbody, 11, 'Nenhum evento encontrado',
      EVENTOS.length
        ? 'Ajuste a busca ou o filtro de categoria.'
        : 'Nenhuma comemoração foi criada ainda. Os eventos aparecem aqui assim que a plataforma dos noivos começar a gravá-los no banco.');
    return;
  }

  tbody.innerHTML = lista.map(e => {
    const m = metricas(e.id);
    const cliente = CLIENTES.get(e.cliente_id);
    const marcada = SELECIONADAS.has(e.id);
    return `
      <tr data-id="${e.id}" class="${marcada ? 'is-selecionada' : ''}">
        <td class="col-selecao">
          <input type="checkbox" data-selecionar="${e.id}" ${marcada ? 'checked' : ''} aria-label="Selecionar ${escapeHtml(e.titulo || 'evento')}">
        </td>
        <td class="cell-strong">${dash(e.titulo)}</td>
        <td>${badge(EVENT_TYPE_LABELS[e.tipo] || e.tipo || '—', e.tipo === 'wedding' ? 'badge-info' : 'badge-success')}</td>
        <td class="cell-muted">${dash(cliente?.couple_name || e.host_name)}</td>
        <td class="cell-muted">${escapeHtml(formatDate(e.data_evento))}</td>
        <td>${formatNumber(m.convidados)}</td>
        <td>${formatNumber(m.confirmados)}</td>
        <td>${formatNumber(m.recebidos)}/${formatNumber(m.presentes)}</td>
        <td class="cell-strong">${formatCurrency(m.arrecadado)}</td>
        <td>${e.deleted_at
          ? `<span class="valor-bloqueado">${escapeHtml(rotuloEventoExcluido(e))}</span>`
          : badge(e.status || 'ativo', e.status === 'ativo' ? 'badge-success' : e.status === 'encerrado' ? 'badge' : 'badge-warning')}</td>
        <td class="col-acoes">
          ${e.deleted_at ? `<button type="button" class="btn btn-ghost btn-sm" data-restaurar="${e.id}">Restaurar</button>` : ''}
          ${botaoVerMais(e.id)}
        </td>
      </tr>`;
  }).join('');

  // A linha não abre o drawer (dá para marcar as caixinhas); quem abre são
  // as três bolinhas no fim.
  ligarAcoesDaLinha(tbody, abrirDetalhe);

  tbody.querySelectorAll('[data-restaurar]').forEach(btn => {
    btn.addEventListener('click', () => restaurarEvento(EVENTOS.find(ev => ev.id === btn.dataset.restaurar), render));
  });

  tbody.querySelectorAll('[data-selecionar]').forEach(caixa => {
    caixa.addEventListener('change', () => {
      if (caixa.checked) SELECIONADAS.add(caixa.dataset.selecionar);
      else SELECIONADAS.delete(caixa.dataset.selecionar);
      caixa.closest('tr').classList.toggle('is-selecionada', caixa.checked);
      renderBarraDeSelecao();
    });
  });

  renderBarraDeSelecao();
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
      ${e.deleted_at ? `<p class="aviso-excluido">${escapeHtml(rotuloEventoExcluido(e))}. Restaure para o evento voltar à conta do anfitrião e o site voltar ao ar.</p>` : ''}
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
      ${e.deleted_at ? '<button type="button" class="btn btn-neutro" id="btn-restaurar">Restaurar evento</button>' : ''}
      <button type="button" class="btn btn-ghost" id="btn-cancelar">Fechar</button>
      <button type="button" class="btn btn-primary" id="btn-salvar">Salvar alterações</button>`
  });

  document.getElementById('btn-cancelar').addEventListener('click', () => Drawer.close());
  document.getElementById('btn-restaurar')?.addEventListener('click', () =>
    restaurarEvento(e, () => { render(); abrirDetalhe(id); }));
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

/* ------------------------------------------------------ Seleção em massa
   Igual a Anfitriões › Cadastros: marcar e excluir de uma vez. Excluir um
   evento apaga junto convidados e presentes dele (cascade no banco). */

function ligarSelecao() {
  document.getElementById('selecionar-todos').addEventListener('change', (e) => {
    const visiveis = filtrar().map(ev => ev.id);
    if (e.target.checked) visiveis.forEach(id => SELECIONADAS.add(id));
    else visiveis.forEach(id => SELECIONADAS.delete(id));
    render();
  });

  document.getElementById('btn-limpar-selecao').addEventListener('click', () => {
    SELECIONADAS.clear();
    render();
  });

  document.getElementById('btn-excluir-selecao').addEventListener('click', perguntarExclusao);
}

function renderBarraDeSelecao() {
  const total = SELECIONADAS.size;
  document.getElementById('barra-selecao').hidden = total === 0;
  document.getElementById('selecao-contagem').textContent =
    `${formatNumber(total)} ${total === 1 ? 'evento selecionado' : 'eventos selecionados'}`;

  const visiveis = filtrar().map(ev => ev.id);
  const todos = document.getElementById('selecionar-todos');
  todos.checked = visiveis.length > 0 && visiveis.every(id => SELECIONADAS.has(id));
  todos.indeterminate = !todos.checked && visiveis.some(id => SELECIONADAS.has(id));
}

const qtdEventos = n => `${formatNumber(n)} ${n === 1 ? 'evento' : 'eventos'}`;

function perguntarExclusao() {
  const ids = [...SELECIONADAS];
  Modal.abrir({
    titulo: `Deseja excluir ${qtdEventos(ids.length)}?`,
    texto: `${ids.length === 1 ? 'O evento' : 'Os eventos'} e tudo que está dentro — convidados, presentes e o site do convite — serão apagados. Esta ação não pode ser desfeita.`,
    acoes: [
      { rotulo: 'Excluir', classe: 'btn-danger', aoClicar: () => confirmarExclusao(ids) },
      { rotulo: 'Cancelar', classe: 'btn-ghost', aoClicar: () => Modal.fechar() }
    ]
  });
}

function confirmarExclusao(ids) {
  Modal.abrir({
    titulo: 'Tem certeza?',
    texto: `${qtdEventos(ids.length)} ${ids.length === 1 ? 'será apagado' : 'serão apagados'} para sempre.`,
    acoes: [
      { rotulo: 'Sim', classe: 'btn-danger', aoClicar: () => excluirEventos(ids) },
      { rotulo: 'Não', classe: 'btn-ghost', aoClicar: () => Modal.fechar() }
    ]
  });
}

async function excluirEventos(ids) {
  Modal.ocupado(true);
  const { data, error } = await supabaseClient.from('eventos').delete().in('id', ids).select('id');
  Modal.ocupado(false);
  Modal.fechar();

  if (error) return toast(`Não foi possível excluir: ${error.message}`);

  const apagados = new Set((data || []).map(r => r.id));
  if (!apagados.size) return toast('Nenhum evento foi excluído.');

  EVENTOS = EVENTOS.filter(ev => !apagados.has(ev.id));
  SELECIONADAS.clear();
  renderKpis();
  render();
  toast(apagados.size < ids.length
    ? `${qtdEventos(apagados.size)} excluído(s); ${formatNumber(ids.length - apagados.size)} não puderam ser excluídos.`
    : `${qtdEventos(apagados.size)} ${apagados.size === 1 ? 'excluído' : 'excluídos'}.`);
}
