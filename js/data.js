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
        locationName: 'Villa Bisutti - Espaço Jardim',
        address: 'Av. Cidade Jardim, 1200 - Itaim Bibi, São Paulo - SP',
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
          name: 'Carlos Eduardo & Família',
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
          name: 'Rodrigo & Camila Mendes',
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
          name: 'Fernanda & Thiago Rossi',
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
          name: 'Juliana & Pedro Alcantara',
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
          name: 'Renata & Gabriel Toledo',
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
          name: 'Beatriz Martins & Lucas Prado',
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
          name: 'Otávio & Denise Guimarães',
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

  // Marketplace B2B: Locais & Espaços para Casamento
  venues: [
    {
      id: 'venue-villa-bisutti',
      name: 'Villa Bisutti Casa do Ator',
      location: 'Vila Olímpia, São Paulo - SP',
      neighborhood: 'Vila Olímpia',
      price: 'R$ 38.000',
      priceNum: 38000,
      priceLabel: 'R$ 38.000 / evento',
      rating: 4.9,
      reviewsCount: 142,
      image: 'assets/theme_blacktie.jpg',
      guests: 320,
      area: '480 m²',
      buffet: 'Gastronomia própria',
      garden: 'Jardim de Inverno',
      coords: { top: '34%', left: '44%' },
      tag: 'Mais Escolhido',
      isFavorite: true,
      description: 'Espaço contemporâneo com pé direito duplo, alta gastronomia italiana e iluminação cênica integrada.',
      features: ['Ar Condicionado Central', 'Mobiliário Completo', 'Gerador Próprio', 'Camarim dos Noivos', 'Estacionamento']
    },
    {
      id: 'venue-palacio-tangara',
      name: 'Palácio Tangará Hotel',
      location: 'Panamby, São Paulo - SP',
      neighborhood: 'Panamby',
      price: 'R$ 85.000',
      priceNum: 85000,
      priceLabel: 'R$ 85.000 / evento',
      rating: 5.0,
      reviewsCount: 98,
      image: 'assets/theme_garden.jpg',
      guests: 400,
      area: '850 m²',
      buffet: 'Chef Michelin',
      garden: 'Parque Burle Marx',
      coords: { top: '56%', left: '22%' },
      tag: 'Luxo 5 Estrelas',
      isFavorite: false,
      description: 'O refúgio de luxo mais exclusivo da capital, cercado pela exuberante vegetação do Parque Burle Marx.',
      features: ['Hospedagem Inclusa', 'Spa & Beleza', 'Heliponto', 'Alta Gastronomia', 'Segurança Privada']
    },
    {
      id: 'venue-espaco-wood',
      name: 'Espaço Wood Garden',
      location: 'Morumbi, São Paulo - SP',
      neighborhood: 'Morumbi',
      price: 'R$ 26.000',
      priceNum: 26000,
      priceLabel: 'R$ 26.000 / evento',
      rating: 4.8,
      reviewsCount: 64,
      image: 'assets/theme_coastal.jpg',
      guests: 250,
      area: '380 m²',
      buffet: 'Buffet Contemporâneo',
      garden: 'Gazebo ao Ar Livre',
      coords: { top: '64%', left: '58%' },
      tag: 'Rústico Elegante',
      isFavorite: false,
      description: 'Estrutura aconchegante com madeira nobre de demolição, cascata e gazebo cercado de verde.',
      features: ['Área Externa Coberta', 'Lounge Bar', 'Espaço Kids', 'Gerador', 'Decoração Rústica']
    },
    {
      id: 'venue-espaco-gardens',
      name: 'Espaço Gardens',
      location: 'Vila Leopoldina, São Paulo - SP',
      neighborhood: 'Vila Leopoldina',
      price: 'R$ 32.000',
      priceNum: 32000,
      priceLabel: 'R$ 32.000 / evento',
      rating: 4.9,
      reviewsCount: 86,
      image: 'assets/wedding_hero_banner.jpg',
      guests: 500,
      area: '620 m²',
      buffet: 'Livre Escolha',
      garden: 'Jardim Tropical',
      coords: { top: '20%', left: '70%' },
      tag: 'Natureza & Design',
      isFavorite: true,
      description: 'Arquitetura premiada com estrutura em madeira rústica, paredes vivas e espelhos d\'água.',
      features: ['Isolamento Acústico', 'Cozinha Industrial', 'Palco Integrado', 'Valet Próprio', 'Suíte Nupcial']
    },
    {
      id: 'venue-casa-fasano',
      name: 'Casa Fasano & Jardins',
      location: 'Itaim Bibi, São Paulo - SP',
      neighborhood: 'Itaim Bibi',
      price: 'R$ 68.000',
      priceNum: 68000,
      priceLabel: 'R$ 68.000 / evento',
      rating: 4.96,
      reviewsCount: 175,
      image: 'assets/theme_blacktie.jpg',
      guests: 600,
      area: '900 m²',
      buffet: 'Gastronomia Fasano',
      garden: 'Pátio Central',
      coords: { top: '44%', left: '52%' },
      tag: 'Alta Sociedade',
      isFavorite: false,
      description: 'Sinônimo de sofisticação e tradição gastronômica no coração nobre de São Paulo.',
      features: ['Serviço de Somelier', 'Mobiliário de Design', 'Segurança VIP', 'Coordenação Exclusiva']
    }
  ],

  // Marketplace B2B: Assessorias & Cerimonialistas
  advisors: [
    {
      id: 'adv-mariana',
      name: 'Mariana & Co. Assessoria',
      company: 'Mariana & Co. Event Management',
      role: 'Assessoria Completa & R.S.V.P.',
      rating: 5.0,
      reviewsCount: 148,
      weddingsCount: 180,
      location: 'São Paulo - SP & Região',
      image: 'assets/theme_garden.jpg',
      badge: 'Certificada Love OS Platinum',
      startingPrice: 'A partir de R$ 5.500',
      priceNum: 5500,
      avatar: 'assets/theme_garden.jpg',
      chatId: 'mariana-assessoria',
      isFavorite: true,
      about: 'Mais de 10 anos transformando sonhos em momentos inesquecíveis. Nossa metodologia foca na gestão financeira transparente, curadoria de fornecedores de elite e assessoria do dia com equipe sincronizada.',
      specialties: ['Assessoria Completa', 'Assessoria do Dia', 'Gestão Financeira & RSVP', 'Curadoria de Fornecedores', 'Cronograma Minuto a Minuto'],
      portfolioPhotos: ['assets/theme_garden.jpg', 'assets/theme_blacktie.jpg', 'assets/theme_coastal.jpg', 'assets/wedding_hero_banner.jpg'],
      packages: [
        { name: 'Assessoria do Dia (Final)', price: 'R$ 3.800', desc: 'Coordenação no dia + alinhamento 30 dias antes.' },
        { name: 'Assessoria Completa (Recomendado)', price: 'R$ 6.500', desc: 'Planejamento de ponta a ponta desde o início.' },
        { name: 'Produção Executiva VIP', price: 'R$ 9.800', desc: 'Assessoria ilimitada + RSVP ativo + Concierge convidados.' }
      ],
      reviews: [
        { author: 'Camila & Gabriel', stars: '★★★★★', text: 'A Mariana e equipe salvaram nosso casamento! Organização impecável!' },
        { author: 'Fernanda & Thiago', stars: '★★★★★', text: 'Melhor investimento da festa. Não tivemos nenhuma preocupação no dia!' }
      ]
    },
    {
      id: 'adv-1',
      name: 'Luana Silva Events',
      company: 'Luana Silva Assessoria & Cerimonial',
      role: 'Assessoria Completa & Cerimonial',
      rating: 4.98,
      reviewsCount: 84,
      weddingsCount: 110,
      location: 'São Paulo - SP & Região',
      image: 'assets/advisor_claudia.jpg',
      badge: 'Certificada Love OS',
      startingPrice: 'A partir de R$ 4.500',
      priceNum: 4500,
      avatar: 'assets/advisor_claudia.jpg',
      chatId: 'mariana-assessoria',
      isFavorite: false,
      about: 'Especialista em casamentos e celebrações contemporâneas. Foco em detalhes refinados, tranquilidade para o casal e orçamentos otimizados.',
      specialties: ['Casamentos Contemporâneos', 'Assessoria do Dia', 'Gestão de Contratos'],
      portfolioPhotos: ['assets/theme_blacktie.jpg', 'assets/theme_garden.jpg'],
      packages: [
        { name: 'Assessoria Essencial', price: 'R$ 4.500', desc: 'Alinhamento 60 dias antes + dia do evento.' },
        { name: 'Assessoria Completa', price: 'R$ 7.200', desc: 'Curadoria completa de fornecedores e cronograma.' }
      ],
      reviews: [
        { author: 'Renata & Bruno', stars: '★★★★★', text: 'Incrível atendimento e pontualidade. Super indico!' }
      ]
    },
    {
      id: 'adv-2',
      name: 'Matheus Silva Luxury Events',
      company: 'Matheus Silva Produções & Design',
      role: 'Diretor de Eventos & Produção',
      rating: 4.95,
      reviewsCount: 112,
      weddingsCount: 140,
      location: 'São Paulo & Rio de Janeiro',
      image: 'assets/advisor_marcos.jpg',
      badge: 'Top Producer 2026',
      startingPrice: 'A partir de R$ 6.800',
      priceNum: 6800,
      avatar: 'assets/advisor_marcos.jpg',
      chatId: 'mariana-assessoria',
      isFavorite: false,
      about: 'Produção executiva de grande porte, casamentos black tie e destination weddings nos destinos mais nobres do Brasil.',
      specialties: ['Destination Wedding', 'Black Tie', 'Decoração & Luz'],
      portfolioPhotos: ['assets/theme_blacktie.jpg', 'assets/card_safari.jpg'],
      packages: [
        { name: 'Luxury Full Experience', price: 'R$ 8.800', desc: 'Produção executiva internacional e cenografia.' }
      ],
      reviews: [
        { author: 'Isabella & Rodrigo', stars: '★★★★★', text: 'Transformou nossa festa em uma noite de gala de cinema!' }
      ]
    },
    {
      id: 'adv-3',
      name: 'Juliana Toledo Cerimonial',
      company: 'Juliana Toledo Assessoria',
      role: 'Cerimonialista & Assessoria Especializada',
      rating: 4.92,
      reviewsCount: 65,
      weddingsCount: 95,
      location: 'São Paulo, SP & Litoral',
      image: 'assets/advisor_sophia.jpg',
      badge: 'Especialista Praia & Campo',
      startingPrice: 'A partir de R$ 3.800',
      priceNum: 3800,
      avatar: 'assets/advisor_sophia.jpg',
      chatId: 'juliana-toledo',
      isFavorite: true,
      about: 'Planejamento acolhedor e focado na experiência humana dos noivos e convidados com maestria.',
      specialties: ['Casamentos na Praia', 'Mini Weddings', 'R.S.V.P. Ativo'],
      portfolioPhotos: ['assets/theme_coastal.jpg', 'assets/theme_garden.jpg'],
      packages: [
        { name: 'Mini Wedding & Praia', price: 'R$ 3.800', desc: 'Planejamento para celebrações intimistas.' }
      ],
      reviews: [
        { author: 'Beatriz & Leonardo', stars: '★★★★★', text: 'Muito atenciosa e calma, nos passou muita tranquilidade.' }
      ]
    }
  ],

  // Marketplace B2B: Foto & Vídeo
  photo: [
    {
      id: 'photo-1',
      name: 'Lumina Wedding Cinema & Photo',
      location: 'São Paulo - SP & Destination',
      price: 'A partir de R$ 7.800',
      rating: 4.97,
      reviewsCount: 96,
      weddingsCount: 160,
      image: 'assets/wedding_hero_banner.jpg',
      tag: 'Foto & Cinema 4K',
      isFavorite: true,
      description: 'Linguagem documental e cinematográfica com captação em 4K, drones e pós-produção artística refinada.'
    },
    {
      id: 'photo-2',
      name: 'Arthur Moura Fine Art Photography',
      location: 'Jardins, São Paulo - SP',
      price: 'A partir de R$ 9.500',
      rating: 5.0,
      reviewsCount: 64,
      weddingsCount: 120,
      image: 'assets/theme_blacktie.jpg',
      tag: 'Fine Art & Editorial',
      isFavorite: false,
      description: 'Fotografia poética e editorial inspirada na alta moda e registros espontâneos com luz natural.'
    }
  ],

  // Marketplace B2B: Buffet & Gastronomia
  buffet: [
    {
      id: 'buffet-1',
      name: 'Buffet França Alta Gastronomia',
      location: 'Higienópolis, São Paulo - SP',
      price: 'R$ 280 / pessoa',
      rating: 4.95,
      reviewsCount: 190,
      weddingsCount: 300,
      image: 'assets/theme_garden.jpg',
      tag: 'Tradição & Alta Gastronomia',
      isFavorite: true,
      description: 'Cardápios contemporâneos autorais, serviço à francesa e ilhas gastronômicas requintadas.'
    },
    {
      id: 'buffet-2',
      name: 'Nômade Catering & Experiências',
      location: 'Pinheiros, São Paulo - SP',
      price: 'R$ 220 / pessoa',
      rating: 4.89,
      reviewsCount: 78,
      weddingsCount: 90,
      image: 'assets/theme_coastal.jpg',
      tag: 'Gastronomia Criativa',
      isFavorite: false,
      description: 'Menu sensorial contemporâneo focado em ingredientes orgânicos, finger foods e estações interativas.'
    }
  ],

  // Marketplace B2B: Fornecedores Contratados (Gestão de Contratos e Fornecedores)
  contractedVendors: [
    {
      id: 'contracted-1',
      name: 'Villa Bisutti Casa do Ator',
      category: 'Locais & Espaços',
      tag: 'Espaço Principal & Gastronomia',
      image: 'assets/theme_blacktie.jpg',
      service: 'Locação exclusiva do salão nobre com pé direito duplo + Alta gastronomia italiana em 5 tempos + Iluminação cênica e sonorização integrada.',
      responsibleName: 'Camila Rocha',
      responsibleRole: 'Gerente de Eventos & Atendimento',
      responsiblePhone: '(11) 98765-4321',
      responsibleEmail: 'camila.rocha@villabisutti.com.br',
      negotiatedValue: 'R$ 38.000,00',
      negotiatedValueNum: 38000,
      paidValue: 'R$ 28.500,00',
      paymentTerms: 'Entrada de R$ 9.500 + 3 parcelas de R$ 9.500 (3 de 4 quitadas)',
      paymentStatus: 'Em andamento (3/4)',
      paymentStatusColor: 'bg-amber-50 text-amber-700 border-amber-200',
      contractStatus: 'Assinado Digitalmente',
      contractStatusColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      contractDate: '12/03/2026',
      eventDate: '28/08/2026',
      contractFile: 'Contrato_Villa_Bisutti_2026.pdf',
      nextMilestone: 'Degustação final do menu em 15/07/2026',
      deliverables: [
        'Uso do espaço das 14h às 05h (15 horas totais)',
        'Mobiliário completo (mesas de madeira nobre, cadeiras tiffany e lounges)',
        'Gerador próprio de 250 kVA com suporte técnico dedicado',
        'Camarim climatizado para os noivos com serviço de boas-vindas',
        'Equipe de 4 seguranças e 2 coordenadores de salão'
      ],
      notes: 'Incluso gerador e equipe de limpeza contínua.',
      chatId: 'villa-bisutti'
    },
    {
      id: 'contracted-2',
      name: 'Mariana & Co. Assessoria',
      category: 'Assessoria & Cerimonial',
      tag: 'Assessoria VIP Completa',
      image: 'assets/theme_garden.jpg',
      service: 'Assessoria Completa de ponta a ponta: gestão financeira e orçamentária, RSVP ativo no Love Event OS e coordenação do dia com equipe sincronizada de 6 cerimonialistas.',
      responsibleName: 'Mariana Albuquerque',
      responsibleRole: 'Cerimonialista Chefe & Fundadora',
      responsiblePhone: '(11) 99123-4567',
      responsibleEmail: 'contato@marianaco.com.br',
      negotiatedValue: 'R$ 6.500,00',
      negotiatedValueNum: 6500,
      paidValue: 'R$ 3.250,00',
      paymentTerms: 'Sinal de 50% no fechamento + 50% até 10 dias antes do evento',
      paymentStatus: '50% Pago',
      paymentStatusColor: 'bg-blue-50 text-blue-700 border-blue-200',
      contractStatus: 'Assinado Digitalmente',
      contractStatusColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      contractDate: '20/02/2026',
      eventDate: '28/08/2026',
      contractFile: 'Contrato_Mariana_Co_Assessoria.pdf',
      nextMilestone: 'Alinhamento do cronograma minuto a minuto em 02/08/2026',
      deliverables: [
        'Planejamento de cronograma detalhado (minuto a minuto)',
        'Gestão de RSVP e confirmação de presença ativa dos convidados',
        'Coordenação e alinhamento de todos os fornecedores contratados',
        'Equipe de 6 assistentes uniformizados no dia do evento',
        'Kit de emergência e concierge exclusivo para os noivos e pais'
      ],
      notes: 'Atendimento via canal exclusivo no WhatsApp com tempo de resposta prioritário.',
      chatId: 'mariana-assessoria'
    },
    {
      id: 'contracted-3',
      name: 'Lumina Wedding Cinema & Photo',
      category: 'Foto & Vídeo',
      tag: 'Cinema 4K & Editorial',
      image: 'assets/wedding_hero_banner.jpg',
      service: 'Cobertura fotográfica com 3 fotógrafos principais + Filme de casamento 4K (20 min) + Teaser 60s para Instagram + Ensaio Pré-Wedding + Álbum panorâmico 30x30 em linho.',
      responsibleName: 'Arthur Moura',
      responsibleRole: 'Diretor de Fotografia & Cinema',
      responsiblePhone: '(11) 97654-3210',
      responsibleEmail: 'contato@luminawedding.com',
      negotiatedValue: 'R$ 8.900,00',
      negotiatedValueNum: 8900,
      paidValue: 'R$ 8.900,00',
      paymentTerms: 'Entrada de 20% + 5x sem juros (100% Quitado)',
      paymentStatus: 'Totalmente Quitado',
      paymentStatusColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      contractStatus: 'Assinado Digitalmente',
      contractStatusColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      contractDate: '05/04/2026',
      eventDate: '28/08/2026',
      contractFile: 'Contrato_Lumina_Foto_Cinema.pdf',
      nextMilestone: 'Ensaio Pré-Wedding externo agendado para 20/06/2026',
      deliverables: [
        'Mínimo de 800 fotos tratadas em alta resolução com galeria online',
        'Captação aérea em 4K com piloto de drone certificado',
        'Teaser de 60 segundos entregue em até 48 horas após a celebração',
        'Filme completo (20 minutos) com trilha sonora licenciada',
        'Álbum encadernado em linho importado com 80 páginas'
      ],
      notes: 'Entrega de todo o material em nuvem privativa com acesso por 5 anos.',
      chatId: 'mariana-assessoria'
    },
    {
      id: 'contracted-4',
      name: 'Arte Floral Decorações & Cenografia',
      category: 'Decoração & Flores',
      tag: 'Projeto Cenográfico Nobre',
      image: 'assets/wedding_table_dinner.jpg',
      service: 'Projeto floral e cenografia completa: mesa de doces suspensa com flores nobres, arranjos de centro de mesa altos e baixos, passarela espelhada na cerimônia e lounges contemporâneos.',
      responsibleName: 'Juliana Toledo',
      responsibleRole: 'Arquiteta & Designer Floral',
      responsiblePhone: '(11) 98877-6655',
      responsibleEmail: 'juliana@artefloral.com.br',
      negotiatedValue: 'R$ 24.500,00',
      negotiatedValueNum: 24500,
      paidValue: 'R$ 9.800,00',
      paymentTerms: 'Entrada de 40% (R$ 9.800) + 2x de R$ 7.350',
      paymentStatus: 'Em andamento (1/3)',
      paymentStatusColor: 'bg-amber-50 text-amber-700 border-amber-200',
      contractStatus: 'Assinado Digitalmente',
      contractStatusColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      contractDate: '18/04/2026',
      eventDate: '28/08/2026',
      contractFile: 'Contrato_Arte_Floral_Deco.pdf',
      nextMilestone: 'Apresentação da mesa teste e amostras florais em 10/07/2026',
      deliverables: [
        'Projeto 3D renderizado da cenografia do salão e da cerimônia',
        'Mesa de bolo e doces com arranjos volumosos de orquídeas e rosas',
        '30 arranjos de centro de mesa com mix de flores naturais nobres',
        'Iluminação decorativa pontual com micro-leds e velas suspensas',
        'Montagem iniciada 8 horas antes e desmontagem completa após o término'
      ],
      notes: 'Flores selecionadas na véspera no Ceagesp com garantia de frescor e volume.',
      chatId: 'mariana-assessoria'
    }
  ]
};

window.LOVE_DATA = LOVE_DATA;
