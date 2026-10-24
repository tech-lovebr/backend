// @ts-check
// Carteira digital (Carteira › Carteira digital) — abas Saque e Contas
// bancárias, no modelo das carteiras de plataformas de pagamento:
//   Saque: saldo total, disponível para saque (com "Solicitar saque") e
//          pendente; ao lado, o extrato dos presentes comprados e o
//          histórico de saques (quando, quanto, para qual conta e status).
//   Contas bancárias: antes da primeira conta, a verificação de identidade
//          (RG frente e verso, nome, CPF e Pix — migration 086, bucket
//          privado "documentos"); depois, a tabela das contas
//          (clientes.dados_saque.contas) e o cadastro dentro da caixa.
// Saques: tabela saques (migration 085) — o pedido entra como "Solicitado" e
// a Love processa.
// API: window.LoveCarteira.render()
(function () {
  'use strict';

  /** @param {unknown} v */
  const esc = (v) => String(v == null ? '' : v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  /** @param {number} v */
  const reais = (v) => `R$ ${Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const ehUuid = (/** @type {string} */ v) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(v || ''));
  const soDigitos = (/** @type {string} */ v) => String(v || '').replace(/\D/g, '');
  /** @param {string} v */
  function mascaraCpf(v) {
    const d = soDigitos(v).slice(0, 11);
    return d.replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d{1,2})$/, '$1-$2');
  }
  /** @param {string} iso */
  function dataHora(iso) {
    const d = new Date(iso);
    if (!Number.isFinite(d.getTime())) return { dia: String(iso || ''), hora: '' };
    return { dia: d.toLocaleDateString('pt-BR'), hora: d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) };
  }

  const w = /** @type {any} */ (window);
  const evento = () => (typeof w.getLoveActiveEvent === 'function' ? w.getLoveActiveEvent() : null);
  const usuario = () => (w.loveClienteSession && w.loveClienteSession.user) || null;

  // --------------------------------------------------------------------------
  // Estado
  // --------------------------------------------------------------------------
  let aba = 'saque';
  let esconder = false;
  let buscaConta = '';
  /** Lista embaixo dos saldos: extrato (presentes recebidos) ou histórico de saques. */
  let vista = 'extrato';
  let buscaLista = '';
  /** Filtro de período das tabelas (AAAA-MM-DD; vazio = todo o período). */
  let periodo = { de: '', ate: '' };
  let periodoAberto = false;

  /** Data de um registro ("2026-10-22…", "22/10/2026", "Hoje, às 14:22", "Ontem…"). @param {unknown} v @returns {Date|null} */
  function dataDoRegistro(v) {
    const s = String(v || '').trim();
    if (!s) return null;
    if (/^\d{4}-\d{2}-\d{2}/.test(s)) { const d = new Date(s); return Number.isFinite(d.getTime()) ? d : null; }
    const m = s.match(/(\d{2})\/(\d{2})\/(\d{4})/);
    if (m) return new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]));
    const h = new Date(); h.setHours(12, 0, 0, 0);
    if (/^hoje/i.test(s)) return h;
    if (/^ontem/i.test(s)) { h.setDate(h.getDate() - 1); return h; }
    return null;
  }
  /** Está no período escolhido? (sem data conhecida, aparece sempre) @param {unknown} v */
  function noPeriodo(v) {
    if (!periodo.de && !periodo.ate) return true;
    const d = dataDoRegistro(v);
    if (!d) return true;
    const dia = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    return (!periodo.de || dia >= periodo.de) && (!periodo.ate || dia <= periodo.ate);
  }
  /** @param {string} iso */
  const br = (iso) => iso ? iso.split('-').reverse().join('/') : '';
  const textoDoPeriodo = () => (periodo.de || periodo.ate) ? `${br(periodo.de) || '…'} - ${br(periodo.ate) || '…'}` : 'Todo o período';
  /** @type {any[]} */
  let saques = [];
  let semTabelaDeSaques = false;
  let carregandoSaques = false;
  let saquesDoEvento = '';

  /** Contas cadastradas (formato antigo: um Pix/TED só → lista de um). @returns {any[]} */
  function contas() {
    const d = (w.loveClienteProfile && w.loveClienteProfile.dados_saque) || {};
    if (Array.isArray(d.contas)) return d.contas;
    if (d.metodo === 'pix' && d.pix && d.pix.chave) return [{ id: 'conta-1', metodo: 'pix', pix: d.pix }];
    if (d.metodo === 'ted' && d.ted && d.ted.conta) return [{ id: 'conta-1', metodo: 'ted', ted: d.ted }];
    return [];
  }
  /** @param {any} c */
  function nomeDaConta(c) {
    if (!c) return '—';
    if (c.metodo === 'pix') {
      const tipos = { cpf: 'CPF', email: 'E-mail', telefone: 'Telefone', aleatoria: 'Chave aleatória' };
      return `Pix · ${(/** @type {any} */ (tipos))[c.pix && c.pix.tipo] || 'Chave'}: ${c.pix ? c.pix.chave : ''}`;
    }
    return `${(c.ted && c.ted.banco) || 'Banco'} · Ag. ${(c.ted && c.ted.agencia) || '—'} · Conta ${(c.ted && c.ted.conta) || '—'}`;
  }

  /** Presentes comprados (extrato). */
  function presentesComprados() {
    const ev = evento();
    return ((ev && ev.receivedGifts) || []).slice();
  }

  function numeros() {
    const ev = evento();
    const presentes = presentesComprados();
    let arrecadado = presentes.reduce((t, g) => t + (Number(g.amount) || 0), 0);
    if (!arrecadado && ev && ev.wallet) arrecadado = (Number(ev.wallet.saldoDisponivel) || 0) + (Number(ev.wallet.totalSacado) || 0);
    const realizado = saques.filter(s => s.status === 'realizado').reduce((t, s) => t + (Number(s.valor) || 0), 0);
    const pendente = saques.filter(s => s.status === 'solicitado' || s.status === 'processando').reduce((t, s) => t + (Number(s.valor) || 0), 0);
    const disponivel = Math.max(0, arrecadado - realizado - pendente);
    return { arrecadado, realizado, pendente, disponivel, total: disponivel + pendente };
  }

  async function carregarSaques() {
    const ev = evento();
    const u = usuario();
    const id = ev ? String(ev.id) : '';
    if (!u || typeof supabaseClient === 'undefined' || semTabelaDeSaques) { saques = []; return; }
    carregandoSaques = true;
    let q = supabaseClient.from('saques').select('*').eq('cliente_id', u.id).order('created_at', { ascending: false });
    if (ehUuid(id)) q = q.eq('evento_id', id);
    const { data, error } = await q;
    carregandoSaques = false;
    saquesDoEvento = id;
    if (error) { if (error.code === 'PGRST205' || error.code === '42P01') semTabelaDeSaques = true; saques = []; return; }
    saques = data || [];
  }

  // --------------------------------------------------------------------------
  // Desenho
  // --------------------------------------------------------------------------
  const ICONE_OLHO = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z"/><circle cx="12" cy="12" r="3"/></svg>';
  const ICONE_BUSCA = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>';
  const ICONE_CALENDARIO = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3.5" y="5" width="17" height="15" rx="2"/><path d="M3.5 9.5h17M8 3v4M16 3v4"/></svg>';
  const ICONE_BUSCA_ESQ = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>';
  const SITUACOES = { solicitado: 'Solicitado', processando: 'Em andamento', realizado: 'Realizado', recusado: 'Recusado' };

  /** @param {number} v */
  const valor = (v) => `<span class="cart-valor${esconder ? ' is-escondido' : ''}">${esconder ? 'R$ ••••' : esc(reais(v))}</span>`;

  function htmlSaque() {
    const n = numeros();
    const ev = evento();
    const podeSacar = !(ev && ev.souOrganizador);
    const temConta = contas().length > 0;
    return `
      <section class="cart-caixa cart-resumo">
        <div class="cart-resumo-topo">
          <button type="button" class="cart-link" data-cart-esconder>${ICONE_OLHO}<span>${esconder ? 'Mostrar valores' : 'Esconder valores'}</span></button>
        </div>
        <div class="cart-resumo-cols">
          <div class="cart-resumo-col">
            <p class="cart-rotulo">Saldo disponível para saque</p>
            <p class="cart-numero">${valor(n.disponivel)}</p>
            ${podeSacar ? `
              <button type="button" class="btn-primary cart-sacar" data-cart-sacar ${n.disponivel > 0 && temConta ? '' : 'disabled'}>Solicitar saque</button>
              ${temConta ? '' : '<p class="cart-dica">Cadastre uma conta em <button type="button" class="cart-link-texto" data-cart-aba="contas">Contas bancárias</button> para sacar.</p>'}` : '<p class="cart-dica">Só o criador do evento pode solicitar saques.</p>'}
            <button type="button" class="cart-link-texto cart-ver" data-cart-vista="saques" ${vista === 'saques' ? 'aria-current="true"' : ''}>Ver histórico de saques</button>
          </div>
          <div class="cart-resumo-col">
            <p class="cart-rotulo">Saldo pendente</p>
            <p class="cart-numero">${valor(n.pendente)}</p>
            <p class="cart-dica">Saques solicitados, a caminho da sua conta.</p>
            <button type="button" class="cart-link-texto cart-ver" data-cart-vista="extrato" ${vista === 'extrato' ? 'aria-current="true"' : ''}>Ver extrato completo</button>
          </div>
        </div>
      </section>
      ${vista === 'saques' ? htmlHistorico() : htmlExtrato()}`;
  }

  /** Barra da tabela (busca à esquerda, contagem à direita), como em Meus convidados. @param {string} placeholder @param {string} contagem */
  const barraDaTabela = (placeholder, contagem) => `
    <div class="love-tabela-barra">
      <div class="love-tabela-barra-esq">
        <div class="love-tabela-busca">
          ${ICONE_BUSCA_ESQ}
          <input type="search" data-cart-busca-lista value="${esc(buscaLista)}" placeholder="${esc(placeholder)}" aria-label="${esc(placeholder)}" autocomplete="off">
        </div>
      </div>
      <div class="love-tabela-barra-dir">
        <div class="cart-periodo">
          <button type="button" class="cart-periodo-btn" data-cart-periodo aria-haspopup="dialog" aria-expanded="${periodoAberto}" title="${esc(contagem)}">
            ${ICONE_CALENDARIO}<span>${esc(textoDoPeriodo())}</span>
          </button>
          ${periodoAberto ? `
            <div class="cart-periodo-pop" role="dialog" aria-label="Escolher período">
              <label class="cart-campo"><span>De</span><input type="date" data-cart-de value="${esc(periodo.de)}"></label>
              <label class="cart-campo"><span>Até</span><input type="date" data-cart-ate value="${esc(periodo.ate)}"></label>
              <div class="cart-periodo-acoes">
                <button type="button" class="cart-cancelar" data-cart-periodo-limpar>Limpar</button>
                <button type="button" class="cart-btn-escuro" data-cart-periodo-aplicar>Aplicar</button>
              </div>
            </div>` : ''}
        </div>
      </div>
    </div>`;

  /** Extrato: presentes recebidos (quem comprou, o quê, quando e quanto). */
  function htmlExtrato() {
    const todos = presentesComprados();
    const termo = buscaLista.trim().toLowerCase();
    const lista = todos.filter(g => noPeriodo(g.date) && (!termo || `${g.guestName} ${g.giftTitle}`.toLowerCase().includes(termo)));
    return `
      <h3 class="cart-lista-titulo">Extrato completo</h3>
      <section class="dash-card love-tabela-caixa cart-lista">
        ${barraDaTabela('Buscar convidado ou presente...', `${todos.length} ${todos.length === 1 ? 'presente recebido' : 'presentes recebidos'}`)}
        <div class="w-full overflow-x-auto">
          <table class="love-tabela w-full text-left border-collapse font-sans">
            <thead><tr><th>Data</th><th>Convidado</th><th>Presente</th><th class="cart-num">Valor</th></tr></thead>
            <tbody>${lista.length ? lista.map(g => `
              <tr>
                <td class="cart-data">${esc(g.date || '—')}</td>
                <td><span class="cart-nome">${esc(g.guestName || 'Convidado')}</span></td>
                <td>${esc(g.giftTitle || 'Presente')}</td>
                <td class="cart-num cart-entrada">+ ${valor(Number(g.amount) || 0)}</td>
              </tr>`).join('') : `<tr><td colspan="4" class="cart-vazio">${todos.length ? 'Nenhum presente encontrado.' : 'Nenhum presente recebido ainda.'}</td></tr>`}</tbody>
          </table>
        </div>
      </section>`;
  }

  /** Histórico de saques: quando, quanto, para qual conta e status. */
  function htmlHistorico() {
    const termo = buscaLista.trim().toLowerCase();
    const lista = saques.filter(s => noPeriodo(s.created_at) && (!termo || `${nomeDaConta(s.conta)} ${(/** @type {any} */ (SITUACOES))[s.status] || ''}`.toLowerCase().includes(termo)));
    return `
      <h3 class="cart-lista-titulo">Histórico de saques</h3>
      <section class="dash-card love-tabela-caixa cart-lista">
        ${barraDaTabela('Buscar saque...', `${saques.length} ${saques.length === 1 ? 'saque' : 'saques'}`)}
        <div class="w-full overflow-x-auto">
          <table class="love-tabela w-full text-left border-collapse font-sans cart-tabela-saques">
            <thead><tr><th>Solicitado em</th><th>Valor</th><th>Conta</th><th>Status</th></tr></thead>
            <tbody>${carregandoSaques ? '<tr><td colspan="4" class="cart-vazio">Carregando…</td></tr>' : lista.length ? lista.map(s => {
              const q = dataHora(s.created_at);
              return `
              <tr>
                <td><span class="cart-nome">${esc(q.dia)}</span><span class="cart-sub-linha">${esc(q.hora)}</span></td>
                <td class="cart-valor-saque">${valor(Number(s.valor) || 0)}</td>
                <td>${esc(nomeDaConta(s.conta))}</td>
                <td><span class="cart-status cart-status-${esc(s.status)}">${esc((/** @type {any} */ (SITUACOES))[s.status] || s.status)}</span></td>
              </tr>`;
            }).join('') : `<tr><td colspan="4" class="cart-vazio">${saques.length ? 'Nenhum saque encontrado.' : 'Nenhum saque solicitado ainda.'}</td></tr>`}</tbody>
          </table>
        </div>
      </section>`;
  }

  // --------------------------------------------------------------------------
  // Contas bancárias: verificação de identidade (antes da primeira conta),
  // tabela das contas (padrão Meus convidados, sem busca) e cadastro na caixa.
  // --------------------------------------------------------------------------
  /** Cadastro de conta aberto dentro da caixa (no lugar da tabela), sem pop-up. */
  let cadastrando = false;
  /** Verificação de identidade (tabela verificacoes_identidade, migration 086). @type {any} */
  let verificacao = null;
  let verificacaoCarregada = false;
  let semTabelaDeVerificacao = false;
  /** Passo da verificação aberto na página: '' | 'intro' | 'form'. */
  let etapaVerif = '';
  /** @type {File|null} */ let rgFrente = null;
  /** @type {File|null} */ let rgVerso = null;
  // RG, CNH ou passaporte (no passaporte o verso é opcional).
  let docTipo = 'rg';

  async function carregarVerificacao() {
    const u = usuario();
    if (!u || typeof supabaseClient === 'undefined' || semTabelaDeVerificacao) { verificacaoCarregada = true; return; }
    const { data, error } = await supabaseClient.from('verificacoes_identidade').select('*').eq('cliente_id', u.id).maybeSingle();
    verificacaoCarregada = true;
    if (error) { if (error.code === 'PGRST205' || error.code === '42P01') semTabelaDeVerificacao = true; return; }
    verificacao = data || null;
  }
  /** Já mandou os documentos (em análise ou aprovado)? */
  const documentosEnviados = () => !!verificacao && verificacao.status !== 'recusado';

  const SITUACOES_CONTA = { em_analise: 'Em análise', aprovado: 'Aprovada', recusado: 'Recusada' };
  const TIPOS_DE_CONTA = { corrente: 'Corrente', poupanca: 'Poupança', pagamento: 'Pagamento' };
  const NATUREZAS = { pf: 'Pessoa física', pj: 'Pessoa jurídica' };

  const ILUSTRACAO_DOCUMENTOS = `
    <svg viewBox="0 0 140 140" aria-hidden="true">
      <circle cx="70" cy="70" r="64" fill="#EBF4FF"/>
      <circle cx="70" cy="70" r="52" fill="none" stroke="#CFE0F5" stroke-width="2"/>
      <rect x="40" y="30" width="60" height="76" rx="8" fill="#183b54"/>
      <rect x="49" y="39" width="42" height="26" rx="5" fill="#27394f"/>
      <circle cx="70" cy="48" r="7" fill="#FFFFFF"/>
      <path d="M58 64a12 9 0 0 1 24 0Z" fill="#FFFFFF"/>
      <rect x="50" y="73" width="40" height="3.5" rx="1.75" fill="#FFFFFF" opacity=".85"/>
      <rect x="50" y="81" width="32" height="3.5" rx="1.75" fill="#FFFFFF" opacity=".85"/>
      <rect x="50" y="89" width="36" height="3.5" rx="1.75" fill="#FFFFFF" opacity=".85"/>
      <circle cx="94" cy="100" r="15" fill="#FFFFFF"/>
      <circle cx="94" cy="100" r="12" fill="#2F9E62"/>
      <path d="m88.5 100.2 3.8 3.8 7.4-7.6" fill="none" stroke="#FFFFFF" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>`;
  const ICONE_CHECK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg>';
  const ICONE_ENVIAR = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 16V4M7 9l5-5 5 5M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3"/></svg>';

  /** Aviso no lugar da tabela: antes da conta, os documentos. */
  function htmlAvisoDocumentos() {
    const recusada = verificacao && verificacao.status === 'recusado';
    return `
      <section class="cart-caixa cart-docs-aviso">
        <div class="cart-docs-ilustra">${ILUSTRACAO_DOCUMENTOS}</div>
        <div class="cart-docs-texto">
          <h3>${recusada ? 'Seus documentos precisam ser enviados de novo' : 'Antes de adicionar uma conta bancária, envie seus documentos'}</h3>
          <p>${recusada && verificacao.motivo ? esc(verificacao.motivo) : 'Para adicionar uma conta e sacar os valores disponíveis, é necessário verificar a sua identidade.'}</p>
          <button type="button" class="cart-btn-escuro" data-cart-verif="intro">${recusada ? 'Enviar novamente' : 'Enviar documentos'}</button>
        </div>
      </section>`;
  }

  /** Verificação de identidade na própria página (faixa azul + cartão). */
  function htmlVerificacao() {
    const corpo = etapaVerif === 'form' ? `
        <h4 class="cart-verif-titulo">Seus dados e documentos</h4>
        <div class="cart-form-grade">
          <label class="cart-campo cart-campo-largo"><span>Nome completo</span><input type="text" data-verif-campo="nome" autocapitalize="words" autocomplete="name"></label>
          <label class="cart-campo"><span>CPF</span><input type="text" data-verif-campo="cpf" inputmode="numeric" maxlength="14" placeholder="000.000.000-00" autocomplete="off"></label>
        </div>
        <div class="cart-form-grade">
          <label class="cart-campo"><span>Documento com foto</span>
            <select data-verif-campo="docTipo">
              <option value="rg"${docTipo === 'rg' ? ' selected' : ''}>RG</option>
              <option value="cnh"${docTipo === 'cnh' ? ' selected' : ''}>CNH</option>
              <option value="passaporte"${docTipo === 'passaporte' ? ' selected' : ''}>Passaporte</option>
            </select>
          </label>
        </div>
        <div class="cart-verif-arquivos">
          <label class="cart-arquivo" data-verif-arquivo="frente">
            <input type="file" accept="image/jpeg,image/png,application/pdf" data-verif-rg="frente">
            ${ICONE_ENVIAR}<b>Frente do documento</b><span data-verif-nome="frente">${rgFrente ? esc(rgFrente.name) : 'JPEG, PNG ou PDF'}</span>
          </label>
          <label class="cart-arquivo" data-verif-arquivo="verso">
            <input type="file" accept="image/jpeg,image/png,application/pdf" data-verif-rg="verso">
            ${ICONE_ENVIAR}<b>Verso do documento<span data-verif-opcional${docTipo === 'passaporte' ? '' : ' hidden'}> (opcional)</span></b><span data-verif-nome="verso">${rgVerso ? esc(rgVerso.name) : 'JPEG, PNG ou PDF'}</span>
          </label>
        </div>
        <div class="cart-form-grade">
          <label class="cart-campo"><span>Tipo de chave Pix</span>
            <select data-verif-campo="pixTipo"><option value="cpf">CPF</option><option value="email">E-mail</option><option value="telefone">Telefone</option><option value="aleatoria">Chave aleatória</option></select>
          </label>
          <label class="cart-campo"><span>Chave Pix</span><input type="text" data-verif-campo="pixChave" autocomplete="off"></label>
        </div>
        <p class="cart-form-erro" hidden></p>
        <div class="cart-form-acoes">
          <button type="button" class="cart-cancelar" data-cart-verif="intro">Voltar</button>
          <button type="button" class="cart-btn-escuro" data-cart-verif-enviar>Enviar para análise</button>
        </div>` : `
        <h4 class="cart-verif-titulo">Verificação de identidade e envio de documentos</h4>
        <p class="cart-verif-intro">Antes de começar, confira algumas instruções que podem te ajudar:</p>
        <ul class="cart-verif-lista">
          <li>${ICONE_CHECK}<span>Tenha em mãos o seu RG, CNH ou passaporte para enviar a foto da frente e do verso em JPEG, PNG ou PDF;</span></li>
          <li>${ICONE_CHECK}<span>As fotos devem estar nítidas, sem reflexo e com todos os dados legíveis;</span></li>
          <li>${ICONE_CHECK}<span>O nome e o CPF precisam ser do titular que vai receber os saques;</span></li>
          <li>${ICONE_CHECK}<span>Informe uma chave Pix no seu nome para receber os valores.</span></li>
        </ul>
        <div class="cart-form-acoes">
          <button type="button" class="cart-cancelar" data-cart-verif="">Voltar</button>
          <button type="button" class="cart-btn-escuro" data-cart-verif="form">Começar</button>
        </div>`;
    return `
      <section class="cart-caixa cart-verif">
        <div class="cart-verif-faixa">
          <h3>Complete as etapas e tenha seu dinheiro mais seguro na <img src="assets/logo-white.png" alt="Love" class="cart-verif-logo">!</h3>
          <p>Depois você já vai poder realizar o seu primeiro saque com segurança.</p>
        </div>
        <div class="cart-verif-cartao" data-cart-verif-cartao>${corpo}</div>
      </section>`;
  }

  /** Cadastro de conta bancária (dentro da caixa). */
  function htmlFormConta() {
    return `
      <section class="cart-caixa cart-contas cart-contas-form" data-cart-form-conta>
        <div class="cart-contas-topo">
          <div>
            <h3 class="cart-titulo">Cadastrar conta</h3>
            <p class="cart-form-sub">Para onde a Love vai transferir os seus saques.</p>
          </div>
        </div>
        <div class="cart-form-corpo">
          <div class="cart-form-grade">
            <label class="cart-campo cart-campo-largo"><span>Banco</span><input type="text" data-cart-campo="banco" placeholder="Ex.: Itaú, Nubank, Banco do Brasil" autocomplete="off"></label>
            <label class="cart-campo"><span>Agência</span><input type="text" data-cart-campo="agencia" inputmode="numeric" maxlength="8" autocomplete="off"></label>
            <label class="cart-campo"><span>Conta (com dígito)</span><input type="text" data-cart-campo="conta" maxlength="20" autocomplete="off"></label>
            <label class="cart-campo"><span>Tipo de conta</span>
              <select data-cart-campo="tipo"><option value="corrente">Corrente</option><option value="poupanca">Poupança</option><option value="pagamento">Pagamento</option></select>
            </label>
            <label class="cart-campo"><span>Natureza</span>
              <select data-cart-campo="natureza"><option value="pf">Pessoa física</option><option value="pj">Pessoa jurídica</option></select>
            </label>
          </div>
          <p class="cart-form-erro" hidden></p>
          <div class="cart-form-acoes">
            <button type="button" class="cart-cancelar" data-cart-cancelar-conta>Cancelar</button>
            <button type="button" class="cart-btn-escuro" data-cart-salvar-conta>Salvar</button>
          </div>
        </div>
      </section>`;
  }

  /** Uma conta em colunas (as antigas só Pix aparecem como Pix). @param {any} c */
  function colunasDaConta(c) {
    if (c.metodo === 'pix') return { banco: 'Pix', agencia: '—', conta: (c.pix && c.pix.chave) || '—', tipo: 'Chave Pix', natureza: '—' };
    const t = c.ted || {};
    return {
      banco: t.banco || '—',
      agencia: t.agencia || '—',
      conta: t.conta || '—',
      tipo: (/** @type {any} */ (TIPOS_DE_CONTA))[t.tipo] || 'Corrente',
      natureza: (/** @type {any} */ (NATUREZAS))[t.natureza] || 'Pessoa física',
    };
  }

  function htmlContas() {
    if (cadastrando) return htmlFormConta();
    if (etapaVerif) return htmlVerificacao();
    const lista = contas();
    if (!lista.length && verificacaoCarregada && !documentosEnviados()) return htmlAvisoDocumentos();
    const emAnalise = verificacao && verificacao.status === 'em_analise';
    return `
      <section class="dash-card love-tabela-caixa cart-caixa cart-contas-tabela">
        <div class="cart-contas-cab">
          <div class="cart-contas-cab-texto">
            <h3 class="cart-titulo">Contas cadastradas</h3>
            ${emAnalise ? '<span class="cart-status cart-status-solicitado">Documentos em análise</span>' : ''}
          </div>
          <button type="button" class="cart-btn-escuro" data-cart-cadastrar>Cadastrar conta</button>
        </div>
        <div class="w-full overflow-x-auto">
          <table class="love-tabela w-full text-left border-collapse font-sans">
            <thead><tr><th>Banco</th><th>Agência</th><th>Conta</th><th>Tipo de conta</th><th>Natureza</th><th>Status</th><th class="cart-col-acoes"></th></tr></thead>
            <tbody>${lista.length ? lista.map(c => {
              const k = colunasDaConta(c);
              const st = c.status || 'em_analise';
              return `
              <tr data-cart-conta="${esc(c.id)}">
                <td><span class="cart-nome">${esc(k.banco)}</span></td>
                <td>${esc(k.agencia)}</td>
                <td>${esc(k.conta)}</td>
                <td>${esc(k.tipo)}</td>
                <td>${esc(k.natureza)}</td>
                <td><span class="cart-status cart-conta-${esc(st)}">${esc((/** @type {any} */ (SITUACOES_CONTA))[st] || 'Em análise')}</span></td>
                <td class="cart-col-acoes"><button type="button" class="cart-remover" data-cart-remover>Remover</button></td>
              </tr>`;
            }).join('') : '<tr><td colspan="7" class="cart-vazio cart-contas-vazio">Nenhuma conta cadastrada ainda. Cadastre a conta que vai receber os seus saques.</td></tr>'}</tbody>
          </table>
        </div>
      </section>`;
  }

  function desenhar() {
    const raiz = document.getElementById('carteira-raiz');
    if (!raiz) return;
    if (aba !== 'contas') { cadastrando = false; etapaVerif = ''; }
    raiz.innerHTML = `
      <div class="love-tabs-nav cart-abas" role="tablist">
        <button type="button" class="love-tab-item${aba === 'saque' ? ' active' : ''}" data-cart-aba="saque">Saque</button>
        <button type="button" class="love-tab-item${aba === 'contas' ? ' active' : ''}" data-cart-aba="contas">Contas bancárias</button>
      </div>
      <p class="cart-aviso" id="cart-aviso" role="status" hidden></p>
      ${aba === 'contas' ? htmlContas() : htmlSaque()}`;
  }

  /** @param {string} msg @param {boolean} [erro] */
  function aviso(msg, erro) {
    const el = document.getElementById('cart-aviso');
    if (!el) return;
    el.textContent = msg;
    el.classList.toggle('is-erro', !!erro);
    el.hidden = !msg;
    if (msg) setTimeout(() => { el.hidden = true; }, 5000);
  }

  // --------------------------------------------------------------------------
  // Pop-ups (centralizados): Cadastrar conta e Solicitar saque
  // --------------------------------------------------------------------------
  /** @param {string} id @param {string} html */
  function abrirPopup(id, html) {
    fecharPopups();
    const m = document.createElement('div');
    m.className = 'cart-modal';
    m.id = id;
    m.innerHTML = `<div class="cart-modal-card" role="dialog" aria-modal="true">${html}</div>`;
    document.body.appendChild(m);
    m.addEventListener('click', (e) => { if (e.target === m || /** @type {HTMLElement} */ (e.target).closest('[data-cart-fechar]')) fecharPopups(); });
    return m;
  }
  function fecharPopups() { document.querySelectorAll('.cart-modal').forEach(m => m.remove()); }
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') fecharPopups(); });

  function abrirCadastro() {
    // Sem documentos enviados, primeiro a verificação de identidade.
    if (!documentosEnviados()) { etapaVerif = 'intro'; desenhar(); return; }
    cadastrando = true;
    desenhar();
    setTimeout(() => /** @type {HTMLElement|null} */ (document.querySelector('#carteira-raiz [data-cart-campo="banco"]'))?.focus(), 30);
  }
  function fecharCadastro() { cadastrando = false; desenhar(); }

  // Cadastro da conta e verificação de identidade (dentro da caixa).
  document.addEventListener('click', (e) => {
    const alvo = e.target instanceof Element ? e.target : null;
    if (!alvo || !alvo.closest('#carteira-raiz')) return;
    const passo = /** @type {HTMLElement|null} */ (alvo.closest('[data-cart-verif]'));
    if (passo) {
      etapaVerif = passo.dataset.cartVerif || '';
      desenhar();
      if (etapaVerif === 'form') {
        const nome = /** @type {HTMLInputElement|null} */ (document.querySelector('#carteira-raiz [data-verif-campo="nome"]'));
        const p = w.loveClienteProfile || {};
        if (nome && !nome.value) nome.value = `${p.first_name || ''} ${p.last_name || ''}`.trim();
        const cpf = /** @type {HTMLInputElement|null} */ (document.querySelector('#carteira-raiz [data-verif-campo="cpf"]'));
        if (cpf && !cpf.value && p.cpf) cpf.value = mascaraCpf(String(p.cpf));
        nome?.focus();
      }
      document.getElementById('carteira-raiz')?.scrollIntoView({ block: 'start', behavior: 'smooth' });
      return;
    }
    if (alvo.closest('[data-cart-verif-enviar]')) { enviarVerificacao(); return; }
    const form = /** @type {HTMLElement|null} */ (alvo.closest('[data-cart-form-conta]'));
    if (!form) return;
    if (alvo.closest('[data-cart-cancelar-conta]')) { fecharCadastro(); return; }
    if (alvo.closest('[data-cart-salvar-conta]')) salvarConta(form);
  });
  document.addEventListener('input', (e) => {
    const el = /** @type {HTMLInputElement} */ (e.target);
    if (!el || !el.matches || !el.matches('#carteira-raiz [data-verif-campo]')) return;
    const campo = el.dataset.verifCampo;
    const tipo = /** @type {HTMLSelectElement|null} */ (document.querySelector('#carteira-raiz [data-verif-campo="pixTipo"]'));
    if (campo === 'cpf' || (campo === 'pixChave' && tipo && tipo.value === 'cpf')) el.value = mascaraCpf(el.value);
    if (campo === 'pixChave' && tipo && tipo.value === 'telefone' && typeof w.maskBrazilPhone === 'function') el.value = w.maskBrazilPhone(el.value);
  });
  // Tipo de documento: no passaporte o verso vira opcional (sem redesenhar).
  document.addEventListener('change', (e) => {
    const el = /** @type {HTMLSelectElement} */ (e.target);
    if (!el || !el.matches || !el.matches('#carteira-raiz [data-verif-campo="docTipo"]')) return;
    docTipo = el.value;
    const opcional = /** @type {HTMLElement|null} */ (document.querySelector('#carteira-raiz [data-verif-opcional]'));
    if (opcional) opcional.hidden = docTipo !== 'passaporte';
  });
  // Documento frente/verso: guarda o arquivo e mostra o nome (sem redesenhar).
  document.addEventListener('change', (e) => {
    const el = /** @type {HTMLInputElement} */ (e.target);
    if (!el || !el.matches || !el.matches('#carteira-raiz [data-verif-rg]')) return;
    const lado = el.dataset.verifRg;
    const arq = el.files && el.files[0] ? el.files[0] : null;
    const rotulo = document.querySelector(`#carteira-raiz [data-verif-nome="${lado}"]`);
    const caixa = document.querySelector(`#carteira-raiz [data-verif-arquivo="${lado}"]`);
    if (arq && (!/^(image\/(jpeg|png)|application\/pdf)$/.test(arq.type) || arq.size > 10 * 1024 * 1024)) {
      if (rotulo) rotulo.textContent = 'Use JPEG, PNG ou PDF de até 10 MB';
      el.value = '';
      return;
    }
    if (lado === 'frente') rgFrente = arq; else rgVerso = arq;
    if (rotulo) rotulo.textContent = arq ? arq.name : 'JPEG, PNG ou PDF';
    caixa?.classList.toggle('tem-arquivo', !!arq);
  });

  async function enviarVerificacao() {
    const cartao = /** @type {HTMLElement|null} */ (document.querySelector('#carteira-raiz [data-cart-verif-cartao]'));
    if (!cartao) return;
    const v = (/** @type {string} */ c) => String((/** @type {HTMLInputElement|null} */ (cartao.querySelector(`[data-verif-campo="${c}"]`)) || { value: '' }).value || '').trim();
    const erro = /** @type {HTMLElement} */ (cartao.querySelector('.cart-form-erro'));
    const falhar = (/** @type {string} */ t) => { erro.textContent = t; erro.hidden = false; };
    const nome = v('nome');
    const cpf = soDigitos(v('cpf'));
    const pixTipo = v('pixTipo') || 'cpf';
    const pixChave = v('pixChave');
    if (nome.split(/\s+/).length < 2) return falhar('Informe o nome completo.');
    if (cpf.length !== 11) return falhar('CPF incompleto.');
    if (!rgFrente) return falhar('Envie a frente do documento.');
    if (!rgVerso && docTipo !== 'passaporte') return falhar('Envie o verso do documento.');
    if (!pixChave) return falhar('Informe a chave Pix.');
    if (pixTipo === 'cpf' && soDigitos(pixChave).length !== 11) return falhar('Chave Pix (CPF) incompleta.');
    if (pixTipo === 'email' && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(pixChave)) return falhar('Chave Pix (e-mail) inválida.');
    if (pixTipo === 'telefone' && soDigitos(pixChave).length < 10) return falhar('Chave Pix (telefone) incompleta.');
    const u = usuario();
    if (!u || typeof supabaseClient === 'undefined') return falhar('Entre na sua conta para enviar os documentos.');
    const btn = /** @type {HTMLButtonElement} */ (cartao.querySelector('[data-cart-verif-enviar]'));
    btn.disabled = true; btn.textContent = 'Enviando…';
    const pronto = () => { btn.disabled = false; btn.textContent = 'Enviar para análise'; };
    /** @param {File} arq @param {string} lado */
    const subir = async (arq, lado) => {
      const ext = arq.type === 'application/pdf' ? 'pdf' : arq.type === 'image/png' ? 'png' : 'jpg';
      const caminho = `${u.id}/rg-${lado}-${Date.now()}.${ext}`;
      const { error } = await supabaseClient.storage.from('documentos').upload(caminho, arq, { contentType: arq.type });
      if (error) throw error;
      return caminho;
    };
    try {
      const frente = await subir(rgFrente, 'frente');
      const verso = rgVerso ? await subir(rgVerso, 'verso') : null;
      const linha = { cliente_id: u.id, nome, cpf, documento_tipo: docTipo, pix_tipo: pixTipo, pix_chave: pixChave, rg_frente: frente, rg_verso: verso, status: 'em_analise', motivo: null, updated_at: new Date().toISOString() };
      const { data, error } = await supabaseClient.from('verificacoes_identidade').upsert(linha, { onConflict: 'cliente_id' }).select().maybeSingle();
      if (error) throw error;
      verificacao = data || linha;
    } catch (_) {
      pronto();
      return falhar('Não foi possível enviar agora. Tente de novo.');
    }
    rgFrente = null; rgVerso = null; docTipo = 'rg';
    etapaVerif = '';
    desenhar();
    aviso('Documentos enviados para análise. Já pode cadastrar a sua conta bancária.');
  }

  /** @param {HTMLElement} m */
  async function salvarConta(m) {
    const v = (/** @type {string} */ c) => String((/** @type {HTMLInputElement|null} */ (m.querySelector(`[data-cart-campo="${c}"]`)) || { value: '' }).value || '').trim();
    const erro = /** @type {HTMLElement} */ (m.querySelector('.cart-form-erro'));
    const falhar = (/** @type {string} */ t) => { erro.textContent = t; erro.hidden = false; };
    const ted = {
      banco: v('banco'), agencia: v('agencia'), conta: v('conta'),
      tipo: v('tipo') || 'corrente', natureza: v('natureza') || 'pf',
      titular: (verificacao && verificacao.nome) || '', cpf: (verificacao && verificacao.cpf) || '',
    };
    if (!ted.banco || !ted.agencia || !ted.conta) return falhar('Preencha banco, agência e conta.');
    /** @type {any} */
    const nova = { id: `conta-${Date.now()}`, metodo: 'ted', ted, status: 'em_analise', criadaEm: new Date().toISOString() };
    const btn = /** @type {HTMLButtonElement} */ (m.querySelector('[data-cart-salvar-conta]'));
    btn.disabled = true; btn.textContent = 'Salvando…';
    const ok = await gravarContas([...contas(), nova]);
    btn.disabled = false; btn.textContent = 'Salvar';
    if (!ok) return falhar('Não foi possível salvar agora. Tente de novo.');
    cadastrando = false;
    desenhar();
    aviso('Conta cadastrada. Ela fica em análise até a Love conferir os dados.');
  }

  /** Grava a lista (a primeira fica também no formato antigo, para quem ainda lê só ele). @param {any[]} lista */
  async function gravarContas(lista) {
    const u = usuario();
    if (!u || typeof supabaseClient === 'undefined') return false;
    const primeira = lista[0] || null;
    const dados = { contas: lista, ...(primeira ? { metodo: primeira.metodo, pix: primeira.pix, ted: primeira.ted } : {}) };
    const { error } = await supabaseClient.from('clientes').update({ dados_saque: dados }).eq('id', u.id);
    if (error) return false;
    if (w.loveClienteProfile) w.loveClienteProfile.dados_saque = dados;
    return true;
  }

  function abrirSaque() {
    const n = numeros();
    const lista = contas().filter(c => c.status !== 'recusado');
    if (!lista.length) { aba = 'contas'; desenhar(); return; }
    const m = abrirPopup('cart-modal-saque', `
      <h3 class="cart-modal-titulo">Solicitar saque</h3>
      <div class="cart-saque-saldo"><span>Saldo disponível</span><b>${esc(reais(n.disponivel))}</b></div>
      <label class="cart-campo"><span>Valor do saque</span>
        <span class="cart-moeda"><span>R$</span><input type="text" data-cart-valor inputmode="decimal" placeholder="0,00"></span>
      </label>
      <button type="button" class="cart-link-texto cart-tudo" data-cart-tudo>Sacar tudo</button>
      <p class="cart-campo-rotulo">Para qual conta?</p>
      <div class="cart-contas-escolha" role="radiogroup">
        ${lista.map((c, i) => `
          <button type="button" class="cart-conta-opcao${i === 0 ? ' ativa' : ''}" role="radio" aria-checked="${i === 0}" data-cart-escolher="${esc(c.id)}">
            <span class="cart-conta-radio" aria-hidden="true"></span><span>${esc(nomeDaConta(c))}</span>
          </button>`).join('')}
      </div>
      <p class="cart-form-erro" hidden></p>
      <div class="cart-modal-acoes">
        <button type="button" class="cart-cancelar" data-cart-fechar>Cancelar</button>
        <button type="button" class="cart-btn-escuro" data-cart-confirmar>Solicitar saque</button>
      </div>`);
    let contaId = lista[0].id;
    const campo = /** @type {HTMLInputElement} */ (m.querySelector('[data-cart-valor]'));
    campo.addEventListener('input', () => {
      const num = soDigitos(campo.value).slice(0, 11);
      campo.value = num ? (Number(num) / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : '';
    });
    m.addEventListener('click', async (e) => {
      const alvo = /** @type {HTMLElement} */ (e.target);
      const esc2 = /** @type {HTMLElement|null} */ (alvo.closest('[data-cart-escolher]'));
      if (esc2) {
        contaId = esc2.dataset.cartEscolher || contaId;
        m.querySelectorAll('[data-cart-escolher]').forEach(b => { b.classList.toggle('ativa', b === esc2); b.setAttribute('aria-checked', String(b === esc2)); });
      }
      if (alvo.closest('[data-cart-tudo]')) campo.value = n.disponivel.toLocaleString('pt-BR', { minimumFractionDigits: 2 });
      if (alvo.closest('[data-cart-confirmar]')) await confirmarSaque(m, campo, contaId);
    });
    setTimeout(() => campo.focus(), 30);
  }

  /** @param {HTMLElement} m @param {HTMLInputElement} campo @param {string} contaId */
  async function confirmarSaque(m, campo, contaId) {
    const erro = /** @type {HTMLElement} */ (m.querySelector('.cart-form-erro'));
    const falhar = (/** @type {string} */ t) => { erro.textContent = t; erro.hidden = false; };
    const valorPedido = Number(soDigitos(campo.value)) / 100;
    const n = numeros();
    if (!(valorPedido > 0)) return falhar('Informe o valor do saque.');
    if (valorPedido > n.disponivel + 0.001) return falhar('O valor é maior que o saldo disponível.');
    const conta = contas().find(c => c.id === contaId);
    const u = usuario();
    const ev = evento();
    if (!u || !conta || typeof supabaseClient === 'undefined') return falhar('Entre na sua conta para solicitar o saque.');
    const btn = /** @type {HTMLButtonElement} */ (m.querySelector('[data-cart-confirmar]'));
    btn.disabled = true; btn.textContent = 'Solicitando…';
    const { error } = await supabaseClient.from('saques').insert({
      cliente_id: u.id,
      evento_id: ev && ehUuid(String(ev.id)) ? ev.id : null,
      valor: Math.round(valorPedido * 100) / 100,
      conta,
      status: 'solicitado'
    });
    btn.disabled = false; btn.textContent = 'Solicitar saque';
    if (error) return falhar(error.code === 'PGRST205' || error.code === '42P01' ? 'Os saques ainda não foram ativados no banco.' : 'Não foi possível solicitar agora. Tente de novo.');
    fecharPopups();
    await carregarSaques();
    desenhar();
    aviso(`Saque de ${reais(valorPedido)} solicitado. Ele aparece como pendente até cair na sua conta.`);
  }

  // --------------------------------------------------------------------------
  // Interações
  // --------------------------------------------------------------------------
  document.addEventListener('click', async (e) => {
    const alvo = e.target instanceof Element ? e.target : null;
    if (!alvo) return;
    document.querySelectorAll('.cart-menu:not([hidden])').forEach(m => { if (!m.parentElement?.contains(alvo)) /** @type {HTMLElement} */ (m).hidden = true; });
    if (!alvo.closest('#carteira-raiz')) return;
    const a = /** @type {HTMLElement|null} */ (alvo.closest('[data-cart-aba]'));
    if (a) { aba = a.dataset.cartAba === 'contas' ? 'contas' : 'saque'; desenhar(); return; }
    if (alvo.closest('[data-cart-esconder]')) { esconder = !esconder; desenhar(); return; }
    if (alvo.closest('[data-cart-periodo]')) { periodoAberto = !periodoAberto; desenhar(); return; }
    if (alvo.closest('[data-cart-periodo-limpar]')) { periodo = { de: '', ate: '' }; periodoAberto = false; desenhar(); return; }
    if (alvo.closest('[data-cart-periodo-aplicar]')) {
      const de = /** @type {HTMLInputElement|null} */ (document.querySelector('#carteira-raiz [data-cart-de]'));
      const ate = /** @type {HTMLInputElement|null} */ (document.querySelector('#carteira-raiz [data-cart-ate]'));
      let a = de ? de.value : '';
      let b = ate ? ate.value : '';
      if (a && b && a > b) { const t = a; a = b; b = t; }
      periodo = { de: a, ate: b };
      periodoAberto = false;
      desenhar();
      return;
    }
    if (periodoAberto && !alvo.closest('.cart-periodo')) { periodoAberto = false; desenhar(); }
    const v = /** @type {HTMLElement|null} */ (alvo.closest('[data-cart-vista]'));
    if (v) { vista = v.dataset.cartVista === 'saques' ? 'saques' : 'extrato'; buscaLista = ''; desenhar(); return; }
    if (alvo.closest('[data-cart-cadastrar]')) { abrirCadastro(); return; }
    if (alvo.closest('[data-cart-sacar]')) { abrirSaque(); return; }
    const btnMenu = alvo.closest('[data-cart-menu]');
    if (btnMenu) { const menu = /** @type {HTMLElement|null} */ (btnMenu.parentElement && btnMenu.parentElement.querySelector('.cart-menu')); if (menu) menu.hidden = !menu.hidden; return; }
    if (alvo.closest('[data-cart-remover]')) {
      const linha = /** @type {HTMLElement|null} */ (alvo.closest('[data-cart-conta]'));
      const id = linha ? linha.dataset.cartConta : '';
      const ok = w.confirmarNaLove ? await w.confirmarNaLove({ titulo: 'Remover esta conta?', texto: 'Ela deixa de aparecer na hora de solicitar saques.', botao: 'Remover' }) : false;
      if (!ok) return;
      if (await gravarContas(contas().filter(c => c.id !== id))) { desenhar(); aviso('Conta removida.'); } else aviso('Não foi possível remover agora.', true);
    }
  });
  document.addEventListener('input', (e) => {
    const el = /** @type {HTMLInputElement} */ (e.target);
    if (!el || !el.matches) return;
    const lista = el.matches('#carteira-raiz [data-cart-busca-lista]');
    if (!lista && !el.matches('#carteira-raiz [data-cart-busca]')) return;
    if (lista) buscaLista = el.value; else buscaConta = el.value;
    const pos = el.selectionStart;
    desenhar();
    const novo = /** @type {HTMLInputElement|null} */ (document.querySelector(lista ? '#carteira-raiz [data-cart-busca-lista]' : '#carteira-raiz [data-cart-busca]'));
    if (novo) { novo.focus(); if (pos !== null) novo.setSelectionRange(pos, pos); }
  });

  async function render() {
    const ev = evento();
    const id = ev ? String(ev.id) : '';
    desenhar();
    if (!verificacaoCarregada) { await carregarVerificacao(); desenhar(); }
    if (id !== saquesDoEvento || !saques.length) {
      await carregarSaques();
      desenhar();
    }
  }

  w.LoveCarteira = { render };
})();
