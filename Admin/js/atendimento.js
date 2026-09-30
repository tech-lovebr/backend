/* ==========================================================================
   LOVE ADMIN — Atendimento
   Caixa de entrada única: chamados abertos no site público, por clientes
   da plataforma e por fornecedores do B2B.
   ========================================================================== */

let TICKETS = [];

document.addEventListener('DOMContentLoaded', async () => {
  if (!(await window.adminReady)) return;

  const tbody = document.getElementById('tbody');
  renderLoading(tbody, 7);

  const { data, error } = await safeSelect('tickets', '*');
  if (error) return renderError(tbody, 7, error);

  TICKETS = data;
  renderKpis();
  render();

  document.getElementById('busca').addEventListener('input', render);
  document.getElementById('filtro-status').addEventListener('change', render);
  document.getElementById('filtro-origem').addEventListener('change', render);

  moverControlesParaHeader();
  aplicarBuscaDaUrl(document.getElementById('busca'));
});

function renderKpis() {
  const conta = (status) => TICKETS.filter(t => t.status === status).length;

  const tile = (label, value, sub) => `
    <div class="kpi"><p class="kpi-label">${label}</p><p class="kpi-value">${value}</p><p class="kpi-sub">${sub}</p></div>`;

  document.getElementById('kpi-grid').innerHTML = [
    tile('Abertos', formatNumber(conta('aberto')), 'Aguardando primeira resposta'),
    tile('Em andamento', formatNumber(conta('em_andamento')), 'Já respondidos'),
    tile('Resolvidos', formatNumber(conta('resolvido')), 'Concluídos'),
    tile('Total', formatNumber(TICKETS.length), 'Todos os chamados recebidos')
  ].join('');
}

function filtrar() {
  const termo = document.getElementById('busca').value.trim().toLowerCase();
  const status = document.getElementById('filtro-status').value;
  const origem = document.getElementById('filtro-origem').value;

  return TICKETS.filter(t => {
    if (status && t.status !== status) return false;
    if (origem && t.origem !== origem) return false;
    if (!termo) return true;
    return [t.protocolo, t.nome, t.email, t.assunto, t.telefone, t.categoria]
      .some(v => String(v || '').toLowerCase().includes(termo));
  });
}

function render() {
  const tbody = document.getElementById('tbody');
  const lista = filtrar().sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));


  if (!lista.length) {
    renderEmpty(tbody, 7, 'Nenhum chamado encontrado',
      TICKETS.length
        ? 'Ajuste a busca ou os filtros acima.'
        : 'O canal de atendimento ainda não recebeu mensagens. Ele recebe tanto do site público quanto da plataforma e do B2B.');
    return;
  }

  const PRIORIDADE = { alta: 'badge-danger', normal: 'badge', baixa: 'badge' };

  tbody.innerHTML = lista.map(t => `
    <tr data-id="${t.id}">
      <td class="cell-strong">${dash(t.protocolo)}</td>
      <td>
        <span class="cell-strong">${dash(t.nome)}</span><br>
        <span class="cell-muted">${dash(t.email)}</span>
      </td>
      <td>${dash(t.assunto)}</td>
      <td class="cell-muted">${escapeHtml(ORIGEM_LABELS[t.origem] || t.origem || '—')}</td>
      <td>${badge(t.prioridade || 'normal', PRIORIDADE[t.prioridade] || 'badge')}</td>
      <td>${badge(TICKET_STATUS_LABELS[t.status] || t.status, TICKET_STATUS_BADGE[t.status])}</td>
      <td class="cell-muted">${escapeHtml(formatRelative(t.created_at))}</td>
    </tr>`).join('');

  tbody.querySelectorAll('tr[data-id]').forEach(tr => {
    tr.addEventListener('click', () => abrirChamado(tr.dataset.id));
  });
}

async function abrirChamado(id) {
  const t = TICKETS.find(x => x.id === id);
  if (!t) return;

  Drawer.open({
    title: t.assunto || 'Chamado',
    subtitle: `${t.protocolo || ''} · ${t.nome || ''}`,
    body: `<div id="chamado-conteudo"><div class="skeleton" style="width:70%"></div></div>`,
    footer: `<button type="button" class="btn btn-ghost" id="btn-fechar">Fechar</button>`
  });

  document.getElementById('btn-fechar').addEventListener('click', () => Drawer.close());

  const { data: mensagens } = await safeSelect(
    'ticket_messages',
    '*',
    q => q.eq('ticket_id', id).order('created_at', { ascending: true })
  );

  // A mensagem que abriu o chamado fica na própria linha do ticket
  // (`tickets.mensagem`) — só as respostas seguintes vão em ticket_messages.
  const conversa = [
    ...(t.mensagem
      ? [{ author_role: 'usuario', author_name: t.nome, body: t.mensagem, created_at: t.created_at }]
      : []),
    ...mensagens
  ];

  const thread = conversa.length
    ? `<div class="thread">${conversa.map(m => `
        <div class="thread-msg ${m.author_role === 'admin' ? 'from-admin' : 'from-user'}">
          <div class="bubble">${escapeHtml(m.body)}</div>
          <p class="meta">${escapeHtml(m.author_name || (m.author_role === 'admin' ? 'Equipe Love' : t.nome))} · ${escapeHtml(formatDateTime(m.created_at))}</p>
        </div>`).join('')}</div>`
    : `<p class="cell-muted" style="font-size:.8125rem">Este chamado foi aberto sem mensagem inicial.</p>`;

  document.getElementById('chamado-conteudo').innerHTML = `
    <div class="stat-row">
      <div class="stat-box"><p class="label">Origem</p><p class="value" style="font-size:.875rem">${escapeHtml(ORIGEM_LABELS[t.origem] || t.origem || '—')}</p></div>
      <div class="stat-box"><p class="label">Aberto em</p><p class="value" style="font-size:.875rem">${escapeHtml(formatDateTime(t.created_at))}</p></div>
    </div>

    <p class="drawer-section-title">Solicitante</p>
    <div style="font-size:.875rem;line-height:1.7">
      <p style="margin:0"><strong>${dash(t.nome)}</strong></p>
      <p style="margin:0" class="cell-muted">${dash(t.email)}</p>
      <p style="margin:0" class="cell-muted">${dash(t.telefone)}</p>
      ${t.categoria ? `<p style="margin:.375rem 0 0">${badge(t.categoria, 'badge-info')}</p>` : ''}
    </div>

    <p class="drawer-section-title">Conversa</p>
    ${thread}

    <p class="drawer-section-title">Responder</p>
    <textarea class="field-textarea" id="resposta" placeholder="Escreva a resposta que será enviada ao solicitante..."></textarea>
    <button type="button" class="btn btn-primary" id="btn-responder" style="margin-top:.625rem">Enviar resposta</button>

    <p class="drawer-section-title">Gerenciar chamado</p>
    <div class="field-row">
      <label class="field">
        <span class="field-label">Status</span>
        <select class="field-select" id="campo-status">
          ${Object.entries(TICKET_STATUS_LABELS)
            .map(([v, l]) => `<option value="${v}" ${t.status === v ? 'selected' : ''}>${l}</option>`).join('')}
        </select>
      </label>
      <label class="field">
        <span class="field-label">Prioridade</span>
        <select class="field-select" id="campo-prioridade">
          ${['baixa', 'normal', 'alta']
            .map(v => `<option value="${v}" ${(t.prioridade || 'normal') === v ? 'selected' : ''}>${v[0].toUpperCase() + v.slice(1)}</option>`).join('')}
        </select>
      </label>
    </div>
    <button type="button" class="btn btn-ghost" id="btn-atualizar">Atualizar chamado</button>`;

  document.getElementById('btn-responder').addEventListener('click', () => responder(id));
  document.getElementById('btn-atualizar').addEventListener('click', () => atualizar(id));
}

async function responder(id) {
  const campo = document.getElementById('resposta');
  const body = campo.value.trim();
  const botao = document.getElementById('btn-responder');

  if (!body) {
    toast('Escreva a resposta antes de enviar.');
    return;
  }

  botao.disabled = true;

  const { error } = await supabaseClient.from('ticket_messages').insert({
    ticket_id: id,
    author_role: 'admin',
    author_id: window.adminUser.id,
    author_name: window.adminUser.name || 'Equipe Love',
    body
  });

  if (error) {
    botao.disabled = false;
    toast(`Não foi possível enviar: ${error.message}`);
    return;
  }

  // Responder um chamado aberto passa ele automaticamente para "em andamento".
  const ticket = TICKETS.find(t => t.id === id);
  if (ticket && ticket.status === 'aberto') {
    await supabaseClient.from('tickets')
      .update({ status: 'em_andamento', updated_at: new Date().toISOString() })
      .eq('id', id);
    ticket.status = 'em_andamento';
    renderKpis();
    render();
  }

  toast('Resposta enviada.');
  abrirChamado(id);
}

async function atualizar(id) {
  const status = document.getElementById('campo-status').value;
  const prioridade = document.getElementById('campo-prioridade').value;
  const botao = document.getElementById('btn-atualizar');

  botao.disabled = true;
  const { error } = await supabaseClient.from('tickets')
    .update({ status, prioridade, updated_at: new Date().toISOString() })
    .eq('id', id);
  botao.disabled = false;

  if (error) {
    toast(`Não foi possível atualizar: ${error.message}`);
    return;
  }

  Object.assign(TICKETS.find(t => t.id === id), { status, prioridade });
  renderKpis();
  render();
  Drawer.close();
  toast('Chamado atualizado.');
}
