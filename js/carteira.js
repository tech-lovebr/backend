// @ts-check
// Carteira digital (Carteira › Carteira digital) — abas Saque e Contas
// bancárias, no modelo das carteiras de plataformas de pagamento:
//   Saque: saldo total, disponível para saque (com "Solicitar saque") e
//          pendente; ao lado, o extrato dos presentes comprados e o
//          histórico de saques (quando, quanto, para qual conta e status).
//   Contas bancárias: contas Pix/TED cadastradas (clientes.dados_saque.contas)
//          e o botão Cadastrar (pop-up centralizado).
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
  const ICONE_MAIS = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="5" cy="12" r="1.8"/><circle cx="12" cy="12" r="1.8"/><circle cx="19" cy="12" r="1.8"/></svg>';
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

  /** Cadastro de conta aberto dentro da caixa (no lugar da tabela), sem pop-up. */
  let cadastrando = false;

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
          <div class="love-tabs-nav cart-metodos" role="tablist">
            <button type="button" class="love-tab-item${metodoNovo === 'pix' ? ' active' : ''}" data-cart-metodo="pix">Pix</button>
            <button type="button" class="love-tab-item${metodoNovo === 'ted' ? ' active' : ''}" data-cart-metodo="ted">TED</button>
          </div>
          <div data-cart-painel="pix" class="cart-form-grade cart-form-pix" ${metodoNovo === 'pix' ? '' : 'hidden'}>
            <label class="cart-campo"><span>Tipo de chave</span>
              <select data-cart-campo="pixTipo"><option value="cpf">CPF</option><option value="email">E-mail</option><option value="telefone">Telefone</option><option value="aleatoria">Chave aleatória</option></select>
            </label>
            <label class="cart-campo"><span>Chave Pix</span><input type="text" data-cart-campo="pixChave" autocomplete="off"></label>
          </div>
          <div data-cart-painel="ted" class="cart-form-grade" ${metodoNovo === 'ted' ? '' : 'hidden'}>
            <label class="cart-campo cart-campo-largo"><span>Instituição financeira</span><input type="text" data-cart-campo="banco" autocomplete="off"></label>
            <label class="cart-campo"><span>Agência</span><input type="text" data-cart-campo="agencia" inputmode="numeric" maxlength="8" autocomplete="off"></label>
            <label class="cart-campo"><span>Conta (com dígito)</span><input type="text" data-cart-campo="conta" maxlength="20" autocomplete="off"></label>
            <label class="cart-campo"><span>Nome do titular</span><input type="text" data-cart-campo="titular" autocapitalize="words" autocomplete="off"></label>
            <label class="cart-campo"><span>CPF do titular</span><input type="text" data-cart-campo="cpf" inputmode="numeric" maxlength="14" autocomplete="off"></label>
          </div>
          <p class="cart-form-erro" hidden></p>
          <div class="cart-form-acoes">
            <button type="button" class="cart-cancelar" data-cart-cancelar-conta>Cancelar</button>
            <button type="button" class="cart-btn-escuro" data-cart-salvar-conta>Salvar</button>
          </div>
        </div>
      </section>`;
  }

  function htmlContas() {
    if (cadastrando) return htmlFormConta();
    const lista = contas();
    const termo = buscaConta.trim().toLowerCase();
    const filtradas = termo ? lista.filter(c => nomeDaConta(c).toLowerCase().includes(termo) || String((c.ted && c.ted.titular) || '').toLowerCase().includes(termo)) : lista;
    return `
      <section class="cart-caixa cart-contas">
        <div class="cart-contas-topo">
          <h3 class="cart-titulo">Contas cadastradas</h3>
          <button type="button" class="cart-btn-escuro" data-cart-cadastrar>Cadastrar</button>
        </div>
        <div class="cart-contas-barra">
          <label class="cart-busca">${ICONE_BUSCA}<input type="search" data-cart-busca value="${esc(buscaConta)}" placeholder="Buscar conta bancária" aria-label="Buscar conta bancária"></label>
          <p class="cart-contagem">Exibindo <b>${filtradas.length}</b> ${filtradas.length === 1 ? 'resultado' : 'resultados'}</p>
        </div>
        ${filtradas.length ? `
          <div class="cart-tabela-rolagem"><table class="cart-tabela">
            <thead><tr><th>Tipo</th><th>Conta</th><th>Titular</th><th class="cart-col-acoes"></th></tr></thead>
            <tbody>${filtradas.map(c => `
              <tr data-cart-conta="${esc(c.id)}">
                <td><b>${c.metodo === 'pix' ? 'Pix' : 'TED'}</b></td>
                <td>${esc(c.metodo === 'pix' ? (c.pix && c.pix.chave) : nomeDaConta(c))}</td>
                <td>${esc((c.ted && c.ted.titular) || '—')}</td>
                <td class="cart-col-acoes">
                  <div class="cart-menu-wrap">
                    <button type="button" class="cart-mais" data-cart-menu aria-label="Mais ações">${ICONE_MAIS}</button>
                    <div class="cart-menu" hidden><button type="button" data-cart-remover>Remover</button></div>
                  </div>
                </td>
              </tr>`).join('')}</tbody>
          </table></div>` : `<p class="cart-faixa-vazia">${lista.length ? 'Nenhuma conta encontrada.' : 'Cadastre uma conta para receber seus pagamentos com segurança e rapidez.'}</p>`}
      </section>`;
  }

  function desenhar() {
    const raiz = document.getElementById('carteira-raiz');
    if (!raiz) return;
    if (aba !== 'contas') cadastrando = false;
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

  let metodoNovo = 'pix';
  function abrirCadastro() {
    metodoNovo = 'pix';
    cadastrando = true;
    desenhar();
    setTimeout(() => /** @type {HTMLElement|null} */ (document.querySelector('#carteira-raiz [data-cart-campo="pixChave"]'))?.focus(), 30);
  }
  function fecharCadastro() { cadastrando = false; desenhar(); }

  // Formulário dentro da caixa: Pix/TED, máscaras, Cancelar e Salvar.
  document.addEventListener('click', (e) => {
    const alvo = e.target instanceof Element ? e.target : null;
    const form = /** @type {HTMLElement|null} */ (alvo && alvo.closest('#carteira-raiz [data-cart-form-conta]'));
    if (!alvo || !form) return;
    const met = /** @type {HTMLElement|null} */ (alvo.closest('[data-cart-metodo]'));
    if (met) {
      metodoNovo = met.dataset.cartMetodo === 'ted' ? 'ted' : 'pix';
      form.querySelectorAll('[data-cart-metodo]').forEach(b => b.classList.toggle('active', /** @type {HTMLElement} */ (b).dataset.cartMetodo === metodoNovo));
      form.querySelectorAll('[data-cart-painel]').forEach(pn => { /** @type {HTMLElement} */ (pn).hidden = /** @type {HTMLElement} */ (pn).dataset.cartPainel !== metodoNovo; });
      return;
    }
    if (alvo.closest('[data-cart-cancelar-conta]')) { fecharCadastro(); return; }
    if (alvo.closest('[data-cart-salvar-conta]')) salvarConta(form);
  });
  document.addEventListener('input', (e) => {
    const el = /** @type {HTMLInputElement} */ (e.target);
    if (!el || !el.matches || !el.matches('#carteira-raiz [data-cart-form-conta] [data-cart-campo]')) return;
    const campo = el.dataset.cartCampo;
    const tipo = /** @type {HTMLSelectElement|null} */ (document.querySelector('#carteira-raiz [data-cart-campo="pixTipo"]'));
    if (campo === 'cpf' || (campo === 'pixChave' && tipo && tipo.value === 'cpf')) el.value = mascaraCpf(el.value);
    if (campo === 'pixChave' && tipo && tipo.value === 'telefone' && typeof w.maskBrazilPhone === 'function') el.value = w.maskBrazilPhone(el.value);
  });

  /** @param {HTMLElement} m */
  async function salvarConta(m) {
    const v = (/** @type {string} */ c) => String((/** @type {HTMLInputElement|null} */ (m.querySelector(`[data-cart-campo="${c}"]`)) || { value: '' }).value || '').trim();
    const erro = /** @type {HTMLElement} */ (m.querySelector('.cart-form-erro'));
    const falhar = (/** @type {string} */ t) => { erro.textContent = t; erro.hidden = false; };
    /** @type {any} */
    let nova;
    if (metodoNovo === 'pix') {
      const tipo = v('pixTipo') || 'cpf';
      const chave = v('pixChave');
      if (!chave) return falhar('Informe a chave Pix.');
      if (tipo === 'cpf' && soDigitos(chave).length !== 11) return falhar('CPF incompleto.');
      if (tipo === 'email' && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(chave)) return falhar('E-mail inválido.');
      if (tipo === 'telefone' && soDigitos(chave).length < 10) return falhar('Telefone incompleto.');
      nova = { metodo: 'pix', pix: { tipo, chave } };
    } else {
      const ted = { banco: v('banco'), agencia: v('agencia'), conta: v('conta'), titular: v('titular'), cpf: v('cpf') };
      if (!ted.banco || !ted.agencia || !ted.conta || !ted.titular || !ted.cpf) return falhar('Preencha todos os dados bancários.');
      if (soDigitos(ted.cpf).length !== 11) return falhar('CPF do titular incompleto.');
      nova = { metodo: 'ted', ted };
    }
    nova.id = `conta-${Date.now()}`;
    nova.criadaEm = new Date().toISOString();
    const btn = /** @type {HTMLButtonElement} */ (m.querySelector('[data-cart-salvar-conta]'));
    btn.disabled = true; btn.textContent = 'Salvando…';
    const ok = await gravarContas([...contas(), nova]);
    btn.disabled = false; btn.textContent = 'Salvar';
    if (!ok) return falhar('Não foi possível salvar agora. Tente de novo.');
    cadastrando = false;
    desenhar();
    aviso('Conta cadastrada.');
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
    const lista = contas();
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
    if (id !== saquesDoEvento || !saques.length) {
      await carregarSaques();
      desenhar();
    }
  }

  w.LoveCarteira = { render };
})();
