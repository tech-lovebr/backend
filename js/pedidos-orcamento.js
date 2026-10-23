// =============================================================================
// Pedidos de orçamento (RFP) — Fornecedores › Pedidos de orçamento
//
// O anfitrião descreve o que precisa em 4 etapas (o que, evento e logística,
// orçamento e detalhes, publicação). O pedido vai para a tabela
// pedidos_orcamento (migration 072) e aparece para os fornecedores no Hub,
// que mandam propostas pela Love. Telefone e WhatsApp nunca ficam expostos.
//
// Usa supabaseClient (js/supabase-init.js) e, do app.js,
// window.loveClienteSession / window.getLoveActiveEvent / getLoveActiveEventId.
// API: window.LovePedidos.mostrarLista() e window.LovePedidos.abrir().
// =============================================================================
(function () {
  'use strict';

  /**
   * @typedef {'fotografia'|'buffet'|'espaco'|'decoracao'|'musica'|'assessoria'|'bebidas'|'doces'} RfpCategory
   * @typedef {'economico'|'moderado'|'premium'|'exclusivo'} RfpBudgetTier
   * @typedef {string} RfpCelebracao  id da lista (casamento…) ou 'outro'
   * @typedef {'ate-50'|'50-100'|'100-200'|'200-mais'} RfpConvidados
   * @typedef {'diurno'|'noturno'|'horas'} RfpPeriodo
   *
   * @typedef {Object} RfpFormData
   * @property {string} titulo               o que a pessoa procura (etapa 1)
   * @property {RfpCategory|''} categoria
   * @property {string[]} especialidades
   * @property {RfpCelebracao|''} tipoCelebracao
   * @property {string} celebracaoOutro      texto quando tipoCelebracao = 'outro'
   * @property {string} dataEvento            AAAA-MM-DD ('' quando flexível)
   * @property {boolean} dataFlexivel
   * @property {string} cep
   * @property {string} cidade
   * @property {string} bairro
   * @property {string} uf
   * @property {RfpConvidados|''} convidados
   * @property {RfpPeriodo|''} periodo
   * @property {number|null} horasServico
   * @property {RfpBudgetTier|''} faixa       (antigo) faixa pronta
   * @property {number|null} valorMin        "De" (opcional)
   * @property {number|null} valorMax        "Até" (opcional)
   * @property {boolean} aceitaForaDaFaixa
   * @property {string} descricao
   * @property {File[]} referencias          fotos ainda não enviadas
   * @property {number|null} limitePropostas  null = sem limite
   */

  /** @type {{ id: RfpCategory, nome: string, icone: string, tags: string[] }[]} */
  const CATEGORIAS = [
    { id: 'fotografia', nome: 'Fotografia & Vídeo', icone: '<path d="M3 8.5A2.5 2.5 0 0 1 5.5 6h1.6l1.2-1.8A1.5 1.5 0 0 1 9.55 3.5h4.9a1.5 1.5 0 0 1 1.25.7L16.9 6h1.6A2.5 2.5 0 0 1 21 8.5v9a2.5 2.5 0 0 1-2.5 2.5h-13A2.5 2.5 0 0 1 3 17.5v-9Z"/><circle cx="12" cy="13" r="3.5"/>',
      tags: ['Ensaio pré-wedding', 'Ensaio de gestante', 'Cobertura completa', 'Cobertura da cerimônia', 'Making of', 'Fotos de família', 'Álbum impresso', 'Drone', 'Vídeo / filme', 'Teaser para redes sociais', 'Transmissão ao vivo', 'Cabine de fotos', 'Fotos instantâneas (polaroid)', 'Plataforma 360°', 'Ensaio pós-evento'] },
    { id: 'buffet', nome: 'Buffet & Gastronomia', icone: '<path d="M4 13h16M5 13a7 7 0 0 1 14 0M12 6V4M3 17h18"/>',
      tags: ['Coquetel', 'Jantar empratado', 'Jantar volante', 'Ilhas gastronômicas', 'Mesa de frios', 'Café da manhã', 'Brunch', 'Almoço', 'Churrasco', 'Feijoada', 'Comida de boteco', 'Massas e risotos', 'Comida japonesa', 'Food truck', 'Finger food', 'Estação de crepes', 'Pizza no local', 'Buffet infantil', 'Opções veganas', 'Opções sem glúten', 'Ceia da madrugada', 'Chef em casa'] },
    { id: 'espaco', nome: 'Espaço para Eventos', icone: '<path d="M3 21h18M5 21V10l7-5 7 5v11M9 21v-6h6v6"/>',
      tags: ['Ao ar livre', 'Salão fechado', 'Campo', 'Praia', 'Sítio / chácara', 'Fazenda', 'Vinícola', 'Rooftop', 'Casa de festas', 'Restaurante', 'Hotel', 'Igreja / capela', 'Galpão / industrial', 'Jardim', 'Beira de lago', 'Serra / montanha', 'Com hospedagem', 'Com estacionamento', 'Cerimônia no local', 'Acessibilidade', 'Espaço kids'] },
    { id: 'decoracao', nome: 'Decoração & Cenografia', icone: '<path d="M12 21v-7M12 14c-3 0-5-2-5-5 2 0 3.5.8 5 2.5C13.5 9.8 15 9 17 9c0 3-2 5-5 5ZM12 8.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z"/>',
      tags: ['Flores naturais', 'Flores permanentes', 'Decoração da cerimônia', 'Decoração da recepção', 'Arco de flores', 'Mesa posta', 'Centro de mesa', 'Mesa de doces', 'Painel / backdrop', 'Arco de balões', 'Iluminação cênica', 'Varal de luzes', 'Mobiliário', 'Tapetes e lounge', 'Tendas', 'Decoração rústica', 'Decoração boho', 'Decoração clássica', 'Decoração temática infantil', 'Letreiro neon', 'Lembrancinhas'] },
    { id: 'musica', nome: 'Música, Banda & DJ', icone: '<path d="M9 18V5l11-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="17" cy="16" r="3"/>',
      tags: ['DJ', 'Banda ao vivo', 'Banda de sertanejo', 'Samba e pagode', 'Rock e pop', 'MPB e bossa nova', 'Forró', 'Música eletrônica', 'Voz e violão', 'Quarteto de cordas', 'Violino na cerimônia', 'Saxofonista', 'Coral', 'Música na cerimônia', 'Som e iluminação', 'Telão e projeção', 'Pista de dança', 'Fumaça e efeitos', 'Animação infantil', 'Mestre de cerimônias'] },
    { id: 'assessoria', nome: 'Assessoria & Cerimonial', icone: '<path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v0a2 2 0 0 1-2 2h-2a2 2 0 0 1-2-2ZM9 13l2 2 4-4"/>',
      tags: ['Assessoria completa', 'Assessoria do dia', 'Assessoria parcial', 'Cerimonialista', 'Celebrante', 'Roteiro e cronograma', 'Gestão de fornecedores', 'Recepcionistas', 'Lista de convidados e RSVP', 'Destination wedding', 'Planejamento de orçamento', 'Seguranças', 'Manobristas', 'Equipe de limpeza'] },
    { id: 'bebidas', nome: 'Bebidas & Bar', icone: '<path d="M8 3h8l-1 8a3 3 0 0 1-6 0L8 3ZM12 14v7M8 21h8"/>',
      tags: ['Open bar', 'Drinks autorais', 'Bartender', 'Bar de caipirinhas', 'Gin bar', 'Cervejas especiais', 'Chopp', 'Vinhos e espumantes', 'Whisky bar', 'Drinks sem álcool', 'Sucos naturais', 'Café e espresso', 'Bar de chás', 'Brinde com espumante', 'Gelo e refrigeração', 'Taças e copos'] },
    { id: 'doces', nome: 'Doces & Bolo', icone: '<path d="M4 21h16M5 21v-6h14v6M7 15v-3h10v3M12 12V8M12 8c-1 0-1.5-1-1-2l1-2 1 2c.5 1 0 2-1 2Z"/>',
      tags: ['Bolo de casamento', 'Bolo de aniversário', 'Bolo cenográfico', 'Naked cake', 'Bolo de andares', 'Bem-casados', 'Doces finos', 'Brigadeiros gourmet', 'Mesa de doces', 'Cupcakes', 'Macarons', 'Pão de mel', 'Bolo no pote', 'Doces temáticos', 'Sem açúcar / sem glúten', 'Carrinho de sorvete', 'Churros', 'Algodão-doce e pipoca', 'Lembrancinhas'] }
  ];

  /** @type {{ id: RfpCelebracao, nome: string }[]} */
  const CELEBRACOES = [
    { id: 'casamento', nome: 'Casamento' }, { id: 'aniversario', nome: 'Aniversário' },
    { id: 'bodas', nome: 'Bodas' }, { id: 'noivado', nome: 'Noivado' },
    { id: 'formatura', nome: 'Formatura' }, { id: 'corporativo', nome: 'Evento corporativo' },
    { id: 'chá de bebê', nome: 'Chá de bebê' }, { id: 'chá revelação', nome: 'Chá revelação' },
    { id: 'chá de panela', nome: 'Chá de panela' }, { id: 'outro', nome: 'Outro' }
  ];

  // Palavras do título que já escolhem a categoria (sem acento, minúsculas).
  /** @type {[RfpCategory, RegExp][]} */
  const PALAVRAS_DA_CATEGORIA = [
    ['espaco', /\b(espaco|sitio|chacara|salao|saloes|lugar|local|fazenda|casa de festas?|galpao|rooftop|area de lazer)\b/],
    ['musica', /\b(banda|dj|musica|musico|cantor|cantora|som|violao|violino|violinista|orquestra|saxofonista|pagode|samba|musical)\b/],
    ['fotografia', /\b(foto|fotos|fotografo|fotografa|fotografia|video|videos|filmagem|filmar|cinegrafista|drone)\b/],
    ['buffet', /\b(buffet|bufe|comida|jantar|almoco|gastronomia|churrasco|coquetel|salgados?|cardapio|chef|finger food)\b/],
    ['decoracao', /\b(decoracao|decorador|decoradora|decorar|flores|florista|cenografia|arranjos?|baloes)\b/],
    ['assessoria', /\b(assessoria|assessor|assessora|cerimonial|cerimonialista|organizador|organizadora|wedding planner|planner)\b/],
    ['bebidas', /\b(bebidas?|bar|bartender|drinks?|open bar|cervejas?|chopp|chope|vinhos?|espumantes?)\b/],
    ['doces', /\b(doces?|bolo|bolos|brigadeiros?|bem casados?|bem-casados?|confeitaria|confeiteira|confeiteiro|sobremesas?)\b/]
  ];

  /** Categoria pelo título (a palavra que aparece primeiro); '' se nenhuma. @param {string} titulo @returns {RfpCategory|''} */
  function categoriaPeloTitulo(titulo) {
    const t = String(titulo || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    let melhor = /** @type {RfpCategory|''} */ ('');
    let pos = Infinity;
    for (const [id, re] of PALAVRAS_DA_CATEGORIA) {
      const m = re.exec(t);
      if (m && m.index < pos) { pos = m.index; melhor = id; }
    }
    return melhor;
  }

  /** Nome da celebração (texto livre quando é "Outro"). @param {string} id */
  const nomeDaCelebracao = (id) => nomeDe(CELEBRACOES, id) || String(id || '');

  /** @type {{ id: RfpConvidados, nome: string }[]} */
  const CONVIDADOS = [
    { id: 'ate-50', nome: 'Até 50' }, { id: '50-100', nome: '50 a 100' },
    { id: '100-200', nome: '100 a 200' }, { id: '200-mais', nome: '200+' }
  ];

  /** @type {{ id: RfpPeriodo, nome: string }[]} */
  const PERIODOS = [
    { id: 'diurno', nome: 'Diurno' }, { id: 'noturno', nome: 'Noturno' }, { id: 'horas', nome: 'Por horas de serviço' }
  ];

  /** @type {{ id: RfpBudgetTier, nome: string, faixa: string, min: number, max: number|null }[]} */
  const FAIXAS = [
    { id: 'economico', nome: 'Econômico', faixa: 'até R$ 2.500', min: 0, max: 2500 },
    { id: 'moderado', nome: 'Moderado', faixa: 'R$ 2.500 a R$ 6.000', min: 2500, max: 6000 },
    { id: 'premium', nome: 'Premium', faixa: 'R$ 6.000 a R$ 12.000', min: 6000, max: 12000 },
    { id: 'exclusivo', nome: 'Exclusivo', faixa: 'acima de R$ 12.000', min: 12000, max: null }
  ];

  // Foto de cada categoria (assets/rfp/<id>.jpg). Sem o arquivo, o card mostra o ícone.
  /** @param {RfpCategory} id */
  const fotoDaCategoria = (id) => `/assets/rfp/${id}.jpg`;

  // Estados do Brasil (drop-down de UF na etapa 2).
  const UFS = ['AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'];

  const LIMITES = [{ valor: 3, nome: 'Até 3 propostas' }, { valor: 5, nome: 'Até 5 propostas' }, { valor: null, nome: 'Sem limite' }];
  const ETAPAS = ['Tipo de serviço', 'Evento e logística', 'Orçamento e detalhes', 'Publicação'];
  // Título grande e subtítulo de cada etapa (à esquerda da caixa, como em Adicionar novo produto do Hub).
  const TEXTOS_DAS_ETAPAS = [
    { titulo: 'Encontre um fornecedor perfeito para o seu evento', sub: '' },
    { titulo: 'Conte sobre o seu evento', sub: 'Tipo de celebração, data, local, número de convidados e horário.' },
    { titulo: 'Descreva o que você precisa e o orçamento', sub: 'Conte os detalhes do que você precisa e informe quanto planeja gastar para receber propostas realistas dos fornecedores.' },
    { titulo: 'Revise e publique', sub: 'Escolha quantas propostas quer receber e veja como os fornecedores vão ver o seu pedido.' }
  ];
  const TITULO_DA_LISTA = 'Solicitações de orçamento';
  const TITULO_DA_NOVA = 'Nova solicitação de orçamento';
  const DESCRICAO_MIN = 50;
  const DESCRICAO_MAX = 1000;
  const MAX_FOTOS = 5;
  const MAX_FOTO_BYTES = 5 * 1024 * 1024;
  const SITUACOES = { aberto: 'Aberto', fechado: 'Encerrado', cancelado: 'Cancelado' };

  const ICONE_FECHAR = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg>';
  const ICONE_CADEADO = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></svg>';
  const ICONE_FOTO = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="m21 16-5-5-9 9"/></svg>';
  const ICONE_MAIS = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>';

  /** @param {unknown} v */
  const esc = (v) => String(v == null ? '' : v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  /** @param {RfpCategory|string} id */
  const categoriaPorId = (id) => CATEGORIAS.find(c => c.id === id) || null;
  /** @param {string} id */
  const nomeDe = (lista, id) => ((lista.find(/** @param {any} x */ x => x.id === id) || {}).nome) || '';

  // --------------------------------------------------------------------------
  // Estado do assistente
  // --------------------------------------------------------------------------

  /** @type {RfpFormData} */
  let dados = rascunhoVazio();
  let etapa = 1;
  let categoriaAberta = false; // drop-down de Categoria (etapa 1) aberto
  let categoriaEscolhidaAMao = false; // escolheu no drop-down: o título não troca mais
  /** @type {Record<string, string>} */
  let erros = {};
  let publicando = false;
  /** @type {string[]} */
  let previas = [];

  /** @returns {RfpFormData} */
  function rascunhoVazio() {
    return {
      titulo: '', categoria: '', especialidades: [], tipoCelebracao: '', celebracaoOutro: '', dataEvento: '', dataFlexivel: false,
      cep: '', cidade: '', bairro: '', uf: '', convidados: '', periodo: '', horasServico: null,
      faixa: '', valorMin: null, valorMax: null, aceitaForaDaFaixa: false, descricao: '', referencias: [], limitePropostas: 5
    };
  }

  // Começa com o que o evento ativo já sabe (tipo, data e cidade).
  function preencherComOEvento() {
    const evento = typeof window.getLoveActiveEvent === 'function' ? window.getLoveActiveEvent() : null;
    if (!evento) return;
    /** @type {Record<string, RfpCelebracao>} */
    const porTipo = { wedding: 'casamento', birthday: 'aniversario', anniversary: 'bodas' };
    if (porTipo[evento.type]) dados.tipoCelebracao = porTipo[evento.type];
    const det = evento.eventDetails || {};
    const data = det.date || evento.date || '';
    if (/^\d{4}-\d{2}-\d{2}$/.test(data)) dados.dataEvento = data;
    if (det.city) dados.cidade = String(det.city);
    if (det.state) dados.uf = String(det.state).slice(0, 2).toUpperCase();
  }

  // --------------------------------------------------------------------------
  // Validação (por etapa — não deixa avançar com obrigatório vazio)
  // --------------------------------------------------------------------------

  /** @param {number} n @returns {Record<string, string>} */
  function validarEtapa(n) {
    /** @type {Record<string, string>} */
    const e = {};
    if (n === 1 && dados.titulo.trim().length < 3) e.titulo = 'Escreva o que você está procurando.';
    if (n === 1 && !dados.categoria) e.categoria = 'Escolha a categoria do serviço.';
    if (n === 2) {
      if (!dados.tipoCelebracao) e.tipoCelebracao = 'Escolha o tipo de celebração.';
      else if (dados.tipoCelebracao === 'outro' && !dados.celebracaoOutro.trim()) e.celebracaoOutro = 'Escreva o tipo de celebração.';
      if (!dados.dataFlexivel && !dados.dataEvento) e.dataEvento = 'Informe a data ou marque "Data flexível".';
      if (!dados.dataFlexivel && dados.dataEvento && dados.dataEvento < hojeIso()) e.dataEvento = 'A data precisa ser hoje ou depois.';
      if (!dados.cidade.trim()) e.cidade = 'Informe a cidade.';
      if (!UFS.includes(dados.uf.trim().toUpperCase())) e.uf = 'Escolha o estado.';
      if (!dados.convidados) e.convidados = 'Escolha a quantidade de convidados.';
      if (!dados.periodo) e.periodo = 'Escolha o período.';
      if (dados.periodo === 'horas' && !(Number(dados.horasServico) >= 1 && Number(dados.horasServico) <= 24)) e.horasServico = 'De 1 a 24 horas.';
    }
    if (n === 3) {
      if (dados.valorMin != null && dados.valorMax != null && dados.valorMax < dados.valorMin) e.faixa = 'O valor "até" precisa ser maior que o "de".';
      const tam = dados.descricao.trim().length;
      if (tam < DESCRICAO_MIN) e.descricao = `Escreva pelo menos ${DESCRICAO_MIN} caracteres (faltam ${DESCRICAO_MIN - tam}).`;
      if (tam > DESCRICAO_MAX) e.descricao = `No máximo ${DESCRICAO_MAX} caracteres.`;
    }
    return e;
  }

  function hojeIso() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  /** @param {string} campo */
  const erroHtml = (campo) => erros[campo] ? `<p class="rfp-erro" role="alert">${esc(erros[campo])}</p>` : '';

  // --------------------------------------------------------------------------
  // Modal (montado uma vez e reaproveitado)
  // --------------------------------------------------------------------------

  /** @returns {HTMLElement|null} */
  function modal() {
    const m = document.getElementById('rfp-editor');
    if (!m) return null;
    if (m.dataset.montado) return m;
    m.dataset.montado = '1';
    m.innerHTML = `
      <div class="rfp-intro">
        <h3 class="rfp-etapa-titulo" id="rfp-etapa-titulo" aria-live="polite"></h3>
        <p class="rfp-etapa-sub" id="rfp-etapa-sub"></p>
        <div class="rfp-exemplos" id="rfp-exemplos" hidden>
          <p class="rfp-exemplos-titulo">Exemplos de título</p>
          <ul>
            <li>Sítio arborizado para casamento ao ar livre com 150 convidados</li>
            <li>Bolo de aniversário de 3 andares com tema floral</li>
            <li>Banda de música sertaneja para festa de aniversário de 40 anos</li>
          </ul>
        </div>
      </div>
      <div class="rfp-coluna">
        <div class="rfp-caixa-form">
          <div class="rfp-corpo" id="rfp-corpo"></div>
        </div>
        <footer class="rfp-rodape">
          <p class="rfp-erro-geral hidden" id="rfp-erro-geral" role="alert"></p>
          <button type="button" class="rfp-voltar-texto" data-rfp-voltar>Cancelar</button>
          <button type="button" class="btn-primary rfp-btn" data-rfp-avancar>Continuar</button>
        </footer>
      </div>`;

    m.addEventListener('click', (e) => {
      const alvo = /** @type {HTMLElement} */ (e.target);
      if (alvo.closest('[data-rfp-voltar]')) return etapa === 1 ? sair() : irPara(etapa - 1, -1);
      if (alvo.closest('[data-rfp-avancar]')) return avancar();
      if (alvo.closest('[data-rfp-cat-gatilho]')) { categoriaAberta = !categoriaAberta; return desenhar(0); }
      const opcao = /** @type {HTMLElement|null} */ (alvo.closest('[data-rfp-campo]'));
      if (opcao && opcao.dataset.rfpValor !== undefined) return escolher(opcao.dataset.rfpCampo || '', opcao.dataset.rfpValor || '');
      const tag = /** @type {HTMLElement|null} */ (alvo.closest('[data-rfp-tag]'));
      if (tag) return alternarTag(tag.dataset.rfpTag || '');
      const tirar = /** @type {HTMLElement|null} */ (alvo.closest('[data-rfp-tirar-foto]'));
      if (tirar) return tirarFoto(Number(tirar.dataset.rfpTirarFoto));
    });
    document.addEventListener('click', (e) => {
      if (!categoriaAberta) return;
      if (/** @type {HTMLElement} */ (e.target).closest('.rfp-cat-select')) return;
      categoriaAberta = false; desenhar(0);
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && categoriaAberta) { categoriaAberta = false; desenhar(0); }
    });
    m.addEventListener('input', aoDigitar);
    m.addEventListener('change', aoDigitar);
    return m;
  }

  /** Cabeçalho: na nova solicitação, setinha + "Nova solicitação de orçamento". @param {boolean} aberta */
  function cabecalho(aberta) {
    const titulo = document.getElementById('b2b-toolbar-title');
    const voltar = document.getElementById('btn-rfp-voltar');
    const criar = document.getElementById('btn-rfp-novo');
    const pedidosAberto = !!document.getElementById('b2b-pedidos-view') && !document.getElementById('b2b-pedidos-view')?.classList.contains('hidden');
    if (titulo && pedidosAberto) titulo.textContent = aberta ? TITULO_DA_NOVA : TITULO_DA_LISTA;
    if (voltar) voltar.hidden = !aberta;
    if (criar && pedidosAberto) criar.classList.toggle('hidden', aberta);
  }

  function abrir() {
    dados = rascunhoVazio();
    preencherComOEvento();
    etapa = 1;
    erros = {};
    publicando = false;
    categoriaEscolhidaAMao = false;
    previas.forEach(u => URL.revokeObjectURL(u));
    previas = [];
    const m = modal();
    if (!m) return;
    m.hidden = false;
    document.body.classList.add('rfp-editor-aberto');
    cabecalho(true);
    desenhar(0);
    window.scrollTo({ top: 0 });
  }

  /** Sai da nova solicitação para Contratos › Solicitações (app.js escuta). */
  function sair() {
    if (publicando) return;
    fechar();
    window.dispatchEvent(new CustomEvent('love:rfp-sair'));
  }

  function fechar() {
    if (publicando) return;
    const m = document.getElementById('rfp-editor');
    if (m) m.hidden = true;
    document.body.classList.remove('rfp-editor-aberto');
    cabecalho(false);
  }

  /** @param {number} n @param {number} direcao */
  function irPara(n, direcao) {
    if (n < 1 || n > ETAPAS.length) return;
    etapa = n;
    erros = {};
    desenhar(direcao);
  }

  function avancar() {
    erros = validarEtapa(etapa);
    if (Object.keys(erros).length) { desenhar(0); focarPrimeiroErro(); return; }
    if (etapa < ETAPAS.length) return irPara(etapa + 1, 1);
    publicar();
  }

  function focarPrimeiroErro() {
    const el = document.querySelector('#rfp-corpo .rfp-erro');
    if (el) el.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }

  // --------------------------------------------------------------------------
  // Desenho das etapas
  // --------------------------------------------------------------------------

  /** @param {number} direcao  1 = avançou, -1 = voltou, 0 = só redesenho */
  function desenhar(direcao) {
    const textos = TEXTOS_DAS_ETAPAS[etapa - 1];
    const titulo = document.getElementById('rfp-etapa-titulo');
    const sub = document.getElementById('rfp-etapa-sub');
    if (titulo) titulo.textContent = textos.titulo;
    if (sub) { sub.textContent = textos.sub; sub.hidden = !textos.sub; }
    const exemplos = document.getElementById('rfp-exemplos');
    if (exemplos) exemplos.hidden = etapa !== 1;

    const corpo = document.getElementById('rfp-corpo');
    if (corpo) {
      const telas = [htmlEtapa1, htmlEtapa2, htmlEtapa3, htmlEtapa4];
      corpo.innerHTML = `<div class="rfp-tela${direcao > 0 ? ' entra-direita' : direcao < 0 ? ' entra-esquerda' : ''}">${telas[etapa - 1]()}</div>`;
      if (direcao) corpo.scrollTop = 0;
    }
    const voltar = /** @type {HTMLButtonElement|null} */ (document.querySelector('#rfp-editor [data-rfp-voltar]'));
    const avancarBtn = /** @type {HTMLButtonElement|null} */ (document.querySelector('#rfp-editor [data-rfp-avancar]'));
    if (voltar) voltar.textContent = etapa === 1 ? 'Cancelar' : 'Voltar';
    if (avancarBtn) {
      avancarBtn.textContent = publicando ? 'Publicando…' : (etapa === ETAPAS.length ? 'Publicar solicitação' : 'Continuar');
      avancarBtn.disabled = publicando;
    }
  }

  /**
   * Grupo de opções de escolha única (pílulas).
   * @param {string} campo @param {{ id: string, nome: string }[]} lista @param {string} atual
   */
  const pilulas = (campo, lista, atual) => `
    <div class="rfp-pilulas" role="radiogroup">
      ${lista.map(o => `<button type="button" class="rfp-pilula${o.id === atual ? ' ativa' : ''}" role="radio" aria-checked="${o.id === atual}" data-rfp-campo="${campo}" data-rfp-valor="${esc(o.id)}">${esc(o.nome)}</button>`).join('')}
    </div>`;

  function htmlEtapa1() {
    const cat = categoriaPorId(dados.categoria);
    return `
      <label class="rfp-cat-rotulo" for="rfp-titulo">Título</label>
      <input type="text" id="rfp-titulo" class="rfp-campo rfp-campo-titulo" data-rfp-input="titulo" value="${esc(dados.titulo)}" maxlength="120" autocomplete="off">
      ${erroHtml('titulo')}
      <label class="rfp-cat-rotulo rfp-cat-rotulo-categoria">Categoria</label>
      <div class="rfp-cat-select${categoriaAberta ? ' is-open' : ''}">
        <button type="button" class="rfp-cat-gatilho" data-rfp-cat-gatilho aria-haspopup="listbox" aria-expanded="${categoriaAberta}">
          <span class="${cat ? '' : 'rfp-cat-vazio'}">${esc(cat ? cat.nome : 'Selecione a categoria...')}</span>
          <svg class="rfp-cat-seta" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="m6 9 6 6 6-6"/></svg>
        </button>
        ${categoriaAberta ? `
          <div class="rfp-cat-painel" role="listbox">
            ${CATEGORIAS.map(c => `<button type="button" class="rfp-cat-opcao${c.id === dados.categoria ? ' ativa' : ''}" role="option" aria-selected="${c.id === dados.categoria}" data-rfp-campo="categoria" data-rfp-valor="${c.id}">${esc(c.nome)}</button>`).join('')}
          </div>` : ''}
      </div>
      ${erroHtml('categoria')}
      ${cat ? `
        <h4 class="rfp-pergunta">Subcategorias <span class="rfp-opcional">(opcional)</span></h4>
        <div class="rfp-tags">
          ${cat.tags.map(t => `<button type="button" class="rfp-tag${dados.especialidades.includes(t) ? ' ativa' : ''}" aria-pressed="${dados.especialidades.includes(t)}" data-rfp-tag="${esc(t)}">${esc(t)}</button>`).join('')}
        </div>` : ''}`;
  }

  function htmlEtapa2() {
    return `
      <h4 class="rfp-pergunta">Tipo de celebração</h4>
      ${pilulas('tipoCelebracao', CELEBRACOES, dados.tipoCelebracao)}
      ${erroHtml('tipoCelebracao')}
      ${dados.tipoCelebracao === 'outro' ? `
        <input type="text" class="rfp-campo rfp-campo-outro" data-rfp-input="celebracaoOutro" value="${esc(dados.celebracaoOutro)}" maxlength="60" placeholder="Qual é a celebração?" aria-label="Tipo de celebração">
        ${erroHtml('celebracaoOutro')}` : ''}

      <h4 class="rfp-pergunta">Data do evento</h4>
      <div class="rfp-linha">
        <input type="date" class="rfp-campo" data-rfp-input="dataEvento" value="${esc(dados.dataEvento)}" min="${hojeIso()}" ${dados.dataFlexivel ? 'disabled' : ''} aria-label="Data do evento">
        <label class="rfp-check"><input type="checkbox" data-rfp-input="dataFlexivel" ${dados.dataFlexivel ? 'checked' : ''}> Data flexível / em definição</label>
      </div>
      ${erroHtml('dataEvento')}

      <h4 class="rfp-pergunta">Local</h4>
      <div class="rfp-grade-local">
        <label class="rfp-rotulo"><span class="rfp-rotulo-texto">CEP <span class="rfp-opcional">(opcional)</span></span>
          <input type="text" class="rfp-campo" data-rfp-input="cep" value="${esc(dados.cep)}" inputmode="numeric" maxlength="9" placeholder="00000-000">
          <span class="rfp-dica" id="rfp-cep-status"></span>
        </label>
        <label class="rfp-rotulo rfp-rotulo-uf"><span class="rfp-rotulo-texto">UF</span>
          <select class="rfp-campo rfp-campo-uf" data-rfp-input="uf" aria-label="Estado (UF)">
            <option value=""${dados.uf ? '' : ' selected'}>UF</option>
            ${UFS.map(u => `<option value="${u}"${dados.uf === u ? ' selected' : ''}>${u}</option>`).join('')}
          </select>
          ${erroHtml('uf')}
        </label>
        <label class="rfp-rotulo"><span class="rfp-rotulo-texto">Cidade</span>
          <input type="text" class="rfp-campo" data-rfp-input="cidade" value="${esc(dados.cidade)}" placeholder="Ex.: São Paulo">
          ${erroHtml('cidade')}
        </label>
      </div>

      <h4 class="rfp-pergunta">Número estimado de convidados</h4>
      ${pilulas('convidados', CONVIDADOS, dados.convidados)}
      ${erroHtml('convidados')}

      <h4 class="rfp-pergunta">Horário / duração</h4>
      ${pilulas('periodo', PERIODOS, dados.periodo)}
      ${dados.periodo === 'horas' ? `
        <label class="rfp-rotulo rfp-horas">Horas de serviço
          <span class="rfp-horas-campo">
            <input type="number" class="rfp-campo" data-rfp-input="horasServico" min="1" max="24" value="${dados.horasServico ?? ''}">
            <span class="rfp-horas-sufixo" id="rfp-horas-sufixo">${textoDeHoras(dados.horasServico)}</span>
          </span>
        </label>${erroHtml('horasServico')}` : ''}
      ${erroHtml('periodo')}`;
  }

  function htmlEtapa3() {
    const tam = dados.descricao.trim().length;
    return `
      <h4 class="rfp-pergunta">Faixa de orçamento prevista <span class="rfp-opcional">(opcional)</span></h4>
      <div class="rfp-orcamento">
        <label class="rfp-rotulo"><span class="rfp-rotulo-texto">De</span>
          <span class="rfp-moeda"><span>R$</span><input type="text" class="rfp-campo" data-rfp-input="valorMin" inputmode="numeric" value="${dados.valorMin != null ? milhar(dados.valorMin) : ''}" aria-label="Orçamento de"></span>
        </label>
        <label class="rfp-rotulo"><span class="rfp-rotulo-texto">Até</span>
          <span class="rfp-moeda"><span>R$</span><input type="text" class="rfp-campo" data-rfp-input="valorMax" inputmode="numeric" value="${dados.valorMax != null ? milhar(dados.valorMax) : ''}" aria-label="Orçamento até"></span>
        </label>
      </div>
      ${erroHtml('faixa')}
      <label class="rfp-toggle">
        <span>Aceito propostas fora dessa faixa de preço</span>
        <span class="settings-switch"><input type="checkbox" data-rfp-input="aceitaForaDaFaixa" ${dados.aceitaForaDaFaixa ? 'checked' : ''}><span class="settings-switch-track"></span></span>
      </label>

      <h4 class="rfp-pergunta">Descreva o que você precisa</h4>
      <textarea class="rfp-campo rfp-descricao" data-rfp-input="descricao" maxlength="${DESCRICAO_MAX}" rows="6" placeholder="Conte o estilo, referências e detalhes importantes. Ex.: cobertura da cerimônia e festa, fotos espontâneas, entrega em 30 dias…">${esc(dados.descricao)}</textarea>
      <p class="rfp-contador${tam > 0 && tam < DESCRICAO_MIN ? ' falta' : ''}" id="rfp-contador">${tam}/${DESCRICAO_MAX} · mínimo ${DESCRICAO_MIN}</p>
      ${erroHtml('descricao')}

      <h4 class="rfp-pergunta">Fotos de referência <span class="rfp-opcional">(opcional, até ${MAX_FOTOS})</span></h4>
      <div class="rfp-fotos">
        ${previas.map((u, i) => `
          <div class="rfp-foto"><img src="${u}" alt="Referência ${i + 1}"><button type="button" data-rfp-tirar-foto="${i}" aria-label="Remover foto">${ICONE_FECHAR}</button></div>`).join('')}
        ${dados.referencias.length < MAX_FOTOS ? `
          <label class="rfp-dropzone" id="rfp-dropzone">
            ${ICONE_FOTO}<span>Arraste ou clique para adicionar</span>
            <input type="file" accept="image/jpeg,image/png,image/webp" multiple data-rfp-fotos hidden>
          </label>` : ''}
      </div>
      ${erroHtml('fotos')}`;
  }

  function htmlEtapa4() {
    return `
      <h4 class="rfp-pergunta">Quantas propostas você quer receber?</h4>
      <div class="rfp-pilulas" role="radiogroup">
        ${LIMITES.map(l => `<button type="button" class="rfp-pilula${l.valor === dados.limitePropostas ? ' ativa' : ''}" role="radio" aria-checked="${l.valor === dados.limitePropostas}" data-rfp-campo="limitePropostas" data-rfp-valor="${l.valor === null ? '' : l.valor}">${esc(l.nome)}</button>`).join('')}
      </div>
      <p class="rfp-dica">O pedido fecha sozinho quando chegar ao limite.</p>

      <div class="rfp-aviso">
        ${ICONE_CADEADO}
        <p>Seu telefone e WhatsApp <b>não são mostrados</b> aos fornecedores. As propostas, a conversa e o fechamento acontecem com segurança dentro da Love.</p>
      </div>

      <h4 class="rfp-pergunta">Como os fornecedores vão ver seu pedido</h4>
      ${cardDoFeed()}`;
  }

  // Prévia do card da oportunidade no feed dos fornecedores.
  function cardDoFeed() {
    const cat = categoriaPorId(dados.categoria);
    const quando = dados.dataFlexivel || !dados.dataEvento ? 'Data flexível' : formatarData(dados.dataEvento);
    const local = [dados.bairro, dados.cidade].filter(s => s && s.trim()).join(', ') + (dados.uf ? ` - ${dados.uf.toUpperCase()}` : '');
    const periodo = dados.periodo === 'horas' ? `${dados.horasServico || '?'}h de serviço` : nomeDe(PERIODOS, dados.periodo);
    const desc = dados.descricao.trim();
    return `
      <article class="rfp-feed-card">
        <div class="rfp-feed-topo">
          <span class="rfp-feed-categoria">${esc(cat ? cat.nome : '')}</span>
          <span class="rfp-feed-novo">Novo</span>
        </div>
        <h5>${esc(dados.titulo.trim() || `${cat ? cat.nome : 'Serviço'} para ${celebracaoDoRascunho().toLowerCase() || 'evento'}`)}</h5>
        <ul class="rfp-feed-meta">
          <li>${esc(quando)}</li><li>${esc(local)}</li>
          <li>${esc(nomeDe(CONVIDADOS, dados.convidados))} convidados</li><li>${esc(periodo)}</li>
        </ul>
        <p class="rfp-feed-faixa">${esc(textoDoOrcamento(dados.valorMin, dados.valorMax))}${dados.aceitaForaDaFaixa && (dados.valorMin || dados.valorMax) ? ' · aceita fora da faixa' : ''}</p>
        ${dados.especialidades.length ? `<div class="rfp-feed-tags">${dados.especialidades.map(t => `<span>${esc(t)}</span>`).join('')}</div>` : ''}
        <p class="rfp-feed-desc">${esc(desc.length > 220 ? desc.slice(0, 220) + '…' : desc)}</p>
        <p class="rfp-feed-rodape">${dados.referencias.length ? `${dados.referencias.length} foto(s) de referência · ` : ''}${dados.limitePropostas ? `Até ${dados.limitePropostas} propostas` : 'Propostas sem limite'}</p>
      </article>`;
  }

  /** Celebração do rascunho como vai para o banco ("Outro" vira o texto digitado). */
  function celebracaoDoRascunho() {
    return dados.tipoCelebracao === 'outro' ? dados.celebracaoOutro.trim() : nomeDaCelebracao(dados.tipoCelebracao);
  }

  /** 2500 → "2.500". @param {number} n */
  const milhar = (n) => Number(n).toLocaleString('pt-BR', { maximumFractionDigits: 0 });

  /**
   * Orçamento em texto: "R$ 2.000 a R$ 5.000", "a partir de…", "até…";
   * pedidos antigos usam a faixa pronta (Econômico, Moderado…).
   * @param {number|null|undefined} min @param {number|null|undefined} max @param {string} [faixaAntiga]
   */
  function textoDoOrcamento(min, max, faixaAntiga) {
    const temMin = min != null && Number(min) > 0;
    const temMax = max != null && Number(max) > 0;
    const antiga = FAIXAS.find(f => f.id === faixaAntiga);
    if (antiga) return `${antiga.nome} · ${antiga.faixa}`;
    if (temMin && temMax) return `R$ ${milhar(Number(min))} a R$ ${milhar(Number(max))}`;
    if (temMin) return `A partir de R$ ${milhar(Number(min))}`;
    if (temMax) return `Até R$ ${milhar(Number(max))}`;
    return 'A combinar';
  }

  /** "1 hora" / "horas" ao lado do número (vazio sem número). @param {number|null} n */
  const textoDeHoras = (n) => (n ? (Number(n) === 1 ? 'hora' : 'horas') : '');

  /** @param {string} iso */
  function formatarData(iso) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(iso || '')) return '';
    const [a, m, d] = iso.split('-').map(Number);
    return new Date(a, m - 1, d).toLocaleDateString('pt-BR', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  // --------------------------------------------------------------------------
  // Interações
  // --------------------------------------------------------------------------

  /** @param {string} campo @param {string} valor */
  function escolher(campo, valor) {
    const d = /** @type {any} */ (dados);
    if (campo === 'limitePropostas') d.limitePropostas = valor === '' ? null : Number(valor);
    else d[campo] = valor;
    if (campo === 'categoria') { dados.especialidades = []; categoriaAberta = false; categoriaEscolhidaAMao = true; }
    if (campo === 'periodo' && valor !== 'horas') dados.horasServico = null;
    delete erros[campo];
    desenhar(0);
  }

  /** @param {string} tag */
  function alternarTag(tag) {
    const i = dados.especialidades.indexOf(tag);
    if (i >= 0) dados.especialidades.splice(i, 1); else dados.especialidades.push(tag);
    desenhar(0);
  }

  /** @param {Event} e */
  function aoDigitar(e) {
    const el = /** @type {HTMLInputElement} */ (e.target);
    if (el.matches('[data-rfp-fotos]')) { if (e.type === 'change') adicionarFotos(Array.from(el.files || [])); return; }
    const campo = el.dataset ? el.dataset.rfpInput : '';
    if (!campo) return;
    const d = /** @type {any} */ (dados);
    if (el.type === 'checkbox') {
      d[campo] = el.checked;
      if (campo === 'dataFlexivel') { if (el.checked) dados.dataEvento = ''; delete erros.dataEvento; desenhar(0); }
      return;
    }
    if (campo === 'valorMin' || campo === 'valorMax') {
      const num = el.value.replace(/\D/g, '').slice(0, 9);
      d[campo] = num ? Number(num) : null;
      el.value = num ? milhar(Number(num)) : '';
      if (erros.faixa) delete erros.faixa;
      return;
    }
    if (campo === 'horasServico') {
      dados.horasServico = el.value ? Number(el.value) : null;
      const sufixo = document.getElementById('rfp-horas-sufixo');
      if (sufixo) sufixo.textContent = textoDeHoras(dados.horasServico);
      return;
    }
    if (campo === 'uf') el.value = el.value.replace(/[^a-zA-Z]/g, '').toUpperCase();
    if (campo === 'cep') {
      const num = el.value.replace(/\D/g, '').slice(0, 8);
      el.value = num.length > 5 ? `${num.slice(0, 5)}-${num.slice(5)}` : num;
      dados.cep = el.value;
      if (num.length === 8 && e.type === 'input') buscarCep(num);
      return;
    }
    d[campo] = el.value;
    if (campo === 'titulo' && e.type === 'input') {
      if (erros.titulo) { delete erros.titulo; }
      const achou = categoriaPeloTitulo(el.value);
      if (achou && achou !== dados.categoria && !categoriaEscolhidaAMao) {
        dados.categoria = achou;
        dados.especialidades = [];
        delete erros.categoria;
        const cursor = el.selectionStart;
        desenhar(0);
        const novo = /** @type {HTMLInputElement|null} */ (document.getElementById('rfp-titulo'));
        if (novo) { novo.focus(); if (cursor !== null) novo.setSelectionRange(cursor, cursor); }
      }
      return;
    }
    if (campo === 'descricao') {
      const tam = el.value.trim().length;
      const cont = document.getElementById('rfp-contador');
      if (cont) { cont.textContent = `${tam}/${DESCRICAO_MAX} · mínimo ${DESCRICAO_MIN}`; cont.classList.toggle('falta', tam > 0 && tam < DESCRICAO_MIN); }
    }
  }

  // CEP → cidade, bairro e UF (ViaCEP, serviço público dos Correios).
  /** @param {string} cep */
  async function buscarCep(cep) {
    const status = document.getElementById('rfp-cep-status');
    if (status) status.textContent = 'Buscando…';
    try {
      const resp = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      const j = await resp.json();
      if (j && !j.erro) {
        dados.cidade = j.localidade || dados.cidade;
        dados.bairro = j.bairro || dados.bairro;
        dados.uf = (j.uf || dados.uf || '').toUpperCase();
        delete erros.cidade; delete erros.uf;
        desenhar(0);
        const s = document.getElementById('rfp-cep-status');
        if (s) s.textContent = 'Endereço encontrado';
        return;
      }
      if (status) status.textContent = 'CEP não encontrado';
    } catch (err) {
      if (status) status.textContent = 'Não deu para buscar o CEP agora';
    }
  }

  /** @param {File[]} arquivos */
  function adicionarFotos(arquivos) {
    delete erros.fotos;
    for (const f of arquivos) {
      if (dados.referencias.length >= MAX_FOTOS) { erros.fotos = `No máximo ${MAX_FOTOS} fotos.`; break; }
      if (!/^image\/(jpeg|png|webp)$/.test(f.type)) { erros.fotos = 'Use fotos JPG, PNG ou WebP.'; continue; }
      if (f.size > MAX_FOTO_BYTES) { erros.fotos = 'Cada foto pode ter até 5 MB.'; continue; }
      dados.referencias.push(f);
      previas.push(URL.createObjectURL(f));
    }
    desenhar(0);
  }

  /** @param {number} i */
  function tirarFoto(i) {
    dados.referencias.splice(i, 1);
    const [u] = previas.splice(i, 1);
    if (u) URL.revokeObjectURL(u);
    desenhar(0);
  }

  // Arrastar fotos para a área de upload.
  document.addEventListener('dragover', (e) => {
    const zona = e.target instanceof Element ? e.target.closest('#rfp-dropzone') : null;
    if (zona) { e.preventDefault(); zona.classList.add('arrastando'); }
  });
  document.addEventListener('dragleave', (e) => {
    const zona = e.target instanceof Element ? e.target.closest('#rfp-dropzone') : null;
    if (zona) zona.classList.remove('arrastando');
  });
  document.addEventListener('drop', (e) => {
    const zona = e.target instanceof Element ? e.target.closest('#rfp-dropzone') : null;
    if (!zona) return;
    e.preventDefault();
    adicionarFotos(Array.from((e.dataTransfer && e.dataTransfer.files) || []));
  });

  // --------------------------------------------------------------------------
  // Publicar
  // --------------------------------------------------------------------------

  /** @param {string} msg */
  function mostrarErroGeral(msg) {
    const el = document.getElementById('rfp-erro-geral');
    if (!el) return;
    el.textContent = msg;
    el.classList.toggle('hidden', !msg);
  }

  async function publicar() {
    // Confere tudo de novo antes de mandar.
    for (const n of [1, 2, 3]) {
      const e = validarEtapa(n);
      if (Object.keys(e).length) { erros = e; return irPara(n, -1); }
    }
    const usuario = window.loveClienteSession && window.loveClienteSession.user;
    if (!usuario || typeof supabaseClient === 'undefined') return mostrarErroGeral('Entre na sua conta para publicar o pedido.');

    publicando = true;
    mostrarErroGeral('');
    desenhar(0);
    try {
      /** @type {string[]} */
      const urls = [];
      for (const [i, foto] of dados.referencias.entries()) {
        const ext = foto.type === 'image/png' ? 'png' : foto.type === 'image/webp' ? 'webp' : 'jpg';
        const caminho = `pedidos/${usuario.id}/${Date.now()}-${i}.${ext}`;
        const { error } = await supabaseClient.storage.from('clientes').upload(caminho, foto, { contentType: foto.type });
        if (error) throw new Error('Não foi possível enviar as fotos de referência.');
        urls.push(supabaseClient.storage.from('clientes').getPublicUrl(caminho).data.publicUrl);
      }
      const temOrcamento = !!(dados.valorMin || dados.valorMax);
      const eventoId = typeof window.getLoveActiveEventId === 'function' ? window.getLoveActiveEventId() : null;
      const linha = {
        cliente_id: usuario.id,
        evento_id: /^[0-9a-f-]{36}$/i.test(String(eventoId || '')) ? eventoId : null,
        categoria: dados.categoria,
        especialidades: dados.especialidades,
        titulo: dados.titulo.trim(),
        tipo_celebracao: dados.tipoCelebracao === 'outro' ? dados.celebracaoOutro.trim() : dados.tipoCelebracao,
        data_evento: dados.dataFlexivel ? null : dados.dataEvento,
        data_flexivel: dados.dataFlexivel,
        cep: dados.cep || null,
        cidade: dados.cidade.trim(),
        bairro: dados.bairro.trim() || null,
        uf: dados.uf.trim().toUpperCase(),
        convidados: dados.convidados,
        periodo: dados.periodo,
        horas_servico: dados.periodo === 'horas' ? dados.horasServico : null,
        // Faixa livre (De / Até); sem valores, fica sem faixa (migration 080).
        faixa: /** @type {string|null} */ (temOrcamento ? 'personalizada' : null),
        valor_min: dados.valorMin || null,
        valor_max: dados.valorMax || null,
        aceita_fora_da_faixa: temOrcamento ? dados.aceitaForaDaFaixa : true,
        descricao: dados.descricao.trim(),
        referencias: urls,
        limite_propostas: dados.limitePropostas
      };
      let { error } = await supabaseClient.from('pedidos_orcamento').insert(linha);
      // Banco ainda exige faixa (antes da migration 080): marca como personalizada.
      if (error && linha.faixa === null && /faixa/.test(String(error.message || ''))) {
        linha.faixa = 'personalizada';
        ({ error } = await supabaseClient.from('pedidos_orcamento').insert(linha));
      }
      // Banco ainda sem a coluna titulo (migration 078): publica sem ela.
      if (error && /titulo/.test(String(error.message || ''))) {
        const { titulo: _semTitulo, ...semTitulo } = linha;
        ({ error } = await supabaseClient.from('pedidos_orcamento').insert(semTitulo));
      }
      if (error) throw new Error(tabelaAusente(error) ? 'Os pedidos de orçamento ainda não foram ativados no banco.' : 'Não foi possível publicar agora. Tente de novo.');
      publicando = false;
      sair();
      avisoNaLista('Solicitação publicada. Os fornecedores da categoria já podem enviar propostas.');
    } catch (err) {
      publicando = false;
      desenhar(0);
      mostrarErroGeral(err instanceof Error ? err.message : 'Não foi possível publicar agora.');
    }
  }

  /** @param {any} error */
  const tabelaAusente = (error) => !!error && (error.code === '42P01' || error.code === 'PGRST205' || /pedidos_orcamento/.test(String(error.message || '')));

  // --------------------------------------------------------------------------
  // Lista: Fornecedores › Pedidos de orçamento
  // --------------------------------------------------------------------------

  /** @param {string} msg */
  function avisoNaLista(msg) {
    const el = document.getElementById('rfp-lista-aviso');
    if (!el) return;
    el.textContent = msg;
    el.classList.toggle('hidden', !msg);
    if (msg) setTimeout(() => el.classList.add('hidden'), 6000);
  }

  /** Pedidos da última carga da lista (para o título da tela de propostas). @type {Record<string, any>} */
  let pedidosCarregados = {};

  async function mostrarLista() {
    document.getElementById('rfp-lista-wrap')?.classList.remove('hidden');
    document.getElementById('rfp-propostas')?.classList.add('hidden');
    const corpo = document.getElementById('rfp-lista');
    const contagem = document.getElementById('rfp-contagem');
    if (!corpo) return;
    const usuario = window.loveClienteSession && window.loveClienteSession.user;
    if (!usuario || typeof supabaseClient === 'undefined') {
      corpo.innerHTML = linhaVazia('Entre na sua conta para ver seus pedidos de orçamento.');
      if (contagem) contagem.textContent = '';
      return;
    }
    corpo.innerHTML = linhaVazia('Carregando…');
    const { data, error } = await supabaseClient
      .from('pedidos_orcamento')
      .select('*')
      .eq('cliente_id', usuario.id)
      .order('created_at', { ascending: false });
    if (error) {
      corpo.innerHTML = linhaVazia(tabelaAusente(error) ? 'Os pedidos de orçamento ainda não foram ativados no banco.' : 'Não foi possível carregar seus pedidos agora.');
      if (contagem) contagem.textContent = '';
      return;
    }
    const linhas = data || [];
    pedidosCarregados = {};
    linhas.forEach(p => { pedidosCarregados[p.id] = p; });
    if (contagem) contagem.textContent = linhas.length === 1 ? '1 pedido' : `${linhas.length} pedidos`;
    if (!linhas.length) {
      corpo.innerHTML = '';
      linhasDaTabela(corpo);
      return;
    }
    corpo.innerHTML = linhas.map(p => {
      const cat = categoriaPorId(p.categoria);
      const quando = p.data_flexivel || !p.data_evento ? 'Data flexível' : formatarData(p.data_evento);
      const local = [p.bairro, p.cidade].filter(Boolean).join(', ') + (p.uf ? ` - ${p.uf}` : '');
      const situacao = SITUACOES[/** @type {'aberto'|'fechado'|'cancelado'} */ (p.status)] || p.status;
      return `
        <tr data-rfp-id="${esc(p.id)}" class="rfp-linha-clicavel" title="Ver propostas">
          <td><b class="rfp-col-titulo">${esc(p.titulo || (cat ? cat.nome : p.categoria))}</b>${p.titulo ? `<span class="rfp-col-sub">${esc(cat ? cat.nome : p.categoria)}</span>` : ''}${(p.especialidades || []).length ? `<span class="rfp-col-sub">${esc(p.especialidades.slice(0, 2).join(', '))}${p.especialidades.length > 2 ? ` +${p.especialidades.length - 2}` : ''}</span>` : ''}</td>
          <td>${esc(nomeDaCelebracao(p.tipo_celebracao))}<span class="rfp-col-sub">${esc(quando)}</span></td>
          <td>${esc(local)}</td>
          <td>${esc(textoDoOrcamento(p.valor_min, p.valor_max, p.faixa))}</td>
          <td class="rfp-col-num">${p.propostas_recebidas || 0}${p.limite_propostas ? ` / ${p.limite_propostas}` : ''}</td>
          <td><span class="rfp-situacao rfp-situacao-${esc(p.status)}">${esc(situacao)}</span></td>
          <td class="love-tabela-col-acoes">
            <div class="rfp-menu-wrap">
              <button type="button" class="rfp-menu-btn" data-rfp-menu aria-label="Ações do pedido">⋯</button>
              <div class="rfp-menu hidden" role="menu">
                ${p.status === 'aberto' ? '<button type="button" role="menuitem" data-rfp-acao="encerrar">Encerrar pedido</button>' : ''}
                <button type="button" role="menuitem" data-rfp-acao="excluir">Excluir</button>
              </div>
            </div>
          </td>
        </tr>`;
    }).join('');
    linhasDaTabela(corpo);
  }

  // Abaixo das linhas, as linhas finas continuam até o fim da caixa (como em Meus convidados).
  /** @param {HTMLElement} corpo */
  function linhasDaTabela(corpo) {
    const tabela = corpo.closest('table');
    const caixa = tabela && /** @type {HTMLElement|null} */ (tabela.parentElement);
    if (!tabela || !caixa) return;
    requestAnimationFrame(() => {
      const cab = tabela.querySelector('thead');
      const linhas = Array.from(corpo.querySelectorAll('tr'));
      const altura = linhas.length ? Math.round(linhas[linhas.length - 1].getBoundingClientRect().height) : 51;
      const fim = (cab ? cab.getBoundingClientRect().height : 0) + linhas.reduce((t, tr) => t + tr.getBoundingClientRect().height, 0);
      caixa.classList.add('tabela-com-linhas-vazias');
      caixa.style.setProperty('--altura-da-linha', `${altura || 51}px`);
      caixa.style.setProperty('--fim-das-linhas', `${fim}px`);
    });
  }

  // --------------------------------------------------------------------------
  // Propostas de uma solicitação: os fornecedores que enviaram orçamento
  // --------------------------------------------------------------------------
  const SITUACOES_DA_PROPOSTA = { enviada: 'Nova', vista: 'Vista', aceita: 'Aceita', recusada: 'Recusada', retirada: 'Retirada' };
  /** @param {number} v */
  const reais = (v) => `R$ ${Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  /** @param {string} id */
  async function mostrarPropostas(id) {
    const wrap = document.getElementById('rfp-lista-wrap');
    const det = document.getElementById('rfp-propostas');
    if (!det || typeof supabaseClient === 'undefined') return;
    wrap?.classList.add('hidden');
    det.classList.remove('hidden');
    const ped = pedidosCarregados[id] || {};
    const cat = categoriaPorId(ped.categoria);
    const quando = ped.data_flexivel || !ped.data_evento ? 'Data flexível' : formatarData(ped.data_evento);
    const sub = [ped.titulo ? (cat ? cat.nome : '') : '', nomeDaCelebracao(ped.tipo_celebracao), quando].filter(Boolean).join(' · ');
    const linhaUnica = (/** @type {string} */ t) => `<tr><td colspan="6" class="rfp-vazio"><p>${esc(t)}</p></td></tr>`;
    det.innerHTML = `
      <div class="rfp-propostas-topo">
        <button type="button" class="rfp-voltar-seta" data-rfp-propostas-voltar aria-label="Voltar para as solicitações">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 18l-6-6 6-6"/></svg>
        </button>
        <div class="min-w-0">
          <h3 class="rfp-propostas-titulo">${esc(ped.titulo || (cat ? cat.nome : (ped.categoria || 'Solicitação')))}</h3>
          ${sub ? `<p class="rfp-propostas-sub">${esc(sub)}</p>` : ''}
        </div>
      </div>
      <div class="dash-card love-tabela-caixa">
        <div class="w-full overflow-x-auto">
          <table class="love-tabela w-full text-left border-collapse font-sans">
            <thead><tr><th>Fornecedor</th><th>Valor</th><th>O que inclui</th><th>Enviada em</th><th>Situação</th><th class="love-tabela-col-acoes"></th></tr></thead>
            <tbody id="rfp-propostas-lista">${linhaUnica('Carregando…')}</tbody>
          </table>
        </div>
      </div>`;
    const corpo = document.getElementById('rfp-propostas-lista');
    const { data, error } = await supabaseClient
      .from('propostas_pedido')
      .select('id, fornecedor_id, valor, inclui, mensagem, prazo_entrega, status, created_at, fornecedores(company_name, logo_url, avatar_url)')
      .eq('pedido_id', id)
      .order('created_at', { ascending: true });
    if (!corpo) return;
    // Sem a tabela de propostas no banco (migration 074), ainda não há propostas.
    const semTabela = !!error && (error.code === 'PGRST205' || error.code === '42P01');
    if (error && !semTabela) { corpo.innerHTML = linhaUnica('Não foi possível carregar as propostas agora.'); return; }
    const lista = (semTabela ? [] : data || []).filter(x => x.status !== 'retirada');
    if (!lista.length) { corpo.innerHTML = linhaUnica('Nenhum fornecedor enviou proposta ainda.'); linhasDaTabela(corpo); return; }
    corpo.innerHTML = lista.map(x => {
      const f = /** @type {any} */ (x.fornecedores) || {};
      const nome = f.company_name || 'Fornecedor';
      const foto = f.logo_url || f.avatar_url || '';
      const enviada = formatarData(String(x.created_at || '').slice(0, 10));
      return `
        <tr>
          <td><span class="rfp-forn">${foto ? `<img src="${esc(foto)}" alt="" class="rfp-forn-foto">` : `<span class="rfp-forn-foto rfp-forn-inicial">${esc(nome.charAt(0).toUpperCase())}</span>`}<b class="rfp-col-titulo">${esc(nome)}</b></span></td>
          <td class="rfp-col-num">${esc(reais(x.valor))}</td>
          <td><span class="rfp-col-inclui">${esc(x.inclui)}</span>${x.prazo_entrega ? `<span class="rfp-col-sub">Prazo: ${esc(x.prazo_entrega)}</span>` : ''}</td>
          <td>${esc(enviada)}</td>
          <td><span class="rfp-situacao rfp-proposta-${esc(x.status)}">${esc(SITUACOES_DA_PROPOSTA[/** @type {'enviada'} */ (x.status)] || x.status)}</span></td>
          <td class="love-tabela-col-acoes"><button type="button" class="rfp-conversar" data-rfp-conversar="${esc(x.fornecedor_id)}">Conversar</button></td>
        </tr>`;
    }).join('');
    linhasDaTabela(corpo);
    // Abriu a solicitação: as propostas novas passam a "Vista".
    if (lista.some(x => x.status === 'enviada')) {
      supabaseClient.from('propostas_pedido').update({ status: 'vista' }).eq('pedido_id', id).eq('status', 'enviada').then(() => {});
    }
  }

  /** @param {string} texto */
  const linhaVazia = (texto) => `<tr><td colspan="7" class="rfp-vazio"><p>${esc(texto)}</p></td></tr>`;

  // Ações da lista (Novo pedido, menu ⋯, encerrar, excluir).
  document.addEventListener('click', async (e) => {
    const alvo = e.target instanceof Element ? e.target : null;
    if (!alvo) return;
    if (alvo.closest('[data-rfp-propostas-voltar]')) { mostrarLista(); return; }
    const conversar = /** @type {HTMLElement|null} */ (alvo.closest('[data-rfp-conversar]'));
    if (conversar) { const w = /** @type {any} */ (window); if (w.loveAbrirChatComFornecedor) w.loveAbrirChatComFornecedor(conversar.dataset.rfpConversar); return; }
    const abertos = document.querySelectorAll('.rfp-menu:not(.hidden)');
    const btnMenu = alvo.closest('[data-rfp-menu]');
    if (btnMenu) {
      const menu = btnMenu.parentElement && btnMenu.parentElement.querySelector('.rfp-menu');
      abertos.forEach(m => { if (m !== menu) m.classList.add('hidden'); });
      if (menu) menu.classList.toggle('hidden');
      return;
    }
    const acao = /** @type {HTMLElement|null} */ (alvo.closest('[data-rfp-acao]'));
    abertos.forEach(m => m.classList.add('hidden'));
    if (!acao) {
      // Clique na linha (fora do menu ⋯): fornecedores que enviaram proposta.
      const tr = /** @type {HTMLElement|null} */ (alvo.closest('#rfp-lista tr[data-rfp-id]'));
      if (tr && !alvo.closest('.rfp-menu-wrap')) mostrarPropostas(tr.dataset.rfpId || '');
      return;
    }
    const linha = /** @type {HTMLElement|null} */ (acao.closest('[data-rfp-id]'));
    const id = linha && linha.dataset.rfpId;
    if (!id || typeof supabaseClient === 'undefined') return;
    if (acao.dataset.rfpAcao === 'excluir') {
      const w = /** @type {any} */ (window);
      const ok = w.confirmarNaLove ? await w.confirmarNaLove({ titulo: 'Excluir esta solicitação?', texto: 'Os fornecedores deixam de vê-la.', botao: 'Excluir' }) : false;
      if (!ok) return;
    }
    const { error } = acao.dataset.rfpAcao === 'encerrar'
      ? await supabaseClient.from('pedidos_orcamento').update({ status: 'fechado' }).eq('id', id)
      : await supabaseClient.from('pedidos_orcamento').delete().eq('id', id);
    avisoNaLista(error ? 'Não foi possível concluir agora. Tente de novo.' : (acao.dataset.rfpAcao === 'encerrar' ? 'Pedido encerrado.' : 'Pedido excluído.'));
    mostrarLista();
  });

  document.addEventListener('click', (e) => {
    if (e.target instanceof Element && e.target.closest('#btn-rfp-voltar')) sair();
  });

  window.LovePedidos = { abrir, fechar, mostrarLista, CATEGORIAS, FAIXAS };
})();
