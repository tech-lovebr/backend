/* ==========================================================================
   LOVE ADMIN — Atendimento (inbox)

   Etapa 1 do atendimento automatizado: uma caixa única para conversas de
   anfitriões, empresas e do site, em duas colunas (lista + conversa). A
   resposta sai de verdade: o servidor (api/atendimento-responder no
   love.com.br) grava, manda por e-mail ao solicitante e avisa na plataforma.

   Respostas prontas: biblioteca de "e-mails transacionais" com variáveis.
   O admin escolhe a que melhor responde, personaliza e envia. Nas próximas
   etapas o e-mail passa a chegar sozinho (Gmail) e a IA escolhe/redige.
   ========================================================================== */

const API_RESPONDER = 'https://love.com.br/api/atendimento-responder';

/* Abas: Pendentes (o que precisa de alguém da equipe), os dois canais e
   o histórico. Spam fica fora de todas, menos de Todos. */
const PENDENTE = t => ['aberto', 'em_andamento'].includes(t.status);
const ehEmail = t => ['email', 'formulario'].includes(t.canal || 'formulario');

const ABAS = {
  pendentes: PENDENTE,
  chat: t => t.canal === 'chat' && t.status !== 'spam',
  email: t => ehEmail(t) && t.status !== 'spam',
  todos: () => true,
  resolvidos: t => ['resolvido', 'fechado'].includes(t.status)
};

/* Contagem das abas de canal = quantas pendentes há nelas. */
const CONTAGEM_DA_ABA = {
  pendentes: t => PENDENTE(t),
  chat: t => t.canal === 'chat' && PENDENTE(t),
  email: t => ehEmail(t) && PENDENTE(t)
};

/* Ordem da lista: primeiro o que espera a equipe, depois o que espera a
   pessoa ou foi respondido pelo robô, por último o encerrado. Dentro de cada
   grupo, a mais recente em cima — respondida, a conversa desce. */
const PESO_STATUS = { aberto: 0, em_andamento: 0, aguardando_cliente: 1, respondida_bot: 1, resolvido: 2, fechado: 2, spam: 3 };

/* Status no card da lista: curto, para caber embaixo do horário. */
const TICKET_STATUS_CURTO = {
  aberto: 'Pendente', em_andamento: 'Pendente', aguardando_cliente: 'Aguardando',
  respondida_bot: 'Robô respondeu', resolvido: 'Resolvido', fechado: 'Resolvido', spam: 'Spam'
};

const CANAL_LABELS = { formulario: 'Formulário', email: 'E-mail', chat: 'Chat', whatsapp: 'WhatsApp' };
const ORIGEM_CURTA = { cliente: 'Anfitrião', fornecedor: 'Empresa', site: 'Site' };

let TICKETS = [];
let RESPOSTAS = [];
let ABA_ATUAL = 'pendentes';
let ATUAL = null;      // id da conversa aberta
let EDITOR = null;
let RESPOSTA_ESCOLHIDA = null;

document.addEventListener('DOMContentLoaded', async () => {
  if (!(await window.adminReady)) return;

  document.getElementById('inbox-itens').innerHTML = '<div class="inbox-carregando"><div class="skeleton" style="width:70%"></div></div>';

  const [tickets, respostas] = await Promise.all([
    safeSelect('tickets', '*'),
    safeSelect('respostas_prontas', '*', q => q.order('categoria').order('titulo'))
  ]);

  if (tickets.error) {
    document.getElementById('inbox-itens').innerHTML =
      `<div class="empty-state"><strong>Não foi possível carregar</strong><p>${escapeHtml(tickets.error.message || '')}</p></div>`;
    return;
  }

  TICKETS = tickets.data;
  RESPOSTAS = respostas.error ? [] : respostas.data;
  if (respostas.error) console.warn('[atendimento] rode supabase/migrations/060_atendimento_inbox.sql');

  ligarAbas();
  document.getElementById('busca').addEventListener('input', renderLista);
  document.getElementById('filtro-origem').addEventListener('change', renderLista);
  aplicarBuscaDaUrl(document.getElementById('busca'));

  addHeaderAction('Comandos', abrirBiblioteca, { icone: null, principal: true });

  renderContagens();
  renderLista();

  // Link direto para uma conversa: atendimento?id=<uuid>
  const id = new URLSearchParams(location.search).get('id');
  if (id && TICKETS.some(t => t.id === id)) abrirConversa(id);
});

/* ------------------------------------------------------------- Lista */

const quando = t => t.last_message_at || t.updated_at || t.created_at;

function ligarAbas() {
  document.querySelectorAll('#abas-status [data-aba]').forEach(btn => {
    btn.addEventListener('click', () => {
      ABA_ATUAL = btn.dataset.aba;
      document.querySelectorAll('#abas-status [data-aba]').forEach(b => b.classList.toggle('is-active', b === btn));
      renderLista();
    });
  });
}

function renderContagens() {
  document.querySelectorAll('#abas-status [data-contagem]').forEach(span => {
    const n = TICKETS.filter(CONTAGEM_DA_ABA[span.dataset.contagem]).length;
    span.textContent = n ? ` (${formatNumber(n)})` : '';
  });
}

function filtrar() {
  const termo = document.getElementById('busca').value.trim().toLowerCase();
  const origem = document.getElementById('filtro-origem').value;

  return TICKETS.filter(t => {
    if (!ABAS[ABA_ATUAL](t)) return false;
    if (origem && t.origem !== origem) return false;
    if (!termo) return true;
    return [t.protocolo, t.nome, t.email, t.assunto, t.telefone, t.categoria, t.mensagem]
      .some(v => String(v || '').toLowerCase().includes(termo));
  }).sort((a, b) =>
    (PESO_STATUS[a.status] ?? 1) - (PESO_STATUS[b.status] ?? 1) ||
    new Date(quando(b) || 0) - new Date(quando(a) || 0));
}

function renderLista() {
  const host = document.getElementById('inbox-itens');
  const lista = filtrar();

  if (!lista.length) {
    host.innerHTML = `<div class="empty-state"><strong>Nenhuma conversa aqui</strong>
      <p>${TICKETS.length ? 'Troque a aba, a busca ou a origem.' : 'Quando alguém escrever para a Love, a conversa aparece aqui.'}</p></div>`;
    return;
  }

  host.innerHTML = lista.map(t => `
    <button type="button" class="inbox-item ${t.id === ATUAL ? 'is-ativo' : ''} ${t.nao_lido !== false && ABAS.pendentes(t) ? 'is-nao-lido' : ''}" data-id="${t.id}">
      <span class="inbox-item-topo">
        <span class="inbox-item-nome">${escapeHtml(t.nome || t.email || 'Sem nome')}</span>
        <span class="inbox-item-lado">
          <span class="inbox-item-quando">${escapeHtml(formatRelative(quando(t)))}</span>
          ${badge(TICKET_STATUS_CURTO[t.status] || TICKET_STATUS_LABELS[t.status] || t.status, TICKET_STATUS_BADGE[t.status])}
        </span>
      </span>
      <span class="inbox-item-assunto">${escapeHtml(t.assunto || '(sem assunto)')}</span>
      <span class="inbox-item-trecho">${escapeHtml(t.resumo || resumoDe(t.mensagem))}</span>
      <span class="inbox-item-selos">
        ${badge(ORIGEM_CURTA[t.origem] || t.origem, '')}
        ${badge(CANAL_LABELS[t.canal] || 'Formulário', '')}
        ${t.prioridade === 'alta' ? badge('Alta', 'badge-danger') : ''}
      </span>
    </button>`).join('');

  host.querySelectorAll('[data-id]').forEach(btn => btn.addEventListener('click', () => abrirConversa(btn.dataset.id)));
}

function resumoDe(texto, limite = 110) {
  const t = String(texto || '').replace(/\s+/g, ' ').trim();
  return t.length > limite ? `${t.slice(0, limite).trimEnd()}…` : t;
}

/* ---------------------------------------------------------- Conversa */

async function abrirConversa(id) {
  const t = TICKETS.find(x => x.id === id);
  if (!t) return;

  ATUAL = id;
  RESPOSTA_ESCOLHIDA = null;
  renderLista();

  const painel = document.getElementById('inbox-conversa');
  painel.innerHTML = '<div class="inbox-carregando"><div class="skeleton" style="width:60%"></div></div>';
  painel.scrollIntoView({ block: 'nearest', behavior: 'smooth' });

  // Abrir marca como lida.
  if (t.nao_lido !== false) {
    t.nao_lido = false;
    supabaseClient.from('tickets').update({ nao_lido: false }).eq('id', id).then(() => {}, () => {});
  }

  const { data: mensagens } = await safeSelect('ticket_messages', '*',
    q => q.eq('ticket_id', id).order('created_at', { ascending: true }));

  if (ATUAL !== id) return; // trocou de conversa enquanto carregava

  const conversa = [
    ...(t.mensagem ? [{ author_role: 'usuario', author_name: t.nome, body: t.mensagem, created_at: t.created_at }] : []),
    ...mensagens
  ];

  painel.innerHTML = `
    <header class="conversa-topo">
      <div class="conversa-titulo">
        <h2>${escapeHtml(t.assunto || 'Conversa')}</h2>
        <p>
          ${escapeHtml(t.protocolo || '')} ·
          ${escapeHtml(t.nome || '')}
          ${t.email ? ` · ${celulaCopiavel(t.email, 'E-mail')}` : ''}
          ${t.telefone ? ` · ${escapeHtml(t.telefone)}` : ''}
        </p>
        <div class="conversa-selos">
          ${badge(ORIGEM_LABELS[t.origem] || t.origem, '')}
          ${badge(CANAL_LABELS[t.canal] || 'Formulário', '')}
          ${t.categoria ? badge(t.categoria, '') : ''}
        </div>
      </div>
      <div class="conversa-controles">
        <select class="field-select" id="conversa-status" aria-label="Status">
          ${Object.entries(TICKET_STATUS_LABELS).map(([v, l]) => `<option value="${v}" ${t.status === v ? 'selected' : ''}>${l}</option>`).join('')}
        </select>
        <select class="field-select" id="conversa-prioridade" aria-label="Prioridade">
          ${['baixa', 'normal', 'alta'].map(v => `<option value="${v}" ${(t.prioridade || 'normal') === v ? 'selected' : ''}>Prioridade ${v}</option>`).join('')}
        </select>
      </div>
    </header>

    <div class="conversa-thread" id="conversa-thread">
      ${conversa.length ? conversa.map(m => bolha(m, t)).join('') : '<p class="cell-muted" style="font-size:.8125rem">Conversa sem mensagens.</p>'}
    </div>

    ${ehPedidoDeAlteracao(t) ? corpoDaPendencia(t) : ''}

    <div class="conversa-composer">
      <div class="composer-linha">
        <select class="field-select" id="composer-resposta" aria-label="Resposta pronta">
          <option value="">Usar um comando…</option>
          ${opcoesDeResposta(t)}
        </select>
        <input class="field-input" id="composer-assunto" type="text" placeholder="Assunto do e-mail (opcional)">
      </div>
      <div id="composer-editor"></div>
      <div class="composer-acoes">
        <span class="cell-muted composer-dica">Ctrl+Enter envia. ${t.canal === 'chat'
          ? 'A resposta aparece na hora na conversa Suporte Love da pessoa.'
          : `A pessoa recebe por e-mail${t.user_id ? ' e na plataforma' : ''}.`}</span>
        <button type="button" class="btn btn-ghost" id="btn-enviar-resolver">Enviar e resolver</button>
        <button type="button" class="btn btn-primary" id="btn-enviar">Enviar</button>
      </div>
    </div>`;

  const thread = document.getElementById('conversa-thread');
  thread.scrollTop = thread.scrollHeight;

  EDITOR = EditorRico.montar(document.getElementById('composer-editor'), { placeholder: 'Escreva a resposta…' });

  ligarAcoesDaLinha(painel, () => {});
  document.getElementById('conversa-status').addEventListener('change', e => salvarCampo(t, { status: e.target.value }));
  document.getElementById('conversa-prioridade').addEventListener('change', e => salvarCampo(t, { prioridade: e.target.value }));
  document.getElementById('composer-resposta').addEventListener('change', e => aplicarResposta(t, e.target.value));
  document.getElementById('btn-enviar').addEventListener('click', () => enviar(t, 'aguardando_cliente'));
  document.getElementById('btn-enviar-resolver').addEventListener('click', () => enviar(t, 'resolvido'));
  document.getElementById('composer-editor').addEventListener('keydown', e => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); enviar(t, 'aguardando_cliente'); }
  });
  document.getElementById('btn-liberar')?.addEventListener('click', () => liberarAlteracao(t));
  document.getElementById('btn-cancelar-pedido')?.addEventListener('click', () => recusarAlteracao(t));
}

function bolha(m, t) {
  const daEquipe = m.author_role !== 'usuario';
  const autor = m.author_role === 'ia' ? 'Robô Love'
    : m.author_role === 'sistema' ? 'Aviso automático'
    : (m.author_name || (daEquipe ? 'Equipe Love' : t.nome));
  const corpo = m.body_html ? m.body_html : escapeHtml(m.body || '');
  const entrega = daEquipe && m.author_role === 'admin'
    ? (m.enviado_por_email ? ' · enviado por e-mail' : m.email_status ? ` · e-mail não enviado (${escapeHtml(m.email_status)})` : '')
    : '';
  return `
    <div class="thread-msg ${daEquipe ? 'from-admin' : 'from-user'} ${m.author_role === 'ia' || m.author_role === 'sistema' ? 'from-robo' : ''}">
      <div class="bubble ${m.body_html ? 'bubble-html' : ''}">${corpo}</div>
      <p class="meta">${escapeHtml(autor)} · ${escapeHtml(formatDateTime(m.created_at))}${entrega}</p>
    </div>`;
}

async function salvarCampo(t, campos) {
  const { error } = await supabaseClient.from('tickets').update({ ...campos, updated_at: new Date().toISOString() }).eq('id', t.id);
  if (error) return toast(`Não foi possível salvar: ${error.message}`);
  Object.assign(t, campos);
  renderContagens();
  renderLista();
  toast('Conversa atualizada.');
}

/* ---------------------------------------------------- Respostas prontas */

function publicoServe(r, t) {
  return r.publico === 'todos' || r.publico === t.origem || (t.origem === 'site' && r.publico === 'cliente');
}

function opcoesDeResposta(t) {
  const lista = RESPOSTAS.filter(r => r.ativo !== false && publicoServe(r, t));
  const grupos = [...new Set(lista.map(r => r.categoria || 'Geral'))];
  return grupos.map(g => `
    <optgroup label="${escapeHtml(g)}">
      ${lista.filter(r => (r.categoria || 'Geral') === g)
        .map(r => `<option value="${r.id}">${escapeHtml(r.titulo)}</option>`).join('')}
    </optgroup>`).join('');
}

function preencherVariaveis(texto, t) {
  const nome = (t.nome || '').trim();
  const valores = {
    nome: nome || 'tudo bem',
    primeiro_nome: nome.split(/\s+/)[0] || 'tudo bem',
    protocolo: t.protocolo || '',
    assunto: t.assunto || ''
  };
  return String(texto || '').replace(/\{\{\s*(\w+)\s*\}\}/g, (m, chave) =>
    chave in valores ? escapeHtml(valores[chave]) : m);
}

function aplicarResposta(t, id) {
  const r = RESPOSTAS.find(x => x.id === id);
  RESPOSTA_ESCOLHIDA = r ? r.id : null;
  if (!r) return;
  EDITOR.definir(preencherVariaveis(r.corpo_html, t));
  if (r.assunto) document.getElementById('composer-assunto').value = preencherVariaveis(r.assunto, t).replace(/&amp;/g, '&');
  EDITOR.focar();
}

/* ------------------------------------------------------------ Enviar */

async function enviar(t, status) {
  const html = EDITOR.html();
  if (!EDITOR.texto().trim()) return toast('Escreva a resposta antes de enviar.');

  const botoes = ['btn-enviar', 'btn-enviar-resolver'].map(id => document.getElementById(id));
  botoes.forEach(b => { b.disabled = true; });

  if (t.canal === 'chat') return responderNoChat(t, html, status, botoes);

  try {
    const { data: { session } } = await supabaseClient.auth.getSession();
    const r = await fetch(API_RESPONDER, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token || ''}` },
      body: JSON.stringify({
        ticket_id: t.id,
        body_html: html,
        assunto: document.getElementById('composer-assunto').value.trim() || null,
        resposta_pronta_id: RESPOSTA_ESCOLHIDA,
        status
      })
    });
    const resultado = await r.json().catch(() => ({}));

    if (!r.ok || !resultado.ok) {
      botoes.forEach(b => { b.disabled = false; });
      return toast(`Não foi possível enviar: ${resultado.erro || r.status}`);
    }

    t.status = resultado.status;
    t.nao_lido = false;
    t.last_message_at = new Date().toISOString();

    const avisos = [];
    avisos.push(resultado.email?.enviado ? 'enviado por e-mail' : `e-mail não saiu (${resultado.email?.motivo || 'erro'})`);
    if (resultado.notificado) avisos.push('avisado na plataforma');
    toast(`Resposta registrada: ${avisos.join(', ')}.`);

    renderContagens();
    abrirConversa(t.id);
  } catch (e) {
    botoes.forEach(b => { b.disabled = false; });
    toast('Não foi possível falar com o servidor. Tente de novo.');
  }
}

/* Conversa do chat Suporte Love: grava a resposta, que chega em tempo real
   no chat da pessoa (love.com.br ou Hub). */
async function responderNoChat(t, html, status, botoes) {
  const texto = EDITOR.texto().trim();
  const { error } = await supabaseClient.from('ticket_messages').insert({
    ticket_id: t.id,
    author_role: 'admin',
    author_id: window.adminUser.id,
    author_name: window.adminUser.name || 'Equipe Love',
    body: texto,
    body_html: html,
    canal: 'chat',
    resposta_pronta_id: RESPOSTA_ESCOLHIDA
  });

  if (error) {
    botoes.forEach(b => { b.disabled = false; });
    return toast(`Não foi possível enviar: ${error.message}`);
  }

  await supabaseClient.from('tickets')
    .update({ status, nao_lido: false, updated_at: new Date().toISOString() })
    .eq('id', t.id);

  if (RESPOSTA_ESCOLHIDA) {
    const r = RESPOSTAS.find(x => x.id === RESPOSTA_ESCOLHIDA);
    if (r) {
      r.usos = (r.usos || 0) + 1;
      supabaseClient.from('respostas_prontas').update({ usos: r.usos }).eq('id', r.id).then(() => {}, () => {});
    }
  }

  Object.assign(t, { status, nao_lido: false, last_message_at: new Date().toISOString() });
  toast('Resposta enviada no chat.');
  renderContagens();
  abrirConversa(t.id);
}

/* ------------------------------------------- Biblioteca de respostas prontas */

/* Mesmo lápis da foto de perfil/capa do love.com.br e do Hub: bolinha
   translúcida com desfoque e traço 2.4. */
const ICONE_LAPIS_EDITAR = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M16.86 4.49a2.1 2.1 0 0 1 2.97 2.97L8.5 18.79 4 20l1.21-4.5L16.86 4.49Z"/><path d="M14.5 6.85l2.65 2.65"/></svg>';

/* Lista enxuta: cada resposta é uma caixinha própria, só com o título e o
   lápis — o resto está dentro dela. */
function abrirBiblioteca() {
  const lista = RESPOSTAS.slice().sort((a, b) => String(a.titulo).localeCompare(String(b.titulo), 'pt-BR'));

  Drawer.open({
    title: 'Comandos rápidos',
    body: lista.length
      ? `<div class="respostas-lista">${lista.map(r => `
          <div class="resposta-linha ${r.ativo === false ? 'is-inativo' : ''}">
            <span class="resposta-linha-titulo">${escapeHtml(r.titulo)}</span>
            <button type="button" class="lapis-redondo" data-editar-resposta="${r.id}" title="Editar" aria-label="Editar ${escapeHtml(r.titulo)}">${ICONE_LAPIS_EDITAR}</button>
          </div>`).join('')}</div>`
      : `<div class="empty-state"><strong>Nenhuma resposta pronta</strong><p>Crie a primeira — ela aparece no seletor de cada conversa.</p></div>`,
    footer: `
      <button type="button" class="btn btn-ghost" id="btn-fechar-biblioteca">Fechar</button>
      <button type="button" class="btn btn-primary" id="btn-nova-resposta">Novo comando</button>`
  });

  document.getElementById('btn-fechar-biblioteca').addEventListener('click', () => Drawer.close());
  document.getElementById('btn-nova-resposta').addEventListener('click', () => editarResposta(null));
  document.querySelectorAll('[data-editar-resposta]').forEach(btn =>
    btn.addEventListener('click', () => editarResposta(RESPOSTAS.find(r => r.id === btn.dataset.editarResposta))));
}

function editarResposta(r) {
  const categorias = [...new Set(RESPOSTAS.map(x => x.categoria).filter(Boolean))];

  Drawer.open({
    title: r ? 'Editar comando' : 'Novo comando',
    subtitle: 'Variáveis: {{nome}}, {{primeiro_nome}}, {{protocolo}}, {{assunto}}',
    back: abrirBiblioteca,
    body: `
      <form id="form-resposta">
        <label class="field">
          <span class="field-label">Título <span class="campo-obrigatorio">*</span></span>
          <input class="field-input" name="titulo" type="text" maxlength="120" value="${escapeHtml(r?.titulo || '')}">
        </label>
        <div class="field-row">
          <label class="field">
            <span class="field-label">Categoria</span>
            <input class="field-input" name="categoria" type="text" list="categorias-resposta" value="${escapeHtml(r?.categoria || 'Geral')}">
            <datalist id="categorias-resposta">${categorias.map(c => `<option value="${escapeHtml(c)}">`).join('')}</datalist>
          </label>
          <label class="field">
            <span class="field-label">Para quem</span>
            <select class="field-select" name="publico">
              ${[['todos', 'Todos'], ['cliente', 'Anfitriões'], ['fornecedor', 'Empresas']]
                .map(([v, l]) => `<option value="${v}" ${(r?.publico || 'todos') === v ? 'selected' : ''}>${l}</option>`).join('')}
            </select>
          </label>
        </div>
        <label class="field">
          <span class="field-label">Assunto do e-mail</span>
          <input class="field-input" name="assunto" type="text" value="${escapeHtml(r?.assunto || '')}">
        </label>
        <div class="field">
          <span class="field-label">Texto <span class="campo-obrigatorio">*</span></span>
          <div id="resposta-editor"></div>
        </div>
        <label class="field">
          <span class="field-label">Palavras-chave (separadas por vírgula)</span>
          <input class="field-input" name="palavras" type="text" placeholder="saque, pix, carteira" value="${escapeHtml((r?.palavras_chave || []).join(', '))}">
          <span class="cell-muted" style="font-size:.75rem;display:block;margin-top:.25rem">Ajudam a IA a escolher esta resposta (etapa 3).</span>
        </label>
        <label class="field">
          <span class="field-label">Robô do chat</span>
          <select class="field-select" name="envio_automatico">
            <option value="false" ${r?.envio_automatico ? '' : 'selected'}>Só a equipe usa</option>
            <option value="true" ${r?.envio_automatico ? 'selected' : ''}>O robô pode responder sozinho com esta resposta</option>
          </select>
          <span class="cell-muted" style="font-size:.75rem;display:block;margin-top:.25rem">No chat Suporte Love, o robô envia esta resposta quando a mensagem tiver uma das palavras-chave.</span>
        </label>
        <label class="field">
          <span class="field-label">Status</span>
          <select class="field-select" name="ativo">
            <option value="true" ${r?.ativo === false ? '' : 'selected'}>Ativa</option>
            <option value="false" ${r?.ativo === false ? 'selected' : ''}>Desativada</option>
          </select>
        </label>
      </form>`,
    footer: `
      ${r ? '<button type="button" class="btn btn-danger" id="btn-excluir-resposta">Excluir</button>' : ''}
      <button type="button" class="btn btn-ghost" id="btn-cancelar-resposta">Cancelar</button>
      <button type="button" class="btn btn-primary" id="btn-salvar-resposta">Salvar</button>`
  });

  const editor = EditorRico.montar(document.getElementById('resposta-editor'), { placeholder: 'Olá, {{primeiro_nome}}! …' });
  editor.definir(r?.corpo_html || '');

  document.getElementById('btn-cancelar-resposta').addEventListener('click', abrirBiblioteca);
  document.getElementById('btn-excluir-resposta')?.addEventListener('click', async () => {
    if (!window.confirm(`Excluir "${r.titulo}"?`)) return;
    const { error } = await supabaseClient.from('respostas_prontas').delete().eq('id', r.id);
    if (error) return toast(`Não foi possível excluir: ${error.message}`);
    RESPOSTAS = RESPOSTAS.filter(x => x.id !== r.id);
    toast('Resposta excluída.');
    abrirBiblioteca();
  });

  document.getElementById('btn-salvar-resposta').addEventListener('click', async () => {
    const d = Object.fromEntries(new FormData(document.getElementById('form-resposta')).entries());
    if (!d.titulo.trim()) return toast('Dê um título à resposta.');
    if (!editor.texto().trim()) return toast('Escreva o texto da resposta.');

    const payload = {
      titulo: d.titulo.trim(),
      categoria: d.categoria.trim() || 'Geral',
      publico: d.publico,
      assunto: d.assunto.trim() || null,
      corpo_html: editor.html(),
      palavras_chave: d.palavras.split(',').map(p => p.trim().toLowerCase()).filter(Boolean),
      envio_automatico: d.envio_automatico === 'true',
      ativo: d.ativo === 'true'
    };

    Drawer.setFooterBusy(true);
    const consulta = r
      ? supabaseClient.from('respostas_prontas').update(payload).eq('id', r.id).select().single()
      : supabaseClient.from('respostas_prontas').insert({ ...payload, criado_por: window.adminUser.id }).select().single();
    const { data, error } = await consulta;
    Drawer.setFooterBusy(false);

    if (error) {
      return toast(/respostas_prontas|does not exist|schema cache/i.test(error.message || '')
        ? 'Rode supabase/migrations/060_atendimento_inbox.sql no Supabase.'
        : `Não foi possível salvar: ${error.message}`);
    }

    RESPOSTAS = r ? RESPOSTAS.map(x => (x.id === r.id ? data : x)) : [...RESPOSTAS, data];
    toast('Resposta salva.');
    abrirBiblioteca();
    if (ATUAL) {
      const select = document.getElementById('composer-resposta');
      const t = TICKETS.find(x => x.id === ATUAL);
      if (select && t) select.innerHTML = '<option value="">Usar um comando…</option>' + opcoesDeResposta(t);
    }
  });
}

/* --------------------------------------------- Pedido de alteração de dado
   Fluxo antigo do Hub (nome da empresa / CNPJ travados). Continua
   funcionando até ser substituído; aparece acima do editor. */

const CAMPOS_LIBERAVEIS = { company: 'Nome da empresa', documento: 'CNPJ / CPF' };

function ehPedidoDeAlteracao(t) {
  const assunto = (t.assunto || '').trim().toLowerCase();
  return t.origem === 'fornecedor' && (assunto === 'alteração de dados' || assunto === 'alteração de dado');
}

function pedidoDoChamado(t) {
  const extra = t.extra || {};
  if (extra.campo) {
    return { campo: extra.campo, label: extra.campo_label || CAMPOS_LIBERAVEIS[extra.campo] || extra.campo, valorAtual: extra.valor_atual || null };
  }
  const texto = t.mensagem || '';
  const nome = texto.match(/campo "([^"]+)"/i)?.[1] || null;
  const valor = texto.match(/valor atual:\s*([^)]+)\)/i)?.[1]?.trim() || null;
  return { campo: /cnpj|cpf|documento/i.test(nome || '') ? 'documento' : 'company', label: nome || 'Nome da empresa', valorAtual: valor };
}

function corpoDaPendencia(t) {
  const pedido = pedidoDoChamado(t);
  const resolvido = ['resolvido', 'fechado'].includes(t.status);
  return `
    <div class="conversa-pendencia">
      <p class="drawer-section-title" style="margin-top:0">Pendência: alteração de ${escapeHtml(pedido.label)}</p>
      <p class="cell-muted" style="font-size:.8125rem;margin:0 0 .75rem">Valor atual: ${pedido.valorAtual ? escapeHtml(pedido.valorAtual) : 'não informado'}</p>
      ${resolvido
        ? '<p class="cell-muted" style="font-size:.8125rem;margin:0">Esta pendência já foi tratada.</p>'
        : `<div style="display:flex;gap:.5rem">
             <button type="button" class="btn btn-primary btn-sm" id="btn-liberar">Liberar alteração</button>
             <button type="button" class="btn btn-ghost btn-sm" id="btn-cancelar-pedido">Recusar</button>
           </div>`}
    </div>`;
}

async function liberarAlteracao(t) {
  const pedido = pedidoDoChamado(t);
  document.getElementById('btn-liberar').disabled = true;
  const { error } = await supabaseClient.from('campos_liberados').insert({
    fornecedor_id: t.user_id, campo: pedido.campo, ticket_id: t.id, liberado_por: window.adminUser.id
  });
  if (error) {
    document.getElementById('btn-liberar').disabled = false;
    return toast(`Não foi possível liberar: ${error.message}`);
  }
  await concluirPendencia(t, `Alteração de "${pedido.label}" liberada. O campo está editável no seu painel por uma vez.`);
  toast('Alteração liberada.');
}

async function recusarAlteracao(t) {
  const pedido = pedidoDoChamado(t);
  document.getElementById('btn-cancelar-pedido').disabled = true;
  await concluirPendencia(t, `A alteração de "${pedido.label}" não foi liberada. Fale com o suporte se precisar reabrir o pedido.`);
  toast('Pedido recusado.');
}

async function concluirPendencia(t, mensagem) {
  await supabaseClient.from('ticket_messages').insert({
    ticket_id: t.id, author_role: 'admin', author_id: window.adminUser.id,
    author_name: window.adminUser.name || 'Equipe Love', body: mensagem
  });
  await supabaseClient.from('tickets').update({ status: 'resolvido', updated_at: new Date().toISOString() }).eq('id', t.id);
  t.status = 'resolvido';
  renderContagens();
  abrirConversa(t.id);
}
