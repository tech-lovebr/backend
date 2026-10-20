/* ==========================================================================
   LOVE ADMIN — CMS: lista de artigos do blog

   Formato de caixa de entrada: abas por situação com contagem, seleção em
   massa e as três colunas que importam para achar um texto — título,
   categorias e data. O autor não é coluna: hoje é sempre a mesma pessoa, e
   uma coluna que nunca varia só rouba largura do título.
   ========================================================================== */

let ARTIGOS = [];
let CATEGORIAS = [];
let VINCULOS = [];
let SELECIONADOS = new Set();
let STATUS_ATUAL = '';

document.addEventListener('DOMContentLoaded', async () => {
  if (!(await window.adminReady)) return;

  const tbody = document.getElementById('tbody');
  renderLoading(tbody, 4);

  const [artigos, categorias, vinculos] = await Promise.all([
    safeSelect('artigos', '*'),
    safeSelect('artigo_categorias', '*'),
    safeSelect('artigo_categoria', '*')
  ]);

  if (artigos.error) return renderError(tbody, 4, artigos.error);

  ARTIGOS = artigos.data;
  CATEGORIAS = categorias.data;
  VINCULOS = vinculos.data;

  montarOpcoesDeCategoria();
  ligarAbas();
  ligarSelecao();
  render();

  document.getElementById('busca').addEventListener('input', render);
  document.getElementById('filtro-categoria').addEventListener('change', render);

  addHeaderAction('Criar novo', () => { window.location.href = 'cms-artigo.html'; }, {
    principal: true,
    icone: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14" /><path d="M5 12h14" /></svg>'
  });
  moverControlesParaHeader();
});

/* ------------------------------------------------------------- Categorias */

function categoriasDoArtigo(id) {
  const ids = VINCULOS.filter(v => v.artigo_id === id).map(v => v.categoria_id);
  return CATEGORIAS.filter(c => ids.includes(c.id));
}

function montarOpcoesDeCategoria() {
  const select = document.getElementById('filtro-categoria');
  CATEGORIAS
    .slice()
    .sort((a, b) => a.nome.localeCompare(b.nome))
    .forEach(c => {
      const opcao = document.createElement('option');
      opcao.value = c.id;
      opcao.textContent = c.nome;
      select.appendChild(opcao);
    });
}

/* ------------------------------------------------------------------ Abas */

function ligarAbas() {
  document.querySelectorAll('#abas-status [data-status]').forEach(btn => {
    btn.addEventListener('click', () => {
      STATUS_ATUAL = btn.dataset.status;
      document.querySelectorAll('#abas-status [data-status]')
        .forEach(b => b.classList.toggle('is-active', b === btn));
      SELECIONADOS.clear();
      render();
    });
  });
}

/* O lixo fica fora da contagem de "Tudo": é o que o WordPress faz, e some
   da conta o que a pessoa já decidiu descartar. */
function renderContagemAbas() {
  const conta = status => status
    ? ARTIGOS.filter(a => a.status === status).length
    : ARTIGOS.filter(a => a.status !== 'lixo').length;

  document.querySelectorAll('#abas-status [data-contagem]').forEach(span => {
    const chave = span.dataset.contagem;
    const total = conta(chave === 'todos' ? '' : chave);
    span.textContent = total ? ` (${formatNumber(total)})` : '';
  });
}

/* ----------------------------------------------------------------- Lista */

function filtrar() {
  const termo = document.getElementById('busca').value.trim().toLowerCase();
  const categoria = document.getElementById('filtro-categoria').value;

  return ARTIGOS.filter(a => {
    if (STATUS_ATUAL ? a.status !== STATUS_ATUAL : a.status === 'lixo') return false;
    if (categoria && !VINCULOS.some(v => v.artigo_id === a.id && v.categoria_id === categoria)) return false;
    if (!termo) return true;
    return String(a.titulo || '').toLowerCase().includes(termo);
  });
}

function render() {
  renderContagemAbas();

  const tbody = document.getElementById('tbody');
  const lista = filtrar().sort((a, b) =>
    new Date(b.publicado_em || b.created_at || 0) - new Date(a.publicado_em || a.created_at || 0));

  renderContagem(lista.length);

  if (!lista.length) {
    renderBarraDeSelecao();
    renderEmpty(tbody, 4, 'Nenhum artigo encontrado',
      ARTIGOS.length
        ? 'Ajuste a busca, a categoria ou a aba acima.'
        : 'Clique em "Criar novo" no cabeçalho para escrever o primeiro.');
    return;
  }

  tbody.innerHTML = lista.map(a => {
    const marcado = SELECIONADOS.has(a.id);
    const cats = categoriasDoArtigo(a.id);
    const quando = a.publicado_em || a.created_at;

    return `
      <tr data-id="${a.id}" class="${marcado ? 'is-selecionada' : ''}">
        <td class="col-selecao">
          <input type="checkbox" data-selecionar="${a.id}" ${marcado ? 'checked' : ''}
                 aria-label="Selecionar ${escapeHtml(a.titulo || '')}">
        </td>
        <td>
          <span class="cell-strong">${dash(a.titulo)}</span>
          ${a.status !== 'publicado'
            ? `<span class="artigo-situacao">— ${escapeHtml(SITUACAO[a.status] || a.status)}</span>`
            : ''}
        </td>
        <td class="cell-muted">${cats.length
          ? cats.map(c => escapeHtml(c.nome)).join(', ')
          : '—'}</td>
        <td class="cell-muted">
          ${escapeHtml(formatDate(quando))}<br>
          <span class="artigo-situacao">${escapeHtml(SITUACAO[a.status] || a.status)}</span>
        </td>
      </tr>`;
  }).join('');

  tbody.querySelectorAll('[data-selecionar]').forEach(caixa => {
    caixa.addEventListener('click', e => e.stopPropagation());
    caixa.addEventListener('change', () => {
      if (caixa.checked) SELECIONADOS.add(caixa.dataset.selecionar);
      else SELECIONADOS.delete(caixa.dataset.selecionar);
      caixa.closest('tr').classList.toggle('is-selecionada', caixa.checked);
      renderBarraDeSelecao();
    });
  });

  tbody.querySelectorAll('tr[data-id]').forEach(tr => {
    tr.addEventListener('click', () => {
      window.location.href = `cms-artigo.html?id=${encodeURIComponent(tr.dataset.id)}`;
    });
  });

  renderBarraDeSelecao();
}

const SITUACAO = { rascunho: 'Rascunho', publicado: 'Publicado', lixo: 'Na lixeira' };

function renderContagem(total) {
  document.getElementById('contagem-artigos').textContent =
    `${formatNumber(total)} ${total === 1 ? 'artigo' : 'artigos'}`;
}

/* -------------------------------------------------------- Ações em massa */

function ligarSelecao() {
  document.getElementById('selecionar-todos').addEventListener('change', (e) => {
    const visiveis = filtrar().map(a => a.id);
    if (e.target.checked) visiveis.forEach(id => SELECIONADOS.add(id));
    else visiveis.forEach(id => SELECIONADOS.delete(id));
    render();
  });

  document.getElementById('btn-limpar-selecao').addEventListener('click', () => {
    SELECIONADOS.clear();
    render();
  });

  document.getElementById('btn-acao-massa').addEventListener('click', perguntarAcaoEmMassa);
}

function renderBarraDeSelecao() {
  const barra = document.getElementById('barra-selecao');
  const total = SELECIONADOS.size;

  barra.hidden = total === 0;
  document.getElementById('selecao-contagem').textContent =
    `${formatNumber(total)} ${total === 1 ? 'artigo selecionado' : 'artigos selecionados'}`;

  const visiveis = filtrar().map(a => a.id);
  const todos = document.getElementById('selecionar-todos');
  todos.checked = visiveis.length > 0 && visiveis.every(id => SELECIONADOS.has(id));
  todos.indeterminate = !todos.checked && visiveis.some(id => SELECIONADOS.has(id));
}

/* Na lixeira as saídas são outras: restaurar ou apagar de vez. Oferecer
   "mover para a lixeira" para quem já está lá seria sem sentido. */
function perguntarAcaoEmMassa() {
  const ids = [...SELECIONADOS];
  const quantos = `${formatNumber(ids.length)} ${ids.length === 1 ? 'artigo' : 'artigos'}`;
  const naLixeira = STATUS_ATUAL === 'lixo';

  Modal.abrir({
    titulo: `O que fazer com ${quantos}?`,
    texto: naLixeira
      ? 'Restaurar devolve os artigos como rascunho. Excluir apaga de vez, sem desfazer.'
      : 'Publicar coloca no ar. Mover para a lixeira tira do ar sem apagar — dá para restaurar depois.',
    acoes: naLixeira
      ? [
          { rotulo: 'Excluir', classe: 'btn-danger', aoClicar: () => confirmarExclusao(ids) },
          { rotulo: 'Restaurar', classe: 'btn-neutro', aoClicar: () => aplicarStatus(ids, 'rascunho') },
          { rotulo: 'Cancelar', classe: 'btn-ghost', aoClicar: () => Modal.fechar() }
        ]
      : [
          { rotulo: 'Lixeira', classe: 'btn-neutro', aoClicar: () => aplicarStatus(ids, 'lixo') },
          { rotulo: 'Publicar', classe: 'btn-primary', aoClicar: () => aplicarStatus(ids, 'publicado') },
          { rotulo: 'Cancelar', classe: 'btn-ghost', aoClicar: () => Modal.fechar() }
        ]
  });
}

function confirmarExclusao(ids) {
  const quantos = `${formatNumber(ids.length)} ${ids.length === 1 ? 'artigo' : 'artigos'}`;

  Modal.abrir({
    titulo: 'Tem certeza?',
    texto: `${quantos} ${ids.length === 1 ? 'será apagado' : 'serão apagados'} de vez. Esta ação não pode ser desfeita.`,
    acoes: [
      { rotulo: 'Sim', classe: 'btn-danger', aoClicar: () => excluirDeVez(ids) },
      { rotulo: 'Não', classe: 'btn-ghost', aoClicar: () => Modal.fechar() }
    ]
  });
}

async function aplicarStatus(ids, status) {
  Modal.ocupado(true);

  const campos = { status };
  // Publicar grava a data só na primeira vez: republicar não deve reescrever
  // a data original do artigo.
  if (status === 'publicado') campos.publicado_em = new Date().toISOString();

  const alvos = status === 'publicado'
    ? ids.filter(id => !ARTIGOS.find(a => a.id === id)?.publicado_em)
    : [];

  const { error } = await supabaseClient.from('artigos').update({ status }).in('id', ids);

  if (!error && alvos.length) {
    await supabaseClient.from('artigos')
      .update({ publicado_em: campos.publicado_em })
      .in('id', alvos);
  }

  Modal.ocupado(false);
  Modal.fechar();

  if (error) return toast(`Não foi possível atualizar: ${error.message}`);

  toast(status === 'lixo' ? 'Movidos para a lixeira.'
      : status === 'publicado' ? 'Publicados.' : 'Restaurados.');
  window.location.reload();
}

async function excluirDeVez(ids) {
  Modal.ocupado(true);
  const { error } = await supabaseClient.from('artigos').delete().in('id', ids);
  Modal.ocupado(false);
  Modal.fechar();

  if (error) return toast(`Não foi possível excluir: ${error.message}`);

  toast('Artigos excluídos.');
  window.location.reload();
}
