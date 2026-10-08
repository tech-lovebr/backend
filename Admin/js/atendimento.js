/* ==========================================================================
   LOVE ADMIN — Atendimento
   Caixa de entrada única: chamados abertos no site público, por clientes
   da plataforma e por fornecedores do B2B.
   ========================================================================== */

let TICKETS = [];

document.addEventListener('DOMContentLoaded', async () => {
  if (!(await window.adminReady)) return;

  const tbody = document.getElementById('tbody');
  renderLoading(tbody, 5);

  const { data, error } = await safeSelect('tickets', '*');
  if (error) return renderError(tbody, 5, error);

  TICKETS = data;
  renderKpis();
  render();

  document.getElementById('busca').addEventListener('input', render);
  document.getElementById('filtro-status').addEventListener('change', render);
  ligarAbasDeOrigem();

  moverControlesParaHeader();
  aplicarBuscaDaUrl(document.getElementById('busca'));
});

/* A origem virou aba em vez de select: são três destinos fixos e o admin
   alterna entre eles o tempo todo — um clique vale mais que abrir uma lista. */
let ORIGEM_ATUAL = '';

function ligarAbasDeOrigem() {
  document.querySelectorAll('#abas-origem [data-origem]').forEach(btn => {
    btn.addEventListener('click', () => {
      ORIGEM_ATUAL = btn.dataset.origem;
      document.querySelectorAll('#abas-origem [data-origem]')
        .forEach(b => b.classList.toggle('is-active', b === btn));
      render();
    });
  });
}

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

  return TICKETS.filter(t => {
    if (status && t.status !== status) return false;
    if (ORIGEM_ATUAL && t.origem !== ORIGEM_ATUAL) return false;
    if (!termo) return true;
    return [t.protocolo, t.nome, t.email, t.assunto, t.telefone, t.categoria]
      .some(v => String(v || '').toLowerCase().includes(termo));
  });
}

function render() {
  const tbody = document.getElementById('tbody');
  const lista = filtrar().sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));


  if (!lista.length) {
    renderEmpty(tbody, 5, 'Nenhum chamado encontrado',
      TICKETS.length
        ? 'Ajuste a busca ou os filtros acima.'
        : 'O canal de atendimento ainda não recebeu mensagens. Ele recebe tanto do site público quanto da plataforma e do B2B.');
    return;
  }

  tbody.innerHTML = lista.map(t => `
    <tr data-id="${t.id}">
      <td class="cell-strong">${dash(t.protocolo)}</td>
      <td>
        <span class="cell-strong">${dash(t.nome)}</span><br>
        <span class="cell-muted">${dash(t.email)}</span>
      </td>
      <td>${dash(t.assunto)}</td>
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

  const dado = (rotulo, valor) => `
    <div class="dados-linha">
      <span class="rotulo">${escapeHtml(rotulo)}</span>
      <span class="valor">${valor}</span>
    </div>`;

  const identificacao = `
    <div class="lista-dados">
      ${dado('Origem', escapeHtml(ORIGEM_LABELS[t.origem] || t.origem || '—'))}
      ${dado('Aberto em', escapeHtml(formatDateTime(t.created_at)))}
      ${dado('Status', badge(TICKET_STATUS_LABELS[t.status] || t.status, TICKET_STATUS_BADGE[t.status]))}
      ${dado('Solicitante', escapeHtml(t.nome || '—'))}
      ${dado('E-mail', escapeHtml(t.email || '—'))}
      ${t.telefone ? dado('Telefone', escapeHtml(t.telefone)) : ''}
      ${t.categoria ? dado('Categoria', escapeHtml(t.categoria)) : ''}
    </div>`;

  document.getElementById('chamado-conteudo').innerHTML = ehPedidoDeAlteracao(t)
    ? identificacao + corpoDaPendencia(t)
    : identificacao + `
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

  document.getElementById('btn-responder')?.addEventListener('click', () => responder(id));
  document.getElementById('btn-atualizar')?.addEventListener('click', () => atualizar(id));
  document.getElementById('btn-liberar')?.addEventListener('click', () => liberarAlteracao(t));
  document.getElementById('btn-cancelar-pedido')?.addEventListener('click', () => recusarAlteracao(t));
}

/* --------------------------------------------- Pedido de alteração de dado

   O fornecedor não consegue mudar nome da empresa nem CNPJ sozinho: os dois
   travam no B2B depois de preenchidos. Quando ele pede a mudança, o chamado
   não é uma conversa — é uma decisão de uma linha. Por isso este drawer
   troca "Conversa" e "Responder" por "Pendência" com duas saídas.
   ------------------------------------------------------------------------ */

const CAMPOS_LIBERAVEIS = { company: 'Nome da empresa', documento: 'CNPJ / CPF' };

function ehPedidoDeAlteracao(t) {
  return t.origem === 'fornecedor'
    && (t.assunto || '').trim().toLowerCase() === 'alteração de dado';
}

/**
 * O campo e o valor atual vêm de `tickets.extra`. Chamados abertos antes de
 * isso existir só têm a frase da mensagem — daí o resgate pelo texto, para
 * que pedidos antigos não fiquem sem botão.
 */
function pedidoDoChamado(t) {
  const extra = t.extra || {};
  if (extra.campo) {
    return {
      campo: extra.campo,
      label: extra.campo_label || CAMPOS_LIBERAVEIS[extra.campo] || extra.campo,
      valorAtual: extra.valor_atual || null
    };
  }

  const texto = t.mensagem || '';
  const nome = texto.match(/campo "([^"]+)"/i)?.[1] || null;
  const valor = texto.match(/valor atual:\s*([^)]+)\)/i)?.[1]?.trim() || null;

  return {
    campo: /cnpj|cpf|documento/i.test(nome || '') ? 'documento' : 'company',
    label: nome || 'Nome da empresa',
    valorAtual: valor
  };
}

function corpoDaPendencia(t) {
  const pedido = pedidoDoChamado(t);
  const resolvido = t.status === 'resolvido' || t.status === 'fechado';

  const dado = (rotulo, valor) => `
    <div class="dados-linha">
      <span class="rotulo">${escapeHtml(rotulo)}</span>
      <span class="valor">${valor}</span>
    </div>`;

  return `
    <p class="drawer-section-title">Pendência</p>
    <div class="lista-dados">
      ${dado('Solicitação de alteração no campo', escapeHtml(pedido.label))}
      ${dado('Valor atual', pedido.valorAtual
        ? escapeHtml(pedido.valorAtual)
        : '<span class="cell-muted">não informado</span>')}
    </div>

    ${resolvido
      ? `<p class="cell-muted" style="font-size:.8125rem;margin:1rem 0 0">
           Esta pendência já foi tratada. O chamado está ${escapeHtml((TICKET_STATUS_LABELS[t.status] || t.status).toLowerCase())}.
         </p>`
      : `<div class="drawer-acoes-botoes" style="justify-content:flex-start;margin-top:1rem">
           <button type="button" class="btn btn-primary" id="btn-liberar">Liberar alteração</button>
           <button type="button" class="btn btn-ghost" id="btn-cancelar-pedido">Cancelar</button>
         </div>
         <p class="cell-muted" style="font-size:.75rem;line-height:1.6;margin:.75rem 0 0">
           Liberar destrava o campo no B2B para uma edição e conclui o chamado.
           Cancelar recusa o pedido e também conclui — o campo segue travado.
         </p>`}`;
}

async function liberarAlteracao(t) {
  const pedido = pedidoDoChamado(t);
  const botao = document.getElementById('btn-liberar');
  botao.disabled = true;

  const { error } = await supabaseClient.from('campos_liberados').insert({
    fornecedor_id: t.user_id,
    campo: pedido.campo,
    ticket_id: t.id,
    liberado_por: window.adminUser.id
  });

  if (error) {
    botao.disabled = false;
    const faltaTabela = /campos_liberados|does not exist|schema cache/i.test(error.message || '');
    toast(faltaTabela
      ? 'Rode supabase/migrations/022_liberar_campo_cadastral.sql no Supabase.'
      : `Não foi possível liberar: ${error.message}`);
    return;
  }

  await concluir(t, `Alteração de "${pedido.label}" liberada. O campo está editável no seu painel por uma vez.`);
  toast('Alteração liberada.');
}

async function recusarAlteracao(t) {
  const pedido = pedidoDoChamado(t);
  document.getElementById('btn-cancelar-pedido').disabled = true;
  await concluir(t, `A alteração de "${pedido.label}" não foi liberada. Fale com o suporte se precisar reabrir o pedido.`);
  toast('Pedido recusado.');
}

/** Registra a decisão na conversa e fecha o chamado. */
async function concluir(t, mensagem) {
  await supabaseClient.from('ticket_messages').insert({
    ticket_id: t.id,
    author_role: 'admin',
    author_id: window.adminUser.id,
    author_name: window.adminUser.name || 'Equipe Love',
    body: mensagem
  });

  await supabaseClient.from('tickets')
    .update({ status: 'resolvido', updated_at: new Date().toISOString() })
    .eq('id', t.id);

  t.status = 'resolvido';
  renderKpis();
  render();
  Drawer.close();
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
