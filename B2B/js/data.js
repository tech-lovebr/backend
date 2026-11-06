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
   sugeridas de cada uma. Usadas em Meus produtos (tags do produto). */
const FORNECEDOR_CATEGORIAS = [
  'Buffet e Gastronomia', 'Bar e Bebidas', 'Espaços para Locação', 'Staff e Mão de Obra',
  'Mídia e Audiovisual', 'Música e Entretenimento', 'Decoração', 'Assessoria e Cerimonialista',
  'Aluguel de Trajes', 'Beleza e Estilo', 'Aluguel de Carros'
];
const TAGS_POR_CATEGORIA = {
  'Buffet e Gastronomia': ['Buffet completo', 'Bolo', 'Doces finos', 'Bem-casados', 'Brigadeiros gourmet', 'Docinhos de festa', 'Mesa de doces', 'Cupcakes', 'Salgados de festa', 'Finger food', 'Tábua de frios', 'Buffet infantil', 'Jantar servido à francesa', 'Churrasco', 'Massas', 'Café da manhã', 'Brunch', 'Carrinhos', 'Food truck', 'Comida de boteco', 'Comida japonesa', 'Cardápio vegano', 'Vegetariano', 'Sem glúten'],
  'Bar e Bebidas': ['Open bar', 'Coquetel', 'Drinks autorais', 'Coquetelaria clássica', 'Bartender', 'Sommelier', 'Chopp', 'Aluguel de cervejeira', 'Cervejas artesanais', 'Vinhos', 'Espumantes', 'Gin tônica', 'Caipirinhas', 'Drinks sem álcool', 'Bar infantil', 'Bar móvel', 'Consignação de bebidas', 'Café e barista'],
  'Espaços para Locação': ['Sítio', 'Chácara', 'Fazenda', 'Hotel', 'Restaurante', 'Salão de festas', 'Casa na praia', 'Casa de campo', 'Espaço exclusivo', 'Rooftop', 'Igreja/Capela', 'Ao ar livre', 'Jardim', 'Com piscina', 'Vista para o mar'],
  'Staff e Mão de Obra': ['Garçons', 'Bartenders', 'Recepcionistas', 'Seguranças', 'Copeiras', 'Limpeza', 'Manobristas', 'Montadores', 'Carregadores', 'Coordenação de equipe', 'Bilíngue', 'Uniformizado'],
  'Mídia e Audiovisual': ['Fotografia', 'Filmagem', 'Drone', 'Making of', 'Ensaio pré-wedding', 'Cabine de fotos', 'Fotos instantâneas', 'Álbum impresso', 'Edição de vídeo', 'Same day edit', 'Edição em 4K', 'Transmissão ao vivo', 'Estilo documental', 'Estilo editorial'],
  'Música e Entretenimento': ['DJ', 'Banda ao vivo', 'Voz e violão', 'Quarteto de cordas', 'Orquestra', 'Samba e pagode', 'Sertanejo', 'Música eletrônica', 'MPB', 'Cerimônia musical', 'Mestre de cerimônias', 'Animação de festa', 'Recreação infantil', 'Personagens vivos', 'Mágico', 'Aluguel de brinquedos', 'Iluminação cênica', 'Efeitos especiais'],
  'Decoração': ['Arranjos florais', 'Flores naturais', 'Iluminação', 'Mobiliário', 'Cenografia', 'Painel instagramável', 'Mesa posta', 'Balões', 'Lembrancinhas', 'Papelaria', 'Clássica', 'Rústica', 'Boho', 'Minimalista', 'Moderna', 'Tropical', 'Romântica'],
  'Assessoria e Cerimonialista': ['Assessoria completa', 'Assessoria do dia', 'Day coordinator', 'Cerimonial', 'Planejamento', 'Gestão de fornecedores', 'Roteiro do evento', 'Celebrante', 'Casamento civil', 'Destination wedding', 'Bilíngue'],
  'Aluguel de Trajes': ['Vestido de noiva', 'Traje masculino', 'Trajes de madrinhas', 'Daminhas e pajens', 'Roupas para festa', 'Moda infantil', 'Sob medida', 'Ateliê', 'Acessórios'],
  'Beleza e Estilo': ['Maquiagem', 'Penteado', 'Dia da noiva', 'Dia do noivo', 'Madrinhas', 'Camarim', 'Atendimento em domicílio'],
  'Aluguel de Carros': ['Carro clássico', 'Carro antigo', 'Carro de luxo', 'Conversível', 'Limousine', 'Com motorista', 'Van para convidados']
};
