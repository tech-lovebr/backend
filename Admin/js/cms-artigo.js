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
  ligarCapa();
  ligarAcoes();

  addHeaderAction('Voltar', () => { window.location.href = 'cms.html'; }, {
    icone: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M15 6l-6 6l6 6" /></svg>'
  });
});

/* --------------------------------------------------------- Preenchimento */

function preencher() {
  if (!ARTIGO) return;

  document.getElementById('artigo-titulo').value = ARTIGO.titulo || '';
  document.getElementById('artigo-resumo').value = ARTIGO.resumo || '';

  CAPA_URL = ARTIGO.imagem_destaque_url || null;
  renderCapa();

  document.getElementById('artigo-situacao').textContent =
    { rascunho: 'Rascunho', publicado: 'Publicado', lixo: 'Na lixeira' }[ARTIGO.status] || ARTIGO.status;

  document.getElementById('artigo-publicado-em').textContent =
    ARTIGO.publicado_em ? formatDateTime(ARTIGO.publicado_em) : '—';

  if (ARTIGO.status === 'publicado') {
    document.getElementById('btn-publicar').textContent = 'Atualizar';
  }

  document.getElementById('btn-lixeira').hidden = ARTIGO.status === 'lixo';
}

/* -------------------------------------------------------------- Editor */

function ligarEditor() {
  EDITOR = EditorRico.montar(document.getElementById('editor-host'), {
    placeholder: 'Escreva o artigo aqui.'
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
  document.getElementById('btn-rascunho').addEventListener('click', () => salvar('rascunho'));
  document.getElementById('btn-publicar').addEventListener('click', () => salvar('publicado'));
  document.getElementById('btn-lixeira').addEventListener('click', () => salvar('lixo'));
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

  const botoes = document.querySelectorAll('.editor-acoes .btn, .editor-lixeira');
  botoes.forEach(b => { b.disabled = true; });

  const linha = {
    titulo,
    conteudo: EDITOR.html(),
    resumo: document.getElementById('artigo-resumo').value.trim() || null,
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

  const resposta = ARTIGO
    ? await supabaseClient.from('artigos').update(linha).eq('id', ARTIGO.id).select().single()
    : await supabaseClient.from('artigos').insert(linha).select().single();

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
