/* ==========================================================================
   LOVE ADMIN — Modo demonstração
   Substitui o Supabase por dados fictícios guardados no navegador, para
   ajustar interface e navegação sem depender do banco.

   Para desligar (e voltar a usar o Supabase de verdade):
     • troque MODO_DEMO para false abaixo, ou
     • abra qualquer página com ?demo=0 na URL.

   As alterações feitas no modo demo ficam só no seu navegador
   (localStorage) — não tocam no banco e não saem daqui.
   ========================================================================== */

const MODO_DEMO = true;

const DEMO_STORAGE_KEY = 'love-admin-demo-db';

/* ----------------------------------------------------------- Dados base */

function demoSeed() {
  const hoje = new Date();
  const diasAtras = (d) => new Date(hoje.getTime() - d * 86400000).toISOString();

  const id = (prefixo, n) => `${prefixo}-${String(n).padStart(4, '0')}`;

  const fornecedores = [
    { id: id('forn', 1), company_name: 'Sophia Eventos & Decoração', razao_social: 'Sophia Eventos LTDA', email: 'sophia@sophiaeventos.com.br', cnpj: '12.345.678/0001-90', document_type: 'cnpj', category: 'Decoração', plan: 'Profissional', status: 'ativo', contact_name: 'Sophia Ramos', phone: '(19) 99876-5432', address: 'Rua das Palmeiras, 250', city: 'Indaiatuba', state: 'SP', description: 'Assessoria completa para casamentos de alto padrão.', pix_key: 'sophia@sophiaeventos.com.br', pix_key_type: 'email', created_at: diasAtras(210) },
    { id: id('forn', 2), company_name: 'Buffet Alvorada', razao_social: 'Alvorada Alimentos ME', email: 'contato@buffetalvorada.com.br', cnpj: '98.765.432/0001-10', document_type: 'cnpj', category: 'Buffet', plan: 'Essencial', status: 'ativo', contact_name: 'Ricardo Alves', phone: '(11) 3344-5566', address: 'Av. Brasil, 1200', city: 'São Paulo', state: 'SP', created_at: diasAtras(120) },
    { id: id('forn', 3), company_name: 'Flores do Campo', email: 'ola@floresdocampo.com.br', cnpj: '45.111.222/0001-33', document_type: 'cnpj', category: 'Floricultura', plan: 'Gratuito', status: 'ativo', contact_name: 'Marta Lopes', phone: '(19) 98111-2233', city: 'Campinas', state: 'SP', created_at: diasAtras(64) },
    { id: id('forn', 4), company_name: 'Studio Luz Fotografia', email: 'contato@studioluz.com.br', cnpj: '33.444.555/0001-66', document_type: 'cnpj', category: 'Fotografia', plan: 'Premium', status: 'ativo', contact_name: 'André Teixeira', phone: '(11) 97777-8899', city: 'Santo André', state: 'SP', created_at: diasAtras(38) },
    { id: id('forn', 5), company_name: 'Som & Cia Eventos', email: 'comercial@somecia.com.br', category: 'Música e som', plan: 'Gratuito', status: 'suspenso', phone: '(19) 3222-1010', city: 'Valinhos', state: 'SP', created_at: diasAtras(15) }
  ];

  const clientes = [
    { id: id('cli', 1), couple_name: 'Beatriz & Lucas', email: 'bea.lucas@gmail.com', phone: '(19) 98888-1122', cpf: '123.456.789-00', city: 'Campinas', status: 'ativo', created_at: diasAtras(150) },
    { id: id('cli', 2), couple_name: 'Marina & Téo', email: 'marina.teo@gmail.com', phone: '(11) 97777-3344', cpf: '987.654.321-00', city: 'São Paulo', status: 'ativo', created_at: diasAtras(72) },
    { id: id('cli', 3), couple_name: 'Helena & Rafa', email: 'helena.rafa@outlook.com', phone: '(19) 96666-5544', city: 'Indaiatuba', status: 'ativo', created_at: diasAtras(31) },
    { id: id('cli', 4), couple_name: 'Camila Duarte', email: 'camila.duarte@gmail.com', phone: '(11) 95555-7788', city: 'Guarulhos', status: 'ativo', created_at: diasAtras(9) }
  ];

  const eventos = [
    { id: id('evt', 1), cliente_id: id('cli', 1), tipo: 'wedding', titulo: 'Casamento Beatriz & Lucas', host_name: 'Beatriz & Lucas', data_evento: '2027-03-18', slug: 'beatriz-e-lucas', theme: 'Garden & Botanical', cover_image_url: null, status: 'ativo', created_at: diasAtras(150) },
    { id: id('evt', 2), cliente_id: id('cli', 1), tipo: 'baby', titulo: 'Chá de Bebê do Theo', host_name: 'Beatriz & Lucas', data_evento: '2026-12-05', slug: 'cha-do-theo', theme: 'Pastel Mint & Clouds', status: 'ativo', created_at: diasAtras(60) },
    { id: id('evt', 3), cliente_id: id('cli', 2), tipo: 'wedding', titulo: 'Casamento Marina & Téo', host_name: 'Marina & Téo', data_evento: '2027-06-12', slug: 'marina-e-teo', theme: 'Black Tie', status: 'ativo', created_at: diasAtras(72) },
    { id: id('evt', 4), cliente_id: id('cli', 3), tipo: 'wedding', titulo: 'Casamento Helena & Rafa', host_name: 'Helena & Rafa', data_evento: '2027-09-25', slug: 'helena-e-rafa', status: 'rascunho', created_at: diasAtras(31) },
    { id: id('evt', 5), cliente_id: id('cli', 4), tipo: 'birthday', titulo: '30 anos da Camila', host_name: 'Camila Duarte', data_evento: '2026-11-08', slug: 'camila-30', status: 'ativo', created_at: diasAtras(9) }
  ];

  // Convidados e presentes em volume, para as contagens ficarem realistas.
  const convidados = [];
  const distribuicao = [
    { evento: 1, cliente: 1, confirmados: 185, pendentes: 25, recusados: 10, criancasPct: 0.12 },
    { evento: 2, cliente: 1, confirmados: 42, pendentes: 5, recusados: 3, criancasPct: 0.3 },
    { evento: 3, cliente: 2, confirmados: 96, pendentes: 48, recusados: 6, criancasPct: 0.08 },
    { evento: 5, cliente: 4, confirmados: 38, pendentes: 12, recusados: 4, criancasPct: 0.05 }
  ];

  let contador = 0;
  distribuicao.forEach(d => {
    const criar = (qtd, status) => {
      for (let i = 0; i < qtd; i++) {
        contador += 1;
        convidados.push({
          id: id('conv', contador),
          evento_id: id('evt', d.evento),
          cliente_id: id('cli', d.cliente),
          nome: `Convidado ${contador}`,
          email: null,
          telefone: null,
          tipo: (i / qtd) < d.criancasPct ? 'crianca' : 'adulto',
          status,
          mesa: null,
          created_at: diasAtras(40)
        });
      }
    };
    criar(d.confirmados, 'confirmado');
    criar(d.pendentes, 'pendente');
    criar(d.recusados, 'recusado');
  });

  const presentes = [];
  const presentesPorEvento = [
    { evento: 1, cliente: 1, recebidos: 48, disponiveis: 12, ticket: 384 },
    { evento: 2, cliente: 1, recebidos: 18, disponiveis: 7, ticket: 236 },
    { evento: 3, cliente: 2, recebidos: 22, disponiveis: 30, ticket: 412 },
    { evento: 5, cliente: 4, recebidos: 9, disponiveis: 11, ticket: 180 }
  ];

  let pc = 0;
  presentesPorEvento.forEach(p => {
    const criar = (qtd, status) => {
      for (let i = 0; i < qtd; i++) {
        pc += 1;
        presentes.push({
          id: id('pres', pc),
          evento_id: id('evt', p.evento),
          cliente_id: id('cli', p.cliente),
          nome: `Presente ${pc}`,
          categoria: null,
          valor: p.ticket,
          imagem_url: null,
          status,
          comprador_nome: status === 'recebido' ? 'Convidado' : null,
          recebido_em: status === 'recebido' ? diasAtras(20) : null,
          created_at: diasAtras(50)
        });
      }
    };
    criar(p.recebidos, 'recebido');
    criar(p.disponiveis, 'disponivel');
  });

  const cliente_wallet_transactions = [
    { id: id('cwt', 1), cliente_id: id('cli', 1), evento_id: id('evt', 1), type: 'credit', amount: 18450, description: 'Presentes recebidos', created_at: diasAtras(30) },
    { id: id('cwt', 2), cliente_id: id('cli', 1), evento_id: id('evt', 1), type: 'debit', amount: 5000, description: 'Saque via Pix', created_at: diasAtras(12) },
    { id: id('cwt', 3), cliente_id: id('cli', 1), evento_id: id('evt', 2), type: 'credit', amount: 4250, description: 'Presentes recebidos', created_at: diasAtras(18) },
    { id: id('cwt', 4), cliente_id: id('cli', 2), evento_id: id('evt', 3), type: 'credit', amount: 9064, description: 'Presentes recebidos', created_at: diasAtras(7) },
    { id: id('cwt', 5), cliente_id: id('cli', 4), evento_id: id('evt', 5), type: 'credit', amount: 1620, description: 'Presentes recebidos', created_at: diasAtras(3) }
  ];

  const wallet_transactions = [
    { id: id('wt', 1), fornecedor_id: id('forn', 1), type: 'credit', amount: 42800, description: 'Contrato Beatriz & Lucas', created_at: diasAtras(40) },
    { id: id('wt', 2), fornecedor_id: id('forn', 1), type: 'debit', amount: 12000, description: 'Saque via Pix', created_at: diasAtras(22) },
    { id: id('wt', 3), fornecedor_id: id('forn', 2), type: 'credit', amount: 18300, description: 'Contrato Marina & Téo', created_at: diasAtras(28) },
    { id: id('wt', 4), fornecedor_id: id('forn', 4), type: 'credit', amount: 31500, description: 'Pacote fotografia', created_at: diasAtras(11) },
    { id: id('wt', 5), fornecedor_id: id('forn', 4), type: 'debit', amount: 8000, description: 'Saque via Pix', created_at: diasAtras(4) },
    { id: id('wt', 6), fornecedor_id: id('forn', 3), type: 'credit', amount: 6200, description: 'Decoração floral', created_at: diasAtras(6) }
  ];

  const contracts = [
    { id: id('ctr', 1), fornecedor_id: id('forn', 1), client_name: 'Beatriz & Lucas', categoria: 'Decoração', valor_total: 32000, valor_pago: 18000, parcelas_pagas: 3, parcelas_total: 6, status: 'em_dia', created_at: diasAtras(90) },
    { id: id('ctr', 2), fornecedor_id: id('forn', 1), client_name: 'Marina & Téo', categoria: 'Assessoria', valor_total: 9000, valor_pago: 2000, parcelas_pagas: 1, parcelas_total: 5, status: 'atrasado', created_at: diasAtras(45) },
    { id: id('ctr', 3), fornecedor_id: id('forn', 2), client_name: 'Marina & Téo', categoria: 'Buffet', valor_total: 14500, valor_pago: 14500, parcelas_pagas: 4, parcelas_total: 4, status: 'quitado', created_at: diasAtras(70) },
    { id: id('ctr', 4), fornecedor_id: id('forn', 4), client_name: 'Helena & Rafa', categoria: 'Fotografia', valor_total: 12800, valor_pago: 6400, parcelas_pagas: 2, parcelas_total: 4, status: 'em_dia', created_at: diasAtras(20) }
  ];

  const payment_links = [
    { id: id('pl', 1), fornecedor_id: id('forn', 1), amount: 8400, installments: 3, status: 'pago', created_at: diasAtras(35), paid_at: diasAtras(34) },
    { id: id('pl', 2), fornecedor_id: id('forn', 2), amount: 2200, installments: 1, status: 'pendente', created_at: diasAtras(6), paid_at: null },
    { id: id('pl', 3), fornecedor_id: id('forn', 4), amount: 6400, installments: 2, status: 'pago', created_at: diasAtras(12), paid_at: diasAtras(11) },
    { id: id('pl', 4), fornecedor_id: id('forn', 3), amount: 1800, installments: 1, status: 'pendente', created_at: diasAtras(2), paid_at: null }
  ];

  const notas_fiscais = [
    { id: id('nf', 1), fornecedor_id: id('forn', 1), client: 'Beatriz & Lucas', value: 8400, number: '000121', status: 'emitida', created_at: diasAtras(34) },
    { id: id('nf', 2), fornecedor_id: id('forn', 4), client: 'Helena & Rafa', value: 6400, number: '000122', status: 'emitida', created_at: diasAtras(11) }
  ];

  const conversations = [
    { id: id('cv', 1), fornecedor_id: id('forn', 1), cliente_id: id('cli', 1), created_at: diasAtras(80), last_message_at: diasAtras(2) },
    { id: id('cv', 2), fornecedor_id: id('forn', 1), cliente_id: id('cli', 2), created_at: diasAtras(50), last_message_at: diasAtras(5) },
    { id: id('cv', 3), fornecedor_id: id('forn', 2), cliente_id: id('cli', 2), created_at: diasAtras(60), last_message_at: diasAtras(9) },
    { id: id('cv', 4), fornecedor_id: id('forn', 4), cliente_id: id('cli', 3), created_at: diasAtras(25), last_message_at: diasAtras(1) },
    { id: id('cv', 5), fornecedor_id: id('forn', 3), cliente_id: id('cli', 1), created_at: diasAtras(18), last_message_at: diasAtras(3) }
  ];

  const leads = [
    { id: id('ld', 1), fornecedor_id: id('forn', 1), name: 'Helena & Rafa', status: 'proposta', value: 24000, created_at: diasAtras(14) },
    { id: id('ld', 2), fornecedor_id: id('forn', 1), name: 'Camila Duarte', status: 'fechado', value: 12000, created_at: diasAtras(40) },
    { id: id('ld', 3), fornecedor_id: id('forn', 2), name: 'Beatriz & Lucas', status: 'conversa', value: 16000, created_at: diasAtras(22) },
    { id: id('ld', 4), fornecedor_id: id('forn', 4), name: 'Marina & Téo', status: 'novo', value: 9000, created_at: diasAtras(3) }
  ];

  const products = [
    { id: id('pr', 1), fornecedor_id: id('forn', 1), name: 'Decoração completa', active: true, price: 18000, created_at: diasAtras(100) },
    { id: id('pr', 2), fornecedor_id: id('forn', 1), name: 'Cenário fotográfico', active: false, price: 3500, created_at: diasAtras(80) },
    { id: id('pr', 3), fornecedor_id: id('forn', 2), name: 'Jantar completo 150 pessoas', active: true, price: 22000, created_at: diasAtras(90) },
    { id: id('pr', 4), fornecedor_id: id('forn', 4), name: 'Pacote foto + vídeo', active: true, price: 12800, created_at: diasAtras(30) }
  ];

  const tickets = [
    { id: id('tk', 1), protocolo: 'LV000001', origem: 'site', user_id: null, nome: 'Carla Menezes', email: 'carla.menezes@gmail.com', telefone: '(11) 96666-1234', assunto: 'Como funciona a lista de presentes?', categoria: 'Dúvida', mensagem: 'Oi! Quero criar meu site de casamento mas não entendi se o valor dos presentes cai direto na minha conta. Vocês cobram alguma taxa?', status: 'aberto', prioridade: 'normal', created_at: diasAtras(1), updated_at: diasAtras(1) },
    { id: id('tk', 2), protocolo: 'LV000002', origem: 'fornecedor', user_id: id('forn', 1), nome: 'Sophia Ramos', email: 'sophia@sophiaeventos.com.br', telefone: '(19) 99876-5432', assunto: 'Saque não caiu na conta', categoria: 'Financeiro', mensagem: 'Solicitei o saque de R$ 12.000 há 3 dias e o valor ainda não apareceu na minha conta. O status no painel está como concluído.', status: 'em_andamento', prioridade: 'alta', created_at: diasAtras(3), updated_at: diasAtras(2) },
    { id: id('tk', 3), protocolo: 'LV000003', origem: 'cliente', user_id: id('cli', 1), nome: 'Beatriz', email: 'bea.lucas@gmail.com', assunto: 'Trocar o tema do site', categoria: 'Dúvida', mensagem: 'Consigo trocar o tema do site depois que já enviei o convite para os convidados?', status: 'resolvido', prioridade: 'baixa', created_at: diasAtras(12), updated_at: diasAtras(10) },
    { id: id('tk', 4), protocolo: 'LV000004', origem: 'site', user_id: null, nome: 'Paulo Vidal', email: 'paulo.vidal@empresa.com.br', telefone: '(11) 94444-5566', assunto: 'Quero ser fornecedor parceiro', categoria: 'Outro', mensagem: 'Tenho uma empresa de iluminação para eventos e gostaria de entender como me cadastrar como fornecedor.', status: 'aberto', prioridade: 'normal', created_at: diasAtras(5), updated_at: diasAtras(5) }
  ];

  const ticket_messages = [
    { id: id('tm', 1), ticket_id: id('tk', 2), author_role: 'admin', author_id: 'admin-demo', author_name: 'Victor Maranhão', body: 'Oi Sophia! Já estamos verificando com o banco. O prazo do Pix agendado é de até 2 dias úteis — retorno ainda hoje com a confirmação.', created_at: diasAtras(2) },
    { id: id('tm', 2), ticket_id: id('tk', 3), author_role: 'admin', author_id: 'admin-demo', author_name: 'Victor Maranhão', body: 'Oi Beatriz! Pode trocar sim, a qualquer momento. O link do convite continua o mesmo, só o visual muda.', created_at: diasAtras(10) }
  ];

  /* Conteúdo editorial das duas plataformas */

  const conteudo = [];
  let cc = 0;
  const bloco = (dados) => { cc += 1; conteudo.push({ id: id('cont', cc), extra: {}, created_at: diasAtras(30), updated_at: diasAtras(30), parent_id: null, ...dados }); return id('cont', cc); };

  // Fornecedor — carrossel.
  // Estas imagens vêm da pasta assets da Love (um nível acima) só para o
  // carrossel não ficar vazio na demonstração local. Em produção o admin
  // informa a URL de cada banner, e o painel nunca depende desses arquivos.
  bloco({ plataforma: 'fornecedor', secao: 'banner', titulo: 'Sua vitrine pronta em minutos', descricao: 'Monte seu site de fornecedor sem precisar de designer.', link_url: 'https://love.com.br/b2b/paginas-site', imagem_url: '../assets/theme_garden.jpg', posicao: 1, ativo: true });
  bloco({ plataforma: 'fornecedor', secao: 'banner', titulo: 'Receba em até 12x', descricao: 'Gere links de pagamento direto do painel e receba à vista.', link_url: 'https://love.com.br/b2b/financeiro', imagem_url: '../assets/banner_high_quality.jpg', posicao: 2, ativo: true });
  bloco({ plataforma: 'fornecedor', secao: 'banner', titulo: 'Conheça o plano Premium', descricao: 'Mais destaque na busca e zero taxa por contrato.', link_url: 'https://love.com.br/b2b/planos', imagem_url: '../assets/theme_blacktie.jpg', posicao: 3, ativo: false });

  // Fornecedor — guias (os mesmos de B2B/guias.html) e suas perguntas
  const guias = [
    ['Guia de mensagens', 'Como conversar com os casais pelo chat', '💬', [
      ['Como as mensagens chegam até mim?', 'Toda conversa nasce de um lead ou de um contato feito pelo cliente na sua vitrine. As mensagens chegam em tempo real, sem precisar recarregar a página.'],
      ['Posso enviar anexos?', 'Sim. São aceitos imagens, PDF e contratos em arquivos de até 10 MB.'],
      ['Existe um prazo ideal de resposta?', 'Responder em até 2 horas aumenta consideravelmente a chance de fechar o contrato.']
    ]],
    ['Guia de CRM', 'Leads, funil e propostas', '📇', [
      ['O que é um lead?', 'É todo contato interessado nos seus serviços, venha da vitrine, do chat ou cadastrado por você na mão.'],
      ['Como o status do lead muda?', 'O status acompanha o funil: novo, em conversa, proposta enviada e fechado.']
    ]],
    ['Guia de contratos', 'Emissão, parcelas e convidados', '📄', [
      ['Como gerar um contrato?', 'A partir de um lead fechado, o contrato já nasce com os dados do cliente preenchidos.'],
      ['Posso parcelar o pagamento?', 'Sim, defina o número de parcelas e o painel acompanha o que já foi pago e o que está em aberto.']
    ]],
    ['Guia de produtos e serviços', 'Monte seu catálogo', '📦', [
      ['Qual a diferença entre produto e serviço?', 'Na prática nenhuma para o sistema: ambos viram itens da sua vitrine, com foto, descrição e preço.']
    ]],
    ['Guia de vitrine', 'Sua página pública', '🏪', [
      ['Quem vê a minha vitrine?', 'Qualquer pessoa com o link, mesmo sem conta na Love. Ela também aparece na busca de fornecedores.']
    ]],
    ['Guia de agenda', 'Tarefas, quadro e calendário', '📅', [
      ['Qual a diferença entre tarefa e evento?', 'Tarefa vive no quadro e tem responsável; evento aparece no calendário com data e hora.']
    ]],
    ['Guia financeiro', 'Carteira, saques e notas fiscais', '💳', [
      ['Quando o dinheiro fica disponível?', 'Assim que o cliente paga o link, o valor entra na sua carteira e pode ser sacado via Pix.']
    ]]
  ];

  guias.forEach(([titulo, subtitulo, icone, perguntas], gi) => {
    const guiaId = bloco({ plataforma: 'fornecedor', secao: 'guia', titulo, subtitulo, icone, posicao: gi + 1, ativo: titulo !== 'Guia financeiro' });
    perguntas.forEach(([pergunta, resposta], pi) => {
      bloco({ plataforma: 'fornecedor', secao: 'faq', titulo: pergunta, descricao: resposta, posicao: pi + 1, ativo: true, parent_id: guiaId });
    });
  });

  // Fornecedor — serviços e benefícios
  const servicoLink = bloco({ plataforma: 'fornecedor', secao: 'servico', titulo: 'Link de pagamento', subtitulo: 'Receba em até 12x', descricao: 'Gere cobranças para seus clientes direto do painel.', imagem_url: '../assets/banner_high_quality.jpg', posicao: 1, ativo: true });
  bloco({ plataforma: 'fornecedor', secao: 'beneficio', titulo: 'Parcelamento em 12x', descricao: 'Seu cliente parcela, você recebe à vista.', icone: '💠', posicao: 1, ativo: true, parent_id: servicoLink });
  bloco({ plataforma: 'fornecedor', secao: 'beneficio', titulo: 'Antecipação de recebíveis', descricao: 'Receba antes do prazo pagando uma taxa menor.', icone: '⚡', posicao: 2, ativo: false, parent_id: servicoLink });

  const servicoVitrine = bloco({ plataforma: 'fornecedor', secao: 'servico', titulo: 'Vitrine digital', subtitulo: 'Seu site de fornecedor', descricao: 'Página pública com seus produtos, fotos e contato.', posicao: 2, ativo: true });
  bloco({ plataforma: 'fornecedor', secao: 'beneficio', titulo: 'Domínio próprio', descricao: 'Use seu endereço no lugar do link da Love.', icone: '🌐', posicao: 1, ativo: true, parent_id: servicoVitrine });

  // Cliente — carrossel, guias e serviços
  bloco({ plataforma: 'cliente', secao: 'banner', titulo: 'Seu casamento começa aqui', descricao: 'Crie seu site e sua lista de presentes em minutos.', link_url: 'https://love.com.br/criar', imagem_url: '../assets/wedding_hero_banner.jpg', posicao: 1, ativo: true });
  bloco({ plataforma: 'cliente', secao: 'banner', titulo: 'Presentes em PIX, na hora', descricao: 'O valor cai na sua conta assim que o convidado paga.', imagem_url: '../assets/hero_gift.jpg', posicao: 2, ativo: true });

  const guiaLista = bloco({ plataforma: 'cliente', secao: 'guia', titulo: 'Guia da lista de presentes', subtitulo: 'Como montar e receber via PIX', icone: '🎁', posicao: 1, ativo: true });
  bloco({ plataforma: 'cliente', secao: 'faq', titulo: 'Posso escolher valores livres?', descricao: 'Sim. Além de produtos, você pode criar cotas de qualquer valor — lua de mel, jantar, o que quiser.', posicao: 1, ativo: true, parent_id: guiaLista });
  bloco({ plataforma: 'cliente', secao: 'faq', titulo: 'Quando o dinheiro cai na conta?', descricao: 'Na hora. Assim que o convidado paga, o valor entra na sua carteira e pode ser sacado via Pix.', posicao: 2, ativo: true, parent_id: guiaLista });

  const guiaSite = bloco({ plataforma: 'cliente', secao: 'guia', titulo: 'Guia do site do casamento', subtitulo: 'Tema, fotos e convite', icone: '💍', posicao: 2, ativo: true });
  bloco({ plataforma: 'cliente', secao: 'faq', titulo: 'Dá para trocar o tema depois?', descricao: 'Sim, a qualquer momento. O link do convite continua o mesmo, só o visual muda.', posicao: 1, ativo: true, parent_id: guiaSite });

  const servicoRsvp = bloco({ plataforma: 'cliente', secao: 'servico', titulo: 'Confirmação de presença', subtitulo: 'RSVP online', descricao: 'Seus convidados confirmam pelo site e você acompanha em tempo real.', posicao: 1, ativo: true });
  bloco({ plataforma: 'cliente', secao: 'beneficio', titulo: 'Controle de mesas', descricao: 'Organize quem senta onde direto no painel.', icone: '🪑', posicao: 1, ativo: true, parent_id: servicoRsvp });

  return {
    admins: [
      { id: 'admin-demo', name: 'Victor Maranhão', email: 'admin@love.com.br', role: 'superadmin', active: true, created_at: diasAtras(300) },
      { id: 'admin-2', name: 'Juliana Prado', email: 'juliana@love.com.br', role: 'admin', active: true, created_at: diasAtras(120) },
      { id: 'admin-3', name: 'Rodrigo Sales', email: 'rodrigo@love.com.br', role: 'admin', active: false, created_at: diasAtras(45) }
    ],
    fornecedores, clientes, eventos, convidados, presentes,
    cliente_wallet_transactions, wallet_transactions,
    contracts, payment_links, notas_fiscais,
    conversations, leads, products,
    tickets, ticket_messages,
    conteudo_plataforma: conteudo
  };
}

/* ------------------------------------------------- Banco falso em memória */

function carregarDemoDB() {
  try {
    const salvo = localStorage.getItem(DEMO_STORAGE_KEY);
    if (salvo) return JSON.parse(salvo);
  } catch (e) { /* storage indisponível — segue com o seed */ }

  const novo = demoSeed();
  salvarDemoDB(novo);
  return novo;
}

function salvarDemoDB(db) {
  try {
    localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(db));
  } catch (e) { /* cota estourada — as alterações valem só até recarregar */ }
}

function novoId() {
  return 'demo-' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
}

/**
 * Reproduz a parte da API do supabase-js que o painel usa:
 * from().select().eq().in().order().maybeSingle(), insert, update().eq(),
 * delete().eq() e a contagem com { count: 'exact', head: true }.
 */
function criarClienteDemo() {
  const db = carregarDemoDB();

  function builder(tabela) {
    let linhas = (db[tabela] || []).slice();
    let contar = false;

    const api = {
      select(_colunas, opcoes) {
        if (opcoes && opcoes.count) contar = true;
        return api;
      },
      eq(coluna, valor) { linhas = linhas.filter(l => l[coluna] === valor); return api; },
      neq(coluna, valor) { linhas = linhas.filter(l => l[coluna] !== valor); return api; },
      in(coluna, valores) { linhas = linhas.filter(l => valores.includes(l[coluna])); return api; },
      order(coluna, opcoes) {
        const asc = !opcoes || opcoes.ascending !== false;
        linhas.sort((a, b) => {
          const x = a[coluna], y = b[coluna];
          if (x === y) return 0;
          if (x === null || x === undefined) return 1;
          if (y === null || y === undefined) return -1;
          return (x > y ? 1 : -1) * (asc ? 1 : -1);
        });
        return api;
      },
      limit(n) { linhas = linhas.slice(0, n); return api; },
      maybeSingle() { return Promise.resolve({ data: linhas[0] || null, error: null }); },
      single() { return Promise.resolve({ data: linhas[0] || null, error: null }); },

      insert(dados) {
        const itens = Array.isArray(dados) ? dados : [dados];
        const criados = itens.map(d => ({
          id: novoId(),
          created_at: new Date().toISOString(),
          ...d
        }));
        db[tabela] = (db[tabela] || []).concat(criados);
        salvarDemoDB(db);
        const resultado = Promise.resolve({ data: criados, error: null });
        resultado.select = () => resultado;
        resultado.single = () => Promise.resolve({ data: criados[0], error: null });
        return resultado;
      },

      update(dados) {
        return {
          eq(coluna, valor) {
            (db[tabela] || []).forEach(l => {
              if (l[coluna] === valor) Object.assign(l, dados, { updated_at: new Date().toISOString() });
            });
            salvarDemoDB(db);
            return Promise.resolve({ data: null, error: null });
          }
        };
      },

      delete() {
        return {
          eq(coluna, valor) {
            // Apaga os filhos junto, como faz o on delete cascade no banco.
            const alvos = (db[tabela] || []).filter(l => l[coluna] === valor).map(l => l.id);
            db[tabela] = (db[tabela] || []).filter(l => l[coluna] !== valor);
            db[tabela] = db[tabela].filter(l => !alvos.includes(l.parent_id));
            salvarDemoDB(db);
            return Promise.resolve({ data: null, error: null });
          }
        };
      },

      then(resolve) {
        resolve(contar
          ? { data: null, count: linhas.length, error: null }
          : { data: linhas, error: null });
        return Promise.resolve();
      }
    };

    return api;
  }

  return {
    from: builder,
    auth: {
      getSession: () => Promise.resolve({ data: { session: { user: { id: 'admin-demo', email: 'admin@love.com.br' } } }, error: null }),
      signInWithPassword: () => Promise.resolve({ data: { user: { id: 'admin-demo' } }, error: null }),
      signOut: () => Promise.resolve({ error: null })
    }
  };
}

/* ---------------------------------------------------------- Liga/desliga */

window.LOVE_DEMO = {
  /** Modo demo ligado? A URL (?demo=0 ou ?demo=1) vence a constante. */
  ativo() {
    const parametro = new URLSearchParams(location.search).get('demo');
    if (parametro === '0') { sessionStorage.setItem('love-admin-demo', 'off'); return false; }
    if (parametro === '1') { sessionStorage.removeItem('love-admin-demo'); return true; }
    if (sessionStorage.getItem('love-admin-demo') === 'off') return false;
    return MODO_DEMO;
  },

  client: criarClienteDemo,

  /** Devolve os dados fictícios ao estado original. */
  reiniciar() {
    localStorage.removeItem(DEMO_STORAGE_KEY);
    location.reload();
  }
};
