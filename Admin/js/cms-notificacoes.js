/* ==========================================================================
   LOVE ADMIN — CMS: notificações

   A notificação é escrita uma vez e endereçada a um público, não copiada
   para cada destinatário. Isso mantém o envio barato e permite corrigir ou
   apagar a mensagem depois sem caçar cópias espalhadas.

   Só texto e link — notificação não carrega imagem.

   Agendar é gravar a data de envio em `created_at`: enquanto ela está no
   futuro, a policy do banco esconde a notificação de todo mundo menos do
   admin (supabase/migrations/039_notificacoes_agendadas.sql).
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
  renderLoading(tbody, 5);

  const [notificacoes, leituras, contas] = await Promise.all([
    safeSelect('notificacoes', '*'),
    safeSelect('notificacao_leituras', 'notificacao_id'),
    supabaseClient.rpc('admin_listar_contas')
  ]);

  if (notificacoes.error) return renderError(tbody, 5, notificacoes.error);

  NOTIFICACOES = notificacoes.data;
  LEITURAS = leituras.data || [];
  CONTAS = contas.data || [];

  ligarMenuDeFiltros();
  render();

  document.getElementById('busca').addEventListener('input', render);
  document.getElementById('filtro-perfil').addEventListener('change', render);
  document.getElementById('filtro-status').addEventListener('change', render);

  addHeaderAction('Nova notificação', abrirComposicao, {
    principal: true,
    icone: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14" /><path d="M5 12h14" /></svg>'
  });

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
    document.getElementById('filtro-status').value = '';
    render();
    fechar();
  });
}

function atualizarBadgeDeFiltros() {
  const badge = document.getElementById('filtro-badge');
  const ativos = ['filtro-perfil', 'filtro-status']
    .filter(id => document.getElementById(id).value).length;
  badge.textContent = ativos;
  badge.hidden = ativos === 0;
}

/** Agendada = data de envio ainda no futuro. */
const agendada = n => new Date(n.created_at) > new Date();

/* Filtrar por "HUB/B2B" traz também as enviadas a "Todos": elas chegam ao
   fornecedor do mesmo jeito, e escondê-las daria a impressão de que ele não
   recebeu nada. */
function filtrar() {
  const termo = document.getElementById('busca').value.trim().toLowerCase();
  const perfil = document.getElementById('filtro-perfil').value;
  const status = document.getElementById('filtro-status').value;

  return NOTIFICACOES.filter(n => {
    if (perfil && n.destino !== perfil && n.destino !== 'todos') return false;
    if (status && (status === 'agendada') !== agendada(n)) return false;
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

/* Tema = ícone e cor da caixinha com que a notificação aparece na
   plataforma. Os mesmos desenhos de NOTIFICATION_THEMES em js/app.js. */
const TEMAS = {
  padrao: { rotulo: 'Padrão', icone: 'M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9' },
  viagens: { rotulo: 'Viagens', icone: 'M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z' },
  beneficios: { rotulo: 'Benefícios', icone: 'M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z' },
  novidades: { rotulo: 'Novidades', icone: 'M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z' },
  aviso: { rotulo: 'Aviso', icone: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z' }
};

/** Caixinha colorida com o ícone do tema, igual à da plataforma. */
function iconeTema(tema) {
  const chave = TEMAS[tema] ? tema : 'padrao';
  return `<span class="tema-icone tema-${chave}" aria-hidden="true">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="${TEMAS[chave].icone}"/></svg>
  </span>`;
}

function render() {
  atualizarBadgeDeFiltros();

  const tbody = document.getElementById('tbody');

  // Fixadas primeiro, e dentro de cada grupo da mais nova para a mais velha.
  const lista = filtrar().sort((a, b) =>
    (b.fixada === true) - (a.fixada === true) ||
    new Date(b.created_at) - new Date(a.created_at));

  if (!lista.length) {
    renderEmpty(tbody, 5, 'Nenhuma notificação encontrada',
      NOTIFICACOES.length
        ? 'Ajuste a busca ou o filtro acima.'
        : 'Clique em "Nova notificação" no cabeçalho para enviar a primeira.');
    return;
  }

  tbody.innerHTML = lista.map(n => {
    const views = LEITURAS.filter(l => l.notificacao_id === n.id).length;

    return `
      <tr data-id="${n.id}">
        <td class="col-assunto">
          ${iconeTema(n.tema)}
          <span class="cell-strong">${dash(n.titulo)}</span>
          ${TIPOS[n.tipo] ? `<span class="artigo-situacao">— ${escapeHtml(TIPOS[n.tipo])}</span>` : ''}
        </td>
        <td class="cell-muted">${escapeHtml(resumo(n.mensagem))}</td>
        <td class="cell-muted">${agendada(n)
          ? `${badge('Agendada', 'badge-warning')} ${escapeHtml(formatDateTime(n.created_at))}`
          : escapeHtml(formatDate(n.created_at))}</td>
        <td class="col-numero ${views ? '' : 'cell-muted'}">${views ? formatNumber(views) : '—'}</td>
        <td class="col-fixar">
          <button type="button" class="btn-fixar ${n.fixada ? 'is-fixada' : ''}" data-fixar="${n.id}"
                  title="${n.fixada ? 'Desafixar' : 'Fixar no topo'}"
                  aria-label="${n.fixada ? 'Desafixar' : 'Fixar no topo'}">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
              <path d="M15 4.5l-4 4l-4 1.5l-1.5 1.5l7 7l1.5 -1.5l1.5 -4l4 -4" /><path d="M9 15l-4.5 4.5" /><path d="M14.5 4l5.5 5.5" />
            </svg>
          </button>
        </td>
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
        ${linha('Tema', `${iconeTema(n.tema)} ${escapeHtml(TEMAS[n.tema]?.rotulo || 'Padrão')}`)}
        ${linha('Público', n.destino === 'individual'
          ? escapeHtml(nomeDaConta(n.destinatario_id))
          : escapeHtml(PUBLICOS[n.destino] || n.destino))}
        ${linha(agendada(n) ? 'Agendada para' : 'Enviada em', escapeHtml(formatDateTime(n.created_at)))}
        ${linha(agendada(n) ? 'Agendada por' : 'Enviada por', escapeHtml(n.autor_nome || '—'))}
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

      <div class="field">
        <span class="field-label">Tema</span>
        <div class="tema-opcoes" role="radiogroup" aria-label="Tema">
          ${Object.entries(TEMAS).map(([valor, t], i) => `
            <label class="tema-opcao">
              <input type="radio" name="nova-tema" value="${valor}" ${i === 0 ? 'checked' : ''}>
              ${iconeTema(valor)}
              <span>${escapeHtml(t.rotulo)}</span>
            </label>`).join('')}
        </div>
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

      <p class="aviso-tipo" id="aviso-tipo" hidden></p>

      <label class="field" style="margin:.875rem 0 0">
        <span class="field-label">Quando enviar</span>
        <select class="field-select" id="nova-quando">
          <option value="agora">Agora</option>
          <option value="agendar">Agendar data e horário</option>
        </select>
      </label>

      <div id="campo-agendamento" hidden style="margin-top:.875rem">
      <div class="field-row">
        <label class="field" style="margin-bottom:0">
          <span class="field-label">Data <span class="campo-obrigatorio">*</span></span>
          <input class="field-input" id="nova-data" type="date">
        </label>
        <label class="field" style="margin-bottom:0">
          <span class="field-label">Horário <span class="campo-obrigatorio">*</span></span>
          <input class="field-input" id="nova-hora" type="time">
        </label>
      </div>
      <p class="cell-muted" style="font-size:.75rem;margin:.375rem 0 0">Horário de Brasília</p>
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

  document.getElementById('nova-quando').addEventListener('change', (e) => {
    const agendar = e.target.value === 'agendar';
    document.getElementById('campo-agendamento').hidden = !agendar;
    document.getElementById('btn-enviar').textContent = agendar ? 'Agendar' : 'Enviar';
    if (agendar) {
      const data = document.getElementById('nova-data');
      data.min = dataLocal(new Date());
      if (!data.value) data.value = data.min;
      data.focus();
    }
  });

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
  const tema = document.querySelector('input[name="nova-tema"]:checked')?.value || 'padrao';
  const titulo = document.getElementById('nova-titulo').value.trim();
  const mensagem = document.getElementById('nova-mensagem').value.trim();
  const link = document.getElementById('nova-link').value.trim();

  if (!titulo) return avisar('Escreva o assunto.', 'nova-titulo');
  if (!mensagem) return avisar('Escreva o texto da notificação.', 'nova-mensagem');
  if (destino === 'individual' && !DESTINATARIO) return avisar('Escolha a pessoa.', 'busca-pessoa');

  let envio = null;
  if (document.getElementById('nova-quando').value === 'agendar') {
    const data = document.getElementById('nova-data').value;
    const hora = document.getElementById('nova-hora').value;
    if (!data) return avisar('Escolha a data do envio.', 'nova-data');
    if (!hora) return avisar('Escolha o horário do envio.', 'nova-hora');

    // Sempre horário de Brasília (UTC−3, sem horário de verão desde 2019),
    // mesmo que quem agenda esteja com o computador em outro fuso.
    envio = new Date(`${data}T${hora}:00-03:00`);
    if (Number.isNaN(envio.getTime())) return avisar('Data ou horário inválido.', 'nova-data');
    if (envio <= new Date()) return avisar('Escolha um horário no futuro.', 'nova-hora');
  }

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
    tema,
    destinatario_id: destino === 'individual' ? DESTINATARIO.id : null,
    autor_id: window.adminUser.id,
    autor_nome: window.adminUser.name || 'Equipe Love',
    ...(envio ? { created_at: envio.toISOString() } : {})
  });

  Drawer.setFooterBusy(false);

  if (error) {
    const faltaTema = /tema/i.test(error.message || '');
    const faltaColuna = /tipo|fixada|column|schema cache/i.test(error.message || '');
    const duplicada = /duplicate|unique/i.test(error.message || '');
    toast(duplicada ? `Já existe outra notificação como ${TIPOS[tipo].toLowerCase()}.`
        : faltaTema ? 'Rode supabase/migrations/040_notificacoes_tema.sql no Supabase.'
        : faltaColuna ? 'Rode supabase/migrations/032_notificacoes_fixar_tipo.sql no Supabase.'
        : `Não foi possível enviar: ${error.message}`);
    return;
  }

  Drawer.close();
  toast(envio ? `Notificação agendada para ${formatDateTime(envio)}.` : 'Notificação enviada.');
  window.location.reload();
}

function avisar(mensagem, campo) {
  toast(mensagem);
  document.getElementById(campo).focus();
}

/** Data local no formato do <input type="date">, sem passar por UTC. */
function dataLocal(d) {
  const dois = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${dois(d.getMonth() + 1)}-${dois(d.getDate())}`;
}
