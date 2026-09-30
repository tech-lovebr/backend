/* ==========================================================================
   LOVE ADMIN — Gestão do conteúdo publicado nas plataformas
   Mesmo script para os dois dashboards: a plataforma vem de
   `document.body.dataset.plataforma` ('fornecedor' ou 'cliente').

   Abas (todas no mesmo nível):
     Informações     → carrossel da home, até 5 imagens
     Guias de início → um guia por assunto, em formato FAQ
     Serviços        → cada serviço, com os benefícios associados a ele
   ========================================================================== */

const PLATAFORMA = document.body.dataset.plataforma;

/** Quantas imagens o carrossel da home aceita. */
const MAX_BANNERS = 5;

const SECOES = {
  banner: {
    label: 'Informações',
    descricao: `Carrossel da página inicial — até ${MAX_BANNERS} imagens, exibidas na ordem abaixo.`,
    campos: ['imagem_url', 'link_url', 'titulo', 'descricao']
  },
  guia: {
    label: 'Guias de início',
    descricao: 'Um guia por assunto. Cada guia abre com as perguntas e respostas escritas aqui.',
    vazio: 'Nenhum guia criado ainda. Crie um guia por assunto — mensagens, CRM, contratos, produtos e serviços, vitrine, agenda, financeiro.',
    campos: ['titulo', 'descricao']
  },
  faq: {
    label: 'Pergunta',
    descricao: 'Pergunta e resposta dentro de um guia.',
    campos: ['titulo', 'descricao']
  },
  servico: {
    label: 'Serviços',
    descricao: 'Serviços da Love apresentados dentro da plataforma, cada um com seus benefícios.',
    vazio: 'Nenhum serviço cadastrado. Cadastre um serviço para depois associar benefícios a ele.',
    campos: ['titulo', 'subtitulo', 'descricao', 'imagem_url', 'icone', 'link_url', 'link_label']
  },
  beneficio: {
    label: 'Benefício',
    descricao: 'Vantagem associada a um serviço.',
    campos: ['titulo', 'descricao', 'icone']
  }
};

const GRUPOS = [
  { key: 'informacoes', label: 'Informações', secao: 'banner', botao: null },
  { key: 'guias', label: 'Guias de início', secao: 'guia', botao: 'Adicionar guia' },
  { key: 'servicos', label: 'Serviços', secao: 'servico', botao: 'Adicionar serviço' }
];

const ROTULOS = {
  titulo: 'Título',
  subtitulo: 'Resumo curto',
  descricao: 'Texto',
  imagem_url: 'URL da imagem',
  icone: 'Ícone (nome ou emoji)',
  link_url: 'Link de destino',
  link_label: 'Texto do botão'
};

/** Rótulos que mudam de sentido dependendo da seção. */
const ROTULOS_POR_SECAO = {
  banner: { descricao: 'Texto do banner', link_url: 'Link do banner' },
  guia: { descricao: 'Introdução (opcional)' },
  faq: { titulo: 'Pergunta', descricao: 'Resposta' }
};

let ITENS = [];
let BOTAO_ADICIONAR = null;
let GRUPO_ATUAL = GRUPOS[0].key;
let GUIA_ABERTO = null;

document.addEventListener('DOMContentLoaded', async () => {
  if (!(await window.adminReady)) return;

  renderTabs();

  BOTAO_ADICIONAR = addHeaderAction('Adicionar', () => {
    abrirFormulario({ secao: grupoAtual().secao });
  }, {
    icone: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>'
  });

  await carregar();
});

async function carregar() {
  const lista = document.getElementById('conteudo-lista');
  lista.innerHTML = `<div class="card"><div class="card-body"><div class="skeleton" style="width:55%"></div></div></div>`;

  const { data, error } = await safeSelect(
    'conteudo_plataforma',
    '*',
    q => q.eq('plataforma', PLATAFORMA).order('posicao', { ascending: true })
  );

  if (error) {
    const faltaFaq = /secao_check/.test(error.message || '');
    const faltaParent = /parent_id/.test(error.message || '');
    lista.innerHTML = `
      <div class="card"><div class="empty-state">
        <strong>Banco ainda não está preparado</strong>
        <p>Rode ${faltaFaq ? '012_conteudo_faq.sql' : faltaParent ? '011_conteudo_hierarquia.sql' : '010_conteudo_plataforma.sql'} no SQL Editor do Supabase (pasta supabase/migrations) para habilitar a gestão de conteúdo.</p>
      </div></div>`;
    return;
  }

  ITENS = data;
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
      GUIA_ABERTO = null;
      renderTabs();
      render();
    });
  });
}

/* -------------------------------------------------------------- Listagem */

function itensDa(secao) {
  return ITENS.filter(i => i.secao === secao).sort((a, b) => a.posicao - b.posicao);
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
  if (grupo.key === 'guias') return renderGuias();
  renderServicos();
}

/* ------------------------------------------------ Informações (carrossel) */

function renderBanners() {
  const lista = document.getElementById('conteudo-lista');
  const banners = itensDa('banner').slice(0, MAX_BANNERS);
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
        <button type="button" class="btn btn-ghost btn-sm" data-editar="${b.id}">Editar</button>
        <button type="button" class="btn btn-danger btn-sm" data-excluir="${b.id}">Excluir</button>
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

  ligarBotoes(lista);
}

/* ------------------------------------------------- Guias de início (FAQ) */

function renderGuias() {
  const lista = document.getElementById('conteudo-lista');
  const guias = itensDa('guia');

  // Pergunta sem guia não aparece em lugar nenhum — mostra aqui para não virar
  // dado órfão invisível.
  const orfas = ITENS.filter(i => i.secao === 'faq' && !i.parent_id);

  if (!guias.length && !orfas.length) {
    lista.innerHTML = `<div class="card"><div class="empty-state">
      <strong>Nenhum guia criado ainda</strong><p>${escapeHtml(SECOES.guia.vazio)}</p>
    </div></div>`;
    return;
  }

  const blocoOrfas = orfas.length ? `
    <article class="faq-item" style="border-color:var(--warning)">
      <div class="faq-head" style="cursor:default">
        <span style="flex:1;min-width:0">
          <span class="faq-titulo">Perguntas sem guia</span>
          <span class="faq-resumo">Não estão ligadas a nenhum guia, por isso não aparecem na plataforma. Edite cada uma para escolher o guia, ou exclua.</span>
        </span>
      </div>
      <div class="faq-corpo">${orfas.map(linhaPergunta).join('')}</div>
    </article>` : '';

  lista.innerHTML = `<div class="faq">${guias.map(g => {
    const aberto = GUIA_ABERTO === g.id;
    const perguntas = ITENS
      .filter(i => i.secao === 'faq' && i.parent_id === g.id)
      .sort((a, b) => a.posicao - b.posicao);

    return `
      <article class="faq-item ${g.ativo ? '' : 'is-inativo'} ${aberto ? 'is-open' : ''}"
               draggable="true" data-id="${g.id}">
        <div class="faq-head">
          <span class="faq-arrasta" title="Arraste para reordenar" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
              <circle cx="9" cy="6" r=".6"/><circle cx="15" cy="6" r=".6"/>
              <circle cx="9" cy="12" r=".6"/><circle cx="15" cy="12" r=".6"/>
              <circle cx="9" cy="18" r=".6"/><circle cx="15" cy="18" r=".6"/>
            </svg>
          </span>

          <button type="button" class="faq-titulo-btn" data-toggle="${g.id}" aria-expanded="${aberto}">
            <span class="faq-titulo">${escapeHtml(g.titulo)}</span>
          </button>

          ${g.ativo ? '' : badge('rascunho', 'badge-warning')}

          <button type="button" class="faq-acao" data-renomear="${g.id}" title="Renomear guia" aria-label="Renomear guia">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
              <path d="M4 20h4l10.5 -10.5a2.828 2.828 0 1 0 -4 -4l-10.5 10.5v4" /><path d="M13.5 6.5l4 4" />
            </svg>
          </button>

          <button type="button" class="faq-acao" data-toggle="${g.id}" aria-label="Abrir guia">
            <svg class="faq-seta" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5"/>
            </svg>
          </button>
        </div>

        ${aberto ? `
          <div class="faq-corpo">
            ${g.descricao ? `<div class="faq-intro">${escapeHtml(g.descricao)}</div>` : ''}

            <p class="beneficio-titulo">Perguntas e respostas</p>
            ${perguntas.length
              ? perguntas.map(linhaPergunta).join('')
              : `<p class="cell-muted" style="font-size:.8125rem;margin:0 0 .75rem">Este guia ainda não tem perguntas. Adicione a primeira abaixo.</p>`}

            <div class="faq-acoes">
              <button type="button" class="btn btn-ghost btn-sm" data-nova-pergunta="${g.id}">
                + Adicionar pergunta
              </button>
              <span class="pos"></span>
              <button type="button" class="btn btn-ghost btn-sm" data-editar="${g.id}">Editar guia</button>
              <button type="button" class="btn btn-danger btn-sm" data-excluir="${g.id}">Excluir guia</button>
            </div>
          </div>` : ''}
      </article>`;
  }).join('')}${blocoOrfas}</div>`;

  lista.querySelectorAll('[data-toggle]').forEach(btn => {
    btn.addEventListener('click', () => {
      GUIA_ABERTO = GUIA_ABERTO === btn.dataset.toggle ? null : btn.dataset.toggle;
      renderGuias();
    });
  });

  lista.querySelectorAll('[data-renomear]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      renomearNoLugar(btn.dataset.renomear);
    });
  });

  ligarArrastar(lista);
  ligarBotoes(lista);
}

/* ------------------------------------------------- Renomear no próprio item */

/** Troca o título por um campo de texto, sem abrir painel. */
function renomearNoLugar(id) {
  const guia = ITENS.find(i => i.id === id);
  const artigo = document.querySelector(`.faq-item[data-id="${id}"]`);
  if (!guia || !artigo || artigo.querySelector('.faq-titulo-input')) return;

  const botao = artigo.querySelector('.faq-titulo-btn');
  const campo = document.createElement('input');
  campo.type = 'text';
  campo.className = 'faq-titulo-input';
  campo.value = guia.titulo;

  botao.replaceWith(campo);
  campo.focus();
  campo.select();

  let encerrado = false;

  const encerrar = async (salvando) => {
    if (encerrado) return;
    encerrado = true;

    const novo = campo.value.trim();

    if (!salvando || !novo || novo === guia.titulo) {
      renderGuias();
      if (salvando && !novo) toast('O nome do guia não pode ficar vazio.');
      return;
    }

    const { error } = await supabaseClient.from('conteudo_plataforma')
      .update({ titulo: novo }).eq('id', id);

    if (error) {
      toast(`Não foi possível renomear: ${error.message}`);
      renderGuias();
      return;
    }

    guia.titulo = novo;
    renderGuias();
    toast('Guia renomeado.');
  };

  campo.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); encerrar(true); }
    if (e.key === 'Escape') { e.preventDefault(); encerrar(false); }
  });
  campo.addEventListener('blur', () => encerrar(true));
}

/* ------------------------------------------------------ Reordenar por arraste */

let ARRASTANDO = null;

function ligarArrastar(lista) {
  lista.querySelectorAll('.faq-item[draggable]').forEach(item => {
    item.addEventListener('dragstart', (e) => {
      ARRASTANDO = item;
      item.classList.add('is-dragging');
      e.dataTransfer.effectAllowed = 'move';
      // Necessário no Firefox para o arraste iniciar.
      e.dataTransfer.setData('text/plain', item.dataset.id);
    });

    item.addEventListener('dragend', () => {
      item.classList.remove('is-dragging');
      lista.querySelectorAll('.is-drop-alvo').forEach(el => el.classList.remove('is-drop-alvo'));
      ARRASTANDO = null;
    });

    item.addEventListener('dragover', (e) => {
      if (!ARRASTANDO || ARRASTANDO === item) return;
      e.preventDefault();
      item.classList.add('is-drop-alvo');
    });

    item.addEventListener('dragleave', () => item.classList.remove('is-drop-alvo'));

    item.addEventListener('drop', async (e) => {
      e.preventDefault();
      item.classList.remove('is-drop-alvo');
      if (!ARRASTANDO || ARRASTANDO === item) return;
      await reordenar(ARRASTANDO.dataset.id, item.dataset.id);
    });
  });
}

/** Move o guia arrastado para a posição do guia sobre o qual foi solto. */
async function reordenar(idArrastado, idAlvo) {
  const guias = itensDa('guia');
  const de = guias.findIndex(g => g.id === idArrastado);
  const para = guias.findIndex(g => g.id === idAlvo);
  if (de < 0 || para < 0) return;

  const [movido] = guias.splice(de, 1);
  guias.splice(para, 0, movido);

  // Renumera todos em sequência — evita empates e buracos na ordem.
  const mudancas = guias
    .map((g, i) => ({ g, posicao: i + 1 }))
    .filter(({ g, posicao }) => g.posicao !== posicao);

  mudancas.forEach(({ g, posicao }) => { g.posicao = posicao; });
  renderGuias();

  const erros = await Promise.all(mudancas.map(({ g }) =>
    supabaseClient.from('conteudo_plataforma').update({ posicao: g.posicao }).eq('id', g.id)
  ));

  const falhou = erros.find(r => r && r.error);
  if (falhou) {
    toast(`Não foi possível salvar a ordem: ${falhou.error.message}`);
    await carregar();
    return;
  }

  toast('Ordem atualizada.');
}

function linhaPergunta(q) {
  return `
    <div class="pergunta-item ${q.ativo ? '' : 'is-inativo'}">
      <div style="flex:1;min-width:0">
        <p class="pergunta">${escapeHtml(q.titulo)}</p>
        ${q.descricao ? `<p class="resposta">${escapeHtml(q.descricao)}</p>` : ''}
      </div>
      ${q.ativo ? '' : badge('rascunho', 'badge-warning')}
      <button type="button" class="btn btn-ghost btn-sm" data-editar="${q.id}">Editar</button>
      <button type="button" class="btn btn-danger btn-sm" data-excluir="${q.id}">Excluir</button>
    </div>`;
}

/* --------------------------------------------- Serviços com benefícios */

function renderServicos() {
  const lista = document.getElementById('conteudo-lista');
  const servicos = itensDa('servico');

  // Benefícios sem serviço não aparecem na plataforma — mas também não podem
  // sumir daqui em silêncio, senão viram dado órfão invisível.
  const orfaos = ITENS.filter(i => i.secao === 'beneficio' && !i.parent_id);

  if (!servicos.length && !orfaos.length) {
    lista.innerHTML = `<div class="card"><div class="empty-state">
      <strong>Nenhum serviço cadastrado</strong><p>${escapeHtml(SECOES.servico.vazio)}</p>
    </div></div>`;
    return;
  }

  const blocoOrfaos = orfaos.length ? `
    <div class="card servico-bloco" style="border-color:var(--warning)">
      <div class="servico-head">
        <div style="flex:1;min-width:0">
          <h3>Benefícios sem serviço</h3>
          <p>Estes benefícios não estão ligados a nenhum serviço e por isso não aparecem na plataforma. Edite cada um para escolher o serviço, ou exclua.</p>
        </div>
      </div>
      <div class="beneficio-lista">${orfaos.map(linhaBeneficio).join('')}</div>
    </div>` : '';

  lista.innerHTML = servicos.map(servico => {
    const beneficios = ITENS
      .filter(i => i.secao === 'beneficio' && i.parent_id === servico.id)
      .sort((a, b) => a.posicao - b.posicao);

    return `
      <div class="card servico-bloco ${servico.ativo ? '' : 'is-inativo'}">
        <div class="servico-head">
          ${servico.imagem_url
            ? `<div class="servico-thumb" style="background-image:url('${escapeHtml(servico.imagem_url)}')"></div>`
            : ''}
          <div style="flex:1;min-width:0">
            <h3>${escapeHtml(servico.titulo)}</h3>
            <p>${escapeHtml(servico.subtitulo || servico.descricao || '')}</p>
            <span class="pos">Posição ${formatNumber(servico.posicao)} · ${servico.ativo ? 'publicado' : 'rascunho'}</span>
          </div>
          <div style="display:flex;gap:.5rem;flex-shrink:0">
            <button type="button" class="btn btn-ghost btn-sm" data-editar="${servico.id}">Editar</button>
            <button type="button" class="btn btn-danger btn-sm" data-excluir="${servico.id}">Excluir</button>
          </div>
        </div>

        <div class="beneficio-lista">
          <p class="beneficio-titulo">Benefícios associados</p>
          ${beneficios.length
            ? beneficios.map(linhaBeneficio).join('')
            : `<p class="cell-muted" style="font-size:.8125rem;margin:0 0 .75rem">Nenhum benefício associado a este serviço ainda.</p>`}
          <button type="button" class="btn btn-ghost btn-sm" data-novo-beneficio="${servico.id}">
            + Adicionar benefício
          </button>
        </div>
      </div>`;
  }).join('') + blocoOrfaos;

  ligarBotoes(lista);
}

function linhaBeneficio(b) {
  return `
    <div class="beneficio-item ${b.ativo ? '' : 'is-inativo'}">
      ${b.icone ? `<span class="beneficio-icone">${escapeHtml(b.icone)}</span>` : ''}
      <div style="flex:1;min-width:0">
        <p class="nome">${escapeHtml(b.titulo)}</p>
        ${b.descricao ? `<p class="desc">${escapeHtml(b.descricao)}</p>` : ''}
      </div>
      ${b.ativo ? '' : badge('rascunho', 'badge-warning')}
      <button type="button" class="btn btn-ghost btn-sm" data-editar="${b.id}">Editar</button>
      <button type="button" class="btn btn-danger btn-sm" data-excluir="${b.id}">Excluir</button>
    </div>`;
}

function ligarBotoes(host) {
  host.querySelectorAll('[data-editar]').forEach(btn => {
    const item = ITENS.find(i => i.id === btn.dataset.editar);
    btn.addEventListener('click', () => abrirFormulario(item));
  });
  host.querySelectorAll('[data-excluir]').forEach(btn => {
    btn.addEventListener('click', () => excluir(btn.dataset.excluir));
  });
  host.querySelectorAll('[data-novo-beneficio]').forEach(btn => {
    btn.addEventListener('click', () => {
      abrirFormulario({ secao: 'beneficio', parent_id: btn.dataset.novoBeneficio });
    });
  });
  host.querySelectorAll('[data-nova-pergunta]').forEach(btn => {
    btn.addEventListener('click', () => {
      abrirFormulario({ secao: 'faq', parent_id: btn.dataset.novaPergunta });
    });
  });
  host.querySelectorAll('[data-nova-imagem]').forEach(btn => {
    btn.addEventListener('click', () => {
      abrirFormulario({ secao: 'banner', posicao: Number(btn.dataset.novaImagem) });
    });
  });
}

/* -------------------------------------------------------- Criar / editar */

/**
 * `alvo` é o item existente (edição) ou um rascunho {secao, parent_id, posicao}
 * indicando o que criar.
 */
function abrirFormulario(alvo) {
  const editando = Boolean(alvo && alvo.id);
  const secaoKey = alvo.secao;
  const secao = SECOES[secaoKey];
  const item = editando ? alvo : null;

  if (!editando && secaoKey === 'banner' && itensDa('banner').length >= MAX_BANNERS) {
    toast(`O carrossel aceita no máximo ${MAX_BANNERS} imagens.`);
    return;
  }

  // Seções filhas (benefício, pergunta) contam a posição dentro do próprio pai.
  const temPai = secaoKey === 'beneficio' || secaoKey === 'faq';
  const irmaos = ITENS.filter(i =>
    i.secao === secaoKey && (!temPai || i.parent_id === alvo.parent_id)
  );
  const proximaPosicao = alvo.posicao
    ?? irmaos.reduce((max, i) => Math.max(max, i.posicao), 0) + 1;

  const rotulo = (nome) => (ROTULOS_POR_SECAO[secaoKey]?.[nome]) || ROTULOS[nome];

  const campos = secao.campos.map(nome => {
    const valor = item ? (item[nome] ?? '') : '';
    if (nome === 'descricao') {
      const alto = secaoKey === 'faq';
      return `
        <label class="field">
          <span class="field-label">${rotulo(nome)}</span>
          <textarea class="field-textarea" name="${nome}"
                    ${alto ? 'style="min-height:220px"' : ''}
                    placeholder="${alto ? 'Escreva aqui a resposta completa. Quebras de linha são preservadas.' : ''}">${escapeHtml(valor)}</textarea>
        </label>`;
    }
    return `
      <label class="field">
        <span class="field-label">${rotulo(nome)}</span>
        <input class="field-input" name="${nome}" type="text" value="${escapeHtml(valor)}">
      </label>`;
  }).join('');

  // Benefício pende de um serviço; pergunta pende de um guia. Nos dois casos
  // o pai pode ser trocado aqui.
  const parentAtual = item ? item.parent_id : alvo.parent_id;
  const PAI = {
    beneficio: { secao: 'servico', label: 'Serviço associado', vazio: '— escolha um serviço —' },
    faq: { secao: 'guia', label: 'Guia ao qual esta pergunta pertence', vazio: '— escolha um guia —' }
  }[secaoKey];

  const seletorPai = PAI ? `
    <label class="field">
      <span class="field-label">${PAI.label}</span>
      <select class="field-select" name="parent_id">
        <option value="">${PAI.vazio}</option>
        ${itensDa(PAI.secao).map(p =>
          `<option value="${p.id}" ${p.id === parentAtual ? 'selected' : ''}>${escapeHtml(p.titulo)}</option>`
        ).join('')}
      </select>
    </label>` : '';

  const TITULOS_NOVO = {
    banner: 'Nova imagem do carrossel',
    guia: 'Novo guia',
    faq: 'Nova pergunta',
    servico: 'Novo serviço',
    beneficio: 'Novo benefício'
  };

  Drawer.open({
    title: editando ? `Editar ${secao.label.toLowerCase()}` : TITULOS_NOVO[secaoKey],
    subtitle: PLATAFORMA === 'fornecedor' ? 'Plataforma B2B' : 'Plataforma dos noivos',
    body: `
      <form id="form-conteudo">
        ${seletorPai}
        ${campos}

        <p class="drawer-section-title">Publicação</p>
        <div class="field-row">
          <label class="field">
            <span class="field-label">${secaoKey === 'banner' ? 'Ordem no carrossel' : 'Posição'}</span>
            <input class="field-input" name="posicao" type="number" min="0"
                   value="${item ? item.posicao : proximaPosicao}">
          </label>
          <label class="field">
            <span class="field-label">Status</span>
            <select class="field-select" name="ativo">
              <option value="true" ${!item || item.ativo ? 'selected' : ''}>Publicado</option>
              <option value="false" ${item && !item.ativo ? 'selected' : ''}>Rascunho</option>
            </select>
          </label>
        </div>

        <p class="cell-muted" style="font-size:.75rem;line-height:1.6">
          Itens em rascunho continuam aqui, mas não aparecem na plataforma.
          A ordem vai do menor número para o maior.
          ${secaoKey === 'servico' ? 'Excluir um serviço apaga junto os benefícios associados a ele.' : ''}
        </p>
      </form>`,
    footer: `
      <button type="button" class="btn btn-ghost" id="btn-cancelar">Cancelar</button>
      <button type="button" class="btn btn-primary" id="btn-salvar">${editando ? 'Salvar' : 'Publicar'}</button>`
  });

  document.getElementById('btn-cancelar').addEventListener('click', () => Drawer.close());
  document.getElementById('btn-salvar').addEventListener('click', () => salvar(alvo));
}

async function salvar(alvo) {
  const form = document.getElementById('form-conteudo');
  const dados = Object.fromEntries(new FormData(form).entries());
  const secaoKey = alvo.secao;

  const payload = { plataforma: PLATAFORMA, secao: secaoKey };
  SECOES[secaoKey].campos.forEach(nome => {
    payload[nome] = String(dados[nome] || '').trim() || null;
  });
  payload.posicao = Number(dados.posicao) || 0;
  payload.ativo = dados.ativo === 'true';

  if (secaoKey === 'beneficio' || secaoKey === 'faq') {
    payload.parent_id = dados.parent_id || null;
    if (!payload.parent_id) {
      toast(secaoKey === 'faq'
        ? 'Escolha o guia ao qual esta pergunta pertence.'
        : 'Escolha o serviço ao qual este benefício pertence.');
      return;
    }
  }

  if (!payload.titulo) {
    toast(secaoKey === 'faq' ? 'A pergunta não pode ficar vazia.' : 'O título é obrigatório.');
    return;
  }

  Drawer.setFooterBusy(true);
  const { error } = alvo.id
    ? await supabaseClient.from('conteudo_plataforma').update(payload).eq('id', alvo.id)
    : await supabaseClient.from('conteudo_plataforma').insert(payload);
  Drawer.setFooterBusy(false);

  if (error) {
    toast(`Não foi possível salvar: ${error.message}`);
    return;
  }

  Drawer.close();
  toast(alvo.id ? 'Item atualizado.' : 'Item publicado.');
  await carregar();
}

async function excluir(id) {
  const item = ITENS.find(i => i.id === id);
  if (!item) return;

  const filhos = ITENS.filter(i => i.parent_id === id).length;
  const NOME_FILHO = { servico: 'benefício(s) associados', guia: 'pergunta(s) deste guia' };
  const aviso = filhos
    ? `\n\nOs ${filhos} ${NOME_FILHO[item.secao] || 'item(ns) ligados a ele'} também serão excluídos.`
    : '';

  if (!window.confirm(`Excluir "${item.titulo}"? Esta ação não pode ser desfeita.${aviso}`)) return;

  const { error } = await supabaseClient.from('conteudo_plataforma').delete().eq('id', id);

  if (error) {
    toast(`Não foi possível excluir: ${error.message}`);
    return;
  }

  if (GUIA_ABERTO === id) GUIA_ABERTO = null;
  toast('Item excluído.');
  await carregar();
}
