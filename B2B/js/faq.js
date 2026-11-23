/* ==========================================================================
   LOVE B2B — Central de Ajuda: capa com Pesquisar e 6 caixas de categoria.
   As perguntas vêm da tabela faq (plataforma 'fornecedor'). As categorias dos
   guias continuam na página Guia de início e entram só na pesquisa.
   ========================================================================== */
(function () {
  const MQ_CELULAR = window.matchMedia('(max-width: 768px), (hover: none) and (pointer: coarse) and (max-height: 500px)');
  const DUVIDA = 'M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z';
  const LUPA = 'M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z';
  const SETA = '<svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5"/></svg>';
  const icone = d => '<svg fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="' + d + '"/></svg>';

  const CATEGORIAS = [
    { chave: 'produtos', nome: 'Produtos e Serviços', desc: 'Catálogo, preços e vitrine', d: 'M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z', nomes: ['Produtos e Serviços'] },
    { chave: 'contratos', nome: 'Contratos e Pagamentos', desc: 'Contratos, repasses e ganhos', d: 'M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9zM8.25 15h7.5M8.25 18h4.5', nomes: ['Contratos e Pagamentos'] },
    { chave: 'crm', nome: 'CRM e Chat', desc: 'Clientes, pedidos e conversas', d: 'M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193-.34.027-.68.052-1.02.072v3.091l-3-3c-1.354 0-2.694-.055-4.02-.163a2.115 2.115 0 01-.825-.242m9.345-8.334a2.126 2.126 0 00-.476-.095 48.64 48.64 0 00-8.048 0c-1.131.094-1.976 1.057-1.976 2.192v4.286c0 .837.46 1.58 1.155 1.951m9.345-8.334V6.637c0-1.621-1.152-3.026-2.76-3.235A48.455 48.455 0 0011.25 3c-2.115 0-4.198.137-6.24.402-1.608.209-2.76 1.614-2.76 3.235v6.226c0 1.621 1.152 3.026 2.76 3.235.577.075 1.157.14 1.74.194V21l4.155-4.155', nomes: ['CRM e Chat'] },
    { chave: 'colaboradores', nome: 'Colaboradores e Funções', desc: 'Equipe e permissões de acesso', d: 'M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z', nomes: ['Colaboradores e Funções'] },
    { chave: 'planos', nome: 'Planos e Upgrade', desc: 'Recursos e mudança de plano', d: 'M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z', nomes: ['Planos e Upgrade'] },
    { chave: 'conta', nome: 'Conta e privacidade', desc: 'Dados, segurança e acesso', d: 'M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z', nomes: ['Conta e privacidade', 'Conta e Configurações', 'Privacidade e segurança'], antigas: ['privacidade'] }
  ];
  // Estas categorias da tabela são os guias: ficam em Guia de início.
  const SO_NA_PESQUISA = ['Construtor de site', 'Guia de CRM', 'Guia de contratos', 'Guia de produtos e serviços', 'Guia de agenda e tarefas', 'Gestão de compromissos', 'Guia financeiro'];

  // Perguntas de reserva: aparecem se a tabela falhar ou não tiver a categoria.
  const RESERVA = {
    "produtos": [
      [
        "Como cadastro ou edito meus produtos e serviços?",
        "Acesse <strong>Serviços</strong> no menu lateral e clique em \"Adicionar novo\". Você pode editar preço, descrição e fotos de qualquer item a qualquer momento."
      ],
      [
        "As mudanças no catálogo aparecem na vitrine automaticamente?",
        "Sim. Assim que você salva uma alteração em um produto ou serviço, ela reflete na vitrine que os anfitriões veem dentro dos eventos, sem precisar de nenhum passo extra."
      ]
    ],
    "contratos": [
      [
        "Como recebo os pagamentos dos contratos fechados?",
        "Os repasses referentes aos contratos assinados aparecem na área <strong>Meus ganhos</strong>, junto com o histórico de recebimentos e pendências."
      ],
      [
        "Como envio um contrato para assinatura do cliente?",
        "Em <strong>Contratos</strong>, clique em \"Novo orçamento/contrato\", preencha os dados do evento e envie o link de assinatura direto para o cliente."
      ]
    ],
    "crm": [
      [
        "Como acompanho os leads que chegam pela plataforma?",
        "Todo novo interesse de um anfitrião vira um lead automaticamente em <strong>CRM</strong>, onde você acompanha o estágio da negociação até o fechamento."
      ],
      [
        "Como falo com um cliente diretamente pelo portal?",
        "Use o menu <strong>Chat</strong> para conversar com cada cliente — o histórico da conversa fica salvo junto com os dados do lead ou contrato."
      ]
    ],
    "colaboradores": [
      [
        "Como convido um colaborador para minha conta?",
        "Acesse <strong>Funções</strong> no menu lateral, clique em \"Convidar pessoa\" e escolha a função (Administrador, Operacional, Financeiro ou Visualizador) — ou personalize exatamente quais áreas essa pessoa pode acessar."
      ],
      [
        "Posso limitar o que cada colaborador acessa?",
        "Sim. Ao convidar alguém, você escolhe uma função pronta ou personaliza o acesso módulo por módulo, liberando só o que essa pessoa precisa ver."
      ]
    ],
    "planos": [
      [
        "Como funciona o upgrade para o plano Pro?",
        "No plano Pro você libera CRM avançado, relatórios financeiros completos e colaboradores ilimitados na sua conta. É possível solicitar o upgrade a qualquer momento em <strong>Planos e recursos</strong>."
      ],
      [
        "Posso voltar para o plano Gratuito depois?",
        "Sim, o downgrade pode ser feito a qualquer momento na página de <strong>Planos e recursos</strong>, sem multa ou período de carência."
      ]
    ],
    "privacidade": [
      [
        "Quais dados da minha empresa a Love guarda?",
        "Guardamos os dados que você cadastra no Hub (empresa, CNPJ/CPF, responsável, contato, endereço, produtos, clientes e contratos) só para fazer a plataforma funcionar. Você encontra tudo em detalhes na nossa <a href=\"privacidade\">Política de privacidade</a>."
      ],
      [
        "Como deixo a minha conta mais segura?",
        "Em <strong>Configurações › Privacidade</strong>, ative a autenticação de dois fatores: além da senha, o login passa a pedir um código do Google Authenticator."
      ],
      [
        "Para que serve a verificação de conta?",
        "Ela confirma que a empresa é real (Cartão CNPJ e documento do sócio). Os documentos ficam guardados com segurança, só são usados para a verificação e contas verificadas ganham mais destaque na vitrine."
      ],
      [
        "Entrei com o Google. Posso passar a entrar com e-mail e senha?",
        "Sim. Em <strong>Configurações › Informações › Contas conectadas</strong>, clique em \"Desconectar do Google\". Na próxima vez, digite o seu e-mail no login e use \"Esqueci minha senha\" para criar a senha."
      ],
      [
        "Quem consegue ver os meus dados bancários?",
        "Só você e quem você liberar em <strong>Funções</strong> com acesso ao financeiro. A chave Pix é usada apenas para enviar os seus saques."
      ]
    ],
    "conta": [
      [
        "Como altero os dados da minha empresa (CNPJ/CPF)?",
        "O nome da empresa e o CNPJ/CPF ficam bloqueados depois de preenchidos pela primeira vez. Em <strong>Configurações</strong>, clique em \"Solicitar alteração\" ao lado do campo para falar com nosso suporte."
      ],
      [
        "Ainda preciso de ajuda. Como falo com o suporte?",
        "Use a busca no topo da tela (⌘K) para encontrar rapidamente clientes, contratos ou produtos, ou envie uma mensagem pelo menu <strong>Chat</strong> que nossa equipe responde por lá."
      ]
    ]
  };

  const semAcento = t => String(t || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const semTags = t => String(t || '').replace(/<[^>]*>/g, ' ');
  const slug = t => semAcento(t).trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const respostaHtml = r => {
    const texto = String(r || '');
    return /<[a-z][\s\S]*>/i.test(texto) ? texto : '<p>' + escapeHtml(texto).replace(/\r?\n/g, '<br>') + '</p>';
  };

  async function lerPerguntas() {
    const consulta = colunas => supabaseClient.from('faq').select(colunas)
      .eq('plataforma', 'fornecedor').eq('ativo', true)
      .order('ordem', { ascending: true }).order('created_at', { ascending: true });
    try {
      let r = await consulta('categoria, pergunta, resposta, ordem, termos_busca');
      // Banco ainda sem a migration 134: consulta de novo sem a coluna.
      if (r.error) r = await consulta('categoria, pergunta, resposta, ordem');
      return !r.error && Array.isArray(r.data) ? r.data : [];
    } catch (e) { return []; }
  }

  function montarCategorias(linhas) {
    const lista = CATEGORIAS.map(c => ({ ...c, itens: [] }));
    const porNome = new Map();
    lista.forEach(c => c.nomes.forEach(n => porNome.set(slug(n), c)));
    const soPesquisa = new Set(SO_NA_PESQUISA.map(slug));
    const extras = [];
    linhas.forEach(l => {
      const nome = String(l.categoria || '').trim() || 'Outras dúvidas';
      const s = slug(nome);
      if (soPesquisa.has(s)) { extras.push(l); return; }
      let c = porNome.get(s);
      if (!c) {
        c = { chave: s, nome, desc: 'Dúvidas frequentes', d: DUVIDA, nomes: [nome], itens: [] };
        porNome.set(s, c);
        lista.push(c);
      }
      c.itens.push(l);
    });
    lista.forEach(c => {
      if (c.itens.length) return;
      const chaves = [c.chave, ...(c.antigas || [])];
      c.itens = chaves.flatMap(k => (RESERVA[k] || []).map(([pergunta, resposta]) => ({ pergunta, resposta })));
    });
    return { categorias: lista.filter(c => c.itens.length), extras };
  }

  function desenharPagina(raiz, { categorias, extras }) {
    const todas = [...categorias.flatMap(c => c.itens), ...extras];
    const pedida = slug(new URLSearchParams(location.search).get('categoria') || '');
    let ativa = pedida ? (categorias.find(c => c.chave === pedida || (c.antigas || []).includes(pedida) || c.nomes.some(n => slug(n) === pedida)) || null) : null;
    let busca = '';

    raiz.innerHTML = `
      <section class="ajuda-capa">
        <h3 class="ajuda-capa-titulo"><span class="ajuda-so-celular">Central de Ajuda</span><span class="ajuda-so-desktop">Como podemos ajudar?</span></h3>
        <label class="ajuda-busca">${icone(LUPA)}<input id="ajuda-busca" type="search" autocomplete="off" placeholder="Pesquisar" aria-label="Pesquisar"></label>
      </section>
      <div class="ajuda-cats">${categorias.map(c => `
        <button type="button" class="ajuda-cat" data-chave="${escapeHtml(c.chave)}" aria-expanded="false">
          <span class="ajuda-cat-icone">${icone(c.d)}</span>
          <span class="ajuda-cat-textos"><span class="ajuda-cat-nome">${escapeHtml(c.nome)}</span><span class="ajuda-cat-desc">${escapeHtml(c.desc)}</span></span>
          <span class="ajuda-cat-seta">${SETA}</span>
        </button>`).join('')}</div>
      <div class="ajuda-painel" hidden></div>
      <a class="ajuda-guia-link" href="guias">Ver o Guia de início</a>`;

    const caixas = raiz.querySelector('.ajuda-cats');
    const painel = raiz.querySelector('.ajuda-painel');
    const link = raiz.querySelector('.ajuda-guia-link');
    const botoes = [...raiz.querySelectorAll('.ajuda-cat')];

    const desenhar = () => {
      const termo = semAcento(busca.trim());
      raiz.insertBefore(painel, link);
      caixas.hidden = !!termo;
      let botaoAtivo = null;
      botoes.forEach(b => {
        const on = !termo && !!ativa && b.dataset.chave === ativa.chave;
        b.classList.toggle('ativa', on);
        b.setAttribute('aria-expanded', String(on));
        if (on) botaoAtivo = b;
      });
      const itens = termo
        ? todas.filter(i => semAcento([i.pergunta, semTags(i.resposta), ...(Array.isArray(i.termos_busca) ? i.termos_busca : [])].join(' ')).includes(termo))
        : (ativa ? ativa.itens : null);
      if (!itens) { painel.hidden = true; painel.innerHTML = ''; return; }
      painel.hidden = false;
      painel.innerHTML = (termo ? '<h3 class="ajuda-resultados">Resultados da pesquisa</h3>' : '') + (itens.length
        ? '<div class="ajuda-lista">' + itens.map(i => `
          <div class="ajuda-item">
            <button type="button" class="ajuda-pergunta" aria-expanded="false"><span>${escapeHtml(i.pergunta || '')}</span>${SETA}</button>
            <div class="ajuda-resposta">${respostaHtml(i.resposta)}</div>
          </div>`).join('') + '</div>'
        : '<p class="ajuda-vazio">Nenhuma pergunta encontrada.</p>');
      if (botaoAtivo && MQ_CELULAR.matches) botaoAtivo.after(painel);
    };

    raiz.addEventListener('click', e => {
      const pergunta = e.target.closest('.ajuda-pergunta');
      if (pergunta) {
        const aberto = pergunta.closest('.ajuda-item').classList.toggle('aberto');
        pergunta.setAttribute('aria-expanded', String(aberto));
        return;
      }
      const botao = e.target.closest('.ajuda-cat');
      if (!botao) return;
      ativa = ativa && ativa.chave === botao.dataset.chave ? null : categorias.find(c => c.chave === botao.dataset.chave);
      desenhar();
    });
    raiz.querySelector('#ajuda-busca').addEventListener('input', e => { busca = e.target.value; desenhar(); });
    MQ_CELULAR.addEventListener?.('change', desenhar);
    desenhar();
  }

  // Celular: seta de voltar no lugar do menu, com o logo do Hub no centro.
  function colocarVoltarNoTopo() {
    const topo = document.querySelector('#shell-topbar .b2b-topbar');
    if (!topo || topo.querySelector('.ajuda-voltar-topo')) return;
    const a = document.createElement('a');
    a.href = 'dashboard';
    a.className = 'ajuda-voltar-topo';
    a.setAttribute('aria-label', 'Voltar ao início');
    a.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M19 12H5m0 0 7 7m-7-7 7-7"/></svg>';
    topo.appendChild(a);
  }

  document.addEventListener('shell:ready', async () => {
    colocarVoltarNoTopo();
    const raiz = document.getElementById('ajuda-raiz');
    if (raiz) desenharPagina(raiz, montarCategorias(await lerPerguntas()));
    window.b2bPageReady?.();
  });
})();
