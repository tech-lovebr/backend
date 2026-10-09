/* ==========================================================================
   LOVE ADMIN — CMS: termos de uso e política de privacidade

   Dois documentos fixos, não uma lista: não se cria nem se apaga termo de
   uso, só se reescreve. Por isso abas em vez de tabela, e nenhuma ação de
   excluir.
   ========================================================================== */

let DOCUMENTOS = new Map();
let ATUAL = 'termos';
let EDITOR = null;
let BOTAO_SALVAR = null;

/* O que o editor mostrava quando o documento acabou de carregar. A
   comparação é contra isto, e não contra o HTML gravado: o editor
   normaliza e limpa o conteúdo ao abrir, então o texto do banco e o da
   tela nunca são idênticos byte a byte — comparar com o banco acusaria
   alteração em todo documento, sem ninguém ter digitado nada. */
let BASE = '';

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
  return EDITOR.html() !== BASE;
}

function mostrar(slug) {
  ATUAL = slug;
  const doc = DOCUMENTOS.get(slug) || {};

  EDITOR.definir(doc.conteudo || '');
  BASE = EDITOR.html();
  document.getElementById('doc-atualizado').textContent =
    doc.updated_at ? formatDateTime(doc.updated_at) : '—';

  // O cabeçalho acompanha a aba: "Legal" sozinho não diz qual documento
  // está aberto quando a página é compartilhada por captura de tela.
  const titulo = document.querySelector('.admin-header-bar .header-bar-titulo h1');
  if (titulo) titulo.textContent = doc.titulo || 'Legal';
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
  BASE = EDITOR.html();
  document.getElementById('doc-atualizado').textContent = formatDateTime(data.updated_at);

  toast('Documento salvo.');
}

/* Fechar a aba com texto não salvo é o mesmo risco de trocar de documento. */
window.addEventListener('beforeunload', (e) => {
  if (EDITOR && sujo()) { e.preventDefault(); e.returnValue = ''; }
});
