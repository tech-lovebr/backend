/* ==========================================================================
   LOVE ADMIN — Love Viagens
   Pacotes de viagem vendidos dentro da plataforma.
   ========================================================================== */

const TIPOS_VIAGEM = {
  lua_de_mel: 'Lua de mel',
  destination_wedding: 'Destination wedding',
  experiencia: 'Experiência',
  outro: 'Outro'
};

let PACOTES = [];

document.addEventListener('DOMContentLoaded', async () => {
  if (!(await window.adminReady)) return;

  const tbody = document.getElementById('tbody');
  renderLoading(tbody, 7);

  const { data, error } = await safeSelect('viagens_pacotes', '*', q => q.order('posicao', { ascending: true }));
  if (error) return renderError(tbody, 7, error);

  PACOTES = data;
  renderKpis();
  render();

  document.getElementById('busca').addEventListener('input', render);
  document.getElementById('filtro-tipo').addEventListener('change', render);

  addHeaderAction('Novo pacote', () => abrirFormulario(null), {
    icone: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>'
  });
  moverControlesParaHeader();
  aplicarBuscaDaUrl(document.getElementById('busca'));
});

function renderKpis() {
  const publicados = PACOTES.filter(p => p.ativo);
  const vendidas = PACOTES.reduce((t, p) => t + (p.vagas_vendidas || 0), 0);
  const receita = PACOTES.reduce((t, p) => t + (p.vagas_vendidas || 0) * (Number(p.preco) || 0), 0);
  const disponiveis = PACOTES.reduce((t, p) => t + Math.max((p.vagas || 0) - (p.vagas_vendidas || 0), 0), 0);

  const tile = (label, value, sub) => `
    <div class="kpi"><p class="kpi-label">${label}</p><p class="kpi-value">${value}</p><p class="kpi-sub">${sub}</p></div>`;

  document.getElementById('kpi-grid').innerHTML = [
    tile('Pacotes', formatNumber(PACOTES.length), `${formatNumber(publicados.length)} publicados`),
    tile('Vagas vendidas', formatNumber(vendidas), `${formatNumber(disponiveis)} ainda disponíveis`),
    tile('Receita', formatCurrency(receita), 'Vagas vendidas × preço'),
    tile('Em destaque', formatNumber(PACOTES.filter(p => p.destaque).length), 'Aparecem no topo da vitrine')
  ].join('');
}

function filtrar() {
  const termo = document.getElementById('busca').value.trim().toLowerCase();
  const tipo = document.getElementById('filtro-tipo').value;

  return PACOTES.filter(p => {
    if (tipo && p.tipo !== tipo) return false;
    if (!termo) return true;
    return [p.titulo, p.destino, p.descricao]
      .some(v => String(v || '').toLowerCase().includes(termo));
  });
}

function periodo(p) {
  if (p.data_inicio && p.data_fim) return `${formatDate(p.data_inicio)} → ${formatDate(p.data_fim)}`;
  if (p.duracao_noites) return `${formatNumber(p.duracao_noites)} noites`;
  return '—';
}

function render() {
  const tbody = document.getElementById('tbody');
  const lista = filtrar().sort((a, b) => a.posicao - b.posicao);

  if (!lista.length) {
    renderEmpty(tbody, 7, 'Nenhum pacote encontrado',
      PACOTES.length
        ? 'Ajuste a busca ou o filtro de tipo.'
        : 'Cadastre o primeiro pacote para ele aparecer na vitrine da Love Viagens.');
    return;
  }

  tbody.innerHTML = lista.map(p => {
    const vendidas = p.vagas_vendidas || 0;
    const total = p.vagas || 0;
    const esgotado = total > 0 && vendidas >= total;

    return `
      <tr data-id="${p.id}">
        <td>
          <span class="cell-strong">${escapeHtml(p.titulo)}</span>
          ${p.destaque ? badge('destaque', 'badge-info') : ''}
        </td>
        <td>${dash(p.destino)}</td>
        <td class="cell-muted">${escapeHtml(TIPOS_VIAGEM[p.tipo] || p.tipo)}</td>
        <td class="cell-muted">${escapeHtml(periodo(p))}</td>
        <td class="cell-strong">
          ${formatCurrency(p.preco)}
          ${p.parcelas > 1 ? `<br><span class="cell-muted">em ${formatNumber(p.parcelas)}x</span>` : ''}
        </td>
        <td>${total ? `${formatNumber(vendidas)}/${formatNumber(total)}` : '<span class="cell-muted">—</span>'}
          ${esgotado ? badge('esgotado', 'badge-danger') : ''}</td>
        <td>${badge(p.ativo ? 'Publicado' : 'Rascunho', p.ativo ? 'badge-success' : 'badge-warning')}</td>
      </tr>`;
  }).join('');

  tbody.querySelectorAll('tr[data-id]').forEach(tr => {
    tr.addEventListener('click', () => abrirFormulario(PACOTES.find(p => p.id === tr.dataset.id)));
  });
}

function abrirFormulario(item) {
  const campo = (name, label, valor, tipo = 'text', extra = '') => `
    <label class="field">
      <span class="field-label">${label}</span>
      <input class="field-input" name="${name}" type="${tipo}" ${extra} value="${escapeHtml(valor ?? '')}">
    </label>`;

  const inclui = Array.isArray(item?.inclui) ? item.inclui.join('\n') : '';

  Drawer.open({
    title: item ? item.titulo : 'Novo pacote',
    subtitle: 'Vitrine da Love Viagens',
    body: `
      <form id="form-pacote">
        <p class="drawer-section-title">O pacote</p>
        ${campo('titulo', 'Título', item?.titulo)}
        <div class="field-row">
          ${campo('destino', 'Destino', item?.destino)}
          <label class="field">
            <span class="field-label">Tipo</span>
            <select class="field-select" name="tipo">
              ${Object.entries(TIPOS_VIAGEM).map(([v, l]) =>
                `<option value="${v}" ${item?.tipo === v ? 'selected' : ''}>${l}</option>`).join('')}
            </select>
          </label>
        </div>
        <label class="field">
          <span class="field-label">Descrição</span>
          <textarea class="field-textarea" name="descricao">${escapeHtml(item?.descricao || '')}</textarea>
        </label>
        ${campo('imagem_url', 'URL da imagem', item?.imagem_url)}

        <label class="field">
          <span class="field-label">O que está incluso (um por linha)</span>
          <textarea class="field-textarea" name="inclui" placeholder="Aéreo ida e volta&#10;Café da manhã&#10;Transfer do aeroporto">${escapeHtml(inclui)}</textarea>
        </label>

        <p class="drawer-section-title">Datas e vagas</p>
        <div class="field-row">
          ${campo('data_inicio', 'Saída', item?.data_inicio, 'date')}
          ${campo('data_fim', 'Retorno', item?.data_fim, 'date')}
        </div>
        <div class="field-row">
          ${campo('duracao_noites', 'Noites', item?.duracao_noites ?? '', 'number', 'min="0"')}
          ${campo('vagas', 'Vagas', item?.vagas ?? '', 'number', 'min="0"')}
        </div>
        ${campo('vagas_vendidas', 'Vagas vendidas', item?.vagas_vendidas ?? 0, 'number', 'min="0"')}

        <p class="drawer-section-title">Preço</p>
        <div class="field-row">
          ${campo('preco', 'Preço (R$)', item?.preco ?? 0, 'number', 'step="0.01" min="0"')}
          ${campo('preco_de', 'Preço cheio (opcional)', item?.preco_de ?? '', 'number', 'step="0.01" min="0"')}
        </div>
        ${campo('parcelas', 'Parcelas', item?.parcelas ?? 1, 'number', 'min="1"')}

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
  return PACOTES.reduce((max, p) => Math.max(max, p.posicao), 0) + 1;
}

async function salvar(id) {
  const form = document.getElementById('form-pacote');
  const d = Object.fromEntries(new FormData(form).entries());

  const numeroOuNulo = (v) => (v === '' ? null : Number(v));

  const payload = {
    titulo: d.titulo.trim(),
    destino: d.destino.trim() || null,
    descricao: d.descricao.trim() || null,
    imagem_url: d.imagem_url.trim() || null,
    tipo: d.tipo,
    // Uma linha por item, sem linhas vazias.
    inclui: d.inclui.split('\n').map(l => l.trim()).filter(Boolean),
    data_inicio: d.data_inicio || null,
    data_fim: d.data_fim || null,
    duracao_noites: numeroOuNulo(d.duracao_noites),
    vagas: numeroOuNulo(d.vagas),
    vagas_vendidas: Number(d.vagas_vendidas) || 0,
    preco: Number(d.preco) || 0,
    preco_de: numeroOuNulo(d.preco_de),
    parcelas: Number(d.parcelas) || 1,
    destaque: d.destaque === 'true',
    posicao: Number(d.posicao) || 0,
    ativo: d.ativo === 'true'
  };

  if (!payload.titulo) {
    toast('O título do pacote é obrigatório.');
    return;
  }

  if (payload.vagas !== null && payload.vagas_vendidas > payload.vagas) {
    toast('Vagas vendidas não pode passar do total de vagas.');
    return;
  }

  Drawer.setFooterBusy(true);
  const { error } = id
    ? await supabaseClient.from('viagens_pacotes').update(payload).eq('id', id)
    : await supabaseClient.from('viagens_pacotes').insert(payload);
  Drawer.setFooterBusy(false);

  if (error) {
    toast(`Não foi possível salvar: ${error.message}`);
    return;
  }

  Drawer.close();
  toast(id ? 'Pacote atualizado.' : 'Pacote publicado.');
  window.location.reload();
}

async function excluir(item) {
  if (!window.confirm(`Excluir "${item.titulo}"? Ele deixa de aparecer na vitrine.`)) return;

  const { error } = await supabaseClient.from('viagens_pacotes').delete().eq('id', item.id);
  if (error) {
    toast(`Não foi possível excluir: ${error.message}`);
    return;
  }

  Drawer.close();
  toast('Pacote excluído.');
  window.location.reload();
}
