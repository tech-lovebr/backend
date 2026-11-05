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
    depoimentos: [],
    socialLinks: {},
    companyAlteradoEm: null,
    documentoAlteradoEm: null
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

/* Categorias da empresa (as mesmas do cadastro em login.html) e as tags
   sugeridas de cada uma. Usadas em Meus produtos (tags do produto) e no
   onboarding da Home (js/onboarding-empresa.js). */
const FORNECEDOR_CATEGORIAS = [
  'Buffet e Gastronomia', 'Bar e Bebidas', 'Espaços para Locação', 'Staff e Mão de Obra',
  'Mídia e Audiovisual', 'Música e Entretenimento', 'Decoração', 'Assessoria e Cerimonialista',
  'Aluguel de Trajes', 'Beleza e Estilo', 'Aluguel de Carros'
];
const TAGS_POR_CATEGORIA = {
  'Buffet e Gastronomia': ['Buffet completo', 'Coquetel', 'Finger food', 'Churrasco', 'Comida de boteco', 'Massas', 'Comida japonesa', 'Mesa de frios', 'Doces finos', 'Bolo', 'Vegano', 'Vegetariano', 'Sem glúten', 'Café da manhã', 'Brunch', 'Food truck', 'Buffet infantil', 'Jantar servido à francesa'],
  'Bar e Bebidas': ['Open bar', 'Drinks autorais', 'Bartender', 'Chopp', 'Cervejas artesanais', 'Vinhos', 'Espumantes', 'Drinks sem álcool', 'Coquetelaria clássica', 'Bar móvel', 'Gin tônica', 'Caipirinhas', 'Café e barista', 'Bar infantil'],
  'Espaços para Locação': ['Ao ar livre', 'Salão fechado', 'Com piscina', 'Jardim', 'Vista para o mar', 'Campo', 'Rústico', 'Industrial', 'Clássico', 'Estacionamento', 'Acessível', 'Hospedagem no local', 'Até 100 convidados', 'Mais de 300 convidados', 'Cerimônia no local'],
  'Staff e Mão de Obra': ['Garçons', 'Recepcionistas', 'Seguranças', 'Bartenders', 'Copeiras', 'Manobristas', 'Limpeza', 'Montagem', 'Coordenação de equipe', 'Bilíngue', 'Uniformizado'],
  'Mídia e Audiovisual': ['Fotografia', 'Filmagem', 'Drone', 'Making of', 'Ensaio pré-wedding', 'Álbum impresso', 'Cabine de fotos', 'Transmissão ao vivo', 'Edição em 4K', 'Same day edit', 'Estilo documental', 'Estilo editorial', 'Fotos instantâneas'],
  'Música e Entretenimento': ['DJ', 'Banda ao vivo', 'Voz e violão', 'Quarteto de cordas', 'Samba e pagode', 'Sertanejo', 'Música eletrônica', 'MPB', 'Cerimônia musical', 'Mestre de cerimônias', 'Animação infantil', 'Pista de dança', 'Iluminação cênica', 'Efeitos especiais'],
  'Decoração': ['Clássica', 'Rústica', 'Boho', 'Minimalista', 'Moderna', 'Tropical', 'Romântica', 'Arranjos florais', 'Flores naturais', 'Iluminação', 'Mobiliário', 'Cenografia', 'Painel instagramável', 'Mesa posta', 'Balões'],
  'Assessoria e Cerimonialista': ['Assessoria completa', 'Assessoria do dia', 'Cerimonial', 'Planejamento', 'Destination wedding', 'Celebrante', 'Casamento civil', 'Bilíngue', 'Roteiro do evento', 'Gestão de fornecedores'],
  'Aluguel de Trajes': ['Vestido de noiva', 'Traje masculino', 'Aluguel', 'Sob medida', 'Madrinhas', 'Daminhas e pajens', 'Acessórios'],
  'Beleza e Estilo': ['Maquiagem', 'Penteado', 'Dia da noiva', 'Dia do noivo', 'Atendimento em domicílio']
};
