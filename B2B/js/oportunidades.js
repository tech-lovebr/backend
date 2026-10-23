/* ==========================================================================
   LOVE B2B — Leads › Buscar eventos (pedidos de orçamento dos anfitriões)
   Antes era a página Oportunidades; agora é a 2ª aba de Leads (crm.html).
   Só aparece para quem tem produto cadastrado (é a categoria do produto que
   filtra os pedidos).
   O anfitrião publica um pedido em love.com.br (pedidos_orcamento, migration
   072). Aqui a empresa ativa vê os pedidos abertos, abre o detalhe e envia
   UMA proposta pela RPC enviar_proposta (migration 074), que também grava a
   mensagem tipo 'proposta' no chat. Contato do anfitrião nunca aparece.
   ========================================================================== */

const OP_CATEGORIAS = {
  fotografia: 'Fotografia', buffet: 'Buffet', espaco: 'Espaço', decoracao: 'Decoração',
  musica: 'Música', assessoria: 'Assessoria', bebidas: 'Bebidas', doces: 'Doces'
};
const OP_CELEBRACOES = {
  casamento: 'casamento', aniversario: 'aniversário', bodas: 'bodas',
  noivado: 'noivado', formatura: 'formatura', corporativo: 'evento corporativo'
};
const OP_CONVIDADOS = {
  'ate-50': 'Até 50 convidados', '50-100': '50 a 100 convidados',
  '100-200': '100 a 200 convidados', '200-mais': 'Mais de 200 convidados'
};
const OP_FAIXAS = {
  economico: { nome: 'Econômico', min: 0, max: 2500 },
  moderado: { nome: 'Moderado', min: 2500, max: 6000 },
  premium: { nome: 'Premium', min: 6000, max: 12000 },
  exclusivo: { nome: 'Exclusivo', min: 12000, max: null }
};
const OP_STATUS = {
  enviada: { label: 'Enviada', classe: 'op-status--enviada' },
  vista: { label: 'Vista', classe: 'op-status--vista' },
  aceita: { label: 'Aceita', classe: 'op-status--aceita' },
  recusada: { label: 'Recusada', classe: 'op-status--recusada' },
  retirada: { label: 'Retirada', classe: 'op-status--retirada' }
};
// Categoria da empresa no Hub (Meus produtos / Nova empresa) → categoria do pedido.
const OP_CATEGORIA_DO_HUB = {
  'Mídia e Audiovisual': ['fotografia'],
  'Buffet e Gastronomia': ['buffet', 'doces'],
  'Espaços para Locação': ['espaco'],
  'Decoração': ['decoracao'],
  'Música e Entretenimento': ['musica'],
  'Assessoria e Cerimonialista': ['assessoria'],
  'Bar e Bebidas': ['bebidas']
};
// Nomes antigos de categoria de produto (mesma lista de js/produtos.js).
const OP_CATEGORIA_ANTIGA = {
  'Buffet': 'Buffet e Gastronomia', 'Locação de espaço': 'Espaços para Locação', 'Espaços & Locações': 'Espaços para Locação',
  'Espaço de Locação': 'Espaços para Locação', 'Foto, Vídeo & Audiovisual': 'Mídia e Audiovisual', 'Mídia': 'Mídia e Audiovisual'
};
const opCategoriasDoProduto = cat => OP_CATEGORIA_DO_HUB[OP_CATEGORIA_ANTIGA[cat] || cat] || [];
// Limite de propostas por mês: Gratuito 3, Pro 100 (o banco confere o mesmo — migration 079).
const opLimiteDoPlano = () => (typeof isProPlan === 'function' && isProPlan()) ? 100 : 3;

let opEmpresaId = null;
let opMinhasCategorias = [];
let opPedidos = [];
let opPropostas = [];
let opFiltroCat = 'minha';
let opPedidoAberto = null;
let opMeusProdutos = [];

const opBRL = v => (Number(v) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: Number(v) % 1 ? 2 : 0 });
const opCategoria = c => OP_CATEGORIAS[c] || (c ? c.charAt(0).toUpperCase() + c.slice(1) : 'Serviço');
const opCelebracao = c => OP_CELEBRACOES[c] || c || 'evento';
const opTitulo = p => String((p && p.titulo) || '').trim() || `${opCategoria(p.categoria)} para ${opCelebracao(p.tipo_celebracao)}`;
// Mesmos nomes de love.com.br › Minhas solicitações.
const OP_CATEGORIA_NOME = {
  fotografia: 'Fotografia & Vídeo', buffet: 'Buffet & Gastronomia', espaco: 'Espaço para Eventos', decoracao: 'Decoração & Cenografia',
  musica: 'Música, Banda & DJ', assessoria: 'Assessoria & Cerimonial', bebidas: 'Bebidas & Bar', doces: 'Doces & Bolo'
};
const OP_CELEBRACAO_NOME = {
  casamento: 'Casamento', aniversario: 'Aniversário', bodas: 'Bodas', noivado: 'Noivado', formatura: 'Formatura',
  corporativo: 'Evento corporativo', 'chá de bebê': 'Chá de bebê', 'chá revelação': 'Chá revelação', 'chá de panela': 'Chá de panela'
};
const OP_CONVIDADOS_NOME = { 'ate-50': 'Até 50', '50-100': '50 a 100', '100-200': '100 a 200', '200-mais': '200+' };
const OP_FAIXAS_ANTIGAS = {
  economico: 'Econômico · até R$ 2.500', moderado: 'Moderado · R$ 2.500 a R$ 6.000',
  premium: 'Premium · R$ 6.000 a R$ 12.000', exclusivo: 'Exclusivo · acima de R$ 12.000'
};
const opMilhar = n => Number(n).toLocaleString('pt-BR', { maximumFractionDigits: 0 });
// Nome de quem pediu (clientes), carregado junto com os pedidos.
let opNomesClientes = {};
let opFotosClientes = {};
const opNomeAnfitriao = p => opNomesClientes[p.cliente_id] || 'Anfitrião(ã)';
const opDataCurta = p => (p.data_flexivel || !p.data_evento) ? 'Data flexível'
  : new Date(p.data_evento + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
const opDataLonga = p => (p.data_flexivel || !p.data_evento) ? 'Data flexível'
  : new Date(p.data_evento + 'T00:00:00').toLocaleDateString('pt-BR', { day: 'numeric', month: 'short', year: 'numeric' });
const opData = p => (p.data_flexivel || !p.data_evento)
  ? 'Data flexível'
  : new Date(p.data_evento + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }).replace('.', '');
const opLocal = p => [p.bairro, [p.cidade, p.uf].filter(Boolean).join(' - ')].filter(Boolean).join(', ');
const opPeriodo = p => p.periodo === 'horas' ? `${p.horas_servico || '?'}h de serviço` : (p.periodo === 'noturno' ? 'Noturno' : (p.periodo === 'diurno' ? 'Diurno' : ''));
function opFaixaTexto(p) {
  if (OP_FAIXAS_ANTIGAS[p.faixa]) return OP_FAIXAS_ANTIGAS[p.faixa];
  const temMin = p.valor_min != null && Number(p.valor_min) > 0;
  const temMax = p.valor_max != null && Number(p.valor_max) > 0;
  if (temMin && temMax) return `R$ ${opMilhar(p.valor_min)} a R$ ${opMilhar(p.valor_max)}`;
  if (temMin) return `A partir de R$ ${opMilhar(p.valor_min)}`;
  if (temMax) return `Até R$ ${opMilhar(p.valor_max)}`;
  return 'A combinar';
}
function opHaQuanto(iso) {
  const min = Math.max(1, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (min < 60) return `há ${min} ${min === 1 ? 'minuto' : 'minutos'}`;
  const h = Math.round(min / 60);
  if (h < 24) return `há ${h} ${h === 1 ? 'hora' : 'horas'}`;
  const d = Math.round(h / 24);
  return `há ${d} ${d === 1 ? 'dia' : 'dias'}`;
}
const opNovo = p => Date.now() - new Date(p.created_at).getTime() < 48 * 3600 * 1000;
const opContagem = p => p.limite_propostas ? `${p.propostas_recebidas} de ${p.limite_propostas} propostas` : `${p.propostas_recebidas} ${p.propostas_recebidas === 1 ? 'proposta' : 'propostas'}`;
const opMinhaProposta = pedidoId => opPropostas.find(x => x.pedido_id === pedidoId);

/* -------------------- Dados -------------------- */

/* O pedido só aparece para quem tem produto cadastrado numa categoria que
   o atende (ex.: pedido de local → produto de Espaços para Locação). */
async function opCarregarCategoriasDaEmpresa() {
  const { data: prods } = await supabaseClient.from('products').select('id, name, category, price, extra').eq('fornecedor_id', opEmpresaId).order('name');
  opMeusProdutos = prods || [];
  const cats = new Set();
  opMeusProdutos.forEach(p => opCategoriasDoProduto(p.category).forEach(c => cats.add(c)));
  opMinhasCategorias = [...cats];
}

async function opCarregarNomes(ids) {
  const faltam = [...new Set(ids.filter(id => id && !opNomesClientes[id]))];
  if (!faltam.length) return;
  const { data } = await supabaseClient.from('clientes').select('id, full_name, first_name, last_name, couple_name, avatar_url').in('id', faltam);
  (data || []).forEach(c => {
    if (c.avatar_url) opFotosClientes[c.id] = c.avatar_url;
    opNomesClientes[c.id] = String(c.full_name || [c.first_name, c.last_name].filter(Boolean).join(' ') || c.couple_name || '').trim();
  });
}

async function opCarregarPedidos() {
  let { data, error } = await supabaseClient.from('pedidos_orcamento')
    .select('id, titulo, categoria, especialidades, tipo_celebracao, data_evento, data_flexivel, cidade, bairro, uf, convidados, periodo, horas_servico, faixa, valor_min, valor_max, aceita_fora_da_faixa, descricao, referencias, limite_propostas, status, propostas_recebidas, created_at, cliente_id')
    .eq('status', 'aberto')
    .order('created_at', { ascending: false });
  opPedidos = error ? [] : (data || []);
  await opCarregarNomes(opPedidos.map(p => p.cliente_id));
  return !error;
}

async function opCarregarPropostas() {
  const { data, error } = await supabaseClient.from('propostas_pedido')
    .select('id, pedido_id, valor, inclui, validade, status, conversation_id, created_at, pedido:pedidos_orcamento(id, titulo, categoria, especialidades, descricao, referencias, periodo, horas_servico, faixa, valor_min, valor_max, aceita_fora_da_faixa, status, created_at, tipo_celebracao, data_evento, data_flexivel, cidade, bairro, uf, convidados, cliente_id)')
    .eq('fornecedor_id', opEmpresaId)
    .order('created_at', { ascending: false });
  opPropostas = error ? [] : (data || []);
  await opCarregarNomes(opPropostas.map(pr => pr.pedido && pr.pedido.cliente_id));
  opAtualizarCota();
  return !error;
}

/* -------------------- Pedidos abertos -------------------- */

function opPedidosFiltrados() {
  const uf = document.getElementById('op-filtro-uf').value;
  const cidade = document.getElementById('op-filtro-cidade').value;
  // Busca sem diferenciar maiúscula nem acento.
  const normal = t => String(t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
  const busca = normal(document.getElementById('op-busca')?.value || '');
  const categoria = document.getElementById('op-filtro-categoria')?.value || '';
  const orcamento = document.getElementById('op-filtro-orcamento')?.value || '';
  return opPedidos.filter(p =>
    opMinhasCategorias.includes(p.categoria) &&
    (!categoria || p.categoria === categoria) &&
    (!orcamento || opNaFaixa(p, orcamento)) &&
    (!opSoNaoRespondidas || !opMinhaProposta(p.id)) &&
    (!opSoSalvas || opSalvos.has(p.id)) &&
    (!uf || p.uf === uf) && (!cidade || p.cidade === cidade) &&
    (!busca || normal([opTitulo(p), OP_CATEGORIA_NOME[p.categoria], p.cidade, p.bairro, p.uf, p.descricao, (p.especialidades || []).join(' ')].join(' ')).includes(busca)));
}

let opSoNaoRespondidas = false;
/* Faixa de orçamento do pedido (min/max ou a faixa antiga) cruza com a do filtro? */
function opNaFaixa(p, filtro) {
  const [fMin, fMax] = filtro.split('-').map(v => (v === '' ? null : Number(v)));
  const antiga = OP_FAIXAS[p.faixa];
  const min = Number(p.valor_min) > 0 ? Number(p.valor_min) : (antiga ? antiga.min : null);
  const max = Number(p.valor_max) > 0 ? Number(p.valor_max) : (antiga ? antiga.max : null);
  if (min == null && max == null) return false;
  const pMin = min == null ? 0 : min;
  const pMax = max == null ? Infinity : max;
  return pMax >= fMin && (fMax == null || pMin <= fMax);
}
/* Urgente: evento nos próximos 14 dias. */
const opUrgente = p => {
  if (p.data_flexivel || !p.data_evento) return false;
  const dias = (new Date(p.data_evento + 'T00:00:00') - new Date()) / 86400000;
  return dias >= 0 && dias <= 14;
};

function opPreencherFiltrosDeLocal() {
  const ufSel = document.getElementById('op-filtro-uf');
  const cidSel = document.getElementById('op-filtro-cidade');
  const ufAtual = ufSel.value;
  const ufs = [...new Set(opPedidos.map(p => p.uf).filter(Boolean))].sort();
  ufSel.innerHTML = '<option value="">Todos os estados</option>' + ufs.map(u => `<option value="${escapeHtml(u)}">${escapeHtml(u)}</option>`).join('');
  ufSel.value = ufs.includes(ufAtual) ? ufAtual : '';
  const cidAtual = cidSel.value;
  const cidades = [...new Set(opPedidos.filter(p => !ufSel.value || p.uf === ufSel.value).map(p => p.cidade).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'pt-BR'));
  cidSel.innerHTML = '<option value="">Todas as cidades</option>' + cidades.map(c => {
    const uf = (opPedidos.find(p => p.cidade === c) || {}).uf;
    return `<option value="${escapeHtml(c)}">${escapeHtml(c)}${uf ? ` - ${escapeHtml(uf)}` : ''}</option>`;
  }).join('');
  cidSel.value = cidades.includes(cidAtual) ? cidAtual : '';
  const catSel = document.getElementById('op-filtro-categoria');
  if (catSel) {
    const catAtual = catSel.value;
    catSel.innerHTML = '<option value="">Todas as categorias</option>' + opMinhasCategorias
      .map(c => `<option value="${escapeHtml(c)}">${escapeHtml(OP_CATEGORIA_NOME[c] || opCategoria(c))}</option>`).join('');
    catSel.value = opMinhasCategorias.includes(catAtual) ? catAtual : '';
  }
}

/* Card no modelo do Explorar (love.com.br, visão em grade): imagem larga em
   cima (1ª foto de referência ou um fundo com a categoria), título com a
   cidade ao lado, quem pede, faixa e data, e os botões embaixo. */
function opCardHtml(p) {
  const minha = opMinhaProposta(p.id);
  const salva = opSalvos.has(p.id);
  const icone = d => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
  const local = [p.cidade, p.uf].filter(Boolean).join(' - ');
  const pills = [
    [icone('<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 11h18"/>'), opDataLonga(p)],
    [icone('<path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21Z"/><circle cx="12" cy="9.5" r="2.5"/>'), local],
    [icone('<circle cx="9" cy="8" r="3.2"/><path d="M3 19c.6-3.2 3-5 6-5s5.4 1.8 6 5M16 5.2a3 3 0 0 1 0 5.6M18 14.3c1.7.6 2.8 2.2 3 4.7"/>'), OP_CONVIDADOS_NOME[p.convidados] ? `${OP_CONVIDADOS_NOME[p.convidados]} convidados` : ''],
    [icone('<path d="M3 12V5a2 2 0 0 1 2-2h7l9 9-9 9-9-9Z"/><circle cx="8" cy="8" r="1.5"/>'), opFaixaTexto(p) === 'A combinar' ? 'Aberto a negociação' : opFaixaTexto(p)]
  ].filter(([, t]) => t);
  return `
    <article class="op-linha" data-op-pedido="${escapeHtml(p.id)}" tabindex="0">
      <div class="op-linha-topo">
        <span class="op-analise-badge">${escapeHtml(OP_CATEGORIA_NOME[p.categoria] || opCategoria(p.categoria))}</span>
        ${p.created_at ? `<span class="op-linha-quando">Publicado ${escapeHtml(opHaQuanto(p.created_at))}</span>` : ''}
        ${opNovo(p) ? '<span class="op-linha-selo is-novo">Novo</span>' : ''}
        ${opUrgente(p) ? '<span class="op-linha-selo is-urgente">Urgente</span>' : ''}
        <span class="op-linha-quem">${minha
          ? `<span class="op-status ${OP_STATUS[minha.status].classe}">Proposta ${OP_STATUS[minha.status].label.toLowerCase()}</span>`
          : escapeHtml(opNomeAnfitriao(p))}</span>
        <button type="button" class="op-linha-salvar${salva ? ' is-salva' : ''}" data-op-salvar-linha="${escapeHtml(p.id)}" aria-pressed="${salva}" aria-label="${salva ? 'Remover das salvas' : 'Salvar vaga'}" data-dica="${salva ? 'Salva' : 'Salvar vaga'}">
          ${icone('<path d="M6.5 5.5a2.5 2.5 0 0 1 2.5-2.5h6a2.5 2.5 0 0 1 2.5 2.5V21L12 16.5 6.5 21V5.5Z"/>')}
        </button>
      </div>
      <h3 class="op-linha-titulo">${escapeHtml(opTitulo(p))}</h3>
      ${p.descricao ? `<p class="op-linha-desc">${escapeHtml(String(p.descricao).trim())}</p>` : ''}
      <div class="op-linha-rodape">
        <div class="op-linha-pills">${pills.map(([svg, t]) => `<span class="op-linha-pill">${svg}${escapeHtml(t)}</span>`).join('')}</div>
        <span class="btn-secondary op-linha-acao">${minha ? 'Ver detalhes' : 'Ver detalhes e enviar proposta'}</span>
      </div>
    </article>`;
}

/* Chips de cidade (Todas + "Cidade (UF)" de cada pedido aberto). */
/* Filtrar por: abre/fecha o menu e mostra quantos filtros estão ligados. */
function opAtualizarQtdFiltros() {
  const n = ['op-filtro-categoria', 'op-filtro-cidade', 'op-filtro-orcamento'].filter(id => document.getElementById(id)?.value).length;
  const qtd = document.getElementById('op-filtrar-qtd');
  if (qtd) { qtd.textContent = n ? ` (${n})` : ''; qtd.hidden = !n; }
}
function opLigarFiltrarPor() {
  const btn = document.getElementById('op-filtrar-btn');
  const menu = document.getElementById('op-filtrar-menu');
  if (!btn || !menu) return;
  const fechar = () => { menu.hidden = true; btn.setAttribute('aria-expanded', 'false'); };
  btn.addEventListener('click', e => { e.stopPropagation(); menu.hidden = !menu.hidden; btn.setAttribute('aria-expanded', String(!menu.hidden)); });
  menu.addEventListener('click', e => e.stopPropagation());
  document.addEventListener('click', fechar);
  document.addEventListener('keydown', e => { if (e.key === 'Escape') fechar(); });
  document.getElementById('op-filtrar-limpar')?.addEventListener('click', () => {
    ['op-filtro-categoria', 'op-filtro-cidade', 'op-filtro-orcamento'].forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
    opRenderPedidos();
  });
}

function opRenderChips() {
  opAtualizarQtdFiltros();
  const qtd = document.getElementById('op-salvas-qtd');
  const n = opPedidos.filter(p => opSalvos.has(p.id)).length;
  if (qtd) qtd.textContent = n ? ` (${n})` : '';
  document.querySelector('[data-op-salvas]')?.classList.toggle('is-ativo', opSoSalvas);
  document.querySelector('[data-op-salvas]')?.setAttribute('aria-pressed', String(opSoSalvas));
  document.querySelector('[data-op-nao-respondidas]')?.classList.toggle('is-ativo', opSoNaoRespondidas);
  document.querySelector('[data-op-nao-respondidas]')?.setAttribute('aria-pressed', String(opSoNaoRespondidas));
}

function opRenderPedidos() {
  const grade = document.getElementById('op-grade');
  const vazio = document.getElementById('op-vazio');
  const lista = opPedidosFiltrados();
  grade.innerHTML = lista.map(opCardHtml).join('');
  opRenderChips();
  vazio.hidden = lista.length > 0;
  vazio.textContent = opSoSalvas
    ? 'Você ainda não salvou nenhuma solicitação. Abra uma e toque em Salvar vaga.'
    : opFiltroCat === 'minha'
    ? 'Nenhum evento procurando a sua categoria agora. Avisaremos quando chegar um novo.'
    : 'Nenhum pedido aberto com esses filtros agora.';
}

/* -------------------- Detalhe do pedido -------------------- */

function opAbrirDetalhe(id) {
  const p = opPedidos.find(x => x.id === id) || (opPropostas.find(x => x.pedido_id === id) || {}).pedido;
  if (!p) return;
  opPedidoAberto = p;
  const minha = opMinhaProposta(p.id);
  const traco = '—';
  const local = [p.cidade, p.uf].filter(Boolean).join(', ') || traco;
  const periodo = p.periodo === 'horas'
    ? `${p.horas_servico || '?'} ${Number(p.horas_servico) === 1 ? 'hora' : 'horas'} de serviço`
    : ({ diurno: 'Diurno', noturno: 'Noturno' })[p.periodo] || traco;
  const destaques = [
    ['Data do evento', opDataLonga(p)],
    ['Convidados', OP_CONVIDADOS_NOME[p.convidados] || traco],
    ['Horário / duração', periodo],
    ['Orçamento previsto', opFaixaTexto(p)]
  ];
  const tags = p.especialidades || [];
  const fotos = p.referencias || [];
  // Perguntas do anfitrião: só se o formulário de criação tiver enviado.
  const perguntas = Array.isArray(p.perguntas) ? p.perguntas.filter(Boolean) : [];
  const salva = opSalvos.has(p.id);
  const icone = d => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
  const acao = minha
    ? `<p class="op-analise-enviada">Proposta enviada em ${new Date(minha.created_at).toLocaleDateString('pt-BR')} · ${escapeHtml(opBRL(minha.valor))}</p><span class="op-status ${OP_STATUS[minha.status].classe}">${OP_STATUS[minha.status].label}</span>`
    : (p.status === 'aberto' || !p.status
      ? '<button type="button" class="btn-primary op-analise-enviar" data-op-enviar>Enviar proposta</button>'
      : '<p class="op-analise-enviada">Esta solicitação não recebe mais propostas.</p>');
  document.getElementById('op-detalhe-corpo').innerHTML = `
    <div class="op-analise">
      <div class="op-analise-principal">
        <header class="op-analise-cabeca">
          <h3 class="op-analise-titulo">${escapeHtml(opTitulo(p))}</h3>
          <p class="op-analise-meta">
            <span class="op-analise-badge">${escapeHtml(OP_CATEGORIA_NOME[p.categoria] || opCategoria(p.categoria))}</span>
            ${p.created_at ? `<span>Publicado ${escapeHtml(opHaQuanto(p.created_at))}</span>` : ''}
            <span class="op-analise-local">${icone('<path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21Z"/><circle cx="12" cy="9.5" r="2.5"/>')}${escapeHtml(local)}</span>
          </p>
        </header>
        <section class="op-analise-destaques">
          ${destaques.map(([rotulo, valor]) => `<div class="op-analise-destaque"><span>${escapeHtml(rotulo)}</span><b>${escapeHtml(valor)}</b></div>`).join('')}
        </section>
        <section class="op-analise-sec">
          <h4 class="op-analise-sub">Descrição da solicitação</h4>
          <p class="op-analise-desc">${escapeHtml(String(p.descricao || '').trim() || 'Sem descrição.')}</p>
        </section>
        ${tags.length ? `<section class="op-analise-sec"><h4 class="op-analise-sub">Subcategorias</h4><div class="op-sol-tags">${tags.map(t => `<span>${escapeHtml(t)}</span>`).join('')}</div></section>` : ''}
        ${perguntas.length ? `<section class="op-analise-sec"><h4 class="op-analise-sub">Perguntas do anfitrião</h4><ol class="op-analise-perguntas">${perguntas.map(q => `<li>${escapeHtml(String(q))}</li>`).join('')}</ol></section>` : ''}
        ${fotos.length ? `<section class="op-analise-sec"><h4 class="op-analise-sub">Fotos de referência</h4><div class="op-fotos">${fotos.map(u => `<button type="button" class="op-foto" data-op-foto="${escapeHtml(u)}"><img src="${escapeHtml(u)}" alt="Referência"></button>`).join('')}</div></section>` : ''}
      </div>

      <aside class="op-analise-lateral">
        <div class="op-analise-card op-analise-acao">
          ${acao}
          <button type="button" class="op-analise-salvar${salva ? ' is-salva' : ''}" data-op-salvar aria-pressed="${salva}">
            ${icone('<path d="M6.5 5.5a2.5 2.5 0 0 1 2.5-2.5h6a2.5 2.5 0 0 1 2.5 2.5V21L12 16.5 6.5 21V5.5Z"/>')}
            <span>${salva ? 'Vaga salva' : 'Salvar vaga'}</span>
          </button>
          <p class="op-analise-aviso">O envio de proposta conecta você diretamente à fila de análise do anfitrião.</p>
        </div>

        <div class="op-analise-card" id="op-analise-anfitriao">
          <h4 class="op-analise-card-titulo">Sobre o anfitrião</h4>
          <div class="op-analise-pessoa">
            <span class="op-analise-avatar">${opFotosClientes[p.cliente_id] ? `<img src="${escapeHtml(opFotosClientes[p.cliente_id])}" alt="">` : escapeHtml(opIniciais(opNomeAnfitriao(p)))}</span>
            <b>${escapeHtml(opNomeAnfitriao(p))}</b>
          </div>
          <ul class="op-analise-fatos" data-op-anfitriao-fatos>
            <li>${icone('<path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21Z"/><circle cx="12" cy="9.5" r="2.5"/>')}${escapeHtml(local)}</li>
          </ul>
        </div>
      </aside>

      <!-- Celular: o botão fica preso embaixo da tela. -->
      ${!minha && (p.status === 'aberto' || !p.status) ? '<div class="op-analise-barra"><button type="button" class="btn-primary op-analise-enviar" data-op-enviar>Enviar proposta</button></div>' : ''}
    </div>`;
  opPreencherAnfitriao(p);
  // Tela cheia: some o resto da página; título do pedido com a seta de voltar.
  document.body.classList.add('op-pedido-aberto');
  document.getElementById('op-pedido-pagina').hidden = false;
  document.getElementById('op-pedido-voltar').hidden = false;
  document.getElementById('leads-titulo-pagina').textContent = 'Análise de solicitação';
  if (new URLSearchParams(location.search).get('pedido') !== p.id) history.replaceState(null, '', `${location.pathname}?pedido=${encodeURIComponent(p.id)}`);
  window.scrollTo({ top: 0 });
  document.querySelector('.b2b-content')?.scrollTo({ top: 0 });
}

function opFecharDetalhe() {
  if (!document.body.classList.contains('op-pedido-aberto')) return;
  opPedidoAberto = null;
  history.replaceState(null, '', location.pathname);
  const abaAtiva = document.querySelector('[data-leads-aba].active');
  leadsMostrarAba(abaAtiva ? abaAtiva.dataset.leadsAba : 'eventos');
}

/* Limite do plano: depois de 3 (Gratuito) ou 100 (Pro) propostas no mês, a
   vitrine continua aberta, mas "Enviar proposta" mostra este aviso. */
/* -------------------- Salvar vaga --------------------
   Tabela pedidos_salvos (migration 080). Sem ela, guarda neste navegador. */
let opSalvos = new Set();
let opSoSalvas = false;
const opChaveSalvos = () => `op-salvos-${opEmpresaId}`;
let opSalvosNoBanco = true;
async function opCarregarSalvos() {
  const { data, error } = await supabaseClient.from('pedidos_salvos').select('pedido_id').eq('fornecedor_id', opEmpresaId);
  if (error) {
    opSalvosNoBanco = false;
    try { opSalvos = new Set(JSON.parse(localStorage.getItem(opChaveSalvos()) || '[]')); } catch (e) { opSalvos = new Set(); }
    return;
  }
  opSalvos = new Set((data || []).map(x => x.pedido_id));
}
async function opAlternarSalva(id) {
  const p = id ? { id } : opPedidoAberto;
  if (!p) return;
  const salvar = !opSalvos.has(p.id);
  if (salvar) opSalvos.add(p.id); else opSalvos.delete(p.id);
  opRenderChips();
  if (!document.body.classList.contains('op-pedido-aberto')) opRenderPedidos();
  const btn = document.querySelector('[data-op-salvar]');
  if (btn) {
    btn.classList.toggle('is-salva', salvar);
    btn.setAttribute('aria-pressed', String(salvar));
    btn.querySelector('span').textContent = salvar ? 'Vaga salva' : 'Salvar vaga';
  }
  if (opSalvosNoBanco) {
    const q = salvar
      ? supabaseClient.from('pedidos_salvos').insert({ fornecedor_id: opEmpresaId, pedido_id: p.id })
      : supabaseClient.from('pedidos_salvos').delete().eq('fornecedor_id', opEmpresaId).eq('pedido_id', p.id);
    const { error } = await q;
    if (!error) return;
    opSalvosNoBanco = false;
  }
  try { localStorage.setItem(opChaveSalvos(), JSON.stringify([...opSalvos])); } catch (e) { /* sem armazenamento */ }
}

/* -------------------- Sobre o anfitrião --------------------
   RPC sobre_anfitriao (migration 080): foto, membro desde e se tem CPF e
   telefone cadastrados, sem expor os números. */
const opIniciais = nome => String(nome || '').trim().split(/\s+/).filter(Boolean).slice(0, 2).map(x => x[0].toUpperCase()).join('') || 'A';
async function opPreencherAnfitriao(p) {
  const { data, error } = await supabaseClient.rpc('sobre_anfitriao', { p_cliente: p.cliente_id });
  const info = !error && Array.isArray(data) ? data[0] : null;
  if (!info || !opPedidoAberto || opPedidoAberto.id !== p.id) return;
  const card = document.getElementById('op-analise-anfitriao');
  if (!card) return;
  if (info.avatar_url) {
    const av = card.querySelector('.op-analise-avatar');
    av.innerHTML = `<img src="${escapeHtml(info.avatar_url)}" alt="">`;
  }
  if (info.nome) card.querySelector('.op-analise-pessoa b').textContent = info.nome;
  const fatos = card.querySelector('[data-op-anfitriao-fatos]');
  const check = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"/></svg>';
  const cal = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 11h18"/></svg>';
  const mais = [];
  if (info.tem_cpf) mais.push(`<li class="is-ok">${check}CPF cadastrado</li>`);
  if (info.tem_telefone) mais.push(`<li class="is-ok">${check}Telefone cadastrado</li>`);
  if (info.membro_desde) {
    const desde = new Date(info.membro_desde).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
    mais.push(`<li>${cal}Membro desde ${escapeHtml(desde)}</li>`);
  }
  fatos.insertAdjacentHTML('beforeend', mais.join(''));
}

function opAtualizarCota() { /* o contador saiu do cabeçalho */ }
function opEnviadasNoMes() {
  const agora = new Date();
  return opPropostas.filter(pr => { const d = new Date(pr.created_at); return d.getFullYear() === agora.getFullYear() && d.getMonth() === agora.getMonth(); }).length;
}
function opAvisarLimite(limite) {
  const pro = limite >= 100;
  confirmarNoHub({
    titulo: 'Limite de propostas atingido',
    texto: `Seu plano só permite ${limite} envios de propostas por mês.${pro ? '' : ' Com o plano Pro, você pode enviar até 100 propostas por mês.'}`,
    botao: pro ? 'Entendi' : 'Conhecer o plano Pro',
    aoConfirmar: () => { if (!pro) window.location.href = 'planos'; }
  });
}

/* -------------------- Enviar proposta -------------------- */

function opValorDigitado() {
  const d = document.getElementById('op-valor').value.replace(/\D/g, '');
  return d ? Number(d) / 100 : 0;
}

function opDescontoPct() {
  const n = Number(String(document.getElementById('op-desconto').value || '').replace(',', '.').replace(/[^\d.]/g, ''));
  return Number.isFinite(n) ? Math.min(100, Math.max(0, n)) : 0;
}
function opTotalProposta() {
  const base = opValorDigitado();
  return Math.round(base * (1 - opDescontoPct() / 100) * 100) / 100;
}
function opAtualizarTotal() {
  const base = opValorDigitado();
  const total = opTotalProposta();
  document.getElementById('op-desconto-valor').textContent = base - total > 0 ? `− ${opBRL(base - total)}` : opBRL(0);
  document.getElementById('op-total').textContent = opBRL(total);
  opChecarFaixa();
}
function opPreencherValor(valor) {
  const campo = document.getElementById('op-valor');
  campo.value = valor > 0 ? opBRL(valor).replace(/ /g, ' ') : '';
  opAtualizarTotal();
}

/* Etapas do pop-up: 1 Produto, 2 Valor e desconto, 3 Detalhes. */
let opEtapa = 1;
function opIrParaEtapa(n) {
  opEtapa = n;
  document.querySelectorAll('[data-op-etapa]').forEach(b => b.classList.toggle('is-ativa', Number(b.dataset.opEtapa) === n));
  document.querySelectorAll('[data-op-painel-etapa]').forEach(sec => { sec.hidden = Number(sec.dataset.opPainelEtapa) !== n; });
  const semProduto = !opMeusProdutos.length;
  document.getElementById('op-prop-voltar').hidden = n === 1;
  document.getElementById('op-prop-continuar').hidden = n === 3 || semProduto;
  document.getElementById('op-enviar-btn').hidden = n !== 3;
  mostrarMsgOp('');
  if (n === 2) setTimeout(() => document.getElementById('op-valor').focus(), 30);
  if (n === 3) setTimeout(() => document.getElementById('op-inclui').focus(), 30);
}
function opEtapaValida(n) {
  if (n >= 1 && !document.getElementById('op-produto').value) { mostrarMsgOp('Escolha qual produto você está ofertando.', true); return false; }
  if (n >= 2 && !(opTotalProposta() > 0)) { mostrarMsgOp('Informe o preço da proposta.', true); return false; }
  return true;
}
function opAoEscolherProduto() {
  const pr = opMeusProdutos.find(x => x.id === document.getElementById('op-produto').value);
  if (!pr) return;
  // Preço já vem do produto (pode editar); o que está incluso, da lista do produto.
  opPreencherValor(Number(pr.price) || 0);
  const inclui = document.getElementById('op-inclui');
  const lista = (pr.extra && pr.extra.scope && pr.extra.scope.included) || [];
  if (!inclui.value.trim() && lista.length) {
    inclui.value = lista.join('\n').slice(0, 1000);
    document.getElementById('op-inclui-contador').textContent = `${inclui.value.length}/1000`;
  }
}

function opChecarFaixa() {
  const p = opPedidoAberto;
  const alerta = document.getElementById('op-alerta-faixa');
  const valor = opTotalProposta();
  const f = OP_FAIXAS[p && p.faixa];
  const min = p && p.valor_min != null ? Number(p.valor_min) : (f ? f.min : null);
  const max = p && p.valor_max != null ? Number(p.valor_max) : (f ? f.max : null);
  const fora = valor > 0 && ((min != null && valor < min) || (max != null && valor > max));
  alerta.hidden = !(fora && p && !p.aceita_fora_da_faixa);
  alerta.textContent = 'Este valor está fora da faixa do anfitrião, e ele não aceita propostas fora dela. Você ainda pode enviar.';
}

function opAbrirProposta() {
  const p = opPedidoAberto;
  if (!p) return;
  const limite = opLimiteDoPlano();
  if (opEnviadasNoMes() >= limite) { opAvisarLimite(limite); return; }
  const modal = document.getElementById('op-proposta-modal');
  document.getElementById('op-proposta-form').hidden = false;
  document.getElementById('op-enviada').hidden = true;
  document.getElementById('op-proposta-form').reset();
  document.getElementById('op-inclui-contador').textContent = '0/1000';
  // Título, data e local, cada um numa caixinha cinza.
  document.getElementById('op-proposta-sub').innerHTML = [opTitulo(p), opDataCurta(p), [p.cidade, p.uf].filter(Boolean).join(', ')]
    .filter(Boolean).map(t => `<span>${escapeHtml(t)}</span>`).join('');
  document.getElementById('op-faixa-pill').textContent = p.faixa ? opFaixaTexto(p) : '';
  // Produtos da empresa que atendem a categoria do pedido (sem nenhum, todos).
  const daCategoria = opMeusProdutos.filter(pr => opCategoriasDoProduto(pr.category).includes(p.categoria));
  const opcoes = daCategoria.length ? daCategoria : opMeusProdutos;
  const sel = document.getElementById('op-produto');
  sel.innerHTML = (opcoes.length === 1 ? '' : '<option value="">Escolha o produto</option>') +
    opcoes.map(pr => `<option value="${escapeHtml(pr.id)}">${escapeHtml(pr.name || 'Produto')}</option>`).join('');
  // Sem produto: só o aviso para adicionar um.
  sel.hidden = !opMeusProdutos.length;
  document.getElementById('op-produto-vazio').hidden = opMeusProdutos.length > 0;
  opPreencherValor(0);
  if (sel.value) opAoEscolherProduto();
  opIrParaEtapa(1);
  modal.classList.add('show');
  modal.setAttribute('aria-hidden', 'false');
}

function opFecharProposta() {
  const modal = document.getElementById('op-proposta-modal');
  modal.classList.remove('show');
  modal.setAttribute('aria-hidden', 'true');
}

function mostrarMsgOp(texto, erro) {
  const el = document.getElementById('op-proposta-msg');
  el.textContent = texto || '';
  el.hidden = !texto;
  el.classList.toggle('is-erro', !!erro);
}

async function opEnviarProposta(e) {
  e.preventDefault();
  const p = opPedidoAberto;
  if (opEtapa !== 3) return;
  const valor = opTotalProposta();
  const inclui = document.getElementById('op-inclui').value.trim();
  const produtoId = document.getElementById('op-produto').value;
  if (!produtoId) { opIrParaEtapa(1); return mostrarMsgOp('Escolha qual produto você está ofertando.', true); }
  if (!valor) { opIrParaEtapa(2); return mostrarMsgOp('Informe o preço da proposta.', true); }
  if (!inclui) return mostrarMsgOp('Descreva o que está incluso.', true);
  const btn = document.getElementById('op-enviar-btn');
  btn.disabled = true;
  mostrarMsgOp('');
  const params = {
    p_pedido: p.id,
    p_fornecedor: opEmpresaId,
    p_valor: valor,
    p_inclui: inclui,
    p_mensagem: document.getElementById('op-mensagem').value.trim() || null,
    p_validade: null,
    p_prazo: null
  };
  let { data: propostaId, error } = await supabaseClient.rpc('enviar_proposta', { ...params, p_produto: produtoId });
  // Banco ainda sem a migration 079 (RPC sem p_produto): envia do jeito antigo.
  if (error && error.code === 'PGRST202') {
    ({ data: propostaId, error } = await supabaseClient.rpc('enviar_proposta', params));
  }
  btn.disabled = false;
  if (error && /LIMITE_PLANO/.test(error.message || '')) {
    opFecharProposta();
    opAvisarLimite(opLimiteDoPlano());
    return;
  }
  // A RPC devolve mensagens claras ("Você já enviou…", "Este pedido não recebe mais propostas").
  // Função ainda não criada no banco (migrations 074 e 079): mensagem clara em vez do erro técnico.
  if (error && error.code === 'PGRST202') return mostrarMsgOp('O envio de propostas ainda não está disponível. Tente de novo em alguns minutos.', true);
  if (error) return mostrarMsgOp(error.message || 'Não foi possível enviar a proposta.', true);

  await Promise.all([opCarregarPropostas(), opCarregarPedidos()]);
  const enviada = opPropostas.find(x => x.id === propostaId);
  const link = document.getElementById('op-abrir-conversa');
  link.href = enviada && enviada.conversation_id ? `chat?conversa=${encodeURIComponent(enviada.conversation_id)}` : 'chat';
  document.getElementById('op-proposta-form').hidden = true;
  document.getElementById('op-enviada').hidden = false;
  opRenderPedidos();
  opRenderPropostas();
  if (opPedidoAberto) opAbrirDetalhe(opPedidoAberto.id);
}

/* -------------------- Minhas propostas -------------------- */

function opRenderPropostas() {
  const body = document.getElementById('op-propostas-body');
  if (!body) return;
  if (!opPropostas.length) {
    body.innerHTML = '<tr><td colspan="7" class="text-center text-sm text-zinc-500" style="padding:1.5rem 0;">Você ainda não enviou propostas.</td></tr>';
    return;
  }
  body.innerHTML = opPropostas.map(pr => {
    const p = pr.pedido || {};
    const st = OP_STATUS[pr.status] || OP_STATUS.enviada;
    const podeRetirar = pr.status === 'enviada' || pr.status === 'vista';
    const aceita = pr.status === 'aceita';
    const orcamento = `vendas?criar=orcamento&cliente=${encodeURIComponent(p.cliente_id || '')}&servico=${encodeURIComponent(opCategoria(p.categoria))}&data=${encodeURIComponent(p.data_evento || '')}&local=${encodeURIComponent(opLocal(p))}`;
    return `
      <tr class="${aceita ? 'op-linha-aceita' : ''}">
        <td class="col-principal">${escapeHtml(opTitulo(p))}${aceita ? `<a class="op-proximo-passo" href="${orcamento}">Gerar orçamento / contrato</a>` : ''}</td>
        <td>${escapeHtml(p.data_evento || p.data_flexivel ? opData(p) : '—')}</td>
        <td>${escapeHtml(opLocal(p) || '—')}</td>
        <td class="finance-valor">${escapeHtml(opBRL(pr.valor))}</td>
        <td><span class="op-status ${st.classe}">${st.label}</span></td>
        <td>${new Date(pr.created_at).toLocaleDateString('pt-BR')}</td>
        <td class="tabela-col-acoes">
          <div class="op-menu-wrap">
            <button type="button" class="tabela-ver-mais" data-op-menu="${escapeHtml(pr.id)}" title="Mais opções" aria-label="Mais opções">${typeof TABELA_ICONE_VER_MAIS !== 'undefined' ? TABELA_ICONE_VER_MAIS : '⋯'}</button>
            <div class="op-menu" data-op-menu-lista="${escapeHtml(pr.id)}" hidden>
              ${pr.conversation_id ? `<a href="chat?conversa=${encodeURIComponent(pr.conversation_id)}">Abrir conversa</a>` : ''}
              ${podeRetirar ? `<button type="button" data-op-retirar="${escapeHtml(pr.id)}">Retirar proposta</button>` : ''}
            </div>
          </div>
        </td>
      </tr>`;
  }).join('');
}

async function opRetirar(id) {
  const { error } = await supabaseClient.from('propostas_pedido').update({ status: 'retirada' }).eq('id', id);
  if (!error) { await opCarregarPropostas(); opRenderPropostas(); opRenderPedidos(); }
}

/* -------------------- Abas, filtros e eventos -------------------- */

function opMostrarAba(aba) {
  document.querySelectorAll('[data-op-aba]').forEach(b => b.classList.toggle('active', b.dataset.opAba === aba));
  document.querySelectorAll('[data-op-painel]').forEach(s => { s.hidden = s.dataset.opPainel !== aba; });
}

function opLigarEventos() {
  document.querySelectorAll('[data-op-aba]').forEach(b => b.addEventListener('click', () => opMostrarAba(b.dataset.opAba)));
  document.querySelectorAll('[data-op-cat]').forEach(b => b.addEventListener('click', () => {
    opFiltroCat = b.dataset.opCat;
    document.querySelectorAll('[data-op-cat]').forEach(x => x.classList.toggle('active', x === b));
    opRenderPedidos();
  }));
  document.getElementById('op-filtro-cidade').addEventListener('change', opRenderPedidos);
  document.getElementById('op-filtro-categoria').addEventListener('change', opRenderPedidos);
  document.getElementById('op-filtro-orcamento').addEventListener('change', opRenderPedidos);
  opLigarFiltrarPor();
  document.querySelector('[data-op-salvas]').addEventListener('click', () => { opSoSalvas = !opSoSalvas; opRenderPedidos(); });
  document.querySelector('[data-op-nao-respondidas]').addEventListener('click', () => { opSoNaoRespondidas = !opSoNaoRespondidas; opRenderPedidos(); });

  document.getElementById('op-busca')?.addEventListener('input', opRenderPedidos);
  const grade = document.getElementById('op-grade');
  grade.addEventListener('click', e => {
    const salvar = e.target.closest('[data-op-salvar-linha]');
    if (salvar) { e.stopPropagation(); opAlternarSalva(salvar.dataset.opSalvarLinha); return; }
    const c = e.target.closest('[data-op-pedido]');
    if (c) opAbrirDetalhe(c.dataset.opPedido);
  });
  grade.addEventListener('keydown', e => { if (e.key === 'Enter') { const c = e.target.closest('[data-op-pedido]'); if (c) opAbrirDetalhe(c.dataset.opPedido); } });

  document.getElementById('op-pedido-voltar').addEventListener('click', opFecharDetalhe);
  document.getElementById('op-detalhe-corpo').addEventListener('click', e => {
    if (e.target.closest('[data-op-enviar]')) { opAbrirProposta(); return; }
    if (e.target.closest('[data-op-salvar]')) { opAlternarSalva(); return; }
    const foto = e.target.closest('[data-op-foto]');
    if (foto) {
      document.getElementById('op-foto-grande').src = foto.dataset.opFoto;
      document.getElementById('op-foto-modal').classList.add('show');
    }
  });
  document.getElementById('op-foto-modal').addEventListener('click', () => document.getElementById('op-foto-modal').classList.remove('show'));

  const modal = document.getElementById('op-proposta-modal');
  document.querySelectorAll('[data-op-proposta-fechar]').forEach(b => b.addEventListener('click', opFecharProposta));
  modal.addEventListener('click', e => { if (e.target === modal) opFecharProposta(); });
  document.addEventListener('keydown', e => {
    if (e.key !== 'Escape') return;
    if (modal.classList.contains('show')) opFecharProposta();
    else document.getElementById('op-foto-modal').classList.remove('show');
  });
  const valor = document.getElementById('op-valor');
  valor.addEventListener('input', () => {
    const d = valor.value.replace(/\D/g, '').slice(0, 11);
    valor.value = d ? opBRL(Number(d) / 100).replace(/ /g, ' ') : '';
    opAtualizarTotal();
  });
  document.getElementById('op-desconto').addEventListener('input', opAtualizarTotal);
  document.getElementById('op-produto').addEventListener('change', opAoEscolherProduto);
  document.getElementById('op-prop-continuar').addEventListener('click', () => { if (opEtapaValida(opEtapa)) opIrParaEtapa(opEtapa + 1); });
  document.getElementById('op-prop-voltar').addEventListener('click', () => opIrParaEtapa(Math.max(1, opEtapa - 1)));
  document.querySelectorAll('[data-op-etapa]').forEach(b => b.addEventListener('click', () => {
    const n = Number(b.dataset.opEtapa);
    if (n <= opEtapa || opEtapaValida(n - 1)) opIrParaEtapa(n);
  }));
  const inclui = document.getElementById('op-inclui');
  inclui.addEventListener('input', () => { document.getElementById('op-inclui-contador').textContent = `${inclui.value.length}/1000`; });
  document.getElementById('op-proposta-form').addEventListener('submit', opEnviarProposta);

  const tabela = document.getElementById('op-propostas-body');
  tabela.addEventListener('click', async e => {
    const menuBtn = e.target.closest('[data-op-menu]');
    if (menuBtn) {
      e.stopPropagation();
      const lista = tabela.querySelector(`[data-op-menu-lista="${menuBtn.dataset.opMenu}"]`);
      const abrir = lista.hidden;
      tabela.querySelectorAll('[data-op-menu-lista]').forEach(m => { m.hidden = true; });
      lista.hidden = !abrir;
      return;
    }
    const retirar = e.target.closest('[data-op-retirar]');
    if (retirar) { retirar.disabled = true; await opRetirar(retirar.dataset.opRetirar); }
  });
  document.addEventListener('click', () => tabela.querySelectorAll('[data-op-menu-lista]').forEach(m => { m.hidden = true; }));
}

/* Abas de Leads: Meus leads × Buscar eventos. O título da página segue a aba
   e o "Criar lead" só aparece em Meus leads. */
function leadsMostrarAba(aba) {
  document.body.classList.remove('op-pedido-aberto');
  const pagina = document.getElementById('op-pedido-pagina');
  if (pagina) pagina.hidden = true;
  const voltar = document.getElementById('op-pedido-voltar');
  if (voltar) voltar.hidden = true;
  document.querySelectorAll('[data-leads-aba]').forEach(b => b.classList.toggle('active', b.dataset.leadsAba === aba));
  document.querySelectorAll('[data-leads-painel]').forEach(p => { p.hidden = p.dataset.leadsPainel !== aba; });
  const busca = document.getElementById('op-header-acoes');
  if (busca) busca.hidden = aba !== 'eventos';
  const titulo = document.getElementById('leads-titulo-pagina');
  if (titulo) titulo.textContent = aba === 'eventos' ? 'Oportunidades' : (aba === 'propostas' ? 'Propostas enviadas' : 'Meus clientes');
  const acoes = document.getElementById('leads-acoes-topo');
  if (acoes) acoes.hidden = aba !== 'leads';
}

async function opTemProdutos() {
  const { count, error } = await supabaseClient.from('products').select('id', { count: 'exact', head: true }).eq('fornecedor_id', opEmpresaId);
  return !error && (count || 0) > 0;
}

async function initOportunidades() {
  const session = window.b2bSession || (await supabaseClient.auth.getSession()).data.session;
  if (!session) return;
  opEmpresaId = empresaId(session);
  document.querySelectorAll('[data-leads-aba]').forEach(b => b.addEventListener('click', () => leadsMostrarAba(b.dataset.leadsAba)));
  const abaPedida = new URLSearchParams(location.search).get('aba');
  if (abaPedida === 'eventos' || abaPedida === 'propostas' || abaPedida === 'leads') {
    leadsMostrarAba(abaPedida);
    history.replaceState(null, '', location.pathname);
  }

  // Sem produto cadastrado: só a mensagem para cadastrar um.
  // Sem produto cadastrado: Buscar eventos mostra só a mensagem para
  // cadastrar um (Minhas propostas continua funcionando).
  if (!(await opTemProdutos())) {
    document.getElementById('op-sem-produtos').hidden = false;
    document.getElementById('op-conteudo').hidden = true;
  }
  opLigarEventos();
  const [okPedidos] = await Promise.all([opCarregarPedidos(), opCarregarPropostas(), opCarregarCategoriasDaEmpresa(), opCarregarSalvos()]);
  if (!okPedidos) {
    const aviso = document.getElementById('op-aviso');
    aviso.hidden = false;
    aviso.textContent = 'Não foi possível carregar os pedidos agora.';
  }
  opPreencherFiltrosDeLocal();
  opRenderPedidos();
  opRenderPropostas();
  const pedidoNaUrl = new URLSearchParams(location.search).get('pedido');
  if (pedidoNaUrl) opAbrirDetalhe(pedidoNaUrl);
}

document.addEventListener('DOMContentLoaded', async () => {
  if (!(await window.b2bAuthReady)) return;
  initOportunidades();
});
