/* ==========================================================================
   LOVE ADMIN — Drawer de conta (único)

   Um cadastro é a mesma pessoa vista de três lugares: Últimos cadastros no
   dashboard, Cadastros de B2B e Cadastros de Anfitriões. Antes cada página
   desenhava o seu próprio painel; agora as três chamam ContaDrawer.abrir(),
   então o que aparece é literalmente o mesmo HTML.

   A origem, o provedor e o horário exato vêm de auth.users pela
   admin_listar_contas() (SECURITY DEFINER) — a tabela de autenticação não é
   exposta pela API. O resto vem das tabelas de perfil.
   ========================================================================== */

const ORIGENS = {
  b2b: { rotulo: 'HUB/B2B', badge: 'badge-info', plataforma: 'HUB/B2B' },
  anfitriao: { rotulo: 'Anfitrião', badge: 'badge-success', plataforma: 'Plataforma principal' },
  sem_origem: { rotulo: 'Sem origem', badge: 'badge-danger', plataforma: 'Não identificada' }
};

const PROVEDORES = {
  email: 'E-mail e senha (padrão)',
  google: 'Google',
  apple: 'Apple',
  desconhecido: 'Não informado'
};

/* Selo ao lado do e-mail: quem entrou pelo Google não confirma e-mail com
   a Love (o Google já garante o endereço), então mostra "Login Google".
   "Verificado" só para quem se cadastrou com e-mail e clicou no link de
   confirmação; sem isso, "Não verificado". */
function seloDaConta(c) {
  if (c.provedor === 'google') return '<span class="selo-verificado selo-google">Login Google</span>';
  if (c.provedor === 'apple') return '<span class="selo-verificado selo-google">Login Apple</span>';
  if (c.provedor === 'desconhecido' || c.email_confirmado == null) return '';
  return c.email_confirmado
    ? '<span class="selo-verificado">Verificado</span>'
    : '<span class="selo-verificado selo-pendente">Não verificado</span>';
}

/** Data e hora completas — para saber o momento exato do cadastro. */
function dataHoraCompleta(valor) {
  if (!valor) return null;
  const dt = new Date(valor);
  if (Number.isNaN(dt.getTime())) return null;
  return dt.toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit'
  });
}

/** Linha de "rótulo: valor" só quando há valor. */
function linhaOpcional(rotulo, valor) {
  const texto = String(valor ?? '').trim();
  if (!texto) return '';
  return `
    <div class="dados-linha">
      <span class="rotulo">${escapeHtml(rotulo)}</span>
      <span class="valor">${escapeHtml(texto)}</span>
    </div>`;
}

/* --------------------------------------------------- Dispositivo e navegador

   auth.users não guarda nada disso. Vem de duas fontes, nessa ordem:

   1. o metadado gravado no momento do cadastro — exato, mas só existe para
      quem se cadastrou depois de a captura entrar no ar;
   2. o user_agent da sessão mais recente — aproximado: é o último aparelho
      usado, não necessariamente o do cadastro, e some quando a sessão expira.

   Quando o dado é da segunda fonte, o drawer diz isso em vez de fingir
   precisão que não tem. */

const APARELHOS = { mobile: 'Celular', tablet: 'Tablet', desktop: 'Computador' };

function aparelhoDoUserAgent(ua) {
  if (/ipad|tablet/i.test(ua)) return 'tablet';
  if (/mobile|android|iphone|ipod/i.test(ua)) return 'mobile';
  return 'desktop';
}

function navegadorDoUserAgent(ua) {
  if (/edg\//i.test(ua)) return 'Edge';
  if (/opr\/|opera/i.test(ua)) return 'Opera';
  if (/samsungbrowser/i.test(ua)) return 'Samsung Internet';
  if (/firefox|fxios/i.test(ua)) return 'Firefox';
  if (/chrome|crios/i.test(ua)) return 'Chrome';   // CriOS = Chrome no iPhone
  if (/safari/i.test(ua)) return 'Safari';
  return null;
}

function acessoDaConta(c) {
  const juntar = (aparelho, navegador) =>
    [APARELHOS[aparelho] || aparelho, navegador].filter(Boolean).join(' · ');

  if (c.dispositivo || c.navegador) {
    return { texto: juntar(c.dispositivo, c.navegador), exato: true };
  }

  if (!c.user_agent) return null;

  return {
    texto: juntar(aparelhoDoUserAgent(c.user_agent), navegadorDoUserAgent(c.user_agent)),
    exato: false
  };
}

/** Último aparelho: o que o site/Hub gravou (modelo · sistema · navegador);
 *  sem isso, o que dá para tirar do user agent da sessão mais recente. */
function ultimoAparelho(c) {
  if (c.ultimo_aparelho) return c.ultimo_aparelho;
  const ua = c.user_agent;
  if (!ua) return null;
  const ios = ua.match(/(iPhone|iPad|iPod).*?OS (\d+)[_.](\d+)/);
  const android = ua.match(/Android (\d+)(?:[.\d]*)?; (?:[a-z]{2}-[a-z]{2}; )?([^;)]+?)(?: Build|\))/i);
  const sistema = ios ? `${ios[1]} · iOS ${ios[2]}.${ios[3]}`
    : android ? [android[2] !== 'K' ? android[2].trim() : '', `Android ${android[1]}`].filter(Boolean).join(' · ')
    : /Windows NT/.test(ua) ? 'Windows'
    : /Mac OS X/.test(ua) ? 'Mac'
    : APARELHOS[aparelhoDoUserAgent(ua)];
  return [sistema, navegadorDoUserAgent(ua)].filter(Boolean).join(' · ');
}

const ContaDrawer = (() => {
  // Nos Cadastros o painel abre na mesma caixa da tabela (emLinha); no
  // Dashboard continua como pop-up.
  let alvoEmLinha = null;
  function emLinha(cfg) { alvoEmLinha = cfg; }
  const abrirPainel = (opcoes) => Drawer.open({ ...opcoes, emLinha: alvoEmLinha });

  let CONTAS = null;
  let DADOS = null;
  let carregando = null;

  /** O dashboard já carrega tudo isso para os KPIs — reaproveita em vez de buscar de novo. */
  function semear({ contas, dados }) {
    if (contas) CONTAS = contas;
    if (dados) DADOS = dados;
  }

  async function carregar() {
    if (CONTAS && DADOS) return;
    if (carregando) return carregando;

    carregando = (async () => {
      const [contas, fornecedores, clientes, eventos, carteira, contratos, convidados, presentes, produtos] =
        await Promise.all([
          CONTAS ? { data: CONTAS } : supabaseClient.rpc('admin_listar_contas'),
          safeSelect('fornecedores', '*'),
          safeSelect('clientes', '*'),
          safeSelect('eventos', '*'),
          safeSelect('wallet_transactions', 'fornecedor_id, type, amount, created_at'),
          safeSelect('contracts', 'fornecedor_id, valor_total, status, created_at'),
          safeSelect('convidados', 'evento_id, cliente_id, status, extra'),
          safeSelect('presentes', 'evento_id, cliente_id, valor, status'),
          safeSelect('products', '*')
        ]);

      CONTAS = contas.data || [];
      DADOS = {
        fornecedores: fornecedores.data,
        clientes: clientes.data,
        eventos: eventos.data,
        carteira: carteira.data,
        contratos: contratos.data,
        convidados: convidados.data,
        presentes: presentes.data,
        produtos: produtos.data
      };
    })();

    await carregando;
    carregando = null;
  }

  /**
   * Quando a admin_listar_contas() não responde (migration 015 ainda não
   * rodada, por exemplo), monta o mínimo a partir da tabela de perfil para o
   * drawer abrir mesmo assim, em vez de não abrir nada.
   */
  function contaDeReserva(id) {
    const f = (DADOS.fornecedores || []).find(x => x.id === id);
    if (f) return { id, nome: f.company_name, email: f.email, origem: 'b2b', provedor: 'desconhecido', criado_em: f.created_at };

    const c = (DADOS.clientes || []).find(x => x.id === id);
    if (c) return { id, nome: c.couple_name, email: c.email, origem: 'anfitriao', provedor: 'desconhecido', criado_em: c.created_at };

    return null;
  }

  async function abrir(idOuConta) {
    if (!idOuConta) return;

    await carregar();

    const conta = typeof idOuConta === 'string'
      ? (CONTAS.find(c => c.id === idOuConta) || contaDeReserva(idOuConta))
      : idOuConta;

    if (!conta) {
      toast('Não foi possível carregar esta conta.');
      return;
    }

    desenhar(conta);
  }

  /* Data de nascimento pedida no cadastro: clientes.birthday (anfitrião) ou
     fornecedores.birthday (Hub); "AAAA-MM-DD" vira "DD/MM/AAAA". */
  function dataDeNascimento(c) {
    const cad = c.origem === 'b2b'
      ? (DADOS?.fornecedores || []).find(x => x.id === c.id)
      : (DADOS?.clientes || []).find(x => x.id === c.id);
    const valor = String(cad?.birthday || '').trim();
    if (!valor) return null;
    const iso = valor.match(/^(\d{4})-(\d{2})-(\d{2})/);
    return iso ? `${iso[3]}/${iso[2]}/${iso[1]}` : valor;
  }

  function desenhar(c) {
    const semOrigem = c.origem === 'sem_origem';
    const origem = ORIGENS[c.origem] || ORIGENS.sem_origem;
    const acesso = acessoDaConta(c);

    const linha = (rotulo, valor) => `
      <div class="dados-linha">
        <span class="rotulo">${escapeHtml(rotulo)}</span>
        <span class="valor">${valor}</span>
      </div>`;

    const nascimento = dataDeNascimento(c);

    abrirPainel({
      title: c.nome || c.email || 'Conta',
      semTitulo: true,
      body: `
        <div class="lista-dados">
          ${linha('Nome', escapeHtml(c.nome || '—'))}
          ${linha('E-mail', `${escapeHtml(c.email || '—')}${seloDaConta(c)}`)}
          ${linha('Data de nascimento', escapeHtml(nascimento || 'Não informada'))}
          ${linha('Canal', escapeHtml(origem.rotulo))}
          ${linha('Entrou por', escapeHtml(PROVEDORES[c.provedor] || c.provedor))}
          ${linha('Criada em', escapeHtml(dataHoraCompleta(c.criado_em) || '—'))}
          ${acesso && acesso.exato ? linha('Cadastrou-se em', escapeHtml(acesso.texto)) : ''}
          ${ultimoAparelho(c) ? linha('Último aparelho', escapeHtml(ultimoAparelho(c))) : ''}
          ${linha('Último acesso', escapeHtml(dataHoraCompleta(c.ultimo_acesso) || 'nunca'))}
          ${linha('Sessões', c.sessoes == null ? '—' : formatNumber(c.sessoes))}
          ${linha('Situação', c.bloqueado
            ? '<span class="valor-bloqueado">Bloqueada</span>'
            : 'Ativa')}
          ${linha('UID', `<code class="dados-id">${escapeHtml(c.id)}</code>`)}
        </div>

        ${detalheDaConta(c)}

        ${semOrigem ? `
          <p class="drawer-section-title">Classificar</p>
          <p class="cell-muted" style="font-size:.8125rem;line-height:1.7;margin:0 0 1rem">
            Esta conta chegou sem identificação de plataforma — é o que acontece no
            login social, que não envia o papel junto. Escolha onde ela entra:
            a conta passa a aparecer na lista correspondente.
          </p>

          <label class="field">
            <span class="field-label">Nome</span>
            <input class="field-input" id="nome-conta" type="text" value="${escapeHtml(c.nome || '')}"
                   placeholder="${escapeHtml(c.email || '')}">
          </label>

          <div style="display:flex;gap:.625rem">
            <button type="button" class="btn btn-ghost" style="flex:1" data-destino="b2b">É um fornecedor (B2B)</button>
            <button type="button" class="btn btn-ghost" style="flex:1" data-destino="anfitriao">É um anfitrião</button>
          </div>` : ''}`,
      footer: `
        <button type="button" class="btn btn-ghost" id="btn-fechar">Fechar</button>
        <button type="button" class="btn btn-neutro" id="btn-bloquear">
          ${c.bloqueado ? 'Desbloquear usuário' : 'Bloquear usuário'}
        </button>`
    });

    document.getElementById('btn-fechar').addEventListener('click', () => Drawer.close());
    document.getElementById('btn-bloquear').addEventListener('click', () => pedirConfirmacao(c));

    document.querySelectorAll('[data-destino]').forEach(btn => {
      btn.addEventListener('click', () => classificar(c, btn.dataset.destino));
    });

    const fornecedor = c.origem === 'b2b'
      ? (DADOS.fornecedores || []).find(x => x.id === c.id)
      : null;
    if (fornecedor) ligarBonificacao(c, fornecedor);

    document.querySelectorAll('[data-produto]').forEach(btn => {
      btn.addEventListener('click', () => {
        const produto = (DADOS.produtos || []).find(p => p.id === btn.dataset.produto);
        if (produto) abrirProduto(produto, c);
      });
    });

    document.querySelectorAll('[data-evento]').forEach(btn => {
      btn.addEventListener('click', () => {
        const evento = (DADOS.eventos || []).find(e => e.id === btn.dataset.evento);
        if (evento) abrirEvento(evento, c);
      });
    });
  }

  /* Bloquear e excluir são coisas diferentes e a caixa precisa deixar isso
     explícito, porque uma é reversível e a outra não. As três saídas ficam
     lado a lado: cancelar, bloquear (ou desbloquear) e excluir. */
  function pedirConfirmacao(c) {
    const corpo = Drawer.corpo();
    const bloqueada = !!c.bloqueado;
    const acao = bloqueada ? 'Desbloquear' : 'Bloquear';

    const aviso = document.createElement('div');
    aviso.className = 'drawer-acoes-conta';
    aviso.innerHTML = `
      <p class="drawer-acoes-titulo">${acao} ${escapeHtml(c.nome || c.email || 'esta conta')}?</p>
      <p class="drawer-acoes-texto drawer-acoes-texto--perigo">
        Atenção: Excluir é definitivo, a conta é excluída, assim como tudo que ela
        criou. Esta ação não pode ser desfeita.
      </p>
      <div class="drawer-acoes-botoes">
        <button type="button" class="btn btn-ghost btn-sm" id="btn-cancelar-acao">Cancelar</button>
        <button type="button" class="btn btn-neutro btn-sm" id="btn-confirmar-bloqueio">${acao}</button>
        <button type="button" class="btn btn-danger btn-sm" id="btn-confirmar-exclusao">Excluir</button>
      </div>`;

    corpo.appendChild(aviso);
    aviso.scrollIntoView({ behavior: 'smooth', block: 'end' });

    const botaoRodape = document.getElementById('btn-bloquear');
    botaoRodape.disabled = true;

    document.getElementById('btn-cancelar-acao').addEventListener('click', () => {
      aviso.remove();
      botaoRodape.disabled = false;
    });

    document.getElementById('btn-confirmar-bloqueio')
      .addEventListener('click', () => bloquear(c, !bloqueada));

    document.getElementById('btn-confirmar-exclusao')
      .addEventListener('click', () => excluir(c));
  }

  async function bloquear(c, bloquear) {
    Drawer.setFooterBusy(true);

    const { error } = await supabaseClient.rpc('admin_bloquear_conta', {
      p_id: c.id,
      p_bloquear: bloquear
    });

    Drawer.setFooterBusy(false);

    if (error) {
      toast(faltaMigration(error, 'admin_bloquear_conta')
        ? 'Rode supabase/migrations/018_bloquear_conta.sql no Supabase.'
        : `Não foi possível ${bloquear ? 'bloquear' : 'desbloquear'}: ${error.message}`);
      return;
    }

    Drawer.close();
    toast(bloquear ? 'Conta bloqueada.' : 'Conta desbloqueada.');
    window.location.reload();
  }

  async function excluir(c) {
    Drawer.setFooterBusy(true);

    const { error } = await supabaseClient.rpc('admin_excluir_conta', { p_id: c.id });

    Drawer.setFooterBusy(false);

    if (error) {
      toast(faltaMigration(error, 'admin_excluir_conta')
        ? 'Rode supabase/migrations/017_excluir_conta_e_dispositivo.sql no Supabase.'
        : `Não foi possível excluir: ${error.message}`);
      return;
    }

    Drawer.close();
    toast('Conta excluída.');
    window.location.reload();
  }

  /** Distingue "a função ainda não existe no banco" de um erro de verdade. */
  function faltaMigration(error, nome) {
    return new RegExp(`${nome}|does not exist|schema cache`, 'i').test(error.message || '');
  }

  /**
   * O que a conta tem além dos dados de autenticação: o cadastro que a pessoa
   * preenche em configurações e, no caso do anfitrião, os eventos que criou.
   */
  function detalheDaConta(c) {
    if (c.origem === 'b2b') return detalheFornecedor(c.id);
    if (c.origem === 'anfitriao') return detalheAnfitriao(c.id);
    return '';
  }

  function detalheFornecedor(id) {
    const f = (DADOS.fornecedores || []).find(x => x.id === id);
    if (!f) return '';

    const contratos = (DADOS.contratos || []).filter(x => x.fornecedor_id === id);
    const ativos = contratos.filter(x => x.status !== 'quitado');
    const entradas = (DADOS.carteira || [])
      .filter(x => x.fornecedor_id === id && x.type === 'credit')
      .reduce((t, x) => t + (Number(x.amount) || 0), 0);

    const cadastro = [
      // Ordem pedida: quem e a empresa primeiro (razao social, documento,
      // responsavel e o segmento em que ela atua); contato e endereco depois.
      linhaOpcional('Razão social', f.razao_social),
      linhaOpcional('CNPJ', f.cnpj),
      linhaOpcional('Responsável', f.contact_name),
      linhaOpcional('Categoria', f.category),
      linhaOpcional('Telefone', f.phone),
      linhaOpcional('Endereço', f.address),
      linhaOpcional('Cidade', [f.city, f.state].filter(Boolean).join(' / ')),
      linhaDoScore(f),
      blocoDoPlano(f),
      linhaOpcional('Chave Pix', f.pix_key)
    ].join('');

    return `
      <p class="drawer-section-title">Cadastro do fornecedor</p>
      ${cadastro
        ? `<div class="lista-dados">${cadastro}</div>`
        : `<p class="cell-muted" style="font-size:.8125rem;margin:0">Nada preenchido em configurações ainda.</p>`}

      ${acoesDoPlano(f)}

      <p class="drawer-section-title">Operação</p>
      <div class="lista-dados">
        ${linhaOpcional('Contratos', `${formatNumber(ativos.length)} ativos de ${formatNumber(contratos.length)}`)}
        ${linhaOpcional('Entradas na carteira', formatCurrency(entradas))}
      </div>

      ${blocoDeProdutos(id)}`;
  }

  /* ----------------------------------------------- Produtos e serviços

     A vitrine do fornecedor pode ter dezenas de itens e não é o assunto
     principal do drawer. Fica recolhida atrás da contagem: quem quer ver
     abre, quem não quer não paga o espaço. --------------------------- */

  function produtosDe(id) {
    return (DADOS.produtos || []).filter(p => p.fornecedor_id === id);
  }

  function blocoDeProdutos(id) {
    const produtos = produtosDe(id);
    if (!produtos.length) return '';

    const lista = produtos
      .slice()
      .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0))
      .map(p => `
        <button type="button" class="evento-conta" data-produto="${escapeHtml(p.id)}">
          <span class="nome">${escapeHtml(p.name || 'Sem nome')}</span>
          ${p.active === false ? badge('inativo', 'badge-warning') : ''}
          <svg class="evento-conta-seta" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="m9 5 7 7-7 7"/>
          </svg>
        </button>`).join('');

    return `
      <details class="lista-recolhivel">
        <summary class="lista-recolhivel-topo">
          <span class="rotulo">Produtos</span>
          <span class="valor">${formatNumber(produtos.length)}</span>
          <svg class="evento-conta-seta" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="m6 9 6 6 6-6"/>
          </svg>
        </summary>
        <div class="lista-recolhivel-corpo">${lista}</div>
      </details>`;
  }

  const TIPOS_DE_OFERTA = { servico: 'Serviço', produto: 'Produto', pacote: 'Pacote' };

  const TIPOS_DE_PRECO = {
    POR_PESSOA: 'Por pessoa',
    POR_HORA: 'Por hora',
    VALOR_FIXO: 'Valor fixo',
    SOB_CONSULTA: 'Sob consulta'
  };

  /** O preço mostrado acompanha o modelo escolhido no wizard do B2B. */
  function precoDoProduto(p) {
    const base = Number(p.price) || 0;
    const teto = Number(p.price_max) || 0;
    if (teto > base) return `${formatCurrency(base)} a ${formatCurrency(teto)}`;
    if (!base) return 'sob consulta';
    return formatCurrency(base);
  }

  function abrirProduto(produto, conta) {
    const extra = produto.extra || {};
    const precificacao = extra.pricing || {};
    const escopo = extra.scope || {};

    const dado = (rotulo, valor) => `
      <div class="dados-linha">
        <span class="rotulo">${escapeHtml(rotulo)}</span>
        <span class="valor">${valor}</span>
      </div>`;

    const listaDeTextos = (titulo, itens) => {
      const limpos = (itens || []).filter(Boolean);
      if (!limpos.length) return '';
      return `
        <p class="drawer-section-title">${escapeHtml(titulo)}</p>
        <ul class="lista-simples">${limpos.map(i => `<li>${escapeHtml(i)}</li>`).join('')}</ul>`;
    };

    abrirPainel({
      title: produto.name || 'Sem nome',
      subtitle: [TIPOS_DE_OFERTA[extra.offerType] || extra.offerType, produto.category]
        .filter(Boolean).join(' · '),
      back: () => desenhar(conta),
      body: `
        ${produto.cover_image_url
          ? `<img class="produto-capa" src="${escapeHtml(produto.cover_image_url)}" alt="">`
          : ''}

        <div class="lista-dados">
          ${dado('Situação', produto.active === false
            ? '<span class="valor-bloqueado">Inativo</span>'
            : 'Ativo')}
          ${dado('Categoria', escapeHtml(produto.category || '—'))}
          ${extra.subcategory ? dado('Subcategoria', escapeHtml(extra.subcategory)) : ''}
          ${dado('Preço', escapeHtml(precoDoProduto(produto)))}
          ${precificacao.type
            ? dado('Modelo de preço', escapeHtml(TIPOS_DE_PRECO[precificacao.type] || precificacao.type))
            : ''}
          ${dado('Cadastrado em', escapeHtml(dataHoraCompleta(produto.created_at) || '—'))}
          ${Array.isArray(produto.gallery) && produto.gallery.length
            ? dado('Imagens na galeria', formatNumber(produto.gallery.length))
            : ''}
        </div>

        ${produto.description
          ? `<p class="drawer-section-title">Descrição</p>
             <p class="texto-corrido">${escapeHtml(produto.description)}</p>`
          : ''}

        ${listaDeTextos('O que está incluso', escopo.included)}
        ${listaDeTextos('O que não está incluso', escopo.excluded)}`,
      footer: `<button type="button" class="btn btn-ghost" id="btn-fechar">Fechar</button>`
    });

    document.getElementById('btn-fechar').addEventListener('click', () => Drawer.close());
  }

  /* ---------------------------------------------------------- Score

     Nota interna de 1 a 10. Não se edita à mão: vai ser calculada por regras
     de negócio (produto com imagem vale X, e assim por diante). Até essas
     regras existirem, a coluna fica vazia — mostrar "sem nota" é mais honesto
     que mostrar um zero que ninguém atribuiu. */

  function linhaDoScore(f) {
    return `
      <div class="dados-linha">
        <span class="rotulo">Score</span>
        <span class="valor">${f.score
          ? formatNumber(f.score)
          : '<span class="cell-muted">sem nota</span>'}</span>
      </div>`;
  }

  /* ------------------------------------------------- Plano do fornecedor

     O Pro pode chegar por dois caminhos e eles não valem a mesma coisa:
     assinatura paga se renova sozinha; cortesia do Admin tem prazo. Por isso
     o plano aparece com procedência e, quando tem prazo, com o vencimento.
     --------------------------------------------------------------------- */

  // A cortesia é dada em blocos de 30 dias, até 90.
  const BONIFICACAO_PASSOS = [30, 60, 90];
  const BONIFICACAO_MAXIMA = 90;

  function planoVencido(f) {
    return !!f.plan_expira_em && new Date(f.plan_expira_em) < new Date();
  }

  /** Pro de cortesia que já passou da validade vale como gratuito. */
  function planoVigente(f) {
    if ((f.plan || 'Gratuito') !== 'Pro') return 'Gratuito';
    return planoVencido(f) ? 'Gratuito' : 'Pro';
  }

  function origemDoPlano(f) {
    if (f.plan_origem === 'bonificacao_admin') return 'Bonificação admin';
    if (f.plan_origem === 'cartao') {
      const final = f.plan_cartao_final ? `•••• ${f.plan_cartao_final}` : 'cartão cadastrado';
      return [f.plan_cartao_bandeira, final].filter(Boolean).join(' ');
    }
    return null;
  }

  function blocoDoPlano(f) {
    const vigente = planoVigente(f);
    const origem = origemDoPlano(f);
    const podeBonificar = vigente === 'Gratuito' && diasDisponiveis(f).length > 0;

    // No gratuito o próprio valor é o gatilho da cortesia: um botão separado
    // ocupava espaço para uma ação que nasce de olhar justamente esta linha.
    const valorDoPlano = podeBonificar
      ? '<button type="button" class="valor-acionavel" id="link-plano">Gratuito</button>'
      : (vigente === 'Pro' ? 'Pro' : 'Gratuito');

    return [
      `<div class="dados-linha">
         <span class="rotulo">Plano</span>
         <span class="valor">${valorDoPlano}</span>
       </div>`,
      vigente === 'Pro' && origem ? linhaOpcional('Origem do plano', origem) : '',
      vigente === 'Pro' && f.plan_expira_em
        ? linhaOpcional('Vence em', dataHoraCompleta(f.plan_expira_em))
        : '',
      vigente === 'Gratuito' && planoVencido(f)
        ? linhaOpcional('Bonificação anterior', `venceu em ${dataHoraCompleta(f.plan_expira_em)}`)
        : ''
    ].join('');
  }

  /** Blocos que ainda cabem no teto de 90 dias desta conta. */
  function diasDisponiveis(f) {
    const concedidos = f.plan_bonificado_dias || 0;
    return BONIFICACAO_PASSOS.filter(d => concedidos + d <= BONIFICACAO_MAXIMA);
  }

  function acoesDoPlano(f) {
    const opcoes = diasDisponiveis(f);
    if (planoVigente(f) !== 'Gratuito' || !opcoes.length) return '';

    return `
      <div class="bonificacao-caixa" id="caixa-bonificacao" hidden>
        <div class="bonificacao-topo">
          <p class="bonificacao-titulo" id="bonificacao-titulo">Deseja dar um upgrade cortesia?</p>
          <button type="button" class="bonificacao-fechar" id="btn-fechar-bonificacao" aria-label="Fechar">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" d="M6 18 18 6M6 6l12 12"/></svg>
          </button>
        </div>

        <div class="bonificacao-stepper" id="bonificacao-escolha">
          <select class="field-select bonificacao-select" id="bonificacao-dias" aria-label="Dias de cortesia">
            ${opcoes.map(d => `<option value="${d}">${d}</option>`).join('')}
          </select>
          <span class="bonificacao-unidade">dias</span>
          <button type="button" class="btn btn-primary" id="btn-confirmar-bonificacao">Bonificar</button>
        </div>

        <div class="bonificacao-stepper" id="bonificacao-confirma" hidden>
          <button type="button" class="btn btn-ghost" id="btn-nao-bonificar">Não</button>
          <button type="button" class="btn btn-primary" id="btn-sim-bonificar">Sim</button>
        </div>
      </div>`;
  }

  function ligarBonificacao(conta, f) {
    const gatilho = document.getElementById('link-plano');
    const caixa = document.getElementById('caixa-bonificacao');
    if (!gatilho || !caixa) return;

    const titulo = document.getElementById('bonificacao-titulo');
    const escolha = document.getElementById('bonificacao-escolha');
    const confirma = document.getElementById('bonificacao-confirma');
    const select = document.getElementById('bonificacao-dias');

    const dias = () => Number(select.value);

    /* A confirmação ocupa o lugar do seletor, em vez de abrir outra caixa:
       a pergunta nasce exatamente de onde a escolha foi feita. */
    const verEscolha = () => {
      titulo.textContent = 'Deseja dar um upgrade cortesia?';
      escolha.hidden = false;
      confirma.hidden = true;
    };

    const verConfirmacao = () => {
      titulo.textContent = `Tem certeza? Pro por ${dias()} dias.`;
      escolha.hidden = true;
      confirma.hidden = false;
    };

    const fechar = () => {
      caixa.hidden = true;
      select.selectedIndex = 0;
      verEscolha();
    };

    gatilho.addEventListener('click', () => { caixa.hidden = false; });
    document.getElementById('btn-fechar-bonificacao').addEventListener('click', fechar);

    document.getElementById('btn-confirmar-bonificacao').addEventListener('click', verConfirmacao);
    // "Não" volta ao seletor, não fecha: quem hesitou costuma querer outro prazo.
    document.getElementById('btn-nao-bonificar').addEventListener('click', verEscolha);
    document.getElementById('btn-sim-bonificar')
      .addEventListener('click', () => bonificar(conta, dias()));
  }

  async function bonificar(conta, dias) {
    const botao = document.getElementById('btn-sim-bonificar');
    botao.disabled = true;

    const { data, error } = await supabaseClient.rpc('admin_bonificar_plano', {
      p_id: conta.id,
      p_dias: dias
    });

    if (error) {
      botao.disabled = false;
      const faltaFuncao = /admin_bonificar_plano|does not exist|schema cache/i.test(error.message || '');
      toast(faltaFuncao
        ? 'Rode supabase/migrations/024_bonificacao_em_dias.sql no Supabase.'
        : error.message);
      return;
    }

    // Atualiza o cache local para o drawer já redesenhar com o plano novo.
    const f = (DADOS.fornecedores || []).find(x => x.id === conta.id);
    if (f) {
      f.plan = 'Pro';
      f.plan_origem = 'bonificacao_admin';
      f.plan_expira_em = data;
      f.plan_bonificado_dias = (f.plan_bonificado_dias || 0) + dias;
    }

    toast(`Pro liberado por ${dias} dias.`);
    desenhar(conta);
  }

  function detalheAnfitriao(id) {
    const cliente = (DADOS.clientes || []).find(x => x.id === id);
    const eventos = (DADOS.eventos || []).filter(x => x.cliente_id === id);

    const cadastro = cliente ? [
      linhaOpcional('Telefone', cliente.phone),
      linhaOpcional('CPF', cliente.cpf),
      linhaOpcional('Cidade', cliente.city),
      linhaOpcional('Status da conta', cliente.status)
    ].join('') : '';

    /* A linha mostra só nome e categoria; o resto abre ao clicar, no mesmo
       drawer. Antes tudo ficava exposto de uma vez e a lista virava um muro
       de números para quem tem vários eventos. */
    const listaEventos = eventos.length
      ? eventos
          .slice()
          .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0))
          .map(e => linhaDeEvento(e))
          .join('')
      : `<p class="cell-muted" style="font-size:.8125rem;margin:0">Esta conta ainda não criou nenhum evento.</p>`;

    return `
      <p class="drawer-section-title">Cadastro do anfitrião</p>
      ${cadastro
        ? `<div class="lista-dados">${cadastro}</div>`
        : `<p class="cell-muted" style="font-size:.8125rem;margin:0">Nada preenchido em configurações ainda.</p>`}

      <p class="drawer-section-title">
        Eventos${eventos.length ? ` (${formatNumber(eventos.length)})` : ''}
      </p>
      ${listaEventos}`;
  }

  function linhaDeEvento(e) {
    const categoria = EVENT_TYPE_LABELS[e.tipo] || e.tipo || '—';
    return `
      <button type="button" class="evento-conta" data-evento="${escapeHtml(e.id)}">
        <span class="nome">${escapeHtml(e.titulo || 'Sem título')}</span>
        <span class="evento-conta-categoria">${escapeHtml(categoria)}</span>
        <svg class="evento-conta-seta" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="m9 5 7 7-7 7"/>
        </svg>
      </button>`;
  }

  /* O evento ocupa o drawer inteiro em vez de abrir um acordeão: são muitos
     números para caber embaixo de uma linha de lista. A seta de voltar no
     cabeçalho redesenha a conta, sem fechar e reabrir o drawer. */
  function abrirEvento(evento, conta) {
    const convidados = (DADOS.convidados || []).filter(g => g.evento_id === evento.id);
    const presentes = (DADOS.presentes || []).filter(p => p.evento_id === evento.id);
    const recebidos = presentes.filter(p => p.status === 'recebido');

    const somarPessoas = lista => lista.reduce((t, g) => t + pessoasDoConvidado(g), 0);
    const porStatus = st => somarPessoas(convidados.filter(g => g.status === st));
    const somar = lista => lista.reduce((t, p) => t + (Number(p.valor) || 0), 0);

    const convite = evento.slug ? `https://love.com.br/${evento.slug}` : null;

    const dado = (rotulo, valor) => `
      <div class="dados-linha">
        <span class="rotulo">${escapeHtml(rotulo)}</span>
        <span class="valor">${valor}</span>
      </div>`;

    const caixa = (rotulo, valor) => `
      <div class="stat-box">
        <span class="label">${escapeHtml(rotulo)}</span>
        <span class="value">${formatNumber(valor)}</span>
      </div>`;

    abrirPainel({
      title: evento.titulo || 'Sem título',
      subtitle: EVENT_TYPE_LABELS[evento.tipo] || evento.tipo || '',
      back: () => desenhar(conta),
      body: `
        <div class="lista-dados">
          ${dado('Data do evento', escapeHtml(formatDate(evento.data_evento) || '—'))}
          ${dado('Convidados', formatNumber(somarPessoas(convidados)))}
        </div>

        <div class="stat-row stat-row--convidados stat-row--compacto">
          ${caixa('Confirmados', porStatus('confirmado'))}
          ${caixa('Pendentes', porStatus('pendente'))}
          ${caixa('Recusados', porStatus('recusado'))}
        </div>

        <div class="lista-dados">
          ${dado('Presentes na lista', formatNumber(presentes.length))}
          ${dado('Valor da lista de presentes', formatCurrency(somar(presentes)))}
          ${dado('Presentes recebidos', formatNumber(recebidos.length))}
          ${dado('Valor recebido', formatCurrency(somar(recebidos)))}
          ${dado('Status do evento', statusDoEvento(evento))}
          ${dado('Página do convite', convite
            ? `<a href="${escapeHtml(convite)}" target="_blank" rel="noopener" class="link-convite">love.com.br/${escapeHtml(evento.slug)}</a>`
            : '<span class="cell-muted">sem endereço definido</span>')}
        </div>`,
      footer: `
        ${evento.deleted_at ? '<button type="button" class="btn btn-primary" id="btn-restaurar-evento">Restaurar evento</button>' : ''}
        <button type="button" class="btn btn-ghost" id="btn-fechar">Fechar</button>`
    });

    document.getElementById('btn-fechar').addEventListener('click', () => Drawer.close());
    document.getElementById('btn-restaurar-evento')?.addEventListener('click', () =>
      restaurarEvento(evento, () => abrirEvento(evento, conta)));
  }

  const STATUS_EVENTO = { rascunho: 'Rascunho', ativo: 'Ativo', encerrado: 'Encerrado' };

  function statusDoEvento(evento) {
    if (evento.deleted_at) {
      const quando = dataHoraCompleta(evento.deleted_at);
      return `<span class="valor-bloqueado">Excluído pelo criador${quando ? ` em ${escapeHtml(quando)}` : ''}</span>`;
    }
    return escapeHtml(STATUS_EVENTO[evento.status] || evento.status || '—');
  }

  async function classificar(conta, destino) {
    const nome = (document.getElementById('nome-conta')?.value || '').trim();

    if (!nome) {
      toast('Informe o nome antes de classificar.');
      return;
    }

    Drawer.setFooterBusy(true);

    const alvo = destino === 'b2b'
      ? { tabela: 'fornecedores', linha: { id: conta.id, company_name: nome, email: conta.email } }
      : { tabela: 'clientes', linha: { id: conta.id, couple_name: nome, email: conta.email } };

    const { error } = await supabaseClient.from(alvo.tabela).insert(alvo.linha);

    if (!error) {
      await supabaseClient.from('contas_sem_origem').delete().eq('id', conta.id);
    }

    Drawer.setFooterBusy(false);

    if (error) {
      toast(`Não foi possível classificar: ${error.message}`);
      return;
    }

    Drawer.close();
    toast(destino === 'b2b' ? 'Conta movida para B2B.' : 'Conta movida para Anfitriões.');
    window.location.reload();
  }

  return { semear, carregar, abrir, emLinha };
})();
