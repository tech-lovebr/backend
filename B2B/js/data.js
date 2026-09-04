/* ==========================================================================
   LOVE B2B — Mock de Dados (Fornecedores & Assessores parceiros)
   Somente front-end. Sem integração com backend ainda.
   ========================================================================== */

const B2B_DATA = {
  professional: {
    name: 'Sophia Ramos',
    role: 'Fornecedora de Eventos',
    company: 'Sophia Eventos & Decoração',
    avatar: '../assets/advisor_sophia.jpg',
    plan: 'Plano Pro'
  },

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

  tarefas: [
    { id: 't1', text: 'Enviar contrato ajustado para Marina & Rafael', done: false },
    { id: 't2', text: 'Confirmar cardápio do buffet com Beatriz Andrade', done: false },
    { id: 't3', text: 'Atualizar fotos da vitrine com o evento de julho', done: true }
  ],

  leads: [
    { name: 'Marina & Rafael', event: 'Casamento', date: '18 Out 2026', status: 'proposta', value: 42000 },
    { name: 'Empresa Nortel', event: 'Evento Corporativo', date: '02 Nov 2026', status: 'novo', value: 18500 },
    { name: 'Beatriz Andrade', event: 'Debutante (15 anos)', date: '25 Set 2026', status: 'conversa', value: 27800 },
    { name: 'Carla & Vinícius', event: 'Casamento', date: '14 Dez 2026', status: 'fechado', value: 65000 },
    { name: 'João Pedro Souza', event: 'Aniversário', date: '30 Set 2026', status: 'novo', value: 9800 },
    { name: 'Fernanda Lima', event: 'Chá de Bebê', date: '09 Out 2026', status: 'conversa', value: 6200 }
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

  products: [
    { id: 'p1', name: 'Assessoria Completa do Dia D', category: 'Assessoria', price: 12000, active: true },
    { id: 'p2', name: 'Cerimonial Personalizado', category: 'Cerimonial', price: 6500, active: true },
    { id: 'p3', name: 'Coordenação de Fornecedores', category: 'Assessoria', price: 4200, active: true },
    { id: 'p4', name: 'Decoração Jardim Encantado', category: 'Decoração', price: 15800, active: false },
    { id: 'p5', name: 'Pacote Making Of + Fotografia', category: 'Fotografia', price: 8900, active: true }
  ]
};
