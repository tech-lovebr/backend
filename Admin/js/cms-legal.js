/* ==========================================================================
   LOVE ADMIN — CMS: termos de uso e política de privacidade

   Dois documentos fixos, não uma lista: não se cria nem se apaga termo de
   uso, só se reescreve. Por isso abas em vez de tabela, e nenhuma ação de
   excluir.
   ========================================================================== */

let DOCUMENTOS = new Map();
let ATUAL = 'termos';
let EDITOR = null;

document.addEventListener('DOMContentLoaded', async () => {
  if (!(await window.adminReady)) return;

  const { data, error } = await safeSelect('documentos_legais', '*');

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
  mostrar('termos');

  document.getElementById('btn-salvar').addEventListener('click', salvar);
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
  document.getElementById('doc-vigencia').value = doc.vigente_desde || '';
  document.getElementById('doc-atualizado').textContent =
    doc.updated_at ? formatDateTime(doc.updated_at) : '—';

  // O cabeçalho acompanha a aba: "Legal" sozinho não diz qual documento
  // está aberto quando a página é compartilhada por captura de tela.
  const titulo = document.querySelector('.admin-header-bar .header-bar-titulo h1');
  if (titulo) titulo.textContent = doc.titulo || 'Legal';
}

async function salvar() {
  const botao = document.getElementById('btn-salvar');
  botao.disabled = true;

  const linha = {
    conteudo: EDITOR.html(),
    vigente_desde: document.getElementById('doc-vigencia').value || null,
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
  toast('Documento salvo.');
}

/* Fechar a aba com texto não salvo é o mesmo risco de trocar de documento. */
window.addEventListener('beforeunload', (e) => {
  if (EDITOR && sujo()) { e.preventDefault(); e.returnValue = ''; }
});
