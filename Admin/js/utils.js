/* ==========================================================================
   LOVE ADMIN — Utilitários compartilhados
   ========================================================================== */

/* ------------------------------------------------------------ Formatação */

const BRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

function formatCurrency(value) {
  return BRL.format(Number(value) || 0);
}

function formatNumber(value) {
  return new Intl.NumberFormat('pt-BR').format(Number(value) || 0);
}

/* ------------------------------------------------------------ Convidados
   Uma linha de `convidados` é uma reserva: o convidado e os acompanhantes
   dele, guardados em `extra` pela plataforma. Conta-se pessoas, não
   linhas — a mesma regra de pessoasDaReserva em js/app.js (1 + 1 = 2). */

function pessoasDoConvidado(g) {
  const extra = (g && g.extra) || {};
  const nomes = (extra.companionsNames || []).filter(n => String(n || '').trim()).length;
  const detalhados = (extra.companionsDetailed || []).length;
  return 1 + Math.max(nomes, detalhados, parseInt(extra.companions, 10) || 0);
}

/** Crianças na reserva: o próprio convidado, se for criança, e os acompanhantes criança/bebê. */
function criancasDoConvidado(g) {
  const extra = (g && g.extra) || {};
  const acompanhantes = Number.isFinite(extra.children)
    ? extra.children
    : (extra.companionsDetailed || []).filter(c => c.ageGroup === 'child' || c.ageGroup === 'baby').length;
  return acompanhantes + (g.tipo === 'crianca' ? 1 : 0);
}

function formatDate(value) {
  if (!value) return '—';
  // Datas puras (YYYY-MM-DD) são interpretadas como UTC pelo Date e podem
  // "voltar um dia" no fuso do Brasil — por isso monta na mão.
  const dateOnly = /^\d{4}-\d{2}-\d{2}$/.exec(String(value));
  if (dateOnly) {
    const [y, m, d] = value.split('-');
    return `${d}/${m}/${y}`;
  }
  const dt = new Date(value);
  if (Number.isNaN(dt.getTime())) return '—';
  return dt.toLocaleDateString('pt-BR');
}

function formatDateTime(value) {
  if (!value) return '—';
  const dt = new Date(value);
  if (Number.isNaN(dt.getTime())) return '—';
  return dt.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function formatRelative(value) {
  if (!value) return '—';
  const dt = new Date(value);
  if (Number.isNaN(dt.getTime())) return '—';
  const diff = Date.now() - dt.getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return 'agora';
  if (min < 60) return `há ${min} min`;
  const hours = Math.floor(min / 60);
  if (hours < 24) return `há ${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `há ${days}d`;
  return formatDate(value);
}

function initials(name) {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '—';
  return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
}

/** Escapa texto vindo do banco antes de injetar em innerHTML. */
function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function dash(value) {
  const str = String(value ?? '').trim();
  return str ? escapeHtml(str) : '<span class="cell-muted">—</span>';
}

/* --------------------------------------------------------------- Rótulos */

const EVENT_TYPE_LABELS = {
  wedding: 'Casamento',
  baby: 'Chá de bebê',
  birthday: 'Aniversário',
  corporate: 'Corporativo',
  other: 'Outro'
};

const TICKET_STATUS_LABELS = {
  aberto: 'Aberto',
  em_andamento: 'Em andamento',
  resolvido: 'Resolvido',
  fechado: 'Fechado'
};

const TICKET_STATUS_BADGE = {
  aberto: 'badge-warning',
  em_andamento: 'badge-info',
  resolvido: 'badge-success',
  fechado: 'badge'
};

const ORIGEM_LABELS = {
  site: 'Site público',
  cliente: 'Plataforma (cliente)',
  fornecedor: 'B2B (fornecedor)'
};

function badge(text, variant) {
  return `<span class="badge ${variant || ''}">${escapeHtml(text)}</span>`;
}

/* ----------------------------------------------------------------- Toast */

let toastTimer = null;

function toast(message) {
  let el = document.getElementById('admin-toast');
  if (!el) {
    el = document.createElement('div');
    el.id = 'admin-toast';
    el.className = 'toast';
    document.body.appendChild(el);
  }
  el.textContent = message;
  el.classList.add('is-open');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('is-open'), 2800);
}

/* ---------------------------------------------------------------- Drawer */

/**
 * Painel lateral de detalhe/edição. Reutilizado por todas as páginas.
 * Cria o backdrop e o container uma única vez e depois só troca o conteúdo.
 */
const Drawer = {
  _built: false,

  _build() {
    if (this._built) return;
    const backdrop = document.createElement('div');
    backdrop.className = 'drawer-backdrop';
    backdrop.id = 'drawer-backdrop';
    backdrop.addEventListener('click', () => Drawer.close());

    const panel = document.createElement('aside');
    panel.className = 'drawer';
    panel.id = 'drawer-panel';
    panel.innerHTML = `
      <header class="drawer-head">
        <button type="button" class="drawer-back" id="drawer-back" aria-label="Voltar" hidden>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7"/></svg>
        </button>
        <div style="flex:1;min-width:0">
          <h2 id="drawer-title">Detalhes</h2>
          <p id="drawer-subtitle"></p>
        </div>
        <button type="button" class="btn btn-ghost btn-sm" id="drawer-close" aria-label="Fechar">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" d="M6 18 18 6M6 6l12 12"/></svg>
        </button>
      </header>
      <div class="drawer-body" id="drawer-body"></div>
      <footer class="drawer-foot" id="drawer-foot"></footer>`;

    document.body.append(backdrop, panel);
    panel.querySelector('#drawer-close').addEventListener('click', () => Drawer.close());
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') Drawer.close(); });
    this._built = true;
  },

  /** `back`, quando informado, mostra a seta de voltar no cabeçalho. */
  open({ title, subtitle, subtitleHtml, body, footer, back }) {
    this._build();

    const btnBack = document.getElementById('drawer-back');
    btnBack.hidden = !back;
    btnBack.onclick = back || null;

    document.getElementById('drawer-title').textContent = title || 'Detalhes';
    const sub = document.getElementById('drawer-subtitle');
    // textContent por padrão; só quem passa subtitleHtml assume o escape.
    if (subtitleHtml) sub.innerHTML = subtitleHtml;
    else sub.textContent = subtitle || '';
    document.getElementById('drawer-body').innerHTML = body || '';
    document.getElementById('drawer-foot').innerHTML = footer || '';
    document.getElementById('drawer-backdrop').classList.add('is-open');
    document.getElementById('drawer-panel').classList.add('is-open');
    document.body.style.overflow = 'hidden';
  },

  close() {
    if (!this._built) return;
    document.getElementById('drawer-backdrop').classList.remove('is-open');
    document.getElementById('drawer-panel').classList.remove('is-open');
    document.body.style.overflow = '';
  },

  setFooterBusy(busy) {
    const foot = document.getElementById('drawer-foot');
    if (foot) foot.querySelectorAll('button').forEach(b => { b.disabled = busy; });
  }
};

/* ---------------------------------------------------- Estados de tabela */

function renderEmpty(tbody, colspan, title, text) {
  tbody.innerHTML = `
    <tr class="no-hover"><td colspan="${colspan}">
      <div class="empty-state">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path stroke-linecap="round" stroke-linejoin="round" d="M3.75 6A2.25 2.25 0 0 1 6 3.75h12A2.25 2.25 0 0 1 20.25 6v12A2.25 2.25 0 0 1 18 20.25H6A2.25 2.25 0 0 1 3.75 18V6Z"/><path stroke-linecap="round" d="M7.5 9h9M7.5 12.75h6"/></svg>
        <strong>${escapeHtml(title)}</strong>
        <p>${escapeHtml(text)}</p>
      </div>
    </td></tr>`;
}

function renderLoading(tbody, colspan, rows = 5) {
  tbody.innerHTML = Array.from({ length: rows }, () =>
    `<tr class="no-hover"><td colspan="${colspan}"><div class="skeleton" style="width:${60 + Math.floor(Math.random() * 35)}%"></div></td></tr>`
  ).join('');
}

/**
 * Erro de consulta. O caso mais comum aqui é a migration 004_admin.sql ainda
 * não ter sido rodada — então a mensagem diz isso em vez de só "erro".
 */
function renderError(tbody, colspan, error) {
  const missingTable = error && (error.code === '42P01' || /does not exist/i.test(error.message || ''));
  const title = missingTable ? 'Tabela ainda não existe no banco' : 'Não foi possível carregar';
  const text = missingTable
    ? 'Rode supabase/migrations/004_admin.sql no SQL Editor do Supabase para criar as tabelas do Admin.'
    : (error?.message || 'Erro desconhecido ao consultar o banco.');
  renderEmpty(tbody, colspan, title, text);
}

/* ------------------------------------------------------------- Consultas */

/** Soma `amount` de créditos menos débitos de uma lista de transações. */
function walletBalance(transactions) {
  return (transactions || []).reduce(
    (sum, t) => sum + (t.type === 'credit' ? Number(t.amount) || 0 : -(Number(t.amount) || 0)),
    0
  );
}

/** Agrupa linhas por uma chave, devolvendo um Map. */
function groupBy(rows, key) {
  const map = new Map();
  (rows || []).forEach(row => {
    const k = row[key];
    if (!map.has(k)) map.set(k, []);
    map.get(k).push(row);
  });
  return map;
}

/**
 * Consulta tolerante: se a tabela ainda não existe (migration não rodada),
 * devolve lista vazia em vez de quebrar a página inteira.
 */
async function safeSelect(table, columns = '*', tweak) {
  let query = supabaseClient.from(table).select(columns);
  if (tweak) query = tweak(query);
  const { data, error } = await query;
  if (error) {
    console.warn(`[admin] falha ao consultar "${table}":`, error.message);
    return { data: [], error };
  }
  return { data: data || [], error: null };
}

/* --------------------------------------------------------- Exportar CSV */

/**
 * Baixa uma lista como CSV. Usa ponto e vírgula e BOM porque é o que o
 * Excel em português entende sem pedir importação manual.
 *
 * @param {string} nomeArquivo  sem extensão
 * @param {Array<{titulo: string, valor: Function}>} colunas
 * @param {Array<Object>} linhas
 */
function exportarCSV(nomeArquivo, colunas, linhas) {
  const escapar = (valor) => {
    const texto = String(valor ?? '').replace(/"/g, '""');
    return `"${texto}"`;
  };

  const conteudo = [
    colunas.map(c => escapar(c.titulo)).join(';'),
    ...linhas.map(linha => colunas.map(c => escapar(c.valor(linha))).join(';'))
  ].join('\r\n');

  const blob = new Blob(['﻿' + conteudo], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  const hoje = new Date().toISOString().slice(0, 10);
  link.href = url;
  link.download = `${nomeArquivo}-${hoje}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);

  toast(`${formatNumber(linhas.length)} registro(s) exportado(s).`);
}

/** Cria o botão de ação no cabeçalho da página (ao lado do título). */
function addHeaderAction(texto, aoClicar, { icone } = {}) {
  const host = document.getElementById('header-actions');
  if (!host) return null;

  const botao = document.createElement('button');
  botao.type = 'button';
  botao.className = 'btn btn-ghost';
  // Seta para cima, saindo da bandeja: exportar. A de baixo seria importar.
  // `icone: null` pede um botão só de texto; omitir usa o padrão.
  const padrao = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2 -2v-2" /><path d="M7 9l5 -5l5 5" /><path d="M12 4l0 12" /></svg>';

  botao.innerHTML = `
    ${icone === null ? '' : (icone || padrao)}
    <span>${escapeHtml(texto)}</span>`;
  botao.addEventListener('click', aoClicar);
  host.appendChild(botao);
  return botao;
}

/**
 * Numera cadastros pela ordem de entrada: 1 para o mais antigo. É por
 * plataforma — no dashboard, onde as duas aparecem juntas, quem desfaz a
 * ambiguidade é a coluna Canal ao lado.
 *
 * É posicional, não persistente: excluir um cadastro faz os posteriores
 * subirem. O identificador estável continua sendo o UID.
 */
function sequenciaDeCadastro(linhas) {
  return new Map(
    (linhas || [])
      .slice()
      .sort((a, b) => new Date(a.created_at || 0) - new Date(b.created_at || 0))
      .map((linha, i) => [linha.id, String(i + 1)])
  );
}

/* ------------------------------------------------------------- Modal

   Diálogo curto e centrado, para decisões que não cabem num drawer: uma
   pergunta e até três saídas. O Drawer é para examinar um registro; isto
   é para confirmar uma ação sobre vários.
   -------------------------------------------------------------------- */

const Modal = {
  _built: false,

  _build() {
    if (this._built) return;

    const fundo = document.createElement('div');
    fundo.className = 'modal-fundo';
    fundo.id = 'modal-fundo';
    fundo.innerHTML = `
      <div class="modal-caixa" role="dialog" aria-modal="true" aria-labelledby="modal-titulo">
        <h2 class="modal-titulo" id="modal-titulo"></h2>
        <p class="modal-texto" id="modal-texto"></p>
        <div class="modal-acoes" id="modal-acoes"></div>
      </div>`;

    // Clicar fora fecha; clicar dentro, não.
    fundo.addEventListener('click', () => Modal.fechar());
    fundo.querySelector('.modal-caixa').addEventListener('click', e => e.stopPropagation());
    document.addEventListener('keydown', e => { if (e.key === 'Escape') Modal.fechar(); });

    document.body.appendChild(fundo);
    this._built = true;
  },

  /** `acoes`: [{ rotulo, classe, aoClicar }] — a última fica à direita. */
  abrir({ titulo, texto, acoes = [] }) {
    this._build();

    document.getElementById('modal-titulo').textContent = titulo || '';
    document.getElementById('modal-texto').textContent = texto || '';

    const host = document.getElementById('modal-acoes');
    host.innerHTML = '';

    acoes.forEach(acao => {
      const botao = document.createElement('button');
      botao.type = 'button';
      botao.className = `btn ${acao.classe || 'btn-ghost'}`;
      botao.textContent = acao.rotulo;
      botao.addEventListener('click', () => acao.aoClicar?.(botao));
      host.appendChild(botao);
    });

    document.getElementById('modal-fundo').classList.add('is-open');
    document.body.style.overflow = 'hidden';
  },

  ocupado(estado) {
    document.querySelectorAll('#modal-acoes .btn').forEach(b => { b.disabled = estado; });
  },

  fechar() {
    const fundo = document.getElementById('modal-fundo');
    if (!fundo) return;
    fundo.classList.remove('is-open');
    document.body.style.overflow = '';
  }
};

/* ------------------------------------------------------- Busca global */

/**
 * Paleta de busca do cabeçalho (o mesmo ⌘K do B2B). Carrega as tabelas na
 * primeira abertura e mantém em memória enquanto a página viver.
 */
const Busca = {
  _montada: false,
  _dados: null,

  _montar() {
    if (this._montada) return;

    const fundo = document.createElement('div');
    fundo.className = 'busca-backdrop';
    fundo.id = 'busca-backdrop';
    fundo.innerHTML = `
      <div class="busca-card" role="dialog" aria-label="Busca">
        <div class="busca-campo">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 10a7 7 0 1 0 14 0a7 7 0 1 0 -14 0" /><path d="M21 21l-6 -6" /></svg>
          <input type="text" id="busca-input" placeholder="Buscar fornecedor, cliente, evento ou chamado…" autocomplete="off">
          <kbd>ESC</kbd>
        </div>
        <div class="busca-resultados" id="busca-resultados"></div>
      </div>`;

    document.body.appendChild(fundo);

    fundo.addEventListener('click', (e) => { if (e.target === fundo) Busca.fechar(); });
    document.getElementById('busca-input').addEventListener('input', (e) => Busca._render(e.target.value));

    this._montada = true;
  },

  async abrir() {
    this._montar();
    document.getElementById('busca-backdrop').classList.add('is-open');
    document.body.style.overflow = 'hidden';

    const campo = document.getElementById('busca-input');
    campo.value = '';
    campo.focus();

    this._render('');
    if (!this._dados) await this._carregar();
    this._render(campo.value);
  },

  fechar() {
    const fundo = document.getElementById('busca-backdrop');
    if (!fundo) return;
    fundo.classList.remove('is-open');
    document.body.style.overflow = '';
  },

  async _carregar() {
    const [fornecedores, clientes, eventos, tickets] = await Promise.all([
      safeSelect('fornecedores', 'id, company_name, email, cnpj'),
      safeSelect('clientes', 'id, couple_name, email, phone'),
      safeSelect('eventos', 'id, titulo, host_name, slug, tipo'),
      safeSelect('tickets', 'id, protocolo, nome, email, assunto')
    ]);

    this._dados = [
      ...fornecedores.data.map(f => ({
        grupo: 'Fornecedores', titulo: f.company_name,
        sub: [f.email, f.cnpj].filter(Boolean).join(' · '),
        href: `fornecedores.html?q=${encodeURIComponent(f.company_name || '')}`
      })),
      ...clientes.data.map(c => ({
        grupo: 'Clientes', titulo: c.couple_name,
        sub: [c.email, c.phone].filter(Boolean).join(' · '),
        href: `clientes.html?q=${encodeURIComponent(c.couple_name || '')}`
      })),
      ...eventos.data.map(e => ({
        grupo: 'Eventos', titulo: e.titulo,
        sub: [EVENT_TYPE_LABELS[e.tipo] || e.tipo, e.host_name].filter(Boolean).join(' · '),
        href: `eventos.html?q=${encodeURIComponent(e.titulo || '')}`
      })),
      ...tickets.data.map(t => ({
        grupo: 'Atendimento', titulo: t.assunto,
        sub: [t.protocolo, t.nome].filter(Boolean).join(' · '),
        href: `atendimento.html?q=${encodeURIComponent(t.protocolo || '')}`
      }))
    ];
  },

  _render(termo) {
    const host = document.getElementById('busca-resultados');
    const busca = termo.trim().toLowerCase();

    if (!this._dados) {
      host.innerHTML = `<p class="busca-vazio">Carregando…</p>`;
      return;
    }

    if (!busca) {
      host.innerHTML = `<p class="busca-vazio">Digite para buscar em fornecedores, clientes, eventos e chamados.</p>`;
      return;
    }

    const achados = this._dados
      .filter(i => `${i.titulo} ${i.sub}`.toLowerCase().includes(busca))
      .slice(0, 20);

    if (!achados.length) {
      host.innerHTML = `<p class="busca-vazio">Nada encontrado para “${escapeHtml(termo)}”.</p>`;
      return;
    }

    let grupoAtual = null;
    host.innerHTML = achados.map(i => {
      const cabecalho = i.grupo !== grupoAtual ? `<p class="busca-grupo">${i.grupo}</p>` : '';
      grupoAtual = i.grupo;
      return `${cabecalho}
        <a class="busca-item" href="${i.href}">
          <span class="titulo">${escapeHtml(i.titulo || '—')}</span>
          ${i.sub ? `<span class="sub">${escapeHtml(i.sub)}</span>` : ''}
        </a>`;
    }).join('');
  }
};

// ⌘K / Ctrl+K abre; ESC fecha.
document.addEventListener('keydown', (e) => {
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
    e.preventDefault();
    Busca.abrir();
  }
  if (e.key === 'Escape') Busca.fechar();
});

/** Preenche o campo de busca da página a partir do ?q= da URL. */
function aplicarBuscaDaUrl(input) {
  const q = new URLSearchParams(location.search).get('q');
  if (q && input) {
    input.value = q;
    input.dispatchEvent(new Event('input'));
  }
}


/**
 * Move os controles da página (busca, filtros) para dentro do cabeçalho,
 * à esquerda dos botões de ação.
 */
function moverControlesParaHeader(seletor = '#page-controls') {
  const controles = document.querySelector(seletor);
  const host = document.getElementById('header-actions');
  if (!controles || !host) return;

  // O primeiro botão de ação marca onde os controles entram — inserir antes
  // dele, na ordem original, mantém busca e filtros à esquerda do Exportar.
  const ancora = host.firstChild;
  [...controles.children].forEach(filho => host.insertBefore(filho, ancora));
  controles.remove();
}

/* ------------------------------------------ Conteúdo: campos comuns
   Usados pelos dashboards de conteúdo e pelo Conteúdo do Hub. */

/** Imagens enviadas pelo Admin vão para o bucket público do blog. */
const BUCKET_IMAGENS = 'blog';

/** Sobe uma imagem e devolve a URL pública. Mostra o erro e devolve null. */
async function enviarImagem(file, pasta) {
  if (file.size > 5 * 1024 * 1024) {
    toast('A imagem precisa ter até 5 MB.');
    return null;
  }

  const extensao = (file.name.split('.').pop() || 'jpg').toLowerCase();
  const caminho = `${pasta}/${Date.now()}-${Math.round(performance.now())}.${extensao}`;

  const { error } = await supabaseClient.storage.from(BUCKET_IMAGENS).upload(caminho, file, {
    cacheControl: '31536000',
    contentType: file.type || 'image/jpeg'
  });

  if (error) {
    toast(/bucket|not found/i.test(error.message || '')
      ? 'Rode supabase/migrations/027_cms_blog.sql no Supabase.'
      : `Não foi possível enviar: ${error.message}`);
    return null;
  }

  return supabaseClient.storage.from(BUCKET_IMAGENS).getPublicUrl(caminho).data.publicUrl;
}

/* Campo de imagem: prévia, botão de envio e a URL (que também pode ser colada). */
function campoImagem(nome, rotulo, valor) {
  return `
    <div class="field">
      <span class="field-label">${rotulo}</span>
      <div class="imagem-campo">
        <div class="imagem-previa" data-previa="${nome}" ${valor ? `style="background-image:url('${escapeHtml(valor)}')"` : ''}>
          ${valor ? '' : '<span>sem imagem</span>'}
        </div>
        <div class="imagem-acoes">
          <button type="button" class="btn btn-ghost btn-sm" data-enviar="${nome}">Enviar imagem</button>
          <input type="file" accept="image/*" data-arquivo="${nome}" hidden>
          <input class="field-input" name="${nome}" type="url" placeholder="ou cole a URL da imagem" value="${escapeHtml(valor || '')}">
        </div>
      </div>
    </div>`;
}

function ligarCamposDeImagem(form, pasta) {
  form.querySelectorAll('[data-enviar]').forEach(botao => {
    const nome = botao.dataset.enviar;
    const arquivo = form.querySelector(`[data-arquivo="${nome}"]`);
    const url = form.querySelector(`input[name="${nome}"]`);
    const previa = form.querySelector(`[data-previa="${nome}"]`);

    const mostrar = () => {
      previa.style.backgroundImage = url.value ? `url('${url.value}')` : '';
      previa.innerHTML = url.value ? '' : '<span>sem imagem</span>';
    };

    botao.addEventListener('click', () => arquivo.click());
    url.addEventListener('input', mostrar);

    arquivo.addEventListener('change', async () => {
      const file = arquivo.files[0];
      if (!file) return;
      botao.disabled = true;
      botao.textContent = 'Enviando…';
      const publica = await enviarImagem(file, pasta);
      botao.disabled = false;
      botao.textContent = 'Enviar imagem';
      arquivo.value = '';
      if (publica) { url.value = publica; mostrar(); }
    });
  });
}

function blocoPublicacao(posicao, ativo, rotuloPosicao = 'Posição') {
  return `
    <p class="drawer-section-title">Publicação</p>
    <div class="field-row">
      <label class="field">
        <span class="field-label">${rotuloPosicao}</span>
        <input class="field-input" name="posicao" type="number" min="0" value="${posicao}">
      </label>
      <label class="field">
        <span class="field-label">Status</span>
        <select class="field-select" name="ativo">
          <option value="true" ${ativo ? 'selected' : ''}>Publicado</option>
          <option value="false" ${ativo ? '' : 'selected'}>Rascunho</option>
        </select>
      </label>
    </div>
    <p class="cell-muted" style="font-size:.75rem;line-height:1.6">
      Itens em rascunho continuam aqui, mas não aparecem na plataforma.
      A ordem vai do menor número para o maior.
    </p>`;
}



/* ------------------------------------------ Linhas sem clique (cadastros)
   Nas listas de cadastros a linha não abre o drawer — clicar para copiar
   um e-mail abria o painel. O e-mail tem botão de copiar ao lado e o
   drawer abre pelo ícone de três bolinhas no fim da linha. */

const ICONE_COPIAR = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M7 9.667a2.667 2.667 0 0 1 2.667 -2.667h8.666a2.667 2.667 0 0 1 2.667 2.667v8.666a2.667 2.667 0 0 1 -2.667 2.667h-8.666a2.667 2.667 0 0 1 -2.667 -2.667z" /><path d="M4.012 16.737a2 2 0 0 1 -1.012 -1.737v-10c0 -1.1 .9 -2 2 -2h10c.75 0 1.158 .385 1.5 1" /></svg>';
const ICONE_VER_MAIS = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="9" /><circle cx="8" cy="12" r="1.1" fill="currentColor" stroke="none" /><circle cx="12" cy="12" r="1.1" fill="currentColor" stroke="none" /><circle cx="16" cy="12" r="1.1" fill="currentColor" stroke="none" /></svg>';

function celulaEmail(email) {
  if (!email) return '—';
  return `<span class="email-copiavel"><span>${escapeHtml(email)}</span><button type="button" class="btn-icone-linha" data-copiar="${escapeHtml(email)}" title="Copiar e-mail" aria-label="Copiar e-mail">${ICONE_COPIAR}</button></span>`;
}

function botaoVerMais(id) {
  return `<button type="button" class="btn-icone-linha" data-ver="${escapeHtml(id)}" title="Ver mais" aria-label="Ver mais">${ICONE_VER_MAIS}</button>`;
}

function ligarAcoesDaLinha(host, abrir) {
  host.querySelectorAll('[data-copiar]').forEach(btn => {
    btn.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(btn.dataset.copiar);
        toast('E-mail copiado.');
      } catch {
        toast('Não foi possível copiar.');
      }
    });
  });
  host.querySelectorAll('[data-ver]').forEach(btn => {
    btn.addEventListener('click', () => abrir(btn.dataset.ver));
  });
}
