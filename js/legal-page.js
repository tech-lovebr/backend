/* ==========================================================================
   LOVE — Páginas públicas de Termos de Uso / Política de Privacidade

   Lê o documento (slug em <body data-legal-slug>) da tabela documentos_legais
   — a mesma que o Admin escreve em CMS → Legal — e renderiza título, data de
   vigência e o corpo em HTML (saída do editor rico do Admin, sem conversão).
   ========================================================================== */

document.addEventListener('DOMContentLoaded', async () => {
  const slug = document.body.getAttribute('data-legal-slug');
  const loadingEl = document.getElementById('legal-doc-loading');
  const titleEl = document.getElementById('legal-doc-title');
  const dateEl = document.getElementById('legal-doc-date');
  const bodyEl = document.getElementById('legal-doc-body');

  const { data, error } = await supabaseClient
    .from('documentos_legais')
    .select('*')
    .eq('slug', slug)
    .single();

  if (loadingEl) loadingEl.classList.add('hidden');

  if (error || !data) {
    if (bodyEl) {
      bodyEl.classList.remove('hidden');
      bodyEl.innerHTML = '<p class="text-zinc-500">Não foi possível carregar este documento no momento. Tente novamente em instantes.</p>';
    }
    return;
  }

  document.title = `${data.titulo || 'Documento'} — Love`;
  if (titleEl) titleEl.textContent = data.titulo || '';

  const dataReferencia = data.vigente_desde || data.updated_at;
  if (dateEl && dataReferencia) {
    dateEl.textContent = `Última atualização: ${formatarDataLegal(dataReferencia)}`;
  }

  if (bodyEl) {
    bodyEl.classList.remove('hidden');
    bodyEl.innerHTML = (data.conteudo && data.conteudo.trim())
      ? data.conteudo
      : '<p class="text-zinc-500">Este documento ainda não foi publicado.</p>';
  }
});

function formatarDataLegal(valor) {
  const meses = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
  const texto = String(valor);
  const d = new Date(texto.length <= 10 ? `${texto}T00:00:00` : texto);
  if (isNaN(d.getTime())) return '';
  return `${d.getDate()} de ${meses[d.getMonth()]} de ${d.getFullYear()}`;
}
