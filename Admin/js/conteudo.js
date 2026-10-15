/* ==========================================================================
   LOVE ADMIN — Conteúdo publicado nas plataformas
   Mesmo script para os dois dashboards: a plataforma vem de
   `document.body.dataset.plataforma` ('fornecedor' ou 'cliente').

   Abas:
     Informações → carrossel da home (conteudo_plataforma, até 5 imagens)
     FAQ         → perguntas e respostas por categoria (tabela faq) e os
                   primeiros passos de quem acabou de entrar (primeiros_passos)
     Serviços    → só anfitriões: cards de Benefícios & Serviços da home e
                   de Benefícios Love (servicos_beneficios)

   A resposta do FAQ é HTML escrito no EditorRico; o vídeo entra como
   <iframe> no meio do texto, onde o cursor estiver.
   ========================================================================== */

const PLATAFORMA = document.body.dataset.plataforma;

/** Quantas imagens o carrossel da home aceita. */
const MAX_BANNERS = 5;

/** Quantos primeiros passos cada plataforma mostra. */
const MAX_PASSOS = 6;

/* Categorias oferecidas no seletor, na ordem em que aparecem na plataforma.
   Uma pergunta pode receber outra categoria digitada à mão. */
const CATEGORIAS_FAQ = {
  cliente: [
    'Fornecedores', 'Carteira digital', 'Lista de convidados', 'Meus presentes',
    'Editar meu site', 'Convite digital', 'Benefícios', 'Serviços'
  ],
  fornecedor: [
    'Construtor de site', 'Guia de CRM', 'Guia de contratos', 'Guia de produtos e serviços',
    'Guia de agenda e tarefas', 'Gestão de compromissos', 'Guia financeiro'
  ]
};

const GRUPOS = [
  { key: 'informacoes', label: 'Informações', botao: null },
  { key: 'faq', label: 'FAQ', botao: 'Adicionar pergunta' },
  ...(PLATAFORMA === 'cliente' ? [{ key: 'servicos', label: 'Serviços', botao: 'Adicionar' }] : [])
];

const NOME_PLATAFORMA = PLATAFORMA === 'fornecedor' ? 'Plataforma B2B' : 'Plataforma dos anfitriões';

let BANNERS = [];
let FAQ = [];
let PASSOS = [];
let SERVICOS = [];
let BOTAO_ADICIONAR = null;
let GRUPO_ATUAL = GRUPOS[0].key;

document.addEventListener('DOMContentLoaded', async () => {
  if (!(await window.adminReady)) return;

  renderTabs();

  BOTAO_ADICIONAR = addHeaderAction('Adicionar', () => {
    if (GRUPO_ATUAL === 'faq') abrirFormularioPergunta(null);
    if (GRUPO_ATUAL === 'servicos') abrirFormularioServico(null);
  }, {
    icone: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>'
  });

  await carregar();
});

async function carregar() {
  const lista = document.getElementById('conteudo-lista');
  lista.innerHTML = `<div class="card"><div class="card-body"><div class="skeleton" style="width:55%"></div></div></div>`;

  const [banners, faq, passos, servicos] = await Promise.all([
    safeSelect('conteudo_plataforma', '*', q => q.eq('plataforma', PLATAFORMA).eq('secao', 'banner').order('posicao')),
    safeSelect('faq', '*', q => q.eq('plataforma', PLATAFORMA).order('ordem')),
    safeSelect('primeiros_passos', '*', q => q.eq('plataforma', PLATAFORMA).order('ordem')),
    PLATAFORMA === 'cliente'
      ? safeSelect('servicos_beneficios', '*', q => q.order('posicao'))
      : Promise.resolve({ data: [], error: null })
  ]);

  const erro = [faq, passos, servicos].find(r => r.error)?.error;
  if (erro && /plataforma|primeiros_passos|tipo|desconto_texto|schema cache|does not exist/i.test(erro.message || '')) {
    lista.innerHTML = `
      <div class="card"><div class="empty-state">
        <strong>Banco ainda não está preparado</strong>
        <p>Rode supabase/migrations/052_faq_plataforma_passos_beneficios_hub.sql no SQL Editor do Supabase.</p>
      </div></div>`;
    return;
  }

  BANNERS = banners.data;
  FAQ = faq.data;
  PASSOS = passos.data;
  SERVICOS = servicos.data;
  render();
}

/* ------------------------------------------------------------------ Abas */

function grupoAtual() {
  return GRUPOS.find(g => g.key === GRUPO_ATUAL);
}

function renderTabs() {
  const host = document.getElementById('conteudo-tabs');

  host.innerHTML = GRUPOS.map(g => `
    <button type="button" class="conteudo-tab ${g.key === GRUPO_ATUAL ? 'is-active' : ''}" data-grupo="${g.key}">
      ${g.label}
    </button>`).join('');

  host.querySelectorAll('[data-grupo]').forEach(btn => {
    btn.addEventListener('click', () => {
      GRUPO_ATUAL = btn.dataset.grupo;
      renderTabs();
      render();
    });
  });
}

function render() {
  const grupo = grupoAtual();

  // O carrossel tem os próprios espaços de "adicionar", então o botão do
  // cabeçalho só faz sentido nas outras abas.
  if (BOTAO_ADICIONAR) {
    BOTAO_ADICIONAR.hidden = !grupo.botao;
    if (grupo.botao) BOTAO_ADICIONAR.querySelector('span').textContent = grupo.botao;
  }

  if (grupo.key === 'informacoes') return renderBanners();
  if (grupo.key === 'faq') return renderFaq();
  renderServicos();
}

/* ----------------------------------------------------------- Utilidades */

/** Texto corrido de um HTML, para o resumo nas listas. */
function textoDe(html, limite = 160) {
  const caixa = document.createElement('div');
  caixa.innerHTML = html || '';
  caixa.querySelectorAll('iframe').forEach(f => f.replaceWith(' [vídeo] '));
  const texto = caixa.textContent.replace(/\s+/g, ' ').trim();
  return texto.length > limite ? `${texto.slice(0, limite).trimEnd()}…` : texto;
}

/**
 * Link de YouTube ou Vimeo → endereço que o <iframe> aceita.
 * Devolve null quando o link não é de nenhum dos dois.
 */
function urlDeEmbed(url) {
  const limpa = String(url || '').trim();
  const yt = limpa.match(/(?:youtube\.com\/(?:watch\?(?:.*&)?v=|shorts\/|embed\/)|youtu\.be\/)([\w-]{6,})/);
  if (yt) return `https://www.youtube.com/embed/${yt[1]}`;
  const vimeo = limpa.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  if (vimeo) return `https://player.vimeo.com/video/${vimeo[1]}`;
  return null;
}

const proximaPosicao = (lista, campo = 'posicao') =>
  lista.reduce((max, i) => Math.max(max, Number(i[campo]) || 0), 0) + 1;

/* ------------------------------------------------ Informações (carrossel) */

function renderBanners() {
  const lista = document.getElementById('conteudo-lista');
  const banners = BANNERS.slice(0, MAX_BANNERS);
  const vagas = MAX_BANNERS - banners.length;

  const slots = banners.map((b, i) => `
    <article class="banner-slot ${b.ativo ? '' : 'is-inativo'}">
      <div class="banner-slot-img" ${b.imagem_url ? `style="background-image:url('${escapeHtml(b.imagem_url)}')"` : ''}>
        ${b.imagem_url ? '' : '<span>sem imagem</span>'}
        <span class="banner-slot-ordem">${i + 1}</span>
      </div>
      <div class="banner-slot-body">
        <p class="nome">${escapeHtml(b.titulo)}</p>
        ${b.descricao ? `<p class="desc">${escapeHtml(b.descricao)}</p>` : ''}
        ${b.link_url ? `<p class="link">${escapeHtml(b.link_url)}</p>` : ''}
      </div>
      <div class="banner-slot-foot">
        <span class="pos">${b.ativo ? 'publicado' : 'rascunho'}</span>
        <button type="button" class="btn btn-ghost btn-sm" data-editar-banner="${b.id}">Editar</button>
        <button type="button" class="btn btn-danger btn-sm" data-excluir-banner="${b.id}">Excluir</button>
      </div>
    </article>`).join('');

  const vazios = Array.from({ length: vagas }, (_, i) => `
    <button type="button" class="banner-slot banner-slot--vazio" data-nova-imagem="${banners.length + i + 1}">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path stroke-linecap="round" d="M12 4.5v15m7.5-7.5h-15"/></svg>
      <span>Adicionar imagem</span>
    </button>`).join('');

  lista.innerHTML = `
    <div class="card">
      <div class="card-head">
        <div>
          <h2>Banner da home</h2>
          <p>${formatNumber(banners.length)} de ${MAX_BANNERS} imagens no carrossel. Cada imagem leva título, texto e link.</p>
        </div>
      </div>
      <div class="card-body">
        <div class="banner-carrossel">${slots}${vazios}</div>
        ${vagas ? '' : `<p class="cell-muted" style="font-size:.75rem;margin:1rem 0 0">Limite de ${MAX_BANNERS} imagens atingido. Exclua uma para adicionar outra.</p>`}
      </div>
    </div>`;

  lista.querySelectorAll('[data-editar-banner]').forEach(btn => {
    btn.addEventListener('click', () => abrirFormularioBanner(BANNERS.find(b => b.id === btn.dataset.editarBanner)));
  });
  lista.querySelectorAll('[data-excluir-banner]').forEach(btn => {
    btn.addEventListener('click', () => excluir('conteudo_plataforma', btn.dataset.excluirBanner, BANNERS.find(b => b.id === btn.dataset.excluirBanner)?.titulo));
  });
  lista.querySelectorAll('[data-nova-imagem]').forEach(btn => {
    btn.addEventListener('click', () => abrirFormularioBanner({ posicao: Number(btn.dataset.novaImagem) }));
  });
}

function abrirFormularioBanner(item) {
  const editando = Boolean(item && item.id);

  Drawer.open({
    title: editando ? 'Editar imagem do carrossel' : 'Nova imagem do carrossel',
    subtitle: NOME_PLATAFORMA,
    body: `
      <form id="form-conteudo">
        ${campoImagem('imagem_url', 'Imagem', item?.imagem_url)}
        <label class="field">
          <span class="field-label">Título</span>
          <input class="field-input" name="titulo" type="text" value="${escapeHtml(item?.titulo || '')}">
        </label>
        <label class="field">
          <span class="field-label">Texto do banner</span>
          <textarea class="field-textarea" name="descricao">${escapeHtml(item?.descricao || '')}</textarea>
        </label>
        <label class="field">
          <span class="field-label">Link do banner</span>
          <input class="field-input" name="link_url" type="text" placeholder="https://" value="${escapeHtml(item?.link_url || '')}">
        </label>
        ${blocoPublicacao(item?.posicao ?? proximaPosicao(BANNERS), !item || item.ativo, 'Ordem no carrossel')}
      </form>`,
    footer: `
      <button type="button" class="btn btn-ghost" id="btn-cancelar">Cancelar</button>
      <button type="button" class="btn btn-primary" id="btn-salvar">${editando ? 'Salvar' : 'Publicar'}</button>`
  });

  const form = document.getElementById('form-conteudo');
  ligarCamposDeImagem(form, 'banners');
  document.getElementById('btn-cancelar').addEventListener('click', () => Drawer.close());
  document.getElementById('btn-salvar').addEventListener('click', async () => {
    const d = Object.fromEntries(new FormData(form).entries());
    const payload = {
      plataforma: PLATAFORMA,
      secao: 'banner',
      titulo: d.titulo.trim(),
      descricao: d.descricao.trim() || null,
      imagem_url: d.imagem_url.trim() || null,
      link_url: d.link_url.trim() || null,
      posicao: Number(d.posicao) || 0,
      ativo: d.ativo === 'true'
    };
    if (!payload.titulo) return toast('O título é obrigatório.');
    await gravar('conteudo_plataforma', item?.id, payload);
  });
}

/* ------------------------------------------------------------------ FAQ */

function categoriasOrdenadas() {
  const fixas = CATEGORIAS_FAQ[PLATAFORMA] || [];
  const usadas = [...new Set(FAQ.map(q => (q.categoria || '').trim()).filter(Boolean))];
  const extras = usadas
    .filter(c => !fixas.some(f => f.toLowerCase() === c.toLowerCase()))
    .sort((a, b) => a.localeCompare(b, 'pt-BR'));
  return [...fixas, ...extras];
}

function renderFaq() {
  const lista = document.getElementById('conteudo-lista');

  const passos = PASSOS.slice().sort((a, b) => a.ordem - b.ordem);
  const blocoPassos = `
    <div class="card" style="margin-bottom:1.25rem">
      <div class="card-head" style="justify-content:space-between">
        <div>
          <h2>Primeiros passos</h2>
          <p>Até ${MAX_PASSOS} passos mostrados a quem acabou de entrar. ${formatNumber(passos.length)} de ${MAX_PASSOS}.</p>
        </div>
        <button type="button" class="btn btn-ghost btn-sm" id="btn-novo-passo" ${passos.length >= MAX_PASSOS ? 'disabled' : ''}>+ Adicionar passo</button>
      </div>
      <div class="card-body">
        ${passos.length ? passos.map(p => `
          <div class="passo-item ${p.ativo ? '' : 'is-inativo'}">
            <span class="passo-ordem">${formatNumber(p.ordem)}</span>
            ${p.icone ? `<span class="passo-icone">${escapeHtml(p.icone)}</span>` : ''}
            <div style="flex:1;min-width:0">
              <p class="nome">${escapeHtml(p.titulo)}</p>
              ${p.descricao ? `<p class="desc">${escapeHtml(p.descricao)}</p>` : ''}
              ${p.link_url ? `<p class="link">${escapeHtml(p.link_label || p.link_url)}</p>` : ''}
            </div>
            ${p.ativo ? '' : badge('rascunho', 'badge-warning')}
            <button type="button" class="btn btn-ghost btn-sm" data-editar-passo="${p.id}">Editar</button>
            <button type="button" class="btn btn-danger btn-sm" data-excluir-passo="${p.id}">Excluir</button>
          </div>`).join('')
        : `<p class="cell-muted" style="font-size:.8125rem;margin:0">Nenhum passo ainda. Os passos aparecem na ordem abaixo, do 1 ao ${MAX_PASSOS}.</p>`}
      </div>
    </div>`;

  const categorias = categoriasOrdenadas();
  const perguntasDe = cat => FAQ
    .filter(q => (q.categoria || '').trim().toLowerCase() === cat.toLowerCase())
    .sort((a, b) => a.ordem - b.ordem);

  const blocoFaq = FAQ.length
    ? categorias.map(cat => {
        const perguntas = perguntasDe(cat);
        if (!perguntas.length) return '';
        return `
          <div class="card faq-categoria-card">
            <div class="card-head" style="justify-content:space-between">
              <div><h2>${escapeHtml(cat)}</h2><p>${formatNumber(perguntas.length)} ${perguntas.length === 1 ? 'pergunta' : 'perguntas'}</p></div>
              <button type="button" class="btn btn-ghost btn-sm" data-nova-pergunta="${escapeHtml(cat)}">+ Pergunta</button>
            </div>
            <div class="card-body">
              ${perguntas.map(q => `
                <div class="pergunta-item ${q.ativo ? '' : 'is-inativo'}">
                  <div style="flex:1;min-width:0">
                    <p class="pergunta">${escapeHtml(q.pergunta)}</p>
                    <p class="resposta">${escapeHtml(textoDe(q.resposta))}</p>
                  </div>
                  ${/<iframe/i.test(q.resposta || '') ? badge('vídeo', 'badge-info') : ''}
                  ${q.ativo ? '' : badge('rascunho', 'badge-warning')}
                  <button type="button" class="btn btn-ghost btn-sm" data-editar-pergunta="${q.id}">Editar</button>
                  <button type="button" class="btn btn-danger btn-sm" data-excluir-pergunta="${q.id}">Excluir</button>
                </div>`).join('')}
            </div>
          </div>`;
      }).join('')
    : `<div class="card"><div class="empty-state">
        <strong>Nenhuma pergunta ainda</strong>
        <p>Clique em "Adicionar pergunta" no cabeçalho. Cada pergunta entra numa categoria e aparece na plataforma com a resposta escrita aqui.</p>
      </div></div>`;

  lista.innerHTML = blocoPassos + blocoFaq;

  document.getElementById('btn-novo-passo').addEventListener('click', () => abrirFormularioPasso(null));
  lista.querySelectorAll('[data-editar-passo]').forEach(btn => {
    btn.addEventListener('click', () => abrirFormularioPasso(PASSOS.find(p => p.id === btn.dataset.editarPasso)));
  });
  lista.querySelectorAll('[data-excluir-passo]').forEach(btn => {
    btn.addEventListener('click', () => excluir('primeiros_passos', btn.dataset.excluirPasso, PASSOS.find(p => p.id === btn.dataset.excluirPasso)?.titulo));
  });
  lista.querySelectorAll('[data-nova-pergunta]').forEach(btn => {
    btn.addEventListener('click', () => abrirFormularioPergunta(null, btn.dataset.novaPergunta));
  });
  lista.querySelectorAll('[data-editar-pergunta]').forEach(btn => {
    btn.addEventListener('click', () => abrirFormularioPergunta(FAQ.find(q => q.id === btn.dataset.editarPergunta)));
  });
  lista.querySelectorAll('[data-excluir-pergunta]').forEach(btn => {
    btn.addEventListener('click', () => excluir('faq', btn.dataset.excluirPergunta, FAQ.find(q => q.id === btn.dataset.excluirPergunta)?.pergunta));
  });
}

function abrirFormularioPergunta(item, categoriaInicial) {
  const editando = Boolean(item && item.id);
  const categorias = categoriasOrdenadas();
  const atual = (item?.categoria || categoriaInicial || categorias[0] || '').trim();
  const conhecida = categorias.some(c => c.toLowerCase() === atual.toLowerCase());

  const irmas = FAQ.filter(q => (q.categoria || '').trim().toLowerCase() === atual.toLowerCase());

  Drawer.open({
    title: editando ? 'Editar pergunta' : 'Nova pergunta',
    subtitle: NOME_PLATAFORMA,
    body: `
      <form id="form-conteudo">
        <label class="field">
          <span class="field-label">Categoria <span class="campo-obrigatorio">*</span></span>
          <select class="field-select" name="categoria_opcao" id="categoria-opcao">
            ${categorias.map(c => `<option value="${escapeHtml(c)}" ${c.toLowerCase() === atual.toLowerCase() ? 'selected' : ''}>${escapeHtml(c)}</option>`).join('')}
            <option value="__outra" ${conhecida || !atual ? '' : 'selected'}>Outra…</option>
          </select>
        </label>
        <label class="field" id="campo-categoria-outra" ${conhecida || !atual ? 'hidden' : ''}>
          <span class="field-label">Nome da categoria</span>
          <input class="field-input" name="categoria_outra" type="text" value="${conhecida ? '' : escapeHtml(atual)}">
        </label>

        <label class="field">
          <span class="field-label">Pergunta <span class="campo-obrigatorio">*</span></span>
          <input class="field-input" name="pergunta" type="text" maxlength="200" value="${escapeHtml(item?.pergunta || '')}">
        </label>

        <div class="field">
          <span class="field-label">Resposta</span>
          <div id="faq-editor"></div>
          <div class="editor-video">
            <input class="field-input" id="video-url" type="url" placeholder="Link do YouTube ou Vimeo">
            <button type="button" class="btn btn-ghost btn-sm" id="btn-inserir-video">Inserir vídeo</button>
          </div>
          <p class="cell-muted" style="font-size:.75rem;line-height:1.6;margin:.375rem 0 0">
            O vídeo entra onde o cursor estiver no texto — dá para escrever antes e depois dele.
          </p>
        </div>

        ${blocoPublicacao(item?.ordem ?? proximaPosicao(irmas, 'ordem'), !item || item.ativo, 'Ordem na categoria')}
      </form>`,
    footer: `
      <button type="button" class="btn btn-ghost" id="btn-cancelar">Cancelar</button>
      <button type="button" class="btn btn-primary" id="btn-salvar">${editando ? 'Salvar' : 'Publicar'}</button>`
  });

  const form = document.getElementById('form-conteudo');
  const editor = EditorRico.montar(document.getElementById('faq-editor'), {
    placeholder: 'Escreva a resposta. Negrito, listas, links e vídeo são permitidos.'
  });
  editor.definir(item?.resposta || '');

  document.getElementById('categoria-opcao').addEventListener('change', e => {
    document.getElementById('campo-categoria-outra').hidden = e.target.value !== '__outra';
    if (e.target.value === '__outra') form.categoria_outra.focus();
  });

  document.getElementById('btn-inserir-video').addEventListener('click', () => {
    const campo = document.getElementById('video-url');
    const embed = urlDeEmbed(campo.value);
    if (!embed) {
      toast('Cole um link do YouTube ou do Vimeo.');
      campo.focus();
      return;
    }
    editor.inserirHtml(
      `<div class="faq-video"><iframe src="${escapeHtml(embed)}" title="Vídeo" loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe></div><p><br></p>`
    );
    campo.value = '';
  });

  document.getElementById('btn-cancelar').addEventListener('click', () => Drawer.close());
  document.getElementById('btn-salvar').addEventListener('click', async () => {
    const d = Object.fromEntries(new FormData(form).entries());
    const categoria = (d.categoria_opcao === '__outra' ? d.categoria_outra : d.categoria_opcao).trim();
    const pergunta = d.pergunta.trim();
    const resposta = editor.html();

    if (!categoria) return toast('Escolha ou escreva a categoria.');
    if (!pergunta) return toast('Escreva a pergunta.');
    if (!editor.texto().trim() && !/<iframe/i.test(resposta)) return toast('Escreva a resposta.');

    await gravar('faq', item?.id, {
      plataforma: PLATAFORMA,
      categoria,
      pergunta,
      resposta,
      ordem: Number(d.posicao) || 0,
      ativo: d.ativo === 'true',
      atualizado_por: window.adminUser.id
    });
  });
}

function abrirFormularioPasso(item) {
  const editando = Boolean(item && item.id);

  if (!editando && PASSOS.length >= MAX_PASSOS) {
    toast(`São no máximo ${MAX_PASSOS} passos.`);
    return;
  }

  Drawer.open({
    title: editando ? 'Editar passo' : 'Novo passo',
    subtitle: NOME_PLATAFORMA,
    body: `
      <form id="form-conteudo">
        <div class="field-row">
          <label class="field" style="flex:0 0 96px">
            <span class="field-label">Ícone</span>
            <input class="field-input" name="icone" type="text" maxlength="4" placeholder="emoji" value="${escapeHtml(item?.icone || '')}">
          </label>
          <label class="field">
            <span class="field-label">Título <span class="campo-obrigatorio">*</span></span>
            <input class="field-input" name="titulo" type="text" maxlength="80" value="${escapeHtml(item?.titulo || '')}">
          </label>
        </div>
        <label class="field">
          <span class="field-label">Descrição</span>
          <textarea class="field-textarea" name="descricao" maxlength="240">${escapeHtml(item?.descricao || '')}</textarea>
        </label>
        <div class="field-row">
          <label class="field">
            <span class="field-label">Link (página ou URL)</span>
            <input class="field-input" name="link_url" type="text" placeholder="ex.: crm ou https://" value="${escapeHtml(item?.link_url || '')}">
          </label>
          <label class="field">
            <span class="field-label">Texto do link</span>
            <input class="field-input" name="link_label" type="text" value="${escapeHtml(item?.link_label || '')}">
          </label>
        </div>
        ${blocoPublicacao(item?.ordem ?? proximaPosicao(PASSOS, 'ordem'), !item || item.ativo, 'Ordem (1 a 6)')}
      </form>`,
    footer: `
      <button type="button" class="btn btn-ghost" id="btn-cancelar">Cancelar</button>
      <button type="button" class="btn btn-primary" id="btn-salvar">${editando ? 'Salvar' : 'Publicar'}</button>`
  });

  const form = document.getElementById('form-conteudo');
  document.getElementById('btn-cancelar').addEventListener('click', () => Drawer.close());
  document.getElementById('btn-salvar').addEventListener('click', async () => {
    const d = Object.fromEntries(new FormData(form).entries());
    if (!d.titulo.trim()) return toast('O título é obrigatório.');
    await gravar('primeiros_passos', item?.id, {
      plataforma: PLATAFORMA,
      titulo: d.titulo.trim(),
      descricao: d.descricao.trim() || null,
      icone: d.icone.trim() || null,
      link_url: d.link_url.trim() || null,
      link_label: d.link_label.trim() || null,
      ordem: Number(d.posicao) || 0,
      ativo: d.ativo === 'true'
    });
  });
}

/* ------------------------------------------- Serviços (só anfitriões) */

const PRECO_TIPO = { a_partir: 'A partir de', fixo: 'Valor fixo' };

function precoDe(s) {
  if (!(Number(s.preco) > 0)) return '';
  const prefixo = s.preco_tipo === 'fixo' ? '' : 'A partir de ';
  return `${prefixo}${formatCurrency(s.preco)}${s.preco_sufixo ? ` ${s.preco_sufixo}` : ''}`;
}

function renderServicos() {
  const lista = document.getElementById('conteudo-lista');
  const descontos = SERVICOS.filter(s => s.tipo === 'desconto').sort((a, b) => a.posicao - b.posicao);
  const servicos = SERVICOS.filter(s => s.tipo !== 'desconto').sort((a, b) => a.posicao - b.posicao);

  const cardDesconto = s => `
    <article class="desconto-card ${s.ativo ? '' : 'is-inativo'}">
      <div class="desconto-logo" ${s.imagem_url ? `style="background-image:url('${escapeHtml(s.imagem_url)}')"` : ''}>
        ${s.imagem_url ? '' : `<span>${escapeHtml(s.nome)}</span>`}
      </div>
      <div class="desconto-body">
        <p class="empresa">${escapeHtml(s.nome)}</p>
        <p class="oferta">${escapeHtml(s.desconto_texto || '—')}</p>
        <p class="acao">${s.cupom ? `Cupom ${escapeHtml(s.cupom)}` : s.link_url ? 'Abre o link' : 'Sem ação ao clicar'}</p>
      </div>
      <div class="banner-slot-foot">
        <span class="pos">${s.ativo ? 'publicado' : 'rascunho'}</span>
        <button type="button" class="btn btn-ghost btn-sm" data-editar-servico="${s.id}">Editar</button>
        <button type="button" class="btn btn-danger btn-sm" data-excluir-servico="${s.id}">Excluir</button>
      </div>
    </article>`;

  const grupos = [...new Set(servicos.map(s => (s.grupo || '').trim() || 'Sem grupo'))];

  const cardServico = s => `
    <div class="card servico-bloco ${s.ativo ? '' : 'is-inativo'}">
      <div class="servico-head">
        <div class="servico-thumb" ${s.imagem_url ? `style="background-image:url('${escapeHtml(s.imagem_url)}')"` : ''}></div>
        <div style="flex:1;min-width:0">
          <h3>${escapeHtml(s.titulo || s.nome)}</h3>
          <p>${escapeHtml(s.descricao || '')}</p>
          <span class="pos">${escapeHtml(s.nome)}${precoDe(s) ? ` · ${escapeHtml(precoDe(s))}` : ''} · ${s.ativo ? 'publicado' : 'rascunho'}</span>
        </div>
        <div style="display:flex;gap:.5rem;flex-shrink:0">
          <button type="button" class="btn btn-ghost btn-sm" data-editar-servico="${s.id}">Editar</button>
          <button type="button" class="btn btn-danger btn-sm" data-excluir-servico="${s.id}">Excluir</button>
        </div>
      </div>
    </div>`;

  lista.innerHTML = `
    <div class="card" style="margin-bottom:1.25rem">
      <div class="card-head">
        <div>
          <h2>Benefícios &amp; Serviços — home</h2>
          <p>Cards do clube de vantagens na página inicial: logo, empresa, desconto e cupom ou link.</p>
        </div>
      </div>
      <div class="card-body">
        ${descontos.length
          ? `<div class="desconto-grid">${descontos.map(cardDesconto).join('')}</div>`
          : `<p class="cell-muted" style="font-size:.8125rem;margin:0">Nenhum card ainda. Clique em "Adicionar" e escolha o tipo "Desconto na home".</p>`}
      </div>
    </div>

    <div class="bloco-cabecalho" style="margin-top:0">
      <h2>Benefícios Love</h2>
    </div>
    ${servicos.length
      ? grupos.map(g => `
          <p class="beneficio-titulo" style="margin:1rem 0 .625rem">${escapeHtml(g)}</p>
          ${servicos.filter(s => ((s.grupo || '').trim() || 'Sem grupo') === g).map(cardServico).join('')}`).join('')
      : `<div class="card"><div class="empty-state">
          <strong>Nenhum serviço ainda</strong>
          <p>Clique em "Adicionar" e escolha o tipo "Serviço em Benefícios Love".</p>
        </div></div>`}`;

  lista.querySelectorAll('[data-editar-servico]').forEach(btn => {
    btn.addEventListener('click', () => abrirFormularioServico(SERVICOS.find(s => s.id === btn.dataset.editarServico)));
  });
  lista.querySelectorAll('[data-excluir-servico]').forEach(btn => {
    btn.addEventListener('click', () => excluir('servicos_beneficios', btn.dataset.excluirServico, SERVICOS.find(s => s.id === btn.dataset.excluirServico)?.nome));
  });
}

function abrirFormularioServico(item) {
  const editando = Boolean(item && item.id);
  const tipo = item?.tipo || 'desconto';
  const grupos = [...new Set(SERVICOS.map(s => (s.grupo || '').trim()).filter(Boolean))];

  Drawer.open({
    title: editando ? 'Editar' : 'Novo benefício ou serviço',
    subtitle: NOME_PLATAFORMA,
    body: `
      <form id="form-conteudo">
        <label class="field">
          <span class="field-label">Onde aparece</span>
          <select class="field-select" name="tipo" id="servico-tipo">
            <option value="desconto" ${tipo === 'desconto' ? 'selected' : ''}>Desconto na home (Benefícios &amp; Serviços)</option>
            <option value="servico" ${tipo === 'servico' ? 'selected' : ''}>Serviço em Benefícios Love</option>
          </select>
        </label>

        ${campoImagem('imagem_url', 'Imagem', item?.imagem_url)}

        <label class="field">
          <span class="field-label">Empresa / parceiro <span class="campo-obrigatorio">*</span></span>
          <input class="field-input" name="nome" type="text" value="${escapeHtml(item?.nome || '')}">
        </label>

        <div data-so="desconto">
          <div class="field-row">
            <label class="field">
              <span class="field-label">Desconto <span class="campo-obrigatorio">*</span></span>
              <input class="field-input" name="desconto_texto" type="text" placeholder="ex.: Até 25% OFF" value="${escapeHtml(item?.desconto_texto || '')}">
            </label>
            <label class="field">
              <span class="field-label">Cupom (copiado ao clicar)</span>
              <input class="field-input" name="cupom" type="text" placeholder="ex.: LOVE25" value="${escapeHtml(item?.cupom || '')}">
            </label>
          </div>
          <label class="field">
            <span class="field-label">Mensagem ao ativar o cupom</span>
            <input class="field-input" name="descricao_desconto" type="text" placeholder="ex.: 25% OFF em trajes a rigor." value="${escapeHtml(tipo === 'desconto' ? (item?.descricao || '') : '')}">
          </label>
        </div>

        <div data-so="servico">
          <label class="field">
            <span class="field-label">Título do card <span class="campo-obrigatorio">*</span></span>
            <input class="field-input" name="titulo" type="text" placeholder="ex.: Seguro residência" value="${escapeHtml(item?.titulo || '')}">
          </label>
          <label class="field">
            <span class="field-label">Breve descrição</span>
            <textarea class="field-textarea" name="descricao" maxlength="240">${escapeHtml(tipo === 'servico' ? (item?.descricao || '') : '')}</textarea>
          </label>
          <label class="field">
            <span class="field-label">Grupo (seção em Benefícios Love)</span>
            <input class="field-input" name="grupo" type="text" list="grupos-servico" placeholder="ex.: Para os casais" value="${escapeHtml(item?.grupo || '')}">
            <datalist id="grupos-servico">${grupos.map(g => `<option value="${escapeHtml(g)}">`).join('')}</datalist>
          </label>
          <div class="field-row">
            <label class="field">
              <span class="field-label">Preço (R$)</span>
              <input class="field-input" name="preco" type="number" step="0.01" min="0" value="${item?.preco ?? ''}">
            </label>
            <label class="field">
              <span class="field-label">Como mostrar</span>
              <select class="field-select" name="preco_tipo">
                ${Object.entries(PRECO_TIPO).map(([v, r]) => `<option value="${v}" ${(item?.preco_tipo || 'a_partir') === v ? 'selected' : ''}>${r}</option>`).join('')}
              </select>
            </label>
          </div>
          <div class="field-row">
            <label class="field">
              <span class="field-label">Depois do preço</span>
              <input class="field-input" name="preco_sufixo" type="text" placeholder="ex.: por mês" value="${escapeHtml(item?.preco_sufixo || '')}">
            </label>
            <label class="field">
              <span class="field-label">Preço cheio (riscado)</span>
              <input class="field-input" name="preco_de" type="number" step="0.01" min="0" value="${item?.preco_de ?? ''}">
            </label>
          </div>
        </div>

        <label class="field">
          <span class="field-label">Link</span>
          <input class="field-input" name="link_url" type="url" placeholder="https://" value="${escapeHtml(item?.link_url || '')}">
          <span class="cell-muted" style="font-size:.75rem;line-height:1.6;display:block;margin-top:.25rem" data-so="desconto">Sem cupom, o clique no card abre este link.</span>
          <span class="cell-muted" style="font-size:.75rem;line-height:1.6;display:block;margin-top:.25rem" data-so="servico">Para onde o botão de contratar leva.</span>
        </label>

        ${blocoPublicacao(item?.posicao ?? proximaPosicao(SERVICOS), !item || item.ativo)}
      </form>`,
    footer: `
      <button type="button" class="btn btn-ghost" id="btn-cancelar">Cancelar</button>
      <button type="button" class="btn btn-primary" id="btn-salvar">${editando ? 'Salvar' : 'Publicar'}</button>`
  });

  const form = document.getElementById('form-conteudo');
  ligarCamposDeImagem(form, 'servicos');

  const seletorTipo = document.getElementById('servico-tipo');
  const mostrarCampos = () => {
    form.querySelectorAll('[data-so]').forEach(el => { el.hidden = el.dataset.so !== seletorTipo.value; });
  };
  seletorTipo.addEventListener('change', mostrarCampos);
  mostrarCampos();

  document.getElementById('btn-cancelar').addEventListener('click', () => Drawer.close());
  document.getElementById('btn-salvar').addEventListener('click', async () => {
    const d = Object.fromEntries(new FormData(form).entries());
    const ehDesconto = d.tipo === 'desconto';

    if (!d.nome.trim()) return toast('Informe a empresa ou parceiro.');
    if (ehDesconto && !d.desconto_texto.trim()) return toast('Escreva o desconto, ex.: "Até 25% OFF".');
    if (!ehDesconto && !d.titulo.trim()) return toast('Escreva o título do card.');

    const payload = {
      tipo: d.tipo,
      nome: d.nome.trim(),
      parceiro: d.nome.trim(),
      imagem_url: d.imagem_url.trim() || null,
      link_url: d.link_url.trim() || null,
      posicao: Number(d.posicao) || 0,
      ativo: d.ativo === 'true'
    };

    if (ehDesconto) {
      Object.assign(payload, {
        desconto_texto: d.desconto_texto.trim(),
        cupom: d.cupom.trim().toUpperCase() || null,
        descricao: d.descricao_desconto.trim() || null,
        titulo: null, grupo: null, preco: 0, preco_de: null, preco_sufixo: null
      });
    } else {
      Object.assign(payload, {
        titulo: d.titulo.trim(),
        descricao: d.descricao.trim() || null,
        grupo: d.grupo.trim() || null,
        preco: Number(d.preco) || 0,
        preco_tipo: d.preco_tipo,
        preco_sufixo: d.preco_sufixo.trim() || null,
        preco_de: d.preco_de === '' ? null : Number(d.preco_de),
        desconto_texto: null, cupom: null
      });
    }

    await gravar('servicos_beneficios', item?.id, payload);
  });
}

/* ------------------------------------------------------- Gravar / excluir */

async function gravar(tabela, id, payload) {
  Drawer.setFooterBusy(true);
  const { error } = id
    ? await supabaseClient.from(tabela).update(payload).eq('id', id)
    : await supabaseClient.from(tabela).insert(payload);
  Drawer.setFooterBusy(false);

  if (error) {
    toast(/column|schema cache|does not exist/i.test(error.message || '')
      ? 'Rode supabase/migrations/052_faq_plataforma_passos_beneficios_hub.sql no Supabase.'
      : `Não foi possível salvar: ${error.message}`);
    return;
  }

  Drawer.close();
  toast(id ? 'Item atualizado.' : 'Item publicado.');
  await carregar();
}

async function excluir(tabela, id, nome) {
  if (!window.confirm(`Excluir "${nome || 'este item'}"? Esta ação não pode ser desfeita.`)) return;

  const { error } = await supabaseClient.from(tabela).delete().eq('id', id);

  if (error) {
    toast(`Não foi possível excluir: ${error.message}`);
    return;
  }

  toast('Item excluído.');
  await carregar();
}
