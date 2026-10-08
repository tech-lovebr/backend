/* ==========================================================================
   LOVE ADMIN — CMS: termos de uso e política de privacidade

   Dois documentos fixos, não uma lista: não se cria nem se apaga termo de
   uso, só se reescreve. Por isso abas em vez de tabela, e nenhuma ação de
   excluir.
   ========================================================================== */

let DOCUMENTOS = new Map();
let ATUAL = 'termos';
let EDITOR = null;
let VERSOES = [];
let BOTAO_SALVAR = null;

document.addEventListener('DOMContentLoaded', async () => {
  if (!(await window.adminReady)) return;

  const [documentos, versoes] = await Promise.all([
    safeSelect('documentos_legais', '*'),
    safeSelect('documento_legal_versoes', 'slug, autor_nome, created_at')
  ]);

  const { data, error } = documentos;
  VERSOES = versoes.data || [];

  if (error) {
    toast(/documentos_legais|does not exist|schema cache/i.test(error.message || '')
      ? 'Rode supabase/migrations/028_documentos_legais.sql no Supabase.'
      : `Não foi possível carregar: ${error.message}`);
    return;
  }

  DOCUMENTOS = new Map((data || []).map(d => [d.slug, d]));

  EDITOR = EditorRico.montar(document.getElementById('editor-host'), {
    placeholder: 'Escreva o documento aqui.'
  });

  ligarAbas();

  /* O cabeçalho da página mostra o nome do documento aberto, então é dele
     que o Salvar faz parte — e não da linha das abas, que é só o seletor. */
  BOTAO_SALVAR = addHeaderAction('Atualizar', salvar, { icone: null });
  BOTAO_SALVAR.className = 'btn btn-primary';

  mostrar('termos');
});

function ligarAbas() {
  document.querySelectorAll('#abas-documento [data-doc]').forEach(btn => {
    btn.addEventListener('click', () => {
      // Trocar de aba com texto não salvo perderia a edição em silêncio.
      if (sujo() && !window.confirm('Há alterações não salvas. Trocar de documento mesmo assim?')) return;

      document.querySelectorAll('#abas-documento [data-doc]')
        .forEach(b => b.classList.toggle('is-active', b === btn));
      mostrar(btn.dataset.doc);
    });
  });
}

function sujo() {
  const doc = DOCUMENTOS.get(ATUAL);
  return EDITOR.html() !== (doc?.conteudo || '');
}

function mostrar(slug) {
  ATUAL = slug;
  const doc = DOCUMENTOS.get(slug) || {};

  EDITOR.definir(doc.conteudo || '');
  document.getElementById('doc-atualizado').textContent =
    doc.updated_at ? formatDateTime(doc.updated_at) : '—';
  renderHistorico();

  // O cabeçalho acompanha a aba: "Legal" sozinho não diz qual documento
  // está aberto quando a página é compartilhada por captura de tela.
  const titulo = document.querySelector('.admin-header-bar .header-bar-titulo h1');
  if (titulo) titulo.textContent = doc.titulo || 'Legal';
}

/* Só datas e autoria: o que interessa aqui é quando mudou e por quem, não
   o diff. O texto de cada versão fica guardado no banco para quando for
   preciso provar o que valia numa data. */
function renderHistorico() {
  const host = document.getElementById('doc-historico');
  const lista = VERSOES
    .filter(v => v.slug === ATUAL)
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  if (!lista.length) {
    host.innerHTML = '<p class="cell-muted" style="font-size:.8125rem;margin:0">Nenhuma atualização ainda.</p>';
    return;
  }

  host.innerHTML = `
    <ol class="historico-legal">
      ${lista.map(v => `
        <li>
          <span class="historico-data">${escapeHtml(formatDateTime(v.created_at))}</span>
          <span class="historico-autor">${escapeHtml(v.autor_nome || 'Equipe Love')}</span>
        </li>`).join('')}
    </ol>`;
}

async function salvar() {
  const botao = BOTAO_SALVAR;
  botao.disabled = true;

  const linha = {
    conteudo: EDITOR.html(),
    atualizado_por: window.adminUser.id
  };

  const { data, error } = await supabaseClient
    .from('documentos_legais')
    .update(linha)
    .eq('slug', ATUAL)
    .select()
    .single();

  botao.disabled = false;

  if (error) {
    toast(`Não foi possível salvar: ${error.message}`);
    return;
  }

  DOCUMENTOS.set(ATUAL, data);
  document.getElementById('doc-atualizado').textContent = formatDateTime(data.updated_at);

  // O histórico é escrito por trigger no banco; relê para a lista já mostrar
  // a versão que acabou de nascer.
  const { data: versoes } = await safeSelect('documento_legal_versoes', 'slug, autor_nome, created_at');
  VERSOES = versoes || [];
  renderHistorico();

  toast('Documento salvo.');
}

/* Fechar a aba com texto não salvo é o mesmo risco de trocar de documento. */
window.addEventListener('beforeunload', (e) => {
  if (EDITOR && sujo()) { e.preventDefault(); e.returnValue = ''; }
});
