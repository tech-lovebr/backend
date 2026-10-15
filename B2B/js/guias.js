/* ==========================================================================
   LOVE B2B — Guias de início (FAQ em acordeão por guia, mesmo padrão de Ajuda)

   As perguntas vêm da tabela faq (plataforma 'fornecedor'), editadas no
   Admin em HUB/B2B → Dashboard → FAQ. Cada categoria vira um guia no menu
   da esquerda. Se a consulta falhar, fica o conteúdo fixo da página.
   ========================================================================== */

// Ordem dos guias no menu; categorias novas criadas no Admin vêm depois.
const GUIAS_ORDEM = [
  'Construtor de site', 'Guia de CRM', 'Guia de contratos', 'Guia de produtos e serviços',
  'Guia de agenda e tarefas', 'Gestão de compromissos', 'Guia financeiro'
];

function ligarGuias() {
  const buttons = document.querySelectorAll('#guias-nav .guide-link');
  const panels = document.querySelectorAll('[data-guide-panel]');
  const titleEl = document.getElementById('guias-faq-title');
  if (!buttons.length || !panels.length) return;

  buttons.forEach(btn => {
    btn.addEventListener('click', () => {
      const guide = btn.dataset.guide;
      buttons.forEach(b => b.classList.toggle('guide-link--active', b === btn));
      panels.forEach(p => {
        p.style.display = p.dataset.guidePanel === guide ? '' : 'none';
      });
      if (titleEl) titleEl.textContent = btn.textContent;
    });
  });
}

// Resposta em HTML (vinda do Admin) ou texto puro das perguntas antigas.
function respostaHtml(resposta) {
  const r = String(resposta || '');
  return /<[a-z][\s\S]*>/i.test(r) ? r : '<p>' + escapeHtml(r).replace(/\r?\n/g, '<br>') + '</p>';
}

async function carregarGuiasDoAdmin() {
  const nav = document.getElementById('guias-nav');
  const primeiroPainel = document.querySelector('[data-guide-panel]');
  if (!nav || !primeiroPainel || typeof supabaseClient === 'undefined') return;

  let itens = [];
  try {
    const { data, error } = await supabaseClient
      .from('faq')
      .select('categoria, pergunta, resposta, ordem')
      .eq('plataforma', 'fornecedor')
      .eq('ativo', true)
      .order('ordem', { ascending: true });
    if (error || !Array.isArray(data) || !data.length) return;
    itens = data;
  } catch (e) { return; }

  const categorias = [];
  itens.forEach(i => {
    const c = (i.categoria || '').trim() || 'Outros';
    if (!categorias.includes(c)) categorias.push(c);
  });
  const posicao = c => { const i = GUIAS_ORDEM.indexOf(c); return i === -1 ? GUIAS_ORDEM.length : i; };
  categorias.sort((a, b) => posicao(a) - posicao(b) || a.localeCompare(b, 'pt-BR'));

  const chave = c => c.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-');

  nav.innerHTML = categorias.map((c, i) =>
    '<button type="button" class="guide-link' + (i === 0 ? ' guide-link--active' : '') + '" data-guide="' + chave(c) + '">' + escapeHtml(c) + '</button>'
  ).join('');

  const pai = primeiroPainel.parentNode;
  document.querySelectorAll('[data-guide-panel]').forEach(p => p.remove());
  pai.insertAdjacentHTML('beforeend', categorias.map((c, i) =>
    '<div class="faq-list" data-guide-panel="' + chave(c) + '"' + (i === 0 ? '' : ' style="display:none"') + '>' +
      itens.filter(q => ((q.categoria || '').trim() || 'Outros') === c).map((q, j) =>
        '<details class="faq-item"' + (j === 0 ? ' open' : '') + '><summary>' + escapeHtml(q.pergunta || '') + '</summary>' +
        '<div class="faq-answer">' + respostaHtml(q.resposta) + '</div></details>'
      ).join('') +
    '</div>'
  ).join(''));

  const titleEl = document.getElementById('guias-faq-title');
  if (titleEl) titleEl.textContent = categorias[0];

  ligarGuias();
}

document.addEventListener('shell:ready', () => {
  ligarGuias();
  // Mostra a página quando os guias do Admin chegarem (ou falharem), em vez
  // de esperar o limite de 4 segundos da tela de carregamento.
  Promise.resolve()
    .then(() => carregarGuiasDoAdmin())
    .catch(() => {})
    .finally(() => window.b2bPageReady?.());
});
