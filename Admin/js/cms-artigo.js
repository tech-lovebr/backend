/* ==========================================================================
   LOVE ADMIN — CMS: escrever e editar um artigo

   O corpo usa o EditorRico (js/editor-rico.js), o mesmo dos documentos
   legais.
   ========================================================================== */

const PARAMS = new URLSearchParams(window.location.search);
const ARTIGO_ID = PARAMS.get('id');

// Título do cabeçalho: "Novo artigo" ao criar, "Editar artigo" ao abrir um existente.
if (ARTIGO_ID) document.body.dataset.title = 'Editar artigo';

let ARTIGO = null;
let CATEGORIAS = [];
let SELECIONADAS = new Set();
let CAPA_URL = null;
let EDITOR = null;
/** @type {string[]} */
let KEYWORDS = [];

const ICONE_LIXEIRA_ARTIGO = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7l16 0" /><path d="M10 11l0 6" /><path d="M14 11l0 6" /><path d="M5 7l1 12a2 2 0 0 0 2 2h8a2 2 0 0 0 2 -2l1 -12" /><path d="M9 7v-3a1 1 0 0 1 1 -1h4a1 1 0 0 1 1 1v3" /></svg>';

document.addEventListener('DOMContentLoaded', async () => {
  if (!(await window.adminReady)) return;

  const [categorias, artigo, vinculos] = await Promise.all([
    safeSelect('artigo_categorias', '*'),
    ARTIGO_ID ? safeSelect('artigos', '*', q => q.eq('id', ARTIGO_ID)) : { data: [] },
    ARTIGO_ID ? safeSelect('artigo_categoria', '*', q => q.eq('artigo_id', ARTIGO_ID)) : { data: [] }
  ]);

  CATEGORIAS = categorias.data || [];
  ARTIGO = (artigo.data || [])[0] || null;
  SELECIONADAS = new Set((vinculos.data || []).map(v => v.categoria_id));

  if (ARTIGO_ID && !ARTIGO) {
    toast('Artigo não encontrado.');
    window.location.href = 'cms.html';
    return;
  }

  ligarEditor();
  preencher();
  renderCategorias();
  renderKeywords();
  ligarCapa();
  ligarAcoes();

  // Voltar é o ícone ao lado do título (data-voltar no HTML). No lugar do
  // antigo botão Voltar ficam as ações do artigo.
  if (ARTIGO && ARTIGO.status !== 'lixo') {
    addHeaderAction('Mover para a lixeira', moverParaLixeira, { icone: ICONE_LIXEIRA_ARTIGO })
      .classList.add('btn-so-icone', 'btn-lixeira-artigo');
  }
  addHeaderAction('Salvar', () => salvar('rascunho'), { icone: null }).id = 'btn-rascunho';
  addHeaderAction(ARTIGO?.status === 'publicado' ? 'Atualizar' : 'Publicar', () => salvar('publicado'), { icone: null, principal: true }).id = 'btn-publicar';
});

/* --------------------------------------------------------- Preenchimento */

function preencher() {
  if (!ARTIGO) return;

  document.getElementById('artigo-titulo').value = ARTIGO.titulo || '';

  CAPA_URL = ARTIGO.imagem_destaque_url || null;
  renderCapa();

  KEYWORDS = Array.isArray(ARTIGO.palavras_chave) ? ARTIGO.palavras_chave.filter(Boolean) : [];
}

/* ------------------------------------------------------------ Keywords */

function renderKeywords() {
  const host = document.getElementById('keywords');
  host.innerHTML = KEYWORDS.map((k, i) => `
    <span class="keyword">${escapeHtml(k)}<button type="button" data-tirar-keyword="${i}" aria-label="Remover ${escapeHtml(k)}">×</button></span>`).join('');
  host.querySelectorAll('[data-tirar-keyword]').forEach(b => b.addEventListener('click', () => {
    KEYWORDS.splice(Number(/** @type {HTMLElement} */ (b).dataset.tirarKeyword), 1);
    renderKeywords();
  }));
}

/** @param {string} texto */
function adicionarKeywords(texto) {
  texto.split(',').map(k => k.trim()).filter(Boolean).forEach(k => {
    if (!KEYWORDS.some(x => x.toLowerCase() === k.toLowerCase())) KEYWORDS.push(k.slice(0, 60));
  });
  renderKeywords();
}

/* -------------------------------------------------------------- Editor */

function ligarEditor() {
  EDITOR = EditorRico.montar(document.getElementById('editor-host'), {
    placeholder: 'Escreva o artigo aqui.',
    tabela: false,
    imagem: true
  });
  EDITOR.definir(ARTIGO?.conteudo || '');
}

/* --------------------------------------------------------------- Capa */

function renderCapa() {
  const previa = document.getElementById('capa-previa');
  previa.innerHTML = CAPA_URL
    ? `<img src="${escapeHtml(CAPA_URL)}" alt="">`
    : '<span>Nenhuma imagem</span>';
  document.getElementById('btn-remover-capa').hidden = !CAPA_URL;
}

function ligarCapa() {
  const arquivo = document.getElementById('capa-arquivo');

  document.getElementById('btn-capa').addEventListener('click', () => arquivo.click());

  document.getElementById('btn-remover-capa').addEventListener('click', () => {
    CAPA_URL = null;
    renderCapa();
  });

  arquivo.addEventListener('change', async () => {
    const file = arquivo.files[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast('A imagem precisa ter até 5 MB.');
      arquivo.value = '';
      return;
    }

    const botao = document.getElementById('btn-capa');
    botao.disabled = true;
    botao.textContent = 'Enviando...';

    // Nome com timestamp: subir duas capas com o mesmo nome de arquivo não
    // pode fazer uma sobrescrever a outra.
    const extensao = (file.name.split('.').pop() || 'jpg').toLowerCase();
    const caminho = `capas/${Date.now()}-${Math.round(performance.now())}.${extensao}`;

    const { error } = await supabaseClient.storage.from('blog').upload(caminho, file, {
      cacheControl: '31536000',
      contentType: file.type || 'image/jpeg'
    });

    botao.disabled = false;
    botao.textContent = 'Escolher imagem';
    arquivo.value = '';

    if (error) {
      const faltaBucket = /bucket|not found/i.test(error.message || '');
      toast(faltaBucket
        ? 'Rode supabase/migrations/027_cms_blog.sql no Supabase.'
        : `Não foi possível enviar: ${error.message}`);
      return;
    }

    CAPA_URL = supabaseClient.storage.from('blog').getPublicUrl(caminho).data.publicUrl;
    renderCapa();
  });
}

/* ---------------------------------------------------------- Categorias */

function renderCategorias() {
  document.getElementById('categorias-lista').innerHTML = CATEGORIAS
    .slice()
    .sort((a, b) => a.nome.localeCompare(b.nome))
    .map(c => `
      <label class="categoria-item">
        <input type="checkbox" value="${c.id}" ${SELECIONADAS.has(c.id) ? 'checked' : ''}>
        <span>${escapeHtml(c.nome)}</span>
      </label>`).join('');

  document.querySelectorAll('#categorias-lista input').forEach(caixa => {
    caixa.addEventListener('change', () => {
      if (caixa.checked) SELECIONADAS.add(caixa.value);
      else SELECIONADAS.delete(caixa.value);
    });
  });
}

function ligarAcoes() {
  document.getElementById('btn-categoria').addEventListener('click', criarCategoria);

  const campo = /** @type {HTMLInputElement} */ (document.getElementById('keyword-nova'));
  campo.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter' && e.key !== ',') return;
    e.preventDefault();
    adicionarKeywords(campo.value);
    campo.value = '';
  });
  campo.addEventListener('blur', () => { if (campo.value.trim()) { adicionarKeywords(campo.value); campo.value = ''; } });
}

async function moverParaLixeira() {
  const ok = await confirmar('O artigo sai do blog e vai para a lixeira.', { titulo: 'Mover para a lixeira', rotulo: 'Mover', perigo: true });
  if (ok) salvar('lixo');
}

/** Resumo da listagem do blog: o começo do texto, já que o campo saiu da tela. */
function resumoDoTexto() {
  const texto = EDITOR.texto().replace(/\s+/g, ' ').trim();
  if (texto.length <= 200) return texto || null;
  return texto.slice(0, 200).replace(/\s+\S*$/, '') + '…';
}

async function criarCategoria() {
  const campo = document.getElementById('categoria-nome');
  const nome = campo.value.trim();
  if (!nome) return;

  const slug = gerarSlug(nome);
  const { data, error } = await supabaseClient
    .from('artigo_categorias')
    .insert({ nome, slug })
    .select()
    .single();

  if (error) {
    toast(/duplicate|unique/i.test(error.message) ? 'Essa categoria já existe.' : error.message);
    return;
  }

  CATEGORIAS.push(data);
  SELECIONADAS.add(data.id);
  campo.value = '';
  renderCategorias();
}

/** Slug a partir do título: acentos fora, espaços viram hífen. */
function gerarSlug(texto) {
  return String(texto || '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

/* --------------------------------------------------------------- Salvar */

async function salvar(status) {
  const titulo = document.getElementById('artigo-titulo').value.trim();

  if (!titulo) {
    toast('O artigo precisa de um título.');
    document.getElementById('artigo-titulo').focus();
    return;
  }

  const botoes = document.querySelectorAll('#header-actions .btn');
  botoes.forEach(b => { b.disabled = true; });

  const linha = {
    titulo,
    conteudo: EDITOR.html(),
    resumo: resumoDoTexto(),
    palavras_chave: KEYWORDS,
    imagem_destaque_url: CAPA_URL,
    status
  };

  // O slug nasce do título e não muda depois: o endereço do artigo já pode
  // ter sido compartilhado quando alguém resolver reescrever o título.
  if (!ARTIGO) {
    linha.slug = `${gerarSlug(titulo)}-${Date.now().toString(36)}`;
    linha.autor_id = window.adminUser.id;
    linha.autor_nome = window.adminUser.name || 'Equipe Love';
  }

  // A data de publicação é gravada uma vez só: atualizar um artigo no ar
  // não deve mudar a data que o leitor vê.
  if (status === 'publicado' && !ARTIGO?.publicado_em) {
    linha.publicado_em = new Date().toISOString();
  }

  const gravar = (dados) => ARTIGO
    ? supabaseClient.from('artigos').update(dados).eq('id', ARTIGO.id).select().single()
    : supabaseClient.from('artigos').insert(dados).select().single();

  let resposta = await gravar(linha);

  // Sem a coluna de keywords (migration 076 ainda não rodada): salva o resto.
  if (resposta.error && /palavras_chave/i.test(resposta.error.message || '')) {
    delete linha.palavras_chave;
    resposta = await gravar(linha);
    if (!resposta.error && KEYWORDS.length) toast('Keywords não salvas: rode a migration 076 no Supabase.');
  }

  if (resposta.error) {
    botoes.forEach(b => { b.disabled = false; });
    const faltaTabela = /artigos|does not exist|schema cache/i.test(resposta.error.message || '');
    toast(faltaTabela
      ? 'Rode supabase/migrations/027_cms_blog.sql no Supabase.'
      : `Não foi possível salvar: ${resposta.error.message}`);
    return;
  }

  const salvo = resposta.data;
  await sincronizarCategorias(salvo.id);

  toast(status === 'publicado' ? 'Artigo publicado.'
      : status === 'lixo' ? 'Movido para a lixeira.' : 'Rascunho salvo.');

  if (status === 'lixo') {
    window.location.href = 'cms.html';
    return;
  }

  // Recarrega pela URL do artigo para o próximo salvar virar atualização.
  window.location.href = `cms-artigo.html?id=${encodeURIComponent(salvo.id)}`;
}

/** Apaga e regrava os vínculos: a lista é pequena e o diff não compensa. */
async function sincronizarCategorias(artigoId) {
  await supabaseClient.from('artigo_categoria').delete().eq('artigo_id', artigoId);

  if (!SELECIONADAS.size) return;

  await supabaseClient.from('artigo_categoria').insert(
    [...SELECIONADAS].map(categoria_id => ({ artigo_id: artigoId, categoria_id }))
  );
}
