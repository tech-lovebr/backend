// @ts-check
// Checklist do evento (Convidados › Checklist) — planejamento por linha do
// tempo, no estilo do Zola: tarefas sugeridas conforme o tipo do evento, com
// prazo calculado a partir da criação e da data do evento, agrupadas por período (ou por categoria), com progresso, responsável,
// notas/orçamento e atalho para buscar fornecedores.
//
// Dados: tabela checklist_tarefas (migration 082). Sem a tabela (ou num evento
// ainda não salvo), as tarefas ficam guardadas no navegador.
// API: window.LoveChecklist.render()
(function () {
  'use strict';

  /**
   * @typedef {Object} Tarefa
   * @property {string} id
   * @property {string} titulo
   * @property {string} categoria
   * @property {string|null} prazo          AAAA-MM-DD
   * @property {boolean} concluida
   * @property {string|null} responsavel   '' | 'voce' | 'fornecedor:<id>'
   * @property {string|null} notas
   * @property {number|null} orcamento
   * @property {string|null} busca_fornecedor  categoria do Explorar (atalho "Pesquisar fornecedores")
   * @property {number} ordem
   */

  const CATEGORIAS = ['Espaço', 'Gastronomia', 'Bebidas', 'Doces', 'Decoração', 'Música', 'Mídia', 'Assessoria', 'Equipe', 'Trajes e beleza', 'Convidados', 'Presentes', 'Financeiro', 'Logística', 'Fornecedores', 'Geral'];

  // Categoria da tarefa → categoria do Explorar (para "Pesquisar fornecedores").
  /** @type {Record<string, string>} */
  const NO_EXPLORAR = {
    'Espaço': 'Espaços para Locação', 'Gastronomia': 'Buffet e Gastronomia', 'Doces': 'Buffet e Gastronomia',
    'Bebidas': 'Bar e Bebidas', 'Decoração': 'Decoração', 'Música': 'Música e Entretenimento',
    'Mídia': 'Mídia e Audiovisual', 'Assessoria': 'Assessoria e Cerimonialista', 'Equipe': 'Staff e Mão de Obra',
    'Trajes e beleza': 'Trajes, Beleza e Estilo'
  };

  // Tarefas sugeridas por tipo de evento: [título, categoria, dias antes do
  // evento, busca no Explorar?]. A primeira tarefa marca o tempo ideal de
  // preparação daquele tipo (casamento 6 meses, aniversário 2 meses...).
  /** @type {Record<string, [string, string, number, boolean][]>} */
  const MODELOS = {
    wedding: [
      ['Definir o orçamento total do casamento', 'Financeiro', 180, false],
      ['Montar a lista de convidados', 'Convidados', 175, false],
      ['Escolher a data e reservar o espaço da cerimônia e da festa', 'Espaço', 165, true],
      ['Contratar assessoria ou cerimonialista', 'Assessoria', 160, true],
      ['Contratar o buffet', 'Gastronomia', 150, true],
      ['Contratar fotografia e filmagem', 'Mídia', 140, true],
      ['Escolher os padrinhos e as madrinhas', 'Convidados', 135, false],
      ['Contratar banda ou DJ', 'Música', 125, true],
      ['Escolher o vestido e o traje do noivo', 'Trajes e beleza', 120, true],
      ['Enviar o save the date', 'Convidados', 110, false],
      ['Definir a decoração e a paleta de cores', 'Decoração', 100, true],
      ['Criar a lista de presentes', 'Presentes', 95, false],
      ['Contratar o celebrante', 'Assessoria', 90, true],
      ['Encomendar as alianças', 'Geral', 80, false],
      ['Agendar a degustação do cardápio', 'Gastronomia', 60, true],
      ['Contratar bar e bebidas', 'Bebidas', 55, true],
      ['Encomendar o bolo e os bem-casados', 'Doces', 50, true],
      ['Enviar os convites', 'Convidados', 45, false],
      ['Contratar a equipe de apoio (garçons, recepção, segurança)', 'Equipe', 40, true],
      ['Agendar cabelo e maquiagem', 'Trajes e beleza', 35, true],
      ['Dar entrada nos documentos do casamento civil', 'Geral', 30, false],
      ['Fechar a confirmação de presença (RSVP)', 'Convidados', 21, false],
      ['Montar o mapa de mesas', 'Convidados', 18, false],
      ['Confirmar o roteiro da cerimônia com a assessoria', 'Assessoria', 15, false],
      ['Passar o número final de convidados ao buffet', 'Gastronomia', 10, false],
      ['Definir a playlist e a música da entrada', 'Música', 10, false],
      ['Fazer a prova final dos trajes', 'Trajes e beleza', 9, false],
      ['Fazer os pagamentos finais aos fornecedores', 'Financeiro', 5, false],
      ['Retirar os trajes e os itens alugados', 'Logística', 3, false],
      ['Fazer o ensaio da cerimônia', 'Assessoria', 2, false],
      ['Separar documentos, alianças e o kit de emergência', 'Logística', 1, false],
      ['Aproveitar o seu casamento', 'Geral', 0, false],
      ['Devolver os itens alugados', 'Logística', -3, false],
      ['Enviar agradecimentos aos convidados', 'Convidados', -7, false],
      ['Avaliar os fornecedores', 'Fornecedores', -10, false],
      ['Resgatar o saldo da carteira', 'Financeiro', -14, false]
    ],
    birthday: [
      ['Definir o orçamento da festa', 'Financeiro', 60, false],
      ['Escolher o tema da festa', 'Decoração', 57, false],
      ['Montar a lista de convidados', 'Convidados', 55, false],
      ['Reservar o espaço ou salão de festas', 'Espaço', 50, true],
      ['Contratar o buffet', 'Gastronomia', 45, true],
      ['Contratar DJ, banda ou animação', 'Música', 40, true],
      ['Contratar fotografia', 'Mídia', 38, true],
      ['Contratar a decoração', 'Decoração', 35, true],
      ['Criar a lista de presentes', 'Presentes', 32, false],
      ['Enviar os convites', 'Convidados', 30, false],
      ['Encomendar o bolo e os docinhos', 'Doces', 25, true],
      ['Contratar bar e bebidas', 'Bebidas', 22, true],
      ['Escolher a roupa da festa', 'Trajes e beleza', 18, true],
      ['Encomendar lembrancinhas', 'Decoração', 15, true],
      ['Fechar a confirmação de presença (RSVP)', 'Convidados', 10, false],
      ['Passar o número final de convidados ao buffet', 'Gastronomia', 7, false],
      ['Montar a playlist da festa', 'Música', 5, false],
      ['Comprar velas e os itens do parabéns', 'Logística', 3, false],
      ['Fazer os pagamentos finais aos fornecedores', 'Financeiro', 2, false],
      ['Confirmar os horários com os fornecedores', 'Fornecedores', 1, false],
      ['Aproveitar o seu aniversário', 'Geral', 0, false],
      ['Enviar agradecimentos aos convidados', 'Convidados', -3, false],
      ['Avaliar os fornecedores', 'Fornecedores', -7, false],
      ['Resgatar o saldo da carteira', 'Financeiro', -10, false]
    ],
    anniversary: [
      ['Definir o orçamento da celebração', 'Financeiro', 90, false],
      ['Decidir o formato: renovação de votos, jantar ou festa', 'Geral', 85, false],
      ['Montar a lista de convidados', 'Convidados', 80, false],
      ['Reservar o espaço', 'Espaço', 75, true],
      ['Contratar o celebrante da renovação de votos', 'Assessoria', 65, true],
      ['Contratar o buffet', 'Gastronomia', 60, true],
      ['Contratar fotografia', 'Mídia', 55, true],
      ['Contratar música ao vivo ou DJ', 'Música', 50, true],
      ['Reunir fotos da história do casal para a decoração', 'Decoração', 45, false],
      ['Enviar os convites', 'Convidados', 40, false],
      ['Criar a lista de presentes', 'Presentes', 38, false],
      ['Contratar a decoração', 'Decoração', 35, true],
      ['Encomendar o bolo', 'Doces', 25, true],
      ['Escolher os trajes do casal', 'Trajes e beleza', 20, true],
      ['Escrever os votos', 'Geral', 14, false],
      ['Fechar a confirmação de presença (RSVP)', 'Convidados', 12, false],
      ['Passar o número final de convidados ao buffet', 'Gastronomia', 7, false],
      ['Fazer os pagamentos finais aos fornecedores', 'Financeiro', 3, false],
      ['Confirmar o roteiro com os fornecedores', 'Fornecedores', 1, false],
      ['Aproveitar a celebração', 'Geral', 0, false],
      ['Enviar agradecimentos aos convidados', 'Convidados', -5, false],
      ['Avaliar os fornecedores', 'Fornecedores', -10, false],
      ['Resgatar o saldo da carteira', 'Financeiro', -14, false]
    ],
    baby_shower: [
      ['Definir a data e o orçamento do chá', 'Financeiro', 45, false],
      ['Escolher o tema do chá de bebê', 'Decoração', 42, false],
      ['Montar a lista de convidados', 'Convidados', 40, false],
      ['Reservar o espaço ou preparar a casa', 'Espaço', 38, true],
      ['Criar a lista de presentes do enxoval', 'Presentes', 35, false],
      ['Definir as fraldas por tamanho na lista', 'Presentes', 33, false],
      ['Enviar os convites', 'Convidados', 30, false],
      ['Contratar o buffet ou definir o cardápio', 'Gastronomia', 28, true],
      ['Contratar a decoração', 'Decoração', 25, true],
      ['Encomendar o bolo e os doces temáticos', 'Doces', 21, true],
      ['Contratar fotografia', 'Mídia', 20, true],
      ['Planejar as brincadeiras do chá', 'Geral', 14, false],
      ['Encomendar lembrancinhas', 'Decoração', 12, true],
      ['Fechar a confirmação de presença (RSVP)', 'Convidados', 7, false],
      ['Separar o livro de mensagens para o bebê', 'Logística', 3, false],
      ['Fazer os pagamentos finais aos fornecedores', 'Financeiro', 2, false],
      ['Aproveitar o chá de bebê', 'Geral', 0, false],
      ['Organizar e lavar os presentes recebidos', 'Logística', -3, false],
      ['Enviar agradecimentos aos convidados', 'Convidados', -5, false],
      ['Resgatar o saldo da carteira', 'Financeiro', -10, false]
    ],
    bridal_shower: [
      ['Definir a data e o orçamento do chá', 'Financeiro', 45, false],
      ['Escolher o tema do chá de panela', 'Decoração', 42, false],
      ['Montar a lista de convidados', 'Convidados', 40, false],
      ['Reservar o espaço ou preparar a casa', 'Espaço', 38, true],
      ['Criar a lista de presentes para a casa nova', 'Presentes', 35, false],
      ['Enviar os convites', 'Convidados', 30, false],
      ['Contratar o buffet ou definir o cardápio', 'Gastronomia', 28, true],
      ['Contratar a decoração', 'Decoração', 25, true],
      ['Encomendar o bolo e os doces', 'Doces', 21, true],
      ['Planejar as brincadeiras e as prendas', 'Geral', 14, false],
      ['Contratar bar e bebidas', 'Bebidas', 12, true],
      ['Encomendar lembrancinhas', 'Decoração', 10, true],
      ['Fechar a confirmação de presença (RSVP)', 'Convidados', 7, false],
      ['Fazer os pagamentos finais aos fornecedores', 'Financeiro', 2, false],
      ['Aproveitar o chá de panela', 'Geral', 0, false],
      ['Anotar quem deu cada presente', 'Presentes', -1, false],
      ['Enviar agradecimentos aos convidados', 'Convidados', -5, false],
      ['Resgatar o saldo da carteira', 'Financeiro', -10, false]
    ],
    gender_reveal: [
      ['Definir a data e o orçamento', 'Financeiro', 30, false],
      ['Pedir o exame de sexagem e deixar o resultado com alguém de confiança', 'Geral', 28, false],
      ['Montar a lista de convidados', 'Convidados', 27, false],
      ['Escolher como será a revelação (balão, bolo, fumaça ou confete)', 'Decoração', 25, false],
      ['Reservar o espaço ou preparar a casa', 'Espaço', 24, true],
      ['Criar a lista de presentes', 'Presentes', 22, false],
      ['Enviar os convites', 'Convidados', 20, false],
      ['Contratar a decoração', 'Decoração', 18, true],
      ['Contratar o buffet ou definir o cardápio', 'Gastronomia', 16, true],
      ['Encomendar o bolo da revelação', 'Doces', 12, true],
      ['Contratar fotografia e filmagem do momento', 'Mídia', 12, true],
      ['Montar o bolão de menino ou menina', 'Geral', 8, false],
      ['Fechar a confirmação de presença (RSVP)', 'Convidados', 5, false],
      ['Entregar o resultado a quem vai preparar a surpresa', 'Logística', 3, false],
      ['Fazer os pagamentos finais aos fornecedores', 'Financeiro', 2, false],
      ['Aproveitar a revelação', 'Geral', 0, false],
      ['Compartilhar as fotos e o vídeo com a família', 'Mídia', -3, false],
      ['Enviar agradecimentos aos convidados', 'Convidados', -5, false],
      ['Resgatar o saldo da carteira', 'Financeiro', -10, false]
    ],
    corporate: [
      ['Definir objetivo, público e orçamento do evento', 'Financeiro', 90, false],
      ['Aprovar o orçamento com a diretoria', 'Financeiro', 85, false],
      ['Reservar o espaço', 'Espaço', 80, true],
      ['Montar a lista de convidados', 'Convidados', 75, false],
      ['Contratar a produção ou assessoria do evento', 'Assessoria', 70, true],
      ['Contratar o buffet ou coffee break', 'Gastronomia', 60, true],
      ['Contratar som, telão e iluminação', 'Música', 55, true],
      ['Contratar fotografia e filmagem', 'Mídia', 50, true],
      ['Definir a programação e os palestrantes', 'Geral', 45, false],
      ['Enviar os convites', 'Convidados', 40, false],
      ['Produzir os materiais com a marca (banners, crachás e brindes)', 'Decoração', 30, true],
      ['Contratar recepção e segurança', 'Equipe', 25, true],
      ['Fechar a confirmação de presença', 'Convidados', 14, false],
      ['Passar o número final de participantes ao buffet', 'Gastronomia', 7, false],
      ['Fazer o ensaio técnico de som e projeção', 'Logística', 2, false],
      ['Fazer os pagamentos finais aos fornecedores', 'Financeiro', 2, false],
      ['Fazer o briefing final com a equipe', 'Assessoria', 1, false],
      ['Realizar o evento', 'Geral', 0, false],
      ['Enviar a pesquisa de satisfação aos participantes', 'Convidados', -2, false],
      ['Compartilhar as fotos e os materiais', 'Mídia', -5, false],
      ['Avaliar os fornecedores', 'Fornecedores', -10, false],
      ['Fechar a prestação de contas', 'Financeiro', -14, false]
    ],
    other: [
      ['Definir o orçamento do evento', 'Financeiro', 60, false],
      ['Montar a lista de convidados', 'Convidados', 55, false],
      ['Reservar o espaço', 'Espaço', 50, true],
      ['Contratar o buffet', 'Gastronomia', 45, true],
      ['Contratar a decoração', 'Decoração', 40, true],
      ['Contratar música ou animação', 'Música', 35, true],
      ['Contratar fotografia', 'Mídia', 32, true],
      ['Criar a lista de presentes', 'Presentes', 30, false],
      ['Enviar os convites', 'Convidados', 28, false],
      ['Encomendar o bolo e os doces', 'Doces', 21, true],
      ['Contratar bar e bebidas', 'Bebidas', 18, true],
      ['Fechar a confirmação de presença (RSVP)', 'Convidados', 10, false],
      ['Passar o número final de convidados ao buffet', 'Gastronomia', 7, false],
      ['Fazer os pagamentos finais aos fornecedores', 'Financeiro', 3, false],
      ['Confirmar os horários com os fornecedores', 'Fornecedores', 1, false],
      ['Aproveitar o evento', 'Geral', 0, false],
      ['Enviar agradecimentos aos convidados', 'Convidados', -5, false],
      ['Avaliar os fornecedores', 'Fornecedores', -10, false],
      ['Resgatar o saldo da carteira', 'Financeiro', -14, false]
    ]
  };
  MODELOS.baby = MODELOS.baby_shower;

  // Tarefas prontas da Love levam à página certa da plataforma (as criadas
  // pela pessoa não têm link). Contratações abrem Criar solicitação › Serviço
  // avulso já com o serviço marcado.
  /** @type {Record<string, string>} */
  const SERVICO_DA_CATEGORIA = {
    'Espaço': 'espaco', 'Gastronomia': 'buffet', 'Doces': 'doces', 'Bebidas': 'bebidas', 'Decoração': 'decoracao',
    'Música': 'musica', 'Mídia': 'fotografia', 'Assessoria': 'assessoria', 'Equipe': 'staff'
  };
  const TITULOS_PRONTOS = new Set(Object.values(MODELOS).flat().map(m => m[0]));
  /** @param {Tarefa} t @returns {{ tab?: string, sub?: string, servico?: string, explorar?: string, pagina?: string }|null} */
  function destinoDaTarefa(t) {
    if (!t || !TITULOS_PRONTOS.has(t.titulo)) return null;
    const s = t.titulo.toLowerCase();
    if (/orçamento/.test(s) && t.categoria === 'Financeiro') return { tab: 'wallet', sub: 'wallet-budget' };
    if (/saldo da carteira/.test(s)) return { tab: 'wallet', sub: 'wallet-digital' };
    if (/mapa de mesas/.test(s)) return { tab: 'rsvp', sub: 'tables' };
    if (/fornecedores|ao buffet/.test(s)) return { tab: 'b2b', sub: 'contracted' };
    if (/lista de presentes/.test(s)) return { tab: 'gifts', sub: 'my-gifts' };
    if (/save the date/.test(s)) return { pagina: 'savethedate' };
    if (/convites/.test(s)) return { pagina: 'convite' };
    if (/convidados|confirmação de presença|padrinhos|madrinhas/.test(s)) return { tab: 'rsvp', sub: 'all' };
    const modelo = Object.values(MODELOS).flat().find(m => m[0] === t.titulo);
    if (modelo && modelo[3]) {
      const servico = SERVICO_DA_CATEGORIA[t.categoria];
      if (servico) return { servico };
      if (NO_EXPLORAR[t.categoria]) return { explorar: NO_EXPLORAR[t.categoria] };
    }
    return null;
  }
  /** @param {Tarefa} t */
  function irParaTarefa(t) {
    const d = destinoDaTarefa(t);
    const w = /** @type {any} */ (window);
    if (!d) return;
    if (d.servico) {
      if (w.LovePedidos && w.LovePedidos.abrirComServico) w.LovePedidos.abrirComServico(d.servico);
      if (w.loveIrPara) w.loveIrPara('b2b', 'pedidos');
      return;
    }
    if (d.pagina === 'savethedate' && w.navigateToSaveTheDate) { w.navigateToSaveTheDate(); return; }
    if (d.pagina === 'convite' && w.navigateToConviteDigital) { w.navigateToConviteDigital(); return; }
    if (d.explorar) { if (w.loveAbrirExplorarNaCategoria) w.loveAbrirExplorarNaCategoria(d.explorar); return; }
    if (d.tab && d.sub && w.loveIrPara) w.loveIrPara(d.tab, d.sub);
  }

  /** Tarefas sugeridas do tipo do evento ativo (tipo desconhecido → "other"). */
  function modeloDoEvento() {
    const ev = eventoAtivo();
    const tipo = ev && ev.type ? String(ev.type) : 'other';
    return MODELOS[tipo] || MODELOS.other;
  }

  const GRUPOS = [
    ['atrasadas', 'Atrasadas · atenção imediata'],
    ['mais-2m', 'Faltando mais de 2 meses'],
    ['1-2m', 'Faltando 1 a 2 meses'],
    ['2-4s', 'Faltando 2 a 4 semanas'],
    ['1-2s', 'Faltando 1 a 2 semanas'],
    ['semana', 'Semana do evento'],
    ['dia', 'No dia do evento e pós-evento'],
    ['sem-prazo', 'Sem prazo definido']
  ];

  /** @param {unknown} v */
  const esc = (v) => String(v == null ? '' : v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const DIA = 86400000;
  /** @param {string|null|undefined} iso @returns {Date|null} */
  function dataLocal(iso) {
    if (!iso || !/^\d{4}-\d{2}-\d{2}/.test(iso)) return null;
    const [a, m, d] = iso.slice(0, 10).split('-').map(Number);
    return new Date(a, m - 1, d);
  }
  /** @param {Date} d */
  const isoDe = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const hoje = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; };
  /** @param {Date} a @param {Date} b */
  const diasEntre = (a, b) => Math.round((b.getTime() - a.getTime()) / DIA);
  /** @param {Date} d */
  const dataCurta = (d) => d.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' }).replace('.', '');
  const ehUuid = (/** @type {string} */ v) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(v || ''));

  // --------------------------------------------------------------------------
  // Estado
  // --------------------------------------------------------------------------
  /** @type {Tarefa[]} */
  let tarefas = [];
  let eventoCarregado = '';
  let carregando = false;
  let semTabela = false;
  let vista = 'cronograma';
  let status = 'todas';
  /** @type {Set<string>|null} */
  let abertos = null;

  function eventoAtivo() {
    const w = /** @type {any} */ (window);
    return typeof w.getLoveActiveEvent === 'function' ? w.getLoveActiveEvent() : null;
  }
  function dataDoEvento() {
    const ev = eventoAtivo();
    if (!ev) return null;
    const det = ev.eventDetails || {};
    return dataLocal(det.date || ev.date || '');
  }
  const chaveLocal = (/** @type {string} */ ev) => `love-checklist-v3-${ev}`;
  /** @param {string} ev @returns {Tarefa[]|null} */
  function lerLocal(ev) {
    try { const v = localStorage.getItem(chaveLocal(ev)); return v ? JSON.parse(v) : null; } catch (e) { return null; }
  }
  /** @param {string} ev */
  function gravarLocal(ev) {
    try { localStorage.setItem(chaveLocal(ev), JSON.stringify(tarefas)); } catch (e) { /* sem espaço */ }
  }
  const usaBanco = (/** @type {string} */ ev) => !semTabela && ehUuid(ev) && typeof supabaseClient !== 'undefined';
  /** @param {any} error */
  const tabelaFaltando = (error) => !!error && (error.code === 'PGRST205' || error.code === '42P01');

  /** Dia em que o evento foi criado (sem a informação, hoje). */
  function dataDeCriacao() {
    const ev = eventoAtivo();
    const iso = ev && (ev.createdAt || ev.created_at);
    const d = iso ? new Date(iso) : hoje();
    d.setHours(0, 0, 0, 0);
    return d;
  }

  /**
   * Prazo de uma tarefa sugerida. Cada tipo de evento tem o seu tempo ideal de
   * preparação (maior); se o evento foi criado com menos tempo, os prazos são distribuídos entre
   * o dia da criação e o dia do evento (nada nasce atrasado). Tarefas do pós-
   * evento ficam depois do evento.
   * @param {number} dias  dias antes do evento no modelo
   * @param {number} maior tempo ideal de preparação do tipo de evento
   */
  function prazoSugerido(dias, maior) {
    const evento = dataDoEvento();
    if (!evento) return null;
    if (dias <= 0) return isoDe(new Date(evento.getTime() - dias * DIA));
    const criacao = dataDeCriacao();
    const janela = diasEntre(criacao, evento);
    if (janela >= maior) return isoDe(new Date(evento.getTime() - dias * DIA));
    if (janela <= 1) return isoDe(evento);
    const andou = Math.max(1, Math.round(janela * (maior - dias) / maior));
    return isoDe(new Date(criacao.getTime() + Math.min(andou, janela) * DIA));
  }

  /** Tarefas sugeridas, com prazo calculado pela criação e pela data do evento. @returns {Omit<Tarefa,'id'>[]} */
  function tarefasSugeridas() {
    const modelo = modeloDoEvento();
    const maior = Math.max(...modelo.map(m => m[2]));
    return modelo.map(([titulo, categoria, dias, busca], i) => ({
      titulo, categoria,
      prazo: prazoSugerido(dias, maior),
      concluida: false, responsavel: '', notas: null, orcamento: null,
      busca_fornecedor: busca ? (NO_EXPLORAR[categoria] || null) : null,
      ordem: i
    }));
  }

  async function carregar() {
    const ev = eventoAtivo();
    const id = ev ? String(ev.id) : '';
    if (!id) { tarefas = []; return; }
    if (id === eventoCarregado) return;
    carregando = true;
    eventoCarregado = id;
    abertos = null;
    if (usaBanco(id)) {
      const { data, error } = await supabaseClient.from('checklist_tarefas').select('*').eq('evento_id', id).order('ordem', { ascending: true });
      if (!error) {
        tarefas = data || [];
        if (!tarefas.length) {
          const linhas = tarefasSugeridas().map(t => ({ ...t, evento_id: id }));
          const ins = await supabaseClient.from('checklist_tarefas').insert(linhas).select('*');
          if (!ins.error) tarefas = ins.data || [];
        }
        carregando = false;
        return;
      }
      if (tabelaFaltando(error)) semTabela = true;
    }
    const local = lerLocal(id);
    tarefas = local || tarefasSugeridas().map((t, i) => ({ ...t, id: `local-${Date.now()}-${i}` }));
    if (!local) gravarLocal(id);
    carregando = false;
  }

  /** Salva uma tarefa (nova ou alterada). @param {Tarefa} t @param {boolean} [nova] */
  async function salvar(t, nova) {
    const ev = eventoCarregado;
    if (usaBanco(ev) && !String(t.id).startsWith('local-')) {
      const { id, ...campos } = t;
      const resp = nova
        ? await supabaseClient.from('checklist_tarefas').insert({ ...campos, evento_id: ev }).select('*').single()
        : await supabaseClient.from('checklist_tarefas').update({ ...campos, updated_at: new Date().toISOString() }).eq('id', id).select('*').single();
      if (resp.error) { aviso('Não foi possível salvar agora. Tente de novo.'); return false; }
      if (nova && resp.data) t.id = resp.data.id;
      return true;
    }
    gravarLocal(ev);
    return true;
  }

  /** @param {Tarefa} t */
  async function apagar(t) {
    const ev = eventoCarregado;
    if (usaBanco(ev) && !String(t.id).startsWith('local-')) {
      const { error } = await supabaseClient.from('checklist_tarefas').delete().eq('id', t.id);
      if (error) { aviso('Não foi possível excluir agora. Tente de novo.'); return false; }
    }
    tarefas = tarefas.filter(x => x.id !== t.id);
    if (!usaBanco(ev)) gravarLocal(ev);
    return true;
  }

  // --------------------------------------------------------------------------
  // Regras de exibição
  // --------------------------------------------------------------------------
  /** @param {Tarefa} t */
  function grupoDe(t) {
    const prazo = dataLocal(t.prazo);
    const h = hoje();
    if (!prazo) return 'sem-prazo';
    if (!t.concluida && prazo < h) return 'atrasadas';
    const evento = dataDoEvento();
    const antes = evento ? diasEntre(prazo, evento) : diasEntre(h, prazo);
    if (antes > 60) return 'mais-2m';
    if (antes > 30) return '1-2m';
    if (antes > 14) return '2-4s';
    if (antes > 7) return '1-2s';
    if (antes > 0) return 'semana';
    return 'dia';
  }

  /** Grupo do momento (aberto por padrão): o período em que o evento está hoje. */
  function grupoVigente() {
    const evento = dataDoEvento();
    if (!evento) return '';
    const faltam = diasEntre(hoje(), evento);
    if (faltam > 60) return 'mais-2m';
    if (faltam > 30) return '1-2m';
    if (faltam > 14) return '2-4s';
    if (faltam > 7) return '1-2s';
    if (faltam > 0) return 'semana';
    return 'dia';
  }

  /** @param {Tarefa} t */
  function textoDoPrazo(t) {
    const prazo = dataLocal(t.prazo);
    if (!prazo) return { texto: 'Sem prazo', atrasada: false };
    if (t.concluida) return { texto: `Até ${dataCurta(prazo)}`, atrasada: false };
    const d = diasEntre(hoje(), prazo);
    if (d < 0) return { texto: d === -1 ? 'Venceu ontem' : `Venceu há ${-d} dias`, atrasada: true };
    if (d === 0) return { texto: 'Vence hoje', atrasada: true };
    if (d === 1) return { texto: 'Vence amanhã', atrasada: false };
    if (d <= 7) return { texto: `Vence em ${d} dias`, atrasada: false };
    return { texto: `Até ${dataCurta(prazo)}`, atrasada: false };
  }

  function fornecedores() {
    const w = /** @type {any} */ (window);
    return (w.LOVE_DATA && Array.isArray(w.LOVE_DATA.contractedVendors)) ? w.LOVE_DATA.contractedVendors : [];
  }
  /** @param {string|null} resp */
  function nomeDoResponsavel(resp) {
    if (!resp) return '';
    if (resp === 'voce') return 'Você';
    const f = fornecedores().find((/** @type {any} */ v) => `fornecedor:${v.id}` === resp);
    return f ? String(f.name || 'Fornecedor') : '';
  }
  /** Quem pode ser responsável: ninguém, você e os fornecedores contratados. @returns {[string, string][]} */
  function opcoesDeResponsavel() {
    return [['', 'Sem responsável'], ['voce', 'Você'], ...fornecedores().map((/** @type {any} */ v) => /** @type {[string, string]} */ ([`fornecedor:${v.id}`, String(v.name || 'Fornecedor')]))];
  }
  /** @param {string} nome */
  const iniciais = (nome) => nome === 'Você' ? 'EU' : nome.split(/\s+/).filter(Boolean).slice(0, 2).map(p => p[0]).join('').toUpperCase();
  /** @param {number|null} v */
  const reais = (v) => `R$ ${Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  // --------------------------------------------------------------------------
  // Desenho
  // --------------------------------------------------------------------------
  const ICONE_CHECK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg>';
  const ICONE_SETA = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>';
  const ICONE_MAIS = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="5" cy="12" r="1.8"/><circle cx="12" cy="12" r="1.8"/><circle cx="19" cy="12" r="1.8"/></svg>';
  const ICONE_PESSOA = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="8.5" r="3.5"/><path d="M5 19.5c1.2-3.4 3.8-5 7-5s5.8 1.6 7 5"/></svg>';

  /** @param {Tarefa} t */
  function linhaDaTarefa(t) {
    const prazo = textoDoPrazo(t);
    const nome = nomeDoResponsavel(t.responsavel);
    const extras = [t.orcamento ? reais(t.orcamento) : '', t.notas ? 'Tem notas' : ''].filter(Boolean).join(' · ');
    const busca = !t.concluida && t.busca_fornecedor;
    return `
      <div class="chk-tarefa${t.concluida ? ' is-feita' : ''}" data-chk-id="${esc(t.id)}">
        <button type="button" class="chk-check" role="checkbox" aria-checked="${t.concluida}" aria-label="Marcar como concluída" data-chk-toggle>${ICONE_CHECK}</button>
        <div class="chk-corpo">
          ${destinoDaTarefa(t) ? `<button type="button" class="chk-titulo chk-titulo-link" data-chk-ir>${esc(t.titulo)}</button>` : `<p class="chk-titulo">${esc(t.titulo)}</p>`}
          <div class="chk-meta">
            <span class="chk-tag">${esc(t.categoria)}</span>
            <span class="chk-prazo${prazo.atrasada ? ' is-atrasada' : ''}">${esc(prazo.texto)}</span>
            ${extras ? `<span class="chk-extra">${esc(extras)}</span>` : ''}
          </div>
          ${t.notas ? `<p class="chk-notas">${esc(t.notas)}</p>` : ''}
        </div>
        <div class="chk-acoes">
          ${busca ? `<button type="button" class="chk-buscar" data-chk-buscar="${esc(t.busca_fornecedor)}">Pesquisar fornecedores</button>` : ''}
          <div class="chk-resp-wrap">
            <button type="button" class="chk-resp" data-chk-resp-abrir aria-haspopup="menu" aria-label="${esc(nome ? `Responsável: ${nome}` : 'Atribuir responsável')}" data-dica="${esc(nome ? `Responsável: ${nome}` : 'Atribuir responsável')}">
              <span class="chk-avatar${nome ? '' : ' is-vazio'}">${nome ? esc(iniciais(nome)) : ICONE_PESSOA}</span>
            </button>
            <div class="chk-resp-pop" role="menu" hidden>
              <p class="chk-resp-titulo">Responsável</p>
              ${opcoesDeResponsavel().map(([valor, rotulo]) => `
                <button type="button" role="menuitemradio" aria-checked="${(t.responsavel || '') === valor}" class="chk-resp-opcao${(t.responsavel || '') === valor ? ' is-ativo' : ''}" data-chk-resp-valor="${esc(valor)}">
                  <span class="chk-avatar${valor ? '' : ' is-vazio'}">${valor ? esc(iniciais(rotulo)) : ICONE_PESSOA}</span>
                  <span class="chk-resp-nome">${esc(rotulo)}</span>
                  ${(t.responsavel || '') === valor ? `<span class="chk-resp-ok">${ICONE_CHECK}</span>` : ''}
                </button>`).join('')}
            </div>
          </div>
          <div class="chk-menu-wrap">
            <button type="button" class="chk-mais" data-chk-menu aria-label="Mais ações">${ICONE_MAIS}</button>
            <div class="chk-menu" role="menu" hidden>
              <button type="button" role="menuitem" data-chk-acao="prazo">Editar prazo</button>
              <button type="button" role="menuitem" data-chk-acao="notas">Adicionar notas e orçamento</button>
              <button type="button" role="menuitem" data-chk-acao="editar">Editar tarefa</button>
              <button type="button" role="menuitem" data-chk-acao="excluir">Excluir</button>
            </div>
          </div>
        </div>
      </div>`;
  }

  function desenhar() {
    const raiz = document.getElementById('event-checklist-list');
    if (!raiz) return;
    if (carregando) { raiz.innerHTML = '<p class="chk-carregando">Carregando suas tarefas…</p>'; return; }
    const h = hoje();
    const total = tarefas.length;
    const feitas = tarefas.filter(t => t.concluida).length;
    const atrasadas = tarefas.filter(t => !t.concluida && dataLocal(t.prazo) && /** @type {Date} */ (dataLocal(t.prazo)) < h).length;
    const pct = total ? Math.round((feitas / total) * 100) : 0;

    const filtradas = tarefas.filter(t => status === 'todas' || (status === 'pendentes' ? !t.concluida : t.concluida));
    /** @type {[string, string, Tarefa[]][]} */
    let grupos;
    if (vista === 'categoria') {
      grupos = CATEGORIAS.map(c => /** @type {[string, string, Tarefa[]]} */ ([`cat:${c}`, c, filtradas.filter(t => t.categoria === c)]));
      const outras = filtradas.filter(t => !CATEGORIAS.includes(t.categoria));
      if (outras.length) grupos.push(['cat:outras', 'Outras', outras]);
    } else {
      grupos = GRUPOS.map(([id, nome]) => /** @type {[string, string, Tarefa[]]} */ ([id, nome, filtradas.filter(t => grupoDe(t) === id)]));
    }
    grupos = grupos.filter(g => g[2].length);
    grupos.forEach(g => g[2].sort((a, b) => String(a.prazo || '9999').localeCompare(String(b.prazo || '9999')) || a.ordem - b.ordem));

    if (!abertos) {
      abertos = new Set(['atrasadas']);
      const vigente = grupoVigente();
      if (vigente) abertos.add(vigente);
      const primeiro = GRUPOS.find(([id]) => id !== 'atrasadas' && tarefas.some(t => !t.concluida && grupoDe(t) === id));
      if (primeiro) abertos.add(primeiro[0]);
      CATEGORIAS.forEach(c => abertos && abertos.add(`cat:${c}`));
      abertos.add('cat:outras');
    }
    const semData = !dataDoEvento();

    raiz.innerHTML = `
      <p class="chk-aviso" id="chk-aviso" role="status" hidden></p>
      <section class="chk-progresso">
        <p class="chk-progresso-texto"><b>Progresso do evento:</b> ${feitas} de ${total} tarefas concluídas (${pct}%)</p>
        <div class="chk-barra" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${pct}"><span style="width:${pct}%"></span></div>
        <div class="chk-contadores">
          <span class="chk-contador"><b>${total - feitas}</b> Tarefas pendentes</span>
          <span class="chk-contador${atrasadas ? ' is-atrasadas' : ''}"><b>${atrasadas}</b> Atrasadas</span>
          <span class="chk-contador"><b>${feitas}</b> Concluídas</span>
        </div>
        ${semData ? '<p class="chk-dica">Defina a data do evento em Informações para organizar as tarefas pelos prazos.</p>' : ''}
      </section>

      <div class="love-tabs-nav chk-filtros" role="tablist">
        <button type="button" class="love-tab-item${vista === 'cronograma' ? ' active' : ''}" data-chk-vista="cronograma">Cronograma</button>
        <button type="button" class="love-tab-item${vista === 'categoria' ? ' active' : ''}" data-chk-vista="categoria">Por categoria</button>
        <span class="chk-filtros-espaco"></span>
        <button type="button" class="love-tab-item${status === 'todas' ? ' active' : ''}" data-chk-status="todas">Todas</button>
        <button type="button" class="love-tab-item${status === 'pendentes' ? ' active' : ''}" data-chk-status="pendentes">Pendentes</button>
        <button type="button" class="love-tab-item${status === 'concluidas' ? ' active' : ''}" data-chk-status="concluidas">Concluídas</button>
      </div>

      <div class="chk-lista">
        ${grupos.length ? grupos.map(([id, nome, lista]) => {
          const aberto = !!abertos && abertos.has(id);
          const feitasNoGrupo = lista.filter(t => t.concluida).length;
          return `
            <section class="chk-grupo${aberto ? ' is-aberto' : ''}${id === 'atrasadas' ? ' is-atrasadas' : ''}">
              <button type="button" class="chk-grupo-topo" data-chk-grupo="${esc(id)}" aria-expanded="${aberto}">
                <span class="chk-grupo-seta">${ICONE_SETA}</span>
                <span class="chk-grupo-nome">${esc(nome)}</span>
                <span class="chk-grupo-conta">${feitasNoGrupo} de ${lista.length}</span>
              </button>
              ${aberto ? `<div class="chk-grupo-itens">${lista.map(linhaDaTarefa).join('')}</div>` : ''}
            </section>`;
        }).join('') : `<p class="chk-vazio">${status === 'concluidas' ? 'Nenhuma tarefa concluída ainda.' : 'Nenhuma tarefa por aqui.'}</p>`}
      </div>`;
  }

  /** @param {string} msg */
  function aviso(msg) {
    const el = document.getElementById('chk-aviso');
    if (!el) return;
    el.textContent = msg;
    el.hidden = !msg;
    if (msg) setTimeout(() => { el.hidden = true; }, 5000);
  }

  // --------------------------------------------------------------------------
  // Pop-up Nova tarefa / Editar tarefa (centralizado, nunca drawer)
  // --------------------------------------------------------------------------
  /** @type {Tarefa|null} */
  let editando = null;

  function modal() {
    let m = document.getElementById('chk-modal');
    if (m) return m;
    m = document.createElement('div');
    m.id = 'chk-modal';
    m.className = 'chk-modal';
    m.hidden = true;
    // No celular esse pop-up vira tela cheia (igual à ficha de "Adicionar
    // convidado" em Meus Convidados): seta de voltar à esquerda e Salvar já
    // no topo, à direita, em vez do X e dos botões lá embaixo (desktop
    // continua com o pop-up centralizado de sempre).
    const celular = window.matchMedia('(max-width: 768px), (hover: none) and (pointer: coarse) and (max-height: 500px)').matches;
    const iconeFechar = celular
      ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M19 12H5m0 0 7 7m-7-7 7-7"/></svg>'
      : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M6 18 18 6M6 6l12 12"/></svg>';
    m.innerHTML = `
      <div class="chk-modal-card" role="dialog" aria-modal="true" aria-labelledby="chk-modal-titulo">
        <div class="chk-modal-cab">
          <button type="button" class="chk-modal-x" data-chk-fechar aria-label="Fechar">${iconeFechar}</button>
          <h3 id="chk-modal-titulo" class="chk-modal-titulo">Adicionar tarefa</h3>
          <button type="submit" form="chk-form" class="chk-modal-salvar-topo">Salvar</button>
        </div>
        <form id="chk-form" class="chk-form" novalidate>
          <div class="chk-form-colunas">
            <div class="chk-form-col">
              <label class="chk-campo"><span>Tarefa</span><input type="text" name="titulo" maxlength="140" required></label>
              <div class="chk-form-linha">
                <label class="chk-campo"><span>Categoria</span><select name="categoria">${CATEGORIAS.map(c => `<option value="${esc(c)}">${esc(c)}</option>`).join('')}</select></label>
                <label class="chk-campo"><span>Prazo</span><input type="date" name="prazo"></label>
              </div>
              <label class="chk-campo"><span>Orçamento <em>(opcional)</em></span><input type="text" name="orcamento" inputmode="decimal" placeholder="R$ 0,00"></label>
            </div>
            <div class="chk-form-col">
              <label class="chk-campo chk-campo-notas"><span>Notas <em>(opcional)</em></span><textarea name="notas" rows="3" maxlength="1000"></textarea></label>
            </div>
          </div>
          <p class="chk-form-erro" id="chk-form-erro" hidden></p>
          <div class="chk-form-acoes">
            <button type="button" class="chk-cancelar" data-chk-fechar>Cancelar</button>
            <button type="submit" class="chk-salvar">Salvar</button>
          </div>
        </form>
      </div>`;
    document.body.appendChild(m);
    m.addEventListener('click', (e) => {
      const alvo = /** @type {HTMLElement} */ (e.target);
      if (alvo === m || alvo.closest('[data-chk-fechar]')) fecharModal();
    });
    m.querySelector('form')?.addEventListener('submit', (e) => { e.preventDefault(); salvarDoModal(); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && m && !m.hidden) fecharModal(); });
    return m;
  }

  /** @param {Tarefa|null} t @param {string} [foco] */
  function abrirModal(t, foco) {
    const m = modal();
    editando = t;
    const form = /** @type {HTMLFormElement} */ (m.querySelector('form'));
    const titulo = m.querySelector('#chk-modal-titulo');
    if (titulo) titulo.textContent = t ? 'Editar tarefa' : 'Adicionar tarefa';
    /** @param {string} n @param {string} v */
    const definir = (n, v) => { const el = /** @type {HTMLInputElement|null} */ (form.elements.namedItem(n)); if (el) el.value = v; };
    definir('titulo', t ? t.titulo : '');
    definir('categoria', t ? t.categoria : 'Geral');
    definir('prazo', t && t.prazo ? t.prazo.slice(0, 10) : '');
    definir('orcamento', t && t.orcamento ? Number(t.orcamento).toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : '');
    definir('notas', t && t.notas ? t.notas : '');
    const erro = m.querySelector('#chk-form-erro');
    if (erro) /** @type {HTMLElement} */ (erro).hidden = true;
    m.hidden = false;
    document.body.classList.add('chk-modal-aberto');
    const alvo = /** @type {HTMLElement|null} */ (form.elements.namedItem(foco || 'titulo'));
    setTimeout(() => alvo && alvo.focus(), 30);
  }

  function fecharModal() {
    const m = document.getElementById('chk-modal');
    if (m) m.hidden = true;
    document.body.classList.remove('chk-modal-aberto');
    editando = null;
  }

  async function salvarDoModal() {
    const m = modal();
    const form = /** @type {HTMLFormElement} */ (m.querySelector('form'));
    const valor = (/** @type {string} */ n) => String((/** @type {HTMLInputElement} */ (form.elements.namedItem(n))).value || '').trim();
    const erro = /** @type {HTMLElement|null} */ (m.querySelector('#chk-form-erro'));
    const titulo = valor('titulo');
    if (!titulo) { if (erro) { erro.textContent = 'Escreva o que precisa ser feito.'; erro.hidden = false; } return; }
    const num = valor('orcamento').replace(/[^\d,]/g, '').replace(',', '.');
    const categoria = valor('categoria') || 'Geral';
    const contratar = /^(contratar|encomendar|reservar|alugar|escolher e reservar)/i.test(titulo);
    const dados = {
      titulo, categoria,
      prazo: valor('prazo') || null,
      orcamento: num ? Number(num) : null,
      notas: valor('notas') || null
    };
    if (editando) {
      const t = editando;
      const antes = { ...t };
      Object.assign(t, dados);
      if (!t.busca_fornecedor && contratar) t.busca_fornecedor = NO_EXPLORAR[categoria] || null;
      if (!(await salvar(t))) { Object.assign(t, antes); return; }
    } else {
      /** @type {Tarefa} */
      const t = { id: `local-${Date.now()}`, ...dados, concluida: false, responsavel: '', busca_fornecedor: contratar ? (NO_EXPLORAR[categoria] || null) : null, ordem: tarefas.length };
      if (usaBanco(eventoCarregado)) t.id = 'nova';
      tarefas.push(t);
      if (!(await salvar(t, true))) { tarefas = tarefas.filter(x => x !== t); return; }
      if (abertos) { abertos.add(grupoDe(t)); abertos.add(`cat:${t.categoria}`); }
    }
    fecharModal();
    desenhar();
  }

  // --------------------------------------------------------------------------
  // Interações
  // --------------------------------------------------------------------------
  /** @param {Element} el @returns {Tarefa|null} */
  function tarefaDe(el) {
    const linha = /** @type {HTMLElement|null} */ (el.closest('[data-chk-id]'));
    return linha ? (tarefas.find(t => String(t.id) === linha.dataset.chkId) || null) : null;
  }

  document.addEventListener('click', async (e) => {
    const alvo = e.target instanceof Element ? e.target : null;
    if (!alvo) return;
    if (alvo.closest('#btn-checklist-nova')) { abrirModal(null); return; }
    const raiz = alvo.closest('#event-checklist-list');
    // Fecha menus abertos ao clicar fora.
    document.querySelectorAll('.chk-menu:not([hidden]), .chk-resp-pop:not([hidden])').forEach(m => { if (!m.parentElement?.contains(alvo)) /** @type {HTMLElement} */ (m).hidden = true; });
    if (!raiz) return;

    const v = /** @type {HTMLElement|null} */ (alvo.closest('[data-chk-vista]'));
    if (v) { vista = v.dataset.chkVista || 'cronograma'; desenhar(); return; }
    const st = /** @type {HTMLElement|null} */ (alvo.closest('[data-chk-status]'));
    if (st) { status = st.dataset.chkStatus || 'todas'; desenhar(); return; }
    const g = /** @type {HTMLElement|null} */ (alvo.closest('[data-chk-grupo]'));
    if (g && abertos) {
      const id = g.dataset.chkGrupo || '';
      if (abertos.has(id)) abertos.delete(id); else abertos.add(id);
      desenhar();
      return;
    }
    const t = tarefaDe(alvo);
    if (!t) return;
    if (alvo.closest('[data-chk-toggle]')) {
      t.concluida = !t.concluida;
      desenhar();
      if (!(await salvar(t))) { t.concluida = !t.concluida; desenhar(); }
      return;
    }
    if (alvo.closest('[data-chk-ir]')) { irParaTarefa(t); return; }
    const buscar = /** @type {HTMLElement|null} */ (alvo.closest('[data-chk-buscar]'));
    if (buscar) {
      const w = /** @type {any} */ (window);
      if (w.loveAbrirExplorarNaCategoria) w.loveAbrirExplorarNaCategoria(buscar.dataset.chkBuscar);
      return;
    }
    const abrirResp = alvo.closest('[data-chk-resp-abrir]');
    if (abrirResp) {
      const pop = /** @type {HTMLElement|null} */ (abrirResp.parentElement && abrirResp.parentElement.querySelector('.chk-resp-pop'));
      if (pop) pop.hidden = !pop.hidden;
      return;
    }
    const escolha = /** @type {HTMLElement|null} */ (alvo.closest('[data-chk-resp-valor]'));
    if (escolha) {
      const antes = t.responsavel;
      t.responsavel = escolha.dataset.chkRespValor || '';
      desenhar();
      if (!(await salvar(t))) { t.responsavel = antes; desenhar(); }
      return;
    }
    const btnMenu = alvo.closest('[data-chk-menu]');
    if (btnMenu) {
      const menu = /** @type {HTMLElement|null} */ (btnMenu.parentElement && btnMenu.parentElement.querySelector('.chk-menu'));
      if (menu) menu.hidden = !menu.hidden;
      return;
    }
    const acao = /** @type {HTMLElement|null} */ (alvo.closest('[data-chk-acao]'));
    if (!acao) return;
    const menu = acao.closest('.chk-menu');
    if (menu) /** @type {HTMLElement} */ (menu).hidden = true;
    const tipo = acao.dataset.chkAcao;
    if (tipo === 'prazo') abrirModal(t, 'prazo');
    else if (tipo === 'notas') abrirModal(t, 'notas');
    else if (tipo === 'editar') abrirModal(t, 'titulo');
    else if (tipo === 'excluir') {
      const w = /** @type {any} */ (window);
      const ok = w.confirmarNaLove ? await w.confirmarNaLove({ titulo: 'Excluir esta tarefa?', texto: `"${t.titulo}" sai do seu checklist.`, botao: 'Excluir' }) : false;
      if (!ok) return;
      if (await apagar(t)) desenhar();
    }
  });

  async function render() {
    const ev = eventoAtivo();
    const id = ev ? String(ev.id) : '';
    if (id && id !== eventoCarregado) {
      carregando = true;
      desenhar();
      await carregar();
    }
    desenhar();
  }

  /** @type {any} */ (window).LoveChecklist = { render };
})();
