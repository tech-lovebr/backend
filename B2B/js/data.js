/* ==========================================================================
   LOVE B2B — Mock de Dados (Fornecedores & Assessores parceiros)
   Somente front-end. Sem integração com backend ainda.
   ========================================================================== */

const B2B_DATA = {
  // Perfil vazio: tudo vem do cadastro do fornecedor no banco (shell.js).
  professional: {
    name: '',
    email: '',
    role: '',
    company: '',
    phone: '',
    birthDate: '',
    documentType: 'cnpj',
    documentNumber: '',
    address: '',
    city: '',
    state: 'SP',
    description: '',
    logo: null,
    logoScale: 1,
    logoOffsetX: 0,
    logoOffsetY: 0,
    avatar: null,
    plan: 'Gratuito',
    businessEmail: null,
    twoFactorEnabled: false,
    selfieVerified: false,
    pixKeyType: null,
    pixKey: null,
    serviceRadiusKm: 50,
    deliveryTime: '',
    depositPercent: null,
    depositDeadlineDays: null,
    cancellationPolicy: '',
    useProfileAddress: true,
    businessAddress: '',
    businessCity: '',
    businessState: 'SP',
    maxInstallmentsNoInterest: 0,
    requiresFullPaymentByEvent: false,
    portfolioImages: [],
    depoimentos: []
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
    mensagens: 'Chat',
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

  // Equipe real da conta: por enquanto só o responsável principal, montado
  // pelo shell.js a partir do cadastro do fornecedor (sem colaboradores de
  // demonstração).
  team: [],

  alertas: [],

  // Formulários do Editor de Site: sem os de demonstração — só os que o
  // fornecedor criou, guardados no navegador (b2b-site-forms; ainda não há
  // tabela no banco). Excluir um some de vez.
  siteForms: (() => {
    try { return JSON.parse(localStorage.getItem('b2b-site-forms') || '[]'); } catch (e) { return []; }
  })()
};
