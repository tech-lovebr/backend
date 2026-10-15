/* ==========================================================================
   LOVE ADMIN — Conteúdo do Hub
   Workshops, comunidade, causas, loja e notícias publicados para o Hub
   (tabela hub_conteudo). O dashboard do Hub lista notícias e workshops; a
   página /workshop vai ler daqui.
   ========================================================================== */

const TIPOS_HUB = {
  noticia: { label: 'Notícias', singular: 'Notícia', descricao: 'Links que aparecem na lista de notícias do dashboard do Hub.' },
  workshop: { label: 'Workshops', singular: 'Workshop', descricao: 'Workshops da página hub.love.com.br/workshop. Também entram na lista de notícias do dashboard.' },
  comunidade: { label: 'Comunidade', singular: 'Comunidade', descricao: 'Grupos, encontros e canais da comunidade de fornecedores.' },
  causa: { label: 'Causas', singular: 'Causa', descricao: 'Causas que a Love apoia e divulga para os fornecedores.' },
  loja: { label: 'Loja', singular: 'Item da loja', descricao: 'Produtos e materiais oferecidos aos fornecedores.' }
};

let ITENS_HUB = [];
let TIPO_ATUAL = 'noticia';

document.addEventListener('DOMContentLoaded', async () => {
  if (!(await window.adminReady)) return;

  renderTabs();

  addHeaderAction('Adicionar', () => abrirFormulario(null), {
    icone: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>'
  });

  await carregar();
});

async function carregar() {
  const lista = document.getElementById('conteudo-lista');
  lista.innerHTML = `<div class="card"><div class="card-body"><div class="skeleton" style="width:55%"></div></div></div>`;

  const { data, error } = await safeSelect('hub_conteudo', '*', q => q.order('ordem').order('created_at', { ascending: false }));

  if (error) {
    lista.innerHTML = `
      <div class="card"><div class="empty-state">
        <strong>Banco ainda não está preparado</strong>
        <p>Rode supabase/migrations/052_faq_plataforma_passos_beneficios_hub.sql no SQL Editor do Supabase.</p>
      </div></div>`;
    return;
  }

  ITENS_HUB = data;
  render();
}

function renderTabs() {
  const host = document.getElementById('conteudo-tabs');

  host.innerHTML = Object.entries(TIPOS_HUB).map(([key, t]) => `
    <button type="button" class="conteudo-tab ${key === TIPO_ATUAL ? 'is-active' : ''}" data-tipo="${key}">
      ${t.label}
    </button>`).join('');

  host.querySelectorAll('[data-tipo]').forEach(btn => {
    btn.addEventListener('click', () => {
      TIPO_ATUAL = btn.dataset.tipo;
      renderTabs();
      render();
    });
  });
}

function render() {
  const lista = document.getElementById('conteudo-lista');
  const tipo = TIPOS_HUB[TIPO_ATUAL];
  const itens = ITENS_HUB.filter(i => i.tipo === TIPO_ATUAL).sort((a, b) => a.ordem - b.ordem);

  lista.innerHTML = `
    <div class="card">
      <div class="card-head">
        <div><h2>${tipo.label}</h2><p>${tipo.descricao}</p></div>
      </div>
      ${itens.length ? itens.map(i => `
        <div class="hub-item ${i.ativo ? '' : 'is-inativo'}">
          ${i.imagem_url ? `<div class="servico-thumb" style="background-image:url('${escapeHtml(i.imagem_url)}')"></div>` : ''}
          <div style="flex:1;min-width:0">
            <p class="nome">${escapeHtml(i.titulo)}</p>
            ${i.descricao ? `<p class="desc">${escapeHtml(i.descricao)}</p>` : ''}
            <p class="meta">
              ${i.data_evento ? `${escapeHtml(formatDate(i.data_evento))} · ` : ''}
              ${i.link_url ? escapeHtml(i.link_url) : 'sem link'} · posição ${formatNumber(i.ordem)}
            </p>
          </div>
          ${i.ativo ? '' : badge('rascunho', 'badge-warning')}
          <button type="button" class="btn btn-ghost btn-sm" data-editar="${i.id}">Editar</button>
          <button type="button" class="btn btn-danger btn-sm" data-excluir="${i.id}">Excluir</button>
        </div>`).join('')
      : `<div class="empty-state"><strong>Nada publicado em ${tipo.label.toLowerCase()}</strong>
          <p>Clique em "Adicionar" no cabeçalho para publicar o primeiro item.</p></div>`}
    </div>`;

  lista.querySelectorAll('[data-editar]').forEach(btn => {
    btn.addEventListener('click', () => abrirFormulario(ITENS_HUB.find(i => i.id === btn.dataset.editar)));
  });
  lista.querySelectorAll('[data-excluir]').forEach(btn => {
    btn.addEventListener('click', () => excluir(btn.dataset.excluir));
  });
}

function abrirFormulario(item) {
  const editando = Boolean(item && item.id);
  const tipo = item?.tipo || TIPO_ATUAL;
  const irmaos = ITENS_HUB.filter(i => i.tipo === tipo);
  const proxima = irmaos.reduce((max, i) => Math.max(max, Number(i.ordem) || 0), 0) + 1;

  Drawer.open({
    title: editando ? `Editar ${TIPOS_HUB[tipo].singular.toLowerCase()}` : `Novo: ${TIPOS_HUB[tipo].singular.toLowerCase()}`,
    subtitle: 'Hub / B2B',
    body: `
      <form id="form-conteudo">
        <label class="field">
          <span class="field-label">Tipo</span>
          <select class="field-select" name="tipo">
            ${Object.entries(TIPOS_HUB).map(([k, t]) => `<option value="${k}" ${k === tipo ? 'selected' : ''}>${t.singular}</option>`).join('')}
          </select>
        </label>
        <label class="field">
          <span class="field-label">Título <span class="campo-obrigatorio">*</span></span>
          <input class="field-input" name="titulo" type="text" maxlength="140" value="${escapeHtml(item?.titulo || '')}">
        </label>
        <label class="field">
          <span class="field-label">Descrição</span>
          <textarea class="field-textarea" name="descricao">${escapeHtml(item?.descricao || '')}</textarea>
        </label>
        ${campoImagem('imagem_url', 'Imagem', item?.imagem_url)}
        <div class="field-row">
          <label class="field">
            <span class="field-label">Link</span>
            <input class="field-input" name="link_url" type="url" placeholder="https://" value="${escapeHtml(item?.link_url || '')}">
          </label>
          <label class="field" style="flex:0 0 160px">
            <span class="field-label">Data (se for evento)</span>
            <input class="field-input" name="data_evento" type="date" value="${escapeHtml(item?.data_evento || '')}">
          </label>
        </div>
        ${blocoPublicacao(item?.ordem ?? proxima, !item || item.ativo)}
      </form>`,
    footer: `
      <button type="button" class="btn btn-ghost" id="btn-cancelar">Cancelar</button>
      <button type="button" class="btn btn-primary" id="btn-salvar">${editando ? 'Salvar' : 'Publicar'}</button>`
  });

  const form = document.getElementById('form-conteudo');
  ligarCamposDeImagem(form, 'hub');
  document.getElementById('btn-cancelar').addEventListener('click', () => Drawer.close());
  document.getElementById('btn-salvar').addEventListener('click', async () => {
    const d = Object.fromEntries(new FormData(form).entries());
    if (!d.titulo.trim()) return toast('O título é obrigatório.');

    const payload = {
      tipo: d.tipo,
      titulo: d.titulo.trim(),
      descricao: d.descricao.trim() || null,
      imagem_url: d.imagem_url.trim() || null,
      link_url: d.link_url.trim() || null,
      data_evento: d.data_evento || null,
      ordem: Number(d.posicao) || 0,
      ativo: d.ativo === 'true'
    };

    Drawer.setFooterBusy(true);
    const { error } = editando
      ? await supabaseClient.from('hub_conteudo').update(payload).eq('id', item.id)
      : await supabaseClient.from('hub_conteudo').insert(payload);
    Drawer.setFooterBusy(false);

    if (error) return toast(`Não foi possível salvar: ${error.message}`);

    Drawer.close();
    toast(editando ? 'Item atualizado.' : 'Item publicado.');
    TIPO_ATUAL = payload.tipo;
    renderTabs();
    await carregar();
  });
}

async function excluir(id) {
  const item = ITENS_HUB.find(i => i.id === id);
  if (!item || !window.confirm(`Excluir "${item.titulo}"? Esta ação não pode ser desfeita.`)) return;

  const { error } = await supabaseClient.from('hub_conteudo').delete().eq('id', id);
  if (error) return toast(`Não foi possível excluir: ${error.message}`);

  toast('Item excluído.');
  await carregar();
}
