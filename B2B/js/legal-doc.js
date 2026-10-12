/* ==========================================================================
   LOVE B2B — Páginas legais (Termos de Uso / Política de Privacidade)
   Mesmo texto editado no Admin (CMS → Legal) e mostrado em love.com.br —
   ambos os sites leem a mesma tabela documentos_legais no mesmo projeto
   Supabase, então o conteúdo fica sempre igual nos dois lugares.

   Logado: abre dentro do mesmo shell (sidebar + header) de qualquer página
   do portal — ids com sufixo "-dash" (ver #legal-shell-view no HTML).
   Deslogado: página solta, sem sidebar — ids sem sufixo (#legal-standalone-view).
   Quem decide entre os dois é initAuthGuard() (js/shell.js), que marca
   'legal-logged-out' no <body> quando não há sessão.
   ========================================================================== */

(async function () {
  await window.b2bAuthReady;

  const loggedOut = document.body.classList.contains('legal-logged-out');
  const suffix = loggedOut ? '' : '-dash';

  const view = document.getElementById(loggedOut ? 'legal-standalone-view' : 'legal-shell-view');
  if (view) view.hidden = false;

  const slug = document.body.dataset.legalSlug;
  const fallbackTitle = slug === 'termos' ? 'Termos de Uso' : 'Política de Privacidade';
  const titleEl = document.getElementById(`legal-doc-title${suffix}`);
  const dateEl = document.getElementById(`legal-doc-date${suffix}`);
  const bodyEl = document.getElementById(`legal-doc-body${suffix}`);
  const loadingEl = document.getElementById(`legal-doc-loading${suffix}`);

  if (titleEl) titleEl.textContent = fallbackTitle;
  document.title = `${fallbackTitle} — Love`;

  const { data, error } = await supabaseClient.from('documentos_legais').select('*').eq('slug', slug).maybeSingle();
  if (loadingEl) loadingEl.hidden = true;

  if (error || !data) {
    if (bodyEl) bodyEl.innerHTML = '<p class="text-zinc-500">Não foi possível carregar este documento no momento. Tente novamente em instantes.</p>';
    window.b2bPageReady?.();
    return;
  }

  if (titleEl) titleEl.textContent = data.titulo || fallbackTitle;
  document.title = `${data.titulo || fallbackTitle} — Love`;
  if (dateEl && data.updated_at) dateEl.textContent = `Última atualização: ${formatarDataLegal(data.updated_at)}`;
  if (bodyEl) bodyEl.innerHTML = (data.conteudo && data.conteudo.trim())
    ? data.conteudo
    : '<p class="text-zinc-500">Este documento ainda não foi publicado.</p>';
  window.b2bPageReady?.();
})();

function formatarDataLegal(valor) {
  const meses = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
  const texto = String(valor);
  const d = new Date(texto.length <= 10 ? `${texto}T00:00:00` : texto);
  if (isNaN(d.getTime())) return '';
  return `${d.getDate()} de ${meses[d.getMonth()]} de ${d.getFullYear()}`;
}
