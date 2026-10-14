/**
 * LOVE - Event OS & Marketplace
 * Base de Dados com Isolamento Completo por Comemoração (Multi-Event Scoping & Recados Recebidos)
 */

const LOVE_DATA = {
  // Lista de Comemorações Cadastradas na Conta
  events: [
    {
      id: 'evt-wedding-1',
      type: 'wedding',
      title: 'Casamento Beatriz & Lucas',
      hostName: 'Beatriz & Lucas',
      date: '2025-10-18',
      daysLeft: 112,
      slug: 'beatriz-e-lucas',
      publicUrl: 'https://love.com.br/beatriz-e-lucas',
      coverImage: 'assets/wedding_hero_banner.jpg',
      theme: 'Garden & Botanical',
      colorAccent: '#3B82F6',
      totalArrecadado: 18450.00,
      convidadosConfirmados: 185,
      adultosConfirmados: 160,
      criancasConfirmadas: 25,
      convidadosRecusados: 10,
      convidadosPendentes: 25,
      totalConvidados: 220,
      presentesRecebidos: 48,
      
      // Prefácios & Citações do Convite
      prefaces: [
        '"Um cordão de três dobras não se rompe com facilidade." (Eclesiastes 4:12)',
        'COM A BÊNÇÃO DE DEUS,'
      ],

      // Editor & Seções do Site do Casamento
      siteSections: {
        heroHeadline: 'CONVIDAM VOCÊ PARA O SEU CASAMENTO',
        heroSubtitle: 'A REALIZAR-SE',
        aboutText: 'Depois de 7 anos juntos e muitas viagens inesquecíveis, decidimos celebrar nosso amor cercados de quem mais amamos!',
        inviteText: 'Cerimônia às 16h30 no Espaço Villa Jardim. Traje: Passeio Completo / Tons Pastéis.'
      },

      // Dados Detalhados do Evento
      eventDetails: {
        date: '2025-10-18',
        time: '16:30',
        locationName: 'Villa Santanna Eventos',
        address: 'Av. Castello Branco, 2490',
        referencePoint: 'Em frente ao Parque do Povo, com serviço de Valet cortesia na entrada principal.',
        dresscode: 'Passeio Completo / Traje Social Nobre (Tons Pastéis sugeridos)',
        recommended: 'Chegar com 20 minutos de antecedência para acomodação tranquila; Uso de salto bloco ou confortável para área de gramado; Confirmar presença até 30 dias antes.',
        notRecommended: 'Uso de trajes brancos, off-white ou marfim (exclusivos da noiva); Uso de flash de celular durante a cerimônia religiosa; Levar convidados não cadastrados no RSVP.',
        generalInfo: 'Haverá recreação infantil especializada para crianças no Espaço Kids; Serviço de Valet cortesia para todos os convidados; Transfer disponível saindo do Hotel Parceiro às 15h40.'
      },

      // Carteira Financeira deste Casamento
      wallet: {
        saldoDisponivel: 14850.00,
        lancamentosFuturos: 3600.00,
        totalSacado: 8500.00,
        chavePix: 'beatriz.lucas@email.com (E-mail)',
        transactions: [
          {
            id: 'tx-1092',
            type: 'gift_pix',
            title: 'Presente: Safari na Lua de Mel (Cota 2/3)',
            guest: 'Carlos Eduardo & Família',
            date: 'Hoje, às 14:22',
            amount: 600.00,
            status: 'Disponível',
            method: 'PIX Instantâneo'
          },
          {
            id: 'tx-1091',
            type: 'gift_pix',
            title: 'Presente: Jogo de Cama 400 Fios',
            guest: 'Mariana Silveira',
            date: 'Hoje, às 10:45',
            amount: 450.00,
            status: 'Disponível',
            method: 'Cartão de Crédito'
          },
          {
            id: 'tx-1090',
            type: 'withdrawal',
            title: 'Transferência PIX para Conta Corrente',
            guest: 'Saque realizado por Beatriz',
            date: 'Ontem, às 16:30',
            amount: -5000.00,
            status: 'Concluído',
            method: 'PIX TED'
          },
          {
            id: 'tx-1089',
            type: 'gift_pix',
            title: 'Presente: Cafeteira Espresso Italiana',
            guest: 'Rodrigo & Camila',
            date: '24/08/2026',
            amount: 890.00,
            status: 'Disponível',
            method: 'PIX Instantâneo'
          }
        ]
      },

      // Lista de Presentes do Casamento
      giftList: [
        {
          id: 'gift-w1',
          title: 'Contribuir com Safari na Lua de Mel',
          category: 'Cotas de Lua de Mel',
          price: 1200.00,
          received: 1200.00,
          status: 'Completo (100%)',
          image: 'assets/card_safari.jpg',
          buyerName: 'Carlos Eduardo & Família',
          contributorsCount: 4
        },
        {
          id: 'gift-w2',
          title: 'Panela Casserole Redonda Le Creuset 24cm',
          category: 'Casa & Cozinha',
          price: 799.00,
          received: 799.00,
          status: 'Resgatado em PIX',
          image: 'assets/card_lecreuset.jpg',
          buyerName: 'Mariana Silveira',
          contributorsCount: 1
        },
        {
          id: 'gift-w3',
          title: 'Cafeteira Espresso Italiana Inox Especialista',
          category: 'Eletrodomésticos',
          price: 890.00,
          received: 890.00,
          status: 'Resgatado em PIX',
          image: 'assets/card_espresso.jpg',
          buyerName: 'Rodrigo & Camila',
          contributorsCount: 2
        },
        {
          id: 'gift-w4',
          title: 'Passeio de Caiaque no Paraíso da Lua de Mel',
          category: 'Experiências',
          price: 650.00,
          received: 650.00,
          status: 'Completo (100%)',
          image: 'assets/card_kayak.jpg',
          buyerName: 'Guilherme Siqueira',
          contributorsCount: 3
        },
        {
          id: 'gift-w5',
          title: 'Jogo de Cama 400 Fios Egípcio & Almofadas',
          category: 'Casa & Cozinha',
          price: 450.00,
          received: 450.00,
          status: 'Disponível na Loja',
          image: 'assets/card_bedding.jpg',
          buyerName: 'Fernanda & Thiago Rossi',
          contributorsCount: 1
        },
        {
          id: 'gift-w6',
          title: 'Buquê Sublime de Flores Nobres do Ateliê',
          category: 'Flores & Afeto',
          price: 189.90,
          received: 0.00,
          status: 'Disponível para Presentear',
          image: 'assets/bouquet_roses.jpg',
          buyerName: null,
          contributorsCount: 0
        }
      ],

      // Presentes Já Recebidos dos Convidados
      receivedGifts: [
        {
          id: 'rec-1',
          giftTitle: 'Contribuir com Safari na Lua de Mel',
          guestName: 'Lucas Albuquerque & Família',
          date: 'Hoje, às 14:22',
          amount: 600.00,
          method: 'PIX Instantâneo',
          message: 'Que essa viagem seja inesquecível para vocês! Amamos muito o casal!',
          image: 'assets/card_safari.jpg'
        },
        {
          id: 'rec-2',
          giftTitle: 'Jogo de Cama 400 Fios Egípcio & Almofadas',
          guestName: 'Mariana Silveira',
          date: 'Hoje, às 10:45',
          amount: 450.00,
          method: 'Cartão de Crédito',
          message: 'Desejo toda a felicidade do mundo no novo lar!',
          image: 'assets/card_bedding.jpg'
        },
        {
          id: 'rec-3',
          giftTitle: 'Cafeteira Espresso Italiana Inox Especialista',
          guestName: 'Rodrigo & Camila',
          date: '24/08/2026',
          amount: 890.00,
          method: 'PIX Instantâneo',
          message: 'Muitos cafés e conversas boas nessa nova jornada! Parabéns!',
          image: 'assets/card_espresso.jpg'
        },
        {
          id: 'rec-4',
          giftTitle: 'Panela Casserole Redonda Le Creuset 24cm',
          guestName: 'Tia Helena e Tio Carlos',
          date: '22/08/2026',
          amount: 799.00,
          method: 'PIX Instantâneo',
          message: 'Para os melhores jantares de vocês dois!',
          image: 'assets/card_lecreuset.jpg'
        }
      ],

      // Convidados do Casamento
      guests: [
        {
          id: 'gw-1',
          name: 'Carlos Eduardo',
          email: 'carlos.eduardo@email.com',
          phone: '(11) 98765-4321',
          companions: 3,
          adults: 2,
          children: 2,
          table: 'Mesa 04 (Família)',
          status: 'confirmed',
          confirmedAt: '14/08/2026 às 14:22',
          dietaryRestrictions: '1 Criança intolerante a lactose',
          companionsNames: ['Patrícia Eduardo (Esposa)', 'Enzo Eduardo (Filho - 8 anos)', 'Valentina Eduardo (Filha - 5 anos)'],
          giftsBought: [
            {
              giftTitle: 'Contribuir com Safari na Lua de Mel (Cota 2/3)',
              type: 'virtual',
              amount: 600.00,
              date: 'Hoje, às 14:22',
              method: 'PIX Instantâneo',
              image: 'assets/card_safari.jpg',
              message: 'Que essa viagem seja inesquecível para vocês! Amamos muito o casal!'
            }
          ]
        },
        {
          id: 'gw-2',
          name: 'Mariana Silveira',
          email: 'mariana.silveira@design.com',
          phone: '(11) 99123-4567',
          companions: 1,
          adults: 2,
          children: 0,
          table: 'Mesa 08 (Amigos Faculdade)',
          status: 'confirmed',
          confirmedAt: 'Hoje às 10:45',
          dietaryRestrictions: 'Vegetariana',
          companionsNames: ['Lucas Albuquerque (Acompanhante)'],
          giftsBought: [
            {
              giftTitle: 'Jogo de Cama 400 Fios Egípcio & Almofadas',
              type: 'virtual',
              amount: 450.00,
              date: 'Hoje, às 10:45',
              method: 'Cartão de Crédito',
              image: 'assets/card_bedding.jpg',
              message: 'Desejo toda a felicidade do mundo no novo lar!'
            }
          ]
        },
        {
          id: 'gw-3',
          name: 'Rodrigo Mendes',
          email: 'rodrigo.mendes@advocacia.com',
          phone: '(21) 98877-6655',
          companions: 2,
          adults: 2,
          children: 1,
          table: 'Mesa 08 (Amigos Faculdade)',
          status: 'confirmed',
          confirmedAt: '24/08/2026 às 16:30',
          dietaryRestrictions: 'Nenhuma restrição',
          companionsNames: ['Camila Mendes (Esposa)', 'Bernardo Mendes (Filho - 4 anos)'],
          giftsBought: [
            {
              giftTitle: 'Cafeteira Espresso Italiana Inox Especialista',
              type: 'virtual',
              amount: 890.00,
              date: '24/08/2026',
              method: 'PIX Instantâneo',
              image: 'assets/card_espresso.jpg',
              message: 'Muitos cafés e conversas boas nessa nova jornada! Parabéns!'
            }
          ]
        },
        {
          id: 'gw-4',
          name: 'Guilherme Siqueira',
          email: 'guilherme.siqueira@empresa.com',
          phone: '(11) 97766-5544',
          companions: 1,
          adults: 2,
          children: 0,
          table: 'Mesa 12 (Trabalho)',
          status: 'pending',
          confirmedAt: 'Aguardando resposta do convite',
          dietaryRestrictions: 'Não informado',
          companionsNames: ['1 Acompanhante pendente'],
          giftsBought: []
        },
        {
          id: 'gw-5',
          name: 'Fernanda Rossi',
          email: 'fernanda.rossi@email.com',
          phone: '(19) 98112-2334',
          companions: 2,
          adults: 2,
          children: 1,
          table: 'Mesa 10 (Primos)',
          status: 'pending',
          confirmedAt: 'Aguardando resposta do convite',
          dietaryRestrictions: 'Não informado',
          companionsNames: ['Thiago Rossi (Marido)', 'Manuela Rossi (Filha - 6 anos)'],
          giftsBought: []
        },
        {
          id: 'gw-6',
          name: 'Marcelo Vieira',
          email: 'marcelo.vieira@email.com',
          phone: '(31) 99344-5566',
          companions: 0,
          adults: 1,
          children: 0,
          table: 'Sem mesa',
          status: 'declined',
          confirmedAt: 'Recusado em 20/08/2026 às 09:15',
          dietaryRestrictions: 'Nenhuma restrição',
          companionsNames: [],
          giftsBought: []
        },
        {
          id: 'gw-7',
          name: 'Juliana Alcantara',
          email: 'juliana.alcantara@email.com',
          phone: '(11) 99881-2233',
          companions: 2,
          adults: 2,
          children: 1,
          table: 'Mesa 02 (Padrinhos)',
          status: 'confirmed',
          confirmedAt: '20/08/2026 às 11:20',
          dietaryRestrictions: 'Nenhuma',
          companionsNames: ['Pedro Alcantara', 'Lucas Alcantara'],
          giftsBought: []
        },
        {
          id: 'gw-8',
          name: 'Renata Toledo',
          email: 'renata.toledo@email.com',
          phone: '(11) 97122-3344',
          companions: 1,
          adults: 2,
          children: 0,
          table: 'Mesa 05 (Amigos SP)',
          status: 'confirmed',
          confirmedAt: '18/08/2026 às 19:40',
          dietaryRestrictions: 'Sem glúten',
          companionsNames: ['Gabriel Toledo'],
          giftsBought: []
        },
        {
          id: 'gw-9',
          name: 'Lucas Brandão',
          email: 'lucas.brandao@email.com',
          phone: '(11) 98344-9988',
          companions: 0,
          adults: 1,
          children: 0,
          table: 'Mesa 08 (Amigos Faculdade)',
          status: 'confirmed',
          confirmedAt: '17/08/2026 às 08:30',
          dietaryRestrictions: 'Nenhuma',
          companionsNames: [],
          giftsBought: []
        },
        {
          id: 'gw-10',
          name: 'Beatriz Martins',
          email: 'bia.martins@email.com',
          phone: '(21) 99455-6677',
          companions: 1,
          adults: 2,
          children: 0,
          table: 'Mesa 03 (Família Noivo)',
          status: 'confirmed',
          confirmedAt: '16/08/2026 às 15:10',
          dietaryRestrictions: 'Nenhuma',
          companionsNames: ['Lucas Prado'],
          giftsBought: []
        },
        {
          id: 'gw-11',
          name: 'Camila Ferreira',
          email: 'camila.ferreira@email.com',
          phone: '(11) 98777-1122',
          companions: 0,
          adults: 1,
          children: 0,
          table: 'Mesa 06 (Madrinhas)',
          status: 'confirmed',
          confirmedAt: '15/08/2026 às 18:00',
          dietaryRestrictions: 'Vegetariana',
          companionsNames: [],
          giftsBought: []
        },
        {
          id: 'gw-12',
          name: 'Otávio Guimarães',
          email: 'otavio.guimaraes@email.com',
          phone: '(19) 99666-4433',
          companions: 3,
          adults: 2,
          children: 2,
          table: 'Mesa 04 (Família)',
          status: 'confirmed',
          confirmedAt: '15/08/2026 às 12:45',
          dietaryRestrictions: 'Nenhuma',
          companionsNames: ['Denise Guimarães', 'Felipe (9 anos)', 'Marina (6 anos)'],
          giftsBought: []
        }
      ],

      // Recados Recebidos dos Convidados na Confirmação de Presença
      messages: [
        {
          id: 'msg-w1',
          author: 'Carlos Eduardo & Família',
          text: 'Que alegria imensa ver esse amor se consolidar! Estaremos lá com certeza para brindar com vocês. Felicidades eternas ao casal!',
          date: 'Hoje, às 14:25',
          status: 'confirmed'
        },
        {
          id: 'msg-w2',
          author: 'Mariana Silveira',
          text: 'Bia e Lucas, vocês são pura inspiração! Mal posso esperar para chorar e dançar muito no grande dia. Amo vocês!',
          date: 'Hoje, às 10:48',
          status: 'confirmed'
        },
        {
          id: 'msg-w3',
          author: 'Rodrigo & Camila Mendes',
          text: 'Contando os dias para esse festão inesquecível! Parabéns ao casal mais parceiro e especial do mundo.',
          date: 'Ontem, às 16:35',
          status: 'confirmed'
        }
      ]
    },

    {
      id: 'evt-baby-1',
      type: 'baby',
      title: 'Chá de Bebê do Theo',
      hostName: 'Beatriz & Lucas (Pais do Theo)',
      date: '2025-12-05',
      daysLeft: 160,
      slug: 'cha-do-theo',
      publicUrl: 'https://love.com.br/cha-do-theo',
      coverImage: 'assets/theme_garden.jpg',
      theme: 'Pastel Mint & Clouds',
      colorAccent: '#06B6D4',
      totalArrecadado: 4250.00,
      convidadosConfirmados: 42,
      adultosConfirmados: 36,
      criancasConfirmadas: 6,
      convidadosRecusados: 3,
      convidadosPendentes: 5,
      totalConvidados: 50,
      presentesRecebidos: 18,

      // Editor & Seções do Chá de Bebê
      siteSections: {
        heroHeadline: 'Bem-vindo ao Chá de Bebê do Theo! 🍼✨',
        heroSubtitle: 'Estamos muito felizes em compartilhar esse momento tão especial da nossa família com você.',
        aboutText: 'Nosso pequeno Theo está a caminho para encher nossas vidas de ainda mais amor e alegria!',
        inviteText: 'Dia 05 de Dezembro às 15h no Salão de Festas Jardins. Traga seu abraço e sua alegria!'
      },

      // Dados Detalhados do Evento
      eventDetails: {
        date: '2025-12-05',
        time: '15:00',
        locationName: 'Salão de Festas Jardins & Lounge',
        address: 'Rua das Camélias, 450 - Jardins, São Paulo - SP',
        referencePoint: 'Próximo à Praça das Flores, entrada pela portaria social.',
        dresscode: 'Esporte Fino / Tons Pastel e Branco',
        recommended: 'Chegar às 15h para recepção e fotos; Trazer muita energia boa e abraços calorosos.',
        notRecommended: 'Levar animais de estimação para o salão interno fechado.',
        generalInfo: 'Haverá brincadeiras interativas e lembrancinhas exclusivas do Theo para todos os convidados!'
      },

      // Carteira Financeira do Chá de Bebê
      wallet: {
        saldoDisponivel: 3450.00,
        lancamentosFuturos: 800.00,
        totalSacado: 1200.00,
        chavePix: 'theo.baby@email.com (E-mail)',
        transactions: [
          {
            id: 'tx-b1',
            type: 'gift_pix',
            title: 'Presente: Berço Portátil Desmontável',
            guest: 'Vovó Neuza & Vovô Jorge',
            date: 'Hoje, às 11:15',
            amount: 750.00,
            status: 'Disponível',
            method: 'PIX Instantâneo'
          },
          {
            id: 'tx-b2',
            type: 'gift_pix',
            title: 'Presente: Pacote Anual de Fraldas Ecológicas',
            guest: 'Tia Juliana & Família',
            date: 'Ontem, às 18:40',
            amount: 500.00,
            status: 'Disponível',
            method: 'PIX Instantâneo'
          },
          {
            id: 'tx-b3',
            type: 'withdrawal',
            title: 'Transferência PIX para Conta Poupança',
            guest: 'Saque realizado por Lucas',
            date: '20/08/2026',
            amount: -1200.00,
            status: 'Concluído',
            method: 'PIX TED'
          }
        ]
      },

      // Lista de Presentes do Chá de Bebê
      giftList: [
        {
          id: 'gift-b1',
          title: 'Berço Portátil Conforto & Mosquiteiro',
          category: 'Quarto do Bebê',
          price: 750.00,
          received: 750.00,
          status: 'Resgatado em PIX',
          image: 'assets/card_bedding.jpg',
          contributorsCount: 1
        },
        {
          id: 'gift-b2',
          title: 'Cota Fraldas Hipoalergênicas (10 Pacotes)',
          category: 'Cuidados & Higiene',
          price: 350.00,
          received: 350.00,
          status: 'Completo (100%)',
          image: 'assets/card_safari.jpg',
          contributorsCount: 2
        },
        {
          id: 'gift-b3',
          title: 'Cadeira de Refeição Dobrável Anatômica',
          category: 'Alimentação',
          price: 420.00,
          received: 420.00,
          status: 'Disponível para Envio',
          image: 'assets/card_espresso.jpg',
          contributorsCount: 1
        }
      ],

      // Presentes Já Recebidos dos Convidados
      receivedGifts: [
        {
          id: 'rec-b1',
          giftTitle: 'Kit Enxoval Algodão Pima Premium (5 peças)',
          guestName: 'Vovó Marise',
          date: 'Hoje, às 11:30',
          amount: 380.00,
          method: 'PIX Instantâneo',
          message: 'Para o príncipe Theo ficar ainda mais lindo!',
          image: 'assets/bouquet_roses.jpg'
        },
        {
          id: 'rec-b2',
          giftTitle: 'Cota Fraldas Ecológicas por 6 Meses',
          guestName: 'Tia Juliana',
          date: 'Ontem, às 19:15',
          amount: 500.00,
          method: 'PIX Instantâneo',
          message: 'Uma ajudinha para os papais de primeira viagem! Amo vocês!',
          image: 'assets/breakfast_basket.jpg'
        }
      ],

      // Convidados do Chá de Bebê
      guests: [
        {
          id: 'gb-1',
          name: 'Vovó Neuza & Vovô Jorge',
          companions: 1,
          adults: 2,
          children: 0,
          phone: '(11) 99887-1122',
          table: 'Mesa da Família',
          status: 'confirmed'
        },
        {
          id: 'gb-2',
          name: 'Tia Juliana & Tio Pedro',
          companions: 2,
          adults: 2,
          children: 1,
          phone: '(11) 98711-2233',
          table: 'Mesa da Família',
          status: 'confirmed'
        },
        {
          id: 'gb-3',
          name: 'Amanda & Bruno',
          companions: 1,
          adults: 2,
          children: 0,
          phone: '(19) 99122-3344',
          table: 'Mesa dos Amigos',
          status: 'confirmed'
        },
        {
          id: 'gb-4',
          name: 'Dra. Camila (Pediatra)',
          companions: 0,
          adults: 1,
          children: 0,
          phone: '(11) 97755-6677',
          table: 'Pendente',
          status: 'pending'
        },
        {
          id: 'gb-5',
          name: 'Marcelo (Colega de Trabalho)',
          companions: 0,
          adults: 1,
          children: 0,
          phone: '(11) 97711-2244',
          table: 'Sem mesa',
          status: 'declined'
        }
      ],

      // Recados do Chá de Bebê
      messages: [
        {
          id: 'msg-b1',
          author: 'Vovó Neuza & Vovô Jorge',
          text: 'O vovô e a vovó já estão contando os minutos para encher o Theo de carinho e beijinhos!',
          date: 'Hoje, às 11:20',
          status: 'confirmed'
        },
        {
          id: 'msg-b2',
          author: 'Tia Juliana & Tio Pedro',
          text: 'Que o Theo venha com muita saúde para alegrar ainda mais a família. Estaremos todos lá!',
          date: 'Ontem, às 18:45',
          status: 'confirmed'
        }
      ]
    }
  ],

  // Comemoração Ativa
  currentEventId: 'evt-wedding-1',

  // Fornecedores e contratos vêm do Supabase (cadastros do B2B) — ver
  // carregarFornecedoresVitrine em js/app.js. Sem dados de demonstração aqui.
  venues: [],
  advisors: [],
  photo: [],
  buffet: [],
  contractedVendors: []
};

window.LOVE_DATA = LOVE_DATA;
