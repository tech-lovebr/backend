/* ==========================================================================
   LOVE ADMIN — Serviços e benefícios
   O que aparece na página de benefícios da plataforma dos anfitriões
   (servicos_beneficios), cada um vinculado a um parceiro (parceiros,
   migration 061).

   - Linha sem clique: caixinha para seleção em massa (excluir) e as três
     bolinhas no fim abrem o drawer do serviço.
   - O nome do parceiro na tabela abre o drawer do parceiro, onde dá para
     editar, suspender a parceria (tira do ar os serviços dela) ou excluir.
   ========================================================================== */

const PERIODICIDADE = { unico: 'Pagamento único', mensal: 'Por mês', anual: 'Por ano' };

/* Segmentos dos serviços: os mesmos dos fornecedores de eventos (Hub), mais
   os que só existem como benefício. */
const CATEGORIAS_SERVICO = [
  'Assessoria e Cerimonialista', 'Espaços para Locação', 'Buffet e Gastronomia', 'Bar e Bebidas',
  'Staff e Mão de Obra', 'Mídia e Audiovisual', 'Música e Entretenimento', 'Decoração',
  'Trajes, Beleza e Estilo', 'Aluguel de Carros', 'Seguros', 'Viagens e Hospedagem',
  'Casa e Eletrodomésticos', 'Saúde e Bem-estar', 'Outros'
];

const ICONE_MAIS = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>';
const ICONE_LIXEIRA = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7l16 0" /><path d="M10 11l0 6" /><path d="M14 11l0 6" /><path d="M5 7l1 12a2 2 0 0 0 2 2h8a2 2 0 0 0 2 -2l1 -12" /><path d="M9 7v-3a1 1 0 0 1 1 -1h4a1 1 0 0 1 1 1v3" /></svg>';

let SERVICOS = [];
let PARCEIROS = [];
let SELECIONADAS = new Set();
let PARCEIROS_OK = true;

document.addEventListener('DOMContentLoaded', async () => {
  if (!(await window.adminReady)) return;

  const tbody = document.getElementById('tbody');
  renderLoading(tbody, 7);

  const [servicos, parceiros] = await Promise.all([
    safeSelect('servicos_beneficios', '*', q => q.order('posicao', { ascending: true })),
    safeSelect('parceiros', '*', q => q.order('nome'))
  ]);
  if (servicos.error) return renderError(tbody, 7, servicos.error);

  SERVICOS = servicos.data;
  PARCEIROS = parceiros.data;
  PARCEIROS_OK = !parceiros.error;

  montarFiltroCategorias();
  renderKpis();
  render();
  ligarSelecao();

  document.getElementById('busca').addEventListener('input', render);
  document.getElementById('filtro-categoria').addEventListener('change', render);

  addHeaderAction('Novo parceiro', () => abrirParceiro(null), { icone: ICONE_MAIS, principal: true });
  addHeaderAction('Novo serviço', () => abrirFormulario(null), { icone: ICONE_MAIS, principal: true });
  moverControlesParaHeader();
  aplicarBuscaDaUrl(document.getElementById('busca'));
});

const parceiroDe = s => PARCEIROS.find(p => p.id === s.parceiro_id) || null;
const nomeDoParceiro = s => (parceiroDe(s) || {}).nome || s.parceiro || '';

function montarFiltroCategorias() {
  const select = document.getElementById('filtro-categoria');
  [...new Set(SERVICOS.map(s => s.categoria).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'pt-BR')).forEach(c => {
    const opt = document.createElement('option');
    opt.value = c;
    opt.textContent = c;
    select.appendChild(opt);
  });
}

function renderKpis() {
  const ativos = SERVICOS.filter(s => s.ativo);
  const tile = (label, value, sub) => `
    <div class="kpi"><p class="kpi-label">${label}</p><p class="kpi-value">${value}</p><p class="kpi-sub">${sub}</p></div>`;

  document.getElementById('kpi-grid').innerHTML = [
    tile('Serviços', formatNumber(SERVICOS.length), `${formatNumber(ativos.length)} publicados`),
    tile('Parceiros', formatNumber(PARCEIROS.length), `${formatNumber(PARCEIROS.filter(p => p.status === 'suspenso').length)} suspensos`),
    tile('Com cupom', formatNumber(SERVICOS.filter(s => s.cupom).length), 'Cupons de desconto ativos'),
    tile('Categorias', formatNumber(new Set(SERVICOS.map(s => s.categoria).filter(Boolean)).size), 'Segmentos usados')
  ].join('');
}

function filtrar() {
  const termo = document.getElementById('busca').value.trim().toLowerCase();
  const categoria = document.getElementById('filtro-categoria').value;

  return SERVICOS.filter(s => {
    if (categoria && s.categoria !== categoria) return false;
    if (!termo) return true;
    return [s.nome, s.titulo, nomeDoParceiro(s), s.categoria, s.descricao, s.cupom]
      .some(v => String(v || '').toLowerCase().includes(termo));
  });
}

/* Coluna Cupom: o código e, embaixo, o desconto ou o preço. */
function celulaCupom(s) {
  const detalhe = s.desconto_texto
    ? escapeHtml(s.desconto_texto)
    : Number(s.preco) > 0 ? escapeHtml(formatCurrency(s.preco)) : '';
  if (!s.cupom && !detalhe) return '<span class="cell-muted">—</span>';
  return `${s.cupom ? celulaCopiavel(s.cupom, 'Cupom') : '<span class="cell-muted">sem cupom</span>'}
    ${detalhe ? `<br><span class="cell-muted">${detalhe}</span>` : ''}`;
}

function render() {
  const tbody = document.getElementById('tbody');
  const lista = filtrar().sort((a, b) => a.posicao - b.posicao);

  if (!lista.length) {
    renderBarraDeSelecao();
    renderEmpty(tbody, 7, 'Nenhum serviço encontrado',
      SERVICOS.length
        ? 'Ajuste a busca ou o filtro de categoria.'
        : 'Cadastre o primeiro serviço para ele aparecer na página de benefícios da plataforma.');
    return;
  }

  tbody.innerHTML = lista.map(s => {
    const parceiro = parceiroDe(s);
    const marcada = SELECIONADAS.has(s.id);
    return `
    <tr data-id="${s.id}" class="${marcada ? 'is-selecionada' : ''}">
      <td class="col-selecao">
        <input type="checkbox" data-selecionar="${s.id}" ${marcada ? 'checked' : ''} aria-label="Selecionar ${escapeHtml(s.nome)}">
      </td>
      <td>
        <span class="cell-strong">${escapeHtml(s.titulo || s.nome)}</span>
        ${s.destaque ? badge('destaque', 'badge-info') : ''}
        ${s.descricao ? `<br><span class="cell-muted">${escapeHtml(s.descricao.slice(0, 70))}${s.descricao.length > 70 ? '…' : ''}</span>` : ''}
      </td>
      <td>${dash(s.categoria)}</td>
      <td>${parceiro
        ? `<button type="button" class="link-parceiro" data-parceiro="${parceiro.id}">${escapeHtml(parceiro.nome)}</button>${parceiro.status === 'suspenso' ? ` ${badge('suspenso', '')}` : ''}`
        : `<span class="cell-muted">${dash(s.parceiro)}</span>`}</td>
      <td>${celulaCupom(s)}</td>
      <td>${badge(s.ativo ? 'Publicado' : 'Rascunho', s.ativo ? 'badge-success' : 'badge-warning')}</td>
      <td class="col-acoes">${botaoVerMais(s.id)}</td>
    </tr>`;
  }).join('');

  ligarAcoesDaLinha(tbody, id => abrirFormulario(SERVICOS.find(s => s.id === id)));

  tbody.querySelectorAll('[data-parceiro]').forEach(btn => {
    btn.addEventListener('click', () => abrirParceiro(PARCEIROS.find(p => p.id === btn.dataset.parceiro)));
  });

  tbody.querySelectorAll('[data-selecionar]').forEach(caixa => {
    caixa.addEventListener('change', () => {
      if (caixa.checked) SELECIONADAS.add(caixa.dataset.selecionar);
      else SELECIONADAS.delete(caixa.dataset.selecionar);
      caixa.closest('tr').classList.toggle('is-selecionada', caixa.checked);
      renderBarraDeSelecao();
    });
  });

  renderBarraDeSelecao();
}

/* ------------------------------------------------------ Seleção em massa */

function ligarSelecao() {
  document.getElementById('selecionar-todos').addEventListener('change', (e) => {
    const visiveis = filtrar().map(s => s.id);
    if (e.target.checked) visiveis.forEach(id => SELECIONADAS.add(id));
    else visiveis.forEach(id => SELECIONADAS.delete(id));
    render();
  });
  document.getElementById('btn-limpar-selecao').addEventListener('click', () => { SELECIONADAS.clear(); render(); });
  document.getElementById('btn-excluir-selecao').addEventListener('click', perguntarExclusaoEmMassa);
}

function renderBarraDeSelecao() {
  const total = SELECIONADAS.size;
  document.getElementById('barra-selecao').hidden = total === 0;
  document.getElementById('selecao-contagem').textContent =
    `${formatNumber(total)} ${total === 1 ? 'serviço selecionado' : 'serviços selecionados'}`;

  const visiveis = filtrar().map(s => s.id);
  const todos = document.getElementById('selecionar-todos');
  todos.checked = visiveis.length > 0 && visiveis.every(id => SELECIONADAS.has(id));
  todos.indeterminate = !todos.checked && visiveis.some(id => SELECIONADAS.has(id));
}

const qtdServicos = n => `${formatNumber(n)} ${n === 1 ? 'serviço' : 'serviços'}`;

function perguntarExclusaoEmMassa() {
  const ids = [...SELECIONADAS];
  Modal.abrir({
    titulo: `Deseja excluir ${qtdServicos(ids.length)}?`,
    texto: `${ids.length === 1 ? 'Ele deixa' : 'Eles deixam'} de aparecer na plataforma. Esta ação não pode ser desfeita.`,
    acoes: [
      { rotulo: 'Excluir', classe: 'btn-danger', aoClicar: () => excluirServicos(ids) },
      { rotulo: 'Cancelar', classe: 'btn-ghost', aoClicar: () => Modal.fechar() }
    ]
  });
}

async function excluirServicos(ids) {
  Modal.ocupado(true);
  const { data, error } = await supabaseClient.from('servicos_beneficios').delete().in('id', ids).select('id');
  Modal.ocupado(false);
  Modal.fechar();
  if (error) return toast(`Não foi possível excluir: ${error.message}`);

  const apagados = new Set((data || []).map(r => r.id));
  SERVICOS = SERVICOS.filter(s => !apagados.has(s.id));
  SELECIONADAS.clear();
  renderKpis();
  render();
  toast(`${qtdServicos(apagados.size)} ${apagados.size === 1 ? 'excluído' : 'excluídos'}.`);
}

/* ---------------------------------------------------------- Drawer serviço */

function opcoesDeCategoria(atual) {
  const lista = atual && !CATEGORIAS_SERVICO.includes(atual) ? [atual, ...CATEGORIAS_SERVICO] : CATEGORIAS_SERVICO;
  return `<option value="">Escolha a categoria</option>` +
    lista.map(c => `<option value="${escapeHtml(c)}" ${c === atual ? 'selected' : ''}>${escapeHtml(c)}</option>`).join('');
}

function campoParceiro(atualId) {
  const ativos = PARCEIROS;
  return `
    <div class="field">
      <span class="field-label">Parceiro</span>
      <div class="parceiro-campo">
        <select class="field-select" name="parceiro_id" id="campo-parceiro">
          <option value="">${ativos.length ? 'Escolha o parceiro' : 'Nenhum parceiro cadastrado'}</option>
          ${ativos.map(p => `<option value="${p.id}" ${p.id === atualId ? 'selected' : ''}>${escapeHtml(p.nome)}${p.status === 'suspenso' ? ' (suspenso)' : ''}</option>`).join('')}
        </select>
        <button type="button" class="btn btn-ghost btn-sm" id="btn-adicionar-parceiro">${ICONE_MAIS}<span>Adicionar parceiro</span></button>
      </div>
      ${PARCEIROS_OK ? '' : '<span class="cell-muted" style="font-size:.75rem;display:block;margin-top:.25rem">Rode supabase/migrations/061_parceiros.sql no Supabase para cadastrar parceiros.</span>'}
    </div>`;
}

function abrirFormulario(item) {
  const campo = (name, label, valor, tipo = 'text', extra = '') => `
    <label class="field">
      <span class="field-label">${label}</span>
      <input class="field-input" name="${name}" type="${tipo}" ${extra} value="${escapeHtml(valor ?? '')}">
    </label>`;

  Drawer.open({
    title: item ? (item.titulo || item.nome) : 'Novo serviço',
    subtitle: 'Página de benefícios da plataforma dos anfitriões',
    body: `
      <form id="form-servico">
        <p class="drawer-section-title">O serviço</p>
        ${campo('nome', 'Nome', item?.nome)}
        <div class="field-row">
          <label class="field">
            <span class="field-label">Categoria</span>
            <select class="field-select" name="categoria">${opcoesDeCategoria(item?.categoria)}</select>
          </label>
        </div>
        ${campoParceiro(item?.parceiro_id)}
        <label class="field">
          <span class="field-label">Descrição</span>
          <textarea class="field-textarea" name="descricao">${escapeHtml(item?.descricao || '')}</textarea>
        </label>
        ${campo('imagem_url', 'URL da imagem', item?.imagem_url)}
        ${campo('link_url', 'Link de contratação', item?.link_url)}

        <p class="drawer-section-title">Cupom e preço</p>
        <div class="field-row">
          ${campo('cupom', 'Cupom', item?.cupom, 'text', 'placeholder="ex.: LOVE25"')}
          ${campo('desconto_texto', 'Desconto', item?.desconto_texto, 'text', 'placeholder="ex.: Até 25% OFF"')}
        </div>
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
      </form>`,
    footer: `
      ${item ? `<button type="button" class="btn-icone-linha btn-lixeira" id="btn-excluir" title="Excluir serviço" aria-label="Excluir serviço">${ICONE_LIXEIRA}</button>` : ''}
      <button type="button" class="btn btn-ghost" id="btn-cancelar">Cancelar</button>
      <button type="button" class="btn btn-primary" id="btn-salvar">${item ? 'Salvar' : 'Publicar'}</button>`
  });

  document.getElementById('btn-cancelar').addEventListener('click', () => Drawer.close());
  document.getElementById('btn-salvar').addEventListener('click', () => salvar(item?.id));
  document.getElementById('btn-excluir')?.addEventListener('click', () => excluir(item));
  document.getElementById('btn-adicionar-parceiro').addEventListener('click', () => {
    // Guarda o que já foi preenchido para voltar ao serviço depois do parceiro.
    const rascunho = Object.fromEntries(new FormData(document.getElementById('form-servico')).entries());
    abrirParceiro(null, novo => abrirFormulario({ ...(item || {}), ...rascunho, id: item?.id, parceiro_id: novo.id,
      preco: rascunho.preco, ativo: rascunho.ativo === 'true', destaque: rascunho.destaque === 'true' }));
  });
}

function proximaPosicao() {
  return SERVICOS.reduce((max, s) => Math.max(max, s.posicao), 0) + 1;
}

async function salvar(id) {
  const form = document.getElementById('form-servico');
  const d = Object.fromEntries(new FormData(form).entries());
  const parceiro = PARCEIROS.find(p => p.id === d.parceiro_id);

  const payload = {
    nome: d.nome.trim(),
    categoria: d.categoria || null,
    parceiro_id: parceiro ? parceiro.id : null,
    parceiro: parceiro ? parceiro.nome : null,
    descricao: d.descricao.trim() || null,
    imagem_url: d.imagem_url.trim() || null,
    link_url: d.link_url.trim() || null,
    cupom: d.cupom.trim().toUpperCase() || null,
    desconto_texto: d.desconto_texto.trim() || null,
    preco: Number(d.preco) || 0,
    preco_de: d.preco_de === '' ? null : Number(d.preco_de),
    periodicidade: d.periodicidade,
    destaque: d.destaque === 'true',
    posicao: Number(d.posicao) || 0,
    ativo: d.ativo === 'true'
  };

  if (!payload.nome) return toast('O nome do serviço é obrigatório.');
  if (!payload.categoria) return toast('Escolha a categoria.');

  Drawer.setFooterBusy(true);
  const { error } = id
    ? await supabaseClient.from('servicos_beneficios').update(payload).eq('id', id)
    : await supabaseClient.from('servicos_beneficios').insert(payload);
  Drawer.setFooterBusy(false);

  if (error) {
    return toast(/parceiro_id|schema cache/i.test(error.message || '')
      ? 'Rode supabase/migrations/061_parceiros.sql no Supabase.'
      : `Não foi possível salvar: ${error.message}`);
  }

  Drawer.close();
  toast(id ? 'Serviço atualizado.' : 'Serviço publicado.');
  window.location.reload();
}

async function excluir(item) {
  if (!(await confirmar(`Excluir "${item.titulo || item.nome}"? Ele deixa de aparecer na plataforma.`, { titulo: 'Excluir', rotulo: 'Excluir', perigo: true }))) return;

  const { error } = await supabaseClient.from('servicos_beneficios').delete().eq('id', item.id);
  if (error) return toast(`Não foi possível excluir: ${error.message}`);

  Drawer.close();
  toast('Serviço excluído.');
  window.location.reload();
}

/* ---------------------------------------------------------- Drawer parceiro */

/**
 * Cadastro e edição do parceiro. `aoCriar` (opcional) recebe o parceiro novo
 * — é como o drawer do serviço volta já com ele escolhido.
 */
function abrirParceiro(parceiro, aoCriar) {
  const editando = Boolean(parceiro && parceiro.id);
  const servicos = editando ? SERVICOS.filter(s => s.parceiro_id === parceiro.id) : [];
  const suspenso = editando && parceiro.status === 'suspenso';

  const campo = (name, label, valor, tipo = 'text', extra = '') => `
    <label class="field">
      <span class="field-label">${label}</span>
      <input class="field-input" name="${name}" type="${tipo}" ${extra} value="${escapeHtml(valor ?? '')}">
    </label>`;

  Drawer.open({
    title: editando ? parceiro.nome : 'Novo parceiro',
    subtitle: editando ? (suspenso ? 'Parceria suspensa' : 'Parceria ativa') : 'Empresa parceira dos serviços e benefícios',
    body: `
      <form id="form-parceiro">
        <p class="drawer-section-title">Empresa</p>
        ${campo('nome', 'Nome da empresa <span class="campo-obrigatorio">*</span>', parceiro?.nome)}
        ${campo('cnpj', 'CNPJ', parceiro?.cnpj, 'text', 'placeholder="00.000.000/0000-00"')}
        ${campo('responsavel_legal', 'Responsável legal', parceiro?.responsavel_legal)}
        <div class="field-row">
          ${campo('contato', 'Contato (telefone)', parceiro?.contato, 'tel', 'placeholder="(00) 00000-0000"')}
          ${campo('email', 'E-mail', parceiro?.email, 'email')}
        </div>
        <label class="field">
          <span class="field-label">Produtos que oferece</span>
          <textarea class="field-textarea" name="produtos_oferecidos" placeholder="Ex.: seguro residência, seguro viagem…">${escapeHtml(parceiro?.produtos_oferecidos || '')}</textarea>
        </label>
      </form>

      ${editando ? `
        <p class="drawer-section-title">Serviços vinculados</p>
        ${servicos.length ? servicos.map(s => `
          <div class="pergunta-item">
            <div style="flex:1;min-width:0">
              <p class="pergunta">${escapeHtml(s.titulo || s.nome)}</p>
              <p class="resposta">${escapeHtml([s.categoria, s.cupom ? `cupom ${s.cupom}` : null, s.ativo ? 'publicado' : 'rascunho'].filter(Boolean).join(' · '))}</p>
            </div>
            <button type="button" class="btn-icone-linha" data-abrir-servico="${s.id}" title="Abrir serviço" aria-label="Abrir serviço">${ICONE_VER_MAIS}</button>
          </div>`).join('')
        : '<p class="cell-muted" style="font-size:.8125rem;margin:0">Nenhum serviço vinculado ainda. Vincule ao cadastrar um serviço.</p>'}` : ''}`,
    footer: editando ? `
      <button type="button" class="btn ${suspenso ? 'btn-ghost' : 'btn-neutro'}" id="btn-suspender-parceiro">${suspenso ? 'Reativar' : 'Suspender'}</button>
      <button type="button" class="btn btn-ghost" id="btn-cancelar-parceiro">Cancelar</button>
      <button type="button" class="btn btn-primary" id="btn-salvar-parceiro">Salvar</button>` : `
      <button type="button" class="btn btn-ghost" id="btn-cancelar-parceiro">Cancelar</button>
      <button type="button" class="btn btn-primary" id="btn-salvar-parceiro">Cadastrar parceiro</button>`
  });

  document.getElementById('btn-cancelar-parceiro').addEventListener('click', () => Drawer.close());
  document.getElementById('btn-salvar-parceiro').addEventListener('click', () => salvarParceiro(parceiro, aoCriar));
  document.getElementById('btn-suspender-parceiro')?.addEventListener('click', () =>
    suspenso ? reativarParceiro(parceiro) : perguntarSuspensao(parceiro));
  document.querySelectorAll('[data-abrir-servico]').forEach(btn =>
    btn.addEventListener('click', () => abrirFormulario(SERVICOS.find(s => s.id === btn.dataset.abrirServico))));
}

async function salvarParceiro(parceiro, aoCriar) {
  const d = Object.fromEntries(new FormData(document.getElementById('form-parceiro')).entries());
  const payload = {
    nome: d.nome.trim(),
    cnpj: d.cnpj.trim() || null,
    responsavel_legal: d.responsavel_legal.trim() || null,
    contato: d.contato.trim() || null,
    email: d.email.trim().toLowerCase() || null,
    produtos_oferecidos: d.produtos_oferecidos.trim() || null
  };
  if (!payload.nome) return toast('Informe o nome da empresa.');

  Drawer.setFooterBusy(true);
  const consulta = parceiro && parceiro.id
    ? supabaseClient.from('parceiros').update(payload).eq('id', parceiro.id).select().single()
    : supabaseClient.from('parceiros').insert(payload).select().single();
  const { data, error } = await consulta;
  Drawer.setFooterBusy(false);

  if (error) {
    return toast(/parceiros|does not exist|schema cache/i.test(error.message || '')
      ? 'Rode supabase/migrations/061_parceiros.sql no Supabase.'
      : `Não foi possível salvar: ${error.message}`);
  }

  if (parceiro && parceiro.id) {
    PARCEIROS = PARCEIROS.map(p => (p.id === data.id ? data : p));
    // O nome do parceiro também fica gravado no serviço (texto exibido na plataforma).
    await supabaseClient.from('servicos_beneficios').update({ parceiro: data.nome }).eq('parceiro_id', data.id);
    SERVICOS.forEach(s => { if (s.parceiro_id === data.id) s.parceiro = data.nome; });
  } else {
    PARCEIROS = [...PARCEIROS, data].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
  }

  toast(parceiro && parceiro.id ? 'Parceiro atualizado.' : 'Parceiro cadastrado.');
  renderKpis();
  render();
  if (aoCriar && !(parceiro && parceiro.id)) aoCriar(data);
  else Drawer.close();
}

function perguntarSuspensao(parceiro) {
  const n = SERVICOS.filter(s => s.parceiro_id === parceiro.id && s.ativo).length;
  Modal.abrir({
    titulo: 'Deseja suspender a parceria?',
    texto: n
      ? `${qtdServicos(n)} de ${parceiro.nome} ${n === 1 ? 'sai' : 'saem'} do ar (viram rascunho). Dá para reativar a parceria depois.`
      : `A parceria com ${parceiro.nome} fica suspensa. Dá para reativar depois.`,
    acoes: [
      { rotulo: 'Excluir parceria', icone: ICONE_LIXEIRA, classe: 'btn-ghost btn-lixeira-modal', aoClicar: () => confirmarExclusaoParceiro(parceiro) },
      { rotulo: 'Voltar', classe: 'btn-ghost', aoClicar: () => Modal.fechar() },
      { rotulo: 'Suspender', classe: 'btn-neutro', aoClicar: () => suspenderParceiro(parceiro) }
    ]
  });
}

async function suspenderParceiro(parceiro) {
  Modal.ocupado(true);
  const { error } = await supabaseClient.from('parceiros')
    .update({ status: 'suspenso', suspenso_em: new Date().toISOString() }).eq('id', parceiro.id);
  if (!error) await supabaseClient.from('servicos_beneficios').update({ ativo: false }).eq('parceiro_id', parceiro.id);
  Modal.ocupado(false);
  Modal.fechar();
  if (error) return toast(`Não foi possível suspender: ${error.message}`);

  parceiro.status = 'suspenso';
  SERVICOS.forEach(s => { if (s.parceiro_id === parceiro.id) s.ativo = false; });
  Drawer.close();
  renderKpis();
  render();
  toast('Parceria suspensa.');
}

async function reativarParceiro(parceiro) {
  const { error } = await supabaseClient.from('parceiros').update({ status: 'ativo', suspenso_em: null }).eq('id', parceiro.id);
  if (error) return toast(`Não foi possível reativar: ${error.message}`);
  parceiro.status = 'ativo';
  Drawer.close();
  renderKpis();
  render();
  toast('Parceria reativada. Publique os serviços dela de novo quando quiser.');
}

function confirmarExclusaoParceiro(parceiro) {
  Modal.abrir({
    titulo: 'Excluir a parceria?',
    texto: `${parceiro.nome} sai do cadastro. Os serviços dela continuam, sem parceiro vinculado. Esta ação não pode ser desfeita.`,
    acoes: [
      { rotulo: 'Excluir', classe: 'btn-danger', aoClicar: () => excluirParceiro(parceiro) },
      { rotulo: 'Voltar', classe: 'btn-ghost', aoClicar: () => Modal.fechar() }
    ]
  });
}

async function excluirParceiro(parceiro) {
  Modal.ocupado(true);
  const { error } = await supabaseClient.from('parceiros').delete().eq('id', parceiro.id);
  Modal.ocupado(false);
  Modal.fechar();
  if (error) return toast(`Não foi possível excluir: ${error.message}`);

  PARCEIROS = PARCEIROS.filter(p => p.id !== parceiro.id);
  SERVICOS.forEach(s => { if (s.parceiro_id === parceiro.id) s.parceiro_id = null; });
  Drawer.close();
  renderKpis();
  render();
  toast('Parceria excluída.');
}
