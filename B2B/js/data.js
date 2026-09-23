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

  alertas: [],

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
