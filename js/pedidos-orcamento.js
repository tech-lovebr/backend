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
   * @typedef {'fotografia'|'buffet'|'espaco'|'decoracao'|'musica'|'assessoria'|'bebidas'|'doces'|'staff'} RfpCategory
   * @typedef {'economico'|'moderado'|'premium'|'exclusivo'} RfpBudgetTier
   * @typedef {string} RfpCelebracao  id da lista (casamento…) ou 'outro'
   * @typedef {'ate-50'|'50-100'|'100-200'|'200-mais'} RfpConvidados
   * @typedef {'diurno'|'noturno'|'dia_inteiro'|'horas'} RfpPeriodo
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
   * @property {string} horarioInicio        HH:MM (opcional quando sem data)
   * @property {string} horarioFim           HH:MM
   * @property {string} ambiente             fechado, ar_livre, misto ou a_definir (opcional)
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
    { id: 'fotografia', nome: 'Fotografia e Vídeo', icone: '<path d="M3 8.5A2.5 2.5 0 0 1 5.5 6h1.6l1.2-1.8A1.5 1.5 0 0 1 9.55 3.5h4.9a1.5 1.5 0 0 1 1.25.7L16.9 6h1.6A2.5 2.5 0 0 1 21 8.5v9a2.5 2.5 0 0 1-2.5 2.5h-13A2.5 2.5 0 0 1 3 17.5v-9Z"/><circle cx="12" cy="13" r="3.5"/>',
      tags: ['Ensaio pré-wedding', 'Ensaio de gestante', 'Cobertura completa', 'Cobertura da cerimônia', 'Making of', 'Fotos de família', 'Álbum impresso', 'Drone', 'Vídeo / filme', 'Teaser para redes sociais', 'Transmissão ao vivo', 'Cabine de fotos', 'Fotos instantâneas (polaroid)', 'Plataforma 360°', 'Ensaio pós-evento'] },
    { id: 'buffet', nome: 'Buffet e Gastronomia', icone: '<path d="M4 13h16M5 13a7 7 0 0 1 14 0M12 6V4M3 17h18"/>',
      tags: ['Coquetel', 'Jantar empratado', 'Jantar volante', 'Ilhas gastronômicas', 'Mesa de frios', 'Café da manhã', 'Brunch', 'Almoço', 'Churrasco', 'Feijoada', 'Comida de boteco', 'Massas e risotos', 'Comida japonesa', 'Food truck', 'Finger food', 'Estação de crepes', 'Pizza no local', 'Buffet infantil', 'Opções veganas', 'Opções sem glúten', 'Ceia da madrugada', 'Chef em casa'] },
    { id: 'espaco', nome: 'Espaço para locação', icone: '<path d="M3 21h18M5 21V10l7-5 7 5v11M9 21v-6h6v6"/>',
      tags: ['Ao ar livre', 'Salão fechado', 'Campo', 'Praia', 'Sítio / chácara', 'Fazenda', 'Vinícola', 'Rooftop', 'Casa de festas', 'Restaurante', 'Hotel', 'Igreja / capela', 'Galpão / industrial', 'Jardim', 'Beira de lago', 'Serra / montanha', 'Com hospedagem', 'Com estacionamento', 'Cerimônia no local', 'Acessibilidade', 'Espaço kids'] },
    { id: 'decoracao', nome: 'Decoração e Cenografia', icone: '<path d="M12 21v-7M12 14c-3 0-5-2-5-5 2 0 3.5.8 5 2.5C13.5 9.8 15 9 17 9c0 3-2 5-5 5ZM12 8.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z"/>',
      tags: ['Flores naturais', 'Flores permanentes', 'Decoração da cerimônia', 'Decoração da recepção', 'Arco de flores', 'Mesa posta', 'Centro de mesa', 'Mesa de doces', 'Painel / backdrop', 'Arco de balões', 'Iluminação cênica', 'Varal de luzes', 'Mobiliário', 'Tapetes e lounge', 'Tendas', 'Decoração rústica', 'Decoração boho', 'Decoração clássica', 'Decoração temática infantil', 'Letreiro neon', 'Lembrancinhas'] },
    { id: 'musica', nome: 'Música, banda ou DJ', icone: '<path d="M9 18V5l11-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="17" cy="16" r="3"/>',
      tags: ['DJ', 'Banda ao vivo', 'Banda de sertanejo', 'Samba e pagode', 'Rock e pop', 'MPB e bossa nova', 'Forró', 'Música eletrônica', 'Voz e violão', 'Quarteto de cordas', 'Violino na cerimônia', 'Saxofonista', 'Coral', 'Música na cerimônia', 'Som e iluminação', 'Telão e projeção', 'Pista de dança', 'Fumaça e efeitos', 'Animação infantil', 'Mestre de cerimônias'] },
    { id: 'assessoria', nome: 'Assessoria e Cerimonial', icone: '<path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v0a2 2 0 0 1-2 2h-2a2 2 0 0 1-2-2ZM9 13l2 2 4-4"/>',
      tags: ['Assessoria completa', 'Assessoria do dia', 'Assessoria parcial', 'Cerimonialista', 'Celebrante', 'Roteiro e cronograma', 'Gestão de fornecedores', 'Recepcionistas', 'Lista de convidados e RSVP', 'Destination wedding', 'Planejamento de orçamento', 'Seguranças', 'Manobristas', 'Equipe de limpeza'] },
    { id: 'bebidas', nome: 'Bar e bebidas', icone: '<path d="M8 3h8l-1 8a3 3 0 0 1-6 0L8 3ZM12 14v7M8 21h8"/>',
      tags: ['Open bar', 'Drinks autorais', 'Bartender', 'Bar de caipirinhas', 'Gin bar', 'Cervejas especiais', 'Chopp', 'Vinhos e espumantes', 'Whisky bar', 'Drinks sem álcool', 'Sucos naturais', 'Café e espresso', 'Bar de chás', 'Brinde com espumante', 'Gelo e refrigeração', 'Taças e copos'] },
    { id: 'doces', nome: 'Doces e Bolo', icone: '<path d="M4 21h16M5 21v-6h14v6M7 15v-3h10v3M12 12V8M12 8c-1 0-1.5-1-1-2l1-2 1 2c.5 1 0 2-1 2Z"/>',
      tags: ['Bolo de casamento', 'Bolo de aniversário', 'Bolo cenográfico', 'Naked cake', 'Bolo de andares', 'Bem-casados', 'Doces finos', 'Brigadeiros gourmet', 'Mesa de doces', 'Cupcakes', 'Macarons', 'Pão de mel', 'Bolo no pote', 'Doces temáticos', 'Sem açúcar / sem glúten', 'Carrinho de sorvete', 'Churros', 'Algodão-doce e pipoca', 'Lembrancinhas'] },
    // Staff e mão de obra (no Hub: "Staff e Mão de Obra").
    { id: 'staff', nome: 'Staff e mão de obra', icone: '<circle cx="9" cy="7" r="3"/><path d="M3 21v-1.5A4.5 4.5 0 0 1 7.5 15h3a4.5 4.5 0 0 1 4.5 4.5V21M16 4.13a3 3 0 0 1 0 5.74M21 21v-1.5a4.5 4.5 0 0 0-3-4.24"/>',
      tags: ['Garçom', 'Bartender', 'Copeira', 'Cozinheiro', 'Segurança', 'Recepcionista', 'Manobrista', 'Limpeza', 'Montadores', 'Carregadores', 'Monitores infantis', 'Coordenador de equipe'] }
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
    ['doces', /\b(doces?|bolo|bolos|brigadeiros?|bem casados?|bem-casados?|confeitaria|confeiteira|confeiteiro|sobremesas?)\b/],
    ['staff', /\b(staff|garcom|garcons|garconete|copeira|copeiro|seguranca|segurancas|recepcionistas?|manobristas?|limpeza|montadores?|carregadores?|mao de obra|monitores?|equipe de apoio)\b/]
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
    { id: 'diurno', nome: 'Diurno' }, { id: 'noturno', nome: 'Noturno' }, { id: 'dia_inteiro', nome: 'Dia inteiro' }
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
  const TITULO_DA_LISTA = 'Minhas solicitações';
  const TITULO_DA_NOVA = 'Criar solicitação de orçamento';
  const DESCRICAO_MIN = 50;
  const DESCRICAO_MAX = 600;
  const MAX_FOTOS = 5;
  const MAX_FOTO_BYTES = 5 * 1024 * 1024;
  const SITUACOES = { aberto: 'Aberto', fechado: 'Encerrado', cancelado: 'Cancelado' };

  const ICONE_FECHAR = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg>';
  const ICONE_CADEADO = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></svg>';
  const ICONE_FOTO = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="m21 16-5-5-9 9"/></svg>';
  const ICONE_MAIS_FOTO = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 4.5v15m7.5-7.5h-15"/></svg>';
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
  // O evento já tem data em Informações? Então não mostra "Ainda não temos uma data definida".
  let eventoTemData = false;

  /** @returns {RfpFormData} */
  function rascunhoVazio() {
    return {
      titulo: '', categoria: '', especialidades: [], tipoCelebracao: '', celebracaoOutro: '', dataEvento: '', dataFlexivel: false,
      cep: '', cidade: '', bairro: '', uf: '', convidados: '', periodo: '', horasServico: null, horarioInicio: '', horarioFim: '', ambiente: '',
      faixa: '', valorMin: null, valorMax: null, aceitaForaDaFaixa: false, descricao: '', referencias: [], limitePropostas: null
    };
  }

  // Começa com o que o evento ativo já sabe (tipo, data e cidade).
  function preencherComOEvento() {
    const evento = typeof window.getLoveActiveEvent === 'function' ? window.getLoveActiveEvent() : null;
    eventoTemData = false;
    if (!evento) return;
    // Tipo de celebração = tipo do evento (escolhido ao criar o evento).
    const cat = /** @type {any} */ (window).LoveTiposEvento;
    /** @type {Record<string, string>} */
    const porTipo = { wedding: 'casamento', birthday: 'aniversario', anniversary: 'bodas', baby_shower: 'chá de bebê', baby: 'chá de bebê', gender_reveal: 'chá revelação', bridal_shower: 'chá de panela', corporate: 'corporativo' };
    const doCatalogo = evento.tipoEvento && cat ? cat.celebracao(evento.tipoEvento) : '';
    const celeb = doCatalogo || (evento.tipoEvento || evento.tipoNome ? '' : porTipo[evento.type] || '');
    if (celeb) { dados.tipoCelebracao = /** @type {RfpCelebracao} */ (celeb); dados.celebracaoOutro = ''; }
    else { dados.tipoCelebracao = 'outro'; dados.celebracaoOutro = String(evento.tipoNome || 'Evento'); }
    const det = evento.eventDetails || {};
    const data = det.date || evento.date || '';
    eventoTemData = /^\d{4}-\d{2}-\d{2}$/.test(data);
    if (eventoTemData) dados.dataEvento = data;
    if (det.city) dados.cidade = String(det.city);
    if (det.state) dados.uf = String(det.state).slice(0, 2).toUpperCase();
    // Horários do evento (Informações), se já preenchidos.
    if (/^\d{2}:\d{2}$/.test(String(det.time || ''))) dados.horarioInicio = horarioDe5em5(String(det.time));
    if (/^\d{2}:\d{2}$/.test(String(det.endTime || ''))) dados.horarioFim = horarioDe5em5(String(det.endTime));
  }

  // --------------------------------------------------------------------------
  // Validação (por etapa — não deixa avançar com obrigatório vazio)
  // --------------------------------------------------------------------------

  /** @param {number} n @returns {Record<string, string>} */
  function validarEtapa(n) {
    if (modo === 'lote') return validarLote(n);
    /** @type {Record<string, string>} */
    const e = {};
    if (n === 1 && dados.titulo.trim().length < 3) e.titulo = 'Escreva o que você está procurando.';
    if (n === 1 && !dados.categoria) e.categoria = 'Escolha a categoria do serviço.';
    if (n === 2) validarEvento(e);
    if (n === 3) {
      if (dados.valorMin != null && dados.valorMax != null && dados.valorMax < dados.valorMin) e.faixa = 'O valor "até" precisa ser maior que o "de".';
      const tam = dados.descricao.trim().length;
      if (tam < DESCRICAO_MIN) e.descricao = `Escreva pelo menos ${DESCRICAO_MIN} caracteres (faltam ${DESCRICAO_MIN - tam}).`;
      if (tam > DESCRICAO_MAX) e.descricao = `No máximo ${DESCRICAO_MAX} caracteres.`;
    }
    return e;
  }

  /** Dados do evento (etapa 2 da solicitação; etapa 1 do "Criar várias"). @param {Record<string, string>} e */
  function validarEvento(e) {
    validarCelebracao(e);
    validarLogistica(e);
  }
  /** @param {Record<string, string>} e */
  function validarCelebracao(e) {
    if (!dados.tipoCelebracao) e.tipoCelebracao = 'Escolha o tipo de celebração.';
    else if (dados.tipoCelebracao === 'outro' && !dados.celebracaoOutro.trim()) e.celebracaoOutro = 'Escreva o tipo de celebração.';
  }
  /** Data, local, convidados e horário. @param {Record<string, string>} e */
  function validarLogistica(e) {
    {
      if (!dados.dataFlexivel && !dados.dataEvento) e.dataEvento = eventoTemData ? 'Informe a data do evento.' : 'Informe a data ou marque "Ainda não temos uma data definida".';
      if (!dados.dataFlexivel && dados.dataEvento && dados.dataEvento < hojeIso()) e.dataEvento = 'A data precisa ser hoje ou depois.';
      // Horários: obrigatórios quando a data já está definida.
      if (!dados.dataFlexivel && !dados.horarioInicio) e.horarioInicio = 'Informe o horário de início.';
      if (!dados.dataFlexivel && !dados.horarioFim && !noCelular()) e.horarioFim = 'Informe o horário de término.';
      if (!UFS.includes(dados.uf.trim().toUpperCase())) e.uf = 'Escolha o estado.';
      if (!dados.cidade.trim()) e.cidade = 'Informe a cidade.';
      if (!dados.convidados) e.convidados = 'Escolha a quantidade de convidados.';
    }
  }

  /**
   * Período do pedido (diurno, noturno ou dia inteiro) a partir dos horários,
   * para o feed dos fornecedores. Sem data definida: 'a_definir'.
   * @returns {string}
   */
  function periodoDosHorarios() {
    const min = (/** @type {string} */ h) => { const m = /^(\d{2}):(\d{2})$/.exec(h || ''); return m ? Number(m[1]) * 60 + Number(m[2]) : null; };
    const ini = min(dados.horarioInicio);
    const fim = min(dados.horarioFim);
    if (ini === null || fim === null) return 'a_definir';
    if (ini >= 17 * 60) return 'noturno';
    if (fim > ini && fim <= 19 * 60) return 'diurno';
    return 'dia_inteiro';
  }

  function hojeIso() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  /** Celular: etapas no estilo de app (uma pergunta por bloco, Continuar grande, arrastar para o lado). */
  const noCelular = () => window.matchMedia('(max-width: 768px), (hover: none) and (pointer: coarse) and (max-height: 500px)').matches;
  /** Número de convidados digitado no celular (o pedido guarda a faixa). */
  let convidadosQtd = 0;
  /** @param {string} faixa */
  const qtdDaFaixa = (faixa) => (/** @type {Record<string, number>} */ ({ 'ate-50': 50, '50-100': 100, '100-200': 150, '200-mais': 200 }))[faixa] || 0;
  /** @param {number} n @returns {any} */
  const faixaDaQtd = (n) => !n ? '' : n <= 50 ? 'ate-50' : n <= 100 ? '50-100' : n <= 200 ? '100-200' : '200-mais';

  /** Celular, etapa 2: data, horário de início, local e convidados (número grande). */
  function htmlEventoCelular() {
    if (!convidadosQtd) convidadosQtd = qtdDaFaixa(dados.convidados) || 100;
    if (!dados.convidados) dados.convidados = faixaDaQtd(convidadosQtd);
    const semData = dados.dataFlexivel ? 'disabled' : '';
    const bloco = (/** @type {string} */ pergunta, /** @type {string} */ ajuda, /** @type {string} */ conteudo) => `
      <section class="rfp-cel-bloco">
        <h4 class="rfp-cel-pergunta">${pergunta}</h4>
        ${ajuda ? `<p class="rfp-cel-ajuda">${ajuda}</p>` : ''}
        ${conteudo}
      </section>`;
    return `
      ${bloco('Quando é o evento?', '', `
        <div class="rfp-ev-campo"><input type="date" class="rfp-campo rfp-cel-caixa" data-rfp-input="dataEvento" value="${esc(dados.dataEvento)}" min="${hojeIso()}" aria-label="Data do evento" ${semData}>${erroHtml('dataEvento')}</div>
        ${eventoTemData && !dados.dataFlexivel ? '' : `<label class="rfp-check rfp-check-flexivel"><input type="checkbox" data-rfp-input="dataFlexivel" ${dados.dataFlexivel ? 'checked' : ''}> Ainda não temos uma data definida</label>`}`)}
      ${bloco('Que horas começa?', '', `<div class="rfp-ev-campo">${seletorDeHorario('horarioInicio', semData).replace('class="rfp-campo"', 'class="rfp-campo rfp-cel-caixa" aria-label="Horário de início"')}${erroHtml('horarioInicio')}</div>`)}
      ${bloco('Onde vai ser?', '', `
        <div class="rfp-cel-local">
          <div class="rfp-ev-campo"><select class="rfp-campo rfp-cel-caixa rfp-campo-uf" data-rfp-input="uf" aria-label="Estado (UF)">
            <option value=""${dados.uf ? '' : ' selected'}>UF</option>
            ${UFS.map(u => `<option value="${u}"${dados.uf === u ? ' selected' : ''}>${u}</option>`).join('')}
          </select>${erroHtml('uf')}</div>
          <div class="rfp-ev-campo"><input type="text" class="rfp-campo rfp-cel-caixa" data-rfp-input="cidade" value="${esc(dados.cidade)}" placeholder="Cidade" aria-label="Cidade">${erroHtml('cidade')}</div>
        </div>`)}
      ${bloco('Quantos convidados você espera?', 'A maioria dos eventos fica entre 80 e 150.', `
        <div class="rfp-ev-campo">
          <div class="rfp-cel-qtd">
            <button type="button" class="rfp-cel-qtd-passo" data-rfp-qtd-passo="-10" aria-label="Menos 10 convidados"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M5 12h14"/></svg></button>
            <input type="text" class="rfp-cel-qtd-numero" data-rfp-qtd inputmode="numeric" maxlength="5" value="${convidadosQtd}" aria-label="Quantidade de convidados">
            <button type="button" class="rfp-cel-qtd-passo" data-rfp-qtd-passo="10" aria-label="Mais 10 convidados"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg></button>
          </div>
          ${erroHtml('convidados')}
        </div>`)}`;
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
        <ol class="rfp-passos" id="rfp-passos" aria-label="Etapas"></ol>
        <div class="rfp-caixa-form">
          <div class="rfp-corpo" id="rfp-corpo"></div>
        </div>
        <footer class="rfp-rodape">
          <p class="rfp-erro-geral hidden" id="rfp-erro-geral" role="alert"></p>
          <button type="button" class="rfp-voltar-texto" data-rfp-voltar>Cancelar</button>
          <button type="button" class="btn-primary rfp-btn" data-rfp-avancar>Continuar</button>
          <div class="rfp-pontos" id="rfp-pontos" aria-hidden="true"></div>
        </footer>
      </div>`;

    m.addEventListener('pointerdown', () => { soPreMarcado = false; });
    // Celular: arrastar para a esquerda avança; para a direita, volta uma etapa (como nos apps).
    /** @type {{ x: number, y: number } | null} */
    let toque = null;
    m.addEventListener('touchstart', (e) => {
      const alvo = /** @type {HTMLElement} */ (e.target);
      toque = noCelular() && e.touches.length === 1 && !alvo.closest('.rfp-cat-painel, textarea, .rfp-fotos, .rfp-pilulas') ? { x: e.touches[0].clientX, y: e.touches[0].clientY } : null;
    }, { passive: true });
    m.addEventListener('touchend', (e) => {
      if (!toque || publicando) return;
      const dx = e.changedTouches[0].clientX - toque.x;
      const dy = e.changedTouches[0].clientY - toque.y;
      toque = null;
      if (Math.abs(dx) < 70 || Math.abs(dx) < Math.abs(dy) * 1.5) return;
      if (dx < 0) avancar();
      else if (etapa > 1) { irPara(etapa - 1, -1); window.scrollTo({ top: 0 }); }
    }, { passive: true });
    m.addEventListener('keydown', () => { soPreMarcado = false; });
    m.addEventListener('click', (e) => {
      const alvo = /** @type {HTMLElement} */ (e.target);
      if (alvo.closest('[data-rfp-voltar]')) return etapa === 1 ? sair() : irPara(etapa - 1, -1);
      if (alvo.closest('[data-rfp-avancar]')) return avancar();
      const passo = /** @type {HTMLElement|null} */ (alvo.closest('[data-rfp-qtd-passo]'));
      if (passo) return mudarConvidados(convidadosQtd + Number(passo.dataset.rfpQtdPasso || 0));
      if (alvo.closest('[data-rfp-rascunho]')) { salvarComoRascunho(); return; }
      if (modo === 'lote' && cliqueDoLote(alvo)) return;
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
    // Corrigiu um campo com aviso: o aviso some na hora.
    const tirarAviso = (/** @type {Event} */ e) => {
      const el = /** @type {HTMLElement} */ (e.target);
      const bloco = el.closest && el.closest('.rfp-ev-campo');
      const aviso = bloco && bloco.querySelector('.rfp-erro');
      if (aviso) { aviso.remove(); delete erros[el.dataset.rfpInput || '']; }
    };
    m.addEventListener('input', tirarAviso);
    m.addEventListener('change', tirarAviso);
    m.addEventListener('input', atualizarBotaoAvancar);
    m.addEventListener('change', atualizarBotaoAvancar);
    return m;
  }

  /** Cabeçalho: na nova solicitação, setinha + "Nova solicitação de orçamento". @param {boolean} aberta */
  function cabecalho(aberta) {
    const titulo = document.getElementById('b2b-toolbar-title');
    const voltar = document.getElementById('btn-rfp-voltar');
    const criar = document.getElementById('btn-rfp-novo');
    const pedidosAberto = !!document.getElementById('b2b-pedidos-view') && !document.getElementById('b2b-pedidos-view')?.classList.contains('hidden');
    if (titulo && pedidosAberto) titulo.textContent = aberta ? (noCelular() ? 'Criar solicitação' : TITULO_DA_NOVA) : TITULO_DA_LISTA;
    if (voltar) voltar.hidden = true;
    if (vendoPropostas && aberta) { vendoPropostas = false; document.getElementById('pedidos-abas')?.classList.remove('hidden'); }
    // Sem botão "Criar solicitação" no cabeçalho (a aba Criar solicitação já faz isso).
    if (criar) criar.classList.add('hidden');
  }

  /** Serviço já marcado na próxima abertura (tarefas do Checklist). */
  let servicoPedido = '';
  /** Aberto pelo Checklist e a pessoa ainda não mexeu: não vira rascunho. */
  let soPreMarcado = false;
  /** @param {string} id */
  function abrirComServico(id) { servicoPedido = CATEGORIAS.some(c => c.id === id) ? id : ''; }

  function abrir() {
    soPreMarcado = false;
    modo = 'lote';
    lote = loteVazio();
    formato = 'unico';
    dados = rascunhoVazio();
    etapa = 1;
    erros = {};
    publicando = false;
    publicado = false;
    categoriaEscolhidaAMao = false;
    tituloSemServico = '';
    rascunhoId = null;
    rascunhoIds = {};
    convidadosQtd = 0;
    // "Editar rascunho": continua de onde a pessoa parou (sem as fotos).
    const r = rascunhoPendente;
    rascunhoPendente = null;
    if (r && r.dados) {
      const { lote: _lote, ...resto } = r.dados;
      dados = { ...dados, ...resto, referencias: [] };
      lote = loteDosDados(r.dados);
      formato = r.dados.formato === 'completo' || lote.categorias.length > 1 ? 'completo' : 'unico';
      rascunhoId = r.id;
      if (lote.categorias.length === 1) rascunhoIds[lote.categorias[0]] = r.id;
      categoriaEscolhidaAMao = true;
      eventoTemData = !!dados.dataEvento && !dados.dataFlexivel;
    } else {
      preencherComOEvento();
      if (servicoPedido) {
        formato = 'unico';
        lote.categorias = [servicoPedido];
        lote.itens[servicoPedido] = itemNovo(servicoPedido);
        categoriaEscolhidaAMao = true;
        soPreMarcado = true;
      }
    }
    servicoPedido = '';
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

  /** Sai da nova solicitação para a aba Minhas solicitações. */
  function sair() {
    if (publicando) return;
    mostrarAba('minhas');
  }

  /** Abas de Criar solicitação: 'nova', 'lote' (Criar várias) e 'minhas' (lista). @param {'nova'|'lote'|'minhas'} aba */
  function mostrarAba(aba) {
    document.querySelectorAll('#pedidos-abas [data-pedidos-aba]').forEach(b => b.classList.toggle('active', /** @type {HTMLElement} */ (b).dataset.pedidosAba === aba));
    document.getElementById('pedidos-abas')?.classList.remove('hidden');
    const minhas = document.getElementById('pedidos-painel-minhas');
    if (aba === 'nova' || aba === 'lote') {
      if (vendoPropostas) modoPropostas(false);
      minhas?.classList.add('hidden');
      const m = document.getElementById('rfp-editor');
      if (!m || m.hidden) abrir();
      return;
    }
    fechar();
    minhas?.classList.remove('hidden');
    cabecalho(false);
    mostrarLista();
  }

  function fechar() {
    if (publicando) return;
    const m = document.getElementById('rfp-editor');
    // Saiu sem publicar: o que já preencheu fica como rascunho.
    if (m && !m.hidden) salvarRascunhoAgora();
    if (m) m.hidden = true;
    document.body.classList.remove('rfp-editor-aberto');
    cabecalho(false);
  }

  /** @param {number} n @param {number} direcao */
  function irPara(n, direcao) {
    // Evento completo: uma etapa por categoria, então o total muda com quantas
    // foram marcadas (serviço avulso e a outra ponta continuam com ETAPAS.length).
    const max = modo === 'lote' ? totalEtapasFormulario() : ETAPAS.length;
    if (n < 1 || n > max) return;
    etapa = n;
    erros = {};
    desenhar(direcao);
    salvarRascunhoAgora();
  }

  function avancar() {
    if (modo === 'lote') {
      // Etapa 1: serviço(s) + evento · uma etapa por categoria · última: imagens e publicar.
      const total = totalEtapasFormulario();
      const e = etapa < total ? validarLote(etapa) : {};
      if (Object.keys(e).length) {
        erros = e;
        desenhar(0);
        mostrarErroGeral(`Falta preencher: ${oQueFalta(e)}.`);
        focarPrimeiroErro();
        return;
      }
      mostrarErroGeral('');
      if (etapa < total) { irPara(etapa + 1, 1); window.scrollTo({ top: 0 }); return; }
      publicarLote();
      return;
    }
    erros = validarEtapa(etapa);
    if (Object.keys(erros).length) { desenhar(0); focarPrimeiroErro(); return; }
    if (etapa < ETAPAS.length) return irPara(etapa + 1, 1);
    publicar();
  }

  function focarPrimeiroErro() {
    const el = document.querySelector('#rfp-corpo .rfp-erro, #rfp-corpo .rfp-lote-item-status.is-erro');
    if (!el) return;
    el.scrollIntoView({ block: 'center', behavior: 'smooth' });
    // Leva o cursor para o campo do aviso.
    const bloco = el.closest('.rfp-ev-campo') || el.parentElement;
    const campo = /** @type {HTMLElement|null} */ (bloco && bloco.querySelector('input:not([type=checkbox]):not([disabled]), select, textarea, .rfp-cat-gatilho'));
    if (campo) setTimeout(() => campo.focus({ preventScroll: true }), 300);
  }

  /** Nomes dos campos que faltam, para o aviso do rodapé. @param {Record<string, string>} e */
  function oQueFalta(e) {
    /** @type {Record<string, string>} */
    const nomes = {
      titulo: 'título', categorias: formato === 'completo' ? 'serviços' : 'categoria', dataEvento: 'data do evento',
      horarioInicio: 'horário de início', horarioFim: 'horário de término', uf: 'UF', cidade: 'cidade', convidados: 'convidados'
    };
    const varios = lote.categorias.length > 1;
    const lista = Object.keys(e).map(k => {
      if (nomes[k]) return nomes[k];
      const [id, campo] = k.split(':');
      const qual = varios ? ` (${CATEGORIA_CURTA[id] || id})` : '';
      return ({ titulo: 'título', descricao: 'descrição', faixa: 'orçamento' })[campo] + qual;
    });
    return Array.from(new Set(lista)).join(', ');
  }

  // --------------------------------------------------------------------------
  // Desenho das etapas
  // --------------------------------------------------------------------------

  /** @param {number} direcao  1 = avançou, -1 = voltou, 0 = só redesenho */
  function desenhar(direcao) {
    const textos = modo === 'lote' && etapa === 1 && noCelular()
      ? { titulo: 'Vamos encontrar um novo fornecedor?', sub: 'Responda algumas perguntas para criarmos uma solicitação de orçamento. Lembre-se de adicionar informações claras sobre o que você precisa.' }
      : modo === 'lote' ? (textosDaPagina(etapa) || TEXTO_DA_PAGINA) : TEXTOS_DAS_ETAPAS[etapa - 1];
    const titulo = document.getElementById('rfp-etapa-titulo');
    const sub = document.getElementById('rfp-etapa-sub');
    if (titulo) { titulo.textContent = textos.titulo; titulo.hidden = !textos.titulo; }
    if (sub) { sub.textContent = textos.sub; sub.hidden = !textos.sub; }
    const exemplos = document.getElementById('rfp-exemplos');
    // Exemplos de título: na etapa 1 do serviço avulso (é onde se escreve o título).
    if (exemplos) exemplos.hidden = etapa !== 3 || (modo === 'lote' && formato === 'completo');

    const corpo = document.getElementById('rfp-corpo');
    if (corpo) {
      const telas = modo === 'lote' ? [htmlLote1, htmlLote2, htmlLote3, htmlLote4] : [htmlEtapa1, htmlEtapa2, htmlEtapa3, htmlEtapa4];
      // Título e subtítulo da etapa ficam à esquerda da caixa (como no Hub).
      const topo = '';
      corpo.innerHTML = `<div class="rfp-tela${direcao ? '' : ' sem-animacao'}">${topo}${modo === 'lote' ? htmlPagina() : telas[etapa - 1]()}</div>`;
      if (modo === 'lote' && !publicando && !publicado) agendarRascunho();
      if (direcao) corpo.scrollTop = 0;
    }
    const pontos = document.getElementById('rfp-pontos');
    if (pontos) {
      const total = modo === 'lote' ? totalEtapasFormulario() : ETAPAS.length;
      pontos.innerHTML = Array.from({ length: total }, (_, i) => `<span class="${i + 1 === etapa ? 'is-atual' : ''}"></span>`).join('');
    }
    const passos = document.getElementById('rfp-passos');
    if (passos) passos.hidden = modo === 'lote';
    if (passos && modo !== 'lote') passos.innerHTML = PASSOS.map((nome, i) => `<li class="${i + 1 < etapa ? 'is-feito' : i + 1 === etapa ? 'is-atual' : ''}"><span>${i + 1}</span>${esc(nome)}</li>`).join('');
    const rascunhoBtn = /** @type {HTMLButtonElement|null} */ (document.querySelector('#rfp-editor [data-rfp-rascunho]'));
    if (rascunhoBtn) { rascunhoBtn.hidden = modo !== 'lote' && etapa !== ETAPAS.length; rascunhoBtn.disabled = publicando; }
    const voltar = /** @type {HTMLButtonElement|null} */ (document.querySelector('#rfp-editor [data-rfp-voltar]'));
    const avancarBtn = /** @type {HTMLButtonElement|null} */ (document.querySelector('#rfp-editor [data-rfp-avancar]'));
    if (voltar) voltar.textContent = etapa === 1 ? 'Cancelar' : 'Voltar';
    if (avancarBtn) {
      avancarBtn.textContent = publicando ? 'Publicando…' : ((modo === 'lote' ? etapa === totalEtapasFormulario() : etapa === ETAPAS.length) ? (formato === 'completo' && lote.categorias.length > 1 ? `Publicar ${lote.categorias.length} solicitações simultâneas` : 'Publicar solicitação') : 'Continuar');
      avancarBtn.disabled = publicando;
    }
    atualizarBotaoAvancar();
  }

  /**
   * Como em Adicionar novo produto do Hub: o Continuar só fica com a cor cheia
   * (e clicável) quando a etapa está toda preenchida; antes disso fica apagado.
   */
  function atualizarBotaoAvancar() {
    const btn = /** @type {HTMLButtonElement|null} */ (document.querySelector('#rfp-editor [data-rfp-avancar]'));
    if (!btn) return;
    let pronto = true;
    if (modo === 'lote' && etapa < totalEtapasFormulario()) {
      // Validação sem efeito colateral (ela abre os serviços com erro).
      const abertos = { ...lote.abertos };
      pronto = !Object.keys(validarLote(etapa)).length;
      lote.abertos = abertos;
    }
    // Fica apagado enquanto falta algo, mas continua clicável: o clique mostra
    // o que falta e leva até o campo.
    btn.disabled = publicando;
    btn.classList.toggle('is-incompleto', !pronto);
    if (pronto && etapa < totalEtapasFormulario()) mostrarErroGeral('');
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
        </div>` : ''}
      ${imagensDeReferencia()}`;
  }

  function htmlEtapa2() { return htmlCelebracao() + htmlLogistica(); }

  /** Tipo de celebração (pílulas + "Outro"). */
  function htmlCelebracao() {
    return `
      <h4 class="rfp-pergunta">Tipo de celebração</h4>
      ${pilulas('tipoCelebracao', CELEBRACOES, dados.tipoCelebracao)}
      ${erroHtml('tipoCelebracao')}
      ${dados.tipoCelebracao === 'outro' ? `
        <input type="text" class="rfp-campo rfp-campo-outro" data-rfp-input="celebracaoOutro" value="${esc(dados.celebracaoOutro)}" maxlength="60" placeholder="Qual é a celebração?" aria-label="Tipo de celebração">
        ${erroHtml('celebracaoOutro')}` : ''}`;
  }

  /** Data, local, convidados e horário do evento. */
  function htmlLogistica() {
    return `
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

      ${imagensDeReferencia()}`;
  }

  /** Imagens de referência do que a pessoa procura (etapas 1 e 3; a mesma lista, até 5). */
  function imagensDeReferencia() {
    return `
      <h4 class="rfp-pergunta">Imagem de referência <span class="rfp-opcional">(opcional)</span></h4>
      <p class="rfp-ajuda">Adicione fotos de referência mostrando o estilo que você procura, para ajudar os fornecedores a entenderem o seu estilo.</p>
      <div class="rfp-fotos-grade">
        ${previas.map((u, i) => `
          <div class="rfp-foto-quadro"><img src="${u}" alt="Referência ${i + 1}"><button type="button" class="rfp-foto-remover" data-rfp-tirar-foto="${i}" aria-label="Remover imagem">${ICONE_FECHAR}</button></div>`).join('')}
        ${dados.referencias.length < MAX_FOTOS ? `
          <label class="rfp-foto-adicionar" id="rfp-dropzone" title="Adicionar imagem">
            <span class="rfp-foto-mais">${ICONE_MAIS_FOTO}</span>
            <span class="rfp-foto-adicionar-texto">Adicionar</span>
            <input type="file" accept="image/jpeg,image/png,image/webp" multiple data-rfp-fotos id="rfp-fotos-input" hidden>
          </label>
          ${Array.from({ length: Math.max(0, MAX_FOTOS - 1 - dados.referencias.length) }, () => '<label class="rfp-foto-vaga" for="rfp-fotos-input" title="Adicionar imagem" aria-hidden="true"></label>').join('')}` : ''}
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
    if (modo === 'lote') agendarRascunho();
    if (modo === 'lote' && digitacaoDoLote(el)) return;
    if (el.matches('[data-rfp-qtd]')) {
      const num = el.value.replace(/\D/g, '').slice(0, 5);
      el.value = num;
      convidadosQtd = Number(num) || 0;
      dados.convidados = faixaDaQtd(convidadosQtd);
      if (dados.convidados) delete erros.convidados;
      return;
    }
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
    if ((campo === 'convidados' || campo === 'periodo') && el.tagName === 'SELECT') {
      if (campo === 'periodo' && el.value !== 'horas') dados.horasServico = null;
      delete erros[campo];
      desenhar(0);
      return;
    }
    if (campo === 'descricao') {
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

  /** Botões − / + dos convidados (celular). @param {number} n */
  function mudarConvidados(n) {
    convidadosQtd = Math.max(1, Math.min(99999, n));
    dados.convidados = faixaDaQtd(convidadosQtd);
    delete erros.convidados;
    const campo = /** @type {HTMLInputElement|null} */ (document.querySelector('#rfp-editor [data-rfp-qtd]'));
    if (campo) campo.value = String(convidadosQtd);
    atualizarBotaoAvancar();
    agendarRascunho();
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
    if (modo === 'lote') return publicarLote();
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
        bairro: null, // Bairro não é pedido no formulário
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
      publicado = true;
      await salvandoRascunho;
      if (rascunhoId) { await apagarRascunho(rascunhoId); rascunhoId = null; }
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
  // Criar solicitação (um formulário só): tipo de celebração e um ou mais
  // serviços na etapa 1. Cada serviço vira uma solicitação independente (fica
  // no feed do nicho certo no Hub); com 2+ serviços, todas saem ligadas pelo
  // mesmo lote_id (migration 084) e aparecem juntas em Minhas solicitações.
  // --------------------------------------------------------------------------
  const TEXTOS_DO_LOTE = [
    { titulo: 'Encontre os fornecedores perfeitos para o seu evento', sub: 'Conte o tipo de celebração e escolha um ou mais serviços. Os dados do evento valem para todos.' },
    { titulo: 'Descreva o que você precisa', sub: 'Conte os detalhes e, se quiser, quanto planeja gastar. Isso ajuda os fornecedores a enviarem propostas realistas.' },
    { titulo: 'Inspirações', sub: 'Adicione fotos de referência, paleta de cores ou moodboard para ajudar os fornecedores a entenderem seu estilo.' },
    { titulo: 'Revise e publique', sub: '' }
  ];
  const PASSOS = ['Evento e serviços', 'Detalhes', 'Inspirações', 'Revisão'];

  /** Nome curto da categoria (títulos, resumo e selos do lote). @type {Record<string, string>} */
  const CATEGORIA_CURTA = {
    fotografia: 'Foto e vídeo', buffet: 'Buffet', espaco: 'Espaço', decoracao: 'Decoração',
    musica: 'DJ e música', assessoria: 'Assessoria', bebidas: 'Bar e bebidas', doces: 'Bolo e doces', staff: 'Staff'
  };

  /** Dica do campo de detalhes de cada serviço. @type {Record<string, string>} */
  const DICA_DO_SERVICO = {
    fotografia: 'Ex.: cobertura da cerimônia e da festa, fotos espontâneas, álbum impresso…',
    buffet: 'Ex.: jantar para 120 pessoas, opções vegetarianas, serviço de garçons…',
    espaco: 'Ex.: espaço ao ar livre com área coberta, estacionamento, capacidade para 150 pessoas…',
    decoracao: 'Ex.: flores naturais em tons claros, iluminação aconchegante, mesa de doces…',
    musica: 'Ex.: estilos musicais, horário da pista, música na cerimônia…',
    assessoria: 'Ex.: assessoria completa ou só do dia, roteiro, gestão de fornecedores…',
    bebidas: 'Ex.: open bar com drinks autorais, cervejas, opções sem álcool…',
    doces: 'Ex.: bolo de 3 andares, sabores, bem-casados, docinhos finos…',
    staff: 'Ex.: 6 garçons, 2 seguranças e 1 recepcionista por 8 horas…'
  };

  /**
   * @typedef {Object} ItemDoLote
   * @property {string} titulo
   * @property {boolean} tituloEditado
   * @property {string[]} especialidades
   * @property {number|null} valorMin
   * @property {number|null} valorMax
   * @property {boolean} aceitaForaDaFaixa
   * @property {string} descricao
   */
  /** @returns {{ categorias: string[], itens: Record<string, ItemDoLote>, descricaoGeral: string, usarGeral: boolean, abertos: Record<string, boolean> }} */
  const loteVazio = () => ({ categorias: [], itens: {}, descricaoGeral: '', usarGeral: true, abertos: {} });
  let modo = 'lote';
  let lote = loteVazio();

  /** "[Serviço] para [tipo de evento] com [X] convidados". @param {string} id */
  function tituloSugerido(id) {
    const celeb = (dados.tipoCelebracao === 'outro' ? dados.celebracaoOutro.trim() : nomeDaCelebracao(dados.tipoCelebracao)).toLowerCase();
    const conv = nomeDe(CONVIDADOS, dados.convidados);
    return `${CATEGORIA_CURTA[id] || 'Serviço'}${celeb ? ` para ${celeb}` : ''}${conv ? ` com ${conv.toLowerCase()} convidados` : ''}`;
  }
  /** @param {string} id @returns {ItemDoLote} */
  const itemNovo = (id) => ({ titulo: tituloSugerido(id), tituloEditado: false, especialidades: [], valorMin: null, valorMax: null, aceitaForaDaFaixa: false, descricao: '' });

  /** Títulos que a pessoa não editou acompanham o tipo de evento e os convidados. */
  function atualizarTitulos() {
    lote.categorias.forEach(id => { const it = lote.itens[id]; if (it && !it.tituloEditado) it.titulo = tituloSugerido(id); });
  }

  /** @param {string} id */
  function alternarCategoriaDoLote(id) {
    const i = lote.categorias.indexOf(id);
    if (i >= 0) lote.categorias.splice(i, 1);
    else {
      lote.categorias.push(id);
      if (!lote.itens[id]) lote.itens[id] = itemNovo(id);
    }
    delete erros.categorias;
    desenhar(0);
  }

  /** Descrição que vai para a solicitação: a do serviço ou, sem ela, a geral. @param {string} id */
  const descricaoDoItem = (id) => {
    // Não existe mais descrição geral: cada serviço tem a sua. (Rascunho antigo
    // que só tinha a geral continua usando ela.)
    const proprio = (lote.itens[id] && lote.itens[id].descricao.trim()) || '';
    return proprio || lote.descricaoGeral.trim();
  };

  /** Rascunho/cópia no formato antigo (um serviço só) → lista de serviços. @param {any} d */
  function loteDosDados(d) {
    if (d && d.lote && Array.isArray(d.lote.categorias)) {
      const l = loteVazio();
      l.categorias = d.lote.categorias.slice();
      l.descricaoGeral = d.lote.descricaoGeral || '';
      l.usarGeral = d.lote.usarGeral !== false;
      l.categorias.forEach((/** @type {string} */ id) => { l.itens[id] = { ...itemNovo(id), ...((d.lote.itens || {})[id] || {}) }; });
      return l;
    }
    const l = loteVazio();
    if (d && d.categoria) {
      l.categorias = [d.categoria];
      l.itens[d.categoria] = {
        ...itemNovo(d.categoria),
        titulo: d.titulo || tituloSugerido(d.categoria), tituloEditado: !!d.titulo,
        especialidades: Array.isArray(d.especialidades) ? d.especialidades : [],
        valorMin: d.valorMin ?? null, valorMax: d.valorMax ?? null,
        aceitaForaDaFaixa: !!d.aceitaForaDaFaixa, descricao: d.descricao || ''
      };
    }
    return l;
  }

  /** @param {number} n @returns {Record<string, string>} */
  function validarLote(n) {
    /** @type {Record<string, string>} */
    const e = {};
    if (n === 1) {
      if (!lote.categorias.length) e.categorias = formato === 'completo' ? 'Escolha pelo menos um serviço.' : 'Escolha o serviço.';

    }
    if (n === 2) validarLogistica(e);
    // Evento completo: cada etapa valida só a categoria dela. Serviço avulso
    // continua validando a única categoria na etapa 3, como sempre.
    if (formato === 'completo') {
      const id = categoriaDaEtapa(n);
      if (id) validarItemDoLote(id, e);
    } else if (n === 3) {
      if (tituloDoUnico().trim().length < 3) e.titulo = 'Escreva um título para a sua solicitação.';
      lote.categorias.forEach(id => validarItemDoLote(id, e));
    }
    return e;
  }
  /** @param {string} id @param {Record<string, string>} e */
  function validarItemDoLote(id, e) {
    const it = lote.itens[id];
    if (!it) return;
    // Serviço avulso: o título fica na etapa 1 (validado lá).
    if (it.valorMin != null && it.valorMax != null && it.valorMax < it.valorMin) e[`${id}:faixa`] = 'O valor "até" precisa ser maior que o "de".';
    const tam = descricaoDoItem(id).length;
    if (tam < DESCRICAO_MIN) e[`${id}:descricao`] = `A descrição precisa ter pelo menos ${DESCRICAO_MIN} caracteres.`;
    if (tam > DESCRICAO_MAX) e[`${id}:descricao`] = `No máximo ${DESCRICAO_MAX} caracteres.`;
    if (Object.keys(e).some(k => k.startsWith(`${id}:`))) lote.abertos[id] = true;
  }

  const ETAPAS_DO_FORMULARIO = 4;
  const TEXTO_DA_PAGINA = { titulo: '', sub: 'Escolha como prefere começar: cotar um serviço pontual ou montar o evento completo.' };

  /**
   * Evento completo: uma etapa por categoria (1 serviços · 2 evento · uma por
   * categoria · última de revisão) em vez de todas juntas na etapa 3. Serviço
   * avulso continua com as 4 etapas de sempre (só tem 1 categoria mesmo).
   */
  function totalEtapasFormulario() {
    return formato === 'completo' ? 3 + lote.categorias.length : ETAPAS_DO_FORMULARIO;
  }
  /** Qual categoria é editada na etapa `n` (3..2+N) do Evento completo; null fora disso. @param {number} n */
  function categoriaDaEtapa(n) {
    if (formato !== 'completo') return null;
    const i = n - 3;
    return i >= 0 && i < lote.categorias.length ? lote.categorias[i] : null;
  }

  /** Data, cidade/UF, convidados e horário numa linha compacta. */
  function htmlEventoCompacto() {
    // Data e horários numa linha (data inteira visível); "Ainda não temos uma
    // data definida" embaixo; depois UF, cidade e convidados na mesma linha (sem bairro e sem ambiente).
    // Cada campo mostra o próprio aviso logo abaixo dele.
    const campo = (/** @type {string} */ rotulo, /** @type {string} */ controle, /** @type {string} */ chave) => `
        <div class="rfp-ev-campo"><label class="rfp-rotulo"><span class="rfp-rotulo-texto">${rotulo}</span>${controle}</label>${erroHtml(chave)}</div>`;
    const semData = dados.dataFlexivel ? 'disabled' : '';
    return `
      <div class="rfp-ev-grade rfp-ev-tempo">
        ${campo('Data do evento', `<input type="date" class="rfp-campo" data-rfp-input="dataEvento" value="${esc(dados.dataEvento)}" min="${hojeIso()}" ${semData}>`, 'dataEvento')}
        ${campo('Horário de início', seletorDeHorario('horarioInicio', semData), 'horarioInicio')}
        ${campo('Horário de término', seletorDeHorario('horarioFim', semData), 'horarioFim')}
      </div>
      ${eventoTemData && !dados.dataFlexivel ? '' : `<label class="rfp-check rfp-check-flexivel"><input type="checkbox" data-rfp-input="dataFlexivel" ${dados.dataFlexivel ? 'checked' : ''}> Ainda não temos uma data definida</label>`}
      <div class="rfp-ev-grade rfp-ev-local">
        ${campo('UF', `<select class="rfp-campo rfp-campo-uf" data-rfp-input="uf" aria-label="Estado (UF)">
            <option value=""${dados.uf ? '' : ' selected'}>UF</option>
            ${UFS.map(u => `<option value="${u}"${dados.uf === u ? ' selected' : ''}>${u}</option>`).join('')}
          </select>`, 'uf')}
        ${campo('Cidade', `<input type="text" class="rfp-campo" data-rfp-input="cidade" value="${esc(dados.cidade)}">`, 'cidade')}
        ${campo('Convidados', `<select class="rfp-campo" data-rfp-input="convidados">
            <option value=""${dados.convidados ? '' : ' selected'}>Selecione</option>
            ${CONVIDADOS.map(o => `<option value="${o.id}"${dados.convidados === o.id ? ' selected' : ''}>${esc(o.nome)}</option>`).join('')}
          </select>`, 'convidados')}
      </div>`;
  }

  // Ambiente do evento (ao lado de Convidados): ajuda decoração, som, foto e
  // buffet a planejarem estrutura (tenda, iluminação, plano B para chuva).
  const AMBIENTES = [
    { id: 'fechado', nome: 'Ambiente fechado' }, { id: 'ar_livre', nome: 'Ao ar livre' },
    { id: 'misto', nome: 'Fechado e ao ar livre' }, { id: 'a_definir', nome: 'Ainda não sei' }
  ];

  /** Horários de 5 em 5 minutos (00:00 a 23:55). */
  const HORARIOS = Array.from({ length: 288 }, (_, i) => `${String(Math.floor(i / 12)).padStart(2, '0')}:${String((i % 12) * 5).padStart(2, '0')}`);
  /** Arredonda "16:32" para "16:30" (horários do evento cadastrados antes). @param {string} h */
  const horarioDe5em5 = (h) => {
    const m = /^(\d{2}):(\d{2})/.exec(h || '');
    if (!m) return '';
    const total = Math.round((Number(m[1]) * 60 + Number(m[2])) / 5) * 5 % 1440;
    return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
  };
  /** Lista de horários de 5 em 5 minutos. @param {'horarioInicio'|'horarioFim'} chave @param {string} semData */
  function seletorDeHorario(chave, semData) {
    const atual = horarioDe5em5(dados[chave]);
    return `<select class="rfp-campo" data-rfp-input="${chave}" ${semData}>
            <option value=""${atual ? '' : ' selected'}>Selecione</option>
            ${HORARIOS.map(h => `<option value="${h}"${atual === h ? ' selected' : ''}>${h}</option>`).join('')}
          </select>`;
  }

  /** "Serviço específico" (um serviço) ou "Montar evento completo" (vários). */
  let formato = 'unico';

  // Serviço avulso: o título vem antes do serviço. Enquanto não há serviço
  // escolhido, o texto fica aqui; depois, no título do serviço.
  let tituloSemServico = '';
  /** Título do serviço avulso. */
  function tituloDoUnico() {
    const id = lote.categorias[0];
    const it = id ? lote.itens[id] : null;
    return it ? it.titulo : tituloSemServico;
  }
  /** Escolhe o serviço do avulso levando junto o título já escrito. @param {string} id */
  function escolherServicoUnico(id) {
    const titulo = tituloDoUnico();
    lote.categorias = [id];
    if (!lote.itens[id]) lote.itens[id] = itemNovo(id);
    lote.itens[id].titulo = titulo;
    lote.itens[id].tituloEditado = true;
    tituloSemServico = titulo;
    delete erros.categorias;
  }

  /** Os dois jeitos de começar (cards no topo). */
  function htmlModos() {
    const card = (/** @type {string} */ id, /** @type {string} */ nome, /** @type {string} */ texto, /** @type {string} */ _icone) => `
      <button type="button" class="rfp-modo${formato === id ? ' ativo' : ''}" role="radio" aria-checked="${formato === id}" data-rfp-formato="${id}">
        <span class="rfp-modo-textos"><b>${nome}</b><span>${texto}</span></span>
        <span class="rfp-lote-cat-check" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg></span>
      </button>`;
    return `
      <div class="rfp-modos" role="radiogroup" aria-label="Como você prefere começar">
        ${card('unico', 'Serviço avulso', 'Crie o pedido de serviço e encontre o profissional perfeito.', '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="3"/>')}
        ${card('completo', 'Evento completo', 'Receba múltiplos orçamentos de uma só vez.', '<rect x="3.5" y="3.5" width="7" height="7" rx="1.5"/><rect x="13.5" y="3.5" width="7" height="7" rx="1.5"/><rect x="3.5" y="13.5" width="7" height="7" rx="1.5"/><rect x="13.5" y="13.5" width="7" height="7" rx="1.5"/>')}
      </div>`;
  }

  /** Categoria única (drop-down da Love). */
  function seletorDeServico() {
    const id = lote.categorias[0] || '';
    const cat = id ? categoriaPorId(/** @type {any} */ (id)) : null;
    return `
      <div class="rfp-cat-select${categoriaAberta ? ' is-open' : ''}">
        <button type="button" class="rfp-cat-gatilho" data-rfp-cat-gatilho aria-haspopup="listbox" aria-expanded="${categoriaAberta}">
          <span class="${cat ? '' : 'rfp-cat-vazio'}">${esc(cat ? cat.nome : (noCelular() ? 'Selecione uma categoria' : 'Selecione o serviço...'))}</span>
          <svg class="rfp-cat-seta" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="m6 9 6 6 6-6"/></svg>
        </button>
        ${categoriaAberta ? `
          <div class="rfp-cat-painel" role="listbox">
            ${CATEGORIAS.map(c => `<button type="button" class="rfp-cat-opcao${c.id === id ? ' ativa' : ''}" role="option" aria-selected="${c.id === id}" data-lote-unico="${c.id}">${esc(c.nome)}</button>`).join('')}
          </div>` : ''}
      </div>`;
  }

  /** @param {string} id */
  function blocoTitulo(id) {
    const it = lote.itens[id];
    return `
      <label class="rfp-rotulo"><span class="rfp-rotulo-texto">Título</span>
        <input type="text" class="rfp-campo" data-lote-cat-campo="${id}" data-lote-input="titulo" maxlength="120" value="${esc(it.titulo)}">
      </label>
      ${erroHtml(`${id}:titulo`)}`;
  }
  /** @param {string} id */
  function blocoTags(id) {
    const cat = categoriaPorId(/** @type {any} */ (id));
    const it = lote.itens[id];
    if (!cat) return '';
    return `
      <h4 class="rfp-pergunta">Subcategorias <span class="rfp-opcional">(opcional)</span></h4>
      <div class="rfp-tags">
        ${cat.tags.map(t => `<button type="button" class="rfp-tag${it.especialidades.includes(t) ? ' ativa' : ''}" aria-pressed="${it.especialidades.includes(t)}" data-lote-tag="${id}" data-lote-tag-valor="${esc(t)}">${esc(t)}</button>`).join('')}
      </div>`;
  }
  /** @param {string} id */
  function blocoOrcamento(id) {
    const it = lote.itens[id];
    const temOrcamento = !!(it.valorMin || it.valorMax);
    return `
      <div class="rfp-orcamento">
        <label class="rfp-rotulo"><span class="rfp-rotulo-texto">De</span>
          <span class="rfp-moeda"><span>R$</span><input type="text" class="rfp-campo" data-lote-cat-campo="${id}" data-lote-input="valorMin" inputmode="numeric" value="${it.valorMin != null ? milhar(it.valorMin) : ''}" aria-label="Orçamento de"></span>
        </label>
        <label class="rfp-rotulo"><span class="rfp-rotulo-texto">Até</span>
          <span class="rfp-moeda"><span>R$</span><input type="text" class="rfp-campo" data-lote-cat-campo="${id}" data-lote-input="valorMax" inputmode="numeric" value="${it.valorMax != null ? milhar(it.valorMax) : ''}" aria-label="Orçamento até"></span>
        </label>
      </div>
      ${temOrcamento ? '' : '<p class="rfp-dica">Em branco, fica aberto a propostas.</p>'}
      ${erroHtml(`${id}:faixa`)}
      ${temOrcamento ? `
        <label class="rfp-toggle">
          <span>Aceito propostas fora dessa faixa de preço</span>
          <span class="settings-switch"><input type="checkbox" data-lote-cat-campo="${id}" data-lote-input="aceitaForaDaFaixa" ${it.aceitaForaDaFaixa ? 'checked' : ''}><span class="settings-switch-track"></span></span>
        </label>` : ''}`;
  }
  /** @param {string} id @param {string} rotulo @param {number} linhas */
  function blocoDescricao(id, rotulo, linhas) {
    const it = lote.itens[id];
    return `
      <h4 class="rfp-pergunta">${rotulo}</h4>
      ${caixaDeDescricao(`data-lote-cat-campo="${id}" data-lote-input="descricao"`, it.descricao, linhas)}
      ${erroHtml(`${id}:descricao`)}`;
  }

  /**
   * Caixa de descrição: sem exemplo dentro, tamanho fixo, até DESCRICAO_MAX
   * caracteres e a contagem no canto inferior direito.
   * @param {string} atributos @param {string} valor @param {number} linhas
   */
  function caixaDeDescricao(atributos, valor, linhas) {
    return `
      <div class="rfp-desc-caixa">
        <textarea class="rfp-campo rfp-descricao" ${atributos} maxlength="${DESCRICAO_MAX}" rows="${linhas}">${esc(valor)}</textarea>
        <span class="rfp-desc-contador" aria-live="polite">${String(valor || '').length}/${DESCRICAO_MAX}</span>
      </div>`;
  }

  /** Última etapa (comum): imagens de referência e privacidade. */
  function htmlFinal() {
    const n = lote.categorias.length;
    return `
      <section class="rfp-secao">${imagensDeReferencia()}</section>
      <section class="rfp-secao">
        <div class="rfp-aviso">
          ${ICONE_CADEADO}
          <p>Seu telefone e WhatsApp <b>não são mostrados</b> aos fornecedores. As propostas, a conversa e o fechamento acontecem com segurança dentro da Love.</p>
        </div>
        ${formato === 'completo' && n > 1 ? `<p class="rfp-lote-explica">Cada serviço marcado gera uma solicitação independente, enviada aos profissionais daquela categoria.</p>` : ''}
      </section>`;
  }

  /** Dados do evento (linha compacta; o tipo de celebração vem do evento). @param {string} rotulo */
  const secaoDoEvento = (rotulo) => `
      <section class="rfp-secao">
        <h4 class="rfp-pergunta">${rotulo}</h4>
        ${htmlEventoCompacto()}
      </section>`;

  /** Serviço avulso, por etapa: 1 título e serviço · 2 evento · 3 descrição e orçamento · 4 imagens. */
  function htmlPaginaUnico() {
    const id = lote.categorias[0] || '';
    // Sem título gerado automaticamente: o título é o que a pessoa escreve.
    const it = id ? lote.itens[id] : null;
    if (it && !it.tituloEditado) { it.titulo = tituloSemServico; it.tituloEditado = true; }
    const secaoTitulo = `
        <section class="rfp-secao">
          <label class="rfp-rotulo"><span class="rfp-rotulo-texto">Título</span>
            <input type="text" class="rfp-campo" data-rfp-titulo-unico maxlength="120" value="${esc(tituloDoUnico())}">
          </label>
          ${erroHtml('titulo')}
        </section>`;
    if (etapa === 1) {
      return `
        <section class="rfp-secao">
          <h4 class="rfp-pergunta">${noCelular() ? 'Qual serviço você precisa?' : 'Categoria'}</h4>
          ${seletorDeServico()}
          ${erroHtml('categorias')}
          ${id ? blocoTags(id) : ''}
        </section>`;
    }
    if (etapa === 2) return noCelular() ? htmlEventoCelular() : `<section class="rfp-secao">${htmlEventoCompacto()}</section>`;
    if (etapa === 3 && id) {
      return `
        ${secaoTitulo}
        <section class="rfp-secao">
          ${blocoDescricao(id, 'Descreva o que você precisa', 5)}
        </section>
        <section class="rfp-secao">
          <h4 class="rfp-pergunta">Orçamento previsto <span class="rfp-opcional">(opcional)</span></h4>
          ${blocoOrcamento(id)}
        </section>`;
    }
    return htmlFinal();
  }

  /** Evento completo, por etapa: 1 serviços · 2 evento · uma etapa por categoria (título, descrição e orçamento) · última de imagens. */
  function htmlPaginaCompleto() {
    atualizarTitulos();
    if (etapa === 1) {
      return `
        <section class="rfp-secao">
          <h4 class="rfp-pergunta">Quais serviços você precisa?</h4>
          ${gradeDeServicos()}
          ${erroHtml('categorias')}
        </section>`;
    }
    if (etapa === 2) return noCelular() ? htmlEventoCelular() : `<section class="rfp-secao">${htmlEventoCompacto()}</section>`;
    // Cada serviço marcado vira a própria etapa: descrição e (o título é gerado sozinho)
    // orçamento dele, um de cada vez (em vez de todos juntos na mesma página).
    const idDaEtapa = categoriaDaEtapa(etapa);
    if (idDaEtapa) {
      const cat = categoriaPorId(/** @type {any} */ (idDaEtapa));
      if (cat && lote.itens[idDaEtapa]) {
        return `
          <section class="rfp-secao">
            <div class="rfp-lote-linha-topo rfp-etapa-cat-topo">
              <span class="rfp-lote-cat-icone"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${cat.icone}</svg></span>
              <b>${esc(CATEGORIA_CURTA[idDaEtapa] || cat.nome)}</b>
            </div>
          </section>
          <section class="rfp-secao">
            ${blocoDescricao(idDaEtapa, 'Descreva o que você precisa', 5)}
          </section>
          <section class="rfp-secao">
            <h4 class="rfp-pergunta">Orçamento previsto <span class="rfp-opcional">(opcional)</span></h4>
            ${blocoOrcamento(idDaEtapa)}
          </section>`;
      }
    }
    return htmlFinal();
  }

  /** Textos do topo de cada etapa. */
  const TEXTOS_DA_PAGINA = [
    // Título grande à esquerda da caixa, como em Adicionar novo produto do Hub.
    { titulo: 'Encontre um fornecedor perfeito para o seu evento', sub: 'Escolha como prefere começar: cotar um serviço pontual ou montar o evento completo.' },
    { titulo: 'Conte mais sobre o seu evento', sub: 'Data, horário, local e convidados. Isso ajuda os fornecedores a enviarem propostas realistas.' },
    { titulo: 'Descreva o que você precisa', sub: 'Conte os detalhes de cada serviço e, se quiser, quanto planeja gastar.' },
    // Etapa 3: o "Imagem de referência" aparece uma vez só, dentro do formulário.
    { titulo: 'Revise e publique', sub: 'Adicione imagens de referência, se quiser, e publique a sua solicitação.' }
  ];

  /**
   * Texto do topo da etapa `n`, com as etapas por categoria do Evento
   * completo (uma pergunta "Descreva o que você precisa" por serviço).
   * @param {number} n
   */
  function textosDaPagina(n) {
    if (n === 1) return TEXTOS_DA_PAGINA[0];
    if (n === 2) return TEXTOS_DA_PAGINA[1];
    if (n === totalEtapasFormulario()) return TEXTOS_DA_PAGINA[3];
    const id = categoriaDaEtapa(n);
    const cat = id && categoriaPorId(/** @type {any} */ (id));
    return cat ? { titulo: 'Descreva o que você precisa', sub: `Conte os detalhes do que você precisa para ${cat.nome}, e quanto planeja gastar, se quiser.` } : TEXTOS_DA_PAGINA[2];
  }

  /** O formulário da etapa atual (os dois jeitos de começar ficam na etapa 1). */
  function htmlPagina() {
    return `${etapa === 1 ? htmlModos() : ''}${formato === 'completo' ? htmlPaginaCompleto() : htmlPaginaUnico()}`;
  }

  /** Texto do drop-down de serviços do Evento completo. */
  function resumoDosServicos() {
    const marcados = CATEGORIAS.filter(c => lote.categorias.includes(c.id));
    return !marcados.length ? 'Selecione os serviços...'
      : marcados.length <= 2 ? marcados.map(c => CATEGORIA_CURTA[c.id] || c.nome).join(', ')
      : `${marcados.length} serviços selecionados`;
  }

  /**
   * Marca/desmarca um serviço no drop-down do Evento completo sem redesenhar a
   * tela (assim não pisca): só troca a caixinha e o texto do campo.
   * @param {HTMLElement} opcao
   */
  function marcarServicoNoLugar(opcao) {
    const id = opcao.dataset.loteCat || '';
    const i = lote.categorias.indexOf(id);
    if (i >= 0) lote.categorias.splice(i, 1);
    else { lote.categorias.push(id); if (!lote.itens[id]) lote.itens[id] = itemNovo(id); }
    const on = i < 0;
    opcao.classList.toggle('ativa', on);
    opcao.setAttribute('aria-selected', String(on));
    const caixa = opcao.closest('.rfp-cat-multi');
    const texto = caixa && caixa.querySelector('.rfp-cat-gatilho span');
    if (texto) { texto.textContent = resumoDosServicos(); texto.classList.toggle('rfp-cat-vazio', !lote.categorias.length); }
    if (erros.categorias) {
      delete erros.categorias;
      const sec = caixa && caixa.closest('.rfp-secao');
      const aviso = sec && sec.querySelector('.rfp-erro');
      if (aviso) aviso.remove();
    }
    if (!publicando && !publicado) agendarRascunho();
    atualizarBotaoAvancar();
  }

  /** Grade compacta de serviços (marcar um ou mais). */
  function gradeDeServicos() {
    // Evento completo: drop-down igual ao de Categoria, mas com caixinhas
    // para marcar vários serviços (fica aberto enquanto a pessoa marca).
    const marcados = CATEGORIAS.filter(c => lote.categorias.includes(c.id));
    const resumo = resumoDosServicos();
    return `
      <div class="rfp-cat-select rfp-cat-multi${categoriaAberta ? ' is-open' : ''}">
        <button type="button" class="rfp-cat-gatilho" data-rfp-cat-gatilho aria-haspopup="listbox" aria-expanded="${categoriaAberta}">
          <span class="${marcados.length ? '' : 'rfp-cat-vazio'}">${esc(resumo)}</span>
          <svg class="rfp-cat-seta" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="m6 9 6 6 6-6"/></svg>
        </button>
        ${categoriaAberta ? `
          <div class="rfp-cat-painel" role="listbox" aria-multiselectable="true">
            ${CATEGORIAS.map(c => {
              const on = lote.categorias.includes(c.id);
              return `<button type="button" class="rfp-cat-opcao rfp-cat-opcao-check${on ? ' ativa' : ''}" role="option" aria-selected="${on}" data-lote-cat="${c.id}">
                <span class="rfp-cat-caixinha" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg></span>${esc(c.nome)}</button>`;
            }).join('')}
          </div>` : ''}
      </div>`;
  }

  // Etapa 1: os serviços (o tipo de celebração vem do evento).
  function htmlLote1() {
    return `
      <h4 class="rfp-pergunta">Quais serviços você precisa?</h4>
      <p class="rfp-ajuda">Escolha um ou mais. Cada serviço vira uma solicitação para os fornecedores daquela categoria.</p>
      <div class="rfp-lote-cats" role="group" aria-label="Serviços">
        ${CATEGORIAS.map(c => {
          const on = lote.categorias.includes(c.id);
          return `
            <button type="button" class="rfp-lote-cat${on ? ' ativa' : ''}" aria-pressed="${on}" data-lote-cat="${c.id}">
              <span class="rfp-lote-cat-icone"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${c.icone}</svg></span>
              <span class="rfp-lote-cat-nome">${esc(c.nome)}</span>
              <span class="rfp-lote-cat-check" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg></span>
            </button>`;
        }).join('')}
      </div>
      ${erroHtml('categorias')}
      ${htmlLogistica()}`;
  }

  /** Campos de um serviço (título, subcategorias, orçamento e descrição). @param {string} id @param {boolean} unico */
  function camposDoServico(id, unico) {
    const cat = categoriaPorId(/** @type {any} */ (id));
    const it = lote.itens[id];
    if (!cat || !it) return '';
    const temOrcamento = !!(it.valorMin || it.valorMax);
    return `
      <label class="rfp-rotulo"><span class="rfp-rotulo-texto">Título</span>
        <input type="text" class="rfp-campo" data-lote-cat-campo="${id}" data-lote-input="titulo" maxlength="120" value="${esc(it.titulo)}">
      </label>
      ${erroHtml(`${id}:titulo`)}
      <h4 class="rfp-pergunta">Subcategorias <span class="rfp-opcional">(opcional)</span></h4>
      <div class="rfp-tags">
        ${cat.tags.map(t => `<button type="button" class="rfp-tag${it.especialidades.includes(t) ? ' ativa' : ''}" aria-pressed="${it.especialidades.includes(t)}" data-lote-tag="${id}" data-lote-tag-valor="${esc(t)}">${esc(t)}</button>`).join('')}
      </div>
      <h4 class="rfp-pergunta">Faixa de orçamento prevista <span class="rfp-opcional">(opcional)</span></h4>
      <div class="rfp-orcamento">
        <label class="rfp-rotulo"><span class="rfp-rotulo-texto">De</span>
          <span class="rfp-moeda"><span>R$</span><input type="text" class="rfp-campo" data-lote-cat-campo="${id}" data-lote-input="valorMin" inputmode="numeric" value="${it.valorMin != null ? milhar(it.valorMin) : ''}" aria-label="Orçamento de"></span>
        </label>
        <label class="rfp-rotulo"><span class="rfp-rotulo-texto">Até</span>
          <span class="rfp-moeda"><span>R$</span><input type="text" class="rfp-campo" data-lote-cat-campo="${id}" data-lote-input="valorMax" inputmode="numeric" value="${it.valorMax != null ? milhar(it.valorMax) : ''}" aria-label="Orçamento até"></span>
        </label>
      </div>
      ${temOrcamento ? '' : '<p class="rfp-dica">Em branco, fica aberto a propostas.</p>'}
      ${erroHtml(`${id}:faixa`)}
      ${temOrcamento ? `
        <label class="rfp-toggle">
          <span>Aceito propostas fora dessa faixa de preço</span>
          <span class="settings-switch"><input type="checkbox" data-lote-cat-campo="${id}" data-lote-input="aceitaForaDaFaixa" ${it.aceitaForaDaFaixa ? 'checked' : ''}><span class="settings-switch-track"></span></span>
        </label>` : ''}
      <h4 class="rfp-pergunta">${unico ? 'Descreva o que você precisa' : 'Detalhes deste serviço <span class="rfp-opcional">(opcional)</span>'}</h4>
      <textarea class="rfp-campo rfp-descricao" data-lote-cat-campo="${id}" data-lote-input="descricao" maxlength="${DESCRICAO_MAX}" rows="${unico ? 6 : 4}" placeholder="${esc(DICA_DO_SERVICO[id] || '')}">${esc(it.descricao)}</textarea>
      ${erroHtml(`${id}:descricao`)}`;
  }

  // Etapa 2: um serviço → campos direto; vários → descrição geral + acordeão.
  function htmlLote2() {
    atualizarTitulos();
    if (lote.categorias.length === 1) return camposDoServico(lote.categorias[0], true);
    if (lote.categorias.length && !lote.categorias.some(id => lote.abertos[id])) lote.abertos[lote.categorias[0]] = true;
    return `
      <h4 class="rfp-pergunta">Descrição geral</h4>
      <p class="rfp-ajuda">Vale para todos os serviços que não tiverem detalhes próprios.</p>
      <textarea class="rfp-campo rfp-descricao" data-lote-geral maxlength="${DESCRICAO_MAX}" rows="4" placeholder="Conte o estilo do evento, o clima que você imagina e o que é importante para você.">${esc(lote.descricaoGeral)}</textarea>
      <button type="button" class="rfp-lote-copiar" data-lote-copiar>Aplicar a mesma descrição geral para todos</button>
      <div class="rfp-lote-itens">
        ${lote.categorias.map(id => {
          const cat = categoriaPorId(/** @type {any} */ (id));
          const it = lote.itens[id];
          if (!cat || !it) return '';
          const aberto = !!lote.abertos[id];
          const pronto = it.titulo.trim().length >= 3 && descricaoDoItem(id).length >= DESCRICAO_MIN;
          const temErro = Object.keys(erros).some(k => k.startsWith(`${id}:`));
          return `
            <section class="rfp-lote-item${aberto ? ' is-aberto' : ''}">
              <button type="button" class="rfp-lote-item-topo" data-lote-acordeao="${id}" aria-expanded="${aberto}">
                <span class="rfp-lote-cat-icone"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${cat.icone}</svg></span>
                <span class="rfp-lote-item-nome">${esc(cat.nome)}</span>
                <span class="rfp-lote-item-status${temErro ? ' is-erro' : pronto ? ' is-pronto' : ''}">${temErro ? 'Falta informação' : pronto ? 'Pronto' : 'Usa a descrição geral'}</span>
                <span class="rfp-lote-item-seta"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg></span>
              </button>
              ${aberto ? `<div class="rfp-lote-item-corpo">${camposDoServico(id, false)}</div>` : ''}
            </section>`;
        }).join('')}
      </div>`;
  }

  // Etapa 3: inspirações (imagens de referência valem para todos os serviços).
  function htmlLote3() {
    return imagensDeReferencia();
  }

  // Etapa 4: revisão e publicação.
  function htmlLote4() {
    const nomes = lote.categorias.map(id => CATEGORIA_CURTA[id] || id);
    const lista = nomes.length > 1 ? `${nomes.slice(0, -1).join(', ')} e ${nomes[nomes.length - 1]}` : nomes.join('');
    const qtd = lote.categorias.length;
    return `
      <p class="rfp-lote-resumo">${qtd === 1
        ? `Você está criando <b>1 solicitação de orçamento</b>: ${esc(lista)}.`
        : `Você está publicando <b>${qtd} solicitações de orçamento</b> de uma vez: ${esc(lista)}.`}</p>
      <div class="rfp-lote-revisao">
        ${lote.categorias.map(id => {
          const it = lote.itens[id];
          return `
            <div class="rfp-lote-revisao-linha">
              <span class="rfp-lote-revisao-cat">${esc(CATEGORIA_CURTA[id] || id)}</span>
              <span class="rfp-lote-revisao-titulo">${esc(it.titulo)}</span>
              <span class="rfp-lote-revisao-valor">${esc(textoDoOrcamento(it.valorMin, it.valorMax))}</span>
            </div>`;
        }).join('')}
      </div>
      ${dados.referencias.length ? `<p class="rfp-dica">${dados.referencias.length} ${dados.referencias.length === 1 ? 'imagem de referência' : 'imagens de referência'} ${qtd === 1 ? 'vai junto' : 'vão junto em todas'}.</p>` : ''}
      <h4 class="rfp-pergunta">${qtd === 1 ? 'Quantas propostas você quer receber?' : 'Quantas propostas você quer receber em cada uma?'}</h4>
      <div class="rfp-pilulas" role="radiogroup">
        ${LIMITES.map(l => `<button type="button" class="rfp-pilula${l.valor === dados.limitePropostas ? ' ativa' : ''}" role="radio" aria-checked="${l.valor === dados.limitePropostas}" data-rfp-campo="limitePropostas" data-rfp-valor="${l.valor === null ? '' : l.valor}">${esc(l.nome)}</button>`).join('')}
      </div>
      <p class="rfp-dica">A solicitação fecha sozinha quando chegar ao limite.</p>
      <div class="rfp-aviso">
        ${ICONE_CADEADO}
        <p>Seu telefone e WhatsApp <b>não são mostrados</b> aos fornecedores. As propostas, a conversa e o fechamento acontecem com segurança dentro da Love.</p>
      </div>`;
  }

  /** Cliques do formulário de serviços. @param {HTMLElement} alvo @returns {boolean} tratou */
  function cliqueDoLote(alvo) {
    const fmt = /** @type {HTMLElement|null} */ (alvo.closest('[data-rfp-formato]'));
    if (fmt) {
      formato = fmt.dataset.rfpFormato === 'completo' ? 'completo' : 'unico';
      // Voltou para um serviço só: fica com o primeiro marcado.
      if (formato === 'unico' && lote.categorias.length > 1) lote.categorias = lote.categorias.slice(0, 1);
      erros = {};
      categoriaAberta = false;
      desenhar(0);
      return true;
    }
    const unico = /** @type {HTMLElement|null} */ (alvo.closest('[data-lote-unico]'));
    if (unico) {
      escolherServicoUnico(unico.dataset.loteUnico || '');
      categoriaEscolhidaAMao = true;
      categoriaAberta = false;
      desenhar(0);
      return true;
    }
    const cat = /** @type {HTMLElement|null} */ (alvo.closest('[data-lote-cat]'));
    if (cat && cat.closest('.rfp-cat-multi')) { marcarServicoNoLugar(cat); return true; }
    if (cat) { alternarCategoriaDoLote(cat.dataset.loteCat || ''); return true; }
    const tag = /** @type {HTMLElement|null} */ (alvo.closest('[data-lote-tag]'));
    if (tag) {
      const it = lote.itens[tag.dataset.loteTag || ''];
      const v = tag.dataset.loteTagValor || '';
      if (it) { const i = it.especialidades.indexOf(v); if (i >= 0) it.especialidades.splice(i, 1); else it.especialidades.push(v); desenhar(0); }
      return true;
    }
    const sanfona = /** @type {HTMLElement|null} */ (alvo.closest('[data-lote-acordeao]'));
    if (sanfona) { const id = sanfona.dataset.loteAcordeao || ''; lote.abertos[id] = !lote.abertos[id]; desenhar(0); return true; }
    if (alvo.closest('[data-lote-copiar]')) {
      const geral = lote.descricaoGeral.trim();
      if (geral) lote.categorias.forEach(id => { if (lote.itens[id]) lote.itens[id].descricao = geral; });
      Object.keys(erros).forEach(k => { if (k.endsWith(':descricao')) delete erros[k]; });
      desenhar(0);
      return true;
    }
    return false;
  }

  /** Digitação dos campos de serviço. @param {HTMLInputElement} el @returns {boolean} tratou */
  function digitacaoDoLote(el) {
    if (el.matches('[data-lote-usar-geral]')) {
      lote.usarGeral = el.checked;
      Object.keys(erros).forEach(k => { if (k.endsWith(':descricao')) delete erros[k]; });
      desenhar(0);
      return true;
    }
    if (el.matches('[data-lote-geral]')) { lote.descricaoGeral = el.value; contarDescricao(el); return true; }
    // Título do serviço avulso: enquanto a pessoa escreve, já descobre e marca
    // o serviço pelas palavras (ex.: "fotógrafo" → Foto e vídeo).
    if (el.matches('[data-rfp-titulo-unico]')) {
      const id = lote.categorias[0];
      if (id && lote.itens[id]) { lote.itens[id].titulo = el.value; lote.itens[id].tituloEditado = true; }
      tituloSemServico = el.value;
      const tinhaErro = !!erros.titulo;
      delete erros.titulo;
      const achou = etapa === 1 ? categoriaPeloTitulo(el.value) : null;
      if ((achou && achou !== id && !categoriaEscolhidaAMao) || tinhaErro) {
        if (achou && achou !== id && !categoriaEscolhidaAMao) escolherServicoUnico(achou);
        const pos = el.selectionStart;
        desenhar(0);
        const novo = /** @type {HTMLInputElement|null} */ (document.querySelector('[data-rfp-titulo-unico]'));
        if (novo) { novo.focus(); if (pos !== null) novo.setSelectionRange(pos, pos); }
      }
      return true;
    }
    const id = el.dataset.loteCatCampo;
    const campo = el.dataset.loteInput;
    if (!id || !campo || !lote.itens[id]) return false;
    const it = /** @type {any} */ (lote.itens[id]);
    if (el.type === 'checkbox') { it[campo] = el.checked; return true; }
    if (campo === 'valorMin' || campo === 'valorMax') {
      const tinha = !!(it.valorMin || it.valorMax);
      const num = el.value.replace(/\D/g, '').slice(0, 9);
      it[campo] = num ? Number(num) : null;
      el.value = num ? milhar(Number(num)) : '';
      delete erros[`${id}:faixa`];
      // Apareceu/sumiu o "Aceito propostas fora dessa faixa": redesenha mantendo o foco.
      if (tinha !== !!(it.valorMin || it.valorMax)) {
        const pos = el.selectionStart;
        desenhar(0);
        const novo = /** @type {HTMLInputElement|null} */ (document.querySelector(`[data-lote-cat-campo="${id}"][data-lote-input="${campo}"]`));
        if (novo) { novo.focus(); if (pos !== null) novo.setSelectionRange(pos, pos); }
      }
      return true;
    }
    if (campo === 'titulo') it.tituloEditado = true;
    it[campo] = el.value;
    if (campo === 'descricao') contarDescricao(el);
    return true;
  }

  /** Atualiza a contagem de caracteres no canto da caixa de descrição. @param {HTMLInputElement} el */
  function contarDescricao(el) {
    const cont = el.parentElement && el.parentElement.querySelector('.rfp-desc-contador');
    if (cont) cont.textContent = `${el.value.length}/${DESCRICAO_MAX}`;
  }

  /** "Salvar como rascunho" (etapa de revisão). */
  async function salvarComoRascunho() {
    if (!dados.tipoCelebracao || !lote.categorias.length) return;
    salvandoRascunho = salvandoRascunho.then(guardarRascunhosPorServico).catch(() => {});
    await salvandoRascunho;
    publicado = true; // não salva de novo ao sair
    sair();
    avisoNaLista('Rascunho salvo. Você pode continuar quando quiser.');
  }

  async function publicarLote() {
    for (const n of [1, 2, 3]) {
      const e = validarLote(n);
      if (Object.keys(e).length) { erros = e; irPara(n, -1); erros = e; desenhar(0); focarPrimeiroErro(); return; }
    }
    const usuario = usuarioLogado();
    if (!usuario || typeof supabaseClient === 'undefined') return mostrarErroGeral('Entre na sua conta para publicar.');
    publicando = true;
    mostrarErroGeral('');
    desenhar(0);
    try {
      // Imagens de referência: sobem uma vez e vão em todas as solicitações.
      /** @type {string[]} */
      const urls = [];
      for (const [i, foto] of dados.referencias.entries()) {
        const ext = foto.type === 'image/png' ? 'png' : foto.type === 'image/webp' ? 'webp' : 'jpg';
        const caminho = `pedidos/${usuario.id}/${Date.now()}-${i}.${ext}`;
        const { error } = await supabaseClient.storage.from('clientes').upload(caminho, foto, { contentType: foto.type });
        if (error) throw new Error('Não foi possível enviar as imagens de referência.');
        urls.push(supabaseClient.storage.from('clientes').getPublicUrl(caminho).data.publicUrl);
      }
      const eventoId = typeof window.getLoveActiveEventId === 'function' ? window.getLoveActiveEventId() : null;
      const varios = lote.categorias.length > 1;
      const loteId = varios && window.crypto && typeof window.crypto.randomUUID === 'function' ? window.crypto.randomUUID() : null;
      /** @type {any[]} */
      let linhas = lote.categorias.map(id => {
        const it = lote.itens[id];
        const temOrcamento = !!(it.valorMin || it.valorMax);
        return {
          cliente_id: usuario.id,
          evento_id: /^[0-9a-f-]{36}$/i.test(String(eventoId || '')) ? eventoId : null,
          ...(loteId ? { lote_id: loteId } : {}),
          categoria: id,
          especialidades: it.especialidades,
          titulo: it.titulo.trim(),
          tipo_celebracao: dados.tipoCelebracao === 'outro' ? dados.celebracaoOutro.trim() : dados.tipoCelebracao,
          data_evento: dados.dataFlexivel ? null : dados.dataEvento,
          data_flexivel: dados.dataFlexivel,
          cep: dados.cep || null,
          cidade: dados.cidade.trim(),
          bairro: null, // Bairro não é pedido no formulário
          uf: dados.uf.trim().toUpperCase(),
          convidados: dados.convidados,
          periodo: periodoDosHorarios(),
          horas_servico: null,
          horario_inicio: dados.dataFlexivel ? null : (dados.horarioInicio || null),
          horario_fim: dados.dataFlexivel ? null : (dados.horarioFim || null),
          ambiente: dados.ambiente || null,
          faixa: temOrcamento ? 'personalizada' : null,
          valor_min: it.valorMin || null,
          valor_max: it.valorMax || null,
          aceita_fora_da_faixa: temOrcamento ? it.aceitaForaDaFaixa : true,
          descricao: descricaoDoItem(id),
          referencias: urls,
          limite_propostas: dados.limitePropostas
        };
      });
      let { error } = await supabaseClient.from('pedidos_orcamento').insert(linhas);
      // Sem as colunas de horário (migration 094): publica sem elas.
      if (error && /ambiente/.test(String(error.message || ''))) {
        linhas = linhas.map(({ ambiente: _a, ...resto }) => resto);
        ({ error } = await supabaseClient.from('pedidos_orcamento').insert(linhas));
      }
      if (error && /horario_/.test(String(error.message || ''))) {
        linhas = linhas.map(({ horario_inicio: _i, horario_fim: _f, ...resto }) => resto);
        ({ error } = await supabaseClient.from('pedidos_orcamento').insert(linhas));
      }
      // Bancos sem as colunas novas: publica sem elas (lote_id 084, titulo 078) e
      // com faixa "personalizada" se ela ainda for obrigatória (080).
      if (error && /lote_id/.test(String(error.message || ''))) {
        linhas = linhas.map(({ lote_id: _l, ...resto }) => resto);
        ({ error } = await supabaseClient.from('pedidos_orcamento').insert(linhas));
      }
      if (error && /faixa/.test(String(error.message || ''))) {
        linhas = linhas.map(l => ({ ...l, faixa: l.faixa || 'personalizada' }));
        ({ error } = await supabaseClient.from('pedidos_orcamento').insert(linhas));
      }
      if (error && /titulo/.test(String(error.message || ''))) {
        linhas = linhas.map(({ titulo: _t, ...resto }) => resto);
        ({ error } = await supabaseClient.from('pedidos_orcamento').insert(linhas));
      }
      if (error) throw new Error(tabelaAusente(error) ? 'Os pedidos de orçamento ainda não foram ativados no banco.' : 'Não foi possível publicar agora. Tente de novo.');
      const qtd = linhas.length;
      publicando = false;
      publicado = true;
      await apagarRascunhosDoEditor();
      sair();
      avisoNaLista(qtd === 1
        ? 'Solicitação publicada. Os fornecedores da categoria já podem enviar propostas.'
        : `${qtd} solicitações publicadas. Os fornecedores de cada categoria já podem enviar propostas.`);
    } catch (err) {
      publicando = false;
      desenhar(0);
      mostrarErroGeral(err instanceof Error ? err.message : 'Não foi possível publicar agora.');
    }
  }

  /** Selos do lote em Minhas solicitações ("DJ e música: 3 propostas"). @param {any[]} pedidos @param {string} quando */
  function linhaDoLote(pedidos, quando) {
    const selos = pedidos.map(p => {
      const n = numerosDasPropostas[p.id] || { total: p.propostas_recebidas || 0 };
      const nome = CATEGORIA_CURTA[p.categoria] || p.categoria;
      return `<span class="rfp-lote-selo">${esc(nome)}: ${n.total ? `${n.total} ${n.total === 1 ? 'proposta' : 'propostas'}` : 'aguardando'}</span>`;
    }).join('');
    return `
      <div class="rfp-lote-grupo">
        <div class="rfp-lote-grupo-topo">
          <p class="rfp-lote-grupo-titulo">Solicitação em lote · ${pedidos.length} serviços</p>
          <p class="rfp-post-criado">Criada ${esc(haQuanto(quando))} por você</p>
          <div class="rfp-lote-selos">${selos}</div>
        </div>
        ${pedidos.map(p => linhaDaSolicitacao({ tipo: 'pedido', id: p.id, quando: p.created_at, criado: p.created_at, p })).join('')}
      </div>`;
  }

  // --------------------------------------------------------------------------
  // Rascunhos: o que a pessoa começou e não publicou. Vale como rascunho
  // quando já tem título e categoria e passou da etapa 1; salva sozinho a cada
  // etapa e ao sair. Tabela pedidos_rascunho (migration 081); sem ela, fica
  // guardado no navegador.
  // --------------------------------------------------------------------------
  /** @returns {any} */
  const usuarioLogado = () => (window.loveClienteSession && window.loveClienteSession.user) || null;
  /** @param {any} error */
  const tabelaFaltando = (error) => !!error && (error.code === 'PGRST205' || error.code === '42P01');
  /** @type {string|null} */
  let rascunhoId = null;
  /** @type {any} */
  let rascunhoPendente = null; // "Editar rascunho": abre o editor com ele
  let semTabelaDeRascunhos = false;
  let publicado = false;
  /** @type {Promise<any>} */
  let salvandoRascunho = Promise.resolve();

  /** @param {string} uid */
  const chaveLocal = (uid) => `love-rfp-rascunhos-${uid}`;
  /** @param {string} uid @returns {any[]} */
  function lerLocal(uid) {
    try { return JSON.parse(localStorage.getItem(chaveLocal(uid)) || '[]'); } catch (e) { return []; }
  }
  /** @param {string} uid @param {any[]} lista */
  function gravarLocal(uid, lista) {
    try { localStorage.setItem(chaveLocal(uid), JSON.stringify(lista)); } catch (e) { /* sem espaço no navegador */ }
  }

  /** Dados do editor sem as fotos (arquivo não vai para o rascunho). */
  function dadosParaGuardar() {
    const { referencias: _fotos, ...resto } = dados;
    return { ...resto, formato, lote: { categorias: lote.categorias.slice(), itens: lote.itens, descricaoGeral: lote.descricaoGeral, usarGeral: lote.usarGeral } };
  }
  // Vale como rascunho assim que a pessoa escolhe um serviço.
  const valeComoRascunho = () => lote.categorias.length > 0 && !soPreMarcado;

  /** @returns {Promise<any[]>} */
  async function listarRascunhos() {
    const u = usuarioLogado();
    if (!u) return [];
    /** @type {any[]} */
    let doBanco = [];
    if (!semTabelaDeRascunhos && typeof supabaseClient !== 'undefined') {
      const { data, error } = await supabaseClient.from('pedidos_rascunho')
        .select('id, dados, created_at, updated_at').eq('cliente_id', u.id).order('updated_at', { ascending: false });
      if (!error) doBanco = data || [];
      else if (tabelaFaltando(error)) semTabelaDeRascunhos = true;
    }
    return [...doBanco, ...lerLocal(u.id)];
  }

  /** @param {string|null} id @param {any} conteudo @returns {Promise<string|null>} */
  async function guardarRascunho(id, conteudo) {
    const u = usuarioLogado();
    if (!u) return id;
    const agora = new Date().toISOString();
    const local = !!id && String(id).startsWith('local-');
    if (!local && !semTabelaDeRascunhos && typeof supabaseClient !== 'undefined') {
      const resp = id
        ? await supabaseClient.from('pedidos_rascunho').update({ dados: conteudo, updated_at: agora }).eq('id', id).select('id').maybeSingle()
        : await supabaseClient.from('pedidos_rascunho').insert({ cliente_id: u.id, dados: conteudo }).select('id').single();
      if (!resp.error) return resp.data ? resp.data.id : id;
      // Sem a tabela ou o banco recusou: guarda no navegador para não perder.
      if (tabelaFaltando(resp.error)) semTabelaDeRascunhos = true;
    }
    const lista = lerLocal(u.id);
    const novoId = local ? /** @type {string} */ (id) : `local-${Date.now()}`;
    const i = lista.findIndex(r => r.id === novoId);
    if (i >= 0) lista[i] = { ...lista[i], dados: conteudo, updated_at: agora };
    else lista.unshift({ id: novoId, dados: conteudo, created_at: agora, updated_at: agora });
    gravarLocal(u.id, lista);
    return novoId;
  }

  /** @param {string} id */
  async function apagarRascunho(id) {
    const u = usuarioLogado();
    if (!u || !id) return;
    if (String(id).startsWith('local-')) { gravarLocal(u.id, lerLocal(u.id).filter(r => r.id !== id)); return; }
    if (typeof supabaseClient !== 'undefined') await supabaseClient.from('pedidos_rascunho').delete().eq('id', id);
  }

  /** Salva o que está no editor como rascunho (em fila, para não duplicar). */
  /** Salva o rascunho pouco depois da última mudança (sem botão). */
  /** @type {ReturnType<typeof setTimeout>|null} */
  let timerDoRascunho = null;
  function agendarRascunho() {
    if (timerDoRascunho) clearTimeout(timerDoRascunho);
    timerDoRascunho = setTimeout(() => { timerDoRascunho = null; salvarRascunhoAgora(); }, 1200);
  }

  function salvarRascunhoAgora() {
    if (timerDoRascunho) { clearTimeout(timerDoRascunho); timerDoRascunho = null; }
    if (publicando || publicado || !valeComoRascunho()) return;
    salvandoRascunho = salvandoRascunho.then(guardarRascunhosPorServico).catch(() => {});
  }

  /** Rascunho de cada serviço marcado vira um card próprio (como as publicadas). */
  /** @type {Record<string, string|null>} */
  let rascunhoIds = {};
  async function guardarRascunhosPorServico() {
    const { referencias: _f, ...resto } = dados;
    for (const id of lote.categorias) {
      const it = lote.itens[id];
      if (!it) continue;
      const conteudo = {
        ...resto, formato: 'unico',
        lote: { categorias: [id], itens: { [id]: { ...it, descricao: descricaoDoItem(id) } }, descricaoGeral: '', usarGeral: false }
      };
      rascunhoIds[id] = await guardarRascunho(rascunhoIds[id] || null, conteudo);
    }
    // Serviço desmarcado: o rascunho dele sai. Rascunho antigo (vários serviços num só) também.
    for (const id of Object.keys(rascunhoIds)) {
      if (!lote.categorias.includes(id) && rascunhoIds[id]) { await apagarRascunho(/** @type {string} */ (rascunhoIds[id])); delete rascunhoIds[id]; }
    }
    if (rascunhoId && !Object.values(rascunhoIds).includes(rascunhoId)) { await apagarRascunho(rascunhoId); }
    rascunhoId = null;
  }

  /** Apaga os rascunhos desta solicitação (depois de publicar). */
  async function apagarRascunhosDoEditor() {
    await salvandoRascunho;
    for (const id of Object.values(rascunhoIds)) if (id) await apagarRascunho(id);
    if (rascunhoId) await apagarRascunho(rascunhoId);
    rascunhoIds = {};
    rascunhoId = null;
  }

  /** Solicitação publicada → rascunho com "(cópia)" no título. @param {any} p */
  function dadosDoPedido(p) {
    const cat = categoriaPorId(p.categoria);
    const conhecida = CELEBRACOES.some(c => c.id === p.tipo_celebracao && c.id !== 'outro');
    const { referencias: _f, ...vazio } = rascunhoVazio();
    return {
      ...vazio,
      titulo: `${String(p.titulo || (cat ? cat.nome : 'Solicitação')).trim()} (cópia)`.slice(0, 120),
      categoria: p.categoria || '',
      especialidades: Array.isArray(p.especialidades) ? p.especialidades : [],
      tipoCelebracao: conhecida ? p.tipo_celebracao : (p.tipo_celebracao ? 'outro' : ''),
      celebracaoOutro: conhecida ? '' : String(p.tipo_celebracao || ''),
      dataEvento: p.data_evento || '',
      dataFlexivel: !!p.data_flexivel,
      cep: p.cep || '', cidade: p.cidade || '', bairro: p.bairro || '', uf: p.uf || '',
      convidados: p.convidados || '', periodo: p.periodo || '', horasServico: p.horas_servico ?? null,
      valorMin: p.valor_min ?? null, valorMax: p.valor_max ?? null,
      aceitaForaDaFaixa: !!p.aceita_fora_da_faixa,
      descricao: p.descricao || '',
      limitePropostas: p.limite_propostas ?? null
    };
  }

  // --------------------------------------------------------------------------
  // Contratos › Solicitações: lista no modelo "All job posts" (título, quando
  // foi criada, situação, propostas e mensagens, menu ⋯).
  // --------------------------------------------------------------------------

  /** @param {string} msg */
  function avisoNaLista(msg) {
    const el = document.getElementById('rfp-lista-aviso');
    if (!el) return;
    el.textContent = msg;
    el.classList.toggle('hidden', !msg);
    if (msg) setTimeout(() => el.classList.add('hidden'), 6000);
  }

  /** @type {Record<string, any>} */
  let pedidosCarregados = {};
  /** @type {Record<string, any>} */
  let rascunhosCarregados = {};
  /** @type {Record<string, { total: number, novas: number, mensagens: number }>} */
  let numerosDasPropostas = {};
  // Seleção para excluir em massa: "r:<id>" (rascunho) ou "p:<id>" (publicada).
  /** @type {Set<string>} */
  const selecionadas = new Set();
  // Paginação igual a Meus convidados: 15 por página (ou 25/50).
  let porPagina = 15;
  let pagina = 1;
  /** @type {any[]} */
  let itensDaLista = [];

  /** "há 5 min", "há 2 h", "há 3 dias", "em 12 de set. de 2026". @param {string} iso */
  function haQuanto(iso) {
    const t = new Date(iso).getTime();
    if (!Number.isFinite(t)) return '';
    const min = Math.max(1, Math.round((Date.now() - t) / 60000));
    if (min < 60) return `há ${min} min`;
    const h = Math.round(min / 60);
    if (h < 24) return h === 1 ? 'há 1 hora' : `há ${h} horas`;
    const d = Math.round(h / 24);
    if (d < 30) return d === 1 ? 'há 1 dia' : `há ${d} dias`;
    return `em ${dataCurta(iso)}`;
  }
  /** @param {string} iso */
  const dataCurta = (iso) => {
    const d = new Date(iso);
    return Number.isFinite(d.getTime()) ? d.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short', year: 'numeric' }).replace(/\./g, '') : '';
  };

  /** @param {[string, string][]} opcoes */
  const menuDaLinha = (opcoes) => `
    <div class="rfp-menu-wrap">
      <button type="button" class="rfp-post-mais" data-rfp-menu aria-label="Mais ações">
        <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="5" cy="12" r="1.8"/><circle cx="12" cy="12" r="1.8"/><circle cx="19" cy="12" r="1.8"/></svg>
      </button>
      <div class="rfp-menu hidden" role="menu">
        ${opcoes.map(([acao, texto]) => `<button type="button" role="menuitem" data-rfp-acao="${acao}">${esc(texto)}</button>`).join('')}
      </div>
    </div>`;

  /** @param {string} texto @param {boolean} [comBotao] */
  const listaVazia = (texto, comBotao) => `
    <div class="rfp-posts-vazio">
      <p>${esc(texto)}</p>
      ${comBotao ? '<button type="button" class="rfp-post-criar" data-rfp-criar>Criar solicitação</button>' : ''}
    </div>`;

  /** @param {any} it */
  function linhaDaSolicitacao(it) {
    if (it.tipo === 'rascunho') {
      const d = it.r.dados || {};
      const l = loteDosDados(d);
      const titulo = l.categorias.length > 1
        ? `${l.categorias.length} serviços: ${l.categorias.map(id => CATEGORIA_CURTA[id] || id).join(', ')}`
        : (l.categorias.length ? (String(l.itens[l.categorias[0]].titulo || '').trim() || CATEGORIA_CURTA[l.categorias[0]] || 'Solicitação') : 'Solicitação sem título');
      return `
        <div class="rfp-post" data-rascunho-id="${esc(it.id)}">
          <div class="rfp-post-info">
            <div class="rfp-post-topo">
              <input type="checkbox" class="gifts-select-all-check rfp-select-check" data-rfp-sel="r:${esc(it.id)}"${selecionadas.has('r:' + it.id) ? ' checked' : ''} aria-label="Selecionar ${esc(titulo)}">
              <button type="button" class="rfp-post-titulo rfp-post-link" data-rfp-detalhe="${esc(it.id)}">${esc(titulo)}</button>
            </div>
            <p class="rfp-post-criado">Criada ${esc(haQuanto(it.criado))} por você</p>
            <p class="rfp-post-situacao"><b>Rascunho</b> · Salvo em ${esc(dataCurta(it.quando))}</p>
          </div>
          <div class="rfp-post-num"></div>
          <div class="rfp-post-num"></div>
          <button type="button" class="rfp-post-botao" data-rfp-acao="editar">Editar rascunho</button>
          ${menuDaLinha(l.categorias.length > 1 ? [['editar', 'Editar rascunho'], ['remover-rascunho', 'Remover']] : [['editar-titulo', 'Editar título'], ['editar', 'Editar rascunho'], ['remover-rascunho', 'Remover']])}
        </div>`;
    }
    const p = it.p;
    const cat = categoriaPorId(p.categoria);
    const titulo = p.titulo || (cat ? `${cat.nome} para ${nomeDaCelebracao(p.tipo_celebracao).toLowerCase()}` : 'Solicitação');
    const n = numerosDasPropostas[p.id] || { total: p.propostas_recebidas || 0, novas: 0, mensagens: 0 };
    const situacao = p.status === 'aberto' ? 'Publicada' : (SITUACOES[/** @type {'fechado'} */ (p.status)] || p.status);
    return `
      <div class="rfp-post" data-rfp-id="${esc(p.id)}">
        <div class="rfp-post-info">
          <div class="rfp-post-topo">
            <input type="checkbox" class="gifts-select-all-check rfp-select-check" data-rfp-sel="p:${esc(p.id)}"${selecionadas.has('p:' + p.id) ? ' checked' : ''} aria-label="Selecionar ${esc(titulo)}">
            <button type="button" class="rfp-post-titulo rfp-post-link" data-rfp-detalhe="${esc(p.id)}">${esc(titulo)}</button>
          </div>
          <p class="rfp-post-criado">Criada ${esc(haQuanto(p.created_at))} por você</p>
          <p class="rfp-post-situacao"><b>${esc(situacao)}</b> · ${esc(dataCurta(p.created_at))}</p>
        </div>
        <div class="rfp-post-num"><b>${n.mensagens}</b><span>Mensagens</span></div>
        <div class="rfp-post-num"><b>${n.total}${n.novas ? ` (${n.novas} ${n.novas === 1 ? 'nova' : 'novas'})` : ''}</b><span>Propostas</span></div>
        <button type="button" class="rfp-post-botao" data-rfp-ver="${esc(p.id)}">Ver propostas</button>
        ${menuDaLinha([['editar-titulo', 'Editar título'], ['duplicar', 'Duplicar'], ['excluir', 'Remover']])}
      </div>`;
  }

  async function mostrarLista() {
    if (vendoPropostas) modoPropostas(false);
    document.getElementById('rfp-lista-wrap')?.classList.remove('hidden');
    document.getElementById('rfp-propostas')?.classList.add('hidden');
    const caixa = document.getElementById('rfp-lista');
    if (!caixa) return;
    const u = usuarioLogado();
    if (!u || typeof supabaseClient === 'undefined') {
      caixa.innerHTML = listaVazia('Entre na sua conta para ver suas solicitações.');
      return;
    }
    if (!caixa.children.length) caixa.innerHTML = listaVazia('Carregando…');
    await salvandoRascunho;
    const [ped, rascunhos] = await Promise.all([
      supabaseClient.from('pedidos_orcamento').select('*').eq('cliente_id', u.id).order('created_at', { ascending: false }),
      listarRascunhos()
    ]);
    const falhou = !!ped.error && !tabelaAusente(ped.error);
    if (falhou && !rascunhos.length) {
      caixa.innerHTML = listaVazia('Não foi possível carregar suas solicitações agora.');
      return;
    }
    /** @type {any[]} */
    const pedidos = (!ped.error && ped.data) || [];
    pedidosCarregados = {};
    pedidos.forEach(p => { pedidosCarregados[p.id] = p; });
    rascunhosCarregados = {};
    rascunhos.forEach(r => { rascunhosCarregados[r.id] = r; });
    // O número da aba conta tudo o que aparece na lista: solicitações e rascunhos.
    const ativas = pedidos.length + rascunhos.length;
    const abaMinhas = document.querySelector('#pedidos-abas [data-pedidos-aba="minhas"]');
    if (abaMinhas) abaMinhas.textContent = ativas ? `Minhas solicitações (${ativas})` : 'Minhas solicitações';
    numerosDasPropostas = {};
    if (pedidos.length) {
      const { data: props, error } = await supabaseClient.from('propostas_pedido')
        .select('pedido_id, status, conversation_id').in('pedido_id', pedidos.map(p => p.id));
      if (!error) {
        pedidos.forEach(p => { numerosDasPropostas[p.id] = { total: 0, novas: 0, mensagens: 0 }; });
        (props || []).forEach(x => {
          const n = numerosDasPropostas[x.pedido_id];
          if (!n || x.status === 'retirada') return;
          n.total++;
          if (x.status === 'enviada') n.novas++;
          if (x.conversation_id) n.mensagens++;
        });
      }
    }
    const itens = [
      ...rascunhos.map(r => ({ tipo: 'rascunho', id: r.id, quando: r.updated_at || r.created_at, criado: r.created_at, r })),
      ...pedidos.map(p => ({ tipo: 'pedido', id: p.id, quando: p.created_at, criado: p.created_at, p }))
    ].sort((a, b) => String(b.quando).localeCompare(String(a.quando)));
    // Cada serviço é uma solicitação própria: um card para cada, mesmo as do mesmo evento completo.
    // Some da seleção o que não está mais na lista.
    const existentes = new Set(itens.map(it => (it.tipo === 'rascunho' ? 'r:' : 'p:') + it.id));
    [...selecionadas].forEach(k => { if (!existentes.has(k)) selecionadas.delete(k); });
    itensDaLista = itens;
    desenharPagina();
  }

  /** Lista da página atual + rodapé "Mostrar 15 · Página 1 de 3". */
  function desenharPagina() {
    const caixa = document.getElementById('rfp-lista');
    const rodape = document.getElementById('rfp-paginacao');
    if (!caixa) return;
    const total = itensDaLista.length;
    const paginas = Math.max(1, Math.ceil(total / porPagina));
    pagina = Math.min(Math.max(1, pagina), paginas);
    const daPagina = itensDaLista.slice((pagina - 1) * porPagina, pagina * porPagina);
    caixa.innerHTML = total ? daPagina.map(it => linhaDaSolicitacao(it)).join('') : listaVazia('Você ainda não criou nenhuma solicitação.', true);
    if (rodape) {
      rodape.hidden = !total;
      rodape.innerHTML = total ? `
        <div class="guests-pagination-size">
          <label for="rfp-por-pagina">Mostrar</label>
          <select id="rfp-por-pagina">
            ${[15, 25, 50].map(n => `<option value="${n}"${n === porPagina ? ' selected' : ''}>${n}</option>`).join('')}
          </select>
        </div>
        <div class="guests-pagination-nav">
          <button type="button" class="guests-pagination-btn" data-rfp-pagina="-1" aria-label="Página anterior"${pagina <= 1 ? ' disabled' : ''}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="m15 19-7-7 7-7"/></svg>
          </button>
          <span>Página ${pagina} de ${paginas}</span>
          <button type="button" class="guests-pagination-btn" data-rfp-pagina="1" aria-label="Próxima página"${pagina >= paginas ? ' disabled' : ''}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="m9 5 7 7-7 7"/></svg>
          </button>
        </div>` : '';
    }
    atualizarSelecao();
  }

  document.addEventListener('change', (e) => {
    const el = /** @type {HTMLSelectElement} */ (e.target);
    if (!el || el.id !== 'rfp-por-pagina') return;
    porPagina = parseInt(el.value, 10) || 15;
    pagina = 1;
    desenharPagina();
  });
  document.addEventListener('click', (e) => {
    const passo = e.target instanceof Element ? /** @type {HTMLElement|null} */ (e.target.closest('[data-rfp-pagina]')) : null;
    if (!passo) return;
    pagina += Number(passo.dataset.rfpPagina) || 0;
    desenharPagina();
    document.getElementById('rfp-caixa')?.scrollIntoView({ block: 'start' });
  });

  /** Barra do topo: aparece com alguma solicitação marcada (quantas + lixeira). */
  function atualizarSelecao() {
    const barra = document.getElementById('rfp-selecao-barra');
    const checks = /** @type {HTMLInputElement[]} */ ([...document.querySelectorAll('#rfp-lista .rfp-select-check')]);
    const qtd = selecionadas.size;
    if (barra) barra.hidden = qtd === 0;
    const cont = document.getElementById('rfp-selecao-contagem');
    if (cont) cont.textContent = qtd === 1 ? '1 selecionada' : `${qtd} selecionadas`;
    const todas = /** @type {HTMLInputElement|null} */ (document.getElementById('rfp-select-all'));
    if (todas) {
      const marcadas = checks.filter(c => c.checked).length;
      todas.checked = checks.length > 0 && marcadas === checks.length;
      todas.indeterminate = marcadas > 0 && marcadas < checks.length;
    }
    const lixeira = document.getElementById('btn-rfp-excluir-selecionadas');
    if (lixeira) lixeira.title = qtd === 1 ? 'Remover 1 solicitação selecionada' : `Remover ${qtd} solicitações selecionadas`;
  }

  document.addEventListener('change', (e) => {
    const el = /** @type {HTMLInputElement} */ (e.target);
    if (!el || !el.matches) return;
    if (el.matches('#rfp-lista .rfp-select-check')) {
      const k = el.dataset.rfpSel || '';
      if (el.checked) selecionadas.add(k); else selecionadas.delete(k);
      atualizarSelecao();
      return;
    }
    if (el.id === 'rfp-select-all') {
      document.querySelectorAll('#rfp-lista .rfp-select-check').forEach(c => {
        const check = /** @type {HTMLInputElement} */ (c);
        check.checked = el.checked;
        if (el.checked) selecionadas.add(check.dataset.rfpSel || ''); else selecionadas.delete(check.dataset.rfpSel || '');
      });
      atualizarSelecao();
    }
  });

  /** Lixeira da barra: exclui as marcadas (publicadas e rascunhos). */
  async function excluirSelecionadas() {
    const chaves = [...selecionadas];
    if (!chaves.length || typeof supabaseClient === 'undefined') return;
    const w = /** @type {any} */ (window);
    const pedidos = chaves.filter(k => k.startsWith('p:')).map(k => k.slice(2));
    const rascunhos = chaves.filter(k => k.startsWith('r:')).map(k => k.slice(2));
    const n = chaves.length;
    const ok = w.confirmarNaLove ? await w.confirmarNaLove({
      titulo: n === 1 ? 'Deseja remover 1 solicitação selecionada?' : `Deseja remover ${n} solicitações selecionadas?`,
      texto: pedidos.length ? 'As publicadas deixam de aparecer para os fornecedores. Essa ação não pode ser desfeita.' : 'Os rascunhos serão apagados. Essa ação não pode ser desfeita.',
      botao: 'Remover',
      aoConfirmar: async () => {
        if (pedidos.length) {
          const { error } = await supabaseClient.from('pedidos_orcamento').delete().in('id', pedidos);
          if (error) return 'Não foi possível remover agora. Tente de novo.';
          pedidos.forEach(id => selecionadas.delete('p:' + id));
        }
        for (const id of rascunhos) { await apagarRascunho(id); selecionadas.delete('r:' + id); }
        return null;
      }
    }) : false;
    if (!ok) return;
    avisoNaLista(n === 1 ? 'Solicitação removida.' : `${n} solicitações removidas.`);
    mostrarLista();
  }
  document.addEventListener('click', (e) => {
    if (e.target instanceof Element && e.target.closest('#btn-rfp-excluir-selecionadas')) excluirSelecionadas();
  });

  /** Rascunho no mesmo formato de uma solicitação publicada (para os detalhes). @param {any} d */
  function infoDoRascunho(d) {
    const l = loteDosDados(d);
    const id0 = l.categorias[0] || '';
    const it = l.itens[id0];
    if (it) d = { ...d, titulo: l.categorias.length > 1 ? `${l.categorias.length} serviços: ${l.categorias.map(id => CATEGORIA_CURTA[id] || id).join(', ')}` : it.titulo, categoria: id0, especialidades: it.especialidades, valorMin: it.valorMin, valorMax: it.valorMax, aceitaForaDaFaixa: it.aceitaForaDaFaixa, descricao: it.descricao || l.descricaoGeral };
    return {
      titulo: d.titulo, categoria: d.categoria, especialidades: d.especialidades || [],
      tipo_celebracao: d.tipoCelebracao === 'outro' ? d.celebracaoOutro : d.tipoCelebracao,
      data_evento: d.dataEvento, data_flexivel: d.dataFlexivel, cep: d.cep, cidade: d.cidade, bairro: d.bairro, uf: d.uf,
      convidados: d.convidados, periodo: d.periodo, horas_servico: d.horasServico,
      valor_min: d.valorMin, valor_max: d.valorMax, aceita_fora_da_faixa: d.aceitaForaDaFaixa,
      descricao: d.descricao, referencias: [], limite_propostas: d.limitePropostas
    };
  }

  /** Clique no título: a solicitação inteira, na mesma caixa da lista
   *  (modelo da página do job: descrição no topo, depois os blocos). @param {string} id */
  function mostrarDetalhe(id) {
    const caixa = document.getElementById('rfp-lista');
    if (!caixa) return;
    const pedido = pedidosCarregados[id];
    const rascunho = rascunhosCarregados[id];
    if (!pedido && !rascunho) return;
    const info = pedido || infoDoRascunho((rascunho && rascunho.dados) || {});
    const cat = categoriaPorId(info.categoria);
    const traco = '—';
    const quando = info.data_flexivel ? 'Data flexível' : (formatarData(info.data_evento || '') || traco);
    const local = [[info.cidade, info.uf].filter(Boolean).join(' - '), info.bairro, info.cep ? `CEP ${info.cep}` : ''].filter(Boolean).join(' · ') || traco;
    const periodo = info.periodo === 'horas' ? `${info.horas_servico || '?'} ${textoDeHoras(info.horas_servico) || 'horas'} de serviço` : (nomeDe(PERIODOS, info.periodo) || traco);
    const temOrcamento = !!(info.valor_min || info.valor_max);
    const meta = rascunho
      ? `Rascunho · Salvo em ${dataCurta(rascunho.updated_at || rascunho.created_at)}`
      : `${info.status === 'aberto' ? 'Publicado em' : `${SITUACOES[/** @type {'fechado'} */ (info.status)] || info.status} · Criado em`} ${dataCurta(info.created_at)}`;
    const n = pedido ? (numerosDasPropostas[id] || { total: pedido.propostas_recebidas || 0, novas: 0, mensagens: 0 }) : null;
    const fotos = Array.isArray(info.referencias) ? info.referencias : [];
    const tags = Array.isArray(info.especialidades) ? info.especialidades : [];
    const icone = (/** @type {string} */ d) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
    const destaques = [
      [icone('<rect x="3.5" y="5" width="17" height="15" rx="2"/><path d="M3.5 9.5h17M8 3v4M16 3v4"/>'), quando, 'Data do evento'],
      [icone('<circle cx="9" cy="8" r="3.2"/><path d="M3 19c.6-3.2 3-5 6-5s5.4 1.8 6 5M16 5.2a3 3 0 0 1 0 5.6M18 14.3c1.7.6 2.8 2.2 3 4.7"/>'), info.convidados ? (nomeDe(CONVIDADOS, info.convidados) || traco) : traco, 'Convidados'],
      [icone('<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>'), periodo, 'Horário / duração']
    ];
    caixa.innerHTML = `
      <div class="rfp-detalhe">
        <div class="rfp-detalhe-cabeca">
          <button type="button" class="rfp-detalhe-voltar" data-rfp-detalhe-voltar aria-label="Voltar para Minhas solicitações">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M19 12H5m0 0 7 7m-7-7 7-7"/></svg>
          </button>
          <div class="rfp-detalhe-nome">
            <h3 class="rfp-detalhe-titulo">${esc(String(info.titulo || '').trim() || (cat ? cat.nome : 'Solicitação'))}</h3>
            <p class="rfp-detalhe-meta">${esc(meta)}</p>
          </div>
          ${pedido
            ? `<button type="button" class="rfp-post-botao" data-rfp-ver="${esc(id)}">Propostas recebidas</button>`
            : `<button type="button" class="rfp-post-botao" data-rfp-editar-rascunho="${esc(id)}">Editar rascunho</button>`}
        </div>

        <section class="rfp-detalhe-sec">
          <h4 class="rfp-detalhe-sub">Descrição</h4>
          <p class="rfp-detalhe-desc">${esc(String(info.descricao || '').trim() || 'Sem descrição.')}</p>
        </section>

        <section class="rfp-detalhe-sec rfp-detalhe-destaques">
          ${destaques.map(([_svg, valor, rotulo]) => `
            <div class="rfp-detalhe-destaque"><span class="rfp-detalhe-destaque-rotulo">${esc(rotulo)}</span><b>${esc(valor)}</b></div>`).join('')}
        </section>

        <section class="rfp-detalhe-sec rfp-detalhe-linhas">
          <p><b>Categoria:</b> ${esc(cat ? cat.nome : (info.categoria || traco))}</p>
          <p><b>Tipo de celebração:</b> ${esc(nomeDaCelebracao(info.tipo_celebracao) || traco)}</p>
          <p><b>Local:</b> ${esc(local)}</p>
          <p><b>Orçamento:</b> ${esc(textoDoOrcamento(info.valor_min, info.valor_max, info.faixa))}${temOrcamento ? esc(info.aceita_fora_da_faixa ? ' · aceita propostas fora da faixa' : ' · não aceita propostas fora da faixa') : ''}</p>
        </section>

        ${tags.length ? `
          <section class="rfp-detalhe-sec">
            <h4 class="rfp-detalhe-sub">Subcategorias</h4>
            <div class="rfp-detalhe-tags">${tags.map((/** @type {string} */ t) => `<span>${esc(t)}</span>`).join('')}</div>
          </section>` : ''}

        ${fotos.length ? `
          <section class="rfp-detalhe-sec">
            <h4 class="rfp-detalhe-sub">Fotos de referência</h4>
            <div class="rfp-detalhe-fotos">${fotos.map((/** @type {string} */ u) => `<a href="${esc(u)}" target="_blank" rel="noopener"><img src="${esc(u)}" alt=""></a>`).join('')}</div>
          </section>` : ''}

        <section class="rfp-detalhe-sec rfp-detalhe-linhas">
          <h4 class="rfp-detalhe-sub">Atividade nesta solicitação</h4>
          ${n ? `<p>Propostas: ${n.total}${n.novas ? ` (${n.novas} ${n.novas === 1 ? 'nova' : 'novas'})` : ''}</p><p>Mensagens: ${n.mensagens}</p>` : ''}
          <p>Limite: ${esc(info.limite_propostas ? `até ${info.limite_propostas} propostas` : 'sem limite de propostas')}</p>
        </section>
      </div>`;
  }

  /** "Editar título": o título da linha vira um campo; Enter/fora salva, Esc cancela. @param {HTMLElement} linha */
  function editarTitulo(linha) {
    const atual = /** @type {HTMLElement|null} */ (linha.querySelector('.rfp-post-titulo'));
    if (!atual) return;
    const campo = document.createElement('input');
    campo.type = 'text';
    campo.className = 'rfp-campo rfp-post-titulo-input';
    campo.maxLength = 120;
    campo.value = (atual.textContent || '').trim();
    campo.setAttribute('aria-label', 'Título da solicitação');
    atual.replaceWith(campo);
    campo.focus();
    campo.select();
    let feito = false;
    const concluir = async (/** @type {boolean} */ salvar) => {
      if (feito) return;
      feito = true;
      const novo = campo.value.trim();
      if (salvar && novo && typeof supabaseClient !== 'undefined') {
        if (linha.dataset.rascunhoId) {
          const r = rascunhosCarregados[linha.dataset.rascunhoId];
          if (r) {
            // Rascunho de um serviço: o título é o do serviço.
            const d = { ...(r.dados || {}), titulo: novo };
            const l = loteDosDados(d);
            if (l.categorias.length === 1) { l.itens[l.categorias[0]].titulo = novo; l.itens[l.categorias[0]].tituloEditado = true; d.lote = { categorias: l.categorias, itens: l.itens, descricaoGeral: l.descricaoGeral }; }
            await guardarRascunho(r.id, d);
          }
        } else if (linha.dataset.rfpId) {
          const { error } = await supabaseClient.from('pedidos_orcamento').update({ titulo: novo }).eq('id', linha.dataset.rfpId);
          if (error) avisoNaLista('Não foi possível salvar o título agora. Tente de novo.');
        }
      }
      mostrarLista();
    };
    campo.addEventListener('keydown', (ev) => {
      if (ev.key === 'Enter') { ev.preventDefault(); concluir(true); }
      if (ev.key === 'Escape') { ev.preventDefault(); concluir(false); }
    });
    campo.addEventListener('blur', () => concluir(true));
  }

  /** @param {string} id */
  function editarRascunho(id) {
    const r = rascunhosCarregados[id];
    if (!r) return;
    rascunhoPendente = r;
    mostrarAba('nova');
  }

  // --------------------------------------------------------------------------
  // Propostas de uma solicitação (cards, no modelo "All proposals")
  // --------------------------------------------------------------------------
  /** @type {any[]} */
  let propostasAbertas = [];
  let abaDasPropostas = 'todas';
  /** @param {number} v */
  const reais = (v) => `R$ ${Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  let vendoPropostas = false;
  /** Cabeçalho "Propostas recebidas" com a seta à esquerda; esconde as abas de Contratos. @param {boolean} ligado */
  function modoPropostas(ligado) {
    vendoPropostas = ligado;
    const titulo = document.getElementById('b2b-toolbar-title');
    const voltar = document.getElementById('btn-rfp-voltar');
    if (titulo) titulo.textContent = ligado ? 'Propostas recebidas' : TITULO_DA_LISTA;
    if (voltar) { voltar.hidden = !ligado; voltar.setAttribute('aria-label', 'Voltar para Minhas solicitações'); }
    document.getElementById('pedidos-abas')?.classList.toggle('hidden', ligado);
  }

  /** @param {string} id */
  async function mostrarPropostas(id) {
    const wrap = document.getElementById('rfp-lista-wrap');
    const det = document.getElementById('rfp-propostas');
    if (!det || typeof supabaseClient === 'undefined') return;
    wrap?.classList.add('hidden');
    det.classList.remove('hidden');
    modoPropostas(true);
    window.scrollTo({ top: 0 });
    abaDasPropostas = 'todas';
    propostasAbertas = [];
    const ped = pedidosCarregados[id] || {};
    const cat = categoriaPorId(ped.categoria);
    det.innerHTML = `
      <div class="rfp-propostas-topo">
        <div class="min-w-0">
          <h3 class="rfp-propostas-titulo">${esc(ped.titulo || (cat ? cat.nome : 'Solicitação'))}</h3>
        </div>
      </div>
      <div class="love-tabs-nav rfp-propostas-abas" id="rfp-propostas-abas" role="tablist"></div>
      <div class="rfp-props" id="rfp-propostas-lista">${listaVazia('Carregando…')}</div>`;
    const base = 'id, fornecedor_id, valor, inclui, mensagem, validade, prazo_entrega, status, created_at, conversation_id, fornecedores(company_name, logo_url, avatar_url, city, state)';
    let { data, error } = await supabaseClient
      .from('propostas_pedido')
      .select(`${base}, produto_id, products(name, category, cover_image_url, price)`)
      .eq('pedido_id', id)
      .order('created_at', { ascending: false });
    if (error && !tabelaFaltando(error)) {
      ({ data, error } = await supabaseClient.from('propostas_pedido').select(base).eq('pedido_id', id).order('created_at', { ascending: false }));
    }
    const lista = document.getElementById('rfp-propostas-lista');
    if (!lista) return;
    if (error && !tabelaFaltando(error)) { lista.innerHTML = listaVazia('Não foi possível carregar as propostas agora.'); return; }
    propostasAbertas = (error ? [] : data || []).filter(x => x.status !== 'retirada');
    desenharPropostas();
    // Abriu a solicitação: as propostas novas passam a "Vista".
    if (propostasAbertas.some(x => x.status === 'enviada')) {
      supabaseClient.from('propostas_pedido').update({ status: 'vista' }).eq('pedido_id', id).eq('status', 'enviada').then(() => {});
    }
  }

  function desenharPropostas() {
    const abas = document.getElementById('rfp-propostas-abas');
    const lista = document.getElementById('rfp-propostas-lista');
    if (!abas || !lista) return;
    /** @type {Record<string, any[]>} */
    const grupos = {
      todas: propostasAbertas.filter(x => x.status !== 'recusada'),
      mensagens: propostasAbertas.filter(x => x.conversation_id && x.status !== 'recusada'),
      aceitas: propostasAbertas.filter(x => x.status === 'aceita'),
      arquivadas: propostasAbertas.filter(x => x.status === 'recusada')
    };
    const rotulos = { todas: 'Todas as propostas', mensagens: 'Mensagens', aceitas: 'Aceitas', arquivadas: 'Recusadas' };
    abas.innerHTML = Object.entries(rotulos).map(([id, nome]) =>
      `<button type="button" class="love-tab-item${abaDasPropostas === id ? ' active' : ''}" data-rfp-aba-propostas="${id}">${nome} (${grupos[id].length})</button>`).join('');
    const itens = grupos[abaDasPropostas] || [];
    if (!itens.length) {
      lista.innerHTML = listaVazia(abaDasPropostas === 'todas' ? 'Nenhum fornecedor enviou proposta ainda.' : 'Nenhuma proposta aqui.');
      return;
    }
    lista.innerHTML = itens.map(x => {
      const f = /** @type {any} */ (x.fornecedores) || {};
      const produto = /** @type {any} */ (x.products) || null;
      const nome = f.company_name || 'Fornecedor';
      const foto = f.logo_url || f.avatar_url || '';
      const local = [f.city, f.state].filter(Boolean).join(' - ');
      const selo = x.status === 'enviada' ? '<span class="rfp-selo">Nova</span>' : x.status === 'aceita' ? '<span class="rfp-selo rfp-selo-aceita">Aceita</span>' : x.status === 'recusada' ? '<span class="rfp-selo rfp-selo-recusada">Recusada</span>' : '';
      const fechada = x.status === 'aceita' || x.status === 'recusada';
      return `
        <article class="rfp-prop">
          ${selo ? `<div class="rfp-prop-selos">${selo}</div>` : ''}
          <div class="rfp-prop-topo">
            ${foto ? `<img src="${esc(foto)}" alt="" class="rfp-prop-foto">` : `<span class="rfp-prop-foto rfp-prop-inicial">${esc(nome.charAt(0).toUpperCase())}</span>`}
            <div class="rfp-prop-quem">
              <p class="rfp-prop-nome">${esc(nome)}</p>
              ${produto && produto.name ? `<p class="rfp-prop-produto-nome">${esc(produto.name)}</p>` : ''}
              ${local ? `<p class="rfp-prop-local">${esc(local)}</p>` : ''}
            </div>
            <div class="rfp-prop-acoes">
              <button type="button" class="rfp-conversar" data-rfp-conversar="${esc(x.fornecedor_id)}">Conversar</button>
              ${fechada ? '' : `<button type="button" class="rfp-prop-aceitar" data-rfp-proposta="${esc(x.id)}" data-rfp-proposta-status="aceita">Aceitar proposta</button>`}
            </div>
          </div>

          <div class="rfp-prop-dados">
            <p><b>${esc(reais(x.valor))}</b><span>Valor total da proposta</span></p>
            <p><b>${esc(x.prazo_entrega || '—')}</b><span>Prazo de entrega</span></p>
            <p><b>${esc(x.validade ? formatarData(String(x.validade).slice(0, 10)) : '—')}</b><span>Válida até</span></p>
            <p><b>${esc(haQuanto(x.created_at))}</b><span>Enviada</span></p>
          </div>

          ${produto && produto.name ? `
            <div class="rfp-prop-produto">
              ${produto.cover_image_url ? `<img src="${esc(produto.cover_image_url)}" alt="">` : ''}
              <div><span class="rfp-prop-rotulo">Serviço ofertado</span><p>${esc(produto.name)}${produto.category ? ` · ${esc(produto.category)}` : ''}</p></div>
            </div>` : ''}

          <div class="rfp-prop-bloco">
            <span class="rfp-prop-rotulo">O que está incluso</span>
            <p class="rfp-prop-texto">${esc(x.inclui)}</p>
          </div>
          ${x.mensagem ? `
            <div class="rfp-prop-bloco">
              <span class="rfp-prop-rotulo">Mensagem do fornecedor</span>
              <p class="rfp-prop-texto">${esc(x.mensagem)}</p>
            </div>` : ''}
          ${fechada ? '' : `<button type="button" class="rfp-prop-recusar" data-rfp-proposta="${esc(x.id)}" data-rfp-proposta-status="recusada">Recusar proposta</button>`}
        </article>`;
    }).join('');
  }

  /** @param {string} id @param {'aceita'|'recusada'} status */
  async function mudarProposta(id, status) {
    const w = /** @type {any} */ (window);
    const ok = w.confirmarNaLove ? await w.confirmarNaLove(status === 'aceita'
      ? { titulo: 'Aceitar esta proposta?', texto: 'O fornecedor é avisado e vocês combinam os próximos passos pelo chat.', botao: 'Aceitar' }
      : { titulo: 'Recusar esta proposta?', texto: 'O fornecedor é avisado de que a proposta foi recusada.', botao: 'Recusar' }) : true;
    if (!ok) return;
    const { error } = await supabaseClient.from('propostas_pedido').update({ status }).eq('id', id);
    if (error) return;
    const x = propostasAbertas.find(p => p.id === id);
    if (x) x.status = status;
    desenharPropostas();
  }

  // Ações da lista e das propostas.
  document.addEventListener('click', async (e) => {
    const alvo = e.target instanceof Element ? e.target : null;
    if (!alvo) return;
    if (alvo.closest('[data-rfp-propostas-voltar]')) { mostrarLista(); return; }
    if (alvo.closest('[data-rfp-criar]')) { mostrarAba('nova'); return; }
    const detalhe = /** @type {HTMLElement|null} */ (alvo.closest('[data-rfp-detalhe]'));
    if (detalhe) { mostrarDetalhe(detalhe.dataset.rfpDetalhe || ''); return; }
    if (alvo.closest('[data-rfp-detalhe-voltar]')) { mostrarLista(); return; }
    const editarDoDetalhe = /** @type {HTMLElement|null} */ (alvo.closest('[data-rfp-editar-rascunho]'));
    if (editarDoDetalhe) { editarRascunho(editarDoDetalhe.dataset.rfpEditarRascunho || ''); return; }
    const abaPedidos = /** @type {HTMLElement|null} */ (alvo.closest('[data-pedidos-aba]'));
    if (abaPedidos) { const a = abaPedidos.dataset.pedidosAba; mostrarAba(a === 'minhas' ? 'minhas' : a === 'lote' ? 'lote' : 'nova'); return; }
    const conversar = /** @type {HTMLElement|null} */ (alvo.closest('[data-rfp-conversar]'));
    if (conversar) { const w = /** @type {any} */ (window); if (w.loveAbrirChatComFornecedor) w.loveAbrirChatComFornecedor(conversar.dataset.rfpConversar); return; }
    const mudar = /** @type {HTMLElement|null} */ (alvo.closest('[data-rfp-proposta-status]'));
    if (mudar) { mudarProposta(mudar.dataset.rfpProposta || '', /** @type {any} */ (mudar.dataset.rfpPropostaStatus)); return; }
    const aba = /** @type {HTMLElement|null} */ (alvo.closest('[data-rfp-aba-propostas]'));
    if (aba) { abaDasPropostas = aba.dataset.rfpAbaPropostas || 'todas'; desenharPropostas(); return; }

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
    const linha = /** @type {HTMLElement|null} */ (alvo.closest('#rfp-lista .rfp-post'));
    if (!acao) {
      // A linha não é clicável: só o botão "Ver propostas".
      const ver = /** @type {HTMLElement|null} */ (alvo.closest('[data-rfp-ver]'));
      if (ver) mostrarPropostas(ver.dataset.rfpVer || '');
      return;
    }
    if (!linha || typeof supabaseClient === 'undefined') return;
    const tipo = acao.dataset.rfpAcao;
    const w = /** @type {any} */ (window);
    if (tipo === 'editar-titulo') { editarTitulo(linha); return; }
    if (tipo === 'editar') { editarRascunho(linha.dataset.rascunhoId || ''); return; }
    if (tipo === 'remover-rascunho') {
      const ok = w.confirmarNaLove ? await w.confirmarNaLove({ titulo: 'Remover este rascunho?', texto: 'O que você preencheu até aqui será apagado.', botao: 'Remover' }) : false;
      if (!ok) return;
      await apagarRascunho(linha.dataset.rascunhoId || '');
      avisoNaLista('Rascunho removido.');
      mostrarLista();
      return;
    }
    const id = linha.dataset.rfpId || '';
    if (tipo === 'duplicar') {
      const p = pedidosCarregados[id];
      if (!p) return;
      await guardarRascunho(null, dadosDoPedido(p));
      avisoNaLista('Solicitação duplicada. A cópia está como rascunho para você ajustar.');
      mostrarLista();
      return;
    }
    if (tipo === 'excluir') {
      const ok = w.confirmarNaLove ? await w.confirmarNaLove({ titulo: 'Remover esta solicitação?', texto: 'Os fornecedores deixam de vê-la.', botao: 'Remover' }) : false;
      if (!ok) return;
      const { error } = await supabaseClient.from('pedidos_orcamento').delete().eq('id', id);
      avisoNaLista(error ? 'Não foi possível remover agora. Tente de novo.' : 'Solicitação removida.');
      mostrarLista();
    }
  });

  document.addEventListener('click', (e) => {
    if (!(e.target instanceof Element) || !e.target.closest('#btn-rfp-voltar')) return;
    if (vendoPropostas) mostrarLista(); else sair();
  });

  /** Celular: a setinha do cabeçalho volta uma etapa; na 1ª, devolve false (sai para Encontrar fornecedor). */
  function voltarEtapa() {
    const m = document.getElementById('rfp-editor');
    if (!m || m.hidden || etapa <= 1 || publicando) return false;
    irPara(etapa - 1, -1);
    window.scrollTo({ top: 0 });
    return true;
  }

  window.LovePedidos = { abrir, abrirComServico, fechar, mostrarLista, mostrarAba, voltarEtapa, CATEGORIAS, FAIXAS };
})();
