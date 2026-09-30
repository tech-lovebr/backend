/* ==========================================================================
   LOVE ADMIN — Serviços e benefícios
   O que aparece na página de benefícios da plataforma dos noivos, com preço.
   ========================================================================== */

const PERIODICIDADE = { unico: 'Pagamento único', mensal: 'Por mês', anual: 'Por ano' };

let SERVICOS = [];

document.addEventListener('DOMContentLoaded', async () => {
  if (!(await window.adminReady)) return;

  const tbody = document.getElementById('tbody');
  renderLoading(tbody, 6);

  const { data, error } = await safeSelect('servicos_beneficios', '*', q => q.order('posicao', { ascending: true }));
  if (error) return renderError(tbody, 6, error);

  SERVICOS = data;
  montarFiltroCategorias();
  renderKpis();
  render();

  document.getElementById('busca').addEventListener('input', render);
  document.getElementById('filtro-categoria').addEventListener('change', render);

  addHeaderAction('Novo serviço', () => abrirFormulario(null), {
    icone: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>'
  });
  moverControlesParaHeader();
  aplicarBuscaDaUrl(document.getElementById('busca'));
});

function montarFiltroCategorias() {
  const select = document.getElementById('filtro-categoria');
  [...new Set(SERVICOS.map(s => s.categoria).filter(Boolean))].sort().forEach(c => {
    const opt = document.createElement('option');
    opt.value = c;
    opt.textContent = c;
    select.appendChild(opt);
  });
}

function renderKpis() {
  const ativos = SERVICOS.filter(s => s.ativo);
  const ticketMedio = ativos.length
    ? ativos.reduce((t, s) => t + (Number(s.preco) || 0), 0) / ativos.length
    : 0;

  const tile = (label, value, sub) => `
    <div class="kpi"><p class="kpi-label">${label}</p><p class="kpi-value">${value}</p><p class="kpi-sub">${sub}</p></div>`;

  document.getElementById('kpi-grid').innerHTML = [
    tile('Serviços', formatNumber(SERVICOS.length), `${formatNumber(ativos.length)} publicados`),
    tile('Categorias', formatNumber(new Set(SERVICOS.map(s => s.categoria).filter(Boolean)).size), 'Tipos de benefício'),
    tile('Preço médio', formatCurrency(ticketMedio), 'Entre os serviços publicados'),
    tile('Em destaque', formatNumber(SERVICOS.filter(s => s.destaque).length), 'Aparecem no topo da página')
  ].join('');
}

function filtrar() {
  const termo = document.getElementById('busca').value.trim().toLowerCase();
  const categoria = document.getElementById('filtro-categoria').value;

  return SERVICOS.filter(s => {
    if (categoria && s.categoria !== categoria) return false;
    if (!termo) return true;
    return [s.nome, s.parceiro, s.categoria, s.descricao]
      .some(v => String(v || '').toLowerCase().includes(termo));
  });
}

function render() {
  const tbody = document.getElementById('tbody');
  const lista = filtrar().sort((a, b) => a.posicao - b.posicao);

  if (!lista.length) {
    renderEmpty(tbody, 6, 'Nenhum serviço encontrado',
      SERVICOS.length
        ? 'Ajuste a busca ou o filtro de categoria.'
        : 'Cadastre o primeiro serviço para ele aparecer na página de benefícios da plataforma.');
    return;
  }

  tbody.innerHTML = lista.map(s => `
    <tr data-id="${s.id}">
      <td>
        <span class="cell-strong">${escapeHtml(s.nome)}</span>
        ${s.destaque ? badge('destaque', 'badge-info') : ''}
        ${s.descricao ? `<br><span class="cell-muted">${escapeHtml(s.descricao.slice(0, 70))}${s.descricao.length > 70 ? '…' : ''}</span>` : ''}
      </td>
      <td>${dash(s.categoria)}</td>
      <td class="cell-muted">${dash(s.parceiro)}</td>
      <td class="cell-strong">
        ${formatCurrency(s.preco)}
        ${s.preco_de ? `<br><span class="cell-muted" style="text-decoration:line-through">${formatCurrency(s.preco_de)}</span>` : ''}
      </td>
      <td class="cell-muted">${escapeHtml(PERIODICIDADE[s.periodicidade] || s.periodicidade)}</td>
      <td>${badge(s.ativo ? 'Publicado' : 'Rascunho', s.ativo ? 'badge-success' : 'badge-warning')}</td>
    </tr>`).join('');

  tbody.querySelectorAll('tr[data-id]').forEach(tr => {
    tr.addEventListener('click', () => abrirFormulario(SERVICOS.find(s => s.id === tr.dataset.id)));
  });
}

function abrirFormulario(item) {
  const campo = (name, label, valor, tipo = 'text', extra = '') => `
    <label class="field">
      <span class="field-label">${label}</span>
      <input class="field-input" name="${name}" type="${tipo}" ${extra} value="${escapeHtml(valor ?? '')}">
    </label>`;

  Drawer.open({
    title: item ? item.nome : 'Novo serviço',
    subtitle: 'Página de benefícios da plataforma dos noivos',
    body: `
      <form id="form-servico">
        <p class="drawer-section-title">O serviço</p>
        ${campo('nome', 'Nome', item?.nome)}
        <div class="field-row">
          ${campo('categoria', 'Categoria', item?.categoria)}
          ${campo('parceiro', 'Parceiro', item?.parceiro)}
        </div>
        <label class="field">
          <span class="field-label">Descrição</span>
          <textarea class="field-textarea" name="descricao">${escapeHtml(item?.descricao || '')}</textarea>
        </label>
        ${campo('imagem_url', 'URL da imagem', item?.imagem_url)}
        ${campo('link_url', 'Link de contratação', item?.link_url)}

        <p class="drawer-section-title">Preço</p>
        <div class="field-row">
          ${campo('preco', 'Preço (R$)', item?.preco ?? 0, 'number', 'step="0.01" min="0"')}
          ${campo('preco_de', 'Preço cheio (opcional)', item?.preco_de ?? '', 'number', 'step="0.01" min="0"')}
        </div>
        <label class="field">
          <span class="field-label">Cobrança</span>
          <select class="field-select" name="periodicidade">
            ${Object.entries(PERIODICIDADE).map(([v, l]) =>
              `<option value="${v}" ${item?.periodicidade === v ? 'selected' : ''}>${l}</option>`).join('')}
          </select>
        </label>

        <p class="drawer-section-title">Publicação</p>
        <div class="field-row">
          ${campo('posicao', 'Posição', item ? item.posicao : proximaPosicao(), 'number', 'min="0"')}
          <label class="field">
            <span class="field-label">Status</span>
            <select class="field-select" name="ativo">
              <option value="true" ${!item || item.ativo ? 'selected' : ''}>Publicado</option>
              <option value="false" ${item && !item.ativo ? 'selected' : ''}>Rascunho</option>
            </select>
          </label>
        </div>
        <label class="field">
          <span class="field-label">Destaque</span>
          <select class="field-select" name="destaque">
            <option value="false" ${!item?.destaque ? 'selected' : ''}>Normal</option>
            <option value="true" ${item?.destaque ? 'selected' : ''}>Em destaque</option>
          </select>
        </label>

        <p class="cell-muted" style="font-size:.75rem;line-height:1.6">
          "Preço cheio" só aparece para o cliente quando for maior que o preço —
          é ele que vira o valor riscado ao lado da promoção.
        </p>
      </form>`,
    footer: `
      ${item ? '<button type="button" class="btn btn-danger" id="btn-excluir">Excluir</button>' : ''}
      <button type="button" class="btn btn-ghost" id="btn-cancelar">Cancelar</button>
      <button type="button" class="btn btn-primary" id="btn-salvar">${item ? 'Salvar' : 'Publicar'}</button>`
  });

  document.getElementById('btn-cancelar').addEventListener('click', () => Drawer.close());
  document.getElementById('btn-salvar').addEventListener('click', () => salvar(item?.id));
  document.getElementById('btn-excluir')?.addEventListener('click', () => excluir(item));
}

function proximaPosicao() {
  return SERVICOS.reduce((max, s) => Math.max(max, s.posicao), 0) + 1;
}

async function salvar(id) {
  const form = document.getElementById('form-servico');
  const d = Object.fromEntries(new FormData(form).entries());

  const payload = {
    nome: d.nome.trim(),
    categoria: d.categoria.trim() || null,
    parceiro: d.parceiro.trim() || null,
    descricao: d.descricao.trim() || null,
    imagem_url: d.imagem_url.trim() || null,
    link_url: d.link_url.trim() || null,
    preco: Number(d.preco) || 0,
    preco_de: d.preco_de === '' ? null : Number(d.preco_de),
    periodicidade: d.periodicidade,
    destaque: d.destaque === 'true',
    posicao: Number(d.posicao) || 0,
    ativo: d.ativo === 'true'
  };

  if (!payload.nome) {
    toast('O nome do serviço é obrigatório.');
    return;
  }

  Drawer.setFooterBusy(true);
  const { error } = id
    ? await supabaseClient.from('servicos_beneficios').update(payload).eq('id', id)
    : await supabaseClient.from('servicos_beneficios').insert(payload);
  Drawer.setFooterBusy(false);

  if (error) {
    toast(`Não foi possível salvar: ${error.message}`);
    return;
  }

  Drawer.close();
  toast(id ? 'Serviço atualizado.' : 'Serviço publicado.');
  window.location.reload();
}

async function excluir(item) {
  if (!window.confirm(`Excluir "${item.nome}"? Ele deixa de aparecer na plataforma.`)) return;

  const { error } = await supabaseClient.from('servicos_beneficios').delete().eq('id', item.id);
  if (error) {
    toast(`Não foi possível excluir: ${error.message}`);
    return;
  }

  Drawer.close();
  toast('Serviço excluído.');
  window.location.reload();
}
