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


const PUBLICOS = {
  todos: 'Todos',
  b2b: 'HUB/B2B',
  anfitriao: 'Anfitriões',
  individual: 'Individual'
};

document.addEventListener('DOMContentLoaded', async () => {
  if (!(await window.adminReady)) return;

  const tbody = document.getElementById('tbody');
  renderLoading(tbody, 6);

  const [notificacoes, leituras, contas] = await Promise.all([
    safeSelect('notificacoes', '*'),
    safeSelect('notificacao_leituras', 'notificacao_id'),
    supabaseClient.rpc('admin_listar_contas')
  ]);

  if (notificacoes.error) return renderError(tbody, 6, notificacoes.error);

  NOTIFICACOES = notificacoes.data;
  LEITURAS = leituras.data || [];
  CONTAS = contas.data || [];

  ligarMenuDeFiltros();
  render();

  document.getElementById('busca').addEventListener('input', render);
  document.getElementById('filtro-perfil').addEventListener('change', render);

  addHeaderAction('Nova notificação', abrirComposicao, {
    icone: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14" /><path d="M5 12h14" /></svg>'
  }).className = 'btn btn-primary';

  moverControlesParaHeader();
});

/* ------------------------------------------------------------------ Lista */

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

  menu.addEventListener('click', e => e.stopPropagation());
  document.addEventListener('click', fechar);
  document.addEventListener('keydown', e => { if (e.key === 'Escape') fechar(); });

  document.getElementById('limpar-filtros').addEventListener('click', () => {
    document.getElementById('filtro-perfil').value = '';
    render();
    fechar();
  });
}

function atualizarBadgeDeFiltros() {
  const badge = document.getElementById('filtro-badge');
  const ativos = document.getElementById('filtro-perfil').value ? 1 : 0;
  badge.textContent = ativos;
  badge.hidden = ativos === 0;
}

/* Filtrar por "HUB/B2B" traz também as enviadas a "Todos": elas chegam ao
   fornecedor do mesmo jeito, e escondê-las daria a impressão de que ele não
   recebeu nada. */
function filtrar() {
  const termo = document.getElementById('busca').value.trim().toLowerCase();
  const perfil = document.getElementById('filtro-perfil').value;

  return NOTIFICACOES.filter(n => {
    if (perfil && n.destino !== perfil && n.destino !== 'todos') return false;
    if (!termo) return true;
    return [n.titulo, n.mensagem].some(v => String(v || '').toLowerCase().includes(termo));
  });
}

/** Primeiras linhas do texto, cortadas onde ainda dá para entender. */
function resumo(texto, limite = 70) {
  const limpo = String(texto || '').replace(/\s+/g, ' ').trim();
  return limpo.length > limite ? `${limpo.slice(0, limite).trimEnd()}…` : limpo;
}

function nomeDaConta(id) {
  const c = CONTAS.find(x => x.id === id);
  return c ? (c.nome || c.email) : 'conta removida';
}

const TIPOS = { padrao: 'Mensagem padrão', boas_vindas: 'Boas-vindas' };

function render() {
  atualizarBadgeDeFiltros();

  const tbody = document.getElementById('tbody');

  // Fixadas primeiro, e dentro de cada grupo da mais nova para a mais velha.
  const lista = filtrar().sort((a, b) =>
    (b.fixada === true) - (a.fixada === true) ||
    new Date(b.created_at) - new Date(a.created_at));

  document.getElementById('contagem-notificacoes').textContent =
    `${formatNumber(lista.length)} ${lista.length === 1 ? 'notificação' : 'notificações'}`;

  if (!lista.length) {
    renderEmpty(tbody, 6, 'Nenhuma notificação encontrada',
      NOTIFICACOES.length
        ? 'Ajuste a busca ou o filtro acima.'
        : 'Clique em "Nova notificação" no cabeçalho para enviar a primeira.');
    return;
  }

  tbody.innerHTML = lista.map(n => {
    const views = LEITURAS.filter(l => l.notificacao_id === n.id).length;
    const perfil = n.destino === 'individual'
      ? `Individual <span class="cell-muted">· ${escapeHtml(nomeDaConta(n.destinatario_id))}</span>`
      : escapeHtml(PUBLICOS[n.destino] || n.destino);

    return `
      <tr data-id="${n.id}">
        <td class="col-selecao">
          <button type="button" class="btn-fixar ${n.fixada ? 'is-fixada' : ''}" data-fixar="${n.id}"
                  title="${n.fixada ? 'Desafixar' : 'Fixar no topo'}"
                  aria-label="${n.fixada ? 'Desafixar' : 'Fixar no topo'}">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
              <path d="M15 4.5l-4 4l-4 1.5l-1.5 1.5l7 7l1.5 -1.5l1.5 -4l4 -4" /><path d="M9 15l-4.5 4.5" /><path d="M14.5 4l5.5 5.5" />
            </svg>
          </button>
        </td>
        <td>
          <span class="cell-strong">${dash(n.titulo)}</span>
          ${TIPOS[n.tipo] ? `<span class="artigo-situacao">— ${escapeHtml(TIPOS[n.tipo])}</span>` : ''}
        </td>
        <td class="cell-muted">${escapeHtml(resumo(n.mensagem))}</td>
        <td class="cell-muted">${perfil}</td>
        <td class="cell-muted">${escapeHtml(formatDate(n.created_at))}</td>
        <td class="col-numero ${views ? '' : 'cell-muted'}">${views ? formatNumber(views) : '—'}</td>
      </tr>`;
  }).join('');

  // Fixar não abre o detalhe: são intenções diferentes na mesma linha.
  tbody.querySelectorAll('[data-fixar]').forEach(btn => {
    btn.addEventListener('click', e => { e.stopPropagation(); fixar(btn.dataset.fixar); });
  });

  tbody.querySelectorAll('tr[data-id]').forEach(tr => {
    tr.addEventListener('click', () => abrirDetalhe(tr.dataset.id));
  });
}

async function fixar(id) {
  const n = NOTIFICACOES.find(x => x.id === id);
  const novo = !n.fixada;

  const { error } = await supabaseClient.from('notificacoes').update({ fixada: novo }).eq('id', id);

  if (error) {
    toast(/fixada|column|schema cache/i.test(error.message || '')
      ? 'Rode supabase/migrations/032_notificacoes_fixar_tipo.sql no Supabase.'
      : `Não foi possível fixar: ${error.message}`);
    return;
  }

  n.fixada = novo;
  render();
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

let DESTINATARIO = null;

function abrirComposicao() {
  DESTINATARIO = null;

  Drawer.open({
    title: 'Nova notificação',
    body: `
      <label class="field">
        <span class="field-label">Destinatário <span class="campo-obrigatorio">*</span></span>
        <select class="field-select" id="nova-destino">
          ${Object.entries(PUBLICOS).map(([valor, rotulo]) =>
            `<option value="${valor}">${escapeHtml(rotulo)}</option>`).join('')}
        </select>
      </label>

      <div class="field" id="campo-destinatario" hidden>
        <span class="field-label">Pessoa <span class="campo-obrigatorio">*</span></span>
        <input class="field-input" id="busca-pessoa" type="text" autocomplete="off"
               placeholder="Digite o nome ou o e-mail">
        <div class="pessoa-resultados" id="pessoa-resultados" hidden></div>
        <p class="pessoa-escolhida" id="pessoa-escolhida" hidden></p>
      </div>

      <label class="field">
        <span class="field-label">Assunto <span class="campo-obrigatorio">*</span></span>
        <input class="field-input" id="nova-titulo" type="text" maxlength="80" autocomplete="off">
      </label>

      <label class="field">
        <span class="field-label">Texto <span class="campo-obrigatorio">*</span></span>
        <textarea class="field-textarea" id="nova-mensagem" maxlength="400"></textarea>
      </label>

      <label class="field">
        <span class="field-label">Link</span>
        <input class="field-input" id="nova-link" type="url" placeholder="https://" autocomplete="off">
      </label>

      <label class="field">
        <span class="field-label">Texto do link</span>
        <input class="field-input" id="nova-link-label" type="text" autocomplete="off">
      </label>

      <label class="field" style="margin-bottom:0">
        <span class="field-label">Salvar como</span>
        <select class="field-select" id="nova-tipo">
          <option value="comum">Notificação avulsa</option>
          <option value="padrao">Mensagem padrão</option>
          <option value="boas_vindas">Notificação de boas-vindas</option>
        </select>
      </label>

      <p class="aviso-tipo" id="aviso-tipo" hidden></p>`,
    footer: `
      <button type="button" class="btn btn-ghost" id="btn-cancelar">Cancelar</button>
      <button type="button" class="btn btn-primary" id="btn-enviar">Enviar</button>`
  });

  ligarComposicao();
}

function ligarComposicao() {
  document.getElementById('btn-cancelar').addEventListener('click', () => Drawer.close());
  document.getElementById('btn-enviar').addEventListener('click', enviar);

  document.getElementById('nova-destino').addEventListener('change', (e) => {
    document.getElementById('campo-destinatario').hidden = e.target.value !== 'individual';
  });

  /* Mensagem padrão e boas-vindas são únicas. O banco garante isso por
     índice; aqui o aviso aparece antes, dizendo qual já ocupa o lugar. */
  document.getElementById('nova-tipo').addEventListener('change', (e) => {
    const aviso = document.getElementById('aviso-tipo');
    const existente = NOTIFICACOES.find(n => n.tipo === e.target.value);

    if (!existente) { aviso.hidden = true; return; }

    aviso.hidden = false;
    aviso.innerHTML = `Já existe outra: <strong>${escapeHtml(existente.titulo)}</strong>.
      Troque o tipo dela antes, ou escolha outra opção aqui.`;
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
  const destino = document.getElementById('nova-destino').value;
  const tipo = document.getElementById('nova-tipo').value;
  const titulo = document.getElementById('nova-titulo').value.trim();
  const mensagem = document.getElementById('nova-mensagem').value.trim();
  const link = document.getElementById('nova-link').value.trim();

  if (!titulo) return avisar('Escreva o assunto.', 'nova-titulo');
  if (!mensagem) return avisar('Escreva o texto da notificação.', 'nova-mensagem');
  if (destino === 'individual' && !DESTINATARIO) return avisar('Escolha a pessoa.', 'busca-pessoa');

  const jaExiste = tipo !== 'comum' && NOTIFICACOES.find(n => n.tipo === tipo);
  if (jaExiste) {
    toast(`Já existe outra "${jaExiste.titulo}" como ${TIPOS[tipo].toLowerCase()}.`);
    return;
  }

  Drawer.setFooterBusy(true);

  const { error } = await supabaseClient.from('notificacoes').insert({
    titulo,
    mensagem,
    link_url: link || null,
    link_label: link ? (document.getElementById('nova-link-label').value.trim() || null) : null,
    destino,
    tipo,
    destinatario_id: destino === 'individual' ? DESTINATARIO.id : null,
    autor_id: window.adminUser.id,
    autor_nome: window.adminUser.name || 'Equipe Love'
  });

  Drawer.setFooterBusy(false);

  if (error) {
    const faltaColuna = /tipo|fixada|column|schema cache/i.test(error.message || '');
    const duplicada = /duplicate|unique/i.test(error.message || '');
    toast(duplicada ? `Já existe outra notificação como ${TIPOS[tipo].toLowerCase()}.`
        : faltaColuna ? 'Rode supabase/migrations/032_notificacoes_fixar_tipo.sql no Supabase.'
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
