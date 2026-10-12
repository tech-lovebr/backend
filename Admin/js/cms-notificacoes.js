/* ==========================================================================
   LOVE ADMIN — CMS: notificações

   A notificação é escrita uma vez e endereçada a um público, não copiada
   para cada destinatário. Isso mantém o envio barato e permite corrigir ou
   apagar a mensagem depois sem caçar cópias espalhadas.

   Só texto e link — notificação não carrega imagem.
   ========================================================================== */

let NOTIFICACOES = [];
let LEITURAS = [];
let CONTAS = [];
let DESTINO_ATUAL = '';

const PUBLICOS = {
  todos: 'Todos',
  b2b: 'HUB/B2B',
  anfitriao: 'Anfitriões',
  individual: 'Individual'
};

document.addEventListener('DOMContentLoaded', async () => {
  if (!(await window.adminReady)) return;

  const tbody = document.getElementById('tbody');
  renderLoading(tbody, 4);

  const [notificacoes, leituras, contas] = await Promise.all([
    safeSelect('notificacoes', '*'),
    safeSelect('notificacao_leituras', 'notificacao_id'),
    supabaseClient.rpc('admin_listar_contas')
  ]);

  if (notificacoes.error) return renderError(tbody, 4, notificacoes.error);

  NOTIFICACOES = notificacoes.data;
  LEITURAS = leituras.data || [];
  CONTAS = contas.data || [];

  ligarAbas();
  render();

  document.getElementById('busca').addEventListener('input', render);

  addHeaderAction('Nova notificação', abrirComposicao, {
    icone: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14" /><path d="M5 12h14" /></svg>'
  }).className = 'btn btn-primary';

  moverControlesParaHeader();
});

/* ------------------------------------------------------------------ Lista */

function ligarAbas() {
  document.querySelectorAll('#abas-destino [data-destino]').forEach(btn => {
    btn.addEventListener('click', () => {
      DESTINO_ATUAL = btn.dataset.destino;
      document.querySelectorAll('#abas-destino [data-destino]')
        .forEach(b => b.classList.toggle('is-active', b === btn));
      render();
    });
  });
}

function filtrar() {
  const termo = document.getElementById('busca').value.trim().toLowerCase();
  return NOTIFICACOES.filter(n => {
    if (DESTINO_ATUAL && n.destino !== DESTINO_ATUAL) return false;
    if (!termo) return true;
    return [n.titulo, n.mensagem].some(v => String(v || '').toLowerCase().includes(termo));
  });
}

function nomeDaConta(id) {
  const c = CONTAS.find(x => x.id === id);
  return c ? (c.nome || c.email) : 'conta removida';
}

function render() {
  const tbody = document.getElementById('tbody');
  const lista = filtrar().sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  document.getElementById('contagem-notificacoes').textContent =
    `${formatNumber(lista.length)} ${lista.length === 1 ? 'notificação' : 'notificações'}`;

  if (!lista.length) {
    renderEmpty(tbody, 4, 'Nenhuma notificação encontrada',
      NOTIFICACOES.length
        ? 'Ajuste a busca ou a aba acima.'
        : 'Clique em "Nova notificação" no cabeçalho para enviar a primeira.');
    return;
  }

  tbody.innerHTML = lista.map(n => {
    const lidas = LEITURAS.filter(l => l.notificacao_id === n.id).length;
    const publico = n.destino === 'individual'
      ? `Individual <span class="cell-muted">· ${escapeHtml(nomeDaConta(n.destinatario_id))}</span>`
      : escapeHtml(PUBLICOS[n.destino] || n.destino);

    return `
      <tr data-id="${n.id}">
        <td>
          <span class="cell-strong">${dash(n.titulo)}</span>
          ${n.link_url ? '<span class="artigo-situacao">— com link</span>' : ''}
        </td>
        <td class="cell-muted">${publico}</td>
        <td class="cell-muted">${escapeHtml(formatDateTime(n.created_at))}</td>
        <td class="col-numero ${lidas ? '' : 'cell-muted'}">${lidas ? formatNumber(lidas) : '—'}</td>
      </tr>`;
  }).join('');

  tbody.querySelectorAll('tr[data-id]').forEach(tr => {
    tr.addEventListener('click', () => abrirDetalhe(tr.dataset.id));
  });
}

/* --------------------------------------------------------------- Detalhe */

function abrirDetalhe(id) {
  const n = NOTIFICACOES.find(x => x.id === id);
  if (!n) return;

  const lidas = LEITURAS.filter(l => l.notificacao_id === n.id).length;

  const linha = (rotulo, valor) => `
    <div class="dados-linha">
      <span class="rotulo">${escapeHtml(rotulo)}</span>
      <span class="valor">${valor}</span>
    </div>`;

  Drawer.open({
    title: n.titulo,
    body: `
      <div class="lista-dados">
        ${linha('Público', n.destino === 'individual'
          ? escapeHtml(nomeDaConta(n.destinatario_id))
          : escapeHtml(PUBLICOS[n.destino] || n.destino))}
        ${linha('Enviada em', escapeHtml(formatDateTime(n.created_at)))}
        ${linha('Enviada por', escapeHtml(n.autor_nome || '—'))}
        ${linha('Leituras', formatNumber(lidas))}
        ${n.link_url
          ? linha('Link', `<a href="${escapeHtml(n.link_url)}" target="_blank" rel="noopener" class="link-convite">${escapeHtml(n.link_label || n.link_url)}</a>`)
          : ''}
      </div>

      <p class="drawer-section-title">Mensagem</p>
      <p class="texto-corrido">${escapeHtml(n.mensagem)}</p>`,
    footer: `
      <button type="button" class="btn btn-ghost" id="btn-fechar">Fechar</button>
      <button type="button" class="btn btn-danger" id="btn-excluir">Excluir</button>`
  });

  document.getElementById('btn-fechar').addEventListener('click', () => Drawer.close());
  document.getElementById('btn-excluir').addEventListener('click', () => confirmarExclusao(n));
}

function confirmarExclusao(n) {
  Modal.abrir({
    titulo: 'Tem certeza?',
    texto: 'A notificação some para quem ainda não abriu e sai do histórico de quem já leu. Esta ação não pode ser desfeita.',
    acoes: [
      { rotulo: 'Sim', classe: 'btn-danger', aoClicar: () => excluir(n.id) },
      { rotulo: 'Não', classe: 'btn-ghost', aoClicar: () => Modal.fechar() }
    ]
  });
}

async function excluir(id) {
  Modal.ocupado(true);
  const { error } = await supabaseClient.from('notificacoes').delete().eq('id', id);
  Modal.ocupado(false);
  Modal.fechar();

  if (error) return toast(`Não foi possível excluir: ${error.message}`);
  toast('Notificação excluída.');
  window.location.reload();
}

/* -------------------------------------------------------------- Composição */

let DESTINO_NOVO = 'todos';
let DESTINATARIO = null;

function abrirComposicao() {
  DESTINO_NOVO = 'todos';
  DESTINATARIO = null;

  Drawer.open({
    title: 'Nova notificação',
    body: `
      <p class="drawer-section-title">Para quem</p>
      <div class="publico-opcoes" id="publico-opcoes">
        ${Object.entries(PUBLICOS).map(([valor, rotulo]) => `
          <button type="button" class="publico-opcao ${valor === 'todos' ? 'is-ativa' : ''}" data-publico="${valor}">
            ${escapeHtml(rotulo)}
          </button>`).join('')}
      </div>

      <div class="field" id="campo-destinatario" hidden style="margin-top:.875rem">
        <span class="field-label">Pessoa <span class="campo-obrigatorio">*</span></span>
        <input class="field-input" id="busca-pessoa" type="text" autocomplete="off"
               placeholder="Digite o nome ou o e-mail">
        <div class="pessoa-resultados" id="pessoa-resultados" hidden></div>
        <p class="pessoa-escolhida" id="pessoa-escolhida" hidden></p>
      </div>

      <p class="drawer-section-title">Mensagem</p>
      <label class="field">
        <span class="field-label">Título <span class="campo-obrigatorio">*</span></span>
        <input class="field-input" id="nova-titulo" type="text" maxlength="80"
               placeholder="Ex: Novidade na sua vitrine" autocomplete="off">
      </label>

      <label class="field">
        <span class="field-label">Texto <span class="campo-obrigatorio">*</span></span>
        <textarea class="field-textarea" id="nova-mensagem" maxlength="400"
                  placeholder="Escreva a notificação. Só texto — sem imagens."></textarea>
      </label>

      <p class="drawer-section-title">Link (opcional)</p>
      <div class="field-row">
        <label class="field">
          <span class="field-label">Endereço</span>
          <input class="field-input" id="nova-link" type="url" placeholder="https://" autocomplete="off">
        </label>
        <label class="field">
          <span class="field-label">Texto do link</span>
          <input class="field-input" id="nova-link-label" type="text" placeholder="Ex: Ver agora" autocomplete="off">
        </label>
      </div>`,
    footer: `
      <button type="button" class="btn btn-ghost" id="btn-cancelar">Cancelar</button>
      <button type="button" class="btn btn-primary" id="btn-enviar">Enviar</button>`
  });

  ligarComposicao();
}

function ligarComposicao() {
  document.getElementById('btn-cancelar').addEventListener('click', () => Drawer.close());
  document.getElementById('btn-enviar').addEventListener('click', enviar);

  document.querySelectorAll('#publico-opcoes [data-publico]').forEach(btn => {
    btn.addEventListener('click', () => {
      DESTINO_NOVO = btn.dataset.publico;
      document.querySelectorAll('#publico-opcoes [data-publico]')
        .forEach(b => b.classList.toggle('is-ativa', b === btn));
      document.getElementById('campo-destinatario').hidden = DESTINO_NOVO !== 'individual';
    });
  });

  const busca = document.getElementById('busca-pessoa');
  const resultados = document.getElementById('pessoa-resultados');

  busca.addEventListener('input', () => {
    const termo = busca.value.trim().toLowerCase();
    DESTINATARIO = null;
    document.getElementById('pessoa-escolhida').hidden = true;

    if (termo.length < 2) { resultados.hidden = true; return; }

    const achados = CONTAS
      .filter(c => [c.nome, c.email].some(v => String(v || '').toLowerCase().includes(termo)))
      .slice(0, 6);

    resultados.hidden = !achados.length;
    resultados.innerHTML = achados.map(c => `
      <button type="button" class="pessoa-resultado" data-conta="${escapeHtml(c.id)}">
        <span class="pessoa-nome">${escapeHtml(c.nome || c.email)}</span>
        <span class="pessoa-email">${escapeHtml(c.email || '')}</span>
      </button>`).join('');

    resultados.querySelectorAll('[data-conta]').forEach(item => {
      item.addEventListener('click', () => {
        DESTINATARIO = CONTAS.find(c => c.id === item.dataset.conta);
        busca.value = '';
        resultados.hidden = true;
        const escolhida = document.getElementById('pessoa-escolhida');
        escolhida.hidden = false;
        escolhida.textContent = `Enviando para ${DESTINATARIO.nome || DESTINATARIO.email}`;
      });
    });
  });
}

async function enviar() {
  const titulo = document.getElementById('nova-titulo').value.trim();
  const mensagem = document.getElementById('nova-mensagem').value.trim();
  const link = document.getElementById('nova-link').value.trim();

  if (!titulo) return avisar('Escreva o título.', 'nova-titulo');
  if (!mensagem) return avisar('Escreva o texto da notificação.', 'nova-mensagem');
  if (DESTINO_NOVO === 'individual' && !DESTINATARIO) return avisar('Escolha a pessoa.', 'busca-pessoa');

  Drawer.setFooterBusy(true);

  const { error } = await supabaseClient.from('notificacoes').insert({
    titulo,
    mensagem,
    link_url: link || null,
    link_label: link ? (document.getElementById('nova-link-label').value.trim() || null) : null,
    destino: DESTINO_NOVO,
    destinatario_id: DESTINO_NOVO === 'individual' ? DESTINATARIO.id : null,
    autor_id: window.adminUser.id,
    autor_nome: window.adminUser.name || 'Equipe Love'
  });

  Drawer.setFooterBusy(false);

  if (error) {
    toast(/notificacoes|does not exist|schema cache/i.test(error.message || '')
      ? 'Rode supabase/migrations/031_notificacoes.sql no Supabase.'
      : `Não foi possível enviar: ${error.message}`);
    return;
  }

  Drawer.close();
  toast('Notificação enviada.');
  window.location.reload();
}

function avisar(mensagem, campo) {
  toast(mensagem);
  document.getElementById(campo).focus();
}
