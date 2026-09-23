/* ==========================================================================
   LOVE B2B — Mock de Dados (Fornecedores & Assessores parceiros)
   Somente front-end. Sem integração com backend ainda.
   ========================================================================== */

const B2B_DATA = {
  professional: {
    name: 'Sophia Ramos',
    email: 'sophia@sophiaeventos.com.br',
    role: 'Fornecedora de Eventos',
    company: 'Sophia Eventos & Decoração',
    phone: '(19) 99876-5432',
    birthDate: '1990-04-12',
    documentType: 'cnpj',
    documentNumber: '12.345.678/0001-90',
    address: 'Rua das Palmeiras, 250',
    city: 'Indaiatuba',
    state: 'SP',
    description: 'Assessoria completa para casamentos e eventos de alto padrão em Indaiatuba e região.',
    logo: null,
    logoScale: 1,
    logoOffsetX: 0,
    logoOffsetY: 0,
    avatar: '../assets/advisor_sophia.jpg',
    plan: 'Gratuito',
    businessEmail: null,
    twoFactorEnabled: false,
    selfieVerified: false,
    pixKeyType: null,
    pixKey: null
  },

  siteMetrics: {
    visits30d: 186,
    rating: 8.9
  },

  news: [
    { title: 'Love lança novo painel de métricas para fornecedores', url: '#' },
    { title: '5 dicas para aumentar sua taxa de conversão de leads', url: '#' },
    { title: 'Convite: Workshop online sobre precificação de eventos', url: '#' },
    { title: 'Pagamentos via PIX chegaram à plataforma Love', url: '#' },
    { title: 'Como destacar seu portfólio na vitrine e atrair mais clientes', url: '#' }
  ],

  modules: {
    dashboard: 'Dashboard',
    mensagens: 'Mensagens',
    crm: 'CRM',
    contratos: 'Contratos',
    produtos: 'Produtos & Serviços',
    agenda: 'Agenda',
    financeiro: 'Financeiro',
    vitrine: 'Vitrine & Portfólio',
    funcoes: 'Funções',
    configuracoes: 'Configurações'
  },

  roleTemplates: {
    'Administrador': {
      desc: 'Acesso total a todas as áreas da conta, incluindo Funções e Financeiro.',
      modules: ['dashboard', 'mensagens', 'crm', 'contratos', 'produtos', 'agenda', 'financeiro', 'vitrine', 'funcoes', 'configuracoes']
    },
    'Operacional': {
      desc: 'Cuida do dia a dia: leads, mensagens, contratos, produtos e agenda.',
      modules: ['dashboard', 'mensagens', 'crm', 'contratos', 'produtos', 'agenda']
    },
    'Financeiro': {
      desc: 'Acesso a contratos e à área financeira da conta.',
      modules: ['dashboard', 'contratos', 'financeiro']
    },
    'Visualizador': {
      desc: 'Pode acompanhar o dashboard, sem editar nada.',
      modules: ['dashboard']
    },
    'Personalizado': {
      desc: 'Escolha manualmente quais áreas essa pessoa pode acessar.',
      modules: []
    }
  },

  team: [
    {
      id: 'u1',
      name: 'Sophia Ramos',
      email: 'sophia@sophiaeventos.com.br',
      avatar: '../assets/advisor_sophia.jpg',
      role: 'Administrador',
      status: 'ativo',
      owner: true,
      modules: ['dashboard', 'mensagens', 'crm', 'contratos', 'produtos', 'agenda', 'financeiro', 'vitrine', 'funcoes', 'configuracoes']
    },
    {
      id: 'u2',
      name: 'Marcos Vinícius',
      email: 'marcos@sophiaeventos.com.br',
      avatar: '../assets/advisor_marcos.jpg',
      role: 'Operacional',
      status: 'ativo',
      owner: false,
      modules: ['dashboard', 'mensagens', 'crm', 'contratos', 'produtos', 'agenda']
    },
    {
      id: 'u3',
      name: 'Claudia Nunes',
      email: 'claudia@sophiaeventos.com.br',
      avatar: '../assets/advisor_claudia.jpg',
      role: 'Financeiro',
      status: 'pendente',
      owner: false,
      modules: ['dashboard', 'contratos', 'financeiro']
    }
  ],

  proximosEventos: [
    { id: 'e1', client: 'Fernanda Lima', event: 'Chá de Bebê', day: 5, local: 'Espaço Rosa Chá, Indaiatuba', status: 'confirmado' },
    { id: 'e2', client: 'Beatriz Andrade', event: 'Debutante (15 anos)', day: 8, local: 'Buffet Encanto, Indaiatuba', status: 'visita técnica' },
    { id: 'e3', client: 'João Pedro Souza', event: 'Aniversário', day: 10, local: 'Chácara Bella Vista', status: 'reunião' },
    { id: 'e4', client: 'Marina & Rafael', event: 'Casamento', day: 14, local: 'Espaço Villa Real, Indaiatuba', status: 'confirmado' }
  ],

  alertas: [
    { text: '3 mensagens não lidas de clientes', href: 'mensagens.html', tone: 'info' },
    { text: '1 contrato vence hoje — Marina & Rafael', href: 'contratos.html', tone: 'critical' },
    { text: '1 orçamento aguardando sua aprovação', href: 'crm.html', tone: 'warning' }
  ],

  leads: [
    { id: 'l1', name: 'Marina & Rafael', event: 'Casamento', date: '18 Out 2026', status: 'proposta', value: 42000, birthday: '09-20' },
    { id: 'l2', name: 'Empresa Nortel', event: 'Evento Corporativo', date: '02 Nov 2026', status: 'novo', value: 18500 },
    { id: 'l3', name: 'Beatriz Andrade', event: 'Debutante (15 anos)', date: '25 Set 2026', status: 'conversa', value: 27800, birthday: '10-02' },
    { id: 'l4', name: 'Carla & Vinícius', event: 'Casamento', date: '14 Dez 2026', status: 'fechado', value: 65000 },
    { id: 'l5', name: 'João Pedro Souza', event: 'Aniversário', date: '30 Set 2026', status: 'novo', value: 9800, birthday: '09-15' },
    { id: 'l6', name: 'Fernanda Lima', event: 'Chá de Bebê', date: '09 Out 2026', status: 'conversa', value: 6200 }
  ],

  conversations: [
    {
      id: 'c1',
      name: 'Marina & Rafael',
      event: 'Casamento · 18 Out 2026',
      avatar: null,
      unread: 2,
      messages: [
        { from: 'them', text: 'Oi Sophia! Vimos sua proposta e adoramos o conceito do jardim.', time: '09:12' },
        { from: 'me', text: 'Que ótimo! Podemos incluir também a decoração de mesa nesse pacote.', time: '09:15' },
        { from: 'them', text: 'Perfeito, pode enviar o contrato com esses ajustes?', time: '09:20' }
      ]
    },
    {
      id: 'c2',
      name: 'Empresa Nortel',
      event: 'Evento Corporativo · 02 Nov 2026',
      avatar: null,
      unread: 0,
      messages: [
        { from: 'them', text: 'Precisamos confirmar a capacidade do salão para 250 pessoas.', time: 'Ontem' },
        { from: 'me', text: 'Confirmado, o espaço comporta até 300 convidados sentados.', time: 'Ontem' }
      ]
    },
    {
      id: 'c3',
      name: 'Beatriz Andrade',
      event: 'Debutante · 25 Set 2026',
      avatar: null,
      unread: 1,
      messages: [
        { from: 'them', text: 'A banda que vocês indicaram está disponível na data?', time: '2 dias' },
        { from: 'me', text: 'Vou confirmar com o fornecedor e te retorno hoje ainda.', time: '2 dias' },
        { from: 'them', text: 'Combinado, aguardo!', time: '2 dias' }
      ]
    },
    {
      id: 'c4',
      name: 'Carla & Vinícius',
      event: 'Casamento · 14 Dez 2026',
      avatar: null,
      unread: 0,
      messages: [
        { from: 'them', text: 'Contrato assinado! Muito obrigada pelo cuidado com os detalhes.', time: '5 dias' },
        { from: 'me', text: 'Nós que agradecemos a confiança! Vamos começar o planejamento.', time: '5 dias' }
      ]
    }
  ],

  contracts: [
    { id: 'ct1', client: 'Carla & Vinícius', event: 'Casamento', value: 65000, status: 'assinado', date: '28 Ago 2026' },
    { id: 'ct2', client: 'Marina & Rafael', event: 'Casamento', value: 42000, status: 'enviado', date: '31 Ago 2026' },
    { id: 'ct3', client: 'Empresa Nortel', event: 'Evento Corporativo', value: 18500, status: 'recusado', date: '20 Ago 2026' }
  ],

  financeiro: {
    saqueDisponivel: 4280,
    faturamentoEsteMes: 18500,
    faturamentoMesPassado: 15200,
    valorEmAberto: 6200
  },

  contratosAbertos: [
    {
      id: 'c1', client: 'Carla Mendes', phone: '(19) 99811-2233', categoria: 'Casamento', valorTotal: 12000, valorPago: 12000, parcelasPagas: 3, parcelasTotal: 3, proximaParcela: null, status: 'quitado',
      evento: {
        nome: 'Casamento Carla & Diego', local: 'Espaço Villa Real, Indaiatuba', data: '2026-11-14', horario: '19:00',
        siteUrl: 'https://convite.love/carla-diego',
        informacoes: 'Cerimônia ao ar livre seguida de recepção no salão principal. Open bar até 01h.',
        dressCode: 'Traje social'
      },
      convidados: [
        { id: 'g1', nome: 'Ana Beatriz Ferreira', status: 'confirmado', mesa: '3', whatsapp: '(19) 98811-4021', comentarios: [{ id: 'com-g1a', user: 'Sophia Eventos & Decoração', text: 'Vegetariana', at: '2026-09-10T14:30:00' }] },
        { id: 'g2', nome: 'Bruno Castro', status: 'confirmado', mesa: '3', whatsapp: '(19) 98822-5032', comentarios: [] },
        { id: 'g3', nome: 'Camila Duarte', status: 'pendente', mesa: '', whatsapp: '(19) 98833-6043', comentarios: [] },
        { id: 'g4', nome: 'Diego Martins', status: 'recusado', mesa: '', whatsapp: '(19) 98844-7054', comentarios: [{ id: 'com-g4a', user: 'Sophia Eventos & Decoração', text: 'Viagem a trabalho, confirmou ausência.', at: '2026-09-12T09:15:00' }] }
      ]
    },
    {
      id: 'c2', client: 'Marina Costa', phone: '(19) 99622-4477', categoria: 'Casamento', valorTotal: 9500, valorPago: 4700, parcelasPagas: 2, parcelasTotal: 4, proximaParcela: '2026-10-18', status: 'em_dia',
      evento: {
        nome: 'Casamento Marina & Rafael', local: 'Espaço Jardim, Indaiatuba', data: '2026-12-14', horario: '18:30',
        siteUrl: 'https://convite.love/marina-rafael',
        informacoes: 'Cerimônia religiosa às 18h30, recepção logo em seguida. Estacionamento com manobrista.',
        dressCode: 'Esporte fino'
      },
      convidados: [
        { id: 'g5', nome: 'Eduardo Nunes', status: 'confirmado', mesa: '1', whatsapp: '(19) 98855-8065', comentarios: [] },
        { id: 'g6', nome: 'Fernanda Rocha', status: 'confirmado', mesa: '1', whatsapp: '(19) 98866-9076', comentarios: [{ id: 'com-g6a', user: 'Sophia Eventos & Decoração', text: 'Alergia a frutos do mar', at: '2026-09-08T11:00:00' }] },
        { id: 'g7', nome: 'Gustavo Pires', status: 'pendente', mesa: '', whatsapp: '(19) 98877-1087', comentarios: [] }
      ]
    },
    {
      id: 'c3', client: 'Beatriz Andrade', phone: '(19) 99733-5588', categoria: 'Aniversário', valorTotal: 6600, valorPago: 1980, parcelasPagas: 1, parcelasTotal: 3, proximaParcela: '2026-09-05', status: 'atrasado',
      evento: {
        nome: 'Debutante Beatriz Andrade', local: 'Buffet Encanto, Indaiatuba', data: '2026-10-08', horario: '20:00',
        siteUrl: 'https://convite.love/beatriz-15anos',
        informacoes: 'Valsa às 21h, buffet livre durante toda a festa.',
        dressCode: 'Traje de gala'
      },
      convidados: [
        { id: 'g8', nome: 'Helena Duarte', status: 'confirmado', mesa: '5', whatsapp: '(19) 98888-2098', comentarios: [] },
        { id: 'g9', nome: 'Igor Salles', status: 'recusado', mesa: '', whatsapp: '(19) 98899-3109', comentarios: [{ id: 'com-g9a', user: 'Sophia Eventos & Decoração', text: 'Compromisso familiar, não poderá comparecer.', at: '2026-09-15T16:45:00' }] }
      ]
    }
  ],

  products: [
    { id: 'p1', name: 'Assessoria Completa do Dia D', category: 'Assessoria', price: 12000, active: true },
    { id: 'p2', name: 'Cerimonial Personalizado', category: 'Cerimonial', price: 6500, active: true },
    { id: 'p3', name: 'Coordenação de Fornecedores', category: 'Assessoria', price: 4200, active: true },
    { id: 'p4', name: 'Decoração Jardim Encantado', category: 'Decoração', price: 15800, active: false },
    { id: 'p5', name: 'Pacote Making Of + Fotografia', category: 'Fotografia', price: 8900, active: true }
  ],

  siteForms: [
    {
      id: 'form1',
      title: 'Formulário de orçamento',
      responses: 18,
      fields: [
        { id: 'f1a', type: 'curta', question: 'Nome completo' },
        { id: 'f1b', type: 'multipla', question: 'Tipo de evento', options: ['Casamento', 'Debutante', 'Aniversário', 'Corporativo'] },
        { id: 'f1c', type: 'longa', question: 'Conte um pouco sobre o evento que você está planejando' }
      ]
    },
    {
      id: 'form2',
      title: 'Pesquisa de satisfação',
      responses: 34,
      fields: [
        { id: 'f2a', type: 'multipla', question: 'Como você avalia o nosso atendimento?', options: ['Ótimo', 'Bom', 'Regular', 'Ruim'] },
        { id: 'f2b', type: 'longa', question: 'O que podemos melhorar?' }
      ]
    }
  ]
};
