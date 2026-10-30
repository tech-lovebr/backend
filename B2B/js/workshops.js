/* ==========================================================================
   LOVE B2B — Workshops (hub.love.com.br/workshops)
   Formato de aula: vídeo (ou capa) em destaque, título, duração, resumo,
   conteúdo e material; ao lado, a lista numerada das aulas.
   As aulas vêm de hub_conteudo (tipo 'workshop', ativo), criadas no Admin em
   CMS › Conteúdo › Workshops. ?aula=<id> abre uma aula direto.
   "Assistida" fica guardado no navegador (localStorage).
   ========================================================================== */

const CHAVE_ASSISTIDAS = 'love_hub_aulas_assistidas';
let AULAS = [];

function escAula(s) {
  return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function assistidas() {
  try { return new Set(JSON.parse(localStorage.getItem(CHAVE_ASSISTIDAS) || '[]')); } catch (e) { return new Set(); }
}

function marcarAssistida(id, sim) {
  const s = assistidas();
  if (sim) s.add(id); else s.delete(id);
  try { localStorage.setItem(CHAVE_ASSISTIDAS, JSON.stringify([...s])); } catch (e) { /* segue */ }
}

/** Link de YouTube ou Vimeo → endereço do <iframe>. */
function embedDaAula(url) {
  const limpa = String(url || '').trim();
  const yt = limpa.match(/(?:youtube\.com\/(?:watch\?(?:.*&)?v=|shorts\/|embed\/)|youtu\.be\/)([\w-]{6,})/);
  if (yt) return `https://www.youtube.com/embed/${yt[1]}`;
  const vimeo = limpa.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  if (vimeo) return `https://player.vimeo.com/video/${vimeo[1]}`;
  return null;
}

function dataDaAula(iso) {
  if (!iso) return '';
  const d = new Date(`${iso}T12:00:00`);
  return isNaN(d.getTime()) ? '' : d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
}

function aulaAtual() {
  const id = new URLSearchParams(location.search).get('aula');
  return AULAS.find(a => a.id === id) || AULAS[0];
}

function renderAulas() {
  const host = document.getElementById('aulas');
  if (!AULAS.length) {
    host.innerHTML = `
      <div class="aulas-vazio">
        <p class="aulas-vazio-titulo">Nenhuma aula publicada ainda</p>
        <p class="aulas-vazio-texto">Os workshops da Love aparecem aqui. Volte em breve.</p>
      </div>`;
    return;
  }

  const aula = aulaAtual();
  const idx = AULAS.indexOf(aula);
  const vistas = assistidas();
  const embed = embedDaAula(aula.video_url);
  const meta = [aula.duracao, dataDaAula(aula.data_evento)].filter(Boolean).map(escAula).join(' · ');

  host.innerHTML = `
    <div class="aulas-grade">
      <article class="aula-principal">
        <div class="aula-midia">
          ${embed
            ? `<iframe src="${escAula(embed)}" title="${escAula(aula.titulo)}" loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>`
            : aula.imagem_url
              ? `<div class="aula-capa" style="background-image:url('${escAula(aula.imagem_url)}')"></div>`
              : '<div class="aula-capa aula-capa--vazia"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M8 4h11a1 1 0 0 1 1 1v11a1 1 0 0 1 -1 1h-11a1 1 0 0 1 -1 -1v-11a1 1 0 0 1 1 -1z" /><path d="M4 8v11a1 1 0 0 0 1 1h11" /><path d="M11 9l4 2.5l-4 2.5z" /></svg></div>'}
        </div>
        <div class="aula-info">
          <p class="aula-numero">Aula ${idx + 1} de ${AULAS.length}${meta ? ` · ${meta}` : ''}</p>
          <h3 class="aula-titulo">${escAula(aula.titulo)}</h3>
          ${aula.descricao ? `<p class="aula-resumo">${escAula(aula.descricao)}</p>` : ''}
          <div class="aula-acoes">
            <label class="aula-check">
              <input type="checkbox" id="aula-assistida" ${vistas.has(aula.id) ? 'checked' : ''}>
              <span>Marcar como assistida</span>
            </label>
            ${aula.link_url ? `<a class="btn-secondary header-btn-light aula-material" href="${escAula(aula.link_url)}" target="_blank" rel="noopener">Material da aula</a>` : ''}
            ${AULAS[idx + 1] ? `<a class="btn-primary aula-proxima" href="?aula=${encodeURIComponent(AULAS[idx + 1].id)}">Próxima aula</a>` : ''}
          </div>
          ${aula.conteudo_html ? `<div class="aula-conteudo">${aula.conteudo_html}</div>` : ''}
        </div>
      </article>

      <aside class="aulas-lista" aria-label="Aulas">
        <p class="aulas-lista-titulo">Aulas <span>${vistas.size ? `${AULAS.filter(a => vistas.has(a.id)).length}/${AULAS.length} assistidas` : `${AULAS.length} no total`}</span></p>
        <ol>
          ${AULAS.map((a, i) => `
            <li>
              <a href="?aula=${encodeURIComponent(a.id)}" class="aulas-item ${a.id === aula.id ? 'is-ativa' : ''} ${vistas.has(a.id) ? 'is-vista' : ''}">
                <span class="aulas-item-num">${vistas.has(a.id)
                  ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12l5 5l10 -10" /></svg>'
                  : i + 1}</span>
                <span class="aulas-item-texto">
                  <span class="aulas-item-titulo">${escAula(a.titulo)}</span>
                  ${a.duracao ? `<span class="aulas-item-meta">${escAula(a.duracao)}</span>` : ''}
                </span>
              </a>
            </li>`).join('')}
        </ol>
      </aside>
    </div>`;

  document.getElementById('aula-assistida')?.addEventListener('change', (e) => {
    marcarAssistida(aula.id, e.target.checked);
    renderAulas();
  });
  // Trocar de aula sem recarregar a página.
  host.querySelectorAll('a[href^="?aula="]').forEach(a => a.addEventListener('click', (e) => {
    e.preventDefault();
    history.pushState(null, '', a.getAttribute('href'));
    renderAulas();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }));
}

async function initWorkshopsPage() {
  const authed = await window.b2bAuthReady;
  if (!authed) return;

  const { data, error } = await supabaseClient
    .from('hub_conteudo')
    .select('*')
    .eq('tipo', 'workshop')
    .eq('ativo', true)
    .order('ordem', { ascending: true });
  if (error) console.error('Erro ao carregar workshops:', error);
  AULAS = data || [];
  renderAulas();
  window.addEventListener('popstate', renderAulas);
  window.b2bPageReady?.();
}

document.addEventListener('DOMContentLoaded', initWorkshopsPage);
